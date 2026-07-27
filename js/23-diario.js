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

/* ════════════════════════════════════════════════════════════════════════════
   [B1 · 26-jul-2026] MOTOR DE INVALIDACIONES
   El campo «Cambiaría de idea si…» es el más valioso del sistema —es tu criterio escrito
   ANTES de saber el resultado— y hasta ahora no lo leía nadie: se guardaba, se contaba en un
   KPI y ahí moría. Una tesis podía romperse por completo (rating derrumbado, decisión cambiada
   a VENDER, trimestre en rojo, stop tocado) y la decisión seguía «abierta», intacta, sin que
   nada te lo pusiera delante.
   Ahora cada decisión ABIERTA se vigila por dos vías, según decidió Carlos:
     1) DERIVA AUTOMÁTICA — compara el contexto que la app capturó al decidir (`e.ctx`:
        Score, rating, decisión, PO, RPD, peso) contra el de hoy, más las señales vivas
        (stop, PO, semáforo trimestral, dossier caducado). Funciona con las decisiones que
        ya tienes escritas, sin teclear nada más.
     2) DISPARADORES EXPLÍCITOS — condiciones concretas que puedes añadir al anotar
        (`e.trigs`: precio, Score, rating, decisión, RPD, semáforo). Se evalúan literalmente.
   Lo que se rompe NO se cierra solo: se te enseña junto a lo que escribiste, y decides tú.
   Con «Sigo igual» se archiva ese estado (`e.ack`) y deja de gritar hasta que se rompa algo
   NUEVO — si no, el aviso se volvería ruido de fondo en una semana.
   ════════════════════════════════════════════════════════════════════════════ */

/* ---- disparadores explícitos: catálogo de campos y operadores ---- */
var _DI_CAMPOS=[
  {k:'precio',   lbl:'Precio',            tipo:'num', ops:['<=','>='], sufijo:'€'},
  {k:'score',    lbl:'Score',             tipo:'num', ops:['<=','>='], sufijo:'pts'},
  {k:'rating',   lbl:'Rating',            tipo:'rat', ops:['peor'],    sufijo:''},
  {k:'decision', lbl:'Decisión',          tipo:'dec', ops:['='],       sufijo:''},
  {k:'rpd',      lbl:'RPD',               tipo:'num', ops:['<=','>='], sufijo:'%'},
  {k:'semaforo', lbl:'Semáforo trimestral',tipo:'sem',ops:['='],       sufijo:''}
];
function _diCampoCfg(k){ for(var i=0;i<_DI_CAMPOS.length;i++)if(_DI_CAMPOS[i].k===k)return _DI_CAMPOS[i]; return null; }
var _DI_DECS=['COMPRAR','MANTENER','ESPERAR','VENDER'];
var _DI_SEMS=[['R','🔴 rojo'],['A','🟡 ámbar o peor']];

/* ---- lecturas de "hoy" ---- */
function _diRatingScore(r){ try{ return (typeof radRatingScore==='function')?radRatingScore(r):null; }catch(e){ return null; } }
/* último semáforo trimestral publicado (V/A/R) y si la tesis se declaró tocada, con su fecha */
/* [C5 · 27-jul-2026] Antes leía SOLO _trimCache, que únicamente se llena al abrir la Ficha de esa
   empresa: un trimestre en rojo no aparecía aquí hasta que la abrías. Ahora usa el lector único
   (13-radar.js), que mira las dos cachés; y renderDiario se encarga de que estén cargadas. */
function _diTrim(t){
  try{ if(typeof khTrimUltimo==='function') return khTrimUltimo(t); }catch(e){}
  t=_diUp(t);
  var d=null; try{ d=(typeof _trimCache!=='undefined'&&_trimCache)?_trimCache[t]:null; }catch(e){}
  if(!d||!d.revisiones||!d.revisiones.length) return null;
  var revs=d.revisiones.slice().sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
  var last=revs[revs.length-1];
  return {sem:(last.semaforoGlobal||'').toUpperCase(), intacta:last.tesisSigueIntacta, fecha:last.fecha||'', periodo:last.periodo||''};
}
function _diHoyCtx(t){ var a=_diAna(t)||{};
  return { score:_diScore(t), rating:a.rating||'', decision:a.decision||'',
    precio:_diPrecio(t), rpd:_diRPD(t), peso:_diPeso(t),
    stop:_diNum(a.stopTesis), poMax:_diNum(a.poMax),
    poBase:(typeof poBaseDe==='function')?_diNum(poBaseDe(a)):_diNum(a.precioObjetivo),
    dossierFecha:a.dossierFecha||'', proxRev:(a.proxRev||'').slice(0,10), trim:_diTrim(t) };
}

