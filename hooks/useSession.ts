import { useCallback, useEffect, useState } from "react";

import {
  addLoggedExercise,
  addSet,
  completeSession,
  deleteSession,
  getSession,
  removeLoggedExercise,
  removeSet,
  reorderLoggedExercises,
  setSessionLocation,
  swapLoggedExercise,
  updateLoggedExercise,
  updateSet,
  type LoggedExercisePatch,
  type NewLoggedExerciseInput,
  type SetPatch,
} from "../db";
import type { WorkoutSession } from "../types";

function patchSessionSet(
  session: WorkoutSession,
  setId: string,
  patch: SetPatch,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
    })),
  };
}

export function useSession(id: string) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSession(id);
      setSession(result);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addExercise = useCallback(
    async (input: NewLoggedExerciseInput) => {
      await addLoggedExercise(id, input);
      await refresh();
    },
    [id, refresh],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, patch: LoggedExercisePatch) => {
      await updateLoggedExercise(exerciseId, patch);
      await refresh();
    },
    [refresh],
  );

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      await removeLoggedExercise(exerciseId);
      await refresh();
    },
    [refresh],
  );

  const addExerciseSet = useCallback(
    async (exerciseId: string) => {
      await addSet(exerciseId);
      await refresh();
    },
    [refresh],
  );

  const updateExerciseSet = useCallback(
    async (setId: string, patch: SetPatch) => {
      // Update the in-memory session optimistically rather than refetching:
      // set edits now persist on every keystroke (see SetRow), and a full
      // refresh per keystroke would be wasteful and could feed a stale value
      // back into the row on blur. Nothing derived from set values/completion
      // on this screen needs a reload — the row already shows the new value.
      setSession((prev) => (prev ? patchSessionSet(prev, setId, patch) : prev));
      await updateSet(setId, patch);
    },
    [],
  );

  const removeExerciseSet = useCallback(
    async (setId: string) => {
      await removeSet(setId);
      await refresh();
    },
    [refresh],
  );

  const reorderExercises = useCallback(
    async (orderedExerciseIds: string[]) => {
      await reorderLoggedExercises(id, orderedExerciseIds);
      await refresh();
    },
    [id, refresh],
  );

  const swapExercise = useCallback(
    async (loggedExerciseId: string, exerciseId: string, exerciseName: string) => {
      await swapLoggedExercise(loggedExerciseId, exerciseId, exerciseName);
      await refresh();
    },
    [refresh],
  );

  const setLocation = useCallback(
    async (locationId: string) => {
      await setSessionLocation(id, locationId);
      await refresh();
    },
    [id, refresh],
  );

  const complete = useCallback(async () => {
    const fired = await completeSession(id);
    await refresh();
    return fired;
  }, [id, refresh]);

  const discard = useCallback(async () => {
    await deleteSession(id);
  }, [id]);

  return {
    session,
    loading,
    refresh,
    addExercise,
    updateExercise,
    removeExercise,
    addSet: addExerciseSet,
    updateSet: updateExerciseSet,
    removeSet: removeExerciseSet,
    reorderExercises,
    swapExercise,
    setLocation,
    complete,
    discard,
  };
}
