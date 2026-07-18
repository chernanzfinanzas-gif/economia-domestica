let _sort={};
function sortToggle(t,k){ const c=_sort[t]||{}; if(c.k===k)c.dir=(c.dir===1?-1:1); else { c.k=k; c.dir=-1; } _sort[t]=c; }
function sortArrow(t,k){ const c=_sort[t]||{}; return c.k===k?(c.dir===1?' ▲':' ▼'):''; }
function sortApply(t,arr,g){ const c=_sort[t]; if(!c||!c.k||!g[c.k])return arr; const f=g[c.k]; return arr.slice().sort((a,b)=>{ let va=f(a),vb=f(b); if(typeof va==='string'||typeof vb==='string')return c.dir*String(va==null?'':va).localeCompare(String(vb==null?'':vb)); va=(va==null||isNaN(va))?-Infinity:va; vb=(vb==null||isNaN(vb))?-Infinity:vb; return c.dir*(va-vb); }); }
document.addEventListener('click',e=>{ const h=e.target.closest&&e.target.closest('[data-sortk]'); if(!h)return; sortToggle(h.dataset.sorttbl,h.dataset.sortk); const fn={ranking:(typeof renderRanking==='function'?renderRanking:null),cartera:(typeof renderInv==='function'?renderInv:null),analisis:(typeof renderAnalisis==='function'?renderAnalisis:null),pos:(typeof renderPOS==='function'?renderPOS:null)}[h.dataset.sorttbl]; if(fn)fn(); });
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
  const _ra=$('#rankAport'); if(_ra)_ra.innerHTML=(typeof evoChartHTML==='function')?evoChartHTML({id:'evoRank',reRender:renderRanking,ibex:true,goto:'ranking',title:'Aportado acumulado vs valor de cartera'}):((typeof aportValorHTML==='function')?aportValorHTML(renderRanking):'');
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
  const _held=heldTickerSet();
  const _closed=closedTickerSet();
  const _grp=t=> _held.has(t)?0:(_closed.has(t)?1:2);
  const _tot=t=>Object.values(dpa[t]||{}).reduce((s,v)=>s+num(v),0);
  tickers.sort((x,y)=> _grp(x)-_grp(y) || _tot(y)-_tot(x) || x.localeCompare(y));
  const nowY=new Date().getFullYear(); const conf=DB.aniosConfirmados||{}; const y0=2011, y1=Math.max(num(DB.previsionMaxYear)||2030,nowY+1,maxDataYear()); const years=[]; for(let y=y0;y<=y1;y++)years.push(y);
  const head='<tr><th>Año</th>'+tickers.map(t=>`<th class="num" title="${nm(t)}"><span data-ficha="${t}" style="cursor:pointer;color:var(--brand)">${t}</span></th>`).join('')+'</tr>';
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
/* Consumo del plan de un ticker por lo YA COMPRADO, del año más próximo al más lejano.
   Lo comprado del ticker dentro del periodo del plan se descuenta de sus compras previstas
   empezando por la más cercana (aunque se haya comprado en otro año). Devuelve el € que QUEDA
   por año. Así "queda", el presupuesto por asignar y la proyección no duplican lo ya invertido. */
function _planRem(t){ t=(t||'').toUpperCase(); const pc=(DB.planCompras||{})[t]||{};
  const pe=DB.planLotePeriodo||{}; const desde=num(pe.desde)||2026, hasta=Math.max(num(pe.hasta)||2034, desde);
  const nowRefY=new Date().getFullYear();
  /* Años del plan con importe > 0 (los que tienen "queda"/tramo por comprar). */
  const py=Object.keys(pc).map(Number).filter(y=>num(pc[y])>0).sort((a,b)=>a-b);
  const rem={}, comp={}; py.forEach(y=>{ rem[y]=num(pc[y]); comp[y]=0; });
  let bought=0; const adel=[];
  for(let y=desde;y<=hasta;y++){ const b=(typeof execBuyEur==='function')?execBuyEur(t,y):0; if(b<=0) continue; bought+=b;
    if(String(y) in pc){
      /* Compra en un año CON tramo de plan (aunque el tramo sea 0, como los años ya
         reconciliados a mano): consume SOLO el tramo de ESE año; el exceso es sobra de ese
         año y NO se traslada a otros años del plan. Así no toca compras/tramos ya cerrados. */
      if(rem[y]!=null){ const c=Math.min(rem[y], b); rem[y]-=c; comp[y]+=c; }
    } else if(y>nowRefY){
      /* Compra en un año FUTURO sin tramo = adelanto real de una compra prevista:
         consume el tramo FUTURO más próximo (año >= año de compra). Las compras del año
         en curso o de años pasados SIN tramo NO se tratan como adelanto: son acumulación
         normal (ya reflejada en "invertido") y no deben consumir tramos futuros del plan
         (p.ej. NTGY: 18.051 comprados en 2026 no deben marcar el tramo de 2032). Equivale
         a la reconciliación manual "año en curso = 0" que ya se hizo en LOG/VIS. */
      adel.push({y:y, eur:b});
    }
  }
  let sobra=0;
  adel.sort((a,b)=>a.y-b.y).forEach(a=>{ let pool=a.eur;
    py.forEach(y=>{ if(pool<=0||y<a.y) return; const c=Math.min(rem[y], pool); rem[y]-=c; comp[y]+=c; pool-=c; });
    sobra+=pool;
  });
  return {rem:rem, comp:comp, bought:bought, sobra:sobra};
}
function planPendShares(t,year){ const v=(DB.valores||{})[t]; const pr=v&&num(v.precioActual)>0?num(v.precioActual):0; if(!pr)return 0;
  const R=_planRem(t); let sh=0; Object.keys(R.rem).forEach(y=>{ if(+y<=year) sh+=Math.floor(num(R.rem[y])/pr); }); return sh; }
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
  const _prevSL=(el.querySelector('.sim-desk')||el).scrollLeft||0;
  const nowY=new Date().getFullYear(); const conf=DB.aniosConfirmados||{}; const y0=2011,y1=Math.max(num((DB.planLotePeriodo||{}).hasta)||2034,nowY+1,maxDataYear()); const years=[]; for(let y=y0;y<=y1;y++)years.push(y);
  const dpa=DB.divPorAccion||{};
  const set=new Set();
  (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase()); });
  (DB.cerradas||[]).forEach(c=>set.add((c.ticker||'').toUpperCase())); try{ invClosedComputed().forEach(c=>set.add(c.ticker)); }catch(e){}
  Object.keys(DB.simShares||{}).forEach(t=>set.add(t.toUpperCase()));
  Object.keys(DB.planCompras||{}).forEach(t=>set.add(t.toUpperCase()));
  let tickers=[...set].filter(Boolean);
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin empresas. Ten posiciones en cartera o pulsa «+ Empresa».</div>'; $('#simKpis').innerHTML=''; return; }
  const held=heldTickerSet();
  const closed=closedTickerSet();
  const grp=t=>held.has(t)?0:(closed.has(t)?1:2);
  tickers.sort((a,b)=>grp(a)-grp(b)||a.localeCompare(b));
  const tot={}; years.forEach(y=>tot[y]=0);
  const simDpa=(t,y)=>{ let d=(typeof evoDpaProyectado==='function')?evoDpaProyectado(t,y):null; if(d!=null) return d; const v=(dpa[t]||{})[y]; return v!=null?num(v):null; };
  tickers.forEach(t=>years.forEach(y=>{ tot[y]+=simEffShares(t,y,nowY)*num(simDpa(t,y)||0); }));
  const eurK=v=>{ v=Math.round(v); const a=Math.abs(v); return a>=1000?((Math.round(v/100)/10).toLocaleString('es-ES')+'k'):(''+v); };
  const nmS=t=>((DB.valores||{})[t]||{}).nombre||(((DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===t)||{}).nombre)||t;
  const head='<tr><th>Empresa</th>'+years.map(y=>{ const fut=y>nowY; return `<th class="num" data-simyear="${y}" ${fut?`data-yhead="${y}" style="cursor:pointer" title="Clic: confirmar/desconfirmar año"`:''}>${y}${fut?(conf[y]?' <span style="color:#16a34a;font-size:9px">✓</span>':' <span class="muted" style="font-size:9px">prev</span>'):''}</th>`; }).join('')+'</tr>';
  const body=tickers.map(t=>{ const real=simIsReal(t);
    const cells=years.map(y=>{ const past=y<=nowY; const divRaw=simDpa(t,y); const div=divRaw||0; const sh=simEffShares(t,y,nowY); const imp=sh*div; const ss=(DB.simShares||{})[t];
      const accCell=(y>nowY)?`<div class="num sim-acc" style="font-weight:600">${sh||'·'}</div>`:`<input type="number" class="anaInp sim-accinp" style="text-align:right${(past&&real&&!(ss&&ss[y]!=null))?';color:#64748b':''}" data-sim="${t}" data-y="${y}" value="${(ss&&ss[y]!=null)?ss[y]:(sh||'')}">`;
      const divStar=divRaw===0?'<span style="color:#dc2626;font-weight:700">*</span>':'';
      const divCell=`<div class="num" style="color:#475569">${divRaw==null?'·':divRaw.toFixed(3)}${divStar}</div>`;
      let impCell; if(divRaw===0&&sh>0) impCell='0,00 <span style="color:#dc2626;font-weight:700">*</span>'; else impCell=imp>0?fmt(imp):'·';
      const cc=(DB.divConfirmado[t]&&DB.divConfirmado[t][y])||conf[y]; const cpv=(y>nowY)&&!cc; return `<td style="${cpv?'background:#fffbeb;':''}"><div style="font-size:8px;color:var(--brand);font-weight:700;line-height:1.1">${t}</div>${accCell}<div data-divconf="${t}|${y}" title="Clic: marcar dividendo real confirmado" style="font-size:8px;margin-top:1px;line-height:1.1;cursor:pointer;color:${(y>nowY&&cc&&!conf[y])?'#16a34a':'var(--muted)'};font-weight:${(y>nowY&&cc&&!conf[y])?'700':'400'}">div '${String(y).slice(2)}${(y>nowY&&cc&&!conf[y])?' ✓':''}</div>${divCell}<div class="pos" style="font-weight:700;margin-top:1px">${impCell}</div></td>`;
    }).join('');
    return `<tr><td class="sim-emp"><b class="dv-tk" data-ficha="${t}" style="cursor:pointer">${t}</b></td>${cells}</tr>`;
  }).join('');
  const totRow='<tr class="simtot"><td>TOTAL €</td>'+years.map(y=>`<td class="num">${tot[y]?fmt(tot[y]):'·'}</td>`).join('')+'</tr>';
  const grRow='<tr class="simgr grrow"><td>Δ % anual</td>'+years.map((y,i)=>{ if(i===0)return '<td class="num">·</td>'; const pr=tot[years[i-1]]; const g=pr?((tot[y]/pr)-1):null; return `<td class="num ${g!=null?(g>=0?'pos':'neg'):''}">${g==null?'·':(g>=0?'+':'')+(g*100).toFixed(0)+'%'}</td>`; }).join('')+'</tr>';
  const deskHTML=`<div class="sim-desk"><table><thead>${head}</thead><tbody>${totRow}${grRow}${body}</tbody></table></div>`;
  /* Móvil: dividendo por año (chips) + selector de empresa */
  const pyChip=(y,i)=>{ const pr=i>0?tot[years[i-1]]:0; const g=pr?((tot[y]/pr)-1):null; const cls=g==null?'z':(g>=0?'g':'r'); const fut=y>nowY; const cc=conf[y]; return `<div class="pychip ${cls}"${fut?` data-yhead="${y}" style="cursor:pointer" title="Clic: confirmar/desconfirmar año"`:''}><div class="yy">${y}${fut?(cc?' ✓':' ·'):''}</div><div class="pv2">${eurK(tot[y]||0)} €</div><div class="pl2">dividendo${fut?' prev.':''}</div><div class="pv">${g==null?'·':(g>=0?'+':'')+(g*100).toFixed(0)+'%'}</div><div class="pl">Δ anual</div></div>`; };
  const pyStripHTML='<div class="pystrip-t">Dividendo total por año</div><div class="dv-pystrip">'+years.map(pyChip).join('')+'</div>';
  if(!window._simCoSel || tickers.indexOf(window._simCoSel)<0) window._simCoSel=tickers[0]||'';
  const selIdx=Math.max(0,tickers.indexOf(window._simCoSel));
  const grpLbl=t=>held.has(t)?'Cartera':(closed.has(t)?'Cerrada':'Plan');
  const coOptions=tickers.map((t,i)=>`<option value="${i}"${i===selIdx?' selected':''}>${t} · ${grpLbl(t)}</option>`).join('');
  const mrow=(t,y)=>{ const past=y<=nowY; const divRaw=simDpa(t,y); const div=divRaw||0; const sh=simEffShares(t,y,nowY); const imp=sh*div; const ss=(DB.simShares||{})[t]; const fut=y>nowY;
    if(!(sh>0)&&!(ss&&ss[y]!=null)&&!(imp>0)&&fut) return '';
    const accCell=fut?`<b>${sh||'·'}</b>`:`<input type="number" class="anaInp" style="width:90px;text-align:right" data-sim="${t}" data-y="${y}" value="${(ss&&ss[y]!=null)?ss[y]:(sh||'')}">`;
    return `<div class="simrow"><span class="yy">${y}${fut?' <em>prev</em>':''}</span><div class="acc">${accCell}<span class="lbl">acc.</span></div><div class="dv">${divRaw==null?'·':divRaw.toFixed(3)}<span class="lbl">€/acc</span></div><div class="im">${imp>0?fmt(imp):'·'}<span class="lbl">importe</span></div></div>`; };
  const mdetail=(t,i)=>{ const rows=years.map(y=>mrow(t,y)).filter(Boolean).join('');
    return `<div class="codet" data-coi="${i}"${i!==selIdx?' style="display:none"':''}>`
      +`<div class="codet-h"><div class="mid"><div class="t1"><b class="dv-tk" data-ficha="${t}" style="cursor:pointer">${t}</b> <span class="pill">${grpLbl(t)}</span></div><div class="t2">${(nmS(t)||'').slice(0,28)}</div></div><div class="fh"><b>${fmt(tot2(t))}</b><div class="fl">dividendo ${y1}</div></div></div>`
      +`<div class="simlist">${rows||'<div class="muted" style="font-size:12px;padding:6px">Sin datos.</div>'}</div>`
      +`</div>`; };
  function tot2(t){ return simEffShares(t,y1,nowY)*num(simDpa(t,y1)||0); }
  const mobHTML='<div class="sim-mob">'+pyStripHTML+'<div class="cosel-t">Ver empresa</div><select class="cosel" id="simCoSel">'+coOptions+'</select><div class="codetails">'+tickers.map(mdetail).join('')+'</div></div>';
  el.innerHTML=deskHTML+mobHTML;
  $('#simKpis').innerHTML='<div class="sim-kpis">'
    +`<div class="k"><div class="l">Dividendo ${nowY}</div><div class="v">${fmt(tot[nowY]||0)}</div><div class="p">bruto este año</div></div>`
    +`<div class="k hero"><div class="l">Previsión ${y1}</div><div class="v">${fmt(tot[y1]||0)}</div><div class="p">dividendo bruto proyectado</div></div>`
    +`<div class="k"><div class="l">Crecimiento ${nowY}→${y1}</div><div class="v">${tot[nowY]?(((tot[y1]/tot[nowY])-1)*100).toFixed(0)+'%':'—'}</div><div class="p">total del periodo</div></div>`
    +'</div>';
  /* Banda deslizante ↔ scroll horizontal (arranque centrado en nowY-2) */
  (function(){ var sc=el.querySelector('.sim-desk'); var rng=document.getElementById('simScroll'); if(!sc)return;
    var maxSL=function(){ return Math.max(0, sc.scrollWidth - sc.clientWidth); };
    var sync=function(){ if(!rng)return; var m=maxSL(); rng.style.display=(m>4)?'':'none'; rng.value=(m>0)?Math.round(sc.scrollLeft/m*1000):0; };
    if(rng && !rng._simWired){ rng._simWired=true;
      rng.addEventListener('input',function(){ var s=document.querySelector('#simTabla .sim-desk'); if(s)s.scrollLeft=Math.max(0,s.scrollWidth-s.clientWidth)*(num(rng.value)/1000); });
    }
    sc.addEventListener('scroll',sync);
    setTimeout(function(){
      if(window._simSeek){ var th=sc.querySelector('th[data-simyear="'+(nowY-2)+'"]'); var f=sc.querySelector('th'); var off=f?f.offsetWidth:0; sc.scrollLeft=th?Math.max(0,th.offsetLeft-off):0; window._simSeek=false; }
      else { sc.scrollLeft=_prevSL; }
      sync();
    },180);
  })();
  if(!el._simCoBound){ el._simCoBound=true; el.addEventListener('change',function(e){ var s=e.target.closest('#simCoSel'); if(!s)return; var i=s.value; var arr=window.__simOrder||[]; window._simCoSel=arr[+i]||window._simCoSel; el.querySelectorAll('.sim-mob .codet').forEach(function(d){ d.style.display=(d.getAttribute('data-coi')===String(i))?'':'none'; }); }); }
  window.__simOrder=tickers;
}