/* ---- evaluación de un disparador explícito ---- */
function _diTrigRoto(tr,H){
  if(!tr||!tr.campo) return null;
  var c=_diCampoCfg(tr.campo); if(!c) return null;
  var v=tr.valor;
  if(c.tipo==='num'){
    var act=(tr.campo==='precio')?H.precio:(tr.campo==='score'?H.score:H.rpd);
    if(act==null||!(_diNum(v)||v===0)) return null;
    var lim=_diNum(v);
    if(tr.op==='<=' && act<=lim) return c.lbl+' '+_diFmtN(act,c)+' ≤ '+_diFmtN(lim,c);
    if(tr.op==='>=' && act>=lim) return c.lbl+' '+_diFmtN(act,c)+' ≥ '+_diFmtN(lim,c);
    return null;
  }
  if(c.tipo==='rat'){
    var sa=_diRatingScore(H.rating), sv=_diRatingScore(v);
    if(sa==null||sv==null) return null;
    return (sa<sv)?('Rating '+H.rating+' es peor que '+v):null;
  }
  if(c.tipo==='dec'){ return (_diUp(H.decision)===_diUp(v))?('La decisión es ahora '+_diUp(v)):null; }
  if(c.tipo==='sem'){
    if(!H.trim||!H.trim.sem) return null;
    if(v==='R') return (H.trim.sem==='R')?('Semáforo trimestral ROJO ('+H.trim.periodo+')'):null;
    return (H.trim.sem==='R'||H.trim.sem==='A')?('Semáforo trimestral '+(H.trim.sem==='R'?'ROJO':'ÁMBAR')+' ('+H.trim.periodo+')'):null;
  }
  return null;
}
function _diFmtN(x,c){ if(x==null)return '—'; if(c&&c.sufijo==='€')return _diEur(x); var n=Math.round(x*10)/10; return n+(c&&c.sufijo?(' '+c.sufijo):''); }
function _diTrigTxt(tr){ var c=_diCampoCfg(tr.campo); if(!c)return '';
  if(c.tipo==='rat') return 'Rating peor que '+tr.valor;
  if(c.tipo==='dec') return 'Decisión = '+_diUp(tr.valor);
  if(c.tipo==='sem') return 'Semáforo trimestral '+(tr.valor==='R'?'rojo':'ámbar o peor');
  return c.lbl+' '+tr.op+' '+_diFmtN(_diNum(tr.valor),c);
}

