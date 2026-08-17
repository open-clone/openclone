## Re: NRG (Nanolaba Readme Generator) proposal

Thanks for surfacing this — single-source generation is the right framing for the drift problem I called out. I dug into NRG, the action, and both cited migration PRs before answering. Here is the evidence-based assessment, and what it would change in the implementation plan.

### What NRG actually is (verified)

- **Tool**: `nanolaba/readme-generator` is a **Java 8+** CLI distributed as a `.jar` (Apache 2.0). Invocations: standalone `java -jar nrg.jar`, Maven plugin (`com.nanolaba:nrg-maven-plugin:1.1`), or via the GitHub Action wrapper. Source: [Nanolaba Readme Generator - https://github.com/nanolaba/readme-generator](https://github.com/nanolaba/readme-generator).
- **Action**: `nanolaba/nrg-action` is a **bash composite action** that downloads the jar at runtime — no local Java needed in CI. It writes generated files to disk. **It does NOT auto-commit**; committing back requires a separate `peter-evans/create-pull-request` step ([nrg-action examples/auto-commit.yml - https://github.com/nanolaba/nrg-action/blob/main/examples/auto-commit.yml](https://github.com/nanolaba/nrg-action/blob/main/examples/auto-commit.yml)).
- **Marker syntax in your example checks out**: line-suffix markers `<!--ko-->`, `<!--en-->`, `<!--zh-->` are line-scoped (lines without a marker render in **every** output — that is the "shared" content path). Property comments `<!--@nrg.languages=...-->`, `<!--@nrg.defaultLanguage=...-->`, `<!--@nrg.fileNamePattern.<lang>=...-->` are documented in [TemplateSyntax.src.md - https://github.com/nanolaba/readme-generator/blob/main/docs/TemplateSyntax.src.md](https://github.com/nanolaba/readme-generator/blob/main/docs/TemplateSyntax.src.md). There is also a `${en:'...', ru:'...'}` inline form, an `<!--nrg.ignore-->` block for author-only notes, and `<!--nrg.freeze id="..."-->` regions that preserve external CI-injected edits across regenerations.
- **`--check` mode** exits non-zero with a unified diff if generated output differs from on-disk — exactly the CI gate you want for drift.

### Caution flags surfaced by the research

These are not deal-breakers, but they need to be in the maintainer's eyes before `/approve`:

1. **Tiny project, single maintainer.** NRG: **4 stars, 1 contributor, 16 open / 0 closed issues**, last commit today. The action: 1 star. Active development but no community, no bus-factor. Adopting NRG = direct dependency on one person's continued maintenance.
2. **Both cited migration PRs are still OPEN, not merged.** I checked via `gh api`:
   - [opengoofy/hippo4j#1620 - https://github.com/opengoofy/hippo4j/pull/1620](https://github.com/opengoofy/hippo4j/pull/1620): `state: open`, `merged_at: null`.
   - [wayn111/waynboot-mall#34 - https://github.com/wayn111/waynboot-mall/pull/34](https://github.com/wayn111/waynboot-mall/pull/34): `state: open`, `merged_at: null`.
   Both PRs were filed by the same author, who is also the filer of NRG issue #47 (`nrg bootstrap` feature request). Reading them as endorsement-by-adoption overstates the case — they are bootstrap demonstrations, not proven production migrations. **No merged real-world precedent yet.**
3. **2-line auto-generated header** is injected at the top of every output file (`<!--no-header>` is open as feature [issue #51](https://github.com/nanolaba/readme-generator/issues/51), not yet shipped). That header lands above your language-picker line. Cosmetic, but worth knowing.
4. **Code blocks / table cells with markers**: not explicitly documented as having special handling. Line-based parsing means a `<!--zh-->` accidentally inside a fenced code block could either be processed or passed through — needs a smoke test on the actual template before merge.
5. **Line-ending drift on Windows runners** is documented; mitigation is `* text=auto eol=lf` in `.gitattributes`. openclone today has no `.gitattributes`.
6. **JAR Main-Class bug in v1.0**, fixed in v1.1. The action invokes via `java -cp` to sidestep it. Pin `nrg-action@v1` (auto-updates within major) or a full SHA — not a 1.0 jar.

### How this lands against openclone-specific constraints

- **Sparse-checkout pattern triple-sync invariant**: the install one-liner in `README.md:53,63` shares the exact pattern `'/*' '!/clones/*/knowledge/'` with `scripts/fetch-clone-knowledge.sh` and `scripts/session-update.sh`. CLAUDE.md:186 explicitly says these three must move together. NRG does not break this — the install one-liner becomes shared (no language marker) content in `README.src.md` and is identical in all three outputs by construction. **Generation actually strengthens this invariant** because the one-liner can no longer drift between the Korean and English READMEs.
- **The installed skill is a sparse git checkout, not a build artifact.** Users `git clone` straight into `~/.claude/skills/openclone/` and run `./setup`. There is no `npm install`, no `pip`, no Maven on the install path. NRG would only ever run **on the maintainer's machine or in CI** — not at install time. So users do not pay the Java tax. Confirmed against `CLAUDE.md` "no build step, no test runner, no package manager" and `validate.yml` (Node 24 only). NRG's Java requirement is contained to CI runners (which `actions/setup-java` solves) and to maintainer dev loops.
- **Existing CI is `markdownlint-cli2` + 2 Node TS validators + `shellcheck`**. Adding `nrg-action --check` slots in cleanly as a fourth step. **No existing template infrastructure conflicts** — there are no `.src.md`, `.tmpl`, or generator files anywhere in the repo today.
- **`./scripts/dev-link.sh` workspace overlay**: today this is the dev iteration loop. With NRG, the maintainer would dev-link the **template** `README.src.md`, not `README.md`, and either run `nrg` locally on save or accept that the rendered README only refreshes on regen. Not a blocker, but a workflow change worth flagging.

### Updated implementation-plan options

The previous plan assumed manual three-file maintenance. With NRG on the table, the implementation agent has three viable paths. The maintainer must pick one before `/approve`:

#### Option A — Manual three files (original plan, unchanged)
- Files: `README.md` (Korean, canonical), `README_en.md`, `README_zh.md`.
- Drift mitigation: HTML-comment "synced with `<sha>`" headers on the two translations.
- CI: only `markdownlint-cli2` (already in place).
- **Pro**: zero new dependencies, zero new tooling, ships today.
- **Con**: every README edit requires three edits or accepts drift. The `README.md:27-39` clone table drifts especially fast.

#### Option B — NRG single-template (your proposal)
- Files: `README.src.md` (single source, all three languages) + generated `README.md`, `README_en.md`, `README_zh.md`.
- The generated three are committed to the repo (so non-NRG-users on GitHub still see them rendered).
- **CI gate**: `.github/workflows/validate.yml` adds a step `uses: nanolaba/nrg-action@v1` with `mode: check` (or `--check` flag). PRs that edit a generated file without touching the template fail CI.
- **Maintainer dev loop**: install Java 8+ once, run `java -jar nrg.jar -f README.src.md` after edits, or rely on CI to regenerate via `peter-evans/create-pull-request`.
- **Pro**: the drift problem is eliminated by construction; the install one-liner is by definition identical across languages.
- **Con**: new external dependency on a 1-contributor / 4-star project; the auto-generated 2-line header lands above the picker; need `.gitattributes` for line endings; CI gets a Java step (≈30s install via `actions/setup-java`); maintainer must learn one new tool.

#### Option C — NRG template, but only commit `README.src.md` + on-merge regen
- Same as B but the three rendered files are NOT committed to `main` directly — instead, an `on: push: branches: [main]` workflow runs NRG, opens (or fast-forwards) a PR via `peter-evans/create-pull-request`, and the maintainer merges that PR.
- **Pro**: no PR ever has to touch four files at once; reviewers only review template diffs.
- **Con**: every doc change is a two-PR dance (template PR → bot regen PR). For a docs-heavy repo this is annoying. Also, generated files briefly lag the template on `main`, which means GitHub front-page README can be momentarily out of date.

**Default recommendation if the maintainer doesn't pick**: **Option A** still. NRG is functionally fine and the syntax is real, but adopting an unmerged-precedent, 1-contributor tool as a hard CI dependency for a 3-language README is a bigger swing than the problem currently warrants. If the README grows to 5+ languages or the clone table doubles, revisit Option B as a follow-up issue.

If the maintainer picks **Option B**, the implementation agent will additionally:

1. Author `README.src.md` at repo root following the [NRG TemplateSyntax doc - https://github.com/nanolaba/readme-generator/blob/main/docs/TemplateSyntax.src.md](https://github.com/nanolaba/readme-generator/blob/main/docs/TemplateSyntax.src.md). Use the exact property block from your example, with `ko` as default and `en` / `zh` named via `nrg.fileNamePattern.<lang>`. The picker block uses three line-marked variants as you wrote them.
2. Mark the install one-liner code block, the platform-support table, the badges, the `<details>` blocks, and the clone table as **shared** (no language marker) so every output gets the same shell/markdown verbatim. Only translatable prose carries `<!--ko-->` / `<!--en-->` / `<!--zh-->` markers. Note: this means the prose explanations between code blocks need three variants per line.
3. Run `java -jar nrg.jar -f README.src.md` locally to produce `README.md`, `README_en.md`, `README_zh.md`. Commit all four files (template + three outputs).
4. Add `.github/workflows/regenerate-readme.yml` (or extend `validate.yml`) with a `nanolaba/nrg-action@v1` step in `mode: check`. Pin to `@v1` per the action's recommended version policy. Run on every push and PR.
5. Add `.gitattributes` containing `* text=auto eol=lf` so `--check` does not fail on Windows runners ([documented gotcha - https://github.com/nanolaba/nrg-action#troubleshooting](https://github.com/nanolaba/nrg-action)).
6. Update **`CLAUDE.md:186`** invariant note: now four files contain the sparse-checkout pattern (the three generated READMEs share it from the template — that's good — but the template is the new source). Replace "the install one-liner in `README.md`" with "the install one-liner in `README.src.md` (regenerated into all three READMEs)".
7. Update **`CONTRIBUTING.md:177`** category-update step 5 to "edit `README.src.md` (clone table block); the generator will fan out to all three READMEs". Same for `docs/architecture.md:168`.
8. Update **`CLAUDE.md:158`** category-add seven-place list: it still has seven places but item 5 now reads `README.src.md` instead of `README.md`.
9. Document the dev loop in `CONTRIBUTING.md`: "After editing `README.src.md`, run `java -jar /path/to/nrg.jar -f README.src.md` to regenerate. CI will reject PRs whose generated READMEs are out of sync with the template."
10. Smoke-test that markers inside fenced code blocks behave correctly — specifically, the install one-liner code block must not have any `<!--xx-->` markers inside it, since line-based parsing on triple-backtick content is undocumented behavior.

If the maintainer picks **Option C**, add to step 4 an additional commit-back workflow using `peter-evans/create-pull-request` per [nrg-action examples/auto-commit.yml - https://github.com/nanolaba/nrg-action/blob/main/examples/auto-commit.yml](https://github.com/nanolaba/nrg-action/blob/main/examples/auto-commit.yml).

### Open questions for the maintainer (must answer before `/approve`)

The earlier 6 questions still apply. NRG adds these:

7. **Adopt NRG (B/C) or stay manual (A)?** Default if no answer: **Option A**. Trade-offs are spelled out above.
8. **If B**: pin `nrg-action@v1` (rolling within major), `@v1.0` (locked minor), or `@<full-sha>` (immutable)? Default: **`@v1`** per action's own recommendation; immutable SHA pin is more secure if you want to audit every NRG version bump.
9. **If B**: accept the 2-line auto-generated header NRG injects at the top of every output, or wait for [NRG issue #51 - https://github.com/nanolaba/readme-generator/issues/51](https://github.com/nanolaba/readme-generator/issues/51) (`--no-header`) to ship?
10. **If B**: are you OK introducing a Java-runtime CI dependency (≈30s `actions/setup-java` step on each run, or rely on the action's bundled jar download)? The action handles it transparently, but it is an external download per CI run.
11. **If B**: the install one-liner currently uses URL `https://github.com/taurin-inc/openclone.git` while this issue lives on `open-clone/openclone`. The earlier comment flagged this. Templating does not resolve the org-name question — it just makes whatever you pick consistent across all three outputs.

### Reminder

This is a planning comment only. **No code, branch, or PR will be created from this session.** A human must post a follow-up comment containing `/approve` (and ideally answer questions 1–11) before any implementation agent is dispatched. That new agent starts a fresh session with no memory of this analysis — it will only see this issue's body and the visible discussion thread, so any choice between Option A / B / C and any answers to the open questions must be written into a comment **before** `/approve` to take effect.

<!-- dani:stage=issue_followup;job=a775df7f9b504506abb0cb9eb5eddd4d;issue=36 -->

— Agent Signature: Sisyphus (planning agent, issue #36, follow-up)
