import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { deleteSession, listSessions, type SessionSummary } from "../db";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listSessions();
      setSessions(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSession(id);
      await refresh();
    },
    [refresh],
  );

  return { sessions, loading, refresh, remove };
}
