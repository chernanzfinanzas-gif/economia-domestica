/* APP NUEVA · Abrir sin cobertura (12-nov-2026, Carlos: «vamos con estas tres cosas»).
   Hasta hoy, sin red la app no cargaba; y aunque cargara, sin Google no hay datos. Dos piezas:
   1) El programa se guarda en el aparato (nueva/sw.js): con red se baja como siempre; sin red sale la copia.
   2) Si al abrir no hay red (o Google no carga), la app arranca con la última copia de los datos que Drive confirmó
      a este aparato (la «base» que ya guarda n-92). Franja ámbar «Sin conexión». Lo que se apunte queda guardado
      en el aparato como pendiente (n-92) y NO se intenta subir.
   3) Al volver la red: se entra en Google, se carga Drive y n-92 le aplica lo apuntado sin conexión (tres vías).
   Mientras dura el modo sin conexión el guardado en Drive está cerrado a propósito: sin haber cargado Drive la app
   no sabe cuál es su fichero y, si guardara, crearía uno nuevo duplicado. */
(function(){
  if(window._nSinCob) return; window._nSinCob=true;
  /* ---------- 1 · programa en el aparato ---------- */
  try{ if('serviceWorker' in navigator){ navigator.serviceWorker.register('nueva/sw.js').then(function(){ return navigator.serviceWorker.ready; }).then(function(reg){
      var u=[location.href.split('#')[0]];
      [].forEach.call(document.querySelectorAll('script[src],link[href]'),function(el){ var s=el.src||el.href; if(s&&s.indexOf(location.origin)===0&&u.indexOf(s)<0) u.push(s); });
      if(reg&&reg.active) reg.active.postMessage({tipo:'guardar',urls:u}); }).catch(function(){}); } }catch(e){}
  /* ---------- 2 · arrancar con la copia del aparato ---------- */
  if(typeof afterLoad!=='function'||typeof driveSave!=='function'||typeof startSession!=='function'||!window.indexedDB) return;
  var sinRed=false, conectando=false;
  function hayGoogle(){ return !!(window.google&&google.accounts&&google.accounts.oauth2); }
  function cargado(){ try{ return !!DB; }catch(e){ return false; } }
  function leer(){ return new Promise(function(ok){ try{ var r=indexedDB.open('kh-economia-pendiente',1);
      r.onupgradeneeded=function(){ try{ r.result.createObjectStore('kv'); }catch(e){} };
      r.onsuccess=function(){ try{ var q=r.result.transaction('kv','readonly').objectStore('kv').get('base'); q.onsuccess=function(){ ok(q.result||null); }; q.onerror=function(){ ok(null); }; }catch(e){ ok(null); } };
      r.onerror=function(){ ok(null); }; }catch(e){ ok(null); } }); }
  function barra(txt,color,fn){ var b=document.getElementById('nSinRedBar');
    if(!txt){ if(b) b.style.display='none'; return; }
    if(!b){ b=document.createElement('div'); b.id='nSinRedBar'; document.body.appendChild(b); }
    b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:10001;padding:8px 14px;text-align:center;font:700 13px system-ui,sans-serif;color:#fff;cursor:pointer;background:'+(color||'#B45309');
    b.textContent=txt; b.onclick=fn||null; b.style.display=''; }
  function arrancar(){ return leer().then(function(txt){ if(cargado()||window._demoOn) return false;
      var d=null; try{ d=txt?JSON.parse(txt):null; }catch(e){}
      if(!d){ try{ setFileStatus('warn','Sin conexión y sin copia en este aparato'); }catch(e){} return false; }
      sinRed=true; window._nSinRed=true; DB=d;
      try{ var w=document.getElementById('welcome'); if(w) w.style.display='none'; }catch(e){}
      afterLoad();
      try{ setFileStatus('warn','Sin conexión · copia de este aparato'); }catch(e){}
      barra('📴 Sin conexión · estás viendo la última copia de este aparato. Lo que apuntes se subirá al volver la red.','#B45309',function(){ conectar(true); });
      return true; }); }
  window.nSinRedArrancar=arrancar; window.nSinRedEstado=function(){ return {sinRed:sinRed,conectando:conectando}; };
  /* el guardado en Drive, cerrado mientras no se haya cargado Drive; cada intento deja lo cambiado apuntado en el aparato (n-92) */
  var oD=driveSave; driveSave=function(){ if(sinRed){ try{ if(typeof window.nPendMarcar==='function') window.nPendMarcar(); }catch(e){} } if(sinRed) return Promise.reject(new Error('Drive: sin comprobar, no se guarda (sin conexión)')); return oD.apply(this,arguments); };
  /* el arranque normal, al rendirse, enseña la pantalla de «Conectar»: en modo sin conexión no debe tapar la app */
  if(typeof showWelcome==='function'){ var oW=showWelcome; showWelcome=function(m){ if(sinRed&&m==='login'){ setTimeout(function(){ try{ if(sinRed) setFileStatus('warn','Sin conexión · copia de este aparato'); }catch(e){} },0); return; } return oW.apply(this,arguments); }; }
  /* en cuanto Drive carga de verdad (hay sesión y fichero), se sale del modo sin conexión ANTES de que n-92 aplique lo pendiente */
  var oA=afterLoad; afterLoad=function(){ var con=false; try{ con=!!(accessToken&&fileId); }catch(e){} if(sinRed&&con){ sinRed=false; window._nSinRed=false; barra(null); } return oA.apply(this,arguments); };
  /* ---------- 3 · volver a conectar ---------- */
  function conectar(gesto){ if(!sinRed||conectando||navigator.onLine===false) return Promise.resolve(false); conectando=true;
    var g=hayGoogle()?Promise.resolve(true):new Promise(function(ok){ var s=document.createElement('script'); s.src='https://accounts.google.com/gsi/client'; s.onload=function(){ ok(true); }; s.onerror=function(){ ok(false); }; document.head.appendChild(s); })
      .then(function(v){ return (v&&typeof waitGoogle==='function')?waitGoogle():v; });
    return g.then(function(v){ if(!v||!hayGoogle()) throw new Error('Google no carga');
        var tc=null; try{ tc=tokenClient; }catch(e){} if(!tc) initAuth();
        return getToken(!!gesto); })
      .then(function(){ return startSession(); })
      .then(function(){ conectando=false; if(sinRed) barra('⚠️ Hay red pero no se han podido cargar los datos de Drive · pulsa para reintentar','#B91C1C',function(){ conectar(true); }); return !sinRed; })
      .catch(function(e){ conectando=false; if(sinRed&&navigator.onLine!==false) barra('🔌 Ha vuelto la red · pulsa aquí para entrar en Google y subir lo apuntado','#1D4ED8',function(){ conectar(true); }); return false; }); }
  window.nSinRedConectar=conectar;
  window.addEventListener('online',function(){ conectar(false); });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') conectar(false); });
  setInterval(function(){ if(sinRed&&navigator.onLine!==false) conectar(false); },30000);
  /* ---------- ¿hace falta arrancar sin conexión? Se espera a ver si el arranque normal carga los datos ---------- */
  var t0=Date.now(), iv=setInterval(function(){ var dt=Date.now()-t0;
    if(cargado()||window._demoOn||dt>90000){ clearInterval(iv); return; }
    if(dt<1200) return;
    if(navigator.onLine===false||(dt>7500&&!hayGoogle())){ clearInterval(iv); arrancar(); } },400);
})();
