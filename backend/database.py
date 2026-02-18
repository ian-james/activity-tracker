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
                ('Health & Fitness', '#10B981'),  # Emerald Green
                ('Personal Development', '#3B82F6'),  # Blue
                ('Productivity', '#F59E0B'),  # Amber
                ('Wellness', '#8B5CF6'),  # Purple
                ('Work', '#6366F1'),  # Indigo
                ('Finance', '#22C55E'),  # Green
                ('Social', '#EC4899'),  # Pink
                ('Hobbies', '#14B8A6'),  # Teal
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

        # Create exercises table for exercise library
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                exercise_type TEXT NOT NULL CHECK(exercise_type IN ('reps', 'time', 'weight')),
                default_value REAL,
                default_weight_unit TEXT CHECK(default_weight_unit IN ('lbs', 'kg', NULL)),
                notes TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id)")

        # Create workout_sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workout_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT,
                started_at DATETIME NOT NULL,
                completed_at DATETIME,
                paused_duration INTEGER DEFAULT 0,
                total_duration INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_workout_sessions_started ON workout_sessions(started_at)")

        # Create session_exercises table (exercises added to a workout session)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_session_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL,
                target_sets INTEGER DEFAULT 1,
                target_value REAL,
                rest_seconds INTEGER DEFAULT 60,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_session_exercises_workout ON session_exercises(workout_session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_session_exercises_exercise ON session_exercises(exercise_id)")

        # Create exercise_sets table (individual sets logged)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS exercise_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_exercise_id INTEGER NOT NULL,
                set_number INTEGER NOT NULL,
                reps INTEGER,
                duration_seconds INTEGER,
                weight REAL,
                weight_unit TEXT CHECK(weight_unit IN ('lbs', 'kg', NULL)),
                completed_at DATETIME NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_exercise_id) REFERENCES session_exercises (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_exercise ON exercise_sets(session_exercise_id)")

        # Create user_preferences table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                weight_unit TEXT NOT NULL DEFAULT 'lbs' CHECK(weight_unit IN ('lbs', 'kg')),
                default_rest_seconds INTEGER DEFAULT 60,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id)")

        # Create workout_templates table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workout_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id)")

        # Create template_exercises table (exercises in a template)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS template_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL,
                target_sets INTEGER DEFAULT 3,
                target_value REAL,
                rest_seconds INTEGER DEFAULT 60,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_template_exercises_exercise ON template_exercises(exercise_id)")

        # Create todos table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                is_completed INTEGER NOT NULL DEFAULT 0,
                completed_at DATETIME,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(is_completed)")

        # Migration: add category column to todos if it doesn't exist
        cursor.execute("PRAGMA table_info(todos)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'category' not in columns:
            cursor.execute("ALTER TABLE todos ADD COLUMN category TEXT NOT NULL DEFAULT 'personal' CHECK(category IN ('personal', 'professional'))")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category)")
            logger.info("Added category column to todos table")

        # Create nutrition_goals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nutrition_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                base_calories INTEGER NOT NULL DEFAULT 2000,
                protein_g INTEGER NOT NULL DEFAULT 150,
                carbs_g INTEGER NOT NULL DEFAULT 200,
                fat_g INTEGER NOT NULL DEFAULT 65,
                fiber_g INTEGER DEFAULT 25,
                vitamin_c_mg INTEGER DEFAULT 90,
                vitamin_d_mcg INTEGER DEFAULT 20,
                calcium_mg INTEGER DEFAULT 1000,
                iron_mg INTEGER DEFAULT 18,
                adjust_for_activity INTEGER NOT NULL DEFAULT 1,
                calories_per_activity_point REAL DEFAULT 10.0,
                target_weight REAL,
                weight_unit TEXT DEFAULT 'lbs' CHECK(weight_unit IN ('lbs', 'kg')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user ON nutrition_goals(user_id)")

        # Create meals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                meal_date DATE NOT NULL,
                meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
                name TEXT NOT NULL,
                total_calories REAL NOT NULL,
                protein_g REAL NOT NULL DEFAULT 0,
                carbs_g REAL NOT NULL DEFAULT 0,
                fat_g REAL NOT NULL DEFAULT 0,
                fiber_g REAL DEFAULT 0,
                vitamin_c_mg REAL DEFAULT 0,
                vitamin_d_mcg REAL DEFAULT 0,
                calcium_mg REAL DEFAULT 0,
                iron_mg REAL DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(meal_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, meal_date)")

        # Create food_items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS food_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                serving_size TEXT NOT NULL,
                calories REAL NOT NULL,
                protein_g REAL NOT NULL DEFAULT 0,
                carbs_g REAL NOT NULL DEFAULT 0,
                fat_g REAL NOT NULL DEFAULT 0,
                fiber_g REAL DEFAULT 0,
                vitamin_c_mg REAL DEFAULT 0,
                vitamin_d_mcg REAL DEFAULT 0,
                calcium_mg REAL DEFAULT 0,
                iron_mg REAL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_food_items_user ON food_items(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_food_items_active ON food_items(user_id, is_active)")

        # Create meal_food_items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meal_food_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meal_id INTEGER NOT NULL,
                food_item_id INTEGER NOT NULL,
                quantity REAL NOT NULL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE,
                FOREIGN KEY (food_item_id) REFERENCES food_items (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meal_food_items_meal ON meal_food_items(meal_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meal_food_items_food ON meal_food_items(food_item_id)")

        # Create weight_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS weight_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                log_date DATE NOT NULL,
                weight REAL NOT NULL,
                weight_unit TEXT NOT NULL DEFAULT 'lbs' CHECK(weight_unit IN ('lbs', 'kg')),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, log_date)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(log_date)")

        # Create sleep_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sleep_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                log_date DATE NOT NULL,
                hours_slept REAL NOT NULL,
                quality_rating TEXT CHECK(quality_rating IN ('poor', 'fair', 'good', 'excellent')) DEFAULT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, log_date)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sleep_logs_user ON sleep_logs(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON sleep_logs(log_date)")

        # Migration: add calories_burned to activities
        cursor.execute("PRAGMA table_info(activities)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'calories_burned' not in columns:
            cursor.execute("ALTER TABLE activities ADD COLUMN calories_burned INTEGER DEFAULT 0")
            logger.info("Added calories_burned column to activities table")

        # Migration: add additional micronutrients to nutrition_goals
        cursor.execute("PRAGMA table_info(nutrition_goals)")
        goals_columns = [col[1] for col in cursor.fetchall()]

        new_goal_columns = [
            ('magnesium_mg', 'INTEGER DEFAULT 400'),
            ('potassium_mg', 'INTEGER DEFAULT 3500'),
            ('sodium_mg', 'INTEGER DEFAULT 2300'),
            ('zinc_mg', 'INTEGER DEFAULT 11'),
            ('vitamin_b6_mg', 'REAL DEFAULT 1.7'),
            ('vitamin_b12_mcg', 'REAL DEFAULT 2.4'),
            ('omega3_g', 'REAL DEFAULT 1.6'),
        ]

        for col_name, col_def in new_goal_columns:
            if col_name not in goals_columns:
                cursor.execute(f"ALTER TABLE nutrition_goals ADD COLUMN {col_name} {col_def}")
                logger.info(f"Added {col_name} column to nutrition_goals table")

        # Migration: add additional micronutrients to meals
        cursor.execute("PRAGMA table_info(meals)")
        meals_columns = [col[1] for col in cursor.fetchall()]

        new_meal_columns = [
            ('magnesium_mg', 'REAL DEFAULT 0'),
            ('potassium_mg', 'REAL DEFAULT 0'),
            ('sodium_mg', 'REAL DEFAULT 0'),
            ('zinc_mg', 'REAL DEFAULT 0'),
            ('vitamin_b6_mg', 'REAL DEFAULT 0'),
            ('vitamin_b12_mcg', 'REAL DEFAULT 0'),
            ('omega3_g', 'REAL DEFAULT 0'),
        ]

        for col_name, col_def in new_meal_columns:
            if col_name not in meals_columns:
                cursor.execute(f"ALTER TABLE meals ADD COLUMN {col_name} {col_def}")
                logger.info(f"Added {col_name} column to meals table")

        # Migration: add additional micronutrients to food_items
        cursor.execute("PRAGMA table_info(food_items)")
        food_columns = [col[1] for col in cursor.fetchall()]

        for col_name, col_def in new_meal_columns:  # Same columns as meals
            if col_name not in food_columns:
                cursor.execute(f"ALTER TABLE food_items ADD COLUMN {col_name} {col_def}")
                logger.info(f"Added {col_name} column to food_items table")

        logger.info("Diet tracking tables created/verified")
        logger.info("Exercise tracking tables created/verified")
