from fastapi import APIRouter, Query
from datetime import date, timedelta

from database import get_db
from models import ScoreResponse

router = APIRouter(prefix="/api/scores", tags=["scores"])

# Map Python weekday() to day abbreviations
WEEKDAY_MAP = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


def is_scheduled_for_day(days_of_week: str | None, check_date: date) -> bool:
    """Check if an activity is scheduled for a specific date."""
    if days_of_week is None:
        return True  # No schedule means every day
    scheduled_days = days_of_week.split(',')
    day_name = WEEKDAY_MAP[check_date.weekday()]
    return day_name in scheduled_days


def calculate_score(start_date: date, end_date: date, period: str) -> ScoreResponse:
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM activities WHERE is_active = 1")
        activities = cursor.fetchall()

        if len(activities) == 0:
            return ScoreResponse(
                period=period,
                start_date=start_date,
                end_date=end_date,
                total_points=0,
                max_possible_points=0,
                completed_count=0,
                total_activities=0,
                percentage=0.0
            )

        # Calculate max possible points considering schedules
        max_possible_points = 0
        total_scheduled_activities = 0
        current = start_date
        while current <= end_date:
            for activity in activities:
                if is_scheduled_for_day(activity["days_of_week"], current):
                    max_possible_points += activity["points"]
                    total_scheduled_activities += 1
            current += timedelta(days=1)

        # Get completed activities
        cursor.execute("""
            SELECT al.activity_id, al.completed_at, a.points
            FROM activity_logs al
            JOIN activities a ON al.activity_id = a.id
            WHERE al.completed_at >= ? AND al.completed_at <= ?
        """, (start_date.isoformat(), end_date.isoformat()))
        logs = cursor.fetchall()

        total_points = sum(log["points"] for log in logs)
        completed_count = len(logs)
        percentage = (completed_count / total_scheduled_activities * 100) if total_scheduled_activities > 0 else 0.0

        return ScoreResponse(
            period=period,
            start_date=start_date,
            end_date=end_date,
            total_points=total_points,
            max_possible_points=max_possible_points,
            completed_count=completed_count,
            total_activities=total_scheduled_activities,
            percentage=round(percentage, 1)
        )


@router.get("/daily", response_model=ScoreResponse)
def get_daily_score(date: date = Query(default_factory=date.today)):
    return calculate_score(date, date, "daily")


@router.get("/weekly", response_model=ScoreResponse)
def get_weekly_score(date: date = Query(default_factory=date.today)):
    start_of_week = date - timedelta(days=date.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    return calculate_score(start_of_week, end_of_week, "weekly")


@router.get("/monthly", response_model=ScoreResponse)
def get_monthly_score(year: int = Query(...), month: int = Query(...)):
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    return calculate_score(start_date, end_date, "monthly")


@router.get("/history")
def get_score_history(days: int = Query(default=7, ge=1, le=90)):
    """Get daily scores for the past N days."""
    today = date.today()
    history = []

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        score = calculate_score(day, day, "daily")
        history.append({
            "date": day.isoformat(),
            "total_points": score.total_points,
            "max_possible_points": score.max_possible_points,
            "percentage": score.percentage,
            "completed_count": score.completed_count,
            "total_activities": score.total_activities,
        })

    return history
