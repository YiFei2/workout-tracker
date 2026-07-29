import * as SQLite from "expo-sqlite";

import { SCHEMA_STATEMENTS } from "./schema";

const DB_NAME = "workout-tracker.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
  }
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
