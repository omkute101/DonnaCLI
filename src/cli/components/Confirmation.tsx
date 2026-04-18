/**
 * Confirmation Component
 *
 * Renders a Y/N confirmation prompt for dangerous operations.
 * Blocks the pipeline until the user responds.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmationProps {
  id: string;
  toolName: string;
  description: string;
  args: Record<string, unknown>;
  onResponse: (id: string, approved: boolean) => void;
}

export const Confirmation: React.FC<ConfirmationProps> = ({
  id,
  toolName,
  description,
  args,
  onResponse,
}) => {
  const [responded, setResponded] = useState(false);

  useInput((input, key) => {
    if (responded) return;

    if (input === 'y' || input === 'Y') {
      setResponded(true);
      onResponse(id, true);
    } else if (input === 'n' || input === 'N' || key.escape) {
      setResponded(true);
      onResponse(id, false);
    }
  });

  if (responded) return null;

  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      marginX={1}
      marginY={1}
      borderStyle="round"
      borderColor="#ffaa00"
    >
      <Box marginBottom={1}>
        <Text color="#ffaa00" bold>⚠️  Confirmation Required</Text>
      </Box>

      <Box marginBottom={1} paddingLeft={1}>
        <Text color="#e2e8f0">{String(description)}</Text>
      </Box>

      {toolName === 'run_command' && Boolean(args.command) && (
        <Box marginBottom={1} paddingLeft={1}>
          <Text color="#6b7280">Command: </Text>
          <Text color="#a855f7">{String(args.command)}</Text>
        </Box>
      )}

      <Box paddingLeft={1}>
        <Text color="#ffaa00">Allow? </Text>
        <Text color="#00ff88" bold>[Y]</Text>
        <Text color="#6b7280">es / </Text>
        <Text color="#ff3366" bold>[N]</Text>
        <Text color="#6b7280">o</Text>
      </Box>
    </Box>
  );
};
