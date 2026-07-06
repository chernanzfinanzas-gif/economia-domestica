let _sort={};
function sortToggle(t,k){ const c=_sort[t]||{}; if(c.k===k)c.dir=(c.dir===1?-1:1); else { c.k=k; c.dir=-1; } _sort[t]=c; }
function sortArrow(t,k){ const c=_sort[t]||{}; return c.k===k?(c.dir===1?' ▲':' ▼'):''; }
function sortApply(t,arr,g){ const c=_sort[t]; if(!c||!c.k||!g[c.k])return arr; const f=g[c.k]; return arr.slice().sort((a,b)=>{ let va=f(a),vb=f(b); if(typeof va==='string'||typeof vb==='string')return c.dir*String(va==null?'':va).localeCompare(String(vb==null?'':vb)); va=(va==null||isNaN(va))?-Infinity:va; vb=(vb==null||isNaN(vb))?-Infinity:vb; return c.dir*(va-vb); }); }
document.addEventListener('click',e=>{ const h=e.target.closest&&e.target.closest('[data-sortk]'); if(!h)return; sortToggle(h.dataset.sorttbl,h.dataset.sortk); const fn={ranking:(typeof renderRanking==='function'?renderRanking:null),cartera:(typeof renderInv==='function'?renderInv:null),analisis:(typeof renderAnalisis==='function'?renderAnalisis:null)}[h.dataset.sorttbl]; if(fn)fn(); });
function renderRanking(){
  const el=$('#rankTabla'); if(!el)return;
  const agg={}; (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones<=0.0001)return; const t=(p.ticker||'').toUpperCase(); const a=agg[t]=agg[t]||{ticker:t,nombre:p.nombre,sh:0,cost:0}; a.sh+=p.acciones; a.cost+=p.acciones*p.precioCompra; });
  let rows=Object.values(agg).map(a=>{ const v=(DB.valores||{})[a.ticker]||{}; const divAcc=num(v.divAccion), cot=num(v.precioActual); const pm=a.sh?a.cost/a.sh:0; const divAno=a.sh*divAcc, valor=a.sh*cot, cobr=divCobrados(a.ticker), bal=valor-a.cost+cobr;
    return {ticker:a.ticker,nombre:v.nombre||a.nombre,sh:a.sh,cost:a.cost,divAcc,cot,pm,divAno,valor,cobr,bal,yoc:pm?divAcc/pm:0,reval:a.cost?valor/a.cost-1:0,divPct:a.cost?cobr/a.cost:0,totPct:a.cost?bal/a.cost:0}; });
  if(!rows.length){ el.innerHTML='<div class="empty">Sin posiciones en cartera.</div>'; $('#rankKpis').innerHTML=''; return; }
  const T={divAno:0,cost:0,cobr:0,valor:0,bal:0}; rows.forEach(r=>{T.divAno+=r.divAno;T.cost+=r.cost;T.cobr+=r.cobr;T.valor+=r.valor;T.bal+=r.bal;});
  rows.forEach(r=>{ r.pesoDiv=T.divAno?r.divAno/T.divAno:0; r.pesoCoste=T.cost?r.cost/T.cost:0; r.pesoValor=T.valor?r.valor/T.valor:0; r.pesoBal=T.bal?r.bal/T.bal:0; });
  rows=(_sort['ranking']&&_sort['ranking'].k)?sortApply('ranking',rows,{ticker:r=>r.ticker,sh:r=>r.sh,pm:r=>r.pm,yoc:r=>r.yoc,divAcc:r=>r.divAcc,divAno:r=>r.divAno,pesoDiv:r=>r.pesoDiv,cost:r=>r.cost,cobr:r=>r.cobr,cot:r=>r.cot,valor:r=>r.valor,bal:r=>r.bal,reval:r=>r.reval,divPct:r=>r.divPct,totPct:r=>r.totPct,pesoCoste:r=>r.pesoCoste,pesoValor:r=>r.pesoValor,pesoBal:r=>r.pesoBal}):rows.sort((a,b)=>b.pesoDiv-a.pesoDiv);
  const pct=x=>(x*100).toFixed(1)+'%';
  const _sh=(k,l)=>`<th class="num" data-sorttbl="ranking" data-sortk="${k}" style="cursor:pointer" title="Ordenar">${l}${sortArrow('ranking',k)}</th>`; const head='<tr><th data-sorttbl="ranking" data-sortk="ticker" style="cursor:pointer" title="Ordenar">Ticker'+sortArrow('ranking','ticker')+'</th>'+_sh('sh','Títulos')+_sh('pm','P.Medio')+_sh('yoc','YoC')+_sh('divAcc','Div/acc')+_sh('divAno','Div/año')+_sh('pesoDiv','Peso div')+_sh('cost','Coste')+_sh('cobr','Dividendos')+_sh('cot','Cotización')+_sh('valor','Valor')+_sh('bal','Balance')+_sh('reval','Reval.')+_sh('divPct','Div%')+_sh('totPct','Total%')+_sh('pesoCoste','%Coste')+_sh('pesoValor','%Valor')+_sh('pesoBal','%Balance')+'</tr>';
  const body=rows.map(r=>`<tr><td><button class="btn ghost sm" data-ficha="${r.ticker}"><b>${r.ticker}</b></button></td><td class="num">${r.sh}</td><td class="num">${fmt(r.pm)}</td><td class="num">${pct(r.yoc)}</td><td class="num">${fmt(r.divAcc)}</td><td class="num pos">${fmt(r.divAno)}</td><td class="num">${pct(r.pesoDiv)}</td><td class="num">${fmt(r.cost)}</td><td class="num pos">${fmt(r.cobr)}</td><td class="num">${fmt(r.cot)}</td><td class="num">${fmt(r.valor)}</td><td class="num ${r.bal>=0?'pos':'neg'}">${r.bal>=0?'+':''}${fmt(r.bal)}</td><td class="num ${r.reval>=0?'pos':'neg'}">${pct(r.reval)}</td><td class="num pos">${pct(r.divPct)}</td><td class="num ${r.totPct>=0?'pos':'neg'}">${pct(r.totPct)}</td><td class="num">${pct(r.pesoCoste)}</td><td class="num">${pct(r.pesoValor)}</td><td class="num ${r.bal>=0?'pos':'neg'}">${pct(r.pesoBal)}</td></tr>`).join('');
  const foot=`<tr style="font-weight:700;background:#eef2f7"><td>TOTAL</td><td></td><td></td><td class="num">${pct(T.cost?T.divAno/T.cost:0)}</td><td></td><td class="num pos">${fmt(T.divAno)}</td><td class="num">100%</td><td class="num">${fmt(T.cost)}</td><td class="num pos">${fmt(T.cobr)}</td><td></td><td class="num">${fmt(T.valor)}</td><td class="num ${T.bal>=0?'pos':'neg'}">${T.bal>=0?'+':''}${fmt(T.bal)}</td><td class="num">${pct(T.cost?T.valor/T.cost-1:0)}</td><td class="num">${pct(T.cost?T.cobr/T.cost:0)}</td><td class="num">${pct(T.cost?T.bal/T.cost:0)}</td><td class="num">100%</td><td class="num">100%</td><td class="num">100%</td></tr>`;
  el.innerHTML=`<table><thead>${head}</thead><tbody>${body}${foot}</tbody></table>`;
  const _pal=['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#ca8a04','#0d9488','#9333ea','#e11d48','#475569','#84cc16','#f59e0b'];
  const _pi=rows.filter(r=>r.pesoDiv>0).map((r,i)=>({label:r.ticker,val:r.pesoDiv,color:_pal[i%_pal.length]}));
  const _rp=$('#rankPie'); if(_rp) _rp.innerHTML=_pi.length?(pieSVG(_pi)+'<div style="font-size:12px;display:grid;grid-template-columns:repeat(2,auto);gap:3px 16px">'+_pi.map(it=>`<div><span style="display:inline-block;width:10px;height:10px;background:${it.color};border-radius:2px;margin-right:6px"></span>${it.label} <b>${(it.val*100).toFixed(1)}%</b></div>`).join('')+'</div>'):'';
  $('#rankKpis').innerHTML=[['Dividendo bruto/año',fmt(T.divAno)],['YoC cartera',pct(T.cost?T.divAno/T.cost:0)],['RPD actual',pct(T.valor?T.divAno/T.valor:0)],['Dividendos cobrados (total)',fmt(T.cobr)]].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  const _ra=$('#rankAport'); if(_ra)_ra.innerHTML='<h3 style="margin:14px 0 6px;font-size:14px">Aportado acumulado vs valor de cartera</h3>'+((typeof aportValorHTML==='function')?aportValorHTML(renderRanking):'');
  const _v=$('#view-ranking'); if(_v&&_v.classList.contains('active')) setTimeout(()=>autoFitTable('rankTabla',7,10),0);
}
function buildFrozen(wrapId,lHead,lBody,rHead,rBody){
  const wrap=$('#'+wrapId); if(!wrap)return;
  wrap.innerHTML=`<div style="display:flex;align-items:flex-start"><table class="frzL">${lHead?('<thead>'+lHead+'</thead>'):''}<tbody>${lBody.join('')}</tbody></table><div style="overflow:auto;flex:1"><table class="frzR">${rHead?('<thead>'+rHead+'</thead>'):''}<tbody>${rBody.join('')}</tbody></table></div></div>`;
  const L=wrap.querySelector('.frzL'), R=wrap.querySelector('.frzR');
  const doSync=()=>{ if(!wrap.offsetParent)return; const lr=L.rows, rr=R.rows, n=Math.min(lr.length,rr.length); for(let i=0;i<n;i++){lr[i].style.height='';rr[i].style.height='';} for(let i=0;i<n;i++){ const h=Math.max(lr[i].getBoundingClientRect().height, rr[i].getBoundingClientRect().height); lr[i].style.height=h+'px'; rr[i].style.height=h+'px'; } };
  requestAnimationFrame(doSync); setTimeout(doSync,80);
}
function maxDataYear(){ let m=0; Object.values(DB.planCompras||{}).forEach(o=>Object.keys(o).forEach(y=>{if(+y>m)m=+y;})); Object.values(DB.divPorAccion||{}).forEach(o=>Object.keys(o).forEach(y=>{if(+y>m)m=+y;})); return m; }
function renderPrevision(){
  const el=$('#prevTabla'); if(!el)return;
  const dpa=DB.divPorAccion=DB.divPorAccion||{};
  const set=new Set(Object.keys(dpa).map(t=>t.toUpperCase()));
  (DB.calendario||[]).forEach(c=>{ if(c.ticker)set.add((c.ticker||'').toUpperCase()); });
  (DB.analisis||[]).forEach(a=>{ if(a.ticker)set.add((a.ticker||'').toUpperCase()); });
  (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase()); });
  let tickers=[...set].filter(Boolean);
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin empresas. Importa «divporaccion-historico.json» o pulsa «+ Empresa».</div>'; return; }
  const nm=t=>((DB.valores||{})[t]||{}).nombre||t;
  const _held=new Set(); (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)_held.add((p.ticker||'').toUpperCase()); });
  const _closed=new Set((DB.cerradas||[]).map(c=>(c.ticker||'').toUpperCase())); try{ invClosedComputed().forEach(c=>_closed.add(c.ticker)); }catch(e){}
  const _grp=t=> _held.has(t)?0:(_closed.has(t)?1:2);
  const _tot=t=>Object.values(dpa[t]||{}).reduce((s,v)=>s+num(v),0);
  tickers.sort((x,y)=> _grp(x)-_grp(y) || _tot(y)-_tot(x) || x.localeCompare(y));
  const nowY=new Date().getFullYear(); const conf=DB.aniosConfirmados||{}; const y0=2011, y1=Math.max(num(DB.previsionMaxYear)||2030,nowY+1,maxDataYear()); const years=[]; for(let y=y0;y<=y1;y++)years.push(y);
  const head='<tr><th>Año</th>'+tickers.map(t=>`<th class="num" title="${nm(t)}">${t}</th>`).join('')+'</tr>';
  const body=[...years].reverse().map(y=>{ const fut=y>nowY; const pv=fut&&!conf[y];
    const cells=tickers.map(t=>{ const raw=(dpa[t]&&dpa[t][y]!=null)?num(dpa[t][y]):null; const v=(raw==null?'':raw.toFixed(3)); const star=raw===0?'<span style="color:#dc2626;font-weight:700">*</span>':''; const cc=(DB.divConfirmado[t]&&DB.divConfirmado[t][y])||conf[y]; const cpv=fut&&!cc; return `<td style="${cpv?'background:#fffbeb;':''}"><div data-divconf="${t}|${y}" title="Clic: marcar dividendo real confirmado" style="font-size:8px;line-height:1.1;cursor:pointer;color:${(fut&&cc&&!conf[y])?'#16a34a':'var(--muted)'};font-weight:${(fut&&cc&&!conf[y])?'700':'400'}">${t} '${String(y).slice(2)}${(fut&&cc&&!conf[y])?' ✓':''}</div><input type="number" step="0.001" class="anaInp" style="width:52px;text-align:center" data-dpa="${t}" data-y="${y}" value="${v}">${star}</td>`; }).join('');
    return `<tr><td ${fut?`data-yhead="${y}" style="cursor:pointer;${pv?'background:#fffbeb;':''}" title="Clic: confirmar/desconfirmar TODO el año"`:''}>${y}${fut?(conf[y]?' <span style="color:#16a34a;font-size:9px">✓</span>':' <span class="muted" style="font-size:9px">prev</span>'):''}</td>${cells}</tr>`;
  }).join('');
  el.innerHTML=`<table>${head}${body}</table>`;
  const _v=$('#view-prevision'); if(_v&&_v.classList.contains('active')) setTimeout(()=>autoFitTable('prevTabla',7,11),0);
}

