import { getDb } from "./client";
import { generateId } from "./ids";
import type { Location } from "../types";

interface LocationRow {
  id: string;
  name: string;
  created_at: string;
}

function toLocation(row: LocationRow): Location {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function listLocations(): Promise<Location[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocationRow>("SELECT * FROM locations ORDER BY name ASC");
  return rows.map(toLocation);
}

export async function createLocation(name: string): Promise<Location> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO locations (id, name, created_at) VALUES (?, ?, ?)",
    id,
    name,
    now,
  );
  return { id, name, createdAt: now };
}

export async function renameLocation(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE locations SET name = ? WHERE id = ?", name, id);
}

export async function deleteLocation(id: string): Promise<void> {
  const db = await getDb();
  // Sessions reference locations loosely (ON DELETE SET NULL), so past
  // history is unaffected — it just loses its location tag.
  await db.runAsync("DELETE FROM locations WHERE id = ?", id);
}
