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
  /** The library Exercise this slot points at — see Exercise. */
  exerciseId: string;
  /** Snapshot of Exercise.name at the time it was picked; doesn't change retroactively if the exercise is later renamed. */
  exerciseName: string;
  order: number;
  restSeconds: number | null;
  /** Exercise.groupId of the current exerciseId, resolved live via join — not stored on this row. */
  exerciseGroupId: string | null;
}

export interface WorkoutSession {
  id: string;
  name: string;
  templateId: string | null;
  startedAt: string;
  completedAt: string | null;
  /**
   * Gym/location this session was logged at — required by the app whenever a
   * new session is started (see db/sessions.ts startBlankSession /
   * startSessionFromTemplate), since it drives per-location weight/reps
   * suggestions. Stays nullable here because deleting a Location clears the
   * tag on any session that referenced it (ON DELETE SET NULL) while
   * preserving the rest of that session's logged data.
   */
  locationId: string | null;
  exercises: LoggedExercise[];
}

export interface LoggedExercise {
  id: string;
  sessionId: string;
  /** The library Exercise this log entry points at — see Exercise. */
  exerciseId: string;
  /** Snapshot of Exercise.name at the time it was picked/swapped; doesn't change retroactively if the exercise is later renamed. */
  exerciseName: string;
  order: number;
  restSeconds: number | null;
  /** Exercise.groupId of the current exerciseId, resolved live via join — not stored on this row. */
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
  /** Interchangeable exercises, e.g. Barbell Bench Press / Dumbbell Bench Press / Machine Chest Press — sorted by name. */
  members: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  createdAt: string;
  /** Substitution group this exercise belongs to, if any. An exercise belongs to at most one group. */
  groupId: string | null;
}
