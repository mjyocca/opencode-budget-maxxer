# Your Plugin — Development Guide

## What This Is

A **starter kit** for building opencode plugins with **server** (SDK hooks, tools, events) and **TUI** (JSX-based terminal UI) support.

**You get:**
- **Library primitives** — SDK logger, config patterns
- **Reference documentation** — Comprehensive guides for plugin architecture, SDK, and ecosystem
- **Agent skills** — Action-oriented guides for common plugin development tasks
- **Working examples** — Server plugin with SDK logger, TUI plugin with slots and events

**First time?** Load the `plugin-quick-start` skill to set your plugin name and learn common patterns.

---

## Quick Start

```bash
# 1. Set config
cp .env.local.example .env.local
# Or manually: export OPENCODE_CONFIG_CONTENT='{"plugin":["./dist/index.js"]}'

# 2. Install dependencies
pnpm install

# 3. Build
pnpm run build

# 4. Type-check without emitting
pnpm run build:check

# 5. Watch mode during development
pnpm run dev
```

---

## Project Structure

```
your-plugin-name/
├── src/
│   ├── index.ts          # Server plugin — hooks, tools, events
│   ├── tui.tsx           # TUI plugin entry point — JSX slot registrations
│   └── ..
├── docs/
│   └── instructions/
│       ├── opencode-plugin-architecture.md  # Comprehensive opencode reference
│       ├── sdk-reference.md                 # Complete SDK API documentation
│       └── ecosystem-reference.md           # Curated community resources
├── scripts/
│   └── build-tui.mjs     # Copies tui.tsx → dist/tui.tsx (no compilation)
├── dist/                 # Build output
├── package.json          # Single package, exports for . /server /tui
├── tsconfig.json         # jsx: "preserve" (required for TUI runtime)
├── .agents/skills/       # Agent skills for development guidance
│   ├── plugin-quick-start/SKILL.md
│   ├── plugin-server/SKILL.md
│   ├── plugin-tui/SKILL.md
│   ├── plugin-logging/SKILL.md
│   ├── plugin-config-patterns/SKILL.md
│   ├── opencode-agents/SKILL.md
│   └── opencode-troubleshooting/SKILL.md
└── AGENTS.md             # This file
```

---

## Exports

| Export Path | File | Purpose |
|-------------|------|---------|
| `.` | `dist/index.js` | Server plugin (default) |
| `./server` | `dist/index.js` | Server plugin (explicit) |
| `./tui` | `dist/tui.tsx` | TUI plugin (raw TSX, not compiled) |

---

## Installing in opencode

### Local config (recommended)

Use `OPENCODE_CONFIG_CONTENT` to inject the plugin entry without touching global config:

```bash
export OPENCODE_CONFIG_CONTENT='{"plugin":["./dist/index.js"]}'
```

You can set this in your .envrc or .env.local. The server plugin uses a **relative path** (`./dist/index.js`) so it resolves correctly from any workspace location.

### TUI plugin (global only)

TUI config has no local equivalent — run `pnpm run dev:install` to add the workspace to `~/.config/opencode/tui.json`, or manually edit:

```json
["/absolute/path/to/your-plugin"]
```

The TUI runtime loads `tui.tsx` from the `dist/` directory.

### From npm (after publishing)

```json
{
  "plugin": [
    "your-plugin-name"
  ]
}
```

---

## Development Workflow

### Server Plugin

1. Edit `src/index.ts`
2. `pnpm run build` (or `pnpm run dev` for watch)
3. Restart opencode to pick up changes

### TUI Plugin

1. Edit `src/tui.tsx`
2. `pnpm run build` (copies `.tsx` to `dist/`)
3. Restart opencode TUI to pick up changes

### Debug Logging

Server plugin — use SDK logger:
```ts
await client.app.log({
  body: {
    service: "your-plugin-name",
    level: "debug",
    message: "Plugin initialized",
    extra: { project, directory },
  },
})
```

TUI plugin — use SDK logger (no stderr fallback to avoid UI pollution):
```ts
await api.client?.app?.log?.({
  body: {
    service: "your-plugin-tui",
    level: "info",
    message: "TUI initialized",
  },
})
```

Filter logs:
```bash
opencode --log-level DEBUG --print-logs 2>&1 | grep "your-plugin"
```

See [plugin-logging](./.agents/skills/plugin-logging/SKILL.md) for complete patterns. Note: TUI plugins use the SDK logger with no stderr fallback.

---

## Key Conventions

### Server Plugin (`src/index.ts`)

