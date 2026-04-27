import { streamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";

export async function streamChat(options: {
  model: LanguageModel;
  system: string;
  messages: ModelMessage[];
  onText?: (chunk: string) => void;
}): Promise<string> {
  const result = streamText({
    model: options.model,
    system: options.system,
    messages: options.messages,
  });
  let full = "";
  for await (const chunk of result.textStream) {
    full += chunk;
    options.onText?.(chunk);
  }
  return full;
}
