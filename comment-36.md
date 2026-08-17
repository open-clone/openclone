## AI-understood issue summary

Keep the existing `README.md` as the Korean source of truth and add two new top-level translations — `README_en.md` (English) and a Chinese README for mainland-China users. All three files must be cross-linked via a language picker placed at the top of `README.md` (and ideally mirrored on the two translated files) so visitors can switch between languages with one click.

## Why this issue is needed

- **The project is distributed globally via GitHub** but ships a Korean-only landing page. Non-Korean visitors today have to machine-translate `README.md` to even understand what `/openclone` is — that is a real adoption barrier for a tool whose install one-liner is already bilingual-friendly (paste English instructions to Claude Code, commands themselves are English).
- **The codebase already assumes multilingual users.** The persona-injection hook explicitly instructs clones to "Match the language of the user's message (Korean in, Korean out; English in, English out)" (`hooks/inject-active-clone.sh:162`). A user who can chat with the skill in English should be able to discover the skill in English.
- **`README.md` is the single source users are told to read.** Multiple places in the repo direct users there for both install and usage — e.g. Codex setup tells the agent to reference `~/.codex/skills/openclone/README.md`'s "기본 클론" section (`README.md:91`), and `CONTRIBUTING.md:9` points new contributors to `README.md#설치`. Those pointers are Korean-dependent.
- **Chinese (zh-CN) and English cover the two largest OSS-developer audiences outside Korea.** For a Claude Code persona/skill project, those are the realistic incremental readerships.

## Why this issue may not be needed

- **Maintenance cost is non-trivial.** `README.md` is updated often — it already contains a 12-row clone table that changes as clones are added/removed, a platform-support matrix, a Codex-CLI experimental section, and a troubleshooting block. Every edit to the Korean source forces two translation edits or the translations silently drift. There is no CI today that flags drift.
- **The README is currently the only Korean anchor in an otherwise English codebase** (`SKILL.md`, references, `CLAUDE.md`, scripts, hooks, issue templates are English or bilingual). A reader who only speaks English/Chinese can already infer most of the behavior from the English code + the install one-liner + the `description` frontmatter in `SKILL.md`. The marginal value of a translated README vs. a single "What is this, in English?" section inside `README.md` is debatable.
- **Translation quality risk.** A machine-translated Chinese README written without a native reviewer is worse than no Chinese README — it signals neglect. If the maintainer has no reliable zh-CN reviewer yet, it may be better to ship English-only first and open Chinese as a follow-up with a community translator.
- **Partial alternative**: inline language sections inside the single `README.md` (collapsible `<details>` per language) avoid the three-file drift problem entirely. It's less polished but far cheaper to maintain.

If the maintainer accepts these trade-offs, the rest of this plan is the implementation path.

## Expected Outcome

1. `README.md` remains Korean and is the canonical/authoritative version. A language-picker line is added at the very top (above the badges or right below the `# openclone` title), linking to the English and Chinese translations.
2. `README_en.md` exists at repo root, containing a faithful English translation of all sections of `README.md`, with the same language-picker line at the top (pointing to itself as the current language, and to `README.md` / `README_zh.md`).
3. `README_zh.md` (Simplified Chinese, zh-CN) exists at repo root with the same structure and picker.
4. Internal links inside the translated files still point to the real files (`CONTRIBUTING.md`, `CHANGELOG.md`, `clones/<slug>/persona.md`, `references/*.md`, `LICENSE`) — those are not translated, so the translations must accept that downstream docs remain Korean/English for now.
5. CI (markdownlint) stays green on all three files. No other CI changes are required by this change.
6. A short "This is a translation; the Korean `README.md` is canonical; report drift via an issue" note is present at the top of each translated file so readers know which file to trust when they conflict.

## Evidence-based implementation plan

### Research findings (what already exists vs. what must be built)

- **In-repo**: no existing reusable code found. There is no prior translation infrastructure, no `i18n/` directory, no translated docs. The only translation-adjacent signal is the hook's language-matching instruction (`hooks/inject-active-clone.sh:162`), which is about runtime clone replies, not docs.
- **CI / validators**: only two rules touch the new files.
  1. `.github/scripts/validate-skill.ts:66` cross-checks `${CLAUDE_SKILL_DIR}/references/<slug>.md` mentions inside `SKILL.md`. It does **not** scan README files, so translations are out of its scope.
  2. `.github/workflows/validate.yml:34-37` runs `markdownlint-cli2` on `**/*.md`. `.markdownlint-cli2.jsonc` disables `MD013` (line length), `MD033` (inline HTML — needed for `<details>`), `MD041` (first line heading), etc., and ignores `clones/*/knowledge/**`. New top-level READMEs will be linted but the relaxed ruleset makes passing easy.
