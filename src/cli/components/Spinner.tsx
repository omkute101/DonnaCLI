/**
 * Spinner Component
 *
 * Custom animated spinner with multiple styles.
 * Uses Ink's useEffect for frame-by-frame animation.
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

// ─── Spinner Frames ─────────────────────────────────────────────────────────

const SPINNER_STYLES = {
  dots: {
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interval: 80,
  },
  pulse: {
    frames: ['◉', '◎', '○', '◎'],
    interval: 200,
  },
  wave: {
    frames: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
    interval: 100,
  },
  brain: {
    frames: ['🧠', '💭', '💡', '✨', '💡', '💭'],
    interval: 300,
  },
  listening: {
    frames: ['◉ ○ ○', '○ ◉ ○', '○ ○ ◉', '○ ◉ ○'],
    interval: 250,
  },
  bars: {
    frames: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█', '▉', '▊', '▋', '▌', '▍', '▎'],
    interval: 80,
  },
} as const;

type SpinnerStyle = keyof typeof SPINNER_STYLES;

// ─── Component ──────────────────────────────────────────────────────────────

interface SpinnerProps {
  style?: SpinnerStyle;
  color?: string;
  label?: string;
  labelColor?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  style = 'dots',
  color = '#00f0ff',
  label,
  labelColor = '#6b7280',
}) => {
  const [frame, setFrame] = useState(0);
  const spinnerDef = SPINNER_STYLES[style];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % spinnerDef.frames.length);
    }, spinnerDef.interval);

    return () => clearInterval(timer);
  }, [spinnerDef]);

  return (
    <Text>
      <Text color={color}>{spinnerDef.frames[frame]}</Text>
      {label && <Text color={labelColor}> {label}</Text>}
    </Text>
  );
};

// ─── Animated Dots ──────────────────────────────────────────────────────────

interface AnimatedDotsProps {
  color?: string;
}

export const AnimatedDots: React.FC<AnimatedDotsProps> = ({ color = '#00f0ff' }) => {
  const [frame, setFrame] = useState(0);
  const patterns = ['   ', '.  ', '.. ', '...'];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % patterns.length);
    }, 400);

    return () => clearInterval(timer);
  }, []);

  return <Text color={color}>{patterns[frame]}</Text>;
};
