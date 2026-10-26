import { afterEach, describe, expect, it } from "vitest";
import { _resetRateLimitBuckets, rateLimit } from "./rate-limit";

afterEach(() => {
  _resetRateLimitBuckets();
});

describe("rateLimit", () => {
  it("allows requests under the limit", async () => {
    const a = await rateLimit({ key: "t1", limit: 3, windowMs: 60_000 });
    const b = await rateLimit({ key: "t1", limit: 3, windowMs: 60_000 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(b.remaining).toBe(1);
  });

  it("blocks when limit exceeded", async () => {
    await rateLimit({ key: "t2", limit: 2, windowMs: 60_000 });
    await rateLimit({ key: "t2", limit: 2, windowMs: 60_000 });
    const blocked = await rateLimit({ key: "t2", limit: 2, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", async () => {
    await rateLimit({ key: "a", limit: 1, windowMs: 60_000 });
    const other = await rateLimit({ key: "b", limit: 1, windowMs: 60_000 });
    expect(other.ok).toBe(true);
  });
});
