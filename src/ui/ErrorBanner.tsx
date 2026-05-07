import React from "react";
import { Box, Text } from "ink";
import { sanitizeTerminalText } from "../lib/terminal-safety.js";

export interface ErrorBannerProps {
  title: string;
  message: string;
  hint?: string;
}

export function ErrorBanner({ title, message, hint }: ErrorBannerProps): React.JSX.Element {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      marginBottom={1}
    >
      <Text color="yellow" bold>
        {`Error: ${sanitizeTerminalText(title)}`}
      </Text>
      <Text>{sanitizeTerminalText(message)}</Text>
      {hint ? (
        <Text color="gray" dimColor>
          {`↳ ${sanitizeTerminalText(hint)}`}
        </Text>
      ) : null}
    </Box>
  );
}
