---
description: Activate an openclone clone — every following message will be answered as this clone until /openclone:stop
argument-hint: <clone-name>
allowed-tools: Bash, Glob, Read, Write
---

Activate the openclone clone named `$1` so that subsequent user messages in this session are answered in that clone's voice. Clone names are globally unique — each clone is one folder containing `persona.md` and optionally a `knowledge/` subdirectory.

Steps:

1. If `$1` is empty, tell the user the usage is `/openclone:use <clone-name>` and list available clones (merging user + built-in, user wins on name collision) by running:

   ```bash
   { ls -1d ~/.openclone/clones/*/ 2>/dev/null; ls -1d "${CLAUDE_PLUGIN_ROOT}/clones/"*/ 2>/dev/null; } | sed 's|/$||;s|.*/||' | sort -u
   ```

   Stop after showing the list.

2. Find the clone folder. Look in user clones first, then fall back to built-in:
   - `~/.openclone/clones/$1/persona.md` (user clone — wins on name collision)
   - `${CLAUDE_PLUGIN_ROOT}/clones/$1/persona.md` (built-in clone shipped with the plugin)

   If neither exists: tell the user `$1` was not found and suggest `/openclone:list`. Stop. Remember which path was resolved so you can mention the origin in the confirmation line.

3. If the resolved clone is a built-in, lazy-fetch its built-in knowledge so the hook can reference real files. This is a no-op after the first call:

   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/fetch-clone-knowledge.sh" "$1"
   ```

   Skip this step for user clones (their knowledge lives under `~/.openclone/` and is already local).

4. Ensure `~/.openclone/` exists, then write the clone name (no whitespace, no newline issues) to `~/.openclone/active-clone`:

   ```bash
   mkdir -p ~/.openclone
   printf '%s' "<name>" > ~/.openclone/active-clone
   ```

5. Read the `persona.md` briefly to confirm the frontmatter (`display_name`, `categories`, `primary_category`, `tagline`). Report in one or two lines, including the origin:
   > Active clone set to **{display_name}** ({primary_category or categories[0]} lens, categories: {categories}, origin: {user | built-in}). Your next message will be answered as this clone. Run `/openclone:stop` to deactivate.

   If origin is `built-in`, add a second line:
   > Note: this is a built-in clone (read-only). To customize, copy the folder to `~/.openclone/clones/{name}/` and edit there.

Do not roleplay as the clone in this command response — this is a system-level confirmation. The hook will take over from the next user message.
