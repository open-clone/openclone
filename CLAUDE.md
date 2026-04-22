# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin, `openclone`. The repo root **is** the plugin — `.claude-plugin/plugin.json` declares its metadata and `.claude-plugin/marketplace.json` advertises it. There is no build, no test suite, and no package manager.

Distribution is via **`git clone` directly**, not `/plugin install`. Users run a one-line command from the README that does a partial + sparse clone into `~/.claude/plugins/marketplaces/openclone/`, then runs `./setup` which registers the plugin in `~/.claude/settings.json` under `enabledPlugins`. Claude Code then picks it up on restart as a normal plugin. This gives us (a) scope control at install — every clone's `knowledge/` subdir is excluded from sparse-checkout so users only pull what they activate, and (b) background auto-update via a `SessionStart` hook.

See `README.md` for the user-facing install line. Version is hand-bumped in `.claude-plugin/plugin.json` when behavior changes.

### Local iteration loop

For development on a machine where openclone is installed the normal way, editing files under `~/.claude/plugins/marketplaces/openclone/` is picked up live for commands, clones, and references. Hook and `hooks.json` changes require a Claude Code restart.

When iterating from a separate checkout (e.g. a conductor workspace) rather than the installed path, use the dev-link overlay — `scripts/dev-link.sh <path>` symlinks a single file or directory from the workspace into the installed plugin, so edits flow live without a copy step and only the paths you explicitly link are overlaid (the sparse install stays sparse). Example: `scripts/dev-link.sh references/panel-workflow.md`. Undo with `scripts/dev-unlink.sh <same path>` (restores the shipped file from git if the path is tracked). While symlinks are in place, `touch ~/.openclone/no-auto-update` to stop the `SessionStart` hook's `git pull` from touching the install.

## Architecture

### Two-location data model (the core concept)

Every read path merges two locations with **user-wins-on-collision** precedence for persona, and **additive layering** for knowledge. Built-in and user layouts are **structurally identical** — only the root differs:

| Purpose | Built-in (read-only, shipped) | User (writable) |
| --- | --- | --- |
| Persona | `${CLAUDE_PLUGIN_ROOT}/clones/<name>/persona.md` | `~/.openclone/clones/<name>/persona.md` |
| Knowledge | `${CLAUDE_PLUGIN_ROOT}/clones/<name>/knowledge/` | `~/.openclone/clones/<name>/knowledge/` |
| Active pointer | — | `~/.openclone/active-clone` (just a clone name) |

Both layouts use the same shape — persona and knowledge live together under `clones/<name>/`. The built-in side adds a sparse-checkout wrinkle: the install command uses **non-cone mode** (`git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'`), which materializes everything except the per-clone knowledge subdirs. Individual clones' knowledge is fetched on demand by `scripts/fetch-clone-knowledge.sh <slug>` (invoked from `commands/use.md`) — this runs `git sparse-checkout add clones/<slug>/knowledge/` which appends an inclusion pattern that overrides the base exclusion, and partial-clone semantics auto-fetch the blobs from the promisor remote.

Clones are deduped by name. Knowledge is append-only — files are named `YYYY-MM-DD-<topic>.md` and never overwritten. When the same topic recurs, a fresh dated file is added; the hook tells Claude to weight newer dates more heavily while still treating older ones as valid background. When a user tries to modify a built-in clone, `/openclone:ingest` does **fork-on-write**: copies the built-in `clones/<name>/persona.md` into `~/.openclone/clones/<name>/` and writes any new knowledge there. Never mutate anything under `${CLAUDE_PLUGIN_ROOT}/`.

### Slash commands are markdown

Each `commands/*.md` file is a slash command. The frontmatter declares `allowed-tools` and `argument-hint`; the body is a prompt Claude Code runs when the command fires. Panel commands (`vc.md`, `dev.md`, `founder.md`, `pm.md`, `designer.md`, `writer.md`, `marketing.md`, `hr.md`) are thin stubs that pin a category and defer to `references/panel-workflow.md` — editing panel logic means editing that one reference, not every panel file.

### Persona injection via UserPromptSubmit hook

`hooks/inject-active-clone.sh` runs on every user prompt. If `~/.openclone/active-clone` exists and resolves to a `persona.md` (user first, then built-in), the hook emits `additionalContext` JSON containing an `<openclone-active-clone>` block: a persona-embodiment instruction + the full persona markdown + both candidate knowledge directory paths (`~/.openclone/clones/<name>/knowledge/` and `${CLAUDE_PLUGIN_ROOT}/clones/<name>/knowledge/`) + recency-weighting guidance. Otherwise it emits `{}` and is a silent no-op. The hook never fails loudly — all error paths fall through to empty JSON.

The hook is the only mechanism that makes the active clone "alive." `/openclone:use` writes the name to `active-clone` and (for built-in clones) calls `fetch-clone-knowledge.sh` to materialize the knowledge directory. The skill/commands do not re-inject persona themselves.

### Auto-update via SessionStart hook

