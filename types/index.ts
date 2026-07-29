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
  exercises: LoggedExercise[];
}

export interface LoggedExercise {
  id: string;
  sessionId: string;
  exerciseName: string;
  order: number;
  restSeconds: number | null;
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
