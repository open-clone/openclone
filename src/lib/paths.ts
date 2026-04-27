import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

export function homeDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.HOME ?? env.USERPROFILE ?? "";
}

export function opencloneHome(env: NodeJS.ProcessEnv = process.env): string {
  const home = homeDir(env);
  return env.OPENCLONE_HOME ?? (home ? resolve(home, ".openclone") : ".openclone");
}

export function codexHome(env: NodeJS.ProcessEnv = process.env): string {
  const home = homeDir(env);
  return env.CODEX_HOME ?? (home ? resolve(home, ".codex") : ".codex");
}
