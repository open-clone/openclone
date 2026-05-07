import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "ink";
import { StreamingAssistantMessage } from "../dist/ui/App.js";
import { HeaderBar } from "../dist/ui/HeaderBar.js";
import { MessageView } from "../dist/ui/MessageView.js";
import { ErrorBanner } from "../dist/ui/ErrorBanner.js";
import { runInkConversation } from "../dist/ui/runInkConversation.js";
import {
  FakeStdin,
  FakeStdout,
  joinedFrames,
  pressCtrlC,
  pressEnter,
  stripAnsi,
  submitLine,
  tick,
  typeText,
} from "./ink-render.mjs";

function makeIO() {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout({ columns: 100, rows: 40 });
  const stderr = new FakeStdout();
  return { stdin, stdout, stderr };
}


function terminalControlPayload() {
  const nul = String.fromCharCode(0x00);
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const del = String.fromCharCode(0x7f);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  return `${nul}A${esc}]52;c;SGVsbG8=${bel}B${del}C${c1Osc}D${c1St}E`;
}

function assertNoTerminalControls(text) {
  assert.doesNotMatch(text, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u);
  assert.doesNotMatch(text, /\u001b\]52;c;SGVsbG8=/u);
  assert.doesNotMatch(text, /\u0007/u);
  assert.doesNotMatch(text, /\u007f/u);
  assert.doesNotMatch(text, /\u009d/u);
  assert.doesNotMatch(text, /\u009c/u);
}

function captured(stdout) {
  return stripAnsi(joinedFrames(stdout));
}

async function startInk(options, io) {
  return runInkConversation({
    ...options,
    stdin: io.stdin,
    stdout: io.stdout,
    stderr: io.stderr,
    debug: false,
    exitOnCtrlC: false,
  });
}

test("ink: prints clone header on boot", async () => {
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    stream: async () => "ok",
  }, io);
  await tick(5);
  await submitLine(io.stdin, "/bye");
  await run;
  const text = captured(io.stdout);
  assert.match(text, /openclone/);
  assert.match(text, /Alice \(alice\)/);
});

test("ink: keeps in-memory message history across turns", async () => {
  const calls = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    stream: async (options) => {
      calls.push(options.messages.map((m) => ({ role: m.role, content: m.content })));
      options.onText?.(`response-${calls.length}`);
      return `response-${calls.length}`;
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "hello");
  await tick(8);
  await submitLine(io.stdin, "again");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], [{ role: "user", content: "hello" }]);
  assert.deepEqual(calls[1], [
    { role: "user", content: "hello" },
    { role: "assistant", content: "response-1" },
    { role: "user", content: "again" },
  ]);
});

test("ink: manual /compact summarizes older turns and keeps recent messages", async () => {
  const chatCalls = [];
  const summaryPrompts = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    compactKeepTurns: 1,
    stream: async (options) => {
      if (options.system.includes("compact conversation history")) {
        summaryPrompts.push(options.messages[0].content);
        return "summary of one";
      }
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      options.onText?.(`response-${chatCalls.length}`);
      return `response-${chatCalls.length}`;
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "one");
  await tick(8);
  await submitLine(io.stdin, "two");
  await tick(8);
  await submitLine(io.stdin, "/compact");
  await tick(8);
  await submitLine(io.stdin, "three");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  assert.equal(summaryPrompts.length, 1);
  assert.match(summaryPrompts[0], /user: one/);
  assert.equal(chatCalls.length, 3);
  assert.match(chatCalls[2].system, /summary of one/);
  assert.deepEqual(chatCalls[2].messages, [
    { role: "user", content: "two" },
    { role: "assistant", content: "response-2" },
    { role: "user", content: "three" },
  ]);
  const text = captured(io.stdout);
  assert.match(text, /\[compacted 2 older message\(s\)\]/);
});

