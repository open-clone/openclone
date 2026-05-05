import type { ModelMessage } from "ai";

const OPENAI_PROVIDER = "openai";
const ITEM_ID_KEY = "itemId";

type Part = Record<string, unknown> & { type: string };

function stripItemIdFromBag(bag: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!bag || typeof bag !== "object") return bag;
  const openai = bag[OPENAI_PROVIDER];
  if (!openai || typeof openai !== "object") return bag;
  const openaiObj = openai as Record<string, unknown>;
  if (!(ITEM_ID_KEY in openaiObj)) return bag;
  const { [ITEM_ID_KEY]: _drop, ...restOpenAI } = openaiObj;
  const newBag: Record<string, unknown> = { ...bag };
  if (Object.keys(restOpenAI).length === 0) delete newBag[OPENAI_PROVIDER];
  else newBag[OPENAI_PROVIDER] = restOpenAI;
  return Object.keys(newBag).length === 0 ? undefined : newBag;
}

function stripPart(part: Part): Part | undefined {
  if (part.type === "reasoning") return undefined;
  let mutated = false;
  let next: Part = part;
  const newProviderOptions = stripItemIdFromBag(part.providerOptions as Record<string, unknown> | undefined);
  if (newProviderOptions !== part.providerOptions) {
    mutated = true;
    next = { ...next };
    if (newProviderOptions === undefined) delete next.providerOptions;
    else next.providerOptions = newProviderOptions;
  }
  const newProviderMetadata = stripItemIdFromBag(part.providerMetadata as Record<string, unknown> | undefined);
  if (newProviderMetadata !== part.providerMetadata) {
    mutated = true;
    if (next === part) next = { ...next };
    if (newProviderMetadata === undefined) delete next.providerMetadata;
    else next.providerMetadata = newProviderMetadata;
  }
  return mutated ? next : part;
}

export function stripOpenAIResponsesItemIds(messages: ModelMessage[]): ModelMessage[] {
  let mutated = false;
  const out = messages.map((message) => {
    if (message.role !== "assistant") return message;
    if (typeof message.content === "string") return message;
    const parts = message.content as unknown as Part[];
    let partsMutated = false;
    const newParts: Part[] = [];
    for (const part of parts) {
      const stripped = stripPart(part);
      if (stripped === undefined) {
        partsMutated = true;
        continue;
      }
      if (stripped !== part) partsMutated = true;
      newParts.push(stripped);
    }
    if (!partsMutated) return message;
    mutated = true;
    return { ...message, content: newParts as unknown as typeof message.content };
  });
  return mutated ? out : messages;
}
