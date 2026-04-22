#!/usr/bin/env bash
# openclone statusline — renders a single line for Claude Code's statusLine hook.
#
# Output contract:
#   - stdout: exactly one line, possibly empty
#   - exit 0 always (statusline must never error visibly)
#
# Display rules (first matching rule wins):
#   1. ~/.openclone/room exists & non-empty → "openclone · room: a, b, c"
#      (truncate to first 3 members + "+N" if longer)
#   2. ~/.openclone/active-clone exists & non-empty → "openclone · <name>"
#   3. otherwise → print nothing

set -u

room_file="$HOME/.openclone/room"
active_file="$HOME/.openclone/active-clone"

render_room() {
  local members=()
  while IFS= read -r raw || [ -n "$raw" ]; do
    local name
    name=$(printf '%s' "$raw" | tr -d '[:space:]')
    [ -n "$name" ] && members+=("$name")
  done < "$room_file"

  local count=${#members[@]}
  [ "$count" -gt 0 ] || return 1

  local joined="${members[0]}"
  local i
  local upper=$count
  [ "$upper" -gt 3 ] && upper=3
  for (( i=1; i<upper; i++ )); do
    joined="${joined}, ${members[$i]}"
  done
  if [ "$count" -gt 3 ]; then
    local rest=$((count - 3))
    joined="${joined} +${rest}"
  fi
  printf 'openclone · room: %s\n' "$joined"
  return 0
}

if [ -f "$room_file" ] && [ -s "$room_file" ]; then
  if render_room; then
    exit 0
  fi
fi

if [ -f "$active_file" ] && [ -s "$active_file" ]; then
  name=$(tr -d '[:space:]' < "$active_file" 2>/dev/null || true)
  if [ -n "$name" ]; then
    printf 'openclone · %s\n' "$name"
    exit 0
  fi
fi

exit 0
