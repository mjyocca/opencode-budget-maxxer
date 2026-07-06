import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { resolveZenCredentials } from "@/providers/opencode-zen/zen.auth";

describe("resolveZenCredentials", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env["OPENCODE_GO_AUTH_COOKIE"];
    delete process.env["OPENCODE_GO_WORKSPACE_ID"];
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("returns credentials when both env vars are set", async () => {
    process.env["OPENCODE_GO_AUTH_COOKIE"] = "Fe26.2**test-cookie";
    process.env["OPENCODE_GO_WORKSPACE_ID"] = "wrk-test-123";
    const result = await resolveZenCredentials();
    expect(result).toEqual({
      authCookie: "Fe26.2**test-cookie",
      workspaceId: "wrk-test-123",
    });
  });

  it("returns null when only cookie is set", async () => {
    process.env["OPENCODE_GO_AUTH_COOKIE"] = "Fe26.2**test-cookie";
    const result = await resolveZenCredentials();
    expect(result).toBeNull();
  });

  it("returns null when only workspace ID is set", async () => {
    process.env["OPENCODE_GO_WORKSPACE_ID"] = "wrk-test-123";
    const result = await resolveZenCredentials();
    expect(result).toBeNull();
  });

  it("returns null when no credentials found", async () => {
    const result = await resolveZenCredentials();
    expect(result).toBeNull();
  });

  it("trims whitespace from env vars", async () => {
    process.env["OPENCODE_GO_AUTH_COOKIE"] = "  Fe26.2**test  ";
    process.env["OPENCODE_GO_WORKSPACE_ID"] = "  wrk-test  ";
    const result = await resolveZenCredentials();
    expect(result).toEqual({
      authCookie: "Fe26.2**test",
      workspaceId: "wrk-test",
    });
  });
});
