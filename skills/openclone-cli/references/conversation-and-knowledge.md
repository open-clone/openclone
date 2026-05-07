# Conversation and knowledge behavior

## Interactive commands

Inside `openclone chat <slug>` interactive mode:

```text
/help     show commands
/compact  summarize older conversation history now
/clear    clear raw history and summary
/bye      exit, also /exit or /quit
```

## Conversation persistence

The CLI persists every interactive session to disk by default:

```text
~/.openclone/conversations/<slug>/<sessionId>.json
```

Behavior:

- Each turn (and the final exit) is saved to a single JSON file per session.
- `sessionId` is a filename-safe ISO timestamp (e.g. `2026-04-28T15-38-41-598Z`).
- The same file is overwritten in place during a live session, so there is one JSON per session.
- On `/bye` the CLI prints `[session saved: <path>]`.
- Pass `--no-persist` to run an ephemeral session that is never written to disk.

## Resuming a saved session

```bash
openclone chat <slug> --resume                          # resume newest session, interactive
openclone chat <slug> --resume=<SESSION_ID>             # resume specific session, interactive
openclone chat <slug> --resume --prompt "follow-up"     # resume newest session, single-shot
openclone chat <slug> --resume=<SESSION_ID> --prompt "X"# resume specific session, single-shot
```

`SESSION_ID` is the first column of `openclone history <slug>`. When resumed interactively:

- A `[resumed: N message(s)]` banner is printed.
- The prior conversation summary (if any) is replayed inside `--- prior summary ---` markers.
- Every restored message is replayed to stdout in chronological order — user messages with `>>>` prefix, assistant responses unprefixed — followed by `--- continuing conversation ---` before the live prompt loop.
- Scrolling up in the terminal shows the full prior dialogue, just like a normal chat client.

## Single-shot mode for agents (multi-turn without an interactive terminal)

When `--prompt` (or piped stdin) is provided, openclone processes one turn and exits immediately. This is the recommended path for agents that need to chain multiple turns without spawning a long-lived child process or driving a TUI.

Stream split:

- `stdout` — only the terminal-safe display form of the assistant response text, terminated by `\n`. Capture with `RESPONSE=$(openclone chat ...)`. Raw model text is preserved in the saved session JSON.
- `stderr` — `[session: <id>]` line after a successful turn, plus `[auto-compacted N older message(s)]` if compaction triggered.

Patterns:

```bash
# First turn — also captures the new sessionId from stderr
openclone chat douglas --prompt "How should I think about early-stage fundraising?" 2>session.log
SESSION_ID=$(grep -oE '\[session: [^]]+\]' session.log | sed 's/\[session: //;s/\]//')

# Follow-up turns reuse the same session via --resume
openclone chat douglas --resume=$SESSION_ID --prompt "Drill into the first option"
openclone chat douglas --resume=$SESSION_ID --prompt "Show me concrete examples"

# `--resume` without an id picks the newest session for the clone (handy for ad-hoc agents)
openclone chat douglas --resume --prompt "Quick follow-up on whatever we last discussed"

# Each call writes the updated session JSON in place at
# ~/.openclone/conversations/<slug>/<SESSION_ID>.json
```

Behavior:

- Persistence is on by default. Pass `--no-persist` to run a stateless single-shot (no `[session: <id>]` line, no disk write).
- Resuming a session that doesn't exist throws a clear error and exits non-zero.
- Auto-compaction applies in single-shot too: if the prior history plus the new prompt exceeds `OPENCLONE_COMPACT_MAX_CHARS`, older turns are summarized before the LLM call and `[auto-compacted N older message(s)]` is emitted to stderr.

## Listing sessions

```bash
openclone history <slug>            # one clone's sessions, with column header and resume hints
openclone history --all             # every clone, grouped by clone, with [orphan: clone not found] tags
openclone history                   # bare command prints help (no implicit fallback)
openclone history <slug> --quiet    # data lines only, for piping into awk/grep
```

## Conversation memory

The CLI keeps user and assistant turns in memory for the current process and replays them on resume from the persisted JSON.

Long conversations are compacted automatically:

```bash
OPENCLONE_COMPACT_MAX_CHARS=350000
OPENCLONE_COMPACT_KEEP_TURNS=8
OPENCLONE_COMPACT_SUMMARY_MAX_CHARS=20000
```

Defaults are sized for a 250K-token context window at roughly 70% utilization. Drop `OPENCLONE_COMPACT_MAX_CHARS` to a smaller value (e.g. `60000`) for small-context local models or to keep per-turn token cost down.

Older turns are summarized. Recent turns stay verbatim. The compacted summary is part of the persisted session, so it survives across `--resume`.

## Knowledge lookup

The CLI uses the same markdown source of truth as the Claude Code skill:

```text
persona.md
knowledge/*.md
```

The prompt includes selected snippets and a manifest of available knowledge files. During a response, the model can ask the CLI to read a specific local knowledge file or fetch/search web content when needed.

## Explain it simply

- The persona file tells the model who to be.
- The knowledge files are the clone's memory.
- The CLI initially shows the model a short preview and a list of memories.
- If more detail is needed, the model can read the relevant memory file.
- If the conversation gets too long, old chat is summarized.
- Sessions are stored per-clone on disk, so the user can pick up where they left off with `--resume`.
