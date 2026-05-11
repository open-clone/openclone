# Quickstart

## Install from npm

```bash
npm install -g @openclone/openclone
openclone list
openclone chat douglas
```

## Run from a repo checkout

```bash
npm install
npm run build
node dist/cli/index.js list
node dist/cli/index.js chat douglas --prompt "내 아이디어를 평가해줘"
node dist/cli/index.js chat douglas
```

## Common commands

Choose a provider before chatting. If none is configured, use one of:

```bash
openclone chat <clone-slug> --provider ollama --model llama3.2
openclone chat <clone-slug> --use-codex-auth
OPENCLONE_API_KEY="..." openclone chat <clone-slug> --model gpt-5.5
```

Then use the normal commands:

```bash
openclone list
openclone status
openclone chat <clone-slug> --prompt "질문"
openclone chat <clone-slug>
```

When no prompt or stdin is provided in a terminal, `openclone chat <clone-slug>` opens an interactive conversation.

## Sessions and resuming

Interactive sessions are saved automatically to `~/.openclone/conversations/<slug>/<sessionId>.json`. You can list and resume them.

```bash
openclone history <clone-slug>                          # list saved sessions for one clone
openclone history --all                                 # all clones, grouped, with orphan tags
openclone chat <clone-slug> --resume                    # resume the newest session
openclone chat <clone-slug> --resume=<SESSION_ID>       # resume a specific session by id
openclone chat <clone-slug> --no-persist                # one-shot ephemeral session
openclone history <clone-slug> --quiet                  # column-only output for piping
```

`SESSION_ID` is the first column of `openclone history`. On resume, the CLI replays the prior conversation to the terminal so scrolling up shows the full prior dialogue before the new prompt.

`openclone history` with no arguments prints help instead of silently picking a clone — pass a slug or `--all` explicitly.

## Clone data

The CLI reads the same markdown data model as the Claude Code skill:

```text
clones/<slug>/persona.md
clones/<slug>/knowledge/*.md
~/.openclone/clones/<slug>/persona.md
~/.openclone/clones/<slug>/knowledge/*.md
```

User clones shadow built-in personas with the same slug. User and built-in knowledge are additive, with user-ingested knowledge preferred for the same topic.
