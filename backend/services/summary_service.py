"""
Summary service for aggregating weekly data for email notifications.
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from database import get_db
import random


def get_weekly_summary(user_id: int, end_date: Optional[date] = None) -> Dict:
    """
    Aggregate all data needed for weekly summary email.

    Args:
        user_id: The user ID
        end_date: End date for the week (defaults to today)

    Returns:
        Dictionary with all summary data
    """
    if end_date is None:
        end_date = date.today()

    start_date = end_date - timedelta(days=6)  # Last 7 days

    # Get daily breakdown
    daily_breakdown = get_daily_breakdown(user_id, start_date, end_date)

    # Calculate summary metrics
    summary = calculate_summary_metrics(daily_breakdown)

    # Get category progress
    category_progress = get_category_progress(user_id, start_date, end_date)

    # Get open todos
    open_todos = get_open_todos(user_id)

    # Get workout summary
    workout_summary = get_workout_summary(user_id, start_date, end_date)

    # Get best streak
    streaks = get_best_streak(user_id)

    # Get motivational message
    motivational_message = get_motivational_message(summary['avg_completion'])

    return {
        'date_range': f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}",
        'summary': summary,
        'daily_breakdown': daily_breakdown,
        'category_progress': category_progress,
        'open_todos': open_todos,
        'workout_summary': workout_summary,
        'streaks': streaks,
        'motivational_message': motivational_message
    }


def get_daily_breakdown(user_id: int, start_date: date, end_date: date) -> List[Dict]:
    """Get daily completion percentages for the week."""
    daily_data = []

    with get_db() as conn:
        cursor = conn.cursor()

        current_date = start_date
        while current_date <= end_date:
            # Get activities scheduled for this day
            cursor.execute("""
                SELECT id, points, days_of_week, schedule_frequency, biweekly_start_date
                FROM activities
                WHERE user_id = ? AND is_active = 1
            """, (user_id,))
            activities = cursor.fetchall()

            # Check if this is a special day
            cursor.execute("""
                SELECT day_type FROM special_days
                WHERE user_id = ? AND date = ?
            """, (user_id, current_date.isoformat()))
            special_day = cursor.fetchone()

            if special_day:
                # Special days count as 100%
                daily_data.append({
                    'date': current_date.isoformat(),
                    'percentage': 100,
                    'completed': 0,
                    'total': 0,
                    'special_day': special_day['day_type']
                })
            else:
                total_possible = 0
                total_earned = 0
                completed_count = 0
                total_count = 0

                for activity in activities:
                    if is_scheduled_for_day(
                        activity['days_of_week'],
                        current_date,
                        activity['schedule_frequency'],
                        date.fromisoformat(activity['biweekly_start_date']) if activity['biweekly_start_date'] else None
                    ):
                        total_count += 1
                        total_possible += abs(activity['points'])

                        # Check if completed
                        cursor.execute("""
                            SELECT id FROM activity_logs
                            WHERE activity_id = ? AND completed_at = ?
                        """, (activity['id'], current_date.isoformat()))
                        log = cursor.fetchone()

                        if log:
                            completed_count += 1
                            total_earned += activity['points']

                percentage = (total_earned / total_possible * 100) if total_possible > 0 else 0

                daily_data.append({
                    'date': current_date.isoformat(),
                    'percentage': round(percentage, 1),
                    'completed': completed_count,
                    'total': total_count
                })

            current_date += timedelta(days=1)

    return daily_data


def calculate_summary_metrics(daily_breakdown: List[Dict]) -> Dict:
    """Calculate overall summary metrics from daily breakdown."""
    if not daily_breakdown:
        return {
            'avg_completion': 0,
            'total_points': 0,
            'best_day': 'N/A',
            'trend': None
        }

    # Calculate average completion
    avg_completion = sum(d['percentage'] for d in daily_breakdown) / len(daily_breakdown)

    # Find best day
    best_day_data = max(daily_breakdown, key=lambda x: x['percentage'])
    best_day_date = date.fromisoformat(best_day_data['date'])
    best_day = best_day_date.strftime('%A')

    # Calculate trend (compare first half to second half)
    mid = len(daily_breakdown) // 2
    first_half_avg = sum(d['percentage'] for d in daily_breakdown[:mid]) / mid if mid > 0 else 0
    second_half_avg = sum(d['percentage'] for d in daily_breakdown[mid:]) / (len(daily_breakdown) - mid)

    if second_half_avg > first_half_avg + 5:
        trend = 'up'
    elif second_half_avg < first_half_avg - 5:
        trend = 'down'
    else:
        trend = 'steady'

    # Calculate total points (sum of all completions)
    total_points = sum(d.get('completed', 0) * 10 for d in daily_breakdown)  # Approximate

    return {
        'avg_completion': round(avg_completion, 1),
        'total_points': total_points,
        'best_day': best_day,
        'trend': trend
    }


def get_category_progress(user_id: int, start_date: date, end_date: date) -> List[Dict]:
    """Get category breakdown for the week."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get all categories with their activities
        cursor.execute("""
            SELECT
                c.id,
                c.name,
                c.color,
                COUNT(DISTINCT a.id) as activity_count
            FROM categories c
            LEFT JOIN activities a ON c.id = a.category_id AND a.is_active = 1 AND a.user_id = ?
            WHERE c.is_active = 1 AND c.user_id = ?
            GROUP BY c.id
            HAVING activity_count > 0
        """, (user_id, user_id))

        categories = cursor.fetchall()
        category_data = []

        for category in categories:
            # Calculate completion for this category
            cursor.execute("""
                SELECT
                    a.id,
                    a.points,
                    a.days_of_week,
                    a.schedule_frequency,
                    a.biweekly_start_date
                FROM activities a
                WHERE a.category_id = ? AND a.is_active = 1 AND a.user_id = ?
            """, (category['id'], user_id))

            activities = cursor.fetchall()
            total_possible = 0
            total_earned = 0

            for activity in activities:
                # Count expected occurrences in date range
                current_date = start_date
                while current_date <= end_date:
                    if is_scheduled_for_day(
                        activity['days_of_week'],
                        current_date,
                        activity['schedule_frequency'],
                        date.fromisoformat(activity['biweekly_start_date']) if activity['biweekly_start_date'] else None
                    ):
                        total_possible += abs(activity['points'])

                        # Check if completed
                        cursor.execute("""
                            SELECT id FROM activity_logs
                            WHERE activity_id = ? AND completed_at = ?
                        """, (activity['id'], current_date.isoformat()))

                        if cursor.fetchone():
                            total_earned += activity['points']

                    current_date += timedelta(days=1)

            percentage = (total_earned / total_possible * 100) if total_possible > 0 else 0

            category_data.append({
                'name': category['name'],
                'color': category['color'],
                'percentage': round(percentage, 1),
                'completed': 0,  # Placeholder
                'total': 0  # Placeholder
            })

        # Sort by percentage descending and return top 5
        category_data.sort(key=lambda x: x['percentage'], reverse=True)
        return category_data[:5]


