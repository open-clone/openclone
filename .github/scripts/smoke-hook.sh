#!/usr/bin/env bash
# Smoke-test hooks/inject-active-clone.sh across key states.
#
# Every user prompt goes through this hook, and a malformed JSON emission
# silently drops the additionalContext (Claude Code ignores invalid hook
# output) — so regressions here are easy to miss by eyeball review.
#
# Strategy: spin up an isolated $HOME under mktemp, seed the relevant
# ~/.openclone/ state files, run the hook against the real repo (so the
# built-in clone resolution path is exercised), and verify the output parses
# as JSON. Expected content tags are grep'd to catch silent mode-selection
# bugs (e.g. room mode fallthrough).
#
# Note: only the python3 JSON-escaping path is exercised here, since CI has
# python3. The sed/awk fallback branch must be tested manually.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
hook="$root/hooks/inject-active-clone.sh"

if [ ! -x "$hook" ] && [ ! -f "$hook" ]; then
  printf '[FAIL] hook not found at %s\n' "$hook" >&2
  exit 1
fi

fail() { printf '[FAIL] %s\n' "$*" >&2; exit 1; }
ok()   { printf '[OK]   %s\n' "$*"; }

validate_json() {
  local desc="$1" output="$2"
  if ! printf '%s' "$output" | python3 -c 'import json,sys; json.load(sys.stdin)' >/dev/null 2>&1; then
    printf -- '--- raw output ---\n%s\n--- end ---\n' "$output" >&2
    fail "$desc: hook emitted invalid JSON"
  fi
  ok "$desc (valid JSON)"
}

contains() {
  local desc="$1" output="$2" needle="$3"
  if ! printf '%s' "$output" | grep -q -- "$needle"; then
    printf -- '--- raw output ---\n%s\n--- end ---\n' "$output" >&2
    fail "$desc: missing expected token <$needle>"
  fi
  ok "$desc (contains $needle)"
}

# Reset $HOME to a fresh temp dir. `export` needs to happen in the parent
# shell (not a command-substitution subshell) so the child `bash "$hook"` call
# inherits it, so this function updates the caller's $HOME directly.
home=""
make_home() {
  home=$(mktemp -d -t openclone-smoke.XXXXXX)
  export HOME="$home"
  mkdir -p "$HOME/.openclone"
}

cleanup_home() {
  if [ -n "$home" ] && [ -d "$home" ]; then
    rm -rf "$home"
  fi
  home=""
}
trap cleanup_home EXIT

# Case 1: no state → empty JSON "{}" (valid, no side-effects).
make_home
out=$(bash "$hook" </dev/null)
validate_json "no state" "$out"
cleanup_home

# Case 2: active-clone pointing at a shipped built-in (douglas).
make_home
printf 'douglas' > "$HOME/.openclone/active-clone"
out=$(bash "$hook" </dev/null)
validate_json "active-clone (built-in)" "$out"
contains "active-clone (built-in)" "$out" "openclone-active-clone"
cleanup_home

# Case 3: active-clone pointing at a non-existent slug → silent "{}".
make_home
printf 'does-not-exist' > "$HOME/.openclone/active-clone"
out=$(bash "$hook" </dev/null)
validate_json "active-clone (missing slug)" "$out"
cleanup_home

# Case 4: room mode with two resolvable built-in members.
make_home
printf 'douglas\ngbjeong\n' > "$HOME/.openclone/room"
out=$(bash "$hook" </dev/null)
validate_json "room mode" "$out"
contains "room mode" "$out" "openclone-room"
cleanup_home

# Case 5: force-push banner composed on top of active-clone mode.
make_home
printf 'douglas' > "$HOME/.openclone/active-clone"
printf 'local_head=abc\norigin_head=def\ndetected_at=now\n' \
  > "$HOME/.openclone/force-push-detected"
out=$(bash "$hook" </dev/null)
validate_json "force-push banner" "$out"
contains "force-push banner" "$out" "openclone-upgrade-needed"
cleanup_home

printf '\n[OK] hook smoke tests passed (5 cases)\n'
