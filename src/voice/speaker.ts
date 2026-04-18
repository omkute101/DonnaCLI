/**
 * Audio Speaker Module
 *
 * Handles playback of audio buffers received from TTS.
 * Uses mpv/ffplay subprocess for MP3 playback.
 */

import { spawn, type ChildProcess } from 'child_process';
import { type Writable } from 'stream';
import { EventEmitter } from 'eventemitter3';

// ─── Event Types ────────────────────────────────────────────────────────────

interface SpeakerEvents {
  playing: [];
  finished: [];
  error: [error: Error];
}

// ─── Audio Speaker ──────────────────────────────────────────────────────────

export class AudioSpeaker extends EventEmitter<SpeakerEvents> {
  private process: ChildProcess | null = null;
  private stdin: Writable | null = null;
  private isPlaying: boolean = false;

  /**
   * Start the audio player process.
   */
  start(): void {
    if (this.process) return;

    try {
      this.process = spawn('mpv', [
        '--no-terminal',
        '--no-video',
        '--really-quiet',
        '--',
        '-',
      ], {
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    } catch {
      try {
        this.process = spawn('ffplay', [
          '-nodisp',
          '-autoexit',
          '-loglevel', 'quiet',
          '-i', '-',
        ], {
          stdio: ['pipe', 'ignore', 'ignore'],
        });
      } catch {
        this.emit('error', new Error(
          'No audio player found. Install mpv or ffmpeg:\n' +
          '  Ubuntu/Debian: sudo apt install mpv\n' +
          '  macOS: brew install mpv'
        ));
        return;
      }
    }

    this.stdin = this.process!.stdin!;
    this.isPlaying = true;
    this.emit('playing');

    this.process!.on('close', () => {
      this.isPlaying = false;
      this.process = null;
      this.stdin = null;
      this.emit('finished');
    });

    this.process!.on('error', (err: Error) => {
      this.emit('error', err);
    });
  }

  /**
   * Write an audio chunk to the player
   */
  write(chunk: Buffer): void {
    if (this.stdin && !this.stdin.destroyed) {
      this.stdin.write(chunk);
    }
  }

  /**
   * Signal end of audio stream
   */
  end(): void {
    if (this.stdin && !this.stdin.destroyed) {
      this.stdin.end();
    }
  }

  /**
   * Immediately stop playback (for interruption)
   */
  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.stdin = null;
      this.isPlaying = false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  playing(): boolean {
    return this.isPlaying;
  }
}
