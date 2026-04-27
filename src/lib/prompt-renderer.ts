import type { KnowledgeFile, LoadedClone } from "./clone-loader.js";

export interface PromptRenderOptions {
  question?: string;
  maxKnowledgeFiles?: number;
  maxKnowledgeChars?: number;
  maxSnippetChars?: number;
}

export interface RenderedPrompt {
  system: string;
  knowledge: KnowledgeFile[];
}

const DEFAULT_MAX_FILES = Number.parseInt(process.env.OPENCLONE_KNOWLEDGE_MAX_FILES ?? "8", 10);
const DEFAULT_MAX_CHARS = Number.parseInt(process.env.OPENCLONE_KNOWLEDGE_MAX_CHARS ?? "24000", 10);
const DEFAULT_SNIPPET_CHARS = 4000;

function terms(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
}

function scoreKnowledge(file: KnowledgeFile, queryTerms: string[]): number {
  const haystack = `${file.topic ?? ""}\n${file.path}\n${file.body}`.toLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function selectKnowledge(files: KnowledgeFile[], question: string, maxFiles: number): KnowledgeFile[] {
  const ordered = [...files].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  if (ordered.length <= maxFiles) return ordered;
  const newest = ordered.slice(0, Math.ceil(maxFiles / 2));
  const queryTerms = terms(question);
  const scored = ordered
    .map((file) => ({ file, score: scoreKnowledge(file, queryTerms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.file.dateKey.localeCompare(a.file.dateKey))
    .map((item) => item.file);

  const selected: KnowledgeFile[] = [];
  const seen = new Set<string>();
  for (const file of [...newest, ...scored]) {
    if (seen.has(file.path)) continue;
    selected.push(file);
    seen.add(file.path);
    if (selected.length >= maxFiles) break;
  }
  return selected;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 32)}\n[truncated by openclone CLI]`;
}

function citationTarget(file: KnowledgeFile): string {
  if (file.sourceUrl) return file.sourceUrl;
  if (file.sourcePath) return `file://${encodeURI(file.sourcePath)}`;
  return `file://${encodeURI(file.path)}`;
}

export function renderActiveClonePrompt(clone: LoadedClone, options: PromptRenderOptions = {}): RenderedPrompt {
  const maxFiles = options.maxKnowledgeFiles ?? DEFAULT_MAX_FILES;
  const maxKnowledgeChars = options.maxKnowledgeChars ?? DEFAULT_MAX_CHARS;
  const maxSnippetChars = options.maxSnippetChars ?? DEFAULT_SNIPPET_CHARS;
  const selected = selectKnowledge(clone.knowledge, options.question ?? "", maxFiles);

  let usedChars = 0;
  const knowledgeBlocks: string[] = [];
  for (const file of selected) {
    const room = maxKnowledgeChars - usedChars;
    if (room <= 0) break;
    const body = truncate(file.body.trim(), Math.min(maxSnippetChars, room));
    usedChars += body.length;
    knowledgeBlocks.push([
      `--- knowledge: ${file.topic ?? file.path}`,
      `origin: ${file.origin}`,
      `date: ${file.publishedAt ?? file.dateKey}`,
      `citation_target: ${citationTarget(file)}`,
      body,
    ].join("\n"));
  }

  const categoryLine = clone.primaryCategory
    ? `Apply the clone's primary category framing for '${clone.primaryCategory}' when present.`
    : "Apply the clone's first category framing when present.";

  const system = `<openclone-cli-active-clone>
You are chatting as an openclone persona. Respond AS this clone for conversational messages, matching the persona, speaking style, and guidelines below. If the user asks for code, shell, or file-work advice, be technically correct first and keep persona voice subtle.

Default length: concise, usually 3-6 sentences unless the user asks for depth. Match the user's language. Do not use emojis unless explicitly requested.

${categoryLine}

Knowledge rules:
- The markdown persona and knowledge snippets below are the source of truth.
- Prefer newer knowledge when files conflict; older files remain background context.
- User-ingested knowledge is higher priority than built-in knowledge on the same topic.
- Do not invent facts to stay in character.
- Cite specific facts from knowledge with inline markdown links like [1](target). Skip citations for style, opinions, or common knowledge.

--- clone metadata ---
slug: ${clone.slug}
origin: ${clone.origin}
display_name: ${clone.displayName}
tagline: ${clone.tagline}
categories: ${clone.categories.join(", ")}
primary_category: ${clone.primaryCategory ?? ""}

--- clone definition ---
${clone.raw.trim()}
--- end clone definition ---

--- selected knowledge ---
${knowledgeBlocks.length > 0 ? knowledgeBlocks.join("\n\n") : "No local knowledge snippets selected for this turn."}
--- end selected knowledge ---
</openclone-cli-active-clone>`;

  return { system, knowledge: selected.slice(0, knowledgeBlocks.length) };
}
