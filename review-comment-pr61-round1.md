CODE REVIEW REPORT
==================

Files Reviewed: 3 changed files directly (`src/ui/Markdown.tsx`, `src/ui/terminal-safety.ts`, `test/markdown-render.test.mjs`) plus adjacent streaming/committed render paths (`src/ui/App.tsx`, `src/ui/MessageView.tsx`).
Total Issues: 1
Architectural Status: BLOCK

CRITICAL (0)
------------
(none)

HIGH (1)
--------
1. `src/ui/App.tsx:279-287`
   Issue: live assistant streaming still renders raw text with `<Text>{streaming || ""}</Text>`, bypassing the terminal-control sanitizer introduced in this PR. Completed assistant messages go through `<Markdown text={item.text} />` in `src/ui/MessageView.tsx:27-37`, but the same response is unsafe while it is still streaming.
   Risk: terminal control bytes can reach the user's terminal before the final committed Markdown render strips them. For terminal-control injection, the transient streaming frame is enough to matter.
   Fix: apply the shared `sanitizeTerminalText` helper to the streaming text path, or render streaming through the same Markdown/safety boundary. Add an Ink/App-level regression test that streams C0/C1/OSC-like payloads and asserts the raw frames do not contain those controls before commit.

MEDIUM (0)
----------
(none)

LOW (1)
-------
1. `src/ui/Markdown.tsx:113-115`
   Issue: OSC 8 envelope construction remains local to `Markdown.tsx`; `terminal-safety.ts` only validates/canonicalizes hrefs.
   Risk: future terminal hyperlink emitters could call validation but reconstruct OSC 8 incorrectly or skip the validated value.
   Fix: consider moving complete safe hyperlink emission into `terminal-safety.ts` so validation, canonicalization, and OSC framing stay inseparable.

POSITIVE NOTES
--------------
- `src/ui/terminal-safety.ts:5-13` rejects C0/DEL/C1 bytes before URL parsing and allowlists `http:`, `https:`, and `file:`.
- `src/ui/Markdown.tsx:66-83` uses the validated canonical href for compact citation OSC 8 links.
- `test/markdown-render.test.mjs:112-204` covers safe file citation clickability, canonical `file://` percent-encoding, malicious compact href rejection, non-compact href stripping, and visible Markdown content sanitization.

REAL RESULT
-----------
- `npm run build && node --test test/markdown-render.test.mjs` passed: 20/20 markdown-render tests.
- `npm run validate` passed: typecheck, build, 124 node tests, and hook smoke tests.
- Additional direct Ink streaming probe against the built `dist` reproduced the gap: while a mocked stream was held open after `onText`, the raw captured Ink frames contained both C1 OSC (`U+009D`) and C1 ST (`U+009C`) from the streaming assistant chunk before final commit.

SYNTHESIS
---------
- code-reviewer recommendation: APPROVE
- architect status: BLOCK
- final recommendation: REQUEST CHANGES

RECOMMENDATION: REQUEST CHANGES

Please route the live streaming assistant output through the same terminal-safety boundary and add a streaming-path regression test before merge.

<!-- dani:stage=review_round;job=9514cc7c30134151a6564c07f876c383;pr=61;round=1;issue=60 -->
