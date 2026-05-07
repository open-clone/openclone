import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeTerminalField,
  sanitizeTerminalLine,
  sanitizeTerminalText,
} from '../dist/lib/terminal-safety.js';

function terminalControlPayload() {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `${esc}]52;c;SGVsbG8=${bel}${c1Osc}52;c;SGVsbG8=${c1St}`;
}

function assertNoTerminalControls(text) {
  assert.doesNotMatch(text, /[\u0000-\u001f\u007f-\u009f]/u);
}

test('sanitizeTerminalText keeps multiline prose separators while removing terminal controls', () => {
  assert.equal(sanitizeTerminalText(`alpha\n\tbeta${terminalControlPayload()}tail`), 'alpha\n\tbeta]52;c;SGVsbG8=52;c;SGVsbG8=tail');
});

test('sanitizeTerminalField collapses record and field separators for table cells', () => {
  const sanitized = sanitizeTerminalField(`alpha\n\tbeta\rgamma${terminalControlPayload()}tail`);
  assert.equal(sanitized, 'alpha beta gamma]52;c;SGVsbG8=52;c;SGVsbG8=tail');
  assertNoTerminalControls(sanitized);
});

test('sanitizeTerminalLine collapses record separators but preserves tab delimiters', () => {
  const sanitized = sanitizeTerminalLine(`alpha\n\rbeta\tcell${terminalControlPayload()}tail`);
  assert.equal(sanitized, 'alpha beta\tcell]52;c;SGVsbG8=52;c;SGVsbG8=tail');
  assert.doesNotMatch(sanitized, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u);
});
