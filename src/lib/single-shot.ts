import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import {
  CONVERSATION_DEFAULTS,
  compactMessages,
  historyCharCount,
  splitMessagesForCompaction,
  systemWithConversationSummary,
} from "./conversation.js";
import { HistoryStore, newSessionId, type ConversationSessionRecord } from "./history-store.js";
import { streamChat } from "./stream-chat.js";
import { formatErrorBlock, markErrorFormatted } from "./format-error.js";
import type { Writable } from "node:stream";

export interface SingleShotOptions {
  cloneSlug: string;
  cloneLabel: string;
  model: LanguageModel;
  modelId?: string;
  providerName?: string;
  system: string;
  prompt: string;
  tools: ToolSet;
  resumeRequested?: boolean;
  resumeSessionId?: string;
  persistDisabled?: boolean;
  historyStore?: HistoryStore;
  stream?: typeof streamChat;
  stdout?: Writable;
  stderr?: Writable;
  compactMaxChars?: number;
  compactKeepTurns?: number;
  compactSummaryMaxChars?: number;
}

export interface SingleShotResult {
  sessionId: string;
  response: string;
  messages: ModelMessage[];
  conversationSummary: string;
  resumedFrom?: string;
  autoCompactedCount: number;
  persisted: boolean;
}

export async function runSingleShot(options: SingleShotOptions): Promise<SingleShotResult> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const stream = options.stream ?? streamChat;
  const historyStore = options.historyStore ?? new HistoryStore();
  const compactMaxChars = options.compactMaxChars ?? CONVERSATION_DEFAULTS.compactMaxChars;
  const compactKeepTurns = options.compactKeepTurns ?? CONVERSATION_DEFAULTS.compactKeepTurns;
  const compactSummaryMaxChars = options.compactSummaryMaxChars ?? CONVERSATION_DEFAULTS.compactSummaryMaxChars;

  let resumedRecord: ConversationSessionRecord | undefined;
  if (options.resumeRequested) {
    resumedRecord = options.resumeSessionId
      ? await historyStore.load(options.cloneSlug, options.resumeSessionId)
      : await historyStore.findLatest(options.cloneSlug);
    if (!resumedRecord) {
      throw new Error(`No saved session found for clone "${options.cloneSlug}". Start a new chat to create one.`);
    }
  }

  const sessionId = resumedRecord?.sessionId ?? newSessionId();
  const startedAt = resumedRecord?.startedAt || new Date().toISOString();

  let messages: ModelMessage[] = resumedRecord?.messages ? [...resumedRecord.messages] : [];
  let summary = resumedRecord?.conversationSummary ?? "";
  messages.push({ role: "user", content: options.prompt });

  let autoCompactedCount = 0;
  if (compactMaxChars > 0 && historyCharCount(messages, summary) > compactMaxChars) {
    const split = splitMessagesForCompaction(messages, compactKeepTurns);
    if (split.oldMessages.length > 0) {
      summary = await compactMessages({
        model: options.model,
        stream,
        previousSummary: summary,
        oldMessages: split.oldMessages,
        summaryMaxChars: compactSummaryMaxChars,
      });
      messages = split.recentMessages;
      autoCompactedCount = split.oldMessages.length;
      stderr.write(`[auto-compacted ${autoCompactedCount} older message(s)]\n`);
    }
  }

  let response: string;
  try {
    response = await stream({
      model: options.model,
      system: systemWithConversationSummary(options.system, summary),
      messages,
      tools: options.tools,
      onText: (chunk) => stdout.write(chunk),
    });
  } catch (error) {
    const useColor = "isTTY" in stderr ? Boolean((stderr as { isTTY?: boolean }).isTTY) : false;
    const width = "columns" in stderr ? (stderr as { columns?: number }).columns : undefined;
    stderr.write(`\n${formatErrorBlock(error, { color: useColor, width })}\n`);
    markErrorFormatted(error);
    throw error;
  }
  stdout.write("\n");
  messages.push({ role: "assistant", content: response });

  let persisted = false;
  if (!options.persistDisabled) {
    await historyStore.save({
      schemaVersion: 1,
      sessionId,
      cloneSlug: options.cloneSlug,
      cloneLabel: options.cloneLabel,
      startedAt,
      updatedAt: new Date().toISOString(),
      messages,
      conversationSummary: summary,
      providerName: options.providerName,
      modelId: options.modelId,
    });
    stderr.write(`[session: ${sessionId}]\n`);
    persisted = true;
  }

  return {
    sessionId,
    response,
    messages,
    conversationSummary: summary,
    resumedFrom: resumedRecord?.sessionId,
    autoCompactedCount,
    persisted,
  };
}
