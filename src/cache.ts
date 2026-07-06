import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getOpencodeRuntimeDirs } from "./lib/core/runtime-paths";

const CACHE_FILE = "budget-maxxer-quota.json";

export interface CacheEntry {
  provider: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface CacheData {
  entries: CacheEntry[];
  activeProvider?: string;
  updatedAt: number;
}

function getCachePathCandidates(): string[] {
  const { cacheDir } = getOpencodeRuntimeDirs();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const candidates = [cacheDir];
  if (process.platform === "darwin") {
    candidates.push(join(home, ".cache", "opencode"));
    candidates.push(join(home, "Library", "Caches", "opencode"));
  }
  return candidates;
}

function getCachePath(): string {
  const candidates = getCachePathCandidates();
  for (const dir of candidates) {
    const path = join(dir, CACHE_FILE);
    if (existsSync(path)) return path;
  }
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
  writeCache({ entries, activeProvider: cache?.activeProvider, updatedAt: Date.now() });
}

export function getActiveProvider(): string | null {
  const cache = readCache();
  return cache?.activeProvider ?? null;
}

export function setActiveProvider(provider: string): void {
  const cache = readCache();
  writeCache({
    entries: cache?.entries ?? [],
    activeProvider: provider,
    updatedAt: Date.now(),
  });
}
