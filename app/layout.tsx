import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'halketon',
  description: 'Google Drive OAuth + operaciones de archivos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
