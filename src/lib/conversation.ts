import { createInterface, type Interface } from "node:readline/promises";
import { stdin as defaultInput, stdout as defaultOutput } from "node:process";
import type { Readable, Writable } from "node:stream";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import { streamChat } from "./stream-chat.js";
import { formatErrorBlock } from "./format-error.js";

export interface InteractiveDecisionInput {
  explicitPrompt?: string;
  positionalPrompt?: string;
  stdinText?: string;
  stdinIsTTY?: boolean;
  stdoutIsTTY?: boolean;
}

export type ConversationCommand =
  | { kind: "exit" }
  | { kind: "clear" }
  | { kind: "compact" }
  | { kind: "help" }
  | { kind: "empty" }
  | { kind: "message"; text: string };

export interface ConversationPersistEvent {
  reason: "turn" | "exit";
  messages: ModelMessage[];
  conversationSummary: string;
}

export interface ConversationOptions {
  cloneLabel: string;
  model: LanguageModel;
  system: string;
  tools: ToolSet;
  input?: Readable;
  output?: Writable;
  readline?: Interface;
  stream?: typeof streamChat;
  compactMaxChars?: number;
  compactKeepTurns?: number;
  compactSummaryMaxChars?: number;
  initialMessages?: ModelMessage[];
  initialSummary?: string;
  onPersist?: (event: ConversationPersistEvent) => Promise<void> | void;
}

export interface CompactionSplit {
  oldMessages: ModelMessage[];
  recentMessages: ModelMessage[];
}

const DEFAULT_COMPACT_MAX_CHARS = readPositiveInt(process.env.OPENCLONE_COMPACT_MAX_CHARS, 350000);
const DEFAULT_COMPACT_KEEP_TURNS = readPositiveInt(process.env.OPENCLONE_COMPACT_KEEP_TURNS, 8);
const DEFAULT_COMPACT_SUMMARY_MAX_CHARS = readPositiveInt(process.env.OPENCLONE_COMPACT_SUMMARY_MAX_CHARS, 20000);

