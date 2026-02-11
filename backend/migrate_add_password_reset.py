#!/usr/bin/env python3
"""
Migration script to add password_reset_tokens table for password reset functionality.
"""
import sqlite3
from pathlib import Path
import os

DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent / "activity_tracker.db"))


def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # Create password_reset_tokens table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL UNIQUE,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        print("✓ Created password_reset_tokens table")

        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_token
            ON password_reset_tokens(token)
        """)
        print("✓ Created index on token column")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id
            ON password_reset_tokens(user_id)
        """)
        print("✓ Created index on user_id column")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires_at
            ON password_reset_tokens(expires_at)
        """)
        print("✓ Created index on expires_at column")

        conn.commit()
        print("\n✓ Migration completed successfully!")

    except sqlite3.OperationalError as e:
        if "already exists" in str(e).lower():
            print("✓ password_reset_tokens table already exists")
        else:
            print(f"✗ Migration failed: {e}")
            raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
