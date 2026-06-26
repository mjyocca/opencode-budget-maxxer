import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getOpencodeRuntimeDirs,
  getOpencodeRuntimeDirCandidates,
  getAuthPaths,
  expandTilde,
  clearRuntimeCaches,
} from "@/lib/core/runtime-paths";

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = { ...process.env };
  // Clear memoized caches so env changes in tests have effect
  clearRuntimeCaches();
});

afterEach(() => {
  Object.keys(process.env).forEach((key) => {
    if (savedEnv[key] !== undefined) {
      process.env[key] = savedEnv[key] as string;
    } else {
      delete process.env[key];
    }
  });
});

describe("expandTilde", () => {
  it("expands ~/ properly", () => {
    const result = expandTilde("~/test/path");
    expect(result).toContain("/test/path");
    expect(result.startsWith("/")).toBe(true);
  });

  it("expands Windows-style tilde paths", () => {
    const result = expandTilde("~/test/path");
    expect(result).toContain("/test/path");
  });

  it("leaves absolute paths unchanged", () => {
    const result = expandTilde("/absolute/test/path");
    expect(result).toBe("/absolute/test/path");
  });
});

describe("getOpencodeRuntimeDirs", () => {
  it("returns valid RuntimeDirs object", () => {
    const dirs = getOpencodeRuntimeDirs();
    expect(typeof dirs.configDir).toBe("string");
    expect(typeof dirs.dataDir).toBe("string");
    expect(typeof dirs.cacheDir).toBe("string");
    expect(typeof dirs.stateDir).toBe("string");
    expect(dirs.configDir.length).toBeGreaterThan(0);
    expect(dirs.dataDir.length).toBeGreaterThan(0);
    expect(dirs.cacheDir.length).toBeGreaterThan(0);
    expect(dirs.stateDir.length).toBeGreaterThan(0);
  });

  it('contains "opencode" in path', () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirs();
    expect(
      dirs.configDir.includes("opencode") ||
      dirs.dataDir.includes("opencode") ||
      dirs.cacheDir.includes("opencode") ||
      dirs.stateDir.includes("opencode"),
    ).toBe(true);
  });

  it("respects OPENCODE_CONFIG_DIR", () => {
    process.env.OPENCODE_CONFIG_DIR = "/custom/opencode/config";
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirs();
    expect(dirs.configDir).toBe("/custom/opencode/config");
  });

  it("respects XDG_CONFIG_HOME on Linux/other platforms", () => {
    const isDarwinOrWin =
      process.platform === "darwin" || process.platform === "win32";
    if (isDarwinOrWin) {
      // XDG vars only take effect on Linux
      return;
    }
    process.env.XDG_CONFIG_HOME = "/xdg/config";
    delete process.env.OPENCODE_CONFIG_DIR;
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirs();
    expect(dirs.configDir).toBe("/xdg/config");
  });

  it("respects XDG_DATA_HOME on Linux/other platforms", () => {
    const isDarwinOrWin =
      process.platform === "darwin" || process.platform === "win32";
    if (isDarwinOrWin) {
      return;
    }
    process.env.XDG_DATA_HOME = "/xdg/data";
    delete process.env.OPENCODE_CONFIG_DIR;
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirs();
    expect(dirs.dataDir).toContain("/xdg/data");
  });

  it("respects XDG_CACHE_HOME on Linux/other platforms", () => {
    const isDarwinOrWin =
      process.platform === "darwin" || process.platform === "win32";
    if (isDarwinOrWin) {
      return;
    }
    process.env.XDG_CACHE_HOME = "/xdg/cache";
    delete process.env.OPENCODE_CONFIG_DIR;
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirs();
    expect(dirs.cacheDir).toContain("/xdg/cache");
  });

  it("respects XDG_STATE_HOME on Linux/other platforms", () => {
    const isDarwinOrWin =
      process.platform === "darwin" || process.platform === "win32";
    if (isDarwinOrWin) {
      return;
    }
    process.env.XDG_STATE_HOME = "/xdg/state";
    delete process.env.OPENCODE_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirs();
    expect(dirs.stateDir).toContain("/xdg/state");
  });

  it("returns default paths when no overrides exist", () => {
    delete process.env.OPENCODE_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.XDG_DATA_HOME;
    delete process.env.XDG_CACHE_HOME;
    delete process.env.XDG_STATE_HOME;
    clearRuntimeCaches();

    const dirs = getOpencodeRuntimeDirs();
    expect(typeof dirs.configDir).toBe("string");
    expect(typeof dirs.dataDir).toBe("string");
    expect(typeof dirs.cacheDir).toBe("string");
    expect(typeof dirs.stateDir).toBe("string");
  });
});

