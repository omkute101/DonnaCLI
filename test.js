import { config } from 'dotenv';
import { resolve } from 'path';

const dotenvPath = resolve(process.cwd(), '.env');
config({ path: dotenvPath });

console.log(process.env.LLM_PROVIDER, process.env.GEMINI_API_KEY, process.env.ELEVENLABS_API_KEY);
