from django.urls import path
from .views import CollectEventView, EventSummaryView, UserStatsView, TimeSeriesView, TopPagesView, TopReferrersView, ExportView

urlpatterns = [
	path("collect", CollectEventView.as_view()),
	path("event-summary", EventSummaryView.as_view()),
	path("time-series", TimeSeriesView.as_view()),
	path("top-pages", TopPagesView.as_view()),
	path("top-referrers", TopReferrersView.as_view()),
	path("user-stats", UserStatsView.as_view()),
	path("export", ExportView.as_view()),
]