test("ink: auto compaction triggers when history exceeds char threshold", async () => {
  const systems = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    compactMaxChars: 20,
    compactKeepTurns: 1,
    stream: async (options) => {
      if (options.system.includes("compact conversation history")) return "auto summary";
      systems.push(options.system);
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "first long message");
  await tick(8);
  await submitLine(io.stdin, "second long message");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  assert.equal(systems.length, 2);
  assert.match(systems[1], /auto summary/);
  const text = captured(io.stdout);
  assert.match(text, /\[auto-compacted 1 older message\(s\)\]/);
});

test("ink: /clear removes both raw history and compacted summary", async () => {
  const chatCalls = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    compactKeepTurns: 1,
    stream: async (options) => {
      if (options.system.includes("compact conversation history")) return "summary before clear";
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "one");
  await tick(8);
  await submitLine(io.stdin, "two");
  await tick(8);
  await submitLine(io.stdin, "/compact");
  await tick(8);
  await submitLine(io.stdin, "/clear");
  await tick(8);
  await submitLine(io.stdin, "fresh");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  assert.equal(chatCalls.at(-1).system, "system");
  assert.deepEqual(chatCalls.at(-1).messages, [{ role: "user", content: "fresh" }]);
  const text = captured(io.stdout);
  assert.match(text, /Conversation history and summary cleared/);
});

test("ink: seeds initial history and summary from options", async () => {
  const chatCalls = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    initialMessages: [
      { role: "user", content: "previous question" },
      { role: "assistant", content: "previous answer" },
    ],
    initialSummary: "user already discussed onboarding",
    stream: async (options) => {
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "follow up");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  assert.equal(chatCalls.length, 1);
  assert.match(chatCalls[0].system, /user already discussed onboarding/);
  assert.deepEqual(chatCalls[0].messages, [
    { role: "user", content: "previous question" },
    { role: "assistant", content: "previous answer" },
    { role: "user", content: "follow up" },
  ]);
  const text = captured(io.stdout);
  assert.match(text, /\[resumed: 2 message\(s\), with prior summary\]/);
  assert.match(text, /--- prior summary ---/);
  assert.match(text, /user already discussed onboarding/);
  assert.match(text, /--- end summary ---/);
  assert.match(text, /previous question/);
  assert.match(text, /previous answer/);
  assert.match(text, /--- continuing conversation ---/);
});

test("ink: resumed history is replayed in chronological order before new prompt", async () => {
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    initialMessages: [
      { role: "user", content: "msg-1" },
      { role: "assistant", content: "reply-1" },
      { role: "user", content: "msg-2" },
      { role: "assistant", content: "reply-2" },
    ],
    stream: async () => "unused",
  }, io);
  await tick(5);
  await submitLine(io.stdin, "/bye");
  await run;

  const text = captured(io.stdout);
  const idx1 = text.indexOf("msg-1");
  const idx2 = text.indexOf("reply-1");
  const idx3 = text.indexOf("msg-2");
  const idx4 = text.indexOf("reply-2");
  const idxContinue = text.indexOf("--- continuing conversation ---");
  assert.ok(idx1 >= 0 && idx2 > idx1 && idx3 > idx2 && idx4 > idx3, "messages must replay in chronological order");
  assert.ok(idxContinue > idx4, "continuation marker must come after replayed history");
});

test("ink: replays summary alone when there are no messages to seed", async () => {
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    initialSummary: "compacted summary text only",
    stream: async () => "unused",
  }, io);
  await tick(5);
  await submitLine(io.stdin, "/bye");
  await run;
  const text = captured(io.stdout);
  assert.match(text, /--- prior summary ---/);
  assert.match(text, /compacted summary text only/);
  assert.doesNotMatch(text, /--- continuing conversation ---/);
});

test("ink: does not print resume artifacts when starting fresh", async () => {
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    stream: async () => "unused",
  }, io);
  await tick(5);
  await submitLine(io.stdin, "/bye");
  await run;
  const text = captured(io.stdout);
  assert.doesNotMatch(text, /--- prior summary ---/);
  assert.doesNotMatch(text, /--- continuing conversation ---/);
  assert.doesNotMatch(text, /\[resumed:/);
});

