import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { resolveCopilotToken, COPILOT_AUTH_KEYS } from "@/providers/copilot/copilot.auth";
import { clearAuthFileCache } from "@/lib/auth/auth-file";

afterEach(() => {
  clearAuthFileCache();
});

describe("resolveCopilotToken", () => {
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

  it("returns GITHUB_TOKEN when set", async () => {
    process.env["GITHUB_TOKEN"] = "gh-token-123";
    const result = await resolveCopilotToken();
    expect(result).toBe("gh-token-123");
  });

  it("returns COPILOT_TOKEN when set", async () => {
    process.env["COPILOT_TOKEN"] = "copilot-token-456";
    const result = await resolveCopilotToken();
    expect(result).toBe("copilot-token-456");
  });

  it("GITHUB_TOKEN takes priority over COPILOT_TOKEN", async () => {
    process.env["GITHUB_TOKEN"] = "gh-token";
    process.env["COPILOT_TOKEN"] = "copilot-token";
    const result = await resolveCopilotToken();
    expect(result).toBe("gh-token");
  });

  it("returns null when no credentials found", async () => {
    const result = await resolveCopilotToken();
    expect(result).toBeNull();
  });
});

describe("COPILOT_AUTH_KEYS", () => {
  it("contains expected keys", () => {
    expect(COPILOT_AUTH_KEYS).toContain("github-copilot");
    expect(COPILOT_AUTH_KEYS).toContain("copilot");
    expect(COPILOT_AUTH_KEYS).toContain("copilot-chat");
    expect(COPILOT_AUTH_KEYS).toContain("github-copilot-chat");
  });
});
