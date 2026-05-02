'use client';
import { useState, useCallback } from 'react';
import { parseSSE } from '@/lib/sse';
import type { GenerateRequest, PipelineEvent, Score, TailorDiff } from '@/types/resume';

export type GenerateState = {
  events: PipelineEvent[];
  tex: string | null;
  before?: Score;
  after?: Score;
  diff?: TailorDiff;
  error: string | null;
  running: boolean;
};

const initial: GenerateState = {
  events: [], tex: null, error: null, running: false
};

export function useGenerate() {
  const [state, setState] = useState<GenerateState>(initial);

  const start = useCallback(async (req: GenerateRequest) => {
    setState({ ...initial, running: true });
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.body) {
      setState((s) => ({ ...s, error: 'No stream', running: false }));
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let acc: GenerateState = { ...initial, running: true };
    setState(acc);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const sep = buffer.lastIndexOf('\n\n');
      if (sep < 0) continue;
      const consumed = buffer.slice(0, sep + 2);
      buffer = buffer.slice(sep + 2);
      const events = parseSSE(consumed);
      for (const ev of events) {
        if (ev.type === 'final') {
          acc = { ...acc, tex: ev.tex, before: ev.before, after: ev.after };
        } else if (ev.type === 'diff') {
          acc = { ...acc, diff: ev.diff };
        } else if (ev.type === 'error') {
          acc = { ...acc, error: ev.message };
        } else {
          acc = { ...acc, events: [...acc.events, ev] };
        }
      }
      setState({ ...acc });
    }
    setState({ ...acc, running: false });
  }, []);

  return { state, start };
}
