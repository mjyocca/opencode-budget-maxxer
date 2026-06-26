# OpenCode Plugin Architecture

Comprehensive reference for building opencode plugins. Covers server plugins, TUI plugins, SDK client, server API, config system, agents, and skills.

---

## Plugin System Overview

Plugins are JavaScript/TypeScript modules that extend opencode by hooking into events and customizing behavior.

### Installation Methods

| Method | Location | Notes |
|--------|----------|-------|
| Local files | `.opencode/plugins/` (project) | Automatically loaded at startup |
| Local files | `~/.config/opencode/plugins/` (global) | Automatically loaded at startup |
| npm packages | `opencode.json` → `"plugin"` array | Cached in `~/.cache/opencode/node_modules/` |
| TUI plugins | `~/.config/opencode/tui.json` | Array of paths or package names |

### Load Order

1. Global config (`~/.config/opencode/opencode.json`)
2. Project config (`opencode.json`)
3. Global plugin directory (`~/.config/opencode/plugins/`)
4. Project plugin directory (`.opencode/plugins/`)

Duplicate npm packages (same name + version) load once. Local and npm plugins with similar names both load separately.

### Dependencies

Add a `package.json` to your config directory for local plugins that need external packages:

```json
{
  "dependencies": {
    "shescape": "^2.1.0"
  }
}
```

Opencode runs `bun install` at startup.

---

## Server Plugin Architecture

### Entry Point Pattern

A plugin is a JS/TS module that exports one or more plugin functions. Each function receives a context object and returns a hooks object.

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ client, project, directory, worktree, $ }) => {
  return {
    // Hook implementations go here
  }
}

export default MyPlugin
```

### Context Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | Opencode SDK client | Interact with the AI — sessions, files, TUI, auth |
| `project` | string \| null | Current project identifier |
| `directory` | string | Current working directory |
| `worktree` | string \| null | Git worktree path |
| `$` | Bun shell | Execute commands via Bun's shell API |

### Return Hooks Object

The plugin function returns an object with any combination of these hooks:

| Hook | Purpose |
|------|---------|
| `dispose` | Lifecycle cleanup when plugin is unloaded |
| `tool` | Register custom tools (map of name → tool definition) |
| `event` | Handle any bus event |
| `config` | Called once on init with merged config |
| `chat.message` | Transform message before sending to model |
| `chat.params` | Transform request parameters (model, temperature, etc.) |
| `chat.headers` | Add or modify HTTP headers for the request |
| `tool.execute.before` | Runs before any tool executes |
| `tool.execute.after` | Runs after any tool executes |
| `tool.definition` | Transform a tool's definition |
| `command.execute.before` | Runs before a slash command executes |
| `shell.env` | Inject environment variables into shell execution |
| `permission.asked` | Intercept permission requests |
| `permission.replied` | Runs after a permission decision is made |
| `experimental.session.compacting` | Inject context into compaction prompt |

### Tool Definition Pattern

Use the `tool()` helper from `@opencode-ai/plugin`:

```ts
import { tool } from "@opencode-ai/plugin"

const myTool = tool({
  description: "What this tool does.",
  args: {
    // zod schema for arguments
    // e.g., foo: tool.schema.string()
  },
  async execute(args, context) {
    const { directory, worktree } = context
    return {
      title: "Tool Result",
      output: "Markdown output",
    }
  },
})
```

Register in the plugin return:

```ts
return {
  tool: { myTool },
}
```

If a plugin tool uses the same name as a built-in tool, the plugin tool takes precedence.

### Logging Pattern

**Recommended:** Use `client.app.log()` for structured logging:

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  await client.app.log({
    body: {
      service: "my-plugin",
      level: "info",  // debug | info | warn | error
      message: "Plugin initialized",
      extra: { project: "my-project" },  // optional metadata
    },
  })
}
```

**TUI logging:** In TUI plugins, use SDK logging exclusively — no stderr fallback to avoid UI pollution:

```ts
await api.client?.app?.log?.({
  body: {
    service: "my-plugin-tui",
    level: "info",
    message: "TUI message",
  },
})
```

Filter logs:

```bash
opencode --log-level DEBUG --print-logs 2>&1 | grep "my-plugin"
```

For complete SDK reference, see [SDK Reference](./sdk-reference.md).

---

## Event Reference