function addSimEmpresa(){
  const tk=(prompt('Ticker de la empresa nueva:')||'').trim().toUpperCase(); if(!tk)return;
  const nombre=(prompt('Nombre:')||tk).trim();
  DB.simShares=DB.simShares||{}; DB.simShares[tk]=DB.simShares[tk]||{};
  DB.valores=DB.valores||{}; DB.valores[tk]=DB.valores[tk]||{}; if(nombre)DB.valores[tk].nombre=nombre;
  DB.divPorAccion=DB.divPorAccion||{}; DB.divPorAccion[tk]=DB.divPorAccion[tk]||{};
  saveNow(); renderSimulador(); const st=$('#simStatus'); if(st)st.textContent='Añadida '+tk;
}
function simYearTotal(year){ const dpa=DB.divPorAccion||{}; const nowY=new Date().getFullYear(); const set=new Set(); (typeof invPositions==='function'?invPositions():[]).forEach(p=>{if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase());}); (DB.cerradas||[]).forEach(c=>set.add((c.ticker||'').toUpperCase())); Object.keys(DB.simShares||{}).forEach(t=>set.add(t.toUpperCase())); Object.keys(DB.planCompras||{}).forEach(t=>set.add(t.toUpperCase())); let tot=0; set.forEach(t=>{ let d=(typeof evoDpaProyectado==='function')?evoDpaProyectado(t,year):null; if(d==null) d=num((dpa[t]||{})[year]||0); tot+=simEffShares(t,year,nowY)*num(d); }); return tot; }
// === Fiscalidad FIFO: latente por lote, realizado del año, impuesto del ahorro y regla de los 2 meses ===
function _impuestoAhorro(base){ base=num(base); if(base<=0)return 0; const tr=[[6000,0.19],[50000,0.21],[200000,0.23],[300000,0.27],[Infinity,0.28]]; let tax=0,prev=0; for(let i=0;i<tr.length;i++){ const cap=tr[i][0],rate=tr[i][1]; if(base>prev){ const amt=Math.min(base,cap)-prev; tax+=amt*rate; prev=cap; } else break; } return tax; }
function _precioActualDe(t){ t=(t||'').toUpperCase(); const v=(DB.valores||{})[t]||{}; let p=num(v.precioActual); if(p>0)return p; const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(a&&num(a.cotizacion)>0)return num(a.cotizacion); if(typeof _precioCache!=='undefined'){ const pj=_precioCache[t]; if(pj&&pj.data&&pj.data.length)return num(pj.data[pj.data.length-1][1]); } return 0; }
function fiscalidadData(){ const nowY=new Date().getFullYear();
  const ops=(typeof _allOps==='function'?_allOps():[]).filter(o=>o.fecha&&num(o.acciones)>0).slice().sort((a,b)=>{ const c=(a.fecha||'').localeCompare(b.fecha||''); if(c)return c; return (a.tipo==='venta'?1:0)-(b.tipo==='venta'?1:0); });
  const byT={}; ops.forEach(o=>{ const t=(o.ticker||'').toUpperCase(); (byT[t]=byT[t]||[]).push(o); });
  const openLots=[], realized=[];
  Object.keys(byT).forEach(t=>{ const q=[]; byT[t].forEach(o=>{ const acc=num(o.acciones),pr=num(o.precio); if(o.tipo==='venta'){ let rem=acc; while(rem>1e-6&&q.length){ const lot=q[0]; const take=Math.min(rem,lot.acciones); realized.push({t,fechaV:o.fecha,fechaC:lot.fecha,acc:take,precioC:lot.precio,precioV:pr,gan:(pr-lot.precio)*take}); lot.acciones-=take; rem-=take; if(lot.acciones<=1e-6)q.shift(); } } else q.push({fecha:o.fecha,acciones:acc,precio:pr}); }); q.forEach(lot=>{ if(lot.acciones>1e-6)openLots.push({t,fecha:lot.fecha,acciones:lot.acciones,precio:lot.precio}); }); });
  openLots.forEach(l=>{ const pa=_precioActualDe(l.t); l.precioActual=pa; l.latente=(pa>0)?(pa-l.precio)*l.acciones:null; l.pct=(pa>0&&l.precio>0)?(pa/l.precio-1):null; });
  const latGain=openLots.reduce((s,l)=>s+((l.latente!=null&&l.latente>0)?l.latente:0),0);
  const latLoss=openLots.reduce((s,l)=>s+((l.latente!=null&&l.latente<0)?l.latente:0),0);
  const realY=realized.filter(r=>(r.fechaV||'').slice(0,4)===String(nowY));
  const realGainY=realY.reduce((s,r)=>s+r.gan,0);
  const buys=ops.filter(o=>o.tipo!=='venta');
  const DOS_M=61*86400000;
  realY.forEach(r=>{ if(r.gan<0){ const vs=Date.parse(r.fechaV+'T00:00:00'); r.recompra=buys.some(b=>(b.ticker||'').toUpperCase()===r.t && b.fecha!==r.fechaV && Math.abs(Date.parse((b.fecha||'')+'T00:00:00')-vs)<=DOS_M); } });
  const hoyMs=Date.now();
  openLots.forEach(l=>{ if(l.latente!=null&&l.latente<0){ l.recompraReciente=buys.some(b=>(b.ticker||'').toUpperCase()===l.t && (hoyMs-Date.parse((b.fecha||'')+'T00:00:00'))<=DOS_M && (hoyMs-Date.parse((b.fecha||'')+'T00:00:00'))>=0); } });
  const harvestable=-latLoss;
  const gPos=Math.max(0,realGainY); const offset=Math.min(gPos,harvestable);
  const taxSaved=_impuestoAhorro(gPos)-_impuestoAhorro(gPos-offset);
  const impuestoY=_impuestoAhorro(gPos);
  return {nowY,openLots,realized,realY,latGain,latLoss,realGainY,harvestable,offset,taxSaved,impuestoY};
}
function renderFiscalidad(){ const el=$('#fiscalBody'); if(!el)return; const kp=$('#fiscalKpis'); const F=fiscalidadData();
  if(!F.openLots.length&&!F.realized.length){ el.innerHTML='<div class="empty">Sin operaciones registradas. La fiscalidad se calcula a partir de tus compras y ventas (Inversiones).</div>'; if(kp)kp.innerHTML=''; return; }
  const sg=x=>(x>=0?'+':'')+fmt(x);
  if(kp)kp.innerHTML=[
    ['Plusvalía latente',fmt(F.latGain),'pos','no tributa hasta vender'],
    ['Minusvalía latente',fmt(F.latLoss),F.latLoss<0?'neg':'','disponible para aflorar'],
    ['Realizado '+F.nowY,sg(F.realGainY),F.realGainY>=0?'pos':'neg','ganancia/pérdida del año'],
    ['Impuesto estimado '+F.nowY,fmt(F.impuestoY),'','sobre lo realizado']
  ].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[1]&&k[2]||''}">${k[1]}</div><div class="sub">${k[3]}</div></div>`).join('');
  let harvestBox='';
  if(F.realGainY>0.5&&F.harvestable>0.5){ harvestBox=`<div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0;margin-bottom:12px"><div style="font-weight:700;color:#166534;margin-bottom:4px">💡 Afloramiento de pérdidas</div><div class="sub">Tienes ${fmt(F.realGainY)} de ganancias realizadas este año y ${fmt(F.harvestable)} en minusvalías latentes. Aflorando <b>${fmt(F.offset)}</b> compensarías esas ganancias y ahorrarías <b style="color:#166534">~${fmt(F.taxSaved)}</b> de impuestos. Ojo a la <b>regla de los 2 meses</b>: si vendes con pérdida, no recompres la MISMA acción en los 2 meses anteriores o posteriores o la pérdida no será deducible este año.</div></div>`; }
  else if(F.harvestable>0.5){ harvestBox=`<div class="card" style="background:#fff7ed;border:1px solid #fed7aa;margin-bottom:12px"><div class="sub">Tienes ${fmt(F.harvestable)} en minusvalías latentes, pero no hay ganancias realizadas este año que compensar. Las pérdidas afloradas compensan ganancias del mismo año, hasta el 25% de otros rendimientos del ahorro, y el resto se arrastra 4 años. Recuerda la regla de los 2 meses al recomprar.</div></div>`; }
  const cand=F.openLots.filter(l=>l.latente!=null&&l.latente<0).sort((a,b)=>a.latente-b.latente);
  const candRows=cand.map(l=>`<tr><td><b data-ficha="${l.t}" style="cursor:pointer;color:var(--brand)">${l.t}</b></td><td>${l.fecha||'—'}</td><td class="num">${(+l.acciones).toFixed(0)}</td><td class="num">${fmt(l.precio)}</td><td class="num">${fmt(l.precioActual)}</td><td class="num neg">${fmt(l.latente)}</td><td class="num neg">${l.pct!=null?(l.pct*100).toFixed(1)+'%':'—'}</td><td style="font-size:11px">${l.recompraReciente?'<span style="color:#dc2626">⚠ compra &lt;2m: no deducible ahora</span>':'<span class="muted">ok si no recompras 2m</span>'}</td></tr>`).join('');
  const candTable=cand.length?`<h3 style="font-size:14px;margin:6px 0 6px">Candidatos a afloramiento (minusvalías latentes)</h3><div style="overflow:auto"><table><thead><tr><th>Empresa</th><th>Compra</th><th class="num">Acc</th><th class="num">P.compra</th><th class="num">P.actual</th><th class="num">Minusvalía</th><th class="num">%</th><th>Regla 2 meses</th></tr></thead><tbody>${candRows}</tbody></table></div>`:'<div class="sub" style="margin:8px 0">No tienes lotes con pérdida latente ahora mismo.</div>';
  const rY=F.realY.slice().sort((a,b)=>(b.fechaV||'').localeCompare(a.fechaV||''));
  const realRows=rY.map(r=>`<tr><td><b data-ficha="${r.t}" style="cursor:pointer;color:var(--brand)">${r.t}</b></td><td>${r.fechaV||'—'}</td><td class="num">${(+r.acc).toFixed(0)}</td><td class="num">${fmt(r.precioC)} → ${fmt(r.precioV)}</td><td class="num ${r.gan>=0?'pos':'neg'}">${sg(r.gan)}</td><td style="font-size:11px">${(r.gan<0&&r.recompra)?'<span style="color:#dc2626">⚠ pérdida bloqueada (recompra &lt;2m)</span>':''}</td></tr>`).join('');
  const realTable=rY.length?`<h3 style="font-size:14px;margin:14px 0 6px">Realizado en ${F.nowY} (FIFO)</h3><div style="overflow:auto"><table><thead><tr><th>Empresa</th><th>Venta</th><th class="num">Acc</th><th class="num">Compra→Venta</th><th class="num">Ganancia</th><th>Aviso</th></tr></thead><tbody>${realRows}<tr style="font-weight:700;background:#eef2f7"><td colspan="4">Neto realizado ${F.nowY}</td><td class="num ${F.realGainY>=0?'pos':'neg'}">${sg(F.realGainY)}</td><td></td></tr></tbody></table></div>`:`<div class="sub" style="margin-top:12px">Sin ventas registradas en ${F.nowY}.</div>`;
  const _openBy={}; F.openLots.forEach(l=>{ _openBy[l.t]=(_openBy[l.t]||0)+l.acciones; });
  const _stks=Object.keys(_openBy).sort();
  const simHTML=`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:6px">🧮 Simulador de venta (FIFO)</div><div class="sub" style="margin-bottom:6px">Elige empresa y nº de acciones (o «Todas»): verás los lotes FIFO que se venden, la plusvalía/minusvalía realizada, el impuesto o el ahorro fiscal, y la regla de los 2 meses. En España el lote lo fija Hacienda (FIFO), no se elige.</div><div class="toolbar" style="gap:8px"><select id="fsimTk" class="anaInp"><option value="">— empresa —</option>${_stks.map(t=>`<option value="${t}">${t} (${Math.round(_openBy[t]*100)/100} acc.)</option>`).join('')}</select><input type="number" id="fsimQ" class="anaInp" placeholder="nº acciones" style="width:120px"><button class="btn sm" id="fsimAll" title="Rellenar con todas las acciones de la empresa elegida">Todas</button></div><div id="fsimOut" style="margin-top:8px"><div class="muted" style="font-size:12px">Elige una empresa de tu cartera.</div></div></div>`;
  el.innerHTML=`<div class="sub" style="margin-bottom:10px">Cálculo <b>orientativo</b> (no es asesoramiento fiscal) con criterio <b>FIFO</b> (el que aplica Hacienda a acciones). Latente = con la cotización actual; realizado = ganancias/pérdidas de tus ventas del año. Tramos del ahorro 2025: 19% / 21% / 23% / 27% / 28%.</div>${simHTML}${harvestBox}${candTable}${realTable}`;
  { const _st=document.getElementById('fsimTk'), _sq=document.getElementById('fsimQ'), _sa=document.getElementById('fsimAll');
    if(_st)_st.addEventListener('change',fiscalSimVenta);
    if(_sq)_sq.addEventListener('input',fiscalSimVenta);
    if(_sa)_sa.addEventListener('click',()=>{ const t=(_st&&_st.value||'').toUpperCase(); if(!t)return; let tot=0; F.openLots.forEach(l=>{ if(l.t===t)tot+=l.acciones; }); if(_sq){ _sq.value=Math.round(tot*10000)/10000; fiscalSimVenta(); } });
  }
}
/* Simulador de venta FIFO: plusvalía/minusvalía realizada, impuesto/ahorro y regla de los 2 meses. */
function fiscalSimVenta(){
  const out=document.getElementById('fsimOut'); if(!out)return;
  const t=((document.getElementById('fsimTk')||{}).value||'').toUpperCase();
  const q=num((document.getElementById('fsimQ')||{}).value);
  if(!t){ out.innerHTML='<div class="muted" style="font-size:12px">Elige una empresa de tu cartera.</div>'; return; }
  const F=fiscalidadData();
  const lots=F.openLots.filter(l=>l.t===t);
  const totalOpen=lots.reduce((s,l)=>s+l.acciones,0);
  const pa=(lots[0]&&lots[0].precioActual)||(typeof _precioActualDe==='function'?_precioActualDe(t):0)||0;
  if(!(q>0)){ out.innerHTML=`<div class="muted" style="font-size:12px">Tienes <b>${Math.round(totalOpen*10000)/10000}</b> acciones abiertas de ${t} (precio ${fmt(pa)}). Indica cuántas vender o pulsa «Todas».</div>`; return; }
  if(q>totalOpen+1e-6){ out.innerHTML=`<div class="neg" style="font-size:12px;font-weight:600">Solo tienes ${Math.round(totalOpen*10000)/10000} acciones abiertas de ${t}.</div>`; return; }
  let rem=q, gl=0; const used=[];
  for(let i=0;i<lots.length&&rem>1e-6;i++){ const take=Math.min(rem,lots[i].acciones); gl+=(pa-lots[i].precio)*take; used.push({fecha:lots[i].fecha,take,precio:lots[i].precio,sub:(pa-lots[i].precio)*take}); rem-=take; }
  const ingreso=q*pa; const base0=Math.max(0,F.realGainY); let impuesto=0, ahorro=0;
  if(gl>0){ impuesto=_impuestoAhorro(base0+gl)-_impuestoAhorro(base0); }
  else if(gl<0){ ahorro=_impuestoAhorro(base0)-_impuestoAhorro(Math.max(0,F.realGainY+gl)); }
  let reciente=false; if(gl<0){ const dosM=61*86400000, hoy=Date.now(); (DB.operaciones||[]).forEach(o=>{ if((o.ticker||'').toUpperCase()===t&&o.tipo!=='venta'&&o.fecha){ const d=Date.parse(o.fecha+'T00:00:00'); if(!isNaN(d)&&(hoy-d)>=0&&(hoy-d)<=dosM)reciente=true; } }); }
  const lotHTML=used.map(u=>`<tr><td>${u.fecha||'—'}</td><td class="num">${Math.round(u.take*10000)/10000}</td><td class="num">${fmt(u.precio)}</td><td class="num ${u.sub>=0?'pos':'neg'}">${u.sub>=0?'+':''}${fmt(u.sub)}</td></tr>`).join('');
  const glCol=gl>=0?'pos':'neg';
  const resumen=`<div class="cards" style="margin:8px 0"><div class="card"><div class="lbl">Ingreso venta</div><div class="val">${fmt(ingreso)}</div><div class="sub">${q} × ${fmt(pa)}</div></div><div class="card"><div class="lbl">${gl>=0?'Plusvalía':'Minusvalía'} realizada</div><div class="val ${glCol}">${gl>=0?'+':''}${fmt(gl)}</div></div>${gl>0?`<div class="card"><div class="lbl">Impuesto estimado</div><div class="val">${fmt(impuesto)}</div><div class="sub">marginal · ya realizado ${fmt(F.realGainY)}</div></div>`:''}${gl<0?`<div class="card"><div class="lbl">Ahorro fiscal potencial</div><div class="val pos">${fmt(ahorro)}</div><div class="sub">compensa ganancias del año</div></div>`:''}</div>`;
  const aviso2m=reciente?`<div class="card" style="background:#fee2e2;border:1px solid #fecaca;margin-bottom:8px"><div class="sub" style="color:#991b1b"><b>Regla de los 2 meses:</b> has comprado ${t} en los últimos 2 meses. Si vendes con pérdida, Hacienda NO permite deducirla este año (tampoco si recompras en los 2 meses siguientes).</div></div>`:'';
  out.innerHTML=aviso2m+resumen+`<div class="sub" style="margin-bottom:4px">Lotes que se venden (FIFO, del más antiguo al más nuevo):</div><div style="overflow:auto"><table style="width:100%"><thead><tr><th>Compra</th><th class="num">Acc.</th><th class="num">P.compra</th><th class="num">Resultado</th></tr></thead><tbody>${lotHTML}</tbody></table></div>`;
}
/* ===== Motor de rebalanceo por bandas =====
   Peso actual (valor de mercado) vs objetivo (Diversificación → _objCache). Banda ±pp configurable.
   Reparte una aportación SOLO comprando, proporcional al hueco de las infraponderadas fuera de banda. */
