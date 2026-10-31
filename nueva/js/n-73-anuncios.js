/* APP NUEVA · FASE 3 · ANUNCIOS DE DIVIDENDO DE LA CNMV (31-oct-2026, pedido de Carlos: «que el pase anote y confirme solo»)
   Lee recogida/anuncios-dividendo.json (lo sube la recogida diaria v1.14, programa dividendos_anuncios.py) y:
   · SEGURO (en efectivo, con importe y fecha de pago):
       - año futuro  → en Anotar, ese pago queda ✅ confirmado con importe y fechas (fuente «CNMV»);
       - año en curso → en Evolución, ese pago pasa a real con importe y fechas, y el total del año se recalcula.
   · A REVISAR (dividendo opcional/scrip, propuesta a la junta, calendario estimado, o sin fecha de pago):
       - año futuro con importe → el pago queda 🟡 «anotación» con esa cifra, salvo que lo hayas cambiado tú;
       - se listan arriba en Anotar con el enlace al documento, para que los mires.
   Un anuncio ya aplicado no se vuelve a aplicar (DB.divAnunciosHechos): si luego corriges a mano, manda lo tuyo.
   Lo que se aplica se guarda con el siguiente guardado normal (en el ensayo, solo en este aparato). */
(function(){
  if(window._nanu) return; window._nanu=true;
  var DATA=null, cargando=null;
  function U(t){ return (t||'').toUpperCase(); }
  function r4(x){ return Math.round(num(x)*10000)/10000; }
  function dias(a,b){ return Math.abs((Date.parse(a+'T00:00:00')-Date.parse(b+'T00:00:00'))/864e5); }
  function cargar(){ if(DATA) return Promise.resolve(DATA); if(cargando) return cargando;
    cargando=fetch('recogida/anuncios-dividendo.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ DATA=(j&&j.anuncios)?j:{anuncios:[]}; return DATA; }).catch(function(){ DATA={anuncios:[]}; return DATA; });
    return cargando; }
  function clave(a){ return U(a.ticker)+'|'+(a.pago||a.exDiv||a.fecha)+'|'+(a.bruto==null?'':a.bruto); }
  function casar(P,a){ var f=a.pago||a.exDiv, best=-1, bd=61;
    P.forEach(function(p,i){ var g=p.pago||p.exDiv; if(!g) return; var d=dias(g,f); if(d<bd){ bd=d; best=i; } });
    return best; }

  /* año en curso → Evolución */
  function aplicarActual(a,Y){
    var T=U(a.ticker); if(typeof _evoPagosSeed!=='function') return false;
    _evoPagosSeed(T,Y); var ay=_evoEnsure(T,Y); ay.pagos=ay.pagos||[];
    var i=casar(ay.pagos,a), p=i>=0?ay.pagos[i]:null;
    if(p && !p.previsto && Math.abs(num(p.bruto)-num(a.bruto))<0.00005 && (p.pago||'')===(a.pago||'')) return false;   /* ya estaba */
    if(!p){ p={tipo:a.clase==='extraordinario'?'extraordinario':'',clase:''}; ay.pagos.push(p); }
    p.bruto=r4(a.bruto); p.neto=_evoNeto(p.bruto); if(a.exDiv) p.exDiv=a.exDiv; if(a.pago) p.pago=a.pago; p.previsto=false; p.fuente='CNMV';
    var tot=ay.pagos.reduce(function(s,q){ return s+num(q.bruto); },0);
    ay.dpaBruto=r4(tot); ay.dpaNeto=_evoNeto(ay.dpaBruto); ay.totalPrevisto=ay.pagos.some(function(q){ return q.previsto; });
    return true;
  }
  /* año futuro → Anotar (que escribe también Evolución y el total que usa la app) */
  function aplicarFuturo(a,Y,seguro){
    var A=window.nAnotar; if(!A) return false; var T=U(a.ticker);
    var P=A.pagosDe(T,Y), i=casar(P,a), p=i>=0?P[i]:null;
    if(seguro){
      if(p && p.estado==='k' && Math.abs(num(p.bruto)-num(a.bruto))<0.00005) return false;
      if(!p){ p={tipo:a.clase==='extraordinario'?'extraordinario':''}; P.push(p); }
      p.bruto=r4(a.bruto); if(a.exDiv) p.exDiv=a.exDiv; if(a.pago) p.pago=a.pago; p.estado='k';
    } else {
      if(!(num(a.bruto)>0)||!p) return false;
      if(p.estado==='c'||p.estado==='k') return false;          /* lo tuyo o lo confirmado manda */
      if(p.estado==='a'&&Math.abs(num(p.bruto)-num(a.bruto))<0.00005) return false;
      p.bruto=r4(a.bruto); if(a.exDiv) p.exDiv=a.exDiv; p.estado='a';
    }
    A.guardar(T,Y,P); return true;
  }
  window.nAnunciosAplicar=function(){
    return cargar().then(function(D){ return Promise.resolve(typeof _evoCargar==='function'?_evoCargar():null).then(function(){
      if(typeof DB==='undefined'||!DB) return 0;
      var cur=new Date().getFullYear(), hechos=DB.divAnunciosHechos=DB.divAnunciosHechos||{}, n=0;
      var saveOrig=window.scheduleSave; window.scheduleSave=function(){};      /* nAnotar.guardar no debe disparar guardados uno a uno */
      try{
        (D.anuncios||[]).forEach(function(a){
          var f=a.pago||a.exDiv; if(!f) return; var Y=+f.slice(0,4); if(!(Y>=cur)) return;
          var k=clave(a); if(hechos[k]) return;
          var ok=false;
          try{ if(a.seguro){ ok=(Y===cur)?aplicarActual(a,Y):aplicarFuturo(a,Y,true); }
               else if(Y>cur){ ok=aplicarFuturo(a,Y,false); } }catch(e){ console.warn('[anuncios]',a.ticker,e); }
          if(a.seguro||ok){ hechos[k]=new Date().toISOString().slice(0,10); }
          if(ok) n++;
        });
      } finally { window.scheduleSave=saveOrig; }
      window._nAnuAplicados=n; return n; }); });
  };
  window.nAnuncios=function(){ return DATA; };

  /* al cargar los datos */
  if(typeof afterLoad==='function'){ var oA=afterLoad; afterLoad=function(){ var r=oA.apply(this,arguments);
    Promise.resolve(r).then(function(){ return window.nAnunciosAplicar(); }).then(function(n){
      if(n&&typeof renderDividendos==='function'){ try{ renderDividendos(); }catch(e){} } }).catch(function(e){ console.warn('[anuncios]',e); });
    return r; }; }

  /* lista en Anotar: los anuncios de los últimos 90 días y los que quedan por mirar */
  window.nAnunciosHTML=function(){
    if(!DATA||!(DATA.anuncios||[]).length) return '';
    var hoy=new Date(), lim=new Date(hoy.getTime()-90*864e5).toISOString().slice(0,10), H=(DB&&DB.divAnunciosHechos)||{};
    var L=DATA.anuncios.filter(function(a){ return (a.fecha||'')>=lim; }).sort(function(a,b){ return a.fecha<b.fecha?1:-1; });
    if(!L.length) return '';
    var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
    var fd=function(f){ return f?f.split('-').reverse().join('/'):'—'; };
    var filas=L.map(function(a){ var st=a.seguro?'<span class="nd-chip k">✅ confirmado solo</span>':'<span class="nd-chip a">🟡 revísalo</span>';
      var tip={opcional:'dividendo opcional (scrip): elige efectivo o acciones',propuesta:'propuesta a la junta, aún no aprobada',calendario:'calendario estimado',efectivo:'falta la fecha de pago'}[a.tipo]||'';
      return '<tr><td>'+fd(a.fecha)+'</td><td><b>'+esc(a.ticker)+'</b></td><td>'+(a.bruto!=null?String(a.bruto).replace('.',','):'—')+'</td><td>'+fd(a.exDiv)+'</td><td>'+fd(a.pago)+'</td><td>'+st+(a.seguro?'':'<div class="muted" style="font-size:11px">'+esc(tip)+'</div>')+'</td>'+
        '<td>'+(a.url?'<a href="'+esc(a.url)+'" target="_blank" rel="noopener">ver anuncio</a>':'<span class="muted">'+esc(a.titulo||'').slice(0,40)+'</span>')+'</td></tr>'; }).join('');
    return '<div class="nd-anu"><div class="dh"><b>📣 Anuncios de dividendo en la CNMV</b> <span class="muted">· últimos 90 días · los seguros se confirman solos; los 🟡 míralos tú</span></div>'+
      '<table class="nd-dt"><thead><tr><th>Anuncio</th><th>Empresa</th><th>Bruto €</th><th>Ex-dividendo</th><th>Pago</th><th>Estado</th><th></th></tr></thead><tbody>'+filas+'</tbody></table></div>';
  };
})();
