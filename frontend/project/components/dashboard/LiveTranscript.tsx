'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';
import type { TranscriptMessage } from '@/lib/types';

interface LiveTranscriptProps {
  messages: TranscriptMessage[];
  active: boolean;
}

export function LiveTranscript({ messages, active }: LiveTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden shrink-0 h-[200px] lg:h-[260px] max-h-[300px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Live Transcript
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
            )}
          />
          <span className="text-xs text-muted-foreground">
            {active ? 'Live' : 'Idle'}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
              <Bot className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Start a call to see the live conversation here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const isAssistant = m.speaker === 'assistant';
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex gap-2.5 animate-fade-in-up',
                    isAssistant ? 'justify-start' : 'justify-end'
                  )}
                >
                  {isAssistant && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      isAssistant
                        ? 'bg-secondary text-secondary-foreground rounded-tl-sm'
                        : 'bg-navy text-white rounded-tr-sm'
                    )}
                  >
                    <span
                      className={cn(
                        'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide',
                        isAssistant ? 'text-teal' : 'text-white/60'
                      )}
                    >
                      {isAssistant ? 'AI Assistant' : 'Patient'}
                    </span>
                    <p>{m.text}</p>
                    <span
                      className={cn(
                        'mt-1 block text-[10px] tracking-wide',
                        isAssistant
                          ? 'text-muted-foreground'
                          : 'text-white/50'
                      )}
                    >
                      {formatTime(m.timestamp)}
                    </span>
                  </div>
                  {!isAssistant && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-white mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
