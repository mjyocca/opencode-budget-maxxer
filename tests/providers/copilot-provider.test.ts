import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CopilotProvider } from "@/providers/copilot/copilot";
import type { ProviderContext } from "@/lib/provider/types";

describe("CopilotProvider", () => {
  let provider: CopilotProvider;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env["GITHUB_TOKEN"];
    delete process.env["COPILOT_TOKEN"];
    provider = new CopilotProvider();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("id is 'copilot'", () => {
    expect(provider.id).toBe("copilot");
  });

  it("displayName is 'GitHub Copilot'", () => {
    expect(provider.displayName).toBe("GitHub Copilot");
  });

  it("loadAuth returns empty object when no token", async () => {
    const ctx: ProviderContext = { plugin: {} as any };
    const auth = await provider.loadAuth(ctx);
    expect(auth).toEqual({});
  });

  it("loadAuth returns headers with Bearer token", async () => {
    process.env["GITHUB_TOKEN"] = "test-token";
    const ctx: ProviderContext = { plugin: {} as any };
    const auth = await provider.loadAuth(ctx);
    expect(auth.headers).toBeDefined();
    expect(auth.headers?.["Authorization"]).toBe("Bearer test-token");
    expect(auth.baseURL).toBe("https://api.githubcopilot.com");
  });

  it("fetchProviderApi('/usage') delegates to queryCopilotUsage", async () => {
    const result = await provider.fetchProviderApi("/usage");
    expect(result.attempted).toBe(false);
  });

  it("fetchProviderApi unknown path returns not attempted", async () => {
    const result = await provider.fetchProviderApi("/unknown");
    expect(result.attempted).toBe(false);
    expect(result.error).toBe("Unknown path: /unknown");
  });

  it("isConfigured returns false when no token", async () => {
    const configured = await provider.isConfigured();
    expect(configured).toBe(false);
  });

  it("isConfigured returns true when token found", async () => {
    process.env["GITHUB_TOKEN"] = "test-token";
    const configured = await provider.isConfigured();
    expect(configured).toBe(true);
  });
});
