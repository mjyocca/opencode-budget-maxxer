import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { resolveCredential } from "@/lib/auth/credentials";
import { clearAuthFileCache } from "@/lib/auth/auth-file";
import { readFirstConfig, getOpencodeConfigCandidatePaths } from "@/lib/core/config-discovery";

function cleanup() {
  clearAuthFileCache();
  // Clean up any process env we set
}

afterEach(cleanup);

describe("resolveCredential", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("returns env source when env var set", async () => {
    process.env["EXAMPLE_API_KEY"] = "env-key-123";
    const result = await resolveCredential("example", { envVars: ["EXAMPLE_API_KEY"] });
    expect(result).not.toBeNull();
    expect(result?.value).toBe("env-key-123");
    expect(result?.source).toBe("env");
  });

  it("env takes priority over config", async () => {
    process.env["EXAMPLE_API_KEY"] = "env-key-123";
    const result = await resolveCredential("example", { envVars: ["EXAMPLE_API_KEY"] });
    expect(result?.source).toBe("env");
    expect(result?.value).toBe("env-key-123");
  });

  it("returns null when nothing found", async () => {
    const result = await resolveCredential("example", { envVars: ["NONEXISTENT_VAR_12345"] });
    expect(result).toBeNull();
  });
});
