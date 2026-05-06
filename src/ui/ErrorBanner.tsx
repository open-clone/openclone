import React from "react";
import { Box, Text } from "ink";

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
        {`⚠ ${title}`}
      </Text>
      <Text>{message}</Text>
      {hint ? (
        <Text color="gray" dimColor>
          {`↳ ${hint}`}
        </Text>
      ) : null}
    </Box>
  );
}
