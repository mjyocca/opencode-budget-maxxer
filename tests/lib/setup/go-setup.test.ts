import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { validateGoCredentials, openGoDashboard } from "@/lib/setup/go-setup";

const VALID_HTML = `
<script>
rollingUsage:$R[0]={usagePercent:45,resetInSec:2520},
weeklyUsage:$R[1]={usagePercent:20,resetInSec:259200},
monthlyUsage:$R[2]={usagePercent:10,resetInSec:1728000}
</script>
`;

describe("validateGoCredentials", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid with windows when dashboard returns quota data", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(VALID_HTML),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await validateGoCredentials("wrk-test-123", "Fe26.2**test");
    expect(result.valid).toBe(true);
    expect(result.windows).toContain("rolling");
    expect(result.windows).toContain("weekly");
    expect(result.windows).toContain("monthly");
  });

  it("returns invalid on 401", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await validateGoCredentials("wrk-test-123", "Fe26.2**expired");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Authentication failed");
  });

  it("returns invalid on 403", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await validateGoCredentials("wrk-test-123", "Fe26.2**forbidden");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Authentication failed");
  });

  it("returns invalid on 500", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await validateGoCredentials("wrk-test-123", "Fe26.2**test");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("HTTP 500");
  });

  it("returns invalid when no quota data in HTML", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("<html><body>No quota here</body></html>"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await validateGoCredentials("wrk-test-123", "Fe26.2**test");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("no quota data");
  });
});

describe("openGoDashboard", () => {
  it("returns url regardless of platform", async () => {
    const result = await openGoDashboard();
    expect(result.url).toBe("https://opencode.ai/go");
  });
});
