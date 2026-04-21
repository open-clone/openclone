---
description: Add knowledge to the active openclone clone from a URL, YouTube link, file path, or pasted text
argument-hint: <url | file-path | "text…">
allowed-tools: Read, Write, Bash, WebFetch
---

Ingest knowledge from `$1` and attach it to the currently active openclone clone.

Knowledge storage is a flat, append-only directory under the clone's folder:

```
~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-<topic>.md
```

Each ingestion produces one or more dated, topic-named files. Earlier files are never overwritten — if the user re-ingests material on an existing topic, a fresh file is added with today's date. The hook reads the whole directory and weights recency when answering.

## Preflight

1. Read `~/.openclone/active-clone`. If it does not exist or is empty, tell the user:
   > No active clone. Run `/openclone:use <name>` first, then `/openclone:ingest` again.
   Stop.

2. Read the clone name from the active-clone file. Determine origin by looking up the persona file in this order:
   - `~/.openclone/clones/<name>/persona.md` → origin is **user**; proceed normally.
   - `${CLAUDE_PLUGIN_ROOT}/clones/<name>/persona.md` → origin is **built-in**; follow the fork-on-write step below before continuing.
   - Neither exists: tell the user the active clone is missing and suggest `/openclone:list`. Stop.

   **Fork-on-write for built-in clones.** Built-in clones are read-only. To ingest, copy the full clone folder to the user namespace first:

   ```bash
   mkdir -p "$HOME/.openclone/clones"
   cp -R "${CLAUDE_PLUGIN_ROOT}/clones/<name>" "$HOME/.openclone/clones/<name>"
   ```

   Tell the user in one line:
   > Forked built-in clone **<name>** to `~/.openclone/clones/<name>/` (your copy now shadows the built-in). Proceeding with ingestion.

3. If `$1` is empty, ask the user for a source (URL, file path, YouTube link, or pasted text).

## Detect source type

- Starts with `https://www.youtube.com/` or `https://youtu.be/`: **YouTube**
- Starts with `http://` or `https://`: **URL**
- Exists as a file on disk (`.md|.txt|.pdf|.docx`): **file**
- Anything else: treat as **raw text**

## Fetch raw content

Fetch into an in-memory buffer (do not save the raw form to disk — the refined, first-person topic files below are the only artifacts kept):

- **URL**: Use WebFetch with a prompt that asks for the main article content as markdown (title + body, no nav/ads). If WebFetch is unavailable or fails, fall back to `${CLAUDE_PLUGIN_ROOT}/scripts/fetch-url.sh <url>` which prints markdown to stdout.
- **YouTube**: Run `${CLAUDE_PLUGIN_ROOT}/scripts/fetch-youtube.sh <url>` which prints a transcript as markdown.
- **file**: Read the file contents. For `.pdf`, use the Read tool (it handles PDFs). For `.docx`, attempt `bash` with `pandoc` if available; if not, tell the user to convert to `.md` or `.txt` first.
- **raw text**: the argument itself is the material.

## Refine

Ensure the target directory exists:
```bash
mkdir -p "$HOME/.openclone/clones/<name>/knowledge"
```

Load `${CLAUDE_PLUGIN_ROOT}/references/refine-workflow.md` and follow it exactly to produce one or more dated topic files at `~/.openclone/clones/<name>/knowledge/`. Each file is written in first person as the clone, with frontmatter capturing the source metadata (so we can trace origin without polluting the filename).

## Report

One or two lines, e.g.:
> Added to **{display_name}** at `~/.openclone/clones/{name}/knowledge/`. Topics: `2026-04-21-투자철학`, `2026-04-21-시장분석`. (`/openclone:list` to see knowledge count.)

Do not roleplay as the clone during ingestion — this is a system workflow.
