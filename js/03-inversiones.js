let invOpsTicker=null, invOpsCartera=null, invCartFiltro='Todas', opEditId=null;
function invByFecha(a,b){ return (a.fecha||'')<(b.fecha||'')?-1:(a.fecha||'')>(b.fecha||'')?1:0; }
function invCarteras(){ const s=new Set(['Propia']); (DB.operaciones||[]).forEach(o=>s.add(o.cartera||'Propia')); return [...s]; }
function invPositions(){
  const map={};
  (DB.operaciones||[]).slice().sort(invByFecha).forEach(o=>{
    const t=(o.ticker||'').toUpperCase(); if(!t)return; const car=o.cartera||'Propia'; const k=car+'|'+t;
    const m=map[k]=map[k]||{cartera:car,ticker:t,acc:0,cost:0};
    const n=num(o.acciones), pr=num(o.precio);
    if(o.tipo==='venta'){ const avg=m.acc?m.cost/m.acc:0; m.acc-=n; if(m.acc<0)m.acc=0; m.cost=m.acc*avg; }
    else { m.acc+=n; m.cost+=n*pr; }
  });
  const out=[]; Object.keys(map).forEach(k=>{ const m=map[k]; const v=(DB.valores&&DB.valores[m.ticker])||{};
    out.push({cartera:m.cartera,ticker:m.ticker,nombre:v.nombre||m.ticker,acciones:m.acc,precioCompra:m.acc?m.cost/m.acc:0,precioActual:num(v.precioActual),precioFecha:v.precioFecha||'',divAccion:num(v.divAccion),broker:v.broker||''});
  });
  return out;
}
function setInvStatus(t){ const e=$('#invStatus'); if(e)e.textContent=t; }
function _daysBetween(a,b){ if(!a||!b)return null; var da=Date.parse(a+'T00:00:00'), db=Date.parse(b+'T00:00:00'); if(isNaN(da)||isNaN(db))return null; return Math.round((da-db)/86400000); }
function precioFreshColor(pf,ref){ if(!pf)return '#dc2626'; var d=_daysBetween(ref,pf); if(d==null)return '#dc2626'; if(d<=0)return '#16a34a'; if(d<=4)return '#d97706'; return '#dc2626'; }
function _posDivCobrado(divArr,sinceFecha,acc){ let s=0; (divArr||[]).forEach(d=>{ if((d.fecha||'')>=(sinceFecha||'')) s+=acc*num(d.importe); }); return s; }
function _posYears(desde,hasta){ const d=_daysBetween(hasta,desde); if(d==null) return 0; return Math.max(0, d/365.25); }
function posLots(){
  const lots=[]; const hoy=new Date().toISOString().slice(0,10);
  // tickers actualmente en cartera (posición neta > 0)
  const openT=new Set(invPositions().filter(p=>p.acciones>0.0001).map(p=>p.ticker));
  // --- lotes abiertos (cada compra de un ticker aún en cartera) ---
  (DB.operaciones||[]).forEach(o=>{
    if(o.tipo==='venta') return; const t=(o.ticker||'').toUpperCase(); if(!openT.has(t)) return;
    const v=(DB.valores&&DB.valores[t])||{}; const acc=num(o.acciones); if(acc<=0) return;
    lots.push({fecha:o.fecha||'',ticker:t,nombre:v.nombre||t,cartera:o.cartera||'Propia',acc,pc:num(o.precio),pa:num(v.precioActual),
      div:_posDivCobrado((DB.dividendos||{})[t],o.fecha,acc),years:_posYears(o.fecha,hoy),estado:'Cartera',fechaFin:hoy});
  });
  // --- lotes cerrados: archivados (DB.cerradas) ---
  const archT=new Set();
  (DB.cerradas||[]).forEach(c=>{
    const t=(c.ticker||'').toUpperCase(); archT.add(t);
    const ops=(c.ops||[]); const buys=ops.filter(o=>o.tipo!=='venta'), sells=ops.filter(o=>o.tipo==='venta');
    const sAcc=sells.reduce((s,o)=>s+num(o.acciones),0), sVal=sells.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0);
    const pv=sAcc?sVal/sAcc:0; const fVenta=sells.map(o=>o.fecha).filter(Boolean).sort().slice(-1)[0]||'';
    buys.forEach(o=>{ const acc=num(o.acciones); if(acc<=0)return;
      lots.push({fecha:o.fecha||'',ticker:t,nombre:c.nombre||t,cartera:c.cartera||'Propia',acc,pc:num(o.precio),pa:pv,
        div:_posDivCobrado(c.divs,o.fecha,acc),years:_posYears(o.fecha,fVenta),estado:'Vendida',fechaFin:fVenta}); });
  });
  // --- lotes cerrados: calculados (ticker vendido del todo en DB.operaciones, no archivado, no en cartera) ---
  const opsAll=DB.operaciones||[];
  [...new Set(opsAll.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean))].forEach(t=>{
    if(openT.has(t)||archT.has(t)) return;
    const tops=opsAll.filter(o=>(o.ticker||'').toUpperCase()===t);
    const buys=tops.filter(o=>o.tipo!=='venta'), sells=tops.filter(o=>o.tipo==='venta');
    const bAcc=buys.reduce((s,o)=>s+num(o.acciones),0), sAcc=sells.reduce((s,o)=>s+num(o.acciones),0);
    if(!(sAcc>0.0001 && Math.abs(bAcc-sAcc)<0.0001)) return; // solo cerradas completas
    const sVal=sells.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0); const pv=sAcc?sVal/sAcc:0;
    const fVenta=sells.map(o=>o.fecha).filter(Boolean).sort().slice(-1)[0]||'';
    const v=(DB.valores&&DB.valores[t])||{};
    buys.forEach(o=>{ const acc=num(o.acciones); if(acc<=0)return;
      lots.push({fecha:o.fecha||'',ticker:t,nombre:v.nombre||t,cartera:o.cartera||'Propia',acc,pc:num(o.precio),pa:pv,
        div:_posDivCobrado((DB.dividendos||{})[t],o.fecha,acc),years:_posYears(o.fecha,fVenta),estado:'Vendida',fechaFin:fVenta}); });
  });
  return lots;
}
function renderPOS(){
  const el=$('#posTable'); if(!el) return;
  let lots=posLots();
  const filt=($('#posFiltro')||{}).value||'todas';
  // métricas por lote
  lots.forEach(l=>{ l.vc=l.acc*l.pc; l.va=l.acc*l.pa; l.pl=l.va-l.vc;
    l.cotPct=l.vc?l.pl/l.vc:0; l.divPct=l.vc?l.div/l.vc:0;
    l.cotYr=l.years>0?l.cotPct/l.years:l.cotPct; l.divYr=l.years>0?l.divPct/l.years:l.divPct; l.totYr=l.cotYr+l.divYr; });
  const g={fecha:l=>l.fecha,ticker:l=>l.ticker,acc:l=>l.acc,pc:l=>l.pc,pa:l=>l.pa,vc:l=>l.vc,va:l=>l.va,pl:l=>l.pl,cotpct:l=>l.cotPct,div:l=>l.div,years:l=>l.years,cotyr:l=>l.cotYr,divyr:l=>l.divYr,totyr:l=>l.totYr,estado:l=>l.estado};
  const ord=(($('#posOrden')||{}).value||'fecha_desc');
  const sortLots=arr=> (_sort['pos']&&_sort['pos'].k)?sortApply('pos',arr,g):arr.slice().sort((a,b)=> ord==='fecha_asc'?((a.fecha<b.fecha)?-1:1):((a.fecha>b.fecha)?-1:1));
  const pc2=x=>(x>=0?'+':'')+(x*100).toFixed(1)+'%';
  const _sh=(k,l,cls)=>`<th class="${cls===undefined?'num':cls}" data-sorttbl="pos" data-sortk="${k}" style="cursor:pointer" title="Ordenar">${l}${sortArrow('pos',k)}</th>`;
  const head='<tr>'+_sh('fecha','Fecha','')+_sh('ticker','Empresa','')+_sh('acc','Acc.')+_sh('pc','P.compra')+_sh('pa','P.actual')+_sh('vc','Valor compra')+_sh('va','Valor actual')+_sh('pl','Plusvalía')+_sh('cotpct','Δ% cotiz')+_sh('div','Div cobrado')+_sh('years','Años')+_sh('cotyr','%Cotiz/año')+_sh('divyr','%Div/año')+_sh('totyr','%Total/año')+'</tr>';
  /* KPIs (sobre los lotes en cartera) */
  const _cart=lots.filter(l=>l.estado==='Cartera'); const kVC=_cart.reduce((s,l)=>s+l.vc,0),kVA=_cart.reduce((s,l)=>s+l.va,0),kPL=_cart.reduce((s,l)=>s+l.pl,0),kDIV=_cart.reduce((s,l)=>s+l.div,0);
  const kPLpct=kVC?kPL/kVC:0, kTot=kVC?(kPL+kDIV)/kVC:0;
  const kp=$('#posKpis'); if(kp)kp.innerHTML='<div class="pos-kpis">'
    +`<div class="k hero"><div class="l">Valor en cartera</div><div class="v">${fmt(kVA)}</div><div class="p">${_cart.length} lotes · coste ${fmt(kVC)}</div></div>`
    +`<div class="k"><div class="l">Plusvalía</div><div class="v ${kPL>=0?'pos':'neg'}">${kPL>=0?'+':''}${fmt(kPL)}</div><div class="p">${pc2(kPLpct)} sobre coste</div></div>`
    +`<div class="k"><div class="l">Dividendo cobrado</div><div class="v">${fmt(kDIV)}</div><div class="p">${kVC?(kDIV/kVC*100).toFixed(0)+'% acumulado':''}</div></div>`
    +`<div class="k"><div class="l">Retorno total</div><div class="v ${kTot>=0?'pos':'neg'}">${pc2(kTot)}</div><div class="p">plusvalía + dividendo</div></div>`
    +'</div>';
  window._posOpen=window._posOpen||{Cartera:true,Vendida:false};
  function seccion(titulo,arr,estadoKey){
    if(!arr.length) return '';
    arr=sortLots(arr);
    let sVC=0,sVA=0,sPL=0,sDIV=0;
    const rows=arr.map(l=>{ sVC+=l.vc; sVA+=l.va; sPL+=l.pl; sDIV+=l.div;
      return `<tr><td class="l" style="white-space:nowrap">${ddmmyyyy(l.fecha)}</td>`+
        `<td class="l" style="white-space:nowrap"><b class="pos-tk" data-ficha="${l.ticker}" style="cursor:pointer">${l.ticker}</b> <span class="pos-nm">${l.cartera}</span></td>`+
        `<td class="num">${l.acc}</td><td class="num">${fmt(l.pc)}</td><td class="num">${fmt(l.pa)}</td>`+
        `<td class="num">${fmt(l.vc)}</td><td class="num">${fmt(l.va)}</td>`+
        `<td class="num ${l.pl>=0?'pos':'neg'}">${l.pl>=0?'+':''}${fmt(l.pl)}</td>`+
        `<td class="num ${l.cotPct>=0?'pos':'neg'}">${pc2(l.cotPct)}</td>`+
        `<td class="num pos">${fmt(l.div)}</td><td class="num">${l.years.toFixed(1)}</td>`+
        `<td class="num ${l.cotYr>=0?'pos':'neg'}">${pc2(l.cotYr)}</td>`+
        `<td class="num pos">${pc2(l.divYr)}</td>`+
        `<td class="num ${l.totYr>=0?'pos':'neg'}"><b>${pc2(l.totYr)}</b></td></tr>`;
    }).join('');
    const totCot=sVC?sPL/sVC:0, totDiv=sVC?sDIV/sVC:0;
    const sub=`<tr class="pos-tot"><td class="l">TOTAL</td><td class="l pos-nm">${arr.length} lotes</td><td></td><td></td><td></td><td class="num">${fmt(sVC)}</td><td class="num">${fmt(sVA)}</td><td class="num ${sPL>=0?'pos':'neg'}">${sPL>=0?'+':''}${fmt(sPL)}</td><td class="num ${totCot>=0?'pos':'neg'}">${pc2(totCot)}</td><td class="num pos">${fmt(sDIV)}</td><td></td><td></td><td class="num pos">${pc2(totDiv)}</td><td></td></tr>`;
    /* móvil: tarjeta por lote */
    const mcards=arr.map(l=>`<div class="lcard"><div class="lc-h"><div class="tk" data-ficha="${l.ticker}" style="cursor:pointer">${l.ticker} <span class="nm">${l.cartera} · ${ddmmyyyy(l.fecha)}</span></div><div class="ty ${l.totYr>=0?'g':'r'}">${pc2(l.totYr)}<span>total/año</span></div></div><div class="lc-row"><span class="pl ${l.pl>=0?'pos':'neg'}">${l.pl>=0?'+':''}${fmt(l.pl)}</span> <span class="muted">plusvalía</span> · <b>${fmt(l.va)}</b> <span class="muted">valor</span></div><div class="lg"><div class="m"><span>Acc.</span><b>${l.acc}</b></div><div class="m"><span>P.compra→actual</span><b>${fmt(l.pc)}→${fmt(l.pa)}</b></div><div class="m"><span>Δ% cotiz</span><b class="${l.cotPct>=0?'pos':'neg'}">${pc2(l.cotPct)}</b></div><div class="m"><span>Div cobrado</span><b class="pos">${fmt(l.div)}</b></div><div class="m"><span>%Cotiz/año</span><b class="${l.cotYr>=0?'pos':'neg'}">${pc2(l.cotYr)}</b></div><div class="m"><span>%Div/año</span><b class="pos">${pc2(l.divYr)}</b></div></div></div>`).join('');
    const op=window._posOpen[estadoKey]?' open':'';
    return `<div class="pos-blk${op}" data-posblk="${estadoKey}"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">${titulo}</span><span class="bsum">${arr.length} lotes · valor ${fmt(sVA)} · plusvalía <b class="${sPL>=0?'pos':'neg'}">${sPL>=0?'+':''}${fmt(sPL)}</b></span></div><div class="pos-blk-b"><div class="pos-desk"><div class="ptable"><table><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div></div><div class="pos-mob">${mcards}</div></div></div>`;
  }
  let html='';
  if(filt!=='vendida') html+=seccion('🟢 En cartera',lots.filter(l=>l.estado==='Cartera'),'Cartera');
  if(filt!=='cartera') html+=seccion('⚪ Vendidas',lots.filter(l=>l.estado==='Vendida'),'Vendida');
  el.innerHTML= html || '<div class="empty">Sin lotes para mostrar.</div>';
  if(!el._posBlkBound){ el._posBlkBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],[data-sorttbl]'))return; var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-posblk'); if(k){window._posOpen=window._posOpen||{};window._posOpen[k]=b.classList.contains('open');} } }); }
}
/* Detalle por lote al final de «Cartera» (funde la antigua pestaña «Posiciones»): todas las
   posiciones ordenadas cronológicamente, con años y rentabilidad/año. Fuente: posLots(). */
