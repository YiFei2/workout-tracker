// Initial exercise library + a few sample templates, inserted once when the
// `exercises` table is empty (fresh install, or right after the v6 wipe).
// Templates follow a standard push/pull/legs + full-body split — common
// beginner-friendly structures (see https://www.aworkoutroutine.com/push-pull-legs-split/
// and https://www.muscleandstrength.com/workouts/3-day-PPL-workout-for-beginners).
import type { SQLiteDatabase } from "expo-sqlite";

import { generateId } from "./ids";

const SEED_EXERCISE_NAMES = [
  // Chest
  "Barbell Bench Press",
  "Incline Dumbbell Press",
  "Dumbbell Flyes",
  "Push-Up",
  "Chest Press Machine",
  // Back
  "Deadlift",
  "Barbell Row",
  "Lat Pulldown",
  "Seated Cable Row",
  "Pull-Up",
  "Face Pull",
  // Shoulders
  "Overhead Press",
  "Dumbbell Shoulder Press",
  "Dumbbell Lateral Raise",
  "Rear Delt Fly",
  // Arms
  "Barbell Curl",
  "Dumbbell Curl",
  "Hammer Curl",
  "Tricep Pushdown",
  "Skull Crushers",
  "Tricep Dips",
  // Legs
  "Back Squat",
  "Front Squat",
  "Romanian Deadlift",
  "Leg Press",
  "Leg Extension",
  "Leg Curl",
  "Walking Lunge",
  "Calf Raise",
  "Hip Thrust",
  // Core
  "Plank",
  "Hanging Leg Raise",
  "Cable Crunch",
  "Russian Twist",
];

interface SeedTemplateExercise {
  exerciseName: string;
  restSeconds: number;
}

interface SeedTemplate {
  name: string;
  exercises: SeedTemplateExercise[];
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: "Push Day",
    exercises: [
      { exerciseName: "Barbell Bench Press", restSeconds: 120 },
      { exerciseName: "Incline Dumbbell Press", restSeconds: 90 },
      { exerciseName: "Overhead Press", restSeconds: 90 },
      { exerciseName: "Dumbbell Lateral Raise", restSeconds: 60 },
      { exerciseName: "Tricep Pushdown", restSeconds: 60 },
    ],
  },
  {
    name: "Pull Day",
    exercises: [
      { exerciseName: "Deadlift", restSeconds: 150 },
      { exerciseName: "Barbell Row", restSeconds: 90 },
      { exerciseName: "Lat Pulldown", restSeconds: 90 },
      { exerciseName: "Seated Cable Row", restSeconds: 60 },
      { exerciseName: "Barbell Curl", restSeconds: 60 },
      { exerciseName: "Face Pull", restSeconds: 60 },
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      { exerciseName: "Back Squat", restSeconds: 150 },
      { exerciseName: "Romanian Deadlift", restSeconds: 90 },
      { exerciseName: "Leg Press", restSeconds: 90 },
      { exerciseName: "Leg Curl", restSeconds: 60 },
      { exerciseName: "Walking Lunge", restSeconds: 60 },
      { exerciseName: "Calf Raise", restSeconds: 45 },
    ],
  },
  {
    name: "Full Body",
    exercises: [
      { exerciseName: "Back Squat", restSeconds: 120 },
      { exerciseName: "Barbell Bench Press", restSeconds: 120 },
      { exerciseName: "Barbell Row", restSeconds: 90 },
      { exerciseName: "Overhead Press", restSeconds: 90 },
      { exerciseName: "Plank", restSeconds: 45 },
    ],
  },
];

// Rewards-module starter content (v8). Seeded so the Tasks and Store surfaces
// aren't blank on first open and the workout↔task link is demonstrated out of
// the box. Freely editable/deletable, like the seeded exercises/templates.
interface SeedTask {
  name: string;
  points: number;
  kind: "oneoff" | "repeatable";
  linkType: "workout" | null;
}

const SEED_TASKS: SeedTask[] = [
  { name: "Go to gym", points: 20, kind: "repeatable", linkType: "workout" },
  { name: "Read for 30 minutes", points: 10, kind: "repeatable", linkType: null },
];

const SEED_REWARDS: { name: string; cost: number }[] = [
  { name: "1 episode of a show", cost: 50 },
];

export async function seedInitialData(db: SQLiteDatabase): Promise<void> {
  await seedExercisesAndTemplates(db);
  await seedRewardsModule(db);
}

// Gated independently of the exercise library so an existing install (whose
// exercises table is already populated) still picks these up on first upgrade
// to v8. Also gated on a one-time `rewards_seeded` flag (not just empty tables)
// so a user who deletes all their starter tasks/rewards doesn't have them
// resurrected on the next cold start — migrate() runs seeding every launch.
// The per-table COUNT guards remain so a pre-flag v8 install that already seeded
// via COUNT isn't duplicated before the flag gets set. Uses the passed `db`
// directly rather than db/settings' getSetting (which awaits getDb() — the same
// promise we're resolving inside migrate — and would deadlock).
async function seedRewardsModule(db: SQLiteDatabase): Promise<void> {
  const seededFlag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'rewards_seeded'",
  );
  if (seededFlag) {
    return;
  }

  const now = new Date().toISOString();

  const taskCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM tasks",
  );
  if ((taskCount?.count ?? 0) === 0) {
    for (let i = 0; i < SEED_TASKS.length; i++) {
      const { name, points, kind, linkType } = SEED_TASKS[i];
      await db.runAsync(
        `INSERT INTO tasks (id, name, points, kind, link_type, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        generateId(),
        name,
        points,
        kind,
        linkType,
        i,
        now,
        now,
      );
    }
  }

  const rewardCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM rewards",
  );
  if ((rewardCount?.count ?? 0) === 0) {
    for (const { name, cost } of SEED_REWARDS) {
      await db.runAsync(
        "INSERT INTO rewards (id, name, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        generateId(),
        name,
        cost,
        now,
        now,
      );
    }
  }

  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('rewards_seeded', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
}

async function seedExercisesAndTemplates(db: SQLiteDatabase): Promise<void> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM exercises",
  );
  if ((countRow?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const exerciseIdByName = new Map<string, string>();
  for (const name of SEED_EXERCISE_NAMES) {
    const id = generateId();
    exerciseIdByName.set(name, id);
    await db.runAsync(
      "INSERT INTO exercises (id, name, created_at) VALUES (?, ?, ?)",
      id,
      name,
      now,
    );
  }

  for (const template of SEED_TEMPLATES) {
    const templateId = generateId();
    await db.runAsync(
      "INSERT INTO templates (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      templateId,
      template.name,
      now,
      now,
    );
    for (let i = 0; i < template.exercises.length; i++) {
      const { exerciseName, restSeconds } = template.exercises[i];
      const exerciseId = exerciseIdByName.get(exerciseName);
      if (!exerciseId) {
        throw new Error(`Seed template "${template.name}" references unknown exercise "${exerciseName}"`);
      }
      await db.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, exercise_name, order_index, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        generateId(),
        templateId,
        exerciseId,
        exerciseName,
        i,
        restSeconds,
      );
    }
  }
}
