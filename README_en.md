<!--
This file is a translation of README.md (Korean canonical source).
Last synced with README.md at commit: a0b4c52
Report drift or translation errors via a GitHub issue.
-->

# openclone

[한국어](README.md) | **English** | [简体中文](README_zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v0.3.0-brightgreen)](CHANGELOG.md)
![Made in Korea](https://img.shields.io/badge/Made%20in-Korea-blue)

> **A Claude Code skill — and a standalone CLI — for talking with AI persona clones.**

## Introduction

A single `/openclone` lets you create AI persona clones, activate them, and bring multiple perspectives to life through group chat rooms or category panels.

- **Talk to built-in clones out of the box** — curated presets (e.g. `douglas` / Douglas Kwon) ready to use right after install
- **Build your own clones** — interview-driven persona and knowledge building for a clone that is yours alone
- **Group chat rooms** — pull several clones into one room and the one most fit for the question auto-responds
- **Category panels** — ask every clone in the same category at once and compare perspectives side-by-side
- **Knowledge ingestion** — teach the active clone from URLs, video transcripts, or documents, all stored as local files

Everything lives as markdown on your own machine. No servers, no accounts, no SaaS.

## Default clones

These are the preset clones shipped in this repository. A ✅ in the **Official** column means the person themselves reviewed and formally accepted the clone. Entries without ✅ are constructed from public interviews, statements, and writings. If you are one of those people and would like to edit or remove your clone, see the [Opt-in](#opt-in-real-person-clones) section below.

| Official | Name | Categories | Intro |
| :---: | --- | --- | --- |
| ✅ | [장동욱 (Brian)](clones/brian/persona.md) | `vc` | Director at Kakao Ventures. Backed 60+ early-stage teams including Daangn, Korea Credit Data, and Queenit |
|  | [노정석 (Chester Roh)](clones/chester/persona.md) | `founder`, `vc` | First Asian founder acquired by Google. 25 years of 6 consecutive startups, angel investing, and company building |
| ✅ | [김철우](clones/chulwukim/persona.md) | `vc`, `founder` | CEO of The Ventures. Founder-turned-VC with Sellit→Kakao exit and Bungaejangter PEF exit |
| ✅ | [권도균](clones/douglas/persona.md) | `founder`, `vc` | CEO of Primer. Korea's #1 accelerator, 300+ portfolio companies over 16 years |
| ✅ | [조여준 (Ethan Cho)](clones/ethan/persona.md) | `vc` | CIO of The Ventures. Alumnus of Google, Qualcomm Ventures, KB Investment; early validator of Dunamu and Toss |
| ✅ | [정구봉](clones/gbjeong/persona.md) | `tech`, `founder` | CEO of Team Attention. Self-acknowledged Claude Code expert, AI agent and automation engineer |
| ✅ | [김동현 (이드)](clones/iid/persona.md) | `expert` | HR Director at T-order. Execution-focused HR partner with Toss, Yanolja, Class101 experience |
| ✅ | [신재명 (Jay Shin)](clones/jayshin/persona.md) | `founder` | Founder of Delight Room. Alarmy with 100M+ global downloads, wellness app generating 34B KRW revenue |
|  | [이동욱 (향로)](clones/jojoldu/persona.md) | `tech` | CTO of Inflab. The recording developer — "record over remember" · "Gaebaldak" |
| ✅ | [조쉬](clones/josh/persona.md) | `founder`, `expert` | Builder Josh · Josh's Newsletter · Author of "I Am a Solopreneur" |
| ✅ | [이경훈](clones/kyunghun/persona.md) | `founder`, `vc` | Vice President & CAIO at Channel Corporation. Former Korea head of Global Brain; AI and Japan-market expert |
|  | [김용훈 (Levi)](clones/levi/persona.md) | `expert` | CEO of Kim Yonghoon Growth Lab. Growth marketing for 160+ startups; CMO with M&A and IPO experience |
|  | [이승건 (SG Lee)](clones/sglee/persona.md) | `founder`, `expert` | Toss team lead and Viva Republica founder. Built Korea's national super-app on the 9th attempt after 8 failures over 5 years |
|  | [김동신 (John Kim)](clones/johnkim/persona.md) | `founder`, `expert` | Sendbird founder. ParfaikaLab exit → Smile Family pivot → first Korean Silicon Valley B2B unicorn. Currently building Delight.ai |

## Install

openclone offers **two install paths**. Pick the one that matches your environment.

| Path | When to use | Host |
|---|---|---|
| **A. Claude Code skill** | You want to talk with clones inside Claude Code through the `/openclone` slash command | Claude Code |
| **B. Standalone CLI** | You want to talk with clones from any terminal using OpenAI / Ollama / Codex models | macOS / Linux / WSL2 |

---

### A. Install as a Claude Code skill

Inside Claude Code you get the full interaction surface — the `/openclone` slash command, group rooms, category panels, and natural-language activation.

#### Option A1 — Let Claude Code do it

Paste the prompt below into a Claude Code session.

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/open-clone/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, tech, founder, expert, influencer, politician, celebrity). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code performs the install for you and adds a usage note to `~/.claude/CLAUDE.md` so the skill is recognized naturally going forward.

#### Option A2 — Directly from the terminal

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/open-clone/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

Restart Claude Code after install and `/openclone` is ready. For Claude Code usage details, see the [Usage](#usage) section below.

---

### B. Install as the standalone CLI

A single npm install gives you the `openclone` binary that runs in any terminal. It supports OpenAI-compatible APIs, Codex OAuth, and local Ollama models.

#### B1. Install

```bash
npm install -g @openclone/openclone
```

This adds `openclone` to your `PATH`. The 14 built-in clones and all of their knowledge files ship inside the package, so you can use it right away.

```bash
openclone list
openclone chat douglas
```

#### B2. (Recommended) Get usage guidance through a Vercel Agent Skill

This repo also ships a [Vercel Agent Skill](https://vercel.com/docs/agent-resources/skills) that 18+ AI coding agents — Claude Code, Cursor, Copilot, Codex, Cline, Gemini, and more — can recognize. Once installed, your agent will walk you through CLI install, provider selection, session management, and troubleshooting on demand.

```bash
npx skills add open-clone/openclone --skill openclone-cli
```

Then ask your agent in natural language:

```text
"I'm new to the openclone CLI — how do I start with an OpenAI API key?"
"How do I use openclone history to resume a previous conversation?"
"I want to run openclone with a local Ollama model"
"What's the difference between --resume and --resume=<id> in openclone chat?"
```

The agent only loads `skills/openclone-cli/SKILL.md` and the relevant `references/*.md` (per-provider setup, session persistence, troubleshooting, etc.) when needed, and gives you short, copy-pasteable answers.

Inspect or update installed skills:

```bash
npx skills list
npx skills check
npx skills update
```

#### B3. Use it directly

```bash
openclone list                                                # Available clones
openclone status                                              # Active clone / room state
openclone chat <slug> --prompt "question"                     # Single-shot response (auto-saved session)
openclone chat <slug>                                         # Interactive TUI mode
openclone history <slug>                                      # Saved sessions for one clone
openclone history --all                                       # Sessions across every clone (with orphan tags)
openclone chat <slug> --resume                                # Resume newest session (interactive)
openclone chat <slug> --resume --prompt "follow-up"           # Resume newest session (single-shot)
openclone chat <slug> --resume=<SESSION_ID> --prompt "..."    # Resume a specific session (single-shot)
openclone chat <slug> --no-persist                            # Run this session without writing to disk
```

When `--prompt` is supplied the CLI runs a single turn and exits immediately. The response body goes to `stdout`; the session identifier is printed to `stderr` as `[session: <id>]`, which makes it easy for agents to chain multi-turn conversations without an interactive terminal:

```bash
# First turn — capture stderr to learn the new sessionId
openclone chat douglas --prompt "How should I think about early-stage fundraising?" 2>session.log
SESSION_ID=$(grep -oE '\[session: [^]]+\]' session.log | sed 's/\[session: //;s/\]//')

# Follow-up turns reuse the same session via --resume
openclone chat douglas --resume=$SESSION_ID --prompt "Drill into the first option"
openclone chat douglas --resume=$SESSION_ID --prompt "Show me concrete examples"
```

#### B4. Provider configuration

The default provider is OpenAI-compatible and the default model is `gpt-5.5`. Configure once via environment variables, or pass flags every time.

**OpenAI-compatible API:**

```bash
export OPENCLONE_API_KEY="sk-..."        # or OPENAI_API_KEY
export OPENCLONE_MODEL="gpt-5.5"
openclone chat douglas
```

**Codex OAuth (machine that's already logged into the Codex CLI):**

```bash
openclone chat douglas --use-codex-auth --model gpt-5.5
```

The ChatGPT backend currently rejects `store=true` requests for ChatGPT-tier OAuth tokens, so Codex OAuth defaults to response-item persistence off (`store=false`). The CLI sends the full message array on every turn, so multi-turn conversations work fine without `previous_response_id`. In tool-driven multi-step turns, the AI SDK would otherwise echo prior-step `rs_...` reasoning/tool item IDs into the next step's input and the backend returns `Item with id 'rs_...' not found.` 404; openclone strips those IDs and reasoning parts between steps by default. Set `OPENCLONE_CODEX_STRIP_REASONING=0` to disable.

**Local Ollama:**

```bash
ollama serve &                          # skip if already running
openclone chat douglas --provider ollama --model llama3.2
```

For per-provider setup details, troubleshooting, and session-management behavior, ask your agent through the [B2 Vercel Agent Skill](#b2-recommended-get-usage-guidance-through-a-vercel-agent-skill) or read `skills/openclone-cli/references/*.md` directly.

#### B5. Interactive mode commands

```text
/help     command help
/compact  summarize older conversation history right now
/clear    wipe in-memory history and summary
/bye      end the conversation (also /exit, /quit)
```

Conversations are saved on every turn and on `/bye` to `~/.openclone/conversations/<slug>/<sessionId>.json` as plaintext JSON. When you start with `--resume`, a `[resumed: N message(s)]` banner is printed and the entire prior conversation is replayed to the terminal — scroll up to see exactly what was said. A `--- continuing conversation ---` separator and a fresh `>>>` prompt follow. On exit you'll see `[session saved: <path>]`.

When a conversation grows past about 350,000 characters (`OPENCLONE_COMPACT_MAX_CHARS`, roughly 70% of a 250K-token context window), older messages are summarized while the most recent 8 turns (`OPENCLONE_COMPACT_KEEP_TURNS`) are kept verbatim. The summary length cap is `OPENCLONE_COMPACT_SUMMARY_MAX_CHARS` (default 20,000). Set `OPENCLONE_COMPACT_MAX_CHARS` to a smaller value if you target a smaller-context model (e.g. an 8B-class local Ollama) or want to reduce per-turn token cost. The compacted summary is also stored in the session JSON, so it survives across `--resume`.

#### B6. Run from a local checkout (developers)

```bash
git clone https://github.com/open-clone/openclone.git
cd openclone
npm install
npm run build
node dist/cli/index.js list
node dist/cli/index.js chat douglas
```

---

### C. Codex CLI (experimental)

> ⚠️ **Currently a file-reference-level experimental support.** `./setup` touches Claude Code-specific paths, hooks, and the statusline, so **do not run `./setup` in a Codex environment.** The `/openclone` slash command, `UserPromptSubmit`/`SessionStart` hook-driven auto-injection, the statusline, and background auto-update do not work yet — at this point you can only place `clones/<slug>/persona.md` and `knowledge/` files where Codex can read them. A native `--host=codex` installer is planned for a future release. If all you want is to talk with clones using your Codex token, the `--use-codex-auth` flag in **B. Standalone CLI** above is simpler.

Sparse-clone the repo into the Codex skills path only.

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/open-clone/openclone.git \
  ~/.codex/skills/openclone \
  && cd ~/.codex/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'
```

Then drop the snippet below into the `AGENTS.md` (or project instructions) of your Codex session so Codex references those files based on conversation context.

```text
The openclone personas and knowledge live under `~/.codex/skills/openclone/clones/<slug>/`. When the user
asks "talk like <name>" or says "openclone <slug>", read `persona.md` and follow that tone and viewpoint.
For the list of available clones, see the "Default clones" section of `~/.codex/skills/openclone/README.md`.
```

When you need a specific clone's knowledge files, lazy-fetch them on demand:

```bash
cd ~/.codex/skills/openclone && git sparse-checkout add clones/<slug>/knowledge/
```

**Updates**: There is no auto-update hook on this path, so refresh manually with `git pull --ff-only`. **Removal**: deleting the directory (`rm -rf ~/.codex/skills/openclone`) is enough — unlike Claude Code, this path does not touch `settings.json`.

### npm release

When a GitHub Release is set to `published`, `.github/workflows/publish-npm.yml` runs the npm release. The release tag is the source of truth for the npm package version.

- Tag examples: `v0.3.1` or `0.3.1`
- Prerelease tag example: `v0.4.0-beta.1`
- Regular releases publish under the npm `latest` dist-tag
- GitHub prereleases or semver prerelease tags publish under the npm `next` dist-tag
- The repo secret `NPM_TOKEN` is required.

The workflow extracts the version from the tag, applies it to `package.json` / `package-lock.json` via `npm version --no-git-tag-version`, and only runs `npm publish --provenance` after validate / build / test / lint / audit pass.

### Platform support

| Environment | Status | Notes |
| --- | --- | --- |
| macOS | ✅ Supported | Primary development and verification environment |
| Linux | ✅ Supported | |
| Windows (WSL2) | ✅ Works | Treated as Linux. Recommended |
| Windows (Git Bash) | ⚠️ Unsupported | Hook execution is environment-dependent. The background detach in `session-update.sh` and `ln -sfn` in `dev-link.sh` are particularly fragile |
| Windows (cmd / PowerShell native) | ❌ Unsupported | Hooks and scripts are entirely bash-based. Not feasible with the current architecture |

`setup` and `uninstall` automatically follow `~/.claude` if you've moved it via the `CLAUDE_CONFIG_DIR` environment variable. Codex CLI host support is currently experimental — see the "Codex CLI (experimental)" section above.

<details>
<summary>Updates, removal, and turning auto-update off</summary>

**Update** — A background `git pull` runs at session start (rate-limited to once per hour). To refresh manually:

```bash
cd ~/.claude/skills/openclone && git pull --ff-only
```

**Toggle auto-update on/off** — A file flag controls it.

```bash
touch ~/.openclone/no-auto-update    # off
rm ~/.openclone/no-auto-update       # back on
```

**Remove** — Run `./uninstall` from the install directory.

```bash
cd ~/.claude/skills/openclone && ./uninstall
```

Clones you created and knowledge you ingested (under `~/.openclone/`) are preserved. To wipe them as well, `rm -rf ~/.openclone`.

</details>

<details>
<summary id="install-troubleshooting">Install troubleshooting (cleaning up v1, reinstalling)</summary>

**If you're upgrading from the plugin install (pre-0.2.0)** — that path was `~/.claude/plugins/marketplaces/openclone`. Clean it up first, then run option A or B above.

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
rm -rf ~/.claude/plugins/marketplaces/openclone
rm -f ~/.openclone/no-auto-update
```

Your user data under `~/.openclone/` is preserved.

**If an existing install is broken or stuck on update** — wiping and reinstalling is faster.

```bash
cd ~/.claude/skills/openclone && ./uninstall
rm -f ~/.openclone/no-auto-update
# Then re-run option A or B above
```

</details>

## Usage

```text
/openclone                              # Home panel — clones grouped by category
/openclone 1                            # Activate by number
/openclone douglas                      # Activate by name
/openclone stop                         # End the active clone and any open room
/openclone new hayun                    # Create a clone (interview)
/openclone ingest https://blog/post     # Add knowledge to the active clone
/openclone room douglas alice bob       # Group chat room
/openclone room add charlie             # Add a room member
/openclone room leave                   # Leave the room (active clone stays)
/openclone panel vc "question"          # Category panel — ask every vc clone at once
```

Categories are 7 fixed: `vc`, `tech`, `founder`, `expert`, `influencer`, `politician`, `celebrity`. See [references/categories.md](references/categories.md) for the per-lens detail.

## Opt-in (real-person clones)

The real-person personas shipped as default clones in openclone are constructed from **public interviews, statements, and writings only**, and act as tools that summarize and reproduce that public viewpoint — not "avatars" of the person themselves.

If you are one of those people, you can request any of the following at any time:

- A review of the materials currently included in your default clone
- Edits or removal of specific quotes, sentences, or knowledge files
- Corrections to surface-level fields (`display_name`, `tagline`, affiliation, etc.)
- Removal of the entire persona

**How to reach us** — public requests via the [opt-in issue template](https://github.com/open-clone/openclone/issues/new?template=opt_in_request.md); for cases that need private verification, email `hayun@rapidstudio.dev`.

**Response goal** — Initial response within 7 days of receipt. Removal requests are reflected in the repository as soon as identity is confirmed, and reach users locally on the next auto-update.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md) — Contributor guide (adding a new clone, command and hook development)
- [references/clone-schema.md](references/clone-schema.md) — Clone file specification
- [references/categories.md](references/categories.md) — Category lens and tone guide
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)
- Sponsor: [Team Attention](https://www.team-attention.com/)
- License: MIT — [LICENSE](LICENSE)
