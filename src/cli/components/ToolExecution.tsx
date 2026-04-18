/**
 * ToolExecution Component
 *
 * Displays tool execution status:
 * - Tool name and arguments (before execution)
 * - Spinner while running
 * - Output after completion (success/failure)
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from './Spinner.js';

interface ToolExecutionInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'executing' | 'success' | 'error';
  result?: string;
}

interface ToolExecutionProps {
  executions: ToolExecutionInfo[];
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({ executions }) => {
  if (executions.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      {executions.map((exec) => (
        <ToolItem key={exec.id} execution={exec} />
      ))}
    </Box>
  );
};

// ─── Single Tool Execution ──────────────────────────────────────────────────

const ToolItem: React.FC<{ execution: ToolExecutionInfo }> = ({ execution }) => {
  const icon = execution.name.includes('file') ? '📄' :
               execution.name.includes('command') ? '💻' : '🔧';

  // Format args for display
  const argsDisplay = formatArgs(execution.name, execution.args);

  return (
    <Box flexDirection="column" paddingLeft={1} marginBottom={0}>
      {/* Tool header */}
      <Box>
        {execution.status === 'executing' ? (
          <Spinner style="dots" color="#ffaa00" />
        ) : execution.status === 'success' ? (
          <Text color="#00ff88">✓</Text>
        ) : (
          <Text color="#ff3366">✗</Text>
        )}
        <Text> {icon} </Text>
        <Text color="#a855f7" bold>{execution.name}</Text>
        <Text color="#6b7280"> {argsDisplay}</Text>
      </Box>

      {/* Tool output (truncated) */}
      {execution.result && (
        <Box paddingLeft={3} marginTop={0}>
          <Text color={execution.status === 'error' ? '#ff3366' : '#6b7280'} wrap="truncate-end">
            {truncateOutput(execution.result)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatArgs(name: string, args: Record<string, unknown>): string {
  if (name === 'run_command') return `→ ${args.command}`;
  if (name === 'read_file') return `→ ${args.path}`;
  if (name === 'write_file') return `→ ${args.path}`;
  if (name === 'edit_file') return `→ ${args.path}`;
  return JSON.stringify(args).substring(0, 60);
}

function truncateOutput(output: string): string {
  const lines = output.split('\n');
  const maxLines = 5;
  if (lines.length <= maxLines) return output;
  return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
}

export type { ToolExecutionInfo };
