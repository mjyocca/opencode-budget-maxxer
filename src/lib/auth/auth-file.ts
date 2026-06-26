import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getOpencodeRuntimeDirCandidates } from "../core/runtime-paths";
import { pickFirstExisting } from "../core/path-pick";
import { Mutex } from "../core/mutex";
import type { AuthData } from "./types";

const DEFAULT_MAX_AGE_MS = 5_000;

interface CacheEntry {
  value: AuthData | null;
  timestamp: number;
  inFlight?: Promise<AuthData | null>;
}

let cache: CacheEntry | null = null;
const readMutex = new Mutex(); // guards concurrent cache writes

/**
 * All candidate paths for auth.json in priority order.
 * Uses dataDirs (not configDirs) - opencode writes auth to its data directory.
 */
export function getAuthFileCandidates(): string[] {
  const { dataDirs } = getOpencodeRuntimeDirCandidates();
  return dataDirs.map((d) => join(d, "auth.json"));
}

/**
 * Read auth.json - tries all candidate paths, returns first that exists.
 * Returns null if no auth.json found anywhere.
 */
export async function readAuthFile(): Promise<AuthData | null> {
  const candidates = getAuthFileCandidates();
  const path = pickFirstExisting(candidates);
  if (!path) return null;

  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

/**
 * Cached auth reader - safe to call on every chat.params hook firing.
 * Uses Mutex from mutex.ts to prevent concurrent cache stampedes.
 */
export async function readAuthFileCached(opts?: {
  maxAgeMs?: number;
}): Promise<AuthData | null> {
  const maxAge = opts?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const now = Date.now();

  if (cache && now - cache.timestamp <= maxAge && !cache.inFlight) {
    return cache.value;
  }

  return readMutex.runExclusive(async () => {
    if (cache && Date.now() - cache.timestamp <= maxAge) return cache.value;
    const value = await readAuthFile();
    cache = { value, timestamp: Date.now() };
    return value;
  });
}

/** Test helper - clears the module-level cache between test cases */
export function clearAuthFileCache(): void {
  cache = null;
}