function renderRebalanceo(){
  const el=document.getElementById('rebalBody'); if(!el)return; const kp=document.getElementById('rebalKpis');
  if((!_objCache||!Object.keys(_objCache).length)&&typeof renderPlanLote==='function'){ try{ renderPlanLote(); }catch(e){} }
  const oc=_objCache||{}; const tickers=Object.keys(oc);
  if(!tickers.length){ el.innerHTML='<div class="empty">Primero define objetivos en <b>Diversificación</b> (asigna Tipo y objetivos a tus empresas).</div>'; if(kp)kp.innerHTML=''; return; }
  const nm=t=>((DB.valores||{})[t]||{}).nombre||t;
  const mv={}; (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001){ const t=(p.ticker||'').toUpperCase(); mv[t]=(mv[t]||0)+p.acciones*num(p.precioActual); } });
  let totMV=0; tickers.forEach(t=>{ totMV+=(mv[t]||0); });
  const sumObj=tickers.reduce((s,t)=>s+num(oc[t].obj),0);
  DB.config=DB.config||{};
  let band=num(DB.config.rebalBandPP); if(!(band>0))band=5;
  const aport=Math.max(0,num(DB.config.rebalAportacion)); const newTotal=totMV+aport;
  let rows=tickers.map(t=>{ const targetW=sumObj>0?num(oc[t].obj)/sumObj:0; const curV=mv[t]||0; const curW=totMV>0?curV/totMV:0; const driftPP=(curW-targetW)*100; const desired=targetW*newTotal; const gap=Math.max(0,desired-curV); let estado; if(driftPP<-band)estado='bajo'; else if(driftPP>band)estado='alto'; else estado='ok'; return {t,nombre:nm(t),targetW,curV,curW,driftPP,gap,estado,aportar:0}; });
  let elig=rows.filter(r=>r.estado==='bajo'&&r.gap>0); if(!elig.length)elig=rows.filter(r=>r.driftPP<0&&r.gap>0);
  const sumGap=elig.reduce((s,r)=>s+r.gap,0); let repartida=0;
  if(aport>0&&sumGap>0){ const eligSet=new Set(elig.map(r=>r.t)); rows.forEach(r=>{ if(eligSet.has(r.t)){ r.aportar=Math.round(aport*r.gap/sumGap); repartida+=r.aportar; } }); }
  rows.sort((a,b)=>{ const oa=a.estado==='ok'?1:0, ob=b.estado==='ok'?1:0; return oa-ob || Math.abs(b.driftPP)-Math.abs(a.driftPP); });
  const nFuera=rows.filter(r=>r.estado!=='ok').length; const pf=x=>x.toFixed(1)+'%';
  const estCell=r=> r.estado==='bajo'?'<span style="color:#16a34a;font-weight:700">▼ infra</span>':(r.estado==='alto'?'<span style="color:#dc2626;font-weight:700">▲ sobre</span>':'<span class="muted">en banda</span>');
  const body=rows.map(r=>`<tr${r.estado!=='ok'?` style="background:${r.estado==='bajo'?'#f0fdf4':'#fef2f2'}"`:''}><td><b data-ficha="${r.t}" style="cursor:pointer;color:var(--brand)">${r.t}</b> <span class="muted" style="font-size:10px">${(r.nombre||'').slice(0,18)}</span></td><td class="num">${fmt(r.curV)}</td><td class="num">${pf(r.curW*100)}</td><td class="num">${pf(r.targetW*100)}</td><td class="num ${r.driftPP<0?'pos':(r.driftPP>0?'neg':'')}">${r.driftPP>=0?'+':''}${r.driftPP.toFixed(1)} pp</td><td class="num">${estCell(r)}</td><td class="num" style="font-weight:700">${r.aportar>0?fmt(r.aportar):'·'}</td></tr>`).join('');
  const head='<tr><th>Empresa</th><th class="num">Valor</th><th class="num">% actual</th><th class="num">% objetivo</th><th class="num">Desvío</th><th class="num">Banda</th><th class="num">Aportar €</th></tr>';
  const toolbar=`<div class="toolbar" style="margin-bottom:10px;gap:10px"><label style="font-size:13px">Banda ± <input type="number" step="1" id="rebalBand" value="${band}" style="width:60px;padding:3px;border:1px solid var(--line);border-radius:6px;text-align:center"> pp</label><label style="font-size:13px">Aportación € <input type="number" step="100" id="rebalAport" value="${aport||''}" placeholder="0" style="width:110px;padding:3px;border:1px solid var(--line);border-radius:6px;text-align:right"></label></div>`;
  const nota='<div class="muted" style="font-size:11px;margin-top:8px">Peso objetivo = objetivo € de Diversificación normalizado a 100%. Fuera de banda si el desvío supera ±'+band+' pp. La aportación se reparte <b>solo comprando</b>, proporcional al hueco de las infraponderadas fuera de banda (si ninguna se sale, a las más infraponderadas). No vende ni ejecuta órdenes reales.</div>';
  el.innerHTML=toolbar+'<div style="overflow:auto"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'+nota;
  if(kp)kp.innerHTML=[['Valor cartera',fmt(totMV)],['Fuera de banda',nFuera+' / '+rows.length],['Aportación',fmt(aport)],['Repartida',fmt(repartida)]].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('');
  { const _b=document.getElementById('rebalBand'), _a=document.getElementById('rebalAport');
    if(_b)_b.addEventListener('change',()=>{ DB.config.rebalBandPP=Math.max(0,num(_b.value)); if(typeof scheduleSave==='function')scheduleSave(); renderRebalanceo(); });
    if(_a)_a.addEventListener('change',()=>{ DB.config.rebalAportacion=Math.max(0,num(_a.value)); if(typeof scheduleSave==='function')scheduleSave(); renderRebalanceo(); });
  }
}
// === Base de gasto/ingreso recurrente = presupuesto mensual del año en curso (evita distorsión de gastos puntuales) ===
function gastoMensualPresu(){ const nowY=new Date().getFullYear(); let g=0,has=false; (DB.presupuesto||[]).forEach(p=>{ const y=(typeof pAnio==='function')?pAnio(p):p.anio; if(y!==nowY)return; const c=(typeof catById==='function')?catById(p.categoriaId):null; if(c&&c.tipo==='gasto'){ g+=(typeof mensual==='function')?mensual(p):num(p.importe); has=true; } }); return has?g:null; }
function ingMensualPresu(){ const nowY=new Date().getFullYear(); let ing=0,has=false; (DB.presupuesto||[]).forEach(p=>{ const y=(typeof pAnio==='function')?pAnio(p):p.anio; if(y!==nowY)return; const c=(typeof catById==='function')?catById(p.categoriaId):null; if(c&&c.tipo==='ingreso'){ ing+=(typeof mensual==='function')?mensual(p):num(p.importe); has=true; } }); return has?ing:null; }
function gastoEsencialPresu(){ const nowY=new Date().getFullYear(); let g=0,anyEs=false; (DB.presupuesto||[]).forEach(p=>{ const y=(typeof pAnio==='function')?pAnio(p):p.anio; if(y!==nowY)return; const c=(typeof catById==='function')?catById(p.categoriaId):null; if(c&&c.tipo==='gasto'&&c.esencial){ g+=(typeof mensual==='function')?mensual(p):num(p.importe); anyEs=true; } }); return anyEs?g:null; }
// === Proyección de cierre de presupuesto (burn-rate lineal según el ritmo de gasto) ===
function proyeccionCierre(){ const nowY=new Date().getFullYear(); const startY=Date.UTC(nowY,0,1), endY=Date.UTC(nowY+1,0,1); const frac=Math.min(1,Math.max(0.02,(Date.now()-startY)/(endY-startY)));
  let realYTD=0,ingYTD=0; (DB.movimientos||[]).forEach(m=>{ if(!m.fecha||m.fecha.slice(0,4)!==String(nowY))return; if((m.tipo||'')==='gasto')realYTD+=num(m.importe); else if((m.tipo||'')==='ingreso')ingYTD+=num(m.importe); });
  const presAnual=(typeof gastoMensualPresu==='function')?((gastoMensualPresu()||0)*12):0;
  if(realYTD<=0||presAnual<=0)return null;
  const proy=realYTD/frac; const desv=proy-presAnual; const prorrat=presAnual*frac;
  return {realYTD,ingYTD,frac,proy,presAnual,desv,prorrat}; }
// === Estado de resultados de dividendos: cobrado real del año vs previsto + crecimiento (DGR) ===
function dividendosEstado(){ if(typeof simYearTotal!=='function')return null; const nowY=new Date().getFullYear();
  const prevAnual=num(simYearTotal(nowY)), prevYear=num(simYearTotal(nowY-1));
  const ops=(typeof _allOps==='function')?_allOps():(DB.operaciones||[]);
  const sharesAt=(t,ms)=>{ let sh=0; ops.forEach(o=>{ if((o.ticker||'').toUpperCase()===t&&o.fecha){ const om=Date.parse(o.fecha+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; };
  let cobradoYTD=0; const dvO=DB.dividendos||{}; Object.keys(dvO).forEach(t=>{ const T=(t||'').toUpperCase(); (dvO[t]||[]).forEach(d=>{ if(d.fecha&&d.fecha.slice(0,4)===String(nowY)){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))cobradoYTD+=sharesAt(T,dm)*num(d.importe); } }); });
  const dgr=(prevYear>0)?(prevAnual/prevYear-1):null; const pctCobrado=prevAnual>0?cobradoYTD/prevAnual:null;
  return {nowY,cobradoYTD,prevAnual,prevYear,dgr,pctCobrado}; }
// === Score de salud financiera: media de 4 pilares (ahorro, fondo emergencia, diversificación, alfa) ===
function saludFinanciera(){ const clamp=x=>Math.max(0,Math.min(100,x));
  const gp=(typeof gastoMensualPresu==='function')?gastoMensualPresu():null; const ip=(typeof ingMensualPresu==='function')?ingMensualPresu():null;
  const hoy=Date.now(), y1=hoy-365.25*86400000; let ingR=0,gasR=0; (DB.movimientos||[]).forEach(m=>{ if(m.fecha){ const ms=Date.parse(m.fecha+'T00:00:00'); if(ms>=y1&&ms<=hoy){ if((m.tipo||'')==='ingreso')ingR+=num(m.importe); else if((m.tipo||'')==='gasto')gasR+=num(m.importe); } } });
  const ingM=(ip!=null&&ip>0)?ip:(ingR/12), gasM=(gp!=null&&gp>0)?gp:(gasR/12);
  const tasa=ingM>0?(ingM-gasM)/ingM:null; const sAhorro=tasa==null?null:clamp(tasa/0.20*100);
  const FE=(typeof fondoEmergencia==='function')?fondoEmergencia():null; const meses=FE?FE.meses:null; const sFondo=meses==null?null:clamp(meses/6*100);
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001); let sDiv=null,topW=null,effN=null;
  if(pos.length){ const tot=pos.reduce((s,p)=>s+p.acciones*num(p.precioActual),0); if(tot>0){ const ws=pos.map(p=>p.acciones*num(p.precioActual)/tot); topW=Math.max(...ws); const hhi=ws.reduce((s,w)=>s+w*w,0); effN=hhi>0?1/hhi:0; const sEff=clamp((effN-2)/8*100); const sTop=clamp((0.40-topW)/0.30*100); sDiv=sEff*0.6+sTop*0.4; } }
  const CR=(typeof carteraRentabilidad==='function')?carteraRentabilidad():null; const alfa=CR?CR.alfa:null; const sRent=alfa==null?null:clamp(50+alfa/0.05*50);
  const pilares=[{k:'Ahorro',s:sAhorro,d:tasa!=null?(tasa*100).toFixed(0)+'% tasa':'sin datos'},{k:'Fondo emergencia',s:sFondo,d:meses!=null?meses.toFixed(1)+' meses':'sin datos'},{k:'Diversificación',s:sDiv,d:(effN!=null)?(effN.toFixed(1)+' efect. · top '+(topW*100).toFixed(0)+'%'):'sin datos'},{k:'Rentab. vs índice',s:sRent,d:alfa!=null?((alfa>=0?'+':'')+(alfa*100).toFixed(1)+'% alfa'):'sin datos'}];
  const valid=pilares.filter(p=>p.s!=null); const score=valid.length?valid.reduce((s,p)=>s+p.s,0)/valid.length:null;
  return {pilares,score}; }
// === Fondo de emergencia: meses de gastos cubiertos con el efectivo del Patrimonio (incluye R4) ===
function fondoEmergencia(){ const snaps=(typeof patSnaps==='function')?patSnaps():[]; const last=snaps[snaps.length-1]; let efectivo=0; if(last)(last.lineas||[]).forEach(l=>efectivo+=num(l.ef));
  const gp=(typeof gastoMensualPresu==='function')?gastoMensualPresu():null; let gastoMes, base;
  if(gp!=null&&gp>0){ gastoMes=gp; base='presupuesto'; }
  else { const hoy=Date.now(), y1=hoy-365.25*86400000; let g12=0; (DB.movimientos||[]).forEach(m=>{ if((m.tipo||'')==='gasto'&&m.fecha){ const ms=Date.parse(m.fecha+'T00:00:00'); if(!isNaN(ms)&&ms>=y1&&ms<=hoy)g12+=num(m.importe); } }); if(g12<=0){ const porY={}; (DB.movimientos||[]).forEach(m=>{ if((m.tipo||'')==='gasto'&&m.fecha){ const y=+m.fecha.slice(0,4); if(y)porY[y]=(porY[y]||0)+num(m.importe); } }); const ys=Object.keys(porY).map(Number).sort((a,b)=>b-a); if(ys.length)g12=porY[ys[0]]; } gastoMes=g12/12; base='real'; }
  const meses=gastoMes>0?efectivo/gastoMes:null;
  let estado='—'; if(meses!=null){ if(meses<3)estado='rojo'; else if(meses<6)estado='ambar'; else estado='verde'; }
  const gEs=(typeof gastoEsencialPresu==='function')?gastoEsencialPresu():null; const gastoEsencial=gEs; const mesesEsencial=(gEs!=null&&gEs>0)?efectivo/gEs:null;
  return {efectivo,gastoMes,meses,estado,base,gastoEsencial,mesesEsencial}; }
// === Saldo de caja disponible HOY (bróker): saldo inicial + movimientos con fecha ≤ hoy ===
function _saldoCajaHoy(){ const cfg=DB.cajaConfig||{}; if(cfg.saldoIni==null||cfg.saldoIni==='')return null; const hoy=new Date().toISOString().slice(0,10); let q=num(cfg.saldoIni); (typeof cajaMovs==='function'?cajaMovs():[]).forEach(mv=>{ if((mv.fecha||'')<=hoy)q+=num(mv.entra)-num(mv.sale); }); return q; }
// === Motor "próxima mejor compra": Score × infraponderación vs objetivo × banda de entrada, repartiendo la caja disponible ===
function proximaCompra(){ if(typeof cmpScore!=='function')return null;
  const held={}; try{ (invPositions()||[]).forEach(p=>{ if(p.acciones>0.0001)held[(p.ticker||'').toUpperCase()]=p; }); }catch(e){}
  if((!_objCache||!Object.keys(_objCache).length)&&typeof renderPlanLote==='function'){ try{ renderPlanLote(); }catch(e){} }
  const oc=_objCache||{};
  const marginBand=(cot,entMax,entMin)=>{ if(!(cot>0)||!(entMax>0))return {estado:'sin banda',dist:null,margen:50}; const d=(cot-entMax)/entMax;
    if(cot<=entMax){ const prof=entMin>0?(entMax-cot)/((entMax-entMin)||entMax):0; return {estado:'🟢 en banda',dist:d,margen:70+Math.max(0,Math.min(1,prof))*30}; }
    return {estado:(d>0.25?'🔴 ':'🟡 ')+'+'+(d*100).toFixed(0)+'%',dist:d,margen:Math.max(0,70-d/0.25*70)}; };
  const items=(DB.analisis||[]).map(a=>{ const t=(a.ticker||'').toUpperCase(); const cot=num(a.cotizacion),entMax=num(a.entMax),entMin=num(a.entMin),stop=num(a.stopTesis); const score=cmpScore(a); const dec=(a.decision||'').toUpperCase();
    const o=oc[t]||{}; const obj=num(o.obj),real=num(o.real); const gap=Math.max(0,obj-real); const gapPct=obj>0?gap/obj:0; const infraP=Math.max(0,Math.min(100,gapPct/0.5*100));
    const mb=marginBand(cot,entMax,entMin); const enBanda=(cot>0&&entMax>0&&cot<=entMax); const stopTocado=(stop>0&&cot>0&&cot<=stop);
    const prio=0.5*(score!=null?score:50)+0.3*infraP+0.2*mb.margen;
    return {t,cot,entMax,entMin,stop,score,dec,obj,real,gap,gapPct,infraP,estado:mb.estado,dist:mb.dist,margen:mb.margen,enBanda,stopTocado,prio,held:!!held[t]}; }).filter(x=>x.cot>0);
  const cand=items.filter(x=>x.enBanda&&!x.stopTocado&&x.dec!=='VENDER').sort((a,b)=>b.prio-a.prio);
  const cajaHoy=_saldoCajaHoy(); const capByCash=(cajaHoy!=null&&cajaHoy>0); let rem=capByCash?cajaHoy:Infinity; let recTotal=0;
  cand.forEach(x=>{ let rec=Math.min(x.gap,rem); if(!isFinite(rec))rec=x.gap; if(rec<0)rec=0; x.rec=Math.round(rec); x.acc=x.cot>0?Math.floor(x.rec/x.cot):0; if(capByCash){rem-=rec; if(rem<0)rem=0;} recTotal+=x.rec; });
  const near=items.filter(x=>!x.enBanda&&x.dist!=null&&x.dist>0&&!x.stopTocado&&x.dec!=='VENDER').sort((a,b)=>a.dist-b.dist);
  return {cajaHoy,capByCash,items,cand,near,recTotal}; }
// === Backtest del método: agrega las fotos de tesis (DB.tesisHist) y mide aciertos ===
function backtestData(){ const TH=DB.tesisHist||{}; const dec={COMPRAR:{n:0,ok:0,sum:0,nr:0,esc:0},MANTENER:{n:0,ok:0,sum:0,nr:0,esc:0},ESPERAR:{n:0,ok:0,sum:0,nr:0,esc:0},VENDER:{n:0,ok:0,sum:0,nr:0,esc:0}};
  const rows=[]; let total=0, okTotal=0, evalTotal=0;
  Object.keys(TH).forEach(t=>{ const T=(t||'').toUpperCase(); const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===T)||{}; let ahora=num(a.cotizacion); if(!(ahora>0))ahora=num(((DB.valores||{})[T]||{}).precioActual);
    (TH[t]||[]).forEach(sn=>{ const then=num(sn.cotizacion); const d=(sn.decision||'').toUpperCase(); const rent=(then>0&&ahora>0)?(ahora/then-1):null; total++;
      let ok=null, esc=false;
      if(rent!=null){ if(d==='COMPRAR'||d==='MANTENER')ok=rent>=0; else if(d==='VENDER')ok=rent<0; else if(d==='ESPERAR'){ esc=rent>0.05; ok=!esc; } }
      if(dec[d]){ dec[d].n++; if(rent!=null){ dec[d].nr++; dec[d].sum+=rent; if(ok)dec[d].ok++; if(esc)dec[d].esc++; } }
      if(rent!=null){ evalTotal++; if(ok)okTotal++; }
      rows.push({t:T,fecha:sn.fecha,decision:d,rating:sn.rating,score:sn.score,qScore:(sn.qScore!=null?num(sn.qScore):null),then,ahora,rent,ok,esc}); }); });
  return {dec,rows,total,okTotal,evalTotal}; }
