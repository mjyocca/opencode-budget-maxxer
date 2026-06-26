---
name: plugin-spec
description: Guide users through writing a spec for their plugin feature — define the problem, use cases, design, and implementation plan before coding. Use before building any significant feature.
---

# Plugin Spec Workflow

Define your plugin's vision through specs before writing code. This ensures clarity, prevents scope creep, and documents decisions for future reference.

---

## When to Use This Skill

- Starting your first plugin feature
- Adding a new tool, TUI slot, or event handler
- Integrating with an external API
- Making architectural decisions
- Any feature where someone would ask "why did we do it this way?" later

---

## Workflow

```
idea → spec draft → review → implementation → spec reconciliation → merge
```

---

## Step 1: Define the Problem

Ask the user:

1. **What problem does this feature solve?**
2. **Who experiences this problem?** (target users)
3. **What happens if we don't solve it?** (current pain points)

Help them write a clear problem statement in `docs/specs/000N-feature-name.md`:

```markdown
## Problem

[Clear description of the problem and who it affects]
```

---

## Step 2: Identify Use Cases

Ask the user:

1. **Who are the main users of this feature?**
2. **What do they want to accomplish?**
3. **What's the expected outcome?**

Help them write use cases:

```markdown
## Use Cases

1. **As a [user type], I want to [action] so that [benefit]**
2. **As a [user type], I want to [action] so that [benefit]**
```

---

## Step 3: Propose a Solution

Ask the user:

1. **How should this feature work?** (high-level approach)
2. **What plugin surfaces will you use?** (tools, hooks, TUI slots, events)
3. **What external dependencies are needed?** (APIs, config, permissions)

Help them design the solution:

```markdown
## Proposed Solution

[High-level approach and what plugin surfaces you'll use]

## Design

### Architecture

[How this fits into the plugin — hooks, tools, slots, events]

### API/Interface

[What the user sees — tool names, TUI components, config options]

### Data Flow

[How data moves through the feature]
```

---

## Step 4: Consider Alternatives

Ask the user:

1. **What other approaches did you consider?**
2. **Why is this approach better?**

Help them document alternatives:

```markdown
## Alternatives Considered

| Option | Pros | Cons | Why not? |
|--------|------|------|----------|
| ... | ... | ... | ... |
```

---

## Step 5: Create Implementation Plan

Help the user break the feature into steps:

```markdown
## Implementation Plan

- [ ] Step 1: [Specific, testable action]
- [ ] Step 2: [Specific, testable action]
- [ ] Step 3: [Specific, testable action]
```

---

## Step 6: Identify Open Questions

Ask the user:

1. **What's still unclear?**
2. **What decisions need more research?**
3. **What could block implementation?**

Help them document:

```markdown
## Open Questions

- [ ] Question 1?
- [ ] Question 2?
```

---

## Step 7: Review the Spec

After drafting, review the spec with the user:

1. **Is the problem clearly defined?**
2. **Are the use cases realistic?**
3. **Does the solution address the problem?**
4. **Is the implementation plan actionable?**
5. **Are there any gaps or assumptions?**

If the spec looks good, mark it as `approved`. If not, iterate.

---

## Step 8: Implement

Once the spec is approved:

1. Follow the implementation plan step by step
2. Update the spec if implementation diverges
3. Mark the spec as `implemented` when done

---

## Spec Template

Copy the spec template from `.agents/skills/plugin-spec/spec-template.md` to `docs/specs/0001-your-feature.md` and fill in all sections.

See `docs/specs/README.md` for the workflow guide.

---

## Example: First Plugin Feature

Here's what a spec might look like for a code review plugin's first feature:

```markdown
# Spec: Auto Code Review Tool

**Status:** approved
**Created:** 2024-01-15
**Author:** @developer

## Problem

Developers spend time manually reviewing code for common issues (typos, unused imports, missing types). This is repetitive and error-prone.

## Use Cases

1. **As a developer, I want to run a code review in my session so that I can catch issues before committing**
2. **As a reviewer, I want to see automated feedback so that I can focus on architecture, not syntax**

## Proposed Solution

A tool that analyzes the current project for common issues and returns a structured report.

## Design

### Architecture

- Server plugin tool: `code_review`
- Uses shell execution to run linters
- Parses output into markdown report

### API/Interface

```ts
tool({
  description: "Run automated code review on the current project",
  args: {
    scope: tool.schema.enum(["staged", "all"]).optional(),
  },
})
```

### Data Flow

1. User calls `code_review` tool
2. Plugin runs linters via shell
3. Parses output into structured report
4. Returns markdown summary

## Alternatives Considered

| Option | Pros | Cons | Why not? |
|--------|------|------|----------|
| TUI panel | Always visible | Complex to build | Start simple with tool first |
| Event-based | Automatic | Too noisy | User should trigger manually |

## Implementation Plan

- [ ] Add `code_review` tool definition
- [ ] Implement shell execution for linters
- [ ] Parse linter output into markdown
- [ ] Add tests for parsing logic

## Open Questions

- [ ] Which linters should we support by default?
- [ ] Should we cache results between runs?
```

---

## Next Steps

After writing the spec:

1. **Implement** — follow the plan step by step
2. **Test** — verify each step works
3. **Update spec** — if implementation diverges, document why
4. **Mark complete** — set status to `implemented`

For implementation patterns, see:
- [plugin-quick-start](../plugin-quick-start/SKILL.md) — Add tools, handle events, add TUI slots
- [plugin-server](../plugin-server/SKILL.md) — Advanced hook patterns
- [plugin-tui](../plugin-tui/SKILL.md) — TUI plugin patterns
