# Workout Tracker — Requirements

## Product Vision

A mobile app (React Native / Expo) for logging gym workouts. The core loop: pick or create a workout template, run through it in the gym recording sets, and review history over time.

---

## Core Entities

### WorkoutTemplate
A reusable plan the user builds in advance.
- `id`, `name`, `createdAt`, `updatedAt`
- Contains an ordered list of `TemplateExercise`

### TemplateExercise
A slot in a template.
- `id`, `exerciseName`, `defaultSets` (count), `defaultReps`, `defaultWeight`, `defaultRestSeconds` (nullable — field reserved now, rest timer feature itself still out of scope, see below)
- Order is user-defined and should be persisted

### WorkoutSession
A logged instance of actually doing a workout.
- `id`, `name` (defaults to template name or date), `startedAt`, `completedAt`
- Optionally references a `WorkoutTemplate` (can also be ad hoc)
- Contains an ordered list of `LoggedExercise`

### LoggedExercise
An exercise within a session.
- `id`, `exerciseName`, `restSeconds` (nullable — field reserved now, see rest timer note above)
- Contains an ordered list of `Set`

### Set
A single set within an exercise.
- `id`, `weight` (kg or lb), `reps`, `completed` (bool)

---

## Feature Areas

### 1. Template Management (CRUD)

**Create**
- Create a new template with a name
- Add exercises by name (free text to start; exercise library is a future feature)
- Set default sets count, reps, and weight per exercise

**Read**
- List all templates (name, exercise count)
- View a template detail (all exercises with defaults)

**Update**
- Rename a template
- Add / remove exercises
- Change exercise order (drag-to-reorder)
- Edit default sets, reps, weight per exercise

**Delete**
- Delete a template (does not delete past sessions that used it)

---

### 2. Active Workout Session

**Starting a session**
- Start from a template: pre-populates exercises and sets with defaults
- Start blank: empty session, build it on the fly

**During a session**
- Each exercise shows its sets as rows (set #, weight, reps, done checkbox)
- Mark a set as completed inline
- Edit weight and reps inline per set
- Add a set to an exercise (copies last set's values as default)
- Remove a set from an exercise
- Add an exercise to the session (by name, appended to bottom)
- Remove an exercise from the session
- Reorder exercises

**Finishing**
- Complete workout: saves session with `completedAt` timestamp
- Discard: cancel without saving

---

### 3. Workout History

**Read**
- List past sessions sorted by date (most recent first)
- Each row shows: date, name, exercise count, total sets completed
- Tap into a session to view full detail (all exercises, all sets with weight/reps)

**Delete**
- Delete a session from history

---

## Non-Functional Requirements

- **Offline-first**: all data stored locally (expo-sqlite)
- **Unit**: support kg and lb; user sets preference once in settings
- **Platform**: iOS and Android via Expo managed workflow
- **Language**: TypeScript throughout

---

## Out of Scope (v1)

- User accounts / cloud sync
- Social / sharing features
- Exercise library with muscle group metadata (exercise names are free text in v1)
- Progress charts / analytics
- Rest timers
- Barcode scanning for equipment
- Export to CSV
- Drag-to-reorder exercises
- Weight unit toggle (kg hardcoded in v1)

---

## Completed & Tested

- **Project scaffold boots**: `npm start` (Expo/Metro) starts cleanly with no errors — verified 2026-07-29.
- **DB layer scaffolding**: SQLite schema (`db/schema.ts`) for templates, template_exercises, sessions, logged_exercises, sets; migration runner (`db/client.ts`); full CRUD for `WorkoutTemplate` / `TemplateExercise` (`db/templates.ts`) — create, rename, delete, list-with-exercise-count, get-with-exercises, add/update/remove exercise, reorder. Typechecks and bundles cleanly (`npx expo export`) — verified 2026-07-29.

---

## Future Features

- **Exercise library**: enforce exercise names against a curated list with muscle group metadata; migrate free-text names to library entries
- **Weight unit setting**: global kg/lb preference with per-set stored unit so history remains accurate after switching
- **Drag-to-reorder**: reorder exercises within a template or active session
- **Progress charts**: visualise weight/volume progression per exercise over time
- **Rest timer**: countdown between sets with configurable duration
- **Cloud sync**: user accounts, cross-device sync
- **Export**: CSV or JSON export of workout history
