import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { createLocation, deleteLocation, listLocations, renameLocation } from "../db";
import type { Location } from "../types";

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listLocations();
      setLocations(rows);
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
      const location = await createLocation(name);
      await refresh();
      return location;
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await renameLocation(id, name);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteLocation(id);
      await refresh();
    },
    [refresh],
  );

  return { locations, loading, refresh, create, rename, remove };
}
