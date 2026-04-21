---
name: openclone
description: Use when the user wants to create, manage, or talk to an openclone "clone" — a named AI persona with one or more categories (vc, dev, founder, pm, designer, writer) and attached knowledge. Triggers on phrases like "create a clone", "make a persona", "talk as <name>", "switch to <name>", "feed knowledge to", "ingest url for <clone>", "ask all VCs", "stop being <name>". Also triggers when the user refers to `/oc-*` commands or wants to understand the openclone system.
---

# openclone

Openclone lets a user create AI persona "clones" — each a single markdown file describing one person — and either (a) activate one so that every subsequent message is answered in that persona, or (b) broadcast a question to a category for side-by-side perspectives. Each clone can belong to one or more categories. Everything lives on the user's filesystem under `~/.openclone/`.

## When to use this skill

- User asks to create, list, activate, deactivate, or delete a clone.
- User asks to feed knowledge (URL, YouTube, file, text) to a clone.
- User runs any `/oc-*` slash command or references one by name.
- User asks "what is openclone" or how the persona system works.
- User wants a multi-perspective panel answer from a category (e.g. "ask all the VCs").

## Do not use this skill when

- The user is having a normal conversation with an already-active clone. The `UserPromptSubmit` hook handles persona injection automatically — do not re-invoke this skill for every turn.
- The user is doing unrelated coding or research work.

## Primary entry points

Direct slash commands are the main interface:

| Command | Purpose |
|---|---|
| `/oc-new <name>` | Create a clone via interactive interview (≥1 category required, multi-category allowed). See `references/interview-workflow.md`. |
| `/oc-use <name>` | Activate a clone — subsequent messages answered as this clone, using its `primary_category` framing. |
| `/oc-stop` | Deactivate the active clone. |
| `/oc-list` | List clones with their categories, marking active. |
| `/oc-ingest <source>` | Add knowledge to the active clone. See `references/refine-workflow.md`. |
| `/oc-<category> "<q>"` | Panel: every clone whose `categories` includes `<category>` answers `<q>`, with that category's framing applied. See `references/panel-workflow.md`. |

If the user asks for one of these in natural language, offer to run the corresponding command but prefer explicit command invocation so the user sees what's happening.

## Data layout

All user state is under `~/.openclone/`:

```
~/.openclone/
├── active-clone                      # current active clone name (absent = none)
├── clones/
│   └── <name>.md                     # one file per clone — see references/clone-schema.md
└── knowledge/
    └── <name>/
        ├── sources/                  # raw ingested material
        └── refined/                  # topic-organized summaries
```

Storage is **flat** — no category subdirectories. A clone's `categories` is a frontmatter list field, so one clone can appear in multiple category panels from a single file.

Categories are a fixed v1 list: `vc`, `dev`, `founder`, `pm`, `designer`, `writer`. See `references/categories.md` for the lens each one enforces.

## How "active clone conversation" works

A `UserPromptSubmit` hook (`hooks/inject-active-clone.sh`) reads `~/.openclone/active-clone` (contains just a clone `<name>`) on every user message. If set, it injects the clone's markdown as additional system context, instructing Claude to respond as that clone. When the clone has a `## Category-specific framing` section, the block matching `primary_category` (or the first entry in `categories`) is applied as the default lens.

The hook is no-op when:
- The active-clone file does not exist
- It is empty
- It points to a non-existent clone

## Files in this skill

- `references/clone-schema.md` — clone file format (frontmatter + sections, including multi-category rules)
- `references/categories.md` — fixed category list and per-category "always checks" axes
- `references/interview-workflow.md` — how `/oc-new` conducts and consolidates the interview
- `references/refine-workflow.md` — how `/oc-ingest` turns raw sources into refined topic files
- `references/panel-workflow.md` — how `/oc-<category>` produces multi-clone panel output
- `assets/clone-template.md` — starter template for hand-authored clones (bypassing `/oc-new`)

## Editing clones manually

A clone is a plain markdown file. Power users can:

- Copy `assets/clone-template.md` to `~/.openclone/clones/<name>.md` and fill it in.
- Edit any existing clone directly in their editor — add a category to the `categories` list to make the clone appear in that panel.
- Version-control `~/.openclone/clones/` in their own dotfiles repo.

The hook only requires that the clone file exists and parses.
