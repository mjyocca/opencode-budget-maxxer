---
name: plugin-logging
description: Logging patterns for opencode plugins — SDK structured logging, TUI SDK only (no stderr), debug modes, and filter commands. Use when implementing logging in server or TUI plugins.
---

# Plugin Logging Patterns

Comprehensive guide to logging in OpenCode plugins. For full SDK reference, see `docs/instructions/sdk-reference.md`.

---

## Server Plugin Logging (SDK)

**Always use `client.app.log()` in server plugins:**

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ client, project, directory }) => {
  // Initialize
  await client.app.log({
    body: {
      service: "my-plugin",
      level: "info",
      message: "Plugin initialized",
      extra: {
        project,
        directory,
        configLoaded: true,
      },
    },
  })
  
  return {
    event: async ({ event }) => {
      // Debug logging
      await client.app.log({
        body: {
          service: "my-plugin",
          level: "debug",
          message: `Event: ${event.type}`,
          extra: { sessionID: event.properties.sessionID },
        },
      })
    },
    
    dispose: async () => {
      await client.app.log({
        body: {
          service: "my-plugin",
          level: "info",
          message: "Plugin disposing",
        },
      })
    },
  }
}
```

---

## SDK Logger Signature

```ts
await client.app.log({
  body: {
    service: string          // Service/plugin name (required)
    level: "debug" | "info" | "warn" | "error"  // Log level (required)
    message: string          // Log message (required)
    extra?: Record<string, unknown>  // Optional metadata
  }
})
```

**Returns:** `boolean`

---

## SDK Logger Wrapper

Create a reusable logger wrapper:

```ts
import type { Plugin, PluginInput } from "@opencode-ai/plugin"

type Client = PluginInput["client"]
type LogLevel = "info" | "warn" | "error" | "debug"
type LogMetadata = Record<string, unknown>

export interface Logger {
  info: (msg: string, extra?: LogMetadata) => Promise<void>
  warn: (msg: string, extra?: LogMetadata) => Promise<void>
  error: (msg: string, extra?: LogMetadata) => Promise<void>
  debug: (msg: string, extra?: LogMetadata) => Promise<void>
}

export function createSdkLogger(
  client: Client,
  pluginId: string,
): Logger {
  const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG" ? true : false

  const log = async (
    level: LogLevel,
    msg: string,
    extra?: LogMetadata,
  ): Promise<void> => {
    // Filter debug logs unless OPENCODE_LOG_LEVEL=DEBUG
    if (level === "debug" && !DEBUG) return

    await client.app.log({
      body: {
        service: pluginId,
        level,
        message: msg,
        extra: extra ?? {},
      },
    })
  }

  return {
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => log("debug", msg, extra),
  }
}

// Usage:
export const MyPlugin: Plugin = async ({ client }) => {
  const log = createSdkLogger(client, "my-plugin")
  
  await log.info("Plugin initialized", { project, directory })
  
  return {
    event: async ({ event }) => {
      await log.debug(`Event: ${event.type}`, { sessionID: event.properties.sessionID })
    },
  }
}
```

---

## TUI Plugin Logging (SDK Only — No stderr)

**Use SDK logging exclusively in TUI plugins — no stderr fallback.**

TUI plugins should use `api.client?.app?.log?.()` with optional chaining.
Stderr output in TUI plugins pollutes the terminal UI, so there is no stderr fallback.

```ts
/** @jsxImportSource @opentui/solid */

const tui: TuiPlugin = async (api: any, _options: any) => {
  // SDK logging only — silently discards if client not available
  await api.client?.app?.log?.({
    body: {
      service: "my-plugin-tui",
      level: "info",
      message: "TUI initialized",
      extra: { someData: "value" },
    },
  })
}
```

**TUI Logger Helper:**

```ts
import { createTuiLogger } from "../lib/core/logger"

const tui: TuiPlugin = async (api: any, _options: any) => {
  const log = createTuiLogger(api, "my-plugin-tui")

  log.info("TUI initialized")

  api.lifecycle.onDispose(() => {
    log.info("TUI disposing")
  })
}
```

> **Why no stderr fallback?** Writing to `process.stderr` in a TUI plugin causes output to appear in the terminal UI, which is distracting and noisy. The SDK logger silently discards messages when the client is unavailable, which is the correct behavior for TUI plugins.

---

## Debug Logging

Debug logs are controlled by `OPENCODE_LOG_LEVEL=DEBUG`:

```ts
export function createSdkLogger(
  client: Client,
  pluginId: string,
): Logger {
  const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG" ? true : false

  const log = async (level: LogLevel, msg: string, extra?: LogMetadata) => {
    // Filter debug logs unless OPENCODE_LOG_LEVEL=DEBUG
    if (level === "debug" && !DEBUG) return

    await client.app.log({
      body: { service: pluginId, level, message: msg, extra: extra ?? {} },
    })
  }

  return {
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => log("debug", msg, extra),
  }
}
```

**Enable debug mode:**

```bash
export OPENCODE_LOG_LEVEL=DEBUG
opencode
```

Or use the helper script:

```bash
pnpm run debug
```

---

## Filter Logs

```bash
# Filter by service name
opencode --log-level DEBUG --print-logs 2>&1 | grep "my-plugin"

