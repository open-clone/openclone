#!/usr/bin/env bash
# UserPromptSubmit hook for openclone.
#
# Two modes are supported; the first one that applies wins:
#   1. Room mode — if ~/.openclone/room exists and is non-empty, every listed
#      clone persona is injected along with routing rules so Claude picks the
#      1 (or occasionally 2) best-fit clone(s) to respond as. Room mode
#      overrides active-clone entirely.
#   2. Active-clone mode — if ~/.openclone/active-clone resolves to a persona,
#      that clone is embodied for the upcoming turn with its primary_category
#      framing as the default lens.
#
# Clone layout (both built-in and user share the same structure):
#   <root>/clones/<name>/persona.md
#   <root>/clones/<name>/knowledge/YYYY-MM-DD-<topic>.md   # built-in is lazy-fetched via sparse-checkout
#
# User layout (writable):
#   $HOME/.openclone/clones/<name>/persona.md
#   $HOME/.openclone/clones/<name>/knowledge/YYYY-MM-DD-<topic>.md
#
# Persona lookup precedence (user wins on collision):
#   1. $HOME/.openclone/clones/<name>/persona.md                (user clone)
#   2. <install_dir>/clones/<name>/persona.md                   (built-in / shipped clone)
# where install_dir is the skill root (typically ~/.claude/skills/openclone/).
#
# Knowledge: Claude is told to read from BOTH the user and built-in knowledge
# directories for every active/room clone; user-ingested notes layer on top.
#
# Output: JSON on stdout (additionalContext), always exit 0.
# If neither mode has something to inject, emits empty JSON — no effect.
# Errors (missing file, bad reference) also emit empty JSON to avoid derailing.

set -u

# Force-push banner: emitted whenever session-update.sh has detected that the
# local install cannot fast-forward to origin/main. Shown regardless of whether
# a clone is active, so stuck installs always surface the recovery notice.
force_push_banner=""
if [ -f "$HOME/.openclone/force-push-detected" ]; then
  force_push_banner=$(cat <<'BANNER'
<openclone-upgrade-needed>
공지 — openclone 자동 업데이트가 막혔습니다. 원격 저장소 main이 force-push 되어 기존 설치는 fast-forward로 따라갈 수 없습니다. 현재 설치는 이전 버전에 머물러 있으며, 누락된 커맨드나 예상과 다른 동작의 원인일 수 있습니다.

복구 방법 (이 안내를 사용자에게 전달해 주세요):
  cd ~/.claude/skills/openclone && ./uninstall
  rm -f  ~/.openclone/no-auto-update
  # 그 다음 README의 설치 one-liner 재실행

사용자 데이터(`~/.openclone/` 아래 active-clone, 사용자 클론, 수집한 지식)는 보존됩니다. 복구가 끝나면 이 알림은 자동으로 사라집니다.
</openclone-upgrade-needed>

BANNER
)
fi