function addPrevEmpresa(){
  const tk=(prompt('Ticker de la empresa (p. ej. SAN):')||'').trim().toUpperCase(); if(!tk)return;
  const nombre=(prompt('Nombre de la empresa:')||tk).trim();
  DB.divPorAccion=DB.divPorAccion||{}; DB.divPorAccion[tk]=DB.divPorAccion[tk]||{};
  DB.valores=DB.valores||{}; DB.valores[tk]=DB.valores[tk]||{}; if(nombre)DB.valores[tk].nombre=nombre;
  saveNow(); renderPrevision();
  const st=$('#prevStatus'); if(st)st.textContent='Añadida '+tk;
}
function realSharesAt(t,year){ const ye=year+'-12-31'; let sh=0;
  (DB.operaciones||[]).forEach(o=>{ if((o.ticker||'').toUpperCase()===t&&(o.fecha||'')<=ye) sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); });
  (DB.cerradas||[]).forEach(c=>{ if((c.ticker||'').toUpperCase()===t&&c.ops) c.ops.forEach(o=>{ if((o.fecha||'')<=ye) sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); }); });
  return sh; }
function opRealEnAnio(t,year){ const y=String(year);
  if((DB.operaciones||[]).some(o=>(o.ticker||'').toUpperCase()===t&&(o.fecha||'').slice(0,4)===y))return true;
  return (DB.cerradas||[]).some(c=>(c.ticker||'').toUpperCase()===t&&(c.ops||[]).some(o=>(o.fecha||'').slice(0,4)===y));
}
function execBuyEur(t,year){ const y=String(year); let e=0; (DB.operaciones||[]).forEach(o=>{ if((o.ticker||'').toUpperCase()===t&&o.tipo!=='venta'&&(o.fecha||'').slice(0,4)===y) e+=num(o.acciones)*num(o.precio); }); return e; }
function planPendShares(t,year){ const pc=(DB.planCompras||{})[t]; if(!pc)return 0; const v=(DB.valores||{})[t]; const pr=v&&num(v.precioActual)>0?num(v.precioActual):0; if(!pr)return 0; let sh=0; Object.keys(pc).forEach(y=>{ if(+y<=year){ const pend=Math.max(0,num(pc[y])-execBuyEur(t,+y)); sh+=Math.floor(pend/pr); } }); return sh; }
function simIsReal(t){ return (DB.operaciones||[]).some(o=>(o.ticker||'').toUpperCase()===t)||(DB.cerradas||[]).some(c=>(c.ticker||'').toUpperCase()===t); }
function simEffShares(t,year,nowY){ const ss=(DB.simShares||{})[t]; const ov=(ss&&ss[year]!=null); const opAnio=(typeof opRealEnAnio==='function')&&opRealEnAnio(t,year); const pend=(typeof planPendShares==='function')?planPendShares(t,year):0;
  if(year<=nowY){
    if(opAnio) return realSharesAt(t,year)+pend;
    if(ov) return num(ss[year]);
    return (simIsReal(t)?realSharesAt(t,year):0)+pend;
  }
  if(ov) return num(ss[year]);
  return (simIsReal(t)?realSharesAt(t,nowY):0) + pend; }
