import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { createLocation, deleteLocation, listLocations, renameLocation } from "../db";
import type { Location } from "../types";

interface LocationsContextValue {
  locations: Location[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<Location>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const LocationsContext = createContext<LocationsContextValue | null>(null);

// Single shared location list for the whole app. Each screen/modal that
// used to call its own useLocations() held an independent copy of the
// list, so creating a location from one (e.g. the "+ Add new location"
// shortcut inside a LocationPickerModal) never showed up in any other
// already-mounted picker or screen until it happened to refocus — making a
// just-created location look like it hadn't actually saved. Sharing state
// here means every consumer sees a create/rename/remove immediately.
export function LocationsProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  return (
    <LocationsContext.Provider value={{ locations, loading, refresh, create, rename, remove }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations(): LocationsContextValue {
  const ctx = useContext(LocationsContext);
  if (!ctx) {
    throw new Error("useLocations must be used within a LocationsProvider");
  }
  return ctx;
}
