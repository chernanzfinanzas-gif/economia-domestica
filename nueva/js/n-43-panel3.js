/* APP NUEVA · Panel, cambios del 30-oct-2026 (boceto «Panel - boceto 30-oct»).
   · Regla de colores de la Ficha de empresa (nRegla) en las tarjetas de tus posiciones y en «Más cerca de entrada».
   · Bloque «Tu cartera (operaciones)»: ampliaciones liberadas / eventos de capital que tocan una empresa que tienes
     (de eventos.json, el registro del método). Se confirma cuando lleguen las acciones (la escritura llega en la Fase 3).
   · «Pedir revisión de una empresa»: se apunta en Drive («revisiones-pedidas.json»); la recoge el próximo pase.
   · Precio por encima del PO (S3): pide decisión SOLO si la empresa está en tu cartera (Carlos, 30-oct 11:28);
     en las analizadas que no tienes es informativo. Las de cartera ya decididas salen en una línea. */
(function(){
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function n2(v){ return (+v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}); }
  function rep(){ if(typeof window.nPanelAvisos==='function') try{ window.nPanelAvisos(); }catch(e){} }
  function hoyIso(){ var d=new Date(); d=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return d.toISOString().slice(0,10); }
  var _uid=0;

  /* ---------- 1 · Regla de colores (la misma de la Ficha de empresa) ----------
     rojo bajo el stop · de naranja oscuro a verde hasta la entrada mínima · verde la banda ·
     amarillo creciente hasta el PO base · rojo por encima del PO. ▲ = hoy. */
  window.nRegla=function(V,o){
    o=o||{}; var st=+V.stop||0, em=+V.entMin||0, eM=+V.entMax||0, pb=+V.poBase||0, pg=+V.poBull||0, hoy=+V.precio||0, pm=+V.pmedio||0;
    if(!(eM>0&&pb>0&&hoy>0)) return '';
    if(!(em>0)) em=eM; if(!(st>0)) st=em*0.85;
    var vals=[st,em,eM,pb,hoy].concat(pg>0?[pg]:[]), lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals), pad=(hi-lo)*0.07||1; lo-=pad; hi+=pad;
    var W=1000, X=function(v){ return 10+(v-lo)/(hi-lo)*(W-20); }, y0=24, hh=14, u=++_uid;
    var h='<defs><linearGradient id="nrV'+u+'" x1="0" x2="1"><stop offset="0" stop-color="#C2410C"/><stop offset=".55" stop-color="#FACC15"/><stop offset="1" stop-color="#22C55E"/></linearGradient>'+
      '<linearGradient id="nrA'+u+'" x1="0" x2="1"><stop offset="0" stop-color="#FEF3C7"/><stop offset="1" stop-color="#D97706"/></linearGradient>'+
      '<linearGradient id="nrR'+u+'" x1="0" x2="1"><stop offset="0" stop-color="#FCA5A5"/><stop offset="1" stop-color="#991B1B"/></linearGradient>'+
      '<linearGradient id="nrS'+u+'" x1="1" x2="0"><stop offset="0" stop-color="#FCA5A5"/><stop offset="1" stop-color="#991B1B"/></linearGradient></defs>';
    function seg(a,b,f){ if(b>a) h+='<rect x="'+X(a).toFixed(1)+'" y="'+y0+'" width="'+(X(b)-X(a)).toFixed(1)+'" height="'+hh+'" fill="'+f+'"/>'; }
    seg(lo,st,'url(#nrS'+u+')'); seg(st,em,'url(#nrV'+u+')'); seg(em,eM,'#22C55E'); seg(eM,pb,'url(#nrA'+u+')'); seg(pb,hi,'url(#nrR'+u+')');
    h+='<rect x="'+X(em).toFixed(1)+'" y="'+(y0-3)+'" width="'+Math.max(2,X(eM)-X(em)).toFixed(1)+'" height="'+(hh+6)+'" fill="none" stroke="#15803D" stroke-width="2" rx="3"/>';
    var L=[['Stop',st,'#B91C1C',0,'middle'],['Entrada',em,'#15803D',1,'end'],['',eM,'#15803D',1,'start'],['PO',pb,'#1F4A9A',0,'middle']];
    if(pg>0) L.push(['PO bueno',pg,'#475569',0,'middle']);
    if(o.mini) L=[];
    L.forEach(function(l){ h+='<line x1="'+X(l[1]).toFixed(1)+'" x2="'+X(l[1]).toFixed(1)+'" y1="'+(y0-4)+'" y2="'+(y0+hh+4)+'" stroke="'+l[2]+'" stroke-width="2"/>'+
      '<text x="'+X(l[1]).toFixed(1)+'" y="'+(l[3]?y0+hh+16:y0-8)+'" font-size="'+(o.peq?13:12)+'" font-weight="700" text-anchor="'+l[4]+'" fill="'+l[2]+'">'+(l[0]?l[0]+' ':'')+n2(l[1])+'</text>'; });
    if(pm>lo&&pm<hi) h+='<line x1="'+X(pm).toFixed(1)+'" x2="'+X(pm).toFixed(1)+'" y1="'+(y0-2)+'" y2="'+(y0+hh+2)+'" stroke="#0F172A" stroke-width="2" stroke-dasharray="3 2"/>';
    var xa=X(hoy), anc=xa>W*0.8?'end':(xa<W*0.2?'start':'middle');
    if(o.mini){ h+='<polygon points="'+(xa-9).toFixed(1)+','+(y0+hh+16)+' '+(xa+9).toFixed(1)+','+(y0+hh+16)+' '+xa.toFixed(1)+','+(y0+hh+2)+'" fill="#0F172A"/>'; return '<svg class="n-regla" viewBox="0 0 '+W+' 56" preserveAspectRatio="none" width="100%" height="22">'+h+'</svg>'; }
    h+='<polygon points="'+(xa-7).toFixed(1)+','+(y0+hh+14)+' '+(xa+7).toFixed(1)+','+(y0+hh+14)+' '+xa.toFixed(1)+','+(y0+hh+3)+'" fill="#0F172A"/>'+
      '<text x="'+xa.toFixed(1)+'" y="'+(y0+hh+28)+'" font-size="13" font-weight="800" text-anchor="'+anc+'" fill="#0F172A">hoy '+n2(hoy)+' €</text>';
    return '<svg class="n-regla" viewBox="0 0 '+W+' 72" preserveAspectRatio="xMidYMid meet" width="100%">'+h+'</svg>';
  };
  /* Texto corto de dónde está el precio, con la misma regla */
  window.nReglaTxt=function(V){
    var p=+V.precio, em=+V.entMin||+V.entMax, eM=+V.entMax, pb=+V.poBase, st=+V.stop;
    if(!(p>0&&eM>0)) return '';
    if(st>0&&p<st) return ['bajo el stop','#B91C1C'];
    if(p<em) return ['más barata que la banda','#14532D'];
    if(p<=eM) return ['en la banda','#15803D'];
    if(pb>0&&p>pb) return ['por encima del PO','#B91C1C'];
    return ['faltan '+((p/eM-1)*100).toFixed(1).replace('.',',')+' %','#B45309'];
  };
  /* En Mi cartera (dentro del Panel) la escalera de siempre se cambia por la regla de la ficha */
  if(typeof _mcEscaleraHTML==='function'&&typeof _mcNiveles==='function'){
    _mcEscaleraHTML=function(t,extra){
      var V=_mcNiveles(t,extra); if(!V) return '';
      var r=window.nRegla(V); if(!r) return '';
      var tx=window.nReglaTxt(V);
      return '<div class="mc-esc n-esc">'+r+(typeof _mcNivelesPie==='function'?_mcNivelesPie(V):'')+(tx?'<div class="n-esct" style="color:'+tx[1]+'">'+tx[0]+'</div>':'')+'</div>';
    };
  }

  /* ---------- 2 · Liberadas y eventos de capital en empresas que tienes ---------- */
  window._nLib=[];
  function tiene(t){ try{ return invPositions().some(function(p){ return String(p.ticker||'').toUpperCase()===t && (+p.acciones||0)>0.0001; }); }catch(e){ return false; } }
  window.nTiene=tiene;
  function cargarLib(){
    if(typeof khEvCargar!=='function') return;
    khEvCargar().then(function(){
      var out=[], hoy=hoyIso(), lim=new Date(Date.now()-60*864e5).toISOString().slice(0,10);
      var T={}; try{ invPositions().forEach(function(p){ if((+p.acciones||0)>0.0001) T[String(p.ticker||'').toUpperCase()]=1; }); }catch(e){}
      Object.keys(T).forEach(function(t){
        (khEvLista(t)||[]).forEach(function(e){
          if(e.ex<lim||e.ex>hoy) return;
          var sh=(typeof _calSharesAt==='function')?_calSharesAt(t,e.ex,true):0; if(!(sh>0)) return;
          var recibidas=(DB.operaciones||[]).some(function(o){ return String(o.ticker||'').toUpperCase()===t && (o.tipo||'')==='compra' && (o.fecha||'')>=e.ex && !(+o.precio>0); });
          if(recibidas) return;
          var lib=/liberad/i.test(e.txt), n=e.f>1?Math.round(1/(e.f-1)):0, nuevas=lib&&n?Math.floor(sh/n+1e-9):0, sobran=lib&&n?sh-nuevas*n:0;
          out.push({t:t,ex:e.ex,txt:e.txt,sh:sh,nuevas:nuevas,sobran:sobran,lib:lib,key:'evcap-'+t+'-'+e.ex});
        });
      });
      window._nLib=out; rep();
    }).catch(function(){});
  }
  window.nCarteraOps=function(){
    return (window._nLib||[]).map(function(l){
      var f=l.ex.split('-').reverse().join('/');
      var txt=l.lib
        ? '<b>'+esc(l.t)+'</b> — '+esc(l.txt)+' desde el '+f+': con tus '+l.sh+' acciones te tocan <b>'+l.nuevas+' nuevas</b>'+(l.sobran?' y te sobran '+l.sobran+' derechos (se venden o se completan comprando)':'')+'. Cuando las veas en el bróker, confírmalo: se reparten en tus lotes a coste 0, con la fecha de las antiguas.'
        : '<b>'+esc(l.t)+'</b> — '+esc(l.txt)+' desde el '+f+': cambia tu número de acciones. Cuando lo veas en el bróker, confírmalo.';
      return {key:l.key,tipo:'cartera',cls:'a',tick:l.t,txt:txt,btn:'Confirmar que han llegado',ev:l};
    });
  };
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-nevok]'); if(!b) return; e.stopPropagation();
    nModal('<b>Confirmar acciones recibidas</b><p style="margin:8px 0">La app nueva todavía no guarda operaciones: lo hará en la siguiente fase, con la ventana de «Dividendo / Scrip / Ampliación liberada» del Kanban.</p><p style="margin:0;color:#475569">Mientras tanto, la de siempre manda.</p>');
  });

  /* ---------- 3 · Pedir revisión (se apunta en Drive; la recoge el próximo pase) ---------- */
  var FN='revisiones-pedidas.json', _fid=null;
  function hayDrive(){ return !window._demoOn && typeof gfetch==='function' && typeof accessToken!=='undefined' && accessToken; }
  function leer(){
    if(!hayDrive()) return Promise.resolve({pedidas:[]});
    var q=encodeURIComponent("name='"+FN+"' and trashed=false");
    return gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id)&pageSize=1').then(function(r){ return r.ok?r.json():null; }).then(function(j){
      var f=j&&j.files&&j.files[0]; if(!f) return {pedidas:[]}; _fid=f.id;
      return gfetch('https://www.googleapis.com/drive/v3/files/'+_fid+'?alt=media').then(function(r){ return r.ok?r.json():{pedidas:[]}; });
    }).catch(function(){ return {pedidas:[]}; });
  }
  function escribir(d){
    var body=JSON.stringify(d,null,1);
    if(_fid) return gfetch('https://www.googleapis.com/upload/drive/v3/files/'+_fid+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:body}).then(function(r){ return r.ok; });
    var b='nb'+Date.now(), mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:FN})+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
    return gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp})
      .then(function(r){ return r.ok?r.json():null; }).then(function(j){ if(j&&j.id){ _fid=j.id; return true; } return false; });
  }
  function nModal(html){
    var m=document.getElementById('nPrvModal'); if(m) m.remove();
    m=document.createElement('div'); m.id='nPrvModal'; m.className='n-prvbg';
    m.innerHTML='<div class="n-prvbox">'+html+'<div class="n-prvbt"><button data-nprvx="1">Cerrar</button></div></div>';
    document.body.appendChild(m);
  }
  window.nModal=nModal;
  function empresas(){
    var L=[]; try{ (DB.analisis||[]).forEach(function(a){ if(a.ticker) L.push([String(a.ticker).toUpperCase(),a.nombre||a.ticker]); }); }catch(e){}
    L.sort(function(a,b){ return a[1].localeCompare(b[1]); }); return L;
  }
  /* Abre la ventana de pedir revisión. t y hecho opcionales (la Ficha la llama con la empresa y el hecho). */
  window.nPedirRevision=function(t,hecho){
    var E=empresas();
    var sel=t?'<b>'+esc(t)+'</b><input type="hidden" id="nPrvT" value="'+esc(t)+'">':'<select id="nPrvT">'+E.map(function(x){ return '<option value="'+esc(x[0])+'">'+esc(x[1])+' ('+esc(x[0])+')</option>'; }).join('')+'</select>';
    nModal('<b>Pedir revisión discrecional</b><div style="margin:8px 0">Empresa: '+sel+'</div>'+(hecho?'<div style="margin:0 0 6px;color:#475569">Por: '+esc(hecho)+'</div><input type="hidden" id="nPrvH" value="'+esc(hecho)+'">':'')+
      '<textarea id="nPrvM" placeholder="¿Qué te preocupa? (opcional)" style="width:100%;height:64px;box-sizing:border-box"></textarea>'+
      '<div class="ws" style="font-size:12px;color:#64748B;margin-top:4px">Se apunta con lo que la motiva; el próximo pase la recoge, revisa la tesis y te deja la propuesta para aprobar aquí, en Avisos.</div>'+
      '<div class="n-prvbt" style="margin-top:8px"><button class="n-prvok" data-nprvok="1">Pedir revisión</button></div><div id="nPrvMsg" style="font-size:12.5px;margin-top:6px"></div>');
  };
  document.addEventListener('click',function(e){
    var x=e.target.closest&&e.target.closest('[data-nprvx]'); if(x){ var m=document.getElementById('nPrvModal'); if(m) m.remove(); return; }
    var g=e.target.closest&&e.target.closest('[data-nprv]'); if(g){ e.stopPropagation(); window.nPedirRevision(g.getAttribute('data-nprv')||'',g.getAttribute('data-nprvh')||''); return; }
    var ok=e.target.closest&&e.target.closest('[data-nprvok]'); if(!ok) return;
    var t=(document.getElementById('nPrvT')||{}).value||'', h=(document.getElementById('nPrvH')||{}).value||'', mo=(document.getElementById('nPrvM')||{}).value||'';
    var msg=document.getElementById('nPrvMsg');
    if(!hayDrive()){ if(msg) msg.innerHTML='<span style="color:#B45309">Sin conexión con Drive (o modo demo): no se ha apuntado. Pídemela en el chat.</span>'; return; }
    ok.disabled=true;
    leer().then(function(d){ d=d&&d.pedidas?d:{pedidas:[]}; var dt=new Date(); dt=new Date(dt.getTime()-dt.getTimezoneOffset()*6e4);
      d.pedidas.push({ticker:t,hecho:h,motivo:mo,cuando:dt.toISOString().slice(0,16),estado:'pedida'}); return escribir(d); })
     .then(function(r){ if(msg) msg.innerHTML=r?'<span style="color:#15803D">✓ Pedida. La recoge el próximo pase.</span>':'<span style="color:#B91C1C">No se pudo guardar en Drive.</span>'; ok.disabled=false; });
  });

  /* ---------- 4 · Decisiones del método (para las S3 de cartera ya decididas) ---------- */
  window._nDecV3={};
  function cargarDec(){
    fetch('recogida/decisiones-v3.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ window._nDecV3=(j&&j.empresas)||{}; rep(); }).catch(function(){});
  }
  /* Última decisión S3 de una empresa (o null) */
  window.nDecS3=function(t){ var L=(window._nDecV3[t]||[]).filter(function(d){ return d.senal==='S3'; }); return L.length?L[L.length-1]:null; };

  setTimeout(function(){ cargarLib(); cargarDec(); },1500);
  if(typeof renderPanelDash==='function'){ var o=renderPanelDash; renderPanelDash=function(){ o.apply(this,arguments); clearTimeout(window._nLibT); window._nLibT=setTimeout(cargarLib,300); }; }
})();
