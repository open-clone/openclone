# Update workflow

How Claude refreshes a clone's knowledge with the latest material from its canonical sources. Loaded by `/openclone update` and by natural-language requests like "권도균 클론 최신 정보로 업데이트해줘".

The short version: find the most recent knowledge date, read `## Links` from `persona.md`, re-scrape each canonical source with Chrome MCP / yt-dlp, keep only items newer than the last date, and append them as fresh dated topic files. **No file is ever overwritten** — the append-only invariant from `refine-workflow.md` holds.

## Preflight — Chrome MCP required

Same gate as `/openclone new` and `/openclone ingest`. LinkedIn / Threads / X / Instagram / Facebook personal feeds are all login-walled or JS-rendered; `curl` and plain `WebFetch` produce partial data that is worse than no data.

1. Verify `claude-in-chrome` tools are loaded; load them if not:
   ```text
   ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__find,mcp__claude-in-chrome__read_console_messages
   ```
2. If the ToolSearch result does NOT contain these schemas, abort with:
   > `/openclone update`는 Chrome MCP가 필요해요. LinkedIn·Threads·X 같은 소스를 제대로 가져오려면 claude-in-chrome extension이 연결돼 있어야 해요. extension을 켠 뒤 다시 시도해 주세요.
3. Do not propose `curl` / WebFetch workarounds. If the user explicitly wants a one-off hand-written update, tell them to run `/openclone ingest <source>` per source instead.

## Steps

### 1. Resolve the target clone

Input handling:

- Explicit slug: `/openclone update <name>` → `<name>` is the target. Validate with `^[a-z0-9][a-z0-9-]*$`.
- No slug: read `~/.openclone/active-clone`. If empty, abort:
  > 먼저 `/openclone <name>`으로 클론을 활성화하거나 `/openclone update <name>`으로 이름을 지정해 주세요.
- Natural-language invocation ("douglas 최신 정보로 업데이트해줘"): extract `<name>` from the utterance; if ambiguous, ask one clarifying question.

Persona lookup (user wins on collision):

- `~/.openclone/clones/<name>/persona.md` → origin = user
- `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` → origin = built-in
- Neither → abort with: `<name> 클론을 찾을 수 없어요. /openclone 로 목록을 확인하세요.`

### 2. Fork-on-write when the clone is built-in

Never write knowledge files into `${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/`. If the resolved origin is built-in:

```bash
mkdir -p "$HOME/.openclone/clones"
cp -R "${CLAUDE_SKILL_DIR}/clones/<name>" "$HOME/.openclone/clones/<name>"
```

One-line notice to the user:
> 내장 **<name>**을 `~/.openclone/clones/<name>/`로 포크했어요 (이제 사용자 사본이 내장을 가림). 업데이트 계속 진행.

From here on, every write targets `~/.openclone/clones/<name>/knowledge/`.

### 3. Find the last-known date

The user clone's knowledge directory is authoritative for "what we already have" after the fork:

```bash
ls -1 "$HOME/.openclone/clones/<name>/knowledge/" 2>/dev/null \
  | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}-' \
  | sort -r \
  | head -n1
```

- Parse the leading `YYYY-MM-DD` from the filename. That date is the cutoff — only harvest items **published after** it.
- If the directory is empty (fresh clone, Stage 0 never ran), treat the cutoff as the clone's `created` date from the persona frontmatter, and still cap the harvest at ~30 items per source to avoid pulling an entire archive.
- Prefer a file's `published_at` frontmatter field if present; fall back to the filename prefix (which, by the schema rules, matches the ingestion date).

Report the resolved cutoff to the user in one line before scraping:
> 마지막 지식 일자: `YYYY-MM-DD` (파일: `YYYY-MM-DD-<topic>.md`). 이 날짜 이후 올라온 글만 수집할게요.

### 4. Parse `## Links` from persona.md

Read the resolved `persona.md` and extract URLs from its `## Links` section. Expected shape:

```markdown
## Links
- [LinkedIn](https://www.linkedin.com/in/...)
- [YouTube](https://www.youtube.com/@...)
- [Instagram](https://www.instagram.com/...)
- [프라이머 지원하기](https://www.primer.kr/apply)
```

