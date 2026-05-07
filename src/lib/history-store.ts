import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ModelMessage } from "ai";
import { opencloneHome } from "./paths.js";

export interface ConversationSessionRecord {
  schemaVersion: 1;
  sessionId: string;
  cloneSlug: string;
  cloneLabel: string;
  startedAt: string;
  updatedAt: string;
  messages: ModelMessage[];
  conversationSummary: string;
  providerName?: string;
  modelId?: string;
}

export interface HistoryStoreOptions {
  baseDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface SessionListEntry {
  sessionId: string;
  cloneSlug: string;
  path: string;
  startedAt?: string;
  updatedAt?: string;
  messageCount?: number;
  cloneLabel?: string;
}

const SESSION_ID_TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/;

export function isValidSessionId(sessionId: string): boolean {
  return SESSION_ID_TIMESTAMP_RE.test(sessionId);
}

export function assertValidSessionId(sessionId: string): void {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid sessionId: expected filename-safe timestamp, received ${JSON.stringify(sessionId)}`);
  }
}

export class HistoryStore {
  readonly baseDir: string;

  constructor(options: HistoryStoreOptions = {}) {
    this.baseDir = options.baseDir ?? join(opencloneHome(options.env), "conversations");
  }

  cloneDir(slug: string): string {
    return join(this.baseDir, slug);
  }

  sessionPath(slug: string, sessionId: string): string {
    assertValidSessionId(sessionId);
    return join(this.cloneDir(slug), `${sessionId}.json`);
  }

  async ensureCloneDir(slug: string): Promise<void> {
    await mkdir(this.cloneDir(slug), { recursive: true });
  }

  async save(record: ConversationSessionRecord): Promise<string> {
    if (!record.sessionId) throw new Error("HistoryStore.save: sessionId is required");
    if (!record.cloneSlug) throw new Error("HistoryStore.save: cloneSlug is required");
    await this.ensureCloneDir(record.cloneSlug);
    const path = this.sessionPath(record.cloneSlug, record.sessionId);
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    return path;
  }

  async load(slug: string, sessionId: string): Promise<ConversationSessionRecord> {
    const raw = await readFile(this.sessionPath(slug, sessionId), "utf8");
    return normalizeRecord(JSON.parse(raw) as Partial<ConversationSessionRecord>, slug, sessionId);
  }

  async list(slug: string): Promise<SessionListEntry[]> {
    let names: string[];
    try {
      names = await readdir(this.cloneDir(slug));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const entries: SessionListEntry[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const sessionId = name.slice(0, -".json".length);
      const path = join(this.cloneDir(slug), `${sessionId}.json`);
      let parsed: Partial<ConversationSessionRecord> | undefined;
      try {
        parsed = JSON.parse(await readFile(path, "utf8")) as Partial<ConversationSessionRecord>;
      } catch {
        parsed = undefined;
      }
      entries.push({
        sessionId,
        cloneSlug: slug,
        path,
        startedAt: parsed?.startedAt || undefined,
        updatedAt: parsed?.updatedAt || undefined,
        messageCount: Array.isArray(parsed?.messages) ? parsed!.messages!.length : undefined,
        cloneLabel: parsed?.cloneLabel || undefined,
      });
    }
    entries.sort((a, b) => (a.sessionId < b.sessionId ? 1 : a.sessionId > b.sessionId ? -1 : 0));
    return entries;
  }

  async findLatest(slug: string): Promise<ConversationSessionRecord | undefined> {
    const sessions = await this.list(slug);
    for (const session of sessions) {
      if (!isValidSessionId(session.sessionId)) continue;
      try {
        return await this.load(slug, session.sessionId);
      } catch {
        // A stray or partially-written session file should not prevent `--resume`
        // from falling back to the next newest loadable session.
      }
    }
    return undefined;
  }

  async listClonesWithSessions(): Promise<string[]> {
    let names: string[];
    try {
      names = await readdir(this.baseDir, { withFileTypes: true }).then((entries) =>
        entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    return names.sort();
  }

  async listAllSessions(): Promise<SessionListEntry[]> {
    const slugs = await this.listClonesWithSessions();
    const all: SessionListEntry[] = [];
    for (const slug of slugs) {
      const sessions = await this.list(slug);
      all.push(...sessions);
    }
    all.sort((a, b) => {
      const aKey = a.updatedAt || a.sessionId;
      const bKey = b.updatedAt || b.sessionId;
      if (aKey < bKey) return 1;
      if (aKey > bKey) return -1;
      return 0;
    });
    return all;
  }
}

let lastGeneratedSessionTimeMs = 0;

export function newSessionId(now?: Date): string {
  const timestamp = now ?? new Date();
  if (!now) {
    const nextTimeMs = Math.max(timestamp.getTime(), lastGeneratedSessionTimeMs + 1);
    lastGeneratedSessionTimeMs = nextTimeMs;
    timestamp.setTime(nextTimeMs);
  }
  return timestamp.toISOString().replace(/:/g, "-").replace(/\./g, "-");
}

export function sessionIdToIso(sessionId: string): string {
  const match = sessionId.match(SESSION_ID_TIMESTAMP_RE);
  if (!match) return sessionId;
  const [, date, hh, mm, ss, ms] = match;
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

function normalizeRecord(
  parsed: Partial<ConversationSessionRecord>,
  slug: string,
  sessionId: string,
): ConversationSessionRecord {
  return {
    schemaVersion: 1,
    sessionId,
    cloneSlug: parsed.cloneSlug ?? slug,
    cloneLabel: parsed.cloneLabel ?? slug,
    startedAt: parsed.startedAt ?? "",
    updatedAt: parsed.updatedAt ?? "",
    messages: Array.isArray(parsed.messages) ? (parsed.messages as ModelMessage[]) : [],
    conversationSummary: parsed.conversationSummary ?? "",
    providerName: parsed.providerName,
    modelId: parsed.modelId,
  };
}
