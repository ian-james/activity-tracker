from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from datetime import date

from database import get_db
from models import Log, LogCreate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=List[Log])
def get_logs(date: date = Query(..., description="Date to get logs for"), current_user: User = Depends(get_current_user)):
    """Get activity logs for a specific date for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM activity_logs WHERE completed_at = ? AND user_id = ? ORDER BY created_at",
            (date.isoformat(), current_user.id)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=Log)
def create_log(log: LogCreate, current_user: User = Depends(get_current_user)):
    """Create an activity log for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Validate activity exists and belongs to user
        cursor.execute(
            "SELECT * FROM activities WHERE id = ? AND is_active = 1 AND user_id = ?",
            (log.activity_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Activity not found")

        # Check for duplicate log
        cursor.execute(
            "SELECT * FROM activity_logs WHERE activity_id = ? AND completed_at = ? AND user_id = ?",
            (log.activity_id, log.completed_at.isoformat(), current_user.id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Activity already logged for this date")

        cursor.execute(
            "INSERT INTO activity_logs (activity_id, completed_at, energy_level, user_id) VALUES (?, ?, ?, ?)",
            (log.activity_id, log.completed_at.isoformat(), log.energy_level, current_user.id)
        )
        log_id = cursor.lastrowid
        cursor.execute("SELECT * FROM activity_logs WHERE id = ?", (log_id,))
        return dict(cursor.fetchone())


@router.delete("/{log_id}")
def delete_log(log_id: int, current_user: User = Depends(get_current_user)):
    """Delete an activity log for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM activity_logs WHERE id = ? AND user_id = ?",
            (log_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Log not found")

        cursor.execute("DELETE FROM activity_logs WHERE id = ?", (log_id,))
        return {"message": "Log deleted"}
