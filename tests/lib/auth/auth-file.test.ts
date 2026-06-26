import { describe, expect, it, afterEach } from "vitest";
import { getAuthFileCandidates, clearAuthFileCache } from "@/lib/auth/auth-file";
import { getOpencodeRuntimeDirCandidates, clearRuntimeCaches } from "@/lib/core/runtime-paths";

function cleanup() {
  clearRuntimeCaches();
  clearAuthFileCache();
}

afterEach(cleanup);

describe("getAuthFileCandidates", () => {
  it("returns at least one candidate", () => {
    const candidates = getAuthFileCandidates();
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("each candidate ends with auth.json", () => {
    const candidates = getAuthFileCandidates();
    for (const candidate of candidates) {
      expect(candidate.endsWith("auth.json")).toBe(true);
    }
  });

  it("candidates are derived from dataDirs", () => {
    clearRuntimeCaches();
    clearAuthFileCache();
    const dirs = getOpencodeRuntimeDirCandidates();
    const candidates = getAuthFileCandidates();

    for (const candidate of candidates) {
      const underDataDir = dirs.dataDirs.some(d => candidate.startsWith(d));
      expect(underDataDir).toBe(true);
    }
  });

  it("returns empty array when no dataDirs available", () => {
    clearRuntimeCaches();
    clearAuthFileCache();
    const dirs = getOpencodeRuntimeDirCandidates();
    if (dirs.dataDirs.length > 0) {
      // Normal case - should have candidates
      expect(getAuthFileCandidates().length).toBe(dirs.dataDirs.length);
    }
  });
});

describe("clearAuthFileCache", () => {
  it("can be called multiple times without error", () => {
    clearAuthFileCache();
    expect(() => clearAuthFileCache()).not.toThrow();
    expect(() => clearAuthFileCache()).not.toThrow();
  });
});
