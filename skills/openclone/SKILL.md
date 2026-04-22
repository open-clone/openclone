---
name: openclone
description: Use when the user wants to create, manage, or talk to an openclone "clone" — a named AI persona with one or more categories (vc, dev, founder, pm, designer, writer, marketing, hr) and attached knowledge. Triggers on phrases like "create a clone", "make a persona", "talk as <name>", "switch to <name>", "feed knowledge to", "ingest url for <clone>", "ask all VCs", "stop being <name>". Also triggers when the user refers to `/openclone` or `/openclone:openclone` or wants to understand the openclone system.
---

# openclone

Openclone lets the user create AI persona "clones" — each a folder containing a `persona.md` and optional knowledge — and either (a) activate one so that every subsequent message is answered in that persona, (b) open a group **room** where multiple clones share a chat and the most relevant one auto-responds per turn, or (c) broadcast a question to a category for side-by-side panel perspectives. Each clone can belong to one or more categories.

Clones come from two sources: **built-in clones** that ship with the plugin under `${CLAUDE_PLUGIN_ROOT}/clones/` (read-only, curated presets), and **user clones** the user creates under `~/.openclone/clones/` (writable). User clones shadow built-ins on name collision.

## Single entry point — `/openclone`

As of v1.0, **all openclone actions go through one slash command**: `/openclone:openclone` (invoked as `/openclone` in most Claude Code UIs, or spelled out as `/openclone:openclone` in full). It is the only command in `commands/`.

| User intent | What to run |
| --- | --- |
| "Show me what's available", "openclone", no args | `/openclone:openclone` — renders the **home panel** (clones grouped by category, numbered for keyboard selection) |
| "Talk as douglas", "switch to alice" | `/openclone:openclone <name>` (activate clone) |
| Pick by number after seeing home panel | `/openclone:openclone <N>` |
| Stop / exit current clone or room | `/openclone:openclone stop` |
| "Make a new clone named hayun" | `/openclone:openclone new hayun` |
| "Add this URL to my clone's knowledge" | `/openclone:openclone ingest <url>` (requires an active clone) |
| "Open a group chat with X, Y, Z" | `/openclone:openclone room <X> <Y> <Z>` |
| "Add bob to the room" | `/openclone:openclone room add bob` |
| "Close the room" | `/openclone:openclone room leave` |
| "Ask all VCs …" | `/openclone:openclone panel vc "…"` |

If the user asks in natural language, **prefer running the equivalent `/openclone:openclone <sub>` invocation** so the user can see what is happening. Do not duplicate the dispatcher's parsing inline — let `commands/openclone.md` handle it.

## Do not use this skill when

- The user is already in a conversation with an active clone or inside a room. The `UserPromptSubmit` hook injects the persona on every user message automatically — do not re-invoke this skill for every turn.
- The user is doing unrelated coding or research work.

## Data layout

Each clone is one folder. Two roots are merged at read time:

```text
${CLAUDE_PLUGIN_ROOT}/clones/          # built-in, shipped with the plugin (read-only)
└── <name>/
    ├── persona.md                     # curated preset persona
    └── knowledge/
        └── YYYY-MM-DD-<topic>.md      # sparse-checked only when clone is used

~/.openclone/                          # user state (writable)
├── active-clone                       # current active clone name (absent = none)
├── room                               # room members, one name per line (absent = no room)
├── menu-context                       # JSON: most recent home-panel number → name mapping
└── clones/
    └── <name>/
        ├── persona.md                 # user-created persona — see references/clone-schema.md
        └── knowledge/
            └── YYYY-MM-DD-<topic>.md  # written by ingest; append-only
```

**Precedence.**

- **Persona**: on name collision, user clones shadow built-ins.
- **Knowledge**: additive — the hook reads from both the user and built-in knowledge dirs for the active clone/room members, with newer dates weighted more heavily. On exact filename collision the user-ingested file wins.

**Mode precedence (hook side):**

1. If `~/.openclone/room` exists and is non-empty → **room mode**: hook injects all members' personas + routing rules, one clone (max two) responds per turn.
2. Else if `~/.openclone/active-clone` exists → **single-clone mode**: that clone answers every turn.
3. Else → default Claude, no injection.

A clone's `categories` frontmatter list decides which category panels it participates in when the user runs `/openclone:openclone panel <category> "…"`.

Categories are a fixed v1 list: `vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`. See `references/categories.md`.

### Knowledge filenames

Every file under `knowledge/` is `YYYY-MM-DD-<topic-slug>.md` with frontmatter capturing the source. Ingestion is append-only — re-ingesting the same topic creates a new dated file, never overwrites. The hook prefers newer entries while still using older ones as valid background.

## Built-in clones are read-only

Users cannot edit files under `${CLAUDE_PLUGIN_ROOT}/`. To customize a built-in:

1. `/openclone:openclone ingest` on a built-in active clone auto-forks (copies the whole folder to `~/.openclone/clones/`) before ingestion.
2. For manual edits: `cp -R "${CLAUDE_PLUGIN_ROOT}/clones/<name>" ~/.openclone/clones/<name>` and edit `persona.md` there.

## How active-clone and room conversation work

A `UserPromptSubmit` hook (`hooks/inject-active-clone.sh`) fires on every user message and reads the state files above. See the **Mode precedence** table. The hook injects a `<openclone-active-clone>` block (single-clone mode) or `<openclone-room>` block (room mode) as additionalContext, with persona text + knowledge dir paths + recency-weighting guidance.

The hook is a no-op when neither `~/.openclone/active-clone` nor `~/.openclone/room` is set (or both are empty/invalid).

## Files in this skill

- `commands/openclone.md` — the single dispatcher command
- `references/clone-schema.md` — clone file format (frontmatter + sections, including multi-category rules)
- `references/categories.md` — fixed category list and per-category "always checks" axes
- `references/home-workflow.md` — how `/openclone:openclone` (no args) renders the home panel + writes menu-context
- `references/interview-workflow.md` — how `new` conducts and consolidates the interview
- `references/refine-workflow.md` — how `ingest` turns raw sources into refined topic files
- `references/panel-workflow.md` — how `panel <category>` produces multi-clone side-by-side output
- `references/room-workflow.md` — how room routing works (which clone speaks per turn)
- `assets/clone-template.md` — starter template for hand-authored clones

## Editing clones manually

A clone is a folder with a `persona.md` (plus optional `knowledge/`). Power users can:

- Copy `assets/clone-template.md` to `~/.openclone/clones/<name>/persona.md` and fill it in.
- Edit any existing **user** clone directly — add a category to the `categories` list to make it show up in a panel.
- Drop hand-authored knowledge files into `~/.openclone/clones/<name>/knowledge/` using `YYYY-MM-DD-<topic>.md`.
- Version-control `~/.openclone/clones/` in a dotfiles repo.
- Customize a **built-in** by copying its folder to `~/.openclone/clones/` first.

The hook only requires that `persona.md` exists in either root and parses.
