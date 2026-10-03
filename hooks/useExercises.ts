import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { createExercise, listExercises, renameExercise } from "../db";
import type { Exercise } from "../types";

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listExercises();
      setExercises(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const create = useCallback(
    async (name: string) => {
      const exercise = await createExercise(name);
      await refresh();
      return exercise;
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await renameExercise(id, name);
      await refresh();
    },
    [refresh],
  );

  return { exercises, loading, refresh, create, rename };
}
