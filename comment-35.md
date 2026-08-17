## Analysis: Integrate Vercel Agent Skills (#35)

This is a planning-only comment. No code has been written, no branches created, no PRs opened. Implementation begins only after a human replies with `/approve`.

---

### AI-understood issue summary

The request is to make the openclone skill installable and functional across the full Vercel Agent Skills ecosystem (41+ agents: Claude Code, Codex, Cursor, GitHub Copilot, Cline, etc.) via the `npx skills add` CLI, rather than only supporting Claude Code (1st-class) and Codex (experimental, file-reference only).

The core openclone value proposition is **stateful persona injection**: a user runs `/openclone douglas`, and from that turn onward the active clone's persona + knowledge are automatically prepended to every prompt via a `UserPromptSubmit` hook. Room mode extends this to multi-clone routing. This statefulness is what makes openclone feel like "talking to a person" rather than "pasting a prompt."

### Why this issue is needed

1. **Distribution reach**: `npx skills add open-clone/openclone` would make installation one command for 41+ agents, vs. today where every agent needs hand-written manual instructions (and most agents have none).
2. **Ecosystem alignment**: Vercel Agent Skills is emerging as a cross-agent standard. Being in that directory increases discoverability via `skills.sh`.
3. **Reduced maintenance**: A single install path replaces per-agent README sections (today: Claude Code full, Codex experimental, everything else: nothing).

### Why this issue may not be needed

1. **Hooks are the product**: According to Vercel's own compatibility matrix (see evidence below), `UserPromptSubmit` hooks are supported by **only 2 agents** (Claude Code and Cline). For the other 39+ agents, openclone's core auto-injection mechanism simply cannot work.
2. **SKILL.md is already compatible**: The root `SKILL.md` already follows the Vercel Agent Skills format (`name`, `description`, YAML frontmatter). In principle, `npx skills add open-clone/openclone` would already place the files in the right directories for Claude Code and Cline. The gap is not format; it's architecture.
3. **UX degradation risk**: For hookless agents, the only Vercel-compatible fallback is to rely on the agent loading `SKILL.md` on demand when the user mentions `/openclone`. But most hookless agents do not support slash commands or hook-based state persistence, so the user would need to manually reference the clone file every turn — a major regression from "activate once, talk forever."
4. **Opportunity cost**: Engineering time spent porting to 39+ agents with degraded UX might be better spent improving the Claude Code experience (e.g., more built-in clones, better knowledge retrieval).

### Expected Outcome

A clear decision on which of the following paths to pursue:

- **Path A (Minimal)**: Document that openclone is already installable via `npx skills add` for Claude Code / Cline (full features) and note limitations for other agents. No code changes.
- **Path B (Restructure)**: Convert each clone into an individual Vercel Agent Skill (`skills/<name>/SKILL.md`) so users can `npx skills add` specific personas. Loses stateful activation / room mode.
- **Path C (Hybrid adapter)**: Keep the monolithic skill, add per-agent setup scripts where hooks exist (Claude Code, Cline), and provide `AGENTS.md`-style guidance for hookless agents.
- **Path D (Decline)**: Keep Claude Code as the 1st-class host, document why full Vercel parity is infeasible given hook limitations, and close this issue.

### Evidence-based implementation plan

The implementation agent should use the evidence below to pick a path and execute it.

#### Evidence 1: Vercel Agent Skills compatibility matrix

