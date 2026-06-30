import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { resolveGoToken, resolveGoWorkspaceId, GO_AUTH_KEYS } from "@/providers/opencode-go/go.auth";
import { clearAuthFileCache } from "@/lib/auth/auth-file";

afterEach(() => {
  clearAuthFileCache();
});

describe("resolveGoToken", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("returns OPENCODE_GO_TOKEN when set", async () => {
    process.env["OPENCODE_GO_TOKEN"] = "go-token-123";
    const result = await resolveGoToken();
    expect(result).toBe("go-token-123");
  });

  it("returns GO_TOKEN when set", async () => {
    process.env["GO_TOKEN"] = "go-token-456";
    const result = await resolveGoToken();
    expect(result).toBe("go-token-456");
  });

  it("OPENCODE_GO_TOKEN takes priority over GO_TOKEN", async () => {
    process.env["OPENCODE_GO_TOKEN"] = "go-token-primary";
    process.env["GO_TOKEN"] = "go-token-fallback";
    const result = await resolveGoToken();
    expect(result).toBe("go-token-primary");
  });

  it("returns null when no credentials found", async () => {
    const result = await resolveGoToken();
    expect(result).toBeNull();
  });
});

describe("resolveGoWorkspaceId", () => {
  it("returns null when no auth found", async () => {
    const result = await resolveGoWorkspaceId();
    expect(result).toBeNull();
  });
});

describe("GO_AUTH_KEYS", () => {
  it("contains expected keys", () => {
    expect(GO_AUTH_KEYS).toContain("opencode-go");
    expect(GO_AUTH_KEYS).toContain("opencode_go");
    expect(GO_AUTH_KEYS).toContain("go");
  });
});
