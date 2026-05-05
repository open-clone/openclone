import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOllama } from "ai-sdk-ollama";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { createOpenAIOAuth } from "openai-oauth-provider";
import { mergeConfig, readConfig, type CliConfig } from "./config.js";
import {
  ensureFreshClaudeCodeCredentials,
  loadClaudeCodeCredentials,
  refreshClaudeCodeToken,
  persistClaudeCodeCredentials,
  type ClaudeCodeCredentialRecord,
} from "./claude-code-auth.js";

export type ProviderKind = "openai-compatible" | "codex-oauth" | "ollama" | "claude-code-oauth";

export interface ProviderOptions extends CliConfig {
  env?: NodeJS.ProcessEnv;
}

export const CLAUDE_CODE_IDENTITY_PROMPT = "You are a Claude agent, built on Anthropic's Claude Agent SDK.";
const CLAUDE_CODE_REQUIRED_BETAS = "oauth-2025-04-20,interleaved-thinking-2025-05-14";
const CLAUDE_CODE_USER_AGENT = "claude-cli/2.1.87 (external, cli)";

export interface ResolvedProvider {
  model: LanguageModel;
  modelId: string;
  providerName: string;
  provider: ProviderKind;
  baseURL?: string;
  authSource: "api-key" | "codex-oauth" | "claude-code-oauth" | "none";
  codexStore?: boolean;
  systemPrefix?: string;
}

