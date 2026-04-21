# openclone

Create AI clones with categorized personas and converse with them inside Claude Code.

## What it does

- **Create clones** with one or more categories (`vc`, `dev`, `founder`, `pm`, `designer`, `writer`). One clone = one file = one person; a single clone can belong to multiple categories.
- **Pick one to talk to** — after `/oc-use <name>`, every message you send is answered in that clone's voice. No further commands needed.
- **Ask a whole category at once** — `/oc-vc "질문"` broadcasts to every clone whose categories include `vc` and returns each perspective side-by-side.
- **Feed them knowledge** — URLs, YouTube transcripts, documents; stored in `~/.openclone/` as plain markdown.

Everything lives on your filesystem. No servers, no accounts, no SaaS.

## Install

This repository is both the plugin **and** a self-hosted marketplace. In Claude Code:

```
/plugin marketplace add taurin-inc/openclone
/plugin install openclone@openclone
```

If the repo is private, make sure you've authenticated `gh` (`gh auth status`) so Claude Code can clone it.

For local development (no GitHub round-trip):

```
/plugin marketplace add /absolute/path/to/openclone
/plugin install openclone@openclone
```

After install, restart Claude Code once. The `/oc-*` commands should autocomplete.

## Usage

```
/oc-new hayun                    # create a clone; asks you to pick ≥1 category + runs interview
/oc-use hayun                    # activate the clone — subsequent chat is with this clone
/oc-stop                         # deactivate
/oc-list                         # list all clones with their categories
/oc-ingest https://blog/post     # add knowledge to the active clone
/oc-vc "should I fundraise now?" # panel: every clone that includes vc in its categories
```

## Data layout

```
~/.openclone/
├── active-clone                # current active clone name (absent = none)
├── clones/
│   └── <name>.md               # flat — one file per clone
└── knowledge/
    └── <name>/
        ├── sources/            # raw ingested material
        └── refined/            # topic-organized summaries
```

A clone file's frontmatter includes `categories: [founder, vc]` (list). Optionally a `## Category-specific framing` section adds per-category emphasis. Plain markdown — copy, edit, version-control, share.

## Categories (v1 fixed list)

| code | lens |
|---|---|
| `vc` | investor — market, team, traction, exit, risk |
| `dev` | engineer — design, performance, maintainability, security |
| `founder` | founder — business model, team, execution, funding |
| `pm` | product — users, KPIs, priorities, roadmap |
| `designer` | designer — UX, visual, brand, prototype |
| `writer` | writer/editor — structure, clarity, audience, tone |

## How it works

- Each `/oc-*` command is a plain markdown command file under `commands/`.
- A `UserPromptSubmit` hook (`hooks/inject-active-clone.sh`) reads `~/.openclone/active-clone` (just a clone name) on every message. If set, it injects the clone's persona as additional context so Claude responds as that clone, using the clone's `primary_category` framing (from its `## Category-specific framing` block) as the default lens. If unset, it's a silent no-op.
- Panel commands (`/oc-vc`, `/oc-dev`, ...) ignore the active clone and broadcast the question to every clone whose frontmatter `categories` list includes that category.
- Reference workflows for interview, refinement, and panels live in `references/` — Claude loads them on demand.

## Status

v0.1 — expect rough edges. Issues and PRs welcome.
