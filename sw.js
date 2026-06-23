// Service worker de Economia Domestica  (v2 - network-only, sin cache).
// Habilita la instalacion como app (PWA) y, ademas, fuerza que TODOS los
// archivos propios de la app se carguen siempre desde la red (cache:'no-store').
// Asi la app instalada se autoactualiza: en cuanto subes una version nueva al
// repo, al reabrir la app ya la coge (no hay que limpiar cache ni reinstalar).
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  if(e.request.url.indexOf(self.registration.scope) === 0){
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).catch(function(){ return fetch(e.request); })
    );
  }
});
