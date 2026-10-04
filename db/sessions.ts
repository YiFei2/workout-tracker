import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "./client";
import { generateId } from "./ids";
import { getTemplate } from "./templates";
import type { LoggedExercise, WorkoutSession, WorkoutSet } from "../types";

export interface SessionSummary {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  completedSetCount: number;
  locationId: string | null;
  locationName: string | null;
}

export interface NewLoggedExerciseInput {
  exerciseId: string;
  exerciseName: string;
  restSeconds?: number | null;
}

export interface LoggedExercisePatch {
  exerciseId?: string;
  exerciseName?: string;
  restSeconds?: number | null;
}

export interface SetPatch {
  reps?: number;
  weight?: number;
  completed?: boolean;
}

interface SessionRow {
  id: string;
  name: string;
  template_id: string | null;
  started_at: string;
  completed_at: string | null;
  location_id: string | null;
}

// The raw logged_exercises row — no group info (see LoggedExerciseWithGroupRow).
interface LoggedExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  order_index: number;
  rest_seconds: number | null;
}

// logged_exercises joined with the current exercise's group — same live
// resolution as template_exercises, see db/templates.ts. Only used for reads.
interface LoggedExerciseWithGroupRow extends LoggedExerciseRow {
  exercise_group_id: string | null;
}

interface SetRow {
  id: string;
  exercise_id: string;
  order_index: number;
  weight: number;
  reps: number;
  completed: number;
}

function toWorkoutSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    order: row.order_index,
    weight: row.weight,
    reps: row.reps,
    completed: row.completed !== 0,
  };
}

function toLoggedExercise(row: LoggedExerciseWithGroupRow, sets: WorkoutSet[]): LoggedExercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    order: row.order_index,
    restSeconds: row.rest_seconds,
    exerciseGroupId: row.exercise_group_id,
    sets,
  };
}

// Finds the most recent *completed* session that logged this exercise (by
// library exerciseId, not name — see backlog.md "Exercise library") with at
// least one *completed* set, optionally scoped to a location. Only completed
// sets/sessions count as history: an unchecked set or an abandoned session is
// unreliable signal for a suggestion.
async function findMostRecentCompletedExerciseId(
  db: SQLiteDatabase,
  exerciseId: string,
  locationId: string | null,
): Promise<string | null> {
  const locationClause = locationId !== null ? "AND s.location_id = ?" : "";
  const params = locationId !== null ? [exerciseId, locationId] : [exerciseId];

  const row = await db.getFirstAsync<{ logged_exercise_id: string }>(
    `SELECT le.id AS logged_exercise_id
     FROM logged_exercises le
     JOIN sessions s ON s.id = le.session_id
     WHERE s.completed_at IS NOT NULL
       AND le.exercise_id = ?
       ${locationClause}
       AND EXISTS (SELECT 1 FROM sets st WHERE st.exercise_id = le.id AND st.completed = 1)
     ORDER BY s.started_at DESC
     LIMIT 1`,
    ...params,
  );
  return row?.logged_exercise_id ?? null;
}

// The weight/reps suggestion for a freshly added/swapped-in exercise
// instance: most recent completed sets for this exercise at this location,
// falling back to the most recent completed sets at any location, falling
// back to no suggestion (caller starts blank) if there's no history anywhere.
// Weight and reps always travel together as the pair they were actually
// logged with — never mixed from different historical sets.
async function findSuggestedSets(
  db: SQLiteDatabase,
  exerciseId: string,
  locationId: string | null,
): Promise<{ weight: number; reps: number }[]> {
  let loggedExerciseId = await findMostRecentCompletedExerciseId(db, exerciseId, locationId);
  if (!loggedExerciseId && locationId !== null) {
    loggedExerciseId = await findMostRecentCompletedExerciseId(db, exerciseId, null);
  }
  if (!loggedExerciseId) {
    return [];
  }
  return db.getAllAsync<{ weight: number; reps: number }>(
    "SELECT weight, reps FROM sets WHERE exercise_id = ? AND completed = 1 ORDER BY order_index ASC",
    loggedExerciseId,
  );
}

