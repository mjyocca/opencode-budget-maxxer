import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { queryGoRateLimit } from "@/providers/opencode-go/go.api";
import * as goAuth from "@/providers/opencode-go/go.auth";

const SAMPLE_HTML = `
<script>
window.__SOLID_HYDRATION_DATA__ = {
  rollingUsage:$R[0]={usagePercent:45,resetInSec:2520},
  weeklyUsage:$R[1]={usagePercent:20,resetInSec:259200},
  monthlyUsage:$R[2]={usagePercent:10,resetInSec:1728000}
};
</script>
`;

const PARTIAL_HTML = `
<script>
rollingUsage:$R[0]={usagePercent:60,resetInSec:1800}
</script>
`;

describe("queryGoRateLimit", () => {
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
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue(null);
    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it("parses all three windows from dashboard HTML", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(SAMPLE_HTML),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.rolling5h).toEqual({ usagePercent: 45, resetInSec: 2520 });
    expect(result.data?.weekly).toEqual({ usagePercent: 20, resetInSec: 259200 });
    expect(result.data?.monthly).toEqual({ usagePercent: 10, resetInSec: 1728000 });
  });

  it("parses partial data when only some windows present", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(PARTIAL_HTML),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.rolling5h).toEqual({ usagePercent: 60, resetInSec: 1800 });
    expect(result.data?.weekly).toBeNull();
    expect(result.data?.monthly).toBeNull();
  });

  it("throws on 401/403 with auth error message", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
      authCookie: "Fe26.2**expired-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("authentication failed");
  });

  it("throws on other HTTP errors", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("HTTP 500");
  });

  it("throws when no quota data can be parsed", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("<html><body>No quota data here</body></html>"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("Could not parse quota data");
  });

  it("respects timeoutMs option", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
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

    const result = await queryGoRateLimit({ timeoutMs: 50 });
    expect(result.attempted).toBe(true);
    expect(result.error).toContain("timed out");
  });

  it("handles decimal usagePercent values", async () => {
    vi.spyOn(goAuth, "resolveGoCredentials").mockResolvedValue({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });

    const htmlWithDecimals = `rollingUsage:$R[0]={usagePercent:45.7,resetInSec:2520.5}`;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(htmlWithDecimals),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.data?.rolling5h).toEqual({ usagePercent: 46, resetInSec: 2521 });
  });
});
