/**
 * Persistent configuration store
 * Uses the 'conf' package for cross-platform config storage
 */

import Conf from 'conf';

interface DonnaConfig {
  /** Whether the user has completed initial setup */
  initialized: boolean;
  /** Preferred TTS voice ID */
  voiceId: string;
  /** LLM Provider */
  llmProvider: 'openai' | 'gemini';
  /** Default LLM model */
  model: string;
  /** Whether to require confirmation for dangerous operations */
  safeMode: boolean;
  /** Maximum shell command timeout in seconds */
  shellTimeout: number;
  /** Whether voice output (TTS) is enabled */
  voiceOutputEnabled: boolean;
  /** Whether voice input (STT) is enabled */
  voiceInputEnabled: boolean;
  /** API Keys */
  openaiKey?: string;
  geminiKey?: string;
  elevenLabsKey?: string;
}

const store = new Conf<DonnaConfig>({
  projectName: 'donna-cli',
  defaults: {
    initialized: false,
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    llmProvider: 'openai',
    model: 'gpt-4o',
    safeMode: true,
    shellTimeout: 30,
    voiceOutputEnabled: true,
    voiceInputEnabled: true,
  },
});

export { store };
export type { DonnaConfig };
