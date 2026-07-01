function addYear(){
  const dataYears=[...new Set(DB.presupuesto.map(pAnio))].sort((a,b)=>b-a);
  const src=dataYears.length?dataYears[0]:(presYear||new Date().getFullYear());
  let ty=prompt('¿Año del nuevo presupuesto? (se copiará del más reciente: '+src+')', String(src+1));
  ty=parseInt(ty,10); if(!ty) return;
  if(DB.presupuesto.some(p=>pAnio(p)===ty)){
    if(!confirm('Ya existe presupuesto para '+ty+'. ¿Sobrescribirlo copiando de '+src+'?')) return;
    DB.presupuesto=DB.presupuesto.filter(p=>pAnio(p)!==ty);
  }
  DB.presupuesto.filter(p=>pAnio(p)===src).forEach(p=>{
    DB.presupuesto.push({id:uid(),categoriaId:p.categoriaId,importe:p.importe,frecuencia:p.frecuencia,metodoPago:p.metodoPago,renovacion:p.renovacion,anio:ty});
  });
  presYear=ty; fillPresYear(); renderPres(); scheduleSave();
}

function initPeriod(){
  const now=new Date();
  curYear = curYear || now.getFullYear();
  curMonth = (curMonth!=null)? curMonth : now.getMonth();
  const ys=$('#mYear'); ys.innerHTML='';
  const years=new Set([now.getFullYear(), now.getFullYear()-1, curYear]);
  DB.movimientos.forEach(m=>years.add(+m.fecha.slice(0,4)));
  [...years].sort((a,b)=>b-a).forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;ys.appendChild(o);});
  ys.value=curYear;
  const ms=$('#mMonth'); ms.innerHTML='';
  MESES.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=m.charAt(0).toUpperCase()+m.slice(1);ms.appendChild(o);});
  ms.value=curMonth;
}

let presYear;
let panelMode='mes';
let movFiltCats=new Set(), movFiltTits=new Set();
function catById(id){ return DB.categorias.find(c=>c.id===id); }
function baseYear(){ return (DB.config&&DB.config.anioBasePresupuesto)||2026; }
function pAnio(p){ return p.anio||baseYear(); }
function presFor(id,year){ return DB.presupuesto.find(p=>p.categoriaId===id && pAnio(p)===year); }
function presYears(){ const s=new Set(DB.presupuesto.map(pAnio)); s.add(new Date().getFullYear()); if(presYear) s.add(presYear); return [...s].sort((a,b)=>b-a); }
function fillPresYear(){
  const sel=$('#presYear'); if(!sel) return;
  sel.innerHTML=''; presYears().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;sel.appendChild(o);});
  sel.value=presYear;
}

function fillCatSelects(){
  const groups={};
  DB.categorias.forEach(c=>{(groups[c.grupo]=groups[c.grupo]||[]).push(c);});
  const sel=$('#movCat'); if(sel){ sel.innerHTML='';
    Object.keys(groups).sort().forEach(g=>{
      const og=document.createElement('optgroup');og.label=g;
      groups[g].forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.nombre;og.appendChild(o);});
      sel.appendChild(og);
    }); }
  renderCatDD();
}
function renderCatDD(){
  const p=$('#catDDpanel'); if(!p) return;
  const groups={};
  DB.categorias.forEach(c=>{(groups[c.grupo]=groups[c.grupo]||[]).push(c);});
  let html='<label style="font-weight:700"><input type="checkbox" id="catDDall">Todas / ninguna</label>';
  Object.keys(groups).sort().forEach(g=>{
    html+='<div class="g">'+g+'</div>';
    groups[g].forEach(c=>{ const ck=movFiltCats.has(c.id)?'checked':''; html+='<label><input type="checkbox" class="catCk" value="'+c.id+'" '+ck+'>'+c.nombre+'</label>'; });
  });
  p.innerHTML=html; updateCatDDbtn();
}
function updateCatDDbtn(){ const b=$('#catDDbtn'); if(b) b.textContent='Categorías'+(movFiltCats.size?' ('+movFiltCats.size+')':'')+' ▾'; }
function fillGrupoList(){
  const dl=$('#grupoList'); dl.innerHTML='';
  [...new Set(DB.categorias.map(c=>c.grupo))].sort().forEach(g=>{const o=document.createElement('option');o.value=g;dl.appendChild(o);});
}

function monthMovs(){
  const pref = curYear+'-'+String(curMonth+1).padStart(2,'0');
  return DB.movimientos.filter(m=>m.fecha.startsWith(pref));
}
function semClass(ratio){ return ratio<=1?'g':ratio<=1.1?'a':'r'; }
function barColor(cls){ return cls==='g'?'var(--green)':cls==='a'?'var(--amber)':'var(--red)'; }

