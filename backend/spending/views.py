from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db.models import Q
from django.db.models.functions import Coalesce, Abs
from datetime import datetime
from decimal import Decimal
from transactions.models import Transaction


class SpendingViewset(viewsets.ViewSet):

    permission_classes = [permissions.IsAuthenticated]
    RECURRING_MIN_COUNT = 5
    RECURRING_MIN_TOTAL = Decimal("300")

    def get_month_transactions(self, request):

        month = request.query_params.get("month")
        year = request.query_params.get("year")
        account_id = request.query_params.get("account_id")

        if not month or not year:
            today = datetime.today()
            month = today.month
            year = today.year

        qs = Transaction.objects.filter(
            user=request.user,
            date__month=month,
            date__year=year
        )

        # filter by account if provided
        if account_id:
            qs = qs.filter(account_id=account_id)

        return qs

    def get_recurring_spending(self, request):

        qs = self.get_month_transactions(request).annotate(
            merchant_display=Coalesce("merchant_name", "name")
        )

        # Only consider expenses (negative amounts) for recurring/high-impact spending.
        qs = qs.filter(amount__lt=0)

        recurring = (
            qs.values("merchant_display")
            .annotate(
                # Use absolute value so refunds/credits don't hide "high impact" merchants.
                total_abs=Sum(Abs("amount")),
                count=Count("id")
            )
            .filter(
                Q(count__gte=self.RECURRING_MIN_COUNT) | Q(total_abs__gte=self.RECURRING_MIN_TOTAL)
            )
            .order_by("-total_abs")
        )

        return recurring

    @action(detail=False, methods=["get"])
    def monthly_transactions(self, request):

            qs = self.get_month_transactions(request)

            data = qs.values(
                "merchant_name",
                "name",
                "amount",
                "date",
                "category",
                "account_id" 
            )

            return Response(data)

    @action(detail=False, methods=["get"])
    def monthly_spending(self, request):
        # Only show "recurring" / high-impact merchants:
        # - occurred >= 5 times in the month OR
        # - total monthly spend >= $300
        spending = self.get_recurring_spending(request)

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
        recurring = self.get_recurring_spending(request).order_by("-count")

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

        # Generate tips only for recurring / high-impact merchants.
        spending = self.get_recurring_spending(request)

        saving = []

        for s in spending:

            merchant = s["merchant_display"]
            name = (merchant or "").upper()
            total = s["total_abs"] or Decimal("0")

            # Food delivery
            if "UBER" in name or "DOORDASH" in name or "UNITED AIRLINES" in name:

                possible = total - 200

                if possible > 0:
                    saving.append({
                        "name": merchant,
                        "total": total,
                        "per_saving": int(possible)
                    })

            # TTC transit
            elif "PRESTO" in name:

                possible = total * Decimal("0.40")

                saving.append({
                    "name": merchant,
                    "total": total,
                    "per_saving": int(possible)
                })

            # Gym membership
            elif "BASECAMP" in name:

                possible = total - 27

                if possible > 0:
                    saving.append({
                        "name": merchant,
                        "total": total,
                        "per_saving": int(possible)
                    })

        return Response(saving)


    @action(detail=False, methods=["get"])
    def monthly_saving_amount(self, request):

        savings = self.monthly_saving(request).data

        total = sum(s["per_saving"] for s in savings)

        return Response({
            "total_saving": total
        })


    @action(detail=False, methods=["get"])
    def total_expenses_amount(self, request):

        qs = self.get_month_transactions(request).filter(amount__lt=0)

        aggregate_result = qs.aggregate(total_expenses=Sum(Abs("amount")))
        total_expenses = aggregate_result.get("total_expenses") or 0

        return Response({
            "total_expenses": total_expenses
        })
