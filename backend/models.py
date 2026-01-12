from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

# Valid days: mon, tue, wed, thu, fri, sat, sun
VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


class ActivityCreate(BaseModel):
    name: str
    points: int = 10
    days_of_week: Optional[List[str]] = None  # None means every day


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    points: Optional[int] = None
    days_of_week: Optional[List[str]] = None


class Activity(BaseModel):
    id: int
    name: str
    points: int
    is_active: bool
    days_of_week: Optional[List[str]]
    created_at: datetime


class LogCreate(BaseModel):
    activity_id: int
    completed_at: date


class Log(BaseModel):
    id: int
    activity_id: int
    completed_at: date
    created_at: datetime


class ScoreResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_points: int
    max_possible_points: int
    completed_count: int
    total_activities: int
    percentage: float
