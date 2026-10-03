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
- `exerciseGroupId` (nullable — links this slot to an `ExerciseGroup`; `exerciseName` acts as the default/current member)
- Contains an ordered list of `TemplateSet`
- Order is user-defined and should be persisted

### TemplateSet
A single default set within a template exercise, individually configurable (e.g. for progressive overload across sets).
- `id`, `reps`, `weight`

### WorkoutSession
A logged instance of actually doing a workout.
- `id`, `name` (defaults to template name or date), `startedAt`, `completedAt`
- Optionally references a `WorkoutTemplate` (can also be ad hoc)
- `locationId` (nullable — the gym this session was logged at; see `Location`)
- Contains an ordered list of `LoggedExercise`

### LoggedExercise
An exercise within a session.
- `id`, `exerciseName`, `restSeconds` (nullable — defaults from the template exercise, adjustable during the session)
- `exerciseGroupId` (nullable — inherited from the template exercise at session start; enables in-session swapping between group members)
- Contains an ordered list of `Set`

### Set
A single set within an exercise.
- `id`, `weight` (kg or lb), `reps`, `completed` (bool)

### Location
A gym or place the user works out, used to keep weight numbers separate across locations whose machines/equipment measure differently.
- `id`, `name`, `createdAt`

### ExerciseGroup
A named, reusable set of interchangeable exercises (e.g. "Chest Press" → Barbell Bench Press, Dumbbell Bench Press, Machine Chest Press) that a user can swap between smoothly.
- `id`, `name`, `createdAt`
- Contains an ordered list of `ExerciseGroupMember`

### ExerciseGroupMember
One exercise belonging to an `ExerciseGroup`.
- `id`, `exerciseName`, order

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

### 4. Locations & Exercise Substitution

Two independent, lightweight flexibility features: tracking weight per gym, and swapping between interchangeable exercises.

**Locations**
- Manage a simple user-created list of locations (add / rename / delete) from Settings → Manage Locations
- A `WorkoutSession` optionally references one `Location` (one per session, never required) — set or changed from a "📍 Set location" row on the session screen while it's in progress
- History shows the location name on each session row when set
- Deleting a location clears the tag from any sessions that referenced it; their logged data is untouched
- Locations are not tied to templates or exercises — the same template works at any gym, only the logged numbers are kept apart per location

**Exercise Substitution Groups**
- Manage reusable, named `ExerciseGroup`s (add / rename / delete, add / remove member exercises) from Settings → Manage Exercise Groups
- A `TemplateExercise` slot can optionally link to a group; its `exerciseName` acts as that slot's default member
- Starting a session from a template copies the group link onto the resulting `LoggedExercise`
- During an active session, an exercise linked to a group shows a "⇄ Swap" action to switch to any other member — the swapped-to exercise starts with a single blank default set (reps/weight from the old exercise aren't meaningful for a different one)
- Deleting a group unlinks any templates/sessions referencing it; they keep their current exercise name as plain text
- Out of scope for now: remembering a preferred substitute per location, and carrying template-level group links back from an in-session swap (see `backlog.md`)

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

Feature-level test status — **Automated E2E** is Maestro coverage under `.maestro/` (run via the `/e2e-test` skill); **Manual E2E** is testing on-device (Expo Go or a real build) by hand:

| Feature | Automated E2E | Manual E2E |
|---|---|---|
| Template Management (CRUD, per-set data model) | ✅ `create-template.yaml`, `template-management-crud.yaml` | ✅ passed 2026-07-30 (predates per-set model; not re-run since) |
| Active Workout Session (start from template/blank, edit, complete, discard) | ✅ `active-workout-session.yaml`, `workout-history.yaml` | ❌ not yet |
| Rest timer (+/-15s, skip, auto-dismiss) | ✅ covered within `active-workout-session.yaml` | ❌ not yet |
| Workout History (list, read-only detail, delete, start blank) | ✅ `workout-history.yaml` | ❌ not yet |
| Light/dark theme | ❌ no coverage (visual, not practical for Maestro assertions) | ❌ not yet |
| Locations (add/rename/delete, set on session) | ✅ `locations.yaml` | ❌ not yet |
| Exercise Substitution Groups (create/edit groups, link/change/unlink, swap mid-session) | ✅ `exercise-substitution-groups.yaml` | ❌ not yet |
| Schema v4 upgrade path (`ALTER TABLE` against pre-existing data) | ❌ Maestro always starts from `clearState: true`, so this path is untested by it | ❌ not yet |

Manual pass still needed for the ❌ Manual E2E items above (same Expo Go setup as before — SDK 54, scan a fresh QR from `npm start`):
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
  - [ ] Toggle Settings → Light/Dark/System, confirm the whole app (screens, tab bar, header) follows
  - [ ] Settings → Manage Locations: add a location, rename it, delete it, confirm the list updates each time
  - [ ] Settings → Manage Exercise Groups: create a group, add 2-3 member exercises, rename the group, remove a member, delete the group
  - [ ] On a template exercise, tap "+ Link substitution group", pick a group, confirm the exercise name updates to the group's first member and "Substitutes: <group>" shows
  - [ ] Tap "Change" on a linked template exercise, pick a different member, confirm the name updates; tap "Unlink", confirm it reverts to a plain exercise with no group row
  - [ ] Start a session from a template with a linked exercise, confirm the "⇄ Swap" button appears on that exercise
  - [ ] Tap Swap, pick a different member, confirm the exercise name changes and its sets reset to a single blank default set (existing logged reps/weight are gone)
  - [ ] On the session screen, tap "Set location", pick a location, confirm it displays; change it to a different location, then to "No location", confirm each persists after leaving and re-opening the session
  - [ ] Complete a session with a location set, confirm History shows the location name in that row
  - [ ] Delete a location from Settings that's referenced by a past session, confirm the session's history entry still opens fine (location tag just disappears)
  - [ ] Confirm an app upgrade from an existing on-device DB (pre-v4 data, e.g. existing templates/sessions) still opens without errors and old data is intact (tests the `ALTER TABLE` migration path, not just a fresh install)

---

See `backlog.md` for future feature ideas and open bugs.
