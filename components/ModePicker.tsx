'use client';
import Link from 'next/link';
import { Wand2, Target } from 'lucide-react';

export function ModePicker() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-6 py-16 md:grid-cols-2">
      <Link href="/tailor"
        className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-emerald-500 hover:bg-zinc-900/60">
        <Target className="mb-4 h-8 w-8 text-emerald-400" />
        <h2 className="text-xl font-semibold">Tailor to JD</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a job description and your resume — get an ATS-aligned resume in seconds.
        </p>
      </Link>
      <Link href="/enhance"
        className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-violet-500 hover:bg-zinc-900/60">
        <Wand2 className="mb-4 h-8 w-8 text-violet-400" />
        <h2 className="text-xl font-semibold">Enhance Resume</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Boost your existing resume's ATS score. Before/after breakdown included.
        </p>
      </Link>
    </div>
  );
}
