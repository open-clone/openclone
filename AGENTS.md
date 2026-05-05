# AGENTS.md

Guidance for AI coding agents (Claude Code, OpenAI Codex, Cursor, etc.) working in this repository. Claude Code reads this file via `CLAUDE.md` (a one-line `@AGENTS.md` import stub at the repo root) — both filenames resolve to this same content. Human-oriented docs are separate: [docs/architecture.md](docs/architecture.md) for the architecture walkthrough and [CONTRIBUTING.md](CONTRIBUTING.md) for PR process (both Korean).

## What this repo is

A Claude Code **standalone skill** named `openclone`. The repo root **is** the skill — `SKILL.md` at the root declares the `/openclone` slash command and owns its dispatch logic.

Distribution has two paths and they coexist:

1. **Claude Code skill** — direct `git clone` (with non-cone sparse-checkout) into `~/.claude/skills/openclone/`, not `/plugin install`, not a marketplace. Then `./setup` registers hooks + statusline in `~/.claude/settings.json`. Claude Code auto-discovers the skill on next session start. The skill itself is bash + markdown — no Node.js needed.
2. **Standalone Node.js CLI** — published as `@openclone/openclone` on npm (`npm install -g @openclone/openclone`, exposing the `openclone` bin). The CLI shares the same `clones/<slug>/persona.md` and `knowledge/*.md` files and renders them through the Vercel AI SDK (`src/cli/`, `src/lib/`, `src/ui/`). Has its own `package.json`, `tsconfig.json`, `dist/` build output, `test/` test runner, and `npm` workflows. Existing Claude Code setup must continue to work without requiring the CLI.

The `.github/workflows/publish-npm.yml` workflow auto-publishes on GitHub Release: it reads the semver from the release tag, picks `next` dist-tag for prereleases (anything containing `-` or marked as prerelease) and `latest` otherwise, runs the full validate + build + audit + shellcheck + markdownlint pipeline, then `npm publish --provenance --access public`.

## Commands

Claude Code skill support remains bash and markdown, but the repository also includes an additive Node.js CLI for standalone API-based chat with the same markdown clones. Existing Claude Code setup must continue to work without requiring the CLI.

```bash
./setup                                   # register UserPromptSubmit + SessionStart hooks + statusline in ~/.claude/settings.json (idempotent)
./uninstall                               # strip every _openclone_managed entry, delete ~/.claude/skills/openclone (keeps ~/.openclone)
./scripts/dev-link.sh <rel-path> [...]    # symlink workspace file(s) into installed skill — edits flow live
./scripts/dev-unlink.sh <rel-path> [...]  # remove dev-link; if the path is tracked, restore shipped version from git
touch ~/.openclone/no-auto-update         # disable SessionStart git pull (use while dev-linking)
rm ~/.openclone/no-auto-update            # re-enable auto-update
node .github/scripts/validate-skill.ts    # CI: SKILL.md frontmatter + references/*.md existence
node .github/scripts/validate-clones.ts   # CI: clones/*/persona.md schema + FIXED_CATEGORIES cross-file mentions
npm install && npm run validate           # CLI: typecheck + build + test + smoke-hook in one shot (CI uses this)
npm test                                  # CLI: just the Node test runner specs (test/*.test.mjs)
bash .github/scripts/smoke-hook.sh        # CI: hook JSON output across 5 states (no state, active, missing, room, force-push)
shellcheck hooks/*.sh scripts/*.sh setup uninstall  # CI shellcheck (severity: error; setup/uninstall also covered)
npx markdownlint-cli2 "**/*.md"           # CI markdownlint (config: .markdownlint-cli2.jsonc)
```

Node 22.6–23.5 requires `NODE_OPTIONS=--experimental-strip-types` to run the `.ts` validators.

## Project structure

