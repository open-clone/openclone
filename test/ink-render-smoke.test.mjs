import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render, Box, Text } from "ink";
import { cleanupInkInstance, FakeStdin, FakeStdout, joinedFrames, stripAnsi, tick } from "./ink-render.mjs";

test("ink-render harness captures output frames", async () => {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout();
  const stderr = new FakeStdout();
  const tree = React.createElement(
    Box,
    { flexDirection: "column" },
    React.createElement(Text, null, "hello world"),
  );
  const instance = render(tree, {
    stdin,
    stdout,
    stderr,
    exitOnCtrlC: false,
    patchConsole: false,
    debug: false,
  });
  await tick(3);
  await cleanupInkInstance(instance);
  const captured = stripAnsi(joinedFrames(stdout));
  assert.match(captured, /hello world/);
});

test("ink-render harness cleanup does not leak process beforeExit listeners", async () => {
  const before = process.listenerCount("beforeExit");

  for (let index = 0; index < 12; index += 1) {
    const tree = React.createElement(Text, null, `frame ${index}`);
    const instance = render(tree, {
      stdin: new FakeStdin(),
      stdout: new FakeStdout(),
      stderr: new FakeStdout(),
      exitOnCtrlC: false,
      patchConsole: false,
      debug: false,
    });
    await tick(1);
    await cleanupInkInstance(instance);
  }

  assert.equal(process.listenerCount("beforeExit"), before);
});
