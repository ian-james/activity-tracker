from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import date

from database import get_db
from models import Log, LogCreate

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=List[Log])
def get_logs(date: date = Query(..., description="Date to get logs for")):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM activity_logs WHERE completed_at = ? ORDER BY created_at",
            (date.isoformat(),)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=Log)
def create_log(log: LogCreate):
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM activities WHERE id = ? AND is_active = 1", (log.activity_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Activity not found")

        cursor.execute(
            "SELECT * FROM activity_logs WHERE activity_id = ? AND completed_at = ?",
            (log.activity_id, log.completed_at.isoformat())
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Activity already logged for this date")

        cursor.execute(
            "INSERT INTO activity_logs (activity_id, completed_at) VALUES (?, ?)",
            (log.activity_id, log.completed_at.isoformat())
        )
        log_id = cursor.lastrowid
        cursor.execute("SELECT * FROM activity_logs WHERE id = ?", (log_id,))
        return dict(cursor.fetchone())


@router.delete("/{log_id}")
def delete_log(log_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM activity_logs WHERE id = ?", (log_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Log not found")

        cursor.execute("DELETE FROM activity_logs WHERE id = ?", (log_id,))
        return {"message": "Log deleted"}
