/* APP NUEVA · Movimientos (boceto 28-oct v2): 4 cifras arriba —
   Reembolsables · Fondo R4 · Conciliación bancaria · Resultado del periodo.
   La lista, los filtros y las fichas de importe siguen siendo las de siempre. */
(function(){
  function d2(f){ return f?ddmmyyyy(f):''; }
  function diasDesde(f){ if(!f) return null; return Math.round((Date.now()-new Date(f+'T00:00:00').getTime())/864e5); }
  /* Reembolsables abiertos: los apuntes desde la última vez que el saldo quedó a cero */
  function reembEstado(){
    var ch=(typeof amaliaSorted==='function')?amaliaSorted():[]; var run=0, desde=0;
    ch.forEach(function(m,i){ run+=_reembEsAdel(m)?num(m.importe):-num(m.importe); if(Math.abs(run)<0.005) desde=i+1; });
    var ab=ch.slice(desde).filter(function(m){return _reembEsAdel(m);});
    return {saldo:run, n:ab.length, antiguo:ab.length?ab[0].fecha:null};
  }
  function nMovKpis(){
    var el=document.getElementById('movCards'); if(!el) return;
    /* arriba del todo, como en el boceto (antes vivía dentro del bloque de la lista) */
    var v=document.getElementById('view-movimientos'), h=v&&v.querySelector('.vhero');
    if(h&&el.previousElementSibling!==h){ h.insertAdjacentElement('afterend',el); el.style.margin=''; }
    var ids=window._mvKpiIds||[]; var byId={}; (DB.movimientos||[]).forEach(function(m){byId[m.id]=m;});
    var list=ids.map(function(id){return byId[id];}).filter(Boolean);
    var s=_sumBudget(list), ing=s.ing, gas=s.gas, neto=ing-gas;
    var nTot=list.length, nOK=list.filter(function(m){return m.conc;}).length, nW=list.filter(function(m){return m.concW;}).length;
    var pOK=nTot?Math.round(nOK/nTot*100):0;
    /* periodo: el de los filtros de fecha */
    var de=(document.getElementById('fltDesde')||{}).value||'', ha=(document.getElementById('fltHasta')||{}).value||'';
    var per= de&&ha&&de.slice(0,7)===ha.slice(0,7) ? new Date(de+'T00:00:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'})
           : (de||ha) ? ((de?d2(de):'…')+' – '+(ha?d2(ha):'hoy')) : 'todo el histórico';
    /* reembolsables */
    var r=reembEstado(), rd=diasDesde(r.antiguo);
    var kR=nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'↩',t:'Reembolsables',pill:r.n?(r.n+' abierto'+(r.n===1?'':'s')):'saldado',pillCls:r.n?'':'up',
      v:fmt(Math.abs(r.saldo)<0.005?0:r.saldo),
      s:Math.abs(r.saldo)<0.005?'todo saldado':('pendiente de que te devuelvan'+(r.antiguo?' · el más antiguo, del <b>'+d2(r.antiguo)+'</b> ('+rd+' días)':'')),
      p:'no cuentan en gastos ni ingresos · pulsa para abrir'});
    /* fondo R4 */
    var e=(typeof r4ExtCalcGuardado==='function')?r4ExtCalcGuardado():null, kF;
    if(e){ var Y=String(new Date().getFullYear()); var aB=e.ventas.filter(function(v){return (v.fecha||'').slice(0,4)===Y;}).reduce(function(a,v){return a+v.bruta;},0);
      kF=nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'🏦',t:'Fondo R4',pill:'▲ +'+fmt(e.bruta),pillCls:'up',v:fmt(e.valor),
        s:'valor del fondo al <b>'+d2(e.hasta)+'</b> (último extracto) · ganado <b class="n-pos">+'+fmt(e.bruta)+'</b>'+(e.pctAnual!=null?' · a un ritmo del <b>'+e.pctAnual.toFixed(2).replace('.',',')+' %</b> anual':''),
        p:'realizado en '+Y+': '+(aB>=0?'+':'')+fmt(aB)+' · pulsa para abrir'});
    } else kF=nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'🏦',t:'Fondo R4',v:'—',s:'sin extracto de R4 guardado',p:'pulsa para abrir'});
    var kC=nKpi({c:'#2563EB',bg:'#EAF1FD',ic:'✓',t:'Conciliación bancaria',pill:nW?(nW+' ⚠'):(pOK===100?'✓ al día':''),pillCls:nW?'dn':(pOK===100?'up':''),
      v:nOK+' <span style="font-size:15px;color:#5B6B7C;font-weight:600">de '+nTot+' comprobados</span>',
      s:'<b>'+pOK+' %</b> cuadra con el extracto · '+(nTot-nOK)+' por comprobar'+(nW?(' · '+nW+' discrepancia'+(nW===1?'':'s')):'')+
        '<span style="display:block;height:6px;border-radius:99px;background:#EEF1F5;margin-top:6px;overflow:hidden"><i style="display:block;height:100%;width:'+pOK+'%;background:#2563EB"></i></span>',
      p:((typeof movSoloSin!=='undefined'&&movSoloSin)?'mostrando solo sin comprobar · pulsa para verlos todos':'pulsa para ver solo los sin comprobar')});
    var kN=nKpi({c:neto>=0?'#16A34A':'#DC2626',bg:neto>=0?'#DCFCE7':'#FEE2E2',ic:'⚖️',t:'Resultado del periodo',pill:per,
      v:(neto>=0?'+':'')+fmt(neto),vCls:neto>=0?'n-pos':'n-neg',s:'ingresos <b>'+fmt(ing)+'</b> · gastos <b>'+fmt(gas)+'</b>',p:'sigue a los filtros: cambia fechas o categoría y se recalcula'});
    el.className='n-ctrl n-mov';
    el.innerHTML='<div data-nk="r">'+kR+'</div><div data-nk="f">'+kF+'</div><div data-nk="c" id="movConcK">'+kC+'</div><div>'+kN+'</div>';
  }
  if(typeof renderMovs==='function'){ var o=renderMovs; renderMovs=function(){ o.apply(this,arguments); try{ nMovKpis(); }catch(e){ console.error('n-mov',e); } }; }
  if(typeof _mvRefreshKPI==='function'){ _mvRefreshKPI=function(){ try{ nMovKpis(); }catch(e){} }; }
  document.addEventListener('click',function(ev){
    var k=ev.target.closest&&ev.target.closest('#movCards [data-nk]'); if(!k) return;
    var w=k.getAttribute('data-nk');
    if(w==='r') activarVista('amalia'); else if(w==='f') activarVista('fondor4');
    else if(w==='c'){ var b=document.getElementById('fltSoloSin'); if(b) b.click(); }
  });
})();
