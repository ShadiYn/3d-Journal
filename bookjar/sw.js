/* ══════════════════════════════════════════════════
   SERVICE WORKER — BookJar PWA
   Estrategia: Cache First para assets estáticos,
   Network First para la API del backend.
══════════════════════════════════════════════════ */

var CACHE_NAME  = 'bookjar-v1';
var CACHE_URLS  = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/state.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/books.js',
  '/js/scene.js',
  '/js/drag.js',
  '/js/touch.js',
  '/js/atmosphere.js',
  '/js/book-actions.js',
  '/js/book-viewer.js',
  '/js/stats.js',
  '/js/jar-picker.js',
  '/js/decor.js',
  '/js/decor-panel.js',
  '/js/shelf-panel.js',
  '/js/openlibrary.js',
  '/js/search.js',
  '/js/camera-anim.js',
  '/js/audio.js',
  '/js/cloud.js',
  '/js/app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
];

// ── Instalación: pre-cachear assets ───────────────
self.addEventListener('install', function(e) {
  console.log('[SW] Instalando BookJar v1...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    }).then(function() {
      console.log('[SW] Assets cacheados');
      return self.skipWaiting();
    })
  );
});

// ── Activación: limpiar caches viejos ─────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { console.log('[SW] Borrando cache antiguo:', k); return caches.delete(k); })
      );
    }).then(function() {
      console.log('[SW] Activado');
      return self.clients.claim();
    })
  );
});

// ── Fetch: Cache First para assets, Network First para API ──
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // API del backend → Network First (siempre intentar red)
  if (url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(
          JSON.stringify({ error: 'Sin conexión' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Open Library → Network First con fallback silencioso
  if (url.includes('openlibrary.org') || url.includes('archive.org')) {
    e.respondWith(fetch(e.request).catch(function() { return new Response('', { status: 503 }); }));
    return;
  }

  // Assets estáticos → Cache First
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cachear respuestas nuevas que no estaban en la lista inicial
        if (response && response.status === 200 && e.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        // Sin red y sin cache → página offline básica
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

// ── Mensaje para forzar actualización ─────────────
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
