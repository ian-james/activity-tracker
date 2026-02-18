from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import MoodLog, MoodLogCreate, User
from auth.middleware import get_current_user
from datetime import date, datetime, time

router = APIRouter(prefix="/api/mood", tags=["mood"])


@router.get("/logs", response_model=list[MoodLog])
def list_mood_logs(
    days: int = 7,
    current_user: User = Depends(get_current_user)
):
    """List mood logs for the last N days"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM mood_logs
            WHERE user_id = ? AND log_date >= date('now', '-' || ? || ' days')
            ORDER BY log_date DESC, log_time DESC
            """,
            (current_user.id, days)
        )
        return [dict(row) for row in cursor.fetchall()]


@router.get("/logs/{log_date}", response_model=list[MoodLog])
def get_mood_logs_for_date(
    log_date: date,
    current_user: User = Depends(get_current_user)
):
    """Get all mood logs for a specific date"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM mood_logs
            WHERE user_id = ? AND log_date = ?
            ORDER BY log_time DESC
            """,
            (current_user.id, log_date)
        )
        return [dict(row) for row in cursor.fetchall()]


@router.post("/logs", response_model=MoodLog)
def create_mood_log(
    log: MoodLogCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new mood log"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO mood_logs (user_id, log_date, log_time, mood_rating, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (current_user.id, log.log_date, log.log_time, log.mood_rating, log.notes)
        )
        log_id = cursor.lastrowid
        cursor.execute("SELECT * FROM mood_logs WHERE id = ?", (log_id,))
        return dict(cursor.fetchone())


@router.delete("/logs/{log_id}")
def delete_mood_log(
    log_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a mood log"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM mood_logs WHERE id = ? AND user_id = ?",
            (log_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(404, "Mood log not found")

        cursor.execute("DELETE FROM mood_logs WHERE id = ?", (log_id,))
        return {"status": "deleted"}


@router.get("/summary/{log_date}")
def get_mood_summary(
    log_date: date,
    current_user: User = Depends(get_current_user)
):
    """Get mood summary for a specific date"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COUNT(*) as total_logs,
                AVG(mood_rating) as average_mood,
                MIN(mood_rating) as lowest_mood,
                MAX(mood_rating) as highest_mood
            FROM mood_logs
            WHERE user_id = ? AND log_date = ?
            """,
            (current_user.id, log_date)
        )
        row = cursor.fetchone()
        return dict(row) if row else {
            'total_logs': 0,
            'average_mood': None,
            'lowest_mood': None,
            'highest_mood': None
        }


@router.get("/trends")
def get_mood_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """Get mood trends over time"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                log_date,
                AVG(mood_rating) as average_mood,
                MIN(mood_rating) as lowest_mood,
                MAX(mood_rating) as highest_mood,
                COUNT(*) as log_count
            FROM mood_logs
            WHERE user_id = ? AND log_date >= date('now', '-' || ? || ' days')
            GROUP BY log_date
            ORDER BY log_date ASC
            """,
            (current_user.id, days)
        )
        return [dict(row) for row in cursor.fetchall()]
