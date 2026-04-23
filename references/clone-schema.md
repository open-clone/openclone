# Clone schema

Every clone has a `persona.md` and an optional knowledge directory. **One clone = one name = one person.** A clone can belong to multiple categories.

## Layout

Built-in and user clones share the **same folder shape** — persona and knowledge live together under `clones/<name>/`. Only the root differs:

```text
${CLAUDE_SKILL_DIR}/clones/<name>/       # built-in, read-only
├── persona.md                             # always present after install
└── knowledge/                             # sparse-excluded by default; fetched on first /openclone <name>
    └── YYYY-MM-DD-<topic>.md

~/.openclone/clones/<name>/                # user, writable
├── persona.md
└── knowledge/
    └── YYYY-MM-DD-<topic>.md
```

The built-in side uses non-cone sparse-checkout to exclude every `clones/*/knowledge/` subdir by default; `scripts/fetch-clone-knowledge.sh <slug>` adds the specific path on first activation.

Persona lookup order (user wins on collision):

```text
~/.openclone/clones/<name>/persona.md              # user
${CLAUDE_SKILL_DIR}/clones/<name>/persona.md     # built-in
```

Knowledge lookup is additive — both directories are read when present:

```text
~/.openclone/clones/<name>/knowledge/              # user
${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/     # built-in (lazy-fetched)
```

- `<name>` is a lowercase slug, `[a-z0-9-]+`, globally unique within each root.
- If the same `<name>` exists in both roots, the user persona wins and user knowledge layers on top of built-in knowledge (both are read).
- To customize a built-in clone, copy the folder to `~/.openclone/clones/<name>/` and edit there. `/openclone ingest` does this automatically (fork-on-write) when the active clone is built-in.

## `persona.md` frontmatter (required)

```yaml
---
name: douglas                    # slug, matches folder name
display_name: 권도균              # name shown in lists and panels
tagline: 프라이머 대표             # one-line intro (<80 chars)
categories: [founder, vc]        # one or more from the fixed list
primary_category: founder        # default lens when activated via /openclone <name> (optional, falls back to categories[0])
created: 2026-04-21              # ISO date
voice_traits:                    # 3–5 short tone tags
  - concise
  - evidence-first
---
```

### `categories` rules

- Must be a non-empty list.
- Each value must be one of the fixed categories in `categories.md` (`vc`, `tech`, `founder`, `expert`, `influencer`, `politician`, `celebrity`).
- A clone in N categories appears in N panels (`/openclone panel <cat> "…"`) but is **still one folder**.

### `primary_category`

- Optional. When the clone is activated via `/openclone <name>`, this lens is applied as emphasis.
- If omitted, the first entry in `categories` is used.

## `persona.md` body sections (required in this order)

```markdown
## Persona

Narrative paragraph (3–8 sentences): who they are, what they care about,
what shapes their thinking. This is the shared core across all categories.

## Speaking style

- Bullet list of concrete tone rules
- These apply in every category context.

## Guidelines

**Always:**
- universal principles this clone follows in any context

**Never:**
- universal things to avoid in any context

## Background

- Short bullets of relevant experience, positions, viewpoints.
```

## Optional: category-specific framing

When the clone has genuinely different guardrails or emphasis across its categories, add a `## Category-specific framing` section:

```markdown
## Category-specific framing

### As a founder
- Emphasis: mentor/teacher role, empathy with early-stage founders
- Extra always: surface lessons from own operating history
- Extra never: dismiss founder concerns as naive without explanation

### As a vc
- Emphasis: investment criteria (market/team/traction), unit economics
- Extra always: name the riskiest assumption first
- Extra never: quote specific portfolio financials or equity splits
```

Panel queries (`/openclone panel <category> "…"`) read the matching `### As a <category>` block and apply it on top of the universal Persona/Speaking style/Guidelines. Single-clone activation (`/openclone <name>`) applies the primary category's block (if any).

If a clone has only one category, this section is unnecessary.

## Optional: Links, Greeting, Sample questions

```markdown
## Links
- [label](url)

## Greeting
> opening message the clone uses to introduce itself

## Sample questions
- common question 1
- common question 2
```

## Knowledge directory

Flat, append-only, dated topic files — the directory always sits at `clones/<name>/knowledge/` relative to whichever root (built-in or user):

```text
clones/<name>/knowledge/
├── 2026-04-21-투자철학.md
├── 2026-04-21-시장분석.md
└── 2026-05-10-투자철학.md
```

### Filename

`YYYY-MM-DD-<topic-slug>.md`

- `YYYY-MM-DD` is the source's **publication date** when known (a post timestamp, article publish date, video upload date). Falls back to the ingestion date for pasted text, live interviews, or sources without a publish date.
- `<topic-slug>` is a short noun-phrase slug; lowercase, hyphens, Korean/Latin allowed.
- Same topic from different dates produces **separate** files — content is never merged or overwritten. The hook instructs Claude to weight newer files more heavily while still treating older entries as valid background. `/openclone update` uses the most recent filename/`published_at` date as its cutoff when deciding what new material to harvest.

### Frontmatter

```yaml
---
topic: 투자철학                      # short noun phrase
source_type: url                     # url | youtube | file | text | interview | social
source_url: https://...              # if applicable
source_path: /path/to/file.pdf       # if applicable
fetched: 2026-04-21                  # ingestion date (always today)
published_at: 2026-04-20             # optional; source's own publish date — used by /openclone update
---
```

### Body

1–3 paragraphs of condensed content in first person **as the clone** — "I evaluate deals by…" not "Douglas evaluates…" or "The blog post says…". Optional key bullets or concrete examples follow.

See `refine-workflow.md` for the full ingestion/refinement rules.

## Injection format (what the hook sends)

The `UserPromptSubmit` hook emits additional context wrapped in an `<openclone-active-clone>` tag containing:

1. A short instruction sentence telling Claude to embody this clone for the next response, with origin (`user` or `built-in`).
2. The full `persona.md` content (frontmatter + all sections), resolved with user-over-built-in precedence.
3. Both candidate knowledge directories for the active clone, with recency-weighting guidance so Claude prefers newer files when the same topic appears multiple times.

## Example

```markdown
---
name: hayun
display_name: Hayun Kim
tagline: Seed-stage investor, AI infra
categories: [vc, founder]
primary_category: vc
created: 2026-04-21
voice_traits: [concise, contrarian, data-first]
---

## Persona

Former infra engineer turned seed investor. Reads every pitch for the
bottleneck first — if the team hasn't named theirs, they haven't thought
hard enough.

## Speaking style

- Two sentences, then a pointed question
- Never uses "interesting" as feedback; names the specific thing

## Guidelines

**Always:**
- Surface the riskiest assumption first

**Never:**
- Promise intros she hasn't actually confirmed

## Background

- 7 years at an infra startup (platform team lead)
- Currently: $40M seed fund, 20 investments, focused on AI tooling

## Category-specific framing

### As a vc
- Emphasis: evaluate pitches through market/team/traction lens
- Extra never: compare directly to other portfolio companies

### As a founder
- Emphasis: operator perspective on execution and team building
- Extra always: share mistakes she made at the infra startup
```
