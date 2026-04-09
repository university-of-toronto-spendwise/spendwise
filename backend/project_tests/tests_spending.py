from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient

from transactions.models import PlaidItem, Transaction
from spending.models import RecurringMerchant


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))

def _merchant_key(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split()) or "unknown"


class SpendingViewsetTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create_user(username="u1", password="pw")
        cls.other_user = User.objects.create_user(username="u2", password="pw")

        cls.item = PlaidItem.objects.create(
            item_id="item_1",
            access_token="access-token",
            institution_id="ins_1",
            institution_name="Test Bank",
        )

        cls.other_item = PlaidItem.objects.create(
            item_id="item_2",
            access_token="access-token-2",
            institution_id="ins_2",
            institution_name="Other Bank",
        )

        # Target month/year used by tests
        cls.month = 3
        cls.year = 2026

        # In-scope transactions (user)
        # UBER: 5 expenses, total $350 => recurring (by count and by total)
        for index, (day, amt) in enumerate(
            [(1, "120.00"), (2, "80.00"), (3, "60.00"), (4, "50.00"), (8, "40.00")],
            start=1,
        ):
            Transaction.objects.create(
                user=cls.user,
                item=cls.item,
                transaction_id=f"tx_uber_{index}",
                account_id="acc_1",
                merchant_name="UBER EATS",
                name="Uber Eats Order",
                amount=Decimal(amt) * Decimal("-1"),
                date=date(2026, 3, day),
                category="Food",
            )

        # PRESTO: 5 expenses, total $100 => recurring (by count)
        for index, day in enumerate([9, 10, 11, 12, 13], start=1):
            Transaction.objects.create(
                user=cls.user,
                item=cls.item,
                transaction_id=f"tx_presto_{index}",
                account_id="acc_1",
                merchant_name="PRESTO",
                name="Transit",
                amount=Decimal("-20.00"),
                date=date(2026, 3, day),
                category="Transit",
            )
        Transaction.objects.create(
            user=cls.user,
            item=cls.item,
            transaction_id="tx_basecamp_1",
            account_id="acc_2",
            merchant_name="BASECAMP FITNESS",
            name="Gym",
            amount=Decimal("-100.00"),
            date=date(2026, 3, 4),
            category="Health",
        )

        # Recurring merchant (>=5 in month) - expenses
        for index, day in enumerate([14, 15, 16, 17, 18], start=1):
            Transaction.objects.create(
                user=cls.user,
                item=cls.item,
                transaction_id=f"tx_netflix_{index}",
                account_id="acc_1",
                merchant_name="NETFLIX",
                name="Netflix",
                amount=Decimal("-9.99"),
                date=date(2026, 3, day),
                category="Entertainment",
            )

        # Out-of-scope: other month
        Transaction.objects.create(
            user=cls.user,
            item=cls.item,
            transaction_id="tx_other_month",
            account_id="acc_1",
            merchant_name="UBER EATS",
            name="Uber Eats Order",
            amount=Decimal("-999.00"),
            date=date(2026, 2, 10),
            category="Food",
        )

        # Out-of-scope: other user
        Transaction.objects.create(
            user=cls.other_user,
            item=cls.other_item,
            transaction_id="tx_other_user",
            account_id="acc_1",
            merchant_name="PRESTO",
            name="Transit",
            amount=Decimal("-999.00"),
            date=date(2026, 3, 3),
            category="Transit",
        )

        # Approve recurring merchants (user presses "Yes" in UI)
        for merchant_name in ["UBER EATS", "PRESTO", "NETFLIX"]:
            RecurringMerchant.objects.update_or_create(
                user=cls.user,
                merchant_key=_merchant_key(merchant_name),
                account_id="",
                defaults={
                    "merchant_name": merchant_name,
                    "is_recurring": True,
                    "dismissed_until": None,
                    "dismissed_after": None,
                },
            )

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        unauth_client = APIClient()
        url = reverse("project-monthly-spending")
        response = unauth_client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 401)

    def test_monthly_transactions_returns_expected_rows_and_fields(self):
        url = reverse("project-monthly-transactions")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

        first = data[0]
        self.assertIn("merchant_name", first)
        self.assertIn("amount", first)
        self.assertIn("date", first)
        self.assertIn("category", first)
        self.assertIn("account_id", first)

        # Ensure out-of-scope transactions are excluded
        for row in data:
            self.assertNotEqual(row.get("amount"), "999.00")
            self.assertNotEqual(row.get("amount"), 999.0)
            self.assertNotEqual(row.get("amount"), 999)

    def test_account_id_filters_monthly_queries(self):
        url = reverse("project-monthly-transactions")
        response = self.client.get(
            url,
            {"month": self.month, "year": self.year, "account_id": "acc_2"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(all(row["account_id"] == "acc_2" for row in data))

    def test_monthly_spending_aggregates_by_merchant(self):
        url = reverse("project-monthly-spending")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        totals = {row["merchant_name"]: row for row in data}
        self.assertIn("UBER EATS", totals)

        uber = totals["UBER EATS"]
        self.assertEqual(uber["count"], 5)
        self.assertEqual(_to_decimal(uber["total"]), Decimal("350.00"))

    def test_category_spending_aggregates_by_category(self):
        url = reverse("project-category-spending")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        totals = {row["category"]: row for row in data}
        self.assertEqual(_to_decimal(totals["Food"]["total"]), Decimal("350.00"))
        self.assertEqual(_to_decimal(totals["Transit"]["total"]), Decimal("100.00"))

    def test_recurring_transactions_returns_merchants_with_count_ge_5_or_total_ge_300(self):
        url = reverse("project-recurring-transactions")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        merchants = {row["merchant_name"]: row for row in data}
        self.assertIn("NETFLIX", merchants)
        self.assertGreaterEqual(merchants["NETFLIX"]["count"], 5)
        self.assertIn("UBER EATS", merchants)
        self.assertNotIn("BASECAMP FITNESS", merchants)  # not recurring / high-impact

    def test_monthly_saving_detects_known_merchants(self):
        url = reverse("project-monthly-saving")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        savings = {row["name"]: row for row in data}

        # UBER: total 350 => possible 150
        self.assertIn("UBER EATS", savings)
        self.assertEqual(savings["UBER EATS"]["per_saving"], 150)

        # PRESTO: total 100 => possible 40
        self.assertIn("PRESTO", savings)
        self.assertEqual(savings["PRESTO"]["per_saving"], 40)

        # BASECAMP is not recurring/high-impact, so excluded from tips.
        self.assertNotIn("BASECAMP FITNESS", savings)

    def test_monthly_saving_amount_sums_per_saving(self):
        url = reverse("project-monthly-saving-amount")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_saving"], 150 + 40)

    def test_total_expenses_amount_returns_number_and_defaults_to_zero(self):
        url = reverse("project-total-expenses-amount")
        response = self.client.get(url, {"month": self.month, "year": self.year})
        self.assertEqual(response.status_code, 200)

        total = _to_decimal(response.json()["total_expenses"])
        expected = (
            Decimal("350.00")
            + Decimal("100.00")
            + Decimal("100.00")
            + (Decimal("9.99") * 5)
        )
        self.assertEqual(total, expected)

        # Empty month => 0
        response_empty = self.client.get(url, {"month": 1, "year": 1999})
        self.assertEqual(response_empty.status_code, 200)
        self.assertEqual(_to_decimal(response_empty.json()["total_expenses"]), Decimal("0"))
