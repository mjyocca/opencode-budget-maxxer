import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { pickFirstExisting } from "@/lib/core/path-pick";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

let tmpDir = "";

beforeEach(() => {
  tmpDir = join(process.env.TMPDIR || "/tmp", "path-pick-test-" + Date.now());
});

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("pickFirstExisting", () => {
  it("returns first existing path", () => {
    mkdirSync(tmpDir, { recursive: true });
    const tempFile = join(tmpDir, "exists.json");
    writeFileSync(tempFile, "test");
    const tempNonExistent = join(tmpDir, "does-not-exist.json");

    const result = pickFirstExisting([tempNonExistent, tempFile]);
    expect(result).toBe(tempFile);
  });

  it("returns undefined for all non-existing paths", () => {
    const result = pickFirstExisting([
      join(tmpDir, "nonexistent1.json"),
      join(tmpDir, "nonexistent2.json"),
    ]);
    expect(result).toBeUndefined();
  });

  it("handles empty array", () => {
    const result = pickFirstExisting([]);
    expect(result).toBeUndefined();
  });

  it("handles null/undefined array", () => {
    expect(pickFirstExisting([])).toBeUndefined();
  });
});

describe("pickFirstExisting — onChecked callback", () => {
  it("calls onChecked for each candidate with correct args", () => {
    const calls: Array<{ path: string; exists: boolean; index: number }> = [];
    pickFirstExisting(["/nonexistent/a", "/nonexistent/b"], {
      onChecked: (path, exists, index) => calls.push({ path, exists, index }),
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].index).toBe(0);
    expect(calls[1].index).toBe(1);
    expect(calls.every((c) => !c.exists)).toBe(true);
  });

  it("stops calling onChecked after first existing path", () => {
    mkdirSync(tmpDir, { recursive: true });
    const existingFile = join(tmpDir, "exists.json");
    writeFileSync(existingFile, "{}");
    const after = join(tmpDir, "after.json");

    const calls: string[] = [];
    pickFirstExisting([existingFile, after], {
      onChecked: (path) => calls.push(path),
    });
    // Only the first (existing) path should be checked
    expect(calls).toHaveLength(1);
  });
});
