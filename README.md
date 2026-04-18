# Donna CLI

> **Voice-First AI Developer Interface** — A next-generation CLI tool where you interact with your system using real-time voice.

Donna is a production-grade, npm-installable CLI that combines:
- 🎙️ **Real-time voice input** (ElevenLabs Scribe v2 STT)
- 🧠 **Intelligent AI agent** (OpenAI GPT-4o with tool calling)
- ⚡ **Tool execution** (file editing, shell commands)
- 🔊 **Voice output** (ElevenLabs streaming TTS)
- 💻 **Beautiful terminal UI** (Ink - React for CLI)

## Quick Start

```bash
# Install globally
npm install -g donna-cli

# Set up API keys
donna init

# Start a voice session
donna
```

## System Requirements

- **Node.js** >= 18
- **sox** (audio recording): `sudo apt install sox` / `brew install sox`
- **mpv** (audio playback): `sudo apt install mpv` / `brew install mpv`

## API Keys Required

| Service | Purpose | Get Key |
|---------|---------|---------|
| OpenAI | LLM (Default) | [platform.openai.com](https://platform.openai.com/api-keys) |
| Gemini | LLM (Alternative) | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| ElevenLabs | Voice STT + TTS | [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys) |

## Commands

```bash
donna              # Start voice assistant session
donna init         # Setup wizard (API keys, system check)
donna config       # View/edit configuration
donna config --list  # List all settings
donna --no-voice   # Text-only mode (no microphone/speaker)
donna --no-tts     # Voice input only (no spoken responses)
```

## Architecture

```
Mic → STT (ElevenLabs WebSocket) → Agent (OpenAI streaming) → CLI UI (Ink)
                                                             → TTS (ElevenLabs) → Speaker
```

### Project Structure

```
src/
├── cli/              # Terminal UI (Ink/React)
│   ├── app.tsx       # Root component
│   ├── components/   # UI components (Header, StatusBar, Response, etc.)
│   ├── hooks/        # React hooks (useVoice, useAgent, useSession)
│   └── theme.ts      # Design system (colors, prefixes)
├── voice/            # Voice I/O
│   ├── microphone.ts # Mic capture (node-record-lpcm16)
│   ├── stt.ts        # ElevenLabs Realtime STT
│   ├── tts.ts        # ElevenLabs Streaming TTS
│   ├── speaker.ts    # Audio playback (mpv)
│   └── index.ts      # VoiceManager orchestrator
├── agent/            # AI Agent
│   └── agent.ts      # Core agent loop (think → tool → respond)
├── tools/            # Tool system
│   ├── base.ts       # Tool interface
│   ├── registry.ts   # Tool registry + plugin loader
│   ├── file-editor.ts  # File read/write/edit
│   └── shell-executor.ts  # Shell command runner
├── llm/              # LLM providers
│   ├── provider.ts   # Provider interface
│   └── openai.ts     # OpenAI streaming implementation
├── memory/           # Conversation context
│   └── context.ts    # Message history management
├── pipeline/         # Streaming pipeline
│   ├── events.ts     # Typed event bus
│   └── orchestrator.ts  # Central coordinator
└── config/           # Configuration
    ├── env.ts        # Environment variable loader
    ├── store.ts      # Persistent config (conf)
    └── init.ts       # Setup wizard
```

## Built-in Tools

| Tool | Description | Safety |
|------|-------------|--------|
| `read_file` | Read file contents | ✅ Safe |
| `write_file` | Create or overwrite files | ⚠️ Requires confirmation |
| `edit_file` | Search & replace in files | ⚠️ Requires confirmation |
| `run_command` | Execute shell commands | ⚠️ Requires confirmation |

## Adding Custom Tools (Plugins)

Create a tool file that exports a `Tool` object:

```typescript
import { z } from 'zod';
import type { Tool } from 'donna-cli/tools/base';

const myTool: Tool = {
  name: 'my_custom_tool',
  description: 'Does something useful',
  parameters: z.object({
    input: z.string(),
  }),
  safetyLevel: 'safe',
  async execute(args) {
    return { success: true, output: `Result: ${args.input}` };
  },
};

export default myTool;
```

## Security

- ❌ Dangerous shell commands are blocked (rm -rf /, sudo rm, dd, etc.)
- ⚠️ File writes and shell commands require user confirmation
- 🔒 File paths are sandboxed to the current working directory
- 🔑 API keys stored in `.env` (never logged or transmitted elsewhere)

## Development

```bash
# Clone and install
git clone <repo>
cd DonnaCLI
npm install

# Build
npm run build

# Link for local development
npm link

# Run in dev mode
npm run dev  # watches for changes
```

## License

MIT
