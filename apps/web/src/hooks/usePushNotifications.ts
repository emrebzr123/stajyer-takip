'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

// VAPID public key'i (URL-safe base64) tarayıcının beklediği Uint8Array
// formatına çevirir. Standart, her yerde kullanılan Web Push yardımcı
// fonksiyonu — tarayıcı API'sinin kendisi bunu sağlamıyor.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}

// Push bildirimlerini yönetir: destek durumu, izin durumu, abone olma.
// Telefon kilitliyken / uygulama kapalıyken de bildirim gösterebilmek için
// gereken tarayıcı Push API akışını sarmalar. İzin isteği yalnızca kullanıcı
// açıkça bir düğmeye tıkladığında (enable() çağrısıyla) yapılır — sayfa
// yüklenir yüklenmez izin istemek hem çoğu tarayıcıda engellenir hem de
// kötü bir kullanıcı deneyimidir.
export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(isSupported);
    if (!isSupported) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => undefined);
  }, []);

  const enable = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') return;

      const { data } = await api.get('/notifications/push/public-key');
      if (!data?.publicKey) return; // backend'de VAPID anahtarı tanımlı değil

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey) as any,
        });
      }

      await api.post('/notifications/push/subscribe', sub.toJSON());
      setSubscribed(true);
    } catch (err) {
      console.error('Push aboneliği başarısız:', err);
    } finally {
      setBusy(false);
    }
  }, [supported, busy]);

  return { supported, permission, subscribed, busy, enable };
}
