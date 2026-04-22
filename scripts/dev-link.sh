#!/usr/bin/env bash
# Overlay workspace files into the installed skill via symlink so edits are
# picked up live without copying.
#
# Targets ~/.claude/skills/openclone (the sparse install).
# Only the paths you pass get overlaid — the rest of the install is untouched.
#
# Usage:
#   scripts/dev-link.sh <relative-path> [<relative-path> ...]
#
# Examples:
#   scripts/dev-link.sh references/panel-workflow.md
#   scripts/dev-link.sh SKILL.md
#   scripts/dev-link.sh references/

set -euo pipefail

workspace="$(cd "$(dirname "$0")/.." && pwd)"
installed="$HOME/.claude/skills/openclone"

if [ $# -eq 0 ]; then
  cat >&2 <<USAGE
Usage: $(basename "$0") <relative-path> [<relative-path> ...]

Examples:
  $(basename "$0") references/panel-workflow.md
  $(basename "$0") SKILL.md
  $(basename "$0") references/
USAGE
  exit 1
fi

if [ ! -d "$installed" ]; then
  echo "error: installed skill not found at $installed" >&2
  echo "install openclone first — see README." >&2
  exit 1
fi

for rel in "$@"; do
  rel="${rel#./}"
  rel="${rel#/}"
  rel="${rel%/}"
  src="$workspace/$rel"
  dst="$installed/$rel"
  if [ ! -e "$src" ]; then
    echo "skip: $rel (not in workspace)" >&2
    continue
  fi
  mkdir -p "$(dirname "$dst")"
  # If dst is an existing real directory (not a symlink), remove it so the
  # symlink replaces it instead of being created inside it.
  if [ -d "$dst" ] && [ ! -L "$dst" ]; then
    rm -rf "$dst"
  fi
  ln -sfn "$src" "$dst"
  echo "linked: $dst -> $src"
done

cat <<NOTE

Done. Edits in the workspace now flow directly to Claude Code.
  - SKILL.md / references / personas: live on next slash command.
  - hooks (hooks/*.sh): restart Claude Code.

To prevent auto-update from running git pull against the installed path
while symlinks are in place:
  touch ~/.openclone/no-auto-update

Undo: scripts/dev-unlink.sh <same paths>
NOTE
