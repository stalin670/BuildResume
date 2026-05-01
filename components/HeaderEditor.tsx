'use client';
import { useState } from 'react';
import type { ResumeHeader } from '@/types/resume';

type Props = {
  initial: ResumeHeader;
  onConfirm: (h: ResumeHeader) => void;
};

export function HeaderEditor({ initial, onConfirm }: Props) {
  const [h, setH] = useState<ResumeHeader>({ ...initial });
  const valid = !!h.name.trim() && !!h.email.trim() && !!h.phone.trim();

  const set = <K extends keyof ResumeHeader>(k: K, v: string) =>
    setH({ ...h, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-4 text-lg font-semibold">Confirm your details</h3>
        <div className="space-y-3">
          {(['name', 'email', 'phone', 'portfolio', 'github', 'linkedin'] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-xs text-zinc-400 capitalize">{k}{['name','email','phone'].includes(k) ? ' *' : ''}</span>
              <input
                className="mt-1 w-full rounded-lg bg-zinc-950 p-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-emerald-500"
                value={h[k] ?? ''}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
        </div>
        <button
          disabled={!valid}
          onClick={() => onConfirm(h)}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-black disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
