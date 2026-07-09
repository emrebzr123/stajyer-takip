// ─────────────────────────────────────────────────────────────────────────────
// Service Worker — Stajyer Takip Sistemi
//
// İki görevi var:
//  1) PWA "kurulabilirlik" kriterini karşılamak (tarayıcının "Ana Ekrana Ekle"
//     istemi göstermesi için aktif bir service worker + fetch handler şart).
//  2) Telefon KİLİTLİYKEN / uygulama KAPALIYKEN bile push bildirimi göstermek.
//     Önceki zil sistemi sadece uygulama açıkken 30 saniyede bir sunucuyu
//     yokluyordu (polling) — kullanıcı uygulamayı kapatınca hiçbir şey
//     görmüyordu. Web Push API ile artık tarayıcı/işletim sistemi, sunucudan
//     gelen push mesajını uygulama kapalıyken de arka planda alıp gösterebilir.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'stajyer-takip-v1';
const OFFLINE_URLS = ['/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// NOT: Bilinçli olarak minimal bir fetch handler — sadece PWA kurulabilirlik
// kriterini karşılamak için var. API isteklerine (backend'e giden istekler)
// asla dokunmuyoruz; onlar her zaman ağdan (network-first) gider. Agresif
// bir önbellekleme stratejisi burada bilerek uygulanmadı çünkü bu uygulama
// canlı veri (görevler, bildirimler) üzerine kurulu — eski önbellekten veri
// göstermek yanıltıcı olurdu.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

// ─── Push bildirimi geldiğinde göster ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }

  const title = data.title || 'Stajyer Takip Sistemi';
  const options = {
    body: data.message || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.tag || undefined,       // aynı tag'li bildirimler üst üste yığılmaz
    data: { link: data.link || '/' },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Bildirime tıklanınca ilgili sayfaya git ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      // Uygulama zaten açıksa mevcut sekmeyi kullan, kapalıysa yeni sekme aç
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', link });
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
