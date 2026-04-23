// Validate the root SKILL.md:
//   1. Frontmatter has required keys (name, description, allowed-tools) and
//      the right `name`.
//   2. Every `${CLAUDE_SKILL_DIR}/references/<file>.md` path referenced in the
//      body actually exists on disk — catches typos and deleted refs before
//      they ship to users as silent dispatcher errors.
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

function splitFrontmatter(
  text: string,
  path: string,
): { fm: Record<string, string>; body: string } {
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

  const fm: Record<string, string> = {};
  for (let i = 1; i < end; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const idx = raw.indexOf(":");
    if (idx < 0) continue;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    fm[key] = value;
  }
  return { fm, body: lines.slice(end + 1).join("\n") };
}

if (!existsSync(SKILL_PATH)) fail(["SKILL.md missing at repo root"]);

const { fm, body } = splitFrontmatter(readFileSync(SKILL_PATH, "utf8"), SKILL_PATH);
const problems: string[] = [];
for (const key of REQUIRED_KEYS) {
  if (!fm[key]) problems.push(`SKILL.md: missing or empty '${key}'`);
}
if (fm.name && fm.name !== "openclone") {
  problems.push(`SKILL.md: name must be 'openclone' (got '${fm.name}')`);
}

// Cross-check: every references/*.md file the dispatcher tells Claude to load
// must exist. Pattern matches `${CLAUDE_SKILL_DIR}/references/<slug>.md`.
const refPattern = /\$\{CLAUDE_SKILL_DIR\}\/references\/([a-z0-9][a-z0-9-]*\.md)/g;
const seen = new Set<string>();
let m: RegExpExecArray | null;
while ((m = refPattern.exec(body)) !== null) {
  const file = m[1];
  if (seen.has(file)) continue;
  seen.add(file);
  const fp = resolve(ROOT, "references", file);
  if (!existsSync(fp)) {
    problems.push(`SKILL.md references non-existent file: references/${file}`);
  }
}

if (problems.length > 0) fail(problems);
console.log(`[OK] SKILL.md frontmatter valid; ${seen.size} reference file(s) resolved`);
