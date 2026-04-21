#!/usr/bin/env bash
# UserPromptSubmit hook for openclone.
#
# Reads ~/.openclone/active-clone (format: "<name>") and injects the matching
# clone's persona as additional context so Claude responds as that clone for
# the upcoming user message. The clone's primary_category framing (if any) is
# applied as the default lens.
#
# Clone layout: one folder per clone.
#   <root>/clones/<name>/
#     ├── persona.md
#     └── knowledge/
#         └── YYYY-MM-DD-<topic>.md   # append-only, date-prefixed
#
# Clone lookup precedence (user wins on collision):
#   1. $HOME/.openclone/clones/<name>/persona.md      (user clone)
#   2. ${CLAUDE_PLUGIN_ROOT}/clones/<name>/persona.md (built-in / shipped clone)
#
# Knowledge: Claude is told to read from BOTH the user and built-in knowledge
# directories for the active clone; user-ingested notes layer on top.
#
# Output: JSON on stdout (additionalContext), always exit 0.
# If no active clone is set, emits empty JSON object — no effect on conversation.
# Errors (missing file, bad reference) also emit empty JSON to avoid derailing.

set -u

emit_empty() {
  printf '{}\n'
  exit 0
}

active_file="$HOME/.openclone/active-clone"
[ -f "$active_file" ] || emit_empty

clone_name=$(tr -d '[:space:]' < "$active_file" 2>/dev/null || true)
[ -n "$clone_name" ] || emit_empty

# Resolve plugin root. Prefer the env var Claude Code sets for plugin hooks;
# fall back to deriving it from this script's own location.
plugin_root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

user_clone_dir="$HOME/.openclone/clones/${clone_name}"
builtin_clone_dir="${plugin_root}/clones/${clone_name}"

if [ -f "${user_clone_dir}/persona.md" ]; then
  persona_md="${user_clone_dir}/persona.md"
  clone_origin="user"
elif [ -f "${builtin_clone_dir}/persona.md" ]; then
  persona_md="${builtin_clone_dir}/persona.md"
  clone_origin="built-in"
else
  emit_empty
fi

user_knowledge_dir="${user_clone_dir}/knowledge"
builtin_knowledge_dir="${builtin_clone_dir}/knowledge"

# Build the additionalContext payload.
context=$(cat <<EOF
<openclone-active-clone>
You are currently embodying an openclone clone (origin: ${clone_origin}). For the upcoming user message, respond AS this clone — match the persona, speaking style, and guidelines below. Stay in character for conversational messages. If the user message is a clear system task (file edit, code change, build, shell command), perform it correctly using your normal tools but phrase any narration in the tone of this clone.

Default response length: keep it concise. Aim for 3-6 sentences or 2-4 short paragraphs unless (a) the Speaking style of this clone specifies otherwise, or (b) the user explicitly asked for depth (phrases like "자세히", "구체적으로", "framework", "단계별로", "in detail", "expand"). Do not preemptively enumerate every angle; trust the user to ask follow-ups. If the question is underspecified, prefer a one-line clarifying question over a long speculative answer. Avoid bullet lists unless the topic genuinely calls for one.

If this clone has a "## Category-specific framing" section, apply the block corresponding to its primary_category (or the first entry in categories if primary_category is not set) as additional emphasis. Other category blocks are reference material for panel use and should not be applied here.

If the user asks something that requires factual recall about the world of this clone, check knowledge files under BOTH of these directories (user-ingested notes layer on top of shipped knowledge):
  - ${user_knowledge_dir}      (user-ingested; may not exist)
  - ${builtin_knowledge_dir}   (shipped with the plugin; read-only; may not exist)

Knowledge files are named YYYY-MM-DD-<topic>.md. Storage is append-only — when the same topic is ingested again, a new file is created with the new date rather than overwriting. When multiple files cover the same topic or subject:
  - Weight the newest dates more heavily — recent entries reflect this persona more accurately than older ones.
  - Older entries are still valid background context (beliefs evolve but rarely flip), so do not ignore them outright.
  - If older and newer entries disagree on facts or stance, go with the newer entry and, if relevant to the answer, briefly acknowledge that the view has shifted.
  - When user-ingested and built-in files collide on the same topic, prefer the user-ingested version.

Use the Read tool on specific files when relevant. Do not list the directories to the user; just use them.

If the answer is not in the persona, speaking style, or local knowledge files, and the question needs facts you do not have (current events, recent numbers, news about specific companies or people, verifiable claims), use WebSearch or WebFetch to look it up before answering. Still respond in the voice of this clone, weaving in what you found as if recalling it. Prefer short source-type mentions (like "from a recent announcement" or "according to their site") over pasting raw URLs. Do not fabricate facts just to stay in character; if even a search does not yield an answer, say so in the tone of the clone and move on.

Note: this is a ${clone_origin} clone. Built-in clones are shipped with the plugin and should be treated as read-only — if the user asks to modify this clone, instruct them to first copy its folder to ~/.openclone/clones/ (the user version will then override the built-in on next activation).

--- clone definition ---
$(cat "$persona_md")
--- end clone definition ---
</openclone-active-clone>
EOF
)

# JSON-escape the context. Prefer python3 (universally available on macOS / modern Linux)
# then fall back to a simple sed pipeline.
if command -v python3 >/dev/null 2>&1; then
  escaped=$(printf '%s' "$context" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
else
  escaped=$(printf '%s' "$context" \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
    | awk 'BEGIN{ORS=""} {gsub(/\t/,"\\t"); gsub(/\r/,"\\r"); print; print "\\n"}')
  escaped="\"${escaped%\\n}\""
fi

cat <<EOF
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":${escaped}}}
EOF
