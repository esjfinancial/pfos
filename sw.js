// PFOS Service Worker
// Strategy summary:
//   - HTML pages: network-first, falling back to cache when offline.
//     This keeps users seeing fresh data when online and a usable last-known
//     version when offline. Critical for a financial app — we don't want
//     stale balance/plan data showing as current.
//   - Static assets (icons, fonts): cache-first.
//   - Supabase API calls: bypass caching entirely. Real-time data must not
//     be cached or users will see stale balances, plans, and policies.
//   - External CDN scripts (cdnjs): cache-first with stale-while-revalidate.

const CACHE_VERSION = 'pfos-v1';
const RUNTIME_CACHE = 'pfos-runtime-v1';

// Files to pre-cache on install. Keep this small — only the essentials needed
// to render an offline shell. Everything else is cached on first fetch.
const PRECACHE_URLS = [
  '/',
  '/pfos-client.html',
  '/pfos-main.html',
  '/manifest.json',
  '/pfos-icon-192.png',
  '/pfos-icon-512.png'
];

// Patterns to NEVER cache. Anything that returns real-time financial data
// or auth-sensitive responses goes here.
const NO_CACHE_PATTERNS = [
  /supabase\.co/,           // Supabase REST + Auth endpoints
  /supabase\.in/,           // Supabase regional endpoints
  /\/auth\//,               // Anything auth-related
  /\/functions\/v1\//,      // Supabase edge functions (AI calls, etc.)
  /api\.anthropic\.com/     // Direct Anthropic API calls if any
];

// ── INSTALL ──
// Pre-cache the app shell. skipWaiting() activates the new SW immediately
// instead of waiting for all tabs to close — important so users get fixes
// without having to close every PFOS tab.
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function(cache) {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(function() {
        return self.skipWaiting();
      })
      .catch(function(err) {
        // Don't block install if a precache item fails — partial cache is
        // better than no SW at all.
        console.warn('[SW] Precache failed:', err);
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ──
// Clean up old caches from previous versions. clients.claim() takes control
// of any open tabs immediately so they start using the new SW without reload.
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(names) {
        return Promise.all(
          names.map(function(name) {
            if (name !== CACHE_VERSION && name !== RUNTIME_CACHE) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// ── FETCH ──
// Routing logic per request type.
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests. POST/PUT/DELETE go straight through.
  if (request.method !== 'GET') return;

  // Same-origin only — don't try to cache third-party requests we don't control
  // (Supabase, Anthropic, fonts CDNs handle their own caching).
  const isSameOrigin = url.origin === self.location.origin;

  // Check no-cache patterns first. These bypass the service worker entirely
  // so the request goes to network with no caching layer.
  for (let i = 0; i < NO_CACHE_PATTERNS.length; i++) {
    if (NO_CACHE_PATTERNS[i].test(request.url)) return;
  }

  // For HTML/document requests: network-first.
  // Fresh data when online, cached fallback when offline.
  const isHTML = request.destination === 'document' ||
                 request.headers.get('accept')?.includes('text/html');

  if (isHTML && isSameOrigin) {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          // Clone before caching — response body is a stream and can only be read once
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then(function(cache) { cache.put(request, responseClone); })
            .catch(function() {});
          return response;
        })
        .catch(function() {
          // Network failed — try cache
          return caches.match(request)
            .then(function(cached) {
              if (cached) return cached;
              // No cache either — return a minimal offline shell.
              // This is what the user sees when offline AND first-time visit
              // (so no cache exists). Better than a generic browser error page.
              return new Response(
                '<!DOCTYPE html><html><head><title>PFOS — Offline</title>' +
                '<meta name="viewport" content="width=device-width,initial-scale=1">' +
                '<style>body{background:#09092E;color:#E2E8F0;font-family:system-ui,sans-serif;' +
                'display:flex;align-items:center;justify-content:center;min-height:100vh;' +
                'margin:0;padding:24px;text-align:center}h1{color:#5B9BFF;font-size:20px;' +
                'margin:0 0 12px}p{color:#94A3B8;max-width:380px;line-height:1.6}</style>' +
                '</head><body><div><h1>📡 No connection</h1>' +
                '<p>PFOS needs an internet connection to load your financial data. ' +
                'Please check your connection and try again.</p></div></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
        })
    );
    return;
  }

  // For everything else same-origin (icons, manifest, etc.): cache-first.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request)
        .then(function(cached) {
          if (cached) return cached;
          return fetch(request)
            .then(function(response) {
              // Only cache successful responses
              if (!response || response.status !== 200) return response;
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE)
                .then(function(cache) { cache.put(request, responseClone); })
                .catch(function() {});
              return response;
            });
        })
    );
  }
  // Cross-origin requests: don't intercept — let the browser handle them.
});

// ── MESSAGE ──
// Allow the page to tell the SW to skip waiting (for manual update flows).
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
