/**
 * runtime-paths.ts — OpenCode runtime directories
 *
 * Resolve opencode's data, config, cache, state directories with XDG-basedir
 * semantics and platform fallbacks.
 */

import { homedir } from "node:os";
import { join, resolve } from "node:path";

const APP_NAME = "opencode";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getUserHome(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? homedir();
}

function getConfigAppDir(base: string): string {
  return join(base, APP_NAME);
}

function expandTilde(p: string): string {
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return join(homedir(), p.slice(2));
  }
  return resolve(p);
}

// ─── public types ────────────────────────────────────────────────────────────

export interface RuntimeDirs {
  configDir: string;
  dataDir: string;
  cacheDir: string;
  stateDir: string;
}

export interface DirsResult {
  configDirs: string[];
  dataDirs: string[];
  cacheDirs: string[];
  stateDirs: string[];
}

export interface AuthPaths {
  authFilePath: string;
  configDirs: string[];
  dataDirs: string[];
}

// ─── platform-specific getters ───────────────────────────────────────────────

function getXdgConfigDirs(): string[] {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return [xdg];
  return [join(getUserHome(), ".config")];
}

function getXdgDataDirs(): string[] {
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return [xdg];
  return [join(getUserHome(), ".local", "share")];
}

function getXdgCacheDirs(): string[] {
  const xdg = process.env.XDG_CACHE_HOME;
  if (xdg) return [xdg];
  return [join(getUserHome(), ".cache")];
}

function getXdgStateDirs(): string[] {
  const xdg = process.env.XDG_STATE_HOME;
  if (xdg) return [xdg];
  return [join(getUserHome(), ".local", "state")];
}

function getDarwinConfigDirs(): string[] {
  return [join(getUserHome(), "Library", "Application Support", APP_NAME)];
}

function getDarwinDataDirs(): string[] {
  return [join(getUserHome(), "Library", "Application Support", APP_NAME)];
}

function getDarwinCacheDirs(): string[] {
  return [join(getUserHome(), "Library", "Caches", APP_NAME)];
}

function getDarwinStateDirs(): string[] {
  return [join(getUserHome(), "Library", "StateStore", APP_NAME)];
}

function getWinUserDataDirs(): string[] {
  const appData = process.env.APPDATA;
  const localAppData = process.env.LOCALAPPDATA;
  if (appData && localAppData) {
    return [join(localAppData, APP_NAME), join(appData, APP_NAME)];
  }

  if (appData) return [join(appData, APP_NAME)];
  return [join(getUserHome(), APP_NAME)];
}

function getWinCacheDirs(): string[] {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) return [join(localAppData, APP_NAME)];
  return [join(getUserHome(), "AppData", "Local", APP_NAME)];
}

function getWinStateDirs(): string[] {
  const appData = process.env.APPDATA;
  if (appData) return [join(appData, APP_NAME)];
  return [join(getUserHome(), APP_NAME)];
}

// ─── cached getters ──────────────────────────────────────────────────────────

let _configDirsCache: string[] | undefined;
let _dataDirsCache: string[] | undefined;
let _cacheDirsCache: string[] | undefined;
let _stateDirsCache: string[] | undefined;

function getRuntimeConfigDirs(): string[] {
  if (_configDirsCache) return _configDirsCache;

  if (process.env.OPENCODE_CONFIG_DIR) {
    return (_configDirsCache = [expandTilde(process.env.OPENCODE_CONFIG_DIR)]);
  }

  if (process.platform === "darwin") {
    return (_configDirsCache = getDarwinConfigDirs());
  }

  if (process.platform === "win32") {
    return (_configDirsCache = getWinUserDataDirs());
  }

  return (_configDirsCache = getXdgConfigDirs().map((d) => getConfigAppDir(d)));
}

function getRuntimeDataDirs(): string[] {
  if (_dataDirsCache) return _dataDirsCache;

  if (process.platform === "darwin") {
    return (_dataDirsCache = getDarwinDataDirs());
  }

  if (process.platform === "win32") {
    return (_dataDirsCache = getWinUserDataDirs());
  }

  const xdgData = getXdgDataDirs();
  _dataDirsCache = xdgData.map((d) => getConfigAppDir(d));
  return _dataDirsCache;
}

function getRuntimeCacheDirs(): string[] {
  if (_cacheDirsCache) return _cacheDirsCache;

  if (process.platform === "darwin")
    return (_cacheDirsCache = getDarwinCacheDirs());

  if (process.platform === "win32")
    return (_cacheDirsCache = getWinCacheDirs());

  const xdg = getXdgCacheDirs();
  _cacheDirsCache = xdg.map((d) => getConfigAppDir(d));
  return _cacheDirsCache;
}

function getRuntimeStateDirs(): string[] {
  if (_stateDirsCache) return _stateDirsCache;

  if (process.platform === "darwin")
    return (_stateDirsCache = getDarwinStateDirs());

  if (process.platform === "win32")
    return (_stateDirsCache = getWinStateDirs());

  const xdg = getXdgStateDirs();
  _stateDirsCache = xdg.map((d) => getConfigAppDir(d));
  return _stateDirsCache;
}

// ─── public API ──────────────────────────────────────────────────────────────

function clearRuntimeCaches(): void {
  _configDirsCache = undefined;
  _dataDirsCache = undefined;
  _cacheDirsCache = undefined;
  _stateDirsCache = undefined;
}

/**
 * Resolve opencode's primary runtime directories.
 *
 * Linux:   configDir = ~/.config/opencode
 *           dataDir = ~/.local/share/opencode
 * macOS:   configDir = ~/Library/Application Support/opencode
 *           dataDir = ~/Library/Application Support/opencode
 * Windows: configDir = %APPDATA%/opencode
 *           dataDir = %LOCALAPPDATA%/opencode
 */
function getOpencodeRuntimeDirs(): RuntimeDirs {
  const configDirs = getRuntimeConfigDirs();
  const dataDirs = getRuntimeDataDirs();
  const cacheDirs = getRuntimeCacheDirs();
  const stateDirs = getRuntimeStateDirs();

  return {
    configDir: configDirs[0] ?? join(getUserHome(), ".config", APP_NAME),
    dataDir: dataDirs[0] ?? join(getUserHome(), ".local", "share", APP_NAME),
    cacheDir: cacheDirs[0] ?? join(getUserHome(), ".cache", APP_NAME),
    stateDir: stateDirs[0] ?? join(getUserHome(), ".local", "state", APP_NAME),
  };
}

/**
 * Return all candidate directories for each runtime type in precedence order.
 */
function getOpencodeRuntimeDirCandidates(): DirsResult {
  return {
    configDirs: getRuntimeConfigDirs(),
    dataDirs: getRuntimeDataDirs(),
    cacheDirs: getRuntimeCacheDirs(),
    stateDirs: getRuntimeStateDirs(),
  };
}

/** Returns directories where auth.json may live. */
function getAuthPaths(): AuthPaths {
  const dirs = getOpencodeRuntimeDirCandidates();
  return {
    configDirs: dirs.configDirs,
    dataDirs: dirs.dataDirs,
    authFilePath: dirs.dataDirs[0]
      ? join(dirs.dataDirs[0], "auth.json")
      : "",
  };
}

export {
  getOpencodeRuntimeDirs,
  getOpencodeRuntimeDirCandidates,
  getAuthPaths,
  expandTilde,
  clearRuntimeCaches,
};
