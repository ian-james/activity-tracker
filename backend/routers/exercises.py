from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from datetime import date, timedelta

from database import get_db
from models import Exercise, ExerciseCreate, ExerciseUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


@router.get("", response_model=List[Exercise])
def list_exercises(current_user: User = Depends(get_current_user)):
    """Get all active exercises for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM exercises WHERE is_active = 1 AND user_id = ? ORDER BY name",
            (current_user.id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.get("/{exercise_id}", response_model=Exercise)
def get_exercise(exercise_id: int, current_user: User = Depends(get_current_user)):
    """Get a specific exercise by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM exercises WHERE id = ? AND is_active = 1 AND user_id = ?",
            (exercise_id, current_user.id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Exercise not found")
        return dict(row)


@router.post("", response_model=Exercise)
def create_exercise(exercise: ExerciseCreate, current_user: User = Depends(get_current_user)):
    """Create a new exercise."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO exercises
            (user_id, name, exercise_type, default_value, default_weight_unit, notes)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (current_user.id, exercise.name, exercise.exercise_type,
             exercise.default_value, exercise.default_weight_unit, exercise.notes)
        )
        exercise_id = cursor.lastrowid
        cursor.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,))
        return dict(cursor.fetchone())


@router.put("/{exercise_id}", response_model=Exercise)
def update_exercise(
    exercise_id: int,
    exercise: ExerciseUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an existing exercise."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM exercises WHERE id = ? AND is_active = 1 AND user_id = ?",
            (exercise_id, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Exercise not found")

        updates = []
        values = []

        if exercise.name is not None:
            updates.append("name = ?")
            values.append(exercise.name)
        if exercise.exercise_type is not None:
            updates.append("exercise_type = ?")
            values.append(exercise.exercise_type)
        if exercise.default_value is not None:
            updates.append("default_value = ?")
            values.append(exercise.default_value)
        if exercise.default_weight_unit is not None:
            updates.append("default_weight_unit = ?")
            values.append(exercise.default_weight_unit)
        if exercise.notes is not None:
            updates.append("notes = ?")
            values.append(exercise.notes)

        if updates:
            values.append(exercise_id)
            values.append(current_user.id)
            cursor.execute(
                f"UPDATE exercises SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                values
            )

        cursor.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,))
        return dict(cursor.fetchone())


@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: int, current_user: User = Depends(get_current_user)):
    """Soft delete an exercise."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM exercises WHERE id = ? AND is_active = 1 AND user_id = ?",
            (exercise_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Exercise not found")

        cursor.execute(
            "UPDATE exercises SET is_active = 0 WHERE id = ? AND user_id = ?",
            (exercise_id, current_user.id)
        )
        return {"message": "Exercise deleted successfully"}


@router.get("/{exercise_id}/progress")
def get_exercise_progress(
    exercise_id: int,
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get progress data for a specific exercise over the past N days."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify exercise belongs to user
        cursor.execute(
            "SELECT * FROM exercises WHERE id = ? AND is_active = 1 AND user_id = ?",
            (exercise_id, current_user.id)
        )
        exercise = cursor.fetchone()
        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")

        # Get date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Get all sets for this exercise in the date range
        cursor.execute("""
            SELECT
                es.id,
                es.set_number,
                es.reps,
                es.duration_seconds,
                es.weight,
                es.weight_unit,
                es.completed_at,
                ws.started_at,
                ws.name as workout_name
            FROM exercise_sets es
            JOIN session_exercises se ON es.session_exercise_id = se.id
            JOIN workout_sessions ws ON se.workout_session_id = ws.id
            WHERE se.exercise_id = ?
                AND DATE(es.completed_at) >= ?
                AND DATE(es.completed_at) <= ?
                AND ws.user_id = ?
            ORDER BY es.completed_at ASC
        """, (exercise_id, start_date.isoformat(), end_date.isoformat(), current_user.id))

        sets = cursor.fetchall()

        # Group by date and calculate daily stats
        daily_stats = {}
        for set_row in sets:
            set_date = set_row['completed_at'][:10]  # Extract date part

            if set_date not in daily_stats:
                daily_stats[set_date] = {
                    'date': set_date,
                    'total_sets': 0,
                    'total_reps': 0,
                    'total_duration': 0,
                    'max_weight': 0,
                    'max_reps': 0,
                    'max_duration': 0,
                    'avg_weight': 0,
                    'weight_unit': set_row['weight_unit'],
                    'sets': []
                }

            stats = daily_stats[set_date]
            stats['total_sets'] += 1

            if set_row['reps']:
                stats['total_reps'] += set_row['reps']
                stats['max_reps'] = max(stats['max_reps'], set_row['reps'])

            if set_row['duration_seconds']:
                stats['total_duration'] += set_row['duration_seconds']
                stats['max_duration'] = max(stats['max_duration'], set_row['duration_seconds'])

            if set_row['weight']:
                stats['max_weight'] = max(stats['max_weight'], set_row['weight'])
                stats['sets'].append(set_row['weight'])

        # Calculate average weight for each day
        for stats in daily_stats.values():
            if stats['sets']:
                stats['avg_weight'] = round(sum(stats['sets']) / len(stats['sets']), 1)
            del stats['sets']  # Remove temporary array

        # Convert to sorted list
        progress_data = sorted(daily_stats.values(), key=lambda x: x['date'])

        return {
            'exercise': dict(exercise),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'progress': progress_data,
            'summary': {
                'total_workouts': len(daily_stats),
                'total_sets': sum(d['total_sets'] for d in daily_stats.values()),
                'total_reps': sum(d['total_reps'] for d in daily_stats.values()),
                'total_duration': sum(d['total_duration'] for d in daily_stats.values()),
            }
        }
