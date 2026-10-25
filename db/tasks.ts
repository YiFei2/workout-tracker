import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "./client";
import { generateId } from "./ids";
import type { Task, TaskKind, TaskLinkType } from "../types";

interface TaskRow {
  id: string;
  name: string;
  points: number;
  kind: string;
  link_type: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  completion_count: number;
  last_completion_id: string | null;
}

function toTask(row: TaskRow): Task {
  const completionCount = row.completion_count ?? 0;
  const kind = row.kind as TaskKind;
  return {
    id: row.id,
    name: row.name,
    points: row.points,
    kind,
    linkType: (row.link_type as TaskLinkType | null) ?? null,
    order: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completionCount,
    done: kind === "oneoff" && completionCount > 0,
    lastCompletionId: row.last_completion_id,
  };
}

const LIST_SELECT = `
  SELECT t.*,
    (SELECT COUNT(*) FROM points_transactions p
       WHERE p.task_id = t.id AND p.type = 'task') AS completion_count,
    (SELECT p.id FROM points_transactions p
       WHERE p.task_id = t.id AND p.type = 'task'
       ORDER BY p.created_at DESC, p.id DESC LIMIT 1) AS last_completion_id
  FROM tasks t
`;

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    `${LIST_SELECT} ORDER BY t.order_index ASC, t.created_at ASC`,
  );
  return rows.map(toTask);
}

export interface NewTaskInput {
  name: string;
  points: number;
  kind: TaskKind;
  linkType: TaskLinkType | null;
}

export async function createTask(input: NewTaskInput): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const orderRow = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM tasks",
  );
  await db.runAsync(
    `INSERT INTO tasks (id, name, points, kind, link_type, order_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    generateId(),
    input.name,
    input.points,
    input.kind,
    input.linkType,
    orderRow?.next ?? 0,
    now,
    now,
  );
}

export type TaskPatch = Partial<Pick<Task, "name" | "points" | "kind" | "linkType">>;

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.points !== undefined) {
    fields.push("points = ?");
    values.push(patch.points);
  }
  if (patch.kind !== undefined) {
    fields.push("kind = ?");
    values.push(patch.kind);
  }
  if (patch.linkType !== undefined) {
    fields.push("link_type = ?");
    values.push(patch.linkType);
  }
  if (fields.length === 0) {
    return;
  }
  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);
  await db.runAsync(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, ...values);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  // points_transactions.task_id is ON DELETE SET NULL, so past completions
  // survive in the ledger via their task_name snapshot.
  await db.runAsync("DELETE FROM tasks WHERE id = ?", id);
}

async function countCompletions(db: SQLiteDatabase, taskId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM points_transactions WHERE task_id = ? AND type = 'task'",
    taskId,
  );
  return row?.count ?? 0;
}

async function insertCompletion(
  db: SQLiteDatabase,
  task: { id: string; name: string; points: number },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO points_transactions (id, amount, type, task_id, task_name, created_at)
     VALUES (?, ?, 'task', ?, ?, ?)`,
    generateId(),
    task.points,
    task.id,
    task.name,
    new Date().toISOString(),
  );
}

/**
 * Complete a task by hand: writes a 'task' credit snapshotting the task's
 * name + points. A one-off that is already done is a no-op (re-completing
 * does nothing until undone).
 */
export async function completeTask(id: string): Promise<void> {
  const db = await getDb();
  const task = await db.getFirstAsync<TaskRow>("SELECT * FROM tasks WHERE id = ?", id);
  if (!task) {
    return;
  }
  if (task.kind === "oneoff" && (await countCompletions(db, id)) > 0) {
    return;
  }
  await insertCompletion(db, task);
}

/** Undo the most recent completion of a task (removes its latest 'task' row). */
export async function undoLastTaskCompletion(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM points_transactions
     WHERE id = (
       SELECT id FROM points_transactions
       WHERE task_id = ? AND type = 'task'
       ORDER BY created_at DESC, id DESC LIMIT 1
     )`,
    id,
  );
}

export interface FiredTaskCredit {
  taskName: string;
  points: number;
}

/**
 * Auto-complete every currently-completable 'workout'-linked task — called
 * when a WorkoutSession is completed. Repeatable tasks fire once per call
 * (one credit per session); an already-done one-off is skipped. Returns what
 * fired so the caller can surface the earned points.
 */
export async function completeWorkoutLinkedTasks(): Promise<FiredTaskCredit[]> {
  const db = await getDb();
  const tasks = await db.getAllAsync<TaskRow>(
    "SELECT * FROM tasks WHERE link_type = 'workout'",
  );
  const fired: FiredTaskCredit[] = [];
  for (const task of tasks) {
    if (task.kind === "oneoff" && (await countCompletions(db, task.id)) > 0) {
      continue;
    }
    await insertCompletion(db, task);
    fired.push({ taskName: task.name, points: task.points });
  }
  return fired;
}
