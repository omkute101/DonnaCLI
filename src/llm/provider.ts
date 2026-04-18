/**
 * LLM Provider Interface
 *
 * Defines the contract for any LLM backend (OpenAI, Anthropic, etc.)
 * All providers must support streaming and tool calling.
 */

// ─── Message Types ──────────────────────────────────────────────────────────

export interface SystemMessage {
  role: 'system';
  content: string;
}

export interface UserMessage {
  role: 'user';
  content: string;
}

export interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface ToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// ─── Tool Definition ────────────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ─── Stream Chunks ──────────────────────────────────────────────────────────

export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_args'; id: string; args: string }
  | { type: 'tool_call_end'; id: string; name: string; arguments: string }
  | { type: 'done' };

// ─── Provider Interface ─────────────────────────────────────────────────────

export interface LLMProvider {
  /**
   * Stream a chat completion with tool support.
   * Yields StreamChunk objects as they arrive from the API.
   */
  streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<StreamChunk>;
}