def get_open_todos(user_id: int) -> Dict:
    """Get all open todos grouped by category."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT text, category
            FROM todos
            WHERE user_id = ? AND is_completed = 0
            ORDER BY order_index
        """, (user_id,))

        todos = cursor.fetchall()

        personal = [{'text': t['text']} for t in todos if t['category'] == 'personal']
        professional = [{'text': t['text']} for t in todos if t['category'] == 'professional']

        return {
            'personal': personal[:5],  # Limit to 5 each
            'professional': professional[:5],
            'count': len(todos)
        }


def get_workout_summary(user_id: int, start_date: date, end_date: date) -> Dict:
    """Get workout summary for the week."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                COUNT(*) as session_count,
                SUM(total_duration) as total_duration
            FROM workout_sessions
            WHERE user_id = ?
                AND completed_at IS NOT NULL
                AND DATE(completed_at) >= ?
                AND DATE(completed_at) <= ?
        """, (user_id, start_date.isoformat(), end_date.isoformat()))

        result = cursor.fetchone()

        sessions = result['session_count'] if result else 0
        total_duration = result['total_duration'] if result and result['total_duration'] else 0

        # Convert seconds to minutes
        total_duration_minutes = total_duration // 60

        # Generate progression note
        progression_notes = None
        if sessions > 0:
            if sessions >= 5:
                progression_notes = "🔥 Excellent consistency this week!"
            elif sessions >= 3:
                progression_notes = "💪 Great work staying active!"
            else:
                progression_notes = "👍 Good start, keep it up!"

        return {
            'sessions': sessions,
            'total_duration': total_duration_minutes,
            'progression_notes': progression_notes
        }


