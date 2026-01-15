from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from auth.middleware import get_current_user
from database import get_db
from models import User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/export")
async def export_data(current_user: User = Depends(get_current_user)):
    """
    Export all user data as JSON.
    Includes activities, categories, logs, and user info.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get activities
            cursor.execute("""
                SELECT id, name, points, is_active, days_of_week, category_id, created_at
                FROM activities
                WHERE user_id = ?
                ORDER BY created_at
            """, (current_user.id,))
            activities = [dict(row) for row in cursor.fetchall()]

            # Get categories
            cursor.execute("""
                SELECT id, name, color, icon, is_active, created_at
                FROM categories
                WHERE user_id = ?
                ORDER BY created_at
            """, (current_user.id,))
            categories = [dict(row) for row in cursor.fetchall()]

            # Get logs
            cursor.execute("""
                SELECT id, activity_id, completed_at, created_at
                FROM activity_logs
                WHERE user_id = ?
                ORDER BY completed_at DESC
            """, (current_user.id,))
            logs = [dict(row) for row in cursor.fetchall()]

        export_data = {
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat(),
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "name": current_user.name
            },
            "activities": activities,
            "categories": categories,
            "logs": logs,
            "statistics": {
                "total_activities": len(activities),
                "total_categories": len(categories),
                "total_logs": len(logs)
            }
        }

        logger.info(f"User {current_user.email} exported data: {len(activities)} activities, {len(logs)} logs")

        return JSONResponse(content=export_data)

    except Exception as e:
        logger.error(f"Export failed for user {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Export failed")


@router.post("/import")
async def import_data(import_data: dict, current_user: User = Depends(get_current_user)):
    """
    Import data from JSON export.
    Merges with existing data (does not delete existing data).
    """
    try:
        # Validate import data structure
        if "version" not in import_data or "activities" not in import_data:
            raise HTTPException(status_code=400, detail="Invalid import data format")

        with get_db() as conn:
            cursor = conn.cursor()

            # Map old IDs to new IDs for categories
            category_id_map = {}

            # Import categories
            if "categories" in import_data:
                for cat in import_data["categories"]:
                    old_id = cat["id"]
                    # Check if category with same name exists
                    cursor.execute("""
                        SELECT id FROM categories
                        WHERE user_id = ? AND name = ?
                    """, (current_user.id, cat["name"]))
                    existing = cursor.fetchone()

                    if existing:
                        category_id_map[old_id] = existing["id"]
                    else:
                        cursor.execute("""
                            INSERT INTO categories (name, color, icon, is_active, user_id, created_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            cat["name"],
                            cat["color"],
                            cat.get("icon"),
                            cat.get("is_active", 1),
                            current_user.id,
                            cat.get("created_at", datetime.utcnow().isoformat())
                        ))
                        category_id_map[old_id] = cursor.lastrowid

            # Map old IDs to new IDs for activities
            activity_id_map = {}

            # Import activities
            for act in import_data["activities"]:
                old_id = act["id"]
                category_id = None
                if act.get("category_id") and act["category_id"] in category_id_map:
                    category_id = category_id_map[act["category_id"]]

                # Check if activity with same name exists
                cursor.execute("""
                    SELECT id FROM activities
                    WHERE user_id = ? AND name = ?
                """, (current_user.id, act["name"]))
                existing = cursor.fetchone()

                if existing:
                    activity_id_map[old_id] = existing["id"]
                else:
                    cursor.execute("""
                        INSERT INTO activities (name, points, is_active, days_of_week, category_id, user_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        act["name"],
                        act["points"],
                        act.get("is_active", 1),
                        act.get("days_of_week"),
                        category_id,
                        current_user.id,
                        act.get("created_at", datetime.utcnow().isoformat())
                    ))
                    activity_id_map[old_id] = cursor.lastrowid

            # Import logs
            imported_logs = 0
            if "logs" in import_data:
                for log in import_data["logs"]:
                    if log["activity_id"] in activity_id_map:
                        activity_id = activity_id_map[log["activity_id"]]

                        # Check if log already exists
                        cursor.execute("""
                            SELECT id FROM activity_logs
                            WHERE user_id = ? AND activity_id = ? AND completed_at = ?
                        """, (current_user.id, activity_id, log["completed_at"]))

                        if not cursor.fetchone():
                            cursor.execute("""
                                INSERT INTO activity_logs (activity_id, completed_at, user_id, created_at)
                                VALUES (?, ?, ?, ?)
                            """, (
                                activity_id,
                                log["completed_at"],
                                current_user.id,
                                log.get("created_at", datetime.utcnow().isoformat())
                            ))
                            imported_logs += 1

        logger.info(f"User {current_user.email} imported data: {len(activity_id_map)} activities, {imported_logs} logs")

        return {
            "message": "Import successful",
            "imported": {
                "activities": len(activity_id_map),
                "categories": len(category_id_map),
                "logs": imported_logs
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed for user {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
