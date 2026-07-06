# opencode-budget-maxxer

Surface provider usage limits and quota data for OpenCode and GitHub Copilot backends, displayed in the TUI sidebar with per-session provider override.

## Features

- **Provider quota display** — Shows remaining usage limits for OpenCode Go, OpenCode Zen, and GitHub Copilot
- **Per-session tracking** — Each session independently tracks which provider's quota to display
- **Manual override** — Switch the sidebar to show any provider regardless of the active model via `/budget:show`
- **Auto-follow** — Default mode follows the active model in each session
- **TUI sidebar meter** — Visual budget meter with provider name, usage bar, and reset time
- **Three built-in providers** — Go, Zen, and Copilot with auth resolution and API polling

## Demo

<p align="center">
  <img src="docs/images/demo-opencode-go.png" alt="OpenCode Go budget meter" width="500" />
  <br />
  <em>OpenCode Go</em>
</p>

<p align="center">
  <img src="docs/images/demo-opencode-zen.png" alt="OpenCode Zen budget meter" width="500" />
  <br />
  <em>OpenCode Zen</em>
</p>

<p align="center">
  <img src="docs/images/demo-copilot.png" alt="GitHub Copilot budget meter" width="500" />
  <br />
  <em>GitHub Copilot</em>
</p>

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build

```bash
pnpm run build
```

### 3. Install in opencode

**Server plugin** — set `OPENCODE_CONFIG_CONTENT` (no global config needed):

```bash
export OPENCODE_CONFIG_CONTENT='{"plugin":["./dist/index.js"]}'
```

Or copy `cp .env.local.example .env.local` and use direnv. The relative path `./dist/index.js` resolves from your workspace.

**TUI plugin** — global only, run `pnpm run dev:install` to add the workspace to `~/.config/opencode/tui.json`:

```bash
pnpm run dev:install
```

### 4. Restart opencode

The budget meter appears in the sidebar once a session is active. Use `/budget:show` to switch providers.

---

## Development

```bash
pnpm run build       # Build both server and TUI plugins
pnpm run dev         # Watch mode (server only)
pnpm run build:check # Type-check without emitting
pnpm test            # Run test suite
```

---

## Architecture

```
src/
├── index.ts                  # Server plugin — hooks, tools, chat.headers
├── tui.tsx                   # TUI plugin — sidebar slot, /budget:show command
├── cache.ts                  # Per-session quota cache with mutex, provider alias mapping
├── lib/
│   ├── core/                 # Constants, types
│   ├── http/                 # HTTP fetch wrapper, retry, errors
│   ├── auth/                 # Auth file reader, credential resolution
│   ├── provider/             # Provider result types, helpers
│   ├── hooks/                # Hook composition utilities
│   └── ...                   # Config discovery, runtime paths, mutex, etc.
└── providers/
    ├── opencode-go/          # Go provider — auth, API, adapter
    ├── opencode-zen/         # Zen provider — auth, API, adapter
    └── copilot/              # Copilot provider — auth, API, adapter
```

### Key Design Decisions

- **One-way dependency arrow**: `index.ts` → `providers/` → `lib/`
- **Mutex-protected cache**: All cache read-modify-write operations serialized
- **Provider ID aliases**: `mapProviderID()` normalizes provider IDs across opencode versions
- **Slot-driven session tracking**: `sidebar_content` slot props provide reliable session context
- **Per-session override**: `setSessionOverrideProvider()` stores user preference per session

---

## Exports

| Export Path | File | Purpose |
|-------------|------|---------|
| `.` | `dist/index.js` | Server plugin (default) |
| `./server` | `dist/index.js` | Server plugin (explicit) |
| `./tui` | `dist/tui.tsx` | TUI plugin (raw TSX) |

---

## License

MIT