All events available via the `event` hook. Subscribe with `event: async ({ event }) => { ... }`.

### Common Events

| Event | When |
|-------|------|
| `session.created` | New session started |
| `session.idle` | Session waiting for input |
| `message.updated` | Message content changed |
| `file.edited` | File was modified |
| `tool.execute.before` | Before any tool runs |
| `tool.execute.after` | After any tool completes |

### Event Type Reference

**Full event list and properties:** The `Event` type from `@opencode-ai/sdk` includes 34+ event types across categories: session, message, file, tool, LSP, TUI, permission, PTY, VCS, and more.

- **SDK type reference:** [Event type in SDK source](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
- **Type-safe access:** `event.type` is typed as `Event["type"]` (union of all event strings)
- **Runtime type guards:** Use `event.type === "session.created"` for type narrowing

---

## SDK Usage Patterns

For the complete SDK reference, see [SDK Reference](./sdk-reference.md).

### Context Injection Without LLM Response

Inject content into a session without triggering the model:

```ts
await client.session.prompt({
  path: { id: sessionID },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "System context here", ignored: true }],
  },
})
```

`ignored: true` keeps the content visible to the user but excludes it from future model context.

### Session Metadata Lookup

Get the current model and provider for a session:

```ts
const session = await client.session.get({ path: { id: sessionID } })
const modelID = session.data?.modelID
const providerID = session.data?.providerID
const isSubagent = !!session.data?.parentID  // subagent sessions have parentID
```

### Toast Notifications

```ts
await client.tui.showToast({
  body: {
    message: "Task completed",
    variant: "info",  // info | success | warning | error
    duration: 9000,   // optional, milliseconds
  },
})
```

---

## SDK Client Reference

The OpenCode SDK provides a client for interacting with sessions, files, config, and more.

**Complete API documentation:** See [SDK Reference](./sdk-reference.md) for full method signatures, usage patterns, and examples.

### Quick Reference

```ts
// In plugins, client is provided via context
export const MyPlugin: Plugin = async ({ client }) => {
  // Logging
  await client.app.log({ body: { service, level, message, extra } })
  
  // Session metadata
  const session = await client.session.get({ path: { id: sessionID } })
  const modelID = session.data?.modelID
  
  // Config access
  const config = await client.config.get()
  const providers = await client.config.providers()
  
  // Toast notifications
  await client.tui.showToast({ body: { message, variant, duration } })
}
```

**Key APIs:**
- `client.app.*` — Logging, agent listing
- `client.session.*` — Session lifecycle, messages, prompting
- `client.config.*` — Config and provider access
- `client.file.*` — File reading and search
- `client.tui.*` — TUI control (toasts, prompts, navigation)
- `client.auth.*` — Authentication management

See [SDK Reference](./sdk-reference.md) for complete documentation.

---

## Server API Overview

### Architecture

- The TUI is a **client** that talks to an HTTP server
- The server exposes an **OpenAPI 3.1 spec** at `/doc`
- The SDK is generated from this spec
- Multiple clients can connect (TUI, IDE plugins, web, CLI)

### Starting the Server

```bash
opencode serve [--port 4096] [--hostname 127.0.0.1] [--cors http://localhost:5173]
```

### Authentication

```bash
OPENCODE_SERVER_PASSWORD=your-password opencode serve
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/global/health` | Server health and version |
| GET | `/global/event` | SSE event stream |
| GET | `/project` | List all projects |
| GET | `/project/current` | Current project |
| GET | `/session` | List sessions |
| POST | `/session` | Create session |
| GET | `/session/:id` | Get session |
| POST | `/session/:id/message` | Send message |
| GET | `/session/:id/message` | List messages |
| GET | `/file/content?path=` | Read file |
| POST | `/tui/append-prompt` | Append to prompt |
| POST | `/tui/show-toast` | Show toast |
| GET | `/event` | SSE event stream |
| GET | `/doc` | OpenAPI spec |

---

## TUI Plugin API Overview

The TUI plugin receives an `api` object with these surfaces:

| API | Purpose |
|-----|---------|
| `api.client` | SDK client (same as server plugin `client`) |
| `api.ui.toast` | Show toast notifications |
| `api.ui.Prompt` | Prompt input component wrapper |
| `api.ui.dialog` | Dialog management (replace, setSize, clear) |
| `api.slots.register` | Register slot renderers |
| `api.event.on` | Subscribe to events |
| `api.lifecycle.onDispose` | Register cleanup callbacks |
| `api.theme.current` | Theme colors (text, textMuted, error, warning) |
| `api.kv` | Key-value storage for plugin state |
| `api.keymap` | Register slash commands (experimental) |

For the complete TUI API reference, see [SDK Reference](./sdk-reference.md#tui-plugin-api-reference).

### TUI Plugin Logging

```ts
// Use api.client for logging in TUI plugins
await api.client?.app?.log?.({
  body: {
    service: "my-plugin-tui",
    level: "info",
    message: "TUI initialized",
  },
})
```

Always use optional chaining (`?.`) in TUI plugins as APIs may not be available in all contexts.

---

## TUI Plugin Architecture

TUI plugins are TypeScript/JSX modules that render terminal UI components using SolidJS for reactivity.

For basic patterns, see the examples below. For deep SolidJS primitives and advanced reactive patterns, see the **`solidjs-tui` skill** at `.agents/skills/solidjs-tui/SKILL.md`.

### File Requirements

- **Must** be named `.tsx` (not `.js` or `.jsx`)
- **Must** start with `/** @jsxImportSource @opentui/solid */`
- **tsconfig.json** must have `"jsx": "preserve"`
- Do **not** import types from `@opencode-ai/plugin/tui` — causes silent load failures

### Plugin Structure

```ts
/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core"
import { Show, createSignal } from "solid-js"

const plugin = {
  id: "my-plugin-tui",
  tui: async (api: any, _options: any) => {
    // signals, events, slot registration
  },
}

export default plugin
```

### Available Slots

| Slot | Visibility | Slot Context |
|------|----------|--------------|
| `sidebar_content` | Inside active sessions only | `ctx: any, props: { session_id?: string }` |
| `home_bottom` | Home screen | `ctx: any, props: {}` |
| `home_footer` | Home screen | `ctx: any, props: {}` |
| `session_prompt` | Below chat input | `ctx: any, props: { session_id?: string, ref?: (ref: any) => void, disabled?: boolean, visible?: boolean, on_submit?: () => void }` |
| `app_bottom` | Always visible | `ctx: any, props: {}` |

**Props for `session_prompt`:**
- `session_id` — current session ID (optional, only for session-scoped slots)
- `ref` — passed to the built-in `<Prompt>` component for forwarding
- `disabled` — whether the prompt is disabled
- `visible` — whether the prompt is visible
- `on_submit` — callback when the user submits the prompt

The `session_prompt` slot **wraps/replaces** the default prompt component. If you register a `session_prompt` slot, you must render `<api.ui.Prompt>` for the prompt to function. Failure to forward the `ref` prop will break prompt functionality.

To add to (not replace) the prompt UI, render `<api.ui.Prompt>` with all props forwarded:

```tsx
function SessionPromptWithStatus(ctx: any, props: { session_id: string; ref?: any }) {
  return (
    <box gap={0}>
      <props.api.ui.Prompt
        sessionID={props.session_id}
        disabled={props.disabled}
        visible={props.visible}
        on_submit={props.on_submit}
        ref={props.ref}
      />
      <text fg={ctx.theme.current.textMuted}>Session: {props.session_id.slice(0, 8)}...</text>
    </box>
  )
}
```

**To remove a `session_prompt` slot:** Unregister it by calling `api.slots.unregister()` with the slot name, or remove the registration from `tui.json` (set `"enabled": false`).

### JSX Components

#### Layout

```tsx
<box padding={1} gap={1} flexDirection="row" justifyContent="center">
  <text fg={color}>Content</text>
</box>

<scrollbox width="100%" flexGrow={1} minHeight={6} maxHeight={28}>
  {/* scrollable content */}
</scrollbox>
```

#### Text

```tsx
<text fg={theme().text}>Normal text</text>
<text fg={theme().textMuted}>Muted text</text>
<text fg={theme().error}>Error text</text>
<text fg={theme().warning}>Warning text</text>
<text attributes={TextAttributes.BOLD}>Bold text</text>
<text wrapMode="word" width="100%">Wrapped text</text>
```

#### Conditional Rendering

```tsx
<Show when={condition()}>
  <text>Shown when true</text>
</Show>
```

#### Progress Bar

```tsx
<Slider
  orientation="horizontal"
  value={pct}
  min={0}
  max={100}
  foregroundColor={color}
  backgroundColor={theme().textMuted}
/>
```

#### Markdown

```tsx
<Markdown content={markdownString} />
```

### State Management

```ts
import { createSignal } from "solid-js"

const [value, setValue] = createSignal(0)
// Read: value()
// Write: setValue(newValue)
```

Signals trigger automatic re-renders when changed.

**For advanced SolidJS patterns** including memos, effects, resources, stores, control flows, and lifecycle management, see the **`solidjs-tui` skill** at `.agents/skills/solidjs-tui/SKILL.md`.

### Event System

```ts
const unsubEvent = api.event.on("session.idle", () => {
  // refresh data
})

api.lifecycle.onDispose(() => {
  unsubEvent()
})
```

### TUI Events

| Event | Properties |
|-------|------------|
| `session.idle` | `sessionID` |
| `session.updated` | `info.id`, `info.modelID`, `info.providerID` |
| `session.compacted` | `sessionID` |
| `message.updated` | `info.sessionID`, `info.id`, `info.role`, `info.tokens`, `info.cost` |
| `message.removed` | `sessionID`, `messageID` |
| `tui.session.select` | `sessionID` |

### Theme Colors

```ts
const theme = () => ctx.theme.current

theme().text        // Primary text color
theme().textMuted   // Secondary/muted text color
theme().error       // Error/red color
theme().warning     // Warning/yellow color
```

### File Access

`api.client.file.read()` is **sandboxed** to the workspace directory. Use Node `fs` directly:

```ts
import { readFileSync, existsSync } from "fs"

if (existsSync(path)) {
  const content = readFileSync(path, "utf-8")
}
```

### Toast Notifications

```ts
api.ui.toast?.({
  message: "Toast message",
  variant: "info" | "success" | "warning" | "error",
})
```

### Slot Component Signature

```ts
function MyComponent(ctx: any, props: { session_id?: string }) {
  // session_id is optional — non-session slots don't provide it
  const theme = () => ctx.theme.current
  return <box padding={1}><text fg={theme().text}>Hello</text></box>
}
```

### Keymap / Slash Commands (Experimental)

```ts
const keymap = (api as any).keymap
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
      // execute command
    },
  }],
})

if (typeof dispose === "function") {
  api.lifecycle.onDispose(dispose)
}
```

**Warning:** `api.keymap.registerLayer` may break plugin loading in some versions. Test carefully.

---

## Config System

### Config Locations and Precedence

Loaded in order (later overrides earlier):

1. Remote config (`.well-known/opencode`) — organizational defaults
2. Global config (`~/.config/opencode/opencode.json`) — user preferences
3. Custom config (`OPENCODE_CONFIG` env var) — custom overrides
4. Project config (`opencode.json`) — project-specific
5. `.opencode` directories — agents, commands, plugins
6. Inline config (`OPENCODE_CONFIG_CONTENT` env var) — runtime overrides
7. Managed config files — admin-controlled

Config files are **merged**, not replaced. Non-conflicting settings from all sources are preserved.

### JSON vs JSONC

Both `.json` and `.jsonc` (JSON with comments) are supported.

### Key Config Sections

| Section | Purpose |
|---------|---------|
| `server` | Port, hostname, mDNS, CORS |
| `shell` | Shell for interactive terminal |
| `tools` | Enable/disable tools |
| `provider` / `model` / `small_model` | Provider and model configuration |
| `agent` | Custom agents |
| `default_agent` | Default agent |
| `share` | Sharing mode (manual/auto/disabled) |
| `command` | Custom commands |
| `permission` | Tool permissions |
| `compaction` | Context compaction settings |
| `watcher` | File watcher ignore patterns |
| `mcp` | MCP servers |
| `plugin` | npm plugins |
| `instructions` | Instruction file paths |
| `formatter` | Code formatters |
| `lsp` | LSP servers |
| `disabled_providers` / `enabled_providers` | Provider allowlist/blocklist |

### Variable Substitution

```json
{
  "model": "{env:OPENCODE_MODEL}",
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}"
      }
    }
  },
  "instructions": ["{file:./custom-instructions.md}"]
}
```

### TUI Config

File location: `~/.config/opencode/tui.json` or `tui.jsonc` (global only — no local equivalent, no env var workaround).

Schema reference: `packages/tui/src/config/index.tsx` on [anomalyco/opencode:dev](https://github.com/anomalyco/opencode/blob/dev/packages/tui/src/config/index.tsx).

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "theme": "opencode",
  "keybinds": { "command_list": "ctrl+p" },
  "scroll_speed": 3,
  "diff_style": "auto",
  "mouse": true,
  "plugin": [
    // String (simple)
    "./path/to/plugin.tsx",
    "npm-package-name",
    // Tuple with options
    ["./plugins/my-plugin.tsx", { "enabled": false, "label": "workspace" }]
  ],
  "plugin_enabled": {
    "my-plugin": true
  }
}
```

**plugin field format:**
| Format | Example | Purpose |
|--------|---------|---------|
| String | `"./plugins/my-plugin.tsx"` | Simple path or npm package name |
| Tuple | `["./plugins/my-plugin.tsx", { "enabled": false, "label": "workspace" }]` | Path with options |

`PluginSpec = Schema.Union([Schema.String, Tuple([String, Record(String, Unknown)])])`

Options can include `enabled` (boolean) and `label` (string). Opencode resolves the path relative to `~/.config/opencode/` — not relative to your workspace.

**Note:** TUI plugins are `.tsx` files (not compiled). The runtime searches for `dist/tui.tsx` inside the specified folder path. To load a workspace TUI plugin, add the **absolute path to the workspace root** (which contains `dist/tui.tsx`).

---

### TUI Plugin Host

TUI plugins are loaded by `pluginHost.start()` called during `Tui.run()` in `packages/tui/src/app.tsx`. Each plugin receives an `api` object created from `createTuiApi(createTuiApiAdapters({...}))`:

```ts
pluginHost.start({
  api,           // TuiApi — slots, theme, events, dialogs, toast, etc.
  config,        // TuiConfig.Resolved — resolved config
  runtime,       // PluginRuntime — routes, slots, etc.
  dispose,       // () => void — cleanup handler
})
```

The `api` object is **not** `any` — it is a structured `TuiApi` type. However, importing types from `@opencode-ai/plugin/tui` is deprecated and causes silent load failures. The recommended pattern is:

```ts
/** @jsxImportSource @opentui/solid */

const plugin = {
  id: "my-plugin-tui",
  tui: async (api: any, _options: any) => {
    // api type omitted intentionally — use at your own risk
    // See docs/instructions/opencode-plugin-architecture.md for API surfaces
  },
}

export default plugin
```

The plugin is loaded from `dist/tui.tsx` when the runtime resolves the workspace path specified in `tui.json`.

---

## Agent System

### Agent Types

- **Primary agents** — main assistants you interact with directly (Tab to cycle)
- **Subagents** — specialized assistants invoked by primary agents or via `@mention`

### Built-in Agents

| Agent | Mode | Purpose |
|-------|------|---------|
| `build` | primary | Default — all tools enabled |
| `plan` | primary | Planning/analysis — restricted permissions |
| `general` | subagent | General-purpose, full tool access |
| `explore` | subagent | Read-only codebase exploration |
| `scout` | subagent | External docs and dependency research |
| `compaction` | primary | Hidden — context compaction |
| `title` | primary | Hidden — session title generation |
| `summary` | primary | Hidden — session summary generation |

### Agent Config (JSON)

```json
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "You are a code reviewer...",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  }
}
```

### Agent Config (Markdown)

Place in `~/.config/opencode/agents/` or `.opencode/agents/`:

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
permission:
  edit: deny
  bash: deny
---

You are in code review mode. Focus on security, performance, and maintainability.
```

