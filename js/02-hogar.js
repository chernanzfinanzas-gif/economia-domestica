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
let movFiltCats=new Set(), movFiltTits=new Set(), movFiltCom=new Set(), movFiltDet=new Set();
function catById(id){ return DB.categorias.find(c=>c.id===id); }
/* Efecto de un movimiento en los TOTALES DE PRESUPUESTO (gasto/ingreso del mes), con
   REGULARIZACIÓN: un ingreso dentro de una categoría de GASTO resta del gasto (es una
   devolución que reduce ese gasto, no un ingreso nuevo); simétrico para un gasto en categoría
   de ingreso. Sin categoría → se clasifica por el tipo del movimiento. NO se usa para el saldo
   de cuentas (ese sí cuenta el dinero que entra/sale por su tipo real). */
function _movBudget(m){ var imp=num(m&&m.importe), tt=m&&m.tipo; var c=catById(m&&m.categoriaId); var ct=c?c.tipo:null;
  if(ct==='gasto') return {ing:0, gas:(tt==='gasto'?imp:(tt==='ingreso'?-imp:0))};
  if(ct==='ingreso') return {ing:(tt==='ingreso'?imp:(tt==='gasto'?-imp:0)), gas:0};
  if(tt==='gasto') return {ing:0, gas:imp};
  if(tt==='ingreso') return {ing:imp, gas:0};
  return {ing:0, gas:0};
}
function _sumBudget(movs){ var ing=0, gas=0; (movs||[]).forEach(function(m){ var e=_movBudget(m); ing+=e.ing; gas+=e.gas; }); return {ing:ing, gas:gas}; }
function baseYear(){ return (DB.config&&DB.config.anioBasePresupuesto)||2026; }
function pAnio(p){ return p.anio||baseYear(); }
function presFor(id,year){ return DB.presupuesto.find(p=>p.categoriaId===id && pAnio(p)===year); }
function presYears(){ const s=new Set(DB.presupuesto.map(pAnio)); s.add(new Date().getFullYear()); if(presYear) s.add(presYear); return [...s].sort((a,b)=>b-a); }
function fillPresYear(){
  const ys=presYears();
  const sel=$('#presYear');
  if(sel){ sel.innerHTML=''; ys.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;sel.appendChild(o);}); sel.value=presYear; }
  const sel2=$('#presDesgloseYear');
  if(sel2){ sel2.innerHTML=''; ys.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;sel2.appendChild(o);}); sel2.value=presYear; }
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
function _pnlSpark(vals,w,h,col,fill){
  if(!vals||!vals.length) return '';
  var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rg=(mx-mn)||1;
  var P=vals.map(function(v,i){return [i/(vals.length-1)*w, h-((v-mn)/rg)*(h-4)-2];});
  var L=P.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' ');
  var A='M0 '+h+' '+P.map(function(p){return 'L'+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' ')+' L'+w+' '+h+' Z';
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="width:100%;height:'+h+'px;display:block">'+(fill?'<path d="'+A+'" fill="'+fill+'"/>':'')+'<path d="'+L+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function _pnl12m(){
  var out={ing:[],gas:[],aho:[]};
  for(var i=11;i>=0;i--){ var mmn=curMonth-i, yy=curYear; while(mmn<0){mmn+=12;yy--;} var pref=yy+'-'+String(mmn+1).padStart(2,'0');
    var mv=(DB.movimientos||[]).filter(function(x){return (x.fecha||'').indexOf(pref)===0;});
    var ii=mv.filter(function(x){return x.tipo==='ingreso';}).reduce(function(s,x){return s+num(x.importe);},0);
    var gg=mv.filter(function(x){return x.tipo==='gasto';}).reduce(function(s,x){return s+num(x.importe);},0);
    out.ing.push(ii); out.gas.push(gg); out.aho.push(ii-gg);
  }
  return out;
}
function _pnlDelta(cur,prev,upGood){
  if(prev==null||Math.abs(prev)<0.005) return '';
  var d=(cur-prev)/Math.abs(prev); var up=d>=0; var good=(up===upGood);
  return '<span class="kdelta '+(good?'up':'dn')+'">'+(up?'▲':'▼')+' '+Math.abs(d*100).toFixed(0)+'%</span>';
}
/* ===== P1 · Tasa de ahorro: racha + tendencia (Panel) ===== */
function renderPanelAhorro(){
  var el=document.getElementById('panelAhorro'); if(!el)return;
  var movs=DB.movimientos||[]; var cy=(typeof curYear!=='undefined')?curYear:new Date().getFullYear();
  // objetivo % derivado del ahorro objetivo anual ÷ ingresos previstos
  var ingPrev=0; (DB.categorias||[]).filter(function(c){return c.tipo==='ingreso';}).forEach(function(c){ var p=presFor(c.id,cy); if(p)ingPrev+=(typeof mensual==='function'?mensual(p):num(p.importe))*12; });
  var objE=(typeof _presAhorroObj==='function')?_presAhorroObj(cy):0;
  var objPct=(objE>0&&ingPrev>0)?(objE/ingPrev*100):null; var objUsed=objPct!=null?objPct:20, objDef=objPct==null;
  // serie mensual de tasa
  var bym={}; movs.forEach(function(m){ var k=(''+(m.fecha||'')).slice(0,7); if(k.length!==7)return; bym[k]=bym[k]||{i:0,g:0}; if(m.tipo==='ingreso')bym[k].i+=num(m.importe); else if(m.tipo==='gasto')bym[k].g+=Math.abs(num(m.importe)); });
  var meses=Object.keys(bym).sort(); if(meses.length<2){ el.innerHTML=''; return; }
  function tOf(k){ var d=bym[k]; return d&&d.i? (d.i-d.g)/d.i*100 : 0; }
  var racha=0; for(var i=meses.length-1;i>=0;i--){ if(tOf(meses[i])>=objUsed)racha++; else break; }
  var last12=meses.slice(-12); var cumpl=last12.filter(function(k){return tOf(k)>=objUsed;}).length;
  var t12=last12.reduce(function(a,k){return {i:a.i+bym[k].i,g:a.g+bym[k].g};},{i:0,g:0}); var tasa12=t12.i?((t12.i-t12.g)/t12.i*100):0;
  function med(a){ if(!a.length)return 0; var s=a.slice().sort(function(x,y){return x-y;}); var n=s.length; return n%2? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2; }
  function medY(y){ return med(meses.filter(function(k){return k.slice(0,4)===(''+y);}).map(tOf)); }
  var mcur=medY(cy), mprev=medY(cy-1), hasPrev=meses.some(function(k){return k.slice(0,4)===(''+(cy-1));}), yoy=mcur-mprev;
  // sparkline con línea de objetivo
  var ML=['','E','F','M','A','M','J','J','A','S','O','N','D'];
  var vals=last12.map(tOf); var W=520,H=54,pl=4,pr=4,pt=6,pb=14; var pw=W-pl-pr,ph=H-pt-pb;
  var mn=Math.min.apply(null,vals.concat([objUsed,0])), mx=Math.max.apply(null,vals.concat([objUsed]));
  var X=function(i){return pl+pw*(vals.length>1?i/(vals.length-1):0.5);}, Y=function(v){return pt+ph*(1-(v-mn)/((mx-mn)||1));};
  var poly=vals.map(function(v,i){return X(i).toFixed(0)+','+Y(v).toFixed(0);}).join(' ');
  var dots=vals.map(function(v,i){return '<circle cx="'+X(i).toFixed(0)+'" cy="'+Y(v).toFixed(0)+'" r="2.6" fill="'+(v>=objUsed?'#16a34a':'#dc2626')+'"/>';}).join('');
  var xlab=last12.map(function(k,i){return '<text x="'+X(i).toFixed(0)+'" y="'+(H-3)+'" text-anchor="middle" font-size="8" fill="#94a3b8">'+ML[+k.slice(5,7)]+'</text>';}).join('');
  var oY=Y(objUsed).toFixed(0);
  var svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:54px"><line x1="'+pl+'" y1="'+oY+'" x2="'+(W-pr)+'" y2="'+oY+'" stroke="#16a34a" stroke-dasharray="3 3" stroke-width="1"/><text x="'+(W-pr)+'" y="'+(+oY-2)+'" text-anchor="end" font-size="8" fill="#16a34a">obj '+objUsed.toFixed(0)+'%</text><polyline points="'+poly+'" fill="none" stroke="#94a3b8" stroke-width="1.3"/>'+dots+xlab+'</svg>';
  var k=function(l,v,vcls,p){return '<div class="pah-k"><div class="l">'+l+'</div><div class="v '+(vcls||'')+'">'+v+'</div>'+(p?'<div class="p">'+p+'</div>':'')+'</div>';};
  el.innerHTML='<div class="pah"><div class="pah-h">🐖 Tasa de ahorro <span class="pah-obj">objetivo '+objUsed.toFixed(0)+'%'+(objDef?' (por defecto)':'')+'</span></div>'
    +'<div class="pah-kpis">'
    +k('Tasa a 12 meses',tasa12.toFixed(0)+'%',tasa12>=objUsed?'g':'r','de tus ingresos, últimos 12 m')
    +k('Racha actual',racha+' '+(racha===1?'mes':'meses'),racha>=3?'g':'','seguidos ≥ objetivo')
    +k('Típica (mediana)',mcur.toFixed(0)+'%',yoy>=0?'g':'r',hasPrev?((cy-1)+': '+mprev.toFixed(0)+'% ('+(yoy>=0?'+':'')+yoy.toFixed(0)+' pp)'):'mediana mensual '+cy)
    +k('Meses cumplidos',cumpl+'/'+last12.length,'','de los últimos meses')
    +'</div><div class="pah-spark">'+svg+'</div>'
    +(objDef?'<div class="pah-note">Estás usando un objetivo por defecto del <b>20%</b>. Define tu <b>ahorro objetivo</b> anual en Presupuesto y la racha se calculará con tu meta real.</div>':'')
    +'</div>';
}
/* ===== H1 · Autonomía de ingresos (Panel) ===== */
function renderPanelAutonomia(){
  var el=document.getElementById('panelAutonomia'); if(!el)return;
  var movs=DB.movimientos||[]; var cm={}; (DB.categorias||[]).forEach(function(c){cm[c.id]=c;});
  var last=null; movs.forEach(function(m){ if(m.fecha&&(!last||m.fecha>last))last=m.fecha; });
  if(!last){ el.innerHTML=''; return; }
  var start=new Date(last+'T00:00:00'); start.setMonth(start.getMonth()-11); start.setDate(1);
  var startISO=start.getFullYear()+'-'+String(start.getMonth()+1).padStart(2,'0');
  var PAS=/dividend|interes|interés|alquiler|renta|cup[oó]n/i;
  var src={}, totIng=0, pas=0;
  movs.forEach(function(m){ if(m.tipo!=='ingreso'||!m.fecha)return; if(m.fecha.slice(0,7)<startISO)return; var c=cm[m.categoriaId]; var nm=c?c.nombre:'(sin)'; var v=Math.abs(num(m.importe)); src[nm]=src[nm]||{v:0,pas:PAS.test(nm)}; src[nm].v+=v; totIng+=v; if(PAS.test(nm))pas+=v; });
  if(totIng<=0){ el.innerHTML=''; return; }
  var srcArr=Object.keys(src).map(function(k){return {k:k,v:src[k].v,pas:src[k].pas,pct:src[k].v/totIng*100};}).sort(function(a,b){return b.v-a.v;});
  var pasPct=pas/totIng*100, topPct=srcArr[0].pct, topN=srcArr[0].k;
  var FE=(typeof fondoEmergencia==='function')?fondoEmergencia():null; var meses=(FE&&FE.meses!=null)?FE.meses:null;
  var gastoAnual=(FE&&FE.gastoMes)?FE.gastoMes*12:0; var covPas=gastoAnual>0?pas/gastoAnual*100:0;
  var eur0=function(v){return Math.round(v).toLocaleString('es-ES')+' €';};
  var mesCls=meses==null?'':(meses<3?'r':(meses<6?'a':'g'));
  var depCls=topPct>=60?'r':(topPct>=40?'a':'g');
  var k=function(l,v,vcls,p){return '<div class="pau-k"><div class="l">'+l+'</div><div class="v '+(vcls||'')+'">'+v+'</div>'+(p?'<div class="p">'+p+'</div>':'')+'</div>';};
  var kpis='<div class="pau-kpis">'
    +k('Ingreso pasivo',pasPct.toFixed(0)+'%',pasPct>=25?'g':'',eur0(pas)+'/año (dividendos, intereses…)')
    +k('Dependencia',topPct.toFixed(0)+'%',depCls,'de tu mayor fuente ('+topN+')')
    +k('Meses de colchón',meses==null?'—':meses.toFixed(1),mesCls,'efectivo ÷ gasto mensual')
    +k('Cobertura pasiva',covPas.toFixed(0)+'%',covPas>=100?'g':'',eur0(pas)+' de '+eur0(gastoAnual)+' de gasto')
    +'</div>';
  var maxV=srcArr[0].v||1;
  var rows=srcArr.slice(0,7).map(function(s){ var w=(s.v/maxV*100).toFixed(0); var col=s.pas?'linear-gradient(90deg,#16a34a,#22c55e)':'linear-gradient(90deg,#4f46e5,#6366f1)'; return '<div class="pau-row"><div class="nm">'+s.k+'<span class="tag '+(s.pas?'p':'a')+'">'+(s.pas?'pasivo':'activo')+'</span></div><div class="pau-bar"><i style="width:'+w+'%;background:'+col+'"></i></div><div class="pc">'+s.pct.toFixed(0)+'% · '+eur0(s.v)+'</div></div>'; }).join('');
  el.innerHTML='<div class="pau"><div class="pau-h">🧭 Autonomía de ingresos</div>'
    +'<div class="pau-sub">Últimos 12 meses. De dónde viene tu dinero, cuánto dependes de una sola fuente y cuánto aguantarías sin ingresos activos.</div>'
    +kpis
    +'<div class="pau-src">'+rows+'</div>'
    +'<div class="pau-note">Cuanto <b>mayor la dependencia</b> de una fuente (p. ej. dos nóminas), más frágil tu autonomía; cuanto <b>más ingreso pasivo y más meses de colchón</b>, más libre eres para decidir. Tu dividendo ya cubre el '+covPas.toFixed(0)+'% de tu gasto.</div>'
    +'</div>';
}
function renderPanel(){
  const isYear = panelMode==='anio';
  const bm=$('#mModeMes'), ba=$('#mModeAnio'); if(bm)bm.classList.toggle('on',!isYear); if(ba)ba.classList.toggle('on',isYear);
  const mm=$('#mMonth'); if(mm){ mm.disabled=isYear; mm.style.opacity=isYear?0.45:1; }
  const suf = isYear?'del año':'del mes';
  $('#panelTitle').textContent='Panel · '+(isYear? curYear : (MESES[curMonth].replace(/^./,c=>c.toUpperCase())+' '+curYear));
  const _bOpen=window._pBudOpen!==false;
  const bh=$('#panelBudgetH'); if(bh){ bh.innerHTML='<span class="pcol-arw'+(_bOpen?' open':'')+'">▶</span>Seguimiento del presupuesto ('+(isYear?'año':'mes')+')'; bh.classList.add('pcol-h'); }
  const pref = isYear? (''+curYear) : (curYear+'-'+String(curMonth+1).padStart(2,'0'));
  const movs = DB.movimientos.filter(m=>m.fecha.startsWith(pref));
  const _sM=_sumBudget(movs); const ing=_sM.ing, gas=_sM.gas;
  const ahorro=ing-gas;
  const mult = isYear?12:1;
  let presGasto=0, presIng=0;
  DB.presupuesto.filter(p=>pAnio(p)===curYear).forEach(p=>{const c=catById(p.categoriaId); if(!c)return; const v=mensual(p)*mult; if(c.tipo==='gasto') presGasto+=v; else presIng+=v;});
  const prevPref = isYear? (''+(curYear-1)) : ((curYear-1)+'-'+String(curMonth+1).padStart(2,'0'));
  const prevMovs = DB.movimientos.filter(m=>m.fecha.startsWith(prevPref));
  const _sP=_sumBudget(prevMovs); const pIng=_sP.ing, pGas=_sP.gas;
  const pAho=pIng-pGas; const hasPrev=prevMovs.length>0;
  const yMovs=DB.movimientos.filter(m=>(m.fecha||'').startsWith(''+curYear));
  const _sY=_sumBudget(yMovs); const ingA=_sY.ing, gasA=_sY.gas;
  const ahoA=ingA-gasA;
  const tasa = ing>0? (ahorro/ing*100):0;
  const tasaA = ingA>0? (ahoA/ingA*100):0;
  const s12=_pnl12m();
  const yoyHero = (hasPrev&&Math.abs(pAho)>=0.005)? (' · vs '+(curYear-1)+': '+((ahorro-pAho)>=0?'+':'')+(((ahorro-pAho)/Math.abs(pAho))*100).toFixed(0)+'%') : '';
  const heroPer = isYear? (''+curYear) : (MESES[curMonth].replace(/^./,c=>c.toUpperCase())+' '+curYear);
  const ph=$('#panelHero');
  if(ph) ph.innerHTML='<div class="ph"><div class="ph-main"><div class="ph-per">Ahorro · '+heroPer+'</div>'
    +'<div class="ph-big '+(ahorro<0?'ph-neg':'')+'">'+fmt(ahorro)+(ing>0?'<span class="ph-tasa">tasa '+tasa.toFixed(0)+'%</span>':'')+'</div>'
    +'<div class="ph-cap">Previsto '+fmt(presIng-presGasto)+yoyHero+'</div></div>'
    +'<div class="ph-spark">'+_pnlSpark(s12.aho,190,52,'#fff','rgba(255,255,255,.18)')+'</div></div>';
  const budPct = presGasto? Math.round(gas/presGasto*100) : 0;
  const budCls = semClass(presGasto? gas/presGasto : (gas?2:0));
  const budColor = budCls==='g'?'var(--green)':budCls==='a'?'var(--amber)':'var(--red)';
  const kIn='<div class="kpi k-in"><div class="k-top"><span class="k-ic">↘</span><span class="k-lbl">Ingresos '+suf+'</span>'+_pnlDelta(ing,pIng,true)+'</div>'
    +'<div class="k-val">'+fmt(ing)+'</div><div class="k-year">Año <b>'+fmt(ingA)+'</b> · ppto '+fmt(presIng)+'</div>'
    +'<div class="k-spark">'+_pnlSpark(s12.ing,200,24,'var(--green)','rgba(22,163,74,.10)')+'</div></div>';
  const kOut='<div class="kpi k-out"><div class="k-top"><span class="k-ic">↗</span><span class="k-lbl">Gastos '+suf+'</span>'+_pnlDelta(gas,pGas,false)+'</div>'
    +'<div class="k-val">'+fmt(gas)+'</div><div class="k-year">Año <b>'+fmt(gasA)+'</b> · ppto '+fmt(presGasto)+'</div>'
    +'<div class="k-spark">'+_pnlSpark(s12.gas,200,24,'var(--red)','rgba(220,38,38,.08)')+'</div></div>';
  const kSave='<div class="kpi k-save"><div class="k-top"><span class="k-ic">＝</span><span class="k-lbl">Ahorro '+suf+'</span>'+_pnlDelta(ahorro,pAho,true)+'</div>'
    +'<div class="k-val '+(ahorro<0?'neg':'')+'">'+fmt(ahorro)+'</div><div class="k-year">Año <b>'+fmt(ahoA)+'</b> · tasa '+tasaA.toFixed(0)+'%</div>'
    +'<div class="k-spark">'+_pnlSpark(s12.aho,200,24,'var(--brand)','rgba(37,99,235,.10)')+'</div></div>';
  const kBud='<div class="kpi k-bud"><div class="k-top"><span class="k-ic">◐</span><span class="k-lbl">Salud del ppto.</span></div>'
    +'<div class="k-body"><div class="k-ring" style="--p:'+Math.min(100,budPct)+';--rc:'+budColor+'"><div class="k-ring-in">'+budPct+'%</div></div>'
    +'<div class="k-year">Consumido<br><b>'+fmt(gas)+'</b> de '+fmt(presGasto)+'<br>'+(presGasto>=gas?'<span style="color:var(--green)">quedan '+fmt(presGasto-gas)+'</span>':'<span style="color:var(--red)">excede '+fmt(gas-presGasto)+'</span>')+'</div></div></div>';
  $('#panelCards').innerHTML=kIn+kOut+kSave+kBud;
  if(typeof renderPanelAhorro==='function')renderPanelAhorro();
  if(typeof renderPanelAutonomia==='function')renderPanelAutonomia();
  const groups={};
  DB.categorias.filter(c=>c.tipo==='gasto').forEach(c=>{
    const p=presFor(c.id,curYear); const pres=(p?mensual(p):0)*mult;
    const real=movs.filter(m=>m.categoriaId===c.id).reduce((s,m)=>s+_movBudget(m).gas,0);
    const g=groups[c.grupo]=groups[c.grupo]||{pres:0,real:0};
    g.pres+=pres; g.real+=real;
  });
  const rowsHTML=Object.keys(groups).sort().map(g=>{
    const o=groups[g]; const ratio=o.pres?o.real/o.pres:(o.real?2:0); const cls=semClass(ratio);
    const pct=o.pres?Math.min(100,Math.round(o.real/o.pres*100)):0; const dev=o.pres-o.real;
    return '<div class="pbud-row"><div class="pbud-top"><span class="pbud-name">'+g+'</span><span class="pbud-fig"><b>'+fmt(o.real)+'</b> / '+fmt(o.pres)+'</span></div>'
      +'<div class="pbud-bar"><i style="width:'+pct+'%;background:'+barColor(cls)+'"></i></div>'
      +'<div class="pbud-bot"><span class="pill '+cls+'">'+(o.pres?Math.round(o.real/o.pres*100):0)+'%</span>'
      +'<span class="pbud-dev '+(dev>=0?'pos':'neg')+'">'+(dev>=0?'queda ':'excede ')+fmt(Math.abs(dev))+'</span></div></div>';
  }).join('');
  const tot=Object.values(groups).reduce((a,o)=>({pres:a.pres+o.pres,real:a.real+o.real}),{pres:0,real:0});
  const totDev=tot.pres-tot.real;
  $('#panelBudget').innerHTML = rowsHTML? ('<div class="pbud">'+rowsHTML+'<div class="pbud-total"><span>TOTAL</span><span class="pbud-fig"><b>'+fmt(tot.real)+'</b> / '+fmt(tot.pres)+' · '+(totDev>=0?'<span style="color:var(--green)">quedan '+fmt(totDev)+'</span>':'<span style="color:var(--red)">excede '+fmt(-totDev)+'</span>')+' · <span class="pill '+semClass(tot.pres?tot.real/tot.pres:0)+'">'+(tot.pres?Math.round(tot.real/tot.pres*100):0)+'%</span></span></div></div>')
    : '<div class="empty">No hay categorías de gasto.</div>';
  var _pb=$('#panelBudget'); if(_pb)_pb.style.display=(window._pBudOpen!==false)?'':'none';
  if(typeof renderPanelDash==='function')renderPanelDash();
  if(typeof renderInformeBlock==='function')renderInformeBlock();
}