- **External conventions**: no single GitHub-official standard exists for translated READMEs (GitHub's auto-language switching only applies to `LICENSE`, not README). The widely-used patterns are:
  - Dot-suffix: `README.zh-cn.md`, `README.ko.md`, `README.ja.md` — used by `tiimgreen/github-cheat-sheet`, `supabase/supabase` (under `i18n/`), `huggingface/transformers` (under `i18n/`).
  - Underscore-suffix: `README_en.md`, `README_zh.md`, `README-zh_CN.md` — used by `ant-design/ant-design`, `typeorm/typeorm`.
  - Citations: "How to Localize a README File for GitHub - https://blog.laratranslate.com/how-to-localize-a-readme-file-github", "GitHub Community Discussion #31132 - https://github.com/orgs/community/discussions/31132", "github/markup Issue #899 - https://github.com/github/markup/issues/899", "Supabase multi-language README maintenance - https://github.com/supabase/supabase/issues/20176".
- **Language picker format**: pipe-separated inline links at the top of the file are the dominant pattern. Concrete example from `huggingface/transformers`:

  ```html
  <h4 align="center">
      <p>
          <b>English</b> |
          <a href=".../README_zh-hans.md">简体中文</a> |
          <a href=".../README_ko.md">한국어</a> | ...
      </p>
  </h4>
  ```
  Source: "huggingface/transformers README - https://github.com/huggingface/transformers/blob/main/README.md"
- **Sync mechanism**: no suitable external library found for README drift detection that's worth adopting for a 3-file set. A lightweight "synced with commit `<sha>`" HTML comment header is the conventional low-cost approach and is what this plan recommends.

### Step-by-step plan for the implementation agent

The issue uses the exact filenames `README_en.md` and "zh md" → the implementation agent will use `README_en.md` and `README_zh.md` (underscore-suffix, root level). This matches the issue body's literal naming and the `ant-design` / `huggingface/transformers` underscore convention. Do NOT use dot-suffix (`README.en.md`) unless the maintainer reverses this choice in a follow-up comment.

1. **Create `README_en.md` at repo root** — full English translation of the current `/Users/jeffrey/Projects/openclone/README.md`. Preserve:
   - All badges (`README.md:3-6`) as-is (they're already English / locale-neutral).
   - The "## Default clones" table including all 12 current rows (`README.md:27-39`). Keep the clone `display_name` in its original script (Korean names stay Korean; those are proper nouns). Translate only the "소개" column to English tagline style, drawing from each clone's `persona.md` `tagline` frontmatter in `clones/<slug>/persona.md` — do NOT invent content.
   - Install options A and B exactly (`README.md:51-68`). The embedded paste-block is already English (`README.md:51-55`) — keep it verbatim.
   - Codex CLI experimental section (`README.md:72-100`) — translate the Korean warning and body prose; keep the shell blocks verbatim.
   - Platform support table (`README.md:104-110`) — translate the cells' Korean prose; keep cell structure and ✅ / ⚠️ / ❌ markers.
   - Both `<details>` blocks: auto-update toggle (`README.md:114-138`) and install troubleshooting (`README.md:140-161`).
   - "이용 방법" (`README.md:163-178`) → "Usage". Keep the code block verbatim (commands are not localized); translate the comment portion after `#` on each line.
   - "옵트인 (실존 인물 클론)" (`README.md:180-193`) → "Opt-in (real-person clones)". This section is legally / ethically sensitive — translate carefully, preserve the `hayun@rapidstudio.dev` email and the `opt_in_request.md` issue-template link verbatim.
   - "더 보기" (`README.md:195-202`) → "More". Keep the relative links (`CONTRIBUTING.md`, `references/clone-schema.md`, etc.) pointing to the existing (non-translated) files and add a one-line parenthetical noting those are Korean/English — e.g. `[CONTRIBUTING.md](CONTRIBUTING.md) — Contributor guide (Korean)`.
2. **Create `README_zh.md` at repo root** — Simplified Chinese (zh-CN) translation with the same structure as `README_en.md`. All of the same preservation rules apply. The maintainer should personally review or arrange a native-speaker review before merging — this plan does NOT assume the agent's Chinese output is publication-ready. If the agent doing the implementation is unsure of zh-CN quality, it should leave a visible `<!-- REVIEW NEEDED: native zh-CN reviewer -->` comment at the top of `README_zh.md` for the maintainer to resolve before merge.
3. **Add language-picker header at the top of `README.md`** — place it immediately after the `# openclone` heading on `README.md:1`, before the badges on `README.md:3-6`. Format (pipe-separated, bolded current language):

   ```md
   **한국어** | [English](README_en.md) | [简体中文](README_zh.md)
   ```

   Use relative links (not absolute GitHub URLs) — GitHub renders relative links correctly on both `github.com` and local clones, and it survives the `taurin-inc` vs `open-clone` org ambiguity noted under Open Questions below.
4. **Mirror the language-picker at the top of `README_en.md` and `README_zh.md`** with the current language bolded, e.g. in `README_en.md`:

   ```md
   [한국어](README.md) | **English** | [简体中文](README_zh.md)
   ```
5. **Add a translation-status header** at the very top of each translated file (above the picker), as an HTML comment so it doesn't render but is visible in source:

   ```md
   <!--
   This file is a translation of README.md (Korean canonical source).
   Last synced with README.md at commit: <COMMIT-SHA>
   Report drift or translation errors via a GitHub issue.
   -->
   ```

   The implementation agent should fill `<COMMIT-SHA>` with the short SHA of the `main` HEAD that the translation was based on (capture via `git rev-parse --short HEAD` at the moment of translation).
6. **Do NOT translate** any of: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/architecture.md`, `references/*.md`, `SKILL.md`, persona files, knowledge files. Those are out of scope for this issue. A single line in `README_en.md` / `README_zh.md` "More" section should note those remain in their original language.
7. **Do NOT modify** CI or validators. `validate-skill.ts` only inspects `SKILL.md`; `validate-clones.ts` only inspects `clones/*/persona.md`; `smoke-hook.sh` is independent. No new validator is part of this issue — drift detection is explicitly out of scope unless the maintainer requests it.
8. **Verify locally before PR**:
   - `npx markdownlint-cli2 "README.md" "README_en.md" "README_zh.md"` — must pass under `.markdownlint-cli2.jsonc:1-19`.
   - Visually confirm on GitHub's README preview (or a local markdown previewer) that the picker line renders as three clickable items in the two translations and as bold-Korean + two links in `README.md`.
   - `node .github/scripts/validate-skill.ts` — unaffected but should still pass (sanity).
9. **Commit and PR**:
   - Branch name suggestion: `docs/readme-en-zh`.
   - Commit message suggestion: `docs(readme): add English + Simplified Chinese translations`. Include the picker-line change to `README.md` and both new files in the same commit so reviewers see the full wiring at once.
   - PR description should call out the Open Questions section below so the maintainer explicitly ratifies the file-name choice and the zh-CN-only (vs zh-CN + zh-TW) decision at review time.

### Risks and assumptions

- **Drift risk**: every future edit to `README.md` (new clone, new platform row, new install step) will silently leave the two translations stale. This plan ships only the "sync SHA" comment as mitigation; it does not add CI. Accept this risk or ask for a follow-up issue to add a drift-detection workflow.
- **zh-CN translation quality**: the implementation agent may not be a native Chinese speaker. The `REVIEW NEEDED` marker in step 2 shifts that verification onto the human reviewer; without a native reviewer, shipping zh-CN risks worse-than-nothing quality.
- **Repo URL drift**: the local remote is `git@github.com:taurin-inc/openclone.git` but this issue is filed on `open-clone/openclone`. The README install one-liner on `README.md:53,63` uses `https://github.com/taurin-inc/openclone.git`. The translations should preserve those same URLs verbatim; if the org is migrating, that's a separate issue. See Open Questions.
- **Filename-convention lock-in**: once `README_en.md` / `README_zh.md` ship and are indexed by search engines / referenced externally, renaming them later (e.g. to `README.en.md`) breaks inbound links. Decide now.
- **Badge `Made in Korea`** (`README.md:6`): translate the surrounding prose but keep the badge as-is (it's a statement of origin, not locale).

## Open questions for the human

Please answer these in a follow-up comment **before** `/approve` — otherwise the implementation agent will pick the defaults shown in brackets.

1. **Filename convention** — [`README_en.md` + `README_zh.md`, underscore, root level, matching the issue body text]. Alternative: `README.en.md` + `README.zh-cn.md` (dot-suffix). Confirm or override.
2. **Chinese variant** — [Simplified Chinese only, `zh-CN`, since the issue says "china user"]. Do you also want `README_zh-TW.md` (Traditional) for Taiwan/Hong Kong/Macau readers? Default: no, Simplified only.
3. **Translate clone taglines in the "Default clones" table?** — [Yes, into English, pulling from each `clones/<slug>/persona.md` frontmatter `tagline` field; Korean display names stay Korean]. Alternative: keep the "소개" column untranslated so there's exactly one canonical tagline.
4. **Machine translation OK for zh-CN?** — [No — emit a visible `REVIEW NEEDED` marker and require a native reviewer]. Override if you have a translator lined up or explicitly accept MT quality.
5. **Repo URL in install one-liners** — [Keep `https://github.com/taurin-inc/openclone.git` as in the current Korean README]. Override if the canonical remote is now `github.com/open-clone/openclone` and the Korean README should be updated in the same PR.
6. **Scope creep** — [Stay inside README-only as stated]. Confirm you do NOT want this PR to also translate `CONTRIBUTING.md` / `docs/architecture.md` — those should be separate issues if desired.

## Reminder

This is a planning comment only. **No code, branch, or PR will be created from this session.** A human must post a follow-up comment containing `/approve` before any implementation agent is dispatched. That new agent will start a fresh session with no memory of this analysis — it will only see this issue's body and the comment thread, so any override to the defaults above must be written into the thread before `/approve`.

<!-- dani:stage=issue_request;job=f932384c7d934b24a08bf4a9de36d655;issue=36 -->

— Agent Signature: Sisyphus (planning agent, issue #36)
