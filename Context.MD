# Activity Tracker - Project Context

## Project Overview

A full-stack web application for tracking daily activities, workouts, and todos with points-based scoring, streak tracking, and interval training capabilities.

**Current Status:** Production-ready with comprehensive feature set
**Last Updated:** January 2026

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite with direct connection management
- **Authentication:** Google OAuth 2.0 with HTTP-only session cookies
- **API Style:** RESTful JSON APIs
- **CORS:** Configured for localhost:5173, localhost:5174

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with dark mode support
- **State Management:** React hooks (useState, useCallback, useEffect)
- **Routing:** Single-page app with view-based navigation
- **HTTP Client:** Native fetch API with credential support

### Development
- **Version Control:** Git + GitHub
- **Package Managers:** npm (frontend), pip (backend)
- **Dev Servers:** Vite dev server (frontend), Uvicorn (backend)

---

## Architecture

### Project Structure
```
activity-tracker/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── database.py             # Database initialization & schema
│   ├── models.py               # Pydantic models for validation
│   ├── auth/
│   │   ├── google_auth.py      # Google OAuth implementation
│   │   └── middleware.py       # Authentication middleware
│   └── routers/
│       ├── activities.py       # Activity CRUD
│       ├── logs.py             # Activity logging
│       ├── scores.py           # Score calculations
│       ├── categories.py       # Category management
│       ├── analytics.py        # Analytics & streaks
│       ├── exercises.py        # Exercise library & progress
│       ├── workouts.py         # Workout sessions
│       ├── templates.py        # Workout templates
│       ├── preferences.py      # User preferences
│       └── todos.py            # Todo list management
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main app with auth & routing
│   │   ├── main.tsx            # React entry point
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── contexts/           # React contexts
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   └── package.json
└── activity_tracker.db         # SQLite database file
```

### Authentication Flow
1. User clicks "Sign in with Google"
2. Backend redirects to Google OAuth consent screen
3. Google redirects back with authorization code
4. Backend exchanges code for user info
5. Backend creates/updates user in database
6. Backend sets HTTP-only session cookie
7. All subsequent API calls include cookie automatically
8. 401 responses redirect to login screen

---

## Database Schema

### Core Tables

#### users
- `id` INTEGER PRIMARY KEY
- `email` TEXT UNIQUE
- `name` TEXT
- `profile_picture` TEXT
- `created_at` DATETIME

#### activities
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `name` TEXT
- `points` INTEGER (can be negative)
- `is_active` INTEGER (0/1)
- `days_of_week` TEXT (JSON array: ["mon", "tue", ...])
- `category_id` INTEGER → categories(id)
- `created_at` DATETIME

#### logs
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `activity_id` INTEGER → activities(id)
- `completed_at` DATETIME
- `energy_level` TEXT ("low", "medium", "high")
- `quality_rating` TEXT ("low", "medium", "high")
- `created_at` DATETIME

#### categories
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `name` TEXT
- `color` TEXT (hex color)
- `icon` TEXT
- `is_active` INTEGER (0/1)
- `created_at` DATETIME

### Workout Tables

#### exercises
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `name` TEXT
- `exercise_type` TEXT ("reps", "time", "weight")
- `default_value` REAL
- `default_weight_unit` TEXT ("lbs", "kg")
- `notes` TEXT
- `is_active` INTEGER (0/1)

#### workout_sessions
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `name` TEXT
- `started_at` DATETIME
- `completed_at` DATETIME
- `paused_duration` INTEGER (seconds)
- `total_duration` INTEGER (seconds)
- `notes` TEXT

#### session_exercises
- `id` INTEGER PRIMARY KEY
- `workout_session_id` INTEGER → workout_sessions(id)
- `exercise_id` INTEGER → exercises(id)
- `order_index` INTEGER
- `target_sets` INTEGER
- `target_value` REAL
- `rest_seconds` INTEGER
- `notes` TEXT

#### exercise_sets
- `id` INTEGER PRIMARY KEY
- `session_exercise_id` INTEGER → session_exercises(id)
- `set_number` INTEGER
- `reps` INTEGER
- `duration_seconds` INTEGER
- `weight` REAL
- `weight_unit` TEXT ("lbs", "kg")
- `completed_at` DATETIME
- `notes` TEXT

#### workout_templates
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `name` TEXT
- `description` TEXT
- `is_active` INTEGER (0/1)

