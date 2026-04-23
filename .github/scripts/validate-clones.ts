// Validate clones/*/persona.md against references/clone-schema.md.
// - Required frontmatter keys: name, display_name, tagline, categories, created, voice_traits
// - categories is a non-empty list with values from the fixed 7-category list
// - primary_category (if present) must be in categories
// - Required body sections exist: ## Persona, ## Speaking style, ## Guidelines, ## Background
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const CLONES_DIR = resolve(ROOT, "clones");

const REQUIRED_KEYS = [
  "name",
  "display_name",
  "tagline",
  "categories",
  "created",
  "voice_traits",
] as const;

const FIXED_CATEGORIES = new Set([
  "vc",
  "tech",
  "founder",
  "expert",
  "influencer",
  "politician",
  "celebrity",
]);
const REQUIRED_SECTIONS = ["## Persona", "## Speaking style", "## Guidelines", "## Background"];

function fail(msgs: string[]): never {
  for (const m of msgs) console.error(`[FAIL] ${m}`);
  process.exit(1);
}

function splitFrontmatter(text: string): { fm: string; body: string } | null {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0].trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return { fm: lines.slice(1, i).join("\n"), body: lines.slice(i + 1).join("\n") };
    }
  }
  return null;
}

function parseCategories(block: string): string[] | null {
  const inline = block.match(/^\s*categories\s*:\s*\[([^\]]*)\]/m);
  if (inline) {
    return inline[1]
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  const blockMatch = block.match(/^\s*categories\s*:\s*\n((?:\s*-\s*\S.*(?:\n|$))+)/m);
  if (blockMatch) {
    return blockMatch[1]
      .split("\n")
      .map((line) => line.trim().replace(/^-\s*/, "").trim())
      .filter(Boolean);
  }
  return null;
}

function parsePrimary(block: string): string | null {
  const m = block.match(/^\s*primary_category\s*:\s*(\S+)\s*$/m);
  return m ? m[1].trim() : null;
}

function hasKey(block: string, key: string): boolean {
  const pattern = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*:`, "m");
  return pattern.test(block);
}

if (!existsSync(CLONES_DIR) || !statSync(CLONES_DIR).isDirectory()) {
  console.log("[OK] no clones/ directory — skipping");
  process.exit(0);
}

const personaFiles: string[] = [];
for (const entry of readdirSync(CLONES_DIR)) {
  const cloneDir = join(CLONES_DIR, entry);
  if (!statSync(cloneDir).isDirectory()) continue;
  const persona = join(cloneDir, "persona.md");
  if (existsSync(persona)) personaFiles.push(persona);
}
personaFiles.sort();

if (personaFiles.length === 0) {
  console.log("[OK] no clone persona.md files found — skipping");
  process.exit(0);
}

const problems: string[] = [];

for (const path of personaFiles) {
  const rel = relative(ROOT, path);
  const text = readFileSync(path, "utf8");
  const split = splitFrontmatter(text);
  if (!split) {
    problems.push(`${rel}: missing or malformed frontmatter`);
    continue;
  }
  const { fm, body } = split;

  for (const key of REQUIRED_KEYS) {
    if (!hasKey(fm, key)) problems.push(`${rel}: missing frontmatter key '${key}'`);
  }

  const cats = parseCategories(fm);
  if (cats === null) {
    problems.push(`${rel}: could not parse 'categories' as a list`);
  } else if (cats.length === 0) {
    problems.push(`${rel}: 'categories' is empty`);
  } else {
    const bad = cats.filter((c) => !FIXED_CATEGORIES.has(c));
    if (bad.length > 0) {
      problems.push(
        `${rel}: invalid category value(s) ${JSON.stringify(bad)} — must be one of ${JSON.stringify(
          [...FIXED_CATEGORIES].sort(),
        )}`,
      );
    }
  }

  const primary = parsePrimary(fm);
  if (primary !== null && cats !== null && !cats.includes(primary)) {
    problems.push(
      `${rel}: primary_category '${primary}' not in categories ${JSON.stringify(cats)}`,
    );
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(section)) {
      problems.push(`${rel}: missing body section '${section}'`);
    }
  }
}

if (problems.length > 0) fail(problems);

// Cross-file consistency: adding a category requires edits in seven places
// (see CLAUDE.md "Categories are a fixed v1 list"). This check confirms each
// downstream file at least *mentions* every token in FIXED_CATEGORIES, so a
// half-added PR fails CI loudly. Match is a whole-word substring — enough to
// catch "forgot to add category X to file Y" without being fragile to
// formatting changes inside each file.
const CROSS_CHECK_FILES = [
  "references/categories.md",
  "references/home-workflow.md",
  "references/interview-workflow.md",
  "SKILL.md",
  "README.md",
  "scripts/statusline.sh",
];

const crossProblems: string[] = [];
for (const rel of CROSS_CHECK_FILES) {
  const fp = resolve(ROOT, rel);
  if (!existsSync(fp)) {
    crossProblems.push(`${rel}: file missing (expected for category cross-check)`);
    continue;
  }
  const content = readFileSync(fp, "utf8");
  for (const cat of FIXED_CATEGORIES) {
    const re = new RegExp(`\\b${cat}\\b`);
    if (!re.test(content)) {
      crossProblems.push(`${rel}: does not mention category '${cat}'`);
    }
  }
}

if (crossProblems.length > 0) fail(crossProblems);

console.log(
  `[OK] ${personaFiles.length} clone persona file(s) valid; ` +
    `${FIXED_CATEGORIES.size} categories referenced across ${CROSS_CHECK_FILES.length} files`,
);
