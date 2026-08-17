from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from apps.accounts.models import ClientApp, hash_api_key


class ApiKeyAuthentication(BaseAuthentication):
	keyword = "X-API-KEY"

	def authenticate(self, request):
		raw_key = request.headers.get(self.keyword)
		if not raw_key:
			return None
		try:
			app = ClientApp.objects.get(api_key=hash_api_key(raw_key))
		except ClientApp.DoesNotExist:
			raise exceptions.AuthenticationFailed("Invalid API key.")
		if not app.is_active():
			raise exceptions.AuthenticationFailed("API key inactive.")
		request.client_app = app
		return (None, None)


