const CACHE_NAME = 'fluc-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.jpg'
];

// Instalação - Pre-cacheia assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos .addAll individualmente ou capturando erros para evitar que falhas em arquivos opcionais quebrem a instalação
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[SW] Não foi possível cachear durante install: ${url}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Ativação - Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepção de requisições - Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // Filtrar requisições: apenas métodos GET de mesma origem ou chamadas HTTP comuns
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Ignorar chamadas de extensões do navegador ou esquemas que não sejam http/https
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Atualiza o cache se a resposta for válida e bem-sucedida
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          // Fallback offline para navegação de páginas (evita tela branca)
          if (event.request.mode === 'navigate') {
            return cache.match('./index.html') || cache.match('./');
          }
          // Retorna erro se falhar e não for navegação e não tiver cache
          throw err;
        });

        // Retorna o cache se houver, ou a promise de rede
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Background Sync - Manipulador para sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync') {
    console.log('[SW] Background sync disparado: sync');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Lógica para sincronizar dados quando a conexão for restabelecida
  // Como o SW não tem acesso fácil ao localStorage ou estado do App,
  // essa lógica deve interagir com IndexedDB ou outras formas de persistência que o SW possa acessar.
  console.log('[SW] Sincronizando dados...');
  // Adicionar lógica de sincronização aqui
}
