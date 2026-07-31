import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "./client";
import { generateId } from "./ids";
import type { ExerciseGroup, ExerciseGroupMember } from "../types";

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

interface ExerciseGroupMemberRow {
  id: string;
  group_id: string;
  exercise_name: string;
  order_index: number;
}

function toMember(row: ExerciseGroupMemberRow): ExerciseGroupMember {
  return { id: row.id, groupId: row.group_id, exerciseName: row.exercise_name, order: row.order_index };
}

function toGroup(row: ExerciseGroupRow, members: ExerciseGroupMember[]): ExerciseGroup {
  return { id: row.id, name: row.name, createdAt: row.created_at, members };
}

async function loadMembers(db: SQLiteDatabase, groupId: string): Promise<ExerciseGroupMember[]> {
  const rows = await db.getAllAsync<ExerciseGroupMemberRow>(
    "SELECT * FROM exercise_group_members WHERE group_id = ? ORDER BY order_index ASC",
    groupId,
  );
  return rows.map(toMember);
}

export async function listExerciseGroups(): Promise<ExerciseGroup[]> {
  const db = await getDb();
  const groupRows = await db.getAllAsync<ExerciseGroupRow>(
    "SELECT * FROM exercise_groups ORDER BY name ASC",
  );
  const memberRows = await db.getAllAsync<ExerciseGroupMemberRow>(
    "SELECT * FROM exercise_group_members ORDER BY order_index ASC",
  );
  const membersByGroup = new Map<string, ExerciseGroupMember[]>();
  for (const memberRow of memberRows) {
    const member = toMember(memberRow);
    const existing = membersByGroup.get(member.groupId);
    if (existing) {
      existing.push(member);
    } else {
      membersByGroup.set(member.groupId, [member]);
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
  return toGroup(row, await loadMembers(db, id));
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
  // Templates/logged exercises reference groups loosely (ON DELETE SET
  // NULL), so they just lose their substitution link, keeping their
  // current exercise name as plain text.
  await db.runAsync("DELETE FROM exercise_groups WHERE id = ?", id);
}

export async function addExerciseGroupMember(
  groupId: string,
  exerciseName: string,
): Promise<ExerciseGroupMember> {
  const db = await getDb();
  const id = generateId();
  const maxOrderRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(order_index) AS max_order FROM exercise_group_members WHERE group_id = ?",
    groupId,
  );
  const order = (maxOrderRow?.max_order ?? -1) + 1;
  await db.runAsync(
    "INSERT INTO exercise_group_members (id, group_id, exercise_name, order_index) VALUES (?, ?, ?, ?)",
    id,
    groupId,
    exerciseName,
    order,
  );
  return { id, groupId, exerciseName, order };
}

export async function removeExerciseGroupMember(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM exercise_group_members WHERE id = ?", id);
}
