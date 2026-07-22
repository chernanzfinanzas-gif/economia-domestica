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
/* A1 · próxima revisión obligatoria: a.proxRev (editable) o dossierFecha + 12 meses. */
function _emAddMes(f,n){ if(!f)return null; var d=new Date(f+'T00:00:00'); if(isNaN(d.getTime()))return null; d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,10); }
function proxRevDe(t){ var a=_emAna(t); if(!a)return null; if(a.proxRev)return a.proxRev; if(a.dossierFecha)return _emAddMes(a.dossierFecha,12); return null; }
function _emRevVencida(t){ var pr=proxRevDe(t); return !!(pr && pr<=new Date().toISOString().slice(0,10)); }
function _emRevDias(t){ var pr=proxRevDe(t); if(!pr)return null; return Math.round((new Date(pr+'T00:00:00').getTime()-Date.now())/86400000); }
/* € pendientes del plan (todos los años). Versión € del objetivo de Diversificación. */
function _emPlanPendEur(t){ t=_emUp(t); if(typeof _planRem==='function'){ try{ var R=_planRem(t); var s=0; Object.keys(R.rem||{}).forEach(function(y){ s+=_emNum(R.rem[y]); }); return s; }catch(e){} } var pc=(DB.planCompras||{})[t]||{}; var s2=0; Object.keys(pc).forEach(function(y){ s2+=_emNum(pc[y]); }); return s2; }
/* Próximo año con tramo pendiente > 0. */
function _emPlanProxAnio(t){ t=_emUp(t); var pend=null; if(typeof _planRem==='function'){ try{ var R=_planRem(t); Object.keys(R.rem||{}).forEach(function(y){ if(_emNum(R.rem[y])>0){ y=+y; if(pend==null||y<pend)pend=y; } }); return pend; }catch(e){} } var pc=(DB.planCompras||{})[t]||{}; Object.keys(pc).forEach(function(y){ if(_emNum(pc[y])>0){ y=+y; if(pend==null||y<pend)pend=y; } }); return pend; }
/* ¿tramo del año en curso (o pasado) pendiente? → posición parcial en ejecución. */
function _emComprandoAhora(t){ var pa=_emPlanProxAnio(t); return pa!=null && pa<=new Date().getFullYear(); }
function _emPin(t){ t=_emUp(t); return ((DB.embudo||{})[t]||{}); }
/* G1 · "por qué la tengo" por posición */
function _emAcc(t){ t=_emUp(t); var s=0; try{ (invPositions()||[]).forEach(function(p){ if(_emUp(p.ticker)===t)s+=_emNum(p.acciones); }); }catch(e){} return s; }
function _emPorQue(t){
  t=_emUp(t); var a=_emAna(t)||{}; var bits=[];
  bits.push('<div><b>Origen:</b> '+(a.dossierFecha?('analizada el '+a.dossierFecha):'sin dossier')+(a.rating?' · rating '+a.rating:'')+(a.decision?' · '+_emEsc(a.decision):'')+'</div>');
  var J=(typeof _tesisCache!=='undefined'&&_tesisCache)?_tesisCache[t]:null;
  var tesis=(J&&(J.resumen||J.bull))||''; if(tesis)bits.push('<div><b>Tesis:</b> '+_emEsc((''+tesis).slice(0,180))+'</div>');
  var eM=_emNum(a.entMax),eMin=_emNum(a.entMin); if(eM>0)bits.push('<div><b>Entrada:</b> '+(eMin>0?(_emEur(eMin)+' – '):'≤ ')+_emEur(eM)+(_emNum(a.stopTesis)>0?' · stop '+_emEur(a.stopTesis):'')+'</div>');
  var pr=(typeof proxRevDe==='function')?proxRevDe(t):null; if(pr)bits.push('<div><b>Próx. revisión:</b> '+pr+'</div>');
  var last=null; (DB.diario||[]).forEach(function(e){ if(_emUp(e.ticker)===t){ if(!last||(e.fecha||'')>(last.fecha||''))last=e; } });
  if(last)bits.push('<div><b>Última decisión:</b> '+_emEsc(last.tipo)+' ('+_emEsc(last.fecha)+')'+(last.porque?' — '+_emEsc((''+last.porque).slice(0,120)):'')+'</div>');
  else bits.push('<div class="muted"><b>Mis Decisiones:</b> sin decisión registrada · <span class="em-why-link" data-goto="diario">registrar</span></div>');
  return bits.join('');
}
function _emWhyBlock(r){ var op=(window._emWhy||{})[r.t]; return '<div class="em-why-t" data-emwhy="'+r.t+'">¿por qué la tengo? '+(op?'▴':'▾')+'</div>'+(op?'<div class="em-why">'+_emPorQue(r.t)+'</div>':''); }
/* G2 · dividendo en riesgo agregado */
function _emDivAnual(t){ t=_emUp(t); var a=_emAna(t)||{}; var v=(DB.valores||{})[t]||{}; var d=_emNum(a.divAccion)||_emNum(v.divAccion); return _emAcc(t)*d; }
function _emDivRiesgo(t){ var a=_emAna(t)||{}; var ds=a.dividendSafety; if(!ds||ds.score==null)return null; if(ds.topeDuro&&ds.topeDuro.activo)return true; if(_emNum(ds.score)<60)return true; if(/vigilar|frágil|fragil|recorte/i.test(ds.banda||''))return true; return false; }
function _emDivRiesgoResumen(){
  var held=_emHeldSet(); var tot=0, risk=0, sinDato=0, lst=[];
  held.forEach(function(t){ var dv=_emDivAnual(t); if(dv<=0)return; tot+=dv; var r=_emDivRiesgo(t); if(r===true){ risk+=dv; var ds=(_emAna(t)||{}).dividendSafety||{}; lst.push({t:t,dv:dv,banda:ds.banda||''}); } else if(r===null){ sinDato+=dv; } });
  lst.sort(function(a,b){return b.dv-a.dv;});
  return {tot:tot,risk:risk,sinDato:sinDato,pct:tot>0?risk/tot*100:0,lst:lst};
}
function _emDivRiesgoStrip(){
  var R=_emDivRiesgoResumen(); if(R.tot<=0)return '';
  var col=R.pct<10?'#16a34a':(R.pct<25?'#d97706':'#dc2626');
  var det=R.lst.length?(' — '+R.lst.map(function(x){return x.t+(x.banda?' ('+_emEsc(x.banda)+')':'');}).join(', ')):' — ninguna en riesgo 👍';
  return '<div class="em-divrisk">💧 <b>Renta por dividendo</b> '+_emEur(R.tot)+'/año · <b style="color:'+col+'">'+R.pct.toFixed(0)+'% en riesgo</b>'+(R.lst.length?(' ('+R.lst.length+')'):'')+det+(R.sinDato>0?' <span class="muted" style="font-size:10px">· '+_emEur(R.sinDato)+' sin dato de seguridad</span>':'')+'</div>';
}

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
    if(_emRevVencida(t)) return 'En revisión';
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
    if(_emRevVencida(t)) return A('📅 Revisión pendiente ('+proxRevDe(t)+')','monitor',{emrev:t});
    return A('Revisar','monitor');
  }
  if(et==='En zona') return A('🟢 Comprar — abrir posición','inversiones',{comprar:t});
  if(et==='Cerca de entrada') return A('🟡 Cerca ('+_emPctOver(cot,eM)+') — preparar compra','inversiones',{comprar:t});
  if(et==='Comprando') return A('🧩 Ejecutar tramo del plan','inversiones',{comprar:t});
  /* Adelantar plan (held con capital pendiente y precio en/cerca de zona) */
  if(held&&_emPlanPendEur(t)>0&&cot>0&&eM>0&&cot<=eM*1.05){
    return A('🟢 Adelantar plan — faltan '+_emEur(_emPlanPendEur(t)),'inversiones',{comprar:t});
  }
  if(et==='En cartera') return A('✓ En seguimiento','inversiones');
  if(et==='Analizada · espera precio') return A('⏳ Esperar precio ≤ '+_emEur(eM),'analisis');
  if(et==='Analizada · esperar') return A('⏳ Esperar catalizador','analisis');
  if(et==='Analizada') return A('Revisar veredicto','analisis');
  if(et==='En análisis'){ var ci=_emColaInfo(t); return A('📝 Terminar dossier'+(ci.pos?' (cola #'+ci.pos+')':''),'cobertura'); }
  if(et==='Vigilada') return A(_emCerrada(t)?'↩ Reevaluar — ex-cartera':'📥 Encolar para análisis','radar');
  if(et==='Descartada') return A('📓 Post-mortem','',{dnuevo:t+'|Descartar'});
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
  DB.embudo=DB.embudo||{}; _emProxCache=null; _emIdxCache=null; _emVerCache=null; _emEnsureDossiers();
  var rows=_emAllTickers().map(_emRow).filter(Boolean);
  var byT={}; rows.forEach(function(r){ byT[r.t]=r; });

  var cols={sel:[],ana:[],plan:[],seg:[],cerr:[]};
  rows.forEach(function(r){ cols[r.col].push(r); });
  var metric={ seg:function(r){return _emPosPeso(r.t);}, plan:function(r){return r.score||0;}, ana:function(r){return r.score||0;}, sel:function(r){return _emAtractivo(r.t);}, cerr:function(r){return 0;} };
  Object.keys(cols).forEach(function(c){ if(c==='ana'){ cols[c].sort(_emAnaSort); return; } cols[c].sort(function(x,y){ return (x.urg-y.urg) || (metric[c](y)-metric[c](x)); }); });

  /* banda: rank asc, luego urgencia, luego score/peso desc */
  var band=rows.filter(function(r){return r.band;}).sort(function(x,y){
    return (x.band.rank-y.band.rank) || (x.urg-y.urg) || ((y.score||0)-(x.score||0));
  }).slice(0,10);

  var H='';
  H+='<div class="em-wrap">';
  H+=_emKpis(cols);
  H+=_emLegend();
  H+=_emDivRiesgoStrip();
  H+=_emAgenda();
  H+=_emCajaKpis();
  H+=_emBand(band);
  H+=_emKanban(cols);
  H+=_emClosed(cols.cerr);
  H+=_emGlosario();
  H+='</div>';
  H+='<button class="em-collapse-all" type="button" data-emcollapseall="1" title="Cerrar todas las fichas (refrescar la vista)">\u21f2 Cerrar fichas</button>';
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
  var acc = ac.txt ? ('<div class="em-acc" style="background:'+_EM_URGBG[U]+';color:'+_EM_URGINK[U]+'"'+(ac.goto?(' data-goto="'+ac.goto+'"'+(ac.sig?' data-sig="'+ac.sig+'"':'')+(ac.ticker?' data-ticker="'+ac.ticker+'"':'')):'')+(ac.dnuevo?(' data-dnuevo="'+ac.dnuevo+'"'):'')+(ac.comprar?(' data-comprar="'+ac.comprar+'"'):'')+'>'+ac.txt+((ac.goto||ac.dnuevo)?'<span class="em-arw">→</span>':'')+'</div>') : '';
  /* Colapsable: en el Kanban las fichas abren mini (nombre+arquetipo+estado) y se
     expanden al pinchar la cabecera. Las de la banda "Necesita tu acción" (compact) van siempre abiertas. */
  var expanded = !!(window._emExp && window._emExp[r.t]);
  var caret = '<span class="em-caret">'+(expanded?'\u25be':'\u25b8')+'</span>';
  var zoneChip = (r.col==='seg' && r.held) ? _emZoneChip(r) : '';
  var distChip = (r.col==='ana') ? _emDistChip(r) : '';
  var _doss=_emDossHref(r); var _dossIco=_doss?('<a class="em-doss" href="'+_doss+'" target="_blank" rel="noopener" title="Abrir dossier de análisis">📄</a>'):'';
  var head = '<div class="em-head" data-emtoggle="'+r.t+'">'
    + '<div class="em-ct"><span class="em-tk" data-ficha="'+r.t+'" title="Abrir ficha de '+r.t+'">'+r.t+'</span>'+_dossIco+'<span class="em-nm">'+_emEsc(r.nombre).slice(0,22)+'</span>'+_emArqChip(r.t)+caret+'</div>'
    + '<div class="em-etr"><span class="em-et">'+_emEsc(r.et)+'</span>'+zoneChip+distChip+'</div>'
    + '</div>';
  var dim = ((r.col==='plan') || (r.col==='seg' && r.planPend>0)) ? _emDimBlock(r) : '';
  var ref = _emRefBlock(r);
  var more = expanded ? (''
    + (exBadge?('<div>'+exBadge+'</div>'):'')
    + (pinBadge?('<div>'+pinBadge+'</div>'):'')
    + (metricLine?('<div class="em-metric">'+metricLine+'</div>'):'')
    + ref
    + dim
    + acc
    + _emCierresBtn(r)
    + (r.held?_emWhyBlock(r):'')
    + _emMover(r)
  ) : '';
  return '<div class="em-card'+(expanded?'':' em-collapsed')+'" style="border-left-color:'+_EM_URGCOL[U]+'">'+head+more+'</div>';
}
function _emMetricLine(r){
  var a=r.a, held=r.held;
  var cot=_emNum(a&&a.cotizacion), eM=_emNum(a&&a.entMax);
  if(held){
    var bits=[];
    if(r.score!=null)bits.push('Score '+Math.round(r.score));
    var _rph=_emRpd(r.t); if(_rph!=null)bits.push('RPD '+_rph.toFixed(1).replace('.',',')+'%');
    if(r.planPend>0)bits.push('plan: faltan <b>'+_emEur(r.planPend)+'</b>'+(_emPlanProxAnio(r.t)?' ('+_emPlanProxAnio(r.t)+')':''));
    else bits.push('plan completo');
    var _pr=proxRevDe(r.t); if(_pr){ var _rd=_emRevDias(r.t); bits.push('revisión '+_pr+(_rd!=null?(_rd<0?' <b style="color:#dc2626">(vencida)</b>':(_rd<=30?' (en '+_rd+'d)':'')):'')+' <span class="em-revedit" data-emrevedit="'+r.t+'" title="Cambiar fecha de revisión">✎</span>'); }
    var _pch=_emPotChip(r); return bits.join(' · ')+(_pch?' '+_pch:'');
  }
  var m=[];
  if(r.score!=null)m.push('Score <b>'+Math.round(r.score)+'</b>');
  if(cot>0)m.push('cot '+_emEur(cot));
  if(eM>0)m.push('ent '+_emEur(eM));
  var _rp=_emRpd(r.t); if(_rp!=null)m.push('RPD '+_rp.toFixed(1).replace('.',',')+'%');
  if(a&&a.decision)m.push(_emEsc(_emUp(a.decision)));
  var _pch=_emPotChip(r); return m.join(' · ')+(_pch?' '+_pch:'');
}
function _emMover(r){
  var opts=[['','Auto'],['Vigilada','Vigilada'],['En análisis','En análisis'],['En zona','Planteamiento'],['Descartada','Descartada']];
  var cur=r.pin||'';
  var o=opts.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+x[1]+'</option>'; }).join('');
  return '<select class="em-mov" data-emmov="'+r.t+'" title="Mover de columna (pin manual)">'+o+'</select>';
}

