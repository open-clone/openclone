# Category panel workflow

How a `/oc-<category>` command broadcasts a question to every clone that belongs to that category (via its `categories` frontmatter list) and returns side-by-side perspectives.

## Inputs

- `<category>` — one of the fixed categories (already pinned by the command file that loaded this reference)
- `<question>` — the user's free-form question, passed as `$ARGUMENTS`

## Steps

1. **Validate.** If `$ARGUMENTS` is empty, tell the user the usage is `/oc-<category> "질문"` and stop.

2. **Locate clones.** Read every `.md` file directly under `~/.openclone/clones/` (flat storage — no category subdirectories). Parse each file's frontmatter and **select only those whose `categories` list contains `<category>`**. If the resulting set is empty, tell the user:
   > No clones in category `<category>` yet. Create one with `/oc-new <name>` and include `<category>`.
   Stop.

3. **Load clone bodies.** For each selected clone, extract from frontmatter: `name`, `display_name`, `tagline`, `voice_traits`, `categories`. Keep the full body in memory.

4. **Generate perspectives.** For each clone, produce a response to `<question>` written AS that clone:
   - Stay in the clone's universal Persona, Speaking style, and Guidelines.
   - If the clone has a `## Category-specific framing` section with a `### As a <category>` block matching the current category, **apply that block's emphasis and extra guardrails** in addition to the universal ones.
   - Apply the "Always checks" axes from `categories.md` for this category — the clone should touch at least 2–3 of them when relevant, without robotically listing them all.
   - Keep each perspective to 3–8 sentences. Concise is better than comprehensive.
   - If the clone has refined knowledge files under `~/.openclone/knowledge/<name>/refined/` that match the topic of the question, skim them and let the content inform the response. Do not dump or quote.

5. **Format output.**

   ```markdown
   # Panel: <category> — <short restatement of the question>

   ## <display_name_1>
   _<tagline_1>_

   <perspective 1>

   ## <display_name_2>
   _<tagline_2>_

   <perspective 2>

   …

   ## 공통점 / 갈리는 지점

   **Shared:**
   - 2–4 bullets where the clones agreed

   **Split:**
   - 2–4 bullets where they disagreed, with who took which side
   ```

   If only one clone belongs to the category, skip the "공통점 / 갈리는 지점" section.

## Rules

- Do **not** consult `~/.openclone/active-clone` here — panels are an explicit one-shot override. After the command finishes, the active clone (if any) resumes from the next user message.
- Match the language of the question. If the user asked in Korean, every section header (except "Panel:") and clone perspective is in Korean.
- Do not invent clones. Only use clones that actually have files on disk and include the category in their frontmatter list.
- Do not flatten differences to avoid disagreement — if two clones genuinely disagree, let them.
- A clone that belongs to multiple categories may appear in multiple panels; in each panel the corresponding `### As a <category>` framing is applied.
- No emojis.
