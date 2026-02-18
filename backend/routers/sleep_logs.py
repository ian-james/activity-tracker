from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import SleepLog, SleepLogCreate, User
from auth.middleware import get_current_user
from datetime import date, timedelta
from typing import List

router = APIRouter(prefix="/api/sleep-logs", tags=["sleep-logs"])


@router.get("", response_model=List[SleepLog])
def list_sleep_logs(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """List sleep logs for the last N days"""
    with get_db() as conn:
        cursor = conn.cursor()
        start_date = date.today() - timedelta(days=days)

        cursor.execute("""
            SELECT * FROM sleep_logs
            WHERE user_id = ? AND log_date >= ?
            ORDER BY log_date DESC
        """, (current_user.id, start_date))

        return [dict(row) for row in cursor.fetchall()]


@router.post("", response_model=SleepLog)
def log_sleep(log: SleepLogCreate, current_user: User = Depends(get_current_user)):
    """Create or update sleep log for a specific date"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Check if log already exists for this date
        cursor.execute(
            "SELECT id FROM sleep_logs WHERE user_id = ? AND log_date = ?",
            (current_user.id, log.log_date)
        )
        existing = cursor.fetchone()

        if existing:
            # Update existing log
            cursor.execute("""
                UPDATE sleep_logs
                SET hours_slept = ?, quality_rating = ?, notes = ?
                WHERE user_id = ? AND log_date = ?
            """, (log.hours_slept, log.quality_rating, log.notes, current_user.id, log.log_date))
            log_id = existing['id']
        else:
            # Create new log
            cursor.execute("""
                INSERT INTO sleep_logs (user_id, log_date, hours_slept, quality_rating, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (current_user.id, log.log_date, log.hours_slept, log.quality_rating, log.notes))
            log_id = cursor.lastrowid

        cursor.execute("SELECT * FROM sleep_logs WHERE id = ?", (log_id,))
        return dict(cursor.fetchone())


@router.delete("/{log_id}")
def delete_sleep_log(log_id: int, current_user: User = Depends(get_current_user)):
    """Delete a sleep log"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM sleep_logs WHERE id = ? AND user_id = ?",
            (log_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Sleep log not found")

        cursor.execute("DELETE FROM sleep_logs WHERE id = ?", (log_id,))
        return {"message": "Sleep log deleted successfully"}
