---
description: Add knowledge to the active openclone clone from a URL, YouTube link, file path, or pasted text
argument-hint: <url | file-path | "text…">
allowed-tools: Read, Write, Bash, WebFetch
---

Ingest knowledge from `$1` and attach it to the currently active openclone clone.

## Preflight

1. Read `~/.openclone/active-clone`. If it does not exist or is empty, tell the user:
   > No active clone. Run `/oc-use <name>` first, then `/oc-ingest` again.
   Stop.

2. Read the clone name from the active-clone file. Confirm the clone markdown exists at `~/.openclone/clones/<name>.md`.

3. If `$1` is empty, ask the user for a source (URL, file path, YouTube link, or pasted text).

## Detect source type

- Starts with `https://www.youtube.com/` or `https://youtu.be/`: **YouTube**
- Starts with `http://` or `https://`: **URL**
- Exists as a file on disk (`.md|.txt|.pdf|.docx`): **file**
- Anything else: treat as **raw text**

## Fetch/copy into sources/

Ensure directory exists:
```bash
mkdir -p "$HOME/.openclone/knowledge/<name>/sources"
mkdir -p "$HOME/.openclone/knowledge/<name>/refined"
```

Then:

- **URL**: Use WebFetch with a prompt that asks for the main article content as markdown (title + body, no nav/ads). If WebFetch is unavailable or fails, fall back to `${CLAUDE_PLUGIN_ROOT}/scripts/fetch-url.sh <url>` which prints markdown to stdout. Save to `sources/url-<YYYY-MM-DD-HHMM>-<slug>.md` with frontmatter: `source_type: url`, `source_url`, `fetched`.

- **YouTube**: Run `${CLAUDE_PLUGIN_ROOT}/scripts/fetch-youtube.sh <url>` which prints a transcript as markdown. Save to `sources/youtube-<YYYY-MM-DD-HHMM>-<slug>.md` with frontmatter: `source_type: youtube`, `source_url`, `fetched`.

- **file**: Read the file contents. For `.pdf`, use the Read tool (it handles PDFs). For `.docx`, attempt `bash` with `pandoc` if available; if not, tell the user to convert to `.md` or `.txt` first. Save to `sources/file-<YYYY-MM-DD-HHMM>-<orig-basename>.md` with frontmatter: `source_type: file`, `source_path`, `fetched`.

- **raw text**: Save to `sources/note-<YYYY-MM-DD-HHMM>.md` with frontmatter: `source_type: text`, `fetched`.

## Refine

Load `${CLAUDE_PLUGIN_ROOT}/references/refine-workflow.md` and follow it exactly to produce (or merge into) files under `refined/` and update the clone's `## Knowledge index` section.

## Report

One or two lines, e.g.:
> Added **{source_type}** source to **{display_name}**. Refined into topics: `topic-a`, `topic-b`. (`/oc-list` to review.)

Do not roleplay as the clone during ingestion — this is a system workflow.
