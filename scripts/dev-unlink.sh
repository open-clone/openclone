#!/usr/bin/env bash
# Remove dev-link symlinks from the installed skill. If the path is tracked
# in the installed repo, the shipped version is restored from git.
#
# Usage:
#   scripts/dev-unlink.sh <relative-path> [<relative-path> ...]

set -euo pipefail

claude_config_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
installed="$claude_config_dir/skills/openclone"

if [ $# -eq 0 ]; then
  cat >&2 <<USAGE
Usage: $(basename "$0") <relative-path> [<relative-path> ...]
USAGE
  exit 1
fi

if [ ! -d "$installed" ]; then
  echo "error: installed skill not found at $installed" >&2
  exit 1
fi

for rel in "$@"; do
  rel="${rel#./}"
  rel="${rel#/}"
  rel="${rel%/}"
  case "$rel" in
    ""|..|../*|*/../*|*/..)
      echo "refuse: $rel (path traversal not allowed)" >&2
      continue
      ;;
  esac
  dst="$installed/$rel"
  if [ -L "$dst" ]; then
    rm "$dst"
    echo "unlinked: $dst"
    if (cd "$installed" && git ls-files --error-unmatch -- "$rel" >/dev/null 2>&1); then
      (cd "$installed" && git checkout -- "$rel")
      echo "restored from git: $rel"
    fi
  elif [ -e "$dst" ]; then
    echo "skip: $dst is not a symlink"
  else
    echo "skip: $dst does not exist"
  fi
done
