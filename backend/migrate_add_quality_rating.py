#!/usr/bin/env python3
"""
Migration script to add quality_rating column to activity_logs table.
Quality ratings: low, medium, high (optional field, can be NULL).
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

        # Check if quality_rating column already exists
        cursor.execute("PRAGMA table_info(activity_logs)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'quality_rating' in columns:
            print("✓ quality_rating column already exists, no migration needed")
            return

        # Add quality_rating column
        cursor.execute("""
            ALTER TABLE activity_logs
            ADD COLUMN quality_rating TEXT CHECK(quality_rating IN ('low', 'medium', 'high') OR quality_rating IS NULL)
        """)
        print("✓ Added quality_rating column to activity_logs table")

        conn.commit()
        print("\n✓ Migration completed successfully!")
        print("Quality ratings can now be tracked: low, medium, high")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