test("ink: calls onPersist after each turn and on exit", async () => {
  const events = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    onPersist: async (event) => {
      events.push({
        reason: event.reason,
        messageCount: event.messages.length,
        summaryLength: event.conversationSummary.length,
      });
    },
    stream: async (options) => {
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "one");
  await tick(8);
  await submitLine(io.stdin, "two");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  const turnEvents = events.filter((e) => e.reason === "turn");
  const exitEvents = events.filter((e) => e.reason === "exit");
  assert.ok(turnEvents.length >= 2, `expected >=2 turn persists, got ${turnEvents.length}`);
  const lastTurn = turnEvents[turnEvents.length - 1];
  assert.equal(lastTurn.messageCount, 4);
  assert.equal(exitEvents.length, 1);
  assert.equal(exitEvents[0].messageCount, 4);
});

test("ink: persists after /clear and /compact when work was done", async () => {
  const persistReasons = [];
  const persistedSnapshots = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    compactKeepTurns: 1,
    onPersist: async (event) => {
      persistReasons.push(event.reason);
      persistedSnapshots.push({
        messageCount: event.messages.length,
        summary: event.conversationSummary,
      });
    },
    stream: async (options) => {
      if (options.system.includes("compact conversation history")) return "summary text";
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "one");
  await tick(8);
  await submitLine(io.stdin, "two");
  await tick(8);
  await submitLine(io.stdin, "/compact");
  await tick(8);
  await submitLine(io.stdin, "/clear");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  const turns = persistReasons.filter((r) => r === "turn").length;
  assert.ok(turns >= 4, `expected >=4 turn persists, got ${turns}`);
  assert.equal(persistReasons.at(-1), "exit");

  const compactSnapshot = persistedSnapshots.find((s) => s.summary === "summary text");
  assert.ok(compactSnapshot, "should record compact snapshot");

  const clearSnapshot = persistedSnapshots[persistedSnapshots.length - 2];
  assert.equal(clearSnapshot.messageCount, 0);
  assert.equal(clearSnapshot.summary, "");
});

test("ink: reports persist failure but keeps the loop alive", async () => {
  const io = makeIO();
  let calls = 0;
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    onPersist: async () => {
      calls += 1;
      throw new Error("disk is full");
    },
    stream: async (options) => {
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "hello");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  assert.ok(calls >= 1);
  const text = captured(io.stdout);
  assert.match(text, /failed to persist conversation: disk is full/);
});

test("ink: Ctrl+C aborts cleanly and triggers exit persist", async () => {
  const events = [];
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    onPersist: async (event) => { events.push(event.reason); },
    stream: async () => "ok",
  }, io);
  await tick(5);
  await pressCtrlC(io.stdin);
  await run;
  assert.ok(events.includes("exit"));
});

test("ink: empty input does not call stream", async () => {
  let called = 0;
  const io = makeIO();
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    stream: async (options) => {
      called += 1;
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await pressEnter(io.stdin);
  await tick(5);
  await pressEnter(io.stdin);
  await tick(5);
  await submitLine(io.stdin, "/bye");
  await run;
  assert.equal(called, 0);
});

test("ink: live assistant streaming view strips terminal controls at the display boundary", () => {
  const payload = terminalControlPayload();
  const output = renderToString(
    React.createElement(StreamingAssistantMessage, {
      speakerLabel: "clone",
      streaming: `streaming ${payload} text`,
    }),
  );

  assertNoTerminalControls(output);
  assert.match(output, /streaming A\]52;c;SGVsbG8=BCDE text/);
});

