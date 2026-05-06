import React from "react";
import { Box, Text } from "ink";
import { Marked, type Token, type Tokens } from "marked";

const lexer = new Marked({ gfm: true, breaks: false });

const HEADING_COLORS = ["magenta", "cyan", "yellow", "green", "blue", "red"] as const;

function inlineKey(parentKey: string, index: number): string {
  return `${parentKey}-i${index}`;
}

function renderInlineTokens(tokens: Token[] | undefined, parentKey: string): React.ReactNode {
  if (!tokens || tokens.length === 0) return null;
  return tokens.map((token, index) => renderInlineToken(token, inlineKey(parentKey, index)));
}

function renderInlineToken(token: Token, key: string): React.ReactNode {
  switch (token.type) {
    case "text": {
      const t = token as Tokens.Text;
      if (t.tokens && t.tokens.length > 0) {
        return <React.Fragment key={key}>{renderInlineTokens(t.tokens, key)}</React.Fragment>;
      }
      return <Text key={key}>{decodeEntities(t.text)}</Text>;
    }
    case "escape": {
      const t = token as Tokens.Escape;
      return <Text key={key}>{t.text}</Text>;
    }
    case "strong": {
      const t = token as Tokens.Strong;
      return (
        <Text key={key} bold color="yellow">
          {renderInlineTokens(t.tokens, key)}
        </Text>
      );
    }
    case "em": {
      const t = token as Tokens.Em;
      return (
        <Text key={key} italic color="cyan">
          {renderInlineTokens(t.tokens, key)}
        </Text>
      );
    }
    case "del": {
      const t = token as Tokens.Del;
      return (
        <Text key={key} strikethrough color="gray">
          {renderInlineTokens(t.tokens, key)}
        </Text>
      );
    }
    case "codespan": {
      const t = token as Tokens.Codespan;
      return (
        <Text key={key} color="greenBright" backgroundColor="gray">
          {` ${decodeEntities(t.text)} `}
        </Text>
      );
    }
    case "link": {
      const t = token as Tokens.Link;
      const visibleText = (t.text ?? "").trim();
      // Footnote-like citations (e.g. \[[1](<url>)\] -> visible text is just a
      // 1-2 digit number) render compact: no inline (URL) appendage. Wrap the
      // number in an OSC 8 hyperlink so terminals that support it keep the URL
      // clickable while terminals that don't just show plain "[1]".
      if (/^\d{1,2}$/.test(visibleText)) {
        const ESC = String.fromCharCode(0x1b);
        const OSC = `${ESC}]8;;`;
        const ST = `${ESC}\\`;
        return (
          <Text key={key} color="blueBright" underline>
            {`${OSC}${t.href}${ST}${visibleText}${OSC}${ST}`}
          </Text>
        );
      }
      return (
        <Text key={key} color="blueBright" underline>
          {renderInlineTokens(t.tokens, key)}
          <Text color="gray" dimColor>{` (${t.href})`}</Text>
        </Text>
      );
    }
    case "image": {
      const t = token as Tokens.Image;
      return (
        <Text key={key} color="gray" dimColor>
          {`[image: ${t.text || t.href}]`}
        </Text>
      );
    }
    case "br": {
      return <Text key={key}>{"\n"}</Text>;
    }
    default: {
      const fallback = (token as { raw?: string; text?: string }).raw
        ?? (token as { text?: string }).text
        ?? "";
      return <Text key={key}>{fallback}</Text>;
    }
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&nbsp;/gu, " ");
}

function renderHeading(token: Tokens.Heading, key: string): React.ReactNode {
  const colorIndex = Math.min(token.depth - 1, HEADING_COLORS.length - 1);
  const color = HEADING_COLORS[colorIndex];
  const isTopLevel = token.depth <= 2;
  return (
    <Box key={key} marginTop={1} marginBottom={1}>
      <Text color={color} bold underline={isTopLevel}>
        {renderInlineTokens(token.tokens, key)}
      </Text>
    </Box>
  );
}

function renderParagraph(token: Tokens.Paragraph, key: string): React.ReactNode {
  return (
    <Box key={key} marginBottom={1}>
      <Text>{renderInlineTokens(token.tokens, key)}</Text>
    </Box>
  );
}