// Creates a logged exercise plus however many sets it had last time (per
// findSuggestedSets), each pre-filled with that historical weight/reps —
// or a single blank set if there's no history anywhere for this exercise.
async function insertLoggedExerciseWithSuggestedSets(
  db: SQLiteDatabase,
  sessionId: string,
  order: number,
  exerciseId: string,
  exerciseName: string,
  restSeconds: number | null,
  locationId: string | null,
): Promise<LoggedExercise> {
  const loggedExerciseId = generateId();
  await db.runAsync(
    `INSERT INTO logged_exercises (id, session_id, exercise_id, exercise_name, order_index, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
    loggedExerciseId,
    sessionId,
    exerciseId,
    exerciseName,
    order,
    restSeconds,
  );

  const exerciseRow = await db.getFirstAsync<{ group_id: string | null }>(
    "SELECT group_id FROM exercises WHERE id = ?",
    exerciseId,
  );

  const suggested = await findSuggestedSets(db, exerciseId, locationId);
  const sourceSets = suggested.length > 0 ? suggested : [{ weight: 0, reps: 0 }];

  const sets: WorkoutSet[] = [];
  for (let i = 0; i < sourceSets.length; i++) {
    const setId = generateId();
    await db.runAsync(
      "INSERT INTO sets (id, exercise_id, order_index, weight, reps, completed) VALUES (?, ?, ?, ?, ?, 0)",
      setId,
      loggedExerciseId,
      i,
      sourceSets[i].weight,
      sourceSets[i].reps,
    );
    sets.push({ id: setId, exerciseId: loggedExerciseId, order: i, weight: sourceSets[i].weight, reps: sourceSets[i].reps, completed: false });
  }

  return {
    id: loggedExerciseId,
    sessionId,
    exerciseId,
    exerciseName,
    order,
    restSeconds,
    exerciseGroupId: exerciseRow?.group_id ?? null,
    sets,
  };
}

export async function listSessions(): Promise<SessionSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    started_at: string;
    completed_at: string | null;
    exercise_count: number;
    completed_set_count: number;
    location_id: string | null;
    location_name: string | null;
  }>(
    `SELECT s.id, s.name, s.started_at, s.completed_at, s.location_id, loc.name AS location_name,
        COUNT(DISTINCT le.id) AS exercise_count,
        COUNT(CASE WHEN st.completed = 1 THEN 1 END) AS completed_set_count
     FROM sessions s
     LEFT JOIN locations loc ON loc.id = s.location_id
     LEFT JOIN logged_exercises le ON le.session_id = s.id
     LEFT JOIN sets st ON st.exercise_id = le.id
     WHERE s.completed_at IS NOT NULL
     GROUP BY s.id
     ORDER BY s.started_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    exerciseCount: row.exercise_count,
    completedSetCount: row.completed_set_count,
    locationId: row.location_id,
    locationName: row.location_name,
  }));
}

export async function getSession(id: string): Promise<WorkoutSession | null> {
  const db = await getDb();
  const sessionRow = await db.getFirstAsync<SessionRow>(
    "SELECT * FROM sessions WHERE id = ?",
    id,
  );
  if (!sessionRow) {
    return null;
  }
  const exerciseRows = await db.getAllAsync<LoggedExerciseWithGroupRow>(
    `SELECT le.*, e.group_id AS exercise_group_id
     FROM logged_exercises le
     JOIN exercises e ON e.id = le.exercise_id
     WHERE le.session_id = ?
     ORDER BY le.order_index ASC`,
    id,
  );
  const setRows = await db.getAllAsync<SetRow>(
    `SELECT st.* FROM sets st
     JOIN logged_exercises le ON le.id = st.exercise_id
     WHERE le.session_id = ?
     ORDER BY st.order_index ASC`,
    id,
  );

  const setsByExercise = new Map<string, WorkoutSet[]>();
  for (const setRow of setRows) {
    const set = toWorkoutSet(setRow);
    const existing = setsByExercise.get(set.exerciseId);
    if (existing) {
      existing.push(set);
    } else {
      setsByExercise.set(set.exerciseId, [set]);
    }
  }

  return {
    id: sessionRow.id,
    name: sessionRow.name,
    templateId: sessionRow.template_id,
    startedAt: sessionRow.started_at,
    completedAt: sessionRow.completed_at,
    locationId: sessionRow.location_id,
    exercises: exerciseRows.map((row) => toLoggedExercise(row, setsByExercise.get(row.id) ?? [])),
  };
}

