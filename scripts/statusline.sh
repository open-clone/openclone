#!/usr/bin/env bash
# openclone statusline — renders a single line for Claude Code's statusLine hook.
#
# Output contract:
#   - stdout: exactly one line, possibly empty
#   - exit 0 always (statusline must never error visibly)
#
# Display rules (first matching rule wins):
#   1. ~/.openclone/room exists & non-empty → "[display_name, … +N] 클론들과 대화중"
#      (truncate to first 3 members + "+N" if longer)
#   2. ~/.openclone/active-clone exists & non-empty →
#      "[display_name] (직책) 클론으로 대화중" (direction stripped to
#      "openclone · <slug>" if persona.md cannot be resolved)
#   3. otherwise → print nothing

set -u

install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
room_file="$HOME/.openclone/room"
active_file="$HOME/.openclone/active-clone"

# Defensive slug validation — state files are read from disk, so treat their
# contents as untrusted and reject anything that isn't a valid clone slug.
is_valid_slug() {
  local s="${1-}"
  [ -n "$s" ] || return 1
  [ "${#s}" -le 64 ] || return 1
  case "$s" in
    [a-z0-9]*) ;;
    *) return 1 ;;
  esac
  case "$s" in
    *[!a-z0-9-]*) return 1 ;;
  esac
  return 0
}

C_NAME=$'\033[1;35m'
C_ROLE=$'\033[2m'
C_OFF=$'\033[0m'

resolve_persona_file() {
  local slug="$1" f
  is_valid_slug "$slug" || return 1
  f="$HOME/.openclone/clones/$slug/persona.md"
  [ -f "$f" ] && { printf '%s\n' "$f"; return 0; }
  f="$install_dir/clones/$slug/persona.md"
  [ -f "$f" ] && { printf '%s\n' "$f"; return 0; }
  return 1
}

frontmatter_get() {
  local file="$1" key="$2"
  awk -v k="$key" '
    /^---[[:space:]]*$/ { fm++; if (fm == 2) exit; next }
    fm == 1 {
      if (index($0, k ":") == 1) {
        v = substr($0, length(k) + 2)
        sub(/^[[:space:]]+/, "", v)
        sub(/[[:space:]]+$/, "", v)
        print v
        exit
      }
    }
  ' "$file" 2>/dev/null
}

first_category() {
  local file="$1"
  awk '
    /^---[[:space:]]*$/ { fm++; if (fm == 2) exit; next }
    fm == 1 && /^categories:[[:space:]]*\[/ {
      line = $0
      sub(/^categories:[[:space:]]*\[/, "", line)
      sub(/\].*$/, "", line)
      n = split(line, parts, ",")
      if (n > 0) {
        v = parts[1]
        sub(/^[[:space:]]+/, "", v)
        sub(/[[:space:]]+$/, "", v)
        print v
        exit
      }
    }
  ' "$file" 2>/dev/null
}

role_label() {
  local file="$1" key
  key=$(frontmatter_get "$file" "primary_category")
  [ -z "$key" ] && key=$(first_category "$file")
  case "$key" in
    vc) printf '투자자' ;;
    tech) printf '엔지니어' ;;
    founder) printf '창업자' ;;
    expert) printf '전문가' ;;
    influencer) printf '인플루언서' ;;
    politician) printf '정치인' ;;
    celebrity) printf '연예인' ;;
    '') return 1 ;;
    *) printf '%s' "$key" ;;
  esac
}

# Prefer the first sentence of `tagline` (e.g. "프라이머 대표.") as the role
# label since it's more specific than a category token. Fallback to the
# category label if tagline is missing.
persona_title() {
  local file="$1" tagline head
  tagline=$(frontmatter_get "$file" "tagline")
  if [ -n "$tagline" ]; then
    head="${tagline%%.*}"
    if [ -n "$head" ]; then
      printf '%s' "$head"
      return 0
    fi
  fi
  role_label "$file"
}

display_name_or_slug() {
  local slug="$1" file dn
  if file=$(resolve_persona_file "$slug"); then
    dn=$(frontmatter_get "$file" "display_name")
    if [ -n "$dn" ]; then
      printf '%s' "$dn"
      return 0
    fi
  fi
  printf '%s' "$slug"
}

render_active_clone() {
  local slug="$1" file role name
  if ! file=$(resolve_persona_file "$slug"); then
    printf 'openclone · %s\n' "$slug"
    return 0
  fi
  name=$(frontmatter_get "$file" "display_name")
  [ -z "$name" ] && name="$slug"
  role=$(persona_title "$file" || true)
  if [ -n "$role" ]; then
    printf '%s[%s - %s]%s 클론으로 대화중\n' \
      "$C_NAME" "$name" "$role" "$C_OFF"
  else
    printf '%s[%s]%s 클론으로 대화중\n' \
      "$C_NAME" "$name" "$C_OFF"
  fi
}

render_room() {
  local slugs=()
  while IFS= read -r raw || [ -n "$raw" ]; do
    local s
    s=$(printf '%s' "$raw" | tr -d '[:space:]')
    is_valid_slug "$s" && slugs+=("$s")
  done < "$room_file"

  local count=${#slugs[@]}
  [ "$count" -gt 0 ] || return 1

  local names=()
  local i upper=$count
  [ "$upper" -gt 3 ] && upper=3
  for (( i=0; i<upper; i++ )); do
    names+=("$(display_name_or_slug "${slugs[$i]}")")
  done
  local joined="${names[0]}"
  for (( i=1; i<upper; i++ )); do
    joined="${joined}, ${names[$i]}"
  done
  if [ "$count" -gt 3 ]; then
    joined="${joined} +$((count - 3))"
  fi
  printf '%s[%s]%s 클론들과 대화중\n' "$C_NAME" "$joined" "$C_OFF"
  return 0
}

if [ -f "$room_file" ] && [ -s "$room_file" ]; then
  if render_room; then
    exit 0
  fi
fi

if [ -f "$active_file" ] && [ -s "$active_file" ]; then
  slug=$(tr -d '[:space:]' < "$active_file" 2>/dev/null || true)
  if is_valid_slug "$slug"; then
    render_active_clone "$slug"
    exit 0
  fi
fi

exit 0
