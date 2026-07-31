import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getSetting, setSetting } from "../db";
import type { WeightUnit } from "../lib/units";

const WEIGHT_UNIT_SETTING_KEY = "weightUnit";

interface UnitContextValue {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
}

const UnitContext = createContext<UnitContextValue | null>(null);

function isWeightUnit(value: string | null): value is WeightUnit {
  return value === "kg" || value === "lb";
}

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>("kg");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting(WEIGHT_UNIT_SETTING_KEY).then((stored) => {
      if (isWeightUnit(stored)) {
        setUnitState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setUnit = (next: WeightUnit) => {
    setUnitState(next);
    setSetting(WEIGHT_UNIT_SETTING_KEY, next);
  };

  const value = useMemo(() => ({ unit, setUnit }), [unit]);

  if (!loaded) {
    return null;
  }

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useWeightUnit(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    throw new Error("useWeightUnit must be used within a UnitProvider");
  }
  return ctx;
}
