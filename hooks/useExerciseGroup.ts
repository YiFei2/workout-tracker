import { useCallback, useEffect, useState } from "react";

import { getExerciseGroup, renameExerciseGroup, setExerciseGroup } from "../db";
import type { ExerciseGroup } from "../types";

export function useExerciseGroup(id: string) {
  const [group, setGroup] = useState<ExerciseGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getExerciseGroup(id);
      setGroup(result);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rename = useCallback(
    async (name: string) => {
      await renameExerciseGroup(id, name);
      await refresh();
    },
    [id, refresh],
  );

  const addMember = useCallback(
    async (exerciseId: string) => {
      await setExerciseGroup(exerciseId, id);
      await refresh();
    },
    [id, refresh],
  );

  const removeMember = useCallback(
    async (exerciseId: string) => {
      await setExerciseGroup(exerciseId, null);
      await refresh();
    },
    [refresh],
  );

  return { group, loading, refresh, rename, addMember, removeMember };
}
