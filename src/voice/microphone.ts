/**
 * Microphone Capture Module
 *
 * Wraps node-record-lpcm16 for streaming PCM audio from the system mic.
 * Outputs 16-bit PCM at 16kHz mono — the format ElevenLabs STT expects.
 */

import type { Readable } from 'stream';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RecordOptions {
  sampleRate: number;
  channels: number;
  threshold: number;
  silence: string;
  recorder: string;
}

interface MicrophoneConfig {
  sampleRate?: number;
  channels?: number;
  /** Silence threshold (0-100). 0 = no silence detection */
  threshold?: number;
}

// ─── Microphone Class ───────────────────────────────────────────────────────

export class Microphone {
  private recording: any = null;
  private stream: Readable | null = null;
  private config: Required<MicrophoneConfig>;

  constructor(config: MicrophoneConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
      threshold: config.threshold ?? 0,
    };
  }

  /**
   * Start recording from the microphone.
   * Returns a readable stream of PCM audio data.
   */
  async start(): Promise<Readable> {
    // Dynamic import because node-record-lpcm16 has no types and is CJS
    const imported = await import('node-record-lpcm16');
    const recorder = imported.default || imported;

    // Try sox first, fallback to arecord
    let recorderCmd = 'sox';
    try {
      // Check if sox is available
      const { execSync } = await import('child_process');
      execSync('which sox', { stdio: 'ignore' });
    } catch {
      recorderCmd = 'arecord';
      console.log('[Microphone] sox not found, using arecord fallback');
    }

    const options: RecordOptions = {
      sampleRate: this.config.sampleRate,
      channels: this.config.channels,
      threshold: this.config.threshold,
      silence: '2.0',
      recorder: recorderCmd,
    };

    try {
      this.recording = recorder.record(options);
      this.stream = this.recording.stream();

      // Handle stream errors
      this.stream!.on('error', (err: any) => {
        const errorMsg = err?.message || err?.toString() || 'Unknown stream error';
        console.error('[Microphone Stream] Error:', errorMsg);
      });

      this.stream!.on('close', () => {
        console.log('[Microphone] Stream closed');
      });

      return this.stream!;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[Microphone] Failed to start:', errMsg);
      throw new Error(`Failed to start microphone: ${errMsg}. Make sure sox or alsa-utils is installed.`);
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (this.recording) {
      this.recording.stop();
      this.recording = null;
    }
    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recording !== null;
  }
}
