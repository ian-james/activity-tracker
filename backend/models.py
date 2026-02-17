from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional, List, Dict
import re

# Valid days: mon, tue, wed, thu, fri, sat, sun
VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


class ActivityCreate(BaseModel):
    name: str
    points: int = 10
    days_of_week: Optional[List[str]] = None  # None means every day
    category_id: Optional[int] = None
    completion_type: str = 'checkbox'  # 'checkbox', 'rating', or 'energy_quality'
    rating_scale: Optional[int] = 5  # Only for 'rating' type: 3, 5, or 10
    schedule_frequency: str = 'weekly'  # 'weekly' or 'biweekly'
    biweekly_start_date: Optional[date] = None  # Required for 'biweekly'
    notes: Optional[str] = None

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

    @field_validator('completion_type')
    @classmethod
    def validate_completion_type(cls, v: str) -> str:
        if v not in ['checkbox', 'rating', 'energy_quality']:
            raise ValueError('Completion type must be checkbox, rating, or energy_quality')
        return v

    @field_validator('rating_scale')
    @classmethod
    def validate_rating_scale(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v not in [3, 5, 10]:
            raise ValueError('Rating scale must be 3, 5, or 10')
        return v

    @field_validator('schedule_frequency')
    @classmethod
    def validate_schedule_frequency(cls, v: str) -> str:
        if v not in ['weekly', 'biweekly']:
            raise ValueError('Schedule frequency must be weekly or biweekly')
        return v


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    points: Optional[int] = None
    days_of_week: Optional[List[str]] = None
    category_id: Optional[int] = None
    completion_type: Optional[str] = None
    rating_scale: Optional[int] = None
    schedule_frequency: Optional[str] = None
    biweekly_start_date: Optional[date] = None
    notes: Optional[str] = None

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

    @field_validator('completion_type')
    @classmethod
    def validate_completion_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['checkbox', 'rating', 'energy_quality']:
            raise ValueError('Completion type must be checkbox, rating, or energy_quality')
        return v

    @field_validator('rating_scale')
    @classmethod
    def validate_rating_scale(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v not in [3, 5, 10]:
            raise ValueError('Rating scale must be 3, 5, or 10')
        return v

    @field_validator('schedule_frequency')
    @classmethod
    def validate_schedule_frequency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['weekly', 'biweekly']:
            raise ValueError('Schedule frequency must be weekly or biweekly')
        return v


class Activity(BaseModel):
    id: int
    name: str
    points: int
    is_active: bool
    days_of_week: Optional[List[str]]
    category_id: Optional[int]
    completion_type: str
    rating_scale: Optional[int]
    schedule_frequency: str
    biweekly_start_date: Optional[date]
    notes: Optional[str]
    created_at: datetime


class LogCreate(BaseModel):
    activity_id: int
    completed_at: date
    energy_level: Optional[str] = None
    quality_rating: Optional[str] = None
    rating_value: Optional[int] = None
    notes: Optional[str] = None

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

    @field_validator('rating_value')
    @classmethod
    def validate_rating_value(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v < 1 or v > 10:
            raise ValueError('Rating value must be between 1 and 10')
        return v


class Log(BaseModel):
    id: int
    activity_id: int
    completed_at: date
    energy_level: Optional[str] = None
    quality_rating: Optional[str] = None
    rating_value: Optional[int] = None
    notes: Optional[str] = None
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


# Password Reset Models

class PasswordResetRequest(BaseModel):
    email: str

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


class PasswordReset(BaseModel):
    token: str
    new_password: str

    @field_validator('token')
    @classmethod
    def validate_token(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Token cannot be empty')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 100:
            raise ValueError('Password cannot exceed 100 characters')
        return v


class PasswordResetToken(BaseModel):
    id: int
    token: str
    user_id: int
    created_at: datetime
    expires_at: datetime


# Exercise Tracking Models

class ExerciseCreate(BaseModel):
    name: str
    exercise_type: str  # 'reps', 'time', or 'weight'
    default_value: Optional[float] = None
    default_weight_unit: Optional[str] = None  # 'lbs' or 'kg'
    notes: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) > 100:
            raise ValueError('Name cannot exceed 100 characters')
        return v

    @field_validator('exercise_type')
    @classmethod
    def validate_exercise_type(cls, v: str) -> str:
        if v not in ['reps', 'time', 'weight']:
            raise ValueError('Exercise type must be reps, time, or weight')
        return v

    @field_validator('default_weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    exercise_type: Optional[str] = None
    default_value: Optional[float] = None
    default_weight_unit: Optional[str] = None
    notes: Optional[str] = None

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

    @field_validator('exercise_type')
    @classmethod
    def validate_exercise_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['reps', 'time', 'weight']:
            raise ValueError('Exercise type must be reps, time, or weight')
        return v

    @field_validator('default_weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v


class Exercise(BaseModel):
    id: int
    user_id: int
    name: str
    exercise_type: str
    default_value: Optional[float]
    default_weight_unit: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime


class WorkoutSessionCreate(BaseModel):
    name: Optional[str] = None
    started_at: datetime
    notes: Optional[str] = None


class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = None
    completed_at: Optional[datetime] = None
    paused_duration: Optional[int] = None
    total_duration: Optional[int] = None
    notes: Optional[str] = None


class WorkoutSession(BaseModel):
    id: int
    user_id: int
    name: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    paused_duration: int
    total_duration: Optional[int]
    notes: Optional[str]
    created_at: datetime


class SessionExerciseCreate(BaseModel):
    workout_session_id: int
    exercise_id: int
    order_index: int
    target_sets: int = 1
    target_value: Optional[float] = None
    rest_seconds: int = 60
    notes: Optional[str] = None


class SessionExercise(BaseModel):
    id: int
    workout_session_id: int
    exercise_id: int
    order_index: int
    target_sets: int
    target_value: Optional[float]
    rest_seconds: int
    notes: Optional[str]
    created_at: datetime


class ExerciseSetCreate(BaseModel):
    session_exercise_id: int
    set_number: int
    reps: Optional[int] = None
    duration_seconds: Optional[int] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    completed_at: datetime
    notes: Optional[str] = None

    @field_validator('weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v


class ExerciseSet(BaseModel):
    id: int
    session_exercise_id: int
    set_number: int
    reps: Optional[int]
    duration_seconds: Optional[int]
    weight: Optional[float]
    weight_unit: Optional[str]
    completed_at: datetime
    notes: Optional[str]
    created_at: datetime


class UserPreferences(BaseModel):
    id: int
    user_id: int
    weight_unit: str
    default_rest_seconds: int
    enable_weekly_email: bool
    email_address: Optional[str]
    last_email_sent_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class UserPreferencesUpdate(BaseModel):
    weight_unit: Optional[str] = None
    default_rest_seconds: Optional[int] = None
    enable_weekly_email: Optional[bool] = None
    email_address: Optional[str] = None

    @field_validator('weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v

    @field_validator('default_rest_seconds')
    @classmethod
    def validate_rest_seconds(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v < 0:
            raise ValueError('Rest seconds cannot be negative')
        if v > 3600:
            raise ValueError('Rest seconds cannot exceed 3600 (1 hour)')
        return v

    @field_validator('email_address')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if not v:
            return None
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        if len(v) > 255:
            raise ValueError('Email cannot exceed 255 characters')
        return v


# Workout Template Models

class WorkoutTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) > 100:
            raise ValueError('Name cannot exceed 100 characters')
        return v


class WorkoutTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

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


class WorkoutTemplate(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TemplateExerciseCreate(BaseModel):
    template_id: int
    exercise_id: int
    order_index: int
    target_sets: int = 3
    target_value: Optional[float] = None
    rest_seconds: int = 60
    notes: Optional[str] = None


class TemplateExercise(BaseModel):
    id: int
    template_id: int
    exercise_id: int
    order_index: int
    target_sets: int
    target_value: Optional[float]
    rest_seconds: int
    notes: Optional[str]
    created_at: datetime


# Todo Models

class TodoCreate(BaseModel):
    text: str
    order_index: int = 0
    category: str = 'personal'  # 'personal' or 'professional'

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Text cannot be empty')
        if len(v) > 500:
            raise ValueError('Text cannot exceed 500 characters')
        return v

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in ('personal', 'professional'):
            raise ValueError('Category must be either "personal" or "professional"')
        return v


class TodoUpdate(BaseModel):
    text: Optional[str] = None
    is_completed: Optional[bool] = None
    order_index: Optional[int] = None
    category: Optional[str] = None

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError('Text cannot be empty')
        if len(v) > 500:
            raise ValueError('Text cannot exceed 500 characters')
        return v

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ('personal', 'professional'):
            raise ValueError('Category must be either "personal" or "professional"')
        return v


class Todo(BaseModel):
    id: int
    user_id: int
    text: str
    is_completed: bool
    completed_at: Optional[datetime]
    order_index: int
    category: str
    created_at: datetime
    updated_at: datetime


# Special Day Models

class SpecialDayCreate(BaseModel):
    date: date
    day_type: str  # 'rest', 'recovery', or 'vacation'
    notes: Optional[str] = None

    @field_validator('day_type')
    @classmethod
    def validate_day_type(cls, v: str) -> str:
        if v not in ['rest', 'recovery', 'vacation']:
            raise ValueError('Day type must be rest, recovery, or vacation')
        return v


class SpecialDayUpdate(BaseModel):
    day_type: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('day_type')
    @classmethod
    def validate_day_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['rest', 'recovery', 'vacation']:
            raise ValueError('Day type must be rest, recovery, or vacation')
        return v


class SpecialDay(BaseModel):
    id: int
    user_id: int
    date: date
    day_type: str
    notes: Optional[str]
    created_at: datetime


# Diet Tracking Models

class NutritionGoalsCreate(BaseModel):
    base_calories: int = 2000
    protein_g: int = 150
    carbs_g: int = 200
    fat_g: int = 65
    fiber_g: Optional[int] = 25
    vitamin_c_mg: Optional[int] = 90
    vitamin_d_mcg: Optional[int] = 20
    calcium_mg: Optional[int] = 1000
    iron_mg: Optional[int] = 18
    adjust_for_activity: bool = True
    calories_per_activity_point: float = 10.0
    target_weight: Optional[float] = None
    weight_unit: str = 'lbs'

    @field_validator('weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: str) -> str:
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v


class NutritionGoalsUpdate(BaseModel):
    base_calories: Optional[int] = None
    protein_g: Optional[int] = None
    carbs_g: Optional[int] = None
    fat_g: Optional[int] = None
    fiber_g: Optional[int] = None
    vitamin_c_mg: Optional[int] = None
    vitamin_d_mcg: Optional[int] = None
    calcium_mg: Optional[int] = None
    iron_mg: Optional[int] = None
    adjust_for_activity: Optional[bool] = None
    calories_per_activity_point: Optional[float] = None
    target_weight: Optional[float] = None
    weight_unit: Optional[str] = None

    @field_validator('weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v


class NutritionGoals(BaseModel):
    id: int
    user_id: int
    base_calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int
    vitamin_c_mg: int
    vitamin_d_mcg: int
    calcium_mg: int
    iron_mg: int
    adjust_for_activity: bool
    calories_per_activity_point: float
    target_weight: Optional[float]
    weight_unit: str
    created_at: datetime
    updated_at: datetime


class MealCreate(BaseModel):
    meal_date: date
    meal_type: str
    name: str
    total_calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    vitamin_c_mg: float = 0
    vitamin_d_mcg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0
    notes: Optional[str] = None

    @field_validator('meal_type')
    @classmethod
    def validate_meal_type(cls, v: str) -> str:
        if v not in ['breakfast', 'lunch', 'dinner', 'snack']:
            raise ValueError('Invalid meal type')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) > 200:
            raise ValueError('Name cannot exceed 200 characters')
        return v


class Meal(BaseModel):
    id: int
    user_id: int
    meal_date: date
    meal_type: str
    name: str
    total_calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    vitamin_c_mg: float
    vitamin_d_mcg: float
    calcium_mg: float
    iron_mg: float
    notes: Optional[str]
    created_at: datetime


class FoodItemCreate(BaseModel):
    name: str
    serving_size: str
    calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    vitamin_c_mg: float = 0
    vitamin_d_mcg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        if len(v) > 200:
            raise ValueError('Name cannot exceed 200 characters')
        return v

    @field_validator('serving_size')
    @classmethod
    def validate_serving_size(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Serving size cannot be empty')
        if len(v) > 100:
            raise ValueError('Serving size cannot exceed 100 characters')
        return v


class FoodItem(BaseModel):
    id: int
    user_id: int
    name: str
    serving_size: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    vitamin_c_mg: float
    vitamin_d_mcg: float
    calcium_mg: float
    iron_mg: float
    is_active: bool
    created_at: datetime


class WeightLogCreate(BaseModel):
    log_date: date
    weight: float
    weight_unit: str = 'lbs'
    notes: Optional[str] = None

    @field_validator('weight_unit')
    @classmethod
    def validate_weight_unit(cls, v: str) -> str:
        if v not in ['lbs', 'kg']:
            raise ValueError('Weight unit must be lbs or kg')
        return v

    @field_validator('weight')
    @classmethod
    def validate_weight(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Weight must be positive')
        if v > 1000:
            raise ValueError('Weight must be less than 1000')
        return v


class WeightLog(BaseModel):
    id: int
    user_id: int
    log_date: date
    weight: float
    weight_unit: str
    notes: Optional[str]
    created_at: datetime


class DailyNutritionSummary(BaseModel):
    date: date
    goals: NutritionGoals
    actual: Dict[str, float]
    percentage: Dict[str, float]
    meals: List[Meal]
    activity_points: int
    adjusted_calorie_goal: int
