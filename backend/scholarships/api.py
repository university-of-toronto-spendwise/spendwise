from decimal import Decimal

from django.conf import settings
from django.db.models import Q, Value
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile

from .models import Scholarship, SavedScholarship, SavedScholarshipStatus, StudentLevel
from .serializers import (
    ScholarshipListSerializer,
    ScholarshipDetailSerializer,
    MatchRequestSerializer,
    SavedScholarshipSerializer,
)
from .services import monthly_deficit_from_profile, saved_scholarships_nominal_total

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


def _infer_student_level(p):
    """Infer undergrad vs grad from explicit student_level or degree_type (used by match + tests)."""
    sl = p.get("student_level")
    if sl is not None and sl != "":
        if sl == StudentLevel.GRAD or (isinstance(sl, str) and sl.strip().lower() in ("grad", "graduate")):
            return StudentLevel.GRAD
        if sl == StudentLevel.UNDERGRAD or (isinstance(sl, str) and sl.strip().lower() in ("undergrad", "undergraduate")):
            return StudentLevel.UNDERGRAD
    dt = (p.get("degree_type") or "").strip().lower()
    if not dt:
        return None
    if "under" in dt:
        return StudentLevel.UNDERGRAD
    for kw in ("postgrad", "graduate", "masters", "phd", "research grad"):
        if kw in dt:
            return StudentLevel.GRAD
    return None


def _resume_overlap(resume: str, blob: str) -> float:
    """Share of significant resume words (len >= 3) that appear in blob (0..1)."""
    if not resume or not str(resume).strip():
        return 0.0

    def sig_words(text: str):
        return [w.lower() for w in text.split() if len(w) >= 3]

    words = sig_words(str(resume))
    if not words:
        return 0.0
    hay = blob.lower()
    hits = sum(1 for w in words if w in hay)
    return hits / len(words) if words else 0.0


class ScholarshipsListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if _parse_bool(request.query_params.get("include_inactive")) is True:
            qs = Scholarship.objects.all()
        else:
            qs = Scholarship.objects.filter(is_active=True)

        sl = (request.query_params.get("student_level") or "").strip().lower()
        if sl == "undergrad":
            qs = qs.filter(student_level=StudentLevel.UNDERGRAD)
        elif sl in ("grad", "graduate"):
            qs = qs.filter(student_level=StudentLevel.GRAD)

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

        # ---- sorting (default: alphabetical by title) ----
        sort = request.query_params.get("sort")
        if sort:
            s = sort.strip()
            if s == "title" or s == "-title":
                qs = qs.order_by(("-" if s.startswith("-") else "") + "title", "id")
            elif "amount" in s:
                qs = qs.annotate(
                    _amount_sort=Coalesce("amount_max", "amount_min", Value(0))
                )
                qs = qs.order_by(("-" if s.startswith("-") else "") + "_amount_sort", "title")
            elif "deadline" in s:
                qs = qs.order_by(("-" if s.startswith("-") else "") + "deadline", "title")
            else:
                qs = qs.order_by("title", "id")
        else:
            qs = qs.order_by("title", "id")

        # ---- pagination ----
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        data = ScholarshipListSerializer(page, many=True).data
        return paginator.get_paginated_response(data)


class ScholarshipDetailAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            s = Scholarship.objects.get(pk=pk, is_active=True)
        except Scholarship.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(ScholarshipDetailSerializer(s).data)


class ScholarshipsMetaAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        base = Scholarship.objects.filter(is_active=True)

        award_types = (
            base.exclude(award_type__isnull=True)
            .exclude(award_type__exact="")
            .values_list("award_type", flat=True)
            .distinct()
        )

        citizenship_vals = []
        if base.filter(open_to_domestic=True).exists():
            citizenship_vals.append("Domestic")
        if base.filter(open_to_international=True).exists():
            citizenship_vals.append("International")

        nature_vals = []
        for key, field in NATURE_FIELD_MAP.items():
            if base.filter(**{field: True}).exists():
                nature_vals.append(key)

        faculty_college_vals = []

        level_vals = list(
            base.values_list("student_level", flat=True).distinct().order_by("student_level")
        )

        return Response(
            {
                "award_type": list(award_types),
                "citizenship": citizenship_vals,
                "nature": nature_vals,
                "faculty_college": faculty_college_vals,
                "student_level": level_vals,
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

        qs = Scholarship.objects.filter(is_active=True)

        sl_raw = (p.get("student_level") or "").strip().lower()
        if sl_raw == "undergrad":
            qs = qs.filter(student_level=StudentLevel.UNDERGRAD)
        elif sl_raw in ("grad", "graduate"):
            qs = qs.filter(student_level=StudentLevel.GRAD)
        else:
            inferred = _infer_student_level(p)
            if inferred == StudentLevel.UNDERGRAD:
                qs = qs.filter(student_level=StudentLevel.UNDERGRAD)
            elif inferred == StudentLevel.GRAD:
                qs = qs.filter(student_level=StudentLevel.GRAD)

        if citizenship:
            c = citizenship.lower()
            if c == "domestic":
                qs = qs.filter(open_to_domestic=True)
            elif c == "international":
                qs = qs.filter(open_to_international=True)

        resume = (p.get("resume_summary") or "").strip()
        financial_need = bool(p.get("financial_need"))
        gpa = p.get("gpa")

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

            # financial need (0.12)
            if financial_need:
                total += 0.12
                if s.nature_financial_need:
                    score += 0.12
                    reasons.append("Financial need alignment with profile")

            # resume overlap (0.15)
            if resume:
                total += 0.15
                overlap = _resume_overlap(resume, blob)
                if overlap > 0:
                    score += 0.15 * overlap
                    reasons.append(f"Resume overlap with listing ({overlap:.0%})")

            # GPA mention (0.05)
            if gpa is not None:
                total += 0.05
                if "gpa" in blob or "grade" in blob:
                    score += 0.05
                    reasons.append("GPA or grades referenced in listing")

            final = (score / total) if total > 0 else 0.0

            eligible = True
            if citizenship:
                c = citizenship.lower()
                eligible = (c == "domestic" and s.open_to_domestic) or (
                    c == "international" and s.open_to_international
                )

            results.append(
                {
                    "scholarship": ScholarshipListSerializer(s).data,
                    "score": round(final, 3),
                    "reasons": reasons,
                    "eligible": eligible,
                }
            )

        # Always order by match strength (strongest first), then deadline as tiebreaker
        def sort_key(x):
            d = x["scholarship"].get("deadline") or "9999-12-31"
            return (-x["score"], d)

        results.sort(key=sort_key)
        return Response(results)


class SavedScholarshipsListAPI(APIView):
    """List all saved scholarships with status for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved = SavedScholarship.objects.filter(user=request.user).select_related("scholarship").order_by("-saved_at")
        data = SavedScholarshipSerializer(saved, many=True).data
        return Response(data)


class SavedScholarshipStatsAPI(APIView):
    """Counts of saved scholarships by outcome (awarded vs not_awarded) for acceptance metrics."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SavedScholarship.objects.filter(user=request.user)
        awarded = qs.filter(status="awarded").count()
        not_awarded = qs.filter(status="not_awarded").count()
        decided = awarded + not_awarded
        acceptance_rate = (awarded / decided) if decided > 0 else None
        return Response(
            {
                "awarded": awarded,
                "not_awarded": not_awarded,
                "acceptance_rate": acceptance_rate,
            }
        )


class SavedScholarshipDeficitImpactAPI(APIView):
    """
    Monthly deficit vs saved scholarship nominal totals with a probability-weighted potential award.

    Illustrative only: catalog amounts are not normalized to monthly; consumers may scale.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        prob_raw = request.query_params.get("probability")
        if prob_raw is not None and prob_raw != "":
            try:
                p = float(prob_raw)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Invalid probability; use a number between 0 and 1 (e.g. 0.8)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            p = float(settings.SCHOLARSHIP_ASSUMED_WIN_PROBABILITY)

        if not (0 < p <= 1):
            return Response(
                {"detail": "probability must be in the range (0, 1]."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        monthly_deficit = monthly_deficit_from_profile(profile)

        saved_qs = SavedScholarship.objects.filter(user=request.user).select_related("scholarship")
        saved_rows = list(saved_qs)
        saved_count = len(saved_rows)
        total_nominal = saved_scholarships_nominal_total(saved_rows)

        potential = (Decimal(total_nominal) * Decimal(str(p))).quantize(Decimal("0.01"))
        remaining = monthly_deficit - potential
        if remaining < 0:
            remaining = Decimal("0")
        remaining = remaining.quantize(Decimal("0.01"))
        monthly_deficit_q = monthly_deficit.quantize(Decimal("0.01"))

        return Response(
            {
                "monthly_deficit": str(monthly_deficit_q),
                "saved_count": saved_count,
                "total_nominal_amount": total_nominal,
                "assumed_award_probability": p,
                "potential_amount": str(potential),
                "remaining_deficit_after_potential": str(remaining),
                "notes": "Scholarship catalog amounts are not normalized to monthly; treat as illustrative.",
                "disclaimer": "Illustrative only; not financial advice or a guarantee of awards.",
            }
        )


class SaveUnsaveScholarshipAPI(APIView):
    """POST: save scholarship for the user. DELETE: unsave."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            scholarship = Scholarship.objects.get(pk=pk, is_active=True)
        except Scholarship.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        _, created = SavedScholarship.objects.get_or_create(
            user=request.user,
            scholarship=scholarship,
        )
        return Response(
            {"saved": True, "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        deleted, _ = SavedScholarship.objects.filter(
            user=request.user,
            scholarship_id=pk,
        ).delete()
        if not deleted:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedScholarshipStatusAPI(APIView):
    """PATCH: update status of a saved scholarship (saved, in_progress, submitted)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            saved = SavedScholarship.objects.get(pk=pk, user=request.user)
        except SavedScholarship.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get("status")
        if new_status not in {s.value for s in SavedScholarshipStatus}:
            return Response(
                {"detail": "Invalid status. Use: saved, in_progress, submitted"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        saved.status = new_status
        saved.save()
        return Response(SavedScholarshipSerializer(saved).data)