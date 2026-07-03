import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { OpencodeZenProvider } from "@/providers/opencode-zen/zen";
import type { ProviderContext } from "@/lib/provider/types";

describe("OpencodeZenProvider", () => {
  let provider: OpencodeZenProvider;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env["OPENCODE_GO_AUTH_COOKIE"];
    delete process.env["OPENCODE_GO_WORKSPACE_ID"];
    provider = new OpencodeZenProvider();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("id is 'opencode'", () => {
    expect(provider.id).toBe("opencode");
  });

  it("displayName is 'OpenCode Zen'", () => {
    expect(provider.displayName).toBe("OpenCode Zen");
  });

  it("loadAuth returns empty object when no credentials", async () => {
    const ctx: ProviderContext = { plugin: {} as any };
    const auth = await provider.loadAuth(ctx);
    expect(auth).toEqual({});
  });

  it("loadAuth returns apiKey and baseURL when credentials found", async () => {
    process.env["OPENCODE_GO_AUTH_COOKIE"] = "Fe26.2**test-cookie";
    process.env["OPENCODE_GO_WORKSPACE_ID"] = "wrk-test-123";
    const ctx: ProviderContext = { plugin: {} as any };
    const auth = await provider.loadAuth(ctx);
    expect(auth.apiKey).toBe("Fe26.2**test-cookie");
    expect(auth.baseURL).toBe("https://opencode.ai/workspace/wrk-test-123/zen");
  });

  it("fetchProviderApi('/usage') delegates to queryZenUsage", async () => {
    const result = await provider.fetchProviderApi("/usage");
    expect(result.attempted).toBe(false);
  });

  it("fetchProviderApi unknown path returns not attempted", async () => {
    const result = await provider.fetchProviderApi("/unknown");
    expect(result.attempted).toBe(false);
    expect(result.error).toBe("Unknown path: /unknown");
  });

  it("isConfigured returns false when no credentials", async () => {
    const configured = await provider.isConfigured();
    expect(configured).toBe(false);
  });

  it("isConfigured returns true when credentials found", async () => {
    process.env["OPENCODE_GO_AUTH_COOKIE"] = "Fe26.2**test-cookie";
    process.env["OPENCODE_GO_WORKSPACE_ID"] = "wrk-test-123";
    const configured = await provider.isConfigured();
    expect(configured).toBe(true);
  });
});
