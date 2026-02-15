#!/usr/bin/env python3
"""
Migration script to add email notification columns to user_preferences table.
"""
import sqlite3
from pathlib import Path
import os

DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent / "activity_tracker.db"))


def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # Add enable_weekly_email column
        cursor.execute("""
            ALTER TABLE user_preferences
            ADD COLUMN enable_weekly_email INTEGER DEFAULT 0
        """)
        print("✓ Added enable_weekly_email column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ enable_weekly_email column already exists")
        else:
            raise

    try:
        # Add email_address column
        cursor.execute("""
            ALTER TABLE user_preferences
            ADD COLUMN email_address TEXT
        """)
        print("✓ Added email_address column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ email_address column already exists")
        else:
            raise

    try:
        # Add last_email_sent_at column
        cursor.execute("""
            ALTER TABLE user_preferences
            ADD COLUMN last_email_sent_at DATETIME
        """)
        print("✓ Added last_email_sent_at column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ last_email_sent_at column already exists")
        else:
            raise

    try:
        # Create email_logs table for tracking email sends
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email_type TEXT NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        print("✓ Created email_logs table")
    except sqlite3.OperationalError as e:
        if "already exists" in str(e).lower():
            print("✓ email_logs table already exists")
        else:
            raise

    try:
        # Create index on email_logs
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_email_logs_user_id
            ON email_logs(user_id)
        """)
        print("✓ Created index on email_logs.user_id")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    print("\n✓ Migration completed successfully!")
    conn.close()


if __name__ == "__main__":
    migrate()
