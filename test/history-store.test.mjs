import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  HistoryStore,
  newSessionId,
  sessionIdToIso,
} from '../dist/lib/history-store.js';

async function makeStore() {
  const baseDir = await mkdtemp(join(tmpdir(), 'openclone-history-'));
  const store = new HistoryStore({ baseDir });
  return {
    store,
    baseDir,
    cleanup: async () => { await rm(baseDir, { recursive: true, force: true }); },
  };
}

function terminalControlPayload() {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `${esc}]52;c;SGVsbG8=${bel}${c1Osc}52;c;SGVsbG8=${c1St}`;
}

function sampleRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    sessionId: '2026-04-28T14-32-19-487Z',
    cloneSlug: 'alice',
    cloneLabel: 'Alice (alice)',
    startedAt: '2026-04-28T14:30:00.000Z',
    updatedAt: '2026-04-28T14:35:00.000Z',
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ],
    conversationSummary: '',
    providerName: 'openclone-codex-oauth',
    modelId: 'gpt-5.5',
    ...overrides,
  };
}

test('newSessionId produces a filename-safe ISO-like timestamp', () => {
  const id = newSessionId(new Date('2026-04-28T14:32:19.487Z'));
  assert.equal(id, '2026-04-28T14-32-19-487Z');
  assert.match(id, /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
});

test('sessionIdToIso reverses newSessionId', () => {
  assert.equal(sessionIdToIso('2026-04-28T14-32-19-487Z'), '2026-04-28T14:32:19.487Z');
  assert.equal(sessionIdToIso('not-a-timestamp'), 'not-a-timestamp');
});

test('newSessionId stays unique for rapid session starts', () => {
  const ids = Array.from({ length: 10 }, () => newSessionId());
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), ids);
});

test('save → load round-trips a session record', async () => {
  const { store, cleanup } = await makeStore();
  try {
    const record = sampleRecord();
    const path = await store.save(record);
    assert.match(path, /alice\/2026-04-28T14-32-19-487Z\.json$/);

    const raw = await readFile(path, 'utf8');
    const parsedJson = JSON.parse(raw);
    assert.equal(parsedJson.cloneSlug, 'alice');
    assert.equal(parsedJson.messages.length, 2);

    const loaded = await store.load('alice', record.sessionId);
    assert.deepEqual(loaded, record);
  } finally {
    await cleanup();
  }
});

test('save rejects records without sessionId or cloneSlug', async () => {
  const { store, cleanup } = await makeStore();
  try {
    await assert.rejects(() => store.save({ ...sampleRecord(), sessionId: '' }), /sessionId is required/);
    await assert.rejects(() => store.save({ ...sampleRecord(), cloneSlug: '' }), /cloneSlug is required/);
  } finally {
    await cleanup();
  }
});

test('save with same sessionId overwrites in place (turn-by-turn updates)', async () => {
  const { store, cleanup } = await makeStore();
  try {
    const r1 = sampleRecord();
    await store.save(r1);
    const r2 = { ...r1, messages: [...r1.messages, { role: 'user', content: 'one more' }] };
    await store.save(r2);

    const sessions = await store.list('alice');
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].messageCount, 3);
  } finally {
    await cleanup();
  }
});

test('list returns sessions newest first by sessionId', async () => {
  const { store, cleanup } = await makeStore();
  try {
    const older = sampleRecord({ sessionId: '2026-04-27T10-00-00-000Z', updatedAt: '2026-04-27T10:00:00.000Z' });
    const newer = sampleRecord({ sessionId: '2026-04-28T14-32-19-487Z' });
    await store.save(older);
    await store.save(newer);

    const sessions = await store.list('alice');
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].sessionId, newer.sessionId);
    assert.equal(sessions[1].sessionId, older.sessionId);
    assert.equal(sessions[0].messageCount, 2);
    assert.equal(sessions[0].cloneLabel, 'Alice (alice)');
  } finally {
    await cleanup();
  }
});

test('list returns empty array for clones with no sessions', async () => {
  const { store, cleanup } = await makeStore();
  try {
    const sessions = await store.list('nonexistent');
    assert.deepEqual(sessions, []);
  } finally {
    await cleanup();
  }
});

test('list skips non-json files and unreadable json without throwing', async () => {
  const { store, baseDir, cleanup } = await makeStore();
  try {
    await store.save(sampleRecord());
    const cloneDir = join(baseDir, 'alice');
    await writeFile(join(cloneDir, 'README.txt'), 'not a session', 'utf8');
    await writeFile(join(cloneDir, 'broken.json'), '{not valid json', 'utf8');

    const sessions = await store.list('alice');
    assert.equal(sessions.length, 2);
    const broken = sessions.find((entry) => entry.sessionId === 'broken');
    assert.ok(broken);
    assert.equal(broken.messageCount, undefined);
  } finally {
    await cleanup();
  }
});

