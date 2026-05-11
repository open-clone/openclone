import { APICallError, LoadAPIKeyError } from "ai";

export interface NormalizedError {
  title: string;
  message: string;
  hint?: string;
}

const FORMATTED_MARKER = Symbol.for("openclone.formattedByCli");
const OBJECT_OBJECT_PATTERN = /\[object Object\]/;

export function markErrorFormatted(value: unknown): void {
  if (value && typeof value === "object") {
    (value as Record<symbol, unknown>)[FORMATTED_MARKER] = true;
  }
}

export function isErrorFormatted(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as Record<symbol, unknown>)[FORMATTED_MARKER]);
}

function statusHint(statusCode: number | undefined): string | undefined {
  if (statusCode === undefined) return undefined;
  if (statusCode === 401 || statusCode === 403) {
    return "API 키를 확인하세요 (OPENCLONE_API_KEY / OPENAI_API_KEY)";
  }
  if (statusCode === 402) return "API 결제/잔액을 확인하세요";
  if (statusCode === 408 || statusCode === 429) return "잠시 후 다시 시도하세요";
  if (statusCode >= 500 && statusCode < 600) return "API 서버 일시 오류 — 잠시 후 다시 시도";
  return undefined;
}

function firstLine(text: string): string {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  return newline === -1 ? trimmed : trimmed.slice(0, newline).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function cleanMessage(value: string | undefined): string | undefined {
  const text = firstLine(value ?? "");
  if (!text || OBJECT_OBJECT_PATTERN.test(text)) return undefined;
  return text;
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function stringifyFallback(value: unknown): string | undefined {
  if (!isRecord(value) && !Array.isArray(value)) return undefined;
  try {
    const text = JSON.stringify(value);
    if (!text || text === "{}" || text === "[]") return undefined;
    return text.length > 500 ? `${text.slice(0, 500)}...` : text;
  } catch {
    return undefined;
  }
}

function structuredMessage(value: unknown, seen = new WeakSet<object>()): string | undefined {
  if (typeof value === "string") {
    const parsed = parseJsonString(value);
    if (parsed !== undefined) return structuredMessage(parsed, seen) ?? cleanMessage(value);
    return cleanMessage(value);
  }
  if (!isRecord(value)) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (value instanceof Error) {
    const ownMessage = cleanMessage(value.message);
    if (ownMessage) return ownMessage;
  }

  for (const key of ["message", "error", "detail", "details", "reason", "cause", "data", "responseBody"]) {
    const nested = value[key];
    const message = structuredMessage(nested, seen);
    if (message) return message;
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => structuredMessage(item, seen)).filter((item): item is string => Boolean(item));
    if (parts.length) return parts.join("; ");
  }

  return stringifyFallback(value);
}

function apiCallMessage(error: APICallError): string {
  const direct = cleanMessage(error.message);

  const record = error as unknown as Record<string, unknown>;
  for (const key of ["data", "responseBody", "cause"]) {
    const message = structuredMessage(record[key]);
    if (message && (!direct || direct === "Bad Request" || direct === "Unauthorized" || direct === "Forbidden")) {
      return message;
    }
  }

  return direct ?? "알 수 없는 API 오류";
}

export function normalizeError(error: unknown): NormalizedError {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    const titleSuffix = status ? ` (${status})` : "";
    return {
      title: `API 오류${titleSuffix}`,
      message: apiCallMessage(error),
      hint: statusHint(status),
    };
  }
  if (LoadAPIKeyError.isInstance(error)) {
    return {
      title: "API 키 오류",
      message: firstLine(error.message) || "API 키를 불러오지 못했습니다",
      hint: "OPENCLONE_API_KEY 또는 OPENAI_API_KEY 환경변수를 설정하거나 --api-key 플래그로 전달하세요",
    };
  }
  if (error instanceof Error) {
    return { title: "오류", message: structuredMessage(error) ?? error.name };
  }
  return { title: "오류", message: structuredMessage(error) ?? (firstLine(String(error)) || "알 수 없는 오류") };
}

const ANSI = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function visibleLength(text: string): number {
  return [...text].length;
}

function clampWidth(width: number | undefined): number {
  const fallback = 60;
  const value = typeof width === "number" && width > 0 ? width : fallback;
  if (value < 40) return 40;
  if (value > 80) return 80;
  return value;
}

export interface FormatBlockOptions {
  color?: boolean;
  width?: number;
}

export function formatErrorBlock(error: unknown, options: FormatBlockOptions = {}): string {
  const normalized = normalizeError(error);
  const useColor = options.color ?? false;
  const width = clampWidth(options.width);
  const paint = (code: string, text: string) => (useColor ? `${code}${text}${ANSI.reset}` : text);

  const titleText = `⚠ ${normalized.title}`;
  const titleLine = (() => {
    const dashesEach = Math.max(3, Math.floor((width - visibleLength(titleText) - 2) / 2));
    const left = "─".repeat(dashesEach);
    const remaining = width - visibleLength(titleText) - 2 - dashesEach;
    const right = "─".repeat(Math.max(3, remaining));
    return paint(`${ANSI.yellow}${ANSI.bold}`, `${left} ${titleText} ${right}`);
  })();
  const messageLine = `  ${normalized.message}`;
  const hintLine = normalized.hint ? paint(ANSI.dim, `  ↳ ${normalized.hint}`) : undefined;
  const closeLine = paint(ANSI.yellow, "─".repeat(width));

  const lines = [titleLine, messageLine];
  if (hintLine) lines.push(hintLine);
  lines.push(closeLine);
  return lines.join("\n");
}
