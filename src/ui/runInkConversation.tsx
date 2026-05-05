import React from "react";
import { render } from "ink";
import { stdin as defaultStdin, stdout as defaultStdout } from "node:process";
import type { Readable, Writable } from "node:stream";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import { App } from "./App.js";
import type { streamChat } from "../lib/stream-chat.js";
import type { ConversationPersistEvent } from "../lib/conversation.js";

export interface RunInkConversationOptions {
  cloneLabel: string;
  speakerLabel?: string;
  modelLabel?: string;
  sessionLabel?: string;
  model: LanguageModel;
  system: string;
  tools: ToolSet;
  stream?: typeof streamChat;
  compactMaxChars?: number;
  compactKeepTurns?: number;
  compactSummaryMaxChars?: number;
  initialMessages?: ModelMessage[];
  initialSummary?: string;
  onPersist?: (event: ConversationPersistEvent) => Promise<void> | void;
  onExit?: () => void;
  stdin?: NodeJS.ReadStream | Readable;
  stdout?: NodeJS.WriteStream | Writable;
  stderr?: NodeJS.WriteStream | Writable;
  exitOnCtrlC?: boolean;
  debug?: boolean;
}

export async function runInkConversation(options: RunInkConversationOptions): Promise<void> {
  const instance = render(
    <App
      cloneLabel={options.cloneLabel}
      speakerLabel={options.speakerLabel}
      modelLabel={options.modelLabel}
      sessionLabel={options.sessionLabel}
      model={options.model}
      system={options.system}
      tools={options.tools}
      stream={options.stream}
      compactMaxChars={options.compactMaxChars}
      compactKeepTurns={options.compactKeepTurns}
      compactSummaryMaxChars={options.compactSummaryMaxChars}
      initialMessages={options.initialMessages}
      initialSummary={options.initialSummary}
      onPersist={options.onPersist}
      onExit={options.onExit}
    />,
    {
      stdin: (options.stdin ?? defaultStdin) as NodeJS.ReadStream,
      stdout: (options.stdout ?? defaultStdout) as NodeJS.WriteStream,
      stderr: options.stderr as NodeJS.WriteStream | undefined,
      exitOnCtrlC: options.exitOnCtrlC ?? false,
      patchConsole: false,
      incrementalRendering: true,
      debug: options.debug,
    },
  );

  try {
    await instance.waitUntilExit();
  } catch {
    /* swallow exit-with-error to avoid surfacing as unhandled rejection */
  } finally {
    const stdinRef = (options.stdin ?? defaultStdin) as NodeJS.ReadStream;
    if (typeof stdinRef.setRawMode === "function" && stdinRef.isTTY) {
      try { stdinRef.setRawMode(false); } catch { void 0; }
    }
    if (typeof stdinRef.unref === "function") {
      try { stdinRef.unref(); } catch { void 0; }
    }
    if (typeof stdinRef.pause === "function") {
      try { stdinRef.pause(); } catch { void 0; }
    }
  }
}
