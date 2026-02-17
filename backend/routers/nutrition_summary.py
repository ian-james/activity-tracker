from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import DailyNutritionSummary, User
from auth.middleware import get_current_user
from datetime import date

router = APIRouter(prefix="/api/nutrition/summary", tags=["nutrition-summary"])


@router.get("/daily", response_model=DailyNutritionSummary)
def get_daily_summary(
    target_date: str = None,
    current_user: User = Depends(get_current_user)
):
    """Get nutrition summary for a specific date with activity-adjusted goals"""
    if target_date is None:
        target_date = date.today().isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        # Get nutrition goals
        cursor.execute(
            "SELECT * FROM nutrition_goals WHERE user_id = ?",
            (current_user.id,)
        )
        goals_row = cursor.fetchone()

        if not goals_row:
            # Create default goals
            cursor.execute(
                "INSERT INTO nutrition_goals (user_id) VALUES (?)",
                (current_user.id,)
            )
            cursor.execute(
                "SELECT * FROM nutrition_goals WHERE user_id = ?",
                (current_user.id,)
            )
            goals_row = cursor.fetchone()

        goals = dict(goals_row)

        # Get meals for the date
        cursor.execute("""
            SELECT * FROM meals
            WHERE user_id = ? AND meal_date = ?
            ORDER BY
                CASE meal_type
                    WHEN 'breakfast' THEN 1
                    WHEN 'lunch' THEN 2
                    WHEN 'dinner' THEN 3
                    WHEN 'snack' THEN 4
                END
        """, (current_user.id, target_date))
        meals = [dict(row) for row in cursor.fetchall()]

        # Calculate totals
        totals = {
            'calories': sum(m['total_calories'] for m in meals),
            'protein_g': sum(m['protein_g'] for m in meals),
            'carbs_g': sum(m['carbs_g'] for m in meals),
            'fat_g': sum(m['fat_g'] for m in meals),
            'fiber_g': sum(m['fiber_g'] for m in meals),
            'vitamin_c_mg': sum(m['vitamin_c_mg'] for m in meals),
            'vitamin_d_mcg': sum(m['vitamin_d_mcg'] for m in meals),
            'calcium_mg': sum(m['calcium_mg'] for m in meals),
            'iron_mg': sum(m['iron_mg'] for m in meals),
        }

        # Get activity points for the day
        cursor.execute("""
            SELECT COALESCE(SUM(a.points), 0) as total_points
            FROM activity_logs al
            JOIN activities a ON al.activity_id = a.id
            WHERE al.user_id = ? AND al.completed_at = ?
        """, (current_user.id, target_date))
        activity_points = cursor.fetchone()['total_points']

        # Adjust calorie goal based on activity
        adjusted_calories = goals['base_calories']
        if goals['adjust_for_activity']:
            adjusted_calories += int(activity_points * goals['calories_per_activity_point'])

        # Calculate percentages
        percentages = {
            'calories': round((totals['calories'] / adjusted_calories * 100) if adjusted_calories > 0 else 0, 1),
            'protein_g': round((totals['protein_g'] / goals['protein_g'] * 100) if goals['protein_g'] > 0 else 0, 1),
            'carbs_g': round((totals['carbs_g'] / goals['carbs_g'] * 100) if goals['carbs_g'] > 0 else 0, 1),
            'fat_g': round((totals['fat_g'] / goals['fat_g'] * 100) if goals['fat_g'] > 0 else 0, 1),
            'fiber_g': round((totals['fiber_g'] / goals['fiber_g'] * 100) if goals['fiber_g'] > 0 else 0, 1),
        }

        return {
            'date': target_date,
            'goals': goals,
            'actual': totals,
            'percentage': percentages,
            'meals': meals,
            'activity_points': activity_points,
            'adjusted_calorie_goal': adjusted_calories
        }