/* ---- el motor: qué se ha roto en una decisión abierta ---- */
var _DI_SCORE_CAIDA=12;      /* puntos de Score que consideramos una caída de verdad */
var _DI_RPD_CAIDA=0.25;      /* −25 % de RPD ≈ recorte de dividendo */
function diarioRoturas(e){
  var out=[]; if(!e) return out;
  var t=_diUp(e.ticker); var H=_diHoyCtx(t); var C=e.ctx||{};
  var push=function(sev,tipo,txt,sig){ out.push({sev:sev,tipo:tipo,txt:txt,sig:sig||''}); };

  /* 1 · disparadores explícitos (los que tú escribiste) */
  (e.trigs||[]).forEach(function(tr){ var r=_diTrigRoto(tr,H); if(r) push(0,'trigger',r); });

  /* 2 · deriva del contexto capturado al decidir */
  if(C.decision && H.decision && _diUp(C.decision)!==_diUp(H.decision)){
    var peor=(_diUp(H.decision)==='VENDER');
    push(peor?0:1,'decision','La decisión de la ficha pasó de <b>'+_diEsc(C.decision)+'</b> a <b>'+_diEsc(H.decision)+'</b>');
  }
  if(C.rating && H.rating && C.rating!==H.rating){
    var s0=_diRatingScore(C.rating), s1=_diRatingScore(H.rating);
    if(s0!=null&&s1!=null&&s1<s0) push(1,'rating','El rating bajó de <b>'+_diEsc(C.rating)+'</b> a <b>'+_diEsc(H.rating)+'</b>');
    else if(s0==null||s1==null||s1!==s0) push(2,'rating','El rating cambió de <b>'+_diEsc(C.rating)+'</b> a <b>'+_diEsc(H.rating)+'</b>');
  }
  if(C.score!=null && H.score!=null && (C.score-H.score)>=_DI_SCORE_CAIDA)
    push(1,'score','El Score cayó '+Math.round(C.score-H.score)+' puntos ('+Math.round(C.score)+' → '+Math.round(H.score)+')');
  if(C.rpd!=null && H.rpd!=null && C.rpd>0 && (C.rpd-H.rpd)/C.rpd>=_DI_RPD_CAIDA && H.rpd<C.rpd)
    push(1,'rpd','La RPD cayó de '+C.rpd.toFixed(1)+'% a '+H.rpd.toFixed(1)+'% — ¿recorte de dividendo?');

  /* 3 · señales vivas del protocolo */
  if(H.stop>0 && H.precio>0 && H.precio<=H.stop) push(0,'stop','Stop de tesis tocado: '+_diEur(H.precio)+' ≤ '+_diEur(H.stop),'S1');
  else if(H.poMax>0 && H.precio>=H.poMax) push(1,'po','Alcanzó el precio objetivo máximo: '+_diEur(H.precio)+' ≥ '+_diEur(H.poMax),'S3');
  if(H.trim){
    var trFecha=(H.trim.fecha||'');
    if(trFecha>=(e.fecha||'')){                     /* solo lo publicado DESPUÉS de decidir */
      if(H.trim.sem==='R') push(0,'trimestre','Semáforo trimestral <b>ROJO</b> en '+_diEsc(H.trim.periodo),'S2');
      else if(H.trim.intacta===false) push(0,'trimestre','La revisión de '+_diEsc(H.trim.periodo)+' declara la <b>tesis tocada</b>','S2');
    }
  }
  /* 4 · caducidad: la decisión se apoya en un dossier que ya no vale (mismo criterio que B5) */
  var hoy=_diHoy();
  var mm=null; try{ mm=(typeof mesesDesde==='function')?mesesDesde(H.dossierFecha):null; }catch(_){}
  if(H.proxRev){ if(H.proxRev<=hoy) push(2,'revision','Tocaba revisión el '+H.proxRev+' y sigue pendiente','S4'); }
  else if(mm!=null&&mm>12) push(2,'revision','El dossier en el que se apoya tiene '+mm+' meses','S4');

  out.sort(function(a,b){ return a.sev-b.sev; });
  return out;
}
/* Huella del estado roto: sirve para que «Sigo igual» silencie ESTO y no lo que venga después. */
function _diHuella(rot){ return (rot||[]).map(function(r){ return r.tipo+':'+(r.txt||'').replace(/<[^>]*>/g,'').slice(0,60); }).sort().join('|'); }
/* Todas las decisiones abiertas con algún supuesto roto. `pendientes` = las no reconocidas aún. */
function diarioInvalidaciones(){
  var res=[]; (DB.diario||[]).forEach(function(e){
    if((e.estado||'abierta')!=='abierta') return;
    var rot=diarioRoturas(e); if(!rot.length) return;
    var h=_diHuella(rot); var ack=(e.ack&&e.ack.huella===h)?e.ack:null;
    res.push({e:e, rot:rot, huella:h, ack:ack, sev:rot[0].sev});
  });
  res.sort(function(a,b){ return a.sev-b.sev || ((b.e.fecha||'').localeCompare(a.e.fecha||'')); });
  return {todas:res, pendientes:res.filter(function(x){return !x.ack;})};
}

