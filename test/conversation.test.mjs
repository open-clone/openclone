import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import {
  historyCharCount,
  parseConversationInput,
  runConversation,
  shouldStartInteractive,
  splitMessagesForCompaction,
  systemWithConversationSummary,
} from '../dist/lib/conversation.js';

class CaptureOutput extends Writable {
  constructor() {
    super();
    this.text = '';
  }
  _write(chunk, _encoding, callback) {
    this.text += chunk.toString();
    callback();
  }
}

function fakeReadline(lines) {
  const queue = [...lines];
  return {
    question: async () => {
      if (queue.length === 0) return '/bye';
      return queue.shift();
    },
    close: () => {},
  };
}

test('interactive mode starts only without prompt/stdin on a tty', () => {
  assert.equal(shouldStartInteractive({ stdinIsTTY: true, stdoutIsTTY: true }), true);
  assert.equal(shouldStartInteractive({ explicitPrompt: 'hi', stdinIsTTY: true, stdoutIsTTY: true }), false);
  assert.equal(shouldStartInteractive({ positionalPrompt: 'hi', stdinIsTTY: true, stdoutIsTTY: true }), false);
  assert.equal(shouldStartInteractive({ stdinText: 'hi', stdinIsTTY: true, stdoutIsTTY: true }), false);
  assert.equal(shouldStartInteractive({ stdinIsTTY: false, stdoutIsTTY: true }), false);
  assert.equal(shouldStartInteractive({ stdinIsTTY: true, stdoutIsTTY: false }), false);
});

test('conversation command parser handles exit, clear, compact, help, empty, and messages', () => {
  assert.deepEqual(parseConversationInput('/bye'), { kind: 'exit' });
  assert.deepEqual(parseConversationInput('/exit'), { kind: 'exit' });
  assert.deepEqual(parseConversationInput('/quit'), { kind: 'exit' });
  assert.deepEqual(parseConversationInput('/clear'), { kind: 'clear' });
  assert.deepEqual(parseConversationInput('/compact'), { kind: 'compact' });
  assert.deepEqual(parseConversationInput('/help'), { kind: 'help' });
  assert.deepEqual(parseConversationInput('   '), { kind: 'empty' });
  assert.deepEqual(parseConversationInput('hello'), { kind: 'message', text: 'hello' });
});

test('compaction helpers count, split, and append summary', () => {
  const messages = [
    { role: 'user', content: 'one' },
    { role: 'assistant', content: 'two' },
    { role: 'user', content: 'three' },
  ];
  assert.equal(historyCharCount(messages, 'summary') > 'onetwothreesummary'.length, true);
  const split = splitMessagesForCompaction(messages, 1);
  assert.deepEqual(split.oldMessages, [{ role: 'user', content: 'one' }]);
  assert.deepEqual(split.recentMessages, [
    { role: 'assistant', content: 'two' },
    { role: 'user', content: 'three' },
  ]);
  assert.equal(systemWithConversationSummary('system', ''), 'system');
  assert.match(systemWithConversationSummary('system', 'summary'), /conversation summary/);
});

test('runConversation keeps in-memory message history across turns', async () => {
  const calls = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['hello', 'again', '/bye']),
    stream: async (options) => {
      calls.push(options.messages.map((message) => ({ role: message.role, content: message.content })));
      options.onText?.(`response-${calls.length}`);
      return `response-${calls.length}`;
    },
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], [{ role: 'user', content: 'hello' }]);
  assert.deepEqual(calls[1], [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'response-1' },
    { role: 'user', content: 'again' },
  ]);
  assert.match(output.text, /openclone conversation: Alice \(alice\)/);
});

