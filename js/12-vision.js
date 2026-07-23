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
const _VIS_EST=' <span title="Calidad estimada del subíndice de Radar (aún sin dossier); no es tu score de análisis" style="font-size:9px;font-weight:800;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:5px;padding:0 4px;vertical-align:middle">est.</span>';
/* Δ vs mercado: score real del dossier − calidad que veía Radar. ▲ mejoras / ▼ corriges. */
function _visDeltaChip(d){ if(d==null)return ''; var col=(d>=0)?'#16a34a':'#dc2626';
  return ' <span title="Tu score del dossier frente a la calidad que veía el mercado (Radar): ▲ tu análisis la confirma al alza · ▼ la corrige a la baja" style="font-size:9px;font-weight:800;color:'+col+';white-space:nowrap">'+(d>=0?'▲':'▼')+Math.abs(d)+'<span style="color:#94a3b8;font-weight:600"> mkt</span></span>'; }
/* Umbrales de calidad → letra (para la calidad ESTIMADA de empresas aún sin dossier). */
function _visRatingLetra(pts){ if(pts==null)return ''; pts=+pts;
  return pts>=90?'AAA':pts>=80?'AA':pts>=70?'A':pts>=60?'BBB':pts>=45?'BB':pts>=30?'B':pts>=15?'CCC':'CC'; }
/* Calidad estimada = subíndice CALIDAD de Radar (0,5·ROE+0,3·solvencia+0,2·rating) desde
   fundamentales.json. Objetiva y disponible para todo el universo aunque no haya dossier. */
/* Calidad "de mercado" (subíndice Calidad de Radar, SIN topar). Sirve para el Δ vs mercado. */
function _visCalMercado(t){ t=(t||'').toUpperCase();
  if(typeof radScore!=='function')return null;
  var f=null; if(typeof _radFundCache!=='undefined'&&_radFundCache&&_radFundCache.empresas){ f=_radFundCache.empresas.find(function(x){return (''+x.ticker).toUpperCase()===t;}); }
  if(!f)return null;
  var u=(DB.universo||{})[t]||{}; var ds=(typeof _radDs==='function')?_radDs(t):null;
  try{ var r=radScore(f,u.rating,ds); return (r&&r.cal!=null)?r.cal:null; }catch(e){ return null; } }
/* Atractivo COMPLETO de Radar (atr + los 3 pilares div/cal/val) para comparar con el de Visión. */
function _visRadarFull(t){ t=(t||'').toUpperCase();
  if(typeof radScore!=='function')return null;
  var f=null; if(typeof _radFundCache!=='undefined'&&_radFundCache&&_radFundCache.empresas){ f=_radFundCache.empresas.find(function(x){return (''+x.ticker).toUpperCase()===t;}); }
  if(!f)return null;
  var u=(DB.universo||{})[t]||{}; var ds=(typeof _radDs==='function')?_radDs(t):null;
  try{ var r=radScore(f,u.rating,ds); return r?{atr:Math.round(r.atr),div:Math.round(r.sdiv),cal:Math.round(r.cal),val:Math.round(r.sval)}:null; }catch(e){ return null; } }
/* Escala de reserva (borde inferior por letra), SOLO si de esa letra no tienes ninguna analizada. */
const _VIS_ESTFALL={AAA:82,AA:76,A:70,BBB:56,BB:44,B:32,CCC:22,CC:14,C:8};
/* Borde INFERIOR (mínimo) del score de tus analizadas por rating → ancla de las estimadas. */
function _visMinByRating(){ var acc={}; (DB.analisis||[]).forEach(function(a){ var t=(a.ticker||'').toUpperCase();
  var te=(typeof _tesisCache!=='undefined'?_tesisCache:{})[t]||{}; var sc=(te.score!=null)?num(te.score):null;
  var rt=((a.rating||te.rating||'')+'').toUpperCase(); if(sc!=null&&rt){ if(acc[rt]==null||sc<acc[rt])acc[rt]=sc; } }); return acc; }
