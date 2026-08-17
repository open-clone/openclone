CODE REVIEW REPORT
==================

Files Reviewed: 13 changed files directly (`src/lib/conversation.ts`, `src/lib/format-error.ts`, `src/lib/single-shot.ts`, `src/lib/terminal-safety.ts`, `src/ui/App.tsx`, `src/ui/ErrorBanner.tsx`, `src/ui/Markdown.tsx`, `src/ui/MessageView.tsx`, and 5 test files) plus adjacent terminal display/history/debug sinks (`src/ui/HeaderBar.tsx`, `src/cli/index.ts`, `src/lib/history-store.ts`, `src/lib/provider-resolver.ts`).
Total Issues: 3
Architectural Status: WATCH

CRITICAL (0)
------------
(none)

HIGH (1)
--------
1. `src/lib/single-shot.ts:124` (related: `src/lib/history-store.ts:165`, `src/cli/index.ts:305-315`)
   Issue: history-controlled session metadata can still reach the terminal unsanitized. `HistoryStore.normalizeRecord()` trusts `parsed.sessionId` over the filename/requested id, and `runSingleShot()` prints that value in the `[session: ...]` marker. History listing/resume hints also print session metadata (`sessionId`, `updatedAt`, `path`) without the new terminal-safety boundary.
   Risk: a malformed local session JSON can still emit OSC/BEL/C1 controls even though message bodies and model streams are now sanitized. This is still a shipped CLI terminal display boundary and is history-controlled input.
   Fix: make the filename/requested session id canonical or validate `parsed.sessionId` against the filename-safe session-id contract, sanitize terminal-rendered history metadata/session markers, and add regression tests with malicious `sessionId` / `updatedAt` values.

MEDIUM (2)
----------
1. `src/ui/HeaderBar.tsx:10-18`, `src/lib/conversation.ts:198`, `src/ui/App.tsx:283`, `src/ui/MessageView.tsx:33`
   Issue: non-message labels still render raw strings: classic `cloneLabel`, Ink `cloneLabel` / `modelLabel` / `sessionLabel`, and assistant `speakerLabel`.
   Risk: clone display names can be user-authored/generated persona metadata, and model/provider labels can also be terminal-facing strings. These are lower risk than model response text but still contradict the stated “every shipped CLI terminal display boundary” scope.
   Fix: sanitize labels at render/write boundaries, preferably inside `HeaderBar`, `MessageView`, and the classic conversation header. Add tests for malicious clone/model/speaker labels.

2. `src/lib/provider-resolver.ts:183-199`
   Issue: `OPENCLONE_DEBUG_HTTP=1` logs raw request/response URL/header/body text via `console.error()` without `sanitizeTerminalText()`.
   Risk: provider-controlled response bodies and headers can print terminal controls in debug mode. Debug-only lowers exposure, but it is still a shipped terminal display path.
   Fix: sanitize debug log fields after redaction/truncation and add a debug-log regression with ESC/BEL/C1 payloads.

LOW (1)
-------
1. `src/ui/Markdown.tsx:113-115`
   Issue: OSC 8 envelope construction remains local to `Markdown.tsx`; `terminal-safety.ts` only validates/canonicalizes hrefs.
   Risk: future hyperlink emitters could validate but reconstruct OSC framing inconsistently.
   Fix: consider moving complete safe OSC 8 hyperlink emission into `terminal-safety.ts` so validation, canonicalization, and framing stay inseparable.

POSITIVE NOTES
--------------
- The prior live Ink streaming blocker is addressed: `src/ui/App.tsx:235-237` sanitizes chunks before they enter the streaming display buffer.
- Classic conversation and single-shot streaming sanitize terminal writes while preserving raw returned/persisted assistant text.
- Resume replay for classic and Ink paths now sanitizes summary/message display while keeping raw history as model context.
- Compact citation handling now rejects C0/DEL/C1 controls, allowlists `http:`, `https:`, and `file:`, canonicalizes hrefs, and handles 3+ digit citations.

REAL RESULT
-----------
- `npm run build && node --test test/single-shot.test.mjs test/conversation.test.mjs test/format-error.test.mjs test/markdown-render.test.mjs test/ink-conversation.test.mjs` passed: 65/65 focused tests.
- `npm run validate` passed: typecheck, build, 131/131 node tests, and hook smoke tests.
- Direct Ink live-stream probe against built `dist` held the stream open before commit and confirmed no OSC 52, BEL, U+009D, or U+009C reached captured Ink frames while the raw response value stayed intact.
- Direct malformed-history probe reproduced the remaining blocker: a session JSON whose `sessionId` contains `ESC ]52... BEL` plus C1 OSC/ST was loaded via `--resume=<filename id>`, and `runSingleShot()` printed those controls in stderr as `[session: 2026-01-01T00-00-00-000Z\u001b]52;c;SGVsbG8=\u0007\u009d52;c;SGVsbG8=\u009c]`.

SYNTHESIS
---------
- code-reviewer recommendation: REQUEST CHANGES
- architect status: WATCH
- final recommendation: REQUEST CHANGES

RECOMMENDATION: REQUEST CHANGES

The model/conversation text hardening is substantially improved and the original Ink streaming gap is fixed, but the PR still leaves history/debug/metadata-controlled terminal display boundaries unsanitized. Please close those remaining CLI output sinks or narrow the PR claim before merge.

<!-- dani:stage=review_round;job=d53c712f66ab46f8a21d711a61bfedc4;pr=61;round=2;issue=60 -->
