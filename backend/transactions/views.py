
"""
plaid_app/views.py
──────────────────────────────────────────────────────────────────────────────
End-to-end Plaid Sandbox flow:

  POST /api/plaid/link-token/          → create a Link token (step 1)
  POST /api/plaid/exchange-token/      → swap public_token for access_token (step 2)
  GET  /api/plaid/items/               → list all connected items
  GET  /api/plaid/items/<id>/accounts/ → accounts + balances
  GET  /api/plaid/items/<id>/transactions/ → paginated transaction history
  DELETE /api/plaid/items/<id>/        → disconnect / remove item

Transaction object shape (what Plaid returns, what we serialize):
──────────────────────────────────────────────────────────────────
{
    "transaction_id":   "aBcDeFgHiJkLmNoPqRsTuVwXyZ",  # Plaid's stable ID
    "account_id":       "XYZ123",
    "date":             "2024-03-15",       # posted date (YYYY-MM-DD)
    "authorized_date":  "2024-03-14",       # when card was swiped (may be null)
    "name":             "WHOLEFDS MKT #10278",   # raw name from institution
    "merchant_name":    "Whole Foods Market",    # cleaned merchant name (may be null)
    "amount":           12.34,              # POSITIVE = money leaving account
                                            # NEGATIVE = money entering account
    "iso_currency_code": "USD",
    "category":         ["Food and Drink", "Groceries"],   # legacy categories
    "personal_finance_category": {                         # newer, richer categories
        "primary":   "FOOD_AND_DRINK",
        "detailed":  "FOOD_AND_DRINK_GROCERIES",
        "confidence_level": "VERY_HIGH"
    },
    "payment_channel":  "in store",        # "in store" | "online" | "other"
    "pending":          false,             # true while transaction hasn't posted
    "pending_transaction_id": null,        # links a pending → posted tx
    "location": {
        "address":  "1850 Douglas Blvd",
        "city":     "Roseville",
        "region":   "CA",
        "postal_code": "95661",
        "country":  "US",
        "lat":      38.76,
        "lon":      -121.32
    },
    "logo_url":   "https://plaid-merchant-logos.plaid.com/whole_foods.png",
    "website":    "wholefoods.com",
    "transaction_type": "place"            # deprecated; use payment_channel instead
}
"""

import json
from datetime import date, timedelta

import plaid
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .client import get_plaid_client
from .models import PlaidItem


# ── helpers ───────────────────────────────────────────────────────────────────

def plaid_error(e: plaid.ApiException) -> JsonResponse:
    """Parse a plaid.ApiException into a clean JSON error response."""
    try:
        body = json.loads(e.body)
        msg  = body.get('error_message') or body.get('display_message') or str(e)
        code = body.get('error_code', 'PLAID_ERROR')
    except Exception:
        msg, code = str(e), 'PLAID_ERROR'
    return JsonResponse({'error': msg, 'error_code': code}, status=400)


