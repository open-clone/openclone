import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { runSingleShot } from "../dist/lib/single-shot.js";
import { HistoryStore } from "../dist/lib/history-store.js";

class CaptureStream extends Writable {
  constructor() {
    super();
    this.text = "";
  }
  _write(chunk, _encoding, callback) {
    this.text += chunk.toString();
    callback();
  }
}

async function withTempStore(callback) {
  const dir = await mkdtemp(join(tmpdir(), "openclone-single-shot-"));
  const store = new HistoryStore({ baseDir: dir });
  try {
    await callback({ dir, store });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function makeStreamFn(responses) {
  let i = 0;
  const calls = [];
  const fn = async (options) => {
    calls.push({
      system: options.system,
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      stripOpenAIResponsesItemIds: options.stripOpenAIResponsesItemIds,
    });
    const text = responses[i++] ?? "default-response";
    options.onText?.(text);
    return text;
  };
  fn.calls = calls;
  return fn;
}

test("single-shot: creates a new session and persists to disk on first call", async () => {
  await withTempStore(async ({ store }) => {
    const stdout = new CaptureStream();
    const stderr = new CaptureStream();
    const stream = makeStreamFn(["hello-from-clone"]);

    const result = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {},
      modelId: "test-model",
      providerName: "test-provider",
      system: "system",
      prompt: "first question",
      tools: {},
      historyStore: store,
      stream,
      stdout,
      stderr,
    });

    assert.equal(stream.calls.length, 1);
    assert.deepEqual(stream.calls[0].messages, [{ role: "user", content: "first question" }]);
    assert.equal(stdout.text, "hello-from-clone\n");
    assert.match(stderr.text, /\[session: .+\]/);
    assert.equal(result.persisted, true);
    assert.equal(result.response, "hello-from-clone");
    assert.equal(result.resumedFrom, undefined);

    const record = await store.load("alice", result.sessionId);
    assert.ok(record);
    assert.equal(record.messages.length, 2);
    assert.equal(record.messages[0].content, "first question");
    assert.equal(record.messages[1].content, "hello-from-clone");
    assert.equal(record.providerName, "test-provider");
    assert.equal(record.modelId, "test-model");
  });
});

test("single-shot: --resume picks the latest session and appends a new turn", async () => {
  await withTempStore(async ({ store }) => {
    const stream1 = makeStreamFn(["answer-1"]);
    const first = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {},
      system: "system",
      prompt: "q1",
      tools: {},
      historyStore: store,
      stream: stream1,
      stdout: new CaptureStream(),
      stderr: new CaptureStream(),
    });

    const stream2 = makeStreamFn(["answer-2"]);
    const stderr2 = new CaptureStream();
    const second = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {},
      system: "system",
      prompt: "q2",
      tools: {},
      resumeRequested: true,
      historyStore: store,
      stream: stream2,
      stdout: new CaptureStream(),
      stderr: stderr2,
    });

    assert.equal(second.sessionId, first.sessionId, "second call must reuse first sessionId");
    assert.equal(second.resumedFrom, first.sessionId);
    assert.deepEqual(stream2.calls[0].messages, [
      { role: "user", content: "q1" },
      { role: "assistant", content: "answer-1" },
      { role: "user", content: "q2" },
    ]);
    assert.match(stderr2.text, new RegExp(`\\[session: ${first.sessionId}\\]`));

    const record = await store.load("alice", first.sessionId);
    assert.equal(record.messages.length, 4);
    assert.equal(record.messages[3].content, "answer-2");
  });
});

test("single-shot: --resume=<id> targets a specific session", async () => {
  await withTempStore(async ({ store }) => {
    const a = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {}, system: "system", prompt: "thread-A", tools: {},
      historyStore: store,
      stream: makeStreamFn(["A1"]),
      stdout: new CaptureStream(), stderr: new CaptureStream(),
    });
    const b = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {}, system: "system", prompt: "thread-B", tools: {},
      historyStore: store,
      stream: makeStreamFn(["B1"]),
      stdout: new CaptureStream(), stderr: new CaptureStream(),
    });

    assert.notEqual(a.sessionId, b.sessionId);

    const stream = makeStreamFn(["A2"]);
    const result = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {}, system: "system", prompt: "back-to-A", tools: {},
      resumeRequested: true,
      resumeSessionId: a.sessionId,
      historyStore: store,
      stream,
      stdout: new CaptureStream(), stderr: new CaptureStream(),
    });

    assert.equal(result.sessionId, a.sessionId);
    assert.deepEqual(stream.calls[0].messages, [
      { role: "user", content: "thread-A" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "back-to-A" },
    ]);
  });
});