Rules:

- If the section is missing or empty, abort with: `persona.md에 \`## Links\` 섹션이 없어서 자동 업데이트 대상이 없어요. \`/openclone ingest <url>\`로 소스를 직접 알려주세요.`
- Classify each URL:
  - `youtube.com`, `youtu.be` → YouTube (use `fetch-youtube.sh`)
  - `linkedin.com`, `threads.net`, `twitter.com`, `x.com`, `instagram.com`, `facebook.com` → social feed (Chrome MCP scrape)
  - Static application/landing pages (`*/apply`, `*/about`) → skip; they aren't a content feed.
  - Everything else (blog, personal site, Substack, news) → general web (Chrome MCP scrape)
- If a URL needs disambiguation ("which YouTube playlist?"), ask once before scraping.

### 5. Harvest per source, keeping only items newer than the cutoff

For each retained URL:

**Social feeds (LinkedIn / Threads / X / Instagram / Facebook):**

- `mcp__claude-in-chrome__navigate` to the profile/feed.
- `read_page` / `get_page_text` to get rendered body. Scroll as needed, but cap at ~30 posts or when you hit a post older than the cutoff (whichever first).
- For each candidate post, extract: post URL, publication date, text, and any embedded media captions. Discard items dated ≤ cutoff. If dates are fuzzy ("2일 전"), resolve to an absolute date using today's date and cross-check against the post URL when possible.
- Record the real post URL — that becomes `source_url` in the knowledge frontmatter, not the profile URL.

**YouTube:**

- Call `${CLAUDE_SKILL_DIR}/scripts/fetch-youtube.sh <video-url>` per video. For a channel URL, list the channel's recent videos with Chrome MCP (or `yt-dlp --flat-playlist` if available), filter to publication dates > cutoff, then fetch each transcript.
- yt-dlp missing → don't fail the whole flow; log "yt-dlp not installed, skipped YouTube" and continue.
- Subtitles unavailable for a specific video → skip that video with a note in the final summary, don't abort.

**General web:**

- `mcp__claude-in-chrome__navigate` + `read_page`. For feed-like pages (blog index, Substack archive), extract the list, filter by date, then fetch each post body individually. For single articles, check the article's publish date before harvesting.

**Login walls / rate limits:** don't pretend — record the source as "requires login, skipped" in the summary and move on.

### 6. Refine into dated knowledge files

Hand everything you kept to `refine-workflow.md`. Rules specific to update:

- Target directory: `~/.openclone/clones/<name>/knowledge/` (the user copy, after fork-on-write).
- Filename uses the **post's own publication date**, not today's: `YYYY-MM-DD-<topic-slug>.md`. Frontmatter includes both `published_at: <post date>` and `fetched: <today>`.
- If the same post-date + topic-slug is already on disk (re-run / overlap), append `-2`, `-3`, etc. Never overwrite.
- First-person voice, preserve facts, no meta references — same rules as refine-workflow.

### 7. Summarize to the user

One compact summary after writing:

> **<display_name>** 업데이트 완료.
> - 커버 기간: `<cutoff>` → `<today>` (<N>일)
> - 신규 지식 파일: M개 (LinkedIn a, YouTube b, blog c)
> - 건너뜀: login-wall로 접근 못한 소스 k개 (이름 나열)
> 다음 `/openclone <name>` 응답부터 최신 자료가 반영돼요.

If M = 0 (no new material since cutoff), say so in one line instead and skip the verbose summary:
> 새 자료가 없어요. 마지막 지식 일자는 여전히 `<cutoff>`.

## Invariants

- **Append-only.** Every file is new; no merges, no overwrites. Older entries stay valid background per the hook's recency-weighting guidance.
- **Fork-on-write for built-in clones.** `${CLAUDE_SKILL_DIR}/clones/<name>/` is read-only at runtime.
- **Chrome MCP required.** Do not fall back to `curl` / `WebFetch` for social surfaces. Abort cleanly and tell the user to connect the extension.
- **No emojis.** Same as every other openclone surface.
- **Match the user's language.** If the user asked in Korean, keep summaries in Korean; English → English.
