/**
 * Pipeline Event Bus
 *
 * Typed EventEmitter that connects all subsystems in the streaming pipeline.
 * Every module communicates through this central bus — no direct coupling.
 */

import { EventEmitter } from 'eventemitter3';

// ─── Event Payload Types ────────────────────────────────────────────────────

export interface STTPartialEvent {
  text: string;
  timestamp: number;
}

export interface STTCommittedEvent {
  text: string;
  timestamp: number;
}

export interface LLMChunkEvent {
  content: string;
  timestamp: number;
}

export interface LLMToolCallEvent {
  id: string;
  name: string;
  arguments: string;
  timestamp: number;
}

export interface LLMDoneEvent {
  fullResponse: string;
  timestamp: number;
}

export interface ToolExecutingEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
}

export interface ToolResultEvent {
  id: string;
  name: string;
  result: string;
  success: boolean;
  timestamp: number;
}

export interface TTSChunkEvent {
  audioLength: number;
  timestamp: number;
}

export interface SessionStateChangeEvent {
  from: SessionState;
  to: SessionState;
  timestamp: number;
}

export interface PipelineErrorEvent {
  source: string;
  error: Error;
  timestamp: number;
}

export interface ConfirmationRequestEvent {
  id: string;
  toolName: string;
  description: string;
  args: Record<string, unknown>;
  timestamp: number;
}

export interface ConfirmationResponseEvent {
  id: string;
  approved: boolean;
  timestamp: number;
}

// ─── Session States ─────────────────────────────────────────────────────────

export type SessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'thinking'
  | 'tool_executing'
  | 'responding'
  | 'speaking'
  | 'error';

// ─── Event Map ──────────────────────────────────────────────────────────────

export interface PipelineEvents {
  // Voice
  'stt:partial': [event: STTPartialEvent];
  'stt:committed': [event: STTCommittedEvent];
  'stt:error': [event: PipelineErrorEvent];

  // LLM
  'llm:chunk': [event: LLMChunkEvent];
  'llm:toolCall': [event: LLMToolCallEvent];
  'llm:done': [event: LLMDoneEvent];
  'llm:error': [event: PipelineErrorEvent];

  // Tools
  'tool:executing': [event: ToolExecutingEvent];
  'tool:result': [event: ToolResultEvent];
  'tool:error': [event: PipelineErrorEvent];

  // Confirmation
  'confirmation:request': [event: ConfirmationRequestEvent];
  'confirmation:response': [event: ConfirmationResponseEvent];

  // TTS
  'tts:chunk': [event: TTSChunkEvent];
  'tts:done': [];
  'tts:error': [event: PipelineErrorEvent];

  // Session
  'session:stateChange': [event: SessionStateChangeEvent];

  // Pipeline control
  'pipeline:interrupt': [];
  'pipeline:error': [event: PipelineErrorEvent];
  'pipeline:shutdown': [];
}

// ─── Typed Event Bus ────────────────────────────────────────────────────────

class PipelineEventBus extends EventEmitter<PipelineEvents> {
  private currentState: SessionState = 'idle';

  /**
   * Transition session state and emit the change event
   */
  transition(to: SessionState): void {
    const from = this.currentState;
    if (from === to) return;

    this.currentState = to;
    this.emit('session:stateChange', {
      from,
      to,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return this.currentState;
  }

  /**
   * Emit an error on the appropriate channel
   */
  emitError(source: string, error: Error): void {
    const event: PipelineErrorEvent = {
      source,
      error,
      timestamp: Date.now(),
    };

    // Always emit on pipeline-level error channel
    this.emit('pipeline:error', event);
  }
}

// Singleton instance — shared across entire application
export const eventBus = new PipelineEventBus();
