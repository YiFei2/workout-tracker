# App Requirements (multi-module)

> **Note:** this project started as a standalone "Workout Tracker" and is expanding into a multi-module life-utility app. Workout tracking is the first module; the Rewards module (Tasks + Store + points ledger) is the second. The overall app name is TBD. The repo/folder is still named `workout-tracker` for now.

## App Vision

A mobile app (React Native / Expo) that acts as a hub for managing personal life habits. It's organized as a set of **modules** sharing one app shell, one local database, and one cross-cutting **points economy**.

- **App shell**: on launch, the user lands on a **module selection screen** (a simple grid/list of modules). For now it lists two: *Workout Tracker* and *Rewards*. New modules are added here over time (e.g. meditation journal).
- **Unifying principle — earn & spend**: habit-building modules *earn* points (via Tasks); the Rewards store *spends* them. A module is a good fit for this app if it feeds or spends this economy. This is the filter that keeps the app from becoming a junk drawer.
- **Personal accountability**: the economy is for the user's own motivation, not a competitive/social system. There is deliberately **no anti-abuse / anti-cheat** — a user can manually grant themselves points at will. Honesty is the user's own responsibility.

### Module architecture (implementation note, not over-engineered)

With only two modules, we deliberately **avoid** building a generic plugin framework. Concretely:
- A module-selection landing screen is the app entry point.
- Each module lives under its own Expo Router route group (e.g. `app/(workout)/`, `app/(rewards)/`).
- Shared concerns (points balance/ledger, unit & theme preferences) live in the shared `db/` + settings layer; module-local data (templates, sessions, rewards catalog) is namespaced to that module.
- We let the *third* module teach us what genuinely needs a shared abstraction rather than guessing now.

---

## Shared: Points Economy

The cross-module currency. A **single app-wide balance** earned by any module and spent in the Rewards Store.

### Core Entity — PointsTransaction (ledger)

The balance is **not** stored as a single mutable number; it is derived. Every credit and debit is a row, so the full earning + redemption history is auditable from one table.

- `id`, `createdAt`
- `amount` — signed integer: **positive = credit** (points earned), **negative = debit** (points spent / clawed back)
- `type` — `'manual'` | `'task'` | `'redemption'`
- `note` (nullable) — free-text description for manual credits/debits (e.g. "bonus for a good week")
- `taskId` (nullable) — set on `type: 'task'`, references the completed `Task` (may become dangling if the task is later deleted — history survives via the snapshot below)
- `taskName` (nullable) — **snapshot** of the task's name at completion time
- `rewardId` (nullable) — set on `type: 'redemption'`, references the redeemed `Reward` (may become dangling if the reward is deleted — history survives via the snapshot below)
- `rewardName`, `rewardCost` (nullable) — **snapshot** of the reward's name and cost at redemption time

Snapshots follow the same convention as `TemplateExercise.exerciseName`: the `Task`/`Reward` tables stay the live, editable config; the ledger row is the immutable record of what a completion/redemption was actually worth, so renaming, re-pricing, or deleting a task/reward never rewrites past ledger entries.

**Balance** = `SUM(amount)` across all transactions.
- A **redemption** is rejected if it would overdraw the balance below zero (you can't spend points you don't have), and is blocked entirely while the balance is already negative.
- A **clawback** (undoing a task completion) or a **manual debit** *may* drive the balance negative — e.g. you earned points, spent them, then undid the earning. This keeps undo from mysteriously refusing to work while still guarding actual spending.

### Earning rules

Points are earned **only by completing Tasks** (see Module: Rewards → Tasks). There is no direct "finish a workout → get points" rule; a workout instead *auto-completes* a linked task, and that task completion is what credits the points.

- **Task completion**: completing a `Task` writes a `type: 'task'` credit equal to that task's configured point value, snapshotting `taskName` + `amount`.
- **Manual credit/debit**: the user can add points by hand (amount + optional note) — a `type: 'manual'` row. A negative manual amount is allowed as a correction/debit.

---

# Module: Workout Tracker

## Product Vision

A mobile app (React Native / Expo) for logging gym workouts. The core loop: pick or create a workout template, run through it in the gym recording sets, and review history over time. On completing a session, any workout-linked Tasks are auto-completed, crediting their points into the shared Points Economy (see Module: Rewards).

---

## Core Entities

### WorkoutTemplate
A reusable plan the user builds in advance.
- `id`, `name`, `createdAt`, `updatedAt`
- Contains an ordered list of `TemplateExercise`

