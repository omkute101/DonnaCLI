/**
 * Tool Registry
 *
 * Central registry for all tools. Handles:
 * - Registration and lookup
 * - Zod → JSON Schema conversion for OpenAI function definitions
 * - Dynamic plugin loading
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool } from './base.js';
import type { ToolDefinition } from '../llm/provider.js';

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Convert all registered tools to OpenAI function definitions.
   * This is what gets sent to the LLM so it knows what tools are available.
   */
  getOpenAIDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => {
      // Convert Zod schema to JSON Schema
      const jsonSchema = zodToJsonSchema(tool.parameters, {
        // Strip $schema and other metadata that OpenAI doesn't want
        target: 'openAi',
      });

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: jsonSchema as Record<string, unknown>,
        },
      };
    });
  }

  /**
   * Dynamically load and register a tool plugin from a file path.
   * The module must default-export a Tool object.
   */
  async loadPlugin(path: string): Promise<void> {
    try {
      const module = await import(path);
      const tool: Tool = module.default;

      if (!tool.name || !tool.execute) {
        throw new Error(`Invalid tool plugin at ${path}: missing name or execute`);
      }

      this.register(tool);
    } catch (error) {
      throw new Error(`Failed to load tool plugin from ${path}: ${error}`);
    }
  }
}

// Singleton registry
export const toolRegistry = new ToolRegistry();
