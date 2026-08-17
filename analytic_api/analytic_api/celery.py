import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "analytic_api.settings")

app = Celery("analytic_api")

# Pull all CELERY_* keys from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.py in every INSTALLED_APP
app.autodiscover_tasks()
