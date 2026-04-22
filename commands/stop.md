---
description: Deactivate the currently active openclone clone — future messages will be answered by default Claude
allowed-tools: Bash, Read
---

Deactivate any active openclone clone so the next user messages are handled by default Claude without persona injection.

Steps:

1. Check `~/.openclone/active-clone`. If it does not exist or is empty, tell the user there is no active clone and stop.

2. Read the current active clone name (for the confirmation message), then remove the file:

   ```bash
   rm -f ~/.openclone/active-clone
   ```

3. Confirm in one line:
   > Deactivated **{previous-clone-name}**. Chat is back to default Claude.

Do not roleplay in this response — this is a system confirmation.
