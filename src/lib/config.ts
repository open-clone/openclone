import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { opencloneHome } from "./paths.js";

export interface CliConfig {
  provider?: string;
  baseURL?: string;
  apiKey?: string;
  model?: string;
  providerName?: string;
  useCodexAuth?: boolean;
  codexEnsureFresh?: boolean;
  codexAuthFilePath?: string;
  headers?: Record<string, string>;
}

export async function readConfig(env: NodeJS.ProcessEnv = process.env): Promise<CliConfig> {
  const path = env.OPENCLONE_CONFIG ?? join(opencloneHome(env), "config.json");
  try {
    return JSON.parse(await readFile(path, "utf8")) as CliConfig;
  } catch {
    return {};
  }
}

export function mergeConfig(...configs: CliConfig[]): CliConfig {
  const merged: CliConfig = {};
  for (const config of configs) {
    if (!config) continue;
    for (const [key, value] of Object.entries(config) as Array<[keyof CliConfig, CliConfig[keyof CliConfig]]>) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
}
