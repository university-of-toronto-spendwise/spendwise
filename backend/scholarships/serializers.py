from rest_framework import serializers
from .models import Scholarship, SavedScholarship


class ScholarshipListSerializer(serializers.ModelSerializer):
    citizenship = serializers.SerializerMethodField()
    nature = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Scholarship
        fields = [
            "id",
            "source",
            "title",
            "offered_by",
            "url",
            "award_type",
            "citizenship",
            "nature",
            "application_required",
            "application_url",
            "amount_text",
            "amount_min",
            "amount_max",
            "amount",
            "deadline",
            "created_at",
            "updated_at",
        ]

    def get_citizenship(self, obj):
        vals = []
        if obj.open_to_domestic:
            vals.append("Domestic")
        if obj.open_to_international:
            vals.append("International")
        return vals

    def get_nature(self, obj):
        nature_map = {
            "academic_merit": obj.nature_academic_merit,
            "athletic_performance": obj.nature_athletic_performance,
            "community": obj.nature_community,
            "financial_need": obj.nature_financial_need,
            "leadership": obj.nature_leadership,
            "indigenous": obj.nature_indigenous,
            "black_students": obj.nature_black_students,
            "extracurriculars": obj.nature_extracurriculars,
            "other": obj.nature_other,
        }
        return [k for k, v in nature_map.items() if v]

    def get_amount(self, obj):
        # Useful single number for sorting (best-effort)
        return obj.amount_max or obj.amount_min or 0


class ScholarshipDetailSerializer(serializers.ModelSerializer):
    citizenship = serializers.SerializerMethodField()
    nature = serializers.SerializerMethodField()

    class Meta:
        model = Scholarship
        fields = "__all__"

    def get_citizenship(self, obj):
        vals = []
        if obj.open_to_domestic:
            vals.append("Domestic")
        if obj.open_to_international:
            vals.append("International")
        return vals

    def get_nature(self, obj):
        nature_map = {
            "academic_merit": obj.nature_academic_merit,
            "athletic_performance": obj.nature_athletic_performance,
            "community": obj.nature_community,
            "financial_need": obj.nature_financial_need,
            "leadership": obj.nature_leadership,
            "indigenous": obj.nature_indigenous,
            "black_students": obj.nature_black_students,
            "extracurriculars": obj.nature_extracurriculars,
            "other": obj.nature_other,
        }
        return [k for k, v in nature_map.items() if v]


class MatchRequestSerializer(serializers.Serializer):
    faculty = serializers.CharField(required=False, allow_blank=True)
    major = serializers.CharField(required=False, allow_blank=True)
    year = serializers.IntegerField(required=False)
    degree_type = serializers.CharField(required=False, allow_blank=True)
    citizenship = serializers.CharField(required=False, allow_blank=True)
    campus = serializers.CharField(required=False, allow_blank=True)


class SavedScholarshipSerializer(serializers.ModelSerializer):
    scholarship = ScholarshipListSerializer(read_only=True)

    class Meta:
        model = SavedScholarship
        fields = ["id", "scholarship", "status", "saved_at"]