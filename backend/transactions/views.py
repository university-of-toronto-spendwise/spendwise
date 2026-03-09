import json
from datetime import date, timedelta
from decimal import Decimal

import plaid
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError

from .client import get_plaid_client
from .models import BankAccount, PlaidItem, Transaction


JWT_AUTH = JWTAuthentication()


def plaid_error(e: plaid.ApiException) -> JsonResponse:
    try:
        body = json.loads(e.body)
        msg = body.get("error_message") or body.get("display_message") or str(e)
        code = body.get("error_code", "PLAID_ERROR")
    except Exception:
        msg, code = str(e), "PLAID_ERROR"
    return JsonResponse({"error": msg, "error_code": code}, status=400)


def auth_user_or_401(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None, JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)

    token = header.split(" ", 1)[1].strip()
    if not token:
        return None, JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)

    try:
        validated = JWT_AUTH.get_validated_token(token)
        user = JWT_AUTH.get_user(validated)
        return user, None
    except TokenError:
        return None, JsonResponse({"detail": "Invalid token."}, status=401)
    except Exception:
        return None, JsonResponse({"detail": "Invalid token."}, status=401)


def decimal_or_none(value):
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def serialize_transaction(tx) -> dict:
    pfc = tx.get("personal_finance_category")
    pfc_data = (
        {
            "primary": pfc.get("primary"),
            "detailed": pfc.get("detailed"),
            "confidence_level": pfc.get("confidence_level"),
        }
        if pfc
        else None
    )

    loc = tx.get("location") or {}

    return {
        "transaction_id": tx.get("transaction_id"),
        "account_id": tx.get("account_id"),
        "pending_transaction_id": tx.get("pending_transaction_id"),
        "name": tx.get("name"),
        "merchant_name": tx.get("merchant_name"),
        "logo_url": tx.get("logo_url"),
        "website": tx.get("website"),
        "amount": tx.get("amount"),
        "iso_currency_code": tx.get("iso_currency_code", "USD"),
        "date": str(tx.get("date")),
        "authorized_date": str(tx.get("authorized_date")) if tx.get("authorized_date") else None,
        "category": tx.get("category", []),
        "category_id": tx.get("category_id"),
        "personal_finance_category": pfc_data,
        "payment_channel": str(tx.get("payment_channel", "")),
        "pending": tx.get("pending", False),
        "location": {
            "address": loc.get("address"),
            "city": loc.get("city"),
            "region": loc.get("region"),
            "postal_code": loc.get("postal_code"),
            "country": loc.get("country"),
            "lat": loc.get("lat"),
            "lon": loc.get("lon"),
        },
    }


def serialize_account(acc) -> dict:
    bal = acc.get("balances") or {}
    return {
        "account_id": acc.get("account_id"),
        "name": acc.get("name"),
        "official_name": acc.get("official_name"),
        "type": str(acc.get("type", "")),
        "subtype": str(acc.get("subtype", "")),
        "mask": acc.get("mask"),
        "balance": {
            "current": bal.get("current"),
            "available": bal.get("available"),
            "limit": bal.get("limit"),
            "iso_currency_code": bal.get("iso_currency_code", "USD"),
        },
    }


def save_accounts(user, item, accounts):
    for acc in accounts:
        bal = acc.get("balance") or {}
        BankAccount.objects.update_or_create(
            user=user,
            account_id=acc.get("account_id"),
            defaults={
                "item": item,
                "name": acc.get("name") or "",
                "official_name": acc.get("official_name") or "",
                "account_type": acc.get("type") or "",
                "subtype": acc.get("subtype") or "",
                "mask": acc.get("mask") or "",
                "current_balance": decimal_or_none(bal.get("current")),
                "available_balance": decimal_or_none(bal.get("available")),
                "limit_balance": decimal_or_none(bal.get("limit")),
                "currency_code": bal.get("iso_currency_code") or "USD",
            },
        )


def normalize_amount_for_db(raw_amount):
    # Plaid returns positive for spend and negative for credits.
    # Existing spending endpoints use negative for expenses and positive for income.
    return Decimal(str(raw_amount or 0)) * Decimal("-1")


def category_for_db(categories):
    if not isinstance(categories, list) or not categories:
        return []
    return [str(c) for c in categories if c]


def save_transactions(user, item, transactions):
    for tx in transactions:
        tx_id = tx.get("transaction_id")
        account_id = tx.get("account_id")
        tx_date = tx.get("date")

        if not tx_id or not account_id or not tx_date:
            continue

        Transaction.objects.update_or_create(
            user=user,
            transaction_id=tx_id,
            defaults={
                "item": item,
                "account_id": account_id,
                "pending_transaction_id": tx.get("pending_transaction_id"),
                "merchant_name": tx.get("merchant_name"),
                "name": tx.get("name") or tx.get("merchant_name") or "Unknown",
                "logo_url": tx.get("logo_url"),
                "website": tx.get("website"),
                "amount": normalize_amount_for_db(tx.get("amount")),
                "iso_currency_code": tx.get("iso_currency_code") or "USD",
                "date": tx_date,
                "authorized_date": tx.get("authorized_date"),
                "category": category_for_db(tx.get("category")),
                "category_id": tx.get("category_id"),
                "personal_finance_category": tx.get("personal_finance_category"),
                "payment_channel": tx.get("payment_channel") or "",
                "pending": bool(tx.get("pending", False)),
                "location": tx.get("location") or {},
                "raw_data": tx,
            },
        )


