---
name: plugin-quick-start
description: Quick start guide for common plugin development tasks — add a tool, handle an event, add a TUI slot. Use this skill for first tasks when starting a new plugin.
---

# Plugin Quick Start

Fast patterns for common first tasks in plugin development. For comprehensive guides, see [plugin-server](../plugin-server/SKILL.md) and [plugin-tui](../plugin-tui/SKILL.md).

---

## First: Set Up Your Plugin

Before building, let's personalize this template. Answer these questions to make the project yours.

### Step 1: Plugin Name

**Ask the user:** "What is your plugin name?" (e.g., `my-awesome-plugin`)

**Update:**
- `package.json` — `"name"` field
- `src/lib/constants.ts` — `PLUGIN_ID` constant
- `src/index.ts` — tool output message (line 47)
- `src/tui.tsx` — sidebar title (line 59: "Plugin Kit" → "Your Plugin Name")

**Example:**

If the user says `my-awesome-plugin`, update:
```ts
// src/lib/constants.ts
export const PLUGIN_ID = "my-awesome-plugin";

// src/index.ts (line 47)
output: "my-awesome-plugin server plugin is active.",

// src/tui.tsx (line 59)
My Awesome Plugin

// package.json
"name": "my-awesome-plugin",
```

### Step 2: Plugin Description

**Ask the user:** "What does your plugin do?" (e.g., "Automated code review for PRs")

**Update:**
- `package.json` — `"description"` field
- `README.md` — intro paragraph

### Step 3: Author Info

**Ask the user:** "What's your name or GitHub handle?"

**Update:**
- `package.json` — `"author"` field

### Step 4: Plugin Type

**Ask the user:** "Will this be a server plugin, TUI plugin, or both?"

**Options:**
- **Both** — keep everything as-is
- **Server only** — remove `src/tui.tsx`, update `package.json` exports to remove `./tui`
- **TUI only** — remove `src/index.ts`, update `package.json` exports to remove `.` and `./server`

### Step 5: Keywords (optional)

**Ask the user:** "What keywords describe your plugin?" (comma-separated)

**Update:**
- `package.json` — `"keywords"` array

### Step 6: Define Your Vision

**Next:** Ready to define your plugin's vision? Load the `plugin-spec` skill to write a spec before coding.

The spec workflow helps you:
- Clarify the problem your plugin solves
- Identify use cases and target users
- Design the architecture before writing code
- Create an actionable implementation plan

See `docs/specs/README.md` for the full spec-driven workflow.

---

After completing these steps, continue with the quick-start patterns below.

---

## Adding a Tool

Tools are functions that the AI can call during a session.

### Step 1: Define the Tool

```ts
import { tool } from "@opencode-ai/plugin"

const myTool = tool({
  description: "What this tool does (shown to the AI)",
  args: {
    // Zod schema for arguments
    query: tool.schema.string(),
    limit: tool.schema.number().optional(),
  },
  execute: async (args, context) => {
    const { query, limit = 10 } = args
    const { sessionID, directory, worktree } = context
    
    // Implement tool logic here
    const result = `Processed: ${query}`
    
    return {
      title: "Tool Result Title",
      output: result,  // Markdown format
    }
  },
})
```

### Step 2: Register the Tool

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      my_tool: myTool,  // Tool name as shown to AI
    },
  }
}
```

### Tool Schema Types

```ts
import { tool } from "@opencode-ai/plugin"

const exampleTool = tool({
  description: "Example tool",
  args: {
    stringArg: tool.schema.string(),
    numberArg: tool.schema.number(),
    booleanArg: tool.schema.boolean(),
    arrayArg: tool.schema.array(tool.schema.string()),
    objectArg: tool.schema.object({
      nested: tool.schema.string(),
    }),
    optionalArg: tool.schema.string().optional(),
  },
  execute: async (args) => {
    return { title: "Result", output: "..." }
  },
})
```

### Tool Return Format

```ts
// Full format
return {
  title: "Optional Title",
  output: "Markdown output",
}

