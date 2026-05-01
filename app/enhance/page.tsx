'use client';
import { useState, useEffect } from 'react';
import { InputPanel } from '@/components/InputPanel';
import { PipelineView } from '@/components/PipelineView';
import { ResumePreview } from '@/components/ResumePreview';
import { ActionBar } from '@/components/ActionBar';
import { ScoreCard } from '@/components/ScoreCard';
import { useGenerate } from '@/lib/useGenerate';
import { compileTex } from '@/lib/latex/compile';
import Link from 'next/link';

export default function EnhancePage() {
  const { state, start } = useGenerate();
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [compileLog, setCompileLog] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!state.tex) return;
    setPdf(null);
    setCompileLog(null);
    void compileTex(state.tex).then((r) => {
      setPdf(r.pdf);
      if (!r.pdf) setCompileLog(r.log);
    });
  }, [state.tex]);

  return (
    <main>
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Back</Link>
        <h1 className="text-xl font-semibold">Enhance Resume</h1>
        <span />
      </header>
      {state.events.length === 0 && !state.running ? (
        <InputPanel
          showJd={false}
          submitting={state.running}
          onSubmit={(d) => start({ mode: 'enhance', resumeText: d.resumeText })}
        />
      ) : (
        <>
          <PipelineView events={state.events} />
          {state.before && state.after && (
            <div className="px-6 pb-6">
              <ScoreCard before={state.before} after={state.after} />
            </div>
          )}
          {state.error && (
            <div className="mx-auto max-w-3xl px-6 pb-4 text-sm text-red-400">
              Error: {state.error}
            </div>
          )}
          {compileLog && (
            <details className="mx-auto max-w-3xl rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm">
              <summary className="cursor-pointer">PDF compile failed — open log</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{compileLog}</pre>
            </details>
          )}
          <ActionBar
            pdf={pdf} tex={state.tex}
            showPreview={showPreview}
            onPreview={() => setShowPreview((v) => !v)}
          />
          {showPreview && <ResumePreview pdf={pdf} />}
        </>
      )}
    </main>
  );
}
