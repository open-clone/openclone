# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository. Human-oriented docs are separate: [docs/architecture.md](docs/architecture.md) for the architecture walkthrough and [CONTRIBUTING.md](CONTRIBUTING.md) for PR process (both Korean).

## What this repo is

A Claude Code **standalone skill** named `openclone`. The repo root **is** the skill — `SKILL.md` at the root declares the `/openclone` slash command and owns its dispatch logic. There is no build step, no test runner, no package manager, no `node_modules`. Distribution is by direct `git clone` into `~/.claude/skills/openclone/` (not `/plugin install`, not a marketplace), then `./setup` registers hooks + statusline in `~/.claude/settings.json`. Claude Code auto-discovers the skill on next session start.

## Commands

No `npm install`, no build — everything is bash and markdown. CI validators are TypeScript but Node 24+ runs `.ts` natively without flags.

```bash
./setup                                   # register UserPromptSubmit + SessionStart hooks + statusline in ~/.claude/settings.json (idempotent)
./uninstall                               # strip every _openclone_managed entry, delete ~/.claude/skills/openclone (keeps ~/.openclone)
./scripts/dev-link.sh <rel-path> [...]    # symlink workspace file(s) into installed skill — edits flow live
./scripts/dev-unlink.sh <rel-path> [...]  # remove dev-link; if the path is tracked, restore shipped version from git
touch ~/.openclone/no-auto-update         # disable SessionStart git pull (use while dev-linking)
rm ~/.openclone/no-auto-update            # re-enable auto-update
node .github/scripts/validate-skill.ts    # CI: SKILL.md frontmatter + references/*.md existence
node .github/scripts/validate-clones.ts   # CI: clones/*/persona.md schema + FIXED_CATEGORIES cross-file mentions
bash .github/scripts/smoke-hook.sh        # CI: hook JSON output across 5 states (no state, active, missing, room, force-push)
shellcheck hooks/*.sh scripts/*.sh        # CI shellcheck (severity: error; action also picks up setup/uninstall via shebang)
npx markdownlint-cli2 "**/*.md"           # CI markdownlint (config: .markdownlint-cli2.jsonc)
```

Node 22.6–23.5 requires `NODE_OPTIONS=--experimental-strip-types` to run the `.ts` validators.

## Project structure

```text
SKILL.md                       # single-dispatcher for /openclone — frontmatter + $ARGUMENTS branch table
README.md                      # user-facing install one-liner + usage (Korean)
CLAUDE.md                      # this file — AI-agent guide
CONTRIBUTING.md                # human contributor guide (Korean) — PR process, local dev loop, schema how-to
CHANGELOG.md · LICENSE · SECURITY.md · CODE_OF_CONDUCT.md
setup                          # bash; registers hooks + statusline in ~/.claude/settings.json + self-heals old installs
uninstall                      # bash; strips managed entries + removes install dir + cleans legacy plugin keys
clones/<name>/
  persona.md                   # built-in persona — shipped; sparse-default ON
  knowledge/                   # built-in knowledge — sparse-EXCLUDED; lazy-fetched on first /openclone <name>
hooks/
  inject-active-clone.sh       # UserPromptSubmit hook: room > active-clone > no-op; also emits force-push banner
scripts/
  session-update.sh            # SessionStart hook: fork-to-bg, throttled git pull --ff-only + cone→non-cone migration
  fetch-clone-knowledge.sh     # git sparse-checkout add clones/<slug>/knowledge — called by SKILL.md on activation
  statusline.sh                # renders "[display_name - role] 클론으로 대화중" or "[a, b, c +N] 클론들과 대화중"
  fetch-url.sh                 # curl + pandoc/html2text fallback when WebFetch is unavailable (ingest)
  fetch-youtube.sh             # yt-dlp transcript extractor (ingest; requires yt-dlp on PATH)
  dev-link.sh / dev-unlink.sh  # workspace → installed-skill symlink overlay for iteration
references/
  clone-schema.md              # SOURCE OF TRUTH for persona.md frontmatter/sections + knowledge filename rules
  categories.md                # the fixed 7 categories — vc, tech, founder, expert, influencer, politician, celebrity
  home-workflow.md             # /openclone (no arg) — home panel render + menu-context write
  interview-workflow.md        # /openclone new <slug>
  refine-workflow.md           # /openclone ingest <source>
  panel-workflow.md            # /openclone panel <category> "<question>" — also canonical "no emojis" rule
  room-workflow.md             # /openclone room — roster management + runtime routing rules
assets/clone-template.md       # copy-pasteable starting persona.md for hand-authoring
docs/architecture.md           # human-oriented Korean architecture walkthrough
.github/
  scripts/validate-skill.ts    # CI: SKILL.md frontmatter + body references/*.md existence check
  scripts/validate-clones.ts   # CI: persona.md schema + FIXED_CATEGORIES cross-file mentions (6 files)
  scripts/smoke-hook.sh        # CI: isolated-$HOME fixture — runs the hook across 5 states, asserts valid JSON + expected tags
  workflows/validate.yml       # runs validators + smoke-hook + shellcheck + markdownlint-cli2 on push/PR
  ISSUE_TEMPLATE/              # bug, feature, clone_add, clone_update, opt_in_request, config.yml
```

