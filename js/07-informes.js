/* ============================================================
   CENTRO DE INFORMES  (js/07-informes.js)
   - Sección "Informes": elige uno o varios y se imprimen
     por separado o combinados en un único PDF.
   - Reutiliza helpers de 02-hogar.js (_infEsc,_infPad,
     _infMonthsInRange,_infDetalle,_infEnsurePrint,INF_LOGO)
     y los gráficos SVG de 05-graficas.js (gDonut,gHBars,gBars,gLine).
   Fase 1: 3.1 Gastos (con gráficos) · 3.2 Ahorro/Cash-flow ·
           3.3 Ejecución presupuestaria.
   ============================================================ */

/* ---------- utilidades comunes ---------- */
function _infDocWrap(titulo, metas, inner){
  var m=(metas||[]).map(function(x){return '<div class="metaline">'+x+'</div>';}).join('');
  return '<div class="infDoc">'
    +'<div class="infHdr"><img src="'+INF_LOGO+'" alt="KHB"><div class="tt"><h1>'+_infEsc(titulo)+'</h1><div class="sub">Gestión de Economía Doméstica</div></div></div><div class="accent"></div>'
    +m+inner
    +'<div class="foot"><span>KHB Equity Investment · Informes y Gestión de Carteras</span><span></span></div>'
    +'</div>';
}
function _infChartsWrap(arr){ arr=(arr||[]).filter(Boolean); if(!arr.length)return ''; return '<div class="infCharts">'+arr.join('')+'</div>'; }
function _infKpis(pairs){ return '<div class="kpis">'+pairs.map(function(p){return '<div class="kpi"><div class="l">'+p[0]+'</div><div class="v">'+p[1]+'</div></div>';}).join('')+'</div>'; }
function _infHoyS(){ var t=new Date(); return t.getFullYear()+'-'+_infPad(t.getMonth()+1)+'-'+_infPad(t.getDate()); }

/* presupuesto vs real (ingresos y gastos separados) — devuelve <table> o aviso */
function _infPresBody(list, catsInScope, months){
  var ingRows='',gasRows='',tPresI=0,tRealI=0,tPresG=0,tRealG=0;
  catsInScope.forEach(function(cid){ var c=catById(cid); if(!c)return; var pres=0; months.forEach(function(mm){ var p=presFor(cid,mm.y); if(p)pres+=mensual(p); }); var real=0; list.forEach(function(m){ if(m.categoriaId===cid)real+=num(m.importe); }); if(pres===0&&real===0)return; var esG=(c.tipo==='gasto'); var ratio=pres?real/pres:(real?2:0); var dev=esG?(pres-real):(real-pres); var bg='transparent'; if(esG){ bg=ratio<=1?'#dcfce7':ratio<=1.1?'#fef9c3':'#fee2e2'; } else { bg=ratio>=1?'#dcfce7':ratio>=0.9?'#fef9c3':'#fee2e2'; } var pct=pres?Math.round(real/pres*100):0; var row='<tr><td>'+_infEsc(c.nombre)+' <span class="muted">('+_infEsc(c.grupo)+')</span></td><td class="num">'+fmt(pres)+'</td><td class="num">'+fmt(real)+'</td><td class="num">'+(dev>=0?'+':'')+fmt(dev)+'</td><td class="num" style="background:'+bg+'">'+(pres?pct+'%':'—')+'</td></tr>'; if(esG){ gasRows+=row; tPresG+=pres; tRealG+=real; } else { ingRows+=row; tPresI+=pres; tRealI+=real; } });
  var sub=function(lbl,tp,tr,esG){ var d=esG?(tp-tr):(tr-tp); return '<tr class="tot"><td>'+lbl+'</td><td class="num">'+fmt(tp)+'</td><td class="num">'+fmt(tr)+'</td><td class="num">'+(d>=0?'+':'')+fmt(d)+'</td><td class="num">'+(tp?Math.round(tr/tp*100)+'%':'—')+'</td></tr>'; };
  var body='';
  if(ingRows)body+='<tr class="sub"><td colspan="5">INGRESOS</td></tr>'+ingRows+sub('Total ingresos',tPresI,tRealI,false);
  if(gasRows)body+='<tr class="sub"><td colspan="5">GASTOS</td></tr>'+gasRows+sub('Total gastos',tPresG,tRealG,true);
  if(!body)return '<p class="muted">Sin presupuesto asignado a las categorías.</p>';
  return '<table><thead><tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Real</th><th class="num">Desviación</th><th class="num">%</th></tr></thead><tbody>'+body+'</tbody></table>';
}

/* ---------- contexto (periodo + filtros de gastos) ---------- */
function _infCtx(){
  var per=document.getElementById('infcPeriodo').value; var d0,d1,label;
  if(per==='mes'){ var v=document.getElementById('infcMes').value; if(!v){alert('Elige un mes');return null;} var pp=v.split('-'); var Y=+pp[0],M=+pp[1]; d0=new Date(Y,M-1,1); d1=new Date(Y,M,0); var mn=(typeof MESES!=='undefined'?MESES[M-1]:''+M); label='Mes de '+(mn.charAt(0).toUpperCase()+mn.slice(1))+' '+Y; }
  else if(per==='anio'){ var Ya=parseInt(document.getElementById('infcAnio').value,10); if(!Ya){alert('Pon un año');return null;} d0=new Date(Ya,0,1); d1=new Date(Ya,11,31); label='Año '+Ya; }
  else { var a=document.getElementById('infcDesde').value,b=document.getElementById('infcHasta').value; if(!a||!b){alert('Pon fecha desde y hasta');return null;} d0=new Date(a+'T00:00:00'); d1=new Date(b+'T00:00:00'); if(d1<d0){var t=d0;d0=d1;d1=t;} label='Del '+ddmmyyyy(a)+' al '+ddmmyyyy(b); }
  var s0=d0.getFullYear()+'-'+_infPad(d0.getMonth()+1)+'-'+_infPad(d0.getDate());
  var s1=d1.getFullYear()+'-'+_infPad(d1.getMonth()+1)+'-'+_infPad(d1.getDate());
  var tipo=(document.getElementById('infcTipo')||{}).value||'ambos';
  var modo=(document.getElementById('infcDetalle')||{}).value||'completo';
  var selTits=[].slice.call(document.querySelectorAll('.infcTit:checked')).map(function(x){return x.value;});
  var selCats=[].slice.call(document.querySelectorAll('.infcCat:checked')).map(function(x){return x.value;});
  var base=(DB.movimientos||[]).filter(function(m){ return m.fecha&&m.fecha>=s0&&m.fecha<=s1; });
  return {per:per,d0:d0,d1:d1,label:label,s0:s0,s1:s1,tipo:tipo,modo:modo,selTits:selTits,selCats:selCats,base:base,months:_infMonthsInRange(d0,d1)};
}

/* ============ 3.1 INFORME DE GASTOS (con gráficos) ============ */
function buildGastos(ctx){
  var list=ctx.base.filter(function(m){
    if(ctx.tipo!=='ambos'&&m.tipo!==ctx.tipo)return false;
    if(ctx.selTits.length&&ctx.selTits.indexOf(m.titular||'')<0)return false;
    if(ctx.selCats.length&&ctx.selCats.indexOf(m.categoriaId)<0)return false;
    return true;
  });
  if(!list.length)return _infDocWrap('Informe de gastos',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],'<p class="muted">No hay movimientos con esos filtros en el periodo.</p>');
  var ingD=_infDetalle(list,'ingreso',ctx.modo), gasD=_infDetalle(list,'gasto',ctx.modo);
  var ing=ingD.total,gas=gasD.total,ahorro=ing-gas,tasa=ing?ahorro/ing*100:0;
  // gráficos (sobre gastos)
  var gl=list.filter(function(m){return m.tipo==='gasto';});
  var byGrp={},byCat={},byCom={};
  gl.forEach(function(m){ var c=catById(m.categoriaId); var g=(c&&c.grupo)||'Sin grupo'; var cn=(c&&c.nombre)||'Sin categoría'; var co=(m.comercio||'').trim()||'(sin comercio)'; var v=num(m.importe); byGrp[g]=(byGrp[g]||0)+v; byCat[cn]=(byCat[cn]||0)+v; byCom[co]=(byCom[co]||0)+v; });
  var donut=(typeof gDonut==='function')?gDonut('Gasto por grupo',Object.keys(byGrp).map(function(g){return {label:g,val:byGrp[g]};})):'';
  var topCat=(typeof gHBars==='function')?gHBars('Top categorías',Object.keys(byCat).map(function(k){return {label:k,val:byCat[k]};}).sort(function(a,b){return b.val-a.val;}),{top:10,labelW:110}):'';
  var topCom=(typeof gHBars==='function')?gHBars('Top comercios',Object.keys(byCom).map(function(k){return {label:k,val:byCom[k]};}).sort(function(a,b){return b.val-a.val;}),{top:10,labelW:110}):'';
  // presupuesto vs real
  var catsInScope=ctx.selCats.length?ctx.selCats.slice():Object.keys(list.reduce(function(o,m){o[m.categoriaId]=1;return o;},{}));
  var presTable=_infPresBody(list,catsInScope,ctx.months);
  // días del periodo para media
  var dias=Math.max(1,Math.round((ctx.d1-ctx.d0)/86400000)+1);
  // resumen
  var topGname=Object.keys(byGrp).sort(function(a,b){return byGrp[b]-byGrp[a];})[0];
  var resumen='<p>En <b>'+_infEsc(ctx.label)+'</b> los ingresos sumaron <b>'+fmt(ing)+'</b> y los gastos <b>'+fmt(gas)+'</b>, con un '+(ahorro>=0?'ahorro':'desahorro')+' de <b>'+fmt(Math.abs(ahorro))+'</b>'+(ing?' (tasa de ahorro '+tasa.toFixed(0)+'%)':'')+'.</p>';
  if(topGname)resumen+='<p>El grupo de mayor gasto fue <b>'+_infEsc(topGname)+'</b> ('+fmt(byGrp[topGname])+').</p>';
  resumen+='<p class="muted">'+list.length+' movimientos analizados · gasto medio '+fmt(gas/dias)+'/día.</p>';
  var filt=[]; if(ctx.tipo!=='ambos')filt.push('Tipo: '+(ctx.tipo==='ingreso'?'ingresos':'gastos')); if(ctx.selTits.length)filt.push('Titular: '+ctx.selTits.join(', ')); if(ctx.selCats.length)filt.push('Categorías: '+ctx.selCats.length+' sel.');
  var metas=[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())]; if(filt.length)metas.push('Filtros — '+filt.join(' · '));
  var inner='';
  inner+='<h2>Situación financiera</h2>'+_infKpis([['Ingresos',fmt(ing)],['Gastos',fmt(gas)],['Ahorro',fmt(ahorro)],['Tasa de ahorro',(ing?tasa.toFixed(0)+'%':'—')],['Nº movimientos',String(list.length)]]);
  inner+='<h2>Visión gráfica del gasto</h2>'+_infChartsWrap([donut,topCat,topCom]);
  if(ctx.tipo!=='gasto')inner+='<h2>'+(ctx.modo==='totales'?'Ingresos por sección':'Ingresos detallados')+'</h2>'+ingD.html;
  if(ctx.tipo!=='ingreso')inner+='<h2>'+(ctx.modo==='totales'?'Gastos por sección':'Gastos detallados')+'</h2>'+gasD.html;
  inner+='<h2>Presupuesto vs real</h2>'+presTable;
  inner+='<h2>Resumen</h2>'+resumen;
  return _infDocWrap('Informe de gastos',metas,inner);
}

