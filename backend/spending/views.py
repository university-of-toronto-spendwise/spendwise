from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, Max
from django.db.models.functions import Coalesce, Abs
from datetime import datetime
from datetime import timedelta
from decimal import Decimal
from transactions.models import Transaction
from student_codes.models import Codes
from .models import RecurringMerchant
from django.utils import timezone
import re


class SpendingViewset(viewsets.ViewSet):

    permission_classes = [permissions.IsAuthenticated]
    RECURRING_MIN_COUNT = 5
    RECURRING_MIN_TOTAL = Decimal("300")

    def get_month_transactions(self, request):

        month = request.query_params.get("month")
        year = request.query_params.get("year")
        account_id = request.query_params.get("account_id")

        if month is None or year is None:
            today = datetime.today()
            month = today.month
            year = today.year
        else:
            try:
                month = int(month)
                year = int(year)
            except (TypeError, ValueError):
                today = datetime.today()
                month = today.month
                year = today.year

        if not (1 <= int(month) <= 12):
            today = datetime.today()
            month = today.month

        qs = Transaction.objects.filter(
            user=request.user,
            date__month=month,
            date__year=year
        )

        # filter by account if provided
        if account_id:
            qs = qs.filter(account_id=account_id)

        return qs
    
    def get_student_data(self, request):
        qs = Codes.objects.filter(
            Q(desc__iregex=r"\$\d+\s*off") | Q(desc__iregex=r"\d+%\s*off")
        )

        result = []

        for obj in qs:
            discount = self.extract_discount(obj.desc)

            result.append({
                "title": obj.company,
                "description": obj.desc,
                "discount": discount
            })

        return result

    
    @staticmethod
    def extract_discount(desc):
        text = desc or ""
        dollar = re.search(r"\$(\d+)", text)
        percent = re.search(r"(\d+)%", text)

        if dollar:
            return {"type": "dollar", "value": int(dollar.group(1))}
        elif percent:
            return {"type": "percent", "value": int(percent.group(1))}
        
        return None
        


    def get_recurring_spending(self, request):

        qs = self.get_month_transactions(request).annotate(
            merchant_display=Coalesce("merchant_name", "name")
        )

        # Only consider expenses (negative amounts).
        qs = qs.filter(amount__lt=0)

        recurring = (
            qs.values("merchant_display")
            .annotate(
                # Use absolute value so refunds/credits don't hide "high impact" merchants.
                total_abs=Sum(Abs("amount")),
                count=Count("id"),
                latest_date=Max("date"),
            )
            .filter(
                Q(count__gte=self.RECURRING_MIN_COUNT) | Q(total_abs__gte=self.RECURRING_MIN_TOTAL)
            )
            .order_by("-total_abs")
        )

        return recurring

    @staticmethod
    def _merchant_key(value: str) -> str:
        return " ".join(str(value or "").strip().lower().split()) or "unknown"

    @staticmethod
    def _parse_bool(value, default=False) -> bool:
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        text = str(value).strip().lower()
        if text in {"1", "true", "t", "yes", "y", "on"}:
            return True
        if text in {"0", "false", "f", "no", "n", "off"}:
            return False
        return default

    def _approved_recurring_keys(self, request, account_id: str | None) -> set[str]:
        qs = RecurringMerchant.objects.filter(user=request.user, is_recurring=True)
        if account_id:
            qs = qs.filter(Q(account_id="") | Q(account_id=account_id))
        return set(qs.values_list("merchant_key", flat=True))

    def _dismissed_keys(self, request, account_id: str | None) -> set[str]:
        now = timezone.now()
        qs = RecurringMerchant.objects.filter(
            user=request.user,
            dismissed_until__isnull=False,
            dismissed_until__gt=now,
        )
        if account_id:
            qs = qs.filter(Q(account_id="") | Q(account_id=account_id))
        return set(qs.values_list("merchant_key", flat=True))

    def _dismissed_after_by_key(self, request, account_id: str | None) -> dict[str, datetime.date]:
        qs = RecurringMerchant.objects.filter(
            user=request.user,
            dismissed_after__isnull=False,
        )
        if account_id:
            qs = qs.filter(Q(account_id="") | Q(account_id=account_id))
        return {row["merchant_key"]: row["dismissed_after"] for row in qs.values("merchant_key", "dismissed_after")}

    @action(detail=False, methods=["post"])
    def set_recurring(self, request):
        merchant_name = request.data.get("merchant_name") or request.data.get("merchant") or ""
        merchant_key = request.data.get("merchant_key") or self._merchant_key(merchant_name)
        account_id = request.data.get("account_id") or ""
        is_recurring = self._parse_bool(request.data.get("is_recurring"), default=True)
        dismiss_for_days = request.data.get("dismiss_for_days")
        dismiss_until_next_tx = self._parse_bool(request.data.get("dismiss_until_next_tx"), default=False)

        dismissed_until = None
        dismissed_after = None
        if not is_recurring and dismiss_for_days is not None:
            try:
                days = int(dismiss_for_days)
            except (TypeError, ValueError):
                days = 0
            days = max(0, min(days, 30))
            if days:
                dismissed_until = timezone.now() + timedelta(days=days)
        if not is_recurring and dismiss_until_next_tx:
            dismissed_after = timezone.localdate()

        obj, _created = RecurringMerchant.objects.update_or_create(
            user=request.user,
            merchant_key=merchant_key,
            account_id=account_id,
            defaults={
                "merchant_name": merchant_name,
                "is_recurring": is_recurring,
                "dismissed_until": dismissed_until,
                "dismissed_after": dismissed_after,
            },
        )

        return Response(
            {
                "merchant_key": obj.merchant_key,
                "merchant_name": obj.merchant_name,
                "account_id": obj.account_id,
                "is_recurring": obj.is_recurring,
                "dismissed_until": obj.dismissed_until,
                "dismissed_after": obj.dismissed_after,
            }
        )

    @action(detail=False, methods=["get"])
    def monthly_transactions(self, request):

        qs = self.get_month_transactions(request)

        data = qs.values(
            "merchant_name",
            "name",
            "amount",
            "date",
            "category",
            "account_id",
        )

        return Response(data)

    @action(detail=False, methods=["get"])
    def monthly_spending(self, request):
        # Only show user-approved recurring merchants.
        account_id = request.query_params.get("account_id")
        approved = self._approved_recurring_keys(request, account_id)
        spending = [
            row
            for row in self.get_recurring_spending(request)
            if self._merchant_key(row.get("merchant_display")) in approved
        ]

        return Response(
            [
                {
                    "merchant_name": row["merchant_display"],
                    "total": row["total_abs"],
                    "count": row["count"],
                }
                for row in spending
            ]
        )

    @action(detail=False, methods=["get"])
    def category_spending(self, request):

        qs = self.get_month_transactions(request).filter(amount__lt=0)

        categories = (
            qs.values("category")
            .annotate(total=Sum(Abs("amount")))
            .order_by("-total")
        )

        return Response(categories)


    @action(detail=False, methods=["get"])
    def recurring_transactions(self, request):
        account_id = request.query_params.get("account_id")
        approved = self._approved_recurring_keys(request, account_id)
        recurring = [
            row
            for row in self.get_recurring_spending(request).order_by("-count")
            if self._merchant_key(row.get("merchant_display")) in approved
        ]

        return Response(
            [
                {
                    "merchant_name": row["merchant_display"],
                    "total": row["total_abs"],
                    "count": row["count"],
                }
                for row in recurring
            ]
        )

    @action(detail=False, methods=["get"])
    def monthly_saving(self, request):

        # Generate tips for recurring-candidate merchants; mark "recurring" true only after user approval.
        spending = self.get_recurring_spending(request)
        account_id = request.query_params.get("account_id")
        approved = self._approved_recurring_keys(request, account_id)
        dismissed = self._dismissed_keys(request, account_id)
        dismissed_after_by_key = self._dismissed_after_by_key(request, account_id)

        codes = self.get_student_data(request)

        saving = []

        for s in spending:

            merchant = s["merchant_display"]
            name = (merchant or "").upper()
            total = s["total_abs"] or Decimal("0")
            merchant_key = self._merchant_key(merchant)
            if merchant_key in dismissed:
                continue
            dismissed_after = dismissed_after_by_key.get(merchant_key)
            if dismissed_after is not None:
                latest_date = s.get("latest_date")
                if latest_date and latest_date <= dismissed_after:
                    continue
            is_recurring = merchant_key in approved

            # Food delivery
            if "UBER" in name or "DOORDASH" in name:

                possible = total - 200

                if possible > 0:
                   saving.append(
                        {
                            "name": merchant,
                            "total": total,
                            "per_saving": int(possible),
                            "desc": "Cut back on food delivery to save at least $30 this month.",
                            "recurring": is_recurring,
                        }
                    )

            # TTC transit
            elif "PRESTO" in name:
                possible = total * Decimal("0.40")

                saving.append({
                    "name": merchant,
                    "total": total,
                    "per_saving": int(possible),
                    "desc": "Get TTC Monthly Pass for 128 and enjoy Unlimited Rides for the whole month",
                    "recurring": is_recurring,
                    })
            elif "UNITED AIRLINES" in name:

                possible = total * Decimal("0.05")

                saving.append({
                    "name": merchant,
                    "total": total,
                    "per_saving": int(possible),
                    "desc": "Get 5percent off United Economy® and Basic Economy fares, applicable to ages 18-23",
                    "recurring": is_recurring,
                })

            # Gym membership
            elif "BASECAMP" in name:

                possible = total - 27

                if possible > 0:
                    saving.append({
                        "name": merchant,
                        "total": total,
                        "per_saving": int(possible),
                        "desc": "Get Tickets up to 9 dollars by claiming one of the offer on their Instagram Page",
                        "recurring": is_recurring,
                    })
            # all other codes
            else:
                for code in codes:
                    title = (code.get("title") or "").strip()
                    desc_code = code["description"]
                    discount = code["discount"]
                    
                    if not title or not discount:
                        continue

                    if title.upper() in name:
                        if discount["type"] == "percent":
                            actual_discount = Decimal(discount["value"]) / Decimal("100")
                            possible = total * actual_discount
                        else:
                            possible = min(total, Decimal(discount["value"]))

                        saving.append({
                        "name": merchant,
                        "total": total,
                        "per_saving": int(possible),
                        "desc": desc_code,
                        "recurring": is_recurring,
                    })


        return Response(saving)


    @action(detail=False, methods=["get"])
    def monthly_saving_amount(self, request):

        savings = self.monthly_saving(request).data
        total = 0

        for s in savings:
            if s.get("recurring") is True:
                total += int(s.get("per_saving") or 0)

        return Response({"total_saving": total})


    @action(detail=False, methods=["get"])
    def total_expenses_amount(self, request):

        qs = self.get_month_transactions(request).filter(amount__lt=0)

        aggregate_result = qs.aggregate(total_expenses=Sum(Abs("amount")))
        total_expenses = aggregate_result.get("total_expenses") or 0

        return Response({
            "total_expenses": total_expenses
        })
    
    # now have to use the codes and see if it exists there need to be a button and recurring gets add 
    # to monthly potentila spending and 6 monthly spending for that i can shiraz with the up to amount and cap it 6 month, can
    # send a yes which saves a it otherwise not save and then save if this transctions already being visited dont ask for again to
    # have duplicate on and get all until last year which cab be a recurring transcations and contininung now 
    # if not recurring so dont add it we want recurring expenses
