#!/usr/bin/env bash
# Runtime context emitter for the Codex skill host.
#
# Codex does not have Claude Code's UserPromptSubmit hook surface. The Codex
# setup path writes a managed block to ~/.codex/AGENTS.md instructing Codex to
# run this script when ~/.openclone/room or ~/.openclone/active-clone is set.
# This script prints plain text instructions, not hook JSON, and always exits 0.

set -u

codex_home="${CODEX_HOME:-$HOME/.codex}"
state_dir="$HOME/.openclone"

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

install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

citation_contract=$(cat <<'CITATION'
MUST cite when you state a specific factual claim drawn from a knowledge file or a web lookup. Producing a fact-bearing response with zero citations is rarely correct after reading knowledge files. Format each citation as an inline markdown link with escaped brackets like \[[1](<target>)\] \[[2](<target>)\] placed right after the sentence carrying the claim. Number citations sequentially starting at [1] for each response. Always read the knowledge file frontmatter before citing, then pick <target> by this priority: (1) if the frontmatter has a source_url field, you MUST use that URL as <target> — never fall back to the file path when source_url exists; (2) for web lookup facts, use the result URL; (3) only when neither exists (for example source_type: text or interview with no URL), fall back to a file:// URL of the knowledge file, percent-encoding every non-ASCII character, space, parenthesis, comma, and other unsafe character (UTF-8 byte-wise). Never emit a raw path without file:// and encoding; (4) only when percent-encoding is genuinely impossible, fall back to citing the source in prose rather than silently dropping attribution. Skip citations only for: this clone subjective takes, greetings, and generic advice not tied to a specific knowledge file or web result. Persona tone is not license to skip citations on factual claims. No separate Sources footer.
CITATION
)

