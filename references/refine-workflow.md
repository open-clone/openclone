# Refine workflow

How Claude turns ingested material (scraped URL, YouTube transcript, pasted text, document) into dated topic files under the clone's `knowledge/` directory.

Loaded by `/openclone:ingest`.

## Target path

```
~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-<topic-slug>.md
```

- `YYYY-MM-DD` is today (the ingestion date).
- `<topic-slug>` is a lowercase noun-phrase slug, hyphen-separated; Korean or Latin.
- **Append-only.** Never overwrite or merge into an existing file. If today already has a file with the same `<topic-slug>` (rare — only when multiple sources are ingested the same day on the same topic), append `-2`, `-3`, etc. to disambiguate.

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
   source_type: url | youtube | file | text | interview
   source_url: <URL, if applicable>
   source_path: <path, if applicable>
   fetched: YYYY-MM-DD
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

In the folder-per-clone layout, the `knowledge/` directory is itself the index — `/openclone:list` counts files, and Claude enumerates the directory at read time. Do **not** write a `## Knowledge index` section into `persona.md`; it would go stale immediately given append-only semantics.
