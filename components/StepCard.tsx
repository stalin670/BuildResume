'use client';
import { Check, Circle, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PipelineStepStatus } from '@/types/resume';

type Props = {
  status: PipelineStepStatus;
  label: string;
  durationMs?: number;
  payloadSummary?: string;
};

export function StepCard({ status, label, durationMs, payloadSummary }: Props) {
  const Icon = {
    pending: Circle,
    running: Loader2,
    done: Check,
    error: X
  }[status];
  const tint = {
    pending: 'text-zinc-500',
    running: 'text-amber-400',
    done: 'text-emerald-400',
    error: 'text-red-400'
  }[status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <Icon className={`h-5 w-5 ${tint} ${status === 'running' ? 'animate-spin' : ''}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {durationMs != null && (
            <span className="text-xs text-zinc-500">{durationMs} ms</span>
          )}
        </div>
        {payloadSummary && (
          <p className="mt-1 text-xs text-zinc-400">{payloadSummary}</p>
        )}
      </div>
    </motion.div>
  );
}
