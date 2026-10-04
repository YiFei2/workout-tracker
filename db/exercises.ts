import { getDb } from "./client";
import { generateId } from "./ids";
import type { Exercise } from "../types";

interface ExerciseRow {
  id: string;
  name: string;
  created_at: string;
  group_id: string | null;
}

function toExercise(row: ExerciseRow): Exercise {
  return { id: row.id, name: row.name, createdAt: row.created_at, groupId: row.group_id };
}

export async function listExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExerciseRow>("SELECT * FROM exercises ORDER BY name ASC");
  return rows.map(toExercise);
}

export async function findExerciseByName(name: string): Promise<Exercise | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExerciseRow>(
    "SELECT * FROM exercises WHERE LOWER(name) = LOWER(?)",
    name.trim(),
  );
  return row ? toExercise(row) : null;
}

// Find-or-create: reusing an existing case-insensitive name match avoids the
// library accumulating near-duplicates (e.g. "DB Bench" vs "Db Bench") when
// users add exercises inline from the picker.
export async function createExercise(name: string): Promise<Exercise> {
  const trimmed = name.trim();
  const existing = await findExerciseByName(trimmed);
  if (existing) {
    return existing;
  }
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO exercises (id, name, created_at) VALUES (?, ?, ?)",
    id,
    trimmed,
    now,
  );
  return { id, name: trimmed, createdAt: now, groupId: null };
}

export async function renameExercise(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE exercises SET name = ? WHERE id = ?", name.trim(), id);
}
