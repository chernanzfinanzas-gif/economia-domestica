/* =========================================================================
   Service worker — es lo que hace que el mapa funcione SIN COBERTURA.
   · Guarda la propia app para poder abrirla sin red.
   · Intercepta cada tile que pide el mapa: si está descargado, lo sirve de
     la caché; si no y hay red, lo pide al IGN y lo guarda de paso.
   ========================================================================= */
const APP   = 'ign-app-v56';
const TILES = 'ign-tiles-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

/* tile de relleno cuando no hay dato ni red: gris del color del fondo */
const VACIO = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">'
  + '<rect width="256" height="256" fill="#e9e6df"/>'
  + '<path d="M0 256L256 0M-128 256L256 -128M0 512L512 0" stroke="#ded9d0" stroke-width="1"/></svg>';
const respVacia = () => new Response(VACIO, {
  status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }
});

/* Cuando un tile no está y no hay red:
   · si lo pide el mapa (una <img>), se devuelve el relleno para que no salga
     el icono de imagen rota;
   · si lo pide el descargador (un fetch), se devuelve error — así cuenta como
     hueco y se reintenta, en vez de guardarse el relleno como si fuera mapa. */
/* el relleno es un SVG: nunca debe confundirse con un tile de verdad */
const esImagen = r => {
  const t = (r.headers.get('content-type') || '').toLowerCase();
  return t.startsWith('image/') && !t.includes('svg');
};

const sinTile = (req, estado) => req.destination === 'image'
  ? respVacia()
  : new Response('tile no disponible', { status: estado || 504 });

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    /* se limpian versiones viejas de la app, NUNCA la caché de tiles */
    await Promise.all(nombres.filter(n => n.startsWith('ign-app-') && n !== APP).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* --- Servidores comunitarios (OpenStreetMap, CyclOSM/OSM-FR, openmaps.fr,
         Waymarked Trails): se sirven, pero NO se guarda nada.
         Sus políticas de teselas prohíben expresamente la descarga masiva y
         sólo admiten la caché normal del navegador (la que gobiernan sus
         propias cabeceras), no copias nuestras. Por eso estas capas son de
         solo online y sin cobertura salen vacías. --- */
  if (/(^|\.)(openstreetmap\.org|openstreetmap\.fr|openmaps\.fr|waymarkedtrails\.org|tracestrack\.com)$/.test(url.hostname)) {
    e.respondWith(fetch(req).catch(() => sinTile(req, 504)));
    return;
  }

  /* --- tiles del IGN: primero la caché, luego la red --- */
  if (/(^|\.)ign\.es$/.test(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req, { ignoreVary: true });
      /* Un tile guardado de forma opaca (servidor sin CORS) sólo se puede
         devolver a peticiones 'no-cors' — que es como pide las imágenes el
         mapa. Devolverlo a un fetch normal daría error de red, así que en ese
         caso se responde con el relleno. */
      if (hit && !(hit.type === 'opaque' && req.mode && req.mode !== 'no-cors')) return hit;
      /* No está en la caché: hay que ir a la red.
         Se intenta primero una petición legible (CORS) aunque el mapa pida la
         imagen en modo 'no-cors': sólo así se puede guardar una copia limpia.
         Las copias "a ciegas" (opacas) se sirven pero NO se guardan, porque el
         navegador les suma un relleno enorme y llenan el almacenamiento. */
      let res = null;
      if (req.mode === 'cors') {
        try { res = await fetch(req); } catch (err) { res = null; }
      } else {
        try { res = await fetch(url.href, { mode: 'cors', credentials: 'omit' }); }
        catch (err) { res = null; }
        if (!res || !res.ok || !esImagen(res)) {
          try { res = await fetch(req); } catch (err) { res = null; }
        }
      }
      if (!res) return sinTile(req, 504);                 // sin cobertura y sin tile
      if (res.type !== 'opaque' && res.ok && esImagen(res)) {
        const b = await res.blob();
        const limpia = () => new Response(b, {
          headers: { 'Content-Type': b.type || 'image/jpeg', 'Content-Length': String(b.size) } });
        cache.put(req, limpia()).catch(() => {});         // se cachea al vuelo
        return limpia();
      }
      if (res.type === 'opaque') return res;              // se sirve, no se guarda
      return sinTile(req, res.status);
    })());
    return;
  }

  /* --- lo que cambia cuando publicas —los paquetes de senderos, las rutas
         que añades a la colección y tus objetivos— va a la red primero, y la copia guardada
         solo como respaldo. Si no, tras publicar seguirías viendo la versión
         vieja hasta la segunda carga. --- */
  /* Ojo: solo `anadidas.json`, no todo `/rutas/`. Los ficheros de celda de la
     colección no cambian nunca y pesan; pedirlos a la red primero en el monte
     sería esperar el tiempo de espera en cada uno. */
  if (url.origin === location.origin
      && (url.pathname.includes('/sendas/') || /\/(anadidas|objetivos)\.json$/.test(url.pathname))) {
    e.respondWith((async () => {
      const cache = await caches.open(APP);
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch (err) {
        return (await cache.match(req)) || new Response('Sin conexión', { status: 503 });
      }
    })());
    return;
  }

  /* --- la propia app: caché primero, y se refresca en segundo plano --- */
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(APP);
      const hit = await cache.match(req, { ignoreSearch: true });
      const red = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);
      return hit || (await red) || new Response('Sin conexión', { status: 503 });
    })());
  }
});
