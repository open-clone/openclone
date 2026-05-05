import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveProvider,
  normalizeClaudeCodeHeaders,
  splitClaudeCodeSystemBlocks,
  CLAUDE_CODE_IDENTITY_PROMPT,
} from '../dist/lib/provider-resolver.js';

function fakeJwt(exp) {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${header}.${payload}.sig`;
}

test('provider resolver does not read Codex auth unless OAuth is explicitly requested', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.codex'), { recursive: true });
  await writeFile(join(home, '.codex', 'auth.json'), JSON.stringify({ OPENAI_API_KEY: 'codex-file-key' }));
  await assert.rejects(
    () => resolveProvider({ env: { HOME: home } }),
    /No API credential configured/,
  );
});

test('provider resolver accepts explicit env API key without Codex auth and defaults to gpt-5.5', async () => {
  const resolved = await resolveProvider({ env: { OPENCLONE_API_KEY: 'test-key' } });
  assert.equal(resolved.authSource, 'api-key');
  assert.equal(resolved.provider, 'openai-compatible');
  assert.equal(resolved.baseURL, 'https://api.openai.com/v1');
  assert.equal(resolved.modelId, 'gpt-5.5');
});

test('provider resolver uses Codex OAuth provider only when explicitly requested and defaults codexStore to false', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.codex'), { recursive: true });
  await writeFile(join(home, '.codex', 'auth.json'), JSON.stringify({ auth_mode: 'chatgpt', tokens: { access_token: fakeJwt(4102444800), account_id: 'acct' } }));
  const resolved = await resolveProvider({ env: { HOME: home }, useCodexAuth: true });
  assert.equal(resolved.authSource, 'codex-oauth');
  assert.equal(resolved.provider, 'codex-oauth');
  assert.equal(resolved.baseURL, 'https://chatgpt.com/backend-api/codex');
  assert.equal(resolved.codexStore, false);
  assert.equal(resolved.stripOpenAIResponsesItemIds, true);
});

test('provider resolver allows enabling Codex response item persistence via env', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.codex'), { recursive: true });
  await writeFile(join(home, '.codex', 'auth.json'), JSON.stringify({ auth_mode: 'chatgpt', tokens: { access_token: fakeJwt(4102444800), account_id: 'acct' } }));
  const resolved = await resolveProvider({ env: { HOME: home, OPENCLONE_USE_CODEX_AUTH: '1', OPENCLONE_CODEX_STORE: '1' } });
  assert.equal(resolved.codexStore, true);
  assert.equal(resolved.stripOpenAIResponsesItemIds, false);
});

test('provider resolver allows opting out of the rs_-id strip via OPENCLONE_CODEX_STRIP_REASONING=0', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.codex'), { recursive: true });
  await writeFile(join(home, '.codex', 'auth.json'), JSON.stringify({ auth_mode: 'chatgpt', tokens: { access_token: fakeJwt(4102444800), account_id: 'acct' } }));
  const resolved = await resolveProvider({
    env: { HOME: home, OPENCLONE_USE_CODEX_AUTH: '1', OPENCLONE_CODEX_STRIP_REASONING: '0' },
  });
  assert.equal(resolved.stripOpenAIResponsesItemIds, false);
});

test('provider resolver leaves stripOpenAIResponsesItemIds undefined for non-Codex providers', async () => {
  const apiKey = await resolveProvider({ env: { OPENCLONE_API_KEY: 'k' } });
  assert.equal(apiKey.stripOpenAIResponsesItemIds, undefined);
  const ollama = await resolveProvider({ provider: 'ollama', env: {} });
  assert.equal(ollama.stripOpenAIResponsesItemIds, undefined);
});

test('provider resolver supports Ollama without API key', async () => {
  const resolved = await resolveProvider({ provider: 'ollama', model: 'llama3.2', env: {} });
  assert.equal(resolved.provider, 'ollama');
  assert.equal(resolved.authSource, 'none');
  assert.equal(resolved.baseURL, 'http://127.0.0.1:11434');
});

test('provider resolver allows disabling Codex response item persistence for privacy-sensitive local runs', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.codex'), { recursive: true });
  await writeFile(join(home, '.codex', 'auth.json'), JSON.stringify({ auth_mode: 'chatgpt', tokens: { access_token: fakeJwt(4102444800), account_id: 'acct' } }));
  const resolved = await resolveProvider({ env: { HOME: home, OPENCLONE_USE_CODEX_AUTH: '1', OPENCLONE_CODEX_STORE: '0' } });
  assert.equal(resolved.authSource, 'codex-oauth');
  assert.equal(resolved.codexStore, false);
});

test('provider resolver does not read Claude Code credentials unless OAuth is explicitly requested', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(
    join(home, '.claude', '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: 'sk-ant-leak', refreshToken: 'rt', expiresAt: 4102444800000 } }),
  );
  await assert.rejects(
    () => resolveProvider({ env: { HOME: home } }),
    /No API credential configured/,
  );
});

test('provider resolver uses Claude Code OAuth when --use-claude-code-auth is set, exposes systemPrefix, and defaults to api.anthropic.com', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.claude'), { recursive: true });
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await writeFile(
    join(home, '.claude', '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: 'sk-ant-x', refreshToken: 'rt-x', expiresAt } }),
  );
  const resolved = await resolveProvider({ env: { HOME: home }, useClaudeCodeAuth: true });
  assert.equal(resolved.authSource, 'claude-code-oauth');
  assert.equal(resolved.provider, 'claude-code-oauth');
  assert.equal(resolved.baseURL, 'https://api.anthropic.com/v1');
  assert.equal(resolved.modelId, 'claude-sonnet-4-6');
  assert.match(resolved.systemPrefix ?? '', /Claude Agent SDK/);
});

test('provider resolver respects OPENCLONE_USE_CLAUDE_AUTH alias env var', async () => {
  const home = await mkdtemp(join(tmpdir(), 'openclone-provider-'));
  await mkdir(join(home, '.claude'), { recursive: true });
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await writeFile(
    join(home, '.claude', '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: 'sk-ant-y', refreshToken: 'rt-y', expiresAt } }),
  );
  const resolved = await resolveProvider({ env: { HOME: home, OPENCLONE_USE_CLAUDE_AUTH: '1' } });
  assert.equal(resolved.provider, 'claude-code-oauth');
});

test('normalizeClaudeCodeHeaders forces claude-cli user-agent and OAuth-only beta header even when the SDK pre-set its own values', () => {
  const headers = normalizeClaudeCodeHeaders(
    {
      'user-agent': 'ai-sdk/anthropic/3.0.75 ai-sdk/provider-utils/4.0.26 runtime/node.js/22',
      'anthropic-beta': 'structured-outputs-2025-11-13,oauth-2025-04-20,interleaved-thinking-2025-05-14',
      'x-api-key': 'leak',
      'x-stainless-package-version': '3.0.75',
      'x-stainless-runtime': 'node',
      'content-type': 'application/json',
    },
    'sk-ant-active',
  );
  assert.equal(headers.get('user-agent'), 'claude-cli/2.1.87 (external, cli)');
  assert.equal(headers.get('anthropic-beta'), 'oauth-2025-04-20,interleaved-thinking-2025-05-14');
  assert.equal(headers.get('authorization'), 'Bearer sk-ant-active');
  assert.equal(headers.has('x-api-key'), false);
  assert.equal(headers.has('x-stainless-package-version'), false);
  assert.equal(headers.has('x-stainless-runtime'), false);
  assert.equal(headers.get('content-type'), 'application/json');
});

test('splitClaudeCodeSystemBlocks splits the merged identity+persona block into two blocks Anthropic OAuth expects', () => {
  const merged = `${CLAUDE_CODE_IDENTITY_PROMPT}\n\n<openclone-cli-active-clone>\nactual persona prompt`;
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: merged }],
    messages: [{ role: 'user', content: '1+1?' }],
  });
  const next = splitClaudeCodeSystemBlocks(body);
  assert.equal(typeof next, 'string');
  const parsed = JSON.parse(next);
  assert.equal(parsed.system.length, 2);
  assert.deepEqual(parsed.system[0], { type: 'text', text: CLAUDE_CODE_IDENTITY_PROMPT });
  assert.equal(parsed.system[1].type, 'text');
  assert.equal(parsed.system[1].text, '<openclone-cli-active-clone>\nactual persona prompt');
});

test('splitClaudeCodeSystemBlocks leaves the body untouched when the first block does not start with the Claude Code identity', () => {
  const body = JSON.stringify({
    system: [{ type: 'text', text: 'a different prefix\n\nrest' }],
  });
  assert.equal(splitClaudeCodeSystemBlocks(body), body);
});

test('splitClaudeCodeSystemBlocks preserves any extra system blocks past the first when splitting', () => {
  const merged = `${CLAUDE_CODE_IDENTITY_PROMPT}\n\nfirst persona section`;
  const body = JSON.stringify({
    system: [
      { type: 'text', text: merged },
      { type: 'text', text: 'second pre-existing block' },
    ],
  });
  const parsed = JSON.parse(splitClaudeCodeSystemBlocks(body));
  assert.equal(parsed.system.length, 3);
  assert.equal(parsed.system[0].text, CLAUDE_CODE_IDENTITY_PROMPT);
  assert.equal(parsed.system[1].text, 'first persona section');
  assert.equal(parsed.system[2].text, 'second pre-existing block');
});
