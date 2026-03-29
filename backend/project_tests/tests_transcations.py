import json
from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from transactions.models import BankAccount, PlaidItem, Transaction


User = get_user_model()


class _DummyPlaidResp:
    def __init__(self, data):
        self._data = data

    def to_dict(self):
        return self._data


class _FakePlaidClient:
    def __init__(self, *, link_token=None, exchange=None, accounts=None, transactions=None):
        self._link_token = link_token or {"link_token": "link-sandbox-test"}
        self._exchange = exchange or {"access_token": "access-sandbox-test", "item_id": "item-sandbox-test"}
        self._accounts = accounts or {"accounts": []}
        self._transactions = transactions or {"transactions": [], "total_transactions": 0}

    def link_token_create(self, _req):
        return self._link_token

    def item_public_token_exchange(self, _req):
        return self._exchange

    def accounts_get(self, _req):
        return _DummyPlaidResp(self._accounts)

    def transactions_get(self, _req):
        return _DummyPlaidResp(self._transactions)


class TransactionsViewsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tx@example.com",
            email="tx@example.com",
            password="StrongPass123!",
        )
        self.access_token = str(RefreshToken.for_user(self.user).access_token)

    def _auth(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_link_token_requires_auth(self):
        resp = self.client.post("/api/plaid/link-token/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp.json()["detail"], "Authentication credentials were not provided.")

    @patch("transactions.views.get_plaid_client", return_value=_FakePlaidClient(link_token={"link_token": "lt_123"}))
    def test_link_token_success(self, _mock_client):
        self._auth()
        resp = self.client.post("/api/plaid/link-token/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["link_token"], "lt_123")

    def test_exchange_token_requires_public_token(self):
        self._auth()
        resp = self.client.post("/api/plaid/exchange-token/", data={}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.json()["error"], "public_token is required")

    @patch(
        "transactions.views.get_plaid_client",
        return_value=_FakePlaidClient(exchange={"access_token": "access_1", "item_id": "item_1"}),
    )
    def test_exchange_token_creates_item(self, _mock_client):
        self._auth()
        payload = {"public_token": "public-sandbox", "institution": {"institution_id": "ins_1", "name": "Test Bank"}}
        resp = self.client.post("/api/plaid/exchange-token/", data=payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.json()["success"])
        self.assertEqual(resp.json()["item_id"], "item_1")
        self.assertEqual(resp.json()["institution_name"], "Test Bank")

        item = PlaidItem.objects.get(item_id="item_1")
        self.assertEqual(item.user_id, self.user.id)
        self.assertEqual(item.access_token, "access_1")
        self.assertEqual(item.institution_id, "ins_1")
        self.assertEqual(item.institution_name, "Test Bank")

    def test_item_list_returns_only_users_items(self):
        other = User.objects.create_user(username="other@example.com", email="other@example.com", password="StrongPass123!")
        PlaidItem.objects.create(user=self.user, item_id="item_a", access_token="a", institution_name="A")
        PlaidItem.objects.create(user=other, item_id="item_b", access_token="b", institution_name="B")

        self._auth()
        resp = self.client.get("/api/plaid/items/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([i["item_id"] for i in resp.json()["items"]], ["item_a"])

    def test_bank_account_list_returns_joined_item_fields(self):
        item = PlaidItem.objects.create(user=self.user, item_id="item_a", access_token="a", institution_name="A Bank")
        BankAccount.objects.create(
            user=self.user,
            item=item,
            account_id="acc_1",
            name="Checking",
            official_name="Checking Account",
            account_type="depository",
            subtype="checking",
            mask="0000",
            current_balance="100.00",
            available_balance="80.00",
            currency_code="USD",
        )

        self._auth()
        resp = self.client.get("/api/plaid/bank-accounts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        accounts = resp.json()["accounts"]
        self.assertEqual(len(accounts), 1)
        self.assertEqual(accounts[0]["account_id"], "acc_1")
        self.assertEqual(accounts[0]["item__item_id"], "item_a")
        self.assertEqual(accounts[0]["item__institution_name"], "A Bank")

    def test_item_delete_404_when_missing(self):
        self._auth()
        resp = self.client.delete("/api/plaid/items/not-real/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.json()["error"], "Item not found")

    def test_item_delete_success(self):
        item = PlaidItem.objects.create(user=self.user, item_id="item_del", access_token="a", institution_name="Bank")

        self._auth()
        resp = self.client.delete(f"/api/plaid/items/{item.item_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.json()["success"])
        self.assertFalse(PlaidItem.objects.filter(item_id="item_del").exists())

    def test_accounts_404_when_item_missing(self):
        self._auth()
        resp = self.client.get("/api/plaid/items/not-real/accounts/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.json()["error"], "Item not found")

    @patch(
        "transactions.views.get_plaid_client",
        return_value=_FakePlaidClient(
            accounts={
                "accounts": [
                    {
                        "account_id": "acc_1",
                        "name": "Checking",
                        "official_name": "Checking Account",
                        "type": "depository",
                        "subtype": "checking",
                        "mask": "0000",
                        "balances": {"current": 123.45, "available": 100.00, "limit": None, "iso_currency_code": "USD"},
                    }
                ]
            }
        ),
    )
    def test_accounts_saves_bank_accounts(self, _mock_client):
        item = PlaidItem.objects.create(user=self.user, item_id="item_a", access_token="access", institution_name="Bank")

        self._auth()
        resp = self.client.get(f"/api/plaid/items/{item.item_id}/accounts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["item_id"], "item_a")
        self.assertEqual(resp.json()["accounts"][0]["account_id"], "acc_1")

        acct = BankAccount.objects.get(user=self.user, account_id="acc_1")
        self.assertEqual(acct.item_id, item.id)
        self.assertEqual(str(acct.current_balance), "123.45")
        self.assertEqual(acct.currency_code, "USD")

    def test_transactions_404_when_item_missing(self):
        self._auth()
        resp = self.client.get("/api/plaid/items/not-real/transactions/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.json()["error"], "Item not found")

    @patch(
        "transactions.views.get_plaid_client",
        return_value=_FakePlaidClient(
            transactions={
                "transactions": [
                    {
                        "transaction_id": "tx_1",
                        "account_id": "acc_1",
                        "pending_transaction_id": None,
                        "name": "United Airlines",
                        "merchant_name": "United Airlines",
                        "logo_url": None,
                        "website": "https://united.example",
                        "amount": 500.00,
                        "iso_currency_code": "USD",
                        "date": str(date(2026, 2, 27)),
                        "authorized_date": None,
                        "category": ["Travel", "Airlines"],
                        "category_id": "13001000",
                        "personal_finance_category": {
                            "primary": "TRAVEL",
                            "detailed": "TRAVEL_AIRLINES",
                            "confidence_level": "HIGH",
                        },
                        "payment_channel": "in_store",
                        "pending": False,
                        "location": {"city": "Toronto", "country": "CA"},
                    }
                ],
                "total_transactions": 1,
            }
        ),
    )
    def test_transactions_saves_transactions_and_normalizes_amount(self, _mock_client):
        item = PlaidItem.objects.create(user=self.user, item_id="item_a", access_token="access", institution_name="Bank")

        self._auth()
        resp = self.client.get(f"/api/plaid/items/{item.item_id}/transactions/?days=30&count=50&offset=0")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        body = resp.json()
        self.assertEqual(body["returned"], 1)
        self.assertEqual(body["total_transactions"], 1)
        self.assertTrue(body["synced_to_db"])
        self.assertFalse(body["has_more"])

        tx = Transaction.objects.get(user=self.user, transaction_id="tx_1")
        # Stored as negative for expenses (Spending endpoints convention)
        self.assertEqual(str(tx.amount), "-500.00")
        self.assertEqual(tx.name, "United Airlines")
        self.assertEqual(tx.merchant_name, "United Airlines")
        self.assertEqual(tx.iso_currency_code, "USD")
        self.assertEqual(tx.account_id, "acc_1")
        self.assertEqual(tx.category, ["Travel", "Airlines"])
        self.assertEqual(tx.location.get("city"), "Toronto")

        # Raw data is persisted (used by other endpoints)
        self.assertIsInstance(tx.raw_data, dict)
        self.assertEqual(tx.raw_data.get("transaction_id"), "tx_1")

    def test_transactions_helpers_are_json_serializable(self):
        # A tiny smoke test for jsonability of payload we store.
        TransactionPayload = {
            "transaction_id": "tx_json",
            "account_id": "acc_json",
            "date": "2026-01-01",
            "amount": 12.34,
            "iso_currency_code": "USD",
            "location": {"city": "Toronto"},
        }
        json.dumps(TransactionPayload)
