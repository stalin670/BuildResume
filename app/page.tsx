import { ModePicker } from '@/components/ModePicker';

export default function Home() {
  return (
    <main>
      <header className="mx-auto max-w-4xl px-6 pt-16">
        <h1 className="text-3xl font-bold">BuildResume</h1>
        <p className="mt-2 text-zinc-400">AI resume builder — pick a mode.</p>
      </header>
      <ModePicker />
    </main>
  );
}
