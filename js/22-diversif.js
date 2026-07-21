/* ============================================================================
   22-diversif.js — M2 · Comparativa de diversificación (coste ↔ valor).
   Tres fotos: INICIAL (instantánea guardada en DB.diversifBase), HOY (en vivo)
   y OBJETIVO (coste = cartera actual + plan pendiente; valor = previsión a
   precios planos, HIPÓTESIS). Anclado a COSTE: el valor solo mide el desfase,
   nunca conduce el plan. Especificación: memoria m1-embudo-diseno / M2.
   Editado con script (no Edit/Write). Guardas typeof en todo lo externo.
   ============================================================================ */

function _dvUp(x){ return (x==null?'':(''+x)).toUpperCase(); }
function _dvNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _dvEsc(x){ return (typeof _radEsc==='function')?_radEsc(x):(''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _dvEur(x){ x=_dvNum(x); if(typeof fmt==='function')return fmt(x); return Math.round(x)+' €'; }
function _dvPct(x){ return (x==null||!isFinite(x))?'—':x.toFixed(1)+'%'; }
function _dvArq(t){ t=_dvUp(t); if(typeof _uniInfo==='function'){var u=_uniInfo(t); if(u&&u.arq)return u.arq;} var un=(DB.universo||{})[t]||{}; return un.arquetipo||'Sin clasificar'; }
function _dvNombre(t){ t=_dvUp(t); var v=(DB.valores||{})[t]||{}; if(v.nombre)return v.nombre; if(typeof _uniInfo==='function'){var u=_uniInfo(t); if(u&&u.nombre)return u.nombre;} return t; }

/* posición actual agregada por ticker: {t:{coste,valor}} (suma carteras Propia+Compartida) */
function _dvPos(){
  var m={};
  (typeof invPositions==='function'?invPositions():[]).forEach(function(p){
    if(!(p.acciones>0.0001))return; var t=_dvUp(p.ticker);
    m[t]=m[t]||{coste:0,valor:0};
    m[t].coste+=p.acciones*_dvNum(p.precioCompra);
    m[t].valor+=p.acciones*_dvNum(p.precioActual);
  });
  return m;
}
/* € pendientes del plan por ticker (versión € del objetivo de Diversificación) */
function _dvPlanPend(t){ t=_dvUp(t);
  if(typeof _planRem==='function'){ try{ var R=_planRem(t); var s=0; Object.keys(R.rem||{}).forEach(function(y){ s+=_dvNum(R.rem[y]); }); return s; }catch(e){} }
  var pc=(DB.planCompras||{})[t]||{}; var s2=0; Object.keys(pc).forEach(function(y){ s2+=_dvNum(pc[y]); }); return s2;
}

/* captura / lee la foto INICIAL */
function _dvBase(posHoy){
  DB.diversifBase=DB.diversifBase||null;
  var tot=0; Object.keys(posHoy).forEach(function(t){ tot+=posHoy[t].coste; });
  if((!DB.diversifBase||!DB.diversifBase.pos) && tot>0){
    DB.diversifBase={ fecha:new Date().toISOString().slice(0,10), pos:JSON.parse(JSON.stringify(posHoy)) };
    if(typeof scheduleSave==='function')scheduleSave();
  }
  return DB.diversifBase;
}
function reiniciarFotoDiversif(){
  var pos=_dvPos(); var tot=0; Object.keys(pos).forEach(function(t){ tot+=pos[t].coste; });
  if(tot<=0){ alert('No hay cartera con coste para fotografiar.'); return; }
  if(!confirm('¿Reiniciar la «foto inicial» de diversificación a la situación de HOY? A partir de ahora el desfase se mide desde este punto.'))return;
  DB.diversifBase={ fecha:new Date().toISOString().slice(0,10), pos:JSON.parse(JSON.stringify(pos)) };
  if(typeof scheduleSave==='function')scheduleSave();
  if(typeof renderDiversifComp==='function')renderDiversifComp();
}

/* agrega un mapa {t:{coste,valor}} por arquetipo y en total → % por coste y por valor */
function _dvAgg(posMap){
  var tC=0,tV=0, arq={}, emp={};
  Object.keys(posMap).forEach(function(t){
    var c=_dvNum(posMap[t].coste), v=_dvNum(posMap[t].valor); tC+=c; tV+=v;
    var a=_dvArq(t); arq[a]=arq[a]||{coste:0,valor:0}; arq[a].coste+=c; arq[a].valor+=v;
    emp[t]={coste:c,valor:v};
  });
  return {tC:tC,tV:tV,arq:arq,emp:emp};
}
function _dvPctC(agg,key,scope){ var o=(scope==='arq'?agg.arq[key]:agg.emp[key]); if(!o||!agg.tC)return null; return o.coste/agg.tC*100; }
function _dvPctV(agg,key,scope){ var o=(scope==='arq'?agg.arq[key]:agg.emp[key]); if(!o||!agg.tV)return null; return o.valor/agg.tV*100; }

function _dvDesfCol(d){ if(d==null)return '#94a3b8'; var a=Math.abs(d); return a<3?'#16a34a':(a<7?'#d97706':'#dc2626'); }
function _dvDesfTxt(d){ if(d==null)return '<span style="color:#cbd5e1">—</span>'; return '<b style="color:'+_dvDesfCol(d)+'">'+(d>=0?'+':'')+d.toFixed(1)+'</b>'; }

function renderDiversifComp(){
  var sec=document.getElementById('view-divcomp'); if(!sec)return;
  var posHoy=_dvPos();
  var base=_dvBase(posHoy);
  /* universo objetivo = held ∪ tickers con plan pendiente */
  var union={}; Object.keys(posHoy).forEach(function(t){ union[t]=1; });
  Object.keys(DB.planCompras||{}).forEach(function(t){ if(_dvPlanPend(t)>0)union[_dvUp(t)]=1; });
  var posObj={}; Object.keys(union).forEach(function(t){ var c=(posHoy[t]?posHoy[t].coste:0), v=(posHoy[t]?posHoy[t].valor:0), pp=_dvPlanPend(t); posObj[t]={coste:c+pp,valor:v+pp,pend:pp}; });

  var aIni=base&&base.pos?_dvAgg(base.pos):null;
  var aHoy=_dvAgg(posHoy);
  var aObj=_dvAgg(posObj);

  var plus=(aHoy.tC>0)?(aHoy.tV/aHoy.tC-1)*100:0;
  /* desfase global hoy = media de |v−c| por arquetipo, ponderada (≈ % de cartera mal colocado) */
  var desfGlobal=0; Object.keys(aHoy.arq).forEach(function(a){ desfGlobal+=Math.abs((_dvPctV(aHoy,a,'arq')||0)-(_dvPctC(aHoy,a,'arq')||0)); }); desfGlobal/=2;

  var H='<div class="dv-wrap">';
  H+='<h2>Comparativa de diversificación</h2>';
  H+='<div class="sub" style="margin-bottom:12px">Anclada al <b>coste</b> (el riesgo que decides por cada euro). El <b>valor</b> solo mide el <b>desfase</b> que introduce la revalorización — es un termómetro, no el volante. La foto <b>Objetivo</b> por valor es una <b>hipótesis a precios planos</b> (no se puede predecir).</div>';

  H+=_dvLegend(base);

  /* KPIs */
  H+='<div class="dv-k">'+
     _dvKpi('Coste invertido',_dvEur(aHoy.tC),'lo que has puesto')+
     _dvKpi('Valor hoy',_dvEur(aHoy.tV),(plus>=0?'+':'')+plus.toFixed(1)+'% s/ coste')+
     _dvKpi('Desfase global',desfGlobal.toFixed(1)+' pp',(desfGlobal<5?'contenido':(desfGlobal<10?'moderado':'alto')))+
     _dvKpi('Foto inicial',(base&&base.fecha)?base.fecha:'—','<button class="btn ghost sm" id="dvReset">↻ reiniciar</button>')+
     '</div>';

  H+=_dvEvalBlock(aHoy,aObj);

  var esHoyIgualIni=(base&&base.fecha===new Date().toISOString().slice(0,10));
  if(esHoyIgualIni)H+='<div class="dv-note">La foto inicial se ha tomado hoy, así que <b>Inicial y Hoy coinciden</b> de momento. El desfase entre ambas se irá viendo con el tiempo, según el mercado mueva los pesos.</div>';

  /* Tabla por arquetipo */
  H+=_dvTabla('Por arquetipo', Object.keys(aHoy.arq).concat(Object.keys(aObj.arq)).filter(function(v,i,s){return s.indexOf(v)===i;}), 'arq', aIni,aHoy,aObj,posObj);
  /* Tabla por empresa (desplegable) */
  var emps=Object.keys(union).sort(function(x,y){ return (aObj.emp[y]?aObj.emp[y].coste:0)-(aObj.emp[x]?aObj.emp[x].coste:0); });
  H+='<div class="dv-emp"><div class="dv-emp-h" id="dvEmpH">▶ Detalle por empresa ('+emps.length+')</div><div class="dv-emp-b" id="dvEmpB" style="display:none">'+
     _dvTabla('Por empresa', emps, 'emp', aIni,aHoy,aObj,posObj)+'</div></div>';

  H+='<div class="muted" style="font-size:11px;margin-top:10px;line-height:1.5"><b>Desfase</b> = peso por valor − peso por coste (puntos porcentuales). Verde |Δ|&lt;3 · ámbar &lt;7 · rojo ≥7. <b>Objetivo coste</b> = cartera actual + compras planificadas (de las que no debes pasar). <b>Objetivo valor</b> = hipótesis si ejecutas el plan a precios de hoy.</div>';
  H+='</div>';
  sec.innerHTML=H;
  _dvBind(sec);
}

function _dvKpi(l,v,p){ return '<div class="dv-c"><div class="dv-l">'+l+'</div><div class="dv-v">'+v+'</div><div class="dv-p">'+p+'</div></div>'; }

/* ---------- cabecera-leyenda: qué es cada estado/columna ---------- */
function _dvLegend(base){
  var iniF=(base&&base.fecha)?base.fecha:'—';
  return '<div class="dv-leg">'+
    '<div class="dv-lc"><span class="dv-ld" style="background:#64748b"></span><div><b>Inicial</b> · foto guardada ('+iniF+') — el punto desde el que medimos el desfase.</div></div>'+
    '<div class="dv-lc"><span class="dv-ld" style="background:#1f3d6b"></span><div><b>Hoy</b> · situación actual en vivo.</div></div>'+
    '<div class="dv-lc"><span class="dv-ld" style="background:#0d9488"></span><div><b>Objetivo (plan)</b> · a dónde te lleva el plan — coste firme, valor* = hipótesis.</div></div>'+
    '<div class="dv-lk">En cada estado: <b>coste</b> = cómo repartes el dinero (riesgo por euro) · <b>valor</b> = cómo pesa hoy por mercado · <b>Δ</b> = valor − coste (el desfase).</div>'+
    '</div>';
}

/* ---------- evaluación: ¿buena o mala diversificación? (por valor) ---------- */
function _dvEval(agg,byCoste){
  if(!agg)return null; var T=byCoste?agg.tC:agg.tV; if(!T)return null;
  var gv=function(o){ return byCoste?o.coste:o.valor; };
  var ws=[], topT='', topW=0;
  Object.keys(agg.emp).forEach(function(t){ var w=gv(agg.emp[t])/T; if(w>0){ws.push(w); if(w>topW){topW=w;topT=t;}} });
  var topA='', topAW=0;
  Object.keys(agg.arq).forEach(function(a){ var w=gv(agg.arq[a])/T; if(w>0&&w>topAW){topAW=w;topA=a;} });
  ws.sort(function(x,y){return y-x;});
  var top3=(ws[0]||0)+(ws[1]||0)+(ws[2]||0), n=ws.length;
  var hhi=ws.reduce(function(s,w){return s+w*w;},0), nef=hhi>0?1/hhi:0;
  function lv(v,g,a){ return v<=g?0:(v<=a?1:2); }
  var lMax=lv(topW,0.10,0.15), lArq=lv(topAW,0.30,0.40), lTop3=lv(top3,0.45,0.60), lN=(n>=15?0:(n>=10?1:2));
  var worst=Math.max(lMax,lArq,lTop3,lN);
  var LAB=['Bien diversificada','Aceptable','Concentrada'], COL=['#16a34a','#d97706','#dc2626'];
  return {topT:topT,topW:topW,topA:topA,topAW:topAW,top3:top3,n:n,nef:nef,lMax:lMax,lArq:lArq,lTop3:lTop3,lN:lN,worst:worst,lab:LAB[worst],col:COL[worst]};
}
function _dvEvalBlock(aHoy,aObj){
  var ehV=_dvEval(aHoy,false), eoV=_dvEval(aObj,false);
  var ehC=_dvEval(aHoy,true),  eoC=_dvEval(aObj,true);
  var C=['#16a34a','#d97706','#dc2626'];
  function mx(l,txt){ return '<span class="dv-mx" style="border-color:'+C[l]+';color:'+C[l]+'">'+txt+'</span>'; }
  function card(tit,ev,nota){
    if(!ev)return '';
    return '<div class="dv-ev">'+
      '<div class="dv-evh">'+tit+' <span class="dv-evb" style="background:'+ev.col+'">'+ev.lab+'</span></div>'+
      '<div class="dv-evm">'+
        mx(ev.lMax,'Máx posición '+(ev.topW*100).toFixed(0)+'% · '+_dvEsc(ev.topT))+
        mx(ev.lArq,'Máx arquetipo '+(ev.topAW*100).toFixed(0)+'% · '+_dvEsc(ev.topA))+
        mx(ev.lTop3,'Top-3 '+(ev.top3*100).toFixed(0)+'%')+
        mx(ev.lN,ev.n+' posiciones')+
        '<span class="dv-mx" style="border-color:#94a3b8;color:#475569">≈'+ev.nef.toFixed(1)+' efectivas</span>'+
      '</div>'+
      (nota?'<div class="dv-evn">'+nota+'</div>':'')+
      '</div>';
  }
  var notaHoy='', notaObj='';
  if(ehV&&eoV){
    if(ehV.worst>eoV.worst) notaHoy='Concentración <b>transitoria</b>: el plan la corrige →';
    if(eoV.worst<=1) notaObj='Completando el plan, por valor queda '+(eoV.worst===0?'<b>bien repartida</b>.':'aceptable.');
    else notaObj='Aun completando el plan quedaría concentrada — quizá revisar el objetivo.';
  }
  return '<div class="dv-evwrap"><div class="dv-evt">¿Buena diversificación?</div>'+
    '<div class="dv-evsub">Por <b>valor</b> de mercado — el termómetro (cómo pesa hoy de verdad)</div>'+
    '<div class="dv-evrow">'+card('Hoy · valor',ehV,notaHoy)+card('Objetivo · proyectado (valor)',eoV,notaObj)+'</div>'+
    '<div class="dv-evsub" style="margin-top:12px">Por <b>coste</b> — tu reparto de riesgo por euro (el ancla del método)</div>'+
    '<div class="dv-evrow">'+card('Hoy · coste',ehC,'')+card('Objetivo · coste (plan)',eoC,'')+'</div>'+
    '<div class="dv-evleg">Umbrales: máx posición ≤10% · máx arquetipo ≤30% · top-3 ≤45% · ≥15 posiciones. «Efectivas» = nº de posiciones equivalentes (1/HHI).</div></div>';
}

function _dvTabla(titulo, keys, scope, aIni,aHoy,aObj,posObj){
  var head='<tr>'+
    '<th class="l" rowspan="2">'+(scope==='arq'?'Arquetipo':'Empresa')+'</th>'+
    '<th colspan="3" class="dv-grp dv-gi">INICIAL</th>'+
    '<th colspan="3" class="dv-grp dv-gh">HOY</th>'+
    '<th colspan="3" class="dv-grp dv-go">OBJETIVO (plan)</th>'+
    '</tr><tr>'+
    '<th>coste</th><th>valor</th><th>Δ</th>'+
    '<th>coste</th><th>valor</th><th>Δ</th>'+
    '<th>coste</th><th title="Hipótesis a precios planos">valor*</th><th>falta €</th>'+
    '</tr>';
  var rows=keys.map(function(k){
    var iC=aIni?_dvPctC(aIni,k,scope):null, iV=aIni?_dvPctV(aIni,k,scope):null;
    var hC=_dvPctC(aHoy,k,scope), hV=_dvPctV(aHoy,k,scope);
    var oC=_dvPctC(aObj,k,scope), oV=_dvPctV(aObj,k,scope);
    var pend=0; if(scope==='emp'){ pend=(posObj[k]?posObj[k].pend:0); } else { Object.keys(posObj).forEach(function(t){ if(_dvArq(t)===k)pend+=(posObj[t].pend||0); }); }
    var label=(scope==='arq')?_dvEsc(k):('<b class="dv-tk" data-ficha="'+_dvEsc(k)+'">'+_dvEsc(k)+'</b> <span class="dv-nm">'+_dvEsc(_dvNombre(k).slice(0,16))+'</span>');
    return '<tr>'+
      '<td class="l">'+label+'</td>'+
      '<td>'+_dvPct(iC)+'</td><td>'+_dvPct(iV)+'</td><td>'+_dvDesfTxt(iV==null?null:(iV-iC))+'</td>'+
      '<td>'+_dvPct(hC)+'</td><td>'+_dvPct(hV)+'</td><td>'+_dvDesfTxt(hV==null?null:(hV-hC))+'</td>'+
      '<td>'+_dvPct(oC)+'</td><td class="dv-hyp">'+_dvPct(oV)+'</td><td>'+(pend>0?_dvEur(pend):'<span style="color:#cbd5e1">—</span>')+'</td>'+
      '</tr>';
  }).join('');
  return '<div class="dv-scroll"><table class="dv-table"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>';
}

function _dvBind(sec){
  if(sec._dvBound)return; sec._dvBound=true;
  sec.addEventListener('click',function(e){
    var r=e.target.closest('#dvReset'); if(r){ reiniciarFotoDiversif(); return; }
    var h=e.target.closest('#dvEmpH'); if(h){ var b=document.getElementById('dvEmpB'); if(b){ var op=b.style.display==='none'; b.style.display=op?'block':'none'; h.textContent=(op?'▼':'▶')+h.textContent.slice(1); } return; }
    var f=e.target.closest('[data-ficha]'); if(f){ var t=f.getAttribute('data-ficha'); if(typeof abrirFicha==='function'){abrirFicha(t);} else { location.hash='ficha='+t; } return; }
  });
}

/* ---------- estilos (inyectados una vez) ---------- */
(function _dvCSS(){
  if(typeof document==='undefined'||document.getElementById('dv-css'))return;
  var s=document.createElement('style'); s.id='dv-css';
  s.textContent=[
    '.dv-k{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px}',
    '.dv-c{flex:1;min-width:140px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 13px}',
    '.dv-l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}',
    '.dv-v{font-size:20px;font-weight:800;color:#1f3d6b;line-height:1.15}',
    '.dv-p{font-size:11px;color:#94a3b8}',
    '.dv-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:9px 12px;font-size:12.5px;color:#1e3a8a;margin-bottom:14px}',
    '.dv-scroll{overflow-x:auto;margin-bottom:6px}',
    '.dv-table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:640px}',
    '.dv-table th,.dv-table td{border:1px solid #e6ebf2;padding:6px 8px;text-align:right;white-space:nowrap}',
    '.dv-table th.l,.dv-table td.l{text-align:left}',
    '.dv-table thead th{background:#f1f5f9;color:#334155;font-size:11px;font-weight:700}',
    '.dv-grp{text-align:center!important;color:#fff!important;font-weight:800!important;letter-spacing:.03em}',
    '.dv-gi{background:#64748b!important}.dv-gh{background:#1f3d6b!important}.dv-go{background:#0d9488!important}',
    '.dv-leg{display:flex;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 13px;margin-bottom:12px;font-size:12px;color:#334155}',
    '.dv-lc{display:flex;align-items:flex-start;gap:6px;flex:1;min-width:200px}',
    '.dv-ld{width:11px;height:11px;border-radius:3px;flex:none;margin-top:3px}',
    '.dv-lk{flex-basis:100%;border-top:1px dashed #e2e8f0;padding-top:7px;color:#475569}',
    '.dv-evwrap{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:14px}',
    '.dv-evt{font-weight:800;color:#1f3d6b;font-size:13px;margin-bottom:9px}',
    '.dv-evsub{font-size:11.5px;color:#64748b;font-weight:600;margin:0 0 7px}',
    '.dv-evrow{display:flex;gap:10px;flex-wrap:wrap}',
    '.dv-ev{flex:1;min-width:270px;border:1px solid #eef2f8;border-radius:10px;padding:10px 12px;background:#fafcff}',
    '.dv-evh{font-weight:700;font-size:12.5px;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:8px}',
    '.dv-evb{color:#fff;font-size:11px;font-weight:800;border-radius:20px;padding:2px 10px;text-transform:uppercase;letter-spacing:.02em}',
    '.dv-evm{display:flex;gap:6px;flex-wrap:wrap}',
    '.dv-mx{font-size:11px;font-weight:700;border:1.5px solid;border-radius:7px;padding:2px 8px}',
    '.dv-evn{margin-top:8px;font-size:12px;color:#475569}',
    '.dv-evleg{margin-top:9px;font-size:10.5px;color:#94a3b8}',
    '.dv-table tbody tr:nth-child(even) td{background:#fafcff}',
    '.dv-hyp{font-style:italic;color:#0f766e}',
    '.dv-tk{cursor:pointer;color:#1f3d6b}.dv-nm{font-size:10.5px;color:#94a3b8}',
    '.dv-emp{margin-top:14px}',
    '.dv-emp-h{font-weight:700;font-size:13px;color:#1f3d6b;cursor:pointer;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}',
    '.dv-emp-b{margin-top:8px}'
  ].join('\n');
  document.head.appendChild(s);
})();