def get_best_streak(user_id: int) -> Dict:
    """Get the best current streak across all activities."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name FROM activities
            WHERE user_id = ? AND is_active = 1
        """, (user_id,))

        activities = cursor.fetchall()

        best_streak = 0
        best_activity = None

        for activity in activities:
            # Get all logs for this activity
            cursor.execute("""
                SELECT completed_at
                FROM activity_logs
                WHERE activity_id = ?
                ORDER BY completed_at DESC
            """, (activity['id'],))

            logs = cursor.fetchall()

            if not logs:
                continue

            # Calculate current streak
            streak = calculate_current_streak([log['completed_at'] for log in logs])

            if streak > best_streak:
                best_streak = streak
                best_activity = activity['name']

        return {
            'best_current': best_streak,
            'activity_name': best_activity
        }


def calculate_current_streak(dates: List[str]) -> int:
    """Calculate current streak from list of completion dates."""
    if not dates:
        return 0

    # Convert to date objects
    date_objects = sorted([date.fromisoformat(d) for d in dates], reverse=True)

    today = date.today()
    expected_date = today

    # Check if streak is still active
    if date_objects[0] != today and date_objects[0] != today - timedelta(days=1):
        return 0

    if date_objects[0] == today - timedelta(days=1):
        expected_date = today - timedelta(days=1)

    # Count consecutive days
    streak = 0
    for d in date_objects:
        if d == expected_date:
            streak += 1
            expected_date -= timedelta(days=1)
        else:
            break

    return streak


def get_motivational_message(avg_completion: float) -> str:
    """Get a motivational message based on performance."""
    if avg_completion >= 90:
        messages = [
            "Outstanding work this week! You're crushing it! 🌟",
            "Absolutely phenomenal! Keep up the amazing work! 🎉",
            "You're on fire! This is what excellence looks like! 🔥"
        ]
    elif avg_completion >= 70:
        messages = [
            "Great job this week! You're making solid progress! 💪",
            "Well done! You're building strong habits! 👏",
            "Nice work! Keep up the momentum! ⭐"
        ]
    elif avg_completion >= 50:
        messages = [
            "Good effort this week! There's room to improve! 💪",
            "You're on the right track! Keep pushing forward! 🚀",
            "Solid start! Let's aim higher next week! 📈"
        ]
    else:
        messages = [
            "Every journey starts with a single step. You've got this! 🌱",
            "Progress over perfection! Let's make next week even better! 💫",
            "Don't give up! Small steps lead to big changes! 🌟"
        ]

    return random.choice(messages)


def is_scheduled_for_day(
    days_of_week: str | None,
    check_date: date,
    schedule_frequency: str = 'weekly',
    biweekly_start_date: date | None = None
) -> bool:
    """Check if an activity is scheduled for a specific date."""
    WEEKDAY_MAP = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

    # Check biweekly scheduling
    if schedule_frequency == 'biweekly':
        if biweekly_start_date is None:
            return False
        days_diff = (check_date - biweekly_start_date).days
        if days_diff < 0:
            return False
        weeks_diff = days_diff // 7
        if weeks_diff % 2 != 0:
            return False

    # Check day of week
    if days_of_week is None:
        return True
    scheduled_days = days_of_week.split(',')
    day_name = WEEKDAY_MAP[check_date.weekday()]
    return day_name in scheduled_days
