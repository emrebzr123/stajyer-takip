import type { Metadata, Viewport } from 'next';
import './globals.css';
import ToasterProvider from '@/components/ui/ToasterProvider';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Stajyer Takip Sistemi',
  description: 'Stajyer ve görev yönetim platformu',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Stajyer Takip',
  },
};

// Next.js 13.4+'ta themeColor/viewport artık metadata değil, ayrı bir
// `viewport` export'u üzerinden verilir.
export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <ToasterProvider />
        {/* Service worker kaydı — PWA "ana ekrana ekle" kurulabilirliği ve
            push bildirimlerinin telefon kilitliyken/uygulama kapalıyken de
            gösterilebilmesi için şart. */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
