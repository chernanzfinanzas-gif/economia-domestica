/* APP NUEVA · El programa también se guarda en el aparato (12-nov-2026, Carlos: «vamos con estas tres cosas»).
   Regla: PRIMERO LA RED, como hasta ahora (la app se sigue actualizando sola al reabrir). Solo si la red falla
   se sirve la copia guardada en el aparato, y así la app abre sin cobertura.
   · Solo ficheros propios (este mismo sitio) y solo lecturas (GET). Google, Drive y GitHub no se tocan.
   · De cada fichero se guarda solo la última versión (se borran las anteriores con otro ?v=).
   Para desactivarlo: publicar este fichero con «self.registration.unregister()» en 'activate'. */
var ALMACEN='kh-nueva-programa-v1';
self.addEventListener('install',function(e){ self.skipWaiting(); });
self.addEventListener('activate',function(e){ e.waitUntil(self.clients.claim()); });
function propia(u){ try{ return new URL(u).origin===self.location.origin; }catch(e){ return false; } }
function guardar(cache,req,resp){
  if(!resp||resp.status!==200) return Promise.resolve();
  var url=(typeof req==='string')?req:req.url, ruta=new URL(url).pathname;
  return cache.put(req,resp).then(function(){ return cache.keys(); }).then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.url!==url&&new URL(k.url).pathname===ruta; }).map(function(k){ return cache.delete(k); })); }).catch(function(){});
}
function redPrimero(req){
  return caches.open(ALMACEN).then(function(cache){
    return fetch(req,{cache:'no-store'}).then(function(resp){ if(resp&&resp.status===200) guardar(cache,req,resp.clone()); return resp; })
      .catch(function(err){
        return cache.match(req).then(function(hit){ if(hit) return hit;
          return cache.match(req,{ignoreSearch:true}).then(function(h2){ if(h2) return h2;
            if(req.mode==='navigate') return cache.match(self.registration.scope).then(function(h3){ if(h3) return h3; throw err; });
            throw err; }); }); }); });
}
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET'||!propia(r.url)||r.headers.get('range')) return;
  e.respondWith(redPrimero(r));
});
/* la página manda la lista de sus ficheros: se bajan solo los que aún no están guardados */
self.addEventListener('message',function(e){
  var d=e.data||{}; if(d.tipo!=='guardar'||!Array.isArray(d.urls)) return;
  var tarea=caches.open(ALMACEN).then(function(cache){ return Promise.all(d.urls.filter(propia).map(function(u){
    return cache.match(u).then(function(hit){ if(hit) return; return fetch(u,{cache:'no-store'}).then(function(resp){ return guardar(cache,u,resp); }).catch(function(){}); }); })); });
  if(e.waitUntil) e.waitUntil(tarea);
});