export const CONVERSATION_DEFAULTS = {
  compactMaxChars: DEFAULT_COMPACT_MAX_CHARS,
  compactKeepTurns: DEFAULT_COMPACT_KEEP_TURNS,
  compactSummaryMaxChars: DEFAULT_COMPACT_SUMMARY_MAX_CHARS,
} as const;

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function messageContentText(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

function serializeMessages(messages: ModelMessage[]): string {
  return messages.map((message) => `${message.role}: ${messageContentText(message.content)}`).join("\n\n");
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 36))}\n[truncated by openclone compaction]`;
}

export function shouldStartInteractive(input: InteractiveDecisionInput): boolean {
  return !input.explicitPrompt && !input.positionalPrompt && !input.stdinText
    && input.stdinIsTTY !== false && input.stdoutIsTTY !== false;
}

export function parseConversationInput(raw: string): ConversationCommand {
  const text = raw.trim();
  if (!text) return { kind: "empty" };
  const normalized = text.toLowerCase();
  if (normalized === "/bye" || normalized === "/exit" || normalized === "/quit") return { kind: "exit" };
  if (normalized === "/clear") return { kind: "clear" };
  if (normalized === "/compact") return { kind: "compact" };
  if (normalized === "/help" || normalized === "?") return { kind: "help" };
  return { kind: "message", text: raw };
}

export function conversationHelp(): string {
  return [
    "Commands:",
    "  /help     Show this help",
    "  /clear    Clear in-memory conversation history and summary",
    "  /compact  Summarize older conversation history now",
    "  /bye      Exit (also /exit or /quit)",
  ].join("\n");
}

export function historyCharCount(messages: ModelMessage[], summary = ""): number {
  return messages.reduce((total, message) => total + message.role.length + messageContentText(message.content).length, summary.length);
}

export function splitMessagesForCompaction(messages: ModelMessage[], keepTurns: number): CompactionSplit {
  const keepMessageCount = Math.max(1, keepTurns * 2);
  if (messages.length <= keepMessageCount) return { oldMessages: [], recentMessages: messages };
  return {
    oldMessages: messages.slice(0, -keepMessageCount),
    recentMessages: messages.slice(-keepMessageCount),
  };
}

export function systemWithConversationSummary(system: string, summary: string): string {
  if (!summary.trim()) return system;
  return `${system}\n\n--- conversation summary ---\n${summary.trim()}\n--- end conversation summary ---`;
}

export async function compactMessages(options: {
  model: LanguageModel;
  stream: typeof streamChat;
  previousSummary: string;
  oldMessages: ModelMessage[];
  summaryMaxChars: number;
}): Promise<string> {
  if (options.oldMessages.length === 0) return options.previousSummary;
  const prompt = [
    "Summarize the older part of this openclone persona conversation for future continuity.",
    "Preserve user goals, decisions, constraints, preferences, unresolved questions, and persona-relevant facts.",
    "Do not introduce new facts. Keep the summary compact and useful for the next turns.",
    `Maximum length: ${options.summaryMaxChars} characters.`,
    "",
    "Previous summary:",
    options.previousSummary || "(none)",
    "",
    "Older messages to compact:",
    serializeMessages(options.oldMessages),
  ].join("\n");
  const summary = await options.stream({
    model: options.model,
    system: "You compact conversation history for an AI persona CLI. Return only the updated summary.",
    messages: [{ role: "user", content: prompt }],
    maxSteps: 1,
  });
  return truncate(summary.trim(), options.summaryMaxChars);
}

export async function runConversation(options: ConversationOptions): Promise<void> {
  const output = options.output ?? defaultOutput;
  const rl = options.readline ?? createInterface({
    input: options.input ?? defaultInput,
    output,
    terminal: Boolean((options.input ? false : defaultInput.isTTY) && (options.output ? false : defaultOutput.isTTY)),
  });
  const closeReadline = !options.readline;
  const stream = options.stream ?? streamChat;
  const compactMaxChars = options.compactMaxChars ?? DEFAULT_COMPACT_MAX_CHARS;
  const compactKeepTurns = options.compactKeepTurns ?? DEFAULT_COMPACT_KEEP_TURNS;
  const compactSummaryMaxChars = options.compactSummaryMaxChars ?? DEFAULT_COMPACT_SUMMARY_MAX_CHARS;
  let messages: ModelMessage[] = options.initialMessages ? [...options.initialMessages] : [];
  let conversationSummary = options.initialSummary ?? "";
  const onPersist = options.onPersist;

  async function persist(reason: "turn" | "exit"): Promise<void> {
    if (!onPersist) return;
    try {
      await onPersist({ reason, messages, conversationSummary });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.write(`[openclone: failed to persist conversation: ${message}]\n`);
    }
  }

  async function compactNow(reason: "auto" | "manual"): Promise<boolean> {
    const split = splitMessagesForCompaction(messages, compactKeepTurns);
    if (split.oldMessages.length === 0) return false;
    conversationSummary = await compactMessages({
      model: options.model,
      stream,
      previousSummary: conversationSummary,
      oldMessages: split.oldMessages,
      summaryMaxChars: compactSummaryMaxChars,
    });
    messages = split.recentMessages;
    output.write(`[${reason === "auto" ? "auto-" : ""}compacted ${split.oldMessages.length} older message(s)]\n`);
    return true;
  }

  output.write(`openclone conversation: ${options.cloneLabel}\n`);
  if (messages.length > 0 || conversationSummary) {
    output.write(`[resumed: ${messages.length} message(s)${conversationSummary ? ", with prior summary" : ""}]\n`);
  }
  output.write(`${conversationHelp()}\n\n`);

  if (conversationSummary) {
    output.write("--- prior summary ---\n");
    output.write(`${conversationSummary}\n`);
    output.write("--- end summary ---\n\n");
  }
  if (messages.length > 0) {
    for (const message of messages) {
      const text = messageContentText(message.content);
      if (message.role === "user") {
        output.write(`>>> ${text}\n`);
      } else {
        output.write(`${text}\n`);
      }
    }
    output.write("--- continuing conversation ---\n\n");
  }

  try {
    while (true) {
      let raw: string;
      try {
        raw = await rl.question(">>> ");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") break;
        throw error;
      }

      const command = parseConversationInput(raw);
      if (command.kind === "empty") continue;
      if (command.kind === "exit") break;
      if (command.kind === "help") {
        output.write(`${conversationHelp()}\n`);
        continue;
      }
      if (command.kind === "clear") {
        messages = [];
        conversationSummary = "";
        output.write("Conversation history and summary cleared.\n");
        await persist("turn");
        continue;
      }
      if (command.kind === "compact") {
        const compacted = await compactNow("manual");
        if (!compacted) output.write("Not enough older conversation history to compact.\n");
        else await persist("turn");
        continue;
      }

      messages.push({ role: "user", content: command.text });
      if (compactMaxChars > 0 && historyCharCount(messages, conversationSummary) > compactMaxChars) {
        await compactNow("auto");
      }

      try {
        const response = await stream({
          model: options.model,
          system: systemWithConversationSummary(options.system, conversationSummary),
          messages,
          tools: options.tools,
          onText: (chunk) => output.write(chunk),
        });
        output.write("\n");
        messages.push({ role: "assistant", content: response });
        await persist("turn");
      } catch (error) {
        if (messages.length > 0 && messages[messages.length - 1].role === "user") messages.pop();
        const useColor = "isTTY" in output ? Boolean((output as { isTTY?: boolean }).isTTY) : false;
        const width = "columns" in output ? (output as { columns?: number }).columns : undefined;
        output.write(`\n${formatErrorBlock(error, { color: useColor, width })}\n`);
      }
    }
    await persist("exit");
  } finally {
    if (closeReadline) rl.close();
  }
}
