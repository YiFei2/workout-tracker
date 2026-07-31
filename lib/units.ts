export type WeightUnit = "kg" | "lb";

const KG_PER_LB = 0.45359237;

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Convert a canonical kg weight (as stored in the DB) to the given display unit. */
export function kgToUnit(kg: number, unit: WeightUnit): number {
  if (unit === "kg") {
    return kg;
  }
  return roundToOneDecimal(kg / KG_PER_LB);
}

/** Convert a value entered in the given display unit back to canonical kg for storage. */
export function unitToKg(value: number, unit: WeightUnit): number {
  if (unit === "kg") {
    return value;
  }
  return roundToOneDecimal(value * KG_PER_LB);
}
