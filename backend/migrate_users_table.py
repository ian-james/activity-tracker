#!/usr/bin/env python3
"""
Migration script to update users table schema for email authentication.
This removes the NOT NULL constraint from google_id and adds UNIQUE to email.
"""
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "activity_tracker.db"

def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("Users table doesn't exist yet, nothing to migrate")
            return

        # Backup existing users
        cursor.execute("SELECT * FROM users")
        existing_users = cursor.fetchall()
        print(f"Found {len(existing_users)} existing users")

        # Drop existing users table
        cursor.execute("DROP TABLE IF EXISTS users")
        print("Dropped old users table")

        # Create new users table with correct schema
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT,
                name TEXT,
                profile_picture TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Created new users table with updated schema")

        # Restore existing users if any (though there shouldn't be any yet)
        if existing_users:
            for user in existing_users:
                cursor.execute("""
                    INSERT INTO users (id, google_id, email, password_hash, name, profile_picture, created_at, last_login_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user['id'],
                    user['google_id'] if user['google_id'] else None,
                    user['email'],
                    user['password_hash'] if 'password_hash' in user.keys() else None,
                    user['name'],
                    user['profile_picture'],
                    user['created_at'],
                    user['last_login_at']
                ))
            print(f"Restored {len(existing_users)} users")

        # Drop and recreate sessions table to remove orphaned sessions
        cursor.execute("DROP TABLE IF EXISTS sessions")
        cursor.execute("""
            CREATE TABLE sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
        print("Recreated sessions table")

        conn.commit()
        print("\n✓ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
