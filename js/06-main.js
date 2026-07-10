let cmpSel=['','',''];
function cmpScore(a){ if(!a)return null; const cw=(DB.config&&DB.config.anaPesos)||{}; const wA=(cw.a!=null?cw.a:0.35),wB=(cw.b!=null?cw.b:0.20),wC=(cw.c!=null?cw.c:0.30),wD=(cw.d!=null?cw.d:0.15); const RP={AAA:100,AA:90,A:80,BBB:65,BB:50,B:35,CCC:25,CC:20,C:15}; const cl=x=>Math.max(0,Math.min(100,x));
  const cot=num(a.cotizacion),poMin=num(a.poMin),poMax=num(a.poMax),entMax=num(a.entMax); const rating=(a.rating||'').toUpperCase();
  const poMed=(poMin&&poMax)?(poMin+poMax)/2:(poMax||poMin||0); const pot=(cot&&poMed)?(poMed/cot-1):null; const dist=(cot&&entMax)?(cot-entMax)/entMax:null;
  let A=null,B=null,D=null; const C=(rating&&RP[rating]!=null)?RP[rating]:50;
  if(cot&&poMed)A=(pot<=0?0:cl(pot/0.5*100));
  if(dist!=null){ if(dist<=-0.20)B=100; else if(dist<=0)B=70+(-dist/0.20)*30; else if(dist<=0.25)B=70*(1-dist/0.25); else B=0; }
  if(poMin&&poMax&&poMed){ const amp=(poMax-poMin)/poMed; D=cl((0.60-amp)/0.50*100); } else if(poMed)D=100;
  return (A!=null&&B!=null&&D!=null)?(wA*A+wB*B+wC*C+wD*D):null; }
function renderComparador(){ const wrap=$('#cmpTabla'); if(!wrap)return;
  const all=[...new Set((DB.analisis||[]).map(a=>(a.ticker||'').toUpperCase()).filter(Boolean))].sort();
  if(cmpSel.every(x=>!x)){ const rk=all.map(t=>{const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); return {t,s:cmpScore(a)};}).filter(x=>x.s!=null).sort((a,b)=>b.s-a.s); cmpSel=[(rk[0]||{}).t||'',(rk[1]||{}).t||'',(rk[2]||{}).t||'']; }
  [0,1,2].forEach(i=>{ const sel=$('#cmp'+i); if(sel)sel.innerHTML='<option value="">— empresa '+(i+1)+' —</option>'+all.map(t=>`<option value="${t}"${cmpSel[i]===t?' selected':''}>${t}</option>`).join(''); });
  const cols=cmpSel.filter(Boolean);
  if(!cols.length){ wrap.innerHTML='<div class="empty">Elige hasta 3 empresas para compararlas.</div>'; return; }
  cols.forEach(t=>{ if(typeof _tesisCache!=='undefined'&&_tesisCache[t]===undefined&&typeof cargarTesis==='function')cargarTesis(t); });
  const AA={}; cols.forEach(t=>{ AA[t]=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t)||{}; });
  const dcol={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  const poMedOf=a=>{const mn=num(a.poMin),mx=num(a.poMax);return (mn&&mx)?(mn+mx)/2:(mx||mn||0);};
  const lst=arr=>Array.isArray(arr)&&arr.length?('<ul style="margin:0 0 0 15px;padding:0;font-size:11px">'+arr.map(x=>`<li>${x}</li>`).join('')+'</ul>'):'<span class="muted">—</span>';
  const J=t=>(typeof _tesisCache!=='undefined')?_tesisCache[t]:null;
  const row=(label,fn)=>`<tr><th style="text-align:left;vertical-align:top;background:#f8fafc;font-size:11px">${label}</th>${cols.map(t=>`<td style="vertical-align:top;font-size:12px;word-wrap:break-word">${fn(AA[t],J(t),t)}</td>`).join('')}</tr>`;
  let h='<table style="font-size:12px;table-layout:fixed;width:100%"><thead><tr><th style="width:128px"></th>'+cols.map(t=>`<th style="font-size:15px">${t}<div class="muted" style="font-size:9px;font-weight:400">${(typeof SECTOR!=='undefined'&&SECTOR[t])||''}</div></th>`).join('')+'</tr></thead><tbody>';
  h+=row('Score',a=>{const sc=cmpScore(a);const c=sc==null?'#64748b':(sc>=70?'#16a34a':sc>=50?'#d97706':'#dc2626');return sc==null?'—':`<b style="font-size:18px;color:${c}">${sc.toFixed(0)}</b>`;});
  h+=row('Decisión',a=>{const d=(a.decision||'').toUpperCase();return d?`<b style="color:${dcol[d]||'#475569'}">${d}</b>`:'—';});
  h+=row('Rating',a=>a.rating||'—');
  h+=row('Sub-tipo',(a,j,t)=>(typeof SUBTIPO!=='undefined'&&SUBTIPO[t])||'—');
  h+=row('Cotización',a=>fmt(num(a.cotizacion)));
  h+=row('PO bear/base/bull',a=>{const mn=num(a.poMin),mx=num(a.poMax),md=poMedOf(a);return md?`${fmt(mn)} / ${fmt(md)} / ${fmt(mx)}`:'—';});
  h+=row('Potencial',a=>{const cot=num(a.cotizacion),md=poMedOf(a);const p=(cot&&md)?(md/cot-1):null;return p==null?'—':`<b style="color:${p>=0?'#16a34a':'#dc2626'}">${(p>=0?'+':'')+(p*100).toFixed(1)}%</b>`;});
  h+=row('Banda entrada',a=>{const mn=num(a.entMin),mx=num(a.entMax);return mx?`${fmt(mn)} – ${fmt(mx)}`:'—';});
  h+=row('Stop tesis',a=>num(a.stopTesis)?fmt(num(a.stopTesis)):'—');
  h+=row('RPD',a=>{const c=num(a.cotizacion),d=num(a.divAccion);return c?`${(d/c*100).toFixed(2)}%`:'—';});
  h+=row('Moat',(a,j)=>(j&&j.moat)?j.moat:'<span class="muted">—</span>');
  h+=row('Catalizadores',(a,j)=>lst(j&&j.catalizadores));
  h+=row('Riesgos',(a,j)=>lst(j&&j.riesgos));
  h+=row('A favor',(a,j)=>(j&&j.bull)?j.bull:'<span class="muted">—</span>');
  h+=row('En contra',(a,j)=>(j&&j.bear)?j.bear:'<span class="muted">—</span>');
  h+=row('Dossier',(a,j,t)=>{const u=(typeof dossierURL==='function')?dossierURL(t,a.dossierUrl):''; const mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null; return (u?`<a href="${u}" target="_blank" rel="noopener">📄 abrir</a>`:'<span class="muted">—</span>')+(mm!=null?` <span class="muted" style="font-size:9px">${mm}m${mm>12?' ⚠️':''}</span>`:'');});
  h+='</tbody></table>';
  wrap.innerHTML=h;
}
if($('#view-comparador'))$('#view-comparador').addEventListener('change',e=>{ const t=e.target; if(t&&/^cmp[0-2]$/.test(t.id||'')){ cmpSel[+t.id.slice(3)]=t.value; renderComparador(); } });
function renderAll(){ renderRenov(); renderComparador(); renderPanel(); renderMovs(); renderPres(); renderPresAnalisis(); renderPresExtras(); renderPat(); renderProy(); renderAmalia(); renderFondoR4(); if(typeof renderMetas==='function')renderMetas(); renderInv(); if(typeof renderPOS==='function')renderPOS(); renderAnalisis(); renderDividendos(); renderRanking(); renderCalendario(); renderPrevision(); renderSimulador(); renderPlan(); renderPlanLote(); if(typeof renderProxCompra==='function')renderProxCompra(); if(typeof renderBacktest==='function')renderBacktest(); if(typeof renderRiesgo==='function')renderRiesgo(); if(typeof renderFiscalidad==='function')renderFiscalidad(); if(typeof renderAtribucion==='function')renderAtribucion(); if(typeof renderRentabEmpresas==='function')renderRentabEmpresas(); renderGraficas(); renderCaja(); renderMonitor(); renderInformesCenter(); renderMazinger(); }

