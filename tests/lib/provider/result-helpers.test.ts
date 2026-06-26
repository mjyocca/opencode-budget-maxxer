import { describe, expect, it } from "vitest";
import { notAttempted, succeeded, failed, tryFetch } from "@/lib/provider/result-helpers";

describe("notAttempted", () => {
  it("returns attempted: false", () => {
    const result = notAttempted();
    expect(result.attempted).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe("succeeded", () => {
  it("returns attempted: true with data", () => {
    const result = succeeded({ count: 42 });
    expect(result.attempted).toBe(true);
    expect(result.data).toEqual({ count: 42 });
    expect(result.error).toBeNull();
  });
});

describe("failed", () => {
  it("returns attempted: true with error", () => {
    const result = failed("network error");
    expect(result.attempted).toBe(true);
    expect(result.data).toBeNull();
    expect(result.error).toBe("network error");
  });
});

describe("tryFetch", () => {
  it("returns notAttempted when fn returns null", async () => {
    const result = await tryFetch(async () => null, "test");
    expect(result.attempted).toBe(false);
  });

  it("returns succeeded when fn resolves", async () => {
    const result = await tryFetch(async () => ({ key: "value" }), "test");
    expect(result.attempted).toBe(true);
    expect(result.data).toEqual({ key: "value" });
  });

  it("returns failed when fn throws Error", async () => {
    const result = await tryFetch(async () => { throw new Error("something broke"); }, "test");
    expect(result.attempted).toBe(true);
    expect(result.error).toBe("test: something broke");
  });

  it("returns failed when fn throws string", async () => {
    const result = await tryFetch(async () => { throw "string error"; }, "test");
    expect(result.attempted).toBe(true);
    expect(result.error).toBe("test: string error");
  });
});
