import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CopilotAdapter } from "@/providers/copilot/copilot";
import type { AdapterContext } from "@/lib/adapter/types";

describe("CopilotAdapter", () => {
  let adapter: CopilotAdapter;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    adapter = new CopilotAdapter();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("id is 'copilot'", () => {
    expect(adapter.id).toBe("copilot");
  });

  it("displayName is 'GitHub Copilot'", () => {
    expect(adapter.displayName).toBe("GitHub Copilot");
  });

  it("loadAuth returns empty object when no token", async () => {
    const ctx: AdapterContext = { plugin: {} as any };
    const auth = await adapter.loadAuth(ctx);
    expect(auth).toEqual({});
  });

  it("loadAuth returns headers with Bearer token", async () => {
    process.env["GITHUB_TOKEN"] = "test-token";
    const ctx: AdapterContext = { plugin: {} as any };
    const auth = await adapter.loadAuth(ctx);
    expect(auth.headers).toBeDefined();
    expect(auth.headers?.["Authorization"]).toBe("Bearer test-token");
    expect(auth.baseURL).toBe("https://api.githubcopilot.com");
  });

  it("fetchProviderApi('/rate-limit') delegates to queryCopilotRateLimit", async () => {
    const result = await adapter.fetchProviderApi("/rate-limit");
    expect(result.attempted).toBe(false);
  });

  it("fetchProviderApi unknown path returns not attempted", async () => {
    const result = await adapter.fetchProviderApi("/unknown");
    expect(result.attempted).toBe(false);
    expect(result.error).toBe("Unknown path: /unknown");
  });
});
