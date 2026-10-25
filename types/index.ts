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

// --- Rewards module: the shared points economy ---

/** A one-off task completes once; a repeatable task credits points every time. */
export type TaskKind = "oneoff" | "repeatable";

/**
 * The module whose own completion auto-completes a linked task. Only
 * 'workout' in v1; the field shape doesn't change as future modules add
 * values. Null = a plain, manual-only task.
 */
export type TaskLinkType = "workout";

export interface Task {
  id: string;
  name: string;
  /** Positive points awarded per completion. */
  points: number;
  kind: TaskKind;
  linkType: TaskLinkType | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  /** How many times this task has been completed (count of its 'task' ledger rows). */
  completionCount: number;
  /**
   * Whether the task is currently "done" and not re-completable: true only
   * for a one-off that already has a completion. A repeatable task is always
   * completable, so this stays false.
   */
  done: boolean;
  /** Most recent completion transaction id, if any — the target of "undo last". */
  lastCompletionId: string | null;
  /**
   * Snapshot amount of the most recent completion (may differ from `points`
   * if the task was re-priced after completing). Used so the undo-clawback
   * confirmation states the points actually being removed, not the live value.
   */
  lastCompletionAmount: number | null;
}

export interface Reward {
  id: string;
  name: string;
  /** Positive points cost to redeem. */
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export type PointsTransactionType = "manual" | "task" | "redemption";

export interface PointsTransaction {
  id: string;
  /** Signed: positive = credit (earned), negative = debit (spent / clawed back). */
  amount: number;
  type: PointsTransactionType;
  /** Free-text note for manual adjustments. */
  note: string | null;
  /** Set on 'task' rows; may dangle (SET NULL) if the task is later deleted. */
  taskId: string | null;
  /** Snapshot of the task name at completion time. */
  taskName: string | null;
  /** Set on 'redemption' rows; may dangle (SET NULL) if the reward is later deleted. */
  rewardId: string | null;
  /** Snapshot of the reward name/cost at redemption time. */
  rewardName: string | null;
  rewardCost: number | null;
  createdAt: string;
}