function envFlag(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function normalizeProvider(
  value: string | undefined,
  useCodexAuth: boolean | undefined,
  useClaudeCodeAuth: boolean | undefined,
): ProviderKind {
  const normalized = value?.trim().toLowerCase();
  if (useClaudeCodeAuth || normalized === "claude" || normalized === "claude-code" || normalized === "claude-code-oauth") {
    return "claude-code-oauth";
  }
  if (useCodexAuth || normalized === "codex" || normalized === "codex-oauth" || normalized === "openai-oauth") {
    return "codex-oauth";
  }
  if (normalized === "ollama") return "ollama";
  return "openai-compatible";
}

function envConfig(env: NodeJS.ProcessEnv): CliConfig {
  return {
    provider: env.OPENCLONE_PROVIDER,
    baseURL: env.OPENCLONE_BASE_URL,
    apiKey: env.OPENCLONE_API_KEY ?? env.OPENAI_API_KEY,
    model: env.OPENCLONE_MODEL ?? env.OPENAI_MODEL,
    providerName: env.OPENCLONE_PROVIDER_NAME,
    useCodexAuth: envFlag(env.OPENCLONE_USE_CODEX_AUTH),
    codexEnsureFresh: env.OPENCLONE_CODEX_ENSURE_FRESH === undefined ? undefined : envFlag(env.OPENCLONE_CODEX_ENSURE_FRESH),
    codexStore: env.OPENCLONE_CODEX_STORE === undefined ? undefined : envFlag(env.OPENCLONE_CODEX_STORE),
    codexAuthFilePath: env.OPENCLONE_CODEX_AUTH_FILE,
    useClaudeCodeAuth: envFlag(env.OPENCLONE_USE_CLAUDE_CODE_AUTH) || envFlag(env.OPENCLONE_USE_CLAUDE_AUTH),
    claudeCodeEnsureFresh:
      env.OPENCLONE_CLAUDE_CODE_ENSURE_FRESH === undefined ? undefined : envFlag(env.OPENCLONE_CLAUDE_CODE_ENSURE_FRESH),
    claudeCodeAuthFilePath: env.OPENCLONE_CLAUDE_CODE_AUTH_FILE,
  };
}

type FetchInput = Parameters<typeof fetch>[0];

function rewriteAnthropicMessagesUrl(input: FetchInput): FetchInput {
  const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
  if (url.pathname.endsWith("/v1/messages") && !url.searchParams.has("beta")) {
    url.searchParams.set("beta", "true");
  }
  if (typeof input === "string" || input instanceof URL) return url;
  return new Request(url, input);
}

function buildClaudeCodeFetch(
  env: NodeJS.ProcessEnv,
  initialRecord: ClaudeCodeCredentialRecord,
): { fetch: typeof fetch; getCurrent: () => ClaudeCodeCredentialRecord } {
  let record = initialRecord;

  const wrapped: typeof fetch = async (input, init = {}) => {
    const rewritten = rewriteAnthropicMessagesUrl(input);

    const baseHeaders = new Headers(init.headers ?? (rewritten instanceof Request ? rewritten.headers : undefined));
    baseHeaders.delete("x-api-key");
    baseHeaders.set("authorization", `Bearer ${record.tokens.accessToken}`);
    if (!baseHeaders.has("user-agent")) baseHeaders.set("user-agent", CLAUDE_CODE_USER_AGENT);

    const sendInit: RequestInit = { ...init, headers: baseHeaders };
    let response = await fetch(rewritten, sendInit);
    if (response.status !== 401) return response;

    let refreshed: ClaudeCodeCredentialRecord;
    try {
      const newTokens = await refreshClaudeCodeToken(record.tokens.refreshToken);
      refreshed = { ...record, tokens: { ...record.tokens, ...newTokens } };
      await persistClaudeCodeCredentials(refreshed, env);
    } catch {
      return response;
    }
    record = refreshed;
    const retryHeaders = new Headers(sendInit.headers);
    retryHeaders.set("authorization", `Bearer ${record.tokens.accessToken}`);
    response = await fetch(rewritten, { ...sendInit, headers: retryHeaders });
    return response;
  };

  return { fetch: wrapped, getCurrent: () => record };
}

export async function resolveProvider(options: ProviderOptions = {}): Promise<ResolvedProvider> {
  const env = options.env ?? process.env;
  const fileConfig = await readConfig(env);
  const config = mergeConfig(
    fileConfig,
    envConfig(env),
    {
      provider: options.provider,
      baseURL: options.baseURL,
      apiKey: options.apiKey,
      model: options.model,
      providerName: options.providerName,
      useCodexAuth: options.useCodexAuth,
      headers: options.headers,
      codexEnsureFresh: options.codexEnsureFresh,
      codexStore: options.codexStore,
      codexAuthFilePath: options.codexAuthFilePath,
      useClaudeCodeAuth: options.useClaudeCodeAuth,
      claudeCodeEnsureFresh: options.claudeCodeEnsureFresh,
      claudeCodeAuthFilePath: options.claudeCodeAuthFilePath,
    },
  );

  const providerKind = normalizeProvider(config.provider, config.useCodexAuth, config.useClaudeCodeAuth);

  if (providerKind === "claude-code-oauth") {
    const providerName = config.providerName ?? "openclone-claude-code-oauth";
    const baseURL = config.baseURL ?? env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";
    const modelId = config.model ?? "claude-sonnet-4-6";

    const credentialEnv = config.claudeCodeAuthFilePath
      ? { ...env, OPENCLONE_CLAUDE_CODE_AUTH_FILE: config.claudeCodeAuthFilePath }
      : env;
    let record = await loadClaudeCodeCredentials(credentialEnv);
    if (config.claudeCodeEnsureFresh ?? true) {
      record = await ensureFreshClaudeCodeCredentials(record, credentialEnv);
    }

    const { fetch: oauthFetch } = buildClaudeCodeFetch(credentialEnv, record);
    const headers: Record<string, string> = {
      "anthropic-beta": CLAUDE_CODE_REQUIRED_BETAS,
      ...(config.headers ?? {}),
    };

    const provider = createAnthropic({
      name: providerName,
      baseURL,
      authToken: record.tokens.accessToken,
      headers,
      fetch: oauthFetch,
    });

    return {
      model: provider(modelId) as LanguageModel,
      modelId,
      providerName,
      provider: providerKind,
      baseURL,
      authSource: "claude-code-oauth",
      systemPrefix: CLAUDE_CODE_IDENTITY_PROMPT,
    };
  }

  if (providerKind === "codex-oauth") {
    const providerName = config.providerName ?? "openclone-codex-oauth";
    const baseURL = config.baseURL ?? "https://chatgpt.com/backend-api/codex";
    const modelId = config.model ?? "gpt-5.5";
    const codexStore = config.codexStore ?? false;
    const provider = createOpenAIOAuth({
      name: providerName,
      baseURL,
      authFilePath: config.codexAuthFilePath,
      ensureFresh: config.codexEnsureFresh ?? true,
      store: codexStore,
      headers: config.headers,
    });
    return {
      model: provider(modelId) as LanguageModel,
      modelId,
      providerName,
      provider: providerKind,
      baseURL,
      authSource: "codex-oauth",
      codexStore,
    };
  }

  if (providerKind === "ollama") {
    const providerName = config.providerName ?? "openclone-ollama";
    const baseURL = config.baseURL ?? "http://127.0.0.1:11434";
    const modelId = config.model ?? "llama3.2";
    const provider = createOllama({
      baseURL,
      apiKey: config.apiKey,
      headers: config.headers,
    });
    return {
      model: provider(modelId) as LanguageModel,
      modelId,
      providerName,
      provider: providerKind,
      baseURL,
      authSource: config.apiKey ? "api-key" : "none",
    };
  }

  const providerName = config.providerName ?? "openclone-openai-compatible";
  const baseURL = config.baseURL ?? "https://api.openai.com/v1";
  const modelId = config.model ?? "gpt-5.5";
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error(
      "No API credential configured. Set OPENCLONE_API_KEY/OPENAI_API_KEY, use --provider ollama, pass --use-codex-auth for Codex OAuth, or pass --use-claude-code-auth for Claude Code subscription OAuth.",
    );
  }

  const provider = createOpenAICompatible({
    name: providerName,
    baseURL,
    apiKey,
    headers: config.headers ?? {},
  });

  return {
    model: provider(modelId),
    modelId,
    providerName,
    provider: providerKind,
    baseURL,
    authSource: "api-key",
  };
}
