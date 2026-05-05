import { APICallError, LoadAPIKeyError } from "ai";

export interface NormalizedError {
  title: string;
  message: string;
  hint?: string;
}

const FORMATTED_MARKER = Symbol.for("openclone.formattedByCli");

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

export function normalizeError(error: unknown): NormalizedError {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    const titleSuffix = status ? ` (${status})` : "";
    return {
      title: `API 오류${titleSuffix}`,
      message: firstLine(error.message) || "알 수 없는 API 오류",
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
    return { title: "오류", message: firstLine(error.message) || error.name };
  }
  return { title: "오류", message: firstLine(String(error)) || "알 수 없는 오류" };
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
