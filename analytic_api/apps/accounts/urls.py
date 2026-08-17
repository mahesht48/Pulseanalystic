from django.urls import path
from .views import RegisterView, ApiKeyView, RevokeView, RegenerateView, SignupView, LoginView, LogoutView, MeView

urlpatterns = [
	path("signup", SignupView.as_view()),
	path("login", LoginView.as_view()),
	path("logout", LogoutView.as_view()),
	path("me", MeView.as_view()),
	path("register", RegisterView.as_view()),
	path("api-key", ApiKeyView.as_view()),
	path("revoke", RevokeView.as_view()),
	path("regenerate", RegenerateView.as_view()),
]


