/**
 * cache.ts — Shared quota/usage cache for all providers.
 *
 * Multiple providers (Go, Zen, Copilot) poll their own dashboards and write
 * to the same cache file. This module provides read + merge-write semantics
 * so no provider overwrites another's data.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getOpencodeRuntimeDirs } from "../core/runtime-paths";

const CACHE_FILE = "budget-maxxer-quota.json";

export interface CacheEntry {
  provider: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface CacheData {
  entries: CacheEntry[];
  updatedAt: number;
}

function getCachePathCandidates(): string[] {
  const { cacheDir } = getOpencodeRuntimeDirs();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const candidates = [cacheDir];
  // Fallbacks for macOS where XDG_CACHE_HOME may not be inherited
  if (process.platform === "darwin") {
    candidates.push(join(home, ".cache", "opencode"));
    candidates.push(join(home, "Library", "Caches", "opencode"));
  }
  return candidates;
}

function getCachePath(): string {
  const candidates = getCachePathCandidates();
  // Return first existing cache file path, or first candidate for writing
  for (const dir of candidates) {
    const path = join(dir, CACHE_FILE);
    if (existsSync(path)) return path;
  }
  // Ensure primary directory exists for writing
  mkdirSync(candidates[0], { recursive: true });
  return join(candidates[0], CACHE_FILE);
}

export function readCache(): CacheData | null {
  const path = getCachePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as CacheData;
  } catch {
    return null;
  }
}

export function writeCache(data: CacheData): void {
  const path = getCachePath();
  writeFileSync(path, JSON.stringify({ ...data, updatedAt: Date.now() }), "utf-8");
}

/**
 * Merge a provider's data into the cache.
 * Updates existing entry or appends a new one — never overwrites other providers.
 */
export function mergeQuotaCache(provider: string, data: Record<string, unknown>): void {
  const cache = readCache();
  const entries = cache?.entries ?? [];
  const existingIdx = entries.findIndex((e) => e.provider === provider);
  const entry: CacheEntry = { provider, timestamp: Date.now(), data };
  if (existingIdx >= 0) {
    entries[existingIdx] = entry;
  } else {
    entries.push(entry);
  }
  writeCache({ entries, updatedAt: Date.now() });
}
