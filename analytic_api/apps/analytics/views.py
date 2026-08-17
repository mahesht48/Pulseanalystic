import csv
from datetime import datetime, timedelta
from django.db.models import Count
from django.db.models.functions import TruncHour, TruncDay, TruncWeek, TruncMonth
from django.http import StreamingHttpResponse
from django.utils.dateparse import parse_datetime
from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import Event
from .serializers import EventSerializer, EventSummaryQuerySerializer, UserStatsQuerySerializer, TimeSeriesQuerySerializer, TopPagesQuerySerializer, TopReferrersQuerySerializer, ExportQuerySerializer
from .auth import ApiKeyAuthentication
from .permissions import HasWriteApiKey, HasReadApiKey
from .tasks import ingest_event_task
from .throttles import CollectThrottle, AnalyticsThrottle


class _Echo:
	"""csv.writer adapter that returns each written value instead of buffering."""
	def write(self, value):
		return value


def _stream_events(queryset):
	writer = csv.writer(_Echo())
	yield writer.writerow(["id", "event", "url", "referrer", "device", "ip_address", "timestamp", "user_id"])
	for row in queryset.iterator(chunk_size=500):
		yield writer.writerow([
			row[0], row[1], row[2], row[3], row[4], row[5],
			row[6].isoformat() if row[6] else "",
			row[7],
		])


class CollectEventView(APIView):
	authentication_classes = [ApiKeyAuthentication]
	permission_classes = [HasWriteApiKey]
	throttle_classes = [CollectThrottle]

	@extend_schema(
		parameters=[
			OpenApiParameter(
				name="X-API-KEY",
				required=True,
				type=OpenApiTypes.STR,
				location=OpenApiParameter.HEADER,
				description="API key generated via /api/auth/register.",
			)
		],
		request=EventSerializer,
		responses={202: {"type": "object", "properties": {"status": {"type": "string"}}}},
		description="Collect an analytics event. Validated immediately; DB write is async.",
	)
	def post(self, request):
		data = request.data.copy()
		if "timestamp" in data and isinstance(data["timestamp"], str):
			try:
				ts = parse_datetime(data["timestamp"])
				if ts is None:
					return Response({"detail": "Invalid timestamp."}, status=status.HTTP_400_BAD_REQUEST)
				data["timestamp"] = ts
			except Exception:
				return Response({"detail": "Invalid timestamp."}, status=status.HTTP_400_BAD_REQUEST)
		else:
			data["timestamp"] = datetime.utcnow()
		if not data.get("ip_address"):
			data["ip_address"] = request.META.get("REMOTE_ADDR")

		serializer = EventSerializer(data=data)
		serializer.is_valid(raise_exception=True)

		# Convert datetime → ISO string so Celery can JSON-serialise the payload
		event_data = dict(serializer.validated_data)
		event_data["timestamp"] = event_data["timestamp"].isoformat()

		ingest_event_task.delay(request.client_app.id, event_data)
		return Response({"status": "queued"}, status=status.HTTP_202_ACCEPTED)


