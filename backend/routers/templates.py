from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import get_db
from models import (
    WorkoutTemplate, WorkoutTemplateCreate, WorkoutTemplateUpdate,
    TemplateExercise, TemplateExerciseCreate,
    User
)
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/templates", tags=["templates"])


# Workout Template endpoints

@router.get("", response_model=List[WorkoutTemplate])
def list_templates(current_user: User = Depends(get_current_user)):
    """Get all workout templates for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_templates WHERE is_active = 1 AND user_id = ? ORDER BY name",
            (current_user.id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.get("/{template_id}", response_model=WorkoutTemplate)
def get_template(template_id: int, current_user: User = Depends(get_current_user)):
    """Get a specific workout template."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_templates WHERE id = ? AND is_active = 1 AND user_id = ?",
            (template_id, current_user.id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workout template not found")
        return dict(row)


@router.post("", response_model=WorkoutTemplate)
def create_template(template: WorkoutTemplateCreate, current_user: User = Depends(get_current_user)):
    """Create a new workout template."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO workout_templates (user_id, name, description)
            VALUES (?, ?, ?)""",
            (current_user.id, template.name, template.description)
        )
        template_id = cursor.lastrowid
        cursor.execute("SELECT * FROM workout_templates WHERE id = ?", (template_id,))
        return dict(cursor.fetchone())


@router.put("/{template_id}", response_model=WorkoutTemplate)
def update_template(
    template_id: int,
    template: WorkoutTemplateUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a workout template."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_templates WHERE id = ? AND is_active = 1 AND user_id = ?",
            (template_id, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Workout template not found")

        updates = []
        values = []

        if template.name is not None:
            updates.append("name = ?")
            values.append(template.name)
        if template.description is not None:
            updates.append("description = ?")
            values.append(template.description)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.extend([template_id, current_user.id])
            cursor.execute(
                f"UPDATE workout_templates SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                values
            )

        cursor.execute("SELECT * FROM workout_templates WHERE id = ?", (template_id,))
        return dict(cursor.fetchone())


@router.delete("/{template_id}")
def delete_template(template_id: int, current_user: User = Depends(get_current_user)):
    """Soft delete a workout template."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_templates WHERE id = ? AND is_active = 1 AND user_id = ?",
            (template_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Workout template not found")

        cursor.execute(
            "UPDATE workout_templates SET is_active = 0 WHERE id = ? AND user_id = ?",
            (template_id, current_user.id)
        )
        return {"message": "Workout template deleted successfully"}


# Template Exercise endpoints

@router.get("/{template_id}/exercises", response_model=List[TemplateExercise])
def list_template_exercises(template_id: int, current_user: User = Depends(get_current_user)):
    """Get all exercises for a workout template."""
    with get_db() as conn:
        cursor = conn.cursor()
        # Verify template belongs to user
        cursor.execute(
            "SELECT * FROM workout_templates WHERE id = ? AND is_active = 1 AND user_id = ?",
            (template_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Workout template not found")

        cursor.execute(
            """SELECT * FROM template_exercises
            WHERE template_id = ?
            ORDER BY order_index""",
            (template_id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("/exercises", response_model=TemplateExercise)
def add_template_exercise(
    template_exercise: TemplateExerciseCreate,
    current_user: User = Depends(get_current_user)
):
    """Add an exercise to a workout template."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify template belongs to user
        cursor.execute(
            "SELECT * FROM workout_templates WHERE id = ? AND is_active = 1 AND user_id = ?",
            (template_exercise.template_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Workout template not found")

        # Verify exercise belongs to user
        cursor.execute(
            "SELECT * FROM exercises WHERE id = ? AND is_active = 1 AND user_id = ?",
            (template_exercise.exercise_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Exercise not found")

        cursor.execute(
            """INSERT INTO template_exercises
            (template_id, exercise_id, order_index, target_sets,
             target_value, rest_seconds, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (template_exercise.template_id, template_exercise.exercise_id,
             template_exercise.order_index, template_exercise.target_sets,
             template_exercise.target_value, template_exercise.rest_seconds,
             template_exercise.notes)
        )
        te_id = cursor.lastrowid

        # Update template's updated_at timestamp
        cursor.execute(
            "UPDATE workout_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (template_exercise.template_id,)
        )

        cursor.execute("SELECT * FROM template_exercises WHERE id = ?", (te_id,))
        return dict(cursor.fetchone())


@router.delete("/exercises/{template_exercise_id}")
def delete_template_exercise(
    template_exercise_id: int,
    current_user: User = Depends(get_current_user)
):
    """Remove an exercise from a workout template."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify template exercise belongs to user's template
        cursor.execute(
            """SELECT te.*, wt.user_id FROM template_exercises te
            JOIN workout_templates wt ON te.template_id = wt.id
            WHERE te.id = ? AND wt.user_id = ?""",
            (template_exercise_id, current_user.id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Template exercise not found")

        template_id = row['template_id']
        cursor.execute("DELETE FROM template_exercises WHERE id = ?", (template_exercise_id,))

        # Update template's updated_at timestamp
        cursor.execute(
            "UPDATE workout_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (template_id,)
        )

        return {"message": "Template exercise deleted successfully"}
