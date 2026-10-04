import { getDb } from "./client";
import { generateId } from "./ids";
import type { Exercise, ExerciseGroup } from "../types";

export interface ExerciseGroupSummary {
  id: string;
  name: string;
  memberCount: number;
}

interface ExerciseGroupRow {
  id: string;
  name: string;
  created_at: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  created_at: string;
  group_id: string | null;
}

function toExercise(row: ExerciseRow): Exercise {
  return { id: row.id, name: row.name, createdAt: row.created_at, groupId: row.group_id };
}

function toGroup(row: ExerciseGroupRow, members: Exercise[]): ExerciseGroup {
  return { id: row.id, name: row.name, createdAt: row.created_at, members };
}

export async function listExerciseGroups(): Promise<ExerciseGroup[]> {
  const db = await getDb();
  const groupRows = await db.getAllAsync<ExerciseGroupRow>(
    "SELECT * FROM exercise_groups ORDER BY name ASC",
  );
  const memberRows = await db.getAllAsync<ExerciseRow>(
    "SELECT * FROM exercises WHERE group_id IS NOT NULL ORDER BY name ASC",
  );
  const membersByGroup = new Map<string, Exercise[]>();
  for (const memberRow of memberRows) {
    const member = toExercise(memberRow);
    const groupId = memberRow.group_id as string;
    const existing = membersByGroup.get(groupId);
    if (existing) {
      existing.push(member);
    } else {
      membersByGroup.set(groupId, [member]);
    }
  }
  return groupRows.map((row) => toGroup(row, membersByGroup.get(row.id) ?? []));
}

export async function getExerciseGroup(id: string): Promise<ExerciseGroup | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExerciseGroupRow>(
    "SELECT * FROM exercise_groups WHERE id = ?",
    id,
  );
  if (!row) {
    return null;
  }
  const memberRows = await db.getAllAsync<ExerciseRow>(
    "SELECT * FROM exercises WHERE group_id = ? ORDER BY name ASC",
    id,
  );
  return toGroup(row, memberRows.map(toExercise));
}

export async function createExerciseGroup(name: string): Promise<ExerciseGroup> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO exercise_groups (id, name, created_at) VALUES (?, ?, ?)",
    id,
    name,
    now,
  );
  return { id, name, createdAt: now, members: [] };
}

export async function renameExerciseGroup(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE exercise_groups SET name = ? WHERE id = ?", name, id);
}

export async function deleteExerciseGroup(id: string): Promise<void> {
  const db = await getDb();
  // Exercises keep their own identity; deleting the group just clears their
  // link (ON DELETE SET NULL on exercises.group_id).
  await db.runAsync("DELETE FROM exercise_groups WHERE id = ?", id);
}

// Sets (or clears, if groupId is null) the substitution group an exercise
// belongs to. An exercise belongs to at most one group, so assigning a new
// one silently moves it out of whichever group it was in before.
export async function setExerciseGroup(exerciseId: string, groupId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE exercises SET group_id = ? WHERE id = ?", groupId, exerciseId);
}
