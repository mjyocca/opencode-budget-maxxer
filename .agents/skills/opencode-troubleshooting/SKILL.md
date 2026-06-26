---
name: opencode-troubleshooting
description: Troubleshooting guide for opencode — plugin loading issues, TUI problems, skill discovery, config resolution, and common error patterns. Use when debugging opencode issues.
---

# OpenCode Troubleshooting

Systematic troubleshooting steps for common opencode issues. For full architecture reference, see `docs/instructions/opencode-plugin-architecture.md`.

---

## Plugin Doesn't Load

### Server Plugin

1. **Check file extension** — must be `.js` or `.ts`
2. **Verify export** — must export a function, not a plain object:
   ```ts
   export const MyPlugin = async (ctx) => { return { /* hooks */ } }
   export default MyPlugin
   ```
3. **Check import path** — if using `@opencode-ai/plugin`, ensure it's installed
4. **Check config** — verify path in `opencode.json` `"plugin"` array is correct
5. **Enable debug logging**:
   ```bash
   export OPENCODE_LOG_LEVEL=DEBUG
   opencode
   ```
6. **Check for silent errors** — use `api.client.app.log()`, not `console.log`
7. **Don't import from `@opencode-ai/plugin/tui`** — causes silent load failures

### TUI Plugin

1. **File must be `.tsx`** — not `.js` or `.jsx`
2. **Must start with pragma**:
   ```ts
   /** @jsxImportSource @opentui/solid */
   ```
3. **`tsconfig.json` must have** `"jsx": "preserve"`
4. **Build script must copy** `.tsx` to `dist/`, not compile to `.jsx`
5. **Don't import types from `@opencode-ai/plugin/tui`** — silent failure
6. **Check `tui.json`** — verify path is correct in the array
7. **Use `api: any`** — typed imports break TUI runtime
8. **Debug with SDK logger**:
    ```ts
    await api.client?.app?.log?.({
      body: { service: "my-plugin-tui", level: "info", message: "loaded" },
    })
    ```

---

## Skill Not Showing Up

1. **`SKILL.md` must be all caps** — not `skill.md` or `Skill.md`
2. **Frontmatter must include** `name` and `description`:
   ```yaml
   ---
   name: my-skill
   description: What this skill does
   ---
   ```
3. **Name must match directory** — `skills/my-skill/SKILL.md` → `name: my-skill`
4. **Name validation** — lowercase, hyphen-separated, 1-64 chars, regex: `^[a-z0-9]+(-[a-z0-9]+)*$`
5. **Unique across all locations** — no duplicate names in `.opencode/`, `~/.config/`, `.claude/`, `.agents/`
6. **Check permissions** — skills with `"deny"` are hidden from agents:
   ```json
   { "permission": { "skill": { "my-skill": "allow" } } }
   ```
7. **Check agent tools** — if `skill: false` in agent config, the tool is disabled entirely

---

## Config Not Applying

1. **Check precedence order** (later overrides earlier):
   - Remote config → Global config → Custom config → Project config → `.opencode` dirs → Inline config → Managed settings
2. **Config files are merged, not replaced** — non-conflicting settings from all sources are preserved
3. **Managed settings override everything** — check `/Library/Application Support/opencode/` (macOS) or `/etc/opencode/` (Linux)
4. **Use debug command** to see resolved config:
   ```bash
   opencode debug config
   ```
5. **Check for typos** — JSONC supports comments, JSON does not
6. **Variable substitution** — `{env:VAR}` returns empty string if not set

---

## Debug Logging

### Server Plugin (SDK Structured Logging)

**Recommended approach:**

```ts
export const MyPlugin: Plugin = async ({ client }) => {
  await client.app.log({
    body: {
      service: "my-plugin",
      level: "info",
      message: "Plugin initialized",
      extra: { project, directory },
    },
  })
  
  return {
    event: async ({ event }) => {
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

Levels: `debug`, `info`, `warn`, `error`.

Run with: `export OPENCODE_LOG_LEVEL=DEBUG` (or `pnpm run debug`)

### TUI Plugin (SDK Only — No stderr)

```ts
// SDK logging only — silently discards if client not available
await api.client?.app?.log?.({
  body: {
    service: "my-plugin-tui",
    level: "info",
    message: "TUI initialized",
  },
})
```

### Filter All Logs

```bash
opencode --log-level DEBUG --print-logs 2>&1 | grep "my-plugin"
```

See [plugin-logging](../plugin-logging/SKILL.md) for complete patterns.

---

## Server Issues

### Port Conflicts

```bash
# Check if port is in use
lsof -i :4096

# Use different port
opencode serve --port 5000
```

### Authentication

```bash
OPENCODE_SERVER_PASSWORD=your-password opencode serve
# Username defaults to "opencode", override with OPENCODE_SERVER_USERNAME
```

### CORS

```bash
opencode serve --cors http://localhost:5173 --cors https://app.example.com
```

### mDNS Discovery

```bash
opencode serve --mdns --mdns-domain myproject.local
```

---

## File Sandbox Errors

`api.client.file.read()` is sandboxed to the workspace directory.

**Solution:** Use Node `fs` directly:

```ts
import { readFileSync, existsSync } from "fs"

if (existsSync(path)) {
  const content = readFileSync(path, "utf-8")
}
```

---

## Common Error Patterns

| Issue | Solution |
|-------|----------|
| `api.keymap.registerLayer` breaks loading | Guard with `if (!keymap?.registerLayer) return` |
| Toast notifications not showing | Use `.catch(() => {})` — they're non-blocking |
| `session_id` undefined in slot props | Make it optional — non-session slots don't provide it |
| Plugin logs not visible | Use `api.client.app.log()`, not `console.log` or `stderr` |
| JSX not rendering in TUI | Check `jsx: "preserve"` in tsconfig, `.tsx` extension |
| Build produces `.jsx` instead of `.tsx` | Copy file, don't compile — TUI runtime transforms JSX |
| Plugin hooks not firing | Verify hook name matches exactly (case-sensitive) |
| Event handler not receiving events | Check `event.type` matches exactly |
| Tool not showing up in agent | Check `tools` config and `permission` settings |
| Agent not appearing in Tab cycle | Must be `mode: "primary"` or `mode: "all"` |
| Subagent not responding to @mention | Check `permission.task` for the agent |