#### template_exercises
- `id` INTEGER PRIMARY KEY
- `template_id` INTEGER → workout_templates(id)
- `exercise_id` INTEGER → exercises(id)
- `order_index` INTEGER
- `target_sets` INTEGER
- `target_value` REAL
- `rest_seconds` INTEGER
- `notes` TEXT

### Todo Tables

#### todos
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER → users(id)
- `text` TEXT
- `is_completed` INTEGER (0/1)
- `completed_at` DATETIME
- `order_index` INTEGER
- `created_at` DATETIME
- `updated_at` DATETIME

---

## Features

### 1. Daily Activity Tracking
**Location:** Today tab (tracker view)

**Capabilities:**
- Create activities with names and point values (positive or negative)
- Schedule activities for specific days of week
- Organize activities by categories
- Log completion with timestamp
- Add energy level (low/medium/high) to logs
- Add quality rating (low/medium/high) to logs
- Skip activities for specific days
- View adjusted scores excluding skipped activities

**Components:**
- `DailyTracker.tsx` - Main tracking interface
- `ActivityForm.tsx` - Create/edit activities
- `ActivityList.tsx` - Manage activities

**APIs:**
- `GET /api/activities` - List all activities
- `POST /api/activities` - Create activity
- `PUT /api/activities/{id}` - Update activity
- `DELETE /api/activities/{id}` - Delete activity
- `GET /api/logs?date={date}` - Get logs for date
- `POST /api/logs` - Create log
- `DELETE /api/logs/{id}` - Delete log

### 2. Scoring System
**Location:** Today tab, Dashboard tab

**Capabilities:**
- Daily score: completed vs scheduled activities
- Weekly score: rolling 7-day window
- Monthly score: current calendar month
- Percentage-based scoring
- Max possible points calculation
- Completion rate tracking

**Components:**
- `ScoreDisplay.tsx` - Score visualization
- `Dashboard.tsx` - Historical view

**APIs:**
- `GET /api/scores/daily?date={date}` - Daily score
- `GET /api/scores/weekly?date={date}` - Weekly score
- `GET /api/scores/monthly?year={year}&month={month}` - Monthly score

### 3. Categories
**Location:** Activities tab (manage view)

**Capabilities:**
- Group activities by category
- Assign colors to categories
- Add emoji icons to categories
- View category-based performance
- Filter/organize by category

**Components:**
- `CategoryManager.tsx` - Category CRUD
- Category summary views in Dashboard

**APIs:**
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category
- `GET /api/categories/summaries?date={date}` - Performance by category

### 4. Analytics & Streaks
**Location:** Dashboard tab

**Capabilities:**
- Current streak tracking
- Longest streak tracking
- 30-day completion history calendar
- Category-specific streaks
- Streak requirements: 80%+ completion rate

**Components:**
- `Streaks.tsx` - Streak display
- `CalendarGrid.tsx` - 30-day heat map

**APIs:**
- `GET /api/analytics/streaks?date={date}` - Current/longest streaks
- `GET /api/analytics/category-streaks?date={date}` - Category streaks
- `GET /api/analytics/history?days={days}` - Historical data

### 5. Exercise Tracking
**Location:** Workout tab → Library sub-tab

**Capabilities:**
- Create exercises (reps, time, weight-based)
- Set default values and weight units
- Add notes to exercises
- Search/filter exercise library
- View exercise progress over time
- Graph progress metrics (max weight, max reps, etc.)

**Components:**
- `ExerciseLibrary.tsx` - Exercise management
- `ExerciseProgress.tsx` - SVG-based progress graphs

**APIs:**
- `GET /api/exercises` - List exercises
- `POST /api/exercises` - Create exercise
- `PUT /api/exercises/{id}` - Update exercise
- `DELETE /api/exercises/{id}` - Delete exercise
- `GET /api/exercises/{id}/progress?days={days}` - Progress data

### 6. Workout Sessions
**Location:** Workout tab → Active sub-tab

**Capabilities:**
- Start/pause/resume workout sessions
- Add exercises to active session
- Log sets with reps/duration/weight
- Track workout duration
- Pause tracking (accumulated pause time)
- Add workout notes
- View workout history

**Components:**
- `ActiveWorkout.tsx` - Active session management
- `SetLogger.tsx` - Set logging interface
- `RestTimer.tsx` - Countdown rest timer
- `WorkoutHistory.tsx` - Past workouts

