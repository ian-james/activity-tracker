from fastapi import APIRouter, Query, Depends
from datetime import date, timedelta

from database import get_db
from models import ScoreResponse, CategorySummary, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/scores", tags=["scores"])

# Map Python weekday() to day abbreviations
WEEKDAY_MAP = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


def is_scheduled_for_day(
    days_of_week: str | None,
    check_date: date,
    schedule_frequency: str = 'weekly',
    biweekly_start_date: date | None = None
) -> bool:
    """Check if an activity is scheduled for a specific date.

    Handles both weekly and biweekly scheduling.
    For biweekly, the activity appears every other week starting from biweekly_start_date.
    """
    # Check biweekly scheduling first
    if schedule_frequency == 'biweekly':
        if biweekly_start_date is None:
            return False
        # Calculate weeks difference from start date
        days_diff = (check_date - biweekly_start_date).days
        if days_diff < 0:
            return False  # Before start date
        weeks_diff = days_diff // 7
        # Only show on even weeks (0, 2, 4, ...)
        if weeks_diff % 2 != 0:
            return False

    # Check day of week
    if days_of_week is None:
        return True  # No schedule means every day
    scheduled_days = days_of_week.split(',')
    day_name = WEEKDAY_MAP[check_date.weekday()]
    return day_name in scheduled_days


