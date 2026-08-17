## Implementation update

Implemented the approved issue #68 follow-up on `feature/#68`.

### Fixes

- Added TDD regressions for non-canonical clone slugs reaching `HistoryStore` public path/list/load/save surfaces.
- Added TDD coverage that cross-clone history discovery ignores non-canonical stray history directories.
- Centralized clone-slug validation at `HistoryStore.cloneDir()` so path builders validate both slug and session ID before filesystem joins.
- Filtered `listClonesWithSessions()` to canonical slug directory names.
- Updated README and nested CLI docs to make the single-shot contract explicit: `stdout` is terminal-safe display text, while raw model output remains in saved session JSON.

### Validation

- TDD red: `node --test test/history-store.test.mjs` failed before implementation with missing slug-validation exceptions and `bad_slug` appearing in cross-clone listings.
- TDD green: `npm run build && node --test test/history-store.test.mjs` passed 23/23.
- Full green: `npm run validate` passed typecheck, build, 157 node tests, and hook smoke tests across 5 cases.
- Docs/format green: `node .github/scripts/validate-readme-i18n.ts`, targeted markdownlint for changed docs, and `git diff --check` passed.
- Ralph architect verification: APPROVED.
- Deslop pass: changed-file-only fallback/slop scan found no masking fallback slop.

### Delivery

- Branch pushed: `feature/#68`
- PR targeting `dev` for `feature/#68`: https://github.com/open-clone/openclone/pull/70

<!-- dani:stage=implementation;job=1bbbf39c6bbf4f2aa3b224dad0ea88cb;issue=68;pr=69 -->
