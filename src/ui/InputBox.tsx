import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { sanitizeTerminalText } from "../lib/terminal-safety.js";

export interface InputBoxProps {
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (text: string) => void;
  onAbort?: () => void;
}

export function InputBox({ disabled = false, placeholder = "type a message · /help for commands", onSubmit, onAbort }: InputBoxProps): React.JSX.Element {
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

  const showPlaceholder = !disabled && buffer.length === 0;

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={disabled ? "gray" : "magenta"} paddingX={1}>
        {disabled ? (
          <Box>
            <Text color="magenta"><Spinner type="dots" /></Text>
            <Text color="gray"> thinking…</Text>
          </Box>
        ) : (
          <Box>
            <Text color="magenta" bold>›</Text>
            <Text> </Text>
            {showPlaceholder ? (
              <Text color="gray">{sanitizeTerminalText(placeholder)}</Text>
            ) : (
              <Text>{sanitizeTerminalText(buffer)}<Text inverse>{" "}</Text></Text>
            )}
          </Box>
        )}
      </Box>
      <Box paddingX={1}>
        <Text color="gray" dimColor>
          enter to send · /help · /bye to exit · ctrl+c
        </Text>
      </Box>
    </Box>
  );
}
