import logging
from datetime import datetime

from celery import shared_task
from django.utils.timezone import is_naive, make_aware

logger = logging.getLogger(__name__)


@shared_task(name="ingest_event_task")
def ingest_event_task(app_id: int, event_data: dict) -> None:
    """Persist a validated analytics event to the database.

    Runs inside the Celery worker — never blocks the web process.
    Skips silently on duplicate (same app + event + timestamp + user_id).
    """
    from apps.accounts.models import ClientApp
    from apps.analytics.models import Event

    logger.info(
        "ingest_event_task received: app_id=%s event=%s",
        app_id,
        event_data.get("event"),
    )

    # --- resolve app --------------------------------------------------------
    try:
        app = ClientApp.objects.get(id=app_id)
    except ClientApp.DoesNotExist:
        logger.error(
            "ingest_event_task: ClientApp id=%s not found, dropping event", app_id
        )
        return

    # --- parse timestamp ----------------------------------------------------
    timestamp_raw = event_data.get("timestamp")
    try:
        timestamp = datetime.fromisoformat(timestamp_raw)
        if is_naive(timestamp):
            timestamp = make_aware(timestamp)
    except (TypeError, ValueError) as exc:
        logger.error(
            "ingest_event_task: invalid timestamp %r — %s", timestamp_raw, exc
        )
        return

    # --- idempotency guard --------------------------------------------------
    event_name = event_data.get("event", "")
    user_id = event_data.get("user_id", "")

    if Event.objects.filter(
        app=app,
        event=event_name,
        timestamp=timestamp,
        user_id=user_id,
    ).exists():
        logger.info(
            "ingest_event_task: duplicate skipped (app=%s event=%s ts=%s user=%s)",
            app_id, event_name, timestamp, user_id,
        )
        return

    # --- write --------------------------------------------------------------
    try:
        Event.objects.create(
            app=app,
            event=event_name,
            url=event_data.get("url", ""),
            referrer=event_data.get("referrer", ""),
            device=event_data.get("device", ""),
            ip_address=event_data.get("ip_address"),
            timestamp=timestamp,
            metadata=event_data.get("metadata", {}),
            user_id=user_id,
        )
        logger.info(
            "ingest_event_task: event created (app=%s event=%s)", app_id, event_name
        )
    except Exception as exc:
        logger.error(
            "ingest_event_task: DB write failed — %s", exc, exc_info=True
        )
        raise
