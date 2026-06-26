---
name: plugin-config-patterns
description: Config resolution patterns for opencode plugins — reading config files, JSONC parsing, resolving API keys, runtime paths, env templates. Use when implementing config loading or API key resolution.
---

# Plugin Config Patterns

Comprehensive guide to config resolution in OpenCode plugins. Aligns with the library primitives spec (`specs/features/0001-library-primitives.md`).

---

## Reading OpenCode Config

### SDK Config Access

**Recommended approach — use SDK client:**

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  const configResp = await client.config.get()
  const config = configResp.data
  
  // Access standard config
  const model = config?.model
  const provider = config?.provider
  
  // Access plugin-specific config (experimental namespace)
  const myPluginConfig = config?.experimental?.myPlugin
  
  return { /* hooks */ }
}
```

### Manual Config File Reading

**For advanced use cases (reading from specific paths):**

```ts
import { readFileSync, existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

function getOpencodeConfigPaths(): Array<{ path: string; isJsonc: boolean }> {
  const cwd = process.cwd()
  const home = homedir()
  
  return [
    // Local (project-level) — checked first
    { path: join(cwd, "opencode.jsonc"), isJsonc: true },
    { path: join(cwd, "opencode.json"), isJsonc: false },
    
    // Global (user-level)
    { path: join(home, ".config", "opencode", "opencode.jsonc"), isJsonc: true },
    { path: join(home, ".config", "opencode", "opencode.json"), isJsonc: false },
  ]
}

function readOpencodeConfig(): any | null {
  const candidates = getOpencodeConfigPaths()
  
  for (const { path, isJsonc } of candidates) {
    if (!existsSync(path)) continue
    
    try {
      const raw = readFileSync(path, "utf-8")
      const content = isJsonc ? stripJsoncComments(raw) : raw
      return JSON.parse(content)
    } catch (err) {
      // Continue to next candidate
    }
  }
  
  return null
}
```

---

## JSONC Parsing

JSONC (JSON with Comments) requires stripping comments before parsing:

```ts
function stripJsoncComments(content: string): string {
  // Remove single-line comments (// ...)
  content = content.replace(/\/\/[^\n]*/g, "")
  
  // Remove multi-line comments (/* ... */)
  content = content.replace(/\/\*[\s\S]*?\*\//g, "")
  
  // Remove trailing commas (arrays and objects)
  content = stripTrailingCommas(content)
  
  return content
}

function stripTrailingCommas(content: string): string {
  // Match trailing commas before ] or }
  return content.replace(/,(\s*[\]}])/g, "$1")
}
```

**Usage:**

```ts
const raw = readFileSync("opencode.jsonc", "utf-8")
const clean = stripJsoncComments(raw)
const config = JSON.parse(clean)
```

---

## Resolving Env Templates

OpenCode config uses `{env:VAR_NAME}` syntax:

```ts
{
  "provider": {
    "anthropic": {
      "options": { "apiKey": "{env:ANTHROPIC_API_KEY}" }
    }
  }
}
```

**Resolver:**

```ts
function resolveEnvTemplate(
  value: string,
  allowedVars?: string[]
): string | null {
  // Check if value is an env template
  const match = value.match(/^\{env:([A-Z_][A-Z0-9_]*)\}$/)
  if (!match) return value  // Not a template, return as-is
  
  const varName = match[1]
  
  // Check allowlist if provided
  if (allowedVars && !allowedVars.includes(varName)) {
    return null  // Not allowed
  }
  
  // Resolve from environment
  const resolved = process.env[varName]
  if (!resolved || resolved.trim() === "") {
    return null  // Not set or empty
  }
  
  return resolved.trim()
}
```

**Usage:**

```ts
const apiKey = resolveEnvTemplate("{env:OPENAI_API_KEY}")
// "sk-123..." (if set)

const notAllowed = resolveEnvTemplate("{env:SECRET}", ["ALLOWED_VAR"])
// null (not in allowlist)