/* ----- diálogo categoría ----- */
function openCatDlg(id){
  const dlg=$('#catDlg');
  if(id){
    const c=catById(id); const p=presFor(id,presYear)||{};
    $('#catDlgTitle').textContent='Editar categoría · '+presYear;
    $('#catId').value=id; $('#catNombre').value=c.nombre; $('#catGrupo').value=c.grupo; $('#catTipo').value=c.tipo;
    $('#catImporte').value=p.importe||0; $('#catFrec').value=p.frecuencia||'mensual';
    $('#catMetodo').value=p.metodoPago||''; $('#catRenov').value=p.renovacion||'';
    $('#catDelete').style.display='inline-block';
  } else {
    $('#catDlgTitle').textContent='Nueva categoría';
    $('#catId').value=''; $('#catNombre').value=''; $('#catGrupo').value=''; $('#catTipo').value='gasto';
    $('#catImporte').value=0; $('#catFrec').value='mensual'; $('#catMetodo').value=''; $('#catRenov').value='';
    $('#catDelete').style.display='none';
  }
  dlg.showModal();
}
function saveCat(){
  const id=$('#catId').value;
  const nombre=$('#catNombre').value.trim(); if(!nombre){alert('Pon un nombre');return;}
  const data={grupo:$('#catGrupo').value.trim()||'Otros',nombre,tipo:$('#catTipo').value};
  const pdata={importe:num($('#catImporte').value),frecuencia:$('#catFrec').value,metodoPago:$('#catMetodo').value.trim(),renovacion:$('#catRenov').value};
  if(id){
    Object.assign(catById(id),data);
    let p=presFor(id,presYear); if(p){Object.assign(p,pdata);} else {DB.presupuesto.push({id:uid(),categoriaId:id,...pdata,anio:presYear});}
  } else {
    const cid=uid(); DB.categorias.push({id:cid,...data}); DB.presupuesto.push({id:uid(),categoriaId:cid,...pdata,anio:presYear});
  }
  $('#catDlg').close(); fillCatSelects(); fillGrupoList(); renderAll(); scheduleSave();
}
function deleteCat(){
  const id=$('#catId').value; if(!id)return;
  const used=DB.movimientos.some(m=>m.categoriaId===id);
  if(used && !confirm('Esta categoría tiene movimientos asociados. Si la eliminas, esos movimientos quedarán sin categoría. ¿Continuar?'))return;
  if(!used && !confirm('¿Eliminar esta categoría?'))return;
  DB.categorias=DB.categorias.filter(c=>c.id!==id);
  DB.presupuesto=DB.presupuesto.filter(p=>p.categoriaId!==id);
  $('#catDlg').close(); fillCatSelects(); fillGrupoList(); renderAll(); scheduleSave();
}

