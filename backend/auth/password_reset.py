import secrets
from datetime import datetime, timedelta
from typing import Optional
from database import get_db
import logging

logger = logging.getLogger(__name__)

RESET_TOKEN_EXPIRY_HOURS = 1


def create_reset_token(user_id: int) -> str:
    """Create a password reset token for the user and return the token."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)

    with get_db() as conn:
        cursor = conn.cursor()

        # Delete any existing tokens for this user (single active token per user)
        cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))

        # Create new token
        cursor.execute(
            "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at)
        )
        logger.info(f"Created password reset token for user_id={user_id}")

    return token


def validate_reset_token(token: str) -> Optional[int]:
    """
    Validate reset token and return user_id if valid, None if invalid/expired.
    Does NOT delete the token - that happens on successful reset.
    """
    if not token:
        return None

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT user_id, expires_at
            FROM password_reset_tokens
            WHERE token = ?
        """, (token,))

        row = cursor.fetchone()

        if not row:
            logger.debug(f"Reset token not found: {token[:10]}...")
            return None

        # Check if token is expired
        expires_at = datetime.fromisoformat(row['expires_at'])
        if expires_at < datetime.utcnow():
            # Token expired, delete it
            cursor.execute("DELETE FROM password_reset_tokens WHERE token = ?", (token,))
            logger.info(f"Deleted expired reset token for user_id={row['user_id']}")
            return None

        return row['user_id']


def delete_reset_token(token: str) -> None:
    """Delete a reset token after successful password reset."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM password_reset_tokens WHERE token = ?", (token,))
        logger.info(f"Deleted reset token: {token[:10]}...")


def cleanup_expired_tokens() -> int:
    """Delete all expired reset tokens. Returns the number deleted."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM password_reset_tokens WHERE expires_at < ?",
            (datetime.utcnow(),)
        )
        deleted_count = cursor.rowcount
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired reset tokens")
        return deleted_count
