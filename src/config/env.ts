/**
 * Environment configuration loader and validator
 * Loads .env and validates all required API keys are present
 */

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { store } from './store.js';

// Schema for required environment variables
const EnvSchema = z.object({
  LLM_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'), // Rachel
  OPENAI_MODEL: z.string().default('gpt-4o'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
}).refine(data => {
  if (data.LLM_PROVIDER === 'openai' && !data.OPENAI_API_KEY) return false;
  if (data.LLM_PROVIDER === 'gemini' && !data.GEMINI_API_KEY) return false;
  return true;
}, {
  message: "API key for the selected LLM_PROVIDER is missing",
  path: ['API_KEY'],
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedConfig: EnvConfig | null = null;

/**
 * Load and validate environment configuration.
 * Looks for .env file in current working directory, then project root.
 */
export function loadEnvConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  // Try loading from CWD first, then from the package root
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(new URL('.', import.meta.url).pathname, '../../.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath });
      break;
    }
  }

  const storeConfig = store.store;
  const envData = {
    ...process.env,
    LLM_PROVIDER: process.env.LLM_PROVIDER || storeConfig.llmProvider,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || storeConfig.openaiKey,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || storeConfig.geminiKey,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || storeConfig.elevenLabsKey,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || storeConfig.voiceId,
  };

  const result = EnvSchema.safeParse(envData);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `\n❌ Missing or invalid environment variables:\n${missing}\n\nRun 'donna init' to set up your configuration.\n`
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}

/**
 * Check if environment is configured (non-throwing)
 */
export function isConfigured(): boolean {
  try {
    loadEnvConfig();
    return true;
  } catch {
    return false;
  }
}
