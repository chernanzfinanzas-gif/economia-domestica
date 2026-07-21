/* ============================================================================
   21-embudo.js — Vista "Embudo" (M1): la columna vertebral del método.
   Coloca cada empresa en su etapa (Selección → Análisis → Planteamiento →
   Seguimiento) con una "próxima acción". La etapa se DERIVA del estado que la
   app ya calcula; el único dato nuevo es DB.embudo = {TICKER:{etapa,fecha}}
   para pines manuales. Especificación: memoria m1-embudo-diseno.md.
   Editado con script (no Edit/Write). Todo con guardas typeof para no romper.
   ============================================================================ */

/* ---------- helpers base ---------- */
function _emUp(x){ return (x==null?'':(''+x)).toUpperCase(); }
function _emNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _emEsc(x){ return (typeof _radEsc==='function')?_radEsc(x):(''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _emAna(t){ t=_emUp(t); return (DB.analisis||[]).find(function(a){return _emUp(a.ticker)===t;})||null; }
function _emNombre(t){ t=_emUp(t); var v=(DB.valores||{})[t]||{}; if(v.nombre)return v.nombre; if(typeof _uniInfo==='function'){var u=_uniInfo(t); if(u&&u.nombre)return u.nombre;} var a=_emAna(t); return (a&&a.nombre)||t; }
function _emArq(t){ if(typeof _uniInfo==='function'){var u=_uniInfo(t); if(u&&u.arq)return u.arq;} var un=(DB.universo||{})[_emUp(t)]||{}; return un.arquetipo||''; }
function _emScore(t){ var a=_emAna(t); return (a&&typeof cmpScore==='function')?cmpScore(a):null; }
function _emHeldSet(){ return (typeof heldTickerSet==='function')?heldTickerSet():new Set(); }
function _emAnalizada(t){ return (typeof _esAnalizada==='function')?_esAnalizada(t):!!(_emAna(t)&&_emAna(t).dossierFecha); }
function _emCola(t){ t=_emUp(t); return (DB.cola||[]).some(function(c){return _emUp(c.t)===t&&c.estado!=='hecha';}); }
function _emColaInfo(t){ t=_emUp(t); var pos=0,n=0,it=null; (DB.cola||[]).forEach(function(c){ if(c.estado==='hecha')return; n++; if(_emUp(c.t)===t){pos=n;it=c;} }); return {pos:pos,it:it}; }
function _emCerrada(t){ t=_emUp(t); return (DB.cerradas||[]).some(function(c){return _emUp(c.ticker)===t;}); }
function _emSenal(t){ return (typeof _senalActiva==='function')?_senalActiva(t):null; }
function _emProtoOpen(t){ t=_emUp(t); return ((DB.protocolo||{})[t]||[]).some(function(a){return a.estado==='abierta';}); }
function _emProtoVenc(t){ t=_emUp(t); var hoy=new Date().toISOString().slice(0,10); return ((DB.protocolo||{})[t]||[]).some(function(a){return a.estado==='abierta'&&a.limite&&a.limite<hoy;}); }
function _emDsMes(t){ var a=_emAna(t); return (a&&typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null; }
function _emQPend(t){ t=_emUp(t); var c=(DB.cadencia||{})[t]||{}; if(!c.tocaMonitor||!c.nextKey)return false; var m=(DB.monitor||{})[t]||{}; var done=(typeof _revHecha==='function')?_revHecha(m.rev,c.nextKey):!!(m.rev&&m.rev[c.nextKey]); return !done; }
/* € pendientes del plan (todos los años). Versión € del objetivo de Diversificación. */
function _emPlanPendEur(t){ t=_emUp(t); if(typeof _planRem==='function'){ try{ var R=_planRem(t); var s=0; Object.keys(R.rem||{}).forEach(function(y){ s+=_emNum(R.rem[y]); }); return s; }catch(e){} } var pc=(DB.planCompras||{})[t]||{}; var s2=0; Object.keys(pc).forEach(function(y){ s2+=_emNum(pc[y]); }); return s2; }
/* Próximo año con tramo pendiente > 0. */
function _emPlanProxAnio(t){ t=_emUp(t); var pend=null; if(typeof _planRem==='function'){ try{ var R=_planRem(t); Object.keys(R.rem||{}).forEach(function(y){ if(_emNum(R.rem[y])>0){ y=+y; if(pend==null||y<pend)pend=y; } }); return pend; }catch(e){} } var pc=(DB.planCompras||{})[t]||{}; Object.keys(pc).forEach(function(y){ if(_emNum(pc[y])>0){ y=+y; if(pend==null||y<pend)pend=y; } }); return pend; }
/* ¿tramo del año en curso (o pasado) pendiente? → posición parcial en ejecución. */
function _emComprandoAhora(t){ var pa=_emPlanProxAnio(t); return pa!=null && pa<=new Date().getFullYear(); }
function _emPin(t){ t=_emUp(t); return ((DB.embudo||{})[t]||{}); }

/* ---------- 1) etapa derivada ---------- */
function etapaDe(t){
  t=_emUp(t);
  var pin=_emPin(t);
  var held=_emHeldSet().has(t);
  var a=_emAna(t);
  var dec=_emUp(a&&a.decision), cot=_emNum(a&&a.cotizacion), entMax=_emNum(a&&a.entMax);
  var margen=(DB.config&&DB.config.embudoMargen!=null)?DB.config.embudoMargen:0.05;

  /* Las 4 alarmas SIEMPRE ganan al pin (no ocultar peligros). */
  if(held){
    var sen=_emSenal(t);
    if(sen&&sen.tipo==='stop') return 'En revisión';
    if(_emProtoOpen(t))        return 'En revisión';
    if(_emQPend(t))            return 'En revisión';
    if(_emDsMes(t)!=null&&_emDsMes(t)>12) return 'En revisión';
  }
  /* pin manual (por debajo de las alarmas). */
  if(pin.etapa) return pin.etapa;

  if(held){
    if(_emComprandoAhora(t)) return 'Comprando';
    return 'En cartera';
  }
  if(_emAnalizada(t)){
    if(dec==='COMPRAR'&&cot>0&&entMax>0&&cot<=entMax) return 'En zona';
    if(dec==='COMPRAR'&&cot>0&&entMax>0&&cot<=entMax*(1+margen)) return 'Cerca de entrada';
    if(dec==='COMPRAR') return 'Analizada · espera precio';
    if(dec==='ESPERAR') return 'Analizada · esperar';
    return 'Analizada';
  }
  if(_emCola(t)) return 'En análisis';
  /* ex-cartera (posición cerrada): NO se descarta, vuelve al embudo. Se queda
     Vigilada (en el radar) para reentrar con nuevos precios/fundamentales. */
  if((DB.radarSel||{})[t]||_emCerrada(t)) return 'Vigilada';
  return 'Universo';
}

var _EM_COL={
  'Universo':'sel','Vigilada':'sel',
  'En análisis':'ana','Analizada':'ana','Analizada · esperar':'ana','Analizada · espera precio':'ana',
  'En zona':'plan','Cerca de entrada':'plan',
  'En cartera':'seg','Comprando':'seg','En revisión':'seg',
  'Descartada':'cerr'
};
function columnaDe(t){ return _EM_COL[etapaDe(t)]||'sel'; }

/* ---------- 2) urgencia (0 crítico … 3 ok) ---------- */
function urgenciaDe(t){
  var et=etapaDe(t), held=_emHeldSet().has(t);
  if(et==='En revisión'){ var sen=_emSenal(t); if((sen&&sen.tipo==='stop')||_emProtoVenc(t)||_emQPend(t))return 0; return 1; }
  if(et==='En zona'||et==='Cerca de entrada') return 1;
  if(et==='Comprando') return 1;
  if(held&&_emPlanPendEur(t)>0){ var a=_emAna(t),cot=_emNum(a&&a.cotizacion),eM=_emNum(a&&a.entMax); if(cot>0&&eM>0&&cot<=eM*1.05) return 1; }
  if(/^Analizada/.test(et)||et==='En análisis'||et==='Vigilada') return 2;
  return 3;
}

/* ---------- 3) próxima acción ---------- */
function accionDe(t){
  var et=etapaDe(t), a=_emAna(t), held=_emHeldSet().has(t);
  var cot=_emNum(a&&a.cotizacion), eM=_emNum(a&&a.entMax);
  var U=urgenciaDe(t);
  function A(txt,goto,extra){ return Object.assign({txt:txt,goto:goto||'',urg:U},extra||{}); }
  if(et==='En revisión'){
    var sen=_emSenal(t);
    if(sen&&sen.tipo==='stop') return A('🚨 Resolver stop','analisis',{sig:'S1',ticker:t});
    if(_emProtoOpen(t)) return A('⏰ Cerrar revisión (apunte S)','analisis',{ticker:t});
    if(_emQPend(t)) return A('📊 Revisar resultados','monitor');
    if(_emDsMes(t)!=null&&_emDsMes(t)>12) return A('📅 Reanalizar (dossier '+_emDsMes(t)+'m)','monitor');
    return A('Revisar','monitor');
  }
  if(et==='En zona') return A('🟢 Comprar — abrir posición','plan');
  if(et==='Cerca de entrada') return A('🟡 Cerca ('+_emPctOver(cot,eM)+') — preparar compra','plan');
  if(et==='Comprando') return A('🧩 Ejecutar tramo del plan','caja');
  /* Adelantar plan (held con capital pendiente y precio en/cerca de zona) */
  if(held&&_emPlanPendEur(t)>0&&cot>0&&eM>0&&cot<=eM*1.05){
    return A('🟢 Adelantar plan — faltan '+_emEur(_emPlanPendEur(t)),'caja');
  }
  if(et==='En cartera') return A('✓ En seguimiento','inversiones');
  if(et==='Analizada · espera precio') return A('⏳ Esperar precio ≤ '+_emEur(eM),'analisis');
  if(et==='Analizada · esperar') return A('⏳ Esperar catalizador','analisis');
  if(et==='Analizada') return A('Revisar veredicto','analisis');
  if(et==='En análisis'){ var ci=_emColaInfo(t); return A('📝 Terminar dossier'+(ci.pos?' (cola #'+ci.pos+')':''),'cobertura'); }
  if(et==='Vigilada') return A(_emCerrada(t)?'↩ Reevaluar — ex-cartera':'📥 Encolar para análisis','radardiv');
  if(et==='Descartada') return A('📓 Post-mortem / reactivar','monitor');
  return A('','');
}

/* motivo del pin: por qué NO estaba ya en esa columna sola */
function motivoPin(t){
  var a=_emAna(t), dec=_emUp(a&&a.decision), cot=_emNum(a&&a.cotizacion), eM=_emNum(a&&a.entMax);
  if(!_emAnalizada(t)) return 'aún sin analizar';
  if(dec&&dec!=='COMPRAR') return 'decisión: '+dec;
  if(cot>0&&eM>0){ var over=(cot/eM-1)*100; if(over>5) return 'a un '+over.toFixed(0)+'% de la entrada'; }
  return 'movida a mano';
}

/* ---------- formato ---------- */
function _emEur(x){ x=_emNum(x); if(typeof fmt==='function')return fmt(x); return x.toFixed(2)+' €'; }
function _emPctOver(cot,eM){ if(!(cot>0&&eM>0))return ''; var o=(cot/eM-1)*100; return (o>=0?'+':'')+o.toFixed(0)+'%'; }
var _EM_URGCOL=['#dc2626','#d97706','#2563eb','#16a34a'];
var _EM_URGBG=['#fee2e2','#fef3c7','#e0f2fe','#ecfdf5'];
var _EM_URGINK=['#991b1b','#92400e','#075985','#166534'];
var _EM_ARQCOL={'REGULADAS':'#0891b2','FINANCIERAS':'#4f46e5','CONCESIONAL':'#0d9488','INDUSTRIAL':'#64748b','COMMODITY':'#b45309','CONSUMO':'#0d9488','ESCALABLES':'#7c3aed','SALUD':'#059669','INMOBILIARIAS':'#9333ea'};
function _emArqChip(t){ var arq=_emArq(t); if(!arq)return ''; var col=_EM_ARQCOL[_emUp(arq)]||'#94a3b8'; var lab=arq.length>11?arq.slice(0,10)+'…':arq; return '<span style="font-size:9px;font-weight:700;color:#fff;border-radius:6px;padding:1px 6px;white-space:nowrap;background:'+col+'">'+_emEsc(lab)+'</span>'; }

/* ---------- fila del embudo (todo lo calculado por ticker) ---------- */
function _emAllTickers(){
  var s={};
  (DB.analisis||[]).forEach(function(a){ var t=_emUp(a.ticker); if(t)s[t]=1; });
  Object.keys(DB.universo||{}).forEach(function(t){ s[_emUp(t)]=1; });
  _emHeldSet().forEach(function(t){ s[_emUp(t)]=1; });
  (DB.cola||[]).forEach(function(c){ var t=_emUp(c.t); if(t)s[t]=1; });
  (DB.cerradas||[]).forEach(function(c){ var t=_emUp(c.ticker); if(t)s[t]=1; });
  Object.keys(DB.embudo||{}).forEach(function(t){ s[_emUp(t)]=1; });
  return Object.keys(s);
}
function _emRow(t){
  t=_emUp(t); if(!t)return null;
  var et=etapaDe(t), col=columnaDe(t), urg=urgenciaDe(t), held=_emHeldSet().has(t);
  var a=_emAna(t);
  var row={t:t, nombre:_emNombre(t), et:et, col:col, urg:urg, held:held, a:a,
           score:_emScore(t), planPend:held?_emPlanPendEur(t):0, accion:accionDe(t),
           pin:_emPin(t).etapa||null};
  /* rango de banda: 0 crítico · 1 nueva en zona · 2 adelantar plan · 3 otras acciones */
  var band=null;
  if(urg<=1){
    var rank=3;
    if(urg===0) rank=0;
    else if(!held&&(et==='En zona'||et==='Cerca de entrada')) rank=1;
    else if(held&&/faltan/.test(row.accion.txt)) rank=2;
    else rank=3;
    band={rank:rank};
  }
  row.band=band;
  return row;
}

/* ---------- render ---------- */
function renderEmbudo(){
  var sec=document.getElementById('view-embudo'); if(!sec)return;
  DB.embudo=DB.embudo||{};
  var rows=_emAllTickers().map(_emRow).filter(Boolean);
  var byT={}; rows.forEach(function(r){ byT[r.t]=r; });

  var cols={sel:[],ana:[],plan:[],seg:[],cerr:[]};
  rows.forEach(function(r){ cols[r.col].push(r); });
  var metric={ seg:function(r){return _emPosPeso(r.t);}, plan:function(r){return r.score||0;}, ana:function(r){return r.score||0;}, sel:function(r){return _emAtractivo(r.t);}, cerr:function(r){return 0;} };
  Object.keys(cols).forEach(function(c){ cols[c].sort(function(x,y){ return (x.urg-y.urg) || (metric[c](y)-metric[c](x)); }); });

  /* banda: rank asc, luego urgencia, luego score/peso desc */
  var band=rows.filter(function(r){return r.band;}).sort(function(x,y){
    return (x.band.rank-y.band.rank) || (x.urg-y.urg) || ((y.score||0)-(x.score||0));
  }).slice(0,10);

  var H='';
  H+='<div class="em-wrap">';
  H+=_emKpis(cols);
  H+=_emLegend();
  H+=_emAgenda();
  H+=_emBand(band);
  H+=_emKanban(cols);
  H+=_emClosed(cols.cerr);
  H+='</div>';
  sec.innerHTML=H;
  _emBind(sec);
}

function _emPosPeso(t){ if(typeof invPositions!=='function')return 0; try{ var ps=invPositions(); var tot=0,mine=0; ps.forEach(function(p){ var v=_emNum(p.acciones)*_emNum(p.precioActual); tot+=v; if(_emUp(p.ticker)===_emUp(t))mine+=v; }); return tot>0?mine/tot:0; }catch(e){ return 0; } }
function _emAtractivo(t){ var f=(DB.fundamentales||{})[_emUp(t)]; var a=_emAna(t); if(typeof radScore==='function'&&f){ try{ return radScore(f,a&&a.rating,_emDsMes(t))||0; }catch(e){} } return _emScore(t)||0; }

function _emKpis(cols){
  var def=[['sel','① Selección','#0ea5e9'],['ana','② Análisis','#6366f1'],['plan','③ Planteamiento','#16a34a'],['seg','④ Seguimiento','#d97706']];
  var h='<div class="em-strip">';
  def.forEach(function(d){ var n=cols[d[0]].length; h+='<div class="em-pill" style="border-top:3px solid '+d[2]+'"><div class="em-pn">'+n+'</div><div class="em-pl">'+d[1]+'</div></div>'; });
  h+='</div>';
  return h;
}
function _emLegend(){
  var L=[['Crítico',0],['Acción',1],['Espera',2],['OK',3]];
  var h='<div class="em-legend">';
  L.forEach(function(x){ h+='<span class="em-lg"><span class="em-sw" style="background:'+_EM_URGCOL[x[1]]+'"></span>'+x[0]+'</span>'; });
  h+='</div>';
  return h;
}
/* Agenda: próximos resultados (informe por venir → NO banda, sí aviso) */
function _emAgenda(){
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var MES={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12};
  var out=[];
  _emHeldSet().forEach(function(t){ var c=(DB.cadencia||{})[t]||{}; if(c.tocaMonitor)return; var lbl=c.proxLabel||''; var m=/(\d{1,2})[- ]?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.exec(lbl); if(!m)return; var f=new Date(hoy.getFullYear(),MES[m[2].toLowerCase()]-1,+m[1]); var dias=Math.round((f-hoy)/86400000); if(dias>=0&&dias<=21) out.push({t:t,lbl:lbl,dias:dias}); });
  if(!out.length)return '';
  out.sort(function(a,b){return a.dias-b.dias;});
  var txt=out.map(function(o){ return '<b>'+o.t+'</b> '+_emEsc(o.lbl); }).join(' · ');
  return '<div class="em-agenda" data-goto="calendario">📅 <b>Próximos resultados</b> ('+out.length+') — '+txt+' <span class="em-arw">→ Calendario</span></div>';
}
function _emCard(r,compact){
  var U=r.urg, ac=r.accion;
  var pinBadge=r.pin?('<span class="em-pinb" title="'+_emEsc(motivoPin(r.t))+'">✋ '+_emEsc(motivoPin(r.t))+'</span>'):'';
  var exBadge=(_emCerrada(r.t)&&!r.held&&r.et!=='Descartada')?'<span class="em-exb" title="La tuviste en cartera y cerraste la posición. No está descartada: candidata a reentrar con nuevos precios o mejoras de fundamentales.">↩ ex-cartera</span>':'';
  var metricLine=_emMetricLine(r);
  var acc = ac.txt ? ('<div class="em-acc" style="background:'+_EM_URGBG[U]+';color:'+_EM_URGINK[U]+'"'+(ac.goto?(' data-goto="'+ac.goto+'"'+(ac.sig?' data-sig="'+ac.sig+'"':'')+(ac.ticker?' data-ticker="'+ac.ticker+'"':'')):'')+'>'+ac.txt+(ac.goto?'<span class="em-arw">→</span>':'')+'</div>') : '';
  return '<div class="em-card" style="border-left-color:'+_EM_URGCOL[U]+'">'+
    '<div class="em-ct"><span class="em-tk" data-ficha="'+r.t+'">'+r.t+'</span><span class="em-nm">'+_emEsc(r.nombre).slice(0,22)+'</span>'+_emArqChip(r.t)+'</div>'+
    '<div class="em-et">'+_emEsc(r.et)+'</div>'+
    (exBadge?('<div>'+exBadge+'</div>'):'')+
    (pinBadge?('<div>'+pinBadge+'</div>'):'')+
    (metricLine?('<div class="em-metric">'+metricLine+'</div>'):'')+
    acc+
    _emMover(r)+
    '</div>';
}
function _emMetricLine(r){
  var a=r.a, held=r.held;
  var cot=_emNum(a&&a.cotizacion), eM=_emNum(a&&a.entMax);
  if(held){
    var bits=[];
    if(r.score!=null)bits.push('Score '+Math.round(r.score));
    if(r.planPend>0)bits.push('plan: faltan <b>'+_emEur(r.planPend)+'</b>'+(_emPlanProxAnio(r.t)?' ('+_emPlanProxAnio(r.t)+')':''));
    else bits.push('plan completo');
    return bits.join(' · ');
  }
  var m=[];
  if(r.score!=null)m.push('Score <b>'+Math.round(r.score)+'</b>');
  if(cot>0)m.push('cot '+_emEur(cot));
  if(eM>0)m.push('ent '+_emEur(eM));
  if(a&&a.decision)m.push(_emEsc(_emUp(a.decision)));
  return m.join(' · ');
}
function _emMover(r){
  var opts=[['','Auto'],['Vigilada','Vigilada'],['En análisis','En análisis'],['En zona','Planteamiento'],['Descartada','Descartada']];
  var cur=r.pin||'';
  var o=opts.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+x[1]+'</option>'; }).join('');
  return '<select class="em-mov" data-emmov="'+r.t+'" title="Mover de columna (pin manual)">'+o+'</select>';
}
function _emBand(band){
  if(!band.length)return '<div class="em-lane em-lane-empty">⚡ <b>Necesita tu acción</b> — nada pendiente ahora mismo. 👌</div>';
  var cards=band.map(function(r){ return _emCard(r,true); }).join('');
  return '<div class="em-lane"><h4>⚡ Necesita tu acción ('+band.length+')</h4><div class="em-lanecards">'+cards+'</div></div>';
}
function _emKanban(cols){
  var def=[['sel','① Selección'],['ana','② Análisis'],['plan','③ Planteamiento'],['seg','④ Seguimiento']];
  var h='<div class="em-kanban">';
  def.forEach(function(d){
    var list=cols[d[0]];
    var uni=(d[0]==='sel')?list.filter(function(r){return r.et==='Universo';}):[];
    var vis=(d[0]==='sel')?list.filter(function(r){return r.et!=='Universo';}):list;
    var cards=vis.map(function(r){ return _emCard(r,false); }).join('') || '<div class="em-empty">—</div>';
    var uniStrip=uni.length?('<div class="em-uni" data-emuni="1">Universo — '+uni.length+' empresas sin marcar <span class="em-arw">▾</span></div>'):'';
    h+='<div class="em-col"><div class="em-colh"><span>'+d[1]+'</span><span class="em-cc">'+vis.length+'</span></div>'+cards+uniStrip+'</div>';
  });
  h+='</div>';
  return h;
}
function _emClosed(cerr){
  if(!cerr.length)return '';
  var names=cerr.map(function(r){ return r.t; }).join(', ');
  return '<div class="em-closed"><b>Descartadas ('+cerr.length+')</b> — '+_emEsc(names)+' · solo lo que descartas a mano; las ex-cartera vuelven al embudo <span style="float:right;color:#d97706">post-mortem → M3</span></div>';
}

/* ---------- interacción ---------- */
function _emBind(sec){
  if(sec._emBound)return; sec._emBound=true;
  sec.addEventListener('click',function(e){
    var f=e.target.closest('[data-ficha]'); if(f){ var tk=f.getAttribute('data-ficha'); if(typeof abrirFicha==='function'){abrirFicha(tk);return;} if(typeof renderFicha==='function'){location.hash='ficha='+tk;} return; }
    var g=e.target.closest('[data-goto]'); if(g){ var goto=g.dataset.goto; if(g.dataset.sig&&typeof showProtocolo==='function'){ showProtocolo(g.dataset.sig,goto,g.dataset.ticker||''); return; } if(typeof activarVista==='function')activarVista(goto); return; }
    var u=e.target.closest('[data-emuni]'); if(u){ u.classList.toggle('open'); return; }
  });
  sec.addEventListener('change',function(e){
    var m=e.target.closest('[data-emmov]'); if(!m)return;
    var t=_emUp(m.getAttribute('data-emmov')); var val=m.value;
    DB.embudo=DB.embudo||{};
    if(!val){ if(DB.embudo[t]){ delete DB.embudo[t].etapa; if(!Object.keys(DB.embudo[t]).length)delete DB.embudo[t]; } }
    else { DB.embudo[t]=DB.embudo[t]||{}; DB.embudo[t].etapa=val; DB.embudo[t].fecha=new Date().toISOString().slice(0,10); }
    if(typeof scheduleSave==='function')scheduleSave();
    renderEmbudo();
  });
}

/* ---------- estilos (inyectados una vez) ---------- */
(function _emCSS(){
  if(document.getElementById('em-css'))return;
  var s=document.createElement('style'); s.id='em-css';
  s.textContent=[
    '.em-wrap{--u0:#dc2626;--u1:#d97706;--u2:#2563eb;--u3:#16a34a}',
    '.em-strip{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 12px}',
    '.em-pill{flex:1;min-width:120px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px 11px}',
    '.em-pn{font-size:20px;font-weight:800;color:#1f3d6b;line-height:1}',
    '.em-pl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}',
    '.em-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:#64748b;margin:0 0 12px;align-items:center}',
    '.em-lg{display:inline-flex;align-items:center;gap:5px}.em-sw{width:11px;height:11px;border-radius:3px;display:inline-block}',
    '.em-agenda{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:9px 12px;font-size:12.5px;color:#1e3a8a;margin-bottom:12px;cursor:pointer}',
    '.em-agenda .em-arw{float:right;opacity:.6}',
    '.em-lane{background:#fff8f4;border:1px solid #fed7aa;border-radius:12px;padding:12px 13px;margin-bottom:16px}',
    '.em-lane-empty{background:#f0fdf4;border-color:#bbf7d0;color:#166534;font-size:13px}',
    '.em-lane h4{margin:0 0 9px;font-size:13px;color:#9a3412;text-transform:uppercase;letter-spacing:.04em}',
    '.em-lanecards{display:flex;gap:10px;overflow:auto;padding-bottom:4px}',
    '.em-lanecards .em-card{min-width:225px}',
    '.em-kanban{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}',
    '@media(max-width:900px){.em-kanban{grid-template-columns:1fr 1fr}}',
    '@media(max-width:560px){.em-kanban{grid-template-columns:1fr}}',
    '.em-col{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:9px}',
    '.em-colh{display:flex;align-items:center;justify-content:space-between;margin:2px 4px 9px;font-weight:800;font-size:12.5px;color:#1f3d6b;text-transform:uppercase;letter-spacing:.03em}',
    '.em-cc{background:#fff;border:1px solid #e2e8f0;border-radius:20px;font-size:11px;padding:1px 8px;color:#64748b}',
    '.em-card{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #16a34a;border-radius:10px;padding:9px 10px;margin-bottom:9px}',
    '.em-ct{display:flex;align-items:center;gap:7px;margin-bottom:3px}',
    '.em-tk{font-weight:800;font-size:14px;color:#0f172a;cursor:pointer}',
    '.em-nm{font-size:11px;color:#64748b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.em-et{display:inline-block;font-size:10px;font-weight:700;border-radius:20px;padding:1px 8px;background:#eef2f8;color:#1f3d6b;margin-bottom:5px}',
    '.em-pinb{display:inline-block;font-size:9.5px;font-weight:700;border-radius:20px;padding:1px 7px;background:#fef3c7;color:#92400e;margin-bottom:5px}',
    '.em-exb{display:inline-block;font-size:9.5px;font-weight:700;border-radius:20px;padding:1px 7px;background:#e0e7ff;color:#3730a3;margin-bottom:5px}',
    '.em-metric{font-size:11.5px;color:#475569;margin-bottom:6px}',
    '.em-acc{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;border-radius:8px;padding:5px 8px;cursor:pointer;margin-bottom:6px}',
    '.em-acc .em-arw{margin-left:auto;opacity:.55}',
    '.em-mov{width:100%;font-size:11px;border:1px solid #e2e8f0;border-radius:7px;padding:3px 5px;color:#475569;background:#fff}',
    '.em-uni{border:1px dashed #e2e8f0;border-radius:9px;padding:8px 10px;font-size:12px;color:#64748b;background:#fff;cursor:pointer}',
    '.em-uni .em-arw{float:right}',
    '.em-empty{font-size:12px;color:#cbd5e1;padding:6px 4px}',
    '.em-closed{margin-top:12px;border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;font-size:12.5px;color:#64748b;background:#fafafa}'
  ].join('\n');
  document.head.appendChild(s);
})();