/* Estimación de una empresa SIN dossier: letra = rating de tu Matriz SOLO si es una letra válida
   (AAA…C); si está vacío o es otra cosa (p. ej. estrellas ★★★ de la Matriz), se deriva de la calidad
   de Radar. score = borde inferior de tus analizadas de esa letra (Carlos). Marca «est.». */
function _visEstim(t,mins){ t=(t||'').toUpperCase(); var u=(DB.universo||{})[t]||{};
  var rt=((u.rating||'')+'').toUpperCase();
  if(!(rt&&_VIS_ESTFALL[rt]!=null)){ var rc=_visCalMercado(t); rt=(rc!=null)?_visRatingLetra(rc):''; }
  if(!rt)return null;
  if(rt==='AAA'||rt==='AA')rt='A'; /* TOPE «A»: una empresa sin analizar no puede lucir AAA/AA estimado (Carlos) */
  var sc=(mins&&mins[rt]!=null)?mins[rt]:(_VIS_ESTFALL[rt]!=null?_VIS_ESTFALL[rt]:null);
  return (sc==null)?null:{score:sc,rating:rt}; }
/* RPD viva unificada con Radar: DPA bruto del año en vigor (dividendos.json) ÷ precio vivo.
   Devuelve ratio (0-1). Cae a divAccion/cotización si el motor de dividendos no está disponible. */
function _visRpdViva(t,cot,div){ t=(t||'').toUpperCase();
  if(typeof _radarDiv==='function'&&typeof _radarPrecio==='function'){
    var pp=num(_radarPrecio(t))||num(cot); var dd=num(_radarDiv(t));
    if(pp>0&&dd>0)return dd/pp;
  }
  return (num(cot)>0&&num(div)>0)?(num(div)/num(cot)):null; }
