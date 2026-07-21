/* ============================================================================
   23-diario.js — M3 · Diario de decisiones (bitácora del método).
   Registra POR QUÉ decides cada compra/venta/mantener en el momento (3 frases)
   + un contexto capturado solo (precio, Score, rating, PO, RPD, peso). Cada
   entrada calcula "desde entonces ±%" y un veredicto; cierra el bucle con la
   Calibración. Dato nuevo: DB.diario. Editado con script (no Edit/Write).
   ============================================================================ */

function _diUp(x){ return (x==null?'':(''+x)).toUpperCase(); }
function _diNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _diEsc(x){ return (typeof _radEsc==='function')?_radEsc(x):(''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _diEur(x){ x=_diNum(x); if(typeof fmt==='function')return fmt(x); return Math.round(x)+' €'; }
function _diHoy(){ return new Date().toISOString().slice(0,10); }
function _diAna(t){ t=_diUp(t); return (DB.analisis||[]).find(function(a){return _diUp(a.ticker)===t;})||null; }
function _diNombre(t){ t=_diUp(t); var v=(DB.valores||{})[t]||{}; if(v.nombre)return v.nombre; var a=_diAna(t); if(a&&a.nombre)return a.nombre; if(typeof _uniInfo==='function'){var u=_uniInfo(t); if(u&&u.nombre)return u.nombre;} return t; }
function _diPrecio(t){ t=_diUp(t); var v=(DB.valores||{})[t]||{}; var p=_diNum(v.precioActual); if(p>0)return p; var a=_diAna(t); return a?_diNum(a.cotizacion):0; }
function _diScore(t){ var a=_diAna(t); return (a&&typeof cmpScore==='function')?cmpScore(a):null; }
function _diRPD(t){ var p=_diPrecio(t); var a=_diAna(t); var d=a?_diNum(a.divAccion):0; if(!(d>0)){ d=_diNum(((DB.valores||{})[_diUp(t)]||{}).divAccion); } return (p>0&&d>0)?(d/p*100):null; }
function _diPeso(t){ t=_diUp(t); if(typeof invPositions!=='function')return 0; try{ var ps=invPositions(),tot=0,mine=0; ps.forEach(function(p){ var val=_diNum(p.acciones)*_diNum(p.precioActual); tot+=val; if(_diUp(p.ticker)===t)mine+=val; }); return tot>0?mine/tot*100:0; }catch(e){ return 0; } }
/* dividendo/acción cobrado desde una fecha (para el "desde entonces") */
function _diDivDesde(t,fecha){ t=_diUp(t); var arr=(DB.dividendos||{})[t]||[]; var s=0; arr.forEach(function(d){ if((d.fecha||'')>=(fecha||'')) s+=_diNum(d.importe); }); return s; }
function _diCtx(t){ var a=_diAna(t)||{}; return { score:_diScore(t), rating:a.rating||'', decision:a.decision||'', poMin:_diNum(a.poMin)||null, poMax:_diNum(a.poMax)||null, rpd:_diRPD(t), peso:_diPeso(t) }; }

var _DI_TIPOS=[
  {k:'Comprar',cls:'t-comprar',dir:'bull'},
  {k:'Ampliar',cls:'t-ampliar',dir:'bull'},
  {k:'Mantener',cls:'t-mantener',dir:'bull'},
  {k:'Reafirmar',cls:'t-reafirmar',dir:'bull'},
  {k:'Recortar',cls:'t-vender',dir:'bear'},
  {k:'Vender',cls:'t-vender',dir:'bear'},
  {k:'Descartar',cls:'t-descartar',dir:'flat'}
];
function _diTipoCfg(k){ for(var i=0;i<_DI_TIPOS.length;i++)if(_DI_TIPOS[i].k===k)return _DI_TIPOS[i]; return {k:k,cls:'t-mantener',dir:'bull'}; }

/* rentabilidad desde la decisión + veredicto */
function _diVer(e){
  var pAct=_diPrecio(e.ticker), p0=_diNum(e.precio);
  if(!(p0>0)) return {ret:null,acierto:null};
  var div=_diDivDesde(e.ticker,e.fecha);
  var ret=(pAct-p0+div)/p0;
  var dir=_diTipoCfg(e.tipo).dir, acierto=null;
  if(e.estado==='cerrada'){
    if(dir==='bull') acierto=ret>0;
    else if(dir==='bear') acierto=ret<0;
    else acierto=ret<=0.05; /* Descartar: acierto si no se escapó (>5%) */
  }
  return {ret:ret,acierto:acierto,dir:dir};
}

function renderDiario(){
  var sec=document.getElementById('view-diario'); if(!sec)return;
  DB.diario=DB.diario||[];
  window._diFilt=window._diFilt||{tipo:'',estado:''};
  var F=window._diFilt;

  var arr=DB.diario.slice().sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });
  var vis=arr.filter(function(e){ if(F.tipo&&e.tipo!==F.tipo)return false; if(F.estado&&(e.estado||'abierta')!==F.estado)return false; return true; });

  var nTot=arr.length, nAb=arr.filter(function(e){return (e.estado||'abierta')==='abierta';}).length;
  var cerr=arr.filter(function(e){return e.estado==='cerrada';});
  var ac=cerr.filter(function(e){return _diVer(e).acierto===true;}).length;
  var pctAc=cerr.length?Math.round(ac/cerr.length*100)+'%':'—';
  /* invalidaciones activas = entradas abiertas con texto de invalidación */
  var nInval=arr.filter(function(e){return (e.estado||'abierta')==='abierta'&&(e.invalidacion||'').trim();}).length;

  var H='<div class="di-wrap">';
  H+='<h2>Mis Decisiones</h2>';
  H+='<div class="sub" style="margin-bottom:12px">Anota <b>por qué</b> decides cada cosa en el momento. La <b>Calibración</b> compara luego contra tu criterio escrito, no contra tu memoria. Lo que escribes: por qué · qué esperas · qué te haría cambiar de idea.</div>';

  H+='<div class="di-stats">'+
    _diKpi(nTot,'Decisiones')+_diKpi(nAb,'Abiertas')+_diKpi(pctAc,'Aciertos (cerradas)')+_diKpi(nInval,'Invalidaciones activas')+
    '</div>';

  H+='<div class="di-bar"><button class="di-new" id="diNewBtn">+ Nueva decisión</button>'+
     '<div class="di-filters">'+_diChip('','tipo','Todas',F)+_DI_TIPOS.map(function(t){return _diChip(t.k,'tipo',t.k,F);}).join('')+
     _diChip('abierta','estado','Abiertas',F)+_diChip('cerrada','estado','Cerradas',F)+'</div></div>';

  H+='<div id="diFormHost"></div>';

  if(!vis.length){ H+='<div class="di-empty">Sin decisiones'+(nTot?' con este filtro':' todavía')+'. Pulsa «+ Nueva decisión» para registrar la primera.</div>'; }
  else { H+=vis.map(_diCard).join(''); }

  H+='<div class="muted" style="font-size:11px;margin-top:10px;line-height:1.5">«Desde entonces» = precio actual − precio de la decisión + dividendos cobrados, sobre el precio de la decisión. El <b>veredicto</b> (✓/✗) aparece al marcar la decisión como <b>cerrada</b>.</div>';
  H+='</div>';
  sec.innerHTML=H;

  /* si hay semilla (desde el Kanban), abre el formulario prellenado */
  if(window._diSeed){ var sd=window._diSeed; window._diSeed=null; _diOpenForm(sd.ticker,sd.tipo,sd); }
  _diBind(sec);
}
function _diKpi(n,l){ return '<div class="di-st"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'; }
function _diChip(val,grp,lab,F){ var on=(F[grp]===val); return '<span class="di-chip'+(on?' on':'')+'" data-difilt="'+grp+'|'+_diEsc(val)+'">'+_diEsc(lab)+'</span>'; }

