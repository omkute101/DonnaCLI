/**
 * Shell Command Executor Tool
 *
 * Runs shell commands in a child process with:
 * - Dangerous command blocklist
 * - Configurable timeout
 * - Output truncation
 * - Always requires user confirmation
 */

import { exec } from 'child_process';
import { z } from 'zod';
import type { Tool, ToolResult } from './base.js';
import { store } from '../config/store.js';

// ─── Dangerous Command Patterns ────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /\brm\s+(-rf?|--recursive)\s+[\/~]/i,  // rm -rf / or rm -rf ~
  /\bsudo\s+rm/i,                          // sudo rm
  /\bmkfs\b/i,                             // format filesystem
  /\bdd\s+if=/i,                           // dd (disk destroyer)
  /\b:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;:/,    // fork bomb
  /\bchmod\s+(-R\s+)?777\s+\//i,           // chmod 777 /
  /\bchown\s+-R.*\//i,                     // chown -R on root
  />\s*\/dev\/sd/i,                        // write to disk device
  /\bsudo\s+su\b/i,                        // sudo su
  /\bshutdown\b/i,                         // shutdown
  /\breboot\b/i,                           // reboot
  /\binit\s+[06]\b/i,                      // init 0 / init 6
];

function isDangerous(command: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return `Blocked dangerous command pattern: ${pattern.source}`;
    }
  }
  return null;
}

// ─── Shell Executor Tool ────────────────────────────────────────────────────

export const shellExecutorTool: Tool = {
  name: 'run_command',
  description: 'Execute a shell command and return its output. Use this for running build tools, git commands, listing files, installing packages, or any other terminal operations. The command runs in the current working directory.',
  parameters: z.object({
    command: z.string().describe('The shell command to execute'),
    cwd: z.string().optional().describe('Optional: working directory for the command (relative to project root)'),
  }),
  safetyLevel: 'requires_confirmation',

  async execute(args: { command: string; cwd?: string }): Promise<ToolResult> {
    // Check for blocked commands
    const dangerReason = isDangerous(args.command);
    if (dangerReason) {
      return {
        success: false,
        output: `🚫 Command blocked: ${dangerReason}\n\nThis command was classified as potentially destructive and has been prevented.`,
      };
    }

    const timeoutMs = (store.get('shellTimeout') || 30) * 1000;
    const MAX_OUTPUT = 20_000; // characters

    return new Promise((resolve) => {
      const child = exec(
        args.command,
        {
          cwd: args.cwd || process.cwd(),
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024, // 1MB
          env: { ...process.env, FORCE_COLOR: '0' }, // disable colors in output
        },
        (error, stdout, stderr) => {
          let output = '';

          if (stdout) output += stdout;
          if (stderr) output += (output ? '\n\n--- stderr ---\n' : '') + stderr;
          if (error && error.killed) {
            output += `\n\n⏱️ Command timed out after ${timeoutMs / 1000}s`;
          } else if (error) {
            output += `\n\n❌ Exit code: ${error.code || 'unknown'}`;
          }

          // Truncate long output
          if (output.length > MAX_OUTPUT) {
            output = output.substring(0, MAX_OUTPUT) + '\n\n... [output truncated]';
          }

          resolve({
            success: !error,
            output: output || '(no output)',
            metadata: {
              command: args.command,
              exitCode: error?.code || 0,
              timedOut: !!error?.killed,
            },
          });
        },
      );

      // Ensure cleanup
      child.unref?.();
    });
  },
};
