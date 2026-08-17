CODE REVIEW REPORT
==================

Files Reviewed: 7
Total Issues: 2
Architectural Status: BLOCK

CRITICAL (0)
------------
(none)

HIGH (1)
--------
1. src/lib/single-shot.ts:91-97 and src/lib/conversation.ts:257-263
   Issue: Terminal-control sanitization is still renderer-local. The new Markdown/OSC 8 hardening protects committed Ink Markdown rendering, but the non-Ink terminal output paths still stream model-controlled chunks directly with `stdout.write(chunk)` / `output.write(chunk)` before any `sanitizeTerminalText` boundary.
   Risk: A malicious model/tool/source chunk containing terminal control bytes can still reach a user's terminal in `--prompt`, piped/non-TTY single-shot, and classic interactive conversation paths. I verified ESC OSC 52, BEL, U+009D, and U+009C bytes are emitted unchanged by both `runSingleShot` and `runConversation` with a mocked stream.
   Fix: Move the terminal-safety helper to a shared lib boundary and sanitize only at terminal display/write time, not in stored model history. Wrap at least `runSingleShot` `onText`, `runConversation` `onText`, and resumed-history replay writes. Add regression tests for those output paths.

MEDIUM (0)
----------
(none)

LOW (1)
-------
1. src/ui/Markdown.tsx:68-72
   Issue: Compact citation detection still only accepts 1-2 digit link labels via `/^\d{1,2}$/`, while the citation contract describes sequential citations from `[1]` without a digit cap.
   Risk: `[100]` would render as a normal link with a visible href instead of the compact citation format, so renderer behavior can drift once long answers or large source sets exceed 99 citations.
   Fix: Change the compact citation matcher to `/^\d+$/`, or explicitly document/enforce a citation-number cap in the shared citation contract and hook prompt.

ARCHITECTURE BLOCKERS
---------------------
- `src/ui/terminal-safety.ts:1-22` is a good shared primitive for the Markdown renderer, and `src/ui/Markdown.tsx:64-89` correctly validates/canonicalizes compact hrefs before OSC 8 emission. However, the safety boundary is not yet shared across every terminal output surface.
- `src/lib/single-shot.ts:91-97` and `src/lib/conversation.ts:257-263` stream raw chunks directly to terminal streams. This is the blocking bypass I reproduced dynamically.
- `src/lib/conversation.ts:203-215` also replays prior summaries/messages directly to the terminal, so persisted unsafe content can be re-emitted on resume.
- `src/ui/App.tsx:234-236` and `src/ui/App.tsx:285-287` keep live Ink streaming outside the Markdown sanitizer. Even if Ink's renderer behavior may reduce some raw-control exposure, this path has no explicit terminal-safety boundary or regression coverage.

SYNTHESIS
---------
- code-reviewer recommendation: APPROVE for the three changed files in isolation
- architect status: BLOCK
- final recommendation: REQUEST CHANGES

Real Result from actual verification
------------------------------------
- Checked out `openclone/feature/#58` locally as `review/pr-60` and reviewed the diff against `openclone/dev`.
- Changed files verified: `src/ui/Markdown.tsx`, `src/ui/terminal-safety.ts`, `test/markdown-render.test.mjs`.
- Additional output-boundary files inspected because the PR claims terminal-control hardening: `src/ui/App.tsx`, `src/ui/MessageView.tsx`, `src/lib/conversation.ts`, `src/lib/single-shot.ts`.
- `git diff --check openclone/dev...HEAD`: passed.
- `npm run build && node --test test/markdown-render.test.mjs`: passed, 20/20 markdown-render tests. Note: the test run still prints the pre-existing `MaxListenersExceededWarning`, but exits green.
- Direct raw Markdown render probe passed for the changed renderer: safe compact `file:///tmp/openclone knowledge.md` emitted canonical OSC 8 target `file:///tmp/openclone%20knowledge.md`; the raw uncanonicalized href did not survive; malicious visible and compact href payloads emitted no OSC 52, BEL, U+009D, or U+009C bytes.
- Direct non-Ink output probe failed the broader terminal-safety claim: mocked `runSingleShot` streaming emitted ESC OSC 52, BEL, U+009D, and U+009C bytes unchanged through `stdout.write(chunk)`.
- Direct classic conversation output probe failed the same way: mocked `runConversation` streaming emitted ESC OSC 52, BEL, U+009D, and U+009C bytes unchanged through `output.write(chunk)`.
- `npm run validate`: passed typecheck, build, 124/124 tests, and hook smoke tests.

Evidence reviewed
-----------------
- `src/ui/terminal-safety.ts:1-13`: rejects C0/DEL/C1 controls, allowlists `http:`, `https:`, and `file:`, and returns canonical `url.href` for safe terminal hyperlinks.
- `src/ui/Markdown.tsx:66-83`: compact citations use sanitized visible labels and only emit OSC 8 after `safeTerminalHyperlinkHref` returns a canonical href.
- `src/ui/Markdown.tsx:89`, `:97`, `:216-219`, `:258`, `:275`, `:288`: representative visible Markdown sinks now strip terminal controls.
- `test/markdown-render.test.mjs:112-204`: covers safe compact file citations, canonical percent encoding, malicious compact href rejection, displayed non-compact href stripping, and representative visible Markdown surfaces.
- `src/lib/single-shot.ts:96` and `src/lib/conversation.ts:262`: verified raw chunk writes remain unsanitized and dynamically reproduce the terminal-control bypass.

RECOMMENDATION: REQUEST CHANGES

Assumption: I treated terminal-control hardening as needing to cover every terminal output boundary that can display model/tool/source text, not only the committed Ink Markdown renderer, because the bypass is security-relevant and reproducible in shipped non-Ink CLI paths.

<!-- dani:stage=review_round;job=cf4e2db84bf544b897477de4c2d1f09c;pr=60;round=3;issue=59 -->
