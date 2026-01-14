from fastapi import APIRouter, HTTPException
from typing import List

from database import get_db
from models import Category, CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[Category])
def list_categories():
    """Get all active categories."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE is_active = 1 ORDER BY name")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=Category)
def create_category(category: CategoryCreate):
    """Create a new category."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Check for duplicate name
        cursor.execute("SELECT id FROM categories WHERE name = ? AND is_active = 1", (category.name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Category with this name already exists")

        cursor.execute(
            "INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)",
            (category.name, category.color, category.icon)
        )
        category_id = cursor.lastrowid
        cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
        return dict(cursor.fetchone())


@router.put("/{category_id}", response_model=Category)
def update_category(category_id: int, category: CategoryUpdate):
    """Update an existing category."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE id = ? AND is_active = 1", (category_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")

        updates = []
        values = []
        if category.name is not None:
            # Check for duplicate name
            cursor.execute(
                "SELECT id FROM categories WHERE name = ? AND is_active = 1 AND id != ?",
                (category.name, category_id)
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
def delete_category(category_id: int):
    """Soft delete a category. Activities with this category will become uncategorized."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE id = ? AND is_active = 1", (category_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Category not found")

        # Set category_id to NULL for all activities using this category
        cursor.execute("UPDATE activities SET category_id = NULL WHERE category_id = ?", (category_id,))

        # Soft delete the category
        cursor.execute("UPDATE categories SET is_active = 0 WHERE id = ?", (category_id,))
        return {"message": "Category deleted"}
