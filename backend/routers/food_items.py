from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import FoodItem, FoodItemCreate, User
from auth.middleware import get_current_user
from typing import List

router = APIRouter(prefix="/api/food-items", tags=["food-items"])


@router.get("", response_model=List[FoodItem])
def list_food_items(
    active_only: bool = True,
    current_user: User = Depends(get_current_user)
):
    """List user's food items"""
    with get_db() as conn:
        cursor = conn.cursor()

        if active_only:
            cursor.execute("""
                SELECT * FROM food_items
                WHERE user_id = ? AND is_active = 1
                ORDER BY name
            """, (current_user.id,))
        else:
            cursor.execute("""
                SELECT * FROM food_items
                WHERE user_id = ?
                ORDER BY name
            """, (current_user.id,))

        return [dict(row) for row in cursor.fetchall()]


@router.get("/{food_id}", response_model=FoodItem)
def get_food_item(food_id: int, current_user: User = Depends(get_current_user)):
    """Get a specific food item"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM food_items WHERE id = ? AND user_id = ?",
            (food_id, current_user.id)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Food item not found")

        return dict(row)


@router.post("", response_model=FoodItem)
def create_food_item(
    food: FoodItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new food item"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO food_items (
                user_id, name, serving_size, calories,
                protein_g, carbs_g, fat_g, fiber_g,
                vitamin_c_mg, vitamin_d_mcg, calcium_mg, iron_mg
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user.id, food.name, food.serving_size, food.calories,
            food.protein_g, food.carbs_g, food.fat_g, food.fiber_g,
            food.vitamin_c_mg, food.vitamin_d_mcg, food.calcium_mg, food.iron_mg
        ))
        food_id = cursor.lastrowid

        cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
        return dict(cursor.fetchone())


@router.put("/{food_id}", response_model=FoodItem)
def update_food_item(
    food_id: int,
    food: FoodItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Update a food item"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM food_items WHERE id = ? AND user_id = ?",
            (food_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Food item not found")

        # Update food item
        cursor.execute("""
            UPDATE food_items SET
                name = ?, serving_size = ?, calories = ?,
                protein_g = ?, carbs_g = ?, fat_g = ?, fiber_g = ?,
                vitamin_c_mg = ?, vitamin_d_mcg = ?, calcium_mg = ?, iron_mg = ?
            WHERE id = ?
        """, (
            food.name, food.serving_size, food.calories,
            food.protein_g, food.carbs_g, food.fat_g, food.fiber_g,
            food.vitamin_c_mg, food.vitamin_d_mcg, food.calcium_mg, food.iron_mg,
            food_id
        ))

        cursor.execute("SELECT * FROM food_items WHERE id = ?", (food_id,))
        return dict(cursor.fetchone())


@router.delete("/{food_id}")
def delete_food_item(food_id: int, current_user: User = Depends(get_current_user)):
    """Soft delete a food item (mark as inactive)"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM food_items WHERE id = ? AND user_id = ?",
            (food_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Food item not found")

        cursor.execute(
            "UPDATE food_items SET is_active = 0 WHERE id = ?",
            (food_id,)
        )

        return {"message": "Food item deleted successfully"}
