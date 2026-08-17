## Re: maintainer disclosure + locking to Option A

Thanks for the disclosure on the PR authorship — that materially changes how the citation evidence should be read, and it is the right call to surface it. Locking in:

### Disclosure → plan implication

You are the author of [opengoofy/hippo4j#1620](https://github.com/opengoofy/hippo4j/pull/1620), [wayn111/waynboot-mall#34](https://github.com/wayn111/waynboot-mall/pull/34), and [NRG issue #47](https://github.com/nanolaba/readme-generator/issues/47). With that context, the right framing for the implementation agent is exactly what you wrote: those PRs demonstrate **NRG produces byte-identical output against real production READMEs**, not **third parties have validated NRG in production**. That distinction matters and it is now part of the visible discussion thread, so the implementation agent (which only sees this thread, not my reasoning trace) will read it correctly when `/approve` lands.

### Factual nit on the issue counts

I re-checked via `gh api repos/nanolaba/readme-generator` just now:

- `open_issues: 16` (note: the GitHub API field `open_issues_count` includes both open issues **and** open PRs, which probably explains the gap with your "6 open" — your number is likely issues-only, mine is the API sum)
- Recently closed issues #46, #48, #49, #50, #52 — `0a5687c` ("feat(badge): optional alt= parameter for SEO-friendly alt-text") indeed closes #52 (verified via `gh api repos/nanolaba/readme-generator/commits/0a5687c`)

So there are at least five recent closes, not one — slightly more activity than your follow-up implied, but the bus-factor analysis stands unchanged: 1 contributor, 4 stars, no merged migrations elsewhere yet. None of this flips the recommendation.

### Plan locked: Option A

The implementation agent will execute **Option A** from the previous comment — manual three-file maintenance with HTML-comment sync headers — exactly as written there. Concretely, when `/approve` lands the implementation agent will:

1. Add a language-picker line at the top of `README.md` immediately after the `# openclone` heading, format `**한국어** | [English](README_en.md) | [简体中文](README_zh.md)`.
2. Create `README_en.md` (full English translation, structure-equivalent to `README.md:1-202`).
3. Create `README_zh.md` (Simplified Chinese, zh-CN, with a visible `<!-- REVIEW NEEDED: native zh-CN reviewer -->` marker at top because no native reviewer is currently lined up — see open question 4).
4. Mirror the picker line at the top of both translations with the current language bolded.
5. Add an HTML-comment "synced with README.md at commit `<short-sha>`" header at the very top of each translated file, where `<short-sha>` is captured from `git rev-parse --short HEAD` at translation time.
6. Verify locally with `npx markdownlint-cli2 "README.md" "README_en.md" "README_zh.md"` (must pass under `.markdownlint-cli2.jsonc:1-19`) and `node .github/scripts/validate-skill.ts` (sanity).
7. NOT touch CI, validators, `CONTRIBUTING.md`, `CLAUDE.md`, or any other file. Drift detection beyond the sync-comment header is explicitly out of scope per the previous comment.

### Re-evaluation trigger (recorded for future)

Per your acknowledgement, the trigger to revisit Option B (NRG) is: **README grows to 5+ languages, the clone table doubles in size, or sync-comment drift becomes observably painful in PR review**. None of those are true today. If any becomes true, the path forward is: open a new issue, link to this thread, and at that point the NRG-specific design frictions you named (markers inside fenced code blocks, line-ending CI handling, the auto-injected 2-line header — [NRG #51](https://github.com/nanolaba/readme-generator/issues/51)) become candidates for upstream issues against `nanolaba/readme-generator` rather than worked around in openclone. Noted for the record; not actionable now.

### Residual open questions before `/approve`

The earlier 6 questions still need answers (or accept the bracketed defaults). Repeating compactly so the implementation agent does not have to scroll:

1. **Filename convention** — default `README_en.md` + `README_zh.md` (underscore, root level). Override available.
2. **Chinese variant** — default Simplified Chinese (`zh-CN`) only. Override to add Traditional (`zh-TW`).
3. **Translate clone taglines in the "Default clones" table?** — default Yes, source from `clones/<slug>/persona.md` `tagline` frontmatter; Korean display names stay Korean.
4. **Machine translation OK for zh-CN?** — default No; emit `REVIEW NEEDED` marker. Override if you have a translator lined up.
5. **Repo URL in install one-liners** — default keep `https://github.com/taurin-inc/openclone.git` as-is (the org-name discrepancy with `open-clone/openclone` is a separate issue). Override if the canonical remote moves.
6. **Scope** — default README-only. Override to also translate `CONTRIBUTING.md` / `docs/architecture.md`.

Questions 7–11 from the previous comment (NRG version pinning, action choice, Java CI dependency, etc.) are now **N/A** because Option A does not introduce NRG.

### Reminder

This is still a planning thread. **No code, branch, or PR will be created from this session.** A human must post a follow-up comment containing `/approve` before any implementation agent is dispatched. That agent will start a fresh process with no memory of this analysis — it only sees the issue body and this discussion thread. If you want to override any of questions 1–6 above, write the override into a comment **before** `/approve`; otherwise the implementation agent will use the bracketed defaults.

<!-- dani:stage=issue_followup;job=cb5f2c08c0f74bb3906eb4aa3af2b1a2;issue=36 -->

— Agent Signature: Sisyphus (planning agent, issue #36, follow-up #2)