```text
SKILL.md                       # single-dispatcher for /openclone — frontmatter + $ARGUMENTS branch table
README.md                      # user-facing install one-liner + usage (Korean — canonical source)
README_en.md                   # English translation (synced via sync-comment SHA header)
README_zh.md                   # Simplified Chinese translation (carries REVIEW NEEDED marker until native review)
CLAUDE.md                      # this file — AI-agent guide
CONTRIBUTING.md                # human contributor guide (Korean) — PR process, local dev loop, schema how-to
CHANGELOG.md · LICENSE · SECURITY.md · CODE_OF_CONDUCT.md
setup                          # bash; registers hooks + statusline in ~/.claude/settings.json + self-heals old installs
uninstall                      # bash; strips managed entries + removes install dir + cleans legacy plugin keys
package.json · tsconfig.json · package-lock.json    # Node CLI build config (scripts: build, typecheck, test, validate, clean)
.markdownlint-cli2.jsonc       # markdownlint config — ignores clones/*/knowledge/, node_modules/, .context/, .omx/
test/                          # Node test runner specs for the CLI — *.test.mjs (history-store, conversation, clone-tools, ink-conversation, provider-resolver, etc.)
clones/<name>/
  persona.md                   # built-in persona — shipped; sparse-default ON
  knowledge/                   # built-in knowledge — sparse-EXCLUDED; lazy-fetched on first /openclone <name>
hooks/
  inject-active-clone.sh       # UserPromptSubmit hook: room > active-clone > no-op; also emits force-push banner
src/
  cli/index.ts                 # standalone Node CLI bin: list / status / chat / history / help
  lib/clone-loader.ts          # reads persona/knowledge markdown with user-over-built-in precedence
  lib/clone-tools.ts           # AI SDK ToolSet: list_knowledge_files / read_knowledge_file / web_fetch / web_search
  lib/config.ts                # CLI config + env var defaults (model, baseURL, provider, OPENCLONE_*)
  lib/conversation.ts          # interactive chat loop — runConversation, /compact, auto-compaction, onPersist callback
  lib/format-error.ts          # normalizes provider/SDK errors into the structured shape rendered by ErrorBanner
  lib/frontmatter.ts           # YAML frontmatter parse helpers shared by clone-loader and validators
  lib/history-store.ts         # ~/.openclone/conversations/<slug>/<sessionId>.json — schemaVersion + normalizeRecord
  lib/paths.ts                 # XDG-aware ~/.openclone resolution + per-clone subpaths
  lib/prompt-renderer.ts       # renders CLI system prompts from markdown source of truth
  lib/provider-resolver.ts     # OpenAI-compatible / Codex OAuth / Claude Code OAuth / Ollama provider config from flags + OPENCLONE_* env
  lib/claude-code-auth.ts      # reads ~/.claude/.credentials.json or macOS keychain "Claude Code-credentials"; refreshes via console.anthropic.com
  lib/single-shot.ts           # non-TTY one-shot path used by --prompt and piped stdin
  lib/slug.ts                  # slug normalization shared between CLI and history-store
  lib/stream-chat.ts           # generateText/streamText wrapper with shared tool wiring
  ui/                          # Ink TUI (React reconciler) — interactive chat renderer when stdin/stdout are TTY
    App.tsx · HeaderBar.tsx · InputBox.tsx · Markdown.tsx · MessageView.tsx · PromptInput.tsx · ErrorBanner.tsx
    runInkConversation.tsx     # entry point invoked from chatCommand when isInteractiveTty
    hooks/useStateAndRef.ts    # React hook keeping a ref synced with state for stable closures
    marked-terminal.d.ts       # ambient typings for marked-terminal renderer
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
  update-workflow.md           # /openclone update <name> — Chrome MCP-gated incremental refresh from persona.md ## Links
  panel-workflow.md            # /openclone panel <category> "<question>" — broadcast + per-clone consolidation
  room-workflow.md             # /openclone room — roster management + runtime routing rules
assets/clone-template.md       # copy-pasteable starting persona.md for hand-authoring
docs/architecture.md           # human-oriented Korean architecture walkthrough
skills/openclone-cli/          # nested Claude Code skill — usage help for the standalone CLI
  SKILL.md                     # invoked when users ask about npm/Codex OAuth/Ollama/--resume/etc.
  references/                  # quickstart · openai-compatible · codex-oauth · ollama · conversation-and-knowledge · troubleshooting
.github/
  scripts/validate-skill.ts    # CI: SKILL.md frontmatter + body references/*.md existence check
  scripts/validate-clones.ts   # CI: persona.md schema + FIXED_CATEGORIES cross-file mentions (6 files)
  scripts/validate-readme-i18n.ts  # CI: README_ko/en/zh language-picker, sync-comment SHA, clone-slug drift, install fragment, ZH REVIEW NEEDED
  scripts/smoke-hook.sh        # CI: isolated-$HOME fixture — runs the hook across 5 states, asserts valid JSON + expected tags
  workflows/validate.yml       # runs validators + smoke-hook + shellcheck + markdownlint-cli2 on push/PR
  workflows/publish-npm.yml    # GitHub Release → npm publish with provenance; tag-driven version + dist-tag (latest|next)
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
| CLI conversation sessions | — | `~/.openclone/conversations/<slug>/<sessionId>.json` (plaintext JSON, written by the standalone Node CLI's interactive chat — see "CLI conversation persistence" below) |
| Auto-update state | — | `last-update-check` (mtime throttle), `last-update.log`, `just-upgraded-from`, `force-push-detected`, `no-auto-update` |

Rules:

- **Persona is user-OR-built-in; user wins.** Same `<name>` on both sides → user shadows built-in everywhere (hook, statusline, home panel, activation).
- **Knowledge is user-AND-built-in; both layer.** The hook tells Claude to read from both directories and weight newer dates more heavily, with user-ingested files preferred over built-in on the same topic.
- `${CLAUDE_SKILL_DIR}` resolves to `~/.claude/skills/openclone` at the installed location. `SKILL.md` uses the variable — Claude Code expands it. **Scripts must not rely on the env var** (not guaranteed to reach child processes); they self-locate with `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"`.

