// Service worker de Economia Domestica  (v4 - 20261112).
// Como hasta ahora: habilita la instalacion como app (PWA) y fuerza que los archivos
// propios se carguen SIEMPRE desde la red (cache:'no-store'), para que la app
// instalada se autoactualice al reabrirla.
// Novedad v4 (12-nov-2026): la PUERTA sin red. El icono instalado abre la raiz, que
// solo sirve para llevar a nueva/. Sin cobertura la raiz no se puede bajar y la app
// no llegaba a abrirse. Ahora, si la raiz no se puede bajar, se manda directamente a
// nueva/, que si esta guardada en el aparato (la sirve nueva/sw.js).
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  var r = e.request;
  if(r.method !== 'GET') return;
  var ambito = self.registration.scope;
  if(r.url.indexOf(ambito) !== 0) return;
  var limpia = r.url.split('#')[0].split('?')[0];
  var puerta = r.mode === 'navigate' && (limpia === ambito || limpia === ambito + 'index.html');
  e.respondWith(
    fetch(r, {cache:'no-store'}).catch(function(){ return fetch(r); }).catch(function(err){
      if(puerta) return Response.redirect(ambito + 'nueva/', 302);
      throw err;
    })
  );
});