# Filter by level
opencode --log-level DEBUG --print-logs 2>&1 | grep "ERROR:"

# Tail logs in real-time
opencode --log-level DEBUG --print-logs 2>&1 | grep --line-buffered "my-plugin"
```

---

## Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Verbose logging for development (filtered by env var) |
| `info` | Normal operation events (initialization, disposal, key actions) |
| `warn` | Recoverable issues (missing config, fallback behavior) |
| `error` | Errors that prevent normal operation |

---

## Best Practices

### 1. Use Structured Metadata

```ts
// Good: Structured metadata
await log.info("Session created", {
  sessionID: session.id,
  modelID: session.modelID,
  providerID: session.providerID,
})

// Bad: String concatenation
await log.info(`Session created: ${session.id}, model: ${session.modelID}`)
```

### 2. Filter Debug Logs

```ts
const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG"

// Only log debug messages when enabled via OPENCODE_LOG_LEVEL=DEBUG
if (DEBUG || level !== "debug") {
  await client.app.log({ body: { service, level, message, extra } })
}
```

### 3. Avoid Sensitive Data

```ts
// Good: Redact sensitive data
await log.info("API key configured", { provider: "openai", keyLength: apiKey.length })

// Bad: Log secrets
await log.info("API key configured", { apiKey })  // ❌ Never log secrets
```

### 4. Use Async Properly

```ts
// Good: Await log calls in async contexts
await log.info("Plugin initialized")

// Bad: Fire-and-forget (may lose logs if process exits)
log.info("Plugin initialized")  // Missing await
```

### 5. TUI Always Uses Optional Chaining

```ts
// Good: Optional chaining in TUI
await api.client?.app?.log?.({ body: { ... } })

// Bad: Assumes client exists
await api.client.app.log({ body: { ... } })  // ❌ May throw
```

---

## Example: Complete Logger

`src/lib/logger.ts`:

```ts
import type { PluginInput } from "@opencode-ai/plugin"

type Client = PluginInput["client"]
type LogLevel = "info" | "warn" | "error" | "debug"
type LogMetadata = Record<string, unknown>

export interface Logger {
  info: (msg: string, extra?: LogMetadata) => Promise<void>
  warn: (msg: string, extra?: LogMetadata) => Promise<void>
  error: (msg: string, extra?: LogMetadata) => Promise<void>
  debug: (msg: string, extra?: LogMetadata) => Promise<void>
}

export function createSdkLogger(
  client: Client,
  pluginId: string,
): Logger {
  const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG" ? true : false

  const log = async (
    level: LogLevel,
    msg: string,
    extra?: LogMetadata,
  ): Promise<void> => {
    if (level === "debug" && !DEBUG) return

    await client.app.log({
      body: {
        service: pluginId,
        level,
        message: msg,
        extra: extra ?? {},
      },
    })
  }

  return {
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => log("debug", msg, extra),
  }
}

export function createTuiLogger(
  api: TuiPluginApi,
  pluginId: string,
): Omit<Logger, "info" | "warn" | "error" | "debug"> & {
  info: (msg: string, extra?: Record<string, unknown>) => void
  warn: (msg: string, extra?: Record<string, unknown>) => void
  error: (msg: string, extra?: Record<string, unknown>) => void
  debug: (msg: string, extra?: Record<string, unknown>) => void
} {
  const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG" ? true : false

  const log = (
    level: LogLevel,
    msg: string,
    extra?: Record<string, unknown>,
  ) => {
    if (level === "debug" && !DEBUG) return
    void api.client.app.log({
      service: pluginId,
      level,
      message: msg,
      extra,
    })
  }

  return {
    info:  (msg, extra) => log("info", msg, extra),
    warn:  (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => log("debug", msg, extra),
  }
}
```

---

## See Also

- [SDK Reference](../../../docs/instructions/sdk-reference.md) — Complete `client.app.log()` documentation
- [plugin-server](../plugin-server/SKILL.md) — Server plugin development patterns
- [plugin-tui](../plugin-tui/SKILL.md) — TUI plugin development patterns
- [opencode-troubleshooting](../opencode-troubleshooting/SKILL.md) — Debug logging troubleshooting
