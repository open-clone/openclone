import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink";
import { Markdown } from "../dist/ui/Markdown.js";
import { FakeStdin, FakeStdout, joinedFrames, stripAnsi, tick } from "./ink-render.mjs";

async function renderMarkdownToText(text) {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout();
  const stderr = new FakeStdout();
  const instance = render(React.createElement(Markdown, { text }), {
    stdin,
    stdout,
    stderr,
    exitOnCtrlC: false,
    patchConsole: false,
    debug: true,
  });
  await tick(3);
  instance.unmount();
  await instance.waitUntilExit();
  return stripAnsi(joinedFrames(stdout));
}

test("Markdown renders empty text without crashing", async () => {
  const out = await renderMarkdownToText("");
  assert.equal(typeof out, "string");
});

test("Markdown renders plain text", async () => {
  const out = await renderMarkdownToText("hello world");
  assert.match(out, /hello world/);
});

test("Markdown strips heading markers and shows the heading text", async () => {
  const out = await renderMarkdownToText("# Title\n\nbody");
  assert.match(out, /Title/);
  assert.match(out, /body/);
  assert.doesNotMatch(out, /^#\s/m);
});

test("Markdown strips multiple heading levels", async () => {
  const out = await renderMarkdownToText("## H2\n\n### H3\n\n#### H4");
  assert.match(out, /H2/);
  assert.match(out, /H3/);
  assert.match(out, /H4/);
  assert.doesNotMatch(out, /^#+\s/m);
});

test("Markdown strips bold/italic/strikethrough markers", async () => {
  const out = await renderMarkdownToText("**bold** _italic_ ~~strike~~");
  assert.match(out, /bold/);
  assert.match(out, /italic/);
  assert.match(out, /strike/);
  assert.doesNotMatch(out, /\*\*bold\*\*/);
  assert.doesNotMatch(out, /~~strike~~/);
});

test("Markdown renders unordered lists with bullets", async () => {
  const out = await renderMarkdownToText("- alpha\n- beta\n- gamma");
  assert.match(out, /alpha/);
  assert.match(out, /beta/);
  assert.match(out, /gamma/);
  assert.match(out, /•/);
});

test("Markdown renders ordered lists with numbers", async () => {
  const out = await renderMarkdownToText("1. one\n2. two\n3. three");
  assert.match(out, /one/);
  assert.match(out, /two/);
  assert.match(out, /three/);
  assert.match(out, /1\./);
});

test("Markdown preserves fenced code block content without backticks", async () => {
  const out = await renderMarkdownToText("```js\nconst x = 1;\n```");
  assert.match(out, /const x = 1;/);
  assert.doesNotMatch(out, /```/);
});

test("Markdown renders inline code without surrounding backticks", async () => {
  const out = await renderMarkdownToText("Use `npm install` first");
  assert.match(out, /npm install/);
  assert.doesNotMatch(out, /`npm install`/);
});

test("Markdown renders link text and shows the href", async () => {
  const out = await renderMarkdownToText("Visit [openclone](https://github.com/open-clone/openclone)");
  assert.match(out, /openclone/);
  assert.match(out, /github\.com\/open-clone\/openclone/);
});

test("Markdown renders escaped-bracket citation as compact [1]", async () => {
  const out = await renderMarkdownToText("Some claim. \\[[1](https://example.com)\\] tail.");
  assert.match(out, /\[1\]/);
  assert.doesNotMatch(out, /https:\/\/example\.com/);
  assert.doesNotMatch(out, /\(https/);
});

test("Markdown renders 2-digit citations as compact [12]", async () => {
  const out = await renderMarkdownToText("Claim. \\[[12](https://example.org/path)\\] tail.");
  assert.match(out, /\[12\]/);
  assert.doesNotMatch(out, /example\.org/);
});

test("Markdown is fault-tolerant on malformed input", async () => {
  const out = await renderMarkdownToText("```js\nunclosed code block");
  assert.match(out, /unclosed/);
});
