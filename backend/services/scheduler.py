"""
Scheduler service for sending weekly email summaries.
Uses APScheduler to send emails every Sunday at 8 PM.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

from database import get_db
from services.email_service import send_weekly_summary_email

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


def send_weekly_emails():
    """
    Job function to send weekly summary emails to all users with the feature enabled.
    This runs every Sunday at 8 PM.
    """
    logger.info("Starting weekly email job")

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get all users with weekly emails enabled
            cursor.execute("""
                SELECT u.id, u.email, up.email_address
                FROM users u
                INNER JOIN user_preferences up ON u.id = up.user_id
                WHERE up.enable_weekly_email = 1
            """)

            users = cursor.fetchall()

            logger.info(f"Found {len(users)} users with weekly emails enabled")

            success_count = 0
            failure_count = 0

            for user in users:
                try:
                    logger.info(f"Sending weekly email to user {user['id']}")
                    success = send_weekly_summary_email(user['id'])

                    if success:
                        success_count += 1
                        logger.info(f"Successfully sent email to user {user['id']}")
                    else:
                        failure_count += 1
                        logger.error(f"Failed to send email to user {user['id']}")

                except Exception as e:
                    failure_count += 1
                    logger.error(f"Error sending email to user {user['id']}: {e}")

            logger.info(f"Weekly email job completed: {success_count} successful, {failure_count} failed")

    except Exception as e:
        logger.error(f"Error in weekly email job: {e}")


def start_scheduler():
    """Start the background scheduler."""
    global scheduler

    if scheduler is not None:
        logger.warning("Scheduler already started")
        return

    logger.info("Starting email scheduler")

    scheduler = BackgroundScheduler()

    # Schedule job for every Sunday at 8 PM (20:00)
    trigger = CronTrigger(
        day_of_week='sun',  # Sunday
        hour=20,            # 8 PM
        minute=0,
        second=0
    )

    scheduler.add_job(
        send_weekly_emails,
        trigger=trigger,
        id='weekly_email_job',
        name='Send Weekly Summary Emails',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Email scheduler started successfully")
    logger.info("Weekly emails will be sent every Sunday at 8:00 PM")


def stop_scheduler():
    """Stop the background scheduler."""
    global scheduler

    if scheduler is None:
        logger.warning("Scheduler not running")
        return

    logger.info("Stopping email scheduler")
    scheduler.shutdown(wait=True)
    scheduler = None
    logger.info("Email scheduler stopped")


def get_scheduler_status():
    """Get the current status of the scheduler."""
    if scheduler is None:
        return {
            'running': False,
            'jobs': []
        }

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None
        })

    return {
        'running': True,
        'jobs': jobs
    }


def trigger_weekly_emails_now():
    """
    Manually trigger the weekly email job (for testing).
    This runs the job immediately instead of waiting for the scheduled time.
    """
    logger.info("Manually triggering weekly email job")
    send_weekly_emails()
