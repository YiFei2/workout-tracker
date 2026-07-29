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
}

export interface NewLoggedExerciseInput {
  exerciseName: string;
  restSeconds?: number | null;
}

export interface LoggedExercisePatch {
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
}

interface LoggedExerciseRow {
  id: string;
  session_id: string;
  exercise_name: string;
  order_index: number;
  rest_seconds: number | null;
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

function toLoggedExercise(row: LoggedExerciseRow, sets: WorkoutSet[]): LoggedExercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseName: row.exercise_name,
    order: row.order_index,
    restSeconds: row.rest_seconds,
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
  }>(
    `SELECT s.id, s.name, s.started_at, s.completed_at,
        COUNT(DISTINCT le.id) AS exercise_count,
        COUNT(CASE WHEN st.completed = 1 THEN 1 END) AS completed_set_count
     FROM sessions s
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
  const exerciseRows = await db.getAllAsync<LoggedExerciseRow>(
    "SELECT * FROM logged_exercises WHERE session_id = ? ORDER BY order_index ASC",
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
    exercises: exerciseRows.map((row) => toLoggedExercise(row, setsByExercise.get(row.id) ?? [])),
  };
}

export async function startBlankSession(name?: string): Promise<WorkoutSession> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const sessionName = name?.trim() || new Date().toLocaleString();

  await db.runAsync(
    "INSERT INTO sessions (id, name, template_id, started_at, completed_at) VALUES (?, ?, NULL, ?, NULL)",
    id,
    sessionName,
    now,
  );

  return { id, name: sessionName, templateId: null, startedAt: now, completedAt: null, exercises: [] };
}

export async function startSessionFromTemplate(templateId: string): Promise<WorkoutSession> {
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    "INSERT INTO sessions (id, name, template_id, started_at, completed_at) VALUES (?, ?, ?, ?, NULL)",
    id,
    template.name,
    templateId,
    now,
  );

  const exercises: LoggedExercise[] = [];
  for (const templateExercise of template.exercises) {
    const exerciseId = generateId();
    await db.runAsync(
      `INSERT INTO logged_exercises (id, session_id, exercise_name, order_index, rest_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      exerciseId,
      id,
      templateExercise.exerciseName,
      templateExercise.order,
      templateExercise.restSeconds,
    );

    const sets: WorkoutSet[] = [];
    for (const templateSet of templateExercise.sets) {
      const setId = generateId();
      await db.runAsync(
        `INSERT INTO sets (id, exercise_id, order_index, weight, reps, completed)
         VALUES (?, ?, ?, ?, ?, 0)`,
        setId,
        exerciseId,
        templateSet.order,
        templateSet.weight,
        templateSet.reps,
      );
      sets.push({
        id: setId,
        exerciseId,
        order: templateSet.order,
        weight: templateSet.weight,
        reps: templateSet.reps,
        completed: false,
      });
    }

    exercises.push({
      id: exerciseId,
      sessionId: id,
      exerciseName: templateExercise.exerciseName,
      order: templateExercise.order,
      restSeconds: templateExercise.restSeconds,
      sets,
    });
  }

  return {
    id,
    name: template.name,
    templateId,
    startedAt: now,
    completedAt: null,
    exercises,
  };
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
  const id = generateId();
  const maxOrderRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(order_index) AS max_order FROM logged_exercises WHERE session_id = ?",
    sessionId,
  );
  const order = (maxOrderRow?.max_order ?? -1) + 1;
  const restSeconds = input.restSeconds ?? null;

  await db.runAsync(
    `INSERT INTO logged_exercises (id, session_id, exercise_name, order_index, rest_seconds)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    sessionId,
    input.exerciseName,
    order,
    restSeconds,
  );

  const set = await addSet(id, { reps: 10, weight: 0 });

  return {
    id,
    sessionId,
    exerciseName: input.exerciseName,
    order,
    restSeconds,
    sets: [set],
  };
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
    exercise_name: patch.exerciseName ?? existing.exercise_name,
    rest_seconds: patch.restSeconds !== undefined ? patch.restSeconds : existing.rest_seconds,
  };
  await db.runAsync(
    "UPDATE logged_exercises SET exercise_name = ?, rest_seconds = ? WHERE id = ?",
    next.exercise_name,
    next.rest_seconds,
    id,
  );
}

export async function removeLoggedExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM logged_exercises WHERE id = ?", id);
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
