from rest_framework import serializers
from .models import ClientApp


class ClientAppSerializer(serializers.ModelSerializer):
	api_key = serializers.SerializerMethodField()

	def get_api_key(self, obj):
		# Present only immediately after creation or regeneration; null on all other reads
		return getattr(obj, "_raw_key", None)

	class Meta:
		model = ClientApp
		fields = ["id", "name", "api_key", "scope", "is_revoked", "expires_at", "created_at", "updated_at"]
		read_only_fields = ["id", "created_at", "updated_at"]


class RegisterAppSerializer(serializers.Serializer):
	name = serializers.CharField(max_length=255)
	scope = serializers.ChoiceField(choices=["read", "write"], default="write")
	expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=365)


class RevokeSerializer(serializers.Serializer):
	app_id = serializers.IntegerField()


class RegenerateSerializer(serializers.Serializer):
	app_id = serializers.IntegerField()


