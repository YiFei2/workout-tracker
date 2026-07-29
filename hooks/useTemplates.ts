import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { createTemplate, deleteTemplate, listTemplates, type TemplateSummary } from "../db";

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTemplates();
      setTemplates(rows);
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
      const template = await createTemplate(name);
      await refresh();
      return template;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTemplate(id);
      await refresh();
    },
    [refresh],
  );

  return { templates, loading, refresh, create, remove };
}
