/* APP NUEVA · FASE 3 · ANUNCIOS DE DIVIDENDO DE LA CNMV (31-oct-2026, pedido de Carlos: «que el pase anote y confirme solo»)
   Lee recogida/anuncios-dividendo.json (lo sube la recogida diaria v1.14, programa dividendos_anuncios.py) y:
   · SEGURO (en efectivo, con importe y fecha de pago):
       - año futuro  → en Anotar, ese pago queda ✅ confirmado con importe y fechas (fuente «CNMV»);
       - año en curso → en Evolución, ese pago pasa a real con importe y fechas, y el total del año se recalcula.
   · A REVISAR (dividendo opcional/scrip, propuesta a la junta, calendario estimado, o sin fecha de pago):
       - año futuro con importe → el pago queda 🟡 «anotación» con esa cifra, salvo que lo hayas cambiado tú;
       - se listan arriba en Anotar con el enlace al documento, para que los mires.
   Un anuncio ya aplicado no se vuelve a aplicar (DB.divAnunciosHechos): si luego corriges a mano, manda lo tuyo.
   Lo que se aplica se guarda con el siguiente guardado normal (en el ensayo, solo en este aparato).
   25-nov-2026 (fallo de Atresmedia: la app enseñaba 0,83 € + 0,67 € cuando el pago es UNO de 0,83 € = 0,16 ordinario + 0,67 extraordinario):
   · Si el anuncio trae «partes» (desglose ordinario/extraordinario, lo saca la recogida v1.3), se ponen las partes en su sitio y se
     quita el pago que llevara el total, si lo había: nunca quedan el total y las partes a la vez.
   · Un pago no pisa nunca a otro de distinto tipo (ordinario ↔ extraordinario) con distinto importe: se añade aparte.
   · Si junto a la fecha ya hay varios pagos que suman lo anunciado, solo se corrigen las fechas.
   · Comprobación final: si en una misma fecha quedan pagos que suman el doble de lo anunciado, se avisa en la consola y en el panel. */
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
  function clave(a){ return U(a.ticker)+'|'+(a.pago||a.exDiv||a.fecha)+'|'+(a.bruto==null?'':a.bruto)+(a.partes&&a.partes.length>1?'|p'+a.partes.length:''); }
  function esExtra(x){ return /extra/i.test(((x&&x.tipo)||'')+' '+((x&&x.clase)||'')); }
  function igual(x,y){ return Math.abs(num(x)-num(y))<0.00006; }
  function cerca(P,f,dd){ var o=[]; P.forEach(function(p,i){ var g=p.pago||p.exDiv; if(g&&f&&dias(g,f)<=dd) o.push(i); }); return o; }
  /* Núcleo común (Evolución y Anotar). Devuelve true si ha cambiado algo. `fijar(p)` pone lo propio de cada sitio. */
  function aplicarEn(P,a,fijar,esSuyo){
    var f=a.pago||a.exDiv, antes=JSON.stringify(P), extraA=(a.clase==='extraordinario');
    function poner(p,bruto,extra){ p.bruto=r4(bruto); if(a.exDiv) p.exDiv=a.exDiv; if(a.pago) p.pago=a.pago;
      if(extra){ p.tipo='extraordinario'; p.clase='puntual'; } else if(esExtra(p)){ p.tipo=''; p.clase='ordinario'; }
      fijar(p); }
    var near=cerca(P,f,10);
    if(a.partes&&a.partes.length>1){
      /* 1) fuera el pago que llevaba el TOTAL (lo que pasó con Atresmedia), salvo que sea tuyo */
      for(var k=near.length-1;k>=0;k--){ var q=P[near[k]]; if(igual(q.bruto,a.bruto)&&!(esSuyo&&esSuyo(q))){ P.splice(near[k],1); } }
      near=cerca(P,f,10); var usados={};
      a.partes.forEach(function(pt){ var ex=(pt.clase==='extraordinario'), best=-1, bd=99;
        near.forEach(function(i){ if(usados[i]) return; var q=P[i]; if(esExtra(q)!==ex) return; var d=dias(q.pago||q.exDiv,f)+(igual(q.bruto,pt.bruto)?0:0.5); if(d<bd){ bd=d; best=i; } });
        var p; if(best>=0){ p=P[best]; usados[best]=1; if(esSuyo&&esSuyo(p)&&!igual(p.bruto,pt.bruto)) return; }
        else { p={tipo:'',clase:''}; P.push(p); }
        poner(p,pt.bruto,ex); });
      return JSON.stringify(P)!==antes;
    }
    /* sin desglose: si alrededor ya hay varios pagos que SUMAN lo anunciado, es el mismo dinero repartido: solo fechas */
    if(near.length>=2){ var suma=near.reduce(function(s,i){ return s+num(P[i].bruto); },0);
      if(igual(suma,a.bruto)){ near.forEach(function(i){ var q=P[i]; if(a.exDiv) q.exDiv=a.exDiv; if(a.pago) q.pago=a.pago; }); return JSON.stringify(P)!==antes; } }
    /* el más cercano del MISMO tipo; si el más cercano es de otro tipo y otro importe, se añade aparte */
    var best=-1, bd=61;
    P.forEach(function(p,i){ var g=p.pago||p.exDiv; if(!g) return; var d=dias(g,f)+(esExtra(p)===extraA?0:30); if(d<bd){ bd=d; best=i; } });
    var p=best>=0?P[best]:null;
    if(p && esExtra(p)!==extraA && !igual(p.bruto,a.bruto)) p=null;
    if(p && esSuyo && esSuyo(p)) return false;
    if(!p){ p={tipo:extraA?'extraordinario':'',clase:extraA?'puntual':''}; P.push(p); }
    poner(p,a.bruto,extraA);
    return JSON.stringify(P)!==antes;
  }
  /* Comprobación: pagos de la misma fecha (±10 días) que suman más de lo anunciado */
  function revisarDobles(P,a){ var near=cerca(P,a.pago||a.exDiv,10), suma=near.reduce(function(s,i){ return s+num(P[i].bruto); },0);
    if(num(a.bruto)>0 && suma>num(a.bruto)+0.0001){ var m=U(a.ticker)+': en torno al '+(a.pago||a.exDiv)+' hay pagos por '+r4(suma)+' € y el anuncio de la CNMV dice '+a.bruto+' €';
      console.warn('[anuncios] posible doble cuenta · '+m); (window._nAnuDobles=window._nAnuDobles||[]).push(m); } }
  function casar(P,a){ var f=a.pago||a.exDiv, best=-1, bd=61;
    P.forEach(function(p,i){ var g=p.pago||p.exDiv; if(!g) return; var d=dias(g,f); if(d<bd){ bd=d; best=i; } });
    return best; }

  /* año en curso → Evolución */
  function aplicarActual(a,Y){
    var T=U(a.ticker); if(typeof _evoPagosSeed!=='function') return false;
    _evoPagosSeed(T,Y); var ay=_evoEnsure(T,Y); ay.pagos=ay.pagos||[];
    var ok=aplicarEn(ay.pagos,a,function(p){ p.neto=_evoNeto(p.bruto); p.previsto=false; p.fuente='CNMV'; });
    if(ok){ ay.pagos.sort(function(x,y){ var fx=x.exDiv||x.pago||'', fy=y.exDiv||y.pago||''; return fx<fy?-1:fx>fy?1:(esExtra(x)?1:0)-(esExtra(y)?1:0); });
      var tot=ay.pagos.reduce(function(s,q){ return s+num(q.bruto); },0);
      ay.dpaBruto=r4(tot); ay.dpaNeto=_evoNeto(ay.dpaBruto); ay.totalPrevisto=ay.pagos.some(function(q){ return q.previsto; }); }
    revisarDobles(ay.pagos,a);
    return ok;
  }
  /* año futuro → Anotar (que escribe también Evolución y el total que usa la app) */
  function aplicarFuturo(a,Y,seguro){
    var A=window.nAnotar; if(!A) return false; var T=U(a.ticker);
    var P=A.pagosDe(T,Y), i=casar(P,a), p=i>=0?P[i]:null;
    if(seguro){
      var ok=aplicarEn(P,a,function(q){ q.estado='k'; });
      revisarDobles(P,a); if(!ok) return false;
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

  /* Borradores de la app vieja (Actualizar dividendos, «sin volcar»): en la nueva no hay «Volcar», así que lo
     tecleado pasa a Anotar como TU estimación del total del año (✏️, repartido en la proporción de los pagos). Una casilla
     vaciada a propósito («quitar») vuelve a lo proyectado. Solo años futuros. */
  window.nBorradorAAnotar=function(){
    var A=window.nAnotar; if(!A||typeof DB==='undefined'||!DB||!DB.divDraft) return [];
    var cur=new Date().getFullYear(), hecho=[], saveOrig=window.scheduleSave; window.scheduleSave=function(){};
    try{ Object.keys(DB.divDraft).forEach(function(y){ var Y=+y, D=DB.divDraft[y]||{}; if(!(Y>cur)) return;
      Object.keys(D).forEach(function(t){ var raw=String(D[t]==null?'':D[t]).trim(), T=U(t);
        try{ if(raw===''){ A.volver(T,Y); hecho.push(T+' '+Y+': quitado'); }
             else { var v=num(raw.replace(',','.')); if(!(v>=0)) return; A.guardar(T,Y,A.repartir(A.pagosDe(T,Y),v)); hecho.push(T+' '+Y+': '+v); }
             delete D[t]; }catch(e){ console.warn('[borrador]',T,Y,e); } });
      if(!Object.keys(D).length) delete DB.divDraft[y]; }); }
    finally{ window.scheduleSave=saveOrig; }
    window._nBorradorMigrado=hecho; return hecho; };
  if(typeof divBorradorPendiente==='function'){ var oBP=divBorradorPendiente; divBorradorPendiente=function(){
    try{ window.nBorradorAAnotar(); }catch(e){} return oBP.apply(this,arguments); }; }

  /* al cargar los datos */
  if(typeof afterLoad==='function'){ var oA=afterLoad; afterLoad=function(){ var r=oA.apply(this,arguments);
    Promise.resolve(r).then(function(){ return Promise.resolve(typeof _evoCargar==='function'?_evoCargar():null); }).then(function(){ try{ window.nBorradorAAnotar(); }catch(e){} return window.nAnunciosAplicar(); }).then(function(n){
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
