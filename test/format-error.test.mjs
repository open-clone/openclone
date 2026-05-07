import test from "node:test";
import assert from "node:assert/strict";
import { formatErrorBlock } from "../dist/lib/format-error.js";

function terminalControlPayload() {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `${esc}]52;c;SGVsbG8=${bel}${c1Osc}52;c;SGVsbG8=${c1St}`;
}

function assertNoTerminalControls(text) {
  assert.doesNotMatch(text, /\u001b\]52;c;SGVsbG8=/u);
  assert.doesNotMatch(text, /\u0007/u);
  assert.doesNotMatch(text, /\u009d/u);
  assert.doesNotMatch(text, /\u009c/u);
}

test("formatErrorBlock strips terminal controls from provider-controlled error text", () => {
  const payload = terminalControlPayload();
  const formatted = formatErrorBlock(new Error(`provider failed ${payload} text`));

  assertNoTerminalControls(formatted);
  assert.match(formatted, /provider failed \]?52;c;SGVsbG8=52;c;SGVsbG8= text/);
});
