export interface WorkoutTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  exercises: TemplateExercise[];
}

export interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseName: string;
  order: number;
  restSeconds: number | null;
  /** Substitution group this slot is defined by, if any — see ExerciseGroup. */
  exerciseGroupId: string | null;
  sets: TemplateSet[];
}

export interface TemplateSet {
  id: string;
  templateExerciseId: string;
  order: number;
  reps: number;
  weight: number;
}

export interface WorkoutSession {
  id: string;
  name: string;
  templateId: string | null;
  startedAt: string;
  completedAt: string | null;
  /** Gym/location this session was logged at, if set — see Location. */
  locationId: string | null;
  exercises: LoggedExercise[];
}

export interface LoggedExercise {
  id: string;
  sessionId: string;
  exerciseName: string;
  order: number;
  restSeconds: number | null;
  /** Substitution group this exercise belongs to, if any (inherited from the template at session start). */
  exerciseGroupId: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  order: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface Location {
  id: string;
  name: string;
  createdAt: string;
}

export interface ExerciseGroup {
  id: string;
  name: string;
  createdAt: string;
  /** Interchangeable exercises, e.g. Barbell Bench Press / Dumbbell Bench Press / Machine Chest Press. */
  members: ExerciseGroupMember[];
}

export interface ExerciseGroupMember {
  id: string;
  groupId: string;
  exerciseName: string;
  order: number;
}