## Architecture

### Single-dispatcher SKILL.md

The root `SKILL.md` is the sole entry point for both `/openclone` and natural-language requests that match its `description` triggers. Its body parses `$ARGUMENTS` into a sub-action (`<empty>` → home panel, `<N>` → menu selection, `stop`, `new`, `ingest`, `update`, `room`, `panel`, `<clone-name>` → activate) and delegates to the matching reference under `references/`. Frontmatter keys required: `name`, `description`, `allowed-tools` (enforced by `validate-skill.ts`); `argument-hint` is optional. When adding a sub-action, extend the dispatch table in `SKILL.md` and put the logic in a new `references/<name>-workflow.md` — **never** add `commands/*.md` files; standalone skills do not have a `commands/` directory.

`new`, `ingest`, and `update` all have a hard preflight gate on `claude-in-chrome` (Chrome MCP) — login-walled / JS-rendered sources (LinkedIn, Threads, X, Instagram, Facebook) cannot be reached with plain `curl`/`WebFetch`. The reference files abort with a Korean error message instructing the user to enable the extension; do not propose curl workarounds.

### Standalone Node CLI

The CLI is additive. It must not replace the Claude Code hook path. It reads the same `clones/<slug>/persona.md` and `knowledge/*.md` files and sends a rendered system prompt through Vercel AI SDK. Provider defaults use `@ai-sdk/openai-compatible` with default model `gpt-5.5`; `OPENCLONE_API_KEY`/`OPENAI_API_KEY` are the stable credential path, with `OPENCLONE_BASE_URL`, `OPENCLONE_PROVIDER`, `OPENCLONE_PROVIDER_NAME` overriding via env. `--use-codex-auth` switches to the `openai-oauth-provider` Codex backend transport (`https://chatgpt.com/backend-api/codex`) using local Codex/ChatGPT auth (with `OPENCLONE_CODEX_ENSURE_FRESH` / `OPENCLONE_CODEX_STORE` / `OPENCLONE_CODEX_AUTH_FILE` knobs). `--use-claude-code-auth` (alias `--use-claude-auth`, env `OPENCLONE_USE_CLAUDE_CODE_AUTH=1` / `OPENCLONE_USE_CLAUDE_AUTH=1`) switches to `@ai-sdk/anthropic` against `https://api.anthropic.com/v1` (default model `claude-sonnet-4-6`) using the Claude Code subscription OAuth token from macOS keychain (`Claude Code-credentials`) or `~/.claude/.credentials.json`; the resolver injects `anthropic-beta: oauth-2025-04-20,interleaved-thinking-2025-05-14`, force-overrides `User-Agent` to `claude-cli/<ver> (external, cli)` (any AI SDK self-identifying UA leaks → generic 429), strips `x-stainless-*`, splits the system prompt into a two-block array `[{identity}, {persona}]` (single merged block also fails OAuth validation), rewrites `/v1/messages` to add `?beta=true`, and refreshes near-expiry tokens via `https://console.anthropic.com/v1/oauth/token` (client_id `9d1c250a-e61b-44d9-88ed-5944d1962f5e`). `OPENCLONE_DEBUG_HTTP=1` logs URL/headers/body/response to stderr for diagnosing OAuth-shape regressions. `--provider ollama` uses `ai-sdk-ollama` for local Ollama. Do not route Codex OAuth through plain `api.openai.com/v1`, and do not route Claude Code OAuth through `x-api-key` (the Bearer token is rejected with the API-key header).