function renderSimulador(){
  const el=$('#simTabla'); if(!el)return;
  const nowY=new Date().getFullYear(); const conf=DB.aniosConfirmados||{}; const y0=2011,y1=Math.max(num(DB.previsionMaxYear)||2030,nowY+1,maxDataYear()); const years=[]; for(let y=y0;y<=y1;y++)years.push(y);
  const dpa=DB.divPorAccion||{};
  const set=new Set();
  (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase()); });
  (DB.cerradas||[]).forEach(c=>set.add((c.ticker||'').toUpperCase())); try{ invClosedComputed().forEach(c=>set.add(c.ticker)); }catch(e){}
  Object.keys(DB.simShares||{}).forEach(t=>set.add(t.toUpperCase()));
  Object.keys(DB.planCompras||{}).forEach(t=>set.add(t.toUpperCase()));
  let tickers=[...set].filter(Boolean);
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin empresas. Ten posiciones en cartera o pulsa «+ Empresa».</div>'; $('#simKpis').innerHTML=''; return; }
  const held=new Set(); (typeof invPositions==='function'?invPositions():[]).forEach(p=>{if(p.acciones>0.0001)held.add((p.ticker||'').toUpperCase());});
  const closed=new Set((DB.cerradas||[]).map(c=>(c.ticker||'').toUpperCase())); try{invClosedComputed().forEach(c=>closed.add(c.ticker));}catch(e){}
  const grp=t=>held.has(t)?0:(closed.has(t)?1:2);
  tickers.sort((a,b)=>grp(a)-grp(b)||a.localeCompare(b));
  const tot={}; years.forEach(y=>tot[y]=0);
  tickers.forEach(t=>years.forEach(y=>{ tot[y]+=simEffShares(t,y,nowY)*num((dpa[t]||{})[y]||0); }));
  const head='<tr><th>Empresa</th>'+years.map(y=>{ const fut=y>nowY; return `<th class="num" ${fut?`data-yhead="${y}" style="cursor:pointer" title="Clic: confirmar/desconfirmar año"`:''}>${y}${fut?(conf[y]?' <span style="color:#16a34a;font-size:9px">✓</span>':' <span class="muted" style="font-size:9px">prev</span>'):''}</th>`; }).join('')+'</tr>';
  const body=tickers.map(t=>{ const real=simIsReal(t);
    const cells=years.map(y=>{ const past=y<=nowY; const divRaw=(dpa[t]&&dpa[t][y]!=null)?num(dpa[t][y]):null; const div=divRaw||0; const sh=simEffShares(t,y,nowY); const imp=sh*div; const ss=(DB.simShares||{})[t];
      const accCell=(y>nowY)?`<div class="num" style="font-weight:600">${sh||'·'}</div>`:`<input type="number" class="anaInp" style="width:50px;text-align:center${(past&&real&&!(ss&&ss[y]!=null))?';color:#64748b':''}" data-sim="${t}" data-y="${y}" value="${(ss&&ss[y]!=null)?ss[y]:(sh||'')}">`;
      const divStar=divRaw===0?'<span style="color:#dc2626;font-weight:700">*</span>':'';
      const divCell=`<div class="num" style="color:#475569">${divRaw==null?'·':divRaw.toFixed(3)}${divStar}</div>`;
      let impCell; if(divRaw===0&&sh>0) impCell='0,00 <span style="color:#dc2626;font-weight:700">*</span>'; else impCell=imp>0?fmt(imp):'·';
      const cc=(DB.divConfirmado[t]&&DB.divConfirmado[t][y])||conf[y]; const cpv=(y>nowY)&&!cc; return `<td style="${cpv?'background:#fffbeb;':''}"><div style="font-size:8px;color:var(--brand);font-weight:700;line-height:1.1">${t}</div>${accCell}<div data-divconf="${t}|${y}" title="Clic: marcar dividendo real confirmado" style="font-size:8px;margin-top:1px;line-height:1.1;cursor:pointer;color:${(y>nowY&&cc&&!conf[y])?'#16a34a':'var(--muted)'};font-weight:${(y>nowY&&cc&&!conf[y])?'700':'400'}">div '${String(y).slice(2)}${(y>nowY&&cc&&!conf[y])?' ✓':''}</div>${divCell}<div class="pos" style="font-weight:700;margin-top:1px">${impCell}</div></td>`;
    }).join('');
    return `<tr><td style="white-space:nowrap"><button class="btn ghost sm" data-ficha="${t}"><b>${t}</b></button></td>${cells}</tr>`;
  }).join('');
  const totRow='<tr style="font-weight:700;background:#eef2f7"><td>TOTAL €</td>'+years.map(y=>`<td class="num">${tot[y]?fmt(tot[y]):'·'}</td>`).join('')+'</tr>';
  const grRow='<tr class="grrow" style="font-weight:600;background:#f8fafc"><td>Δ % anual</td>'+years.map((y,i)=>{ if(i===0)return '<td class="num">·</td>'; const pr=tot[years[i-1]]; const g=pr?((tot[y]/pr)-1):null; return `<td class="num ${g!=null?(g>=0?'pos':'neg'):''}">${g==null?'·':(g>=0?'+':'')+(g*100).toFixed(0)+'%'}</td>`; }).join('')+'</tr>';
  el.innerHTML=`<table>${head}${body}${totRow}${grRow}</table>`;
  $('#simKpis').innerHTML=[['Dividendo '+nowY,fmt(tot[nowY]||0)],['Previsión '+y1,fmt(tot[y1]||0)],['Crecimiento '+nowY+'→'+y1,(tot[nowY]?(((tot[y1]/tot[nowY])-1)*100).toFixed(0)+'%':'—')]].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  const _v=$('#view-simulador'); if(_v&&_v.classList.contains('active')) setTimeout(()=>autoFitTable('simTabla',7,10),0);
}

