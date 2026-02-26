from django.db.models import Q, Value                  # ✅ added Value import
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Scholarship
from .serializers import (
    ScholarshipListSerializer,
    ScholarshipDetailSerializer,
    MatchRequestSerializer,
)

NATURE_FIELD_MAP = {
    "academic_merit": "nature_academic_merit",
    "athletic_performance": "nature_athletic_performance",
    "community": "nature_community",
    "financial_need": "nature_financial_need",
    "leadership": "nature_leadership",
    "indigenous": "nature_indigenous",
    "black_students": "nature_black_students",
    "extracurriculars": "nature_extracurriculars",
    "other": "nature_other",
}


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _parse_bool(val: str):
    if val is None:
        return None
    v = val.strip().lower()
    if v in ("true", "1", "yes", "y"):
        return True
    if v in ("false", "0", "no", "n"):
        return False
    return None


class ScholarshipsListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Scholarship.objects.all()

        # ---- search (q) ----
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(offered_by__icontains=q)
            )

        # ---- filtering ----
        award_type = request.query_params.get("award_type")
        if award_type:
            qs = qs.filter(award_type=award_type)

        citizenship = request.query_params.get("citizenship")
        if citizenship:
            c = citizenship.strip().lower()
            if c == "domestic":
                qs = qs.filter(open_to_domestic=True)
            elif c == "international":
                qs = qs.filter(open_to_international=True)

        nature = request.query_params.get("nature")
        if nature:
            parts = [p.strip().lower() for p in nature.split(",") if p.strip()]
            for p in parts:
                field = NATURE_FIELD_MAP.get(p)
                if field:
                    qs = qs.filter(**{field: True})

        application_required = _parse_bool(request.query_params.get("application_required"))
        if application_required is not None:
            qs = qs.filter(application_required=application_required)

        faculty_college = request.query_params.get("faculty_college")
        if faculty_college:
            fc = faculty_college.strip()
            qs = qs.filter(
                Q(title__icontains=fc)
                | Q(description__icontains=fc)
                | Q(offered_by__icontains=fc)
            )

        # ---- deadline range ----
        deadline_after = request.query_params.get("deadline_after")
        if deadline_after:
            qs = qs.filter(deadline__gte=deadline_after)

        deadline_before = request.query_params.get("deadline_before")
        if deadline_before:
            qs = qs.filter(deadline__lte=deadline_before)

        # ---- minimum amount ----
        min_amount = request.query_params.get("min_amount")
        if min_amount:
            try:
                m = int(min_amount)
                qs = qs.filter(Q(amount_max__gte=m) | Q(amount_min__gte=m))
            except ValueError:
                pass

        # ---- sorting ----
        sort = request.query_params.get("sort")
        if sort:
            s = sort.strip()
            if "amount" in s:
                qs = qs.annotate(
                    _amount_sort=Coalesce("amount_max", "amount_min", Value(0))  # ✅ fixed Value(0)
                )
                qs = qs.order_by(("-" if s.startswith("-") else "") + "_amount_sort", "-created_at")
            elif "deadline" in s:
                qs = qs.order_by(("-" if s.startswith("-") else "") + "deadline", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        # ---- pagination ----
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        data = ScholarshipListSerializer(page, many=True).data
        return paginator.get_paginated_response(data)


class ScholarshipDetailAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            s = Scholarship.objects.get(pk=pk)
        except Scholarship.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(ScholarshipDetailSerializer(s).data)


class ScholarshipsMetaAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        award_types = (
            Scholarship.objects.exclude(award_type__isnull=True)
            .exclude(award_type__exact="")
            .values_list("award_type", flat=True)
            .distinct()
        )

        citizenship_vals = []
        if Scholarship.objects.filter(open_to_domestic=True).exists():
            citizenship_vals.append("Domestic")
        if Scholarship.objects.filter(open_to_international=True).exists():
            citizenship_vals.append("International")

        nature_vals = []
        for key, field in NATURE_FIELD_MAP.items():
            if Scholarship.objects.filter(**{field: True}).exists():
                nature_vals.append(key)

        faculty_college_vals = []

        return Response(
            {
                "award_type": list(award_types),
                "citizenship": citizenship_vals,
                "nature": nature_vals,
                "faculty_college": faculty_college_vals,
            }
        )


class ScholarshipsMatchAPI(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        req = MatchRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        p = req.validated_data

        faculty = (p.get("faculty") or "").strip()
        major = (p.get("major") or "").strip()
        degree_type = (p.get("degree_type") or "").strip().lower()
        citizenship = (p.get("citizenship") or "").strip()
        campus = (p.get("campus") or "").strip()
        year = p.get("year", None)

        qs = Scholarship.objects.all()

        if citizenship:
            c = citizenship.lower()
            if c == "domestic":
                qs = qs.filter(open_to_domestic=True)
            elif c == "international":
                qs = qs.filter(open_to_international=True)

        results = []
        for s in qs:
            reasons = []
            score = 0.0
            total = 0.0

            blob = f"{s.title}\n{s.offered_by or ''}\n{s.description or ''}".lower()

            # citizenship (0.30)
            if citizenship:
                total += 0.30
                c = citizenship.lower()
                ok = (c == "domestic" and s.open_to_domestic) or (c == "international" and s.open_to_international)
                if ok:
                    score += 0.30
                    reasons.append(f"Citizenship match: {citizenship}")

            # faculty keyword (0.20)
            if faculty:
                total += 0.20
                if faculty.lower() in blob:
                    score += 0.20
                    reasons.append(f"Faculty keyword match: {faculty}")

            # major keyword (0.25)
            if major:
                total += 0.25
                if major.lower() in blob:
                    score += 0.25
                    reasons.append(f"Major keyword match: {major}")

            # degree type keyword (0.10)
            if degree_type:
                total += 0.10
                ok = False
                if "under" in degree_type:
                    ok = "undergraduate" in blob or "in-course" in blob or "admissions" in blob
                elif "grad" in degree_type:
                    ok = "graduate" in blob or "master" in blob or "phd" in blob
                if ok:
                    score += 0.10
                    reasons.append(f"Degree keyword match: {p.get('degree_type')}")

            # year keyword (0.10)
            if isinstance(year, int):
                total += 0.10
                if f"year {year}" in blob or f"{year}th year" in blob:
                    score += 0.10
                    reasons.append(f"Year keyword match: year {year}")

            # campus keyword (0.05)
            if campus:
                total += 0.05
                if campus.lower() in blob:
                    score += 0.05
                    reasons.append(f"Campus keyword match: {campus}")

            final = (score / total) if total > 0 else 0.0

            results.append(
                {
                    "scholarship": ScholarshipListSerializer(s).data,
                    "score": round(final, 3),
                    "reasons": reasons,
                }
            )

        def sort_key(x):
            d = x["scholarship"].get("deadline") or "9999-12-31"
            return (-x["score"], d)

        results.sort(key=sort_key)
        return Response(results)