// Location is required: it drives per-location weight/reps suggestions, so
// every new session must be tagged with one from the moment it's created —
// see the pre-start LocationPickerModal in app/(tabs)/history.tsx and
// app/template/[id].tsx.
export async function startBlankSession(locationId: string, name?: string): Promise<WorkoutSession> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const sessionName = name?.trim() || new Date().toLocaleString();

  await db.runAsync(
    "INSERT INTO sessions (id, name, template_id, started_at, completed_at, location_id) VALUES (?, ?, NULL, ?, NULL, ?)",
    id,
    sessionName,
    now,
    locationId,
  );

  return {
    id,
    name: sessionName,
    templateId: null,
    startedAt: now,
    completedAt: null,
    locationId,
    exercises: [],
  };
}

export async function startSessionFromTemplate(
  templateId: string,
  locationId: string,
): Promise<WorkoutSession> {
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    "INSERT INTO sessions (id, name, template_id, started_at, completed_at, location_id) VALUES (?, ?, ?, ?, NULL, ?)",
    id,
    template.name,
    templateId,
    now,
    locationId,
  );

  const exercises: LoggedExercise[] = [];
  for (const templateExercise of template.exercises) {
    exercises.push(
      await insertLoggedExerciseWithSuggestedSets(
        db,
        id,
        templateExercise.order,
        templateExercise.exerciseId,
        templateExercise.exerciseName,
        templateExercise.restSeconds,
        locationId,
      ),
    );
  }

  return {
    id,
    name: template.name,
    templateId,
    startedAt: now,
    completedAt: null,
    locationId,
    exercises,
  };
}

// Changing location mid-session only relabels already-completed sets'
// context — a completed set is an already-logged fact and is left alone.
// Sets not yet completed are still just suggestions, so they get refreshed
// against the newly selected location's history (falling back to any
// location, same as a freshly added exercise).
export async function setSessionLocation(sessionId: string, locationId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE sessions SET location_id = ? WHERE id = ?", locationId, sessionId);

  const exercises = await db.getAllAsync<{ id: string; exercise_id: string }>(
    "SELECT id, exercise_id FROM logged_exercises WHERE session_id = ?",
    sessionId,
  );

  for (const exercise of exercises) {
    const suggested = await findSuggestedSets(db, exercise.exercise_id, locationId);
    if (suggested.length === 0) {
      continue;
    }
    const incompleteSets = await db.getAllAsync<SetRow>(
      "SELECT * FROM sets WHERE exercise_id = ? AND completed = 0 ORDER BY order_index ASC",
      exercise.id,
    );
    for (const set of incompleteSets) {
      const match = suggested[set.order_index];
      if (!match) {
        continue;
      }
      await db.runAsync(
        "UPDATE sets SET weight = ?, reps = ? WHERE id = ?",
        match.weight,
        match.reps,
        set.id,
      );
    }
  }
}

export async function completeSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sessions SET completed_at = ? WHERE id = ?",
    new Date().toISOString(),
    id,
  );
}

// Used both to discard an in-progress session and to delete one from history.
export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sessions WHERE id = ?", id);
}

export async function addLoggedExercise(
  sessionId: string,
  input: NewLoggedExerciseInput,
): Promise<LoggedExercise> {
  const db = await getDb();
  const sessionRow = await db.getFirstAsync<{ location_id: string | null }>(
    "SELECT location_id FROM sessions WHERE id = ?",
    sessionId,
  );
  const maxOrderRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(order_index) AS max_order FROM logged_exercises WHERE session_id = ?",
    sessionId,
  );
  const order = (maxOrderRow?.max_order ?? -1) + 1;

  return insertLoggedExerciseWithSuggestedSets(
    db,
    sessionId,
    order,
    input.exerciseId,
    input.exerciseName,
    input.restSeconds ?? null,
    sessionRow?.location_id ?? null,
  );
}