function visRankData(){
  const held=new Set(); try{ (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones>0.0001)held.add((p.ticker||'').toUpperCase()); }); }catch(e){}
  const cl=x=>Math.max(0,Math.min(100,x));
  const minsByRating=_visMinByRating();
  let rows=(DB.analisis||[]).map(a=>{
    const t=(a.ticker||'').toUpperCase();
    const te=(typeof _tesisCache!=='undefined'?_tesisCache:{})[t]||{};
    const v=(DB.valores||{})[t]||{};
    const cot=num(a.cotizacion)||num(v.precioActual);
    const poBase=num(te.poBase)||((num(a.poMin)&&num(a.poMax))?(num(a.poMin)+num(a.poMax))/2:(num(a.poMax)||num(a.poMin)||0));
    let rating=(a.rating||te.rating||'').toUpperCase();
    /* Calidad: score REAL del dossier; si no, ESTIMADA en el borde inferior de las analizadas de ese rating; si no, escala fija. */
    const dossierScore=(te&&te.score!=null)?num(te.score):null;
    let score=dossierScore, estCal=false;
    if(score==null){ const e=_visEstim(t,minsByRating); if(e!=null){ score=e.score; estCal=true; if(!rating)rating=e.rating; }
      else if(_VIS_RPTS[rating]!=null){ score=_VIS_RPTS[rating]; } }
    /* Δ vs mercado: cuánto confirma/corrige tu dossier a la calidad que veía Radar (solo analizadas). */
    const estMkt=(dossierScore!=null)?_visCalMercado(t):null;
    const deltaMkt=(dossierScore!=null&&estMkt!=null)?Math.round(dossierScore-estMkt):null;
    const div=num(a.divAccion)||num(v.divAccion);
    const mds=(cot>0&&poBase>0)?(poBase/cot-1):null;
    const rpd=_visRpdViva(t,cot,div);
    const meses=(a.dossierFecha&&typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null;
    const calN=(score!=null)?score:50;
    const mdsN=(mds!=null)?cl(50+mds/0.4*50):50;
    const rpdN=(rpd!=null)?cl(rpd/0.06*100):0;
    const atractivo=Math.round(0.45*calN+0.35*mdsN+0.20*rpdN);
    const rad=_visRadarFull(t);
    return {t, nombre:a.nombre||te.empresa||t, cot, poBase, rating, score, estCal, estMkt, deltaMkt, mds, rpd, meses, atractivo,
      vCal:Math.round(calN), vMds:Math.round(mdsN), vRpd:Math.round(rpdN), rad:rad, dAtr:(rad?atractivo-rad.atr:null),
      held:held.has(t), decision:(a.decision||te.decision||'').toUpperCase(), tags:visTags(t), stale:(meses!=null&&meses>12)};
  }).filter(x=>x.cot>0 || x.score!=null);
  /* Uni\u00f3n con Universo: empresas de la Matriz a\u00fan no en An\u00e1lisis (Pte. An\u00e1lisis, sin score). */
  var _seen=new Set(rows.map(function(x){return x.t;}));
  var _uni=DB.universo||{};
  Object.keys(_uni).forEach(function(tt){ tt=(tt||'').toUpperCase(); if(!tt||_seen.has(tt))return; var v=(DB.valores||{})[tt]||{}; var cot=num(v.precioActual);
    var e=_visEstim(tt,minsByRating); var uRat=((_uni[tt]||{}).rating||'').toUpperCase();
    var score=e?e.score:(_VIS_RPTS[uRat]!=null?_VIS_RPTS[uRat]:null);
    var rat=e?e.rating:uRat; var estc=!!e;
    var rpd=_visRpdViva(tt,cot,num(v.divAccion));
    var calN=(score!=null)?score:50, rpdN=(rpd!=null)?cl(rpd/0.06*100):0;
    var atractivo=(score!=null||rpd!=null)?Math.round(0.45*calN+0.35*50+0.20*rpdN):0; /* sin PO → margen seg. neutro (50) */
    var rad=_visRadarFull(tt);
    rows.push({t:tt,nombre:(_uni[tt]||{}).nombre||tt,cot:cot,poBase:0,rating:rat,score:score,estCal:estc,mds:null,rpd:rpd,meses:null,atractivo:atractivo,
      vCal:Math.round(calN),vMds:50,vRpd:Math.round(rpdN),rad:rad,dAtr:(rad?atractivo-rad.atr:null),
      held:held.has(tt),decision:'',tags:[],stale:false,pte:true}); });
  return rows;
}

function visRiesgoExpo(){
  const pos={}; let tot=0;
  try{ (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ const t=(p.ticker||'').toUpperCase(); const val=num(p.acciones)*num(p.precioActual); if(val>0){ pos[t]=(pos[t]||0)+val; tot+=val; } }); }catch(e){}
  const byTag={};
  Object.keys(pos).forEach(t=>{ visTags(t).forEach(tag=>{ (byTag[tag]=byTag[tag]||{eur:0,tk:[]}).eur+=pos[t]; byTag[tag].tk.push(t); }); });
  const rows=Object.keys(byTag).map(tag=>({tag, eur:byTag[tag].eur, pct:tot>0?byTag[tag].eur/tot:0, tk:byTag[tag].tk})).sort((a,b)=>b.eur-a.eur);
  return {rows, tot, held:Object.keys(pos).length};
}

