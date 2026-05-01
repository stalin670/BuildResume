'use client';
import { useEffect, useState } from 'react';

export function ResumePreview({ pdf }: { pdf: Blob | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pdf) { setUrl(null); return; }
    const u = URL.createObjectURL(pdf);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pdf]);
  if (!pdf || !url) return null;
  return (
    <iframe
      title="Resume preview"
      src={url}
      className="mx-auto h-[80vh] w-full max-w-4xl rounded-xl border border-zinc-800"
    />
  );
}
