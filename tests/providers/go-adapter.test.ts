import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { OpenCodeGoAdapter } from "@/providers/opencode-go/go";
import type { AdapterContext } from "@/lib/adapter/types";

describe("OpenCodeGoAdapter", () => {
  let adapter: OpenCodeGoAdapter;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    adapter = new OpenCodeGoAdapter();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("id is 'opencode-go'", () => {
    expect(adapter.id).toBe("opencode-go");
  });

  it("displayName is 'OpenCode Go'", () => {
    expect(adapter.displayName).toBe("OpenCode Go");
  });

  it("loadAuth returns empty object when no token", async () => {
    const ctx: AdapterContext = { plugin: {} as any };
    const auth = await adapter.loadAuth(ctx);
    expect(auth).toEqual({});
  });

  it("loadAuth returns apiKey and baseURL when token found", async () => {
    process.env["OPENCODE_GO_TOKEN"] = "go-test-token";
    const ctx: AdapterContext = { plugin: {} as any };
    const auth = await adapter.loadAuth(ctx);
    expect(auth.apiKey).toBe("go-test-token");
    expect(auth.baseURL).toBe("https://go.opencode.ai/api/v1");
  });

  it("fetchProviderApi('/rate-limit') delegates to queryGoRateLimit", async () => {
    const result = await adapter.fetchProviderApi("/rate-limit");
    expect(result.attempted).toBe(false);
  });

  it("fetchProviderApi unknown path returns not attempted", async () => {
    const result = await adapter.fetchProviderApi("/unknown");
    expect(result.attempted).toBe(false);
    expect(result.error).toBe("Unknown path: /unknown");
  });
});
