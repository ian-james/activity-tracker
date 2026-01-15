import secrets
from datetime import datetime, timedelta
from typing import Optional
from database import get_db
from models import User
import logging

logger = logging.getLogger(__name__)

SESSION_EXPIRY_DAYS = 30


def create_session(user_id: int) -> str:
    """Create a new session for the user and return the session_id."""
    session_id = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=SESSION_EXPIRY_DAYS)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
            (session_id, user_id, expires_at)
        )
        logger.info(f"Created session for user_id={user_id}")

    return session_id


def get_user_from_session(session_id: str) -> Optional[User]:
    """Validate session and return the associated user, or None if invalid/expired."""
    if not session_id:
        return None

    with get_db() as conn:
        cursor = conn.cursor()

        # Get session and join with user data
        cursor.execute("""
            SELECT u.id, u.google_id, u.email, u.name, u.profile_picture,
                   u.created_at, u.last_login_at, s.expires_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_id = ?
        """, (session_id,))

        row = cursor.fetchone()

        if not row:
            return None

        # Check if session is expired
        expires_at = datetime.fromisoformat(row['expires_at'])
        if expires_at < datetime.utcnow():
            # Session expired, delete it
            cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
            logger.info(f"Deleted expired session: {session_id}")
            return None

        # Return user object
        return User(
            id=row['id'],
            google_id=row['google_id'] if row['google_id'] else None,
            email=row['email'],
            name=row['name'] if row['name'] else None,
            profile_picture=row['profile_picture'] if row['profile_picture'] else None,
            created_at=datetime.fromisoformat(row['created_at']),
            last_login_at=datetime.fromisoformat(row['last_login_at'])
        )


def delete_session(session_id: str) -> None:
    """Delete a session (logout)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        logger.info(f"Deleted session: {session_id}")


def cleanup_expired_sessions() -> int:
    """Delete all expired sessions. Returns the number of sessions deleted."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM sessions WHERE expires_at < ?",
            (datetime.utcnow(),)
        )
        deleted_count = cursor.rowcount
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired sessions")
        return deleted_count