function renderDiario(){
  var sec=document.getElementById('view-diario'); if(!sec)return;
  DB.diario=DB.diario||[];
  /* [C5] Carga los -trim.json de las empresas con decisiones abiertas y repinta cuando lleguen:
     el bloque «⚠️ Supuestos rotos» necesita el último semáforo trimestral para detectar S2. */
  try{ if(typeof khTrimAsegurar==='function'){
    var _tks=[]; (DB.diario||[]).forEach(function(e){ if(e && e.estado!=='cerrada' && e.ticker) _tks.push(e.ticker); });
    khTrimAsegurar(_tks, function(){ if(typeof renderDiario==='function') renderDiario(); });
  } }catch(e){}
  window._diFilt=window._diFilt||{tipo:'',estado:''};
  var F=window._diFilt;

  var arr=DB.diario.slice().sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });
  var vis=arr.filter(function(e){ if(F.tipo&&e.tipo!==F.tipo)return false; if(F.estado&&(e.estado||'abierta')!==F.estado)return false; return true; });

  var nTot=arr.length, nAb=arr.filter(function(e){return (e.estado||'abierta')==='abierta';}).length;
  var cerr=arr.filter(function(e){return e.estado==='cerrada';});
  var ac=cerr.filter(function(e){return _diVer(e).acierto===true;}).length;
  var pctAc=cerr.length?Math.round(ac/cerr.length*100)+'%':'—';
  /* [B1] el KPI contaba las decisiones que TENÍAN texto de invalidación — un dato inerte, porque
     no decía si alguna se había roto. Ahora cuenta las que el motor ve rotas y sin revisar. */
  var INV=diarioInvalidaciones();
  var nInval=INV.pendientes.length;

  var H='<div class="vhero g-rose"><div class="vhero-main"><span class="vhero-ic">📝</span><div class="vhero-txt"><h2>Mis Decisiones</h2><p>Anota <b>por qué</b> decides cada cosa en el momento. La <b>Calibración</b> compara luego contra tu criterio escrito, no contra tu memoria.</p></div></div></div>';
  H+='<div class="di-wrap">';

  H+='<div class="di-stats">'+
    _diKpi(nTot,'Decisiones')+_diKpi(nAb,'Abiertas')+_diKpi(pctAc,'Aciertos (cerradas)')+_diKpi(nInval,'Supuestos rotos',nInval?'alerta':'')+
    '</div>';

  H+=_diInvalHTML(INV);   /* [B1] lo que se ha roto, arriba del todo */

  H+='<div class="di-bar"><button class="di-new" id="diNewBtn">+ Nueva decisión</button>'+
     '<div class="di-filters">'+_diChip('','tipo','Todas',F)+_DI_TIPOS.map(function(t){return _diChip(t.k,'tipo',t.k,F);}).join('')+
     _diChip('abierta','estado','Abiertas',F)+_diChip('cerrada','estado','Cerradas',F)+'</div></div>';

  H+='<div id="diFormHost"></div>';

  var _diOpen=(window._diListOpen===true);
  H+='<div class="pos-blk'+(_diOpen?' open':'')+'" data-diblk="lista"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">📋 Listado de decisiones</span><span class="bsum">'+vis.length+' de '+nTot+'</span></div><div class="pos-blk-b"><div class="blk-pad">';
  if(!vis.length){ H+='<div class="di-empty">Sin decisiones'+(nTot?' con este filtro':' todavía')+'. Pulsa «+ Nueva decisión» para registrar la primera.</div>'; }
  else { H+=vis.map(_diCard).join(''); }
  H+='<div class="muted" style="font-size:11px;margin-top:10px;line-height:1.5">«Desde entonces» = precio actual − precio de la decisión + dividendos cobrados, sobre el precio de la decisión. El <b>veredicto</b> (✓/✗) aparece al marcar la decisión como <b>cerrada</b>.<br>'
    +'Además, cada decisión se mide sola contra las <b>dianas de la Calibración</b> (6/12/36 meses desde el dossier): el resultado agregado —por tipo de decisión y según lleve o no invalidación escrita— está en <span class="di-link" data-dimetodo="1">Panel del Método → 📓 Tus decisiones, evaluadas</span>.</div>';
  H+='</div></div></div>';
  H+='</div>';
  sec.innerHTML=H;

  /* si hay semilla (desde el Kanban), abre el formulario prellenado */
  if(window._diSeed){ var sd=window._diSeed; window._diSeed=null; _diOpenForm(sd.ticker,sd.tipo,sd); }
  _diBind(sec);
}
function _diKpi(n,l,cls){ return '<div class="di-st'+(cls?(' '+cls):'')+'"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'; }

/* [B1] Bloque de supuestos rotos. Enseña LO QUE ESCRIBISTE junto a lo que la app ve hoy, para
   que la decisión la tomes tú leyendo tu propio criterio, no la máquina. */
