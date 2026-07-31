// Schema for the local SQLite database, applied via versioned migrations
// (see client.ts). Bump SCHEMA_VERSION and add a migration when this shape
// changes.

export const SCHEMA_VERSION = 4;

export const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS exercise_groups (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS exercise_group_members (
    id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT NOT NULL REFERENCES exercise_groups(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    order_index INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS template_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    rest_seconds INTEGER,
    exercise_group_id TEXT REFERENCES exercise_groups(id) ON DELETE SET NULL
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
    completed_at TEXT,
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL
  );`,

  `CREATE TABLE IF NOT EXISTS logged_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    rest_seconds INTEGER,
    exercise_group_id TEXT REFERENCES exercise_groups(id) ON DELETE SET NULL
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
  `CREATE INDEX IF NOT EXISTS idx_exercise_group_members_group_id ON exercise_group_members(group_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_location_id ON sessions(location_id);`,
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

// v4: added locations + exercise_groups/exercise_group_members, plus a
// nullable location_id on sessions and nullable exercise_group_id on
// template_exercises/logged_exercises. Unlike v2, these upgrades carry real
// on-device workout history the user wants to keep, so we ALTER existing
// tables in place instead of dropping them. Fresh installs get these
// columns for free from CREATE_TABLE_STATEMENTS above (which already
// includes them), so these statements only need to run when upgrading an
// existing (currentVersion > 0) database — see client.ts.
export const V4_MIGRATION_STATEMENTS = [
  `ALTER TABLE sessions ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL;`,
  `ALTER TABLE template_exercises ADD COLUMN exercise_group_id TEXT REFERENCES exercise_groups(id) ON DELETE SET NULL;`,
  `ALTER TABLE logged_exercises ADD COLUMN exercise_group_id TEXT REFERENCES exercise_groups(id) ON DELETE SET NULL;`,
];
