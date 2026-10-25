import { getDb } from "./client";
import { generateId } from "./ids";
import type { PointsTransaction, PointsTransactionType } from "../types";

interface PointsTransactionRow {
  id: string;
  amount: number;
  type: string;
  note: string | null;
  task_id: string | null;
  task_name: string | null;
  reward_id: string | null;
  reward_name: string | null;
  reward_cost: number | null;
  created_at: string;
}

function toTransaction(row: PointsTransactionRow): PointsTransaction {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type as PointsTransactionType,
    note: row.note,
    taskId: row.task_id,
    taskName: row.task_name,
    rewardId: row.reward_id,
    rewardName: row.reward_name,
    rewardCost: row.reward_cost,
    createdAt: row.created_at,
  };
}

/** Current balance = sum of every ledger row (0 when empty). */
export async function getBalance(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ balance: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS balance FROM points_transactions",
  );
  return row?.balance ?? 0;
}

/** Full ledger, most recent first. */
export async function listTransactions(): Promise<PointsTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PointsTransactionRow>(
    "SELECT * FROM points_transactions ORDER BY created_at DESC, id DESC",
  );
  return rows.map(toTransaction);
}

/**
 * Add a manual adjustment. A positive amount credits, a negative amount
 * debits/corrects — manual debits may drive the balance negative (only
 * redemptions are guarded against overdraw; see redeemReward).
 */
export async function addManualTransaction(
  amount: number,
  note: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO points_transactions (id, amount, type, note, created_at)
     VALUES (?, ?, 'manual', ?, ?)`,
    generateId(),
    amount,
    note && note.trim() ? note.trim() : null,
    new Date().toISOString(),
  );
}

/**
 * Delete a ledger row, reversing its effect on the balance. Deleting a 'task'
 * row is the Points-history path of "undo a completion": because a one-off's
 * done-state is derived from the presence of its 'task' row, removing the row
 * flips that task back to active automatically.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM points_transactions WHERE id = ?", id);
}
