/* APP NUEVA · FASE 3 · COMISIONES SEGÚN BRÓKER Y VENTA DE DERECHOS (31-oct-2026, con las hojas oficiales que pasó Carlos)
   1. GASTOS DE COMPRA/VENTA propuestos según el bróker de la operación (siguen siendo PROPUESTA: lo que manda es la casilla).
      Gastos = comisión del bróker + canon de bolsa (1 €) + impuesto de transacciones 0,2 % (solo compras, y solo empresas
      de más de 1.000 M€ de capitalización según fundamentales.json; si no se sabe, se aplica).
        · Renta 4 (hoja 1/7/26): 4 € hasta 6.000 €, 9 € hasta 50.000 €, 0,10 % por encima.
        · ING (tarifa base): 3 € + 0,10 %, máximo 20 €.
        · Santander: sin tarifa conocida → la de Ajustes de siempre.
      Comprobado con sus compras: VID 105 × 88,27 → 28,59 € (propuesta 28,54); NTGY 525 × 26,87 → 38,25 € (propuesta 38,21).
   2. COBRO DE DIVIDENDOS: neto = bruto − 19 % − comisión de cobro del bróker de cada lote.
        · Renta 4: 0,075 % del bruto, mínimo 0,09 €, + IVA 21 %.   · ING y Santander: 0 €.
   3. VENTA DE DERECHOS (tercera opción del 💶 del Kanban): ganancia patrimonial con retención, NO dividendo.
      Se guarda en DB.ventaDerechos {id,fecha,ticker,derechos,importe,retencion,neto,broker} y entra en la caja bróker el neto. */
