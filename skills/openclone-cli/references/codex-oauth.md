# Codex OAuth provider

Use this when the user wants to reuse a local Codex login instead of managing a normal API key.

## Key points

- The user must already be logged into Codex locally.
- The CLI only uses Codex OAuth when explicitly requested.
- This path is intended for personal local-machine use, not hosted services or token sharing.
- It uses the Codex backend transport (`https://chatgpt.com/backend-api/codex`), not the normal OpenAI API base URL.
- Unless `--model` or `OPENCLONE_MODEL` overrides it, this path defaults to `gpt-5.3-codex-spark`.
- Codex response item persistence (`store=true`) is **off by default** because the ChatGPT backend currently rejects `store=true` for ChatGPT-tier OAuth tokens with `Store must be set to false` (HTTP 400). The CLI sends every turn's full message array, so multi-turn conversations work without `previous_response_id`.

## Commands

```bash
openclone chat douglas --use-codex-auth --prompt "짧게 조언해줘"
openclone chat douglas --use-codex-auth
openclone chat douglas --use-codex-auth --model gpt-5.5
```

Equivalent environment switch:

```bash
export OPENCLONE_USE_CODEX_AUTH=1
export OPENCLONE_MODEL=gpt-5.3-codex-spark
openclone chat douglas
```

If a future ChatGPT backend change re-enables `store=true` and the user wants the server-side response cache (for `previous_response_id` chains), opt in explicitly:

```bash
export OPENCLONE_CODEX_STORE=1
```

If the backend still refuses, the request will fail with a 400 and the user should leave the variable unset.

## Troubleshooting

- `Bad Request 400 Store must be set to false` — `OPENCLONE_CODEX_STORE=1` is set but the backend rejects it. Unset the variable and retry; the CLI will default to `store=false` and work.
- If auth fails, ask the user to confirm Codex works locally first (e.g. `~/.codex/auth.json` exists and is fresh).
- If a custom auth location is needed, use `OPENCLONE_CODEX_AUTH_FILE`.
- Do not ask users to paste or share Codex tokens.
