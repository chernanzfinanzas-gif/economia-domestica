/* ===== 12-vision.js — Visión de conjunto (ranking transversal + exposición por riesgo) =====
   Pieza intermedia entre el método (empresa a empresa) y la app (cartera):
   1) Ranking de ATRACTIVO combinando margen de seguridad (PO base vs cotización),
      calidad (score/rating) y RPD, + antigüedad del dossier → para priorizar qué
      analizar/actualizar antes.
   2) Exposición por TEMA DE RIESGO: etiqueta cada empresa (auto desde los riesgos[]
      de su tesis, editable a mano en DB.riesgoTags) y agrega el % de cartera por tema.
   Fuente: DB.analisis, DB.valores, _tesisCache (dossiers/[T].json), invPositions(). */

/* Temas de riesgo canónicos + patrones (se comparan sobre texto normalizado sin acentos). */
const RIESGO_TAGS = [
  {tag:'Regulación',            re:/regulaci|tarifa|retribuci|cnmc|marco regulat|regulator|ofgem|ferc/},
  {tag:'Divisa/LatAm',          re:/divisa|latinoam|latam|tipo de cambio|brasil|mexic|argentin|real brasil/},
  {tag:'Tipos de interés',      re:/tipos de inter|tipo de inter|coste de la deuda|bce|refinanci|coste de capital/},
  {tag:'Ciclo/Commodity',       re:/commodity|materia prima|crudo|petrole|refino|acero|precio del gas|precio del crudo|margen de refino|ciclicidad/},
  {tag:'Transición energética', re:/transicion energ|descarboniz|declive.*gas|renovable|emisiones|combustibles fosiles/},
  {tag:'Gobernanza',            re:/gobernanza|accionar|free float|conflicto de inter|estructura accionarial/},
  {tag:'Competencia',           re:/competen|competitiv|disrupci|cuota de mercado|nuevos entrantes|presion.*precio|comoditiz/},
  {tag:'Demanda/Consumo',       re:/consumo|publicidad|demanda|volumen|trafico|estacional/},
  {tag:'Ejecución/M&A',         re:/integraci|adquisici|fusion|m&a| ejecucion|plan estrategic/},
  {tag:'Balance/Deuda',         re:/deuda|apalancami|liquidez|patrimonio eros|gearing|solvencia/}
];
const RIESGO_TAG_NAMES = RIESGO_TAGS.map(x=>x.tag);
let _visSort = 'atractivo';   /* atractivo | mds | cal | rpd | meses */

function _visNorm(s){ return (s==null?'':(''+s)).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,''); }

/* Tags automáticos desde los riesgos[] (y el bear) de la tesis cargada */
function visAutoTags(t){
  t=(t||'').toUpperCase();
  const te=(typeof _tesisCache!=='undefined'?_tesisCache:{})[t];
  if(!te) return [];
  const txt=_visNorm([].concat(te.riesgos||[], te.bear||'').join(' · '));
  if(!txt) return [];
  const out=[]; RIESGO_TAGS.forEach(g=>{ if(g.re.test(txt))out.push(g.tag); });
  return out;
}
/* Tags efectivos: override manual (DB.riesgoTags) si existe; si no, automáticos */
function visTags(t){ t=(t||'').toUpperCase(); const m=(DB.riesgoTags||{})[t]; return (m&&Array.isArray(m))?m.slice():visAutoTags(t); }

