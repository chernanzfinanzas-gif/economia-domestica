/* ============================================================
   EVOLUCIÓN DEL DIVIDENDO  (pestaña, sustituye a la antigua)
   Fuente: dividendos.json (exportado del Excel "Calendario por
   Empresa"). Es la ÚNICA fuente del dividendo por acción para la
   app: Radar, Simulador y métricas leen de aquí.

   Vista: selector de AÑO (con años FUTUROS proyectables) + chips
   de GRUPO aditivos + listado ordenado por prioridad. Fila plegada
   (empresa · dividendo total BRUTO · RPD · junta) y desplegada
   (pagos + presentación de resultados).

   Años futuros: DPA = año anterior × (1 + % crecimiento). Cada
   empresa se puede "pisar" a mano (override). Sin límite de años.
   Estos valores alimentan el Simulador (evoDpaProyectado).
   ============================================================ */

var _evoData = null;          /* {schemaVersion, actualizado, years, empresas[]} */
var _evoIndex = {};           /* ticker -> registro */
var _evoYear = null;          /* año seleccionado */
var _evoGroups = {};          /* filtros de grupo activos (aditivo) */
var _evoBusca = {q:''};
var _evoOpen = {};            /* filas desplegadas: ticker -> true */
var _evoEdit = {};            /* ticker -> modo edición de dividendos abierto */

function _evoCargar(){
  if(_evoData) return Promise.resolve(_evoData);
  return fetch('dividendos.json',{cache:'no-store'})
    .then(function(r){ return r.ok?r.json():null; })
    .then(function(j){
      _evoData = j || {years:[],empresas:[]};
      _evoIndex = {};
      (_evoData.empresas||[]).forEach(function(e){ _evoIndex[(e.ticker||'').toUpperCase()]=e; });
      return _evoData;
    })
    .catch(function(){ _evoData={years:[],empresas:[]}; return _evoData; });
}

/* ===== CAPA EDITABLE (DB.divData) sobre la base dividendos.json =====
   Tus altas/ediciones viven en DB.divData y MANDAN sobre el Excel (que queda de base).
   DB.divData[T] = { paga?, nombre?, moneda?, domicilioFiscal?, nota?,
     anios:{ [year]:{ junta, presentacionResultados, naturaleza, dpaBruto?, dpaNeto?,
                      pagos:[{exDiv,pago,bruto,neto,tipo}] } } }
   Si el total (dpaBruto/dpaNeto) no se fija a mano, se suma de los pagos. */
function _evoStore(){ DB.divData=DB.divData||{}; return DB.divData; }
function _evoOv(t){ return (DB.divData||{})[(t||'').toUpperCase()]||null; }
function _evoOvYear(t,year){ var o=_evoOv(t); return (o&&o.anios&&o.anios[String(year)])||null; }
function _evoEnsure(t,year){ var s=_evoStore(); var T=(t||'').toUpperCase(); s[T]=s[T]||{}; if(year==null) return s[T]; s[T].anios=s[T].anios||{}; s[T].anios[String(year)]=s[T].anios[String(year)]||{}; return s[T].anios[String(year)]; }
function _evoPagosSeed(t,year){ var ay=_evoEnsure(t,year); if(!ay.pagos){ var T=(t||'').toUpperCase(); var base=(_evoIndex[T]&&_evoIndex[T].anios)?_evoIndex[T].anios[String(year)]:null; ay.pagos=(base&&base.pagos)?base.pagos.map(function(p){ return {exDiv:p.exDiv||'',pago:p.pago||'',bruto:num(p.bruto),neto:num(p.neto),tipo:p.tipo||''}; }):[]; } return ay.pagos; }
function _evoClean(t){ var s=DB.divData||{}; var T=(t||'').toUpperCase(); var o=s[T]; if(!o) return;
  if(o.anios){ Object.keys(o.anios).forEach(function(y){ var ay=o.anios[y]||{};
    var vacio=(!ay.pagos||!ay.pagos.length)&&!ay.junta&&!ay.presentacionResultados&&!ay.naturaleza&&!ay.notaTotal&&(ay.dpaBruto==null||ay.dpaBruto==='')&&(ay.dpaNeto==null||ay.dpaNeto==='');
    if(vacio) delete o.anios[y]; }); if(!Object.keys(o.anios).length) delete o.anios; }
  var top=(o.nombre||o.moneda||o.domicilioFiscal||o.nota||o.paga!=null);
  if(!top && !o.anios) delete s[T];
}
function _evoSave(t){ _evoClean(t); if(typeof scheduleSave==='function')scheduleSave(); renderEvoDiv(); }
function _evoHoy(){ try{ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }catch(e){ return ''; } }
/* Ajusta la altura de #evoApp para llenar el viewport: cabecera y pie fijos, solo la tabla scrollea. */
function _evoFit(){ var h=document.getElementById('evoApp'); if(!h||!h.getBoundingClientRect)return; var top=h.getBoundingClientRect().top; var v=window.innerHeight-top-8; if(v>240){ h.style.display='flex'; h.style.flexDirection='column'; h.style.height=v+'px'; } else { h.style.display=''; h.style.height=''; } }
/* MIGRACIÓN Excel → app (una sola vez): registra dividendos.json en DB.divData para
   trabajar 100% en la app y poder replicar/exportar. No pisa ediciones existentes. */
