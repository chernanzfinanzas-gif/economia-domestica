/* APP NUEVA · SEÑALES POR DECIDIR con botón «Revisar». 29-oct-2026.
   Carlos (28-oct): «En el panel de avisos ha de poner si la señal está abierta, si has hecho propuesta pondrá un botón de revisar
   que lleva a una ventana con tu sugerencia y las opciones. Ahí tomamos la decisión con la que se da por revisada y se anota en
   la ficha y en Mis Decisiones».
   · Lee los paquetes de señales pendientes de recogida/estado-v3.json (los publica subir_datos.py desde el PC).
   · La decisión se guarda en Drive, en un fichero APARTE y pequeño, «senales-decisiones.json»: no toca los datos de la app.
   · El pase de novedades (o Claude en el chat) la recoge, la aprueba (aplicar_decisiones_app.py) y la señal queda REVISADA en la
     ficha y en Mis Decisiones; entonces el paquete deja de salir en estado-v3.json y desaparece de aquí. */
(function(){
  var FN='senales-decisiones.json', OPC=['REAFIRMAR','AJUSTA PO','REBAJA','VENDE'];
  var AYUDA={'REAFIRMAR':'No cambia nada: la decisión de la tesis sigue como está.','AJUSTA PO':'Se rehace la valoración con los datos que haya: pueden cambiar el PO y la banda.',
             'REBAJA':'La decisión baja un escalón (COMPRAR → MANTENER → ESPERAR → REDUCIR) hasta que se reescriba la tesis. Banda y PO no cambian.','VENDE':'La decisión pasa a VENDER (salida total o parcial) hasta que se reescriba la tesis.'};
  var NOMS={S1:'cotización en el stop',S2:'semáforo rojo o tesis rota',S3:'cotización sobre el PO',S4:'tesis con más de 12 meses',S6:'dos periodos seguidos en ámbar'};
  window._nSen=window._nSen||null; window._nSenDec=window._nSenDec||{schemaVersion:1,decisiones:{}};
  var _fid=null, _msg='';
  function ahora(){ var d=new Date(); d=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return d.toISOString().slice(0,16); }   /* hora local */
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rep(){ if(typeof window.nPanelAvisos==='function') try{ window.nPanelAvisos(); }catch(e){} }

  function cargar(){
    fetch('recogida/estado-v3.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
      window._nSen=((j&&j.revisiones_pendientes)||[]).filter(function(p){ return p.tipo==='senales'; }); rep();
    }).catch(function(){ window._nSen=[]; });
    cargarDrive();
  }
  function hayDrive(){ return !window._demoOn && typeof gfetch==='function' && typeof accessToken!=='undefined' && accessToken; }
  function cargarDrive(){
    if(!hayDrive()) return;
    var q=encodeURIComponent("name='"+FN+"' and trashed=false");
    gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id)&pageSize=1').then(function(r){ return r.ok?r.json():null; }).then(function(j){
      var f=j&&j.files&&j.files[0]; if(!f) return null; _fid=f.id;
      return gfetch('https://www.googleapis.com/drive/v3/files/'+_fid+'?alt=media').then(function(r){ return r.ok?r.json():null; });
    }).then(function(d){ if(d&&d.decisiones){ window._nSenDec=d; rep(); } }).catch(function(){});
  }
  function guardar(){
    var D=window._nSenDec; D.schemaVersion=1; D.actualizado=ahora();
    if(window._demoOn||!hayDrive()){ _msg=window._demoOn?'Modo demo: la decisión no se guarda.':'Sin conexión a Drive: entra con tu cuenta para guardar.'; return Promise.resolve(false); }
    var body=JSON.stringify(D,null,1);
    if(_fid) return gfetch('https://www.googleapis.com/upload/drive/v3/files/'+_fid+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:body}).then(function(r){ return r.ok; });
    var b='-----sen'+Date.now();
    var mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:FN})+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
    return gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp})
      .then(function(r){ return r.ok?r.json():null; }).then(function(j){ if(j&&j.id){ _fid=j.id; return true; } return false; });
  }

  /* 29-oct (Carlos: «si no tengo una empresa y la decisión es vender se pone igual, no?»): sin posición, VENDE no se ofrece y
     una propuesta de VENDE pasa a REBAJA (no comprar y bajar la decisión). La cartera solo la conoce la app. */
  function tiene(tk){ try{ var T=String(tk||'').toUpperCase(); return (typeof invPositions==='function'?invPositions():[]).some(function(p){ return String(p.ticker||'').toUpperCase().replace(/\.MC$/,'')===T && (+p.acciones||+p.acc||0)>0.0001; }); }catch(e){ return true; } }
  function propDe(p,pr){ var d=pr&&pr.decision; return (d==='VENDE'&&!tiene(p.ticker))?'REBAJA':d; }
  function paquetes(){ return (window._nSen||[]).filter(function(p){ return (p.senales||[]).length; }); }
  function estadoDe(p){
    if(window._nSenDec.decisiones[p.carpeta]) return 'decidida';
    return (p.propuesta||[]).length?'propuesta':'abierta';
  }
  /* los avisos viejos de S1-S6 de una empresa con paquete se sustituyen por la fila nueva */
  window.nSenCubre=function(x){
    if(!x||!x.sig||!/^S[1-6]$/.test(x.sig)) return false;
    return paquetes().some(function(p){ return p.ticker===(x.tick||'') && (p.senales||[]).some(function(s){ return s.senal===x.sig; }); });
  };
  window.nSenCuenta=function(){ return paquetes().filter(function(p){ return estadoDe(p)!=='decidida'; }).length; };
  window.nSenHtml=function(){
    var P=paquetes(); if(!P.length) return '';
    var nProp=P.filter(function(p){ return estadoDe(p)==='propuesta'; }).length;
    var orden={propuesta:0,abierta:1,decidida:2};
    P=P.slice().sort(function(a,b){ return (orden[estadoDe(a)]-orden[estadoDe(b)])||(a.ticker<b.ticker?-1:1); });
    var ST={propuesta:['Propuesta lista','#FEF3C7','#92400E','#D97706'],abierta:['Abierta · sin propuesta','#F3F5F8','#5B6B7C','#94A3B8'],decidida:['Decidida · falta aplicar','#DBEAFE','#1E40AF','#2563EB']};
    var h='<div class="n-avg n-seng">🚦 Señales por decidir <span class="n-senn">'+P.length+'</span>'+(nProp>1?'<button class="n-senall" data-senall="1">Aceptar todas las propuestas ('+nProp+')</button>':'')+'</div>';
    if(_msg) h+='<div class="n-senmsg">'+esc(_msg)+'</div>';
    var todos=window._nSenMas||P.length<=6, P2=todos?P:P.slice(0,6);
    h+=P2.map(function(p){ var e=estadoDe(p), st=ST[e];
      var sen=(p.senales||[]).map(function(s){ var pr=(p.propuesta||[]).filter(function(x){ return x.senal===s.senal; })[0], dd=(window._nSenDec.decisiones[p.carpeta]||{}).filas||[];
        var d=dd.filter(function(x){ return x.senal===s.senal; })[0];
        var pd=pr?propDe(p,pr):null;
        return '<div class="n-senl"><b>'+esc(s.senal)+'</b> '+esc(s.motivo||NOMS[s.senal]||'')+(d?' → <b class="n-sendec">'+esc(d.decision)+'</b>':(pr?' → propongo <b>'+esc(pd)+'</b>'+(pd!==pr.decision?' <span class="n-sennp">(no la tienes)</span>':''):''))+'</div>'; }).join('');
      return '<div class="n-av n-sen" style="--ac:'+st[3]+'"><span class="n-avst" style="background:'+st[1]+';color:'+st[2]+'">'+st[0]+'</span>'+
        '<div class="n-avtx n-sentx"><b>'+esc(p.ticker)+'</b>'+sen+'</div>'+
        (e!=='abierta'?'<button class="n-avbt" data-senrev="'+esc(p.carpeta)+'">'+(e==='decidida'?'Ver':'Revisar')+'</button>':'<span></span>')+'<span></span></div>'; }).join('');
    if(P.length>6) h+='<div class="n-avmas" data-senmas="1">'+(window._nSenMas?'ver menos ▴':'ver las '+(P.length-6)+' restantes ▾')+'</div>';
    return h;
  };

  /* ---------- ventana de decisión ---------- */
  function cerrar(){ var m=document.getElementById('nSenModal'); if(m) m.remove(); }
  function abrir(carpeta){
    var p=paquetes().filter(function(x){ return x.carpeta===carpeta; })[0]; if(!p) return;
    var prev=(window._nSenDec.decisiones[carpeta]||{}).filas||[], tengo=tiene(p.ticker), OP=tengo?OPC:OPC.filter(function(o){ return o!=='VENDE'; });
    var h='<div class="n-senbox" role="dialog" aria-modal="true"><div class="n-senhd"><div><div class="n-sentk">'+esc(p.ticker)+' · señales</div><div class="n-sensub">'+esc(carpeta)+'</div></div><button class="n-senx" data-senx="1" aria-label="Cerrar">✕</button></div>';
    if((p.datos||[]).length) h+='<div class="n-sendat"><div class="n-senlab">Datos para decidir</div><ul>'+p.datos.map(function(l){ return '<li>'+esc(l)+'</li>'; }).join('')+'</ul></div>';
    h+=(p.senales||[]).map(function(s,i){
      var pr=(p.propuesta||[]).filter(function(x){ return x.senal===s.senal; })[0]||{}, d=prev.filter(function(x){ return x.senal===s.senal; })[0];
      var pd=propDe(p,pr), sel=(d&&d.decision)||pd||'REAFIRMAR'; if(!tengo&&sel==='VENDE') sel='REBAJA';
      return '<div class="n-sens" data-sens="'+esc(s.senal)+'" data-prop="'+esc(pr.decision||'')+'" data-sinpos="'+(tengo?'':'1')+'"><div class="n-senlab">'+esc(s.senal)+' · '+esc(NOMS[s.senal]||'')+'</div><div class="n-senmot">'+esc(s.motivo||'')+'</div>'+
        (pr.decision?'<div class="n-senprop"><span>Mi propuesta: <b>'+esc(pd)+'</b></span>'+(pd!==pr.decision?'<p class="n-sennp">No la tienes en cartera: vender no aplica. La propuesta era VENDE y pasa a REBAJA (no comprar y bajar la decisión).</p>':'')+'<p>'+esc(pr.motivo||'')+'</p></div>':'')+
        (!tengo&&!pr.decision?'<p class="n-sennp">No la tienes en cartera: la opción de vender no se ofrece.</p>':'')+
        '<div class="n-senopc" style="grid-template-columns:repeat('+OP.length+',1fr)">'+OP.map(function(o){ return '<label class="'+(o===sel?'on':'')+'"><input type="radio" name="sen'+i+'" value="'+o+'"'+(o===sel?' checked':'')+'><b>'+o+'</b>'+(o===pd?' <i>propuesta</i>':'')+'<small>'+AYUDA[o]+'</small></label>'; }).join('')+'</div>'+
        '<textarea class="n-sencom" placeholder="Comentario (opcional; si cambias la propuesta, di por qué)">'+esc((d&&d.comentario)||'')+'</textarea></div>'; }).join('');
    h+='<div class="n-senpie"><span class="n-senaviso">Al confirmar se guarda en tu Drive. El siguiente pase la aprueba: la señal queda revisada en la ficha y en Mis Decisiones.</span><button class="n-senok" data-senok="'+esc(carpeta)+'">Confirmar decisión</button></div></div>';
    cerrar(); var m=document.createElement('div'); m.id='nSenModal'; m.className='n-senov'; m.innerHTML=h; document.body.appendChild(m);
  }
  function confirmar(carpeta){
    var m=document.getElementById('nSenModal'); if(!m) return; var p=paquetes().filter(function(x){ return x.carpeta===carpeta; })[0];
    var filas=[].map.call(m.querySelectorAll('[data-sens]'),function(n){ var r=n.querySelector('input:checked');
      var f={senal:n.getAttribute('data-sens'),decision:r?r.value:'REAFIRMAR',propuesta:n.getAttribute('data-prop')||null,comentario:(n.querySelector('textarea').value||'').trim()};
      if(n.getAttribute('data-sinpos')) f.sinPosicion=true; return f; });
    window._nSenDec.decisiones[carpeta]={ticker:p&&p.ticker,decidido:ahora(),filas:filas};
    _msg=''; guardar().then(function(ok){ _msg=ok?'✓ Guardado en Drive. Se aplica en el próximo pase de novedades (o dímelo en el chat).':(_msg||'No se pudo guardar en Drive.'); cerrar(); rep(); });
  }
  function aceptarTodas(){
    var P=paquetes().filter(function(p){ return estadoDe(p)==='propuesta'; }); if(!P.length) return;
    if(!confirm('Aceptar mi propuesta en las '+P.length+' empresas:\n\n'+P.map(function(p){ return p.ticker+': '+(p.propuesta||[]).map(function(x){ var d=propDe(p,x); return x.senal+' '+d+(d!==x.decision?' (no la tienes; era VENDE)':''); }).join(', '); }).join('\n'))) return;
    var t=ahora();
    P.forEach(function(p){ var sp=!tiene(p.ticker); window._nSenDec.decisiones[p.carpeta]={ticker:p.ticker,decidido:t,filas:(p.propuesta||[]).map(function(x){ var d=propDe(p,x), f={senal:x.senal,decision:d,propuesta:x.decision,comentario:d!==x.decision?'Sin posición en cartera: la propuesta VENDE pasa a REBAJA.':''}; if(sp) f.sinPosicion=true; return f; })}; });
    guardar().then(function(ok){ _msg=ok?'✓ '+P.length+' decisiones guardadas en Drive. Se aplican en el próximo pase (o dímelo en el chat).':(_msg||'No se pudo guardar en Drive.'); rep(); });
  }
  document.addEventListener('click',function(e){
    var t=e.target; if(!t.closest) return;
    var r=t.closest('[data-senrev]'); if(r){ abrir(r.getAttribute('data-senrev')); return; }
    if(t.closest('[data-senx]')||t.id==='nSenModal'){ cerrar(); return; }
    var o=t.closest('[data-senok]'); if(o){ confirmar(o.getAttribute('data-senok')); return; }
    if(t.closest('[data-senall]')){ aceptarTodas(); return; }
    if(t.closest('[data-senmas]')){ window._nSenMas=!window._nSenMas; rep(); return; }
    var l=t.closest('.n-senopc label'); if(l){ var g=l.parentElement; [].forEach.call(g.children,function(c){ c.classList.toggle('on',c===l); }); }
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') cerrar(); });
  /* arranque: al cargar y cada vez que se conecta Drive */
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',cargar); else setTimeout(cargar,0);
  if(typeof window.startSession==='function'){ var _ss=window.startSession; window.startSession=function(){ var r=_ss.apply(this,arguments); setTimeout(cargarDrive,1500); return r; }; }
  setTimeout(cargarDrive,4000);
})();
