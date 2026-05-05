#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CloneLoader } from "../lib/clone-loader.js";
import { createCloneTools } from "../lib/clone-tools.js";
import { runConversation, shouldStartInteractive, type ConversationPersistEvent } from "../lib/conversation.js";
import { runSingleShot } from "../lib/single-shot.js";
import {
  HistoryStore,
  newSessionId,
  sessionIdToIso,
  type ConversationSessionRecord,
  type SessionListEntry,
} from "../lib/history-store.js";
import { renderActiveClonePrompt } from "../lib/prompt-renderer.js";
import { opencloneHome } from "../lib/paths.js";
import { resolveProvider } from "../lib/provider-resolver.js";
import { formatErrorBlock, isErrorFormatted, markErrorFormatted } from "../lib/format-error.js";

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
  return `openclone CLI\n\nUsage:\n  openclone list\n  openclone status\n  openclone chat [slug] [--prompt <text>] [--dry-run]
  openclone chat [slug]                 # interactive conversation when no prompt/stdin is provided
  openclone chat [slug] --resume        # resume the latest saved session for this clone
  openclone chat [slug] --resume=<id>   # resume a specific saved session by id
  openclone history                     # show history command help (no implicit clone)
  openclone history <slug>              # list saved sessions for a single clone
  openclone history --all               # cross-clone grouped view (also flags orphan sessions)
  openclone history [...] --quiet       # suppress column header and per-session resume hints (for piping)\n\nProvider flags for chat:\n  --base-url <url>       OpenAI-compatible base URL (default: https://api.openai.com/v1)\n  --api-key <key>        API key (prefer env OPENCLONE_API_KEY/OPENAI_API_KEY)\n  --model <id>           Model id (default: gpt-5.5)\n  --use-codex-auth       Opt in to read-only Codex OAuth token reuse from ~/.codex/auth.json\n  --resume[=<id>]        Resume a saved interactive session (latest if no id)\n  --no-persist           Do not write this session to disk\n\nSessions are stored at ~/.openclone/conversations/<slug>/<sessionId>.json (plaintext JSON).\n`;
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

  const resumeFlag = args.flags.resume;
  const resumeRequested = resumeFlag === true || typeof resumeFlag === "string";
  const resumeSessionId = typeof resumeFlag === "string" ? resumeFlag : undefined;
  const persistDisabled = flagBoolean(args.flags, "noPersist") === true;

  const hasExplicitPrompt = Boolean(flagString(args.flags, "prompt") ?? positionalPrompt ?? prompt);
  const interactive = hasExplicitPrompt
    ? false
    : (resumeRequested ? true : shouldStartInteractive({
      explicitPrompt: flagString(args.flags, "prompt"),
      positionalPrompt,
      stdinText: prompt,
      stdinIsTTY: process.stdin.isTTY,
      stdoutIsTTY: process.stdout.isTTY,
    }));

  const loader = new CloneLoader();
  const clone = await loader.loadClone(slug);
  const rendered = renderActiveClonePrompt(clone, { question: prompt });

  if (args.flags.dryRun) {
    console.log(JSON.stringify({
      clone: { slug: clone.slug, origin: clone.origin, displayName: clone.displayName, categories: clone.categories },
      selectedKnowledge: rendered.knowledge.map((file) => ({ path: file.path, origin: file.origin, topic: file.topic, dateKey: file.dateKey })),
      system: rendered.system,
      user: prompt,
      interactive,
    }, null, 2));
    return;
  }

  if (!interactive && !prompt) {
    throw new Error("No prompt provided. Use --prompt, positional text, pipe stdin, or run from a TTY for interactive mode.");
  }

  const provider = await resolveProvider({
    provider: flagString(args.flags, "provider"),
    baseURL: flagString(args.flags, "baseUrl"),
    apiKey: flagString(args.flags, "apiKey"),
    model: flagString(args.flags, "model"),
    providerName: flagString(args.flags, "providerName"),
    useCodexAuth: flagBoolean(args.flags, "useCodexAuth"),
  });

  const tools = createCloneTools(clone);

  if (interactive) {
    const historyStore = new HistoryStore();
    let resumedRecord: ConversationSessionRecord | undefined;
    if (resumeRequested) {
      resumedRecord = resumeSessionId
        ? await historyStore.load(slug, resumeSessionId)
        : await historyStore.findLatest(slug);
      if (!resumedRecord) {
        throw new Error(`No saved session found for clone "${slug}". Start a new chat to create one.`);
      }
    }

    const sessionId = resumedRecord?.sessionId ?? newSessionId();
    const startedAt = resumedRecord?.startedAt || new Date().toISOString();
    const cloneLabel = `${clone.displayName} (${clone.slug})`;

    const conversationOptions = {
      cloneLabel,
      model: provider.model,
      system: rendered.system,
      tools,
      initialMessages: resumedRecord?.messages,
      initialSummary: resumedRecord?.conversationSummary,
      onPersist: persistDisabled ? undefined : async ({ messages, conversationSummary }: ConversationPersistEvent) => {
        await historyStore.save({
          schemaVersion: 1,
          sessionId,
          cloneSlug: slug,
          cloneLabel,
          startedAt,
          updatedAt: new Date().toISOString(),
          messages,
          conversationSummary,
          providerName: provider.providerName,
          modelId: provider.modelId,
        });
      },
    } as const;

    const useInkTui = process.stdout.isTTY === true && process.stdin.isTTY === true;
    if (useInkTui) {
      const { runInkConversation } = await import("../ui/runInkConversation.js");
      await runInkConversation({
        ...conversationOptions,
        speakerLabel: clone.displayName,
        modelLabel: provider.modelId,
        sessionLabel: `ses ${sessionId.slice(11, 16)}`,
      });
    } else {
      await runConversation(conversationOptions);
    }

    if (!persistDisabled) {
      console.log(`[session saved: ${historyStore.sessionPath(slug, sessionId)}]`);
    }
    if (useInkTui) {
      process.exit(0);
    }
    return;
  }

  await runSingleShot({
    cloneSlug: slug,
    cloneLabel: `${clone.displayName} (${clone.slug})`,
    model: provider.model,
    modelId: provider.modelId,
    providerName: provider.providerName,
    system: rendered.system,
    prompt,
    tools,
    resumeRequested,
    resumeSessionId,
    persistDisabled,
  });
}

