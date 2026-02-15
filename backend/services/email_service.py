"""
Email service for sending weekly summary emails.
"""
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from typing import Dict, Optional, List
from datetime import datetime
from pathlib import Path
import time
from jinja2 import Template

from database import get_db
from services.summary_service import get_weekly_summary
from services.chart_service import (
    generate_daily_completion_chart,
    generate_category_chart,
    generate_workout_progression_chart,
    generate_streak_chart
)

logger = logging.getLogger(__name__)


class EmailConfig:
    """Email configuration from environment variables."""

    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.smtp_from_email = os.getenv('SMTP_FROM_EMAIL', 'Activity Tracker <noreply@activitytracker.com>')
        self.smtp_use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        self.app_url = os.getenv('APP_URL', 'http://localhost:5173')

    def is_configured(self) -> bool:
        """Check if SMTP is properly configured."""
        return bool(self.smtp_username and self.smtp_password)


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    images: Optional[Dict[str, bytes]] = None,
    max_retries: int = 3
) -> bool:
    """
    Send an email with optional embedded images.

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        images: Dict of CID -> image bytes for embedding
        max_retries: Maximum number of retry attempts

    Returns:
        True if sent successfully, False otherwise
    """
    config = EmailConfig()

    if not config.is_configured():
        logger.error("SMTP not configured. Check environment variables.")
        return False

    for attempt in range(max_retries):
        try:
            # Create message
            msg = MIMEMultipart('related')
            msg['Subject'] = subject
            msg['From'] = config.smtp_from_email
            msg['To'] = to_email

            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Attach images with CID references
            if images:
                for cid, image_bytes in images.items():
                    image = MIMEImage(image_bytes)
                    image.add_header('Content-ID', f'<{cid}>')
                    msg.attach(image)

            # Send email
            with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
                if config.smtp_use_tls:
                    server.starttls()
                server.login(config.smtp_username, config.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                # Exponential backoff
                time.sleep(2 ** attempt)
            else:
                return False

    return False


def generate_weekly_summary_email(user_id: int) -> Optional[Dict[str, any]]:
    """
    Generate weekly summary email content with charts.

    Args:
        user_id: The user ID

    Returns:
        Dict with 'html', 'subject', 'images' keys, or None if error
    """
    try:
        # Get summary data
        summary_data = get_weekly_summary(user_id)

        # Generate charts
        images = {}

        # Daily completion chart
        if summary_data['daily_breakdown']:
            daily_chart_data = [
                {
                    'date': d['date'],
                    'percentage': d['percentage'],
                    'completed': d.get('completed', 0),
                    'total': d.get('total', 0)
                }
                for d in summary_data['daily_breakdown']
            ]
            images['daily_completion_chart'] = generate_daily_completion_chart(daily_chart_data)

        # Category chart
        if summary_data['category_progress']:
            images['category_chart'] = generate_category_chart(summary_data['category_progress'])

        # Workout chart (if there are workouts)
        if summary_data['workout_summary']['sessions'] > 0:
            # Generate workout progression data (need to fetch from DB)
            workout_progression = get_workout_progression_data(user_id)
            if workout_progression:
                images['workout_chart'] = generate_workout_progression_chart(workout_progression)

        # Load and render template
        template_path = Path(__file__).parent.parent / 'templates' / 'weekly_summary.html'
        with open(template_path, 'r') as f:
            template_content = f.read()

        template = Template(template_content)

        # Add app_url to context
        config = EmailConfig()
        summary_data['app_url'] = config.app_url

        html_content = template.render(**summary_data)

        subject = f"Your Weekly Activity Summary - {summary_data['date_range']}"

        return {
            'html': html_content,
            'subject': subject,
            'images': images
        }

    except Exception as e:
        logger.error(f"Failed to generate weekly summary email for user {user_id}: {e}")
        return None


def get_workout_progression_data(user_id: int, days: int = 30) -> List[Dict]:
    """Get workout progression data for charts."""
    from datetime import date, timedelta

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                DATE(completed_at) as date,
                SUM(total_duration) as total_duration,
                COUNT(*) as session_count
            FROM workout_sessions
            WHERE user_id = ?
                AND completed_at IS NOT NULL
                AND DATE(completed_at) >= ?
                AND DATE(completed_at) <= ?
            GROUP BY DATE(completed_at)
            ORDER BY date
        """, (user_id, start_date.isoformat(), end_date.isoformat()))

        rows = cursor.fetchall()

        return [
            {
                'date': row['date'],
                'duration_minutes': (row['total_duration'] or 0) // 60,
                'session_count': row['session_count']
            }
            for row in rows
        ]


def send_weekly_summary_email(user_id: int) -> bool:
    """
    Send weekly summary email to a user.

    Args:
        user_id: The user ID

    Returns:
        True if sent successfully, False otherwise
    """
    # Get user's email
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT u.email, up.email_address
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id = ?
        """, (user_id,))

        result = cursor.fetchone()

        if not result:
            logger.error(f"User {user_id} not found")
            return False

        # Use preference email if set, otherwise use user email
        to_email = result['email_address'] if result['email_address'] else result['email']

    # Generate email content
    email_data = generate_weekly_summary_email(user_id)

    if not email_data:
        logger.error(f"Failed to generate email content for user {user_id}")
        log_email_send(user_id, 'weekly_summary', False, "Failed to generate content")
        return False

    # Send email
    success = send_email(
        to_email=to_email,
        subject=email_data['subject'],
        html_content=email_data['html'],
        images=email_data['images']
    )

    # Log the result
    log_email_send(user_id, 'weekly_summary', success)

    # Update last_email_sent_at if successful
    if success:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE user_preferences
                SET last_email_sent_at = ?
                WHERE user_id = ?
            """, (datetime.now().isoformat(), user_id))
            conn.commit()

    return success


def send_test_email(user_id: int) -> bool:
    """
    Send a test weekly summary email immediately.

    Args:
        user_id: The user ID

    Returns:
        True if sent successfully, False otherwise
    """
    # Get user's email
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT u.email, up.email_address
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id = ?
        """, (user_id,))

        result = cursor.fetchone()

        if not result:
            logger.error(f"User {user_id} not found")
            return False

        to_email = result['email_address'] if result['email_address'] else result['email']

    # Generate email content
    email_data = generate_weekly_summary_email(user_id)

    if not email_data:
        logger.error(f"Failed to generate test email content for user {user_id}")
        log_email_send(user_id, 'test', False, "Failed to generate content")
        return False

    # Modify subject to indicate it's a test
    test_subject = f"[TEST] {email_data['subject']}"

    # Send email
    success = send_email(
        to_email=to_email,
        subject=test_subject,
        html_content=email_data['html'],
        images=email_data['images']
    )

    # Log the result
    log_email_send(user_id, 'test', success)

    return success


def log_email_send(user_id: int, email_type: str, success: bool, error_message: Optional[str] = None):
    """Log email send attempt to database."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO email_logs (user_id, email_type, status, error_message)
                VALUES (?, ?, ?, ?)
            """, (
                user_id,
                email_type,
                'success' if success else 'failed',
                error_message
            ))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to log email send: {e}")


def test_email_configuration() -> bool:
    """Test SMTP configuration."""
    config = EmailConfig()

    if not config.is_configured():
        logger.error("SMTP not configured")
        return False

    try:
        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10) as server:
            if config.smtp_use_tls:
                server.starttls()
            server.login(config.smtp_username, config.smtp_password)
        logger.info("SMTP configuration test successful")
        return True
    except Exception as e:
        logger.error(f"SMTP configuration test failed: {e}")
        return False
