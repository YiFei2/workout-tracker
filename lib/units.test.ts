import { kgToUnit, unitToKg } from "./units";

describe("kgToUnit", () => {
  it("returns the value unchanged for kg", () => {
    expect(kgToUnit(60, "kg")).toBe(60);
  });

  it("converts kg to lb, rounded to one decimal", () => {
    expect(kgToUnit(60, "lb")).toBeCloseTo(132.3, 1);
  });

  it("round-trips zero", () => {
    expect(kgToUnit(0, "lb")).toBe(0);
  });
});

describe("unitToKg", () => {
  it("returns the value unchanged for kg", () => {
    expect(unitToKg(60, "kg")).toBe(60);
  });

  it("converts lb to kg", () => {
    expect(unitToKg(132.3, "lb")).toBeCloseTo(60, 1);
  });

  it("is the inverse of kgToUnit for lb (within rounding)", () => {
    const original = 100;
    const displayed = kgToUnit(original, "lb");
    const roundTripped = unitToKg(displayed, "lb");
    expect(roundTripped).toBeCloseTo(original, 0);
  });
});