async function historyCommand(args: ParsedArgs): Promise<void> {
  const explicitSlug = args.positionals[0];
  const allFlag = flagBoolean(args.flags, "all") === true;
  const quietFlag = flagBoolean(args.flags, "quiet") === true;

  if (!explicitSlug && !allFlag) {
    console.log(historyHelp());
    return;
  }

  const store = new HistoryStore();

  if (allFlag) {
    await printAllSessionsGrouped(store, quietFlag);
    return;
  }

  const slug = explicitSlug as string;
  const sessions = await store.list(slug);
  if (sessions.length === 0) {
    console.log(`No saved sessions for clone "${slug}".`);
    return;
  }
  if (!quietFlag) console.log(historyHeaderLine());
  for (const [index, entry] of sessions.entries()) {
    console.log(formatSessionLine(entry));
    if (!quietFlag) console.log(resumeHintLine(slug, entry.sessionId, index === 0));
  }
  if (!quietFlag) console.log(historyFooterHint());
}

export function historyHelp(): string {
  return [
    "openclone history — list saved conversation sessions",
    "",
    "Usage:",
    "  openclone history <slug>      List sessions for a single clone (e.g. douglas).",
    "  openclone history --all       List sessions across every clone, grouped by clone.",
    "                                Sessions whose clone no longer exists are flagged",
    "                                as [orphan: clone not found].",
    "",
    "Options:",
    "  --quiet                       Suppress column header and per-session resume hints",
    "                                (useful when piping into other tools).",
    "",
    "Resume a session:",
    "  openclone chat <slug> --resume               # newest session for that clone",
    "  openclone chat <slug> --resume=<SESSION_ID>  # specific session by id",
    "",
    "SESSION_ID is the first column of the table (e.g. 2026-04-28T15-38-41-598Z).",
    "Sessions live at ~/.openclone/conversations/<slug>/<SESSION_ID>.json (plaintext JSON).",
  ].join("\n");
}

