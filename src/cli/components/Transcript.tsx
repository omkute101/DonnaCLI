/**
 * Transcript Component
 *
 * Displays live speech transcription with visual distinction between:
 * - Partial transcript (dim, updating in real-time)
 * - Committed transcript (bright, finalized)
 */

import React from 'react';
import { Box, Text } from 'ink';

interface TranscriptProps {
  partial: string;
  committed: string;
  visible: boolean;
}

export const Transcript: React.FC<TranscriptProps> = ({
  partial,
  committed,
  visible,
}) => {
  if (!visible && !partial && !committed) return null;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      {/* Section header */}
      <Box marginBottom={0}>
        <Text color="#1e3a5f">───</Text>
        <Text color="#94a3b8"> You </Text>
        <Text color="#1e3a5f">───</Text>
      </Box>

      {/* Committed (final) text */}
      {committed && (
        <Box paddingLeft={1}>
          <Text color="#e2e8f0">{committed}</Text>
        </Box>
      )}

      {/* Partial (live) text */}
      {partial && (
        <Box paddingLeft={1}>
          <Text color="#6b7280" italic>{partial}</Text>
          <Text color="#00f0ff">▌</Text>
        </Box>
      )}
    </Box>
  );
};
