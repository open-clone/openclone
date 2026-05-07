import test from 'node:test';
import assert from 'node:assert/strict';
import {
  historyHeaderLine,
  formatSessionLine,
  resumeHintLine,
  historyFooterHint,
  historyHelp,
} from '../dist/cli/index.js';

const sampleEntry = {
  sessionId: '2026-04-28T15-38-41-598Z',
  cloneSlug: 'douglas',
  path: '/Users/jeffrey/.openclone/conversations/douglas/2026-04-28T15-38-41-598Z.json',
  startedAt: '2026-04-28T15:38:41.598Z',
  updatedAt: '2026-04-28T15:50:23.179Z',
  messageCount: 6,
  cloneLabel: '권도균 (douglas)',
};

test('history header lists all four columns in fixed order', () => {
  assert.equal(historyHeaderLine(), 'SESSION_ID\tMESSAGES\tLAST_UPDATED\tPATH');
});

test('formatSessionLine emits tab-separated columns matching header', () => {
  const line = formatSessionLine(sampleEntry);
  const cols = line.split('\t');
  assert.equal(cols.length, 4);
  assert.equal(cols[0], '2026-04-28T15-38-41-598Z');
  assert.equal(cols[1], '6 msgs');
  assert.equal(cols[2], 'updated 2026-04-28T15:50:23.179Z');
  assert.equal(cols[3], sampleEntry.path);
});

test('formatSessionLine falls back to sessionId-derived ISO when updatedAt missing', () => {
  const noUpdated = { ...sampleEntry, updatedAt: undefined };
  const line = formatSessionLine(noUpdated);
  assert.match(line, /updated 2026-04-28T15:38:41\.598Z/);
});

test('formatSessionLine treats missing messageCount as 0', () => {
  const noCount = { ...sampleEntry, messageCount: undefined };
  const line = formatSessionLine(noCount);
  assert.match(line, /\t0 msgs\t/);
});

test('resumeHintLine for latest session offers both --resume and explicit form', () => {
  const hint = resumeHintLine('douglas', '2026-04-28T15-38-41-598Z', true);
  assert.match(hint, /openclone chat douglas --resume\s/);
  assert.match(hint, /--resume=2026-04-28T15-38-41-598Z/);
});

test('resumeHintLine for non-latest session shows only explicit --resume=<id>', () => {
  const hint = resumeHintLine('douglas', '2026-04-27T09-15-42-123Z', false);
  assert.match(hint, /--resume=2026-04-27T09-15-42-123Z/);
  assert.doesNotMatch(hint, /--resume\s/);
});

test('history footer mentions all relevant flags so users know how to suppress', () => {
  const footer = historyFooterHint();
  assert.match(footer, /--resume/);
  assert.match(footer, /SESSION_ID/);
  assert.match(footer, /--quiet/);
});

test('historyHelp explains both single-clone and cross-clone usage with resume guidance', () => {
  const help = historyHelp();
  assert.match(help, /openclone history <slug>/);
  assert.match(help, /openclone history --all/);
  assert.match(help, /\[orphan: clone not found\]/);
  assert.match(help, /--quiet/);
  assert.match(help, /openclone chat <slug> --resume/);
  assert.match(help, /--resume=<SESSION_ID>/);
  assert.match(help, /SESSION_ID is the first column/);
  assert.match(help, /~\/\.openclone\/conversations/);
});


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

test('history formatting sanitizes metadata before terminal display', () => {
  const payload = terminalControlPayload();
  const line = formatSessionLine({
    ...sampleEntry,
    sessionId: `bad${payload}`,
    updatedAt: `updated${payload}`,
    path: `/tmp/openclone${payload}/bad.json`,
  });
  assertNoTerminalControls(line);
  assert.match(line, /bad/);
  assert.match(line, /updated/);
});

test('resume hint sanitizes slug and session metadata before terminal display', () => {
  const payload = terminalControlPayload();
  const latest = resumeHintLine(`douglas${payload}`, `2026${payload}`, true);
  const older = resumeHintLine(`douglas${payload}`, `2025${payload}`, false);
  assertNoTerminalControls(latest);
  assertNoTerminalControls(older);
  assert.match(latest, /douglas/);
  assert.match(older, /2025/);
});
