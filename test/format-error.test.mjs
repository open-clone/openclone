import test from 'node:test';
import assert from 'node:assert/strict';
import { APICallError } from 'ai';
import { normalizeError } from '../dist/lib/format-error.js';

test('normalizeError extracts messages from structured object throws', () => {
  const normalized = normalizeError({
    error: {
      message: 'The requested model is not available for this account.',
      type: 'invalid_request_error',
    },
  });

  assert.equal(normalized.title, '오류');
  assert.equal(normalized.message, 'The requested model is not available for this account.');
});

test('normalizeError avoids leaking [object Object] from Error.message when cause is structured', () => {
  const error = new Error('[object Object]');
  error.cause = {
    responseBody: JSON.stringify({
      error: {
        message: 'Codex OAuth backend rejected this request.',
      },
    }),
  };

  const normalized = normalizeError(error);
  assert.equal(normalized.message, 'Codex OAuth backend rejected this request.');
});

test('normalizeError prefers structured APICallError responseBody over generic Bad Request', () => {
  const error = new APICallError({
    message: 'Bad Request',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    requestBodyValues: {},
    statusCode: 400,
    responseBody: JSON.stringify({
      detail: "The 'bad-model' model is not supported when using Codex with a ChatGPT account.",
    }),
  });

  const normalized = normalizeError(error);
  assert.equal(normalized.title, 'API 오류 (400)');
  assert.equal(normalized.message, "The 'bad-model' model is not supported when using Codex with a ChatGPT account.");
});
