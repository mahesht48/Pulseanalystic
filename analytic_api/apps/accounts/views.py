from datetime import timedelta
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from .models import ClientApp
from .serializers import ClientAppSerializer, RegisterAppSerializer, RevokeSerializer, RegenerateSerializer


class SignupView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		username = request.data.get("username", "").strip()
		email = request.data.get("email", "").strip()
		password = request.data.get("password", "")
		if not username or not password:
			return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)
		if User.objects.filter(username=username).exists():
			return Response({"detail": "Username already taken."}, status=status.HTTP_400_BAD_REQUEST)
		user = User.objects.create_user(username=username, email=email, password=password)
		login(request, user)
		return Response({"id": user.id, "username": user.username, "email": user.email}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		username = request.data.get("username", "")
		password = request.data.get("password", "")
		user = authenticate(request, username=username, password=password)
		if user is None:
			return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
		login(request, user)
		return Response({"id": user.id, "username": user.username, "email": user.email})


class LogoutView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request):
		logout(request)
		return Response({"detail": "Logged out."})


class MeView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@method_decorator(ensure_csrf_cookie)
	def get(self, request):
		return Response({"id": request.user.id, "username": request.user.username, "email": request.user.email})


class AppListCreateView(APIView):
	"""GET /api/apps/  — list apps; POST /api/apps/ — create app."""
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		apps = ClientApp.objects.filter(owner=request.user, is_revoked=False)
		return Response(ClientAppSerializer(apps, many=True).data)

	def post(self, request):
		serializer = RegisterAppSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		expires_at = None
		if data.get("expires_in_days"):
			expires_at = timezone.now() + timedelta(days=data["expires_in_days"])
		app = ClientApp.objects.create(
			owner=request.user,
			name=data["name"],
			scope=data.get("scope", "write"),
			expires_at=expires_at,
		)
		return Response(ClientAppSerializer(app).data, status=status.HTTP_201_CREATED)


class AppDetailView(APIView):
	"""DELETE /api/apps/{id}/ — delete app."""
	permission_classes = [permissions.IsAuthenticated]

	def delete(self, request, pk):
		try:
			app = ClientApp.objects.get(pk=pk, owner=request.user)
		except ClientApp.DoesNotExist:
			return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
		app.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class AppRegenerateKeyView(APIView):
	"""POST /api/apps/{id}/regenerate-key/ — issue a new API key."""
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, pk):
		try:
			app = ClientApp.objects.get(pk=pk, owner=request.user)
		except ClientApp.DoesNotExist:
			return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
		app.regenerate_api_key()
		return Response(ClientAppSerializer(app).data)


class RegisterView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=RegisterAppSerializer,
		responses=ClientAppSerializer,
		description="Register a new client application and issue an API key.",
	)
	def post(self, request):
		serializer = RegisterAppSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		name = serializer.validated_data["name"]
		expires_in_days = serializer.validated_data.get("expires_in_days")
		expires_at = None
		if expires_in_days:
			expires_at = timezone.now() + timedelta(days=expires_in_days)
		scope = serializer.validated_data.get("scope", "write")
		app = ClientApp.objects.create(owner=request.user, name=name, scope=scope, expires_at=expires_at)
		return Response(ClientAppSerializer(app).data, status=status.HTTP_201_CREATED)


class ApiKeyView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		responses=ClientAppSerializer(many=True),
		description="List active API keys for the authenticated user.",
	)
	def get(self, request):
		apps = ClientApp.objects.filter(owner=request.user, is_revoked=False)
		return Response(ClientAppSerializer(apps, many=True).data)


class RevokeView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=RevokeSerializer,
		responses={200: {"type": "object", "properties": {"detail": {"type": "string"}}}},
		description="Revoke the specified API key.",
	)
	def post(self, request):
		serializer = RevokeSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		app_id = serializer.validated_data["app_id"]
		try:
			app = ClientApp.objects.get(id=app_id, owner=request.user)
		except ClientApp.DoesNotExist:
			return Response({"detail": "App not found."}, status=status.HTTP_404_NOT_FOUND)
		app.is_revoked = True
		app.save(update_fields=["is_revoked", "updated_at"])
		return Response({"detail": "API key revoked."})


class RegenerateView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=RegenerateSerializer,
		responses=ClientAppSerializer,
		description="Regenerate a new API key for the specified application.",
	)
	def post(self, request):
		serializer = RegenerateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		app_id = serializer.validated_data["app_id"]
		try:
			app = ClientApp.objects.get(id=app_id, owner=request.user)
		except ClientApp.DoesNotExist:
			return Response({"detail": "App not found."}, status=status.HTTP_404_NOT_FOUND)
		app.regenerate_api_key()
		return Response(ClientAppSerializer(app).data)


