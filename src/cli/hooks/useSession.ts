/**
 * useSession Hook
 *
 * Manages the session state machine and provides state to all components.
 * Subscribes to the event bus for state transitions.
 */

import { useState, useEffect, useCallback } from 'react';
import { eventBus, type SessionState, type SessionStateChangeEvent, type PipelineErrorEvent } from '../../pipeline/events.js';

interface SessionData {
  state: SessionState;
  stateDetail: string;
  error: string | null;
  messageCount: number;
}

export function useSession() {
  const [session, setSession] = useState<SessionData>({
    state: 'idle',
    stateDetail: '',
    error: null,
    messageCount: 0,
  });

  useEffect(() => {
    const onStateChange = (event: SessionStateChangeEvent) => {
      setSession((prev) => ({
        ...prev,
        state: event.to,
        stateDetail: '',
        error: event.to === 'error' ? prev.error : null,
      }));
    };

    const onError = (event: PipelineErrorEvent) => {
      setSession((prev) => ({
        ...prev,
        error: `[${event.source}] ${event.error.message}`,
      }));
    };

    eventBus.on('session:stateChange', onStateChange);
    eventBus.on('pipeline:error', onError);

    return () => {
      eventBus.off('session:stateChange', onStateChange);
      eventBus.off('pipeline:error', onError);
    };
  }, []);

  const clearError = useCallback(() => {
    setSession((prev) => ({ ...prev, error: null }));
  }, []);

  const incrementMessages = useCallback(() => {
    setSession((prev) => ({ ...prev, messageCount: prev.messageCount + 1 }));
  }, []);

  return {
    ...session,
    clearError,
    incrementMessages,
  };
}
