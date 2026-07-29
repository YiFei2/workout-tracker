import type { SQLiteDatabase } from "expo-sqlite";

import type { TemplateExercise, TemplateSet, WorkoutTemplate } from "../types";
import { getDb } from "./client";
import { generateId } from "./ids";

export interface TemplateSummary {
  id: string;
  name: string;
  exerciseCount: number;
}

export interface NewTemplateExerciseInput {
  exerciseName: string;
  restSeconds?: number | null;
}

export interface TemplateExercisePatch {
  exerciseName?: string;
  restSeconds?: number | null;
}

export interface TemplateSetInput {
  reps: number;
  weight: number;
}

export interface TemplateSetPatch {
  reps?: number;
  weight?: number;
}

interface TemplateRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TemplateExerciseRow {
  id: string;
  template_id: string;
  exercise_name: string;
  order_index: number;
  rest_seconds: number | null;
}

interface TemplateSetRow {
  id: string;
  template_exercise_id: string;
  order_index: number;
  reps: number;
  weight: number;
}

function toTemplateSet(row: TemplateSetRow): TemplateSet {
  return {
    id: row.id,
    templateExerciseId: row.template_exercise_id,
    order: row.order_index,
    reps: row.reps,
    weight: row.weight,
  };
}

function toTemplateExercise(row: TemplateExerciseRow, sets: TemplateSet[]): TemplateExercise {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseName: row.exercise_name,
    order: row.order_index,
    restSeconds: row.rest_seconds,
    sets,
  };
}

async function touchTemplate(db: SQLiteDatabase, templateId: string): Promise<void> {
  await db.runAsync(
    "UPDATE templates SET updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    templateId,
  );
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; name: string; exercise_count: number }>(
    `SELECT t.id, t.name, COUNT(te.id) AS exercise_count
     FROM templates t
     LEFT JOIN template_exercises te ON te.template_id = t.id
     GROUP BY t.id
     ORDER BY t.updated_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    exerciseCount: row.exercise_count,
  }));
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | null> {
  const db = await getDb();
  const templateRow = await db.getFirstAsync<TemplateRow>(
    "SELECT * FROM templates WHERE id = ?",
    id,
  );
  if (!templateRow) {
    return null;
  }
  const exerciseRows = await db.getAllAsync<TemplateExerciseRow>(
    "SELECT * FROM template_exercises WHERE template_id = ? ORDER BY order_index ASC",
    id,
  );
  const setRows = await db.getAllAsync<TemplateSetRow>(
    `SELECT ts.* FROM template_sets ts
     JOIN template_exercises te ON te.id = ts.template_exercise_id
     WHERE te.template_id = ?
     ORDER BY ts.order_index ASC`,
    id,
  );

  const setsByExercise = new Map<string, TemplateSet[]>();
  for (const setRow of setRows) {
    const set = toTemplateSet(setRow);
    const existing = setsByExercise.get(set.templateExerciseId);
    if (existing) {
      existing.push(set);
    } else {
      setsByExercise.set(set.templateExerciseId, [set]);
    }
  }

  return {
    id: templateRow.id,
    name: templateRow.name,
    createdAt: templateRow.created_at,
    updatedAt: templateRow.updated_at,
    exercises: exerciseRows.map((row) => toTemplateExercise(row, setsByExercise.get(row.id) ?? [])),
  };
}

export async function createTemplate(name: string): Promise<WorkoutTemplate> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO templates (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    id,
    name,
    now,
    now,
  );
  return { id, name, createdAt: now, updatedAt: now, exercises: [] };
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE templates SET name = ?, updated_at = ? WHERE id = ?",
    name,
    new Date().toISOString(),
    id,
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDb();
  // Sessions keep their own copy of exercise/set data and only reference the
  // template loosely (ON DELETE SET NULL), so past history is unaffected.
  await db.runAsync("DELETE FROM templates WHERE id = ?", id);
}

// New exercises start with one default set (10 reps @ 0kg) so the UI never
// shows an empty exercise — the user edits/adds from there.
const DEFAULT_FIRST_SET: TemplateSetInput = { reps: 10, weight: 0 };

export async function addTemplateExercise(
  templateId: string,
  input: NewTemplateExerciseInput,
): Promise<TemplateExercise> {
  const db = await getDb();
  const id = generateId();
  const maxOrderRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(order_index) AS max_order FROM template_exercises WHERE template_id = ?",
    templateId,
  );
  const order = (maxOrderRow?.max_order ?? -1) + 1;
  const restSeconds = input.restSeconds ?? null;

  await db.runAsync(
    `INSERT INTO template_exercises (id, template_id, exercise_name, order_index, rest_seconds)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    templateId,
    input.exerciseName,
    order,
    restSeconds,
  );
  await touchTemplate(db, templateId);

  const firstSet = await addTemplateSet(id, DEFAULT_FIRST_SET);

  return {
    id,
    templateId,
    exerciseName: input.exerciseName,
    order,
    restSeconds,
    sets: [firstSet],
  };
}

