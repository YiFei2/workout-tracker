import { useCallback, useEffect, useState } from "react";

import {
  addLoggedExercise,
  addSet,
  completeSession,
  deleteSession,
  getSession,
  removeLoggedExercise,
  removeSet,
  setSessionLocation,
  swapLoggedExercise,
  updateLoggedExercise,
  updateSet,
  type LoggedExercisePatch,
  type NewLoggedExerciseInput,
  type SetPatch,
} from "../db";
import type { WorkoutSession } from "../types";

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
      await updateSet(setId, patch);
      await refresh();
    },
    [refresh],
  );

  const removeExerciseSet = useCallback(
    async (setId: string) => {
      await removeSet(setId);
      await refresh();
    },
    [refresh],
  );

  const swapExercise = useCallback(
    async (exerciseId: string, exerciseName: string) => {
      await swapLoggedExercise(exerciseId, exerciseName);
      await refresh();
    },
    [refresh],
  );

  const setLocation = useCallback(
    async (locationId: string | null) => {
      await setSessionLocation(id, locationId);
      await refresh();
    },
    [id, refresh],
  );

  const complete = useCallback(async () => {
    await completeSession(id);
    await refresh();
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
    swapExercise,
    setLocation,
    complete,
    discard,
  };
}