The CLI exposes four AI SDK tools (`src/lib/clone-tools.ts`) so the model can fetch primary sources at conversation time: `list_knowledge_files` and `read_knowledge_file` (built-in + user knowledge) plus best-effort `web_fetch` and `web_search`. The same inline citation contract from the hook (`\[[N](<target>)\]` with `source_url` priority) applies to tool outputs.

Interactive chat (when both stdin and stdout are TTY) renders through an Ink-based TUI in `src/ui/` (React reconciler + `marked-terminal` for markdown). Non-TTY paths (`--prompt`, piped stdin) skip Ink entirely and use `src/lib/single-shot.ts`.

### CLI conversation persistence

The interactive `openclone chat` loop persists every turn — and the final exit — to `~/.openclone/conversations/<slug>/<sessionId>.json` as plaintext JSON. `sessionId` is a filename-safe ISO timestamp (`2026-04-28T14-32-19-487Z`). The same file is overwritten in place during a single live session, so there is exactly one JSON per session. Schema is owned by `src/lib/history-store.ts` (`ConversationSessionRecord`, currently `schemaVersion: 1`).

Persistence is wired purely at the CLI layer:

- `runConversation` (in `src/lib/conversation.ts`) accepts `initialMessages`, `initialSummary`, and an `onPersist({ reason, messages, conversationSummary })` callback. The library itself does no I/O.
- `chatCommand` (in `src/cli/index.ts`) constructs a `HistoryStore`, generates a fresh `sessionId` for new chats or reuses the loaded one for `--resume`, and wires `onPersist` to call `historyStore.save(...)`.
- `--resume` (no value → latest by lexicographic `sessionId` sort) or `--resume=<id>` (specific session) loads the record and seeds `initialMessages` / `initialSummary`. A `[resumed: N message(s)]` banner is printed, the prior summary (if any) is rendered between `--- prior summary ---` / `--- end summary ---` markers, and every restored message is replayed to stdout in chronological order (user messages prefixed with `>>>`, assistant responses unprefixed) followed by `--- continuing conversation ---` before the live prompt loop. This lets users scroll up in their terminal to see the full prior dialogue.
- `--no-persist` passes `onPersist: undefined`, so the run is fully ephemeral.
- `openclone history <slug>` lists saved sessions for a single clone (newest first by `sessionId`). `openclone history --all` (or `openclone history` when no `active-clone` is set) walks every directory under `~/.openclone/conversations/`, groups sessions by slug, and tags any group whose slug is not in `CloneLoader.listClones()` with `[orphan: clone not found]`. Cross-clone listing reuses `HistoryStore.listClonesWithSessions()` and `HistoryStore.listAllSessions()`; orphan classification reuses `CloneLoader.listClones()` so adding/removing a clone automatically reflects in the orphan tag. By default the listing prints a column header (`SESSION_ID / MESSAGES / LAST_UPDATED / PATH`) plus a per-session `openclone chat <slug> --resume=<id>` hint; `--quiet` suppresses both, useful for piping into shell scripts.

#### Auto-compaction and `/compact`

Long interactive sessions auto-compact older turns into a running `conversationSummary` so context windows stay bounded. The threshold and behavior are configured per-`runConversation` call (see `src/lib/conversation.ts`):