@method_decorator(csrf_exempt, name="dispatch")
class CreateLinkTokenView(View):
    def post(self, request):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        try:
            client = get_plaid_client()
            req = LinkTokenCreateRequest(
                client_name="SpendWise",
                language="en",
                country_codes=[CountryCode("US")],
                products=[Products("transactions")],
                user=LinkTokenCreateRequestUser(client_user_id=str(user.id)),
            )
            resp = client.link_token_create(req)
            return JsonResponse({"link_token": resp["link_token"]})
        except plaid.ApiException as e:
            return plaid_error(e)


@method_decorator(csrf_exempt, name="dispatch")
class ExchangeTokenView(View):
    def post(self, request):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        try:
            body = json.loads(request.body)
            public_token = body.get("public_token", "").strip()
            institution = body.get("institution", {}) or {}

            if not public_token:
                return JsonResponse({"error": "public_token is required"}, status=400)

            client = get_plaid_client()
            req = ItemPublicTokenExchangeRequest(public_token=public_token)
            resp = client.item_public_token_exchange(req)

            item, _ = PlaidItem.objects.update_or_create(
                item_id=resp["item_id"],
                defaults={
                    "user": user,
                    "access_token": resp["access_token"],
                    "institution_id": institution.get("institution_id", ""),
                    "institution_name": institution.get("name", ""),
                },
            )

            return JsonResponse(
                {
                    "success": True,
                    "item_id": item.item_id,
                    "institution_name": item.institution_name,
                    "message": f"Connected to {item.institution_name or 'your bank'} successfully.",
                }
            )
        except plaid.ApiException as e:
            return plaid_error(e)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


class ItemListView(View):
    def get(self, request):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        items = list(
            PlaidItem.objects.filter(user=user).values(
                "item_id", "institution_name", "institution_id", "created_at"
            )
        )
        return JsonResponse({"items": items})


class BankAccountListView(View):
    def get(self, request):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        account_rows = list(
            BankAccount.objects.filter(user=user)
            .select_related("item")
            .values(
                "account_id",
                "name",
                "official_name",
                "account_type",
                "subtype",
                "mask",
                "current_balance",
                "available_balance",
                "limit_balance",
                "currency_code",
                "item__item_id",
                "item__institution_name",
                "synced_at",
            )
            .order_by("item__institution_name", "name")
        )
        return JsonResponse({"accounts": account_rows})


@method_decorator(csrf_exempt, name="dispatch")
class ItemDetailView(View):
    def delete(self, request, item_id):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        try:
            PlaidItem.objects.get(user=user, item_id=item_id).delete()
            return JsonResponse({"success": True})
        except PlaidItem.DoesNotExist:
            return JsonResponse({"error": "Item not found"}, status=404)


class AccountsView(View):
    def get(self, request, item_id):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        try:
            item = PlaidItem.objects.get(user=user, item_id=item_id)
            client = get_plaid_client()
            resp = client.accounts_get(AccountsGetRequest(access_token=item.access_token))
            data = resp.to_dict()

            accounts = [serialize_account(a) for a in data.get("accounts", [])]
            save_accounts(user, item, accounts)

            return JsonResponse({"accounts": accounts, "item_id": item_id})

        except PlaidItem.DoesNotExist:
            return JsonResponse({"error": "Item not found"}, status=404)
        except plaid.ApiException as e:
            return plaid_error(e)


class TransactionsView(View):
    def get(self, request, item_id):
        user, auth_error = auth_user_or_401(request)
        if auth_error:
            return auth_error

        try:
            item = PlaidItem.objects.get(user=user, item_id=item_id)

            days = int(request.GET.get("days", 90))
            count = int(request.GET.get("count", 50))
            offset = int(request.GET.get("offset", 0))

            end_date = date.today()
            start_date = end_date - timedelta(days=min(days, 730))

            client = get_plaid_client()
            req = TransactionsGetRequest(
                access_token=item.access_token,
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(
                    count=min(count, 500),
                    offset=offset,
                ),
            )
            resp = client.transactions_get(req)
            data = resp.to_dict()

            transactions = [serialize_transaction(tx) for tx in data.get("transactions", [])]
            save_transactions(user, item, transactions)

            return JsonResponse(
                {
                    "transactions": transactions,
                    "total_transactions": data.get("total_transactions", 0),
                    "returned": len(transactions),
                    "offset": offset,
                    "has_more": (offset + len(transactions)) < data.get("total_transactions", 0),
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "synced_to_db": True,
                }
            )

        except PlaidItem.DoesNotExist:
            return JsonResponse({"error": "Item not found"}, status=404)
        except plaid.ApiException as e:
            return plaid_error(e)
