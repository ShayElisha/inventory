import { describe, expect, it } from "vitest";
import { describeUomConversion, fromBaseUnits, toBaseUnits } from "@/lib/uom";

describe("uom conversions", () => {
  const product = {
    unitOfMeasure: "UNIT",
    unitsPerCarton: 12,
  };

  it("converts cartons to base units", () => {
    expect(toBaseUnits(2, "CARTON", product)).toBe(24);
  });

  it("keeps unit quantities as-is", () => {
    expect(toBaseUnits(5, "UNIT", product)).toBe(5);
  });

  it("converts base back to cartons", () => {
    expect(fromBaseUnits(24, "CARTON", product)).toBe(2);
  });

  it("describes conversion", () => {
    const d = describeUomConversion(3, "CARTON", product);
    expect(d.baseUnits).toBe(36);
    expect(d.label).toContain("קרטון");
  });
});
