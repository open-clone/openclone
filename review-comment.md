CODE REVIEW REPORT
==================

Files Reviewed: 2 changed files
- `src/ui/Markdown.tsx`
- `test/markdown-render.test.mjs`

Total Issues: 1
Architectural Status: BLOCK

CRITICAL (0)
------------
(none)

HIGH (1)
--------
1. `src/ui/Markdown.tsx:28`, `src/ui/Markdown.tsx:32`, `src/ui/Markdown.tsx:62`, `src/ui/Markdown.tsx:90`, `src/ui/Markdown.tsx:99`, `src/ui/Markdown.tsx:110`, `src/ui/Markdown.tsx:236`, `src/ui/Markdown.tsx:275`, `src/ui/Markdown.tsx:292`, `src/ui/Markdown.tsx:305`
   Issue: Round 3 still applies terminal-control sanitization only to hyperlink href paths, not to all untrusted text emitted by the Ink Markdown renderer. Visible Markdown content can still carry C0/DEL/C1 control bytes into `<Text>` through plain text, escapes, link labels, inline code, images, code blocks, HTML, default fallbacks, and lexer-error fallback.

   Evidence:
   - Compact citation hrefs are validated at `src/ui/Markdown.tsx:69-85`, displayed non-compact hrefs are stripped at `src/ui/Markdown.tsx:91`, and the sanitizer helpers live at `src/ui/Markdown.tsx:119-131`.
   - Visible text paths still render source-controlled strings directly: `decodeEntities(t.text)` at line 28, `t.text` at line 32, decoded codespan text at line 62, link label tokens at line 90, image text/href at line 99, inline fallback at line 110, fenced-code `line` at line 236, HTML raw at line 275, block fallback at line 292, and raw lexer-error fallback `text` at line 305.
   - The new tests in `test/markdown-render.test.mjs:121-166` cover malicious compact hrefs and displayed non-compact hrefs, but still do not cover visible text/code/html/image/default output surfaces from the Round 2 blocker.

   Real Result from actual verification:
   - `$code-review` was run with parallel code-reviewer and architect lanes. Both independently found the sanitizer boundary is still href-local rather than terminal-output-local; code-reviewer recommendation was REQUEST CHANGES and architect status was BLOCK.
   - `npm run build && node --test test/markdown-render.test.mjs` passed 18/18.
   - `npm run validate` passed typecheck, build, 122 tests, and hook smoke tests.
   - A direct Ink render probe against the built `dist/ui/Markdown.js` confirmed the intended href behavior still works: safe compact `file:///tmp/openclone-knowledge.md` emitted OSC 8, and a malicious compact href containing ESC/BEL did not emit the injected OSC 52 payload.
   - The same probe confirmed the remaining bypass: raw output still contained U+009D and U+009C for plain text, link label, inline code, fenced code block, and HTML inputs:
     ```text
     plain_c1: hasC1Osc=true hasC1St=true hasEsc52=false hasOsc8File=false
     link_label_c1: hasC1Osc=true hasC1St=true hasEsc52=false hasOsc8File=false
     inline_code_c1: hasC1Osc=true hasC1St=true hasEsc52=false hasOsc8File=false
     fenced_code_c1: hasC1Osc=true hasC1St=true hasEsc52=false hasOsc8File=false
     html_c1: hasC1Osc=true hasC1St=true hasEsc52=false hasOsc8File=false
     compact_href_file_safe: hasC1Osc=false hasC1St=false hasEsc52=false hasOsc8File=true
     compact_href_esc_reject: hasC1Osc=false hasC1St=false hasEsc52=false hasOsc8File=false
     ```

   Fix: Move the terminal-control sanitizer to the terminal output boundary. Apply a shared helper to every source/model/tool-controlled string before it becomes an Ink `<Text>` child: text, escape, codespan, link label descendants, image label/href fallback, code block language/lines, HTML raw, inline/block default fallbacks, and lexer-failure fallback. Keep renderer-owned OSC 8 bytes as the explicit exception, only after `safeTerminalHyperlinkHref()` accepts `http:`, `https:`, or `file:` hrefs. Add table-driven regressions for visible text, link labels, inline code, fenced code, HTML, image labels, and fallback paths.

MEDIUM (0)
----------
(none)

LOW (0)
-------
(none)

ARCHITECTURE BLOCKERS
---------------------
- `src/ui/Markdown.tsx:69-85`, `src/ui/Markdown.tsx:91`, `src/ui/Markdown.tsx:119-131`
  Concern: The implementation treats terminal-control hardening as a link-href concern, but the actual boundary is every untrusted string before terminal rendering. Because the sanitizer is not centralized at that sink boundary, existing and future render branches can bypass it.
  Status: BLOCK
  Recommendation: Block merge until terminal-output sanitization is applied consistently across Markdown visible/render fallback paths, while keeping OSC 8 generation as a renderer-owned exception after href validation.

SYNTHESIS
---------
- code-reviewer recommendation: REQUEST CHANGES
- architect status: BLOCK
- final recommendation: REQUEST CHANGES

RECOMMENDATION: REQUEST CHANGES

The Round 1 `file://` compact citation regression remains fixed and the test suite is green, but the Round 2 terminal-control blocker is still not resolved for visible Markdown output.

<!-- dani:stage=review_round;job=d151c73ec58c4c50b79a996ba2cf0414;pr=59;round=3;issue=58 -->
