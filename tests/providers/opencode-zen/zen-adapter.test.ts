import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { OpenCodeZenAdapter } from "@/providers/opencode-zen/zen";
import type { AdapterContext } from "@/lib/adapter/types";

describe("OpenCodeZenAdapter", () => {
  let adapter: OpenCodeZenAdapter;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env["OPENCODE_GO_AUTH_COOKIE"];
    delete process.env["OPENCODE_GO_WORKSPACE_ID"];
    adapter = new OpenCodeZenAdapter();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("id is 'opencode'", () => {
    expect(adapter.id).toBe("opencode");
  });

  it("displayName is 'OpenCode Zen'", () => {
    expect(adapter.displayName).toBe("OpenCode Zen");
  });

  it("loadAuth returns empty object when no credentials", async () => {
    const ctx: AdapterContext = { plugin: {} as any };
    const auth = await adapter.loadAuth(ctx);
    expect(auth).toEqual({});
  });

  it("loadAuth returns apiKey and baseURL when credentials found", async () => {
    process.env["OPENCODE_GO_AUTH_COOKIE"] = "Fe26.2**test-cookie";
    process.env["OPENCODE_GO_WORKSPACE_ID"] = "wrk-test-123";
    const ctx: AdapterContext = { plugin: {} as any };
    const auth = await adapter.loadAuth(ctx);
    expect(auth.apiKey).toBe("Fe26.2**test-cookie");
    expect(auth.baseURL).toBe("https://opencode.ai/workspace/wrk-test-123/zen");
  });

  it("fetchProviderApi('/usage') delegates to queryZenUsage", async () => {
    const result = await adapter.fetchProviderApi("/usage");
    expect(result.attempted).toBe(false);
  });

  it("fetchProviderApi unknown path returns not attempted", async () => {
    const result = await adapter.fetchProviderApi("/unknown");
    expect(result.attempted).toBe(false);
    expect(result.error).toBe("Unknown path: /unknown");
  });
});
