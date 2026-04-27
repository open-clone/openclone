#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CloneLoader } from "../lib/clone-loader.js";
import { renderActiveClonePrompt } from "../lib/prompt-renderer.js";
import { opencloneHome } from "../lib/paths.js";
import { resolveProvider } from "../lib/provider-resolver.js";
import { streamChat } from "../lib/stream-chat.js";

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const [rawKey, rawValue] = arg.slice(2).split("=", 2);
      const key = rawKey.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
      if (rawValue !== undefined) flags[key] = rawValue;
      else if (rest[i + 1] && !rest[i + 1].startsWith("--")) flags[key] = rest[++i];
      else flags[key] = true;
    } else {
      positionals.push(arg);
    }
  }
  return { command, positionals, flags };
}

function flagString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function flagBoolean(flags: Record<string, string | boolean>, key: string): boolean | undefined {
  const value = flags[key];
  return value === true ? true : undefined;
}

async function readStdinIfAvailable(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function activeCloneSlug(): Promise<string | undefined> {
  try {
    const raw = await readFile(join(opencloneHome(), "active-clone"), "utf8");
    return raw.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function roomMembers(): Promise<string[]> {
  try {
    const raw = await readFile(join(opencloneHome(), "room"), "utf8");
    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function usage(): string {
  return `openclone CLI\n\nUsage:\n  openclone list\n  openclone status\n  openclone chat [slug] [--prompt <text>] [--dry-run]\n\nProvider flags for chat:\n  --base-url <url>       OpenAI-compatible base URL (default: https://api.openai.com/v1)\n  --api-key <key>        API key (prefer env OPENCLONE_API_KEY/OPENAI_API_KEY)\n  --model <id>           Model id (default: gpt-4.1-mini)\n  --use-codex-auth       Opt in to read-only Codex OAuth token reuse from ~/.codex/auth.json\n`;
}

async function listCommand(): Promise<void> {
  const loader = new CloneLoader({ lazyFetchBuiltInKnowledge: false });
  const clones = await loader.listClones();
  for (const clone of clones) {
    const cats = clone.categories.length ? clone.categories.join(",") : "uncategorized";
    console.log(`${clone.slug}\t${clone.origin}\t${clone.displayName}\t${cats}\t${clone.tagline}`);
  }
}

async function statusCommand(): Promise<void> {
  const active = await activeCloneSlug();
  const room = await roomMembers();
  if (room.length > 0) console.log(`room: ${room.join(", ")}`);
  else console.log("room: inactive");
  if (active) console.log(`active-clone: ${active}`);
  else console.log("active-clone: inactive");
}

async function chatCommand(args: ParsedArgs): Promise<void> {
  const slug = args.positionals[0] ?? await activeCloneSlug();
  if (!slug) throw new Error("No clone specified and no ~/.openclone/active-clone found. Usage: openclone chat <slug>");

  const positionalPrompt = args.positionals.length > 1 ? args.positionals.slice(1).join(" ") : undefined;
  const prompt = flagString(args.flags, "prompt") ?? positionalPrompt ?? await readStdinIfAvailable();
  if (!prompt) throw new Error("No prompt provided. Use --prompt, positional text, or pipe stdin.");

  const loader = new CloneLoader();
  const clone = await loader.loadClone(slug);
  const rendered = renderActiveClonePrompt(clone, { question: prompt });

  if (args.flags.dryRun) {
    console.log(JSON.stringify({
      clone: { slug: clone.slug, origin: clone.origin, displayName: clone.displayName, categories: clone.categories },
      selectedKnowledge: rendered.knowledge.map((file) => ({ path: file.path, origin: file.origin, topic: file.topic, dateKey: file.dateKey })),
      system: rendered.system,
      user: prompt,
    }, null, 2));
    return;
  }

  const provider = await resolveProvider({
    provider: flagString(args.flags, "provider"),
    baseURL: flagString(args.flags, "baseUrl"),
    apiKey: flagString(args.flags, "apiKey"),
    model: flagString(args.flags, "model"),
    providerName: flagString(args.flags, "providerName"),
    useCodexAuth: flagBoolean(args.flags, "useCodexAuth"),
  });

  await streamChat({
    model: provider.model,
    system: rendered.system,
    messages: [{ role: "user", content: prompt }],
    onText: (chunk) => process.stdout.write(chunk),
  });
  process.stdout.write("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "list":
      await listCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case "chat":
      await chatCommand(args);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(usage());
      break;
    default:
      throw new Error(`Unknown command: ${args.command}\n\n${usage()}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`openclone: ${message}`);
  process.exitCode = 1;
});
