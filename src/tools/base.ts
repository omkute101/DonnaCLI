/**
 * Base Tool Interface
 *
 * All tools must implement this interface. It defines the contract for:
 * - Name and description (used by the LLM to decide which tool to call)
 * - Parameter schema (validated with Zod, converted to JSON Schema for OpenAI)
 * - Safety level (controls whether confirmation is required)
 * - Execution logic
 */

import { z } from 'zod';

// ─── Safety Levels ──────────────────────────────────────────────────────────

export type SafetyLevel =
  | 'safe'                   // No confirmation needed (e.g., read_file)
  | 'requires_confirmation'  // User must approve (e.g., write_file, shell)
  | 'dangerous';             // Blocked by default (e.g., rm -rf)

// ─── Tool Result ────────────────────────────────────────────────────────────

export interface ToolResult {
  success: boolean;
  output: string;
  /** Optional metadata (e.g., file path, command exit code) */
  metadata?: Record<string, unknown>;
}

// ─── Tool Interface ─────────────────────────────────────────────────────────

export interface Tool {
  /** Unique tool name (used in LLM function calling) */
  name: string;

  /** Human-readable description (sent to LLM) */
  description: string;

  /** Zod schema for parameter validation */
  parameters: z.ZodType<any>;

  /** Safety classification */
  safetyLevel: SafetyLevel;

  /**
   * Execute the tool with validated arguments.
   * @param args - Validated arguments matching the parameters schema
   * @returns Tool execution result
   */
  execute(args: any): Promise<ToolResult>;
}
