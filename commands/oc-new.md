---
description: Create a new openclone clone through an interactive interview. At least one category is required (multiple allowed).
argument-hint: <clone-name>
allowed-tools: Read, Write, Bash, Glob
---

Create a new openclone clone named `$1` by interviewing the user and consolidating answers into a single flat clone file.

## Preflight

1. If `$1` is empty, tell the user usage is `/oc-new <clone-name>` and stop.

2. Validate `$1` matches `^[a-z0-9][a-z0-9-]*$`. If not, ask the user for a lowercase slug name.

3. Check for name collision at `~/.openclone/clones/$1.md`. If the file exists, tell the user and ask whether to cancel, pick a different name, or overwrite.

## Run the interview

Load `${CLAUDE_PLUGIN_ROOT}/references/interview-workflow.md` and follow it exactly. Key reminders:

- At least **one** category is required (from `vc`, `dev`, `founder`, `pm`, `designer`, `writer`). Multiple are allowed for people who genuinely operate in more than one role.
- If the user typed `/oc-new hayun vc` or `/oc-new hayun vc,founder`, parse the remaining args as the categories list. Otherwise ask.
- One question per turn.
- Do not consolidate until the user signals done or all stages complete.

## Consolidate

When the interview ends:

1. Create directories:
   ```bash
   mkdir -p "$HOME/.openclone/clones"
   mkdir -p "$HOME/.openclone/knowledge/<name>/sources"
   mkdir -p "$HOME/.openclone/knowledge/<name>/refined"
   ```

2. Write the clone file at `~/.openclone/clones/<name>.md` following `${CLAUDE_PLUGIN_ROOT}/references/clone-schema.md`. Use today's date for `created`. Fill `voice_traits` with 3–5 short tags inferred from Stage 4 answers. Set `categories` to the list the user chose. If the user picked more than one category **and** their answers indicate different framing per role, include a `## Category-specific framing` section with one `### As a <category>` block per category. Also set `primary_category` — ask the user or default to the first one they named.

3. Write the raw interview transcript at `~/.openclone/knowledge/<name>/sources/interview-YYYY-MM-DD.md`. Format as `### Q: ...` / `A: ...` pairs.

4. Report in one or two lines:
   > Created **{display_name}** at `~/.openclone/clones/{name}.md` ({categories}). Run `/oc-use {name}` to start a conversation.

Do not roleplay as the clone during or right after creation — this is a system-level workflow. The user will opt in via `/oc-use`.
