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

  function _iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function _nPerModo(de,ha){
    if(!de&&!ha) return 'todo';
    if(de&&ha&&de.slice(5)==='01-01'&&ha.slice(5)==='12-31'&&de.slice(0,4)===ha.slice(0,4)) return 'anio';
    if(de&&ha&&de.slice(8)==='01'&&de.slice(0,7)===ha.slice(0,7)){ var f=new Date(+de.slice(0,4),+de.slice(5,7),0); if(_iso(f)===ha) return 'mes'; }
    return 'otro';
  }
  function _nPerPoner(modo,ref){
    var d=document.getElementById('fltDesde'), h=document.getElementById('fltHasta'); if(!d||!h) return;
    var r=ref||new Date();
    if(modo==='mes'){ d.value=_iso(new Date(r.getFullYear(),r.getMonth(),1)); h.value=_iso(new Date(r.getFullYear(),r.getMonth()+1,0)); }
    else if(modo==='anio'){ d.value=r.getFullYear()+'-01-01'; h.value=r.getFullYear()+'-12-31'; }
    else { d.value=''; h.value=''; }
    renderMovs();
  }
  document.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('#movCards [data-nper] button'); if(!b) return; ev.stopPropagation();
    var de=(document.getElementById('fltDesde')||{}).value||'', ha=(document.getElementById('fltHasta')||{}).value||'', md=_nPerModo(de,ha);
    if(b.dataset.pm){ var ref=de?new Date(de+'T00:00:00'):new Date(); if(b.dataset.pm==='mes'&&md==='anio') ref=new Date(); _nPerPoner(b.dataset.pm, b.dataset.pm==='todo'?null:ref); return; }
    var k=+b.dataset.ps, r=new Date(de+'T00:00:00');
    if(md==='mes') _nPerPoner('mes',new Date(r.getFullYear(),r.getMonth()+k,1));
    else if(md==='anio') _nPerPoner('anio',new Date(r.getFullYear()+k,0,1));
  },true);
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
    var per= _nPerModo(de,ha)==='anio' ? de.slice(0,4) : de&&ha&&de.slice(0,7)===ha.slice(0,7) ? new Date(de+'T00:00:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'})
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
    per=per.charAt(0).toUpperCase()+per.slice(1); var md=_nPerModo(de,ha);
    var perSel='<div class="n-per" data-nper="1"><div class="n-seg">'+['mes','anio','todo'].map(function(m){return '<button data-pm="'+m+'"'+(md===m?' class="on"':'')+'>'+({mes:'Mes',anio:'Año',todo:'Todo'})[m]+'</button>';}).join('')+'</div>'+
      (md==='mes'||md==='anio'?'<div class="n-step"><button data-ps="-1">‹</button><b>'+per+'</b><button data-ps="1">›</button></div>':'')+'</div>';
    var kN=nKpi({c:neto>=0?'#16A34A':'#DC2626',bg:neto>=0?'#DCFCE7':'#FEE2E2',ic:'⚖️',t:'Resultado del periodo',
      v:(neto>=0?'+':'')+fmt(neto),vCls:neto>=0?'n-pos':'n-neg',s:'ingresos <b>'+fmt(ing)+'</b> · gastos <b>'+fmt(gas)+'</b>',p:perSel+'también sigue a los filtros de categoría, comercio y texto'});
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
