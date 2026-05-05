import { stepCountIs, streamText } from "ai";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import { stripOpenAIResponsesItemIds } from "./strip-openai-responses-item-ids.js";

export async function streamChat(options: {
  model: LanguageModel;
  system: string;
  messages: ModelMessage[];
  tools?: ToolSet;
  maxSteps?: number;
  onText?: (chunk: string) => void;
  stripOpenAIResponsesItemIds?: boolean;
}): Promise<string> {
  let captured: unknown;
  const result = streamText({
    model: options.model,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
    stopWhen: stepCountIs(options.maxSteps ?? 6),
    ...(options.stripOpenAIResponsesItemIds
      ? { prepareStep: ({ messages }) => ({ messages: stripOpenAIResponsesItemIds(messages) }) }
      : {}),
    onError: ({ error }) => {
      captured = error;
    },
  });
  let full = "";
  try {
    for await (const chunk of result.textStream) {
      full += chunk;
      options.onText?.(chunk);
    }
  } catch (error) {
    throw captured ?? error;
  }
  if (captured) throw captured;
  return full;
}
