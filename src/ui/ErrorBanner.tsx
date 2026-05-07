import React from "react";
import { Box, Text } from "ink";
import { sanitizeTerminalText } from "../lib/terminal-safety.js";

export interface ErrorBannerProps {
  title: string;
  message: string;
  hint?: string;
}

export function ErrorBanner({ title, message, hint }: ErrorBannerProps): React.JSX.Element {
  const safeTitle = sanitizeTerminalText(title);
  const safeMessage = sanitizeTerminalText(message);
  const safeHint = hint ? sanitizeTerminalText(hint) : undefined;
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      marginBottom={1}
    >
      <Text color="yellow" bold>
        {`⚠ ${safeTitle}`}
      </Text>
      <Text>{safeMessage}</Text>
      {safeHint ? (
        <Text color="gray" dimColor>
          {`↳ ${safeHint}`}
        </Text>
      ) : null}
    </Box>
  );
}