`scripts/session-update.sh` is registered in `hooks/hooks.json` as a `SessionStart` hook. On every session start it **immediately forks to background and exits 0**, so the session never blocks. The background branch:

1. Skips if `~/.openclone/no-auto-update` exists (user opt-out)
2. Throttles via `~/.openclone/last-update-check` mtime (once per hour)
3. Runs `git pull --ff-only` in `${CLAUDE_PLUGIN_ROOT}` with `GIT_TERMINAL_PROMPT=0` (never hangs on auth)
4. Writes `~/.openclone/just-upgraded-from` with the old HEAD if the pull advanced
5. Logs to `~/.openclone/last-update.log` either way

Because the pull runs in the same repo the plugin was cloned into, it updates the entire plugin atomically. Knowledge directories that were already sparse-checked-out stay checked out (sparse-checkout state is preserved across pulls).

The same script also runs a one-shot migration for pre-v0.3 installs that used cone-mode sparse-checkout (with top-level `knowledge/`): it detects `core.sparseCheckoutCone = true`, rewrites the sparse config to non-cone with `/*` + `!/clones/*/knowledge/`, and re-materializes the currently active clone's knowledge if any. Idempotent — new installs trip the `is_cone == true` check once and are done.

### References are lazy-loaded

`references/*.md` (clone-schema, categories, interview-workflow, refine-workflow, panel-workflow) are **not** auto-loaded. Commands tell Claude to `Load ${CLAUDE_PLUGIN_ROOT}/references/<file>.md and follow it exactly`. This keeps context lean — only the reference relevant to the current command gets pulled in. When changing a workflow, edit the reference, not every command.

### Skill vs. commands

`skills/openclone/SKILL.md` is the entry point for natural-language requests (e.g. "create a clone named X"). Slash commands are the direct UI. The skill should delegate to slash commands rather than duplicating their logic.

## Editing conventions

- **Clone schema is canonical.** `references/clone-schema.md` is the source of truth for the clone folder layout (persona.md frontmatter, required sections, `Category-specific framing` block, knowledge filename convention, the built-in vs user split). Keep examples there in sync with the built-in `clones/douglas/persona.md`.
- **Categories are a fixed v1 list** (`vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`). Adding a new category means: new command file + update `references/categories.md` + update `skills/openclone/SKILL.md` + update README + update `FIXED_CATEGORIES` in `.github/scripts/validate-clones.ts`. Don't half-add.
- **User ↔ built-in precedence** must be consistent across every read path. If you add a new command that reads clones or knowledge, mirror the lookup order from `hooks/inject-active-clone.sh` and `commands/use.md`. Remember: persona is user-OR-built-in (user wins), knowledge is user-AND-built-in (both read).
- **Knowledge is append-only.** Ingestion never overwrites or merges with earlier dated files on the same topic. If `refine-workflow.md` changes, preserve this invariant.
- **No emojis** in clone output (explicit rule in `panel-workflow.md`) and no emojis in code/docs unless the user asks.
- Paths in command markdown use `${CLAUDE_PLUGIN_ROOT}` for shipped files and `$HOME/.openclone` or `~/.openclone` for user state — do not hardcode absolute paths.
- Helper scripts live in `scripts/` and are invoked from command markdown via `${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh`. They exit 0 with output on stdout; command files are responsible for capturing and routing output. Scripts executed from hooks must also exit 0 on failure paths — never let a hook failure cascade.
- `setup` and `uninstall` at the repo root are executable shell scripts, not markdown. They manipulate `~/.claude/settings.json` (the `enabledPlugins` map) via a small inline `python3` block — preserve all other keys in that file when editing.

## Gotchas

- `clones/<name>/persona.md` ships **with** the plugin (sparse-default ON) — built-in personas. `clones/<name>/knowledge/` lives under the same folder but is **sparse-default OFF** (excluded by the non-cone pattern `!/clones/*/knowledge/`) — only fetched when `/openclone:use <name>` activates that clone. If you ever change the sparse-checkout pattern structure, update (a) the install one-liner in `README.md`, (b) `scripts/fetch-clone-knowledge.sh`, and (c) the migration branch in `scripts/session-update.sh` together.
- The hook uses `python3` for JSON-escaping with a sed/awk fallback. If you touch the escaping path, test both branches — the fallback is not exercised on macOS by default.
- Apostrophes inside the hook's heredoc body break shell parsing (bash parses `$(...)` command substitutions and gets confused by unmatched single quotes in the heredoc content). Avoid contractions like "clone's" in the heredoc — use "this clone" or typographic apostrophes if needed.
- After editing hooks or `hooks.json`, Claude Code needs a restart to pick up the changes. Editing clone files, commands, or references is picked up live.
- `scripts/session-update.sh` re-execs itself with `__bg` as the first arg to detach. Do not remove the `"${1:-}" != "__bg"` gate — it is what prevents the foreground hook from blocking on `git pull`.
- `scripts/fetch-clone-knowledge.sh` is a no-op when the repo is not a git checkout (e.g., dev machine that symlinked files in). Knowledge is then expected to already exist on disk.