/* ---------- Render (rediseño: KPIs + 3 bloques plegables) ---------- */
window._visOpen=window._visOpen||{rank:false,expo:false,tags:false};
var _VISDEC={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
function _visPct(x){ return x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1)+'%'); }
function _visDecChip(d){ d=(d||'').toUpperCase(); if(!d)return '<span style="color:#cbd5e1">—</span>'; return '<span class="vis-dec" style="background:'+(_VISDEC[d]||'#64748b')+'">'+d+'</span>'; }
function _visScoreCol(s){ return s==null?'#94a3b8':(s>=70?'#16a34a':s>=50?'#d97706':'#dc2626'); }
function _visAtrCol(a){ return a>=70?'#16a34a':(a>=55?'#2563eb':'#64748b'); }
/* Chip compacto Radar→Visión (el "cuánto"): pulsable para abrir el desglose. */
function _visAtrDelta(x){ if(!x||!x.rad)return '';
  var d=x.dAtr==null?(x.atractivo-x.rad.atr):x.dAtr;
  var col=d>2?'#16a34a':(d<-2?'#dc2626':'#64748b'); var ar=d>2?'▲':(d<-2?'▼':'=');
  return ' <span class="vis-atrd" data-visatr="'+x.t+'" title="Atractivo: Radar '+x.rad.atr+' → Visión '+x.atractivo+'. Pulsa para el desglose." style="cursor:pointer;font-size:9px;font-weight:800;color:'+col+';white-space:nowrap;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:1px 4px">R'+x.rad.atr+' '+ar+Math.abs(d)+'</span>'; }
/* Barra de un pilar (0-100) con etiqueta y valor. */
function _visPilar(lbl,val,peso,col){ val=Math.max(0,Math.min(100,val||0));
  return '<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:#475569"><span>'+lbl+' <span style="color:#94a3b8">·'+peso+'</span></span><b style="color:#0f172a">'+Math.round(val)+'</b></div><div style="height:6px;background:#eef2f7;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:'+val+'%;background:'+col+'"></i></div></div>'; }
/* Ficha emergente (el "por qué"): desglosa Atractivo de Radar vs Visión y explica el sesgo. */
function _visAtrPop(t){ var x=(window._visRowMap||{})[t]; if(!x||!x.rad)return; var r=x.rad;
  var d=x.atractivo-r.atr; var sesgo=d>2?('Tu tesis es <b>más positiva</b> que Radar (Radar fue conservador aquí)'):(d<-2?('Radar es <b>más optimista</b> que tu tesis en esta empresa'):('Radar y tu tesis <b>coinciden</b>'));
  var html=
    '<div style="padding:14px 16px;border-bottom:1px solid #eef2f7;display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:15px">'+x.t+'</b> <span style="color:#94a3b8;font-size:12px">'+_infEscSafe((x.nombre||'').slice(0,26))+'</span></div><span data-visatrx="1" style="cursor:pointer;color:#94a3b8;font-size:18px;line-height:1">✕</span></div>'+
    '<div style="padding:14px 16px">'+
      '<div style="font-size:12px;color:#475569;margin-bottom:10px">Por qué el <b>Atractivo</b> difiere entre las dos miradas. Las fórmulas pesan cosas distintas: Radar mira la <b>valoración de mercado</b>; Visión, tu <b>margen a tu precio objetivo</b>.</div>'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap">'+
        '<div style="flex:1;min-width:180px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px"><div style="font-weight:800;font-size:12px;color:#475569;margin-bottom:2px">📡 Radar <span style="float:right;font-size:16px;color:'+_visAtrCol(r.atr)+'">'+r.atr+'</span></div>'+
          _visPilar('Dividendo',r.div,'35%','#0891b2')+_visPilar('Calidad',r.cal,'35%','#7c3aed')+_visPilar('Valoración',r.val,'30%','#b45309')+'</div>'+
        '<div style="flex:1;min-width:180px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px"><div style="font-weight:800;font-size:12px;color:#0369a1;margin-bottom:2px">🧭 Visión <span style="float:right;font-size:16px;color:'+_visAtrCol(x.atractivo)+'">'+x.atractivo+'</span></div>'+
          _visPilar('Calidad',x.vCal,'45%','#7c3aed')+_visPilar('Margen seg.',x.vMds,'35%','#16a34a')+_visPilar('RPD',x.vRpd,'20%','#0891b2')+'</div>'+
      '</div>'+
      '<div style="margin-top:12px;background:'+(d>2?'#f0fdf4':(d<-2?'#fef2f2':'#f8fafc'))+';border-radius:8px;padding:9px 11px;font-size:12px;color:#334155">'+(d>2?'▲ +':(d<-2?'▼ ':'= '))+(d>2?d:Math.abs(d))+' puntos · '+sesgo+'.</div>'+
    '</div>';
  _visAtrShow(html); }
