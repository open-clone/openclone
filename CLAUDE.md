# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin, `openclone`, distributed via a self-hosted marketplace. The repo root **is** the plugin — `.claude-plugin/marketplace.json` advertises it and `.claude-plugin/plugin.json` declares its metadata, both at the root. There is no build, no test suite, and no package manager — shipping is "commit to the main branch and users pull via `/plugin marketplace add`."

Local iteration loop:

```
/plugin marketplace add /absolute/path/to/this/repo
/plugin install openclone
# then restart Claude Code once after edits for hook/command changes to take effect
```

Version is hand-bumped in `.claude-plugin/plugin.json` when behavior changes.

## Architecture

### Two-location data model (the core concept)

Every read path merges two locations with **user-wins-on-collision** precedence. Each clone is a **folder** containing `persona.md` and an optional `knowledge/` subdirectory.

| Purpose | Built-in (read-only, shipped) | User (writable) |
|---|---|---|
| Persona | `${CLAUDE_PLUGIN_ROOT}/clones/<name>/persona.md` | `~/.openclone/clones/<name>/persona.md` |
| Knowledge | `${CLAUDE_PLUGIN_ROOT}/clones/<name>/knowledge/` | `~/.openclone/clones/<name>/knowledge/` |
| Active pointer | — | `~/.openclone/active-clone` (just a clone name) |

Clones are deduped by folder name (`<name>`); knowledge is append-only — files are named `YYYY-MM-DD-<topic>.md` and never overwritten. When the same topic recurs, a fresh dated file is added; the hook tells Claude to weight newer dates more heavily while still treating older ones as valid background. When a user tries to modify a built-in clone, `/openclone:ingest` does **fork-on-write**: copies the built-in clone folder into `~/.openclone/clones/` first, then edits the user copy. Never mutate anything under `${CLAUDE_PLUGIN_ROOT}/`.

### Slash commands are markdown

Each `commands/*.md` file is a slash command. The frontmatter declares `allowed-tools` and `argument-hint`; the body is a prompt Claude Code runs when the command fires. Panel commands (`vc.md`, `dev.md`, `founder.md`, `pm.md`, `designer.md`, `writer.md`) are thin stubs that pin a category and defer to `references/panel-workflow.md` — editing panel logic means editing that one reference, not six files.

### Persona injection via UserPromptSubmit hook

`hooks/inject-active-clone.sh` runs on every user prompt. If `~/.openclone/active-clone` exists and resolves to a `persona.md` (user first, then built-in), the hook emits `additionalContext` JSON containing an `<openclone-active-clone>` block: a persona-embodiment instruction + the full persona markdown + both candidate knowledge directory paths + recency-weighting guidance. Otherwise it emits `{}` and is a silent no-op. The hook never fails loudly — all error paths fall through to empty JSON.

The hook is the only mechanism that makes the active clone "alive." `/openclone:use` just writes the name to `active-clone`; the skill/commands do not re-inject persona themselves.

### References are lazy-loaded

`references/*.md` (clone-schema, categories, interview-workflow, refine-workflow, panel-workflow) are **not** auto-loaded. Commands tell Claude to `Load ${CLAUDE_PLUGIN_ROOT}/references/<file>.md and follow it exactly`. This keeps context lean — only the reference relevant to the current command gets pulled in. When changing a workflow, edit the reference, not every command.

### Skill vs. commands

`skills/openclone/SKILL.md` is the entry point for natural-language requests (e.g. "create a clone named X"). Slash commands are the direct UI. The skill should delegate to slash commands rather than duplicating their logic.

## Editing conventions

- **Clone schema is canonical.** `references/clone-schema.md` is the source of truth for the clone folder layout (persona.md frontmatter, required sections, `Category-specific framing` block, knowledge filename convention). Keep examples there in sync with the built-in `clones/douglas/persona.md`.
- **Categories are a fixed v1 list** (`vc`, `dev`, `founder`, `pm`, `designer`, `writer`). Adding a new category means: new command file + update `references/categories.md` + update `skills/openclone/SKILL.md` + update README. Don't half-add.
- **User ↔ built-in precedence** must be consistent across every read path. If you add a new command that reads clones or knowledge, mirror the lookup order from `hooks/inject-active-clone.sh` and `commands/use.md`.
- **Knowledge is append-only.** Ingestion never overwrites or merges with earlier dated files on the same topic. If `refine-workflow.md` changes, preserve this invariant.
- **No emojis** in clone output (explicit rule in `panel-workflow.md`) and no emojis in code/docs unless the user asks.
- Paths in command markdown use `${CLAUDE_PLUGIN_ROOT}` for shipped files and `$HOME/.openclone` or `~/.openclone` for user state — do not hardcode absolute paths.
- Helper scripts live in `scripts/` and are invoked from command markdown via `${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh`. They exit 0 with output on stdout; command files are responsible for capturing and routing output.

## Gotchas

- `clones/<name>/` directories ship **with** the plugin — they are the built-in presets and must be committed. `.gitkeep` files preserve empty `knowledge/` directories; do not delete them without adding real content first.
- The hook uses `python3` for JSON-escaping with a sed/awk fallback. If you touch the escaping path, test both branches — the fallback is not exercised on macOS by default.
- Apostrophes inside the hook's heredoc body break shell parsing (bash parses `$(...)` command substitutions and gets confused by unmatched single quotes in the heredoc content). Avoid contractions like "clone's" in the heredoc — use "this clone" or typographic apostrophes if needed.
- After editing hooks or commands, Claude Code needs a restart to pick up the changes. Editing clone files or references is picked up live.