/* Carga perezosa de todas las tesis que falten y re-render al terminar */
function visLoadTesis(cb){
  const need=(DB.analisis||[]).map(a=>(a.ticker||'').toUpperCase()).filter(t=>t && (typeof _tesisCache==='undefined'||_tesisCache[t]===undefined));
  if(!need.length){ cb&&cb(); return; }
  need.forEach(t=>{ _tesisCache[t]=null; });   /* marcar "cargando" (evita re-disparo) */
  Promise.all(need.map(t=>fetch('dossiers/'+t+'.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null).then(j=>{ _tesisCache[t]=j||null; }).catch(()=>{ _tesisCache[t]=null; })))
    .then(()=>{ cb&&cb(); });
}

const _VIS_RPTS={AAA:100,AA:90,A:80,BBB:65,BB:50,B:35,CCC:25,CC:20,C:15};
function visRankData(){
  const held=new Set(); try{ (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)held.add((p.ticker||'').toUpperCase()); }); }catch(e){}
  const cl=x=>Math.max(0,Math.min(100,x));
  return (DB.analisis||[]).map(a=>{
    const t=(a.ticker||'').toUpperCase();
    const te=(typeof _tesisCache!=='undefined'?_tesisCache:{})[t]||{};
    const v=(DB.valores||{})[t]||{};
    const cot=num(a.cotizacion)||num(v.precioActual);
    const poBase=num(te.poBase)||((num(a.poMin)&&num(a.poMax))?(num(a.poMin)+num(a.poMax))/2:(num(a.poMax)||num(a.poMin)||0));
    const rating=(a.rating||te.rating||'').toUpperCase();
    const score=(te&&te.score!=null)?num(te.score):(_VIS_RPTS[rating]!=null?_VIS_RPTS[rating]:null);
    const div=num(a.divAccion)||num(v.divAccion);
    const mds=(cot>0&&poBase>0)?(poBase/cot-1):null;
    const rpd=(cot>0&&div>0)?(div/cot):null;
    const meses=(a.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null;
    const calN=(score!=null)?score:50;
    const mdsN=(mds!=null)?cl(50+mds/0.4*50):50;
    const rpdN=(rpd!=null)?cl(rpd/0.06*100):0;
    const atractivo=Math.round(0.45*calN+0.35*mdsN+0.20*rpdN);
    return {t, nombre:a.nombre||te.empresa||t, cot, poBase, rating, score, mds, rpd, meses, atractivo,
      held:held.has(t), decision:(a.decision||te.decision||'').toUpperCase(), tags:visTags(t), stale:(meses!=null&&meses>12)};
  }).filter(x=>x.cot>0 || x.score!=null);
}

function visRiesgoExpo(){
  const pos={}; let tot=0;
  try{ (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ const t=(p.ticker||'').toUpperCase(); const val=num(p.acciones)*num(p.precioActual); if(val>0){ pos[t]=(pos[t]||0)+val; tot+=val; } }); }catch(e){}
  const byTag={};
  Object.keys(pos).forEach(t=>{ visTags(t).forEach(tag=>{ (byTag[tag]=byTag[tag]||{eur:0,tk:[]}).eur+=pos[t]; byTag[tag].tk.push(t); }); });
  const rows=Object.keys(byTag).map(tag=>({tag, eur:byTag[tag].eur, pct:tot>0?byTag[tag].eur/tot:0, tk:byTag[tag].tk})).sort((a,b)=>b.eur-a.eur);
  return {rows, tot, held:Object.keys(pos).length};
}

/* ---------- Render ---------- */
function renderVision(){
  const el=$('#visBody'); if(!el) return;
  const faltan=(DB.analisis||[]).some(a=>{ const t=(a.ticker||'').toUpperCase(); return t && (typeof _tesisCache==='undefined'||_tesisCache[t]===undefined); });
  if(faltan) visLoadTesis(renderVision);   /* al terminar re-renderiza con score/riesgos */

  if(!(DB.analisis||[]).length){ el.innerHTML='<div class="empty">Sin empresas en Análisis todavía.</div>'; return; }

  let rows=visRankData();
  const pct=x=>x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1)+'%');
  const key={atractivo:x=>x.atractivo, mds:x=>(x.mds==null?-9:x.mds), cal:x=>(x.score==null?-9:x.score), rpd:x=>(x.rpd==null?-9:x.rpd), meses:x=>(x.meses==null?-9:x.meses)}[_visSort]||(x=>x.atractivo);
  rows=rows.slice().sort((a,b)=>key(b)-key(a));

  const sortBtn=(k,txt)=>`<button class="btn ghost sm${_visSort===k?' on':''}" data-vissort="${k}" style="${_visSort===k?'background:#78350f;color:#fff':''}">${txt}</button>`;
  const decCol={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  const rtCol=s=>s==null?'#94a3b8':(s>=70?'#16a34a':s>=50?'#d97706':'#dc2626');
  const trs=rows.map((x,i)=>`<tr${i===0?' style="background:#fffbeb"':''}>
    <td><b data-ficha="${x.t}" style="cursor:pointer;color:var(--brand)">${x.t}</b> <span class="muted" style="font-size:11px">${x.held?'· en cartera':''}</span></td>
    <td class="num">${x.rating||'—'}</td>
    <td class="num" style="color:${rtCol(x.score)};font-weight:700">${x.score==null?'—':Math.round(x.score)}</td>
    <td class="num ${x.mds!=null&&x.mds>=0?'pos':'neg'}">${pct(x.mds)}</td>
    <td class="num">${x.rpd==null?'—':(x.rpd*100).toFixed(1)+'%'}</td>
    <td class="num" style="font-weight:800">${x.atractivo}</td>
    <td class="num" style="white-space:nowrap">${x.meses==null?'—':x.meses+'m'} ${x.stale?'<span title="dossier caducado" style="color:#dc2626">⚠</span>':''}</td>
    <td style="font-weight:700;color:${decCol[x.decision]||'#475569'}">${x.decision||'—'}</td>
  </tr>`).join('');
  const tabla=`<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <div style="font-weight:800;font-size:15px">🧭 Ranking de atractivo</div><div style="flex:1"></div>
      <span class="muted" style="font-size:11px">Ordenar:</span>${sortBtn('atractivo','Atractivo')}${sortBtn('cal','Calidad')}${sortBtn('mds','Margen seg.')}${sortBtn('rpd','RPD')}${sortBtn('meses','Antigüedad')}
    </div>
    <div style="overflow:auto"><table style="font-size:12px"><thead><tr><th>Empresa</th><th class="num">Rating</th><th class="num">Score</th><th class="num">Margen seg.</th><th class="num">RPD</th><th class="num">Atractivo</th><th class="num">Dossier</th><th>Decisión</th></tr></thead><tbody>${trs}</tbody></table></div>
    <div class="sub" style="margin-top:6px">Atractivo = 0,45·Calidad + 0,35·Margen de seguridad + 0,20·RPD (normalizados 0-100). Sirve para priorizar qué empresa analizar/actualizar antes; ⚠ marca dossier de más de 12 meses.</div>
  </div>`;

  const ex=visRiesgoExpo();
  let expo;
  if(!ex.rows.length){ expo=`<div class="card" style="margin-top:10px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">🛡️ Exposición por tema de riesgo</div><div class="muted" style="font-size:12px">Sin posiciones en cartera con tesis etiquetada todavía.</div></div>`; }
  else {
    const bars=ex.rows.map(r=>{ const p=(r.pct*100); const col=p>=40?'#dc2626':p>=25?'#d97706':'#2563eb';
      return `<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span><b>${r.tag}</b> <span class="muted">${r.tk.join(', ')}</span></span><span style="font-weight:700;color:${col}">${p.toFixed(0)}%</span></div><div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.min(100,p)}%;background:${col}"></div></div></div>`; }).join('');
    expo=`<div class="card" style="margin-top:10px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">🛡️ Exposición por tema de riesgo</div>
      <div class="sub" style="margin-bottom:6px">% del valor de tu cartera expuesto a cada tema (una empresa puede sumar a varios). Rojo ≥40% · ámbar ≥25%.</div>${bars}</div>`;
  }

  /* Editor de tags por empresa */
  const opts=RIESGO_TAG_NAMES;
  const filas=rows.slice().sort((a,b)=>a.t<b.t?-1:1).map(x=>{
    const manual=!!((DB.riesgoTags||{})[x.t]);
    const chips=(x.tags.length?x.tags:['—']).map(tg=>tg==='—'?`<span class="muted" style="font-size:11px">sin tags</span>`:`<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;background:#f1f5f9;border-radius:10px;padding:1px 8px;margin:1px">${tg} <span data-vistagdel="${x.t}|${tg}" style="cursor:pointer;color:#94a3b8">✕</span></span>`).join('');
    const addSel=`<select data-vistagadd="${x.t}" class="anaInp" style="font-size:11px;padding:1px 4px"><option value="">+ tema…</option>${opts.filter(o=>x.tags.indexOf(o)<0).map(o=>`<option>${o}</option>`).join('')}</select>`;
    return `<tr><td style="white-space:nowrap"><b data-ficha="${x.t}" style="cursor:pointer;color:var(--brand)">${x.t}</b></td><td>${chips}</td><td style="white-space:nowrap">${addSel} ${manual?`<button class="btn ghost sm" data-vistagauto="${x.t}" title="Volver a los tags automáticos">↻ auto</button>`:'<span class="muted" style="font-size:10px">auto</span>'}</td></tr>`;
  }).join('');
  const editor=`<div class="card" style="margin-top:10px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">🏷️ Tags de riesgo por empresa</div>
    <div class="sub" style="margin-bottom:6px">Automáticos desde los riesgos[] de cada tesis; puedes añadir (desplegable) o quitar (✕). "↻ auto" descarta los cambios manuales de esa empresa.</div>
    <div style="overflow:auto"><table style="font-size:12px"><thead><tr><th>Empresa</th><th>Tags</th><th>Editar</th></tr></thead><tbody>${filas}</tbody></table></div></div>`;

  el.innerHTML=tabla+expo+editor;
}

