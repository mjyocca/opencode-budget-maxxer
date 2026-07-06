import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getOpencodeRuntimeDirs } from "./lib/core/runtime-paths";
import { Mutex } from "./lib/core/mutex";

const CACHE_FILE = "budget-maxxer-quota.json";

const cacheMutex = new Mutex();

export interface CacheEntry {
  provider: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SessionState {
  activeProvider?: string;
  overrideProvider?: string;
}

export interface CacheData {
  entries: CacheEntry[];
  sessions?: Record<string, SessionState>;
  activeProvider?: string;
  updatedAt: number;
}

const PROVIDER_ALIASES: Record<string, string> = {
  "opencode-go": "opencode-go",
  "opencode": "opencode",
  "copilot": "copilot",
  "github-copilot": "copilot",
  "copilot-chat": "copilot",
  "github-copilot-chat": "copilot",
};

export function mapProviderID(opencodeID: string | undefined): string | null {
  if (!opencodeID) return null;
  return PROVIDER_ALIASES[opencodeID] ?? null;
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

function migrateCache(data: CacheData): CacheData {
  if (data.activeProvider && !data.sessions) {
    return {
      ...data,
      sessions: { default: { activeProvider: data.activeProvider } },
      activeProvider: undefined,
    };
  }
  return data;
}

export function readCache(): CacheData | null {
  const path = getCachePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as CacheData;
    return migrateCache(data);
  } catch {
    return null;
  }
}

export function writeCache(data: CacheData): void {
  const path = getCachePath();
  writeFileSync(path, JSON.stringify({ ...data, updatedAt: Date.now() }), "utf-8");
}

export async function mergeQuotaCache(provider: string, data: Record<string, unknown>): Promise<void> {
  return cacheMutex.runExclusive(async () => {
    const cache = readCache();
    const entries = cache?.entries ?? [];
    const existingIdx = entries.findIndex((e) => e.provider === provider);
    const entry: CacheEntry = { provider, timestamp: Date.now(), data };
    if (existingIdx >= 0) {
      entries[existingIdx] = entry;
    } else {
      entries.push(entry);
    }
    writeCache({ entries, sessions: cache?.sessions, updatedAt: Date.now() });
  });
}

export async function getSessionState(sessionID: string): Promise<SessionState | null> {
  const cache = readCache();
  return cache?.sessions?.[sessionID] ?? null;
}

export async function setSessionActiveProvider(sessionID: string, providerID: string): Promise<void> {
  return cacheMutex.runExclusive(async () => {
    const cache = readCache();
    const sessions = cache?.sessions ?? {};
    const existing = sessions[sessionID] ?? {};
    sessions[sessionID] = { ...existing, activeProvider: providerID };
    writeCache({ entries: cache?.entries ?? [], sessions, updatedAt: Date.now() });
  });
}

export async function setSessionOverrideProvider(sessionID: string, providerID: string | null): Promise<void> {
  return cacheMutex.runExclusive(async () => {
    const cache = readCache();
    const sessions = cache?.sessions ?? {};
    const existing = sessions[sessionID] ?? {};
    if (providerID === null) {
      delete existing.overrideProvider;
    } else {
      existing.overrideProvider = providerID;
    }
    sessions[sessionID] = existing;
    writeCache({ entries: cache?.entries ?? [], sessions, updatedAt: Date.now() });
  });
}

export async function getActiveProvider(): Promise<string | null> {
  const cache = readCache();
  return cache?.sessions?.default?.activeProvider ?? null;
}

export async function setActiveProvider(provider: string): Promise<void> {
  return cacheMutex.runExclusive(async () => {
    const cache = readCache();
    const sessions = cache?.sessions ?? {};
    const existing = sessions.default ?? {};
    sessions.default = { ...existing, activeProvider: provider };
    writeCache({
      entries: cache?.entries ?? [],
      sessions,
      updatedAt: Date.now(),
    });
  });
}
