import * as SQLite from "expo-sqlite";

import {
  CREATE_TABLE_STATEMENTS,
  SCHEMA_VERSION,
  V2_MIGRATION_STATEMENTS,
  V4_INDEX_STATEMENTS,
  V4_MIGRATION_STATEMENTS,
  V5_MIGRATION_STATEMENTS,
  V6_MIGRATION_STATEMENTS,
  V7_INDEX_STATEMENTS,
  V7_MIGRATION_STATEMENTS,
} from "./schema";
import { seedInitialData } from "./seed";

const DB_NAME = "workout-tracker.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function columnExists(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  return rows.some((row) => row.name === column);
}

async function tableExists(db: SQLite.SQLiteDatabase, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;",
    table,
  );
  return row !== null;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 2) {
    for (const statement of V2_MIGRATION_STATEMENTS) {
      await db.execAsync(statement);
    }
  }

  if (currentVersion < 5) {
    for (const statement of V5_MIGRATION_STATEMENTS) {
      await db.execAsync(statement);
    }
  }

  if (currentVersion < 6) {
    for (const statement of V6_MIGRATION_STATEMENTS) {
      await db.execAsync(statement);
    }
  }

  for (const statement of CREATE_TABLE_STATEMENTS) {
    await db.execAsync(statement);
  }

  // Check actual column presence rather than gating on currentVersion < 4:
  // some devices already have user_version bumped to 4 from an earlier dev
  // build that predates these columns, which would make a version check
  // wrongly skip the ALTER below.
  if (!(await columnExists(db, "sessions", "location_id"))) {
    await db.execAsync(V4_MIGRATION_STATEMENTS[0]);
  }

  for (const statement of V4_INDEX_STATEMENTS) {
    await db.execAsync(statement);
  }

  // v7: same column/table-presence guarding as v4 above, for the same
  // reason. Order matters: exercises.group_id must exist before the
  // backfill UPDATE in V7_MIGRATION_STATEMENTS reads/writes it, and the
  // join table must still exist when that backfill runs.
  if (!(await columnExists(db, "exercises", "group_id"))) {
    await db.execAsync(
      "ALTER TABLE exercises ADD COLUMN group_id TEXT REFERENCES exercise_groups(id) ON DELETE SET NULL;",
    );
  }
  if (await tableExists(db, "exercise_group_members")) {
    for (const statement of V7_MIGRATION_STATEMENTS) {
      await db.execAsync(statement);
    }
  }
  if (await columnExists(db, "template_exercises", "exercise_group_id")) {
    await db.execAsync("ALTER TABLE template_exercises DROP COLUMN exercise_group_id;");
  }
  if (await columnExists(db, "logged_exercises", "exercise_group_id")) {
    await db.execAsync("ALTER TABLE logged_exercises DROP COLUMN exercise_group_id;");
  }
  for (const statement of V7_INDEX_STATEMENTS) {
    await db.execAsync(statement);
  }

  await seedInitialData(db);

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
