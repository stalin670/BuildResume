import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BuildResume',
  description: 'AI resume builder — ATS-tailored, LaTeX rendered'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