function _evoMigrar(){
  if(DB.divDataMigrado) return false;
  var src=(_evoData&&_evoData.empresas)||[];
  if(!src.length) return false;   /* si aún no cargó, reintenta en el próximo render */
  DB.divData=DB.divData||{};
  src.forEach(function(e){
    var T=(e.ticker||'').toUpperCase(); if(!T) return;
    var d=DB.divData[T]=DB.divData[T]||{};
    ['nombre','moneda','domicilioFiscal','clasificacion','origen','nota'].forEach(function(f){ if((d[f]==null||d[f]==='')&&e[f]!=null&&e[f]!=='') d[f]=e[f]; });
    if(d.paga==null&&e.paga!=null) d.paga=!!e.paga;
    if(d.origenExcel==null) d.origenExcel=true;
    d.anios=d.anios||{};
    Object.keys(e.anios||{}).forEach(function(y){
      if(d.anios[y]) return;   /* no pisar lo que ya has editado */
      var ay=e.anios[y]||{}; var ny={};
      ['dpaBruto','dpaNeto','junta','presentacionResultados','naturaleza','nPagos','racha','primaAsistencia','deltaPct'].forEach(function(f){ if(ay[f]!=null) ny[f]=ay[f]; });
      ny.pagos=(ay.pagos||[]).map(function(p){ return {exDiv:p.exDiv||'',pago:p.pago||'',bruto:num(p.bruto),neto:num(p.neto),tipo:p.tipo||'',previsto:!!p.previsto}; });
      ny.totalPrevisto=false;   /* lo del Excel es histórico/confirmado */
      ny.origenExcel=true;
      d.anios[y]=ny;
    });
  });
  DB.divDataMigrado=1;
  if(typeof scheduleSave==='function') scheduleSave();
  return true;
}
/* Suma de pagos (bruto/neto) y de los confirmados (con fechas y no previstos). */
function _evoSumaPagos(a){
  var b=0,n=0,bc=0,nc=0,nprev=0;
  ((a&&a.pagos)||[]).forEach(function(p){ var pb=num(p.bruto),pn=num(p.neto); b+=pb; n+=pn;
    var conf=(!p.previsto && p.exDiv && p.pago); if(conf){ bc+=pb; nc+=pn; } else nprev++; });
  return {bruto:_evoRound(b,4),neto:_evoRound(n,4),brutoConf:_evoRound(bc,4),netoConf:_evoRound(nc,4),nPrev:nprev};
}
/* Exporta DB.divData a dividendos.json (para regenerar el Excel). Descarga en el navegador. */
function evoExportarJSON(){
  var yset={}; var empresas=Object.keys(DB.divData||{}).sort().map(function(T){
    var d=DB.divData[T]||{}; var e={ticker:T,nombre:d.nombre||T,clasificacion:d.clasificacion||'',moneda:d.moneda||'',domicilioFiscal:d.domicilioFiscal||'',origen:d.origen||'',nota:d.nota||'',paga:!!d.paga,anios:{}};
    Object.keys(d.anios||{}).forEach(function(y){ yset[y]=1; var ay=d.anios[y]||{};
      e.anios[y]={dpaBruto:(ay.dpaBruto!=null?num(ay.dpaBruto):null),dpaNeto:(ay.dpaNeto!=null?num(ay.dpaNeto):null),nPagos:(ay.pagos||[]).length,naturaleza:ay.naturaleza||'',junta:ay.junta||'',presentacionResultados:ay.presentacionResultados||'',primaAsistencia:(ay.primaAsistencia!=null?num(ay.primaAsistencia):null),racha:(ay.racha!=null?num(ay.racha):null),totalPrevisto:!!ay.totalPrevisto,notaTotal:ay.notaTotal||'',
        pagos:(ay.pagos||[]).map(function(p){ return {exDiv:p.exDiv||'',pago:p.pago||'',bruto:num(p.bruto),neto:num(p.neto),tipo:p.tipo||'',previsto:!!p.previsto}; })}; });
    return e;
  });
  var out={schemaVersion:2,actualizado:_evoHoy(),years:Object.keys(yset).map(Number).sort(function(a,b){return a-b;}),empresas:empresas};
  try{ var blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'}); var url=URL.createObjectURL(blob); var el=document.createElement('a'); el.href=url; el.download='dividendos.json'; document.body.appendChild(el); el.click(); setTimeout(function(){ document.body.removeChild(el); URL.revokeObjectURL(url); },200); }catch(e){ alert('No se pudo exportar: '+e); }
}
var _EVO_TIPO_COL={'a cuenta':['#dbeafe','#1e40af'],'complementario':['#dcfce7','#166534'],'ordinario':['#e2e8f0','#334155'],'extraordinario':['#fef3c7','#92400e'],'scrip':['#ede9fe','#5b21b6'],'único':['#fae8ff','#86198f']};
function _evoTipoBadge(tipo,previsto){
  tipo=tipo||'—'; var c=_EVO_TIPO_COL[tipo]||['#f1f5f9','#475569'];
  var h='<span style="font-size:9px;font-weight:700;background:'+c[0]+';color:'+c[1]+';padding:1px 6px;border-radius:6px">'+_evoEsc(tipo)+'</span>';
  if(previsto) h+=' <span style="font-size:9px;font-weight:700;background:#fff7ed;color:#c2410c;padding:1px 5px;border-radius:6px">previsto</span>';
  return h;
}
/* Control: total declarado vs suma de pagos (con previsión y nota). */
function _evoControlHTML(a){
  var s=_evoSumaPagos(a); var tot=(a&&a.dpaBruto!=null)?num(a.dpaBruto):null;
  if(tot==null && !((a&&a.pagos)||[]).length) return '';
  var prevBadge=(a&&a.totalPrevisto)?' <span style="font-size:9px;font-weight:700;background:#fff7ed;color:#c2410c;padding:1px 6px;border-radius:6px">PREVISIÓN</span>':'';
  var difTxt='';
  if(tot!=null){ var dif=_evoRound(s.bruto-tot,4);
    if(Math.abs(dif)<0.005) difTxt='<span style="color:#16a34a;font-weight:700">✓ cuadra con los pagos</span>';
    else difTxt='<span style="color:#d97706;font-weight:700">⚠ difieren '+_evoPf(Math.abs(dif),4)+' €</span>'+(s.nPrev?(' · '+s.nPrev+' pago(s) sin confirmar'):''); }
  var totTxt=(tot!=null)?('<b>'+_evoPf(tot,4)+' €</b>'):'<span class="muted">sin total</span>';
  var h='<div style="font-size:11.5px;margin:4px 0;color:#334155">Total declarado: '+totTxt+prevBadge
    +' &nbsp;·&nbsp; Suma de pagos: <b>'+_evoPf(s.bruto,4)+' €</b>'+((s.brutoConf!==s.bruto)?(' <span class="muted">(confirmados '+_evoPf(s.brutoConf,4)+')</span>'):'')
    +(difTxt?(' &nbsp;·&nbsp; '+difTxt):'')+'</div>';
  if(a&&a.totalPrevisto&&a.notaTotal) h+='<div style="font-size:11px;color:#c2410c;margin-bottom:4px">📝 '+_evoEsc(a.notaTotal)+'</div>';
  return h;
}

/* Empresa combinada (base ∪ overlay ∪ universo). */
function evoEmpresaM(t){ t=(t||'').toUpperCase();
  var base=_evoIndex[t]||null, ov=_evoOv(t), uni=(DB.universo||{})[t]||null;
  if(!base&&!ov&&!uni) return null;
  var e={}; if(base){ for(var k in base) e[k]=base[k]; }
  e.ticker=t;
  if(ov){ ['nombre','moneda','domicilioFiscal','nota'].forEach(function(f){ if(ov[f]!=null&&ov[f]!=='') e[f]=ov[f]; }); if(ov.paga!=null) e.paga=!!ov.paga; }
  if(!e.nombre) e.nombre=(uni&&uni.nombre)||t;
  if(!base && !ov){ e.origenUniverso=true; e.paga=!!e.paga; if(!e.anios) e.anios={}; }
  return e;
}
/* Año combinado (base overlaid con overlay; auto-suma de pagos si el total no es manual). */
function evoAnioM(t,year){ t=(t||'').toUpperCase(); year=String(year);
  var base=(_evoIndex[t]&&_evoIndex[t].anios)?_evoIndex[t].anios[year]:null;
  var ov=_evoOvYear(t,year);
  if(!base&&!ov) return null;
  var a={}; if(base){ for(var k in base) a[k]=base[k]; }
  if(ov){
    ['junta','presentacionResultados','naturaleza','racha','primaAsistencia','notaTotal'].forEach(function(f){ if(ov[f]!=null&&ov[f]!=='') a[f]=ov[f]; });
    if(ov.totalPrevisto!=null) a.totalPrevisto=!!ov.totalPrevisto;
    if(ov.pagos!=null){ a.pagos=ov.pagos.slice(); a.nPagos=a.pagos.length; }
    /* Total DECLARADO independiente de los pagos: se controlan/reconcilian aparte. */
    if(ov.dpaBruto!=null&&ov.dpaBruto!=='') a.dpaBruto=num(ov.dpaBruto);
    if(ov.dpaNeto!=null&&ov.dpaNeto!=='') a.dpaNeto=num(ov.dpaNeto);
    a._editado=true;
  }
  /* Total neto calculado con la regla del 19% si no hay un neto explícito. */
  if((a.dpaNeto==null||a.dpaNeto==='') && a.dpaBruto!=null) a.dpaNeto=_evoNeto(a.dpaBruto);
  return a;
}

/* API pública para otros módulos (Simulador, Radar): leen la capa combinada. */
function evoDpaBruto(t, year){ var a=evoAnioM(t,year); return (a&&a.dpaBruto!=null)?num(a.dpaBruto):null; }
function evoDpaNeto(t, year){ var a=evoAnioM(t,year); return (a&&a.dpaNeto!=null)?num(a.dpaNeto):null; }
function evoEmpresa(t){ return evoEmpresaM(t); }
function evoYearsDisponibles(){ return (_evoData&&_evoData.years)?_evoData.years.slice():[]; }

/* --- % de crecimiento y proyección de años futuros --- */
function _evoCrec(){ return (DB.divCrecim!=null && DB.divCrecim!=='')?num(DB.divCrecim):4; }
/* % de crecimiento POR AÑO futuro (una celda por año). Si no se fija, hereda el del año
   futuro anterior; si tampoco, el default global (DB.divCrecim) o 4%. */
function _evoCrecAno(year){
  var m=DB.divCrecimAno||{}; var v=m[String(year)];
  if(v!=null&&v!==''){ var n=num(v); if(!isNaN(n)) return n; }
  var ny=new Date().getFullYear();
  if(year-1>ny) return _evoCrecAno(year-1);
  return (DB.divCrecim!=null&&DB.divCrecim!=='')?num(DB.divCrecim):4;
}
function _evoRound(x,d){ var p=Math.pow(10,d==null?4:d); return Math.round(num(x)*p)/p; }
var _EVO_RET = 0.19;   /* retención IRPF por defecto: neto = bruto × (1 − 19%) */
function _evoNeto(bruto){ return _evoRound(num(bruto)*(1-_EVO_RET),4); }
function _evoOverride(t,year){
  var o=DB.divOverride&&DB.divOverride[(t||'').toUpperCase()];
  if(o){ var v=o[String(year)]; if(v!=null&&v!==''){ var n=num(v); if(!isNaN(n)) return n; } }
  return null;
}
/* DPA bruto PROYECTADO: real del Excel > override manual > año anterior × (1+%). Cascada. */
function evoDpaProyectado(t, year){
  t=(t||'').toUpperCase();
  var ny=new Date().getFullYear(); var esFut=year>ny;
  var a=evoAnioM(t,year);
  /* Año vigente/pasado: el valor real manda (aunque sea 0). Futuro: real solo si >0 (ignora placeholders). */
  if(a && a.dpaBruto!=null && (!esFut || num(a.dpaBruto)>0)) return num(a.dpaBruto);
  if(!esFut) return null;   /* vigente/pasado sin dato real: no se proyecta */
  var ov=_evoOverride(t,year); if(ov!=null) return ov;
  if(year>2100) return null;
  var prev=evoDpaProyectado(t, year-1);
  if(prev==null||!(prev>0)) return null;
  return _evoRound(prev*(1+_evoCrecAno(year)/100),4);
}
/* Proyección automática de un año, IGNORANDO su propio override (para el placeholder de la casilla). */
function _evoAutoProj(t, year){
  var prev=evoDpaProyectado(t, year-1);
  if(prev==null||!(prev>0)) return null;
  return _evoRound(prev*(1+_evoCrecAno(year)/100),4);
}

/* --- helpers de contexto de la app --- */
function _evoHeldSet(){ try{ return (typeof heldTickerSet==='function')?heldTickerSet():new Set(); }catch(e){ return new Set(); } }
/* "Con informe" = empresas con DOSSIER DE INVERSIÓN (no todo Análisis).
   Cuenta si hay dossier real: dossiers/[T].html (_dossierSet), resumen de
   tesis dossiers/[T].json (_tesisSet), URL de dossier manual o fecha de dossier. */
function _evoInformeSet(){
  var s=new Set();
  try{ if(typeof _dossierSet!=='undefined'&&_dossierSet&&_dossierSet.forEach) _dossierSet.forEach(function(t){ if(t) s.add((''+t).toUpperCase()); }); }catch(e){}
  try{ if(typeof _tesisSet!=='undefined'&&_tesisSet&&_tesisSet.forEach) _tesisSet.forEach(function(t){ if(t) s.add((''+t).toUpperCase()); }); }catch(e){}
  (DB.analisis||[]).forEach(function(a){
    if(!a||!a.ticker) return;
    var t=(a.ticker||'').toUpperCase();
    var url=''; try{ url=(typeof dossierURL==='function')?dossierURL(t,a.dossierUrl):(a.dossierUrl||''); }catch(e){ url=a.dossierUrl||''; }
    if(url || a.dossierFecha) s.add(t);
  });
  return s;
}
/* "En plan" = empresas que aparecen en DIVERSIFICACIÓN: el lote elegido
   (DB.planLote) más cualquier empresa con compras planificadas (planCompras>0),
   igual que normaliza renderPlanLote. */
function _evoPlanSet(){
  var s=new Set();
  (DB.planLote||[]).forEach(function(t){ if(t) s.add((''+t).toUpperCase()); });
  var pc=DB.planCompras||{};
  Object.keys(pc).forEach(function(t){
    var any=Object.keys(pc[t]||{}).some(function(y){ return num(pc[t][y])>0; });
    if(any) s.add((t||'').toUpperCase());
  });
  return s;
}
function _evoPrecio(t){ try{ if(typeof _precioActualDe==='function'){ var p=_precioActualDe(t); if(p>0) return p; } }catch(e){}
  var v=(DB.valores||{})[(t||'').toUpperCase()]||{}; return num(v.precioActual); }

function _evoPf(x,d){ if(x==null||isNaN(x)) return '—'; return num(x).toFixed(d==null?4:d).replace('.',','); }
function _evoEsc(x){ if(typeof _infEsc==='function')return _infEsc(x); return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _evoFecha(s){ if(!s)return '—'; var p=(''+s).slice(0,10).split('-'); return (p.length===3)?(p[2]+'/'+p[1]+'/'+p[0]):s; }

var EVO_GRUPOS = [
  {k:'cartera',  lbl:'En cartera'},
  {k:'informe',  lbl:'Con informe'},
  {k:'plan',     lbl:'En plan'},
  {k:'condiv',   lbl:'Con dividendo'},
  {k:'sindiv',   lbl:'Sin dividendo'}
];

function renderEvoDiv(){
  var sec=document.getElementById('view-prevision'); if(!sec) return;
  var host=document.getElementById('evoApp');
  if(!host){ host=document.createElement('div'); host.id='evoApp'; sec.appendChild(host); }

  if(!_evoData){ host.innerHTML='<div class="muted" style="padding:10px">Cargando dividendos.json…</div>'; _evoCargar().then(renderEvoDiv); return; }
  _evoMigrar();   /* Opción B: registra el Excel en la app una sola vez; luego se trabaja aquí. */
  var empresas=(_evoData.empresas||[]).slice();
  /* Uni\u00f3n con Universo: cualquier empresa de la Matriz a\u00fan no en dividendos.json aparece como Pte. Revisi\u00f3n. */
  (function(){ var _seen={}; empresas.forEach(function(e){ _seen[(e.ticker||'').toUpperCase()]=1; }); var _uni=DB.universo||{}; Object.keys(_uni).forEach(function(t){ t=(t||'').toUpperCase(); if(!t||_seen[t])return; _seen[t]=1; empresas.push({ticker:t,nombre:(_uni[t]||{}).nombre||t,clasificacion:(_uni[t]||{}).arquetipo||'',paga:false,anios:{},nota:'',origenUniverso:true}); }); var _dd=DB.divData||{}; Object.keys(_dd).forEach(function(t){ t=(t||'').toUpperCase(); if(!t||_seen[t])return; _seen[t]=1; empresas.push({ticker:t,nombre:(_dd[t]||{}).nombre||t,clasificacion:'',paga:!!(_dd[t]||{}).paga,anios:{}}); }); })();
  if(!empresas.length){ host.innerHTML='<div class="empty">Aún no hay empresas. Añádelas en <b>Universo</b> (aparecerán aquí para rellenar sus dividendos) o coloca <code>dividendos.json</code> en el repo para migrarlo a la app.</div>'; return; }

  var years=(_evoData.years||[]).slice();
  var nowY=new Date().getFullYear();
  var maxData=years.length?Math.max.apply(null,years):nowY;
  var minData=years.length?Math.min.apply(null,years):2011;
  var horizon=Math.max(maxData, (DB.divHorizonte!=null?num(DB.divHorizonte):(maxData+6)));
  var allYears=[]; for(var _y=minData;_y<=horizon;_y++) allYears.push(_y);
  if(_evoYear==null){ _evoYear=(allYears.indexOf(nowY)>=0)?nowY:maxData; }
  var esFuturo = _evoYear > nowY;   /* futuro = posterior al año en vigor: proyección, sin pagos/juntas */

  var held=_evoHeldSet(), infoS=_evoInformeSet(), planS=_evoPlanSet();

  /* construir filas del año */
  var rows=empresas.map(function(e){
    var t=(e.ticker||'').toUpperCase();
    var em=evoEmpresaM(t)||e;
    var a=(!esFuturo)?evoAnioM(t,_evoYear):null;
    var dpaB, ovr=null, auto=null;
    if(esFuturo){
      ovr=_evoOverride(t,_evoYear);
      auto=_evoAutoProj(t,_evoYear);
      dpaB=(ovr!=null)?ovr:auto;
    } else {
      dpaB=a?(a.dpaBruto!=null?num(a.dpaBruto):null):null;
    }
    var precio=_evoPrecio(t);
    var rpd=(dpaB!=null&&dpaB>0&&precio>0)?(dpaB/precio*100):null;
    var isCartera=held.has(t), isInforme=infoS.has(t), isPlan=planS.has(t);
    var paga=!!(em&&em.paga);
    /* prioridad de orden: cartera(0) informe(1) plan sin informe(2) resto con div por RPD(3) sin div(4) */
    var rank;
    if(isCartera) rank=0; else if(isInforme) rank=1; else if(isPlan) rank=2; else if(paga) rank=3; else rank=4;
    return {e:em,t:t,a:a,dpaB:dpaB,ovr:ovr,auto:auto,precio:precio,rpd:rpd,paga:paga,
      isCartera:isCartera,isInforme:isInforme,isPlan:isPlan,rank:rank,
      junta:a?a.junta:null,nombre:(em&&em.nombre)||e.nombre||t};
  });

  /* filtro de grupos (aditivo). Sin ninguno activo => todas. */
  var activos=Object.keys(_evoGroups).filter(function(k){return _evoGroups[k];});
  if(activos.length){
    rows=rows.filter(function(r){
      return activos.some(function(k){
        if(k==='cartera')return r.isCartera;
        if(k==='informe')return r.isInforme;
        if(k==='plan')return r.isPlan;
        if(k==='condiv')return r.paga;
        if(k==='sindiv')return !r.paga;
        return false;
      });
    });
  }

  /* orden: rank, luego RPD desc, luego nombre */
  rows.sort(function(x,y){
    if(x.rank!==y.rank)return x.rank-y.rank;
    var xr=(x.rpd==null?-1:x.rpd), yr=(y.rpd==null?-1:y.rpd);
    if(yr!==xr)return yr-xr;
    return x.t.localeCompare(y.t);
  });

  /* KPIs */
  var pag=rows.filter(function(r){return r.dpaB!=null&&r.dpaB>0;});
  var rpdList=rows.filter(function(r){return r.rpd!=null;});
  var rpdMed=rpdList.length?rpdList.reduce(function(s,r){return s+r.rpd;},0)/rpdList.length:0;
  var kpi=function(l,v){ return '<div style="background:#f8fafc;border:1px solid var(--line);border-radius:6px;padding:2px 8px;font-size:11px;white-space:nowrap"><span class="muted">'+l+':</span> <b>'+v+'</b></div>'; };
  var kpis='<div style="display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 4px">'
    +kpi('Empresas', String(rows.length))
    +kpi('Con dividendo '+_evoYear, String(pag.length))
    +kpi('RPD media', _evoPf(rpdMed,2)+'%')
    +kpi(esFuturo?'Crecim.':'Actualizado', esFuturo?(_evoPf(_evoCrecAno(_evoYear),1)+'%/año'):_evoEsc((_evoData.actualizado||'—')))
    +'</div>';

  /* selector de año (con futuros) + "+ año" + chips de grupo + buscador */
  var yearSel='<select id="evoYearSel" style="margin-left:6px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px">'
    +allYears.slice().reverse().map(function(y){ return '<option value="'+y+'"'+(y===_evoYear?' selected':'')+'>'+y+(y>maxData?' · proyec.':(y>nowY?' · prev':''))+'</option>'; }).join('')
    +'</select>';
  var chips=EVO_GRUPOS.map(function(g){ var on=!!_evoGroups[g.k];
    return '<button class="btn sm" data-evogrp="'+g.k+'" style="border:1px solid '+(on?'var(--brand)':'var(--line)')+';background:'+(on?'#eff6ff':'#fff')+';color:'+(on?'var(--brand)':'inherit')+';font-weight:'+(on?'700':'400')+'">'+g.lbl+'</button>';
  }).join(' ');
  var toolbar='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0">'
    +'<button class="btn sm" id="evoAddYear" title="Añadir un año futuro para proyectar">+ año</button>'
    +'<span style="display:flex;gap:5px;flex-wrap:wrap">'+chips+'</span>'
    +'<input type="search" id="evoSearch" placeholder="Buscar nombre o ticker…" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px;min-width:180px">'
    +'<button class="btn sm" id="evoExport" title="Descargar dividendos.json con todos los datos de la app (para regenerar el Excel)">⬇️ Exportar</button>'
    +'</div>';
  var yearTag=(_evoYear>nowY)?' <span style="font-size:11px;color:#92400e">· proyección</span>':'';
  var yearSlider='<div style="display:flex;align-items:center;gap:12px;margin:2px 0 12px;flex-wrap:wrap">'
    +'<span style="font-size:13px;font-weight:700;color:#1f3d6b;min-width:150px">Año: <span id="evoYearLbl" style="font-size:17px">'+_evoYear+'</span><span id="evoYearTag">'+yearTag+'</span></span>'
    +'<input type="range" id="evoYearRange" min="'+minData+'" max="'+horizon+'" step="1" value="'+_evoYear+'" style="flex:1;min-width:220px;max-width:560px;accent-color:#1f3d6b">'
    +'<span class="muted" style="font-size:11px">'+minData+' – '+horizon+'</span>'
    +'</div>';

  /* control de crecimiento (solo en años futuros) */
  var futuroCtrl = esFuturo
    ? '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 10px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">'
      +'<span style="font-size:13px;font-weight:700;color:#92400e">📈 Proyección '+_evoYear+'</span>'
      +'<label style="font-size:13px">Crecimiento de '+_evoYear+' (desde '+(_evoYear-1)+') <input type="number" id="evoCrecim" step="0.5" value="'+_evoCrecAno(_evoYear)+'" style="width:64px;text-align:right;padding:3px 6px;border:1px solid var(--line);border-radius:6px">%</label>'
      +'<span class="muted" style="font-size:12px">DPA '+_evoYear+' = dividendo '+(_evoYear-1)+' × (1+%). Cada año futuro tiene su propio %. Escribe en la casilla de una empresa para <b>pisar</b> su estimación.</span>'
      +'</div>'
    : '';

  /* tabla */
  var _grpBadge=function(r){
    if(r.isCartera)return '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:6px">cartera</span>';
    if(r.isInforme)return '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 5px;border-radius:6px">informe</span>';
    if(r.isPlan)return '<span style="font-size:9px;background:#fef9c3;color:#854d0e;padding:1px 5px;border-radius:6px">plan</span>';
    if(r.e&&r.e.origenUniverso)return '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px">Pte. Revisi\u00f3n</span>';
    if(!r.paga)return '<span style="font-size:9px;background:#f1f5f9;color:#64748b;padding:1px 5px;border-radius:6px">no paga</span>';
    return '';
  };
  var trs=rows.map(function(r){
    var open=!!_evoOpen[r.t];
    var rpdTxt=r.rpd!=null?(_evoPf(r.rpd,2)+'%'):'—';
    var rpdCol=r.rpd==null?'#94a3b8':(r.rpd>=5?'#16a34a':(r.rpd>=3.5?'#2563eb':'#475569'));
    var divCell;
    if(esFuturo){
      var ph=(r.auto!=null)?_evoPf(r.auto,4):'—';
      divCell='<td class="num"><input type="number" step="0.0001" data-ovr="'+_evoEsc(r.t)+'|'+_evoYear+'" value="'+(r.ovr!=null?r.ovr:'')+'" placeholder="'+ph+'" title="Proyección: '+ph+' €. Escribe para pisar; vacía para volver a la proyección." style="width:86px;text-align:right;border:1px solid '+(r.ovr!=null?'#d97706':'var(--line)')+';border-radius:6px;padding:2px 5px;font-size:12px;background:'+(r.ovr!=null?'#fffbeb':'#fff')+'"></td>';
    } else {
      divCell='<td class="num" style="font-weight:600">'+(r.dpaB!=null?_evoPf(r.dpaB,4)+' €':'—')+'</td>';
    }
    var main='<tr class="evo-main" data-evorow="'+_evoEsc(r.t)+'" data-fs="'+_evoEsc((r.t+' '+r.nombre).toLowerCase())+'" style="cursor:pointer'+(r.isCartera?';background:#f8fbff':'')+'">'
      +'<td style="text-align:center;color:#94a3b8">'+(open?'▾':'▸')+'</td>'
      +'<td><b data-ficha="'+_evoEsc(r.t)+'" style="cursor:pointer;color:var(--brand)">'+_evoEsc(r.t)+'</b> <span class="muted" style="font-size:11px">'+_evoEsc((r.nombre||'').slice(0,26))+'</span> '+_grpBadge(r)+((r.e&&r.e.nota)?' <span title="'+_evoEsc(r.e.nota)+'" style="cursor:help">📝</span>':'')+'</td>'
      +divCell
      +'<td class="num" style="font-weight:700;color:'+rpdCol+'">'+rpdTxt+'</td>'
      +'<td>'+_evoFecha(r.junta)+'</td>'
      +'</tr>';
    var det='';
    if(open){
      det='<tr class="evo-det"><td></td><td colspan="4" style="background:#f8fafc;padding:8px 10px">'+_evoDetalleHTML(r)+'</td></tr>';
    }
    return main+det;
  }).join('');

  var thDiv = esFuturo ? 'Dividendo proyectado (bruto)' : 'Dividendo total (bruto)';
  var _thS='position:sticky;top:0;background:#fff;z-index:2;box-shadow:inset 0 -1px 0 var(--line)';
  var tabla='<div id="evoScroll" style="overflow:auto;border:1px solid var(--line);border-radius:8px;flex:1 1 auto;min-height:0"><table><thead><tr>'
    +'<th style="width:24px;'+_thS+'"></th><th style="'+_thS+'">Empresa</th>'
    +'<th class="num" style="'+_thS+'">'+thDiv+'</th>'
    +'<th class="num" style="'+_thS+'">RPD vs cotización</th>'
    +'<th style="'+_thS+'">Junta</th></tr></thead><tbody>'+trs+'</tbody></table></div>';

  var nota = esFuturo
    ? '<div class="muted" style="font-size:11px;margin-top:8px">Año <b>futuro</b> (posterior al vigente): el dividendo se <b>proyecta</b> = dividendo del año anterior × (1 + % de <b>este</b> año). Cada año futuro tiene su propio %. '
      +'Edita la casilla de una empresa para <b>pisar</b> su estimación; vacíala para volver a la proyección. Con «+ año» amplías el horizonte sin límite. '
      +'Aquí no se registran pagos ni juntas (eso al pasar a año en vigor). Estos valores <b>alimentan el Simulador</b> de cartera. RPD = dividendo proyectado ÷ cotización actual.</div>'
    : '<div class="muted" style="font-size:11px;margin-top:8px">Dividendo total y RPD en <b>bruto</b> (RPD = dividendo bruto ÷ cotización actual). '
      +'Orden: en cartera → con informe → en plan → resto por RPD → sin dividendo. Pulsa una fila para ver el detalle y «✏️ Editar dividendos» para añadir/editar pagos, junta y totales. '
      +'La <b>app es la base de datos</b>: todo se guarda aquí (Drive). Usa <b>⬇️ Exportar</b> para descargar <code>dividendos.json</code> y regenerar el Excel. No es recomendación de compra.</div>';

  host.innerHTML='<div style="font-size:16px;font-weight:800;color:#1f3d6b;margin-bottom:2px">📅 Evolución del Dividendo</div>'
    +kpis+toolbar+yearSlider+futuroCtrl+tabla+nota;

  /* wiring */
  var ys=document.getElementById('evoYearSel');
  if(ys) ys.addEventListener('change',function(){ _evoYear=parseInt(this.value,10)||_evoYear; renderEvoDiv(); });
  var ay=document.getElementById('evoAddYear');
  if(ay) ay.addEventListener('click',function(){ var h=Math.max(maxData,(DB.divHorizonte!=null?num(DB.divHorizonte):(maxData+6))); DB.divHorizonte=h+1; if(typeof scheduleSave==='function')scheduleSave(); _evoYear=DB.divHorizonte; renderEvoDiv(); });
  var cr=document.getElementById('evoCrecim');
  if(cr) cr.addEventListener('change',function(){ DB.divCrecimAno=DB.divCrecimAno||{}; var vv=(this.value||'').trim(); if(vv==='') delete DB.divCrecimAno[String(_evoYear)]; else DB.divCrecimAno[String(_evoYear)]=num(vv.replace(',','.')); if(typeof scheduleSave==='function')scheduleSave(); renderEvoDiv(); });
  var exb=document.getElementById('evoExport');
  if(exb) exb.addEventListener('click',function(){ evoExportarJSON(); });
  var yrg=document.getElementById('evoYearRange');
  if(yrg){ yrg.addEventListener('input',function(){ var lbl=document.getElementById('evoYearLbl'); if(lbl)lbl.textContent=this.value; var tg=document.getElementById('evoYearTag'); if(tg){ var vy=parseInt(this.value,10); tg.innerHTML=(vy>nowY)?' <span style="font-size:11px;color:#92400e">· proyección</span>':''; } });
    yrg.addEventListener('change',function(){ _evoYear=parseInt(this.value,10)||_evoYear; renderEvoDiv(); }); }
  host.querySelectorAll('[data-evogrp]').forEach(function(b){ b.addEventListener('click',function(){ var k=b.getAttribute('data-evogrp'); _evoGroups[k]=!_evoGroups[k]; renderEvoDiv(); }); });
  host.querySelectorAll('input[data-ovr]').forEach(function(inp){
    inp.addEventListener('click',function(e){ e.stopPropagation(); });
    inp.addEventListener('change',function(){
      var p=(this.getAttribute('data-ovr')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1];
      DB.divOverride=DB.divOverride||{}; DB.divOverride[t]=DB.divOverride[t]||{};
      var v=(this.value||'').trim();
      if(v==='') delete DB.divOverride[t][y]; else DB.divOverride[t][y]=num(v.replace(',','.'));
      if(DB.divOverride[t]&&!Object.keys(DB.divOverride[t]).length) delete DB.divOverride[t];
      if(typeof scheduleSave==='function')scheduleSave();
      renderEvoDiv();
    });
  });
  /* --- edición de dividendos (capa DB.divData) --- */
  host.querySelectorAll('[data-evoedit]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); var t=(b.getAttribute('data-evoedit')||'').toUpperCase(); _evoEdit[t]=!_evoEdit[t]; _evoOpen[t]=true; renderEvoDiv(); }); });
  host.querySelectorAll('[data-dpaga]').forEach(function(c){ c.addEventListener('click',function(e){ e.stopPropagation(); }); c.addEventListener('change',function(){ var t=(this.getAttribute('data-dpaga')||'').toUpperCase(); var o=_evoEnsure(t,null); o.paga=this.checked; _evoSave(t); }); });
  host.querySelectorAll('[data-df]').forEach(function(inp){ inp.addEventListener('click',function(e){ e.stopPropagation(); }); inp.addEventListener('change',function(){ var p=(this.getAttribute('data-df')||'').split('|'); var t=(p[0]||'').toUpperCase(); var f=p[1]; var o=_evoEnsure(t,null); var v=(this.value||'').trim(); if(v==='') delete o[f]; else o[f]=v; _evoSave(t); }); });
  host.querySelectorAll('[data-dy]').forEach(function(inp){ inp.addEventListener('click',function(e){ e.stopPropagation(); }); inp.addEventListener('change',function(){ var p=(this.getAttribute('data-dy')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; var f=p[2]; var ay=_evoEnsure(t,y); var v=(this.value||'').trim(); if(v==='') delete ay[f]; else ay[f]=(f==='dpaBruto'||f==='dpaNeto')?num(v.replace(',','.')):v; if(f==='dpaBruto'){ if(v==='') delete ay.dpaNeto; else ay.dpaNeto=_evoNeto(num(v.replace(',','.'))); } _evoSave(t); }); });
  host.querySelectorAll('[data-dp]').forEach(function(inp){ inp.addEventListener('click',function(e){ e.stopPropagation(); }); inp.addEventListener('change',function(){ var p=(this.getAttribute('data-dp')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; var idx=+p[2]; var f=p[3]; _evoPagosSeed(t,y); var ay=_evoEnsure(t,y); if(!ay.pagos[idx])return; var v=(this.value||'').trim(); ay.pagos[idx][f]=(f==='bruto'||f==='neto')?num(v.replace(',','.')):v; if(f==='bruto' && !(num(ay.pagos[idx].neto)>0)) ay.pagos[idx].neto=_evoNeto(num(v.replace(',','.'))); _evoSave(t); }); });
  host.querySelectorAll('[data-dpadd]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); var p=(b.getAttribute('data-dpadd')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; _evoPagosSeed(t,y); var ay=_evoEnsure(t,y); ay.pagos.push({exDiv:'',pago:'',bruto:0,neto:0,tipo:'ordinario'}); _evoEdit[t]=true; _evoOpen[t]=true; _evoSave(t); }); });
  host.querySelectorAll('[data-dpdel]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); var p=(b.getAttribute('data-dpdel')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; var idx=+p[2]; _evoPagosSeed(t,y); var ay=_evoEnsure(t,y); ay.pagos.splice(idx,1); _evoSave(t); }); });
  host.querySelectorAll('[data-dyb]').forEach(function(c){ c.addEventListener('click',function(e){ e.stopPropagation(); }); c.addEventListener('change',function(){ var p=(this.getAttribute('data-dyb')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; var f=p[2]; var ay=_evoEnsure(t,y); ay[f]=this.checked; _evoSave(t); }); });
  host.querySelectorAll('[data-dpb]').forEach(function(c){ c.addEventListener('click',function(e){ e.stopPropagation(); }); c.addEventListener('change',function(){ var p=(this.getAttribute('data-dpb')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; var idx=+p[2]; var f=p[3]; _evoPagosSeed(t,y); var ay=_evoEnsure(t,y); if(!ay.pagos[idx])return; ay.pagos[idx][f]=this.checked; _evoSave(t); }); });
  host.querySelectorAll('[data-dpsuma]').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); var p=(b.getAttribute('data-dpsuma')||'').split('|'); var t=(p[0]||'').toUpperCase(); var y=p[1]; var s=_evoSumaPagos(evoAnioM(t,y)); var ay=_evoEnsure(t,y); ay.dpaBruto=s.bruto; ay.dpaNeto=s.neto; _evoSave(t); }); });
  host.querySelectorAll('tr.evo-main').forEach(function(tr){ tr.addEventListener('click',function(e){
    if(e.target.closest('[data-ficha]')) return;   /* el clic en el ticker abre la ficha */
    if(e.target.closest('input')) return;          /* el clic en la casilla de override no despliega */
    var t=(tr.getAttribute('data-evorow')||'').toUpperCase(); if(!t)return;
    _evoOpen[t]=!_evoOpen[t]; renderEvoDiv();
  }); });
  if(typeof _wireBuscador==='function'){ _wireBuscador(document.getElementById('evoSearch'), host.querySelectorAll('tbody tr.evo-main[data-fs]'), _evoBusca); }
  _evoFit();
  if(!window._evoFitBound){ window._evoFitBound=true; window.addEventListener('resize',_evoFit); }
}

function _evoTipoOpts(sel){ var opts=['ordinario','complementario','a cuenta','extraordinario','scrip','único']; sel=(sel||''); var h='<option value=""></option>'; opts.forEach(function(o){ h+='<option value="'+o+'"'+(o===sel?' selected':'')+'>'+o+'</option>'; }); if(sel&&opts.indexOf(sel)<0)h+='<option value="'+_evoEsc(sel)+'" selected>'+_evoEsc(sel)+'</option>'; return h; }
function _evoEditHTML(r){
  var t=r.t, Y=_evoYear, esc=_evoEsc;
  var em=evoEmpresaM(t)||{}; var a=evoAnioM(t,Y)||{}; var ovy=_evoOvYear(t,Y)||{};
  var fld=function(lbl,attrs,val,ph,w){ return '<label style="font-size:11px;display:inline-flex;flex-direction:column;gap:2px;margin:0 8px 6px 0;color:#475569">'+lbl+'<input '+attrs+' value="'+esc(val==null?'':val)+'"'+(ph?(' placeholder="'+esc(ph)+'"'):'')+' style="width:'+(w||110)+'px;padding:3px 5px;border:1px solid var(--line);border-radius:5px;font-size:12px"></label>'; };
  var comp='<div style="margin-bottom:8px">'
    +'<div style="font-weight:700;font-size:12px;color:#1f3d6b;margin-bottom:4px">Empresa</div>'
    +'<label style="font-size:11px;margin-right:10px"><input type="checkbox" data-dpaga="'+esc(t)+'"'+(em.paga?' checked':'')+'> Paga dividendo</label>'
    +fld('Nombre','data-df="'+esc(t)+'|nombre" type="text"', em.nombre||'', t, 150)
    +fld('Moneda','data-df="'+esc(t)+'|moneda" type="text"', em.moneda||'', 'EUR', 60)
    +fld('Domicilio fiscal','data-df="'+esc(t)+'|domicilioFiscal" type="text"', em.domicilioFiscal||'', '', 130)
    +'<label style="font-size:11px;display:flex;flex-direction:column;gap:2px;color:#475569">Nota<textarea data-df="'+esc(t)+'|nota" rows="2" style="width:100%;padding:3px 5px;border:1px solid var(--line);border-radius:5px;font-size:12px">'+esc(em.nota||'')+'</textarea></label>'
    +'</div>';
  var yr='<div style="margin-bottom:8px">'
    +'<div style="font-weight:700;font-size:12px;color:#1f3d6b;margin-bottom:4px">Año '+Y+'</div>'
    +fld('Junta','data-dy="'+esc(t)+'|'+Y+'|junta" type="date"', (a.junta||'').slice(0,10), '', 150)
    +fld('Presentación resultados','data-dy="'+esc(t)+'|'+Y+'|presentacionResultados" type="date"', (a.presentacionResultados||'').slice(0,10), '', 150)
    +fld('Naturaleza','data-dy="'+esc(t)+'|'+Y+'|naturaleza" type="text"', a.naturaleza||'', 'ordinario', 120)
    +fld('Total bruto (€)','data-dy="'+esc(t)+'|'+Y+'|dpaBruto" type="number" step="0.0001"', (a.dpaBruto!=null?a.dpaBruto:''), '', 110)
    +'<span style="font-size:11px;color:#475569;margin:0 8px 6px 0;display:inline-flex;flex-direction:column;gap:2px">Total neto (auto −19%)<span style="padding:3px 5px;font-size:12px;font-weight:700;background:#f8fafc;border:1px solid var(--line);border-radius:5px;min-width:96px;text-align:right">'+((a.dpaNeto!=null)?_evoPf(a.dpaNeto,4)+' €':'—')+'</span></span>'
    +'<label style="font-size:11px;margin-right:10px"><input type="checkbox" data-dyb="'+esc(t)+'|'+Y+'|totalPrevisto"'+(a.totalPrevisto?' checked':'')+'> Total en previsión</label>'
    +'<button class="btn sm" data-dpsuma="'+esc(t)+'|'+Y+'" title="Poner el total = suma de los pagos" style="font-size:11px">= usar suma de pagos</button>'
    +'<label style="font-size:11px;display:flex;flex-direction:column;gap:2px;color:#475569;margin-top:4px">Nota de la previsión<textarea data-dy="'+esc(t)+'|'+Y+'|notaTotal" rows="1" style="width:100%;padding:3px 5px;border:1px solid var(--line);border-radius:5px;font-size:12px">'+esc(a.notaTotal||'')+'</textarea></label>'
    +'<div class="muted" style="font-size:11px">El <b>total</b> es independiente de los pagos. Márcalo <b>en previsión</b> (con nota) hasta confirmar los pagos con sus fechas ex-dividendo y de pago.</div>'
    +_evoControlHTML(a)
    +'</div>';
  var pagos=a.pagos||[];
  var inpS='width:100%;padding:2px 4px;border:1px solid var(--line);border-radius:4px;font-size:11px';
  var prows=pagos.map(function(p,i){ return '<tr>'
    +'<td style="text-align:center;color:#94a3b8">'+(i+1)+'</td>'
    +'<td><input type="date" data-dp="'+esc(t)+'|'+Y+'|'+i+'|exDiv" value="'+esc((p.exDiv||'').slice(0,10))+'" style="'+inpS+'"></td>'
    +'<td><input type="date" data-dp="'+esc(t)+'|'+Y+'|'+i+'|pago" value="'+esc((p.pago||'').slice(0,10))+'" style="'+inpS+'"></td>'
    +'<td><input type="number" step="0.0001" data-dp="'+esc(t)+'|'+Y+'|'+i+'|bruto" value="'+esc(p.bruto==null?'':p.bruto)+'" style="'+inpS+';text-align:right"></td>'
    +'<td><input type="number" step="0.0001" data-dp="'+esc(t)+'|'+Y+'|'+i+'|neto" value="'+esc(p.neto==null?'':p.neto)+'" style="'+inpS+';text-align:right"></td>'
    +'<td><select data-dp="'+esc(t)+'|'+Y+'|'+i+'|tipo" style="'+inpS+'">'+_evoTipoOpts(p.tipo)+'</select><div style="margin-top:2px">'+_evoTipoBadge(p.tipo,p.previsto)+'</div></td>'
    +'<td style="text-align:center"><input type="checkbox" data-dpb="'+esc(t)+'|'+Y+'|'+i+'|previsto"'+(p.previsto?' checked':'')+' title="Pago previsto (sin confirmar)"></td>'
    +'<td><button class="btn sm" data-dpdel="'+esc(t)+'|'+Y+'|'+i+'" title="Borrar pago" style="color:#dc2626">✕</button></td>'
    +'</tr>'; }).join('');
  var pag='<div style="font-weight:700;font-size:12px;color:#1f3d6b;margin-bottom:4px">Pagos '+Y+'</div>'
    +'<div style="overflow:auto"><table style="width:100%;font-size:11px"><thead><tr><th>#</th><th>Ex-dividendo</th><th>Pago</th><th class="num">Bruto (€)</th><th class="num">Neto (€)</th><th>Tipo</th><th title="Pago previsto sin confirmar">Prev.</th><th></th></tr></thead><tbody>'+(prows||'<tr><td colspan="8" class="muted" style="padding:6px">Sin pagos aún. Añade el primero.</td></tr>')+'</tbody></table></div>'
    +'<button class="btn sm" data-dpadd="'+esc(t)+'|'+Y+'" style="margin-top:5px">+ Añadir pago</button>';
  return '<div style="border:1px dashed #93c5fd;border-radius:8px;padding:10px;margin-top:4px;background:#fff">'+comp+yr+pag+'</div>';
}
function _evoDetalleHTML(r){
  var t=r.t;
  var _nowY=new Date().getFullYear(); var esFut=_evoYear>_nowY;
  var editBtn=esFut?'':('<button class="btn sm" data-evoedit="'+_evoEsc(t)+'" style="float:right;font-size:11px;'+(_evoEdit[t]?'background:#1f3d6b;color:#fff;':'')+'">'+(_evoEdit[t]?'✓ Cerrar edición':'✏️ Editar dividendos')+'</button><div style="clear:both"></div>');
  if(!esFut && _evoEdit[t]) return editBtn+_evoEditHTML(r);
  var a=r.a;
  var notaHTML=(r.e&&r.e.nota)?'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:12px;color:#9a3412">📝 '+_evoEsc(r.e.nota)+'</div>':'';
  if(!a){ return editBtn+notaHTML+'<span class="muted" style="font-size:12px">'+((r.dpaB!=null)?('Dividendo <b>estimado</b> '+_evoYear+': <b>'+_evoPf(r.dpaB,4)+' €</b>'+(r.ovr!=null?' (pisado a mano)':' (proyección '+_evoPf(_evoCrecAno(_evoYear),1)+'%/año desde '+(_evoYear-1)+')')+'. Los pagos, la junta y demás se rellenan cuando el año pase a ser el vigente.'):('Sin datos de dividendo para '+_evoYear+'.'+(esFut?'':' Pulsa «✏️ Editar dividendos» para añadirlos a mano.')))+'</span>'; }
  var meta=[];
  if(a.naturaleza) meta.push('Naturaleza: <b>'+_evoEsc(a.naturaleza)+'</b>');
  if(a.nPagos) meta.push('Nº pagos: <b>'+a.nPagos+'</b>');
  if(a.racha) meta.push('Racha: <b>'+a.racha+' años</b>');
  if(a.deltaPct!=null) meta.push('Δ vs año ant.: <b>'+((a.deltaPct>=0?'+':'')+(num(a.deltaPct)*100).toFixed(1)+'%')+'</b>');
  if(a.dpaNeto!=null) meta.push('DPA neto: <b>'+_evoPf(a.dpaNeto,4)+' €</b>');
  if(a.primaAsistencia) meta.push('Prima junta: <b>'+_evoPf(a.primaAsistencia,4)+' €</b>');
  meta.push('Presentación resultados: <b>'+_evoFecha(a.presentacionResultados)+'</b>');
  var metaHTML='<div style="font-size:12px;margin-bottom:6px;color:#334155">'+meta.join(' &nbsp;·&nbsp; ')+'</div>';
  var pagos=a.pagos||[];
  var pagosHTML;
  if(!pagos.length){ pagosHTML='<span class="muted" style="font-size:12px">Sin pagos registrados este año.</span>'; }
  else {
    pagosHTML='<table style="width:auto;font-size:12px"><thead><tr>'
      +'<th>#</th><th>Ex-dividendo</th><th>Pago</th><th class="num">Bruto (€)</th><th class="num">Neto (€)</th><th>Tipo</th></tr></thead><tbody>'
      +pagos.map(function(p,i){ return '<tr><td>'+(i+1)+'</td><td>'+_evoFecha(p.exDiv)+'</td><td>'+_evoFecha(p.pago)+'</td>'
        +'<td class="num">'+_evoPf(p.bruto,4)+'</td><td class="num">'+_evoPf(p.neto,4)+'</td><td>'+_evoTipoBadge(p.tipo,p.previsto)+'</td></tr>'; }).join('')
      +'</tbody></table>';
  }
  return editBtn+notaHTML+metaHTML+_evoControlHTML(a)+pagosHTML;
}