/* ---------- Dimensionamiento de compra (Próxima compra dentro del Kanban) ---------- */
/* Reutiliza proximaCompra() (04-plan.js): caja de hoy + rec €/acciones/prioridad por ticker. */
var _emProxCache=null;
function _emProxMap(){
  if(_emProxCache)return _emProxCache; var m={caja:null,by:{}};
  try{ if(typeof proximaCompra==='function'){ var M=proximaCompra(); if(M){ m.caja=(M.cajaHoy!=null)?M.cajaHoy:null;
    (M.items||[]).forEach(function(x){ m.by[x.t]={cot:x.cot,entMax:x.entMax,prio:x.prio,gap:x.gap,rec:null,acc:null,rank:null}; });
    (M.cand||[]).forEach(function(x,i){ var o=m.by[x.t]||(m.by[x.t]={}); o.cot=x.cot;o.entMax=x.entMax;o.prio=x.prio;o.gap=x.gap;o.rec=x.rec;o.acc=x.acc;o.rank=i+1; });
  } } }catch(e){}
  _emProxCache=m; return m;
}
/* €/acciones desplegables ahora: min(caja disponible, objetivo) / cotización */
function _emBuyPlan(r){
  var P=_emProxMap(), d=P.by[r.t]||{}, a=r.a;
  var cot=_emNum(a&&a.cotizacion)||_emNum(d.cot), eM=_emNum(a&&a.entMax)||_emNum(d.entMax);
  var ptePlan=_emPlanPendEur(r.t);
  var target=r.held?ptePlan:_emNum(d.rec!=null?d.rec:d.gap);
  var caja=P.caja, cajaKnown=(caja!=null&&caja>=0);
  var recom=Math.round(cajaKnown?Math.min(caja,(target>0?target:caja)):target);
  var acc=(cot>0&&recom>0)?Math.floor(recom/cot):0;
  return {cot:cot,eM:eM,ptePlan:ptePlan,recom:recom,caja:caja,cajaKnown:cajaKnown,acc:acc,
          rank:d.rank||null, prio:(d.prio!=null)?Math.round(d.prio):null, held:!!r.held};
}
/* Termómetro de precio con TODOS los niveles de Análisis: stop · ent.mín · ent · PO− · PO · PO+
   + punto de cotización. Versión propia del Kanban (no toca el de Tesis/Ficha). */
