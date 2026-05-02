'use client';
import type { TailorDiff } from '@/types/resume';

function Pill({ label, items, tone }: { label: string; items: string[]; tone: 'add' | 'skip' }) {
  if (!items.length) return null;
  const cls = tone === 'add'
    ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
    : 'border-zinc-700 bg-zinc-900/60 text-zinc-400';
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className={`rounded-md border px-2 py-0.5 text-xs ${cls}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export function DiffSummary({ diff }: { diff: TailorDiff }) {
  const totalAdded =
    diff.addedSkills.languages.length +
    diff.addedSkills.frameworks.length +
    diff.addedSkills.tools.length;

  return (
    <section className="mx-auto max-w-3xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">What changed</h2>
        <div className="text-xs text-zinc-500">
          {totalAdded} skills added · {diff.rewrittenBullets} bullets rewritten
          {diff.reorderedExperience && ' · experience reordered'}
          {diff.reorderedProjects && ' · projects reordered'}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Pill label="Languages +" items={diff.addedSkills.languages} tone="add" />
        <Pill label="Frameworks +" items={diff.addedSkills.frameworks} tone="add" />
        <Pill label="Tools +" items={diff.addedSkills.tools} tone="add" />
      </div>

      {diff.skippedSkills.length > 0 && (
        <details className="text-xs text-zinc-400">
          <summary className="cursor-pointer">
            Skipped {diff.skippedSkills.length} JD keywords (not found in your resume — add evidence to include)
          </summary>
          <div className="mt-2">
            <Pill label="" items={diff.skippedSkills} tone="skip" />
          </div>
        </details>
      )}

      {totalAdded === 0 && diff.rewrittenBullets === 0 && (
        <p className="text-xs text-zinc-500">
          No skills added. Tailor pass only reordered or polished phrasing — JD keywords either already present or not evidenced in your resume.
        </p>
      )}
    </section>
  );
}
