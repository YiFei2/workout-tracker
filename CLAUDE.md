# Claude Code — Project Guide

## Project

**workout-tracker** — A React Native / Expo mobile app for logging gym workouts.  
See `requirements.md` for full product requirements and feature scope.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| Local DB | expo-sqlite |
| Styling | NativeWind (Tailwind for RN) or StyleSheet — TBD |

## Dev Commands

```bash
npm start          # start Expo dev server
npm run ios        # run on iOS simulator
npm run android    # run on Android emulator
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Conventions

- All data access goes through a `db/` layer — no raw SQL outside of it
- Screens live in `app/` (Expo Router), shared UI in `components/`
- Business logic in `hooks/` or `lib/` — keep screens thin
- Use `types/` for all shared TypeScript interfaces matching the entities in `requirements.md`
- No `any` — use proper types or `unknown` with narrowing
- Prefer named exports over default exports (except Expo Router screen files which must be default)

## Data Model (quick ref)

See `requirements.md` for full entity definitions. Key types:
`WorkoutTemplate` → `TemplateExercise[]`  
`WorkoutSession` → `LoggedExercise[]` → `Set[]`

## Key Decisions

- **Offline-first**: all data in expo-sqlite, no network calls in v1
- **Free-text exercise names** in v1 (no enforced exercise library yet)
- **Weight unit**: kg hardcoded in v1

## Git Workflow

- Commit after each key feature or section is implemented (e.g. DB layer, Template Management screens), not just at the end of a session
- Keep commits scoped to that feature/section rather than batching unrelated work together

## Product Direction

Any new feature ideas, scope decisions, or product direction notes go directly into `requirements.md` — expanding an existing section as appropriate. Do not let ideas get lost in conversation.

## Backlog

Open bugs and future feature ideas live in `backlog.md` (**Bugs** and **Future Enhancements** sections), not in conversation. Add to it whenever a bug is found but deferred, or a feature idea comes up that's out of scope for the current work.
