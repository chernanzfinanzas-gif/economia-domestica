/* APP NUEVA · GUÍAS DE DIVIDENDO DE LA EMPRESA (15-nov-2026, Carlos: «yo lo leo, te lo comunico, compruebas y sustituimos
   manual en nuestra previsión con lo que acordemos»).
   Cuando una empresa dice cuánto piensa pagar en un año futuro (plan estratégico, presentación de resultados), esa cifra
   sustituye a nuestra proyección por porcentaje. NO se lee nada cada día: el fichero «guias-dividendo.json» (raíz del repo)
   solo se toca cuando Carlos avisa de una noticia y la cifra se ha comprobado en el documento de la CNMV.
   · Forma: {guias:[{ticker, anio, dpa (€ brutos por acción, total del año), fuente, url, fecha, nota}]}.
   · Solo años FUTUROS. El total del año se reparte entre los pagos previstos en su proporción y queda 🟡 «anotación».
   · Manda lo más firme: un pago ✅ confirmado (CNMV) no se toca, y si el año lo has corregido tú (✏️) la guía no entra.
   · Una guía ya aplicada no se vuelve a aplicar (DB.divGuiasHechas): si luego corriges a mano, manda lo tuyo.
   · Es una promesa de la empresa, no un anuncio: por eso queda en amarillo y con su lista aparte en Anotar. */
(function(){
  if(window._nguia) return; window._nguia=true;
  var DATA=null, cargando=null;
  function U(t){ return String(t||'').toUpperCase(); }
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function r4(x){ return Math.round(N(x)*10000)/10000; }
  function cargar(){ if(DATA) return Promise.resolve(DATA); if(cargando) return cargando;
    cargando=fetch('guias-dividendo.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ DATA=(j&&Array.isArray(j.guias))?j:{guias:[]}; return DATA; }).catch(function(){ DATA={guias:[]}; return DATA; });
    return cargando; }
  function clave(g){ return U(g.ticker)+'|'+g.anio+'|'+r4(g.dpa); }
  /* 'ok' aplicada ahora · 'igual' ya estaba · 'tuyo' lo has corregido tú · 'firme' todo confirmado · '' no se puede */
  function aplicar(g){
    var A=window.nAnotar; if(!A) return ''; var T=U(g.ticker), Y=+g.anio, v=N(g.dpa); if(!T||!(Y>0)||!(v>0)) return '';
    var P=A.pagosDe(T,Y)||[];
    if(P.some(function(p){ return p.estado==='c'; })) return 'tuyo';
    if(P.length&&P.every(function(p){ return p.estado==='k'; })) return 'firme';
    var tot=r4(P.reduce(function(s,p){ return s+N(p.bruto); },0));
    if(P.length&&Math.abs(tot-v)<0.00005&&P.some(function(p){ return p.estado==='a'; })) return 'igual';
    if(!P.length) P=[{exDiv:'',pago:'',bruto:r4(v),tipo:'',estado:'a'}];
    else { P=A.repartir(P,v); P.forEach(function(p){ if(p.estado!=='k') p.estado='a'; }); }
    A.guardar(T,Y,P); return 'ok';
  }
  window.nGuiasAplicar=function(){
    return cargar().then(function(D){ return Promise.resolve(typeof _evoCargar==='function'?_evoCargar():null).then(function(){
      if(typeof DB==='undefined'||!DB) return 0;
      var cur=new Date().getFullYear(), hechas=DB.divGuiasHechas=DB.divGuiasHechas||{}, n=0;
      var saveOrig=window.scheduleSave; window.scheduleSave=function(){};      /* como los anuncios: se guarda con el siguiente guardado normal */
      try{ (D.guias||[]).forEach(function(g){ if(!(+g.anio>cur)) return; var k=clave(g); if(hechas[k]) return;
          var r=''; try{ r=aplicar(g); }catch(e){ console.warn('[guias]',g.ticker,e); }
          if(r){ hechas[k]={cuando:new Date().toISOString().slice(0,10),r:r}; } if(r==='ok') n++; }); }
      finally{ window.scheduleSave=saveOrig; }
      window._nGuiasAplicadas=n; return n; }); });
  };
  window.nGuias=function(){ return DATA; };

  /* al cargar los datos, después de los anuncios de la CNMV */
  if(typeof afterLoad==='function'){ var oA=afterLoad; afterLoad=function(){ var r=oA.apply(this,arguments);
    Promise.resolve(r).then(function(){ return (typeof window.nAnunciosAplicar==='function')?window.nAnunciosAplicar().catch(function(){}):null; })
      .then(function(){ return window.nGuiasAplicar(); })
      .then(function(n){ if(n&&typeof renderDividendos==='function'){ try{ renderDividendos(); }catch(e){} } }).catch(function(e){ console.warn('[guias]',e); });
    return r; }; }

  /* lista en Anotar, debajo de los anuncios de la CNMV */
  if(typeof window.nAnunciosHTML==='function'){ var oH=window.nAnunciosHTML; window.nAnunciosHTML=function(){
    var h=''; try{ h=oH.apply(this,arguments)||''; }catch(e){}
    try{ var cur=new Date().getFullYear(), L=((DATA&&DATA.guias)||[]).filter(function(g){ return +g.anio>cur; }); if(!L.length) return h;
      var H=(typeof DB!=='undefined'&&DB&&DB.divGuiasHechas)||{};
      var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
      var fd=function(f){ return f?String(f).slice(0,10).split('-').reverse().join('/'):'—'; };
      var TX={ok:'<span class="nd-chip a">🟡 provisional · en tu previsión</span>',igual:'<span class="nd-chip a">🟡 provisional · en tu previsión</span>',tuyo:'<span class="nd-chip">✏️ manda tu cifra</span>',firme:'<span class="nd-chip k">✅ ya confirmado</span>'};
      L=L.slice().sort(function(a,b){ return U(a.ticker)<U(b.ticker)?-1:(U(a.ticker)>U(b.ticker)?1:(+a.anio-(+b.anio))); });
      var filas=L.map(function(g){ var e=H[clave(g)];
        return '<tr><td><b>'+esc(U(g.ticker))+'</b></td><td>'+esc(g.anio)+'</td><td>'+String(r4(g.dpa)).replace('.',',')+'</td><td>'+(TX[e&&e.r]||'<span class="muted">sin aplicar</span>')+(g.nota?'<div class="muted" style="font-size:11px">'+esc(g.nota)+'</div>':'')+'</td>'+
          '<td>'+fd(g.fecha)+'</td><td>'+(g.url?'<a href="'+esc(g.url)+'" target="_blank" rel="noopener">'+esc(g.fuente||'ver documento')+'</a>':'<span class="muted">'+esc(g.fuente||'')+'</span>')+'</td></tr>'; }).join('');
      return h+'<div class="nd-anu"><div class="dh"><b>📌 Lo que la empresa dice que pagará</b> <span class="muted">· cifras comprobadas en el documento de la CNMV · sustituyen a la proyección por porcentaje · provisionales: son una promesa de la empresa, no un anuncio confirmado</span></div>'+
        '<table class="nd-dt"><thead><tr><th>Empresa</th><th>Año</th><th>€ por acción</th><th>Estado</th><th>Dicho el</th><th>Documento</th></tr></thead><tbody>'+filas+'</tbody></table></div>';
    }catch(e){ return h; } }; }
})();
