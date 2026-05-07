const TERMINAL_CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/u;
const TERMINAL_TEXT_CONTROL_CHARS_GLOBAL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/gu;
const TERMINAL_HYPERLINK_PROTOCOLS = new Set(["http:", "https:", "file:"]);

export function safeTerminalHyperlinkHref(href: string): string | null {
  if (TERMINAL_CONTROL_CHARS.test(href)) return null;
  try {
    const url = new URL(href);
    if (!TERMINAL_HYPERLINK_PROTOCOLS.has(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function stripTerminalControlChars(text: string): string {
  return text.replace(TERMINAL_TEXT_CONTROL_CHARS_GLOBAL, "");
}

export function sanitizeTerminalText(text: string): string {
  return stripTerminalControlChars(text);
}

export function safeTerminalHyperlink(label: string, href: string): string | null {
  const safeLabel = sanitizeTerminalText(label);
  const safeHref = safeTerminalHyperlinkHref(href);
  if (!safeHref) return null;
  const esc = String.fromCharCode(0x1b);
  return `${esc}]8;;${safeHref}${esc}\\${safeLabel}${esc}]8;;${esc}\\`;
}

export function terminalSafeJsonStringify(value: unknown, space?: string | number): string {
  return JSON.stringify(value, null, space).replace(/[\u007f-\u009f]/gu, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
  });
}
