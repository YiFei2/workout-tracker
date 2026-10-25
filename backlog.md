# Backlog

## Bugs

- **Status bar overlap on template exercises screen**: on Android edge-to-edge, the header on `app/template/[id].tsx` overlaps the phone's status bar (back button/title render under the clock/battery icons). A `SafeAreaProvider` was added at the app root (`app/_layout.tsx`) to fix this for `app/session/[id].tsx`, but the issue persists on the template screen — needs further investigation (possibly a stale build/reload, or a different cause specific to that screen).
- **Sporadic background SQLite error toast**: `"Uncaught (in promise, id: 0) Error: Call to function 'NativeStatement.finalizeAsync' has been rejected... doesn't contain valid id"` surfaces occasionally during normal DB-heavy interactions (e.g. adding an exercise). Seen twice during exercise-library testing, in unrelated contexts, non-deterministically (didn't reproduce on a retry of the same steps). Hasn't been observed to actually break anything (the underlying action always completed correctly), but the root cause — likely a late-resolving/unawaited `expo-sqlite` statement finalization racing a component unmount or background refresh — hasn't been tracked down. Worth investigating if it ever starts affecting outcomes.

## UX Improvements (from manual E2E, 2026-10-22)

- **Rest timer vs. keyboard overlap not reverified since the overlay→bar change (2026-10-25)**: the rest timer used to be a full-screen `RestTimerOverlay`; it's now a slim non-blocking `RestTimerBar` pinned to the bottom of the screen (`components/RestTimerBar.tsx`) so the rest of the workout stays visible/interactive while resting. Not yet verified whether the on-screen keyboard (editing another set's reps/weight while resting) can still cover/clash with the bar, since the bar sits outside the `KeyboardAvoidingView`. Worth a manual check with the keyboard open.
- **In-memory rest timer no longer protected from accidental back-navigation (2026-10-25)**: replacing `RestTimerOverlay` (built on `OverlayModal`, which disabled the header back button and swipe-back gesture while open) with `RestTimerBar` dropped that lock as a side effect. `useRestTimer`'s countdown state is local to `app/session/[id].tsx`, so navigating away from the session screen mid-rest now unmounts it — only the already-scheduled OS notification still fires as a fallback. Decide whether this is acceptable (bar is meant to be viewed alongside the exercise list on this screen, not relied on across navigation) or whether the countdown should be lifted somewhere it survives navigation.
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