Source: [vercel-labs/skills README - Compatibility section](https://github.com/vercel-labs/skills/blob/main/README.md)

| Feature | Claude Code | Cline | Codex | Cursor | Copilot | 36 others |
|---|---|---|---|---|---|---|
| Basic skills | Yes | Yes | Yes | Yes | Yes | Yes |
| `allowed-tools` | Yes | Yes | Yes | No | Yes | Most |
| `context: fork` | **Yes** | No | No | No | No | No |
| Hooks | **Yes** | **Yes** | No | No | No | No |

**Critical finding**: Hooks (the mechanism openclone relies on for persona injection) are supported by **only Claude Code and Cline**. This is not a limitation openclone can code around; it is a platform capability gap.

#### Evidence 2: openclone already uses Vercel-compatible SKILL.md format

Source: `/Users/jeffrey/Projects/openclone/SKILL.md:1-6`

```yaml
---
name: openclone
description: Create, manage, or talk to an openclone "clone" ...
argument-hint: [name | N | stop | new | ingest | room | panel <category> "<q>"]
allowed-tools: Bash, Read, Write, Glob, WebFetch
---
```

The root `SKILL.md` frontmatter already matches the Vercel Agent Skills specification (`name`, `description`). The body contains dispatcher logic that references `scripts/` and `references/` — also standard Vercel skill structure. **No format migration is needed for the skill file itself.**

#### Evidence 3: All agent-specific logic is isolated to hook registration and output formatting

Source: Comprehensive codebase analysis (see files below)

**Claude-specific files/lines**:
- `setup:14-18` — `CLAUDE_CONFIG_DIR` env var handling
- `setup:62-166` — Registers `UserPromptSubmit` + `SessionStart` hooks in `~/.claude/settings.json`
- `setup:147-154` — Registers `statusLine.command` in `~/.claude/settings.json`
- `hooks/inject-active-clone.sh:78-96` — Emits JSON with `hookSpecificOutput.additionalContext` (Claude Code hook contract)
- `hooks/inject-active-clone.sh:145-177` — Emits `<openclone-room>` XML tag (Claude Code parses this for context injection)
- `hooks/inject-active-clone.sh:202-232` — Emits `<openclone-active-clone>` XML tag
- `scripts/session-update.sh:1-9` — `SessionStart` hook documentation
- `scripts/statusline.sh:1-15` — Claude Code statusline contract
- `SKILL.md:12,51,72,80,etc.` — `${CLAUDE_SKILL_DIR}` variable (Claude Code expands to `~/.claude/skills/openclone`)

**Agent-agnostic files/lines** (reusable without change):
- `references/clone-schema.md:1-165` — Persona schema, knowledge directory structure, filename conventions
- `clones/<name>/persona.md` — All built-in persona files (pure content, zero agent-specific code)
- `clones/<name>/knowledge/*.md` — All knowledge files (pure content)
- `scripts/fetch-url.sh` — Generic curl + pandoc fallback
- `scripts/fetch-youtube.sh` — yt-dlp transcript extraction
- `scripts/fetch-clone-knowledge.sh:12-55` — Git sparse-checkout logic (agent-agnostic)
- `references/categories.md` — 7-category system and framing rules

**Finding**: ~90% of the codebase is agent-agnostic content. The ~10% that is Claude-specific is exactly the hook injection layer that makes openclone work.

#### Evidence 4: Codex "partial support" today is just a manual sparse clone

Source: `/Users/jeffrey/Projects/openclone/README.md:73-100`

The current Codex support is:
```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.codex/skills/openclone
```

No `./setup`, no hooks, no statusline, no slash command. Users must manually add a paragraph to their `AGENTS.md` telling Codex where the persona files live. This is the **best-case scenario for any hookless agent**.

#### Evidence 5: No existing reusable code for multi-agent hook abstraction

Search result: **No existing reusable code found** in-repo for abstracting hook registration across agents. The `setup` script hardcodes `~/.claude/settings.json` editing. There is no plugin adapter, no agent detection layer, no conditional hook format emitter.

#### Evidence 6: No suitable external library found

Search result: **No suitable external library found** that provides a cross-agent hook abstraction. The Vercel `skills` CLI (`npx skills add`) handles installation (symlinking/copying files to agent-specific directories) but does NOT provide a runtime abstraction for hooks — each agent implements its own hook/context system. See [Vercel Agent Skills FAQ](https://vercel.com/blog/agent-skills-explained-an-faq): "Skills are packaged, reusable instructions... The same packaging format and ecosystem work across domains" — but the *activation mechanism* (hooks vs. on-demand loading) is agent-specific.

#### Implementation instructions for the implementation agent

If `/approve` is given, the implementation agent should execute based on the path chosen by the human (after open questions below are answered). Here is what each path entails:

**Path A (Minimal — recommended if low effort desired)**
1. Add an `## Install via Vercel Skills CLI` section to `README.md` showing:
   ```bash
   npx skills add open-clone/openclone
   ```
2. Add a compatibility matrix to `README.md` clarifying:
   - Claude Code / Cline: full features (hooks supported)
   - All other agents: manual reference only (no auto-injection)
3. No code changes needed; the existing `SKILL.md` is already discoverable by `npx skills add`.

**Path B (Restructure — recommended if maximum reach desired)**
1. Create a `skills/` directory at repo root.
2. For each built-in clone (`clones/<name>/`), generate `skills/<name>/SKILL.md` containing:
   - Frontmatter: `name: <name>`, `description: "Talk as <display_name>. Trigger: /openclone <name>"`
   - Body: the full persona.md content (frontmatter becomes prose, body stays as instructions)
3. Keep the monolithic `SKILL.md` at root for Claude Code users who want the full dispatcher.
4. Update `README.md` with per-skill install instructions:
   ```bash
   npx skills add open-clone/openclone --skill douglas
   ```
5. Tradeoff: Users lose `/openclone room`, `/openclone panel`, `/openclone stop`, and stateful activation. Each clone becomes an on-demand skill.

**Path C (Hybrid adapter — recommended if preserving UX is priority)**
1. Refactor `setup` to detect the target agent and write hooks only if the agent supports them:
   - Claude Code → `~/.claude/settings.json`
   - Cline → detect Cline config path and register hooks there (research Cline hook format first)
   - Others → skip hook registration, print manual instructions
2. Add per-agent `AGENTS.md` templates in `docs/agents/` (e.g., `docs/agents/cursor.md`, `docs/agents/codex.md`) that explain how to manually reference clones.
3. Keep `SKILL.md` dispatch logic but make `${CLAUDE_SKILL_DIR}` resolution fall back to agent-agnostic paths (e.g., detect `CLAUDE_SKILL_DIR`, `CODEX_SKILL_DIR`, etc., or use relative paths).
4. Tradeoff: More code to maintain; Cline hook format may differ from Claude Code's.

**Path D (Decline)**
1. Close this issue with a comment explaining the hook limitation.
2. Optionally add a small note to `README.md` that `npx skills add open-clone/openclone` works for Claude Code/Cline but other agents are unsupported due to lack of hook APIs.

### Open questions for the human

Before the implementation agent begins, please answer:

1. **Which path do you prefer?** A (minimal docs), B (individual skills), C (hybrid adapter), or D (decline)?
2. **Is stateful activation a must-have for non-Claude-Code agents?** If yes, Path B and D are the only viable options (Path C cannot deliver statefulness on hookless agents). If no, Path C may be acceptable with degraded UX.
3. **Do you want to support Cline explicitly?** Cline is the only other agent that supports hooks, but its hook format/registration mechanism may differ from Claude Code's. Supporting Cline requires research into Cline's settings/config format.
4. **Should built-in clones be installable individually?** Path B enables `npx skills add open-clone/openclone --skill douglas`. This is more aligned with how Vercel skills are typically used (one skill = one capability). The monolithic "all clones in one skill" model is unusual in the Vercel ecosystem.

### Reminder

Implementation starts **only** after a human posts a follow-up comment containing `/approve`. The implementation agent will see only the issue body and the GitHub discussion — not this planning session's reasoning trace. Make your `/approve` comment explicit about which path to take and any constraints.

<!-- dani:stage=issue_request;job=d1c42af4bee645cc9b79c977cec2c39f;issue=35 -->
