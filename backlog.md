# Backlog

## Bugs

- **Status bar overlap on template exercises screen**: on Android edge-to-edge, the header on `app/template/[id].tsx` overlaps the phone's status bar (back button/title render under the clock/battery icons). A `SafeAreaProvider` was added at the app root (`app/_layout.tsx`) to fix this for `app/session/[id].tsx`, but the issue persists on the template screen — needs further investigation (possibly a stale build/reload, or a different cause specific to that screen).
- **Grouped template exercise name can drift from its group**: editing a template exercise's name via the "Edit Exercise" modal (`components/ExerciseFormModal.tsx`) is still free-text even when that exercise is linked to an `ExerciseGroup` — nothing stops the name from ending up different from any of the group's members. Not harmful (the group link and swap picker still work off the group's members, independent of the current name), just a minor inconsistency worth tightening later, e.g. by disabling free-text rename for grouped exercises and routing through the member picker instead.

## Future Enhancements

- **Exercise library** (next up, right after the location-scoped weight-tracking fix): a separate `exercises` table, preloaded with a curated list of common exercises (with muscle group metadata), that users can also add their own entries to. Scope:
  - New `Exercise { id, name, muscleGroup, ... }` table + seed data for common exercises.
  - Replace free-text `exerciseName: string` on `TemplateExercise` / `LoggedExercise` with `exerciseId` referencing this table (string fields may stay for display/back-compat during transition, but matching/lookups move to ID).
  - User-added custom exercises go into the same table (not a separate "custom" concept) — library is just seeded, not closed.
  - **Why this is next**: the location-scoped weight-tracking feature (see `requirements.md` §4) added a historical weight/reps lookup keyed by exercise name (case-insensitive/trimmed string match) purely as an interim measure — free-text names are fragile for this (typos, inconsistent casing, "DB Bench" vs "Dumbbell Bench Press" never matching). Once the library exists, that lookup should key off `exerciseId` instead, which is the whole motivation for sequencing this feature right after.
  - Also unblocks tightening the "grouped exercise name can drift from its group" bug above (line 6) — with ID-based exercises, a template slot linked to an `ExerciseGroup` could just reference group members by ID instead of free-text name.
- **Drag-to-reorder**: reorder exercises within a template or active session
- **Progress charts**: visualise weight/volume progression per exercise over time
- **Cloud sync**: user accounts, cross-device sync
- **Export**: CSV or JSON export of workout history
- **Per-location preferred substitute**: remember/suggest a preferred exercise-group member per location (e.g. auto-suggest machine chest press when logging at a gym without a barbell bench) — explicitly deferred when location tracking and exercise substitution groups were scoped as independent features
- **GPS-based location auto-detect**: suggest/auto-select the session's location from device location instead of a manual picker — deferred to keep the app's offline-first, no-permissions-beyond-storage footprint for v1
