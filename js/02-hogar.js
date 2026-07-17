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
function baseYear(){ return (DB.config&&DB.config.anioBasePresupuesto)||2026; }
function pAnio(p){ return p.anio||baseYear(); }
function presFor(id,year){ return DB.presupuesto.find(p=>p.categoriaId===id && pAnio(p)===year); }
function presYears(){ const s=new Set(DB.presupuesto.map(pAnio)); s.add(new Date().getFullYear()); if(presYear) s.add(presYear); return [...s].sort((a,b)=>b-a); }
function fillPresYear(){
  const ys=presYears();
  const sel=$('#presYear');
  if(sel){ sel.innerHTML=''; ys.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;sel.appendChild(o);}); sel.value=presYear; }
  const sel2=$('#presDesgloseYear');
  if(sel2){ const prev=+sel2.value; sel2.innerHTML=''; ys.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;sel2.appendChild(o);}); sel2.value=(prev&&ys.includes(prev))?prev:presYear; }
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
  const prevPref = isYear? (''+(curYear-1)) : ((curYear-1)+'-'+String(curMonth+1).padStart(2,'0'));
  const prevMovs = DB.movimientos.filter(m=>m.fecha.startsWith(prevPref));
  const pIng=prevMovs.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+num(m.importe),0);
  const pGas=prevMovs.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+num(m.importe),0);
  const pAho=pIng-pGas; const hasPrev=prevMovs.length>0;
  const yMovs=DB.movimientos.filter(m=>(m.fecha||'').startsWith(''+curYear));
  const ingA=yMovs.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+num(m.importe),0);
  const gasA=yMovs.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+num(m.importe),0);
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
  const groups={};
  DB.categorias.filter(c=>c.tipo==='gasto').forEach(c=>{
    const p=presFor(c.id,curYear); const pres=(p?mensual(p):0)*mult;
    const real=movs.filter(m=>m.categoriaId===c.id&&m.tipo==='gasto').reduce((s,m)=>s+num(m.importe),0);
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
  if(_isb) _isb.addEventListener('click',function(){ try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(_infOrden); }catch(e){} });
}
function _hemEsc(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _hemFecha(n){ var m=(''+n).match(/(\d{4})-(\d{2})-(\d{2})/); return m?(m[1]+m[2]+m[3]):'00000000'; }
function renderHemeroteca(){
  var sec=document.getElementById('view-hemeroteca'); if(!sec) return;
  var api='https://api.github.com/repos/chernanzfinanzas-gif/economia-domestica/contents/informes-semanales';
  var pages='https://chernanzfinanzas-gif.github.io/economia-domestica/informes-semanales/';
  sec.innerHTML='<h2>Hemeroteca de Informes Semanales</h2><div class="sub" style="margin-bottom:10px">Informes semanales de cartera (coyuntura y riesgo) archivados en el repositorio. Se generan con el botón «🧾 Informe semanal (Claude)» del Panel.</div><div id="hemeroSemanal"><div class="muted" style="font-size:13px">Cargando informes…</div></div>';
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  var host=document.getElementById('hemeroSemanal');
  fetch(api,{cache:'no-store',headers:{'Accept':'application/vnd.github+json'}}).then(function(r){return r.ok?r.json():null;}).then(function(arr){
    if(!Array.isArray(arr))arr=[];
    var pdfs=arr.filter(function(f){return /\.pdf$/i.test(f.name||'');});
    pdfs.sort(function(a,b){ var fa=_hemFecha(a.name), fb=_hemFecha(b.name); return fa<fb?1:(fa>fb?-1:0); }); // más reciente arriba (por fecha del nombre)
    if(!pdfs.length){ host.innerHTML='<div class="muted" style="font-size:13px">Aún no hay informes archivados. Genera uno con «🧾 Informe semanal (Claude)» en el Panel y sube el PDF a la carpeta <code>informes-semanales/</code> del repositorio.</div>'; return; }
    var rows=pdfs.map(function(f){ var m=(f.name||'').match(/(\d{4})-(\d{2})-(\d{2})/); var fecha=m?(m[3]+'/'+m[2]+'/'+m[1]):(f.name||''); var url=pages+encodeURIComponent(f.name);
      return '<tr><td><b>'+fecha+'</b></td><td class="muted" style="font-size:11px">'+_hemEsc(f.name||'')+'</td><td class="right"><a class="btn sm" href="'+url+'" target="_blank" rel="noopener" style="text-decoration:none">📄 Abrir PDF</a></td></tr>'; }).join('');
    host.innerHTML='<div style="overflow:auto"><table style="font-size:13px"><thead><tr><th>Semana</th><th>Archivo</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="muted" style="font-size:11px;margin-top:6px">'+pdfs.length+' informe(s) · se abren desde GitHub Pages.</div>';
  }).catch(function(){ host.innerHTML='<div class="muted" style="font-size:13px">No se pudo cargar la lista (sin conexión o límite temporal de la API de GitHub). Reinténtalo en un rato.</div>'; });
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
    return `<tr${m.tipo==='ingreso'?' style="background:#dcfce7"':''}>
      <td>${ddmmyyyy(m.fecha)}</td>
      <td>${m.concepto||''}</td>
      <td>${m.comercio?`<span class="tag">${m.comercio}</span>`:''}</td>
      <td><input class="movDetInp" data-mid="${m.id}" value="${escAttr(m.detalle||'')}" placeholder="—" style="width:100%;min-width:120px;font-size:12px;padding:2px 4px;border:1px solid #e5e7eb;border-radius:4px;background:#fff"></td>
      <td><span class="tag">${c?c.nombre:'—'}</span></td>
      <td>${m.titular||''}</td>
      <td class="num ${eff>=0?'pos':'neg'}">${signed}</td>
      <td class="right"><div class="row-actions" style="justify-content:flex-end">
        <button class="btn ghost sm" data-edit="${m.id}">Editar</button>
        <button class="btn danger sm" data-del="${m.id}">✕</button></div></td>
    </tr>`;
  }).join('');
  $('#movTable').innerHTML=`<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Comercio</th><th>Detalle</th><th>Categoría</th><th>Titular</th><th class="num">Importe</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
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

/* ----- PRESUPUESTO · DESGLOSE MENSUAL (réplica hoja anual del Excel) ----- */
/* Cada concepto = 2 filas: Pres. (presupuestado) y Real (ejecutado). 15 columnas:
   Concepto | Tipo | Ene..Dic | Total. Orden: INGRESOS, bloque resumen, gastos. */
function renderPresDesglose(){
  const el=$('#presDesglose'); if(!el) return;
  const ysel=$('#presDesgloseYear');
  const year=(ysel&&+ysel.value) || +presYear || new Date().getFullYear();
  // Realizado por categoría y mes (desde Movimientos)
  const realCat={};
  (DB.movimientos||[]).forEach(m=>{
    if(!m.fecha || (+m.fecha.slice(0,4))!==year) return;
    const mi=(+m.fecha.slice(5,7))-1; if(mi<0||mi>11) return;
    (realCat[m.categoriaId]=realCat[m.categoriaId]||new Array(12).fill(0))[mi]+=num(m.importe);
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
        `<td class="muted dg-b">Pres.</td>${bTds}<td class="num">${bTot?f2(bTot):'·'}</td></tr>`+
      `<tr class="dg-real"><td class="muted">Real</td>${rTds}<td class="num"${rColor}><b>${rTot?f2(rTot):'·'}</b></td></tr>`;
  };
  // Agrupar categorías (Ingresos primero, resto alfabético)
  const groups={};
  DB.categorias.forEach(c=>{(groups[c.grupo]=groups[c.grupo]||[]).push(c);});
  const order=Object.keys(groups).sort((a,b)=> a==='Ingresos'?-1:b==='Ingresos'?1:a.localeCompare(b));
  const catsConDato=g=> (groups[g]||[]).filter(c=> (presMens[c.id]||0)>0 || (realCat[c.id]&&realCat[c.id].some(v=>Math.abs(v)>0.005)) );
  const bandRow=(g)=>{
    let bp=0,br=0; (groups[g]||[]).forEach(c=>{ bp+=(presMens[c.id]||0)*12; br+=realYear(c.id); });
    return `<tr class="grp-row"><td colspan="15">${g} <span class="muted" style="font-weight:400">· Pres. ${fmt(bp)} / Real ${fmt(br)}</span></td></tr>`;
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
    return `<tr class="${cls}"><td colspan="2"><b>${lbl}</b></td>${tds}<td class="num${negT?' dg-neg':''}"><b>${f2(tot)}</b></td></tr>`;
  };
  const resumen =
      sumRow('Total INGRESOS (real)',ingReal,'grp-row r-verde')+
      sumRow('Ingreso presupuestado',ingPres,'')+
      sumRow('Gasto presupuestado',gasPres,'')+
      sumRow('Gasto realizado',gasReal,'')+
      sumRow('Ahorro presupuestado',ahoPrev,'grp-row',true)+
      sumRow('Ahorro logrado',ahoLog,'grp-row r-verde',true);
  // Montaje: INGRESOS → resumen → gastos
  let body='';
  const ing=catsConDato('Ingresos'); if(ing.length) body+=bandRow('Ingresos')+ing.map(conceptRows).join('');
  body+=`<tr class="grp-row r-amar"><td colspan="15"><b>RESUMEN</b></td></tr>`+resumen;
  order.filter(g=>g!=='Ingresos').forEach(g=>{ const cs=catsConDato(g); if(!cs.length)return; body+=bandRow(g)+cs.map(conceptRows).join(''); });
  const head=`<tr><th style="text-align:left">Concepto</th><th></th>${short.map(m=>`<th class="num">${m}</th>`).join('')}<th class="num">Total</th></tr>`;
  const hasData=ing.length || order.some(g=>g!=='Ingresos'&&catsConDato(g).length);
  el.innerHTML=`<table class="tbl-desglose"><thead>${head}</thead><tbody>${body}</tbody></table>`
    + (hasData?'':`<p class="muted" style="margin-top:8px">Sin conceptos con presupuesto o movimientos en ${year}.</p>`);
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
  const _titN=(typeof perfilTitulares==='function'&&perfilTitulares().length)?perfilTitulares():['Carlos','Susana']; const nominaMes=_titN.reduce(function(a,n){return a+mes('Nómina '+n);},0)+mes('Pagas Extra');
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
  $('#proyTabla').innerHTML=`<style>#proyTabla table{font-size:10px}#proyTabla th{padding:3px 5px}#proyTabla td{padding:3px 5px;white-space:nowrap}#proyTabla td:nth-child(1){white-space:normal}#proyTabla th:nth-child(13),#proyTabla td:nth-child(13),#proyTabla th:nth-child(15),#proyTabla td:nth-child(15){display:none}</style><table><thead><tr><th>Año</th><th class="num">Edad</th><th class="num">Efectivo</th><th class="num">Efectivo real</th><th class="num">Invertido</th><th class="num">Cartera teórica</th><th class="num">Cartera real</th><th class="num">Patrimonio teórico</th><th class="num">Patrimonio real</th><th class="num">Dividendo/año</th><th class="num">Ahorro/año</th><th class="num">A Inversión</th><th class="num">A Efectivo</th><th class="num">Disponible/mes</th><th>Gasto puntual</th></tr></thead><tbody>${rows}</tbody></table><div style="font-size:11px;color:#64748b;margin-top:6px">Patrimonio real (años ya vividos) vs objetivo teórico: <span style="background:#dcfce7;padding:1px 6px;border-radius:4px">≥ objetivo</span> <span style="background:#fef9c3;padding:1px 6px;border-radius:4px">95–100%</span> <span style="background:#fee2e2;padding:1px 6px;border-radius:4px">por debajo</span></div>`;
  if(typeof renderProyMonteCarlo==='function')renderProyMonteCarlo();
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
  wireAllSuggests();
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
// === Metas financieras: objetivo € + fecha → progreso y ahorro mensual necesario ===
function addMeta(){ DB.metas=DB.metas||[]; DB.metas.push({id:'m'+Math.random().toString(36).slice(2,9),nombre:'Nueva meta',objetivo:0,fecha:'',actual:0,aporte:0}); if(typeof saveNow==='function')saveNow(); renderMetas(); }
function metaCalc(m){ const now=new Date(); const obj=num(m.objetivo),act=num(m.actual),ap=num(m.aporte); const falta=Math.max(0,obj-act); const prog=obj>0?Math.min(1,act/obj):0;
  let mesesRest=null; if(m.fecha){ const d=new Date(m.fecha+'T00:00:00'); if(!isNaN(d.getTime()))mesesRest=(d.getFullYear()-now.getFullYear())*12+(d.getMonth()-now.getMonth()); }
  const apNec=(mesesRest!=null&&mesesRest>0)?falta/mesesRest:(falta<=0?0:null);
  let estim=''; if(falta>0&&ap>0){ const mm=Math.ceil(falta/ap); const de=new Date(now); de.setMonth(de.getMonth()+mm); estim=de.toISOString().slice(0,7); }
  return {obj,act,ap,falta,prog,mesesRest,apNec,estim}; }
