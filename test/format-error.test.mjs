import test from 'node:test';
import assert from 'node:assert/strict';
import { formatErrorBlock } from '../dist/lib/format-error.js';

function terminalControlPayload() {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `${esc}]52;c;SGVsbG8=${bel}${c1Osc}52;c;SGVsbG8=${c1St}`;
}

function assertNoTerminalControls(text) {
  assert.doesNotMatch(text, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u);
  assert.doesNotMatch(text, /\u001b\]52;c;SGVsbG8=/u);
}

test('formatErrorBlock sanitizes terminal controls from error messages', () => {
  const payload = terminalControlPayload();
  const block = formatErrorBlock(new Error(`provider failed${payload}`));
  assertNoTerminalControls(block);
  assert.match(block, /provider failed/);
});
