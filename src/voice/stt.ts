/**
 * ElevenLabs Realtime Speech-to-Text (STT)
 *
 * Connects to the ElevenLabs Realtime STT WebSocket endpoint.
 * Streams PCM audio chunks from the microphone and receives
 * partial and committed transcripts in real-time.
 *
 * WebSocket endpoint: wss://api.elevenlabs.io/v1/speech-to-text/realtime
 * Model: scribe_v2_realtime
 * Audio format: PCM 16-bit, 16kHz, mono
 */

import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';
import type { Readable } from 'stream';
import { loadEnvConfig } from '../config/env.js';

// ─── Event Types ────────────────────────────────────────────────────────────

interface STTEvents {
  partial: [text: string];
  committed: [text: string];
  connected: [];
  disconnected: [];
  error: [error: Error];
}

// ─── STT Client ─────────────────────────────────────────────────────────────

export class ElevenLabsSTT extends EventEmitter<STTEvents> {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;

  /**
   * Connect to the ElevenLabs Realtime STT WebSocket
   */
  async connect(): Promise<void> {
    const config = loadEnvConfig();

    const url = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en&sample_rate=16000&encoding=pcm_s16le`;

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: {
          'xi-api-key': config.ELEVENLABS_API_KEY,
        },
      });

      this.ws.on('open', () => {
        this.isConnected = true;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch {
          // Binary data or unparseable — ignore
        }
      });

      this.ws.on('error', (error: Error) => {
        this.emit('error', error);
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.emit('disconnected');
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: Record<string, any>): void {
    // Debug: Log all incoming message types
    if (message.type) {
      console.log(`[STT] Received message type: ${message.type}`, JSON.stringify(message).slice(0, 200));
    }

    if (message.type === 'transcript') {
      if (message.is_final || message.transcript_type === 'final') {
        if (message.text && message.text.trim()) {
          console.log(`[STT] Final transcript: ${message.text.trim()}`);
          this.emit('committed', message.text.trim());
        }
      } else {
        if (message.text) {
          this.emit('partial', message.text);
        }
      }
    } else if (message.type === 'partial_transcript') {
      const text = message.text || '';
      if (text) this.emit('partial', text);
    } else if (message.type === 'final_transcript') {
      if (message.text && message.text.trim()) {
        console.log(`[STT] Final transcript: ${message.text.trim()}`);
        this.emit('committed', message.text.trim());
      }
    } else if (message.error) {
      console.error(`[STT] Error from server:`, message.error);
    }
  }

  /**
   * Stream audio data from a readable stream to the WebSocket.
   */
  streamAudio(audioStream: Readable): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('STT WebSocket not connected');
    }

    let chunkCount = 0;
    audioStream.on('data', (chunk: Buffer) => {
      chunkCount++;
      if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        // ElevenLabs WebSocket API expects base64 audio in user_audio_chunk field
        this.ws.send(JSON.stringify({
          user_audio_chunk: chunk.toString('base64')
        }));
        if (chunkCount % 50 === 0) {
          console.log(`[STT] Sent ${chunkCount} audio chunks`);
        }
      }
    });

    audioStream.on('error', (error: Error) => {
      this.emit('error', error);
    });

    audioStream.on('end', () => {
      console.log(`[STT] Audio stream ended. Total chunks: ${chunkCount}`);
    });
  }

  /**
   * Send a single audio chunk
   */
  sendAudioChunk(chunk: Buffer): void {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        user_audio_chunk: chunk.toString('base64')
      }));
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check connection status
   */
  connected(): boolean {
    return this.isConnected;
  }
}