function renderInvLotes(){
  const el=$('#invLotes'); if(!el) return;
  let lots=posLots();
  lots.forEach(l=>{ l.vc=l.acc*l.pc; l.va=l.acc*l.pa; l.pl=l.va-l.vc; l.cotPct=l.vc?l.pl/l.vc:0; l.divPct=l.vc?l.div/l.vc:0; l.cotYr=l.years>0?l.cotPct/l.years:l.cotPct; l.divYr=l.years>0?l.divPct/l.years:l.divPct; l.totYr=l.cotYr+l.divYr; });
  const pc2=x=>(x>=0?'+':'')+(x*100).toFixed(1)+'%';
  const head='<tr><th class="l">Fecha</th><th class="l">Empresa</th><th>Acc.</th><th>Valor</th><th>Plusvalía</th><th>Años</th><th>Total/año</th></tr>';
  window._invLotesOpen=window._invLotesOpen||{Cartera:true,Vendida:false};
  function seccion(titulo,arr,estadoKey){
    if(!arr.length) return '';
    arr=arr.slice().sort((a,b)=> (a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0)) ); // cronológico (antigua→reciente)
    let sVC=0,sVA=0,sPL=0,sDIV=0;
    const rows=arr.map(l=>{ sVC+=l.vc; sVA+=l.va; sPL+=l.pl; sDIV+=l.div;
      const totCls=l.totYr>=0?'g':'r';
      return `<tr class="mt-row"><td class="l" style="white-space:nowrap">${ddmmyyyy(l.fecha)}</td>`+
        `<td class="emp"><span class="mt-arw">▶</span><b class="pos-tk" data-ficha="${l.ticker}" style="cursor:pointer;color:var(--brand)">${l.ticker}</b> <span style="font-weight:600;color:#64748b;font-size:11px">${l.cartera}</span></td>`+
        `<td>${l.acc}</td>`+
        `<td><b>${fmt(l.va)}</b></td>`+
        `<td><span class="${l.pl>=0?'mt-pos':'mt-neg'}" style="font-weight:700">${l.pl>=0?'+':''}${fmt(l.pl)}</span></td>`+
        `<td>${l.years.toFixed(1)}</td>`+
        `<td><span class="mt-pill ${totCls}">${pc2(l.totYr)}</span></td></tr>`+
        `<tr class="mt-det"><td colspan="7"><div class="mt-nums">${_mtNum('P. compra',fmt(l.pc))}${_mtNum('P. actual',fmt(l.pa))}${_mtNum('Valor compra',fmt(l.vc))}${_mtNum('Δ% cotiz',pc2(l.cotPct),l.cotPct>=0?'mt-pos':'mt-neg')}${_mtNum('Div cobrado',fmt(l.div),'mt-pos')}${_mtNum('%Cotiz/año',pc2(l.cotYr),l.cotYr>=0?'mt-pos':'mt-neg')}${_mtNum('%Div/año',pc2(l.divYr),'mt-pos')}</div></td></tr>`;
    }).join('');
    const totRet=sVC?(sPL+sDIV)/sVC:0;
    const sub=`<tr class="mt-sub"><td class="l">TOTAL · ${arr.length} lotes</td><td></td><td></td><td><b>${fmt(sVA)}</b></td><td class="${sPL>=0?'mt-pos':'mt-neg'}">${sPL>=0?'+':''}${fmt(sPL)}</td><td></td><td><span class="mt-pill ${totRet>=0?'g':'r'}">${pc2(totRet)} tot.</span></td></tr>`;
    const mcards=arr.map(l=>`<div class="lcard"><div class="lc-h"><div class="tk" data-ficha="${l.ticker}" style="cursor:pointer">${l.ticker} <span class="nm">${l.cartera} · ${ddmmyyyy(l.fecha)}</span></div><div class="ty ${l.totYr>=0?'g':'r'}">${pc2(l.totYr)}<span>total/año</span></div></div><div class="lc-row"><span class="pl ${l.pl>=0?'pos':'neg'}">${l.pl>=0?'+':''}${fmt(l.pl)}</span> <span class="muted">plusvalía</span> · <b>${fmt(l.va)}</b> <span class="muted">valor</span></div><div class="lg"><div class="m"><span>Acc.</span><b>${l.acc}</b></div><div class="m"><span>P.compra→actual</span><b>${fmt(l.pc)}→${fmt(l.pa)}</b></div><div class="m"><span>Δ% cotiz</span><b class="${l.cotPct>=0?'pos':'neg'}">${pc2(l.cotPct)}</b></div><div class="m"><span>Div cobrado</span><b class="pos">${fmt(l.div)}</b></div><div class="m"><span>Años</span><b>${l.years.toFixed(1)}</b></div><div class="m"><span>%Div/año</span><b class="pos">${pc2(l.divYr)}</b></div></div></div>`).join('');
    const op=window._invLotesOpen[estadoKey]?' open':'';
    return `<div class="pos-blk${op}" data-invlotesblk="${estadoKey}"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">${titulo}</span><span class="bsum">${arr.length} lotes · valor ${fmt(sVA)} · plusvalía <b class="${sPL>=0?'pos':'neg'}">${sPL>=0?'+':''}${fmt(sPL)}</b></span></div><div class="pos-blk-b"><div class="pos-desk"><div class="mt-wrap"><table class="mt-tbl"><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div></div><div class="pos-mob">${mcards}</div></div></div>`;
  }
  const cartera=lots.filter(l=>l.estado==='Cartera'), vendidas=lots.filter(l=>l.estado==='Vendida');
  let html='<div class="secttl" style="margin:24px 0 8px;font-weight:800;font-size:15px;display:flex;align-items:center;gap:7px">🧾 Detalle por lote <span class="muted" style="font-weight:500;font-size:12px">— cada compra con sus años y rentabilidad/año (antes «Posiciones»)</span></div>';
  html+=seccion('🟢 En cartera',cartera,'Cartera')+seccion('⚪ Vendidas',vendidas,'Vendida');
  if(!cartera.length && !vendidas.length) html+='<div class="empty" style="padding:14px;color:#94a3b8">Sin lotes.</div>';
  el.innerHTML=html;
  if(!el._invLotesBound){ el._invLotesBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],a,button'))return; var rr=e.target.closest('tr.mt-row'); if(rr){ rr.classList.toggle('open'); return; } var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-invlotesblk'); if(k){window._invLotesOpen=window._invLotesOpen||{};window._invLotesOpen[k]=b.classList.contains('open');} } }); }
}
function _mtNum(l,v,cls){ return '<div class="n"><div class="l">'+l+'</div><div class="v '+(cls||'')+'">'+v+'</div></div>'; }
function renderInv(){
  if(!DB.config)DB.config={};
  const all=invPositions().filter(p=>p.acciones>0.0001);
  const _fechas=all.map(p=>p.precioFecha).filter(Boolean).sort();
  const refFecha=_fechas.length?_fechas[_fechas.length-1]:'';
  const fechaBanner=`<div class="muted" style="font-size:12px;margin:2px 0 12px">${refFecha?('Precios al cierre del <b style=\'color:#334155\'>'+ddmmyyyy(refFecha)+'</b>'):'Precios sin fecha de referencia'} · el color de la cotización indica su actualización: <b style="color:#16a34a">al día</b> · <b style="color:#d97706">rezagada</b> · <b style="color:#dc2626">desfasada/sin fecha</b></div>`;
  const carts=[...new Set(['Propia','Compartida',...invCarteras()])];
  const dl=$('#cartList'); if(dl) dl.innerHTML=carts.map(c=>`<option value="${c}">`).join('');
  const valor=all.reduce((s,p)=>s+p.acciones*p.precioActual,0);
  const coste=all.reduce((s,p)=>s+p.acciones*p.precioCompra,0);
  const pl=valor-coste, plpct=coste?pl/coste*100:0;
  const divAnual=all.reduce((s,p)=>s+p.acciones*p.divAccion,0);
  const _pc=x=>(x>=0?'+':'')+x.toFixed(1)+'%';
  $('#invCards').innerHTML='<div class="pos-kpis">'
    +`<div class="k hero"><div class="l">Valor total</div><div class="v">${fmt(valor)}</div><div class="p">${all.length} posiciones · ambas carteras</div></div>`
    +`<div class="k"><div class="l">Coste</div><div class="v">${fmt(coste)}</div><div class="p">invertido total</div></div>`
    +`<div class="k"><div class="l">Plusvalía</div><div class="v ${pl>=0?'pos':'neg'}">${pl>=0?'+':''}${fmt(pl)}</div><div class="p">${_pc(plpct)} sobre coste</div></div>`
    +`<div class="k"><div class="l">Dividendos/año (bruto)</div><div class="v">${fmt(divAnual)}</div><div class="p">${(valor?(divAnual/valor*100).toFixed(1):0)}% RPD media</div></div>`
    +'</div>';
  if(!all.length){ $('#invTable').innerHTML='<div class="empty">Sin posiciones abiertas.</div>'; renderInvClosed(); if(typeof renderInvLotes==='function')renderInvLotes(); if(typeof renderDividendos==='function')renderDividendos(); return; }
  const byCart={}; all.forEach(p=>{(byCart[p.cartera]=byCart[p.cartera]||[]).push(p);});
  const ordered=Object.keys(byCart).sort((a,b)=>a==='Propia'?-1:b==='Propia'?1:a.localeCompare(b));
  const _shc=(k,l,cls)=>`<th class="${cls||''}" data-sorttbl="cartera" data-sortk="${k}" style="cursor:pointer" title="Ordenar">${l}${sortArrow('cartera',k)}</th>`;
  const head='<tr>'+_shc('ticker','Empresa','l')+_shc('acc','Acc.')+_shc('pa','P. actual')+_shc('valor','Valor')+_shc('pl','Plusvalía')+_shc('valor','Peso')+_shc('divano','Div/año')+'<th></th></tr>';
  window._invOpen=window._invOpen||{};
  ordered.forEach((car,i)=>{ if(window._invOpen[car]===undefined) window._invOpen[car]=(i===0); });
  let html='';
  ordered.forEach(car=>{
    const lst=(_sort['cartera']&&_sort['cartera'].k)?sortApply('cartera',byCart[car],{ticker:p=>p.ticker,nombre:p=>p.nombre,acc:p=>p.acciones,pc:p=>p.precioCompra,pa:p=>p.precioActual,valor:p=>p.acciones*p.precioActual,pl:p=>p.acciones*(p.precioActual-p.precioCompra),plpct:p=>{const c=p.acciones*p.precioCompra;return c?(p.acciones*p.precioActual-c)/c:0;},divacc:p=>p.divAccion,divano:p=>p.acciones*p.divAccion,rpd:p=>p.precioActual?p.divAccion/p.precioActual:0,yoc:p=>p.precioCompra?p.divAccion/p.precioCompra:0}):[...byCart[car]].sort((a,b)=>(b.acciones*b.precioActual)-(a.acciones*a.precioActual));
    const sV=lst.reduce((x,p)=>x+p.acciones*p.precioActual,0), sC=lst.reduce((x,p)=>x+p.acciones*p.precioCompra,0), sD=lst.reduce((x,p)=>x+p.acciones*p.divAccion,0), sPL=sV-sC, sPLp=sC?sPL/sC*100:0;
    const rows=lst.map(p=>{
      const v=p.acciones*p.precioActual, c=p.acciones*p.precioCompra, g=v-c, gp=c?g/c*100:0, peso=valor?v/valor*100:0;
      const _du=(typeof dossierURL==='function')?dossierURL(p.ticker,((DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===(p.ticker||'').toUpperCase())||{}).dossierUrl):'';
      const plCls=g>=0?'g':'r';
      return `<tr class="mt-row"><td class="emp"><span class="mt-arw">▶</span><b class="pos-tk" data-ficha="${p.ticker}" style="cursor:pointer;color:var(--brand)">${p.ticker}</b> <span style="font-weight:600;color:#334155;font-size:11.5px">${p.nombre||''}</span></td><td>${p.acciones}</td><td style="color:${precioFreshColor(p.precioFecha,refFecha)};font-weight:600" title="${p.precioFecha?('Cotización del '+ddmmyyyy(p.precioFecha)):'Sin fecha de cotización'}">${fmt(p.precioActual)}</td><td><b>${fmt(v)}</b></td><td><span class="${g>=0?'mt-pos':'mt-neg'}" style="font-weight:700">${g>=0?'+':''}${fmt(g)}</span> <span class="mt-pill ${plCls}">${c?((gp>=0?'+':'')+gp.toFixed(1)+'%'):'—'}</span></td><td>${peso.toFixed(1)}%</td><td class="mt-pos">${fmt(p.acciones*p.divAccion)}</td><td class="c"><button class="btn sm" data-ops-t="${p.ticker}" data-ops-c="${p.cartera}" style="font-size:10px" title="Añadir operación">+ Op.</button>${_du?`<a class="btn ghost sm" href="${_du}" target="_blank" rel="noopener" style="font-size:10px;margin-left:3px" title="Abrir dossier">📄</a>`:''} <button class="btn red sm" data-del-t="${p.ticker}" data-del-c="${p.cartera}" title="Eliminar">✕</button></td></tr><tr class="mt-det"><td colspan="8"><div class="mt-nums">${_mtNum('P. compra',fmt(p.precioCompra))}${_mtNum('Div/acción',fmt(p.divAccion))}${_mtNum('Div/año',fmt(p.acciones*p.divAccion),'mt-pos')}${_mtNum('RPD',p.precioActual?((p.divAccion/p.precioActual)*100).toFixed(2)+'%':'—')}${_mtNum('YoC (yield on cost)',p.precioCompra?((p.divAccion/p.precioCompra)*100).toFixed(2)+'%':'—')}</div></td></tr>`;
    }).join('');
    const sub=`<tr class="mt-sub"><td class="l">SUBTOTAL · ${lst.length} valores</td><td></td><td></td><td><b>${fmt(sV)}</b></td><td class="${sPL>=0?'mt-pos':'mt-neg'}">${sPL>=0?'+':''}${fmt(sPL)} <span style="font-weight:700">(${_pc(sPLp)})</span></td><td>${(valor?sV/valor*100:0).toFixed(1)}%</td><td class="mt-pos">${fmt(sD)}</td><td></td></tr>`;
    // móvil: tarjeta por empresa
    const mcards=lst.map(p=>{ const v=p.acciones*p.precioActual, c=p.acciones*p.precioCompra, g=v-c, gp=c?g/c*100:0, peso=valor?v/valor*100:0;
      const _du=(typeof dossierURL==='function')?dossierURL(p.ticker,((DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===(p.ticker||'').toUpperCase())||{}).dossierUrl):'';
      return `<div class="lcard"><div class="lc-h"><div class="tk" data-ficha="${p.ticker}" style="cursor:pointer">${p.ticker} <span class="nm">${p.nombre||''}</span></div><div class="ty ${g>=0?'g':'r'}">${c?((gp>=0?'+':'')+gp.toFixed(1)+'%'):'—'}<span>plusval.</span></div></div><div class="lc-row"><span class="pl ${g>=0?'pos':'neg'}">${g>=0?'+':''}${fmt(g)}</span> <span class="muted">plusvalía</span> · <b>${fmt(v)}</b> <span class="muted">valor · peso ${peso.toFixed(1)}%</span></div><div class="lg"><div class="m"><span>Acc.</span><b>${p.acciones}</b></div><div class="m"><span>P.compra→actual</span><b>${fmt(p.precioCompra)}→${fmt(p.precioActual)}</b></div><div class="m"><span>Div/año</span><b class="pos">${fmt(p.acciones*p.divAccion)}</b></div><div class="m"><span>RPD</span><b>${p.precioActual?((p.divAccion/p.precioActual)*100).toFixed(2)+'%':'—'}</b></div><div class="m"><span>YoC</span><b>${p.precioCompra?((p.divAccion/p.precioCompra)*100).toFixed(2)+'%':'—'}</b></div><div class="m"><span>Div/acc</span><b>${fmt(p.divAccion)}</b></div></div><div class="lc-act"><button class="btn sm" data-ops-t="${p.ticker}" data-ops-c="${p.cartera}">+ Operación</button>${_du?`<a class="btn ghost sm" href="${_du}" target="_blank" rel="noopener">📄 Dossier</a>`:''}<button class="btn red sm" data-del-t="${p.ticker}" data-del-c="${p.cartera}">✕ Eliminar</button></div></div>`;
    }).join('');
    const op=window._invOpen[car]?' open':'';
    html+=`<div class="pos-blk${op}" data-invblk="${car}"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">Cartera ${car}</span><span class="bsum">${lst.length} valores · valor ${fmt(sV)} · plusvalía <b class="${sPL>=0?'pos':'neg'}">${sPL>=0?'+':''}${fmt(sPL)}</b></span></div><div class="pos-blk-b"><div class="pos-desk"><div class="mt-wrap"><table class="mt-tbl"><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div></div><div class="pos-mob">${mcards}</div></div></div>`;
  });
  const el=$('#invTable');
  el.innerHTML=fechaBanner+html;
  if(!el._invBlkBound){ el._invBlkBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],[data-sorttbl],[data-ops-t],[data-del-t],a,button'))return; var rr=e.target.closest('tr.mt-row'); if(rr){ rr.classList.toggle('open'); return; } var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-invblk'); if(k){window._invOpen=window._invOpen||{};window._invOpen[k]=b.classList.contains('open');} } }); }
  renderInvClosed();
  if(typeof renderInvLotes==='function')renderInvLotes();
  if(typeof renderDividendos==='function')renderDividendos();
}
function renderInvOps(){
  const panel=$('#invOpsPanel'); if(!panel) return;
  if(!invOpsTicker){ panel.style.display='none'; return; }
  const t=invOpsTicker, car=invOpsCartera||'Propia'; const v=(DB.valores&&DB.valores[t])||{};
  panel.style.display='block';
  $('#invOpsTitle').textContent='Operaciones · '+t+' · '+car+(v.nombre?(' · '+v.nombre):'');
  $('#invOpsMeta').innerHTML=
    '<label>Nombre<input data-meta="nombre" value="'+(v.nombre||'')+'"></label>'+
    '<label>Precio actual (€)<input type="number" step="0.0001" data-meta="precioActual" value="'+(v.precioActual||0)+'"></label>'+
    '<label>Dividendo/acción (€)<input type="number" step="0.0001" data-meta="divAccion" value="'+(v.divAccion||0)+'"></label>'+
    '<label>Bróker<input data-meta="broker" value="'+(v.broker||'')+'"></label>';
  if($('#opFecha') && !$('#opFecha').value) $('#opFecha').value=new Date().toISOString().slice(0,10);
  const ops=(DB.operaciones||[]).filter(o=>(o.ticker||'').toUpperCase()===t && (o.cartera||'Propia')===car).slice().sort(invByFecha);
  if(!ops.length){ $('#invOpsList').innerHTML='<div class="empty">Sin operaciones para '+t+' en '+car+'.</div>'; return; }
  let acc=0;
  const rows=ops.map(o=>{ const n=num(o.acciones); acc+= o.tipo==='venta'?-n:n;
    return `<tr><td>${o.fecha?o.fecha.split('-').reverse().join('/'):'—'}</td><td><span class="tag ${o.tipo==='venta'?'':'in'}">${o.tipo==='venta'?'Venta':'Compra'}</span></td><td class="num">${n}</td><td class="num">${fmt(o.precio)}</td><td class="num">${fmt(n*num(o.precio))}</td><td class="num">${acc}</td><td class="right"><button class="btn ghost sm" data-editop="${o.id}">Editar</button> <button class="btn danger sm" data-delop="${o.id}">✕</button></td></tr>`;
  }).join('');
  $('#invOpsList').innerHTML=`<table><thead><tr><th>Fecha</th><th>Op.</th><th class="num">Acc.</th><th class="num">Precio</th><th class="num">Importe</th><th class="num">Acumul.</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function addOp(){
  if(!invOpsTicker){alert('Elige un valor primero.');return;}
  const fecha=$('#opFecha').value, tipo=$('#opTipo').value, n=num($('#opAcc').value), precio=num($('#opPrecio').value);
  if(n<=0){alert('Indica acciones > 0.');return;}
  if(tipo==='compra'&&precio<=0){alert('Indica el precio de compra.');return;}
  if(precio<0){alert('El precio no puede ser negativo.');return;}
  /* Validador de coherencia: bloquea lo imposible, avisa (y deja seguir) en lo dudoso */
  if(fecha){ const _d=new Date(fecha+'T00:00:00'); const _y=_d.getFullYear(); if(isNaN(_d.getTime())||_y<1990||_y>new Date().getFullYear()+1){ alert('La fecha «'+fecha+'» no parece válida.'); return; } if(_d.getTime()>Date.now()+86400000){ if(!confirm('La fecha '+fecha+' es futura. ¿Registrar la operación igualmente?'))return; } }
  if(tipo==='venta'){ const _sh=(typeof sharesHeldOf==='function')?sharesHeldOf(invOpsTicker,invOpsCartera||'Propia',opEditId):null; if(_sh!=null && n>_sh+1e-6){ if(!confirm('Vas a vender '+n+' acciones, pero en '+invOpsTicker+' ('+(invOpsCartera||'Propia')+') solo constan '+(Math.round(_sh*10000)/10000)+'. ¿Continuar igualmente?'))return; } }
  const _opEsNueva=!opEditId; const _opT=invOpsTicker;
  if(opEditId){ const o=DB.operaciones.find(x=>x.id===opEditId); if(o){ o.fecha=fecha; o.tipo=tipo; o.acciones=n; o.precio=precio; } opEditEnd(); }
  else { DB.operaciones.push({id:uid(),fecha,ticker:invOpsTicker,cartera:invOpsCartera||'Propia',tipo,acciones:n,precio}); }
  $('#opAcc').value=''; $('#opPrecio').value='';
  renderInv(); renderInvOps(); scheduleSave();
  /* M3: si es una operación NUEVA y reciente, ofrece anotarla en el Diario */
  if(_opEsNueva && typeof diarioOfrecerOp==='function') diarioOfrecerOp(_opT,tipo,precio,n,fecha);
}
function editOp(id){ const o=DB.operaciones.find(x=>x.id===id); if(!o)return; opEditId=id;
  $('#opFecha').value=o.fecha||''; $('#opTipo').value=o.tipo; $('#opAcc').value=o.acciones; $('#opPrecio').value=o.precio;
  $('#opAdd').textContent='Guardar cambios'; $('#opCancelEdit').style.display='inline-block'; }
function opEditEnd(){ opEditId=null; const b=$('#opAdd'); if(b)b.textContent='Añadir operación'; const c=$('#opCancelEdit'); if(c)c.style.display='none'; }
/* Auto-relleno de "+ Posición" al teclear un ticker que ya existe (no pisa lo ya escrito) */
function invPrefillTicker(){
  const el0=$('#invTicker'); const t=((el0&&el0.value)||'').trim().toUpperCase(); if(!t) return;
  const v=(DB.valores||{})[t];
  const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t);
  if(!v && !a) return;                       /* ticker nuevo: no autorrellenar */
  const nombre=(v&&v.nombre)||(a&&a.nombre)||'';
  const pa=(v&&num(v.precioActual))||(a&&num(a.cotizacion))||0;
  const div=(v&&num(v.divAccion))||(a&&num(a.divAccion))||0;
  const setIf=(id,val)=>{ const el=$(id); if(el && el.value.trim()==='' && val) el.value=val; };
  setIf('#invNombre',nombre); if(pa>0)setIf('#invPA',pa); if(div>0)setIf('#invDiv',div);
  if(v&&v.broker)setIf('#invBroker',v.broker);
  const ex=$('#invExch'); if(ex && v&&v.exchange) ex.value=v.exchange;
  const st=$('#invStatus'); if(st) st.textContent='✓ Empresa existente: datos cargados (edita lo que quieras).';
}
function invNuevoValor(){
  const t=$('#invTicker').value.trim().toUpperCase(); if(!t){alert('Pon el ticker.');return;}
  DB.valores=DB.valores||{};
  DB.valores[t]={nombre:$('#invNombre').value.trim()||t, precioActual:num($('#invPA').value), divAccion:num($('#invDiv').value), broker:$('#invBroker').value.trim(), exchange:$('#invExch').value.trim()||'BME'};
  { const _iDiv=num($('#invDiv').value); if(_iDiv>0){ const _an=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(_an)_an.divAccion=_iDiv; } }  /* sincroniza el DPA con la ficha de Análisis */
  const acc=num($('#invAcc').value);
  const car=($('#invCart').value||'').trim()||'Propia';
  const _pc=num($('#invPC').value), _fe=$('#invFecha').value||'';
  if(acc>0){ DB.operaciones.push({id:uid(),fecha:_fe,ticker:t,cartera:car,tipo:'compra',acciones:acc,precio:_pc}); }
  $('#invForm').reset(); $('#invExch').value='BME'; $('#invForm').style.display='none';
  renderInv(); scheduleSave(); setInvStatus('Valor añadido: '+t);
  /* M3: nueva posición con compra → ofrece anotarla en el Diario */
  if(acc>0 && typeof diarioOfrecerOp==='function') diarioOfrecerOp(t,'compra',_pc,acc,_fe);
}
function parseNumES(t){ t=(t||'').toString().replace(/[^\d.,-]/g,''); if(!t)return NaN; if(t.indexOf(',')>=0){ return parseFloat(t.replace(/\./g,'').replace(',','.')); } return parseFloat(t); }
const NAME2TICK={"FLUIDRASA":"FDR","FLUIDRA":"FDR","CELLNEXTELECOMSA":"CLNX","CELLNEX":"CLNX","MERLINPROPERTIESSOCIMISA":"MRL","MERLINPROPERTIES":"MRL","MERLIN":"MRL","IBERPAPELGESTIONSA":"IBG","IBERPAPEL":"IBG","ORYZONGENOMICSSA":"ORY","ORYZONGENOMICS":"ORY","ORYZON":"ORY","CIRSAENTERPRISESSA":"CIRSA","CIRSA":"CIRSA","IBERDROLASA": "IBE", "BANCOSANTANDERSA": "SAN", "REPSOLSA": "REP", "NATURGYENERGYGROUPSA": "NTGY", "MAPFRESA": "MAP", "ENDESASA": "ELE", "ATRESMEDIA": "A3M", "LOGISTAINTEGRALSA": "LOG", "VISCOFANSA": "VIS", "INDITEX": "ITX", "EBROFOODSSA": "EBRO", "FAESFARMASA": "FAE", "ACS": "ACS", "VIDRALASA": "VID", "AENA": "AENA", "AMADEUSITGROUPSA": "AMS", "REDEIACORPORACION": "RED", "CAIXABANKSA": "CABK", "PRIMSA": "PRM", "BANKINTERSA": "BKT", "RENTA4BANCOSA": "R4", "MIQUELYCOSTAS": "MCM", "SACYRSA": "SCYR", "FCC": "FCC", "ENAGASSA": "ENG", "BBVA": "BBVA", "UNICAJABANCOSA": "UNI", "ACCIONASA": "ANA", "TELEFONICASA": "TEF", "ACERINOXSA": "ACX", "AIRBUS": "AIR", "FERROVIAL": "FER", "ARCELORMITTAL": "MTS", "IAG": "IAG", "INDRA": "IDR", "ACCIONAENERGIA": "ANE", "GRIFOLS": "GRF", "CIEAUTOMOTIVE": "CIE", "ROVI": "ROVI", "INMOBILIARIACOLONIAL": "COL", "ALMIRALL": "ALM", "PUIG": "PUIG", "APERAM": "APAM.AS", "GRENERGYRENOVABLES": "GRE", "TECNICASREUNIDAS": "TRE", "SOLARIA": "SLR", "ELECNOR": "ENO", "CAF": "CAF", "MAKINGSCIENCE": "MAKS", "NEINORHOMES": "HOME", "GESTAMP": "GEST", "MELIAHOTELS": "MEL", "LLEIDANET": "LLN", "REALIA": "RLIA", "CEVASA": "CEV", "METROVACESA": "MVC", "PHARMAMAR": "PHM", "PROSEGUR": "PSG", "ARTECHE": "ART", "ECOENER": "ECO", "LINEADIRECTA": "LDA", "AEDASHOMES": "AEDAS", "COX": "COXG", "AUDAXRENOVABLES": "ADX", "ENCE": "ENC", "INMOBILIARIASANJOSE": "GSJ", "OHLA": "OHLA", "PRISA": "PRS", "GIGASHOSTING": "GIGA", "TUBACEX": "TUB", "AMPER": "AMP", "NEXTIL": "NXT", "TALGO": "TLGO", "ALANTRAPARTNERS": "ALNT", "ERCROS": "ECR", "BERKELEYENERGIA": "BKY", "AZKOYEN": "AZK", "REIGJOFRE": "RJF", "ARIMAREALESTATE": "ARM", "AIRTIFICIAL": "AI", "NICOLASCORREA": "NEA", "DEOLEO": "OLE", "VOCENTO": "VOC", "TUBOSREUNIDOS": "TRG", "LINGOTESESPECIALES": "LGT", "ADOLFODOMINGUEZ": "ADZ", "EZENTIS": "EZE", "RENTACORPORACION": "REN", "BODEGASRIOJANAS": "RIO", "PESCANOVA": "PVA", "COCACOLAEUROPACIFIC": "CCEP", "NYESAVALORES": "NYE", "SECUOYA": "SEC", "URBAS": "UBS"};
function anaNorm(s){ return (s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function anaFindTicker(nombre){
  const k=anaNorm(nombre); if(!k) return '';
  if(NAME2TICK[k]) return NAME2TICK[k];
  let hit=null;
  (DB.analisis||[]).forEach(a=>{ if(a.nombre&&anaNorm(a.nombre)===k)hit=a.ticker; });
  if(hit) return hit.toUpperCase();
  Object.keys(DB.valores||{}).forEach(t=>{ const v=DB.valores[t]; if(v&&v.nombre&&anaNorm(v.nombre)===k)hit=t; });
  if(hit) return hit.toUpperCase();
  let best=''; Object.keys(NAME2TICK).forEach(kk=>{ if(kk.length>=5 && (k.indexOf(kk)===0||kk.indexOf(k)===0)){ if(kk.length>best.length)best=kk; } });
  if(best) return NAME2TICK[best];
  return k.slice(0,4);
}
function importInv(file){ file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;} const arr=Array.isArray(d)?d:(d.inversiones||[]); if(!arr.length){alert('Sin posiciones');return;} if(typeof pushSnapshot==='function')pushSnapshot('antes de importar cartera');
  DB.inversiones=arr.map(p=>({id:uid(),ticker:p.ticker||'',nombre:p.nombre||'',acciones:num(p.acciones),precioCompra:num(p.precioCompra),precioActual:num(p.precioActual),divAccion:num(p.divAccion),exchange:p.exchange||'BME',broker:p.broker||''}));
  renderInv(); saveNow(); alert('Importadas '+DB.inversiones.length+' posiciones.'); }); }
let _anaBusca={q:''};
function _anaNum(l,v){ return '<div class="ana-num"><div class="l">'+l+'</div><div class="v">'+v+'</div></div>'; }
// Termómetro de precios: stop · zona de entrada · PO, con el precio actual como punto y chips estratégicos
function _anaLadder(a){
  var cot=num(a.cot),stop=num(a.stop),eMin=num(a.entMin),eMax=num(a.entMax),pMed=num(a.poMed),pMax=num(a.poMax);
  var ok = stop>0&&eMin>0&&eMax>0&&pMed>0&&cot>0 && stop<eMin && eMin<=eMax && eMax<pMed;
  if(!ok){
    return '<div class="ana-nums">'+_anaNum('Cotización',cot?fmt(cot):'—')+_anaNum('Stop',stop?fmt(stop):'—')+_anaNum('Entrada',(eMin&&eMax)?fmt(eMin)+'–'+fmt(eMax):'—')+_anaNum('P. objetivo',pMed?fmt(pMed):'—')+'</div>';
  }
  var lo=Math.min(stop,cot)*0.97, hi=Math.max(pMax||pMed,cot)*1.03, rng=(hi-lo)||1;
  var P=function(v){ return Math.max(0,Math.min(100,(v-lo)/rng*100)); };
  var pot=(a.pot!=null?a.pot*100:(pMed/cot-1)*100), colch=(a.colchon!=null?a.colchon*100:(cot-stop)/cot*100);
  var inZone=cot>=eMin&&cot<=eMax, stopHit=cot<=stop, below=cot<eMin;
  var dotCol=stopHit?'#dc2626':(inZone?'#16a34a':(below?'#d97706':'#dc2626'));
  var s=P(stop),emn=P(eMin),emx=P(eMax),pm=P(pMed);
  var grad='linear-gradient(90deg,#fecaca 0%,#fecaca '+s+'%,#fde68a '+s+'%,#fde68a '+emn+'%,#bbf7d0 '+emn+'%,#bbf7d0 '+emx+'%,#fef0c7 '+emx+'%,#fef0c7 '+pm+'%,#fbcfe8 '+pm+'%,#fbcfe8 100%)';
  var tick=function(v,c){ return '<div class="ana-lad-tick" style="left:'+P(v)+'%;background:'+c+'"></div>'; };
  var estCol=stopHit?'r':(inZone?'g':(below?'a':'r')), estTxt=stopHit?'🚨 Stop':(inZone?'🟢 En zona':(below?'🟡 esperando':'🔴 caro'));
  return '<div class="ana-lad"><div class="ana-lad-bar" style="background:'+grad+'"></div>'+
    tick(stop,'#dc2626')+tick(eMin,'#16a34a')+tick(eMax,'#16a34a')+tick(pMed,'#be185d')+
    '<div class="ana-lad-dot" style="left:'+P(cot)+'%;background:'+dotCol+'"></div>'+
    '<div class="ana-lad-lbl top" style="left:'+s+'%"><span class="k">Stop</span><span class="v">'+fmt(stop)+'</span></div>'+
    '<div class="ana-lad-lbl top" style="left:'+emx+'%"><span class="k">Entrada</span><span class="v">'+fmt(eMin)+'–'+fmt(eMax)+'</span></div>'+
    '<div class="ana-lad-lbl top" style="left:'+pm+'%"><span class="k">P. objetivo</span><span class="v">'+fmt(pMed)+'</span></div>'+
    '<div class="ana-lad-cur" style="left:'+P(cot)+'%"><div class="p" style="color:'+dotCol+'">'+fmt(cot)+'</div><div class="c">precio actual</div></div>'+
    '<div class="ana-chip r" style="left:'+s+'%">colchón '+colch.toFixed(0)+'%</div>'+
    '<div class="ana-chip est '+estCol+'" style="left:'+P(cot)+'%">'+estTxt+'</div>'+
    '<div class="ana-chip g" style="left:'+pm+'%">Potencial '+(pot>=0?'+':'')+pot.toFixed(0)+'%</div>'+
    '</div>';
}
function renderAnalisis(){
  if(!DB.config)DB.config={};
  const vU=(DB.config.anaVerde!=null?DB.config.anaVerde:0.20), aU=(DB.config.anaAmbar!=null?DB.config.anaAmbar:0.05);
  const ve=$('#anaVerde'); if(ve)ve.value=Math.round(vU*100);
  const ae=$('#anaAmbar'); if(ae)ae.value=Math.round(aU*100);
  const RPTS={AAA:100,AA:90,A:80,BBB:65,BB:50,B:35,CCC:25,CC:20,C:15};
  const cw=DB.config.anaPesos||{}; const wA=(cw.a!=null?cw.a:0.35),wB=(cw.b!=null?cw.b:0.20),wC=(cw.c!=null?cw.c:0.30),wD=(cw.d!=null?cw.d:0.15);
  const cl=x=>Math.max(0,Math.min(100,x));
  const held=heldTickerSet();
  const list=(DB.analisis||[]).map(a=>{
    const cot=num(((DB.valores||{})[(a.ticker||'').toUpperCase()]||{}).precioActual)||num(a.cotizacion),poMin=num(a.poMin),poMax=num(a.poMax),entMin=num(a.entMin),entMax=num(a.entMax),stop=num(a.stopTesis),dv=num(a.divAccion);
    const rating=(a.rating||'').toUpperCase();
    const poMed=(poMin&&poMax)?(poMin+poMax)/2:(poMax||poMin||0);
    const pot=(cot&&poMed)?(poMed/cot-1):null;
    const dist=(cot&&entMax)?(cot-entMax)/entMax:null;
    const colchon=(cot&&stop)?(cot-stop)/cot:null;
    const stopHit=!!(cot&&stop&&cot<=stop);
    let A=null,B=null,D=null; const C=(rating&&RPTS[rating]!=null)?RPTS[rating]:50;
    if(cot&&poMed) A=(pot<=0?0:cl(pot/0.5*100));
    if(dist!=null){ if(dist<=-0.20)B=100; else if(dist<=0)B=70+(-dist/0.20)*30; else if(dist<=0.25)B=70*(1-dist/0.25); else B=0; }
    if(poMin&&poMax&&poMed){ const amp=(poMax-poMin)/poMed; D=cl((0.60-amp)/0.50*100); } else if(poMed){ D=100; }
    let score=null;
    if(A!=null&&B!=null&&D!=null) score=wA*A+wB*B+wC*C+wD*D;
    const _uni=(DB.universo&&DB.universo[(a.ticker||'').toUpperCase()])||{};
    return {id:a.id,ticker:a.ticker,nombre:a.nombre||_uni.nombre||'',cot,poMin,poMax,poMed,entMin,entMax,stop,colchon,stopHit,held:held.has((a.ticker||'').toUpperCase()),rating,dv,pot,dist,A,B,C,D,score,decision:a.decision,dossierUrl:a.dossierUrl,dossierFecha:a.dossierFecha};
  });
  if(_sort['analisis']&&_sort['analisis'].k){ list=sortApply('analisis',list,{ticker:x=>x.ticker,nombre:x=>x.nombre,score:x=>x.score,cot:x=>x.cot,poMin:x=>x.poMin,poMax:x=>x.poMax,poMed:x=>x.poMed,entMin:x=>x.entMin,entMax:x=>x.entMax,pot:x=>x.pot,dist:x=>x.dist,stop:x=>x.stop,colchon:x=>x.colchon,rating:x=>x.rating}); } else { list.sort((a,b)=>(b.score==null?-1:b.score)-(a.score==null?-1:a.score)); }
  let bestId=null,bestSc=-1;
  list.forEach(x=>{ if(x.score!=null&&x.entMax&&x.cot&&x.cot<=x.entMax&&x.score>bestSc){bestSc=x.score;bestId=x.id;} });
  const enZona=list.filter(x=>x.entMax&&x.cot&&x.cot<=x.entMax).length;
  const buenScore=list.filter(x=>x.score!=null&&x.score>=70).length;
  const stopHits=list.filter(x=>x.stopHit).length;
  const bestT=(list.find(x=>x.id===bestId)||{}).ticker||'—';
  $('#anaCards').innerHTML=
    '<div class="ana-k"><div class="l">Empresas en seguimiento</div><div class="v">'+list.length+'</div><div class="p">en la lista</div></div>'+
    '<div class="ana-k"><div class="l">En zona de compra</div><div class="v '+(enZona?'pos':'')+'">'+enZona+'</div><div class="p">cotiza ≤ banda de entrada</div></div>'+
    '<div class="ana-k hero"><div class="l">Mejor oportunidad ahora</div><div class="v">'+bestT+'</div><div class="p">mejor score en zona</div></div>'+
    '<div class="ana-k"><div class="l">🚨 Stop de tesis alcanzado</div><div class="v '+(stopHits?'neg':'')+'">'+stopHits+'</div><div class="p">requieren decisión</div></div>';
  if(!list.length){ $('#anaTable').innerHTML='<div class="empty">Sin empresas. Pulsa «+ Empresa» para añadir la primera.</div>'; return; }
  const inp=(id,f,v,w)=>`<input type="number" step="0.0001" class="anaInp" style="width:${w||56}px;text-align:right" data-id="${id}" data-f="${f}" value="${(v!=null&&v!==0)?v:''}">`;
  const rows=list.map(a=>{
    const potcls=a.pot==null?'':(a.pot>=vU?'g':a.pot>=aU?'a':'r');
    let estado='—',ecls='';
    if(a.entMax&&a.cot){
      if(a.entMin&&a.cot<=a.entMin){estado='🟢 Óptimo';ecls='g';}
      else if(a.cot<=a.entMax){estado='🟢 En zona';ecls='g';}
      else if(a.cot<=a.entMax*1.10){estado='🟡 +'+(a.dist*100).toFixed(1)+'%';ecls='a';}
      else {estado='🔴 −'+((a.cot-a.entMax)/a.cot*100).toFixed(1)+'%';ecls='r';}
    }
    let salida='—',scls2='';
    if(a.stop&&a.cot){
      if(a.stopHit){salida='🚨 VENDER';scls2='r';}
      else if(a.colchon<=0.10){salida='🟠 cerca '+(a.colchon*100).toFixed(0)+'%';scls2='a';}
      else {salida='colchón '+(a.colchon*100).toFixed(0)+'%';scls2='g';}
    }
    const scls=a.score==null?'':(a.score>=70?'g':a.score>=50?'a':'r');
    let sLbl='',sCol='#64748b';
    if(a.score!=null){ if(a.score>=70){sLbl='Buena';sCol='#16a34a';} else if(a.score>=50){sLbl='Media';sCol='#d97706';} else {sLbl='Mala';sCol='#dc2626';} }
    const _dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; const _dv=(a.decision||'').toUpperCase();
    const _du=(typeof dossierURL==='function')?dossierURL(a.ticker,a.dossierUrl):(a.dossierUrl||''); const _dossM=(a.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null;
    const decChip=_dv?`<span class="dec" style="background:${_dc[_dv]||'#64748b'}">${_dv}</span>`:'<span class="muted">—</span>';
    const dossIco=`${_du?` <a href="${_du}" target="_blank" rel="noopener" title="Abrir dossier${a.dossierFecha?' ('+a.dossierFecha+')':''}" style="text-decoration:none;font-size:13px">📄</a>`:''}${(_dossM!=null)?` <span title="Dossier de ${a.dossierFecha}" style="font-size:9px;color:${_dossM>12?'#dc2626':'#94a3b8'}">${_dossM}m${_dossM>12?'⚠️':''}</span>`:''}`;
    const star=a.id===bestId?'<span style="color:#f59e0b">⭐</span> ':'';
    const _arqTxt=(function(){var _t=(a.ticker||'').toUpperCase();var _u=(DB.universo&&DB.universo[_t])||{};var _arq=(typeof SECTOR!=='undefined'&&SECTOR[_t])||_u.arquetipo||'';var _sub=(typeof SUBTIPO!=='undefined'&&SUBTIPO[_t])||_u.subtipo||'';return _arq?('<div class="ana-sub" title="'+_sub+'">'+_arq+'</div>'):'';})();
    const rMod=a.stopHit?'ana-r-stop':(a.id===bestId?'ana-r-best':'');
    const poRng=(a.poMin&&a.poMax)?`<div class="ana-sub">${fmt(a.poMin)}–${fmt(a.poMax)}</div>`:'';
    const entTxt=(a.entMin&&a.entMax)?(fmt(a.entMin)+'–'+fmt(a.entMax)):(a.entMax?('≤'+fmt(a.entMax)):'—');
    return `<tr class="ana-row ${rMod}" data-anarow data-fs="${((a.ticker||'')+' '+(a.nombre||'')).toLowerCase().replace(/"/g,'')}">
      <td class="ana-sccell"><span class="ana-rarw">▶</span><div class="ana-score ${scls||'n'}"><div class="n">${a.score==null?'—':a.score.toFixed(0)}</div>${a.score==null?'':`<div class="l">${sLbl}</div>`}</div></td>
      <td class="ana-emp">${star}<b${a.ticker?` data-ficha="${a.ticker}" style="cursor:pointer;color:var(--brand)" title="Abrir ficha"`:''}>${a.ticker||''}</b>${a.held?' <span class="muted" style="font-size:9px">en cartera</span>':''}${a.ticker?` <span data-ficha="${a.ticker}" style="cursor:pointer;color:#334155" title="Abrir ficha">· ${a.nombre||''}</span>`:(a.nombre?' · '+a.nombre:'')}${_arqTxt}</td>
      <td class="ctr">${decChip}${dossIco}</td>
      <td class="num">${fmt(a.cot)}</td>
      <td class="num"><b>${a.poMed?fmt(a.poMed):'—'}</b>${poRng}</td>
      <td class="ctr"><span class="pill ${potcls}">${a.pot==null?'—':(a.pot>=0?'+':'')+(a.pot*100).toFixed(1)+'%'}</span></td>
      <td class="num">${entTxt}</td>
      <td class="ctr"><span class="pill ${ecls}">${estado}</span></td>
      <td class="num">${a.stop?fmt(a.stop):'—'}</td>
      <td class="ctr"><span class="pill ${scls2}">${salida}</span></td>
      <td class="ctr"><span class="ana-rat">${a.rating||'—'}</span></td>
      <td class="right"><button class="btn ghost sm" data-anaedit="${a.id}">✎ Editar</button> <button class="btn danger sm" data-anadel="${a.id}">✕</button></td></tr><tr class="ana-det"><td colspan="12"><div class="ana-det-wrap">${_anaLadder(a)}</div></td></tr>`;
  }).join('');
  var _anaTbl=`<table class="ana-tbl"><thead><tr><th data-sorttbl="analisis" data-sortk="score" style="cursor:pointer">Score${sortArrow('analisis','score')}</th><th data-sorttbl="analisis" data-sortk="ticker" style="cursor:pointer">Empresa${sortArrow('analisis','ticker')}</th><th>Decisión</th><th class="num" data-sorttbl="analisis" data-sortk="cot" style="cursor:pointer">Cotiz.${sortArrow('analisis','cot')}</th><th class="num" data-sorttbl="analisis" data-sortk="poMed" style="cursor:pointer">P. objetivo${sortArrow('analisis','poMed')}</th><th class="num" data-sorttbl="analisis" data-sortk="pot" style="cursor:pointer">Potencial${sortArrow('analisis','pot')}</th><th class="num" data-sorttbl="analisis" data-sortk="entMax" style="cursor:pointer">Entrada${sortArrow('analisis','entMax')}</th><th data-sorttbl="analisis" data-sortk="dist" style="cursor:pointer">Estado${sortArrow('analisis','dist')}</th><th class="num" data-sorttbl="analisis" data-sortk="stop" style="cursor:pointer">Stop${sortArrow('analisis','stop')}</th><th data-sorttbl="analisis" data-sortk="colchon" style="cursor:pointer">Salida${sortArrow('analisis','colchon')}</th><th data-sorttbl="analisis" data-sortk="rating" style="cursor:pointer">Rating${sortArrow('analisis','rating')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  const _anaCards=list.map(a=>{
    const best=a.id===bestId;
    let e_t='—',e_c='';
    if(a.entMax&&a.cot){
      if(a.entMin&&a.cot<=a.entMin){e_t='🟢 Óptimo';e_c='g';}
      else if(a.cot<=a.entMax){e_t='🟢 En zona';e_c='g';}
      else if(a.cot<=a.entMax*1.10){e_t='🟡 +'+(a.dist*100).toFixed(1)+'%';e_c='a';}
      else {e_t='🔴 −'+((a.cot-a.entMax)/a.cot*100).toFixed(1)+'%';e_c='r';}
    }
    let s_t='—',s_c='';
    if(a.stop&&a.cot){
      if(a.stopHit){s_t='🚨 VENDER';s_c='r';}
      else if(a.colchon<=0.10){s_t='🟠 cerca '+(a.colchon*100).toFixed(0)+'%';s_c='a';}
      else {s_t='colchón '+(a.colchon*100).toFixed(0)+'%';s_c='g';}
    }
    const sCol=a.score==null?'#64748b':(a.score>=70?'#16a34a':a.score>=50?'#d97706':'#dc2626');
    const sLbl=a.score==null?'':(a.score>=70?'Buena':a.score>=50?'Media':'Mala');
    const potcls=a.pot==null?'':(a.pot>=vU?'g':a.pot>=aU?'a':'r');
    const _potPill='<span class="pill '+potcls+'">'+(a.pot==null?'—':(a.pot>=0?'+':'')+(a.pot*100).toFixed(1)+'%')+'</span>';
    const _dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};const _dvv=(a.decision||'').toUpperCase();
    const _decChip=_dvv?'<span class="dec" style="background:'+(_dc[_dvv]||'#64748b')+'">'+_dvv+'</span>':'<span style="color:#cbd5e1">—</span>';
    const _nm=(a.nombre||'');
    return '<div class="acard'+(a.stopHit?' stop':(best?' best':''))+'" data-fs="'+((a.ticker||'')+' '+(a.nombre||'')).toLowerCase().replace(/"/g,'')+'">'+
      '<div class="acard-h"><div class="sc"><div class="n" style="color:'+sCol+'">'+(a.score==null?'—':a.score.toFixed(0))+'</div><div class="l" style="color:'+sCol+'">'+sLbl+'</div></div>'+
      '<div class="mid"><div class="nm2">'+(best?'⭐ ':'')+(a.ticker||'')+(a.held?' <span class="arq" style="font-weight:400;color:#94a3b8;font-size:10px">en cartera</span>':'')+(_nm?' · '+_nm:'')+'</div><div class="s2">'+_decChip+'<span class="pill '+e_c+'" style="font-size:10px">'+e_t+'</span>'+(s_t!=='—'?'<span class="pill '+s_c+'" style="font-size:10px">'+s_t+'</span>':'')+'</div></div>'+
      '<span class="arw">▶</span></div>'+
      '<div class="acard-b">'+_anaLadder(a)+'<div class="agrid">'+
        '<div class="m"><div class="l">Cotización</div><div class="v">'+fmt(a.cot)+'</div></div>'+
        '<div class="m"><div class="l">Potencial</div><div class="v">'+_potPill+'</div></div>'+
        '<div class="m"><div class="l">Precio objetivo</div><div class="v">'+(a.poMin?fmt(a.poMin):'—')+' – '+(a.poMax?fmt(a.poMax):'—')+'</div></div>'+
        '<div class="m"><div class="l">Banda entrada</div><div class="v">'+(a.entMin?fmt(a.entMin):'—')+' – '+(a.entMax?fmt(a.entMax):'—')+'</div></div>'+
        '<div class="m"><div class="l">Stop tesis</div><div class="v">'+(a.stop?fmt(a.stop):'—')+'</div></div>'+
        '<div class="m"><div class="l">Rating</div><div class="v">'+(a.rating||'—')+'</div></div>'+
      '</div><div class="macts"><button class="btn ghost sm" data-anaedit="'+a.id+'">✎ Editar</button> <button class="btn danger sm" data-anadel="'+a.id+'">✕ Borrar</button></div></div></div>';
  }).join('');
  $('#anaTable').innerHTML='<div class="atable">'+_anaTbl+'</div><div class="acards">'+_anaCards+'</div>';
  var _at=$('#anaTable');
  if(_at&&!_at._anaCardBound){ _at._anaCardBound=true; _at.addEventListener('click',function(e){ if(e.target.closest('input,select,textarea,button,a,[data-anaedit],[data-anadel]'))return; var h=e.target.closest('.acard-h'); if(h){ h.parentElement.classList.toggle('open'); return; } var rr=e.target.closest('tr.ana-row'); if(rr && !e.target.closest('[data-ficha]')){ rr.classList.toggle('open'); } }); }
  $$("#anaTable select[data-f='decision']").forEach(sel=>{ const _a=(DB.analisis||[]).find(x=>x.id===sel.dataset.id); if(_a)sel.value=(_a.decision||'').toUpperCase(); });
  if(typeof _wireBuscador==='function') _wireBuscador($('#anaSearch'), $$('#anaTable tbody tr[data-fs], #anaTable .acard[data-fs]'), _anaBusca);
}
function anaSubmit(){
  const id=$('#anaId').value||uid();
  const poMin=num($('#anaPoMin').value), poMax=num($('#anaPoMax').value);
  const entMin=num($('#anaEntMin').value), entMax=num($('#anaEntMax').value);
  const poMed=(poMin&&poMax)?(poMin+poMax)/2:(poMax||poMin||0);
  const a={id,ticker:$('#anaTicker').value.trim().toUpperCase(),nombre:$('#anaNombre').value.trim(),cotizacion:num($('#anaCot').value),poMin,poMax,entMin,entMax,rating:($('#anaRating').value||'').trim().toUpperCase(),stopTesis:num($('#anaStop').value),decision:($('#anaDecision').value||'').toUpperCase(),dossierFecha:$('#anaDossierFecha').value||'',dossierUrl:($('#anaDossierUrl').value||'').trim(),divAccion:num($('#anaDivA').value),notas:$('#anaNotas').value.trim(),precioObjetivo:poMed,precioEntrada:entMax};
  if(!a.ticker&&!a.nombre){alert('Pon al menos ticker o nombre.');return;}
  DB.analisis=DB.analisis||[];
  const ex=DB.analisis.find(x=>x.id===id);
  /* 5.2.e: si se EDITA un registro existente y cambia decision/banda/stop => rastro + motivo + recordatorio §10.5 */
  let critChg=null;
  if(ex){ const chg=[]; if((ex.decision||'').toUpperCase()&&(ex.decision||'').toUpperCase()!==a.decision)chg.push('la decision'); if(num(ex.entMin)>0&&num(ex.entMin)!==a.entMin)chg.push('la banda min.'); if(num(ex.entMax)>0&&num(ex.entMax)!==a.entMax)chg.push('la banda max.'); if(num(ex.stopTesis)>0&&num(ex.stopTesis)!==a.stopTesis)chg.push('el stop'); if(chg.length)critChg=chg.join(', '); }
  if(ex)Object.assign(ex,a); else DB.analisis.push(a);
  if(a.ticker && a.divAccion>0){ DB.valores=DB.valores||{}; DB.valores[a.ticker]=DB.valores[a.ticker]||{}; DB.valores[a.ticker].divAccion=a.divAccion; }  /* sincroniza el DPA con Inversiones/valores */
  if(critChg && a.ticker && typeof anotarAjusteTesis==='function'){ anotarAjusteTesis(a.ticker,critChg); }
  $('#anaForm').reset(); $('#anaId').value=''; $('#anaForm').style.display='none'; $('#anaSubmit').textContent='Añadir';
  renderAnalisis(); scheduleSave();
}
function anaEdit(id){ const a=DB.analisis.find(x=>x.id===id); if(!a)return;
  $('#anaId').value=a.id; $('#anaTicker').value=a.ticker||''; $('#anaNombre').value=a.nombre||''; $('#anaCot').value=a.cotizacion; $('#anaPoMin').value=a.poMin||''; $('#anaPoMax').value=a.poMax||''; $('#anaEntMin').value=a.entMin||''; $('#anaEntMax').value=a.entMax||''; $('#anaRating').value=a.rating||''; $('#anaStop').value=a.stopTesis||''; $('#anaDecision').value=a.decision||''; $('#anaDossierFecha').value=a.dossierFecha||''; $('#anaDossierUrl').value=a.dossierUrl||''; $('#anaDivA').value=a.divAccion; $('#anaNotas').value=a.notas||'';
  $('#anaSubmit').textContent='Guardar'; $('#anaForm').style.display='grid'; window.scrollTo({top:0,behavior:'smooth'}); }
