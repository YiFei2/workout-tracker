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
A slot in a template — just the exercise and its shape, not its numbers.
- `id`, `exerciseName`, `restSeconds` (nullable — rest timer duration between this exercise's sets)
- `exerciseGroupId` (nullable — links this slot to an `ExerciseGroup`; `exerciseName` acts as the default/current member)
- Order is user-defined and should be persisted
- Deliberately carries no reps/weight/set-count: those are always derived at session-start time from the chosen `Location`'s workout history (see Feature Area 4). A template this light means nothing goes stale when a user's numbers change.

### WorkoutSession
A logged instance of actually doing a workout.
- `id`, `name` (defaults to template name or date), `startedAt`, `completedAt`
- Optionally references a `WorkoutTemplate` (can also be ad hoc)
- `locationId` — the gym this session was logged at; see `Location`. Required by the app whenever a new session is started (picked via a mandatory location picker before the session is even created), since it drives per-location weight/reps suggestions. Can still end up `null` on an existing session if the referenced `Location` is later deleted (history is kept, just the tag is cleared) — so the field itself stays nullable even though creation always supplies a real one.
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
A gym or place the user works out. This is the primary mechanism for keeping weight numbers separate across locations whose machines/equipment measure differently — see Feature Area 4 for how a session's location drives weight/reps suggestions.
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
- Add exercises by name (free text to start; exercise library is a future feature — see `backlog.md`)
- Set an optional rest duration (seconds) per exercise
- No reps/weight/set-count is configured on a template — see TemplateExercise above and Feature Area 4

**Read**
- List all templates (name, exercise count)
- View a template detail (all exercises, each with its rest duration)

**Update**
- Rename a template
- Add / remove exercises
- Edit an exercise's name and rest duration
- Exercise order is fixed to insertion order in v1 (see Out of Scope / Future Features — drag-to-reorder)

**Delete**
- Delete a template (does not delete past sessions that used it)

---

### 2. Active Workout Session

**Starting a session**
- Every session start (blank or from a template) first requires picking a `Location` — a mandatory picker pops up before the session is even created; it includes an inline "+ Add new location" option, so a user with zero locations can create one on the spot rather than hitting a dead end. See Feature Area 4.
- Start from a template: pre-populates exercises (shape/order/rest only — see TemplateExercise); each exercise's sets (count, weight, reps) are then populated from the chosen location's history, per Feature Area 4
- Start blank: empty session, build it on the fly — newly added exercises are populated the same history-driven way

**During a session**
- Each exercise shows its sets as rows (set #, weight, reps, done checkbox)
- Mark a set as completed inline
- Edit weight and reps inline per set
- Add a set to an exercise beyond what history populated it with (copies the current session's last set's values as default — there's no history for a set number that's never been logged)
- Remove a set from an exercise
- Add an exercise to the session (by name, appended to bottom, with optional rest duration) — auto-populated with however many sets it had last time, each pre-filled with that historical weight/reps, per Feature Area 4; starts with a single blank set (0/0) if there's no history anywhere for that exercise
- Remove an exercise from the session
- Exercise order is fixed to insertion order in v1, same as templates (see Out of Scope / Future Features — drag-to-reorder)
- Change the session's location mid-session (see Feature Area 4) — already-completed sets are untouched; not-yet-completed sets refresh to the new location's suggestion

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

Two independent flexibility features: location-scoped weight/reps memory (the main point of the locations feature), and swapping between interchangeable exercises.

**Locations — management**
- Manage a simple user-created list of locations (add / rename / delete) from Settings → Manage Locations
- Also creatable inline, wherever a location picker appears (e.g. mid-start-flow), via a "+ Add new location" option — so a user never hits a dead end for lacking one
- Deleting a location clears the tag from any sessions that referenced it; their logged data (including weight/reps) is untouched, and it also drops out of the weight-memory lookup below

**Locations — required per session, drives weight/reps memory**
- A `WorkoutSession` always has a `Location` picked *before* the session is created — see Feature Area 2 "Starting a session". It's never optional going forward (a session with no location defeats the point: weight memory couldn't apply to it)
- It can still be changed afterward from a "📍" row on the session screen (same picker), and it can end up `null` later only via location deletion, never via user choice
- History shows the location name on each session row when set

**Locations — weight/reps memory algorithm**
- When an exercise is added to a session (fresh add, template-start, or swap), the app looks up that exercise's most recent **completed** set of a **completed** session, matching by exercise name (case-insensitive, trimmed — see `backlog.md` "Exercise library" for the planned move to ID-based matching), at the session's current location:
  1. If found, the new exercise is created with the *same number of sets* as that historical session had, each pre-filled with that set's weight **and** reps together (never mixed from different historical sets) — e.g. a 3-set pyramid (60/55/50kg) is reproduced as 3 sets, not collapsed to one number
  2. If no history at that location, fall back to the most recent completed exercise/session at *any* location
  3. If there's no history anywhere for that exercise, start with a single blank set (0 weight, 0 reps) for the user to fill in
- Only `completed` sets within `completed` sessions count as history — an unchecked set or an abandoned/discarded session is not reliable signal and is never suggested forward
- Changing a session's location mid-session re-runs this lookup for every exercise already in the session, but only overwrites sets that are still `completed: false` — a set the user already checked off is a logged fact and is left alone
- Locations are not tied to templates — the same template works at any gym; only the weight/reps that get loaded in differ per location

**Exercise Substitution Groups**
- Manage reusable, named `ExerciseGroup`s (add / rename / delete, add / remove member exercises) from Settings → Manage Exercise Groups
- A `TemplateExercise` slot can optionally link to a group; its `exerciseName` acts as that slot's default member
- Starting a session from a template copies the group link onto the resulting `LoggedExercise`
- During an active session, an exercise linked to a group shows a "⇄ Swap" action to switch to any other member — the swapped-to exercise runs through the same location-scoped weight/reps lookup as a freshly added exercise (reps/weight from the old exercise aren't meaningful for a different one)
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
| Template Management (CRUD, no-sets data model) | ⚠️ `create-template.yaml`, `template-management-crud.yaml` predate the v5 "templates carry no sets" change — need a re-run/rewrite | ❌ not yet |
| Active Workout Session (start from template/blank, edit, complete, discard) | ⚠️ `active-workout-session.yaml` predates mandatory location-pick-before-start and history-driven set population — needs a rewrite; `workout-history.yaml` still broadly applicable | ❌ not yet |
| Rest timer (+/-15s, skip, auto-dismiss) | ✅ covered within `active-workout-session.yaml` | ❌ not yet |
| Workout History (list, read-only detail, delete, start blank) | ⚠️ `workout-history.yaml` predates mandatory location-pick-before-start on "start blank" — needs a rewrite | ❌ not yet |
| Light/dark theme | ❌ no coverage (visual, not practical for Maestro assertions) | ❌ not yet |
| Locations (add/rename/delete, mandatory per-session, weight/reps memory) | ⚠️ `locations.yaml` predates mandatory-location + weight-memory lookup — needs a rewrite to cover the new algorithm | ❌ not yet |
| Exercise Substitution Groups (create/edit groups, link/change/unlink, swap mid-session) | ⚠️ `exercise-substitution-groups.yaml` predates swap now running the location-weight lookup instead of a hardcoded blank set — needs a re-check | ❌ not yet |
| Schema v5 upgrade path (drop `template_sets`, sessions require a location going forward) | ❌ Maestro always starts from `clearState: true`, so this path is untested by it | ❌ not yet |

Manual pass still needed for the ❌ Manual E2E items above (same Expo Go setup as before — SDK 54, scan a fresh QR from `npm start`):
  - [ ] Open an existing template, confirm there is no set/reps/weight UI at all — only exercise name + rest duration
  - [ ] Set a rest duration on a template exercise (e.g. 30s)
  - [ ] Tap "Start Workout" on a template with zero locations created yet: confirm the location picker's only option is "+ Add new location", creating one proceeds straight into the session (no dead end)
  - [ ] Tap "Start Workout" on a template with an exercise that has completed history at the picked location: confirm the resulting session pre-populates the same number of sets as last time, each with that historical weight/reps
  - [ ] Mark a set complete, confirm the rest timer overlay appears and counts down
  - [ ] Use +15s/-15s during the countdown, confirm it adjusts; tap Skip, confirm it dismisses immediately
  - [ ] Add an extra set beyond what history populated, confirm it copies the current session's previous set's reps/weight as a starting point
  - [ ] Add an ad hoc exercise mid-session with no prior history anywhere, confirm it starts with a single blank (0/0) set; remove a set, remove an exercise
  - [ ] Complete the workout, confirm it appears in History with the right exercise/set-completed counts
  - [ ] Tap into that history entry, confirm it renders read-only (no edit controls)
  - [ ] Start a blank workout from History: confirm the location picker appears first, then the session starts empty after picking, and can still be built up and completed
  - [ ] Delete a session from History, confirm it disappears
  - [ ] Toggle Settings → Light/Dark/System, confirm the whole app (screens, tab bar, header) follows
  - [ ] Settings → Manage Locations: add a location, rename it, delete it, confirm the list updates each time
  - [ ] Settings → Manage Exercise Groups: create a group, add 2-3 member exercises, rename the group, remove a member, delete the group
  - [ ] On a template exercise, tap "+ Link substitution group", pick a group, confirm the exercise name updates to the group's first member and "Substitutes: <group>" shows
  - [ ] Tap "Change" on a linked template exercise, pick a different member, confirm the name updates; tap "Unlink", confirm it reverts to a plain exercise with no group row
  - [ ] Start a session from a template with a linked exercise, confirm the "⇄ Swap" button appears on that exercise
  - [ ] Tap Swap, pick a different member, confirm the exercise name changes and its sets reflect that new exercise's own history at the session's location (or a single blank set if it has none)
  - [ ] On the session screen, tap "📍" to change location to one with different history for an in-progress, not-yet-completed exercise: confirm its unchecked sets refresh to the new location's weight/reps, while any already-checked-off sets are untouched
  - [ ] Complete a session with a location set, confirm History shows the location name in that row
  - [ ] Delete a location from Settings that's referenced by a past session, confirm the session's history entry still opens fine (location tag just disappears)
  - [ ] Confirm an app upgrade from an existing on-device DB (pre-v5 data, e.g. existing templates with sets) still opens without errors — `template_sets` is dropped, templates lose their old set configs, everything else is intact

---

See `backlog.md` for future feature ideas and open bugs.