const HISTORY_COLUMNS = "SESSION_ID\tMESSAGES\tLAST_UPDATED\tPATH";

export function historyHeaderLine(): string {
  return HISTORY_COLUMNS;
}

export function formatSessionLine(entry: SessionListEntry): string {
  const turnCount = entry.messageCount ?? 0;
  const updated = entry.updatedAt || sessionIdToIso(entry.sessionId);
  return `${entry.sessionId}\t${turnCount} msgs\tupdated ${updated}\t${entry.path}`;
}

export function resumeHintLine(slug: string, sessionId: string, isLatest: boolean): string {
  if (isLatest) {
    return `  → resume: openclone chat ${slug} --resume   (or --resume=${sessionId})`;
  }
  return `  → resume: openclone chat ${slug} --resume=${sessionId}`;
}

export function historyFooterHint(): string {
  return [
    "",
    "Tip: --resume (no value) picks the newest session for that clone.",
    "     --resume=<SESSION_ID> picks a specific one. SESSION_ID is the first column above.",
    "     Pass --quiet to suppress this header and per-session hints (useful for piping).",
  ].join("\n");
}

async function printAllSessionsGrouped(store: HistoryStore, quiet: boolean): Promise<void> {
  const slugsWithSessions = await store.listClonesWithSessions();
  if (slugsWithSessions.length === 0) {
    console.log("No saved sessions yet. Start one with: openclone chat <slug>");
    return;
  }

  const loader = new CloneLoader({ lazyFetchBuiltInKnowledge: false });
  const knownClones = await loader.listClones();
  const knownSlugs = new Set(knownClones.map((clone) => clone.slug));
  const displayName = new Map(knownClones.map((clone) => [clone.slug, clone.displayName]));

  let totalSessions = 0;
  for (const slug of slugsWithSessions) {
    const sessions = await store.list(slug);
    totalSessions += sessions.length;
    const orphanTag = knownSlugs.has(slug) ? "" : " [orphan: clone not found]";
    const label = displayName.get(slug) ?? slug;
    const header = label === slug ? slug : `${label} (${slug})`;
    console.log(`\n# ${header}${orphanTag} — ${sessions.length} session(s)`);
    if (!quiet) console.log(historyHeaderLine());
    for (const [index, entry] of sessions.entries()) {
      console.log(formatSessionLine(entry));
      if (!quiet) console.log(resumeHintLine(slug, entry.sessionId, index === 0));
    }
  }
  console.log(`\n${totalSessions} session(s) across ${slugsWithSessions.length} clone(s).`);
  if (!quiet) console.log(historyFooterHint());
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
    case "history":
      await historyCommand(args);
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

function reportError(error: unknown): void {
  if (isErrorFormatted(error)) {
    process.exitCode = 1;
    return;
  }
  markErrorFormatted(error);
  const useColor = Boolean(process.stderr.isTTY);
  const width = process.stderr.columns;
  process.stderr.write(`${formatErrorBlock(error, { color: useColor, width })}\n`);
  process.exitCode = 1;
}

process.on("unhandledRejection", (reason) => {
  reportError(reason);
  process.exit(process.exitCode ?? 1);
});
process.on("uncaughtException", (error) => {
  reportError(error);
  process.exit(process.exitCode ?? 1);
});

main().catch(reportError);