function _emBar(V){
  var precio=V.precio,stop=V.stop,entMin=V.entMin,ent=V.entMax,poMin=V.poMin,pob=V.poBase,pobull=V.poBull;
  var C=(typeof TZ_COL!=='undefined')?TZ_COL:{ok:'#16a34a',mid:'#d97706',bad:'#dc2626',na:'#94a3b8',blue:'#2563eb'};
  var pts=[stop,entMin,ent,precio,poMin,pob,pobull].filter(function(x){return x!=null&&x>0;});
  if(!(precio>0)||pts.length<2)return '';
  var lo=Math.min.apply(null,pts)*0.97,hi=Math.max.apply(null,pts)*1.03,rng=hi-lo||1;
  var X=function(v){return ((v-lo)/rng)*100;};
  var segs='';
  if(ent>0)segs+='<rect x="0" y="9" width="'+X(ent)+'" height="6" fill="'+C.ok+'" opacity="0.28"/>';
  if(ent>0&&pob>0)segs+='<rect x="'+X(ent)+'" y="9" width="'+Math.max(0,X(pob)-X(ent))+'" height="6" fill="'+C.mid+'" opacity="0.28"/>';
  if(pob>0)segs+='<rect x="'+X(pob)+'" y="9" width="'+Math.max(0,100-X(pob))+'" height="6" fill="'+C.bad+'" opacity="0.24"/>';
  var fm=(typeof _tzFmt==='function')?_tzFmt:function(x){return (typeof fmt==='function')?fmt(x):(''+x);};
  var mk=function(v,col,lab,up){ if(!(v>0))return ''; var x=X(v); return '<line x1="'+x+'" y1="7" x2="'+x+'" y2="17" stroke="'+col+'" stroke-width="0.8"/>'+
    '<text x="'+Math.max(2,Math.min(98,x))+'" y="'+(up?5:24)+'" text-anchor="middle" font-size="3" fill="'+col+'">'+lab+'</text>'; };
  var marks=mk(stop,C.bad,'stop',true)+mk(entMin,C.ok,'ent.mín',false)+mk(ent,C.ok,'ent',true)+mk(poMin,C.blue,'PO−',false)+mk(pob,C.blue,'PO',true)+mk(pobull,'#7c3aed','PO+',false);
  var px=X(precio); var pcol=(ent>0&&precio<=ent)?C.ok:(pob>0&&precio<=pob?C.mid:C.bad);
  var dot='<circle cx="'+px+'" cy="12" r="2.4" fill="'+pcol+'" stroke="#fff" stroke-width="0.6"/>'+
    '<text x="'+Math.max(3,Math.min(97,px))+'" y="30" text-anchor="middle" font-size="3.2" font-weight="700" fill="'+pcol+'">'+fm(precio)+'</text>';
  return '<svg viewBox="0 0 100 32" style="width:100%;height:auto;max-height:66px" xmlns="http://www.w3.org/2000/svg">'+segs+'<line x1="0" y1="12" x2="100" y2="12" stroke="#cbd5e1" stroke-width="0.4"/>'+marks+dot+'</svg>';
}
function _emPriceBar(r){ var a=r.a; if(!a)return '';
  var precio=_emNum(a.cotizacion)||((typeof _tzPrecio==='function')?_emNum(_tzPrecio(r.t)):0);
  var entMax=_emNum(a.entMax), entMin=_emNum(a.entMin), stop=_emNum(a.stopTesis), poBull=_emNum(a.poMax), poBear=_emNum(a.poMin);
  var poBase=_emNum(a.precioObjetivo)||((poBear&&poBull)?(poBear+poBull)/2:(poBull||poBear||0));
  if(!(precio>0)||!(entMax>0||poBase>0))return '';
  var svg=_emBar({precio:precio,stop:stop,entMin:entMin,entMax:entMax,poMin:poBear,poBase:poBase,poBull:poBull});
  return svg?('<div class="em-pbar">'+svg+'</div>'):'';
}
/* --------- Integración de Tesis (semáforo, potencial, dividendo, catalizadores/riesgos) --------- */
var _emVerCache=null;
function _emVer(t){ t=_emUp(t); if(!_emVerCache)_emVerCache={}; if(_emVerCache[t]!==undefined)return _emVerCache[t];
  var V=null; if(typeof tesisVeredicto==='function'){ try{ V=tesisVeredicto(t); }catch(e){} } _emVerCache[t]=V; return V; }
function _emDossHref(r){ var a=r.a; var u=(typeof dossierURL==='function')?dossierURL(r.t,a&&a.dossierUrl):((a&&a.dossierUrl)||''); return u||''; }
function _emPot(r){ var a=r.a; if(!a)return null; var cot=_emNum(a.cotizacion); var mn=_emNum(a.poMin),mx=_emNum(a.poMax);
  var po=(mn&&mx)?(mn+mx)/2:(_emNum(a.precioObjetivo)||mx||mn||0); if(!(cot>0&&po>0))return null; return (po/cot-1)*100; }
function _emPotChip(r){ var p=_emPot(r); if(p==null)return ''; var pos=p>=0;
  return '<span class="em-pot'+(pos?'':' neg')+'" title="Potencial hasta tu precio objetivo (PO base)">'+(pos?'+':'')+p.toFixed(0)+'% vs PO</span>'; }
function _emLuzCol(estado){ var m={APTA:'ok',DUDA:'mid',DESCARTA:'bad',ENZONA:'ok',ZONAFLOJA:'mid',CERCA:'mid',CARA:'bad',STOP:'bad',SINDATO:'na',SOLIDA:'ok',DEBIL:'bad',NA:'na'};
  var k=m[estado]||'na'; return (typeof TZ_COL!=='undefined'&&TZ_COL[k])||({ok:'#16a34a',mid:'#d97706',bad:'#dc2626',na:'#94a3b8'}[k]); }
var _EM_VSHORT={INVERTIR:'Invertir',ESPERAR:'Vigilar',FUERA:'Fuera'};
function _emSemBlock(r){ var V=_emVer(r.t); if(!V)return '';
  var c1=_emLuzCol(V.c1),c2=_emLuzCol(V.c2),c3=_emLuzCol(V.c3);
  var vc=(typeof TZ_VCOL!=='undefined'&&TZ_VCOL[V.v])||'#64748b', vl=_EM_VSHORT[V.v]||V.v||'—';
  return '<div class="em-sem" data-emsem="'+r.t+'" title="Semáforo de decisión — pulsa para ver por qué">'
    +'<span class="d" style="background:'+c1+'"></span><span class="d" style="background:'+c2+'"></span><span class="d" style="background:'+c3+'"></span>'
    +'<b style="color:'+vc+'">'+_emEsc(vl)+'</b><span class="i">ⓘ ver semáforo</span></div>'; }