export async function updateLoggedExercise(id: string, patch: LoggedExercisePatch): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<LoggedExerciseRow>(
    "SELECT * FROM logged_exercises WHERE id = ?",
    id,
  );
  if (!existing) {
    return;
  }
  const next = {
    exercise_id: patch.exerciseId ?? existing.exercise_id,
    exercise_name: patch.exerciseName ?? existing.exercise_name,
    rest_seconds: patch.restSeconds !== undefined ? patch.restSeconds : existing.rest_seconds,
  };
  await db.runAsync(
    "UPDATE logged_exercises SET exercise_id = ?, exercise_name = ?, rest_seconds = ? WHERE id = ?",
    next.exercise_id,
    next.exercise_name,
    next.rest_seconds,
    id,
  );
}

export async function removeLoggedExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM logged_exercises WHERE id = ?", id);
}

// Swaps a logged exercise for a different member of its substitution group
// (e.g. Barbell Bench -> Dumbbell Bench). Existing sets are discarded in
// favor of the swapped-in exercise's own historical weight/reps (same
// lookup as a freshly added exercise), since the old exercise's numbers
// aren't meaningful for the new one.
export async function swapLoggedExercise(
  id: string,
  exerciseId: string,
  exerciseName: string,
): Promise<WorkoutSet[]> {
  const db = await getDb();
  const existing = await db.getFirstAsync<LoggedExerciseRow>(
    "SELECT * FROM logged_exercises WHERE id = ?",
    id,
  );
  if (!existing) {
    return [];
  }
  const sessionRow = await db.getFirstAsync<{ location_id: string | null }>(
    "SELECT location_id FROM sessions WHERE id = ?",
    existing.session_id,
  );

  await db.runAsync(
    "UPDATE logged_exercises SET exercise_id = ?, exercise_name = ? WHERE id = ?",
    exerciseId,
    exerciseName,
    id,
  );
  await db.runAsync("DELETE FROM sets WHERE exercise_id = ?", id);

  const suggested = await findSuggestedSets(db, exerciseId, sessionRow?.location_id ?? null);
  const sourceSets = suggested.length > 0 ? suggested : [{ weight: 0, reps: 0 }];

  const sets: WorkoutSet[] = [];
  for (let i = 0; i < sourceSets.length; i++) {
    const setId = generateId();
    await db.runAsync(
      "INSERT INTO sets (id, exercise_id, order_index, weight, reps, completed) VALUES (?, ?, ?, ?, ?, 0)",
      setId,
      id,
      i,
      sourceSets[i].weight,
      sourceSets[i].reps,
    );
    sets.push({ id: setId, exerciseId: id, order: i, weight: sourceSets[i].weight, reps: sourceSets[i].reps, completed: false });
  }
  return sets;
}

// Copies the last set's weight/reps as the default for the new set, per
// requirements.md ("Add a set to an exercise copies last set's values").
export async function addSet(
  exerciseId: string,
  overrides?: { reps?: number; weight?: number },
): Promise<WorkoutSet> {
  const db = await getDb();
  const id = generateId();

  const lastSet = await db.getFirstAsync<SetRow>(
    "SELECT * FROM sets WHERE exercise_id = ? ORDER BY order_index DESC LIMIT 1",
    exerciseId,
  );
  const maxOrderRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(order_index) AS max_order FROM sets WHERE exercise_id = ?",
    exerciseId,
  );
  const order = (maxOrderRow?.max_order ?? -1) + 1;
  const reps = overrides?.reps ?? lastSet?.reps ?? 10;
  const weight = overrides?.weight ?? lastSet?.weight ?? 0;

  await db.runAsync(
    "INSERT INTO sets (id, exercise_id, order_index, weight, reps, completed) VALUES (?, ?, ?, ?, ?, 0)",
    id,
    exerciseId,
    order,
    weight,
    reps,
  );

  return { id, exerciseId, order, weight, reps, completed: false };
}

export async function updateSet(id: string, patch: SetPatch): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<SetRow>("SELECT * FROM sets WHERE id = ?", id);
  if (!existing) {
    return;
  }
  const next = {
    reps: patch.reps ?? existing.reps,
    weight: patch.weight ?? existing.weight,
    completed: patch.completed !== undefined ? (patch.completed ? 1 : 0) : existing.completed,
  };
  await db.runAsync(
    "UPDATE sets SET reps = ?, weight = ?, completed = ? WHERE id = ?",
    next.reps,
    next.weight,
    next.completed,
    id,
  );
}

export async function removeSet(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sets WHERE id = ?", id);
}
