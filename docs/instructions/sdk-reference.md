# OpenCode SDK Reference

Comprehensive reference for the OpenCode SDK, plugin types, and TUI plugin API. This document covers the full API surface available to plugins.

For an overview of the plugin architecture, see [OpenCode Plugin Architecture](./opencode-plugin-architecture.md).

---

## Table of Contents

- [SDK Client API](#sdk-client-api)
  - [Global](#global)
  - [App](#app)
  - [Project](#project)
  - [Path](#path)
  - [Config](#config)
  - [Sessions](#sessions)
  - [Files](#files)
  - [TUI](#tui)
  - [Auth](#auth)
  - [Events](#events)
- [Plugin Type Signatures](#plugin-type-signatures)
  - [Plugin](#plugin)
  - [PluginInput](#plugininput)
  - [Hooks](#hooks)
  - [ToolDefinition](#tooldefinition)
- [SDK Usage Patterns](#sdk-usage-patterns)
  - [Structured Logging](#structured-logging)
  - [Session Metadata](#session-metadata)
  - [Context Injection](#context-injection)
  - [Toast Notifications](#toast-notifications)
  - [Config Access](#config-access)
  - [Subagent Detection](#subagent-detection)
- [TUI Plugin API Reference](#tui-plugin-api-reference)
  - [api.client](#apiclient)
  - [api.ui](#apiui)
  - [api.slots](#apislots)
  - [api.event](#apievent)
  - [api.lifecycle](#apilifecycle)
  - [api.theme](#apitheme)
  - [api.kv](#apikv)
  - [api.keymap](#apikeymap)
- [Structured Output](#structured-output)
- [Type Reference](#type-reference)

---

## SDK Client API

Install the SDK:

```bash
npm install @opencode-ai/sdk
```

Create a client:

```ts
import { createOpencodeClient } from "@opencode-ai/sdk"

// Connect to existing server
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})

// Or start server + client
import { createOpencode } from "@opencode-ai/sdk"
const { client, server } = await createOpencode()
```

In plugins, the `client` is provided via the plugin input:

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  // client is available here
}
```

---

### Global

Health check and server version.

#### `client.global.health()`

```ts
const health = await client.global.health()
// { data: { healthy: true, version: "1.17.8" } }
```

**Response:**
```ts
{
  healthy: boolean
  version: string
}
```

---

### App

Application-level operations: logging and agent listing.

#### `client.app.log()`

**The canonical way plugins should log.** Writes structured log entries to the server logs.

```ts
await client.app.log({
  body: {
    service: "my-plugin",
    level: "info",
    message: "Plugin initialized",
    extra: { project: "my-project" },
  },
})
```

**Parameters:**
```ts
{
  body: {
    service: string          // Service/plugin name
    level: "debug" | "info" | "warn" | "error"
    message: string          // Log message
    extra?: Record<string, unknown>  // Optional metadata
  }
}
```

**Response:** `boolean`

**Usage notes:**
- Use this instead of `console.log` in server plugins
- In TUI plugins, use `api.client?.app?.log?.()` (same signature)
- Logs are written to the server log stream
- Filter logs: `opencode --log-level DEBUG --print-logs 2>&1 | grep "my-plugin"`

#### `client.app.agents()`

List all available agents.

```ts
const agents = await client.app.agents()
// { data: [{ name: "build", ... }, { name: "plan", ... }] }
```

**Response:** `Agent[]`

---

### Project

Project information.

#### `client.project.list()`

List all projects.

```ts
const projects = await client.project.list()
```

**Response:** `Project[]`

#### `client.project.current()`

Get the current project.

```ts
const project = await client.project.current()
```

**Response:** `Project`

---

### Path

Current path information.

#### `client.path.get()`

Get current path details.

```ts
const path = await client.path.get()
// { data: { cwd: "/path/to/project", ... } }
```

**Response:** `Path`

---

### Config

Configuration access.

#### `client.config.get()`

Get the merged OpenCode configuration.

```ts
const config = await client.config.get()
// { data: { model: "anthropic/claude-3-5-sonnet", ... } }
```

**Response:** `Config`

**Usage notes:**
- Returns the merged config from all sources (remote, global, project, etc.)
- Includes plugin-specific config under `experimental.*`
- Use this to read custom plugin settings

```ts
const configResp = await client.config.get()
const pluginConfig = configResp.data?.experimental?.pluginConfig
```

#### `client.config.providers()`

List available providers and default models.

```ts
const providers = await client.config.providers()
// { data: { providers: [{ id: "anthropic", ... }], default: { ... } } }
```

**Response:**
```ts
{
  providers: Provider[]
  default: { [key: string]: string }
}
```

**Usage notes:**
- Returns configured providers (from config files and auth)
- Use this to detect which providers are available

---

### Sessions

Full session lifecycle management.

#### `client.session.list()`

List all sessions.

```ts
const sessions = await client.session.list()
```

**Response:** `Session[]`

#### `client.session.get({ path })`

Get session metadata.

```ts
const session = await client.session.get({ path: { id: sessionID } })
const modelID = session.data?.modelID
const providerID = session.data?.providerID
const parentID = session.data?.parentID  // subagent sessions have this
```

**Parameters:**
```ts
{
  path: { id: string }  // Session ID
}
```

**Response:** `Session`

**Properties:**
```ts
{
  id: string
  modelID?: string      // Current model
  providerID?: string   // Current provider
  parentID?: string     // Present for subagent sessions
  title?: string
  // ... other session properties
}
```

#### `client.session.create({ body })`

Create a new session.

```ts
const session = await client.session.create({
  body: { title: "My session" },
})
```

**Response:** `Session`

#### `client.session.delete({ path })`

Delete a session.

```ts
await client.session.delete({ path: { id: sessionID } })
```

**Response:** `boolean`

#### `client.session.update({ path, body })`

Update session properties.

```ts
await client.session.update({
  path: { id: sessionID },
  body: { title: "New title" },
})
```

**Response:** `Session`

#### `client.session.messages({ path })`

List messages in a session.

```ts
const messages = await client.session.messages({ path: { id: sessionID } })
```

**Response:**
```ts
Array<{
  info: Message
  parts: Part[]
}>
```

#### `client.session.prompt({ path, body })`

Send a prompt message to the session.

```ts
// Normal prompt (triggers AI response)
const result = await client.session.prompt({
  path: { id: sessionID },
  body: {
    parts: [{ type: "text", text: "Hello!" }],
  },
})

// Context injection (no AI response)
await client.session.prompt({
  path: { id: sessionID },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "System context", ignored: true }],
  },
})
```

**Parameters:**
```ts
{
  path: { id: string }
  body: {
    parts: Part[]
    noReply?: boolean     // true = no AI response (context only)
    model?: { providerID: string, modelID: string }
    format?: {           // Structured output
      type: "json_schema"
      schema: object     // JSON Schema
      retryCount?: number
    }
  }
}
```

**Response:** `AssistantMessage` (unless `noReply: true`, then `UserMessage`)

**Usage notes:**
- `noReply: true` — adds the message without triggering the model (useful for context injection)
- `ignored: true` in parts — keeps content visible to user but excludes it from future model context
- Use for injecting tool outputs, status updates, or plugin-generated content

#### `client.session.command({ path, body })`

Execute a slash command in a session.

```ts
await client.session.command({
  path: { id: sessionID },
  body: { command: "/help" },
})
```

**Response:** `{ info: AssistantMessage, parts: Part[] }`

#### `client.session.shell({ path, body })`

Run a shell command in a session.

```ts
await client.session.shell({
  path: { id: sessionID },
  body: { command: "npm install" },
})
```

**Response:** `AssistantMessage`

#### `client.session.abort({ path })`

Abort a running session.

```ts
await client.session.abort({ path: { id: sessionID } })
```

**Response:** `boolean`

#### `client.session.share({ path })`

Share a session.

```ts
await client.session.share({ path: { id: sessionID } })
```

**Response:** `Session`

#### `client.session.unshare({ path })`

Unshare a session.

```ts
await client.session.unshare({ path: { id: sessionID } })
```

**Response:** `Session`

#### `client.session.summarize({ path, body })`

Summarize a session.

```ts
await client.session.summarize({ path: { id: sessionID }, body: {} })
```

**Response:** `boolean`

#### `client.session.revert({ path, body })`

Revert a message in a session.

```ts
await client.session.revert({
  path: { id: sessionID },
  body: { messageID },
})
```

**Response:** `Session`

#### `client.session.unrevert({ path })`

Restore reverted messages.

```ts
await client.session.unrevert({ path: { id: sessionID } })
```

**Response:** `Session`

#### `client.session.children({ path })`

List child sessions (subagent sessions).

```ts
const children = await client.session.children({ path: { id: sessionID } })
```

**Response:** `Session[]`

#### `client.session.init({ path, body })`

Analyze the app and create AGENTS.md.

```ts
await client.session.init({ path: { id: sessionID }, body: {} })
```

**Response:** `boolean`

#### `client.session.fork({ path, body })`

Fork a session at a specific message.

```ts
await client.session.fork({
  path: { id: sessionID },
  body: { messageID },
})
```

**Response:** `Session`

---

### Files

File operations and search.

#### `client.find.text({ query })`

Search for text in files.

```ts
const results = await client.find.text({
  query: { pattern: "function.*opencode" },
})
```

**Parameters:**
```ts
{
  query: {
    pattern: string  // Regex pattern
  }
}
```

**Response:** Array of match objects with `path`, `lines`, `line_number`, `absolute_offset`, `submatches`

#### `client.find.files({ query })`

Find files and directories by name.

```ts
const files = await client.find.files({
  query: {
    query: "*.ts",
    type: "file",
    limit: 100,
  },
})
```

**Parameters:**
```ts
{
  query: {
    query: string
    type?: "file" | "directory"
    directory?: string  // Override project root
    limit?: number      // Max results (1-200)
  }
}
```

**Response:** `string[]` (paths)

#### `client.find.symbols({ query })`

Find workspace symbols.

```ts
const symbols = await client.find.symbols({
  query: { query: "MyClass" },
})
```

**Response:** `Symbol[]`

#### `client.file.read({ query })`

Read a file.

```ts
const content = await client.file.read({
  query: { path: "src/index.ts" },
})
```

**Response:**
```ts
{
  type: "raw" | "patch"
  content: string
}
```

#### `client.file.status({ query? })`

Get status for tracked files.

```ts
const files = await client.file.status({
  query: { path: "src/" },
})
```

**Response:** `File[]`

---

### TUI

TUI control operations.

#### `client.tui.showToast({ body })`

Show a toast notification.

```ts
await client.tui.showToast({
  body: {
    message: "Task completed",
    variant: "success",
    duration: 5000,
  },
})
```

**Parameters:**
```ts
{
  body: {
    message: string
    variant: "info" | "success" | "warning" | "error"
    duration?: number  // Milliseconds
    title?: string
  }
}
```

**Response:** `boolean`

**Usage notes:**
- Non-blocking — use `.catch(() => {})` to handle failures silently
- In TUI plugins, use `api.ui.toast?.()` instead (slightly different signature)

#### `client.tui.appendPrompt({ body })`

Append text to the prompt input.

```ts
await client.tui.appendPrompt({
  body: { text: "Add this to prompt" },
})
```

**Response:** `boolean`

#### `client.tui.executeCommand({ body })`

Execute a TUI command.

```ts
await client.tui.executeCommand({
  body: { command: "help" },
})
```

**Response:** `boolean`

#### `client.tui.openHelp()`

Open the help dialog.

```ts
await client.tui.openHelp()
```

**Response:** `boolean`

#### `client.tui.openSessions()`

Open the session selector.

```ts
await client.tui.openSessions()
```

**Response:** `boolean`

#### `client.tui.openThemes()`

Open the theme selector.

```ts
await client.tui.openThemes()
```

**Response:** `boolean`

#### `client.tui.openModels()`

Open the model selector.

```ts
await client.tui.openModels()
```

**Response:** `boolean`

#### `client.tui.submitPrompt()`

Submit the current prompt.

```ts
await client.tui.submitPrompt()
```

**Response:** `boolean`

#### `client.tui.clearPrompt()`

Clear the prompt input.

```ts
await client.tui.clearPrompt()
```

**Response:** `boolean`

---

### Auth

Authentication management.

#### `client.auth.set({ path, body })`

Set authentication credentials for a provider.

```ts
await client.auth.set({
  path: { id: "anthropic" },
  body: { type: "api", key: "your-api-key" },
})
```

**Response:** `boolean`

---

### Events

Real-time event stream.

#### `client.event.subscribe()`

Subscribe to server-sent events.

```ts
const events = await client.event.subscribe()

for await (const event of events.stream) {
  console.log("Event:", event.type, event.properties)
}
```

**Response:** Server-sent events stream

**Usage notes:**
- Returns an async iterable stream
- Events match the same types as the plugin `event` hook
- Use for external tools that need to react to OpenCode events

---

## Plugin Type Signatures

Types from `@opencode-ai/plugin`.

### Plugin

The main plugin function signature.

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async (input, options) => {
  // input: PluginInput
  // options: PluginOptions (optional)
  
  return {
    // Hooks object
  }
}
```

**Signature:**
```ts
type Plugin = (
  input: PluginInput,
  options?: PluginOptions
) => Promise<Hooks>
```

### PluginInput

Context object passed to the plugin function.

```ts
type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>  // SDK client
  project: Project                                  // Current project
  directory: string                                 // Working directory
  worktree: string                                  // Git worktree path
  experimental_workspace: {
    register(type: string, adapter: WorkspaceAdapter): void
  }
  serverUrl: URL                                    // Server URL
  $: BunShell                                       // Bun shell API
}
```

**Properties:**
- `client` — SDK client (same as documented above)
- `project` — Current project metadata
- `directory` — Current working directory
- `worktree` — Git worktree path (if applicable)
- `experimental_workspace` — Workspace adapter registration (experimental)
- `serverUrl` — OpenCode server URL
- `$` — Bun's shell API for executing commands

### Hooks

The hooks object returned by the plugin function.

```ts
interface Hooks {
  dispose?: () => Promise<void>
  
  event?: (input: { event: Event }) => Promise<void>
  
  config?: (input: Config) => Promise<void>
  
  tool?: {
    [key: string]: ToolDefinition
  }
  
  "chat.message"?: (
    input: {
      sessionID: string
      agent?: string
      model?: { providerID: string; modelID: string }
      messageID?: string
      variant?: string
    },
    output: { message: UserMessage; parts: Part[] }
  ) => Promise<void>
  
  "chat.params"?: (
    input: {
      sessionID: string
      agent: string
      model: Model
      provider: ProviderContext
      message: UserMessage
    },
    output: {
      temperature: number
      topP: number
      topK: number
      maxOutputTokens: number | undefined
      options: Record<string, any>
    }
  ) => Promise<void>
  
  "chat.headers"?: (
    input: {
      sessionID: string
      agent: string
      model: Model
      provider: ProviderContext
      message: UserMessage
    },
    output: { headers: Record<string, string> }
  ) => Promise<void>
  
  "permission.ask"?: (
    input: Permission,
    output: { status: "ask" | "deny" | "allow" }
  ) => Promise<void>
  
  "command.execute.before"?: (
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Part[] }
  ) => Promise<void>
  
  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any }
  ) => Promise<void>
  
  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string; args: any },
    output: { title: string; output: string; metadata: any }
  ) => Promise<void>
  
  "shell.env"?: (
    input: { cwd: string; sessionID?: string; callID?: string },
    output: { env: Record<string, string> }
  ) => Promise<void>
  
  "tool.definition"?: (
    input: { toolID: string },
    output: { description: string; parameters: any }
  ) => Promise<void>
  
  "experimental.session.compacting"?: (
    input: { sessionID: string },
    output: { context: string[]; prompt?: string }
  ) => Promise<void>
  
  "experimental.compaction.autocontinue"?: (
    input: {
      sessionID: string
      agent: string
      model: Model
      provider: ProviderContext
      message: UserMessage
      overflow: boolean
    },
    output: { enabled: boolean }
  ) => Promise<void>
  
  // ... other hooks
}
```

**Hook categories:**
- **Lifecycle**: `dispose`
- **Core**: `event`, `config`, `tool`
- **Chat pipeline**: `chat.message`, `chat.params`, `chat.headers`
- **Tool lifecycle**: `tool.execute.before`, `tool.execute.after`, `tool.definition`
- **Command**: `command.execute.before`
- **Shell**: `shell.env`
- **Permission**: `permission.ask`
- **Compaction**: `experimental.session.compacting`, `experimental.compaction.autocontinue`

### ToolDefinition

Tool definition type from `@opencode-ai/plugin`.

```ts
import { tool } from "@opencode-ai/plugin"

const myTool = tool({
  description: "What this tool does",
  args: {
    foo: tool.schema.string(),
    bar: tool.schema.number().optional(),
  },
  async execute(args, context) {
    return {
      title: "Result Title",
      output: "Markdown output",
    }
  },
})
```

**Signature:**
```ts
function tool<T>(definition: {
  description: string
  args: Record<string, ZodSchema>  // Zod schemas
  execute: (
    args: T,
    context: {
      sessionID: string
      directory: string
      worktree: string
      metadata: (data: any) => void
    }
  ) => Promise<{ title?: string; output: string } | string>
}): ToolDefinition
```

**Schema helpers:**
- `tool.schema.string()`
- `tool.schema.number()`
- `tool.schema.boolean()`
- `tool.schema.array()`
- `tool.schema.object()`
- ... all Zod types

---

## SDK Usage Patterns


### Structured Logging

**Always use `client.app.log()` in server plugins:**

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  // Initialize
  await client.app.log({
    body: {
      service: "my-plugin",
      level: "info",
      message: "Plugin initialized",
      extra: {
        configLoaded: true,
        providers: ["anthropic", "openai"],
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
  }
}
```

**TUI plugins:**

```ts
// TUI plugins use api.client
await api.client?.app?.log?.({
  body: {
    service: "my-plugin-tui",
    level: "info",
    message: "TUI initialized",
  },
})
```

### Session Metadata

**Get current model and provider:**

```ts
async function getSessionModelMeta(sessionID: string) {
  try {
    const session = await client.session.get({ path: { id: sessionID } })
    return {
      modelID: session.data?.modelID,
      providerID: session.data?.providerID,
    }
  } catch {
    return {}
  }
}
```

### Context Injection

**Inject tool output without triggering the model:**

```ts
async function injectRawOutput(sessionID: string, output: string) {
  await client.session.prompt({
    path: { id: sessionID },
    body: {
      noReply: true,  // Don't trigger AI response
      parts: [{
        type: "text",
        text: output,
        ignored: true,  // Visible to user, excluded from future context
      }],
    },
  })
}

// Use in custom tool
return {
  tool: {
    myTool: tool({
      description: "Custom tool",
      args: {},
      async execute(args, context) {
        const output = "Deterministic output here"
        await injectRawOutput(context.sessionID, output)
        return ""  // Empty return — output already injected
      },
    }),
  },
}
```

**Why `ignored: true`?**
- Keeps tool output visible in the session transcript
- Prevents the output from consuming context window tokens in future turns
- Useful for status reports, diagnostics, quota displays, etc.

### Toast Notifications

**Show non-blocking toast:**

```ts
// Server plugin
await client.tui.showToast({
  body: {
message: "Report: 85% remaining",
    variant: "info",
    duration: 9000,
  },
}).catch(() => {})  // Non-blocking — ignore failures

// TUI plugin
api.ui.toast?.({
  message: "Quota: 85% remaining",
  variant: "info",
})
```

### Config Access

**Read merged config:**

```ts
const configResp = await client.config.get()
const config = configResp.data

// Access standard config
const model = config?.model
const provider = config?.provider

// Access plugin-specific config
const myPluginConfig = config?.experimental?.myPlugin
```

**List available providers:**

```ts
const providersResp = await client.config.providers()
const providers = providersResp.data?.providers ?? []
const detectedProviders = providers.map(p => p.id)
// ["anthropic", "openai", "copilot", ...]
```

### Subagent Detection

**Check if a session is a subagent session:**

```ts
async function isSubagentSession(sessionID: string): Promise<boolean> {
  try {
    const session = await client.session.get({ path: { id: sessionID } })
    // Subagent sessions have a parentID
    return !!session.data?.parentID
  } catch {
    return false
  }
}

// Use to skip toasts for subagent sessions
if (await isSubagentSession(sessionID)) {
  return  // Don't show toast for subagent
}
```

---

## TUI Plugin Runtime

The TUI plugin system loads plugins through a `TuiPluginHost` interface in `packages/tui/src/plugin/runtime.ts`. Each plugin receives:

- **api**: The TUI API object (created from `createTuiApi(createTuiApiAdapters({...}))`)
- **config**: Resolved TUI config (theme, keybinds, scroll, etc.)
- **runtime**: Plugin runtime with routes, slots, and registration
- **dispose**: Callback to clean up plugin resources

The TUI app loads plugins from `~/.config/opencode/tui.json`'s `plugin` array. Each entry is either a path string or a tuple `[path, options]`.

The TUI API surfaces match the server's `client` object for most operations but also includes TUI-specific APIs like `api.slots.register`, `api.ui.Prompt`, `api.ui.dialog`, etc.

See [TUI Plugin Architecture](./opencode-plugin-architecture.md#tui-plugin-architecture) for the complete TUI API.

## TUI Plugin API Reference

The `api` object passed to TUI plugins. See [TUI Plugin Architecture](./opencode-plugin-architecture.md#tui-plugin-architecture) for the full structure.

### api.client

SDK client (same as server plugin `client`).

```ts
// Same API as documented above
await api.client?.app?.log?.({ body: { ... } })
await api.client?.session?.get?.({ path: { id } })
await api.client?.config?.get?.()
```

**Usage notes:**
- Always use optional chaining (`?.`) in TUI plugins
- The client may not be available in all contexts

### api.ui

UI components and utilities.

#### api.ui.toast

Show a toast notification (TUI-specific signature).

```ts
api.ui.toast?.({
  message: "Task completed",
  variant: "success",  // info | success | warning | error
})
```

**Differences from `client.tui.showToast()`:**
- TUI signature: `{ message, variant }` (no `body` wrapper)
- Server signature: `{ body: { message, variant, duration } }`

#### api.ui.Prompt

Prompt input component wrapper.

```tsx
<api.ui.Prompt
  sessionID={sessionID}
  visible={true}
  disabled={false}
  onSubmit={() => {}}
  ref={(ref) => {}}
/>
```

**Props:**
- `sessionID: string`
- `visible?: boolean`
- `disabled?: boolean`
- `onSubmit?: () => void`
- `ref?: (ref: TuiPromptRef | undefined) => void`

#### api.ui.dialog

Dialog management (experimental).

```tsx
// Replace dialog content
api.ui.dialog?.replace?.(() => <MyDialogContent />)

// Set dialog size
api.ui.dialog?.setSize?.("large")  // medium | large | xlarge

// Clear dialog
api.ui.dialog?.clear?.()
```

**Usage notes:**
- `replace()` resets size to `medium` — call `setSize()` after
- Always use optional chaining — API may not be available

### api.slots

Slot registration.

```tsx
api.slots.register({
  order: 100,  // Lower = higher in the list
  slots: {
    sidebar_content: (ctx, props: { session_id: string }) => {
      return <MySidebarComponent sessionID={props.session_id} />
    },
    home_bottom: () => {
      return <MyHomeComponent />
    },
  },
})
```

**Available slots:**
- `sidebar_content` — Inside active sessions only (receives `session_id` prop)
- `home_bottom` — Home screen
- `session_prompt` — Wraps the chat input (can wrap `api.ui.Prompt`)
- `app_bottom` — Always visible

**Props:**
- `session_id?: string` — Only for session-scoped slots (`sidebar_content`, `session_prompt`)

### api.event

Event subscription.

```ts
const unsubscribe = api.event.on("session.idle", (event) => {
  console.log("Session idle:", event.properties.sessionID)
})

// Cleanup
api.lifecycle.onDispose(unsubscribe)
```

**TUI-specific events:**
- `tui.session.select` — Session selected in TUI
- `session.idle` — Session went idle
- `session.updated` — Session metadata updated
- `message.updated` — Message updated
- `message.removed` — Message removed
- ... all other events from the plugin `event` hook

### api.lifecycle

Lifecycle management.

```ts
api.lifecycle.onDispose(() => {
  // Cleanup: clear timers, unsubscribe events, etc.
  clearInterval(myInterval)
  unsubscribeEvent()
})
```

**Usage notes:**
- Always register cleanup callbacks
- Multiple callbacks are supported

### api.theme

Theme colors.

```ts
const theme = api.theme.current

// Colors
theme.text        // Primary text color
theme.textMuted   // Secondary/muted text color
theme.error       // Error/red color
theme.warning     // Warning/yellow color
```

**Usage in JSX:**
```tsx
<text fg={api.theme.current.text}>Normal text</text>
<text fg={api.theme.current.textMuted}>Muted text</text>
<text fg={api.theme.current.error}>Error text</text>
```

### api.kv

Key-value storage for plugin state.

```ts
// Get value (with default)
const collapsed = api.kv?.get("my-sidebar-collapsed", true) ?? true

// Set value
api.kv?.set("my-sidebar-collapsed", false)
```

**Usage notes:**
- Values are persisted across TUI restarts
- Always use optional chaining — API may not be available
- Use for UI state (collapsed panels, last selected tab, etc.)

### api.keymap

Slash command registration (experimental).

```ts
const keymap = api.keymap
if (!keymap?.registerLayer) return

const dispose = keymap.registerLayer({
  commands: [{
    namespace: "palette",
    name: "my-plugin.command",
    title: "My Command",
    desc: "Description",
    category: "My Plugin",
    slashName: "my_command",
    run(input?: unknown) {
      // Execute command
      console.log("Command executed:", input)
    },
  }],
})

// Cleanup
if (typeof dispose === "function") {
  api.lifecycle.onDispose(dispose)
}
```

**Warning:**
- This API is experimental and may break plugin loading in some OpenCode versions
- Always guard with `if (!keymap?.registerLayer) return`
- Test carefully before releasing

---

## Structured Output

Request structured JSON output from the model.

### Basic Usage

```ts
const result = await client.session.prompt({
  path: { id: sessionID },
  body: {
    parts: [{ type: "text", text: "Research Anthropic and provide info" }],
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          company: { type: "string", description: "Company name" },
          founded: { type: "number", description: "Year founded" },
          products: {
            type: "array",
            items: { type: "string" },
            description: "Main products",
          },
        },
        required: ["company", "founded"],
      },
    },
  },
})

// Access the structured output
const data = result.data.info.structured_output
// { company: "Anthropic", founded: 2021, products: ["Claude", "Claude API"] }
```

### Format Types

| Type | Description |
|------|-------------|
| (none) | Default. Standard text response |
| `json_schema` | Returns validated JSON matching the schema |

### JSON Schema Format

```ts
{
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      // Your schema here
    },
    required: ["field1", "field2"],
  },
  retryCount?: number  // Default: 2
}
```

### Error Handling

If the model fails to produce valid structured output after all retries:

```ts
if (result.data.info.error?.name === "StructuredOutputError") {
  console.error("Failed:", result.data.info.error.message)
  console.error("Attempts:", result.data.info.error.retries)
}
```

### Best Practices

1. **Provide clear descriptions** in schema properties to help the model
2. **Use `required`** to specify mandatory fields
3. **Keep schemas focused** — complex nested schemas may be harder to fill
4. **Set appropriate `retryCount`** — increase for complex schemas

---

## Type Reference

All types are available from the SDK packages.

| Type | Package | Import |
|------|---------|--------|
| `Plugin` | `@opencode-ai/plugin` | `import type { Plugin } from "@opencode-ai/plugin"` |
| `PluginInput` | `@opencode-ai/plugin` | `import type { PluginInput } from "@opencode-ai/plugin"` |
| `Hooks` | `@opencode-ai/plugin` | `import type { Hooks } from "@opencode-ai/plugin"` |
| `ToolDefinition` | `@opencode-ai/plugin` | `import { tool } from "@opencode-ai/plugin"` |
| `Event` | `@opencode-ai/sdk` | `import type { Event } from "@opencode-ai/sdk"` |
| `Session` | `@opencode-ai/sdk` | `import type { Session } from "@opencode-ai/sdk"` |
| `Message` | `@opencode-ai/sdk` | `import type { Message } from "@opencode-ai/sdk"` |
| `Part` | `@opencode-ai/sdk` | `import type { Part } from "@opencode-ai/sdk"` |
| `Config` | `@opencode-ai/sdk` | `import type { Config } from "@opencode-ai/sdk"` |
| `Model` | `@opencode-ai/sdk` | `import type { Model } from "@opencode-ai/sdk"` |
| `Provider` | `@opencode-ai/sdk` | `import type { Provider } from "@opencode-ai/sdk"` |

**Full type definitions:**

See the generated types in your `node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts` for the complete type definitions.

---

## TUI Plugin Host

TUI plugins are loaded via `pluginHost.start()` called from `Tui.run()` in `packages/tui/src/app.tsx`:

```ts
pluginHost.start({
  api: TuiApi,       // TUI API — slots, theme, event, kv, dialogs, etc.
  config: TuiConfig.Resolved,  // Resolved TUI config
  runtime: PluginRuntime,      // Runtime state (routes, slots, etc.)
  dispose: () => void, // Cleanup callback
})
```

**Plugin path resolution:** TUI plugin paths in `tui.json` are resolved relative to `~/.config/opencode/`. For workspace paths, use the **absolute path** to the workspace root (which contains `dist/tui.tsx`).

### TUI Config Schema

TUI config at `~/.config/opencode/tui.json` supports:

```typescript
type PluginSpec = string | [string, Record<string, unknown>]

interface TuiConfig {
  $schema?: "https://opencode.ai/tui.json"
  theme?: string
  keybinds?: Record<string, string>
  plugin?: PluginSpec[]
  plugin_enabled?: Record<string, boolean>
  leader_timeout?: number
  attention?: {
    enabled: boolean
    notifications: boolean
    sound: boolean
    volume: number
    sound_pack: string
    sounds: Record<string, string>
  }
  prompt?: {
    max_height?: number
    max_width?: number | "auto"
  }
  scroll_speed?: number
  scroll_acceleration?: { enabled: boolean }
  diff_style?: "auto" | "stacked"
  mouse?: boolean
}
```

## Upstream References

| Resource | URL |
|----------|-----|
| Official SDK docs | https://opencode.ai/docs/sdk/ |
| Official plugin docs | https://opencode.ai/docs/plugins/ |
| SDK source code | https://github.com/anomalyco/opencode/tree/dev/packages/sdk |
| Generated types | https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts |
| Plugin package | https://github.com/anomalyco/opencode/tree/dev/packages/plugin |
| Plugin types | https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts |
| TUI types | https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/tui.ts |
| OpenAPI spec | https://github.com/anomalyco/opencode/blob/dev/packages/server/openapi.yml |

---

## See Also

- [OpenCode Plugin Architecture](./opencode-plugin-architecture.md) — Plugin system overview, TUI plugins, config, agents
- [Ecosystem Reference](./ecosystem-reference.md) — Curated community plugins, projects, and agents
