/* APP NUEVA · Plan → FISCALIDAD por titular (3-nov-2026, Carlos 20:47: «aplica fiscalidad»; propuesta de las 20:45 con lo
   aprobado el 28 y 29-oct: barra por titular hasta el mínimo personal, retenciones a recuperar, gastos deducibles y resumen
   fiscal por año).
   · Hacienda os ve a cada uno por separado: Propia = Carlos y Susana a medias; Compartida = Susana y su hermana a medias
     (la hermana no sale); Foncuenta (cuenta de R4 de la Propia) a medias. Los porcentajes se cambian en «Ajustes».
   · FIFO POR CARTERA (cada titular tiene su cola): la pestaña de antes mezclaba las dos carteras de un mismo valor.
   · Base del ahorro del año = dividendos brutos − gastos deducibles (custodias) + intereses + ganancias de ventas de
     acciones + ganancia del Foncuenta (reembolsos). Saldos negativos: compensación del 25 % entre rendimientos y ganancias.
   · Mínimo personal: 5.550 € + discapacidad (33 %: 3.000 · 65 % o más: 12.000 con asistencia). Lo que no consume la base
     general reduce la cuota del ahorro (por eso a Carlos le devuelven la retención). Susana: su nómina ya lo consume.
   · Escala del ahorro desde 2025: 19 % hasta 6.000 · 21 % hasta 50.000 · 23 % hasta 200.000 · 27 % hasta 300.000 · 30 %.
     (La pestaña de antes usaba el 28 % para el último tramo: se corrige _impuestoAhorro.)
   · Orientativo: no es la declaración. Debajo se mantienen «Si liquidas hoy», el simulador, los candidatos y lo realizado. */
