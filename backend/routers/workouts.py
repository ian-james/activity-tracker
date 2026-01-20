from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from datetime import datetime, date, timedelta

from database import get_db
from models import (
    WorkoutSession, WorkoutSessionCreate, WorkoutSessionUpdate,
    SessionExercise, SessionExerciseCreate,
    ExerciseSet, ExerciseSetCreate,
    User
)
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


# Workout Session endpoints

@router.get("/sessions", response_model=List[WorkoutSession])
def list_workout_sessions(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get workout sessions for the past N days."""
    with get_db() as conn:
        cursor = conn.cursor()
        start_date = (date.today() - timedelta(days=days)).isoformat()
        cursor.execute(
            """SELECT * FROM workout_sessions
            WHERE user_id = ? AND started_at >= ?
            ORDER BY started_at DESC""",
            (current_user.id, start_date)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.get("/sessions/{session_id}", response_model=WorkoutSession)
def get_workout_session(session_id: int, current_user: User = Depends(get_current_user)):
    """Get a specific workout session."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
            (session_id, current_user.id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workout session not found")
        return dict(row)


@router.post("/sessions", response_model=WorkoutSession)
def create_workout_session(
    session: WorkoutSessionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new workout session."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO workout_sessions (user_id, name, started_at, notes)
            VALUES (?, ?, ?, ?)""",
            (current_user.id, session.name, session.started_at.isoformat(), session.notes)
        )
        session_id = cursor.lastrowid
        cursor.execute("SELECT * FROM workout_sessions WHERE id = ?", (session_id,))
        return dict(cursor.fetchone())


@router.put("/sessions/{session_id}", response_model=WorkoutSession)
def update_workout_session(
    session_id: int,
    session: WorkoutSessionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a workout session (mark complete, update duration, etc)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
            (session_id, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Workout session not found")

        updates = []
        values = []

        if session.name is not None:
            updates.append("name = ?")
            values.append(session.name)
        if session.completed_at is not None:
            updates.append("completed_at = ?")
            values.append(session.completed_at.isoformat())
        if session.paused_duration is not None:
            updates.append("paused_duration = ?")
            values.append(session.paused_duration)
        if session.total_duration is not None:
            updates.append("total_duration = ?")
            values.append(session.total_duration)
        if session.notes is not None:
            updates.append("notes = ?")
            values.append(session.notes)

        if updates:
            values.extend([session_id, current_user.id])
            cursor.execute(
                f"UPDATE workout_sessions SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                values
            )

        cursor.execute("SELECT * FROM workout_sessions WHERE id = ?", (session_id,))
        return dict(cursor.fetchone())


@router.delete("/sessions/{session_id}")
def delete_workout_session(session_id: int, current_user: User = Depends(get_current_user)):
    """Delete a workout session and all related data."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
            (session_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Workout session not found")

        # Foreign keys with CASCADE will handle deletion of related records
        cursor.execute("DELETE FROM workout_sessions WHERE id = ? AND user_id = ?",
                      (session_id, current_user.id))
        return {"message": "Workout session deleted successfully"}


# Session Exercise endpoints

@router.get("/sessions/{session_id}/exercises", response_model=List[SessionExercise])
def list_session_exercises(session_id: int, current_user: User = Depends(get_current_user)):
    """Get all exercises for a workout session."""
    with get_db() as conn:
        cursor = conn.cursor()
        # Verify session belongs to user
        cursor.execute(
            "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
            (session_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Workout session not found")

        cursor.execute(
            """SELECT * FROM session_exercises
            WHERE workout_session_id = ?
            ORDER BY order_index""",
            (session_id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("/session-exercises", response_model=SessionExercise)
def create_session_exercise(
    session_exercise: SessionExerciseCreate,
    current_user: User = Depends(get_current_user)
):
    """Add an exercise to a workout session."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify session belongs to user
        cursor.execute(
            "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
            (session_exercise.workout_session_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Workout session not found")

        # Verify exercise belongs to user
        cursor.execute(
            "SELECT * FROM exercises WHERE id = ? AND is_active = 1 AND user_id = ?",
            (session_exercise.exercise_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Exercise not found")

        cursor.execute(
            """INSERT INTO session_exercises
            (workout_session_id, exercise_id, order_index, target_sets,
             target_value, rest_seconds, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (session_exercise.workout_session_id, session_exercise.exercise_id,
             session_exercise.order_index, session_exercise.target_sets,
             session_exercise.target_value, session_exercise.rest_seconds,
             session_exercise.notes)
        )
        se_id = cursor.lastrowid
        cursor.execute("SELECT * FROM session_exercises WHERE id = ?", (se_id,))
        return dict(cursor.fetchone())


@router.delete("/session-exercises/{session_exercise_id}")
def delete_session_exercise(
    session_exercise_id: int,
    current_user: User = Depends(get_current_user)
):
    """Remove an exercise from a workout session."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify session exercise belongs to user's session
        cursor.execute(
            """SELECT se.* FROM session_exercises se
            JOIN workout_sessions ws ON se.workout_session_id = ws.id
            WHERE se.id = ? AND ws.user_id = ?""",
            (session_exercise_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session exercise not found")

        # Foreign keys with CASCADE will handle deletion of related sets
        cursor.execute("DELETE FROM session_exercises WHERE id = ?", (session_exercise_id,))
        return {"message": "Session exercise deleted successfully"}


# Exercise Set endpoints

@router.get("/session-exercises/{session_exercise_id}/sets", response_model=List[ExerciseSet])
def list_exercise_sets(
    session_exercise_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get all sets for a session exercise."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify session exercise belongs to user's session
        cursor.execute(
            """SELECT se.* FROM session_exercises se
            JOIN workout_sessions ws ON se.workout_session_id = ws.id
            WHERE se.id = ? AND ws.user_id = ?""",
            (session_exercise_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session exercise not found")

        cursor.execute(
            """SELECT * FROM exercise_sets
            WHERE session_exercise_id = ?
            ORDER BY set_number""",
            (session_exercise_id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("/exercise-sets", response_model=ExerciseSet)
def create_exercise_set(
    exercise_set: ExerciseSetCreate,
    current_user: User = Depends(get_current_user)
):
    """Log a completed set."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify session exercise belongs to user's session
        cursor.execute(
            """SELECT se.* FROM session_exercises se
            JOIN workout_sessions ws ON se.workout_session_id = ws.id
            WHERE se.id = ? AND ws.user_id = ?""",
            (exercise_set.session_exercise_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session exercise not found")

        cursor.execute(
            """INSERT INTO exercise_sets
            (session_exercise_id, set_number, reps, duration_seconds,
             weight, weight_unit, completed_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (exercise_set.session_exercise_id, exercise_set.set_number,
             exercise_set.reps, exercise_set.duration_seconds,
             exercise_set.weight, exercise_set.weight_unit,
             exercise_set.completed_at.isoformat(), exercise_set.notes)
        )
        set_id = cursor.lastrowid
        cursor.execute("SELECT * FROM exercise_sets WHERE id = ?", (set_id,))
        return dict(cursor.fetchone())


@router.delete("/exercise-sets/{set_id}")
def delete_exercise_set(set_id: int, current_user: User = Depends(get_current_user)):
    """Delete a logged set."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify set belongs to user's session
        cursor.execute(
            """SELECT es.* FROM exercise_sets es
            JOIN session_exercises se ON es.session_exercise_id = se.id
            JOIN workout_sessions ws ON se.workout_session_id = ws.id
            WHERE es.id = ? AND ws.user_id = ?""",
            (set_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Exercise set not found")

        cursor.execute("DELETE FROM exercise_sets WHERE id = ?", (set_id,))
        return {"message": "Exercise set deleted successfully"}


# Active session endpoint

@router.get("/active-session", response_model=WorkoutSession | None)
def get_active_session(current_user: User = Depends(get_current_user)):
    """Get the current active (incomplete) workout session if any."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT * FROM workout_sessions
            WHERE user_id = ? AND completed_at IS NULL
            ORDER BY started_at DESC
            LIMIT 1""",
            (current_user.id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
