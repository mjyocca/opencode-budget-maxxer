---
name: plugin-tui
description: Use ONLY when developing opencode TUI plugins. Covers slot registration, JSX components (@opentui/solid), reactive state basics, theme colors, event handling, and troubleshooting. Uses SolidJS for reactivity—for deep SolidJS primitives and advanced patterns, see solidjs-tui skill.
---

# TUI Plugin Development

For the complete opencode plugin architecture reference, see `docs/instructions/opencode-plugin-architecture.md`.

## File Requirements

- **Must** be named `.tsx` (not `.js` or `.jsx`)
- **Must** start with `/** @jsxImportSource @opentui/solid */`
- **tsconfig.json** must have `"jsx": "preserve"`
- Do **not** import types from `@opencode-ai/plugin/tui` — causes silent load failures

## Plugin Structure

```ts
/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core";
import { Show, createSignal } from "solid-js";

// api parameter is "any" — importing types from @opencode-ai/plugin/tui breaks loading
const plugin = {
  id: "my-plugin-tui",
  tui: async (api: any, _options: any) => {
    // Plugin init — register slots, events, etc.
    // api provides: slots, theme, event, kv, dialog, toast, Prompt component
  },
};

export default plugin;
```

**TUI plugin loading:** Plugins are loaded by `pluginHost.start({ api })` during `Tui.run()` in opencode's source (`packages/tui/src/app.tsx`). The `api` is a structured `TuiApi` type but importing it from `@opencode-ai/plugin/tui` causes silent load failures. Use `api: any` instead.

**Plugin path resolution:** TUI paths in `tui.json` are resolved relative to `~/.config/opencode/`. To load a TUI plugin from a workspace folder, add the absolute path to the workspace root (which contains `dist/tui.tsx`).

## Slot Registration

```ts
api.slots.register({
  order: 300,  // lower = rendered first
  slots: {
    sidebar_content: MyComponent,
  },
});
```

### Available Slots

| Slot | Visibility |
|------|------------|
| `sidebar_content` | Inside active sessions only |
| `home_bottom` | Home screen |
| `home_footer` | Home screen |
| `session_prompt` | Below chat input |
| `app_bottom` | Always visible |

## JSX Components

### Layout

```tsx
<box padding={1} gap={1} flexDirection="row" justifyContent="center">
  <text fg={color}>Content</text>
</box>

<scrollbox width="100%" flexGrow={1} minHeight={6} maxHeight={28}>
  {/* scrollable content */}
</scrollbox>
```

### Text

```tsx
<text fg={theme().text}>Normal text</text>
<text fg={theme().textMuted}>Muted text</text>
<text fg={theme().error}>Error text</text>
<text fg={theme().warning}>Warning text</text>
<text attributes={TextAttributes.BOLD}>Bold text</text>
<text wrapMode="word" width="100%">Wrapped text</text>
```

### Conditional Rendering

```tsx
<Show when={condition()}>
  <text>Shown when true</text>
</Show>

{condition() && <text>Alternative</text>}
{array.map(item => <text>{item}</text>)}
```

### Progress Bar (Character-Based)

```tsx
function ProgressBar(props: { pct: number; width?: number; color: string }) {
  const w = props.width ?? 20;
  const filled = Math.max(0, Math.min(w, Math.round((props.pct / 100) * w)));
  const empty = w - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return <text fg={props.color}>{bar} {props.pct}%</text>;
}
```

### Slider Component

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

## State Management

```ts
import { createSignal } from "solid-js";

const [value, setValue] = createSignal(0);

// Read: value()
// Write: setValue(newValue)
```

Signals trigger automatic re-renders when changed.

**For advanced SolidJS patterns** — `createMemo` (derived state), `createEffect` (side effects), `createResource` (async data), `createStore` (nested state), control flows (`<For>`, `<Index>`, `<Switch>`), and lifecycle — see **[`solidjs-tui`](../solidjs-tui/SKILL.md)**.

## Event System

```ts
const unsubEvent = api.event.on("session.idle", () => {
  // refresh data
});

// Cleanup:
api.lifecycle.onDispose(() => {
  unsubEvent();
});
```

### Common TUI Events

| Event | When |
|-------|------|
| `session.idle` | Session waiting for input |
| `session.updated` | Session metadata changed |
| `message.updated` | Message content changed |
| `tui.session.select` | User selected a session in TUI |