function renderBlockquote(token: Tokens.Blockquote, key: string): React.ReactNode {
  return (
    <Box key={key} marginBottom={1} flexDirection="row">
      <Box marginRight={1}>
        <Text color="gray" dimColor>│</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {renderBlockTokens(token.tokens, key)}
      </Box>
    </Box>
  );
}

function renderList(token: Tokens.List, key: string): React.ReactNode {
  return (
    <Box key={key} flexDirection="column" marginBottom={1}>
      {token.items.map((item, index) => renderListItem(token, item, index, `${key}-li${index}`))}
    </Box>
  );
}

function renderListItem(parent: Tokens.List, item: Tokens.ListItem, index: number, key: string): React.ReactNode {
  const marker = parent.ordered
    ? `${(typeof parent.start === "number" ? parent.start : 1) + index}.`
    : "•";
  return (
    <Box key={key} flexDirection="row">
      <Box marginRight={1}>
        <Text color="cyan" bold>{marker}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {renderInlineOrBlockItem(item, key)}
      </Box>
    </Box>
  );
}

function renderInlineOrBlockItem(item: Tokens.ListItem, key: string): React.ReactNode {
  if (!item.tokens || item.tokens.length === 0) return null;
  const onlyInline = item.tokens.every((t) => isInlineToken(t));
  if (onlyInline) {
    return <Text key={key}>{renderInlineTokens(item.tokens, key)}</Text>;
  }
  return <>{renderBlockTokens(item.tokens, key)}</>;
}

function isInlineToken(token: Token): boolean {
  switch (token.type) {
    case "text":
    case "strong":
    case "em":
    case "del":
    case "codespan":
    case "link":
    case "image":
    case "escape":
    case "br":
      return true;
    default:
      return false;
  }
}

function renderCode(token: Tokens.Code, key: string): React.ReactNode {
  const lines = token.text.split("\n");
  return (
    <Box key={key} flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
      {token.lang ? (
        <Text color="gray" dimColor>{token.lang}</Text>
      ) : null}
      {lines.map((line, index) => (
        <Text key={`${key}-l${index}`} color="green">{line || " "}</Text>
      ))}
    </Box>
  );
}

function renderHr(key: string): React.ReactNode {
  return (
    <Box key={key} marginY={1}>
      <Text color="gray" dimColor>{"─".repeat(40)}</Text>
    </Box>
  );
}

function renderBlockTokens(tokens: Token[] | undefined, parentKey: string): React.ReactNode[] {
  if (!tokens) return [];
  return tokens.map((token, index) => renderBlockToken(token, `${parentKey}-b${index}`)).filter(Boolean) as React.ReactNode[];
}

function renderBlockToken(token: Token, key: string): React.ReactNode {
  switch (token.type) {
    case "heading":
      return renderHeading(token as Tokens.Heading, key);
    case "paragraph":
      return renderParagraph(token as Tokens.Paragraph, key);
    case "blockquote":
      return renderBlockquote(token as Tokens.Blockquote, key);
    case "list":
      return renderList(token as Tokens.List, key);
    case "code":
      return renderCode(token as Tokens.Code, key);
    case "hr":
      return renderHr(key);
    case "space":
      return null;
    case "html": {
      const t = token as Tokens.HTML;
      return (
        <Box key={key} marginBottom={1}>
          <Text color="gray" dimColor>{t.raw.trim()}</Text>
        </Box>
      );
    }
    default: {
      const t = token as { tokens?: Token[]; raw?: string; text?: string };
      if (t.tokens && t.tokens.length > 0) {
        return (
          <Box key={key} marginBottom={1}>
            <Text>{renderInlineTokens(t.tokens, key)}</Text>
          </Box>
        );
      }
      const text = t.raw ?? t.text ?? "";
      if (!text.trim()) return null;
      return (
        <Box key={key} marginBottom={1}>
          <Text>{text}</Text>
        </Box>
      );
    }
  }
}

export function Markdown({ text }: { text: string }): React.JSX.Element {
  if (!text) return <Text />;
  let tokens: Token[];
  try {
    tokens = lexer.lexer(text);
  } catch {
    return <Text>{text}</Text>;
  }
  return <Box flexDirection="column">{renderBlockTokens(tokens, "md")}</Box>;
}
