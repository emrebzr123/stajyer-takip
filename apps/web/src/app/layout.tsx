import type { Metadata } from 'next';
import './globals.css';
import ToasterProvider from '@/components/ui/ToasterProvider';

export const metadata: Metadata = {
  title: 'Stajyer Takip Sistemi',
  description: 'Stajyer ve görev yönetim platformu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