test('findLatest returns the most recent session record', async () => {
  const { store, cleanup } = await makeStore();
  try {
    await store.save(sampleRecord({ sessionId: '2026-04-27T10-00-00-000Z' }));
    await store.save(sampleRecord({
      sessionId: '2026-04-28T14-32-19-487Z',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
        { role: 'user', content: 'follow up' },
      ],
    }));

    const latest = await store.findLatest('alice');
    assert.ok(latest);
    assert.equal(latest.sessionId, '2026-04-28T14-32-19-487Z');
    assert.equal(latest.messages.length, 3);
  } finally {
    await cleanup();
  }
});

test('findLatest returns undefined when no sessions exist', async () => {
  const { store, cleanup } = await makeStore();
  try {
    const latest = await store.findLatest('alice');
    assert.equal(latest, undefined);
  } finally {
    await cleanup();
  }
});

test('findLatest skips malformed session filenames that sort newer than a valid session', async () => {
  const { store, baseDir, cleanup } = await makeStore();
  try {
    const valid = sampleRecord({ sessionId: '2026-04-28T14-32-19-487Z' });
    await store.save(valid);
    await writeFile(join(baseDir, 'alice', 'zzzz.json'), JSON.stringify(sampleRecord({ sessionId: 'zzzz' })), 'utf8');

    const latest = await store.findLatest('alice');
    assert.ok(latest);
    assert.equal(latest.sessionId, valid.sessionId);
  } finally {
    await cleanup();
  }
});

test('findLatest skips unreadable newer session files and resumes the newest loadable session', async () => {
  const { store, baseDir, cleanup } = await makeStore();
  try {
    const valid = sampleRecord({ sessionId: '2026-04-28T14-32-19-487Z' });
    await store.save(valid);
    await writeFile(join(baseDir, 'alice', '2026-04-29T00-00-00-000Z.json'), '{not valid json', 'utf8');

    const latest = await store.findLatest('alice');
    assert.ok(latest);
    assert.equal(latest.sessionId, valid.sessionId);
  } finally {
    await cleanup();
  }
});

test('listClonesWithSessions returns clone slugs in alphabetical order', async () => {
  const { store, cleanup } = await makeStore();
  try {
    await store.save(sampleRecord({ cloneSlug: 'zebra', sessionId: '2026-04-26T10-00-00-000Z' }));
    await store.save(sampleRecord({ cloneSlug: 'alice', sessionId: '2026-04-27T10-00-00-000Z' }));
    await store.save(sampleRecord({ cloneSlug: 'bob', sessionId: '2026-04-28T10-00-00-000Z' }));

    const slugs = await store.listClonesWithSessions();
    assert.deepEqual(slugs, ['alice', 'bob', 'zebra']);
  } finally {
    await cleanup();
  }
});

test('listClonesWithSessions returns empty array when no sessions saved', async () => {
  const { store, cleanup } = await makeStore();
  try {
    const slugs = await store.listClonesWithSessions();
    assert.deepEqual(slugs, []);
  } finally {
    await cleanup();
  }
});

test('listClonesWithSessions ignores stray non-directory files in baseDir', async () => {
  const { store, baseDir, cleanup } = await makeStore();
  try {
    await store.save(sampleRecord({ cloneSlug: 'alice', sessionId: '2026-04-27T10-00-00-000Z' }));
    await writeFile(join(baseDir, 'README.txt'), 'not a clone dir', 'utf8');

    const slugs = await store.listClonesWithSessions();
    assert.deepEqual(slugs, ['alice']);
  } finally {
    await cleanup();
  }
});

test('listAllSessions aggregates sessions across all clones, newest first by updatedAt', async () => {
  const { store, cleanup } = await makeStore();
  try {
    await store.save(sampleRecord({
      cloneSlug: 'alice',
      sessionId: '2026-04-27T10-00-00-000Z',
      updatedAt: '2026-04-27T10:00:00.000Z',
    }));
    await store.save(sampleRecord({
      cloneSlug: 'bob',
      sessionId: '2026-04-28T15-00-00-000Z',
      updatedAt: '2026-04-28T15:00:00.000Z',
    }));
    await store.save(sampleRecord({
      cloneSlug: 'alice',
      sessionId: '2026-04-28T20-00-00-000Z',
      updatedAt: '2026-04-28T20:00:00.000Z',
    }));

    const all = await store.listAllSessions();
    assert.equal(all.length, 3);
    assert.equal(all[0].cloneSlug, 'alice');
    assert.equal(all[0].sessionId, '2026-04-28T20-00-00-000Z');
    assert.equal(all[1].cloneSlug, 'bob');
    assert.equal(all[2].cloneSlug, 'alice');
    assert.equal(all[2].sessionId, '2026-04-27T10-00-00-000Z');
  } finally {
    await cleanup();
  }
});

