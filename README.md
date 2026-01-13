# Activity Tracker

A daily activity tracking application with scoring and day-of-week scheduling. Track habits like workouts, vitamins, and meal prep with customizable point values and schedules.

## Features

- **Activity Management**: Create recurring activities with custom point values
- **Day-of-Week Scheduling**: Schedule activities for specific days (e.g., Cycling MWF, Yoga T/Th)
- **Daily Tracking**: Check off completed activities with a simple click
- **Score Calculation**: View daily, weekly, and monthly scores (points + percentages)
- **Template Activities**: Quick-add common activities like Workout, Cycling, Yoga, Vitamins

## Tech Stack

- **Backend**: Python, FastAPI, SQLite
- **Frontend**: TypeScript, React, Vite, Tailwind CSS

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The API will be available at http://localhost:8001 with docs at http://localhost:8001/docs

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:5173

## Usage

1. **Add Activities**: Click "Manage Activities" → "Add Activity"
   - Use quick-add templates or create custom activities
   - Set point values (5, 10, 25, 50, 100, 200)
   - Optionally schedule for specific days of the week

2. **Track Daily Progress**: Check off activities as you complete them

3. **View Scores**: See your daily, weekly, and monthly scores with progress bars

4. **Navigate Dates**: Use the arrows to view past or future days

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/activities | List all activities |
| POST | /api/activities | Create activity |
| PUT | /api/activities/{id} | Update activity |
| DELETE | /api/activities/{id} | Delete activity |
| GET | /api/logs?date={date} | Get logs for a date |
| POST | /api/logs | Log activity completion |
| DELETE | /api/logs/{id} | Remove log entry |
| GET | /api/scores/daily?date={date} | Get daily score |
| GET | /api/scores/weekly?date={date} | Get weekly score |
| GET | /api/scores/monthly?year={year}&month={month} | Get monthly score |

## License

MIT
