# Refine workflow

How Claude turns raw ingested material (scraped URL, YouTube transcript, pasted text, document) into topic-organized markdown under `~/.openclone/knowledge/<name>/refined/`.

Loaded by `/oc-ingest`.

## Goal

Given a raw source file at `~/.openclone/knowledge/<name>/sources/<id>.md`, produce one or more refined files at `~/.openclone/knowledge/<name>/refined/` such that:

- Each refined file covers **one topic or theme** the clone might be asked about.
- Each file is self-contained enough to be read in isolation and still make sense.
- Content is organized by meaning, not by source structure (no "Chapter 3: …" sections).

## Steps

1. **Read the raw source.** If longer than ~6000 characters, read in chunks.

2. **Identify topics.** Pull out 2–8 distinct themes depending on length. A topic should be a noun phrase like "seed-stage deal evaluation" or "coding style on error handling", not a verb phrase or question.

3. **For each topic, produce a refined file:**

   Path: `~/.openclone/knowledge/<name>/refined/<slug>.md`

   Format:
   ```markdown
   ---
   topic: <short noun phrase>
   sources: [<source-file-name>]
   updated: YYYY-MM-DD
   ---

   <1–3 paragraphs of condensed content in the clone's voice, written in FIRST PERSON as the clone>

   <optional: key bullet points, concrete examples, numbers>
   ```

4. **Merge, don't overwrite.** If a refined file with the same topic slug already exists:
   - Read existing content
   - Add the new information, reconciling contradictions by preferring the newer source if the user didn't mark the old one as canonical
   - Update `sources:` to include both source filenames
   - Update `updated:` to today

5. **Update the clone's knowledge index.** In the clone file at `~/.openclone/clones/<name>.md`, ensure there is a `## Knowledge index` section. Rewrite it as:
   ```markdown
   ## Knowledge index

   - sources/: <count> files
   - refined/:
     - <topic-slug-1> — <one-line topic summary>
     - <topic-slug-2> — <one-line topic summary>
   ```

## Rules

- **First person voice, as the clone.** "I evaluate deals by…" not "Hayun evaluates deals by…" or "The blog post says…".
- **Preserve facts.** Names, numbers, dates, specific examples — keep them. Refinement means compression, not hallucination-tolerant paraphrase.
- **No meta references.** Do not mention "source", "URL", "the article", "the transcript", "the user uploaded", etc. The refined content should read as if the clone is speaking from memory.
- **Match language.** If the raw source is Korean, write refined files in Korean. If mixed, prefer the language the clone uses elsewhere (check existing clone file).
- **No emojis.**
- **Skip noise.** Ads, boilerplate, UI chrome, timestamps from transcripts — drop them.

## When to skip refinement

If the raw source is already short (<1000 chars) and single-topic, skip steps 2–3 and just produce one refined file covering it.

If the raw source is clearly off-topic relative to the clone's categories and persona, save it to `sources/` but note in chat that refinement was skipped because the content doesn't match the clone's scope. Do not auto-fabricate relevance.
