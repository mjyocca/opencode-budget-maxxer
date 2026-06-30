import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { queryGoRateLimit } from "@/providers/opencode-go/go.api";
import * as goAuth from "@/providers/opencode-go/go.auth";

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

  it("returns notAttempted when no token", async () => {
    vi.spyOn(goAuth, "resolveGoToken").mockResolvedValue(null);
    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it("returns failed on 401", async () => {
    vi.spyOn(goAuth, "resolveGoToken").mockResolvedValue("invalid-token");
    vi.spyOn(goAuth, "resolveGoWorkspaceId").mockResolvedValue("ws-123");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit();
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.rolling5h).toBeNull();
    expect(result.data?.weekly).toBeNull();
    expect(result.data?.monthly).toBeNull();
  });

  it("respects timeoutMs option", async () => {
    vi.spyOn(goAuth, "resolveGoToken").mockResolvedValue("test-token");
    vi.spyOn(goAuth, "resolveGoWorkspaceId").mockResolvedValue("ws-123");

    const mockFetch = vi.fn().mockImplementation(() => {
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(new Response(JSON.stringify({}), { status: 200 }));
        }, 100);
      });
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await queryGoRateLimit({ timeoutMs: 50 });
    expect(result.attempted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.rolling5h).toBeNull();
    expect(result.data?.weekly).toBeNull();
    expect(result.data?.monthly).toBeNull();
  });
});
