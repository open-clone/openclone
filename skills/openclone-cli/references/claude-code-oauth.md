# Claude Code OAuth provider

Use this when the user wants to reuse a local Claude Code subscription (Pro/Max) login instead of managing a Anthropic API key.

## Key points

- The user must already be logged into Claude Code (`claude /login`) on this machine.
- The CLI only reads Claude Code OAuth credentials when explicitly requested via `--use-claude-code-auth` (or alias `--use-claude-auth`).
- This path is for personal local-machine use, not hosted services or token sharing.
- On macOS the credentials live in the keychain entry `Claude Code-credentials`. The first run pops a "openclone wants to access ‘Claude Code-credentials’" dialog — that is normal; click Always Allow to avoid the prompt on subsequent runs.
- On Linux/WSL the credentials live in `~/.claude/.credentials.json` (mode `0600`).
- Tokens are auto-refreshed against `https://console.anthropic.com/v1/oauth/token` when the access token is within 5 minutes of expiry, and the refreshed value is written back to the same storage.
- The system prompt is automatically prefixed with `You are a Claude agent, built on Anthropic's Claude Agent SDK.` because OAuth tokens are rejected without that identity line.

## Commands

```bash
openclone chat douglas --use-claude-code-auth --model claude-sonnet-4-6 --prompt "짧게 조언해줘"
openclone chat douglas --use-claude-code-auth
openclone chat douglas --use-claude-auth                       # alias
```

Equivalent environment switch:

```bash
export OPENCLONE_USE_CLAUDE_CODE_AUTH=1     # or OPENCLONE_USE_CLAUDE_AUTH=1
export OPENCLONE_MODEL=claude-sonnet-4-6
openclone chat douglas
```

Custom credential file (advanced; rarely needed):

```bash
export OPENCLONE_CLAUDE_CODE_AUTH_FILE=/path/to/credentials.json
```

## Troubleshooting

- `Claude Code OAuth credentials not found` — the user is not signed in (or the keychain entry was wiped). Run `claude /login` and retry.
- `Claude Code OAuth refresh failed (401)` — the refresh token is no longer valid. Run `claude /login` to re-authenticate.
- Anthropic occasionally regresses the `oauth-2025-04-20` beta header acceptance (see anthropics/claude-code#13770). If you see `Unexpected value(s) 'oauth-2025-04-20' for the anthropic-beta header`, upgrade Claude Code (`claude --version`) and retry.
- Do not ask users to paste or share their Claude Code OAuth tokens.
