'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Uygulama her açıldığında (giriş yapılmış olsun ya da olmasın) service
// worker'ı kaydeder. Bu, PWA'nın "Ana Ekrana Ekle" istemini göstermesi için
// tarayıcının aradığı zorunlu koşullardan biridir. Ayrıca service worker'dan
// gelen "bildirime tıklandı" mesajını dinleyip ilgili sayfaya yönlendirir.
export default function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Service worker kaydı başarısız:', err));

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.link) {
        router.push(event.data.link);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [router]);

  return null;
}