// Shorthand (string only)
return "Markdown output"
```

---

## Handling Events

Events are fired by OpenCode for session lifecycle, messages, files, tools, and more.

### Step 1: Add Event Handler

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  const log = createSdkLogger(client, "my-plugin")
  
  return {
    event: async ({ event }) => {
      await log.debug(`Event: ${event.type}`)
      
      switch (event.type) {
        case "session.created":
          await handleSessionCreated(event.properties.info)
          break
        
        case "session.idle":
          await handleSessionIdle(event.properties.sessionID)
          break
        
        case "message.updated":
          await handleMessageUpdated(event.properties.info)
          break
        
        default:
          // Ignore other events
          break
      }
    },
  }
}
```

### Step 2: Implement Event Handlers

```ts
async function handleSessionCreated(session: Session) {
  await log.info("Session created", {
    sessionID: session.id,
    modelID: session.modelID,
  })
}

async function handleSessionIdle(sessionID: string) {
  // Session is waiting for user input
  await log.debug("Session idle", { sessionID })
}

async function handleMessageUpdated(message: Message) {
  await log.debug("Message updated", {
    sessionID: message.sessionID,
    messageID: message.id,
    role: message.role,
  })
}
```

### Common Events

| Event | When |
|-------|------|
| `session.created` | New session started |
| `session.idle` | Session waiting for input |
| `message.updated` | Message content changed |
| `file.edited` | File was modified |
| `tool.execute.before` | Before any tool runs |
| `tool.execute.after` | After any tool completes |

**Full event list:** See [Event Reference](../../docs/instructions/opencode-plugin-architecture.md#event-reference)

---

## Adding a TUI Slot

TUI slots let you render UI components in the OpenCode terminal interface.

### Step 1: Create TUI Plugin File

`src/tui.tsx`:

```tsx
/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core"
import { Show, createSignal } from "solid-js"

const plugin = {
  id: "my-plugin-tui",
  tui: async (api: any, _options: any) => {
    // State
    const [statusText, setStatusText] = createSignal("Initializing...")
    
    // Register slots
    api.slots.register({
      order: 300,  // Lower = rendered first
      slots: {
        sidebar_content: (ctx: any, props: { session_id?: string }) => {
          return <MySidebarComponent api={api} statusText={statusText} />
        },
      },
    })
    
    // Cleanup
    api.lifecycle.onDispose(() => {
      // Clear timers, unsubscribe events, etc.
    })
  },
}

export default plugin
```

### Step 2: Create Slot Component

```tsx
function MySidebarComponent(props: { api: any; statusText: () => string }) {
  const theme = () => props.api.theme.current
  
  return (
    <box padding={1}>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        My Plugin
      </text>
      <text fg={theme().textMuted}>
        {"\n"}
        {props.statusText()}
      </text>
    </box>
  )
}
```

### Step 3: Configure Build

`package.json`:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./server": "./dist/index.js",
    "./tui": "./dist/tui.tsx"
  }
}
```

`scripts/build-tui.mjs`:

```js
import { copyFileSync } from "fs"

// Copy tui.tsx to dist (don't compile)
copyFileSync("src/tui.tsx", "dist/tui.tsx")
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve"  // Required for TUI
  }
}
```

### Step 4: Install TUI Plugin

`~/.config/opencode/tui.json`:

```json
["/absolute/path/to/my-plugin"]
```

### Available Slots

| Slot | Visibility |
|------|------------|
| `sidebar_content` | Inside active sessions only (receives `session_id` prop) |
| `home_bottom` | Home screen |
| `session_prompt` | Below chat input (wraps prompt component) |
| `app_bottom` | Always visible |

### Reactive State in TUI Plugins

The TUI slot example above uses `createSignal` for basic reactive state. For production TUI plugins, consider these patterns:

- **Derived values** → `createMemo` (caches computed values, avoids redundant calculations)
- **Side effects** → `createEffect` (trigger toasts, logging, API calls when state changes)
- **Async data** → `createResource` (fetch with built-in loading/error states)
- **Nested state** → `createStore` (fine-grained updates for complex objects/arrays)
- **Lists** → `<For>` / `<Index>` (efficient list rendering)
- **Conditionals** → `<Show>` / `<Switch>` (declarative control flow)

See **[`solidjs-tui`](../solidjs-tui/SKILL.md)** for complete SolidJS patterns tailored to TUI development.

---

## Adding Logging

### Server Plugin

```ts
import { createSdkLogger } from "./lib/logger.js"

