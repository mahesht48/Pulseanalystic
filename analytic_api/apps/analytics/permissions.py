from rest_framework.permissions import BasePermission


class HasWriteApiKey(BasePermission):
	message = "A write-scoped API key is required."

	def has_permission(self, request, _view):
		return hasattr(request, "client_app") and request.client_app.scope == "write"


class HasReadApiKey(BasePermission):
	message = "A read-scoped API key is required."

	def has_permission(self, request, _view):
		return hasattr(request, "client_app") and request.client_app.scope == "read"
