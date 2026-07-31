# Backlog

## Bugs

- **Status bar overlap on template exercises screen**: on Android edge-to-edge, the header on `app/template/[id].tsx` overlaps the phone's status bar (back button/title render under the clock/battery icons). A `SafeAreaProvider` was added at the app root (`app/_layout.tsx`) to fix this for `app/session/[id].tsx`, but the issue persists on the template screen — needs further investigation (possibly a stale build/reload, or a different cause specific to that screen).
- **Grouped template exercise name can drift from its group**: editing a template exercise's name via the "Edit Exercise" modal (`components/ExerciseFormModal.tsx`) is still free-text even when that exercise is linked to an `ExerciseGroup` — nothing stops the name from ending up different from any of the group's members. Not harmful (the group link and swap picker still work off the group's members, independent of the current name), just a minor inconsistency worth tightening later, e.g. by disabling free-text rename for grouped exercises and routing through the member picker instead.

## Future Enhancements

- **Exercise library**: enforce exercise names against a curated list with muscle group metadata; migrate free-text names to library entries
- **Drag-to-reorder**: reorder exercises within a template or active session
- **Progress charts**: visualise weight/volume progression per exercise over time
- **Cloud sync**: user accounts, cross-device sync
- **Export**: CSV or JSON export of workout history
- **Per-location preferred substitute**: remember/suggest a preferred exercise-group member per location (e.g. auto-suggest machine chest press when logging at a gym without a barbell bench) — explicitly deferred when location tracking and exercise substitution groups were scoped as independent features
- **GPS-based location auto-detect**: suggest/auto-select the session's location from device location instead of a manual picker — deferred to keep the app's offline-first, no-permissions-beyond-storage footprint for v1
