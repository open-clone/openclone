#!/usr/bin/env bash
# Lazy-fetch a clone's built-in knowledge via partial+sparse git.
#
# The skill is cloned with --filter=blob:none --sparse in non-cone mode, where
# the default pattern includes everything EXCEPT clones/*/knowledge/. This script
# adds the specific clone's knowledge directory to the sparse-checkout, which
# materializes just that clone's files (blobs auto-fetched from the promisor remote).
#
# Usage: fetch-clone-knowledge.sh <slug>
# Exit 0 on success (including "nothing to fetch"); exit 1 only on bad args.

set -eu

slug="${1:-}"
if [ -z "$slug" ]; then
  echo "usage: fetch-clone-knowledge.sh <slug>" >&2
  exit 1
fi

install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$install_dir"

# Not a git checkout (e.g., hand-copied layout for dev) — knowledge is either
# already present or absent; nothing we can do. Silent success.
[ -d ".git" ] || exit 0

knowledge_path="clones/$slug/knowledge"

# Nothing to fetch if this clone has no built-in knowledge folder in the tree.
if ! git ls-tree -d --name-only HEAD "$knowledge_path" >/dev/null 2>&1; then
  exit 0
fi

# Already materialized with content — no-op.
if [ -d "$knowledge_path" ] && [ -n "$(ls -A "$knowledge_path" 2>/dev/null)" ]; then
  exit 0
fi

# Partial clone auto-fetches missing blobs when checkout touches them.
# In non-cone mode, `add` appends an inclusion pattern that overrides the
# `!/clones/*/knowledge/` exclusion from the base pattern set.
GIT_TERMINAL_PROMPT=0 git sparse-checkout add "$knowledge_path" >/dev/null 2>&1 || true

# Force checkout in case sparse-checkout add did not materialize (older git).
GIT_TERMINAL_PROMPT=0 git checkout -- "$knowledge_path" >/dev/null 2>&1 || true

exit 0