/* ============ Eventos ============ */
const GROUPS={ mov:[['movimientos','Movimientos'],['amalia','Amalia'],['fondor4','Fondo R4'],['patrimonio','Patrimonio'],['metas','Metas'],['mazinger','Mazinger Z']], cartera:[['posiciones','Posiciones'],['inversiones','Cartera'],['ranking','Ranking'],['rentabilidad','Rentabilidad'],['caja','Caja bróker']], estudio:[['analisis','Análisis'],['proxcompra','Próxima compra'],['comparador','Comparador'],['backtest','Backtest'],['radardiv','Radar Dividendo'],['riesgo','Riesgo']], rentas:[['dividendos','Dividendos'],['atribucion','Atribución'],['calendario','Calendario'],['fiscalidad','Fiscalidad'],['prevision','Evolución Dividendo']], planinv:[['proyeccion','Proyección'],['diversif','Diversificación'],['plan','Plan'],['simulador','Simulador'],['monitor','Monitor']] };
function groupOf(view){ for(const g in GROUPS){ if(GROUPS[g].some(v=>v[0]===view)) return g; } return null; }
const groupCurrent={mov:'movimientos', cartera:'posiciones', estudio:'analisis', rentas:'dividendos', planinv:'proyeccion'};
function activarVista(view){
  $$('.view').forEach(v=>v.classList.remove('active'));
  const el=$('#view-'+view); if(el)el.classList.add('active');
  const g=groupOf(view); const sn=$('#subnav');
  if(g){ groupCurrent[g]=view; if(sn){ sn.style.display='flex'; sn.innerHTML=GROUPS[g].map(v=>`<button data-sub="${v[0]}"${v[0]===view?' class="active"':''}>${v[1]}</button>`).join(''); } }
  else if(sn){ sn.style.display='none'; sn.innerHTML=''; }
  $$('#nav button').forEach(x=>x.classList.toggle('active', g ? (x.dataset.group===g) : (x.dataset.view===view)));
  if(view==='dividendos'&&typeof fitDividendos==='function') setTimeout(fitDividendos,120);
  if(view==='calendario'){ setTimeout(()=>autoFitTable('calTabla',7,11),120); }
  if(view==='ranking') setTimeout(()=>autoFitTable('rankTabla',7,10),120);
  if(view==='prevision') setTimeout(()=>autoFitTable('prevTabla',7,11),120);
  if(view==='simulador') setTimeout(()=>autoFitTable('simTabla',7,10),120);
  if(view==='plan') setTimeout(()=>autoFitTable('planTabla',7,11),120);
  if(view==='posiciones' && typeof renderPOS==='function') renderPOS();
  if(view==='fondor4') renderFondoR4();
  if(view==='metas' && typeof renderMetas==='function') renderMetas();
  if(view==='patrimonio') renderPat();
  if(view==='proyeccion') renderProy();
  if(view==='caja') renderCaja();
  if(view==='monitor') renderMonitor();
  if(view==='radardiv') renderRadarDiv();
  if(view==='proxcompra' && typeof renderProxCompra==='function') renderProxCompra();
  if(view==='backtest' && typeof renderBacktest==='function') renderBacktest();
  if(view==='riesgo' && typeof renderRiesgo==='function') renderRiesgo();
  if(view==='fiscalidad' && typeof renderFiscalidad==='function') renderFiscalidad();
  if(view==='atribucion' && typeof renderAtribucion==='function') renderAtribucion();
  if(view==='rentabilidad' && typeof renderRentabEmpresas==='function') renderRentabEmpresas();
}
$('#nav').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; if(b.dataset.group){ activarVista(groupCurrent[b.dataset.group]); } else if(b.dataset.view){ activarVista(b.dataset.view); } });
$('#subnav').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; activarVista(b.dataset.sub); });
$('#panelDash').addEventListener('click',e=>{ const h=e.target.closest('[data-goto]'); if(h&&typeof activarVista==='function') activarVista(h.dataset.goto); });
if($('#view-metas')){
  $('#view-metas').addEventListener('click',e=>{ const a=e.target.closest('#metaAdd'); if(a){ if(typeof addMeta==='function')addMeta(); return; } const d=e.target.closest('[data-metadel]'); if(d){ if(confirm('¿Eliminar esta meta?')){ DB.metas=(DB.metas||[]).filter(x=>x.id!==d.dataset.metadel); saveNow(); if(typeof renderMetas==='function')renderMetas(); if(typeof renderPanel==='function')renderPanel(); } } });
  $('#view-metas').addEventListener('change',e=>{ const t=e.target.closest('[data-meta]'); if(!t)return; const a=t.dataset.meta.split('|'); const m=(DB.metas||[]).find(x=>x.id===a[0]); if(!m)return; const f=a[1]; if(f==='nombre'||f==='fecha')m[f]=t.value; else m[f]=(t.value.trim()===''?0:num(t.value)); saveNow(); if(typeof renderMetas==='function')renderMetas(); if(typeof renderPanel==='function')renderPanel(); });
}
if($('#view-atribucion')){
  $('#view-atribucion').addEventListener('click',e=>{ const b=e.target.closest('[data-atrib]'); if(b){ atribSel.modo=b.dataset.atrib; if(typeof renderAtribucion==='function')renderAtribucion(); return; } const r=e.target.closest('#atribRango'); if(r){ const dd=$('#atribDesde').value,hh=$('#atribHasta').value; if(dd&&hh){ atribSel.modo='rango'; atribSel.desde=dd; atribSel.hasta=hh; if(typeof renderAtribucion==='function')renderAtribucion(); } else alert('Elige fecha de inicio y de fin.'); return; } });
  $('#view-atribucion').addEventListener('change',e=>{ const y=e.target.closest('#atribAnio'); if(y&&y.value){ atribSel.modo='anio'; atribSel.anio=+y.value; if(typeof renderAtribucion==='function')renderAtribucion(); } });
}
if($('#view-proxcompra')){
  $('#view-proxcompra').addEventListener('click',e=>{ const _y=(typeof proxYearSel!=='undefined'&&proxYearSel)?proxYearSel:new Date().getFullYear();
    const p=e.target.closest('[data-proxplan]'); if(p){ const t=p.dataset.proxplan; const amt=(typeof proxAmount==='function')?proxAmount(t):0; if(amt<=0){ alert('No hay importe recomendado para '+t+'.'); return; }
      const info=(typeof _planYearInfo==='function')?_planYearInfo(_y):{budget:0,planned:0,remaining:0}; let donor=null, donorAmt=0;
      if(info.budget>0 && (info.planned+amt)>info.budget+0.5){ const exceso=(info.planned+amt)-info.budget; const donors=(typeof planDonorsYear==='function')?planDonorsYear(_y,t):[]; const lista=donors.map(d=>d.t+' ('+fmt(d.amt)+')').join(', ');
        const resp=prompt('Añadir '+fmt(amt)+' € de '+t+' superaría el presupuesto de '+_y+' ('+fmt(info.budget)+' · ya planificado '+fmt(info.planned)+' · te pasarías '+fmt(exceso)+').\n\n¿De qué empresa descuento '+fmt(amt)+' € para reasignar? Escribe el ticker (opciones: '+(lista||'ninguna')+'), o deja vacío para añadir igualmente.', donors[0]?donors[0].t:'');
        if(resp===null)return; const dt=(resp||'').trim().toUpperCase(); if(dt){ const d=donors.find(x=>x.t===dt); if(!d){ if(!confirm('No encuentro '+dt+' en el Plan de '+_y+'. ¿Añadir sin reasignar?'))return; } else { donor=dt; donorAmt=amt; } } }
      if(confirm('¿Añadir '+fmt(amt)+' € de '+t+' al Plan de '+_y+(donor?(' descontando '+fmt(donorAmt)+' € de '+donor):'')+'?')){ const a=proxApplyPlan(t,amt,_y,donor,donorAmt); if(a>0)alert('Hecho: +'+fmt(a)+' € en '+t+(donor?(' · −'+fmt(donorAmt)+' € en '+donor):'')+' (Plan '+_y+').'); } return; }
    const c=e.target.closest('[data-proxcaja]'); if(c){ if(confirm('¿Registrar la compra de '+c.dataset.proxcaja+' como salida en la Caja bróker (hoy)?')){ const a=proxAddCaja(c.dataset.proxcaja); if(a>0)alert('Registrada salida de '+fmt(a)+' € en la Caja.'); } return; }
    const all=e.target.closest('#proxAllPlan'); if(all){ if(confirm('¿Añadir TODAS las compras sugeridas al Plan del año '+_y+'? (se añaden, no reasignan)')){ const a=proxAddPlan(null,true); const info=(typeof _planYearInfo==='function')?_planYearInfo(_y):null; let extra=''; if(info&&info.budget>0&&info.remaining<-0.5)extra='\n\n⚠️ Te has pasado del presupuesto de '+_y+' en '+fmt(-info.remaining)+' €. Ajusta en la pestaña Plan.'; alert((a>0?('Añadido '+fmt(a)+' € al Plan de '+_y+'.'):'No hay compras sugeridas que añadir.')+extra); } return; }
    const rf=e.target.closest('#proxRefresh'); if(rf){ if(typeof renderProxCompra==='function')renderProxCompra(); return; } });
  $('#view-proxcompra').addEventListener('change',e=>{ const y=e.target.closest('#proxYear'); if(y){ proxYearSel=+y.value||new Date().getFullYear(); if(typeof renderProxCompra==='function')renderProxCompra(); } });
}
$('#view-caja').addEventListener('change',e=>{ const t=e.target; if(!t||!t.dataset)return;
  if(t.dataset.cajahecho){ DB.cajaHecho=DB.cajaHecho||{}; const k=t.dataset.cajahecho; if(t.checked)DB.cajaHecho[k]=true; else delete DB.cajaHecho[k]; const tr=t.closest('tr'); if(tr)tr.style.background=t.checked?'#f0fdf4':(tr.dataset.defbg||''); saveNow(); return; }
  if(t.dataset.cajacfg){ DB.cajaConfig=DB.cajaConfig||{}; const k=t.dataset.cajacfg; DB.cajaConfig[k]=(k==='fechaIni')?t.value:(t.value.trim()===''?'':num(t.value)); saveNow(); renderCaja(); return; }
  if(t.dataset.cajadiv){ DB.cajaDivReal=DB.cajaDivReal||{}; if(t.value.trim()==='')delete DB.cajaDivReal[t.dataset.cajadiv]; else DB.cajaDivReal[t.dataset.cajadiv]=num(t.value); saveNow(); renderCaja(); return; }
  if(t.dataset.cajadivdate){ DB.cajaDivFecha=DB.cajaDivFecha||{}; if(t.value.trim()==='')delete DB.cajaDivFecha[t.dataset.cajadivdate]; else DB.cajaDivFecha[t.dataset.cajadivdate]=t.value; saveNow(); renderCaja(); return; }
  if(t.dataset.cajaapordate){ DB.cajaAporFecha=DB.cajaAporFecha||{}; if(t.value.trim()==='')delete DB.cajaAporFecha[t.dataset.cajaapordate]; else DB.cajaAporFecha[t.dataset.cajaapordate]=t.value; saveNow(); renderCaja(); return; }
  if(t.dataset.cajaapor){ DB.cajaAporReal=DB.cajaAporReal||{}; if(t.value.trim()==='')delete DB.cajaAporReal[t.dataset.cajaapor]; else DB.cajaAporReal[t.dataset.cajaapor]=num(t.value); saveNow(); renderCaja(); return; }
  if(t.dataset.cajamv){ const a=t.dataset.cajamv.split('|'); const mv=(DB.cajaMov||[]).find(x=>x.id===a[0]); if(mv){ const f=a[1]; if(f==='entra'||f==='sale') mv[f]=(t.value.trim()===''?0:num(t.value)); else mv[f]=t.value; saveNow(); renderCaja(); } return; } });