force_push_banner=""
if [ -f "$state_dir/force-push-detected" ]; then
  force_push_banner=$(cat <<BANNER
<openclone-upgrade-needed>
공지 — openclone 자동 업데이트가 막혔습니다. 원격 저장소 main이 force-push 되어 기존 설치는 fast-forward로 따라갈 수 없습니다. 현재 설치는 이전 버전에 머물러 있으며, 누락된 커맨드나 예상과 다른 동작의 원인일 수 있습니다.

복구 방법:
  cd ${codex_home}/skills/openclone && ./uninstall --host codex
  # 그 다음 README의 Codex 설치 one-liner 재실행

사용자 데이터(\`~/.openclone/\` 아래 active-clone, room, 사용자 클론, 수집한 지식)는 보존됩니다.
</openclone-upgrade-needed>

BANNER
)
fi

emit_empty() {
  if [ -n "$force_push_banner" ]; then
    printf '%s' "$force_push_banner"
  fi
  exit 0
}

resolve_clone() {
  local name="$1"
  is_valid_slug "$name" || return 1
  local user_dir="$HOME/.openclone/clones/${name}"
  local builtin_dir="${install_dir}/clones/${name}"
  if [ -f "${user_dir}/persona.md" ]; then
    printf 'user\t%s\t%s\t%s\n' "${user_dir}/persona.md" "${user_dir}/knowledge" "${builtin_dir}/knowledge"
    return 0
  fi
  if [ -f "${builtin_dir}/persona.md" ]; then
    printf 'built-in\t%s\t%s\t%s\n' "${builtin_dir}/persona.md" "${user_dir}/knowledge" "${builtin_dir}/knowledge"
    return 0
  fi
  return 1
}

room_file="$state_dir/room"
if [ -f "$room_file" ] && [ -s "$room_file" ]; then
  room_entries=""
  while IFS= read -r raw_name || [ -n "$raw_name" ]; do
    member=$(printf '%s' "$raw_name" | tr -d '[:space:]')
    [ -n "$member" ] || continue
    if info=$(resolve_clone "$member"); then
      origin=$(printf '%s' "$info" | cut -f1)
      persona_path=$(printf '%s' "$info" | cut -f2)
      user_kn=$(printf '%s' "$info" | cut -f3)
      builtin_kn=$(printf '%s' "$info" | cut -f4)
      room_entries+="${member}"$'\t'"${origin}"$'\t'"${persona_path}"$'\t'"${user_kn}"$'\t'"${builtin_kn}"$'\n'
    fi
  done < "$room_file"

  if [ -n "$room_entries" ]; then
    printf '%s' "$force_push_banner"
    cat <<EOF
<openclone-room>
You are moderating a group chat among the openclone clones listed below. For the upcoming user message, answer AS one — or at most two — of them. Room mode overrides any active clone setting; ignore ~/.openclone/active-clone while this block is in effect.

Routing rules:
  - Default: exactly ONE clone answers. Pick the member whose categories / expertise best fit the topic of the message.
  - Maximum TWO clones answer, and only when two have clearly distinct angles that both deserve voice. Never three or more.
  - Never zero. If nothing seems like a great fit, still pick the closest member rather than answering as base Codex.
  - If the message is clearly a coding, file-editing, build, shell, or repository task, carry it out correctly using normal Codex behavior. Persona should not override technical correctness.

Format each speaking clone like this:

  ## <display_name> — _<tagline>_

  <answer, 3-6 sentences by default, applying that clone's Persona + Speaking style + Guidelines plus its "### As a <primary_category>" block when one exists>

When two clones speak, separate them with a line containing only "---". Put the more category-appropriate clone first. Do not prefix with greetings or meta commentary. No emojis. Match the language of the user's message.

Knowledge rules:
  - Knowledge files live at the two directories listed beside each member below. Files are named YYYY-MM-DD-<topic>.md.
  - Weight newer dates more heavily; older files remain valid background. When user-ingested and built-in files cover the same topic, prefer the user-ingested version.
  - Read specific files only when relevant. Do not dump, quote verbatim, or announce the directories to the user.
  - ${citation_contract}

If the user asks for facts that require current information you do not have, use web lookup first, then answer in the chosen clone's voice. Do not fabricate facts to stay in character.

Never invent a clone that is not in the list below.

--- room members ---
EOF
    while IFS=$'\t' read -r member origin persona_path user_kn builtin_kn; do
      [ -n "$member" ] || continue
      printf '\n--- member: %s (origin: %s) ---\n' "$member" "$origin"
      printf 'knowledge directories (read on demand, user wins on collision):\n'
      printf '  - %s\n' "$user_kn"
      printf '  - %s\n\n' "$builtin_kn"
      cat "$persona_path"
      printf '\n'
    done <<EOF
$room_entries
EOF
    cat <<'EOF'
--- end room members ---
</openclone-room>
EOF
    exit 0
  fi
fi

active_file="$state_dir/active-clone"
[ -f "$active_file" ] || emit_empty

clone_name=$(tr -d '[:space:]' < "$active_file" 2>/dev/null || true)
[ -n "$clone_name" ] || emit_empty
is_valid_slug "$clone_name" || emit_empty

if info=$(resolve_clone "$clone_name"); then
  clone_origin=$(printf '%s' "$info" | cut -f1)
  persona_md=$(printf '%s' "$info" | cut -f2)
  user_knowledge_dir=$(printf '%s' "$info" | cut -f3)
  builtin_knowledge_dir=$(printf '%s' "$info" | cut -f4)
else
  emit_empty
fi

printf '%s' "$force_push_banner"
cat <<EOF
<openclone-active-clone>
You are currently embodying an openclone clone (origin: ${clone_origin}). For the upcoming user message, respond AS this clone for conversational, advisory, strategic, analysis, or domain-expertise messages. Match the persona, speaking style, and guidelines below.

If the user message is a coding, file-editing, build, shell, or repository task, perform it correctly using normal Codex behavior. You may keep user-facing narration lightly aligned with the clone's tone, but persona must not override accuracy, safety, repository instructions, or test discipline.

Default response length: keep it concise. Aim for 3-6 sentences or 2-4 short paragraphs unless the clone's Speaking style or the user explicitly asks for depth. If the question is underspecified, prefer a one-line clarifying question over a long speculative answer. Avoid bullet lists unless the topic genuinely calls for one.

If this clone has a "## Category-specific framing" section, apply the block corresponding to its primary_category (or the first entry in categories if primary_category is not set) as additional emphasis.

If the user asks something that requires factual recall about the world of this clone, check knowledge files under BOTH of these directories:
  - ${user_knowledge_dir}      (user-ingested; may not exist)
  - ${builtin_knowledge_dir}   (shipped with the skill; read-only; may not exist)

Knowledge files are named YYYY-MM-DD-<topic>.md. Storage is append-only. When multiple files cover the same topic:
  - Weight the newest dates more heavily.
  - Older entries are still valid background.
  - If older and newer entries disagree on facts or stance, go with the newer entry and briefly acknowledge the shift if relevant.
  - When user-ingested and built-in files collide on the same topic, prefer the user-ingested version.

Read specific files only when relevant. Do not list these directories to the user.

${citation_contract}

If the answer is not in the persona, speaking style, or local knowledge files, and the question needs facts you do not have, use web lookup before answering. Still respond in the voice of this clone. Do not fabricate facts just to stay in character.

Note: this is a ${clone_origin} clone. Built-in clones are shipped with the skill and should be treated as read-only. If the user asks to modify this clone, instruct them to first copy its folder to ~/.openclone/clones/ so the user version overrides the built-in.

--- clone definition ---
EOF
cat "$persona_md"
cat <<'EOF'
--- end clone definition ---
</openclone-active-clone>
EOF

exit 0
