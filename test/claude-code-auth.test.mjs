import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadClaudeCodeCredentials,
  ensureFreshClaudeCodeCredentials,
  refreshClaudeCodeToken,
  CLAUDE_CODE_OAUTH_TOKEN_URL,
  CLAUDE_CODE_OAUTH_CLIENT_ID,
} from '../dist/lib/claude-code-auth.js';

function tokenFixture(overrides = {}) {
  return {
    accessToken: 'sk-ant-old-access',
    refreshToken: 'rt-old',
    expiresAt: Date.now() + 60 * 60 * 1000,
    scopes: ['user:inference'],
    subscriptionType: 'max',
    ...overrides,
  };
}

async function makeClaudeHomeWithFile(tokens) {
  const home = await mkdtemp(join(tmpdir(), 'openclone-claude-'));
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(join(home, '.claude', '.credentials.json'), JSON.stringify({ claudeAiOauth: tokens }, null, 2));
  return home;
}

test('loadClaudeCodeCredentials reads from ~/.claude/.credentials.json on Linux-style storage', async () => {
  const tokens = tokenFixture();
  const home = await makeClaudeHomeWithFile(tokens);
  const record = await loadClaudeCodeCredentials({ HOME: home });
  assert.equal(record.storage, 'file');
  assert.equal(record.tokens.accessToken, tokens.accessToken);
  assert.equal(record.tokens.refreshToken, tokens.refreshToken);
  assert.equal(record.tokens.subscriptionType, 'max');
});

test('loadClaudeCodeCredentials throws a friendly error when no credentials are present', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-claude-'));
  // Pass an empty keychain adapter so the keychain branch is taken (and yields null) on every platform.
  const adapters = { keychain: { read: async () => null, write: async () => undefined } };
  await assert.rejects(
    () => loadClaudeCodeCredentials({ HOME: home, USER: 'tester' }, adapters),
    /claude \/login/,
  );
});

test('loadClaudeCodeCredentials prefers an injected keychain adapter when no file exists', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-claude-'));
  const tokens = tokenFixture({ accessToken: 'sk-ant-from-keychain' });
  const adapters = {
    keychain: {
      read: async (account) => {
        assert.equal(account, 'tester');
        return JSON.stringify({ claudeAiOauth: tokens });
      },
      write: async () => undefined,
    },
  };
  const record = await loadClaudeCodeCredentials({ HOME: home, USER: 'tester' }, adapters);
  assert.equal(record.storage, 'keychain');
  assert.equal(record.account, 'tester');
  assert.equal(record.tokens.accessToken, 'sk-ant-from-keychain');
});

test('refreshClaudeCodeToken posts grant_type=refresh_token with the Claude Code client_id', async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return new Response(
      JSON.stringify({ access_token: 'sk-ant-new', refresh_token: 'rt-new', expires_in: 3600, scope: 'user:inference' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const next = await refreshClaudeCodeToken('rt-old', { fetch: fakeFetch, now: () => 1_700_000_000_000 });
  assert.equal(captured.url, CLAUDE_CODE_OAUTH_TOKEN_URL);
  assert.equal(captured.init.method, 'POST');
  const body = JSON.parse(captured.init.body);
  assert.equal(body.grant_type, 'refresh_token');
  assert.equal(body.refresh_token, 'rt-old');
  assert.equal(body.client_id, CLAUDE_CODE_OAUTH_CLIENT_ID);
  assert.equal(next.accessToken, 'sk-ant-new');
  assert.equal(next.refreshToken, 'rt-new');
  assert.equal(next.expiresAt, 1_700_000_000_000 + 3600 * 1000);
});

test('refreshClaudeCodeToken throws and points to claude /login when the token endpoint rejects the refresh', async () => {
  const fakeFetch = async () => new Response('expired', { status: 401 });
  await assert.rejects(
    () => refreshClaudeCodeToken('rt-old', { fetch: fakeFetch }),
    /claude \/login/,
  );
});

test('ensureFreshClaudeCodeCredentials skips refresh when the token is comfortably valid', async () => {
  const tokens = tokenFixture({ expiresAt: Date.now() + 60 * 60 * 1000 });
  const home = await makeClaudeHomeWithFile(tokens);
  const record = await loadClaudeCodeCredentials({ HOME: home });
  let called = false;
  const fakeFetch = async () => {
    called = true;
    return new Response('{}', { status: 200 });
  };
  const next = await ensureFreshClaudeCodeCredentials(record, { HOME: home }, { fetch: fakeFetch });
  assert.equal(called, false);
  assert.equal(next.tokens.accessToken, tokens.accessToken);
});

test('ensureFreshClaudeCodeCredentials refreshes near-expiry tokens and persists the new value to the credentials file', async () => {
  const tokens = tokenFixture({ expiresAt: Date.now() + 1000 }); // < 5 min margin
  const home = await makeClaudeHomeWithFile(tokens);
  const record = await loadClaudeCodeCredentials({ HOME: home });
  const fakeFetch = async () =>
    new Response(
      JSON.stringify({ access_token: 'sk-ant-fresh', refresh_token: 'rt-fresh', expires_in: 3600 }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  const next = await ensureFreshClaudeCodeCredentials(record, { HOME: home }, { fetch: fakeFetch });
  assert.equal(next.tokens.accessToken, 'sk-ant-fresh');
  assert.equal(next.tokens.refreshToken, 'rt-fresh');
  const onDisk = JSON.parse(await readFile(join(home, '.claude', '.credentials.json'), 'utf8'));
  assert.equal(onDisk.claudeAiOauth.accessToken, 'sk-ant-fresh');
  assert.equal(onDisk.claudeAiOauth.refreshToken, 'rt-fresh');
});
