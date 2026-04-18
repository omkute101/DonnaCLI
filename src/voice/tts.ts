/**
 * ElevenLabs Streaming Text-to-Speech (TTS)
 *
 * Connects to the ElevenLabs TTS WebSocket for real-time speech synthesis.
 * Accepts text chunks (from streaming LLM output) and returns audio chunks.
 *
 * WebSocket endpoint: wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input
 * Model: eleven_flash_v2_5 (lowest latency)
 * Output: base64-encoded MP3 audio chunks
 */

import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';
import { loadEnvConfig } from '../config/env.js';

// ─── Event Types ────────────────────────────────────────────────────────────

interface TTSEvents {
  audioChunk: [audio: Buffer];
  alignments: [data: any];
  done: [];
  connected: [];
  error: [error: Error];
}

// ─── TTS Client ─────────────────────────────────────────────────────────────

export class ElevenLabsTTS extends EventEmitter<TTSEvents> {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private voiceId: string;
  private apiKey: string;
  private textBuffer: string = '';
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    const config = loadEnvConfig();
    this.voiceId = config.ELEVENLABS_VOICE_ID;
    this.apiKey = config.ELEVENLABS_API_KEY;
  }

  /**
   * Connect to the ElevenLabs TTS WebSocket
   */
  async connect(): Promise<void> {
    const modelId = 'eleven_flash_v2_5';
    const outputFormat = 'mp3_22050_32';

    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=${modelId}&output_format=${outputFormat}`;

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.isConnected = true;

        // Send initial configuration
        this.ws!.send(JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
          xi_api_key: this.apiKey,
        }));

        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.audio) {
            const audioBuffer = Buffer.from(message.audio, 'base64');
            this.emit('audioChunk', audioBuffer);
          }

          if (message.alignment) {
            this.emit('alignments', message.alignment);
          }

          if (message.isFinal) {
            this.emit('done');
          }
        } catch {
          // Non-JSON or parse error — ignore
        }
      });

      this.ws.on('error', (error: Error) => {
        this.emit('error', error);
        if (!this.isConnected) reject(error);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
      });
    });
  }

  /**
   * Send a text chunk for synthesis.
   */
  sendText(text: string): void {
    if (!this.ws || !this.isConnected) return;

    this.textBuffer += text;

    if (this.flushTimeout) clearTimeout(this.flushTimeout);

    this.flushTimeout = setTimeout(() => {
      this.flushBuffer();
    }, 100);
  }

  /**
   * Immediately flush buffered text to the TTS WebSocket
   */
  flushBuffer(): void {
    if (!this.ws || !this.isConnected || !this.textBuffer) return;

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    this.ws.send(JSON.stringify({
      text: this.textBuffer,
      flush: true,
    }));

    this.textBuffer = '';
  }

  /**
   * Signal end of text stream
   */
  finish(): void {
    this.flushBuffer();

    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ text: '' }));
    }
  }

  /**
   * Abort the current TTS stream (for interruption)
   */
  abort(): void {
    this.textBuffer = '';
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Check connection status
   */
  connected(): boolean {
    return this.isConnected;
  }
}
