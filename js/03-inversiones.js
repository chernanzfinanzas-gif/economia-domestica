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
  function seccion(titulo,arr,totBg){
    if(!arr.length) return '';
    arr=sortLots(arr);
    let sVC=0,sVA=0,sPL=0,sDIV=0;
    const rows=arr.map(l=>{ sVC+=l.vc; sVA+=l.va; sPL+=l.pl; sDIV+=l.div;
      return `<tr><td style="white-space:nowrap">${ddmmyyyy(l.fecha)}</td>`+
        `<td style="white-space:nowrap"><button class="btn ghost sm" data-ficha="${l.ticker}"><b>${l.ticker}</b></button> <span class="muted" style="font-size:11px">${l.cartera}</span></td>`+
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
    const sub=`<tr style="font-weight:700;background:${totBg}"><td>TOTAL</td><td class="muted">${arr.length} lotes</td><td></td><td></td><td></td><td class="num">${fmt(sVC)}</td><td class="num">${fmt(sVA)}</td><td class="num ${sPL>=0?'pos':'neg'}">${sPL>=0?'+':''}${fmt(sPL)}</td><td class="num ${totCot>=0?'pos':'neg'}">${pc2(totCot)}</td><td class="num pos">${fmt(sDIV)}</td><td></td><td></td><td class="num pos">${pc2(totDiv)}</td><td></td></tr>`;
    return `<h3 style="margin-top:14px">${titulo} <span class="muted" style="font-weight:400;font-size:12px">· ${arr.length} lotes · valor ${fmt(sVA)} · plusvalía ${sPL>=0?'+':''}${fmt(sPL)}</span></h3><div style="overflow:auto"><table><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div>`;
  }
  let html='';
  if(filt!=='vendida') html+=seccion('En cartera',lots.filter(l=>l.estado==='Cartera'),'#eafaf0');
  if(filt!=='cartera') html+=seccion('Vendidas',lots.filter(l=>l.estado==='Vendida'),'#f1f5f9');
  el.innerHTML= html || '<div class="empty">Sin lotes para mostrar.</div>';
}
function renderInv(){
  if(!DB.config)DB.config={};
  const all=invPositions().filter(p=>p.acciones>0.0001);
  const _fechas=all.map(p=>p.precioFecha).filter(Boolean).sort();
  const refFecha=_fechas.length?_fechas[_fechas.length-1]:'';
  const fechaBanner=`<div class="muted" style="font-size:12px;margin:2px 0 10px">${refFecha?('Precios al cierre del <b style=\'color:#334155\'>'+ddmmyyyy(refFecha)+'</b>'):'Precios sin fecha de referencia'} · el color de la cotización indica su actualización: <b style="color:#16a34a">al día</b> · <b style="color:#d97706">rezagada</b> · <b style="color:#dc2626">desfasada/sin fecha</b></div>`;
  const carts=[...new Set(['Propia','Compartida',...invCarteras()])];
  const dl=$('#cartList'); if(dl) dl.innerHTML=carts.map(c=>`<option value="${c}">`).join('');
  const valor=all.reduce((s,p)=>s+p.acciones*p.precioActual,0);
  const coste=all.reduce((s,p)=>s+p.acciones*p.precioCompra,0);
  const pl=valor-coste, plpct=coste?pl/coste*100:0;
  const divAnual=all.reduce((s,p)=>s+p.acciones*p.divAccion,0);
  $('#invCards').innerHTML=[
    {l:'Valor total (todas)',v:fmt(valor),cls:'',s:all.length+' posiciones · ambas carteras'},
    {l:'Coste',v:fmt(coste),cls:'',s:''},
    {l:'Plusvalía',v:(pl>=0?'+':'')+fmt(pl),cls:pl>=0?'pos':'neg',s:(plpct>=0?'+':'')+plpct.toFixed(1)+'%'},
    {l:'Dividendos/año (bruto)',v:fmt(divAnual),cls:'',s:(valor?(divAnual/valor*100).toFixed(1):0)+'% RPD'}
  ].map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div><div class="sub">${c.s}</div></div>`).join('');
  if(!all.length){ $('#invTable').innerHTML='<div class="empty">Sin posiciones abiertas.</div>'; renderInvClosed(); if(typeof renderDividendos==='function')renderDividendos(); return; }
  const byCart={}; all.forEach(p=>{(byCart[p.cartera]=byCart[p.cartera]||[]).push(p);});
  const ordered=Object.keys(byCart).sort((a,b)=>a==='Propia'?-1:b==='Propia'?1:a.localeCompare(b));
  const _shc=(k,l,cls)=>`<th class="${cls===undefined?'num':cls}" data-sorttbl="cartera" data-sortk="${k}" style="cursor:pointer" title="Ordenar">${l}${sortArrow('cartera',k)}</th>`; const head='<tr>'+_shc('ticker','Ticker','')+_shc('nombre','Nombre','')+_shc('acc','Acc.')+_shc('pc','P.Compra')+_shc('pa','P.Actual')+_shc('valor','Valor')+_shc('pl','Plusvalía')+_shc('plpct','%')+_shc('valor','Peso')+_shc('divacc','Div/acc')+_shc('divano','Div/año')+_shc('rpd','RPD')+_shc('yoc','YoC')+'<th></th></tr>';
  let html='';
  ordered.forEach(car=>{
    const lst=(_sort['cartera']&&_sort['cartera'].k)?sortApply('cartera',byCart[car],{ticker:p=>p.ticker,nombre:p=>p.nombre,acc:p=>p.acciones,pc:p=>p.precioCompra,pa:p=>p.precioActual,valor:p=>p.acciones*p.precioActual,pl:p=>p.acciones*(p.precioActual-p.precioCompra),plpct:p=>{const c=p.acciones*p.precioCompra;return c?(p.acciones*p.precioActual-c)/c:0;},divacc:p=>p.divAccion,divano:p=>p.acciones*p.divAccion,rpd:p=>p.precioActual?p.divAccion/p.precioActual:0,yoc:p=>p.precioCompra?p.divAccion/p.precioCompra:0}):[...byCart[car]].sort((a,b)=>(b.acciones*b.precioActual)-(a.acciones*a.precioActual));
    const sV=lst.reduce((x,p)=>x+p.acciones*p.precioActual,0), sC=lst.reduce((x,p)=>x+p.acciones*p.precioCompra,0), sD=lst.reduce((x,p)=>x+p.acciones*p.divAccion,0), sPL=sV-sC;
    const rows=lst.map(p=>{
      const v=p.acciones*p.precioActual, c=p.acciones*p.precioCompra, g=v-c, gp=c?g/c*100:0, peso=valor?v/valor*100:0;
      const _du=(typeof dossierURL==='function')?dossierURL(p.ticker,((DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===(p.ticker||'').toUpperCase())||{}).dossierUrl):'';
      return `<tr><td style="white-space:nowrap"><button class="btn ghost sm" data-ficha="${p.ticker}"><b>${p.ticker}</b></button><br><button class="btn ghost sm" data-ops-t="${p.ticker}" data-ops-c="${p.cartera}" style="font-size:10px;margin-top:3px">+ Operación</button>${_du?`<a class="btn ghost sm" href="${_du}" target="_blank" rel="noopener" style="font-size:10px;margin-top:3px;margin-left:4px" title="Abrir dossier">📄 Dossier</a>`:''}</td><td>${p.nombre||''}</td><td class="num">${p.acciones}</td><td class="num">${fmt(p.precioCompra)}</td><td class="num" style="color:${precioFreshColor(p.precioFecha,refFecha)};font-weight:600" title="${p.precioFecha?('Cotización del '+ddmmyyyy(p.precioFecha)):'Sin fecha de cotización'}">${fmt(p.precioActual)}</td><td class="num">${fmt(v)}</td><td class="num ${g>=0?'pos':'neg'}">${g>=0?'+':''}${fmt(g)}</td><td class="num ${g>=0?'pos':'neg'}">${c?((gp>=0?'+':'')+gp.toFixed(1)+'%'):'—'}</td><td class="num">${peso.toFixed(1)}%</td><td class="num">${fmt(p.divAccion)}</td><td class="num">${fmt(p.acciones*p.divAccion)}</td><td class="num">${p.precioActual?((p.divAccion/p.precioActual)*100).toFixed(2)+'%':'—'}</td><td class="num">${p.precioCompra?((p.divAccion/p.precioCompra)*100).toFixed(2)+'%':'—'}</td><td class="right"><button class="btn danger sm" data-del-t="${p.ticker}" data-del-c="${p.cartera}">✕</button></td></tr>`;
    }).join('');
    const sub=`<tr style="font-weight:700;background:#f1f5f9"><td>SUBTOTAL</td><td></td><td></td><td></td><td></td><td class="num">${fmt(sV)}</td><td class="num ${sPL>=0?'pos':'neg'}">${sPL>=0?'+':''}${fmt(sPL)}</td><td></td><td></td><td></td><td class="num">${fmt(sD)}</td><td></td><td></td><td></td></tr>`;
    html+=`<h3 style="margin-top:18px">Cartera: ${car} <span class="muted" style="font-weight:400;font-size:12px">· ${lst.length} valores · ${fmt(sV)}</span></h3><div style="overflow:auto"><table><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div>`;
  });
  $('#invTable').innerHTML=fechaBanner+html;
  renderInvClosed();
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
  if(opEditId){ const o=DB.operaciones.find(x=>x.id===opEditId); if(o){ o.fecha=fecha; o.tipo=tipo; o.acciones=n; o.precio=precio; } opEditEnd(); }
  else { DB.operaciones.push({id:uid(),fecha,ticker:invOpsTicker,cartera:invOpsCartera||'Propia',tipo,acciones:n,precio}); }
  $('#opAcc').value=''; $('#opPrecio').value='';
  renderInv(); renderInvOps(); scheduleSave();
}
function editOp(id){ const o=DB.operaciones.find(x=>x.id===id); if(!o)return; opEditId=id;
  $('#opFecha').value=o.fecha||''; $('#opTipo').value=o.tipo; $('#opAcc').value=o.acciones; $('#opPrecio').value=o.precio;
  $('#opAdd').textContent='Guardar cambios'; $('#opCancelEdit').style.display='inline-block'; }
function opEditEnd(){ opEditId=null; const b=$('#opAdd'); if(b)b.textContent='Añadir operación'; const c=$('#opCancelEdit'); if(c)c.style.display='none'; }
function invNuevoValor(){
  const t=$('#invTicker').value.trim().toUpperCase(); if(!t){alert('Pon el ticker.');return;}
  DB.valores=DB.valores||{};
  DB.valores[t]={nombre:$('#invNombre').value.trim()||t, precioActual:num($('#invPA').value), divAccion:num($('#invDiv').value), broker:$('#invBroker').value.trim(), exchange:$('#invExch').value.trim()||'BME'};
  const acc=num($('#invAcc').value);
  const car=($('#invCart').value||'').trim()||'Propia';
  if(acc>0){ DB.operaciones.push({id:uid(),fecha:$('#invFecha').value||'',ticker:t,cartera:car,tipo:'compra',acciones:acc,precio:num($('#invPC').value)}); }
  $('#invForm').reset(); $('#invExch').value='BME'; $('#invForm').style.display='none';
  renderInv(); scheduleSave(); setInvStatus('Valor añadido: '+t);
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
function importInv(file){ file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;} const arr=Array.isArray(d)?d:(d.inversiones||[]); if(!arr.length){alert('Sin posiciones');return;}
  DB.inversiones=arr.map(p=>({id:uid(),ticker:p.ticker||'',nombre:p.nombre||'',acciones:num(p.acciones),precioCompra:num(p.precioCompra),precioActual:num(p.precioActual),divAccion:num(p.divAccion),exchange:p.exchange||'BME',broker:p.broker||''}));
  renderInv(); saveNow(); alert('Importadas '+DB.inversiones.length+' posiciones.'); }); }
function renderAnalisis(){
  if(!DB.config)DB.config={};
  const vU=(DB.config.anaVerde!=null?DB.config.anaVerde:0.20), aU=(DB.config.anaAmbar!=null?DB.config.anaAmbar:0.05);
  const ve=$('#anaVerde'); if(ve)ve.value=Math.round(vU*100);
  const ae=$('#anaAmbar'); if(ae)ae.value=Math.round(aU*100);
  const RPTS={AAA:100,AA:90,A:80,BBB:65,BB:50,B:35,CCC:25,CC:20,C:15};
  const cw=DB.config.anaPesos||{}; const wA=(cw.a!=null?cw.a:0.35),wB=(cw.b!=null?cw.b:0.20),wC=(cw.c!=null?cw.c:0.30),wD=(cw.d!=null?cw.d:0.15);
  const cl=x=>Math.max(0,Math.min(100,x));
  const held=new Set(); try{ (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)held.add((p.ticker||'').toUpperCase()); }); }catch(e){}
  const list=(DB.analisis||[]).map(a=>{
    const cot=num(a.cotizacion),poMin=num(a.poMin),poMax=num(a.poMax),entMin=num(a.entMin),entMax=num(a.entMax),stop=num(a.stopTesis),dv=num(a.divAccion);
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
    return {id:a.id,ticker:a.ticker,nombre:a.nombre,cot,poMin,poMax,poMed,entMin,entMax,stop,colchon,stopHit,held:held.has((a.ticker||'').toUpperCase()),rating,dv,pot,dist,A,B,C,D,score};
  });
  if(_sort['analisis']&&_sort['analisis'].k){ list=sortApply('analisis',list,{ticker:x=>x.ticker,nombre:x=>x.nombre,score:x=>x.score,cot:x=>x.cot,poMin:x=>x.poMin,poMax:x=>x.poMax,poMed:x=>x.poMed,entMin:x=>x.entMin,entMax:x=>x.entMax,pot:x=>x.pot,dist:x=>x.dist,stop:x=>x.stop,colchon:x=>x.colchon,rating:x=>x.rating}); } else { list.sort((a,b)=>(b.score==null?-1:b.score)-(a.score==null?-1:a.score)); }
  let bestId=null,bestSc=-1;
  list.forEach(x=>{ if(x.score!=null&&x.entMax&&x.cot&&x.cot<=x.entMax&&x.score>bestSc){bestSc=x.score;bestId=x.id;} });
  const enZona=list.filter(x=>x.entMax&&x.cot&&x.cot<=x.entMax).length;
  const buenScore=list.filter(x=>x.score!=null&&x.score>=70).length;
  const stopHits=list.filter(x=>x.stopHit).length;
  const bestT=(list.find(x=>x.id===bestId)||{}).ticker||'—';
  $('#anaCards').innerHTML=[
    {l:'Empresas en seguimiento',v:list.length,cls:''},
    {l:'En zona de compra',v:enZona,cls:enZona?'pos':''},
    {l:'Mejor oportunidad ahora',v:bestT,cls:'pos'},
    {l:'🚨 Stop de tesis alcanzado',v:stopHits,cls:stopHits?'neg':''}
  ].map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div></div>`).join('');
  if(!list.length){ $('#anaTable').innerHTML='<div class="empty">Sin empresas. Pulsa «+ Empresa» o «Pegar cotizaciones».</div>'; return; }
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
    const _dopts=['','COMPRAR','MANTENER','ESPERAR','VENDER'].map(o=>`<option value="${o}"${o===_dv?' selected':''}>${o||'—'}</option>`).join('');
    const _du=(typeof dossierURL==='function')?dossierURL(a.ticker,a.dossierUrl):(a.dossierUrl||''); const _dossM=(a.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null;
    const decCell=`<td style="text-align:center;white-space:nowrap"><select class="anaInp" data-id="${a.id}" data-f="decision" style="font-size:10px;font-weight:700;color:${_dc[_dv]||'#475569'}">${_dopts}</select>${_du?` <a href="${_du}" target="_blank" rel="noopener" title="Abrir dossier${a.dossierFecha?' ('+a.dossierFecha+')':''}" style="text-decoration:none;font-size:14px">📄</a>`:''}${(_dossM!=null)?` <span title="Dossier de ${a.dossierFecha}" style="font-size:9px;color:${_dossM>12?'#dc2626':'#94a3b8'}">${_dossM}m${_dossM>12?'⚠️':''}</span>`:''}</td>`;
    const star=a.id===bestId?'⭐ ':'';
    const rowStyle=a.stopHit?' style="background:#fef2f2"':(a.id===bestId?' style="background:#f0fdf4"':'');
    return `<tr${rowStyle}>
      <td>${star}<b${a.ticker?` data-ficha="${a.ticker}" style="cursor:pointer;color:var(--brand)" title="Abrir ficha"`:''}>${a.ticker||''}</b>${a.held?' <span class="muted" style="font-size:9px">en cartera</span>':''}</td><td>${a.ticker?`<span data-ficha="${a.ticker}" style="cursor:pointer;color:var(--brand);text-decoration:underline" title="Abrir ficha">${a.nombre||''}</span>`:(a.nombre||'')}${(typeof SECTOR!=='undefined'&&SECTOR[(a.ticker||'').toUpperCase()])?`<div class="muted" style="font-size:9px" title="${(typeof SUBTIPO!=='undefined'&&SUBTIPO[(a.ticker||'').toUpperCase()])||''}">${SECTOR[(a.ticker||'').toUpperCase()]}</div>`:''}</td>
      <td style="text-align:center;white-space:nowrap"><div style="font-size:20px;font-weight:800;line-height:1.05;color:${sCol}">${a.score==null?'—':a.score.toFixed(0)}</div>${a.score==null?'':`<div style="font-size:9px;font-weight:700;color:${sCol};text-transform:uppercase;letter-spacing:.03em">${sLbl}</div>`}</td>
      ${decCell}
      <td class="num">${fmt(a.cot)}</td>
      <td class="num">${inp(a.id,'poMin',a.poMin)}</td>
      <td class="num">${a.poMed?fmt(a.poMed):'—'}</td>
      <td class="num">${inp(a.id,'poMax',a.poMax)}</td>
      <td class="num"><span class="pill ${potcls}">${a.pot==null?'—':(a.pot>=0?'+':'')+(a.pot*100).toFixed(1)+'%'}</span></td>
      <td class="num">${inp(a.id,'entMin',a.entMin)}</td>
      <td class="num">${inp(a.id,'entMax',a.entMax)}</td>
      <td><span class="pill ${ecls}">${estado}</span></td>
      <td class="num">${inp(a.id,'stopTesis',a.stop)}</td>
      <td><span class="pill ${scls2}">${salida}</span></td>
      <td class="num"><input type="text" class="anaInp" style="width:48px;text-align:center;text-transform:uppercase" data-id="${a.id}" data-f="rating" value="${a.rating||''}"></td>
      <td class="right"><button class="btn ghost sm" data-anaedit="${a.id}">Editar</button> <button class="btn danger sm" data-anadel="${a.id}">✕</button></td></tr>`;
  }).join('');
  $('#anaTable').innerHTML=`<table><thead><tr><th data-sorttbl="analisis" data-sortk="ticker" style="cursor:pointer">Ticker${sortArrow('analisis','ticker')}</th><th>Nombre</th><th class="num" data-sorttbl="analisis" data-sortk="score" style="cursor:pointer">Score${sortArrow('analisis','score')}</th><th>Decisión</th><th class="num" data-sorttbl="analisis" data-sortk="cot" style="cursor:pointer">Cotiz.${sortArrow('analisis','cot')}</th><th class="num" data-sorttbl="analisis" data-sortk="poMin" style="cursor:pointer">PO mín${sortArrow('analisis','poMin')}</th><th class="num" data-sorttbl="analisis" data-sortk="poMed" style="cursor:pointer">PO med${sortArrow('analisis','poMed')}</th><th class="num" data-sorttbl="analisis" data-sortk="poMax" style="cursor:pointer">PO máx${sortArrow('analisis','poMax')}</th><th class="num" data-sorttbl="analisis" data-sortk="pot" style="cursor:pointer">Potencial${sortArrow('analisis','pot')}</th><th class="num" data-sorttbl="analisis" data-sortk="entMin" style="cursor:pointer">Ent. mín${sortArrow('analisis','entMin')}</th><th class="num" data-sorttbl="analisis" data-sortk="entMax" style="cursor:pointer">Ent. máx${sortArrow('analisis','entMax')}</th><th data-sorttbl="analisis" data-sortk="dist" style="cursor:pointer">Estado entrada${sortArrow('analisis','dist')}</th><th class="num" data-sorttbl="analisis" data-sortk="stop" style="cursor:pointer">Stop tesis${sortArrow('analisis','stop')}</th><th data-sorttbl="analisis" data-sortk="colchon" style="cursor:pointer">Salida${sortArrow('analisis','colchon')}</th><th class="num" data-sorttbl="analisis" data-sortk="rating" style="cursor:pointer">Rating${sortArrow('analisis','rating')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  $$("#anaTable select[data-f='decision']").forEach(sel=>{ const _a=(DB.analisis||[]).find(x=>x.id===sel.dataset.id); if(_a)sel.value=(_a.decision||'').toUpperCase(); });
}
function anaSubmit(){
  const id=$('#anaId').value||uid();
  const poMin=num($('#anaPoMin').value), poMax=num($('#anaPoMax').value);
  const entMin=num($('#anaEntMin').value), entMax=num($('#anaEntMax').value);
  const poMed=(poMin&&poMax)?(poMin+poMax)/2:(poMax||poMin||0);
  const a={id,ticker:$('#anaTicker').value.trim().toUpperCase(),nombre:$('#anaNombre').value.trim(),cotizacion:num($('#anaCot').value),poMin,poMax,entMin,entMax,rating:($('#anaRating').value||'').trim().toUpperCase(),stopTesis:num($('#anaStop').value),decision:($('#anaDecision').value||'').toUpperCase(),dossierFecha:$('#anaDossierFecha').value||'',dossierUrl:($('#anaDossierUrl').value||'').trim(),divAccion:num($('#anaDivA').value),notas:$('#anaNotas').value.trim(),precioObjetivo:poMed,precioEntrada:entMax};
  if(!a.ticker&&!a.nombre){alert('Pon al menos ticker o nombre.');return;}
  DB.analisis=DB.analisis||[];
  const ex=DB.analisis.find(x=>x.id===id); if(ex)Object.assign(ex,a); else DB.analisis.push(a);
  $('#anaForm').reset(); $('#anaId').value=''; $('#anaForm').style.display='none'; $('#anaSubmit').textContent='Añadir';
  renderAnalisis(); scheduleSave();
}
function anaEdit(id){ const a=DB.analisis.find(x=>x.id===id); if(!a)return;
  $('#anaId').value=a.id; $('#anaTicker').value=a.ticker||''; $('#anaNombre').value=a.nombre||''; $('#anaCot').value=a.cotizacion; $('#anaPoMin').value=a.poMin||''; $('#anaPoMax').value=a.poMax||''; $('#anaEntMin').value=a.entMin||''; $('#anaEntMax').value=a.entMax||''; $('#anaRating').value=a.rating||''; $('#anaStop').value=a.stopTesis||''; $('#anaDecision').value=a.decision||''; $('#anaDossierFecha').value=a.dossierFecha||''; $('#anaDossierUrl').value=a.dossierUrl||''; $('#anaDivA').value=a.divAccion; $('#anaNotas').value=a.notas||'';
  $('#anaSubmit').textContent='Guardar'; $('#anaForm').style.display='grid'; window.scrollTo({top:0,behavior:'smooth'}); }
function setAnaStatus(t){ const e=$('#anaStatus'); if(e)e.textContent=t; }
function aplicarAnaPaste(){
  const txt=$('#anaPasteTxt').value||''; if(!txt.trim()){alert('Pega los datos primero.');return;}
  DB.analisis=DB.analisis||[]; DB.valores=DB.valores||{};
  const anaByTick={}; DB.analisis.forEach(a=>{ if(a.ticker)anaByTick[a.ticker.toUpperCase()]=a; });
  let upd=0,add=0,bad=0;
  txt.split(/\r?\n/).forEach(line=>{ if(!line.trim())return;
    let cols=line.split('\t'); if(cols.length<2) cols=line.split(/\t|\s{2,}|;/);
    cols=cols.map(c=>c.trim());
    const nombre=cols[0]||''; if(!nombre){bad++;return;}
    const precio=parseNumES(cols[1]||''); const div=parseNumES(cols[2]||'');
    if(isNaN(precio)&&isNaN(div)){bad++;return;}
    const t=anaFindTicker(nombre).toUpperCase();
    const v=DB.valores[t]=DB.valores[t]||{}; v.nombre=nombre;
    if(!isNaN(precio)){ v.precioActual=precio; v.precioFecha=new Date().toISOString().slice(0,10); v.precioManual=true; }
    if(!isNaN(div)){ v.divAccion=div; const _ny=new Date().getFullYear(); DB.divPorAccion=DB.divPorAccion||{}; DB.divPorAccion[t]=DB.divPorAccion[t]||{}; DB.divPorAccion[t][_ny]=div; }
    let a=anaByTick[t];
    if(a){ if(!isNaN(precio))a.cotizacion=precio; if(!isNaN(div))a.divAccion=div; a.nombre=nombre; upd++; }
    else { a={id:uid(),ticker:t,nombre:nombre,cotizacion:isNaN(precio)?0:precio,poMin:0,poMax:0,entMin:0,entMax:0,rating:'',stopTesis:0,decision:'',dossierFecha:'',dossierUrl:'',precioEntrada:0,precioObjetivo:0,divAccion:isNaN(div)?0:div,notas:''}; DB.analisis.push(a); anaByTick[t]=a; add++; }
  });
  renderAnalisis(); renderInv(); if(typeof renderDividendos==='function')renderDividendos(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); scheduleSave();
  $('#anaPasteTxt').value=''; $('#anaPastePanel').style.display='none';
  setAnaStatus('Actualizadas '+upd+', añadidas '+add+(bad?(' · '+bad+' líneas ignoradas'):'')+'.');
}
let fichaTicker=null; let _dossierSet=null; let _tesisSet=null; let _tesisCache={}; let _tesisWarn={}; let _trimCache={};
let fichaRange='all';
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
  // cabecera + URL externa
  const header=`
   <div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
     <div><div style="font-size:22px;font-weight:800;color:var(--brand)">${f.t}</div><div class="muted">${f.nombre||''}${(typeof SECTOR!=='undefined'&&SECTOR[fichaTicker])?` · <span style="color:#9a3412;font-weight:600">${SECTOR[fichaTicker]}</span>${(typeof SUBTIPO!=='undefined'&&SUBTIPO[fichaTicker])?` <span class="muted" style="font-size:11px">· ${SUBTIPO[fichaTicker]}</span>`:''}`:''}${isClosed?' · <span style=\"color:#b45309\">Posición cerrada</span>':''}</div></div>
     <div style="flex:1"></div>
     <div style="text-align:right"><div class="muted" style="font-size:11px">Precio actual</div><div style="font-size:20px;font-weight:700">${fmt(f.precioActual)}</div></div>
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
  const divSection=`<h3>Histórico de dividendos</h3>
   <div class="card" style="margin-bottom:10px"><div class="patgrid">
     <label>Fecha<input type="date" id="fdivFecha"></label>
     <label>Dividendo/acción (€)<input type="number" step="0.0001" id="fdivImp"></label>
     <div class="row-actions" style="align-self:end"><button class="btn" id="fdivAdd">Añadir dividendo</button></div>
   </div></div>${divTable}`;
  const _ranges=[['1a','1A'],['3a','3A'],['5a','5A'],['all','Todo']];
  const rangeBtns=_ranges.map(r=>`<button type="button" data-frange="${r[0]}"${fichaRange===r[0]?' class="on"':''}>${r[1]}</button>`).join('');
  const chartCard=`<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px"><div style="font-weight:700">Cotización</div><div style="flex:1"></div><div class="seg" id="fchRange">${rangeBtns}</div></div><div id="fichaChart" style="min-height:180px">Cargando cotización…</div></div>`;
  const _ana=(DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===fichaTicker)||{};
  const _decCol={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; const _dec=(_ana.decision||'').toUpperCase(); const _duF=(typeof dossierURL==='function')?dossierURL(fichaTicker,_ana.dossierUrl):(_ana.dossierUrl||''); const _mmV=(_ana.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(_ana.dossierFecha):null;
  const veredictoCard = (_dec||_ana.rating||_duF) ? `<div class="card" style="margin-top:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="muted" style="font-size:12px">Veredicto:</span>${_dec?`<span style="font-weight:800;color:${_decCol[_dec]||'#475569'};font-size:15px">${_dec}</span>`:'<span class="muted">—</span>'}${_ana.rating?` <span style="font-size:12px">Calidad <b>${_ana.rating}</b></span>`:''}${_ana.dossierFecha?` <span style="font-size:11px;color:${(_mmV!=null&&_mmV>12)?'#dc2626':'#64748b'}">análisis ${_ana.dossierFecha}${_mmV!=null?' ('+_mmV+'m'+(_mmV>12?' ⚠️':'')+')':''}</span>`:''}<div style="flex:1"></div>${_duF?`<a class="btn" href="${_duF}" target="_blank" rel="noopener">📄 Abrir dossier</a>`:'<span class="muted" style="font-size:11px">sin dossier enlazado</span>'}</div>` : '';
  if(_tesisCache[fichaTicker]===undefined&&typeof cargarTesis==='function')cargarTesis(fichaTicker);
  const tesisCard=(typeof tesisCardHTML==='function')?tesisCardHTML(_tesisCache[fichaTicker]):'';
  if(_trimCache[fichaTicker]===undefined&&typeof cargarTrimestral==='function')cargarTrimestral(fichaTicker);
  const trimCard=(typeof trimCardHTML==='function')?trimCardHTML(_trimCache[fichaTicker]):'';
  const protoCard=(typeof protoRegHTML==='function')?protoRegHTML(fichaTicker):'';
  $('#fichaView').innerHTML=header+(tesisCard?'':veredictoCard)+tesisCard+trimCard+protoCard+chartCard+(typeof tesisHistHTML==='function'?tesisHistHTML(fichaTicker):'')+mid+divSection;
  document.title='Ficha '+f.t;
  if(typeof drawFichaChart==='function') drawFichaChart(fichaTicker);
}
async function drawFichaChart(t){
  const el=$('#fichaChart'); if(!el)return;
  let pj=_precioCache[t];
  if(pj===undefined){
    try{ const r=await fetch('precios/'+t+'.json',{cache:'no-store'}); pj=r.ok?await r.json():null; }catch(e){ pj=null; }
    _precioCache[t]=pj;
  }
  if(!pj||!pj.data||!pj.data.length){ el.innerHTML='<div class="muted" style="font-size:12px">Sin datos de cotización para '+t+'. (¿Está en precios/ del repo?)</div>'; return; }
  let data=pj.data.map(d=>[Date.parse(d[0]),d[1]]).filter(d=>!isNaN(d[0]));
  if(data.length<2){ el.innerHTML='<div class="muted" style="font-size:12px">Sin datos suficientes.</div>'; return; }
  const lastT=data[data.length-1][0];
  const yrs={'1a':1,'3a':3,'5a':5}[fichaRange];
  if(yrs){ const cut=lastT-yrs*365.25*86400000; data=data.filter(d=>d[0]>=cut); }
  if(data.length<2){ el.innerHTML='<div class="muted" style="font-size:12px">Pocos datos en este rango.</div>'; return; }
  const MAXP=600; const step=Math.ceil(data.length/MAXP); let pts=step>1?data.filter((_,i)=>i%step===0):data.slice();
  if(pts[pts.length-1][0]!==data[data.length-1][0]) pts.push(data[data.length-1]);
  const poss=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.ticker===t&&p.acciones>0.0001);
  let acc=0,cost=0; poss.forEach(p=>{acc+=p.acciones;cost+=p.acciones*p.precioCompra;}); const avg=acc?cost/acc:0; const _an=(DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===(t||'').toUpperCase())||{}; const poB=num(_an.poMin),poU=num(_an.poMax),poM=(num(_an.poMin)&&num(_an.poMax))?(num(_an.poMin)+num(_an.poMax))/2:(num(_an.poMax)||num(_an.poMin)||0); const entL=num(_an.entMin),entH=num(_an.entMax),stopV=num(_an.stopTesis);
  const t0=data[0][0], t1=data[data.length-1][0];
  const ops=(typeof fichaOps==='function'?fichaOps(t):[]).filter(o=>o.fecha&&Date.parse(o.fecha)>=t0&&Date.parse(o.fecha)<=t1).map(o=>({x:Date.parse(o.fecha),p:o.precio,venta:o.tipo==='venta'}));
  const W=860,H=280,L=52,R=12,Tp=12,B=26; const pw=W-L-R, ph=H-Tp-B;
  let lo=Math.min(...pts.map(p=>p[1])), hi=Math.max(...pts.map(p=>p[1]));
  ops.forEach(o=>{ if(o.p){ if(o.p<lo)lo=o.p; if(o.p>hi)hi=o.p; } }); if(avg){ if(avg<lo)lo=avg; if(avg>hi)hi=avg; } [poB,poM,poU].forEach(v=>{ if(v>0){ if(v<lo)lo=v; if(v>hi)hi=v; } }); [entL,entH,stopV].forEach(v=>{ if(v>0){ if(v<lo)lo=v; if(v>hi)hi=v; } });
  const pad=(hi-lo)*0.06||1; lo-=pad; hi+=pad;
  const X=x=>L+(x-t0)/((t1-t0)||1)*pw, Y=v=>Tp+(1-(v-lo)/((hi-lo)||1))*ph;
  let path=''; pts.forEach((p,i)=>{ path+=(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)+' '; });
  let grid=''; const NY=4; for(let i=0;i<=NY;i++){ const v=lo+(hi-lo)*i/NY, y=Y(v); grid+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#e2e8f0"/><text x="${L-5}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748b">${v.toFixed(2)}</text>`; }
  let xl=''; const yA=new Date(t0).getFullYear(), yB=new Date(t1).getFullYear(); const sY=Math.ceil((yB-yA+1)/8)||1; for(let y=yA;y<=yB;y+=sY){ const ts=Date.parse(y+'-01-01'); if(ts<t0||ts>t1)continue; const x=X(ts); xl+=`<line x1="${x.toFixed(1)}" y1="${Tp}" x2="${x.toFixed(1)}" y2="${Tp+ph}" stroke="#f1f5f9"/><text x="${x.toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="#64748b">${y}</text>`; }
  let avgL=''; if(avg){ const y=Y(avg); avgL=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#7c3aed" stroke-width="1.2" stroke-dasharray="5 3"/><text x="${W-R}" y="${(y-3).toFixed(1)}" text-anchor="end" font-size="9" fill="#7c3aed">P.medio ${avg.toFixed(2)}</text>`; }
  let poBand=''; if(poB>0&&poU>0){ const yTop=Y(Math.max(poB,poU)), yBot=Y(Math.min(poB,poU)); poBand=`<rect x="${L}" y="${yTop.toFixed(1)}" width="${pw.toFixed(1)}" height="${(yBot-yTop).toFixed(1)}" fill="#16a34a" opacity="0.10"/>`; }
  let entBand=''; if(entL>0&&entH>0){ const yTop=Y(Math.max(entL,entH)), yBot=Y(Math.min(entL,entH)); entBand=`<rect x="${L}" y="${yTop.toFixed(1)}" width="${pw.toFixed(1)}" height="${(yBot-yTop).toFixed(1)}" fill="#0ea5e9" opacity="0.12"/>`; }
  let stopL=''; if(stopV>0){ const y=Y(stopV); stopL=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="#dc2626" stroke-width="2" opacity="0.95"/><text x="${L+3}" y="${(y-2).toFixed(1)}" font-size="9" fill="#dc2626">Stop ${stopV.toFixed(2)}</text>`; }
  let poL=''; [['bear',poB,'#dc2626',2],['base',poM,'#2563eb',1.1],['bull',poU,'#16a34a',2]].forEach(it=>{ const v=it[1]; if(v>0){ const y=Y(v); poL+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="${it[2]}" stroke-width="${it[3]}" stroke-dasharray="${it[3]>=2?'7 3':'2 3'}" opacity="0.9"/><text x="${L+3}" y="${(y-2).toFixed(1)}" font-size="9" fill="${it[2]}">PO ${it[0]} ${v.toFixed(2)}</text>`; } });
  let mk=''; ops.forEach(o=>{ if(!o.p)return; mk+=`<circle cx="${X(o.x).toFixed(1)}" cy="${Y(o.p).toFixed(1)}" r="4" fill="${o.venta?'#dc2626':'#16a34a'}" stroke="#fff" stroke-width="1"><title>${o.venta?'Venta':'Compra'} ${new Date(o.x).toISOString().slice(0,10)} @ ${o.p.toFixed(3)}</title></circle>`; });
  const last=pts[pts.length-1][1];
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">${grid}${xl}${entBand}${poBand}<path d="${path}" fill="none" stroke="var(--brand)" stroke-width="1.6"/>${poL}${stopL}${avgL}${mk}</svg><div class="muted" style="font-size:11px;margin-top:2px">Último cierre ${last.toFixed(2)} (${pj.data[pj.data.length-1][0]}) · <span style="color:#16a34a">●</span> compra · <span style="color:#dc2626">●</span> venta · <span style="color:#7c3aed">▬</span> precio medio · <span style="color:#2563eb">▬</span> precio objetivo · <span style="color:#0ea5e9">▬</span> banda de entrada · <span style="color:#dc2626">▬</span> stop</div>`;
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
    const act=p._arch?`<button class="btn danger sm" data-delcerrada="${p.id}" title="Quitar de archivadas">✕</button>`:`<button class="btn ghost sm" data-archive="${p.ticker}" title="Archivar permanente">Archivar</button>`;
    return `<tr><td><button class="btn ghost sm" data-ficha="${p.ticker}"><b>${p.ticker}</b></button></td><td>${p.nombre||''}</td><td class="num">${p.acciones}</td><td class="num">${fmt(pc)}</td><td class="num">${fmt(p.coste)}</td><td class="num">${fmt(pv)}</td><td class="num">${fmt(p.venta)}</td><td class="num pos">${fmt(p.dividendos)}</td><td class="num ${neto>=0?'pos':'neg'}">${neto>=0?'+':''}${fmt(neto)}</td><td class="num ${rent>=0?'pos':'neg'}">${(rent>=0?'+':'')+(rent*100).toFixed(1)+'%'}</td><td class="muted" style="font-size:11px;white-space:nowrap">${fdate(p.fechaCompra)} → ${fdate(p.fechaVenta)}</td><td class="right">${act}</td></tr>`;
  }).join('');
  const netoT=sV-sC+sD, rentT=sC?netoT/sC:0;
  const sub=`<tr style="font-weight:700;background:#f1f5f9"><td>TOTAL</td><td></td><td></td><td></td><td class="num">${fmt(sC)}</td><td></td><td class="num">${fmt(sV)}</td><td class="num pos">${fmt(sD)}</td><td class="num ${netoT>=0?'pos':'neg'}">${netoT>=0?'+':''}${fmt(netoT)}</td><td class="num ${rentT>=0?'pos':'neg'}">${(rentT>=0?'+':'')+(rentT*100).toFixed(1)+'%'}</td><td></td><td></td></tr>`;
  const head='<tr><th>Ticker</th><th>Nombre</th><th class="num">Acc.</th><th class="num">P.Compra</th><th class="num">Coste</th><th class="num">P.Venta</th><th class="num">Venta</th><th class="num">Dividendos</th><th class="num">P/G neta</th><th class="num">Rent.</th><th>Periodo</th><th></th></tr>';
  el.innerHTML=`<h3 style="margin-top:22px">Posiciones cerradas <span class="muted" style="font-weight:400;font-size:12px">· ${lst.length} · resultado neto incluye dividendos · «Archivar» fija el ciclo para siempre</span></h3><div style="overflow:auto"><table><thead>${head}</thead><tbody>${rows}${sub}</tbody></table></div>`;
}
function autoFitTable(id,minPx,maxPx){ const w=$('#'+id); if(!w)return; const t=w.querySelector('table'); if(!t)return; if(!w.clientWidth)return; let fs=maxPx; t.style.fontSize=fs+'px'; let g=0; while(t.scrollWidth>w.clientWidth+1 && fs>minPx && g<50){ fs-=0.5; t.style.fontSize=fs+'px'; g++; } }
function fitDividendos(){ autoFitTable('divMatrixWrap',8,12); autoFitTable('divResumenWrap',8,12); }
function renderDividendos(){
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
  // KPIs
  const ultimo=years.filter(y=>totYear[y]>0).slice(-1)[0]||'—';
  const kpis=[
    ['Total cobrado (bruto)',fmt(grand)],
    ['Total neto (−19%)',fmt(grand*0.81)],
    ['Cobrado '+ultimo, ultimo==='—'?'—':fmt(totYear[ultimo]||0)],
    ['Empresas que pagan', String(cols.length)]
  ];
  $('#divKpis').innerHTML=kpis.map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  // MATRIZ (años desc)
  let head='<tr><th>Año</th>'+cols.map(t=>`<th class="num" title="${nm(t)}"><span data-ficha="${t}" style="cursor:pointer;color:var(--brand)">${t}</span></th>`).join('')+'<th class="num">TOTAL</th></tr>';
  let body=''; [...years].reverse().forEach(y=>{ if(!totYear[y])return; const tds=cols.map(t=>{const v=byTY[t][y]||0; return `<td class="num">${v?fmt(v):'·'}</td>`;}).join(''); body+=`<tr><td>${y}</td>${tds}<td class="num" style="font-weight:700">${fmt(totYear[y])}</td></tr>`; });
  let foot=`<tr style="font-weight:700;background:#eef2f7"><td>TOTAL</td>${cols.map(t=>`<td class="num">${fmt(totT[t])}</td>`).join('')}<td class="num">${fmt(grand)}</td></tr>`;
  $('#divMatrixWrap').innerHTML=cols.length?`<table>${head}${body}${foot}</table>`:'<div class="empty">Sin dividendos registrados todavía.</div>';
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
  const rhead='<tr><th>Año</th><th class="num">Compras</th><th class="num">Ventas</th><th class="num">Invertido</th><th class="num">%Inv</th><th class="num">Valor compra</th><th class="num">%Compra</th><th class="num">Div bruto</th><th class="num">Div neto</th><th class="num">Dev. Hacienda</th><th class="num">Impuesto</th><th class="num">Total ingresado</th><th class="num">Descuento real</th><th class="num">Rent. neta</th><th class="num">Tasa imp.</th></tr>';
  const rbody=[...rs].reverse().map(r=>{ const has=r.divB||r.dev; return `<tr><td>${r.y}</td><td class="num">${r.comp?fmt(r.comp):'·'}</td><td class="num">${r.vent?fmt(r.vent):'·'}</td><td class="num">${fmt(r.inv)}</td><td class="num">${r.divB?fmtpct(r.rInv):'·'}</td><td class="num">${fmt(r.valC)}</td><td class="num">${r.divB?fmtpct(r.rCom):'·'}</td><td class="num pos">${r.divB?fmt(r.divB):'·'}</td><td class="num pos">${r.divB?fmt(r.divN):'·'}</td><td class="num"><input type="number" step="0.01" class="anaInp" style="width:78px;text-align:right" data-devhac="${r.y}" value="${r.dev||''}"></td><td class="num">${r.divB?fmt(r.imp):'·'}</td><td class="num pos">${has?fmt(r.totIng):'·'}</td><td class="num ${r.descR<0?'pos':''}">${has?fmt(r.descR):'·'}</td><td class="num">${(r.valC>0&&has)?fmtpct(r.rNeta):'·'}</td><td class="num">${r.divB?fmtpct(r.tasa):'·'}</td></tr>`; }).join('');
  $('#divResumenWrap').innerHTML=rs.length?`<table>${rhead}${rbody}</table>`:'<div class="empty">Sin operaciones todavía.</div>';
  // RESUMEN FISCAL (renta)
  const _fy=[...new Set([...Object.keys(totYear),...Object.keys(ventY)])].filter(y=>(totYear[y]||0)>0||(ventY[y]||0)>0||(costSoldY[y]||0)>0).sort();
  let _tDB=0,_tRet=0,_tPL=0;
  const _fbody=[..._fy].reverse().map(y=>{ const db=totYear[y]||0, ret=db*0.19, pl=(ventY[y]||0)-(costSoldY[y]||0), base=db+pl; _tDB+=db; _tRet+=ret; _tPL+=pl; return `<tr><td>${y}</td><td class="num pos">${db?fmt(db):'\u00b7'}</td><td class="num">${db?fmt(ret):'\u00b7'}</td><td class="num ${pl<0?'neg':'pos'}">${((ventY[y]||0)||(costSoldY[y]||0))?fmt(pl):'\u00b7'}</td><td class="num" style="font-weight:600">${fmt(base)}</td></tr>`; }).join('');
  const _ffoot=`<tr style="font-weight:700;background:#eef2f7"><td>TOTAL</td><td class="num">${fmt(_tDB)}</td><td class="num">${fmt(_tRet)}</td><td class="num">${fmt(_tPL)}</td><td class="num">${fmt(_tDB+_tPL)}</td></tr>`;
  const _fhead='<tr><th>A\u00f1o</th><th class="num">Dividendos brutos</th><th class="num">Retenci\u00f3n 19%</th><th class="num">Ganancia patrimonial (ventas)</th><th class="num">Base del ahorro</th></tr>';
  const _fiscalHTML=_fy.length?`<table>${_fhead}${_fbody}${_ffoot}</table><div class="muted" style="font-size:11px;margin-top:4px">Orientativo para la renta: los dividendos son rendimientos del capital mobiliario (retenci\u00f3n del 19%); la ganancia patrimonial es ventas \u2212 coste de lo vendido (precio medio). No incluye comisiones ni p\u00e9rdidas compensables de a\u00f1os anteriores; consulta con tu asesor.</div>`:'<div class="empty">Sin datos fiscales todav\u00eda.</div>';
  let _fw=document.getElementById('fiscalWrap'); if(!_fw){ const _sec=document.getElementById('view-dividendos'); if(_sec){ const _h=document.createElement('h3'); _h.textContent='Resumen fiscal por a\u00f1o (renta)'; _h.style.marginTop='18px'; _fw=document.createElement('div'); _fw.id='fiscalWrap'; _fw.style.overflow='auto'; _sec.appendChild(_h); _sec.appendChild(_fw); } }
  if(_fw)_fw.innerHTML=_fiscalHTML;
  const _vd=$('#view-dividendos'); if(_vd&&_vd.classList.contains('active')) setTimeout(fitDividendos,0);
}
const MESES_ES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function calPrecio(c){ const v=(DB.valores||{})[(c.ticker||'').toUpperCase()]; const p=v&&num(v.precioActual)>0?num(v.precioActual):(c.precio||0); return p; }
function calSharesByTicker(){ const m={}; (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001){ const t=(p.ticker||'').toUpperCase(); m[t]=(m[t]||0)+p.acciones; } }); return m; }
function evTipo(code){ const c=(code||'').toUpperCase(); if(c[0]==='D') return 'div'; if(c[0]==='Q') return 'res'; if(c==='JA') return 'jun'; return 'otro'; }
function evTexto(code){ const c=(code||'').toUpperCase(); if(c[0]==='D') return 'Dividendo'; if(c[0]==='Q') return 'Resultados '+c; if(c==='JA') return 'Junta de accionistas'; if(c==='ID') return 'Investor Day'; return c; }
function renderEventos(){
  const ev=DB.eventos=DB.eventos||{};
  const held=new Set(); (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)held.add((p.ticker||'').toUpperCase()); });
  let tickers=[...new Set([...Object.keys(ev), ...held])].filter(Boolean);
  /* ---- Agenda: mes en curso + siguiente, en rejilla de bloques ---- */
  const ag=$('#calAgenda');
  if(ag){
    const now=new Date(); const nowM=now.getMonth()+1; const nextM=nowM===12?1:nowM+1;
    let all=[]; tickers.forEach(t=>(ev[t]||[]).forEach(e=>all.push({t,m:e.m,w:e.w,code:e.code})));
    let up=all.filter(e=> e.m===nowM || e.m===nextM).sort((a,b)=> a.m-b.m||a.w-b.w);
    const item=e=>{ const tp=evTipo(e.code); const h=held.has(e.t); return `<div style="font-size:11px;padding:3px 6px;background:#f8fafc;border-radius:6px"><span class="muted">${MESES_ES[e.m-1]} s${e.w}</span> <span class="evchip ev-${tp}">${e.code}</span> ${h?'<b>'+e.t+'</b>':e.t} <span class="muted">${evTexto(e.code)}</span></div>`; };
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
async function cargarTrimestral(t){ t=(t||'').toUpperCase(); if(!t){return;}
  try{ const r=await fetch('dossiers/trimestral/'+t+'-trim.json',{cache:'no-store'}); _trimCache[t]=r.ok?await r.json():null; }catch(e){ _trimCache[t]=null; }
  try{ const d=_trimCache[t]; if(d&&d.revisiones){ DB.monitor=DB.monitor||{}; DB.monitor[t]=DB.monitor[t]||{}; DB.monitor[t].rev=DB.monitor[t].rev||{}; let chg=false; d.revisiones.forEach(function(rv){ if(rv.periodo&&!DB.monitor[t].rev[rv.periodo]){ DB.monitor[t].rev[rv.periodo]=true; chg=true; } }); if(chg&&typeof scheduleSave==='function')scheduleSave(); } }catch(e){}
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
