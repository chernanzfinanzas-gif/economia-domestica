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
  const sCol=s=>s==null?'#64748b':(s>=70?'#16a34a':s>=50?'#d97706':'#dc2626');
  const sLbl=s=>s==null?'':(s>=70?'Buena':s>=50?'Media':'Mala');
  const poMedOf=a=>{const mn=num(a.poMin),mx=num(a.poMax);return (mn&&mx)?(mn+mx)/2:(mx||mn||0);};
  const potOf=a=>{const c=num(a.cotizacion),md=poMedOf(a);return (c&&md)?(md/c-1):null;};
  const pctF=p=>p==null?'—':(p>=0?'+':'')+(p*100).toFixed(1)+'%';
  const bandTxt=a=>{const c=num(a.cotizacion),eM=num(a.entMax);if(!(c&&eM))return fmt(c);const inB=c<=eM,near=c<=eM*1.10;const dot=inB?'🟢':near?'🟡':'🔴';return dot+' '+fmt(c)+' <span class="muted" style="font-size:10px">/ ent '+fmt(eM)+'</span>';};
  const lst=arr=>Array.isArray(arr)&&arr.length?('<ul class="ql">'+arr.map(x=>`<li>${x}</li>`).join('')+'</ul>'):'<span class="muted">—</span>';
  const J=t=>(typeof _tesisCache!=='undefined')?_tesisCache[t]:null;
  const dossCell=(a,t)=>{const u=(typeof dossierURL==='function')?dossierURL(t,a.dossierUrl):''; const mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null; return (u?`<a href="${u}" target="_blank" rel="noopener">📄 abrir</a>`:'<span class="muted">—</span>')+(mm!=null?` <span class="muted" style="font-size:9px">${mm}m${mm>12?' ⚠️':''}</span>`:'');};
  /* ---- ESCRITORIO: tabla comparativa ---- */
  const rowsDef=[
    ['sec','VALORACIÓN'],
    ['Score',(a)=>{const sc=cmpScore(a);return sc==null?'—':`<b style="font-size:19px;color:${sCol(sc)}">${sc.toFixed(0)}</b> <span style="font-size:10px;font-weight:700;color:${sCol(sc)}">${sLbl(sc)}</span>`;}],
    ['Decisión',(a)=>{const d=(a.decision||'').toUpperCase();return d?`<span class="cdec" style="background:${dcol[d]}">${d}</span>`:'—';}],
    ['Rating',(a)=>`<b>${a.rating||'—'}</b>`],
    ['Sub-tipo',(a,j,t)=>(typeof SUBTIPO!=='undefined'&&SUBTIPO[t])||'—'],
    ['Cotización',(a)=>fmt(num(a.cotizacion))],
    ['PO bear/base/bull',(a)=>{const mn=num(a.poMin),mx=num(a.poMax),md=poMedOf(a);return md?`${fmt(mn)} / <b>${fmt(md)}</b> / ${fmt(mx)}`:'—';}],
    ['Potencial',(a)=>{const p=potOf(a);return p==null?'—':`<b style="color:${p>=0?'#16a34a':'#dc2626'}">${pctF(p)}</b>`;}],
    ['Banda entrada',(a)=>{const mn=num(a.entMin),mx=num(a.entMax);return mx?`${fmt(mn)} – ${fmt(mx)}`:'—';}],
    ['Estado vs banda',(a)=>bandTxt(a)],
    ['Stop tesis',(a)=>num(a.stopTesis)?fmt(num(a.stopTesis)):'—'],
    ['RPD',(a)=>{const c=num(a.cotizacion),d=num(a.divAccion);return c?`${(d/c*100).toFixed(2)}%`:'—';}],
    ['sec','CUALITATIVO — DOSSIER'],
    ['Moat',(a,j)=>(j&&j.moat)?j.moat:'<span class="muted">—</span>'],
    ['Catalizadores',(a,j)=>lst(j&&j.catalizadores)],
    ['Riesgos',(a,j)=>lst(j&&j.riesgos)],
    ['A favor',(a,j)=>(j&&j.bull)?j.bull:'<span class="muted">—</span>'],
    ['En contra',(a,j)=>(j&&j.bear)?j.bear:'<span class="muted">—</span>'],
    ['Dossier',(a,j,t)=>dossCell(a,t)],
  ];
  const thead='<tr><th class="rowlbl"></th>'+cols.map(t=>{const a=AA[t],sc=cmpScore(a),d=(a.decision||'').toUpperCase();return `<th><div class="chdr"><div class="ct">${t}</div><div class="csec">${(typeof SECTOR!=='undefined'&&SECTOR[t])||''}</div><div class="cscore" style="color:${sCol(sc)}">${sc==null?'—':sc.toFixed(0)}<span>${sLbl(sc)}</span></div>${d?`<span class="cdec" style="background:${dcol[d]}">${d}</span>`:''}</div></th>`;}).join('')+'</tr>';
  const tbody=rowsDef.map(r=>{ if(r[0]==='sec')return `<tr class="secrow"><td colspan="${cols.length+1}">${r[1]}</td></tr>`; return `<tr><th class="rowlbl">${r[0]}</th>${cols.map(t=>`<td>${r[1](AA[t],J(t),t)}</td>`).join('')}</tr>`; }).join('');
  const deskHTML=`<div class="cmp-desk"><table class="cmp"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
  /* ---- MÓVIL: comparativa rápida + ficha plegable por empresa ---- */
  const miniRows=[
    ['Score',(a)=>{const sc=cmpScore(a);return `<b style="color:${sCol(sc)}">${sc==null?'—':sc.toFixed(0)}</b>`;}],
    ['Rating',(a)=>`<b>${a.rating||'—'}</b>`],
    ['Decisión',(a)=>{const d=(a.decision||'').toUpperCase();return d?`<span class="cdec sm" style="background:${dcol[d]}">${d.slice(0,4)}</span>`:'—';}],
    ['Potencial',(a)=>{const p=potOf(a);return `<b style="color:${p>=0?'#16a34a':'#dc2626'}">${pctF(p)}</b>`;}],
    ['Cotiz. / banda',(a)=>{const c=num(a.cotizacion),eM=num(a.entMax);const dot=(c&&eM)?(c<=eM?'🟢':c<=eM*1.10?'🟡':'🔴'):'';return dot+' '+fmt(c);}],
  ];
  const miniTable='<table class="minicmp"><thead><tr><th></th>'+cols.map(t=>`<th style="color:${sCol(cmpScore(AA[t]))}">${t}</th>`).join('')+'</tr></thead><tbody>'+miniRows.map(r=>`<tr><th>${r[0]}</th>${cols.map(t=>`<td>${r[1](AA[t])}</td>`).join('')}</tr>`).join('')+'</tbody></table>';
  window._cmpOpen=window._cmpOpen||{};
  const mcard=t=>{const a=AA[t],j=J(t),sc=cmpScore(a),d=(a.decision||'').toUpperCase(),p=potOf(a),op=window._cmpOpen[t]?' open':'';
    return `<div class="ccard${op}" data-cmpc="${t}"><div class="ccard-h"><div class="ct">${t}</div><div class="cmeta">${(typeof SECTOR!=='undefined'&&SECTOR[t])||''} · ${(typeof SUBTIPO!=='undefined'&&SUBTIPO[t])||''}</div><div class="cscore" style="color:${sCol(sc)}">${sc==null?'—':sc.toFixed(0)}<span>${sLbl(sc)}</span></div><span class="arw">▶</span></div>
    <div class="ccard-b"><div class="ccard-sub">${d?`<span class="cdec" style="background:${dcol[d]}">${d}</span>`:''}<span class="pill">Rating ${a.rating||'—'}</span><span class="pill" style="color:${p>=0?'#166534':'#991b1b'};background:${p>=0?'#dcfce7':'#fee2e2'}">Pot. ${pctF(p)}</span></div>
    <div class="cgrid">
      <div class="m"><span>Cotización</span><b>${fmt(num(a.cotizacion))}</b></div>
      <div class="m"><span>PO base</span><b>${poMedOf(a)?fmt(poMedOf(a)):'—'}</b></div>
      <div class="m"><span>PO bear/bull</span><b>${num(a.poMin)?fmt(num(a.poMin)):'—'} / ${num(a.poMax)?fmt(num(a.poMax)):'—'}</b></div>
      <div class="m"><span>Banda entrada</span><b>${num(a.entMax)?fmt(num(a.entMin))+' – '+fmt(num(a.entMax)):'—'}</b></div>
      <div class="m"><span>Estado</span><b>${bandTxt(a)}</b></div>
      <div class="m"><span>Stop tesis</span><b>${num(a.stopTesis)?fmt(num(a.stopTesis)):'—'}</b></div>
      <div class="m"><span>RPD</span><b>${num(a.cotizacion)?(num(a.divAccion)/num(a.cotizacion)*100).toFixed(2)+'%':'—'}</b></div>
      <div class="m"><span>Dossier</span><b>${dossCell(a,t)}</b></div>
    </div>
    <div class="cqual">
      <div class="q"><span>🏰 Moat</span><p>${(j&&j.moat)||'—'}</p></div>
      <div class="q"><span>🚀 Catalizadores</span>${lst(j&&j.catalizadores)}</div>
      <div class="q"><span>⚠️ Riesgos</span>${lst(j&&j.riesgos)}</div>
      <div class="q"><span>👍 A favor</span><p>${(j&&j.bull)||'—'}</p></div>
      <div class="q"><span>👎 En contra</span><p>${(j&&j.bear)||'—'}</p></div>
    </div></div></div>`;};
  const mobHTML=`<div class="cmp-mob"><div class="cmphdr">Comparativa rápida</div>${miniTable}<div class="cmphdr">Ficha por empresa</div>${cols.map(mcard).join('')}</div>`;
  wrap.innerHTML=deskHTML+mobHTML;
  if(!wrap._cmpBound){ wrap._cmpBound=true; wrap.addEventListener('click',function(e){ if(e.target.closest('a,button'))return; const h=e.target.closest('.ccard-h'); if(h){ const c=h.parentElement; c.classList.toggle('open'); const t=c.getAttribute('data-cmpc'); if(t){window._cmpOpen=window._cmpOpen||{};window._cmpOpen[t]=c.classList.contains('open');} } }); }
}
if($('#view-comparador'))$('#view-comparador').addEventListener('change',e=>{ const t=e.target; if(t&&/^cmp[0-2]$/.test(t.id||'')){ cmpSel[+t.id.slice(3)]=t.value; renderComparador(); } });
/* ===== Render selectivo: al cambiar datos repinta SOLO la vista activa (mapa vista→funciones).
   Las vistas ocultas se repintan al abrirlas (activarVista). Con red de seguridad: si una vista
   no está en el mapa, cae al render completo. ===== */
const VIEW_FNS={
  panel:['renderPanel','renderBuzonPanel'], comovoy:['renderComoVoy'], presupuesto:['renderPres'],
  movimientos:['renderMovs'], amalia:['renderAmalia'], mazinger:['renderMazinger'], fondor4:['renderFondoR4'], patrimonio:['renderPat'], desglose:['renderPresDesglose'], origen:['renderOrigen'],
  universo:['renderUniverso'], radar:['renderRadar'], cobertura:['renderCobertura'],
  vision:['renderVision'], escenarios:['renderEscenarios'], analisis:['renderAnalisis'], comparador:['renderComparador'], proxcompra:['renderProxCompra'], tesisinv:['renderTesisInv'],
  posiciones:['renderPOS'], inversiones:['renderInv'], ranking:['renderRanking'], rentabilidad:['renderRentabEmpresas'], caja:['renderCaja'], dividendos:['renderDividendos'], calendario:['renderCalendario'], prevision:['renderEvoDiv'], divfut:['renderDivFut'], atribucion:['renderAtribucion'], fiscalidad:['renderFiscalidad'],
  monitor:['renderMonitor'], hechos:['renderHechos'], buzon:['renderBuzon'], metodo:['renderPanelMetodo'], salud:['renderSalud'], riesgo:['renderRiesgo'],
  proyeccion:['renderProy'], independencia:['renderIndependencia'], diversif:['renderPlanLote'], plan:['renderPlan'], simulador:['renderSimulador'], rebalanceo:['renderRebalanceo'], metas:['renderMetas'], asignacion:['renderAsignacion'],
  informes:['renderInformesCenter'], hemeroteca:['renderHemeroteca'], hemeroanalisis:['renderHemeroAnalisis'], graficas:['renderGraficas'], backtest:['renderBacktest'], embudo:['renderEmbudo'], divcomp:['renderDiversifComp'], diario:['renderDiario']
};
function _activeViewId(){ const el=document.querySelector('.view.active'); return el? el.id.replace(/^view-/,'') : null; }
function renderView(id){ const fns=VIEW_FNS[id]; if(!fns)return false; fns.forEach(n=>{ try{ if(typeof window[n]==='function')window[n](); }catch(e){} }); return true; }
function renderAllFull(){ renderRenov(); renderComparador(); renderPanel(); renderMovs(); renderPres(); renderPresDesglose(); renderPat(); renderProy(); renderAmalia(); renderFondoR4(); if(typeof renderMetas==='function')renderMetas(); if(typeof renderAsignacion==='function')renderAsignacion(); renderInv(); if(typeof renderPOS==='function')renderPOS(); renderAnalisis(); renderDividendos(); renderRanking(); renderCalendario(); renderPrevision(); renderSimulador(); renderPlan(); renderPlanLote(); if(typeof renderRebalanceo==='function')renderRebalanceo(); if(typeof renderProxCompra==='function')renderProxCompra(); if(typeof renderBacktest==='function')renderBacktest(); if(typeof renderRiesgo==='function')renderRiesgo(); if(typeof renderFiscalidad==='function')renderFiscalidad(); if(typeof renderAtribucion==='function')renderAtribucion(); if(typeof renderRentabEmpresas==='function')renderRentabEmpresas(); renderGraficas(); renderCaja(); renderMonitor(); renderInformesCenter(); renderMazinger(); }
function renderAll(){ const id=_activeViewId(); if(id!=null && VIEW_FNS[id]){ renderView(id); } else { renderAllFull(); } }

/* ----- diálogo categoría ----- */
/* Nivel del diálogo: 'seccion' (capítulo) o 'partida' (línea dentro de un capítulo). */
function setCatNivel(n){
  const dlg=$('#catDlg'); if(!dlg)return;
  dlg.classList.toggle('nivel-seccion', n==='seccion');
  const seg=$('#catNivelSeg'); if(seg){ [...seg.children].forEach(b=>b.classList.toggle('on', b.getAttribute('data-nivel')===n)); }
  const lbl=$('#catNombreLbl'); if(lbl){ const inp=lbl.querySelector('input'); lbl.firstChild.textContent=(n==='seccion')?'Nombre del capítulo':'Nombre'; }
}
/* Abre el diálogo para una SECCIÓN (capítulo). gname vacío = nueva; con valor = editar/renombrar. */
function openSecDlg(gname){
  const dlg=$('#catDlg'); if(typeof fillGrupoList==='function')fillGrupoList();
  $('#catId').value=''; $('#catSecOrig').value=gname||'';
  $('#catNombre').value=gname||'';
  $('#catGrupo').value=''; $('#catTipo').value='gasto';
  $('#catImporte').value=0; $('#catFrec').value='mensual'; $('#catMetodo').value=''; $('#catRenov').value='';
  if($('#catEsencial'))$('#catEsencial').checked=false;
  $('#catDlgTitle').textContent=gname?('Editar capítulo · '+gname):'Nuevo capítulo de gasto';
  $('#catDelete').style.display=gname?'inline-block':'none';
  setCatNivel('seccion');
  dlg.showModal();
}
function openCatDlg(id,pg,pt){
  const dlg=$('#catDlg'); if(typeof fillGrupoList==='function')fillGrupoList();
  $('#catSecOrig').value='';
  if(id){
    const c=catById(id); const p=presFor(id,presYear)||{};
    $('#catDlgTitle').textContent='Editar partida · '+presYear;
    $('#catId').value=id; $('#catNombre').value=c.nombre; $('#catGrupo').value=c.grupo; $('#catTipo').value=c.tipo;
    $('#catImporte').value=p.importe||0; $('#catFrec').value=p.frecuencia||'mensual';
    $('#catMetodo').value=p.metodoPago||''; $('#catRenov').value=p.renovacion||'';
    if($('#catEsencial'))$('#catEsencial').checked=!!(c&&c.esencial);
    $('#catDelete').style.display='inline-block';
  } else {
    $('#catDlgTitle').textContent='Nueva partida';
    $('#catId').value=''; $('#catNombre').value=''; $('#catGrupo').value=''; $('#catTipo').value='gasto'; if(pg)$('#catGrupo').value=pg; if(pt)$('#catTipo').value=pt;
    $('#catImporte').value=0; $('#catFrec').value='mensual'; $('#catMetodo').value=''; $('#catRenov').value='';
    if($('#catEsencial'))$('#catEsencial').checked=false;
    $('#catDelete').style.display='none';
  }
  setCatNivel('partida');
  dlg.showModal();
}
function _dlgNivel(){ return $('#catDlg').classList.contains('nivel-seccion')?'seccion':'partida'; }
function _renameGrupo(oldName,newName){
  DB.categorias.forEach(c=>{ if(c.grupo===oldName)c.grupo=newName; });
  DB.config=DB.config||{}; if(Array.isArray(DB.config.capitulosExtra)){ DB.config.capitulosExtra=DB.config.capitulosExtra.map(g=>g===oldName?newName:g); }
}
function saveCat(){
  if(_dlgNivel()==='seccion'){
    const nombre=$('#catNombre').value.trim(); if(!nombre){alert('Pon el nombre del capítulo');return;}
    const orig=$('#catSecOrig').value;
    DB.config=DB.config||{}; DB.config.capitulosExtra=DB.config.capitulosExtra||[];
    const existe=(typeof _presGruposGasto==='function'?_presGruposGasto():[]).some(g=>g.toLowerCase()===nombre.toLowerCase() && g!==orig);
    if(existe){ alert('Ya existe un capítulo con ese nombre.'); return; }
    if(orig){ if(orig!==nombre)_renameGrupo(orig,nombre); }
    else { if(DB.config.capitulosExtra.indexOf(nombre)<0)DB.config.capitulosExtra.push(nombre); }
    $('#catDlg').close(); fillCatSelects&&fillCatSelects(); fillGrupoList&&fillGrupoList(); renderAll(); scheduleSave(); return;
  }
  const id=$('#catId').value;
  const nombre=$('#catNombre').value.trim(); if(!nombre){alert('Pon un nombre');return;}
  const grupo=$('#catGrupo').value.trim()||'Otros';
  const data={grupo,nombre,tipo:$('#catTipo').value,esencial:!!($('#catEsencial')&&$('#catEsencial').checked)};
  const pdata={importe:num($('#catImporte').value),frecuencia:$('#catFrec').value,metodoPago:$('#catMetodo').value.trim(),renovacion:$('#catRenov').value};
  if(id){
    Object.assign(catById(id),data);
    let p=presFor(id,presYear); if(p){Object.assign(p,pdata);} else {DB.presupuesto.push({id:uid(),categoriaId:id,...pdata,anio:presYear});}
  } else {
    const cid=uid(); DB.categorias.push({id:cid,...data}); DB.presupuesto.push({id:uid(),categoriaId:cid,...pdata,anio:presYear});
  }
  /* si la partida estrena capítulo, deja de ser "extra vacío" */
  DB.config=DB.config||{}; if(Array.isArray(DB.config.capitulosExtra))DB.config.capitulosExtra=DB.config.capitulosExtra.filter(g=>g!==grupo);
  $('#catDlg').close(); fillCatSelects(); fillGrupoList(); renderAll(); scheduleSave();
}
function deleteCat(){
  if(_dlgNivel()==='seccion'){
    const g=$('#catSecOrig').value; if(!g)return;
    const cats=(DB.categorias||[]).filter(c=>c.grupo===g);
    if(cats.length){
      if(!confirm('El capítulo «'+g+'» tiene '+cats.length+' partida(s). Se eliminarán todas junto con sus presupuestos. ¿Continuar?'))return;
      const ids=cats.map(c=>c.id);
      DB.categorias=DB.categorias.filter(c=>c.grupo!==g);
      DB.presupuesto=DB.presupuesto.filter(p=>ids.indexOf(p.categoriaId)<0);
    } else {
      if(!confirm('¿Eliminar el capítulo «'+g+'»?'))return;
    }
    DB.config=DB.config||{}; if(Array.isArray(DB.config.capitulosExtra))DB.config.capitulosExtra=DB.config.capitulosExtra.filter(x=>x!==g);
    $('#catDlg').close(); fillCatSelects(); fillGrupoList(); renderAll(); scheduleSave(); return;
  }
  const id=$('#catId').value; if(!id)return;
  const used=DB.movimientos.some(m=>m.categoriaId===id);
  if(used && !confirm('Esta categoría tiene movimientos asociados. Si la eliminas, esos movimientos quedarán sin categoría. ¿Continuar?'))return;
  if(!used && !confirm('¿Eliminar esta categoría?'))return;
  DB.categorias=DB.categorias.filter(c=>c.id!==id);
  DB.presupuesto=DB.presupuesto.filter(p=>p.categoriaId!==id);
  $('#catDlg').close(); fillCatSelects(); fillGrupoList(); renderAll(); scheduleSave();
}
/* Toggle Sección/Partida dentro del diálogo */
if($('#catNivelSeg'))$('#catNivelSeg').addEventListener('click',function(e){ const b=e.target.closest('button[data-nivel]'); if(b)setCatNivel(b.getAttribute('data-nivel')); });

/* ============ Eventos ============ */
const GROUPS={
  control:[['origen','El Origen'],['panel','Panel'],['comovoy','Cómo voy'],['presupuesto','Presupuesto'],['asignacion','Asignación']],
  embudo:[['embudo','Kanban/Kaizen']],
  mov:[['movimientos','Movimientos'],['amalia','Reembolsables'],['mazinger','Mazinger Z'],['fondor4','Fondo R4'],['patrimonio','Patrimonio'],['desglose','Desglose mensual']],
  trabajo:[['universo','Universo'],['radar','Radar Op.'],['cobertura','Cobertura']],
  eleccion:[['vision','Visión de conjunto'],['escenarios','Escenarios'],['riesgo','Riesgo'],['analisis','Análisis'],['comparador','Comparador']],
  cartera:[['posiciones','Posiciones'],['inversiones','Cartera'],['ranking','Ranking'],['rentabilidad','Rentabilidad'],['atribucion','Atribución']],
  retorno:[['dividendos','Dividendos'],['calendario','Calendario'],['prevision','Evolución del Dividendo'],['divfut','Actualizar Dividendos'],['fiscalidad','Fiscalidad'],['caja','Caja bróker']],
  tesis:[['monitor','Monitor'],['hechos','Diario de Hechos'],['buzon','Buzón del lunes'],['diario','Mis Decisiones'],['metodo','Panel del Método'],['salud','Salud del sistema'],['backtest','Backtest']],
  planinv:[['proyeccion','Proyección'],['independencia','Independencia'],['diversif','Diversificación'],['divcomp','Comparativa Div.'],['plan','Plan'],['simulador','Simulador'],['rebalanceo','Rebalanceo'],['metas','Metas']],
  informes:[['informes','Informes'],['hemeroteca','Hemeroteca Informes'],['hemeroanalisis','Hemeroteca Análisis']],
  graficas:[['graficas','Gráficas']]
};
function groupOf(view){ for(const g in GROUPS){ if(GROUPS[g].some(v=>v[0]===view)) return g; } return null; }
/* Botón flotante «+»: en cada vista lleva directo a donde se añade información */
const ADD_ACTIONS={
  movimientos:()=>{ const b=$('#blkMovAdd'); if(b)b.classList.add('open'); const f=$('#movForm'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); const d=$('#movFecha'); if(d&&!d.value)d.value=new Date().toISOString().slice(0,10); setTimeout(()=>{ const c=$('#movConcepto'); if(c)c.focus(); },350); },
  inversiones:()=>{ const b=$('#invAddBtn'); if(b)b.click(); setTimeout(()=>{ const f=$('#invForm'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); },60); },
  analisis:()=>{ const b=$('#anaAddBtn'); if(b)b.click(); setTimeout(()=>{ const f=$('#anaForm'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); },60); },
  fondor4:()=>{ const b=$('#blkR4Add'); if(b)b.classList.add('open'); const f=$('#r4Form'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); },
  amalia:()=>{ const b=$('#blkAmaAdd'); if(b)b.classList.add('open'); const f=$('#amaForm'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); },
  patrimonio:()=>{ const b=$('#blkPatReg'); if(b)b.classList.add('open'); const f=$('#patFormFields'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); },
  diversif:()=>{ if(typeof addLoteEmpresa==='function')addLoteEmpresa(); }
};
if($('#fabAdd'))$('#fabAdd').addEventListener('click',()=>{ const fn=ADD_ACTIONS[_activeViewId()]; if(fn)try{ fn(); }catch(e){} });
const groupCurrent={embudo:'embudo', control:'panel', mov:'movimientos', trabajo:'radar', eleccion:'analisis', cartera:'posiciones', retorno:'dividendos', tesis:'monitor', planinv:'proyeccion', informes:'informes', graficas:'graficas'};
function activarVista(view){
  $$('.view').forEach(v=>v.classList.remove('active'));
  const el=$('#view-'+view); if(el)el.classList.add('active');
  const g=groupOf(view); const sn=$('#subnav');
  if(g){ groupCurrent[g]=view; if(sn){ sn.style.display='flex'; sn.innerHTML=GROUPS[g].map(v=>`<button data-sub="${v[0]}"${v[0]===view?' class="active"':''}>${v[1]}</button>`).join('')+'<button class="sn-all" data-snall="1" title="Desplegar o plegar todas las secciones de esta pestaña" style="display:none">⤢<span class="sn-all-t"> Todo</span></button>'; } }
  else if(sn){ sn.style.display='none'; sn.innerHTML=''; }
  $$('#nav button').forEach(x=>x.classList.toggle('active', g ? (x.dataset.group===g) : (x.dataset.view===view)));
  if(view==='dividendos'&&typeof renderDividendos==='function') setTimeout(renderDividendos,60);
  if(view==='calendario'&&typeof renderCalendario==='function'){ setTimeout(renderCalendario,60); }
  if(view==='ranking'&&typeof renderRanking==='function') setTimeout(renderRanking,60);
  if(view==='prevision') setTimeout(()=>autoFitTable('prevTabla',7,11),120);
  if(view==='simulador'){ window._simSeek=true; setTimeout(()=>autoFitTable('simTabla',7,10),120); }
  if(view==='diversif') window._loteSeek=true;
  if(view==='plan') setTimeout(function(){ if(typeof _planSyncBand==='function')_planSyncBand(); },120);
  /* Render selectivo: repinta la vista que se abre (o completo si no está en el mapa) */
  if(!renderView(view)) renderAllFull();
  if(typeof renderInfoBoxes==='function') renderInfoBoxes();
  /* Botón «desplegar/plegar todo»: solo si la vista tiene bloques colapsables */
  if(sn){ const _sa=sn.querySelector('.sn-all'); if(_sa){ const _hb=el&&el.querySelector('.pos-blk,.rz-blk,.mos-blk,.p7blk,.blk,.psec,.inf-catg'); _sa.style.display=_hb?'':'none'; } }
  /* Botón flotante «+»: visible (en móvil) solo si la vista tiene acción de añadir */
  const _fab=$('#fabAdd'); if(_fab) _fab.classList.toggle('fab-hidden', !ADD_ACTIONS[view]);
}
$('#nav').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; if(b.dataset.group){ activarVista(groupCurrent[b.dataset.group]); } else if(b.dataset.view){ activarVista(b.dataset.view); } });
$('#subnav').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; if(b.dataset.snall){ if(typeof toggleAllSections==='function')toggleAllSections(); return; } if(b.dataset.sub)activarVista(b.dataset.sub); });
/* Despliega/pliega todos los bloques colapsables de la vista activa (manipula el DOM y sincroniza estados) */
function toggleAllSections(){
  const view=document.querySelector('.view.active'); if(!view)return;
  const SEL='.pos-blk,.rz-blk,.mos-blk,.p7blk,.blk,.psec,.inf-catg';
  const els=[].slice.call(view.querySelectorAll(SEL)); if(!els.length)return;
  const anyClosed=els.some(b=>!b.classList.contains('open'));
  els.forEach(b=>b.classList.toggle('open',anyClosed));
  try{ [window._invOpen,window._rankBlk,window._fiscBlk,window._atribBlk,window._btBlk,window._grafBlk,window._riesgoOpen,window._panelSecOpen,window._c5Blk,window._indepBlk].forEach(o=>{ if(o&&typeof o==='object')Object.keys(o).forEach(k=>{o[k]=anyClosed;}); }); }catch(e){}
  try{ window._proxMosOpen=anyClosed; window._rebP7Open=anyClosed; window._proxNearOpen=anyClosed; }catch(e){}
  const _sa=document.querySelector('#subnav .sn-all'); if(_sa){ _sa.classList.toggle('on',!anyClosed); }
}
/* ===== Móvil v2: barra inferior + hoja «Más» + tablas en tarjetas ===== */
(function(){
  var GC=(typeof groupCurrent!=='undefined')?groupCurrent:{};
  function go(g){ if(!g)return; if(typeof activarVista==='function') activarVista(GC[g]||g); }
  var bnav=document.getElementById('botNav');
  var sheet=document.getElementById('botSheet');
  function sheetOpen(v){ if(!sheet)return; if(v===undefined)v=!sheet.classList.contains('open'); sheet.classList.toggle('open',v); }
  if(bnav){ bnav.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b)return; var g=b.getAttribute('data-bgroup'); if(g==='mas'){ sheetOpen(); return; } go(g); sheetOpen(false); }); }
  if(sheet){ sheet.addEventListener('click',function(e){ if(e.target===sheet){ sheetOpen(false); return; } var b=e.target.closest('button[data-bgroup]'); if(!b)return; go(b.getAttribute('data-bgroup')); sheetOpen(false); }); }
  function syncBottom(){ if(!bnav)return; var a=document.querySelector('#nav button.active'); var g=a?a.getAttribute('data-group'):null; var main4=['control','cartera','eleccion','planinv']; var btns=bnav.querySelectorAll('button'); for(var i=0;i<btns.length;i++){ var bg=btns[i].getAttribute('data-bgroup'); var on=(bg===g)||(bg==='mas'&&g&&main4.indexOf(g)<0); btns[i].classList.toggle('on',on); } }
  var navEl=document.getElementById('nav');
  if(navEl&&window.MutationObserver){ new MutationObserver(syncBottom).observe(navEl,{subtree:true,attributes:true,attributeFilter:['class']}); }
  syncBottom();
  /* Tablas de lista -> tarjetas en móvil: inyecta data-label desde las cabeceras */
  var CARD_IDS=['invTable','anaTable','rankTabla','loteTabla'];
  function labelize(host){ if(!host)return; var t=host.querySelector('table'); if(!t)return; var ths=t.querySelectorAll('thead th'); if(!ths.length)return; var heads=[]; for(var i=0;i<ths.length;i++){ heads.push((ths[i].textContent||'').replace(/[▲▼▶▸›>\s]+$/,'').trim()); } var rows=t.querySelectorAll('tbody tr'); for(var r=0;r<rows.length;r++){ var tds=rows[r].children; for(var c=0;c<tds.length;c++){ if(tds[c].hasAttribute('colspan'))continue; tds[c].setAttribute('data-label',heads[c]!==undefined?heads[c]:''); } } }
  CARD_IDS.forEach(function(id){ var el=document.getElementById(id); if(!el)return; el.classList.add('cardify'); labelize(el); if(window.MutationObserver){ new MutationObserver(function(){ labelize(el); }).observe(el,{childList:true,subtree:true}); } });
})();
$('#panelDash').addEventListener('click',e=>{
  const sv=e.target.closest('[data-avseen]'); if(sv){ const k=sv.dataset.avseen; DB.avisosVistos=DB.avisosVistos||{}; if(DB.avisosVistos[k])delete DB.avisosVistos[k]; else DB.avisosVistos[k]=Date.now(); if(typeof saveNow==='function')saveNow(); if(typeof renderPanelDash==='function')renderPanelDash(); return; }
  const sa=e.target.closest('[data-avseenall]'); if(sa){ DB.avisosVistos=DB.avisosVistos||{}; (sa.dataset.avseenall||'').split('~').forEach(k=>{ if(k)DB.avisosVistos[k]=Date.now(); }); if(typeof saveNow==='function')saveNow(); if(typeof renderPanelDash==='function')renderPanelDash(); return; }
  const ft=e.target.closest('[data-avtipo]'); if(ft){ window._avFiltro=window._avFiltro||{tipo:'',showSeen:false}; window._avFiltro.tipo=ft.dataset.avtipo||''; if(typeof renderPanelDash==='function')renderPanelDash(); return; }
  const sh=e.target.closest('[data-avshow]'); if(sh){ window._avFiltro=window._avFiltro||{tipo:'',showSeen:false}; window._avFiltro.showSeen=!window._avFiltro.showSeen; if(typeof renderPanelDash==='function')renderPanelDash(); return; }
  const h=e.target.closest('[data-goto]'); if(!h)return; if(h.dataset.sig&&typeof showProtocolo==='function'){ showProtocolo(h.dataset.sig,h.dataset.goto,h.dataset.ticker||''); return; } if(typeof activarVista==='function') activarVista(h.dataset.goto); });
if($('#view-asignacion')){
  $('#view-asignacion').addEventListener('click',e=>{ const a=e.target.closest('#asignAdd'); if(a){ if(typeof addClase==='function')addClase(); return; } const au=e.target.closest('#asignAuto'); if(au){ if(typeof autorellenarAsignacion==='function')autorellenarAsignacion(); return; } const d=e.target.closest('[data-asigndel]'); if(d){ if(confirm('¿Eliminar esta clase de activo?')){ DB.asignacion=(DB.asignacion||[]).filter(x=>x.id!==d.dataset.asigndel); saveNow(); if(typeof renderAsignacion==='function')renderAsignacion(); if(typeof renderPanel==='function')renderPanel(); } } });
  $('#view-asignacion').addEventListener('change',e=>{ const t=e.target.closest('[data-asign]'); if(!t)return; const a=t.dataset.asign.split('|'); const c=(DB.asignacion||[]).find(x=>x.id===a[0]); if(!c)return; const f=a[1]; if(f==='nombre')c[f]=t.value; else c[f]=(t.value.trim()===''?0:num(t.value)); saveNow(); if(typeof renderAsignacion==='function')renderAsignacion(); if(typeof renderPanel==='function')renderPanel(); });
}
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
$('#view-caja').addEventListener('click',e=>{ const d=e.target.closest('[data-cajadel]'); if(d){ DB.cajaMov=(DB.cajaMov||[]).filter(x=>x.id!==d.dataset.cajadel); saveNow(); renderCaja(); return; }
  if(e.target.closest('input,select,button,label,[data-ficha]'))return;
  const h=e.target.closest('#view-caja .pos-blk-h'); if(h){ const b=h.parentElement; b.classList.toggle('open'); const k=b.getAttribute('data-cajablk'); if(k){ window._cajaBlk=window._cajaBlk||{}; window._cajaBlk[k]=b.classList.contains('open'); } } });
let cajaTipo='';
if($('#cajaTipoSeg'))$('#cajaTipoSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(!b)return; cajaTipo=b.dataset.t; [...$('#cajaTipoSeg').children].forEach(x=>x.classList.toggle('on',x===b)); });
if($('#cajaForm'))$('#cajaForm').addEventListener('submit',e=>{ e.preventDefault(); const f=$('#cajaFecha').value; const c=($('#cajaConcepto').value||'').trim(); const imp=num($('#cajaImporte').value); if(!f||!imp){ alert('Pon fecha e importe.'); return; } if(!cajaTipo){ alert('Elige el tipo: Ingreso o Gasto.'); return; } DB.cajaMov=DB.cajaMov||[]; DB.cajaMov.push({id:'c'+Math.random().toString(36).slice(2,9),fecha:f,concepto:c,entra:cajaTipo==='entra'?imp:0,sale:cajaTipo==='sale'?imp:0}); saveNow(); $('#cajaForm').reset(); $('#cajaForm').style.display='none'; cajaTipo=''; [...$('#cajaTipoSeg').children].forEach(x=>x.classList.remove('on')); renderCaja(); });
if($('#cajaFormCancel'))$('#cajaFormCancel').addEventListener('click',()=>{ $('#cajaForm').reset(); $('#cajaForm').style.display='none'; cajaTipo=''; [...$('#cajaTipoSeg').children].forEach(x=>x.classList.remove('on')); });
if($('#todoForm'))$('#todoForm').addEventListener('submit',e=>{ e.preventDefault(); const desc=($('#todoDesc').value||'').trim(); if(!desc){ alert('Pon una descripción.'); return; } DB.todos=DB.todos||[]; DB.todos.push({id:'t'+Math.random().toString(36).slice(2,9),fecha:$('#todoFecha').value,desc,razon:($('#todoRazon').value||'').trim(),ticker:($('#todoTicker').value||'').trim().toUpperCase(),hecho:false}); saveNow(); $('#todoForm').reset(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); });
if($('#todoDelDone'))$('#todoDelDone').addEventListener('click',()=>{ if(!confirm('¿Borrar todas las tareas completadas?'))return; DB.todos=(DB.todos||[]).filter(x=>!x.hecho); saveNow(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); });
if($('#view-monitor'))$('#view-monitor').addEventListener('change',e=>{ const c=e.target.closest('[data-todone]'); if(c){ const x=(DB.todos||[]).find(z=>z.id===c.dataset.todone); if(x){ x.hecho=c.checked; x.fechaHecho=c.checked?new Date().toISOString().slice(0,10):''; saveNow(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); } return; } const r=e.target.closest('[data-mon]'); if(r){ const a=r.dataset.mon.split('|'); DB.monitor[a[0]]=DB.monitor[a[0]]||{}; DB.monitor[a[0]].rol=r.value; saveNow(); return; } });
if($('#view-monitor'))$('#view-monitor').addEventListener('click',e=>{ const d=e.target.closest('[data-tododel]'); if(d){ DB.todos=(DB.todos||[]).filter(x=>x.id!==d.dataset.tododel); saveNow(); renderMonitor(); if(typeof renderPanel==='function')renderPanel(); return; }
  { const h=e.target.closest('#view-monitor .pos-blk-h'); if(h && !e.target.closest('input,select,button,label,[data-ficha]')){ h.parentElement.classList.toggle('open'); return; } }
  const inf=e.target.closest('[data-moninf]'); if(inf){ const t=inf.dataset.moninf; DB.monitor[t]=DB.monitor[t]||{}; const m=DB.monitor[t]; m.informe=!m.informe; m.informeFecha=m.informe?new Date().toISOString().slice(0,10):''; saveNow(); renderMonitor(); return; } const rv=e.target.closest('[data-monrev]'); if(rv){ const a=rv.dataset.monrev.split('|'); const t=a[0],key=a[1]; DB.monitor[t]=DB.monitor[t]||{}; DB.monitor[t].rev=DB.monitor[t].rev||{}; if(DB.monitor[t].rev[key])delete DB.monitor[t].rev[key]; else DB.monitor[t].rev[key]=true; saveNow(); renderMonitor(); return; } });
function _loteTk(v){ const m=(v||'').match(/\(([^)]+)\)\s*$/); let tk=m?m[1]:(v||''); tk=tk.trim().toUpperCase(); const all=new Set((DB.analisis||[]).map(a=>(a.ticker||'').toUpperCase())); return all.has(tk)?tk:''; }
$('#loteTabla').addEventListener('change',e=>{ const dp=e.target.closest('[data-lotedisp]'); if(dp){ DB.planDispFijo=DB.planDispFijo||{}; if(dp.value.trim()==='')delete DB.planDispFijo[dp.dataset.lotedisp]; else DB.planDispFijo[dp.dataset.lotedisp]=num(dp.value); saveNow(); renderPlanLote(); return; } const ag=e.target.closest('[data-asig]'); if(ag){ const [t,y]=ag.dataset.asig.split('|'); DB.planCompras=DB.planCompras||{}; DB.planCompras[t]=DB.planCompras[t]||{}; if(ag.value.trim()==='')delete DB.planCompras[t][y]; else DB.planCompras[t][y]=num(ag.value); saveNow(); renderPlanLote(); if(typeof renderPlan==='function')renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); return; } const yr=e.target.closest('[data-loteyr]'); if(yr){ DB.planLotePeriodo=DB.planLotePeriodo||{}; DB.planLotePeriodo[yr.dataset.loteyr]=num(yr.value); saveNow(); renderPlanLote(); if(typeof renderPlan==='function')renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); return; } const ad=e.target.closest('[data-loteadd]'); if(ad){ const tk=_loteTk(ad.value); if(tk){ DB.planLote=DB.planLote||[]; if(!DB.planLote.includes(tk))DB.planLote.push(tk); } saveNow(); renderPlanLote(); return; } const ch=e.target.closest('[data-lotechg]'); if(ch){ const i=+ch.dataset.lotechg; const tk=_loteTk(ch.value); if(!ch.value.trim()){ DB.planLote.splice(i,1); } else if(tk){ DB.planLote[i]=tk; } saveNow(); renderPlanLote(); } });
$('#loteTabla').addEventListener('click',e=>{ const d=e.target.closest('[data-lotedel]'); if(d){ DB.planLote.splice(+d.dataset.lotedel,1); saveNow(); renderPlanLote(); } });
$('#loteTabla').addEventListener('change',e=>{ const tp=e.target.closest('[data-lotetipo]'); if(tp){ DB.planTipo=DB.planTipo||{}; if(tp.value)DB.planTipo[tp.dataset.lotetipo]=tp.value; else delete DB.planTipo[tp.dataset.lotetipo]; saveNow(); renderPlanLote(); } });
if($('#prevAdd'))$('#prevAdd').addEventListener('click',addPrevEmpresa);
if($('#evAdd'))$('#evAdd').addEventListener('click',addEventoEmpresa);
if($('#loteAdd'))$('#loteAdd').addEventListener('click',addLoteEmpresa);
if($('#btRegen'))$('#btRegen').addEventListener('click',function(){ if(typeof regenerarFotosDossiers==='function')regenerarFotosDossiers(); });
/* +Año de Plan retirado: el horizonte se controla en Diversificación */
$('#planTabla').addEventListener('click',e=>{ const b=e.target.closest('[data-planexe]'); if(b){ const [t,y]=b.dataset.planexe.split('|'); if(confirm('¿Quitar del Plan la compra de '+t+' en '+y+'? Ya tienes operación real ese año.')){ if(DB.planCompras&&DB.planCompras[t])delete DB.planCompras[t][y]; saveNow(); renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); } } });
$('#planTabla').addEventListener('change',e=>{ const a=e.target.closest('[data-plan]'); if(a){ const t=a.dataset.plan,y=a.dataset.y; DB.planCompras=DB.planCompras||{}; DB.planCompras[t]=DB.planCompras[t]||{}; if(a.value.trim()==='')delete DB.planCompras[t][y]; else DB.planCompras[t][y]=num(a.value); saveNow(); renderPlan(); if(typeof renderSimulador==='function')renderSimulador(); return; } const p=e.target.closest('[data-plpres]'); if(p){ DB.planPresupuesto=DB.planPresupuesto||{}; if(p.value.trim()==='')delete DB.planPresupuesto[p.dataset.plpres]; else DB.planPresupuesto[p.dataset.plpres]=num(p.value); saveNow(); renderPlan(); } });
function addPrevYear(){ DB.previsionMaxYear=(num(DB.previsionMaxYear)||2030)+1; saveNow(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); if(typeof renderPlan==='function')renderPlan(); }
function toggleDivConf(t,y){ DB.divConfirmado=DB.divConfirmado||{}; DB.divConfirmado[t]=DB.divConfirmado[t]||{}; if(DB.divConfirmado[t][y]) delete DB.divConfirmado[t][y]; else DB.divConfirmado[t][y]=true; saveNow(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); }
function toggleAnioConf(y){ DB.aniosConfirmados=DB.aniosConfirmados||{}; if(DB.aniosConfirmados[y]) delete DB.aniosConfirmados[y]; else DB.aniosConfirmados[y]=true; saveNow(); if(typeof renderPrevision==='function')renderPrevision(); if(typeof renderSimulador==='function')renderSimulador(); }
if($('#prevAddYear'))$('#prevAddYear').addEventListener('click',addPrevYear);
/* +Año del Simulador retirado: el horizonte se controla en Diversificación */
/* +Empresa del Simulador retirado: alta canónica en Diversificación */
if($('#prevTabla'))$('#prevTabla').addEventListener('click',e=>{ const d=e.target.closest('[data-divconf]'); if(d){ const [t,y]=d.dataset.divconf.split('|'); toggleDivConf(t,y); return; } const h=e.target.closest('[data-yhead]'); if(h) toggleAnioConf(h.dataset.yhead); });
$('#simTabla').addEventListener('click',e=>{ const d=e.target.closest('[data-divconf]'); if(d){ const [t,y]=d.dataset.divconf.split('|'); toggleDivConf(t,y); return; } const h=e.target.closest('[data-yhead]'); if(h) toggleAnioConf(h.dataset.yhead); });
$('#simTabla').addEventListener('change',e=>{ const a=e.target.closest('[data-sim]'); if(a){ const t=a.dataset.sim,y=a.dataset.y; DB.simShares=DB.simShares||{}; DB.simShares[t]=DB.simShares[t]||{}; if(a.value.trim()==='') delete DB.simShares[t][y]; else DB.simShares[t][y]=num(a.value); saveNow(); renderSimulador(); return; } });
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
/* Bloques plegables de Movimientos (Añadir / Filtros / Lista) */
if($('#view-movimientos'))$('#view-movimientos').addEventListener('click',e=>{ const h=e.target.closest('[data-movblk]'); if(!h)return; const blk=document.getElementById(h.getAttribute('data-movblk')); if(blk)blk.classList.toggle('open'); });
/* Expandir/contraer una fila de movimiento */
$('#movTable').addEventListener('click',e=>{ const r=e.target.closest('[data-movrow]'); if(!r)return; if(e.target.closest('input,button,select,a'))return; const it=r.closest('.mv-item'); if(it)it.classList.toggle('open'); });
$('#movTable').addEventListener('click',e=>{
  const ed=e.target.closest('[data-edit]'), de=e.target.closest('[data-del]');
  if(ed) editMov(ed.dataset.edit);
  if(de){ const _id=de.dataset.del; const _it=(DB.movimientos||[]).find(m=>m.id===_id); if(_it)undoableDelete('movimiento','Movimiento '+fmt(num(_it.importe))+(_it.detalle?(' · '+_it.detalle):(_it.comercio?(' · '+_it.comercio):'')),{item:_it},()=>{DB.movimientos=DB.movimientos.filter(m=>m.id!==_id);},['renderAll']); }
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
{const _dy=$('#presDesgloseYear'); if(_dy) _dy.addEventListener('change',()=>{ if(typeof renderPresDesglose==='function') renderPresDesglose(); });}
{const _st=$('#presSubtabs'); if(_st) _st.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; const t=b.dataset.ptab;
  _st.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  const a=$('#ptab-anual'), d=$('#ptab-desglose');
  if(a)a.style.display=(t==='anual')?'':'none';
  if(d)d.style.display=(t==='desglose')?'':'none';
  if(t==='desglose'&&typeof renderPresDesglose==='function') renderPresDesglose();
});}
$('#patAdd').addEventListener('click',addSnapshot);
$('#patAddCuenta').addEventListener('click',addCuenta);
if($('#view-patrimonio')) $('#view-patrimonio').addEventListener('click',e=>{ const h=e.target.closest('[data-patblk]'); if(!h)return; const blk=document.getElementById(h.getAttribute('data-patblk')); if(blk)blk.classList.toggle('open'); });
if($('#patRegCancel')) $('#patRegCancel').addEventListener('click',()=>{ if(typeof resetPatForm==='function')resetPatForm(); });
$('#patCuentas').addEventListener('click',e=>{const b=e.target.closest('[data-delcuenta]');if(b)delCuenta(b.dataset.delcuenta);});
$('#proyAddEvento').addEventListener('click',addEvento);
$('#amaForm').addEventListener('submit',e=>{e.preventDefault();addAmalia();});
$('#amaImportBtn').addEventListener('click',()=>$('#amaFile').click());
if($('#view-amalia'))$('#view-amalia').addEventListener('click',e=>{ const h=e.target.closest('[data-amablk]'); if(!h)return; const blk=document.getElementById(h.getAttribute('data-amablk')); if(blk)blk.classList.toggle('open'); });
if($('#amaTipoSeg'))$('#amaTipoSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(b&&typeof setAmaTipo==='function')setAmaTipo(b.dataset.t); });
if($('#amaCancel'))$('#amaCancel').addEventListener('click',()=>{ if(typeof resetAmaForm==='function')resetAmaForm(); });
if($('#amaBuscar'))$('#amaBuscar').addEventListener('input',renderAmalia);
if($('#amaFtipo'))$('#amaFtipo').addEventListener('change',renderAmalia);
if($('#r4Form')) $('#r4Form').addEventListener('submit',e=>{e.preventDefault();addFondoR4();});
if($('#r4ImportBtn')) $('#r4ImportBtn').addEventListener('click',()=>$('#r4File').click());
if($('#r4Tipo')) $('#r4Tipo').addEventListener('change',()=>{ const rt=$('#r4NetoWrap'); if(rt) rt.style.display=($('#r4Tipo').value==='retirada'?'':'none'); });
if($('#r4Ret')) $('#r4Ret').addEventListener('input',()=>{ const el=$('#r4RetCalc'); if(!el)return; const c=r4DesdeRetencion($('#r4Ret').value); el.textContent=(c.retencion>0)?(' → bruto '+fmt(c.bruto)+' € · neto '+fmt(c.neto)+' €'):''; });
if($('#r4Orden')) $('#r4Orden').addEventListener('change',renderFondoR4);
if($('#view-fondor4')) $('#view-fondor4').addEventListener('click',e=>{ const h=e.target.closest('[data-r4blk]'); if(!h)return; const blk=document.getElementById(h.getAttribute('data-r4blk')); if(blk)blk.classList.toggle('open'); });
if($('#r4TipoSeg')) $('#r4TipoSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(b&&typeof setR4Tipo==='function')setR4Tipo(b.dataset.t); });
if($('#r4Cancel')) $('#r4Cancel').addEventListener('click',()=>{ if(typeof resetR4Form==='function')resetR4Form(); });
if($('#r4Buscar')) $('#r4Buscar').addEventListener('input',renderFondoR4);
if($('#r4Ftipo')) $('#r4Ftipo').addEventListener('change',renderFondoR4);
if($('#posFiltro')) $('#posFiltro').addEventListener('change',()=>{ if(typeof renderPOS==='function')renderPOS(); });
if($('#posOrden')) $('#posOrden').addEventListener('change',()=>{ if(typeof renderPOS==='function')renderPOS(); });
if($('#r4List')) $('#r4List').addEventListener('click',e=>{
  const ed=e.target.closest('[data-editr4]'); if(ed){ if(typeof editFondoR4==='function')editFondoR4(ed.dataset.editr4); return; }
  const b=e.target.closest('[data-delr4]'); if(b){ const _id=b.dataset.delr4; const _it=(DB.easy||[]).find(x=>x.id===_id); if(_it)undoableDelete('easy','Movimiento Fondo R4'+(_it.fecha?(' '+_it.fecha):''),{item:_it},()=>{ DB.easy=(DB.easy||[]).filter(x=>x.id!==_id); },['renderFondoR4']); return; }
  const r=e.target.closest('[data-r4row]'); if(r){ if(e.target.closest('input,button,select,a'))return; const it=r.closest('.r4-item'); if(it)it.classList.toggle('open'); }
});
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
$('#invTicker').addEventListener('change',()=>{ if(typeof invPrefillTicker==='function')invPrefillTicker(); });
$('#invImportBtn').addEventListener('click',()=>$('#invFile').click());
$('#invTable').addEventListener('click',e=>{const op=e.target.closest('[data-ops-t]'),de=e.target.closest('[data-del-t]');
  if(op){ invOpsTicker=op.dataset.opsT; invOpsCartera=op.dataset.opsC; renderInvOps(); const el=$('#invOpsPanel'); if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  if(de){ const t=de.dataset.delT, car=de.dataset.delC; const _items=(DB.operaciones||[]).filter(o=>((o.ticker||'').toUpperCase()===t && (o.cartera||'Propia')===car)); if(_items.length)undoableDelete('operaciones_ticker','Operaciones de '+t+' ('+car+', '+_items.length+')',{items:_items},()=>{ DB.operaciones=DB.operaciones.filter(o=>!((o.ticker||'').toUpperCase()===t && (o.cartera||'Propia')===car)); if(invOpsTicker===t&&invOpsCartera===car)invOpsTicker=null; },['renderAll','renderInvOps']); }});
$('#opAdd').addEventListener('click',addOp);
$('#opClose').addEventListener('click',()=>{opEditEnd(); invOpsTicker=null; renderInvOps();});
$('#opCancelEdit').addEventListener('click',()=>{opEditEnd(); $('#opAcc').value=''; $('#opPrecio').value='';});
$('#invOpsList').addEventListener('click',e=>{const ed=e.target.closest('[data-editop]'),d=e.target.closest('[data-delop]'); if(ed){editOp(ed.dataset.editop);return;} if(d){ const _id=d.dataset.delop; const _it=(DB.operaciones||[]).find(o=>o.id===_id); if(_it){ if(opEditId===_id)opEditEnd(); undoableDelete('operacion',(_it.tipo==='venta'?'Venta ':'Compra ')+_it.acciones+' '+(_it.ticker||'')+' @ '+fmt(num(_it.precio)),{item:_it},()=>{DB.operaciones=DB.operaciones.filter(o=>o.id!==_id);},['renderAll','renderInvOps']); } }});
$('#invOpsMeta').addEventListener('change',e=>{const t=e.target; if(t.dataset&&t.dataset.meta&&invOpsTicker){ const v=DB.valores[invOpsTicker]=DB.valores[invOpsTicker]||{}; const k=t.dataset.meta; v[k]=(k==='precioActual'||k==='divAccion')?num(t.value):t.value; renderInv(); scheduleSave(); }});
$('#anaAddBtn').addEventListener('click',()=>{const f=$('#anaForm'); f.reset(); $('#anaId').value=''; $('#anaSubmit').textContent='Añadir'; f.style.display=(f.style.display==='none'||!f.style.display)?'grid':'none';});
$('#anaForm').addEventListener('submit',e=>{e.preventDefault();anaSubmit();});
$('#anaCancel').addEventListener('click',()=>{$('#anaForm').style.display='none';});
$('#anaTable').addEventListener('click',e=>{const ed=e.target.closest('[data-anaedit]'),de=e.target.closest('[data-anadel]'); if(ed)anaEdit(ed.dataset.anaedit); if(de){ const _id=de.dataset.anadel; const _it=(DB.analisis||[]).find(x=>x.id===_id); if(_it)undoableDelete('analisis','Empresa '+(_it.ticker||_it.nombre||'')+' (Análisis)',{item:_it},()=>{DB.analisis=DB.analisis.filter(x=>x.id!==_id);},['renderAll']); }});
$('#anaTable').addEventListener('change',e=>{const t=e.target; if(t.classList&&t.classList.contains('anaInp')&&t.dataset.f){const a=DB.analisis.find(x=>x.id===t.dataset.id); if(a){ const f=t.dataset.f;
  /* 5.2.e: cambio de decision/banda/stop en una tesis YA establecida => rastro + motivo + recordatorio §10.5 */
  const CRIT={decision:'la decision',entMin:'la banda de entrada (minimo)',entMax:'la banda de entrada (maximo)',stopTesis:'el stop de tesis'};
  let critChg=false;
  if(CRIT[f]){ const nv=(f==='decision')?(t.value||'').trim().toUpperCase():num(t.value); const ov=(f==='decision')?(a.decision||'').toUpperCase():num(a[f]); const tenia=(f==='decision')?!!ov:ov>0; if(tenia && nv!==ov) critChg=true; }
  if(f==='rating'){a.rating=(t.value||'').trim().toUpperCase();} else if(f==='decision'){a.decision=(t.value||'').trim().toUpperCase(); const _dcm={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; t.style.color=_dcm[a.decision]||'#475569'; if(critChg&&typeof anotarAjusteTesis==='function')anotarAjusteTesis(a.ticker,CRIT[f]); scheduleSave(); return;} else {a[f]=num(t.value); const pmn=num(a.poMin),pmx=num(a.poMax); a.precioObjetivo=(pmn&&pmx)?(pmn+pmx)/2:(pmx||pmn||0); a.precioEntrada=num(a.entMax);} if(critChg&&typeof anotarAjusteTesis==='function')anotarAjusteTesis(a.ticker,CRIT[f]); renderAnalisis(); scheduleSave();}}});
$('#anaClear').addEventListener('click',()=>{ if(confirm('¿Vaciar TODA la lista de Análisis? (no afecta a tu cartera)')){ if(typeof pushSnapshot==='function')pushSnapshot('antes de vaciar Análisis'); DB.analisis=[]; renderAnalisis(); scheduleSave(); } });
$('#presImportBtn').addEventListener('click',()=>$('#presFile').click());
$('#amaList').addEventListener('click',e=>{
  const ed=e.target.closest('[data-editama]'); if(ed){ if(typeof editAmalia==='function')editAmalia(ed.dataset.editama); return; }
  const b=e.target.closest('[data-delama]'); if(b){ const _id=b.dataset.delama; const _it=(DB.amalia||[]).find(x=>x.id===_id); if(_it)undoableDelete('amalia','Apunte reembolsable'+(_it.concepto?(' · '+_it.concepto):''),{item:_it},()=>{DB.amalia=DB.amalia.filter(x=>x.id!==_id);},['renderAmalia']); return; }
  const r=e.target.closest('[data-amarow]'); if(r){ if(e.target.closest('input,button,select,a'))return; const it=r.closest('.ama-item'); if(it)it.classList.toggle('open'); }
});
$('#proyEventos').addEventListener('click',e=>{const b=e.target.closest('[data-delev]');if(b){DB.config.proyeccion.eventos.splice(+b.dataset.delev,1);renderProy();scheduleSave();}});
document.addEventListener('change',e=>{ const t=e.target; if(!t||!t.dataset)return; if(t.id==='proyRealTgl'){ window._proyRealOn=t.checked; if(typeof renderProy==='function')renderProy(); return; } if(t.dataset.proy){ let v=num(t.value); if(t.dataset.pct==='1') v=v/100; DB.config.proyeccion[t.dataset.proy]=v; renderProy(); scheduleSave(); } else if(t.classList&&t.classList.contains('aporInput')){ DB.config.proyeccion.aportaciones[t.dataset.anio]=num(t.value); renderProy(); scheduleSave(); } else if(t.classList&&t.classList.contains('extraInput')){ DB.config.proyeccion.ingresosExtra=DB.config.proyeccion.ingresosExtra||{}; const _xv=num(t.value); if(_xv>0){ DB.config.proyeccion.ingresosExtra[t.dataset.anio]=_xv; } else { delete DB.config.proyeccion.ingresosExtra[t.dataset.anio]; } renderProy(); scheduleSave(); } });
$('#patImportBtn').addEventListener('click',()=>$('#patFile').click());
$('#patList').addEventListener('click',e=>{
  const ed=e.target.closest('[data-editsnap]'); if(ed){ if(typeof editSnapshot==='function')editSnapshot(ed.dataset.editsnap); return; }
  const b=e.target.closest('[data-delsnap]'); if(b){ const _id=b.dataset.delsnap; const _it=(DB.patrimonio||[]).find(s=>s.id===_id); if(_it)undoableDelete('patrimonio','Registro de patrimonio'+(_it.fecha?(' '+_it.fecha):''),{item:_it},()=>{DB.patrimonio=DB.patrimonio.filter(s=>s.id!==_id);},['renderPat']); return; }
  const r=e.target.closest('[data-patrow]'); if(r){ if(e.target.closest('input,button,select,a'))return; const it=r.closest('.pat-item'); if(it)it.classList.toggle('open'); }
});
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='patObj'){ DB.config.objetivoReparto=Math.max(0,Math.min(100,num(e.target.value)))/100; renderPat(); scheduleSave(); }});
$('#btnAddYear').addEventListener('click',addYear);
if($('#btnAddCap'))$('#btnAddCap').addEventListener('click',function(){ if(typeof openSecDlg==='function')openSecDlg(); else if(typeof openCatDlg==='function')openCatDlg(null); });
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
function restaurarBackup(file){ file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;} if(!d||typeof d!=='object'||Array.isArray(d)){alert('Ese archivo no parece una copia de seguridad válida.');return;} if(!confirm('Vas a REEMPLAZAR todos los datos actuales por los de la copia. Esto no se puede deshacer.\n\n¿Continuar?'))return; if(typeof pushSnapshot==='function')pushSnapshot('antes de restaurar copia'); DB=d; const p=saveNow(); if(p&&p.then){ p.then(()=>{ alert('Copia restaurada correctamente.'); location.reload(); }).catch(()=>{ alert('Restaurada en memoria, pero no se pudo guardar en Drive. Revisa la conexión.'); renderAll(); }); } else { renderAll(); alert('Copia restaurada.'); } }); }
const bkf=document.createElement('input'); bkf.type='file'; bkf.accept='.json,application/json'; bkf.style.display='none'; bkf.addEventListener('change',e=>{ if(e.target.files[0]) restaurarBackup(e.target.files[0]); e.target.value=''; }); document.body.appendChild(bkf);
if($('#btnBackup'))$('#btnBackup').addEventListener('click',descargarBackup);
if($('#btnRestore'))$('#btnRestore').addEventListener('click',()=>bkf.click());
if($('#btnPapelera'))$('#btnPapelera').addEventListener('click',()=>{ if(typeof openPapelera==='function')openPapelera(); });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-ficha]'); if(b){ e.preventDefault(); abrirFicha(b.dataset.ficha); } });
/* Estado inicial de la navegación: grupo Control activo con su subnav visible */
try{ if(typeof activarVista==='function') activarVista('panel'); }catch(e){}
$('#view-dividendos').addEventListener('change',e=>{ const d=e.target.closest('[data-devhac]'); if(d){ DB.devolucionHacienda=DB.devolucionHacienda||{}; const v=num(d.value); if(v) DB.devolucionHacienda[d.dataset.devhac]=v; else delete DB.devolucionHacienda[d.dataset.devhac]; saveNow(); renderDividendos(); } });
/* Calendario reescrito (derivado, solo lectura): listeners propios en 19-calendario.js.
   Se retiran los antiguos de la rejilla manual (#calTabla / #calEventos). */
$('#invClosed').addEventListener('click',e=>{ const a=e.target.closest('[data-archive]'); if(a){ archivarCerrada(a.dataset.archive); return; } const d=e.target.closest('[data-delcerrada]'); if(d){ const _id=d.dataset.delcerrada; const _it=(DB.cerradas||[]).find(c=>c.id===_id); if(_it)undoableDelete('cerrada','Posición archivada '+(_it.ticker||''),{item:_it},()=>{ DB.cerradas=(DB.cerradas||[]).filter(c=>c.id!==_id); },['renderInv','renderDividendos']); } });
$('#fichaView').addEventListener('click',e=>{ const _fr=e.target.closest('[data-frange]'); if(_fr){ fichaRange=_fr.dataset.frange; fichaZoom=null; if(_fr.parentElement)[..._fr.parentElement.children].forEach(x=>x.classList.toggle('on',x===_fr)); if(typeof _fichaSavePrefs==='function')_fichaSavePrefs(); drawFichaChart(fichaTicker); return; } const _fm=e.target.closest('[data-fma]'); if(_fm){ const _w=+_fm.dataset.fma; if(typeof fichaMA!=='undefined'){ fichaMA[_w]=!fichaMA[_w]; _fm.classList.toggle('on',!!fichaMA[_w]); } if(typeof _fichaSavePrefs==='function')_fichaSavePrefs(); if(typeof drawFichaChart==='function')drawFichaChart(fichaTicker); return; } const _fx=e.target.closest('[data-fibex]'); if(_fx){ if(typeof fichaVsIbex!=='undefined'){ fichaVsIbex=!fichaVsIbex; _fx.classList.toggle('on',!!fichaVsIbex); } if(typeof _fichaSavePrefs==='function')_fichaSavePrefs(); if(typeof drawFichaChart==='function')drawFichaChart(fichaTicker); return; } const _fz=e.target.closest('[data-fzreset]'); if(_fz){ fichaZoom=null; if(typeof drawFichaChart==='function')drawFichaChart(fichaTicker); return; } if(e.target.closest('#finvVal')){ validarUrlInv(); return; } if(e.target.closest('#fdivAdd')){ addFichaDiv(); return; } const dd=e.target.closest('[data-deldiv]'); if(dd){ const _t=fichaTicker; const arr=(DB.dividendos||{})[_t]||[]; const i=arr.findIndex(x=>x.id===dd.dataset.deldiv); if(i>=0){ const _it=arr[i]; undoableDelete('dividendo','Dividendo '+_t+(_it.fecha?(' '+_it.fecha):''),{t:_t,item:_it},()=>{ arr.splice(i,1); },['renderDividendos']); } } });
$('#fichaView').addEventListener('change',e=>{ const arr=(DB.dividendos||{})[fichaTicker]||[]; const ef=e.target.closest('[data-edf]'); if(ef){ const it=arr.find(x=>x.id===ef.dataset.edf); if(it){ it.fecha=ef.value; saveNow(); renderFicha(fichaTicker);} return; } const ei=e.target.closest('[data-edi]'); if(ei){ const it=arr.find(x=>x.id===ei.dataset.edi); if(it){ it.importe=num(ei.value); saveNow(); renderFicha(fichaTicker);} } });
const prf=document.createElement('input'); prf.type='file'; prf.accept='.json,application/json'; prf.id='presFile'; prf.style.display='none';
prf.addEventListener('change',()=>{const f=prf.files[0];if(!f)return; importPresupuesto(f); prf.value='';});
document.body.appendChild(prf);

/* arranque */
init();

/* ⚙ Ajustes: menú desplegable de la cabecera (reagrupa copia/restaurar/papelera/config/buscar/demo/salir) */
(function(){ var cog=document.getElementById('btnCog'), menu=document.getElementById('cogMenu'); if(!cog||!menu)return;
  cog.addEventListener('click',function(e){ e.stopPropagation(); menu.classList.toggle('open'); });
  document.addEventListener('click',function(){ menu.classList.remove('open'); });
})();

/* Panel · Fase B: plegado de las secciones del dashboard (delegado en #panelDash) */
(function(){ var host=document.getElementById('panelDash'); if(!host)return;
  function rel(){ if(typeof renderPanelDash==='function') renderPanelDash(); }
  host.addEventListener('click',function(e){
    var f=e.target.closest('[data-psfold]'); if(f){ var k=f.getAttribute('data-psfold'); window._panelSecOpen=window._panelSecOpen||{}; window._panelSecOpen[k]=window._panelSecOpen[k]?0:1; rel(); return; }
    var a=e.target.closest('[data-psall]'); if(a){ var v=+a.getAttribute('data-psall'); window._panelSecOpen=window._panelSecOpen||{}; ['hogar','cartera','dividendos','accion','mas'].forEach(function(k){window._panelSecOpen[k]=v;}); rel(); return; }
    var j=e.target.closest('[data-psjump]'); if(j){ var kk=j.getAttribute('data-psjump'); window._panelSecOpen=window._panelSecOpen||{}; window._panelSecOpen[kk]=1; rel(); setTimeout(function(){ var el=document.querySelector('[data-pssec="'+kk+'"]'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },40); return; }
  });
})();

/* Panel: plegar Avisos y Seguimiento del presupuesto (flecha en la fila del título) */
(function(){ var h=document.getElementById('panelBudgetH'); if(h){ h.style.cursor='pointer'; h.addEventListener('click',function(){ var pb=document.getElementById('panelBudget'); if(!pb)return; var open=pb.style.display!=='none'; window._pBudOpen=!open; pb.style.display=open?'none':''; var a=h.querySelector('.pcol-arw'); if(a)a.classList.toggle('open',!open); }); } })();
(function(){ var host=document.getElementById('panelDash'); if(!host)return; host.addEventListener('click',function(e){ var av=e.target.closest('[data-pavi]'); if(av){ window._pAviOpen=(window._pAviOpen===false); if(typeof renderPanelDash==='function')renderPanelDash(); } }); })();

/* ===== Presupuesto v2 · cableado (delegado en #view-presupuesto) ===== */
(function(){ var host=document.getElementById('view-presupuesto'); if(!host)return;
  function up(catId,field,value){ var p=presFor(catId,presYear); if(!p){ p={id:uid(),categoriaId:catId,importe:0,frecuencia:'mensual',metodoPago:'',renovacion:'',anio:presYear}; DB.presupuesto.push(p); } p[field]=value; }
  host.addEventListener('click',function(e){
    var t;
    if(t=e.target.closest('[data-presfrec]')){ var a=t.getAttribute('data-presfrec').split('|'); up(a[0],'frecuencia',a[1]); renderPres(); scheduleSave(); return; }
    if(t=e.target.closest('[data-presdel]')){ var id=t.getAttribute('data-presdel'); if(!confirm('¿Eliminar esta partida del presupuesto?'))return; DB.categorias=(DB.categorias||[]).filter(function(c){return c.id!==id;}); DB.presupuesto=(DB.presupuesto||[]).filter(function(p){return p.categoriaId!==id;}); if(typeof fillCatSelects==='function')fillCatSelects(); renderPres(); scheduleSave(); return; }
    if(t=e.target.closest('[data-presaddpart]')){ var g=t.getAttribute('data-presaddpart'); if(typeof openCatDlg==='function')openCatDlg(null, g, g==='Ingresos'?'ingreso':'gasto'); return; }
    if(t=e.target.closest('[data-pressec]')){ e.stopPropagation(); if(typeof openSecDlg==='function')openSecDlg(t.getAttribute('data-pressec')); return; }
    if(t=e.target.closest('[data-presedit]')){ if(typeof openCatDlg==='function')openCatDlg(t.getAttribute('data-presedit')); return; }
    if(t=e.target.closest('[data-presesc]')){ var a=t.getAttribute('data-presesc').split('|'); var cc=catById(a[0]); if(cc){cc.esencial=(a[1]==='1');} renderPres(); scheduleSave(); return; }
    if(t=e.target.closest('[data-presinfla]')){ var a=t.getAttribute('data-presinfla').split('|'); var cc=catById(a[0]); if(cc){cc.seguirInfla=(a[1]==='1');} renderPres(); scheduleSave(); return; }
    if(t=e.target.closest('[data-presp]')){ if(e.target.closest('input,button,select'))return; var id=t.getAttribute('data-presp'); window._presOpen=window._presOpen||{}; window._presOpen['p:'+id]=!window._presOpen['p:'+id]; renderPres(); return; }
    if(t=e.target.closest('[data-presi]')){ window._presOpen=window._presOpen||{}; window._presOpen.ing=(window._presOpen.ing===false); renderPres(); return; }
    if(t=e.target.closest('[data-presg]')){ if(e.target.closest('input,button,select'))return; var g=t.getAttribute('data-presg'); window._presOpen=window._presOpen||{}; window._presOpen[g]=!window._presOpen[g]; renderPres(); return; }
  });
  host.addEventListener('change',function(e){
    var t;
    if(t=e.target.closest('[data-prescant]')){ up(t.getAttribute('data-prescant'),'importe',num(t.value)); renderPres(); scheduleSave(); return; }
    if(t=e.target.closest('[data-prespago]')){ up(t.getAttribute('data-prespago'),'metodoPago', t.value==='—'?'':t.value); renderPres(); scheduleSave(); return; }
    if(t=e.target.closest('[data-presrenov]')){ up(t.getAttribute('data-presrenov'),'renovacion',t.value); renderPres(); scheduleSave(); return; }
  });
  host.addEventListener('input',function(e){
    var t=e.target.closest('#presAhorroInp'); if(!t)return;
    DB.config=DB.config||{}; DB.config.ahorroObjetivo=DB.config.ahorroObjetivo||{}; DB.config.ahorroObjetivo[presYear]=num(t.value);
    var pos=t.selectionStart; renderPres(); scheduleSave(); var n=document.getElementById('presAhorroInp'); if(n){ n.focus(); try{n.setSelectionRange(pos,pos);}catch(err){} }
  });
})();

/* ===== Calculadora flotante (botón 🧮 en la cabecera, disponible en todas las vistas) ===== */
(function(){
  var panel=document.getElementById('calcPanel'), btn=document.getElementById('btnCalc'); if(!panel||!btn)return;
  var disp=document.getElementById('calcDisp'), opv=document.getElementById('calcOp');
  var acc=null, op=null, cur='0', fresh=false;
  function fmtN(x){ return ''+(Math.round(x*1e10)/1e10); }
  function opSym(o){ return o==='+'?'+':o==='-'?'−':o==='*'?'×':o==='/'?'÷':''; }
  function upd(){ disp.textContent=cur; opv.textContent=(op&&acc!=null)?(fmtN(acc)+' '+opSym(op)):''; }
  function digit(d){ if(fresh){cur='0';fresh=false;} if(d==='.'){ if(cur.indexOf('.')<0)cur+='.'; } else { cur=(cur==='0')?d:cur+d; } upd(); }
  function calc(a,b,o){ return o==='+'?a+b:o==='-'?a-b:o==='*'?a*b:o==='/'?(b===0?0:a/b):b; }
  function operator(o){ var v=parseFloat(cur); if(op!==null&&!fresh){ acc=calc(acc,v,op); cur=fmtN(acc); } else { acc=v; } op=o; fresh=true; upd(); }
  function equals(){ if(op!==null){ var v=parseFloat(cur); acc=calc(acc,v,op); cur=fmtN(acc); op=null; fresh=true; upd(); } }
  function clearAll(){ acc=null;op=null;cur='0';fresh=false;upd(); }
  function back(){ if(fresh)return; cur=(cur.length>1)?cur.slice(0,-1):'0'; if(cur==='-'||cur==='')cur='0'; upd(); }
  function pct(){ cur=fmtN(parseFloat(cur)/100); fresh=false; upd(); }
  function neg(){ cur=fmtN(parseFloat(cur)*-1); upd(); }
  function key(k){ if(/^[0-9.]$/.test(k))return digit(k); if(k.slice(0,3)==='op:')return operator(k.slice(3)); if(k==='eq')return equals(); if(k==='c')return clearAll(); if(k==='back')return back(); if(k==='pct')return pct(); if(k==='neg')return neg(); }
  document.getElementById('calcKeys').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b)key(b.getAttribute('data-k')); });
  btn.addEventListener('click',function(){ panel.classList.toggle('hidden'); });
  document.getElementById('calcClose').addEventListener('click',function(){ panel.classList.add('hidden'); });
  document.addEventListener('keydown',function(e){ if(panel.classList.contains('hidden'))return; var ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))return; var k=e.key, h=true;
    if(/^[0-9]$/.test(k)||k==='.')key(k); else if(k==='+'||k==='-'||k==='*'||k==='/')key('op:'+k); else if(k==='Enter'||k==='=')key('eq'); else if(k==='Backspace')key('back'); else if(k==='Escape')key('c'); else if(k==='%')key('pct'); else h=false;
    if(h)e.preventDefault(); });
  var head=document.getElementById('calcHead'), drag=false, ox=0, oy=0;
  head.addEventListener('pointerdown',function(e){ if(e.target.id==='calcClose')return; drag=true; var r=panel.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top; panel.style.right='auto'; panel.style.left=r.left+'px'; panel.style.top=r.top+'px'; try{head.setPointerCapture(e.pointerId);}catch(_){} });
  head.addEventListener('pointermove',function(e){ if(!drag)return; panel.style.left=Math.max(0,Math.min(window.innerWidth-60,e.clientX-ox))+'px'; panel.style.top=Math.max(0,Math.min(window.innerHeight-40,e.clientY-oy))+'px'; });
  head.addEventListener('pointerup',function(){ drag=false; });
})();
