/**
 * Response Component
 *
 * Displays streaming LLM response with:
 * - Character-by-character appearance
 * - Markdown-lite formatting (code blocks, bold)
 * - Scrolling cursor indicator
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ResponseProps {
  content: string;
  isStreaming: boolean;
}

export const Response: React.FC<ResponseProps> = ({ content, isStreaming }) => {
  if (!content) return null;

  // Simple markdown-lite rendering
  const lines = content.split('\n');

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      {/* Section header */}
      <Box marginBottom={0}>
        <Text color="#1e3a5f">───</Text>
        <Text color="#94a3b8"> 🧠 Donna </Text>
        <Text color="#1e3a5f">───</Text>
      </Box>

      {/* Response content */}
      <Box flexDirection="column" paddingLeft={1}>
        {lines.map((line, i) => (
          <ResponseLine key={i} line={line} />
        ))}
      </Box>

      {/* Streaming cursor */}
      {isStreaming && (
        <Box paddingLeft={1}>
          <Text color="#00f0ff">▌</Text>
        </Box>
      )}
    </Box>
  );
};

// ─── Line Renderer ──────────────────────────────────────────────────────────

const ResponseLine: React.FC<{ line: string }> = ({ line }) => {
  // Code block line (starts with ```)
  if (line.startsWith('```')) {
    return <Text color="#6b7280">{line}</Text>;
  }

  // Indented code (4 spaces or tab)
  if (line.startsWith('    ') || line.startsWith('\t')) {
    return <Text color="#e2e8f0" backgroundColor="#1e293b"> {line} </Text>;
  }

  // Heading
  if (line.startsWith('# ')) {
    return <Text color="#a855f7" bold>{line.slice(2)}</Text>;
  }
  if (line.startsWith('## ')) {
    return <Text color="#a855f7">{line.slice(3)}</Text>;
  }

  // Bullet point
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <Text>
        <Text color="#00f0ff">  • </Text>
        <Text color="#e2e8f0">{line.slice(2)}</Text>
      </Text>
    );
  }

  // Empty line
  if (!line.trim()) {
    return <Text> </Text>;
  }

  // Regular text with inline formatting
  return <FormattedText text={line} />;
};

// ─── Inline Formatting ──────────────────────────────────────────────────────

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Simple inline code detection: `code`
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <Text>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={i} color="#00f0ff" backgroundColor="#0a1628">
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={i} color="#e2e8f0">{part}</Text>;
      })}
    </Text>
  );
};