- `compactMaxChars` — total chars (messages + summary) above which compaction runs at the next user prompt boundary. Default `350000`, overridable via `OPENCLONE_COMPACT_MAX_CHARS`.
- `compactKeepTurns` — how many of the most recent turns to leave verbatim when compacting. Default `8`, overridable via `OPENCLONE_COMPACT_KEEP_TURNS`.
- `compactSummaryMaxChars` — soft cap on the summary itself. Default `20000`, overridable via `OPENCLONE_COMPACT_SUMMARY_MAX_CHARS`.

Users can also force compaction at any time by typing `/compact` at the prompt. Both auto and manual compaction call `onPersist` with `reason: "compact"` so the new summary is written to the session JSON immediately (resume after a crash mid-compaction is safe). Set `compactMaxChars: 0` to disable auto-compaction entirely while keeping `/compact` available.

Invariants:

- `~/.openclone/conversations/` is owned by the user (never under `${CLAUDE_SKILL_DIR}`).
- The CLI must never write history when stdin is non-interactive (single-shot `--prompt` / piped stdin paths skip `runConversation` entirely).
- `onPersist` failures are reported to stdout and never crash the conversation loop. This is non-negotiable: a transient disk error must not lose the user's in-memory state mid-session.
- When changing the persisted schema, bump `schemaVersion`, keep `normalizeRecord` backward-compatible for older files, and add a round-trip test.

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

Clone output, `SKILL.md`, references, docs — nothing emits emojis unless the user explicitly asks. The rule is repeated in five workflow references (`panel-workflow.md`, `room-workflow.md`, `refine-workflow.md`, `update-workflow.md`, `home-workflow.md`) so each entry point has it inline; if you change the rule, change all five together.

### Standalone skill, not a plugin

Standalone skill commands are **not namespaced** — `/openclone` works directly. A plugin equivalent would have been `/openclone:openclone`. Do not re-introduce `.claude-plugin/plugin.json` or a marketplace manifest; it would re-promote the skill to plugin status and break the UX. `uninstall` still scrubs legacy `enabledPlugins["openclone@openclone"]` and `extraKnownMarketplaces["openclone"]` from `~/.claude/settings.json` for users migrating off the v1 plugin install.

### License separation: code (MIT) vs. clones/ (CC BY-NC-SA 4.0)

Source code is MIT (`LICENSE`). Content under `clones/**` is CC BY-NC-SA 4.0 (`clones/LICENSE`, `clones/NOTICE.md`). The npm package ships both — `package.json` declares `license: "(MIT AND CC-BY-NC-SA-4.0)"`. When adding clones/knowledge files, fill `source_url` in frontmatter and reject sources that conflict with NC/SA (NoDerivs licenses, private/non-public material, anything requiring commercial-only distribution). When changing `package.json`'s `files` field, keep `clones/`, `LICENSE`, and the `clones/LICENSE`/`clones/NOTICE.md` pair shipped together — splitting them breaks attribution.

## Editing conventions