const literal = resolveEnvTemplate("literal-value")
// "literal-value" (not a template)
```

---

## Resolving API Keys

API keys can live in multiple locations. **Security boundary:** Never read provider secrets from repo-local config (untrusted).

**Priority order:**
1. Environment variable (highest priority)
2. Global config (`~/.config/opencode/opencode.json`)
3. Auth file (`~/.config/opencode/auth.json`)

```ts
async function resolveProviderApiKey(
  providerID: string,
  envVars: string[],
): Promise<{ key: string; source: string } | null> {
  // 1. Check environment variables
  for (const envVar of envVars) {
    const key = process.env[envVar]
    if (key && key.trim() !== "") {
      return { key: key.trim(), source: "env" }
    }
  }
  
  // 2. Check global config (trusted)
  const globalConfig = readGlobalOpencodeConfig()
  const configKey = globalConfig?.provider?.[providerID]?.options?.apiKey
  if (configKey) {
    const resolved = resolveEnvTemplate(configKey)
    if (resolved) {
      return { key: resolved, source: "config" }
    }
  }
  
  // 3. Check auth.json
  const auth = readAuthFile()
  const authKey = auth?.[providerID]?.key
  if (authKey) {
    return { key: authKey, source: "auth" }
  }
  
  return null  // Not found
}

