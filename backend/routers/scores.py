from fastapi import APIRouter, Query
from datetime import date, timedelta

from database import get_db
from models import ScoreResponse, CategorySummary

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


def calculate_max_points_and_activities(activities: list, start_date: date, end_date: date) -> tuple[int, int]:
    """Calculate max possible points and total scheduled activities for a period.

    Helper function to avoid code duplication.
    """
    max_possible_points = 0
    total_scheduled_activities = 0
    current = start_date

    while current <= end_date:
        for activity in activities:
            if is_scheduled_for_day(activity["days_of_week"], current):
                max_possible_points += activity["points"]
                total_scheduled_activities += 1
        current += timedelta(days=1)

    return max_possible_points, total_scheduled_activities


@router.get("/category-summary", response_model=list[CategorySummary])
def get_category_summary(days: int = Query(default=7, ge=1, le=90)):
    """Get score summaries grouped by category for the past N days.

    Uses a single query to fetch all data, then processes in memory to avoid N+1 query problem.
    """
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    end_date = today

    with get_db() as conn:
        cursor = conn.cursor()

        # Fetch ALL data in ONE query using LEFT JOINs
        # This eliminates the N+1 query problem
        cursor.execute("""
            SELECT
                c.id as category_id,
                c.name as category_name,
                c.color as category_color,
                a.id as activity_id,
                a.points,
                a.days_of_week,
                al.completed_at
            FROM categories c
            LEFT JOIN activities a ON a.category_id = c.id AND a.is_active = 1
            LEFT JOIN activity_logs al ON al.activity_id = a.id
                AND al.completed_at >= ? AND al.completed_at <= ?
            WHERE c.is_active = 1
            ORDER BY c.name, a.id
        """, (start_date.isoformat(), end_date.isoformat()))

        category_rows = cursor.fetchall()

        # Fetch uncategorized activities separately
        cursor.execute("""
            SELECT
                a.id as activity_id,
                a.points,
                a.days_of_week,
                al.completed_at
            FROM activities a
            LEFT JOIN activity_logs al ON al.activity_id = a.id
                AND al.completed_at >= ? AND al.completed_at <= ?
            WHERE a.is_active = 1 AND a.category_id IS NULL
            ORDER BY a.id
        """, (start_date.isoformat(), end_date.isoformat()))

        uncategorized_rows = cursor.fetchall()

        # Process results in memory (much faster than multiple DB queries)
        category_data = {}

        # Group data by category
        for row in category_rows:
            cat_id = row['category_id']
            if cat_id not in category_data:
                category_data[cat_id] = {
                    'name': row['category_name'],
                    'color': row['category_color'],
                    'activities': {},
                    'logs': []
                }

            if row['activity_id']:
                if row['activity_id'] not in category_data[cat_id]['activities']:
                    category_data[cat_id]['activities'][row['activity_id']] = {
                        'points': row['points'],
                        'days_of_week': row['days_of_week']
                    }

                if row['completed_at']:
                    category_data[cat_id]['logs'].append({
                        'points': row['points'],
                        'completed_at': row['completed_at']
                    })

        # Process uncategorized activities
        uncategorized_data = {
            'activities': {},
            'logs': []
        }

        for row in uncategorized_rows:
            if row['activity_id'] not in uncategorized_data['activities']:
                uncategorized_data['activities'][row['activity_id']] = {
                    'points': row['points'],
                    'days_of_week': row['days_of_week']
                }

            if row['completed_at']:
                uncategorized_data['logs'].append({
                    'points': row['points'],
                    'completed_at': row['completed_at']
                })

        # Now calculate summaries from in-memory data
        summaries = []

        for cat_id, data in category_data.items():
            if not data['activities']:
                continue

            # Convert activities dict to list for calculation function
            activities_list = [
                {'points': v['points'], 'days_of_week': v['days_of_week']}
                for v in data['activities'].values()
            ]

            max_possible_points, total_scheduled_activities = calculate_max_points_and_activities(
                activities_list, start_date, end_date
            )

            total_points = sum(log['points'] for log in data['logs'])
            completed_count = len(data['logs'])
            percentage = (completed_count / total_scheduled_activities * 100) if total_scheduled_activities > 0 else 0.0

            summaries.append(CategorySummary(
                category_id=cat_id,
                category_name=data['name'],
                category_color=data['color'],
                total_points=total_points,
                max_possible_points=max_possible_points,
                completed_count=completed_count,
                total_activities=total_scheduled_activities,
                percentage=round(percentage, 1)
            ))

        # Add uncategorized summary if there are uncategorized activities
        if uncategorized_data['activities']:
            activities_list = [
                {'points': v['points'], 'days_of_week': v['days_of_week']}
                for v in uncategorized_data['activities'].values()
            ]

            max_possible_points, total_scheduled_activities = calculate_max_points_and_activities(
                activities_list, start_date, end_date
            )

            total_points = sum(log['points'] for log in uncategorized_data['logs'])
            completed_count = len(uncategorized_data['logs'])
            percentage = (completed_count / total_scheduled_activities * 100) if total_scheduled_activities > 0 else 0.0

            summaries.append(CategorySummary(
                category_id=None,
                category_name="Uncategorized",
                category_color="#6B7280",
                total_points=total_points,
                max_possible_points=max_possible_points,
                completed_count=completed_count,
                total_activities=total_scheduled_activities,
                percentage=round(percentage, 1)
            ))

        return summaries
