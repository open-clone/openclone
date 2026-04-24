<!--
This file is a translation of README.md (Korean canonical source).
Last synced with README.md at commit: 9889002
Report drift or translation errors via a GitHub issue.
-->

# openclone

[한국어](README.md) | **English** | [简体中文](README_zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v0.2-brightgreen)](CHANGELOG.md)
![Made in Korea](https://img.shields.io/badge/Made%20in-Korea-blue)

> **A Claude Code skill for talking with AI persona clones.**

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

## Install

openclone treats **Claude Code** as a first-class host and provides an experimental install for **Codex CLI** as well. Follow the section matching the host you use.

### Claude Code (recommended)

#### Option A — Let Claude Code do it

Paste the block below into your Claude Code session.

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/taurin-inc/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, tech, founder, expert, influencer, politician, celebrity). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code will run the install on your behalf and add a usage memo to `~/.claude/CLAUDE.md` so future sessions naturally recognize the skill.

#### Option B — Directly from the terminal

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

Restart Claude Code after the install finishes and `/openclone` will work right away.

### Codex CLI (experimental)

> ⚠️ **Currently only file-reference level experimental support.** `./setup` touches Claude-Code-specific paths, hooks, and the statusline, so **do not run `./setup` in a Codex environment.** The `/openclone` slash command, automatic persona injection via `UserPromptSubmit`/`SessionStart` hooks, the statusline, and background auto-update do not work yet — right now only placing `clones/<slug>/persona.md` and `knowledge/` files where Codex can read them is supported. A native `--host=codex` installer is planned for a later release.

Sparse-clone the repo into the Codex skills path.

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.codex/skills/openclone \
  && cd ~/.codex/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'
```

Then paste the block below into your Codex session's `AGENTS.md` (or project instructions), and Codex will consult the relevant files as the conversation demands.

```text
openclone persona / knowledge files live under `~/.codex/skills/openclone/clones/<slug>/`.
When the user asks "talk like <name>" or "openclone <slug>", read `persona.md` and follow
that tone and perspective. The list of available clones is in the "Default clones" section
of `~/.codex/skills/openclone/README.md`.
```

If you need a specific clone's knowledge files, lazy-fetch them on demand:

```bash
cd ~/.codex/skills/openclone && git sparse-checkout add clones/<slug>/knowledge/
```

**Update**: there is no auto-update hook, so refresh manually with `git pull --ff-only`. **Uninstall**: removing the directory (`rm -rf ~/.codex/skills/openclone`) is enough — unlike Claude Code, nothing in `settings.json` is touched.

### Platform support

| Environment | Status | Notes |
| --- | --- | --- |
| macOS | ✅ Officially supported | Primary development and verification environment |
| Linux | ✅ Officially supported | |
| Windows (WSL2) | ✅ Works | Treated as Linux. Recommended |
| Windows (Git Bash) | ⚠️ Unsupported | Hook execution is environment-dependent. The background detach in `session-update.sh` and `ln -sfn` in `dev-link.sh` are especially fragile |
| Windows (cmd / PowerShell native) | ❌ Unsupported | All hooks and scripts are bash-based. Impossible with the current architecture |

If you have moved `~/.claude` using the `CLAUDE_CONFIG_DIR` environment variable, `setup` / `uninstall` follow it automatically. Codex CLI host support is currently experimental — see the "Codex CLI (experimental)" section above.

<details>
<summary>Updating · uninstalling · turning auto-update off</summary>

**Update** — a background `git pull` runs automatically on session start (once per hour). To refresh manually:

```bash
cd ~/.claude/skills/openclone && git pull --ff-only
```

**Turn auto-update off · on** — toggle via a file flag.

```bash
touch ~/.openclone/no-auto-update    # off
rm ~/.openclone/no-auto-update       # back on
```

**Uninstall** — run `./uninstall` from the install directory.

```bash
cd ~/.claude/skills/openclone && ./uninstall
```

Your custom clones and ingested knowledge (`~/.openclone/`) are preserved. To wipe them too, `rm -rf ~/.openclone`.

</details>

<details>
<summary id="install-troubleshooting">Install troubleshooting (cleaning up v1, reinstalling)</summary>

**Coming from the plugin install (pre-0.2.0)** — the path used to be `~/.claude/plugins/marketplaces/openclone`. Clean that up first, then run Option A or B above.

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
rm -rf ~/.claude/plugins/marketplaces/openclone
rm -f ~/.openclone/no-auto-update
```

Your user data under `~/.openclone/` is preserved as-is.

**If an existing install broke or updates are stuck** — it is faster to wipe and reinstall.

```bash
cd ~/.claude/skills/openclone && ./uninstall
rm -f ~/.openclone/no-auto-update
# Then re-run Option A or B above
```

</details>

## Usage

```text
/openclone                              # Home panel — clones grouped by category
/openclone 1                            # Activate by number
/openclone douglas                      # Activate by name
/openclone stop                         # Exit both active clone and room
/openclone new hayun                    # Create a clone (interview)
/openclone ingest https://blog/post     # Add knowledge to the active clone
/openclone room douglas alice bob       # Group chat room
/openclone room add charlie             # Add a room member
/openclone room leave                   # Leave the room (active clone stays)
/openclone panel vc "question"          # Category panel — ask every vc clone
```

The seven categories are `vc`, `tech`, `founder`, `expert`, `influencer`, `politician`, `celebrity`. See [references/categories.md](references/categories.md) for per-lens details.

## Opt-in (real-person clones)

Person-based personas shipped as default clones in openclone are constructed **solely from public interviews, statements, and writings**. They are not "avatars" of the person; they are a tool that summarizes and reproduces publicly available perspectives.

If you are the person in question, you may request any of the following at any time:

- Review of the material included in your default clone
- Edits or deletion of specific quotes, sentences, or knowledge files
- Notation corrections (`display_name`, `tagline`, affiliation, etc.)
- Complete removal of the persona

**How to reach us** — public requests go through the [opt-in issue template](https://github.com/taurin-inc/openclone/issues/new?template=opt_in_request.md). For private verification please write to `hayun@rapidstudio.dev`.

**Response target** — an initial reply within 7 days of receipt. Removal requests are applied to the repository as soon as identity is confirmed, and reach user machines with the next auto-update.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md) — Contributor guide, covers new clones, commands, and hooks (Korean)
- [references/clone-schema.md](references/clone-schema.md) — Clone file spec (English)
- [references/categories.md](references/categories.md) — Category lens and tone guide (English)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)
- Other repo documents (`CHANGELOG.md`, `docs/architecture.md`, persona files, knowledge files) remain in their original language (Korean / English) for now
- Sponsor: [Team Attention](https://www.team-attention.com/)
- License: MIT — [LICENSE](LICENSE)
