---
name: openclone
description: Use when the user wants to create, manage, or talk to an openclone "clone" — a named AI persona with one or more categories (vc, dev, founder, pm, designer, writer, marketing, hr) and attached knowledge. Triggers on phrases like "create a clone", "make a persona", "talk as <name>", "switch to <name>", "feed knowledge to", "ingest url for <clone>", "ask all VCs", "stop being <name>". Also triggers when the user refers to `/openclone:*` commands or wants to understand the openclone system.
---

# openclone

Openclone lets a user create AI persona "clones" — each a folder containing a `persona.md` and optional knowledge — and either (a) activate one so that every subsequent message is answered in that persona, or (b) broadcast a question to a category for side-by-side perspectives. Each clone can belong to one or more categories. Clones come from two sources: **built-in clones** that ship with the plugin under `${CLAUDE_PLUGIN_ROOT}/clones/` (read-only, curated presets), and **user clones** the user creates under `~/.openclone/clones/` (writable). User clones shadow built-ins on name collision.

## When to use this skill

- User asks to create, list, activate, deactivate, or delete a clone.
- User asks to feed knowledge (URL, YouTube, file, text) to a clone.
- User runs any `/openclone:*` slash command or references one by name.
- User asks "what is openclone" or how the persona system works.
- User wants a multi-perspective panel answer from a category (e.g. "ask all the VCs").

## Do not use this skill when

- The user is having a normal conversation with an already-active clone. The `UserPromptSubmit` hook handles persona injection automatically — do not re-invoke this skill for every turn.
- The user is doing unrelated coding or research work.

## Primary entry points

Direct slash commands are the main interface:

| Command | Purpose |
| --- | --- |
| `/openclone:new <name>` | Create a clone via interactive interview (≥1 category required, multi-category allowed). See `references/interview-workflow.md`. |
| `/openclone:use <name>` | Activate a clone — subsequent messages answered as this clone, using its `primary_category` framing. |
| `/openclone:stop` | Deactivate the active clone. |
| `/openclone:list` | List clones with their categories, marking active. |
| `/openclone:ingest <source>` | Add knowledge to the active clone. See `references/refine-workflow.md`. |
| `/openclone:<category> "<q>"` | Panel: every clone whose `categories` includes `<category>` answers `<q>`, with that category's framing applied. See `references/panel-workflow.md`. |

If the user asks for one of these in natural language, offer to run the corresponding command but prefer explicit command invocation so the user sees what's happening.

## Data layout

Each clone is one folder. Two roots are merged at read time:

```text
${CLAUDE_PLUGIN_ROOT}/clones/          # built-in, shipped with the plugin (read-only)
└── <name>/
    ├── persona.md                     # curated preset persona
    └── knowledge/
        └── YYYY-MM-DD-<topic>.md

~/.openclone/                          # user state (writable)
├── active-clone                       # current active clone name (absent = none)
└── clones/
    └── <name>/
        ├── persona.md                 # user-created persona — see references/clone-schema.md
        └── knowledge/
            └── YYYY-MM-DD-<topic>.md  # written by /openclone:ingest; append-only
```

**Precedence.** On name collision, user clones shadow built-in clones: `/openclone:use`, `/openclone:list`, and category panels all use the user version and skip the built-in duplicate. Knowledge is additive — the hook tells Claude to read from both clones' `knowledge/` directories when relevant, with newer dates weighted more heavily; on exact filename collision the user-ingested file wins.

A clone's `categories` is a frontmatter list field on `persona.md`, so one clone can appear in multiple category panels from a single folder.

Categories are a fixed v1 list: `vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`. See `references/categories.md` for the lens each one enforces.

### Knowledge filenames

Every file under `knowledge/` is `YYYY-MM-DD-<topic-slug>.md` with frontmatter capturing the source (`source_type`, `source_url`, `fetched`, etc.). Ingestion is append-only — re-ingesting on the same topic later creates a new dated file, it does not overwrite. The hook instructs Claude to prefer newer entries when the same subject appears in multiple files, while still using older entries as valid background.

## Built-in clones are read-only

Users cannot edit files under `${CLAUDE_PLUGIN_ROOT}/` — those ship with the plugin and get overwritten on update. To customize a built-in clone:

1. `/openclone:ingest` on a built-in active clone auto-forks (copies the whole clone folder to `~/.openclone/clones/`) before ingestion.
2. For manual edits, `cp -R "${CLAUDE_PLUGIN_ROOT}/clones/<name>" ~/.openclone/clones/<name>` and edit `persona.md` there; the user copy will override from the next activation.

## How "active clone conversation" works

A `UserPromptSubmit` hook (`hooks/inject-active-clone.sh`) reads `~/.openclone/active-clone` (contains just a clone `<name>`) on every user message. If set, it resolves the clone's `persona.md` (user first, then built-in) and injects its content as additional system context, instructing Claude to respond as that clone. When the clone has a `## Category-specific framing` section, the block matching `primary_category` (or the first entry in `categories`) is applied as the default lens.

The hook also tells Claude where to find the clone's knowledge files (both the user and built-in `knowledge/` dirs for that clone) and how to weight recency.

The hook is no-op when:

- The active-clone file does not exist
- It is empty
- It points to a non-existent clone folder in both roots

## Files in this skill

- `references/clone-schema.md` — clone file format (frontmatter + sections, including multi-category rules)
- `references/categories.md` — fixed category list and per-category "always checks" axes
- `references/interview-workflow.md` — how `/openclone:new` conducts and consolidates the interview
- `references/refine-workflow.md` — how `/openclone:ingest` turns raw sources into refined topic files
- `references/panel-workflow.md` — how `/openclone:<category>` produces multi-clone panel output
- `assets/clone-template.md` — starter template for hand-authored clones (bypassing `/openclone:new`)

## Editing clones manually

A clone is a folder with a `persona.md` (plus optional `knowledge/`). Power users can:

- Copy `assets/clone-template.md` to `~/.openclone/clones/<name>/persona.md` and fill it in (create the folder first: `mkdir -p ~/.openclone/clones/<name>/knowledge`).
- Edit any existing **user** clone directly in their editor — add a category to the `categories` list to make the clone appear in that panel.
- Drop hand-authored knowledge files into `~/.openclone/clones/<name>/knowledge/` using the `YYYY-MM-DD-<topic>.md` convention; they'll be picked up automatically.
- Version-control `~/.openclone/clones/` in their own dotfiles repo.
- Customize a **built-in** clone by copying its folder to `~/.openclone/clones/` first (the user copy shadows the built-in from the next activation).

The hook only requires that `persona.md` exists in either root and parses.
