/* APP NUEVA · PLAN → INDEPENDENCIA (boceto «Independencia - boceto 29-oct v7»).
   Carlos (29-oct): «mi plan no depende de lo que vale mi cartera, depende de lo que sea capaz de rentar… vivir del dividendo y
   dejar la cartera de acciones a mis sobrinos». SUS CÁLCULOS SE QUEDAN COMO ESTÁN (computeProy): aquí solo cambia lo decidido:
   · cifras de arriba: % del gasto que ya paga el dividendo · año en que lo paga todo · renta al mes a los 70 · dividendo y
     patrimonio a los 70 y a los 80 (sin «a los 90» ni plusvalía latente) · «Para invertir en <año>» (lo usa Asignación);
   · botón «cifras de futuro en euros de hoy» con inflación fija editable (2,5 % por defecto);
   · gráfica año a año: dividendo frente al gasto; columna nueva «Div. ÷ gasto» en la tabla de siempre;
   · Eventos puntuales y Retirada dinámica desaparecen; Monte Carlo se queda, explicado;
   · Coast FIRE en los dos escenarios (vivir de la renta / vivir de vender) y Plan B (gasto mínimo sin vender). */
(function(){
  window._nIndInf=window._nIndInf==null?0.025:window._nIndInf; window._nIndHoy=window._nIndHoy||false;
  function E(v){ return Math.round(+v||0).toLocaleString('es-ES',{useGrouping:'always'}); }
  function EU(v){ return E(v)+' €'; }
  function pc(v){ return Math.round(v*100)+' %'; }
  function def(v,anio,base){ return window._nIndHoy?(+v||0)/Math.pow(1+window._nIndInf,Math.max(0,anio-base)):(+v||0); }

  function nominaShares(){ /* reparto de la nómina del hogar entre Carlos y su pareja (del Presupuesto del año) */
    var y=new Date().getFullYear(), C={}, ca=0, ot=0; (DB.categorias||[]).forEach(function(c){ C[c.id]=c; });
    (DB.presupuesto||[]).forEach(function(p){ var a=(typeof pAnio==='function')?pAnio(p):p.anio; if(a!==y) return; var c=C[p.categoriaId]; if(!c||c.tipo!=='ingreso'||!/n[oó]mina/i.test(c.nombre||'')) return;
      var v=(typeof anual==='function')?anual(p):(+p.importe||0)*12; if(/carlos/i.test(c.nombre)) ca+=v; else ot+=v; });
    var t=ca+ot; return t>0?{yo:ca/t,pareja:ot/t}:{yo:0.5,pareja:0.5}; }
  function gastoMinimo(){ /* necesario + 40 % del prescindible (Ocio y Vacaciones), al año, del Presupuesto */
    var y=new Date().getFullYear(), C={}, nec=0, pre=0; (DB.categorias||[]).forEach(function(c){ C[c.id]=c; });
    (DB.presupuesto||[]).forEach(function(p){ var a=(typeof pAnio==='function')?pAnio(p):p.anio; if(a!==y) return; var c=C[p.categoriaId]; if(!c||c.tipo!=='gasto') return;
      var v=(typeof anual==='function')?anual(p):(+p.importe||0)*12; if(/^(ocio|vacaciones)$/i.test(c.grupo||'')) pre+=v; else nec+=v; });
    return {nec:nec,pre:pre,min:nec+0.4*pre}; }

  function gastoAnio(c,anio){ var base=c.anioBase||new Date().getFullYear(); return (+c.gastoMes||0)*12*Math.pow(1+window._nIndInf,Math.max(0,anio-base)); }
  function conGasto(c,ser){ ser.forEach(function(r){ r._g=gastoAnio(c,r.anio); }); return ser; }
  function kpis(c,ser){
    var base=c.anioBase||new Date().getFullYear(), y0=ser.filter(function(r){ return r.anio===new Date().getFullYear(); })[0]||ser[0];
    var at=function(ed){ return ser.filter(function(r){ return r.edad===ed; })[0]||ser[ser.length-1]; };
    var r70=at(Math.round(c.edadFinAportar||70)), r80=at(80);
    var cubre=ser.filter(function(r){ return r._g>0&&r.dividendoAnual>=r._g; })[0];
    var hoyPct=y0&&y0._g>0?y0.dividendoAnual/y0._g:null;
    var pens=r70.rentaMes*12-r70.dividendoAnual;
    var tg=window._nIndHoy?' <span class="ni-hoy">en euros de '+base+'</span>':'';
    var k=[
      ['Tu gasto que ya paga el dividendo',hoyPct!=null?pc(hoyPct):'—','dividendo '+EU(y0.dividendoAnual)+' de un gasto de '+EU(y0._g)+' en '+y0.anio,1],
      ['El dividendo paga todo el gasto en',cubre?String(cubre.anio):'después de '+ser[ser.length-1].anio,cubre?('a tus '+cubre.edad+(cubre.edad<(c.edadFinAportar||70)?', '+((c.edadFinAportar||70)-cubre.edad)+' años antes de dejar de aportar':'')):''],
      ['Renta al mes a los '+r70.edad,EU(def(r70.rentaMes,r70.anio,base))+tg,'pensiones '+EU(def(pens/12,r70.anio,base))+' + dividendo '+EU(def(r70.dividendoAnual/12,r70.anio,base))],
      ['Dividendo a los '+r70.edad+' · '+r80.edad,E(def(r70.dividendoAnual,r70.anio,base))+' · '+EU(def(r80.dividendoAnual,r80.anio,base)),'al año, con tus hipótesis'+(window._nIndHoy?' (euros de '+base+')':'')],
      ['Patrimonio a los '+r70.edad+' · '+r80.edad,E(def(r70.patrimonio,r70.anio,base))+' · '+EU(def(r80.patrimonio,r80.anio,base)),'informativo: lo que dejarías']];
    var inv=(y0&&y0.aInversion)||0;
    return '<div class="ni-top"><div class="ni-inv">Para invertir en '+y0.anio+': <b>'+EU(inv)+'</b> · lo usa Asignación</div>'+
      '<label class="ni-tog"><input type="checkbox" data-nihoy'+(window._nIndHoy?' checked':'')+'> Cifras de futuro en euros de hoy · inflación <input type="number" step="0.1" min="0" max="10" data-niinf value="'+(window._nIndInf*100).toFixed(1)+'"> %</label></div>'+
      '<div class="ni-k">'+k.map(function(x){ return '<div class="k'+(x[3]?' hero':'')+'"><div class="l">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="p">'+x[2]+'</div></div>'; }).join('')+'</div>';
  }
  function grafica(c,ser){
    var base=c.anioBase||new Date().getFullYear(), L=ser.filter(function(r){ return r.edad<=Math.max(80,(c.edadFinAportar||70)+10); });
    if(L.length<3) return '';
    var W=900,H=230,x0=60,x1=890,yt=12,yb=H-26,n=L.length,bw=(x1-x0)/n;
    var D=L.map(function(r){ return def(r.dividendoAnual,r.anio,base); }), G=L.map(function(r){ return def(r._g,r.anio,base); });
    var mx=Math.max.apply(null,D.concat(G).concat([1]))*1.08, Y=function(v){ return yb-(v/mx)*(yb-yt); };
    var st=Math.pow(10,Math.floor(Math.log10(mx/4))); st=[1,2,2.5,5,10].map(function(m){ return m*st; }).filter(function(s){ return s>=mx/4; })[0];
    var h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs">';
    for(var v=0; v<=mx; v+=st) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="#EEF1F5"/><text x="'+(x0-6)+'" y="'+(Y(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="#5B6B7C">'+E(v/1000)+' k</text>';
    L.forEach(function(r,i){ var x=x0+i*bw+bw*0.15, w=bw*0.7, ok=D[i]>=G[i]; h+='<rect x="'+x.toFixed(1)+'" y="'+Y(D[i]).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(yb-Y(D[i])).toFixed(1)+'" fill="'+(ok?'#16A34A':'#8B5CF6')+'" rx="2"/>';
      if(i%2===0||n<20) h+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-8)+'" font-size="10" text-anchor="middle" fill="#5B6B7C">'+String(r.anio).slice(2)+'</text>';
      h+='<rect class="nf-hv" x="'+(x0+i*bw).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+r.anio+' · '+r.edad+' años|Dividendo: '+EU(D[i])+'|Gasto: '+EU(G[i])+'|Cubre: '+(G[i]>0?pc(D[i]/G[i]):'—')+'"/>'; });
    h+='<polyline fill="none" stroke="#DC2626" stroke-width="2.5" points="'+L.map(function(r,i){ return (x0+i*bw+bw/2).toFixed(1)+','+Y(G[i]).toFixed(1); }).join(' ')+'"/></svg>';
    return '<div class="nf-card ni-chart"><h2>Año a año'+(window._nIndHoy?' <span class="nf-sub">en euros de '+base+'</span>':'')+'</h2>'+h+
      '<div class="nf-lg"><span><i style="background:#8B5CF6"></i>Dividendo</span><span><i style="background:#16A34A"></i>Dividendo que ya paga todo</span><span><i style="background:#DC2626"></i>Gasto de hoy + inflación (línea)</span></div><span class="nf-ws">Donde la barra pasa la línea, el dividendo paga todo el gasto.</span></div>';
  }
  function columnaCubre(ser){
    var t=document.querySelector('#proyTabla .proy-desk table'); if(!t||t.querySelector('.ni-cub')) return;
    var hr=t.querySelector('thead tr'); if(hr) hr.insertAdjacentHTML('beforeend','<th class="num ni-cub" title="Dividendo del año ÷ gasto del año">Div. ÷ gasto</th>');
    var M={}; ser.forEach(function(r){ M[r.anio]=r; });
    [].forEach.call(t.querySelectorAll('tbody tr'),function(tr){
      if(tr.classList.contains('plan')){ var y=+((tr.querySelector('td b')||{}).textContent||0), r=M[y]; var v=r&&r._g>0?r.dividendoAnual/r._g:null;
        tr.insertAdjacentHTML('beforeend','<td class="num ni-cub" style="font-weight:700;color:'+(v>=1?'#15803D':(v>=0.5?'#B45309':'#64748B'))+'">'+(v!=null?pc(v):'—')+'</td>'); }
      else { var pd=tr.querySelector('td.pend'); if(pd) pd.colSpan=(pd.colSpan||1)+1; else tr.insertAdjacentHTML('beforeend','<td class="num soft">·</td>'); } });
  }
  function despuesProy(){
    try{
      var c=DB.config.proyeccion, ser=computeProy(c); if(!ser||!ser.length) return; conGasto(c,ser);
      var pc0=document.getElementById('proyCards'); if(pc0){ pc0.className='ni-wrap'; pc0.innerHTML=kpis(c,ser); }
      var ev=document.getElementById('blkProyEv'); if(ev) ev.style.display='none';
      var old=document.getElementById('niChart'); if(old) old.remove();
      var det=document.getElementById('blkProyDet'); if(det){ det.insertAdjacentHTML('beforebegin','<div id="niChart">'+grafica(c,ser)+'</div>'); }
      columnaCubre(ser);
      var mc=document.getElementById('proyMC'); if(mc&&!document.getElementById('niMcTx')) mc.insertAdjacentHTML('afterbegin','<div id="niMcTx" class="nf-nota" style="margin-bottom:8px"><span>Qué hace</span>Repite tu plan 1.000 veces con años de bolsa buenos y malos al azar (de media sube lo que pones en «Revalorización», pero un año puede caer mucho y otro subir mucho). Con tus mismas aportaciones, mira cuánto valdría la cartera a los '+(c.edadFinAportar||70)+' en cada caso y los ordena. <b>No cambia tu dividendo</b>: te dice entre qué cifras se moverá lo que dejas.</div>');
    }catch(e){ console.error('n-indep',e); }
  }
  function despuesIndep(){
    try{
      var el=document.getElementById('indepBody'); if(!el) return;
      [].forEach.call(el.querySelectorAll('[data-indepblk]'),function(b){ b.style.display='none'; });   /* Retirada dinámica fuera; el Coast FIRE de siempre se sustituye por el de dos escenarios */
      if(document.getElementById('niCoast')) document.getElementById('niCoast').remove();
      var c=DB.config.proyeccion||{}, ser=conGasto(c,computeProy(c)), r70=ser.filter(function(r){ return r.edad===Math.round(c.edadFinAportar||70); })[0]||ser[ser.length-1];
      var snaps=(typeof patSnaps==='function')?patSnaps():[], last=snaps.length?snapTot(snaps[snaps.length-1]):null, patrimonio=last?last.total:(+c.carteraInicial+(+c.efectivo||0)), valorC=last?last.inv:+c.carteraInicial;
      var fsnap=snaps.length?(snaps[snaps.length-1].fecha||''):'';
      var y0=ser.filter(function(r){ return r.anio===new Date().getFullYear(); })[0]||ser[0], gasto=y0._g||(+c.gastoMes||0)*12;
      var rpd=valorC>0?(y0.dividendoAnual/valorC):0.04, infla=(typeof fireInflaPct==='function')?fireInflaPct():0.025;
      var rReal=(1+(+c.crecCartera||0)+rpd)/(1+infla)-1, anos=Math.max(0,Math.round((c.edadFinAportar||70)-(c.edadActual||55))), g=Math.pow(1+rReal,anos);
      var esc=function(t,ic,nec,form,yo){ var hoy=nec/g, lle=hoy>0?patrimonio/hoy:0; return '<div class="ni-esc"><b>'+ic+' '+t+'</b>'+(yo?' <span class="ni-tu">tu plan</span>':'')+'<div class="nf-kv"><span>Cartera necesaria ('+form+')</span><b>≈ '+EU(nec)+'</b><span>Necesaria hoy para llegar sin aportar</span><b>≈ '+EU(hoy)+'</b><span>Llevas</span><b style="color:'+(lle>=1?'#15803D':'#B45309')+'">≈ '+pc(lle)+'</b></div></div>'; };
      var gm=gastoMinimo(), sh=nominaShares(), ff=Math.pow(1+window._nIndInf,Math.max(0,r70.anio-(c.anioBase||y0.anio))), gmin=gm.min*ff;
      var pens=r70.rentaMes*12-r70.dividendoAnual, dv=r70.dividendoAnual;
      var casos=[['Como el plan',pens+dv],['Pensión de tu pareja a la mitad y dividendo −30 %',pens*(1-sh.pareja/2)+dv*0.7],['Solo tu pensión, sin dividendo',pens*sh.yo]];
      var pb='<table class="nf-t"><tr><th>Qué pasa</th><th>Pensiones + dividendo</th><th>Gasto mínimo</th><th>Margen</th><th>¿Vender?</th></tr>'+casos.map(function(x){ var m=x[1]-gmin; return '<tr><td>'+x[0]+'</td><td>'+EU(x[1])+'</td><td>'+EU(gmin)+'</td><td style="font-weight:700;color:'+(m>=0?'#15803D':'#B91C1C')+'">'+(m>=0?'+':'')+EU(m)+'</td><td>'+(m>=0?'No':'Sí: '+EU(-m)+' al año')+'</td></tr>'; }).join('')+'</table>';
      var ingN=0; try{ var Cc={}; (DB.categorias||[]).forEach(function(x){ Cc[x.id]=x; }); (DB.presupuesto||[]).forEach(function(p){ var a=(typeof pAnio==='function')?pAnio(p):p.anio; var x=Cc[p.categoriaId]; if(a===new Date().getFullYear()&&x&&x.tipo==='ingreso') ingN+=(typeof anual==='function')?anual(p):(+p.importe||0)*12; }); }catch(e){}
      var tasa=ingN>0?(ingN-gasto)/ingN:null;
      el.insertAdjacentHTML('afterbegin','<div id="niCoast" class="nf-card"><h2>Coast FIRE <span class="nf-sub">si dejaras de aportar hoy y lo dejaras crecer solo, ¿llegarías a los '+(c.edadFinAportar||70)+'? En los dos escenarios.</span></h2>'+
        '<div class="nf-g2">'+esc('Vivir de la renta cobrada','🪙',rpd>0?gasto/rpd:0,'gasto ÷ rentabilidad por dividendo '+(rpd*100).toFixed(1).replace('.',',')+' %',1)+esc('Vivir de vender (regla del 4 %)','💰',25*gasto,'25 × gasto')+'</div>'+
        '<div class="nf-kv" style="margin-top:6px"><span>Años de colchón</span><b>'+(gasto>0?(patrimonio/gasto).toFixed(1).replace('.',','):'—')+' <small>patrimonio ÷ gasto anual</small></b>'+(tasa!=null?'<span>Tasa de ahorro</span><b>'+pc(tasa)+' <small>de tus ingresos netos presupuestados</small></b>':'')+'<span>Patrimonio actual</span><b>'+EU(patrimonio)+(fsnap?' <small>a '+String(fsnap).slice(0,10).split('-').reverse().join('/')+' · último registro de Patrimonio</small>':'')+'</b></div></div>'+
        '<div class="nf-card"><h2>Plan B · si algo sale peor <span class="nf-sub">¿seguiríais cubriendo el gasto mínimo (necesario + 40 % del prescindible) sin vender? En '+r70.anio+':</span></h2>'+pb+'<span class="nf-ws">Gasto mínimo del Presupuesto de este año (necesario '+EU(gm.nec)+' + 40 % de Ocio y Vacaciones '+EU(gm.pre)+'), llevado a '+r70.anio+' con la inflación de arriba. El reparto de la pensión sale de vuestras nóminas del Presupuesto.</span></div>');
    }catch(e){ console.error('n-indep2',e); }
  }
  document.addEventListener('change',function(e){ var t=e.target; if(!t||!t.closest||!t.closest('#view-independencia')) return;
    if(t.hasAttribute('data-nihoy')){ window._nIndHoy=t.checked; despuesProy(); }
    if(t.hasAttribute('data-niinf')){ var v=parseFloat(String(t.value).replace(',','.')); if(isFinite(v)) window._nIndInf=v/100; despuesProy(); despuesIndep(); } });
  if(typeof renderProy==='function'){ var o=renderProy; renderProy=function(){ var r=o.apply(this,arguments); despuesProy(); return r; }; }
  if(typeof renderIndependencia==='function'){ var oi=renderIndependencia; renderIndependencia=function(){ var r=oi.apply(this,arguments); despuesIndep(); return r; }; }
})();
