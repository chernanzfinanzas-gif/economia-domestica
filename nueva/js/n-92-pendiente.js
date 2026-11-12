/* APP NUEVA · Nada se pierde si no llega a Drive (1-nov-2026, Carlos: «si va a dar más seguridad móntalo»).
   Motivo: la comida del 01-nov apuntada en el móvil fuera de casa nunca llegó a Drive (no está en ninguna versión).
   Cómo funciona:
   1) Cada cambio se guarda también en el propio aparato (IndexedDB del navegador), junto con la foto de lo último que
      Drive confirmó («base»).
   2) Cuando Drive confirma el guardado, la copia pendiente se borra.
   3) Si no llega (sin cobertura, sesión de Google caducada, app cerrada al apuntar): franja roja «cambios sin guardar
      en Drive · reintentando», reintento cada 20 s, al recuperar la red y al volver a la app.
   4) Si se cierra o recarga con algo pendiente: al abrir, se carga Drive y se le aplican SOLO los cambios que hizo este
      aparato desde la base (altas, cambios y bajas, registro a registro), y se guarda.
   Sin botones ni preguntas. En modo demo no hace nada.
   12-nov-2026: la «base» se guarda también en memoria y se ofrece a n-90 (nBaseDrive) para que, cuando el otro aparato
   ha guardado entre medias, la junta sea en tres vías: lo que el otro borró queda borrado y lo que corrigió, corregido. */