function setAnaStatus(t){ const e=$('#anaStatus'); if(e)e.textContent=t; }
let fichaTicker=null; let _dossierSet=null; let _tesisSet=null; let _tesisCache={}; let _tesisWarn={}; let _trimCache={};
let fichaRange='all';
let fichaMA={50:false,200:false,1000:false};   // medias móviles activas en la gráfica de la ficha
let fichaVsIbex=false;                          // modo comparativa vs IBEX (rebase a 100)
let fichaZoom=null;                             // zoom por arrastre {t0,t1,ticker} o null
let _fichaGeo=null, _fichaDrag=null, _fichaPrefsLoaded=false;
function _fichaSavePrefs(){ try{ DB.config=DB.config||{}; DB.config.fichaGraf={ma:{50:!!fichaMA[50],200:!!fichaMA[200],1000:!!fichaMA[1000]},vsIbex:!!fichaVsIbex,range:fichaRange}; if(typeof scheduleSave==='function')scheduleSave(); }catch(e){} }
// Botón del selector de rango: caja diferenciada, 2 líneas (plazo + % del plazo); al seleccionar, "crece".
function _fichaRangeBtn(key,lbl,vt,vc,sel){ return `<button type="button" data-frange="${key}" style="display:flex;flex-direction:column;align-items:center;line-height:1.05;padding:3px 9px;min-width:46px;border:1px solid ${sel?'var(--brand)':'var(--line)'};border-radius:8px;background:${sel?'#eff6ff':'#fff'};cursor:pointer;transition:transform .12s ease;transform:${sel?'scale(1.12)':'none'};${sel?'box-shadow:0 1px 5px rgba(37,99,235,.18);':''}"><span style="font-weight:700;font-size:12px;color:${sel?'var(--brand)':'inherit'}">${lbl}</span><span style="font-size:10.5px;font-weight:700;color:${vc}">${vt}</span></button>`; }
const _precioCache={};
function fmtpct(x){ return x==null?'—':(x>=0?'+':'')+(x*100).toFixed(1)+'%'; }
function fichaCalc(ticker){
  const t=(ticker||'').toUpperCase();
  let ops=(DB.operaciones||[]).filter(o=>(o.ticker||'').toUpperCase()===t).slice().sort(invByFecha);
  let divs=((DB.dividendos||{})[t]||[]).slice().sort(invByFecha);
  if(!ops.length){ const _c=(DB.cerradas||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(_c&&_c.ops&&_c.ops.length){ ops=_c.ops.slice().sort(invByFecha); if(_c.divs&&_c.divs.length) divs=_c.divs.slice().sort(invByFecha); } }
  const v=(DB.valores||{})[t]||{}; const precioActual=num(v.precioActual);
  const compras=ops.filter(o=>o.tipo!=='venta');
  const lotes=compras.map(o=>{ const N=num(o.acciones),P=num(o.precio),coste=N*P;
    const divShareAfter=divs.filter(x=>x.fecha>o.fecha).reduce((s,x)=>s+num(x.importe),0);
    const divCobrado=N*divShareAfter, precioNeto=P-divShareAfter, valor=N*precioActual, balance=valor-coste;
    return {fecha:o.fecha,cartera:o.cartera||'Propia',N,P,coste,divCobrado,precioNeto,valor,balance,rentTotal:coste?(balance+divCobrado)/coste:0};
  });
  const tot={N:0,coste:0,div:0,valor:0}; lotes.forEach(l=>{tot.N+=l.N;tot.coste+=l.coste;tot.div+=l.divCobrado;tot.valor+=l.valor;});
  tot.precioMedio=tot.N?tot.coste/tot.N:0; tot.balance=tot.valor-tot.coste; tot.rentTotal=tot.coste?(tot.balance+tot.div)/tot.coste:0; tot.netoMedio=tot.precioMedio-(tot.N?tot.div/tot.N:0);
  const divRows=divs.map(x=>{ const buys=compras.filter(o=>o.fecha<=x.fecha); const sb=buys.reduce((s,o)=>s+num(o.acciones),0); const sold=ops.filter(o=>o.tipo==='venta'&&o.fecha<=x.fecha).reduce((s,o)=>s+num(o.acciones),0); const cost=buys.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0); const pm=sb?cost/sb:0;
    return {id:x.id,fecha:x.fecha,year:(x.fecha||'').slice(0,4),divShare:num(x.importe),acc:sb-sold,precioMedio:pm,importe:(sb-sold)*num(x.importe)}; });
  const ymap={}; divRows.forEach(r=>{ const g=ymap[r.year]||(ymap[r.year]={year:r.year,importeSum:0,divShareSum:0,pmEnd:0,rows:[]}); g.importeSum+=r.importe; g.divShareSum+=r.divShare; g.pmEnd=r.precioMedio; g.rows.push(r); });
  const divYears=Object.values(ymap).map(g=>Object.assign(g,{rend:g.pmEnd?g.divShareSum/g.pmEnd:0})).sort((a,b)=>(b.year||'').localeCompare(a.year||''));
  return {t,nombre:v.nombre||t,precioActual,lotes,tot,divRows,divYears};
}
function fichaOps(t){ t=(t||'').toUpperCase(); const ops=[];
  (DB.operaciones||[]).forEach(o=>{ if((o.ticker||'').toUpperCase()===t) ops.push({fecha:o.fecha,tipo:o.tipo,acciones:num(o.acciones),precio:num(o.precio)}); });
  (DB.cerradas||[]).forEach(c=>{ if((c.ticker||'').toUpperCase()===t&&c.ops) c.ops.forEach(o=>ops.push({fecha:o.fecha,tipo:o.tipo,acciones:num(o.acciones),precio:num(o.precio)})); });
  ops.sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')); return ops; }
function fichaOpsTabla(t){ const ops=fichaOps(t); if(!ops.length) return '';
  const rows=ops.map(o=>`<tr><td>${o.fecha?ddmmyyyy(o.fecha):'—'}</td><td>${o.tipo==='venta'?'<span class="neg">Venta</span>':'<span class="pos">Compra</span>'}</td><td class="num">${o.acciones}</td><td class="num">${fmt(o.precio)}</td><td class="num">${fmt(o.acciones*o.precio)}</td></tr>`).join('');
  return `<h3 style="margin-top:14px">Operaciones</h3><div style="overflow:auto"><table><thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Acciones</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>${rows}</tbody></table></div>`; }
function abrirFicha(t){ if(!t)return; const h=document.querySelector('header'); if(h)h.style.display='none'; const m=$('#main'); if(m)m.style.display='none'; const fv=$('#fichaView'); if(fv)fv.style.display='block'; renderFicha(t); window.scrollTo({top:0}); }
function cerrarFicha(){ const fv=$('#fichaView'); if(fv){ fv.style.display='none'; fv.innerHTML=''; } const h=document.querySelector('header'); if(h)h.style.display=''; const m=$('#main'); if(m)m.style.display=''; fichaTicker=null; document.title='Economía Doméstica'; if(location.hash) history.replaceState(null,'',location.pathname+location.search); }
function renderFicha(t){
  fichaTicker=(t||'').toUpperCase();
  ((DB.dividendos||{})[fichaTicker]||[]).forEach(x=>{ if(!x.id) x.id='d'+Math.random().toString(36).slice(2,9); });
  const f=fichaCalc(fichaTicker);
  const savedUrl=(((DB.valores||{})[fichaTicker]||{}).urlInvesting||'').trim();
  const invUrl=savedUrl||('https://es.investing.com/search/?q='+encodeURIComponent(f.nombre||f.t));
  const tt=f.tot;
  const hasOps=(DB.operaciones||[]).some(o=>(o.ticker||'').toUpperCase()===fichaTicker);
  let cerr=(DB.cerradas||[]).find(c=>(c.ticker||'').toUpperCase()===fichaTicker);
  if(cerr){ cerr=cerradaCalc(cerr); } else { try{ cerr=invClosedComputed().find(c=>c.ticker===fichaTicker); }catch(e){} }
  const isClosed=!!cerr; const detailed=f.lotes.length>0;
  // enlace al dossier de inversión de la empresa (analisis + carpeta dossiers/)
  const _anaEntry=(DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===fichaTicker)||{};
  const _dossU=(typeof dossierURL==='function')?dossierURL(fichaTicker,_anaEntry.dossierUrl):(_anaEntry.dossierUrl||'');
  const _dossM=(_anaEntry.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(_anaEntry.dossierFecha):null;
  const _dossBtn=_dossU?`<a class="btn" href="${_dossU}" target="_blank" rel="noopener" title="Abrir el dossier de inversión${_anaEntry.dossierFecha?' ('+_anaEntry.dossierFecha+')':''}" style="background:#7c3aed;border:none;color:#fff">📄 Dossier de inversión${(_dossM!=null&&_dossM>12)?' <span style="font-size:10px;opacity:.9">· '+_dossM+'m ⚠️</span>':''}</a>`:'';
  // cabecera + URL externa
  const header=`
   <div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
     <div><div style="font-size:22px;font-weight:800;color:var(--brand)">${f.t}</div><div class="muted">${f.nombre||''}${(typeof SECTOR!=='undefined'&&SECTOR[fichaTicker])?` · <span style="color:#9a3412;font-weight:600">${SECTOR[fichaTicker]}</span>${(typeof SUBTIPO!=='undefined'&&SUBTIPO[fichaTicker])?` <span class="muted" style="font-size:11px">· ${SUBTIPO[fichaTicker]}</span>`:''}`:''}${isClosed?' · <span style=\"color:#b45309\">Posición cerrada</span>':''}</div></div>
     <div style="flex:1"></div>
     <div style="text-align:right"><div class="muted" style="font-size:11px">Precio actual</div><div style="font-size:20px;font-weight:700">${fmt(f.precioActual)}</div></div>
     ${_dossBtn}
     <a class="btn" href="${invUrl}" target="_blank" rel="noopener">${savedUrl?'Ver ficha (investing)':'Buscar en investing.com'}</a>
     <button class="btn ghost" onclick="cerrarFicha()">Volver</button>
   </div>
   <div class="card" style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
     <span class="muted" style="font-size:12px;white-space:nowrap">URL ficha externa:</span>
     <input id="finvUrl" class="anaInp" style="flex:1;min-width:260px" placeholder="https://es.investing.com/equities/..." value="${savedUrl}">
     <button class="btn" id="finvVal">Validar</button>
     <span class="muted" style="font-size:11px">${savedUrl?'Enlace propio guardado ✓':'Usando búsqueda genérica'}</span>
   </div>`;
  // bloque central: cerrada -> resumen; abierta -> valoración + lotes
  let mid='';
  if(isClosed){
    const neto=cerr.venta-cerr.coste+cerr.dividendos, rent=cerr.coste?neto/cerr.coste:0;
    mid=`<div class="card" style="margin-top:14px;border-left:4px solid var(--brand)"><div style="font-weight:700;margin-bottom:8px">Resultado de la posición · ${cerr.fechaCompra?ddmmyyyy(cerr.fechaCompra):'—'} → ${cerr.fechaVenta?ddmmyyyy(cerr.fechaVenta):'—'}</div><div class="cards">
      <div class="card"><div class="lbl">Acciones</div><div class="val">${cerr.acciones}</div></div>
      <div class="card"><div class="lbl">Coste</div><div class="val">${fmt(cerr.coste)}</div></div>
      <div class="card"><div class="lbl">Venta</div><div class="val">${fmt(cerr.venta)}</div></div>
      <div class="card"><div class="lbl">Dividendos</div><div class="val pos">${fmt(cerr.dividendos)}</div></div>
      <div class="card"><div class="lbl">P/G neta</div><div class="val ${neto>=0?'pos':'neg'}">${neto>=0?'+':''}${fmt(neto)}</div><div class="sub">venta − coste + dividendos</div></div>
      <div class="card"><div class="lbl">Rentabilidad</div><div class="val ${rent>=0?'pos':'neg'}">${(rent>=0?'+':'')+(rent*100).toFixed(1)+'%'}</div></div>
    </div></div>`;
    mid+=fichaOpsTabla(fichaTicker);
  } else {
    const lotRows=f.lotes.map(l=>`<tr><td>${l.fecha?ddmmyyyy(l.fecha):'—'}</td><td>${l.cartera}</td><td class="num">${l.N}</td><td class="num">${fmt(l.P)}</td><td class="num">${fmt(l.coste)}</td><td class="num pos">${fmt(l.divCobrado)}</td><td class="num">${fmt(l.precioNeto)}</td><td class="num">${fmt(l.valor)}</td><td class="num ${l.balance>=0?'pos':'neg'}">${l.balance>=0?'+':''}${fmt(l.balance)}</td><td class="num ${l.rentTotal>=0?'pos':'neg'}">${fmtpct(l.rentTotal)}</td></tr>`).join('');
    const totRow=`<tr style="font-weight:700;background:#f1f5f9"><td>TOTAL</td><td></td><td class="num">${tt.N}</td><td class="num">${fmt(tt.precioMedio)}</td><td class="num">${fmt(tt.coste)}</td><td class="num pos">${fmt(tt.div)}</td><td class="num">${fmt(tt.netoMedio)}</td><td class="num">${fmt(tt.valor)}</td><td class="num ${tt.balance>=0?'pos':'neg'}">${tt.balance>=0?'+':''}${fmt(tt.balance)}</td><td class="num ${tt.rentTotal>=0?'pos':'neg'}">${fmtpct(tt.rentTotal)}</td></tr>`;
    const _annDiv=(f.divYears&&f.divYears.length)?num(f.divYears[0].divShareSum):num(((DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===fichaTicker)||{}).divAccion); const _yoc=tt.precioMedio>0?_annDiv/tt.precioMedio:0; let _totCart=0; try{ (invPositions()||[]).forEach(p=>{_totCart+=num(p.acciones)*num(p.precioActual);}); }catch(e){} const _peso=_totCart>0?tt.valor/_totCart:0;
    mid=`<div class="cards" style="margin-top:14px">
       <div class="card"><div class="lbl">Valor</div><div class="val">${fmt(tt.valor)}</div><div class="sub">coste ${fmt(tt.coste)}</div></div>
       <div class="card"><div class="lbl">Plusvalía latente</div><div class="val ${tt.balance>=0?'pos':'neg'}">${tt.balance>=0?'+':''}${fmt(tt.balance)}</div></div>
       <div class="card"><div class="lbl">Dividendos cobrados</div><div class="val pos">${fmt(tt.div)}</div></div>
       <div class="card"><div class="lbl">Balance total</div><div class="val ${(tt.balance+tt.div)>=0?'pos':'neg'}">${(tt.balance+tt.div)>=0?'+':''}${fmt(tt.balance+tt.div)}</div><div class="sub">plusvalía + dividendos (€)</div></div>
       <div class="card"><div class="lbl">Rentabilidad total</div><div class="val ${tt.rentTotal>=0?'pos':'neg'}">${fmtpct(tt.rentTotal)}</div><div class="sub">plusvalía + dividendos</div></div>
       <div class="card"><div class="lbl">Precio neto medio</div><div class="val">${fmt(tt.netoMedio)}</div><div class="sub">coste − dividendos/acción</div></div>
       <div class="card"><div class="lbl">YoC (yield on cost)</div><div class="val ${_yoc>=0?'pos':''}">${fmtpct(_yoc)}</div><div class="sub">div/acción ÷ precio medio</div></div>
       <div class="card"><div class="lbl">Peso en la cartera</div><div class="val">${fmtpct(_peso)}</div><div class="sub">valor ÷ cartera total</div></div>
     </div>
     <h3>Lotes</h3>
     <div style="overflow:auto"><table><thead><tr><th>Fecha</th><th>Cartera</th><th class="num">Acc.</th><th class="num">Precio</th><th class="num">Coste</th><th class="num">Div. cobrado</th><th class="num">Precio neto</th><th class="num">Valor</th><th class="num">Plusvalía</th><th class="num">Rent. total</th></tr></thead><tbody>${lotRows}${f.lotes.length?totRow:''}</tbody></table></div>
     ${f.lotes.length?'':'<div class="empty">Sin lotes en cartera (empresa solo en seguimiento).</div>'}`;
  }
  // dividendos
  const rendByYear={}; f.divYears.forEach(g=>{rendByYear[g.year]=g.rend;});
  let divTable;
  if(detailed){
    let divBody=''; f.divYears.forEach(g=>{ const rows=[...g.rows].reverse(); rows.forEach((r,i)=>{ divBody+='<tr>'; if(i===0){ divBody+=`<td rowspan="${rows.length}" style="vertical-align:top;background:#eef2f7;font-weight:600;border-right:2px solid #cbd5e1;white-space:nowrap;padding:6px 8px"><div style="display:grid;grid-template-columns:auto auto;gap:4px 16px"><div><div style="font-size:15px">${g.year}</div></div><div><div class="muted" style="font-size:10px;font-weight:400">Yield on cost</div><div class="${g.rend>=0?'pos':'neg'}">${fmtpct(g.rend)}</div></div><div><div class="muted" style="font-size:10px;font-weight:400">Div/acción</div><div>${fmt(g.divShareSum)}</div></div><div>${(()=>{const p=rendByYear[String((+g.year)-1)]; if(p==null||!isFinite(p)||p===0)return '<div class="muted" style="font-size:10px;font-weight:400">vs año ant.</div><div class="muted">—</div>'; const vv=(g.rend-p)/Math.abs(p); return `<div class="muted" style="font-size:10px;font-weight:400">vs año ant.</div><div class="${vv>=0?'pos':'neg'}">${fmtpct(vv)}</div>`;})()}</div></div></td>`; } divBody+=`<td><input type="date" class="anaInp" style="width:142px" data-edf="${r.id}" value="${r.fecha}"></td><td class="num"><input type="number" step="0.0001" class="anaInp" style="width:92px;text-align:right" data-edi="${r.id}" value="${r.divShare}"></td><td class="num">${r.acc}</td><td class="num">${fmt(r.precioMedio)}</td><td class="num">${fmt(r.importe)}</td><td class="num">${fmt(r.importe*0.81)}</td><td class="right"><button class="btn danger sm" data-deldiv="${r.id}">✕</button></td></tr>`; }); });
    divTable=`<div style="overflow:auto"><table><thead><tr><th>Año</th><th>Fecha</th><th class="num">Div/acción</th><th class="num">Acciones</th><th class="num">Precio medio</th><th class="num">Bruto</th><th class="num">Neto</th><th></th></tr></thead><tbody>${divBody||'<tr><td colspan="8" class="muted" style="text-align:center;padding:14px">Sin dividendos registrados. Añade uno arriba.</td></tr>'}</tbody></table></div>`;
  } else {
    let divBodyS=''; f.divYears.forEach(g=>{ const rows=[...g.rows].reverse(); rows.forEach((r,i)=>{ divBodyS+='<tr>'; if(i===0){ divBodyS+=`<td rowspan="${rows.length}" style="vertical-align:top;background:#eef2f7;font-weight:600;border-right:2px solid #cbd5e1;white-space:nowrap"><div style="font-size:15px">${g.year}</div><div class="muted" style="font-size:10px;font-weight:400;margin-top:5px">Div/acción año</div><div>${fmt(g.divShareSum)}</div></td>`; } divBodyS+=`<td><input type="date" class="anaInp" style="width:142px" data-edf="${r.id}" value="${r.fecha}"></td><td class="num"><input type="number" step="0.0001" class="anaInp" style="width:92px;text-align:right" data-edi="${r.id}" value="${r.divShare}"></td><td class="right"><button class="btn danger sm" data-deldiv="${r.id}">✕</button></td></tr>`; }); });
    divTable=`<div class="sub" style="margin-bottom:6px">Posición sin lotes detallados: se muestra el dividendo por acción registrado.</div><div style="overflow:auto"><table><thead><tr><th>Año</th><th>Fecha</th><th class="num">Div/acción</th><th></th></tr></thead><tbody>${divBodyS||'<tr><td colspan="4" class="muted" style="text-align:center;padding:14px">Sin dividendos registrados. Añade uno arriba.</td></tr>'}</tbody></table></div>`;
  }
  const divSection=`<h3>Histórico de dividendos</h3>${(typeof dpaCheckHTML==='function')?dpaCheckHTML(fichaTicker):''}
   <div class="card" style="margin-bottom:10px"><div class="patgrid">
     <label>Fecha<input type="date" id="fdivFecha"></label>
     <label>Dividendo/acción (€)<input type="number" step="0.0001" id="fdivImp"></label>
     <div class="row-actions" style="align-self:end"><button class="btn" id="fdivAdd">Añadir dividendo</button></div>
   </div></div>${divTable}`;
  try{ if(!_fichaPrefsLoaded){ _fichaPrefsLoaded=true; const gp=(DB.config&&DB.config.fichaGraf); if(gp){ if(gp.ma)fichaMA={50:!!gp.ma[50],200:!!gp.ma[200],1000:!!gp.ma[1000]}; if(typeof gp.vsIbex==='boolean')fichaVsIbex=gp.vsIbex; if(gp.range)fichaRange=gp.range; } } }catch(e){}
  const _ranges=[['1s','1S'],['1m','1M'],['3m','3M'],['1a','1A'],['5a','5A'],['all','Máx']];
  const rangeBtns=_ranges.map(r=>_fichaRangeBtn(r[0],r[1],'·','#94a3b8',fichaRange===r[0])).join('');
  const maBtns=[[50,'MM50'],[200,'MM200'],[1000,'MM1000']].map(m=>`<button type="button" data-fma="${m[0]}"${fichaMA[m[0]]?' class="on"':''} style="font-size:11px;padding:2px 6px">${m[1]}</button>`).join('');
  const ibexBtn=`<button type="button" data-fibex="1"${fichaVsIbex?' class="on"':''} style="font-size:11px;padding:2px 6px">vs IBEX</button>`;
  const chartCard=`<div class="card" style="margin-top:10px">`
    +`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px"><div style="font-weight:700">Cotización</div><div style="width:26px"></div><div class="seg" id="fchMA">${maBtns}</div><div class="seg" id="fchIbex">${ibexBtn}</div><span id="fchZoom"></span><span id="fchVar"></span><div style="flex:1"></div><div id="fchRange" style="display:flex;gap:5px;align-items:center">${rangeBtns}</div></div>`
    +`<div id="fichaChart" style="min-height:180px">Cargando cotización…</div></div>`;
  const _ana=(DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===fichaTicker)||{};
  const _decCol={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; const _dec=(_ana.decision||'').toUpperCase(); const _duF=(typeof dossierURL==='function')?dossierURL(fichaTicker,_ana.dossierUrl):(_ana.dossierUrl||''); const _mmV=(_ana.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(_ana.dossierFecha):null;
  const veredictoCard = (_dec||_ana.rating||_duF) ? `<div class="card" style="margin-top:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="muted" style="font-size:12px">Veredicto:</span>${_dec?`<span style="font-weight:800;color:${_decCol[_dec]||'#475569'};font-size:15px">${_dec}</span>`:'<span class="muted">—</span>'}${_ana.rating?` <span style="font-size:12px">Calidad <b>${_ana.rating}</b></span>`:''}${_ana.dossierFecha?` <span style="font-size:11px;color:${(_mmV!=null&&_mmV>12)?'#dc2626':'#64748b'}">análisis ${_ana.dossierFecha}${_mmV!=null?' ('+_mmV+'m'+(_mmV>12?' ⚠️':'')+')':''}</span>`:''}<div style="flex:1"></div>${_duF?`<a class="btn" href="${_duF}" target="_blank" rel="noopener">📄 Abrir dossier</a>`:'<span class="muted" style="font-size:11px">sin dossier enlazado</span>'}</div>` : '';
  if(_tesisCache[fichaTicker]===undefined&&typeof cargarTesis==='function')cargarTesis(fichaTicker);
  const tesisCard=(typeof tesisCardHTML==='function')?tesisCardHTML(_tesisCache[fichaTicker]):'';
  if(_trimCache[fichaTicker]===undefined&&typeof cargarTrimestral==='function')cargarTrimestral(fichaTicker);
  const trimCard=(typeof trimCardHTML==='function')?trimCardHTML(_trimCache[fichaTicker]):'';
  const hechosCard=(typeof hechosCardHTML==='function')?hechosCardHTML(_trimCache[fichaTicker]):'';
  const protoCard=(typeof protoRegHTML==='function')?protoRegHTML(fichaTicker):'';
  const calibCard=(typeof calibFichaHTML==='function')?calibFichaHTML(fichaTicker):'';
  $('#fichaView').innerHTML=header+(tesisCard?'':veredictoCard)+tesisCard+trimCard+hechosCard+protoCard+calibCard+((typeof tzFichaBoxes==='function')?tzFichaBoxes(fichaTicker):'')+chartCard+(typeof tesisHistHTML==='function'?tesisHistHTML(fichaTicker):'')+mid+divSection;
  document.title='Ficha '+f.t;
  if(typeof drawFichaChart==='function') drawFichaChart(fichaTicker);
}
/* === DPA derivado: dividendo por acción real desde el histórico DB.dividendos === */
function dpaReal(t){
  t=(t||'').toUpperCase();
  const arr=((DB.dividendos||{})[t]||[])
    .filter(d=>d&&d.fecha)
    .map(d=>({ms:Date.parse(d.fecha+'T00:00:00'),imp:num(d.importe)}))
    .filter(d=>!isNaN(d.ms)&&d.imp>0).sort((a,b)=>a.ms-b.ms);
  if(!arr.length) return null;
  const y12=Date.now()-365*86400000;
  const t12=arr.filter(d=>d.ms>=y12).reduce((s,d)=>s+d.imp,0);
  const nowY=new Date().getFullYear(); const byY={};
  arr.forEach(d=>{ const y=new Date(d.ms).getFullYear(); byY[y]=(byY[y]||0)+d.imp; });
  const anos=Object.keys(byY).map(Number).filter(y=>y<nowY).sort((a,b)=>b-a);
  const lastYearNum=anos.length?anos[0]:null;
  return {t12, lastYear:lastYearNum!=null?byY[lastYearNum]:null, lastYearNum, n:arr.length};
}
/* Tarjeta de contraste DPA manual vs dividendos registrados (para la sección de dividendos de la Ficha).
   Muestra siempre el contraste; solo avisa (ámbar + botón) cuando el manual va por debajo de AMBAS
   medidas recientes (último año completo Y últimos 12 m) → señal fiable de DPA caducado. Evita falsas
   alarmas por el calendario de pagos (12 m puede sobre/infra-contar) o dividendos crecientes. */
function dpaCheckHTML(t){
  t=(t||'').toUpperCase();
  const dr=dpaReal(t);
  const te=(typeof _tesisCache!=='undefined'?_tesisCache:{})[t];
  const prev=te?num(te.dpaPrevisto):0;                 // DPA previsto del dossier (tesis.json)
  if(!dr && !(prev>0)) return '';
  const usado=num(((DB.valores||{})[t]||{}).divAccion);
  const ly=dr?num(dr.lastYear):0, t12=dr?num(dr.t12):0, lyn=dr?dr.lastYearNum:null;
  const info = `<span class="muted">DPA manual:</span> <b>${fmt(usado)}</b>`
    + (prev>0 ? ` <span class="muted">· previsto (dossier):</span> <b>${fmt(prev)}</b>` : '')
    + (ly>0 ? ` <span class="muted">· dividendos año ${lyn}:</span> <b>${fmt(ly)}</b>` : '')
    + (t12>0 ? ` <span class="muted">· últ. 12 m:</span> <b>${fmt(t12)}</b>` : '');
  let act='';
  if(prev>0){                                          // prioridad: el previsto del dossier (forward del analista)
    const dif = usado>0 ? Math.abs(usado-prev)/prev : 1;
    act = (usado<=0 || dif>0.05)
      ? `<span style="color:#b45309;font-weight:700">⚠️ ${usado>0?'difiere del previsto del dossier':'sin DPA manual'}</span> <button class="btn sm" data-dpasync="${t}|${prev}">Usar previsto (${fmt(prev)})</button>`
      : `<span style="color:#16a34a;font-weight:600">✓ coincide con el dossier</span>`;
  } else {                                             // respaldo: histórico de dividendos
    const ref = ly>0 ? ly : (t12>0 ? t12 : 0);
    const belowLy=ly>0&&usado>0&&usado<ly*0.85, belowT12=t12>0&&usado>0&&usado<t12*0.85;
    if((usado<=0&&ref>0)||(belowLy&&belowT12))
      act=`<span style="color:#b45309;font-weight:700">⚠️ ${usado>0?'el manual va por debajo del histórico':'sin DPA manual'}</span> <button class="btn sm" data-dpasync="${t}|${ref}">Igualar (${fmt(ref)})</button>`;
  }
  return `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px">
    ${info}<div style="flex:1"></div>${act}</div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-dpasync]'); if(!b) return;
  e.stopPropagation();
  const a=(b.dataset.dpasync||'').split('|'); const t=(a[0]||'').toUpperCase(); const val=num(a[1]);
  if(!t||!(val>0)) return;
  DB.valores=DB.valores||{}; DB.valores[t]=DB.valores[t]||{}; DB.valores[t].divAccion=val;
  const an=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(an) an.divAccion=val;
  if(typeof saveNow==='function') saveNow();
  if(typeof fichaTicker!=='undefined' && fichaTicker && typeof renderFicha==='function') renderFicha(fichaTicker);
});
// === Interacción del gráfico de la ficha: tooltip al pasar el ratón + zoom por arrastre ===
let _fichaHov=null, _fichaHovBound=false;
function _fichaHideHover(){ const svg=document.querySelector('.fichaSvg'); if(!svg)return; const g=svg.querySelector('.fchGuide'); if(g)g.style.display='none'; const d=svg.querySelector('.fchDot'); if(d)d.style.display='none'; const wrap=svg.parentNode; const tip=wrap&&wrap.querySelector('.fchTip'); if(tip)tip.style.display='none'; }
function _fichaBindHover(){ if(_fichaHovBound)return; _fichaHovBound=true;
  // --- tooltip ---
  document.addEventListener('mousemove',e=>{
    if(_fichaDrag){ _fichaHideHover(); return; }
    const svg=(e.target&&e.target.closest)?e.target.closest('.fichaSvg'):null;
    if(!svg||!_fichaHov){ _fichaHideHover(); return; }
    const D=_fichaHov; const r=svg.getBoundingClientRect(); if(!r.width)return;
    const vx=(e.clientX-r.left)*D.W/r.width;
    let bi=0,bd=Infinity; for(let i=0;i<D.xs.length;i++){ const dd=Math.abs(D.xs[i]-vx); if(dd<bd){bd=dd;bi=i;} }
    const gx=D.xs[bi], gy=D.ys[bi];
    const g=svg.querySelector('.fchGuide'); if(g){ g.setAttribute('x1',gx); g.setAttribute('x2',gx); g.style.display=''; }
    const dot=svg.querySelector('.fchDot'); if(dot){ dot.setAttribute('cx',gx); dot.setAttribute('cy',gy); dot.style.display=''; }
    const wrap=svg.parentNode; const tip=wrap?wrap.querySelector('.fchTip'):null;
    if(tip){ let h='';
      if(D.mode==='ibex'){ const ds=D.dates[bi], sv=D.sVals[bi], iv=D.iVals[bi], rel=sv-iv;
        h=`<div style="font-weight:700;margin-bottom:2px">${ds}</div><div><span style="color:#93c5fd">${_fichaGeo?_fichaGeo.ticker:''}:</span> <b>${sv.toFixed(1)}</b></div><div style="color:#cbd5e1">IBEX: <b>${iv.toFixed(1)}</b></div><div style="margin-top:1px">rel: <b style="color:${rel>=0?'#4ade80':'#f87171'}">${rel>=0?'+':''}${rel.toFixed(1)} pp</b></div>`;
      } else {
        const price=num(D.prices[bi]); const ds=D.dates[bi];
        h=`<div style="font-weight:700;margin-bottom:2px">${ds}</div><div><span style="color:#93c5fd">Cotización:</span> <b>${fmt(price)}</b></div>`;
        if(D.avg>0){ const dv=(price-D.avg)/D.avg*100; h+=`<div style="color:#cbd5e1;margin-top:1px">vs P.medio: <b style="color:${dv>=0?'#4ade80':'#f87171'}">${dv>=0?'+':''}${dv.toFixed(1)}%</b></div>`; }
        if(D.ref){ const R=D.ref; const rr=(lbl,v)=>{ if(!(v>0))return ''; const dv=(price-v)/v*100; return `<div style="color:#cbd5e1;margin-top:1px">vs ${lbl}: <b style="color:${dv>=0?'#4ade80':'#f87171'}">${dv>=0?'+':''}${dv.toFixed(1)}%</b></div>`; }; h+=rr('entrada',R.entH)+rr('PO base',R.poM)+rr('stop',R.stop); }
        if(D.ma){ [50,200,1000].forEach(function(w){ const arr=D.ma[w]; if(!arr)return; const mv=arr[bi]; if(mv==null)return; const cc=(D.maCols&&D.maCols[w])||'#93c5fd'; h+=`<div style="margin-top:1px"><span style="color:${cc}">MM${w}:</span> <b>${fmt(mv)}</b></div>`; }); }
      }
      tip.innerHTML=h; const left=gx*r.width/D.W; tip.style.left=Math.max(64,Math.min(r.width-64,left))+'px'; tip.style.top='4px'; tip.style.display=''; }
  },{passive:true});
  // --- zoom por arrastre (brush) ---
  document.addEventListener('mousedown',e=>{ const svg=(e.target&&e.target.closest)?e.target.closest('.fichaSvg'):null; if(!svg||!_fichaGeo)return; const r=svg.getBoundingClientRect(); if(!r.width)return; const g=_fichaGeo; let vx=(e.clientX-r.left)*g.W/r.width; vx=Math.max(g.L,Math.min(g.L+g.pw,vx)); _fichaDrag={svg,r,x0:vx}; const br=svg.querySelector('.fchBrush'); if(br){ br.setAttribute('x',vx); br.setAttribute('width',0); br.style.display=''; } e.preventDefault(); });
  document.addEventListener('mousemove',e=>{ if(!_fichaDrag||!_fichaGeo)return; const g=_fichaGeo; let vx=(e.clientX-_fichaDrag.r.left)*g.W/_fichaDrag.r.width; vx=Math.max(g.L,Math.min(g.L+g.pw,vx)); const x0=_fichaDrag.x0; const br=_fichaDrag.svg.querySelector('.fchBrush'); if(br){ br.setAttribute('x',Math.min(x0,vx)); br.setAttribute('width',Math.abs(vx-x0)); } });
  document.addEventListener('mouseup',e=>{ if(!_fichaDrag||!_fichaGeo)return; const g=_fichaGeo, drag=_fichaDrag; _fichaDrag=null; const br=drag.svg.querySelector('.fchBrush'); if(br)br.style.display='none'; let vx=(e.clientX-drag.r.left)*g.W/drag.r.width; vx=Math.max(g.L,Math.min(g.L+g.pw,vx)); const xa=Math.min(drag.x0,vx), xb=Math.max(drag.x0,vx); if(xb-xa<8)return; const px2t=px=>g.t0+(px-g.L)/g.pw*(g.t1-g.t0); fichaZoom={t0:px2t(xa),t1:px2t(xb),ticker:g.ticker}; if(typeof drawFichaChart==='function')drawFichaChart(g.ticker); });
  document.addEventListener('dblclick',e=>{ const svg=(e.target&&e.target.closest)?e.target.closest('.fichaSvg'):null; if(!svg)return; if(fichaZoom){ fichaZoom=null; if(_fichaGeo&&typeof drawFichaChart==='function')drawFichaChart(_fichaGeo.ticker); } });
}
async function drawFichaChart(t){
  const el=$('#fichaChart'); if(!el)return;
  const setVar=h=>{ const v=document.getElementById('fchVar'); if(v)v.innerHTML=h||''; };
  const setZoom=h=>{ const z=document.getElementById('fchZoom'); if(z)z.innerHTML=h||''; };
  let pj=_precioCache[t];
  if(pj===undefined){ try{ const r=await fetch('precios/'+t+'.json',{cache:'no-store'}); pj=r.ok?await r.json():null; }catch(e){ pj=null; } _precioCache[t]=pj; }
  if(!pj||!pj.data||!pj.data.length){ el.innerHTML='<div class="muted" style="font-size:12px">Sin datos de cotización para '+t+'. (¿Está en precios/ del repo?)</div>'; setVar(''); setZoom(''); return; }
  const dataFull=pj.data.map(d=>[Date.parse(d[0]),d[1]]).filter(d=>!isNaN(d[0]));
  if(dataFull.length<2){ el.innerHTML='<div class="muted" style="font-size:12px">Sin datos suficientes.</div>'; setVar(''); return; }
  const lastT=dataFull[dataFull.length-1][0];
  const _rollMA=function(arr,w){ const out=new Array(arr.length).fill(null); let s=0; for(let i=0;i<arr.length;i++){ s+=arr[i][1]; if(i>=w)s-=arr[i-w][1]; if(i>=w-1)out[i]=s/w; } return out; };
  const wantMA=fichaVsIbex?[]:[50,200,1000].filter(w=>fichaMA[w]);
  const maFull={}; wantMA.forEach(w=>{ maFull[w]=_rollMA(dataFull,w); });
  // ventana visible: el zoom por arrastre manda sobre el preset
  const zoom=(fichaZoom&&fichaZoom.ticker===t)?fichaZoom:null;
  let startIdx=0, endIdx=dataFull.length-1;
  if(zoom){ while(startIdx<dataFull.length&&dataFull[startIdx][0]<zoom.t0)startIdx++; while(endIdx>0&&dataFull[endIdx][0]>zoom.t1)endIdx--; if(endIdx<startIdx)endIdx=startIdx; }
  else { const _days={'1s':7,'1m':31,'3m':92,'1a':366,'5a':1827}[fichaRange]; if(_days){ const cut=lastT-_days*86400000; while(startIdx<dataFull.length&&dataFull[startIdx][0]<cut)startIdx++; } }
  const data=dataFull.slice(startIdx,endIdx+1);
  if(data.length<2){ el.innerHTML='<div class="muted" style="font-size:12px">Pocos datos en este tramo. Amplía el rango o reinicia el zoom (doble clic).</div>'; setVar(''); return; }
  const maVis={}; wantMA.forEach(w=>{ maVis[w]=maFull[w].slice(startIdx,endIdx+1); });
  // variación / máximo / mínimo del periodo
  const firstC=data[0][1], lastC=data[data.length-1][1];
  const varPct=firstC>0?(lastC-firstC)/firstC*100:0;
  let maxC=-Infinity,minC=Infinity,maxJ=0,minJ=0;
  for(let i=0;i<data.length;i++){ const v=data[i][1]; if(v>maxC){maxC=v;maxJ=i;} if(v<minC){minC=v;minJ=i;} }
  const ddMax=maxC>0?(lastC-maxC)/maxC*100:0;
  const vcol=varPct>=0?'#16a34a':'#dc2626';
  const _fd=ms=>{ const d=new Date(ms); return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0'); };
  const _fdy=ms=>{ const d=new Date(ms); return _fd(ms)+'/'+d.getUTCFullYear(); };
  // Botones de rango a dos líneas: etiqueta + variación de ESE plazo
  const _daysMap={'1s':7,'1m':31,'3m':92,'1a':366,'5a':1827};
  const _rangeVar=key=>{ const d=_daysMap[key]; let si=0; if(d){ const cut=lastT-d*86400000; while(si<dataFull.length&&dataFull[si][0]<cut)si++; } if(si>=dataFull.length-1)return null; const f=dataFull[si][1]; return f>0?(dataFull[dataFull.length-1][1]-f)/f*100:null; };
  const _rb=[['1s','1S'],['1m','1M'],['3m','3M'],['1a','1A'],['5a','5A'],['all','Máx']].map(r=>{ const vp=_rangeVar(r[0]); const vc=(vp==null)?'#94a3b8':(vp>=0?'#16a34a':'#dc2626'); const vt=(vp==null)?'—':((vp>=0?'+':'')+vp.toFixed(1)+'%'); return _fichaRangeBtn(r[0],r[1],vt,vc,(fichaRange===r[0]&&!zoom)); }).join('');
  const _rc=document.getElementById('fchRange'); if(_rc)_rc.innerHTML=_rb;
  // El % del periodo ya sale en cada botón; con zoom (sin botón) va junto al chip, en el medio.
  if(zoom){ setVar(`<span style="color:${vcol};font-weight:800;font-size:13px">${varPct>=0?'+':''}${varPct.toFixed(1)}%</span>`); setZoom(`<span style="background:#eef2ff;color:#3730a3;border-radius:6px;padding:2px 8px;font-size:11px">🔍 ${_fdy(data[0][0])}–${_fdy(data[data.length-1][0])} <b data-fzreset="1" style="cursor:pointer" title="Reiniciar zoom">✕</b></span>`); }
  else { setVar(''); setZoom(''); }
  const MAXP=600; const step=Math.max(1,Math.ceil(data.length/MAXP));
  const idxs=[]; for(let i=0;i<data.length;i+=step)idxs.push(i); if(idxs[idxs.length-1]!==data.length-1)idxs.push(data.length-1);
  const W=860,H=280,L=52,R=12,Tp=12,B=26; const pw=W-L-R, ph=H-Tp-B;
  const t0=data[0][0], t1=data[data.length-1][0];
  const X=x=>L+(x-t0)/((t1-t0)||1)*pw;
  _fichaGeo={W,L,pw,t0,t1,ticker:t};
  const brush=`<rect class="fchBrush" x="0" y="${Tp}" width="0" height="${ph.toFixed(1)}" fill="#2563eb" opacity="0.12" style="display:none"/>`;
  const clip=`<clipPath id="fchClip"><rect x="${L}" y="${Tp}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}"/></clipPath>`;

  // ===== MODO vs IBEX (ambos rebasados a base 100 al inicio del tramo) =====
  if(fichaVsIbex){
    let ij=_precioCache['__IBEX__'];
    if(ij===undefined){ try{ const r=await fetch('precios/IBEX.json',{cache:'no-store'}); ij=r.ok?await r.json():null; }catch(e){ ij=null; } _precioCache['__IBEX__']=ij; }
    if(!ij||!ij.data||!ij.data.length){ el.innerHTML='<div class="muted" style="font-size:12px">Sin datos del IBEX (¿precios/IBEX.json en el repo?).</div>'; return; }
    const ibx={}; ij.data.forEach(d=>{ ibx[d[0]]=d[1]; });
    const pairs=[]; for(let i=0;i<data.length;i++){ const ds=new Date(data[i][0]).toISOString().slice(0,10); const iv=ibx[ds]; if(iv!=null)pairs.push([data[i][0],data[i][1],iv]); }
    if(pairs.length<2){ el.innerHTML='<div class="muted" style="font-size:12px">No hay solape de fechas con el IBEX en este tramo.</div>'; return; }
    const s0=pairs[0][1], i0=pairs[0][2];
    const sRe=pairs.map(p=>[p[0],p[1]/s0*100]), iRe=pairs.map(p=>[p[0],p[2]/i0*100]);
    let lo=Infinity,hi=-Infinity; sRe.forEach(p=>{ if(p[1]<lo)lo=p[1]; if(p[1]>hi)hi=p[1]; }); iRe.forEach(p=>{ if(p[1]<lo)lo=p[1]; if(p[1]>hi)hi=p[1]; });
    const pad=(hi-lo)*0.06||1; lo-=pad; hi+=pad;
    const tb0=pairs[0][0], tb1=pairs[pairs.length-1][0];
    const Xb=x=>L+(x-tb0)/((tb1-tb0)||1)*pw, Yb=v=>Tp+(1-(v-lo)/((hi-lo)||1))*ph;
    _fichaGeo={W,L,pw,t0:tb0,t1:tb1,ticker:t};
    const stepB=Math.max(1,Math.ceil(pairs.length/MAXP)); const jb=[]; for(let i=0;i<pairs.length;i+=stepB)jb.push(i); if(jb[jb.length-1]!==pairs.length-1)jb.push(pairs.length-1);
    let sp='',ip=''; jb.forEach((i,k)=>{ sp+=(k?'L':'M')+Xb(sRe[i][0]).toFixed(1)+','+Yb(sRe[i][1]).toFixed(1)+' '; ip+=(k?'L':'M')+Xb(iRe[i][0]).toFixed(1)+','+Yb(iRe[i][1]).toFixed(1)+' '; });
    let grid=''; const NY=4; for(let i=0;i<=NY;i++){ const v=lo+(hi-lo)*i/NY, y=Yb(v); grid+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#e2e8f0"/><text x="${L-5}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748b">${v.toFixed(0)}</text>`; }
    const y100=Yb(100); const base100=`<line x1="${L}" y1="${y100.toFixed(1)}" x2="${W-R}" y2="${y100.toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3"/><text x="${L+3}" y="${(y100-2).toFixed(1)}" font-size="9" fill="#64748b">base 100</text>`;
    let xl=''; const yA=new Date(tb0).getFullYear(), yB=new Date(tb1).getFullYear(); const sY=Math.ceil((yB-yA+1)/8)||1; for(let y=yA;y<=yB;y+=sY){ const ts=Date.parse(y+'-01-01'); if(ts<tb0||ts>tb1)continue; const x=Xb(ts); xl+=`<line x1="${x.toFixed(1)}" y1="${Tp}" x2="${x.toFixed(1)}" y2="${Tp+ph}" stroke="#f1f5f9"/><text x="${x.toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="#64748b">${y}</text>`; }
    const rel=sRe[sRe.length-1][1]-iRe[iRe.length-1][1], relCol=rel>=0?'#16a34a':'#dc2626';
    const xs=jb.map(i=>Xb(sRe[i][0])), ys=jb.map(i=>Yb(sRe[i][1])), dts=jb.map(i=>_fdy(sRe[i][0])), sV=jb.map(i=>sRe[i][1]), iV=jb.map(i=>iRe[i][1]);
    _fichaHov={mode:'ibex',W,xs,ys,dates:dts,sVals:sV,iVals:iV}; _fichaBindHover();
    const guide=`<line class="fchGuide" x1="0" x2="0" y1="${Tp}" y2="${(Tp+ph).toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" style="display:none"/>`;
    const hoverDot=`<circle class="fchDot" r="4" fill="var(--brand)" stroke="#fff" stroke-width="1.5" style="display:none"/>`;
    const tip=`<div class="fchTip" style="display:none;position:absolute;pointer-events:none;background:#0f172a;color:#fff;font-size:11.5px;line-height:1.35;padding:6px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);z-index:20;white-space:nowrap;transform:translateX(-50%)"></div>`;
    el.innerHTML=`<div style="position:relative"><svg class="fichaSvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;cursor:crosshair" xmlns="http://www.w3.org/2000/svg"><defs>${clip}</defs>${grid}${xl}${base100}${guide}<g clip-path="url(#fchClip)"><path d="${ip}" fill="none" stroke="#94a3b8" stroke-width="1.4"/><path d="${sp}" fill="none" stroke="var(--brand)" stroke-width="1.8"/></g>${brush}${hoverDot}</svg>${tip}</div><div class="muted" style="font-size:11px;margin-top:2px"><b style="color:var(--brand)">▬</b> ${t} · <b style="color:#94a3b8">▬</b> IBEX (base 100 al inicio) · rel: <b style="color:${relCol}">${rel>=0?'+':''}${rel.toFixed(1)} pp</b> · ${t} <span style="color:${vcol}">${varPct>=0?'+':''}${varPct.toFixed(1)}%</span> · arrastra para zoom, doble clic reinicia · medias y niveles ocultos en este modo</div>`;
    return;
  }

  // ===== MODO precio (normal) =====
  let pts=idxs.map(i=>data[i]);
  const poss=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.ticker===t&&p.acciones>0.0001);
  let acc=0,cost=0; poss.forEach(p=>{acc+=p.acciones;cost+=p.acciones*p.precioCompra;}); const avg=acc?cost/acc:0;
  const _an=(DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===(t||'').toUpperCase())||{}; const poB=num(_an.poMin),poU=num(_an.poMax),poM=(num(_an.poMin)&&num(_an.poMax))?(num(_an.poMin)+num(_an.poMax))/2:(num(_an.poMax)||num(_an.poMin)||0); const entL=num(_an.entMin),entH=num(_an.entMax),stopV=num(_an.stopTesis);
  const ops=(typeof fichaOps==='function'?fichaOps(t):[]).filter(o=>o.fecha&&Date.parse(o.fecha)>=t0&&Date.parse(o.fecha)<=t1).map(o=>({x:Date.parse(o.fecha),p:o.precio,venta:o.tipo==='venta'}));
  let lo=Math.min(...pts.map(p=>p[1])), hi=Math.max(...pts.map(p=>p[1]));
  ops.forEach(o=>{ if(o.p){ if(o.p<lo)lo=o.p; if(o.p>hi)hi=o.p; } }); if(avg){ if(avg<lo)lo=avg; if(avg>hi)hi=avg; } [poB,poM,poU].forEach(v=>{ if(v>0){ if(v<lo)lo=v; if(v>hi)hi=v; } }); [entL,entH,stopV].forEach(v=>{ if(v>0){ if(v<lo)lo=v; if(v>hi)hi=v; } });
  const pad=(hi-lo)*0.06||1; lo-=pad; hi+=pad;
  const Y=v=>Tp+(1-(v-lo)/((hi-lo)||1))*ph;
  let path=''; pts.forEach((p,i)=>{ path+=(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)+' '; });
  const _maCols={50:'#0891b2',200:'#ea580c',1000:'#475569'};
  let maPaths=''; wantMA.forEach(w=>{ const arr=maVis[w]; let dstr='',started=false; idxs.forEach(i=>{ const v=arr[i]; if(v==null)return; dstr+=(started?'L':'M')+X(data[i][0]).toFixed(1)+','+Y(v).toFixed(1)+' '; started=true; }); if(dstr)maPaths+=`<path d="${dstr}" fill="none" stroke="${_maCols[w]}" stroke-width="1.3" opacity="0.9"/>`; });
  let grid=''; const NY=4; for(let i=0;i<=NY;i++){ const v=lo+(hi-lo)*i/NY, y=Y(v); grid+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#e2e8f0"/><text x="${L-5}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748b">${v.toFixed(2)}</text>`; }
  let xl=''; const yA=new Date(t0).getFullYear(), yB=new Date(t1).getFullYear(); const sY=Math.ceil((yB-yA+1)/8)||1; for(let y=yA;y<=yB;y+=sY){ const ts=Date.parse(y+'-01-01'); if(ts<t0||ts>t1)continue; const x=X(ts); xl+=`<line x1="${x.toFixed(1)}" y1="${Tp}" x2="${x.toFixed(1)}" y2="${Tp+ph}" stroke="#f1f5f9"/><text x="${x.toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="#64748b">${y}</text>`; }
  let avgL=''; if(avg){ const y=Y(avg); avgL=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#7c3aed" stroke-width="1.2" stroke-dasharray="5 3"/><text x="${W-R}" y="${(y-3).toFixed(1)}" text-anchor="end" font-size="9" fill="#7c3aed">P.medio ${avg.toFixed(2)}</text>`; }
  let poBand=''; if(poB>0&&poU>0){ const yTop=Y(Math.max(poB,poU)), yBot=Y(Math.min(poB,poU)); poBand=`<rect x="${L}" y="${yTop.toFixed(1)}" width="${pw.toFixed(1)}" height="${(yBot-yTop).toFixed(1)}" fill="#16a34a" opacity="0.10"/>`; }
  let entBand=''; if(entL>0&&entH>0){ const yTop=Y(Math.max(entL,entH)), yBot=Y(Math.min(entL,entH)); entBand=`<rect x="${L}" y="${yTop.toFixed(1)}" width="${pw.toFixed(1)}" height="${(yBot-yTop).toFixed(1)}" fill="#0ea5e9" opacity="0.12"/>`; }
  let stopL=''; if(stopV>0){ const y=Y(stopV); stopL=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#dc2626" stroke-width="2" opacity="0.95"/><text x="${L+3}" y="${(y-2).toFixed(1)}" font-size="9" fill="#dc2626">Stop ${stopV.toFixed(2)}</text>`; }
  let poL=''; [['bear',poB,'#dc2626',2],['base',poM,'#2563eb',1.1],['bull',poU,'#16a34a',2]].forEach(it=>{ const v=it[1]; if(v>0){ const y=Y(v); poL+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="${it[2]}" stroke-width="${it[3]}" stroke-dasharray="${it[3]>=2?'7 3':'2 3'}" opacity="0.9"/><text x="${L+3}" y="${(y-2).toFixed(1)}" font-size="9" fill="${it[2]}">PO ${it[0]} ${v.toFixed(2)}</text>`; } });
  let mk=''; ops.forEach(o=>{ if(!o.p)return; mk+=`<circle cx="${X(o.x).toFixed(1)}" cy="${Y(o.p).toFixed(1)}" r="4" fill="${o.venta?'#dc2626':'#16a34a'}" stroke="#fff" stroke-width="1"><title>${o.venta?'Venta':'Compra'} ${new Date(o.x).toISOString().slice(0,10)} @ ${o.p.toFixed(3)}</title></circle>`; });
  const mmk=`<circle cx="${X(data[maxJ][0]).toFixed(1)}" cy="${Y(maxC).toFixed(1)}" r="3.4" fill="#9333ea"/><text x="${X(data[maxJ][0]).toFixed(1)}" y="${(Y(maxC)-5).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#9333ea">máx ${maxC.toFixed(2)}</text><circle cx="${X(data[minJ][0]).toFixed(1)}" cy="${Y(minC).toFixed(1)}" r="3.4" fill="#ea580c"/><text x="${X(data[minJ][0]).toFixed(1)}" y="${(Y(minC)+11).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#ea580c">mín ${minC.toFixed(2)}</text>`;
  const last=pts[pts.length-1][1];
  const xs=pts.map(p=>X(p[0])), ys=pts.map(p=>Y(p[1])), prices=pts.map(p=>p[1]);
  const dates=pts.map(p=>_fdy(p[0]));
  const maSampled={}; wantMA.forEach(w=>{ maSampled[w]=idxs.map(i=>maVis[w][i]); });
  _fichaHov={mode:'price',W,xs,ys,prices,dates,avg,ma:maSampled,maCols:_maCols,ref:{entH:entH,poM:poM,poU:poU,poB:poB,stop:stopV}}; _fichaBindHover();
  const guide=`<line class="fchGuide" x1="0" x2="0" y1="${Tp}" y2="${(Tp+ph).toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" style="display:none"/>`;
  const hoverDot=`<circle class="fchDot" r="4" fill="var(--brand)" stroke="#fff" stroke-width="1.5" style="display:none"/>`;
  const tip=`<div class="fchTip" style="display:none;position:absolute;pointer-events:none;background:#0f172a;color:#fff;font-size:11.5px;line-height:1.35;padding:6px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);z-index:20;white-space:nowrap;transform:translateX(-50%)"></div>`;
  const maLeg=wantMA.map(w=>`<span style="color:${_maCols[w]}">▬</span> MM${w}`).join(' · ');
  el.innerHTML=`<div style="position:relative"><svg class="fichaSvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;cursor:crosshair" xmlns="http://www.w3.org/2000/svg"><defs>${clip}</defs>${grid}${xl}${entBand}${poBand}<path d="${path}" fill="none" stroke="var(--brand)" stroke-width="1.6"/><g clip-path="url(#fchClip)">${maPaths}</g>${poL}${stopL}${avgL}${mk}${mmk}${brush}${hoverDot}</svg>${tip}</div><div class="muted" style="font-size:11px;margin-top:2px">Periodo: <b style="color:${vcol}">${varPct>=0?'+':''}${varPct.toFixed(1)}%</b> · máx ${maxC.toFixed(2)} (${_fd(data[maxJ][0])}) · mín ${minC.toFixed(2)} (${_fd(data[minJ][0])}) · desde máx <b style="color:${ddMax<0?'#dc2626':'#16a34a'}">${ddMax>=0?'+':''}${ddMax.toFixed(1)}%</b><br>Último cierre ${last.toFixed(2)} (${pj.data[pj.data.length-1][0]}) · arrastra para zoom, doble clic reinicia · <span style="color:#16a34a">●</span> compra · <span style="color:#dc2626">●</span> venta · <span style="color:#7c3aed">▬</span> P.medio · <span style="color:#2563eb">▬</span> PO · <span style="color:#0ea5e9">▬</span> entrada · <span style="color:#dc2626">▬</span> stop · <span style="color:#9333ea">●</span> máx · <span style="color:#ea580c">●</span> mín${maLeg?' · '+maLeg:''}</div>`;
}
function validarUrlInv(){
  const u=($('#finvUrl').value||'').trim();
  if(u && !/^https?:\/\//i.test(u)){ alert('La URL debe empezar por http:// o https://'); return; }
  DB.valores=DB.valores||{}; DB.valores[fichaTicker]=DB.valores[fichaTicker]||{};
  if(u){ DB.valores[fichaTicker].urlInvesting=u; } else { delete DB.valores[fichaTicker].urlInvesting; }
  saveNow(); renderFicha(fichaTicker);
  alert(u?'Enlace guardado. La ficha usará esta URL.':'Enlace borrado. Se vuelve a la búsqueda genérica.');
}
function addFichaDiv(){
  const fch=$('#fdivFecha').value, imp=num($('#fdivImp').value);
  if(!fch||!imp){alert('Pon fecha e importe del dividendo.');return;}
  if(imp<0){alert('El importe del dividendo no puede ser negativo.');return;}
  { const _d=new Date(fch+'T00:00:00'); const _y=_d.getFullYear(); if(isNaN(_d.getTime())||_y<1990||_y>new Date().getFullYear()+1){ alert('La fecha «'+fch+'» no parece válida.'); return; } }
  DB.dividendos=DB.dividendos||{}; DB.dividendos[fichaTicker]=DB.dividendos[fichaTicker]||[];
  DB.dividendos[fichaTicker].push({fecha:fch,importe:imp,id:'d'+Math.random().toString(36).slice(2,9)}); saveNow(); renderFicha(fichaTicker);
}
function cerradaCalc(c){
  if(c && c.ops && c.ops.length){
    const buys=c.ops.filter(o=>o.tipo!=='venta'), sells=c.ops.filter(o=>o.tipo==='venta');
    const acc=buys.reduce((s,o)=>s+num(o.acciones),0);
    const coste=buys.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0);
    const venta=sells.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0);
    const dv=(c.divs||[]).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
    let dividendos=0; const byYear={};
    dv.forEach(d=>{ const held=buys.filter(o=>o.fecha<=d.fecha).reduce((s,o)=>s+num(o.acciones),0)-sells.filter(o=>o.fecha<=d.fecha).reduce((s,o)=>s+num(o.acciones),0); const eur=held*num(d.importe); dividendos+=eur; const y=(d.fecha||'').slice(0,4); if(y)byYear[y]=(byYear[y]||0)+eur; });
    return {id:c.id,ticker:c.ticker,nombre:c.nombre,cartera:c.cartera||'Propia',acciones:acc,coste,venta,dividendos,byYear,fechaCompra:buys.map(o=>o.fecha).filter(Boolean).sort()[0]||c.fechaCompra||'',fechaVenta:sells.map(o=>o.fecha).filter(Boolean).sort().slice(-1)[0]||c.fechaVenta||''};
  }
  const byYear={}; if(c.fechaVenta) byYear[(c.fechaVenta||'').slice(0,4)]=num(c.dividendos);
  return {id:c.id,ticker:c.ticker,nombre:c.nombre,cartera:c.cartera||'Propia',acciones:num(c.acciones),coste:num(c.coste),venta:num(c.venta),dividendos:num(c.dividendos),byYear,fechaCompra:c.fechaCompra||'',fechaVenta:c.fechaVenta||''};
}
function archivarCerrada(ticker){
  const t=(ticker||'').toUpperCase();
  const ops=(DB.operaciones||[]).filter(o=>(o.ticker||'').toUpperCase()===t);
  if(!ops.length){alert('No hay operaciones de '+t);return;}
  const buys=ops.filter(o=>o.tipo!=='venta'), sells=ops.filter(o=>o.tipo==='venta');
  const bSh=buys.reduce((s,o)=>s+num(o.acciones),0), sSh=sells.reduce((s,o)=>s+num(o.acciones),0);
  if(!(sSh>0.0001 && Math.abs(bSh-sSh)<0.0001)){ alert(t+' no está cerrada (acciones ≠ 0).'); return; }
  if(!confirm('¿Archivar '+t+' como posición cerrada permanente?\nSe quitará de operaciones activas; una nueva compra empezará un ciclo nuevo sin mezclar.')) return;
  const first=buys.map(o=>o.fecha).filter(Boolean).sort()[0]||''; const last=sells.map(o=>o.fecha).filter(Boolean).sort().slice(-1)[0]||'';
  const dvs=((DB.dividendos||{})[t]||[]).filter(d=>(!first||d.fecha>=first)&&(!last||d.fecha<=last)).map(d=>({fecha:d.fecha,importe:num(d.importe)}));
  const v=(DB.valores||{})[t]||{};
  DB.cerradas=DB.cerradas||[];
  DB.cerradas.push({id:'c'+Math.random().toString(36).slice(2,9),ticker:t,nombre:v.nombre||t,cartera:(buys[0]&&buys[0].cartera)||'Propia',ops:ops.map(o=>({fecha:o.fecha,tipo:o.tipo==='venta'?'venta':'compra',acciones:num(o.acciones),precio:num(o.precio)})),divs:dvs});
  DB.operaciones=(DB.operaciones||[]).filter(o=>(o.ticker||'').toUpperCase()!==t);
  if(DB.dividendos&&DB.dividendos[t]){ DB.dividendos[t]=DB.dividendos[t].filter(d=>!((!first||d.fecha>=first)&&(!last||d.fecha<=last))); if(!DB.dividendos[t].length) delete DB.dividendos[t]; }
  saveNow(); renderInv(); renderDividendos(); alert(t+' archivada como posición cerrada.');
}
function invClosedComputed(){
  const ops=DB.operaciones||[]; const res=[];
  [...new Set(ops.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean))].forEach(t=>{
    const tops=ops.filter(o=>(o.ticker||'').toUpperCase()===t);
    const buys=tops.filter(o=>o.tipo!=='venta'), sells=tops.filter(o=>o.tipo==='venta');
    const bSh=buys.reduce((s,o)=>s+num(o.acciones),0), sSh=sells.reduce((s,o)=>s+num(o.acciones),0);
    if(sSh>0.0001 && Math.abs(bSh-sSh)<0.0001){
      const coste=buys.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0);
      const venta=sells.reduce((s,o)=>s+num(o.acciones)*num(o.precio),0);
      const td=((DB.dividendos||{})[t]||[]).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
      let div=0; td.forEach(d=>{ const acc=buys.filter(o=>o.fecha<=d.fecha).reduce((s,o)=>s+num(o.acciones),0)-sells.filter(o=>o.fecha<=d.fecha).reduce((s,o)=>s+num(o.acciones),0); div+=acc*num(d.importe); });
      res.push({ticker:t,nombre:((DB.valores||{})[t]||{}).nombre||t,cartera:(buys[0]&&buys[0].cartera)||'Propia',acciones:bSh,coste,venta,dividendos:div,fechaCompra:buys.map(o=>o.fecha).filter(Boolean).sort()[0]||'',fechaVenta:sells.map(o=>o.fecha).filter(Boolean).sort().slice(-1)[0]||''});
    }
  });
  return res;
}
function renderInvClosed(){
  const el=$('#invClosed'); if(!el)return;
  const arch=(DB.cerradas||[]).map(c=>cerradaCalc(c)); arch.forEach(a=>a._arch=true);
  const archT=new Set(arch.map(a=>(a.ticker||'').toUpperCase()));
  const comp=invClosedComputed().filter(c=>!archT.has(c.ticker)).map(c=>Object.assign({},c,{_arch:false}));
  const lst=[...arch,...comp].sort((a,b)=>(b.fechaVenta||'').localeCompare(a.fechaVenta||''));
  if(!lst.length){ el.innerHTML=''; return; }
  const fdate=x=>x?ddmmyyyy(x):'—';
  let sC=0,sV=0,sD=0;
  const rows=lst.map(p=>{
    const pc=p.acciones?p.coste/p.acciones:0, pv=p.acciones?p.venta/p.acciones:0;
    const neto=p.venta-p.coste+p.dividendos, rent=p.coste?neto/p.coste:0;
    sC+=p.coste; sV+=p.venta; sD+=p.dividendos;
    const act=p._arch?`<button class="btn red sm" data-delcerrada="${p.id}" title="Quitar de archivadas">✕</button>`:`<button class="btn ghost sm" data-archive="${p.ticker}" title="Archivar permanente">Archivar</button>`;
    return `<tr class="mt-row"><td class="emp"><span class="mt-arw">▶</span><b data-ficha="${p.ticker}" style="cursor:pointer;color:var(--brand)">${p.ticker}</b> <span style="font-weight:600;color:#334155;font-size:11.5px">${p.nombre||''}</span></td><td>${fmt(p.coste)}</td><td><b>${fmt(p.venta)}</b></td><td><span class="${neto>=0?'mt-pos':'mt-neg'}" style="font-weight:700">${neto>=0?'+':''}${fmt(neto)}</span></td><td><span class="mt-pill ${rent>=0?'g':'r'}">${(rent>=0?'+':'')+(rent*100).toFixed(1)+'%'}</span></td><td class="l" style="color:#94a3b8;font-size:11px;white-space:nowrap">${fdate(p.fechaCompra)} → ${fdate(p.fechaVenta)}</td><td class="c">${act}</td></tr><tr class="mt-det"><td colspan="7"><div class="mt-nums">${_mtNum('Acciones',p.acciones)}${_mtNum('P. compra',fmt(pc))}${_mtNum('P. venta',fmt(pv))}${_mtNum('Dividendos cobrados',fmt(p.dividendos),'mt-pos')}</div></td></tr>`;
  }).join('');
  const netoT=sV-sC+sD, rentT=sC?netoT/sC:0;
  const sub=`<tr class="mt-sub"><td class="l">TOTAL · ${lst.length} cerradas</td><td>${fmt(sC)}</td><td><b>${fmt(sV)}</b></td><td class="${netoT>=0?'mt-pos':'mt-neg'}">${netoT>=0?'+':''}${fmt(netoT)}</td><td><span class="mt-pill ${rentT>=0?'g':'r'}">${(rentT>=0?'+':'')+(rentT*100).toFixed(1)+'%'}</span></td><td></td><td></td></tr>`;
  const head='<tr><th class="l">Empresa</th><th>Coste</th><th>Venta</th><th>P/G neta</th><th>Rent.</th><th class="l">Periodo</th><th></th></tr>';
  if(window._invClosedOpen===undefined)window._invClosedOpen=false;
  const op=window._invClosedOpen?' open':'';
  el.innerHTML=`<div class="pos-blk${op}" data-invclosedblk="1" style="margin-top:12px"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">⚪ Posiciones cerradas</span><span class="bsum">${lst.length} cerradas · P/G neta <b class="${netoT>=0?'pos':'neg'}">${netoT>=0?'+':''}${fmt(netoT)}</b> (incl. dividendos) · «Archivar» fija el ciclo</span></div><div class="pos-blk-b"><div class="mt-wrap"><table class="mt-tbl"><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div></div></div>`;
  if(!el._invClosedBound){ el._invClosedBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],[data-archive],[data-delcerrada],a,button'))return; var rr=e.target.closest('tr.mt-row'); if(rr){ rr.classList.toggle('open'); return; } var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); window._invClosedOpen=b.classList.contains('open'); } }); }
}
function autoFitTable(id,minPx,maxPx){ const w=$('#'+id); if(!w)return; const t=w.querySelector('table'); if(!t)return; if(!w.clientWidth)return; let fs=maxPx; t.style.fontSize=fs+'px'; let g=0; while(t.scrollWidth>w.clientWidth+1 && fs>minPx && g<50){ fs-=0.5; t.style.fontSize=fs+'px'; g++; } }
function fitDividendos(){ autoFitTable('divMatrixWrap',8,12); autoFitTable('divResumenWrap',8,12); }
/* ===== Alerta temprana de recorte de dividendo =====
   Señal para empresas en cartera: caída del DPA (histórico o previsto en Evolución Dividendo)
   y, si hay fundamentales.json cargado, payout muy alto con BPA cayendo. Nivel 1=medio, 2=alto. */
function _divRiesgoScan(){
  const nowY=new Date().getFullYear();
  const held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  const dpaAll=DB.divPorAccion||{};
  const fmap={}; try{ if(typeof _radFundCache!=='undefined' && _radFundCache && _radFundCache.empresas){ _radFundCache.empresas.forEach(f=>{ fmap[(''+f.ticker).toUpperCase()]=f; }); } }catch(e){}
  const out=[];
  held.forEach(t=>{
    const o=dpaAll[t]||{};
    const ys=Object.keys(o).map(Number).filter(y=>num(o[y])>0).sort((a,b)=>a-b);
    const razones=[]; let nivel=0;
    if(ys.length>=2){ const last=ys[ys.length-1], prev=ys[ys.length-2]; const vLast=num(o[last]), vPrev=num(o[prev]); if(vLast<vPrev*0.98){ const caida=1-vLast/vPrev; razones.push('DPA '+last+' −'+(caida*100).toFixed(0)+'% vs '+prev); nivel=Math.max(nivel, caida>=0.15?2:1); } }
    let firmeY=null, firmeV=0; ys.forEach(y=>{ if(y<=nowY){ firmeY=y; firmeV=num(o[y]); } });
    if(firmeV>0){ [nowY+1,nowY+2].forEach(fy=>{ const v=num(o[fy]); if(v>0 && v<firmeV*0.98){ const c=1-v/firmeV; razones.push('previsión '+fy+' −'+(c*100).toFixed(0)+'% vs '+firmeY); nivel=Math.max(nivel, c>=0.15?2:1); } }); }
    const f=fmap[t]; const payoutAlto=!!(f&&f.payout!=null&&f.payout>90); const bpaCae=!!(f&&f.crecBpa!=null&&f.crecBpa<0); const irregular=!!(f&&(f.flags||[]).some(x=>/irregular/i.test(x)));
    if(nivel>0){ if(payoutAlto)razones.push('payout '+Math.round(f.payout)+'%'); if(bpaCae)razones.push('BPA cayendo'); if(irregular)razones.push('div. irregular'); if(payoutAlto&&bpaCae)nivel=2; }
    else if(payoutAlto&&bpaCae){ nivel=1; razones.push('payout '+Math.round(f.payout)+'% + BPA cayendo'); if(irregular)razones.push('div. irregular'); }
    if(nivel>0 && razones.length) out.push({t,nivel,razones});
  });
  out.sort((a,b)=> b.nivel-a.nivel || a.t.localeCompare(b.t));
  return out;
}
function dividendoAlertas(){ return _divRiesgoScan().map(r=>({pri:r.nivel>=2?1:3, cls:r.nivel>=2?'r':'a', goto:'dividendos', tick:r.t, txt:'✂️ <b>'+r.t+'</b> — posible recorte de dividendo: '+r.razones.join(' · ')})); }
function _divRiesgoCardHTML(){
  const scan=_divRiesgoScan(); if(!scan.length)return '';
  const rows=scan.map(r=>{ const col=r.nivel>=2?'#dc2626':'#d97706'; const chip=r.nivel>=2?'Alto':'Medio'; return '<tr><td><b data-ficha="'+r.t+'" style="cursor:pointer;color:var(--brand)">'+r.t+'</b></td><td style="color:'+col+';font-weight:700">'+chip+'</td><td style="font-size:12px">'+r.razones.join(' · ')+'</td></tr>'; }).join('');
  return '<div class="card" style="background:#fff7ed;border:1px solid #fed7aa;margin-bottom:12px"><div style="font-weight:700;color:#9a3412;margin-bottom:4px">✂️ Riesgo de recorte de dividendo ('+scan.length+')</div><div class="sub" style="margin-bottom:6px">Señal temprana: caída del DPA (histórico o previsto en <b>Evolución Dividendo</b>) y, si hay <code>fundamentales.json</code>, payout muy alto con BPA cayendo. Es un filtro de alerta, no recomendación.</div><div style="overflow:auto"><table style="width:100%"><thead><tr><th>Empresa</th><th>Riesgo</th><th>Motivo</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
function renderDividendos(){
  { const _rw=document.getElementById('divRiesgoWrap'); if(_rw)_rw.innerHTML=(typeof _divRiesgoCardHTML==='function')?_divRiesgoCardHTML():''; }
  const ops=(DB.operaciones||[]).slice();
  const divs=DB.dividendos||{}; const valores=DB.valores||{};
  const divIng=DB.divIngresos||{};
  const opTickers=new Set(ops.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean));
  const tickers=[...new Set([...Object.keys(divs), ...opTickers, ...Object.keys(divIng)])].filter(Boolean);
  const byTY={}; const yearsSet=new Set();
  tickers.forEach(t=>{
    byTY[t]={};
    if(opTickers.has(t)){
      const tops=ops.filter(o=>(o.ticker||'').toUpperCase()===t);
      const td=(divs[t]||[]).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
      td.forEach(d=>{ const y=(d.fecha||'').slice(0,4); if(!y)return;
        const acc=tops.filter(o=>o.tipo!=='venta'&&o.fecha<=d.fecha).reduce((s,o)=>s+num(o.acciones),0)-tops.filter(o=>o.tipo==='venta'&&o.fecha<=d.fecha).reduce((s,o)=>s+num(o.acciones),0);
        byTY[t][y]=(byTY[t][y]||0)+acc*num(d.importe); yearsSet.add(y); });
    } else if(divIng[t]){
      Object.keys(divIng[t]).forEach(y=>{ byTY[t][y]=num(divIng[t][y]); yearsSet.add(y); });
    }
  });
  ops.forEach(o=>{ const y=(o.fecha||'').slice(0,4); if(y)yearsSet.add(y); });
  (DB.cerradas||[]).forEach(c=>{ const cc=cerradaCalc(c); const t=(cc.ticker||'').toUpperCase(); if(!t)return; byTY[t]=byTY[t]||{}; Object.keys(cc.byYear).forEach(y=>{ byTY[t][y]=(byTY[t][y]||0)+cc.byYear[y]; yearsSet.add(y); }); if(!tickers.includes(t)) tickers.push(t); });
  const years=[...yearsSet].sort();
  const totT={}; tickers.forEach(t=>{ totT[t]=Object.values(byTY[t]).reduce((s,x)=>s+x,0); });
  const cols=tickers.filter(t=>totT[t]>0).sort((a,b)=>totT[b]-totT[a]);
  const nm=t=>(valores[t]&&valores[t].nombre)?valores[t].nombre:t;
  const totYear={}; years.forEach(y=>{ totYear[y]=cols.reduce((s,t)=>s+(byTY[t][y]||0),0); });
  const grand=cols.reduce((s,t)=>s+totT[t],0);
  // KPIs héroe
  const ultimo=years.filter(y=>totYear[y]>0).slice(-1)[0]||'—';
  $('#divKpis').innerHTML='<div class="pos-kpis">'
    +`<div class="k hero"><div class="l">Total cobrado (bruto)</div><div class="v">${fmt(grand)}</div><div class="p">histórico acumulado, en bruto</div></div>`
    +`<div class="k"><div class="l">Total neto (−19%)</div><div class="v">${fmt(grand*0.81)}</div><div class="p">tras retención del 19%</div></div>`
    +`<div class="k"><div class="l">Cobrado ${ultimo}</div><div class="v">${ultimo==='—'?'—':fmt(totYear[ultimo]||0)}</div><div class="p">último año con cobros</div></div>`
    +`<div class="k"><div class="l">Empresas que pagan</div><div class="v">${cols.length}</div><div class="p">reparten dividendo</div></div>`
    +'</div>';
  // ---- MATRIZ empresa × año ----
  const mHead='<tr><th>Año</th>'+cols.map(t=>`<th class="num" title="${nm(t)}"><span class="dtk" data-ficha="${t}" style="cursor:pointer">${t}</span></th>`).join('')+'<th class="num">TOTAL</th></tr>';
  let mBody=''; [...years].reverse().forEach(y=>{ if(!totYear[y])return; const tds=cols.map(t=>{const v=byTY[t][y]||0; return `<td class="num">${v?fmt(v):'<span class="dot">·</span>'}</td>`;}).join(''); mBody+=`<tr><td class="l"><b>${y}</b></td>${tds}<td class="num tot">${fmt(totYear[y])}</td></tr>`; });
  const mFoot=`<tr class="d-tot"><td class="l">TOTAL</td>${cols.map(t=>`<td class="num">${fmt(totT[t])}</td>`).join('')}<td class="num">${fmt(grand)}</td></tr>`;
  const matrizDesk=cols.length?`<div class="ptable"><table><thead>${mHead}</thead><tbody>${mBody}${mFoot}</tbody></table></div>`:'<div class="empty">Sin dividendos registrados todavía.</div>';
  const matrizMob=[...years].reverse().filter(y=>totYear[y]>0).map(y=>{ const chips=cols.map(t=>{const v=byTY[t][y]||0;return v?`<span class="dchip"><b>${t}</b> ${fmt(v).replace(' €','')}</span>`:'';}).filter(Boolean).join(''); return `<div class="lcard"><div class="lc-h"><div class="tk">${y}</div><div class="ty g">${fmt(totYear[y])}<span>cobrado</span></div></div><div class="dchips">${chips}</div></div>`; }).join('');
  const matrizBlk=`<div class="d-note">Calculado con tus operaciones y el histórico de dividendos por acción. Importes <b>brutos</b> en €.</div><div class="pos-desk">${matrizDesk}</div><div class="pos-mob">${matrizMob}</div>`;
  // ---- EVOLUCIÓN (barras neto + retención) ----
  const yrAsc=[...years].filter(y=>totYear[y]>0).map(y=>({y,bruto:totYear[y]}));
  const evolBlk=`<div class="d-note">Cada barra es el dividendo cobrado ese año: en verde el <b>neto</b> (lo que te queda) y en ámbar la <b>retención del 19%</b>.</div>${_divBarsSVG(yrAsc)}`;
  // RESUMEN ANUAL
  const compY={},ventY={},costSoldY={};
  const cerrOps=(DB.cerradas||[]).flatMap(c=>(c.ops||[]).map(o=>({ticker:c.ticker,fecha:o.fecha,tipo:o.tipo,acciones:o.acciones,precio:o.precio})));
  const cerrNoOps=(DB.cerradas||[]).filter(c=>!(c.ops&&c.ops.length));
  const allOps=[...ops.map(o=>({ticker:o.ticker,fecha:o.fecha,tipo:o.tipo,acciones:o.acciones,precio:o.precio})),...cerrOps].sort((x,y)=>(x.fecha||'').localeCompare(y.fecha||''));
  const posCost={};
  allOps.forEach(o=>{ const t=(o.ticker||'').toUpperCase(), y=(o.fecha||'').slice(0,4); if(!t||!y)return; const n=num(o.acciones), pr=num(o.precio); const p=posCost[t]=posCost[t]||{sh:0,cost:0};
    if(o.tipo==='venta'){ const avg=p.sh?p.cost/p.sh:0; costSoldY[y]=(costSoldY[y]||0)+n*avg; ventY[y]=(ventY[y]||0)+n*pr; p.sh-=n; if(p.sh<0)p.sh=0; p.cost=p.sh*avg; }
    else { compY[y]=(compY[y]||0)+n*pr; p.sh+=n; p.cost+=n*pr; } });
  cerrNoOps.forEach(c=>{ const yc=(c.fechaCompra||'').slice(0,4), yv=(c.fechaVenta||'').slice(0,4); if(yc)compY[yc]=(compY[yc]||0)+num(c.coste); if(yv){ventY[yv]=(ventY[yv]||0)+num(c.venta); costSoldY[yv]=(costSoldY[yv]||0)+num(c.coste);} });
  const ry=[...new Set([...years,...Object.keys(compY),...Object.keys(ventY),...Object.keys(DB.devolucionHacienda||{})])].sort();
  let cumInv=0,cumCom=0; const rs=[];
  ry.forEach(y=>{ const comp=compY[y]||0, vent=ventY[y]||0, cSold=costSoldY[y]||0;
    const divB=totYear[y]||0, divN=divB*0.81;
    cumInv+=comp-vent-divB; cumCom+=comp-cSold;
    const dev=num((DB.devolucionHacienda||{})[y]||0), imp=divB-divN, totIng=divN+dev, descR=divB-totIng;
    rs.push({y,comp,vent,inv:cumInv,valC:cumCom,divB,divN,dev,imp,totIng,descR,
      rInv:cumInv>0?divB/cumInv:0, rCom:cumCom>0?divB/cumCom:0, rNeta:cumCom>0?totIng/cumCom:0, tasa:divB?descR/divB:0}); });
  const rhead='<tr><th>Año</th><th class="num">Compras</th><th class="num">Ventas</th><th class="num">Invertido</th><th class="num">%Inv</th><th class="num">Valor compra</th><th class="num">%Compra</th><th class="num">Div bruto</th><th class="num">Div neto</th><th class="num devcol">✏️ Dev. Hacienda</th><th class="num">Impuesto</th><th class="num">Total ingresado</th><th class="num">Descuento real</th><th class="num">Rent. neta</th><th class="num">Tasa imp.</th></tr>';
  const rbody=[...rs].reverse().map(r=>{ const has=r.divB||r.dev; return `<tr><td class="l"><b>${r.y}</b></td><td class="num">${r.comp?fmt(r.comp):'·'}</td><td class="num">${r.vent?fmt(r.vent):'·'}</td><td class="num">${fmt(r.inv)}</td><td class="num">${r.divB?fmtpct(r.rInv):'·'}</td><td class="num">${fmt(r.valC)}</td><td class="num">${r.divB?fmtpct(r.rCom):'·'}</td><td class="num pos">${r.divB?fmt(r.divB):'·'}</td><td class="num pos">${r.divB?fmt(r.divN):'·'}</td><td class="num devcol"><input type="number" step="0.01" class="anaInp devinp" style="width:82px;text-align:right" data-devhac="${r.y}" value="${r.dev||''}" placeholder="añadir"></td><td class="num">${r.divB?fmt(r.imp):'·'}</td><td class="num pos">${has?fmt(r.totIng):'·'}</td><td class="num ${r.descR<0?'pos':''}">${has?fmt(r.descR):'·'}</td><td class="num">${(r.valC>0&&has)?fmtpct(r.rNeta):'·'}</td><td class="num">${r.divB?fmtpct(r.tasa):'·'}</td></tr>`; }).join('');
  const resumenDesk=rs.length?`<div class="ptable"><table><thead>${rhead}</thead><tbody>${rbody}</tbody></table></div>`:'<div class="empty">Sin operaciones todavía.</div>';
  const resumenMob=[...rs].reverse().filter(r=>r.divB>0||r.dev).map(r=>`<div class="lcard"><div class="lc-h"><div class="tk">${r.y}</div><div class="ty">${r.divB?fmtpct(r.tasa):'—'}<span>tasa imp.</span></div></div><div class="lg"><div class="m"><span>Div bruto</span><b class="pos">${fmt(r.divB)}</b></div><div class="m"><span>Retención efectuada</span><b>${fmt(r.imp)}</b></div><div class="m dev"><span>✏️ Dev. Hacienda · lo añades tú</span><input type="number" step="0.01" class="anaInp devinp" data-devhac="${r.y}" value="${r.dev||''}" placeholder="añadir cada año"></div><div class="m"><span>Div neto</span><b class="pos">${fmt(r.divN)}</b></div><div class="m"><span>Rent. neta</span><b>${(r.valC>0)?fmtpct(r.rNeta):'—'}</b></div><div class="m"><span>Invertido</span><b>${fmt(r.inv)}</b></div></div></div>`).join('');
  const resumenBlk=`<div class="d-note">Invertido = acumulado de compras − ventas. Div. neto = bruto − 19% retención. La columna <b>✏️ Dev. Hacienda</b> (resaltada) es <b>el único dato que introduces tú cada año</b>: lo que Hacienda te devuelve o cobra de más en la renta. El resto se calcula solo.</div><div class="pos-desk">${resumenDesk}</div><div class="pos-mob">${resumenMob}</div>`;
  // RESUMEN FISCAL (renta)
  const _fy=[...new Set([...Object.keys(totYear),...Object.keys(ventY)])].filter(y=>(totYear[y]||0)>0||(ventY[y]||0)>0||(costSoldY[y]||0)>0).sort();
  let _tDB=0,_tRet=0,_tPL=0; const _fArr=[];
  [..._fy].reverse().forEach(y=>{ const db=totYear[y]||0, ret=db*0.19, pl=(ventY[y]||0)-(costSoldY[y]||0), base=db+pl; _tDB+=db; _tRet+=ret; _tPL+=pl; _fArr.push({y,db,ret,pl,base,hasPL:((ventY[y]||0)||(costSoldY[y]||0))}); });
  const _fbody=_fArr.map(r=>`<tr><td class="l"><b>${r.y}</b></td><td class="num pos">${r.db?fmt(r.db):'\u00b7'}</td><td class="num">${r.db?fmt(r.ret):'\u00b7'}</td><td class="num ${r.pl<0?'neg':'pos'}">${r.hasPL?fmt(r.pl):'\u00b7'}</td><td class="num" style="font-weight:600">${fmt(r.base)}</td></tr>`).join('');
  const _ffoot=`<tr class="d-tot"><td class="l">TOTAL</td><td class="num">${fmt(_tDB)}</td><td class="num">${fmt(_tRet)}</td><td class="num">${fmt(_tPL)}</td><td class="num">${fmt(_tDB+_tPL)}</td></tr>`;
  const _fhead='<tr><th>A\u00f1o</th><th class="num">Dividendos brutos</th><th class="num">Retenci\u00f3n 19%</th><th class="num">Ganancia patrimonial (ventas)</th><th class="num">Base del ahorro</th></tr>';
  const fiscalDesk=`<div class="ptable"><table><thead>${_fhead}</thead><tbody>${_fbody}${_ffoot}</tbody></table></div>`;
  const fiscalMob=_fArr.map(r=>`<div class="lcard"><div class="lc-h"><div class="tk">${r.y}</div><div class="ty">${fmt(r.base)}<span>base ahorro</span></div></div><div class="lg"><div class="m"><span>Div. brutos</span><b class="pos">${r.db?fmt(r.db):'\u2014'}</b></div><div class="m"><span>Retenci\u00f3n 19%</span><b>${r.db?fmt(r.ret):'\u2014'}</b></div><div class="m"><span>Gan. patrimonial</span><b class="${r.pl<0?'neg':'pos'}">${r.hasPL?fmt(r.pl):'\u2014'}</b></div><div class="m"><span>Base ahorro</span><b>${fmt(r.base)}</b></div></div></div>`).join('');
  const fiscalBlk=_fy.length?`<div class="d-note">Orientativo para la renta: dividendos = rendimientos del capital mobiliario (retenci\u00f3n 19%); ganancia patrimonial = ventas \u2212 coste de lo vendido (precio medio). No incluye comisiones ni p\u00e9rdidas compensables de a\u00f1os anteriores. Tambi\u00e9n lo ver\u00e1s en la pesta\u00f1a <b>Fiscalidad</b>.</div><div class="pos-desk">${fiscalDesk}</div><div class="pos-mob">${fiscalMob}</div>`:'';
  // ---- ensamblar bloques ----
  const body=$('#divBody'); if(!body)return;
  window._divBlk=window._divBlk||{matriz:true,evol:false,resumen:false,fiscal:false};
  const B=(key,icon,title,sum,inner)=>{ const op=window._divBlk[key]?' open':''; return `<div class="pos-blk${op}" data-divblk="${key}"><div class="pos-blk-h"><span class="arw">\u25b6</span><span class="bt">${icon} ${title}</span><span class="bsum">${sum}</span></div><div class="pos-blk-b"><div class="div-pad">${inner}</div></div></div>`; };
  body.innerHTML=B('matriz','\ud83d\udcc5','Dividendos por empresa y a\u00f1o',cols.length+' empresas \u00b7 '+fmt(grand)+' total',matrizBlk)
    +B('evol','\ud83d\udcc8','Evoluci\u00f3n del dividendo cobrado',yrAsc.length+' a\u00f1os \u00b7 neto vs retenci\u00f3n',evolBlk)
    +B('resumen','\ud83d\udcca','Resumen anual de la cartera','compras, ventas, rentabilidad neta y fiscalidad',resumenBlk)
    +(fiscalBlk?B('fiscal','\ud83e\uddfe','Resumen fiscal por a\u00f1o (renta)','base del ahorro por a\u00f1o',fiscalBlk):'');
  if(!body._divBlkBound){ body._divBlkBound=true; body.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],input,select,a'))return; var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-divblk'); if(k){window._divBlk=window._divBlk||{};window._divBlk[k]=b.classList.contains('open');} } }); }
}
function _divBarsSVG(yrAsc){ if(!yrAsc||!yrAsc.length)return '<div class="muted" style="font-size:12px">Sin datos.</div>';
  const W=760,H=300,pl=48,pr=12,pt=18,pb=40; const plotH=H-pt-pb,plotW=W-pl-pr;
  const mx=Math.max(...yrAsc.map(d=>d.bruto))*1.08||1; const n=yrAsc.length; const gw=plotW/n, bw=Math.min(34,gw-8);
  const Y=v=>pt+plotH*(1-v/mx);
  let g=''; for(let k=0;k<=4;k++){const gv=mx*k/4;g+=`<line x1="${pl}" y1="${Y(gv).toFixed(1)}" x2="${W-pr}" y2="${Y(gv).toFixed(1)}" stroke="#eef2f7"/><text x="${pl-6}" y="${(Y(gv)+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${Math.round(gv/1000)}k</text>`;}
  yrAsc.forEach((d,i)=>{ const x=pl+i*gw+(gw-bw)/2; const yBase=Y(0); const neto=d.bruto*0.81; const yN=Y(neto), yB=Y(d.bruto);
   g+=`<rect x="${x.toFixed(1)}" y="${yB.toFixed(1)}" width="${bw.toFixed(1)}" height="${(yN-yB).toFixed(1)}" fill="#fbbf24"><title>${d.y} \u00b7 retenci\u00f3n ${fmt(d.bruto*0.19)}</title></rect>`;
   g+=`<rect x="${x.toFixed(1)}" y="${yN.toFixed(1)}" width="${bw.toFixed(1)}" height="${(yBase-yN).toFixed(1)}" fill="#16a34a"><title>${d.y} \u00b7 neto ${fmt(neto)} \u00b7 bruto ${fmt(d.bruto)}</title></rect>`;
   if(i%2===0||n<=12)g+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-24}" text-anchor="middle" font-size="9" fill="#64748b">${(''+d.y).slice(2)}</text>`;
   if(d.bruto>=mx*0.25)g+=`<text x="${(x+bw/2).toFixed(1)}" y="${(yB-4).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#334155">${Math.round(d.bruto/1000)}k</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:780px;display:block">${g}</svg><div class="div-barleg"><span><i style="background:#16a34a"></i>Neto (lo que te queda)</span><span><i style="background:#fbbf24"></i>Retenci\u00f3n 19%</span></div>`;
}
const MESES_ES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function calPrecio(c){ const v=(DB.valores||{})[(c.ticker||'').toUpperCase()]; const p=v&&num(v.precioActual)>0?num(v.precioActual):(c.precio||0); return p; }
function calSharesByTicker(){ const m={}; (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001){ const t=(p.ticker||'').toUpperCase(); m[t]=(m[t]||0)+p.acciones; } }); return m; }
function evTipo(code){ const c=(code||'').toUpperCase(); if(c[0]==='D') return 'div'; if(c[0]==='Q') return 'res'; if(c==='JA') return 'jun'; return 'otro'; }
function evTexto(code){ const c=(code||'').toUpperCase(); if(c[0]==='D') return 'Dividendo'; if(c[0]==='Q') return 'Resultados '+c; if(c==='JA') return 'Junta de accionistas'; if(c==='ID') return 'Investor Day'; return c; }
function renderEventos(){
  const ev=DB.eventos=DB.eventos||{};
  const held=heldTickerSet();
  let tickers=[...new Set([...Object.keys(ev), ...held])].filter(Boolean);
  /* ---- Agenda: mes en curso + siguiente, en rejilla de bloques ---- */
  const ag=$('#calAgenda');
  if(ag){
    const now=new Date(); const nowM=now.getMonth()+1; const nextM=nowM===12?1:nowM+1;
    let all=[]; tickers.forEach(t=>(ev[t]||[]).forEach(e=>all.push({t,m:e.m,w:e.w,code:e.code})));
    let up=all.filter(e=> e.m===nowM || e.m===nextM).sort((a,b)=> a.m-b.m||a.w-b.w);
    const item=e=>{ const tp=evTipo(e.code); const h=held.has(e.t); return `<div style="font-size:11px;padding:3px 6px;background:#f8fafc;border-radius:6px"><span class="muted">${MESES_ES[e.m-1]} s${e.w}</span> <span class="evchip ev-${tp}">${e.code}</span> <span data-ficha="${e.t}" style="cursor:pointer;color:var(--brand)${h?';font-weight:700':''}">${e.t}</span> <span class="muted">${evTexto(e.code)}</span></div>`; };
    ag.innerHTML=up.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:5px">${up.map(item).join('')}</div>`:'<div class="empty">Sin eventos en el mes en curso ni el siguiente.</div>';
  }
  /* ---- Calendario anual: 4 semanas/mes, editable ---- */
  const el=$('#calEventos'); if(!el)return;
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin eventos. Importa «eventos-calendario.json» o pulsa «+ Empresa».</div>'; return; }
  tickers.sort((a,b)=>(held.has(b)?1:0)-(held.has(a)?1:0) || a.localeCompare(b));
  const h1='<tr><th rowspan="2">Empresa</th>'+MESES_ES.map(m=>`<th colspan="4" style="text-align:center;border-left:2px solid #cbd5e1">${m}</th>`).join('')+'</tr>';
  const h2='<tr>'+MESES_ES.map(()=>[1,2,3,4].map((w,i)=>`<th style="font-weight:400;color:var(--muted)${i===0?';border-left:2px solid #cbd5e1':''}">${w}</th>`).join('')).join('')+'</tr>';
  const body=tickers.map(t=>{ let cells='';
    for(let m=1;m<=12;m++)for(let w=1;w<=4;w++){ const arr=(ev[t]||[]).filter(e=>e.m===m&&e.w===w).map(e=>(e.code||'')); const val=arr.join(' '); const U=arr.map(c=>c.toUpperCase()); let cs=''; if(U.some(c=>c[0]==='D')) cs=';background:#dcfce7;color:#166534;font-weight:700'; else if(U.some(c=>c==='JA'||c==='ID')) cs=';background:#fef9c3;color:#c2410c;font-weight:700'; else if(U.some(c=>c[0]==='Q')) cs=';background:#dbeafe;color:#1e40af;font-weight:700'; cells+=`<td style="padding:1px${w===1?';border-left:2px solid #cbd5e1':''}"><input class="anaInp" style="width:16px;text-align:center;font-size:8px;padding:0;background:transparent${cs}" data-evcell="${t}|${m}|${w}" value="${val}"></td>`; }
    return `<tr${held.has(t)?' style="background:#fffbeb"':''}><td style="white-space:nowrap"><button class="btn ghost sm" data-ficha="${t}" style="padding:0 4px">${held.has(t)?'<b>'+t+'</b>':t}</button></td>${cells}</tr>`;
  }).join('');
  el.innerHTML=`<table><thead>${h1}${h2}</thead><tbody>${body}</tbody></table>`;
}
function addEventoEmpresa(){ const tk=(prompt('Ticker de la empresa (p. ej. SAN):')||'').trim().toUpperCase(); if(!tk)return; DB.eventos=DB.eventos||{}; DB.eventos[tk]=DB.eventos[tk]||[]; DB.valores=DB.valores||{}; DB.valores[tk]=DB.valores[tk]||{}; saveNow(); renderEventos(); }
function calDivBruto(c){ const t=(c.ticker||'').toUpperCase(); const v=(DB.valores||{})[t]; if(v&&num(v.divAccion)>0) return num(v.divAccion); if(c.divNeto) return num(c.divNeto)/0.81; return 0; }
function renderCalendario(){
  const el=$('#calTabla'); if(!el)return;
  const shares=calSharesByTicker();
  const ev=DB.eventos||{}; DB.divReparto=DB.divReparto||{};
  const held=Object.keys(shares).filter(t=>shares[t]>0.0001);
  if(!held.length){ el.innerHTML='<div class="empty">Sin posiciones en cartera.</div>'; $('#calKpis').innerHTML=''; if(typeof renderEventos==='function')renderEventos(); return; }
  const calOf=t=>(DB.calendario||[]).find(x=>(x.ticker||'').toUpperCase()===t);
  const nm=t=>((DB.valores||{})[t]||{}).nombre||(calOf(t)||{}).nombre||t;
  const precioT=t=>{ const v=(DB.valores||{})[t]; return v&&num(v.precioActual)>0?num(v.precioActual):0; };
  const brutoT=t=>{ const v=(DB.valores||{})[t]; if(v&&num(v.divAccion)>0)return num(v.divAccion); const c=calOf(t); return c?calDivBruto(c):0; };
  const divEvents=t=>(ev[t]||[]).filter(e=>((e.code||'')[0]||'').toUpperCase()==='D').sort((a,b)=>a.m-b.m||a.w-b.w);
  held.sort((a,b)=>{ const ra=precioT(a)?brutoT(a)/precioT(a):0, rb=precioT(b)?brutoT(b)/precioT(b):0; return rb-ra; });
  const ingMes=new Array(12).fill(0); let ingAnual=0; let brutoAnual=0;
  const rows=held.map(t=>{ const sh=shares[t]; const pr=precioT(t); const br=brutoT(t); const rep=DB.divReparto[t]||[]; const des=divEvents(t);
    const monthEur=new Array(12).fill(0);
    des.forEach((e,idx)=>{ const bruto=sh*br*(num(rep[idx]||0)/100); if(bruto){ monthEur[e.m-1]+=bruto*0.81; brutoAnual+=bruto; } });
    monthEur.forEach((v,i)=>{ if(v){ ingMes[i]+=v; ingAnual+=v; } });
    const pctInputs=[0,1,2,3].map(i=>`<td class="num" style="white-space:nowrap"><input type="number" step="1" class="anaInp" style="width:28px;text-align:center;font-size:9px;padding:0 1px" data-calrep="${t}|${i}" value="${(rep[i]!=null&&rep[i]!=='')?rep[i]:''}"><span style="font-size:8px;color:#64748b">%</span></td>`).join('');
    const sumPct=rep.reduce((s,x)=>s+num(x||0),0);
    const warn=(sumPct>0&&Math.abs(sumPct-100)>0.5)?` <span style="color:#dc2626" title="Los % no suman 100 (suman ${sumPct})">!</span>`:'';
    const noEv=(!des.length&&br>0)?` <span style="color:#d97706" title="Sin eventos de dividendo (D) en el calendario anual">o</span>`:'';
    const monthCells=monthEur.map(v=>v?`<td class="num" style="background:#dcfce7;color:#166534;font-weight:600">${fmt(v)}</td>`:`<td class="num">·</td>`).join('');
    return `<tr><td><button class="btn ghost sm" data-ficha="${t}"><b>${t}</b></button> <span class="muted" style="font-size:10px">${nm(t)}</span>${warn}${noEv}</td><td class="num">${pr?fmt(pr):'·'}</td><td class="num">${br?br.toFixed(3):'·'}</td>${pctInputs}${monthCells}</tr>`;
  }).join('');
  const reten=brutoAnual*0.19;
  ingMes[3]+=reten; ingAnual+=reten;
  const empty6='<td></td><td></td><td></td><td></td><td></td><td></td>';
  const devCells=new Array(12).fill(0).map((_,i)=> i===3 ? `<td class="num" style="color:#dc2626;font-weight:700">${reten?fmt(reten):'·'}</td>` : '<td class="num">·</td>').join('');
  const devRow=`<tr><td>Devolución Hacienda</td>${empty6}${devCells}</tr>`;
  const head='<tr><th>Empresa</th><th class="num">Cotización</th><th class="num">Div bruto</th><th class="num">%1</th><th class="num">%2</th><th class="num">%3</th><th class="num">%4</th>'+MESES_ES.map(m=>`<th class="num">${m}</th>`).join('')+'</tr>';
  const ingRow=`<tr style="font-weight:700;background:#eef2f7"><td>Ingreso neto estimado · ${fmt(ingAnual)}/año</td>${empty6}${ingMes.map(v=>`<td class="num">${v?fmt(v):'·'}</td>`).join('')}</tr>`;
  el.innerHTML=`<table><thead>${head}</thead><tbody>${devRow}${rows}${ingRow}</tbody></table>`;
  const mejorMes=ingMes.indexOf(Math.max(...ingMes));
  $('#calKpis').innerHTML=[['Empresas en cartera',String(held.length)],['Ingreso neto estimado/año',fmt(ingAnual)],['Retención 19% (Devol. Hacienda)',fmt(reten)],['Mejor mes', ingAnual? MESES_ES[mejorMes]+' ('+fmt(ingMes[mejorMes])+')':'—']].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  const _v=$('#view-calendario'); if(_v&&_v.classList.contains('active')) setTimeout(()=>autoFitTable('calTabla',7,11),0);
  if(typeof renderEventos==='function')renderEventos();
}
function divCobrados(t){ t=(t||'').toUpperCase();
  const tops=(DB.operaciones||[]).filter(o=>(o.ticker||'').toUpperCase()===t);
  const td=((DB.dividendos||{})[t]||[]).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  let s=0; td.forEach(d=>{ const acc=tops.filter(o=>o.tipo!=='venta'&&o.fecha<=d.fecha).reduce((x,o)=>x+num(o.acciones),0)-tops.filter(o=>o.tipo==='venta'&&o.fecha<=d.fecha).reduce((x,o)=>x+num(o.acciones),0); s+=acc*num(d.importe); }); return s; }
function pieSVG(items){ const tot=items.reduce((s,i)=>s+i.val,0)||1; let a=-Math.PI/2; const R=78,cx=86,cy=86; let p='';
  items.forEach(it=>{ const ang=it.val/tot*2*Math.PI, a2=a+ang; const x1=cx+R*Math.cos(a),y1=cy+R*Math.sin(a),x2=cx+R*Math.cos(a2),y2=cy+R*Math.sin(a2); const lg=ang>Math.PI?1:0; p+=`<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${lg} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${it.color}" stroke="#fff" stroke-width="1.5"/>`; a=a2; });
  return `<svg width="172" height="172" viewBox="0 0 172 172">${p}</svg>`; }

/* Datos fiscales por año (reutilizable por el Centro de Informes) */
function _fiscalPorAnio(){
  var ops=(DB.operaciones||[]).slice();
  var divs=DB.dividendos||{}; var divIng=DB.divIngresos||{};
  var opTickers=new Set(ops.map(function(o){return (o.ticker||'').toUpperCase();}).filter(Boolean));
  var tickers=[...new Set([...Object.keys(divs),...opTickers,...Object.keys(divIng)])].filter(Boolean);
  var byTY={}, yearsSet=new Set();
  tickers.forEach(function(t){ byTY[t]={};
    if(opTickers.has(t)){
      var tops=ops.filter(function(o){return (o.ticker||'').toUpperCase()===t;});
      var td=(divs[t]||[]).slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
      td.forEach(function(d){ var y=(d.fecha||'').slice(0,4); if(!y)return;
        var acc=tops.filter(function(o){return o.tipo!=='venta'&&o.fecha<=d.fecha;}).reduce(function(s,o){return s+num(o.acciones);},0)-tops.filter(function(o){return o.tipo==='venta'&&o.fecha<=d.fecha;}).reduce(function(s,o){return s+num(o.acciones);},0);
        byTY[t][y]=(byTY[t][y]||0)+acc*num(d.importe); yearsSet.add(y); });
    } else if(divIng[t]){
      Object.keys(divIng[t]).forEach(function(y){ byTY[t][y]=num(divIng[t][y]); yearsSet.add(y); });
    }
  });
  ops.forEach(function(o){ var y=(o.fecha||'').slice(0,4); if(y)yearsSet.add(y); });
  (DB.cerradas||[]).forEach(function(c){ var cc=cerradaCalc(c); var t=(cc.ticker||'').toUpperCase(); if(!t)return; byTY[t]=byTY[t]||{}; Object.keys(cc.byYear).forEach(function(y){ byTY[t][y]=(byTY[t][y]||0)+cc.byYear[y]; yearsSet.add(y); }); });
  var years=[...yearsSet].sort();
  var totYear={}; years.forEach(function(y){ var s=0; Object.keys(byTY).forEach(function(t){ s+=(byTY[t][y]||0); }); totYear[y]=s; });
  var ventY={},costSoldY={};
  var cerrOps=(DB.cerradas||[]).reduce(function(a,c){ (c.ops||[]).forEach(function(o){ a.push({ticker:c.ticker,fecha:o.fecha,tipo:o.tipo,acciones:o.acciones,precio:o.precio}); }); return a; },[]);
  var cerrNoOps=(DB.cerradas||[]).filter(function(c){return !(c.ops&&c.ops.length);});
  var allOps=ops.map(function(o){return {ticker:o.ticker,fecha:o.fecha,tipo:o.tipo,acciones:o.acciones,precio:o.precio};}).concat(cerrOps).sort(function(x,y){return (x.fecha||'').localeCompare(y.fecha||'');});
  var posCost={};
  allOps.forEach(function(o){ var t=(o.ticker||'').toUpperCase(), y=(o.fecha||'').slice(0,4); if(!t||!y)return; var n=num(o.acciones),pr=num(o.precio); var p=posCost[t]=posCost[t]||{sh:0,cost:0};
    if(o.tipo==='venta'){ var avg=p.sh?p.cost/p.sh:0; costSoldY[y]=(costSoldY[y]||0)+n*avg; ventY[y]=(ventY[y]||0)+n*pr; p.sh-=n; if(p.sh<0)p.sh=0; p.cost=p.sh*avg; }
    else { p.sh+=n; p.cost+=n*pr; } });
  cerrNoOps.forEach(function(c){ var yv=(c.fechaVenta||'').slice(0,4); if(yv){ventY[yv]=(ventY[yv]||0)+num(c.venta); costSoldY[yv]=(costSoldY[yv]||0)+num(c.coste);} });
  var dh=DB.devolucionHacienda||{};
  var fy=[...new Set([...Object.keys(totYear),...Object.keys(ventY),...Object.keys(dh)])].filter(function(y){return (totYear[y]||0)>0||(ventY[y]||0)>0||(costSoldY[y]||0)>0||num(dh[y]||0)>0;}).sort();
  return fy.map(function(y){ var db=totYear[y]||0, ret=db*0.19, pl=(ventY[y]||0)-(costSoldY[y]||0), base=db+pl, dev=num(dh[y]||0); return {year:y,divB:db,ret:ret,pl:pl,base:base,dev:dev}; });
}


/* ===== Monitor trimestral (puente dossiers/trimestral/[TICKER]-trim.json) ===== */
function _trimEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _trimFmt(v){ if(typeof v==='number'){ try{ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(v); }catch(e){ return ''+v; } } return v==null?'':(''+v); }
/* Normaliza cualquier token de periodo (1T/S1/9M/FY, T1/2T/6M/12M, AAAA-TOKEN o TOKEN-AAAA) al canonico AAAA-Qn.
   Globales: los usan el Monitor (04-plan) y la vista de Informes (07-informes) para no depender de que el -trim.json venga pre-normalizado. */
var _TRIM_TOK_Q={Q1:1,'1T':1,T1:1,'3M':1, Q2:2,'2T':2,T2:2,S1:2,H1:2,'6M':2, Q3:3,'3T':3,T3:3,'9M':3, Q4:4,'4T':4,T4:4,FY:4,'12M':4,A:4};
function _trimCanon(p){ if(p==null)return ''; var s=(''+p).trim().toUpperCase(); if(/^\d{4}-Q[1-4]$/.test(s))return s; var pt=s.split('-'); if(pt.length!==2)return ''+p; var a=pt[0],b=pt[1],year=null,tok=null; if(/^\d{4}$/.test(a)){year=a;tok=b;}else if(/^\d{4}$/.test(b)){year=b;tok=a;}else return ''+p; var q=_TRIM_TOK_Q[tok]; return q?(year+'-Q'+q):(''+p); }
function _revHecha(rev,canon){ if(!rev)return false; if(rev[canon])return true; for(var k in rev){ if(rev[k]&&_trimCanon(k)===canon)return true; } return false; }
async function cargarTrimestral(t){ t=(t||'').toUpperCase(); if(!t){return;}
  try{ const r=await fetch('dossiers/trimestral/'+t+'-trim.json',{cache:'no-store'}); _trimCache[t]=r.ok?await r.json():null; }catch(e){ _trimCache[t]=null; }
  try{ const d=_trimCache[t]; if(d&&d.revisiones){ DB.monitor=DB.monitor||{}; DB.monitor[t]=DB.monitor[t]||{}; DB.monitor[t].rev=DB.monitor[t].rev||{}; let chg=false; d.revisiones.forEach(function(rv){ var pc=_trimCanon(rv.periodo); if(pc&&!DB.monitor[t].rev[pc]){ DB.monitor[t].rev[pc]=true; chg=true; } }); if(chg&&typeof scheduleSave==='function')scheduleSave(); } }catch(e){}
  /* Sincroniza la caché de cadencia (_cadTrim del radar) con lo recién descargado y recalcula
     DB.cadencia[t]: así registrar un trimestre refresca al instante el "próximo" del Monitor/
     Cobertura/Calendario y no deja el trimestre siguiente marcado en falso como pendiente. */
  try{ if(typeof _cadTrim!=='undefined' && _cadTrim){ _cadTrim[t]=_trimCache[t]; }
    if(typeof _cadenciaDe==='function' && typeof _cadEstado==='function'){ DB.cadencia=DB.cadencia||{}; var _cc=_cadenciaDe(t);
      if(_cc){ var _hh=new Date(); _hh.setHours(0,0,0,0); var _an=(DB.analisis||[]).find(function(a){return (a.ticker||'').toUpperCase()===t;}); var _ee=_cadEstado(_cc,_hh,_an&&_an.dossierFecha); DB.cadencia[t]={proxLabel:_ee.proxLabel,tocaMonitor:_ee.tocaMonitor,tocaAnual:_ee.tocaAnual,nextKey:_ee.nextKey,nextDate:_ee.nextDate,manual:!!(_cc.next&&_cc.next.manual)}; if(typeof scheduleSave==='function')scheduleSave(); }
      else delete DB.cadencia[t];
    }
  }catch(e){}
  if(fichaTicker===t&&typeof renderFicha==='function')renderFicha(t);
}
function _trimUnidad(nombre){ var m=(''+(nombre==null?'':nombre)).match(/\(([^()]*)\)\s*$/); return m?m[1].trim():''; }
function _trimValUnidad(m){ var u=_trimUnidad(m.nombre); var v=_trimFmt(m.valor); if(typeof m.valor!=='number')return v; if(u==='%'||u==='pp')return v+u; return u?(v+' '+u):v; }
function _trimPeriodo(p){ p=''+(p==null?'':p); var y=p.match(/(19|20)\d{2}/); var year=y?parseInt(y[0],10):0; var tipo=p.replace(/(19|20)\d{2}/,'').replace(/[-_/\s]+/g,'').trim().toUpperCase(); return {tipo:tipo,year:year}; }
function _trimDelta(cur,prevVal,prevPeriodo){ if(typeof cur!=='number'||typeof prevVal!=='number'||prevVal===0)return ''; var pct=(cur-prevVal)/Math.abs(prevVal)*100; var col=pct>=0?'#16a34a':'#dc2626'; var sign=pct>=0?'+':''; var txt=sign+pct.toFixed(1).replace('.',',')+'%'; return ' <span title="vs '+_trimEsc(prevPeriodo||'')+'" style="color:'+col+';font-weight:600;font-size:11px;white-space:nowrap">('+txt+')</span>'; }
function trimCardHTML(d){
  if(!d||!d.revisiones||!d.revisiones.length)return '';
  var revs=d.revisiones.slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
  var last=revs[revs.length-1];
  var semCol={V:'#16a34a',A:'#d97706',R:'#dc2626'}; var semTxt={V:'🟢 VERDE',A:'🟡 ÁMBAR',R:'🔴 ROJO'};
  var sg=(last.semaforoGlobal||'').toUpperCase();
  // Informe correspondiente anterior: mismo tipo de periodo (Q1/S1/9M/FY) del año previo más reciente.
  var lp=_trimPeriodo(last.periodo); var prev=null;
  for(var i=revs.length-2;i>=0;i--){ var pp=_trimPeriodo(revs[i].periodo); if(pp.tipo===lp.tipo&&pp.year<lp.year){ prev=revs[i]; break; } }
  var prevMap={}; if(prev){ (prev.metricas||[]).forEach(function(x){ prevMap[x.nombre]=x.valor; }); }
  var metr=(last.metricas||[]).map(function(m){ var dlt=prev?_trimDelta(m.valor,prevMap[m.nombre],prev.periodo):''; return '<tr><td>'+_trimEsc(m.nombre)+'</td><td class="num" style="font-weight:600;white-space:nowrap">'+_trimValUnidad(m)+dlt+'</td></tr>'; }).join('');
  var trend=revs.map(function(r){ var s=(r.semaforoGlobal||'').toUpperCase(); var c=semCol[s]||'#94a3b8'; return '<span title="'+_trimEsc(r.periodo)+' ('+(r.fecha||'')+')" style="display:inline-block;width:13px;height:13px;border-radius:3px;background:'+c+';margin-right:3px"></span>'; }).join('');
  var alerta=(sg==='R'||last.tesisSigueIntacta===false)?'<span onclick="if(typeof showProtocolo===\'function\')showProtocolo(\'S2\',\'\',\''+_trimEsc((d.ticker||'').toUpperCase())+'\')" title="Pulsa para ver el procedimiento (señal S2 · plazo 7 días)" style="margin-left:8px;color:#dc2626;font-weight:700;cursor:pointer;text-decoration:underline dotted">⚠️ revisar tesis · S2 📋</span>':'';
  return '<div class="card" style="margin-top:10px;border-left:4px solid '+(semCol[sg]||'#94a3b8')+'">'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
    +'<div style="font-weight:800;font-size:15px">📊 Monitor trimestral</div>'
    +'<span style="font-weight:700;color:'+(semCol[sg]||'#475569')+'">'+(semTxt[sg]||sg||'—')+'</span>'
    +'<span class="muted" style="font-size:12px">'+_trimEsc(last.periodo)+(last.fecha?' · '+ddmmyyyy(last.fecha):'')+'</span>'+alerta
    +'<div style="flex:1"></div>'+(revs.length>1?'<div title="Tendencia del semáforo por trimestre" style="white-space:nowrap">'+trend+'</div>':'')+'</div>'
    +(last.resumen?'<div class="sub" style="margin-bottom:8px;line-height:1.45">'+_trimEsc(last.resumen)+'</div>':'')
    +(metr?'<div style="overflow:auto"><table><thead><tr><th>Métrica ('+_trimEsc(last.periodo)+')</th><th class="num">Valor'+(prev?' <span class="muted" style="font-weight:400;font-size:11px">(var. vs '+_trimEsc(prev.periodo)+')</span>':'')+'</th></tr></thead><tbody>'+metr+'</tbody></table></div>':'')
    +'</div>';
}
/* ===== Hechos relevantes (crónica cualitativa de cada publicación) =====
   Se nutre del mismo -trim.json ya cargado en _trimCache: cada publicación de revisiones[]
   puede traer un array hechos:[{tipo, hecho, impacto:'+'|'='|'-', valoracion}]. Se pinta como
   línea de tiempo (lo más reciente arriba) debajo del Monitor trimestral en la ficha. */
function _hkChip(tipo){
  var t=(''+(tipo==null?'':tipo)).trim().toLowerCase();
  var m={
    'resultados':['#ecfdf5','#047857'], 'dividendo':['#ecfdf5','#047857'],
    'adquisición':['#eff6ff','#1d4ed8'], 'adquisicion':['#eff6ff','#1d4ed8'], 'm&a':['#eff6ff','#1d4ed8'],
    'guidance':['#fffbeb','#b45309'], 'objetivos':['#fffbeb','#b45309'],
    'gobierno':['#f5f3ff','#6d28d9'], 'gobierno corporativo':['#f5f3ff','#6d28d9'],
    'contrato':['#f0fdfa','#0f766e'],
    'regulatorio':['#fef2f2','#b91c1c'], 'márgenes':['#fef2f2','#b91c1c'], 'margenes':['#fef2f2','#b91c1c'], 'márgenes/costes':['#fef2f2','#b91c1c'], 'costes':['#fef2f2','#b91c1c'],
    'recompra':['#eef2ff','#4338ca']
  };
  var c=m[t]||['#f1f5f9','#475569'];
  return 'background:'+c[0]+';color:'+c[1];
}
function _hkImpDot(imp){
  var s=(''+(imp==null?'':imp)).trim();
  if(s==='+'||/^(a favor|positivo|pos)$/i.test(s))return '#16a34a';
  if(s==='-'||s==='−'||/^(en contra|negativo|neg)$/i.test(s))return '#dc2626';
  return '#94a3b8';
}
function hechosCardHTML(d){
  if(!d||!d.revisiones||!d.revisiones.length)return '';
  var pubs=d.revisiones.filter(function(r){return r&&r.hechos&&r.hechos.length;});
  if(!pubs.length)return '';
  pubs=pubs.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});
  var semCol={V:'#16a34a',A:'#d97706',R:'#dc2626'};
  var nH=pubs.reduce(function(s,p){return s+p.hechos.length;},0);
  var bloques=pubs.map(function(p,i){
    var sc=semCol[(p.semaforoGlobal||'').toUpperCase()]||'#94a3b8';
    var hh=p.hechos.map(function(h){
      var dot=_hkImpDot(h.impacto);
      var chip=h.tipo?'<span style="display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;padding:2px 7px;border-radius:999px;margin-right:6px;vertical-align:1px;'+_hkChip(h.tipo)+'">'+_trimEsc(h.tipo)+'</span>':'';
      return '<div style="display:flex;gap:10px;padding:7px 0;border-top:1px solid #f1f5f9">'
        +'<div style="flex:0 0 auto;width:12px;height:12px;border-radius:50%;margin-top:4px;background:'+dot+'"></div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-weight:600">'+chip+_trimEsc(h.hecho)+'</div>'
          +(h.valoracion?'<div style="color:#64748b;font-size:12.5px;margin-top:2px"><b style="color:#334155">Valoración:</b> '+_trimEsc(h.valoracion)+'</div>':'')
        +'</div></div>';
    }).join('');
    return '<div style="'+(i>0?'border-top:1px dashed #e2e8f0;margin-top:12px;padding-top:12px':'')+'">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">'
        +'<span style="width:11px;height:11px;border-radius:3px;display:inline-block;background:'+sc+'"></span>'
        +'<span style="font-weight:700;font-size:13px">'+_trimEsc(p.periodo)+'</span>'
        +(p.fecha?'<span class="muted" style="font-size:12px">'+ddmmyyyy(p.fecha)+'</span>':'')
      +'</div>'+hh+'</div>';
  }).join('');
  return '<div class="card" style="margin-top:10px">'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">'
      +'<div style="font-weight:800;font-size:15px">🗞️ Hechos relevantes</div>'
      +'<span class="muted" style="font-size:12px">crónica de lo comunicado por la empresa · '+pubs.length+' publicacion'+(pubs.length===1?'':'es')+' · '+nH+' hecho'+(nH===1?'':'s')+'</span>'
      +'<div style="flex:1"></div>'
      +'<div class="muted" style="font-size:11.5px;display:flex;gap:12px;flex-wrap:wrap">'
        +'<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#16a34a;vertical-align:0"></span> a favor</span>'
        +'<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#94a3b8;vertical-align:0"></span> neutro</span>'
        +'<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#dc2626;vertical-align:0"></span> en contra</span>'
      +'</div>'
    +'</div>'+bloques+'</div>';
}