- **`references/clone-schema.md` is canonical** for persona.md frontmatter (`name`, `display_name`, `tagline`, `categories`, `created`, `voice_traits` required; `primary_category` optional), required body sections (`## Persona` → `## Speaking style` → `## Guidelines` → `## Background`), optional `## Category-specific framing`, and the knowledge filename convention. Keep it in sync with `clones/douglas/persona.md` as the worked example. `validate-clones.ts` enforces the frontmatter keys, category enum, and body sections.
- **Nested skill `skills/openclone-cli/`** — a separate Claude Code skill that surfaces standalone-CLI usage help (npm install, provider choice, `--resume`, conversation persistence, troubleshooting). It auto-loads in Claude Code sessions when a user asks about CLI topics; treat it as a sibling to root `SKILL.md` rather than a reference of it. `validate-skill.ts` validates nested skills as well — every reference its `SKILL.md` mentions must exist.
- **Helper scripts live in `scripts/`** and are invoked from `SKILL.md` via `${CLAUDE_SKILL_DIR}/scripts/<name>.sh`. Scripts exit 0 with output on stdout; the dispatcher is responsible for capturing. Scripts executed from **hooks** must also exit 0 on failure paths — never let a hook cascade into the session.
- **`setup` and `uninstall` are executable shell scripts** at the repo root (no `.sh` extension). They edit `~/.claude/settings.json` via an inline `python3` block, tagging every inserted entry with `_openclone_managed: true` so uninstall can strip exactly those and leave user-authored hooks/statuslines intact. Preserve all unrelated keys when editing these scripts.
- **CI runs on every push and PR** (`.github/workflows/validate.yml`): three TypeScript validators (`validate-skill.ts` cross-checks that every `${CLAUDE_SKILL_DIR}/references/<slug>.md` mentioned in `SKILL.md` exists, including for nested skills; `validate-clones.ts` verifies that every `FIXED_CATEGORIES` token is mentioned in each of the six downstream files; `validate-readme-i18n.ts` enforces the README ko/en/zh translation set — language picker, sync-comment SHA header, 12-clone slug list parity, install one-liner verbatim, ZH `REVIEW NEEDED` marker), the `smoke-hook.sh` fixture (runs `hooks/inject-active-clone.sh` under an isolated temp `$HOME` across 5 states and asserts valid JSON + expected tags), `npm ci && npm run build && npm test` for the CLI, `shellcheck` at `severity: error` (action detects shebang+executable files, so root `setup`/`uninstall` are covered too), and `markdownlint-cli2` with knowledge directories ignored (`.markdownlint-cli2.jsonc`).

## Gotchas

- **Sparse-checkout pattern lives in five places** — the install one-liner in `README.md` / `README_en.md` / `README_zh.md` (all three must match verbatim — `validate-readme-i18n.ts` enforces this), `scripts/fetch-clone-knowledge.sh`, and the migration branch in `scripts/session-update.sh`. If you change the pattern, update all five together.
- **`fetch-clone-knowledge.sh` is a no-op** when the repo is not a git checkout (e.g., a dev machine where files were symlinked in). Knowledge is expected to already be on disk in that case.
- **Apostrophes in the hook's heredoc body break shell parsing.** Bash parses `$(...)` substitutions inside heredocs and gets confused by unmatched single quotes in the content. Avoid contractions like `clone's` in the heredoc body — use "this clone" or typographic `'`.
- **The hook has two JSON-escaping paths**: `python3` (preferred) and `sed/awk` (fallback). macOS always hits the python3 path by default, so the fallback is not exercised there — test both branches if you touch the escaping code.
- **Hook script edits apply live.** Paths are re-resolved on every invocation. But if you change **hook registration** (the `setup` script itself), re-run `./setup` and restart Claude Code so the new settings.json entries take effect.
- **`session-update.sh` re-execs itself with `__bg`** as the first arg to detach. Do not remove the `"${1:-}" != "__bg"` gate — it is what keeps the foreground hook from blocking on `git pull`.
- **Room cap is 8 members** (`references/room-workflow.md`); extras are dropped with a warning.
- **CI expects Node ≥ 22.6** for the `.ts` validators. Node 24+ is zero-config; 22.6–23.5 needs `NODE_OPTIONS=--experimental-strip-types`.
- `clones/<name>/persona.md` ships **with** the skill (sparse-default ON) — built-in personas. `clones/<name>/knowledge/` lives under the same folder but is **sparse-default OFF** (excluded by the non-cone pattern `!/clones/*/knowledge/`) — only fetched when `/openclone <name>` activates that clone.

## Roadmap

- **Windows native support** — the skill is bash-only today (hooks, `setup`, `uninstall`, `scripts/*.sh`). WSL2 works; Git Bash is brittle (`nohup`/`disown` detach in `session-update.sh`, `ln -sfn` in `dev-link.sh`, Claude Code routing `.sh` hooks through bash); cmd.exe/PowerShell is impossible. Proper fix is to port `hooks/inject-active-clone.sh`, `scripts/session-update.sh`, `scripts/statusline.sh`, `scripts/fetch-clone-knowledge.sh`, and the `setup`/`uninstall` settings.json editors to Node.js (Claude Code is already Node). Keep bash around for macOS/Linux dev-only scripts (`dev-link.sh`, `fetch-url.sh`, `fetch-youtube.sh`) or port them too if Windows parity is desired there. Until then, README `플랫폼 지원` table is the source of truth for what works where.
