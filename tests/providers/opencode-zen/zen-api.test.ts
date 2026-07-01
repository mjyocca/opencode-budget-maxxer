import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { queryZenUsage } from "@/providers/opencode-zen/zen.api";
import * as zenAuth from "@/providers/opencode-zen/zen.auth";

const SAMPLE_HTML = `
<script>
$R[37]={customerID:"cus_test",paymentMethodType:"link",balance:1520000000,reload:!0,reloadAmount:25,reloadAmountMin:10,reloadTrigger:5,reloadTriggerMin:5,monthlyLimit:20,monthlyUsage:480000000,timeMonthlyUsageUpdated:$R[38]=new Date("2026-07-01T02:32:23.000Z")}
</script>
`;

const PARTIAL_HTML = `
<script>
$R[37]={customerID:"cus_test",balance:1050000000,reload:!1,reloadAmount:25,monthlyLimit:null,monthlyUsage:230000000}
</script>
`;

describe("queryZenUsage", () => {
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

  it("returns notAttempted when no credentials", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue(null);
    const result = await queryZenUsage();
    expect(result.attempted).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it("parses balance, spending, limit, and autoReload from dashboard HTML", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(SAMPLE_HTML),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryZenUsage();
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.balance).toBe(15.20);
    expect(result.data?.monthlySpending).toBe(4.80);
    expect(result.data?.monthlyLimit).toBe(20);
    expect(result.data?.autoReload).toBe(true);
  });

  it("parses partial data when only some fields present", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(PARTIAL_HTML),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryZenUsage();
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.balance).toBe(10.50);
    expect(result.data?.monthlySpending).toBe(2.30);
    expect(result.data?.monthlyLimit).toBeNull();
  });

  it("throws on 401/403 with auth error message", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue({
      authCookie: "Fe26.2**expired-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryZenUsage();
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("authentication failed");
  });

  it("throws on other HTTP errors", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryZenUsage();
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("HTTP 500");
  });

  it("throws when no usage data can be parsed", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("<html><body>No usage data here</body></html>"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryZenUsage();
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("Could not parse usage data");
  });

  it("respects timeoutMs option", async () => {
    vi.spyOn(zenAuth, "resolveZenCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockImplementation(() => {
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(new Response(SAMPLE_HTML, { status: 200 }));
        }, 100);
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryZenUsage({ timeoutMs: 50 });
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("timed out");
  });
});
