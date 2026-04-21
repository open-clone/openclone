---
description: List all openclone clones with their categories, marking the active one
allowed-tools: Bash, Read
---

List every openclone clone the user has defined, showing each clone's categories as tags, with the active clone marked.

Steps:

1. If `~/.openclone/clones/` does not exist or has no `.md` files, tell the user they have no clones yet and suggest `/oc-new <name>`. Stop.

2. Read the active clone name from `~/.openclone/active-clone` (may not exist).

3. For each `.md` file directly under `~/.openclone/clones/` (no recursion — storage is flat), read the frontmatter to extract `display_name`, `tagline`, `categories`, `primary_category`.

4. Render a compact list, one line per clone:

   ```
   - douglas       권도균 — 프라이머 대표                 [founder*, vc]   [active]
   - mk            Min-Kyu — Backend, distributed systems  [dev*]
   ```

   - Format: `- <name>   <display_name> — <tagline>   [<categories with primary marked by *>]   [active]?`
   - Primary category in the categories bracket is marked with a trailing `*`.
   - The `[active]` tag only appears for the currently active clone.
   - If no tagline, show just the display_name.

5. At the end, print a one-line hint:
   > Run `/oc-use <name>` to activate one, or `/oc-new <name>` to create a new clone.