(function(){
  if(typeof renderFiscalidad!=='function'||window._nFis) return; window._nFis=true;
  var TR=[[6000,0.19],[50000,0.21],[200000,0.23],[300000,0.27],[Infinity,0.30]];
  _impuestoAhorro=function(base){ base=+base||0; if(base<=0) return 0; var t=0,p=0; for(var i=0;i<TR.length;i++){ if(base>p){ t+=(Math.min(base,TR[i][0])-p)*TR[i][1]; p=TR[i][0]; } else break; } return t; };
  var MIN_PERS=5550, MIN_DISC={'0':0,'33':3000,'65':12000};
  function cfg(){ var d=(DB.config=DB.config||{}).fiscal=DB.config.fiscal||{};
    var def={grado:'33',baseGenC:0,susMinAgotado:true,propiaC:50,compS:50,fondoC:50,invAnual:25000};
    Object.keys(def).forEach(function(k){ if(d[k]==null) d[k]=def[k]; }); return d; }
  function n(v,d){ return (+v||0).toLocaleString('es-ES',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d,useGrouping:'always'}); }
  function E(v,d){ return n(v,d)+' €'; }
  function S(v){ return (v>=0?'+':'−')+E(Math.abs(v)); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function num_(x){ return (typeof num==='function')?num(x):(+x||0); }
  function hoyISO(){ var d=new Date(); d=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return d.toISOString().slice(0,10); }

  /* ---------- reparto por titular ---------- */
  function partes(C){ return {Propia:{C:C.propiaC/100,S:1-C.propiaC/100}, Compartida:{C:0,S:C.compS/100}}; }
  function partesCart(cart,P){ return P[cart]||P.Propia; }

  /* ---------- operaciones de todas las carteras (también cerradas) ---------- */
  function todasOps(){
    var L=[]; (DB.operaciones||[]).forEach(function(o){ if(o.fecha&&num_(o.acciones)>0) L.push({t:String(o.ticker||'').toUpperCase(),cart:o.cartera||'Propia',fecha:o.fecha,tipo:o.tipo,acc:num_(o.acciones),pr:num_(o.precio),com:(typeof khComision==='function')?khComision(o):num_(o.comision)}); });
    (DB.cerradas||[]).forEach(function(c){ (c.ops||[]).forEach(function(o){ if(o.fecha&&num_(o.acciones)>0) L.push({t:String(c.ticker||'').toUpperCase(),cart:c.cartera||'Propia',fecha:o.fecha,tipo:o.tipo,acc:num_(o.acciones),pr:num_(o.precio),com:num_(o.comision),cerrada:true}); }); });
    return L.sort(function(a,b){ var c=a.fecha.localeCompare(b.fecha); return c||((a.tipo==='venta'?1:0)-(b.tipo==='venta'?1:0)); }); }
  /* FIFO por (valor, cartera) con comisiones dentro de la base, como la pestaña de siempre */
  function fifo(L){ var Q={}, R=[];
    L.forEach(function(o){ var k=o.t+'|'+o.cart, q=Q[k]=Q[k]||[];
      if(o.tipo==='venta'){ var pv=o.acc>0?o.pr-o.com/o.acc:o.pr, rem=o.acc;
        while(rem>1e-6&&q.length){ var l=q[0], tk=Math.min(rem,l.acc); R.push({t:o.t,cart:o.cart,fechaV:o.fecha,fechaC:l.fecha,acc:tk,pc:l.p,pv:pv,gan:(pv-l.p)*tk}); l.acc-=tk; rem-=tk; if(l.acc<=1e-6) q.shift(); } }
      else q.push({fecha:o.fecha,acc:o.acc,p:o.acc>0?(o.acc*o.pr+o.com)/o.acc:o.pr}); });
    return R; }
  function accionesEn(L,t,cart,f){ var a=0; L.forEach(function(o){ if(o.t===t&&o.cart===cart&&o.fecha<=f) a+=(o.tipo==='venta'?-1:1)*o.acc; }); return Math.max(0,a); }

  /* ---------- dividendos brutos por año y cartera ---------- */
  function dividendos(L){ var H=hoyISO(), out={};   /* out[año][cart] = {cob, prev, porT:{t:bruto}} */
    function add(y,cart,t,v,fut){ var a=out[y]=out[y]||{}, c=a[cart]=a[cart]||{cob:0,prev:0,porT:{}}; c[fut?'prev':'cob']+=v; c.porT[t]=(c.porT[t]||0)+v; }
    var D=DB.dividendos||{}, carts={}; L.forEach(function(o){ (carts[o.t]=carts[o.t]||{})[o.cart]=1; });
    Object.keys(D).forEach(function(t){ var T=t.toUpperCase(); (D[t]||[]).forEach(function(d){ if(!d||!d.fecha) return; var f=String(d.fecha).slice(0,10);
      Object.keys(carts[T]||{}).forEach(function(cart){ var acc=accionesEn(L,T,cart,f); if(acc>0) add(f.slice(0,4),cart,T,acc*num_(d.importe),f>H); }); }); });
    (DB.cerradas||[]).forEach(function(c){ var T=String(c.ticker||'').toUpperCase(); if(D[c.ticker]||D[T]) return;
      (c.divs||[]).forEach(function(d){ var f=String(d.fecha||'').slice(0,10); if(!f) return; var acc=accionesEn(L,T,c.cartera||'Propia',f); if(acc>0) add(f.slice(0,4),c.cartera||'Propia',T,acc*num_(d.importe),f>H); }); });
    /* 3-nov: lo que queda del año sale del calendario (pagos de tu cartera aún no cobrados), repartido por las acciones de cada cartera hoy */
    try{ var Y=H.slice(0,4), ya={}; Object.keys((out[Y]||{})).forEach(function(cart){ if(out[Y][cart].prev>0) ya[cart]=1; });
      if(!Object.keys(ya).length&&typeof calEventosAnio==='function') (calEventosAnio(+Y,false,false)||[]).forEach(function(e){
        if(e.tipo!=='pago'||!(e.fecha>H)||String(e.fecha).slice(0,4)!==Y||!(e.sh>0&&e.imp>0)) return; var T=String(e.t||'').toUpperCase(), tot=0, por={};
        Object.keys(carts[T]||{}).forEach(function(cart){ var a=accionesEn(L,T,cart,H); por[cart]=a; tot+=a; });
        Object.keys(por).forEach(function(cart){ if(tot>0&&por[cart]>0) add(Y,cart,T,e.sh*num_(e.imp)*por[cart]/tot,true); }); }); }catch(err){ console.warn('[fiscalidad] previstos',err); }
    return out; }
  /* ---------- Foncuenta: ganancia y retención de cada reembolso (FIFO del extracto) ---------- */
  function fondo(){ var o={}; try{ var g=(typeof r4ExtGuardado==='function')?r4ExtGuardado():null; if(!g) return o; var c=r4ExtCalc(g.movs);
      (c.ventas||[]).forEach(function(v){ var y=String(v.fecha).slice(0,4), r=o[y]=o[y]||{gan:0,ret:0,n:0}; r.gan+=v.bruta; r.ret+=v.reten; r.n++; }); }catch(e){} return o; }
  /* ---------- movimientos: intereses (ingreso) y custodias (gasto) por titular ---------- */
  function movs(catNom){ var cat={}; (DB.categorias||[]).forEach(function(c){ cat[c.id]=c.nombre; }); var o={};
    (DB.movimientos||[]).forEach(function(m){ if(cat[m.categoriaId]!==catNom||!m.fecha) return; var y=m.fecha.slice(0,4), r=o[y]=o[y]||{C:0,S:0};
      var v=num_(m.importe), t=String(m.titular||'Dos').toLowerCase(); if(/carlos/.test(t)) r.C+=v; else if(/susana|susu/.test(t)) r.S+=v; else { r.C+=v/2; r.S+=v/2; } }); return o; }

  /* ---------- cálculo del año ---------- */
  function calcAnio(y,ctx){ var C=cfg(), P=partes(C), out={C:{},S:{}};
    ['C','S'].forEach(function(w){ var o=out[w];
      var dv=(ctx.DV[y]||{}); o.divCob=0; o.divPrev=0; Object.keys(dv).forEach(function(cart){ var p=partesCart(cart,P)[w]; o.divCob+=dv[cart].cob*p; o.divPrev+=dv[cart].prev*p; });
      o.div=o.divCob+o.divPrev; o.retDiv=o.div*0.19;
      var f=ctx.FO[y]||{gan:0,ret:0}, pf=w==='C'?C.fondoC/100:1-C.fondoC/100; o.fondo=f.gan*pf; o.retFondo=f.ret*pf;
      var it=(ctx.IN[y]||{})[w]||0; o.intNeto=it; o.int=it/0.81; o.retInt=o.int-it;     /* el banco abona el neto: bruto estimado ÷ 0,81 */
      o.gastos=((ctx.CU[y]||{})[w]||0);
      o.ventas=ctx.RE.filter(function(r){ return r.fechaV.slice(0,4)===String(y); }).reduce(function(s,r){ return s+r.gan*partesCart(r.cart,P)[w]; },0);
      var rcm=o.div+o.int-o.gastos, gp=o.ventas+o.fondo;
      if(rcm<0&&gp>0){ var c1=Math.min(-rcm,gp*0.25); rcm+=c1; gp-=c1; } else if(gp<0&&rcm>0){ var c2=Math.min(-gp,rcm*0.25); gp+=c2; rcm-=c2; }
      o.rcm=rcm; o.gp=gp; o.base=Math.max(0,rcm)+Math.max(0,gp);
      var minimo=MIN_PERS+(w==='C'?MIN_DISC[C.grado]||0:0), sobra=w==='C'?Math.max(0,minimo-(+C.baseGenC||0)):(C.susMinAgotado?0:minimo);
      o.minimo=minimo; o.minSobra=sobra;
      o.cuota=Math.max(0,_impuestoAhorro(o.base)-_impuestoAhorro(Math.min(sobra,o.base)));
      o.ret=o.retDiv+o.retFondo+o.retInt; o.resultado=o.cuota-o.ret; });
    return out; }

  function css(){ if(document.getElementById('nFisCss')) return; var s=document.createElement('style'); s.id='nFisCss'; s.textContent=
    '#nFis .fz-k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}@media (max-width:1000px){#nFis .fz-k{grid-template-columns:1fr 1fr}}@media (max-width:560px){#nFis .fz-k{grid-template-columns:1fr}}'+
    '#nFis .fz-c{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.08);padding:12px 14px;border-left:4px solid var(--c,#1F4A9A)}#nFis .fz-c h4{margin:0 0 6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#64748B}'+
    '#nFis .fz-l{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:2px 0;font-size:12.5px;color:#475569}#nFis .fz-l b{font-size:17px;color:#0F172A;font-variant-numeric:tabular-nums}#nFis .fz-s{font-size:11px;color:#94A3B8;margin-top:4px}'+
    '#nFis .pos{color:#15803D!important}#nFis .neg{color:#B91C1C!important}'+
    '#nFis .fz-box{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.08);padding:14px;margin-bottom:14px}#nFis .fz-box h3{margin:0 0 8px;font-size:14.5px}'+
    '#nFis .fz-bar{height:14px;border-radius:7px;background:#E2E8F0;position:relative;overflow:hidden;margin:8px 0 4px}#nFis .fz-bar b{position:absolute;left:0;top:0;bottom:0;border-radius:7px}#nFis .fz-bar i{position:absolute;top:0;bottom:0;border-left:2px dashed #0F172A}'+
    '#nFis table{width:100%;border-collapse:collapse;font-size:12.5px}#nFis th{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#64748B;text-align:right;padding:7px 8px;border-bottom:1px solid #E2E8F0;background:#F8FAFC}#nFis td{text-align:right;padding:6px 8px;border-bottom:1px solid #EEF2F6;font-variant-numeric:tabular-nums;white-space:nowrap}'+
    '#nFis th:first-child,#nFis td:first-child{text-align:left}#nFis tr.t td{font-weight:800;background:#F1F5F9}#nFis tr.r td{font-weight:800;background:#EAF1FD}#nFis td.m{color:#94A3B8;font-size:11.5px;text-align:left;white-space:normal}'+
    '#nFis .fz-w{overflow-x:auto}#nFis details{margin-top:4px}#nFis summary{cursor:pointer;font-weight:700;color:#1F4A9A;font-size:13px}'+
    '#nFis .fz-aj{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:10px}#nFis .fz-aj label{font-size:12px;color:#475569;display:flex;flex-direction:column;gap:3px}#nFis .fz-aj select,#nFis .fz-aj input{font:inherit;font-size:13px;padding:6px 8px;border:1px solid #CBD5E1;border-radius:8px}'+
    '#nFis .fz-nota{font-size:11.5px;color:#64748B;margin-top:8px;line-height:1.5}';
    document.head.appendChild(s); }

  function pintar(){
    var V=document.getElementById('view-fiscalidad'); if(!V) return; css();
    var host=document.getElementById('nFis'); if(!host){ host=document.createElement('div'); host.id='nFis'; var k=document.getElementById('fiscalKpis'); (k||V.firstElementChild).insertAdjacentElement(k?'beforebegin':'afterend',host); }
    var kOld=document.getElementById('fiscalKpis'); if(kOld) kOld.style.display='none';
    var C=cfg(), L=todasOps(), ctx={DV:dividendos(L),FO:fondo(),IN:movs('Intereses Banco'),CU:movs('Comisiones / Custodia'),RE:fifo(L)};
    var y=new Date().getFullYear(), A=calcAnio(y,ctx), c=A.C, s=A.S;
    /* plusvalía latente por titular (FIFO por cartera, cotización de hoy) */
    var lat={C:0,S:0}, P=partes(C); (function(){ var Q={}; L.forEach(function(o){ var k=o.t+'|'+o.cart, q=Q[k]=Q[k]||[]; if(o.tipo==='venta'){ var rem=o.acc; while(rem>1e-6&&q.length){ var l=q[0], tk=Math.min(rem,l.acc); l.acc-=tk; rem-=tk; if(l.acc<=1e-6) q.shift(); } } else q.push({acc:o.acc,p:o.acc>0?(o.acc*o.pr+o.com)/o.acc:o.pr}); });
      Object.keys(Q).forEach(function(k){ var t=k.split('|')[0], cart=k.split('|')[1], pa=(typeof _precioActualDe==='function')?+_precioActualDe(t):0; if(!(pa>0)) return; Q[k].forEach(function(l){ var g=(pa-l.p)*l.acc, pp=partesCart(cart,P); lat.C+=g*pp.C; lat.S+=g*pp.S; }); }); })();
    function linea(lbl,v,cls){ return '<div class="fz-l"><span>'+lbl+'</span><b class="'+(cls||'')+'">'+v+'</b></div>'; }
    var h='<div class="fz-k">'+
      '<div class="fz-c" style="--c:#1F4A9A"><h4>Renta del ahorro '+y+'</h4>'+linea('Carlos',E(c.base,0))+linea('Susana',E(s.base,0))+'<div class="fz-s">dividendos + Foncuenta + intereses + ventas − gastos (con lo previsto hasta diciembre)</div></div>'+
      '<div class="fz-c" style="--c:#D97706"><h4>Retenciones pagadas</h4>'+linea('Carlos',E(c.ret,0))+linea('Susana',E(s.ret,0))+'<div class="fz-s">19 % de dividendos, Foncuenta e intereses: es un adelanto, se ajusta en la renta</div></div>'+
      '<div class="fz-c" style="--c:#16A34A"><h4>Resultado previsto de la renta '+y+'</h4>'+linea('Carlos',c.resultado<=0?'devuelven '+E(-c.resultado,0):'pagas '+E(c.resultado,0),c.resultado<=0?'pos':'neg')+linea('Susana',s.resultado<=0?'devuelven '+E(-s.resultado,0):'pagas '+E(s.resultado,0),s.resultado<=0?'pos':'neg')+'<div class="fz-s">solo la parte del ahorro; la de la nómina o pensión va aparte</div></div>'+
      '<div class="fz-c" style="--c:#7C3AED"><h4>Plusvalía latente</h4>'+linea('Carlos',S(lat.C),lat.C>=0?'pos':'neg')+linea('Susana',S(lat.S),lat.S>=0?'pos':'neg')+'<div class="fz-s">no tributa hasta vender · FIFO por cartera</div></div></div>';
    /* barra de Carlos hasta su mínimo */
    var pc=(DB.config&&DB.config.proyeccion)||{}, gD=+pc.crecDividendo||0.025, rpd=+pc.rpdNuevas||0.05, sob=c.minSobra, base0=c.div+c.int-c.gastos, pct=sob>0?Math.min(1,base0/sob):1;
    var a1=null, a2=null, b1=base0, b2=base0, yy=y; for(var i=1;i<=40&&(a1==null||a2==null);i++){ b1*=1+gD; b2=b2*(1+gD)+(+C.invAnual||0)*(C.propiaC/100)*rpd; if(a1==null&&b1>=sob) a1=y+i; if(a2==null&&b2>=sob) a2=y+i; }
    h+='<div class="fz-box"><h3>Tu margen hasta el mínimo personal (Carlos)</h3>'+
      '<div class="fz-l"><span>Tu mitad de dividendos e intereses '+y+', menos gastos</span><b>'+E(base0,0)+'</b></div>'+
      '<div class="fz-bar"><b style="width:'+(pct*100).toFixed(1)+'%;background:'+(pct<0.8?'#16A34A':pct<1?'#D97706':'#DC2626')+'"></b></div>'+
      '<div class="fz-l"><span>Mínimo que te queda para el ahorro: '+E(sob,0)+(+C.baseGenC?' ('+E(c.minimo,0)+' − '+E(+C.baseGenC,0)+' de base general)':' (personal 5.550 € + discapacidad)')+'</span><b class="'+(sob-base0>=0?'pos':'neg')+'">'+(sob-base0>=0?'margen '+E(sob-base0,0):'lo pasas en '+E(base0-sob,0))+'</b></div>'+
      '<div class="fz-nota">Mientras no lo pases, la retención del 19 % de tu mitad te la devuelven entera. Al ritmo de subida del dividendo ('+n(gD*100,1)+' %/año) lo pasarías en <b>'+(a1||'más de 40 años')+'</b>; sumando tus compras ('+E(+C.invAnual||0,0)+'/año, tu mitad, al '+n(rpd*100,1)+' % de rentabilidad), en <b>'+(a2||'más de 40 años')+'</b>. Desde ese año, lo que pase del mínimo tributa al 19 %.</div></div>';
    /* tabla del año por titular */
    function fila(lbl,kc,ks,cls,nota){ var vc=typeof kc==='function'?kc(c):c[kc], vs=typeof kc==='function'?kc(s):s[ks||kc]; return '<tr class="'+(cls||'')+'"><td>'+lbl+'</td><td>'+E(vc)+'</td><td>'+E(vs)+'</td><td>'+E(vc+vs)+'</td><td class="m">'+(nota||'')+'</td></tr>'; }
    h+='<div class="fz-box"><h3>Rendimientos de '+y+' por titular</h3><div class="fz-w"><table><thead><tr><th>Concepto</th><th>Carlos</th><th>Susana</th><th>Total</th><th style="text-align:left">De dónde sale</th></tr></thead><tbody>'+
      fila('Dividendos brutos cobrados','divCob',null,'','Kanban: lo cobrado hasta hoy, con las acciones de cada cartera en cada fecha')+
      fila('Dividendos previstos hasta diciembre','divPrev',null,'','calendario: pagos que quedan del año, por las acciones de hoy')+
      fila('Intereses de cuentas (bruto estimado)','int',null,'','Movimientos «Intereses Banco» (neto) ÷ 0,81')+
      fila('− Gastos deducibles (custodias)',function(o){ return -o.gastos; },null,'','Movimientos «Comisiones / Custodia»')+
      fila('Ganancia de ventas de acciones','ventas',null,'','FIFO por cartera, con comisiones')+
      fila('Ganancia del Foncuenta','fondo',null,'','extracto de fondos de R4 (cada reembolso)')+
      fila('Base del ahorro','base',null,'t','con la compensación del 25 % si algún saldo es negativo')+
      fila('Cuota (escala del ahorro, tras el mínimo)','cuota')+
      fila('− Retenciones ya pagadas',function(o){ return -o.ret; },null,'','dividendos '+E(c.retDiv+s.retDiv,0)+' · Foncuenta '+E(c.retFondo+s.retFondo,0)+' · intereses '+E(c.retInt+s.retInt,0))+
      fila('Resultado previsto (− = te devuelven)','resultado',null,'r')+
      '</tbody></table></div><div class="fz-nota">Orientativo, no es la declaración: la comisión de cobro de dividendos de R4 y la venta de derechos todavía no entran. Los scrip cobrados en acciones no tributan hasta vender.</div></div>';
    /* resumen por año */
    var anios={}; [ctx.DV,ctx.FO,ctx.IN,ctx.CU].forEach(function(o){ Object.keys(o).forEach(function(k){ anios[k]=1; }); }); ctx.RE.forEach(function(r){ anios[r.fechaV.slice(0,4)]=1; }); Object.keys(DB.devolucionHacienda||{}).forEach(function(k){ anios[k]=1; });
    var Y=Object.keys(anios).filter(function(k){ return +k>=y-6&&+k<=y; }).sort().reverse(), dh=DB.devolucionHacienda||{};
    h+='<div class="fz-box"><h3>Resumen por año (hogar)</h3><div class="fz-w"><table><thead><tr><th>Año</th><th>Dividendos brutos</th><th>Retención dividendos</th><th>Ventas (ganancia)</th><th>Foncuenta</th><th>Intereses (neto)</th><th>Custodias</th><th>Devolución que calcula la pestaña</th><th>Devolución real de Hacienda</th></tr></thead><tbody>'+
      Y.map(function(k){ var a=calcAnio(+k,ctx); var div=a.C.div+a.S.div, ve=a.C.ventas+a.S.ventas, fo=a.C.fondo+a.S.fondo, it=a.C.intNeto+a.S.intNeto, cu=a.C.gastos+a.S.gastos;
        return '<tr><td><b>'+k+'</b></td><td>'+E(div,0)+'</td><td>'+E(div*0.19,0)+'</td><td class="'+(ve>=0?'':'neg')+'">'+S(ve)+'</td><td>'+(fo?S(fo):'·')+'</td><td>'+(it?E(it,0):'·')+'</td><td>'+(cu?E(cu,0):'·')+'</td><td>'+(function(){ var r=a.C.resultado+a.S.resultado; return r<=0?E(-r,0):'pagar '+E(r,0); })()+'</td><td class="pos">'+(dh[k]?E(num_(dh[k]),0):(+k===y?'en la renta de '+(y+1):'·'))+'</td></tr>'; }).join('')+
      '</tbody></table></div><div class="fz-nota">Hogar = las dos carteras enteras (también la mitad de la hermana de Susana en la Compartida). «Devolución real» es lo que tienes apuntado de cada renta. Si la que calcula la pestaña se aleja de la real, ajusta abajo los datos (sobre todo el de Susana: si a ella también le devuelven su retención, su nómina no agota su mínimo).</div></div>';
    /* ajustes */
    h+='<div class="fz-box"><details><summary>⚙ Ajustes de la fiscalidad</summary><div class="fz-aj">'+
      '<label>Tu grado de discapacidad<select data-fz="grado"><option value="33"'+(C.grado==='33'?' selected':'')+'>33 % (incapacidad absoluta): mínimo 8.550 €</option><option value="65"'+(C.grado==='65'?' selected':'')+'>65 % o más: mínimo 17.550 €</option><option value="0"'+(C.grado==='0'?' selected':'')+'>Sin discapacidad: 5.550 €</option></select></label>'+
      '<label>Tus otros ingresos de la base general (€/año)<input type="number" step="100" data-fz="baseGenC" value="'+(+C.baseGenC||0)+'"></label>'+
      '<label>Susana: su nómina agota su mínimo<select data-fz="susMinAgotado"><option value="1"'+(C.susMinAgotado?' selected':'')+'>Sí (tributa desde el primer euro)</option><option value="0"'+(C.susMinAgotado?'':' selected')+'>No</option></select></label>'+
      '<label>Tu parte de la cartera Propia (%)<input type="number" min="0" max="100" data-fz="propiaC" value="'+C.propiaC+'"></label>'+
      '<label>Parte de Susana en la Compartida (%)<input type="number" min="0" max="100" data-fz="compS" value="'+C.compS+'"></label>'+
      '<label>Tu parte del Foncuenta (%)<input type="number" min="0" max="100" data-fz="fondoC" value="'+C.fondoC+'"></label>'+
      '<label>Inversión anual prevista (€)<input type="number" step="1000" data-fz="invAnual" value="'+(+C.invAnual||0)+'"></label></div>'+
      '<div class="fz-nota">Mínimo personal 5.550 € + discapacidad (33-65 %: 3.000 €; 65 % o más: 9.000 € + 3.000 € de asistencia). Escala del ahorro desde 2025: 19 / 21 / 23 / 27 / 30 %. Fuente: Agencia Tributaria. Orientativo, no es asesoramiento fiscal.</div></details></div>';
    host.innerHTML=h;
    /* textos de la pestaña de siempre: escala desde 2025 y cabecera */
    try{ [].forEach.call(V.querySelectorAll('div,p,span'),function(el){ if(el.children.length<=3&&/19% \/ 21% \/ 23% \/ 27% \/ 28%/.test(el.innerHTML)) el.innerHTML=el.innerHTML.replace('19% / 21% / 23% / 27% / 28%','19 % / 21 % / 23 % / 27 % / 30 % (desde 2025). Estas herramientas cuentan el hogar entero, sin repartir por titular'); });
      var hp=V.querySelector('.vhero-txt p, .vhero p'); if(hp) hp.textContent='Lo que tributáis tú y Susana por el ahorro (dividendos, Foncuenta, intereses y ventas), tu margen hasta el mínimo personal, la renta prevista y las herramientas de venta.'; }catch(e){}
  }
  var o=renderFiscalidad; renderFiscalidad=function(){ var r=o.apply(this,arguments); try{ pintar(); }catch(e){ console.error('[fiscalidad]',e); } return r; };
  document.addEventListener('change',function(e){ var el=e.target.closest&&e.target.closest('[data-fz]'); if(!el) return; var C=cfg(), k=el.getAttribute('data-fz'), v=el.value;
    if(k==='grado') C.grado=v; else if(k==='susMinAgotado') C.susMinAgotado=v==='1'; else C[k]=Math.max(0,+v||0);
    if(/C$|S$/.test(k)&&C[k]>100) C[k]=100; if(typeof scheduleSave==='function') scheduleSave(); try{ pintar(); }catch(err){} });
})();
