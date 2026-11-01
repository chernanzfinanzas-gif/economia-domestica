/* APP NUEVA · Rentabilidad · TABLA POR EMPRESA NUEVA (1-nov-2026, Carlos eligió el «boceto 2»)
   - Sin la fila que se desplegaba: todo a la vista. Peso · Valor · Plusvalía · Dividendos · Derechos · Ganado ·
     Rent. total · TIR · TR año · TR 1A · TR 3A.
   - Debajo de cada empresa, la barra de «de dónde sale lo ganado»: precio (azul), dividendos (verde), derechos (ámbar);
     si el precio resta, en rojo claro. Se mide contra la empresa que más ha ganado.
   - Ordenar como antes con «Ordenar por» (más opciones) y, además, pulsando el título de cualquier columna (otra vez = al revés).
   - En el móvil, una tarjeta por empresa con todas las cifras y la barra al pie. TOTAL siempre arriba. */
(function(){
  if(typeof renderRentabEmpresas!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function eur(x,s){ if(x==null||!isFinite(x)) return '—'; var v=Math.round(x); return (v<0?'−':(s&&v>0?'+':''))+String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' €'; }
  function pc(x,s){ if(x==null||!isFinite(x)) return '—'; var v=x*100; return (v<0?'−':(s&&v>0?'+':''))+Math.abs(v).toLocaleString('es-ES',{maximumFractionDigits:1,minimumFractionDigits:1})+' %'; }
  function cl(x){ return x==null||!isFinite(x)?'':(x>=0?'n-rt-pos':'n-rt-neg'); }
  function pill(x){ return x==null||!isFinite(x)?'—':'<span class="n-rt-pill '+(x>=0?'g':'r')+'">'+pc(x,1)+'</span>'; }
  var COLS=[['t','Empresa','l'],['peso','Peso'],['valor','Valor'],['pl','Plusvalía','g'],['divCob','Dividendos'],['derechos','Derechos'],['balance','Ganado'],['rentTot','Rent. total','g'],['xirr','TIR'],['trYTD','TR año','g'],['tr1A','TR 1A'],['tr3A','TR 3A']];
  /* «Ordenar por»: las de siempre y las nuevas columnas */
  try{ if(typeof _RENTA_ORD!=='undefined'&&_RENTA_ORD.push){ [['divCob','Dividendos cobrados'],['derechos','Derechos'],['balance','Ganado'],['trYTD','TR este año'],['tr3A','TR 3 años'],['t','Nombre']].forEach(function(o){
      if(!_RENTA_ORD.some(function(x){ return x[0]===o[0]; })) _RENTA_ORD.push(o); }); } }catch(e){}
  function dir(k){ var d=window._nRentaDir; return (d===1||d===-1)?d:(k==='t'?1:-1); }
  function ordenar(rows){ var k=window._rentaOrd||'rentTot', d=dir(k);
    return rows.slice().sort(function(a,b){ var va=a[k],vb=b[k];
      if(k==='t') return d*(String(va)<String(vb)?-1:1);
      va=(va==null||!isFinite(va))?-1e18:va; vb=(vb==null||!isFinite(vb))?-1e18:vb; return d*(va-vb); }); }
  function nombre(t){ var n=((DB.valores||{})[t]||{}).nombre||t; return String(n).replace(/,? (S\.?A\.?|Sociedad An[oó]nima)\b.*$/i,'').slice(0,26); }
  function barra(x,m){ var pl=N(x.pl), dv=N(x.divCob), de=N(x.derechos), w=function(v){ return m>0?(Math.max(0,v)/m*100).toFixed(2)+'%':'0%'; };
    var b='<div class="n-rt-bar">'+(pl<0?'<i style="width:'+(m>0?Math.min(100,-pl/m*100).toFixed(2):0)+'%;background:#FCA5A5"></i>':'<i style="width:'+w(pl)+';background:#3B82F6"></i>')+'<i style="width:'+w(dv)+';background:#16A34A"></i><i style="width:'+w(de)+';background:#F59E0B"></i></div>';
    var tot=Math.max(0,pl)+dv+de, t='';
    if(pl<0) t='el precio resta '+eur(-pl)+(dv+de>0?' · cobrado '+eur(dv+de):'');
    else if(tot>0){ var pd=Math.round(dv/tot*100), pr=de?(Math.round(de/tot*100)||'<1'):0; t=(100-pd-(+pr||0))+' % precio · '+pd+' % dividendos'+(de?' · '+pr+' % derechos':''); }
    return '<div class="n-rt-bw">'+b+'<span>'+t+'</span></div>'; }
  function tabla(R,CR){
    var T=_rentaTotales(R.rows), rows=ordenar(R.rows), k=window._rentaOrd||'rentTot', d=dir(k);
    var TT={pl:T.pl,divCob:T.divCob,derechos:N(T.derechos),balance:T.balance};
    var MX=0; R.rows.forEach(function(r){ MX=Math.max(MX,Math.abs(N(r.pl))+N(r.divCob)+N(r.derechos)); });
    var h='<div class="n-rt-top"><div class="n-rt-leg"><span><b style="background:#3B82F6"></b>Plusvalía</span><span><b style="background:#16A34A"></b>Dividendos</span><span><b style="background:#F59E0B"></b>Derechos</span><span><b style="background:#FCA5A5"></b>Pérdida de precio</span><span class="mu">· la barra se mide contra la empresa que más ha ganado</span></div></div>';
    h+='<div class="n-rt-desk"><table class="n-rt"><thead><tr>'+COLS.map(function(c){ return '<th data-nrto="'+c[0]+'" class="'+(c[2]==='l'?'l ':'')+(c[2]==='g'?'grp ':'')+(k===c[0]?'on':'')+'">'+c[1]+(k===c[0]?(d<0?' ▼':' ▲'):'')+'</th>'; }).join('')+'</tr></thead><tbody>';
    h+='<tr class="tot"><td class="l">TOTAL <span class="nm">'+T.n+' posiciones</span></td><td>100 %</td><td>'+eur(T.valor)+'</td><td class="grp '+cl(T.pl)+'">'+eur(T.pl,1)+'<span class="two">'+pc(T.plPct,1)+'</span></td><td class="n-rt-pos">'+eur(T.divCob,1)+'</td><td class="'+(TT.derechos?'n-rt-pos':'')+'">'+(TT.derechos?eur(TT.derechos,1):'·')+'</td><td class="'+cl(T.balance)+'">'+eur(T.balance,1)+'</td><td class="grp">'+pill(T.rentTot)+'</td><td>'+pill(CR?CR.xirr:null)+'</td><td class="grp">—</td><td>—</td><td>—</td></tr>';
    h+='<tr class="tot br"><td colspan="12">'+barra(TT,Math.max(0,T.pl)+T.divCob+TT.derechos)+'</td></tr>';
    rows.forEach(function(r){ var dv=N(r.divCob), de=N(r.derechos);
      h+='<tr><td class="l"><b class="renta-tk" data-ficha="'+E(r.t)+'">'+E(r.t)+'</b><span class="nm">'+E(nombre(r.t))+'</span>'+((r.carteras&&r.carteras.length>1)?' <span class="n-rt-pill c" title="'+E(r.carteras.join(' + '))+'">2 carteras</span>':'')+'</td>'+
        '<td>'+pc(r.peso)+'</td><td class="b">'+eur(r.valor)+'</td><td class="grp '+cl(r.pl)+'">'+eur(r.pl,1)+'<span class="two">'+pc(r.plPct,1)+'</span></td>'+
        '<td class="'+(dv?'n-rt-pos':'')+'">'+(dv?eur(dv,1):'·')+'</td><td class="'+(de?'n-rt-pos':'')+'">'+(de?eur(de,1):'·')+'</td><td class="b '+cl(r.balance)+'">'+eur(r.balance,1)+'</td>'+
        '<td class="grp">'+pill(r.rentTot)+'</td><td>'+pill(r.xirr)+'</td><td class="grp '+cl(r.trYTD)+'">'+pc(r.trYTD,1)+'</td><td class="'+cl(r.tr1A)+'">'+pc(r.tr1A,1)+'</td><td class="'+cl(r.tr3A)+'">'+pc(r.tr3A,1)+'</td></tr>'+
        '<tr class="br"><td colspan="12">'+barra(r,MX)+'</td></tr>'; });
    h+='</tbody></table></div><div class="n-rt-mob">';
    [{tot:1}].concat(rows).forEach(function(r){ var x=r.tot?{t:'TOTAL',valor:T.valor,pl:T.pl,divCob:T.divCob,derechos:TT.derechos,balance:T.balance,rentTot:T.rentTot,xirr:CR?CR.xirr:null}:r;
      h+='<div class="n-rt-mc'+(r.tot?' tot':'')+'"><div class="h"><div>'+(r.tot?'<b>TOTAL</b> <span class="nm">'+T.n+' posiciones</span>':'<b class="renta-tk" data-ficha="'+E(r.t)+'">'+E(r.t)+'</b><span class="nm">'+E(nombre(r.t))+'</span>')+'</div><div class="b">'+eur(x.valor)+'</div></div><div class="g">'+
        '<div>Plusvalía<b class="'+cl(x.pl)+'">'+eur(x.pl,1)+'</b></div><div>Dividendos<b>'+eur(N(x.divCob),1)+'</b></div><div>Derechos<b>'+(N(x.derechos)?eur(x.derechos,1):'·')+'</b></div>'+
        '<div>Ganado<b class="'+cl(x.balance)+'">'+eur(x.balance,1)+'</b></div><div>Rent. total<b>'+pc(x.rentTot,1)+'</b></div><div>TIR<b>'+pc(x.xirr,1)+'</b></div>'+
        (r.tot?'':'<div>TR año<b>'+pc(x.trYTD,1)+'</b></div><div>TR 1A<b>'+pc(x.tr1A,1)+'</b></div><div>TR 3A<b>'+pc(x.tr3A,1)+'</b></div>')+'</div>'+
        barra(x,r.tot?(Math.max(0,T.pl)+T.divCob+TT.derechos):MX)+'</div>'; });
    return h+'</div><div class="n-rt-nota">Ordenar: pulsa el título de cualquier columna (otra vez = al revés) o usa «Ordenar por». El nombre abre la ficha.</div>'; }


  /* ---------- CERRADAS (1-nov-2026, Carlos: «faltaría añadir las cerradas… el dividendo total cobrado, la rentabilidad
     obtenida de las operaciones cerradas»). Archivadas (DB.cerradas, con cerradaCalc) y ciclos cerrados del todo que siguen
     en Operaciones sin archivar (mismo criterio que _cerradasNeto). Ganado = venta − compra (con comisiones) + dividendos. */
  function comi(o){ return (typeof khComision==='function')?N(khComision(o)):N(o&&o.comision); }
  function ms(f){ return Date.parse(String(f||'').slice(0,10)+'T00:00:00'); }
  function ciclo(t,nm,ops,divs){ ops=ops.slice().sort(function(a,b){ return String(a.fecha||'').localeCompare(String(b.fecha||'')); });
    var cf=[], coste=0, venta=0, dv=0;
    ops.forEach(function(o){ var a=N(o.acciones)*N(o.precio); if(o.tipo==='venta'){ var v=a-comi(o); venta+=v; cf.push({t:ms(o.fecha),a:v}); } else { var c=a+comi(o); coste+=c; cf.push({t:ms(o.fecha),a:-c}); } });
    (divs||[]).forEach(function(d){ if(!d.fecha) return; var held=0; ops.forEach(function(o){ if(o.tipo==='venta'){ if(o.fecha<d.fecha) held-=N(o.acciones); } else if(o.fecha<=d.fecha) held+=N(o.acciones); });
      var e=held*N(d.importe); if(e>0.0001){ dv+=e; cf.push({t:ms(d.fecha),a:e}); } });
    var f0=(ops.filter(function(o){ return o.tipo!=='venta'; })[0]||{}).fecha||'', vs=ops.filter(function(o){ return o.tipo==='venta'; }), f1=vs.length?vs[vs.length-1].fecha:'';
    var x=null; try{ x=(typeof _xirr==='function')?_xirr(cf.filter(function(c){ return !isNaN(c.t); })):null; }catch(e){}
    return {t:t,nm:nm,f0:f0,f1:f1,anios:(f0&&f1)?(ms(f1)-ms(f0))/(365.25*864e5):null,coste:coste,venta:venta,pl:venta-coste,divCob:dv,balance:venta-coste+dv,rentTot:coste>0?(venta-coste+dv)/coste:null,xirr:x}; }
  function cerradas(){ var L=[], arch={};
    (DB.cerradas||[]).forEach(function(c){ var t=String(c.ticker||'').toUpperCase(); arch[t]=1; var nm=((DB.valores||{})[t]||{}).nombre||c.nombre||t;
      if(c.ops&&c.ops.length) L.push(ciclo(t,nm,c.ops,c.divs||[]));
      else if(typeof cerradaCalc==='function'){ var k=cerradaCalc(c); L.push({t:t,nm:nm,f0:k.fechaCompra,f1:k.fechaVenta,anios:(k.fechaCompra&&k.fechaVenta)?(ms(k.fechaVenta)-ms(k.fechaCompra))/(365.25*864e5):null,coste:k.coste,venta:k.venta,pl:k.venta-k.coste,divCob:k.dividendos,balance:k.venta-k.coste+k.dividendos,rentTot:k.coste>0?(k.venta-k.coste+k.dividendos)/k.coste:null,xirr:null}); } });
    var open={}; try{ invPositions().forEach(function(p){ if(p.acciones>0.0001) open[String(p.ticker||'').toUpperCase()]=1; }); }catch(e){}
    var G={}; (DB.operaciones||[]).forEach(function(o){ var t=String(o.ticker||'').toUpperCase(); if(t) (G[t]=G[t]||[]).push(o); });
    Object.keys(G).forEach(function(t){ if(open[t]||arch[t]) return; var b=0,v=0; G[t].forEach(function(o){ if(o.tipo==='venta') v+=N(o.acciones); else b+=N(o.acciones); });
      if(!(v>0.0001&&Math.abs(b-v)<0.0001)) return; L.push(ciclo(t,((DB.valores||{})[t]||{}).nombre||t,G[t],(DB.dividendos||{})[t]||[])); });
    return L; }
  window.nRentaCerradas=cerradas;
  function fdc(f){ return f?String(f).slice(8,10)+'/'+String(f).slice(5,7)+'/'+String(f).slice(2,4):'—'; }
  var CCOLS=[['t','Empresa','l'],['f0','Compra'],['f1','Venta'],['anios','Años'],['coste','Invertido','g'],['venta','Vendido por'],['pl','Plusvalía'],['divCob','Dividendos'],['balance','Ganado'],['rentTot','Rent. total','g'],['xirr','TIR']];
  window._nCerOrd=window._nCerOrd||{k:'f1',d:-1};
  function tablaCerradas(L){ if(!L.length) return '';
    var S=window._nCerOrd, R=L.slice().sort(function(a,b){ var va=a[S.k],vb=b[S.k]; if(va==null) return 1; if(vb==null) return -1; return S.d*(va<vb?-1:va>vb?1:0); });
    var mx=0; L.forEach(function(c){ mx=Math.max(mx,Math.abs(c.pl)+c.divCob); });
    var tc=0,tv=0,td=0; L.forEach(function(c){ tc+=c.coste; tv+=c.venta; td+=c.divCob; }); var tb=tv-tc+td;
    var h='<div class="n-rt-cerh">🔒 Posiciones cerradas <span>'+L.length+' · lo que ganaste o perdiste con lo que ya vendiste, dividendos incluidos</span></div>';
    h+='<div class="n-rt-desk"><table class="n-rt"><thead><tr>'+CCOLS.map(function(c){ return '<th data-nrtc="'+c[0]+'" class="'+(c[2]==='l'?'l ':'')+(c[2]==='g'?'grp ':'')+(S.k===c[0]?'on':'')+'">'+c[1]+(S.k===c[0]?(S.d<0?' ▼':' ▲'):'')+'</th>'; }).join('')+'</tr></thead><tbody>';
    h+='<tr class="tot"><td class="l">TOTAL CERRADAS</td><td></td><td></td><td></td><td class="grp">'+eur(tc)+'</td><td>'+eur(tv)+'</td><td class="'+cl(tv-tc)+'">'+eur(tv-tc,1)+'</td><td class="n-rt-pos">'+eur(td,1)+'</td><td class="'+cl(tb)+'">'+eur(tb,1)+'</td><td class="grp">'+pill(tc>0?tb/tc:null)+'</td><td>—</td></tr>'+
       '<tr class="tot br"><td colspan="11">'+barra({pl:tv-tc,divCob:td,derechos:0},Math.abs(tv-tc)+td)+'</td></tr>';
    R.forEach(function(c){ h+='<tr><td class="l"><b class="renta-tk" data-ficha="'+E(c.t)+'">'+E(c.t)+'</b><span class="nm">'+E(nombre(c.t)===c.t?String(c.nm).slice(0,26):nombre(c.t))+'</span></td><td>'+fdc(c.f0)+'</td><td>'+fdc(c.f1)+'</td><td>'+(c.anios!=null?c.anios.toLocaleString('es-ES',{maximumFractionDigits:1}):'—')+'</td>'+
      '<td class="grp">'+eur(c.coste)+'</td><td>'+eur(c.venta)+'</td><td class="'+cl(c.pl)+'">'+eur(c.pl,1)+'<span class="two">'+pc(c.coste>0?c.pl/c.coste:null,1)+'</span></td><td class="'+(c.divCob?'n-rt-pos':'')+'">'+(c.divCob?eur(c.divCob,1):'·')+'</td><td class="b '+cl(c.balance)+'">'+eur(c.balance,1)+'</td><td class="grp">'+pill(c.rentTot)+'</td><td>'+pill(c.xirr)+'</td></tr>'+
      '<tr class="br"><td colspan="11">'+barra({pl:c.pl,divCob:c.divCob,derechos:0},mx)+'</td></tr>'; });
    h+='</tbody></table></div><div class="n-rt-mob">';
    R.forEach(function(c){ h+='<div class="n-rt-mc"><div class="h"><div><b class="renta-tk" data-ficha="'+E(c.t)+'">'+E(c.t)+'</b><span class="nm">'+E(String(c.nm).slice(0,26))+'</span></div><div class="b '+cl(c.balance)+'">'+eur(c.balance,1)+'</div></div><div class="g">'+
      '<div>Compra<b>'+fdc(c.f0)+'</b></div><div>Venta<b>'+fdc(c.f1)+'</b></div><div>Invertido<b>'+eur(c.coste)+'</b></div><div>Plusvalía<b class="'+cl(c.pl)+'">'+eur(c.pl,1)+'</b></div><div>Dividendos<b>'+eur(c.divCob,1)+'</b></div><div>TIR<b>'+pc(c.xirr,1)+'</b></div></div>'+barra({pl:c.pl,divCob:c.divCob,derechos:0},mx)+'</div>'; });
    return h+'</div>'; }
  function historia(R,CR,L){ var T=_rentaTotales(R.rows), cb=0,cd=0,cc=0; L.forEach(function(c){ cb+=c.balance; cd+=c.divCob; cc+=c.coste; });
    var gan=T.balance+cb, dv=T.divCob+cd;
    return '<div class="n-rt-hist"><div class="hh">📚 Toda tu historia <span>· las '+T.n+' abiertas + las '+L.length+' cerradas</span></div><div class="hg">'+
      '<div class="hk"><div class="l">Ganado en total</div><div class="v '+cl(gan)+'">'+eur(gan,1)+'</div><div class="p">abiertas '+eur(T.balance,1)+' · cerradas '+eur(cb,1)+'</div></div>'+
      '<div class="hk"><div class="l">Dividendos cobrados en total</div><div class="v n-rt-pos">'+eur(dv,1)+'</div><div class="p">abiertas '+eur(T.divCob,1)+' · cerradas '+eur(cd,1)+'</div></div>'+
      '<div class="hk"><div class="l">Resultado de lo ya vendido</div><div class="v '+cl(cb)+'">'+eur(cb,1)+'</div><div class="p">'+L.length+' cerradas · sobre '+eur(cc)+' invertidos'+(cc>0?' ('+pc(cb/cc,1)+')':'')+'</div></div>'+
      '<div class="hk"><div class="l">TIR de toda la cartera</div><div class="v">'+pc(CR?CR.xirr:null,1)+'</div><div class="p">incluye las cerradas</div></div></div></div>'; }
  var o=renderRentabEmpresas;
  renderRentabEmpresas=function(){ var r=o.apply(this,arguments);
    try{ var R=rentabilidadEmpresas(renderRentabEmpresas); if(!R||!R.ok||!R.rows||!R.rows.length) return r;
      var box=document.querySelector('#rentaBody [data-nrblk="empresa"] [data-nv="tabla"]'); if(!box) return r;
      var CR=(typeof carteraRentabilidad==='function')?carteraRentabilidad(renderRentabEmpresas):null;
      var L=[]; try{ L=cerradas(); }catch(e){ console.warn('[n-rt] cerradas',e); }
      box.innerHTML=historia(R,CR,L)+tabla(R,CR)+tablaCerradas(L);
      var sel=document.getElementById('rentaOrden'); if(sel){ var k=window._rentaOrd||'rentTot'; if([].some.call(sel.options,function(op){ return op.value===k; })) sel.value=k; }
    }catch(e){ console.error('[n-rt]',e); }
    return r; };
  /* clic en el título de una columna */
  document.addEventListener('click',function(e){ var th=e.target.closest&&e.target.closest('th[data-nrto]'); if(!th) return;
    var k=th.getAttribute('data-nrto'), cur=window._rentaOrd||'rentTot';
    window._nRentaDir=(cur===k)?-dir(k):(k==='t'?1:-1); window._rentaOrd=k; renderRentabEmpresas(); });
  document.addEventListener('click',function(e){ var th=e.target.closest&&e.target.closest('th[data-nrtc]'); if(!th) return;
    var k=th.getAttribute('data-nrtc'), S=window._nCerOrd; window._nCerOrd={k:k,d:S.k===k?-S.d:(k==='t'?1:-1)}; renderRentabEmpresas(); });
  /* el desplegable de siempre: al elegir, de mayor a menor (nombre: A→Z) */
  if(typeof rentaSetOrden==='function'){ var oS=rentaSetOrden; rentaSetOrden=function(k){ window._nRentaDir=null; return oS.apply(this,arguments); }; }

  var st=document.createElement('style'); st.textContent=
    '.n-rt-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:2px 0 8px}'+
    '.n-rt-leg{font-size:11.5px;color:#64748B;display:flex;gap:12px;flex-wrap:wrap}.n-rt-leg b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}.n-rt-leg .mu{color:#94A3B8}'+
    'table.n-rt{width:100%;border-collapse:collapse}'+
    'table.n-rt th{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#64748B;font-weight:700;text-align:right;padding:8px 6px;border-bottom:1px solid #E2E8F0;white-space:nowrap;cursor:pointer;user-select:none}'+
    'table.n-rt th:hover{color:#1E293B}table.n-rt th.on{color:#1F4A9A}table.n-rt th.l,table.n-rt td.l{text-align:left}'+
    'table.n-rt td{padding:8px 6px 3px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-size:13.5px}'+
    'table.n-rt tr.br td{padding:0 6px 9px;border-bottom:1px solid #F1F5F9}table.n-rt tr.tot td{background:#F1F5F9;font-weight:700}'+
    'table.n-rt .grp{border-left:2px solid #E2E8F0}table.n-rt .b{font-weight:700}table.n-rt .two{font-size:11px;color:#64748B;display:block;margin-top:1px;font-weight:400}'+
    '.n-rt-desk .renta-tk,.n-rt-mob .renta-tk{color:#1F4A9A;font-weight:800;cursor:pointer}.n-rt-desk .nm,.n-rt-mob .nm{color:#475569;font-size:11.5px;font-weight:600;margin-left:5px}'+
    '.n-rt-pos{color:#15803D}.n-rt-neg{color:#DC2626}'+
    '.n-rt-pill{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11.5px;font-weight:700}.n-rt-pill.g{background:#DCFCE7;color:#166534}.n-rt-pill.r{background:#FEE2E2;color:#991B1B}.n-rt-pill.c{background:#E0E7FF;color:#3730A3;font-size:10.5px;margin-left:4px}'+
    '.n-rt-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:#F1F5F9;flex:1}.n-rt-bar i{display:block;height:100%}'+
    '.n-rt-bw{display:flex;align-items:center;gap:10px}.n-rt-bw span{font-size:11px;color:#64748B;white-space:nowrap;font-weight:400}'+
    '.n-rt-hist{border:1px solid #E2E8F0;border-radius:12px;padding:10px 12px;margin:2px 0 12px}.n-rt-hist .hh{font-weight:800;margin-bottom:8px}.n-rt-hist .hh span{font-weight:500;color:#64748B;font-size:12px}'+
    '.n-rt-hist .hg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.n-rt-hist .hk{background:#F8FAFC;border-radius:10px;padding:8px 10px}.n-rt-hist .l{font-size:11.5px;color:#64748B;font-weight:600}.n-rt-hist .v{font-size:19px;font-weight:800;margin:3px 0}.n-rt-hist .p{font-size:11px;color:#64748B}'+
    '@media(max-width:900px){.n-rt-hist .hg{grid-template-columns:1fr 1fr}}.n-rt-cerh{margin:20px 0 6px;font-size:13.5px;font-weight:800;color:#334155}.n-rt-cerh span{font-weight:500;color:#64748B;font-size:12px}'+
    '.n-rt-nota{font-size:11.5px;color:#64748B;margin-top:8px}.n-rt-mob{display:none}'+
    '@media(max-width:900px){.n-rt-desk{display:none}.n-rt-mob{display:block}}'+
    '.n-rt-mc{border:1px solid #E2E8F0;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#fff}.n-rt-mc.tot{background:#F1F5F9}.n-rt-mc .h{display:flex;justify-content:space-between;align-items:baseline}.n-rt-mc .b{font-weight:700}'+
    '.n-rt-mc .g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:8px 0}.n-rt-mc .g div{font-size:11px;color:#64748B}.n-rt-mc .g b{display:block;font-size:13px;color:#1E293B}.n-rt-mc .g b.n-rt-pos{color:#15803D}.n-rt-mc .g b.n-rt-neg{color:#DC2626}';
  document.head.appendChild(st);
})();
