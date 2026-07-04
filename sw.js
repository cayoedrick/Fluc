// Service worker for PWA.
const BYPASS_DOMAINS = [
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'www.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Bypass Firebase/Google API requests to ensure WebSockets/Long Polling work correctly
  if (BYPASS_DOMAINS.some(domain => url.hostname.includes(domain))) {
    return; // Let the browser handle these requests directly
  }

  // Optional: add your normal fetch/cache logic here
});