export async function updateTemplateExercise(
  id: string,
  patch: TemplateExercisePatch,
): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<TemplateExerciseRow>(
    "SELECT * FROM template_exercises WHERE id = ?",
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
    "UPDATE template_exercises SET exercise_name = ?, rest_seconds = ? WHERE id = ?",
    next.exercise_name,
    next.rest_seconds,
    id,
  );
  await touchTemplate(db, existing.template_id);
}

export async function removeTemplateExercise(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<TemplateExerciseRow>(
    "SELECT * FROM template_exercises WHERE id = ?",
    id,
  );
  if (!existing) {
    return;
  }
  await db.runAsync("DELETE FROM template_exercises WHERE id = ?", id);
  await touchTemplate(db, existing.template_id);
}

export async function reorderTemplateExercises(
  templateId: string,
  orderedExerciseIds: string[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedExerciseIds.length; i++) {
      await db.runAsync(
        "UPDATE template_exercises SET order_index = ? WHERE id = ? AND template_id = ?",
        i,
        orderedExerciseIds[i],
        templateId,
      );
    }
  });
  await touchTemplate(db, templateId);
}

async function touchTemplateForExercise(db: SQLiteDatabase, templateExerciseId: string): Promise<void> {
  const exerciseRow = await db.getFirstAsync<TemplateExerciseRow>(
    "SELECT * FROM template_exercises WHERE id = ?",
    templateExerciseId,
  );
  if (exerciseRow) {
    await touchTemplate(db, exerciseRow.template_id);
  }
}

export async function addTemplateSet(
  templateExerciseId: string,
  input: TemplateSetInput,
): Promise<TemplateSet> {
  const db = await getDb();
  const id = generateId();
  const maxOrderRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(order_index) AS max_order FROM template_sets WHERE template_exercise_id = ?",
    templateExerciseId,
  );
  const order = (maxOrderRow?.max_order ?? -1) + 1;

  await db.runAsync(
    "INSERT INTO template_sets (id, template_exercise_id, order_index, reps, weight) VALUES (?, ?, ?, ?, ?)",
    id,
    templateExerciseId,
    order,
    input.reps,
    input.weight,
  );
  await touchTemplateForExercise(db, templateExerciseId);

  return { id, templateExerciseId, order, reps: input.reps, weight: input.weight };
}

export async function updateTemplateSet(id: string, patch: TemplateSetPatch): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<TemplateSetRow>(
    "SELECT * FROM template_sets WHERE id = ?",
    id,
  );
  if (!existing) {
    return;
  }
  const next = {
    reps: patch.reps ?? existing.reps,
    weight: patch.weight ?? existing.weight,
  };
  await db.runAsync(
    "UPDATE template_sets SET reps = ?, weight = ? WHERE id = ?",
    next.reps,
    next.weight,
    id,
  );
  await touchTemplateForExercise(db, existing.template_exercise_id);
}

export async function removeTemplateSet(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<TemplateSetRow>(
    "SELECT * FROM template_sets WHERE id = ?",
    id,
  );
  if (!existing) {
    return;
  }
  await db.runAsync("DELETE FROM template_sets WHERE id = ?", id);
  await touchTemplateForExercise(db, existing.template_exercise_id);
}