async function regenerarFotosDossiers(){
  const st=$('#btStatus'); const say=m=>{ if(st)st.textContent=m; };
  try{
    if(typeof cargarDossiers==='function') await cargarDossiers();
    const lista=(typeof _tesisSet!=='undefined'&&_tesisSet)?[..._tesisSet]:[];
    if(!lista.length){ say('No se encontraron dossiers (.json) en el repo.'); return; }
    say('Cargando '+lista.length+' dossiers y precios…');
    await Promise.all(lista.map(t=>(typeof cargarTesis==='function')?Promise.resolve(cargarTesis(t)).catch(()=>{}):null));
    await Promise.all(lista.map(t=>{ if(typeof _precioCache!=='undefined'&&_precioCache[t]===undefined){ return fetch('precios/'+t+'.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{_precioCache[t]=j;}).catch(()=>{_precioCache[t]=null;}); } return null; }));
    DB.tesisHist=DB.tesisHist||{}; let nAdd=0,nUpd=0,nSkip=0,nSinP=0;
    lista.forEach(t=>{ t=(t||'').toUpperCase(); const j=(typeof _tesisCache!=='undefined')?_tesisCache[t]:null; if(!j||!j.fecha){ nSkip++; return; }
      const ms=Date.parse(j.fecha+'T00:00:00'); const px=(typeof priceRepoAt==='function')?num(priceRepoAt(t,ms)):0;
      const mn=num(j.poBear),mx=num(j.poBull); const md=(mn&&mx)?(mn+mx)/2:(mx||mn||0);
      const qS=(j.score!=null&&j.score!=='')?num(j.score):null;
      const oS=(typeof cmpScore==='function')?cmpScore({cotizacion:px,poMin:mn,poMax:mx,entMax:num(j.entMax),rating:(j.rating||'').toUpperCase()}):null;
      const arr=DB.tesisHist[t]=DB.tesisHist[t]||[]; const ix=arr.findIndex(x=>x.fecha===j.fecha);
      if(ix>=0){ const ex=arr[ix]; if(qS!=null)ex.qScore=qS; if((ex.score==null)&&oS!=null)ex.score=oS; if(!(num(ex.cotizacion)>0)&&px>0)ex.cotizacion=px; ex.origen=ex.origen||'dossier'; nUpd++; }
      else if(px>0){ arr.push({fecha:j.fecha,decision:(j.decision||'').toUpperCase(),rating:(j.rating||'').toUpperCase(),score:oS,qScore:qS,poBear:mn,poBase:md,poBull:mx,cotizacion:px,origen:'dossier'}); nAdd++; }
      else { nSinP++; }
      arr.sort((x,y)=>(x.fecha||'').localeCompare(y.fecha||'')); });
    if(typeof saveNow==='function')saveNow();
    renderBacktest();
    say('Listo: '+nAdd+' fotos nuevas · '+nUpd+' completadas con Calidad'+(nSinP?(' · '+nSinP+' sin precio histórico'):'')+(nSkip?(' · '+nSkip+' sin fecha'):'')+'.');
  }catch(e){ say('Error: '+((e&&e.message)||e)); }
}
function renderBacktest(){ const el=$('#btTabla'); if(!el)return; const kp=$('#btKpis'); const B=backtestData();
  const pct=(a,b)=>b>0?(a/b*100).toFixed(0)+'%':'—'; const rp=x=>x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1)+'%');
  if(!B.total){ el.innerHTML='<div class="empty">Aún no hay fotos de tesis. Guárdalas desde la Ficha de cada empresa («+ Guardar foto») o al importar/actualizar un dossier.</div>'; if(kp)kp.innerHTML=''; return; }
  const cAvg=B.dec.COMPRAR.nr?B.dec.COMPRAR.sum/B.dec.COMPRAR.nr:null;
  if(kp)kp.innerHTML=[['Fotos evaluables',B.evalTotal+' / '+B.total,''],['Acierto global',pct(B.okTotal,B.evalTotal),(B.evalTotal&&B.okTotal/B.evalTotal>=0.5)?'pos':'neg'],['Rentab. media COMPRAR',rp(cAvg),cAvg==null?'':(cAvg>=0?'pos':'neg')],['Escapadas (ESPERAR)',String(B.dec.ESPERAR.esc||0),(B.dec.ESPERAR.esc>0?'neg':'')]].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]||''}">${k[1]}</div></div>`).join('');
  const dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  const decRows=['COMPRAR','MANTENER','ESPERAR','VENDER'].map(d=>{ const o=B.dec[d]; if(!o||!o.n)return ''; const avg=o.nr?o.sum/o.nr:null; return `<tr><td><b style="color:${dc[d]}">${d}</b></td><td class="num">${o.n}</td><td class="num">${o.ok||0}</td><td class="num">${pct(o.ok||0,o.nr||0)}</td><td class="num ${avg!=null?(avg>=0?'pos':'neg'):''}">${rp(avg)}</td><td class="num">${d==='ESPERAR'?(o.esc||0):'·'}</td></tr>`; }).join('');
  const _acc=()=>({n:0,s:0}); const avgA=o=>o.n?rp(o.s/o.n):'—';
  const oHi=_acc(),oLo=_acc(),qHi=_acc(),qLo=_acc(); const MX={hh:_acc(),hl:_acc(),lh:_acc(),ll:_acc()};
  B.rows.forEach(r=>{ if(r.rent==null)return;
    if(r.score!=null){ const o=(r.score>=70?oHi:oLo); o.n++; o.s+=r.rent; }
    if(r.qScore!=null){ const o=(r.qScore>=70?qHi:qLo); o.n++; o.s+=r.rent; }
    if(r.score!=null&&r.qScore!=null){ const c=(r.qScore>=70?'h':'l')+(r.score>=70?'h':'l'); MX[c].n++; MX[c].s+=r.rent; } });
  const cM=(o,best)=>`<td class="num ${o.n?(o.s/o.n>=0?'pos':'neg'):''}" style="text-align:center;${best?'background:#ecfdf5':''}">${o.n?avgA(o):'—'}<div style="font-size:9px;color:#94a3b8;font-weight:400">${o.n} foto${o.n===1?'':'s'}</div></td>`;
  const scoreInsight=`<div class="sub" style="margin:12px 0 4px"><b>Discriminación de tus dos scores</b> (rentabilidad media desde la foto hasta hoy):</div>`
    +`<div class="sub" style="margin:0 0 2px">· <b>Calidad</b> (Bloque 5) — ≥70: <b>${avgA(qHi)}</b> (${qHi.n}) · &lt;70: <b>${avgA(qLo)}</b> (${qLo.n}). Si ≥70 rinde más, tu <b>calidad</b> discrimina.</div>`
    +`<div class="sub" style="margin:0 0 8px">· <b>Oportunidad</b> (Score del comparador) — ≥70: <b>${avgA(oHi)}</b> (${oHi.n}) · &lt;70: <b>${avgA(oLo)}</b> (${oLo.n}). Si ≥70 rinde más, tu <b>momento de entrada</b> discrimina.</div>`
    +`<div class="sub" style="margin:0 0 4px"><b>Matriz Calidad × Oportunidad</b> — rentabilidad media por cuadrante:</div>`
    +`<div style="overflow:auto"><table style="font-size:12px"><thead><tr><th></th><th class="num" style="text-align:center">Oportunidad ≥70</th><th class="num" style="text-align:center">Oportunidad &lt;70</th></tr></thead><tbody>`
    +`<tr><td><b>Calidad ≥70</b></td>${cM(MX.hh,true)}${cM(MX.hl)}</tr>`
    +`<tr><td><b>Calidad &lt;70</b></td>${cM(MX.lh)}${cM(MX.ll)}</tr>`
    +`</tbody></table></div>`
    +`<div class="muted" style="font-size:11px;margin-top:4px">El cuadrante ideal (verde) es <b>Calidad ≥70 + Oportunidad ≥70</b>: buenas empresas compradas cuando además estaban baratas. Si ese rinde más que los demás, tu método completo funciona.</div>`;
  const det=B.rows.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(r=>{ let mk='—',mc='#64748b'; const d=r.decision; if(r.rent!=null){ if(d==='COMPRAR'||d==='MANTENER'){mk=r.rent>=0?'✓':'✗';mc=r.rent>=0?'#16a34a':'#dc2626';} else if(d==='VENDER'){mk=r.rent<0?'✓':'✗';mc=r.rent<0?'#16a34a':'#dc2626';} else if(d==='ESPERAR'){ if(r.esc){mk='se escapó';mc='#d97706';} else {mk=r.rent<0?'✓':'≈';mc=r.rent<0?'#16a34a':'#64748b';} } }
    return `<tr><td>${r.fecha||'—'}</td><td><b data-ficha="${r.t}" style="cursor:pointer;color:var(--brand)">${r.t}</b></td><td><b style="color:${dc[d]||'#475569'}">${d||'—'}</b></td><td class="num">${r.rating||'—'}${r.qScore!=null?' · Cal '+Math.round(r.qScore):''}${r.score!=null?' · Op '+Math.round(r.score):''}</td><td class="num">${r.then?fmt(r.then):'—'}</td><td class="num">${r.ahora?fmt(r.ahora):'—'}</td><td class="num ${r.rent!=null?(r.rent>=0?'pos':'neg'):''}">${rp(r.rent)}</td><td style="color:${mc};font-weight:700;text-align:center">${mk}</td></tr>`; }).join('');
  const ayudaBox = `<details open style="margin-top:16px;border:1px solid var(--line);border-radius:10px;background:#f8fafc">`
    +`<summary style="cursor:pointer;padding:9px 12px;font-size:13px;font-weight:800;color:#1f3d6b">❓ Cómo leer esta pantalla — ¿funciona mi método?</summary>`
    +`<div style="padding:2px 14px 12px;font-size:12.5px;color:#334155;line-height:1.5">`
    +`<p style="margin:6px 0"><b>La idea.</b> Tu método valora cada empresa por dos ejes: <b>Calidad</b> (¿es buena empresa?) y <b>Oportunidad</b> (¿está barata / es buen momento?). Este backtest mira qué ha hecho el precio <b>desde cada foto hasta hoy</b>. Si tu nota acierta, las notas altas deberían haber rentado más.</p>`
    +`<p style="margin:6px 0"><b>Las dos líneas de discriminación.</b> Comparan notas altas (≥70) vs bajas (&lt;70). Si el grupo <b>≥70 renta más</b> que el &lt;70, esa nota separa bien lo bueno de lo regular. Si rentan parecido o al revés, esa nota <b>no discrimina</b> en esta ventana (puede faltar tiempo o muestra).</p>`
    +`<p style="margin:6px 0"><b>La matriz 2×2 (lo importante).</b> Cruza Calidad × Oportunidad. Lo ideal es un <b>degradado</b>: el cuadrante verde (<b>Calidad alta + Oportunidad alta</b> = buena empresa comprada barata) debería ser el que <b>más renta</b>; el opuesto, el que menos. Lectura extra: si varían mucho las <b>filas</b> (Calidad) pero no las columnas, manda la Calidad; si al revés, manda la Oportunidad. Te dice <b>qué pata pesa</b>.</p>`
    +`<p style="margin:6px 0"><b>La tabla de decisiones.</b> Comprueba tus <b>llamadas</b>: de tus COMPRAR, ¿cuántos subieron? De tus ESPERAR, ¿cuántos evitaste que se dispararan?</p>`
    +`<p style="margin:6px 0;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:7px 10px"><b>Cómo NO engañarte.</b> Con pocas fotos y poco tiempo esto es una <b>tendencia, no una prueba</b>: un mes de precio es casi ruido y la calidad se nota a años, no en semanas. Además tus empresas ya están preseleccionadas (calidad parecida), así que cuesta que la Calidad separe. Es un <b>filtro / alerta temprana</b>: no cambies el método por pocas fotos. Su valor crece con el tiempo.</p>`
    +`<p style="margin:6px 0"><b>En una frase:</b> la matriz te dice si, cuando das nota alta (buena <i>y</i> barata), el mercado te da la razón.</p>`
    +`</div></details>`;
  el.innerHTML=`<div style="overflow:auto"><table><thead><tr><th>Decisión</th><th class="num">Fotos</th><th class="num">Aciertos</th><th class="num">% acierto</th><th class="num">Rentab. media</th><th class="num">Escapadas</th></tr></thead><tbody>${decRows}</tbody></table></div>${scoreInsight}<h3 style="margin:14px 0 6px;font-size:14px">Detalle de fotos</h3><div class="sub" style="margin-bottom:6px">Rentabilidad desde la fecha de cada foto hasta la cotización actual. ✓ acierto · ✗ fallo · «se escapó» = un ESPERAR que subió >5% · ≈ ESPERAR plano.</div><div style="overflow:auto"><table><thead><tr><th>Fecha</th><th>Empresa</th><th>Decisión</th><th class="num">Rating·Cal·Op</th><th class="num">Cotiz. foto</th><th class="num">Ahora</th><th class="num">Rentab.</th><th>OK</th></tr></thead><tbody>${det}</tbody></table></div>${ayudaBox}`;
}
// === Vista completa del motor "Próxima compra" ===
let proxYearSel=null;
function renderProxCompra(){ const el=$('#proxTabla'); if(!el)return; const nowY=new Date().getFullYear();
  if(proxYearSel==null)proxYearSel=nowY; const yIn=$('#proxYear'); if(yIn&&(yIn.value===''||yIn.value==null))yIn.value=proxYearSel;
  const M=(typeof proximaCompra==='function')?proximaCompra():null; const kp=$('#proxKpis');
  if(!M){ el.innerHTML='<div class="empty">Sin datos de análisis. Rellena cotización, banda de entrada y rating en Análisis.</div>'; if(kp)kp.innerHTML=''; return; }
  const _pi=(typeof _planYearInfo==='function')?_planYearInfo(proxYearSel):{budget:0,planned:0,remaining:0};
  const sCol=s=>s==null?'#64748b':(s>=70?'#16a34a':s>=50?'#d97706':'#dc2626');
  const dcol={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  let n=0; const cand=M.cand.map(x=>{x.__n=++n;return x;}); const near=M.near.map(x=>{x.__n=++n;return x;});
  const best=cand[0];
  if(kp){ const hero=best?`<div class="k hero"><div class="l">🏆 Mejor compra ahora</div><div class="v">${best.t}</div><div class="p">${best.rec>0?fmt(best.rec):'—'}${best.acc?' · '+best.acc+' acc.':''} · Score ${best.score!=null?best.score.toFixed(0):'—'}</div></div>`:'';
    kp.innerHTML=hero+[['Caja disponible',M.cajaHoy!=null?fmt(M.cajaHoy):'sin configurar',''],['En zona de compra',String(M.cand.length),M.cand.length?'pos':''],['A repartir (según caja)',fmt(M.recTotal),''],['Presupuesto Plan '+proxYearSel,_pi.budget?fmt(_pi.budget):'—',''],['Libre en presupuesto',_pi.budget?fmt(_pi.remaining):'—',_pi.budget?(_pi.remaining<0?'neg':'pos'):'']].map(k=>`<div class="k"><div class="l">${k[0]}</div><div class="v ${k[2]||''}">${k[1]}</div></div>`).join(''); }
  if(!cand.length&&!near.length){ el.innerHTML='<div class="empty">Ninguna empresa en zona de compra ni cerca. Rellena cotización y banda de entrada en Análisis.</div>'; return; }
  const estCls=x=>x.enBanda?'g':((x.dist!=null&&x.dist>0.25)?'r':'a');
  window._proxNearOpen=window._proxNearOpen||false;
  /* ---- ESCRITORIO ---- */
  const rowT=(x,i,tipo)=>{ const btns=(tipo==='cand')?`<button class="btn ghost sm" data-proxplan="${x.t}" title="Añadir al Plan del año ${proxYearSel}">→ Plan</button> <button class="btn ghost sm" data-proxcaja="${x.t}" title="Registrar salida en la Caja bróker">→ Caja</button>`:'';
    const rec=(tipo==='cand')?(x.rec>0?fmt(x.rec):(x.gap>0?fmt(x.gap):'·')):'·';
    return `<tr${(tipo==='cand'&&i===0)?' class="best"':''}><td class="num">${x.__n}</td><td><b class="tk" data-ficha="${x.t}" style="cursor:pointer">${x.t}</b>${x.held?' <span class="hc">en cartera</span>':''}</td><td class="num"><b style="color:${sCol(x.score)}">${x.score!=null?x.score.toFixed(0):'—'}</b></td><td>${x.dec?`<span class="dec" style="background:${dcol[x.dec]}">${x.dec}</span>`:'—'}</td><td><span class="pill ${estCls(x)}">${x.estado}</span></td><td class="num">${fmt(x.cot)}</td><td class="num">${x.obj?fmt(x.obj):'·'}</td><td class="num">${x.real?fmt(x.real):'·'}</td><td class="num">${x.gap>0?fmt(x.gap):'·'}</td><td class="num">${x.infraP.toFixed(0)}</td><td class="num" style="font-weight:800">${rec}</td><td class="num">${(tipo==='cand'&&x.acc)?x.acc:'·'}</td><td style="white-space:nowrap">${btns}</td></tr>`; };
  const head='<tr><th class="num">#</th><th>Empresa</th><th class="num">Score</th><th>Decisión</th><th>Estado</th><th class="num">Cotiz.</th><th class="num">Objetivo</th><th class="num">Invertido</th><th class="num">Hueco</th><th class="num">Infra</th><th class="num">Recom. €</th><th class="num">Acc.</th><th>Acción</th></tr>';
  const infoSub='<div class="sub" style="margin-bottom:8px">Prioridad = 0,5·Score + 0,3·infraponderación vs objetivo + 0,2·margen de entrada. La columna <b>Recom. €</b> reparte tu caja disponible tapando primero el hueco de la mejor candidata. «→ Plan» lo añade al Plan de compras del año elegido; «→ Caja» registra la salida en la Caja bróker.</div>';
  const deskCand=cand.length?`<div class="secttl">🟢 En zona de compra <span>(${cand.length})</span></div><div class="ptable"><table><thead>${head}</thead><tbody>${cand.map((x,i)=>rowT(x,i,'cand')).join('')}</tbody></table></div>`:'<div class="empty">Ninguna empresa en zona de compra ahora mismo.</div>';
  const deskNear=near.length?`<div class="blk${window._proxNearOpen?' open':''}" data-proxnear><div class="blk-h"><span class="arw">▶</span><span class="blk-t">🟡 Cerca de entrada</span><span class="blk-c">${near.length}</span></div><div class="blk-b"><div class="ptable"><table><thead>${head}</thead><tbody>${near.map((x,i)=>rowT(x,i,'near')).join('')}</tbody></table></div></div></div>`:'';
  const deskHTML=`<div class="desk">${infoSub}${deskCand}${deskNear}</div>`;
  /* ---- MÓVIL ---- */
  const mcard=(x,tipo,i)=>`<div class="pcard${tipo==='cand'&&i===0?' best':''}"><div class="pcard-h"><div class="rk">#${x.__n}</div><div class="tk" data-ficha="${x.t}" style="cursor:pointer">${x.t}${x.held?' <span class="hc">en cartera</span>':''}<div class="est"><span class="pill ${estCls(x)}">${x.estado}</span> ${x.dec?`<span class="dec" style="background:${dcol[x.dec]}">${x.dec}</span>`:''}</div></div><div class="sc" style="color:${sCol(x.score)}">${x.score!=null?x.score.toFixed(0):'—'}<span>score</span></div></div>
    <div class="pgrid">
      <div class="m"><span>Cotización</span><b>${fmt(x.cot)}</b></div>
      <div class="m"><span>Objetivo cartera</span><b>${x.obj?fmt(x.obj):'·'}</b></div>
      <div class="m"><span>Invertido</span><b>${x.real?fmt(x.real):'·'}</b></div>
      <div class="m"><span>Hueco</span><b>${x.gap>0?fmt(x.gap):'·'}</b></div>
      <div class="m"><span>Infraponderación</span><b>${x.infraP.toFixed(0)}</b></div>
      ${tipo==='cand'?`<div class="m hi"><span>Recomendado</span><b>${x.rec>0?fmt(x.rec):'·'}${x.acc?' · '+x.acc+' acc':''}</b></div>`:''}
    </div>
    ${tipo==='cand'?`<div class="pacts"><button class="btn ghost sm" data-proxplan="${x.t}">→ Plan</button> <button class="btn ghost sm" data-proxcaja="${x.t}">→ Caja</button></div>`:''}</div>`;
  const mobCand=cand.length?`<div class="secttl">🟢 En zona de compra <span>(${cand.length})</span></div>${cand.map((x,i)=>mcard(x,'cand',i)).join('')}`:'<div class="empty">Ninguna empresa en zona de compra ahora mismo.</div>';
  const mobNear=near.length?`<div class="blk${window._proxNearOpen?' open':''}" data-proxnear><div class="blk-h"><span class="arw">▶</span><span class="blk-t">🟡 Cerca de entrada</span><span class="blk-c">${near.length}</span></div><div class="blk-b">${near.map((x,i)=>mcard(x,'near',i)).join('')}</div></div>`:'';
  const mobHTML=`<div class="pcards">${infoSub}${mobCand}${mobNear}</div>`;
  el.innerHTML=deskHTML+mobHTML;
  if(!el._proxBound){ el._proxBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],[data-proxplan],[data-proxcaja],a,button'))return; const h=e.target.closest('.blk-h'); if(h){ window._proxNearOpen=!window._proxNearOpen; el.querySelectorAll('.blk[data-proxnear]').forEach(function(b){ b.classList.toggle('open',window._proxNearOpen); }); } }); }
}
function proxAddPlan(t,all){ if(typeof proximaCompra!=='function')return 0; const M=proximaCompra(); if(!M)return 0; const yr=proxYearSel||new Date().getFullYear(); DB.planCompras=DB.planCompras||{};
  const list=all?M.cand:M.cand.filter(x=>x.t===(t||'').toUpperCase()); let added=0;
  list.forEach(x=>{ const amt=Math.round(x.rec>0?x.rec:x.gap); if(amt>0){ DB.planCompras[x.t]=DB.planCompras[x.t]||{}; DB.planCompras[x.t][yr]=num((DB.planCompras[x.t]||{})[yr]||0)+amt; added+=amt; } });
  if(added>0){ if(typeof saveNow==='function')saveNow(); if(typeof renderAll==='function')renderAll(); }
  return added; }
function proxAddCaja(t){ if(typeof proximaCompra!=='function')return 0; const M=proximaCompra(); if(!M)return 0; const x=M.cand.find(y=>y.t===(t||'').toUpperCase()); if(!x)return 0; const amt=Math.round(x.rec>0?x.rec:x.gap); if(amt<=0)return 0;
  DB.cajaMov=DB.cajaMov||[]; DB.cajaMov.push({id:'c'+Math.random().toString(36).slice(2,9),fecha:new Date().toISOString().slice(0,10),concepto:'Compra '+(x.acc?x.acc+' ':'')+x.t,entra:0,sale:amt});
  if(typeof saveNow==='function')saveNow(); if(typeof renderAll==='function')renderAll(); return amt; }
// === Presupuesto del Plan por año + reasignación ===
function _planYearInfo(yr){ const b=num((DB.planPresupuesto||{})[yr]||0); let planned=0; const pc=DB.planCompras||{}; Object.keys(pc).forEach(t=>{ planned+=num((pc[t]||{})[yr]||0); }); return {budget:b,planned,remaining:b-planned}; }
function proxAmount(t){ if(typeof proximaCompra!=='function')return 0; const M=proximaCompra(); if(!M)return 0; const x=M.cand.find(y=>y.t===(t||'').toUpperCase()); if(!x)return 0; return Math.round(x.rec>0?x.rec:x.gap); }
function planDonorsYear(yr,exclude){ const pc=DB.planCompras||{}; const ex=(exclude||'').toUpperCase(); return Object.keys(pc).map(t=>({t:t.toUpperCase(),amt:num((pc[t]||{})[yr]||0)})).filter(x=>x.amt>0&&x.t!==ex).sort((a,b)=>b.amt-a.amt); }
function proxApplyPlan(t,amt,yr,donor,donorAmt){ t=(t||'').toUpperCase(); amt=Math.round(num(amt)); if(amt<=0)return 0; DB.planCompras=DB.planCompras||{};
  if(donor&&donorAmt>0){ donor=donor.toUpperCase(); DB.planCompras[donor]=DB.planCompras[donor]||{}; const cur=num((DB.planCompras[donor]||{})[yr]||0); const ded=Math.min(Math.round(donorAmt),cur); DB.planCompras[donor][yr]=cur-ded; if(DB.planCompras[donor][yr]<=0)delete DB.planCompras[donor][yr]; }
  DB.planCompras[t]=DB.planCompras[t]||{}; DB.planCompras[t][yr]=num((DB.planCompras[t]||{})[yr]||0)+amt;
  if(typeof saveNow==='function')saveNow(); if(typeof renderAll==='function')renderAll(); return amt; }
function _pnlSecciones(SEC){
  var META=[['hogar','Hogar'],['cartera','Patrimonio y cartera'],['dividendos','Dividendos'],['accion','Acción'],['mas','Más']];
  var st=window._panelSecOpen=window._panelSecOpen||{hogar:0,cartera:0,dividendos:0,accion:0,mas:0};
  var present=META.filter(function(m){return (SEC[m[0]]||'').trim();});
  if(!present.length) return '';
  var anyOpen=present.some(function(m){return st[m[0]];});
  var idx='<div class="psec-bar"><div class="psec-idx">'+present.map(function(m){return '<a data-psjump="'+m[0]+'">'+m[1]+'</a>';}).join('')
    +'</div><button class="psec-all" data-psall="'+(anyOpen?0:1)+'">'+(anyOpen?'\u229F Contraer todo':'\u229E Expandir todo')+'</button></div>';
  var secs=present.map(function(m){ var open=st[m[0]];
    return '<div class="psec'+(open?' open':'')+'" data-pssec="'+m[0]+'"><div class="psec-h" data-psfold="'+m[0]+'"><span class="psec-arw">\u25B6</span><span class="psec-t">'+m[1]+'</span></div><div class="psec-b">'+SEC[m[0]]+'</div></div>';
  }).join('');
  return '<div class="psec-wrap">'+idx+secs+'</div>';
}
function renderPanelDash(){
  const el=$('#panelDash'); if(!el)return; const nowY=new Date().getFullYear(); let html=''; var SEC={hogar:'',cartera:'',dividendos:'',accion:'',mas:''};
  /* El bloque "Próximos eventos" usa el motor derivado (calAgenda→evoAnioM). Si dividendos.json
     aún no está cargado, cárgalo una vez y re-renderiza para pintar las fechas reales. */
  if(typeof _evoCargar==='function' && typeof _evoData!=='undefined' && !_evoData){ try{ _evoCargar().then(function(){ if(typeof renderPanelDash==='function') renderPanelDash(); }); }catch(e){} }
  const GITHUB_RUN_URL='https://github.com/chernanzfinanzas-gif/economia-domestica/actions/workflows/cotizaciones.yml';
  // 🔔 BANDEJA DE AVISOS UNIFICADA
  const _heldP={}, _heldSet=new Set();
  try{ (invPositions()||[]).forEach(p=>{ if(p.acciones>0.0001){ const _t=(p.ticker||'').toUpperCase(); _heldP[_t]=p; _heldSet.add(_t); } }); }catch(e){}
  const avisos=[];
  (DB.analisis||[]).forEach(a=>{ const c=num(a.cotizacion),st=num(a.stopTesis); if(c&&st&&c<=st){ const t=(a.ticker||'').toUpperCase(); const p=_heldP[t]; avisos.push({pri:0,cls:'r',goto:'analisis',sig:'S1',tick:t,txt:`🚨 <b>${t}</b> — stop de tesis tocado (${fmt(c)} ≤ ${fmt(st)})${p?` · tienes ${p.acciones} acc., <b>ORDEN DE SALIDA</b>`:' · en vigilancia'}`}); } });
  (DB.analisis||[]).forEach(a=>{ const c=num(a.cotizacion),eH=num(a.entMax),st=num(a.stopTesis); const dec=(a.decision||'').toUpperCase(); if(c>0&&eH>0&&c<=eH&&!(st&&c<=st)){ const t=(a.ticker||'').toUpperCase(); const decTag=dec?` · ${dec.toLowerCase()}`:''; avisos.push({pri:dec==='COMPRAR'?1:2,cls:'a',goto:'analisis',txt:`🟢 <b>${t}</b> — en zona de compra (${fmt(c)} ≤ entrada ${fmt(eH)})${decTag}${_heldP[t]?' · ya en cartera':''}`}); } });
  // 🎯 PO alcanzado (señal de revisión/venta): cotización ≥ PO máximo (bull); aviso suave si ≥ PO base
  (DB.analisis||[]).forEach(a=>{ const c=num(a.cotizacion),pMin=num(a.poMin),pMax=num(a.poMax); const pMed=(pMin&&pMax)?(pMin+pMax)/2:(pMax||pMin||0); if(c<=0)return; const t=(a.ticker||'').toUpperCase(); const p=_heldP[t];
    if(pMax>0&&c>=pMax){ avisos.push({pri:1,cls:'a',goto:'analisis',sig:'S3',tick:t,txt:`🎯 <b>${t}</b> — ha alcanzado tu precio objetivo máximo (${fmt(c)} ≥ PO ${fmt(pMax)})${p?` · tienes ${p.acciones} acc., ¿recoger beneficios?`:' · sobrevalorada, no comprar'}`}); }
    else if(pMed>0&&c>=pMed){ avisos.push({pri:3,cls:'a',goto:'analisis',sig:'S3',tick:t,txt:`🎯 <b>${t}</b> — en tu PO base (${fmt(c)} ≥ ${fmt(pMed)}), revisa la tesis${p?' · en cartera':''}`}); } });
  (DB.analisis||[]).forEach(a=>{ const t=(a.ticker||'').toUpperCase(); const mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null; if(mm!=null&&mm>12) avisos.push({pri:2,cls:'a',goto:'monitor',sig:'S4',tick:t,txt:`📅 <b>${t}</b> — dossier de hace ${mm} meses, reanalizar`}); });
  ((typeof renovList==='function')?renovList(30):[]).forEach(r=>{ const f=r.fecha; const fs=String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0'); avisos.push({pri:r.dias<=7?1:3,cls:r.dias<=7?'r':'a',goto:'presupuesto',txt:`🔁 ${fs} ${r.nombre} <span class="muted">${fmt(r.importe)}</span> — ${r.dias<0?'vencida':('en '+r.dias+' d')}`}); });
  /* Aviso "informe publicado sin revisar": AHORA lo genera cadAvisos() (más abajo) desde la
     cadencia de los -trim.json (DB.cadencia.tocaMonitor), no desde el calendario manual/qPassed.
     Así se elimina el falso "Qx publicado" de IBE/NTGY. */
  try{ const _totC=Object.values(_heldP).reduce((q,p)=>q+p.acciones*num(p.precioActual),0); if(_totC>0){ const _bs={}; Object.values(_heldP).forEach(p=>{ const _sc=(typeof SECTOR!=='undefined'&&SECTOR[(p.ticker||'').toUpperCase()])||'Sin sector'; _bs[_sc]=(_bs[_sc]||0)+p.acciones*num(p.precioActual); }); Object.keys(_bs).forEach(sc=>{ const pct=_bs[sc]/_totC; if(pct>=0.35) avisos.push({pri:pct>=0.5?1:3,cls:pct>=0.5?'r':'a',goto:'graficas',txt:`📦 Sector <b>${sc}</b> = ${(pct*100).toFixed(0)}% de la cartera — sobreconcentración`}); }); } }catch(e){}
  try{ const _ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); const _x=new Date(); do{ _x.setDate(_x.getDate()-1); }while(_x.getDay()===0||_x.getDay()===6); const _prev=_ymd(_x); const _uf=window._cotizUltFecha||''; if(_uf&&_uf<_prev){ avisos.push({pri:1,cls:'a',goto:'panel',txt:`💹 <b>Cotizaciones desactualizadas</b> (última: ${(typeof ddmmyyyy==='function'?ddmmyyyy(_uf):_uf)}). Ejecuta el acceso directo «Actualizar cotizaciones» del escritorio, o <a href="${GITHUB_RUN_URL}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#9a3412;text-decoration:underline;font-weight:700">lánzalo en GitHub</a>.`}); } }catch(e){}
  try{ if(typeof fondoEmergencia==='function'){ const FE=fondoEmergencia(); if(FE.meses!=null&&FE.gastoMes>0&&FE.meses<3) avisos.push({pri:1,cls:'r',goto:'patrimonio',txt:`🛟 <b>Fondo de emergencia bajo</b>: solo ${FE.meses.toFixed(1)} meses de gastos cubiertos (recomendado 3–6). Efectivo ${fmt(FE.efectivo)} · gasto/mes ${fmt(FE.gastoMes)}.`}); } }catch(e){}
  try{ const _tA=(DB.asignacion||[]).reduce((s,c)=>s+num(c.actual),0); if(_tA>0)(DB.asignacion||[]).forEach(c=>{ const obj=num(c.objetivo); if(obj>0){ const actPct=num(c.actual)/_tA*100; const d=actPct-obj; if(Math.abs(d)>5){ const objEur=_tA*obj/100; const aMover=objEur-num(c.actual); avisos.push({pri:3,cls:'a',goto:'asignacion',txt:`⚖️ <b>${c.nombre}</b> desviada ${d>=0?'+':''}${d.toFixed(0)} pp del objetivo — ${aMover>=0?'aportar':'reducir'} ${fmt(Math.abs(aMover))}`}); } } }); }catch(e){}
  try{ if(typeof protoAvisos==='function') protoAvisos().forEach(x=>avisos.push(x)); }catch(e){}
  try{ if(typeof calibAvisos==='function') calibAvisos().forEach(x=>avisos.push(x)); }catch(e){}
  try{ if(typeof cadAvisos==='function') cadAvisos().forEach(x=>avisos.push(x)); }catch(e){}
  try{ if(typeof dividendoAlertas==='function') dividendoAlertas().forEach(x=>avisos.push(x)); }catch(e){}
  /* carga fundamentales.json en segundo plano una vez, para enriquecer la alerta de dividendo (payout/BPA) */
  try{ if(typeof _radFundCache!=='undefined' && _radFundCache===null && typeof _radCargarFund==='function'){ _radCargarFund().then(function(){ if(typeof renderPanelDash==='function')renderPanelDash(); }); } }catch(e){}
  /* Silenciar avisos de señal cuya revisión ya está registrada en la ficha.
     - Apunte ABIERTO → silencia siempre (el registro ya avisa como abierto/vencido).
     - Señales de precio (S1/S3) resueltas → silencio de 60 días desde el último apunte; si la
       condición persiste pasado ese plazo, el aviso vuelve a sonar para forzar re-revisión.
     - Resto de señales resueltas → silencio permanente hasta que cambie la condición.
     El apunte del registro (esApunte) nunca se silencia aquí. */
  try{ const _PRECIO=(typeof PROTO_SIG_PRECIO!=='undefined')?PROTO_SIG_PRECIO:{S1:1,S3:1}, _DIAS_SIL=(typeof PROTO_SILENCIO_DIAS!=='undefined')?PROTO_SILENCIO_DIAS:60, _hoyMs=Date.now();
    const _silenciada=(t,sig)=>{ const arr=((DB.protocolo||{})[t]||[]).filter(a=>a.sig===sig); if(!arr.length)return false;
      if(arr.some(a=>a.estado==='abierta'))return true;
      if(!_PRECIO[sig])return true;
      const ult=arr.map(a=>a.fecha).filter(Boolean).sort().slice(-1)[0]; if(!ult)return true;
      return (_hoyMs-new Date(ult+'T00:00:00').getTime())/86400000 <= _DIAS_SIL; };
    for(let i=avisos.length-1;i>=0;i--){ const x=avisos[i]; if(x.sig&&x.tick&&!x.esApunte&&_silenciada(x.tick,x.sig)) avisos.splice(i,1); } }catch(e){}
  if(avisos.length){ avisos.sort((a,b)=>a.pri-b.pri);
    /* Centro de alertas: tipo (por destino), clave estable para «visto», filtros y agrupación */
    const _GT={analisis:'precio',monitor:'tesis',dividendos:'dividendo',graficas:'cartera',asignacion:'cartera',presupuesto:'hogar',patrimonio:'hogar',caja:'hogar',panel:'datos',cobertura:'tesis'};
    const _TN={precio:'💹 Precio',tesis:'📋 Tesis',dividendo:'✂️ Dividendo',cartera:'📦 Cartera',hogar:'🏠 Hogar',datos:'🔄 Datos',otros:'• Otros'};
    const _hash=s=>{ let h=0; s=(s||''); for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return (h>>>0).toString(36); };
    avisos.forEach(x=>{ x.tipo=x.tipo||_GT[x.goto]||'otros'; x.key=(x.tick||'')+'|'+(x.sig||'')+'|'+_hash(x.txt); });
    DB.avisosVistos=DB.avisosVistos||{}; const _vis=DB.avisosVistos;
    const F=window._avFiltro=window._avFiltro||{tipo:'',showSeen:false};
    const _nVistos=avisos.filter(x=>_vis[x.key]).length;
    let show=avisos.filter(x=> F.showSeen || !_vis[x.key]);
    if(F.tipo) show=show.filter(x=>x.tipo===F.tipo);
    const hayCrit=show.some(x=>x.cls==='r'&&!_vis[x.key]);
    const tiposPres=[...new Set(avisos.map(x=>x.tipo))];
    const _cont={}; avisos.forEach(x=>{ if(F.showSeen||!_vis[x.key]) _cont[x.tipo]=(_cont[x.tipo]||0)+1; });
    const chips='<div style="margin:2px 0 8px;display:flex;flex-wrap:wrap;gap:5px;align-items:center">'
      +`<span data-avtipo="" style="cursor:pointer;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${F.tipo?'#f1f5f9':'#1f2937'};color:${F.tipo?'#475569':'#fff'}">Todos</span>`
      +tiposPres.map(tp=>`<span data-avtipo="${tp}" style="cursor:pointer;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${F.tipo===tp?'#1f2937':'#f1f5f9'};color:${F.tipo===tp?'#fff':'#475569'}">${_TN[tp]||tp}${_cont[tp]?' '+_cont[tp]:''}</span>`).join('')
      +(_nVistos?`<span data-avshow="1" style="cursor:pointer;font-size:11px;padding:2px 8px;border-radius:10px;background:#f1f5f9;color:#475569">${F.showSeen?'ocultar vistos':('ver vistos ('+_nVistos+')')}</span>`:'')
      +'</div>';
    const grupos={}; show.forEach(x=>{ (grupos[x.tipo]=grupos[x.tipo]||[]).push(x); });
    const _itav=Object.keys(grupos).map(tp=>{
      const its=grupos[tp].map(x=>{ const vst=!!_vis[x.key]; return `<div style="font-size:12.5px;margin:3px 0;padding:6px 8px;background:#fff;border-left:3px solid ${x.cls==='r'?'#dc2626':'#d97706'};border-radius:4px;display:flex;align-items:flex-start;gap:8px;${vst?'opacity:.5':''}"><span data-goto="${x.goto}"${x.sig?` data-sig="${x.sig}" data-ticker="${x.tick||''}" title="Pulsa para ver el procedimiento (señal ${x.sig})"`:''} style="cursor:pointer;flex:1">${x.txt}${x.sig?` <span style="font-size:10px;font-weight:700;color:#94a3b8;background:#f1f5f9;border-radius:8px;padding:1px 6px">${x.sig} 📋</span>`:''}</span><span data-avseen="${x.key}" title="${vst?'Marcar como no visto':'Marcar como visto'}" style="cursor:pointer;color:${vst?'#16a34a':'#cbd5e1'};font-weight:700;font-size:13px">✓</span></div>`; }).join('');
      return `<div style="margin-bottom:6px"><div style="font-size:11px;font-weight:700;color:#94a3b8;margin:4px 0 2px">${_TN[tp]||tp}</div>${its}</div>`;
    }).join('');
    const _allKeys=show.map(x=>x.key).join('~');
    const _aviOpen=window._pAviOpen!==false;
    html+=`<div class="${hayCrit?'stopalert':''}" style="margin-top:4px;padding:12px 14px;background:${hayCrit?'#fee2e2':'#fff7ed'};border:1px solid ${hayCrit?'#fecaca':'#fed7aa'};border-radius:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div class="pcol-h" data-pavi="1" style="font-weight:800;color:${hayCrit?'#991b1b':'#9a3412'};font-size:15px;cursor:pointer"><span class="pcol-arw${_aviOpen?' open':''}">▶</span>🔔 Avisos (${show.length})</div>${show.length?`<span data-avseenall="${_allKeys}" style="cursor:pointer;font-size:11px;color:#64748b" title="Marcar todos como vistos">marcar todos ✓</span>`:''}</div>${_aviOpen?(chips+(_itav||'<div class="muted" style="font-size:12px">Sin avisos en este filtro.</div>')):''}</div>`;
  }
  const card=c=>`<div class="card"><div class="lbl">${c[0]}</div><div class="val ${c[2]||''}">${c[1]}</div>${c[3]?`<div class="sub">${c[3]}</div>`:''}</div>`;
  const block=(title,view,cards)=>`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="${view}">${title} <span class="muted" style="font-size:12px">›</span></h3><div class="cards">${cards.map(card).join('')}</div></div>`;
  // Salud financiera (score compuesto) — al principio del panel
  if(typeof saludFinanciera==='function'){ try{ const H=saludFinanciera(); if(H.score!=null){ const sc=Math.round(H.score); const col=sc>=70?'#16a34a':(sc>=50?'#d97706':'#dc2626'); const emo=sc>=70?'🟢':(sc>=50?'🟡':'🔴'); const bars=H.pilares.map(p=>{ const s=p.s==null?null:Math.round(p.s); const bc=s==null?'#cbd5e1':(s>=70?'#16a34a':(s>=50?'#d97706':'#dc2626')); return `<div style="margin:3px 0"><div style="display:flex;justify-content:space-between;font-size:11.5px"><span>${p.k}</span><span class="muted">${p.d}${s!=null?' · '+s:''}</span></div><div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden"><div style="height:100%;width:${s==null?0:s}%;background:${bc}"></div></div></div>`; }).join(''); html+=`<div style="margin-top:16px"><h3 style="margin-bottom:6px">Salud financiera</h3><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="font-size:34px;font-weight:800;color:${col};min-width:80px;text-align:center">${emo}<br><span style="font-size:30px">${sc}</span><div class="muted" style="font-size:10px;font-weight:400">/ 100</div></div><div style="flex:1;min-width:240px">${bars}</div></div></div>`; } }catch(e){} }
  // Evolución de la cartera (coste / valor / valor+dividendos) con tooltip al pasar el ratón — al principio del panel
  if(typeof evoPanelHTML==='function'){ try{ SEC.cartera+=evoPanelHTML(renderPanelDash); }catch(e){} }
  // Rentabilidad real (TIR/XIRR + TWR + alfa vs IBEX)
  if(typeof carteraRentabilidad==='function'){ try{ const R=carteraRentabilidad(renderPanelDash); if(R){ const pc=x=>x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1)+'%'); const cs=[['TIR (anual, s/dinero)',pc(R.xirr),R.xirr>=0?'pos':'neg','ponderada por dinero'],['Rentab. temporal (anual)',pc(R.twrAnual),R.twrAnual>=0?'pos':'neg','comparable al índice']]; if(R.hayIbex){ cs.push(['Alfa vs IBEX-35',pc(R.alfa),(R.alfa!=null&&R.alfa>=0)?'pos':'neg','TWR − IBEX c/div']); cs.push(['Ventaja vs IBEX',(R.valDif>=0?'+':'')+fmt(R.valDif),R.valDif>=0?'pos':'neg','vs IBEX con dividendos']); } SEC.cartera+=block('Rentabilidad','ranking',cs); } }catch(e){} }
  // Atribución del crecimiento (aportación / mercado / dividendos)
  if(typeof crecimientoAtribucion==='function'){ try{ const A=crecimientoAtribucion(12); if(A&&(Math.abs(A.crecValor)>0.5||Math.abs(A.dividendos)>0.5)){ const sg=x=>(x>=0?'+':'')+fmt(x); const ef=A.aportacion-A.dividendos; const cs=[['Efectivo (nuevo)',sg(ef),'','dinero de tu bolsillo'],['Dividendo (reinv.)',sg(A.dividendos),'pos','reinvertido'],['Mercado',sg(A.revaloriz),A.revaloriz>=0?'pos':'neg','revalorización'],['Retorno (mkt+div)',sg(A.retorno),A.retorno>=0?'pos':'neg','últimos '+A.meses+' meses']]; SEC.mas+=block('De dónde viene tu crecimiento','atribucion',cs); } }catch(e){} }
  // Patrimonio
  const snaps=(typeof patSnaps==='function')?patSnaps():[]; const last=snaps[snaps.length-1]; let ef=0,inv=0; if(last)(last.lineas||[]).forEach(l=>{ef+=num(l.ef);inv+=num(l.inv);});
  const patTot=ef+inv, pInv=patTot?inv/patTot:0;
  if(patTot) SEC.cartera+=block('Patrimonio','patrimonio',[['Total',fmt(patTot)],['Efectivo',fmt(ef),'',Math.round((1-pInv)*100)+'%'],['Invertido',fmt(inv),'',Math.round(pInv*100)+'%'],['Objetivo 50/50',(pInv*100).toFixed(0)+'% inv',pInv>=0.5?'pos':'neg','meta 50%']]);
  // Fondo de emergencia
  if(typeof fondoEmergencia==='function'){ try{ const FE=fondoEmergencia(); if(FE.efectivo>0||FE.gastoMes>0){ const mtxt=FE.meses==null?'—':FE.meses.toFixed(1)+' meses'; const cls=FE.estado==='verde'?'pos':(FE.estado==='rojo'?'neg':''); const emoji=FE.estado==='verde'?'🟢':(FE.estado==='ambar'?'🟡':(FE.estado==='rojo'?'🔴':'')); const obj=FE.gastoMes*6; const cs=[['Efectivo disponible',fmt(FE.efectivo),'','incluye R4'],['Gasto mensual',fmt(FE.gastoMes),'',FE.base==='presupuesto'?('presupuesto '+nowY):'media 12m (real)'],['Colchón',emoji+' '+mtxt,cls,FE.meses==null?'':(FE.meses>=6?'holgado':(FE.meses>=3?'aceptable':'insuficiente'))],['Objetivo 6 meses',fmt(obj),FE.efectivo>=obj?'pos':'',FE.efectivo>=obj?'cubierto ✓':('faltan '+fmt(Math.max(0,obj-FE.efectivo)))]]; SEC.hogar+=block('Fondo de emergencia','patrimonio',cs); } }catch(e){} }
  // Esencial vs discrecional (margen)
  if(typeof gastoEsencialPresu==='function'){ try{ const es=gastoEsencialPresu(); const tot=(typeof gastoMensualPresu==='function')?gastoMensualPresu():null; if(es!=null&&tot!=null&&tot>0){ const dis=Math.max(0,tot-es); const FE2=(typeof fondoEmergencia==='function')?fondoEmergencia():null; const mesesEs=(FE2&&FE2.mesesEsencial!=null)?FE2.mesesEsencial:null; const cs=[['Gasto esencial',fmt(es),'',(es/tot*100).toFixed(0)+'% · '+fmt(es*12)+'/año'],['Discrecional (margen)',fmt(dis),dis>0?'pos':'',(dis/tot*100).toFixed(0)+'% recortable/invertible'],['Colchón esencial',mesesEs!=null?(mesesEs.toFixed(1)+' meses'):'—','pos','solo lo imprescindible']]; SEC.hogar+=block('Esencial vs discrecional','presupuesto',cs); } }catch(e){} }
  // Proyección de cierre de presupuesto (burn-rate)
  if(typeof proyeccionCierre==='function'){ try{ const P=proyeccionCierre(); if(P){ const sg=x=>(x>=0?'+':'')+fmt(x); const over=P.desv>0.5; const cs=[['Proyección cierre '+nowY,fmt(P.proy),over?'neg':'pos','a este ritmo'],['Presupuesto anual',fmt(P.presAnual),'','gasto planificado'],['Desviación',sg(P.desv),over?'neg':'pos',(P.presAnual?((P.desv/P.presAnual*100).toFixed(0)+'%'):'')+(over?' te pasarías':' margen')],['Llevas gastado',fmt(P.realYTD),'',(P.frac*100).toFixed(0)+'% del año · prorrateado '+fmt(P.prorrat)]]; SEC.hogar+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="presupuesto">Cierre de año (a este ritmo) <span class="muted" style="font-size:12px">›</span></h3><div class="cards">${cs.map(card).join('')}</div><div class="muted" style="font-size:11px;margin-top:4px">Proyección lineal según tu ritmo de gasto (${(P.frac*100).toFixed(0)}% del año transcurrido). Los gastos anuales grandes (vacaciones, seguros) pueden distorsionarla según cuándo se paguen.</div></div>`; } }catch(e){} }
  // Metas financieras
  if((DB.metas||[]).length){ try{ const its=(DB.metas||[]).slice(0,6).map(m=>{ const obj=num(m.objetivo),act=num(m.actual); const prog=obj>0?Math.min(1,act/obj):0; const col=prog>=1?'#16a34a':'#2563eb'; return `<div data-goto="metas" style="cursor:pointer;font-size:12px;margin:4px 0"><div style="display:flex;justify-content:space-between"><span>${(m.nombre||'Meta')}${m.fecha?' <span class=\"muted\" style=\"font-size:10px\">'+m.fecha+'</span>':''}</span><span class="muted">${fmt(act)} / ${fmt(obj)} · ${(prog*100).toFixed(0)}%</span></div><div class="bar"><i style="width:${(prog*100).toFixed(0)}%;background:${col}"></i></div></div>`; }).join(''); SEC.hogar+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="metas">Metas <span class="muted" style="font-size:12px">›</span></h3>${its}</div>`; }catch(e){} }
  // Asignación por clase de activo
  if((DB.asignacion||[]).length){ try{ const totA=(DB.asignacion||[]).reduce((s,c)=>s+num(c.actual),0); if(totA>0){ const its=(DB.asignacion||[]).map(c=>{ const act=num(c.actual),obj=num(c.objetivo); const actPct=act/totA*100; const off=obj>0&&Math.abs(actPct-obj)>5; return `<div data-goto="asignacion" style="cursor:pointer;font-size:12px;margin:3px 0"><div style="display:flex;justify-content:space-between"><span>${c.nombre||'Clase'}</span><span class="muted">${actPct.toFixed(0)}%${obj>0?' / obj '+obj.toFixed(0)+'%':''}${off?' <span style=\"color:#dc2626\">⚠</span>':''}</span></div><div class="bar"><i style="width:${Math.min(100,actPct).toFixed(0)}%;background:${off?'#dc2626':'#2563eb'}"></i></div></div>`; }).join(''); SEC.mas+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="asignacion">Asignación de activos <span class="muted" style="font-size:12px">›</span></h3>${its}</div>`; } }catch(e){} }
  // Cartera
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  if(pos.length){ const cV=pos.reduce((s,p)=>s+p.acciones*p.precioActual,0), cC=pos.reduce((s,p)=>s+p.acciones*p.precioCompra,0), cD=pos.reduce((s,p)=>s+p.acciones*p.divAccion,0), cPL=cV-cC;
    let cMax=cV,cMaxSub='ahora';try{if(typeof carteraEvolData==='function'){var _ed=carteraEvolData(renderPanelDash);if(_ed&&_ed.ok&&_ed.valor&&_ed.valor.length){var _mx=-Infinity,_mi=-1;_ed.valor.forEach(function(v,i){var nv=num(v);if(nv>_mx){_mx=nv;_mi=i;}});if(_mx>-Infinity){cMax=_mx;var _lb=(_ed.labels[_mi]||'').split('-');var _when=_lb.length===3?(_lb[2]+'/'+_lb[1]+'/'+_lb[0]):'';cMaxSub=(_mi===_ed.valor.length-1)?('máximo actual'+(_when?' · '+_when:'')):(_when+' · ahora '+(_mx>0?(cV/_mx*100).toFixed(0):'100')+'% del máx.');}}}}catch(e){}
    SEC.cartera+=block('Cartera','inversiones',[['Valor',fmt(cV),'','coste '+fmt(cC)],['Plusvalía',(cPL>=0?'+':'')+fmt(cPL),cPL>=0?'pos':'neg',(cC?(cPL/cC*100).toFixed(1):0)+'%'],['Máximo histórico',fmt(cMax),'',cMaxSub],['YoC',(cC?(cD/cC*100).toFixed(1):0)+'%','pos']]); }
  // Dividendos
  if(typeof simYearTotal==='function'){ const y1=nowY+1, y2=nowY+2; const dN=simYearTotal(nowY), d1=simYearTotal(y1), d2=simYearTotal(y2), cr=dN?((d1/dN)-1):0;
    SEC.dividendos+=block('Dividendos','dividendos',[['Cobrado '+nowY,fmt(dN)],['Previsión '+y1,fmt(d1)],['Previsión '+y2,fmt(d2)],['Crecimiento '+nowY+'→'+y1,(cr>=0?'+':'')+(cr*100).toFixed(0)+'%',cr>=0?'pos':'neg']]); }
  // Estado de resultados de dividendos (cobrado real vs previsto + DGR)
  if(typeof dividendosEstado==='function'){ try{ const DE=dividendosEstado(); if(DE&&(DE.prevAnual>0||DE.cobradoYTD>0)){ const pc=x=>x==null?'—':((x>=0?'+':'')+(x*100).toFixed(0)+'%'); const cs=[['Cobrado real '+nowY,fmt(DE.cobradoYTD),'pos',DE.pctCobrado!=null?((DE.pctCobrado*100).toFixed(0)+'% del previsto'):'bruto'],['Previsto '+nowY,fmt(DE.prevAnual),'','bruto anual'],['Crecimiento (DGR)',pc(DE.dgr),(DE.dgr!=null&&DE.dgr>=0)?'pos':'neg','vs '+(nowY-1)],['Cobrado '+(nowY-1),fmt(DE.prevYear),'','bruto']]; SEC.dividendos+=block('Dividendos · cobrado vs previsto','dividendos',cs); } }catch(e){} }
  // Independencia: cobertura de gastos por dividendos (FIRE)
  if(typeof coberturaDivGastos==='function'){ try{ const F=coberturaDivGastos(); if(F&&F.cobertura!=null){ const pc=x=>x==null?'—':(x*100).toFixed(0)+'%'; const cs=[['Cobertura de gastos',pc(F.cobertura),F.cobertura>=1?'pos':(F.cobertura>=0.5?'':'neg'),'div bruto '+fmt(F.divNow)+' · gasto '+fmt(F.gastoReal)],['Año de independencia',F.anioIndep?String(F.anioIndep):'—',F.anioIndep?'pos':'',F.anioIndep?('faltan '+(F.anioIndep-nowY)+' años'):'no alcanzado en 60 a'],['Crecim. dividendo',(F.gDiv>=0?'+':'')+(F.gDiv*100).toFixed(1)+'%','','anual estimado'],['Inflación gasto','+'+(F.infla*100).toFixed(1)+'%','','asumida']]; SEC.dividendos+=block('Independencia (dividendos vs gastos)','dividendos',cs); } }catch(e){} }
  // Oportunidades
  const ana=(DB.analisis||[]).map(a=>{const cot=num(a.cotizacion),ent=num(a.precioEntrada),obj=num(a.precioObjetivo);return {t:a.ticker,pot:(cot&&obj)?(obj-cot)/cot:null,barata:!!(cot&&ent&&cot<=ent*1.05)};});
  const baratas=ana.filter(a=>a.barata).length, top=ana.filter(a=>a.pot!=null).sort((a,b)=>b.pot-a.pot).slice(0,3);
  if(ana.length) SEC.accion+=block('Oportunidades','analisis',[['Empresas baratas',String(baratas),baratas?'pos':''],['Top potencial',top.length?top.map(x=>x.t+' '+(x.pot>=0?'+':'')+(x.pot*100).toFixed(0)+'%').join(' · '):'—']]);
  // Próxima mejor compra (motor)
  if(typeof proximaCompra==='function'){ try{ const M=proximaCompra(); if(M&&(M.cand.length||M.near.length)){
    const cajaTxt=M.cajaHoy!=null?('caja disponible '+fmt(M.cajaHoy)):'caja sin configurar';
    let cuerpo='';
    if(M.cand.length){ const lst=M.cand.slice(0,5).map((x,i)=>{ const rec=x.rec>0?`<b>invierte ${fmt(x.rec)}</b>${x.acc?` · ${x.acc} acc`:''}`:(x.gap<=0?'<span class="muted">en objetivo</span>':(M.capByCash?'<span class="muted">sin caja</span>':`<b>${fmt(x.gap)}</b>`)); return `<div data-ficha="${x.t}" style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:5px 8px;border-left:3px solid ${i===0?'#16a34a':'#86efac'};background:#fff;border-radius:4px;margin:3px 0;cursor:pointer"><span>${i===0?'⭐ ':''}<b>${x.t}</b> · Score ${x.score!=null?x.score.toFixed(0):'—'} · ${x.estado}${x.held?' · en cartera':''}</span><span style="white-space:nowrap">${rec} <span class="muted">hueco ${fmt(x.gap)}</span></span></div>`; }).join('');
      cuerpo=`<div class="muted" style="font-size:11.5px;margin-bottom:6px">${cajaTxt} · combina Score, hueco hasta objetivo y banda de entrada${M.recTotal>0?` · a repartir ${fmt(M.recTotal)}`:''}</div>${lst}`; }
    else { const n=M.near.slice(0,3).map(x=>`<b>${x.t}</b> (${x.estado})`).join(' · '); cuerpo=`<div class="muted" style="font-size:12px">Ninguna empresa en zona de compra ahora. Más cerca: ${n||'—'}.</div>`; }
    SEC.accion+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="proxcompra">Próxima mejor compra <span class="muted" style="font-size:12px">›</span></h3>${cuerpo}</div>`;
  } }catch(e){} }
  // Reembolsables (antes Amalia) — va en Hogar
  if(typeof amaliaSaldo==='function'){ const am=amaliaSaldo(); SEC.hogar+=block('Reembolsables','amalia',[['Pendiente de cobro',fmt(am),am>0.005?'neg':'pos']]); }
  // Tareas pendientes (antes de eventos)
  const _pend=(DB.todos||[]).filter(x=>!x.hecho).sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999'));
  if(_pend.length){ const _hoy=new Date().toISOString().slice(0,10); const _it=_pend.slice(0,8).map(x=>{ const v=x.fecha&&x.fecha<_hoy; return `<div style="font-size:12px;margin:1px 0"><span style="color:${v?'#dc2626':'#64748b'}">${x.fecha?ddmmyyyy(x.fecha):'—'}</span> ${x.desc||''}${x.ticker?' <b>'+x.ticker+'</b>':''}</div>`; }).join(''); SEC.mas+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="monitor">Tareas pendientes <span class="muted" style="font-size:12px">›</span></h3>${_it}</div>`; }
  // Próximos eventos — MOTOR DERIVADO (fechas exactas de dividendos.json + -trim.json vía calAgenda),
  // ya no del calendario manual DB.eventos. Mantiene el layout de 4 columnas (cartera/otras × div/result).
  if(typeof calAgenda==='function'){
    let up=[]; try{ up=calAgenda(_calHoy(), {limite:400})||[]; }catch(e){ up=[]; }
    const _isD=e=>e.tipo==='exdiv'||e.tipo==='pago';
    const _cart=e=>e.grp==='cartera';
    const g1=up.filter(e=>_cart(e)&&_isD(e)).slice(0,12), g2=up.filter(e=>_cart(e)&&!_isD(e)).slice(0,12), g3=up.filter(e=>!_cart(e)&&_isD(e)).slice(0,12), g4=up.filter(e=>!_cart(e)&&!_isD(e)).slice(0,12);
    const _fd=e=>{ const yy=(e.fecha||'').slice(0,4); const base=(typeof _calFmtF==='function')?_calFmtF(e.fecha):(e.fecha||''); return base+(yy&&yy!==String(nowY)?(" '"+yy.slice(2)):''); };
    const _chip=e=>(typeof _calChip==='function')?_calChip(e.tipo,e.periodo):`<span class="evchip">${e.tipo}</span>`;
    const _bdg=e=>(typeof _calBadge==='function')?_calBadge(e):'';
    const _row=(e,fs,bold)=>`<div style="font-size:${fs}px;margin:1px 0;white-space:nowrap"><span class="muted" style="font-variant-numeric:tabular-nums">${_fd(e)}</span> ${_chip(e)} <span data-ficha="${e.t}" style="cursor:pointer;color:var(--brand)${bold?';font-weight:700':''}">${e.t}</span>${_bdg(e)}</div>`;
    const _col=(title,arr,fs,bold,bl)=>`<div style="${bl?'border-left:1px solid var(--line);padding-left:10px;':''}"><div class="muted" style="font-size:10px;font-weight:700;margin:0 0 3px;text-transform:uppercase;letter-spacing:.03em">${title}</div>${arr.length?arr.map(e=>_row(e,fs,bold)).join(''):'<div class="muted" style="font-size:10px">—</div>'}</div>`;
    if(g1.length||g2.length||g3.length||g4.length){
      const ag=`<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">${_col('Dividendos · cartera',g1,13,true,false)}${_col('Result. y otros · cartera',g2,12,true,false)}${_col('Dividendos · otras',g3,11,false,true)}${_col('Result. y otros · otras',g4,11,false,false)}</div>`;
      SEC.mas+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="calendario">Próximos eventos <span class="muted" style="font-size:12px">›</span></h3>${ag}</div>`;
    }
  }
  // Mini-gráfico dividendos por año
  if(typeof simYearTotal==='function'){ const ys=[]; for(let y=2011;y<=nowY;y++)ys.push(y); const vals=ys.map(simYearTotal); const mx=Math.max(...vals,1); const bw=Math.max(8,Math.floor(360/ys.length)); let bars=''; ys.forEach((y,i)=>{ const h=Math.round(vals[i]/mx*70); bars+=`<rect x="${i*bw}" y="${78-h}" width="${bw-2}" height="${h}" fill="var(--brand)"></rect>`; });
    if(mx>1) SEC.mas+=`<div style="margin-top:16px"><h3 style="cursor:pointer;margin-bottom:6px" data-goto="dividendos">Dividendos por año <span class="muted" style="font-size:12px">›</span></h3><svg width="${ys.length*bw}" height="92" viewBox="0 0 ${ys.length*bw} 92">${bars}<text x="0" y="90" font-size="8" fill="#64748b">${ys[0]}</text><text x="${ys.length*bw-22}" y="90" font-size="8" fill="#64748b">${nowY}</text></svg></div>`; }
  el.innerHTML=html+_pnlSecciones(SEC);
}
function planSharesAt(t,year){ const pc=(DB.planCompras||{})[t]; if(!pc)return 0; const v=(DB.valores||{})[t]; const pr=v&&num(v.precioActual)>0?num(v.precioActual):0; if(!pr)return 0; let sh=0; Object.keys(pc).forEach(y=>{ if(+y<=year) sh+=Math.floor(num(pc[y])/pr); }); return sh; }
/* Slider de rango horizontal sincronizado con la tabla del Plan (igual que el Simulador):
   mueve la tabla en horizontal por los años desde cualquier posición; la columna Empresa queda fija. */
function _planSyncBand(){
  var sc=document.querySelector('#planTabla .pl-desk')||document.getElementById('planTabla'); var rng=document.getElementById('planScroll'); if(!sc||!rng)return;
  var maxSL=function(){ return Math.max(0, sc.scrollWidth - sc.clientWidth); };
  var sync=function(){ var m=maxSL(); rng.style.display=(m>4)?'':'none'; rng.value=(m>0)?Math.round(sc.scrollLeft/m*1000):0; };
  if(!rng._wired){ rng._wired=true;
    rng.addEventListener('input',function(){ sc.scrollLeft=maxSL()*(num(rng.value)/1000); });
    sc.addEventListener('scroll',sync);
  }
  sync();
}
function renderPlan(){
  const el=$('#planTabla'); if(!el)return;
  const pc=DB.planCompras=DB.planCompras||{}; const pr=DB.planPresupuesto=DB.planPresupuesto||{};
  const nowY=new Date().getFullYear(); const y1=Math.max(num((DB.planLotePeriodo||{}).hasta)||2034, nowY+1, maxDataYear()); const years=[]; for(let y=nowY;y<=y1;y++)years.push(y);
  const _cierre=num((DB.planLotePeriodo||{}).cierre)||y1;   /* el plan solo reparte capital hasta el año de cierre */
  /* Presupuesto/año por defecto = disponible de Proyección/Diversificación (mismo criterio que la pestaña Diversificación); el campo del Plan solo lo sobrescribe si lo escribes a mano. */
  const _dispY={}; try{ if(typeof proyDefaults==='function')proyDefaults(); const _ser=(typeof computeProy==='function')?computeProy(DB.config.proyeccion):[]; _ser.forEach(r=>{ _dispY[r.anio]=num(r.aInversion); }); }catch(e){}
  const _execY={}; (DB.operaciones||[]).forEach(o=>{ if(o.tipo!=='venta'){ const yy=+((o.fecha||'').slice(0,4)); if(yy)_execY[yy]=(_execY[yy]||0)+num(o.acciones)*num(o.precio); } });
  const _fijo=DB.planDispFijo||{};
  const dispShown=y=> (y>_cierre)?0:((_fijo[y]!=null&&_fijo[y]!=='')?num(_fijo[y]):(num(_dispY[y]||0)-(y<=nowY?num(_execY[y]||0):0)));
  const presShown=y=>(num(pr[y])>0)?num(pr[y]):dispShown(y);
  const set=new Set(Object.keys(pc).map(t=>t.toUpperCase()));
  (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)set.add((p.ticker||'').toUpperCase()); });
  let tickers=[...set].filter(Boolean);
  if(!tickers.length){ el.innerHTML='<div class="empty">Sin plan. Importa «plan-compras.json» o pulsa «+ Empresa».</div>'; $('#planKpis').innerHTML=''; return; }
  const tt=t=>Object.values(pc[t]||{}).reduce((s,v)=>s+num(v),0);
  tickers.sort((a,b)=>tt(b)-tt(a)||a.localeCompare(b));
  const totYear={}; years.forEach(y=>totYear[y]=0);
  const eurK=v=>{ v=Math.round(v); const a=Math.abs(v); return a>=1000?((Math.round(v/100)/10).toLocaleString('es-ES')+'k'):(''+v); };
  const ttOf=t=>years.reduce((s,y)=>s+((pc[t]&&pc[t][y]!=null)?num(pc[t][y]):0),0);
  const cellMark=(t,y)=>{ const v=(pc[t]&&pc[t][y]!=null)?num(pc[t][y]):0; const exeE=(v>0&&typeof execBuyEur==='function')?execBuyEur(t,+y):0; const comp=(v>0&&exeE>=v-0.005); const parc=(v>0&&exeE>0&&exeE<v-0.005); return {v,comp,parc,exeE}; };
  const body=tickers.map(t=>{ let rt=0; const cells=years.map(y=>{ const m=cellMark(t,y); rt+=m.v; totYear[y]+=m.v; const cls=m.comp?'pl-comp':(m.parc?'pl-parc':''); const mark=m.comp?' ✓':(m.parc?' ◐':''); return `<td class="num ${cls}"${(m.comp||m.parc)?` title="ejecutado ${fmt(m.exeE)} de ${fmt(m.v)}"`:''}>${m.v?fmt(m.v):'·'}${mark}</td>`; }).join('');
    return `<tr><td class="pl-emp"><b class="dv-tk" data-ficha="${t}" style="cursor:pointer">${t}</b></td>${cells}<td class="num" style="font-weight:700">${rt?fmt(rt):'·'}</td></tr>`; }).join('');
  const head='<tr><th>Empresa</th>'+years.map(y=>`<th class="num">${y}</th>`).join('')+'<th class="num">Total</th></tr>';
  const grand=Object.values(totYear).reduce((s,v)=>s+v,0);
  const totRow='<tr class="pl-tot"><td>Total/año</td>'+years.map(y=>`<td class="num">${totYear[y]?fmt(totYear[y]):'·'}</td>`).join('')+`<td class="num">${fmt(grand)}</td></tr>`;
  const presRow='<tr class="pl-pres"><td title="Por defecto = lo presupuestado para invertir ese año en Proyección/Diversificación. Escribe un número para fijar uno propio en el Plan.">Presupuesto/año</td>'+years.map(y=>{ const manual=(num(pr[y])>0); const val=manual?pr[y]:Math.round(presShown(y)); return `<td class="num"><input type="number" step="100" class="anaInp" style="width:70px;text-align:center;color:${manual?'#0f172a':'#94a3b8'};font-style:${manual?'normal':'italic'}" data-plpres="${y}" value="${val}" title="${manual?'Fijado a mano en el Plan':'Heredado de Proyección/Diversificación · edítalo para fijar uno propio'}"></td>`; }).join('')+'<td></td></tr>';
  const exeRow='<tr class="pl-exe"><td title="Presupuesto del año menos lo ya planificado">Por ejecutar</td>'+years.map(y=>{ const dif=presShown(y)-totYear[y]; return `<td class="num ${dif<0?'neg':(dif>0?'pos':'')}">${fmt(dif)}</td>`; }).join('')+'<td></td></tr>';
  const ejec=[]; tickers.forEach(t=>Object.keys(pc[t]||{}).forEach(y=>{ const plan=num(pc[t][y]); if(plan<=0)return; const exe=(typeof execBuyEur==='function')?execBuyEur(t,+y):0; if(exe<=0)return; const falta=Math.max(0,plan-exe); const comp=exe>=plan-0.005; ejec.push({t,y,plan,exe,falta,comp}); }));
  const _pendTot=ejec.reduce((s,e)=>s+e.falta,0);
  const aviso = ejec.length ? `<div class="card" style="margin-top:12px;background:#fff7ed;border:1px solid #fed7aa"><div style="font-weight:700;color:#b45309;margin-bottom:6px">Ejecución del plan (${ejec.length})${_pendTot>0.005?` · faltan ${fmt(_pendTot)}`:''}</div><div class="sub" style="margin-bottom:8px">Compras del plan que ya has empezado. Las <b>parciales</b> siguen contando en el Simulador (real + lo que falta). Cuando una esté <b>completa</b>, quítala del Plan.</div>${ejec.map(e=>`<div style="font-size:13px;margin:4px 0;display:flex;align-items:center;gap:10px"><span>${e.comp?'✅':'🟠'} <b>${e.t}</b> · ${e.y} — ejecutado ${fmt(e.exe)} de ${fmt(e.plan)}${e.comp?' <b style=\"color:#16a34a\">(completa)</b>':` · <b style=\"color:#b45309\">faltan ${fmt(e.falta)}</b>`}</span>${e.comp?`<button class="btn danger sm" data-planexe="${e.t}|${e.y}">Quitar del Plan</button>`:''}</div>`).join('')}</div>` : '';
  const deskHTML=`<div class="pl-desk"><table><thead>${head}</thead><tbody>${body}${totRow}${presRow}${exeRow}</tbody></table></div>`;
  /* Móvil: tira por año (presupuesto / planificado / por ejecutar) + selector de empresa */
  const pyChip=y=>{ const dif=presShown(y)-totYear[y]; const cls=dif>0.5?'g':(dif<-0.5?'r':'z'); return `<div class="pychip ${cls}"><div class="yy">${y}</div><div class="pv2">${eurK(presShown(y))} €</div><div class="pl2">presupuesto</div><div class="pmid">plan ${eurK(totYear[y])} €</div><div class="pv">${dif>0.5?'+':''}${eurK(dif)} €</div><div class="pl">por ejecutar</div></div>`; };
  const pyStripHTML='<div class="pystrip-t">Presupuesto y ejecución por año</div><div class="dv-pystrip">'+years.map(pyChip).join('')+'</div>';
  const nm=t=>((DB.valores||{})[t]||{}).nombre||(((DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===t)||{}).nombre)||t;
  if(!window._plCoSel || tickers.indexOf(window._plCoSel)<0) window._plCoSel=tickers[0]||'';
  const selIdx=Math.max(0,tickers.indexOf(window._plCoSel));
  const coOptions=tickers.map((t,i)=>`<option value="${i}"${i===selIdx?' selected':''}>${t} · plan ${eurK(ttOf(t))} €</option>`).join('');
  const mdetail=(t,i)=>{ const rt=ttOf(t);
    return `<div class="codet" data-coi="${i}"${i!==selIdx?' style="display:none"':''}>`
      +`<div class="codet-h"><div class="mid"><div class="t1"><b class="dv-tk" data-ficha="${t}" style="cursor:pointer">${t}</b></div><div class="t2">${(nm(t)||'').slice(0,28)}</div></div><div class="fh"><b>${fmt(rt)}</b><div class="fl">plan total</div></div></div>`
      +`<div class="yrgrid">${years.map(y=>{ const m=cellMark(t,y); if(!m.v) return ''; const badge=m.comp?'<em class="ok">✓ comprado</em>':(m.parc?'<em class="parc">◐ parcial</em>':''); return `<div class="yg2"><span>${y}</span><b>${fmt(m.v)}</b>${badge}</div>`; }).filter(Boolean).join('')||'<div class="muted" style="font-size:12px;padding:6px">Sin compras planificadas.</div>'}</div>`
      +`</div>`; };
  const mobHTML='<div class="pl-mob">'+pyStripHTML+'<div class="cosel-t">Ver empresa</div><select class="cosel" id="plCoSel">'+coOptions+'</select><div class="codetails">'+tickers.map(mdetail).join('')+'</div></div>';
  el.innerHTML=deskHTML+mobHTML+aviso;
  $('#planKpis').innerHTML='<div class="pl-kpis">'
    +`<div class="k hero"><div class="l">Plan total</div><div class="v">${fmt(grand)}</div><div class="p">${tickers.length} empresas · ${years[0]}–${years[years.length-1]}</div></div>`
    +`<div class="k"><div class="l">Plan ${nowY}</div><div class="v">${fmt(totYear[nowY]||0)}</div><div class="p">planificado este año</div></div>`
    +`<div class="k"><div class="l">Presupuesto ${nowY}</div><div class="v">${fmt(presShown(nowY))}</div><div class="p">disponible ${nowY}</div></div>`
    +`<div class="k"><div class="l">Por ejecutar ${nowY}</div><div class="v ${(presShown(nowY)-(totYear[nowY]||0))<0?'neg':'pos'}">${fmt(presShown(nowY)-(totYear[nowY]||0))}</div><div class="p">presupuesto − plan</div></div>`
    +'</div>';
  if(!el._plCoBound){ el._plCoBound=true; el.addEventListener('change',function(e){ var s=e.target.closest('#plCoSel'); if(!s)return; var i=s.value; var arr=window.__plOrder||[]; window._plCoSel=arr[+i]||window._plCoSel; el.querySelectorAll('.pl-mob .codet').forEach(function(d){ d.style.display=(d.getAttribute('data-coi')===String(i))?'':'none'; }); }); }
  window.__plOrder=tickers;
  const _v=$('#view-plan'); if(_v&&_v.classList.contains('active')) setTimeout(_planSyncBand,0);
}
/* Alta única de empresa desde Diversificación: entra en el lote (o ya es cartera),
   crea su entrada en el plan y aparece en Diversificación, Plan y Simulador. */
function addLoteEmpresa(){ const tk=(prompt('Ticker de la empresa (p. ej. SAN):')||'').trim().toUpperCase(); if(!tk)return; const nombre=(prompt('Nombre:')||tk).trim();
  DB.valores=DB.valores||{}; DB.valores[tk]=DB.valores[tk]||{}; if(nombre)DB.valores[tk].nombre=nombre;
  DB.planCompras=DB.planCompras||{}; DB.planCompras[tk]=DB.planCompras[tk]||{};
  const held=heldTickerSet();
  if(!held.has(tk)){ DB.planLote=DB.planLote||[]; if(!DB.planLote.map(x=>(x||'').toUpperCase()).includes(tk))DB.planLote.push(tk); }
  saveNow();
  if(typeof renderPlanLote==='function')renderPlanLote();
  if(typeof renderPlan==='function')renderPlan();
  if(typeof renderSimulador==='function')renderSimulador();
  const st=$('#loteStatus'); if(st)st.textContent='Añadida '+tk;
}
function renderPlanLote(){
  const el=$('#loteTabla'); if(!el)return;
  const _lotePrevSL=(document.getElementById('loteScrollBox')||{}).scrollLeft||0;
  DB.planLote=DB.planLote||[]; DB.planCompras=DB.planCompras||{}; const pe=DB.planLotePeriodo=DB.planLotePeriodo||{desde:2026,hasta:2034};
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  const invByT={}; pos.forEach(p=>{const t=(p.ticker||'').toUpperCase(); invByT[t]=(invByT[t]||0)+p.acciones*p.precioCompra;});
  const held=Object.keys(invByT);
  const totalInv=Object.values(invByT).reduce((s,v)=>s+v,0);
  const nm=t=>((DB.valores||{})[t]||{}).nombre || (((DB.analisis||[]).find(a=>(a.ticker||'').toUpperCase()===t)||{}).nombre) || t;
  /* Empresas con plan asignado (importe>0) que ya no están en cartera: mantenerlas
     visibles en Diversificación como elegidas, para que no desaparezcan al vender. */
  DB.planLote=DB.planLote||[];
  Object.keys(DB.planCompras||{}).forEach(t=>{ t=(t||'').toUpperCase(); if(!t||held.includes(t))return; const hasAmt=Object.values(DB.planCompras[t]||{}).some(v=>num(v)>0); if(hasAmt && !DB.planLote.map(x=>(x||'').toUpperCase()).includes(t)) DB.planLote.push(t); });
  DB.planLote=DB.planLote.map(t=>(t||'').toUpperCase()).filter((t,i,arr)=>t&&arr.indexOf(t)===i&&!held.includes(t));
  const chosen=DB.planLote; const total=held.length+chosen.length; const pt=DB.planTipo=DB.planTipo||{};
  const tipoSel=t=>`<select class="anaInp" data-lotetipo="${t}"><option value="">— sin clasificar —</option><option value="joya"${pt[t]==='joya'?' selected':''}>Joya 👑</option><option value="mantener"${pt[t]==='mantener'?' selected':''}>Mantener</option><option value="nucleo"${pt[t]==='nucleo'?' selected':''}>Núcleo</option></select>`;
  const anaAll=[...new Set((DB.analisis||[]).map(a=>(a.ticker||'').toUpperCase()).filter(Boolean))];
  const ana=anaAll.filter(t=>!held.includes(t)).sort((a,b)=>nm(a).localeCompare(nm(b)));
  const dl='<datalist id="loteDL">'+ana.filter(t=>!chosen.includes(t)).map(t=>`<option value="${nm(t)} (${t})">`).join('')+'</datalist>';
  const ydesde=num(pe.desde), yhasta=num(pe.hasta); const yrs=[]; for(let y=ydesde;y<=yhasta;y++)yrs.push(y);
  /* AÑO DE CIERRE DEL PLAN: hasta aquí se distribuye el capital (disponible/objetivos). Separado
     del horizonte de VISUALIZACIÓN/proyección (yhasta). Por defecto = yhasta (migración) y luego
     editable aparte, para poder ampliar la vista sin inflar el capital a repartir. */
  let ycierre=num(pe.cierre); if(!ycierre){ ycierre=yhasta; pe.cierre=ycierre; if(typeof scheduleSave==='function')scheduleSave(); }
  ycierre=Math.max(ydesde,Math.min(yhasta,ycierre));
  const nowY=new Date().getFullYear();
  const dispYear={}; let disponible=0;
  try{ if(typeof proyDefaults==='function')proyDefaults(); const ser=(typeof computeProy==='function')?computeProy(DB.config.proyeccion):[]; ser.forEach(r=>{ if(r.anio>=ydesde&&r.anio<=ycierre){ dispYear[r.anio]=num(r.aInversion); disponible+=num(r.aInversion); } }); }catch(e){}
  const execYear={}; (DB.operaciones||[]).forEach(o=>{ if(o.tipo!=='venta'){ const y=+((o.fecha||'').slice(0,4)); if(y) execYear[y]=(execYear[y]||0)+num(o.acciones)*num(o.precio); } });
  const dispNeto=y=> (dispYear[y]||0) - (y<=nowY?(execYear[y]||0):0);
  const dispFijo=DB.planDispFijo=DB.planDispFijo||{};
  const dispShown=y=> (y>ycierre)?0:((dispFijo[y]!=null&&dispFijo[y]!=='')?num(dispFijo[y]):dispNeto(y));
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
  /* Consumo del plan por lo ya comprado (por año más próximo) para cada ticker */
  const remByT={}; allTk.forEach(t=>{ remByT[t]=(typeof _planRem==='function')?_planRem(t):{rem:{},comp:{}}; });
  const remYear=(t,y)=> num((remByT[t]&&remByT[t].rem||{})[y]||0);
  const compYear=(t,y)=> num((remByT[t]&&remByT[t].comp||{})[y]||0);
  /* "Asignado" del año a efectos de presupuesto = lo que QUEDA por comprar (plan − comprado),
     así al ejecutar una compra el año libera cupo y el resto sale con "falta por asignar". */
  const asignYear={}; yrs.forEach(y=>{ asignYear[y]=allTk.reduce((s,t)=>s+remYear(t,y),0); });
  /* ===================== RENDER (rediseño v2) ===================== */
  const eurK=v=>{ v=Math.round(v); const a=Math.abs(v); return a>=1000?((Math.round(v/100)/10).toLocaleString('es-ES')+'k'):(''+v); };
  const TIPOL={joya:'Joya 👑',nucleo:'Núcleo',mantener:'Mantener','':'sin clasificar'};
  const TIPOB={joya:['#7c3aed','#ede9fe'],nucleo:['#1e40af','#dbeafe'],mantener:['#475569','#e2e8f0'],'':['#94a3b8','#f1f5f9']};
  const kpisHTML='<div class="dv-kpis">'
    +`<div class="k"><div class="l">Invertido total</div><div class="v">${fmt(totalInv)}</div><div class="p">${held.length} en cartera</div></div>`
    +`<div class="k"><div class="l">Disponible a repartir</div><div class="v">${fmt(disponible)}</div><div class="p">${ydesde}–${ycierre}</div></div>`
    +`<div class="k"><div class="l">Capital final total</div><div class="v">${fmt(TF)}</div><div class="p">invertido + disponible</div></div>`
    +`<div class="k hero"><div class="l">Capital a asignar</div><div class="v">${fmt(totAsignarPos)}</div><div class="p">${nNuc?('núcleo '+(nucPct*100).toFixed(1)+'% c/u · '):''}${nJoya} joyas</div></div>`
    +'</div>';
  const toolbarHTML=`<div class="toolbar dv-tb" style="margin:12px 0 8px;font-size:13px;align-items:center;flex-wrap:wrap;gap:6px"><span style="font-weight:700;color:#1f3d6b">Ver:</span> <input type="number" step="1" data-loteyr="desde" value="${ydesde}" title="Primer año" style="width:60px;padding:3px 5px;font-size:13px;border:1px solid var(--line);border-radius:6px"> <span style="font-weight:600">a</span> <input type="number" step="1" data-loteyr="hasta" value="${yhasta}" title="Último año visible / proyección" style="width:60px;padding:3px 5px;font-size:13px;border:1px solid var(--line);border-radius:6px"> <span class="muted" style="font-size:11px">visualización</span> <span style="width:1px;height:16px;background:var(--line)"></span> <span style="font-weight:700;color:#b45309">Cierre plan:</span> <input type="number" step="1" data-loteyr="cierre" value="${ycierre}" title="Hasta aquí se reparte el capital disponible (${fmt(disponible)})." style="width:60px;padding:3px 5px;font-size:13px;border:1px solid #fdba74;border-radius:6px;background:#fffbeb"> <span class="muted" style="font-size:11px">reparte hasta aquí</span> <span class="muted" style="font-size:11.5px;margin-left:auto"><b>${total}/20</b> · ${nJoya} joyas</span> <button class="btn sm" onclick="addLoteEmpresa()" title="Añadir empresa">+ Empresa</button></div>`;
  const optInput=(attr,val)=>`<input list="loteDL" class="anaInp" ${attr} value="${val}" placeholder="Escribe o elige…" style="min-width:150px">`;
  const objCells=t=>{ const fa=asignar(t)-sumAsig(t); const faC=Math.abs(fa)<0.5?'<span class="pos" style="font-weight:700">✓</span>':(fa>0?('<span style="color:#b45309;font-weight:700">'+fmt(fa)+'</span>'):('<span class="neg" style="font-weight:700">'+fmt(fa)+'</span>')); return `<td class="num">${(objPct(t)*100).toFixed(1)}%</td><td class="num">${fmt(objEur(t))}</td><td class="num ${asignar(t)>0.5?'pos':(asignar(t)<-0.5?'neg':'')}">${Math.abs(asignar(t))<0.5?'·':((asignar(t)>0?'+':'−')+fmt(Math.abs(asignar(t))))}</td><td class="num">${faC}</td>`; };
  const yrAnnot=(t,y)=>{ const comp=compYear(t,y),queda=remYear(t,y),plan=aYear(t,y); if(comp>0.5){ return (queda<0.5) ? '<div class="qbadge ok" title="Comprado '+fmt(comp)+' de '+fmt(plan)+'">✓ comprado</div>' : '<div class="qbadge" title="Comprado '+fmt(comp)+' de '+fmt(plan)+'">queda '+eurK(queda)+' €</div>'; } return ''; };
  const yrCells=t=>yrs.map(y=>{ const plan=aYear(t,y); return `<td class="yc"><input type="number" step="100" class="anaInp asig" data-asig="${t}|${y}" value="${plan?Math.round(plan):''}">${yrAnnot(t,y)}</td>`; }).join('');
  const yrHead=yrs.map(y=>{ const ds=dispShown(y); const pend=ds-asignYear[y]; return `<th class="yc" data-loteyear="${y}"><div class="yh">${y}</div><input type="number" data-lotedisp="${y}" value="${Math.round(ds)}" title="Presupuesto de inversión de ${y} (editable)" class="dispinp"><div class="dlbl">presupuesto</div><div class="pend ${pend>0.5?'g':(pend<-0.5?'r':'z')}">${pend>0.5?'+':''}${eurK(pend)} €</div><div class="plbl">pendiente</div></th>`; }).join('');
  const heldSorted=held.slice().sort((a,b)=>invByT[b]-invByT[a]);
  let rows='',n=0;
  heldSorted.forEach(t=>{ n++; rows+=`<tr><td class="num">${n}</td><td><b class="dv-tk" data-ficha="${t}" style="cursor:pointer">${t}</b><div class="dv-nm">${(nm(t)||'').slice(0,18)}</div></td><td><span class="pill g">Cartera</span></td><td>${tipoSel(t)}</td><td class="num">${fmt(invByT[t])}</td><td class="num">${totalInv?(invByT[t]/totalInv*100).toFixed(1):0}%</td>${objCells(t)}${yrCells(t)}<td></td></tr>`; });
  chosen.forEach((t,i)=>{ n++; rows+=`<tr><td class="num">${n}</td><td>${optInput('data-lotechg="'+i+'"', nm(t)+' ('+t+')')}</td><td><span class="pill b">Nueva</span></td><td>${tipoSel(t)}</td><td class="num">·</td><td class="num">·</td>${objCells(t)}${yrCells(t)}<td class="right"><button class="btn danger sm" data-lotedel="${i}">✕</button></td></tr>`; });
  for(let k=total;k<20;k++){ n++; rows+=`<tr><td class="num">${n}</td><td>${optInput('data-loteadd','')}</td><td class="muted">slot</td><td></td><td class="num">·</td><td class="num">·</td><td class="num">·</td><td class="num">·</td><td class="num">·</td><td class="num">·</td>${yrs.map(()=>'<td class="yc muted">·</td>').join('')}<td></td></tr>`; }
  const pendRow='<tr class="pendrow"><td></td><td>Pendiente asignar</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'+yrs.map(y=>{ const pend=dispShown(y)-asignYear[y]; return `<td class="num yc ${pend<-0.5?'neg':(pend>0.5?'pos':'')}">${fmt(pend)}</td>`; }).join('')+'<td></td></tr>';
  const deskHTML='<div class="dv-desk"><input type="range" id="loteScroll" min="0" max="1000" value="0" title="Desliza para moverte por los años" class="dv-slider"><div class="dtable" id="loteScrollBox"><table><thead><tr><th class="num">#</th><th>Empresa</th><th>Estado</th><th>Tipo</th><th class="num">Invertido</th><th class="num">% act</th><th class="num">% obj</th><th class="num">Objetivo €</th><th class="num">A asignar</th><th class="num">Falta</th>'+yrHead+'<th></th></tr></thead><tbody>'+rows+pendRow+'</tbody></table></div></div>';
  /* Pendiente por año (chips) */
  const pyChip=y=>{ const ds=dispShown(y); const pend=ds-asignYear[y]; const cls=pend>0.5?'g':(pend<-0.5?'r':'z'); return `<div class="pychip ${cls}"><div class="yy">${y}</div><div class="pv2">${eurK(ds)} €</div><div class="pl2">presupuesto</div><div class="pv">${pend>0.5?'+':''}${eurK(pend)} €</div><div class="pl">pendiente</div></div>`; };
  const pyStripHTML='<div class="pystrip-t">Pendiente por asignar cada año</div><div class="dv-pystrip">'+yrs.map(pyChip).join('')+'</div>';
  /* Móvil: selector de empresa + detalle */
  const allOrder=[...heldSorted, ...chosen];
  if(!window._loteCoSel || allOrder.indexOf(window._loteCoSel)<0) window._loteCoSel=allOrder[0]||'';
  const selIdx=Math.max(0, allOrder.indexOf(window._loteCoSel));
  const faltaShort=t=>{ const f=asignar(t)-sumAsig(t); return Math.abs(f)<0.5?'✓ repartido':(f>0?'falta '+eurK(f)+'€':'sobra '+eurK(-f)+'€'); };
  const coOptions=allOrder.map((t,i)=>`<option value="${i}"${i===selIdx?' selected':''}>${t} · ${(TIPOL[tipoOf(t)]||'').replace(' 👑','')} · ${held.includes(t)?'Cartera':'Nueva'} · ${faltaShort(t)}</option>`).join('');
  const tipoBadge=t=>{ const o=TIPOB[tipoOf(t)]||TIPOB['']; return `<span class="tbadge" style="color:${o[0]};background:${o[1]}">${TIPOL[tipoOf(t)]}</span>`; };
  const faltaTxt=t=>{ const f=asignar(t)-sumAsig(t); return Math.abs(f)<0.5?'<span class="ok2">✓ repartido</span>':(f>0?'<span class="fw2">falta '+fmt(f)+'</span>':'<span class="fn2">sobra '+fmt(-f)+'</span>'); };
  const mdetail=(t,i)=>{ const estPill=held.includes(t)?'<span class="pill g">Cartera</span>':'<span class="pill b">Nueva</span>';
    return `<div class="codet" data-coi="${i}"${i!==selIdx?' style="display:none"':''}>`
      +`<div class="codet-h"><div class="mid"><div class="t1"><b class="dv-tk" data-ficha="${t}" style="cursor:pointer">${t}</b> ${tipoBadge(t)} ${estPill}</div><div class="t2">${(nm(t)||'').slice(0,28)}</div></div><div class="fh">${faltaTxt(t)}<div class="fl">pendiente</div></div></div>`
      +`<div class="drow"><span>Clasificación</span>${tipoSel(t)}</div>`
      +`<div class="mg"><div class="m"><span>Invertido</span><b>${invByT[t]?fmt(invByT[t]):'·'}</b></div><div class="m"><span>% actual</span><b>${(invByT[t]&&totalInv)?(invByT[t]/totalInv*100).toFixed(1)+'%':'·'}</b></div><div class="m"><span>Objetivo (${(objPct(t)*100).toFixed(1)}%)</span><b>${fmt(objEur(t))}</b></div><div class="m"><span>A asignar</span><b class="${asignar(t)>0.5?'pos':''}">${asignar(t)>0.5?'+'+fmt(asignar(t)):'·'}</b></div></div>`
      +`<div class="yrs-t">Reparto de compras por año</div>`
      +`<div class="yrgrid">${yrs.map(y=>{ const plan=aYear(t,y); return `<label class="yg"><span>${y}</span><input type="number" step="100" class="anaInp asig" data-asig="${t}|${y}" value="${plan?Math.round(plan):''}">${yrAnnot(t,y)}</label>`; }).join('')}</div>`
      +`</div>`; };
  const mobHTML='<div class="dv-mob"><div class="cosel-t">Elige empresa</div><select class="cosel" id="loteCoSel">'+coOptions+'</select><div class="codetails">'+allOrder.map(mdetail).join('')+'</div></div>';
  el.innerHTML=kpisHTML+toolbarHTML+dl+pyStripHTML+deskHTML+mobHTML;
  /* Banda deslizante ↔ scroll horizontal de la tabla */
  (function(){ var sc=document.getElementById('loteScrollBox'); var rng=document.getElementById('loteScroll'); if(!sc||!rng)return;
    var maxSL=function(){ return Math.max(0, sc.scrollWidth - sc.clientWidth); };
    var toSlider=function(){ var m=maxSL(); rng.value=(m>0)?Math.round(sc.scrollLeft/m*1000):0; };
    rng.addEventListener('input',function(){ var m=maxSL(); if(m>0) sc.scrollLeft=m*(num(rng.value)/1000); });
    sc.addEventListener('scroll',toSlider);
    sc.scrollLeft = window._loteSeek ? 0 : _lotePrevSL; window._loteSeek=false;
    setTimeout(toSlider,50);
  })();
  /* Selector de empresa (móvil): muestra el detalle elegido y recuerda la selección */
  if(!el._loteCoBound){ el._loteCoBound=true; el.addEventListener('change',function(e){ var s=e.target.closest('#loteCoSel'); if(!s)return; var i=s.value; var arr=window.__loteOrder||[]; window._loteCoSel=arr[+i]||window._loteCoSel; el.querySelectorAll('.codet').forEach(function(d){ d.style.display=(d.getAttribute('data-coi')===String(i))?'':'none'; }); }); }
  window.__loteOrder=allOrder;
}

/* Dividendo BRUTO por mes del ciclo en curso (para la gráfica), desde el MOTOR derivado:
   pagos exactos de dividendos.json (acciones a la fecha × bruto/acción). */
function cajaDivMes(){ const out=new Array(12).fill(0); const nowY=new Date().getFullYear(); const shares=calSharesByTicker();
  if(typeof _calEvDiv!=='function') return out;
  Object.keys(shares).forEach(t=>{ if(shares[t]<=0.0001)return;
    _calEvDiv(t,nowY).forEach(e=>{ if(e.tipo!=='pago')return; const m=parseInt((e.fecha||'').slice(5,7),10)-1; if(m>=0&&m<12) out[m]+=num(e.sh)*num(e.imp); });
  });
  return out; }
function cajaMovs(){ const cfg=DB.cajaConfig||{}; const out=[];
  const nowD=new Date(); const cuY=nowD.getFullYear();
  const desdeY=num(cfg.desdeY)||cuY, desdeM=num(cfg.desdeM)||(nowD.getMonth()+1), hastaY=num(cfg.hastaY)||(cuY+1);
  const defSAN=(cfg.defSAN!=null&&cfg.defSAN!=='')?num(cfg.defSAN):400, defR4=(cfg.defR4!=null&&cfg.defR4!=='')?num(cfg.defR4):700;
  const dia=String(num(cfg.aportDia)||3).padStart(2,'0');
  for(let y=desdeY;y<=hastaY;y++){ const m0=(y===desdeY?desdeM:1); for(let m=m0;m<=12;m++){ const f=`${y}-${String(m).padStart(2,'0')}-${dia}`;
    if(defSAN){ const _ks='SAN|'+f; const _os=(DB.cajaAporReal||{})[_ks]; const _fs=(DB.cajaAporFecha||{})[_ks]||f; out.push({fecha:_fs,concepto:'Aportación SAN',entra:(_os!=null&&_os!=='')?num(_os):defSAN,sale:0,auto:1,apor:1,aporKey:_ks,real:(_os!=null&&_os!=='')}); }
    if(defR4){ const _kr='R4|'+f; const _or=(DB.cajaAporReal||{})[_kr]; const _fr=(DB.cajaAporFecha||{})[_kr]||f; out.push({fecha:_fr,concepto:'Aportación R4',entra:(_or!=null&&_or!=='')?num(_or):defR4,sale:0,auto:1,apor:1,aporKey:_kr,real:(_or!=null&&_or!=='')}); } } }
  /* DIVIDENDOS desde el MOTOR derivado: cada cobro con su FECHA DE PAGO REAL y su NETO EXACTO
     (acciones a la fecha × bruto/acción × 0,81; futuro = acciones del Plan). Overrides manuales
     por cobro se conservan: importe en DB.cajaDivReal[t|fecha], fecha en DB.cajaDivFecha[t|fecha]. */
  const shares=calSharesByTicker();
  const _rangoIni=`${desdeY}-${String(desdeM).padStart(2,'0')}-01`;
  Object.keys(shares).forEach(t=>{ if(shares[t]<=0.0001)return;
    for(let y=desdeY;y<=hastaY;y++){
      const pagos=(typeof _calEvDiv==='function')?_calEvDiv(t,y).filter(e=>e.tipo==='pago'):[];
      pagos.forEach(e=>{ const f=(e.fecha||'').slice(0,10); if(!f||f<_rangoIni)return;
        const neto=Math.round(num(e.sh)*num(e.imp)*0.81*100)/100; if(!(neto>0))return;
        const _k=t+'|'+f; const _ov=(DB.cajaDivReal||{})[_k]; const _df=(DB.cajaDivFecha||{})[_k]||f;
        out.push({fecha:_df,concepto:'Dividendo '+t,entra:(_ov!=null&&_ov!=='')?num(_ov):neto,sale:0,auto:1,div:1,divKey:_k,real:(_ov!=null&&_ov!=='')});
      });
    }
  });
  (DB.cajaMov||[]).forEach(mv=>out.push({fecha:mv.fecha||'',concepto:mv.concepto||'',entra:num(mv.entra||0),sale:num(mv.sale||0),auto:0,id:mv.id}));
  out.sort((a,b)=> (a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0) || (b.auto-a.auto));
  return out; }
function renderCaja(){
  const el=$('#cajaTabla'); if(!el)return; const cfg=DB.cajaConfig=DB.cajaConfig||{};
  /* Los dividendos de la caja salen del motor derivado (dividendos.json). Si aún no está
     cargado, lo cargamos y re-pintamos la caja cuando esté listo. */
  if(typeof _evoCargar==='function' && typeof _evoData!=='undefined' && !_evoData){ try{ _evoCargar().then(function(){ if(typeof renderCaja==='function') renderCaja(); }); }catch(e){} }
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
/* Informe "publicado sin revisar" del trimestre `key` (AAAA-Qn) según la CADENCIA de los
   -trim.json (DB.cadencia): true solo si ese trimestre es el PRÓXIMO informe esperado y su
   fecha ya venció. (Reemplazó al antiguo qPassed del calendario manual, ya eliminado.) */
function _qPub(t,key){ const c=(DB.cadencia||{})[(t||'').toUpperCase()]||{}; return c.nextKey===key && !!c.tocaMonitor; }
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
  const held=heldTickerSet();
  const plan=new Set((DB.planLote||[]).map(x=>(x||'').toUpperCase()));
  const closed=closedTickerSet();
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
    if(inf){ q=['Q1','Q2','Q3','Q4'].map(qc=>{ const key=yr+'-'+qc; const done=(typeof _revHecha==='function')?_revHecha(m.rev,key):!!(m.rev&&m.rev[key]); const passed=_qPub(t,key); const bg=(passed&&!done)?'background:#fee2e2;':''; const mark=done?'<span class="pos">✓</span>':(passed?'<span style="color:#dc2626;font-weight:700">!</span>':'·'); return `<td class="num" data-monrev="${t}|${key}" style="cursor:pointer;${bg}" title="${passed?'Informe publicado, pendiente de revisar':(done?'Revisado':'Aún no publicado')}">${mark}</td>`; }).join(''); }
    else { q='<td colspan="4" class="muted" style="font-size:11px;text-align:center">Falta informe</td>'; }
    const _bg=(typeof statusRowBg==='function')?statusRowBg(t,held):'';
    return `<tr${_bg?` style="background:${_bg}"`:''}><td style="white-space:nowrap"><button class="btn ghost sm" data-ficha="${t}"><b>${t}</b></button> <span class="muted" style="font-size:10px">${nm(t)}</span>${(closed.has(t)&&!held.has(t)&&!plan.has(t))?' <span class="muted" style="font-size:9px">· cerrada (seguimiento)</span>':''}</td><td>${rolInp}</td><td>${infCell}</td>${dosCell}${q}</tr>`;
  }).join('');
  const head=`<tr><th rowspan="2">Empresa</th><th rowspan="2">Rol/Plan</th><th rowspan="2">Informe</th><th rowspan="2">Dossier</th><th class="num" colspan="4" style="text-align:center">Revisión trimestral ${yr}</th></tr><tr><th class="num">Q1</th><th class="num">Q2</th><th class="num">Q3</th><th class="num">Q4</th></tr>`;
  el.innerHTML=`<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
