#!/usr/bin/env python3
"""
Migration script to fix category name unique constraint.
Changes from global UNIQUE constraint on name to UNIQUE constraint on (user_id, name).
This allows different users to have categories with the same name.
"""
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "activity_tracker.db"

def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        print("Starting migration...")

        # Backup existing categories
        cursor.execute("SELECT * FROM categories")
        existing_categories = cursor.fetchall()
        print(f"Found {len(existing_categories)} existing categories")

        # Drop the old categories table
        cursor.execute("DROP TABLE IF EXISTS categories")
        print("Dropped old categories table")

        # Create new categories table with correct constraint
        cursor.execute("""
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                icon TEXT DEFAULT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, name)
            )
        """)
        print("Created new categories table with (user_id, name) unique constraint")

        # Create indices
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)")

        # Restore existing categories
        if existing_categories:
            for cat in existing_categories:
                # Get values, handling None for optional fields
                icon = cat['icon'] if 'icon' in cat.keys() else None
                user_id = cat['user_id'] if 'user_id' in cat.keys() else None

                cursor.execute("""
                    INSERT INTO categories (id, name, color, icon, is_active, user_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    cat['id'],
                    cat['name'],
                    cat['color'],
                    icon,
                    cat['is_active'],
                    user_id,
                    cat['created_at']
                ))
            print(f"Restored {len(existing_categories)} categories")

        conn.commit()
        print("\n✓ Migration completed successfully!")
        print("Each user can now have their own categories with any name.")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
