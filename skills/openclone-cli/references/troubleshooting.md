# Troubleshooting

## Ollama connection errors

Likely cause: Ollama server is not running.

```bash
ollama serve
```

Then retry:

```bash
openclone chat douglas --provider ollama --model llama3.2
```

## Model not found

List available local models:

```bash
ollama list
```

Use exactly one of those names, or pull a model:

```bash
ollama pull llama3.2
```

## Missing API key

For OpenAI-compatible mode:

```bash
export OPENCLONE_API_KEY="..."
```

Or choose a no-API-key local provider:

```bash
openclone chat douglas --provider ollama --model llama3.2
```

Or choose local Codex OAuth:

```bash
openclone chat douglas --use-codex-auth
```

## Persona feels weak

Try these in order:

1. Use a stronger model.
2. Ask a more specific question.
3. Confirm the clone has relevant `knowledge/*.md` files.
4. Use hosted/Codex OAuth mode if the local model ignores tool or persona instructions.

## Long conversation issues

Use:

```text
/compact
```

or reset the session:

```text
/clear
```
