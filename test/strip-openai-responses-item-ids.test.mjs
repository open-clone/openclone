import test from 'node:test';
import assert from 'node:assert/strict';
import { stripOpenAIResponsesItemIds } from '../dist/lib/strip-openai-responses-item-ids.js';

test('strips providerOptions.openai.itemId from assistant text part and preserves text', () => {
  const messages = [
    { role: 'user', content: 'hello' },
    {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'world',
          providerOptions: { openai: { itemId: 'rs_abc', phase: 'response' } },
        },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.deepEqual(out[1].content, [
    { type: 'text', text: 'world', providerOptions: { openai: { phase: 'response' } } },
  ]);
});

test('strips providerOptions.openai.itemId from tool-call part and preserves call fields', () => {
  const messages = [
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: 'call_1',
          toolName: 'web_search',
          input: { q: 'x' },
          providerOptions: { openai: { itemId: 'rs_def' } },
        },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.deepEqual(out[0].content, [
    { type: 'tool-call', toolCallId: 'call_1', toolName: 'web_search', input: { q: 'x' } },
  ]);
});

test('strips fallback providerMetadata.openai.itemId from tool-call part', () => {
  const messages = [
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: 'call_1',
          toolName: 'web_fetch',
          input: { url: 'u' },
          providerMetadata: { openai: { itemId: 'rs_ghi' } },
        },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.deepEqual(out[0].content, [
    { type: 'tool-call', toolCallId: 'call_1', toolName: 'web_fetch', input: { url: 'u' } },
  ]);
});

test('drops reasoning parts entirely', () => {
  const messages = [
    {
      role: 'assistant',
      content: [
        { type: 'reasoning', text: 'thinking', providerOptions: { openai: { itemId: 'rs_r1' } } },
        { type: 'text', text: 'final' },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.deepEqual(out[0].content, [{ type: 'text', text: 'final' }]);
});

test('handles a mixed assistant message: reasoning + text(itemId) + tool-call(no opts)', () => {
  const messages = [
    {
      role: 'assistant',
      content: [
        { type: 'reasoning', text: 'r' },
        { type: 'text', text: 't', providerOptions: { openai: { itemId: 'rs_x' } } },
        { type: 'tool-call', toolCallId: 'c1', toolName: 'list_knowledge_files', input: {} },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.deepEqual(out[0].content, [
    { type: 'text', text: 't' },
    { type: 'tool-call', toolCallId: 'c1', toolName: 'list_knowledge_files', input: {} },
  ]);
});

test('returns the same array reference when nothing needs stripping', () => {
  const messages = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
    { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 't', output: { type: 'text', value: 'ok' } }] },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.equal(out, messages);
});

test('preserves non-openai providerOptions namespaces', () => {
  const messages = [
    {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'hi',
          providerOptions: { openai: { itemId: 'rs_y' }, anthropic: { cacheControl: { type: 'ephemeral' } } },
        },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.deepEqual(out[0].content, [
    {
      type: 'text',
      text: 'hi',
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    },
  ]);
});

test('passes through string-content assistant messages unchanged', () => {
  const messages = [
    { role: 'assistant', content: 'final string answer' },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.equal(out, messages);
});

test('does not modify user/system/tool messages even if they carry providerOptions.openai.itemId', () => {
  const messages = [
    {
      role: 'user',
      content: [{ type: 'text', text: 'q', providerOptions: { openai: { itemId: 'rs_user' } } }],
    },
    {
      role: 'system',
      content: 'sys',
      providerOptions: { openai: { itemId: 'rs_sys' } },
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.equal(out, messages);
});

test('cleans up empty openai namespace and empty providerOptions', () => {
  const messages = [
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'a', providerOptions: { openai: { itemId: 'rs_only' } } },
      ],
    },
  ];
  const out = stripOpenAIResponsesItemIds(messages);
  assert.equal('providerOptions' in out[0].content[0], false);
});
