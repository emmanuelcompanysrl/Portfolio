// ─────────────────────────────────────────────────────────
//  Emmanuel — Apps & Design | Service Worker
//  Strategia: Cache-First per asset statici,
//             Network-First per navigazione.
// ─────────────────────────────────────────────────────────

const CACHE_NAME = 'emmanuel-portfolio-v1';
const OFFLINE_URL = '/offline.html';

// File da mettere in cache al momento dell'installazione
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icona.png',
  // Aggiungi qui eventuali CSS/JS/immagini aggiuntivi:
  // '/assets/cover-podcast.jpg',
  // '/assets/og-image.png',
];

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──────────────────────────────────────────────
// Rimuove vecchie versioni della cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminazione vecchia cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non-GET e domini esterni (Spotify, Google Fonts, ecc.)
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Navigazione (HTML) → Network-First con fallback cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Aggiorna la cache con la risposta fresca
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Asset statici → Cache-First con fallback network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Cache solo risposte valide
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});

// ── BACKGROUND SYNC (opzionale) ───────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync:', event.tag);
    // Logica sync futura
  }
});

// ── PUSH NOTIFICATIONS (opzionale) ───────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Emmanuel — Apps & Design', {
      body: data.body || 'Nuovo episodio disponibile!',
      icon: '/icona.png',
      badge: '/icona.png',
    })
  );
});
