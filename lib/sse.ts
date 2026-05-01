import type { PipelineEvent } from '@/types/resume';

export function encodeSSE(ev: PipelineEvent): string {
  const data = JSON.stringify(ev);
  return `event: ${ev.type}\ndata: ${data}\n\n`;
}

export function parseSSE(stream: string): PipelineEvent[] {
  const out: PipelineEvent[] = [];
  for (const block of stream.split('\n\n')) {
    if (!block.trim()) continue;
    const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
    if (!dataLine) continue;
    out.push(JSON.parse(dataLine.slice('data: '.length)) as PipelineEvent);
  }
  return out;
}
