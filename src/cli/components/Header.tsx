/**
 * Header Component
 *
 * Renders the Donna CLI header with logo and version info.
 * Uses the futuristic neon aesthetic from the design system.
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Text color="#00f0ff" bold>✦ DONNA</Text>
        <Text color="#6b7280"> — Voice AI Assistant</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box flexDirection="column">
        <Text color="#00f0ff">  ╔═══════════════════════════════════════╗</Text>
        <Text>
          <Text color="#00f0ff">  ║</Text>
          <Text color="#a855f7" bold>   ▓█████▄  ▒█████   ███▄    █  ███▄    █   █████▒</Text>
          <Text color="#00f0ff">║</Text>
        </Text>
        <Text>
          <Text color="#00f0ff">  ║</Text>
          <Text color="#a855f7" bold>   ▒██▀ ██▌▒██▒  ██▒ ██ ▀█   █  ██ ▀█   █  ▓██   ▒</Text>
          <Text color="#00f0ff">║</Text>
        </Text>
        <Text>
          <Text color="#00f0ff">  ║</Text>
          <Text color="#ff00ff" bold>   ░██   █▌▒██░  ██▒▓██  ▀█ ██▒▓██  ▀█ ██▒ ▒████ ░</Text>
          <Text color="#00f0ff">║</Text>
        </Text>
        <Text>
          <Text color="#00f0ff">  ║</Text>
          <Text color="#ff00ff" bold>   ░▓█▄   ▌▒██   ██░▓██▒  ▐▌██▒▓██▒  ▐▌██▒ ░▓█▒  ░</Text>
          <Text color="#00f0ff">║</Text>
        </Text>
        <Text>
          <Text color="#00f0ff">  ║</Text>
          <Text color="#00f0ff" bold>    ░▒████▓ ░ ████▓▒░▒██░   ▓██░▒██░   ▓██░ ░▒█░   </Text>
          <Text color="#00f0ff">║</Text>
        </Text>
        <Text color="#00f0ff">  ╚═══════════════════════════════════════╝</Text>
      </Box>
      <Text color="#6b7280">        Voice-First AI Developer Interface</Text>
    </Box>
  );
};
