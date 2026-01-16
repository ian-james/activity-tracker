#!/usr/bin/env python3
"""
Migration script to add energy_level column to activity_logs table.
Energy levels: low, medium, high (optional field, can be NULL).
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

        # Check if energy_level column already exists
        cursor.execute("PRAGMA table_info(activity_logs)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'energy_level' in columns:
            print("✓ energy_level column already exists, no migration needed")
            return

        # Add energy_level column
        cursor.execute("""
            ALTER TABLE activity_logs
            ADD COLUMN energy_level TEXT CHECK(energy_level IN ('low', 'medium', 'high') OR energy_level IS NULL)
        """)
        print("✓ Added energy_level column to activity_logs table")

        conn.commit()
        print("\n✓ Migration completed successfully!")
        print("Energy levels can now be tracked: low, medium, high")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
