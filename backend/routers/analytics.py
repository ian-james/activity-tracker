from fastapi import APIRouter, Depends, Query
from auth.middleware import get_current_user
from database import get_db
from models import User
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def calculate_streaks(logs: List[tuple], activity_id: int) -> Dict:
    """
    Calculate current streak and longest streak for an activity.
    A streak is maintained if the activity is completed at least once per day.
    """
    if not logs:
        return {"current_streak": 0, "longest_streak": 0, "last_completed": None}

    # Sort logs by date (most recent first)
    dates = sorted(set(log[0] for log in logs if log[1] == activity_id), reverse=True)

    if not dates:
        return {"current_streak": 0, "longest_streak": 0, "last_completed": None}

    # Calculate current streak
    current_streak = 0
    today = datetime.utcnow().date()
    expected_date = today

    # Check if the streak is still active (completed today or yesterday)
    if dates[0] == str(today):
        expected_date = today
    elif dates[0] == str(today - timedelta(days=1)):
        expected_date = today - timedelta(days=1)
    else:
        # Streak is broken if last completion was more than 1 day ago
        current_streak = 0
        longest_streak = _calculate_longest_streak(dates)
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_completed": dates[0]
        }

    # Count consecutive days
    for date_str in dates:
        date = datetime.fromisoformat(date_str).date()
        if date == expected_date:
            current_streak += 1
            expected_date = date - timedelta(days=1)
        else:
            break

    # Calculate longest streak
    longest_streak = max(current_streak, _calculate_longest_streak(dates))

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_completed": dates[0]
    }


def _calculate_longest_streak(dates: List[str]) -> int:
    """Calculate the longest streak from a list of dates."""
    if not dates:
        return 0

    max_streak = 1
    current_streak = 1

    for i in range(len(dates) - 1):
        curr_date = datetime.fromisoformat(dates[i]).date()
        next_date = datetime.fromisoformat(dates[i + 1]).date()

        if (curr_date - next_date).days == 1:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1

    return max_streak


