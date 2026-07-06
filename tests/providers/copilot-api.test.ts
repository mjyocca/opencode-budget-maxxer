import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { queryCopilotUsage } from "@/providers/copilot/copilot.api";

describe("queryCopilotUsage", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env["GITHUB_TOKEN"];
    delete process.env["COPILOT_TOKEN"];
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
    const result = await queryCopilotUsage();
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

    const result = await queryCopilotUsage();
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

    const result = await queryCopilotUsage({ timeoutMs: 50 });
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("timed out");
  });

  it("parses quota_snapshots from successful response", async () => {
    process.env["GITHUB_TOKEN"] = "test-token";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          copilot_plan: "business",
          token_based_billing: true,
          quota_reset_date_utc: "2026-07-01T00:00:00.000Z",
          quota_snapshots: {
            premium_interactions: {
              entitlement: 2400,
              remaining: 1292,
              quota_remaining: 1292.9,
              percent_remaining: 53.8,
              unlimited: false,
              has_quota: true,
              overage_permitted: true,
            },
            chat: { unlimited: true, has_quota: false, entitlement: 0 },
            completions: { unlimited: true, has_quota: false, entitlement: 0 },
          },
          organization_list: [{ login: "my-org" }],
        }),
      text: () => Promise.resolve(""),
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await queryCopilotUsage();
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data!.plan).toBe("business");
    expect(result.data!.unlimited).toBe(false);
    expect(result.data!.premiumInteractions).not.toBeNull();
    expect(result.data!.premiumInteractions!.entitlement).toBe(2400);
    expect(result.data!.premiumInteractions!.percent_remaining).toBe(53.8);
    expect(result.data!.organizations).toContain("my-org");
  });
});