- Export a `Plugin` function (not a plain object)
- Use `tool()` from `@opencode-ai/plugin` to define tools
- Register event handlers via the returned hooks object
- Log via `client.app.log()` for structured logging (see [plugin-logging](./.agents/skills/plugin-logging/SKILL.md))
- Context params: `client`, `project`, `directory`, `worktree`, `$` (Bun shell)

### TUI Plugin (`src/tui.tsx`)

- **Must** start with `/** @jsxImportSource @opentui/solid */`
- **Must** use `.tsx` extension (not `.js` or `.jsx`)
- `tsconfig.json` must have `"jsx": "preserve"`
- Do **not** import types from `@opencode-ai/plugin/tui` (breaks loading)
- Use `api: any` instead of typed imports
- Use `readFileSync`/`existsSync` from `fs` for file access (sandboxed API)
- Register slots via `api.slots.register({ order, slots })`
- Clean up via `api.lifecycle.onDispose()`

### TUI Quick Reference

- **Slots:** `sidebar_content`, `home_bottom`, `home_footer`, `session_prompt`, `app_bottom`
- **Components:** `<box>`, `<text>`, `<scrollbox>`, `<Slider>`, `<Show>`, `<Markdown>`
- **Theme:** `api.theme.current.text`, `.textMuted`, `.error`, `.warning`

For the complete list of hooks, events, slots, and components, see the [architecture reference](./docs/instructions/opencode-plugin-architecture.md).

---

## Common First Tasks

New to plugin development? Start with these skills:

1. **Add a tool** — See [plugin-quick-start](./.agents/skills/plugin-quick-start/SKILL.md#adding-a-tool)
2. **Handle an event** — See [plugin-quick-start](./.agents/skills/plugin-quick-start/SKILL.md#handling-events)
3. **Add a TUI slot** — See [plugin-quick-start](./.agents/skills/plugin-quick-start/SKILL.md#adding-a-tui-slot)
4. **Add logging** — See [plugin-logging](./.agents/skills/plugin-logging/SKILL.md)
5. **Read config** — See [plugin-config-patterns](./.agents/skills/plugin-config-patterns/SKILL.md)

---

## Available Hooks

The plugin function returns an object with any combination of these hooks:

- **Lifecycle:** `dispose`
- **Tools:** `tool` map
- **Config:** `config(cfg)`
- **Chat pipeline:** `chat.message`, `chat.params`, `chat.headers`
- **Tool lifecycle:** `tool.execute.before`, `tool.execute.after`, `tool.definition`
- **Command:** `command.execute.before`
- **Shell:** `shell.env`
- **Permission:** `permission.asked`, `permission.replied`
- **Compaction:** `experimental.session.compacting`
- **Events:** `event` hook receives all 34+ event types

See the [architecture reference](./docs/instructions/opencode-plugin-architecture.md) for detailed documentation on each hook and event.

---

## Available Skills

| Skill | When to Use |
|-------|-------------|
| `plugin-quick-start` | First tasks: add tool, handle event, add TUI slot — start here for new plugins |
| `plugin-spec` | Defining plugin vision — problem, use cases, design, implementation plan |
| `plugin-server` | Developing server plugins — hook registration, tool definitions, event handling |
| `plugin-tui` | TUI plugin development — slots, components, theme, events, troubleshooting |
| `solidjs-tui` | SolidJS for TUI — signals, effects, memos, resources, stores, control flows, lifecycle |
| `plugin-logging` | Logging patterns — SDK structured logging, TUI fallback, debug modes |
| `plugin-config-patterns` | Config resolution, JSONC parsing, API key lookup, runtime paths |
| `opencode-agents` | Configuring or creating agents — permissions, subagents, agent options |
| `opencode-troubleshooting` | Debugging issues — plugin loading, TUI problems, config resolution |

Skills are loaded automatically. Agents discover them via the `skill` tool and load context on demand.

---

## OpenCode Reference

For detailed information about opencode plugin architecture, hooks, events, SDK, server API, TUI components, config system, agents, and skills:

- **[OpenCode Plugin Architecture](./docs/instructions/opencode-plugin-architecture.md)** — comprehensive reference covering all opencode plugin development topics

---

## Known Gotchas

1. **TUI file must be `.tsx`** — the runtime looks for this extension specifically
2. **`jsx: "preserve"` is required** — JSX must not be compiled away
3. **`api.client.file.read()` is sandboxed** — use Node `fs` directly for files outside workspace
4. **Don't import from `@opencode-ai/plugin/tui`** — causes silent load failures
5. **`api.keymap.registerLayer` may break loading** — untested API surface
6. **`session_id` in slot props must be optional** — non-session slots don't have it
7. **Toast notifications are non-blocking** — don't await them in event handlers
