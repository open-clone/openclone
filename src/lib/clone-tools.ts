import { jsonSchema, tool, type ToolSet } from "ai";
import type { KnowledgeFile, LoadedClone } from "./clone-loader.js";

export interface CloneToolOptions {
  maxKnowledgeReadChars?: number;
  maxWebFetchChars?: number;
  maxSearchResults?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_KNOWLEDGE_READ_CHARS = Number.parseInt(process.env.OPENCLONE_TOOL_KNOWLEDGE_MAX_CHARS ?? "20000", 10);
const DEFAULT_WEB_FETCH_CHARS = Number.parseInt(process.env.OPENCLONE_TOOL_WEB_FETCH_MAX_CHARS ?? "12000", 10);
const DEFAULT_SEARCH_RESULTS = Number.parseInt(process.env.OPENCLONE_TOOL_SEARCH_RESULTS ?? "5", 10);

function citationTarget(file: KnowledgeFile): string {
  if (file.sourceUrl) return file.sourceUrl;
  if (file.sourcePath) return `file://${encodeURI(file.sourcePath)}`;
  return `file://${encodeURI(file.path)}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 32))}\n[truncated by openclone CLI tool]`;
}

function knowledgeId(index: number): string {
  return `k${index + 1}`;
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDuckDuckGoUrl(raw: string): string {
  try {
    const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    const uddg = url.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
  } catch {
    // Keep raw when parsing fails.
  }
  return raw;
}

function parseDuckDuckGoResults(html: string, maxResults: number): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const blockPattern = /<div class="result[\s\S]*?<\/div>\s*<\/div>/gi;
  const blocks = html.match(blockPattern) ?? [];
  for (const block of blocks) {
    const linkMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)
      ?? block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
    results.push({
      title: decodeHtml(textFromHtml(linkMatch[2])),
      url: normalizeDuckDuckGoUrl(decodeHtml(linkMatch[1])),
      snippet: snippetMatch ? decodeHtml(textFromHtml(snippetMatch[1])) : "",
    });
    if (results.length >= maxResults) break;
  }
  return results;
}

export function buildKnowledgeManifest(clone: LoadedClone): string {
  if (clone.knowledge.length === 0) return "No local knowledge files are available.";
  return clone.knowledge.map((file, index) => [
    `${knowledgeId(index)}: ${file.topic ?? file.path}`,
    `  origin: ${file.origin}`,
    `  date: ${file.publishedAt ?? file.dateKey}`,
    `  citation_target: ${citationTarget(file)}`,
    `  path: ${file.path}`,
  ].join("\n")).join("\n");
}

export function createCloneTools(clone: LoadedClone, options: CloneToolOptions = {}): ToolSet {
  const maxKnowledgeReadChars = options.maxKnowledgeReadChars ?? DEFAULT_KNOWLEDGE_READ_CHARS;
  const maxWebFetchChars = options.maxWebFetchChars ?? DEFAULT_WEB_FETCH_CHARS;
  const maxSearchResults = options.maxSearchResults ?? DEFAULT_SEARCH_RESULTS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const byId = new Map(clone.knowledge.map((file, index) => [knowledgeId(index), file]));

  return {
    list_knowledge_files: tool({
      description: "List all local openclone knowledge files for the active persona before deciding which one to read.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => ({
        clone: clone.slug,
        files: clone.knowledge.map((file, index) => ({
          id: knowledgeId(index),
          topic: file.topic ?? file.path,
          origin: file.origin,
          date: file.publishedAt ?? file.dateKey,
          citationTarget: citationTarget(file),
          path: file.path,
        })),
      }),
    }),
    read_knowledge_file: tool({
      description: "Read one local openclone knowledge file by id from the manifest/list. Use this for persona-specific factual recall.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          id: { type: "string", description: "Knowledge id such as k1, k2, ... from the manifest or list_knowledge_files." },
        },
        required: ["id"],
        additionalProperties: false,
      }),
      execute: async ({ id }: { id: string }) => {
        const file = byId.get(id);
        if (!file) return { error: `Unknown knowledge id: ${id}` };
        return {
          id,
          path: file.path,
          origin: file.origin,
          topic: file.topic,
          date: file.publishedAt ?? file.dateKey,
          citationTarget: citationTarget(file),
          frontmatter: file.frontmatter,
          body: truncate(file.body.trim(), maxKnowledgeReadChars),
        };
      },
    }),
    web_fetch: tool({
      description: "Fetch a URL and return readable text. Use for current or external facts that are not covered by local knowledge.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          url: { type: "string", description: "HTTP or HTTPS URL to fetch." },
        },
        required: ["url"],
        additionalProperties: false,
      }),
      execute: async ({ url }: { url: string }) => {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return { error: "Only http:// and https:// URLs are supported." };
        }
        const response = await fetchImpl(parsed, {
          headers: {
            "user-agent": "openclone-cli/0.3 (+https://github.com/team-attention/openclone)",
            accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.8",
          },
        });
        const contentType = response.headers.get("content-type") ?? "";
        const raw = await response.text();
        const text = contentType.includes("html") ? textFromHtml(raw) : raw.replace(/\s+/g, " ").trim();
        return {
          url: parsed.toString(),
          status: response.status,
          contentType,
          text: truncate(text, maxWebFetchChars),
          citationTarget: parsed.toString(),
        };
      },
    }),
    web_search: tool({
      description: "Search the web for current facts, then use web_fetch on promising results when details matter.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          maxResults: { type: "number", description: "Maximum results to return." },
        },
        required: ["query"],
        additionalProperties: false,
      }),
      execute: async ({ query, maxResults: requestedMax }: { query: string; maxResults?: number }) => {
        const limit = Math.max(1, Math.min(maxSearchResults, Math.floor(requestedMax ?? maxSearchResults)));
        const url = new URL("https://duckduckgo.com/html/");
        url.searchParams.set("q", query);
        const response = await fetchImpl(url, {
          headers: {
            "user-agent": "openclone-cli/0.3 (+https://github.com/team-attention/openclone)",
            accept: "text/html,*/*;q=0.8",
          },
        });
        const html = await response.text();
        return {
          query,
          searchUrl: url.toString(),
          results: parseDuckDuckGoResults(html, limit),
        };
      },
    }),
  };
}