def serialize_transaction(tx) -> dict:
    """
    Convert a Plaid Transaction model object → plain dict safe for JSON.

    Key fields explained:
      amount           Positive = debit (you spent money), negative = credit (refund/payment)
      pending          True while the charge hasn't fully cleared — amount may still change
      personal_finance_category  Plaid's newer taxonomy (more reliable than `category`)
      payment_channel  "in store" / "online" / "other"
      location         May be partially null for online transactions
    """
    # personal_finance_category is a newer enriched field — not always present
    pfc = tx.get('personal_finance_category')
    pfc_data = {
        'primary':          pfc.get('primary')          if pfc else None,
        'detailed':         pfc.get('detailed')         if pfc else None,
        'confidence_level': pfc.get('confidence_level') if pfc else None,
    } if pfc else None

    loc = tx.get('location') or {}

    return {
        # ── Identity ──────────────────────────────────
        'transaction_id':        tx.get('transaction_id'),
        'account_id':            tx.get('account_id'),
        'pending_transaction_id': tx.get('pending_transaction_id'),  # links pending → posted

        # ── What / Who ────────────────────────────────
        'name':                  tx.get('name'),           # raw string from bank
        'merchant_name':         tx.get('merchant_name'),  # cleaned by Plaid (may be None)
        'logo_url':              tx.get('logo_url'),
        'website':               tx.get('website'),

        # ── Amount ────────────────────────────────────
        'amount':                tx.get('amount'),          # + = spend, - = credit/refund
        'iso_currency_code':     tx.get('iso_currency_code', 'USD'),

        # ── Dates ─────────────────────────────────────
        'date':                  str(tx.get('date')),           # posted date
        'authorized_date':       str(tx.get('authorized_date')) if tx.get('authorized_date') else None,

        # ── Categories ────────────────────────────────
        # Legacy list e.g. ["Food and Drink", "Groceries"]
        'category':              tx.get('category', []),
        'category_id':           tx.get('category_id'),
        # Newer, richer taxonomy — prefer this
        'personal_finance_category': pfc_data,

        # ── Channel & Status ──────────────────────────
        'payment_channel':       str(tx.get('payment_channel', '')),  # "in store" | "online"
        'pending':               tx.get('pending', False),

        # ── Location ──────────────────────────────────
        'location': {
            'address':     loc.get('address'),
            'city':        loc.get('city'),
            'region':      loc.get('region'),
            'postal_code': loc.get('postal_code'),
            'country':     loc.get('country'),
            'lat':         loc.get('lat'),
            'lon':         loc.get('lon'),
        },
    }