/* ----- PANEL ----- */
function renderPanel(){
  const isYear = panelMode==='anio';
  const bm=$('#mModeMes'), ba=$('#mModeAnio'); if(bm)bm.classList.toggle('on',!isYear); if(ba)ba.classList.toggle('on',isYear);
  const mm=$('#mMonth'); if(mm){ mm.disabled=isYear; mm.style.opacity=isYear?0.45:1; }
  const suf = isYear?'del año':'del mes';
  $('#panelTitle').textContent='Panel · '+(isYear? curYear : (MESES[curMonth].replace(/^./,c=>c.toUpperCase())+' '+curYear));
  const bh=$('#panelBudgetH'); if(bh) bh.textContent='Seguimiento del presupuesto ('+(isYear?'año':'mes')+')';
  const pref = isYear? (''+curYear) : (curYear+'-'+String(curMonth+1).padStart(2,'0'));
  const movs = DB.movimientos.filter(m=>m.fecha.startsWith(pref));
  const ing=movs.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+num(m.importe),0);
  const gas=movs.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+num(m.importe),0);
  const ahorro=ing-gas;
  const mult = isYear?12:1;
  let presGasto=0, presIng=0;
  DB.presupuesto.filter(p=>pAnio(p)===curYear).forEach(p=>{const c=catById(p.categoriaId); if(!c)return; const v=mensual(p)*mult; if(c.tipo==='gasto') presGasto+=v; else presIng+=v;});
  const cards=[
    {l:'Ingresos '+suf,v:fmt(ing),s:'Presupuesto: '+fmt(presIng),cls:'pos'},
    {l:'Gastos '+suf,v:fmt(gas),s:'Presupuesto: '+fmt(presGasto),cls:'neg'},
    {l:'Ahorro '+suf,v:fmt(ahorro),s:'Previsto: '+fmt(presIng-presGasto),cls:ahorro>=0?'pos':'neg'},
    {l:'Gasto vs presupuesto',v:(presGasto?Math.round(gas/presGasto*100):0)+'%',s:fmt(gas)+' de '+fmt(presGasto),cls:''},
  ];
  $('#panelCards').innerHTML=cards.map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div><div class="sub">${c.s}</div></div>`).join('');

  // seguimiento por grupo (solo gastos)
  const groups={};
  DB.categorias.filter(c=>c.tipo==='gasto').forEach(c=>{
    const p=presFor(c.id,curYear); const pres=(p?mensual(p):0)*mult;
    const real=movs.filter(m=>m.categoriaId===c.id&&m.tipo==='gasto').reduce((s,m)=>s+num(m.importe),0);
    const g=groups[c.grupo]=groups[c.grupo]||{pres:0,real:0};
    g.pres+=pres; g.real+=real;
  });
  const rows=Object.keys(groups).sort().map(g=>{
    const o=groups[g]; const ratio=o.pres?o.real/o.pres:(o.real?2:0); const cls=semClass(ratio);
    const pct=o.pres?Math.min(100,Math.round(o.real/o.pres*100)):0;
    const dev=o.pres-o.real;
    return `<tr><td><b>${g}</b></td><td class="num">${fmt(o.pres)}</td><td class="num">${fmt(o.real)}</td>
      <td class="num ${dev>=0?'pos':'neg'}">${dev>=0?'+':''}${fmt(dev)}</td>
      <td><div class="bar"><i style="width:${pct}%;background:${barColor(cls)}"></i></div></td>
      <td><span class="pill ${cls}">${o.pres?Math.round(o.real/o.pres*100):0}%</span></td></tr>`;
  }).join('');
  const tot=Object.values(groups).reduce((a,o)=>({pres:a.pres+o.pres,real:a.real+o.real}),{pres:0,real:0});
  const totDev=tot.pres-tot.real;
  $('#panelBudget').innerHTML = rows? `<table><thead><tr><th>Grupo</th><th class="num">Presupuesto</th><th class="num">Realizado</th><th class="num">Desviación</th><th>Consumo</th><th>%</th></tr></thead><tbody>${rows}
    <tr style="font-weight:700"><td>TOTAL</td><td class="num">${fmt(tot.pres)}</td><td class="num">${fmt(tot.real)}</td><td class="num ${totDev>=0?'pos':'neg'}">${totDev>=0?'+':''}${fmt(totDev)}</td><td></td><td><span class="pill ${semClass(tot.pres?tot.real/tot.pres:0)}">${tot.pres?Math.round(tot.real/tot.pres*100):0}%</span></td></tr>
    </tbody></table>` : '<div class="empty">No hay categorías de gasto.</div>';
  if(typeof renderPanelDash==='function')renderPanelDash();
}

/* ----- MOVIMIENTOS ----- */
let movTipo='gasto';
function renderMovs(){
  const txt=$('#fltText').value.toLowerCase().trim();
  const desde=$('#fltDesde').value, hasta=$('#fltHasta').value;
  let list=DB.movimientos.slice();
  if(desde) list=list.filter(m=>m.fecha>=desde);
  if(hasta) list=list.filter(m=>m.fecha<=hasta);
  if(movFiltCats.size) list=list.filter(m=>movFiltCats.has(m.categoriaId));
  if(movFiltTits.size) list=list.filter(m=>movFiltTits.has(m.titular));
  if(txt) list=list.filter(m=>((m.concepto||'')+' '+(m.comercio||'')).toLowerCase().includes(txt));
  const ord=($('#fltOrden')||{}).value||'fecha_desc';
  list.sort((a,b)=>{
    if(ord==='fecha_asc') return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0;
    if(ord==='imp_desc') return num(b.importe)-num(a.importe);
    if(ord==='imp_asc') return num(a.importe)-num(b.importe);
    return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:0;
  });
  const ing=list.filter(m=>m.tipo==='ingreso').reduce((x,m)=>x+num(m.importe),0);
  const gas=list.filter(m=>m.tipo==='gasto').reduce((x,m)=>x+num(m.importe),0);
  const neto=ing-gas;
  $('#movCards').innerHTML=[
    {l:'Ingresos (filtro)',v:fmt(ing),cls:'pos'},
    {l:'Gastos (filtro)',v:fmt(gas),cls:'neg'},
    {l:'Resultado neto',v:fmt(neto),cls:neto>=0?'pos':'neg'}
  ].map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div></div>`).join('');
  $('#movCount').textContent = list.length+' mov.';
  if(!list.length){ $('#movTable').innerHTML='<div class="empty">No hay movimientos con los filtros aplicados.</div>'; return; }
  const rows=list.map(m=>{
    const c=catById(m.categoriaId);
    const eff = (m.tipo==='ingreso'? num(m.importe) : -num(m.importe));
    const signed = (eff>=0?'+':'−')+fmt(Math.abs(eff));
    return `<tr>
      <td>${ddmmyyyy(m.fecha)}</td>
      <td>${m.concepto||''}${m.comercio?` <span class="muted">· ${m.comercio}</span>`:''}</td>
      <td><span class="tag">${c?c.nombre:'—'}</span></td>
      <td>${m.titular||''}</td>
      <td class="num ${eff>=0?'pos':'neg'}">${signed}</td>
      <td class="right"><div class="row-actions" style="justify-content:flex-end">
        <button class="btn ghost sm" data-edit="${m.id}">Editar</button>
        <button class="btn danger sm" data-del="${m.id}">✕</button></div></td>
    </tr>`;
  }).join('');
  $('#movTable').innerHTML=`<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Titular</th><th class="num">Importe</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function editMov(id){
  const m=DB.movimientos.find(x=>x.id===id); if(!m)return;
  $('#movId').value=m.id; $('#movFecha').value=m.fecha; $('#movConcepto').value=m.concepto||'';
  $('#movComercio').value=m.comercio||''; $('#movCat').value=m.categoriaId; $('#movTitular').value=m.titular||'Dos';
  $('#movImporte').value=m.importe; setMovTipo(m.tipo);
  $('#movSubmit').textContent='Guardar cambios'; $('#movCancel').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}
function resetMovForm(){
  $('#movForm').reset(); $('#movId').value=''; setMovTipo('gasto');
  $('#movFecha').value = curYear+'-'+String(curMonth+1).padStart(2,'0')+'-'+String(Math.min(new Date().getDate(),28)).padStart(2,'0');
  $('#movSubmit').textContent='Añadir'; $('#movCancel').style.display='none';
}
function setMovTipo(t){ movTipo=t; $$('#movTipoSeg button').forEach(b=>b.classList.toggle('on',b.dataset.t===t)); }

/* ----- PRESUPUESTO ----- */
function renderPres(){
  const groups={};
  DB.categorias.forEach(c=>{(groups[c.grupo]=groups[c.grupo]||[]).push(c);});
  let totMensGasto=0,totMensIng=0;
  const order=Object.keys(groups).sort((a,b)=> a==='Ingresos'?-1:b==='Ingresos'?1:a.localeCompare(b));
  const blockOf=(g)=>{
    let gm=0;
    const rows=groups[g].map(c=>{
      const p=presFor(c.id,presYear)||{importe:0,frecuencia:'mensual',metodoPago:'',renovacion:''};
      const m=mensual(p); gm+=m;
      if(c.tipo==='gasto') totMensGasto+=m; else totMensIng+=m;
      const fr={mensual:'Mensual',anual:'Anual',bianual:'Bianual'}[p.frecuencia]||p.frecuencia;
      return `<tr>
        <td>${c.nombre} ${c.tipo==='ingreso'?'<span class="tag in">ingreso</span>':''}</td>
        <td class="num">${fmt(num(p.importe))}</td>
        <td>${fr}</td>
        <td class="num">${fmt(m)}</td>
        <td class="num">${fmt(anual(p))}</td>
        <td>${p.metodoPago||'<span class="muted">—</span>'}</td>
        <td>${p.renovacion? p.renovacion.split('-').reverse().join('/'):'<span class="muted">—</span>'}</td>
        <td class="right"><button class="btn ghost sm" data-cat="${c.id}">Editar</button></td>
      </tr>`;
    }).join('');
    return `<tr class="grp-row${g==='Ingresos'?' r-amar':''}"><td colspan="3">${g}</td><td class="num">${fmt(gm)}</td><td class="num">${fmt(gm*12)}</td><td colspan="3"></td></tr>${rows}`;
  };
  const blocks=order.map(blockOf);
  const sumRows=`<tr class="grp-row r-amar"><td colspan="3">TOTAL GASTOS</td><td class="num">${fmt(totMensGasto)}</td><td class="num">${fmt(totMensGasto*12)}</td><td colspan="3"></td></tr><tr class="grp-row r-verde"><td colspan="3">AHORRO PREVISTO</td><td class="num">${fmt(totMensIng-totMensGasto)}</td><td class="num">${fmt((totMensIng-totMensGasto)*12)}</td><td colspan="3"></td></tr>`;
  let html=''; let inserted=false;
  order.forEach((g,i)=>{ html+=blocks[i]; if(g==='Ingresos'){ html+=sumRows; inserted=true; } });
  if(!inserted) html=sumRows+html;
  $('#presTable').innerHTML=`<table><thead><tr><th>Categoría</th><th class="num">Importe</th><th>Frecuencia</th><th class="num">Mensual</th><th class="num">Anual</th><th>Pago</th><th>Renovación</th><th></th></tr></thead><tbody>${html}</tbody></table>`;
  $('#presTotals').innerHTML = `<b>${presYear}</b> · Ingresos: <b class="pos">${fmt(totMensIng)}</b>/mes · Gastos: <b class="neg">${fmt(totMensGasto)}</b>/mes · Ahorro previsto: <b>${fmt(totMensIng-totMensGasto)}</b>/mes (${fmt((totMensIng-totMensGasto)*12)}/año)`;
}

/* ============ Patrimonio ============ */
function patSnaps(){ return [...(DB.patrimonio||[])].sort((a,b)=> a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0); }
function snapTot(s){ let ef=0,inv=0; (s.lineas||[]).forEach(l=>{ef+=num(l.ef);inv+=num(l.inv);}); return {ef,inv,total:ef+inv}; }
function ddmmyyyy(f){ return f.split('-').reverse().join('/'); }

function renderPat(){
  const snaps=patSnaps();
  const obj=(DB.config&&DB.config.objetivoReparto!=null)?DB.config.objetivoReparto:0.5;
  const cardsEl=$('#patCards'), repEl=$('#patReparto');
  if(!snaps.length){
    cardsEl.innerHTML='<div class="empty">Aún no hay registros de patrimonio. Añade uno abajo o importa tu histórico.</div>';
    repEl.innerHTML=''; $('#patEvol').textContent='';
    const cv=$('#patChart'); if(cv){const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);}
    renderPatCuentas(); renderPatForm(); renderPatList(); return;
  }
  const last=snaps[snaps.length-1], first=snaps[0];
  const t=snapTot(last), tf=snapTot(first);
  const prev = snaps.length>1? snapTot(snaps[snaps.length-2]) : null;
  const pctInv = t.total? t.inv/t.total : 0;
  const rendIni = tf.total? (t.total-tf.total)/tf.total : 0;
  const rendPrev = prev&&prev.total? (t.total-prev.total)/prev.total : 0;
  cardsEl.innerHTML=[
    {l:'Patrimonio total',v:fmt(t.total),s:ddmmyyyy(last.fecha),cls:''},
    {l:'Efectivo',v:fmt(t.ef),s:Math.round((1-pctInv)*100)+'% del total',cls:''},
    {l:'Invertido',v:fmt(t.inv),s:Math.round(pctInv*100)+'% del total',cls:''},
    {l:'Rendimiento vs inicio',v:(rendIni>=0?'+':'')+(rendIni*100).toFixed(1)+'%',s:'vs anterior: '+(rendPrev>=0?'+':'')+(rendPrev*100).toFixed(1)+'%',cls:rendIni>=0?'pos':'neg'}
  ].map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div><div class="sub">${c.s}</div></div>`).join('');
  const pInv=Math.round(pctInv*100), pEf=100-pInv, oInv=Math.round(obj*100);
  repEl.innerHTML=`<div class="card"><div class="lbl">Reparto efectivo / invertido</div>
    <div class="bar" style="height:18px;margin-top:8px;display:flex">
      <i style="width:${pEf}%;background:var(--brand)"></i><i style="width:${pInv}%;background:var(--green)"></i></div>
    <div class="sub" style="margin-top:6px">Efectivo ${pEf}% · Invertido ${pInv}% &nbsp;|&nbsp; objetivo invertido
      <input type="number" id="patObj" min="0" max="100" value="${oInv}" style="width:62px;padding:4px;border:1px solid var(--line);border-radius:6px">%</div></div>`;
  drawPatChart(snaps);
  $('#patEvol').textContent=snaps.length+' registros · desde '+ddmmyyyy(first.fecha)+' ('+fmt(tf.total)+') hasta '+ddmmyyyy(last.fecha)+' ('+fmt(t.total)+')';
  renderPatCuentas(); renderPatForm(); renderPatList();
}

