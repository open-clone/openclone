import React from "react";
import { Box, Text } from "ink";
import { Markdown } from "./Markdown.js";
import { ErrorBanner } from "./ErrorBanner.js";

export type MessageItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; speakerLabel?: string }
  | { kind: "system"; text: string }
  | { kind: "system-banner"; text: string }
  | { kind: "error-block"; title: string; message: string; hint?: string };

export function MessageView({ item }: { item: MessageItem }): React.JSX.Element {
  if (item.kind === "user") {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="magenta" bold>you </Text>
          <Text color="gray" dimColor>›</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text>{item.text}</Text>
        </Box>
      </Box>
    );
  }
  if (item.kind === "assistant") {
    const speaker = item.speakerLabel ?? "clone";
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="cyan" bold>{speaker} </Text>
          <Text color="gray" dimColor>›</Text>
        </Box>
        <Box paddingLeft={2}>
          <Markdown text={item.text} />
        </Box>
      </Box>
    );
  }
  if (item.kind === "system-banner") {
    return (
      <Box marginBottom={1}>
        <Text color="yellow" dimColor>{item.text}</Text>
      </Box>
    );
  }
  if (item.kind === "error-block") {
    return <ErrorBanner title={item.title} message={item.message} hint={item.hint} />;
  }
  return (
    <Box>
      <Text color="gray" dimColor>{item.text}</Text>
    </Box>
  );
}
