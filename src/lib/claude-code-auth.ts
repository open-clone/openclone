import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { promisify } from "node:util";
import { homeDir } from "./paths.js";

const execFileAsync = promisify(execFile);

export const CLAUDE_CODE_KEYCHAIN_SERVICE = "Claude Code-credentials";
export const CLAUDE_CODE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
export const CLAUDE_CODE_OAUTH_TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
export const CLAUDE_CODE_DEFAULT_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface ClaudeCodeOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes?: string[];
  subscriptionType?: string;
  rateLimitTier?: string;
}

interface ClaudeCodeCredentialsFile {
  claudeAiOauth?: ClaudeCodeOAuthTokens;
}

export type ClaudeCodeStorageKind = "keychain" | "file";

export interface ClaudeCodeCredentialRecord {
  storage: ClaudeCodeStorageKind;
  filePath?: string;
  account?: string;
  tokens: ClaudeCodeOAuthTokens;
}

export interface ClaudeCodeAuthAdapters {
  keychain?: KeychainAdapter;
  fs?: FsAdapter;
  fetch?: typeof fetch;
  now?: () => number;
}

export interface KeychainAdapter {
  read(account: string): Promise<string | null>;
  write(account: string, secret: string): Promise<void>;
}

export interface FsAdapter {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, contents: string): Promise<void>;
}

const macKeychain: KeychainAdapter = {
  async read(account) {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s",
        CLAUDE_CODE_KEYCHAIN_SERVICE,
        "-a",
        account,
        "-w",
      ]);
      return stdout.trim();
    } catch {
      return null;
    }
  },
  async write(account, secret) {
    await execFileAsync("security", [
      "add-generic-password",
      "-U",
      "-s",
      CLAUDE_CODE_KEYCHAIN_SERVICE,
      "-a",
      account,
      "-w",
      secret,
    ]);
  },
};

const defaultFs: FsAdapter = {
  async readFile(path) {
    try {
      return await readFile(path, "utf8");
    } catch {
      return null;
    }
  },
  async writeFile(path, contents) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, "utf8");
    await chmod(path, 0o600).catch(() => undefined);
  },
};

export function claudeCredentialsFilePath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.OPENCLONE_CLAUDE_CODE_AUTH_FILE) return env.OPENCLONE_CLAUDE_CODE_AUTH_FILE;
  const home = homeDir(env);
  return home ? join(home, ".claude", ".credentials.json") : ".claude/.credentials.json";
}

function parseCredentialsJson(raw: string): ClaudeCodeOAuthTokens | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const oauth = (parsed as ClaudeCodeCredentialsFile).claudeAiOauth;
  if (!oauth || typeof oauth !== "object") return null;
  if (typeof oauth.accessToken !== "string" || typeof oauth.refreshToken !== "string") return null;
  const expiresAt = typeof oauth.expiresAt === "number" ? oauth.expiresAt : Number(oauth.expiresAt);
  if (!Number.isFinite(expiresAt)) return null;
  return {
    accessToken: oauth.accessToken,
    refreshToken: oauth.refreshToken,
    expiresAt,
    scopes: Array.isArray(oauth.scopes) ? oauth.scopes : undefined,
    subscriptionType: typeof oauth.subscriptionType === "string" ? oauth.subscriptionType : undefined,
    rateLimitTier: typeof oauth.rateLimitTier === "string" ? oauth.rateLimitTier : undefined,
  };
}

function serializeCredentials(tokens: ClaudeCodeOAuthTokens): string {
  return JSON.stringify({ claudeAiOauth: tokens }, null, 2);
}

function keychainAccount(env: NodeJS.ProcessEnv): string | undefined {
  return env.OPENCLONE_CLAUDE_CODE_KEYCHAIN_ACCOUNT ?? env.USER ?? env.LOGNAME ?? undefined;
}

