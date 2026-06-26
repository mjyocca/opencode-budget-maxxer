/**
 * path-pick.ts — Pick first existing path from candidates
 *
 * Deterministic fallback: iterate candidate paths, return first where
 * `existsSync` is true.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

interface PickOptions {
  /** Called for each candidate with (path, exists, index) */
  onChecked?: (path: string, exists: boolean, index: number) => void;
}

/**
 * Iterate candidate paths and return the first where `existsSync` is true.
 * Handles `~` tilde expansion and absolute/relative paths.
 */
function pickFirstExisting(
  paths: string[],
  opts?: PickOptions,
): string | undefined {
  if (!paths?.length) return undefined;

  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!p) continue;

    const candidate = toAbsolutePath(p);
    const exists = existsSync(candidate);

    opts?.onChecked?.(candidate, exists, i);

    if (exists) return candidate;
  }

  return undefined;
}

/** Convert a path string to an absolute path, handling tilde expansion. */
function toAbsolutePath(p: string): string {
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    return resolve(home, p.slice(2));
  }
  return resolve(p);
}

export { pickFirstExisting };
