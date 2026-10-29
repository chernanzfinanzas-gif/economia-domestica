/* APP NUEVA · Hogar bajo Presupuesto (boceto 28-oct v3: «debajo, en las dos subpestañas: lo que hoy está en Hogar del Panel»).
   Dos ventanas: Fondo de emergencia y Esencial vs discrecional. Mismos cálculos que el Panel de siempre
   (fondoEmergencia, gastoEsencialPresu, gastoMensualPresu). */
(function(){
  function E0(x){ x=Math.round(+x||0); try{ return x.toLocaleString('es-ES',{useGrouping:'always'})+' €'; }catch(e){ return x+' €'; } }
  function mini(l,v,c){ return '<div class="n-hm"><span>'+l+'</span><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>'; }
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
    h.innerHTML='<div class="n-hg">'+a+b+'</div>';
  }
  ['renderPres','renderPresDesglose'].forEach(function(f){ var o=window[f]; if(typeof o!=='function') return; window[f]=function(){ var r=o.apply(this,arguments); try{ pintar(); }catch(e){ console.error('n-hogar',e); } return r; }; });
})();