export async function loadClaudeCodeCredentials(
  env: NodeJS.ProcessEnv = process.env,
  adapters: ClaudeCodeAuthAdapters = {},
): Promise<ClaudeCodeCredentialRecord> {
  const fs = adapters.fs ?? defaultFs;
  const filePath = claudeCredentialsFilePath(env);
  const fileRaw = await fs.readFile(filePath);
  if (fileRaw) {
    const tokens = parseCredentialsJson(fileRaw);
    if (tokens) return { storage: "file", filePath, tokens };
  }

  if (process.platform === "darwin" || adapters.keychain) {
    const account = keychainAccount(env);
    const keychain = adapters.keychain ?? macKeychain;
    if (account) {
      const secret = await keychain.read(account);
      if (secret) {
        const tokens = parseCredentialsJson(secret);
        if (tokens) return { storage: "keychain", account, tokens };
      }
    }
  }

  throw new Error(
    `Claude Code OAuth credentials not found. Run \`claude /login\` to sign in, or unset --use-claude-code-auth. (Looked at: ${filePath}${process.platform === "darwin" ? ` and macOS keychain service "${CLAUDE_CODE_KEYCHAIN_SERVICE}"` : ""})`,
  );
}

export async function persistClaudeCodeCredentials(
  record: ClaudeCodeCredentialRecord,
  env: NodeJS.ProcessEnv = process.env,
  adapters: ClaudeCodeAuthAdapters = {},
): Promise<void> {
  const serialized = serializeCredentials(record.tokens);
  if (record.storage === "keychain" && record.account) {
    const keychain = adapters.keychain ?? macKeychain;
    await keychain.write(record.account, serialized);
    return;
  }
  const fs = adapters.fs ?? defaultFs;
  const path = record.filePath ?? claudeCredentialsFilePath(env);
  await fs.writeFile(path, serialized);
}

export async function refreshClaudeCodeToken(
  refreshToken: string,
  adapters: ClaudeCodeAuthAdapters = {},
): Promise<ClaudeCodeOAuthTokens> {
  const fetchImpl = adapters.fetch ?? fetch;
  const response = await fetchImpl(CLAUDE_CODE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLAUDE_CODE_OAUTH_CLIENT_ID,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Claude Code OAuth refresh failed (${response.status}). Run \`claude /login\` to re-authenticate.${body ? ` Server said: ${body.slice(0, 200)}` : ""}`,
    );
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : undefined;
  const newRefresh = typeof payload.refresh_token === "string" ? payload.refresh_token : refreshToken;
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : undefined;
  if (!accessToken || expiresIn === undefined) {
    throw new Error("Claude Code OAuth refresh response missing access_token or expires_in.");
  }
  const now = adapters.now ? adapters.now() : Date.now();
  return {
    accessToken,
    refreshToken: newRefresh,
    expiresAt: now + expiresIn * 1000,
    scopes: Array.isArray(payload.scope)
      ? (payload.scope as string[])
      : typeof payload.scope === "string"
        ? payload.scope.split(/\s+/)
        : undefined,
  };
}

export interface EnsureFreshOptions {
  marginMs?: number;
  refreshNow?: boolean;
}

export async function ensureFreshClaudeCodeCredentials(
  record: ClaudeCodeCredentialRecord,
  env: NodeJS.ProcessEnv = process.env,
  adapters: ClaudeCodeAuthAdapters = {},
  options: EnsureFreshOptions = {},
): Promise<ClaudeCodeCredentialRecord> {
  const margin = options.marginMs ?? CLAUDE_CODE_DEFAULT_REFRESH_MARGIN_MS;
  const now = adapters.now ? adapters.now() : Date.now();
  const expiresAt = record.tokens.expiresAt;
  const needsRefresh = options.refreshNow === true || !Number.isFinite(expiresAt) || expiresAt - margin <= now;
  if (!needsRefresh) return record;

  const refreshed = await refreshClaudeCodeToken(record.tokens.refreshToken, adapters);
  const merged: ClaudeCodeOAuthTokens = {
    ...record.tokens,
    ...refreshed,
  };
  const next: ClaudeCodeCredentialRecord = { ...record, tokens: merged };
  await persistClaudeCodeCredentials(next, env, adapters);
  return next;
}
