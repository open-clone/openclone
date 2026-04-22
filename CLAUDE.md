# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code **standalone skill**, `openclone`. The repo root **is** the skill — the root `SKILL.md` declares the slash command `/openclone` and its dispatch logic. There is no build, no test suite, and no package manager.

Distribution is via **`git clone` directly**, not `/plugin install` or a marketplace. Users run a one-line command from the README that does a partial + sparse clone into `~/.claude/skills/openclone/`, then runs `./setup` which installs two hooks (`UserPromptSubmit`, `SessionStart`) and a statusline entry into `~/.claude/settings.json` (each tagged with `_openclone_managed: true` so uninstall can strip them cleanly). Claude Code auto-discovers the skill on next session because `~/.claude/skills/<name>/SKILL.md` is in the auto-load path — no plugin registration is needed. This gives us (a) scope control at install — every clone's `knowledge/` subdir is excluded from sparse-checkout so users only pull what they activate, (b) background auto-update via the `SessionStart` hook, and (c) a plain `/openclone` slash command (no namespace) because standalone skills are not prefixed the way plugin commands are (`/<plugin>:<command>`).

See `README.md` for the user-facing install line.

### Local iteration loop

For development on a machine where openclone is installed the normal way, editing files under `~/.claude/skills/openclone/` is picked up live for SKILL.md, clones, and references. Hook script changes are picked up on next session start (no Claude Code restart needed since the path is resolved every invocation). If you change the hook *registration* in `setup`, re-run `./setup` to update settings.json.

When iterating from a separate checkout (e.g. a conductor workspace) rather than the installed path, use the dev-link overlay — `scripts/dev-link.sh <path>` symlinks a single file or directory from the workspace into the installed skill, so edits flow live without a copy step and only the paths you explicitly link are overlaid (the sparse install stays sparse). Example: `scripts/dev-link.sh references/panel-workflow.md`. Undo with `scripts/dev-unlink.sh <same path>` (restores the shipped file from git if the path is tracked). While symlinks are in place, `touch ~/.openclone/no-auto-update` to stop the `SessionStart` hook's `git pull` from touching the install.

## Architecture

### Two-location data model (the core concept)

Every read path merges two locations with **user-wins-on-collision** precedence for persona, and **additive layering** for knowledge. Built-in and user layouts are **structurally identical** — only the root differs:

| Purpose | Built-in (read-only, shipped) | User (writable) |
| --- | --- | --- |
| Persona | `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` | `~/.openclone/clones/<name>/persona.md` |
| Knowledge | `${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/` | `~/.openclone/clones/<name>/knowledge/` |
| Active pointer | — | `~/.openclone/active-clone` (just a clone name) |
| Room roster | — | `~/.openclone/room` (one clone name per line, non-empty = room mode) |
| Home-panel menu context | — | `~/.openclone/menu-context` (JSON; last home panel's numbering for `/openclone <N>`) |

`${CLAUDE_SKILL_DIR}` resolves to `~/.claude/skills/openclone` at the installed location. Inside `SKILL.md`, Claude Code expands the variable; scripts resolve their own install path via `BASH_SOURCE` self-location (not via an env var) so they work whether invoked from a hook, the skill, or a dev-linked workspace.

Both layouts use the same shape — persona and knowledge live together under `clones/<name>/`. The built-in side adds a sparse-checkout wrinkle: the install command uses **non-cone mode** (`git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'`), which materializes everything except the per-clone knowledge subdirs. Individual clones' knowledge is fetched on demand by `scripts/fetch-clone-knowledge.sh <slug>` (invoked from the activation branch of the root `SKILL.md`) — this runs `git sparse-checkout add clones/<slug>/knowledge/` which appends an inclusion pattern that overrides the base exclusion, and partial-clone semantics auto-fetch the blobs from the promisor remote.

Clones are deduped by name. Knowledge is append-only — files are named `YYYY-MM-DD-<topic>.md` and never overwritten. When the same topic recurs, a fresh dated file is added; the hook tells Claude to weight newer dates more heavily while still treating older ones as valid background. When a user tries to modify a built-in clone, `/openclone ingest` does **fork-on-write**: copies the built-in `clones/<name>/persona.md` into `~/.openclone/clones/<name>/` and writes any new knowledge there. Never mutate anything under `${CLAUDE_SKILL_DIR}/`.

### Single-dispatcher SKILL.md

The root `SKILL.md` is the entry for both `/openclone` and natural-language requests that match its description triggers. Its body parses `$ARGUMENTS` into a sub-action (`<empty>` → home panel, `<N>` → menu selection, `stop`, `new`, `ingest`, `room`, `panel`, `<clone-name>` → activate) and delegates to the matching reference under `references/`. The frontmatter declares `name`, `description` (which doubles as natural-language triggers), `allowed-tools`, and `argument-hint`. When adding a new sub-action, extend the dispatch table in `SKILL.md` and write the new logic as a reference — do not add separate `commands/*.md` files (standalone skills do not have a `commands/` directory).

### Persona injection via UserPromptSubmit hook

`hooks/inject-active-clone.sh` runs on every user prompt. Precedence: **room mode wins over active-clone.** If `~/.openclone/room` exists and is non-empty, the hook emits a group-chat moderator context with every listed member's full persona and routing rules (default one clone answers, max two if perspectives genuinely diverge). Else, if `~/.openclone/active-clone` exists and resolves to a `persona.md` (user first, then built-in), the hook emits an `<openclone-active-clone>` block: a persona-embodiment instruction + the full persona markdown + both candidate knowledge directory paths (`~/.openclone/clones/<name>/knowledge/` and `<install_dir>/clones/<name>/knowledge/`) + recency-weighting guidance. Otherwise it emits `{}` and is a silent no-op. The hook never fails loudly — all error paths fall through to empty JSON.

The hook is the only mechanism that makes the active clone or room "alive." `/openclone <name>` writes the name to `active-clone` and (for built-in clones) calls `fetch-clone-knowledge.sh` to materialize the knowledge directory. `/openclone room <a> <b> ...` writes the roster to `room`. The dispatcher does not re-inject persona itself.

Hooks are registered in `~/.claude/settings.json` by `./setup` under the `hooks.UserPromptSubmit` and `hooks.SessionStart` arrays, each as a matcher-less group whose inner command entry carries `_openclone_managed: true`. The uninstall script strips exactly those entries and leaves user-authored hooks untouched.

### Auto-update via SessionStart hook

`scripts/session-update.sh` is registered as a `SessionStart` hook by `./setup`. On every session start it **immediately forks to background and exits 0**, so the session never blocks. The background branch:

1. Skips if `~/.openclone/no-auto-update` exists (user opt-out)
2. Throttles via `~/.openclone/last-update-check` mtime (once per hour)
3. Runs `git pull --ff-only` inside the install directory (resolved from `BASH_SOURCE`) with `GIT_TERMINAL_PROMPT=0` (never hangs on auth)
4. Writes `~/.openclone/just-upgraded-from` with the old HEAD if the pull advanced
5. Logs to `~/.openclone/last-update.log` either way

Because the pull runs in the same repo the skill was cloned into, it updates the entire skill atomically. Knowledge directories that were already sparse-checked-out stay checked out (sparse-checkout state is preserved across pulls).

The same script also runs a one-shot migration for pre-v0.3 installs that used cone-mode sparse-checkout (with top-level `knowledge/`): it detects `core.sparseCheckoutCone = true`, rewrites the sparse config to non-cone with `/*` + `!/clones/*/knowledge/`, and re-materializes the currently active clone's knowledge if any. Idempotent — new installs trip the `is_cone == true` check once and are done.

### References are lazy-loaded

`references/*.md` (clone-schema, categories, home-workflow, interview-workflow, refine-workflow, panel-workflow, room-workflow) are **not** auto-loaded. The dispatcher tells Claude to `Load ${CLAUDE_SKILL_DIR}/references/<file>.md and follow it exactly` for the specific sub-action. This keeps context lean — only the reference relevant to the current sub-action gets pulled in. When changing a workflow, edit the reference, not `SKILL.md`.

## Editing conventions

- **Clone schema is canonical.** `references/clone-schema.md` is the source of truth for the clone folder layout (persona.md frontmatter, required sections, `Category-specific framing` block, knowledge filename convention, the built-in vs user split). Keep examples there in sync with the built-in `clones/douglas/persona.md`.
- **Categories are a fixed v1 list** (`vc`, `tech`, `founder`, `expert`, `influencer`, `politician`, `celebrity`). Adding a new category means: update `references/categories.md` + update `references/home-workflow.md` (section order) + update `references/interview-workflow.md` (stage 3 prompt list) + update the root `SKILL.md` + update README + update the `role_label` case in `scripts/statusline.sh` + update `FIXED_CATEGORIES` in `.github/scripts/validate-clones.ts`. The dispatcher (`SKILL.md`) accepts any token as a panel category, so no change there. Don't half-add.
- **User ↔ built-in precedence** must be consistent across every read path. If you add a new sub-action that reads clones or knowledge, mirror the lookup order from `hooks/inject-active-clone.sh` and the activation branch of `SKILL.md`. Remember: persona is user-OR-built-in (user wins), knowledge is user-AND-built-in (both read).
- **Knowledge is append-only.** Ingestion never overwrites or merges with earlier dated files on the same topic. If `refine-workflow.md` changes, preserve this invariant.
- **No emojis** in clone output (explicit rule in `panel-workflow.md`) and no emojis in code/docs unless the user asks.
- Paths in `SKILL.md` use `${CLAUDE_SKILL_DIR}` for shipped files and `$HOME/.openclone` or `~/.openclone` for user state — do not hardcode absolute paths.
- Helper scripts live in `scripts/` and are invoked from `SKILL.md` via `${CLAUDE_SKILL_DIR}/scripts/<name>.sh`. Inside scripts, resolve paths with `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` — do not rely on env vars like `CLAUDE_SKILL_DIR` being exported to child processes (not guaranteed). Scripts exit 0 with output on stdout; command files are responsible for capturing and routing output. Scripts executed from hooks must also exit 0 on failure paths — never let a hook failure cascade.
- `setup` and `uninstall` at the repo root are executable shell scripts, not markdown. They manipulate `~/.claude/settings.json` (the `hooks.UserPromptSubmit` array, `hooks.SessionStart` array, and `statusLine` entry, each tagged with `_openclone_managed: true`) via a small inline `python3` block — preserve all other keys and unrelated hook entries in that file when editing.

## Gotchas

- `clones/<name>/persona.md` ships **with** the skill (sparse-default ON) — built-in personas. `clones/<name>/knowledge/` lives under the same folder but is **sparse-default OFF** (excluded by the non-cone pattern `!/clones/*/knowledge/`) — only fetched when `/openclone <name>` activates that clone. If you ever change the sparse-checkout pattern structure, update (a) the install one-liner in `README.md`, (b) `scripts/fetch-clone-knowledge.sh`, and (c) the migration branch in `scripts/session-update.sh` together.
- The hook uses `python3` for JSON-escaping with a sed/awk fallback. If you touch the escaping path, test both branches — the fallback is not exercised on macOS by default.
- Apostrophes inside the hook's heredoc body break shell parsing (bash parses `$(...)` command substitutions and gets confused by unmatched single quotes in the heredoc content). Avoid contractions like "clone's" in the heredoc — use "this clone" or typographic apostrophes if needed.
- After editing hooks (scripts) the path is re-resolved on every invocation, so no restart is needed. After changing hook *registration* (setup script itself), re-run `./setup`. After the first install, a Claude Code session restart is needed so the newly registered hooks take effect.
- `scripts/session-update.sh` re-execs itself with `__bg` as the first arg to detach. Do not remove the `"${1:-}" != "__bg"` gate — it is what prevents the foreground hook from blocking on `git pull`.
- `scripts/fetch-clone-knowledge.sh` is a no-op when the repo is not a git checkout (e.g., dev machine that symlinked files in). Knowledge is then expected to already exist on disk.
- Standalone skill commands are **not** namespaced — `/openclone` works directly. Plugin commands would have been `/openclone:openclone`. Do not add `.claude-plugin/plugin.json` back; it would re-promote the skill to a plugin and reintroduce the namespace prefix.

## Roadmap

- **Windows native support** — the skill is bash-only today (hooks, `setup`, `uninstall`, `scripts/*.sh`). WSL2 works; Git Bash is brittle (`nohup`/`disown` detach in `session-update.sh`, `ln -sfn` in `dev-link.sh`, Claude Code routing `.sh` hooks through bash); cmd.exe/PowerShell is impossible. Proper fix is to port `hooks/inject-active-clone.sh`, `scripts/session-update.sh`, `scripts/statusline.sh`, `scripts/fetch-clone-knowledge.sh`, and the `setup`/`uninstall` settings.json editors to Node.js (Claude Code is already Node). Keep bash around for macOS/Linux dev-only scripts (`dev-link.sh`, `fetch-url.sh`, `fetch-youtube.sh`) or port them too if Windows parity is desired there. Until then, README `플랫폼 지원` table is the source of truth for what works where.