function readGlobalOpencodeConfig(): any | null {
  const home = homedir()
  const candidates = [
    join(home, ".config", "opencode", "opencode.jsonc"),
    join(home, ".config", "opencode", "opencode.json"),
  ]
  
  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const raw = readFileSync(path, "utf-8")
      const isJsonc = path.endsWith(".jsonc")
      const content = isJsonc ? stripJsoncComments(raw) : raw
      return JSON.parse(content)
    } catch {}
  }
  
  return null
}
```

---

## Reading auth.json

```ts
import { readFileSync, existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

function getAuthPaths(): string[] {
  const home = homedir()
  
  return [
    // macOS/Linux XDG-style
    join(home, ".config", "opencode", "auth.json"),
    
    // macOS Application Support
    join(home, "Library", "Application Support", "opencode", "auth.json"),
    
    // Legacy/fallback
    join(home, ".opencode", "auth.json"),
  ]
}

function readAuthFile(): Record<string, any> | null {
  const candidates = getAuthPaths()
  
  for (const path of candidates) {
    if (!existsSync(path)) continue
    
    try {
      const raw = readFileSync(path, "utf-8")
      return JSON.parse(raw)
    } catch {
      // Continue to next candidate
    }
  }
  
  return null
}
```

**Cached read (for high-frequency hooks):**

```ts
let authCache: { data: any; timestamp: number } | null = null
const AUTH_CACHE_TTL_MS = 5000  // 5 seconds

function readAuthFileCached(maxAgeMs = AUTH_CACHE_TTL_MS): Record<string, any> | null {
  const now = Date.now()
  
  if (authCache && (now - authCache.timestamp) < maxAgeMs) {
    return authCache.data
  }
  
  const data = readAuthFile()
  authCache = { data, timestamp: now }
  
  return data
}

// Clear cache (for testing)
function clearAuthCache() {
  authCache = null
}
```

---

## Runtime Paths

```ts
import { homedir } from "os"
import { join } from "path"

function getOpencodeRuntimeDirs() {
  const home = homedir()
  const platform = process.platform
  
  // Respect OPENCODE_CONFIG_DIR override
  const configDirOverride = process.env.OPENCODE_CONFIG_DIR
  if (configDirOverride) {
    return {
      configDir: configDirOverride,
      dataDir: configDirOverride,
      cacheDir: join(configDirOverride, "cache"),
      stateDir: join(configDirOverride, "state"),
    }
  }
  
  // Platform-specific defaults
  if (platform === "darwin") {
    // macOS — prefer Application Support
    const appSupport = join(home, "Library", "Application Support", "opencode")
    return {
      configDir: appSupport,
      dataDir: appSupport,
      cacheDir: join(home, "Library", "Caches", "opencode"),
      stateDir: appSupport,
    }
  } else if (platform === "win32") {
    // Windows
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming")
    const localAppData = process.env.LOCALAPPDATA || join(home, "AppData", "Local")
    return {
      configDir: join(appData, "opencode"),
      dataDir: join(appData, "opencode"),
      cacheDir: join(localAppData, "opencode", "cache"),
      stateDir: join(appData, "opencode"),
    }
  } else {
    // Linux/Unix — XDG Base Directory
    const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config")
    const xdgData = process.env.XDG_DATA_HOME || join(home, ".local", "share")
    const xdgCache = process.env.XDG_CACHE_HOME || join(home, ".cache")
    const xdgState = process.env.XDG_STATE_HOME || join(home, ".local", "state")
    
    return {
      configDir: join(xdgConfig, "opencode"),
      dataDir: join(xdgData, "opencode"),
      cacheDir: join(xdgCache, "opencode"),
      stateDir: join(xdgState, "opencode"),
    }
  }
}
```

**Usage:**

```ts
const { configDir, dataDir } = getOpencodeRuntimeDirs()
// macOS: configDir = ~/Library/Application Support/opencode
// Linux: configDir = ~/.config/opencode
// Windows: configDir = %APPDATA%/opencode
```

---

## Example: Complete Config Resolver

`src/lib/config-resolver.ts`:

```ts
import { readFileSync, existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

export function getOpencodeConfigPaths(): Array<{ path: string; isJsonc: boolean }> {
  const cwd = process.cwd()
  const home = homedir()
  
  return [
    // Project-level (checked first)
    { path: join(cwd, "opencode.jsonc"), isJsonc: true },
    { path: join(cwd, "opencode.json"), isJsonc: false },
    
    // Global user-level
    { path: join(home, ".config", "opencode", "opencode.jsonc"), isJsonc: true },
    { path: join(home, ".config", "opencode", "opencode.json"), isJsonc: false },
  ]
}

export function readOpencodeConfig(): { config: any; path: string; isJsonc: boolean } | null {
  const candidates = getOpencodeConfigPaths()
  
  for (const candidate of candidates) {
    if (!existsSync(candidate.path)) continue
    
    try {
      const raw = readFileSync(candidate.path, "utf-8")
      const content = candidate.isJsonc ? stripJsoncComments(raw) : raw
      const config = JSON.parse(content)
      
      return { config, path: candidate.path, isJsonc: candidate.isJsonc }
    } catch {
      // Continue to next candidate
    }
  }
  
  return null
}

function stripJsoncComments(content: string): string {
  content = content.replace(/\/\/[^\n]*/g, "")
  content = content.replace(/\/\*[\s\S]*?\*\//g, "")
  content = content.replace(/,(\s*[\]}])/g, "$1")
  return content
}
```

---

## Security Best Practices

### 1. Never Read Secrets from Repo-Local Config

```ts
// Good: Only read from global config for secrets
function readGlobalOpencodeConfig(): any | null {
  const home = homedir()
  const candidates = [
    join(home, ".config", "opencode", "opencode.jsonc"),
    join(home, ".config", "opencode", "opencode.json"),
  ]
  // ... only check global paths
}

// Bad: Reading from cwd (untrusted)
const config = readFileSync(join(process.cwd(), "opencode.json"))
const apiKey = config.provider.openai.options.apiKey  // ❌ Repo can inject secrets
```

### 2. Validate Env Var Templates

```ts
// Good: Allowlist env vars
const apiKey = resolveEnvTemplate("{env:OPENAI_API_KEY}", ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"])

// Bad: Allow any env var
const apiKey = resolveEnvTemplate("{env:SOME_VAR}")  // ❌ Could leak PATH, HOME, etc.
```

### 3. Trim Resolved Values

```ts
const resolved = process.env[varName]
if (!resolved || resolved.trim() === "") return null

return resolved.trim()  // Always trim whitespace
```

---

## See Also

- [SDK Reference](../../../docs/instructions/sdk-reference.md) — `client.config.get()` API
- [plugin-server](../plugin-server/SKILL.md) — Server plugin development patterns
