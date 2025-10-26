import os
from celery import Celery

CELERY_BROKER = os.getenv("CELERY_BROKER", "redis://redis:6379/0")

# Initialize Celery app
celery_app = Celery(
    'mgnrega_tasks',
    broker=CELERY_BROKER,
    backend=CELERY_BROKER,
    include=['app.tasks']
)

# Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    broker_connection_retry_on_startup=True,
    result_expires=3600,  # 1 hour
)

# Periodic tasks for auto-refresh
celery_app.conf.beat_schedule = {
    'refresh-all-districts-monthly': {
        'task': 'app.tasks.refresh_all_districts',
        'schedule': 86400.0,  # Once per day
    },
}