class EventSummaryView(APIView):
	permission_classes = [permissions.IsAuthenticated]
	throttle_classes = [AnalyticsThrottle]

	@extend_schema(
		parameters=[
			OpenApiParameter("event", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Event name", required=True),
			OpenApiParameter("startDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, description="Start date filter"),
			OpenApiParameter("endDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, description="End date filter"),
			OpenApiParameter("app_id", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Specific app id"),
		],
		responses={
			200: OpenApiTypes.OBJECT,
		},
		description="Retrieve aggregated stats for an event.",
	)
	def get(self, request):
		query_serializer = EventSummaryQuerySerializer(data=request.query_params)
		query_serializer.is_valid(raise_exception=True)
		event = query_serializer.validated_data["event"]
		start_date = query_serializer.validated_data.get("startDate")
		end_date = query_serializer.validated_data.get("endDate")
		app_id = query_serializer.validated_data.get("app_id")

		# Cache key
		cache_key = f"event-summary:{request.user.id}:{event}:{start_date}:{end_date}:{app_id}"
		cached = cache.get(cache_key)
		if cached:
			return Response(cached)

		qs = Event.objects.filter(event=event, app__owner=request.user)
		if app_id:
			qs = qs.filter(app_id=app_id)
		if start_date:
			qs = qs.filter(timestamp__date__gte=start_date)
		if end_date:
			qs = qs.filter(timestamp__date__lte=end_date)

		count = qs.count()
		unique_users = qs.exclude(user_id="").values("user_id").distinct().count()
		device_counts = qs.values("device").annotate(c=Count("id"))
		device_data = {row["device"] or "unknown": row["c"] for row in device_counts}

		resp = {
			"event": event,
			"count": count,
			"uniqueUsers": unique_users,
			"deviceData": device_data,
		}
		cache.set(cache_key, resp, timeout=60)  # cache for 60s
		return Response(resp)


class UserStatsView(APIView):
	permission_classes = [permissions.IsAuthenticated]
	throttle_classes = [AnalyticsThrottle]

	@extend_schema(
		parameters=[
			OpenApiParameter("userId", OpenApiTypes.STR, OpenApiParameter.QUERY, description="User identifier", required=True),
		],
		responses={
			200: OpenApiTypes.OBJECT,
		},
		description="Fetch per-user stats such as total events and latest device info.",
	)
	def get(self, request):
		query_serializer = UserStatsQuerySerializer(data=request.query_params)
		query_serializer.is_valid(raise_exception=True)
		user_id = query_serializer.validated_data["userId"]
		cache_key = f"user-stats:{request.user.id}:{user_id}"
		cached = cache.get(cache_key)
		if cached:
			return Response(cached)

		qs = Event.objects.filter(app__owner=request.user, user_id=user_id)
		total = qs.count()
		latest = qs.order_by("-timestamp").first()
		device_details = {}
		ip_address = None
		if latest:
			md = latest.metadata or {}
			device_details = {
				"browser": md.get("browser"),
				"os": md.get("os"),
			}
			ip_address = latest.ip_address
		resp = {
			"userId": user_id,
			"totalEvents": total,
			"deviceDetails": device_details,
			"ipAddress": ip_address,
		}
		cache.set(cache_key, resp, timeout=60)
		return Response(resp)


class ExportView(APIView):
	permission_classes = [permissions.IsAuthenticated]
	throttle_classes = [AnalyticsThrottle]

	@extend_schema(
		parameters=[
			OpenApiParameter("event", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Event name filter"),
			OpenApiParameter("startDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, description="Start date filter"),
			OpenApiParameter("endDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, description="End date filter"),
		],
		responses={200: {"type": "string", "format": "binary"}},
		description="Stream analytics events as a CSV download.",
	)
	def get(self, request):
		qs_serializer = ExportQuerySerializer(data=request.query_params)
		qs_serializer.is_valid(raise_exception=True)
		params = qs_serializer.validated_data

		qs = (
			Event.objects.filter(app__owner=request.user)
			.order_by("timestamp")
			.values_list("id", "event", "url", "referrer", "device", "ip_address", "timestamp", "user_id")
		)
		if params.get("event"):
			qs = qs.filter(event=params["event"])
		if params.get("startDate"):
			qs = qs.filter(timestamp__date__gte=params["startDate"])
		if params.get("endDate"):
			qs = qs.filter(timestamp__date__lte=params["endDate"])

		response = StreamingHttpResponse(_stream_events(qs), content_type="text/csv")
		response["Content-Disposition"] = 'attachment; filename="analytics_export.csv"'
		return response


class TopReferrersView(APIView):
	permission_classes = [permissions.IsAuthenticated]
	throttle_classes = [AnalyticsThrottle]

	@extend_schema(
		parameters=[
			OpenApiParameter("limit", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Max results (default 10, max 100)"),
		],
		responses={200: OpenApiTypes.OBJECT},
		description="Return top referrers ranked by event count.",
	)
	def get(self, request):
		qs_serializer = TopReferrersQuerySerializer(data=request.query_params)
		qs_serializer.is_valid(raise_exception=True)
		limit = qs_serializer.validated_data["limit"]

		cache_key = f"top-referrers:{request.user.id}:{limit}"
		cached = cache.get(cache_key)
		if cached is not None:
			return Response(cached)

		data = list(
			Event.objects.filter(app__owner=request.user)
			.exclude(referrer="")
			.values("referrer")
			.annotate(count=Count("id"))
			.order_by("-count")[:limit]
		)

		cache.set(cache_key, data, timeout=60)
		return Response(data)


class TopPagesView(APIView):
	permission_classes = [permissions.IsAuthenticated]
	throttle_classes = [AnalyticsThrottle]

	@extend_schema(
		parameters=[
			OpenApiParameter("startDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, description="Start date filter"),
			OpenApiParameter("endDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, description="End date filter"),
			OpenApiParameter("limit", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Max results (default 10, max 100)"),
		],
		responses={200: OpenApiTypes.OBJECT},
		description="Return top pages ranked by view count.",
	)
	def get(self, request):
		qs_serializer = TopPagesQuerySerializer(data=request.query_params)
		qs_serializer.is_valid(raise_exception=True)
		params = qs_serializer.validated_data

		start_date = params.get("startDate")
		end_date = params.get("endDate")
		limit = params["limit"]

		cache_key = f"top-pages:{request.user.id}:{start_date}:{end_date}:{limit}"
		cached = cache.get(cache_key)
		if cached is not None:
			return Response(cached)

		qs = Event.objects.filter(app__owner=request.user).exclude(url="")
		if start_date:
			qs = qs.filter(timestamp__date__gte=start_date)
		if end_date:
			qs = qs.filter(timestamp__date__lte=end_date)

		data = list(
			qs.values("url")
			.annotate(views=Count("id"), unique_users=Count("user_id", distinct=True))
			.order_by("-views")[:limit]
		)

		cache.set(cache_key, data, timeout=60)
		return Response(data)


class TimeSeriesView(APIView):
	permission_classes = [permissions.IsAuthenticated]
	throttle_classes = [AnalyticsThrottle]

	_TRUNC_MAP = {
		"hour": TruncHour,
		"day": TruncDay,
		"week": TruncWeek,
		"month": TruncMonth,
	}
	_FMT_MAP = {
		"hour": lambda dt: dt.strftime("%Y-%m-%dT%H:00:00"),
		"day": lambda dt: dt.strftime("%Y-%m-%d"),
		"week": lambda dt: dt.strftime("%Y-%m-%d"),
		"month": lambda dt: dt.strftime("%Y-%m"),
	}

	@extend_schema(
		parameters=[
			OpenApiParameter("event", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Event name filter"),
			OpenApiParameter("interval", OpenApiTypes.STR, OpenApiParameter.QUERY, required=True, description="hour | day | week | month"),
			OpenApiParameter("startDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True, description="Start date (ISO)"),
			OpenApiParameter("endDate", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True, description="End date (ISO)"),
			OpenApiParameter("app_id", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Filter by app id"),
		],
		responses={200: OpenApiTypes.OBJECT},
		description="Return event counts grouped by time interval.",
	)
	def get(self, request):
		qs_serializer = TimeSeriesQuerySerializer(data=request.query_params)
		qs_serializer.is_valid(raise_exception=True)
		params = qs_serializer.validated_data

		event = params.get("event")
		interval = params["interval"]
		start_date = params["startDate"]
		end_date = params["endDate"]
		app_id = params.get("app_id")

		cache_key = f"time-series:{request.user.id}:{event}:{interval}:{start_date}:{end_date}:{app_id}"
		cached = cache.get(cache_key)
		if cached is not None:
			return Response(cached)

		qs = Event.objects.filter(
			app__owner=request.user,
			timestamp__date__gte=start_date,
			timestamp__date__lte=end_date,
		)
		if event:
			qs = qs.filter(event=event)
		if app_id:
			qs = qs.filter(app_id=app_id)

		trunc_fn = self._TRUNC_MAP[interval]
		fmt = self._FMT_MAP[interval]

		rows = (
			qs.annotate(period=trunc_fn("timestamp"))
			.values("period")
			.annotate(count=Count("id"), unique_users=Count("user_id", distinct=True))
			.order_by("period")
		)

		data = [
			{"date": fmt(row["period"]), "count": row["count"], "unique_users": row["unique_users"]}
			for row in rows
		]

		cache.set(cache_key, data, timeout=120)
		return Response(data)


