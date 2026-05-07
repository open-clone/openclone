import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { sanitizeTerminalText } from "../lib/terminal-safety.js";

export interface PromptInputProps {
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onAbort?: () => void;
}

export function PromptInput({ disabled = false, onSubmit, onAbort }: PromptInputProps): React.JSX.Element {
  const [buffer, setBuffer] = useState<string>("");

  useInput((input, key) => {
    if (disabled) return;
    if (key.ctrl && input === "c") {
      onAbort?.();
      return;
    }
    if (key.return) {
      const value = buffer;
      setBuffer("");
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      setBuffer((previous) => previous.slice(0, -1));
      return;
    }
    if (key.escape || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || key.tab) {
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      const newlineIndex = input.search(/[\r\n]/u);
      if (newlineIndex === -1) {
        setBuffer((previous) => previous + input);
        return;
      }
      const prefix = input.slice(0, newlineIndex);
      const rest = input.slice(newlineIndex + 1).replace(/^\n/u, "");
      const valueToSubmit = buffer + prefix;
      setBuffer(rest);
      onSubmit(valueToSubmit);
    }
  });

  return (
    <Box>
      <Text color={disabled ? "gray" : undefined}>{">>> "}</Text>
      <Text>{sanitizeTerminalText(buffer)}</Text>
    </Box>
  );
}
