import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Ink input components render buffers through terminal safety helpers", async () => {
  const inputBox = await readFile("src/ui/InputBox.tsx", "utf8");
  const promptInput = await readFile("src/ui/PromptInput.tsx", "utf8");

  assert.match(inputBox, /sanitizeTerminalText\(buffer\)/);
  assert.match(inputBox, /sanitizeTerminalText\(placeholder\)/);
  assert.match(promptInput, /sanitizeTerminalText\(buffer\)/);
});
