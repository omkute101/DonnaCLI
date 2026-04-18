/**
 * Type declarations for modules without TypeScript definitions
 */

declare module 'node-record-lpcm16' {
  import { Readable } from 'stream';

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    threshold?: number;
    silence?: string;
    recorder?: string;
    endOnSilence?: boolean;
    device?: string;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
    pause(): void;
    resume(): void;
  }

  export function record(options?: RecordOptions): Recording;
}