test("single-shot: --resume with no saved sessions throws a clear error", async () => {
  await withTempStore(async ({ store }) => {
    await assert.rejects(
      runSingleShot({
        cloneSlug: "ghost",
        cloneLabel: "Ghost (ghost)",
        model: {}, system: "system", prompt: "anything", tools: {},
        resumeRequested: true,
        historyStore: store,
        stream: makeStreamFn(["unused"]),
        stdout: new CaptureStream(), stderr: new CaptureStream(),
      }),
      /No saved session found for clone "ghost"/,
    );
  });
});

test("single-shot: --no-persist returns a response but does not write to disk", async () => {
  await withTempStore(async ({ store, dir }) => {
    const stderr = new CaptureStream();
    const result = await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {}, system: "system", prompt: "ephemeral", tools: {},
      persistDisabled: true,
      historyStore: store,
      stream: makeStreamFn(["volatile"]),
      stdout: new CaptureStream(), stderr,
    });

    assert.equal(result.persisted, false);
    assert.doesNotMatch(stderr.text, /\[session: /);

    const aliceDir = join(dir, "alice");
    const exists = await readdir(aliceDir).then(() => true).catch(() => false);
    assert.equal(exists, false, "no-persist must not create the clone session directory");
  });
});

test("single-shot: stdout receives only the streamed response, not the session marker", async () => {
  await withTempStore(async ({ store }) => {
    const stdout = new CaptureStream();
    const stderr = new CaptureStream();
    await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {}, system: "system", prompt: "ping", tools: {},
      historyStore: store,
      stream: makeStreamFn(["pong"]),
      stdout, stderr,
    });
    assert.equal(stdout.text, "pong\n");
    assert.doesNotMatch(stdout.text, /\[session:/);
    assert.match(stderr.text, /\[session: /);
  });
});

test("single-shot: forwards stripOpenAIResponsesItemIds into the stream call", async () => {
  await withTempStore(async ({ store }) => {
    const stream = makeStreamFn(["resp"]);
    await runSingleShot({
      cloneSlug: "alice",
      cloneLabel: "Alice (alice)",
      model: {}, system: "system", prompt: "q", tools: {},
      historyStore: store,
      stream,
      stdout: new CaptureStream(), stderr: new CaptureStream(),
      stripOpenAIResponsesItemIds: true,
    });
    assert.equal(stream.calls[0].stripOpenAIResponsesItemIds, true);
  });
});

test("single-shot: persisted record carries forward conversationSummary on resume", async () => {
  await withTempStore(async ({ store }) => {
    const cloneSlug = "alice";
    const sessionId = "2026-04-30T15-22-11-000Z";
    await store.save({
      schemaVersion: 1,
      sessionId,
      cloneSlug,
      cloneLabel: "Alice (alice)",
      startedAt: "2026-04-30T15:22:11.000Z",
      updatedAt: "2026-04-30T15:22:11.000Z",
      messages: [
        { role: "user", content: "old-q" },
        { role: "assistant", content: "old-a" },
      ],
      conversationSummary: "previously discussed onboarding",
      providerName: "test",
      modelId: "test-model",
    });

    const stream = makeStreamFn(["A-with-summary"]);
    await runSingleShot({
      cloneSlug,
      cloneLabel: "Alice (alice)",
      model: {}, system: "base-system", prompt: "follow-up", tools: {},
      resumeRequested: true,
      resumeSessionId: sessionId,
      historyStore: store,
      stream,
      stdout: new CaptureStream(), stderr: new CaptureStream(),
    });

    assert.match(stream.calls[0].system, /previously discussed onboarding/);
    const after = await store.load(cloneSlug, sessionId);
    assert.equal(after.messages.length, 4);
    assert.equal(after.conversationSummary, "previously discussed onboarding");
  });
});
