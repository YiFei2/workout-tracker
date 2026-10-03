import * as SQLite from "expo-sqlite";

import {
  CREATE_TABLE_STATEMENTS,
  SCHEMA_VERSION,
  V2_MIGRATION_STATEMENTS,
  V4_INDEX_STATEMENTS,
  V4_MIGRATION_STATEMENTS,
} from "./schema";

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

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 2) {
    for (const statement of V2_MIGRATION_STATEMENTS) {
      await db.execAsync(statement);
    }
  }

  for (const statement of CREATE_TABLE_STATEMENTS) {
    await db.execAsync(statement);
  }

  // Check actual column presence rather than gating on currentVersion < 4:
  // some devices already have user_version bumped to 4 from an earlier dev
  // build that predates these columns, which would make a version check
  // wrongly skip the ALTERs below.
  if (!(await columnExists(db, "sessions", "location_id"))) {
    await db.execAsync(V4_MIGRATION_STATEMENTS[0]);
  }
  if (!(await columnExists(db, "template_exercises", "exercise_group_id"))) {
    await db.execAsync(V4_MIGRATION_STATEMENTS[1]);
  }
  if (!(await columnExists(db, "logged_exercises", "exercise_group_id"))) {
    await db.execAsync(V4_MIGRATION_STATEMENTS[2]);
  }

  for (const statement of V4_INDEX_STATEMENTS) {
    await db.execAsync(statement);
  }

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
