#!/usr/bin/env bash
# SessionStart hook: background git pull for auto-update. gstack-style.
#
# Forks to background immediately so session start is never blocked.
# Throttled to once per hour via ~/.openclone/last-update-check mtime.
# Always exits 0 — network/git failures never break the session.
#
# Disable: touch ~/.openclone/no-auto-update

state_dir="$HOME/.openclone"
mkdir -p "$state_dir" 2>/dev/null || true

# user opted out
[ -f "$state_dir/no-auto-update" ] && exit 0

# Fork to background and return immediately. The foreground call exits 0
# before git pull even starts, so SessionStart timeout is not a concern.
if [ "${1:-}" != "__bg" ]; then
  # nohup + setsid-like detach: redirect all stdio, background, disown.
  nohup "$0" __bg </dev/null >/dev/null 2>&1 &
  disown 2>/dev/null || true
  exit 0
fi

# --- background branch below ---

check_file="$state_dir/last-update-check"
log_file="$state_dir/last-update.log"
upgrade_marker="$state_dir/just-upgraded-from"

# Throttle: skip if checked within the last hour. 3600 seconds.
if [ -f "$check_file" ]; then
  now=$(date +%s)
  last=$(stat -f %m "$check_file" 2>/dev/null || stat -c %Y "$check_file" 2>/dev/null || echo 0)
  if [ $((now - last)) -lt 3600 ]; then
    exit 0
  fi
fi

# Touch first so concurrent session starts don't all race in.
touch "$check_file"

install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$install_dir" 2>/dev/null || exit 0

# Must be a git checkout to update.
[ -d ".git" ] || exit 0

old_head=$(git rev-parse HEAD 2>/dev/null || true)
force_push_marker="$state_dir/force-push-detected"

{
  printf '[%s] openclone session-update: fetch + ff-check\n' "$(date '+%Y-%m-%d %H:%M:%S')"

  # Force refspec so fetch succeeds even when origin/main was rewritten.
  if ! GIT_TERMINAL_PROMPT=0 git fetch origin "+refs/heads/main:refs/remotes/origin/main" --quiet 2>&1; then
    printf '[%s] fetch failed (offline?), skipping\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    exit 0
  fi

  if git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
    GIT_TERMINAL_PROMPT=0 git merge --ff-only origin/main --quiet 2>&1
    printf '[%s] ff merge done (exit %d)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$?"
    # We caught up to origin/main — any prior force-push marker is obsolete.
    rm -f "$force_push_marker" 2>/dev/null || true
  else
    # Force-push or divergent history. Do NOT auto-reset — user may have local
    # edits (persona tuning, new clone folders, README forks). Record a marker;
    # the UserPromptSubmit hook surfaces it as a banner next time.
    remote_head=$(git rev-parse origin/main 2>/dev/null || echo unknown)
    printf '[%s] non-fast-forward detected (local=%s origin/main=%s); writing marker\n' \
      "$(date '+%Y-%m-%d %H:%M:%S')" "${old_head:0:10}" "${remote_head:0:10}"
    {
      printf 'local_head=%s\n' "$old_head"
      printf 'origin_head=%s\n' "$remote_head"
      printf 'detected_at=%s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    } > "$force_push_marker" 2>/dev/null || true
  fi
} > "$log_file" 2>&1

new_head=$(git rev-parse HEAD 2>/dev/null || true)

if [ -n "$old_head" ] && [ -n "$new_head" ] && [ "$old_head" != "$new_head" ]; then
  printf '%s\n' "$old_head" > "$upgrade_marker"
fi

# Layout migration for installs that predate the clones/<name>/knowledge layout:
# old installs use cone-mode sparse-checkout including `clones` (cone implicitly
# pulls the new knowledge subdirs too, which defeats the lazy-fetch design).
# Switch to non-cone with `/*` + `!/clones/*/knowledge/` and re-materialize the
# currently-active clone's knowledge if it exists in the new tree.
is_cone=$(git config --local --get core.sparseCheckoutCone 2>/dev/null || echo "")
if [ "$is_cone" = "true" ] && [ -f ".git/info/sparse-checkout" ]; then
  {
    printf '[%s] openclone: migrating sparse-checkout to non-cone layout\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    if GIT_TERMINAL_PROMPT=0 git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' 2>&1; then
      active=""
      if [ -f "$HOME/.openclone/active-clone" ]; then
        active=$(tr -d '[:space:]' < "$HOME/.openclone/active-clone" 2>/dev/null || true)
      fi
      # Slug validation before using `active` as a path segment.
      if [ -n "$active" ] \
         && [ "${#active}" -le 64 ] \
         && printf '%s' "$active" | grep -Eq '^[a-z0-9][a-z0-9-]*$' \
         && git ls-tree -d --name-only HEAD "clones/$active/knowledge" >/dev/null 2>&1; then
        GIT_TERMINAL_PROMPT=0 git sparse-checkout add "clones/$active/knowledge" >/dev/null 2>&1 || true
        GIT_TERMINAL_PROMPT=0 git checkout -- "clones/$active/knowledge" >/dev/null 2>&1 || true
        printf '[%s] openclone: re-materialized clones/%s/knowledge\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$active"
      fi
      printf '[%s] openclone: migration done\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    else
      printf '[%s] openclone: migration failed (continuing)\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    fi
  } >> "$log_file" 2>&1
fi

exit 0
