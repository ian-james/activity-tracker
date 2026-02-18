from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import WaterGoal, WaterGoalCreate, WaterGoalUpdate, WaterLog, WaterLogCreate, WaterLogUpdate, User
from auth.middleware import get_current_user
from datetime import date, datetime

router = APIRouter(prefix="/api/water", tags=["water"])


# Water Goals

@router.get("/goal", response_model=WaterGoal)
def get_water_goal(current_user: User = Depends(get_current_user)):
    """Get user's water goal, create default if doesn't exist"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM water_goals WHERE user_id = ?",
            (current_user.id,)
        )
        row = cursor.fetchone()
        if not row:
            # Create default goal
            cursor.execute(
                "INSERT INTO water_goals (user_id, daily_goal_oz) VALUES (?, 64)",
                (current_user.id,)
            )
            cursor.execute(
                "SELECT * FROM water_goals WHERE user_id = ?",
                (current_user.id,)
            )
            row = cursor.fetchone()
        return dict(row)


@router.put("/goal", response_model=WaterGoal)
def update_water_goal(
    goal: WaterGoalUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update water goal"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Ensure goal exists
        cursor.execute("SELECT id FROM water_goals WHERE user_id = ?", (current_user.id,))
        if not cursor.fetchone():
            # Create if doesn't exist
            cursor.execute(
                "INSERT INTO water_goals (user_id, daily_goal_oz) VALUES (?, ?)",
                (current_user.id, goal.daily_goal_oz or 64)
            )
        else:
            # Update
            if goal.daily_goal_oz is not None:
                cursor.execute(
                    "UPDATE water_goals SET daily_goal_oz = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    (goal.daily_goal_oz, current_user.id)
                )

        cursor.execute("SELECT * FROM water_goals WHERE user_id = ?", (current_user.id,))
        return dict(cursor.fetchone())


# Water Logs

@router.get("/logs", response_model=list[WaterLog])
def list_water_logs(
    days: int = 7,
    current_user: User = Depends(get_current_user)
):
    """List water logs for the last N days"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM water_logs
            WHERE user_id = ? AND log_date >= date('now', '-' || ? || ' days')
            ORDER BY log_date DESC
            """,
            (current_user.id, days)
        )
        return [dict(row) for row in cursor.fetchall()]


@router.get("/logs/{log_date}", response_model=WaterLog)
def get_water_log(
    log_date: date,
    current_user: User = Depends(get_current_user)
):
    """Get water log for a specific date"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM water_logs WHERE user_id = ? AND log_date = ?",
            (current_user.id, log_date)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Water log not found for this date")
        return dict(row)


@router.post("/logs", response_model=WaterLog)
def create_or_update_water_log(
    log: WaterLogCreate,
    current_user: User = Depends(get_current_user)
):
    """Create or update water log for a date (upsert)"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Check if log exists for this date
        cursor.execute(
            "SELECT id FROM water_logs WHERE user_id = ? AND log_date = ?",
            (current_user.id, log.log_date)
        )
        existing = cursor.fetchone()

        if existing:
            # Update existing
            cursor.execute(
                """
                UPDATE water_logs
                SET amount_oz = ?
                WHERE user_id = ? AND log_date = ?
                """,
                (log.amount_oz, current_user.id, log.log_date)
            )
        else:
            # Create new
            cursor.execute(
                """
                INSERT INTO water_logs (user_id, log_date, amount_oz)
                VALUES (?, ?, ?)
                """,
                (current_user.id, log.log_date, log.amount_oz)
            )

        cursor.execute(
            "SELECT * FROM water_logs WHERE user_id = ? AND log_date = ?",
            (current_user.id, log.log_date)
        )
        return dict(cursor.fetchone())


@router.delete("/logs/{log_date}")
def delete_water_log(
    log_date: date,
    current_user: User = Depends(get_current_user)
):
    """Delete water log for a specific date"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM water_logs WHERE user_id = ? AND log_date = ?",
            (current_user.id, log_date)
        )
        if cursor.rowcount == 0:
            raise HTTPException(404, "Water log not found")
        return {"status": "deleted"}
