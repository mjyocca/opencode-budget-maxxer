# opencode-plugin-kit

Starter kit for building [opencode](https://opencode.ai) plugins with server and TUI support.

## What You Get

- **Server plugin** — hooks, tools, event handling via `@opencode-ai/plugin` SDK
- **TUI plugin** — JSX-based terminal UI with slot renderers via `@opentui/solid`
- **Agent skills** — Guided development workflows loaded automatically
- **Reference docs** — Comprehensive SDK and architecture guides
- **Library utilities** — SDK logger, config patterns

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set your plugin name

The template uses `opencode-plugin-kit` as a placeholder. Replace it with your plugin name:

- `package.json` — name field
- `src/lib/constants.ts` — PLUGIN_ID
- `src/index.ts` — tool output message
- `src/tui.tsx` — sidebar title

**Or** open opencode and load the `plugin-quick-start` skill — it will guide you through renaming.

### 3. Build

```bash
pnpm run build
```

### 4. Install in opencode

**Server plugin** — set `OPENCODE_CONFIG_CONTENT` (no global config needed):

```bash
export OPENCODE_CONFIG_CONTENT='{"plugin":["./dist/index.js"]}'
```

Or copy `cp .env.local.example .env.local` and use direnv. The relative path `./dist/index.js` resolves from your workspace.

**TUI plugin** — global only, run `pnpm run dev:install` to add the workspace to `~/.config/opencode/tui.json`:

```bash
pnpm run dev:install
```

### 5. Restart opencode

Your plugin is now loaded. Test it with the `hello` tool (server) or check the sidebar (TUI).

---

## Development

```bash
pnpm run build       # Build both server and TUI plugins
pnpm run dev         # Watch mode (server only)
pnpm run build:check # Type-check without emitting
```

---

## Project Structure

```
src/
├── index.ts          # Server plugin — hooks, tools, events
├── tui.tsx           # TUI plugin entry point — JSX slot registrations
└── ..

.agents/skills/       # Development skills (loaded automatically)
├── plugin-quick-start/SKILL.md
├── plugin-server/SKILL.md
├── plugin-tui/SKILL.md
├── solidjs-tui/SKILL.md
├── plugin-logging/SKILL.md
├── plugin-config-patterns/SKILL.md
├── opencode-agents/SKILL.md
└── opencode-troubleshooting/SKILL.md

docs/instructions/    # Reference documentation
├── opencode-plugin-architecture.md
├── sdk-reference.md
└── ecosystem-reference.md
```

---

## Skills

Agent skills are loaded automatically when you open this project in opencode.

**Start here:**
- `plugin-quick-start` — Set plugin name, add a tool, handle events, add TUI slot

**Next steps:**
- `plugin-server` — Advanced hook patterns, client API reference
- `plugin-tui` — JSX components, slots, theme colors, troubleshooting
- `solidjs-tui` — SolidJS primitives for TUI (signals, effects, stores, lifecycle)
- `plugin-logging` — Structured logging, debug modes
- `plugin-config-patterns` — Config resolution, API key lookup

See [AGENTS.md](./AGENTS.md) for the full development guide.

---

## Common First Tasks

1. **Add a tool** — Define a function the AI can call during sessions
2. **Handle an event** — React to session lifecycle, messages, file edits
3. **Add a TUI slot** — Render UI in the terminal sidebar, home screen, or prompt area
4. **Add logging** — Structured logging with SDK or stderr fallback
5. **Read config** — Access opencode config or plugin-specific settings

All patterns are documented in the `plugin-quick-start` skill.

---

## Exports

This package exports both server and TUI plugins:

| Export Path | File | Purpose |
|-------------|------|---------|
| `.` | `dist/index.js` | Server plugin (default) |
| `./server` | `dist/index.js` | Server plugin (explicit) |
| `./tui` | `dist/tui.tsx` | TUI plugin (raw TSX) |

---

## License

MIT
