'use client';
import { motion } from 'framer-motion';
import type { Score } from '@/types/resume';

type Props = { before: Score; after: Score };

const DIM_LABELS: Record<keyof Score['dimensions'], string> = {
  actionVerbs: 'Action verbs',
  quantification: 'Quantification',
  keywordBreadth: 'Keyword breadth',
  bulletStrength: 'Bullet strength',
  clarity: 'Clarity',
  length: 'Length'
};

function Bar({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>{before} → {after}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-zinc-800">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: `${before}%` }}
          animate={{ width: `${after}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

export function ScoreCard({ before, after }: Props) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">ATS score</h3>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-400">{after.overall}</div>
          <div className="text-xs text-zinc-500">was {before.overall}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {(Object.keys(DIM_LABELS) as Array<keyof Score['dimensions']>).map((k) => (
          <Bar key={k} label={DIM_LABELS[k]} before={before.dimensions[k]} after={after.dimensions[k]} />
        ))}
      </div>
    </div>
  );
}