### TemplateExercise
A slot in a template — just the exercise and its shape, not its numbers.
- `id`, `exerciseId` (references `Exercise` — the source of truth for which exercise this is), `exerciseName` (a snapshot of `Exercise.name` copied at pick-time, for display; doesn't change retroactively if the exercise is later renamed), `restSeconds` (nullable — rest timer duration between this exercise's sets)
- `exerciseGroupId` (nullable — links this slot to an `ExerciseGroup`; `exerciseId`/`exerciseName` act as the default/current member)
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
- `id`, `exerciseId` (references `Exercise`), `exerciseName` (snapshot of `Exercise.name` at pick/swap time, for display), `restSeconds` (nullable — defaults from the template exercise, adjustable during the session)
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
- `id`, `exerciseId` (references `Exercise`), `exerciseName` (resolved live from `Exercise.name` — group composition is current config, not a log, so this always reflects the exercise's current name, unlike the snapshotted `exerciseName` on `TemplateExercise`/`LoggedExercise`), order

### Exercise
An entry in the exercise library — the source of truth for "what exercise is this," referenced by ID from `TemplateExercise`, `LoggedExercise`, and `ExerciseGroupMember`.
- `id`, `name`, `createdAt`
- Seeded with ~30 common exercises on first install; users can also add their own — the library is just seeded, not closed. No separate "custom" concept.
- Renaming is supported (updates `name` in place; past logs keep their own snapshot per above, so history doesn't silently change). Deleting is not supported in v1 (see Out of Scope).

---

## Feature Areas

### 1. Template Management (CRUD)

**Create**
- Create a new template with a name
- Add exercises by picking from the exercise library (search-as-you-type picker; see Feature Area 5) — no more free text
- Set an optional rest duration (seconds) per exercise
- No reps/weight/set-count is configured on a template — see TemplateExercise above and Feature Area 4

**Read**
- List all templates (name, exercise count)
- View a template detail (all exercises, each with its rest duration)

**Update**
- Rename a template
- Add / remove exercises
- Edit which exercise a slot points to (re-opens the picker) and its rest duration
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
- Add an exercise to the session (picked from the exercise library, appended to bottom, with optional rest duration) — auto-populated with however many sets it had last time, each pre-filled with that historical weight/reps, per Feature Area 4; starts with a single blank set (0/0) if there's no history anywhere for that exercise
- Remove an exercise from the session
- Exercise order is fixed to insertion order in v1, same as templates (see Out of Scope / Future Features — drag-to-reorder)
- Change the session's location mid-session (see Feature Area 4) — already-completed sets are untouched; not-yet-completed sets refresh to the new location's suggestion

**Rest timer**
- Marking a set completed starts a countdown using that exercise's `restSeconds` (skipped if not set)
- Adjustable in-session via +/- controls; can be skipped/dismissed early
- Duration is seeded from the template's per-exercise default but is just a per-session value — editing it during a session does not change the template

**Finishing**
- Complete workout: saves session with `completedAt` timestamp, then auto-completes every currently-completable `'workout'`-linked `Task` (see Module: Rewards → Workout link) and surfaces which tasks fired and the points earned. Deleting this session later does **not** claw those completions back.
- Discard: cancel without saving (earns nothing)

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
- When an exercise is added to a session (fresh add, template-start, or swap), the app looks up that exercise's most recent **completed** set of a **completed** session, matching by `exerciseId` (exercise-library ID, not name — see Feature Area 5), at the session's current location:
  1. If found, the new exercise is created with the *same number of sets* as that historical session had, each pre-filled with that set's weight **and** reps together (never mixed from different historical sets) — e.g. a 3-set pyramid (60/55/50kg) is reproduced as 3 sets, not collapsed to one number
  2. If no history at that location, fall back to the most recent completed exercise/session at *any* location
  3. If there's no history anywhere for that exercise, start with a single blank set (0 weight, 0 reps) for the user to fill in
- Only `completed` sets within `completed` sessions count as history — an unchecked set or an abandoned/discarded session is not reliable signal and is never suggested forward
- Changing a session's location mid-session re-runs this lookup for every exercise already in the session, but only overwrites sets that are still `completed: false` — a set the user already checked off is a logged fact and is left alone
- Locations are not tied to templates — the same template works at any gym; only the weight/reps that get loaded in differ per location

**Exercise Substitution Groups**
- Manage reusable, named `ExerciseGroup`s (add / rename / delete, add / remove member exercises — members are picked from the exercise library, see Feature Area 5) from Settings → Manage Exercise Groups
- A `TemplateExercise` slot can optionally link to a group; its `exerciseId`/`exerciseName` act as that slot's default member
- Starting a session from a template copies the group link onto the resulting `LoggedExercise`
- During an active session, an exercise linked to a group shows a "⇄ Swap" action to switch to any other member — the swapped-to exercise runs through the same location-scoped weight/reps lookup as a freshly added exercise (reps/weight from the old exercise aren't meaningful for a different one)
- Deleting a group unlinks any templates/sessions referencing it; they keep their current exercise snapshot as plain display text
- Out of scope for now: remembering a preferred substitute per location, and carrying template-level group links back from an in-session swap (see `backlog.md`)

---

### 5. Exercise Library

A library of `Exercise` entries (see Core Entities above) backs every exercise reference in the app — templates, session logs, and substitution groups all point at an `Exercise` by ID rather than storing a free-text name as the source of truth.

- Seeded on first install with ~30 common exercises spanning chest/back/shoulders/arms/legs/core, plus four sample templates (Push Day, Pull Day, Leg Day, Full Body) built from them, so the app isn't empty on first open
- Picking an exercise (adding to a template, adding/swapping in a session, adding a substitution-group member) opens a searchable picker: type to filter the library by name; if nothing matches, an inline "+ Add '<query>' as new exercise" option creates a new library entry and selects it in one step — no separate "manage exercises" screen
- Adding a new exercise reuses an existing entry if the name matches case-insensitively (trimmed) rather than creating a near-duplicate
- A custom exercise can be renamed later (via re-editing); deleting an exercise from the library is not supported in v1 (see Out of Scope)
- `TemplateExercise`/`LoggedExercise` keep a denormalized `exerciseName` snapshot alongside `exerciseId`, copied at pick/swap time, so a later rename doesn't rewrite historical display — `ExerciseGroupMember`'s `exerciseName` is the one exception, resolved live, since group composition is current config, not a log

---

# Module: Rewards

## Product Vision

A personal earn-and-spend economy. The user defines **Tasks** (things they want to do) that credit points on completion, and **Rewards** (treats they want to give themselves) that cost points to redeem. Purely personal accountability — no app-provided catalog, no anti-cheat; honesty is the user's own responsibility. One module, three surfaces: **Tasks** (earn), **Store** (spend), **Points history** (the shared ledger). The current balance is shown prominently across all three.

---

## Core Entities

### Task

A user-defined thing-to-do that credits points on completion.
- `id`, `name`, `points` (positive integer awarded per completion), `createdAt`, `updatedAt`
- `kind` — `'oneoff'` | `'repeatable'`
- `linkType` (nullable) — the module whose own completion auto-completes this task; the only v1 value is `'workout'`. Null = a plain, manual-only task. The field shape doesn't change as future modules add values (e.g. `'meditation'`).
- Order is insertion order in v1 (drag-to-reorder is backlogged, same as templates)
- A `'oneoff'` task is "done" exactly when it has a completion ledger row; a `'repeatable'` task can be completed any number of times (one credit per completion)
- Deleting a task is permanent but harmless to history — past completions keep their `taskName`/`amount` snapshot on the `PointsTransaction` ledger

### Reward

A user-defined reward in the store.
- `id`, `name`, `cost` (positive integer points), `createdAt`, `updatedAt`
- Deleting a reward is permanent but harmless to history — past redemptions keep their own name/cost snapshot on the `PointsTransaction`, so the ledger is unaffected. (No archive/soft-hide in v1 — re-adding a reward is trivial, and the snapshot already protects history.)

*(Neither completions nor redemptions are separate entities — each is a `PointsTransaction` row; see Shared: Points Economy.)*

---

## Feature Areas

### 1. Tasks (the earn side)

**Manage (CRUD)**
- **Create** a task: name + points + kind (one-off / repeatable) + optional workout link
- **Read**: list tasks — a repeatable task is always listed with a completion count; a one-off is listed and shown done-but-kept once completed
- **Update**: rename, change points, change kind, set/clear the link
- **Delete**: remove a task (past completions survive via ledger snapshot)

**Completing**
- Tap to complete → writes a `type: 'task'` credit (snapshotting `taskName` + `amount`); the balance rises immediately
- **Repeatable**: completable repeatedly, one credit each time; shows how many times completed
- **One-off**: flips to a done state (checked/greyed, kept in the list); re-completing is a no-op until undone
- Manual completion always works — including for linked tasks — and never fabricates a workout session

**Undo a completion** (reverses the credit; may drive the balance negative — allowed)
- **Inline on the Tasks page**: tap a done one-off to un-complete it; a repeatable shows an "Undo last" control that removes its most recent completion
- **From Points history**: delete a `type: 'task'` row (reverses the credit; flips a one-off back to active)
- Both paths show a **confirmation detailing the point clawback** (e.g. *"Undo 'Go to gym'? 20 points will be removed from your balance."*), rendered as a **themed modal**, not the native `Alert`

### 2. Rewards Store (the spend side)

**Manage rewards (CRUD)**: create (name + cost), rename, change cost, delete (past redemptions survive via snapshot)

**Redeem**
- Lists rewards as cards (name + cost) with a **Redeem** button, plus the current balance
- Redeem is **disabled / shows "not enough points"** when `cost > balance`; a redemption may never overdraw below zero, and is blocked entirely while the balance is negative
- A lightweight confirm step ("Redeem <name> for <cost> points?") avoids accidental taps
- Redeeming writes a `type: 'redemption'` debit (amount = `-cost`) snapshotting the reward's name and cost; the balance updates immediately

### 3. Points History (the ledger)

- One **unified** chronological list of all `PointsTransaction`s, most recent first: task credits, manual adjustments, and redemptions — each showing amount (+/-), type, date, and the task/reward name or note
- Current **balance** shown prominently (derived = `SUM(amount)`)
- **Manual credit/debit** entry: add or correct points by hand with an optional note
- Deleting a row reverses its effect on the balance; deleting a `type: 'task'` row also flips a one-off task back to active (this is the Points-history path of "undo a completion") — same themed clawback confirmation

### 4. Workout link (auto-completion)

- A task with `linkType: 'workout'` is auto-completed when a `WorkoutSession` is completed (see Module: Workout Tracker → Finishing)
- Completing a session auto-completes **every currently-completable** `'workout'`-linked task: repeatable → one credit per session; already-done one-off → skipped; no linked task → nothing earned
- The workout "complete" flow **surfaces** which tasks fired and the points earned
- Linked tasks also show a **"Start" affordance** that deep-links into the Workout Tracker start-session flow (reverse navigation)
- The link is **one-directional**: a real session completes the task, but completing the task by hand never writes anything into the Workout Tracker
- Deleting a crediting session later does **not** claw back the completion (no reverse on session delete)

### 5. Seeding

On first install, seed a small starter set so the earn→spend loop is legible (all freely editable/deletable, like the seeded exercises/templates):
- A **"Go to gym"** repeatable task, `linkType: 'workout'`, e.g. 20 points — demonstrates the workout↔task link out of the box
- One generic sample task (e.g. "Read for 30 minutes")
- One sample reward (e.g. "1 episode of a show")

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
- Exercise library metadata (muscle group, equipment, etc.) — the library (Feature Area 5) is name-only in v1
- Deleting an exercise from the library (rename is supported; delete is not)
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
| Template Management (CRUD, no-sets data model, exercise-library picker) | ✅ `create-template.yaml`, `template-management-crud.yaml` | ❌ not yet |
| Active Workout Session (start from template/blank, edit, complete, discard) | ✅ `active-workout-session.yaml`, `workout-history.yaml` | ❌ not yet |
| Rest timer (+/-15s, skip, auto-dismiss) | ✅ covered within `active-workout-session.yaml` | ❌ not yet |
| Workout History (list, read-only detail, delete, start blank) | ✅ `workout-history.yaml` | ❌ not yet |
| Light/dark theme | ❌ no coverage (visual, not practical for Maestro assertions) | ❌ not yet |
| Locations (add/rename/delete, mandatory per-session, weight/reps memory) | ✅ `locations.yaml` | ❌ not yet |
| Exercise Substitution Groups (create/edit groups, link/change/unlink, swap mid-session) | ✅ `exercise-substitution-groups.yaml` | ❌ not yet |
| Exercise Library (seeded templates/exercises, search picker, inline add-new + dedup, library-wide reuse across screens) | ✅ `exercise-library.yaml` | ❌ not yet |
| Schema v6 upgrade path (exercise library + `exerciseId` refactor, sessions require a location) | ❌ Maestro always starts from `clearState: true`, so this path is untested by it | ❌ not yet |

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
  - [ ] Confirm an app upgrade from an existing on-device DB (pre-v6 data) still opens without errors — exercise/location/group/template/session tables are wiped and reseeded with the exercise library + sample templates (no shipped users yet, so this is a clean reseed rather than a data-preserving migration)
  - [ ] On fresh install, confirm the Templates list already shows the four seeded sample templates with real exercises
  - [ ] Add an exercise to a template: confirm the picker shows a search box, filters the library as you type, and that typing a name with no match shows "+ Add '<query>' as new exercise"
  - [ ] Create a custom exercise via that inline add, then search the exact same name again elsewhere (e.g. a different template): confirm it reuses the existing entry rather than creating a duplicate
  - [ ] Edit an existing template exercise, tap its exercise field to reopen the picker, pick a different exercise, confirm the slot updates to the new one

---

See `backlog.md` for future feature ideas and open bugs.
