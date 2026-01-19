from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional, List
import re

# Valid days: mon, tue, wed, thu, fri, sat, sun
VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


class ActivityCreate(BaseModel):
    name: str
    points: int = 10
    days_of_week: Optional[List[str]] = None  # None means every day
    category_id: Optional[int] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) > 100:
            raise ValueError('Name cannot exceed 100 characters')
        return v

    @field_validator('points')
    @classmethod
    def validate_points(cls, v: int) -> int:
        if v == 0:
            raise ValueError('Points cannot be 0')
        if v < -1000:
            raise ValueError('Points cannot be less than -1000')
        if v > 1000:
            raise ValueError('Points cannot exceed 1000')
        return v

    @field_validator('days_of_week')
    @classmethod
    def validate_days(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None or len(v) == 0:
            return None

        invalid_days = [day for day in v if day not in VALID_DAYS]
        if invalid_days:
            raise ValueError(f'Invalid days: {invalid_days}. Must be one of: {VALID_DAYS}')

        # Remove duplicates while preserving order
        seen = set()
        unique_days = []
        for day in v:
            if day not in seen:
                seen.add(day)
                unique_days.append(day)

        return unique_days if unique_days else None


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    points: Optional[int] = None
    days_of_week: Optional[List[str]] = None
    category_id: Optional[int] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) > 100:
            raise ValueError('Name cannot exceed 100 characters')
        return v

    @field_validator('points')
    @classmethod
    def validate_points(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v == 0:
            raise ValueError('Points cannot be 0')
        if v < -1000:
            raise ValueError('Points cannot be less than -1000')
        if v > 1000:
            raise ValueError('Points cannot exceed 1000')
        return v

    @field_validator('days_of_week')
    @classmethod
    def validate_days(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None or len(v) == 0:
            return None

        invalid_days = [day for day in v if day not in VALID_DAYS]
        if invalid_days:
            raise ValueError(f'Invalid days: {invalid_days}. Must be one of: {VALID_DAYS}')

        # Remove duplicates while preserving order
        seen = set()
        unique_days = []
        for day in v:
            if day not in seen:
                seen.add(day)
                unique_days.append(day)

        return unique_days if unique_days else None


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
    energy_level: Optional[str] = None
    quality_rating: Optional[str] = None

    @field_validator('energy_level')
    @classmethod
    def validate_energy_level(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['low', 'medium', 'high']:
            raise ValueError('Energy level must be low, medium, or high')
        return v

    @field_validator('quality_rating')
    @classmethod
    def validate_quality_rating(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['low', 'medium', 'high']:
            raise ValueError('Quality rating must be low, medium, or high')
        return v


class Log(BaseModel):
    id: int
    activity_id: int
    completed_at: date
    energy_level: Optional[str] = None
    quality_rating: Optional[str] = None
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

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty or whitespace only')
        if len(v) > 50:
            raise ValueError('Name cannot exceed 50 characters')
        return v

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #3B82F6)')
        return v.upper()  # Normalize to uppercase


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty or whitespace only')
        if len(v) > 50:
            raise ValueError('Name cannot exceed 50 characters')
        return v

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #3B82F6)')
        return v.upper()  # Normalize to uppercase


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


class User(BaseModel):
    id: int
    google_id: Optional[str] = None
    email: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime
    last_login_at: datetime


class UserSignup(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError('Email cannot be empty')
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        if len(v) > 255:
            raise ValueError('Email cannot exceed 255 characters')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 100:
            raise ValueError('Password cannot exceed 100 characters')
        return v


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class Session(BaseModel):
    id: int
    session_id: str
    user_id: int
    created_at: datetime
    expires_at: datetime
