/* APP NUEVA · Puntos de restauración en IndexedDB (3-nov-2026, Carlos: «punto de restauración no guardado, algo del navegador lleno»).
   Antes vivían en localStorage, que tiene unos 5 MB para TODA la web (app de siempre + app nueva) y una sola copia de los datos
   ya ocupa ~2,4 MB: a partir del segundo punto, «almacenamiento lleno». IndexedDB admite cientos de MB.
   Mismas funciones de siempre (_snapLoad/_snapStore), así que la Papelera, pushSnapshot y Restaurar no cambian: se guarda una
   copia en memoria que se lee al abrir la app y se escribe en IndexedDB en segundo plano. Los puntos viejos de localStorage
   se pasan aquí una vez y se borran de allí, para liberar ese espacio. */
(function(){
  if(typeof _snapLoad!=='function'||!window.indexedDB||window._nSnapIdb) return; window._nSnapIdb=true;
  var BD='nueva-puntos', ALM='p', CL='snaps', C=null, pendiente=null, db=null;
  function max(){ return (typeof SNAP_MAX==='number'&&SNAP_MAX>0)?SNAP_MAX:5; }
  function unir(a,b){ var v={}, o=[]; a.concat(b).forEach(function(s){ if(s&&s.when&&!v[s.when]){ v[s.when]=1; o.push(s); } });
    o.sort(function(x,y){ return y.when-x.when; }); return o.slice(0,max()); }
  function abrir(){ return new Promise(function(ok,ko){ var r=indexedDB.open(BD,1);
    r.onupgradeneeded=function(){ r.result.createObjectStore(ALM); }; r.onsuccess=function(){ ok(r.result); }; r.onerror=function(){ ko(r.error); }; }); }
  var _t=null; function escribir(){ clearTimeout(_t); _t=setTimeout(escribirYa,250); }
  function escribirYa(){ if(!db) return; try{ var t=db.transaction(ALM,'readwrite'); t.objectStore(ALM).put(C,CL);
      t.onerror=function(){ try{ showToast('⚠️ Punto de restauración no guardado ('+((t.error&&t.error.name)||'error')+')',null,null,4000); }catch(e){} }; }catch(e){ console.warn('[puntos]',e); } }
  var viejo_load=_snapLoad;
  _snapLoad=function(){ return (C||pendiente||[]).slice(); };
  _snapStore=function(arr){ arr=(arr||[]).slice(0,max()); if(C===null){ pendiente=arr; return true; } C=arr; escribir(); return true; };
  abrir().then(function(d){ db=d; return new Promise(function(ok){ var g=d.transaction(ALM).objectStore(ALM).get(CL); g.onsuccess=function(){ ok(g.result||[]); }; g.onerror=function(){ ok([]); }; }); })
    .then(function(guard){ var ls=[]; try{ ls=viejo_load()||[]; }catch(e){}
      C=unir(pendiente||[],unir(guard,ls)); pendiente=null; escribir();
      if(ls.length){ try{ localStorage.removeItem(SNAP_KEY); }catch(e){} } })
    .catch(function(e){ console.warn('[puntos] IndexedDB no disponible; sigo con el navegador',e); C=null;
      _snapLoad=viejo_load; _snapStore=function(arr){ try{ localStorage.setItem(SNAP_KEY,JSON.stringify(arr.slice(0,1))); return true; }catch(e2){ return false; } }; });
})();
