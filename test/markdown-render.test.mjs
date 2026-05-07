import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink";
import { Markdown } from "../dist/ui/Markdown.js";
import { FakeStdin, FakeStdout, joinedFrames, stripAnsi, tick } from "./ink-render.mjs";

async function renderMarkdownToText(text) {
  const raw = await renderMarkdownToRaw(text);
  return stripAnsi(raw);
}

async function renderMarkdownToRaw(text) {
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
  return joinedFrames(stdout);
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

test("Markdown keeps safe file citations clickable with compact OSC 8 links", async () => {
  const fileHref = "file:///tmp/openclone-knowledge.md";
  const raw = await renderMarkdownToRaw(`Local fact. \\[[1](${fileHref})\\] tail.`);

  assert.match(stripAnsi(raw), /\[1\]/);
  assert.ok(raw.includes(`\u001b]8;;${fileHref}\u001b\\1\u001b]8;;\u001b\\`));
  assert.doesNotMatch(stripAnsi(raw), /file:\/\/\/tmp\/openclone-knowledge\.md/);
});

test("Markdown canonicalizes safe compact file citation hrefs before OSC 8 emission", async () => {
  const esc = String.fromCharCode(0x1b);
  const rawHref = "file:///tmp/openclone knowledge.md";
  const canonicalHref = "file:///tmp/openclone%20knowledge.md";
  const raw = await renderMarkdownToRaw(`Local fact. \\[[2](<${rawHref}>)\\] tail.`);

  assert.match(stripAnsi(raw), /\[2\]/);
  assert.ok(raw.includes(`${esc}]8;;${canonicalHref}${esc}\\2${esc}]8;;${esc}\\`));
  assert.ok(!raw.includes(`${esc}]8;;${rawHref}${esc}\\2`));
  assert.doesNotMatch(stripAnsi(raw), /file:\/\/\/tmp\/openclone(?:%20| )knowledge\.md/);
});

test("Markdown rejects compact file citations containing terminal control bytes", async () => {
  const esc = String.fromCharCode(0x1b);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  const raw = await renderMarkdownToRaw(
    `[1](<file:///tmp/openclone-${esc}]52;c;SGVsbG8=-${c1Osc}52;c;SGVsbG8=${c1St}.md>)`,
  );

  assert.match(stripAnsi(raw), /1/);
  assert.doesNotMatch(raw, /\u001b\]8;;file:\/\//u);
  assert.doesNotMatch(raw, /\u001b\]52;c;SGVsbG8=/u);
  assert.doesNotMatch(raw, /\u009d/u);
  assert.doesNotMatch(raw, /\u009c/u);
});

test("Markdown citation hyperlinks do not emit control bytes from malicious hrefs", async () => {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const raw = await renderMarkdownToRaw(`[1](<https://safe.example/${esc}]52;c;SGVsbG8=${bel}>)`);

  assert.match(stripAnsi(raw), /1/);
  assert.doesNotMatch(raw, /\u001b\]52;c;SGVsbG8=/u);
  assert.doesNotMatch(raw, /\u0007/u);
});

test("Markdown citation hyperlinks do not emit C1 control bytes from malicious hrefs", async () => {
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  const raw = await renderMarkdownToRaw(`[1](<https://safe.example/${c1Osc}52;c;SGVsbG8=${c1St}>)`);

  assert.match(stripAnsi(raw), /1/);
  assert.doesNotMatch(raw, /\u009d/u);
  assert.doesNotMatch(raw, /\u009c/u);
});

test("Markdown strips C1 control bytes from displayed non-compact hrefs", async () => {
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  const raw = await renderMarkdownToRaw(`[open](<https://safe.example/${c1Osc}52;c;SGVsbG8=${c1St}>)`);
  const out = stripAnsi(raw);

  assert.match(out, /open/);
  assert.match(out, /https:\/\/safe\.example\/52;c;SGVsbG8=/);
  assert.doesNotMatch(raw, /\u009d/u);
  assert.doesNotMatch(raw, /\u009c/u);
});

test("Markdown strips terminal controls from visible rendered content", async () => {
  const esc = String.fromCharCode(0x1b);
  const bel = String.fromCharCode(0x07);
  const c1Osc = String.fromCharCode(0x9d);
  const c1St = String.fromCharCode(0x9c);
  const payload = `${esc}]52;c;SGVsbG8=${bel}${c1Osc}52;c;SGVsbG8=${c1St}`;
  const cases = [
    ["plain text", `plain ${payload} tail`],
    ["escaped text", `escaped \\*${payload}\\* tail`],
    ["link label", `[open ${payload} label](https://safe.example)`],
    ["inline code", `Use \`npm ${payload} install\` first`],
    ["fenced code", `\`\`\`txt\ncode ${payload} line\n\`\`\``],
    ["html", `<span>html ${payload} body</span>`],
    ["image label fallback", `![image ${payload} alt](https://safe.example/image.png)`],
  ];

  for (const [name, markdown] of cases) {
    const raw = await renderMarkdownToRaw(markdown);
    assert.doesNotMatch(raw, /\u001b\]52;c;SGVsbG8=/u, name);
    assert.doesNotMatch(raw, /\u0007/u, name);
    assert.doesNotMatch(raw, /\u009d/u, name);
    assert.doesNotMatch(raw, /\u009c/u, name);
    assert.match(stripAnsi(raw), /52;c;SGVsbG8=/, name);
  }
});

test("Markdown is fault-tolerant on malformed input", async () => {
  const out = await renderMarkdownToText("```js\nunclosed code block");
  assert.match(out, /unclosed/);
});