@router.get("/streaks")
async def get_streaks(current_user: User = Depends(get_current_user)):
    """
    Get streak information for all active activities.
    Returns current streak, longest streak, and last completed date for each activity.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get all active activities with category info
            cursor.execute("""
                SELECT a.id, a.name, a.points, a.category_id,
                       c.name as category_name, c.color as category_color
                FROM activities a
                LEFT JOIN categories c ON a.category_id = c.id
                WHERE a.user_id = ? AND a.is_active = 1
                ORDER BY a.name
            """, (current_user.id,))
            activities = cursor.fetchall()

            # Get all logs for this user
            cursor.execute("""
                SELECT completed_at, activity_id
                FROM activity_logs
                WHERE user_id = ?
                ORDER BY completed_at DESC
            """, (current_user.id,))
            all_logs = cursor.fetchall()

            streaks = []
            total_current_streak = 0
            total_longest_streak = 0

            for activity in activities:
                activity_id = activity['id']
                streak_info = calculate_streaks(all_logs, activity_id)

                streaks.append({
                    "activity_id": activity_id,
                    "activity_name": activity['name'],
                    "points": activity['points'],
                    "current_streak": streak_info['current_streak'],
                    "longest_streak": streak_info['longest_streak'],
                    "last_completed": streak_info['last_completed'],
                    "category_id": activity['category_id'],
                    "category_name": activity['category_name'],
                    "category_color": activity['category_color']
                })

                total_current_streak += streak_info['current_streak']
                total_longest_streak += streak_info['longest_streak']

            # Sort by current streak (descending)
            streaks.sort(key=lambda x: x['current_streak'], reverse=True)

            return {
                "streaks": streaks,
                "summary": {
                    "total_activities": len(activities),
                    "active_streaks": sum(1 for s in streaks if s['current_streak'] > 0),
                    "best_current_streak": max((s['current_streak'] for s in streaks), default=0),
                    "best_longest_streak": max((s['longest_streak'] for s in streaks), default=0)
                }
            }

    except Exception as e:
        logger.error(f"Failed to get streaks for user {current_user.email}: {e}")
        return {"streaks": [], "summary": {}}


@router.get("/statistics")
async def get_statistics(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed statistics and analytics for activities.
    - Completion rate by day of week
    - Best/worst performing activities
    - Time trends
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Date range for analysis - end at today, not future
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)

            # Get the first log date to avoid counting expectations before user started
            cursor.execute(
                "SELECT MIN(completed_at) as first_log FROM activity_logs WHERE user_id = ?",
                (current_user.id,)
            )
            first_log_row = cursor.fetchone()
            if first_log_row and first_log_row['first_log']:
                first_log_date = datetime.fromisoformat(first_log_row['first_log']).date()
                # Start from first log if it's later than requested start_date
                start_date = max(start_date, first_log_date)

            # Get all active activities
            cursor.execute("""
                SELECT id, name, points, days_of_week
                FROM activities
                WHERE user_id = ? AND is_active = 1
            """, (current_user.id,))
            activities = {row['id']: dict(row) for row in cursor.fetchall()}

            # Get logs in date range
            cursor.execute("""
                SELECT activity_id, completed_at
                FROM activity_logs
                WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?
                ORDER BY completed_at
            """, (current_user.id, str(start_date), str(end_date)))
            logs = cursor.fetchall()

            # Calculate completion rate by day of week (0=Monday, 6=Sunday)
            day_of_week_counts = {i: {"completed": 0, "total": 0} for i in range(7)}
            activity_stats = {}

            # Initialize activity stats
            for act_id, act in activities.items():
                activity_stats[act_id] = {
                    "name": act['name'],
                    "points": act['points'],
                    "completed": 0,
                    "expected": 0,
                    "completion_rate": 0.0,
                    "by_day_of_week": {i: 0 for i in range(7)}
                }

            # Count expected completions for each activity
            # Calculate actual days in range (adjusted for first log and today)
            actual_days = (end_date - start_date).days + 1
            for single_date in (start_date + timedelta(n) for n in range(actual_days)):
                # Skip future dates
                if single_date > end_date:
                    break
                day_of_week = single_date.weekday()

                for act_id, act in activities.items():
                    days_of_week = act.get('days_of_week')

                    # If days_of_week is None, activity is expected every day
                    if days_of_week is None:
                        activity_stats[act_id]["expected"] += 1
                        day_of_week_counts[day_of_week]["total"] += 1
                    else:
                        # Parse days_of_week (stored as comma-separated string)
                        day_names = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
                        expected_days = days_of_week.split(',') if days_of_week else []

                        if day_names[day_of_week] in expected_days:
                            activity_stats[act_id]["expected"] += 1
                            day_of_week_counts[day_of_week]["total"] += 1

            # Count actual completions
            for log in logs:
                activity_id = log['activity_id']
                if activity_id not in activity_stats:
                    continue

                completed_date = datetime.fromisoformat(log['completed_at']).date()
                day_of_week = completed_date.weekday()

                activity_stats[activity_id]["completed"] += 1
                activity_stats[activity_id]["by_day_of_week"][day_of_week] += 1
                day_of_week_counts[day_of_week]["completed"] += 1

            # Calculate completion rates
            for act_id in activity_stats:
                expected = activity_stats[act_id]["expected"]
                if expected > 0:
                    activity_stats[act_id]["completion_rate"] = (
                        activity_stats[act_id]["completed"] / expected * 100
                    )

            # Calculate day of week completion rates
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            completion_by_day = []
            for day in range(7):
                total = day_of_week_counts[day]["total"]
                completed = day_of_week_counts[day]["completed"]
                rate = (completed / total * 100) if total > 0 else 0
                completion_by_day.append({
                    "day": day_names[day],
                    "day_num": day,
                    "completed": completed,
                    "total": total,
                    "completion_rate": round(rate, 1)
                })

            # Get best and worst performing activities
            # Filter out activities with 0 expected completions (not scheduled during this period)
            activity_list = [a for a in activity_stats.values() if a['expected'] > 0]
            activity_list.sort(key=lambda x: x['completion_rate'], reverse=True)

            best_activities = activity_list[:5] if len(activity_list) >= 5 else activity_list
            worst_activities = list(reversed(activity_list[-5:])) if len(activity_list) >= 5 else list(reversed(activity_list))

            # Calculate time trends (compare first half vs second half)
            # Use actual_days instead of requested days for accurate trend calculation
            mid_date = start_date + timedelta(days=actual_days // 2)
            first_half_logs = [log for log in logs if datetime.fromisoformat(log['completed_at']).date() < mid_date]
            second_half_logs = [log for log in logs if datetime.fromisoformat(log['completed_at']).date() >= mid_date]

            first_half_days = actual_days // 2
            second_half_days = actual_days - first_half_days
            first_half_rate = len(first_half_logs) / first_half_days if first_half_days > 0 else 0
            second_half_rate = len(second_half_logs) / second_half_days if second_half_days > 0 else 0

            trend = "stable"
            if second_half_rate > first_half_rate * 1.1:
                trend = "improving"
            elif second_half_rate < first_half_rate * 0.9:
                trend = "declining"

            return {
                "date_range": {
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "days": actual_days
                },
                "completion_by_day_of_week": completion_by_day,
                "best_activities": best_activities,
                "worst_activities": worst_activities,
                "overall_stats": {
                    "total_activities": len(activities),
                    "total_completions": len(logs),
                    "average_per_day": round(len(logs) / actual_days, 1) if actual_days > 0 else 0,
                    "overall_completion_rate": round(
                        (len(logs) / sum(a["expected"] for a in activity_stats.values()) * 100)
                        if sum(a["expected"] for a in activity_stats.values()) > 0 else 0,
                        1
                    )
                },
                "trend": {
                    "direction": trend,
                    "first_half_avg": round(first_half_rate, 1),
                    "second_half_avg": round(second_half_rate, 1)
                }
            }

    except Exception as e:
        logger.error(f"Failed to get statistics for user {current_user.email}: {e}")
        return {"error": str(e)}
