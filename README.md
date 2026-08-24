# workout-tracker

A React Native / Expo app for logging gym workouts offline. Build reusable workout templates, run through them in the gym, and review your history over time.

## Getting Started

```bash
npm install
npm start          # start the Expo dev server
npm run ios        # run on iOS simulator
npm run android    # run on Android emulator
```

## Features

### Templates
Build reusable workout plans ahead of time.
- Create a template and add exercises to it by name
- Give each exercise an optional rest timer duration
- Add one or more sets per exercise, each with its own reps and weight (handy for progressive overload)
- Rename templates, edit/add/remove exercises and sets, or delete a template entirely

### Running a Workout
- Start a session from a template (pre-filled with its exercises/sets) or start blank and build it as you go
- Check off sets as you complete them, editing weight/reps inline
- Add or remove sets and exercises on the fly
- A rest timer pops up automatically when you complete a set (based on that exercise's rest duration), with +/-15s adjustment and a skip button
- Finish by completing the workout (saved to history) or discarding it

### History
- Browse past sessions, most recent first, with date, name, exercise count, and completed-set count
- Tap into any session to see the full read-only breakdown of exercises and sets
- Delete old sessions

### Locations
Keep logged weights separate across different gyms whose equipment may vary.
- Manage a list of locations from Settings → Manage Locations
- Tag a session with a location while it's in progress
- History shows the location on each session row

### Exercise Substitution Groups
Swap between interchangeable exercises (e.g. Barbell Bench Press ↔ Dumbbell Bench Press ↔ Machine Chest Press) without losing your template structure.
- Manage named groups and their member exercises from Settings → Manage Exercise Groups
- Link a template exercise to a group so sessions started from it inherit the link
- During a session, use "⇄ Swap" on a linked exercise to switch to another member

### Settings
- Light / Dark / System theme

## Notes

- **Offline-first** — all data is stored locally on-device (SQLite), no account or network sync
- **Weight unit** — kg only for now
- **Exercise names** — free text; there's no exercise library yet

See `requirements.md` for full product requirements and `backlog.md` for open bugs and planned features.
