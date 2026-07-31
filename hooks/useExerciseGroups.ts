import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { createExerciseGroup, deleteExerciseGroup, listExerciseGroups } from "../db";
import type { ExerciseGroup } from "../types";

export function useExerciseGroups() {
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listExerciseGroups();
      setGroups(rows);
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
      const group = await createExerciseGroup(name);
      await refresh();
      return group;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteExerciseGroup(id);
      await refresh();
    },
    [refresh],
  );

  return { groups, loading, refresh, create, remove };
}
