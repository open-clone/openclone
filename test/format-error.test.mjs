import test from 'node:test';
import assert from 'node:assert/strict';
import { formatErrorBlock } from '../dist/lib/format-error.js';

function terminalControlPayload() {
  const nul = String.fromCharCode(0x00);
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const del = String.fromCharCode(0x7f);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `${nul}${esc}]52;c;SGVsbG8=${bel}${del}${c1Osc}52;c;SGVsbG8=${c1St}`;
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

test('formatErrorBlock uses plain error text instead of pictograph', () => {
  const block = formatErrorBlock(new Error('provider failed'));
  assert.match(block, /Error:/);
  assert.doesNotMatch(block, new RegExp(String.fromCodePoint(0x26a0), "u"));
});
