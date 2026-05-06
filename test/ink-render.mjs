import { EventEmitter } from "node:events";

// CSI sequences: ESC [ ... final byte (e.g. \u001b[31m).
const CSI_RE = /\u001b\[[0-9;?]*[ -/]*[@-~]/gu;
// OSC sequences (including OSC 8 hyperlinks): ESC ] ... terminated by BEL or ESC \.
const OSC_RE = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/gu;

export function stripAnsi(text) {
  return String(text).replace(CSI_RE, "").replace(OSC_RE, "");
}

export class FakeStdin extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this.encoding = "utf8";
    this._raw = false;
    this._buffer = "";
  }
  setEncoding(enc) { this.encoding = enc; return this; }
  setRawMode(value) { this._raw = !!value; return this; }
  resume() { return this; }
  pause() { return this; }
  ref() { return this; }
  unref() { return this; }
  read(_size) {
    if (this._buffer.length === 0) return null;
    const out = this._buffer;
    this._buffer = "";
    return out;
  }
  write(chunk) {
    this._buffer += String(chunk);
    this.emit("readable");
    this.emit("data", chunk);
    return true;
  }
}

export class FakeStdout extends EventEmitter {
  constructor({ columns = 100, rows = 40 } = {}) {
    super();
    this.columns = columns;
    this.rows = rows;
    this.isTTY = true;
    this.frames = [];
    this.lastFrame = "";
  }
  write(chunk) {
    const text = typeof chunk === "string" ? chunk : chunk?.toString?.() ?? String(chunk);
    this.frames.push(text);
    this.lastFrame = text;
    return true;
  }
  on() { return this; }
  once() { return this; }
  removeListener() { return this; }
  removeAllListeners() { return this; }
  ref() { return this; }
  unref() { return this; }
  end() {}
  emitFakeResize(columns, rows) {
    if (columns) this.columns = columns;
    if (rows) this.rows = rows;
    this.emit("resize");
  }
}

export function joinedFrames(stdout) {
  return stdout.frames.join("");
}

export function lastFrameStripped(stdout) {
  return stripAnsi(stdout.lastFrame);
}

export async function tick(times = 1) {
  for (let i = 0; i < times; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export async function flushFrames(times = 5) {
  await tick(times);
}

export async function typeText(stdin, text) {
  stdin.write(text);
  await tick(2);
}

export async function pressEnter(stdin) {
  stdin.write("\r");
  await tick(3);
}

export async function pressCtrlC(stdin) {
  stdin.write("\u0003");
  await tick(3);
}

export async function submitLine(stdin, text) {
  await typeText(stdin, text);
  await pressEnter(stdin);
}
