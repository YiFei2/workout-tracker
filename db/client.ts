import * as SQLite from "expo-sqlite";

import {
  CREATE_TABLE_STATEMENTS,
  SCHEMA_VERSION,
  V2_MIGRATION_STATEMENTS,
  V4_MIGRATION_STATEMENTS,
} from "./schema";

const DB_NAME = "workout-tracker.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

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

  // Fresh installs (currentVersion === 0) already get the v4 columns from
  // CREATE_TABLE_STATEMENTS above; only pre-existing DBs need the ALTERs,
  // and only after the tables they target are guaranteed to exist.
  if (currentVersion > 0 && currentVersion < 4) {
    for (const statement of V4_MIGRATION_STATEMENTS) {
      await db.execAsync(statement);
    }
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