test('runConversation forwards stripOpenAIResponsesItemIds into chat-step stream calls only', async () => {
  const turnCalls = [];
  const compactCalls = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['hi', '/bye']),
    stripOpenAIResponsesItemIds: true,
    stream: async (options) => {
      if (options.system.includes('compact conversation history')) {
        compactCalls.push({ stripOpenAIResponsesItemIds: options.stripOpenAIResponsesItemIds });
        return 'summary';
      }
      turnCalls.push({ stripOpenAIResponsesItemIds: options.stripOpenAIResponsesItemIds });
      options.onText?.('ok');
      return 'ok';
    },
  });
  assert.equal(turnCalls.length, 1);
  assert.equal(turnCalls[0].stripOpenAIResponsesItemIds, true);
  assert.equal(compactCalls.length, 0);
});

test('manual /compact summarizes older turns and keeps recent messages', async () => {
  const chatCalls = [];
  const summaryPrompts = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['one', 'two', '/compact', 'three', '/bye']),
    compactKeepTurns: 1,
    stream: async (options) => {
      if (options.system.includes('compact conversation history')) {
        summaryPrompts.push(options.messages[0].content);
        return 'summary of one';
      }
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
      });
      options.onText?.(`response-${chatCalls.length}`);
      return `response-${chatCalls.length}`;
    },
  });

  assert.equal(summaryPrompts.length, 1);
  assert.match(summaryPrompts[0], /user: one/);
  assert.equal(chatCalls.length, 3);
  assert.match(chatCalls[2].system, /summary of one/);
  assert.deepEqual(chatCalls[2].messages, [
    { role: 'user', content: 'two' },
    { role: 'assistant', content: 'response-2' },
    { role: 'user', content: 'three' },
  ]);
  assert.match(output.text, /\[compacted 2 older message\(s\)\]/);
});

test('auto compaction triggers when history exceeds configured char threshold', async () => {
  const systems = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['first long message', 'second long message', '/bye']),
    compactMaxChars: 20,
    compactKeepTurns: 1,
    stream: async (options) => {
      if (options.system.includes('compact conversation history')) return 'auto summary';
      systems.push(options.system);
      options.onText?.('ok');
      return 'ok';
    },
  });

  assert.equal(systems.length, 2);
  assert.match(systems[1], /auto summary/);
  assert.match(output.text, /\[auto-compacted 1 older message\(s\)\]/);
});

test('/clear removes both raw history and compacted summary', async () => {
  const chatCalls = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['one', 'two', '/compact', '/clear', 'fresh', '/bye']),
    compactKeepTurns: 1,
    stream: async (options) => {
      if (options.system.includes('compact conversation history')) return 'summary before clear';
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
      });
      options.onText?.('ok');
      return 'ok';
    },
  });

  assert.equal(chatCalls.at(-1).system, 'system');
  assert.deepEqual(chatCalls.at(-1).messages, [{ role: 'user', content: 'fresh' }]);
  assert.match(output.text, /Conversation history and summary cleared/);
});

test('runConversation seeds initial history and summary from options', async () => {
  const chatCalls = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['follow up', '/bye']),
    initialMessages: [
      { role: 'user', content: 'previous question' },
      { role: 'assistant', content: 'previous answer' },
    ],
    initialSummary: 'user already discussed onboarding',
    stream: async (options) => {
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
      });
      options.onText?.('ok');
      return 'ok';
    },
  });

  assert.equal(chatCalls.length, 1);
  assert.match(chatCalls[0].system, /user already discussed onboarding/);
  assert.deepEqual(chatCalls[0].messages, [
    { role: 'user', content: 'previous question' },
    { role: 'assistant', content: 'previous answer' },
    { role: 'user', content: 'follow up' },
  ]);
  assert.match(output.text, /\[resumed: 2 message\(s\), with prior summary\]/);
  assert.match(output.text, /--- prior summary ---/);
  assert.match(output.text, /user already discussed onboarding/);
  assert.match(output.text, /--- end summary ---/);
  assert.match(output.text, />>> previous question/);
  assert.match(output.text, /previous answer/);
  assert.match(output.text, /--- continuing conversation ---/);
});