def calculate_score(start_date: date, end_date: date, period: str, user_id: int) -> ScoreResponse:
    """Calculate score for a user for a specific date range."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM activities WHERE is_active = 1 AND user_id = ?",
            (user_id,)
        )
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

        # Get special days for this date range
        cursor.execute(
            "SELECT date FROM special_days WHERE user_id = ? AND date >= ? AND date <= ?",
            (user_id, start_date, end_date)
        )
        special_days_rows = cursor.fetchall()
        special_days = {date.fromisoformat(row['date']) for row in special_days_rows}

        # Get the first log date for this user to avoid counting expectations before they started
        cursor.execute(
            "SELECT MIN(completed_at) as first_log FROM activity_logs WHERE user_id = ?",
            (user_id,)
        )
        first_log_row = cursor.fetchone()
        first_log_date = None
        if first_log_row and first_log_row['first_log']:
            first_log_date = date.fromisoformat(first_log_row['first_log'])

        # Don't count expectations before first log or after today
        today = date.today()
        actual_start = start_date
        actual_end = min(end_date, today)

        # If user has logged before, start from the later of start_date or first_log_date
        if first_log_date:
            actual_start = max(start_date, first_log_date)

        # If the adjusted range is invalid, return empty score
        if actual_start > actual_end:
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

        # Calculate max possible points considering schedules and special days
        # Only positive points contribute to max_possible_points
        max_possible_points = 0
        total_scheduled_activities = 0
        current = actual_start
        while current <= actual_end:
            # Skip special days (rest/recovery/vacation)
            if current not in special_days:
                for activity in activities:
                    # Pass new scheduling parameters
                    schedule_freq = activity["schedule_frequency"] if activity["schedule_frequency"] else "weekly"
                    biweekly_date = date.fromisoformat(activity["biweekly_start_date"]) if activity["biweekly_start_date"] else None
                    if is_scheduled_for_day(
                        activity["days_of_week"],
                        current,
                        schedule_freq,
                        biweekly_date
                    ):
                        # Only add positive points to max possible
                        if activity["points"] > 0:
                            max_possible_points += activity["points"]
                        total_scheduled_activities += 1
            current += timedelta(days=1)

        # Get completed activities for user
        cursor.execute("""
            SELECT al.activity_id, al.completed_at, a.points
            FROM activity_logs al
            JOIN activities a ON al.activity_id = a.id
            WHERE al.completed_at >= ? AND al.completed_at <= ? AND al.user_id = ?
        """, (start_date.isoformat(), end_date.isoformat(), user_id))
        logs = cursor.fetchall()

        # Debug output
        print(f"\n=== SCORE CALC DEBUG ===")
        print(f"Date range: {start_date} to {end_date}, user {user_id}")
        print(f"Query params: start={start_date.isoformat()}, end={end_date.isoformat()}")
        print(f"Found {len(logs)} logs")
        print(f"Max possible points: {max_possible_points}, Total scheduled: {total_scheduled_activities}")
        for log in logs[:5]:  # Show first 5
            print(f"  Log: activity_id={log['activity_id']}, date={log['completed_at']}, points={log['points']}")

        # Only count positive points toward the score display
        # Negative points are for tracking bad habits but don't reduce the visible score
        total_points = sum(log["points"] for log in logs if log["points"] > 0)
        completed_count = len(logs)

        # Calculate percentage based on points earned vs max possible
        percentage = (total_points / max_possible_points * 100) if max_possible_points > 0 else 0.0

        print(f"Result: total_points={total_points}, completed_count={completed_count}, percentage={percentage}")
        print(f"===================\n")

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
def get_daily_score(date: date = Query(default_factory=date.today), current_user: User = Depends(get_current_user)):
    return calculate_score(date, date, "daily", current_user.id)


@router.get("/weekly", response_model=ScoreResponse)
def get_weekly_score(date: date = Query(default_factory=date.today), current_user: User = Depends(get_current_user)):
    start_of_week = date - timedelta(days=date.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    return calculate_score(start_of_week, end_of_week, "weekly", current_user.id)


@router.get("/monthly", response_model=ScoreResponse)
def get_monthly_score(year: int = Query(...), month: int = Query(...), current_user: User = Depends(get_current_user)):
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    return calculate_score(start_date, end_date, "monthly", current_user.id)


@router.get("/history")
def get_score_history(days: int = Query(default=7, ge=1, le=90), current_user: User = Depends(get_current_user)):
    """Get daily scores for the past N days."""
    today = date.today()
    history = []

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        score = calculate_score(day, day, "daily", current_user.id)
        history.append({
            "date": day.isoformat(),
            "total_points": score.total_points,
            "max_possible_points": score.max_possible_points,
            "percentage": score.percentage,
            "completed_count": score.completed_count,
            "total_activities": score.total_activities,
        })

    return history


def calculate_max_points_and_activities(activities: list, start_date: date, end_date: date, user_id: int = None) -> tuple[int, int]:
    """Calculate max possible points and total scheduled activities for a period.

    Helper function to avoid code duplication.
    Optionally takes user_id to adjust for first log date and get special days.
    """
    # Adjust end_date to not include future
    today = date.today()
    actual_end = min(end_date, today)
    actual_start = start_date

    # Get special days if user_id provided
    special_days = set()
    if user_id:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT MIN(completed_at) as first_log FROM activity_logs WHERE user_id = ?",
                (user_id,)
            )
            first_log_row = cursor.fetchone()
            if first_log_row and first_log_row['first_log']:
                first_log_date = date.fromisoformat(first_log_row['first_log'])
                actual_start = max(start_date, first_log_date)

            # Fetch special days
            cursor.execute(
                "SELECT date FROM special_days WHERE user_id = ? AND date >= ? AND date <= ?",
                (user_id, start_date, end_date)
            )
            special_days_rows = cursor.fetchall()
            special_days = {date.fromisoformat(row['date']) for row in special_days_rows}

    # If range is invalid, return zeros
    if actual_start > actual_end:
        return 0, 0

    max_possible_points = 0
    total_scheduled_activities = 0
    current = actual_start

    while current <= actual_end:
        # Skip special days
        if current not in special_days:
            for activity in activities:
                # Pass new scheduling parameters
                schedule_freq = activity["schedule_frequency"] if activity["schedule_frequency"] else "weekly"
                biweekly_date = date.fromisoformat(activity["biweekly_start_date"]) if activity["biweekly_start_date"] else None
                if is_scheduled_for_day(
                    activity["days_of_week"],
                    current,
                    schedule_freq,
                    biweekly_date
                ):
                    # Only add positive points to max possible
                    if activity["points"] > 0:
                        max_possible_points += activity["points"]
                    total_scheduled_activities += 1
        current += timedelta(days=1)

    return max_possible_points, total_scheduled_activities


@router.get("/category-summary", response_model=list[CategorySummary])
def get_category_summary(days: int = Query(default=7, ge=1, le=90), current_user: User = Depends(get_current_user)):
    """Get score summaries grouped by category for the past N days.

    Uses a single query to fetch all data, then processes in memory to avoid N+1 query problem.
    """
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    end_date = today

    # Adjust start_date based on first log
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT MIN(completed_at) as first_log FROM activity_logs WHERE user_id = ?",
            (current_user.id,)
        )
        first_log_row = cursor.fetchone()
        if first_log_row and first_log_row['first_log']:
            first_log_date = date.fromisoformat(first_log_row['first_log'])
            start_date = max(start_date, first_log_date)

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
                a.schedule_frequency,
                a.biweekly_start_date,
                al.completed_at
            FROM categories c
            LEFT JOIN activities a ON a.category_id = c.id AND a.is_active = 1 AND a.user_id = ?
            LEFT JOIN activity_logs al ON al.activity_id = a.id
                AND al.completed_at >= ? AND al.completed_at <= ? AND al.user_id = ?
            WHERE c.is_active = 1 AND c.user_id = ?
            ORDER BY c.name, a.id
        """, (current_user.id, start_date.isoformat(), end_date.isoformat(), current_user.id, current_user.id))

        category_rows = cursor.fetchall()

        # Fetch uncategorized activities separately
        cursor.execute("""
            SELECT
                a.id as activity_id,
                a.points,
                a.days_of_week,
                a.schedule_frequency,
                a.biweekly_start_date,
                al.completed_at
            FROM activities a
            LEFT JOIN activity_logs al ON al.activity_id = a.id
                AND al.completed_at >= ? AND al.completed_at <= ? AND al.user_id = ?
            WHERE a.is_active = 1 AND a.category_id IS NULL AND a.user_id = ?
            ORDER BY a.id
        """, (start_date.isoformat(), end_date.isoformat(), current_user.id, current_user.id))

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
                        'days_of_week': row['days_of_week'],
                        'schedule_frequency': row['schedule_frequency'],
                        'biweekly_start_date': row['biweekly_start_date']
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
                    'days_of_week': row['days_of_week'],
                    'schedule_frequency': row['schedule_frequency'],
                    'biweekly_start_date': row['biweekly_start_date']
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
                {
                    'points': v['points'],
                    'days_of_week': v['days_of_week'],
                    'schedule_frequency': v['schedule_frequency'],
                    'biweekly_start_date': v['biweekly_start_date']
                }
                for v in data['activities'].values()
            ]

            max_possible_points, total_scheduled_activities = calculate_max_points_and_activities(
                activities_list, start_date, end_date, current_user.id
            )

            # Only count positive points toward the score display
            total_points = sum(log['points'] for log in data['logs'] if log['points'] > 0)
            completed_count = len(data['logs'])
            percentage = (total_points / max_possible_points * 100) if max_possible_points > 0 else 0.0

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
                {
                    'points': v['points'],
                    'days_of_week': v['days_of_week'],
                    'schedule_frequency': v['schedule_frequency'],
                    'biweekly_start_date': v['biweekly_start_date']
                }
                for v in uncategorized_data['activities'].values()
            ]

            max_possible_points, total_scheduled_activities = calculate_max_points_and_activities(
                activities_list, start_date, end_date, current_user.id
            )

            # Only count positive points toward the score display
            total_points = sum(log['points'] for log in uncategorized_data['logs'] if log['points'] > 0)
            completed_count = len(uncategorized_data['logs'])
            percentage = (total_points / max_possible_points * 100) if max_possible_points > 0 else 0.0

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
