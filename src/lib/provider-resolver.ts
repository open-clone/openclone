import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOllama } from "ai-sdk-ollama";
import type { LanguageModel } from "ai";
import { createOpenAIOAuth } from "openai-oauth-provider";
import { mergeConfig, readConfig, type CliConfig } from "./config.js";

export type ProviderKind = "openai-compatible" | "codex-oauth" | "ollama";

export interface ProviderOptions extends CliConfig {
  env?: NodeJS.ProcessEnv;
}

export interface ResolvedProvider {
  model: LanguageModel;
  modelId: string;
  providerName: string;
  provider: ProviderKind;
  baseURL?: string;
  authSource: "api-key" | "codex-oauth" | "none";
}

function envFlag(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function normalizeProvider(value: string | undefined, useCodexAuth: boolean | undefined): ProviderKind {
  const normalized = value?.trim().toLowerCase();
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
    codexAuthFilePath: env.OPENCLONE_CODEX_AUTH_FILE,
  };
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
      codexAuthFilePath: options.codexAuthFilePath,
    },
  );

  const providerKind = normalizeProvider(config.provider, config.useCodexAuth);

  if (providerKind === "codex-oauth") {
    const providerName = config.providerName ?? "openclone-codex-oauth";
    const baseURL = config.baseURL ?? "https://chatgpt.com/backend-api/codex";
    const modelId = config.model ?? "gpt-5.5";
    const provider = createOpenAIOAuth({
      name: providerName,
      baseURL,
      authFilePath: config.codexAuthFilePath,
      ensureFresh: config.codexEnsureFresh ?? true,
      headers: config.headers,
    });
    return {
      model: provider(modelId) as LanguageModel,
      modelId,
      providerName,
      provider: providerKind,
      baseURL,
      authSource: "codex-oauth",
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
  const modelId = config.model ?? "gpt-4.1-mini";
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error(
      "No API credential configured. Set OPENCLONE_API_KEY/OPENAI_API_KEY, use --provider ollama, or pass --use-codex-auth for Codex OAuth.",
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
