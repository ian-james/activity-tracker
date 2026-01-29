from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, date

from database import get_db
from models import Todo, TodoCreate, TodoUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.get("", response_model=List[Todo])
def list_todos(current_user: User = Depends(get_current_user)):
    """Get all todos for the current user, ordered by order_index."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM todos WHERE user_id = ? ORDER BY is_completed ASC, order_index ASC",
            (current_user.id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=Todo)
def create_todo(todo: TodoCreate, current_user: User = Depends(get_current_user)):
    """Create a new todo."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO todos (user_id, text, order_index, category)
            VALUES (?, ?, ?, ?)""",
            (current_user.id, todo.text, todo.order_index, todo.category)
        )
        todo_id = cursor.lastrowid
        cursor.execute("SELECT * FROM todos WHERE id = ?", (todo_id,))
        return dict(cursor.fetchone())


@router.put("/{todo_id}", response_model=Todo)
def update_todo(
    todo_id: int,
    todo: TodoUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a todo."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM todos WHERE id = ? AND user_id = ?",
            (todo_id, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Todo not found")

        updates = []
        values = []

        if todo.text is not None:
            updates.append("text = ?")
            values.append(todo.text)

        if todo.is_completed is not None:
            updates.append("is_completed = ?")
            values.append(1 if todo.is_completed else 0)

            # Set completed_at timestamp when marking as complete
            if todo.is_completed:
                updates.append("completed_at = ?")
                values.append(datetime.now().isoformat())
            else:
                updates.append("completed_at = NULL")

        if todo.order_index is not None:
            updates.append("order_index = ?")
            values.append(todo.order_index)

        if todo.category is not None:
            updates.append("category = ?")
            values.append(todo.category)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.extend([todo_id, current_user.id])
            cursor.execute(
                f"UPDATE todos SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                values
            )

        cursor.execute("SELECT * FROM todos WHERE id = ?", (todo_id,))
        return dict(cursor.fetchone())


@router.delete("/{todo_id}")
def delete_todo(todo_id: int, current_user: User = Depends(get_current_user)):
    """Delete a todo."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM todos WHERE id = ? AND user_id = ?",
            (todo_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Todo not found")

        cursor.execute("DELETE FROM todos WHERE id = ? AND user_id = ?", (todo_id, current_user.id))
        return {"message": "Todo deleted successfully"}


@router.delete("/completed/all")
def clear_completed_todos(current_user: User = Depends(get_current_user)):
    """Delete all completed todos for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get count for response
        cursor.execute(
            "SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_completed = 1",
            (current_user.id,)
        )
        count = cursor.fetchone()['count']

        # Delete completed todos
        cursor.execute(
            "DELETE FROM todos WHERE user_id = ? AND is_completed = 1",
            (current_user.id,)
        )

        return {"message": f"Deleted {count} completed todo(s)"}


@router.delete("/in-progress/all")
def clear_in_progress_todos(current_user: User = Depends(get_current_user)):
    """Delete all in-progress (not completed) todos for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get count for response
        cursor.execute(
            "SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_completed = 0",
            (current_user.id,)
        )
        count = cursor.fetchone()['count']

        # Delete in-progress todos
        cursor.execute(
            "DELETE FROM todos WHERE user_id = ? AND is_completed = 0",
            (current_user.id,)
        )

        return {"message": f"Deleted {count} in-progress todo(s)"}


@router.post("/reorder")
def reorder_todos(todo_ids: List[int], current_user: User = Depends(get_current_user)):
    """Reorder todos by providing a list of todo IDs in the desired order."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify all todos belong to the user
        placeholders = ','.join('?' * len(todo_ids))
        cursor.execute(
            f"SELECT id FROM todos WHERE id IN ({placeholders}) AND user_id = ?",
            (*todo_ids, current_user.id)
        )
        found_ids = {row['id'] for row in cursor.fetchall()}

        if len(found_ids) != len(todo_ids):
            raise HTTPException(status_code=400, detail="One or more todos not found")

        # Update order_index for each todo
        for index, todo_id in enumerate(todo_ids):
            cursor.execute(
                "UPDATE todos SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                (index, todo_id, current_user.id)
            )

        return {"message": "Todos reordered successfully"}
