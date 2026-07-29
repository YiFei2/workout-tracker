import type { SQLiteDatabase } from "expo-sqlite";

import type { TemplateExercise, WorkoutTemplate } from "../types";
import { getDb } from "./client";
import { generateId } from "./ids";

export interface TemplateSummary {
  id: string;
  name: string;
  exerciseCount: number;
}

export interface NewTemplateExerciseInput {
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
  defaultRestSeconds?: number | null;
}

export interface TemplateExercisePatch {
  exerciseName?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  defaultRestSeconds?: number | null;
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
  default_sets: number;
  default_reps: number;
  default_weight: number;
  default_rest_seconds: number | null;
}

function toTemplateExercise(row: TemplateExerciseRow): TemplateExercise {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseName: row.exercise_name,
    order: row.order_index,
    defaultSets: row.default_sets,
    defaultReps: row.default_reps,
    defaultWeight: row.default_weight,
    defaultRestSeconds: row.default_rest_seconds,
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
  return {
    id: templateRow.id,
    name: templateRow.name,
    createdAt: templateRow.created_at,
    updatedAt: templateRow.updated_at,
    exercises: exerciseRows.map(toTemplateExercise),
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
  const defaultRestSeconds = input.defaultRestSeconds ?? null;

  await db.runAsync(
    `INSERT INTO template_exercises
      (id, template_id, exercise_name, order_index, default_sets, default_reps, default_weight, default_rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    templateId,
    input.exerciseName,
    order,
    input.defaultSets,
    input.defaultReps,
    input.defaultWeight,
    defaultRestSeconds,
  );
  await touchTemplate(db, templateId);

  return {
    id,
    templateId,
    exerciseName: input.exerciseName,
    order,
    defaultSets: input.defaultSets,
    defaultReps: input.defaultReps,
    defaultWeight: input.defaultWeight,
    defaultRestSeconds,
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
    default_sets: patch.defaultSets ?? existing.default_sets,
    default_reps: patch.defaultReps ?? existing.default_reps,
    default_weight: patch.defaultWeight ?? existing.default_weight,
    default_rest_seconds:
      patch.defaultRestSeconds !== undefined
        ? patch.defaultRestSeconds
        : existing.default_rest_seconds,
  };

  await db.runAsync(
    `UPDATE template_exercises
     SET exercise_name = ?, default_sets = ?, default_reps = ?, default_weight = ?, default_rest_seconds = ?
     WHERE id = ?`,
    next.exercise_name,
    next.default_sets,
    next.default_reps,
    next.default_weight,
    next.default_rest_seconds,
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
