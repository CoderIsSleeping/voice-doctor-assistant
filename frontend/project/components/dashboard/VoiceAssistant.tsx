'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Signal, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';
import type { CallState, TranscriptMessage } from '@/lib/types';

interface VoiceAssistantProps {
  callState: CallState;
  callDuration: number;
  onStartCall: () => void;
  onEndCall: () => void;
  transcript: TranscriptMessage[];
}

const STATE_LABEL: Record<CallState, string> = {
  idle: 'Ready to call',
  connecting: 'Connecting…',
  listening: 'Listening',
  speaking: 'Assistant speaking',
};

export function VoiceAssistant({
  callState,
  callDuration,
  onStartCall,
  onEndCall,
  transcript,
}: VoiceAssistantProps) {
  const isCallActive = callState !== 'idle';
  const isAnimating = callState === 'listening' || callState === 'speaking';
  const lastSpeaker = transcript[transcript.length - 1]?.speaker;

  // Whether the central orb represents the assistant speaking
  const speaking = callState === 'speaking' || lastSpeaker === 'assistant';

  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div className="relative w-[260px] animate-fade-in-up">
        {/* Soft glow */}
        <div
          className={cn(
            'absolute -inset-3 rounded-[3rem] blur-2xl transition-opacity duration-700',
            isCallActive ? 'opacity-60' : 'opacity-20'
          )}
          style={{
            background:
              'radial-gradient(circle at 50% 35%, hsl(172 76% 36% / 0.5), transparent 70%)',
          }}
        />

        <div className="relative rounded-[2.5rem] border-[3px] border-navy/15 bg-navy-gradient p-3 shadow-2xl shadow-navy/30">
          {/* Notch */}
          <div className="absolute left-1/2 top-3 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black/40" />

          {/* Screen */}
          <div className="relative h-[330px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-navy-light to-navy px-4 py-5">
            {/* Status bar */}
            <div className="flex items-center justify-between text-[10px] text-white/60 mb-4 mt-1">
              <span>{formatDuration(callDuration)}</span>
              <div className="flex items-center gap-1">
                <Signal className="h-3 w-3" />
                <span>VoIP</span>
              </div>
            </div>

            {/* Branding */}
            <div className="flex flex-col items-center mb-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-gradient">
                  <Waves className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-white">
                  CareVoice
                </span>
                <span className="text-sm font-light text-teal-light">AI</span>
              </div>
              <span className="text-[10px] text-white/40 mt-0.5">
                AI Doctor Appointment Assistant
              </span>
            </div>

            {/* Voice visualizer */}
            <div className="relative flex h-28 items-center justify-center">
              {/* Outer pulse rings */}
              {isAnimating && (
                <>
                  <div className="absolute h-28 w-28 rounded-full border border-teal/40 animate-pulse-ring" />
                  <div
                    className="absolute h-28 w-28 rounded-full border border-primary/30 animate-pulse-ring"
                    style={{ animationDelay: '0.5s' }}
                  />
                </>
              )}

              {/* Rotating ring while connecting */}
              {callState === 'connecting' && (
                <div className="absolute h-28 w-28 rounded-full border-2 border-transparent border-t-teal border-r-primary animate-spin-slow" />
              )}

              {/* Central orb */}
              <div
                className={cn(
                  'relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500',
                  isCallActive
                    ? 'bg-teal-gradient shadow-lg shadow-teal/40'
                    : 'bg-white/10',
                  speaking && isAnimating && 'animate-breathe'
                )}
              >
                {callState === 'idle' ? (
                  <Phone className="h-7 w-7 text-white/70" />
                ) : (
                  <Waves
                    className={cn(
                      'h-7 w-7 text-white transition-transform',
                      isAnimating && 'scale-110'
                    )}
                  />
                )}
              </div>
            </div>

            {/* Waveform */}
            <div className="flex h-9 items-center justify-center gap-1 mt-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const active = isAnimating;
                const center = Math.abs(i - 11.5);
                const base = active ? 1 - center / 14 : 0.08;
                return (
                  <div
                    key={i}
                    className={cn(
                      'w-1 rounded-full transition-all',
                      active
                        ? speaking
                          ? 'bg-teal'
                          : 'bg-primary'
                        : 'bg-white/20'
                    )}
                    style={{
                      height: `${Math.max(8, base * 40)}px`,
                      animation: active
                        ? `wave ${0.8 + (i % 5) * 0.1}s ease-in-out ${i * 0.04}s infinite`
                        : 'none',
                    }}
                  />
                );
              })}
            </div>

            {/* Connection status */}
            <div className="mt-2 flex flex-col items-center">
              <span className="text-xs font-medium text-white/90">
                {STATE_LABEL[callState]}
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    callState === 'idle' && 'bg-white/30',
                    callState === 'connecting' && 'bg-amber-400 animate-pulse',
                    callState === 'listening' && 'bg-emerald-400 animate-pulse',
                    callState === 'speaking' && 'bg-teal animate-pulse'
                  )}
                />
                <span className="text-[10px] text-white/50">
                  {callState === 'idle'
                    ? 'Tap start to begin'
                    : callState === 'connecting'
                      ? 'Establishing secure link'
                      : 'Secure connection active'}
                </span>
              </div>
            </div>

            {/* Call controls */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
              {!isCallActive ? (
                <button
                  onClick={onStartCall}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-gradient text-white shadow-lg shadow-teal/40 transition-transform hover:scale-105 active:scale-95"
                  aria-label="Start call"
                >
                  <Phone className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={onEndCall}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-white shadow-lg shadow-destructive/40 transition-transform hover:scale-105 active:scale-95"
                  aria-label="End call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-[280px] text-center text-xs text-muted-foreground">
        Powered by Pipecat, ElevenLabs &amp; Google LLM — voice booking demo
      </p>
    </div>
  );
}
