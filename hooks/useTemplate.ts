import { useCallback, useEffect, useState } from "react";

import {
  addTemplateExercise,
  addTemplateSet,
  getTemplate,
  removeTemplateExercise,
  removeTemplateSet,
  renameTemplate,
  updateTemplateExercise,
  updateTemplateSet,
  type NewTemplateExerciseInput,
  type TemplateExercisePatch,
  type TemplateSetInput,
  type TemplateSetPatch,
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

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const addSet = useCallback(
    async (templateExerciseId: string, input: TemplateSetInput) => {
      await addTemplateSet(templateExerciseId, input);
      await refresh();
    },
    [refresh],
  );

  const updateSet = useCallback(
    async (setId: string, patch: TemplateSetPatch) => {
      await updateTemplateSet(setId, patch);
      await refresh();
    },
    [refresh],
  );

  const removeSet = useCallback(
    async (setId: string) => {
      await removeTemplateSet(setId);
      await refresh();
    },
    [refresh],
  );

  return {
    template,
    loading,
    refresh,
    rename,
    addExercise,
    updateExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
  };
}
