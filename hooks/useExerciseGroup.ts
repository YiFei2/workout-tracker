import { useCallback, useEffect, useState } from "react";

import {
  addExerciseGroupMember,
  getExerciseGroup,
  removeExerciseGroupMember,
  renameExerciseGroup,
} from "../db";
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
    async (exerciseName: string) => {
      await addExerciseGroupMember(id, exerciseName);
      await refresh();
    },
    [id, refresh],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      await removeExerciseGroupMember(memberId);
      await refresh();
    },
    [refresh],
  );

  return { group, loading, refresh, rename, addMember, removeMember };
}
