// Schema for the local SQLite database, applied via versioned migrations
// (see client.ts). Bump SCHEMA_VERSION and add a migration when this shape
// changes.

export const SCHEMA_VERSION = 3;

export const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS template_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    rest_seconds INTEGER
  );`,

  `CREATE TABLE IF NOT EXISTS template_sets (
    id TEXT PRIMARY KEY NOT NULL,
    template_exercise_id TEXT NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS logged_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    rest_seconds INTEGER
  );`,

  `CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY NOT NULL,
    exercise_id TEXT NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);`,
  `CREATE INDEX IF NOT EXISTS idx_template_sets_template_exercise_id ON template_sets(template_exercise_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_template_id ON sessions(template_id);`,
  `CREATE INDEX IF NOT EXISTS idx_logged_exercises_session_id ON logged_exercises(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);`,
];

// v2: template_exercises moved from a single (defaultSets, defaultReps,
// defaultWeight) triple to per-set defaults in template_sets, and was
// renamed defaultRestSeconds -> restSeconds. No shipped users yet, so we
// just drop and recreate rather than write a data-preserving ALTER.
export const V2_MIGRATION_STATEMENTS = [
  `DROP TABLE IF EXISTS template_sets;`,
  `DROP TABLE IF EXISTS template_exercises;`,
];

// v3: added a simple key-value `settings` table (first use: theme mode
// preference). Purely additive, so no migration statements needed — the
// CREATE TABLE IF NOT EXISTS above handles both fresh and existing DBs.
