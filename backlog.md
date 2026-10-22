# Backlog

## Bugs

- **Status bar overlap on template exercises screen**: on Android edge-to-edge, the header on `app/template/[id].tsx` overlaps the phone's status bar (back button/title render under the clock/battery icons). A `SafeAreaProvider` was added at the app root (`app/_layout.tsx`) to fix this for `app/session/[id].tsx`, but the issue persists on the template screen — needs further investigation (possibly a stale build/reload, or a different cause specific to that screen).
- **Sporadic background SQLite error toast**: `"Uncaught (in promise, id: 0) Error: Call to function 'NativeStatement.finalizeAsync' has been rejected... doesn't contain valid id"` surfaces occasionally during normal DB-heavy interactions (e.g. adding an exercise). Seen twice during exercise-library testing, in unrelated contexts, non-deterministically (didn't reproduce on a retry of the same steps). Hasn't been observed to actually break anything (the underlying action always completed correctly), but the root cause — likely a late-resolving/unawaited `expo-sqlite` statement finalization racing a component unmount or background refresh — hasn't been tracked down. Worth investigating if it ever starts affecting outcomes.

## UX Improvements (from manual E2E, 2026-10-22)

- **Keyboard not dismissed when the rest-timer overlay appears**: marking a set Done while its reps/weight field still has focus leaves the numeric keyboard open over the bottom of the rest-timer overlay (covers part of the controls). The overlay should blur the active input when it opens.
- **Unthemed native confirm dialogs**: the "Complete workout" and "Discard workout" confirmations use the default **light** Android `Alert.alert`, which clashes with the app's dark theme and its own dark custom modals (location picker, rest timer, rename). Consider a themed custom confirm for consistency. (Custom modals like rename/swap/location *are* themed correctly.)
- **Verbose default name for blank/ad-hoc sessions in History**: a session with no template is titled with a full machine timestamp (e.g. "10/4/2026, 1:13:09 AM") while the subtitle already shows the date. A cleaner default (e.g. "Workout — Oct 4") would read better.

## Open questions / scope notes (from manual E2E, 2026-10-22)

- **Weight unit kg/lb toggle is implemented** in Settings, though `requirements.md` lists the unit toggle as Out of Scope and "kg hardcoded in v1". Set-row headers still read "WEIGHT (KG)"; not verified whether switching to lb converts/propagates everywhere. Decide whether to keep (and update reqs) or hide it.
- **"Manage Exercises" screen exists** in Settings, though reqs say "no separate 'manage exercises' screen". It offers rename only (no delete), consistent with "delete not supported in v1". Reasonable enhancement — update reqs if keeping.
- **"+ Link substitution group" is offered inside an active session** on non-grouped exercises. Reqs only describe Swap in-session (linking is a template-edit action). Confirm this is intentional.

## Future Enhancements

- **Drag-to-reorder**: reorder exercises within a template or active session
- **Progress charts**: visualise weight/volume progression per exercise over time
- **Cloud sync**: user accounts, cross-device sync
- **Export**: CSV or JSON export of workout history
- **Per-location preferred substitute**: remember/suggest a preferred exercise-group member per location (e.g. auto-suggest machine chest press when logging at a gym without a barbell bench) — explicitly deferred when location tracking and exercise substitution groups were scoped as independent features
- **GPS-based location auto-detect**: suggest/auto-select the session's location from device location instead of a manual picker — deferred to keep the app's offline-first, no-permissions-beyond-storage footprint for v1
