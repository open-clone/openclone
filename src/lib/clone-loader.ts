import { access, readdir, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseMarkdownWithFrontmatter, stringField, stringListField } from "./frontmatter.js";
import { opencloneHome, repoRoot } from "./paths.js";
import { assertValidSlug, isValidSlug } from "./slug.js";

export type CloneOrigin = "user" | "built-in";

export interface ClonePersona {
  slug: string;
  origin: CloneOrigin;
  personaPath: string;
  userKnowledgeDir: string;
  builtinKnowledgeDir: string;
  raw: string;
  frontmatter: Record<string, unknown>;
  body: string;
  displayName: string;
  tagline: string;
  categories: string[];
  primaryCategory?: string;
}

export interface KnowledgeFile {
  path: string;
  origin: CloneOrigin;
  raw: string;
  frontmatter: Record<string, unknown>;
  body: string;
  topic?: string;
  sourceUrl?: string;
  sourcePath?: string;
  publishedAt?: string;
  fetched?: string;
  dateKey: string;
}

export interface CloneLoaderOptions {
  rootDir?: string;
  opencloneDir?: string;
  env?: NodeJS.ProcessEnv;
  lazyFetchBuiltInKnowledge?: boolean;
}

export interface LoadedClone extends ClonePersona {
  knowledge: KnowledgeFile[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function dateKeyFromPath(path: string): string {
  const match = basename(path).match(/^(\d{4}-\d{2}-\d{2})-/);
  return match?.[1] ?? "0000-00-00";
}

function uniqueByPath<T extends { path: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

export class CloneLoader {
  readonly rootDir: string;
  readonly opencloneDir: string;
  readonly lazyFetchBuiltInKnowledge: boolean;

  constructor(options: CloneLoaderOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? repoRoot());
    this.opencloneDir = resolve(options.opencloneDir ?? opencloneHome(options.env));
    this.lazyFetchBuiltInKnowledge = options.lazyFetchBuiltInKnowledge ?? true;
  }

  userCloneDir(slug: string): string {
    return join(this.opencloneDir, "clones", slug);
  }

  builtinCloneDir(slug: string): string {
    return join(this.rootDir, "clones", slug);
  }

  async resolvePersona(slug: string): Promise<ClonePersona | undefined> {
    assertValidSlug(slug);
    const userDir = this.userCloneDir(slug);
    const builtinDir = this.builtinCloneDir(slug);
    const userPersona = join(userDir, "persona.md");
    const builtinPersona = join(builtinDir, "persona.md");

    if (await exists(userPersona)) {
      return this.readPersona(slug, "user", userPersona, join(userDir, "knowledge"), join(builtinDir, "knowledge"));
    }
    if (await exists(builtinPersona)) {
      if (this.lazyFetchBuiltInKnowledge) this.tryFetchBuiltInKnowledge(slug);
      return this.readPersona(slug, "built-in", builtinPersona, join(userDir, "knowledge"), join(builtinDir, "knowledge"));
    }
    return undefined;
  }

  async loadClone(slug: string): Promise<LoadedClone> {
    const persona = await this.resolvePersona(slug);
    if (!persona) throw new Error(`Clone not found: ${slug}`);
    const knowledge = await this.loadKnowledge(persona);
    return { ...persona, knowledge };
  }

  async listClones(): Promise<ClonePersona[]> {
    const slugs = new Set<string>();
    await this.addCloneSlugs(join(this.rootDir, "clones"), slugs);
    await this.addCloneSlugs(join(this.opencloneDir, "clones"), slugs);
    const clones: ClonePersona[] = [];
    for (const slug of [...slugs].sort()) {
      const persona = await this.resolvePersona(slug);
      if (persona) clones.push(persona);
    }
    return clones;
  }

  private async addCloneSlugs(dir: string, slugs: Set<string>): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!isValidSlug(entry)) continue;
      if (await exists(join(dir, entry, "persona.md"))) slugs.add(entry);
    }
  }

  private async readPersona(
    slug: string,
    origin: CloneOrigin,
    personaPath: string,
    userKnowledgeDir: string,
    builtinKnowledgeDir: string,
  ): Promise<ClonePersona> {
    const raw = await readFile(personaPath, "utf8");
    const parsed = parseMarkdownWithFrontmatter(raw);
    const displayName = stringField(parsed.frontmatter, "display_name") ?? slug;
    const tagline = stringField(parsed.frontmatter, "tagline") ?? "";
    const categories = stringListField(parsed.frontmatter, "categories");
    const primaryCategory = stringField(parsed.frontmatter, "primary_category") ?? categories[0];
    return {
      slug,
      origin,
      personaPath,
      userKnowledgeDir,
      builtinKnowledgeDir,
      raw,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      displayName,
      tagline,
      categories,
      primaryCategory,
    };
  }

  async loadKnowledge(persona: ClonePersona): Promise<KnowledgeFile[]> {
    const files = [
      ...(await this.readKnowledgeDir(persona.userKnowledgeDir, "user")),
      ...(await this.readKnowledgeDir(persona.builtinKnowledgeDir, "built-in")),
    ];
    return uniqueByPath(files).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }

  private async readKnowledgeDir(dir: string, origin: CloneOrigin): Promise<KnowledgeFile[]> {
    let entries: string[];
    try {
      const st = await stat(dir);
      if (!st.isDirectory()) return [];
      entries = await readdir(dir);
    } catch {
      return [];
    }

    const files: KnowledgeFile[] = [];
    for (const entry of entries.sort()) {
      if (!entry.endsWith(".md")) continue;
      const path = join(dir, entry);
      const raw = await readFile(path, "utf8");
      const parsed = parseMarkdownWithFrontmatter(raw);
      files.push({
        path,
        origin,
        raw,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        topic: stringField(parsed.frontmatter, "topic"),
        sourceUrl: stringField(parsed.frontmatter, "source_url"),
        sourcePath: stringField(parsed.frontmatter, "source_path"),
        publishedAt: stringField(parsed.frontmatter, "published_at"),
        fetched: stringField(parsed.frontmatter, "fetched"),
        dateKey: stringField(parsed.frontmatter, "published_at") ?? dateKeyFromPath(path),
      });
    }
    return files;
  }

  private tryFetchBuiltInKnowledge(slug: string): void {
    const script = join(this.rootDir, "scripts", "fetch-clone-knowledge.sh");
    const result = spawnSync("bash", [script, slug], { cwd: this.rootDir, stdio: "ignore" });
    if (result.error) return;
  }
}