function _visAtrShow(html){ var o=document.getElementById('visAtrPopWrap');
  if(!o){ o=document.createElement('div'); o.id='visAtrPopWrap'; o.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    o.addEventListener('click',function(e){ if(e.target===o||e.target.getAttribute('data-visatrx'))o.remove(); }); document.body.appendChild(o); }
  o.innerHTML='<div style="background:#fff;border-radius:14px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden">'+html+'</div>'; }
/* Resumen agregado: ¿tu Radar es en conjunto optimista, pesimista o mixto vs tu tesis? */
function _visSesgoResumen(rows){ var c=rows.filter(function(r){return r.rad&&!r.pte;}); if(c.length<2)return '';
  var difs=c.map(function(r){return r.atractivo-r.rad.atr;}); var media=difs.reduce(function(a,b){return a+b;},0)/difs.length;
  var sube=difs.filter(function(d){return d>2;}).length, baja=difs.filter(function(d){return d<-2;}).length, igual=difs.length-sube-baja;
  var tono=media>3?'tu Radar es en conjunto <b>pesimista</b> vs tu tesis':(media<-3?'tu Radar es en conjunto <b>optimista</b> vs tu tesis':'Radar y tesis van <b>alineados</b> de media');
  var mtxt=(media>=0?'+':'')+media.toFixed(0);
  return '<div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 12px;margin-bottom:10px;font-size:12px;color:#334155;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span>📐 <b>Visión − Radar</b> (media <b>'+mtxt+'</b>): '+tono+'.</span><span style="color:#16a34a;font-weight:700">▲'+sube+'</span><span style="color:#64748b;font-weight:700">='+igual+'</span><span style="color:#dc2626;font-weight:700">▼'+baja+'</span><span style="color:#94a3b8">de '+difs.length+' analizadas</span></div>'; }
