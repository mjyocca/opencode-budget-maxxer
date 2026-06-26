/**
 * config-discovery.ts — Find and read opencode config files
 *
 * Discovers config file candidates (.json/.jsonc, local/global), resolves
 * editable paths, respects OPENCODE_CONFIG_DIR.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getOpencodeRuntimeDirCandidates } from "./runtime-paths";
import { parseJsonOrJsoncWithPath } from "./jsonc";
import type { ParseResult } from "./jsonc";

export interface ConfigFileCandidate {
  path: string;
  isJsonc: boolean;
}

function getConfigFileCandidates(): ConfigFileCandidate[] {
  const candidates: ConfigFileCandidate[] = [
    { path: ".opencode/opencode.jsonc", isJsonc: true },
    { path: ".opencode/opencode.json", isJsonc: false },
    { path: "opencode.jsonc", isJsonc: true },
    { path: "opencode.json", isJsonc: false },
  ];

  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  candidates.push(
    { path: join(home, ".opencode", "opencode.jsonc"), isJsonc: true },
    { path: join(home, ".opencode", "opencode.json"), isJsonc: false },
    {
      path: join(home, ".config", "opencode", "opencode.jsonc"),
      isJsonc: true,
    },
    {
      path: join(home, ".config", "opencode", "opencode.json"),
      isJsonc: false,
    },
  );

  const globalDirs = getOpencodeRuntimeDirCandidates().configDirs;
  for (const dir of globalDirs) {
    candidates.push(
      { path: join(dir, "opencode.jsonc"), isJsonc: true },
      { path: join(dir, "opencode.json"), isJsonc: false },
    );
  }

  return candidates;
}

function getOpencodeConfigCandidatePaths(): ConfigFileCandidate[] {
  return getConfigFileCandidates().slice(0, 4);
}

function getOpencodeGlobalConfigPaths(): ConfigFileCandidate[] {
  const globalDirs = getOpencodeRuntimeDirCandidates().configDirs;
  return globalDirs.flatMap((dir) => [
    { path: join(dir, "opencode.jsonc"), isJsonc: true },
    { path: join(dir, "opencode.json"), isJsonc: false },
  ]);
}

function readOpencodeConfig(candidate: ConfigFileCandidate): ParseResult {
  try {
    const content = readFileSync(candidate.path, "utf-8");
    return parseJsonOrJsoncWithPath(content, candidate.path);
  } catch {
    return {
      config: undefined,
      path: candidate.path,
      isJsonc: candidate.isJsonc,
    };
  }
}

function readFirstConfig(
  candidates: ConfigFileCandidate[],
): ParseResult | null {
  for (const candidate of candidates) {
    try {
      const content = readFileSync(candidate.path, "utf-8");
      return parseJsonOrJsoncWithPath(content, candidate.path);
    } catch {
      continue;
    }
  }
  return null;
}

function resolveEditableConfigPath(): string | null {
  const envConfigDir = process.env.OPENCODE_CONFIG_DIR;
  if (envConfigDir) {
    return resolve(envConfigDir, "opencode.jsonc");
  }

  const existing = readFirstConfig(getConfigFileCandidates());
  if (existing) return existing.path;

  const globalDirs = getOpencodeRuntimeDirCandidates().configDirs;
  if (globalDirs.length > 0) {
    return join(globalDirs[0], "opencode.jsonc");
  }

  // No sensible fallback when neither env nor existing files provide a path
  return null;
}

function getEffectiveConfigRoot(config: unknown): string | null {
  if (!config || typeof config !== "object") return null;
  const obj = config as Record<string, unknown>;
  const root = obj.configRoot as string | undefined;
  if (!root) return null;

  const baseDir = process.env.HOME;
  return resolve(
    root.startsWith("~") ? join(baseDir ?? "", root.slice(2)) : root,
  );
}

interface ContextRoots {
  workspaceRoot: string;
  configRoot: string;
}

function resolveRuntimeContextRoots(params: {
  workspaceRoot?: string;
  fallbackDirectory?: string;
  config?: unknown;
}): ContextRoots {
  const workspaceRoot =
    params.workspaceRoot ?? params.fallbackDirectory ?? process.cwd();
  return {
    workspaceRoot: resolve(workspaceRoot),
    configRoot: resolve(
      getEffectiveConfigRoot(params.config ?? {}) ?? process.cwd(),
    ),
  };
}

export {
  getConfigFileCandidates,
  getOpencodeConfigCandidatePaths,
  getOpencodeGlobalConfigPaths,
  readOpencodeConfig,
  readFirstConfig,
  resolveEditableConfigPath,
  getEffectiveConfigRoot,
  resolveRuntimeContextRoots,
  type ContextRoots,
};
