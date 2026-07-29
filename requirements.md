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
- `id`, `exerciseName`, `restSeconds` (nullable — rest timer duration between this exercise's sets)
- Contains an ordered list of `TemplateSet`
- Order is user-defined and should be persisted

### TemplateSet
A single default set within a template exercise, individually configurable (e.g. for progressive overload across sets).
- `id`, `reps`, `weight`

### WorkoutSession
A logged instance of actually doing a workout.
- `id`, `name` (defaults to template name or date), `startedAt`, `completedAt`
- Optionally references a `WorkoutTemplate` (can also be ad hoc)
- Contains an ordered list of `LoggedExercise`

### LoggedExercise
An exercise within a session.
- `id`, `exerciseName`, `restSeconds` (nullable — defaults from the template exercise, adjustable during the session)
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
- Set an optional rest duration (seconds) per exercise
- Add individual sets to an exercise, each with its own reps and weight (new exercises start with one default set)

**Read**
- List all templates (name, exercise count)
- View a template detail (all exercises, each with its rest duration and its list of sets)

**Update**
- Rename a template
- Add / remove exercises
- Edit an exercise's name and rest duration
- Add / edit / remove individual sets within an exercise (independent reps/weight per set)
- Exercise order is fixed to insertion order in v1 (see Out of Scope / Future Features — drag-to-reorder)

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
- Add an exercise to the session (by name, appended to bottom, with optional rest duration)
- Remove an exercise from the session
- Exercise order is fixed to insertion order in v1, same as templates (see Out of Scope / Future Features — drag-to-reorder)

**Rest timer**
- Marking a set completed starts a countdown using that exercise's `restSeconds` (skipped if not set)
- Adjustable in-session via +/- controls; can be skipped/dismissed early
- Duration is seeded from the template's per-exercise default but is just a per-session value — editing it during a session does not change the template

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
- Barcode scanning for equipment
- Export to CSV
- Drag-to-reorder exercises
- Weight unit toggle (kg hardcoded in v1)

---

## Completed & Tested

- **Project scaffold boots**: `npm start` (Expo/Metro) starts cleanly with no errors — verified 2026-07-29.
- **Downgraded to Expo SDK 54**: originally scaffolded on SDK 57, but the installed Expo Go app didn't support it. Downgraded all `expo`/`expo-*`/`react`/`react-native` packages to their SDK 54-compatible versions via `npx expo install --fix`; also removed a stale `expo-status-bar` entry from `app.json`'s `plugins` (that package has no config plugin on SDK 54 and its presence broke `expo export`). Verified 2026-07-30.
- **DB layer scaffolding**: SQLite schema (`db/schema.ts`) for templates, template_exercises, sessions, logged_exercises, sets; migration runner (`db/client.ts`); full CRUD for `WorkoutTemplate` / `TemplateExercise` (`db/templates.ts`) — create, rename, delete, list-with-exercise-count, get-with-exercises, add/update/remove exercise, reorder. Typechecks and bundles cleanly (`npx expo export`) — verified 2026-07-29.
- **Template Management screens**: list screen (`app/(tabs)/index.tsx`) with create-via-modal; detail screen (`app/template/[id].tsx`) with rename, delete, add/edit/remove exercise, all backed by `hooks/useTemplates.ts` / `hooks/useTemplate.ts`. Drag-to-reorder intentionally omitted (see Out of Scope). **Manually tested on-device via Expo Go (SDK 54) — all cases passed 2026-07-30.**
- **Per-set template data model**: `TemplateExercise` no longer stores one uniform (sets count, reps, weight) — each exercise now has an ordered list of `TemplateSet`, individually editable (reps/weight per set), enabling progressive-overload-style templates. Schema migration (`db/schema.ts` v2) drops and recreates `template_exercises`/adds `template_sets` (no shipped users yet, so no data-preserving migration was needed). Typechecks and bundles cleanly — verified 2026-07-30. **Not yet manually re-tested on-device** since this change.
- **Active Workout Session**: start from a template (copies exercises/sets as a snapshot) or start blank, from the History tab; `app/session/[id].tsx` supports inline edit of weight/reps per set, mark-complete checkbox, add/remove sets and exercises, complete (saves to history) or discard. Backed by `db/sessions.ts` and `hooks/useSession.ts`. Exercise reordering intentionally omitted, same as templates. Typechecks and bundles cleanly — verified 2026-07-30. **Not yet manually tested on-device.**
- **Rest timer**: adjustable countdown (`components/RestTimerOverlay.tsx`, `hooks/useRestTimer.ts`) triggered when a set is marked complete, using that exercise's `restSeconds`; +/-15s adjust, skip/dismiss, auto-dismisses at 0. Typechecks and bundles cleanly — verified 2026-07-30. **Not yet manually tested on-device.**

Manual pass needed for the three items above before calling them "tested" (same Expo Go setup as before — SDK 54, scan a fresh QR from `npm start`):
  - [ ] Open an existing template, add a second/third set to an exercise with different reps/weight per set, confirm each persists independently
  - [ ] Set a rest duration on a template exercise (e.g. 30s), start a workout from that template
  - [ ] Mark a set complete, confirm the rest timer overlay appears and counts down
  - [ ] Use +15s/-15s during the countdown, confirm it adjusts; tap Skip, confirm it dismisses immediately
  - [ ] Add an extra set mid-session, confirm it copies the previous set's reps/weight as a starting point
  - [ ] Add an ad hoc exercise mid-session, remove a set, remove an exercise
  - [ ] Complete the workout, confirm it appears in History with the right exercise/set-completed counts
  - [ ] Tap into that history entry, confirm it renders read-only (no edit controls)
  - [ ] Start a blank workout from History, confirm it starts empty and can still be built up and completed
  - [ ] Delete a session from History, confirm it disappears

---

## Future Features

- **Exercise library**: enforce exercise names against a curated list with muscle group metadata; migrate free-text names to library entries
- **Weight unit setting**: global kg/lb preference with per-set stored unit so history remains accurate after switching
- **Drag-to-reorder**: reorder exercises within a template or active session
- **Progress charts**: visualise weight/volume progression per exercise over time
- **Cloud sync**: user accounts, cross-device sync
- **Export**: CSV or JSON export of workout history
