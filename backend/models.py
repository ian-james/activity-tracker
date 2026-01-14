from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

# Valid days: mon, tue, wed, thu, fri, sat, sun
VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


class ActivityCreate(BaseModel):
    name: str
    points: int = 10
    days_of_week: Optional[List[str]] = None  # None means every day
    category_id: Optional[int] = None


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    points: Optional[int] = None
    days_of_week: Optional[List[str]] = None
    category_id: Optional[int] = None


class Activity(BaseModel):
    id: int
    name: str
    points: int
    is_active: bool
    days_of_week: Optional[List[str]]
    category_id: Optional[int]
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


class CategoryCreate(BaseModel):
    name: str
    color: str = '#3B82F6'
    icon: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class Category(BaseModel):
    id: int
    name: str
    color: str
    icon: Optional[str]
    is_active: bool
    created_at: datetime


class CategorySummary(BaseModel):
    category_id: Optional[int]
    category_name: str
    category_color: str
    total_points: int
    max_possible_points: int
    completed_count: int
    total_activities: int
    percentage: float