function drawPatChart(snaps){
  const cv=$('#patChart'); if(!cv) return;
  const ctx=cv.getContext('2d');
  const W=cv.width=cv.clientWidth||700, H=cv.height=220;
  ctx.clearRect(0,0,W,H);
  const pad={l:8,r:8,t:14,b:18};
  const vals=snaps.map(s=>snapTot(s).total);
  const max=Math.max(...vals), min=Math.min(...vals,0);
  const n=snaps.length;
  const X=i=> pad.l + (W-pad.l-pad.r)*(n<=1?0.5:i/(n-1));
  const Y=v=> pad.t + (H-pad.t-pad.b)*(1-(v-min)/((max-min)||1));
  ctx.beginPath(); ctx.moveTo(X(0),Y(vals[0]));
  for(let i=1;i<n;i++) ctx.lineTo(X(i),Y(vals[i]));
  ctx.lineTo(X(n-1),H-pad.b); ctx.lineTo(X(0),H-pad.b); ctx.closePath();
  ctx.fillStyle='rgba(37,99,235,.10)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(X(0),Y(vals[0]));
  for(let i=1;i<n;i++) ctx.lineTo(X(i),Y(vals[i]));
  ctx.strokeStyle='#2563eb'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#6b7280'; ctx.font='10px sans-serif'; ctx.textAlign='center';
  const seen={};
  snaps.forEach((s,i)=>{ const yr=s.fecha.slice(0,4); if(!seen[yr]){seen[yr]=1; ctx.fillText(yr, X(i), H-5);} });
}

