import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getAuthSecret", () => {
  it("returns AUTH_SECRET when set", async () => {
    vi.stubEnv("AUTH_SECRET", "my-production-secret-value");
    vi.stubEnv("NODE_ENV", "production");
    const { getAuthSecret } = await import("./secrets");
    expect(getAuthSecret()).toBe("my-production-secret-value");
  });

  it("throws in production without AUTH_SECRET", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const { getAuthSecret } = await import("./secrets");
    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/);
  });

  it("falls back in development", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    const { getAuthSecret } = await import("./secrets");
    expect(getAuthSecret().length).toBeGreaterThan(8);
  });
});

describe("allowDemoSeed", () => {
  it("is false in production by default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_SEED", "");
    const { allowDemoSeed } = await import("./secrets");
    expect(allowDemoSeed()).toBe(false);
  });

  it("can be forced on", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_SEED", "true");
    const { allowDemoSeed } = await import("./secrets");
    expect(allowDemoSeed()).toBe(true);
  });
});