/* ---------- Eventos ---------- */
function _visSetTags(t,arr){ t=(t||'').toUpperCase(); DB.riesgoTags=DB.riesgoTags||{}; DB.riesgoTags[t]=arr; if(typeof scheduleSave==='function')scheduleSave(); renderVision(); }
document.addEventListener('click',e=>{
  const s=e.target.closest&&e.target.closest('[data-vissort]'); if(s){ _visSort=s.dataset.vissort; renderVision(); return; }
  const d=e.target.closest&&e.target.closest('[data-vistagdel]'); if(d){ const a=(d.dataset.vistagdel||'').split('|'); const t=a[0]; const cur=visTags(t).filter(x=>x!==a[1]); _visSetTags(t,cur); return; }
  const au=e.target.closest&&e.target.closest('[data-vistagauto]'); if(au){ const t=(au.dataset.vistagauto||'').toUpperCase(); if(DB.riesgoTags)delete DB.riesgoTags[t]; if(typeof scheduleSave==='function')scheduleSave(); renderVision(); return; }
});
document.addEventListener('change',e=>{
  const ad=e.target.closest&&e.target.closest('[data-vistagadd]'); if(!ad)return;
  const t=ad.dataset.vistagadd, val=ad.value; if(!val)return;
  const cur=visTags(t); if(cur.indexOf(val)<0)cur.push(val); _visSetTags(t,cur);
});