/* ============ Informe / PDF (Panel) ============ */
var INF_LOGO='';
function _infEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _infPad(n){ return String(n).padStart(2,'0'); }
function _infTitulares(){ var base=(typeof perfilTitulares==='function'?perfilTitulares():[]); var s=base.slice(); if(s.indexOf('Dos')<0)s.push('Dos'); (DB.movimientos||[]).forEach(function(m){ if(m.titular&&s.indexOf(m.titular)<0)s.push(m.titular); }); if(!s.length)s=['Carlos','Susana','Dos']; return s; }
function _infMonthsInRange(d0,d1){ var out=[]; var y=d0.getFullYear(), m=d0.getMonth(); var ey=d1.getFullYear(), em=d1.getMonth(); while(y<ey||(y===ey&&m<=em)){ out.push({y:y,m:m}); m++; if(m>11){m=0;y++;} } return out; }
function _infDetalle(list,tipo,modo){
  var movs=list.filter(function(m){return m.tipo===tipo;}).sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
  if(!movs.length)return {html:'<p class="muted">Sin '+(tipo==='ingreso'?'ingresos':'gastos')+' con estos filtros.</p>',total:0};
  if(modo==='totales'){
    var byGt={},tot0=0;
    movs.forEach(function(m){ var c=catById(m.categoriaId); var g=(c&&c.grupo)||'Sin grupo'; byGt[g]=(byGt[g]||0)+num(m.importe); });
    var rows='';
    Object.keys(byGt).sort().forEach(function(g){ tot0+=byGt[g]; rows+='<tr><td>'+_infEsc(g)+'</td><td class="num">'+fmt(byGt[g])+'</td></tr>'; });
    return {html:'<table><thead><tr><th>Secci\u00f3n</th><th class="num">Importe</th></tr></thead><tbody>'+rows+'<tr class="tot"><td>TOTAL</td><td class="num">'+fmt(tot0)+'</td></tr></tbody></table>',total:tot0};
  }
  var byG={};
  movs.forEach(function(m){ var c=catById(m.categoriaId); var g=(c&&c.grupo)||'Sin grupo'; var cn=(c&&c.nombre)||'Sin categor\u00eda'; byG[g]=byG[g]||{}; byG[g][cn]=byG[g][cn]||[]; byG[g][cn].push(m); });
  var html='',total=0;
  Object.keys(byG).sort().forEach(function(g){
    var gTot=0,gRows='';
    Object.keys(byG[g]).sort().forEach(function(cn){
      var arr=byG[g][cn],cTot=0;
      arr.forEach(function(m){ var v=num(m.importe); cTot+=v; gRows+='<tr><td>'+ddmmyyyy(m.fecha)+'</td><td>'+_infEsc(m.concepto)+'</td><td>'+_infEsc(m.comercio)+'</td><td>'+_infEsc(cn)+'</td><td>'+_infEsc(m.titular)+'</td><td class="num">'+fmt(v)+'</td></tr>'; });
      gRows+='<tr class="sub"><td colspan="5">Subtotal '+_infEsc(cn)+'</td><td class="num">'+fmt(cTot)+'</td></tr>';
      gTot+=cTot;
    });
    total+=gTot;
    html+='<div class="sec"><h3>'+_infEsc(g)+'</h3><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Comercio</th><th>Categor\u00eda</th><th>Titular</th><th class="num">Importe</th></tr></thead><tbody>'+gRows+'<tr class="tot"><td colspan="5">TOTAL '+_infEsc(g)+'</td><td class="num">'+fmt(gTot)+'</td></tr></tbody></table></div>';
  });
  return {html:html,total:total};
}
function _infEnsurePrint(){
  var host=document.getElementById('informePrint');
  if(!host){ host=document.createElement('div'); host.id='informePrint'; document.body.appendChild(host); }
  if(!document.getElementById('informePrintCSS')){
    var st=document.createElement('style'); st.id='informePrintCSS';
    st.textContent='#informePrint{display:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
      +'@media print{ body>*:not(#informePrint){display:none!important} #informePrint{display:block!important} @page{margin:12mm} }'
      +'#informePrint{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:13.5px;padding:8px}'
      +'#informePrint .infHdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1E3A5F;padding-bottom:10px}'
      +'#informePrint .infHdr img{height:78px;width:auto}'
      +'#informePrint .infHdr .tt{text-align:right}'
      +'#informePrint .infHdr .tt h1{font-size:30px;margin:0;color:#1E3A5F;letter-spacing:.3px}'
      +'#informePrint .infHdr .tt .sub{font-size:14px;color:#5b6b7d;margin-top:4px}'
      +'#informePrint .accent{height:4px;background:linear-gradient(90deg,#1E3A5F 0 55%,#2E7D42 55% 100%);margin:0 0 6px}'
      +'#informePrint .metaline{font-size:12px;color:#6b7280;margin:4px 0 0}'
      +'#informePrint h1{font-size:30px;margin:0}'
      +'#informePrint h2{font-size:16px;margin:18px 0 7px;color:#1E3A5F;border-bottom:2px solid #d7dee6;padding-bottom:3px;text-transform:uppercase;letter-spacing:.4px;page-break-after:avoid;break-after:avoid}'
      +'#informePrint h3{font-size:13.5px;margin:9px 0 3px;color:#2E7D42;font-weight:700;break-after:avoid;page-break-after:avoid}'
      +'#informePrint table{width:100%;border-collapse:collapse;font-size:12px;margin:2px 0 8px}'
      +'#informePrint th,#informePrint td{border:1px solid #d1d5db;padding:3px 7px;text-align:left;vertical-align:top}'
      +'#informePrint th{background:#1E3A5F;color:#fff;font-weight:600;font-size:11.5px}'
      +'#informePrint td.num,#informePrint th.num{text-align:right;white-space:nowrap}'
      +'#informePrint tr{page-break-inside:avoid;break-inside:avoid}'
      +'#informePrint tr.sub td{background:#f3f6f9;font-style:italic;color:#475569}'
      +'#informePrint tr.tot td{background:#e8eef4;font-weight:700;color:#1E3A5F}'
      +'#informePrint .kpis{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}'
      +'#informePrint .kpi{flex:1;border:1px solid #dde3ea;border-top:3px solid #1E3A5F;border-radius:6px;padding:6px 12px;min-width:105px;background:#fafbfc}'
      +'#informePrint .kpi .l{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.3px}'
      +'#informePrint .kpi .v{font-size:20px;font-weight:700;color:#1E3A5F;margin-top:2px}'
      +'#informePrint .muted{color:#6b7280}'
      +'#informePrint .sec{margin-bottom:6px}'
      +'#informePrint .foot{margin-top:22px;border-top:1px solid #d7dee6;padding-top:6px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}'
      +'#informePrint .infDoc+.infDoc{page-break-before:always;break-before:page}'
      +'#informePrint .infCharts{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 12px}'
      +'#informePrint .infCharts>*{flex:1 1 240px;min-width:220px;max-width:370px}'
      +'#informePrint .infCharts .card{border:1px solid #dde3ea;border-radius:8px;padding:8px;background:#fff;margin:0;box-shadow:none}'
      +'#informePrint svg{max-width:100%;height:auto}';
    document.head.appendChild(st);
  }
  return host;
}
async function generarInforme(){ if(typeof ensureInfLogos==='function')await ensureInfLogos();
  var per=document.getElementById('infPeriodo').value;
  var d0,d1,label;
  if(per==='mes'){ var v=document.getElementById('infMes').value; if(!v){alert('Elige un mes');return;} var pp=v.split('-'); var Y=+pp[0],M=+pp[1]; d0=new Date(Y,M-1,1); d1=new Date(Y,M,0); var mn=(typeof MESES!=='undefined'?MESES[M-1]:''+M); label='Mes de '+(mn.charAt(0).toUpperCase()+mn.slice(1))+' '+Y; }
  else if(per==='anio'){ var Ya=parseInt(document.getElementById('infAnio').value,10); if(!Ya){alert('Pon un año');return;} d0=new Date(Ya,0,1); d1=new Date(Ya,11,31); label='Año '+Ya; }
  else { var a=document.getElementById('infDesde').value, b=document.getElementById('infHasta').value; if(!a||!b){alert('Pon fecha desde y hasta');return;} d0=new Date(a+'T00:00:00'); d1=new Date(b+'T00:00:00'); if(d1<d0){var t=d0;d0=d1;d1=t;} label='Del '+ddmmyyyy(a)+' al '+ddmmyyyy(b); }
  var s0=d0.getFullYear()+'-'+_infPad(d0.getMonth()+1)+'-'+_infPad(d0.getDate());
  var s1=d1.getFullYear()+'-'+_infPad(d1.getMonth()+1)+'-'+_infPad(d1.getDate());
  var tipo=document.getElementById('infTipo').value;
  var selTits=[].slice.call(document.querySelectorAll('.infTitCk:checked')).map(function(x){return x.value;});
  var selCats=[].slice.call(document.querySelectorAll('.infCatCk:checked')).map(function(x){return x.value;});
  var conc=(document.getElementById('infConcepto').value||'').trim().toLowerCase();
  var com=(document.getElementById('infComercio').value||'').trim().toLowerCase();
  var list=(DB.movimientos||[]).filter(function(m){
    if(!m.fecha||m.fecha<s0||m.fecha>s1)return false;
    if(tipo!=='ambos'&&m.tipo!==tipo)return false;
    if(selTits.length&&selTits.indexOf(m.titular||'')<0)return false;
    if(selCats.length&&selCats.indexOf(m.categoriaId)<0)return false;
    if(conc&&(m.concepto||'').toLowerCase().indexOf(conc)<0)return false;
    if(com&&(m.comercio||'').toLowerCase().indexOf(com)<0)return false;
    return true;
  });
  if(!list.length){ alert('No hay movimientos con esos filtros en ese periodo.'); return; }
  var modo=(document.getElementById('infDetalle')||{}).value||'completo';
  var ingD=_infDetalle(list,'ingreso',modo), gasD=_infDetalle(list,'gasto',modo);
  var ing=ingD.total, gas=gasD.total, ahorro=ing-gas, tasa=ing?ahorro/ing*100:0;
  // presupuesto vs real (solo de lo filtrado)
  var months=_infMonthsInRange(d0,d1);
  var catsInScope=selCats.length?selCats.slice():Object.keys(list.reduce(function(o,m){o[m.categoriaId]=1;return o;},{}));
  var ingRows='',gasRows='',tPresI=0,tRealI=0,tPresG=0,tRealG=0,overList=[];
  catsInScope.forEach(function(cid){ var c=catById(cid); if(!c)return; var pres=0; months.forEach(function(mm){ var p=presFor(cid,mm.y); if(p)pres+=mensual(p); }); var real=0; list.forEach(function(m){ if(m.categoriaId===cid)real+=num(m.importe); }); if(pres===0&&real===0)return; var esGasto=(c.tipo==='gasto'); var ratio=pres?real/pres:(real?2:0); var dev=esGasto?(pres-real):(real-pres); var bg='transparent'; if(esGasto){ bg=ratio<=1?'#dcfce7':ratio<=1.1?'#fef9c3':'#fee2e2'; if(real>pres+0.005)overList.push(c.nombre); } else { bg=ratio>=1?'#dcfce7':ratio>=0.9?'#fef9c3':'#fee2e2'; } var pct=pres?Math.round(real/pres*100):0; var rowHtml='<tr><td>'+_infEsc(c.nombre)+' <span class="muted">('+_infEsc(c.grupo)+')</span></td><td class="num">'+fmt(pres)+'</td><td class="num">'+fmt(real)+'</td><td class="num">'+(dev>=0?'+':'')+fmt(dev)+'</td><td class="num" style="background:'+bg+'">'+(pres?pct+'%':'—')+'</td></tr>'; if(esGasto){ gasRows+=rowHtml; tPresG+=pres; tRealG+=real; } else { ingRows+=rowHtml; tPresI+=pres; tRealI+=real; } });
  var _presSub=function(lbl,tp,tr,esG){ var d=esG?(tp-tr):(tr-tp); return '<tr class="tot"><td>'+lbl+'</td><td class="num">'+fmt(tp)+'</td><td class="num">'+fmt(tr)+'</td><td class="num">'+(d>=0?'+':'')+fmt(d)+'</td><td class="num">'+(tp?Math.round(tr/tp*100)+'%':'—')+'</td></tr>'; };
  var presBody='';
  if(ingRows)presBody+='<tr class="sub"><td colspan="5">INGRESOS</td></tr>'+ingRows+_presSub('Total ingresos',tPresI,tRealI,false);
  if(gasRows)presBody+='<tr class="sub"><td colspan="5">GASTOS</td></tr>'+gasRows+_presSub('Total gastos',tPresG,tRealG,true);
  // resumen
  var gGroups={}; list.filter(function(m){return m.tipo==='gasto';}).forEach(function(m){ var c=catById(m.categoriaId); var g=(c&&c.grupo)||'Sin grupo'; gGroups[g]=(gGroups[g]||0)+num(m.importe); });
  var topG=Object.keys(gGroups).sort(function(a,b){return gGroups[b]-gGroups[a];})[0];
  var resumen='<p>En <b>'+_infEsc(label)+'</b> los ingresos sumaron <b>'+fmt(ing)+'</b> y los gastos <b>'+fmt(gas)+'</b>, con un '+(ahorro>=0?'ahorro':'desahorro')+' de <b>'+fmt(Math.abs(ahorro))+'</b>'+(ing?' (tasa de ahorro '+tasa.toFixed(0)+'%)':'')+'.</p>';
  if(topG)resumen+='<p>El grupo de mayor gasto fue <b>'+_infEsc(topG)+'</b> ('+fmt(gGroups[topG])+').</p>';
  if(overList.length)resumen+='<p>Categorías por encima del presupuesto: <b>'+overList.map(_infEsc).join('</b>, <b>')+'</b>.</p>';
  else if(presBody)resumen+='<p>Ninguna categoría superó su presupuesto en el periodo.</p>';
  resumen+='<p class="muted">'+list.length+' movimientos analizados.</p>';
  // ensamblado
  var kpi=function(l,vv){return '<div class="kpi"><div class="l">'+l+'</div><div class="v">'+vv+'</div></div>';};
  var td=new Date(); var todayS=td.getFullYear()+'-'+_infPad(td.getMonth()+1)+'-'+_infPad(td.getDate());
  var filt=[]; if(tipo!=='ambos')filt.push('Tipo: '+(tipo==='ingreso'?'ingresos':'gastos')); if(selTits.length)filt.push('Titular: '+selTits.join(', ')); if(selCats.length)filt.push('Categorías: '+selCats.length+' sel.'); if(conc)filt.push('Concepto ~ "'+_infEsc(conc)+'"'); if(com)filt.push('Comercio ~ "'+_infEsc(com)+'"');
  var html=infHeaderHTML('Informe Financiero');
  html+='<div class="metaline">'+_infEsc(label)+' · emitido el '+ddmmyyyy(todayS)+'</div>';
  if(filt.length)html+='<div class="metaline">Filtros — '+filt.join(' · ')+'</div>';
  html+='<h2>Situación financiera</h2><div class="kpis">'+kpi('Ingresos',fmt(ing))+kpi('Gastos',fmt(gas))+kpi('Ahorro',fmt(ahorro))+kpi('Tasa de ahorro',(ing?tasa.toFixed(0)+'%':'—'))+kpi('Nº movimientos',String(list.length))+'</div>';
  if(tipo!=='gasto')html+='<h2>'+(modo==='totales'?'Ingresos por secci\u00f3n':'Ingresos detallados')+'</h2>'+ingD.html;
  if(tipo!=='ingreso')html+='<h2>'+(modo==='totales'?'Gastos por secci\u00f3n':'Gastos detallados')+'</h2>'+gasD.html;
  html+='<h2>Presupuesto vs real'+((selCats.length||conc||com)?' (de lo filtrado)':'')+'</h2>'+(presBody?('<table><thead><tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Real</th><th class="num">Desviación</th><th class="num">%</th></tr></thead><tbody>'+presBody+'</tbody></table>'):'<p class="muted">Sin presupuesto asignado a las categorías filtradas.</p>');
  html+='<h2>Resumen</h2>'+resumen;
  html+='<div class="foot"><span>KHB Equity Investment · Informes y Gestión de Carteras</span><span></span></div>';
  var host=_infEnsurePrint(); host.innerHTML=html; window.print();
}
function _infUpdateChips(){
  var wrap=document.getElementById('informeWrap'); if(!wrap)return;
  var sel=[].slice.call(wrap.querySelectorAll('.infCatCk:checked'));
  var chips=document.getElementById('infSelChips'), cnt=document.getElementById('infSelCount');
  if(cnt)cnt.textContent=sel.length;
  if(!chips)return;
  if(!sel.length){ chips.innerHTML='<span class="muted" style="font-size:11px">Ninguna (= todas)</span>'; return; }
  chips.innerHTML=sel.map(function(x){ return '<span class="tag" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;margin:0">'+_infEsc(x.getAttribute('data-name'))+'<b class="infChipX" data-cid="'+x.value+'" title="Quitar" style="cursor:pointer;color:#b91c1c">✕</b></span>'; }).join('');
}
function _infSyncGrp(grp){
  var wrap=document.getElementById('informeWrap'); if(!wrap)return;
  var cks=[].slice.call(wrap.querySelectorAll('.infCatCk[data-grp="'+grp+'"]'));
  var gc=wrap.querySelector('.infGrpCk[data-grp="'+grp+'"]'); if(!gc)return;
  var n=cks.filter(function(x){return x.checked;}).length;
  gc.checked=(n>0&&n===cks.length); gc.indeterminate=(n>0&&n<cks.length);
}
function renderInformeBlock(){
  var sec=document.getElementById('view-panel'); if(!sec) return;
  if(document.getElementById('cotizPanelBtn')) return;
  var _ref=document.getElementById('panelPeriodo');
  var _cbtn=document.createElement('div'); _cbtn.id='cotizPanelBtn'; _cbtn.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 12px';
  // Botón «Informe semanal»: abre Claude (Cowork) en ESTE ordenador, chat nuevo con la carpeta del programa y la orden prerrellenada.
  var _khCarpeta='C:/Users/carlo/OneDrive/CoWork Análisis Financiero/Análisis Financiero KH&Claude';
  var _infOrden='genera el informe semanal de cartera';
  var _infHref='claude://cowork/new?folder='+encodeURIComponent(_khCarpeta)+'&q='+encodeURIComponent(_infOrden)+'&prompt='+encodeURIComponent(_infOrden);
  _cbtn.innerHTML='<a class="btn" href="https://github.com/chernanzfinanzas-gif/economia-domestica/actions/workflows/cotizaciones.yml" target="_blank" rel="noopener" style="text-decoration:none;white-space:nowrap" title="Abre GitHub para actualizar las cotizaciones del repositorio">🔄 Actualizar cotizaciones</a>'
    +'<a class="btn" href="https://github.com/chernanzfinanzas-gif/economia-domestica/actions/workflows/fundamentales.yml" target="_blank" rel="noopener" style="text-decoration:none;white-space:nowrap" title="Abre GitHub para actualizar los fundamentales del radar (Run workflow). Basta cada 3-12 meses.">📊 Actualizar fundamentales</a>'
    +'<a class="btn" id="infSemanalBtn" href="'+_infHref+'" style="text-decoration:none;white-space:nowrap" title="Abre Claude (Cowork) en ESTE ordenador con la carpeta del programa. Al pulsar, la orden «genera el informe semanal de cartera» se copia al portapapeles: si no aparece ya escrita en el chat, pégala con Ctrl+V y envía. Requiere la app de Claude instalada en este PC.">🧾 Informe semanal (Claude)</a>';
  if(_ref&&_ref.parentNode===sec)sec.insertBefore(_cbtn,_ref); else sec.insertBefore(_cbtn,sec.firstChild);
  var _isb=document.getElementById('infSemanalBtn');
  if(_isb) _isb.addEventListener('click',function(){ if(typeof _prepInfSemanal==='function')_prepInfSemanal(_infOrden); });
}
function _hemEsc(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _hemFecha(n){ var m=(''+n).match(/(\d{4})-(\d{2})-(\d{2})/); return m?(m[1]+m[2]+m[3]):'00000000'; }
function renderHemeroteca(){
  var sec=document.getElementById('view-hemeroteca'); if(!sec) return;
  var api='https://api.github.com/repos/chernanzfinanzas-gif/economia-domestica/contents/informes-semanales';
  var pages='https://chernanzfinanzas-gif.github.io/economia-domestica/informes-semanales/';
  sec.innerHTML='<h2>🗞️ Hemeroteca de Informes Semanales</h2><div class="sub" style="margin-bottom:12px">Informes semanales de cartera (coyuntura y riesgo) archivados en el repositorio. Se generan con «🧾 Informe semanal (Claude)» en el Centro de informes y se abren desde GitHub Pages.</div><div id="hemeroKpis" class="hem-kpis"></div><div id="hemeroSemanal"><div class="muted" style="font-size:13px">Cargando informes…</div></div>';
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  var host=document.getElementById('hemeroSemanal'); var kp=document.getElementById('hemeroKpis');
  fetch(api,{cache:'no-store',headers:{'Accept':'application/vnd.github+json'}}).then(function(r){return r.ok?r.json():null;}).then(function(arr){
    if(!Array.isArray(arr))arr=[];
    var pdfs=arr.filter(function(f){return /\.pdf$/i.test(f.name||'');});
    pdfs.sort(function(a,b){ var fa=_hemFecha(a.name), fb=_hemFecha(b.name); return fa<fb?1:(fa>fb?-1:0); }); // más reciente arriba (por fecha del nombre)
    if(!pdfs.length){ if(kp)kp.innerHTML=''; host.innerHTML='<div class="muted" style="font-size:13px">Aún no hay informes archivados. Genera uno con «🧾 Informe semanal (Claude)» en el Centro de informes y sube el PDF a la carpeta <code>informes-semanales/</code> del repositorio.</div>'; return; }
    var _dd=function(n){ var m=(''+n).match(/(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]+'/'+m[1]):(''+n); };
    var nowY=String(new Date().getFullYear());
    var ult=_dd(pdfs[0].name); var esteAno=pdfs.filter(function(f){ return _hemFecha(f.name).slice(0,4)===nowY; }).length;
    if(kp)kp.innerHTML=''
      +'<div class="k hero"><div class="l">Informes archivados</div><div class="v">'+pdfs.length+'</div><div class="p">en el repositorio</div></div>'
      +'<div class="k"><div class="l">Último informe</div><div class="v">'+ult+'</div><div class="p">semana más reciente</div></div>'
      +'<div class="k"><div class="l">De este año</div><div class="v">'+esteAno+' / '+pdfs.length+'</div><div class="p">'+nowY+'</div></div>'
      +'<div class="k"><div class="l">Cadencia</div><div class="v">Semanal</div><div class="p">coyuntura + riesgo</div></div>';
    var byY={}; pdfs.forEach(function(f){ var y=_hemFecha(f.name).slice(0,4); (byY[y]=byY[y]||[]).push(f); });
    var years=Object.keys(byY).sort().reverse();
    var deskRows=years.map(function(y){ var n=byY[y].length; return '<tr class="yr"><td colspan="3">'+y+' · '+n+' informe'+(n===1?'':'s')+'</td></tr>'+byY[y].map(function(f){ var url=pages+encodeURIComponent(f.name); return '<tr><td class="l"><b>'+_dd(f.name)+'</b></td><td class="l fn">'+_hemEsc(f.name||'')+'</td><td style="text-align:right"><a class="opb" href="'+url+'" target="_blank" rel="noopener">📄 Abrir PDF</a></td></tr>'; }).join(''); }).join('');
    var mob=years.map(function(y){ var n=byY[y].length; return '<div class="yhead">'+y+' · '+n+' informe'+(n===1?'':'s')+'</div>'+byY[y].map(function(f){ var url=pages+encodeURIComponent(f.name); return '<div class="hcard"><div class="hc-l"><div class="hc-f">'+_dd(f.name)+'</div><div class="hc-n">'+_hemEsc(f.name||'')+'</div></div><a class="opb" href="'+url+'" target="_blank" rel="noopener">📄 Abrir</a></div>'; }).join(''); }).join('');
    host.innerHTML='<div class="hem-panel"><div class="hem-desk"><table><thead><tr><th>Semana</th><th>Archivo</th><th style="text-align:right">PDF</th></tr></thead><tbody>'+deskRows+'</tbody></table></div><div class="hem-mob">'+mob+'</div></div><div class="muted" style="font-size:11px;margin-top:6px">'+pdfs.length+' informe(s) · se abren desde GitHub Pages.</div>';
  }).catch(function(){ if(kp)kp.innerHTML=''; host.innerHTML='<div class="muted" style="font-size:13px">No se pudo cargar la lista (sin conexión o límite temporal de la API de GitHub). Reinténtalo en un rato.</div>'; });
}
/* ----- MOVIMIENTOS ----- */
let movTipo='gasto';
var NEGOCIO_SEED=[
 {kw:'repsol',base:'Repsol'},{kw:'cepsa',base:'Cepsa'},{kw:'galp',base:'Galp'},
 {kw:'mercadona',base:'Mercadona'},{kw:'carrefour',base:'Carrefour'},{kw:'lidl',base:'Lidl'},
 {kw:'alcampo',base:'Alcampo'},{kw:'ahorramas',base:'Ahorram\u00e1s'},{kw:'ahorram\u00e1s',base:'Ahorram\u00e1s'},
 {kw:'eroski',base:'Eroski'},{kw:'consum',base:'Consum'},
 {kw:'amazon',base:'Amazon'},{kw:'aliexpress',base:'AliExpress'},{kw:'decathlon',base:'Decathlon'},
 {kw:'ikea',base:'Ikea'},{kw:'leroy',base:'Leroy Merlin'},{kw:'mediamarkt',base:'MediaMarkt'},
 {kw:'corte ingl',base:'El Corte Ingl\u00e9s'}
];
function normTxt(s){ return (s==null?'':s).toString().toLowerCase().trim(); }
function baseComercio(detalle){
  var d=normTxt(detalle); if(!d) return '';
  var al=(DB.config&&DB.config.comercioAlias)||{};
  if(al[d]) return al[d];
  var rules=(DB.config&&DB.config.negocioRules)||[];
  for(var i=0;i<rules.length;i++){ if(rules[i].kw && d.indexOf(rules[i].kw)>=0) return rules[i].base; }
  return '';
}
function aplicarBaseComercio(){ if(typeof pushSnapshot==='function')pushSnapshot('antes de aplicar reglas a movimientos'); (DB.movimientos||[]).forEach(function(m){ var b=baseComercio(m.detalle||m.comercio); if(b) m.comercio=b; }); }
function escAttr(s){ return (s==null?'':s).toString().replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function _sugUniq(arr){ var seen={},out=[]; arr.forEach(function(x){ var v=(x==null?'':x).toString().trim(); var k=v.toLowerCase(); if(v&&!seen[k]){seen[k]=1;out.push(v);} }); return out; }
var SUGSRC={
  movConcepto:function(){ return _sugUniq((DB.movimientos||[]).map(function(m){return m.concepto;})); },
  movComercio:function(){ return _sugUniq((DB.movimientos||[]).map(function(m){return m.comercio;})); },
  movDetalle:function(){ return _sugUniq((DB.movimientos||[]).map(function(m){return m.detalle;})); },
  amaConcepto:function(){ return _sugUniq((DB.amalia||[]).map(function(e){return e.concepto;})); },
  amaNota:function(){ return _sugUniq((DB.amalia||[]).map(function(e){return e.nota;})); }
};
function wireSuggest(inp,key,minChars){
  if(!inp||inp._sugWired)return; inp._sugWired=true; var mn=minChars||5;
  var dl=document.createElement('datalist'); dl.id='dl_'+key+'_'+Math.random().toString(36).slice(2,7);
  document.body.appendChild(dl); inp.setAttribute('autocomplete','off');
  inp.addEventListener('input',function(){
    var v=(inp.value||'').trim().toLowerCase();
    if(v.length<mn){ inp.removeAttribute('list'); dl.innerHTML=''; return; }
    var src=(SUGSRC[key]?SUGSRC[key]():[]);
    var vals=src.filter(function(x){ var lx=x.toLowerCase(); return lx.indexOf(v)>=0 && lx!==v; }).slice(0,15);
    dl.innerHTML=vals.map(function(x){ return '<option value="'+x.replace(/"/g,'&quot;')+'"></option>'; }).join('');
    if(vals.length) inp.setAttribute('list',dl.id); else inp.removeAttribute('list');
  });
}
function wireAllSuggests(){
  wireSuggest(document.getElementById('movConcepto'),'movConcepto');
  wireSuggest(document.getElementById('movDetalle'),'movDetalle',3);
  wireSuggest(document.getElementById('amaConcepto'),'amaConcepto');
  wireSuggest(document.getElementById('amaNota'),'amaNota');
}
function renderMovs(){
  wireAllSuggests();
  renderComDD(); renderComReg(); ensureDetDD(); renderDetDD(); ensureComercioSelect();
  const txt=$('#fltText').value.toLowerCase().trim();
  const desde=$('#fltDesde').value, hasta=$('#fltHasta').value;
  let list=DB.movimientos.slice();
  if(desde) list=list.filter(m=>m.fecha>=desde);
  if(hasta) list=list.filter(m=>m.fecha<=hasta);
  if(movFiltCats.size) list=list.filter(m=>movFiltCats.has(m.categoriaId));
  if(movFiltTits.size) list=list.filter(m=>movFiltTits.has(m.titular));
  if(movFiltCom.size) list=list.filter(m=>movFiltCom.has(m.comercio||''));
  if(movFiltDet.size) list=list.filter(m=>movFiltDet.has((m.detalle||'').trim()));
  if(txt) list=list.filter(m=>((m.concepto||'')+' '+(m.comercio||'')).toLowerCase().includes(txt));
  const ord=($('#fltOrden')||{}).value||'fecha_desc';
  list.sort((a,b)=>{
    if(ord==='fecha_asc') return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0;
    if(ord==='imp_desc') return num(b.importe)-num(a.importe);
    if(ord==='imp_asc') return num(a.importe)-num(b.importe);
    return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:0;
  });
  const _sMov=_sumBudget(list); const ing=_sMov.ing, gas=_sMov.gas;
  const neto=ing-gas;
  $('#movCards').innerHTML=[
    {l:'Ingresos (filtro)',v:fmt(ing),cls:'pos'},
    {l:'Gastos (filtro)',v:fmt(gas),cls:'neg'},
    {l:'Resultado neto',v:fmt(neto),cls:neto>=0?'pos':'neg'}
  ].map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div></div>`).join('');
  $('#movCount').textContent = list.length+' mov.';
  if(!list.length){ $('#movTable').innerHTML='<div class="empty" style="padding:22px;text-align:center;color:#94a3b8">No hay movimientos con los filtros aplicados.</div>'; return; }
  const rows=list.map(m=>{
    const c=catById(m.categoriaId);
    const isIng=m.tipo==='ingreso';
    const eff = (isIng? num(m.importe) : -num(m.importe));
    const signed = (eff>=0?'+':'−')+fmt(Math.abs(eff));
    const concepto=(m.concepto||'').trim(), detalle=(m.detalle||'').trim();
    const main = concepto || detalle || '—';
    const sub = (detalle && detalle.toLowerCase()!==concepto.toLowerCase()) ? detalle : '';
    return `<div class="mv-item${isIng?' ing':''}" data-mvid="${m.id}">
      <div class="mv-h" data-movrow>
        <span class="mv-arw">▶</span>
        <span class="mv-fch">${ddmmyyyy(m.fecha)}</span>
        <span class="mv-main">${_infEsc(main)}${isIng?'<span class="mv-ingb">ingreso</span>':''}${sub?`<small>${_infEsc(sub)}</small>`:''}</span>
        <span class="mv-catw"><span class="tag">${c?_infEsc(c.nombre):'—'}</span></span>
        <span class="mv-imp ${eff>=0?'pos':'neg'}">${signed}</span>
      </div>
      <div class="mv-b">
        <div class="mv-dets">
          <div class="d"><span>Comercio</span>${m.comercio?_infEsc(m.comercio):'—'}</div>
          <div class="d"><span>Titular</span>${_infEsc(m.titular||'—')}</div>
        </div>
        <div class="mv-acts">
          <button class="btn ghost sm" data-edit="${m.id}">✎ Editar</button>
          <button class="btn danger sm" data-del="${m.id}">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join('');
  $('#movTable').innerHTML=rows;
}
function comBases(){ var s={}; (DB.movimientos||[]).forEach(function(m){ var b=(m.comercio||'').trim(); if(b) s[b]=(s[b]||0)+1; }); return Object.keys(s).sort(function(a,b){return s[b]-s[a]||a.localeCompare(b);}).map(function(k){return {name:k,n:s[k]};}); }
function renderComDD(){ var p=$('#comDDpanel'); if(!p)return; var bs=comBases(); var html='<label style="font-weight:700"><input type="checkbox" id="comDDall">Todas / ninguna</label>'; bs.forEach(function(b){ var ck=movFiltCom.has(b.name)?'checked':''; html+='<label><input type="checkbox" class="comCk" value="'+b.name.replace(/"/g,'&quot;')+'" '+ck+'>'+_infEsc(b.name)+' <span class="muted">('+b.n+')</span></label>'; }); p.innerHTML=html; var btn=$('#comDDbtn'); if(btn) btn.textContent='Comercio'+(movFiltCom.size?' ('+movFiltCom.size+')':'')+' \u25be'; }
function comRegItems(){ var s={}; (DB.movimientos||[]).forEach(function(m){ var d=((m.detalle||m.comercio)||'').trim(); if(!d)return; var k=d.toLowerCase(); if(!s[k])s[k]={detalle:d,base:m.comercio||'',n:0}; s[k].n++; }); return Object.keys(s).map(function(k){return s[k];}).sort(function(a,b){ return b.n-a.n || a.detalle.localeCompare(b.detalle); }); }
function renderComReg(){ var body=$('#comRegBody'); if(!body)return; var f=normTxt(($('#comRegFilter')||{}).value||''); var items=comRegItems(); if(f) items=items.filter(function(it){ return it.detalle.toLowerCase().indexOf(f)>=0 || (it.base||'').toLowerCase().indexOf(f)>=0; }); if(!items.length){ body.innerHTML='<div class="muted" style="padding:8px">Sin comercios que coincidan.</div>'; return; } var html='<table style="width:100%;font-size:13px"><thead><tr><th></th><th>Detalle</th><th>Base actual</th><th class="num">N\u00ba</th></tr></thead><tbody>'; items.forEach(function(it){ var same=normTxt(it.base)===normTxt(it.detalle)||!it.base; html+='<tr><td><input type="checkbox" class="comRegCk" data-det="'+it.detalle.replace(/"/g,'&quot;')+'"></td><td>'+_infEsc(it.detalle)+'</td><td>'+(it.base?('<span class="tag">'+_infEsc(it.base)+'</span>'):'<span class="muted">\u2014</span>')+(same?' <span class="muted" title="sin regularizar">\u2022</span>':'')+'</td><td class="num">'+it.n+'</td></tr>'; }); html+='</tbody></table>'; body.innerHTML=html; }
function comRegAsignar(){ var base=(($('#comRegBase')||{}).value||'').trim(); if(!base){ alert('Escribe el negocio base a asignar.'); return; } var cks=$$('#comRegBody .comRegCk:checked'); if(!cks.length){ alert('Selecciona al menos un detalle de la lista.'); return; } DB.config=DB.config||{}; DB.config.comercioAlias=DB.config.comercioAlias||{}; DB.config.negocioRules=DB.config.negocioRules||[]; var sel={}; cks.forEach(function(c){ var d=c.getAttribute('data-det'); sel[normTxt(d)]=1; DB.config.comercioAlias[normTxt(d)]=base; }); var mkRule=(($('#comRegRule')||{}).checked); if(mkRule){ var kw=normTxt(base); if(kw && !DB.config.negocioRules.some(function(r){return r.kw===kw;})) DB.config.negocioRules.push({kw:kw,base:base}); } (DB.movimientos||[]).forEach(function(m){ var d=normTxt(m.detalle||m.comercio); if(sel[d]) m.comercio=base; }); if(mkRule) aplicarBaseComercio(); var bi=$('#comRegBase'); if(bi)bi.value=''; renderMovs(); scheduleSave(); }
function detValues(){ var s={}; (DB.movimientos||[]).forEach(function(m){ var d=(m.detalle||'').trim(); if(d) s[d]=(s[d]||0)+1; }); return Object.keys(s).sort(function(a,b){return s[b]-s[a]||a.localeCompare(b);}).map(function(k){return {name:k,n:s[k]};}); }
function detShown(){ var q=((document.getElementById('detDDsearch')||{}).value||'').trim().toLowerCase(); var all=detValues(); return q?all.filter(function(d){return d.name.toLowerCase().indexOf(q)>=0;}):all.slice(0,30); }
function renderDetDD(){ var list=document.getElementById('detDDlist'); if(!list)return; var q=((document.getElementById('detDDsearch')||{}).value||'').trim().toLowerCase(); var all=detValues(); var shown=detShown().slice(); movFiltDet.forEach(function(nm){ if(!shown.some(function(d){return d.name===nm;})){ var f=all.find(function(d){return d.name===nm;}); shown.unshift(f||{name:nm,n:0}); } }); var html='<label style="font-weight:700"><input type="checkbox" id="detDDall">Todas / ninguna (mostradas)</label>'; if(!q && all.length>30) html+='<div class="muted" style="font-size:10px;margin:2px 0">Mostrando 30 de '+all.length+'. Escribe para buscar.</div>'; shown.forEach(function(d){ var ck=movFiltDet.has(d.name)?'checked':''; html+='<label><input type="checkbox" class="detCk" value="'+escAttr(d.name)+'" '+ck+'>'+_infEsc(d.name)+' <span class="muted">('+d.n+')</span></label>'; }); list.innerHTML=html; var btn=document.getElementById('detDDbtn'); if(btn) btn.textContent='Detalle'+(movFiltDet.size?' ('+movFiltDet.size+')':'')+' ▾'; }
function ensureDetDD(){ if(document.getElementById('detDDbtn'))return; var comBtn=document.getElementById('comDDbtn'); if(!comBtn)return; var comWrap=comBtn.closest('.dd'); if(!comWrap)return; var wrap=document.createElement('div'); wrap.className='dd'; wrap.id='detDDwrap'; wrap.innerHTML='<button type="button" class="btn ghost sm" id="detDDbtn">Detalle ▾</button><div class="dd-panel" id="detDDpanel"><input type="search" id="detDDsearch" placeholder="Escribe para filtrar…" style="width:100%;margin-bottom:6px;padding:4px;border:1px solid var(--line);border-radius:6px"><div id="detDDlist"></div></div>'; comWrap.insertAdjacentElement('afterend',wrap); document.getElementById('detDDbtn').addEventListener('click',function(e){ e.stopPropagation(); document.getElementById('detDDpanel').classList.toggle('open'); renderDetDD(); }); var panel=document.getElementById('detDDpanel'); panel.addEventListener('click',function(e){ e.stopPropagation(); }); document.getElementById('detDDsearch').addEventListener('input',renderDetDD); panel.addEventListener('change',function(e){ if(e.target.id==='detDDall'){ var shown=detShown(); if(e.target.checked){ shown.forEach(function(d){movFiltDet.add(d.name);}); } else { shown.forEach(function(d){movFiltDet.delete(d.name);}); } } else if(e.target.classList.contains('detCk')){ if(e.target.checked)movFiltDet.add(e.target.value); else movFiltDet.delete(e.target.value); } renderMovs(); }); document.addEventListener('click',function(){ var p=document.getElementById('detDDpanel'); if(p)p.classList.remove('open'); }); }
function comercioOptions(){ var s={}; (DB.movimientos||[]).forEach(function(m){ var b=(m.comercio||'').trim(); if(b) s[b]=1; }); ((DB.config&&DB.config.comercios)||[]).forEach(function(b){ b=(b||'').trim(); if(b) s[b]=1; }); return Object.keys(s).sort(function(a,b){return a.localeCompare(b);}); }
function fillComercioSelect(){ var sel=document.getElementById('movComercio'); if(!sel||sel.tagName!=='SELECT')return; var cur=sel.value; var opts=comercioOptions(); sel.innerHTML='<option value="">— sin comercio —</option>'+opts.map(function(b){ return '<option value="'+escAttr(b)+'">'+_infEsc(b)+'</option>'; }).join(''); sel.value=cur; if(sel.value!==cur) sel.value=''; }
function addComercioBase(){ var n=prompt('Nombre del nuevo comercio base (p. ej. Repsol):'); if(n===null)return; var nombre=n.trim(); if(!nombre)return; DB.config=DB.config||{}; DB.config.comercios=DB.config.comercios||[]; var existe=comercioOptions().some(function(b){return b.toLowerCase()===nombre.toLowerCase();}); if(!existe){ DB.config.comercios.push(nombre); if(typeof scheduleSave==='function')scheduleSave(); } fillComercioSelect(); var sel=document.getElementById('movComercio'); if(sel){ var match=comercioOptions().find(function(b){return b.toLowerCase()===nombre.toLowerCase();})||nombre; sel.value=match; } }
function ensureComercioSelect(){ var el=document.getElementById('movComercio'); if(!el)return; if(el.tagName!=='SELECT'){ var sel=document.createElement('select'); sel.id='movComercio'; sel.style.flex='1'; var wrap=document.createElement('span'); wrap.style.display='flex'; wrap.style.gap='6px'; wrap.style.alignItems='center'; el.parentNode.replaceChild(wrap,el); wrap.appendChild(sel); var btn=document.createElement('button'); btn.type='button'; btn.className='btn ghost sm'; btn.id='movComercioAdd'; btn.textContent='＋'; btn.title='Añadir comercio nuevo'; wrap.appendChild(btn); btn.addEventListener('click',addComercioBase); } fillComercioSelect(); }
function editMov(id){
  const m=DB.movimientos.find(x=>x.id===id); if(!m)return;
  $('#movId').value=m.id; $('#movFecha').value=m.fecha; $('#movConcepto').value=m.concepto||'';
  $('#movComercio').value=m.comercio||''; $('#movDetalle').value=m.detalle||''; $('#movCat').value=m.categoriaId; $('#movTitular').value=m.titular||'Dos';
  $('#movImporte').value=m.importe; setMovTipo(m.tipo);
  $('#movSubmit').textContent='Guardar cambios'; $('#movCancel').style.display='inline-block';
  var _b=document.getElementById('blkMovAdd'); if(_b){ _b.classList.add('open'); _b.scrollIntoView({behavior:'smooth',block:'start'}); } else { window.scrollTo({top:0,behavior:'smooth'}); }
}
function resetMovForm(){
  $('#movForm').reset(); $('#movId').value=''; setMovTipo('gasto');
  $('#movFecha').value = curYear+'-'+String(curMonth+1).padStart(2,'0')+'-'+String(Math.min(new Date().getDate(),28)).padStart(2,'0');
  $('#movSubmit').textContent='Añadir'; $('#movCancel').style.display='none';
}
function setMovTipo(t){ movTipo=t; $$('#movTipoSeg button').forEach(b=>b.classList.toggle('on',b.dataset.t===t)); }

/* ----- PRESUPUESTO ----- */
/* ===== PRESUPUESTO v2 · planificador (ingresos + ahorro objetivo → disponible; capítulos y fichas) ===== */
function _presFrecCap(f){ f=(f||'mensual'); return f.charAt(0).toUpperCase()+f.slice(1); }
function _presMesOf(p){ return p?mensual(p):0; }
function _presAhorroObj(y){ DB.config=DB.config||{}; var a=DB.config.ahorroObjetivo||{}; return num(a[y]); }
function _presIcon(g){ var M={'Casa':'🏠','Coche':'🚗','Alimentación':'🛒','Ocio':'🎬','Compras':'🛍️','Deporte':'🏃','Vacaciones':'🏖️','Gastos Varios':'🧾','Software Entretenimiento':'📺','Software Productividad':'💻','Salud':'⚕️','Suministros':'💡'}; return M[g]||'📁'; }
function _presGruposGasto(){
  var set=[]; (DB.categorias||[]).forEach(function(c){ if(c.tipo!=='ingreso' && set.indexOf(c.grupo)<0) set.push(c.grupo); });
  ((DB.config&&DB.config.capitulosExtra)||[]).forEach(function(g){ if(set.indexOf(g)<0) set.push(g); });
  return set;
}
function _presFicha(c,y,income,open){
  var PAGOS=['—','Recibo','Tarjeta','Efectivo','Nómina','Domiciliado'];
  var p=presFor(c.id,y)||{importe:0,frecuencia:'mensual',metodoPago:'',renovacion:''};
  var fr=(p.frecuencia||'mensual'), mes=_presMesOf(p), isOpen=!!open['p:'+c.id], isPer=fr!=='mensual';
  var perLabel=fr==='anual'?'al año':fr==='bianual'?'cada 2 años':'al mes';
  var imp=num(p.importe);
  var anualEq=fr==='anual'?imp:(fr==='bianual'?imp/2:imp*12);
  var divNote=fr==='anual'?'(importe anual ÷ 12)':fr==='bianual'?'(importe ÷ 24)':'';
  var perSub=fr==='anual'?fmt(imp)+'/año':fr==='bianual'?fmt(imp)+' cada 2 años':'';
  var escTag=(!income)?('<span class="par-esc '+(c.esencial?'esc-nec':'esc-pre')+'">'+(c.esencial?'Necesario':'Prescindible')+'</span>'):'';
  var head='<div class="par-h" data-presp="'+c.id+'"><span class="par-arw">▶</span><span class="par-n">'+(c.nombre||'')+'</span>'
    +'<span class="par-frec '+(isPer?'anual':'')+'">'+_presFrecCap(fr)+'</span>'+escTag
    +(!income&&p.metodoPago?'<span class="par-pago">'+p.metodoPago+'</span>':'')
    +'<span class="par-right"><span class="par-mes">'+fmt(mes)+'/mes</span>'+(isPer?'<div class="par-anual">'+perSub+((!income&&p.renovacion)?' · renov '+(''+p.renovacion).split('-').reverse().join('/'):'')+'</div>':'')+'</span></div>';
  if(!isOpen) return '<div class="par">'+head+'</div>';
  var clasif=income?'':'<div class="fld"><label>Clasificación</label><div class="fldseg"><button class="'+(c.esencial?'on':'')+'" data-presesc="'+c.id+'|1">Necesario</button><button class="'+(!c.esencial?'on':'')+'" data-presesc="'+c.id+'|0">Prescindible</button></div></div>'
    +'<div class="fld"><label>Seguir en inflación personal</label><div class="fldseg"><button class="'+(c.seguirInfla?'on':'')+'" data-presinfla="'+c.id+'|1">Sí</button><button class="'+(!c.seguirInfla?'on':'')+'" data-presinfla="'+c.id+'|0">No</button></div></div>';
  var extra=income?'':'<div class="fld"><label>Pago (informativo)</label><select data-prespago="'+c.id+'">'+PAGOS.map(function(x){ var sel=((x===p.metodoPago)||(x==='—'&&!p.metodoPago))?' selected':''; return '<option'+sel+'>'+x+'</option>'; }).join('')+'</select></div>'
    +'<div class="fld"><label>Renovación</label><input type="date" value="'+(p.renovacion||'')+'" data-presrenov="'+c.id+'"></div>';
  var form='<div class="par-form">'
    +'<div class="fld"><label>Frecuencia</label><div class="fldseg">'
      +'<button class="'+(fr==='mensual'?'on':'')+'" data-presfrec="'+c.id+'|mensual">Mensual</button>'
      +'<button class="'+(fr==='anual'?'on':'')+'" data-presfrec="'+c.id+'|anual">Anual</button>'
      +'<button class="'+(fr==='bianual'?'on':'')+'" data-presfrec="'+c.id+'|bianual">Bianual</button></div></div>'
    +'<div class="fld"><label>Cantidad ('+perLabel+')</label><input type="number" step="0.01" value="'+imp+'" data-prescant="'+c.id+'"></div>'
    +clasif+extra
    +'<div class="par-calc"><span class="cc">'+(income?'Suma':'Aporta al presupuesto')+': <b>'+fmt(mes)+'/mes</b> · <b>'+fmt(anualEq)+'/año</b> <span class="muted">'+divNote+'</span></span><span class="par-acts"><button class="btn ghost sm" data-presedit="'+c.id+'">Editar ficha</button><button class="btn danger sm" data-presdel="'+c.id+'">Eliminar</button></span></div>'
    +'</div>';
  return '<div class="par open">'+head+form+'</div>';
}
function renderPres(){
  var host=$('#presBody'); if(!host) return;
  var y=presYear, open=window._presOpen=window._presOpen||{ing:false};
  var t=$('#presTitle'); if(t)t.textContent='Presupuesto '+y;
  // ---- Ingresos ----
  var ingCats=(DB.categorias||[]).filter(function(c){return c.tipo==='ingreso';});
  var ingMes=ingCats.reduce(function(s,c){return s+_presMesOf(presFor(c.id,y));},0), ingAnio=ingMes*12;
  var ingOpen=open.ing!==false;
  var ingLines=ingCats.map(function(c){return _presFicha(c,y,true,open);}).join('')+'<button class="par-add" data-presaddpart="Ingresos">+ Añadir ingreso</button>';
  var ingHTML='<div class="blk '+(ingOpen?'open':'')+'"><div class="blk-h" data-presi="ing"><span class="blk-arw">▶</span><span class="blk-ic">💰</span><div><div class="blk-t">Ingresos previstos</div><div class="blk-sub">'+ingCats.length+' partidas · mete la cifra mensual o la anual</div></div><div class="blk-right"><div class="blk-amount pos">'+fmt(ingAnio)+'</div><div class="blk-mes">'+fmt(ingMes)+'/mes</div></div></div><div class="blk-b">'+ingLines+'</div></div>';
  // ---- Capítulos de gasto + totales ----
  var grupos=_presGruposGasto();
  var gastoMes=0;
  var capData=grupos.map(function(g){ var cats=(DB.categorias||[]).filter(function(c){return c.tipo!=='ingreso'&&c.grupo===g;}); var cm=cats.reduce(function(s,c){return s+_presMesOf(presFor(c.id,y));},0); gastoMes+=cm; return {g:g,cats:cats,cm:cm}; });
  // ---- Planificador ----
  var ahorro=_presAhorroObj(y);
  var dispAnio=ingAnio-ahorro, dispMes=dispAnio/12;
  var gastoAnio=gastoMes*12, restMes=dispMes-gastoMes, restAnio=restMes*12;
  var asignadoPct=dispAnio>0?Math.min(100,gastoAnio/dispAnio*100):0, over=restAnio<-0.5;
  var planHTML='<div class="plan"><div class="plan-row">'
    +'<div class="pcell"><div class="pl">Ingresos previstos</div><div class="pv">'+fmt(ingAnio)+'<small> /año</small></div></div>'
    +'<div class="op">−</div>'
    +'<div class="pcell"><div class="pl">Ahorro objetivo (año)</div><div style="display:flex;align-items:center;gap:6px;margin-top:2px"><input id="presAhorroInp" class="ahorro-inp" value="'+ahorro+'"><span style="font-size:12px;color:#dbeafe">€</span></div></div>'
    +'<div class="op">=</div>'
    +'<div class="pcell"><div class="pl">Disponible para gastar</div><div class="pv">'+fmt(dispAnio)+'<small> /año</small></div></div></div>'
    +'<div class="plan-big"><div class="pb-main"><div class="pb-l">Gasto disponible al mes</div><div class="pb-v">'+fmt(dispMes)+'<small> /mes</small></div>'
    +'<div class="assignbar"><i style="width:'+asignadoPct.toFixed(0)+'%;background:'+(over?'#fecaca':'#fff')+'"></i></div>'
    +'<div style="font-size:11px;color:#dbeafe;margin-top:5px">Asignado en capítulos: '+fmt(gastoMes)+'/mes ('+asignadoPct.toFixed(0)+'%)</div></div>'
    +'<div class="pb-rest"><div class="pb-l">'+(over?'Te has pasado':'Restante por asignar')+'</div><div class="rv" style="color:'+(over?'#fecaca':'#bbf7d0')+'">'+(restMes>=0?'':'−')+fmt(Math.abs(restMes))+'<small style="font-size:12px;color:#dbeafe"> /mes</small></div></div></div></div>';
  var capsHTML=capData.map(function(o){
    var gOpen=!!open[o.g], share=dispMes>0?Math.min(100,o.cm/dispMes*100):0;
    var parts=gOpen?(o.cats.map(function(c){return _presFicha(c,y,false,open);}).join('')+'<button class="par-add" data-presaddpart="'+o.g+'">+ Añadir partida a '+o.g+'</button>'):'';
    return '<div class="blk '+(gOpen?'open':'')+'"><div class="blk-h" data-presg="'+o.g+'"><span class="blk-arw">▶</span><span class="blk-ic">'+_presIcon(o.g)+'</span><div><div class="blk-t">'+o.g+' <button class="blk-edit" data-pressec="'+o.g+'" title="Editar o eliminar capítulo">✎</button></div><div class="blk-sub">'+o.cats.length+' partidas · '+share.toFixed(0)+'% del disponible</div></div><div class="blk-right"><div class="blk-amount">'+fmt(o.cm*12)+'</div><div class="blk-mes">'+fmt(o.cm)+'/mes</div></div></div><div class="blk-barwrap"><div class="blk-bar"><i style="width:'+share.toFixed(0)+'%;background:var(--brand)"></i></div></div><div class="blk-b">'+parts+'</div></div>';
  }).join('');
  host.innerHTML=ingHTML+planHTML+'<div class="subhead">Capítulos de gasto — reparte el disponible</div>'+capsHTML;
  if(typeof renderPresAna==='function')renderPresAna();
}

/* ============ ANÁLISIS DEL PRESUPUESTO · Cumplimiento + Comparativas ============ */
function _anaRealMap(){ var r={}; (DB.movimientos||[]).forEach(function(m){ var f=m.fecha||''; var y=+(''+f).slice(0,4),mo=+(''+f).slice(5,7); if(!y||!mo)return; var cid=m.categoriaId; if(!cid)return; (r[cid]=r[cid]||{}); (r[cid][y]=r[cid][y]||{}); r[cid][y][mo]=(r[cid][y][mo]||0)+num(m.importe); }); return r; }
function _anaYears(){ var s={}; (DB.presupuesto||[]).forEach(function(p){ s[pAnio(p)]=1; }); (DB.movimientos||[]).forEach(function(m){ var y=+(''+(m.fecha||'')).slice(0,4); if(y)s[y]=1; }); return Object.keys(s).map(Number).sort(function(a,b){return a-b;}); }
function _anaPresMes(cid,y){ var p=presFor(cid,y); return p?mensual(p):0; }
function _anaRealFor(R,cid,y,per,curY,curMonth){ var rr=(R[cid]||{})[y]; if(!rr)return 0; var s=0,m; if(per==='year'){for(m=1;m<=12;m++)s+=rr[m]||0;} else if(per==='ytd'){var lim=(y===curY)?curMonth:12;for(m=1;m<=lim;m++)s+=rr[m]||0;} else {s=rr[+per]||0;} return s; }
function _anaMonths(y,per,curY,curMonth){ if(per==='year')return 12; if(per==='ytd')return (y===curY)?curMonth:12; return 1; }
function _anaGruposDe(ing){ var s=[]; (DB.categorias||[]).forEach(function(c){ var isIng=c.tipo==='ingreso'; if(isIng===ing && s.indexOf(c.grupo)<0)s.push(c.grupo); }); return s.sort(); }
function _anaPill(P,G,ing){ if(!P)return ''; var r=G/P; if(ing)return r>=1?'g':r>=0.9?'a':'r'; return r<=1?'g':r<=1.1?'a':'r'; }
function _anaDevCls(d){ return d>=0?'pos':'neg'; }
function _anaSc(l,v,extra){ return '<div class="sc"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(extra?('<div>'+(String(extra).charAt(0)==='<'?extra:'<small>'+extra+'</small>')+'</div>'):'')+'</div>'; }
function _anaBar(pct,ratio){ var w=Math.min(100,pct); var col=!isFinite(ratio)?'#94a3b8':ratio<=1?'#16a34a':ratio<=1.1?'#d97706':'#dc2626'; return '<div class="bar"><i style="width:'+w+'%;background:'+col+'"></i></div>'; }
function _anaCell(label,v,cls){ return '<span class="a-num '+(cls||'')+'">'+v+'</span><div class="mcell"><span>'+label+'</span><b class="'+(cls||'')+'">'+v+'</b></div>'; }
function _anaDcol(v,cls){ return '<span class="a-num '+(cls||'')+'">'+v+'</span>'; }
function _anaKey(sec,g){ return sec+'::'+g; }
function _anaFillYears(id,list,val){ var sel=document.getElementById(id); if(!sel)return; sel.innerHTML=list.map(function(y){return '<option value="'+y+'">'+y+'</option>';}).join(''); sel.value=val; }
function _anaState(){ if(!window._anaSt){ var ys=_anaYears(); var cur=new Date().getFullYear(); var last=ys.length?ys[ys.length-1]:cur; var prev=ys.length>1?ys[ys.length-2]:last; var cy=(ys.indexOf(cur)>=0)?cur:last; window._anaSt={cumpYear:cy,cumpPer:'ytd',cmpA:prev,cmpB:last,cmpiA:prev,cmpiB:last}; } window._anaOpen=window._anaOpen||{}; return window._anaSt; }
function renderPresAna(){
  if(!document.getElementById('presAna'))return;
  var st=_anaState(); var R=_anaRealMap(); var d=new Date(), curY=d.getFullYear(), curMonth=d.getMonth()+1;
  var ys=_anaYears();
  if(!ys.length){ ['cumpBody','cmpBody','cmpiBody'].forEach(function(id){var e=document.getElementById(id); if(e)e.innerHTML='<div class="row"><div class="rh"><span class="nm">Sin datos de presupuesto todavía.</span></div></div>';}); return; }
  ['cumpYear','cmpA','cmpB','cmpiA','cmpiB'].forEach(function(k){ if(ys.indexOf(+st[k])<0) st[k]=ys[ys.length-1]; });
  _anaFillYears('cumpYear',ys,st.cumpYear); var cp=document.getElementById('cumpPer'); if(cp)cp.value=st.cumpPer;
  _anaFillYears('cmpA',ys,st.cmpA); _anaFillYears('cmpB',ys,st.cmpB);
  _anaFillYears('cmpiA',ys,st.cmpiA); _anaFillYears('cmpiB',ys,st.cmpiB);
  _anaCump(R,curY,curMonth); _anaCmp(R,curY,curMonth,false); _anaCmp(R,curY,curMonth,true);
  if(typeof renderInflacionPersonal==='function'){ try{ renderInflacionPersonal(); }catch(e){ var _ib=document.getElementById('inflaBody'); if(_ib)_ib.innerHTML='<div class="row"><div class="rh"><span class="nm">No se pudo calcular la inflación personal.</span></div></div>'; } }
  if(typeof renderSuscripciones==='function'){ try{ renderSuscripciones(); }catch(e){ var _sb=document.getElementById('subsBody'); if(_sb)_sb.innerHTML='<div class="subs-empty">No se pudo calcular el chequeo de suscripciones.</div>'; } }
  if(!renderPresAna._bound){ renderPresAna._bound=true; var host=document.getElementById('view-presupuesto');
    if(host){
      host.addEventListener('click',function(e){
        var sp=e.target.closest('[data-subpaid]'); if(sp){ e.stopPropagation(); _subMarcarPagada(sp.getAttribute('data-subpaid')); renderSuscripciones(); return; }
        var bh=e.target.closest('#presAna [data-anablk]'); if(bh){ var blk=document.getElementById(bh.getAttribute('data-anablk')); if(blk)blk.classList.toggle('open'); return; }
        var gr=e.target.closest('#presAna [data-anagrp]'); if(gr){ var key=gr.getAttribute('data-anagrp'); window._anaOpen=window._anaOpen||{}; window._anaOpen[key]=!window._anaOpen[key]; var grp=gr.closest('.grp'); if(grp)grp.classList.toggle('open'); return; }
      });
      host.addEventListener('change',function(e){ var t=e.target; if(!t||!t.id)return; var F={cumpYear:1,cumpPer:1,cmpA:1,cmpB:1,cmpiA:1,cmpiB:1}; if(F[t.id]){ window._anaSt=window._anaSt||{}; window._anaSt[t.id]=(t.id==='cumpPer')?t.value:(+t.value); renderPresAna(); } });
    }
  }
}
/* ===== D4 · Inflación personal (bloque en Análisis del presupuesto) =====
   Seguimiento año a año del PRESUPUESTO de las categorías que el usuario marca
   (casilla "Seguir en inflación"), más dos sondas de precio con datos reales:
   gasolina €/L (Mazinger Z) y consumición media Bar/Restaurante (ticket medio). */
var _INFLA_DEFAULT=['Alimentación','Comunidad','Luz','Seguro Casa','IBI / Tasa Basuras','Pepephone','Movistar','Alarma Ring'];
function renderInflacionPersonal(){
  var el=document.getElementById('inflaBody'); if(!el)return;
  var cats=DB.categorias||[], movs=DB.movimientos||[], pr=DB.presupuesto||[]; var cm={}; cats.forEach(function(c){cm[c.id]=c;});
  var MES=['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var eur0=function(v){return Math.round(v).toLocaleString('es-ES')+' €';};
  var eur=function(v){return v.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';};
  var pctS=function(p){return (p>=0?'+':'')+p.toFixed(1)+'%';};
  var cls=function(p){return p>0.5?'up':(p<-0.5?'dn':'');};
  function anual(p){ return (typeof mensual==='function'?mensual(p):num(p.importe))*12; }
  // --- categorías seguidas ---
  var anyFlag=cats.some(function(c){return c.tipo!=='ingreso'&&c.seguirInfla===true;});
  var tracked=cats.filter(function(c){return c.tipo!=='ingreso' && (anyFlag? c.seguirInfla===true : _INFLA_DEFAULT.indexOf(c.nombre)>=0);});
  // --- GASTO REAL: media mensual de cada año (total del año ÷ sus meses con datos) ---
  function _y(m){return (''+(m.fecha||'')).slice(0,4);} function _mo(m){return +(''+(m.fecha||'')).slice(5,7);}
  var mByY={}; movs.forEach(function(m){ if(m.tipo!=='gasto')return; var y=_y(m),mo=_mo(m); if(!y||!mo)return; (mByY[y]=mByY[y]||{})[mo]=1; });
  var yYears=Object.keys(mByY).map(Number).sort(function(a,b){return a-b;});
  var nMonY={}; yYears.forEach(function(y){ nMonY[y]=Object.keys(mByY[y]).length||12; });
  if(tracked.length===0 || yYears.length<2){ el.innerHTML='<div class="infla-empty">Marca categorías con la casilla <b>«Seguir en inflación»</b> (en cada partida del presupuesto) y ten al menos dos años de movimientos. Años disponibles: '+(yYears.join(', ')||'ninguno')+'.</div>'; var _h=document.getElementById('inflaHeadD'); if(_h){_h.textContent='—';_h.className='blk-amount';} return; }
  var curY=yYears[yYears.length-1], prevY=yYears[yYears.length-2]; var extraYears=[];
  // gasto real por categoría/año
  var cb2={}; movs.forEach(function(m){ if(m.tipo!=='gasto')return; var cid=m.categoriaId; var y=+_y(m); if(!cid||!y)return; cb2[cid]=cb2[cid]||{}; cb2[cid][y]=(cb2[cid][y]||0)+Math.abs(num(m.importe)); });
  function catY(cid,y){ return ((cb2[cid]&&cb2[cid][y])||0)/(nMonY[y]||12); } // media mensual real del año
  // agrupar por capítulo
  var grupos=[]; var gmap={}; tracked.forEach(function(c){ if(!gmap[c.grupo]){gmap[c.grupo]={g:c.grupo,cats:[]}; grupos.push(gmap[c.grupo]);} gmap[c.grupo].cats.push(c); });
  grupos.sort(function(a,b){return a.g<b.g?-1:1;});
  var GT={}; [prevY,curY].concat(extraYears).forEach(function(y){GT[y]=0;});
  var aliD=null, gInfo={};
  var body='';
  grupos.forEach(function(G){
    var gt={}; [prevY,curY].concat(extraYears).forEach(function(y){gt[y]=0;});
    G.cats.sort(function(a,b){return catY(b.id,curY)-catY(a.id,curY);});
    var rows=G.cats.map(function(c){ var a=catY(c.id,prevY), b=catY(c.id,curY), d=a?(b/a-1)*100:0; [prevY,curY].concat(extraYears).forEach(function(y){gt[y]+=catY(c.id,y);}); if(c.nombre==='Alimentación')aliD={a:a,b:b,d:d};
      return '<tr><td class="nm sub">'+c.nombre+'</td><td class="num">'+eur0(a)+'</td><td class="num">'+eur0(b)+'</td>'+extraYears.map(function(y){return '<td class="num fut">'+eur0(catY(c.id,y))+'</td>';}).join('')+'<td class="num '+cls(d)+'">'+(a?pctS(d):'—')+'</td></tr>'; }).join('');
    var gd=gt[prevY]?(gt[curY]/gt[prevY]-1)*100:0; [prevY,curY].concat(extraYears).forEach(function(y){GT[y]+=gt[y];});
    gInfo[G.g]={a:gt[prevY],b:gt[curY],d:gd};
    if(G.cats.length>1){
      body+='<tr class="grp"><td class="nm">'+G.g+' <small>(suma)</small></td><td class="num">'+eur0(gt[prevY])+'</td><td class="num">'+eur0(gt[curY])+'</td>'+extraYears.map(function(y){return '<td class="num fut">'+eur0(gt[y])+'</td>';}).join('')+'<td class="num '+cls(gd)+'">'+(gt[prevY]?pctS(gd):'—')+'</td></tr>'+rows;
    } else {
      var c=G.cats[0], a=catY(c.id,prevY), b=catY(c.id,curY), d=a?(b/a-1)*100:0;
      body+='<tr><td class="nm">'+c.nombre+'</td><td class="num">'+eur0(a)+'</td><td class="num">'+eur0(b)+'</td>'+extraYears.map(function(y){return '<td class="num fut">'+eur0(catY(c.id,y))+'</td>';}).join('')+'<td class="num '+cls(d)+'">'+(a?pctS(d):'—')+'</td></tr>';
    }
  });
  var GTd=GT[prevY]?(GT[curY]/GT[prevY]-1)*100:0;
  // grupo fijo del hogar para KPI (el mayor grupo con >1 categoría, típicamente "Casa")
  var homeG=null; grupos.forEach(function(G){ if(G.cats.length>1 && (!homeG||G.cats.length>gmap[homeG].cats.length))homeG=G.g; });
  var totRow='<tr class="tot"><td class="nm">TOTAL seguido</td><td class="num">'+eur0(GT[prevY])+'</td><td class="num">'+eur0(GT[curY])+'</td>'+extraYears.map(function(y){return '<td class="num fut">'+eur0(GT[y])+'</td>';}).join('')+'<td class="num '+cls(GTd)+'">'+pctS(GTd)+'</td></tr>';
  var thead='<tr><th>Capítulo / categoría</th><th>'+prevY+'</th><th>'+curY+'</th>'+extraYears.map(function(y){return '<th>'+y+'</th>';}).join('')+'<th>Δ '+prevY+'→'+curY+'</th></tr>';
  var mainTbl='<table class="infla-tbl infla-seg"><thead>'+thead+'</thead><tbody>'+body+totRow+'</tbody></table>';
  if(!aliD)aliD={a:0,b:0,d:0};
  // --- sondas con datos reales ---
  function yOf(m){return (''+(m.fecha||'')).slice(0,4);} function moOf(m){return +(''+(m.fecha||'')).slice(5,7);}
  var myset={}; movs.forEach(function(m){var y=yOf(m); if(y)myset[y]=1;}); var myrs=Object.keys(myset).map(Number).sort(function(a,b){return a-b;});
  var mcur=myrs.length?myrs[myrs.length-1]:curY, mprev=myrs.length>1?myrs[myrs.length-2]:mcur-1;
  var mos={}; movs.forEach(function(m){ if(yOf(m)==(''+mcur)){var mo=moOf(m); if(mo)mos[mo]=1;}}); var mk=Object.keys(mos).map(Number); var minMo=mk.length?Math.min.apply(null,mk):1, maxMo=mk.length?Math.max.apply(null,mk):12;
  // gasolina €/L
  var cbu=(DB.combustible||[]).filter(function(r){return num(r.litros)>0&&num(r.precio)>0;});
  var fy={}; cbu.forEach(function(r){var y=(''+r.fecha).slice(0,4); (fy[y]=fy[y]||[]).push(num(r._eurL)||num(r.precio)/num(r.litros));});
  function avg(a){return a&&a.length?a.reduce(function(s,x){return s+x;},0)/a.length:0;}
  var fyrs=Object.keys(fy).map(Number).sort(function(a,b){return a-b;});
  var fCur=fyrs.length?fyrs[fyrs.length-1]:0, fPrev=fyrs.length>1?fyrs[fyrs.length-2]:0;
  var fu25=fPrev?avg(fy[''+fPrev]):0, fu26=fCur?avg(fy[''+fCur]):0, fuD=fu25?(fu26/fu25-1)*100:0;
  var hasFuel=fu25>0&&fu26>0;
  // consumición Bar/Restaurante
  var CONSUMO=/bar|restaurante|cafeter|pasteler|helader|panader/i;
  var byCo={}; movs.forEach(function(m){var c=cm[m.categoriaId]; if(!c||c.tipo!=='gasto')return; var y=yOf(m),mo=moOf(m); if(mo<minMo||mo>maxMo)return; if(y!=(''+mcur)&&y!=(''+mprev))return; var co=(m.comercio||'').trim(); if(!CONSUMO.test(co))return; byCo[co]=byCo[co]||{an:0,as:0,bn:0,bs:0}; if(y==(''+mprev)){byCo[co].an++;byCo[co].as+=Math.abs(num(m.importe));} else {byCo[co].bn++;byCo[co].bs+=Math.abs(num(m.importe));}});
  var coRows=Object.keys(byCo).map(function(k){var d=byCo[k]; var t25=d.an?d.as/d.an:0,t26=d.bn?d.bs/d.bn:0; return {k:k,n25:d.an,n26:d.bn,tk25:t25,tk26:t26,dtk:t25&&t26?(t26/t25-1)*100:0,vol:d.as+d.bs};}).filter(function(r){return r.n25>=8&&r.n26>=6;}).sort(function(a,b){return b.vol-a.vol;});
  var star=null; coRows.forEach(function(r){if(r.k==='Bar/Restaurante')star=r;}); if(!star)star=coRows[0]||{tk25:0,tk26:0,dtk:0,n25:0,n26:0};
  // --- KPIs ---
  var hg=homeG?gInfo[homeG]:null;
  var kpis='<div class="infla-kpis">'
    +'<div class="ik hero"><div class="l">📊 Tu inflación personal</div><div class="v '+cls(GTd)+'">'+pctS(GTd)+'</div><div class="p">gasto real medio '+prevY+'→'+curY+': '+eur0(GT[prevY])+' → '+eur0(GT[curY])+'/mes</div></div>'
    +'<div class="ik"><div class="l">🛒 Alimentación</div><div class="v '+cls(aliD.d)+'">'+pctS(aliD.d)+'</div><div class="p">'+eur0(aliD.a)+' → '+eur0(aliD.b)+'/mes</div></div>'
    +(hg?'<div class="ik"><div class="l">🏠 '+homeG+' (fijos)</div><div class="v '+cls(hg.d)+'">'+pctS(hg.d)+'</div><div class="p">'+eur0(hg.a)+' → '+eur0(hg.b)+'/mes</div></div>':'')
    +(hasFuel?'<div class="ik"><div class="l">⛽ Gasolina €/L</div><div class="v '+cls(fuD)+'">'+fu25.toFixed(3).replace('.',',')+'→'+fu26.toFixed(3).replace('.',',')+'</div><div class="p">'+pctS(fuD)+' · precio real ('+fPrev+'→'+fCur+')</div></div>':'')
    +'</div>';
  // --- sondas HTML ---
  var probes='';
  if(hasFuel||coRows.length){
    probes='<div class="infla-sec"><div class="infla-h">🔎 Sondas de precio con datos reales <small>de tus movimientos</small></div>';
    probes+='<div class="infla-intro">Complementan el presupuesto con <b>precio real</b>: la gasolina por €/litro (cantidad conocida) y la consumición media de los locales <b>homogéneos y con volumen</b> (bar, pastelería…), que la app selecciona sola. Ventana '+MES[minMo]+'–'+MES[maxMo]+'.</div>';
    probes+='<table class="infla-tbl"><thead><tr><th>Sonda</th><th>Tickets</th><th>'+mprev+'</th><th>'+mcur+'</th><th>Δ</th></tr></thead><tbody>';
    if(hasFuel)probes+='<tr><td class="nm">Gasolina €/L <span class="rel ok">precio directo</span></td><td class="num">'+((fy[''+fPrev]||[]).length)+' / '+((fy[''+fCur]||[]).length)+'</td><td class="num">'+fu25.toFixed(3).replace('.',',')+' €</td><td class="num">'+fu26.toFixed(3).replace('.',',')+' €</td><td class="num '+cls(fuD)+'">'+pctS(fuD)+'</td></tr>';
    coRows.forEach(function(r){ probes+='<tr><td class="nm">'+r.k+' <span class="rel">indicativo</span></td><td class="num">'+r.n25+' / '+r.n26+'</td><td class="num">'+eur(r.tk25)+'</td><td class="num">'+eur(r.tk26)+'</td><td class="num '+cls(r.dtk)+'">'+pctS(r.dtk)+'</td></tr>'; });
    probes+='</tbody></table></div>';
  }
  // nota histórica 2019 (referencia manual de Carlos)
  var A2019=450, H2019=490; var _cmpl=(nMonY[curY]||0)>=12; var aYr=_cmpl?curY:prevY; var aliNow=_cmpl?aliD.b:aliD.a, homeNow=hg?(_cmpl?hg.b:hg.a):0;
  var anchor='<div class="infla-anchor">📜 <b>Referencia 2019:</b> Alimentación <b>450 €/mes</b> → en '+aYr+' ~'+eur0(aliNow)+'/mes ('+pctS(aliNow?(aliNow/A2019-1)*100:0)+')'+(homeNow?'; Hogar <b>490 €/mes</b> → en '+aYr+' ~'+eur0(homeNow)+'/mes ('+pctS((homeNow/H2019-1)*100)+')':'')+'. La <b>lista de la compra</b> ha subido bastante más que los <b>gastos del hogar</b>. <span style="color:#7c6f9c">('+aYr+' es el último año completo.)</span></div>';
  el.innerHTML=kpis
    +'<div class="infla-sec"><div class="infla-h">📈 Seguimiento año a año <small>gasto real medio mensual de cada año (€/mes)</small></div>'
    +'<div class="infla-intro">El <b>gasto real medio al mes</b> de cada categoría, año contra año — el total gastado en el año ÷ sus meses ('+prevY+' completo; '+curY+' con '+(nMonY[curY]||12)+' meses hasta la fecha). Te sirve para ver cómo sube de verdad tu coste de vida y <b>presupuestar el año que viene</b>. '+(anyFlag?'Sigues '+tracked.length+' categorías; cámbialas con la casilla «Seguir en inflación».':'Mostrando una selección por defecto — marca la casilla «Seguir en inflación» en las partidas para personalizarla.')+'</div>'
    +mainTbl+anchor+'</div>'
    +probes
    +'<div class="infla-hyp">⚠️ Usa <b>gasto real</b>: cada año es su media mensual (total ÷ meses con datos), así '+curY+' (aún incompleto) se compara en €/mes con '+prevY+'. Ojo: los pagos anuales (seguros, IBI) caen en un mes suelto, así que en el corto plazo pueden distorsionar su media; se estabiliza al cerrar el año. Descartado como señal de precio el ticket de Supermercado/Compras. Orientativo.</div>';
  var hd=document.getElementById('inflaHeadD'); if(hd){ hd.textContent=pctS(GTd); hd.className='blk-amount '+(GTd>0.5?'neg':GTd<-0.5?'pos':''); }
}
/* ===== P2 · Chequeo de suscripciones (todas, con fecha de renovación; roja=vencida, verde=al día) ===== */
var _SUBS_RX=/Software|Deporte|Streaming|Suscrip/i, _SUBS_NAMES=['Amazon Prime','Audible','YouTube Premium','Netflix','Spotify','HBO Max','Disney+','Movistar Plus'], _SUBS_EXCL=['Gimnasio'];
function _subPartida(cid){ var cands=(DB.presupuesto||[]).filter(function(q){return q.categoriaId===cid;}); if(!cands.length)return null; var withR=cands.filter(function(q){return q.renovacion;}); if(withR.length)return withR.sort(function(a,b){return (''+b.renovacion).localeCompare(''+a.renovacion);})[0]; return cands.sort(function(a,b){return pAnio(b)-pAnio(a);})[0]; }
function _subsList(){
  var pr=DB.presupuesto||[]; var today=new Date(); today.setHours(0,0,0,0); var seen={}, out=[];
  pr.forEach(function(p){ var c=catById(p.categoriaId); if(!c||c.tipo!=='gasto')return; if(_SUBS_EXCL.indexOf(c.nombre)>=0)return; if(!(_SUBS_RX.test(c.grupo)||_SUBS_NAMES.indexOf(c.nombre)>=0))return; if(seen[c.id])return; seen[c.id]=1;
    var use=_subPartida(c.id); if(!use)return;
    var anual=(typeof mensual==='function'?mensual(use):num(use.importe))*12;
    var renov=use.renovacion||null; var rd=renov?new Date(renov+'T00:00:00'):null; var dias=rd?Math.round((rd-today)/86400000):null;
    var estado=renov?(dias<0?'venc':'ok'):'nofecha';
    out.push({cid:c.id,nombre:c.nombre,grupo:c.grupo,anual:anual,renov:renov,dias:dias,estado:estado});
  });
  out.sort(function(a,b){ var o={venc:0,ok:1,nofecha:2}; if(o[a.estado]!==o[b.estado])return o[a.estado]-o[b.estado]; if(a.renov&&b.renov)return (''+a.renov).localeCompare(''+b.renov); return b.anual-a.anual; });
  return out;
}
function _subMarcarPagada(cid){
  var p=_subPartida(cid); if(!p||!p.renovacion)return;
  var f=(p.frecuencia||'').toLowerCase(); var stepM=f==='mensual'?1:(f==='bianual'?24:12);
  var d=new Date(p.renovacion+'T00:00:00'); var today=new Date(); today.setHours(0,0,0,0); var g=0;
  do{ d.setMonth(d.getMonth()+stepM); g++; }while(d<=today&&g<600);
  p.renovacion=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(typeof scheduleSave==='function')scheduleSave();
}
function renderSuscripciones(){
  var el=document.getElementById('subsBody'); if(!el)return;
  var list=_subsList(); var eur0=function(v){return Math.round(v).toLocaleString('es-ES')+' €';};
  var venc=list.filter(function(s){return s.estado==='venc';}).length;
  var head=document.getElementById('subsHeadD'); if(head){ head.textContent=venc?String(venc):'✓'; head.className='blk-amount '+(venc?'neg':'pos'); }
  if(!list.length){ el.innerHTML='<div class="subs-empty">No tienes suscripciones registradas (grupos Software/Deporte/streaming con partida en el presupuesto).</div>'; return; }
  var html='<div class="subs-intro">Todas tus suscripciones con su <b>fecha de renovación</b>. En <b style="color:#dc2626">rojo</b> las <b>vencidas</b> (toca pagar); cuando pagues pulsa <b>Marcar pagada</b> y avanzan al siguiente ciclo, quedando en <b style="color:#16a34a">verde</b>. Las sin fecha, ponles una en su partida del presupuesto.</div>';
  html+=list.map(function(s){
    var cl=s.estado==='venc'?'r':(s.estado==='ok'?'g':'done'); var ic=s.estado==='venc'?'🔴':(s.estado==='ok'?'🟢':'⚪');
    var fecha=s.renov?s.renov.split('-').reverse().join('/'):'sin fecha';
    var est=s.estado==='venc'?('Vencida hace '+(-s.dias)+' día'+(-s.dias===1?'':'s')):(s.estado==='ok'?('Próxima'+(s.dias<=45?' en '+s.dias+' d':'')):'Sin fecha de renovación');
    var right=s.estado==='venc'?'<button class="subs-btn" data-subpaid="'+s.cid+'">✓ Marcar pagada</button>':(s.estado==='ok'?'<span class="subs-tag g">al día</span>':'<span class="subs-tag">—</span>');
    return '<div class="subs-al '+cl+'"><span class="ai">'+ic+'</span><div class="ab"><b>'+s.nombre+'</b> <span class="ag">'+s.grupo+'</span><div class="at">'+est+' · renov. '+fecha+'</div></div><div class="ar"><span class="av">'+eur0(s.anual)+'/año</span>'+right+'</div></div>';
  }).join('');
  el.innerHTML=html;
}
function _anaCumpGroups(R,ing,y,per,mf,curY,curMonth){
  return _anaGruposDe(ing).map(function(g){
    var cs=(DB.categorias||[]).filter(function(c){return (c.tipo==='ingreso')===ing && c.grupo===g;});
    var parts=cs.map(function(c){var P=_anaPresMes(c.id,y)*mf,G=_anaRealFor(R,c.id,y,per,curY,curMonth);return {c:c,P:P,G:G};}).filter(function(p){return p.P||p.G;});
    var P=0,G=0; parts.forEach(function(p){P+=p.P;G+=p.G;});
    return {g:g,parts:parts,P:P,G:G};
  }).filter(function(o){return o.P||o.G;});
}
function _anaCumpGrpHtml(o,ing){
  var key=_anaKey(ing?'ci':'cg',o.g), isOpen=!!window._anaOpen[key];
  var p=o.P?Math.round(o.G/o.P*100):0, cls=_anaPill(o.P,o.G,ing);
  var dv=ing?(o.G-o.P):(o.P-o.G), lblB=ing?'Recibido':'Gastado';
  var parts=o.parts.map(function(pt){var pp=pt.P?Math.round(pt.G/pt.P*100):0,pc=_anaPill(pt.P,pt.G,ing);var pdv=ing?(pt.G-pt.P):(pt.P-pt.G);
    var tag=ing?'':(pt.c.esencial?'<span class="tag nec">Nec</span>':'<span class="tag pre">Pre</span>');
    return '<div class="row part"><div class="rh"><span class="nm">'+_infEsc(pt.c.nombre)+' '+tag+'</span>'+
      _anaCell('Previsto',fmt(pt.P))+_anaCell(lblB,fmt(pt.G))+_anaCell('Desv.',(pdv>=0?'+':'−')+fmt(Math.abs(pdv)),_anaDevCls(pdv))+
      '<span class="a-num">'+(pt.P?'<span class="pill '+pc+'">'+pp+'%</span>':'—')+'</span>'+
      '<div class="mcell"><span>Acierto</span>'+(pt.P?'<span class="pill '+pc+'">'+pp+'%</span>':'—')+'</div></div></div>';}).join('');
  return '<div class="row grp'+(isOpen?' open':'')+'"><div class="rh" data-anagrp="'+key+'"><span class="nm"><span class="arw">▶</span>'+_infEsc(o.g)+'</span>'+
    _anaCell('Previsto',fmt(o.P))+_anaCell(lblB,fmt(o.G))+_anaCell('Desv.',(dv>=0?'+':'−')+fmt(Math.abs(dv)),_anaDevCls(dv))+
    '<span class="a-num">'+(o.P?'<span class="pill '+cls+'">'+p+'%</span>':'—')+'</span>'+
    '<div class="mcell"><span>Acierto</span>'+(o.P?'<span class="pill '+cls+'">'+p+'%</span>':'—')+'</div>'+
    '</div><div class="parts">'+parts+'</div></div>';
}
function _anaCump(R,curY,curMonth){
  var st=window._anaSt, y=+st.cumpYear, per=st.cumpPer, mf=_anaMonths(y,per,curY,curMonth);
  var ing=_anaCumpGroups(R,true,y,per,mf,curY,curMonth), gas=_anaCumpGroups(R,false,y,per,mf,curY,curMonth);
  var iP=0,iG=0; ing.forEach(function(o){iP+=o.P;iG+=o.G;});
  var gP=0,gG=0; gas.forEach(function(o){gP+=o.P;gG+=o.G;});
  var pct=gP?Math.round(gG/gP*100):0, dev=gP-gG, iAci=iP?Math.round(iG/iP*100):0, iDev=iG-iP;
  var head=document.getElementById('cumpHeadPct'); head.textContent=gP?pct+'%':'—'; head.className='blk-amount '+(gP?(gG/gP<=1?'pos':gG/gP<=1.1?'warnc':'neg'):'');
  document.getElementById('cumpSum').innerHTML=
    _anaSc('Ingresos',fmt(iG)+' de '+fmt(iP),'acierto '+(iP?iAci+'%':'—')+(iDev>=0?' · +'+fmt(iDev):' · −'+fmt(Math.abs(iDev))))+
    _anaSc('Gastado real',fmt(gG)+' de '+fmt(gP),pct+'% del presupuesto')+
    _anaSc(dev>=0?'Te sobran':'Te has pasado',(dev>=0?'':'−')+fmt(Math.abs(dev))+' €',_anaBar(pct,gP?gG/gP:NaN));
  var totIng='<div class="tot"><span>TOTAL INGRESOS</span>'+_anaCell('Previsto',fmt(iP))+_anaCell('Recibido',fmt(iG))+_anaCell('Desv.',(iDev>=0?'+':'−')+fmt(Math.abs(iDev)),_anaDevCls(iDev))+'<span class="a-num">'+(iP?iAci+'%':'—')+'</span><div class="mcell"><span>Acierto</span><b>'+(iP?iAci+'%':'—')+'</b></div></div>';
  var totGas='<div class="tot"><span>TOTAL GASTOS</span>'+_anaCell('Presup.',fmt(gP))+_anaCell('Gastado',fmt(gG))+_anaCell('Desv.',(dev>=0?'+':'−')+fmt(Math.abs(dev)),_anaDevCls(dev))+'<span class="a-num">'+(gP?pct+'%':'—')+'</span><div class="mcell"><span>%</span><b>'+(gP?pct+'%':'—')+'</b></div></div>';
  document.getElementById('cumpBody').innerHTML=
    (ing.length?('<div class="minihd">💰 Ingresos previstos vs recibidos</div>'+ing.map(function(o){return _anaCumpGrpHtml(o,true);}).join('')+totIng):'')+
    '<div class="minihd">🧾 Gastos presupuestados vs gastados</div>'+gas.map(function(o){return _anaCumpGrpHtml(o,false);}).join('')+totGas;
}
function _anaMetrics(R,cid,y,curY,curMonth){ return {p:_anaPresMes(cid,y)*12, g:_anaRealFor(R,cid,y,'year',curY,curMonth)}; }
function _anaCmp(R,curY,curMonth,ing){
  var st=window._anaSt, A=ing?+st.cmpiA:+st.cmpA, B=ing?+st.cmpiB:+st.cmpB;
  var lblB=ing?'Recib.':'Gasto', pref=ing?'ci':'cc';
  var dv=function(o){return ing?(o.g-o.p):(o.p-o.g);};
  var TA={p:0,g:0},TB={p:0,g:0};
  var groups=_anaGruposDe(ing).map(function(g){
    var cs=(DB.categorias||[]).filter(function(c){return (c.tipo==='ingreso')===ing && c.grupo===g;});
    var parts=cs.map(function(c){return {c:c,a:_anaMetrics(R,c.id,A,curY,curMonth),b:_anaMetrics(R,c.id,B,curY,curMonth)};}).filter(function(p){return p.a.p||p.b.p||p.a.g||p.b.g;});
    var a={p:0,g:0},b={p:0,g:0}; parts.forEach(function(p){a.p+=p.a.p;a.g+=p.a.g;b.p+=p.b.p;b.g+=p.b.g;});
    TA.p+=a.p;TA.g+=a.g;TB.p+=b.p;TB.g+=b.g; return {g:g,parts:parts,a:a,b:b};
  }).filter(function(o){return o.a.p||o.b.p||o.a.g||o.b.g;});
  var dP=TB.p-TA.p, pcP=TA.p?Math.round((TB.p/TA.p-1)*100):0;
  var headD=document.getElementById(ing?'cmpiHeadD':'cmpHeadD'); headD.textContent=(dP>=0?'+':'−')+fmt(Math.abs(dP))+' €'; headD.className='blk-amount neu';
  document.getElementById(ing?'cmpiHead2':'cmpHead2').innerHTML='<span>Sección / partida</span><span class="ya">'+(ing?'Ingresos ':'Presupuesto ')+A+'</span><span class="yb">'+(ing?'Ingresos ':'Presupuesto ')+B+'</span><span>Δ Previsto</span>';
  document.getElementById(ing?'cmpiHead':'cmpHead').innerHTML='<span></span><span>Previsto</span><span>'+lblB+'</span><span>Desv.</span><span>Previsto</span><span>'+lblB+'</span><span>Desv.</span><span>B−A</span>';
  document.getElementById(ing?'cmpiSum':'cmpSum').innerHTML=
    _anaSc('Previsto',fmt(TA.p)+' → '+fmt(TB.p),'año '+A+' vs '+B)+
    _anaSc(ing?'Recibido real':'Gastado real',fmt(TA.g)+' → '+fmt(TB.g),'lo '+(ing?'recibido':'ejecutado')+' cada año')+
    _anaSc('Variación del previsto',(dP>=0?'+':'−')+fmt(Math.abs(dP))+' €',(pcP>=0?'+':'')+pcP+'% respecto a '+A);
  var rowFor=function(nm,a,b,isGrp,key){
    var dp=b.p-a.p, pc=a.p?Math.round((b.p/a.p-1)*100):0, da=dv(a), db=dv(b);
    var arw=isGrp?'<span class="arw">▶</span>':'';
    var deskA=_anaDcol(fmt(a.p))+_anaDcol(fmt(a.g))+_anaDcol((da>=0?'+':'−')+fmt(Math.abs(da)),_anaDevCls(da));
    var deskB=_anaDcol(fmt(b.p))+_anaDcol(fmt(b.g))+_anaDcol((db>=0?'+':'−')+fmt(Math.abs(db)),_anaDevCls(db));
    var deskD=_anaDcol((dp>=0?'+':'−')+fmt(Math.abs(dp))+(isGrp&&a.p?' ('+(pc>=0?'+':'')+pc+'%)':''),'neu');
    var mob='<div class="mcmp">'+
      '<div class="mcrow"><span>'+A+'</span><b>Prev '+fmt(a.p)+' · '+lblB+' '+fmt(a.g)+' · <span class="'+_anaDevCls(da)+'">Desv '+(da>=0?'+':'−')+fmt(Math.abs(da))+'</span></b></div>'+
      '<div class="mcrow"><span>'+B+'</span><b>Prev '+fmt(b.p)+' · '+lblB+' '+fmt(b.g)+' · <span class="'+_anaDevCls(db)+'">Desv '+(db>=0?'+':'−')+fmt(Math.abs(db))+'</span></b></div>'+
      '<div class="mcrow"><span>Δ Previsto</span><b class="neu">'+(dp>=0?'+':'−')+fmt(Math.abs(dp))+(a.p?' ('+(pc>=0?'+':'')+pc+'%)':'')+'</b></div></div>';
    return '<div class="rh"'+(isGrp?(' data-anagrp="'+key+'"'):'')+'><span class="nm">'+arw+_infEsc(nm)+'</span>'+deskA+deskB+deskD+mob+'</div>';
  };
  var dTA=dv(TA),dTB=dv(TB);
  document.getElementById(ing?'cmpiBody':'cmpBody').innerHTML=groups.map(function(o){
    var key=_anaKey(pref,o.g), isOpen=!!window._anaOpen[key];
    var parts=o.parts.map(function(pt){return '<div class="row part">'+rowFor(pt.c.nombre,pt.a,pt.b,false)+'</div>';}).join('');
    return '<div class="row grp'+(isOpen?' open':'')+'">'+rowFor(o.g,o.a,o.b,true,key)+'<div class="parts">'+parts+'</div></div>';
  }).join('')+
    '<div class="tot"><span>TOTAL</span>'+_anaDcol(fmt(TA.p))+_anaDcol(fmt(TA.g))+_anaDcol((dTA>=0?'+':'−')+fmt(Math.abs(dTA)),_anaDevCls(dTA))+_anaDcol(fmt(TB.p))+_anaDcol(fmt(TB.g))+_anaDcol((dTB>=0?'+':'−')+fmt(Math.abs(dTB)),_anaDevCls(dTB))+_anaDcol((dP>=0?'+':'−')+fmt(Math.abs(dP)),'neu')+
    '<div class="mcmp"><div class="mcrow"><span>'+A+'</span><b>Prev '+fmt(TA.p)+' · '+lblB+' '+fmt(TA.g)+'</b></div><div class="mcrow"><span>'+B+'</span><b>Prev '+fmt(TB.p)+' · '+lblB+' '+fmt(TB.g)+'</b></div><div class="mcrow"><span>Δ Previsto</span><b class="neu">'+(dP>=0?'+':'−')+fmt(Math.abs(dP))+'</b></div></div></div>';
}

/* ----- PRESUPUESTO · DESGLOSE MENSUAL (réplica hoja anual del Excel) ----- */
/* Cada concepto = 2 filas: Pres. (presupuestado) y Real (ejecutado). 15 columnas:
   Concepto | Tipo | Ene..Dic | Total. Orden: INGRESOS, bloque resumen, gastos. */
function renderPresDesglose(){
  const el=$('#presDesglose'); if(!el) return;
  const year=+presYear || new Date().getFullYear();
  const ysel=$('#presDesgloseYear'); if(ysel && +ysel.value!==year) ysel.value=year;
  // Realizado por categoría y mes (desde Movimientos)
  const realCat={};
  (DB.movimientos||[]).forEach(m=>{
    if(!m.fecha || (+m.fecha.slice(0,4))!==year) return;
    const mi=(+m.fecha.slice(5,7))-1; if(mi<0||mi>11) return;
    const _c=catById(m.categoriaId); const _sg=(_c&&m.tipo&&m.tipo!==_c.tipo)?-1:1; // regularización = signo opuesto
    (realCat[m.categoriaId]=realCat[m.categoriaId]||new Array(12).fill(0))[mi]+=_sg*num(m.importe);
  });
  // Presupuestado mensual por categoría (constante según frecuencia)
  const presMens={};
  DB.categorias.forEach(c=>{ const p=presFor(c.id,year); presMens[c.id]= p?mensual(p):0; });
  const realOf=(cid,mi)=>(realCat[cid]||[])[mi]||0;
  const realYear=cid=>{ const a=realCat[cid]; return a?a.reduce((s,v)=>s+v,0):0; };
  const short=MESES.map(m=>m.slice(0,3).replace(/^./,x=>x.toUpperCase()));
  const f2=v=>fmt(v).replace(/\s?€/,''); // sin símbolo € para estrechar columnas
  // celda presupuesto (fondo gris) y celda real (verde=mejora / rojo=empeora vs su mes presupuestado)
  const cellB=(v)=> (Math.abs(v)>0.005)?`<td class="num dg-b">${f2(v)}</td>`:'<td class="num muted dg-b">·</td>';
  const cellR=(r,b,esGasto)=>{
    let cls='';
    if(b>0.005 && Math.abs(r)>0.005){ const mejora= esGasto ? (r<=b+0.005) : (r>=b-0.005); cls=' '+(mejora?'dg-up':'dg-dn'); }
    return (Math.abs(r)>0.005)?`<td class="num${cls}">${f2(r)}</td>`:`<td class="num muted${cls}">·</td>`;
  };
  // Par de filas Pres./Real de un concepto
  const conceptRows=(c)=>{
    const b=presMens[c.id]||0, esG=c.tipo==='gasto'; let bTds='',rTds='',bTot=0,rTot=0;
    for(let mi=0;mi<12;mi++){ bTds+=cellB(b); bTot+=b; const r=realOf(c.id,mi); rTds+=cellR(r,b,esG); rTot+=r; }
    const ok = esG ? (rTot<=bTot+0.005) : (rTot>=bTot-0.005);
    const rColor=(bTot>0&&rTot>0)?` style="color:${ok?'#16a34a':'#dc2626'}"`:'';
    return `<tr class="dg-pres">`+
        `<td rowspan="2" class="dg-name">${c.nombre}${c.tipo==='ingreso'?' <span class="tag in">ing</span>':''}</td>`+
        `<td class="muted dg-b">Pres.</td>${bTds}<td class="num col-tot">${bTot?f2(bTot):'·'}</td></tr>`+
      `<tr class="dg-real"><td class="muted">Real</td>${rTds}<td class="num col-tot"${rColor}><b>${rTot?f2(rTot):'·'}</b></td></tr>`;
  };
  // Agrupar categorías (Ingresos primero, resto alfabético)
  const groups={};
  DB.categorias.forEach(c=>{(groups[c.grupo]=groups[c.grupo]||[]).push(c);});
  const order=Object.keys(groups).sort((a,b)=> a==='Ingresos'?-1:b==='Ingresos'?1:a.localeCompare(b));
  const catsConDato=g=> (groups[g]||[]).filter(c=> (presMens[c.id]||0)>0 || (realCat[c.id]&&realCat[c.id].some(v=>Math.abs(v)>0.005)) );
  window._dgDeskOpen=window._dgDeskOpen||{};
  const isDk=g=>!!window._dgDeskOpen[g];
  const bandRow=(g)=>{
    let bp=0,br=0; (groups[g]||[]).forEach(c=>{ bp+=(presMens[c.id]||0)*12; br+=realYear(c.id); });
    return `<tr class="dg-band${g==='Ingresos'?' ing':''}" data-dgdk="${g}"><td colspan="15"><span class="dg-arw">${isDk(g)?'▼':'▶'}</span> ${g} <span class="bmeta">· Pres. ${fmt(bp)} / Real ${fmt(br)}</span></td></tr>`;
  };
  // Bloque resumen (espejo del Excel)
  const ingCats=DB.categorias.filter(c=>c.tipo==='ingreso'), gasCats=DB.categorias.filter(c=>c.tipo==='gasto');
  const sumMonth=(cats,fn)=>{ const a=new Array(12).fill(0); for(let mi=0;mi<12;mi++) cats.forEach(c=>a[mi]+=fn(c,mi)); return a; };
  const ingReal=sumMonth(ingCats,(c,mi)=>realOf(c.id,mi));
  const ingPres=sumMonth(ingCats,c=>presMens[c.id]||0);
  const gasReal=sumMonth(gasCats,(c,mi)=>realOf(c.id,mi));
  const gasPres=sumMonth(gasCats,c=>presMens[c.id]||0);
  const combo=(a,b,sg)=>a.map((v,i)=>v+sg*b[i]);
  const ahoPrev=combo(ingPres,gasPres,-1), ahoLog=combo(ingReal,gasReal,-1);
  const sumRow=(lbl,arr,cls,signo)=>{
    let tds='',tot=0; arr.forEach(v=>{ tot+=v; const neg=signo&&v<0; tds+= (Math.abs(v)<0.005?'<td class="num muted">·</td>':`<td class="num${neg?' dg-neg':''}">${f2(v)}</td>`); });
    const negT=signo&&tot<0;
    return `<tr class="${cls}"><td colspan="2"><b>${lbl}</b></td>${tds}<td class="num col-tot${negT?' dg-neg':''}"><b>${f2(tot)}</b></td></tr>`;
  };
  const resumen =
      sumRow('Total INGRESOS (real)',ingReal,'r-sum strong')+
      sumRow('Ingreso presupuestado',ingPres,'r-sum')+
      sumRow('Gasto presupuestado',gasPres,'r-sum')+
      sumRow('Gasto realizado',gasReal,'r-sum')+
      sumRow('Ahorro presupuestado',ahoPrev,'r-sum',true)+
      sumRow('Ahorro logrado',ahoLog,'r-sum strong',true);
  // Fila de KPIs (mismo componente que el resto de pestañas)
  (function(){ var kEl=document.getElementById('dgKpis'); if(!kEl) return;
    var tot=function(a){return a.reduce(function(s,v){return s+v;},0);};
    var iR=tot(ingReal), iP=tot(ingPres), gR=tot(gasReal), gP=tot(gasPres);
    var aR=iR-gR, aP=iP-gP;
    var tR=iR>0?(aR/iR*100):0, tP=iP>0?(aP/iP*100):0;
    kEl.innerHTML='<div class="pos-kpis">'+
      '<div class="k"><div class="l">Ingresos (real)</div><div class="v">'+fmt(iR)+'</div><div class="p">Pres. '+fmt(iP)+'</div></div>'+
      '<div class="k"><div class="l">Gastos (real)</div><div class="v">'+fmt(gR)+'</div><div class="p">Pres. '+fmt(gP)+'</div></div>'+
      '<div class="k hero"><div class="l">Ahorro logrado</div><div class="v">'+fmt(aR)+'</div><div class="p">Presupuestado '+fmt(aP)+'</div></div>'+
      '<div class="k"><div class="l">Tasa de ahorro</div><div class="v'+(aR<0?' neg':'')+'">'+tR.toFixed(1)+' %</div><div class="p">Pres. '+tP.toFixed(1)+' %</div></div>'+
    '</div>';
  })();
  // Montaje: INGRESOS → resumen → gastos (cada capítulo plegable; cerrado por defecto)
  let body='';
  const ing=catsConDato('Ingresos'); if(ing.length){ body+=bandRow('Ingresos'); if(isDk('Ingresos')) body+=ing.map(conceptRows).join(''); }
  body+=`<tr class="r-amar"><td colspan="15"><b>RESUMEN</b></td></tr>`+resumen;
  order.filter(g=>g!=='Ingresos').forEach(g=>{ const cs=catsConDato(g); if(!cs.length)return; body+=bandRow(g); if(isDk(g)) body+=cs.map(conceptRows).join(''); });
  const head=`<tr><th style="text-align:left">Concepto</th><th></th>${short.map(m=>`<th class="num">${m}</th>`).join('')}<th class="num tot">Total</th></tr>`;
  const hasData=ing.length || order.some(g=>g!=='Ingresos'&&catsConDato(g).length);
  el.innerHTML=`<table class="tbl-desglose"><thead>${head}</thead><tbody>${body}</tbody></table>`
    + (hasData?'':`<p class="muted" style="margin-top:8px">Sin conceptos con presupuesto o movimientos en ${year}.</p>`);
  var _tgl=document.getElementById('dgToggleAll');
  if(_tgl){ var _grp={}; DB.categorias.forEach(function(c){_grp[c.grupo]=1;}); var _any=Object.keys(_grp).some(function(g){return window._dgDeskOpen&&window._dgDeskOpen[g];}); _tgl.textContent=_any?'Colapsar todo':'Desplegar todo'; }
  if(typeof _dgMobileRender==='function') _dgMobileRender(year, realCat, presMens);
  if(!renderPresDesglose._bound){ renderPresDesglose._bound=true; var _sec=document.getElementById('view-desglose');
    if(_sec){
      _sec.addEventListener('click',function(e){
        if(e.target.closest('#dgToggleAll')){ var _g={}; DB.categorias.forEach(function(c){_g[c.grupo]=1;}); var keys=Object.keys(_g); window._dgDeskOpen=window._dgDeskOpen||{}; var anyOpen=keys.some(function(g){return window._dgDeskOpen[g];}); keys.forEach(function(g){ window._dgDeskOpen[g]=!anyOpen; }); renderPresDesglose(); return; }
        var dk=e.target.closest('[data-dgdk]'); if(dk){ var gg=dk.getAttribute('data-dgdk'); window._dgDeskOpen=window._dgDeskOpen||{}; window._dgDeskOpen[gg]=!window._dgDeskOpen[gg]; renderPresDesglose(); return; }
        var ch=e.target.closest('[data-dgch]'); if(ch){ var g=ch.getAttribute('data-dgch'); window._dgOpen=window._dgOpen||{}; window._dgOpen[g]=!window._dgOpen[g]; var blk=ch.closest('.dg-mblk'); if(blk)blk.classList.toggle('open'); return; }
        if(e.target.closest('#dgPrev')){ _dgStep(-1); return; }
        if(e.target.closest('#dgNext')){ _dgStep(1); return; }
      });
      _sec.addEventListener('change',function(e){ var t=e.target; if(!t||!t.id)return;
        if(t.id==='dgYearM'){ presYear=+t.value; if(typeof fillPresYear==='function')fillPresYear(); if(typeof renderPres==='function')renderPres(); renderPresDesglose(); return; }
        if(t.id==='dgMonthSel'){ window._dgMonth=(t.value==='year')?'year':(+t.value); renderPresDesglose(); return; }
      });
    }
  }
}
function _dgStep(d){ var seq=[0,1,2,3,4,5,6,7,8,9,10,11,'year']; var m=(typeof window._dgMonth==='undefined')?new Date().getMonth():window._dgMonth; var i=seq.indexOf(m); if(i<0)i=0; i=(i+d+13)%13; window._dgMonth=seq[i]; renderPresDesglose(); }
function _dgMobileRender(year, realCat, presMens){
  var host=document.getElementById('dgMobile'); if(!host) return;
  var MM=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  if(typeof window._dgMonth==='undefined') window._dgMonth=new Date().getMonth();
  window._dgOpen=window._dgOpen||{};
  var per=window._dgMonth;
  var realOf=function(cid,mi){ return (realCat[cid]||[])[mi]||0; };
  var realYr=function(cid){ var a=realCat[cid]; return a?a.reduce(function(s,v){return s+v;},0):0; };
  var presOf=function(cid){ return per==='year'?(presMens[cid]||0)*12:(presMens[cid]||0); };
  var realP=function(cid){ return per==='year'?realYr(cid):realOf(cid,per); };
  var f2=function(v){ return Math.abs(v)<0.5?'·':fmt(v).replace(/\s?€/,''); };
  var groups={}; (DB.categorias||[]).forEach(function(c){(groups[c.grupo]=groups[c.grupo]||[]).push(c);});
  var order=Object.keys(groups).sort(function(a,b){return a==='Ingresos'?-1:b==='Ingresos'?1:a.localeCompare(b);});
  var withData=function(g){ return (groups[g]||[]).filter(function(c){ return (presMens[c.id]||0)>0 || (realCat[c.id]&&realCat[c.id].some(function(v){return Math.abs(v)>0.5;})); }); };
  var ingC=(DB.categorias||[]).filter(function(c){return c.tipo==='ingreso';}), gasC=(DB.categorias||[]).filter(function(c){return c.tipo!=='ingreso';});
  var sum=function(cs,fn){return cs.reduce(function(s,c){return s+fn(c);},0);};
  var iP=sum(ingC,function(c){return presOf(c.id);}), iR=sum(ingC,function(c){return realP(c.id);});
  var gP=sum(gasC,function(c){return presOf(c.id);}), gR=sum(gasC,function(c){return realP(c.id);});
  var ahP=iP-gP, ahR=iR-gR;
  // Totales anuales (siempre, para tener el resumen del año a la vista aunque se mire un mes)
  var iPy=sum(ingC,function(c){return (presMens[c.id]||0)*12;}), iRy=sum(ingC,function(c){return realYr(c.id);});
  var gPy=sum(gasC,function(c){return (presMens[c.id]||0)*12;}), gRy=sum(gasC,function(c){return realYr(c.id);});
  var ahPy=iPy-gPy, ahRy=iRy-gRy;
  var years={}; (DB.presupuesto||[]).forEach(function(p){years[pAnio(p)]=1;}); (DB.movimientos||[]).forEach(function(m){var y=+(''+(m.fecha||'')).slice(0,4); if(y)years[y]=1;});
  var yl=Object.keys(years).map(Number).sort(function(a,b){return a-b;});
  var yopts=yl.map(function(y){return '<option value="'+y+'"'+(y===year?' selected':'')+'>'+y+'</option>';}).join('');
  var mopts=''; for(var i=0;i<12;i++)mopts+='<option value="'+i+'"'+(per===i?' selected':'')+'>'+MM[i]+'</option>'; mopts+='<option value="year"'+(per==='year'?' selected':'')+'>Año completo</option>';
  var perLbl=per==='year'?('Año completo '+year):(MM[per]+' '+year);
  var kpiTrio=function(iR,iP,gR,gP,ahR,ahP){ return ''+
    '<div class="c"><div class="l">Ingresos</div><div class="v">'+f2(iR)+'</div><div class="p">de '+f2(iP)+' prev.</div></div>'+
    '<div class="c"><div class="l">Gastos</div><div class="v">'+f2(gR)+'</div><div class="p">de '+f2(gP)+' prev.</div></div>'+
    '<div class="c"><div class="l">Ahorro</div><div class="v '+(ahR>=0?'pos':'neg')+'">'+(ahR>=0?'+':'−')+f2(Math.abs(ahR))+'</div><div class="p">prev. '+(ahP>=0?'+':'−')+f2(Math.abs(ahP))+'</div></div>'; };
  var esMes=(per!=='year');
  var sumHtml=(esMes?'<div class="dg-msum-lbl">Del mes · '+MM[per]+'</div>':'')+
    '<div class="dg-msum">'+kpiTrio(iR,iP,gR,gP,ahR,ahP)+'</div>'+
    (esMes?('<div class="dg-msum-lbl">Acumulado del año '+year+'</div><div class="dg-msum year">'+kpiTrio(iRy,iPy,gRy,gPy,ahRy,ahPy)+'</div>'):'');
  var chapters=order.map(function(g){ var cs=withData(g); if(!cs.length)return ''; var isIng=g==='Ingresos';
    var gp=0,gr=0; cs.forEach(function(c){gp+=presOf(c.id);gr+=realP(c.id);});
    var dvG=isIng?(gr-gp):(gp-gr);
    var open=!!window._dgOpen[g];
    var rows=cs.map(function(c){ var p=presOf(c.id), r=realP(c.id); var dv=(c.tipo==='ingreso')?(r-p):(p-r);
      var dvZero=Math.abs(dv)<0.5; var dvTxt=dvZero?'·':((dv>=0?'+':'−')+f2(Math.abs(dv))); var dvCls=dvZero?'':(dv>=0?'pos':'neg');
      return '<div class="dg-mrow"><span class="nm">'+_infEsc(c.nombre)+'</span>'+
        '<span class="v"><span class="k">Pres</span>'+f2(p)+'</span>'+
        '<span class="v"><span class="k">Real</span>'+f2(r)+'</span>'+
        '<span class="v dv '+dvCls+'"><span class="k">Desv</span>'+dvTxt+'</span></div>'; }).join('');
    return '<div class="dg-mblk'+(open?' open':'')+'"><div class="dg-mblk-h" data-dgch="'+_infEsc(g)+'"><span class="arw">▶</span>'+_infEsc(g)+'<span class="bt" style="color:'+(dvG>=0?'#16a34a':'#dc2626')+'">'+f2(gr)+' / '+f2(gp)+'</span></div>'+
      '<div class="dg-mblk-b">'+rows+'<div class="dg-mrow tot"><span class="nm">Total '+_infEsc(g)+'</span><span class="v">'+f2(gp)+'</span><span class="v">'+f2(gr)+'</span><span class="v dv '+(dvG>=0?'pos':'neg')+'">'+(dvG>=0?'+':'−')+f2(Math.abs(dvG))+'</span></div></div></div>';
  }).join('');
  host.innerHTML='<div class="dg-mpager"><select id="dgYearM">'+yopts+'</select><button class="nav" id="dgPrev">‹</button><select id="dgMonthSel">'+mopts+'</select><button class="nav" id="dgNext">›</button></div>'+
    '<div class="dg-mnote">'+perLbl+' · <b>PRES</b> = Presupuesto · <b>REAL</b> = Movimientos</div>'+sumHtml+chapters;
}

/* ============ Patrimonio ============ */
function patSnaps(){ return [...(DB.patrimonio||[])].sort((a,b)=> a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0); }
function snapTot(s){ let ef=0,inv=0; (s.lineas||[]).forEach(l=>{ef+=num(l.ef);inv+=num(l.inv);}); return {ef,inv,total:ef+inv}; }
function ddmmyyyy(f){ return f.split('-').reverse().join('/'); }

function renderPat(){
  const snaps=patSnaps();
  const obj=(DB.config&&DB.config.objetivoReparto!=null)?DB.config.objetivoReparto:0.5;
  const heroEl=$('#patCards'), repEl=$('#patReparto');
  if(!snaps.length){
    if(heroEl)heroEl.innerHTML='<div class="empty" style="padding:16px">Aún no hay registros de patrimonio. Añade uno abajo o importa tu histórico.</div>';
    if(repEl)repEl.innerHTML=''; if($('#patEvol'))$('#patEvol').textContent='';
    const cv=$('#patChart'); if(cv){const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);}
    renderPatCuentas(); renderPatForm(); renderPatList(); return;
  }
  const last=snaps[snaps.length-1], first=snaps[0];
  const t=snapTot(last), tf=snapTot(first);
  const prev=snaps.length>1?snapTot(snaps[snaps.length-2]):null;
  const pctInv=t.total?t.inv/t.total:0;
  const rendIni=tf.total?(t.total-tf.total)/tf.total:0;
  const rendPrev=prev&&prev.total?(t.total-prev.total)/prev.total:0;
  let _liqMini='';
  try{ const _F=(typeof fiscalidadData==='function')?fiscalidadData():null; if(_F&&_F.valorCartera>0){ _liqMini='<div class="ph-mini liq"><div class="l">💧 Neto si liquido acciones</div><div class="v">'+fmt(_F.netoLiq)+'</div><div class="p">tras impuesto '+fmt(_F.impuestoLiq)+'</div></div>'; } }catch(e){}
  if(heroEl)heroEl.innerHTML=
    '<div><div class="ph-l">Patrimonio total</div><div class="ph-amt">'+fmt(t.total)+'</div><div class="ph-s">al '+ddmmyyyy(last.fecha)+' · '+snaps.length+' registros</div></div>'+
    '<div class="ph-rend">'+(rendIni>=0?'+':'')+(rendIni*100).toFixed(0)+'% desde el inicio</div>'+
    '<div class="ph-sp"></div><div class="ph-minis">'+
      '<div class="ph-mini"><div class="l">Efectivo</div><div class="v">'+fmt(t.ef)+'</div><div class="p">'+Math.round((1-pctInv)*100)+'%</div></div>'+
      '<div class="ph-mini"><div class="l">Invertido</div><div class="v">'+fmt(t.inv)+'</div><div class="p">'+Math.round(pctInv*100)+'%</div></div>'+
      '<div class="ph-mini"><div class="l">vs anterior</div><div class="v">'+(rendPrev>=0?'+':'')+(rendPrev*100).toFixed(1)+'%</div><div class="p">último registro</div></div>'+
      _liqMini+
    '</div>';
  const pInv=Math.round(pctInv*100), pEf=100-pInv, oInv=Math.round(obj*100);
  if(repEl)repEl.innerHTML='<div class="pr-l">Reparto efectivo / invertido</div>'+
    '<div class="pr-bar"><i style="width:'+pEf+'%;background:var(--brand)"></i><i style="width:'+pInv+'%;background:var(--green,#16a34a)"></i></div>'+
    '<div class="pr-leg"><span><span class="pr-dot" style="background:var(--brand)"></span>Efectivo '+pEf+'%</span><span><span class="pr-dot" style="background:var(--green,#16a34a)"></span>Invertido '+pInv+'%</span><span>| objetivo invertido <input type="number" id="patObj" min="0" max="100" value="'+oInv+'">%</span></div>';
  drawPatChart(snaps);
  if($('#patEvol'))$('#patEvol').textContent=snaps.length+' registros · desde '+ddmmyyyy(first.fecha)+' ('+fmt(tf.total)+') hasta '+ddmmyyyy(last.fecha)+' ('+fmt(t.total)+')';
  renderPatCuentas(); renderPatForm(); renderPatList();
}

function drawPatChart(snaps){
  const cv=$('#patChart'); if(!cv) return;
  const ctx=cv.getContext('2d');
  const W=cv.width=cv.clientWidth||700, H=cv.height=220;
  ctx.clearRect(0,0,W,H);
  const pad={l:8,r:8,t:26,b:18};
  const n=snaps.length; if(!n) return;
  const tot=snaps.map(s=>snapTot(s).total);
  const ef=snaps.map(s=>snapTot(s).ef);
  const inv=snaps.map(s=>snapTot(s).inv);
  const max=Math.max(...tot,1), min=Math.min(...tot,...ef,...inv,0);
  const X=i=> pad.l + (W-pad.l-pad.r)*(n<=1?0.5:i/(n-1));
  const Y=v=> pad.t + (H-pad.t-pad.b)*(1-(v-min)/((max-min)||1));
  // area bajo el patrimonio total
  ctx.beginPath(); ctx.moveTo(X(0),Y(tot[0]));
  for(let i=1;i<n;i++) ctx.lineTo(X(i),Y(tot[i]));
  ctx.lineTo(X(n-1),H-pad.b); ctx.lineTo(X(0),H-pad.b); ctx.closePath();
  ctx.fillStyle='rgba(37,99,235,.10)'; ctx.fill();
  function line(arr,color,w){ ctx.beginPath(); ctx.moveTo(X(0),Y(arr[0])); for(let i=1;i<n;i++) ctx.lineTo(X(i),Y(arr[i])); ctx.strokeStyle=color; ctx.lineWidth=w; ctx.stroke(); }
  line(inv,'#f59e0b',2);        // invertido en acciones
  line(ef,'#16a34a',2);         // efectivo
  line(tot,'#2563eb',2.5);      // patrimonio total
  // etiquetas de anos
  ctx.fillStyle='#6b7280'; ctx.font='10px sans-serif'; ctx.textAlign='center';
  const seen={};
  snaps.forEach((s,i)=>{ const yr=(s.fecha||'').slice(0,4); if(yr&&!seen[yr]){seen[yr]=1; ctx.fillText(yr, X(i), H-5);} });
  // leyenda
  ctx.textAlign='left'; ctx.font='10px sans-serif';
  const leg=[['Patrimonio','#2563eb'],['Efectivo','#16a34a'],['Invertido acciones','#f59e0b']]; let lx=pad.l+2;
  leg.forEach(function(g){ ctx.fillStyle=g[1]; ctx.fillRect(lx,6,9,9); ctx.fillStyle='#374151'; ctx.fillText(g[0],lx+12,14); lx+=12+ctx.measureText(g[0]).width+16; });
}

function renderPatForm(){
  const el=$('#patFormFields'); if(!el) return;
  const today=new Date().toISOString().slice(0,10);
  let html='<div class="pat-fld"><label>Fecha</label><input type="date" id="patFecha" value="'+today+'"></div>';
  (DB.cuentas||[]).forEach(function(c){
    html+='<div class="pat-fld acc"><div class="an">'+_infEsc(c.nombre)+'</div><div class="prow">'+
      '<div><label>Efectivo</label><input type="number" step="0.01" class="patEf" data-c="'+c.id+'" placeholder="0"></div>'+
      '<div><label>Invertido</label><input type="number" step="0.01" class="patInv" data-c="'+c.id+'" placeholder="0"></div></div></div>';
  });
  el.innerHTML=html;
}
function editSnapshot(id){
  var s=(DB.patrimonio||[]).find(function(x){return x.id===id;}); if(!s)return;
  var b=$('#blkPatReg'); if(b)b.classList.add('open');
  renderPatForm();
  if($('#patFecha'))$('#patFecha').value=s.fecha||'';
  var efs=$$('.patEf'), invs=$$('.patInv');
  (s.lineas||[]).forEach(function(l){ var ef=efs.find(function(i){return i.dataset.c===l.cuentaId;}); var iv=invs.find(function(i){return i.dataset.c===l.cuentaId;}); if(ef)ef.value=(num(l.ef)||''); if(iv)iv.value=(num(l.inv)||''); });
  var rc=$('#patRegCancel'); if(rc)rc.style.display='inline-block';
  if(b)b.scrollIntoView({behavior:'smooth',block:'start'});
}
function resetPatForm(){ renderPatForm(); var rc=$('#patRegCancel'); if(rc)rc.style.display='none'; }
// Celda de variación (desktop): % coloreado + € pequeño debajo
function _patVar(cur, base, hasBase){
  if(!hasBase) return '<td class="pv"><span class="pv-mut">—</span></td>';
  var d=cur-base; var pct=base>0?(d/base*100):null;
  var cls=d>0.5?'up':(d<-0.5?'dn':'eq'); var arr=d>0.5?'▲':(d<-0.5?'▼':'·');
  var pTxt=(pct==null)?arr:(arr+' '+(d>=0?'+':'')+pct.toFixed(1)+'%');
  return '<td class="pv '+cls+'"><span class="pv-p">'+pTxt+'</span><span class="pv-e">'+(d>=0?'+':'')+fmt(d)+'</span></td>';
}
// Variación (móvil): texto inline
function _patVarM(cur, base, hasBase){
  if(!hasBase) return '<span class="eq">—</span>';
  var d=cur-base; var pct=base>0?(d/base*100):null;
  var cls=d>0.5?'up':(d<-0.5?'dn':'eq'); var arr=d>0.5?'▲':(d<-0.5?'▼':'·');
  return '<span class="'+cls+'">'+arr+' '+(d>=0?'+':'')+(pct==null?fmt(d):(pct.toFixed(1)+'%'))+'</span>';
}
function renderPatList(){
  const asc=patSnaps().slice();                 // orden cronológico ascendente
  const cnt=$('#patCount'); if(cnt)cnt.textContent=asc.length+' registros';
  const listEl=$('#patList'); if(!listEl)return;
  if(!asc.length){ listEl.innerHTML='<div class="empty" style="padding:22px;text-align:center;color:#94a3b8">Sin registros.</div>'; return; }
  const cById=function(id){return (DB.cuentas||[]).find(function(c){return c.id===id;});};
  const tFirst=snapTot(asc[0]);
  const head='<thead><tr>'+
    '<th class="l">Fecha</th>'+
    '<th class="grp">Efectivo</th><th>vs ant.</th><th>vs inicio</th>'+
    '<th class="grp">Invertido</th><th>vs ant.</th><th>vs inicio</th>'+
    '<th class="grp">Total</th><th>vs ant.</th><th>vs inicio</th>'+
    '<th class="grp">% Inv.</th></tr></thead>';
  let rows='', cards='';
  for(let i=asc.length-1;i>=0;i--){
    const s=asc[i]; const t=snapTot(s); const pInv=t.total?Math.round(t.inv/t.total*100):0;
    const prev=i>0?asc[i-1]:null; const tPrev=prev?snapTot(prev):null; const isFirst=(i===0);
    const brk=(s.lineas||[]).map(function(l){ var c=cById(l.cuentaId); return '<tr><td>'+(c?_infEsc(c.nombre):'—')+'</td><td class="num">'+fmt(num(l.ef))+'</td><td class="num">'+fmt(num(l.inv))+'</td><td class="num">'+fmt(num(l.ef)+num(l.inv))+'</td></tr>'; }).join('');
    const acts='<div class="pat-acts"><button class="btn ghost sm" data-editsnap="'+s.id+'">✎ Editar</button><button class="btn danger sm" data-delsnap="'+s.id+'">🗑 Eliminar</button></div>';
    // ---- fila de tabla (desktop) ----
    rows+='<tr class="pr-row" data-patrow>'+
      '<td class="l"><span class="pr-arw">▶</span>'+ddmmyyyy(s.fecha)+'</td>'+
      '<td class="v grp">'+fmt(t.ef)+'</td>'+_patVar(t.ef, tPrev?tPrev.ef:0, !!tPrev)+_patVar(t.ef, tFirst.ef, !isFirst)+
      '<td class="v grp">'+fmt(t.inv)+'</td>'+_patVar(t.inv, tPrev?tPrev.inv:0, !!tPrev)+_patVar(t.inv, tFirst.inv, !isFirst)+
      '<td class="v grp tot">'+fmt(t.total)+'</td>'+_patVar(t.total, tPrev?tPrev.total:0, !!tPrev)+_patVar(t.total, tFirst.total, !isFirst)+
      '<td class="grp pinv">'+pInv+'%</td>'+
      '</tr>'+
      '<tr class="pr-detail"><td colspan="11"><div class="pr-detwrap"><table class="pat-brk"><thead><tr><th>Cuenta</th><th class="num">Efectivo</th><th class="num">Invertido</th><th class="num">Total</th></tr></thead><tbody>'+brk+'</tbody></table>'+acts+'</div></td></tr>';
    // ---- tarjeta (móvil) ----
    const cell=(lbl,val,cur,base)=>'<div class="prm-cell"><div class="prm-cl"><span class="l">'+lbl+'</span><span class="v">'+fmt(val)+'</span></div><div class="d"><span class="k">ant.</span> '+_patVarM(cur, tPrev?base.p:0, !!tPrev)+' <span class="k">· inicio</span> '+_patVarM(cur, base.f, !isFirst)+'</div></div>';
    cards+='<div class="prm-card" data-prm><div class="prm-h"><span class="prm-f">▶ '+ddmmyyyy(s.fecha)+'</span><span class="prm-t">'+fmt(t.total)+'</span><span class="prm-pinv">'+pInv+'% inv.</span></div>'+
      '<div class="prm-grid">'+
        cell('Efectivo', t.ef, t.ef, {p:tPrev?tPrev.ef:0, f:tFirst.ef})+
        cell('Invertido', t.inv, t.inv, {p:tPrev?tPrev.inv:0, f:tFirst.inv})+
        cell('Total', t.total, t.total, {p:tPrev?tPrev.total:0, f:tFirst.total})+
      '</div>'+
      '<div class="prm-det"><table class="pat-brk"><thead><tr><th>Cuenta</th><th class="num">Efect.</th><th class="num">Invert.</th><th class="num">Total</th></tr></thead><tbody>'+brk+'</tbody></table>'+acts+'</div>'+
      '</div>';
  }
  listEl.innerHTML='<div class="pat-reg-wrap"><table class="pat-reg">'+head+'<tbody>'+rows+'</tbody></table></div><div class="pat-reg-mob">'+cards+'</div>';
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
function importPatrimonio(file){ if(typeof pushSnapshot==='function')pushSnapshot('antes de importar patrimonio');
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
  if(!(DB.cuentas||[]).length){ el.innerHTML='<span class="muted">No hay cuentas todavía.</span>'; return; }
  el.innerHTML=DB.cuentas.map(function(c){ return '<span class="pat-ctag">'+_infEsc(c.nombre)+'<button data-delcuenta="'+c.id+'" title="Borrar cuenta">✕</button></span>'; }).join('');
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
  if(p && p.modeloEvo2){ if(!p.aportaciones)p.aportaciones={}; if(!p.ingresosExtra)p.ingresosExtra={}; if(!p.eventos)p.eventos=[]; if(p.anioTrasJub==null)p.anioTrasJub=2039; return; }
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
  const _titN=(typeof perfilTitulares==='function'&&perfilTitulares().length)?perfilTitulares():['Carlos','Susana']; const nominaMes=_titN.reduce(function(a,n){return a+mes('Nómina '+n);},0)+mes('Pagas Extra');
  let gastosAnu=0; DB.presupuesto.filter(x=>pAnio(x)===yr).forEach(x=>{const c=DB.categorias.find(cc=>cc.id===x.categoriaId); if(c&&c.tipo==='gasto')gastosAnu+=anual(x);});
  DB.config.proyeccion={ modeloEvo2:true, anioBase:yr, edadActual:55, edadFin:90, edadFinAportar:70,
    efectivo:Math.round(last.ef)||9000, invertidoCoste:Math.round(coste), carteraInicial:Math.round(cartera),
    dividendoBruto:Math.round(divB), nominaMes:Math.round(nominaMes)||5675, gastoMes:Math.round(gastosAnu/12)||3450,
    crecCartera:0.04, crecDividendo:0.025, rpdNuevas:0.05, inflacionNomina:0.025, crecAhorro:0.01, anioTrasJub:2039,
    aportacionDefault:25000, aportaciones:{}, ingresosExtra:{}, eventos:[] };
  scheduleSave();
}
function computeProy(c){
  const N=Math.max(0,Math.round(c.edadFin-c.edadActual));
  const Sof=(anio,edad)=>{const ap=c.aportaciones||{}; if(ap[anio]!=null&&ap[anio]!=='')return num(ap[anio]); return edad<=c.edadFinAportar?num(c.aportacionDefault):0;};
  const Tof=(anio)=>{let t=0,con=''; (c.eventos||[]).forEach(e=>{if(parseInt(e.anio,10)===anio){t+=num(e.importe); con=con?con+', '+(e.concepto||''):(e.concepto||'');}}); return{t,con};};
  /* Ingresos extra por año (lotería, herencia, otros): tercer origen del ahorro, junto a nóminas y dividendo. */
  const Xof=(anio)=>{const xp=c.ingresosExtra||{}; return (xp[anio]!=null&&xp[anio]!=='')?num(xp[anio]):0;};
  const gC=1+num(c.crecCartera), gD=1+num(c.crecDividendo), gN=1+num(c.inflacionNomina), gA=1+num(c.crecAhorro), rpdN=num(c.rpdNuevas);
  let Ef=num(c.efectivo), I=num(c.invertidoCoste), C=num(c.carteraInicial), Div=num(c.dividendoBruto), Nom=num(c.nominaMes);
  let AN=(num(c.nominaMes)-num(c.gastoMes))*12; if(AN<0)AN=0;
  const yJub=num(c.anioTrasJub)||2039;
  let prevR=0,prevT=0,prevS=0;
  const yrNow=new Date().getFullYear(); const LV=(typeof carteraLive==='function'?carteraLive():0);
  const out=[];
  for(let i=0;i<=N;i++){
    const edad=Math.round(c.edadActual)+i, anio=Math.round(c.anioBase)+i;
    const S=Sof(anio,edad); const X=Xof(anio); const ev=Tof(anio); const T=ev.t; const trasJub=anio>=yJub;
    if(i>0){
      Nom=Nom*gN; AN=AN*gA;
      Div=Div*gD + prevS*rpdN;
      I=I+prevS;
      C=C*gC+prevS;
      Ef=Ef+((anio-1)<yJub?prevR:0)-prevT;
    }
    /* Ahorro del año = ahorro de nóminas + dividendo + ingresos extra. El extra va a → Efectivo salvo que subas → Inversión. */
    const Q=AN+Div+X; const R=Q-S; const patrim=C+Ef;
    /* «Disponible/mes» = renta − ahorro REGULAR (sin el extra puntual, que no es una renta mensual). */
    const Rreg=(AN+Div)-S;
    const dividendoMes=Div/12; const rentaMes=dividendoMes+Nom; let dispMes=rentaMes-Rreg/12-S/12; if(trasJub) dispMes=dispMes+Rreg/12;
    const _cr=anio<yrNow?carteraAtClose(anio):(anio===yrNow?LV:null); const _crv=(_cr!=null&&_cr>0)?_cr:null;
    const _efR=(anio<=yrNow)?efectivoRealAt(anio):null;
    const _patR=(_crv!=null)?(_crv+(_efR!=null?_efR:Ef)):null;
    out.push({anio,edad,trasJub,efectivo:Ef,invertido:I,cartera:C,carteraReal:_crv,patrimonio:patrim,patrimonioReal:_patR,efectivoReal:(_patR!=null?(_efR!=null?_efR:Ef):null),dividendoAnual:Div,dividendoMes,ingresosExtra:X,ahorroTotal:Q,aInversion:S,aEfectivo:R,nominaMes:Nom,rentaMes,disponibleMes:dispMes,gasto:T,gastoCon:ev.con,plusvalia:C-I});
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
/* ===== FASE 2 — valores REALES del año (de tus datos), para comparar con el pronóstico =====
   Solo años ya empezados (≤ año en curso). El año en curso va parcial ("YTD"). TODO sale de tu
   contabilidad, así reconcilia: Nóminas + Dividendo + Extra − Gastos = Ahorro → → Inversión / → Efectivo.
   Fuentes: efectivo ← último snapshot de Patrimonio · cartera ← acciones×cotización real ·
   invertido = coste inicial + aportación NETA acumulada (compras − ventas, incluye DB.cerradas) ·
   Movimientos por categoría → nómina (Nómina/Pagas), dividendo (categoría «Dividendos», ya incluye
   la devolución de Hacienda ≈ bruto), extra (resto de ingresos no presupuestados: intereses, otros),
   gastos → ahorro=ingresos−gastos y gasto medio/mes · → Inversión = aportación NETA del año. */
function proyRealAgg(year){
  var yrNow=new Date().getFullYear(); year=+year;
  if(year>yrNow) return null;
  var _cart=(year<yrNow)?(typeof carteraAtClose==='function'?carteraAtClose(year):0):(typeof carteraLive==='function'?carteraLive():0);
  var cartera=_cart>0?_cart:null;
  var _ef=(typeof efectivoRealAt==='function')?efectivoRealAt(year):null;
  var efectivo=(_ef!=null)?_ef:null;
  var patrimonio=(cartera!=null)?(cartera+(efectivo!=null?efectivo:0)):null;
  /* Movimientos del año por categoría */
  var nomina=0,divi=0,ing=0,gas=0,meses={};
  (DB.movimientos||[]).forEach(function(m){ var f=(''+(m.fecha||'')); if(f.slice(0,4)!==(''+year))return; if(f.length>=7)meses[f.slice(0,7)]=1;
    var c=(typeof catById==='function')?catById(m.categoriaId):null; var tp=c?c.tipo:m.tipo; var nm=((c&&c.nombre)||'').toLowerCase(); var sg=(tp&&m.tipo&&m.tipo!==tp)?-1:1; var v=sg*num(m.importe);
    if(tp==='ingreso'){ ing+=v; if(nm.indexOf('mina')>=0||nm.indexOf('paga')>=0||nm.indexOf('sueldo')>=0)nomina+=v; else if(nm.indexOf('dividend')>=0)divi+=v; }
    else if(tp==='gasto'){ gas+=v; } });
  var extra=ing-nomina-divi;               /* resto de ingresos no presupuestados (intereses, otros) */
  var ahorro=ing-gas;
  var nMes=Object.keys(meses).length||12; var gastoMes=gas/nMes;
  /* aportación NETA del año + acumulada desde el año base (para «invertido» real) */
  var aNeta=0,netAcum=0; var ops=(typeof _allOps==='function')?_allOps():[];
  var base=(DB.config&&DB.config.proyeccion)?Math.round(num(DB.config.proyeccion.anioBase)):year;
  ops.forEach(function(o){ if(!o.fecha)return; var yy=(''+o.fecha).slice(0,4); if(!/^\d{4}$/.test(yy))return; var eur=num(o.acciones)*num(o.precio); var s=(o.tipo==='venta'?-1:1); if(yy===(''+year))aNeta+=s*eur; if(+yy>=base&&+yy<=year)netAcum+=s*eur; });
  var invIni=(DB.config&&DB.config.proyeccion)?num(DB.config.proyeccion.invertidoCoste):0;
  return {efectivo:efectivo,invertido:invIni+netAcum,cartera:cartera,patrimonio:patrimonio,nomina:nomina,dividendo:divi,extra:extra,ahorro:ahorro,aInversion:aNeta,aEfectivo:(ahorro-aNeta),gastoMes:gastoMes,ytd:(year===yrNow)};
}
/* ===== FASE 2b — FOTO INICIAL congelada =====
   Guarda el plan de HOY (computeProy) como línea base fija. La fila Real se compara contra
   esta foto (el plan original) en vez del pronóstico vivo, que se re-ancla cada año. */
function proyFijarFotoInicial(){
  proyDefaults(); var c=DB.config.proyeccion; var ser=computeProy(c); var serie={};
  ser.forEach(function(r){ serie[r.anio]={patrimonio:r.patrimonio,efectivo:r.efectivo,cartera:r.cartera,invertido:r.invertido,nominaMes:r.nominaMes,dividendoAnual:r.dividendoAnual,ingresosExtra:r.ingresosExtra,ahorroTotal:r.ahorroTotal,aInversion:r.aInversion,aEfectivo:r.aEfectivo,disponibleMes:r.disponibleMes}; });
  c.fotoInicial={fecha:new Date().toISOString().slice(0,10), serie:serie};
  if(typeof toast==='function')toast('📸 Foto inicial fijada ('+c.fotoInicial.fecha+')');
  if(typeof scheduleSave==='function')scheduleSave(); renderProy();
}
function proyBorrarFotoInicial(){ if(DB.config&&DB.config.proyeccion&&DB.config.proyeccion.fotoInicial){ delete DB.config.proyeccion.fotoInicial; if(typeof scheduleSave==='function')scheduleSave(); renderProy(); } }
function _proyFechaCorta(f){ f=(''+(f||'')).slice(0,10); var p=f.split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):f; }
function proyRefreshBase(c){
  // Ancla de la CARTERA TEORICA = valor de cartera a cierre del 31-dic del ano ANTERIOR al ano base,
  // reconstruido con cotizaciones reales del repo. Es historico y fijo (no se mueve con el mercado).
  var anch=carteraAtClose(num(c.anioBase)-1);
  if(anch>0 && Math.round(anch)!==Math.round(num(c.carteraInicial))){ c.carteraInicial=Math.round(anch); scheduleSave(); }
}
function renderProy(){
  try{ _proyWireToggles(); }catch(e){}
  proyDefaults(); const c=DB.config.proyeccion;
  if(typeof cargarPreciosCartera==='function' && typeof _allOps==='function' && typeof _precioCache!=='undefined'){
    const _tt=_allOps().map(o=>(o.ticker||'').toUpperCase()).filter(Boolean);
    if(_tt.some(t=>_precioCache[t]===undefined)){ cargarPreciosCartera().then(()=>renderProy()); }
  }
  proyRefreshBase(c);
  renderProyParams(c);
  const ser=computeProy(c); const fin=ser[ser.length-1];
  const jub=ser.find(r=>r.edad>=c.edadFinAportar)||fin;
  const _kp=[
    {hero:1,l:'Patrimonio a los '+Math.round(c.edadFin),v:fmt(fin.patrimonio),p:'cartera teórica '+fmt(fin.cartera)},
    {l:'Dividendos/mes a los '+Math.round(c.edadFin),v:fmt(fin.dividendoMes),p:fmt(fin.dividendoAnual)+'/año'},
    {l:'Plusvalía latente a los '+Math.round(c.edadFin),v:fmt(fin.plusvalia),p:'cartera − invertido'},
    {l:'Renta/mes al jubilar ('+Math.round(c.edadFinAportar)+')',v:fmt(jub.rentaMes),p:'dividendos + nómina'}
  ];
  $('#proyCards').innerHTML=_kp.map(x=>`<div class="k${x.hero?' hero':''}"><div class="l">${x.l}</div><div class="v">${x.v}</div><div class="p">${x.p}</div></div>`).join('');
  renderProyEventos(c);
  /* plegables cerrados por defecto */
  window._proyBlk=window._proyBlk||{hip:false,mc:false,ev:false,det:false};
  [['blkProyHip','hip'],['blkProyMC','mc'],['blkProyEv','ev'],['blkProyDet','det']].forEach(function(p){ var b=document.getElementById(p[0]); if(b)b.classList.toggle('open',!!window._proyBlk[p[1]]); });
  window._proyYr=window._proyYr||{};
  const _pcls=(real,teor)=>{ if(real==null||!teor||teor<=0)return ''; const r=real/teor; if(r>=1)return 'g'; if(r>=0.95)return 'a'; return 'r'; };
  const yJub=num(c.anioTrasJub)||2039;
  /* ---- ESCRITORIO — modelo PLAN (foto) / REAL (se cierra el 31-dic) ---- */
  /* Formato compacto: entero redondeado, sin decimales ni € (para que entren las columnas). */
  const pf=(v)=>Math.round(num(v)).toLocaleString('es-ES');
  const _fi=c.fotoInicial;
  const yrNow=new Date().getFullYear();
  let drows='',sepDone=false;
  ser.forEach(r=>{
    if(r.trasJub&&!sepDone){ sepDone=true; drows+=`<tr class="sepj"><td colspan="13">🏖️ Jubilación · ${yJub} — el «→ Efectivo» deja de acumularse y pasa a cubrir gastos</td></tr>`; }
    /* Plan: la foto congelada si existe (fija), si no el plan vivo (editable) */
    const FI=(_fi&&_fi.serie)?_fi.serie[r.anio]:null; const P=FI||r; const fija=!!FI;
    const nomA=(P.nominaMes||0)*12;
    const extraCell = fija
      ? `<td class="num extra">${P.ingresosExtra?pf(P.ingresosExtra):'·'}</td>`
      : `<td class="num extra"><input type="number" step="500" class="extraInput" data-anio="${r.anio}" value="${r.ingresosExtra?Math.round(r.ingresosExtra):''}" placeholder="0"></td>`;
    const invCell = fija
      ? `<td class="num split2">${pf(P.aInversion)}</td>`
      : `<td class="num split2"><input type="number" step="500" class="aporInput" data-anio="${r.anio}" value="${Math.round(r.aInversion)}"></td>`;
    drows+=`<tr class="plan${r.trasJub?' tj':''}"><td><b>${r.anio}</b></td><td class="num" style="color:#475569">${r.edad}</td><td class="num">${pf(P.efectivo)}</td><td class="num">${pf(P.invertido)}</td><td class="num">${pf(P.cartera)}</td><td class="num tot"><b>${pf(P.patrimonio)}</b></td><td class="num">${pf(nomA)}</td><td class="num">${pf(P.dividendoAnual)}</td>${extraCell}<td class="num split1"><b>${pf(P.ahorroTotal)}</b></td>${invCell}<td class="num split3 ${P.aEfectivo>=0?'':'neg'}">${pf(P.aEfectivo)}</td><td class="num gcol">${pf(P.disponibleMes)}</td></tr>`;
    /* Real: sale de tu contabilidad y compara vs el Plan (P). Años futuros: fila en espera. */
    { const R=(r.anio<=yrNow)?proyRealAgg(r.anio):null;
      if(R){
        const _c=(rv,tv,lowGood)=> (rv==null)?'<td class="num soft">·</td>':`<td class="num ${(tv==null)?'':((lowGood?(rv<=tv):(rv>=tv))?'preal-up':'preal-dn')}">${pf(rv)}</td>`;
        const nomAP=(P.nominaMes||0)*12;
        const _per=R.ytd?'YTD':'FY';
        drows+=`<tr class="real"><td class="preal-lbl">Real</td><td class="rper">${_per}</td>${_c(R.efectivo,P.efectivo)}${_c(R.invertido,P.invertido)}${_c(R.cartera,P.cartera)}<td class="num tot ${R.patrimonio>=P.patrimonio?'preal-up':'preal-dn'}"><b>${pf(R.patrimonio)}</b></td>${_c(R.nomina,nomAP)}${_c(R.dividendo,P.dividendoAnual)}<td class="num extra ${R.extra>=(P.ingresosExtra||0)?'preal-up':''}">${R.extra?pf(R.extra):'·'}</td>${_c(R.ahorro,P.ahorroTotal)}${_c(R.aInversion,P.aInversion)}${_c(R.aEfectivo,P.aEfectivo)}${_c(R.gastoMes,P.disponibleMes,true)}</tr>`;
      } else {
        drows+=`<tr class="real"><td class="preal-lbl">Real</td><td class="pend" colspan="12">— se irá cerrando con tus datos; a 31-dic queda como la foto del año —</td></tr>`;
      }
    }
  });
  const dhead=`<tr><th>Año</th><th class="num">Ed.</th><th class="num">Efectivo</th><th class="num">Invertido</th><th class="num">Cartera</th><th class="num tot">Patrimonio</th><th class="num">Nóminas/año</th><th class="num">Div./año</th><th class="num extra">Extra</th><th class="num split1">Ahorro</th><th class="num split2">→&nbsp;Inv.</th><th class="num split3">→&nbsp;Efec.</th><th class="num gcol">Gasto·mes</th></tr>`;
  const _fibtn=_fi
    ? `<span class="proy-fi">📸 Plan fijado: <b>${_proyFechaCorta(_fi.fecha)}</b> <button class="btn ghost sm" id="proyFotoFijar">Actualizar</button> <button class="btn ghost sm" id="proyFotoBorrar" title="Borrar la foto (vuelve a plan editable)">✕</button></span>`
    : `<button class="btn sm" id="proyFotoFijar" title="Congela el plan de hoy como foto fija; a partir de ahí la fila Real compara contra él">📸 Fijar plan (foto)</button>`;
  const _bar=`<div class="proy-cmp"><span class="proy-hint"><span class="badge b-plan">PLAN</span> foto ${_fi?'fija':'editable'} · <span class="badge b-real">REAL</span> de tus datos, cierra el 31-dic</span>${_fibtn}</div>`;
  const deskHTML=`<div class="proy-desk">${_bar}<div class="ptable"><table><thead>${dhead}</thead><tbody>${drows}</tbody></table></div><div class="proy-leg">Fila <b>Real</b> vs Plan: <span class="lg g">mejor/≥</span> <span class="lg r">peor/&lt;</span> · en <b>Gasto·mes</b> verde = gastas ≤ lo previsto · bajo Edad: <b>YTD</b> = año en curso · <b>FY</b> = año cerrado. Reconcilia: Nóminas + Dividendo + Extra − Gastos = Ahorro.</div></div>`;
  /* ---- MÓVIL: fila desplegable por año ---- */
  const mrows=ser.map(r=>{ const pc=_pcls(r.patrimonioReal,r.patrimonio); const rb=r.patrimonioReal!=null?`<span class="rbadge ${pc}">real ${fmt(r.patrimonioReal)}</span>`:''; const op=window._proyYr[r.anio]?' open':'';
    return `<div class="yr${op}${r.trasJub?' tj':''}" data-yr="${r.anio}"><div class="yr-h"><div class="yy"><b>${r.anio}</b><span>${r.edad} años</span></div><div class="yp">${fmt(r.patrimonio)}${rb}</div><span class="arw">▶</span></div><div class="yr-b"><div class="mg"><div class="m"><span>Efectivo</span><b>${fmt(r.efectivo)}</b></div><div class="m"><span>Invertido</span><b>${fmt(r.invertido)}</b></div><div class="m"><span>Cartera teórica</span><b>${fmt(r.cartera)}</b></div><div class="m"><span>Cartera real</span><b>${r.carteraReal!=null?fmt(r.carteraReal):'—'}</b></div><div class="m"><span>Dividendo/año</span><b>${fmt(r.dividendoAnual)}</b></div><div class="m"><span>Disponible/mes</span><b>${fmt(r.disponibleMes)}</b></div></div><div class="split"><div class="split-t">Reparto del ahorro <b>${fmt(r.ahorroTotal)}</b></div><div class="split-row"><label>💶 Ingreso extra<input type="number" step="500" class="extraInput" data-anio="${r.anio}" value="${r.ingresosExtra?Math.round(r.ingresosExtra):''}" placeholder="0"></label><label>→ A inversión<input type="number" step="500" class="aporInput" data-anio="${r.anio}" value="${Math.round(r.aInversion)}"></label><div class="split-ef"><span>→ A efectivo ${r.trasJub?'(a gastos)':'('+(r.anio+1)+')'}</span><b class="${r.aEfectivo>=0?'':'neg'}">${fmt(r.aEfectivo)}</b></div></div></div>${r.gasto?`<div class="gasto">💸 Gasto puntual ${r.gastoCon||''}: <b class="neg">−${fmt(r.gasto)}</b></div>`:''}</div></div>`;
  }).join('');
  const pt=$('#proyTabla'); pt.innerHTML=deskHTML+`<div class="proy-mob">${mrows}</div>`;
  try{ if(typeof renderProyMonteCarlo==='function')renderProyMonteCarlo(); }catch(e){}
}
/* Plegables de Proyección (Hipótesis Inicial / Eventos) y filas por año — enlazado
   ESTÁTICO (una vez) sobre #view-proyeccion, independiente de renderProy: así los
   desplegables funcionan aunque el render falle a mitad. */
function _proyWireToggles(){
  var pv=document.getElementById('view-proyeccion'); if(!pv||pv._proyTogBound)return; pv._proyTogBound=true;
  pv.addEventListener('click',function(e){
    /* Botones de la foto inicial (antes del guard que ignora botones). */
    if(e.target.closest('#proyFotoFijar')){ var _has=!!(DB.config&&DB.config.proyeccion&&DB.config.proyeccion.fotoInicial); if(!_has || confirm('¿Actualizar la foto inicial con el plan de hoy? Se sustituye la anterior.')){ if(typeof proyFijarFotoInicial==='function')proyFijarFotoInicial(); } return; }
    if(e.target.closest('#proyFotoBorrar')){ if(confirm('¿Borrar la foto inicial? La fila Real volverá a compararse con el pronóstico vivo.')){ if(typeof proyBorrarFotoInicial==='function')proyBorrarFotoInicial(); } return; }
    if(e.target.closest('input,button,a,label,select'))return;
    var bh=e.target.closest('.blk-h[data-proyblk]');
    if(bh){ var k=bh.getAttribute('data-proyblk'); var b=bh.parentElement; b.classList.toggle('open'); window._proyBlk=window._proyBlk||{}; window._proyBlk[k]=b.classList.contains('open'); return; }
    var yh=e.target.closest('.yr-h');
    if(yh){ var y=yh.parentElement; y.classList.toggle('open'); var a=y.getAttribute('data-yr'); if(a){ window._proyYr=window._proyYr||{}; window._proyYr[a]=y.classList.contains('open'); } }
  });
}
try{ _proyWireToggles(); }catch(e){}
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
function _amaFmt(v){ return fmt(Math.abs(num(v))<0.005?0:num(v)); }
function setAmaTipo(t){ var h=$('#amaTipo'); if(h)h.value=t; $$('#amaTipoSeg button').forEach(function(b){ b.classList.toggle('on',b.dataset.t===t); }); }
function renderAmalia(){
  wireAllSuggests();
  const fE=$('#amaFecha'); if(fE && !fE.value) fE.value=new Date().toISOString().slice(0,10);
  // ---- Hero: saldo pendiente + totales ----
  let tG=0,tR=0; (DB.amalia||[]).forEach(e=>{ if(e.tipo==='gasto')tG+=num(e.importe); else tR+=num(e.importe); });
  const saldo=tG-tR, settled=Math.abs(saldo)<0.005, n=(DB.amalia||[]).length;
  const hero=$('#amaHero');
  if(hero) hero.innerHTML=
    '<div><div class="big">'+(settled?'Todo reembolsado':'Pendiente de reembolso')+'</div><div class="amt">'+_amaFmt(saldo)+'</div>'+
    '<div class="st">'+(settled?'no te deben nada ahora mismo':'es lo que aún te deben')+'</div></div>'+
    (settled?'<div class="settled">✓ saldado</div>':'')+
    '<div class="spacer"></div><div class="ama-minis">'+
    '<div class="ama-mini"><div class="l">Adelantado</div><div class="v">'+fmt(tG)+'</div></div>'+
    '<div class="ama-mini"><div class="l">Reembolsado</div><div class="v">'+fmt(tR)+'</div></div>'+
    '<div class="ama-mini"><div class="l">Apuntes</div><div class="v">'+n+'</div></div></div>';
  // ---- Saldo corriente (orden cronológico) ----
  const chrono=amaliaSorted(); let run=0; const salMap={};
  chrono.forEach(e=>{ run += e.tipo==='gasto'? num(e.importe):-num(e.importe); salMap[e.id]=run; });
  // ---- Filtros de la lista ----
  const txt=(($('#amaBuscar')||{}).value||'').toLowerCase().trim();
  const ft=(($('#amaFtipo')||{}).value||'');
  const ord=(($('#amaOrden')||{}).value||'desc');
  let list=chrono.slice();
  if(ft) list=list.filter(e=>e.tipo===ft);
  if(txt) list=list.filter(e=>((e.concepto||'')+' '+(e.nota||'')).toLowerCase().indexOf(txt)>=0);
  if(ord==='desc') list=list.reverse();
  const cnt=$('#amaCount'); if(cnt) cnt.textContent=list.length+' apuntes';
  if(!list.length){ $('#amaList').innerHTML='<div class="empty" style="padding:22px;text-align:center;color:#94a3b8">Sin apuntes con esos filtros.</div>'; return; }
  $('#amaList').innerHTML=list.map(e=>{
    const g=e.tipo==='gasto'; const signed=(g?'+':'−')+fmt(e.importe);
    return `<div class="ama-item" data-amaid="${e.id}">
      <div class="ama-ih" data-amarow>
        <span class="ama-arw">▶</span>
        <span class="ama-fch">${ddmmyyyy(e.fecha)}</span>
        <span class="ama-main">${_infEsc(e.concepto||'—')}${e.nota?`<small>${_infEsc(e.nota)}</small>`:''}</span>
        <span class="ama-tp"><span class="ama-tag ${g?'g':'r'}">${g?'Gasto':'Reembolso'}</span></span>
        <span class="ama-imp ${g?'g':'r'}">${signed}</span>
        <span class="ama-sal">${_amaFmt(salMap[e.id])}</span>
      </div>
      <div class="ama-b">
        <div class="ama-dets">
          <div class="d"><span>Nota</span>${e.nota?_infEsc(e.nota):'—'}</div>
          <div class="d"><span>Saldo tras el apunte</span>${_amaFmt(salMap[e.id])}</div>
        </div>
        <div class="ama-acts">
          <button class="btn ghost sm" data-editama="${e.id}">✎ Editar</button>
          <button class="btn danger sm" data-delama="${e.id}">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function resetAmaForm(){
  $('#amaId').value=''; $('#amaConcepto').value=''; $('#amaImporte').value=''; $('#amaNota').value='';
  setAmaTipo('gasto'); $('#amaAdd').textContent='Añadir apunte'; const c=$('#amaCancel'); if(c)c.style.display='none';
}
function editAmalia(id){
  const e=(DB.amalia||[]).find(x=>x.id===id); if(!e)return;
  $('#amaId').value=e.id; $('#amaFecha').value=e.fecha||''; $('#amaConcepto').value=e.concepto||'';
  $('#amaImporte').value=e.importe; $('#amaNota').value=e.nota||''; setAmaTipo(e.tipo==='reembolso'?'reembolso':'gasto');
  $('#amaAdd').textContent='Guardar cambios'; const c=$('#amaCancel'); if(c)c.style.display='inline-block';
  const b=$('#blkAmaAdd'); if(b){ b.classList.add('open'); b.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function addAmalia(){
  const fecha=$('#amaFecha').value; if(!fecha){alert('Pon una fecha');return;}
  const importe=num($('#amaImporte').value); if(!importe){alert('Pon un importe');return;}
  DB.amalia=DB.amalia||[];
  const data={fecha,concepto:$('#amaConcepto').value.trim(),tipo:($('#amaTipo').value==='reembolso'?'reembolso':'gasto'),importe,nota:$('#amaNota').value.trim()};
  const id=$('#amaId').value;
  if(id){ const ex=DB.amalia.find(x=>x.id===id); if(ex)Object.assign(ex,data); }
  else { DB.amalia.push({id:uid(),...data}); }
  resetAmaForm();
  renderAmalia(); scheduleSave();
}
function importAmalia(file){ if(typeof pushSnapshot==='function')pushSnapshot('antes de importar Amalia');
  file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;}
    const arr=Array.isArray(d)?d:(d.amalia||[]); if(!arr.length){alert('El archivo no contiene apuntes');return;}
    DB.amalia=arr.map(e=>({id:uid(),fecha:e.fecha,concepto:e.concepto||'',tipo:e.tipo==='reembolso'?'reembolso':'gasto',importe:num(e.importe),nota:e.nota||''}));
    renderAmalia(); saveNow(); alert('Importados '+DB.amalia.length+' apuntes de Amalia.'); });
}
const R4_RET=0.19; // retención fiscal sobre plusvalía (España, primer tramo)
function r4DesdeRetencion(ret){ ret=num(ret); if(ret<=0) return {retencion:0,bruto:0,neto:0}; const bruto=ret/R4_RET; return {retencion:ret,bruto,neto:bruto-ret}; }
function easySorted(){ return [...(DB.easy||[])].sort((a,b)=> (a.fecha||'')<(b.fecha||'')?-1:(a.fecha||'')>(b.fecha||'')?1:0); }
// === Asignación por clase de activo (asset allocation) + rebalanceo ===
function addClase(){ DB.asignacion=DB.asignacion||[]; DB.asignacion.push({id:'k'+Math.random().toString(36).slice(2,9),nombre:'Nueva clase',actual:0,objetivo:0}); if(typeof saveNow==='function')saveNow(); renderAsignacion(); }
function autorellenarAsignacion(){ DB.asignacion=DB.asignacion||[]; const find=n=>DB.asignacion.find(c=>(c.nombre||'').toLowerCase()===n.toLowerCase());
  const snaps=(typeof patSnaps==='function')?patSnaps():[]; const last=snaps[snaps.length-1]; let ef=0; if(last)(last.lineas||[]).forEach(l=>ef+=num(l.ef));
  const rv=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001).reduce((s,p)=>s+p.acciones*num(p.precioActual),0);
  const setC=(n,val)=>{ let c=find(n); if(!c){ c={id:'k'+Math.random().toString(36).slice(2,9),nombre:n,actual:0,objetivo:0}; DB.asignacion.push(c); } c.actual=Math.round(val); };
  if(ef>0)setC('Efectivo',ef); if(rv>0)setC('Renta variable',rv);
  if(typeof saveNow==='function')saveNow(); renderAsignacion(); }
function renderAsignacion(){ const el=$('#asignBody'); if(!el)return; const cs=DB.asignacion=DB.asignacion||[];
  const total=cs.reduce((s,c)=>s+num(c.actual),0); const totObj=cs.reduce((s,c)=>s+num(c.objetivo),0);
  const rows=cs.map(c=>{ const act=num(c.actual),obj=num(c.objetivo); const actPct=total>0?act/total*100:0; const objEur=total*obj/100; const aMover=objEur-act; const desvPp=actPct-obj;
    const off=obj>0&&Math.abs(desvPp)>5; const col=off?(desvPp>0?'#dc2626':'#d97706'):'#16a34a';
    return `<tr>
      <td><input class="anaInp" data-asign="${c.id}|nombre" value="${(c.nombre||'').replace(/"/g,'&quot;')}" style="width:150px"></td>
      <td class="num"><input type="number" class="anaInp" data-asign="${c.id}|actual" value="${act||''}" style="width:105px;text-align:right"></td>
      <td class="num">${actPct.toFixed(1)}%</td>
      <td class="num"><input type="number" class="anaInp" data-asign="${c.id}|objetivo" value="${obj||''}" style="width:62px;text-align:right"> %</td>
      <td class="num" style="color:${col}">${desvPp>=0?'+':''}${desvPp.toFixed(1)} pp</td>
      <td class="num">${fmt(objEur)}</td>
      <td class="num" style="color:${aMover>=0?'#16a34a':'#dc2626'};font-weight:600">${aMover>=0?'+':''}${fmt(aMover)}</td>
      <td><button class="btn danger sm" data-asigndel="${c.id}">✕</button></td>
    </tr>`; }).join('');
  el.innerHTML=`<div class="toolbar" style="margin-bottom:8px;gap:8px;flex-wrap:wrap"><button class="btn sm" id="asignAdd">+ Clase</button><button class="btn ghost sm" id="asignAuto">Autorrellenar (Efectivo + R.Variable)</button></div>`+(cs.length?`<div style="overflow:auto"><table style="font-size:12px"><thead><tr><th>Clase de activo</th><th class="num">Actual €</th><th class="num">% actual</th><th class="num">% objetivo</th><th class="num">Desviación</th><th class="num">Objetivo €</th><th class="num">A mover</th><th></th></tr></thead><tbody>${rows}<tr style="font-weight:700;background:#eef2f7"><td>TOTAL</td><td class="num">${fmt(total)}</td><td class="num">100%</td><td class="num ${Math.abs(totObj-100)<0.5?'':'neg'}">${totObj.toFixed(0)}%</td><td></td><td></td><td></td><td></td></tr></tbody></table></div><div class="sub" style="margin-top:6px">Rellena <b>Actual €</b> y <b>% objetivo</b> de cada clase. "A mover" = objetivo − actual (verde = aportar/comprar en esa clase; rojo = reducir). Desviación en rojo si te alejas más de 5 puntos del objetivo. ${Math.abs(totObj-100)>=0.5?'<b style="color:#dc2626">⚠ Los % objetivo deberían sumar 100 (ahora '+totObj.toFixed(0)+'%).</b>':''}</div>`:'<div class="empty">Sin clases. Pulsa «Autorrellenar» para partir de Efectivo + Renta variable, o «+ Clase» y añade Renta fija, Inmuebles, Fondos, Oro…</div>');
}
// === Fotos de asignación: congela el reparto por clase en una fecha para ver la evolución ===
function _afEsc(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function guardarFotoAsign(){
  const cs=(DB.asignacion||[]);
  if(!cs.length || cs.reduce((s,c)=>s+num(c.actual),0)<=0){ if(typeof showToast==='function')showToast('Rellena antes el «Actual €» de tus clases de activo en la tabla de arriba.',null,null,3800); return; }
  const total=cs.reduce((s,c)=>s+num(c.actual),0);
  const fecha=new Date().toISOString().slice(0,10);
  DB.asignacionFotos=(DB.asignacionFotos||[]).filter(f=>f.fecha!==fecha); // una foto por día: reemplaza la de hoy
  DB.asignacionFotos.push({ id:'af'+Math.random().toString(36).slice(2,9), fecha:fecha, total:total, clases:cs.map(c=>({nombre:(c.nombre||'—'), actual:num(c.actual)})) });
  if(typeof saveNow==='function')saveNow();
  renderAsignFotos();
  if(typeof showToast==='function')showToast('📸 Foto de asignación guardada ('+ddmmyyyy(fecha)+')',null,null,2500);
}
function renderAsignFotos(){
  const el=document.getElementById('asignFotosBody'); if(!el) return;
  const info=document.getElementById('asignFotoInfo');
  const fotos=(DB.asignacionFotos=DB.asignacionFotos||[]).slice().sort((a,b)=>(a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0)));
  if(!fotos.length){ el.innerHTML='<div class="empty" style="padding:22px">Aún no hay fotos. Pulsa «📸 Guardar foto de hoy» para empezar a registrar la evolución de tu asignación.</div>'; if(info)info.textContent=''; return; }
  // Columnas = nombres de clase; orden según la foto más reciente + extras de fotos antiguas
  const cols=[]; const seen={};
  fotos[fotos.length-1].clases.forEach(c=>{ if(!seen[c.nombre]){seen[c.nombre]=1; cols.push(c.nombre);} });
  fotos.forEach(f=>f.clases.forEach(c=>{ if(!seen[c.nombre]){seen[c.nombre]=1; cols.push(c.nombre);} }));
  const PAL=['#2563eb','#16a34a','#7c3aed','#d97706','#0891b2','#db2777','#65a30d','#0d9488','#9333ea','#e11d48','#f59e0b','#475569'];
  const col={}; cols.forEach((n,i)=>col[n]=PAL[i%PAL.length]);
  const totOf=f=>f.total||f.clases.reduce((s,c)=>s+num(c.actual),0);
  const pctOf=(f,n)=>{ const t=totOf(f); const c=f.clases.find(x=>x.nombre===n); if(!c)return null; return t>0?num(c.actual)/t*100:0; };
  const eurOf=(f,n)=>{ const c=f.clases.find(x=>x.nombre===n); return c?num(c.actual):null; };
  const mix=f=>'<div class="afmix">'+cols.map(n=>{const p=pctOf(f,n);return p?`<i style="width:${p}%;background:${col[n]}"></i>`:'';}).join('')+'</div>';
  const dlt=(f,prev,n)=>{ if(!prev)return ''; const p=pctOf(f,n),pp=pctOf(prev,n); if(p==null||pp==null)return ''; const d=p-pp; const cls=d>0.05?'up':(d<-0.05?'dn':'eq'); const s=d>0.05?'▲':(d<-0.05?'▼':'·'); return `<span class="afdelta ${cls}">${s} ${d>0?'+':''}${d.toFixed(0)}pp</span>`; };
  const leg='<div class="afleg">'+cols.map(n=>`<span><i style="background:${col[n]}"></i>${_afEsc(n)}</span>`).join('')+'</div>';
  const head='<tr><th>Fecha</th>'+cols.map(n=>`<th class="afnum">${_afEsc(n)}</th>`).join('')+'<th class="afnum">Mezcla</th><th class="afnum">Total</th><th></th></tr>';
  let rows='', mob='';
  for(let i=fotos.length-1;i>=0;i--){
    const f=fotos[i], prev=i>0?fotos[i-1]:null, last=i===fotos.length-1;
    rows+=`<tr class="${last?'aflast':''}"><td class="affecha">${ddmmyyyy(f.fecha)}${last?' <span class="afmini">· última</span>':''}</td>`;
    cols.forEach(n=>{ const p=pctOf(f,n); if(p==null){ rows+='<td class="afnum afmuted">—</td>'; return; } rows+=`<td class="afnum"><span class="afpct">${p.toFixed(0)}%</span><span class="afeur">${fmt(eurOf(f,n))}</span>${dlt(f,prev,n)}</td>`; });
    rows+=`<td class="afnum">${mix(f)}</td><td class="afnum aftot">${fmt(totOf(f))}</td><td><button class="btn danger sm" data-asignfotodel="${f.id}">✕</button></td></tr>`;
    mob+=`<div class="afcard ${last?'aflastp':''}"><div class="afcard-h"><span class="afd">${ddmmyyyy(f.fecha)}</span>${last?'<span class="afmini">última</span>':''}<span class="aft">${fmt(totOf(f))}</span><button class="btn danger sm" data-asignfotodel="${f.id}" style="margin-left:4px">✕</button></div>${mix(f)}`;
    cols.forEach(n=>{ const p=pctOf(f,n); if(p==null)return; let dt='—',dc='eq'; if(prev){const pp=pctOf(prev,n); if(pp!=null){const d=p-pp; dc=d>0.05?'up':(d<-0.05?'dn':'eq'); dt=`${d>0?'+':''}${d.toFixed(0)}pp`;}} mob+=`<div class="afrow"><span class="afdot" style="background:${col[n]}"></span><span class="afn">${_afEsc(n)}</span><span class="afp">${p.toFixed(0)}%</span><span class="afdl afdelta ${dc}">${dt}</span></div>`; });
    mob+='</div>';
  }
  el.innerHTML=leg+'<div class="afdesk"><table class="aftbl"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div><div class="afmob">'+mob+'</div>';
  if(info)info.textContent=fotos.length+' foto'+(fotos.length>1?'s':'')+' · desde '+ddmmyyyy(fotos[0].fecha);
}
// === Metas financieras: objetivo € + fecha → progreso y ahorro mensual necesario ===
function addMeta(){ DB.metas=DB.metas||[]; DB.metas.push({id:'m'+Math.random().toString(36).slice(2,9),nombre:'Nueva meta',objetivo:0,fecha:'',actual:0,aporte:0}); if(typeof saveNow==='function')saveNow(); renderMetas(); }
function metaCalc(m){ const now=new Date(); const obj=num(m.objetivo),act=num(m.actual),ap=num(m.aporte); const falta=Math.max(0,obj-act); const prog=obj>0?Math.min(1,act/obj):0;
  let mesesRest=null; if(m.fecha){ const d=new Date(m.fecha+'T00:00:00'); if(!isNaN(d.getTime()))mesesRest=(d.getFullYear()-now.getFullYear())*12+(d.getMonth()-now.getMonth()); }
  const apNec=(mesesRest!=null&&mesesRest>0)?falta/mesesRest:(falta<=0?0:null);
  let estim=''; if(falta>0&&ap>0){ const mm=Math.ceil(falta/ap); const de=new Date(now); de.setMonth(de.getMonth()+mm); estim=de.toISOString().slice(0,7); }
  return {obj,act,ap,falta,prog,mesesRest,apNec,estim}; }
function _metaEstado(c){ let etxt='—',ecol='#64748b';
  if(c.falta<=0&&c.obj>0){ etxt='✓ conseguida'; ecol='#16a34a'; }
  else if(c.mesesRest!=null&&c.mesesRest<=0){ etxt='fecha vencida'; ecol='#dc2626'; }
  else if(c.apNec!=null){ if(c.ap>0){ if(c.ap>=c.apNec-0.005){ etxt='en camino'; ecol='#16a34a'; } else { etxt='aporte corto'; ecol='#dc2626'; } } else { etxt='pon '+fmt(c.apNec)+'/mes'; ecol='#d97706'; } }
  return {etxt,ecol}; }
function renderMetas(){ const el=$('#metasBody'); if(!el)return; const metas=DB.metas=DB.metas||[];
  const explainHTML='<div class="mt-explain">Tus <b>objetivos de ahorro</b> con importe y fecha (entrada de casa, coche, viaje, jubilación…). Tú pones el <b>objetivo</b>, la <b>fecha</b> y lo que llevas <b>ahorrado</b>; la app calcula el <b>progreso</b>, cuánto <b>apartar cada mes</b> para llegar a tiempo y, con tu aporte previsto, <b>cuándo llegarías</b> y si vas en camino.</div>';
  const toolbarHTML='<div class="toolbar" style="margin:0 0 10px"><button class="btn sm" id="metaAdd">+ Meta</button></div>';
  if(!metas.length){ el.innerHTML=explainHTML+toolbarHTML+'<div class="empty">Sin metas. Pulsa «+ Meta» para crear una (entrada de casa, coche, jubilación, viaje…).</div>'; return; }
  const totObj=metas.reduce((s,m)=>s+num(m.objetivo),0), totAct=metas.reduce((s,m)=>s+num(m.actual),0); const gProg=totObj?totAct/totObj:0;
  const kpisHTML='<div class="mt-kpis">'
    +`<div class="k"><div class="l">Objetivo total</div><div class="v">${fmt(totObj)}</div><div class="p">${metas.length} meta${metas.length===1?'':'s'}</div></div>`
    +`<div class="k"><div class="l">Ahorrado</div><div class="v">${fmt(totAct)}</div><div class="p">${(gProg*100).toFixed(0)}% del total</div></div>`
    +`<div class="k hero"><div class="l">Falta por ahorrar</div><div class="v">${fmt(Math.max(0,totObj-totAct))}</div><div class="p">para todas las metas</div></div>`
    +'</div>';
  const rows=metas.map(m=>{ const c=metaCalc(m); const {etxt,ecol}=_metaEstado(c);
    return `<tr>
      <td class="l"><input class="anaInp" data-meta="${m.id}|nombre" value="${(m.nombre||'').replace(/"/g,'&quot;')}" style="width:150px"></td>
      <td><input type="number" class="anaInp" data-meta="${m.id}|objetivo" value="${c.obj||''}" style="width:95px;text-align:right"></td>
      <td class="l"><input type="date" class="anaInp" data-meta="${m.id}|fecha" value="${m.fecha||''}" style="width:132px"></td>
      <td><input type="number" class="anaInp" data-meta="${m.id}|actual" value="${c.act||''}" style="width:95px;text-align:right"></td>
      <td style="min-width:140px"><div class="bar"><i style="width:${(c.prog*100).toFixed(0)}%;background:${c.prog>=1?'#16a34a':'#2563eb'}"></i></div><div class="pl">${(c.prog*100).toFixed(0)}% · falta ${fmt(c.falta)}</div></td>
      <td>${c.mesesRest!=null?c.mesesRest:'—'}</td>
      <td><input type="number" class="anaInp" data-meta="${m.id}|aporte" value="${c.ap||''}" placeholder="${c.apNec!=null?Math.round(c.apNec):''}" style="width:85px;text-align:right"></td>
      <td>${c.apNec!=null?fmt(c.apNec):'—'}</td>
      <td class="l" style="color:${ecol};font-size:11.5px;white-space:nowrap">${etxt}${c.estim?'<br><span class="muted">llegas '+c.estim+'</span>':''}</td>
      <td class="l"><button class="btn danger sm" data-metadel="${m.id}">✕</button></td>
    </tr>`; }).join('');
  const deskHTML='<div class="mt-desk"><table><thead><tr><th>Meta</th><th>Objetivo</th><th>Fecha</th><th>Ahorrado</th><th>Progreso</th><th>Meses</th><th>Aporte/mes</th><th>Necesario</th><th>Estado</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  const mcards=metas.map(m=>{ const c=metaCalc(m); const {etxt,ecol}=_metaEstado(c);
    return `<div class="mcard"><div class="mc-h"><input class="anaInp mc-nm" data-meta="${m.id}|nombre" value="${(m.nombre||'').replace(/"/g,'&quot;')}"><button class="btn danger sm" data-metadel="${m.id}">✕</button></div>
    <div class="bar big"><i style="width:${(c.prog*100).toFixed(0)}%;background:${c.prog>=1?'#16a34a':'#2563eb'}"></i></div>
    <div class="pl2">${(c.prog*100).toFixed(0)}% · falta ${fmt(c.falta)} · <span style="color:${ecol};font-weight:700">${etxt}</span></div>
    <div class="mg"><label class="m"><span>Objetivo</span><input type="number" class="anaInp" data-meta="${m.id}|objetivo" value="${c.obj||''}"></label><label class="m"><span>Fecha</span><input type="date" class="anaInp" data-meta="${m.id}|fecha" value="${m.fecha||''}"></label><label class="m"><span>Ahorrado</span><input type="number" class="anaInp" data-meta="${m.id}|actual" value="${c.act||''}"></label><label class="m"><span>Aporte/mes</span><input type="number" class="anaInp" data-meta="${m.id}|aporte" value="${c.ap||''}" placeholder="${c.apNec!=null?Math.round(c.apNec):''}"></label></div>
    <div class="mt-info">Necesario/mes: <b>${c.apNec!=null?fmt(c.apNec):'—'}</b>${c.mesesRest!=null?' · '+c.mesesRest+' meses':''}${c.estim?' · a tu ritmo llegas <b>'+c.estim+'</b>':''}</div></div>`; }).join('');
  const mobHTML='<div class="mt-mob">'+mcards+'</div>';
  const legendHTML='<div class="mt-legend"><div class="lt">¿Qué significa cada valor?</div><dl><dt>Objetivo</dt><dd>La cantidad total que quieres reunir para esa meta.</dd><dt>Fecha</dt><dd>Cuándo quieres tenerla lista. Vacía = no se calculan meses ni aporte necesario.</dd><dt>Ahorrado</dt><dd>Lo que llevas guardado. <b>Lo actualizas tú</b>.</dd><dt>Progreso</dt><dd>Qué parte del objetivo ya tienes (ahorrado ÷ objetivo) y cuánto falta.</dd><dt>Meses</dt><dd>Los que quedan hasta la fecha objetivo.</dd><dt>Aporte/mes</dt><dd>Lo que prevés apartar cada mes (lo pones tú).</dd><dt>Necesario</dt><dd>Lo que <b>deberías</b> apartar al mes para llegar a tiempo: lo que falta ÷ meses restantes.</dd><dt>Estado</dt><dd><b style="color:#16a34a">En camino</b> si tu aporte cubre el necesario; <b style="color:#dc2626">aporte corto</b> si no; y a qué mes llegarías a tu ritmo.</dd></dl></div>';
  el.innerHTML=explainHTML+kpisHTML+toolbarHTML+deskHTML+mobHTML+legendHTML;
}
function setR4Tipo(t){ var h=$('#r4Tipo'); if(h)h.value=t; $$('#r4TipoSeg button').forEach(function(b){ b.classList.toggle('on',b.dataset.t===t); }); var rw=$('#r4NetoWrap'); if(rw)rw.style.display=(t==='retirada'?'':'none'); }
function renderFondoR4(){
  const fE=$('#r4Fecha'); if(fE && !fE.value) fE.value=new Date().toISOString().slice(0,10);
  const asc=easySorted();
  const Y=new Date().getFullYear();
  let inv=0, valorAct=null, valorFecha='', netoAnio=0, brutoAnio=0, netoTot=0;
  const acumMap={}, plusMap={};
  asc.forEach(e=>{ inv += e.tipo==='retirada'? -num(e.importe): num(e.importe); acumMap[e.id]=inv;
    const val=(e.valor!=null&&e.valor!=='')?num(e.valor):null; plusMap[e.id]=(val!=null)?val-inv:null;
    if(val!=null){ valorAct=val; valorFecha=e.fecha||''; }
    if(e.tipo==='retirada' && e.neto!=null && e.neto!==''){ const n=num(e.neto), b=num(e.bruto); netoTot+=n; if((e.fecha||'').slice(0,4)===String(Y)){ netoAnio+=n; brutoAnio+=b; } }
  });
  const plusv=(valorAct!=null)?valorAct-inv:null;
  const cardEl=$('#r4Cards');
  if(cardEl) cardEl.innerHTML=
    '<div class="r4-kpi"><div class="l">Valor del fondo</div><div class="v">'+(valorAct!=null?fmt(valorAct):'—')+'</div><div class="s">'+(valorFecha?('al '+ddmmyyyy(valorFecha)):'sin valor registrado')+'</div></div>'+
    '<div class="r4-kpi"><div class="l">Saldo aportado (neto)</div><div class="v">'+fmt(inv)+'</div><div class="s">'+(DB.easy||[]).length+' movimientos</div></div>'+
    '<div class="r4-kpi"><div class="l">Plusvalía latente</div><div class="v '+(plusv!=null?(plusv>=0?'pos':'neg'):'')+'">'+(plusv!=null?((plusv>=0?'+':'')+fmt(plusv)):'—')+'</div><div class="s">'+(plusv!=null&&inv>0?((plusv/inv>=0?'+':'')+(plusv/inv*100).toFixed(2)+'%'):'')+'</div></div>'+
    '<div class="r4-kpi"><div class="l">Interés neto '+Y+'</div><div class="v '+(netoAnio>=0?'pos':'neg')+'">'+(netoAnio>=0?'+':'')+fmt(netoAnio)+'</div><div class="s">bruto '+fmt(brutoAnio)+' · histórico '+fmt(netoTot)+'</div></div>';
  const listEl=$('#r4List'); if(!listEl) return;
  const txt=(($('#r4Buscar')||{}).value||'').toLowerCase().trim();
  const ft=(($('#r4Ftipo')||{}).value||'');
  let list=asc.slice();
  if(ft) list=list.filter(e=>e.tipo===ft);
  if(txt) list=list.filter(e=>(ddmmyyyy(e.fecha)||'').toLowerCase().indexOf(txt)>=0 || (e.fecha||'').indexOf(txt)>=0);
  const ord=(($('#r4Orden')||{}).value||'desc');
  if(ord==='desc') list=list.slice().reverse();
  const cnt=$('#r4Count'); if(cnt)cnt.textContent=list.length+' movimientos';
  if(!list.length){ listEl.innerHTML='<div class="empty" style="padding:22px;text-align:center;color:#94a3b8">Sin movimientos con esos filtros.</div>'; return; }
  listEl.innerHTML=list.map(e=>{
    const ap=e.tipo==='aportacion'; const esVal=num(e.importe)===0; const signed=esVal?'—':((ap?'+':'−')+fmt(num(e.importe)));
    const acum=acumMap[e.id], plus=plusMap[e.id];
    const val=(e.valor!=null&&e.valor!=='')?num(e.valor):null;
    return '<div class="r4-item" data-r4id="'+e.id+'"><div class="r4-ih" data-r4row="'+e.id+'">'+
      '<span class="r4-arw">▶</span>'+
      '<span class="r4-fch">'+ddmmyyyy(e.fecha)+'</span>'+
      '<span class="r4-tp"><span class="r4-tag '+(ap?'ap':'re')+'"'+(esVal?' style="background:#eef2ff;color:#4338ca"':'')+'>'+(esVal?'Valoración':(ap?'Aportación':'Retirada'))+'</span></span>'+
      '<span class="r4-imp '+(ap?'pos':'neg')+'"'+(esVal?' style="color:#94a3b8"':'')+'>'+signed+'</span>'+
      '<span class="r4-n">'+fmt(acum)+'</span>'+
      '<span class="r4-n">'+(val!=null?fmt(val):'—')+'</span>'+
      '<span class="r4-meta">Acum. '+fmt(acum)+' · Valor '+(val!=null?fmt(val):'—')+'</span>'+
      '</div><div class="r4-b"><div class="r4-dets">'+
        '<div class="d"><span>Plusvalía</span>'+(plus!=null?('<b class="'+(plus>=0?'pos':'neg')+'">'+(plus>=0?'+':'')+fmt(plus)+'</b>'):'—')+'</div>'+
        '<div class="d"><span>Retención</span>'+((e.retencion!=null&&e.retencion!=='')?fmt(num(e.retencion))+' €':'—')+'</div>'+
        '<div class="d"><span>Interés bruto</span>'+((e.bruto!=null&&e.bruto!=='')?fmt(num(e.bruto))+' €':'—')+'</div>'+
        '<div class="d"><span>Interés neto</span>'+((e.neto!=null&&e.neto!=='')?'<b class="pos">'+fmt(num(e.neto))+' €</b>':'—')+'</div>'+
      '</div><div class="r4-acts"><button class="btn ghost sm" data-editr4="'+e.id+'">✎ Editar</button><button class="btn danger sm" data-delr4="'+e.id+'">🗑 Eliminar</button></div></div></div>';
  }).join('');
}
function resetR4Form(){
  $('#r4Id').value=''; $('#r4Importe').value=''; $('#r4Valor').value=''; if($('#r4Ret'))$('#r4Ret').value=''; if($('#r4RetCalc'))$('#r4RetCalc').textContent='';
  setR4Tipo('aportacion'); $('#r4Add').textContent='Añadir movimiento'; var c=$('#r4Cancel'); if(c)c.style.display='none';
}
function editFondoR4(id){
  var e=(DB.easy||[]).find(x=>x.id===id); if(!e)return;
  $('#r4Id').value=e.id; $('#r4Fecha').value=e.fecha||''; $('#r4Importe').value=num(e.importe);
  $('#r4Valor').value=(e.valor!=null&&e.valor!=='')?num(e.valor):'';
  setR4Tipo(e.tipo==='retirada'?'retirada':'aportacion');
  if($('#r4Ret')) $('#r4Ret').value=(e.retencion!=null&&e.retencion!=='')?num(e.retencion):'';
  if($('#r4RetCalc')){ if(e.retencion){ var c=r4DesdeRetencion(e.retencion); $('#r4RetCalc').textContent=' → bruto '+fmt(c.bruto)+' · neto '+fmt(c.neto); } else $('#r4RetCalc').textContent=''; }
  $('#r4Add').textContent='Guardar cambios'; var cc=$('#r4Cancel'); if(cc)cc.style.display='inline-block';
  var b=$('#blkR4Add'); if(b){ b.classList.add('open'); b.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function addFondoR4(){
  const fecha=$('#r4Fecha').value; if(!fecha){alert('Pon una fecha');return;}
  const importe=num($('#r4Importe').value);
  const valRaw=$('#r4Valor').value; const retRaw=$('#r4Ret')?$('#r4Ret').value:'';
  /* Se permite importe 0 siempre que se anote el valor del fondo: sirve para registrar solo la
     valoración en una fecha (la plusvalía = valor − aportado acumulado marca la rentabilidad
     acumulada en ese momento, sin aportar ni retirar). */
  if(!importe && valRaw===''){ alert('Pon un importe, o solo el valor del fondo para anotar la valoración (0 €)'); return; }
  const tipo=$('#r4Tipo').value==='retirada'?'retirada':'aportacion';
  DB.easy=DB.easy||[];
  const ret=(tipo==='retirada' && retRaw!=='' && num(retRaw)>0)?r4DesdeRetencion(retRaw):null;
  const id=$('#r4Id').value;
  if(id){ const ex=DB.easy.find(x=>x.id===id); if(ex){ ex.fecha=fecha; ex.tipo=tipo; ex.importe=Math.abs(importe);
      if(valRaw!=='') ex.valor=num(valRaw); else delete ex.valor;
      if(ret){ ex.retencion=ret.retencion; ex.bruto=ret.bruto; ex.neto=ret.neto; } else { delete ex.retencion; delete ex.bruto; delete ex.neto; } } }
  else { const mov={id:uid(),fecha,tipo,importe:Math.abs(importe)}; if(valRaw!=='') mov.valor=num(valRaw); if(ret){ mov.retencion=ret.retencion; mov.bruto=ret.bruto; mov.neto=ret.neto; } DB.easy.push(mov); }
  resetR4Form();
  renderFondoR4(); scheduleSave();
}
function importFondoR4(file){ if(typeof pushSnapshot==='function')pushSnapshot('antes de importar Fondo R4');
  file.text().then(txt=>{ let d; try{d=JSON.parse(txt);}catch(e){alert('JSON no válido');return;}
    const arr=Array.isArray(d)?d:(d.easy||d.movimientos||[]); if(!arr.length){alert('El archivo no contiene movimientos');return;}
    DB.easy=arr.map(e=>{ const m={id:uid(),fecha:e.fecha,tipo:(e.tipo==='retirada'?'retirada':'aportacion'),importe:Math.abs(num(e.importe))};
      if(e.valor!=null&&e.valor!=='') m.valor=num(e.valor);
      if(e.retencion!=null&&e.retencion!==''&&num(e.retencion)>0){ const c=r4DesdeRetencion(e.retencion); m.retencion=c.retencion; m.bruto=c.bruto; m.neto=c.neto; }
      else { if(e.bruto!=null&&e.bruto!=='') m.bruto=num(e.bruto); if(e.neto!=null&&e.neto!=='') m.neto=num(e.neto); }
      return m; });
    renderFondoR4(); saveNow(); alert('Importados '+DB.easy.length+' movimientos del Fondo R4.'); });
}
function renderPresExtras(){
  const sec=document.getElementById('ptab-anual')||document.getElementById('view-presupuesto'); if(!sec)return;
  // por si en una carga previa quedaron colgados de la sección (fuera de la pestaña), reubicarlos
  ['ahorroWrap','varGastoWrap'].forEach(id=>{ const w=document.getElementById(id); if(w && w.parentElement!==sec){ const h=w.previousElementSibling; if(h&&h.tagName==='H3')sec.appendChild(h); sec.appendChild(w); } });
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
function importPresupuesto(file){ if(typeof pushSnapshot==='function')pushSnapshot('antes de importar presupuesto');
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

/* ===== P4.2 · «El origen»: bloque dinámico «entonces → hoy» (solo lectura) ===== */
function renderOrigen(){
  var sec=document.getElementById('view-origen'); if(!sec) return;
  var host=document.getElementById('origenEval');
  var oldD=document.getElementById('origenDinamico'); if(oldD)oldD.remove();
  if(!renderOrigen._bound){ renderOrigen._bound=true;
    sec.addEventListener('click',function(ev){ var h=ev.target.closest('[data-orblk]'); if(!h)return; var b=document.getElementById(h.getAttribute('data-orblk')); if(b)b.classList.toggle('open'); });
  }
  if(!host) return;
  var snaps=(typeof patSnaps==='function')?patSnaps():[];
  var last=snaps.length?snapTot(snaps[snaps.length-1]):{ef:0,inv:0};
  var efHoy=num(last.ef), invHoy=num(last.inv), totHoy=efHoy+invHoy;
  var efPctHoy=totHoy>0?(efHoy/totHoy*100):0;
  var yr=(typeof baseYear==='function')?baseYear():new Date().getFullYear();
  var byId={}; (DB.categorias||[]).forEach(function(c){byId[c.id]=c;});
  var ingMes=0,gasAnu=0;
  (DB.categorias||[]).forEach(function(c){ if(c.tipo==='ingreso'){ var pp=(typeof presFor==='function')?presFor(c.id,yr):null; if(pp)ingMes+=mensual(pp); } });
  (DB.presupuesto||[]).filter(function(x){return pAnio(x)===yr;}).forEach(function(x){ var c=byId[x.categoriaId]; if(c&&c.tipo==='gasto')gasAnu+=anual(x); });
  var gasMes=gasAnu/12;
  var INI=102621.74, P={total:222000,ef:112000,rv:110000,efPct:50.5,ing:6830.68,gas:3457};
  var crec=INI>0?(totHoy/INI):0;
  var pctCumpl=P.total>0?(totHoy/P.total):0;
  var rumboCls,rumboTxt;
  if(pctCumpl>=1){rumboCls='';rumboTxt='Por delante del plan';}
  else if(pctCumpl>=0.9){rumboCls=' amber';rumboTxt='En línea con el plan';}
  else {rumboCls=' red';rumboTxt='Por detrás del plan';}
  function eur(v){return fmt(v);}
  function rowE(label,plan,hoy,higherBetter){ var d=hoy-plan; var fav=higherBetter?(d>=0):(d<=0); return '<tr><td>'+label+'</td><td class="num">'+eur(plan)+'</td><td class="num"><b>'+eur(hoy)+'</b></td><td class="num '+(fav?'pos':'neg')+'">'+(d>=0?'+':'')+fmt(d)+'</td></tr>'; }
  function rowP(label,plan,hoy){ var d=hoy-plan; return '<tr><td>'+label+'</td><td class="num">'+plan.toFixed(1)+'%</td><td class="num"><b>'+hoy.toFixed(1)+'%</b></td><td class="num">'+(d>=0?'+':'')+d.toFixed(1)+' pp</td></tr>'; }
  host.innerHTML=
    '<div class="et">Entonces → hoy · el plan frente a la realidad</div>'+
    '<div class="ed">Se calcula con tus datos actuales (patrimonio, ingresos y gastos del año '+yr+'). Solo lectura.</div>'+
    '<div class="or-growth">'+
      '<div class="or-gcard"><div class="l">Patrimonio en el origen (05/02/2019)</div><div class="v">'+eur(INI)+'</div></div>'+
      '<div class="or-gcard"><div class="l">Patrimonio hoy</div><div class="v">'+eur(totHoy)+'</div></div>'+
      '<div class="or-gcard"><div class="l">Crecimiento</div><div class="v">×'+crec.toFixed(2)+' · '+(crec>=1?'+':'')+((crec-1)*100).toFixed(0)+'%</div></div>'+
    '</div>'+
    '<div class="or-tw"><table class="or-evt"><thead><tr><th>Concepto</th><th class="num">Plan 2026</th><th class="num">Hoy</th><th class="num">&#916;</th></tr></thead><tbody>'+
      rowE('Patrimonio total',P.total,totHoy,true)+
      rowE('Efectivo',P.ef,efHoy,true)+
      rowE('R. Variable',P.rv,invHoy,true)+
      rowP('% Efectivo',P.efPct,efPctHoy)+
      rowE('Ingresos / mes',P.ing,ingMes,true)+
      rowE('Gastos / mes',P.gas,gasMes,false)+
    '</tbody></table></div>'+
    '<div style="margin-top:12px"><span class="or-badge'+rumboCls+'">'+rumboTxt+' &middot; '+(pctCumpl*100).toFixed(0)+'% del objetivo 2026</span></div>';
}

