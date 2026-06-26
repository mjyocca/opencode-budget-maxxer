import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveEnvTemplate } from "@/lib/core/env-template";
import type { AllowedEnv } from "@/lib/core/env-template";

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  Object.keys(process.env).forEach((key) => {
    if (savedEnv[key] !== undefined) {
      process.env[key as keyof typeof process.env] = savedEnv[key] as string;
    } else {
      delete process.env[key as keyof typeof process.env];
    }
  });
});

describe("resolveEnvTemplate", () => {
  it("returns input unchanged when no template found", () => {
    expect(resolveEnvTemplate("literal-value")).toBe("literal-value");
  });

  it("returns input for empty string", () => {
    expect(resolveEnvTemplate("")).toBe("");
  });

  it("resolves valid template with env var set", () => {
    process.env.TEST_KEY = "test-value";
    expect(resolveEnvTemplate("{env:TEST_KEY}")).toBe("test-value");
  });

  it("resolves multiple templates in one string", () => {
    process.env.KEY1 = "val1";
    process.env.KEY2 = "val2";
    const result = resolveEnvTemplate("{env:KEY1} and {env:KEY2}");
    expect(result).toBe("val1 and val2");
  });

  it("returns null when env var is not set", () => {
    expect(resolveEnvTemplate("{env:NONEXISTENT_VAR}")).toBe(null);
  });

  it("returns null when env var allowlist is not present", () => {
    process.env.TEST_KEY = "test-value";
    expect(resolveEnvTemplate("{env:TEST_KEY}")).toBe("test-value");
  });
});

describe("resolveEnvTemplate — AllowedEnv object allowlist", () => {
  it("allows var present in AllowedEnv object array", () => {
    process.env.TEST_ALLOWED_VAR = "hello";
    const allowed: AllowedEnv[] = [{ name: "TEST_ALLOWED_VAR", category: "test" }];
    const result = resolveEnvTemplate("{env:TEST_ALLOWED_VAR}", allowed);
    expect(result).toBe("hello");
  });

  it("blocks var not in AllowedEnv object array", () => {
    process.env.TEST_BLOCKED_VAR = "secret";
    const allowed: AllowedEnv[] = [{ name: "OTHER_VAR", category: "test" }];
    const result = resolveEnvTemplate("{env:TEST_BLOCKED_VAR}", allowed);
    expect(result).toBeNull();
  });

  it("resolves when allowed list is null (no restriction)", () => {
    process.env.TEST_FREE_VAR = "free";
    const result = resolveEnvTemplate("{env:TEST_FREE_VAR}", null);
    expect(result).toBe("free");
  });
});
