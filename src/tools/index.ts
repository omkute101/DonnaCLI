/**
 * Tools module — registers all built-in tools
 */

import { toolRegistry } from './registry.js';
import { readFileTool, writeFileTool, editFileTool } from './file-editor.js';
import { shellExecutorTool } from './shell-executor.js';

/**
 * Initialize all built-in tools. Call once at startup.
 */
export function registerBuiltinTools(): void {
  toolRegistry.register(readFileTool);
  toolRegistry.register(writeFileTool);
  toolRegistry.register(editFileTool);
  toolRegistry.register(shellExecutorTool);
}

export { toolRegistry } from './registry.js';
export type { Tool, ToolResult, SafetyLevel } from './base.js';
