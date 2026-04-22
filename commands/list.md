---
description: List all openclone clones with their categories, marking the active one
allowed-tools: Bash, Read
---

List every openclone clone available (both built-in clones shipped with the plugin and user clones), showing each clone's categories as tags, with the active clone marked and the origin distinguished.

Each clone is a **folder** under `clones/` containing a `persona.md` and an optional `knowledge/` subdirectory.

Steps:

1. Collect clone folders from both sources:
   - Built-in: every subdirectory under `${CLAUDE_PLUGIN_ROOT}/clones/` that contains a `persona.md`
   - User: every subdirectory under `~/.openclone/clones/` that contains a `persona.md`

   If both locations are missing or empty, tell the user they have no clones yet and suggest `/openclone:new <name>`. Stop.

2. Deduplicate by folder name (the `<name>` slug). When the same name exists in both locations, the user version wins — use the user folder and mark it with `[user, overrides built-in]` instead of plain `[user]`. Skip the built-in copy.

3. Read the active clone name from `~/.openclone/active-clone` (may not exist).

4. For each resulting clone, read the `persona.md` frontmatter to extract `display_name`, `tagline`, `categories`, `primary_category`, and track its origin (`built-in`, `user`, or `user, overrides built-in`). Count knowledge files in the clone's `knowledge/` directory (may not exist).

5. Render a compact list, one line per clone. Group by origin — built-in first, user second — with a simple subheading before each group:

   ```text
   Built-in:
     - douglas       권도균 — 프라이머 대표                 [founder*, vc]   (knowledge: 0)

   User:
     - mk            Min-Kyu — Backend, distributed systems  [dev*]            (knowledge: 3)   [active]
   ```

   - Format per line: `- <name>   <display_name> — <tagline>   [<categories with primary marked by *>]   (knowledge: <count>)   [active]?`
   - Primary category in the categories bracket is marked with a trailing `*`.
   - The `[active]` tag only appears for the currently active clone.
   - If no tagline, show just the display_name.
   - If a group is empty, skip its subheading.

6. At the end, print a one-line hint:
   > Run `/openclone:use <name>` to activate one, or `/openclone:new <name>` to create a new clone. Built-in clones are read-only — to customize, copy the folder to `~/.openclone/clones/` first.
