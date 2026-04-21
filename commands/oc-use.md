---
description: Activate an openclone clone — every following message will be answered as this clone until /oc-stop
argument-hint: <clone-name>
allowed-tools: Bash, Glob, Read, Write
---

Activate the openclone clone named `$1` so that subsequent user messages in this session are answered in that clone's voice. Clone names are globally unique — a clone can belong to multiple categories, but it is one file and one activation target.

Steps:

1. If `$1` is empty, tell the user the usage is `/oc-use <clone-name>` and list available clones by running:
   ```bash
   ls -1 ~/.openclone/clones/*.md 2>/dev/null | sed 's|.*/||;s|\.md$||'
   ```
   Stop after showing the list.

2. Find the clone file at `~/.openclone/clones/$1.md`.
   - If it does not exist: tell the user `$1` was not found and suggest `/oc-list`. Stop.

3. Ensure `~/.openclone/` exists, then write the clone name (no whitespace, no newline issues) to `~/.openclone/active-clone`:
   ```bash
   mkdir -p ~/.openclone
   printf '%s' "<name>" > ~/.openclone/active-clone
   ```

4. Read the clone file briefly to confirm the frontmatter (`display_name`, `categories`, `primary_category`, `tagline`). Report in one or two lines:
   > Active clone set to **{display_name}** ({primary_category or categories[0]} lens, categories: {categories}). Your next message will be answered as this clone. Run `/oc-stop` to deactivate.

Do not roleplay as the clone in this command response — this is a system-level confirmation. The hook will take over from the next user message.
