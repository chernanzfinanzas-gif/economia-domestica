/* APP NUEVA · AVISOS DEL PANEL PARA EL CORREO DE LA NOCHE (25-nov-2026)
   Carlos (25-nov, 01:56): «cuando hagas un cambio en la app de este estilo lo añades al correo también, con los avisos de panel
   de ese día».
   Los avisos del Panel se calculan aquí, en la app, con tus datos; el correo de la noche corre en la nube y no los puede
   rehacer igual. Así que, cada vez que se pinta el bloque «Avisos», se copia lo que se ve a un fichero pequeño de Drive,
   «avisos-panel.json», y el correo lo lee.
   · Se copia TODO lo que la lista enseña (también lo que está tras «ver las N restantes»), sin lo que ya marcaste como visto.
   · Cada aviso guarda el día en que apareció por primera vez («desde»), para que el correo separe lo nuevo de hoy.
   · Solo escribe si la lista ha cambiado, y como mucho una vez por minuto. No toca tus datos ni pinta nada. */
(function(){
  if(window._navc) return; window._navc=true;
  var FN='avisos-panel.json', _fid=null, _prev=null, _ult='', _t=null, _ultEsc=0, _cargado=false;
  function hayDrive(){ return !window._demoOn && typeof gfetch==='function' && typeof accessToken!=='undefined' && accessToken; }
  function hoy(){ var d=new Date(); d=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return d.toISOString().slice(0,10); }
  function limpio(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
  function clave(g,t){ return (g+'|'+t).toLowerCase().replace(/[0-9]+([.,][0-9]+)*/g,'#').replace(/\s+/g,' ').trim().slice(0,220); }

  function cargarPrev(){
    if(_cargado||!hayDrive()) return Promise.resolve(); _cargado=true;
    var q=encodeURIComponent("name='"+FN+"' and trashed=false");
    return gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id)&pageSize=1').then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ var f=j&&j.files&&j.files[0]; if(!f) return null; _fid=f.id;
        return gfetch('https://www.googleapis.com/drive/v3/files/'+_fid+'?alt=media').then(function(r){ return r.ok?r.json():null; }); })
      .then(function(d){ if(d&&d.avisos) _prev=d; }).catch(function(){});
  }

  /* lee la lista tal cual sale en pantalla: cabeceras de grupo (.n-avg) y filas (.n-av / .n-avi) en su orden */
  function leerLista(){
    var b=document.querySelector('#nP_av>.pos-blk-b'); if(!b) return null;
    var out=[], g='';
    b.querySelectorAll('.n-avg, .n-av, .n-avi').forEach(function(e){
      if(e.classList.contains('n-avg')){ g=limpio(e.textContent).replace(/^▸\s*/,'').replace(/\s*\(\d+\).*$/,''); return; }
      if(e.classList.contains('visto')) return;
      var tx=e.querySelector('.n-avtx'), st=e.querySelector('.n-avst');
      var t=limpio((tx||e).textContent); if(!t) return;
      out.push({grupo:g||'Avisos', estado:st?limpio(st.textContent):'', texto:t.slice(0,600)});
    });
    return out;
  }
  /* pinta con todo desplegado, lee, y vuelve a pintar como estaba: todo en el mismo instante, no se ve en pantalla */
  function leerCompleta(orig){
    var mas=window._nAvMas, f=window._nAvF, L=null;
    try{ window._nAvMas={dec:1,doc:1,ext:1,tri:1,car:1,div:1,hog:1}; window._nAvF=''; orig(); L=leerLista(); }
    catch(e){ L=null; }
    finally{ window._nAvMas=mas; window._nAvF=f; try{ orig(); }catch(e2){} }
    return L;
  }

  function guardar(lista){
    if(!hayDrive()) return;
    /* [27-nov-2026 · Carlos] «desde» ya no depende de que el aviso estuviera en la copia ANTERIOR: un repintado a medias
       (p. ej. al abrir la app antes de que lleguen los hechos) los borraba y al volver salían como «nuevos hoy» (32 el 27-nov).
       Ahora se guarda aparte un registro de la primera vez que se vio cada aviso («vistos»: clave → [primera, última vez]),
       que solo crece; se olvida lo que lleva más de 120 días sin aparecer. */
    var d=hoy(), V={};
    var pv=(_prev&&_prev.vistos)||{}; Object.keys(pv).forEach(function(k){ var x=pv[k]; if(x&&x[0]) V[k]=[x[0],x[1]||x[0]]; });
    ((_prev&&_prev.avisos)||[]).forEach(function(a){ if(a.k&&a.desde&&(!V[a.k]||a.desde<V[a.k][0])) V[a.k]=[a.desde,(V[a.k]&&V[a.k][1])||a.desde]; });
    var av=lista.map(function(a){ var k=clave(a.grupo,a.texto); var desde=V[k]?V[k][0]:d; V[k]=[desde,d]; return {k:k,grupo:a.grupo,estado:a.estado,texto:a.texto,desde:desde}; });
    var lim=new Date(Date.parse(d+'T12:00:00')-120*864e5).toISOString().slice(0,10);
    Object.keys(V).forEach(function(k){ if(V[k][1]<lim) delete V[k]; });
    var firma=JSON.stringify(av.map(function(a){ return a.k; }));
    if(firma===_ult) return;
    var ahora=Date.now(); if(ahora-_ultEsc<60000){ clearTimeout(_t); _t=setTimeout(function(){ guardar(lista); },60000-(ahora-_ultEsc)+50); return; }
    _ult=firma; _ultEsc=ahora;
    var D={schemaVersion:1, actualizado:new Date().toISOString(), dia:d, n:av.length, avisos:av, vistos:V}; _prev=D;
    var body=JSON.stringify(D,null,1);
    if(_fid){ gfetch('https://www.googleapis.com/upload/drive/v3/files/'+_fid+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:body}).catch(function(){}); return; }
    var b='-----avc'+Date.now();
    var mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:FN})+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
    gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp})
      .then(function(r){ return r.ok?r.json():null; }).then(function(j){ if(j&&j.id) _fid=j.id; }).catch(function(){});
  }

  /* El Panel repinta los avisos por dentro (no siempre pasa por window.nPanelAvisos), así que se vigila el propio bloque:
     cada vez que cambia, a los 4 s se copia. Las repintadas que hace esta pieza para leer la lista completa se ignoran. */
  var _ign=0;
  function programar(){
    if(Date.now()<_ign) return;
    clearTimeout(window._navcT);
    window._navcT=setTimeout(function(){
      var orig=window.nPanelAvisos; if(typeof orig!=='function'||!hayDrive()) return;
      cargarPrev().then(function(){ var L=leerCompleta(orig); _ign=Date.now()+800; if(L) guardar(L); });
    },4000);
  }
  function enganchar(){
    var b=document.querySelector('#nP_av>.pos-blk-b'); if(!b||typeof window.nPanelAvisos!=='function') return false;
    try{ new MutationObserver(programar).observe(b,{childList:true,subtree:true}); }catch(e){ return false; }
    programar(); return true;
  }
  if(!enganchar()){ var n=0, iv=setInterval(function(){ if(enganchar()||++n>240) clearInterval(iv); },500); }
})();