function _emSemPop(t){ t=_emUp(t); var V=_emVer(t); if(!V)return;
  var prev=document.getElementById('em-sem-modal'); if(prev)prev.remove();
  var vc=(typeof TZ_VCOL!=='undefined'&&TZ_VCOL[V.v])||'#0f172a', vl=(typeof TZ_VLBL!=='undefined'&&TZ_VLBL[V.v])||V.v||'';
  var body=(typeof _tzSubluces==='function')?_tzSubluces(V):'';
  var ov=document.createElement('div'); ov.id='em-sem-modal'; ov.className='em-modal-ov';
  ov.innerHTML='<div class="em-modal"><div class="em-modal-h" style="background:'+vc+'">🚦 '+_emEsc(t)+' — '+_emEsc(vl)+'</div><div class="em-modal-b">'+body+(V.frase?'<div class="em-modal-f">'+_emEsc(V.frase)+'</div>':'')+'</div><div class="em-modal-x"><button class="btn ghost sm" data-emsemx="1">Cerrar</button></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){ if(e.target===ov||e.target.closest('[data-emsemx]'))ov.remove(); }); }
function _emDivBlock(r){ if(typeof _tzDivChart!=='function')return ''; if(_emRpd(r.t)==null)return '';
  var open=!!(window._emDivOpen&&window._emDivOpen[r.t]);
  var h='<div class="em-divbtn" data-emdiv="'+r.t+'">💧 Historial del dividendo <span class="arw">'+(open?'▾':'▸')+'</span></div>';
  if(open){ var c=''; try{ c=_tzDivChart(r.t); }catch(e){} h+='<div class="em-divwrap">'+(c||'<div class="muted" style="font-size:11px">Sin histórico de dividendo.</div>')+'</div>'; }
  return h; }
function _emVigBlock(r){ var V=_emVer(r.t); if(!V)return ''; var cats=V.catalizadores||[], ris=V.riesgos||[];
  if(!cats.length&&!ris.length&&!V.bull&&!V.bear)return '';
  var open=!!(window._emVigOpen&&window._emVigOpen[r.t]);
  var h='<div class="em-vigbtn" data-emvig="'+r.t+'">🔍 Vigilar — catalizadores / riesgos <span class="arw">'+(open?'▾':'▸')+'</span></div>';
  if(open){ var li=function(arr){ if(!arr||!arr.length)return '<div class="muted" style="font-size:10.5px">—</div>';
      return '<ul>'+arr.slice(0,5).map(function(x){ var s=(typeof x==='string')?x:(x&&(x.titulo||x.texto||x.nombre)||''); return '<li>'+_emEsc(s)+'</li>'; }).join('')+'</ul>'; };
    h+='<div class="em-vig"><div class="em-vig-c"><div class="h" style="color:#16a34a">▲ Catalizadores</div>'+li(cats)+'</div><div class="em-vig-c"><div class="h" style="color:#dc2626">▼ Riesgos</div>'+li(ris)+'</div></div>'; }
  return h; }
function _emEnsureDossiers(){ if(renderEmbudo._dossStarted)return; renderEmbudo._dossStarted=true;
  if(typeof cargarDossiers!=='function')return;
  try{ Promise.resolve(cargarDossiers()).then(function(){
    var js=(typeof _tesisSet!=='undefined'&&_tesisSet)?Array.from(_tesisSet):[];
    return Promise.all(js.map(function(t){ return (typeof cargarTesis==='function')?Promise.resolve(cargarTesis(t)).catch(function(){}):null; }));
  }).then(function(){ try{ if(document.getElementById('view-embudo'))renderEmbudo(); }catch(e){} }); }catch(e){} }
function _emDimBlock(r){
  var b=_emBuyPlan(r);
  var accNote=b.cajaKnown?('Caja disponible '+_emEur(b.caja)):'Caja bróker sin configurar (se usa el pendiente en plan)';
  var cells=''
    +'<div class="em-dc"><span>Prioridad</span><b>'+(b.rank?('#'+b.rank):(b.prio!=null?b.prio:'—'))+'</b></div>'
    +'<div class="em-dc"><span>Capital recom.</span><b>'+(b.recom>0?_emEur(b.recom):'—')+'</b></div>'
    +'<div class="em-dc" title="'+accNote+'"><span>Acc. con caja</span><b>'+(b.acc>0?(b.acc+' acc'):'—')+'</b></div>'
    +'<div class="em-dc"><span>Pte en plan</span><b>'+(b.ptePlan>0?_emEur(b.ptePlan):'—')+'</b></div>';
  var btns='<div class="em-dbtns"><button class="btn ghost sm" data-emplan="'+r.t+'" title="Añadir al Plan de compras del año">→ Plan</button> <button class="btn ghost sm" data-emcaja="'+r.t+'" title="Registrar la compra como salida en la Caja bróker (hoy)">→ Caja</button></div>';
  return '<div class="em-dim">'+cells+'</div>'+btns;
}
/* --------- Índice de oportunidad (potencial a PO × calidad × RPD × seguridad del dividendo) ---------
   Mismo cálculo que el «Ranking por margen de seguridad» de Próxima compra (04-plan.js). Se muestra
   en TODAS las analizadas, normalizado al máximo del universo → barra + etiqueta alto/medio/bajo. */
var _EM_RP={AAA:100,AA:90,A:80,BBB:65,BB:50,B:35,CCC:25,CC:20,C:15};
function _emDsFac(ds){ if(!ds||ds.score==null)return 1; var m={'Muy seguro':1,'Seguro':0.9,'Vigilar':0.6,'Frágil':0.3,'Recorte probable':0.1}; var f=(m[ds.banda]!=null)?m[ds.banda]:(ds.score>=80?1:ds.score>=60?0.9:ds.score>=40?0.6:ds.score>=20?0.3:0.1); if(ds.topeDuro&&ds.topeDuro.activo)f=Math.min(f,0.3); return f; }
function _emFoVeto(fo){ return !!fo&&fo.aplica&&((fo.veto===true)||(fo.beneish&&(''+fo.beneish.senal).indexOf('manipulaci')>=0)||(fo.altman&&fo.altman.zona==='riesgo')); }
function _emFoFac(fo){ if(!fo||!fo.aplica||!fo.flags||!fo.flags.length)return 1; return _emFoVeto(fo)?0.5:0.8; }
function _emIdxRaw(t){ t=_emUp(t); var a=_emAna(t); if(!a)return null;
  var cot=_emNum(a.cotizacion), mn=_emNum(a.poMin), mx=_emNum(a.poMax);
  var po=(mn&&mx)?(mn+mx)/2:(_emNum(a.precioObjetivo)||mx||mn||0);
  if(!(cot>0&&po>0))return null;
  var potF=Math.max(0,(po/cot-1));
  var cal=_EM_RP[_emUp(a.rating)]||0;
  var v=(DB.valores||{})[t]||{}; var da=_emNum(v.divAccion)||_emNum(a.divAccion); var rpd=cot>0?da/cot*100:0;
  var _tc=(typeof _tesisCache!=='undefined'&&_tesisCache)?_tesisCache[t]:null;
  var sf=_emDsFac(a.dividendSafety||(_tc?_tc.dividendSafety:null)||null);
  var ff=_emFoFac(a.forense||(_tc?_tc.forense:null)||null);
  return potF*100*(cal/100)*rpd*sf*ff;
}
var _emIdxCache=null;
function _emIdxMap(){ if(_emIdxCache)return _emIdxCache; var by={},max=0;
  _emAllTickers().forEach(function(t){ var v=_emIdxRaw(t); if(v!=null){ by[t]=v; if(v>max)max=v; } });
  _emIdxCache={by:by,max:max||1}; return _emIdxCache; }
function _emIdxChip(r){ var M=_emIdxMap(); var v=M.by[r.t]; if(v==null)return '';
  var rel=v/M.max, w=Math.max(4,Math.round(rel*100));
  var q=rel>=0.66?'alto':(rel>=0.33?'medio':'bajo'), qc=rel>=0.66?'#16a34a':(rel>=0.33?'#d97706':'#dc2626');
  return '<div class="em-idx" title="Índice de oportunidad = potencial a PO × calidad × RPD × seguridad del dividendo. Relativo al mejor del universo.">Índice op. <span class="bar"><i style="width:'+w+'%"></i></span><b>'+Math.round(v)+'</b> · <span class="q" style="color:'+qc+'">'+q+'</span></div>'; }
/* Distancia por encima del precio de entrada (solo COMPRAR aún fuera de banda). */
function _emDistEntrada(r){ var a=r.a; if(!a||_emUp(a.decision)!=='COMPRAR')return null;
  var cot=_emNum(a.cotizacion), eM=_emNum(a.entMax); if(!(cot>0&&eM>0))return null;
  var over=(cot/eM-1)*100; return over>0.05?over:null; }
function _emDistChip(r){ var d=_emDistEntrada(r); if(d==null)return '';
  var cls=d<=10?'d-near':(d<=25?'d-mid':'d-far');
  return '<span class="em-dist '+cls+'" title="Cotiza un '+d.toFixed(0)+'% por encima de tu banda de entrada">▲ +'+d.toFixed(0)+'% de entrada'+(d>25?' · cara':'')+'</span>'; }
function _emAnaSort(x,y){ var dx=_emDistEntrada(x), dy=_emDistEntrada(y); var hx=(dx!=null), hy=(dy!=null);
  if(hx&&hy)return dx-dy; if(hx!==hy)return hx?-1:1; return (y.score||0)-(x.score||0); }
/* Bloque de referencia (semáforo + índice + termómetro + dividendo + vigilar) para toda analizada. */
function _emRefBlock(r){ if(!_emAnalizada(r.t))return '';
  return _emSemBlock(r)+_emIdxChip(r)+_emPriceBar(r)+_emDivBlock(r)+_emVigBlock(r); }
/* KPIs de la caja del bróker, encima de «Necesita tu acción». */
function _emCajaKpis(){
  var caja=(typeof _saldoCajaHoy==='function')?_saldoCajaHoy():null;
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var hoyS=hoy.toISOString().slice(0,10);
  var lim=new Date(hoy.getTime()+30*86400000); var limS=lim.toISOString().slice(0,10);
  var div=0,apor=0,otros=0;
  if(typeof cajaMovs==='function'){ try{ cajaMovs().forEach(function(mv){ var f=(mv.fecha||''); if(f>hoyS&&f<=limS){ var e=_emNum(mv.entra); if(mv.div)div+=e; else if(mv.apor)apor+=e; else otros+=e; } }); }catch(e){} }
  var ing=div+apor+otros;
  var yr=(new Date()).getFullYear();
  var pi=(typeof _planYearInfo==='function')?_planYearInfo(yr):null; var libre=pi?pi.remaining:null;
  var subIng=(div||apor)?('div. '+_emEur(div)+' · aport. '+_emEur(apor)):'dividendos + aportaciones';
  return '<div class="em-caja">'
    +'<div class="em-cajac hero"><div class="l">💶 Caja bróker (hoy)</div><div class="v">'+(caja!=null?_emEur(caja):'sin configurar')+'</div><div class="p">disponible para comprar</div></div>'
    +'<div class="em-cajac"><div class="l">📈 Ingresos previstos 30 d</div><div class="v'+(ing>0.005?' pos':'')+'">'+(ing>0.005?'+':'')+_emEur(ing)+'</div><div class="p">'+subIng+'</div></div>'
    +'<div class="em-cajac"><div class="l">🗓️ Presupuesto libre '+yr+'</div><div class="v'+(libre!=null&&libre<0?' neg':'')+'">'+(libre!=null?_emEur(libre):'—')+'</div><div class="p">del Plan de compras</div></div>'
    +'</div>';
}
/* Chip de zona para las de Seguimiento (En cartera): identifica las que pueden adelantarse
   en el plan. Mismo margen sobre el precio de entrada que usa el embudo/Próxima compra. */
function _emMargen(){ return (DB.config&&DB.config.embudoMargen!=null)?DB.config.embudoMargen:0.05; }
function _emRpd(t){ if(typeof _tzRPD==='function'){ try{ var v=_tzRPD(_emUp(t)); if(v!=null)return v; }catch(e){} }
  var a=_emAna(t), p=_emNum(a&&a.cotizacion), d=_emNum(a&&a.divAccion); return (p>0&&d>0)?(d/p*100):null; }
function _emZoneChip(r){
  var a=r.a; var cot=_emNum(a&&a.cotizacion), eM=_emNum(a&&a.entMax); if(!(cot>0&&eM>0))return '';
  if(_emUp(a&&a.decision)==='VENDER')return '';
  if(cot<=eM) return '<span class="em-zone z-in">🟢 en zona</span>';
  var m=_emMargen(); if(cot<=eM*(1+m)){ var over=((cot/eM-1)*100).toFixed(0); return '<span class="em-zone z-near">🟡 cerca de zona +'+over+'%</span>'; }
  return '';
}
function _emToPlan(t){ t=_emUp(t); var add=(typeof proxAddPlan==='function')?proxAddPlan(t):0;
  if(add>0){ if(typeof toast==='function')toast('Añadido '+_emEur(add)+' al Plan'); }
  else alert('No hay importe recomendado para el Plan de '+t+' (debe estar en zona de compra y con hueco vs objetivo de cartera).'); }
function _emToCaja(t){ t=_emUp(t); var P=_emProxMap(), d=P.by[t]||{}, held=_emHeldSet().has(t);
  var pend=held?_emPlanPendEur(t):_emNum(d.rec!=null?d.rec:d.gap);
  var caja=P.caja, eur=Math.round((caja!=null&&caja>=0)?Math.min(caja,(pend>0?pend:caja)):pend);
  if(!(eur>0)){ alert('No hay importe pendiente para registrar en Caja de '+t+'.'); return; }
  var a=_emAna(t), cot=_emNum(a&&a.cotizacion)||_emNum(d.cot), acc=cot>0?Math.floor(eur/cot):0;
  if(!confirm('¿Registrar compra de '+(acc?acc+' acc. ':'')+t+' por '+_emEur(eur)+' como salida en la Caja bróker (hoy)?'))return;
  DB.cajaMov=DB.cajaMov||[]; DB.cajaMov.push({id:'c'+Math.random().toString(36).slice(2,9),fecha:new Date().toISOString().slice(0,10),concepto:'Compra '+(acc?acc+' ':'')+t,entra:0,sale:eur});
  if(typeof saveNow==='function')saveNow(); if(typeof renderAll==='function')renderAll(); }
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
    var _lbl=d[1]+(d[0]==='ana'?' <span class="em-sort">· cerca→lejos entrada</span>':'');
    h+='<div class="em-col"><div class="em-colh"><span>'+_lbl+'</span><span class="em-cc">'+vis.length+'</span></div>'+cards+uniStrip+'</div>';
  });
  h+='</div>';
  return h;
}
function _emClosed(cerr){
  if(!cerr.length)return '';
  var names=cerr.map(function(r){ return r.t; }).join(', ');
  return '<div class="em-closed"><b>Descartadas ('+cerr.length+')</b> — '+_emEsc(names)+' · solo lo que descartas a mano; las ex-cartera vuelven al embudo <span style="float:right;color:#d97706">post-mortem → M3</span></div>';
}

