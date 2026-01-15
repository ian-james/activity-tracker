from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import get_db
from models import Category, CategoryCreate, CategoryUpdate, User
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[Category])
def list_categories(current_user: User = Depends(get_current_user)):
    """Get all active categories for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM categories WHERE is_active = 1 AND user_id = ? ORDER BY name",
            (current_user.id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=Category)
def create_category(category: CategoryCreate, current_user: User = Depends(get_current_user)):
    """Create a new category for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Check for duplicate name within user's categories
        cursor.execute(
            "SELECT id FROM categories WHERE name = ? AND is_active = 1 AND user_id = ?",
            (category.name, current_user.id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Category with this name already exists")

        cursor.execute(
            "INSERT INTO categories (name, color, icon, user_id) VALUES (?, ?, ?, ?)",
            (category.name, category.color, category.icon, current_user.id)
        )
        category_id = cursor.lastrowid
        cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
        return dict(cursor.fetchone())


@router.put("/{category_id}", response_model=Category)
def update_category(category_id: int, category: CategoryUpdate, current_user: User = Depends(get_current_user)):
    """Update an existing category for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM categories WHERE id = ? AND is_active = 1 AND user_id = ?",
            (category_id, current_user.id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")

        updates = []
        values = []
        if category.name is not None:
            # Check for duplicate name within user's categories
            cursor.execute(
                "SELECT id FROM categories WHERE name = ? AND is_active = 1 AND user_id = ? AND id != ?",
                (category.name, current_user.id, category_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Category with this name already exists")
            updates.append("name = ?")
            values.append(category.name)
        if category.color is not None:
            updates.append("color = ?")
            values.append(category.color)
        if category.icon is not None:
            updates.append("icon = ?")
            values.append(category.icon)

        if updates:
            values.append(category_id)
            cursor.execute(
                f"UPDATE categories SET {', '.join(updates)} WHERE id = ?",
                values
            )

        cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
        return dict(cursor.fetchone())


@router.delete("/{category_id}")
def delete_category(category_id: int, current_user: User = Depends(get_current_user)):
    """Soft delete a category. User's activities with this category will become uncategorized."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM categories WHERE id = ? AND is_active = 1 AND user_id = ?",
            (category_id, current_user.id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Category not found")

        # Set category_id to NULL for user's activities using this category
        cursor.execute(
            "UPDATE activities SET category_id = NULL WHERE category_id = ? AND user_id = ?",
            (category_id, current_user.id)
        )

        # Soft delete the category
        cursor.execute("UPDATE categories SET is_active = 0 WHERE id = ?", (category_id,))
        return {"message": "Category deleted"}
