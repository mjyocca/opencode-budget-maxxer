import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as runtimePaths from "@/lib/core/runtime-paths";
import * as fs from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/core/runtime-paths", () => ({
  getOpencodeRuntimeDirs: vi.fn(),
}));

describe("budget-cache", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync("/tmp/budget-cache-test-");
    // Mock cacheDir to point to testDir/opencode so our code creates testDir/opencode-budget-maxxer
    vi.mocked(runtimePaths.getOpencodeRuntimeDirs).mockReturnValue({
      cacheDir: join(testDir, "opencode"),
      configDirs: [],
      dataDirs: [],
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns null when cache file doesn't exist", async () => {
    const { readCache } = await import("@/cache");
    const result = readCache();
    expect(result).toBeNull();
  });

  it("writes and reads cache data", async () => {
    const { readCache, writeCache } = await import("@/cache");
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
    const { readCache, mergeQuotaCache } = await import("@/cache");
    await mergeQuotaCache("opencode", { balance: 15.2 });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].provider).toBe("opencode");
    expect(result!.entries[0].data.balance).toBe(15.2);
  });

  it("mergeQuotaCache updates existing provider without overwriting others", async () => {
    const { readCache, writeCache, mergeQuotaCache } = await import("@/cache");

    writeCache({
      entries: [
        {
          provider: "opencode-go",
          timestamp: 100,
          data: { rolling5h: { usagePercent: 45 } },
        },
        { provider: "opencode", timestamp: 100, data: { balance: 10 } },
      ],
      updatedAt: 100,
    });

    await mergeQuotaCache("opencode", { balance: 20, monthlySpending: 5 });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    const goEntry = result!.entries.find((e) => e.provider === "opencode-go");
    const zenEntry = result!.entries.find((e) => e.provider === "opencode");
    expect(goEntry!.data.rolling5h.usagePercent).toBe(45);
    expect(zenEntry!.data.balance).toBe(20);
    expect(zenEntry!.data.monthlySpending).toBe(5);
  });

  it("setActiveProvider writes active provider to cache", async () => {
    const { readCache, setActiveProvider } = await import("@/cache");
    await setActiveProvider("opencode-go");

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions).toBeDefined();
    expect(result!.sessions!.default.activeProvider).toBe("opencode-go");
  });

  it("setActiveProvider preserves existing entries", async () => {
    const { readCache, writeCache, mergeQuotaCache, setActiveProvider } =
      await import("@/cache");

    await mergeQuotaCache("opencode-go", { rolling5h: { usagePercent: 45 } });
    await mergeQuotaCache("opencode", { balance: 15 });
    await setActiveProvider("opencode");

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions!.default.activeProvider).toBe("opencode");
    expect(result!.entries).toHaveLength(2);
  });

  it("mapProviderID maps known provider IDs", async () => {
    const { mapProviderID } = await import("@/cache");
    expect(mapProviderID("opencode-go")).toBe("opencode-go");
    expect(mapProviderID("opencode")).toBe("opencode");
    expect(mapProviderID("copilot")).toBe("copilot");
    expect(mapProviderID("github-copilot")).toBe("copilot");
    expect(mapProviderID("copilot-chat")).toBe("copilot");
    expect(mapProviderID("github-copilot-chat")).toBe("copilot");
  });

  it("mapProviderID returns null for unknown provider IDs", async () => {
    const { mapProviderID } = await import("@/cache");
    expect(mapProviderID("unknown-provider")).toBeNull();
    expect(mapProviderID("")).toBeNull();
  });

  it("setSessionActiveProvider sets active provider for a session", async () => {
    const { readCache, setSessionActiveProvider } = await import("@/cache");
    await setSessionActiveProvider("session-1", "opencode-go");

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions).toBeDefined();
    expect(result!.sessions!["session-1"].activeProvider).toBe("opencode-go");
  });

  it("setSessionOverrideProvider sets override for a session", async () => {
    const { readCache, setSessionOverrideProvider } = await import("@/cache");
    await setSessionOverrideProvider("session-1", "copilot");

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions).toBeDefined();
    expect(result!.sessions!["session-1"].overrideProvider).toBe("copilot");
  });

  it("setSessionOverrideProvider clears override when null", async () => {
    const { readCache, writeCache, setSessionOverrideProvider } = await import(
      "@/cache"
    );

    writeCache({
      entries: [],
      sessions: { "session-1": { overrideProvider: "copilot" } },
      updatedAt: 100,
    });

    await setSessionOverrideProvider("session-1", null);

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions!["session-1"].overrideProvider).toBeUndefined();
  });

  it("getSessionState returns session state", async () => {
    const { writeCache, getSessionState } = await import("@/cache");

    writeCache({
      entries: [],
      sessions: {
        "session-1": {
          activeProvider: "opencode-go",
          overrideProvider: "copilot",
        },
      },
      updatedAt: 100,
    });

    const state = await getSessionState("session-1");
    expect(state).not.toBeNull();
    expect(state!.activeProvider).toBe("opencode-go");
    expect(state!.overrideProvider).toBe("copilot");
  });

  it("getSessionState returns null for non-existent session", async () => {
    const { getSessionState } = await import("@/cache");
    const state = await getSessionState("non-existent");
    expect(state).toBeNull();
  });

  it("per-session isolation: different sessions have independent state", async () => {
    const {
      readCache,
      setSessionActiveProvider,
      setSessionOverrideProvider,
    } = await import("@/cache");

    await setSessionActiveProvider("session-1", "opencode-go");
    await setSessionActiveProvider("session-2", "opencode");
    await setSessionOverrideProvider("session-1", "copilot");

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions!["session-1"].activeProvider).toBe("opencode-go");
    expect(result!.sessions!["session-1"].overrideProvider).toBe("copilot");
    expect(result!.sessions!["session-2"].activeProvider).toBe("opencode");
    expect(result!.sessions!["session-2"].overrideProvider).toBeUndefined();
  });

  it("migrates old activeProvider to sessions.default", async () => {
    const { readCache, writeCache } = await import("@/cache");

    writeCache({
      entries: [],
      activeProvider: "opencode-go",
      updatedAt: 100,
    });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.activeProvider).toBeUndefined();
    expect(result!.sessions).toBeDefined();
    expect(result!.sessions!["default"].activeProvider).toBe("opencode-go");
  });

  it("mergeQuotaCache preserves sessions field", async () => {
    const { readCache, writeCache, mergeQuotaCache } = await import("@/cache");

    writeCache({
      entries: [],
      sessions: { "session-1": { activeProvider: "opencode-go" } },
      updatedAt: 100,
    });

    await mergeQuotaCache("opencode-go", { rolling5h: { usagePercent: 50 } });

    const result = readCache();
    expect(result).not.toBeNull();
    expect(result!.sessions).toBeDefined();
    expect(result!.sessions!["session-1"].activeProvider).toBe("opencode-go");
    expect(result!.entries).toHaveLength(1);
  });
});