var _DI_SEVCFG=[{ic:'🔴',cls:'sv0',lbl:'rompe la tesis'},{ic:'🟠',cls:'sv1',lbl:'toca revisar'},{ic:'🟡',cls:'sv2',lbl:'ojo'}];
function _diInvalHTML(INV){
  INV=INV||diarioInvalidaciones();
  var pend=INV.pendientes, todas=INV.todas;
  if(!todas.length) return '<div class="di-nada">✅ Ninguna decisión abierta tiene su supuesto roto. La vigilancia mira rating, decisión, Score, RPD, stop, precio objetivo, semáforo trimestral y caducidad del dossier — más los disparadores que hayas escrito.</div>';
  var cards=todas.map(function(x){
    var e=x.e, S=_DI_SEVCFG[x.rot[0].sev]||_DI_SEVCFG[2];
    var lis=x.rot.map(function(r){ var s=_DI_SEVCFG[r.sev]||_DI_SEVCFG[2];
      return '<li>'+s.ic+' '+r.txt+(r.sig?(' <span class="di-sig" data-diproto="'+r.sig+'|'+_diEsc(e.ticker)+'" title="Ver el procedimiento de la señal '+r.sig+'">'+r.sig+' 📋</span>'):'')+'</li>'; }).join('');
    return '<div class="di-alert '+S.cls+(x.ack?' ackd':'')+'">'
      +'<div class="di-ah"><span class="di-tk" data-ficha="'+_diEsc(e.ticker)+'">'+_diEsc(e.ticker)+'</span>'
      +'<span class="di-tipo '+_diTipoCfg(e.tipo).cls+'">'+_diEsc(e.tipo)+'</span>'
      +'<span class="di-sev">'+S.ic+' '+S.lbl+'</span>'
      +'<span class="di-when">decidido el '+_diEsc(e.fecha)+'</span></div>'
      +(e.invalidacion?'<div class="di-inv"><b>Escribiste:</b> «'+_diEsc(e.invalidacion)+'»</div>'
                      :'<div class="di-inv vacia">No escribiste condición de invalidación en esta decisión. La vigilancia automática es lo único que la cubre.</div>')
      +'<div class="di-rot"><b>Lo que ha cambiado:</b><ul>'+lis+'</ul></div>'
      +(x.ack?('<div class="di-ackn">✔ Revisado el '+_diEsc(x.ack.fecha)+' — «sigo igual». Volverá a avisar si cambia algo más.</div>'):'')
      +'<div class="di-aacts">'
        +(x.ack?'':'<button class="btn ghost sm" data-diack="'+e.id+'">Sigo igual</button>')
        +'<button class="btn ghost sm" data-dinueva="'+e.id+'">Anotar decisión nueva</button>'
        +'<button class="btn ghost sm" data-diclose="'+e.id+'">Marcar cerrada</button>'
      +'</div></div>';
  }).join('');
  var tit=pend.length?('⚠️ '+pend.length+' supuesto'+(pend.length>1?'s':'')+' roto'+(pend.length>1?'s':'')+' sin revisar'):'✔ Supuestos rotos, todos revisados';
  return '<div class="pos-blk'+(pend.length?' open':'')+'" data-diblk="inval"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">'+tit+'</span><span class="bsum">'+todas.length+' decisión(es) afectada(s)</span></div>'
    +'<div class="pos-blk-b"><div class="blk-pad"><div class="muted" style="font-size:11.5px;margin-bottom:9px;line-height:1.5">Decisiones <b>abiertas</b> cuyo supuesto ya no se sostiene. Nada se cierra solo: lee lo que escribiste, mira lo que ha cambiado y decide. <b>«Sigo igual»</b> archiva este estado y deja de avisar hasta que se rompa algo nuevo.</div>'+cards+'</div></div></div>';
}
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
    _diTrigsChips(e)+   /* [B1] las condiciones que se vigilan solas, y si alguna está rota */
    (chips.length?'<div class="di-ctxrow">'+chips.map(function(c){return '<span class="di-cx">'+_diEsc(c)+'</span>';}).join('')+'</div>':'')+
    '<div class="di-foot">'+(retTxt||'<span class="muted" style="font-size:12px">Sin precio de referencia</span>')+verChip+
      '<span class="di-acts">'+((e.estado||'abierta')==='abierta'?'<button class="btn ghost sm" data-diclose="'+e.id+'">Marcar cerrada</button>':'<button class="btn ghost sm" data-diopen="'+e.id+'">Reabrir</button>')+
      '<button class="btn ghost sm" data-didel="'+e.id+'" title="Eliminar">✕</button></span></div>'+
    '</div>';
}
/* [B1] chips de las condiciones vigiladas + estado de la vigilancia de esa decisión */
function _diTrigsChips(e){
  var abierta=((e.estado||'abierta')==='abierta');
  var trg=(e.trigs||[]);
  var rot=abierta?diarioRoturas(e):[];
  var out='';
  if(trg.length){
    var H=abierta?_diHoyCtx(e.ticker):null;
    out+='<div class="di-trigrow-v">'+trg.map(function(tr){
      var roto=abierta?!!_diTrigRoto(tr,H):false;
      return '<span class="di-tg'+(roto?' roto':'')+'">'+(roto?'⚠ ':'👁 ')+_diEsc(_diTrigTxt(tr))+'</span>';
    }).join('')+'</div>';
  }
  if(abierta && rot.length){
    var S=_DI_SEVCFG[rot[0].sev]||_DI_SEVCFG[2];
    var ack=(e.ack&&e.ack.huella===_diHuella(rot));
    out+='<div class="di-rotmini '+S.cls+(ack?' ackd':'')+'">'+S.ic+' <b>'+rot.length+'</b> supuesto'+(rot.length>1?'s':'')+' roto'+(rot.length>1?'s':'')
      +(ack?(' · revisado el '+_diEsc(e.ack.fecha)):'')+' — '+_diEsc(rot[0].txt.replace(/<[^>]*>/g,''))+(rot.length>1?' …':'')+'</div>';
  }
  return out;
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
  _diTrigDraft=(seed.trigs||[]).slice();          /* [B1] el formulario arranca sin condiciones */
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
    _diTrigsForm()+                                    /* [B1] disparadores concretos, opcionales */
    '<div class="di-ctx" id="diCtxPrev">Elige empresa para capturar el contexto (Score, rating, PO, RPD, peso).</div>'+
    '</div><div class="di-actions"><button class="di-save" id="diSave">Guardar decisión</button><button class="di-cancel" id="diCancel">Cancelar</button></div></div>';
  if(ticker){ var pe=document.getElementById('diPrecio'); if(pe)pe.value=((seed.precio||_diPrecio(ticker))||'').toString();
    if(seed.importe){ var ie=document.getElementById('diImporte'); if(ie)ie.value=Math.round(seed.importe); }
    if(seed.porque){ var _pq=document.getElementById('diPorque'); if(_pq)_pq.value=seed.porque; }
    _diCtxPrev(ticker); }
  _diTrigsPinta();
  var f=host.querySelector('.di-form'); if(f)f.scrollIntoView({behavior:'smooth',block:'nearest'});
}
/* [B1] Constructor de disparadores. Opcional: la frase de arriba sigue siendo lo importante;
   esto solo la traduce a algo que la app pueda comprobar sola. Se guardan en `e.trigs`. */
