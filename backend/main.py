import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from database import init_db
from routers import (
    activities, logs, scores, categories, auth, 
    export, analytics, exercises, workouts, 
    preferences, templates, todos, special_days
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    # Replaces @app.on_event("startup")
    init_db()
    
    yield
    
    # --- Shutdown ---
    # Replaces @app.on_event("shutdown") (if you had any)
    pass

app = FastAPI(title="Activity Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",  # Docker frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
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

@app.get("/")
def root():
    return {"message": "Activity Tracker API"}
