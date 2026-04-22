// Validate the root SKILL.md frontmatter for a standalone Claude Code skill.
// Required: name, description, allowed-tools. argument-hint is optional.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SKILL_PATH = resolve(ROOT, "SKILL.md");

const REQUIRED_KEYS = ["name", "description", "allowed-tools"] as const;

function fail(msgs: string[]): never {
  for (const m of msgs) console.error(`[FAIL] ${m}`);
  process.exit(1);
}

function parseFrontmatter(text: string, path: string): Record<string, string> {
  const lines = text.split("\n");
  const rel = relative(ROOT, path);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    fail([`${rel} missing opening frontmatter '---'`]);
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) fail([`${rel} missing closing frontmatter '---'`]);

  const out: Record<string, string> = {};
  for (let i = 1; i < end; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const idx = raw.indexOf(":");
    if (idx < 0) continue;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

if (!existsSync(SKILL_PATH)) fail(["SKILL.md missing at repo root"]);

const fm = parseFrontmatter(readFileSync(SKILL_PATH, "utf8"), SKILL_PATH);
const problems: string[] = [];
for (const key of REQUIRED_KEYS) {
  if (!fm[key]) problems.push(`SKILL.md: missing or empty '${key}'`);
}
if (fm.name && fm.name !== "openclone") {
  problems.push(`SKILL.md: name must be 'openclone' (got '${fm.name}')`);
}

if (problems.length > 0) fail(problems);
console.log("[OK] SKILL.md frontmatter valid");
