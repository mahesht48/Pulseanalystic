from rest_framework import serializers
from .models import Event


class EventSerializer(serializers.ModelSerializer):
	class Meta:
		model = Event
		fields = [
			"id",
			"event",
			"url",
			"referrer",
			"device",
			"ip_address",
			"timestamp",
			"metadata",
			"user_id",
		]
		read_only_fields = ["id"]


class EventSummaryQuerySerializer(serializers.Serializer):
	event = serializers.CharField()
	startDate = serializers.DateField(required=False)
	endDate = serializers.DateField(required=False)
	app_id = serializers.IntegerField(required=False)


class UserStatsQuerySerializer(serializers.Serializer):
	userId = serializers.CharField()


class ExportQuerySerializer(serializers.Serializer):
	event = serializers.CharField(required=False)
	startDate = serializers.DateField(required=False)
	endDate = serializers.DateField(required=False)


class TopReferrersQuerySerializer(serializers.Serializer):
	limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=100)


class TopPagesQuerySerializer(serializers.Serializer):
	startDate = serializers.DateField(required=False)
	endDate = serializers.DateField(required=False)
	limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=100)


class TimeSeriesQuerySerializer(serializers.Serializer):
	INTERVAL_CHOICES = ["hour", "day", "week", "month"]

	event = serializers.CharField(required=False)
	interval = serializers.ChoiceField(choices=INTERVAL_CHOICES)
	startDate = serializers.DateField()
	endDate = serializers.DateField()
	app_id = serializers.IntegerField(required=False)

	def validate(self, attrs):
		if attrs["startDate"] > attrs["endDate"]:
			raise serializers.ValidationError("startDate must be before endDate.")
		return attrs


