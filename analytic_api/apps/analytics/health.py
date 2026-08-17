from django.db import connection
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema


class HealthCheckView(APIView):
	permission_classes = [AllowAny]
	authentication_classes = []

	@extend_schema(
		responses={200: {"type": "object"}},
		description="System health check. No authentication required.",
	)
	def get(self, request):
		db_status = "ok"
		cache_status = "ok"

		try:
			connection.ensure_connection()
		except Exception:
			db_status = "error"

		try:
			cache.set("health_check", "1", timeout=5)
			if cache.get("health_check") != "1":
				cache_status = "error"
		except Exception:
			cache_status = "error"

		overall = "ok" if db_status == "ok" and cache_status == "ok" else "degraded"

		return Response({
			"status": overall,
			"database": db_status,
			"cache": cache_status,
		})