/* ---------- Descarga de cierres de ejercicio (para la hoja "datos de mercado" del Excel) ---------- */
function _emCierresBtn(r){
  /* Disponible en todas las fichas del Kanban (para regenerar cualquier Excel al cierre real). */
  var fx='';
  try{ var v=(DB.valores||{})[r.t]||{}; if(v.cierreEj)fx='<span class="em-cierrefx" title="Fecha de cierre de ejercicio guardada para esta empresa">cierre '+v.cierreEj+'</span>'; }catch(e){}
  return '<div class="em-cierresrow">'
    +'<div class="em-cierres" data-emcierres="'+r.t+'" title="Descarga el cierre de cotización de los últimos 10 ejercicios (para pegar en tu Excel: datos de mercado)">📅 Cierres 10 ejercicios</div>'
    +fx
    +'</div>';
}
function _emParseDM(str){
  str=(''+str).trim().replace(/[.\-]/g,'/'); var p=str.split('/');
  if(p.length<2)return null; var d=parseInt(p[0],10), m=parseInt(p[1],10);
  if(!(d>=1&&d<=31)||!(m>=1&&m<=12))return null; return {d:d,m:m};
}
async function _emEscribirCSV(handle, nombre, contenido){
  // handle: FileSystemFileHandle ya elegido por el usuario (o null → descarga clásica)
  if(handle){
    try{
      var w=await handle.createWritable();
      await w.write(new Blob([contenido],{type:'text/csv;charset=utf-8'}));
      await w.close();
      return true;
    }catch(e){ alert('No se pudo escribir el archivo: '+e.message); return false; }
  }
  var blob=new Blob([contenido],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} },1500);
  return true;
}
function _emCierresDescargar(t){ _emCierresModal(_emUp(t)); }

