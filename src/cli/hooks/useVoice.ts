/**
 * useVoice Hook
 *
 * Bridges the VoiceManager to the React/Ink UI.
 * Exposes transcript state, listening status, and voice controls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus, type STTPartialEvent, type STTCommittedEvent, type SessionStateChangeEvent } from '../../pipeline/events.js';

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  partialTranscript: string;
  committedTranscript: string;
  lastCommitted: string;
}

export function useVoice() {
  const [voice, setVoice] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    partialTranscript: '',
    committedTranscript: '',
    lastCommitted: '',
  });

  const committedRef = useRef('');

  useEffect(() => {
    const onPartial = (event: STTPartialEvent) => {
      setVoice((prev) => ({
        ...prev,
        partialTranscript: event.text,
      }));
    };

    const onCommitted = (event: STTCommittedEvent) => {
      committedRef.current = event.text;
      setVoice((prev) => ({
        ...prev,
        partialTranscript: '',
        committedTranscript: event.text,
        lastCommitted: event.text,
      }));
    };

    const onStateChange = (event: SessionStateChangeEvent) => {
      setVoice((prev) => ({
        ...prev,
        isListening: event.to === 'listening',
        isSpeaking: event.to === 'speaking',
      }));

      if (event.to === 'thinking') {
        setVoice((prev) => ({
          ...prev,
          partialTranscript: '',
        }));
      }
    };

    eventBus.on('stt:partial', onPartial);
    eventBus.on('stt:committed', onCommitted);
    eventBus.on('session:stateChange', onStateChange);

    return () => {
      eventBus.off('stt:partial', onPartial);
      eventBus.off('stt:committed', onCommitted);
      eventBus.off('session:stateChange', onStateChange);
    };
  }, []);

  const clearTranscripts = useCallback(() => {
    committedRef.current = '';
    setVoice((prev) => ({
      ...prev,
      partialTranscript: '',
      committedTranscript: '',
    }));
  }, []);

  return {
    ...voice,
    clearTranscripts,
  };
}
