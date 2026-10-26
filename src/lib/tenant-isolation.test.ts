import { describe, expect, it } from "vitest";
import {
  assertLocationsOwned,
  assertPriceListOwned,
  assertSupplierOwned,
  assertVariantsOwned,
} from "./tenant-guard";

/**
 * בדיקות יחידה ללוגיקת ownership — בלי DB (empty / false paths).
 * בדיקת DB מלאה רצה ב־tenant-isolation.db.test.ts כשיש DATABASE_URL.
 */
describe("tenant ownership helpers", () => {
  it("assertVariantsOwned rejects empty list", async () => {
    expect(await assertVariantsOwned("co1", [])).toBe(false);
  });

  it("assertLocationsOwned allows empty", async () => {
    expect(await assertLocationsOwned("co1", [null, undefined, ""])).toBe(
      true
    );
  });

  it("assertSupplierOwned / priceList allow null", async () => {
    expect(await assertSupplierOwned("co1", null)).toBe(true);
    expect(await assertPriceListOwned("co1", undefined)).toBe(true);
  });
});
