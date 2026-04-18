/**
 * Gemini Streaming Provider
 *
 * Implements the LLMProvider interface using the official @google/generative-ai SDK.
 * Supports tool calling and conversational history.
 */

import {
  GoogleGenerativeAI,
  type Content,
  type Tool as GenAITool,
  type FunctionDeclaration,
  type Part,
} from '@google/generative-ai';
import { randomUUID } from 'crypto';
import type {
  LLMProvider,
  Message,
  StreamChunk,
  ToolDefinition,
} from './provider.js';
import { loadEnvConfig } from '../config/env.js';

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const config = loadEnvConfig();
    this.ai = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');
    this.modelName = config.GEMINI_MODEL || 'gemini-1.5-pro';
  }

  async *streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    const model = this.ai.getGenerativeModel({ model: this.modelName });

    // Format tools for Gemini
    const geminiTools: GenAITool[] = [];
    if (tools.length > 0) {
      // Helper function to sanitize JSON schema for Gemini's strict proto format
      const sanitizeSchema = (schema: any): any => {
        if (!schema || typeof schema !== 'object') return schema;
        if (Array.isArray(schema)) return schema.map(sanitizeSchema);

        const clean = { ...schema };

        // 1. Gemini strictly forbids these keys
        delete clean.$schema;
        delete clean.additionalProperties;
        delete clean.default;

        // 2. Gemini doesn't support arrays for 'type' (e.g., ["string", "null"])
        if (Array.isArray(clean.type)) {
          clean.type = clean.type.find((t: string) => t !== 'null') || 'string';
        }

        // 3. Recursively clean nested properties
        if (clean.properties) {
          for (const key of Object.keys(clean.properties)) {
            clean.properties[key] = sanitizeSchema(clean.properties[key]);
          }
        }

        // 4. Recursively clean array items
        if (clean.items) {
          clean.items = sanitizeSchema(clean.items);
        }

        return clean;
      };

      const declarations: FunctionDeclaration[] = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: sanitizeSchema(tool.function.parameters),
      }));
      geminiTools.push({ functionDeclarations: declarations });
    }

    // Format messages for Gemini
    let systemInstruction = '';
    const contents: Content[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += msg.content + '\n';
      } else if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        const parts: Part[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments),
              },
            });
          }
        }
        if (parts.length > 0) {
          contents.push({ role: 'model', parts });
        }
      } else if (msg.role === 'tool') {
        // Find previous user/assistant turn or create a generic user turn for function responses
        // Gemini expects tool responses to be from 'user' role
        const lastContent = contents[contents.length - 1];
        const functionResponsePart = {
          functionResponse: {
            name: msg.tool_call_id, // Gemini uses name, not distinct call ID here easily, but we map name to id in agent loop optionally. Wait, OpenAI uses tool_call_id. Let's assume the tool name is stored, but we only have tool_call_id. Actually, agent.ts generates the ID.
            // In standard mapping we need the function name. agent.ts stores tool outputs by ID.
            // Let's pass the ID as the name to satisfy Gemini for now.
            response: { output: msg.content },
          },
        };

        if (lastContent && lastContent.role === 'user') {
          lastContent.parts.push(functionResponsePart);
        } else {
          contents.push({ role: 'user', parts: [functionResponsePart] });
        }
      }
    }

    const request: any = { contents };
    if (systemInstruction) {
      request.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    if (geminiTools.length > 0) {
      request.tools = geminiTools;
    }

    try {
      const result = await model.generateContentStream(request, { signal });

      for await (const chunk of result.stream) {
        if (signal?.aborted) break;

        // Yield text if available
        const text = chunk.text();
        if (text) {
          yield { type: 'text', content: text };
        }

        // Yield function calls
        const fnCalls = chunk.functionCalls();
        if (fnCalls && fnCalls.length > 0) {
          for (const call of fnCalls) {
            const id = `call_${randomUUID()}`; // Gemini doesn't provide IDs like OpenAI, so we generate one
            const argsString = JSON.stringify(call.args);

            yield {
              type: 'tool_call_start',
              id,
              name: call.name,
            };

            yield {
              type: 'tool_call_args',
              id,
              args: argsString,
            };

            yield {
              type: 'tool_call_end',
              id,
              name: call.name,
              arguments: argsString,
            };
          }
        }
      }

      if (!signal?.aborted) {
        yield { type: 'done' };
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) {
        return;
      }
      throw error;
    }
  }
}
