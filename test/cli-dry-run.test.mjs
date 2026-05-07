import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function terminalControlPayload() {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const del = String.fromCharCode(0x7f);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `A${esc}]52;c;SGVsbG8=${bel}B${del}C${c1Osc}D${c1St}E`;
}

function assertNoTerminalControls(text) {
  assert.doesNotMatch(text, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u);
  assert.doesNotMatch(text, /\u001b\]52;c;SGVsbG8=/u);
}

test("chat --dry-run escapes terminal controls in rendered JSON stdout", async () => {
  const payload = terminalControlPayload();
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    "dist/cli/index.js",
    "chat",
    "douglas",
    "--prompt",
    payload,
    "--dry-run",
  ], { cwd: process.cwd(), env: { ...process.env, NO_COLOR: "1" }, maxBuffer: 1024 * 1024 * 4 });

  assert.equal(stderr, "");
  assertNoTerminalControls(stdout);
  assert.match(stdout, /\\u009dD\\u009c/);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.user, payload);
});
