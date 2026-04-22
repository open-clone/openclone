---
description: Create a new openclone clone through an interactive interview. At least one category is required (multiple allowed).
argument-hint: <clone-name>
allowed-tools: Read, Write, Bash, Glob
---

Create a new openclone clone named `$1` by interviewing the user and writing a folder-per-clone structure under `~/.openclone/clones/<name>/`.

## Preflight

1. If `$1` is empty, tell the user usage is `/openclone:new <clone-name>` and stop.

2. Validate `$1` matches `^[a-z0-9][a-z0-9-]*$`. If not, ask the user for a lowercase slug name.

3. Check for name collisions in BOTH locations:
   - `~/.openclone/clones/$1/persona.md` — if this user clone exists, tell the user and ask whether to cancel, pick a different name, or overwrite the folder.
   - `${CLAUDE_PLUGIN_ROOT}/clones/$1/persona.md` — if a built-in clone with this name exists, tell the user: "A built-in clone `$1` already exists. Creating a user clone with the same name will shadow it in `/openclone:list`, `/openclone:use`, and panel commands. Proceed, pick a different name, or cancel?" Do not touch the built-in — user folders always go to `~/.openclone/clones/`.

## Run the interview

Load `${CLAUDE_PLUGIN_ROOT}/references/interview-workflow.md` and follow it exactly. Key reminders:

- At least **one** category is required (from `vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`). Multiple are allowed for people who genuinely operate in more than one role.
- If the user typed `/openclone:new hayun vc` or `/openclone:new hayun vc,founder`, parse the remaining args as the categories list. Otherwise ask.
- One question per turn.
- Do not consolidate until the user signals done or all stages complete.

## Consolidate

When the interview ends:

1. Create the clone folder:

   ```bash
   mkdir -p "$HOME/.openclone/clones/<name>/knowledge"
   ```

2. Write the persona file at `~/.openclone/clones/<name>/persona.md` following `${CLAUDE_PLUGIN_ROOT}/references/clone-schema.md`. Use today's date for `created`. Fill `voice_traits` with 3–5 short tags inferred from Stage 4 answers. Set `categories` to the list the user chose. If the user picked more than one category **and** their answers indicate different framing per role, include a `## Category-specific framing` section with one `### As a <category>` block per category. Also set `primary_category` — ask the user or default to the first one they named.

3. Write the raw interview as the clone's first knowledge entry at `~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-interview.md` (where `YYYY-MM-DD` is today). Use the `source_type: interview` frontmatter. Format the body as `### Q: ...` / `A: ...` pairs — this is the only case where the raw form is preserved verbatim as knowledge, since the interview already reflects the clone's first-person answers.

4. Report in one or two lines:
   > Created **{display_name}** at `~/.openclone/clones/{name}/` ({categories}). Run `/openclone:use {name}` to start a conversation.

Do not roleplay as the clone during or right after creation — this is a system-level workflow. The user will opt in via `/openclone:use`.
