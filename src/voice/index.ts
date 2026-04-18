/**
 * Voice Manager
 *
 * Orchestrates the complete voice pipeline:
 *   Mic → STT → events   (input)
 *   Text → TTS → Speaker  (output)
 *
 * Handles interruption: when user speaks during TTS playback,
 * stops speaker, aborts TTS, and processes new input.
 */

import { EventEmitter } from 'eventemitter3';
import { Microphone } from './microphone.js';
import { ElevenLabsSTT } from './stt.js';
import { ElevenLabsTTS } from './tts.js';
import { AudioSpeaker } from './speaker.js';
import { eventBus } from '../pipeline/events.js';

// ─── Event Types ────────────────────────────────────────────────────────────

interface VoiceManagerEvents {
  ready: [];
  listening: [];
  transcript: [text: string, isFinal: boolean];
  speaking: [];
  speakingDone: [];
  interrupted: [];
  error: [error: Error];
}

// ─── Voice Manager ──────────────────────────────────────────────────────────

export class VoiceManager extends EventEmitter<VoiceManagerEvents> {
  private mic: Microphone;
  private stt: ElevenLabsSTT;
  private tts: ElevenLabsTTS | null = null;
  private speaker: AudioSpeaker;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;

  constructor() {
    super();
    this.mic = new Microphone({ sampleRate: 16000, channels: 1 });
    this.stt = new ElevenLabsSTT();
    this.speaker = new AudioSpeaker();

    this.setupSTTHandlers();
    this.setupSpeakerHandlers();
  }

  /**
   * Wire up STT event handlers
   */
  private setupSTTHandlers(): void {
    this.stt.on('partial', (text: string) => {
      console.log(`[Voice] STT partial: ${text}`);
      if (this.isSpeaking) {
        this.interrupt();
      }
      this.emit('transcript', text, false);
      eventBus.emit('stt:partial', { text, timestamp: Date.now() });
    });

    this.stt.on('committed', (text: string) => {
      console.log(`[Voice] STT committed: ${text}`);
      if (this.isSpeaking) {
        this.interrupt();
      }
      this.emit('transcript', text, true);
      eventBus.emit('stt:committed', { text, timestamp: Date.now() });
    });

    this.stt.on('error', (error: Error) => {
      console.error(`[Voice] STT error:`, error.message);
      this.emit('error', error);
      eventBus.emitError('stt', error);
    });

    this.stt.on('connected', () => {
      console.log('[Voice] STT WebSocket connected');
    });

    this.stt.on('disconnected', () => {
      console.log('[Voice] STT WebSocket disconnected');
    });
  }

  /**
   * Wire up speaker event handlers
   */
  private setupSpeakerHandlers(): void {
    this.speaker.on('finished', () => {
      this.isSpeaking = false;
      this.emit('speakingDone');
    });

    this.speaker.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * Initialize voice system — connects to STT
   */
  async initialize(): Promise<void> {
    try {
      await this.stt.connect();
      this.emit('ready');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('[Voice] Already listening, skipping start');
      return;
    }

    try {
      console.log('[Voice] Starting listening...');
      if (!this.stt.connected()) {
        console.log('[Voice] Connecting to STT...');
        await this.stt.connect();
      }

      console.log('[Voice] Starting microphone...');
      const audioStream = await this.mic.start();
      console.log('[Voice] Microphone started, streaming audio to STT...');
      this.stt.streamAudio(audioStream);
      this.isListening = true;

      eventBus.transition('listening');
      this.emit('listening');
      console.log('[Voice] Now listening!');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[Voice] Error starting listening:', err.message);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening(): void {
    this.mic.stop();
    this.isListening = false;
  }

  /**
   * Speak text via TTS using an async iterable of text chunks.
   */
  async speak(textStream: AsyncIterable<string>): Promise<void> {
    try {
      this.tts = new ElevenLabsTTS();
      await this.tts.connect();

      this.speaker.start();
      this.isSpeaking = true;
      this.emit('speaking');
      eventBus.transition('speaking');

      this.tts.on('audioChunk', (audio: Buffer) => {
        this.speaker.write(audio);
        eventBus.emit('tts:chunk', {
          audioLength: audio.length,
          timestamp: Date.now(),
        });
      });

      this.tts.on('done', () => {
        this.speaker.end();
        this.isSpeaking = false;
        eventBus.emit('tts:done');
      });

      for await (const chunk of textStream) {
        if (!this.isSpeaking) break;
        this.tts.sendText(chunk);
      }

      if (this.tts.connected()) {
        this.tts.finish();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      eventBus.emitError('tts', err);
    }
  }

  /**
   * Speak a complete text string (non-streaming)
   */
  async speakText(text: string): Promise<void> {
    async function* singleChunk() {
      yield text;
    }
    await this.speak(singleChunk());
  }

  /**
   * Interrupt current speech output
   */
  interrupt(): void {
    this.speaker.stop();

    if (this.tts) {
      this.tts.abort();
      this.tts = null;
    }

    this.isSpeaking = false;
    this.emit('interrupted');
    eventBus.emit('pipeline:interrupt');
  }

  /**
   * Clean shutdown of all voice resources
   */
  async shutdown(): Promise<void> {
    this.stopListening();
    this.speaker.stop();

    if (this.tts) {
      this.tts.abort();
      this.tts = null;
    }

    this.stt.disconnect();
  }

  /**
   * Get current voice system state
   */
  getState(): { listening: boolean; speaking: boolean } {
    return {
      listening: this.isListening,
      speaking: this.isSpeaking,
    };
  }
}
