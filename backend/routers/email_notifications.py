"""
Email notifications router for managing weekly summary emails.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import Dict

from database import get_db
from models import User, UserPreferences, UserPreferencesUpdate
from auth.middleware import get_current_user
from services.email_service import send_test_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email-notifications", tags=["email-notifications"])

# Rate limiting for test emails (simple in-memory store)
_last_test_email_sent = {}


@router.get("/preferences")
def get_email_preferences(current_user: User = Depends(get_current_user)) -> Dict:
    """Get email notification preferences for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                enable_weekly_email,
                email_address,
                last_email_sent_at
            FROM user_preferences
            WHERE user_id = ?
        """, (current_user.id,))

        result = cursor.fetchone()

        if not result:
            # Return defaults if preferences don't exist
            return {
                'enable_weekly_email': False,
                'email_address': None,
                'last_email_sent_at': None
            }

        return {
            'enable_weekly_email': bool(result['enable_weekly_email']),
            'email_address': result['email_address'],
            'last_email_sent_at': result['last_email_sent_at']
        }


@router.put("/preferences")
def update_email_preferences(
    preferences: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Update email notification preferences."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []

        if preferences.enable_weekly_email is not None:
            update_fields.append("enable_weekly_email = ?")
            update_values.append(1 if preferences.enable_weekly_email else 0)

        if preferences.email_address is not None:
            update_fields.append("email_address = ?")
            # Empty string becomes None
            email_value = preferences.email_address if preferences.email_address else None
            update_values.append(email_value)

        if not update_fields:
            # No email-related fields to update
            raise HTTPException(status_code=400, detail="No email preferences provided")

        # Add updated_at
        update_fields.append("updated_at = ?")
        update_values.append(datetime.now().isoformat())

        # Add user_id for WHERE clause
        update_values.append(current_user.id)

        query = f"""
            UPDATE user_preferences
            SET {', '.join(update_fields)}
            WHERE user_id = ?
        """

        cursor.execute(query, update_values)
        conn.commit()

        # Return updated preferences
        cursor.execute("""
            SELECT
                enable_weekly_email,
                email_address,
                last_email_sent_at
            FROM user_preferences
            WHERE user_id = ?
        """, (current_user.id,))

        result = cursor.fetchone()

        return {
            'enable_weekly_email': bool(result['enable_weekly_email']),
            'email_address': result['email_address'],
            'last_email_sent_at': result['last_email_sent_at']
        }


@router.post("/send-test")
def send_test_email_now(current_user: User = Depends(get_current_user)) -> Dict:
    """
    Send a test email immediately.
    Rate limited to 1 per 5 minutes per user.
    """
    # Check rate limiting
    user_key = current_user.id
    now = datetime.now()

    if user_key in _last_test_email_sent:
        last_sent = _last_test_email_sent[user_key]
        time_since_last = now - last_sent

        if time_since_last < timedelta(minutes=5):
            remaining = 5 - int(time_since_last.total_seconds() / 60)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} minute(s) before sending another test email"
            )

    # Send test email
    try:
        success = send_test_email(current_user.id)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to send test email. Check SMTP configuration."
            )

        # Update rate limit tracker
        _last_test_email_sent[user_key] = now

        return {
            'success': True,
            'message': 'Test email sent successfully'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test email for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while sending the test email"
        )
