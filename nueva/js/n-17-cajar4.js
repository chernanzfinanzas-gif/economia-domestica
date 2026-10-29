/* APP NUEVA · Cuenta del bróker R4, cálculo nuevo EN PRUEBA (29-oct-2026, Carlos: «vamos a montarlo y lo probamos sobre la marcha»).
   Caja = efectivo de R4 + valor del Foncuenta (decidido el 28-oct 19:36). Partida: 28-oct-2026, 92,97 € + 1.698,71 €.
   - El fondo se valora con participaciones × valor liquidativo; el valor liquidativo sale del extracto del fondo (seis
     decimales) y, después del último extracto, se estima con el ritmo del último mes y medio (medido el 29-oct con el
     extracto dic-2024/sep-2026: error máximo 0,04 % a una semana, 0,21 % a un mes). Nada de internet.
   - Al pegar el extracto en Fondo R4, lo estimado se sustituye por lo real y cada apunte se coteja con su suscripción o
     reembolso (R4 mete en el fondo todo lo que entra y saca lo que hace falta para pagar).
   - Solo lectura: no crea apuntes; deduce las transferencias fijas por su regla hasta que la app pueda guardar (fase 3). */
(function(){
  if(typeof renderCaja!=='function') return;
  var P={fecha:'2026-10-28',efectivo:92.97,fondo:1698.71};
  var NO_R4={REP:'Repsol',SAN:'Santander'};          /* Carlos 29-oct: Repsol (ING) y Santander cobran y compran fuera de R4; Endesa, en R4 */
  var FIJAS=[{imp:400,txt:'Transferencia desde Santander'},{imp:700,txt:'Transferencia automática desde ING'}], DIA=3;
  var RET=0.19, COMDIV=0.00075*1.21;   /* medido en el extracto de R4 de 2026 (29-oct): retención 19 % (también el scrip de Iberdrola en efectivo) y comisión de cobro 0,075 % del bruto + 21 % de IVA */
  function iso(d){ return d.toISOString().slice(0,10); }
  function D(s){ return new Date(s+'T12:00:00'); }
  function dias(a,b){ return Math.round((D(b)-D(a))/864e5); }
  function E(x){ x=+x||0; try{ return x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'})+' €'; }catch(e){ return fmt(x); } }
  function fd(s){ return s?s.slice(8,10)+'/'+s.slice(5,7):''; }
  function hab(d){ var w=d.getDay(); if(w===6) d.setDate(d.getDate()+2); else if(w===0) d.setDate(d.getDate()+1); return d; }

  function ext(){ var g=(typeof r4ExtGuardado==='function')?r4ExtGuardado():null; return g?g.movs.slice().sort(function(a,b){ return a.fecha<b.fecha?-1:1; }):[]; }
  function serie(M){ var o={}; M.forEach(function(m){ if(m.vl>0) o[m.fecha]=m.vl; }); return Object.keys(o).sort().map(function(f){ return [f,o[f]]; }); }
  function vlEst(S,f){
    if(!S.length) return null; var n=S.length;
    if(f<=S[n-1][0]){ for(var i=n-1;i>=0;i--){ if(S[i][0]===f) return S[i][1]; if(S[i][0]<f){ var a=S[i],b=S[i+1]; return a[1]*Math.pow(b[1]/a[1],dias(a[0],f)/dias(a[0],b[0])); } } return S[0][1]; }
    var L=S[n-1], base=null; for(var j=n-2;j>=0;j--){ var d=dias(S[j][0],L[0]); if(d>=20&&d<=60){ base=S[j]; break; } if(d>60) break; }
    if(!base) for(var k=n-2;k>=0;k--){ if(dias(S[k][0],L[0])>=7){ base=S[k]; break; } }
    var r=base?Math.pow(L[1]/base[1],1/dias(base[0],L[0])):1;
    return L[1]*Math.pow(r,dias(L[0],f));
  }
  function accCart(t,f,c){ var s=0; (DB.operaciones||[]).forEach(function(o){ if((o.ticker||'').toUpperCase()!==t||(o.cartera||'Propia')!==c||!(o.fecha<f)) return; s+=(o.tipo==='venta'?-1:1)*num(o.acciones); }); return s; }
  function accPropia(t,f){ return accCart(t,f,'Propia'); }
  function fijas(desde,hasta){ var out=[], d=D(desde); d.setDate(1);
    for(var i=0;i<14;i++){ var f=iso(hab(new Date(d.getFullYear(),d.getMonth(),DIA,12))); if(f>desde&&f<=hasta) FIJAS.forEach(function(x){ out.push({fecha:f,imp:x.imp,txt:x.txt,origen:'regla'}); }); d.setMonth(d.getMonth()+1); if(iso(d)>hasta) break; }
    return out; }
  function flujos(hasta){
    var out=fijas(P.fecha,hasta), pend=[];
    (DB.operaciones||[]).forEach(function(o){ if(!(o.fecha>P.fecha&&o.fecha<=hasta)||(o.cartera||'Propia')!=='Propia'||NO_R4[(o.ticker||'').toUpperCase()]) return; var b=num(o.acciones)*num(o.precio), c=num(o.comision);
      out.push(o.tipo==='venta'?{fecha:o.fecha,imp:b-c,txt:'Venta '+num(o.acciones)+' '+o.ticker,origen:'operación'}:{fecha:o.fecha,imp:-(b+c),txt:'Compra '+num(o.acciones)+' '+o.ticker,origen:'operación'}); });
    (DB.movimientos||[]).forEach(function(m){ if(!(m.fecha>P.fecha&&m.fecha<=hasta)||m.tipo!=='gasto') return; var t=((m.comercio||'')+' '+(m.concepto||'')+' '+(m.detalle||'')); if(/custodia/i.test(t)&&/\bR4\b|renta ?4/i.test(t)) out.push({fecha:m.fecha,imp:-num(m.importe),txt:'Custodia R4',origen:'Movimientos'}); });
    Object.keys(DB.dividendos||{}).forEach(function(t){ (DB.dividendos[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(!(f>P.fecha&&f<=hasta)) return; var sh=accPropia(t,f); if(!(sh>0)) return;
      var bruto=sh*num(d.importe), neto=bruto*(1-RET)-bruto*COMDIV, x={fecha:f,imp:neto,txt:'Dividendo '+t+' ('+E(bruto)+' bruto)',origen:'dividendo',tk:t};
      if(NO_R4[t]) pend.push(x); else out.push(x); }); });
    /* Carlos 29-oct: la cartera Compartida cobra en su bróker (Endesa, Santander…) y lo traspasa a R4 con transferencias puntuales */
    Object.keys(DB.dividendos||{}).forEach(function(t){ (DB.dividendos[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(!(f>P.fecha&&f<=hasta)) return; var sh=accCart(t,f,'Compartida'); if(!(sh>0)) return;
      var bruto=sh*num(d.importe); pend.push({fecha:f,imp:bruto*(1-RET),txt:'Dividendo '+t+' (Compartida)',origen:'dividendo',tk:t+' (Comp.)'}); }); });
    out.sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
    return {out:out,pend:pend};
  }
  function previsto(hoy,fin){
    var L=fijas(hoy,fin).map(function(x){ return {fecha:x.fecha,imp:x.imp,txt:x.txt}; });
    var y=+hoy.slice(0,4);
    Object.keys(DB.dividendos||{}).concat((DB.operaciones||[]).map(function(o){ return (o.ticker||'').toUpperCase(); })).filter(function(t,i,a){ return t&&a.indexOf(t)===i&&!NO_R4[t]; }).forEach(function(t){
      [y,y+1].forEach(function(yy){ var ev=[]; try{ ev=_calPendNoReg(t,yy)||[]; }catch(e){} ev.forEach(function(e){ if(!(e.fecha>hoy&&e.fecha<=fin)) return; var sh=accPropia(t,e.fecha); if(!(sh>0)) return; var b=sh*num(e.imp); L.push({fecha:e.fecha,imp:b*(1-RET)-b*COMDIV,txt:'Dividendo '+t+' (previsto)'}); }); }); });
    var cu=(DB.movimientos||[]).filter(function(m){ var t=((m.comercio||'')+' '+(m.concepto||'')+' '+(m.detalle||'')); return m.tipo==='gasto'&&/custodia/i.test(t)&&/\bR4\b|renta ?4/i.test(t); }).sort(function(a,b){ return a.fecha<b.fecha?-1:1; }).pop();
    if(cu){ var nx=D(cu.fecha); nx.setMonth(nx.getMonth()+3); var f=iso(nx); if(f>hoy&&f<=fin) L.push({fecha:f,imp:-num(cu.importe),txt:'Custodia R4 (prevista, como la última)'}); }
    return L.sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
  }
  function calcular(){
    var hoy=iso(new Date()), M=ext(), S=serie(M), lastE=M.length?M[M.length-1].fecha:null;
    var F=flujos(hoy), fl=F.out;
    /* participaciones a una fecha: parte de la última VALORACION del extracto (la cifra oficial de R4) y suma y resta lo que va después */
    var cumAt=function(f){ var p=0, ancla=''; M.forEach(function(m){ if(m.tipo==='valoracion'&&m.fecha<=f&&m.fecha>=ancla){ ancla=m.fecha; p=m.part; } });
      M.forEach(function(m){ if(m.fecha>f||m.fecha<=ancla) return; if(m.tipo==='suscripcion') p+=m.part; else if(m.tipo==='reembolso') p-=m.part; }); return p; };
    var part0, origen0;
    if(lastE&&lastE>=P.fecha){ part0=cumAt(P.fecha); origen0='extracto'; } else { var v0=vlEst(S,P.fecha); part0=v0?P.fondo/v0:0; origen0='estimado'; }
    var corte=(lastE&&lastE>P.fecha)?lastE:P.fecha, ef=P.efectivo, part=part0, netoFondo=0;
    M.forEach(function(m){ if(!(m.fecha>P.fecha&&m.fecha<=corte)) return; if(m.tipo==='suscripcion'){ ef-=m.bruto; part+=m.part; netoFondo+=m.bruto; } else if(m.tipo==='reembolso'){ ef+=m.efectivo; part-=m.part; netoFondo-=m.bruto; } });
    fl.forEach(function(x){ if(x.fecha<=corte) ef+=x.imp; else { var v=vlEst(S,x.fecha); if(v){ part+=x.imp/v; netoFondo+=x.imp; } } });
    var vl=vlEst(S,hoy), fondo=vl?part*vl:null, interes=fondo!=null?fondo-P.fondo-netoFondo:null;
    if(!S.length){ fondo=P.fondo+fl.reduce(function(s,x){ return s+x.imp; },0); interes=null; }   /* sin extracto: sin intereses, el resto igual */
    /* cotejo: cada apunte de la caja con su suscripción (entra) o reembolso (sale) del fondo, ±4 días */
    var usados={}, impM=function(m){ return m.tipo==='suscripcion'?m.bruto:(m.tipo==='reembolso'?-m.efectivo:null); };
    var casa=function(imp,f){ var hit=null; M.forEach(function(m,i){ if(hit!=null||usados[i]) return; if(Math.abs(dias(m.fecha,f))>4) return; var v=impM(m); if(v==null) return;
        if(Math.sign(v)===Math.sign(imp)&&Math.abs(Math.abs(v)-Math.abs(imp))<=Math.max(1,Math.abs(imp)*0.01)) hit=i; }); return hit; };
    var filas=fl.map(function(x){ return {x:x,st:x.fecha>corte?['pendiente del próximo extracto','#64748B']:null}; });
    filas.forEach(function(r){ if(r.st) return; var h=casa(r.x.imp,r.x.fecha); if(h!=null){ usados[h]=1; r.st=['✓ en el extracto del fondo','#15803D']; } });
    /* R4 mete juntas en el fondo las entradas del mismo día (p. ej. 400 € + 700 € el día 3 → una suscripción de 1.100 €) */
    var grupos={}; filas.forEach(function(r){ if(r.st) return; var k=r.x.fecha+(r.x.imp>0?'+':'-'); (grupos[k]=grupos[k]||[]).push(r); });
    Object.keys(grupos).forEach(function(k){ var g=grupos[k]; if(g.length<2) return; var t=g.reduce(function(s,r){ return s+r.x.imp; },0), h=casa(t,g[0].x.fecha);
      if(h!=null){ usados[h]=1; g.forEach(function(r){ r.st=['✓ en el extracto del fondo (junto con los del mismo día)','#15803D']; }); } });
    filas.forEach(function(r){ if(!r.st) r.st=['⚠ no aparece en el extracto del fondo','#B45309']; });
    var sueltos=M.map(function(m,i){ return {m:m,i:i}; }).filter(function(o){ return o.m.fecha>P.fecha&&o.m.fecha<=corte&&!usados[o.i]&&o.m.tipo!=='valoracion'; });
    var pend=F.pend.reduce(function(s,x){ return s+x.imp; },0);
    var hoyV=fondo!=null?ef+fondo:null, prev=previsto(hoy,iso(new Date(Date.now()+30*864e5)));
    var C={hoy:hoy,M:M,S:S,lastE:lastE,ef:ef,fondo:fondo,part:part,vl:vl,total:hoyV,interes:interes,filas:filas,sueltos:sueltos,pend:F.pend,pendT:pend,prev:prev,origen0:origen0,part0:part0};
    var X=(typeof nR4Xls==='function')?nR4Xls():null;
    if(X&&X.fecha>=P.fecha&&X.fondo&&X.fondo.part>0) conExtracto(C,X,fl,hoy);
    return C;
  }
  /* Con el extracto de patrimonio de R4: efectivo y fondo exactos a su fecha; cada apunte de la caja contra su línea de R4 */
  function conExtracto(C,X,fl,hoy){
    var vlX=X.fondo.valor/X.fondo.part, S=C.S.filter(function(x){ return x[0]<X.fecha; }).concat([[X.fecha,vlX]]);
    var neto=0; (X.cash||[]).forEach(function(l){ if(!(l.fecha>P.fecha)) return; var c=l.concepto.toUpperCase(); if(/^COMPRA DE RENTA 4 FONCUENTA/.test(c)) neto-=l.imp; else if(/^VENTA DE RENTA 4 FONCUENTA/.test(c)) neto-=l.imp; });
    var ef=(X.anotado||0)+(X.pendiente||0), part=X.fondo.part, despues=0;
    fl.forEach(function(x){ if(x.fecha>X.fecha){ var v=vlEst(S,x.fecha); if(v){ part+=x.imp/v; despues+=x.imp; } } });
    var vl=vlEst(S,hoy), fondo=part*vl;
    C.S=S; C.ef=ef; C.fondo=fondo; C.total=ef+fondo; C.vl=vl; C.interes=fondo-P.fondo-neto-despues; C.X=X; C.lastE=X.fecha; C.fuente='R4';
    var H=nR4Hechos(X,P.fecha), usado={};
    var TIPO={regla:'fija','Movimientos':'custodia',dividendo:'div'};
    C.filas=fl.map(function(x){
      if(x.fecha>X.fecha) return {x:x,st:['pendiente del próximo extracto','#64748B']};
      var t=x.origen==='operación'?(x.imp<0?'compra':'venta'):TIPO[x.origen], hit=null;
      H.forEach(function(h,i){ if(hit!=null||usado[i]||h.tipo!==t) return; if(Math.abs(dias(h.fecha,x.fecha))>4) return; if(Math.abs(h.imp-x.imp)<=Math.max(0.1,Math.abs(x.imp)*(t==='div'?0.02:0.005))) hit=i; });
      if(hit!=null){ usado[hit]=1; var df=H[hit].imp-x.imp; return {x:x,st:['✓ en R4 '+fd(H[hit].fecha)+(Math.abs(df)>=0.01?' ('+(df>0?'+':'')+E(df)+')':''),'#15803D']}; }
      return {x:x,st:['⚠ no está en el extracto de R4','#B45309']};
    });
    C.sueltos=[]; C.sueltosR4=H.map(function(h,i){ return {h:h,i:i}; }).filter(function(o){ return !usado[o.i]; }).map(function(o){ return o.h; });
    if(X.pendiente) C.sueltosR4.push({fecha:X.fecha,tipo:'pendiente',imp:X.pendiente,txt:'Pendiente de anotar en R4 (p. ej. venta de derechos)'});
    /* acciones: lo que dice R4 frente a la cartera Propia de la app */
    var nom=function(s){ return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').trim().split(/\s+/)[0]; };
    var app={}; (DB.operaciones||[]).forEach(function(o){ if((o.cartera||'Propia')!=='Propia') return; var t=(o.ticker||'').toUpperCase(); app[t]=(app[t]||0)+(o.tipo==='venta'?-1:1)*num(o.acciones); });
    var visto={}; C.acc=(X.acciones||[]).map(function(a){
      if(/\.D /.test(a.nombre)) return {nombre:a.nombre,r4:a.titulos,app:null,st:['derechos','#64748B']};
      var tk=Object.keys(app).concat(Object.keys(DB.valores||{})).filter(function(t){ var n=((DB.valores||{})[t]||{}).nombre||''; return nom(n)===nom(a.nombre)||t===nom(a.nombre); })[0];
      if(tk) visto[tk]=1; var q=tk?(app[tk]||0):null;
      return {nombre:a.nombre,tk:tk,r4:a.titulos,app:q,st:q==null?['no la encuentro en la app','#B45309']:(Math.abs(q-a.titulos)<1e-6?['✓ igual','#15803D']:['✗ la app dice '+q,'#B91C1C'])};
    });
    Object.keys(app).forEach(function(t){ if(app[t]>0.0001&&!visto[t]&&!NO_R4[t]) C.acc.push({nombre:(((DB.valores||{})[t]||{}).nombre)||t,tk:t,r4:0,app:app[t],st:['en la app pero no en R4 (¿otro bróker?)','#B45309']}); });
  }
  function pintar(){
    var sec=document.getElementById('view-caja'); if(!sec) return; var C=calcular();
    var k=document.getElementById('cajaKpis'); if(!k) return;
    var pe=C.prev.reduce(function(s,x){ return s+x.imp; },0), pin=C.prev.filter(function(x){ return x.imp>0; }).reduce(function(s,x){ return s+x.imp; },0), pout=pe-pin;
    var anual=null; if(C.S.length>1){ var a=C.S[0], b=C.S[C.S.length-1]; var lo=C.S.filter(function(x){ return dias(x[0],b[0])<=60; })[0]||a; if(lo[0]!==b[0]) anual=(Math.pow(b[1]/lo[1],365/dias(lo[0],b[0]))-1)*100; }
    k.innerHTML='<div class="n-ctrl">'+
      nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'💶',t:'Disponible hoy',v:C.total!=null?E(C.total):'—',s:'efectivo <b>'+E(C.ef)+'</b> + Foncuenta <b>'+(C.fondo!=null?E(C.fondo):'—')+'</b>',p:C.fuente==='R4'?('exacto a '+fd(C.lastE)+' según el extracto de R4'+(C.lastE<C.hoy?'; desde entonces, estimado':'')):(C.lastE?('fondo estimado desde el extracto del '+fd(C.lastE)):'sin extracto del fondo')})+
      nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'🌱',t:'Intereses del fondo',v:C.interes!=null?((C.interes>=0?'+':'')+E(C.interes)):'—',vCls:'n-pos',s:'desde el 28/10'+(anual!=null?' · al '+anual.toFixed(2).replace('.',',')+' % anual':'')})+
      nKpi({c:'#D97706',bg:'#FEF3C7',ic:'⏳',t:'Pendiente de traspasar',v:E(C.pendT),s:C.pend.length?C.pend.map(function(x){ return x.tk+' '+E(x.imp); }).join(' · '):'dividendos cobrados fuera de R4 (Repsol, Santander y la Compartida) desde el 28/10'})+
      nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'📅',t:'Próximos 30 días',v:(pe>=0?'+':'')+E(pe),vCls:pe>=0?'n-pos':'n-neg',s:'entra <b>'+E(pin)+'</b> · sale <b>'+E(-pout)+'</b>'})+'</div>';
    var b=document.getElementById('nCajaR4'); if(!b){ b=document.createElement('div'); b.id='nCajaR4'; b.className='pos-blk n-blk open'; k.insertAdjacentElement('afterend',b); }
    var row=function(f,txt,imp,st,col,org){ return '<tr><td>'+fd(f)+'</td><td>'+txt+(org?' <span class="n-org">'+org+'</span>':'')+'</td><td class="num '+(imp>=0?'n-pos':'n-neg')+'">'+(imp>=0?'+':'')+E(imp)+'</td><td style="color:'+col+'">'+st+'</td></tr>'; };
    var X=C.X||((typeof nR4Xls==='function')?nR4Xls():null);
    var up='<div class="n-r4up"><button class="btn sm" data-nr4up="1">📥 Subir extracto de R4</button><span id="nR4XMsg">'+(X?'Último: extracto de patrimonio al <b>'+fd(X.fecha)+'</b>'+(X.fichero?' ('+X.fichero+')':''):'Descárgalo en el área de clientes de Renta 4: «Extracto de patrimonio» en Excel, desde el 1 de enero.')+'</span></div>';
    var h=up+'<div class="n-r4note"><b>En prueba.</b> Partida 28/10: efectivo 92,97 € + Foncuenta 1.698,71 € = 1.791,68 €. Supuestos (dime si alguno no es así): las compras de la cartera <b>Propia</b> salen de R4 salvo <b>Repsol</b> (ING) y <b>Santander</b>, que tampoco cobran sus dividendos en R4; los dividendos de la cartera <b>Compartida</b> se cobran en su bróker y quedan como pendientes de traspasar; las transferencias fijas (400 € de Santander y 700 € de ING) se prevén el <b>día 3</b> y se cotejan hasta dos días hábiles después; retención del 19 % y comisión de cobro del 0,09 % + IVA.</div>'+
      '<table class="n-r4t"><thead><tr><th>Fecha</th><th>Apunte</th><th class="num">Importe</th><th>Cotejo</th></tr></thead><tbody>'+
      row(P.fecha,'Saldo de partida',P.efectivo+P.fondo,'efectivo + Foncuenta','#475569','')+
      C.filas.map(function(r){ return [r.x.fecha,row(r.x.fecha,r.x.txt,r.x.imp,r.st[0],r.st[1],r.x.origen==='regla'?'por regla':'')]; })
       .concat(C.sueltos.map(function(o){ var m=o.m, imp=m.tipo==='suscripcion'?m.bruto:-m.efectivo; return [m.fecha,row(m.fecha,(m.tipo==='suscripcion'?'Entra en el fondo':'Sale del fondo')+' sin apunte en la app',imp,'falta el apunte (¿transferencia puntual?)','#B91C1C','')]; }))
       .sort(function(a,b){ return a[0]<b[0]?-1:(a[0]>b[0]?1:0); }).map(function(x){ return x[1]; }).join('')+
      ((C.sueltosR4||[]).map(function(h){ return row(h.fecha,h.txt+(h.tipo==='puntual'?' (¿transferencia puntual?)':''),h.imp,h.tipo==='retfondo'?'en R4 · coste fiscal, se recupera':(h.tipo==='pendiente'?'en R4 · pendiente de anotar':'en R4, falta en la app'),h.tipo==='retfondo'||h.tipo==='pendiente'?'#64748B':'#B91C1C',''); }).join(''))+
      (C.interes!=null?row(C.hoy,'Intereses del fondo hasta hoy'+(C.lastE&&C.lastE<C.hoy?' (estimado desde el '+fd(C.lastE)+')':''),C.interes,'','#475569',''):'')+
      '</tbody></table>'+
      (C.acc&&C.acc.length?'<div class="n-r4sub">Tus acciones en R4 frente a la app (cartera Propia)</div><table class="n-r4t"><thead><tr><th>Empresa</th><th class="num">R4</th><th class="num">App</th><th>Cotejo</th></tr></thead><tbody>'+C.acc.map(function(a){ return '<tr><td>'+a.nombre+(a.tk?' <span class="n-org">'+a.tk+'</span>':'')+'</td><td class="num">'+a.r4+'</td><td class="num">'+(a.app==null?'—':a.app)+'</td><td style="color:'+a.st[1]+'">'+a.st[0]+'</td></tr>'; }).join('')+'</tbody></table>':'')+
      (C.prev.length?'<div class="n-r4sub">Próximos 30 días</div><table class="n-r4t"><tbody>'+C.prev.map(function(x){ return row(x.fecha,x.txt,x.imp,'previsto','#64748B',''); }).join('')+'</tbody></table>':'');
    b.innerHTML='<div class="pos-blk-h" data-nr4blk="1"><span class="arw">▶</span><span class="bt">🏦 Cuenta del bróker R4 · cálculo nuevo</span><span class="bsum">'+(C.filas.length+C.sueltos.length)+' apuntes desde el 28/10 · '+(C.fuente==='R4'?'extracto de R4 al '+fd(C.lastE):(C.lastE?'extracto del fondo al '+fd(C.lastE):'sin extracto'))+'</span></div><div class="pos-blk-b"><div class="blk-pad">'+h+'</div></div>';
    /* la tabla de siempre (aportaciones estimadas) queda debajo, plegada, como referencia mientras dura la prueba */
    var old=document.querySelector('#nCajaBlk .bt'); if(old) old.textContent='📒 Previsión de siempre (aportaciones estimadas)';
  }
  var o=renderCaja;
  renderCaja=function(){ o.apply(this,arguments); try{ pintar(); }catch(e){ console.error('n-cajar4',e); } };
  document.addEventListener('click',function(e){ var u=e.target.closest&&e.target.closest('[data-nr4up]'); if(u){ e.preventDefault(); if(typeof nR4XlsSubir==='function') nR4XlsSubir(); return; } var h=e.target.closest&&e.target.closest('[data-nr4blk]'); if(h) h.parentElement.classList.toggle('open'); });
  window._nCajaOpen=false;
})();