function _visRankDesk(rows){
  var trs=rows.map(function(x,i){ return '<tr class="'+(i===0&&!x.pte?'best':'')+(x.pte?' pte':'')+'">'+
    '<td class="l"><b data-ficha="'+x.t+'" class="vis-tk">'+x.t+'</b> <span style="font-size:11px;color:#94a3b8">'+_infEscSafe((x.nombre||'').slice(0,16))+(x.held?' · en cartera':(x.pte?' · Pte. Análisis':''))+'</span></td>'+
    '<td style="white-space:nowrap">'+(x.rating||'—')+(x.estCal?_VIS_EST:'')+'</td>'+
    '<td style="color:'+_visScoreCol(x.score)+';font-weight:700'+(x.estCal?';font-style:italic':'')+';white-space:nowrap">'+(x.score==null?'—':Math.round(x.score))+((x.deltaMkt!=null&&!x.estCal)?_visDeltaChip(x.deltaMkt):'')+'</td>'+
    '<td class="'+(x.mds!=null&&x.mds>=0?'pos':'neg')+'">'+_visPct(x.mds)+'</td>'+
    '<td>'+(x.rpd==null?'—':(x.rpd*100).toFixed(1)+'%')+'</td>'+
    '<td style="font-weight:800;color:'+_visAtrCol(x.atractivo)+';white-space:nowrap">'+x.atractivo+_visAtrDelta(x)+'</td>'+
    '<td style="white-space:nowrap">'+(x.meses==null?'—':x.meses+'m')+(x.stale?' <span title="dossier caducado" style="color:#dc2626">⚠</span>':'')+'</td>'+
    '<td class="l">'+_visDecChip(x.decision)+'</td></tr>';
  }).join('');
  return _visSesgoResumen(rows)+'<div class="vis-desk"><table><thead><tr><th class="l">Empresa</th><th>Rating</th><th>Score</th><th>Margen seg.</th><th>RPD</th><th>Atractivo</th><th>Dossier</th><th class="l">Decisión</th></tr></thead><tbody>'+trs+'</tbody></table></div>';
}
function _visRankCards(rows){
  return '<div class="vis-cards">'+rows.map(function(x,i){ return '<div class="vis-card'+(i===0&&!x.pte?' best':'')+(x.pte?' pte':'')+'"><div class="vis-card-h">'+
    '<div class="score"><div class="n" style="color:'+_visAtrCol(x.atractivo)+'">'+x.atractivo+'</div><div class="l">Atr</div>'+(x.rad?'<div style="margin-top:2px">'+_visAtrDelta(x)+'</div>':'')+'</div>'+
    '<div class="mid"><div class="nm">'+x.t+' · '+_infEscSafe((x.nombre||'').slice(0,18))+'</div><div class="s2">'+_visDecChip(x.decision)+' <span style="font-size:11px;color:#94a3b8">'+(x.held?'en cartera':(x.pte?'Pte. Análisis':(x.rating||'')))+'</span></div></div>'+
    '<span class="arw">▶</span></div>'+
    '<div class="vis-card-b"><div class="mgrid">'+
      '<div class="m"><div class="l">Rating</div><div class="v">'+(x.rating||'—')+(x.estCal?_VIS_EST:'')+'</div></div>'+
      '<div class="m"><div class="l">Score</div><div class="v" style="color:'+_visScoreCol(x.score)+(x.estCal?';font-style:italic':'')+'">'+(x.score==null?'—':Math.round(x.score))+((x.deltaMkt!=null&&!x.estCal)?_visDeltaChip(x.deltaMkt):'')+'</div></div>'+
      '<div class="m"><div class="l">Margen seg.</div><div class="v '+(x.mds!=null&&x.mds>=0?'pos':'neg')+'">'+_visPct(x.mds)+'</div></div>'+
      '<div class="m"><div class="l">RPD</div><div class="v">'+(x.rpd==null?'—':(x.rpd*100).toFixed(1)+'%')+'</div></div>'+
      '<div class="m"><div class="l">Dossier</div><div class="v">'+(x.meses==null?'—':x.meses+'m')+(x.stale?' ⚠':'')+'</div></div>'+
      '<div class="m"><div class="l">Cotiz.</div><div class="v">'+(x.cot?fmt(x.cot):'—')+'</div></div>'+
    '</div></div></div>';
  }).join('')+'</div>';
}
function _visExpoHtml(ex){
  if(!ex.rows.length) return '<div class="muted" style="font-size:12px;padding:8px 0">Sin posiciones en cartera con tesis etiquetada todavía.</div>';
  return '<div class="vis-expo">'+ex.rows.map(function(r){ var p=r.pct*100; var col=p>=40?'#dc2626':p>=25?'#d97706':'#2563eb';
    return '<div class="row"><div class="top"><span><b>'+_infEscSafe(r.tag)+'</b> <span class="tk">'+r.tk.join(', ')+'</span></span><span style="font-weight:800;color:'+col+'">'+p.toFixed(0)+'%</span></div><div class="bar"><i style="width:'+Math.min(100,p)+'%;background:'+col+'"></i></div></div>';
  }).join('')+'</div>';
}
function _visTagsHtml(rows){
  var opts=RIESGO_TAG_NAMES;
  var filas=rows.filter(function(x){return !x.pte;}).slice().sort(function(a,b){return a.t<b.t?-1:1;}).map(function(x){
    var manual=!!((DB.riesgoTags||{})[x.t]);
    var chips=(x.tags.length?x.tags:['—']).map(function(tg){ return tg==='—'?'<span class="muted" style="font-size:11px">sin tags</span>':'<span class="vis-chip">'+_infEscSafe(tg)+' <span data-vistagdel="'+x.t+'|'+tg+'" class="x">✕</span></span>'; }).join('');
    var addSel='<select data-vistagadd="'+x.t+'" class="vis-tagsel"><option value="">+ tema…</option>'+opts.filter(function(o){return x.tags.indexOf(o)<0;}).map(function(o){return '<option>'+_infEscSafe(o)+'</option>';}).join('')+'</select>';
    return '<tr><td style="white-space:nowrap"><b data-ficha="'+x.t+'" class="vis-tk">'+x.t+'</b></td><td>'+chips+'</td><td style="white-space:nowrap">'+addSel+' '+(manual?'<button class="vis-autob" data-vistagauto="'+x.t+'" title="Volver a los tags automáticos">↻ auto</button>':'<span class="muted" style="font-size:10px">auto</span>')+'</td></tr>';
  }).join('');
  return '<div class="vis-desk"><table class="vis-tage"><thead><tr><th style="text-align:left">Empresa</th><th style="text-align:left">Tags</th><th style="text-align:left">Editar</th></tr></thead><tbody>'+filas+'</tbody></table></div>';
}
function _visSortTools(){
  var b=[['atractivo','Atractivo'],['cal','Calidad'],['mds','Margen seg.'],['rpd','RPD'],['meses','Antigüedad']];
  var desk='<span class="muted" style="font-size:11px">Ordenar:</span>'+b.map(function(o){return '<button class="vis-sortb'+(_visSort===o[0]?' on':'')+'" data-vissort="'+o[0]+'">'+o[1]+'</button>';}).join('');
  var mob='<label class="vis-sortm">Ordenar <select id="visSortSel">'+b.map(function(o){return '<option value="'+o[0]+'"'+(_visSort===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>';
  return '<div class="vis-tools">'+desk+mob+'</div>';
}
function _visBlk(key,ic,title,cnt,note,tools,inner){ var op=window._visOpen[key]; return '<div class="vis-blk'+(op?' open':'')+'" data-vblk="'+key+'"><div class="vis-blk-h"><span class="ic">'+ic+'</span><span class="t">'+title+'</span><span class="cnt">'+cnt+'</span><span class="arw">▶</span></div><div class="vis-blk-b">'+(note?'<div class="vis-note">'+note+'</div>':'')+(tools||'')+inner+'</div></div>'; }
function renderVision(){
  const el=$('#visBody'); if(!el) return;
  const faltan=(DB.analisis||[]).some(a=>{ const t=(a.ticker||'').toUpperCase(); return t && (typeof _tesisCache==='undefined'||_tesisCache[t]===undefined); });
  if(faltan) visLoadTesis(renderVision);
  /* Carga (1 vez) de fundamentales.json + motor de dividendos para la calidad estimada y la RPD viva. */
  if(!renderVision._extra){ renderVision._extra=true; var _pr=[];
    if(typeof _radCargarFund==='function')_pr.push(Promise.resolve(_radCargarFund()).catch(function(){}));
    if(typeof _evoCargar==='function')_pr.push(Promise.resolve(_evoCargar()).catch(function(){}));
    if(_pr.length)Promise.all(_pr).then(function(){ try{ renderVision(); }catch(e){} }); }
  if(!(DB.analisis||[]).length && !Object.keys(DB.universo||{}).length){ el.innerHTML='<div class="empty">Sin empresas en Análisis todavía.</div>'; return; }
  var rows=visRankData();
  window._visRowMap={}; rows.forEach(function(r){ window._visRowMap[r.t]=r; });
  var key={atractivo:x=>x.atractivo, mds:x=>(x.mds==null?-9:x.mds), cal:x=>(x.score==null?-9:x.score), rpd:x=>(x.rpd==null?-9:x.rpd), meses:x=>(x.meses==null?-9:x.meses)}[_visSort]||(x=>x.atractivo);
  rows=rows.slice().sort((a,b)=>key(b)-key(a));
  var nAn=rows.filter(function(x){return !x.pte;}).length;
  var nHeld=rows.filter(function(x){return x.held;}).length;
  var best=rows.slice().sort(function(a,b){return b.atractivo-a.atractivo;})[0];
  var ex=visRiesgoExpo();
  var enRojo=ex.rows.filter(function(r){return r.pct>=0.4;}).length;
  var kpis='<div class="vis-k">'+
    '<div class="c hero"><div class="l">Mejor atractivo</div><div class="v">'+(best?best.atractivo:'—')+'</div><div class="p">'+(best?_infEscSafe(best.t):'')+'</div></div>'+
    '<div class="c"><div class="l">Analizadas</div><div class="v">'+nAn+'</div><div class="p">con dossier o score</div></div>'+
    '<div class="c"><div class="l">En cartera</div><div class="v">'+nHeld+'</div><div class="p">con posición</div></div>'+
    '<div class="c"><div class="l">Temas en rojo</div><div class="v warn">'+enRojo+'</div><div class="p">exposición ≥ 40%</div></div>'+
  '</div>';
  el.innerHTML=
    '<div class="sub" style="margin-bottom:14px">Ranking transversal de todas tus empresas por <b>atractivo</b> (calidad + margen de seguridad + RPD) para priorizar qué analizar o comprar, y tu <b>exposición por tema de riesgo</b> en cartera.</div>'+
    kpis+
    _visBlk('rank','🧭','Ranking de atractivo',nAn+' analizadas','Atractivo = 0,45·Calidad + 0,35·Margen de seguridad + 0,20·RPD (normalizados 0-100). RPD viva (dividendo del año en vigor ÷ precio, misma fuente que Radar). Las que aún no tienes analizadas usan una <b>calidad estimada</b> del subíndice de Radar, marcada «est.». ⚠ marca dossier de más de 12 meses.',_visSortTools(),_visRankDesk(rows)+_visRankCards(rows))+
    _visBlk('expo','🛡️','Exposición por tema de riesgo',ex.rows.length+' temas','% del valor de tu cartera expuesto a cada tema (una empresa puede sumar a varios). Rojo ≥40% · ámbar ≥25%.','',_visExpoHtml(ex))+
    _visBlk('tags','🏷️','Tags de riesgo por empresa',nAn+' empresas','Automáticos desde los riesgos[] de cada tesis; puedes añadir (desplegable) o quitar (✕). «↻ auto» descarta los cambios manuales de esa empresa.','',_visTagsHtml(rows));
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  _visBind();
}
function _visBind(){
  var sec=document.getElementById('view-vision'); if(!sec||renderVision._bound)return; renderVision._bound=true;
  sec.addEventListener('click',function(e){
    var ap=e.target.closest('[data-visatr]'); if(ap){ e.stopPropagation(); _visAtrPop(ap.getAttribute('data-visatr')); return; }
    if(e.target.closest('[data-vissort]')||e.target.closest('[data-vistagdel]')||e.target.closest('[data-vistagauto]')||e.target.closest('[data-ficha]')||e.target.closest('select'))return;
    var vc=e.target.closest('.vis-card-h'); if(vc){ vc.parentElement.classList.toggle('open'); return; }
    var h=e.target.closest('.vis-blk-h'); if(h){ var k=h.parentElement.getAttribute('data-vblk'); window._visOpen[k]=!window._visOpen[k]; h.parentElement.classList.toggle('open'); return; }
  });
  sec.addEventListener('change',function(e){ if(e.target&&e.target.id==='visSortSel'){ _visSort=e.target.value; renderVision(); } });
}
function _infEscSafe(x){ if(typeof _infEsc==='function')return _infEsc(x); return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

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
