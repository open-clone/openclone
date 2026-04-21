# openclone

Create AI clones with categorized personas and converse with them inside Claude Code.

## What it does

- **Use built-in clones out of the box** — the plugin ships with curated preset clones (e.g. `douglas` / 권도균) you can activate or panel-broadcast to immediately.
- **Create your own clones** with one or more categories (`vc`, `dev`, `founder`, `pm`, `designer`, `writer`). One clone = one file = one person; a single clone can belong to multiple categories.
- **Pick one to talk to** — after `/openclone:use <name>`, every message you send is answered in that clone's voice. No further commands needed.
- **Ask a whole category at once** — `/openclone:vc "질문"` broadcasts to every clone whose categories include `vc` (built-in + user) and returns each perspective side-by-side.
- **Feed them knowledge** — URLs, YouTube transcripts, documents; stored in `~/.openclone/` as plain markdown. When you ingest into a built-in clone, it's auto-forked into your user namespace first.

Everything lives on your filesystem. No servers, no accounts, no SaaS.

## Install

This repository is both the plugin **and** a self-hosted marketplace. In Claude Code:

```
/plugin marketplace add taurin-inc/openclone
/plugin install openclone
```

If the repo is private, make sure you've authenticated `gh` (`gh auth status`) so Claude Code can clone it.

For local development (no GitHub round-trip):

```
/plugin marketplace add /absolute/path/to/openclone
/plugin install openclone
```

After install, restart Claude Code once. The `/openclone:*` commands should autocomplete.

## Usage

```
/openclone:new hayun                    # create a clone; asks you to pick ≥1 category + runs interview
/openclone:use hayun                    # activate the clone — subsequent chat is with this clone
/openclone:stop                         # deactivate
/openclone:list                         # list all clones with their categories
/openclone:ingest https://blog/post     # add knowledge to the active clone
/openclone:vc "should I fundraise now?" # panel: every clone that includes vc in its categories
```

## Data layout

Each clone is a folder. Two roots are merged at read time:

```
<plugin-root>/clones/           # shipped with the plugin (read-only)
└── <name>/
    ├── persona.md              # built-in preset persona (e.g. douglas/persona.md)
    └── knowledge/
        └── YYYY-MM-DD-<topic>.md

~/.openclone/                   # your local state (writable)
├── active-clone                # current active clone name (absent = none)
└── clones/
    └── <name>/
        ├── persona.md          # your own persona
        └── knowledge/
            └── YYYY-MM-DD-<topic>.md   # append-only, written by /openclone:ingest
```

**Precedence.** On name collision, your user clone wins — it shadows the built-in in `/openclone:list`, `/openclone:use`, and panel commands. Knowledge is additive: the hook tells Claude to read both `knowledge/` dirs for the active clone and to weight newer dates more heavily when the same topic appears in multiple files.

A `persona.md` frontmatter includes `categories: [founder, vc]` (list). Optionally a `## Category-specific framing` section adds per-category emphasis. Plain markdown — copy, edit, version-control, share.

Knowledge files are dated and topic-named (`2026-04-21-투자철학.md`) with source metadata in frontmatter. Storage is append-only: ingesting on an existing topic later creates a new file, it does not overwrite — so the clone's evolving views are preserved.

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

- Each `/openclone:*` command is a plain markdown command file under `commands/`.
- A `UserPromptSubmit` hook (`hooks/inject-active-clone.sh`) reads `~/.openclone/active-clone` (just a clone name) on every message. If set, it resolves the clone file (user first, then built-in) and injects its persona as additional context so Claude responds as that clone, using the clone's `primary_category` framing as the default lens. If unset, it's a silent no-op.
- Panel commands (`/openclone:vc`, `/openclone:dev`, ...) ignore the active clone and broadcast the question to every clone — built-in and user — whose frontmatter `categories` list includes that category (user shadows built-in on name collision).
- Reference workflows for interview, refinement, and panels live in `references/` — Claude loads them on demand.
- Built-in clones ship under `clones/<name>/` at the repo root, each folder containing `persona.md` and `knowledge/`. When installed via the marketplace they end up under `${CLAUDE_PLUGIN_ROOT}/clones/`.

## Status

v0.1 — expect rough edges. Issues and PRs welcome.
