/* APP NUEVA · FASE 3 · MODO ENSAYO (Carlos, 30-oct-2026: «primero lanzas la fase 3 completa … y luego hacemos el ensayo»)
   La app nueva ya GUARDA, pero solo en este aparato (base interna del navegador, IndexedDB), NUNCA en Drive:
   el cerrojo de guard.js sigue cortando cualquier escritura hacia Google.
   · El ensayo empieza con el PRIMER guardado que provoques tú (un clic, un formulario). Los guardados automáticos
     del arranque no cuentan: así, mientras no ensayes, la app nueva sigue viendo tus datos reales de Drive.
   · Mientras hay ensayo, la app carga tus datos de Drive y encima pone lo ensayado.
   · «Deshacer todo el ensayo» lo borra y vuelve a tus datos reales.
   Cuando el ensayo cuadre con la app de siempre, se quita este módulo y el cerrojo, y la nueva guarda en Drive. */
(function(){
  if(typeof saveNow!=='function'||typeof afterLoad!=='function') return;
  window.NUEVA_ENSAYO=true;
  var NOMBRE='kh-nueva-ensayo', ALM='datos';
  function abrir(){ return new Promise(function(ok,ko){ var r=indexedDB.open(NOMBRE,1);
    r.onupgradeneeded=function(){ r.result.createObjectStore(ALM); }; r.onsuccess=function(){ ok(r.result); }; r.onerror=function(){ ko(r.error); }; }); }
  function op(modo,fn){ return abrir().then(function(d){ return new Promise(function(ok,ko){ var t=d.transaction(ALM,modo), s=t.objectStore(ALM), q=fn(s);
    t.oncomplete=function(){ ok(q&&q.result); }; t.onerror=function(){ ko(t.error); }; t.onabort=function(){ ko(t.error); }; }); }); }
  function leer(k){ return op('readonly',function(s){ return s.get(k); }); }
  function poner(k,v){ return op('readwrite',function(s){ return s.put(v,k); }); }
  function borrar(k){ return op('readwrite',function(s){ return s.delete(k); }); }

  var snap=null, meta=null;
  var listo=leer('db').then(function(v){ snap=v||null; return leer('meta'); }).then(function(m){ meta=m||null; }).catch(function(e){ console.warn('[ensayo] no se pudo leer',e); });

  /* ¿lo ha provocado una persona? (clic, tecla o formulario en los últimos 4 s) */
  var tUser=0; ['click','keydown','change','submit','input'].forEach(function(ev){ document.addEventListener(ev,function(e){ if(e.isTrusted) tUser=Date.now(); },true); });
  function porTi(){ return Date.now()-tUser<4000; }

  function hora(iso){ if(!iso) return ''; var d=new Date(iso); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); }
  function banner(){
    var b=document.getElementById('nuevaBanner'); if(!b) return;
    var cambio=(meta&&meta.base&&typeof _lastMod!=='undefined'&&_lastMod&&window._ensayoBaseActual&&window._ensayoBaseActual!==meta.base);
    b.classList.add('n-ens');
    b.innerHTML='🧪 <b>APP NUEVA · ENSAYO</b> — puedes apuntar: se guarda <b>solo en este aparato</b>, nunca en Drive. '+
      (snap?'Ensayo desde el <b>'+hora(meta&&meta.desde)+'</b> · '+((meta&&meta.n)||0)+' guardado(s). <a href="#" data-ens="deshacer">Deshacer todo el ensayo</a>'
           :'Sin ensayo: estás viendo tus datos reales.')+
      (cambio?' · <span class="n-ens-av">⚠ desde que empezaste el ensayo has guardado en la app de siempre: el ensayo sigue con tus datos de entonces</span>':'')+
      ' · <a href="./" target="_self" rel="noopener">Abrir la app de siempre</a>';
  }
  document.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('[data-ens="deshacer"]'); if(!a) return; e.preventDefault();
    if(!confirm('¿Deshacer todo el ensayo?\n\nSe borra lo apuntado en la app nueva y vuelves a ver tus datos reales de Drive. Tus datos de Drive no se tocan.')) return;
    Promise.all([borrar('db'),borrar('meta')]).then(function(){ location.reload(); }).catch(function(err){ alert('No se pudo deshacer: '+err); }); },true);

  /* guardar → solo aquí */
  saveNow=async function(){
    if(!DB) return;
    if(typeof _planRepartoInval==='function') _planRepartoInval();
    if(window._demoOn){ setFileStatus('warn','MODO DEMO — sin guardar'); return; }
    if(!snap&&!porTi()){ setFileStatus('ok','Solo lectura · sin ensayo'); return; }   /* guardados automáticos del arranque */
    try{
      var m=meta||{desde:new Date().toISOString(), base:window._ensayoBaseActual||null, n:0};
      m.ultimo=new Date().toISOString(); m.n=(m.n||0)+1;
      await poner('db',JSON.stringify(DB)); await poner('meta',m); meta=m; snap=true;
      setFileStatus('ok','ENSAYO · guardado solo en este aparato'); banner();
    }catch(err){ setFileStatus('warn','ENSAYO · no se pudo guardar'); console.error('[ensayo]',err); alert('El ensayo no se pudo guardar en este aparato: '+((err&&err.message)||err)); }
  };

  /* cargar: tus datos de Drive y, si hay ensayo, lo ensayado encima */
  var oAL=afterLoad;
  afterLoad=function(){
    var self=this, a=arguments;
    if(window._demoOn) return oAL.apply(self,a);
    try{ window._ensayoBaseActual=(typeof _lastMod!=='undefined')?_lastMod:null; }catch(e){}
    return listo.then(function(){
      if(typeof snap==='string'){ try{ window._ensayoReal=DB; DB=JSON.parse(snap); }catch(e){ console.error('[ensayo] copia ilegible',e); } }
      var r=oAL.apply(self,a); banner(); return r;
    });
  };
  window.nEnsayo={ estado:function(){ return {hay:!!snap, meta:meta}; }, deshacer:function(){ return Promise.all([borrar('db'),borrar('meta')]); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ listo.then(banner); }); else listo.then(banner);
})();
