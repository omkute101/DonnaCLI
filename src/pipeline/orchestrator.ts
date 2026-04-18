/**
 * Pipeline Orchestrator
 *
 * The central coordinator that connects all subsystems:
 *   Mic → STT → Agent → CLI UI + TTS → Speaker
 *
 * Handles:
 * - Initialization of all subsystems
 * - Wiring events between voice, agent, and UI
 * - Interruption logic (user speaks during response)
 * - Graceful shutdown
 *
 * State Machine:
 *   idle → listening → processing → thinking → [tool_executing] → responding → speaking → idle
 */

import { eventBus, type STTCommittedEvent, type LLMChunkEvent } from './events.js';
import { VoiceManager } from '../voice/index.js';
import { Agent } from '../agent/agent.js';
import { registerBuiltinTools } from '../tools/index.js';
import { loadEnvConfig } from '../config/env.js';
import { store } from '../config/store.js';

export class Orchestrator {
  private voice: VoiceManager;
  private agent: Agent;
  private isRunning: boolean = false;
  private responseChunks: string[] = [];

  constructor() {
    this.voice = new VoiceManager();
    this.agent = new Agent();
  }

  /**
   * Initialize all subsystems and start the pipeline.
   */
  async start(): Promise<void> {
    // Validate config
    loadEnvConfig();

    // Register tools
    registerBuiltinTools();

    // Wire up the pipeline
    this.wireEvents();

    // Initialize voice
    if (store.get('voiceInputEnabled')) {
      await this.voice.initialize();
      
      // Intro voice
      if (store.get('voiceOutputEnabled')) {
        this.responseChunks = ["Donna is online."];
        await this.speakResponse();
      }

      await this.voice.startListening();
    }

    this.isRunning = true;
    eventBus.transition('listening');
  }

  /**
   * Wire all event handlers to connect the pipeline
   */
  private wireEvents(): void {
    // ── STT → Agent ──────────────────────────────────────────────────
    // When the user finishes speaking, send the text to the agent
    eventBus.on('stt:committed', async (event: STTCommittedEvent) => {
      if (!this.isRunning) return;

      const text = event.text.trim();
      if (!text) return;

      // Stop listening while processing (optional — can keep listening for interrupt)
      eventBus.transition('processing');
      this.voice.stopListening();

      // Clear response chunks for new interaction
      this.responseChunks = [];

      try {
        // Process through agent (streams via events)
        await this.agent.processMessage(text);

        // After agent finishes, speak the response via TTS
        if (store.get('voiceOutputEnabled') && this.responseChunks.length > 0) {
          await this.speakResponse();
        } else {
          // No TTS, return to listening immediately
          this.returnToListening();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        eventBus.emitError('pipeline', err);

        // Return to listening even after error
        this.returnToListening();
      }
    });

    // ── Resume listening after speaking ───────────────────────────────
    this.voice.on('speakingDone', () => {
      if (this.isRunning) {
        this.returnToListening();
      }
    });

    // ── Collect LLM chunks for TTS ───────────────────────────────────
    eventBus.on('llm:chunk', (event: LLMChunkEvent) => {
      this.responseChunks.push(event.content);
      eventBus.transition('responding');
    });

    // ── Interruption ─────────────────────────────────────────────────
    eventBus.on('pipeline:interrupt', () => {
      this.agent.cancel();
      this.responseChunks = [];
    });

    // ── Shutdown ─────────────────────────────────────────────────────
    eventBus.on('pipeline:shutdown', () => {
      this.shutdown();
    });
  }

  /**
   * Speak the accumulated response text via TTS
   */
  private async speakResponse(): Promise<void> {
    const fullText = this.responseChunks.join('');
    if (!fullText.trim()) {
      this.returnToListening();
      return;
    }

    try {
      await this.voice.speakText(fullText);
    } catch (error) {
      // TTS errors shouldn't crash the pipeline
      const err = error instanceof Error ? error : new Error(String(error));
      eventBus.emitError('tts', err);
      this.returnToListening();
    }
  }

  /**
   * Return to listening state after processing/speaking
   */
  private returnToListening(): void {
    if (!this.isRunning) return;

    eventBus.transition('listening');

    if (store.get('voiceInputEnabled')) {
      this.voice.startListening().catch((err) => {
        console.error('[Orchestrator] Failed to restart listening:', err.message);
      });
    }
  }

  /**
   * Interrupt the current pipeline operation
   */
  interrupt(): void {
    this.agent.cancel();
    this.voice.interrupt();
    this.responseChunks = [];
    this.returnToListening();
  }

  /**
   * Process a text message directly (for text-only mode)
   */
  async processText(text: string): Promise<string> {
    this.responseChunks = [];
    eventBus.transition('processing');

    try {
      const response = await this.agent.processMessage(text);

      if (store.get('voiceOutputEnabled') && this.responseChunks.length > 0) {
        await this.speakResponse();
      } else {
        this.returnToListening();
      }

      return response;
    } catch (error) {
      this.returnToListening();
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.agent.cancel();
    await this.voice.shutdown();
    eventBus.transition('idle');
  }
}