test("ink: live assistant streaming strips terminal controls before commit", async () => {
  const payload = terminalControlPayload();
  const io = makeIO();
  let markStreamStarted;
  let releaseStream;
  const streamStarted = new Promise((resolve) => { markStreamStarted = resolve; });
  const holdStream = new Promise((resolve) => { releaseStream = resolve; });
  const run = runInkConversation({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    stdin: io.stdin,
    stdout: io.stdout,
    stderr: io.stderr,
    debug: true,
    exitOnCtrlC: false,
    stream: async (options) => {
      options.onText?.(`streaming ${payload} text`);
      markStreamStarted();
      await holdStream;
      return `final ${payload} text`;
    },
  });
  await tick(5);
  await submitLine(io.stdin, "hello");
  try {
    await streamStarted;
    await new Promise((resolve) => setTimeout(resolve, 80));
    await tick(5);

    const streamingFrames = joinedFrames(io.stdout);
    assertNoTerminalControls(streamingFrames);
    assert.match(streamingFrames, /streaming A\]52;c;SGVsbG8=BCDE text/);
    assert.doesNotMatch(streamingFrames, /final A\]52;c;SGVsbG8=BCDE text/);
  } finally {
    releaseStream();
  }
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;
});

test("ink: resumed replay strips terminal controls without mutating raw history", async () => {
  const payload = terminalControlPayload();
  const chatCalls = [];
  const io = makeIO();
  const initialMessages = [
    { role: "user", content: `prior user ${payload} text` },
    { role: "assistant", content: `prior assistant ${payload} text` },
  ];
  const initialSummary = `summary ${payload} text`;
  const run = startInk({
    cloneLabel: "Alice (alice)",
    model: {},
    system: "system",
    tools: {},
    initialMessages,
    initialSummary,
    stream: async (options) => {
      chatCalls.push({
        system: options.system,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      options.onText?.("ok");
      return "ok";
    },
  }, io);
  await tick(5);
  await submitLine(io.stdin, "follow up");
  await tick(8);
  await submitLine(io.stdin, "/bye");
  await run;

  const raw = joinedFrames(io.stdout);
  assertNoTerminalControls(raw);
  assert.match(raw, /summary A\]52;c;SGVsbG8=BCDE text/);
  assert.match(raw, /prior user A\]52;c;SGVsbG8=BCDE text/);
  assert.match(raw, /prior assistant A\]52;c;SGVsbG8=BCDE text/);
  assert.ok(chatCalls[0].system.includes(initialSummary), "raw summary still seeds the model context");
  assert.deepEqual(chatCalls[0].messages.slice(0, 2), initialMessages, "raw messages still seed the model context");
});


test("ink: header and assistant labels sanitize terminal controls", () => {
  const payload = terminalControlPayload();
  const header = stripAnsi(renderToString(
    React.createElement(HeaderBar, {
      cloneLabel: `Alice${payload}`,
      modelLabel: `model${payload}`,
      sessionLabel: `ses${payload}`,
    }),
  ));
  const streaming = stripAnsi(renderToString(
    React.createElement(StreamingAssistantMessage, {
      speakerLabel: `clone${payload}`,
      streaming: "safe",
    }),
  ));
  const committed = stripAnsi(renderToString(
    React.createElement(MessageView, {
      item: { kind: "assistant", text: "safe", speakerLabel: `clone${payload}` },
    }),
  ));

  assertNoTerminalControls(header);
  assertNoTerminalControls(streaming);
  assertNoTerminalControls(committed);
  assert.match(header, /Alice/);
  assert.match(header, /model/);
  assert.match(header, /ses/);
  assert.match(streaming, /clone/);
  assert.match(committed, /clone/);
});


test("ink: error banners sanitize terminal controls", () => {
  const payload = terminalControlPayload();
  const direct = stripAnsi(renderToString(
    React.createElement(ErrorBanner, {
      title: `title${payload}`,
      message: `message${payload}`,
      hint: `hint${payload}`,
    }),
  ));
  const viaMessage = stripAnsi(renderToString(
    React.createElement(MessageView, {
      item: { kind: "error-block", title: `title${payload}`, message: `message${payload}`, hint: `hint${payload}` },
    }),
  ));

  assertNoTerminalControls(direct);
  assertNoTerminalControls(viaMessage);
  assert.match(direct, /title/);
  assert.match(direct, /message/);
  assert.match(direct, /hint/);
});
