from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import NutritionGoals, NutritionGoalsCreate, NutritionGoalsUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/nutrition/goals", tags=["nutrition-goals"])


@router.get("", response_model=NutritionGoals)
def get_nutrition_goals(current_user: User = Depends(get_current_user)):
    """Get user's nutrition goals, create default if doesn't exist"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM nutrition_goals WHERE user_id = ?",
            (current_user.id,)
        )
        row = cursor.fetchone()

        if not row:
            # Create default goals
            cursor.execute("""
                INSERT INTO nutrition_goals (user_id) VALUES (?)
            """, (current_user.id,))
            cursor.execute(
                "SELECT * FROM nutrition_goals WHERE user_id = ?",
                (current_user.id,)
            )
            row = cursor.fetchone()

        return dict(row)


@router.put("", response_model=NutritionGoals)
def update_nutrition_goals(
    goals: NutritionGoalsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update nutrition goals"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Ensure goals exist
        cursor.execute(
            "SELECT id FROM nutrition_goals WHERE user_id = ?",
            (current_user.id,)
        )
        if not cursor.fetchone():
            # Create default goals first
            cursor.execute(
                "INSERT INTO nutrition_goals (user_id) VALUES (?)",
                (current_user.id,)
            )

        # Build dynamic update
        updates = []
        values = []
        for field, value in goals.model_dump(exclude_unset=True).items():
            if value is not None:
                updates.append(f"{field} = ?")
                values.append(value)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(current_user.id)
            cursor.execute(
                f"UPDATE nutrition_goals SET {', '.join(updates)} WHERE user_id = ?",
                values
            )

        cursor.execute(
            "SELECT * FROM nutrition_goals WHERE user_id = ?",
            (current_user.id,)
        )
        return dict(cursor.fetchone())
