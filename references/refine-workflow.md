# Refine workflow

How Claude turns ingested material (scraped URL, YouTube transcript, pasted text, document) into dated topic files under the clone's `knowledge/` directory.

Loaded by `/openclone ingest` and called by `/openclone new` (Stage 0) and `/openclone update` after they harvest raw material.

## Preflight — Chrome MCP required (ingest only)

When this workflow is loaded by `/openclone ingest` directly — i.e. the user named a single URL/path/text to refine — require `claude-in-chrome` MCP to be connected. `new`/`update` do their own preflight before harvesting, so when they call into this workflow the gate has already passed.

1. Verify `claude-in-chrome` tool schemas are loaded; load them if not:
   ```text
   ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text
   ```
2. If the result does NOT contain these schemas, abort with:
   > `/openclone ingest`는 Chrome MCP가 필요해요. LinkedIn·Threads·X 같은 소스를 제대로 가져오려면 claude-in-chrome extension이 연결돼 있어야 해요. extension을 켠 뒤 다시 시도해 주세요. (로컬 파일이나 직접 붙여넣은 텍스트만 처리하고 싶더라도 gate는 유지 — 소스 타입을 일관되게 다루기 위함.)
3. Don't propose `curl` / WebFetch workarounds. For a pure one-off hand-authored knowledge entry, tell the user to drop a file at `~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-<topic>.md` directly.

## Target path

```text
~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-<topic-slug>.md
```

- `YYYY-MM-DD` is the source's **publication date** when it is known (a post timestamp, article publish date, video upload date). When no publish date is available (pasted text, generic URL dump, live interview), fall back to **today** (the ingestion date). The `fetched` frontmatter field is always today regardless.
- `<topic-slug>` is a lowercase noun-phrase slug, hyphen-separated; Korean or Latin.
- **Append-only.** Never overwrite or merge into an existing file. If the resolved `YYYY-MM-DD` already has a file with the same `<topic-slug>` (rare — multiple sources same date same topic), append `-2`, `-3`, etc. to disambiguate.

## Goal

Given raw material for a clone, produce one or more refined topic files such that:

- Each file covers **one topic or theme** the clone might be asked about.
- Each file is self-contained enough to be read in isolation and still make sense.
- Content is organized by meaning, not by source structure (no "Chapter 3: …" sections).

## Steps

1. **Read the raw material.** If longer than ~6000 characters, read in chunks.

2. **Identify topics.** Pull out 2–8 distinct themes depending on length. A topic should be a noun phrase like "seed-stage deal evaluation" or "coding style on error handling", not a verb phrase or question.

3. **For each topic, produce a dated file:**

   Path: `~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-<topic-slug>.md`

   Format:

   ```markdown
   ---
   topic: <short noun phrase, human-readable>
   source_type: url | youtube | file | text | interview | social
   source_url: <URL, if applicable>
   source_path: <path, if applicable>
   fetched: YYYY-MM-DD           # today, when ingestion happened
   published_at: YYYY-MM-DD      # optional; source's own publish date if known — used by /openclone update to decide newness
   ---

   <1–3 paragraphs of condensed content in the clone's voice, written in FIRST PERSON as the clone>

   <optional: key bullet points, concrete examples, numbers>
   ```

4. **Never merge with older files on the same topic.** If a file from an earlier date already covers `<topic-slug>`, leave it untouched and create a fresh file dated today. The hook's recency-weighting logic tells Claude to prefer newer entries while still treating older ones as valid background. This preserves the evolution of the clone's views over time.

## Rules

- **First person voice, as the clone.** "I evaluate deals by…" not "Hayun evaluates deals by…" or "The blog post says…".
- **Preserve facts.** Names, numbers, dates, specific examples — keep them. Refinement means compression, not hallucination-tolerant paraphrase.
- **No meta references.** Do not mention "source", "URL", "the article", "the transcript", "the user uploaded", etc. The refined content should read as if the clone is speaking from memory. (Source metadata lives in frontmatter, not prose.)
- **Match language.** If the raw source is Korean, write refined files in Korean. If mixed, prefer the language the clone uses elsewhere (check the clone's `persona.md`).
- **No emojis.**
- **Skip noise.** Ads, boilerplate, UI chrome, timestamps from transcripts — drop them.

## When to skip refinement

If the raw source is already short (<1000 chars) and single-topic, skip step 2 and just produce one file covering it.

If the raw source is clearly off-topic relative to the clone's categories and persona, do **not** write a knowledge file. Tell the user in chat that the content doesn't match the clone's scope and ingestion was skipped. Do not auto-fabricate relevance.

## Why no "knowledge index" in persona.md

In the folder-per-clone layout, the `knowledge/` directory is itself the index — the home panel counts files, and Claude enumerates the directory at read time. Do **not** write a `## Knowledge index` section into `persona.md`; it would go stale immediately given append-only semantics.