### Permission System

| Value | Behavior |
|-------|----------|
| `"allow"` | Tool runs without approval |
| `"ask"` | User prompted for approval |
| `"deny"` | Tool disabled |

Permission keys support glob patterns:

```json
{
  "permission": {
    "bash": {
      "*": "ask",
      "git status *": "allow",
      "git *": "ask"
    }
  }
}
```

Last matching rule wins.

### Task Permissions

Control which subagents an agent can invoke:

```json
{
  "agent": {
    "orchestrator": {
      "permission": {
        "task": {
          "*": "deny",
          "orchestrator-*": "allow",
          "code-reviewer": "ask"
        }
      }
    }
  }
}
```

---

## Skills System

### File Placement

Skills are `SKILL.md` files in directories:

- Project: `.opencode/skills/<name>/SKILL.md`
- Global: `~/.config/opencode/skills/<name>/SKILL.md`
- Claude-compatible: `.claude/skills/<name>/SKILL.md`, `~/.claude/skills/<name>/SKILL.md`
- Agent-compatible: `.agents/skills/<name>/SKILL.md`, `~/.agents/skills/<name>/SKILL.md`

### Discovery

Opencode walks up from cwd to git worktree, loading any matching `skills/*/SKILL.md` along the way.

### Frontmatter

```yaml
---
name: my-skill
description: What this skill does (1-1024 chars)
license: MIT
compatibility: opencode
metadata:
  audience: developers
---
```

