"""
Migration: Add notes field to logs table
"""
import sqlite3
from pathlib import Path
import os

DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent / "activity_tracker.db"))

def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # Add notes column to activity_logs table
        cursor.execute("""
            ALTER TABLE activity_logs ADD COLUMN notes TEXT
        """)

        conn.commit()
        print("✓ Added notes column to activity_logs table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ notes column already exists in activity_logs table")
        else:
            raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