var _diTrigDraft=[];
function _diTrigsForm(){
  return '<div class="di-fld di-trigs" style="grid-column:1/-1"><label>…y compruébalo tú por mí <span class="opt">(opcional)</span></label>'
    +'<div id="diTrigList"></div>'
    +'<button type="button" class="di-trigadd" id="diTrigAdd">+ Añadir condición</button>'
    +'<div class="di-trighelp">Cada condición se vigila sola sobre las decisiones abiertas. Sin condiciones, la decisión igualmente se vigila por deriva (rating, decisión, Score, RPD, stop, PO, semáforo y caducidad del dossier).</div></div>';
}
function _diTrigsPinta(){
  var host=document.getElementById('diTrigList'); if(!host)return;
  if(!_diTrigDraft.length){ host.innerHTML='<div class="di-trigempty">Sin condiciones. La vigilancia automática sigue activa.</div>'; return; }
  host.innerHTML=_diTrigDraft.map(function(tr,i){
    var c=_diCampoCfg(tr.campo)||_DI_CAMPOS[0];
    var camp='<select data-trigf="campo" data-trigi="'+i+'">'+_DI_CAMPOS.map(function(x){return '<option value="'+x.k+'"'+(x.k===tr.campo?' selected':'')+'>'+x.lbl+'</option>';}).join('')+'</select>';
    var ops, val;
    if(c.tipo==='num'){ ops='<select data-trigf="op" data-trigi="'+i+'">'+c.ops.map(function(o){return '<option value="'+o+'"'+(o===tr.op?' selected':'')+'>'+(o==='<='?'baja de':'sube de')+'</option>';}).join('')+'</select>';
      val='<input type="number" step="0.01" data-trigf="valor" data-trigi="'+i+'" value="'+(tr.valor==null?'':tr.valor)+'" placeholder="0"><span class="suf">'+c.sufijo+'</span>'; }
    else if(c.tipo==='rat'){ ops='<span class="fix">es peor que</span>';
      var RS=['A','B','C','D','E'];
      try{ if(typeof RAD_RATING!=='undefined'&&RAD_RATING) RS=Object.keys(RAD_RATING); }catch(_){}
      val='<select data-trigf="valor" data-trigi="'+i+'">'+RS.map(function(r){return '<option value="'+r+'"'+(r===tr.valor?' selected':'')+'>'+r+'</option>';}).join('')+'</select>'; }
    else if(c.tipo==='dec'){ ops='<span class="fix">pasa a</span>';
      val='<select data-trigf="valor" data-trigi="'+i+'">'+_DI_DECS.map(function(d){return '<option value="'+d+'"'+(d===tr.valor?' selected':'')+'>'+d+'</option>';}).join('')+'</select>'; }
    else { ops='<span class="fix">se pone</span>';
      val='<select data-trigf="valor" data-trigi="'+i+'">'+_DI_SEMS.map(function(s){return '<option value="'+s[0]+'"'+(s[0]===tr.valor?' selected':'')+'>'+s[1]+'</option>';}).join('')+'</select>'; }
    return '<div class="di-trigrow">'+camp+ops+val+'<button type="button" class="di-trigdel" data-trigdel="'+i+'" title="Quitar">✕</button></div>';
  }).join('');
}
function _diTrigDefault(campo){
  var c=_diCampoCfg(campo)||_DI_CAMPOS[0];
  if(c.tipo==='num') return {campo:c.k, op:c.ops[0], valor:''};
  if(c.tipo==='rat') return {campo:c.k, op:'peor', valor:'C'};
  if(c.tipo==='dec') return {campo:c.k, op:'=', valor:'VENDER'};
  return {campo:c.k, op:'=', valor:'R'};
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
    /* [B1] acciones del bloque de supuestos rotos */
    var ak=e.target.closest('[data-diack]'); if(ak){ _diAck(ak.getAttribute('data-diack')); return; }
    var nv=e.target.closest('[data-dinueva]'); if(nv){ var en=(DB.diario||[]).find(function(x){return x.id===nv.getAttribute('data-dinueva');});
      if(en) _diOpenForm(en.ticker,'',{porque:'Revisión de la decisión del '+en.fecha+': '+(en.invalidacion||en.porque||'')}); return; }
    var pr=e.target.closest('[data-diproto]'); if(pr){ var pa=(pr.getAttribute('data-diproto')||'').split('|');
      if(typeof showProtocolo==='function') showProtocolo(pa[0],'',pa[1]); return; }
    /* [B1] constructor de disparadores */
    var ta=e.target.closest('#diTrigAdd'); if(ta){ _diTrigDraft.push(_diTrigDefault('precio')); _diTrigsPinta(); return; }
    var td=e.target.closest('[data-trigdel]'); if(td){ _diTrigDraft.splice(parseInt(td.getAttribute('data-trigdel'),10),1); _diTrigsPinta(); return; }
    var mt=e.target.closest('[data-dimetodo]'); if(mt){ if(typeof activarVista==='function')activarVista('estado'); return; }   /* [B2] */
    var fi=e.target.closest('[data-ficha]'); if(fi){ var t=fi.getAttribute('data-ficha'); if(typeof abrirFicha==='function')abrirFicha(t); else location.hash='ficha='+t; return; }
  });
  sec.addEventListener('change',function(e){
    var em=e.target.closest('#diEmp'); if(em){ var t=_diUp(em.value); var pe=document.getElementById('diPrecio'); if(pe&&t)pe.value=(_diPrecio(t)||'').toString(); _diCtxPrev(t); return; }
    var tf=e.target.closest('[data-trigf]'); if(tf){ var i=parseInt(tf.getAttribute('data-trigi'),10); var f=tf.getAttribute('data-trigf');
      if(!_diTrigDraft[i])return;
      if(f==='campo'){ _diTrigDraft[i]=_diTrigDefault(tf.value); } else { _diTrigDraft[i][f]=tf.value; }
      _diTrigsPinta(); return; }
  });
}
/* [B1] «Sigo igual»: archiva el estado roto ACTUAL. Si mañana se rompe otra cosa, la huella
   cambia y vuelve a avisar — así el aviso no se apaga para siempre de un clic. */
