from fastapi import APIRouter, Request, Response, Depends, HTTPException
import bcrypt
from auth.session import create_session, delete_session
from auth.middleware import get_current_user
from database import get_db
from models import User, UserSignup, UserLogin
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
