// Validate README translation set (issue #36):
//   1. Three README files exist at repo root: README.md (Korean canonical),
//      README_en.md (English), README_zh.md (Simplified Chinese).
//   2. Each file carries a language-picker line with the current language
//      bolded (not linked) and the other two linked with the correct relative
//      targets. This is the one-line contract the issue requires at the top.
//   3. Translated files each carry an HTML sync-comment header naming the
//      short commit SHA they were translated from — the plan's drift-signal
//      convention.
//   4. Translated files still reference every canonical clone (12 slugs today)
//      via `clones/<slug>/persona.md`. If the Korean source gains/loses rows
//      without the translations following, this check flips — that is the
//      cheapest drift detector available without adding a diff workflow.
//   5. The install one-liner is preserved verbatim across all three files.
//      It contains repo URL + sparse-checkout flags that must not drift
//      between languages.
//   6. README_zh.md carries the `REVIEW NEEDED` marker — until a native
//      zh-CN reviewer signs off, CI keeps flagging the file so nobody
//      quietly treats the MT draft as final.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");

const KO_PATH = resolve(ROOT, "README.md");
const EN_PATH = resolve(ROOT, "README_en.md");
const ZH_PATH = resolve(ROOT, "README_zh.md");

// Canonical install one-liner fragment that must appear verbatim in every
// language. Using a substring (not full line) so whitespace / line-wrap
// differences across translations don't trip the check — but the URL and
// the sparse-checkout flags are pinned.
const INSTALL_FRAGMENT =
  "git clone --filter=blob:none --sparse --depth=1";
const SPARSE_FRAGMENT =
  "git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'";

const REVIEW_MARKER = "REVIEW NEEDED";

function fail(msgs: string[]): never {
  for (const m of msgs) console.error(`[FAIL] ${m}`);
  process.exit(1);
}

function cloneSlugs(): string[] {
  const clonesDir = resolve(ROOT, "clones");
  if (!existsSync(clonesDir)) return [];
  return readdirSync(clonesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => existsSync(resolve(clonesDir, n, "persona.md")))
    .sort();
}

const problems: string[] = [];

for (const p of [KO_PATH, EN_PATH, ZH_PATH]) {
  if (!existsSync(p)) {
    problems.push(`${relative(ROOT, p)} missing at repo root`);
  }
}
if (problems.length > 0) fail(problems);

const ko = readFileSync(KO_PATH, "utf8");
const en = readFileSync(EN_PATH, "utf8");
const zh = readFileSync(ZH_PATH, "utf8");

interface PickerSpec {
  file: string;
  body: string;
  boldToken: string;
  linkPairs: Array<{ label: string; href: string }>;
}
const pickers: PickerSpec[] = [
  {
    file: "README.md",
    body: ko,
    boldToken: "**한국어**",
    linkPairs: [
      { label: "English", href: "README_en.md" },
      { label: "简体中文", href: "README_zh.md" },
    ],
  },
  {
    file: "README_en.md",
    body: en,
    boldToken: "**English**",
    linkPairs: [
      { label: "한국어", href: "README.md" },
      { label: "简体中文", href: "README_zh.md" },
    ],
  },
  {
    file: "README_zh.md",
    body: zh,
    boldToken: "**简体中文**",
    linkPairs: [
      { label: "한국어", href: "README.md" },
      { label: "English", href: "README_en.md" },
    ],
  },
];

const HEAD_WINDOW_LINES = 40;

for (const p of pickers) {
  const head = p.body.split("\n").slice(0, HEAD_WINDOW_LINES).join("\n");
  if (!head.includes(p.boldToken)) {
    problems.push(
      `${p.file}: language picker must bold current language ('${p.boldToken}') in the first 40 lines`,
    );
  }
  for (const lp of p.linkPairs) {
    const mdLink = `[${lp.label}](${lp.href})`;
    if (!head.includes(mdLink)) {
      problems.push(
        `${p.file}: language picker must contain link '${mdLink}' in the first 40 lines`,
      );
    }
  }
}

const syncRe =
  /<!--[\s\S]*?synced[\s\S]*?([0-9a-f]{7,40})[\s\S]*?-->/i;
for (const { file, body } of [
  { file: "README_en.md", body: en },
  { file: "README_zh.md", body: zh },
]) {
  const head = body.split("\n").slice(0, HEAD_WINDOW_LINES).join("\n");
  if (!syncRe.test(head)) {
    problems.push(
      `${file}: missing sync-comment header in first 40 lines (expected an HTML comment mentioning 'synced' with a 7+ hex-char commit SHA)`,
    );
  }
}

const slugs = cloneSlugs();
if (slugs.length === 0) {
  problems.push("clones/ directory empty or missing persona.md files");
} else {
  for (const { file, body } of [
    { file: "README.md", body: ko },
    { file: "README_en.md", body: en },
    { file: "README_zh.md", body: zh },
  ]) {
    const missing: string[] = [];
    for (const slug of slugs) {
      const ref = `clones/${slug}/persona.md`;
      if (!body.includes(ref)) missing.push(slug);
    }
    if (missing.length > 0) {
      problems.push(
        `${file}: missing clones/<slug>/persona.md link(s) for: ${missing.join(", ")}`,
      );
    }
  }
}

for (const { file, body } of [
  { file: "README.md", body: ko },
  { file: "README_en.md", body: en },
  { file: "README_zh.md", body: zh },
]) {
  if (!body.includes(INSTALL_FRAGMENT)) {
    problems.push(
      `${file}: install one-liner fragment missing ('${INSTALL_FRAGMENT}')`,
    );
  }
  if (!body.includes(SPARSE_FRAGMENT)) {
    problems.push(
      `${file}: sparse-checkout fragment missing ('${SPARSE_FRAGMENT}')`,
    );
  }
}

if (!zh.includes(REVIEW_MARKER)) {
  problems.push(
    `README_zh.md: missing '${REVIEW_MARKER}' marker — zh-CN translation needs a native reviewer before this line is removed`,
  );
}

if (problems.length > 0) fail(problems);
console.log(
  `[OK] README i18n: 3 files, ${slugs.length} clone row(s) cross-referenced, picker + sync headers + install fragments verified`,
);
