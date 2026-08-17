import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or "dev-secret-key-change-me-in-production"
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h.strip()]

INSTALLED_APPS = [
	"django.contrib.admin",
	"django.contrib.auth",
	"django.contrib.contenttypes",
	"django.contrib.sessions",
	"django.contrib.messages",
	"django.contrib.staticfiles",
	"corsheaders",
	"rest_framework",
	"drf_spectacular",
	"apps.accounts",
	"apps.analytics",
]

MIDDLEWARE = [
	"corsheaders.middleware.CorsMiddleware",
	"django.middleware.security.SecurityMiddleware",
	"whitenoise.middleware.WhiteNoiseMiddleware",
	"django.middleware.common.CommonMiddleware",
	"django.middleware.csrf.CsrfViewMiddleware",
	"django.contrib.sessions.middleware.SessionMiddleware",
	"django.contrib.auth.middleware.AuthenticationMiddleware",
	"django.contrib.messages.middleware.MessageMiddleware",
	"django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "analytic_api.urls"

TEMPLATES = [
	{
		"BACKEND": "django.template.backends.django.DjangoTemplates",
		"DIRS": [],
		"APP_DIRS": True,
		"OPTIONS": {
			"context_processors": [
				"django.template.context_processors.debug",
				"django.template.context_processors.request",
				"django.contrib.auth.context_processors.auth",
				"django.contrib.messages.context_processors.messages",
			],
		},
	},
]

WSGI_APPLICATION = "analytic_api.wsgi.application"

_database_url = os.getenv("DATABASE_URL")
if _database_url:
	# Render / Supabase / Railway provide DATABASE_URL directly
	import urllib.parse as _up
	_u = _up.urlparse(_database_url)
	DATABASES = {
		"default": {
			"ENGINE": "django.db.backends.postgresql",
			"NAME": _u.path.lstrip("/"),
			"USER": _u.username,
			"PASSWORD": _u.password,
			"HOST": _u.hostname,
			"PORT": _u.port or 5432,
			"OPTIONS": {"sslmode": "require"},
		}
	}
elif os.getenv("DB_VENDOR", "sqlite").lower() == "postgres":
	DATABASES = {
		"default": {
			"ENGINE": "django.db.backends.postgresql",
			"NAME": os.getenv("POSTGRES_DB", "analytics_db"),
			"USER": os.getenv("POSTGRES_USER", "analytics_user"),
			"PASSWORD": os.getenv("POSTGRES_PASSWORD", "analytics_password"),
			"HOST": os.getenv("POSTGRES_HOST", "localhost"),
			"PORT": os.getenv("POSTGRES_PORT", "5432"),
		}
	}
else:
	DATABASES = {
		"default": {
			"ENGINE": "django.db.backends.sqlite3",
			"NAME": BASE_DIR / "db.sqlite3",
		}
	}

redis_url = os.getenv("REDIS_URL")
if redis_url:
	CACHES = {
		"default": {
			"BACKEND": "django_redis.cache.RedisCache",
			"LOCATION": redis_url,
			"OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
			"KEY_PREFIX": "analytics",
		}
	}
	CELERY_BROKER_URL = redis_url
	CELERY_RESULT_BACKEND = redis_url
else:
	CACHES = {
		"default": {
			"BACKEND": "django.core.cache.backends.locmem.LocMemCache",
			"LOCATION": "analytics-local",
		}
	}
	# No Redis: run Celery tasks synchronously in the same process
	CELERY_TASK_ALWAYS_EAGER = True
	CELERY_BROKER_URL = "memory://"
	CELERY_RESULT_BACKEND = "cache+memory://"

SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"

AUTH_PASSWORD_VALIDATORS = [
	{"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
	{"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
	{"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
	{"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "true").lower() == "true"

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    *[o.strip() for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()],
]

from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-api-key",
]

REST_FRAMEWORK = {
	"DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
	"DEFAULT_AUTHENTICATION_CLASSES": [
		"rest_framework.authentication.SessionAuthentication",
		"rest_framework.authentication.BasicAuthentication",
	],
	"DEFAULT_THROTTLE_CLASSES": [
		"rest_framework.throttling.UserRateThrottle",
		"rest_framework.throttling.AnonRateThrottle",
	],
	"DEFAULT_THROTTLE_RATES": {
		"user": os.getenv("USER_THROTTLE_RATE", "1000/day"),
		"anon": os.getenv("ANON_THROTTLE_RATE", "500/day"),
		"collect": os.getenv("COLLECT_THROTTLE_RATE", "60/second"),
		"analytics": os.getenv("ANALYTICS_THROTTLE_RATE", "20/second"),
	},
}

SPECTACULAR_SETTINGS = {
	"TITLE": "Website Analytics API",
	"DESCRIPTION": "Scalable analytics ingestion and aggregation API.",
	"VERSION": "1.0.0",
	"SERVE_INCLUDE_SCHEMA": False,
}

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"

# Simple flag for Google auth integration placeholder
ENABLE_GOOGLE_AUTH = os.getenv("ENABLE_GOOGLE_AUTH", "false").lower() == "true"


