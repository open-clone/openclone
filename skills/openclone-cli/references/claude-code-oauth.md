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

## How the request is shaped

Anthropic's OAuth-token path is strict about request shape. The CLI normalizes every outbound `/v1/messages` call to look exactly like `claude` itself:

- `User-Agent: claude-cli/<ver> (external, cli)` (forced override — `@ai-sdk/anthropic` would otherwise advertise itself in the UA and Anthropic returns a generic 429 `rate_limit_error` for that)
- `anthropic-beta: oauth-2025-04-20,interleaved-thinking-2025-05-14` (forced replacement — any other betas the SDK adds, e.g. `structured-outputs-*`, are stripped because OAuth tokens reject extra betas)
- All `x-stainless-*` provider-fingerprint headers stripped
- `?beta=true` appended to the `/v1/messages` URL
- The system prompt is split into **two** content blocks: `[{type:"text", text:"You are a Claude agent…"}, {type:"text", text:"<persona>"}]`. A single merged block fails OAuth validation.

If you change any of those four invariants, expect 429 with `{"type":"rate_limit_error","message":"Error"}` even when the account is far from cap.

## Troubleshooting

- `Claude Code OAuth credentials not found` — the user is not signed in (or the keychain entry was wiped). Run `claude /login` and retry.
- `Claude Code OAuth refresh failed (401)` — the refresh token is no longer valid. Run `claude /login` to re-authenticate.
- Generic `429` with `{"error":{"type":"rate_limit_error","message":"Error"}}` and the response headers showing `anthropic-ratelimit-unified-*-status: allowed` (utilization well under 1.0) — the account is not actually capped; the request shape was rejected. Confirm `claude --print "1+1?"` works, then run with `OPENCLONE_DEBUG_HTTP=1` to inspect the exact headers/body. Check that User-Agent is `claude-cli/...`, `anthropic-beta` has only the two OAuth betas, and `system` is a two-block array.
- Anthropic occasionally regresses the `oauth-2025-04-20` beta header acceptance (see anthropics/claude-code#13770). If you see a 400 `Unexpected value(s) 'oauth-2025-04-20' for the anthropic-beta header`, upgrade Claude Code (`claude --version`) and retry.
- Do not ask users to paste or share their Claude Code OAuth tokens.

## Debug logging

```bash
OPENCLONE_DEBUG_HTTP=1 openclone chat <slug> --use-claude-code-auth --prompt "hello"
```

Logs to stderr: request URL, request headers (Authorization redacted), request body (truncated to 1.5 KB), response status, response headers, response body.