test('resumed history is replayed in chronological order before the new prompt', async () => {
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['/bye']),
    initialMessages: [
      { role: 'user', content: 'msg-1' },
      { role: 'assistant', content: 'reply-1' },
      { role: 'user', content: 'msg-2' },
      { role: 'assistant', content: 'reply-2' },
    ],
    stream: async () => 'unused',
  });

  const idx1 = output.text.indexOf('>>> msg-1');
  const idx2 = output.text.indexOf('reply-1');
  const idx3 = output.text.indexOf('>>> msg-2');
  const idx4 = output.text.indexOf('reply-2');
  const idxContinue = output.text.indexOf('--- continuing conversation ---');
  assert.ok(idx1 >= 0 && idx2 > idx1 && idx3 > idx2 && idx4 > idx3, 'messages must replay in chronological order');
  assert.ok(idxContinue > idx4, 'continuation marker must come after replayed history');
});

test('replays summary alone when there are no messages to seed', async () => {
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['/bye']),
    initialSummary: 'compacted summary text only',
    stream: async () => 'unused',
  });
  assert.match(output.text, /--- prior summary ---/);
  assert.match(output.text, /compacted summary text only/);
  assert.doesNotMatch(output.text, /--- continuing conversation ---/);
});

test('does not print resume artifacts when starting fresh', async () => {
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['/bye']),
    stream: async () => 'unused',
  });
  assert.doesNotMatch(output.text, /--- prior summary ---/);
  assert.doesNotMatch(output.text, /--- continuing conversation ---/);
});

test('runConversation calls onPersist after each turn and on exit', async () => {
  const events = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['one', 'two', '/bye']),
    onPersist: async (event) => {
      events.push({
        reason: event.reason,
        messageCount: event.messages.length,
        summaryLength: event.conversationSummary.length,
      });
    },
    stream: async (options) => {
      options.onText?.('ok');
      return 'ok';
    },
  });

  const turnEvents = events.filter((event) => event.reason === 'turn');
  const exitEvents = events.filter((event) => event.reason === 'exit');
  assert.equal(turnEvents.length, 2);
  assert.equal(turnEvents[0].messageCount, 2);
  assert.equal(turnEvents[1].messageCount, 4);
  assert.equal(exitEvents.length, 1);
  assert.equal(exitEvents[0].messageCount, 4);
});

test('runConversation persists after /clear and /compact when work was done', async () => {
  const persistReasons = [];
  const persistedSnapshots = [];
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['one', 'two', '/compact', '/clear', '/bye']),
    compactKeepTurns: 1,
    onPersist: async (event) => {
      persistReasons.push(event.reason);
      persistedSnapshots.push({
        messageCount: event.messages.length,
        summary: event.conversationSummary,
      });
    },
    stream: async (options) => {
      if (options.system.includes('compact conversation history')) return 'summary text';
      options.onText?.('ok');
      return 'ok';
    },
  });

  assert.deepEqual(persistReasons, ['turn', 'turn', 'turn', 'turn', 'exit']);
  const compactSnapshot = persistedSnapshots[2];
  assert.equal(compactSnapshot.summary, 'summary text');
  const clearSnapshot = persistedSnapshots[3];
  assert.equal(clearSnapshot.messageCount, 0);
  assert.equal(clearSnapshot.summary, '');
});

test('runConversation reports persist failure but keeps the loop alive', async () => {
  const output = new CaptureOutput();
  let calls = 0;
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['hello', '/bye']),
    onPersist: async () => {
      calls += 1;
      throw new Error('disk is full');
    },
    stream: async (options) => {
      options.onText?.('ok');
      return 'ok';
    },
  });

  assert.ok(calls >= 1);
  assert.match(output.text, /failed to persist conversation: disk is full/);
});

test('runConversation does not announce resume when starting fresh', async () => {
  const output = new CaptureOutput();
  await runConversation({
    cloneLabel: 'Alice (alice)',
    model: {},
    system: 'system',
    tools: {},
    output,
    readline: fakeReadline(['/bye']),
    stream: async () => 'ok',
  });
  assert.doesNotMatch(output.text, /\[resumed:/);
});
