# Manual E2E Test Report — 2026-10-22

**Scope:** End-to-end user testing of the whole app on an Android emulator (dev build, Metro live), driving real flows by touch and verifying against `requirements.md`. Where the UI was ambiguous, behavior was confirmed against the on-device SQLite DB.

**Bottom line:** Core flows work well. One **high-severity data-loss bug** was found in set logging. A handful of UX polish items and scope mismatches are noted. All bugs/UX items have also been filed in `backlog.md`.

---

## 🔴 Bugs

### 1. [HIGH — data loss] Last-edited set value (reps/weight) is not saved; screen and database disagree — ✅ FIXED (2026-10-23)

> **Resolution:** `SetRow` now persists valid values on every change (`onChangeText`), not only on blur, and `useSession` applies set updates optimistically (no per-keystroke refetch). Verified on device: logging Set 2 as 60×8 and tapping Done directly now saves `reps=8` (was `0`), and "+ Add Set" copies 60×8 correctly. Unit tests added in `components/SetRow.test.tsx`. Details below.


**Symptom:** You log a set, see your numbers on screen (and a green ✓), finish the workout — and the saved value is wrong (often `0`).

**Reproduced end-to-end:**
- Barbell Bench Press, Set 2 entered as **60 kg × 8 reps**, marked Done.
- Screen showed **60 × 8** with a green ✓.
- The SQLite row actually saved **reps = 0**.
- "+ Add Set" then created Set 3 copying that bad **0**.
- After Complete Workout, the read-only History detail permanently shows **Set 2 = 60 / 0**.

**Root cause:** `components/SetRow.tsx` only writes edits to the DB in `commitReps` / `commitWeight`, which fire on the TextInput's `onEndEditing` (blur). If the user leaves the **last-edited** field by an action that doesn't reliably blur it on Android — tapping the **Done** check, dismissing the keyboard with the **back** button, or **+ Add Set** — `onEndEditing` never fires, so the typed value stays only in the component's local `useState` and never reaches `updateSet`. Weight usually survives because focus naturally moves weight → reps (that blur commits weight); reps, being the last field, is the one dropped. The timing dependence makes it flaky.

**Impact:** Silently corrupts workout history **and** poisons the location-scoped weight/reps "memory" that pre-populates future sessions.

**Suggested fix:** Persist on `onChangeText` (debounced) rather than only on blur, and/or explicitly flush the pending value before completing a set, adding a set, or completing the workout. Keep the existing positive-number validation.

> Not auto-fixed: this changes `SetRow`'s commit model (the current commit-on-blur design is deliberate, with inline validation), so it warrants your call rather than a silent edit.

---

## 🟡 UX Improvements

- **Keyboard covers the rest-timer overlay.** Marking a set Done while its field still has focus leaves the numeric keyboard open on top of the rest-timer overlay (obscures part of the controls). The overlay should blur the active input when it opens.
- **Unthemed native confirm dialogs.** The "Complete workout" and "Discard workout" confirmations use the default **light** Android alert, clashing with the app's dark theme and its own dark custom modals. A themed custom confirm would be consistent. (Rename / swap / location pickers *are* themed correctly.)
- **Verbose default session name in History.** A blank/ad-hoc session is titled with a full machine timestamp ("10/4/2026, 1:13:09 AM") while the subtitle already shows the date. A cleaner default (e.g. "Workout — Oct 4") reads better.

## 🔵 Scope mismatches vs `requirements.md` (confirm intent)

- **kg/lb unit toggle** is implemented in Settings, but reqs mark the unit toggle Out of Scope / "kg hardcoded in v1". Set-row headers still read "WEIGHT (KG)"; lb propagation not fully verified.
- **"Manage Exercises" screen** exists, though reqs say there's no separate manage-exercises screen. It's rename-only (no delete), consistent with "delete not supported in v1".
- **"+ Link substitution group" is offered mid-session** on non-grouped exercises; reqs only describe Swap in-session (linking is a template-edit action).

---

## ✅ Verified working

- Mandatory **location picker** before every session start, incl. inline "+ Add new location" (created a gym on the spot, flow continued — no dead end).
- **Weight/reps memory:** a fresh session reproduced the 2 completed historical sets (60/10, 60/0); an exercise with no completed history got a single blank 0/0 set.
- **Rest timer:** appears on marking a set Done, counts down from the exercise's rest (2:00), ±15s and Skip work, back/Skip dismiss.
- **+ Add Set** appends and copies the previous set's values (subject to Bug 1's persistence issue).
- **Swap** (group-linked exercise): member picker with search; swapping Barbell Bench Press → Cable Flye changed the exercise and reset to a blank set, Swap retained.
- **Complete Workout** confirmation → saved to History with correct exercise/set-completed counts and location tag.
- **Read-only History detail** (values + ✓/— only, no edit controls).
- **Discard** with "cannot be undone" confirmation.
- **Theme toggle** (Light/Dark/System) applies instantly across all screens, tab bar, headers, and status-bar icons.
- **Template detail**: no sets/reps/weight controls (name + rest + substitution only), plus a nice per-exercise location-scoped history preview.
- **Reorder arrows** (▲▼) present on template & session exercises.

---

*Testing caveat (not an app issue): the emulator had heavy input latency — taps were delayed ~1 frame and occasionally queued, which is why many steps needed a double tap. This is an emulator-performance artifact, not app behavior.*
