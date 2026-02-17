from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import Meal, MealCreate, User
from auth.middleware import get_current_user
from typing import List, Optional
from datetime import date, timedelta

router = APIRouter(prefix="/api/meals", tags=["meals"])


@router.get("", response_model=List[Meal])
def list_meals(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List meals for date range"""
    with get_db() as conn:
        cursor = conn.cursor()

        if start_date and end_date:
            cursor.execute("""
                SELECT * FROM meals
                WHERE user_id = ? AND meal_date >= ? AND meal_date <= ?
                ORDER BY meal_date DESC,
                    CASE meal_type
                        WHEN 'breakfast' THEN 1
                        WHEN 'lunch' THEN 2
                        WHEN 'dinner' THEN 3
                        WHEN 'snack' THEN 4
                    END
            """, (current_user.id, start_date, end_date))
        else:
            # Default to today
            today = date.today().isoformat()
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
            """, (current_user.id, today))

        return [dict(row) for row in cursor.fetchall()]


@router.get("/{meal_id}", response_model=Meal)
def get_meal(meal_id: int, current_user: User = Depends(get_current_user)):
    """Get a specific meal"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM meals WHERE id = ? AND user_id = ?",
            (meal_id, current_user.id)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Meal not found")

        return dict(row)


@router.post("", response_model=Meal)
def create_meal(meal: MealCreate, current_user: User = Depends(get_current_user)):
    """Create a new meal entry"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO meals (
                user_id, meal_date, meal_type, name, total_calories,
                protein_g, carbs_g, fat_g, fiber_g,
                vitamin_c_mg, vitamin_d_mcg, calcium_mg, iron_mg, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user.id, meal.meal_date, meal.meal_type, meal.name,
            meal.total_calories, meal.protein_g, meal.carbs_g, meal.fat_g,
            meal.fiber_g, meal.vitamin_c_mg, meal.vitamin_d_mcg,
            meal.calcium_mg, meal.iron_mg, meal.notes
        ))
        meal_id = cursor.lastrowid

        cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
        return dict(cursor.fetchone())


@router.put("/{meal_id}", response_model=Meal)
def update_meal(
    meal_id: int,
    meal: MealCreate,
    current_user: User = Depends(get_current_user)
):
    """Update an existing meal"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM meals WHERE id = ? AND user_id = ?",
            (meal_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Meal not found")

        # Update meal
        cursor.execute("""
            UPDATE meals SET
                meal_date = ?, meal_type = ?, name = ?, total_calories = ?,
                protein_g = ?, carbs_g = ?, fat_g = ?, fiber_g = ?,
                vitamin_c_mg = ?, vitamin_d_mcg = ?, calcium_mg = ?, iron_mg = ?,
                notes = ?
            WHERE id = ?
        """, (
            meal.meal_date, meal.meal_type, meal.name, meal.total_calories,
            meal.protein_g, meal.carbs_g, meal.fat_g, meal.fiber_g,
            meal.vitamin_c_mg, meal.vitamin_d_mcg, meal.calcium_mg, meal.iron_mg,
            meal.notes, meal_id
        ))

        cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
        return dict(cursor.fetchone())


@router.delete("/{meal_id}")
def delete_meal(meal_id: int, current_user: User = Depends(get_current_user)):
    """Delete a meal"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM meals WHERE id = ? AND user_id = ?",
            (meal_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Meal not found")

        cursor.execute("DELETE FROM meals WHERE id = ?", (meal_id,))

        return {"message": "Meal deleted successfully"}
