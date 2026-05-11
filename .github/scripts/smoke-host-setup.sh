#!/usr/bin/env bash
# Smoke-test host setup/uninstall and Codex runtime context emission.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"

fail() { printf '[FAIL] %s\n' "$*" >&2; exit 1; }
ok() { printf '[OK]   %s\n' "$*"; }

tmp=""
cleanup() {
  if [ -n "$tmp" ] && [ -d "$tmp" ]; then
    rm -rf "$tmp"
  fi
}
trap cleanup EXIT

copy_worktree() {
  local dest="$1"
  mkdir -p "$dest"
  # Copy the working tree, including uncommitted edits, but skip generated/heavy
  # directories. The copied checkout intentionally has no .git; setup must handle
  # non-git skill directories gracefully.
  (
    cd "$root"
    tar \
      --exclude='./.git' \
      --exclude='./node_modules' \
      --exclude='./dist' \
      --exclude='./.context' \
      -cf - .
  ) | (
    cd "$dest"
    tar -xf -
  )
}

tmp=$(mktemp -d -t openclone-host-smoke.XXXXXX)
home="$tmp/home"
mkdir -p "$home"

# --- Claude Code host ---
claude_config_dir="$tmp/claude"
claude_install_dir="$claude_config_dir/skills/openclone"
copy_worktree "$claude_install_dir"

(
  cd "$claude_install_dir"
  HOME="$home" CLAUDE_CONFIG_DIR="$claude_config_dir" ./setup --host claude >/dev/null
)

settings_file="$claude_config_dir/settings.json"
[ -f "$settings_file" ] || fail "Claude settings.json was not created"
python3 - "$settings_file" <<'PY' || fail "Claude setup did not write managed hooks/statusline"
import json, sys
data = json.load(open(sys.argv[1]))
managed = []
for groups in data.get("hooks", {}).values():
    for group in groups:
        managed.extend([h for h in group.get("hooks", []) if h.get("_openclone_managed") is True])
if len(managed) != 2:
    raise SystemExit(f"expected 2 managed hooks, got {len(managed)}")
if data.get("statusLine", {}).get("_openclone_managed") is not True:
    raise SystemExit("managed statusLine missing")
PY
ok "setup --host claude writes managed hooks and statusline"

(
  cd "$claude_install_dir"
  HOME="$home" CLAUDE_CONFIG_DIR="$claude_config_dir" ./setup >/dev/null
)
python3 - "$settings_file" <<'PY' || fail "Claude setup auto-detect is not idempotent"
import json, sys
data = json.load(open(sys.argv[1]))
managed = []
for groups in data.get("hooks", {}).values():
    for group in groups:
        managed.extend([h for h in group.get("hooks", []) if h.get("_openclone_managed") is True])
if len(managed) != 2:
    raise SystemExit(f"expected 2 managed hooks after rerun, got {len(managed)}")
PY
ok "setup auto-detect is idempotent for Claude path"

(
  cd "$claude_install_dir"
  HOME="$home" CLAUDE_CONFIG_DIR="$claude_config_dir" ./uninstall --host claude >/dev/null
)
if [ -d "$claude_install_dir" ]; then
  fail "uninstall did not delete Claude skill directory"
fi
python3 - "$settings_file" <<'PY' || fail "Claude uninstall left managed settings behind"
import json, sys
data = json.load(open(sys.argv[1]))
def has_managed(value):
    if isinstance(value, dict):
        return value.get("_openclone_managed") is True or any(has_managed(v) for v in value.values())
    if isinstance(value, list):
        return any(has_managed(v) for v in value)
    return False
if has_managed(data):
    raise SystemExit("managed marker still present")
PY
ok "uninstall --host claude removes managed settings and skill directory"

# --- Codex host ---
codex_home="$tmp/codex"
install_dir="$codex_home/skills/openclone"
copy_worktree "$install_dir"

(
  cd "$install_dir"
  HOME="$home" CODEX_HOME="$codex_home" ./setup --host codex >/dev/null
)

agents_file="$codex_home/AGENTS.md"
[ -f "$agents_file" ] || fail "Codex AGENTS.md was not created"
grep -q 'openclone-managed:start' "$agents_file" || fail "AGENTS.md missing managed start marker"
grep -q 'scripts/codex-context.sh' "$agents_file" || fail "AGENTS.md missing codex-context command"
ok "setup --host codex writes managed AGENTS.md block"

(
  cd "$install_dir"
  HOME="$home" CODEX_HOME="$codex_home" ./setup >/dev/null
)
marker_count=$(grep -c 'openclone-managed:start' "$agents_file" || true)
[ "$marker_count" -eq 1 ] || fail "setup is not idempotent; marker count=$marker_count"
ok "setup auto-detect is idempotent for Codex path"

mkdir -p "$home/.openclone"
printf 'douglas' > "$home/.openclone/active-clone"
out=$(HOME="$home" CODEX_HOME="$codex_home" bash "$install_dir/scripts/codex-context.sh")
printf '%s' "$out" | grep -q 'openclone-active-clone' || fail "codex-context did not emit active clone context"
ok "codex-context emits active clone context"

printf 'douglas\ngbjeong\n' > "$home/.openclone/room"
out=$(HOME="$home" CODEX_HOME="$codex_home" bash "$install_dir/scripts/codex-context.sh")
printf '%s' "$out" | grep -q 'openclone-room' || fail "codex-context did not emit room context"
ok "codex-context emits room context"

(
  cd "$install_dir"
  HOME="$home" CODEX_HOME="$codex_home" ./uninstall --host codex >/dev/null
)

if [ -d "$install_dir" ]; then
  fail "uninstall did not delete Codex skill directory"
fi
if grep -q 'openclone-managed:start' "$agents_file"; then
  fail "uninstall did not remove managed AGENTS.md block"
fi
ok "uninstall --host codex removes managed block and skill directory"

printf '\n[OK] host setup smoke tests passed\n'
