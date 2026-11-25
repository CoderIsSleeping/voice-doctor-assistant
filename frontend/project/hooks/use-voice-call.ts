'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CallState, TranscriptMessage } from '@/lib/types';

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg-${msgCounter}`;
}

interface UseVoiceCallResult {
  callState: CallState;
  callDuration: number;
  transcript: TranscriptMessage[];
  startCall: () => void;
  endCall: () => void;
}

/**
 * Mock voice-call controller. Handles idle -> connecting -> listening/speaking
 * state transitions and feeds a scripted transcript so the demo UI is alive.
 *
 * Real WebRTC + Pipecat integration replaces only the internals of this hook;
 * the public shape (callState / startCall / endCall) stays the same.
 */
export function useVoiceCall(): UseVoiceCallResult {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptIndexRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // A short scripted conversation. The UI label makes clear this is mock.
  const SCRIPT: Array<{ speaker: 'patient' | 'assistant'; text: string }> = [
    {
      speaker: 'assistant',
      text: 'Hi, this is CareVoice AI. How can I help you with your appointment today?',
    },
    {
      speaker: 'patient',
      text: 'I need to book a check-up with a cardiologist sometime this week.',
    },
    {
      speaker: 'assistant',
      text: "Sure. Dr. Sarah Mitchell is a cardiologist with 14 years of experience and has openings today at 9:00 AM or 11:30 AM. Which suits you?",
    },
    {
      speaker: 'patient',
      text: '11:30 sounds good. Please book that.',
    },
    {
      speaker: 'assistant',
      text: 'Done — I have booked Dr. Sarah Mitchell today at 11:30 AM. You will see it under your upcoming appointments. Anything else?',
    },
    {
      speaker: 'patient',
      text: "No, that's all. Thank you.",
    },
    {
      speaker: 'assistant',
      text: 'You are welcome. Take care, and have a great day!',
    },
  ];

  const pushScriptStep = useCallback(() => {
    setTranscript((prev) => {
      const step = SCRIPT[scriptIndexRef.current];
      if (!step) return prev;
      scriptIndexRef.current += 1;
      const msg: TranscriptMessage = {
        id: nextId(),
        speaker: step.speaker,
        text: step.text,
        timestamp: Date.now(),
      };
      // Flip the call state to match who is talking
      setCallState(step.speaker === 'assistant' ? 'speaking' : 'listening');
      return [...prev, msg];
    });
  }, [SCRIPT]);

  const startCall = useCallback(() => {
    clearTimers();
    setCallState('connecting');
    setCallDuration(0);
    setTranscript([]);
    scriptIndexRef.current = 0;

    // connecting -> first message
    timersRef.current.push(
      setTimeout(() => {
        pushScriptStep();
      }, 2200)
    );

    // schedule remaining scripted steps at intervals
    for (let i = 1; i < SCRIPT.length; i++) {
      timersRef.current.push(
        setTimeout(() => {
          pushScriptStep();
        }, 2200 + i * 3600)
      );
    }

    // duration ticker
    intervalRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, [clearTimers, pushScriptStep]);

  const endCall = useCallback(() => {
    clearTimers();
    setCallState('idle');
    setCallDuration(0);
  }, [clearTimers]);

  // When the script finishes, settle into a listening idle state.
  useEffect(() => {
    if (callState === 'idle') return;
    if (scriptIndexRef.current >= SCRIPT.length) {
      const t = setTimeout(() => setCallState('listening'), 1500);
      return () => clearTimeout(t);
    }
  }, [callState, SCRIPT.length]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { callState, callDuration, transcript, startCall, endCall };
}