function addSimEmpresa(){
  const tk=(prompt('Ticker de la empresa nueva:')||'').trim().toUpperCase(); if(!tk)return;
  const nombre=(prompt('Nombre:')||tk).trim();
  DB.simShares=DB.simShares||{}; DB.simShares[tk]=DB.simShares[tk]||{};
  DB.valores=DB.valores||{}; DB.valores[tk]=DB.valores[tk]||{}; if(nombre)DB.valores[tk].nombre=nombre;
  DB.divPorAccion=DB.divPorAccion||{}; DB.divPorAccion[tk]=DB.divPorAccion[tk]||{};
  saveNow(); renderSimulador(); const st=$('#simStatus'); if(st)st.textContent='Añadida '+tk;
}
function simYearTotal(year){ const dpa=DB.divPorAccion||{}; const nowY=new Date().getFullYear(); const set=new Set(); (typeof invPositions==='function'?invPositions():[]).forEach(p=>{if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase());}); (DB.cerradas||[]).forEach(c=>set.add((c.ticker||'').toUpperCase())); Object.keys(DB.simShares||{}).forEach(t=>set.add(t.toUpperCase())); Object.keys(DB.planCompras||{}).forEach(t=>set.add(t.toUpperCase())); let tot=0; set.forEach(t=>{ tot+=simEffShares(t,year,nowY)*num((dpa[t]||{})[year]||0); }); return tot; }
function renderPanelDash(){
  const el=$('#panelDash'); if(!el)return; const nowY=new Date().getFullYear(); let html='';
  const GITHUB_RUN_URL='https://github.com/chernanzfinanzas-gif/economia-domestica/actions/workflows/cotizaciones.yml';
  html+=`<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><a href="${GITHUB_RUN_URL}" target="_blank" rel="noopener" class="btn ghost sm" style="text-decoration:none" title="Abre GitHub para lanzar la actualización de cotizaciones">🔄 Actualizar cotizaciones</a></div>`;
  // 🔔 BANDEJA DE AVISOS UNIFICADA
  const _heldP={}, _heldSet=new Set();
  try{ (invPositions()||[]).forEach(p=>{ if(p.acciones>0.0001){ const _t=(p.ticker||'').toUpperCase(); _heldP[_t]=p; _heldSet.add(_t); } }); }catch(e){}
  const avisos=[];
  (DB.analisis||[]).forEach(a=>{ const c=num(a.cotizacion),st=num(a.stopTesis); if(c&&st&&c<=st){ const t=(a.ticker||'').toUpperCase(); const p=_heldP[t]; avisos.push({pri:0,cls:'r',goto:'analisis',txt:`🚨 <b>${t}</b> — stop de tesis tocado (${fmt(c)} ≤ ${fmt(st)})${p?` · tienes ${p.acciones} acc., <b>ORDEN DE SALIDA</b>`:' · en vigilancia'}`}); } });
  (DB.analisis||[]).forEach(a=>{ const c=num(a.cotizacion),eH=num(a.entMax),st=num(a.stopTesis); const dec=(a.decision||'').toUpperCase(); if(dec==='COMPRAR'&&c>0&&eH>0&&c<=eH&&!(st&&c<=st)){ const t=(a.ticker||'').toUpperCase(); avisos.push({pri:1,cls:'a',goto:'analisis',txt:`🟢 <b>${t}</b> — en zona de compra (${fmt(c)} ≤ entrada ${fmt(eH)})${_heldP[t]?' · ya en cartera':''}`}); } });
  (DB.analisis||[]).forEach(a=>{ const t=(a.ticker||'').toUpperCase(); const mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null; if(mm!=null&&mm>12) avisos.push({pri:2,cls:'a',goto:'monitor',txt:`📅 <b>${t}</b> — dossier de hace ${mm} meses, reanalizar`}); });
  ((typeof renovList==='function')?renovList(30):[]).forEach(r=>{ const f=r.fecha; const fs=String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0'); avisos.push({pri:r.dias<=7?1:3,cls:r.dias<=7?'r':'a',goto:'presupuesto',txt:`🔁 ${fs} ${r.nombre} <span class="muted">${fmt(r.importe)}</span> — ${r.dias<0?'vencida':('en '+r.dias+' d')}`}); });
  _heldSet.forEach(t=>{ const m=(DB.monitor||{})[t]||{}; if(!m.informe)return; ['Q1','Q2','Q3','Q4'].forEach(qc=>{ const key=nowY+'-'+qc; const done=!!(m.rev&&m.rev[key]); if((typeof qPassed==='function'&&qPassed(t,qc,nowY))&&!done) avisos.push({pri:2,cls:'a',goto:'monitor',txt:`📊 <b>${t}</b> — ${qc} ${nowY} publicado sin revisar`}); }); });
  try{ const _totC=Object.values(_heldP).reduce((q,p)=>q+p.acciones*num(p.precioActual),0); if(_totC>0){ const _bs={}; Object.values(_heldP).forEach(p=>{ const _sc=(typeof SECTOR!=='undefined'&&SECTOR[(p.ticker||'').toUpperCase()])||'Sin sector'; _bs[_sc]=(_bs[_sc]||0)+p.acciones*num(p.precioActual); }); Object.keys(_bs).forEach(sc=>{ const pct=_bs[sc]/_totC; if(pct>=0.35) avisos.push({pri:pct>=0.5?1:3,cls:pct>=0.5?'r':'a',goto:'graficas',txt:`📦 Sector <b>${sc}</b> = ${(pct*100).toFixed(0)}% de la cartera — sobreconcentración`}); }); } }catch(e){}
  try{ const _ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); const _x=new Date(); do{ _x.setDate(_x.getDate()-1); }while(_x.getDay()===0||_x.getDay()===6); const _prev=_ymd(_x); const _uf=window._cotizUltFecha||''; if(_uf&&_uf<_prev){ avisos.push({pri:1,cls:'a',goto:'panel',txt:`💹 <b>Cotizaciones desactualizadas</b> (última: ${(typeof ddmmyyyy==='function'?ddmmyyyy(_uf):_uf)}). Ejecuta el acceso directo «Actualizar cotizaciones» del escritorio, o <a href="${GITHUB_RUN_URL}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#9a3412;text-decoration:underline;font-weight:700">lánzalo en GitHub</a>.`}); } }catch(e){}
  if(avisos.length){ avisos.sort((a,b)=>a.pri-b.pri); const hayCrit=avisos.some(x=>x.cls==='r');
    const _itav=avisos.map(x=>`<div data-goto="${x.goto}" style="font-size:12.5px;margin:3px 0;padding:6px 8px;background:#fff;border-left:3px solid ${x.cls==='r'?'#dc2626':'#d97706'};border-radius:4px;cursor:pointer">${x.txt}</div>`).join('');
    html+=`<div class="${hayCrit?'stopalert':''}" style="margin-top:4px;padding:12px 14px;background:${hayCrit?'#fee2e2':'#fff7ed'};border:1px solid ${hayCrit?'#fecaca':'#fed7aa'};border-radius:10px"><div style="font-weight:800;color:${hayCrit?'#991b1b':'#9a3412'};font-size:15px;margin-bottom:6px">🔔 Avisos (${avisos.length})</div>${_itav}</div>`;
  }
  const card=c=>`<div class="card"><div class="lbl">${c[0]}</div><div class="val ${c[2]||''}">${c[1]}</div>${c[3]?`<div class="sub">${c[3]}</div>`:''}</div>`;
  const block=(title,view,cards)=>`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="${view}">${title} <span class="muted" style="font-size:12px">›</span></h3><div class="cards">${cards.map(card).join('')}</div></div>`;
  // Patrimonio
  const snaps=(typeof patSnaps==='function')?patSnaps():[]; const last=snaps[snaps.length-1]; let ef=0,inv=0; if(last)(last.lineas||[]).forEach(l=>{ef+=num(l.ef);inv+=num(l.inv);});
  const patTot=ef+inv, pInv=patTot?inv/patTot:0;
  if(patTot) html+=block('Patrimonio','patrimonio',[['Total',fmt(patTot)],['Efectivo',fmt(ef),'',Math.round((1-pInv)*100)+'%'],['Invertido',fmt(inv),'',Math.round(pInv*100)+'%'],['Objetivo 50/50',(pInv*100).toFixed(0)+'% inv',pInv>=0.5?'pos':'neg','meta 50%']]);
  // Cartera
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  if(pos.length){ const cV=pos.reduce((s,p)=>s+p.acciones*p.precioActual,0), cC=pos.reduce((s,p)=>s+p.acciones*p.precioCompra,0), cD=pos.reduce((s,p)=>s+p.acciones*p.divAccion,0), cPL=cV-cC;
    html+=block('Cartera','inversiones',[['Valor',fmt(cV),'','coste '+fmt(cC)],['Plusvalía',(cPL>=0?'+':'')+fmt(cPL),cPL>=0?'pos':'neg',(cC?(cPL/cC*100).toFixed(1):0)+'%'],['Dividendo bruto/año',fmt(cD),'',(cV?(cD/cV*100).toFixed(1):0)+'% RPD'],['YoC',(cC?(cD/cC*100).toFixed(1):0)+'%','pos']]); }
  // Dividendos
  if(typeof simYearTotal==='function'){ const y1=nowY+1, y2=nowY+2; const dN=simYearTotal(nowY), d1=simYearTotal(y1), d2=simYearTotal(y2), cr=dN?((d1/dN)-1):0;
    html+=block('Dividendos','dividendos',[['Cobrado '+nowY,fmt(dN)],['Previsión '+y1,fmt(d1)],['Previsión '+y2,fmt(d2)],['Crecimiento '+nowY+'→'+y1,(cr>=0?'+':'')+(cr*100).toFixed(0)+'%',cr>=0?'pos':'neg']]); }
  // Oportunidades
  const ana=(DB.analisis||[]).map(a=>{const cot=num(a.cotizacion),ent=num(a.precioEntrada),obj=num(a.precioObjetivo);return {t:a.ticker,pot:(cot&&obj)?(obj-cot)/cot:null,barata:!!(cot&&ent&&cot<=ent*1.05)};});
  const baratas=ana.filter(a=>a.barata).length, top=ana.filter(a=>a.pot!=null).sort((a,b)=>b.pot-a.pot).slice(0,3);
  if(ana.length) html+=block('Oportunidades','analisis',[['Empresas baratas',String(baratas),baratas?'pos':''],['Top potencial',top.length?top.map(x=>x.t+' '+(x.pot>=0?'+':'')+(x.pot*100).toFixed(0)+'%').join(' · '):'—']]);
  // Amalia
  if(typeof amaliaSaldo==='function'){ const am=amaliaSaldo(); html+=block('Reembolsables (Amalia)','amalia',[['Pendiente de cobro',fmt(am),am>0.005?'neg':'pos']]); }
  // Tareas pendientes (antes de eventos)
  const _pend=(DB.todos||[]).filter(x=>!x.hecho).sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999'));
  if(_pend.length){ const _hoy=new Date().toISOString().slice(0,10); const _it=_pend.slice(0,8).map(x=>{ const v=x.fecha&&x.fecha<_hoy; return `<div style="font-size:12px;margin:1px 0"><span style="color:${v?'#dc2626':'#64748b'}">${x.fecha?ddmmyyyy(x.fecha):'—'}</span> ${x.desc||''}${x.ticker?' <b>'+x.ticker+'</b>':''}</div>`; }).join(''); html+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="monitor">Tareas pendientes <span class="muted" style="font-size:12px">›</span></h3>${_it}</div>`; }
  // Próximos eventos
  const ev=DB.eventos||{}; const held=new Set(pos.map(p=>(p.ticker||'').toUpperCase()));
  let all=[]; Object.keys(ev).forEach(t=>(ev[t]||[]).forEach(e=>all.push({t,m:e.m,w:e.w,code:e.code})));
  if(all.length){ const now=new Date(); const nm=now.getMonth()+1, nw=Math.min(4,Math.max(1,Math.ceil(now.getDate()/7)));
    let up=all.filter(e=>e.m>nm||(e.m===nm&&e.w>=nw)).sort((a,b)=>a.m-b.m||a.w-b.w); if(!up.length)up=all.sort((a,b)=>a.m-b.m||a.w-b.w);
    const _isD=e=>((e.code||'')[0]||'').toUpperCase()==='D';
    const g1=up.filter(e=>held.has(e.t)&&_isD(e)).slice(0,12), g2=up.filter(e=>held.has(e.t)&&!_isD(e)).slice(0,12), g3=up.filter(e=>!held.has(e.t)&&_isD(e)).slice(0,12), g4=up.filter(e=>!held.has(e.t)&&!_isD(e)).slice(0,12);
    const _row=(e,fs,bold)=>`<div style="font-size:${fs}px;margin:1px 0">${MESES_ES[e.m-1]} s${e.w} · <span class="evchip ev-${(typeof evTipo==='function'?evTipo(e.code):'otro')}">${e.code}</span> <span data-ficha="${e.t}" style="cursor:pointer;color:var(--brand)${bold?';font-weight:700':''}">${e.t}</span></div>`;
    const _col=(title,arr,fs,bold,bl)=>`<div style="${bl?'border-left:1px solid var(--line);padding-left:10px;':''}"><div class="muted" style="font-size:10px;font-weight:700;margin:0 0 3px;text-transform:uppercase;letter-spacing:.03em">${title}</div>${arr.length?arr.map(e=>_row(e,fs,bold)).join(''):'<div class="muted" style="font-size:10px">—</div>'}</div>`;
    const ag=`<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">${_col('Dividendos · cartera',g1,13,true,false)}${_col('Result. y otros · cartera',g2,12,true,false)}${_col('Dividendos · otras',g3,11,false,true)}${_col('Result. y otros · otras',g4,11,false,false)}</div>`;
    html+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="calendario">Próximos eventos <span class="muted" style="font-size:12px">›</span></h3>${ag}</div>`; }
  // Mini-gráfico dividendos por año
  if(typeof simYearTotal==='function'){ const ys=[]; for(let y=2011;y<=nowY;y++)ys.push(y); const vals=ys.map(simYearTotal); const mx=Math.max(...vals,1); const bw=Math.max(8,Math.floor(360/ys.length)); let bars=''; ys.forEach((y,i)=>{ const h=Math.round(vals[i]/mx*70); bars+=`<rect x="${i*bw}" y="${78-h}" width="${bw-2}" height="${h}" fill="var(--brand)"></rect>`; });
    if(mx>1) html+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="dividendos">Dividendos por año <span class="muted" style="font-size:12px">›</span></h3><svg width="${ys.length*bw}" height="92" viewBox="0 0 ${ys.length*bw} 92">${bars}<text x="0" y="90" font-size="8" fill="#64748b">${ys[0]}</text><text x="${ys.length*bw-22}" y="90" font-size="8" fill="#64748b">${nowY}</text></svg></div>`; }
  el.innerHTML=html;
}
function planSharesAt(t,year){ const pc=(DB.planCompras||{})[t]; if(!pc)return 0; const v=(DB.valores||{})[t]; const pr=v&&num(v.precioActual)>0?num(v.precioActual):0; if(!pr)return 0; let sh=0; Object.keys(pc).forEach(y=>{ if(+y<=year) sh+=Math.floor(num(pc[y])/pr); }); return sh; }
function renderPlan(){
  const el=$('#planTabla'); if(!el)return;
  const pc=DB.planCompras=DB.planCompras||{}; const pr=DB.planPresupuesto=DB.planPresupuesto||{};
  const nowY=new Date().getFullYear(); const y1=Math.max(num(DB.previsionMaxYear)||2030, nowY+1, maxDataYear()); const years=[]; for(let y=nowY;y<=y1;y++)years.push(y);
  const set=new Set(Object.keys(pc).map(t=>t.toUpperCase()));
  (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase()); });
  let tickers=[...set].filter(Boolean);
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin plan. Importa «plan-compras.json» o pulsa «+ Empresa».</div>'; $('#planKpis').innerHTML=''; return; }
  const tt=t=>Object.values(pc[t]||{}).reduce((s,v)=>s+num(v),0);
  tickers.sort((a,b)=>tt(b)-tt(a)||a.localeCompare(b));
  const totYear={}; years.forEach(y=>totYear[y]=0);
  const body=tickers.map(t=>{ let rt=0; const cells=years.map(y=>{ const v=(pc[t]&&pc[t][y]!=null)?num(pc[t][y]):0; rt+=v; totYear[y]+=v; const exeE=(v>0&&typeof execBuyEur==='function')?execBuyEur(t,+y):0; const comp=(v>0&&exeE>=v-0.005); const parc=(v>0&&exeE>0&&exeE<v-0.005); const bg=comp?'#dcfce7':(parc?'#fff7ed':''); const mark=comp?' ✓':(parc?' ◐':''); return `<td class="num"${bg?` style="background:${bg}" title="ejecutado ${fmt(exeE)} de ${fmt(v)}"`:''}>${v?fmt(v):'·'}${mark}</td>`; }).join('');
    return `<tr><td><button class="btn ghost sm" data-ficha="${t}"><b>${t}</b></button></td>${cells}<td class="num" style="font-weight:700">${rt?fmt(rt):'·'}</td></tr>`; }).join('');
  const head='<tr><th>Empresa</th>'+years.map(y=>`<th class="num">${y}</th>`).join('')+'<th class="num">Total</th></tr>';
  const grand=Object.values(totYear).reduce((s,v)=>s+v,0);
  const totRow='<tr style="font-weight:700;background:#eef2f7"><td>Total/año</td>'+years.map(y=>`<td class="num">${totYear[y]?fmt(totYear[y]):'·'}</td>`).join('')+`<td class="num">${fmt(grand)}</td></tr>`;
  const presRow='<tr style="background:#fffbeb"><td>Presupuesto/año</td>'+years.map(y=>`<td class="num">${(pr[y]!=null)?fmt(pr[y]):'·'}</td>`).join('')+'<td></td></tr>';
  const exeRow='<tr style="font-weight:600"><td>Por ejecutar</td>'+years.map(y=>{ const dif=num(pr[y]||0)-totYear[y]; return `<td class="num ${dif<0?'neg':(dif>0?'pos':'')}">${(pr[y]!=null)?fmt(dif):'·'}</td>`; }).join('')+'<td></td></tr>';
  const ejec=[]; tickers.forEach(t=>Object.keys(pc[t]||{}).forEach(y=>{ const plan=num(pc[t][y]); if(plan<=0)return; const exe=(typeof execBuyEur==='function')?execBuyEur(t,+y):0; if(exe<=0)return; const falta=Math.max(0,plan-exe); const comp=exe>=plan-0.005; ejec.push({t,y,plan,exe,falta,comp}); }));
  const _pendTot=ejec.reduce((s,e)=>s+e.falta,0);
  const aviso = ejec.length ? `<div class="card" style="margin-top:12px;background:#fff7ed;border:1px solid #fed7aa"><div style="font-weight:700;color:#b45309;margin-bottom:6px">Ejecución del plan (${ejec.length})${_pendTot>0.005?` · faltan ${fmt(_pendTot)}`:''}</div><div class="sub" style="margin-bottom:8px">Compras del plan que ya has empezado. Las <b>parciales</b> siguen contando en el Simulador (real + lo que falta). Cuando una esté <b>completa</b>, quítala del Plan.</div>${ejec.map(e=>`<div style="font-size:13px;margin:4px 0;display:flex;align-items:center;gap:10px"><span>${e.comp?'✅':'🟠'} <b>${e.t}</b> · ${e.y} — ejecutado ${fmt(e.exe)} de ${fmt(e.plan)}${e.comp?' <b style=\"color:#16a34a\">(completa)</b>':` · <b style=\"color:#b45309\">faltan ${fmt(e.falta)}</b>`}</span>${e.comp?`<button class="btn danger sm" data-planexe="${e.t}|${e.y}">Quitar del Plan</button>`:''}</div>`).join('')}</div>` : '';
  el.innerHTML=`<table><thead>${head}</thead><tbody>${body}${totRow}${presRow}${exeRow}</tbody></table>`+aviso;
  $('#planKpis').innerHTML=[['Plan total',fmt(grand)],['Plan '+nowY,fmt(totYear[nowY]||0)],['Presupuesto '+nowY,fmt(num(pr[nowY]||0))]].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  const _v=$('#view-plan'); if(_v&&_v.classList.contains('active')) setTimeout(()=>autoFitTable('planTabla',7,11),0);
}
function addPlanEmpresa(){ const tk=(prompt('Ticker de la empresa:')||'').trim().toUpperCase(); if(!tk)return; const nombre=(prompt('Nombre:')||tk).trim(); DB.planCompras=DB.planCompras||{}; DB.planCompras[tk]=DB.planCompras[tk]||{}; DB.valores=DB.valores||{}; DB.valores[tk]=DB.valores[tk]||{}; if(nombre)DB.valores[tk].nombre=nombre; saveNow(); renderPlan(); }
function renderPlanLote(){
  const el=$('#loteTabla'); if(!el)return;
  DB.planLote=DB.planLote||[]; DB.planCompras=DB.planCompras||{}; const pe=DB.planLotePeriodo=DB.planLotePeriodo||{desde:2026,hasta:2034};
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  const invByT={}; pos.forEach(p=>{const t=(p.ticker||'').toUpperCase(); invByT[t]=(invByT[t]||0)+p.acciones*p.precioCompra;});
  const held=Object.keys(invByT);
  const totalInv=Object.values(invByT).reduce((s,v)=>s+v,0);
  const nm=t=>((DB.valores||{})[t]||{}).nombre || (((DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===t)||{}).nombre) || t;
  DB.planLote=DB.planLote.map(t=>(t||'').toUpperCase()).filter((t,i,arr)=>t&&arr.indexOf(t)===i&&!held.includes(t));
  const chosen=DB.planLote; const total=held.length+chosen.length; const pt=DB.planTipo=DB.planTipo||{};
  const tipoSel=t=>`<select class="anaInp" data-lotetipo="${t}"><option value="">— sin clasificar —</option><option value="joya"${pt[t]==='joya'?' selected':''}>Joya 👑</option><option value="mantener"${pt[t]==='mantener'?' selected':''}>Mantener</option><option value="nucleo"${pt[t]==='nucleo'?' selected':''}>Núcleo</option></select>`;
  const anaAll=[...new Set((DB.analisis||[]).map(a=>(a.ticker||'').toUpperCase()).filter(Boolean))];
  const ana=anaAll.filter(t=>!held.includes(t)).sort((a,b)=>nm(a).localeCompare(nm(b)));
  const dl='<datalist id="loteDL">'+ana.filter(t=>!chosen.includes(t)).map(t=>`<option value="${nm(t)} (${t})">`).join('')+'</datalist>';
  const ydesde=num(pe.desde), yhasta=num(pe.hasta); const yrs=[]; for(let y=ydesde;y<=yhasta;y++)yrs.push(y);
  const nowY=new Date().getFullYear();
  const dispYear={}; let disponible=0;
  try{ if(typeof proyDefaults==='function')proyDefaults(); const ser=(typeof computeProy==='function')?computeProy(DB.config.proyeccion):[]; ser.forEach(r=>{ if(r.anio>=ydesde&&r.anio<=yhasta){ dispYear[r.anio]=num(r.aInversion); disponible+=num(r.aInversion); } }); }catch(e){}
  const execYear={}; (DB.operaciones||[]).forEach(o=>{ if(o.tipo!=='venta'){ const y=+((o.fecha||'').slice(0,4)); if(y) execYear[y]=(execYear[y]||0)+num(o.acciones)*num(o.precio); } });
  const dispNeto=y=> (dispYear[y]||0) - (y<=nowY?(execYear[y]||0):0);
  const dispFijo=DB.planDispFijo=DB.planDispFijo||{};
  const dispShown=y=> (dispFijo[y]!=null&&dispFijo[y]!=='')?num(dispFijo[y]):dispNeto(y);
  const allTk=[...held,...chosen]; const TF=totalInv+disponible; const JOYA=0.08;
  const tipoOf=t=>pt[t]||'';
  const nJoya=allTk.filter(t=>tipoOf(t)==='joya').length; const nNuc=allTk.filter(t=>tipoOf(t)==='nucleo').length;
  const sumFijos=allTk.filter(t=>tipoOf(t)!=='joya'&&tipoOf(t)!=='nucleo').reduce((s,t)=>s+(invByT[t]||0),0);
  const restante=TF>0?(1-JOYA*nJoya-sumFijos/TF):0; const nucPct=nNuc>0?restante/nNuc:0;
  const objPct=t=>{ const tp=tipoOf(t); if(tp==='joya')return JOYA; if(tp==='nucleo')return nucPct; return TF?(invByT[t]||0)/TF:0; };
  const objEur=t=>{ const tp=tipoOf(t); if(tp==='joya')return JOYA*TF; if(tp==='nucleo')return nucPct*TF; return invByT[t]||0; };
  _objCache={}; allTk.forEach(t=>{ _objCache[t]={real:invByT[t]||0,obj:objEur(t)}; });
  const asignar=t=>objEur(t)-(invByT[t]||0);
  const totAsignarPos=allTk.reduce((s,t)=>s+Math.max(0,asignar(t)),0);
  const aYear=(t,y)=>num(((DB.planCompras||{})[t]||{})[y]||0);
  const sumAsig=t=>yrs.reduce((s,y)=>s+aYear(t,y),0);
  const asignYear={}; yrs.forEach(y=>{ asignYear[y]=allTk.reduce((s,t)=>s+aYear(t,y),0); });
  const cab=`<div class="cards" style="margin-bottom:12px">
     <div class="card"><div class="lbl">Invertido total</div><div class="val">${fmt(totalInv)}</div><div class="sub">${held.length} en cartera</div></div>
     <div class="card"><div class="lbl">Disponible en periodo</div><div class="val">${fmt(disponible)}</div><div class="sub">${ydesde}–${yhasta}</div></div>
     <div class="card"><div class="lbl">Capital final total</div><div class="val">${fmt(TF)}</div><div class="sub">invertido + disponible</div></div>
     <div class="card"><div class="lbl">Capital a asignar</div><div class="val pos">${fmt(totAsignarPos)}</div><div class="sub">${nNuc?('núcleo: '+(nucPct*100).toFixed(1)+'% c/u'):'marca alguna como Núcleo'}</div></div>
   </div>
   <div class="toolbar" style="margin-bottom:8px"><span class="muted">Periodo:</span> <input type="number" step="1" data-loteyr="desde" value="${ydesde}" style="width:75px;padding:4px;border:1px solid var(--line);border-radius:6px"> <span class="muted">a</span> <input type="number" step="1" data-loteyr="hasta" value="${yhasta}" style="width:75px;padding:4px;border:1px solid var(--line);border-radius:6px"> <span class="muted" style="margin-left:10px"><b>${total}/20</b> · ${nJoya} joyas</span></div>`;
  const optInput=(attr,val)=>`<input list="loteDL" class="anaInp" ${attr} value="${val}" placeholder="Escribe o elige…" style="min-width:170px">`;
  const objCells=t=>{ const fa=asignar(t)-sumAsig(t); const faC=Math.abs(fa)<0.5?'<span class="pos" style="font-weight:700">✓</span>':(fa>0?('<span style="color:#b45309;font-weight:700">'+fmt(fa)+'</span>'):('<span class="neg" style="font-weight:700">'+fmt(fa)+'</span>')); return `<td class="num">${(objPct(t)*100).toFixed(1)}%</td><td class="num">${fmt(objEur(t))}</td><td class="num ${asignar(t)>0.5?'pos':(asignar(t)<-0.5?'neg':'')}">${Math.abs(asignar(t))<0.5?'·':((asignar(t)>0?'+':'−')+fmt(Math.abs(asignar(t))))}</td><td class="num">${faC}</td>`; };
  const yrCells=t=>yrs.map(y=>`<td><div style="font-size:8px;color:var(--muted);line-height:1.1">${t} '${String(y).slice(2)}</div><input type="number" step="100" class="anaInp" style="width:54px;text-align:center" data-asig="${t}|${y}" value="${aYear(t,y)||''}"></td>`).join('');
  const yrHead=yrs.map(y=>{ const ds=dispShown(y); const pend=ds-asignYear[y]; return `<th class="num">${y}<input type="number" data-lotedisp="${y}" value="${Math.round(ds)}" title="Disponible del año (editable)" style="width:58px;font-size:9px;text-align:center;border:1px solid var(--line);border-radius:4px;display:block;margin:2px auto 1px"><div style="font-size:9px;font-weight:600;color:${pend<-0.5?'#dc2626':(pend>0.5?'#16a34a':'#64748b')}" title="Pendiente por asignar">${fmt(pend)}</div></th>`; }).join('');
  let rows=''; let n=0;
  held.slice().sort((a,b)=>invByT[b]-invByT[a]).forEach(t=>{ n++; rows+=`<tr><td class="num">${n}</td><td><button class="btn ghost sm" data-ficha="${t}"><b>${t}</b></button></td><td><span class="pill g">Cartera</span></td><td>${tipoSel(t)}</td><td class="num">${fmt(invByT[t])}</td><td class="num">${totalInv?(invByT[t]/totalInv*100).toFixed(1):0}%</td>${objCells(t)}${yrCells(t)}<td></td></tr>`; });
  chosen.forEach((t,i)=>{ n++; rows+=`<tr><td class="num">${n}</td><td>${optInput('data-lotechg="'+i+'"', nm(t)+' ('+t+')')}</td><td><span class="pill" style="background:#dbeafe;color:#1e40af">Nueva</span></td><td>${tipoSel(t)}</td><td class="num">·</td><td class="num">·</td>${objCells(t)}${yrCells(t)}<td class="right"><button class="btn danger sm" data-lotedel="${i}">✕</button></td></tr>`; });
  for(let k=total;k<20;k++){ n++; rows+=`<tr><td class="num">${n}</td><td>${optInput('data-loteadd','')}</td><td class="muted">slot</td><td></td><td class="num">·</td><td class="num">·</td><td class="num">·</td><td class="num">·</td><td class="num">·</td><td class="num">·</td>${yrs.map(()=>'<td class="num">·</td>').join('')}<td></td></tr>`; }
  const pendRow='<tr style="font-weight:700;background:#eef2f7"><td></td><td>Pendiente asignar</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'+yrs.map(y=>{ const pend=dispShown(y)-asignYear[y]; return `<td class="num ${pend<-0.5?'neg':(pend>0.5?'pos':'')}">${fmt(pend)}</td>`; }).join('')+'<td></td></tr>';
  el.innerHTML=cab+dl+`<div style="overflow:auto"><table style="font-size:12px"><thead><tr><th class="num">#</th><th>Empresa</th><th>Estado</th><th>Tipo</th><th class="num">Invertido</th><th class="num">% act</th><th class="num">% obj</th><th class="num">Objetivo €</th><th class="num">A asignar</th><th class="num">Falta</th>${yrHead}<th></th></tr></thead><tbody>${rows}${pendRow}</tbody></table></div>`;
}

