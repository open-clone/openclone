import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, useApp } from "ink";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import {
  CONVERSATION_DEFAULTS,
  compactMessages,
  conversationHelp,
  historyCharCount,
  parseConversationInput,
  splitMessagesForCompaction,
  systemWithConversationSummary,
  type ConversationPersistEvent,
} from "../lib/conversation.js";
import { streamChat } from "../lib/stream-chat.js";
import { Markdown } from "./Markdown.js";
import { MessageView, type MessageItem } from "./MessageView.js";
import { InputBox } from "./InputBox.js";
import { HeaderBar } from "./HeaderBar.js";
import { useStateAndRef } from "./hooks/useStateAndRef.js";

export interface AppProps {
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
}

function messageContentText(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

function buildBootItems(args: {
  initialMessages: ModelMessage[];
  initialSummary: string;
  speakerLabel: string;
}): MessageItem[] {
  const items: MessageItem[] = [];
  if (args.initialMessages.length > 0 || args.initialSummary) {
    const banner = `[resumed: ${args.initialMessages.length} message(s)${args.initialSummary ? ", with prior summary" : ""}]`;
    items.push({ kind: "system-banner", text: banner });
  }
  if (args.initialSummary) {
    items.push({ kind: "system-banner", text: "--- prior summary ---" });
    items.push({ kind: "system", text: args.initialSummary });
    items.push({ kind: "system-banner", text: "--- end summary ---" });
  }
  if (args.initialMessages.length > 0) {
    for (const message of args.initialMessages) {
      const text = messageContentText(message.content);
      if (message.role === "user") {
        items.push({ kind: "user", text });
      } else {
        items.push({ kind: "assistant", text, speakerLabel: args.speakerLabel });
      }
    }
    items.push({ kind: "system-banner", text: "--- continuing conversation ---" });
  }
  return items;
}

export function App(props: AppProps): React.JSX.Element {
  const ink = useApp();

  const initialMessages = useMemo(
    () => (props.initialMessages ? [...props.initialMessages] : []),
    [props.initialMessages],
  );
  const initialSummary = props.initialSummary ?? "";
  const speakerLabel = props.speakerLabel ?? "clone";

  const initialItems = useMemo(
    () => buildBootItems({ initialMessages, initialSummary, speakerLabel }),
    [initialMessages, initialSummary, speakerLabel],
  );

  const [committed, , setCommitted] = useStateAndRef<MessageItem[]>(initialItems);
  const [, messagesRef, setMessages] = useStateAndRef<ModelMessage[]>(initialMessages);
  const [, summaryRef, setSummary] = useStateAndRef<string>(initialSummary);
  const [streaming, setStreaming] = useState<string | null>(null);
  const streamingBufferRef = useRef<string>("");
  const streamingFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, busyRef, setBusy] = useStateAndRef<boolean>(false);
  const [exited, setExited] = useState<boolean>(false);

  const compactMaxChars = props.compactMaxChars ?? CONVERSATION_DEFAULTS.compactMaxChars;
  const compactKeepTurns = props.compactKeepTurns ?? CONVERSATION_DEFAULTS.compactKeepTurns;
  const compactSummaryMaxChars = props.compactSummaryMaxChars ?? CONVERSATION_DEFAULTS.compactSummaryMaxChars;
  const streamFn = props.stream ?? streamChat;

  const appendItem = (item: MessageItem) => {
    setCommitted((previous) => [...previous, item]);
  };

  const STREAM_FLUSH_MS = 33;

  const scheduleStreamFlush = () => {
    if (streamingFlushTimerRef.current !== null) return;
    streamingFlushTimerRef.current = setTimeout(() => {
      streamingFlushTimerRef.current = null;
      setStreaming(streamingBufferRef.current);
    }, STREAM_FLUSH_MS);
  };

  const cancelStreamFlush = () => {
    if (streamingFlushTimerRef.current !== null) {
      clearTimeout(streamingFlushTimerRef.current);
      streamingFlushTimerRef.current = null;
    }
  };

  useEffect(() => () => cancelStreamFlush(), []);

  const persist = async (reason: "turn" | "exit") => {
    if (!props.onPersist) return;
    try {
      await props.onPersist({
        reason,
        messages: messagesRef.current,
        conversationSummary: summaryRef.current,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendItem({ kind: "system-banner", text: `[openclone: failed to persist conversation: ${message}]` });
    }
  };

  const compactNow = async (reason: "auto" | "manual"): Promise<boolean> => {
    const split = splitMessagesForCompaction(messagesRef.current, compactKeepTurns);
    if (split.oldMessages.length === 0) return false;
    const newSummary = await compactMessages({
      model: props.model,
      stream: streamFn,
      previousSummary: summaryRef.current,
      oldMessages: split.oldMessages,
      summaryMaxChars: compactSummaryMaxChars,
    });
    setSummary(newSummary);
    setMessages(split.recentMessages);
    appendItem({
      kind: "system-banner",
      text: `[${reason === "auto" ? "auto-" : ""}compacted ${split.oldMessages.length} older message(s)]`,
    });
    return true;
  };

  const exitApp = async () => {
    if (exited) return;
    setExited(true);
    await persist("exit");
    props.onExit?.();
    ink.exit();
  };

  const handleAbort = () => {
    void exitApp();
  };

  const handleSubmit = async (raw: string) => {
    if (busyRef.current) return;
    const command = parseConversationInput(raw);

    if (command.kind === "empty") return;

    if (command.kind === "exit") {
      void exitApp();
      return;
    }

    if (command.kind === "help") {
      appendItem({ kind: "user", text: raw.trim() });
      appendItem({ kind: "system", text: conversationHelp() });
      return;
    }

    if (command.kind === "clear") {
      appendItem({ kind: "user", text: raw.trim() });
      setMessages([]);
      setSummary("");
      appendItem({ kind: "system-banner", text: "Conversation history and summary cleared." });
      await persist("turn");
      return;
    }

    if (command.kind === "compact") {
      appendItem({ kind: "user", text: raw.trim() });
      setBusy(true);
      try {
        const compacted = await compactNow("manual");
        if (!compacted) {
          appendItem({ kind: "system-banner", text: "Not enough older conversation history to compact." });
        } else {
          await persist("turn");
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    appendItem({ kind: "user", text: command.text });
    setBusy(true);
    streamingBufferRef.current = "";
    setStreaming("");
    try {
      const userMessage: ModelMessage = { role: "user", content: command.text };
      setMessages((previous) => [...previous, userMessage]);

      if (
        compactMaxChars > 0
        && historyCharCount(messagesRef.current, summaryRef.current) > compactMaxChars
      ) {
        await compactNow("auto");
      }

      const response = await streamFn({
        model: props.model,
        system: systemWithConversationSummary(props.system, summaryRef.current),
        messages: messagesRef.current,
        tools: props.tools,
        onText: (chunk) => {
          streamingBufferRef.current += chunk;
          scheduleStreamFlush();
        },
      });

      cancelStreamFlush();
      const assistantMessage: ModelMessage = { role: "assistant", content: response };
      setMessages((previous) => [...previous, assistantMessage]);
      appendItem({ kind: "assistant", text: response, speakerLabel });
      setStreaming(null);
      await persist("turn");
    } catch (error) {
      cancelStreamFlush();
      const message = error instanceof Error ? error.message : String(error);
      appendItem({ kind: "system-banner", text: `[openclone: error during streaming: ${message}]` });
      setStreaming(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialMessages.length === 0 && !initialSummary) {
      void persist("turn");
    }
  }, []);

  return (
    <Box flexDirection="column">
      <HeaderBar
        cloneLabel={props.cloneLabel}
        modelLabel={props.modelLabel}
        sessionLabel={props.sessionLabel}
      />
      <Static items={committed.map((item, index) => ({ ...item, _key: `m-${index}` }))}>
        {(item) => <MessageView key={(item as { _key: string })._key} item={item} />}
      </Static>
      {streaming !== null ? (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="cyan" bold>{speakerLabel} </Text>
            <Text color="gray" dimColor>›</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text>{streaming || ""}</Text>
          </Box>
        </Box>
      ) : null}
      {!exited ? (
        <InputBox
          disabled={streaming !== null}
          onSubmit={handleSubmit}
          onAbort={handleAbort}
        />
      ) : null}
    </Box>
  );
}