function _emCierresModal(t){
  var prev=document.getElementById('em-cierres-modal'); if(prev)prev.remove();
  var def='31/12';
  try{ var _v=(DB.valores||{})[t]||{}; if(_v.cierreEj)def=_v.cierreEj; }catch(e){}
  var _rec=(def!=='31/12');
  var ov=document.createElement('div'); ov.id='em-cierres-modal'; ov.className='em-cmodal-ov';
  ov.innerHTML=''
    +'<div class="em-cmodal">'
    +  '<div class="em-cmodal-h">📅 Cierres de '+t+'</div>'
    +  '<div class="em-cmodal-b">'
    +    '<label>Día de cierre de ejercicio (DD/MM)</label>'
    +    '<input id="em-cmodal-date" type="text" value="'+def+'" inputmode="numeric" autocomplete="off">'
    +    '<div class="em-cmodal-hint">Descarga el cierre real de ese día en los últimos 10 ejercicios. La fecha se guarda en la ficha de '+t+' y se recuerda'+(_rec?' (fijada: '+def+')':'')+'. Al guardar el CSV, elige la carpeta de la empresa.</div>'
    +    '<div id="em-cmodal-msg" class="em-cmodal-msg"></div>'
    +  '</div>'
    +  '<div class="em-cmodal-f">'
    +    '<button class="btn ghost sm" id="em-cmodal-cancel" type="button">Cancelar</button>'
    +    '<button class="btn sm" id="em-cmodal-ok" type="button">Descargar CSV</button>'
    +  '</div>'
    +'</div>';
  document.body.appendChild(ov);
  var inp=ov.querySelector('#em-cmodal-date');
  var close=function(){ ov.remove(); };
  ov.querySelector('#em-cmodal-cancel').addEventListener('click',close);
  ov.addEventListener('click',function(e){ if(e.target===ov)close(); });
  ov.querySelector('#em-cmodal-ok').addEventListener('click',function(){ _emCierresGen(t, inp.value, ov); });
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter')_emCierresGen(t, inp.value, ov); if(e.key==='Escape')close(); });
  setTimeout(function(){ try{ inp.focus(); inp.select(); }catch(e){} },40);
}

async function _emCierresGen(t, fecha, ov){
  var msg=ov?ov.querySelector('#em-cmodal-msg'):null;
  var setMsg=function(x){ if(msg)msg.textContent=x||''; };
  var dm=_emParseDM(fecha);
  if(!dm){ setMsg('Fecha no válida. Usa DD/MM (p. ej. 31/12 o 31/01).'); return; }
  var dd=String(dm.d).padStart(2,'0'), mm=String(dm.m).padStart(2,'0');
  /* Anotar la fecha de cierre en la ficha de la empresa (desplazadas: Inditex 31/01, Logista 30/09). */
  try{ DB.valores=DB.valores||{}; DB.valores[t]=DB.valores[t]||{}; if(DB.valores[t].cierreEj!==(dd+'/'+mm)){ DB.valores[t].cierreEj=dd+'/'+mm; if(typeof scheduleSave==='function')scheduleSave(); } }catch(e){}
  var nombre='cierres_'+t+'_'+dd+mm+'.csv';
  /* 1) Selector de carpeta AHORA: es lo primero tras el clic en "Descargar", con el gesto de usuario
        aún válido (sin prompt ni await previos que lo invaliden). */
  var handle=null;
  if(window.showSaveFilePicker){
    try{
      handle=await window.showSaveFilePicker({ id:'khCierresEjercicio', suggestedName:nombre,
        types:[{description:'CSV (datos de mercado)',accept:{'text/csv':['.csv']}}] });
    }catch(e){ if(e&&e.name==='AbortError')return; handle=null; /* otro error → descarga clásica */ }
  }
  /* 2) Serie de precios + cálculo. */
  setMsg('Generando…');
  var pj=(typeof _precioCache!=='undefined')?_precioCache[t]:undefined;
  if(pj===undefined){
    try{ var rr=await fetch('precios/'+t+'.json',{cache:'no-store'}); pj=rr.ok?await rr.json():null; }catch(e){ pj=null; }
    if(typeof _precioCache!=='undefined')_precioCache[t]=pj;
  }
  if(!pj||!pj.data||!pj.data.length){ setMsg('No hay histórico de cotización para '+t+' en precios/.'); return; }
  if(typeof priceRepoAt!=='function'){ setMsg('Falta la función priceRepoAt.'); return; }
  var now=new Date(); var cand=new Date(now.getFullYear(),dm.m-1,dm.d);
  var lastEx=(cand.getTime()>now.getTime())?(now.getFullYear()-1):now.getFullYear();
  var sep=';';
  var out='﻿Ticker'+sep+'Ejercicio'+sep+'FechaCierre'+sep+'Cierre\n';
  var faltan=0;
  for(var y=lastEx-9;y<=lastEx;y++){
    var lab=(dm.m>=7)?y:(y-1);
    var px=priceRepoAt(t,Date.UTC(y,dm.m-1,dm.d));
    var val=(px>0)?(''+px).replace('.',','):''; if(!(px>0))faltan++;
    out+=t+sep+lab+sep+dd+'/'+mm+'/'+y+sep+val+'\n';
  }
  /* 3) Escribir. */
  var okg=await _emEscribirCSV(handle, nombre, out);
  if(!okg){ setMsg('No se pudo guardar el archivo.'); return; }
  if(ov)ov.remove();
  if(typeof renderEmbudo==='function'){ try{ renderEmbudo(); }catch(e){} }   /* repintar para que salga la fecha guardada junto al botón */
  if(faltan)alert('CSV guardado. Aviso: '+faltan+' ejercicio(s) sin dato en el histórico (quedan en blanco).');
}

