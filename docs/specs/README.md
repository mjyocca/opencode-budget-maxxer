# Plugin Specs

Use specs to define your plugin's vision before writing code.

## Why Specs?

- Clarify your plugin's purpose and use cases
- Document decisions for future reference
- Share your vision with collaborators
- Prevent scope creep and feature drift

## Workflow

```
idea → spec draft → review → implementation → spec reconciliation → merge
```

## When to Write a Spec

**Write a spec when:**
- Adding a new tool or TUI slot
- Integrating with an external API
- Making architectural decisions
- Any change where someone would ask "why did we do it this way?" later

**Skip a spec for:**
- Typos, copy changes
- Dependency updates
- Minor bug fixes

## Getting Started

1. Load the `plugin-spec` skill in opencode
2. Follow the guided workflow
3. Your spec will be created in `docs/specs/000N-feature-name.md`

## Spec Format

See `.agents/skills/plugin-spec/spec-template.md` for the standard spec template.
