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
            """INSERT INTO activities (name, points, days_of_week, category_id, user_id,
               completion_type, rating_scale, schedule_frequency, biweekly_start_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (activity.name, activity.points, days_str, activity.category_id, current_user.id,
             activity.completion_type, activity.rating_scale, activity.schedule_frequency,
             activity.biweekly_start_date)
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
        if activity.completion_type is not None:
            updates.append("completion_type = ?")
            values.append(activity.completion_type)
        if activity.rating_scale is not None:
            updates.append("rating_scale = ?")
            values.append(activity.rating_scale)
        if activity.schedule_frequency is not None:
            updates.append("schedule_frequency = ?")
            values.append(activity.schedule_frequency)
        if activity.biweekly_start_date is not None:
            updates.append("biweekly_start_date = ?")
            values.append(activity.biweekly_start_date)

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


@router.get("/{activity_id}/stats")
def get_activity_stats(activity_id: int, current_user: User = Depends(get_current_user)):
    """Get statistics for a specific activity."""
    from datetime import datetime, timedelta

    with get_db() as conn:
        cursor = conn.cursor()

        # Verify activity exists and belongs to user
        cursor.execute(
            "SELECT * FROM activities WHERE id = ? AND user_id = ?",
            (activity_id, current_user.id)
        )
        activity = cursor.fetchone()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        # Get all logs for this activity
        cursor.execute(
            """SELECT completed_at, energy_level, quality_rating, rating_value, created_at
               FROM activity_logs
               WHERE activity_id = ? AND user_id = ?
               ORDER BY completed_at DESC""",
            (activity_id, current_user.id)
        )
        logs = cursor.fetchall()

        if not logs:
            return {
                "activity_id": activity_id,
                "total_completions": 0,
                "completion_rate": 0,
                "current_streak": 0,
                "best_streak": 0,
                "last_completed": None,
                "avg_energy": None,
                "avg_quality": None,
                "avg_rating": None,
            }

        # Calculate statistics
        total_completions = len(logs)
        last_completed = logs[0]["completed_at"] if logs else None

        # Calculate streaks (consecutive days)
        completed_dates = sorted([datetime.fromisoformat(log["completed_at"]).date() for log in logs])
        current_streak = 0
        best_streak = 0
        temp_streak = 1

        today = datetime.now().date()
        yesterday = today - timedelta(days=1)

        # Calculate current streak (must include today or yesterday)
        if completed_dates and (completed_dates[-1] == today or completed_dates[-1] == yesterday):
            current_streak = 1
            for i in range(len(completed_dates) - 1, 0, -1):
                if (completed_dates[i] - completed_dates[i-1]).days == 1:
                    current_streak += 1
                else:
                    break

        # Calculate best streak
        for i in range(1, len(completed_dates)):
            if (completed_dates[i] - completed_dates[i-1]).days == 1:
                temp_streak += 1
                best_streak = max(best_streak, temp_streak)
            else:
                temp_streak = 1
        best_streak = max(best_streak, temp_streak, current_streak)

        # Calculate averages
        energy_values = []
        quality_values = []
        rating_values = []

        energy_map = {"low": 1, "medium": 2, "high": 3}
        quality_map = {"low": 1, "medium": 2, "high": 3}

        for log in logs:
            if log["energy_level"]:
                energy_values.append(energy_map.get(log["energy_level"], 0))
            if log["quality_rating"]:
                quality_values.append(quality_map.get(log["quality_rating"], 0))
            if log["rating_value"]:
                rating_values.append(log["rating_value"])

        avg_energy = sum(energy_values) / len(energy_values) if energy_values else None
        avg_quality = sum(quality_values) / len(quality_values) if quality_values else None
        avg_rating = sum(rating_values) / len(rating_values) if rating_values else None

        # Calculate completion rate (approximation based on activity age)
        activity_created = datetime.fromisoformat(activity["created_at"]).date()
        days_since_creation = (today - activity_created).days + 1
        completion_rate = round((total_completions / days_since_creation) * 100, 1) if days_since_creation > 0 else 0

        return {
            "activity_id": activity_id,
            "activity_name": activity["name"],
            "total_completions": total_completions,
            "completion_rate": completion_rate,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "last_completed": last_completed,
            "avg_energy": round(avg_energy, 2) if avg_energy else None,
            "avg_quality": round(avg_quality, 2) if avg_quality else None,
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
        }