function _emGlosario(){
  return '<details class="em-glos"><summary><span class="arw">▸</span>📖 Glosario — qué significa cada frase de las fichas</summary><div class="em-glos-b"><div class="em-gsec">Estados (columna y etiqueta de la ficha)</div><div class="em-grow"><span class="em-gt">Universo</span><span class="em-gd">En tu universo, aún sin marcar. Candidata potencial.</span></div><div class="em-grow"><span class="em-gt">Vigilada</span><span class="em-gd">En el radar, o ex-cartera (cerraste posición). La sigues para reentrar con nuevos precios o fundamentales.</span></div><div class="em-grow"><span class="em-gt">En análisis</span><span class="em-gd">En la cola de análisis; el dossier está en marcha.</span></div><div class="em-grow"><span class="em-gt">Analizada</span><span class="em-gd">Dossier terminado, pero el veredicto NO es COMPRAR ni ESPERAR (MANTENER/VENDER o sin decisión clara): repásalo.</span></div><div class="em-grow"><span class="em-gt">Analizada · esperar</span><span class="em-gd">Dossier terminado con decisión ESPERAR: la tesis es buena, falta un catalizador.</span></div><div class="em-grow"><span class="em-gt">Analizada · espera precio</span><span class="em-gd">Decisión COMPRAR, pero la cotización está por encima de la banda de entrada (+margen): esperas a que baje.</span></div><div class="em-grow"><span class="em-gt">En zona</span><span class="em-gd">COMPRAR y cotización dentro de la banda de entrada (≤ entrada máx.): comprable ya.</span></div><div class="em-grow"><span class="em-gt">Cerca de entrada</span><span class="em-gd">COMPRAR y cotización hasta un 5% por encima de la entrada: casi en precio.</span></div><div class="em-grow"><span class="em-gt">En cartera</span><span class="em-gd">Posición abierta, seguimiento normal.</span></div><div class="em-grow"><span class="em-gt">Comprando</span><span class="em-gd">En cartera con plan de compra pendiente en el año en curso (completando la posición).</span></div><div class="em-grow"><span class="em-gt">En revisión</span><span class="em-gd">Posición con alarma: stop tocado, protocolo abierto, trimestre publicado sin revisar o revisión anual vencida.</span></div><div class="em-grow"><span class="em-gt">Descartada</span><span class="em-gd">La descartaste a mano (pasa a Cerradas).</span></div><div class="em-gsec">Acciones sugeridas (el botón de color)</div><div class="em-grow"><span class="em-gt">🚨 Resolver stop</span><span class="em-gd">El precio tocó el stop de la tesis. Decide (lleva a revisión extraordinaria).</span></div><div class="em-grow"><span class="em-gt">⏰ Cerrar revisión (apunte S)</span><span class="em-gd">Hay un apunte del Protocolo abierto; ciérralo.</span></div><div class="em-grow"><span class="em-gt">📊 Revisar resultados</span><span class="em-gd">Se publicó un trimestre y falta registrarlo en el Monitor.</span></div><div class="em-grow"><span class="em-gt">📅 Revisión pendiente</span><span class="em-gd">La revisión anual de la tesis está vencida.</span></div><div class="em-grow"><span class="em-gt">🟢 Comprar — abrir posición</span><span class="em-gd">En zona de entrada; abre posición. → Cartera (añadir posición).</span></div><div class="em-grow"><span class="em-gt">🟡 Cerca — preparar compra</span><span class="em-gd">A menos de un 5% de la entrada; prepara la compra. → Cartera.</span></div><div class="em-grow"><span class="em-gt">🧩 Ejecutar tramo del plan</span><span class="em-gd">Estás comprando por tramos; ejecuta el tramo planificado. → Cartera.</span></div><div class="em-grow"><span class="em-gt">🟢 Adelantar plan — faltan X€</span><span class="em-gd">Ya en cartera con capital pendiente y precio en/cerca de zona: puedes adelantar compra. → Cartera.</span></div><div class="em-grow"><span class="em-gt">✓ En seguimiento</span><span class="em-gd">En cartera, nada urgente ahora.</span></div><div class="em-grow"><span class="em-gt">⏳ Esperar precio ≤ X</span><span class="em-gd">COMPRAR pero cara; espera a que entre en la banda de precio.</span></div><div class="em-grow"><span class="em-gt">⏳ Esperar catalizador</span><span class="em-gd">Decisión ESPERAR: la tesis vale, esperas el detonante (resultados, un evento, de-risking) antes de actuar. NO es cuestión de precio.</span></div><div class="em-grow"><span class="em-gt">Revisar veredicto</span><span class="em-gd">Analizada sin decisión clara de compra/espera; repasa el veredicto del dossier.</span></div><div class="em-grow"><span class="em-gt">📝 Terminar dossier</span><span class="em-gd">Está en la cola; completa el análisis.</span></div><div class="em-grow"><span class="em-gt">📥 Encolar / ↩ Reevaluar</span><span class="em-gd">Vigilada: mándala a la cola de análisis, o reevalúa si es ex-cartera.</span></div><div class="em-grow"><span class="em-gt">📓 Post-mortem</span><span class="em-gd">Descartada; registra el aprendizaje en Mis Decisiones.</span></div></div></details>';
}

