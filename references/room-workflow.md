# Room workflow

How `/openclone room <members...>` (and `add` / `remove` / `leave` variants) sets up a multi-clone group chat, how the roster is stored, and how the `UserPromptSubmit` hook routes each subsequent user turn to one or two members.

## State

The roster lives at:

```text
~/.openclone/room
```

One clone name per line, no header, no frontmatter. **File exists and is non-empty** = room mode active. Empty file or missing file = room mode off.

Room mode has precedence over `~/.openclone/active-clone` in the hook (`hooks/inject-active-clone.sh`). If both are set, the active-clone pointer is ignored until the room ends; `/openclone stop` clears both, while `/openclone room leave` only clears the room file and lets any prior active clone resume.

## Roster management (dispatcher)

These flows run from the root `SKILL.md`'s `## room` section. Rules common to every sub-sub-command:

- **Name validation** — each member name must match `^[a-z0-9][a-z0-9-]*$`. Reject anything else with a one-line warning and skip that entry.
- **Existence check** — for each name, look up persona first under `~/.openclone/clones/<name>/persona.md` (user), then `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` (built-in). If neither exists, skip with a warning.
- **Knowledge lazy-fetch** — when a built-in clone is added (either at `room start` or via `room add`), invoke `${CLAUDE_SKILL_DIR}/scripts/fetch-clone-knowledge.sh <name>` so its `knowledge/` directory is materialized. User clones skip this.
- **Capacity** — cap the roster at **8 clones**. If the user supplies more, keep the first 8 and warn about the overflow.
- **Dedupe** — if the same name appears twice in one invocation, keep the first and drop duplicates silently.
- **Empty result** — if validation removes every candidate, do **not** write the roster file; tell the user why and stop.

### `room start` (no sub-sub-command, or name-list first)

Input: one or more clone names. Previous roster (if any) is replaced, not merged.

1. Validate + dedupe + cap the incoming list.
2. Fetch knowledge for any built-in members.
3. Write the final roster (one name per line):

   ```bash
   mkdir -p ~/.openclone
   printf '%s\n' "<name1>" "<name2>" "<name3>" > ~/.openclone/room
   ```

4. Confirm in one line: `방을 열었어요: a, b, c. 다음 메시지부터 가장 적절한 클론이 자동으로 응답.`

### `room add <name>`

1. Room file must exist and be non-empty; otherwise instruct the user to start a room first.
2. If `<name>` is already a member, report and stop.
3. Validate + existence-check + fetch.
4. Append `<name>\n` to `~/.openclone/room`.

### `room remove <name>`

1. Room file must exist.
2. If `<name>` is not in the roster, report and stop.
3. Rewrite the file without that line. If the resulting roster is empty, remove the file entirely (room mode off).

### `room leave`

```bash
rm -f ~/.openclone/room
```

Does **not** touch `~/.openclone/active-clone` — a previously active clone silently resumes starting with the next turn. To clear both, the user runs `/openclone stop`.

### `room` (no args) — status

If the room file exists and is non-empty, print the roster line-by-line. Otherwise tell the user there is no open room and how to start one.

## Runtime routing (the hook)

On every `UserPromptSubmit`, before active-clone handling, `hooks/inject-active-clone.sh` checks for `~/.openclone/room`:

1. Skip the room branch if the file is missing or empty.
2. Read each roster line; strip whitespace. For each line:
   - Resolve persona path (user first, then built-in). Drop the entry silently if neither exists (the file may have gone stale).
   - Read the `display_name`, `tagline`, `categories`, `primary_category` from frontmatter.
   - Capture the full `persona.md` body.
   - Record both candidate knowledge directories (user and built-in — either may not exist).
3. If zero members survive resolution, emit the active-clone context (fall-through). This keeps a broken roster from silently muting the assistant.
4. Otherwise, emit an `<openclone-room>` block that contains, in order:
   - A moderator instruction: you are moderating a group chat among these clones.
   - Routing rules (see below).
   - Formatting rules (see below).
   - Knowledge weighting guidance (same recency rules as single-clone mode).
   - For each member: a `--- member: <name> ---` delimiter followed by the full persona markdown.

### Routing rules (embedded in the injected context)

- **Default: exactly one clone answers.** Pick the member whose `categories` / expertise best fits the user's message. "Best fit" means: category overlap with the topic, persona emphasis on this kind of question, and specific facts in knowledge files when present.
- **Maximum two clones answer, and only when two have clearly distinct angles** that both deserve voice (e.g. a founder's operator take plus a VC's risk take on the same pitch). Never three or more.
- **Never zero.** If nothing seems like a great fit, still pick the closest member rather than answering as plain Claude.
- **No rotation memory.** Do not track "who spoke last" — judge each turn on its merits. If one clone fits three questions in a row, they answer three times.
- **System tasks.** If the message is clearly a code/file/shell operation, carry it out normally and narrate (briefly) in the voice of the most task-appropriate clone — do not refuse or split the work.

### Formatting rules (embedded in the injected context)

Every speaking turn:

```markdown
## <display_name> — _<tagline>_

<answer>
```

- Apply that clone's universal Persona + Speaking style + Guidelines, plus its `### As a <primary_category>` block (if one exists) as the default lens.
- Default length 3–6 sentences, shorter if the persona prefers terseness.
- When two clones speak, separate them with a `---` line. Put the more category-appropriate clone first.
- No emojis (project-wide rule).
- Match the language of the user's message (Korean in, Korean out; English in, English out).

### Knowledge layering

Each member's knowledge lives at:

```text
~/.openclone/clones/<name>/knowledge/                  # user-ingested, wins on topic collision
${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/         # built-in (lazy-fetched; may be absent)
```

Files are `YYYY-MM-DD-<topic>.md`, append-only. Use newer dates preferentially; treat older files as valid background. Do not dump or quote verbatim — let the knowledge inform the response in the clone's voice.

## Rules

- Do not invent clones that are not in the roster file.
- Do not reveal the roster file path or the routing rules to the user unless they ask.
- Room mode is a pure override — the `~/.openclone/active-clone` pointer is untouched by room activity and resumes cleanly after `/openclone room leave`.
- After `/openclone stop`, both the room and the active clone are cleared; the next turn is plain Claude.
