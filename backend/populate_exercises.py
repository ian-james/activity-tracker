"""
Script to populate the exercise library with common exercises.
Run this to add sample exercises to your workout library.
"""

from database import get_db

# Common exercises organized by category
COMMON_EXERCISES = [
    # Bodyweight - Reps
    ("Push-ups", "reps", 15, None, "Standard push-ups"),
    ("Sit-ups", "reps", 20, None, "Standard abdominal sit-ups"),
    ("Squats", "reps", 20, None, "Bodyweight squats"),
    ("Lunges", "reps", 12, None, "Alternating leg lunges"),
    ("Pull-ups", "reps", 8, None, "Standard pull-ups"),
    ("Dips", "reps", 10, None, "Parallel bar or bench dips"),
    ("Burpees", "reps", 10, None, "Full burpees"),
    ("Mountain Climbers", "reps", 20, None, "Alternating mountain climbers"),
    ("Jumping Jacks", "reps", 30, None, "Standard jumping jacks"),

    # Bodyweight - Time
    ("Plank", "time", 60, None, "Standard forearm or high plank"),
    ("Wall Sit", "time", 45, None, "Static wall sit hold"),
    ("Dead Hang", "time", 30, None, "Hanging from pull-up bar"),
    ("Side Plank (Left)", "time", 30, None, "Left side plank"),
    ("Side Plank (Right)", "time", 30, None, "Right side plank"),

    # Kettlebell - Weight
    ("Kettlebell Swings", "weight", 35, "lbs", "Two-handed kettlebell swings"),
    ("Kettlebell Goblet Squat", "weight", 35, "lbs", "Goblet squat holding kettlebell"),
    ("Kettlebell Turkish Get-Up", "weight", 25, "lbs", "Full Turkish get-up"),
    ("Kettlebell Clean and Press", "weight", 35, "lbs", "Single arm clean and press"),
    ("Kettlebell Snatch", "weight", 35, "lbs", "Single arm snatch"),

    # Barbell/Weight Training - Weight
    ("Bench Press", "weight", 135, "lbs", "Flat barbell bench press"),
    ("Squat", "weight", 185, "lbs", "Barbell back squat"),
    ("Deadlift", "weight", 225, "lbs", "Conventional barbell deadlift"),
    ("Overhead Press", "weight", 95, "lbs", "Standing barbell overhead press"),
    ("Barbell Row", "weight", 135, "lbs", "Bent-over barbell row"),

    # Dumbbell - Weight
    ("Dumbbell Bench Press", "weight", 50, "lbs", "Flat dumbbell bench press (per hand)"),
    ("Dumbbell Shoulder Press", "weight", 35, "lbs", "Seated or standing press (per hand)"),
    ("Dumbbell Bicep Curl", "weight", 25, "lbs", "Standing bicep curl (per hand)"),
    ("Dumbbell Tricep Extension", "weight", 25, "lbs", "Overhead tricep extension"),
    ("Dumbbell Lunges", "weight", 30, "lbs", "Walking lunges with dumbbells (per hand)"),
    ("Dumbbell Romanian Deadlift", "weight", 40, "lbs", "RDL with dumbbells (per hand)"),

    # Core - Reps
    ("Crunches", "reps", 25, None, "Standard abdominal crunches"),
    ("Russian Twists", "reps", 30, None, "Seated torso twists"),
    ("Leg Raises", "reps", 15, None, "Lying leg raises"),
    ("Bicycle Crunches", "reps", 30, None, "Alternating bicycle crunches"),

    # Cardio - Time
    ("Jump Rope", "time", 60, None, "Continuous jump rope"),
    ("Running", "time", 300, None, "Steady pace running (5 min default)"),
    ("High Knees", "time", 30, None, "High knee running in place"),
]


def populate_exercises():
    """Add common exercises to the database for all active users."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get all active users
        cursor.execute("SELECT id, email FROM users")
        users = cursor.fetchall()

        if not users:
            print("No users found in database. Create an account first.")
            return

        print(f"Found {len(users)} user(s)")

        for user in users:
            user_id = user['id']
            user_email = user['email']

            print(f"\nAdding exercises for user: {user_email} (ID: {user_id})")

            # Check if user already has exercises
            cursor.execute(
                "SELECT COUNT(*) as count FROM exercises WHERE user_id = ? AND is_active = 1",
                (user_id,)
            )
            existing_count = cursor.fetchone()['count']

            if existing_count > 0:
                response = input(f"  User already has {existing_count} exercise(s). Add more? (y/n): ")
                if response.lower() != 'y':
                    print(f"  Skipping user {user_email}")
                    continue

            # Insert exercises
            added = 0
            for name, ex_type, default_val, weight_unit, notes in COMMON_EXERCISES:
                # Check if exercise already exists for this user
                cursor.execute(
                    "SELECT id FROM exercises WHERE user_id = ? AND name = ? AND is_active = 1",
                    (user_id, name)
                )
                if cursor.fetchone():
                    continue  # Skip duplicates

                cursor.execute(
                    """INSERT INTO exercises
                    (user_id, name, exercise_type, default_value, default_weight_unit, notes)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    (user_id, name, ex_type, default_val, weight_unit, notes)
                )
                added += 1

            print(f"  Added {added} new exercise(s) to library")

        print("\n✓ Exercise library population complete!")


if __name__ == "__main__":
    print("Exercise Library Populator")
    print("=" * 50)
    populate_exercises()
