from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import get_db
from models import Activity, ActivityCreate, ActivityUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/activities", tags=["activities"])


def row_to_activity(row) -> dict:
    """Convert a database row to an Activity dict, parsing days_of_week."""
    data = dict(row)
    if data.get('days_of_week'):
        data['days_of_week'] = data['days_of_week'].split(',')
    else:
        data['days_of_week'] = None
    return data


def days_to_string(days: List[str] | None) -> str | None:
    """Convert a list of days to a comma-separated string."""
    if days is None or len(days) == 0:
        return None
    return ','.join(days)


@router.get("", response_model=List[Activity])
def list_activities(current_user: User = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM activities WHERE is_active = 1 AND user_id = ? ORDER BY name",
            (current_user.id,)
        )
        rows = cursor.fetchall()
        return [row_to_activity(row) for row in rows]


@router.post("", response_model=Activity)
def create_activity(activity: ActivityCreate, current_user: User = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()

        # Validate category exists and belongs to user if provided
        if activity.category_id is not None:
            cursor.execute(
                "SELECT id FROM categories WHERE id = ? AND is_active = 1 AND user_id = ?",
                (activity.category_id, current_user.id)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Category not found")

        days_str = days_to_string(activity.days_of_week)
        cursor.execute(
            "INSERT INTO activities (name, points, days_of_week, category_id, user_id) VALUES (?, ?, ?, ?, ?)",
            (activity.name, activity.points, days_str, activity.category_id, current_user.id)
        )
        activity_id = cursor.lastrowid
        cursor.execute("SELECT * FROM activities WHERE id = ?", (activity_id,))
        return row_to_activity(cursor.fetchone())


@router.put("/{activity_id}", response_model=Activity)
def update_activity(activity_id: int, activity: ActivityUpdate, current_user: User = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM activities WHERE id = ? AND is_active = 1 AND user_id = ?",
            (activity_id, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Activity not found")

        updates = []
        values = []
        if activity.name is not None:
            updates.append("name = ?")
            values.append(activity.name)
        if activity.points is not None:
            updates.append("points = ?")
            values.append(activity.points)
        if activity.days_of_week is not None:
            updates.append("days_of_week = ?")
            values.append(days_to_string(activity.days_of_week))
        if activity.category_id is not None:
            # Validate category exists and belongs to user if provided
            cursor.execute(
                "SELECT id FROM categories WHERE id = ? AND is_active = 1 AND user_id = ?",
                (activity.category_id, current_user.id)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Category not found")
            updates.append("category_id = ?")
            values.append(activity.category_id)

        if updates:
            values.append(activity_id)
            cursor.execute(
                f"UPDATE activities SET {', '.join(updates)} WHERE id = ?",
                values
            )

        cursor.execute("SELECT * FROM activities WHERE id = ?", (activity_id,))
        return row_to_activity(cursor.fetchone())


@router.delete("/{activity_id}")
def delete_activity(activity_id: int, current_user: User = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM activities WHERE id = ? AND is_active = 1 AND user_id = ?",
            (activity_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Activity not found")

        cursor.execute("UPDATE activities SET is_active = 0 WHERE id = ?", (activity_id,))
        return {"message": "Activity deleted"}