### Name Validation

- 1–64 characters
- Lowercase alphanumeric with single hyphen separators
- Not start/end with `-`, no consecutive `--`
- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`

### Skill Permissions

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "pr-review": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

---

## Ecosystem

### Official Resources

| Resource | URL | Description |
|----------|-----|-------------|
| Official ecosystem | https://opencode.ai/docs/ecosystem/ | Complete list of plugins, projects, and agents |
| awesome-opencode | https://github.com/awesome-opencode/awesome-opencode | Community awesome list |
| opencode.cafe | https://opencode.cafe | Community hub aggregating ecosystem |

See [Ecosystem Reference](./ecosystem-reference.md) for additional curated resources.

---

## Upstream References

| Resource | URL |
|----------|-----|
| Official docs | https://opencode.ai/docs/ |
| Plugin docs | https://opencode.ai/docs/plugins/ |
| SDK docs | https://opencode.ai/docs/sdk/ |
| Server docs | https://opencode.ai/docs/server/ |
| Config docs | https://opencode.ai/docs/config/ |
| Agents docs | https://opencode.ai/docs/agents/ |
| Ecosystem | https://opencode.ai/docs/ecosystem/ |
| Source code | https://github.com/anomalyco/opencode |
| SDK source | https://github.com/anomalyco/opencode/tree/dev/packages/sdk |
| Plugin package | https://github.com/anomalyco/opencode/tree/dev/packages/plugin |
| Docs source | https://github.com/anomalyco/opencode/tree/dev/packages/web/src/content/docs |

---

## Troubleshooting Quick Reference

### Plugin Doesn't Load

1. Check file extension (`.js` or `.ts` for server, `.tsx` for TUI)
2. Verify exports — must export a function (not a plain object)
3. Don't import from `@opencode-ai/plugin/tui` — causes silent failures
4. Check opencode logs: `export OPENCODE_LOG_LEVEL=DEBUG && opencode`

### TUI Plugin Issues

1. File **must** be `.tsx` extension
2. Must have `/** @jsxImportSource @opentui/solid */` pragma
3. `tsconfig.json` must have `"jsx": "preserve"`
4. Build script must **copy** `.tsx` to `dist/`, not compile to `.jsx`
5. Don't import types from `@opencode-ai/plugin/tui`

### Skill Not Showing Up

1. Verify `SKILL.md` is spelled in all caps
2. Check frontmatter includes `name` and `description`
3. Ensure skill names are unique across all locations
4. Check permissions — skills with `deny` are hidden

### Config Not Applying

1. Check precedence order — managed settings override everything
2. Config files are merged, not replaced
3. Use `opencode debug config` to see resolved config

### Debug Logging

```bash
# Server plugin
export OPENCODE_LOG_LEVEL=DEBUG opencode

# TUI plugin (SDK only, no stderr)
await api.client?.app?.log?.({
  body: { service: "my-plugin-tui", level: "info", message: "TUI message" },
})

# Filter all logs
opencode --log-level DEBUG --print-logs 2>&1 | grep "my-plugin"
```

### File Sandbox Errors

Use `fs.readFileSync` instead of `api.client.file.read()` — the API is sandboxed to workspace.

### Common Error Patterns

| Issue | Solution |
|-------|----------|
| `api.keymap.registerLayer` breaks loading | Guard with `if (!keymap?.registerLayer) return` |
| Toast notifications not showing | Use `.catch(() => {})` — they're non-blocking |
| `session_id` undefined in slot props | Make it optional — non-session slots don't provide it |
| Plugin logs not visible | Use `api.client.app.log()`, not `process.stderr.write` or `console.log` |
