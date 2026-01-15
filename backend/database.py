import sqlite3
from contextlib import contextmanager
from pathlib import Path
import logging
import os

logger = logging.getLogger(__name__)

DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", Path(__file__).parent / "activity_tracker.db"))


def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraints (disabled by default in SQLite)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        logger.error(f"Database transaction failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                points INTEGER NOT NULL DEFAULT 10,
                is_active INTEGER NOT NULL DEFAULT 1,
                days_of_week TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration: add days_of_week column if it doesn't exist
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'days_of_week' not in columns:
            cursor.execute("ALTER TABLE activities ADD COLUMN days_of_week TEXT DEFAULT NULL")

        # Create categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                icon TEXT DEFAULT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration: add category_id column to activities if it doesn't exist
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'category_id' not in columns:
            # SQLite limitation: Cannot add foreign key constraint to existing table via ALTER TABLE
            # Foreign key relationships are enforced via application-level validation in the API
            cursor.execute("ALTER TABLE activities ADD COLUMN category_id INTEGER DEFAULT NULL")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_id)")

        # Seed default categories for new installations
        cursor.execute("SELECT COUNT(*) as count FROM categories")
        if cursor.fetchone()['count'] == 0:
            default_categories = [
                ('Health & Fitness', '#10B981'),
                ('Personal Development', '#3B82F6'),
                ('Productivity', '#F59E0B'),
                ('Wellness', '#8B5CF6'),
            ]
            cursor.executemany(
                "INSERT INTO categories (name, color) VALUES (?, ?)",
                default_categories
            )

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id INTEGER NOT NULL,
                completed_at DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (activity_id) REFERENCES activities (id),
                UNIQUE(activity_id, completed_at)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_date ON activity_logs(completed_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_activity ON activity_logs(activity_id)")

        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
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

        # Migration: Add password_hash column if it doesn't exist
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [col[1] for col in cursor.fetchall()]
        if 'password_hash' not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
            logger.info("Added password_hash column to users table")

        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # Create indices for sessions
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")

        # Migration: add user_id to activities
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'user_id' not in columns:
            cursor.execute("ALTER TABLE activities ADD COLUMN user_id INTEGER")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)")
            logger.info("Added user_id column to activities table")

        # Migration: add user_id to categories
        cursor.execute("PRAGMA table_info(categories)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'user_id' not in columns:
            cursor.execute("ALTER TABLE categories ADD COLUMN user_id INTEGER")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)")
            logger.info("Added user_id column to categories table")

        # Migration: add user_id to activity_logs
        cursor.execute("PRAGMA table_info(activity_logs)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'user_id' not in columns:
            cursor.execute("ALTER TABLE activity_logs ADD COLUMN user_id INTEGER")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_user ON activity_logs(user_id)")
            logger.info("Added user_id column to activity_logs table")
