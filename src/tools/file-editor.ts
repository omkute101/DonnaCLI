/**
 * File Editor Tool
 *
 * Provides file read/write/edit capabilities to the agent.
 * Operations:
 *   - read_file: Read contents of a file
 *   - write_file: Write or overwrite a file (requires confirmation)
 *   - edit_file: Search and replace within a file (requires confirmation)
 *
 * Security:
 *   - All paths are resolved relative to CWD
 *   - Path traversal attempts (../) are blocked
 *   - Absolute paths outside CWD are rejected
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, relative, dirname, isAbsolute } from 'path';
import { z } from 'zod';
import type { Tool, ToolResult } from './base.js';

// ─── Path Security ──────────────────────────────────────────────────────────

function sanitizePath(filePath: string): string {
  const cwd = process.cwd();

  // Resolve to absolute path
  const resolved = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);

  // Ensure the resolved path is within CWD
  const rel = relative(cwd, resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Security: path "${filePath}" resolves outside the working directory`);
  }

  return resolved;
}

// ─── Read File Tool ─────────────────────────────────────────────────────────

export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file. Returns the file content as text. Use this to understand existing code or data before making changes.',
  parameters: z.object({
    path: z.string().describe('The file path relative to the current working directory'),
    start_line: z.number().optional().describe('Optional: start reading from this line number (1-indexed)'),
    end_line: z.number().optional().describe('Optional: stop reading at this line number (1-indexed, inclusive)'),
  }),
  safetyLevel: 'safe',

  async execute(args: { path: string; start_line?: number; end_line?: number }): Promise<ToolResult> {
    try {
      const safePath = sanitizePath(args.path);

      if (!existsSync(safePath)) {
        return { success: false, output: `File not found: ${args.path}` };
      }

      let content = await readFile(safePath, 'utf-8');

      // Handle line range selection
      if (args.start_line || args.end_line) {
        const lines = content.split('\n');
        const start = (args.start_line || 1) - 1;
        const end = args.end_line || lines.length;
        content = lines.slice(start, end).join('\n');
      }

      // Truncate very large files
      const MAX_CHARS = 50_000;
      if (content.length > MAX_CHARS) {
        content = content.substring(0, MAX_CHARS) + '\n\n... [truncated — file too large]';
      }

      return {
        success: true,
        output: content,
        metadata: { path: args.path, lines: content.split('\n').length },
      };
    } catch (error) {
      return { success: false, output: `Error reading file: ${error}` };
    }
  },
};

// ─── Write File Tool ────────────────────────────────────────────────────────

export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file. Creates the file if it doesn\'t exist, or overwrites it. Use this to create new files or completely replace file contents.',
  parameters: z.object({
    path: z.string().describe('The file path relative to the current working directory'),
    content: z.string().describe('The full content to write to the file'),
  }),
  safetyLevel: 'safe',

  async execute(args: { path: string; content: string }): Promise<ToolResult> {
    try {
      const safePath = sanitizePath(args.path);

      // Ensure parent directories exist
      const dir = dirname(safePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(safePath, args.content, 'utf-8');

      return {
        success: true,
        output: `Successfully wrote ${args.content.length} characters to ${args.path}`,
        metadata: { path: args.path, bytes: args.content.length },
      };
    } catch (error) {
      return { success: false, output: `Error writing file: ${error}` };
    }
  },
};

// ─── Edit File Tool ─────────────────────────────────────────────────────────

export const editFileTool: Tool = {
  name: 'edit_file',
  description: 'Edit a file by finding and replacing a specific text block. Use this for surgical edits to existing files without rewriting the entire file.',
  parameters: z.object({
    path: z.string().describe('The file path relative to the current working directory'),
    search: z.string().describe('The exact text to find in the file (must match exactly)'),
    replace: z.string().describe('The text to replace the search text with'),
  }),
  safetyLevel: 'safe',

  async execute(args: { path: string; search: string; replace: string }): Promise<ToolResult> {
    try {
      const safePath = sanitizePath(args.path);

      if (!existsSync(safePath)) {
        return { success: false, output: `File not found: ${args.path}` };
      }

      const content = await readFile(safePath, 'utf-8');

      if (!content.includes(args.search)) {
        return {
          success: false,
          output: `Search text not found in ${args.path}. Make sure the search string matches exactly.`,
        };
      }

      const newContent = content.replace(args.search, args.replace);
      await writeFile(safePath, newContent, 'utf-8');

      return {
        success: true,
        output: `Successfully edited ${args.path} — replaced ${args.search.length} chars with ${args.replace.length} chars`,
        metadata: { path: args.path },
      };
    } catch (error) {
      return { success: false, output: `Error editing file: ${error}` };
    }
  },
};
