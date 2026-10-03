# Backlog

## Bugs

- **Status bar overlap on template exercises screen**: on Android edge-to-edge, the header on `app/template/[id].tsx` overlaps the phone's status bar (back button/title render under the clock/battery icons). A `SafeAreaProvider` was added at the app root (`app/_layout.tsx`) to fix this for `app/session/[id].tsx`, but the issue persists on the template screen — needs further investigation (possibly a stale build/reload, or a different cause specific to that screen).
- **Sporadic background SQLite error toast**: `"Uncaught (in promise, id: 0) Error: Call to function 'NativeStatement.finalizeAsync' has been rejected... doesn't contain valid id"` surfaces occasionally during normal DB-heavy interactions (e.g. adding an exercise). Seen twice during exercise-library testing, in unrelated contexts, non-deterministically (didn't reproduce on a retry of the same steps). Hasn't been observed to actually break anything (the underlying action always completed correctly), but the root cause — likely a late-resolving/unawaited `expo-sqlite` statement finalization racing a component unmount or background refresh — hasn't been tracked down. Worth investigating if it ever starts affecting outcomes.

## Future Enhancements

- **Drag-to-reorder**: reorder exercises within a template or active session
- **Progress charts**: visualise weight/volume progression per exercise over time
- **Cloud sync**: user accounts, cross-device sync
- **Export**: CSV or JSON export of workout history
- **Per-location preferred substitute**: remember/suggest a preferred exercise-group member per location (e.g. auto-suggest machine chest press when logging at a gym without a barbell bench) — explicitly deferred when location tracking and exercise substitution groups were scoped as independent features
- **GPS-based location auto-detect**: suggest/auto-select the session's location from device location instead of a manual picker — deferred to keep the app's offline-first, no-permissions-beyond-storage footprint for v1
