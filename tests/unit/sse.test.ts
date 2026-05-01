import { describe, it, expect } from 'vitest';
import { encodeSSE, parseSSE } from '@/lib/sse';

describe('SSE helpers', () => {
  it('encodes a single event with type + JSON data', () => {
    const out = encodeSSE({ type: 'step', id: 'parse', status: 'running', label: 'X' });
    expect(out).toContain('event: step');
    expect(out).toContain('data: {');
    expect(out.endsWith('\n\n')).toBe(true);
  });

  it('round-trips a stream of events', () => {
    const events = [
      { type: 'step' as const, id: 'a', status: 'running' as const, label: 'A' },
      { type: 'step' as const, id: 'a', status: 'done' as const, label: 'A', durationMs: 5 }
    ];
    const stream = events.map(encodeSSE).join('');
    const parsed = parseSSE(stream);
    expect(parsed).toEqual(events);
  });
});
