from fastapi import APIRouter, Request, Response, Depends, HTTPException
import bcrypt
from auth.session import create_session, delete_session
from auth.middleware import get_current_user
from auth.password_reset import create_reset_token, validate_reset_token, delete_reset_token
from database import get_db
from models import User, UserSignup, UserLogin, PasswordResetRequest, PasswordReset
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


@router.post("/signup", response_model=User)
async def signup(user_data: UserSignup, response: Response):
    """
    Create a new user account with email and password.
    - Validate email uniqueness
    - Hash password
    - Create user in database
    - Migrate data to first user if applicable
    - Create session
    - Set cookie
    - Return user info
    """
    try:
        email = user_data.email
        password_hash = hash_password(user_data.password)
        name = user_data.name

        with get_db() as conn:
            cursor = conn.cursor()

            # Check if email already exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            existing_user = cursor.fetchone()

            if existing_user:
                raise HTTPException(status_code=400, detail="Email already registered")

            # Create new user
            cursor.execute("""
                INSERT INTO users (email, password_hash, name)
                VALUES (?, ?, ?)
            """, (email, password_hash, name))
            user_id = cursor.lastrowid
            logger.info(f"Created new user: {email} (user_id={user_id})")

            # Check if this is the first user
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']

            if user_count == 1:
                # First user - migrate all existing data
                logger.info(f"First user detected, migrating existing data to user_id={user_id}")

                # Migrate activities
                cursor.execute("SELECT COUNT(*) FROM activities WHERE user_id IS NULL")
                unmigrated_activities = cursor.fetchone()[0]
                if unmigrated_activities > 0:
                    cursor.execute("UPDATE activities SET user_id = ? WHERE user_id IS NULL", (user_id,))
                    logger.info(f"Migrated {unmigrated_activities} activities to first user")

                # Migrate categories
                cursor.execute("SELECT COUNT(*) FROM categories WHERE user_id IS NULL")
                unmigrated_categories = cursor.fetchone()[0]
                if unmigrated_categories > 0:
                    cursor.execute("UPDATE categories SET user_id = ? WHERE user_id IS NULL", (user_id,))
                    logger.info(f"Migrated {unmigrated_categories} categories to first user")

                # Migrate activity_logs
                cursor.execute("SELECT COUNT(*) FROM activity_logs WHERE user_id IS NULL")
                unmigrated_logs = cursor.fetchone()[0]
                if unmigrated_logs > 0:
                    cursor.execute("UPDATE activity_logs SET user_id = ? WHERE user_id IS NULL", (user_id,))
                    logger.info(f"Migrated {unmigrated_logs} activity logs to first user")

            # Get the created user
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()

        # Create session
        session_id = create_session(user_id)

        # Set HTTP-only cookie with session_id
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            samesite="lax",
            secure=(ENVIRONMENT == "production"),  # HTTPS only in production
            max_age=30 * 24 * 60 * 60  # 30 days
        )

        # Return user object
        return User(
            id=user_row['id'],
            google_id=None,
            email=user_row['email'],
            name=user_row['name'],
            profile_picture=None,
            created_at=datetime.fromisoformat(user_row['created_at']),
            last_login_at=datetime.fromisoformat(user_row['last_login_at'])
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create account")


@router.post("/login", response_model=User)
async def login(credentials: UserLogin, response: Response):
    """
    Login with email and password.
    - Validate credentials
    - Create session
    - Set cookie
    - Return user info
    """
    try:
        email = credentials.email

        with get_db() as conn:
            cursor = conn.cursor()

            # Get user by email
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            user_row = cursor.fetchone()

            if not user_row:
                raise HTTPException(status_code=401, detail="Invalid email or password")

            # Verify password
            if not user_row['password_hash']:
                raise HTTPException(status_code=401, detail="Invalid email or password")

            if not verify_password(credentials.password, user_row['password_hash']):
                raise HTTPException(status_code=401, detail="Invalid email or password")

            user_id = user_row['id']

            # Update last login
            cursor.execute("""
                UPDATE users
                SET last_login_at = ?
                WHERE id = ?
            """, (datetime.utcnow(), user_id))

            logger.info(f"User logged in: {email}")

        # Create session
        session_id = create_session(user_id)

        # Set HTTP-only cookie with session_id
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            samesite="lax",
            secure=(ENVIRONMENT == "production"),
            max_age=30 * 24 * 60 * 60  # 30 days
        )

        # Return user object
        return User(
            id=user_row['id'],
            google_id=user_row['google_id'] if user_row['google_id'] else None,
            email=user_row['email'],
            name=user_row['name'] if user_row['name'] else None,
            profile_picture=user_row['profile_picture'] if user_row['profile_picture'] else None,
            created_at=datetime.fromisoformat(user_row['created_at']),
            last_login_at=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout - delete session and clear cookie."""
    session_id = request.cookies.get("session_id")

    if session_id:
        delete_session(session_id)

    # Clear cookie
    response.delete_cookie("session_id")

    return {"message": "Logged out successfully"}


@router.post("/request-password-reset")
async def request_password_reset(request_data: PasswordResetRequest):
    """
    Request a password reset token.
    - Accepts email address
    - Creates reset token if user exists
    - Returns reset link in response (no email sending for now)
    - Always returns success to prevent email enumeration
    """
    try:
        email = request_data.email

        with get_db() as conn:
            cursor = conn.cursor()

            # Find user by email
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            user_row = cursor.fetchone()

            if user_row:
                # User exists - create reset token
                user_id = user_row['id']
                token = create_reset_token(user_id)

                # In production, send email here
                # For now, return the reset link
                reset_link = f"{FRONTEND_URL}/reset-password/{token}"
                logger.info(f"Password reset requested for {email}")

                return {
                    "message": "Password reset link created",
                    "reset_link": reset_link,
                    "token": token,
                    "expires_in_hours": 1
                }
            else:
                # User doesn't exist - still return success to prevent enumeration
                logger.info(f"Password reset requested for non-existent email: {email}")
                return {
                    "message": "If an account exists with this email, a reset link has been sent",
                }

    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process reset request")


@router.get("/validate-reset-token/{token}")
async def validate_token_endpoint(token: str):
    """
    Validate a reset token without consuming it.
    Returns user email if valid, 400 if invalid/expired.
    """
    try:
        user_id = validate_reset_token(token)

        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        # Get user email to show on reset form
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()

            if not user_row:
                raise HTTPException(status_code=400, detail="User not found")

            return {
                "valid": True,
                "email": user_row['email']
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate token")


@router.post("/reset-password", response_model=User)
async def reset_password(reset_data: PasswordReset, response: Response):
    """
    Reset password using a valid token.
    - Validates token
    - Updates password hash
    - Deletes reset token (single use)
    - Invalidates all existing sessions for security
    - Creates new session and logs user in
    - Returns user info
    """
    try:
        token = reset_data.token
        new_password = reset_data.new_password

        # Validate token and get user_id
        user_id = validate_reset_token(token)

        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        # Hash new password
        password_hash = hash_password(new_password)

        with get_db() as conn:
            cursor = conn.cursor()

            # Update password
            cursor.execute("""
                UPDATE users
                SET password_hash = ?, last_login_at = ?
                WHERE id = ?
            """, (password_hash, datetime.utcnow(), user_id))

            # Delete the reset token (single use)
            cursor.execute("DELETE FROM password_reset_tokens WHERE token = ?", (token,))

            # Delete all existing sessions for security (force re-login on other devices)
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

            # Get user data
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()

            if not user_row:
                raise HTTPException(status_code=400, detail="User not found")

            logger.info(f"Password reset successful for user_id={user_id}")

        # Create new session and log user in
        session_id = create_session(user_id)

        # Set HTTP-only cookie
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            samesite="lax",
            secure=(ENVIRONMENT == "production"),
            max_age=30 * 24 * 60 * 60  # 30 days
        )

        # Return user object
        return User(
            id=user_row['id'],
            google_id=user_row['google_id'] if user_row['google_id'] else None,
            email=user_row['email'],
            name=user_row['name'] if user_row['name'] else None,
            profile_picture=user_row['profile_picture'] if user_row['profile_picture'] else None,
            created_at=datetime.fromisoformat(user_row['created_at']),
            last_login_at=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")
