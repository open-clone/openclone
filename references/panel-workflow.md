# Category panel workflow

How `/openclone panel <category> "<question>"` broadcasts a question to every clone that belongs to that category (via its `categories` frontmatter list) and returns side-by-side perspectives.

## Inputs

- `<category>` — one of the fixed categories (already pinned by the command file that loaded this reference)
- `<question>` — the user's free-form question, passed as `$ARGUMENTS`

## Steps

1. **Validate.** If `$ARGUMENTS` is empty, tell the user the usage is `/openclone panel <category> "질문"` and stop.

2. **Locate clones.** Each clone is a folder containing a `persona.md`. Collect clone folders from BOTH:
   - `~/.openclone/clones/<name>/persona.md` (user clones)
   - `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` (built-in clones shipped with the skill)

   If the same `<name>` folder exists in both roots, the user clone wins and the built-in is skipped.

   Parse each `persona.md` frontmatter and **select only those whose `categories` list contains `<category>`**. If the resulting set is empty, tell the user:
   > No clones in category `<category>` yet. Create one with `/openclone new <name>` and include `<category>`.
   Stop.

3. **Load clone bodies.** For each selected clone, extract from `persona.md` frontmatter: `name`, `display_name`, `tagline`, `voice_traits`, `categories`. Keep the full body in memory.

4. **Generate perspectives.** For each clone, produce a response to `<question>` written AS that clone:
   - Stay in the clone's universal Persona, Speaking style, and Guidelines.
   - If the clone has a `## Category-specific framing` section with a `### As a <category>` block matching the current category, **apply that block's emphasis and extra guardrails** in addition to the universal ones.
   - Apply the "Always checks" axes from `categories.md` for this category — the clone should touch at least 2–3 of them when relevant, without robotically listing them all.
   - Keep each perspective to 3–8 sentences. Concise is better than comprehensive.
   - If the clone has knowledge files under EITHER `~/.openclone/clones/<name>/knowledge/` (user) OR `${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/` (built-in — note: lazy-fetched, so may not exist if the clone was never activated via `/openclone <name>`) that match the topic of the question, skim them and let the content inform the response. Knowledge files are named `YYYY-MM-DD-<topic>.md` — weight newer dates more heavily when several entries touch the same subject; older entries remain valid background. When both locations contain files on the same topic, prefer the user-ingested version. Do not dump or quote.

5. **Format output.**

   Render in the language of the question (Korean or English) using this shape:

   ```markdown
   # <category> 패널

   > <question>

   **참여:** <display_name_1>, <display_name_2>, …

   ---

   ## <display_name_1> — _<tagline_1>_

   <perspective 1>

   ---

   ## <display_name_2> _(현재 활성)_ — _<tagline_2>_

   <perspective 2>

   …

   ---

   ## 공통점 / 갈리는 지점

   **합의:**
   - 2–4 bullets where the clones agreed

   **갈라지는 지점:**
   - 2–4 bullets where they disagreed, with who took which side
   ```

   **Active-clone badge.** Read `~/.openclone/active-clone` (a single line with a clone `name`). If that file exists and its name matches one of the clones selected for this panel, append `_(현재 활성)_` (Korean) or `_(currently active)_` (English) between that clone's `display_name` and the em-dash in its section header, and also mark the same name in the `참여:` / `Panelists:` roster line (e.g. `권도균 (현재 활성), …`). If the file is missing, empty, or its name is not in the panel's clone set, render no badge anywhere. The active-clone file must not influence anything else — perspective content stays fully independent.

   **Language adaptation.** All fixed labels match the question language:

   | Element | Korean | English |
   | --- | --- | --- |
   | H1 | `# <category> 패널` | `# <category> panel` |
   | Roster line | `**참여:** …` | `**Panelists:** …` |
   | Summary H2 | `## 공통점 / 갈리는 지점` | `## Shared / Split` |
   | Agreement label | `**합의:**` | `**Shared:**` |
   | Divergence label | `**갈라지는 지점:**` | `**Split:**` |
   | Badge | `_(현재 활성)_` | `_(currently active)_` |

   If only one clone belongs to the category, skip the summary section (heading + both bullet blocks) and the `---` immediately before it.

## Rules

- Do not weight or alter perspective content based on `~/.openclone/active-clone` — panels are an explicit one-shot override and every clone in the category gets an equal seat. The only permitted use of that file is to render the "(현재 활성)" / "(currently active)" badge described in step 5. After the command finishes, the active clone (if any) resumes from the next user message.
- Match the language of the question. If the user asked in Korean, every header, label, badge, and clone perspective is in Korean; if English, all of them are English.
- Do not invent clones. Only use clones that actually have files on disk and include the category in their frontmatter list.
- Do not flatten differences to avoid disagreement — if two clones genuinely disagree, let them.
- A clone that belongs to multiple categories may appear in multiple panels; in each panel the corresponding `### As a <category>` framing is applied.
- No emojis.