$('#view-caja').addEventListener('click',e=>{ const d=e.target.closest('[data-cajadel]'); if(d){ DB.cajaMov=(DB.cajaMov||[]).filter(x=>x.id!==d.dataset.cajadel); saveNow(); renderCaja(); } });
let cajaTipo='';
if($('#cajaTipoSeg'))$('#cajaTipoSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(!b)return; cajaTipo=b.dataset.t; [...$('#cajaTipoSeg').children].forEach(x=>x.classList.toggle('on',x===b)); });
if($('#cajaForm'))$('#cajaForm').addEventListener('submit',e=>{ e.preventDefault(); const f=$('#cajaFecha').value; const c=($('#cajaConcepto').value||'').trim(); const imp=num($('#cajaImporte').value); if(!f||!imp){ alert('Pon fecha e importe.'); return; } if(!cajaTipo){ alert('Elige el tipo: Ingreso o Gasto.'); return; } DB.cajaMov=DB.cajaMov||[]; DB.cajaMov.push({id:'c'+Math.random().toString(36).slice(2,9),fecha:f,concepto:c,entra:cajaTipo==='entra'?imp:0,sale:cajaTipo==='sale'?imp:0}); saveNow(); $('#cajaForm').reset(); $('#cajaForm').style.display='none'; cajaTipo=''; [...$('#cajaTipoSeg').children].forEach(x=>x.classList.remove('on')); renderCaja(); });
if($('#cajaFormCancel'))$('#cajaFormCancel').addEventListener('click',()=>{ $('#cajaForm').reset(); $('#cajaForm').style.display='none'; cajaTipo=''; [...$('#cajaTipoSeg').children].forEach(x=>x.classList.remove('on')); });
if($('#todoForm'))$('#todoForm').addEventListener('submit',e=>{ e.preventDefault(); const desc=($('#todoDesc').value||'').trim(); if(!desc){ alert('Pon una descripción.'); return; } DB.todos=DB.todos||[]; DB.todos.push({id:'t'+Math.random().toString(36).slice(2,9),fecha:$('#todoFecha').value,desc,razon:($('#todoRazon').value||'').trim(),ticker:($('#todoTicker').value||'').trim().toUpperCase(),hecho:false}); saveNow(); $('#todoForm').reset(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); });
if($('#todoDelDone'))$('#todoDelDone').addEventListener('click',()=>{ if(!confirm('¿Borrar todas las tareas completadas?'))return; DB.todos=(DB.todos||[]).filter(x=>!x.hecho); saveNow(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); });
if($('#view-monitor'))$('#view-monitor').addEventListener('change',e=>{ const c=e.target.closest('[data-todone]'); if(c){ const x=(DB.todos||[]).find(z=>z.id===c.dataset.todone); if(x){ x.hecho=c.checked; x.fechaHecho=c.checked?new Date().toISOString().slice(0,10):''; saveNow(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); } return; } const r=e.target.closest('[data-mon]'); if(r){ const a=r.dataset.mon.split('|'); DB.monitor[a[0]]=DB.monitor[a[0]]||{}; DB.monitor[a[0]].rol=r.value; saveNow(); return; } });
if($('#view-monitor'))$('#view-monitor').addEventListener('click',e=>{ const d=e.target.closest('[data-tododel]'); if(d){ DB.todos=(DB.todos||[]).filter(x=>x.id!==d.dataset.tododel); saveNow(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); return; } const inf=e.target.closest('[data-moninf]'); if(inf){ const t=inf.dataset.moninf; DB.monitor[t]=DB.monitor[t]||{}; const m=DB.monitor[t]; m.informe=!m.informe; m.informeFecha=m.informe?new Date().toISOString().slice(0,10):''; saveNow(); renderMonitor(); return; } const rv=e.target.closest('[data-monrev]'); if(rv){ const a=rv.dataset.monrev.split('|'); const t=a[0],key=a[1]; DB.monitor[t]=DB.monitor[t]||{}; DB.monitor[t].rev=DB.monitor[t].rev||{}; if(DB.monitor[t].rev[key])delete DB.monitor[t].rev[key]; else DB.monitor[t].rev[key]=true; saveNow(); renderMonitor(); return; } });
function _loteTk(v){ const m=(v||'').match(/\(([^)]+)\)\s*$/); let tk=m?m[1]:(v||''); tk=tk.trim().toUpperCase(); const all=new Set((DB.analisis||[]).map(a=>(a.ticker||'').toUpperCase())); return all.has(tk)?tk:''; }
$('#loteTabla').addEventListener('change',e=>{ const dp=e.target.closest('[data-lotedisp]'); if(dp){ DB.planDispFijo=DB.planDispFijo||{}; if(dp.value.trim()==='')delete DB.planDispFijo[dp.dataset.lotedisp]; else DB.planDispFijo[dp.dataset.lotedisp]=num(dp.value); saveNow(); renderPlanLote(); return; } const ag=e.target.closest('[data-asig]'); if(ag){ const [t,y]=ag.dataset.asig.split('|'); DB.planCompras=DB.planCompras||{}; DB.planCompras[t]=DB.planCompras[t]||{}; if(ag.value.trim()==='')delete DB.planCompras[t][y]; else DB.planCompras[t][y]=num(ag.value); saveNow(); renderPlanLote(); if(typeof renderPlan==='function')renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); return; } const yr=e.target.closest('[data-loteyr]'); if(yr){ DB.planLotePeriodo=DB.planLotePeriodo||{}; DB.planLotePeriodo[yr.dataset.loteyr]=num(yr.value); saveNow(); renderPlanLote(); return; } const ad=e.target.closest('[data-loteadd]'); if(ad){ const tk=_loteTk(ad.value); if(tk){ DB.planLote=DB.planLote||[]; if(!DB.planLote.includes(tk))DB.planLote.push(tk); } saveNow(); renderPlanLote(); return; } const ch=e.target.closest('[data-lotechg]'); if(ch){ const i=+ch.dataset.lotechg; const tk=_loteTk(ch.value); if(!ch.value.trim()){ DB.planLote.splice(i,1); } else if(tk){ DB.planLote[i]=tk; } saveNow(); renderPlanLote(); } });
$('#loteTabla').addEventListener('click',e=>{ const d=e.target.closest('[data-lotedel]'); if(d){ DB.planLote.splice(+d.dataset.lotedel,1); saveNow(); renderPlanLote(); } });
$('#loteTabla').addEventListener('change',e=>{ const tp=e.target.closest('[data-lotetipo]'); if(tp){ DB.planTipo=DB.planTipo||{}; if(tp.value)DB.planTipo[tp.dataset.lotetipo]=tp.value; else delete DB.planTipo[tp.dataset.lotetipo]; saveNow(); renderPlanLote(); } });
$('#prevTabla').addEventListener('change',e=>{ const d=e.target.closest('[data-dpa]'); if(d){ const t=d.dataset.dpa, y=d.dataset.y; DB.divPorAccion=DB.divPorAccion||{}; DB.divPorAccion[t]=DB.divPorAccion[t]||{}; const v=num(d.value); if(d.value.trim()==='') delete DB.divPorAccion[t][y]; else DB.divPorAccion[t][y]=v; saveNow(); renderPrevision(); } });
if($('#prevAdd'))$('#prevAdd').addEventListener('click',addPrevEmpresa);
if($('#evAdd'))$('#evAdd').addEventListener('click',addEventoEmpresa);
if($('#simAdd'))$('#simAdd').addEventListener('click',addSimEmpresa);
if($('#planAdd'))$('#planAdd').addEventListener('click',addPlanEmpresa);
if($('#planAddYear'))$('#planAddYear').addEventListener('click',addPrevYear);
$('#planTabla').addEventListener('click',e=>{ const b=e.target.closest('[data-planexe]'); if(b){ const [t,y]=b.dataset.planexe.split('|'); if(confirm('¿Quitar del Plan la compra de '+t+' en '+y+'? Ya tienes operación real ese año.')){ if(DB.planCompras&&DB.planCompras[t])delete DB.planCompras[t][y]; saveNow(); renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); } } });
$('#planTabla').addEventListener('change',e=>{ const a=e.target.closest('[data-plan]'); if(a){ const t=a.dataset.plan,y=a.dataset.y; DB.planCompras=DB.planCompras||{}; DB.planCompras[t]=DB.planCompras[t]||{}; if(a.value.trim()==='')delete DB.planCompras[t][y]; else DB.planCompras[t][y]=num(a.value); saveNow(); renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); return; } const p=e.target.closest('[data-plpres]'); if(p){ DB.planPresupuesto=DB.planPresupuesto||{}; if(p.value.trim()==='')delete DB.planPresupuesto[p.dataset.plpres]; else DB.planPresupuesto[p.dataset.plpres]=num(p.value); saveNow(); renderPlan(); } });
function addPrevYear(){ DB.previsionMaxYear=(num(DB.previsionMaxYear)||2030)+1; saveNow(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); if(typeof renderPlan==='function')renderPlan(); }
function toggleDivConf(t,y){ DB.divConfirmado=DB.divConfirmado||{}; DB.divConfirmado[t]=DB.divConfirmado[t]||{}; if(DB.divConfirmado[t][y]) delete DB.divConfirmado[t][y]; else DB.divConfirmado[t][y]=true; saveNow(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); }
function toggleAnioConf(y){ DB.aniosConfirmados=DB.aniosConfirmados||{}; if(DB.aniosConfirmados[y]) delete DB.aniosConfirmados[y]; else DB.aniosConfirmados[y]=true; saveNow(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); }
if($('#prevAddYear'))$('#prevAddYear').addEventListener('click',addPrevYear);
if($('#simAddYear'))$('#simAddYear').addEventListener('click',addPrevYear);
$('#prevTabla').addEventListener('click',e=>{ const d=e.target.closest('[data-divconf]'); if(d){ const [t,y]=d.dataset.divconf.split('|'); toggleDivConf(t,y); return; } const h=e.target.closest('[data-yhead]'); if(h) toggleAnioConf(h.dataset.yhead); });
$('#simTabla').addEventListener('click',e=>{ const d=e.target.closest('[data-divconf]'); if(d){ const [t,y]=d.dataset.divconf.split('|'); toggleDivConf(t,y); return; } const h=e.target.closest('[data-yhead]'); if(h) toggleAnioConf(h.dataset.yhead); });
$('#simTabla').addEventListener('change',e=>{ const a=e.target.closest('[data-sim]'); if(a){ const t=a.dataset.sim,y=a.dataset.y; DB.simShares=DB.simShares||{}; DB.simShares[t]=DB.simShares[t]||{}; if(a.value.trim()==='') delete DB.simShares[t][y]; else DB.simShares[t][y]=num(a.value); saveNow(); renderSimulador(); return; } const d=e.target.closest('[data-simdiv]'); if(d){ const t=d.dataset.simdiv,y=d.dataset.y; DB.divPorAccion=DB.divPorAccion||{}; DB.divPorAccion[t]=DB.divPorAccion[t]||{}; if(d.value.trim()==='') delete DB.divPorAccion[t][y]; else DB.divPorAccion[t][y]=num(d.value); saveNow(); renderSimulador(); } });
$('#mYear').addEventListener('change',e=>{curYear=+e.target.value;renderAll();});
$('#mMonth').addEventListener('change',e=>{curMonth=+e.target.value;renderAll();});
$('#mModeMes').addEventListener('click',()=>{panelMode='mes';renderPanel();});
$('#mModeAnio').addEventListener('click',()=>{panelMode='anio';renderPanel();});
$('#btnLogin').addEventListener('click',login);
$('#btnLogout').addEventListener('click',logout);
$('#btnImport').addEventListener('click',()=>$('#fileInput').click());
$('#btnSeed').addEventListener('click',async()=>{ DB=seed(); await saveNow(); afterLoad(); });

