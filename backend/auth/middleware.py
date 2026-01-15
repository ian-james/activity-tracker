from fastapi import Request, HTTPException
from models import User
from auth.session import get_user_from_session
import logging

logger = logging.getLogger(__name__)


async def get_current_user(request: Request) -> User:
    """
    FastAPI dependency to require authentication.
    Raises 401 if not authenticated or session is invalid/expired.
    """
    session_id = request.cookies.get("session_id")

    if not session_id:
        logger.debug("No session_id cookie found")
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = get_user_from_session(session_id)

    if not user:
        logger.debug(f"Invalid or expired session: {session_id}")
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return user