/* ============ 3.2 AHORRO / CASH-FLOW ============ */
function buildAhorro(ctx){
  var months=ctx.months;
  var data=months.map(function(mm){ var i=0,g=0; ctx.base.forEach(function(m){ var d=new Date(m.fecha+'T00:00:00'); if(d.getFullYear()===mm.y&&d.getMonth()===mm.m){ if(m.tipo==='ingreso')i+=num(m.importe); else if(m.tipo==='gasto')g+=num(m.importe); } }); return {mm:mm,i:i,g:g}; }).filter(function(x){ return x.i>0.005||x.g>0.005; });
  var rows='',tIng=0,tGas=0,pos=0; var serIng=[],serGas=[],serTasa=[],labels=[];
  data.forEach(function(x){ var mm=x.mm,i=x.i,g=x.g,a=i-g; var tieneIng=i>=1; var ts=tieneIng?a/i*100:null; tIng+=i;tGas+=g; if(a>=0)pos++;
    rows+='<tr><td>'+(MESES[mm.m].charAt(0).toUpperCase()+MESES[mm.m].slice(1))+' '+mm.y+'</td><td class="num">'+fmt(i)+'</td><td class="num">'+fmt(g)+'</td><td class="num" style="color:'+(a>=0?'#16a34a':'#dc2626')+'">'+(a>=0?'+':'')+fmt(a)+'</td><td class="num">'+(ts==null?'—':ts.toFixed(0)+'%')+'</td></tr>';
    labels.push(MESES[mm.m].slice(0,3)+(data.length>12?'’'+String(mm.y).slice(2):'')); serIng.push(i); serGas.push(g); serTasa.push(ts==null?0:Math.max(-100,Math.min(150,ts))); });
  var tAho=tIng-tGas,tTasa=tIng?tAho/tIng*100:0;
  rows+='<tr class="tot"><td>TOTAL</td><td class="num">'+fmt(tIng)+'</td><td class="num">'+fmt(tGas)+'</td><td class="num">'+(tAho>=0?'+':'')+fmt(tAho)+'</td><td class="num">'+(tIng?tTasa.toFixed(0)+'%':'—')+'</td></tr>';
  // objetivos de ahorro
  var obj=(DB.config&&DB.config.ahorro)||{}; var objInfo='';
  var meta=num(obj.anual); if(meta>0){ var pct=Math.min(100,Math.round(tAho/meta*100)); objInfo='<p>Objetivo de ahorro anual: <b>'+fmt(meta)+'</b> — conseguido <b>'+fmt(tAho)+'</b> ('+pct+'%). <span style="display:inline-block;width:160px;height:9px;background:#eef2f7;border-radius:5px;vertical-align:middle;overflow:hidden"><span style="display:block;height:9px;width:'+pct+'%;background:'+(pct>=100?'#16a34a':'#2563eb')+'"></span></span></p>'; }
  if(num(obj.tasa)>0){ objInfo+='<p>Objetivo de tasa de ahorro: <b>'+num(obj.tasa).toFixed(0)+'%</b> — real <b>'+tTasa.toFixed(0)+'%</b> ('+(tTasa>=num(obj.tasa)?'✅ cumplido':'por debajo')+').</p>'; }
  // gráficos
  var chartFlujo=(typeof gBars==='function')?gBars('Ingresos vs gastos por mes',labels,[{name:'Ingresos',color:'#16a34a',vals:serIng},{name:'Gastos',color:'#dc2626',vals:serGas}],{}):'';
  var chartTasa=(typeof gLine==='function')?gLine('Tasa de ahorro (%)',labels,serTasa,{pct:true}):'';
  var inner='';
  inner+='<h2>Resumen de ahorro</h2>'+_infKpis([['Ingresos',fmt(tIng)],['Gastos',fmt(tGas)],['Ahorro',fmt(tAho)],['Tasa de ahorro',(tIng?tTasa.toFixed(0)+'%':'—')],['Meses en positivo',pos+'/'+data.length]]);
  inner+=_infChartsWrap([chartFlujo,chartTasa]);
  if(objInfo)inner+='<h2>Objetivos de ahorro</h2><div class="resumen">'+objInfo+'</div>';
  inner+='<h2>Detalle mensual</h2><table><thead><tr><th>Mes</th><th class="num">Ingresos</th><th class="num">Gastos</th><th class="num">Ahorro</th><th class="num">Tasa</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Informe de ahorro y flujo de caja',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 3.3 EJECUCIÓN PRESUPUESTARIA ============ */
function buildPresupuesto(ctx){
  var months=ctx.months;
  // meses transcurridos dentro del periodo hasta hoy (para proyección)
  var hoy=new Date(); var transc=0; months.forEach(function(mm){ var fin=new Date(mm.y,mm.m+1,0); if(fin<=hoy)transc++; else if(mm.y===hoy.getFullYear()&&mm.m===hoy.getMonth())transc++; });
  transc=Math.max(1,transc); var proyectable=(months.length>=12);
  // categorías de gasto con presupuesto o gasto en el periodo
  var cats={}; ctx.base.forEach(function(m){ if(m.tipo==='gasto')cats[m.categoriaId]=1; });
  (DB.presupuesto||[]).forEach(function(p){ var c=catById(p.categoriaId); if(c&&c.tipo==='gasto'&&(p.anio||2026)===ctx.d0.getFullYear())cats[p.categoriaId]=1; });
  var byGrupo={};
  Object.keys(cats).forEach(function(cid){ var c=catById(cid); if(!c||c.tipo!=='gasto')return; var pres=0; months.forEach(function(mm){ var p=presFor(cid,mm.y); if(p)pres+=mensual(p); }); var real=0; ctx.base.forEach(function(m){ if(m.categoriaId===cid&&m.tipo==='gasto')real+=num(m.importe); }); if(pres===0&&real===0)return; var proy=proyectable?(real/transc*(months.length)):real; (byGrupo[c.grupo]=byGrupo[c.grupo]||[]).push({nombre:c.nombre,pres:pres,real:real,proy:proy}); });
  var grupos=Object.keys(byGrupo).sort();
  var tPres=0,tReal=0,tProy=0,rows='',topDesv=[];
  grupos.forEach(function(g){ var gp=0,gr=0,gy=0; var sub=''; byGrupo[g].sort(function(a,b){return b.real-a.real;}).forEach(function(x){ gp+=x.pres;gr+=x.real;gy+=x.proy; var cons=x.pres?Math.round(x.real/x.pres*100):0; var ratioP=x.pres?x.proy/x.pres:(x.real?2:0); var bg=ratioP<=1?'#dcfce7':ratioP<=1.1?'#fef9c3':'#fee2e2'; sub+='<tr><td>'+_infEsc(x.nombre)+'</td><td class="num">'+fmt(x.pres)+'</td><td class="num">'+fmt(x.real)+'</td><td class="num">'+(x.pres?cons+'%':'—')+'</td><td class="num" style="background:'+bg+'">'+(proyectable?fmt(x.proy):'—')+'</td></tr>'; if(x.pres>0)topDesv.push({label:x.nombre,val:x.proy-x.pres}); });
    rows+='<tr class="sub"><td colspan="5">'+_infEsc(g)+'</td></tr>'+sub+'<tr class="tot"><td>Subtotal '+_infEsc(g)+'</td><td class="num">'+fmt(gp)+'</td><td class="num">'+fmt(gr)+'</td><td class="num">'+(gp?Math.round(gr/gp*100)+'%':'—')+'</td><td class="num">'+(proyectable?fmt(gy):'—')+'</td></tr>'; tPres+=gp;tReal+=gr;tProy+=gy; });
  if(!rows)return _infDocWrap('Ejecución presupuestaria',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin presupuesto ni gasto en el periodo.</p>');
  rows+='<tr class="tot"><td>TOTAL</td><td class="num">'+fmt(tPres)+'</td><td class="num">'+fmt(tReal)+'</td><td class="num">'+(tPres?Math.round(tReal/tPres*100)+'%':'—')+'</td><td class="num">'+(proyectable?fmt(tProy):'—')+'</td></tr>';
  // gráfico: desvíos proyectados (rojo se pasa / verde ahorra) — invertimos signo para que verde=bueno
  topDesv.sort(function(a,b){return Math.abs(b.val)-Math.abs(a.val);});
  var chart=(proyectable&&typeof gHBars==='function')?gHBars('Desvío proyectado a cierre (rojo = se pasa)',topDesv.map(function(x){return {label:x.label,val:-x.val};}),{top:10,labelW:110,signColor:true}):'';
  var inner='';
  inner+='<h2>Ejecución del presupuesto</h2>'+_infKpis([['Presupuesto',fmt(tPres)],['Gastado',fmt(tReal)],['% consumido',(tPres?Math.round(tReal/tPres*100)+'%':'—')],['Proyección cierre',(proyectable?fmt(tProy):'—')],['Meses transcurridos',transc+'/'+months.length]]);
  if(chart)inner+=_infChartsWrap([chart]);
  inner+='<table><thead><tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Gastado</th><th class="num">% consumido</th><th class="num">Proyección cierre</th></tr></thead><tbody>'+rows+'</tbody></table>';
  if(proyectable)inner+='<div class="resumen"><p class="muted">La proyección estima el cierre del periodo si se mantiene el ritmo actual (gastado ÷ meses transcurridos × meses del periodo). Verde = dentro de presupuesto, rojo = se prevé superarlo.</p></div>';
  return _infDocWrap('Ejecución presupuestaria',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.1 PATRIMONIO ============ */
function buildPatrimonio(ctx){
  var snaps=(typeof patSnaps==='function')?patSnaps():[];
  if(!snaps.length)return _infDocWrap('Informe de patrimonio',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin registros de patrimonio.</p>');
  function ei(s){ var ef=0,inv=0; (s.lineas||[]).forEach(function(l){ef+=num(l.ef);inv+=num(l.inv);}); return {ef:ef,inv:inv}; }
  var last=snaps[snaps.length-1]; var L=ei(last); var total=L.ef+L.inv; var pInv=total?L.inv/total:0;
  var labels=[],sEf=[],sInv=[]; var step=Math.ceil(snaps.length/24)||1;
  snaps.forEach(function(s,i){ if(i%step!==0 && i!==snaps.length-1)return; var e=ei(s); labels.push((s.fecha||'').slice(2,7)); sEf.push(e.ef); sInv.push(e.inv); });
  var chart=(typeof gStack==='function')?gStack('Efectivo vs invertido',labels,sEf,sInv,['Efectivo','Invertido']):'';
  var donut=(typeof gDonut==='function')?gDonut('Reparto actual',[{label:'Efectivo',val:L.ef,color:'#2563eb'},{label:'Invertido',val:L.inv,color:'#16a34a'}]):'';
  var rows=''; snaps.slice(-12).reverse().forEach(function(s){ var e=ei(s); var t=e.ef+e.inv; rows+='<tr><td>'+ddmmyyyy(s.fecha)+'</td><td class="num">'+fmt(e.ef)+'</td><td class="num">'+fmt(e.inv)+'</td><td class="num">'+fmt(t)+'</td><td class="num">'+(t?Math.round(e.inv/t*100)+'%':'—')+'</td></tr>'; });
  var inner='';
  inner+='<h2>Situación patrimonial</h2>'+_infKpis([['Patrimonio total',fmt(total)],['Efectivo',fmt(L.ef)],['Invertido',fmt(L.inv)],['% invertido',Math.round(pInv*100)+'%'],['Objetivo 50/50',Math.round(pInv*100)+'% inv']]);
  inner+=_infChartsWrap([chart,donut]);
  inner+='<h2>Últimos registros</h2><table><thead><tr><th>Fecha</th><th class="num">Efectivo</th><th class="num">Invertido</th><th class="num">Total</th><th class="num">% inv.</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Informe de patrimonio',['A fecha de '+ddmmyyyy(_infHoyS())+' · último registro '+ddmmyyyy(last.fecha)],inner);
}

/* ============ 4.2 CARTERA ============ */
function buildCartera(ctx){
  var pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){return p.acciones>0.0001;});
  if(!pos.length)return _infDocWrap('Informe de cartera',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin posiciones abiertas.</p>');
  var valor=0,coste=0,divB=0; pos.forEach(function(p){ valor+=p.acciones*p.precioActual; coste+=p.acciones*p.precioCompra; divB+=p.acciones*p.divAccion; });
  var pl=valor-coste;
  var byEmp=pos.map(function(p){return {label:p.ticker,val:p.acciones*p.precioActual};}).sort(function(a,b){return b.val-a.val;});
  var bySec={}; pos.forEach(function(p){ var sc=(typeof SECTOR!=='undefined'&&SECTOR[(p.ticker||'').toUpperCase()])||'Sin sector'; bySec[sc]=(bySec[sc]||0)+p.acciones*p.precioActual; });
  var donutEmp=(typeof gDonut==='function')?gDonut('Peso por empresa',byEmp):'';
  var donutSec=(typeof gDonut==='function')?gDonut('Peso por sector',Object.keys(bySec).map(function(k){return {label:k,val:bySec[k]};})):'';
  var plEmp=pos.map(function(p){ var c=p.acciones*p.precioCompra; var pv=p.acciones*p.precioActual-c; return {label:p.ticker,val:c?pv/c*100:0}; }).sort(function(a,b){return b.val-a.val;});
  var plChart=(typeof gHBars==='function')?gHBars('Plusvalía % por empresa',plEmp,{top:14,labelW:70,pct:true,signColor:true}):'';
  var rows=''; pos.slice().sort(function(a,b){return (b.acciones*b.precioActual)-(a.acciones*a.precioActual);}).forEach(function(p){ var v=p.acciones*p.precioActual,c=p.acciones*p.precioCompra,pv=v-c; var sc=(typeof SECTOR!=='undefined'&&SECTOR[(p.ticker||'').toUpperCase()])||'—'; rows+='<tr><td><b>'+_infEsc(p.ticker)+'</b> <span class="muted">'+_infEsc(sc)+'</span></td><td class="num">'+p.acciones+'</td><td class="num">'+fmt(p.precioCompra)+'</td><td class="num">'+fmt(p.precioActual)+'</td><td class="num">'+fmt(v)+'</td><td class="num" style="color:'+(pv>=0?'#16a34a':'#dc2626')+'">'+(pv>=0?'+':'')+fmt(pv)+'</td><td class="num">'+(c?((pv/c*100>=0?'+':'')+(pv/c*100).toFixed(1)+'%'):'—')+'</td><td class="num">'+(valor?(v/valor*100).toFixed(1)+'%':'—')+'</td></tr>'; });
  rows+='<tr class="tot"><td>TOTAL</td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num">'+fmt(valor)+'</td><td class="num">'+(pl>=0?'+':'')+fmt(pl)+'</td><td class="num">'+(coste?((pl/coste*100>=0?'+':'')+(pl/coste*100).toFixed(1)+'%'):'—')+'</td><td class="num">100%</td></tr>';
  var inner='';
  inner+='<h2>Resumen de la cartera</h2>'+_infKpis([['Valor',fmt(valor)],['Coste',fmt(coste)],['Plusvalía',(pl>=0?'+':'')+fmt(pl)],['Rentabilidad',(coste?(pl/coste*100).toFixed(1)+'%':'—')],['Div. bruto/año',fmt(divB)],['RPD',(valor?(divB/valor*100).toFixed(1)+'%':'—')]]);
  inner+=_infChartsWrap([donutEmp,donutSec,plChart]);
  inner+='<h2>Posiciones</h2><table><thead><tr><th>Empresa</th><th class="num">Acc.</th><th class="num">P.compra</th><th class="num">P.actual</th><th class="num">Valor</th><th class="num">Plusvalía</th><th class="num">%</th><th class="num">Peso</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Informe de cartera',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.3 DIVIDENDOS ============ */
function buildDividendos(ctx){
  var nowY=new Date().getFullYear(); var refY=(ctx.per==='anio')?ctx.d0.getFullYear():nowY;
  var syt=(typeof simYearTotal==='function')?simYearTotal:function(){return 0;};
  var dN=syt(nowY),d1=syt(nowY+1),d2=syt(nowY+2); var cr=dN?((d1/dN)-1):0;
  var years=[]; for(var y=nowY-4;y<=nowY+2;y++)years.push(y);
  var vals=years.map(function(y){return syt(y);});
  var chart=(typeof gBars==='function')?gBars('Dividendo bruto por año',years.map(String),[{name:'Dividendo',color:'#16a34a',vals:vals}],{}):'';
  var pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){return p.acciones>0.0001;});
  var valor=pos.reduce(function(s,p){return s+p.acciones*p.precioActual;},0);
  var dpa=DB.divPorAccion||{}; var rows='',tDiv=0;
  var drows=pos.map(function(p){ var t=(p.ticker||'').toUpperCase(); var da=num((dpa[t]||{})[refY]||p.divAccion); var db=p.acciones*da; var v=p.acciones*p.precioActual; var c=p.acciones*p.precioCompra; return {t:t,acc:p.acciones,da:da,db:db,rpd:(v?db/v*100:0),yoc:(c?db/c*100:0)}; });
  drows.sort(function(a,b){return b.db-a.db;});
  drows.forEach(function(x){ tDiv+=x.db; rows+='<tr><td><b>'+_infEsc(x.t)+'</b></td><td class="num">'+x.acc+'</td><td class="num">'+fmt(x.da)+'</td><td class="num">'+fmt(x.db)+'</td><td class="num">'+x.rpd.toFixed(1)+'%</td><td class="num">'+x.yoc.toFixed(1)+'%</td></tr>'; });
  rows+='<tr class="tot"><td>TOTAL</td><td class="num"></td><td class="num"></td><td class="num">'+fmt(tDiv)+'</td><td class="num">'+(valor?(tDiv/valor*100).toFixed(1)+'%':'—')+'</td><td class="num"></td></tr>';
  var inner='';
  inner+='<h2>Dividendos</h2>'+_infKpis([['Cobrado '+nowY,fmt(dN)],['Previsión '+(nowY+1),fmt(d1)],['Previsión '+(nowY+2),fmt(d2)],['Crecimiento',(cr>=0?'+':'')+(cr*100).toFixed(0)+'%'],['RPD cartera',(valor?(tDiv/valor*100).toFixed(1)+'%':'—')]]);
  inner+=_infChartsWrap([chart]);
  inner+='<h2>Dividendo por empresa (año '+refY+')</h2><table><thead><tr><th>Empresa</th><th class="num">Acc.</th><th class="num">Div/acción</th><th class="num">Dividendo bruto</th><th class="num">RPD</th><th class="num">YoC</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Informe de dividendos',['A fecha de '+ddmmyyyy(_infHoyS())+' · año de referencia '+refY],inner);
}

/* ============ 4.4 FISCAL (RENTA) ============ */
function buildFiscal(ctx){
  var rows=(typeof _fiscalPorAnio==='function')?_fiscalPorAnio():[];
  if(!rows.length)return _infDocWrap('Informe fiscal (renta)',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin datos fiscales todavía.</p>');
  var tDB=0,tRet=0,tPL=0,tBase=0,tDev=0;
  var trs=rows.slice().reverse().map(function(r){ tDB+=r.divB;tRet+=r.ret;tPL+=r.pl;tBase+=r.base;tDev+=r.dev; return '<tr><td>'+r.year+'</td><td class="num">'+(r.divB?fmt(r.divB):'·')+'</td><td class="num">'+(r.divB?fmt(r.ret):'·')+'</td><td class="num" style="color:'+(r.pl<0?'#dc2626':'#16a34a')+'">'+((r.pl||r.divB)?fmt(r.pl):'·')+'</td><td class="num" style="font-weight:600">'+fmt(r.base)+'</td><td class="num">'+(r.dev?fmt(r.dev):'·')+'</td></tr>'; }).join('');
  trs+='<tr class="tot"><td>TOTAL</td><td class="num">'+fmt(tDB)+'</td><td class="num">'+fmt(tRet)+'</td><td class="num">'+fmt(tPL)+'</td><td class="num">'+fmt(tBase)+'</td><td class="num">'+fmt(tDev)+'</td></tr>';
  var years=rows.map(function(r){return r.year;}); var bases=rows.map(function(r){return r.base;});
  var chart=(typeof gBars==='function')?gBars('Base del ahorro por año',years,[{name:'Base',color:'#2563eb',vals:bases}],{}):'';
  var last=rows[rows.length-1]||{};
  var inner='';
  inner+='<h2>Resumen fiscal</h2>'+_infKpis([['Dividendos brutos (hist.)',fmt(tDB)],['Retención 19%',fmt(tRet)],['Plusvalías realizadas',fmt(tPL)],['Base del ahorro (hist.)',fmt(tBase)],['Último año',last.year||'—']]);
  inner+=_infChartsWrap([chart]);
  inner+='<h2>Detalle por año fiscal</h2><table><thead><tr><th>Año</th><th class="num">Dividendos brutos</th><th class="num">Retención 19%</th><th class="num">Plusvalías (ventas)</th><th class="num">Base del ahorro</th><th class="num">Devol. Hacienda</th></tr></thead><tbody>'+trs+'</tbody></table>';
  inner+='<div class="resumen"><p class="muted">Orientativo para la renta: los dividendos son rendimientos del capital mobiliario (retención 19%); la plusvalía es ventas − coste de lo vendido (precio medio). No incluye comisiones ni pérdidas compensables de años anteriores. Consulta con tu asesor.</p></div>';
  return _infDocWrap('Informe fiscal (renta)',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 3.4 COMPARATIVO INTERANUAL ============ */
function buildInteranual(ctx){
  var d0=ctx.d0,d1=ctx.d1;
  function ymd(x){return x.getFullYear()+'-'+_infPad(x.getMonth()+1)+'-'+_infPad(x.getDate());}
  var hoy=new Date(); var d1e=(d1>hoy)?hoy:d1; var capado=(d1e<d1);
  var pd0=new Date(d0.getFullYear()-1,d0.getMonth(),d0.getDate());
  var pd1=new Date(d1e.getFullYear()-1,d1e.getMonth(),d1e.getDate());
  var cs0=ctx.s0,cs1=ymd(d1e),ps0=ymd(pd0),ps1=ymd(pd1);
  var curr={},prev={};
  (DB.movimientos||[]).forEach(function(m){ if(m.tipo!=='gasto')return; if(m.fecha>=cs0&&m.fecha<=cs1)curr[m.categoriaId]=(curr[m.categoriaId]||0)+num(m.importe); else if(m.fecha>=ps0&&m.fecha<=ps1)prev[m.categoriaId]=(prev[m.categoriaId]||0)+num(m.importe); });
  var cids={}; Object.keys(curr).forEach(function(k){cids[k]=1;}); Object.keys(prev).forEach(function(k){cids[k]=1;});
  var byGrupo={};
  Object.keys(cids).forEach(function(cid){ var c=catById(cid); if(!c)return; var cv=curr[cid]||0, pv=prev[cid]||0; if(cv===0&&pv===0)return; (byGrupo[c.grupo]=byGrupo[c.grupo]||[]).push({nombre:c.nombre,cv:cv,pv:pv}); });
  var grupos=Object.keys(byGrupo).sort();
  var yC=d0.getFullYear(), yP=yC-1;
  if(!grupos.length)return _infDocWrap('Comparativo interanual',[_infEsc(ctx.label)+' vs '+yP],'<p class="muted">Sin gastos para comparar.</p>');
  var rows='',tCur=0,tPrev=0,chg=[];
  grupos.forEach(function(g){ var gc=0,gp=0,sub=''; byGrupo[g].sort(function(a,b){return b.cv-a.cv;}).forEach(function(x){ gc+=x.cv;gp+=x.pv; var dd=x.cv-x.pv; var pct=x.pv?dd/x.pv*100:(x.cv?100:0); sub+='<tr><td>'+_infEsc(x.nombre)+'</td><td class="num">'+fmt(x.cv)+'</td><td class="num">'+fmt(x.pv)+'</td><td class="num" style="color:'+(dd>0?'#dc2626':'#16a34a')+'">'+(dd>=0?'+':'')+fmt(dd)+'</td><td class="num">'+(x.pv?((dd>=0?'+':'')+pct.toFixed(0)+'%'):'—')+'</td></tr>'; chg.push({label:x.nombre,val:-dd}); });
    rows+='<tr class="sub"><td colspan="5">'+_infEsc(g)+'</td></tr>'+sub+'<tr class="tot"><td>Subtotal '+_infEsc(g)+'</td><td class="num">'+fmt(gc)+'</td><td class="num">'+fmt(gp)+'</td><td class="num">'+((gc-gp)>=0?'+':'')+fmt(gc-gp)+'</td><td class="num">'+(gp?((gc-gp>=0?'+':'')+((gc-gp)/gp*100).toFixed(0)+'%'):'—')+'</td></tr>'; tCur+=gc;tPrev+=gp; });
  rows+='<tr class="tot"><td>TOTAL</td><td class="num">'+fmt(tCur)+'</td><td class="num">'+fmt(tPrev)+'</td><td class="num">'+((tCur-tPrev)>=0?'+':'')+fmt(tCur-tPrev)+'</td><td class="num">'+(tPrev?((tCur-tPrev>=0?'+':'')+((tCur-tPrev)/tPrev*100).toFixed(0)+'%'):'—')+'</td></tr>';
  chg.sort(function(a,b){return Math.abs(b.val)-Math.abs(a.val);});
  var chart=(typeof gHBars==='function')?gHBars('Variación del gasto (verde = gastas menos)',chg,{top:12,labelW:110,signColor:true}):'';
  var inner='';
  inner+='<h2>Comparativa interanual</h2>'+_infKpis([['Gasto actual',fmt(tCur)],['Gasto '+yP,fmt(tPrev)],['Variación',((tCur-tPrev)>=0?'+':'')+fmt(tCur-tPrev)],['Variación %',(tPrev?((tCur-tPrev>=0?'+':'')+((tCur-tPrev)/tPrev*100).toFixed(0)+'%'):'—')]]);
  inner+=_infChartsWrap([chart]);
  inner+='<h2>Por categoría</h2><table><thead><tr><th>Categoría</th><th class="num">Actual</th><th class="num">'+yP+'</th><th class="num">Δ €</th><th class="num">Δ %</th></tr></thead><tbody>'+rows+'</tbody></table>';
  var _meta=_infEsc(ctx.label)+' vs mismo periodo de '+yP+(capado?(' (comparado solo hasta hoy '+ddmmyyyy(cs1)+', periodo en curso)'):'')+' · emitido el '+ddmmyyyy(_infHoyS());
  return _infDocWrap('Comparativo interanual',[_meta],inner);
}

/* ============ 3.7 RECURRENTES Y SUSCRIPCIONES ============ */
function buildRecurrentes(ctx){
  var yr=(ctx.per==='anio')?ctx.d0.getFullYear():new Date().getFullYear();
  var anualF=(typeof anual==='function')?anual:function(p){return mensual(p)*12;};
  var items=(DB.presupuesto||[]).filter(function(p){ var c=catById(p.categoriaId); return c&&c.tipo==='gasto'&&(p.anio||yr)===yr&&num(p.importe)>0; });
  if(!items.length)return _infDocWrap('Gastos recurrentes y suscripciones',['Año '+yr],'<p class="muted">Sin partidas de presupuesto de gasto.</p>');
  var byGrp={},tAnual=0,rows='';
  items.map(function(p){ var c=catById(p.categoriaId); return {nombre:c.nombre,grupo:c.grupo,importe:num(p.importe),frec:p.frecuencia||'mensual',metodo:p.metodoPago||'',renov:p.renovacion||'',an:anualF(p)}; }).sort(function(a,b){return b.an-a.an;}).forEach(function(x){ tAnual+=x.an; byGrp[x.grupo]=(byGrp[x.grupo]||0)+x.an; rows+='<tr><td>'+_infEsc(x.nombre)+' <span class="muted">('+_infEsc(x.grupo)+')</span></td><td class="num">'+fmt(x.importe)+'</td><td>'+_infEsc(x.frec)+'</td><td>'+_infEsc(x.metodo||'—')+'</td><td>'+(x.renov?ddmmyyyy(x.renov):'—')+'</td><td class="num">'+fmt(x.an)+'</td></tr>'; });
  rows+='<tr class="tot"><td colspan="5">TOTAL anualizado</td><td class="num">'+fmt(tAnual)+'</td></tr>';
  var donut=(typeof gDonut==='function')?gDonut('Recurrentes por grupo (anual)',Object.keys(byGrp).map(function(k){return {label:k,val:byGrp[k]};})):'';
  var renHtml='';
  if(typeof renovList==='function'){ var rl=renovList(90)||[]; if(rl.length){ var rr=rl.map(function(r){ var f=r.fecha; var fs=_infPad(f.getDate())+'/'+_infPad(f.getMonth()+1)+'/'+f.getFullYear(); return '<tr><td>'+fs+'</td><td>'+_infEsc(r.nombre)+'</td><td class="num">'+fmt(r.importe)+'</td><td>'+(r.dias<0?'vencida':('en '+r.dias+' d'))+'</td></tr>'; }).join(''); renHtml='<h2>Próximas renovaciones (90 días)</h2><table><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Importe</th><th>Aviso</th></tr></thead><tbody>'+rr+'</tbody></table>'; } }
  var inner='';
  inner+='<h2>Gastos recurrentes</h2>'+_infKpis([['Coste fijo anual',fmt(tAnual)],['Coste fijo mensual',fmt(tAnual/12)],['Nº partidas',String(items.length)]]);
  inner+=_infChartsWrap([donut]);
  inner+='<h2>Detalle de recurrentes</h2><table><thead><tr><th>Partida</th><th class="num">Importe</th><th>Frecuencia</th><th>Método</th><th>Próx. renov.</th><th class="num">Coste anual</th></tr></thead><tbody>'+rows+'</tbody></table>';
  inner+=renHtml;
  return _infDocWrap('Gastos recurrentes y suscripciones',['Año '+yr+' · emitido el '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.5 RENTABILIDAD vs IBEX ============ */
function buildRentabilidad(ctx){
  var pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){return p.acciones>0.0001;});
  var valor=0,coste=0; pos.forEach(function(p){ valor+=p.acciones*p.precioActual; coste+=p.acciones*p.precioCompra; });
  var pl=valor-coste;
  var divB=0; if(typeof _fiscalPorAnio==='function'){ _fiscalPorAnio().forEach(function(r){divB+=r.divB;}); }
  var rentTot=coste?((pl+divB)/coste*100):0;
  var chartMain=(typeof aportValorHTML==='function')?aportValorHTML():'';
  var rows=''; pos.slice().map(function(p){ var v=p.acciones*p.precioActual,c=p.acciones*p.precioCompra; return {t:p.ticker,v:v,c:c,pl:v-c,pct:c?(v-c)/c*100:0}; }).sort(function(a,b){return b.pct-a.pct;}).forEach(function(x){ rows+='<tr><td><b>'+_infEsc(x.t)+'</b></td><td class="num">'+fmt(x.c)+'</td><td class="num">'+fmt(x.v)+'</td><td class="num" style="color:'+(x.pl>=0?'#16a34a':'#dc2626')+'">'+(x.pl>=0?'+':'')+fmt(x.pl)+'</td><td class="num">'+((x.pct>=0?'+':'')+x.pct.toFixed(1))+'%</td></tr>'; });
  var inner='';
  inner+='<h2>Rentabilidad</h2>'+_infKpis([['Valor cartera',fmt(valor)],['Aportado (coste)',fmt(coste)],['Plusvalía',(pl>=0?'+':'')+fmt(pl)],['Rentab. s/coste',(coste?(pl/coste*100).toFixed(1)+'%':'—')],['Dividendos (hist.)',fmt(divB)],['Rentab. total',(coste?rentTot.toFixed(1)+'%':'—')]]);
  if(chartMain)inner+='<h2>Aportado vs valor vs IBEX</h2>'+chartMain;
  inner+='<h2>Rentabilidad por empresa</h2><table><thead><tr><th>Empresa</th><th class="num">Coste</th><th class="num">Valor</th><th class="num">Plusvalía</th><th class="num">%</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Informe de rentabilidad',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.6 OPORTUNIDADES (watchlist) ============ */
function buildOportunidades(ctx){
  var ana=(DB.analisis||[]).slice();
  if(!ana.length)return _infDocWrap('Oportunidades de inversión',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin empresas en el análisis.</p>');
  var _held={}; try{ (invPositions()||[]).forEach(function(p){ if(p.acciones>0.0001)_held[(p.ticker||'').toUpperCase()]=1; }); }catch(e){}
  var rows=ana.map(function(a){ var cot=num(a.cotizacion),mn=num(a.poMin),mx=num(a.poMax); var med=(mn&&mx)?(mn+mx)/2:(mx||mn||0); var pot=(cot&&med)?(med/cot-1)*100:null; var entH=num(a.entMax); var enZona=(cot>0&&entH>0&&cot<=entH); var st=num(a.stopTesis); var stopTocado=(st>0&&cot>0&&cot<=st); var sc=(typeof cmpScore==='function')?cmpScore(a):null; return {t:(a.ticker||'').toUpperCase(),dec:(a.decision||'').toUpperCase(),rating:(a.rating||'').toUpperCase(),cot:cot,med:med,pot:pot,entH:entH,enZona:enZona,stopTocado:stopTocado,sc:sc,held:_held[(a.ticker||'').toUpperCase()]}; });
  rows.sort(function(a,b){return (b.sc||0)-(a.sc||0);});
  var nZona=rows.filter(function(r){return r.enZona;}).length, nComprar=rows.filter(function(r){return r.dec==='COMPRAR';}).length, nStop=rows.filter(function(r){return r.stopTocado;}).length;
  var dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  var trs=rows.map(function(r){ var estado=r.stopTocado?'<span style="color:#dc2626">🚨 stop</span>':(r.enZona?'<span style="color:#16a34a">🟢 en zona</span>':(r.cot&&r.entH?('🔴 +'+((r.cot/r.entH-1)*100).toFixed(0)+'%'):'—')); return '<tr'+(r.held?' style="background:#f0fdf4"':'')+'><td><b>'+_infEsc(r.t)+'</b>'+(r.held?' <span class="muted">en cartera</span>':'')+'</td><td style="color:'+(dc[r.dec]||'#475569')+';font-weight:600">'+(r.dec||'—')+'</td><td class="num">'+(r.rating||'—')+'</td><td class="num">'+(r.sc!=null?Math.round(r.sc):'—')+'</td><td class="num">'+(r.cot?fmt(r.cot):'—')+'</td><td class="num">'+(r.med?fmt(r.med):'—')+'</td><td class="num" style="color:'+(r.pot>=0?'#16a34a':'#dc2626')+'">'+(r.pot!=null?((r.pot>=0?'+':'')+r.pot.toFixed(0)+'%'):'—')+'</td><td>'+estado+'</td></tr>'; }).join('');
  var potChart=rows.filter(function(r){return r.pot!=null;}).map(function(r){return {label:r.t,val:r.pot};}).sort(function(a,b){return b.val-a.val;});
  var chart=(typeof gHBars==='function')?gHBars('Potencial por empresa (%)',potChart,{top:14,labelW:70,pct:true,signColor:true}):'';
  var inner='';
  inner+='<h2>Oportunidades</h2>'+_infKpis([['Empresas analizadas',String(rows.length)],['En zona de compra',String(nZona)],['Decisión COMPRAR',String(nComprar)],['Stops tocados',String(nStop)]]);
  inner+=_infChartsWrap([chart]);
  inner+='<h2>Ranking por score</h2><table><thead><tr><th>Empresa</th><th>Decisión</th><th class="num">Rating</th><th class="num">Score</th><th class="num">Cotización</th><th class="num">PO medio</th><th class="num">Potencial</th><th>Estado</th></tr></thead><tbody>'+trs+'</tbody></table>';
  inner+='<div class="resumen"><p class="muted">El score (0–100) pondera potencial, margen de entrada, calidad (rating) y certeza. «En zona» = cotización ≤ entrada máxima. No es recomendación de compra automática.</p></div>';
  return _infDocWrap('Oportunidades de inversión',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 3.6 COMERCIOS ============ */
function buildComercios(ctx){
  var gl=ctx.base.filter(function(m){return m.tipo==='gasto';});
  if(!gl.length)return _infDocWrap('Informe de comercios',[_infEsc(ctx.label)],'<p class="muted">Sin gastos en el periodo.</p>');
  var by={}; gl.forEach(function(m){ var co=(m.comercio||'').trim()||'(sin comercio)'; var o=by[co]=by[co]||{tot:0,n:0}; o.tot+=num(m.importe); o.n++; });
  var arr=Object.keys(by).map(function(k){return {c:k,tot:by[k].tot,n:by[k].n,med:by[k].tot/by[k].n};}).sort(function(a,b){return b.tot-a.tot;});
  var totalGasto=arr.reduce(function(s,x){return s+x.tot;},0), totalN=arr.reduce(function(s,x){return s+x.n;},0);
  var chart=(typeof gHBars==='function')?gHBars('Top comercios (€)',arr.map(function(x){return {label:x.c,val:x.tot};}),{top:15,labelW:120}):'';
  var rows=arr.slice(0,30).map(function(x){return '<tr><td>'+_infEsc(x.c)+'</td><td class="num">'+fmt(x.tot)+'</td><td class="num">'+x.n+'</td><td class="num">'+fmt(x.med)+'</td><td class="num">'+(totalGasto?(x.tot/totalGasto*100).toFixed(1)+'%':'—')+'</td></tr>';}).join('');
  rows+='<tr class="tot"><td>TOTAL</td><td class="num">'+fmt(totalGasto)+'</td><td class="num">'+totalN+'</td><td class="num"></td><td class="num">100%</td></tr>';
  var top=arr[0]||{};
  var inner='';
  inner+='<h2>Gasto por comercio</h2>'+_infKpis([['Nº comercios',String(arr.length)],['Comercio top',_infEsc(top.c||'—')],['Gasto en el top',fmt(top.tot||0)],['Gasto total',fmt(totalGasto)]]);
  inner+=_infChartsWrap([chart]);
  inner+='<h2>Detalle por comercio (top 30)</h2><table><thead><tr><th>Comercio</th><th class="num">Importe</th><th class="num">Nº ops</th><th class="num">Ticket medio</th><th class="num">% gasto</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Informe de comercios',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 3.5 POR TITULAR ============ */
function buildTitular(ctx){
  var byT={};
  ctx.base.forEach(function(m){ var t=(m.titular||'(sin titular)'); var o=byT[t]=byT[t]||{ing:0,gas:0}; if(m.tipo==='ingreso')o.ing+=num(m.importe); else if(m.tipo==='gasto')o.gas+=num(m.importe); });
  var tits=Object.keys(byT);
  if(!tits.length)return _infDocWrap('Informe por titular',[_infEsc(ctx.label)],'<p class="muted">Sin movimientos en el periodo.</p>');
  var totGas=tits.reduce(function(s,t){return s+byT[t].gas;},0);
  var donut=(typeof gDonut==='function')?gDonut('Gasto por titular',tits.map(function(t){return {label:t,val:byT[t].gas};})):'';
  var rows=tits.slice().sort(function(a,b){return byT[b].gas-byT[a].gas;}).map(function(t){ var o=byT[t]; return '<tr><td>'+_infEsc(t)+'</td><td class="num">'+fmt(o.ing)+'</td><td class="num">'+fmt(o.gas)+'</td><td class="num" style="color:'+((o.ing-o.gas)>=0?'#16a34a':'#dc2626')+'">'+((o.ing-o.gas)>=0?'+':'')+fmt(o.ing-o.gas)+'</td></tr>';}).join('');
  var dos=byT['Dos']?byT['Dos'].gas:0; var imput={};
  tits.forEach(function(t){ if(t==='Dos')return; imput[t]=byT[t].gas; });
  ['Carlos','Susana'].forEach(function(t){ imput[t]=(imput[t]||0)+dos/2; });
  var repRows=Object.keys(imput).sort(function(a,b){return imput[b]-imput[a];}).map(function(t){ return '<tr><td>'+_infEsc(t)+'</td><td class="num">'+fmt(imput[t])+'</td><td class="num">'+(totGas?(imput[t]/totGas*100).toFixed(0)+'%':'—')+'</td></tr>';}).join('');
  var inner='';
  inner+='<h2>Por titular</h2>'+_infKpis(tits.slice(0,4).map(function(t){return ['Gasto '+t,fmt(byT[t].gas)];}));
  inner+=_infChartsWrap([donut]);
  inner+='<h2>Ingresos y gastos por titular</h2><table><thead><tr><th>Titular</th><th class="num">Ingresos</th><th class="num">Gastos</th><th class="num">Balance</th></tr></thead><tbody>'+rows+'</tbody></table>';
  inner+='<h2>Reparto del gasto (común al 50%)</h2><table><thead><tr><th>Persona</th><th class="num">Gasto imputado</th><th class="num">% del total</th></tr></thead><tbody>'+repRows+'</tbody></table>';
  inner+='<div class="resumen"><p class="muted">El reparto imputa a cada persona sus gastos propios más la mitad de los gastos marcados como «Dos» (compartidos).</p></div>';
  return _infDocWrap('Informe por titular',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 3.8 REEMBOLSABLES (AMALIA) ============ */
function buildAmalia(ctx){
  var am=(DB.amalia||[]).slice();
  if(!am.length)return _infDocWrap('Reembolsables (Amalia)',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin movimientos de Amalia.</p>');
  var saldo=(typeof amaliaSaldo==='function')?amaliaSaldo():am.reduce(function(s,e){return s+(e.tipo==='gasto'?num(e.importe):-num(e.importe));},0);
  var tGas=0,tReemb=0; am.forEach(function(e){ if(e.tipo==='gasto')tGas+=num(e.importe); else tReemb+=num(e.importe); });
  var rows=am.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');}).map(function(e){ return '<tr><td>'+(e.fecha?ddmmyyyy(e.fecha):'—')+'</td><td>'+_infEsc(e.concepto)+'</td><td>'+(e.tipo==='gasto'?'Gasto':'Reembolso')+'</td><td>'+_infEsc(e.nota||'')+'</td><td class="num" style="color:'+(e.tipo==='gasto'?'#dc2626':'#16a34a')+'">'+(e.tipo==='gasto'?'+':'−')+fmt(num(e.importe))+'</td></tr>';}).join('');
  var inner='';
  inner+='<h2>Reembolsables</h2>'+_infKpis([['Pendiente de cobro',fmt(saldo)],['Total gastos',fmt(tGas)],['Total reembolsado',fmt(tReemb)],['Nº movimientos',String(am.length)]]);
  inner+='<h2>Movimientos</h2><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Nota</th><th class="num">Importe</th></tr></thead><tbody>'+rows+'</tbody></table>';
  return _infDocWrap('Reembolsables (Amalia)',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.7 PLAN DE INVERSIÓN ============ */
function buildPlan(ctx){
  var pc=DB.planCompras||{}, pp=DB.planPresupuesto||{};
  var tickers=Object.keys(pc);
  var yset={}; tickers.forEach(function(t){ Object.keys(pc[t]||{}).forEach(function(y){ if(num(pc[t][y])>0)yset[y]=1; }); }); Object.keys(pp).forEach(function(y){ if(num(pp[y])>0)yset[y]=1; });
  var years=Object.keys(yset).sort();
  if(!years.length && !tickers.length)return _infDocWrap('Plan de inversión',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin plan de compras definido.</p>');
  var rowsY='',planTotByY={},execByY={};
  years.forEach(function(y){ var plan=0,ex=0; tickers.forEach(function(t){ var v=num((pc[t]||{})[y]||0); plan+=v; if(typeof execBuyEur==='function')ex+=execBuyEur(t.toUpperCase(),+y); }); planTotByY[y]=plan; execByY[y]=ex; var pres=num(pp[y]||0); var pend=Math.max(0,plan-ex); rowsY+='<tr><td>'+y+'</td><td class="num">'+fmt(pres)+'</td><td class="num">'+fmt(plan)+'</td><td class="num">'+fmt(ex)+'</td><td class="num">'+fmt(pend)+'</td></tr>'; });
  var chartY=(typeof gBars==='function')?gBars('Plan de compras por año',years,[{name:'Plan',color:'#2563eb',vals:years.map(function(y){return planTotByY[y];})},{name:'Ejecutado',color:'#16a34a',vals:years.map(function(y){return execByY[y];})}],{}):'';
  var pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){return p.acciones>0.0001;});
  var totVal=pos.reduce(function(s,p){return s+p.acciones*p.precioActual;},0);
  var realW={}; pos.forEach(function(p){ realW[(p.ticker||'').toUpperCase()]=(p.acciones*p.precioActual)/(totVal||1); });
  var obj=DB.distribObjetivo||{}; var divRows='',divChart=[]; var allT={};
  Object.keys(realW).forEach(function(t){allT[t]=1;}); Object.keys(obj).forEach(function(t){allT[t.toUpperCase()]=1;});
  Object.keys(allT).sort(function(a,b){return (realW[b]||0)-(realW[a]||0);}).forEach(function(t){ var rw=realW[t]||0; var ow=num(obj[t]||obj[t.toUpperCase()]||0); if(rw===0&&ow===0)return; var diff=rw-ow; divRows+='<tr><td><b>'+_infEsc(t)+'</b></td><td class="num">'+(rw*100).toFixed(1)+'%</td><td class="num">'+(ow*100).toFixed(1)+'%</td><td class="num" style="color:'+(diff>=0?'#2563eb':'#d97706')+'">'+(diff>=0?'+':'')+(diff*100).toFixed(1)+'%</td></tr>'; divChart.push({label:t,val:(rw-ow)*100}); });
  divChart.sort(function(a,b){return Math.abs(b.val)-Math.abs(a.val);});
  var chartDiv=(typeof gHBars==='function')?gHBars('Desvío diversificación (real − objetivo, pts%)',divChart,{top:12,labelW:70,pct:true,signColor:true}):'';
  var totPlan=years.reduce(function(s,y){return s+planTotByY[y];},0), totExec=years.reduce(function(s,y){return s+execByY[y];},0);
  var inner='';
  inner+='<h2>Plan de inversión</h2>'+_infKpis([['Plan total',fmt(totPlan)],['Ejecutado',fmt(totExec)],['Pendiente',fmt(Math.max(0,totPlan-totExec))],['Años con plan',String(years.length)]]);
  inner+=_infChartsWrap([chartY]);
  inner+='<h2>Plan por año</h2><table><thead><tr><th>Año</th><th class="num">Presupuesto</th><th class="num">Plan compras</th><th class="num">Ejecutado</th><th class="num">Pendiente</th></tr></thead><tbody>'+rowsY+'</tbody></table>';
  if(divRows){ inner+='<h2>Diversificación: real vs objetivo</h2>'+_infChartsWrap([chartDiv])+'<table><thead><tr><th>Empresa</th><th class="num">% real</th><th class="num">% objetivo</th><th class="num">Desvío</th></tr></thead><tbody>'+divRows+'</tbody></table>'; }
  return _infDocWrap('Plan de inversión',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.8 SEGUIMIENTO (MONITOR) ============ */
function buildMonitor(ctx){
  var pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){return p.acciones>0.0001;});
  var held=pos.map(function(p){return (p.ticker||'').toUpperCase();});
  if(!held.length)return _infDocWrap('Informe de seguimiento (monitor)',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin posiciones en cartera.</p>');
  var mon=DB.monitor||{}; var anaBy={}; (DB.analisis||[]).forEach(function(a){ anaBy[(a.ticker||'').toUpperCase()]=a; });
  var nowY=new Date().getFullYear(); var nInf=0,nOld=0,nPend=0,nStop=0;
  var rows=held.slice().sort().map(function(t){ var m=mon[t]||{}, a=anaBy[t]||{};
    var rol=m.rol||'—'; var inf=m.informe?'Sí':'Pendiente'; if(m.informe)nInf++;
    var mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null; var dossier=(mm==null)?'sin dossier':(mm>12?('hace '+mm+'m ⚠️'):('hace '+mm+'m')); if(mm!=null&&mm>12)nOld++;
    var qs=''; ['Q1','Q2','Q3','Q4'].forEach(function(q){ var pas=(typeof qPassed==='function')&&qPassed(t,q,nowY); var rev=!!(m.rev&&m.rev[nowY+'-'+q]); var col=rev?'#16a34a':(pas?'#dc2626':'#cbd5e1'); if(pas&&!rev)nPend++; qs+='<span style="color:'+col+';font-weight:700;margin-right:4px">'+q+'</span>'; });
    var cot=num(a.cotizacion),st=num(a.stopTesis); var stop=(st>0&&cot>0&&cot<=st); if(stop)nStop++;
    return '<tr'+(stop?' style="background:#fef2f2"':'')+'><td><b>'+_infEsc(t)+'</b></td><td>'+_infEsc(rol)+'</td><td>'+inf+'</td><td>'+dossier+'</td><td>'+qs+'</td><td>'+(stop?'<span style="color:#dc2626">stop</span>':'ok')+'</td></tr>';
  }).join('');
  var inner='';
  inner+='<h2>Seguimiento de cartera</h2>'+_infKpis([['Empresas en cartera',String(held.length)],['Con informe',String(nInf)],['Dossiers >12m',String(nOld)],['Trim. sin revisar',String(nPend)],['Stops tocados',String(nStop)]]);
  inner+='<h2>Estado por empresa</h2><table><thead><tr><th>Empresa</th><th>Rol</th><th>Informe</th><th>Dossier</th><th>Trimestres '+nowY+'</th><th>Stop</th></tr></thead><tbody>'+rows+'</tbody></table>';
  inner+='<div class="resumen"><p class="muted">Trimestres: verde = revisado, rojo = publicado sin revisar, gris = aún no publicado. Dossier en rojo si tiene más de 12 meses.</p></div>';
  return _infDocWrap('Informe de seguimiento (monitor)',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.9 PROYECCIÓN / JUBILACIÓN ============ */
function buildProyeccion(ctx){
  if(typeof proyDefaults==='function')proyDefaults();
  var c=(DB.config&&DB.config.proyeccion);
  if(!c||typeof computeProy!=='function')return _infDocWrap('Informe de proyección',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin modelo de proyección configurado.</p>');
  var rows=computeProy(c);
  if(!rows.length)return _infDocWrap('Informe de proyección',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">Sin datos de proyección.</p>');
  var nowY=new Date().getFullYear();
  var actual=rows.filter(function(r){return r.anio<=nowY;}).slice(-1)[0]||rows[0];
  var jub=rows.filter(function(r){return r.trasJub;})[0]||rows[rows.length-1];
  var fin=rows[rows.length-1];
  var labels=rows.map(function(r){return String(r.anio);});
  var chart=(typeof gLines==='function')?gLines('Patrimonio proyectado (teórico)',labels,[{name:'Patrimonio',color:'#2563eb',vals:rows.map(function(r){return r.patrimonio;})}]):'';
  var chartDiv=(typeof gBars==='function')?gBars('Dividendo bruto proyectado',labels,[{name:'Dividendo',color:'#d97706',vals:rows.map(function(r){return r.dividendoAnual;})}],{}):'';
  var trs=rows.map(function(r){ var pr=r.patrimonioReal; var bg=(typeof proyColor==='function'&&pr!=null)?proyColor(pr,r.patrimonio):'transparent'; return '<tr><td>'+r.anio+'</td><td class="num">'+r.edad+'</td><td class="num">'+fmt(r.aInversion)+'</td><td class="num">'+fmt(r.cartera)+'</td><td class="num" style="font-weight:600">'+fmt(r.patrimonio)+'</td><td class="num" style="background:'+bg+'">'+(pr!=null?fmt(pr):'—')+'</td><td class="num">'+fmt(r.dividendoAnual)+'</td></tr>'; }).join('');
  var inner='';
  inner+='<h2>Proyección de patrimonio</h2>'+_infKpis([['Patrimonio actual',fmt(actual.patrimonio)],['Patrimonio a jubilación',fmt(jub.patrimonio)],['Dividendo/año a jub.',fmt(jub.dividendoAnual)],['Horizonte',rows.length+' años'],['Edad final',String(fin.edad)]]);
  inner+=_infChartsWrap([chart,chartDiv]);
  inner+='<h2>Detalle año a año</h2><table><thead><tr><th>Año</th><th class="num">Edad</th><th class="num">Aportación</th><th class="num">Cartera teórica</th><th class="num">Patrim. teórico</th><th class="num">Patrim. real</th><th class="num">Dividendo/año</th></tr></thead><tbody>'+trs+'</tbody></table>';
  inner+='<div class="resumen"><p class="muted">Patrimonio teórico = modelo compuesto (revalorización + aportaciones). Patrimonio real (años ya vividos) se reconstruye con cotizaciones de cierre. Verde/ámbar/rojo = real frente a teórico.</p></div>';
  return _infDocWrap('Informe de proyección',['A fecha de '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ COMBUSTIBLE (Mazinger Z) ============ */
function buildCombustible(ctx){
  var all=(typeof _mzCalc==='function')?_mzCalc():[];
  var rows=all.filter(function(e){ return e.fecha && e.fecha>=ctx.s0 && e.fecha<=ctx.s1; });
  if(!rows.length)return _infDocWrap('Informe de combustible (Mazinger Z)',[_infEsc(ctx.label)],'<p class="muted">Sin repostajes en el periodo.</p>');
  var totKm=0,totLit=0,gastoTramos=0,gastoTot=0,litTot=0;
  rows.forEach(function(e){ gastoTot+=num(e.precio); litTot+=num(e.litros); if(e._kmRec){ totKm+=e._kmRec; totLit+=num(e.litros); gastoTramos+=num(e.precio); } });
  var cons=totKm?totLit/totKm*100:0, eurL=litTot?gastoTot/litTot:0, eur100=totKm?gastoTramos/totKm*100:0;
  var fN=function(x,d){ return num(x).toFixed(d).replace('.',','); };
  var pts=rows.filter(function(e){return e._cons!=null;});
  var ch1=(typeof gLine==='function'&&pts.length)?gLine('Consumo por repostaje (L/100km)',pts.map(function(e){return ddmmyyyy(e.fecha).slice(0,5);}),pts.map(function(e){return e._cons;}),{}):'';
  var byM={}; rows.forEach(function(e){ var m=(e.fecha||'').slice(0,7); if(m)byM[m]=(byM[m]||0)+num(e.precio); });
  var mk=Object.keys(byM).sort();
  var ch2=(typeof gBars==='function'&&mk.length)?gBars('Gasto por mes (€)',mk.map(function(m){return m.slice(5)+'/'+m.slice(2,4);}),[{name:'Gasto',color:'#dc2626',vals:mk.map(function(m){return byM[m];})}],{}):'';
  var trs=rows.slice().reverse().map(function(e){ return '<tr><td>'+ddmmyyyy(e.fecha)+'</td><td class="num">'+fN(e.km,0)+'</td><td class="num">'+(e.autonomia!=null&&e.autonomia!==''?fN(e.autonomia,0):'—')+'</td><td class="num">'+fN(e.litros,2)+'</td><td class="num">'+fmt(num(e.precio))+'</td><td class="num">'+(e._kmRec!=null?fN(e._kmRec,0):'—')+'</td><td class="num" style="font-weight:600">'+(e._cons!=null?fN(e._cons,2):'—')+'</td><td class="num">'+(e._eur100!=null?fN(e._eur100,2):'—')+'</td></tr>'; }).join('');
  trs+='<tr class="tot"><td colspan="5">TOTAL ('+rows.length+' repostajes)</td><td class="num">'+fN(totKm,0)+'</td><td class="num">'+fN(cons,2)+'</td><td class="num">'+fN(eur100,2)+'</td></tr>';
  var inner='';
  inner+='<h2>Consumo del vehículo</h2>'+_infKpis([['Consumo medio',fN(cons,2)+' L/100km'],['Km recorridos',fN(totKm,0)+' km'],['Litros',fN(totLit,2)+' L'],['Gasto total',fmt(gastoTot)],['Coste medio',fN(eur100,2)+' €/100km'],['Precio medio',fN(eurL,3)+' €/L']]);
  inner+=_infChartsWrap([ch1,ch2]);
  inner+='<h2>Repostajes</h2><table><thead><tr><th>Fecha</th><th class="num">Km coche</th><th class="num">Auton.</th><th class="num">Litros</th><th class="num">Precio</th><th class="num">Km recorr.</th><th class="num">L/100km</th><th class="num">€/100km</th></tr></thead><tbody>'+trs+'</tbody></table>';
  inner+='<div class="resumen"><p class="muted">Método de lleno a lleno: los litros de cada repostaje cubren los km desde el anterior. El primer repostaje del histórico no entra en la media.</p></div>';
  return _infDocWrap('Informe de combustible (Mazinger Z)',[_infEsc(ctx.label)+' · emitido el '+ddmmyyyy(_infHoyS())],inner);
}

/* ============ 4.10 INFORME POR EMPRESA (ficha + tesis + situacion + evolucion) ============ */
var INF_LOGO_KHB='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgMTU2IDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iS0hCIEVxdWl0eSBJbnZlc3RtZW50Ij4KICAgICAgPGcgZm9udC1mYW1pbHk9IidBcmlhbCBCbGFjaycsJ0FyaWFsIE5hcnJvdyBCb2xkJyxBcmlhbCxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjQ2Ij4KICAgICAgICA8dGV4dCB4PSIwIiAgeT0iNDIiIGZpbGw9IiMxZjNkNmIiPks8L3RleHQ+CiAgICAgICAgPHRleHQgeD0iNDAiIHk9IjQyIiBmaWxsPSIjM2E3ZDQ0Ij5IPC90ZXh0PgogICAgICAgIDx0ZXh0IHg9IjgyIiB5PSI0MiIgZmlsbD0iIzNhN2Q0NCI+QjwvdGV4dD4KICAgICAgPC9nPgogICAgICA8ZyBmaWxsPSJub25lIiBzdHJva2U9IiMxZjNkNmIiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj4KICAgICAgICA8cG9seWxpbmUgcG9pbnRzPSI4NiwzNCAxMDQsMTYgMTE0LDI0IDEzOCw2Ii8+CiAgICAgIDwvZz4KICAgICAgPHBvbHlnb24gcG9pbnRzPSIxNDgsMiAxMjYsNCAxNDIsMjAiIGZpbGw9IiMxZjNkNmIiLz4KICAgIDwvc3ZnPg==';
function _infDocWrapKHB(titulo, metas, inner){
  var m=(metas||[]).map(function(x){return '<div class="metaline">'+x+'</div>';}).join('');
  return '<div class="infDoc">'
    +'<div class="infHdr"><img src="'+INF_LOGO_KHB+'" alt="KHB Equity Investment" style="height:56px"><div class="tt"><h1>'+_infEsc(titulo)+'</h1><div class="sub">KHB Equity Investment · Analisis y Gestion de Carteras</div></div></div><div class="accent"></div>'
    +m+inner
    +'<div class="foot"><span>KHB Equity Investment · Informes y Gestion de Carteras</span><span></span></div>'
    +'</div>';
}
function _infTrimTabla(t){
  t=(t||'').toUpperCase(); var d=(typeof _trimCache!=='undefined')?_trimCache[t]:null;
  if(!d||!d.revisiones||!d.revisiones.length)return '<p class="muted">Sin informes trimestrales registrados para esta empresa.</p>';
  var semCol={V:'#16a34a',A:'#d97706',R:'#dc2626'}; var semTxt={V:'🟢 VERDE',A:'🟡 AMBAR',R:'🔴 ROJO'};
  var revs=d.revisiones.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});
  var trend=d.revisiones.slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');}).map(function(r){ var s=(r.semaforoGlobal||'').toUpperCase(); return (semTxt[s]||'·').split(' ')[0]; }).join(' → ');
  var rows=revs.map(function(r){ var s=(r.semaforoGlobal||'').toUpperCase(); var intac=(r.tesisSigueIntacta===false)?'<span style="color:#dc2626;font-weight:700">en revision</span>':(r.tesisSigueIntacta===true?'<span style="color:#16a34a;font-weight:700">intacta</span>':'—');
    return '<tr><td>'+_trimEsc(r.periodo||'—')+'</td><td>'+(r.fecha?ddmmyyyy(r.fecha):'—')+'</td><td style="color:'+(semCol[s]||'#475569')+';font-weight:700">'+(semTxt[s]||s||'—')+'</td><td>'+intac+'</td><td>'+_trimEsc(r.resumen||'')+'</td></tr>'; }).join('');
  var last=revs[0]; var metr=(last&&last.metricas)?last.metricas.map(function(m){return '<tr><td>'+_trimEsc(m.nombre)+'</td><td class="num" style="font-weight:600">'+_trimFmt(m.valor)+'</td></tr>';}).join(''):'';
  var html='';
  if(d.revisiones.length>1)html+='<div class="metaline" style="font-size:13px;margin:0 0 6px">Progreso del semaforo: '+trend+'</div>';
  html+='<table><thead><tr><th>Periodo</th><th>Fecha</th><th>Semaforo</th><th>Tesis</th><th>Resumen del trimestre</th></tr></thead><tbody>'+rows+'</tbody></table>';
  if(metr)html+='<h3>Metricas del ultimo trimestre ('+_trimEsc(last.periodo||'')+')</h3><table><thead><tr><th>Metrica</th><th class="num">Valor</th></tr></thead><tbody>'+metr+'</tbody></table>';
  return html;
}
function _infEmpresaUniverse(){
  var seen={}, out=[];
  function add(t,nombre){ t=(t||'').toUpperCase(); if(!t||seen[t])return; seen[t]=1; out.push({t:t,nombre:nombre||t}); }
  (DB.analisis||[]).forEach(function(a){ add(a.ticker,a.nombre); });
  try{ (invPositions()||[]).forEach(function(p){ if(p.acciones>0.0001) add(p.ticker,p.nombre); }); }catch(e){}
  (DB.cerradas||[]).forEach(function(c){ add(c.ticker,c.nombre); });
  out.sort(function(a,b){ return a.t.localeCompare(b.t); });
  return out;
}
function _infResolveEmpresa(str){
  str=(str||'').trim(); if(!str)return '';
  if(str.indexOf(' — ')>=0) str=str.split(' — ')[0].trim();
  var up=str.toUpperCase(); var uni=_infEmpresaUniverse(); var set={}; uni.forEach(function(x){set[x.t]=1;});
  if(set[up])return up;
  var hit=uni.filter(function(x){return (x.nombre||'').toUpperCase()===up;})[0]; if(hit)return hit.t;
  if(typeof anaFindTicker==='function'){ var ft=(''+(anaFindTicker(str)||'')).toUpperCase(); if(ft&&set[ft])return ft; }
  hit=uni.filter(function(x){return x.t.indexOf(up)===0||(x.nombre||'').toUpperCase().indexOf(up)===0;})[0]; if(hit)return hit.t;
  return '';
}
function _infEstadoEntrada(cot,entMax){ if(!(cot>0&&entMax>0))return '—'; if(cot<=entMax)return '<span style="color:#16a34a;font-weight:700">en zona de compra</span>'; return '<span style="color:#dc2626;font-weight:700">+'+((cot/entMax-1)*100).toFixed(0)+'% sobre la entrada</span>'; }
function _infTesisHistTabla(t){
  t=(t||'').toUpperCase(); var arr=(((DB.tesisHist||{})[t])||[]).slice().sort(function(x,y){return (y.fecha||'').localeCompare(x.fecha||'');});
  var a=(DB.analisis||[]).filter(function(x){return (x.ticker||'').toUpperCase()===t;})[0]||{}; var ahora=num(a.cotizacion); var dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  if(!arr.length)return '<p class="muted">Sin fotos de la tesis registradas todavia.</p>';
  var rows=arr.map(function(sn){ var then=num(sn.cotizacion); var rent=(then&&ahora)?(ahora/then-1):null; var d=(sn.decision||'').toUpperCase(); var mk='—',mc='#64748b';
    if(rent!=null){ if(d==='COMPRAR'||d==='MANTENER'){ mk=rent>=0?'acertada':'a la baja'; mc=rent>=0?'#16a34a':'#dc2626'; } else if(d==='VENDER'){ mk=rent<0?'acertada':'subio'; mc=rent<0?'#16a34a':'#dc2626'; } else if(d==='ESPERAR'){ if(rent>0.05){mk='se escapo +'+(rent*100).toFixed(0)+'%';mc='#d97706';} else if(rent<0){mk='bien esperado';mc='#16a34a';} else {mk='neutral';} } }
    return '<tr><td>'+(sn.fecha?ddmmyyyy(sn.fecha):'—')+'</td><td style="color:'+(dc[d]||'#475569')+';font-weight:700">'+(d||'—')+'</td><td class="num">'+(sn.rating||'—')+(sn.score!=null?' · '+Math.round(sn.score):'')+'</td><td class="num">'+(sn.poBase?fmt(sn.poBase):'—')+'</td><td class="num">'+(then?fmt(then):'—')+'</td><td class="num" style="color:'+(rent==null?'#111':(rent>=0?'#16a34a':'#dc2626'))+'">'+(rent==null?'—':(rent>=0?'+':'')+(rent*100).toFixed(1)+'%')+'</td><td style="color:'+mc+'">'+mk+'</td></tr>';
  }).join('');
  return '<table><thead><tr><th>Fecha</th><th>Decision</th><th class="num">Rating·Score</th><th class="num">PO base</th><th class="num">Cotiz. entonces</th><th class="num">Rentab. desde</th><th>Resultado</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function _infChartCotizacion(t){
  t=(t||'').toUpperCase();
  var pj=(typeof _precioCache!=='undefined')?_precioCache[t]:null;
  if(!pj||!pj.data||!pj.data.length)return '<p class="muted">Sin datos de cotizacion en el repositorio para '+t+' (no esta en precios/ del repo).</p>';
  var data=pj.data.map(function(d){return [Date.parse(d[0]+'T00:00:00'),num(d[1])];}).filter(function(d){return !isNaN(d[0]);});
  if(data.length<2)return '<p class="muted">Sin datos suficientes de cotizacion.</p>';
  var MAXP=600; var step=Math.ceil(data.length/MAXP); var pts=step>1?data.filter(function(_,i){return i%step===0;}):data.slice();
  if(pts[pts.length-1][0]!==data[data.length-1][0])pts.push(data[data.length-1]);
  var a=(DB.analisis||[]).filter(function(x){return (x.ticker||'').toUpperCase()===t;})[0]||{};
  var poB=num(a.poMin),poU=num(a.poMax),poM=(poB&&poU)?(poB+poU)/2:(poU||poB||0); var entL=num(a.entMin),entH=num(a.entMax),stopV=num(a.stopTesis);
  var poss=[]; try{ poss=(invPositions()||[]).filter(function(p){return (p.ticker||'').toUpperCase()===t&&p.acciones>0.0001;}); }catch(e){}
  var accS=0,costS=0; poss.forEach(function(p){accS+=p.acciones;costS+=p.acciones*p.precioCompra;}); var avg=accS?costS/accS:0;
  var t0=data[0][0],t1=data[data.length-1][0];
  var ops=(typeof fichaOps==='function'?fichaOps(t):[]).filter(function(o){return o.fecha&&Date.parse(o.fecha+'T00:00:00')>=t0&&Date.parse(o.fecha+'T00:00:00')<=t1;}).map(function(o){return {x:Date.parse(o.fecha+'T00:00:00'),p:num(o.precio),venta:o.tipo==='venta'};});
  var W=820,H=300,L=52,R=14,Tp=12,B=26; var pw=W-L-R,ph=H-Tp-B;
  var lo=Math.min.apply(null,pts.map(function(p){return p[1];})), hi=Math.max.apply(null,pts.map(function(p){return p[1];}));
  ops.forEach(function(o){ if(o.p){ if(o.p<lo)lo=o.p; if(o.p>hi)hi=o.p; } }); if(avg){ if(avg<lo)lo=avg; if(avg>hi)hi=avg; } [poB,poM,poU,entL,entH,stopV].forEach(function(v){ if(v>0){ if(v<lo)lo=v; if(v>hi)hi=v; } });
  var pad=(hi-lo)*0.06||1; lo-=pad; hi+=pad;
  var X=function(x){return L+(x-t0)/((t1-t0)||1)*pw;}, Y=function(v){return Tp+(1-(v-lo)/((hi-lo)||1))*ph;};
  var path=''; pts.forEach(function(p,i){ path+=(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)+' '; });
  var grid=''; var NY=4; for(var i=0;i<=NY;i++){ var vv=lo+(hi-lo)*i/NY, yy=Y(vv); grid+='<line x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+yy.toFixed(1)+'" stroke="#e2e8f0"/><text x="'+(L-5)+'" y="'+(yy+3).toFixed(1)+'" text-anchor="end" font-size="9" fill="#64748b">'+vv.toFixed(2)+'</text>'; }
  var xl=''; var yA=new Date(t0).getFullYear(), yB=new Date(t1).getFullYear(); var sY=Math.ceil((yB-yA+1)/8)||1; for(var y=yA;y<=yB;y+=sY){ var ts=Date.parse(y+'-01-01'); if(ts<t0||ts>t1)continue; var x=X(ts); xl+='<line x1="'+x.toFixed(1)+'" y1="'+Tp+'" x2="'+x.toFixed(1)+'" y2="'+(Tp+ph)+'" stroke="#f1f5f9"/><text x="'+x.toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="9" fill="#64748b">'+y+'</text>'; }
  var avgL=''; if(avg){ var ayy=Y(avg); avgL='<line x1="'+L+'" y1="'+ayy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+ayy.toFixed(1)+'" stroke="#7c3aed" stroke-width="1.2" stroke-dasharray="5 3"/><text x="'+(W-R)+'" y="'+(ayy-3).toFixed(1)+'" text-anchor="end" font-size="9" fill="#7c3aed">P.medio '+avg.toFixed(2)+'</text>'; }
  var poBand=''; if(poB>0&&poU>0){ var yt=Y(Math.max(poB,poU)),yb=Y(Math.min(poB,poU)); poBand='<rect x="'+L+'" y="'+yt.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+(yb-yt).toFixed(1)+'" fill="#16a34a" opacity="0.10"/>'; }
  var entBand=''; if(entL>0&&entH>0){ var et=Y(Math.max(entL,entH)),eb=Y(Math.min(entL,entH)); entBand='<rect x="'+L+'" y="'+et.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+(eb-et).toFixed(1)+'" fill="#0ea5e9" opacity="0.12"/>'; }
  var stopL=''; if(stopV>0){ var sy=Y(stopV); stopL='<line x1="'+L+'" y1="'+sy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+sy.toFixed(1)+'" stroke="#dc2626" stroke-width="2" opacity="0.95"/><text x="'+(L+3)+'" y="'+(sy-2).toFixed(1)+'" font-size="9" fill="#dc2626">Stop '+stopV.toFixed(2)+'</text>'; }
  var poL=''; [['bear',poB,'#dc2626',2],['base',poM,'#2563eb',1.1],['bull',poU,'#16a34a',2]].forEach(function(it){ var v=it[1]; if(v>0){ var y2=Y(v); poL+='<line x1="'+L+'" y1="'+y2.toFixed(1)+'" x2="'+(W-R)+'" y2="'+y2.toFixed(1)+'" stroke="'+it[2]+'" stroke-width="'+it[3]+'" stroke-dasharray="'+(it[3]>=2?'7 3':'2 3')+'" opacity="0.9"/><text x="'+(L+3)+'" y="'+(y2-2).toFixed(1)+'" font-size="9" fill="'+it[2]+'">PO '+it[0]+' '+v.toFixed(2)+'</text>'; } });
  var mk=''; ops.forEach(function(o){ if(!o.p)return; mk+='<circle cx="'+X(o.x).toFixed(1)+'" cy="'+Y(o.p).toFixed(1)+'" r="4" fill="'+(o.venta?'#dc2626':'#16a34a')+'" stroke="#fff" stroke-width="1"/>'; });
  var last=pts[pts.length-1][1];
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">'+grid+xl+entBand+poBand+'<path d="'+path+'" fill="none" stroke="#1E3A5F" stroke-width="1.6"/>'+poL+stopL+avgL+mk+'</svg><div class="muted" style="font-size:11px;margin-top:2px">Ultimo cierre '+last.toFixed(2)+' ('+pj.data[pj.data.length-1][0]+') · verde=compra · rojo=venta · morado=precio medio · banda verde=objetivo (bear-bull) · banda azul=entrada · linea roja=stop</div>';
}
function _infPresentacion(t,nombre,sector,sub){
  var j=(typeof _tesisCache!=='undefined')?_tesisCache[t]:null;
  var esc=_infEsc;
  var html='<p>'+esc(nombre)+' ('+t+') es una compania encuadrada en el arquetipo <b>'+esc(sector)+'</b>'+(sub?(' — '+esc(sub)):'')+'.';
  if(j&&j.metodoValoracion)html+=' Metodo de valoracion aplicado en el dossier: <b>'+esc(j.metodoValoracion)+'</b>.';
  html+='</p>';
  if(j){
    if(j.resumen)html+='<div class="resumen"><p>'+esc(j.resumen)+'</p></div>';
    if(j.moat)html+='<p><b>Ventaja competitiva (moat):</b> '+esc(j.moat)+'</p>';
    var lst=function(arr){ return (Array.isArray(arr)&&arr.length)?('<ul style="margin:4px 0 0 16px">'+arr.map(function(x){return '<li style="margin:2px 0">'+esc(x)+'</li>';}).join('')+'</ul>'):'<span class="muted">—</span>'; };
    html+='<div class="infCharts" style="gap:14px"><div style="flex:1 1 220px;min-width:220px"><b style="color:#16a34a">Catalizadores</b>'+lst(j.catalizadores)+'</div><div style="flex:1 1 220px;min-width:220px"><b style="color:#dc2626">Riesgos</b>'+lst(j.riesgos)+'</div></div>';
    if(j.bull||j.bear)html+='<table><thead><tr><th>Tesis a favor</th><th>Tesis en contra</th></tr></thead><tbody><tr><td>'+esc(j.bull||'—')+'</td><td>'+esc(j.bear||'—')+'</td></tr></tbody></table>';
  } else {
    html+='<p class="muted">Aun no hay resumen cualitativo del dossier (dossiers/'+t+'.json) cargado; se muestran los datos cuantitativos del analisis. Sube el TICKER.json a la carpeta dossiers/ del repo para incluir moat, catalizadores, riesgos y tesis a favor/en contra.</p>';
  }
  return html;
}
function _infLotesTabla(f){
  if(!f||!f.lotes||!f.lotes.length)return '';
  var rows=f.lotes.map(function(l){ return '<tr><td>'+(l.fecha?ddmmyyyy(l.fecha):'—')+'</td><td>'+_infEsc(l.cartera||'Propia')+'</td><td class="num">'+Math.round(l.N)+'</td><td class="num">'+fmt(l.P)+'</td><td class="num">'+fmt(l.coste)+'</td><td class="num">'+fmt(l.divCobrado)+'</td><td class="num">'+fmt(l.precioNeto)+'</td><td class="num">'+fmt(l.valor)+'</td><td class="num" style="color:'+(l.balance>=0?'#16a34a':'#dc2626')+'">'+(l.balance>=0?'+':'')+fmt(l.balance)+'</td><td class="num">'+(l.rentTotal>=0?'+':'')+(l.rentTotal*100).toFixed(1)+'%</td></tr>'; }).join('');
  return '<h3>Lotes de compra y rentabilidad por lote</h3><table><thead><tr><th>Fecha</th><th>Cartera</th><th class="num">Acc.</th><th class="num">Precio</th><th class="num">Coste</th><th class="num">Div. cobrado</th><th class="num">Precio neto</th><th class="num">Valor hoy</th><th class="num">Balance</th><th class="num">Rent. total</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function buildEmpresa(ctx,tOverride){
  var t=((tOverride||(ctx&&ctx.empresa)||'')+'').toUpperCase();
  if(!t)return _infDocWrapKHB('Informe por empresa',['A fecha de '+ddmmyyyy(_infHoyS())],'<p class="muted">No se ha elegido ninguna empresa.</p>');
  var a=(DB.analisis||[]).filter(function(x){return (x.ticker||'').toUpperCase()===t;})[0]||{};
  var v=(DB.valores||{})[t]||{};
  var nombre=a.nombre||v.nombre||t;
  var sector=(typeof SECTOR!=='undefined'&&SECTOR[t])||'—';
  var sub=(typeof SUBTIPO!=='undefined'&&SUBTIPO[t])||'';
  var f=(typeof fichaCalc==='function')?fichaCalc(t):null;
  var cot=num(a.cotizacion)||num(v.precioActual)||(f?f.precioActual:0);
  var bear=num(a.poMin),bull=num(a.poMax); var base=(bear&&bull)?(bear+bull)/2:(num(a.precioObjetivo)||bull||bear||0);
  var entMin=num(a.entMin),entMax=num(a.entMax),stop=num(a.stopTesis);
  var dec=(a.decision||'').toUpperCase(), rating=(a.rating||'').toUpperCase();
  var dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  var pot=(cot&&base)?(base/cot-1)*100:null; var potBull=(cot&&bull)?(bull/cot-1)*100:null;
  var potStr=(pot!=null)?((pot>=0?'+':'')+pot.toFixed(0)+'%'):'—';
  var mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null;
  var dossierTxt=(a.dossierFecha?('dossier '+ddmmyyyy(a.dossierFecha)+(mm!=null?(' · hace '+mm+' m'+(mm>12?' (conviene reanalizar)':'')):'')):'sin dossier');
  var posList=[]; try{ posList=(invPositions()||[]).filter(function(p){return (p.ticker||'').toUpperCase()===t&&p.acciones>0.0001;}); }catch(e){}
  var esHeld=posList.length>0;
  var esCerrada=(DB.cerradas||[]).some(function(c){return (c.ticker||'').toUpperCase()===t;});
  var acc=0,coste=0,pa=cot; posList.forEach(function(p){ acc+=p.acciones; coste+=p.acciones*p.precioCompra; if(p.precioActual)pa=p.precioActual; });
  var valor=acc*pa, pl=valor-coste, plpct=coste?pl/coste*100:0;
  var divCobr=(f&&f.tot)?f.tot.div:0; var netoMedio=(f&&f.tot)?f.tot.netoMedio:0; var precioMedio=(coste&&acc)?coste/acc:((f&&f.tot)?f.tot.precioMedio:0);
  var rentTot=coste?(pl+divCobr)/coste*100:0; var balanceTot=pl+divCobr;
  var divAccAnual=num(a.divAccion)||num(v.divAccion)||(posList[0]?posList[0].divAccion:0);
  var rpd=valor?(acc*divAccAnual)/valor*100:0; var yoc=coste?(acc*divAccAnual)/coste*100:0;
  var totPort=0; try{ (invPositions()||[]).forEach(function(p){ if(p.acciones>0.0001)totPort+=p.acciones*p.precioActual; }); }catch(e){}
  var peso=totPort?valor/totPort*100:0;
  var estadoBadge=esHeld?'<span style="color:#16a34a;font-weight:700">POSICION ABIERTA</span>':(esCerrada?'<span style="color:#64748b;font-weight:700">POSICION CERRADA</span>':'<span style="color:#d97706;font-weight:700">PENDIENTE DE ABRIR / DECIDIR</span>');
  var metas=[_infEsc(nombre)+' ('+t+') · '+_infEsc(sector)+(sub?(' · '+_infEsc(sub)):''), 'A fecha de '+ddmmyyyy(_infHoyS())+' · '+dossierTxt];
  var inner='<style>#informePrint .kpis,#informePrint .kpi,#informePrint .infCharts>*,#informePrint .resumen{break-inside:avoid;page-break-inside:avoid}</style>';
  inner+='<h2>Presentacion de la empresa</h2>'+_infPresentacion(t,nombre,sector,sub);
  inner+='<h2>Ficha y veredicto</h2>';
  inner+='<div class="metaline" style="font-size:13px;margin:0 0 6px">Estado de la inversion: '+estadoBadge+'</div>';
  inner+=_infKpis([['Decision','<span style="color:'+(dc[dec]||'#475569')+'">'+(dec||'—')+'</span>'],['Calidad',(rating||'—')],['Cotizacion',(cot?fmt(cot):'—')],['PO base',(base?fmt(base):'—')],['Potencial',potStr]]);
  inner+='<h2>Cotizacion</h2>'+_infChartCotizacion(t);
  var chartVal=(typeof gBars==='function'&&(bear||base||bull))?gBars('Rango de valoracion vs cotizacion',['Pesimista','Base','Optimista','Cotizacion'],[{name:'€',color:'#1E3A5F',vals:[bear,base,bull,cot]}],{}):'';
  var tRows=''
    +'<tr><td>PO pesimista (bear)</td><td class="num">'+(bear?fmt(bear):'—')+'</td></tr>'
    +'<tr><td>PO base</td><td class="num">'+(base?fmt(base):'—')+'</td></tr>'
    +'<tr><td>PO optimista (bull)</td><td class="num">'+(bull?fmt(bull):'—')+'</td></tr>'
    +'<tr><td>Banda de entrada</td><td class="num">'+((entMin||entMax)?(fmt(entMin)+' – '+fmt(entMax)):'—')+'</td></tr>'
    +'<tr><td>Stop de tesis</td><td class="num">'+(stop?fmt(stop):'—')+'</td></tr>'
    +'<tr><td>Cotizacion actual</td><td class="num">'+(cot?fmt(cot):'—')+'</td></tr>'
    +'<tr><td>Potencial a PO base</td><td class="num">'+potStr+'</td></tr>'
    +'<tr><td>Potencial a PO optimista</td><td class="num">'+(potBull!=null?((potBull>=0?'+':'')+potBull.toFixed(0)+'%'):'—')+'</td></tr>'
    +'<tr><td>Estado de entrada</td><td class="num">'+_infEstadoEntrada(cot,entMax)+'</td></tr>';
  inner+='<h2>Tesis de inversion</h2>';
  if(chartVal)inner+=_infChartsWrap([chartVal]);
  inner+='<table><thead><tr><th>Parametro</th><th class="num">Valor</th></tr></thead><tbody>'+tRows+'</tbody></table>';
  if(!(bear||bull||dec))inner+='<p class="muted">Esta empresa aun no tiene tesis ni veredicto registrados en el analisis.</p>';
  inner+='<h2>Situacion</h2>';
  if(esHeld){
    inner+=_infKpis([['Acciones',String(Math.round(acc))],['Precio medio',fmt(precioMedio)],['Precio neto',fmt(netoMedio)],['Valor',fmt(valor)],['Coste',fmt(coste)]]);
    inner+=_infKpis([['Plusvalia',(pl>=0?'+':'')+fmt(pl)+' ('+(plpct>=0?'+':'')+plpct.toFixed(1)+'%)'],['Dividendos cobrados',fmt(divCobr)],['Balance total',(balanceTot>=0?'+':'')+fmt(balanceTot)],['Rentab. total',(rentTot>=0?'+':'')+rentTot.toFixed(1)+'%'],['Peso en cartera',peso.toFixed(1)+'%']]);
    inner+=_infKpis([['RPD',rpd.toFixed(1)+'%'],['YoC',yoc.toFixed(1)+'%'],['Div/accion (año)',fmt(divAccAnual)]]);
    var stopLine=''; if(stop>0&&cot>0){ stopLine=(cot<=stop)?('<b style="color:#dc2626">La cotizacion ha tocado el stop de tesis ('+fmt(stop)+'): revisar la posicion.</b>'):('Colchon sobre el stop de tesis: '+((cot/stop-1)*100).toFixed(0)+'%.'); }
    inner+='<div class="resumen"><p>Tienes <b>'+Math.round(acc)+'</b> acciones compradas a un precio medio de <b>'+fmt(precioMedio)+'</b> (neto <b>'+fmt(netoMedio)+'</b> tras descontar dividendos). Hoy valen <b>'+fmt(valor)+'</b> frente a un coste de <b>'+fmt(coste)+'</b>, con una plusvalia latente de <b style="color:'+(pl>=0?'#16a34a':'#dc2626')+'">'+(pl>=0?'+':'')+fmt(pl)+'</b> ('+(plpct>=0?'+':'')+plpct.toFixed(1)+'%). Sumando los <b>'+fmt(divCobr)+'</b> cobrados en dividendos, el balance total es de <b>'+(balanceTot>=0?'+':'')+fmt(balanceTot)+'</b> y la rentabilidad total del <b>'+rentTot.toFixed(1)+'%</b>. '+stopLine+'</p></div>';
    inner+=_infLotesTabla(f);
    if(typeof fichaOpsTabla==='function'){ var _oh=fichaOpsTabla(t); if(_oh)inner+=_oh; }
  } else if(esCerrada){
    inner+='<div class="resumen"><p>Posicion <b>cerrada</b>. Ya no la mantienes en cartera; permanece en el radar por si vuelve a ser una oportunidad.</p></div>';
    if(typeof fichaOpsTabla==='function'){ var _oc=fichaOpsTabla(t); if(_oc)inner+=_oc; }
  } else {
    inner+=_infKpis([['Cotizacion',(cot?fmt(cot):'—')],['Decision','<span style="color:'+(dc[dec]||'#475569')+'">'+(dec||'—')+'</span>'],['PO base',(base?fmt(base):'—')],['Potencial',potStr],['Entrada','≤ '+(entMax?fmt(entMax):'—')]]);
    var falta=''; if(entMax>0&&cot>0){ falta=(cot<=entMax)?('La cotizacion ya esta en zona de compra (≤ '+fmt(entMax)+').'):('Para entrar en zona deberia caer un '+((cot/entMax-1)*100).toFixed(0)+'% (hasta '+fmt(entMax)+').'); }
    inner+='<div class="resumen"><p>Posicion <b>pendiente de abrir o decidir</b>. Decision actual del analisis: <b style="color:'+(dc[dec]||'#475569')+'">'+(dec||'sin definir')+'</b>. La empresa cotiza a <b>'+fmt(cot)+'</b>'+((base&&pot!=null)?(', frente a un precio objetivo base de <b>'+fmt(base)+'</b> ('+potStr+' de potencial)'):'')+'. '+falta+' '+_infEstadoEntrada(cot,entMax)+'.</p></div>';
  }
  inner+='<h2>Informes trimestrales y progreso de la tesis</h2>'+_infTrimTabla(t);
  inner+='<h2>Evolucion</h2>';
  var dpa=(DB.divPorAccion||{})[t]||{}; var yrs=Object.keys(dpa).filter(function(y){return num(dpa[y])>0;}).sort();
  if(yrs.length>=2&&typeof gBars==='function'){ inner+=_infChartsWrap([gBars('Dividendo por accion por año',yrs,[{name:'Div/accion',color:'#2E7D42',vals:yrs.map(function(y){return num(dpa[y]);})}],{})]); }
  inner+='<h3>Historico de la tesis y su resultado</h3>'+_infTesisHistTabla(t);
  if(esHeld&&f&&f.divYears&&f.divYears.length){
    var dyRows=f.divYears.slice(0,12).map(function(g){ return '<tr><td>'+g.year+'</td><td class="num">'+fmt(g.divShareSum)+'</td><td class="num">'+(g.rend*100).toFixed(2)+'%</td></tr>'; }).join('');
    inner+='<h3>Rentabilidad sobre coste por año (YoC)</h3><table><thead><tr><th>Año</th><th class="num">Div/accion</th><th class="num">YoC</th></tr></thead><tbody>'+dyRows+'</tbody></table>';
  }
  return _infDocWrapKHB('Informe de empresa · '+nombre+' ('+t+')',metas,inner);
}

function _infEmpresaBlockHTML(){
  var uni=_infEmpresaUniverse();
  var opts=uni.map(function(x){ return '<option value="'+_infEsc(x.t+' — '+(x.nombre||x.t))+'">'; }).join('');
  return '<div class="card" style="margin:0 0 14px;border:2px solid #1E3A5F">'
    +'<div style="font-weight:800;font-size:15px;margin-bottom:4px">📄 Informe por empresa</div>'
    +'<div class="muted" style="font-size:12px;margin-bottom:8px">Escribe el ticker o el nombre de cualquier empresa de tu radar; se te sugieren coincidencias. Genera su informe: veredicto, tesis, tu situacion (si la tienes en cartera) o como va la empresa (si esta pendiente), y la evolucion.</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
    +'<input id="infcEmpresa" list="infcEmpresaDL" placeholder="Ej.: IBE o Iberdrola…" autocomplete="off" style="flex:1;min-width:240px;padding:8px;border:1px solid var(--line);border-radius:8px">'
    +'<datalist id="infcEmpresaDL">'+opts+'</datalist>'
    +'<button class="btn" id="infcGenEmpresa">🖨️ Generar informe de la empresa (PDF)</button>'
    +'</div>'
    +'<div id="infcEmpresaMsg" class="muted" style="font-size:12px;margin-top:6px"></div>'
    +'</div>';
}
function generarInformeEmpresa(){
  var inp=document.getElementById('infcEmpresa'); var msg=document.getElementById('infcEmpresaMsg');
  var t=_infResolveEmpresa(inp?inp.value:'');
  if(!t){ if(msg)msg.innerHTML='<span style="color:#dc2626">No reconozco esa empresa. Prueba con el ticker (p. ej. IBE) o eligela de la lista.</span>'; return; }
  if(msg){ msg.innerHTML='<span class="muted">Preparando el informe de <b>'+t+'</b>…</span>'; }
  function _p(){ if(msg)msg.textContent=''; var host=_infEnsurePrint(); host.innerHTML=buildEmpresa(null,t); window.print(); }
  var jobs=[];
  if(typeof cargarPreciosCartera==='function')jobs.push(Promise.resolve(cargarPreciosCartera()).catch(function(){}));
  if(typeof cargarTrimestral==='function')jobs.push(Promise.resolve(cargarTrimestral(t)).catch(function(){}));
  if(typeof cargarTesis==='function')jobs.push(Promise.resolve(cargarTesis(t)).catch(function(){}));
  if(typeof _precioCache!=='undefined'&&_precioCache[t]===undefined)jobs.push(fetch('precios/'+t+'.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_precioCache[t]=j;}).catch(function(){_precioCache[t]=null;}));
  if(jobs.length)Promise.all(jobs).then(_p,_p); else _p();
}


/* ---------- registro de informes ---------- */
var INF_REPORTS=[
  {id:'gastos',nombre:'Informe de gastos (con gráficos)',ambito:'Hogar',build:buildGastos},
  {id:'ahorro',nombre:'Ahorro / flujo de caja',ambito:'Hogar',build:buildAhorro},
  {id:'presupuesto',nombre:'Ejecución presupuestaria',ambito:'Hogar',build:buildPresupuesto},
  {id:'interanual',nombre:'Comparativo interanual',ambito:'Hogar',build:buildInteranual},
  {id:'recurrentes',nombre:'Recurrentes y suscripciones',ambito:'Hogar',build:buildRecurrentes},
  {id:'titular',nombre:'Por titular',ambito:'Hogar',build:buildTitular},
  {id:'comercios',nombre:'Comercios',ambito:'Hogar',build:buildComercios},
  {id:'amalia',nombre:'Reembolsables (Amalia)',ambito:'Hogar',build:buildAmalia},
  {id:'combustible',nombre:'Combustible (Mazinger Z)',ambito:'Hogar',build:buildCombustible},
  {id:'patrimonio',nombre:'Patrimonio',ambito:'Inversión',build:buildPatrimonio},
  {id:'cartera',nombre:'Cartera',ambito:'Inversión',build:buildCartera},
  {id:'dividendos',nombre:'Dividendos',ambito:'Inversión',build:buildDividendos},
  {id:'fiscal',nombre:'Fiscal (renta)',ambito:'Inversión',build:buildFiscal},
  {id:'rentabilidad',nombre:'Rentabilidad vs IBEX',ambito:'Inversión',build:buildRentabilidad},
  {id:'oportunidades',nombre:'Oportunidades (watchlist)',ambito:'Inversión',build:buildOportunidades},
  {id:'plan',nombre:'Plan de inversión',ambito:'Inversión',build:buildPlan},
  {id:'monitor',nombre:'Seguimiento (monitor)',ambito:'Inversión',build:buildMonitor},
  {id:'proyeccion',nombre:'Proyección / jubilación',ambito:'Inversión',build:buildProyeccion}
];

/* ---------- generar (uno o varios combinados) ---------- */
function generarInformesMulti(){
  var sel=[].slice.call(document.querySelectorAll('.infcRep:checked')).map(function(x){return x.value;});
  if(!sel.length){ alert('Marca al menos un informe.'); return; }
  var ctx=_infCtx(); if(!ctx)return;
  function _doPrint(){ var docs=[]; INF_REPORTS.forEach(function(r){ if(sel.indexOf(r.id)>=0){ try{ docs.push(r.build(ctx)); }catch(e){ docs.push(_infDocWrap(r.nombre,[],'<p class="muted">No se pudo generar este informe: '+_infEsc(e.message||e)+'</p>')); } } }); var host=_infEnsurePrint(); host.innerHTML=docs.join(''); window.print(); }
  if((sel.indexOf('rentabilidad')>=0||sel.indexOf('proyeccion')>=0) && typeof cargarPreciosCartera==='function'){ cargarPreciosCartera().then(_doPrint,_doPrint); }
  else _doPrint();
}

/* ---------- interfaz del centro de informes ---------- */
function renderInformesCenter(){
  var host=document.getElementById('informesCenter'); if(!host) return;
  if(document.getElementById('infcBuilt')) return;
  var now=new Date(); var ym=now.getFullYear()+'-'+_infPad(now.getMonth()+1);
  var byAmb={}; INF_REPORTS.forEach(function(r){ (byAmb[r.ambito]=byAmb[r.ambito]||[]).push(r); });
  var repsHtml=Object.keys(byAmb).map(function(am){
    var items=byAmb[am].map(function(r){ return '<label style="display:block;font-size:13px;padding:2px 0"><input type="checkbox" class="infcRep" value="'+r.id+'"'+(r.id==='gastos'?' checked':'')+'> '+_infEsc(r.nombre)+'</label>'; }).join('');
    return '<div style="margin-bottom:8px"><div style="font-weight:700;font-size:12px;color:#1f3d6b;margin-bottom:2px">'+_infEsc(am)+'</div>'+items+'</div>';
  }).join('');
  var groups={}; (DB.categorias||[]).forEach(function(c){ (groups[c.grupo]=groups[c.grupo]||[]).push(c); });
  var catHtml=Object.keys(groups).sort().map(function(g){ var gs=_infEsc(g); var items=groups[g].map(function(c){ return '<label style="display:block;font-size:11px;padding:1px 0"><input type="checkbox" class="infcCat" value="'+c.id+'"> '+_infEsc(c.nombre)+'</label>'; }).join(''); return '<div style="margin-bottom:4px"><div style="font-weight:700;font-size:11px">'+gs+'</div>'+items+'</div>'; }).join('');
  var titHtml=(typeof _infTitulares==='function'?_infTitulares():['Carlos','Susana','Dos']).map(function(t){ return '<label style="margin-right:12px;font-size:12px"><input type="checkbox" class="infcTit" value="'+_infEsc(t)+'"> '+_infEsc(t)+'</label>'; }).join('');
  host.innerHTML=_infEmpresaBlockHTML()+'<div id="infcBuilt" class="card" style="margin:0 0 14px">'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px">'
    +'<div><div style="font-weight:800;font-size:14px;margin-bottom:6px">1 · Elige informes</div><div class="muted" style="font-size:11px;margin-bottom:6px">Marca uno, o varios para combinarlos en un solo PDF.</div>'+repsHtml+'</div>'
    +'<div><div style="font-weight:800;font-size:14px;margin-bottom:6px">2 · Periodo</div>'
      +'<label style="display:block;margin-bottom:6px">Periodo<select id="infcPeriodo" style="width:100%"><option value="mes">Mes</option><option value="anio" selected>Año completo</option><option value="rango">Rango de fechas</option></select></label>'
      +'<label id="infcMesWrap" style="display:none">Mes<input type="month" id="infcMes" value="'+ym+'" style="width:100%"></label>'
      +'<label id="infcAnioWrap">Año<input type="number" id="infcAnio" value="'+now.getFullYear()+'" step="1" style="width:100%"></label>'
      +'<label id="infcDesdeWrap" style="display:none">Desde<input type="date" id="infcDesde" style="width:100%"></label>'
      +'<label id="infcHastaWrap" style="display:none">Hasta<input type="date" id="infcHasta" style="width:100%"></label>'
    +'</div>'
    +'<div><div style="font-weight:800;font-size:14px;margin-bottom:6px">3 · Filtros del informe de gastos</div>'
      +'<label style="display:block;margin-bottom:6px">Tipo<select id="infcTipo" style="width:100%"><option value="ambos">Ingresos y gastos</option><option value="ingreso">Solo ingresos</option><option value="gasto">Solo gastos</option></select></label>'
      +'<label style="display:block;margin-bottom:6px">Nivel de detalle<select id="infcDetalle" style="width:100%"><option value="completo">Cada movimiento</option><option value="totales">Solo totales por sección</option></select></label>'
      +'<div style="font-size:11px;font-weight:700;margin:4px 0 2px">Titular <span class="muted" style="font-weight:400">(vacío = todos)</span></div><div>'+titHtml+'</div>'
      +'<div style="font-size:11px;font-weight:700;margin:6px 0 2px">Categorías <span class="muted" style="font-weight:400">(vacío = todas)</span> <label style="font-weight:400"><input type="checkbox" id="infcCatAll"> todas/ninguna</label></div>'
      +'<div style="max-height:460px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px">'+catHtml+'</div>'
    +'</div>'
    +'</div>'
    +'<div style="margin-top:12px"><button class="btn" id="infcGen">🖨️ Generar informe (PDF)</button></div>'
    +'</div>';
  var pe=document.getElementById('infcPeriodo');
  pe.addEventListener('change',function(){ var v=this.value; document.getElementById('infcMesWrap').style.display=v==='mes'?'':'none'; document.getElementById('infcAnioWrap').style.display=v==='anio'?'':'none'; document.getElementById('infcDesdeWrap').style.display=v==='rango'?'':'none'; document.getElementById('infcHastaWrap').style.display=v==='rango'?'':'none'; });
  document.getElementById('infcCatAll').addEventListener('change',function(){ var ck=this.checked; host.querySelectorAll('.infcCat').forEach(function(x){x.checked=ck;}); });
  document.getElementById('infcGen').addEventListener('click',generarInformesMulti);
  var _ge=document.getElementById('infcGenEmpresa'); if(_ge)_ge.addEventListener('click',generarInformeEmpresa);
  var _ie=document.getElementById('infcEmpresa'); if(_ie)_ie.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); generarInformeEmpresa(); } });
}