test('listAllSessions returns empty array when no clone has sessions', async () => {
  const { store, cleanup } = await makeStore();
  try {
    assert.deepEqual(await store.listAllSessions(), []);
  } finally {
    await cleanup();
  }
});

test('load normalizes a record with missing optional fields', async () => {
  const { store, baseDir, cleanup } = await makeStore();
  try {
    const cloneDir = join(baseDir, 'alice');
    await mkdir(cloneDir, { recursive: true });
    const sessionId = '2026-04-28T14-32-19-487Z';
    await writeFile(
      join(cloneDir, `${sessionId}.json`),
      JSON.stringify({ messages: [{ role: 'user', content: 'partial' }] }),
      'utf8',
    );

    const loaded = await store.load('alice', sessionId);
    assert.equal(loaded.schemaVersion, 1);
    assert.equal(loaded.sessionId, sessionId);
    assert.equal(loaded.cloneSlug, 'alice');
    assert.equal(loaded.cloneLabel, 'alice');
    assert.equal(loaded.conversationSummary, '');
    assert.equal(loaded.messages.length, 1);
  } finally {
    await cleanup();
  }
});

test('load rejects non filename-safe session ids before building a path', async () => {
  const { store, cleanup } = await makeStore();
  try {
    await assert.rejects(
      () => store.load('alice', '../2026-04-28T14-32-19-487Z'),
      /Invalid sessionId/,
    );
    await assert.rejects(
      () => store.load('alice', `2026-04-28T14-32-19-487Z${terminalControlPayload()}`),
      /Invalid sessionId/,
    );
  } finally {
    await cleanup();
  }
});

test('public history paths reject non-canonical clone slugs before joining paths', async () => {
  const { store, cleanup } = await makeStore();
  try {
    assert.throws(() => store.cloneDir('../alice'), /Invalid clone slug/);
    assert.throws(() => store.sessionPath('../alice', '2026-04-28T14-32-19-487Z'), /Invalid clone slug/);
    await assert.rejects(() => store.ensureCloneDir('../alice'), /Invalid clone slug/);
    await assert.rejects(() => store.list('../alice'), /Invalid clone slug/);
    await assert.rejects(() => store.findLatest('../alice'), /Invalid clone slug/);
    await assert.rejects(
      () => store.save(sampleRecord({ cloneSlug: '../alice' })),
      /Invalid clone slug/,
    );
    await assert.rejects(
      () => store.load('../alice', '2026-04-28T14-32-19-487Z'),
      /Invalid clone slug/,
    );
  } finally {
    await cleanup();
  }
});

test('cross-clone listing ignores non-canonical history directories', async () => {
  const { store, baseDir, cleanup } = await makeStore();
  try {
    await store.save(sampleRecord({ cloneSlug: 'alice', sessionId: '2026-04-27T10-00-00-000Z' }));
    await mkdir(join(baseDir, 'bad_slug'), { recursive: true });
    await writeFile(
      join(baseDir, 'bad_slug', '2026-04-28T10-00-00-000Z.json'),
      JSON.stringify(sampleRecord({ cloneSlug: 'bad_slug', sessionId: '2026-04-28T10-00-00-000Z' })),
      'utf8',
    );

    assert.deepEqual(await store.listClonesWithSessions(), ['alice']);
    const all = await store.listAllSessions();
    assert.equal(all.length, 1);
    assert.equal(all[0].cloneSlug, 'alice');
  } finally {
    await cleanup();
  }
});

test('load canonicalizes sessionId to the requested filename-safe id', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'openclone-history-'));
  const store = new HistoryStore({ baseDir: dir });
  try {
    const sessionId = '2026-04-28T14-32-19-487Z';
    const payload = terminalControlPayload();
    const cloneDir = join(dir, 'alice');
    await mkdir(cloneDir, { recursive: true });
    await writeFile(join(cloneDir, `${sessionId}.json`), JSON.stringify({
      ...sampleRecord(),
      sessionId: `${sessionId}${payload}`,
      cloneSlug: 'alice',
    }));

    const loaded = await store.load('alice', sessionId);
    assert.equal(loaded.sessionId, sessionId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