The install layout is non-cone sparse-checkout: `/*` included, `!/clones/*/knowledge/` excluded. Only the per-clone `knowledge/` subdirs are lazy-fetched.

## Two-location data model

Every read path merges two roots. The **built-in** (shipped, read-only) and **user** (local, writable) layouts are structurally identical — only the root differs.

| Purpose | Built-in (shipped, read-only) | User (writable) |
| --- | --- | --- |
| Persona | `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` | `~/.openclone/clones/<name>/persona.md` |
| Knowledge | `${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/` | `~/.openclone/clones/<name>/knowledge/` |
| Active pointer | — | `~/.openclone/active-clone` (clone name on one line) |
| Room roster | — | `~/.openclone/room` (one name per line; non-empty = room mode) |
| Home-panel menu | — | `~/.openclone/menu-context` (JSON; last home panel's numbering for `/openclone <N>`) |
| Auto-update state | — | `last-update-check` (mtime throttle), `last-update.log`, `just-upgraded-from`, `force-push-detected`, `no-auto-update` |

Rules:

- **Persona is user-OR-built-in; user wins.** Same `<name>` on both sides → user shadows built-in everywhere (hook, statusline, home panel, activation).
- **Knowledge is user-AND-built-in; both layer.** The hook tells Claude to read from both directories and weight newer dates more heavily, with user-ingested files preferred over built-in on the same topic.
- `${CLAUDE_SKILL_DIR}` resolves to `~/.claude/skills/openclone` at the installed location. `SKILL.md` uses the variable — Claude Code expands it. **Scripts must not rely on the env var** (not guaranteed to reach child processes); they self-locate with `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"`.

## Architecture

### Single-dispatcher SKILL.md

The root `SKILL.md` is the sole entry point for both `/openclone` and natural-language requests that match its `description` triggers. Its body parses `$ARGUMENTS` into a sub-action (`<empty>` → home panel, `<N>` → menu selection, `stop`, `new`, `ingest`, `room`, `panel`, `<clone-name>` → activate) and delegates to the matching reference under `references/`. Frontmatter keys required: `name`, `description`, `allowed-tools` (enforced by `validate-skill.ts`); `argument-hint` is optional. When adding a sub-action, extend the dispatch table in `SKILL.md` and put the logic in a new `references/<name>-workflow.md` — **never** add `commands/*.md` files; standalone skills do not have a `commands/` directory.

### Persona injection via UserPromptSubmit hook

`hooks/inject-active-clone.sh` runs on every user prompt. Precedence (first match wins):

1. **Room mode** — `~/.openclone/room` exists and is non-empty. Emits `<openclone-room>` with every listed member's full persona + routing rules: default one clone answers, at most two when perspectives genuinely diverge, never zero.
2. **Active-clone mode** — `~/.openclone/active-clone` resolves (user first, then built-in). Emits `<openclone-active-clone>` with the persona, both candidate knowledge directories, recency-weighting guidance, and the category-specific framing instruction.
3. Otherwise emit `{}` — silent no-op. Every error path also emits `{}`; the hook never fails loudly.

Both modes emit the **same inline citation contract**: `\[[N](<target>)\]` after any sentence citing a knowledge file or web lookup. `<target>` priority: (1) frontmatter `source_url` if present — must use it; (2) WebSearch/WebFetch result URL; (3) `file://` URL of the knowledge file with every non-ASCII char, space, paren, comma etc. UTF-8-percent-encoded; (4) skip the link and mention the source in prose. Never emit a raw path without `file://` + encoding. Skip citations for persona voice, opinions, common knowledge; no separate Sources footer.

If `~/.openclone/force-push-detected` exists (written by `session-update.sh` when origin/main diverged), the hook prepends an `<openclone-upgrade-needed>` banner to every injection — so stuck installs surface recovery instructions regardless of mode.

The hook is the **only** mechanism that makes an active clone or room "alive." `/openclone <name>` writes `active-clone` and (for built-in clones) calls `fetch-clone-knowledge.sh` to materialize the knowledge directory. `/openclone room <a> <b> ...` writes `room`. The dispatcher does not re-inject persona itself.

### Auto-update via SessionStart hook

`scripts/session-update.sh` is registered as a `SessionStart` hook by `./setup`. On every session start it **immediately forks to background via `nohup "$0" __bg` and exits 0**, so the session never blocks. The background branch:

1. Skips if `~/.openclone/no-auto-update` exists (user opt-out).
2. Throttles via `~/.openclone/last-update-check` mtime (1 hour).
3. Runs `git fetch +refs/heads/main:refs/remotes/origin/main` then `git merge --ff-only origin/main` with `GIT_TERMINAL_PROMPT=0` so it never hangs on auth.
4. If fast-forward succeeded, removes any stale `force-push-detected` marker.
5. If the remote cannot fast-forward (force-push / divergence), writes `~/.openclone/force-push-detected` with both heads — does **not** reset the local tree (user may have dev-links or local edits).
6. Writes `~/.openclone/just-upgraded-from` with the old HEAD when a pull advanced.
7. Logs everything to `~/.openclone/last-update.log`.

The same script runs a **one-shot migration** for pre-v0.3 installs that used cone-mode sparse-checkout with a top-level `knowledge/`: detects `core.sparseCheckoutCone = true`, rewrites the sparse config to non-cone with `/*` + `!/clones/*/knowledge/`, and re-materializes the currently active clone's knowledge if any. Idempotent.

`./setup` on re-run also self-heals: it performs the same cone → non-cone migration if needed, and warns to stderr (without resetting) when origin/main has been rewritten. The setup script hard-stops if `~/.claude/plugins/marketplaces/openclone` (the v1 plugin install path) exists — users must run the old uninstall first before re-running the new install.

### Statusline

`./setup` registers `scripts/statusline.sh` as the `statusLine.command` in `~/.claude/settings.json`, tagged with `_openclone_managed: true`. **Setup will not overwrite a third-party statusline** — if an existing `statusLine` is present without our managed marker, setup skips and prints instructions so the user can opt in manually. `uninstall` only removes the statusLine entry if our marker is present.

Display rules (first match wins):

1. `~/.openclone/room` non-empty → `[display_name1, display_name2, display_name3 +N] 클론들과 대화중` (max 3 names shown, `+N` overflow).
2. `~/.openclone/active-clone` non-empty → `[display_name - role] 클론으로 대화중`, where `role` is the first sentence of `tagline` (falls back to a Korean label keyed on `primary_category` — see `role_label` case in `scripts/statusline.sh`).
3. Neither → empty line.

### References are lazy-loaded

`references/*.md` are **not** auto-loaded. The dispatcher tells Claude to `Load ${CLAUDE_SKILL_DIR}/references/<file>.md and follow it exactly` per sub-action, keeping context lean. When changing a workflow, edit the reference, not `SKILL.md`.

## Invariants

### Never mutate `${CLAUDE_SKILL_DIR}/` at runtime

The install directory is treated as read-only by every runtime path. When a user tries to modify a built-in clone, `/openclone ingest` does **fork-on-write**: `cp -R ${CLAUDE_SKILL_DIR}/clones/<name> ~/.openclone/clones/<name>` first, then writes only to the user copy (which now shadows the built-in). The hook's `resolve_clone` function is the canonical lookup order — every new feature that reads clones must mirror user-first precedence.

### Knowledge is append-only

Knowledge files are named `YYYY-MM-DD-<topic-slug>.md` and are **never overwritten or merged**. When the same topic recurs, a fresh dated file is added. The hook instructs Claude to weight newer dates more heavily while still treating older entries as valid background (beliefs evolve but rarely flip). Preserve this invariant if `refine-workflow.md` changes.

### Categories are a fixed v1 list

`vc`, `tech`, `founder`, `expert`, `influencer`, `politician`, `celebrity`. Adding a category means editing **seven** places in one PR:

1. `references/categories.md` — add lens definition.
2. `references/home-workflow.md` — add to section order.
3. `references/interview-workflow.md` — add stage-1 blurb + stage-3 prompt block.
4. Root `SKILL.md` — add to natural-language triggers and the panel validation list.
5. `README.md` — update the category line.
6. `scripts/statusline.sh` — add a Korean label in the `role_label` case.
7. `.github/scripts/validate-clones.ts` — add to `FIXED_CATEGORIES` (CI will fail otherwise).

The dispatcher passes panel category tokens through to `panel-workflow.md` verbatim — no branch logic needs to change in `SKILL.md` beyond the validation list. Don't half-add.

### Paths stay abstract

- `SKILL.md` / references: `${CLAUDE_SKILL_DIR}` for shipped files, `$HOME/.openclone` or `~/.openclone` for user state. No absolute paths.
- Scripts: `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"`. Do not depend on `CLAUDE_SKILL_DIR` being exported — it is not guaranteed to reach child processes.

### No emojis

Clone output, `SKILL.md`, references, docs — nothing emits emojis unless the user explicitly asks. The rule is explicit in `references/panel-workflow.md` and inherited everywhere else.

### Standalone skill, not a plugin

Standalone skill commands are **not namespaced** — `/openclone` works directly. A plugin equivalent would have been `/openclone:openclone`. Do not re-introduce `.claude-plugin/plugin.json` or a marketplace manifest; it would re-promote the skill to plugin status and break the UX. `uninstall` still scrubs legacy `enabledPlugins["openclone@openclone"]` and `extraKnownMarketplaces["openclone"]` from `~/.claude/settings.json` for users migrating off the v1 plugin install.

## Editing conventions

- **`references/clone-schema.md` is canonical** for persona.md frontmatter (`name`, `display_name`, `tagline`, `categories`, `created`, `voice_traits` required; `primary_category` optional), required body sections (`## Persona` → `## Speaking style` → `## Guidelines` → `## Background`), optional `## Category-specific framing`, and the knowledge filename convention. Keep it in sync with `clones/douglas/persona.md` as the worked example. `validate-clones.ts` enforces the frontmatter keys, category enum, and body sections.
- **Helper scripts live in `scripts/`** and are invoked from `SKILL.md` via `${CLAUDE_SKILL_DIR}/scripts/<name>.sh`. Scripts exit 0 with output on stdout; the dispatcher is responsible for capturing. Scripts executed from **hooks** must also exit 0 on failure paths — never let a hook cascade into the session.
- **`setup` and `uninstall` are executable shell scripts** at the repo root (no `.sh` extension). They edit `~/.claude/settings.json` via an inline `python3` block, tagging every inserted entry with `_openclone_managed: true` so uninstall can strip exactly those and leave user-authored hooks/statuslines intact. Preserve all unrelated keys when editing these scripts.
- **CI runs on every push and PR** (`.github/workflows/validate.yml`): the two TypeScript validators (`validate-skill.ts` also cross-checks that every `${CLAUDE_SKILL_DIR}/references/<slug>.md` mentioned in `SKILL.md` exists; `validate-clones.ts` also verifies that every `FIXED_CATEGORIES` token is mentioned in each of the six downstream files), the `smoke-hook.sh` fixture (runs `hooks/inject-active-clone.sh` under an isolated temp `$HOME` across 5 states and asserts valid JSON + expected tags), `shellcheck` at `severity: error` (action detects shebang+executable files, so root `setup`/`uninstall` are covered too), and `markdownlint-cli2` with knowledge directories ignored (`.markdownlint-cli2.jsonc`).

## Gotchas

- **Sparse-checkout pattern lives in three places** — the install one-liner in `README.md`, `scripts/fetch-clone-knowledge.sh`, and the migration branch in `scripts/session-update.sh`. If you change the pattern, update all three together.
- **`fetch-clone-knowledge.sh` is a no-op** when the repo is not a git checkout (e.g., a dev machine where files were symlinked in). Knowledge is expected to already be on disk in that case.
- **Apostrophes in the hook's heredoc body break shell parsing.** Bash parses `$(...)` substitutions inside heredocs and gets confused by unmatched single quotes in the content. Avoid contractions like `clone's` in the heredoc body — use "this clone" or typographic `'`.
- **The hook has two JSON-escaping paths**: `python3` (preferred) and `sed/awk` (fallback). macOS always hits the python3 path by default, so the fallback is not exercised there — test both branches if you touch the escaping code.
- **Hook script edits apply live.** Paths are re-resolved on every invocation. But if you change **hook registration** (the `setup` script itself), re-run `./setup` and restart Claude Code so the new settings.json entries take effect.
- **`session-update.sh` re-execs itself with `__bg`** as the first arg to detach. Do not remove the `"${1:-}" != "__bg"` gate — it is what keeps the foreground hook from blocking on `git pull`.
- **Room cap is 8 members** (`references/room-workflow.md`); extras are dropped with a warning.
- **CI expects Node ≥ 22.6** for the `.ts` validators. Node 24+ is zero-config; 22.6–23.5 needs `NODE_OPTIONS=--experimental-strip-types`.
- `clones/<name>/persona.md` ships **with** the skill (sparse-default ON) — built-in personas. `clones/<name>/knowledge/` lives under the same folder but is **sparse-default OFF** (excluded by the non-cone pattern `!/clones/*/knowledge/`) — only fetched when `/openclone <name>` activates that clone. If you ever change the sparse-checkout pattern structure, update (a) the install one-liner in `README.md`, (b) `scripts/fetch-clone-knowledge.sh`, and (c) the migration branch in `scripts/session-update.sh` together.
- The hook uses `python3` for JSON-escaping with a sed/awk fallback. If you touch the escaping path, test both branches — the fallback is not exercised on macOS by default.
- Apostrophes inside the hook's heredoc body break shell parsing (bash parses `$(...)` command substitutions and gets confused by unmatched single quotes in the heredoc content). Avoid contractions like "clone's" in the heredoc — use "this clone" or typographic apostrophes if needed.
- After editing hooks (scripts) the path is re-resolved on every invocation, so no restart is needed. After changing hook *registration* (setup script itself), re-run `./setup`. After the first install, a Claude Code session restart is needed so the newly registered hooks take effect.
- `scripts/session-update.sh` re-execs itself with `__bg` as the first arg to detach. Do not remove the `"${1:-}" != "__bg"` gate — it is what prevents the foreground hook from blocking on `git pull`.
- `scripts/fetch-clone-knowledge.sh` is a no-op when the repo is not a git checkout (e.g., dev machine that symlinked files in). Knowledge is then expected to already exist on disk.
- Standalone skill commands are **not** namespaced — `/openclone` works directly. Plugin commands would have been `/openclone:openclone`. Do not add `.claude-plugin/plugin.json` back; it would re-promote the skill to a plugin and reintroduce the namespace prefix.

## Roadmap

- **Windows native support** — the skill is bash-only today (hooks, `setup`, `uninstall`, `scripts/*.sh`). WSL2 works; Git Bash is brittle (`nohup`/`disown` detach in `session-update.sh`, `ln -sfn` in `dev-link.sh`, Claude Code routing `.sh` hooks through bash); cmd.exe/PowerShell is impossible. Proper fix is to port `hooks/inject-active-clone.sh`, `scripts/session-update.sh`, `scripts/statusline.sh`, `scripts/fetch-clone-knowledge.sh`, and the `setup`/`uninstall` settings.json editors to Node.js (Claude Code is already Node). Keep bash around for macOS/Linux dev-only scripts (`dev-link.sh`, `fetch-url.sh`, `fetch-youtube.sh`) or port them too if Windows parity is desired there. Until then, README `플랫폼 지원` table is the source of truth for what works where.
