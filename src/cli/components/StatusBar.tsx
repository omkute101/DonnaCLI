/**
 * StatusBar Component
 *
 * Shows the current pipeline state with animated indicators.
 * Shows: listening, thinking, executing, responding, idle
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Spinner, AnimatedDots } from './Spinner.js';
import type { SessionState } from '../../pipeline/events.js';

interface StatusBarProps {
  state: SessionState;
  detail?: string;
}

const STATE_CONFIG: Record<SessionState, {
  icon: string;
  label: string;
  color: string;
  spinnerStyle?: 'dots' | 'pulse' | 'wave' | 'brain' | 'listening' | 'bars';
}> = {
  idle: {
    icon: '●',
    label: 'Ready',
    color: '#6b7280',
  },
  listening: {
    icon: '🎙️',
    label: 'Listening',
    color: '#00ff88',
    spinnerStyle: 'listening',
  },
  processing: {
    icon: '⚡',
    label: 'Processing',
    color: '#ffaa00',
    spinnerStyle: 'dots',
  },
  thinking: {
    icon: '🤔',
    label: 'Thinking',
    color: '#a855f7',
    spinnerStyle: 'brain',
  },
  tool_executing: {
    icon: '🔧',
    label: 'Executing',
    color: '#ffaa00',
    spinnerStyle: 'dots',
  },
  responding: {
    icon: '🧠',
    label: 'Responding',
    color: '#00f0ff',
    spinnerStyle: 'pulse',
  },
  speaking: {
    icon: '🔊',
    label: 'Speaking',
    color: '#00f0ff',
    spinnerStyle: 'bars',
  },
  error: {
    icon: '❌',
    label: 'Error',
    color: '#ff3366',
  },
};

export const StatusBar: React.FC<StatusBarProps> = ({ state, detail }) => {
  const config = STATE_CONFIG[state];

  return (
    <Box paddingX={1} paddingY={0}>
      <Box marginRight={1}>
        {config.spinnerStyle ? (
          <Spinner style={config.spinnerStyle} color={config.color} />
        ) : (
          <Text color={config.color}>{config.icon}</Text>
        )}
      </Box>
      <Text color={config.color} bold>{config.label}</Text>
      {detail && (
        <Text color="#6b7280"> {detail}</Text>
      )}
      {(state === 'thinking' || state === 'processing') && (
        <AnimatedDots color={config.color} />
      )}
    </Box>
  );
};
