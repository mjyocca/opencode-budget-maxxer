import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as runtimePaths from "@/lib/core/runtime-paths";
import * as fs from "node:fs";

vi.mock("@/lib/core/runtime-paths", () => ({
  getOpencodeRuntimeDirs: vi.fn(),
}));

describe("cache", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync("/tmp/budget-cache-test-");
    vi.mocked(runtimePaths.getOpencodeRuntimeDirs).mockReturnValue({
      cacheDir: testDir,
      configDirs: [],
      dataDirs: [],
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns null when cache file doesn't exist", async () => {
    const { readCache } = await import("@/lib/budget/cache");
    const result = readCache();
    expect(result).toBeNull();
  });

  it("writes and reads cache data", async () => {
    const { readCache, writeCache } = await import("@/lib/budget/cache");
    const entries = [
      { provider: "opencode-go", timestamp: 123, data: { foo: "bar" } },
    ];
    writeCache({ entries, updatedAt: 123 });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].provider).toBe("opencode-go");
    expect(result!.entries[0].data.foo).toBe("bar");
  });

  it("mergeQuotaCache adds new provider entry", async () => {
    const { readCache, mergeQuotaCache } = await import("@/lib/budget/cache");
    mergeQuotaCache("opencode", { balance: 15.20 });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].provider).toBe("opencode");
    expect(result!.entries[0].data.balance).toBe(15.20);
  });

  it("mergeQuotaCache updates existing provider without overwriting others", async () => {
    const { readCache, writeCache, mergeQuotaCache } = await import("@/lib/budget/cache");

    writeCache({
      entries: [
        { provider: "opencode-go", timestamp: 100, data: { rolling5h: { usagePercent: 45 } } },
        { provider: "opencode", timestamp: 100, data: { balance: 10 } },
      ],
      updatedAt: 100,
    });

    mergeQuotaCache("opencode", { balance: 20, monthlySpending: 5 });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    const goEntry = result!.entries.find((e) => e.provider === "opencode-go");
    const zenEntry = result!.entries.find((e) => e.provider === "opencode");
    expect(goEntry!.data.rolling5h.usagePercent).toBe(45);
    expect(zenEntry!.data.balance).toBe(20);
    expect(zenEntry!.data.monthlySpending).toBe(5);
  });
});
