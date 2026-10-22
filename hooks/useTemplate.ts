import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  addTemplateExercise,
  getTemplate,
  removeTemplateExercise,
  renameTemplate,
  reorderTemplateExercises,
  updateTemplateExercise,
  type NewTemplateExerciseInput,
  type TemplateExercisePatch,
} from "../db";
import type { WorkoutTemplate } from "../types";

export function useTemplate(id: string) {
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTemplate(id);
      setTemplate(result);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Refetches on every return to this screen (not just on mount) so
  // exercises mirrored in from an in-progress workout — see
  // mirrorExerciseOntoTemplate in db/sessions.ts — show up as soon as the
  // user navigates back, without needing to leave and re-enter the screen.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const rename = useCallback(
    async (name: string) => {
      await renameTemplate(id, name);
      await refresh();
    },
    [id, refresh],
  );

  const addExercise = useCallback(
    async (input: NewTemplateExerciseInput) => {
      await addTemplateExercise(id, input);
      await refresh();
    },
    [id, refresh],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, patch: TemplateExercisePatch) => {
      await updateTemplateExercise(exerciseId, patch);
      await refresh();
    },
    [refresh],
  );

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      await removeTemplateExercise(exerciseId);
      await refresh();
    },
    [refresh],
  );

  const reorderExercises = useCallback(
    async (orderedExerciseIds: string[]) => {
      await reorderTemplateExercises(id, orderedExerciseIds);
      await refresh();
    },
    [id, refresh],
  );

  return {
    template,
    loading,
    refresh,
    rename,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
  };
}
