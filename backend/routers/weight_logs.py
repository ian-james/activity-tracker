from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import WeightLog, WeightLogCreate, User
from auth.middleware import get_current_user
from typing import List
from datetime import date, timedelta
import sqlite3

router = APIRouter(prefix="/api/weight-logs", tags=["weight-logs"])


@router.get("", response_model=List[WeightLog])
def list_weight_logs(
    days: int = 90,
    current_user: User = Depends(get_current_user)
):
    """List recent weight logs"""
    with get_db() as conn:
        cursor = conn.cursor()

        start_date = (date.today() - timedelta(days=days)).isoformat()

        cursor.execute("""
            SELECT * FROM weight_logs
            WHERE user_id = ? AND log_date >= ?
            ORDER BY log_date DESC
        """, (current_user.id, start_date))

        return [dict(row) for row in cursor.fetchall()]


@router.get("/latest", response_model=WeightLog)
def get_latest_weight(current_user: User = Depends(get_current_user)):
    """Get most recent weight log"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM weight_logs
            WHERE user_id = ?
            ORDER BY log_date DESC
            LIMIT 1
        """, (current_user.id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No weight logs found")

        return dict(row)


@router.post("", response_model=WeightLog)
def log_weight(log: WeightLogCreate, current_user: User = Depends(get_current_user)):
    """Create or update weight log for a date"""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            # Try to insert
            cursor.execute("""
                INSERT INTO weight_logs (user_id, log_date, weight, weight_unit, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (current_user.id, log.log_date, log.weight, log.weight_unit, log.notes))
            weight_id = cursor.lastrowid

        except sqlite3.IntegrityError:
            # If duplicate, update existing
            cursor.execute("""
                UPDATE weight_logs
                SET weight = ?, weight_unit = ?, notes = ?
                WHERE user_id = ? AND log_date = ?
            """, (log.weight, log.weight_unit, log.notes, current_user.id, log.log_date))

            cursor.execute("""
                SELECT id FROM weight_logs
                WHERE user_id = ? AND log_date = ?
            """, (current_user.id, log.log_date))
            weight_id = cursor.fetchone()['id']

        cursor.execute("SELECT * FROM weight_logs WHERE id = ?", (weight_id,))
        return dict(cursor.fetchone())


@router.delete("/{weight_id}")
def delete_weight_log(
    weight_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a weight log"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM weight_logs WHERE id = ? AND user_id = ?",
            (weight_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Weight log not found")

        cursor.execute("DELETE FROM weight_logs WHERE id = ?", (weight_id,))

        return {"message": "Weight log deleted successfully"}
