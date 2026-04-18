/**
 * Conversation Context Manager
 *
 * Maintains the conversation history between the user and the LLM.
 * Handles:
 * - Message accumulation
 * - System prompt management
 * - Context window management (truncation for long conversations)
 * - Tool call/result pairing
 */

import type { Message } from '../llm/provider.js';

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Donna, an advanced AI developer assistant embedded in a CLI terminal.

PERSONALITY:
- You are helpful, precise, and efficient
- You communicate clearly and concisely
- You think step by step when solving problems
- You proactively suggest improvements
- You are voice-first: your responses should sound natural when spoken aloud

CAPABILITIES:
- You can read, write, and edit files in the user's project
- You can run shell commands (ls, git, npm, etc.)
- You have access to the current working directory

CRITICAL RULE - ALWAYS NARRATE YOUR ACTIONS:
You are a voice assistant. Whenever you decide to use a tool or execute a command, you MUST generate a brief, friendly text response explaining what you are about to do BEFORE you trigger the tool call. NEVER execute a tool silently.

Example: "I'll list the files in that directory for you right now." [Triggers tool]

GUIDELINES:
- Always read a file before editing it to understand the full context
- Explain what you're about to do before taking action
- For destructive operations, be clear about what will change
- Keep responses concise — the user is listening via voice
- Use short sentences for voice clarity
- When showing code, be precise about file paths and line numbers
- NEVER call tools silently - always speak first

WORKING DIRECTORY: ${process.cwd()}`;

// ─── Context Manager ────────────────────────────────────────────────────────

export class ConversationContext {
  private messages: Message[] = [];
  private readonly maxMessages: number;

  constructor(maxMessages: number = 50) {
    this.maxMessages = maxMessages;

    // Initialize with system prompt
    this.messages.push({
      role: 'system',
      content: SYSTEM_PROMPT,
    });
  }

  /**
   * Add a user message
   */
  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
    this.trim();
  }

  /**
   * Add an assistant message (can include tool calls)
   */
  addAssistantMessage(content: string | null, toolCalls?: any[]): void {
    this.messages.push({
      role: 'assistant',
      content,
      tool_calls: toolCalls,
    });
    this.trim();
  }

  /**
   * Add a tool result message
   */
  addToolResult(toolCallId: string, content: string): void {
    this.messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content,
    });
    this.trim();
  }

  /**
   * Get all messages for LLM context
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Get conversation summary stats
   */
  getStats(): { messageCount: number; estimatedTokens: number } {
    const totalChars = this.messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : '';
      return sum + content.length;
    }, 0);

    return {
      messageCount: this.messages.length,
      estimatedTokens: Math.ceil(totalChars / 4), // rough approximation
    };
  }

  /**
   * Clear conversation history (keeps system prompt)
   */
  clear(): void {
    this.messages = [this.messages[0]]; // Keep system prompt
  }

  /**
   * Trim oldest messages if we exceed the limit.
   * Always preserves: system prompt + last N messages
   */
  private trim(): void {
    if (this.messages.length <= this.maxMessages) return;

    const systemPrompt = this.messages[0];
    const recentMessages = this.messages.slice(-(this.maxMessages - 1));

    this.messages = [systemPrompt, ...recentMessages];
  }
}
