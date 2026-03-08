from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from datetime import datetime
from transactions.models import Transaction


class SpendingViewset(viewsets.ViewSet):

    permission_classes = [permissions.IsAuthenticated]

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

    @action(detail=False, methods=["get"])
    def monthly_transactions(self, request):

            qs = self.get_month_transactions(request)

            data = qs.values(
                "merchant_name",
                "amount",
                "date",
                "category"
            )

            return Response(data)

    @action(detail=False, methods=["get"])
    def monthly_spending(self, request):

        qs = self.get_month_transactions(request)

        spending = (
            qs.values("merchant_name")
            .annotate(
                total=Sum("amount"),
                count=Count("id")
            )
            .order_by("-total")
        )

        return Response(spending)

    @action(detail=False, methods=["get"])
    def category_spending(self, request):

        qs = self.get_month_transactions(request)

        categories = (
            qs.values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        return Response(categories)


    @action(detail=False, methods=["get"])
    def recurring_transactions(self, request):

        qs = self.get_month_transactions(request)

        recurring = (
            qs.values("merchant_name")
            .annotate(
                total=Sum("amount"),
                count=Count("id")
            )
            .filter(count__gte=3)
            .order_by("-count")
        )

        return Response(recurring)

    @action(detail=False, methods=["get"])
    def monthly_saving(self, request):

        qs = self.get_month_transactions(request)

        spending = (
            qs.values("merchant_name")
            .annotate(total=Sum("amount"))
        )

        saving = []

        for s in spending:

            name = (s["merchant_name"] or "").upper()
            total = s["total"]

            # Food delivery
            if "UBER" in name or "DOORDASH" in name:

                possible = total - 200

                if possible > 0:
                    saving.append({
                        "name": s["merchant_name"],
                        "total": total,
                        "per_saving": int(possible)
                    })

            # TTC transit
            elif "PRESTO" in name:

                possible = total * 0.40

                saving.append({
                    "name": s["merchant_name"],
                    "total": total,
                    "per_saving": int(possible)
                })

            # Gym membership
            elif "BASECAMP" in name:

                possible = total - 27

                if possible > 0:
                    saving.append({
                        "name": s["merchant_name"],
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

        qs = self.get_month_transactions(request)

        total = qs.aggregate(total_expenses=Sum("amount"))

        return Response(total)