**APIs:**
- `GET /api/workouts/active` - Get active session
- `POST /api/workouts` - Create session
- `PUT /api/workouts/{id}` - Update session
- `GET /api/workouts/session/{id}/exercises` - Session exercises
- `POST /api/workouts/session-exercises` - Add exercise to session
- `POST /api/workouts/sets` - Log exercise set

### 7. Workout Templates
**Location:** Workout tab → Templates sub-tab

**Capabilities:**
- Create reusable workout templates
- Add multiple exercises to template
- Set target sets/reps/rest times
- Start workout from template
- Edit/delete templates

**Components:**
- `WorkoutTemplates.tsx` - Template builder

**APIs:**
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/{id}/exercises` - Template exercises
- `POST /api/templates/exercises` - Add exercise to template
- `DELETE /api/templates/{id}` - Delete template

### 8. Interval Training
**Location:** Workout tab → Active sub-tab → "Start Interval Training" button

**Capabilities:**
- Configure work time (5s-90s with quick select)
- Configure rest time (5s-90s with quick select)
- Configure rounds (1-20)
- 5-second "Get Ready" countdown before start/resume
- Visual phase indicators (WORK/REST/COUNTDOWN)
- Progress bar showing round and exercise
- Auto-advance through exercises and rounds
- Skip current interval
- Pause/Resume with countdown
- Reset workout
- Styled completion screen
- Quick-log to daily activities from completion screen

**Components:**
- `IntervalTimer.tsx` - Countdown timer and workout flow

**Workflow:**
1. Add exercises to workout session
2. Click "⏱️ Start Interval Training"
3. Configure intervals (work/rest/rounds)
4. See workout preview with total time estimate
5. Click "Start Interval Workout"
6. View exercises/rounds ready screen
7. Click "Start Workout" → 5-second countdown
8. Follow WORK/REST cycle through all exercises × rounds
9. View completion screen with stats
10. Optionally log to daily activity tracker
11. Exit interval mode

### 9. Todo List
**Location:** Todo tab

**Capabilities:**
- Create todo items with text
- Drag-and-drop reordering (HTML5 API)
- Inline editing (double-click or Edit button)
- Mark complete/incomplete
- Two sections: "In Progress" and "Completed Today"
- Clear all in-progress todos
- Clear all completed todos
- Delete individual todos

**Components:**
- `TodoList.tsx` - Todo management with drag-and-drop

**APIs:**
- `GET /api/todos` - List todos
- `POST /api/todos` - Create todo
- `PUT /api/todos/{id}` - Update todo
- `DELETE /api/todos/{id}` - Delete todo
- `DELETE /api/todos/in-progress/all` - Clear in-progress
- `DELETE /api/todos/completed/all` - Clear completed
- `POST /api/todos/reorder` - Reorder todos

### 10. User Preferences
**Location:** Settings tab

**Capabilities:**
- Set default weight unit (lbs/kg)
- Set default rest time between sets
- Export data (CSV/JSON)
- View account info

**Components:**
- `Settings.tsx` - Preferences management

**APIs:**
- `GET /api/preferences` - Get preferences
- `PUT /api/preferences` - Update preferences
- `GET /api/export?format={format}` - Export data

---

## Key Custom Hooks

### useActivities()
Manages activity CRUD operations
- `activities` - Array of Activity objects
- `fetchActivities()` - Reload activities
- `createActivity(data)` - Create new
- `updateActivity(id, data)` - Update existing
- `deleteActivity(id)` - Delete activity

### useLogs(date: string)
Manages activity logs for a specific date
- `logs` - Array of Log objects for date
- `fetchLogs()` - Reload logs
- `createLog(data)` - Create log
- `deleteLog(id)` - Delete log

### useScores()
Manages score calculations
- `dailyScore` - Daily score object
- `weeklyScore` - Weekly score object
- `monthlyScore` - Monthly score object
- `fetchDailyScore(date)` - Get daily
- `fetchWeeklyScore(date)` - Get weekly
- `fetchMonthlyScore(year, month)` - Get monthly

### useExercises()
Manages exercise library
- `exercises` - Array of Exercise objects
- CRUD operations similar to useActivities

### useWorkoutSessions()
Manages workout sessions
- `activeSession` - Current active session or null
- `fetchActiveSession()` - Get active session
- `createSession(data)` - Start new workout
- `updateSession(id, data)` - Update session

### useWorkoutTimer(startTime)
Manages workout session timer
- `elapsedSeconds` - Total elapsed time
- `isRunning` - Timer running state
- `isPaused` - Timer paused state
- `pausedDuration` - Accumulated pause time
- `start()`, `pause()`, `resume()`, `stop()`, `reset()`

### useTodos()
Manages todo list
- `todos` - Array of Todo objects
- CRUD operations + `reorderTodos(ids)`, `clearCompleted()`, `clearInProgress()`

---

## Important Type Definitions

### Activity Types
```typescript
type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type EnergyLevel = 'low' | 'medium' | 'high';
type QualityRating = 'low' | 'medium' | 'high';