function renderPatForm(){
  const el=$('#patFormFields'); if(!el) return;
  const today=new Date().toISOString().slice(0,10);
  let html='<label>Fecha<input type="date" id="patFecha" value="'+today+'"></label>';
  DB.cuentas.forEach(c=>{
    html+='<label>'+c.nombre+' · efectivo<input type="number" step="0.01" class="patEf" data-c="'+c.id+'" placeholder="0"></label>';
    html+='<label>'+c.nombre+' · invertido<input type="number" step="0.01" class="patInv" data-c="'+c.id+'" placeholder="0"></label>';
  });
  el.innerHTML=html;
}
function renderPatList(){
  const snaps=patSnaps().reverse();
  if(!snaps.length){ $('#patList').innerHTML=''; return; }
  const rows=snaps.map(s=>{ const t=snapTot(s); return `<tr>
    <td>${ddmmyyyy(s.fecha)}</td><td class="num">${fmt(t.ef)}</td><td class="num">${fmt(t.inv)}</td>
    <td class="num"><b>${fmt(t.total)}</b></td><td class="num">${t.total?Math.round(t.inv/t.total*100):0}%</td>
    <td class="right"><button class="btn danger sm" data-delsnap="${s.id}">✕</button></td></tr>`;}).join('');
  $('#patList').innerHTML=`<table><thead><tr><th>Fecha</th><th class="num">Efectivo</th><th class="num">Invertido</th><th class="num">Total</th><th class="num">% Inv.</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function addSnapshot(){
  const fE=$('#patFecha'); const fecha=fE?fE.value:''; if(!fecha){alert('Pon una fecha');return;}
  const efs=$$('.patEf'), invs=$$('.patInv');
  const lineas=DB.cuentas.map(c=>{
    const ef=num((efs.find(i=>i.dataset.c===c.id)||{}).value);
    const inv=num((invs.find(i=>i.dataset.c===c.id)||{}).value);
    return {cuentaId:c.id, ef, inv};
  });
  DB.patrimonio=DB.patrimonio||[];
  const ex=DB.patrimonio.find(s=>s.fecha===fecha);
  if(ex){ if(!confirm('Ya hay un registro en esa fecha. ¿Reemplazarlo?'))return; ex.lineas=lineas; }
  else DB.patrimonio.push({id:uid(),fecha,lineas});
  renderPat(); scheduleSave();
}
function importPatrimonio(file){
  file.text().then(txt=>{
    let data; try{ data=JSON.parse(txt); }catch(e){ alert('JSON no válido'); return; }
    const arr=Array.isArray(data)?data:(data.patrimonio||[]);
    if(!arr.length){ alert('El archivo no contiene registros de patrimonio'); return; }
    const byName={}; DB.cuentas.forEach(c=>byName[c.nombre.toLowerCase()]=c.id);
    function cid(nombre){ const k=(nombre||'').toLowerCase(); if(byName[k])return byName[k]; const id=uid(); DB.cuentas.push({id,nombre:nombre||'Cuenta',tipo:'otro',naturaleza:'efectivo',saldoInicial:0}); byName[k]=id; return id; }
    DB.patrimonio = arr.map(s=>({ id:uid(), fecha:s.fecha, lineas:(s.lineas||[]).map(l=> l.cuentaId? {cuentaId:l.cuentaId,ef:num(l.ef),inv:num(l.inv)} : {cuentaId:cid(l.cuenta),ef:num(l.ef),inv:num(l.inv)}) }));
    renderPat(); saveNow(); alert('Importados '+DB.patrimonio.length+' registros de patrimonio.');
  });
}

function renderPatCuentas(){
  const el=$('#patCuentas'); if(!el) return;
  if(!DB.cuentas.length){ el.innerHTML='<span class="muted">No hay cuentas todavía.</span>'; return; }
  el.innerHTML=DB.cuentas.map(c=>`<span class="tag" style="margin:3px 6px 3px 0;display:inline-flex;align-items:center;gap:6px">${c.nombre}<button class="btn danger sm" data-delcuenta="${c.id}" style="padding:0 6px">✕</button></span>`).join('');
}
function addCuenta(){
  const n=prompt('Nombre de la nueva cuenta (p. ej. Bankinter):'); if(n===null) return;
  const nombre=n.trim(); if(!nombre) return;
  if(DB.cuentas.some(c=>c.nombre.toLowerCase()===nombre.toLowerCase())){ alert('Ya existe una cuenta con ese nombre.'); return; }
  DB.cuentas.push({id:uid(),nombre,tipo:'banco',naturaleza:'efectivo',saldoInicial:0});
  renderPat(); scheduleSave();
}
function delCuenta(id){
  const c=DB.cuentas.find(x=>x.id===id); if(!c) return;
  const used=(DB.patrimonio||[]).some(s=>(s.lineas||[]).some(l=>l.cuentaId===id && (num(l.ef)||num(l.inv))));
  if(!confirm('¿Eliminar la cuenta "'+c.nombre+'"?'+(used?' Tiene importes en registros de patrimonio que se quitarán.':''))) return;
  DB.cuentas=DB.cuentas.filter(x=>x.id!==id);
  (DB.patrimonio||[]).forEach(s=>{ s.lineas=(s.lineas||[]).filter(l=>l.cuentaId!==id); });
  renderPat(); scheduleSave();
}
/* ============ Proyección (modelo KH&Claude) ============ */
function proyDefaults(){
  if(!DB.config)DB.config={};
  const p=DB.config.proyeccion;
  if(p && p.modeloEvo2){ if(!p.aportaciones)p.aportaciones={}; if(!p.eventos)p.eventos=[]; if(p.anioTrasJub==null)p.anioTrasJub=2039; return; }
  const yr=new Date().getFullYear();
  const inv=DB.inversiones||[];
  let cartera=0,coste=0,divB=0;
  inv.forEach(x=>{cartera+=num(x.acciones)*num(x.precioActual); coste+=num(x.acciones)*num(x.precioCompra); divB+=num(x.acciones)*num(x.divAccion);});
  const snaps=patSnaps(); const last=snaps.length?snapTot(snaps[snaps.length-1]):{ef:0,inv:0};
  if(!cartera) cartera=last.inv||354620;
  if(!coste) coste=169916;
  if(!divB) divB=14151;
  const byName={}; DB.categorias.forEach(c=>byName[c.nombre]=c);
  const mes=(n)=>{const c=byName[n]; if(!c)return 0; const pp=presFor(c.id,yr); return pp?mensual(pp):0;};
  const nominaMes=mes('Nómina Carlos')+mes('Nómina Susana')+mes('Pagas Extra');
  let gastosAnu=0; DB.presupuesto.filter(x=>pAnio(x)===yr).forEach(x=>{const c=DB.categorias.find(cc=>cc.id===x.categoriaId); if(c&&c.tipo==='gasto')gastosAnu+=anual(x);});
  DB.config.proyeccion={ modeloEvo2:true, anioBase:yr, edadActual:55, edadFin:90, edadFinAportar:70,
    efectivo:Math.round(last.ef)||9000, invertidoCoste:Math.round(coste), carteraInicial:Math.round(cartera),
    dividendoBruto:Math.round(divB), nominaMes:Math.round(nominaMes)||5675, gastoMes:Math.round(gastosAnu/12)||3450,
    crecCartera:0.04, crecDividendo:0.025, rpdNuevas:0.05, inflacionNomina:0.025, crecAhorro:0.01, anioTrasJub:2039,
    aportacionDefault:25000, aportaciones:{}, eventos:[] };
  scheduleSave();
}
function computeProy(c){
  const N=Math.max(0,Math.round(c.edadFin-c.edadActual));
  const Sof=(anio,edad)=>{const ap=c.aportaciones||{}; if(ap[anio]!=null&&ap[anio]!=='')return num(ap[anio]); return edad<=c.edadFinAportar?num(c.aportacionDefault):0;};
  const Tof=(anio)=>{let t=0,con=''; (c.eventos||[]).forEach(e=>{if(parseInt(e.anio,10)===anio){t+=num(e.importe); con=con?con+', '+(e.concepto||''):(e.concepto||'');}}); return{t,con};};
  const gC=1+num(c.crecCartera), gD=1+num(c.crecDividendo), gN=1+num(c.inflacionNomina), gA=1+num(c.crecAhorro), rpdN=num(c.rpdNuevas);
  let Ef=num(c.efectivo), I=num(c.invertidoCoste), C=num(c.carteraInicial), Div=num(c.dividendoBruto), Nom=num(c.nominaMes);
  let AN=(num(c.nominaMes)-num(c.gastoMes))*12; if(AN<0)AN=0;
  const yJub=num(c.anioTrasJub)||2039;
  let prevR=0,prevT=0,prevS=0;
  const yrNow=new Date().getFullYear(); const LV=(typeof carteraLive==='function'?carteraLive():0);
  const out=[];
  for(let i=0;i<=N;i++){
    const edad=Math.round(c.edadActual)+i, anio=Math.round(c.anioBase)+i;
    const S=Sof(anio,edad); const ev=Tof(anio); const T=ev.t; const trasJub=anio>=yJub;
    if(i>0){
      Nom=Nom*gN; AN=AN*gA;
      Div=Div*gD + prevS*rpdN;
      I=I+prevS;
      C=C*gC+prevS;
      Ef=Ef+((anio-1)<yJub?prevR:0)-prevT;
    }
    const Q=AN+Div; const R=Q-S; const patrim=C+Ef;
    const dividendoMes=Div/12; const rentaMes=dividendoMes+Nom; let dispMes=rentaMes-R/12-S/12; if(trasJub) dispMes=dispMes+R/12;
    const _cr=anio<yrNow?carteraAtClose(anio):(anio===yrNow?LV:null); const _crv=(_cr!=null&&_cr>0)?_cr:null;
    const _efR=(anio<=yrNow)?efectivoRealAt(anio):null;
    const _patR=(_crv!=null)?(_crv+(_efR!=null?_efR:Ef)):null;
    out.push({anio,edad,trasJub,efectivo:Ef,invertido:I,cartera:C,carteraReal:_crv,patrimonio:patrim,patrimonioReal:_patR,efectivoReal:(_patR!=null?(_efR!=null?_efR:Ef):null),dividendoAnual:Div,dividendoMes,ahorroTotal:Q,aInversion:S,aEfectivo:R,nominaMes:Nom,rentaMes,disponibleMes:dispMes,gasto:T,gastoCon:ev.con,plusvalia:C-I});
    prevR=R; prevT=T; prevS=S;
  }
  return out;
}
function renderProyParams(c){
  const el=$('#proyParams'); if(!el) return; const pc=x=>+(x*100).toFixed(2);
  const f=[
    ['edadActual','Edad actual',c.edadActual,'1',0],
    ['anioBase','Año actual',c.anioBase,'1',0],
    ['edadFin','Edad final',c.edadFin,'1',0],
    ['edadFinAportar','Aportar hasta edad',c.edadFinAportar,'1',0],
    ['anioTrasJub','Año tras jubilación (→ a gastos)',Math.round(c.anioTrasJub||2039),'1',0],
    ['efectivo','Efectivo inicial (€)',Math.round(c.efectivo),'100',0],
    ['invertidoCoste','Invertido / coste (€)',Math.round(c.invertidoCoste),'500',0],
    ['carteraInicial','Cartera teórica inicial = cierre 31-dic año prev. (€)',Math.round(c.carteraInicial),'500',0],
    ['dividendoBruto','Dividendo bruto/año (€)',Math.round(c.dividendoBruto),'100',0],
    ['nominaMes','Nómina hogar/mes (con extras)',Math.round(c.nominaMes),'50',0],
    ['gastoMes','Gasto mensual presupuestado (€)',Math.round(c.gastoMes),'50',0],
    ['aportacionDefault','Aportación inversión/año (€)',Math.round(c.aportacionDefault),'500',0],
    ['crecCartera','Revalorización cartera %/año',pc(c.crecCartera),'0.5',1],
    ['crecDividendo','Subida dividendo %/año',pc(c.crecDividendo),'0.1',1],
    ['rpdNuevas','RPD nuevas aportaciones %',pc(c.rpdNuevas),'0.1',1],
    ['inflacionNomina','Subida nómina %/año',pc(c.inflacionNomina),'0.1',1],
    ['crecAhorro','Subida ahorro nóminas %/año',pc(c.crecAhorro),'0.1',1]
  ];
  el.innerHTML=f.map(x=>`<label>${x[1]}<input type="number" step="${x[3]}" data-proy="${x[0]}" data-pct="${x[4]}" value="${x[2]}"></label>`).join('');
}
function renderProyEventos(c){
  const el=$('#proyEventos'); if(!el) return; const evs=c.eventos||[];
  if(!evs.length){ el.innerHTML='<span class="muted">Sin gastos puntuales. Añade uno (p. ej. Coche 2028, Casa 2030).</span>'; return; }
  el.innerHTML='<table><thead><tr><th>Año</th><th>Concepto</th><th class="num">Importe</th><th></th></tr></thead><tbody>'+
    evs.map((ev,i)=>`<tr><td>${ev.anio}</td><td>${ev.concepto||''}</td><td class="num">${fmt(ev.importe)}</td><td class="right"><button class="btn danger sm" data-delev="${i}">✕</button></td></tr>`).join('')+'</tbody></table>';
}
function drawProyChart(ser){
  const cv=$('#proyChart'); if(!cv) return;
  const ctx=cv.getContext('2d'); const W=cv.width=cv.clientWidth||700, H=cv.height=220;
  ctx.clearRect(0,0,W,H); const pad={l:8,r:8,t:14,b:18};
  const vals=ser.map(r=>r.patrimonio); const max=Math.max(...vals), min=Math.min(...vals,0); const n=ser.length;
  const X=i=>pad.l+(W-pad.l-pad.r)*(n<=1?0.5:i/(n-1));
  const Y=v=>pad.t+(H-pad.t-pad.b)*(1-(v-min)/((max-min)||1));
  ctx.beginPath(); ctx.moveTo(X(0),Y(vals[0])); for(let i=1;i<n;i++)ctx.lineTo(X(i),Y(vals[i]));
  ctx.lineTo(X(n-1),H-pad.b); ctx.lineTo(X(0),H-pad.b); ctx.closePath(); ctx.fillStyle='rgba(22,163,74,.10)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(X(0),Y(vals[0])); for(let i=1;i<n;i++)ctx.lineTo(X(i),Y(vals[i]));
  ctx.strokeStyle='#16a34a'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#6b7280'; ctx.font='10px sans-serif'; ctx.textAlign='center';
  ser.forEach((r,i)=>{ if(r.edad%5===0) ctx.fillText(r.edad, X(i), H-5); });
}
function carteraLive(){ var v=0; try{ (typeof invPositions==='function'?invPositions():[]).forEach(function(p){ if(p.acciones>0.0001)v+=num(p.acciones)*num(p.precioActual); }); }catch(e){} return v; }
function carteraAtClose(year){
  // Valor de cartera a cierre del 31-dic de 'year' = Sigma (acciones que tenias ese dia) x (cierre real del repo)
  if(typeof _allOps!=='function' || typeof priceRepoAt!=='function') return 0;
  var cut=Date.UTC(year,11,31); var sh={};
  _allOps().forEach(function(o){ if(!o.fecha)return; var om=Date.parse(o.fecha+'T00:00:00'); if(isNaN(om)||om>cut)return; var t=(o.ticker||'').toUpperCase(); var sg=o.tipo==='venta'?-1:1; sh[t]=(sh[t]||0)+sg*num(o.acciones); });
  var val=0; Object.keys(sh).forEach(function(t){ if(sh[t]>0.0001){ var px=priceRepoAt(t,cut); if(px>0)val+=sh[t]*px; } });
  return val;
}
function efectivoRealAt(year){ var cut=Date.UTC(year,11,31); var snaps=(typeof patSnaps==='function'?patSnaps():[]); var best=null; snaps.forEach(function(s){ if(!s.fecha)return; var sm=Date.parse(s.fecha+'T00:00:00'); if(isNaN(sm)||sm>cut)return; best=s; }); return best?snapTot(best).ef:null; }
function proyColor(real,teor){ if(real==null||!teor||teor<=0)return 'transparent'; var r=real/teor; if(r>=1)return '#dcfce7'; if(r>=0.95)return '#fef9c3'; return '#fee2e2'; }
function proyRefreshBase(c){
  // Ancla de la CARTERA TEORICA = valor de cartera a cierre del 31-dic del ano ANTERIOR al ano base,
  // reconstruido con cotizaciones reales del repo. Es historico y fijo (no se mueve con el mercado).
  var anch=carteraAtClose(num(c.anioBase)-1);
  if(anch>0 && Math.round(anch)!==Math.round(num(c.carteraInicial))){ c.carteraInicial=Math.round(anch); scheduleSave(); }
}
function renderProy(){
  proyDefaults(); const c=DB.config.proyeccion;
  if(typeof cargarPreciosCartera==='function' && typeof _allOps==='function' && typeof _precioCache!=='undefined'){
    const _tt=_allOps().map(o=>(o.ticker||'').toUpperCase()).filter(Boolean);
    if(_tt.some(t=>_precioCache[t]===undefined)){ cargarPreciosCartera().then(()=>renderProy()); }
  }
  proyRefreshBase(c);
  renderProyParams(c);
  const ser=computeProy(c); const fin=ser[ser.length-1];
  const jub=ser.find(r=>r.edad>=c.edadFinAportar)||fin;
  $('#proyCards').innerHTML=[
    {l:'Patrimonio a los '+Math.round(c.edadFin),v:fmt(fin.patrimonio),s:'cartera teórica '+fmt(fin.cartera)},
    {l:'Dividendos/mes a los '+Math.round(c.edadFin),v:fmt(fin.dividendoMes),s:fmt(fin.dividendoAnual)+'/año'},
    {l:'Plusvalía latente a los '+Math.round(c.edadFin),v:fmt(fin.plusvalia),s:'cartera − invertido'},
    {l:'Renta/mes al jubilar ('+Math.round(c.edadFinAportar)+')',v:fmt(jub.rentaMes),s:'dividendos + nómina'}
  ].map(x=>`<div class="card"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="sub">${x.s}</div></div>`).join('');
  drawProyChart(ser); renderProyEventos(c);
  let rows=''; let sepDone=false;
  ser.forEach(r=>{
    if(r.trasJub && !sepDone){ rows+='<tr class="trasjub-sep"><td><b>Tras Jubilación</b></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="num"><b>A Gastos</b></td><td class="num"><b>Disponible/mes</b></td><td></td></tr>'; sepDone=true; }
    rows+=`<tr${r.trasJub?' class="trasjub"':''}>
    <td>${r.anio}</td><td class="num">${r.edad}</td>
    <td class="num">${fmt(r.efectivo)}</td>
    <td class="num">${r.efectivoReal!=null?fmt(r.efectivoReal):'—'}</td>
    <td class="num">${fmt(r.invertido)}</td>
    <td class="num">${fmt(r.cartera)}</td>
    <td class="num">${r.carteraReal!=null?fmt(r.carteraReal):'—'}</td>
    <td class="num"><b>${fmt(r.patrimonio)}</b></td>
    <td class="num"${r.patrimonioReal!=null?` style="background:${proyColor(r.patrimonioReal,r.patrimonio)};font-weight:700"`:''}>${r.patrimonioReal!=null?fmt(r.patrimonioReal):'—'}</td>
    <td class="num">${fmt(r.dividendoAnual)}</td>
    <td class="num">${fmt(r.ahorroTotal)}</td>
    <td class="num"><input type="number" step="500" class="aporInput" data-anio="${r.anio}" value="${Math.round(r.aInversion)}" style="width:56px;padding:2px;border:1px solid var(--line);border-radius:6px;text-align:right;font-size:11px"></td>
    <td class="num ${r.aEfectivo>=0?'':'neg'}">${fmt(r.aEfectivo)}</td>
    <td class="num">${fmt(r.disponibleMes)}</td>
    <td>${r.gasto?'<span class="neg">−'+fmt(r.gasto)+'</span> '+(r.gastoCon||''):''}</td>
  </tr>`; });
  $('#proyTabla').innerHTML=`<style>#proyTabla table{font-size:10px}#proyTabla th{padding:3px 5px}#proyTabla td{padding:3px 5px;white-space:nowrap}#proyTabla th:nth-child(-n+2),#proyTabla td:nth-child(-n+2){font-size:10px;padding:2px 3px;width:30px}#proyTabla td:nth-child(1){white-space:normal}#proyTabla th:nth-child(3),#proyTabla td:nth-child(3){display:none}</style><table><thead><tr><th>Año</th><th class="num">Edad</th><th class="num">Efectivo</th><th class="num">Efectivo real</th><th class="num">Invertido</th><th class="num">Cartera teórica</th><th class="num">Cartera real</th><th class="num">Patrimonio teórico</th><th class="num">Patrimonio real</th><th class="num">Dividendo/año</th><th class="num">Ahorro/año</th><th class="num">A Inversión</th><th class="num">A Efectivo</th><th class="num">Disponible/mes</th><th>Gasto puntual</th></tr></thead><tbody>${rows}</tbody></table><div style="font-size:11px;color:#64748b;margin-top:6px">Patrimonio real (años ya vividos) vs objetivo teórico: <span style="background:#dcfce7;padding:1px 6px;border-radius:4px">≥ objetivo</span> <span style="background:#fef9c3;padding:1px 6px;border-radius:4px">95–100%</span> <span style="background:#fee2e2;padding:1px 6px;border-radius:4px">por debajo</span></div>`;
}
function addEvento(){
  const a=prompt('Año del gasto (p. ej. 2030):'); if(a===null) return; const anio=parseInt(a,10); if(!anio) return;
  const concepto=prompt('Concepto (p. ej. Casa):')||'';
  const im=prompt('Importe (€):'); const importe=num(im); if(!importe) return;
  DB.config.proyeccion.eventos=DB.config.proyeccion.eventos||[];
  DB.config.proyeccion.eventos.push({anio,concepto,importe});
  renderProy(); scheduleSave();
}
/* ============ Amalia (reembolsables) ============ */
function amaliaSorted(){ return [...(DB.amalia||[])].sort((a,b)=> a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0); }
function amaliaSaldo(){ let s=0; (DB.amalia||[]).forEach(e=>{ s += e.tipo==='gasto'? num(e.importe) : -num(e.importe); }); return s; }
function renderAmalia(){
  const fE=$('#amaFecha'); if(fE && !fE.value) fE.value=new Date().toISOString().slice(0,10);
  const saldo=amaliaSaldo();
  $('#amaCards').innerHTML=`<div class="card"><div class="lbl">Saldo pendiente (Amalia debe)</div><div class="val ${saldo>0.005?'neg':'pos'}">${fmt(saldo)}</div><div class="sub">${(DB.amalia||[]).length} apuntes</div></div>`;
  const list=amaliaSorted();
  if(!list.length){ $('#amaList').innerHTML='<div class="empty">Sin apuntes. Añade un gasto o un reembolso.</div>'; return; }
  let run=0;
  const rowsArr=list.map(e=>{ run += e.tipo==='gasto'? num(e.importe):-num(e.importe);
    const signed=e.tipo==='gasto'? '+'+fmt(e.importe):'−'+fmt(e.importe);
    return `<tr><td>${ddmmyyyy(e.fecha)}</td><td>${e.concepto||''}${e.nota?` <span class="muted">· ${e.nota}</span>`:''}</td>
      <td><span class="tag ${e.tipo==='reembolso'?'in':''}">${e.tipo==='gasto'?'Gasto':'Reembolso'}</span></td>
      <td class="num ${e.tipo==='gasto'?'neg':'pos'}">${signed}</td>
      <td class="num"><b>${fmt(run)}</b></td>
      <td class="right"><button class="btn danger sm" data-delama="${e.id}">✕</button></td></tr>`;});
  const ord=($('#amaOrden')||{}).value||'desc';
  const rows=(ord==='desc'?rowsArr.slice().reverse():rowsArr).join('');
  $('#amaList').innerHTML=`<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th class="num">Importe</th><th class="num">Saldo</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function addAmalia(){
  const fecha=$('#amaFecha').value; if(!fecha){alert('Pon una fecha');return;}
  const importe=num($('#amaImporte').value); if(!importe){alert('Pon un importe');return;}
  DB.amalia=DB.amalia||[];
  DB.amalia.push({id:uid(),fecha,concepto:$('#amaConcepto').value.trim(),tipo:$('#amaTipo').value,importe,nota:$('#amaNota').value.trim()});
  $('#amaConcepto').value=''; $('#amaImporte').value=''; $('#amaNota').value='';
  renderAmalia(); scheduleSave();
}
function importAmalia(file){
  file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;}
    const arr=Array.isArray(d)?d:(d.amalia||[]); if(!arr.length){alert('El archivo no contiene apuntes');return;}
    DB.amalia=arr.map(e=>({id:uid(),fecha:e.fecha,concepto:e.concepto||'',tipo:e.tipo==='reembolso'?'reembolso':'gasto',importe:num(e.importe),nota:e.nota||''}));
    renderAmalia(); saveNow(); alert('Importados '+DB.amalia.length+' apuntes de Amalia.'); });
}
function renderPresExtras(){
  const sec=document.getElementById('view-presupuesto'); if(!sec)return;
  DB.config=DB.config||{}; const ah=DB.config.ahorro=DB.config.ahorro||{mensual:0,anual:0,tasa:0};
  if(!renderPresExtras._bound){ renderPresExtras._bound=true; document.addEventListener('change',function(e){ const t=e.target; if(t&&t.classList&&t.classList.contains('ahorroInp')&&t.dataset.k){ DB.config=DB.config||{}; DB.config.ahorro=DB.config.ahorro||{mensual:0,anual:0,tasa:0}; DB.config.ahorro[t.dataset.k]=num(t.value); if(typeof saveNow==='function')saveNow(); renderPresExtras(); } }); }
  const now=new Date(); const Y=now.getFullYear(), M=now.getMonth(); const pad=n=>String(n).padStart(2,'0');
  const curPref=Y+'-'+pad(M+1); const pm=new Date(Y,M-1,1); const prevPref=pm.getFullYear()+'-'+pad(pm.getMonth()+1);
  const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  // ----- objetivos de ahorro -----
  let ingM=0,gasM=0,ingY=0,gasY=0;
  (DB.movimientos||[]).forEach(m=>{ const f=m.fecha||'',v=num(m.importe); if(f.slice(0,4)===String(Y)){ if(m.tipo==='ingreso')ingY+=v; else if(m.tipo==='gasto')gasY+=v; } if(f.slice(0,7)===curPref){ if(m.tipo==='ingreso')ingM+=v; else if(m.tipo==='gasto')gasM+=v; } });
  const ahM=ingM-gasM, ahY=ingY-gasY; const tM=ingM?ahM/ingM*100:0, tY=ingY?ahY/ingY*100:0;
  const meta=k=>num(ah[k]);
  const prog=(val,goal)=>{ const pct=goal>0?Math.max(0,Math.min(100,val/goal*100)):0; const col=goal>0?(val>=goal?'var(--green)':val>=goal*0.6?'var(--amber)':'var(--red)'):'#cbd5e1'; return '<div class="bar" style="height:9px;margin-top:6px"><i style="width:'+pct.toFixed(0)+'%;background:'+col+'"></i></div>'; };
  const inp=(k,suf)=>`Meta: <input type="number" step="0.01" class="ahorroInp" data-k="${k}" value="${ah[k]||''}" style="width:88px;text-align:right;padding:3px 6px;border:1px solid var(--line);border-radius:6px">${suf||''}`;
  const card=(titulo,val,goalK)=>{ const g=meta(goalK); const pct=g>0?(val/g*100):0; return `<div class="card"><div class="lbl">${titulo}</div><div class="val ${val>=0?'pos':'neg'}">${fmt(val)}</div><div class="sub">${inp(goalK)} ${g>0?'· '+pct.toFixed(0)+'% de la meta':''}</div>${prog(val,g)}</div>`; };
  let aw=document.getElementById('ahorroWrap'); if(!aw){ const h=document.createElement('h3'); h.textContent='Objetivos de ahorro'; aw=document.createElement('div'); aw.id='ahorroWrap'; aw.className='cards'; sec.appendChild(h); sec.appendChild(aw); }
  aw.innerHTML = card('Ahorro este mes ('+MES[M]+' '+Y+')', ahM, 'mensual')
    + card('Ahorro '+Y+' (acumulado)', ahY, 'anual')
    + `<div class="card"><div class="lbl">Tasa de ahorro</div><div class="val ${tM>=0?'pos':'neg'}">${tM.toFixed(0)}%<span class="sub" style="font-weight:400"> este mes · ${tY.toFixed(0)}% año</span></div><div class="sub">${inp('tasa','%')}</div>${prog(tM,meta('tasa'))}</div>`;
  // ----- variación de gasto por categoría -----
  const ct={},cn={}; (DB.categorias||[]).forEach(c=>{ct[c.id]=c.tipo;cn[c.id]=c.nombre;});
  const agg={}; (DB.movimientos||[]).forEach(m=>{ if(ct[m.categoriaId]!=='gasto')return; const f=m.fecha||'',v=num(m.importe); const a=agg[m.categoriaId]=agg[m.categoriaId]||{mc:0,mp:0,yc:0,yp:0}; const ym=f.slice(0,7),y4=f.slice(0,4); if(ym===curPref)a.mc+=v; else if(ym===prevPref)a.mp+=v; if(y4===String(Y))a.yc+=v; else if(y4===String(Y-1))a.yp+=v; });
  const dpc=(cur,prev)=>{ if(prev>0){ const d=(cur/prev-1)*100; return {t:(d>0?'+':'')+d.toFixed(0)+'%', cls:d>0.5?'neg':d<-0.5?'pos':''}; } if(cur>0)return {t:'nuevo',cls:'neg'}; return {t:'·',cls:''}; };
  const ids=Object.keys(agg).filter(id=>agg[id].mc||agg[id].mp||agg[id].yc||agg[id].yp).sort((a,b)=>agg[b].yc-agg[a].yc);
  const rows=ids.map(id=>{ const a=agg[id]; const dm=dpc(a.mc,a.mp), dy=dpc(a.yc,a.yp); return `<tr><td>${cn[id]||id}</td><td class="num">${a.mc?fmt(a.mc):'·'}</td><td class="num">${a.mp?fmt(a.mp):'·'}</td><td class="num ${dm.cls}">${dm.t}</td><td class="num">${a.yc?fmt(a.yc):'·'}</td><td class="num">${a.yp?fmt(a.yp):'·'}</td><td class="num ${dy.cls}">${dy.t}</td></tr>`; }).join('');
  const tot=s=>Object.values(agg).reduce((x,a)=>x+a[s],0); const dmt=dpc(tot('mc'),tot('mp')), dyt=dpc(tot('yc'),tot('yp'));
  const foot=`<tr style="font-weight:700;background:#eef2f7"><td>TOTAL</td><td class="num">${fmt(tot('mc'))}</td><td class="num">${fmt(tot('mp'))}</td><td class="num ${dmt.cls}">${dmt.t}</td><td class="num">${fmt(tot('yc'))}</td><td class="num">${fmt(tot('yp'))}</td><td class="num ${dyt.cls}">${dyt.t}</td></tr>`;
  const head=`<tr><th>Categoría</th><th class="num">${MES[M]} ${Y}</th><th class="num">${MES[pm.getMonth()]}</th><th class="num">Δ mes</th><th class="num">${Y}</th><th class="num">${Y-1}</th><th class="num">Δ año</th></tr>`;
  let vw=document.getElementById('varGastoWrap'); if(!vw){ const h=document.createElement('h3'); h.textContent='Variación de gasto por categoría'; vw=document.createElement('div'); vw.id='varGastoWrap'; vw.style.overflow='auto'; sec.appendChild(h); sec.appendChild(vw); }
  vw.innerHTML = rows ? `<table>${head}${rows}${foot}</table><div class="muted" style="font-size:11px;margin-top:4px">Δ en rojo = el gasto sube respecto al periodo anterior; en verde = baja. El mes y el año en curso aún están incompletos.</div>` : '<div class="empty">Sin gastos registrados.</div>';
}

function renderPresAnalisis(){
  const el=$('#presAnalisis'); if(!el) return;
  const curY=new Date().getFullYear();
  const ys=new Set(DB.presupuesto.map(pAnio));
  DB.movimientos.forEach(m=>ys.add(+m.fecha.slice(0,4)));
  const years=[...ys].sort((a,b)=>a-b);
  const groups=[...new Set(DB.categorias.map(c=>c.grupo))].sort((a,b)=> a==='Ingresos'?-1:b==='Ingresos'?1:a.localeCompare(b));
  const catG={}; DB.categorias.forEach(c=>catG[c.id]=c.grupo);
  const real={};
  DB.movimientos.forEach(m=>{ const g=catG[m.categoriaId]; if(!g)return; const y=+m.fecha.slice(0,4); real[g+'|'+y]=(real[g+'|'+y]||0)+num(m.importe); });
  const pptoFor=(g,y)=>{ let t=0; DB.categorias.filter(c=>c.grupo===g).forEach(c=>{ const p=presFor(c.id,y); if(p)t+=anual(p); }); return t; };
  let head='<tr><th>Clase</th>';
  years.forEach((y,yi)=>{ head+=`<th class="num">${y} Ppto</th>`; if(yi>0) head+=`<th class="num">${y} vs ant.</th>`; head+=`<th class="num">${y} Ejecutado${y===curY?' (en curso)':''}</th><th class="num">${y} %</th>`; });
  head+='</tr>';
  const ingGroups=new Set(DB.categorias.filter(c=>c.tipo==='ingreso').map(c=>c.grupo));
  const totals={}; let body='';
  groups.forEach(g=>{
    let row=`<tr><td><b>${g}</b></td>`;
    years.forEach((y,yi)=>{
      const pp=pptoFor(g,y); const rr=real[g+'|'+y]||0; const pct=pp?Math.round(rr/pp*100):0;
      const cls= pp? (rr/pp<=1?'g':rr/pp<=1.1?'a':'r') : '';
      row+=`<td class="num">${pp?fmt(pp):'—'}</td>`;
      if(yi>0){ const prev=pptoFor(g,years[yi-1]); let cell='—'; if(prev){ const dd=Math.round((pp/prev-1)*100); cell= dd>0?'subió '+dd+'%':dd<0?'bajó '+Math.abs(dd)+'%':'='; } row+=`<td class="num">${cell}</td>`; }
      row+=`<td class="num">${rr?fmt(rr):'—'}</td><td class="num">${pp?`<span class="pill ${cls}">${pct}%</span>`:'—'}</td>`;
      if(!ingGroups.has(g)){ totals[y]=totals[y]||{pp:0,rr:0}; totals[y].pp+=pp; totals[y].rr+=rr; }
    });
    body+=row+'</tr>';
  });
  let tot='<tr style="font-weight:700;background:#fef9c3;color:#c2410c"><td>TOTAL GASTOS</td>';
  years.forEach((y,yi)=>{ const o=totals[y]||{pp:0,rr:0}; const pct=o.pp?Math.round(o.rr/o.pp*100):0;
    tot+=`<td class="num">${fmt(o.pp)}</td>`;
    if(yi>0){ const op=totals[years[yi-1]]||{pp:0}; let cell='—'; if(op.pp){ const dd=Math.round((o.pp/op.pp-1)*100); cell= dd>0?'subió '+dd+'%':dd<0?'bajó '+Math.abs(dd)+'%':'='; } tot+=`<td class="num">${cell}</td>`; }
    tot+=`<td class="num">${fmt(o.rr)}</td><td class="num">${o.pp?pct+'%':'—'}</td>`;
  });
  tot+='</tr>';
  el.innerHTML=`<table><thead>${head}</thead><tbody>${body}${tot}</tbody></table>`;
}
function importPresupuesto(file){
  file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;}
    const arr=Array.isArray(d)?d:(d.presupuesto||[]); if(!arr.length){alert('El archivo no contiene presupuesto');return;}
    if(!confirm('Esto reemplazará el presupuesto actual (todos los años) por el del archivo. Tus movimientos no se tocan. ¿Continuar?')) return;
    const byName={}; DB.categorias.forEach(c=>byName[c.nombre.toLowerCase()]=c.id);
    function cid(n,grupo,tipo){ const k=(n||'').toLowerCase(); if(byName[k])return byName[k]; const id=uid(); DB.categorias.push({id,grupo:grupo||'Otros',nombre:n,tipo:tipo||'gasto'}); byName[k]=id; return id; }
    DB.presupuesto = arr.map(e=>({id:uid(),categoriaId:cid(e.nombre,e.grupo,e.tipo),importe:num(e.importe),frecuencia:e.frecuencia||'anual',metodoPago:e.metodoPago||'',renovacion:e.renovacion||'',anio:+e.anio}));
    fillCatSelects(); fillGrupoList(); renderAll(); saveNow(); alert('Presupuesto importado: '+DB.presupuesto.length+' entradas.');
  });
}
/* ============ Inversiones (operaciones) ============ */
