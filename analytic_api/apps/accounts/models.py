import hashlib
import secrets
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


def hash_api_key(raw: str) -> str:
	return hashlib.sha256(raw.encode()).hexdigest()


class ClientApp(models.Model):
	SCOPE_READ = "read"
	SCOPE_WRITE = "write"
	SCOPE_CHOICES = [(SCOPE_READ, "Read"), (SCOPE_WRITE, "Write")]

	owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="client_apps")
	name = models.CharField(max_length=255)
	api_key = models.CharField(max_length=64, unique=True, db_index=True)  # stores sha256 hex
	scope = models.CharField(max_length=5, choices=SCOPE_CHOICES, default=SCOPE_WRITE)
	is_revoked = models.BooleanField(default=False)
	expires_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def save(self, *args, **kwargs):
		if not self.api_key:
			raw = secrets.token_hex(32)
			self._raw_key = raw
			self.api_key = hash_api_key(raw)
		super().save(*args, **kwargs)

	def is_active(self) -> bool:
		if self.is_revoked:
			return False
		if self.expires_at and timezone.now() > self.expires_at:
			return False
		return True

	def regenerate_api_key(self):
		raw = secrets.token_hex(32)
		self._raw_key = raw
		self.api_key = hash_api_key(raw)
		self.save(update_fields=["api_key", "updated_at"])


