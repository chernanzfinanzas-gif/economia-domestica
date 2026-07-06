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

/* ---------- registro de informes ---------- */
var INF_REPORTS=[
  {id:'gastos',nombre:'Informe de gastos (con gráficos)',ambito:'Hogar',build:buildGastos},
  {id:'ahorro',nombre:'Ahorro / flujo de caja',ambito:'Hogar',build:buildAhorro},
  {id:'presupuesto',nombre:'Ejecución presupuestaria',ambito:'Hogar',build:buildPresupuesto},
  {id:'patrimonio',nombre:'Patrimonio',ambito:'Inversión',build:buildPatrimonio},
  {id:'cartera',nombre:'Cartera',ambito:'Inversión',build:buildCartera},
  {id:'dividendos',nombre:'Dividendos',ambito:'Inversión',build:buildDividendos}
];

/* ---------- generar (uno o varios combinados) ---------- */
function generarInformesMulti(){
  var sel=[].slice.call(document.querySelectorAll('.infcRep:checked')).map(function(x){return x.value;});
  if(!sel.length){ alert('Marca al menos un informe.'); return; }
  var ctx=_infCtx(); if(!ctx)return;
  var docs=[];
  INF_REPORTS.forEach(function(r){ if(sel.indexOf(r.id)>=0){ try{ docs.push(r.build(ctx)); }catch(e){ docs.push(_infDocWrap(r.nombre,[],'<p class="muted">No se pudo generar este informe: '+_infEsc(e.message||e)+'</p>')); } } });
  var host=_infEnsurePrint(); host.innerHTML=docs.join(''); window.print();
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
  host.innerHTML='<div id="infcBuilt" class="card" style="margin:0 0 14px">'
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
      +'<div style="max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px">'+catHtml+'</div>'
    +'</div>'
    +'</div>'
    +'<div style="margin-top:12px"><button class="btn" id="infcGen">🖨️ Generar informe (PDF)</button></div>'
    +'</div>';
  var pe=document.getElementById('infcPeriodo');
  pe.addEventListener('change',function(){ var v=this.value; document.getElementById('infcMesWrap').style.display=v==='mes'?'':'none'; document.getElementById('infcAnioWrap').style.display=v==='anio'?'':'none'; document.getElementById('infcDesdeWrap').style.display=v==='rango'?'':'none'; document.getElementById('infcHastaWrap').style.display=v==='rango'?'':'none'; });
  document.getElementById('infcCatAll').addEventListener('change',function(){ var ck=this.checked; host.querySelectorAll('.infcCat').forEach(function(x){x.checked=ck;}); });
  document.getElementById('infcGen').addEventListener('click',generarInformesMulti);
}
