from fastapi import APIRouter, HTTPException, Depends

from database import get_db
from models import UserPreferences, UserPreferencesUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


@router.get("", response_model=UserPreferences)
def get_preferences(current_user: User = Depends(get_current_user)):
    """Get user preferences, creating defaults if none exist."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM user_preferences WHERE user_id = ?",
            (current_user.id,)
        )
        row = cursor.fetchone()

        if not row:
            # Create default preferences
            cursor.execute(
                """INSERT INTO user_preferences (user_id, weight_unit, default_rest_seconds)
                VALUES (?, 'lbs', 60)""",
                (current_user.id,)
            )
            pref_id = cursor.lastrowid
            cursor.execute("SELECT * FROM user_preferences WHERE id = ?", (pref_id,))
            row = cursor.fetchone()

        return dict(row)


@router.put("", response_model=UserPreferences)
def update_preferences(
    preferences: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get or create preferences
        cursor.execute(
            "SELECT * FROM user_preferences WHERE user_id = ?",
            (current_user.id,)
        )
        existing = cursor.fetchone()

        if not existing:
            # Create if doesn't exist
            cursor.execute(
                """INSERT INTO user_preferences (user_id, weight_unit, default_rest_seconds)
                VALUES (?, 'lbs', 60)""",
                (current_user.id,)
            )

        updates = []
        values = []

        if preferences.weight_unit is not None:
            updates.append("weight_unit = ?")
            values.append(preferences.weight_unit)
        if preferences.default_rest_seconds is not None:
            updates.append("default_rest_seconds = ?")
            values.append(preferences.default_rest_seconds)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(current_user.id)
            cursor.execute(
                f"UPDATE user_preferences SET {', '.join(updates)} WHERE user_id = ?",
                values
            )

        cursor.execute("SELECT * FROM user_preferences WHERE user_id = ?", (current_user.id,))
        return dict(cursor.fetchone())
