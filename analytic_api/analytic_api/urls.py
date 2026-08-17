from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.analytics.health import HealthCheckView
from apps.accounts.views import AppListCreateView, AppDetailView, AppRegenerateKeyView

urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
	path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
	path("api/health/", HealthCheckView.as_view(), name="health-check"),
	path("api/auth/", include("apps.accounts.urls")),
	path("api/analytics/", include("apps.analytics.urls")),
	path("api/apps/", AppListCreateView.as_view()),
	path("api/apps/<int:pk>/", AppDetailView.as_view()),
	path("api/apps/<int:pk>/regenerate-key/", AppRegenerateKeyView.as_view()),
]