function _diCard(e){
  var cfg=_diTipoCfg(e.tipo), v=_diVer(e);
  var ctx=e.ctx||{};
  var chips=[];
  if(ctx.score!=null)chips.push('Score '+Math.round(ctx.score));
  if(ctx.rating)chips.push('rating '+ctx.rating);
  if(ctx.poMin||ctx.poMax)chips.push('PO '+(ctx.poMin?ctx.poMin:'')+(ctx.poMin&&ctx.poMax?'/':'')+(ctx.poMax?ctx.poMax:''));
  if(ctx.rpd!=null)chips.push('RPD '+ctx.rpd.toFixed(1)+'%');
  if(ctx.peso)chips.push('peso '+ctx.peso.toFixed(1)+'%');
  var retTxt='', verChip='';
  if(v.ret!=null){ var col=v.ret>=0?'#16a34a':'#dc2626'; if(cfg.dir==='bear')col=v.ret<0?'#16a34a':'#dc2626';
    retTxt='Desde entonces: <span class="di-ret" style="color:'+col+'">'+(v.ret>=0?'+':'')+(v.ret*100).toFixed(1)+'%</span>'+(cfg.dir==='bear'?' (evitado)':''); }
  if((e.estado||'abierta')==='abierta'){ verChip='<span class="di-open">● abierta</span>'; }
  else { verChip=v.acierto===true?'<span class="di-ok">✓ acierto</span>':(v.acierto===false?'<span class="di-bad">✗ revisar criterio</span>':''); }

  return '<div class="di-card" style="border-left-color:'+_diColTipo(cfg)+'">'+
    '<div class="di-ch"><span class="di-tk" data-ficha="'+_diEsc(e.ticker)+'">'+_diEsc(e.ticker)+'</span><span class="di-nm">'+_diEsc(_diNombre(e.ticker).slice(0,20))+'</span>'+
      '<span class="di-tipo '+cfg.cls+'">'+_diEsc(e.tipo)+'</span>'+
      '<span class="di-when">'+_diEsc(e.fecha)+(e.precio?(' · '+_diEur(e.precio)):'')+(e.importe?(' · '+_diEur(e.importe)):'')+'</span></div>'+
    (e.porque?'<div class="di-line"><b class="k">Por qué:</b> '+_diEsc(e.porque)+'</div>':'')+
    (e.catalizador?'<div class="di-line"><b class="k">Espero:</b> '+_diEsc(e.catalizador)+'</div>':'')+
    (e.invalidacion?'<div class="di-inv"><b>Cambiaría de idea si…</b> '+_diEsc(e.invalidacion)+'</div>':'')+
    (chips.length?'<div class="di-ctxrow">'+chips.map(function(c){return '<span class="di-cx">'+_diEsc(c)+'</span>';}).join('')+'</div>':'')+
    '<div class="di-foot">'+(retTxt||'<span class="muted" style="font-size:12px">Sin precio de referencia</span>')+verChip+
      '<span class="di-acts">'+((e.estado||'abierta')==='abierta'?'<button class="btn ghost sm" data-diclose="'+e.id+'">Marcar cerrada</button>':'<button class="btn ghost sm" data-diopen="'+e.id+'">Reabrir</button>')+
      '<button class="btn ghost sm" data-didel="'+e.id+'" title="Eliminar">✕</button></span></div>'+
    '</div>';
}
function _diColTipo(cfg){ return {'t-comprar':'#16a34a','t-ampliar':'#22c55e','t-mantener':'#2563eb','t-reafirmar':'#0d9488','t-vender':'#dc2626','t-descartar':'#64748b'}[cfg.cls]||'#1f3d6b'; }

