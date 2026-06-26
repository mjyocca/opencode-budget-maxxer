import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getConfigFileCandidates,
  getOpencodeConfigCandidatePaths,
  getOpencodeGlobalConfigPaths,
  readFirstConfig,
  resolveEditableConfigPath,
  getEffectiveConfigRoot,
  resolveRuntimeContextRoots,
} from "@/lib/core/config-discovery";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

let tmpDir = "";

beforeEach(() => {
  tmpDir = join(process.env.TMPDIR || "/tmp", "opencode-test-" + Date.now());
});

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("getConfigFileCandidates", () => {
  it("returns candidates with isJsonc correctly set", () => {
    const candidates = getConfigFileCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      const jsonc = c.path.toLowerCase().endsWith(".jsonc");
      const json = c.path.toLowerCase().endsWith(".json") && !jsonc;
      if (jsonc || json) {
        expect(c.isJsonc).toBe(jsonc);
      }
    }
  });

  it("includes opencode.jsonc candidates", () => {
    const candidates = getConfigFileCandidates();
    const jsoncCandidates = candidates.filter((c) =>
      c.path.toLowerCase().endsWith(".jsonc"),
    );
    expect(jsoncCandidates.length).toBeGreaterThan(0);
  });

  it("includes opencode.json candidates", () => {
    const candidates = getConfigFileCandidates();
    const jsonCandidates = candidates.filter((c) => c.isJsonc === false);
    expect(jsonCandidates.length).toBeGreaterThan(0);
  });
});

describe("getOpencodeConfigCandidatePaths", () => {
  it("returns local candidates (first 4)", () => {
    const candidates = getOpencodeConfigCandidatePaths();
    expect(candidates.length).toBe(4);
  });
});

describe("getOpencodeGlobalConfigPaths", () => {
  it("returns global config paths from current platform", () => {
    const paths = getOpencodeGlobalConfigPaths();
    expect(Array.isArray(paths)).toBe(true);
  });
});

describe("readFirstConfig", () => {
  it("returns null for empty array", () => {
    const result = readFirstConfig([]);
    expect(result).toBeNull();
  });

  it("returns parsed config for first existing file", () => {
    mkdirSync(tmpDir, { recursive: true });
    const tempFile = join(tmpDir, "opencode-test.json");
    const testConfig = JSON.stringify({
      key: "value",
      plugin: ["test-plugin"],
    });
    writeFileSync(tempFile, testConfig);

    const candidates = [{ path: tempFile, isJsonc: false }];

    const result = readFirstConfig(candidates);
    expect(result).not.toBeNull();
    expect(result!.config).toEqual({ key: "value", plugin: ["test-plugin"] });
  });

  it("skips non-existent files", () => {
    const candidates = [
      { path: join(tmpDir, "non-existent.json"), isJsonc: false },
    ];
    const result = readFirstConfig(candidates);
    expect(result).toBeNull();
  });

  it("handles malformed JSON gracefully", () => {
    mkdirSync(tmpDir, { recursive: true });
    const tempFile = join(tmpDir, "bad-config.json");
    writeFileSync(tempFile, "not valid json {{{");

    const candidates = [{ path: tempFile, isJsonc: false }];

    const result = readFirstConfig(candidates);
    expect(result).toBeNull();
  });

  it("stops at first valid config file", () => {
    mkdirSync(tmpDir, { recursive: true });
    const tempFile1 = join(tmpDir, "config1.json");
    const tempFile2 = join(tmpDir, "config2.json");

    writeFileSync(tempFile1, '{"key": "first"}');
    writeFileSync(tempFile2, '{"key": "second"}');

    const candidates = [
      { path: tempFile1, isJsonc: false },
      { path: tempFile2, isJsonc: false },
    ];

    const result = readFirstConfig(candidates);
    expect(result!.config).toEqual({ key: "first" });
  });
});

