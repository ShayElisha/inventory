import { describe, expect, it } from "vitest";
import {
  effectivePermissions,
  hasPermission,
  permissionsForRole,
} from "@/lib/permissions";

describe("fine-grained permissions", () => {
  it("viewer defaults to read + reports", () => {
    const p = permissionsForRole("VIEWER");
    expect(p).toContain("reports.view");
    expect(p).not.toContain("stock.write");
  });

  it("override can grant reports-only viewer without stock write", () => {
    const json = JSON.stringify(["reports.view", "stock.read"]);
    expect(hasPermission("VIEWER", "reports.view", json)).toBe(true);
    expect(hasPermission("VIEWER", "stock.write", json)).toBe(false);
  });

  it("warehouse can write stock by default", () => {
    expect(hasPermission("WAREHOUSE", "stock.write")).toBe(true);
  });

  it("admin gets all permissions", () => {
    const all = effectivePermissions("ADMIN");
    expect(all.length).toBeGreaterThan(5);
    expect(hasPermission("ADMIN", "integrations.manage")).toBe(true);
  });
});