function cajaDivMes(){ const shares=calSharesByTicker(); const ev=DB.eventos||{}; const rep=DB.divReparto||{}; const out=new Array(12).fill(0);
  Object.keys(shares).forEach(t=>{ if(shares[t]<=0.0001)return; const v=(DB.valores||{})[t]||{}; let br=num(v.divAccion); if(!(br>0)){ const c=(DB.calendario||[]).find(x=>(x.ticker||'').toUpperCase()===t); br=c?calDivBruto(c):0; } if(!(br>0))return; const des=(ev[t]||[]).filter(e=>((e.code||'')[0]||'').toUpperCase()==='D').sort((a,b)=>a.m-b.m||a.w-b.w); const rp=rep[t]||[]; des.forEach((e,idx)=>{ const eur=shares[t]*br*(num(rp[idx]||0)/100); if(eur)out[e.m-1]+=eur; }); });
  return out; }
function cajaMovs(){ const cfg=DB.cajaConfig||{}; const out=[];
  const nowD=new Date(); const cuY=nowD.getFullYear();
  const desdeY=num(cfg.desdeY)||cuY, desdeM=num(cfg.desdeM)||(nowD.getMonth()+1), hastaY=num(cfg.hastaY)||(cuY+1);
  const defSAN=(cfg.defSAN!=null&&cfg.defSAN!=='')?num(cfg.defSAN):400, defR4=(cfg.defR4!=null&&cfg.defR4!=='')?num(cfg.defR4):700;
  const dia=String(num(cfg.aportDia)||3).padStart(2,'0');
  for(let y=desdeY;y<=hastaY;y++){ const m0=(y===desdeY?desdeM:1); for(let m=m0;m<=12;m++){ const f=`${y}-${String(m).padStart(2,'0')}-${dia}`;
    if(defSAN){ const _ks='SAN|'+f; const _os=(DB.cajaAporReal||{})[_ks]; const _fs=(DB.cajaAporFecha||{})[_ks]||f; out.push({fecha:_fs,concepto:'Aportación SAN',entra:(_os!=null&&_os!=='')?num(_os):defSAN,sale:0,auto:1,apor:1,aporKey:_ks,real:(_os!=null&&_os!=='')}); }
    if(defR4){ const _kr='R4|'+f; const _or=(DB.cajaAporReal||{})[_kr]; const _fr=(DB.cajaAporFecha||{})[_kr]||f; out.push({fecha:_fr,concepto:'Aportación R4',entra:(_or!=null&&_or!=='')?num(_or):defR4,sale:0,auto:1,apor:1,aporKey:_kr,real:(_or!=null&&_or!=='')}); } } }
  const shares=calSharesByTicker(); const ev=DB.eventos||{}; const rep=DB.divReparto||{};
  const dayW=w=>String(Math.min(28,(w-1)*7+3)).padStart(2,'0');
  Object.keys(shares).forEach(t=>{ if(shares[t]<=0.0001)return; const v=(DB.valores||{})[t]||{}; let br=num(v.divAccion); if(!(br>0)){ const c=(DB.calendario||[]).find(x=>(x.ticker||'').toUpperCase()===t); br=c?calDivBruto(c):0; } if(!(br>0))return; const des=(ev[t]||[]).filter(e=>((e.code||'')[0]||'').toUpperCase()==='D').sort((a,b)=>a.m-b.m||a.w-b.w); const rp=rep[t]||[];
    for(let y=desdeY;y<=hastaY;y++){ des.forEach((e,idx)=>{ if(y===desdeY&&e.m<desdeM)return; const neto=Math.round(shares[t]*br*(num(rp[idx]||0)/100)*0.81*100)/100; if(neto>0){ const _f=`${y}-${String(e.m).padStart(2,'0')}-${dayW(e.w)}`; const _k=t+'|'+_f; const _ov=(DB.cajaDivReal||{})[_k]; const _df=(DB.cajaDivFecha||{})[_k]||_f; out.push({fecha:_df,concepto:'Dividendo '+t,entra:(_ov!=null&&_ov!=='')?num(_ov):neto,sale:0,auto:1,div:1,divKey:_k,real:(_ov!=null&&_ov!=='')}); } }); } });
  (DB.cajaMov||[]).forEach(mv=>out.push({fecha:mv.fecha||'',concepto:mv.concepto||'',entra:num(mv.entra||0),sale:num(mv.sale||0),auto:0,id:mv.id}));
  out.sort((a,b)=> (a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0) || (b.auto-a.auto));
  return out; }