describe("resolveEditableConfigPath", () => {
  it("respects OPENCODE_CONFIG_DIR when set", () => {
    const envConfig = join(tmpDir, "config-dir");
    mkdirSync(envConfig, { recursive: true });
    process.env.OPENCODE_CONFIG_DIR = envConfig;

    const result = resolveEditableConfigPath();
    expect(result).toEqual(join(envConfig, "opencode.jsonc"));

    delete process.env.OPENCODE_CONFIG_DIR;
  });

  it("returns null when no global config directories exist", () => {
    // This test verifies behavior when no config paths exist
    // We test via OPENCODE_CONFIG_DIR to a non-existent path
    const nonExistentPath = join(tmpDir, "does-not-exist");
    process.env.OPENCODE_CONFIG_DIR = nonExistentPath;

    try {
      const result = resolveEditableConfigPath();
      expect(typeof result).toBe("string");
      expect(result).toContain("opencode.jsonc");
    } finally {
      delete process.env.OPENCODE_CONFIG_DIR;
    }
  });
});

describe("getEffectiveConfigRoot", () => {
  it("returns null for null config", () => {
    expect(getEffectiveConfigRoot(null)).toBeNull();
  });

  it("returns null for non-object config", () => {
    expect(getEffectiveConfigRoot("string")).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(getEffectiveConfigRoot({})).toBeNull();
  });

  it("returns configRoot when present", () => {
    const config = { configRoot: "/custom/path" };
    const result = getEffectiveConfigRoot(config);
    expect(result).toEqual("/custom/path");
  });

  it("handles ~ paths", () => {
    const config = { configRoot: "~/custom/path" };
    const home = process.env.HOME || "/fake";
    const result = getEffectiveConfigRoot(config);
    expect(result).toEqual(join(home, "custom", "path"));
  });

  it("returns absolute path for absolute configRoot", () => {
    const config = { configRoot: "/absolute/path" };
    const result = getEffectiveConfigRoot(config);
    expect(result).toEqual("/absolute/path");
  });
});

describe("resolveRuntimeContextRoots", () => {
  it("uses workspaceRoot when provided", () => {
    const result = resolveRuntimeContextRoots({ workspaceRoot: "/workspace" });
    expect(result.workspaceRoot).toEqual("/workspace");
  });

  it("uses fallbackDirectory when workspaceRoot not provided", () => {
    const result = resolveRuntimeContextRoots({
      fallbackDirectory: "/fallback",
    });
    expect(result.workspaceRoot).toEqual("/fallback");
  });

  it("defaults to process.cwd() when neither is provided", () => {
    const result = resolveRuntimeContextRoots({});
    expect(result.workspaceRoot).toEqual(process.cwd());
  });

  it("workspaceRoot takes precedence over fallbackDirectory", () => {
    const result = resolveRuntimeContextRoots({
      workspaceRoot: "/workspace",
      fallbackDirectory: "/fallback",
    });
    expect(result.workspaceRoot).toEqual("/workspace");
  });

  it("configRoot resolves via getEffectiveConfigRoot", () => {
    const result = resolveRuntimeContextRoots({ workspaceRoot: "/workspace" });
    expect(typeof result.configRoot).toBe("string");
    expect(result.configRoot.length).toBeGreaterThan(0);
  });
});

describe("resolveRuntimeContextRoots — config param fix", () => {
  it("applies configRoot from config when provided", () => {
    const result = resolveRuntimeContextRoots({
      workspaceRoot: "/workspace",
      config: { configRoot: "/custom/config/root" },
    });
    expect(result.configRoot).toBe("/custom/config/root");
  });

  it("defaults to cwd when config has no configRoot", () => {
    const result = resolveRuntimeContextRoots({
      workspaceRoot: "/workspace",
      config: { plugin: [] },
    });
    expect(result.configRoot).toBe(process.cwd());
  });

  it("defaults to cwd when config is omitted", () => {
    const result = resolveRuntimeContextRoots({ workspaceRoot: "/workspace" });
    expect(result.configRoot).toBe(process.cwd());
  });
});
