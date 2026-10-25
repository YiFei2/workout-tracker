import { getDb } from "./client";
import { generateId } from "./ids";
import { getBalance } from "./points";
import type { Reward } from "../types";

interface RewardRow {
  id: string;
  name: string;
  cost: number;
  created_at: string;
  updated_at: string;
}

function toReward(row: RewardRow): Reward {
  return {
    id: row.id,
    name: row.name,
    cost: row.cost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRewards(): Promise<Reward[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RewardRow>(
    "SELECT * FROM rewards ORDER BY created_at ASC, id ASC",
  );
  return rows.map(toReward);
}

export async function createReward(name: string, cost: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO rewards (id, name, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    generateId(),
    name,
    cost,
    now,
    now,
  );
}

export type RewardPatch = Partial<Pick<Reward, "name" | "cost">>;

export async function updateReward(id: string, patch: RewardPatch): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.cost !== undefined) {
    fields.push("cost = ?");
    values.push(patch.cost);
  }
  if (fields.length === 0) {
    return;
  }
  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);
  await db.runAsync(`UPDATE rewards SET ${fields.join(", ")} WHERE id = ?`, ...values);
}

export async function deleteReward(id: string): Promise<void> {
  const db = await getDb();
  // points_transactions.reward_id is ON DELETE SET NULL, so past redemptions
  // survive in the ledger via their reward_name/reward_cost snapshot.
  await db.runAsync("DELETE FROM rewards WHERE id = ?", id);
}

export class InsufficientPointsError extends Error {
  constructor() {
    super("Not enough points to redeem this reward.");
    this.name = "InsufficientPointsError";
  }
}

/**
 * Redeem a reward: writes a 'redemption' debit (amount = -cost) snapshotting
 * the reward's name + cost. Rejected if it would overdraw the balance below
 * zero (you can't spend points you don't have) — unlike a clawback/manual
 * debit, a redemption never drives the balance negative.
 */
export async function redeemReward(id: string): Promise<void> {
  const db = await getDb();
  const reward = await db.getFirstAsync<RewardRow>("SELECT * FROM rewards WHERE id = ?", id);
  if (!reward) {
    return;
  }
  const balance = await getBalance();
  if (balance < reward.cost) {
    throw new InsufficientPointsError();
  }
  await db.runAsync(
    `INSERT INTO points_transactions (id, amount, type, reward_id, reward_name, reward_cost, created_at)
     VALUES (?, ?, 'redemption', ?, ?, ?, ?)`,
    generateId(),
    -reward.cost,
    reward.id,
    reward.name,
    reward.cost,
    new Date().toISOString(),
  );
}
