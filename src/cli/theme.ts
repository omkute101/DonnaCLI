/**
 * Donna CLI Design System
 *
 * Futuristic AI terminal aesthetic:
 * - Neon cyan/blue primary
 * - Purple/magenta accents
 * - Near-black background
 * - Consistent emoji prefixes for each state
 * - Clean spacing and visual hierarchy
 */

import chalk from 'chalk';

// ─── Color Palette ──────────────────────────────────────────────────────────

export const colors = {
  // Primary — Neon Cyan
  primary: chalk.hex('#00f0ff'),
  primaryBold: chalk.hex('#00f0ff').bold,
  primaryDim: chalk.hex('#00a8b3'),

  // Secondary — Purple / Magenta
  secondary: chalk.hex('#a855f7'),
  secondaryBold: chalk.hex('#a855f7').bold,
  accent: chalk.hex('#ff00ff'),
  accentDim: chalk.hex('#b347b3'),

  // Semantic
  success: chalk.hex('#00ff88'),
  error: chalk.hex('#ff3366'),
  warning: chalk.hex('#ffaa00'),

  // Neutral
  text: chalk.hex('#e2e8f0'),
  textDim: chalk.hex('#6b7280'),
  textMuted: chalk.hex('#4b5563'),
  label: chalk.hex('#94a3b8'),

  // Special
  highlight: chalk.hex('#00f0ff').bgHex('#0a1628'),
  codeBlock: chalk.hex('#e2e8f0').bgHex('#1e293b'),
  border: chalk.hex('#1e3a5f'),
} as const;

// ─── Status Prefixes ────────────────────────────────────────────────────────

export const prefix = {
  listening: '🎙️ ',
  thinking: '🤔',
  brain: '🧠',
  action: '⚡',
  success: '✅',
  error: '❌',
  warning: '⚠️ ',
  tool: '🔧',
  file: '📄',
  shell: '💻',
  voice: '🔊',
  info: '💡',
  donna: '✦ ',
} as const;

// ─── Box Characters ─────────────────────────────────────────────────────────

export const box = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
  dot: '·',
  arrow: '→',
  bar: '▌',
  thinBar: '▏',
} as const;

// ─── ASCII Art Logo ─────────────────────────────────────────────────────────

export const LOGO = `
${chalk.hex('#00f0ff')('  ╔═══════════════════════════════════════╗')}
${chalk.hex('#00f0ff')('  ║')} ${chalk.hex('#a855f7').bold('   ▓█████▄  ▒█████   ███▄    █  ███▄    █   █████▒')}${chalk.hex('#00f0ff')('║')}
${chalk.hex('#00f0ff')('  ║')} ${chalk.hex('#a855f7').bold('   ▒██▀ ██▌▒██▒  ██▒ ██ ▀█   █  ██ ▀█   █  ▓██   ▒')}${chalk.hex('#00f0ff')('║')}
${chalk.hex('#00f0ff')('  ║')} ${chalk.hex('#ff00ff').bold('   ░██   █▌▒██░  ██▒▓██  ▀█ ██▒▓██  ▀█ ██▒ ▒████ ░')}${chalk.hex('#00f0ff')('║')}
${chalk.hex('#00f0ff')('  ║')} ${chalk.hex('#ff00ff').bold('   ░▓█▄   ▌▒██   ██░▓██▒  ▐▌██▒▓██▒  ▐▌██▒ ░▓█▒  ░')}${chalk.hex('#00f0ff')('║')}
${chalk.hex('#00f0ff')('  ║')} ${chalk.hex('#00f0ff').bold('    ░▒████▓ ░ ████▓▒░▒██░   ▓██░▒██░   ▓██░ ░▒█░   ')}${chalk.hex('#00f0ff')('║')}
${chalk.hex('#00f0ff')('  ╚═══════════════════════════════════════╝')}
${chalk.hex('#6b7280')('        Voice-First AI Developer Interface')}
`;

export const LOGO_COMPACT = `${chalk.hex('#00f0ff').bold('✦ DONNA')} ${chalk.hex('#6b7280')('— Voice AI Assistant')}`;

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Create a horizontal divider
 */
export function divider(width: number = 50): string {
  return colors.border(box.horizontal.repeat(width));
}

/**
 * Create a labeled section header
 */
export function sectionHeader(label: string): string {
  const line = box.horizontal.repeat(3);
  return `${colors.border(line)} ${colors.label(label)} ${colors.border(line)}`;
}

/**
 * Format a status message with prefix
 */
export function status(
  prefixKey: keyof typeof prefix,
  message: string,
  color: keyof typeof colors = 'text',
): string {
  return `${prefix[prefixKey]} ${(colors[color] as any)(message)}`;
}

/**
 * Animated dots string for loading states
 */
export function dots(frame: number): string {
  const patterns = ['   ', '.  ', '.. ', '...', ' ..', '  .'];
  return colors.primaryDim(patterns[frame % patterns.length]);
}

/**
 * Format tool execution display
 */
export function toolLabel(name: string): string {
  const icon = name.includes('file') ? prefix.file :
               name.includes('command') || name.includes('shell') ? prefix.shell :
               prefix.tool;
  return `${icon} ${colors.secondaryBold(name)}`;
}
