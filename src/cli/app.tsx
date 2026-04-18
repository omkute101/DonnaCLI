/**
 * Donna CLI — Root Application Component
 *
 * This is the main Ink React component that renders the entire UI.
 * Composes all sub-components and manages the top-level layout.
 *
 * Layout:
 *   ┌─────────────────────┐
 *   │      Header          │
 *   │      StatusBar       │
 *   │      Transcript      │
 *   │      ToolExecution   │
 *   │      Response        │
 *   │      Confirmation    │
 *   │      Footer          │
 *   └─────────────────────┘
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { Transcript } from './components/Transcript.js';
import { Response } from './components/Response.js';
import { ToolExecution } from './components/ToolExecution.js';
import { Confirmation } from './components/Confirmation.js';
import { useSession } from './hooks/useSession.js';
import { useVoice } from './hooks/useVoice.js';
import { useAgent } from './hooks/useAgent.js';
import type { Orchestrator } from '../pipeline/orchestrator.js';

interface AppProps {
  orchestrator: Orchestrator;
}

export const App: React.FC<AppProps> = ({ orchestrator }) => {
  const { exit } = useApp();
  const session = useSession();
  const voice = useVoice();
  const agent = useAgent();
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // ── Initialize orchestrator on mount ────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await orchestrator.start();
        if (mounted) setInitialized(true);
      } catch (error) {
        if (mounted) {
          setInitError(error instanceof Error ? error.message : String(error));
        }
      }
    }

    init();

    return () => {
      mounted = false;
      orchestrator.shutdown();
    };
  }, [orchestrator]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useInput((input, key) => {
    // Ctrl+C — exit
    if (key.ctrl && input === 'c') {
      orchestrator.shutdown();
      exit();
      return;
    }

    // Escape — cancel current operation
    if (key.escape) {
      orchestrator.interrupt();
      return;
    }
  });

  // ── Error State ─────────────────────────────────────────────────────────
  if (initError) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header compact />
        <Box paddingX={1} paddingY={1}>
          <Text color="#ff3366">❌ Failed to initialize: {initError}</Text>
        </Box>
        <Box paddingX={1}>
          <Text color="#6b7280">
            Make sure your API keys are set. Run: donna init
          </Text>
        </Box>
      </Box>
    );
  }

  // ── Loading State ───────────────────────────────────────────────────────
  if (!initialized) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box paddingX={1} paddingY={1}>
          <Text color="#00f0ff">⟳ Initializing voice system...</Text>
        </Box>
      </Box>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Header compact />

      {/* Divider */}
      <Box paddingX={1}>
        <Text color="#1e3a5f">{'─'.repeat(50)}</Text>
      </Box>

      {/* Status Bar */}
      <StatusBar
        state={session.state}
        detail={session.stateDetail}
      />

      {/* Error display */}
      {session.error && (
        <Box paddingX={2} marginBottom={1}>
          <Text color="#ff3366">❌ {session.error}</Text>
        </Box>
      )}

      {/* Live transcript */}
      <Transcript
        partial={voice.partialTranscript}
        committed={voice.committedTranscript}
        visible={session.state === 'listening' || !!voice.partialTranscript || !!voice.committedTranscript}
      />

      {/* Tool executions */}
      <ToolExecution executions={agent.toolExecutions} />

      {/* Confirmation prompt */}
      {agent.pendingConfirmation && (
        <Confirmation
          id={agent.pendingConfirmation.id}
          toolName={agent.pendingConfirmation.toolName}
          description={agent.pendingConfirmation.description}
          args={agent.pendingConfirmation.args}
          onResponse={agent.respondToConfirmation}
        />
      )}

      {/* LLM Response */}
      <Response
        content={agent.response}
        isStreaming={agent.isStreaming}
      />

      {/* Footer */}
      <Box paddingX={1} marginTop={1}>
        <Text color="#1e3a5f">{'─'.repeat(50)}</Text>
      </Box>
      <Box paddingX={1} paddingBottom={1}>
        <Text color="#4b5563">
          <Text color="#6b7280">ESC</Text> cancel  
          <Text color="#6b7280">Ctrl+C</Text> exit  
          <Text color="#6b7280">CWD:</Text> {process.cwd()}
        </Text>
      </Box>
    </Box>
  );
};
