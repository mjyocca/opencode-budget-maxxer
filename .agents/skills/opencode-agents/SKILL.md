---
name: opencode-agents
description: Reference for opencode agents — built-in agents, custom agent config, permissions, subagents, and agent creation. Use when configuring or creating agents.
---

# OpenCode Agents Reference

Agents are specialized AI assistants configured for specific tasks and workflows. For full architecture context, see `docs/instructions/opencode-plugin-architecture.md`.

---

## Agent Types

### Primary Agents

Main assistants you interact with directly. Cycle through them with **Tab** key (or configured `switch_agent` keybind).

### Subagents

Specialized assistants that primary agents can invoke for specific tasks. Also invocable manually via **@mention**.

---

## Built-in Agents

### Primary Agents

| Agent | Tools | Purpose |
|-------|-------|---------|
| `build` | All enabled | Default development agent — full tool access |
| `plan` | Restricted | Planning and analysis — file edits and bash set to `ask` |

### Subagents

| Agent | Tools | Purpose |
|-------|-------|---------|
| `general` | Full (except todo) | General-purpose research and multi-step tasks |
| `explore` | Read-only | Fast codebase exploration |
| `scout` | Read-only | External docs and dependency research |

### System Agents (Hidden)

| Agent | Purpose |
|-------|---------|
| `compaction` | Compacts long context into summaries |
| `title` | Generates short session titles |
| `summary` | Creates session summaries |

---

## Agent Configuration

### JSON Config (`opencode.json`)

```json
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices and potential issues",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.1,
      "prompt": "You are a code reviewer. Focus on security, performance, and maintainability.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  }
}
```

### Markdown Config (File-based)

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
  bash:
    "*": ask
    "git diff": allow
    "git log*": allow
    "grep *": allow
---

You are in code review mode. Focus on:
- Code quality and best practices
- Potential bugs and edge cases
- Performance implications
- Security considerations
```

The filename becomes the agent name (`code-reviewer.md` → `code-reviewer`).

---

## Agent Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `description` | string | Yes | — | What the agent does and when to use it |
| `mode` | string | No | `"all"` | `"primary"`, `"subagent"`, or `"all"` |
| `model` | string | No | Global config (primary) / invoking agent's model (subagent) | Model override |
| `temperature` | number | No | Model default (0 for most, 0.55 for Qwen) | Randomness control (0.0-1.0) |
| `top_p` | number | No | — | Alternative to temperature for diversity control |
| `steps` | number | No | Unlimited | Max agentic iterations before forced text response |
| `prompt` | string | No | — | System prompt file path (`{file:./prompts/agent.txt}`) |
| `permission` | object | No | — | Tool permissions (allow/deny/ask) |
| `hidden` | boolean | No | `false` | Hide from @autocomplete (subagents only) |
| `color` | string | No | — | Hex color or theme name (`primary`, `accent`, etc.) |
| `disable` | boolean | No | `false` | Disable the agent |

### Temperature Ranges

- **0.0-0.2**: Focused, deterministic — code analysis, planning
- **0.3-0.5**: Balanced — general development
- **0.6-1.0**: Creative — brainstorming, exploration

---

## Permission System

### Values

| Value | Behavior |
|-------|----------|
| `"allow"` | Tool runs without approval |
| `"ask"` | User prompted for approval |
| `"deny"` | Tool disabled |

### Permission Keys

| Key | Tools Gated |
|-----|-------------|
| `read` | `read` |
| `edit` | `write`, `edit`, `apply_patch` |
| `glob` | `glob` |
| `grep` | `grep` |
| `list` | `list` |
| `bash` | `bash` |
| `task` | `task` |
| `external_directory` | Files outside project worktree |
| `todowrite` | `todowrite`, `todoread` |
| `webfetch` | `webfetch` |
| `websearch` | `websearch` |
| `lsp` | `lsp` |
| `skill` | `skill` |
| `question` | `question` |
| `doom_loop` | Recovery prompts when stuck |

### Glob Patterns

`read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `external_directory`, `lsp`, `skill` accept either a shorthand action or an object of glob/pattern → action:

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

**Last matching rule wins.** Put `*` first, specific rules after.

### Task Permissions (Subagent Control)

Control which subagents an agent can invoke via the Task tool:

```json
{
  "agent": {
    "orchestrator": {
      "mode": "primary",
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

When `deny`, the subagent is removed from the Task tool description entirely.

**Note:** Users can always invoke any subagent directly via `@` autocomplete, even if task permissions deny it.

---

## Creating Agents

### Interactive Command

```bash
opencode agent create
```

Steps:
1. Choose save location (global or project)
2. Enter description
3. Generates prompt and identifier
4. Select allowed permissions (unselected = denied)
5. Creates markdown agent file

### Manual Creation

1. Create file in `~/.config/opencode/agents/my-agent.md` or `.opencode/agents/my-agent.md`
2. Add frontmatter with required fields (`name`, `description`)
3. Add system prompt in markdown body

---

## Default Agent

Set in `opencode.json`:

```json
{
  "default_agent": "plan"
}
```

Must be a primary agent (not subagent). Falls back to `"build"` with warning if invalid.

---

## Usage

### Switching Primary Agents

- **Tab** key to cycle
- Or configured `switch_agent` keybind

### Invoking Subagents

- **Automatically** by primary agents based on descriptions
- **Manually** via `@mention`: `@general help me search for this function`

### Session Navigation

- **Leader+Down** — enter first child session from parent
- **Right** — cycle to next child session
- **Left** — cycle to previous child session
- **Up** — return to parent session

---

## Example Agents

### Documentation Agent

```markdown
---
name: docs-writer
description: Writes and maintains project documentation
mode: subagent
permission:
  bash: deny
---

You are a technical writer. Create clear, comprehensive documentation.
Focus on clear explanations, proper structure, code examples, and user-friendly language.
```

### Security Auditor

```markdown
---
name: security-auditor
description: Performs security audits and identifies vulnerabilities
mode: subagent
permission:
  edit: deny
---

You are a security expert. Focus on identifying potential security issues:
- Input validation vulnerabilities
- Authentication and authorization flaws
- Data exposure risks
- Dependency vulnerabilities
- Configuration security issues
```
