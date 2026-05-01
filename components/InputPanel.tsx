'use client';
import { useState } from 'react';
import { extractPdfText } from '@/lib/pdf';
import { Upload, FileText } from 'lucide-react';

type Props = {
  showJd: boolean;
  onSubmit: (data: { resumeText: string; jdText: string }) => void;
  submitting: boolean;
};

export function InputPanel({ showJd, onSubmit, submitting }: Props) {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setPdfErr(null);
    setParsing(true);
    try {
      const text = await extractPdfText(file);
      setResumeText(text);
    } catch (e) {
      setPdfErr((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  const canSubmit = !!resumeText.trim() && (!showJd || !!jdText.trim()) && !submitting;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <section>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" /> Your resume
        </label>
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <Upload className="h-4 w-4" />
            <span>{parsing ? 'Reading PDF…' : 'Upload PDF (max 5 MB)'}</span>
            <input
              type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
          </label>
          {pdfErr && <p className="mt-2 text-sm text-red-400">{pdfErr}</p>}
          <textarea
            className="mt-3 h-48 w-full resize-y rounded-lg bg-zinc-950 p-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-emerald-500"
            placeholder="…or paste resume text here"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>
      </section>

      {showJd && (
        <section>
          <label className="mb-2 block text-sm font-medium">Job description</label>
          <textarea
            className="h-48 w-full resize-y rounded-xl bg-zinc-900 p-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-emerald-500"
            placeholder="Paste the JD"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </section>
      )}

      <button
        disabled={!canSubmit}
        onClick={() => onSubmit({ resumeText, jdText })}
        className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'Building…' : 'Build resume'}
      </button>
    </div>
  );
}
