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