interface Activity {
  id: number;
  name: string;
  points: number;
  is_active: boolean;
  days_of_week: DayOfWeek[] | null;
  category_id: number | null;
  created_at: string;
}

interface Log {
  id: number;
  activity_id: number;
  completed_at: string;
  energy_level?: EnergyLevel | null;
  quality_rating?: QualityRating | null;
  created_at: string;
}
```

### Exercise Types
```typescript
type ExerciseType = 'reps' | 'time' | 'weight';
type WeightUnit = 'lbs' | 'kg';

interface Exercise {
  id: number;
  name: string;
  exercise_type: ExerciseType;
  default_value: number | null;
  default_weight_unit: WeightUnit | null;
  notes: string | null;
  is_active: boolean;
}

interface ExerciseSet {
  id: number;
  session_exercise_id: number;
  set_number: number;
  reps: number | null;
  duration_seconds: number | null;
  weight: number | null;
  weight_unit: WeightUnit | null;
  completed_at: string;
}
```

### Todo Types
```typescript
interface Todo {
  id: number;
  user_id: number;
  text: string;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}
```

---

## Development Commands

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on localhost:5173
```

### Database
```bash
cd backend
python -c "from database import init_db; init_db()"
```

---

## Environment Variables

### Backend (.env in backend/)
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SECRET_KEY=random_secret_key_for_sessions
FRONTEND_URL=http://localhost:5173
```

---

## Recent Major Changes

### January 2026
1. **Interval Training Mode** (Commits: c5f9972, c0aef8b, e82ae02)
   - Complete interval timer with countdown
   - Configurable work/rest/rounds
   - 5-second "Get Ready" countdown
   - Styled completion screen
   - Activity logging integration

2. **Todo List Feature** (Commit: d829842)
   - Drag-and-drop reordering
   - Dual clear functionality (in-progress + completed)
   - Inline editing
   - Today-filtered completion view

3. **Workout Templates** (Earlier)
   - Pre-build workouts
   - Save and reuse exercise combinations
   - Quick-start from template

4. **Exercise Progress Tracking** (Earlier)
   - SVG-based graphs
   - Historical metrics
   - Multiple metric types (max weight, reps, duration)

---

## Design Patterns

### Color Coding
- **Green:** Success, completion, work phase
- **Blue:** Information, neutral, rest phase
- **Yellow:** Warning, countdown, get ready
- **Red:** Delete, finish, stop actions
- **Purple:** Quality ratings, intervals
- **Orange:** Skip actions

### Dark Mode
- All components support dark mode via Tailwind's `dark:` classes
- Automatic detection via system preference
- Consistent color scheme across light/dark modes

### Responsive Design
- Mobile-first approach
- Flexible layouts with Tailwind utilities
- Touch-friendly button sizes
- Collapsible sections on smaller screens

### Error Handling
- Try-catch blocks in all API calls
- User-friendly error messages
- Console logging for debugging
- Graceful degradation

### Data Flow
1. User action → Event handler
2. Event handler → API call (via custom hook)
3. API call → Backend endpoint
4. Backend → Database operation
5. Response → Update local state
6. Re-render component with new data

---

## Known Limitations

1. **Single User Sessions:** One active workout session per user at a time
2. **No Offline Support:** Requires internet connection
3. **SQLite Limitations:** Not suitable for high-concurrency scenarios
4. **No Real-time Sync:** No WebSocket support for live updates
5. **Local Storage for Skip:** Skip functionality uses localStorage (not synced across devices)

---

## Future Enhancement Ideas (Lower Priority)

**Note:** High-priority features moved to "Planned Features / Roadmap" section above

- [ ] Multi-device sync for skipped activities
- [ ] Workout session sharing/social features
- [ ] Custom exercise video/GIF attachments
- [ ] Voice commands during interval training
- [ ] Apple Health / Google Fit integration
- [ ] Achievement badges and milestones
- [ ] Group challenges
- [ ] Nutrition tracking
- [ ] Personal bests / PR detection and celebration
- [ ] AI-powered workout recommendations
- [ ] Mood tracking correlation
- [ ] Body metrics timeline (weight, measurements)
- [ ] Habit stacking and activity dependencies
- [ ] Points shop/rewards system

---

## Git Repository

**Remote:** github.com:ian-james/activity-tracker.git
**Branch:** main
**Latest Commits:**
- 284e45a: Add comprehensive Context.MD for project documentation
- e82ae02: Add activity logging form to interval workout completion screen
- c0aef8b: Replace alert popup with styled completion screen
- c5f9972: Add interval training mode with countdown
- d829842: Add todo list with drag-and-drop reordering

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized on API calls**
   - Ensure cookies are being sent (credentials: 'include')
   - Check CORS settings in backend
   - Verify session cookie exists

2. **Database locked errors**
   - SQLite doesn't handle high concurrency
   - Use connection context managers
   - Keep transactions short

3. **TypeScript errors**
   - Run `npx tsc --noEmit` to check types
   - Most are unused variable warnings (not critical)

4. **Dark mode issues**
   - Ensure `dark:` prefixes are used consistently
   - Check Tailwind config for dark mode settings

---

## Planned Features / Roadmap

### Priority 1: Near-Term Implementation

#### 3. Pomodoro Timer with Activity Integration
**Status:** Not started
**Priority:** High

**Planned Capabilities:**
- Pomodoro timer (25min work / 5min break cycles)
- Link pomodoro sessions to activities for automatic logging
- Track "deep work" time per category
- Break reminders that suggest stretches/exercises from workout library
- Statistics: total focus time per day/week

**Implementation Plan:**
1. Create `PomodoroTimer.tsx` component with start/pause/reset
2. Add state management for current session and break status
3. Create pomodoro settings in user preferences (custom durations)
4. Add activity selector to link session to activity
5. Auto-log to activities when pomodoro completes
6. Add "Suggested break activity" from workout exercises
7. Create Pomodoro tab or integrate into existing tabs

**Database Changes:**
- Consider adding `pomodoro_sessions` table:
  - `id`, `user_id`, `activity_id`, `started_at`, `completed_at`, `duration_minutes`, `was_interrupted`
- Or extend `logs` table with `session_type` field ("activity", "pomodoro")

**Related Components:**
- Reuse timer logic from `useWorkoutTimer` hook
- Similar countdown UI to `IntervalTimer` component
- Integration point in `DailyTracker` for auto-logging

---

#### 5. Recovery & Rest Day Tracking
**Status:** Not started
**Priority:** High

**Planned Capabilities:**
- Mark specific days as "rest days" or "recovery days"
- Adjust scoring calculation for rest days (don't penalize)
- Track sleep quality with simple rating (1-5 scale)
- Correlate rest/sleep with next-day performance
- Rest day recommendations based on workout intensity
- Recovery metrics: consecutive workout days, suggested rest frequency

**Implementation Plan:**
1. Add `rest_day_markers` table or extend daily tracking
2. Create "Mark as Rest Day" toggle in tracker view
3. Update score calculation logic to handle rest days
4. Add sleep quality input (optional daily entry)
5. Create recovery dashboard showing:
   - Days since last rest
   - Sleep quality trends
   - Energy level correlation with rest
6. Smart suggestions: "You've worked out 5 days straight, consider rest"

**Database Changes:**
- Add `rest_days` table:
  - `id`, `user_id`, `date`, `rest_type` ("full_rest", "active_recovery"), `notes`
- Add `sleep_logs` table:
  - `id`, `user_id`, `date`, `quality_rating` (1-5), `hours_slept`, `notes`

**Related Features:**
- Integrate with scoring system (`scores.py`)
- Show rest day indicators on calendar heat map
- Factor into streak calculations (rest days maintain streaks)

---

#### 7. Predictive Streak Maintenance
**Status:** Not started
**Priority:** High

**Planned Capabilities:**
- Real-time forecast: "You need 2 more activities to maintain 80% today"
- Daily progress bar toward streak requirement
- Risk alerts: "You're at 65% this week, streak at risk"
- Smart reminders at optimal times based on completion patterns
- "Easiest path to streak": suggest lowest-effort activities
- Weekly streak projection

**Implementation Plan:**
1. Create `StreakPredictor` utility class for calculations
2. Add real-time progress indicators in `DailyTracker`
3. Create alert/notification system (UI banners)
4. Add "Streak Assistant" panel showing:
   - Current progress toward today's goal
   - Remaining points needed
   - Suggested activities (sorted by historical completion likelihood)
5. Implement time-based suggestions (learn user patterns)
6. Add streak projection chart in Dashboard

**Backend Changes:**
- New API endpoint: `GET /api/analytics/streak-forecast?date={date}`
  - Returns: current progress, points needed, risk level, suggestions
- Enhance streak calculation in `analytics.py`
- Add pattern detection: analyze historical completion times

**Related Components:**
- Extend `Streaks.tsx` with forecast display
- Add real-time indicator to `DailyTracker.tsx`
- Create `StreakForecast.tsx` component for detailed view

---

#### 13. Workout Music Playlists
**Status:** Not started
**Priority:** High

**Planned Capabilities:**
- Link Spotify/YouTube playlists to workout templates
- Auto-play music during interval training
- Sync song tempo to work/rest intervals
- "Workout Radio" mode with curated playlists
- Save favorite workout songs
- Integration with Spotify Web Playback SDK

**Implementation Plan:**
1. Add Spotify authentication flow (OAuth)
2. Create playlist selector in `WorkoutTemplates.tsx`
3. Add music controls to `IntervalTimer.tsx`:
   - Play/pause/skip
   - Volume control
   - Auto-play on workout start
4. Store playlist preferences per template
5. Optional: BPM matching (match song tempo to interval duration)
6. Create fallback for users without Spotify (YouTube links)

**Database Changes:**
- Add to `workout_templates` table:
  - `spotify_playlist_id` TEXT
  - `music_autoplay` INTEGER (0/1)
- Add `workout_songs` table (optional):
  - `id`, `user_id`, `name`, `artist`, `spotify_uri`, `youtube_url`, `bpm`, `favorite`

**External Dependencies:**
- Spotify Web API
- Spotify Web Playback SDK (for in-browser playback)
- YouTube iframe API (fallback option)

**Related Components:**
- Add music player UI to `IntervalTimer.tsx`
- Playlist manager in Settings or Workout tab
- Music controls overlay during active workout

---

### Priority 2: Future Implementation

#### 24. Weekly Planning Mode
**Status:** Not started
**Priority:** Medium (planned for future)

**Planned Capabilities:**
- Visual calendar view for week planning
- Drag-and-drop activities to specific days/times
- Copy previous week's successful schedule
- Template-based week planning (e.g., "Workout Week", "Recovery Week")
- Compare planned vs actual completion
- Schedule optimization suggestions based on patterns
- Time blocking for activities with estimated durations

**Implementation Plan:**
1. Create `WeeklyPlanner.tsx` component with calendar grid
2. Implement drag-and-drop for activity scheduling
3. Add "planned activities" concept (separate from scheduled days_of_week)
4. Create weekly templates system
5. Build comparison view: planned vs actual
6. Add success rate tracking per weekly template
7. Smart suggestions: best days/times for each activity

**Database Changes:**
- Add `planned_activities` table:
  - `id`, `user_id`, `activity_id`, `planned_date`, `planned_time`, `duration_estimate`, `completed`
- Add `weekly_templates` table:
  - `id`, `user_id`, `name`, `template_data` (JSON), `success_rate`

**UI Components:**
- Full-week calendar view (similar to Google Calendar)
- Activity library sidebar for dragging
- Template picker/manager
- Analytics: planned vs actual compliance rate

**Related Features:**
- Integrate with existing activity scheduling
- Connect to pomodoro timer for time estimates
- Link to streak forecasting for weekly goals

---

## Contact & Support

For questions or issues:
1. Check this Context.MD file
2. Review git commit history
3. Search for similar patterns in codebase
4. Consult component-specific comments

---

*This document is maintained as the single source of truth for project context.*
*Last updated: January 21, 2026*
