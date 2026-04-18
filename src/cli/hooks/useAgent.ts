/**
 * useAgent Hook
 *
 * Bridges the Agent system to the React/Ink UI.
 * Tracks streaming response, tool executions, and confirmation requests.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  eventBus,
  type SessionStateChangeEvent,
  type LLMChunkEvent,
  type LLMDoneEvent,
  type ToolExecutingEvent,
  type ToolResultEvent,
  type ConfirmationRequestEvent,
} from '../../pipeline/events.js';
import type { ToolExecutionInfo } from '../components/ToolExecution.js';

interface AgentState {
  isThinking: boolean;
  response: string;
  isStreaming: boolean;
  toolExecutions: ToolExecutionInfo[];
  pendingConfirmation: ConfirmationRequestEvent | null;
}

export function useAgent() {
  const [agent, setAgent] = useState<AgentState>({
    isThinking: false,
    response: '',
    isStreaming: false,
    toolExecutions: [],
    pendingConfirmation: null,
  });

  useEffect(() => {
    const onStateChange = (event: SessionStateChangeEvent) => {
      if (event.to === 'thinking') {
        setAgent((prev) => ({
          ...prev,
          isThinking: true,
          response: '',
          isStreaming: true,
          toolExecutions: [],
        }));
      }
    };

    const onChunk = (event: LLMChunkEvent) => {
      setAgent((prev) => ({
        ...prev,
        response: prev.response + event.content,
        isStreaming: true,
        isThinking: false,
      }));
    };

    const onDone = (event: LLMDoneEvent) => {
      setAgent((prev) => ({
        ...prev,
        response: event.fullResponse,
        isStreaming: false,
        isThinking: false,
      }));
    };

    const onToolExecuting = (event: ToolExecutingEvent) => {
      setAgent((prev) => ({
        ...prev,
        toolExecutions: [
          ...prev.toolExecutions,
          {
            id: event.id,
            name: event.name,
            args: event.args,
            status: 'executing' as const,
          },
        ],
      }));
    };

    const onToolResult = (event: ToolResultEvent) => {
      setAgent((prev) => ({
        ...prev,
        toolExecutions: prev.toolExecutions.map((te) =>
          te.id === event.id
            ? { ...te, status: event.success ? 'success' as const : 'error' as const, result: event.result }
            : te
        ),
      }));
    };

    const onConfirmationRequest = (event: ConfirmationRequestEvent) => {
      setAgent((prev) => ({
        ...prev,
        pendingConfirmation: event,
      }));
    };

    eventBus.on('session:stateChange', onStateChange);
    eventBus.on('llm:chunk', onChunk);
    eventBus.on('llm:done', onDone);
    eventBus.on('tool:executing', onToolExecuting);
    eventBus.on('tool:result', onToolResult);
    eventBus.on('confirmation:request', onConfirmationRequest);

    return () => {
      eventBus.off('session:stateChange', onStateChange);
      eventBus.off('llm:chunk', onChunk);
      eventBus.off('llm:done', onDone);
      eventBus.off('tool:executing', onToolExecuting);
      eventBus.off('tool:result', onToolResult);
      eventBus.off('confirmation:request', onConfirmationRequest);
    };
  }, []);

  const respondToConfirmation = useCallback((id: string, approved: boolean) => {
    eventBus.emit('confirmation:response', {
      id,
      approved,
      timestamp: Date.now(),
    });
    setAgent((prev) => ({ ...prev, pendingConfirmation: null }));
  }, []);

  const clearResponse = useCallback(() => {
    setAgent((prev) => ({
      ...prev,
      response: '',
      isStreaming: false,
      toolExecutions: [],
    }));
  }, []);

  return {
    ...agent,
    respondToConfirmation,
    clearResponse,
  };
}
