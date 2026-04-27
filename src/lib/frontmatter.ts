export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => part.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean);
  }
  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

export function parseMarkdownWithFrontmatter(text: string): ParsedMarkdown {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { frontmatter: {}, body: text };

  const end = lines.findIndex((line, idx) => idx > 0 && line.trim() === "---");
  if (end < 0) return { frontmatter: {}, body: text };

  const frontmatterLines = lines.slice(1, end);
  const body = lines.slice(end + 1).join("\n");
  const frontmatter: Record<string, unknown> = {};

  for (let i = 0; i < frontmatterLines.length; i++) {
    const line = frontmatterLines[i];
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;
    const [, key, rawValue] = keyValue;
    if (rawValue.trim() === "") {
      const values: string[] = [];
      while (frontmatterLines[i + 1]?.match(/^\s+-\s+/)) {
        i += 1;
        values.push(frontmatterLines[i].replace(/^\s+-\s+/, "").trim());
      }
      frontmatter[key] = values;
    } else {
      frontmatter[key] = parseScalar(rawValue);
    }
  }

  return { frontmatter, body };
}

export function stringField(frontmatter: Record<string, unknown>, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function stringListField(frontmatter: Record<string, unknown>, key: string): string[] {
  const value = frontmatter[key];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}
