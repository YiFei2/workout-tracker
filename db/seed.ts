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

export async function seedInitialData(db: SQLiteDatabase): Promise<void> {
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
        `INSERT INTO template_exercises (id, template_id, exercise_id, exercise_name, order_index, rest_seconds, exercise_group_id)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
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
