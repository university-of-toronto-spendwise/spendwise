
import requests
from django.db.models import Q
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from transactions.models import Transaction

from .models import Codes
from .services import score_code_for_transactions, serialize_code

SPC_OFFERS_URL = "https://offers-and-partners-7ada7hxd2a-uc.a.run.app/v5/offers/summary"
SPC_IMAGE_BASE = "https://storage.spccard.ca/"


def _to_image_url(path_value: str) -> str:
    if not path_value:
        return ""
    value = str(path_value).strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"{SPC_IMAGE_BASE}{value.lstrip('/')}"


class SPCDealsAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            page = int(request.query_params.get("page", 2))
        except (TypeError, ValueError):
            page = 2

        try:
            page_size = int(request.query_params.get("page_size", 24))
        except (TypeError, ValueError):
            page_size = 24

        page = max(1, page)
        page_size = max(1, min(page_size, 100))

        try:
            upstream = requests.get(
                SPC_OFFERS_URL,
                params={"current_page": page, "page_size": page_size},
                timeout=15,
            )
            upstream.raise_for_status()
            payload = upstream.json()
        except requests.RequestException as exc:
            return Response({"error": f"Failed to fetch SPC deals: {exc}"}, status=502)

        offers = payload.get("offers", [])
        partners_by_id = payload.get("partners_by_id", {})

        normalized = []
        for offer in offers:
            partner = partners_by_id.get(offer.get("partner_id"), {})

            logo_path = partner.get("logo_web") or partner.get("logo_mobile") or ""
            image_path = offer.get("image_small_en") or offer.get("image_large_en") or ""

            normalized.append(
                {
                    "id": offer.get("id") or offer.get("offer_id"),
                    "partner": partner.get("partner_name") or partner.get("name") or "Unknown Partner",
                    "category": offer.get("category"),
                    "title": offer.get("title_en") or offer.get("deals_title_en") or "",
                    "description": offer.get("deals_description_en") or "",
                    "url": offer.get("url"),
                    "promo_code_online": offer.get("promo_code_online") or "",
                    "promo_code_instore": offer.get("promo_code_instore") or "",
                    "online": bool(offer.get("online")),
                    "in_store": bool(offer.get("in_store")),
                    "is_spc_plus": bool(offer.get("is_spc_plus")),
                    "logo": _to_image_url(logo_path),
                    "image": _to_image_url(image_path),
                }
            )

        return Response(
            {
                "page": page,
                "page_size": page_size,
                "next_page": payload.get("next_page"),
                "total_count": payload.get("total_count", len(normalized)),
                "count": len(normalized),
                "deals": normalized,
            }
        )


class TrendingCodesAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        top_codes = list(Codes.objects.order_by("-popularity_score", "source_rank", "company")[:10])
        return Response(
            {
                "count": len(top_codes),
                "deals": [serialize_code(code) for code in top_codes],
            }
        )


class AllCodesAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Codes.objects.all().order_by("-popularity_score", "source_rank", "company")

        source = (request.query_params.get("source") or "").strip()
        if source:
            queryset = queryset.filter(source=source)

        channel = (request.query_params.get("channel") or "").strip()
        if channel == "online":
            queryset = queryset.filter(online=True)
        elif channel == "instore":
            queryset = queryset.filter(in_store=True)
        elif channel == "both":
            queryset = queryset.filter(online=True, in_store=True)

        membership = (request.query_params.get("membership") or "").strip()
        if membership == "spc_plus":
            queryset = queryset.filter(is_spc_plus=True)
        elif membership == "standard":
            queryset = queryset.filter(is_spc_plus=False)

        query = (request.query_params.get("q") or "").strip()
        if query:
            queryset = queryset.filter(
                Q(company__icontains=query)
                | Q(title__icontains=query)
                | Q(desc__icontains=query)
                | Q(category__icontains=query)
                | Q(code__icontains=query)
                | Q(in_store_code__icontains=query)
            )

        return Response(
            {
                "count": queryset.count(),
                "deals": [serialize_code(code) for code in queryset],
            }
        )


class RecommendedCodesAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = list(
            Transaction.objects.filter(user=request.user).order_by("-date", "-created_at")[:250]
        )

        scored = []
        for code in Codes.objects.all():
            relevance = score_code_for_transactions(code, transactions)
            if relevance > 0:
                scored.append((relevance, code))

        scored.sort(
            key=lambda item: (item[0], item[1].popularity_score, -item[1].source_rank),
            reverse=True,
        )

        return Response(
            {
                "count": len(scored),
                "deals": [serialize_code(code, relevance_score=score) for score, code in scored],
            }
        )
