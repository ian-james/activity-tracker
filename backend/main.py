from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database import init_db
from routers import activities, logs, scores, categories, auth, export, analytics, exercises, workouts, preferences, templates, todos, special_days

app = FastAPI(title="Activity Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(activities.router)
app.include_router(logs.router)
app.include_router(scores.router)
app.include_router(categories.router)
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(exercises.router)
app.include_router(workouts.router)
app.include_router(preferences.router)
app.include_router(templates.router)
app.include_router(todos.router)
app.include_router(special_days.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"message": "Activity Tracker API"}
