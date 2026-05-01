'use client';
import { Eye, Download } from 'lucide-react';

type Props = {
  pdf: Blob | null;
  tex: string | null;
  onPreview: () => void;
  showPreview: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function ActionBar({ pdf, tex, onPreview, showPreview }: Props) {
  return (
    <div className="mx-auto flex max-w-4xl items-center justify-end gap-3 px-6 pb-6">
      <button
        disabled={!pdf}
        onClick={onPreview}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-40"
      >
        <Eye className="h-4 w-4" /> {showPreview ? 'Hide preview' : 'Preview'}
      </button>
      <button
        disabled={!pdf}
        onClick={() => pdf && downloadBlob(pdf, 'resume.pdf')}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
      >
        <Download className="h-4 w-4" /> Download .pdf
      </button>
      <button
        disabled={!tex}
        onClick={() => tex && downloadBlob(new Blob([tex], { type: 'application/x-tex' }), 'resume.tex')}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-40"
      >
        <Download className="h-4 w-4" /> Download .tex
      </button>
    </div>
  );
}
