/* APP NUEVA · Hogar bajo Presupuesto (boceto 28-oct v3: «debajo, en las dos subpestañas: lo que hoy está en Hogar del Panel»).
   Dos ventanas: Fondo de emergencia y Esencial vs discrecional. Mismos cálculos que el Panel de siempre
   (fondoEmergencia, gastoEsencialPresu, gastoMensualPresu). */
(function(){
  function E0(x){ x=Math.round(+x||0); try{ return x.toLocaleString('es-ES',{useGrouping:'always'})+' €'; }catch(e){ return x+' €'; } }
  function mini(l,v,c){ return '<div class="n-hm"><span>'+l+'</span><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>'; }
  /* 5-nov-2026 (Carlos: «tenemos 1.790 de esencial y 1.773 de discrecional pero no puedo ver qué partidas están en cada sitio»):
     debajo de las dos ventanas, la lista de partidas de gasto del Presupuesto del año, en dos columnas: esenciales y
     discrecionales, con su importe al mes (el mismo cálculo que suma gastoEsencialPresu y gastoMensualPresu). */
  function partidas(){
    var y=new Date().getFullYear(), M={};
    (DB.presupuesto||[]).forEach(function(p){ var a=(typeof pAnio==='function')?pAnio(p):p.anio; if(a!==y) return;
      var c=(typeof catById==='function')?catById(p.categoriaId):null; if(!c||c.tipo!=='gasto') return;
      var v=(typeof mensual==='function')?mensual(p):(+p.importe||0); var k=c.id; (M[k]=M[k]||{c:c,v:0}).v+=v; });
    var L=Object.keys(M).map(function(k){ return M[k]; }).filter(function(x){ return Math.abs(x.v)>=0.5; });
    if(!L.length) return '';
    var ES=L.filter(function(x){ return x.c.esencial; }).sort(function(a,b){ return b.v-a.v; }), DI=L.filter(function(x){ return !x.c.esencial; }).sort(function(a,b){ return b.v-a.v; });
    var sum=function(A){ return A.reduce(function(s,x){ return s+x.v; },0); }, tE=sum(ES), tD=sum(DI);
    var col=function(tit,A,t,cc){ return '<div class="n-pl"><div class="n-plh" style="--c:'+cc+'"><b>'+tit+'</b><span>'+A.length+' partidas · <b>'+E0(t)+'</b> al mes</span></div>'+
      (A.length?A.map(function(x){ var w=t>0?Math.max(2,x.v/t*100):0; return '<div class="n-plr"><div class="n-pln">'+(x.c.nombre||'—')+(x.c.grupo&&x.c.grupo!==x.c.nombre?' <small>'+x.c.grupo+'</small>':'')+'</div><div class="n-plv">'+E0(x.v)+'</div><i style="width:'+w.toFixed(1)+'%;background:'+cc+'"></i></div>'; }).join(''):'<div class="n-hs">Ninguna.</div>')+'</div>'; };
    return '<div class="n-hc n-plc" style="--c:#475569"><div class="n-hh"><span class="ic" style="background:#E2E8F0">📋</span><b>Partidas esenciales y discrecionales</b><em style="background:#F1F5F9;color:#475569">Presupuesto '+y+'</em></div>'+
      '<div class="n-plg">'+col('Esenciales',ES,tE,'#0891B2')+col('Discrecionales',DI,tD,'#D97706')+'</div>'+
      '<div class="n-hn">Al mes, de mayor a menor. Una partida es esencial si su categoría está marcada como esencial («Necesario»); se cambia al editar la partida del Presupuesto, en «Clasificación».</div></div>';
  }
  var _st=document.createElement('style'); _st.textContent='.n-plc{margin-top:16px}.n-plg{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:6px}@media (max-width:860px){.n-plg{grid-template-columns:1fr}}'+
    '.n-plh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;border-bottom:2px solid var(--c);padding:4px 0 6px;margin-bottom:4px}.n-plh>b{color:var(--c);font-size:14px}.n-plh span{font-size:12px;color:#64748B}.n-plh span b{color:#1E293B}'+
    '.n-plr{position:relative;display:flex;justify-content:space-between;gap:10px;padding:5px 2px 7px;border-bottom:1px solid #F1F5F9;font-size:13px}.n-plr i{position:absolute;left:0;bottom:1px;height:3px;border-radius:2px;opacity:.55}'+
    '.n-pln small{color:#94A3B8;font-size:11px;margin-left:4px}.n-plv{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}';
  document.head.appendChild(_st);
  function pintar(){
    var sec=document.getElementById('view-presupuesto'); if(!sec) return;
    var h=document.getElementById('nHogar'); if(!h){ h=document.createElement('div'); h.id='nHogar'; h.className='n-hogar'; sec.appendChild(h); } else if(h.parentNode.lastElementChild!==h) sec.appendChild(h);
    var FE=null; try{ FE=fondoEmergencia(); }catch(e){}
    var a='';
    if(FE&&(FE.efectivo>0||FE.gastoMes>0)){
      var m=FE.meses, est=m==null?['—','#EEF1F5','#475569']:(m>=6?['🟢 holgado','#DCFCE7','#15803D']:(m>=3?['🟡 aceptable','#FEF3C7','#92400E']:['🔴 insuficiente','#FEE2E2','#B91C1C']));
      var obj=FE.gastoMes*6, falta=Math.max(0,obj-FE.efectivo), w=m==null?0:Math.min(100,m/6*100);
      a='<div class="n-hc" style="--c:#D97706"><div class="n-hh"><span class="ic" style="background:#FEE2E2">🛟</span><b>Fondo de emergencia</b><em style="background:'+est[1]+';color:'+est[2]+'">'+est[0]+'</em></div>'+
        '<div class="n-hv">'+(m==null?'—':m.toFixed(1).replace('.',',')+' meses')+'</div><div class="n-hs">de gasto cubiertos con el efectivo (incluye R4)</div>'+
        '<div class="n-hbar"><i style="width:'+w.toFixed(0)+'%;background:'+(m!=null&&m<3?'#DC2626':(m>=6?'#16A34A':'#D97706'))+'"></i><u style="left:50%"></u></div><div class="n-hn">raya a 3 meses (mínimo) · barra llena = 6 meses (objetivo)</div>'+
        '<div class="n-hms">'+mini('Efectivo',E0(FE.efectivo))+mini('Gasto al mes',E0(FE.gastoMes))+mini('Objetivo 6 meses',E0(obj))+(falta>0?mini('Faltan',E0(falta)):mini('Objetivo','cubierto ✓','#15803D'))+'</div>'+
        '<div class="n-hn">'+(FE.base==='presupuesto'?'gasto al mes: el de tu presupuesto de '+new Date().getFullYear():'gasto al mes: la media real de los últimos 12 meses')+'</div></div>';
    } else a='<div class="n-hc" style="--c:#D97706"><div class="n-hh"><span class="ic" style="background:#FEE2E2">🛟</span><b>Fondo de emergencia</b></div><div class="n-hs">Sin datos: hace falta un registro de Patrimonio con el efectivo y un presupuesto o gastos del último año.</div></div>';
    var es=null, tot=null; try{ es=gastoEsencialPresu(); tot=gastoMensualPresu(); }catch(e){}
    var b;
    if(es!=null&&tot>0){
      var dis=Math.max(0,tot-es), pe=Math.round(es/tot*100);
      b='<div class="n-hc" style="--c:#0891B2"><div class="n-hh"><span class="ic" style="background:#CFFAFE">⚖️</span><b>Esencial vs discrecional</b></div>'+
        '<div class="n-hv">'+E0(es)+' <small>esencial al mes</small></div>'+
        '<div class="n-hbar"><i style="width:'+pe+'%;background:#0891B2"></i></div>'+
        '<div class="n-hs"><b>'+pe+' %</b> esencial · <b>'+(100-pe)+' %</b> discrecional, que se puede recortar o invertir</div>'+
        '<div class="n-hms n3">'+mini('Esencial',E0(es))+mini('Discrecional',E0(dis))+mini('Colchón esencial',FE&&FE.mesesEsencial!=null?FE.mesesEsencial.toFixed(1).replace('.',',')+' meses':'—')+'</div>'+
        '<div class="n-hn">«colchón esencial»: los meses que aguantaría el efectivo pagando solo lo imprescindible</div></div>';
    } else b='<div class="n-hc" style="--c:#0891B2"><div class="n-hh"><span class="ic" style="background:#CFFAFE">⚖️</span><b>Esencial vs discrecional</b></div><div class="n-hs">'+(tot>0?'Ninguna categoría de gasto de '+new Date().getFullYear()+' está marcada como esencial: márcalas en la categoría y saldrá el reparto.':'Sin presupuesto de gasto de este año.')+'</div></div>';
    h.innerHTML='<div class="n-hg">'+a+b+'</div>'+partidas();
  }
  ['renderPres','renderPresDesglose'].forEach(function(f){ var o=window[f]; if(typeof o!=='function') return; window[f]=function(){ var r=o.apply(this,arguments); try{ pintar(); }catch(e){ console.error('n-hogar',e); } return r; }; });
})();