function _diAck(id){
  var e=(DB.diario||[]).find(function(x){return x.id===id;}); if(!e)return;
  var rot=diarioRoturas(e); if(!rot.length)return;
  e.ack={huella:_diHuella(rot), fecha:_diHoy()};
  _diSave(); renderDiario();
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
    trigs:_diTrigDraft.filter(function(tr){ var c=_diCampoCfg(tr.campo); if(!c)return false;
      return (c.tipo==='num')?(tr.valor!==''&&tr.valor!=null&&!isNaN(_diNum(tr.valor))):!!tr.valor; }),
    ctx:_diCtx(t), estado:'abierta' };
  DB.diario=DB.diario||[]; DB.diario.push(e); _diTrigDraft=[]; _diSave();
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
    '.di-chk-close{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;font-size:13px;color:#475569;cursor:pointer}',
    '#view-diario .pos-blk{background:var(--panel);border:1px solid var(--line);border-radius:14px;margin-top:4px;box-shadow:var(--shadow);overflow:hidden}',
    '#view-diario .pos-blk-h{display:flex;align-items:center;gap:9px;padding:12px 15px;cursor:pointer}',
    '#view-diario .pos-blk-h .arw{color:#94a3b8;font-size:11px;transition:transform .15s}',
    '#view-diario .pos-blk.open .pos-blk-h .arw{transform:rotate(90deg)}',
    '#view-diario .pos-blk-h .bt{font-weight:800;font-size:14px}',
    '#view-diario .pos-blk-h .bsum{margin-left:auto;font-size:12px;color:var(--muted);text-align:right}',
    '#view-diario .pos-blk-b{display:none;border-top:1px solid #f1f5f9}',
    '#view-diario .pos-blk.open .pos-blk-b{display:block}',
    '#view-diario .pos-blk .blk-pad{padding:6px 15px 12px}',
    '#view-diario .pos-blk[data-diblk="lista"] .pos-blk-h{background:linear-gradient(120deg,#eef2ff,#e0e7ff);border-left:4px solid #6366f1}',
    '#view-diario .pos-blk[data-diblk="lista"] .pos-blk-h .bt{color:#3730a3}',
    /* [B1] motor de invalidaciones */
    '.di-st.alerta{background:#fef2f2;border-color:#fecaca}.di-st.alerta .n{color:#b91c1c}.di-st.alerta .l{color:#b91c1c}',
    '#view-diario .pos-blk[data-diblk="inval"]{margin-bottom:14px}',
    '#view-diario .pos-blk[data-diblk="inval"] .pos-blk-h{background:linear-gradient(120deg,#fef2f2,#fee2e2);border-left:4px solid #dc2626}',
    '#view-diario .pos-blk[data-diblk="inval"] .pos-blk-h .bt{color:#991b1b}',
    '.di-nada{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:12px;padding:10px 13px;font-size:12.5px;line-height:1.5;margin-bottom:14px}',
    '.di-alert{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;border-radius:12px;padding:11px 13px;margin-bottom:10px}',
    '.di-alert.sv0{border-left-color:#dc2626}.di-alert.sv1{border-left-color:#ea580c}.di-alert.sv2{border-left-color:#d97706}',
    '.di-alert.ackd{opacity:.72;background:#fcfcfd}',
    '.di-ah{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px}',
    '.di-sev{font-size:11px;font-weight:800;color:#475569;background:#f1f5f9;border-radius:20px;padding:2px 9px}',
    '.di-alert.sv0 .di-sev{background:#fee2e2;color:#991b1b}.di-alert.sv1 .di-sev{background:#ffedd5;color:#9a3412}.di-alert.sv2 .di-sev{background:#fef3c7;color:#92400e}',
    '.di-inv.vacia{background:#f8fafc;border-color:#e2e8f0;color:#64748b;font-style:italic}',
    '.di-rot{font-size:12.5px;color:#334155;margin-top:6px}.di-rot ul{margin:4px 0 0;padding-left:18px;line-height:1.6}',
    '.di-sig{font-size:10.5px;font-weight:800;background:#eef2f8;color:#1f3d6b;border-radius:6px;padding:1px 6px;cursor:pointer;text-decoration:underline dotted}',
    '.di-ackn{background:#f1f5f9;color:#475569;border-radius:8px;padding:5px 9px;font-size:11.5px;margin-top:7px}',
    '.di-aacts{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}',
    '.di-trigs .opt{font-weight:600;color:#94a3b8;text-transform:none;letter-spacing:0}',
    '.di-trigrow{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:5px}',
    '.di-trigrow select,.di-trigrow input{border:1px solid #e2e8f0;border-radius:7px;padding:5px 7px;font-size:12.5px;background:#fff;color:#334155}',
    '.di-trigrow input{width:92px;text-align:right}.di-trigrow .suf{font-size:11.5px;color:#64748b;font-weight:700}',
    '.di-trigrow .fix{font-size:12px;color:#64748b}',
    '.di-trigdel{background:#fff;border:1px solid #e2e8f0;border-radius:7px;color:#94a3b8;cursor:pointer;padding:4px 8px;font-size:11px}',
    '.di-trigadd{background:#fff;border:1px dashed #cbd5e1;border-radius:8px;color:#475569;cursor:pointer;padding:5px 11px;font-size:12px;font-weight:700;margin-top:2px}',
    '.di-trigempty{font-size:11.5px;color:#94a3b8;padding:2px 0 4px}',
    '.di-trighelp{font-size:11px;color:#94a3b8;margin-top:5px;line-height:1.45}',
    '.di-trigrow-v{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}',
    '.di-tg{font-size:10.5px;font-weight:700;background:#eef2f8;color:#334155;border-radius:6px;padding:2px 7px}',
    '.di-tg.roto{background:#fee2e2;color:#991b1b}',
    '.di-rotmini{font-size:11.5px;border-radius:8px;padding:5px 9px;margin:6px 0;background:#fef3c7;color:#92400e}',
    '.di-rotmini.sv0{background:#fee2e2;color:#991b1b}.di-rotmini.sv1{background:#ffedd5;color:#9a3412}',
    '.di-rotmini.ackd{background:#f1f5f9;color:#475569}',
    '.di-link{color:#1d4ed8;font-weight:700;cursor:pointer;text-decoration:underline;text-decoration-color:#bfdbfe}'
  ].join('\n');
  document.head.appendChild(s);
})();
