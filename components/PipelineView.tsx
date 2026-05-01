'use client';
import { StepCard } from './StepCard';
import type { PipelineEvent, PipelineStepStatus } from '@/types/resume';

type Step = { id: string; label: string; status: PipelineStepStatus; durationMs?: number; payload?: unknown };

function summarize(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  if ('keywords' in obj && Array.isArray(obj.keywords)) {
    return `${obj.keywords.length} keywords, role: ${String(obj.role ?? '')}`;
  }
  if ('exp' in obj || 'projects' in obj) {
    return `${obj.exp ?? 0} roles, ${obj.projects ?? 0} projects`;
  }
  return undefined;
}

export function PipelineView({ events }: { events: PipelineEvent[] }) {
  const steps = new Map<string, Step>();
  for (const ev of events) {
    if (ev.type !== 'step') continue;
    const prev = steps.get(ev.id);
    steps.set(ev.id, {
      id: ev.id,
      label: ev.label,
      status: ev.status,
      durationMs: ev.durationMs ?? prev?.durationMs,
      payload: ev.payload ?? prev?.payload
    });
  }
  const ordered = Array.from(steps.values());
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-6">
      {ordered.map((s) => (
        <StepCard key={s.id} status={s.status} label={s.label}
          durationMs={s.durationMs} payloadSummary={summarize(s.payload)} />
      ))}
    </div>
  );
}