/* ---------- interacción ---------- */
function _emBind(sec){
  if(sec._emBound)return; sec._emBound=true;
  sec.addEventListener('click',function(e){
    var ca=e.target.closest('[data-emcollapseall]'); if(ca){ window._emExp={}; renderEmbudo(); return; }
    if(e.target.closest('a.em-doss')){ return; } /* enlace al dossier: dejar navegar (nueva pestaña) */
    var cz=e.target.closest('[data-emcierres]'); if(cz){ e.preventDefault(); _emCierresDescargar(cz.getAttribute('data-emcierres')); return; }
    var esm=e.target.closest('[data-emsem]'); if(esm){ e.preventDefault(); _emSemPop(esm.getAttribute('data-emsem')); return; }
    var edv=e.target.closest('[data-emdiv]'); if(edv){ var dt=_emUp(edv.getAttribute('data-emdiv')); window._emDivOpen=window._emDivOpen||{}; window._emDivOpen[dt]=!window._emDivOpen[dt]; renderEmbudo(); return; }
    var evg=e.target.closest('[data-emvig]'); if(evg){ var vt=_emUp(evg.getAttribute('data-emvig')); window._emVigOpen=window._emVigOpen||{}; window._emVigOpen[vt]=!window._emVigOpen[vt]; renderEmbudo(); return; }
    var ep=e.target.closest('[data-emplan]'); if(ep){ e.preventDefault(); _emToPlan(ep.getAttribute('data-emplan')); return; }
    var ec=e.target.closest('[data-emcaja]'); if(ec){ e.preventDefault(); _emToCaja(ec.getAttribute('data-emcaja')); return; }
    var w=e.target.closest('[data-emwhy]'); if(w){ var wt=_emUp(w.getAttribute('data-emwhy')); window._emWhy=window._emWhy||{}; window._emWhy[wt]=!window._emWhy[wt]; renderEmbudo(); return; }
    var re=e.target.closest('[data-emrevedit]'); if(re){ var rt=_emUp(re.getAttribute('data-emrevedit')); var a=_emAna(rt); if(a){ var cur=proxRevDe(rt)||''; var v=prompt('Próxima revisión de '+rt+' (AAAA-MM-DD).\nVacío = automático (dossier + 12 meses).', cur); if(v!==null){ v=(v||'').trim(); if(v)a.proxRev=v; else delete a.proxRev; if(typeof scheduleSave==='function')scheduleSave(); renderEmbudo(); } } return; }
    var f=e.target.closest('[data-ficha]'); if(f){ var tk=f.getAttribute('data-ficha'); if(typeof abrirFicha==='function'){abrirFicha(tk);return;} if(typeof renderFicha==='function'){location.hash='ficha='+tk;} return; }
    var tg=e.target.closest('[data-emtoggle]'); if(tg){ var tt=_emUp(tg.getAttribute('data-emtoggle')); window._emExp=window._emExp||{}; window._emExp[tt]=!window._emExp[tt]; renderEmbudo(); return; }
    var dn=e.target.closest('[data-dnuevo]'); if(dn){ var dp=(dn.getAttribute('data-dnuevo')||'').split('|'); if(typeof diarioNuevo==='function')diarioNuevo(dp[0],dp[1]||''); return; }
    var g=e.target.closest('[data-goto]'); if(g){ var goto=g.dataset.goto; if(g.dataset.sig&&typeof showProtocolo==='function'){ showProtocolo(g.dataset.sig,goto,g.dataset.ticker||''); return; } if(typeof activarVista==='function')activarVista(goto); if(g.getAttribute('data-comprar')){ setTimeout(function(){ var b=document.getElementById('invAddBtn'); if(b)b.click(); var f=document.getElementById('invForm'); if(f)f.scrollIntoView({behavior:'smooth',block:'start'}); },90); } return; }
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
    '.em-tk{font-weight:800;font-size:14px;color:#0f172a;cursor:pointer;text-decoration:none;border-bottom:1.5px dotted #94a3b8}',
    '.em-tk:hover{color:#2563eb;border-bottom-color:#2563eb}',
    '.em-doss{font-size:13px;text-decoration:none;margin-left:5px;opacity:.85}.em-doss:hover{opacity:1}',
    '.em-pot{display:inline-block;font-size:10px;font-weight:800;color:#166534;background:#dcfce7;border:1px solid #bbf7d0;border-radius:20px;padding:0 6px;margin-left:3px}',
    '.em-pot.neg{color:#991b1b;background:#fee2e2;border-color:#fecaca}',
    '.em-sem{display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:5px 9px;margin:0 0 7px;cursor:pointer;font-size:12px}',
    '.em-sem .d{width:11px;height:11px;border-radius:50%;flex:none}.em-sem b{margin-left:3px}.em-sem .i{margin-left:auto;font-size:10px;color:#2563eb;font-weight:700}',
    '.em-divbtn,.em-vigbtn{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;border-radius:8px;padding:4px 9px;cursor:pointer;margin:0 0 7px}',
    '.em-divbtn{color:#0369a1;background:#eff6ff;border:1px solid #bfdbfe}',
    '.em-vigbtn{color:#3730a3;background:#eef2ff;border:1px solid #c7d2fe}',
    '.em-divbtn .arw,.em-vigbtn .arw{margin-left:2px;font-size:9px}',
    '.em-divwrap{margin:0 0 8px;padding:7px 9px;background:#fbfdff;border:1px solid #eef2f7;border-radius:8px}',
    '.em-vig{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}',
    '.em-vig-c{background:#fff;border:1px solid #eef2f7;border-radius:8px;padding:6px 8px}',
    '.em-vig-c .h{font-size:10px;font-weight:800;margin-bottom:3px}',
    '.em-vig-c ul{margin:0;padding-left:14px;font-size:10.5px;color:#475569;line-height:1.45}',
    '.em-modal-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}',
    '.em-modal{background:#fff;border-radius:14px;width:min(380px,94vw);box-shadow:0 20px 50px rgba(0,0,0,.3);overflow:hidden}',
    '.em-modal-h{color:#fff;font-weight:800;font-size:14px;padding:12px 16px}',
    '.em-modal-b{padding:10px 16px}',
    '.em-modal-f{font-size:11.5px;color:#334155;border-top:1px solid #f1f5f9;padding-top:8px;margin-top:4px;line-height:1.5}',
    '.em-modal-x{padding:10px 16px 14px;text-align:right}',
    '.em-nm{font-size:11px;color:#64748b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.em-et{display:inline-block;font-size:10px;font-weight:700;border-radius:20px;padding:1px 8px;background:#eef2f8;color:#1f3d6b;margin-bottom:5px}',
    '.em-etr{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:5px}',
    '.em-etr .em-et{margin-bottom:0}',
    '.em-zone{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:800;border-radius:20px;padding:1px 8px;text-transform:uppercase;letter-spacing:.02em}',
    '.em-zone.z-in{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}',
    '.em-zone.z-near{background:#fef3c7;color:#92400e;border:1px solid #fde68a}',
    '.em-pinb{display:inline-block;font-size:9.5px;font-weight:700;border-radius:20px;padding:1px 7px;background:#fef3c7;color:#92400e;margin-bottom:5px}',
    '.em-exb{display:inline-block;font-size:9.5px;font-weight:700;border-radius:20px;padding:1px 7px;background:#e0e7ff;color:#3730a3;margin-bottom:5px}',
    '.em-metric{font-size:11.5px;color:#475569;margin-bottom:6px}',
    '.em-pbar{margin:2px 0 8px;padding:6px 8px 2px;background:#fbfdff;border:1px solid #eef2f7;border-radius:8px}',
    '.em-caja{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:2px 0 14px}',
    '.em-cajac{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 13px;box-shadow:0 1px 2px rgba(15,23,42,.04)}',
    '.em-cajac.hero{background:linear-gradient(135deg,#0e3a5f,#2563eb);border:none;color:#fff}',
    '.em-cajac .l{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.03em}',
    '.em-cajac.hero .l,.em-cajac.hero .p{color:#c7ddff}',
    '.em-cajac .v{font-size:20px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}',
    '.em-cajac .v.pos{color:#16a34a}.em-cajac .v.neg{color:#dc2626}.em-cajac.hero .v{color:#fff}',
    '.em-cajac .p{font-size:10px;color:#64748b;margin-top:2px}',
    '@media(max-width:700px){.em-caja{grid-template-columns:1fr}}',
    '.em-idx{display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:2px 8px;font-size:10.5px;color:#334155;margin:0 0 7px}',
    '.em-idx b{font-size:12px;color:#0f172a}',
    '.em-idx .bar{position:relative;display:inline-block;width:40px;height:6px;background:#e2e8f0;border-radius:4px;overflow:hidden}',
    '.em-idx .bar i{position:absolute;left:0;top:0;height:6px;border-radius:4px;background:linear-gradient(90deg,#2563eb,#16a34a)}',
    '.em-idx .q{font-weight:700}',
    '.em-dist{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:800;border-radius:20px;padding:1px 7px}',
    '.em-dist.d-near{background:#fef3c7;color:#92400e;border:1px solid #fde68a}',
    '.em-dist.d-mid{background:#eef2f8;color:#475569;border:1px solid #e2e8f0}',
    '.em-dist.d-far{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}',
    '.em-sort{font-size:9px;color:#94a3b8;font-weight:600;text-transform:none;letter-spacing:0}',
    '.em-dim{display:grid;grid-template-columns:1fr 1fr;gap:5px 6px;margin-bottom:7px}',
    '.em-dc{background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;padding:4px 7px}',
    '.em-dc span{display:block;font-size:8.5px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.03em}',
    '.em-dc b{font-size:12px;color:#0f172a;font-variant-numeric:tabular-nums}',
    '.em-dbtns{display:flex;gap:6px;margin-bottom:6px}',
    '.em-dbtns .btn{flex:1;text-align:center}',
    '.em-cierres{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:#3730a3;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:4px 8px;cursor:pointer;margin-bottom:6px}',
    '.em-cierres:hover{background:#e0e7ff}',
    '.em-cierresrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}',
    '.em-cierresrow .em-cierres{margin-bottom:0}',
    '.em-cierrefx{font-size:10px;color:#64748b;font-weight:700;white-space:nowrap}',
    '.em-glos{margin-top:18px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}',
    '.em-glos>summary{cursor:pointer;list-style:none;padding:11px 12px;font-weight:800;font-size:13px;color:#1f3d6b}',
    '.em-glos>summary::-webkit-details-marker{display:none}',
    '.em-glos>summary .arw{display:inline-block;transition:transform .15s;margin-right:6px;color:#94a3b8}',
    '.em-glos[open]>summary .arw{transform:rotate(90deg)}',
    '.em-glos-b{padding:4px 14px 14px}',
    '.em-gsec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:12px 0 6px;border-bottom:1px solid #eef2f7;padding-bottom:3px}',
    '.em-grow{display:flex;gap:10px;padding:4px 0;font-size:12px;align-items:baseline}',
    '.em-gt{flex:none;width:200px;font-weight:700;color:#0f172a}',
    '.em-gd{flex:1;color:#475569;line-height:1.4}',
    '@media(max-width:560px){.em-grow{flex-direction:column;gap:1px}.em-gt{width:auto}}',
    '.em-head{cursor:pointer}',
    '.em-caret{color:#94a3b8;font-size:10px;flex:none;margin-left:2px}',
    '.em-collapsed{padding-bottom:9px}',
    '.em-collapse-all{position:fixed;right:18px;bottom:110px;z-index:900;background:#1f3d6b;color:#fff;border:none;border-radius:22px;padding:10px 15px;font-size:12.5px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer}',
    '.em-collapse-all:hover{background:#16305a}',
    '@media(max-width:560px){.em-collapse-all{bottom:calc(env(safe-area-inset-bottom,0px) + 150px)}}',
    '.em-cmodal-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:9999}',
    '.em-cmodal{background:#fff;border-radius:14px;width:min(380px,92vw);box-shadow:0 20px 50px rgba(0,0,0,.3);overflow:hidden}',
    '.em-cmodal-h{background:#1f3d6b;color:#fff;font-weight:800;font-size:14px;padding:12px 16px}',
    '.em-cmodal-b{padding:14px 16px}',
    '.em-cmodal-b label{display:block;font-size:12px;color:#475569;font-weight:600;margin-bottom:5px}',
    '.em-cmodal-b input{width:100%;font-size:15px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;box-sizing:border-box}',
    '.em-cmodal-hint{font-size:11px;color:#64748b;margin-top:8px;line-height:1.4}',
    '.em-cmodal-msg{font-size:12px;color:#dc2626;margin-top:8px;min-height:14px}',
    '.em-cmodal-f{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px 14px}',
    '.em-revedit{cursor:pointer;opacity:.55;font-size:10px}',
    '.em-divrisk{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:8px 12px;font-size:12px;color:#0c4a6e;margin-bottom:12px}',
    '.em-why-t{font-size:11px;color:#2563eb;cursor:pointer;margin:2px 0 4px;font-weight:600}',
    '.em-why{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:11.5px;color:#334155;margin-bottom:6px;line-height:1.5}',
    '.em-why div{margin:2px 0}.em-why b{color:#1f3d6b}.em-why-link{color:#2563eb;cursor:pointer;text-decoration:underline}',
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
