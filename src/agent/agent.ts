/**
 * Agent — Core Agent Loop
 *
 * The brain of Donna. Orchestrates:
 * 1. Receiving user text (from STT)
 * 2. Streaming to LLM with tool definitions
 * 3. Executing tool calls when requested
 * 4. Feeding tool results back to LLM
 * 5. Streaming final response to UI and TTS
 *
 * Supports cancellation via AbortController for interrupt handling.
 */

import { eventBus, type ConfirmationResponseEvent } from '../pipeline/events.js';
import { OpenAIProvider, GeminiProvider, type LLMProvider } from '../llm/index.js';
import { store } from '../config/store.js';
import { toolRegistry } from '../tools/index.js';
import { ConversationContext } from '../memory/context.js';
import type { ToolCall } from '../llm/provider.js';

export class Agent {
  private llm: LLMProvider;
  private context: ConversationContext;
  private abortController: AbortController | null = null;

  constructor() {
    const provider = store.get('llmProvider');
    if (provider === 'gemini') {
      this.llm = new GeminiProvider();
    } else {
      this.llm = new OpenAIProvider();
    }
    this.context = new ConversationContext();
  }

  /**
   * Process a user message through the full agent loop.
   * This is the main entry point — called when STT commits a transcript.
   */
  async processMessage(userText: string): Promise<string> {
    // Cancel any in-flight request
    this.cancel();

    // Create new abort controller for this request
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      eventBus.transition('thinking');
      this.context.addUserMessage(userText);

      // Get tool definitions
      const toolDefs = toolRegistry.getOpenAIDefinitions();

      // Run the agent loop (may iterate if tool calls happen)
      let fullResponse = '';
      fullResponse = await this.agentLoop(toolDefs, signal);

      eventBus.emit('llm:done', {
        fullResponse,
        timestamp: Date.now(),
      });

      return fullResponse;
    } catch (error) {
      if (signal.aborted) {
        return '[interrupted]';
      }
      const err = error instanceof Error ? error : new Error(String(error));
      eventBus.emitError('llm', err);
      throw err;
    }
  }

  /**
   * The core agent loop — streams LLM response, handles tool calls, loops until done.
   */
  private async agentLoop(
    toolDefs: ReturnType<typeof toolRegistry.getOpenAIDefinitions>,
    signal: AbortSignal,
  ): Promise<string> {
    let fullResponse = '';
    let iterations = 0;
    const MAX_ITERATIONS = 10; // prevent infinite loops

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      if (signal.aborted) return fullResponse;

      const messages = this.context.getMessages();
      let currentText = '';
      const pendingToolCalls: Map<string, { name: string; arguments: string }> = new Map();
      let hasToolCalls = false;

      // Stream the LLM response
      eventBus.transition('thinking');

      for await (const chunk of this.llm.streamChat(messages, toolDefs, signal)) {
        if (signal.aborted) return fullResponse;

        switch (chunk.type) {
          case 'text':
            currentText += chunk.content;
            fullResponse += chunk.content;
            eventBus.emit('llm:chunk', {
              content: chunk.content,
              timestamp: Date.now(),
            });
            break;

          case 'tool_call_start':
            hasToolCalls = true;
            pendingToolCalls.set(chunk.id, { name: chunk.name, arguments: '' });
            break;

          case 'tool_call_args':
            const tc = pendingToolCalls.get(chunk.id);
            if (tc) tc.arguments += chunk.args;
            break;

          case 'tool_call_end':
            // Tool call is complete — update the buffer
            pendingToolCalls.set(chunk.id, {
              name: chunk.name,
              arguments: chunk.arguments,
            });

            eventBus.emit('llm:toolCall', {
              id: chunk.id,
              name: chunk.name,
              arguments: chunk.arguments,
              timestamp: Date.now(),
            });
            break;

          case 'done':
            break;
        }
      }

      // ── If no tool calls, we're done ──────────────────────────────
      if (!hasToolCalls) {
        this.context.addAssistantMessage(currentText);
        return fullResponse;
      }

      // ── Execute tool calls ────────────────────────────────────────
      // Build the tool_calls array for the assistant message
      const toolCallsArray: ToolCall[] = Array.from(pendingToolCalls.entries()).map(
        ([id, { name, arguments: args }]) => ({
          id,
          type: 'function' as const,
          function: { name, arguments: args },
        }),
      );

      // Add assistant message with tool calls to context
      this.context.addAssistantMessage(currentText || null, toolCallsArray);

      // Execute each tool
      for (const [id, { name, arguments: argsStr }] of pendingToolCalls) {
        if (signal.aborted) return fullResponse;

        const tool = toolRegistry.get(name);
        if (!tool) {
          this.context.addToolResult(id, `Error: unknown tool "${name}"`);
          continue;
        }

        // Parse arguments
        let args: any;
        try {
          args = JSON.parse(argsStr);
        } catch {
          this.context.addToolResult(id, `Error: invalid JSON arguments for tool "${name}"`);
          continue;
        }

        // Validate with Zod
        const validated = tool.parameters.safeParse(args);
        if (!validated.success) {
          this.context.addToolResult(
            id,
            `Error: invalid arguments for tool "${name}": ${validated.error.message}`,
          );
          continue;
        }

        // Check if confirmation is needed
        if (tool.safetyLevel === 'requires_confirmation') {
          const approved = await this.requestConfirmation(id, name, validated.data);
          if (!approved) {
            this.context.addToolResult(id, 'User denied execution of this action.');
            continue;
          }
        }

        if (tool.safetyLevel === 'dangerous') {
          this.context.addToolResult(id, 'This action is classified as dangerous and has been blocked.');
          continue;
        }

        // Execute the tool
        eventBus.transition('tool_executing');
        eventBus.emit('tool:executing', {
          id,
          name,
          args: validated.data,
          timestamp: Date.now(),
        });

        try {
          const result = await tool.execute(validated.data);
          this.context.addToolResult(id, result.output);

          eventBus.emit('tool:result', {
            id,
            name,
            result: result.output,
            success: result.success,
            timestamp: Date.now(),
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.context.addToolResult(id, `Error executing tool: ${errorMsg}`);
          eventBus.emitError('tool', error instanceof Error ? error : new Error(errorMsg));
        }
      }

      // Loop back to get LLM response after tool execution
      hasToolCalls = false;
    }

    return fullResponse;
  }

  /**
   * Request user confirmation for a tool action.
   * Emits an event and waits for a response.
   */
  private requestConfirmation(
    id: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Generate a human-readable description
      let description = `Execute tool: ${toolName}`;
      if (toolName === 'run_command') {
        description = `Run command: ${args.command}`;
      } else if (toolName === 'write_file') {
        description = `Write to file: ${args.path}`;
      } else if (toolName === 'edit_file') {
        description = `Edit file: ${args.path}`;
      }

      eventBus.emit('confirmation:request', {
        id,
        toolName,
        description,
        args,
        timestamp: Date.now(),
      });

      // Listen for the response
      const handler = (event: ConfirmationResponseEvent) => {
        if (event.id === id) {
          eventBus.off('confirmation:response', handler);
          resolve(event.approved);
        }
      };

      eventBus.on('confirmation:response', handler);
    });
  }

  /**
   * Cancel the current agent operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.context.clear();
  }

  /**
   * Get context stats
   */
  getStats() {
    return this.context.getStats();
  }
}