$('#movTipoSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMovTipo(b.dataset.t);});
$('#movForm').addEventListener('submit',e=>{
  e.preventDefault();
  let _det=$('#movDetalle').value.trim();
  let _bas=$('#movComercio').value.trim();
  if(!_bas) _bas = baseComercio(_det) || _det;
  if(!_det) _det = _bas;
  const mov={
    id:$('#movId').value||uid(),
    fecha:$('#movFecha').value,
    concepto:$('#movConcepto').value.trim(),
    comercio:_bas,
    detalle:_det,
    categoriaId:$('#movCat').value,
    titular:$('#movTitular').value,
    tipo:movTipo,
    importe:num($('#movImporte').value)
  };
  const ex=DB.movimientos.find(x=>x.id===mov.id);
  if(ex) Object.assign(ex,mov); else DB.movimientos.push(mov);
  resetMovForm(); initPeriod(); renderAll(); scheduleSave();
});
$('#movCancel').addEventListener('click',resetMovForm);
$('#movTable').addEventListener('click',e=>{
  const ed=e.target.closest('[data-edit]'), de=e.target.closest('[data-del]');
  if(ed) editMov(ed.dataset.edit);
  if(de){ if(confirm('¿Eliminar este movimiento?')){DB.movimientos=DB.movimientos.filter(m=>m.id!==de.dataset.del);renderAll();scheduleSave();} }
});
$('#movTable').addEventListener('input',e=>{
  const t=e.target; if(!t.classList||!t.classList.contains('movDetInp'))return;
  const v=(t.value||'').trim().toLowerCase();
  let dl=document.getElementById('dlMovDet');
  if(!dl){ dl=document.createElement('datalist'); dl.id='dlMovDet'; document.body.appendChild(dl); }
  if(v.length<4){ t.removeAttribute('list'); dl.innerHTML=''; return; }
  const src=(typeof SUGSRC!=='undefined'&&SUGSRC.movDetalle)?SUGSRC.movDetalle():[];
  const vals=src.filter(x=>{const lx=(x||'').toLowerCase();return lx.indexOf(v)>=0&&lx!==v;}).slice(0,15);
  dl.innerHTML=vals.map(x=>'<option value="'+(x||'').replace(/"/g,'&quot;')+'"></option>').join('');
  if(vals.length)t.setAttribute('list','dlMovDet'); else t.removeAttribute('list');
});
$('#movTable').addEventListener('change',e=>{
  const t=e.target; if(!t.classList||!t.classList.contains('movDetInp'))return;
  const m=DB.movimientos.find(x=>x.id===t.dataset.mid);
  if(m){ m.detalle=(t.value||'').trim(); scheduleSave(); }
});
$('#fltText').addEventListener('input',renderMovs);
['#fltDesde','#fltHasta','#fltOrden'].forEach(s=>$(s).addEventListener('change',renderMovs));
$('#catDDbtn').addEventListener('click',e=>{e.stopPropagation();$('#catDDpanel').classList.toggle('open');});
$('#catDDpanel').addEventListener('click',e=>e.stopPropagation());
$('#catDDpanel').addEventListener('change',e=>{
  if(e.target.id==='catDDall'){ if(e.target.checked){DB.categorias.forEach(c=>movFiltCats.add(c.id));} else {movFiltCats.clear();} renderCatDD(); }
  else if(e.target.classList.contains('catCk')){ if(e.target.checked) movFiltCats.add(e.target.value); else movFiltCats.delete(e.target.value); updateCatDDbtn(); }
  renderMovs();
});
document.addEventListener('click',()=>{ const p=$('#catDDpanel'); if(p) p.classList.remove('open'); });
$('#titChips').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(!b)return; b.classList.toggle('on'); if(b.classList.contains('on'))movFiltTits.add(b.dataset.t); else movFiltTits.delete(b.dataset.t); renderMovs(); });
$('#fltClear').addEventListener('click',()=>{ movFiltCats.clear(); movFiltTits.clear(); movFiltCom.clear(); movFiltDet.clear(); $('#fltText').value='';$('#fltDesde').value='';$('#fltHasta').value='';$('#fltOrden').value='fecha_desc'; $$('#titChips button').forEach(b=>b.classList.remove('on')); renderCatDD(); renderMovs(); });
$('#comDDbtn') && $('#comDDbtn').addEventListener('click',e=>{e.stopPropagation();$('#comDDpanel').classList.toggle('open');});
$('#comDDpanel') && $('#comDDpanel').addEventListener('click',e=>e.stopPropagation());
$('#comDDpanel') && $('#comDDpanel').addEventListener('change',e=>{
  if(e.target.id==='comDDall'){ if(e.target.checked){comBases().forEach(b=>movFiltCom.add(b.name));} else {movFiltCom.clear();} }
  else if(e.target.classList.contains('comCk')){ if(e.target.checked) movFiltCom.add(e.target.value); else movFiltCom.delete(e.target.value); }
  renderMovs();
});
document.addEventListener('click',()=>{ const p=$('#comDDpanel'); if(p) p.classList.remove('open'); });
$('#comRegFilter') && $('#comRegFilter').addEventListener('input',()=>renderComReg());
$('#comRegApply') && $('#comRegApply').addEventListener('click',comRegAsignar);
$('#comRegRun') && $('#comRegRun').addEventListener('click',()=>{ if(confirm('¿Aplicar las reglas y alias a TODO el histórico de movimientos?')){ aplicarBaseComercio(); renderMovs(); scheduleSave(); } });
$('#presYear').addEventListener('change',e=>{presYear=+e.target.value;renderPres();});
$('#patAdd').addEventListener('click',addSnapshot);
$('#patAddCuenta').addEventListener('click',addCuenta);
$('#patCuentas').addEventListener('click',e=>{const b=e.target.closest('[data-delcuenta]');if(b)delCuenta(b.dataset.delcuenta);});
$('#proyAddEvento').addEventListener('click',addEvento);
$('#amaForm').addEventListener('submit',e=>{e.preventDefault();addAmalia();});
$('#amaImportBtn').addEventListener('click',()=>$('#amaFile').click());
if($('#r4Form')) $('#r4Form').addEventListener('submit',e=>{e.preventDefault();addFondoR4();});
if($('#r4ImportBtn')) $('#r4ImportBtn').addEventListener('click',()=>$('#r4File').click());
if($('#r4Tipo')) $('#r4Tipo').addEventListener('change',()=>{ const rt=$('#r4NetoWrap'); if(rt) rt.style.display=($('#r4Tipo').value==='retirada'?'':'none'); });
if($('#r4Ret')) $('#r4Ret').addEventListener('input',()=>{ const el=$('#r4RetCalc'); if(!el)return; const c=r4DesdeRetencion($('#r4Ret').value); el.textContent=(c.retencion>0)?(' → bruto '+fmt(c.bruto)+' € · neto '+fmt(c.neto)+' €'):''; });
if($('#r4Orden')) $('#r4Orden').addEventListener('change',renderFondoR4);
if($('#posFiltro')) $('#posFiltro').addEventListener('change',()=>{ if(typeof renderPOS==='function')renderPOS(); });
if($('#posOrden')) $('#posOrden').addEventListener('change',()=>{ if(typeof renderPOS==='function')renderPOS(); });
if($('#r4List')) $('#r4List').addEventListener('click',e=>{const b=e.target.closest('[data-delr4]'); if(b&&confirm('¿Eliminar este movimiento?')){ DB.easy=(DB.easy||[]).filter(x=>x.id!==b.dataset.delr4); renderFondoR4(); scheduleSave(); }});
if($('#r4List')) $('#r4List').addEventListener('change',e=>{ const inp=e.target.closest('input.r4inp'); if(!inp)return; const id=inp.dataset.id, f=inp.dataset.f; const mov=(DB.easy||[]).find(x=>x.id===id); if(!mov)return;
  const asc=easySorted(); let prev=0; for(const m of asc){ if(m.id===id) break; prev += m.tipo==='retirada'? -num(m.importe): num(m.importe); }
  const s=(inp.value||'').trim();
  if(f==='imp'){ const v=num(s); mov.tipo=v<0?'retirada':'aportacion'; mov.importe=Math.abs(v); }
  else if(f==='acum'){ const delta=num(s)-prev; mov.tipo=delta<0?'retirada':'aportacion'; mov.importe=Math.abs(delta); }
  else if(f==='valor'){ if(s===''){ delete mov.valor; } else { mov.valor=num(s); } }
  else if(f==='plus'){ const runHere=prev+(mov.tipo==='retirada'? -num(mov.importe): num(mov.importe)); if(s===''){ delete mov.valor; } else { mov.valor=runHere+num(s); } }
  renderFondoR4(); scheduleSave(); });
$('#amaOrden').addEventListener('change',renderAmalia);
$('#invForm').addEventListener('submit',e=>{e.preventDefault();invNuevoValor();});
$('#invCancel').addEventListener('click',()=>{$('#invForm').style.display='none';});
$('#invAddBtn').addEventListener('click',()=>{const f=$('#invForm'); f.reset(); $('#invExch').value='BME'; $('#invFecha').value=new Date().toISOString().slice(0,10); f.style.display=(f.style.display==='none'||!f.style.display)?'grid':'none';});
$('#invImportBtn').addEventListener('click',()=>$('#invFile').click());
$('#invTable').addEventListener('click',e=>{const op=e.target.closest('[data-ops-t]'),de=e.target.closest('[data-del-t]');
  if(op){ invOpsTicker=op.dataset.opsT; invOpsCartera=op.dataset.opsC; renderInvOps(); const el=$('#invOpsPanel'); if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  if(de){ const t=de.dataset.delT, car=de.dataset.delC; if(confirm('¿Eliminar las operaciones de '+t+' en la cartera '+car+'?')){ DB.operaciones=DB.operaciones.filter(o=>!((o.ticker||'').toUpperCase()===t && (o.cartera||'Propia')===car)); if(invOpsTicker===t&&invOpsCartera===car)invOpsTicker=null; renderInv(); renderInvOps(); scheduleSave(); } }});
$('#opAdd').addEventListener('click',addOp);
$('#opClose').addEventListener('click',()=>{opEditEnd(); invOpsTicker=null; renderInvOps();});
$('#opCancelEdit').addEventListener('click',()=>{opEditEnd(); $('#opAcc').value=''; $('#opPrecio').value='';});
$('#invOpsList').addEventListener('click',e=>{const ed=e.target.closest('[data-editop]'),d=e.target.closest('[data-delop]'); if(ed){editOp(ed.dataset.editop);return;} if(d&&confirm('¿Eliminar esta operación?')){DB.operaciones=DB.operaciones.filter(o=>o.id!==d.dataset.delop); if(opEditId===d.dataset.delop)opEditEnd(); renderInv(); renderInvOps(); scheduleSave();}});
$('#invOpsMeta').addEventListener('change',e=>{const t=e.target; if(t.dataset&&t.dataset.meta&&invOpsTicker){ const v=DB.valores[invOpsTicker]=DB.valores[invOpsTicker]||{}; const k=t.dataset.meta; v[k]=(k==='precioActual'||k==='divAccion')?num(t.value):t.value; renderInv(); scheduleSave(); }});
$('#anaPasteBtn').addEventListener('click',()=>{const p=$('#anaPastePanel'); p.style.display=p.style.display==='none'?'block':'none';});
$('#anaPasteCancel').addEventListener('click',()=>{$('#anaPastePanel').style.display='none';});
$('#anaPasteApply').addEventListener('click',aplicarAnaPaste);
$('#anaAddBtn').addEventListener('click',()=>{const f=$('#anaForm'); f.reset(); $('#anaId').value=''; $('#anaSubmit').textContent='Añadir'; f.style.display=(f.style.display==='none'||!f.style.display)?'grid':'none';});
$('#anaForm').addEventListener('submit',e=>{e.preventDefault();anaSubmit();});
$('#anaCancel').addEventListener('click',()=>{$('#anaForm').style.display='none';});
$('#anaTable').addEventListener('click',e=>{const ed=e.target.closest('[data-anaedit]'),de=e.target.closest('[data-anadel]'); if(ed)anaEdit(ed.dataset.anaedit); if(de&&confirm('¿Eliminar esta empresa del seguimiento?')){DB.analisis=DB.analisis.filter(x=>x.id!==de.dataset.anadel);renderAnalisis();scheduleSave();}});
$('#anaTable').addEventListener('change',e=>{const t=e.target; if(t.classList&&t.classList.contains('anaInp')&&t.dataset.f){const a=DB.analisis.find(x=>x.id===t.dataset.id); if(a){ if(t.dataset.f==='rating'){a.rating=(t.value||'').trim().toUpperCase();} else if(t.dataset.f==='decision'){a.decision=(t.value||'').trim().toUpperCase(); const _dcm={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; t.style.color=_dcm[a.decision]||'#475569'; scheduleSave(); return;} else {a[t.dataset.f]=num(t.value); const pmn=num(a.poMin),pmx=num(a.poMax); a.precioObjetivo=(pmn&&pmx)?(pmn+pmx)/2:(pmx||pmn||0); a.precioEntrada=num(a.entMax);} renderAnalisis(); scheduleSave();}}});
$('#anaClear').addEventListener('click',()=>{ if(confirm('¿Vaciar TODA la lista de Análisis? (no afecta a tu cartera)')){ DB.analisis=[]; renderAnalisis(); scheduleSave(); } });
$('#presImportBtn').addEventListener('click',()=>$('#presFile').click());
$('#amaList').addEventListener('click',e=>{const b=e.target.closest('[data-delama]');if(b&&confirm('¿Eliminar este apunte?')){DB.amalia=DB.amalia.filter(x=>x.id!==b.dataset.delama);renderAmalia();scheduleSave();}});
$('#proyEventos').addEventListener('click',e=>{const b=e.target.closest('[data-delev]');if(b){DB.config.proyeccion.eventos.splice(+b.dataset.delev,1);renderProy();scheduleSave();}});
document.addEventListener('change',e=>{ const t=e.target; if(!t||!t.dataset)return; if(t.dataset.proy){ let v=num(t.value); if(t.dataset.pct==='1') v=v/100; DB.config.proyeccion[t.dataset.proy]=v; renderProy(); scheduleSave(); } else if(t.classList&&t.classList.contains('aporInput')){ DB.config.proyeccion.aportaciones[t.dataset.anio]=num(t.value); renderProy(); scheduleSave(); } });
$('#patImportBtn').addEventListener('click',()=>$('#patFile').click());
$('#patList').addEventListener('click',e=>{const b=e.target.closest('[data-delsnap]');if(b&&confirm('¿Eliminar este registro?')){DB.patrimonio=DB.patrimonio.filter(s=>s.id!==b.dataset.delsnap);renderPat();scheduleSave();}});
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='patObj'){ DB.config.objetivoReparto=Math.max(0,Math.min(100,num(e.target.value)))/100; renderPat(); scheduleSave(); }});
$('#btnAddYear').addEventListener('click',addYear);
$('#btnAddCat').addEventListener('click',()=>openCatDlg(null));
$('#presTable').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b)openCatDlg(b.dataset.cat);});
$('#catSave').addEventListener('click',saveCat);
$('#catDelete').addEventListener('click',deleteCat);

