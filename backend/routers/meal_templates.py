from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import MealTemplate, MealTemplateCreate, MealTemplateUpdate, MealCreate, Meal, User
from auth.middleware import get_current_user
from datetime import date, datetime

router = APIRouter(prefix="/api/meal-templates", tags=["meal-templates"])


@router.get("", response_model=list[MealTemplate])
def list_meal_templates(
    meal_type: str = None,
    favorites_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """List meal templates"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM meal_templates WHERE user_id = ? AND is_active = 1"
        params = [current_user.id]

        if meal_type:
            query += " AND meal_type = ?"
            params.append(meal_type)

        if favorites_only:
            query += " AND is_favorite = 1"

        query += " ORDER BY use_count DESC, name ASC"

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


@router.get("/{template_id}", response_model=MealTemplate)
def get_meal_template(
    template_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get a specific meal template"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM meal_templates WHERE id = ? AND user_id = ?",
            (template_id, current_user.id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Meal template not found")
        return dict(row)


@router.post("", response_model=MealTemplate)
def create_meal_template(
    template: MealTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new meal template"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO meal_templates (
                user_id, name, meal_type, total_calories,
                protein_g, carbs_g, fat_g, fiber_g,
                vitamin_c_mg, vitamin_d_mcg, calcium_mg, iron_mg,
                magnesium_mg, potassium_mg, sodium_mg, zinc_mg,
                vitamin_b6_mg, vitamin_b12_mcg, omega3_g, is_favorite
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user.id, template.name, template.meal_type, template.total_calories,
                template.protein_g, template.carbs_g, template.fat_g, template.fiber_g,
                template.vitamin_c_mg, template.vitamin_d_mcg, template.calcium_mg, template.iron_mg,
                template.magnesium_mg, template.potassium_mg, template.sodium_mg, template.zinc_mg,
                template.vitamin_b6_mg, template.vitamin_b12_mcg, template.omega3_g, template.is_favorite
            )
        )
        template_id = cursor.lastrowid
        cursor.execute("SELECT * FROM meal_templates WHERE id = ?", (template_id,))
        return dict(cursor.fetchone())


@router.put("/{template_id}", response_model=MealTemplate)
def update_meal_template(
    template_id: int,
    template: MealTemplateUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a meal template"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM meal_templates WHERE id = ? AND user_id = ?",
            (template_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(404, "Meal template not found")

        # Build dynamic update
        updates = []
        values = []
        for field, value in template.model_dump(exclude_unset=True).items():
            if value is not None:
                updates.append(f"{field} = ?")
                values.append(value)

        if updates:
            values.append(template_id)
            cursor.execute(
                f"UPDATE meal_templates SET {', '.join(updates)} WHERE id = ?",
                values
            )

        cursor.execute("SELECT * FROM meal_templates WHERE id = ?", (template_id,))
        return dict(cursor.fetchone())


@router.delete("/{template_id}")
def delete_meal_template(
    template_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete (deactivate) a meal template"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute(
            "SELECT id FROM meal_templates WHERE id = ? AND user_id = ?",
            (template_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(404, "Meal template not found")

        cursor.execute(
            "UPDATE meal_templates SET is_active = 0 WHERE id = ?",
            (template_id,)
        )
        return {"status": "deleted"}


@router.post("/{template_id}/use", response_model=Meal)
def use_meal_template(
    template_id: int,
    meal_date: date,
    current_user: User = Depends(get_current_user)
):
    """Use a template to create a meal for a specific date"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get template
        cursor.execute(
            "SELECT * FROM meal_templates WHERE id = ? AND user_id = ?",
            (template_id, current_user.id)
        )
        template_row = cursor.fetchone()
        if not template_row:
            raise HTTPException(404, "Meal template not found")

        template = dict(template_row)

        # Create meal from template
        cursor.execute(
            """
            INSERT INTO meals (
                user_id, meal_date, meal_type, name, total_calories,
                protein_g, carbs_g, fat_g, fiber_g,
                vitamin_c_mg, vitamin_d_mcg, calcium_mg, iron_mg,
                magnesium_mg, potassium_mg, sodium_mg, zinc_mg,
                vitamin_b6_mg, vitamin_b12_mcg, omega3_g
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user.id, meal_date, template['meal_type'], template['name'],
                template['total_calories'], template['protein_g'], template['carbs_g'],
                template['fat_g'], template['fiber_g'], template['vitamin_c_mg'],
                template['vitamin_d_mcg'], template['calcium_mg'], template['iron_mg'],
                template['magnesium_mg'], template['potassium_mg'], template['sodium_mg'],
                template['zinc_mg'], template['vitamin_b6_mg'], template['vitamin_b12_mcg'],
                template['omega3_g']
            )
        )
        meal_id = cursor.lastrowid

        # Update template usage stats
        cursor.execute(
            """
            UPDATE meal_templates
            SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (template_id,)
        )

        cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
        return dict(cursor.fetchone())


@router.post("/{template_id}/toggle-favorite", response_model=MealTemplate)
def toggle_favorite(
    template_id: int,
    current_user: User = Depends(get_current_user)
):
    """Toggle favorite status of a meal template"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get current status
        cursor.execute(
            "SELECT is_favorite FROM meal_templates WHERE id = ? AND user_id = ?",
            (template_id, current_user.id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Meal template not found")

        # Toggle
        new_status = 0 if row['is_favorite'] else 1
        cursor.execute(
            "UPDATE meal_templates SET is_favorite = ? WHERE id = ?",
            (new_status, template_id)
        )

        cursor.execute("SELECT * FROM meal_templates WHERE id = ?", (template_id,))
        return dict(cursor.fetchone())


@router.get("/frequently-used/top")
def get_frequently_used(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get most frequently used meal templates"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM meal_templates
            WHERE user_id = ? AND is_active = 1 AND use_count > 0
            ORDER BY use_count DESC, last_used_at DESC
            LIMIT ?
            """,
            (current_user.id, limit)
        )
        return [dict(row) for row in cursor.fetchall()]
