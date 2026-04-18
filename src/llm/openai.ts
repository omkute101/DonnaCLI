/**
 * OpenAI LLM Provider
 *
 * Implements streaming chat completions with tool call reassembly.
 * Handles the complex logic of accumulating partial tool call chunks
 * into complete function calls.
 */

import OpenAI from 'openai';
import type { LLMProvider, Message, StreamChunk, ToolDefinition } from './provider.js';
import { loadEnvConfig } from '../config/env.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const config = loadEnvConfig();
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    this.model = config.OPENAI_MODEL;
  }

  async *streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    // Build the OpenAI request
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: tools.length > 0
          ? tools as OpenAI.Chat.Completions.ChatCompletionTool[]
          : undefined,
        stream: true,
      },
      { signal },
    );

    // Buffer for reassembling tool calls from multiple chunks
    const toolCallBuffers: Map<number, {
      id: string;
      name: string;
      arguments: string;
    }> = new Map();

    for await (const chunk of stream) {
      // Check for abort
      if (signal?.aborted) return;

      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      // ── Text content ────────────────────────────────────────────────
      if (delta.content) {
        yield { type: 'text', content: delta.content };
      }

      // ── Tool calls (arrive in fragments) ────────────────────────────
      if (delta.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index;

          if (!toolCallBuffers.has(index)) {
            // First chunk for this tool call — contains id and name
            toolCallBuffers.set(index, {
              id: toolCallDelta.id || '',
              name: toolCallDelta.function?.name || '',
              arguments: toolCallDelta.function?.arguments || '',
            });

            // Emit start event
            yield {
              type: 'tool_call_start',
              id: toolCallDelta.id || '',
              name: toolCallDelta.function?.name || '',
            };
          } else {
            // Subsequent chunks — accumulate arguments
            const buffer = toolCallBuffers.get(index)!;
            if (toolCallDelta.function?.arguments) {
              buffer.arguments += toolCallDelta.function.arguments;
              yield {
                type: 'tool_call_args',
                id: buffer.id,
                args: toolCallDelta.function.arguments,
              };
            }
          }
        }
      }

      // ── Stream finished ─────────────────────────────────────────────
      if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
        // Emit completed tool calls
        for (const [, buffer] of toolCallBuffers) {
          yield {
            type: 'tool_call_end',
            id: buffer.id,
            name: buffer.name,
            arguments: buffer.arguments,
          };
        }
        toolCallBuffers.clear();
      }
    }

    yield { type: 'done' };
  }
}