emit_json() {
  # $1 = additionalContext string (may be empty)
  local payload="${1-}"
  if [ -z "$payload" ]; then
    printf '{}\n'
    exit 0
  fi
  local esc
  if command -v python3 >/dev/null 2>&1; then
    esc=$(printf '%s' "$payload" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  else
    esc=$(printf '%s' "$payload" \
      | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
      | awk 'BEGIN{ORS=""} {gsub(/\t/,"\\t"); gsub(/\r/,"\\r"); print; print "\\n"}')
    esc="\"${esc%\\n}\""
  fi
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":%s}}\n' "$esc"
  exit 0
}

emit_empty() {
  emit_json "$force_push_banner"
}

# Resolve the skill root from this script's own location.
install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Returns 0 if the given clone name resolves to a persona.md (user or built-in);
# on success prints "<origin>\t<persona_path>\t<user_knowledge_dir>\t<builtin_knowledge_dir>".
resolve_clone() {
  local name="$1"
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

# --- Room mode: takes precedence over active-clone ---
room_file="$HOME/.openclone/room"
if [ -f "$room_file" ] && [ -s "$room_file" ]; then
  room_members=""
  while IFS= read -r raw_name || [ -n "$raw_name" ]; do
    member=$(printf '%s' "$raw_name" | tr -d '[:space:]')
    [ -n "$member" ] || continue
    if info=$(resolve_clone "$member"); then
      origin=$(printf '%s' "$info" | cut -f1)
      persona_path=$(printf '%s' "$info" | cut -f2)
      user_kn=$(printf '%s' "$info" | cut -f3)
      builtin_kn=$(printf '%s' "$info" | cut -f4)
      room_members+=$'\n--- member: '"$member"$' (origin: '"$origin"$') ---\n'
      room_members+="knowledge directories (read on demand, user wins on collision):"$'\n'
      room_members+="  - ${user_kn}"$'\n'
      room_members+="  - ${builtin_kn}"$'\n\n'
      room_members+=$(cat "$persona_path")
      room_members+=$'\n'
    fi
  done < "$room_file"

  if [ -n "$room_members" ]; then
    room_context=$(cat <<EOF
<openclone-room>
You are moderating a group chat among the openclone clones listed below. For the upcoming user message, answer AS one — or at most two — of them. Room mode overrides any active clone setting; ignore ~/.openclone/active-clone while this block is in effect.

Routing rules:
  - Default: exactly ONE clone answers. Pick the member whose categories / expertise best fit the topic of the message.
  - Maximum TWO clones answer, and only when two have clearly distinct angles that both deserve voice (e.g. an operator take plus an investor take on the same pitch). Never three or more.
  - Never zero. If nothing seems like a great fit, still pick the closest member rather than answering as plain Claude.
  - No rotation memory. Do not track who spoke last — judge every turn on its merits. If the same clone fits three questions in a row, they answer three times.
  - If the message is clearly a system task (file edit, code change, build, shell command), carry it out correctly using your normal tools, but narrate briefly in the voice of the most task-appropriate clone.

Format each speaking clone like this:

  ## <display_name> — _<tagline>_

  <answer, 3-6 sentences by default, applying that clone's universal Persona + Speaking style + Guidelines plus its "### As a <primary_category>" block when one exists>

When two clones speak, separate them with a line containing only "---". Put the more category-appropriate clone first. Do not prefix with greetings or meta commentary. No emojis. Match the language of the user's message (Korean in, Korean out; English in, English out).

Knowledge rules (apply per member as they speak):
  - Knowledge files live at the two directories listed beside each member below. Files are named YYYY-MM-DD-<topic>.md.
  - Weight newer dates more heavily; older files remain valid background. When user-ingested and built-in files cover the same topic, prefer the user-ingested version.
  - Use Read on specific files when relevant. Do not dump, quote verbatim, or announce the directories to the user.
  - Cite sources when you use a specific fact from a knowledge file. Format each citation as an inline markdown link with escaped brackets like \[[1](<target>)\] \[[2](<target>)\] placed right after the sentence carrying the claim. Number citations sequentially starting at [1] for each response. Pick <target> by this priority: (1) the knowledge file frontmatter source_url if present, (2) otherwise the absolute path of the knowledge file itself, (3) for WebSearch or WebFetch facts, the result URL. Do not over-cite — skip citations for persona voice, opinions, or common knowledge. No separate Sources footer.

If the user asks for facts that require current information you do not have (recent events, specific companies or numbers), use WebSearch or WebFetch first, then answer in the chosen clone's voice. Do not fabricate facts to stay in character; if even a search fails, admit the gap in that clone's tone.

Never invent a clone that is not in the list below.

--- room members ---${room_members}
--- end room members ---
</openclone-room>
EOF
)
    emit_json "${force_push_banner}${room_context}"
  fi
  # If no members resolved, fall through to active-clone handling below.
fi

# --- Active-clone mode ---
active_file="$HOME/.openclone/active-clone"
[ -f "$active_file" ] || emit_empty

clone_name=$(tr -d '[:space:]' < "$active_file" 2>/dev/null || true)
[ -n "$clone_name" ] || emit_empty

if info=$(resolve_clone "$clone_name"); then
  clone_origin=$(printf '%s' "$info" | cut -f1)
  persona_md=$(printf '%s' "$info" | cut -f2)
  user_knowledge_dir=$(printf '%s' "$info" | cut -f3)
  builtin_knowledge_dir=$(printf '%s' "$info" | cut -f4)
else
  emit_empty
fi

# Build the additionalContext payload.
context=$(cat <<EOF
<openclone-active-clone>
You are currently embodying an openclone clone (origin: ${clone_origin}). For the upcoming user message, respond AS this clone — match the persona, speaking style, and guidelines below. Stay in character for conversational messages. If the user message is a clear system task (file edit, code change, build, shell command), perform it correctly using your normal tools but phrase any narration in the tone of this clone.

Default response length: keep it concise. Aim for 3-6 sentences or 2-4 short paragraphs unless (a) the Speaking style of this clone specifies otherwise, or (b) the user explicitly asked for depth (phrases like "자세히", "구체적으로", "framework", "단계별로", "in detail", "expand"). Do not preemptively enumerate every angle; trust the user to ask follow-ups. If the question is underspecified, prefer a one-line clarifying question over a long speculative answer. Avoid bullet lists unless the topic genuinely calls for one.

If this clone has a "## Category-specific framing" section, apply the block corresponding to its primary_category (or the first entry in categories if primary_category is not set) as additional emphasis. Other category blocks are reference material for panel use and should not be applied here.

If the user asks something that requires factual recall about the world of this clone, check knowledge files under BOTH of these directories (user-ingested notes layer on top of shipped knowledge):
  - ${user_knowledge_dir}      (user-ingested; may not exist)
  - ${builtin_knowledge_dir}   (shipped with the skill; read-only; may not exist)

Knowledge files are named YYYY-MM-DD-<topic>.md. Storage is append-only — when the same topic is ingested again, a new file is created with the new date rather than overwriting. When multiple files cover the same topic or subject:
  - Weight the newest dates more heavily — recent entries reflect this persona more accurately than older ones.
  - Older entries are still valid background context (beliefs evolve but rarely flip), so do not ignore them outright.
  - If older and newer entries disagree on facts or stance, go with the newer entry and, if relevant to the answer, briefly acknowledge that the view has shifted.
  - When user-ingested and built-in files collide on the same topic, prefer the user-ingested version.

Use the Read tool on specific files when relevant. Do not list the directories to the user; just use them.

Cite sources when you use a specific fact from a knowledge file or a web lookup. Format each citation as an inline markdown link with escaped brackets like \[[1](<target>)\] \[[2](<target>)\] placed right after the sentence carrying the claim. Number citations sequentially starting at [1] for each response. Pick <target> by this priority: (1) the knowledge file frontmatter source_url if present, (2) otherwise the absolute path of the knowledge file itself, (3) for WebSearch or WebFetch facts, the result URL. Do not over-cite — skip citations for persona voice, opinions, or common knowledge. No separate Sources footer.

If the answer is not in the persona, speaking style, or local knowledge files, and the question needs facts you do not have (current events, recent numbers, news about specific companies or people, verifiable claims), use WebSearch or WebFetch to look it up before answering. Still respond in the voice of this clone, weaving in what you found as if recalling it. Do not fabricate facts just to stay in character; if even a search does not yield an answer, say so in the tone of the clone and move on.

Note: this is a ${clone_origin} clone. Built-in clones are shipped with the skill and should be treated as read-only — if the user asks to modify this clone, instruct them to first copy its folder to ~/.openclone/clones/ (the user version will then override the built-in on next activation).

--- clone definition ---
$(cat "$persona_md")
--- end clone definition ---
</openclone-active-clone>
EOF
)

emit_json "${force_push_banner}${context}"