export const MyPlugin: Plugin = async ({ client }) => {
  const log = createSdkLogger(client, "my-plugin")
  
  await log.info("Plugin initialized")
  
  return {
    event: async ({ event }) => {
      await log.debug(`Event: ${event.type}`)
    },
  }
}
```

### TUI Plugin

```tsx
const tui: TuiPlugin = async (api: any, _options: any) => {
  await api.client?.app?.log?.({
    body: {
      service: "my-plugin-tui",
      level: "info",
      message: "TUI initialized",
    },
  })
}
```

> **Note:** TUI plugins use SDK logging only — no stderr fallback. Stderr output pollutes the terminal UI.

See [plugin-logging](../plugin-logging/SKILL.md) for complete patterns.

---

## Reading Config

### SDK Config Access

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  const configResp = await client.config.get()
  const config = configResp.data
  
  // Access standard config
  const model = config?.model
  
  // Access plugin-specific config
  const myConfig = config?.experimental?.myPlugin
  
  return { /* hooks */ }
}
```

See [plugin-config-patterns](../plugin-config-patterns/SKILL.md) for manual config file reading and API key resolution.

---

## Common Patterns

### Deduplication (Prevent Concurrent Event Handlers)

```ts
const inFlightSessions = new Set<string>()

event: async ({ event }) => {
  if (event.type !== "session.idle") return
  
  const sessionID = event.properties?.sessionID
  if (!sessionID || inFlightSessions.has(sessionID)) return
  
  inFlightSessions.add(sessionID)
  
  try {
    // Process event
  } finally {
    inFlightSessions.delete(sessionID)
  }
}
```

### Toast Notifications

```ts
await client.tui.showToast({
  body: {
    message: "Task completed",
    variant: "success",  // info | success | warning | error
    duration: 5000,
  },
}).catch(() => {})  // Non-blocking — ignore failures
```

### Session Metadata

```ts
const session = await client.session.get({ path: { id: sessionID } })
const modelID = session.data?.modelID
const providerID = session.data?.providerID
const isSubagent = !!session.data?.parentID
```

---

## Next Steps

After completing these first tasks, explore:

1. **[plugin-server](../plugin-server/SKILL.md)** — Advanced hook patterns, client API reference
2. **[plugin-tui](../plugin-tui/SKILL.md)** — JSX components, SolidJS signals, theme colors
3. **[plugin-logging](../plugin-logging/SKILL.md)** — Structured logging, debug modes, filter commands
4. **[plugin-config-patterns](../plugin-config-patterns/SKILL.md)** — Config resolution, API key lookup
5. **[SDK Reference](../../../docs/instructions/sdk-reference.md)** — Complete SDK API documentation

---

## Troubleshooting

### Plugin doesn't load

1. Server plugins must export a function (not a plain object)
2. TUI plugins must have `.tsx` extension
3. TUI plugins must start with `/** @jsxImportSource @opentui/solid */`
4. Check `tsconfig.json` has `"jsx": "preserve"` for TUI plugins

See [opencode-troubleshooting](../opencode-troubleshooting/SKILL.md) for comprehensive troubleshooting.

---

## See Also

- **[`solidjs-tui`](../solidjs-tui/SKILL.md)** — SolidJS primitives and patterns for TUI development
- **[`plugin-server`](../plugin-server/SKILL.md)** — Server plugin development patterns
- **[`plugin-tui`](../plugin-tui/SKILL.md)** — TUI plugin development reference
- [AGENTS.md](../../../AGENTS.md) — Project overview, available skills, common first tasks
- [OpenCode Plugin Architecture](../../../docs/instructions/opencode-plugin-architecture.md) — Comprehensive reference
- [SDK Reference](../../../docs/instructions/sdk-reference.md) — Complete SDK API documentation
