import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { queryCopilotRateLimit } from "@/providers/copilot/copilot.api";

describe("queryCopilotRateLimit", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("returns notAttempted when no token", async () => {
    const result = await queryCopilotRateLimit();
    expect(result.attempted).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it("returns failed on 401", async () => {
    process.env["GITHUB_TOKEN"] = "invalid-token";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await queryCopilotRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.error).not.toBeNull();
  });

  it("respects timeoutMs option", async () => {
    process.env["GITHUB_TOKEN"] = "test-token";

    const mockFetch = vi.fn().mockImplementation(() => {
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(new Response(JSON.stringify({}), { status: 200 }));
        }, 100);
      });
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await queryCopilotRateLimit({ timeoutMs: 50 });
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("timed out");
  });
});
