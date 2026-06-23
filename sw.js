// Service worker minimo de Economia Domestica.
// Habilita la instalacion como app (PWA) SIN cachear: cada carga va a la red,
// asi la app siempre usa la ultima version subida al repo (no hay que limpiar cache).
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){ /* passthrough: red directa, sin cache */ });