**Full event list:** See [Event Reference](../../docs/instructions/opencode-plugin-architecture.md#event-reference) or [SDK Event type](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

## Lifecycle & Cleanup

```ts
api.lifecycle.onDispose(() => {
  clearInterval(interval);
  unsubEvent();
});
```

## Theme Colors

Access via slot context or directly from api:

```ts
// In slot component
const theme = () => ctx.theme.current

// Directly from api
api.theme.current.text
api.theme.current.textMuted
api.theme.current.error
api.theme.current.warning

theme().text        // Primary text color
theme().textMuted   // Secondary/muted text color
theme().error       // Error/red color
theme().warning     // Warning/yellow color
```

## File Access

`api.client.file.read()` is **sandboxed** to the workspace directory. Use Node `fs` directly:

```ts
import { readFileSync, existsSync } from "fs";

if (existsSync(path)) {
  const content = readFileSync(path, "utf-8");
  const data = JSON.parse(content);
}
```

## Debug Logging

**Use SDK logging exclusively — no stderr fallback.**

Stderr output in TUI plugins pollutes the terminal UI, so there is no stderr fallback.

```ts
// TUI plugins use api.client with optional chaining
await api.client?.app?.log?.({
  body: {
    service: "my-plugin-tui",
    level: "info",
    message: "TUI initialized",
    extra: { someData: "value" },
  },
})
```

Or use the provided helper:

```ts
import { createTuiLogger } from "../lib/core/logger"

const tui: TuiPlugin = async (api, _options) => {
  const log = createTuiLogger(api, "my-plugin-tui")
  log.info("TUI initialized")
  log.debug("Debug message (filtered unless OPENCODE_LOG_LEVEL=DEBUG)")
}
```

Filter logs:
```bash
opencode --log-level DEBUG --print-logs 2>&1 | grep "my-plugin-tui"
```

See [plugin-logging](../plugin-logging/SKILL.md) for complete patterns.

## Slot Component Signature

```ts
function MyComponent(ctx: any, props: { session_id?: string }) {
  // session_id is optional — non-session slots don't provide it
  const theme = () => ctx.theme.current;
  return <box padding={1}><text fg={theme().text}>Hello</text></box>;
}
```

## Keymap / Slash Commands (Experimental)

```ts
const keymap = (api as any).keymap;
if (!keymap?.registerLayer) return;

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
});

if (typeof dispose === "function") {
  api.lifecycle.onDispose(dispose);
}
```

**Warning:** `api.keymap.registerLayer` may break plugin loading in some versions. Test carefully.

## Toast Notifications

```ts
api.ui.toast?.({
  message: "Toast message",
  variant: "info" | "success" | "warning" | "error",
});
```

**Note:** Always use optional chaining (`?.`) in TUI plugins as APIs may not be available in all contexts.

### Markdown

```tsx
<Markdown content={markdownString} />
```

### Session Prompt Component

The `session_prompt` slot can access the built-in prompt component:

```tsx
function SessionPromptWithStatus(props: { sessionID: string }) {
  const Prompt = api.ui?.Prompt
  if (!Prompt) {
    return <text>Fallback UI</text>
  }
  return (
    <box gap={0}>
      <Prompt sessionID={props.sessionID} />
      <text fg={api.theme.current.textMuted}>Status text</text>
    </box>
  )
}
```

## Dialog Pattern

```tsx
function CommandOutputDialog(props: { api: any; title: string; output: string }) {
  const lines = () => props.output.split("\n");
  const bodyHeight = () => Math.min(28, Math.max(6, lines().length));
  return (
    <box gap={1} width="100%" flexGrow={1} paddingLeft={2} paddingRight={2} paddingBottom={1}>
      <text fg={props.api.theme.current.text}><b>{props.title}</b></text>
      <scrollbox width="100%" flexGrow={1} minHeight={bodyHeight()} maxHeight={28}>
        <box gap={0} width="100%" minWidth={0}>
          {lines().map((line) => (
            <text fg={props.api.theme.current.text} wrapMode="word" width="100%">
              {line || " "}
            </text>
          ))}
        </box>
      </scrollbox>
      <text fg={props.api.theme.current.textMuted}>esc closes</text>
    </box>
  );
}
```

---

## Related Skills

- **[`solidjs-tui`](../solidjs-tui/SKILL.md)** — SolidJS primitives, reactivity, stores, lifecycle patterns for TUI
- **[`plugin-logging`](../plugin-logging/SKILL.md)** — Structured logging for TUI plugins
- **[`plugin-config-patterns`](../plugin-config-patterns/SKILL.md)** — Reading config in TUI context
- **[`opencode-troubleshooting`](../opencode-troubleshooting/SKILL.md)** — TUI loading and runtime issues

---

## Troubleshooting

### Plugin doesn't load

1. File must be `.tsx` extension
2. Must have `/** @jsxImportSource @opentui/solid */` pragma
3. Don't import from `@opencode-ai/plugin/tui` — causes silent load failures
4. Check `tsconfig.json` has `"jsx": "preserve"`
5. TUI paths in `tui.json` are resolved relative to `~/.config/opencode/` — use absolute paths for workspace plugins

### JSX not rendering

1. `jsx: "preserve"` required in tsconfig
2. Build script must copy `.tsx` to `dist/` (not compile to `.jsx`)
3. Use `@opentui/solid` components (`<box>`, `<text>`, etc.)

### File read fails with sandbox error

Use `fs.readFileSync` instead of `api.client.file.read()`.

### `api.keymap.registerLayer` breaks loading

The API may not exist in your opencode version. Guard with `if (!keymap?.registerLayer) return`.

### Double-rendered prompt

The `session_prompt` slot replaces the default prompt. If you see two prompts, you may be rendering `<api.ui.Prompt>` inside a component that also gets composed with the default. Ensure you're only rendering what you want — the `session_prompt` slot **is** the prompt. To add status below it, render `<api.ui.Prompt>` with all props forwarded.

### TUI plugin path resolution

Paths specified in `tui.json` are resolved relative to `~/.config/opencode/`. For workspace plugins, always use the **absolute path** to the workspace root:

```bash
# Get absolute path
cd /path/to/workspace && pwd  # e.g., /Users/me/my-plugin
# Then add to tui.json:
[pwd]
```