(function(){
  if(typeof saveNow!=='function'||typeof driveSave!=='function') return;
  var IDBN='kh-economia-pendiente', ST='kv', db0=null;
  function idb(){ return db0?Promise.resolve(db0):new Promise(function(ok,ko){ try{ var r=indexedDB.open(IDBN,1); r.onupgradeneeded=function(){ r.result.createObjectStore(ST); }; r.onsuccess=function(){ db0=r.result; ok(db0); }; r.onerror=function(){ ko(r.error); }; }catch(e){ ko(e); } }); }
  function put(k,v){ return idb().then(function(d){ return new Promise(function(ok){ try{ var t=d.transaction(ST,'readwrite'); t.objectStore(ST).put(v,k); t.oncomplete=function(){ ok(true); }; t.onerror=function(){ ok(false); }; }catch(e){ ok(false); } }); }).catch(function(){ return false; }); }
  function get(k){ return idb().then(function(d){ return new Promise(function(ok){ try{ var q=d.transaction(ST,'readonly').objectStore(ST).get(k); q.onsuccess=function(){ ok(q.result); }; q.onerror=function(){ ok(null); }; }catch(e){ ok(null); } }); }).catch(function(){ return null; }); }
  var seq=0, pend=false, tW=null, listo=false, baseMem=null;
  window.nBaseDrive=function(){ return (listo&&baseMem)?baseMem:null; };
  function activo(){ return !window._demoOn&&typeof DB!=='undefined'&&DB&&listo; }
  /* ---------- franja ---------- */
  function franja(txt,color){ var b=document.getElementById('nPendBar');
    if(!txt){ if(b) b.style.display='none'; return; }
    if(!b){ b=document.createElement('div'); b.id='nPendBar'; b.addEventListener('click',function(){ reintentar(true); }); document.body.appendChild(b); }
    b.style.cssText='position:fixed;left:0;right:0;top:0;z-index:10001;padding:8px 14px;text-align:center;font:700 13px system-ui,sans-serif;color:#fff;cursor:pointer;background:'+(color||'#B91C1C');
    b.textContent=txt; b.style.display=''; }
  /* ---------- marcar cambio ---------- */
  function marcar(){ if(!activo()) return; seq++; pend=true; clearTimeout(tW); tW=setTimeout(escribir,250); }
  function escribir(){ if(!activo()) return; var s=seq; try{ put('local',JSON.stringify(DB)); put('meta',{pend:true,seq:s,cuando:new Date().toISOString()}); }catch(e){} }
  /* ---------- 3 vías: aplicar a R lo que cambió de B a L ---------- */
  function J(x){ return JSON.stringify(x); }
  function lista(a){ return Array.isArray(a)&&a.every(function(x){ return x&&typeof x==='object'&&!Array.isArray(x)&&x.id!=null; }); }
  function aplicaLista(L,B,R,cuenta){ L=L||[]; B=B||[]; R=Array.isArray(R)?R:[]; var mB={}, mL={}, n=0; B.forEach(function(x){ mB[String(x.id)]=x; }); L.forEach(function(x){ mL[String(x.id)]=x; });
    var iR={}; R.forEach(function(x,i){ if(x&&x.id!=null) iR[String(x.id)]=i; });
    L.forEach(function(x){ var id=String(x.id); if(mB[id]&&J(mB[id])===J(x)) return; if(iR[id]!=null){ if(J(R[iR[id]])!==J(x)){ R[iR[id]]=x; n++; } } else { R.push(x); iR[id]=R.length-1; n++; } });
    Object.keys(mB).forEach(function(id){ if(mL[id]) return; var i=iR[id]; if(i!=null&&J(R[i])===J(mB[id])){ R[i]=null; n++; } });
    cuenta.n+=n; if(cuenta.k&&/^(movimientos|operaciones|todos|diario|cajaMov|dividendos|patrimonio|combustible|amalia)$/.test(cuenta.k)) cuenta.v=(cuenta.v||0)+n; return R.filter(function(x){ return x!==null; }); }
  function aplicar(R,B,L){ var c={n:0};
    Object.keys(Object.assign({},B,L)).forEach(function(k){ var l=L[k], b=B[k]; if(J(l)===J(b)) return;
      if((l===undefined||lista(l))&&(b===undefined||lista(b))&&(R[k]===undefined||lista(R[k]))&&(l||b)){ c.k=k; R[k]=aplicaLista(l,b,R[k],c); return; }
      if(l&&typeof l==='object'&&!Array.isArray(l)&&b&&typeof b==='object'&&!Array.isArray(b)&&R[k]&&typeof R[k]==='object'&&!Array.isArray(R[k])){
        var sub=Object.keys(Object.assign({},b,l)), todoListas=sub.every(function(s){ return (l[s]===undefined||lista(l[s]))&&(b[s]===undefined||lista(b[s])); });
        if(todoListas){ sub.forEach(function(s){ if(J(l[s])===J(b[s])) return; c.k=k; R[k][s]=aplicaLista(l[s],b[s],R[k][s],c); }); return; } }
      if(l===undefined) return; R[k]=l; c.s=(c.s||0)+1; });
    return {n:c.v||0,s:(c.s||0)+(c.n-(c.v||0))}; }
  window.nAplicarPendiente=aplicar; window.nPendMarcar=marcar;   /* 12-nov: n-9h (sin cobertura) apunta así lo cambiado mientras el guardado está cerrado */ window._nPendDbg=function(){ return {listo:listo,pend:pend,seq:seq}; };
  /* ---------- guardar: saber si Drive lo ha recibido ---------- */
  var dS=driveSave;
  driveSave=async function(force){
    if(!activo()) return dS.apply(this,arguments);
    var s=seq, txt=JSON.stringify(DB), r; window._nTxtTrasJunta=null;
    try{ r=await dS.apply(this,arguments); }
    catch(e){ fallo(); throw e; }
    if(r&&r.ok){ baseMem=seq===s?JSON.stringify(DB):(window._nTxtTrasJunta||txt); put('base',baseMem); if(seq===s){ pend=false; put('meta',{pend:false,seq:s,cuando:new Date().toISOString()}); put('local',null); franja(null); } }
    else if(r&&r.conflict) fallo();
    return r; };
  function fallo(){ if(!activo()) return; pend=true; escribir(); franja('⚠️ Hay cambios sin guardar en Drive · reintentando (pulsa para reintentar ya)'); }
  var enCurso=false;
  function reintentar(ya){ if(!activo()||!pend||enCurso) return; if(typeof accessToken==='undefined'||!accessToken) return; enCurso=true; Promise.resolve(saveNow()).catch(function(){}).then(function(){ enCurso=false; }); }
  setInterval(function(){ if(pend&&navigator.onLine!==false) reintentar(); },20000);
  window.addEventListener('online',function(){ reintentar(); });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') reintentar(); else if(pend) escribir(); });
  window.addEventListener('pagehide',function(){ if(pend) escribir(); });
  /* ---------- marcar en cada cambio ---------- */
  var oSch=typeof scheduleSave==='function'?scheduleSave:null;
  if(oSch) scheduleSave=function(){ marcar(); return oSch.apply(this,arguments); };
  var oSv=saveNow; saveNow=function(){ if(activo()&&!pend) marcar(); return oSv.apply(this,arguments); };
  /* ---------- al cargar: ¿quedó algo pendiente en este aparato? ---------- */
  if(typeof afterLoad==='function'){ var oA=afterLoad; afterLoad=function(){ var r=oA.apply(this,arguments); listo=false; recuperar(); return r; }; }
  async function recuperar(){
    if(window._demoOn){ return; }
    var meta=await get('meta'), loc=await get('local'), base=await get('base');
    if(meta&&meta.pend&&loc&&base){
      try{ var L=JSON.parse(loc), B=JSON.parse(base), r0=JSON.stringify(DB), cc=aplicar(DB,B,L), n=cc.n; baseMem=r0;
        listo=true;
        if(n||cc.s){ if(n) franja('🛟 Recuperado'+(n===1?'':'s')+' '+n+' cambio'+(n===1?'':'s')+' de este aparato que no habían llegado a Drive · guardando…','#B45309');
          try{ if(typeof renderAll==='function') renderAll(); }catch(e){}
          pend=true; seq++; escribir(); await saveNow();
          if(!pend&&n) franja('✅ Recuperado'+(n===1?'':'s')+' '+n+' cambio'+(n===1?'':'s')+' pendiente'+(n===1?'':'s')+' y guardado'+(n===1?'':'s')+' en Drive','#15803D'), setTimeout(function(){ if(!pend) franja(null); },8000);
          return; } }catch(e){ console.warn('[n-pendiente]',e); }
    }
    listo=true; pend=false; baseMem=JSON.stringify(DB); put('base',baseMem); put('meta',{pend:false,seq:seq,cuando:new Date().toISOString()}); put('local',null);
  }
})();