/* input de archivo para importar el JSON a Drive (1a vez) */
const fi=document.createElement('input'); fi.type='file'; fi.accept='.json,application/json'; fi.id='fileInput'; fi.style.display='none';
fi.addEventListener('change',async()=>{const f=fi.files[0];if(!f)return; await importLocal(f); fi.value='';});
document.body.appendChild(fi);
const pf=document.createElement('input'); pf.type='file'; pf.accept='.json,application/json'; pf.id='patFile'; pf.style.display='none';
pf.addEventListener('change',()=>{const f=pf.files[0];if(!f)return; importPatrimonio(f); pf.value='';});
document.body.appendChild(pf);
const af=document.createElement('input'); af.type='file'; af.accept='.json,application/json'; af.id='amaFile'; af.style.display='none';
af.addEventListener('change',()=>{const f=af.files[0];if(!f)return; importAmalia(f); af.value='';});
document.body.appendChild(af);
const r4f=document.createElement('input'); r4f.type='file'; r4f.accept='.json,application/json'; r4f.id='r4File'; r4f.style.display='none';
r4f.addEventListener('change',()=>{const f=r4f.files[0];if(!f)return; importFondoR4(f); r4f.value='';});
document.body.appendChild(r4f);
const invf=document.createElement('input'); invf.type='file'; invf.accept='.json,application/json'; invf.id='invFile'; invf.style.display='none';
invf.addEventListener('change',()=>{const f=invf.files[0];if(!f)return; importInv(f); invf.value='';});
document.body.appendChild(invf);
function descargarBackup(){ try{ const data=JSON.stringify(DB,null,2); const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); const d=new Date(); a.href=url; a.download='economia-backup-'+d.toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); setFileStatus&&setFileStatus('ok','Copia descargada ✓'); }catch(e){ alert('No se pudo generar la copia: '+e); } }
function restaurarBackup(file){ file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;} if(!d||typeof d!=='object'||Array.isArray(d)){alert('Ese archivo no parece una copia de seguridad válida.');return;} if(!confirm('Vas a REEMPLAZAR todos los datos actuales por los de la copia. Esto no se puede deshacer.\n\n¿Continuar?'))return; DB=d; const p=saveNow(); if(p&&p.then){ p.then(()=>{ alert('Copia restaurada correctamente.'); location.reload(); }).catch(()=>{ alert('Restaurada en memoria, pero no se pudo guardar en Drive. Revisa la conexión.'); renderAll(); }); } else { renderAll(); alert('Copia restaurada.'); } }); }
const bkf=document.createElement('input'); bkf.type='file'; bkf.accept='.json,application/json'; bkf.style.display='none'; bkf.addEventListener('change',e=>{ if(e.target.files[0]) restaurarBackup(e.target.files[0]); e.target.value=''; }); document.body.appendChild(bkf);
if($('#btnBackup'))$('#btnBackup').addEventListener('click',descargarBackup);
if($('#btnRestore'))$('#btnRestore').addEventListener('click',()=>bkf.click());
document.addEventListener('click',e=>{ const b=e.target.closest('[data-ficha]'); if(b){ e.preventDefault(); abrirFicha(b.dataset.ficha); } });
$('#divResumenWrap').addEventListener('change',e=>{ const d=e.target.closest('[data-devhac]'); if(d){ DB.devolucionHacienda=DB.devolucionHacienda||{}; const v=num(d.value); if(v) DB.devolucionHacienda[d.dataset.devhac]=v; else delete DB.devolucionHacienda[d.dataset.devhac]; saveNow(); renderDividendos(); } });
window.addEventListener('resize',()=>{ const v=$('#view-dividendos'); if(v&&v.classList.contains('active')&&typeof fitDividendos==='function') fitDividendos(); });
window.addEventListener('resize',()=>{ const v=$('#view-ranking'); if(v&&v.classList.contains('active')&&typeof autoFitTable==='function') autoFitTable('rankTabla',7,10); });
$('#calTabla').addEventListener('click',e=>{ const m=e.target.closest('[data-calm]'); if(m){ const c=(DB.calendario||[]).find(x=>x.id===m.dataset.calm); if(c){ const i=+m.dataset.mi; c.meses[i]=c.meses[i]?0:1; saveNow(); renderCalendario(); } } });
$('#calTabla').addEventListener('change',e=>{ const r=e.target.closest('[data-calrep]'); if(r){ const a=r.dataset.calrep.split('|'); const t=a[0], i=+a[1]; DB.divReparto=DB.divReparto||{}; DB.divReparto[t]=DB.divReparto[t]||[]; DB.divReparto[t][i]=(r.value.trim()===''?'':num(r.value)); saveNow(); renderCalendario(); return; } const d=e.target.closest('[data-caldiv]'); if(d){ const c=(DB.calendario||[]).find(x=>x.id===d.dataset.caldiv); if(c){ const t=(c.ticker||'').toUpperCase(); DB.valores=DB.valores||{}; DB.valores[t]=DB.valores[t]||{}; DB.valores[t].divAccion=num(d.value); saveNow(); renderInv(); renderCalendario(); } } });
$('#calEventos').addEventListener('change',e=>{ const c=e.target.closest('[data-evcell]'); if(!c)return; const a=c.dataset.evcell.split('|'); const t=a[0], m=+a[1], w=+a[2]; DB.eventos=DB.eventos||{}; DB.eventos[t]=(DB.eventos[t]||[]).filter(x=>!(x.m===m&&x.w===w)); (c.value||'').trim().split(/[\s,]+/).filter(Boolean).forEach(code=>DB.eventos[t].push({m,w,code:code.toUpperCase()})); saveNow(); renderEventos(); });
$('#invClosed').addEventListener('click',e=>{ const a=e.target.closest('[data-archive]'); if(a){ archivarCerrada(a.dataset.archive); return; } const d=e.target.closest('[data-delcerrada]'); if(d){ if(confirm('¿Quitar esta posición de archivadas? (no recupera las operaciones)')){ DB.cerradas=(DB.cerradas||[]).filter(c=>c.id!==d.dataset.delcerrada); saveNow(); renderInv(); renderDividendos(); } } });
$('#fichaView').addEventListener('click',e=>{ const _fr=e.target.closest('[data-frange]'); if(_fr){ fichaRange=_fr.dataset.frange; if(_fr.parentElement)[..._fr.parentElement.children].forEach(x=>x.classList.toggle('on',x===_fr)); drawFichaChart(fichaTicker); return; } if(e.target.closest('#finvVal')){ validarUrlInv(); return; } if(e.target.closest('#fdivAdd')){ addFichaDiv(); return; } const dd=e.target.closest('[data-deldiv]'); if(dd){ const arr=(DB.dividendos||{})[fichaTicker]||[]; const i=arr.findIndex(x=>x.id===dd.dataset.deldiv); if(i>=0){arr.splice(i,1); saveNow(); renderFicha(fichaTicker);} } });
$('#fichaView').addEventListener('change',e=>{ const arr=(DB.dividendos||{})[fichaTicker]||[]; const ef=e.target.closest('[data-edf]'); if(ef){ const it=arr.find(x=>x.id===ef.dataset.edf); if(it){ it.fecha=ef.value; saveNow(); renderFicha(fichaTicker);} return; } const ei=e.target.closest('[data-edi]'); if(ei){ const it=arr.find(x=>x.id===ei.dataset.edi); if(it){ it.importe=num(ei.value); saveNow(); renderFicha(fichaTicker);} } });
const prf=document.createElement('input'); prf.type='file'; prf.accept='.json,application/json'; prf.id='presFile'; prf.style.display='none';
prf.addEventListener('change',()=>{const f=prf.files[0];if(!f)return; importPresupuesto(f); prf.value='';});
document.body.appendChild(prf);

/* arranque */
init();