/* ---------- formulario ---------- */
function diarioNuevo(ticker,tipo,opts){ window._diSeed=Object.assign({ticker:_diUp(ticker||''),tipo:tipo||''},opts||{}); if(typeof activarVista==='function')activarVista('diario'); else if(typeof renderDiario==='function')renderDiario(); }
/* M3 fase2 · enganche del Protocolo: al registrar/resolver un apunte S1–S6 con decisión,
   ofrece anotar la decisión en el Diario (tipo mapeado, porqué = motivo del apunte). */
function _diTipoProto(dec){ var d=_diUp(dec);
  if(d.indexOf('PTE')>=0||d.indexOf('REVIS')>=0) return null;
  if(d.indexOf('VENDER')>=0) return 'Vender';
  if(d.indexOf('RECORTAR')>=0) return 'Recortar';
  if(d.indexOf('SIN CAMBIOS')>=0) return 'Reafirmar';
  if(d.indexOf('MANTENER')>=0) return 'Mantener';
  return 'Mantener'; }
function diarioDesdeProtocolo(t,decision,precio,fecha,motivo){
  t=_diUp(t); if(!t)return; var tipo=_diTipoProto(decision); if(!tipo)return;
  try{ if(confirm('Apunte del Protocolo registrado. ¿Anotar la decisión en Mis Decisiones?')){ diarioNuevo(t,tipo,{precio:_diNum(precio),fecha:fecha||_diHoy(),porque:motivo||''}); } }catch(e){}
}
/* Oferta al registrar una operación reciente en Cartera (compra/venta). No molesta al
   rellenar histórico: solo salta si la operación es de hace ≤21 días. */
