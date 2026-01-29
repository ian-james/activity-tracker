from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from datetime import date

from database import get_db
from models import SpecialDay, SpecialDayCreate, SpecialDayUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/special-days", tags=["special-days"])


@router.get("", response_model=List[SpecialDay])
def list_special_days(
    start_date: date = Query(..., description="Start date of the range"),
    end_date: date = Query(..., description="End date of the range"),
    current_user: User = Depends(get_current_user)
):
    """Get all special days for the current user within a date range."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM special_days WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date",
            (current_user.id, start_date, end_date)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=SpecialDay)
def create_special_day(special_day: SpecialDayCreate, current_user: User = Depends(get_current_user)):
    """Create a new special day for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Check for duplicate date
        cursor.execute(
            "SELECT id FROM special_days WHERE date = ? AND user_id = ?",
            (special_day.date, current_user.id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Special day already exists for this date")

        cursor.execute(
            "INSERT INTO special_days (user_id, date, day_type, notes) VALUES (?, ?, ?, ?)",
            (current_user.id, special_day.date, special_day.day_type, special_day.notes)
        )
        special_day_id = cursor.lastrowid
        cursor.execute("SELECT * FROM special_days WHERE id = ?", (special_day_id,))
        return dict(cursor.fetchone())


@router.put("/{special_day_date}", response_model=SpecialDay)
def update_special_day(
    special_day_date: date,
    special_day: SpecialDayUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an existing special day for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM special_days WHERE date = ? AND user_id = ?",
            (special_day_date, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Special day not found")

        updates = []
        values = []
        if special_day.day_type is not None:
            updates.append("day_type = ?")
            values.append(special_day.day_type)
        if special_day.notes is not None:
            updates.append("notes = ?")
            values.append(special_day.notes)

        if updates:
            values.extend([special_day_date, current_user.id])
            cursor.execute(
                f"UPDATE special_days SET {', '.join(updates)} WHERE date = ? AND user_id = ?",
                values
            )

        cursor.execute(
            "SELECT * FROM special_days WHERE date = ? AND user_id = ?",
            (special_day_date, current_user.id)
        )
        return dict(cursor.fetchone())


@router.delete("/{special_day_date}")
def delete_special_day(special_day_date: date, current_user: User = Depends(get_current_user)):
    """Delete a special day for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM special_days WHERE date = ? AND user_id = ?",
            (special_day_date, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Special day not found")

        cursor.execute(
            "DELETE FROM special_days WHERE date = ? AND user_id = ?",
            (special_day_date, current_user.id)
        )
        return {"message": "Special day deleted"}
