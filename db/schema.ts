// Schema for the local SQLite database. Applied via CREATE TABLE IF NOT EXISTS,
// so it's safe to run on every app start.

export const SCHEMA_STATEMENTS = [
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
    default_sets INTEGER NOT NULL,
    default_reps INTEGER NOT NULL,
    default_weight REAL NOT NULL,
    default_rest_seconds INTEGER
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

  `CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_template_id ON sessions(template_id);`,
  `CREATE INDEX IF NOT EXISTS idx_logged_exercises_session_id ON logged_exercises(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);`,
];