function diarioOfrecerOp(ticker,tipoOp,precio,acciones,fecha){
  ticker=_diUp(ticker||''); if(!ticker)return;
  var f=fecha||_diHoy(); var dd=(Date.now()-new Date(f+'T00:00:00').getTime())/86400000;
  if(isNaN(dd)||dd>21||dd< -2)return;
  try{
    if(tipoOp!=='venta' && typeof checklistPreCompra==='function'){ checklistPreCompra(ticker,_diNum(precio),tipoOp,acciones,f); return; }
    if(confirm('Operación registrada. ¿Anotar el porqué en Mis Decisiones?')){ diarioNuevo(ticker,(tipoOp==='venta'?'Vender':'Comprar'),{precio:_diNum(precio),importe:_diNum(precio)*_diNum(acciones),fecha:f}); }
  }catch(e){}
}
/* P2 · Checklist pre-compra (puerta blanda): al registrar una compra evalúa el método y
   marca en rojo lo que se sale (p.ej. fuera de precio de entrada). No bloquea; lleva al Diario. */
function _diChkCfg(){ DB.config=DB.config||{}; var v=DB.config.checklistMinRating; return {minRating:(v!=null?_diNum(v):78)}; }
function _diChkEval(t,precio){
  t=_diUp(t); var a=_diAna(t)||{}; var res=[];
  var eM=_diNum(a.entMax), dec=_diUp(a.decision), stop=_diNum(a.stopTesis), rating=(a.rating||'').toUpperCase();
  var mm=(typeof mesesDesde==='function')?mesesDesde(a.dossierFecha):null;
  if(!a.dossierFecha && !(typeof _esAnalizada==='function'&&_esAnalizada(t))) res.push({lvl:2,txt:'Sin dossier — no analizada'});
  else if(mm!=null&&mm>12) res.push({lvl:2,txt:'Dossier caducado (hace '+mm+' meses)'});
  else res.push({lvl:0,txt:'Dossier vigente'+(mm!=null?' ('+mm+'m)':'')});
  var rs=(typeof radRatingScore==='function')?(radRatingScore(rating)||0):0; var minR=_diChkCfg().minRating;
  if(!rating) res.push({lvl:1,txt:'Rating sin definir'});
  else if(rs>=minR) res.push({lvl:0,txt:'Rating '+rating+' (>= umbral)'});
  else res.push({lvl:2,txt:'Rating '+rating+' por debajo de tu umbral'});
  if(precio>0&&eM>0){ var over=(precio/eM-1)*100;
    if(precio<=eM) res.push({lvl:0,txt:'En zona: '+_diEur(precio)+' <= entrada '+_diEur(eM)});
    else if(precio<=eM*1.05) res.push({lvl:1,txt:'Cerca: '+_diEur(precio)+' (+'+over.toFixed(0)+'% de la entrada)'});
    else res.push({lvl:2,txt:'FUERA de zona: '+_diEur(precio)+' (+'+over.toFixed(0)+'% sobre tu entrada '+_diEur(eM)+')'});
  } else res.push({lvl:1,txt:'Sin banda de entrada definida'});
  if(stop>0) res.push({lvl:0,txt:'Stop de tesis definido ('+_diEur(stop)+')'});
  else res.push({lvl:2,txt:'Sin stop de tesis definido'});
  if(dec==='COMPRAR') res.push({lvl:0,txt:'Decision: COMPRAR'});
  else if(dec) res.push({lvl:1,txt:'Decision: '+dec+' (no es COMPRAR)'});
  else res.push({lvl:1,txt:'Sin decision registrada'});
  return res;
}
function checklistPreCompra(t,precio,tipoOp,acciones,fecha){
  t=_diUp(t); if(!t||typeof document==='undefined')return;
  var res=_diChkEval(t,precio); var COL=['#16a34a','#d97706','#dc2626'], IC=['✓','!','✗'];
  var rows=res.map(function(r){ return '<div class="di-chk-row"><span class="di-chk-ic" style="color:'+COL[r.lvl]+'">'+IC[r.lvl]+'</span><span>'+_diEsc(r.txt)+'</span></div>'; }).join('');
  var nRed=res.filter(function(r){return r.lvl===2;}).length;
  var head=nRed?('⚠️ '+nRed+' punto'+(nRed>1?'s':'')+' fuera de tu metodo'):'✓ La compra cumple tu metodo';
  var hc=nRed?'#dc2626':'#16a34a';
  var ov=document.createElement('div'); ov.className='di-chk-ov';
  ov.innerHTML='<div class="di-chk-box"><div class="di-chk-h" style="color:'+hc+'">'+head+'</div>'+
    '<div class="di-chk-sub">'+_diEsc(t)+' · '+_diEsc(_diNombre(t).slice(0,26))+' · compra a '+_diEur(precio)+'</div>'+
    '<div class="di-chk-list">'+rows+'</div>'+
    '<div class="di-chk-note">Puerta blanda: no bloquea la compra; anota el porque para dejar constancia.</div>'+
    '<div class="di-chk-acts"><button class="di-chk-anota" data-chkanota="1">📓 Anotar en Mis Decisiones</button><button class="di-chk-close" data-chkclose="1">Cerrar</button></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){
    if(e.target===ov||e.target.closest('[data-chkclose]')){ ov.remove(); return; }
    if(e.target.closest('[data-chkanota]')){ ov.remove(); diarioNuevo(t,(tipoOp==='venta'?'Vender':'Comprar'),{precio:_diNum(precio),importe:_diNum(precio)*_diNum(acciones),fecha:fecha||_diHoy()}); return; }
  });
}
function _diTickers(){ var s={}; (DB.analisis||[]).forEach(function(a){ var t=_diUp(a.ticker); if(t)s[t]=1; }); Object.keys(DB.universo||{}).forEach(function(t){ s[_diUp(t)]=1; }); if(typeof heldTickerSet==='function')heldTickerSet().forEach(function(t){ s[_diUp(t)]=1; }); return Object.keys(s).sort(); }
function _diOpenForm(ticker,tipo,seed){
  var host=document.getElementById('diFormHost'); if(!host)return;
  ticker=_diUp(ticker||''); tipo=tipo||''; seed=seed||{};
  var opts='<option value="">— elige empresa —</option>'+_diTickers().map(function(t){ return '<option value="'+t+'"'+(t===ticker?' selected':'')+'>'+t+' · '+_diEsc(_diNombre(t).slice(0,22))+'</option>'; }).join('');
  var segs=_DI_TIPOS.map(function(t){ return '<span data-ditipo="'+t.k+'"'+(t.k===tipo?' class="sel"':'')+'>'+t.k+'</span>'; }).join('');
  host.innerHTML='<div class="di-form"><h4>Nueva decisión</h4><div class="di-grid">'+
    '<div class="di-fld"><label>Empresa</label><select class="inp" id="diEmp">'+opts+'</select></div>'+
    '<div class="di-fld"><label>Tipo</label><div class="di-seg" id="diSeg">'+segs+'</div></div>'+
    '<div class="di-fld"><label>Fecha</label><input class="inp" type="date" id="diFecha" value="'+(seed.fecha||_diHoy())+'"></div>'+
    '<div class="di-fld"><label>Precio · importe (€)</label><div style="display:flex;gap:6px"><input class="inp" type="number" step="0.01" id="diPrecio" placeholder="precio" style="flex:1"><input class="inp" type="number" step="1" id="diImporte" placeholder="importe" style="flex:1"></div></div>'+
    '<div class="di-fld" style="grid-column:1/-1"><label>Por qué (la tesis en una frase)</label><textarea class="inp" id="diPorque" rows="2" placeholder="Por qué tomo esta decisión…"></textarea></div>'+
    '<div class="di-fld" style="grid-column:1/-1"><label>Espero (catalizador)</label><textarea class="inp" id="diCat" rows="2" placeholder="Qué espero que pase…"></textarea></div>'+
    '<div class="di-fld di-inval" style="grid-column:1/-1"><label>Cambiaría de idea si… (invalidación)</label><textarea class="inp" id="diInval" rows="2" placeholder="Qué me haría replantearme la decisión…" style="background:transparent;border-color:#fed7aa"></textarea></div>'+
    '<div class="di-ctx" id="diCtxPrev">Elige empresa para capturar el contexto (Score, rating, PO, RPD, peso).</div>'+
    '</div><div class="di-actions"><button class="di-save" id="diSave">Guardar decisión</button><button class="di-cancel" id="diCancel">Cancelar</button></div></div>';
  if(ticker){ var pe=document.getElementById('diPrecio'); if(pe)pe.value=((seed.precio||_diPrecio(ticker))||'').toString();
    if(seed.importe){ var ie=document.getElementById('diImporte'); if(ie)ie.value=Math.round(seed.importe); }
    if(seed.porque){ var _pq=document.getElementById('diPorque'); if(_pq)_pq.value=seed.porque; }
    _diCtxPrev(ticker); }
  var f=host.querySelector('.di-form'); if(f)f.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function _diCtxPrev(t){ var el=document.getElementById('diCtxPrev'); if(!el)return; if(!t){ el.textContent='Elige empresa para capturar el contexto.'; return; } var c=_diCtx(t);
  var bits=[]; if(c.score!=null)bits.push('Score '+Math.round(c.score)); if(c.rating)bits.push('rating '+c.rating); if(c.decision)bits.push(c.decision); if(c.poMin||c.poMax)bits.push('PO '+(c.poMin||'')+(c.poMin&&c.poMax?'/':'')+(c.poMax||'')); if(c.rpd!=null)bits.push('RPD '+c.rpd.toFixed(1)+'%'); bits.push('peso '+(c.peso||0).toFixed(1)+'%');
  el.innerHTML='<b>Contexto capturado ahora:</b> '+bits.join(' · '); }

function _diBind(sec){
  if(sec._diBound)return; sec._diBound=true;
  sec.addEventListener('click',function(e){
    var nb=e.target.closest('#diNewBtn'); if(nb){ _diOpenForm('',''); return; }
    var cx=e.target.closest('#diCancel'); if(cx){ var h=document.getElementById('diFormHost'); if(h)h.innerHTML=''; return; }
    var sg=e.target.closest('[data-ditipo]'); if(sg){ var seg=document.getElementById('diSeg'); if(seg){ [].forEach.call(seg.children,function(c){c.classList.remove('sel');}); sg.classList.add('sel'); } return; }
    var sv=e.target.closest('#diSave'); if(sv){ _diGuardar(); return; }
    var fc=e.target.closest('[data-difilt]'); if(fc){ var a=(fc.getAttribute('data-difilt')||'').split('|'); window._diFilt[a[0]]=(window._diFilt[a[0]]===a[1]?'':a[1]); renderDiario(); return; }
    var cl=e.target.closest('[data-diclose]'); if(cl){ _diSetEstado(cl.getAttribute('data-diclose'),'cerrada'); return; }
    var op=e.target.closest('[data-diopen]'); if(op){ _diSetEstado(op.getAttribute('data-diopen'),'abierta'); return; }
    var dl=e.target.closest('[data-didel]'); if(dl){ if(confirm('¿Eliminar esta entrada de Mis Decisiones?')){ DB.diario=(DB.diario||[]).filter(function(x){return x.id!==dl.getAttribute('data-didel');}); _diSave(); renderDiario(); } return; }
    var fi=e.target.closest('[data-ficha]'); if(fi){ var t=fi.getAttribute('data-ficha'); if(typeof abrirFicha==='function')abrirFicha(t); else location.hash='ficha='+t; return; }
  });
  sec.addEventListener('change',function(e){ var em=e.target.closest('#diEmp'); if(em){ var t=_diUp(em.value); var pe=document.getElementById('diPrecio'); if(pe&&t)pe.value=(_diPrecio(t)||'').toString(); _diCtxPrev(t); } });
}
function _diSetEstado(id,est){ var e=(DB.diario||[]).find(function(x){return x.id===id;}); if(e){ e.estado=est; _diSave(); renderDiario(); } }
function _diSave(){ if(typeof scheduleSave==='function')scheduleSave(); else if(typeof saveNow==='function')saveNow(); }
function _diGuardar(){
  var t=_diUp((document.getElementById('diEmp')||{}).value||'');
  var seg=document.getElementById('diSeg'); var tipo=''; if(seg){ var s=seg.querySelector('.sel'); if(s)tipo=s.getAttribute('data-ditipo'); }
  if(!t){ alert('Elige una empresa.'); return; }
  if(!tipo){ alert('Elige el tipo de decisión.'); return; }
  var e={ id:'d'+Math.random().toString(36).slice(2,9),
    fecha:(document.getElementById('diFecha')||{}).value||_diHoy(),
    ticker:t, tipo:tipo,
    precio:_diNum((document.getElementById('diPrecio')||{}).value)|| _diPrecio(t),
    importe:_diNum((document.getElementById('diImporte')||{}).value)||0,
    porque:((document.getElementById('diPorque')||{}).value||'').trim(),
    catalizador:((document.getElementById('diCat')||{}).value||'').trim(),
    invalidacion:((document.getElementById('diInval')||{}).value||'').trim(),
    ctx:_diCtx(t), estado:'abierta' };
  DB.diario=DB.diario||[]; DB.diario.push(e); _diSave();
  var h=document.getElementById('diFormHost'); if(h)h.innerHTML='';
  renderDiario();
}

/* ---------- estilos ---------- */
(function _diCSS(){
  if(typeof document==='undefined'||document.getElementById('di-css'))return;
  var s=document.createElement('style'); s.id='di-css';
  s.textContent=[
    '.di-stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}',
    '.di-st{flex:1;min-width:120px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 12px}',
    '.di-st .n{font-size:20px;font-weight:800;color:#1f3d6b;line-height:1.1}',
    '.di-st .l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.03em}',
    '.di-bar{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}',
    '.di-new{background:#1f3d6b;color:#fff;border:none;border-radius:9px;padding:8px 13px;font-weight:700;font-size:13px;cursor:pointer}',
    '.di-filters{display:flex;gap:5px;flex-wrap:wrap;margin-left:auto}',
    '.di-chip{font-size:11.5px;font-weight:700;border-radius:20px;padding:3px 10px;background:#fff;border:1px solid #e2e8f0;color:#475569;cursor:pointer}',
    '.di-chip.on{background:#eef2f8;border-color:#1f3d6b;color:#1f3d6b}',
    '.di-empty{background:#fff;border:1px dashed #e2e8f0;border-radius:12px;padding:22px;text-align:center;color:#94a3b8;font-size:13px}',
    '.di-form{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #1f3d6b;border-radius:12px;padding:14px;margin-bottom:16px}',
    '.di-form h4{margin:0 0 10px;font-size:14px;color:#1f3d6b}',
    '.di-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media(max-width:640px){.di-grid{grid-template-columns:1fr}}',
    '.di-fld{display:flex;flex-direction:column;gap:3px}',
    '.di-fld label{font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.02em}',
    '.di-fld .inp{border:1px solid #e2e8f0;border-radius:8px;padding:7px 9px;font-size:13px;background:#fff;color:#334155;font-family:inherit;width:100%}',
    '.di-seg{display:flex;gap:4px;flex-wrap:wrap}',
    '.di-seg span{font-size:11.5px;font-weight:700;border-radius:20px;padding:4px 10px;border:1px solid #e2e8f0;color:#475569;background:#fff;cursor:pointer}',
    '.di-seg span.sel{background:#1f3d6b;color:#fff;border-color:#1f3d6b}',
    '.di-inval label{color:#9a3412}',
    '.di-ctx{grid-column:1/-1;font-size:11.5px;color:#475569;background:#f1f5f9;border-radius:8px;padding:7px 10px}',
    '.di-actions{display:flex;gap:8px;margin-top:10px}',
    '.di-save{background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer}',
    '.di-cancel{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;font-size:13px;color:#475569;cursor:pointer}',
    '.di-card{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #1f3d6b;border-radius:12px;padding:12px 14px;margin-bottom:11px}',
    '.di-ch{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px}',
    '.di-tk{font-weight:800;font-size:15px;cursor:pointer;color:#0f172a}',
    '.di-nm{font-size:12px;color:#64748b}',
    '.di-tipo{font-size:10.5px;font-weight:800;color:#fff;border-radius:20px;padding:2px 9px;text-transform:uppercase;letter-spacing:.02em}',
    '.t-comprar{background:#16a34a}.t-vender{background:#dc2626}.t-mantener{background:#2563eb}.t-descartar{background:#64748b}.t-ampliar{background:#22c55e}.t-reafirmar{background:#0d9488}',
    '.di-when{font-size:11.5px;color:#64748b;margin-left:auto}',
    '.di-line{font-size:13px;margin:4px 0;color:#334155}.di-line b.k{color:#1f3d6b}',
    '.di-inv{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:6px 9px;font-size:12.5px;color:#9a3412;margin:6px 0}',
    '.di-ctxrow{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 6px}',
    '.di-cx{font-size:10.5px;font-weight:700;background:#eef2f8;color:#334155;border-radius:6px;padding:2px 7px}',
    '.di-foot{display:flex;align-items:center;gap:10px;border-top:1px dashed #e2e8f0;padding-top:8px;margin-top:8px;font-size:12.5px;flex-wrap:wrap}',
    '.di-ret{font-weight:800}',
    '.di-ok{background:#dcfce7;color:#166534;border-radius:20px;padding:1px 9px;font-size:11px;font-weight:700}',
    '.di-bad{background:#fee2e2;color:#991b1b;border-radius:20px;padding:1px 9px;font-size:11px;font-weight:700}',
    '.di-open{background:#e0f2fe;color:#075985;border-radius:20px;padding:1px 9px;font-size:11px;font-weight:700}',
    '.di-acts{margin-left:auto;display:flex;gap:4px}',
    '.di-chk-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px}',
    '.di-chk-box{background:#fff;border-radius:16px;max-width:440px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}',
    '.di-chk-h{font-size:16px;font-weight:800;margin-bottom:2px}',
    '.di-chk-sub{font-size:12px;color:#64748b;margin-bottom:12px}',
    '.di-chk-list{display:flex;flex-direction:column;gap:7px;margin-bottom:10px}',
    '.di-chk-row{font-size:13px;color:#334155;display:flex;align-items:flex-start;gap:8px}',
    '.di-chk-ic{font-weight:800;width:14px;text-align:center;flex:none}',
    '.di-chk-note{font-size:11px;color:#94a3b8;margin-bottom:12px}',
    '.di-chk-acts{display:flex;gap:8px;justify-content:flex-end}',
    '.di-chk-anota{background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer}',
    '.di-chk-close{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;font-size:13px;color:#475569;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(s);
})();
