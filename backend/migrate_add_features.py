"""
Migration script to add:
1. Special days table (rest/recovery/vacation days)
2. Completion type fields to activities (checkbox, rating, energy_quality)
3. Biweekly scheduling fields to activities
4. Rating value field to activity_logs
"""

import sqlite3
from pathlib import Path
import os

DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent / "activity_tracker.db"))


def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    try:
        print("Starting migration...")

        # 1. Create special_days table
        print("Creating special_days table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS special_days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                day_type TEXT NOT NULL CHECK(day_type IN ('rest', 'recovery', 'vacation')),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, date)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_special_days_user ON special_days(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_special_days_date ON special_days(date)")
        print("✓ special_days table created")

        # 2. Add completion_type column to activities
        print("Adding completion_type to activities...")
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'completion_type' not in columns:
            cursor.execute("""
                ALTER TABLE activities
                ADD COLUMN completion_type TEXT DEFAULT 'energy_quality'
                CHECK(completion_type IN ('checkbox', 'rating', 'energy_quality'))
            """)
            print("✓ completion_type column added")
        else:
            print("  completion_type column already exists")

        # 3. Add rating_scale column to activities
        print("Adding rating_scale to activities...")
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'rating_scale' not in columns:
            cursor.execute("""
                ALTER TABLE activities
                ADD COLUMN rating_scale INTEGER DEFAULT 5
                CHECK(rating_scale IN (3, 5, 10) OR rating_scale IS NULL)
            """)
            print("✓ rating_scale column added")
        else:
            print("  rating_scale column already exists")

        # 4. Add schedule_frequency column to activities
        print("Adding schedule_frequency to activities...")
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'schedule_frequency' not in columns:
            cursor.execute("""
                ALTER TABLE activities
                ADD COLUMN schedule_frequency TEXT DEFAULT 'weekly'
                CHECK(schedule_frequency IN ('weekly', 'biweekly'))
            """)
            print("✓ schedule_frequency column added")
        else:
            print("  schedule_frequency column already exists")

        # 5. Add biweekly_start_date column to activities
        print("Adding biweekly_start_date to activities...")
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'biweekly_start_date' not in columns:
            cursor.execute("""
                ALTER TABLE activities
                ADD COLUMN biweekly_start_date DATE
            """)
            print("✓ biweekly_start_date column added")
        else:
            print("  biweekly_start_date column already exists")

        # 6. Add rating_value column to activity_logs
        print("Adding rating_value to activity_logs...")
        cursor.execute("PRAGMA table_info(activity_logs)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'rating_value' not in columns:
            cursor.execute("""
                ALTER TABLE activity_logs
                ADD COLUMN rating_value INTEGER
                CHECK(rating_value >= 1 AND rating_value <= 10 OR rating_value IS NULL)
            """)
            print("✓ rating_value column added")
        else:
            print("  rating_value column already exists")

        conn.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