(function(){
  if(window._ncom) return; window._ncom=true;
  var ITF=0.002, CANON=1, IVA=0.21;
  function capDe(t){ try{ var f=(typeof _radFundCache!=='undefined'&&_radFundCache&&_radFundCache.empresas)||[]; t=(t||'').toUpperCase();
    for(var i=0;i<f.length;i++){ var x=f[i], k=((x.ticker||x.symbol||'')+'').toUpperCase().replace('.MC',''); if(k===t) return num(x.marketCap)||null; } }catch(e){} return null; }
  function itfAplica(t){ var c=capDe(t); return c==null?true:c>=1e9; }
  function brokerFee(br,imp){
    if(br==='Renta 4') return imp<=6000?4:(imp<=50000?9:imp*0.001);
    if(br==='ING') return Math.min(20,3+imp*0.001);
    return null; }
  window.nGastosOperacion=function(imp,br,tipo,t){ imp=num(imp); if(!(imp>0)) return 0;
    var f=brokerFee(br,imp);
    if(f==null){ var T=comisionTarifa(); f=Math.max(T.min,imp*T.pct/100)+T.fijo; return Math.round(f*100)/100; }   /* bróker sin tarifa: la de Ajustes, como siempre */
    var g=f+CANON+((tipo!=='venta'&&itfAplica(t))?imp*ITF:0);
    return Math.round(g*100)/100; };

  /* contexto de la propuesta: el formulario que esté abierto */
  function ctx(){
    var bs=document.getElementById('emcBrk');
    if(bs&&bs.offsetParent!==null) return {br:bs.value,tipo:'compra',t:(document.getElementById('emcBrk').dataset.tk||'')};
    var t=(typeof invOpsTicker!=='undefined'&&invOpsTicker)||'', car=(typeof invOpsCartera!=='undefined'&&invOpsCartera)||'Propia';
    var tp=((document.getElementById('opTipo')||{}).value)||'compra';
    if(t) return {br:(typeof khBrokerRegla==='function'?khBrokerRegla(t,car):'Renta 4'),tipo:tp,t:t};
    var nt=((document.getElementById('invTicker')||{}).value||'').trim().toUpperCase(), nc=((document.getElementById('invCart')||{}).value||'').trim()||'Propia';
    return {br:(typeof khBrokerRegla==='function'?khBrokerRegla(nt,nc):'Renta 4'),tipo:'compra',t:nt};
  }
  if(typeof comisionSugerida==='function'){ comisionSugerida=function(importe){ var c=ctx(); return nGastosOperacion(importe,c.br,c.tipo,c.t); }; }
  /* en el Kanban: cambiar el bróker vuelve a proponer los gastos */
  document.addEventListener('change',function(e){ if(e.target&&e.target.id==='emcBrk'&&typeof _emCompraCalc==='function') _emCompraCalc(); if(e.target&&e.target.id==='emcCart'&&typeof _emCompraCalc==='function') setTimeout(_emCompraCalc,0); },true);
  if(typeof _emCompraForm==='function'){ var oF=_emCompraForm; _emCompraForm=function(t){ var r=oF.apply(this,arguments);
    var bs=document.getElementById('emcBrk'); if(bs) bs.dataset.tk=(t||'').toUpperCase(); if(typeof _emCompraCalc==='function') _emCompraCalc(); return r; }; }

  /* ---------- 2. comisión de cobro del dividendo ---------- */
  function feeCobro(br,bruto){ if(br!=='Renta 4'||!(bruto>0)) return 0; return Math.max(0.09,bruto*0.00075)*(1+IVA); }
  /* reparto de las acciones del ticker por bróker (lotes abiertos por FIFO) */
  function porBroker(t){ var m={}, tot=0; t=(t||'').toUpperCase();
    try{ nFifo().open.forEach(function(l){ if(l.ticker!==t) return; var b=l.broker||(typeof khBrokerRegla==='function'?khBrokerRegla(t,l.cartera):'Renta 4'); m[b]=(m[b]||0)+l.acc; tot+=l.acc; }); }catch(e){}
    return {m:m,tot:tot}; }
  window.nComisionCobro=function(t,bruto){ var P=porBroker(t), s=0, det=[];
    if(!(P.tot>0)) return {fee:0,det:''};
    Object.keys(P.m).forEach(function(b){ var bb=bruto*P.m[b]/P.tot, f=feeCobro(b,bb); s+=f; if(f>0) det.push(b+' '+f.toFixed(2).replace('.',',')+' €'); });
    return {fee:Math.round(s*100)/100, det:det.join(' · ')}; };
  function curT(){ var h=document.querySelector('#emModal b, .em-modal b'); var m=h&&/·\s*([A-Z0-9.]+)/.exec(h.textContent||''); return m?m[1]:(window._ncomT||''); }
  if(typeof _emDivCalc==='function'){ _emDivCalc=function(){ var b=_emNum((document.getElementById('emdBruto')||{}).value), n=document.getElementById('emdNeto');
    var c=nComisionCobro(window._ncomT||curT(), b); if(n) n.value=(b>0?(Math.round((b*0.81-c.fee)*100)/100):'');
    var nt=document.getElementById('emdCom'); if(nt) nt.textContent=c.fee>0?('Incluye comisión de cobro '+c.det+' (IVA incluido).'):'Sin comisión de cobro (bróker sin comisión).'; }; }

  /* ---------- 3. venta de derechos: tercera opción del 💶 ---------- */
  if(typeof _emDivForm==='function'){ var oD=_emDivForm; _emDivForm=function(t){ window._ncomT=(t||'').toUpperCase(); var r=oD.apply(this,arguments);
    try{
      var ef=document.getElementById('emdEfec'); if(ef&&!document.getElementById('emdCom')){ var d=document.createElement('div'); d.id='emdCom'; d.style.cssText='font-size:11px;color:#64748b;margin-top:3px'; ef.appendChild(d); }
      var rad=document.querySelector('input[name=emdivt]'); var fila=rad&&rad.closest('label')&&rad.closest('label').parentNode;
      if(fila&&!fila.querySelector('input[value=derechos]')){ var l=document.createElement('label'); l.style.cssText='flex:1;font-size:12px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;cursor:pointer';
        l.innerHTML='<input type="radio" name="emdivt" value="derechos" onclick="_emDivToggle()"> Venta de derechos'; fila.appendChild(l); }
      var sc=document.getElementById('emdScrip'); if(sc&&!document.getElementById('emdDer')){ var z=document.createElement('div'); z.id='emdDer'; z.style.display='none';
        var st='width:100%;padding:6px;border:1px solid var(--line);border-radius:8px;margin-top:3px';
        z.innerHTML='<div style="display:flex;gap:10px"><label style="flex:1;font-size:12px;color:#475569">Derechos vendidos<input type="number" id="emdDerN" step="1" min="0" style="'+st+'"></label>'+
          '<label style="flex:1;font-size:12px;color:#475569">Importe abonado (€)<input type="number" id="emdDerImp" step="0.01" min="0" style="'+st+'" oninput="_ncomDerCalc()"></label></div>'+
          '<div style="display:flex;gap:10px;margin-top:6px"><label style="flex:1;font-size:12px;color:#475569">Retención (€)<input type="number" id="emdDerRet" step="0.01" min="0" style="'+st+'"></label>'+
          '<label style="flex:1;font-size:12px;color:#475569">Bróker<select id="emdDerBr" style="'+st+'"><option>Renta 4</option><option>ING</option><option>Santander</option></select></label></div>'+
          '<div style="font-size:11px;color:#94a3b8;margin-top:3px">El <b>importe abonado</b> es lo que pone el extracto (ya sin gastos). La retención es el 19 % de ese importe. Es una <b>ganancia patrimonial</b>, no un dividendo: entra en caja el neto y cuenta como renta de esta empresa.</div>';
        sc.parentNode.insertBefore(z,sc.nextSibling);
        var P=porBroker(t), bm=Object.keys(P.m).sort(function(a,b){return P.m[b]-P.m[a];})[0]; if(bm) document.getElementById('emdDerBr').value=bm; }
      _emDivCalc();
    }catch(e){ console.warn('[comisiones] div form',e); }
    return r; }; }
  window._ncomDerCalc=function(){ var i=_emNum((document.getElementById('emdDerImp')||{}).value), r=document.getElementById('emdDerRet'); if(r&&!r.dataset.tocado) r.value=i>0?(Math.round(i*0.19*100)/100):''; };
  document.addEventListener('input',function(e){ if(e.target&&e.target.id==='emdDerRet') e.target.dataset.tocado='1'; },true);
  if(typeof _emDivToggle==='function'){ var oT=_emDivToggle; _emDivToggle=function(){ var r=oT.apply(this,arguments);
    var s=(document.querySelector('input[name=emdivt]:checked')||{}).value, z=document.getElementById('emdDer');
    if(z){ z.style.display=(s==='derechos')?'block':'none'; if(s==='derechos'){ var ef=document.getElementById('emdEfec'), sc=document.getElementById('emdScrip'); if(ef)ef.style.display='none'; if(sc)sc.style.display='none'; } }
    return r; }; }
  if(typeof _emDivDo==='function'){ var oDo=_emDivDo; _emDivDo=function(t){
    var s=(document.querySelector('input[name=emdivt]:checked')||{}).value;
    if(s!=='derechos') return oDo.apply(this,arguments);
    t=(t||'').toUpperCase();
    var fecha=(document.getElementById('emdFecha')||{}).value||new Date().toISOString().slice(0,10);
    var n=_emNum((document.getElementById('emdDerN')||{}).value), imp=_emNum((document.getElementById('emdDerImp')||{}).value), ret=_emNum((document.getElementById('emdDerRet')||{}).value);
    var br=(document.getElementById('emdDerBr')||{}).value||'';
    if(!(imp>0)){ alert('Indica el importe abonado (> 0).'); return; }
    if(ret<0||ret>imp){ alert('La retención no cuadra con el importe.'); return; }
    var neto=Math.round((imp-ret)*100)/100;
    if(!confirm('¿Anotar venta de '+(n||'?')+' derechos de '+t+'?\n\n  abonado   '+_emEur(imp)+'\n  retención '+_emEur(ret)+'\n  a caja    '+_emEur(neto)+'\n\nCuenta como ganancia patrimonial y como renta de '+t+', no como dividendo.')) return;
    var id='vd'+Math.random().toString(36).slice(2,9);
    DB.ventaDerechos=DB.ventaDerechos||[]; DB.ventaDerechos.push({id:id,fecha:fecha,ticker:t,derechos:n||null,importe:imp,retencion:ret,neto:neto,broker:br});
    DB.cajaMov=DB.cajaMov||[]; DB.cajaMov.push({id:'c'+Math.random().toString(36).slice(2,9),fecha:fecha,concepto:'Venta '+(n?n+' ':'')+'derechos '+t,entra:neto,sale:0,ventaDerechos:id});
    if(typeof _emModalClose==='function') _emModalClose();
    if(typeof showToast==='function') showToast('Venta de derechos anotada: '+t+' ('+_emEur(neto)+' a caja)');
    if(typeof saveNow==='function') saveNow(); if(typeof renderAll==='function') renderAll(); }; }
  /* renta por empresa de las ventas de derechos (para Rentabilidad y la ficha) */
  window.nDerechosDe=function(t){ t=(t||'').toUpperCase(); return (DB.ventaDerechos||[]).filter(function(v){ return (v.ticker||'').toUpperCase()===t; }); };
})();