def serialize_account(acc) -> dict:
    bal = acc.get('balances') or {}
    return {
        'account_id':       acc.get('account_id'),
        'name':             acc.get('name'),
        'official_name':    acc.get('official_name'),
        'type':             str(acc.get('type', '')),
        'subtype':          str(acc.get('subtype', '')),
        'mask':             acc.get('mask'),          # last 4 digits
        'balance': {
            'current':          bal.get('current'),
            'available':        bal.get('available'),  # None for credit cards
            'limit':            bal.get('limit'),      # credit limit (credit cards only)
            'iso_currency_code': bal.get('iso_currency_code', 'USD'),
        }
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class CreateLinkTokenView(View):
    """
    POST /api/plaid/link-token/

    Step 1 of the Plaid Link flow.
    Returns a short-lived link_token that the React frontend passes to
    the <PlaidLink> component to open the connection modal.
    """
    def post(self, request):
        try:
            client = get_plaid_client()
            req = LinkTokenCreateRequest(
                client_name="My Finance App",
                language='en',
                country_codes=[CountryCode('US')],
                products=[Products('transactions')],
                user=LinkTokenCreateRequestUser(
                    # In production, use the real authenticated user's ID
                    client_user_id='sandbox-user-001'
                ),
            )
            resp = client.link_token_create(req)
            return JsonResponse({'link_token': resp['link_token']})

        except plaid.ApiException as e:
            return plaid_error(e)


@method_decorator(csrf_exempt, name='dispatch')
class ExchangeTokenView(View):
    """
    POST /api/plaid/exchange-token/
    Body: { "public_token": "...", "institution": { "name": "...", "institution_id": "..." } }

    Step 2 of the flow.
    Plaid Link calls onSuccess(public_token, metadata) — we take that public_token,
    exchange it for a permanent access_token, and save it to our DB.

    The access_token never expires (unless revoked), so we store it and reuse it
    for all future /transactions and /accounts calls for this user.
    """
    def post(self, request):
        try:
            body         = json.loads(request.body)
            public_token = body.get('public_token', '').strip()
            institution  = body.get('institution', {})

            if not public_token:
                return JsonResponse({'error': 'public_token is required'}, status=400)

            client = get_plaid_client()
            req    = ItemPublicTokenExchangeRequest(public_token=public_token)
            resp   = client.item_public_token_exchange(req)

            # Persist the item so we can fetch transactions later
            item, _ = PlaidItem.objects.update_or_create(
                item_id=resp['item_id'],
                defaults={
                    'access_token':     resp['access_token'],
                    'institution_id':   institution.get('institution_id', ''),
                    'institution_name': institution.get('name', ''),
                }
            )
            return JsonResponse({
                'success':          True,
                'item_id':          item.item_id,
                'institution_name': item.institution_name,
            })

        except plaid.ApiException as e:
            return plaid_error(e)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class ItemListView(View):
    """
    GET /api/plaid/items/
    Returns all connected items (banks/cards) stored in our DB.
    """
    def get(self, request):
        items = list(
            PlaidItem.objects.values(
                'item_id', 'institution_name', 'institution_id', 'created_at'
            )
        )
        return JsonResponse({'items': items})


@method_decorator(csrf_exempt, name='dispatch')
class ItemDetailView(View):
    """
    DELETE /api/plaid/items/<item_id>/
    Disconnect and remove a linked account.
    """
    def delete(self, request, item_id):
        try:
            PlaidItem.objects.get(item_id=item_id).delete()
            return JsonResponse({'success': True})
        except PlaidItem.DoesNotExist:
            return JsonResponse({'error': 'Item not found'}, status=404)


class AccountsView(View):
    """
    GET /api/plaid/items/<item_id>/accounts/

    Returns all accounts under a connected item.

    Account types you'll see in sandbox:
      depository / checking  → checking account
      depository / savings   → savings account
      credit / credit card   → credit card  ← this is what we care about for transactions
    """
    def get(self, request, item_id):
        try:
            item   = PlaidItem.objects.get(item_id=item_id)
            client = get_plaid_client()
            resp   = client.accounts_get(AccountsGetRequest(access_token=item.access_token))
            data   = resp.to_dict()

            accounts = [serialize_account(a) for a in data.get('accounts', [])]
            return JsonResponse({'accounts': accounts, 'item_id': item_id})

        except PlaidItem.DoesNotExist:
            return JsonResponse({'error': 'Item not found'}, status=404)
        except plaid.ApiException as e:
            return plaid_error(e)


class TransactionsView(View):
    """
    GET /api/plaid/items/<item_id>/transactions/?days=90&count=50&offset=0

    Fetches transaction history for a connected item.

    Query params:
      days   (int, default 90)   — how far back to fetch (max 730 for sandbox)
      count  (int, default 50)   — number of transactions per page (max 500)
      offset (int, default 0)    — for pagination (offset by N transactions)

    Pagination pattern:
      1. First call: GET /transactions/?count=100&offset=0
         → resp.total_transactions = 312
      2. Next page:  GET /transactions/?count=100&offset=100
      3. Next page:  GET /transactions/?count=100&offset=200
      4. Next page:  GET /transactions/?count=100&offset=300
         → returns 12 transactions, you're done

    About amounts:
      POSITIVE amount = money leaving the account (purchase, fee)
      NEGATIVE amount = money entering the account (refund, credit, payment received)

    About pending:
      pending=True means the transaction hasn't fully cleared yet.
      The amount might still change before it posts.
      pending_transaction_id on a posted tx links it back to its pending version.
    """
    def get(self, request, item_id):
        try:
            item = PlaidItem.objects.get(item_id=item_id)

            days   = int(request.GET.get('days',   90))
            count  = int(request.GET.get('count',  50))
            offset = int(request.GET.get('offset',  0))

            end_date   = date.today()
            start_date = end_date - timedelta(days=min(days, 730))  # sandbox max = 730 days

            client = get_plaid_client()
            req = TransactionsGetRequest(
                access_token=item.access_token,
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(
                    count=min(count, 500),
                    offset=offset,
                    # Uncomment to get the newer personal_finance_category field:
                    # include_personal_finance_category=True,
                ),
            )
            resp = client.transactions_get(req)
            data = resp.to_dict()

            transactions = [serialize_transaction(tx) for tx in data.get('transactions', [])]

            return JsonResponse({
                'transactions':       transactions,
                'total_transactions': data.get('total_transactions', 0),
                # Pagination info so the client knows if there are more pages
                'returned':           len(transactions),
                'offset':             offset,
                'has_more':           (offset + len(transactions)) < data.get('total_transactions', 0),
                'start_date':         str(start_date),
                'end_date':           str(end_date),
            })

        except PlaidItem.DoesNotExist:
            return JsonResponse({'error': 'Item not found'}, status=404)
        except plaid.ApiException as e:
            return plaid_error(e)