function renderMetas(){ const el=$('#metasBody'); if(!el)return; const metas=DB.metas=DB.metas||[];
  const rows=metas.map(m=>{ const c=metaCalc(m); let etxt='—',ecol='#64748b';
    if(c.falta<=0&&c.obj>0){ etxt='✓ conseguida'; ecol='#16a34a'; }
    else if(c.mesesRest!=null&&c.mesesRest<=0){ etxt='fecha vencida'; ecol='#dc2626'; }
    else if(c.apNec!=null){ if(c.ap>0){ if(c.ap>=c.apNec-0.005){ etxt='en camino'; ecol='#16a34a'; } else { etxt='aporte corto'; ecol='#dc2626'; } } else { etxt='pon '+fmt(c.apNec)+'/mes'; ecol='#d97706'; } }
    return `<tr>
      <td><input class="anaInp" data-meta="${m.id}|nombre" value="${(m.nombre||'').replace(/"/g,'&quot;')}" style="width:150px"></td>
      <td class="num"><input type="number" class="anaInp" data-meta="${m.id}|objetivo" value="${c.obj||''}" style="width:95px;text-align:right"></td>
      <td><input type="date" class="anaInp" data-meta="${m.id}|fecha" value="${m.fecha||''}" style="width:132px"></td>
      <td class="num"><input type="number" class="anaInp" data-meta="${m.id}|actual" value="${c.act||''}" style="width:95px;text-align:right"></td>
      <td style="min-width:130px"><div class="bar"><i style="width:${(c.prog*100).toFixed(0)}%;background:${c.prog>=1?'#16a34a':'#2563eb'}"></i></div><div class="muted" style="font-size:10px">${(c.prog*100).toFixed(0)}% · falta ${fmt(c.falta)}</div></td>
      <td class="num">${c.mesesRest!=null?c.mesesRest:'—'}</td>
      <td class="num"><input type="number" class="anaInp" data-meta="${m.id}|aporte" value="${c.ap||''}" placeholder="${c.apNec!=null?Math.round(c.apNec):''}" style="width:85px;text-align:right"></td>
      <td class="num">${c.apNec!=null?fmt(c.apNec):'—'}</td>
      <td style="color:${ecol};font-size:11px;white-space:nowrap">${etxt}${c.estim?'<br><span class="muted">llegas '+c.estim+'</span>':''}</td>
      <td><button class="btn danger sm" data-metadel="${m.id}">✕</button></td>
    </tr>`; }).join('');
  el.innerHTML=`<div class="toolbar" style="margin-bottom:8px"><button class="btn sm" id="metaAdd">+ Meta</button></div>`+(metas.length?`<div style="overflow:auto"><table style="font-size:12px"><thead><tr><th>Meta</th><th class="num">Objetivo</th><th>Fecha</th><th class="num">Ahorrado</th><th>Progreso</th><th class="num">Meses</th><th class="num">Aporte/mes</th><th class="num">Necesario</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="sub" style="margin-top:6px">"Ahorrado" lo actualizas tú. "Necesario" = lo que falta ÷ meses hasta la fecha. Si pones un "Aporte/mes", te dice cuándo llegarías y si vas en camino.</div>`:'<div class="empty">Sin metas. Pulsa «+ Meta» para crear una (entrada de casa, coche, jubilación, viaje…).</div>');
}
function renderFondoR4(){
  const fE=$('#r4Fecha'); if(fE && !fE.value) fE.value=new Date().toISOString().slice(0,10);
  const asc=easySorted();
  const Y=new Date().getFullYear();
  let inv=0, valorAct=null, valorFecha='', netoAnio=0, netoTot=0, brutoAnio=0, brutoTot=0;
  asc.forEach(e=>{ inv += e.tipo==='retirada'? -num(e.importe): num(e.importe);
    if(e.valor!=null && e.valor!=='' ){ valorAct=num(e.valor); valorFecha=e.fecha||''; }
    if(e.tipo==='retirada' && e.neto!=null && e.neto!==''){ const n=num(e.neto), b=num(e.bruto); netoTot+=n; brutoTot+=b; if((e.fecha||'').slice(0,4)===String(Y)){ netoAnio+=n; brutoAnio+=b; } }
  });
  const plusv = (valorAct!=null)? valorAct-inv : null;
  const cardEl=$('#r4Cards');
  if(cardEl) cardEl.innerHTML=[
    {l:'Valor del fondo',v:(valorAct!=null?fmt(valorAct):'—'),cls:'',s:(valorFecha?('al '+ddmmyyyy(valorFecha)):'sin valor registrado')},
    {l:'Saldo aportado (neto)',v:fmt(inv),cls:'',s:(DB.easy||[]).length+' movimientos'},
    {l:'Plusvalía latente',v:(plusv!=null?((plusv>=0?'+':'')+fmt(plusv)):'—'),cls:(plusv!=null?(plusv>=0?'pos':'neg'):''),s:(plusv!=null&&inv>0?((plusv/inv>=0?'+':'')+(plusv/inv*100).toFixed(2)+'%'):'')},
    {l:'Interés neto '+Y,v:(netoAnio>=0?'+':'')+fmt(netoAnio),cls:netoAnio>=0?'pos':'neg',s:'bruto '+fmt(brutoAnio)+' · histórico neto '+fmt(netoTot)}
  ].map(c=>`<div class="card"><div class="lbl">${c.l}</div><div class="val ${c.cls}">${c.v}</div><div class="sub">${c.s}</div></div>`).join('');
  const listEl=$('#r4List'); if(!listEl) return;
  if(!asc.length){ listEl.innerHTML='<div class="empty">Sin movimientos. Añade una aportación o una retirada, o importa el histórico.</div>'; return; }
  const _ri='width:88px;text-align:right;border:1px solid #cbd5e1;border-radius:4px;padding:2px 4px;font-size:12px;background:#fff';
  let run=0; const rowsArr=asc.map(e=>{ const signedNum=e.tipo==='retirada'? -num(e.importe): num(e.importe); run += signedNum;
    const val=(e.valor!=null&&e.valor!=='')?num(e.valor):null; const pl=(val!=null)?val-run:null;
    return `<tr><td style="white-space:nowrap">${ddmmyyyy(e.fecha)}</td>`+
      `<td><span class="tag ${e.tipo==='aportacion'?'in':''}">${e.tipo==='aportacion'?'Aportación':'Retirada'}</span></td>`+
      `<td class="num"><input class="r4inp" data-id="${e.id}" data-f="imp" value="${signedNum.toFixed(2)}" style="${_ri};color:${signedNum<0?'#dc2626':'#16a34a'};font-weight:600"></td>`+
      `<td class="num"><input class="r4inp" data-id="${e.id}" data-f="acum" value="${run.toFixed(2)}" style="${_ri};font-weight:700"></td>`+
      `<td class="num"><input class="r4inp" data-id="${e.id}" data-f="valor" value="${val!=null?val.toFixed(2):''}" placeholder="—" style="${_ri}"></td>`+
      `<td class="num"><input class="r4inp" data-id="${e.id}" data-f="plus" value="${pl!=null?pl.toFixed(2):''}" placeholder="—" style="${_ri};color:${pl!=null?(pl>=0?'#16a34a':'#dc2626'):'#64748b'}"></td>`+
      `<td class="num">${(e.tipo==='retirada'&&e.retencion!=null&&e.retencion!=='')?fmt(num(e.retencion)):''}</td>`+
      `<td class="num">${(e.tipo==='retirada'&&e.bruto!=null&&e.bruto!=='')?fmt(num(e.bruto)):''}</td>`+
      `<td class="num pos">${(e.tipo==='retirada'&&e.neto!=null&&e.neto!=='')?fmt(num(e.neto)):''}</td>`+
      `<td class="right"><button class="btn danger sm" data-delr4="${e.id}">✕</button></td></tr>`;
  });
  const ord=($('#r4Orden')||{}).value||'desc';
  const rows=(ord==='desc'?rowsArr.slice().reverse():rowsArr).join('');
  listEl.innerHTML=`<table><thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Importe</th><th class="num">Aportado acum.</th><th class="num">Valor fondo</th><th class="num">Plusvalía</th><th class="num">Retención</th><th class="num">Int. bruto</th><th class="num">Int. neto</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function addFondoR4(){
  const fecha=$('#r4Fecha').value; if(!fecha){alert('Pon una fecha');return;}
  const importe=num($('#r4Importe').value); if(!importe){alert('Pon un importe');return;}
  const valRaw=$('#r4Valor').value; const retRaw=$('#r4Ret')?$('#r4Ret').value:'';
  const tipo=$('#r4Tipo').value==='retirada'?'retirada':'aportacion';
  DB.easy=DB.easy||[];
  const mov={id:uid(),fecha,tipo,importe:Math.abs(importe)};
  if(valRaw!=='') mov.valor=num(valRaw);
  if(tipo==='retirada' && retRaw!=='' && num(retRaw)>0){ const c=r4DesdeRetencion(retRaw); mov.retencion=c.retencion; mov.bruto=c.bruto; mov.neto=c.neto; }
  DB.easy.push(mov);
  $('#r4Importe').value=''; $('#r4Valor').value=''; if($('#r4Ret')){$('#r4Ret').value='';} if($('#r4RetCalc'))$('#r4RetCalc').textContent='';
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
  var old=document.getElementById('origenDinamico'); if(old)old.remove();
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
  var rumboCol,rumboTxt;
  if(pctCumpl>=1){rumboCol='#16a34a';rumboTxt='Por delante del plan';}
  else if(pctCumpl>=0.9){rumboCol='#d97706';rumboTxt='En línea con el plan';}
  else {rumboCol='#dc2626';rumboTxt='Por detrás del plan';}
  function eur(v){return fmt(v)+' €';}
  function rowE(label,plan,hoy,higherBetter){ var d=hoy-plan; var fav=higherBetter?(d>=0):(d<=0); return '<tr><td>'+label+'</td><td class="num">'+eur(plan)+'</td><td class="num"><b>'+eur(hoy)+'</b></td><td class="num '+(fav?'pos':'neg')+'">'+(d>=0?'+':'')+fmt(d)+'</td></tr>'; }
  function rowP(label,plan,hoy){ var d=hoy-plan; return '<tr><td>'+label+'</td><td class="num">'+plan.toFixed(1)+'%</td><td class="num"><b>'+hoy.toFixed(1)+'%</b></td><td class="num">'+(d>=0?'+':'')+d.toFixed(1)+' pp</td></tr>'; }
  var div=document.createElement('div');
  div.className='card'; div.id='origenDinamico'; div.style='border-left:5px solid #16a34a;margin-top:12px';
  div.innerHTML=
    '<div style="font-size:16px;font-weight:800;color:#16a34a">Entonces → hoy · el plan frente a la realidad</div>'+
    '<div class="muted" style="font-size:12px;margin:4px 0 10px">Se calcula solo con tus datos actuales (patrimonio, ingresos y gastos del año '+yr+'). Solo lectura.</div>'+
    '<div style="margin-bottom:10px;font-size:14px">Desde el origen (05/02/2019): <b>'+eur(INI)+'</b> → hoy <b style="color:#16a34a">'+eur(totHoy)+'</b> <span class="muted">(×'+crec.toFixed(2)+' · '+(crec>=1?'+':'')+((crec-1)*100).toFixed(0)+'%)</span></div>'+
    '<div style="overflow:auto"><table style="min-width:440px"><thead><tr><th>Concepto</th><th class="num">Plan 2026</th><th class="num">Hoy</th><th class="num">Δ</th></tr></thead><tbody>'+
      rowE('Patrimonio total',P.total,totHoy,true)+
      rowE('Efectivo',P.ef,efHoy,true)+
      rowE('R. Variable',P.rv,invHoy,true)+
      rowP('% Efectivo',P.efPct,efPctHoy)+
      rowE('Ingresos / mes',P.ing,ingMes,true)+
      rowE('Gastos / mes',P.gas,gasMes,false)+
    '</tbody></table></div>'+
    '<div style="margin-top:10px"><span style="background:'+rumboCol+';color:#fff;border-radius:6px;padding:2px 10px;font-weight:700;font-size:13px">'+rumboTxt+' · '+(pctCumpl*100).toFixed(0)+'% del objetivo 2026</span></div>';
  sec.appendChild(div);
}