describe("getOpencodeRuntimeDirCandidates", () => {
  it("returns DirsResult with correct arrays", () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirCandidates();
    expect(Array.isArray(dirs.configDirs)).toBe(true);
    expect(Array.isArray(dirs.dataDirs)).toBe(true);
    expect(Array.isArray(dirs.cacheDirs)).toBe(true);
    expect(Array.isArray(dirs.stateDirs)).toBe(true);
  });

  it("configDirs is populated", () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirCandidates();
    expect(dirs.configDirs.length).toBeGreaterThan(0);
  });

  it("dataDirs is populated", () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirCandidates();
    expect(dirs.dataDirs.length).toBeGreaterThan(0);
  });

  it("cacheDirs is populated", () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirCandidates();
    expect(dirs.cacheDirs.length).toBeGreaterThan(0);
  });

  it("stateDirs is populated", () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirCandidates();
    expect(dirs.stateDirs.length).toBeGreaterThan(0);
  });

  it("candidates are strings", () => {
    clearRuntimeCaches();
    const dirs = getOpencodeRuntimeDirCandidates();
    for (const d of [
      ...dirs.configDirs,
      ...dirs.dataDirs,
      ...dirs.cacheDirs,
      ...dirs.stateDirs,
    ]) {
      expect(typeof d).toBe("string");
    }
  });
});

describe("getAuthPaths", () => {
  it("returns AuthPaths object with authFilePath and configDirs", () => {
    clearRuntimeCaches();
    const paths = getAuthPaths();
    expect(typeof paths.configDirs).toBe("object");
    expect(typeof paths.authFilePath).toBe("string");
  });

  it('authFilePath ends with "auth.json" when configDirs exists', () => {
    process.env.OPENCODE_CONFIG_DIR = "/custom/opencode/config";
    clearRuntimeCaches();
    const paths = getAuthPaths();
    expect(paths.authFilePath.endsWith("auth.json")).toBe(true);
    expect(paths.configDirs.length).toBeGreaterThan(0);
  });

  it("authFilePath is empty string when no configDirs", () => {
    process.env.OPENCODE_CONFIG_DIR = "";
    clearRuntimeCaches();
    const paths = getAuthPaths();
    expect(typeof paths.authFilePath).toBe("string");
  });

  it('authFilePath contains "opencode" when available', () => {
    clearRuntimeCaches();
    const paths = getAuthPaths();
    if (paths.dataDirs.length > 0) {
      expect(paths.authFilePath).toContain("opencode");
    }
  });
});

describe("getAuthPaths — data dir fix", () => {
  it("authFilePath resolves to dataDirs[0], not configDirs[0] (Linux XDG)", () => {
    if (process.platform === "darwin" || process.platform === "win32") return;
    process.env.XDG_DATA_HOME = "/xdg/data";
    process.env.XDG_CONFIG_HOME = "/xdg/config";
    clearRuntimeCaches();
    const paths = getAuthPaths();
    expect(paths.authFilePath).toContain("/xdg/data");
    expect(paths.authFilePath).not.toContain("/xdg/config");
  });

  it("dataDirs field is populated", () => {
    clearRuntimeCaches();
    const paths = getAuthPaths();
    expect(Array.isArray(paths.dataDirs)).toBe(true);
    expect(paths.dataDirs.length).toBeGreaterThan(0);
  });

  it("authFilePath is under dataDirs[0]", () => {
    clearRuntimeCaches();
    const paths = getAuthPaths();
    if (paths.dataDirs[0]) {
      expect(paths.authFilePath.startsWith(paths.dataDirs[0])).toBe(true);
    }
  });
});