function renderCaja(){
  const el=$('#cajaTabla'); if(!el)return; const cfg=DB.cajaConfig=DB.cajaConfig||{};
  const nowD=new Date(); const cuY=nowD.getFullYear();
  const cf=$('#cajaCfg'); if(cf){ const fld=(lb,ds,val,w,type)=>`<div><div class="muted" style="font-size:11px;margin-bottom:2px">${lb}</div><input type="${type||'number'}" class="anaInp" style="width:${w||80}px;text-align:${type==='date'?'left':'right'}" data-cajacfg="${ds}" value="${val}"></div>`;
    cf.innerHTML=fld('Saldo inicial €','saldoIni',(cfg.saldoIni!=null?cfg.saldoIni:''),90)
      +fld('Fecha inicial','fechaIni',(cfg.fechaIni||''),140,'date')
      +fld('Desde año','desdeY',(num(cfg.desdeY)||cuY),70)
      +fld('Desde mes','desdeM',(num(cfg.desdeM)||(nowD.getMonth()+1)),60)
      +fld('Hasta año','hastaY',(num(cfg.hastaY)||(cuY+1)),70)
      +fld('Aport. SAN/mes','defSAN',((cfg.defSAN!=null&&cfg.defSAN!=='')?cfg.defSAN:400),90)
      +fld('Aport. R4/mes','defR4',((cfg.defR4!=null&&cfg.defR4!=='')?cfg.defR4:700),90)
      +fld('Día aport.','aportDia',(num(cfg.aportDia)||3),55)
      +`<div><button class="btn sm" id="cajaAddBtn">+ Movimiento</button></div>`; }
  const movs=cajaMovs(); let saldo=num(cfg.saldoIni||0); const fIni=cfg.fechaIni||''; let body=''; let totIn=0,totOut=0,minS=Infinity,minF='';
  const cell=v=>v?fmt(v):'';
  const hechoMap=DB.cajaHecho=DB.cajaHecho||{};
  const cbTd=k=>`<td style="text-align:center"><input type="checkbox" data-cajahecho="${k}" ${hechoMap[k]?'checked':''} title="Marca cuando el movimiento ya se ha ejecutado"></td>`;
  const trOpen=(k,defbg)=>`<tr data-defbg="${defbg||''}" style="background:${hechoMap[k]?'#f0fdf4':(defbg||'transparent')}">`;
  if(cfg.saldoIni!=null&&cfg.saldoIni!==''){ body+=`<tr style="font-weight:600;background:#eef2f7"><td></td><td>${fIni||'—'}</td><td>Situación inicial</td><td class="num"></td><td class="num"></td><td class="num">${fmt(saldo)}</td><td></td></tr>`; minS=saldo; minF=fIni; }
  movs.forEach(mv=>{ saldo+=mv.entra-mv.sale; totIn+=mv.entra; totOut+=mv.sale; if(saldo<minS){minS=saldo;minF=mv.fecha;}
    const sCell=`<td class="num" style="font-weight:600;${saldo<0?'color:#dc2626':''}">${fmt(saldo)}</td>`;
    if(mv.div||mv.apor){ const attr=mv.div?'data-cajadiv':'data-cajaapor'; const datAttr=mv.div?'data-cajadivdate':'data-cajaapordate'; const key=mv.div?mv.divKey:mv.aporKey; const tag=(mv.div&&!mv.real)?' <span class=\"muted\" style=\"font-size:9px\">prev</span>':''; const ec=`<td class="num" style="background:#dcfce7"><input type="number" class="anaInp" style="width:66px;text-align:right;background:transparent;color:#166534;font-weight:700" ${attr}="${key}" value="${mv.entra?(+mv.entra).toFixed(2):''}" title="Edita para poner el importe real">${mv.real?' <span style=\"color:#166534;font-weight:700\">✓</span>':''}</td>`;
      body+=`${trOpen(key,'')}${cbTd(key)}<td><input type="date" class="anaInp" style="width:124px" ${datAttr}="${key}" value="${mv.fecha}"></td><td>${mv.concepto}${tag}</td>${ec}<td class="num"></td>${sCell}<td></td></tr>`; }
    else if(mv.auto){ const ec=mv.entra?`<td class="num" style="background:#dcfce7;color:#166534;font-weight:600">${fmt(mv.entra)}</td>`:'<td class="num"></td>'; const oc=mv.sale?`<td class="num" style="background:#fee2e2;color:#991b1b;font-weight:600">${fmt(mv.sale)}</td>`:'<td class="num"></td>';
      const _ak='A|'+mv.fecha+'|'+mv.concepto; body+=`${trOpen(_ak,'')}${cbTd(_ak)}<td>${mv.fecha}</td><td>${mv.concepto}</td>${ec}${oc}${sCell}<td></td></tr>`; }
    else { const eBg=mv.entra?'background:#dcfce7;':''; const sBg=mv.sale?'background:#fee2e2;':'';
      body+=`${trOpen(mv.id,'#fffef0')}${cbTd(mv.id)}<td><input type="date" class="anaInp" style="width:124px" data-cajamv="${mv.id}|fecha" value="${mv.fecha}"></td><td><input class="anaInp" style="width:160px" data-cajamv="${mv.id}|concepto" value="${(mv.concepto||'').replace(/"/g,'&quot;')}"></td><td class="num" style="${eBg}"><input type="number" class="anaInp" style="width:70px;text-align:right;background:transparent;color:#166534;font-weight:600" data-cajamv="${mv.id}|entra" value="${mv.entra?(+mv.entra).toFixed(2):''}"></td><td class="num" style="${sBg}"><input type="number" class="anaInp" style="width:70px;text-align:right;background:transparent;color:#991b1b;font-weight:600" data-cajamv="${mv.id}|sale" value="${mv.sale?(+mv.sale).toFixed(2):''}"></td>${sCell}<td><button class="btn ghost sm" data-cajadel="${mv.id}" title="Eliminar">✕</button></td></tr>`; }
  });
  const head='<tr><th title="Ejecutado">✓</th><th>Fecha</th><th>Concepto</th><th class="num">Entra</th><th class="num">Sale</th><th class="num">Saldo</th><th></th></tr>';
  el.innerHTML=`<table><thead>${head}</thead><tbody>${body||'<tr><td colspan="7" class="empty">Sin movimientos. Pon el saldo inicial y el periodo, o pulsa «+ Movimiento».</td></tr>'}</tbody></table>`;
  $('#cajaKpis').innerHTML=[['Entradas',fmt(totIn)],['Salidas',fmt(totOut)],['Saldo final',fmt(saldo)],['Saldo mínimo', isFinite(minS)?fmt(minS)+(minF?' ('+minF+')':''):'—']].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  const _pre=$('#cajaPlanRef');
  if(_pre){ const pby={}; Object.keys(DB.planCompras||{}).forEach(t=>Object.keys((DB.planCompras||{})[t]||{}).forEach(y=>{ const v=num(DB.planCompras[t][y]); if(v>0){ pby[y]=pby[y]||{tot:0,det:[]}; pby[y].tot+=v; pby[y].det.push(t+' '+fmt(v)); } }));
    const _yrs=Object.keys(pby).sort();
    if(!_yrs.length){ _pre.innerHTML=''; }
    else { const saldoHasta=ye=>{ let q=num(cfg.saldoIni||0); movs.forEach(mv=>{ if((mv.fecha||'')<=ye) q+=num(mv.entra)-num(mv.sale); }); return q; };
      let acum=0; const rows=_yrs.map(y=>{ const plan=pby[y].tot; acum+=plan; const cajaFin=saldoHasta(y+'-12-31'); const tras=cajaFin-acum; const cls=tras>=0?'pos':'neg'; const det=(pby[y].det.join(' · ')).replace(/"/g,'');
        return `<tr><td>${y}</td><td class="num" title="${det}">${fmt(plan)}</td><td class="num">${fmt(cajaFin)}</td><td class="num ${cls}" style="font-weight:700">${fmt(tras)}</td></tr>`; }).join('');
      _pre.innerHTML=`<h3 style="margin:0 0 6px;font-size:14px">Compras del Plan (referencia)</h3><div class="sub" style="margin-bottom:6px">Compara lo que planeas invertir cada año (Plan/Diversificación) con la caja prevista. <b>Tras ejecutar plan</b> = caja a fin de año − plan acumulado: si es negativo (rojo), la caja no cubre el plan. Pasa el ratón por el importe del plan para ver el desglose por empresa.</div><div style="overflow:auto"><table><thead><tr><th>Año</th><th class="num">Plan compras</th><th class="num">Caja fin de año</th><th class="num">Tras ejecutar plan (acum.)</th></tr></thead><tbody>${rows}</tbody></table></div>`; } }
  const b=$('#cajaAddBtn'); if(b)b.onclick=()=>{ const f=$('#cajaForm'); if(!f)return; const show=f.style.display==='none'; f.style.display=show?'grid':'none'; if(show){ const d=$('#cajaFecha'); if(d&&!d.value)d.value=new Date().toISOString().slice(0,10); cajaTipo=''; const sg=$('#cajaTipoSeg'); if(sg)[...sg.children].forEach(x=>x.classList.remove('on')); } };
}
function addCajaMov(){ const fecha=(prompt('Fecha del movimiento (AAAA-MM-DD):', new Date().toISOString().slice(0,10))||'').trim(); if(!fecha)return; const concepto=(prompt('Concepto (p. ej. Compra 80 VIS):')||'').trim(); const imps=prompt('Importe en € (positivo = entra, negativo = sale):','0'); if(imps==null)return; const imp=num(imps); DB.cajaMov=DB.cajaMov||[]; DB.cajaMov.push({id:'c'+Math.random().toString(36).slice(2,9),fecha,concepto,entra:imp>=0?imp:0,sale:imp<0?-imp:0}); saveNow(); renderCaja(); }
function qPassed(t,q,year){ const ev=(DB.eventos||{})[t]||[]; const e=ev.find(x=>(x.code||'').toUpperCase()===q); if(!e)return false; const day=Math.min(28,((e.w||1)-1)*7+3); return new Date(year,(e.m||1)-1,day)<=new Date(); }
function mesesDesde(fechaStr){ if(!fechaStr)return null; const d=new Date(fechaStr+'T00:00:00'); if(isNaN(d.getTime()))return null; const now=new Date(); return (now.getFullYear()-d.getFullYear())*12+(now.getMonth()-d.getMonth()); }
function renderMonitor(){
  DB.todos=DB.todos||[]; DB.monitor=DB.monitor||{};
  const te=$('#todoTabla');
  if(te){
    const hoy=new Date().toISOString().slice(0,10);
    const todos=DB.todos.slice().sort((a,b)=>(a.hecho?1:0)-(b.hecho?1:0)||((a.fecha||'9999').localeCompare(b.fecha||'9999')));
    if(!todos.length){ te.innerHTML='<div class="empty">Sin tareas. Añade una arriba.</div>'; }
    else{ const rows=todos.map(x=>{ const venc=x.fecha&&!x.hecho&&x.fecha<hoy; return `<tr style="${venc?'background:#fee2e2;':(x.hecho?'opacity:.55;':'')}"><td class="num"><input type="checkbox" data-todone="${x.id}" ${x.hecho?'checked':''}></td><td style="white-space:nowrap">${x.fecha?ddmmyyyy(x.fecha):'—'}</td><td>${(x.desc||'').replace(/</g,'&lt;')}</td><td class="muted">${(x.razon||'').replace(/</g,'&lt;')}</td><td>${x.ticker?`<button class="btn ghost sm" data-ficha="${x.ticker}">${x.ticker}</button>`:''}</td><td><button class="btn ghost sm" data-tododel="${x.id}" title="Eliminar">✕</button></td></tr>`; }).join('');
      te.innerHTML=`<table><thead><tr><th class="num">✓</th><th>Fecha</th><th>Descripción</th><th>Razonamiento</th><th>Empresa</th><th></th></tr></thead><tbody>${rows}</tbody></table>`; }
  }
  const el=$('#monTabla'); if(!el)return;
  const yr=new Date().getFullYear();
  const held=new Set(); (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)held.add((p.ticker||'').toUpperCase()); });
  const plan=new Set((DB.planLote||[]).map(x=>(x||'').toUpperCase()));
  const closed=new Set(); (DB.cerradas||[]).forEach(c=>{ const t=(c.ticker||'').toUpperCase(); if(t)closed.add(t); }); try{ (invClosedComputed()||[]).forEach(c=>closed.add((c.ticker||'').toUpperCase())); }catch(e){}
  const _sigueCotiz=t=>{ const pf=((DB.valores||{})[t]||{}).precioFecha; if(!pf)return true; return (Date.now()-Date.parse(pf)) < 60*86400000; };
  let tickers=[...new Set([...held,...plan])].filter(Boolean);
  closed.forEach(t=>{ if(t&&!held.has(t)&&!plan.has(t)&&_sigueCotiz(t)) tickers.push(t); });
  tickers=[...new Set(tickers)];
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin empresas (ten posiciones o añade empresas en Diversificación).</div>'; return; }
  const _grp=t=> held.has(t)?0:(plan.has(t)?1:2);
  tickers.sort((a,b)=>_grp(a)-_grp(b)||a.localeCompare(b));
  const nm=t=>((DB.valores||{})[t]||{}).nombre||t;
  const body=tickers.map(t=>{ const m=DB.monitor[t]||{}; const inf=!!m.informe;
    const rolInp=`<input class="anaInp" style="width:120px;font-size:11px" data-mon="${t}|rol" value="${(m.rol||'').replace(/"/g,'&quot;')}">`;
    const infCell=`<button class="btn ghost sm" data-moninf="${t}">${inf?'<span class="pos">✓ Sí</span>':'<span class="muted">Pendiente</span>'}</button>${(inf&&m.informeFecha)?`<div class="muted" style="font-size:9px">${m.informeFecha}</div>`:''}`;
    const _an=(DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===t)||{}; const _df=_an.dossierFecha; let _m=(typeof mesesDesde==='function')?mesesDesde(_df):null; if(_m!=null&&_m<0)_m=0;
    let dosCell; if(!_df){ dosCell='<td class="muted" style="font-size:10px;text-align:center">sin dossier</td>'; } else if(_m!=null&&_m>12){ dosCell=`<td style="text-align:center;background:#fee2e2" title="Dossier de ${_df}"><span style="color:#dc2626;font-weight:700">⚠️ ${_m} m</span><div class="muted" style="font-size:9px">reanalizar</div></td>`; } else { dosCell=`<td style="text-align:center" title="Dossier de ${_df}"><span class="pos">${_m==null?'?':_m+' m'}</span><div class="muted" style="font-size:9px">${_df}</div></td>`; }
    let q;
    if(inf){ q=['Q1','Q2','Q3','Q4'].map(qc=>{ const key=yr+'-'+qc; const done=!!(m.rev&&m.rev[key]); const passed=qPassed(t,qc,yr); const bg=(passed&&!done)?'background:#fee2e2;':''; const mark=done?'<span class="pos">✓</span>':(passed?'<span style="color:#dc2626;font-weight:700">!</span>':'·'); return `<td class="num" data-monrev="${t}|${key}" style="cursor:pointer;${bg}" title="${passed?'Resultados ya publicados':'Aún no publicados'}">${mark}</td>`; }).join(''); }
    else { q='<td colspan="4" class="muted" style="font-size:11px;text-align:center">Falta informe</td>'; }
    return `<tr><td style="white-space:nowrap"><button class="btn ghost sm" data-ficha="${t}"><b>${t}</b></button> <span class="muted" style="font-size:10px">${nm(t)}</span>${(closed.has(t)&&!held.has(t)&&!plan.has(t))?' <span class="muted" style="font-size:9px">· cerrada (seguimiento)</span>':''}</td><td>${rolInp}</td><td>${infCell}</td>${dosCell}${q}</tr>`;
  }).join('');
  const head=`<tr><th rowspan="2">Empresa</th><th rowspan="2">Rol/Plan</th><th rowspan="2">Informe</th><th rowspan="2">Dossier</th><th class="num" colspan="4" style="text-align:center">Revisión trimestral ${yr}</th></tr><tr><th class="num">Q1</th><th class="num">Q2</th><th class="num">Q3</th><th class="num">Q4</th></tr>`;
  el.innerHTML=`<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
