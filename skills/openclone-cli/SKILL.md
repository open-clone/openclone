---
name: openclone-cli
description: |
  Use when the user wants to consult an AI persona "clone" for advice, strategy, analysis, or domain expertise—especially in startup, VC, tech, growth, HR, or business contexts. 
  
  Available official clones include: 장동욱(Brian, VC), 김철우(VC/founder), 권도균(Douglas, founder/VC), 조여준(Ethan, VC), 정구봉(tech/founder), 김동현(iid, HR), 신재명(Jay, founder), 조쉬(founder/expert), 이경훈(founder/VC), 김용훈(Levi, growth/CMO). 
  
  Also use when users ask how to install openclone via npm, run openclone outside Claude Code, choose a provider (OpenAI-compatible API, Codex OAuth, Claude Code subscription OAuth, or local Ollama), pick a model, list or resume saved conversation sessions (openclone history, --resume, --resume=<id>), use --no-persist, understand interactive chat mode, knowledge lookup, conversation persistence under ~/.openclone/conversations, or fix CLI errors.
---

# openclone CLI helper

Use this skill when the user wants help running the standalone `openclone` CLI from a terminal rather than the Claude Code `/openclone` slash command.

## Core workflow

1. Identify the user's target runtime:
   - Local model/Ollama → read `references/ollama.md`.
   - Codex OAuth → read `references/codex-oauth.md`.
   - Claude Code subscription OAuth → read `references/claude-code-oauth.md`.
   - API key or custom OpenAI-compatible endpoint → read `references/openai-compatible.md`.
   - General install, first run, listing/resuming sessions → read `references/quickstart.md`.
2. Explain that the CLI uses the same markdown persona and `knowledge/` files as source of truth.
3. For interactive chat behavior, memory, knowledge lookup, compaction, on-disk session persistence, and resuming prior conversations (`--resume`, `--resume=<id>`, `openclone history`, `--no-persist`), read `references/conversation-and-knowledge.md`.
4. If the user reports errors, read `references/troubleshooting.md`.

Keep answers short and concrete. Prefer copy-pasteable commands. Do not claim the CLI starts external services unless the reference says so.

## Safety and expectation checks

- Ollama/local models run through an already-running Ollama server; openclone does not start it.
- Codex OAuth is opt-in and local-machine oriented; do not suggest hosted token sharing. Codex response item persistence defaults to off because the ChatGPT backend currently rejects `store=true` for ChatGPT-tier OAuth tokens.
- Model quality varies. Local models may follow persona/tool instructions less reliably than stronger hosted models.
- Conversation history is saved to `~/.openclone/conversations/<slug>/<sessionId>.json` by default. Tell users they can inspect or delete those files directly, or pass `--no-persist` to skip writing them.
- The Claude Code skill and the CLI are separate entry points that share markdown clone data.
