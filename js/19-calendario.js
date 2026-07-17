/* ============================================================
   CALENDARIO DERIVADO — Motor de eventos (Fase 1)
   -------------------------------------------------------------
   Sustituye el calendario MANUAL (DB.eventos mes/semana + DB.divReparto %)
   por eventos DERIVADOS de una sola verdad, con fechas exactas:

     · Ex-dividendo / Pago / Junta / Resultados anuales  ← evoAnioM(t,year)
       (dividendos.json + tu capa editable DB.divData; ver 18-evodiv.js)
     · Informes trimestrales                              ← -trim.json
       (_cadTrim / _cadenciaDe en 13-radar.js) + próximo estimado (agenda.json)

   Selección temporal: cualquier año.
     · Pasado/vigente  → fechas e importes REALES (acciones a la fecha del pago).
     · Futuro          → PROYECTADO desde el Plan Inversor:
                          acciones = simEffShares(t,year); DPA = evoDpaProyectado(t,year);
                          fechas = patrón del último año con pagos conocido.

   Este archivo SOLO define funciones (motor). No pinta nada todavía.
   ============================================================ */

var CAL_TIPOS = {
  exdiv: { lbl:'Ex-div',  col:'#d97706' },
  pago:  { lbl:'Pago',    col:'#16a34a' },
  junta: { lbl:'Junta',   col:'#c2410c' },
  res:   { lbl:'Result.', col:'#2563eb' }
};
/* etiqueta visible del periodo de resultados (Q2→H1, etc.) */
var _CAL_QLBL = (typeof _QLABEL!=='undefined') ? _QLABEL : {Q1:'Q1',Q2:'H1',Q3:'9M',Q4:'FY'};

function _calNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _calNowY(){ return new Date().getFullYear(); }
function _calHoy(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

/* ---- conjuntos de empresas ---- */
function _calHeld(){ try{ return (typeof heldTickerSet==='function')?heldTickerSet():new Set(); }catch(e){ return new Set(); } }
function _calPrev(){ var h=_calHeld(); return (DB.planLote||[]).map(function(x){return (x||'').toUpperCase();}).filter(function(t){ return t && !h.has(t); }); }
function calTickers(){ var out=[]; var h=[]; _calHeld().forEach(function(t){h.push(t);}); h.concat(_calPrev()).forEach(function(t){ if(t && out.indexOf(t)<0) out.push(t); }); return out; }
function _calGrp(t){ return _calHeld().has((t||'').toUpperCase()) ? 'cartera' : 'prevista'; }

/* ---- periodo canónico Q1..Q4 desde cualquier token ---- */
function _calQ(p){
  if(p==null) return '';
  if(typeof _qtoken==='function'){ var q=_qtoken(p); if(q) return q; }
  var s=(''+p).toUpperCase();
  if(/Q4|FY|12M|ANUAL/.test(s)) return 'Q4';
  if(/Q3|9M/.test(s)) return 'Q3';
  if(/Q2|S1|H1|1S|1H|6M|SEM/.test(s)) return 'Q2';
  if(/Q1|3M|1T/.test(s)) return 'Q1';
  return '';
}

/* ---- acciones REALES a una fecha (pasado/vigente): compras − ventas ≤ fecha ---- */
function _calSharesAt(t, fecha){
  t=(t||'').toUpperCase(); if(!fecha) return 0;
  var ops=(DB.operaciones||[]).filter(function(o){ return (o.ticker||'').toUpperCase()===t; });
  var sh=0;
  ops.forEach(function(o){ if((o.fecha||'') <= fecha){ var n=_calNum(o.acciones); sh += (o.tipo==='venta' ? -n : n); } });
  return sh<0?0:sh;
}
/* ---- acciones PREVISTAS para un AÑO (Plan/Simulador: reales a hoy + compras planificadas) ---- */
function _calSharesYear(t, year){
  if(typeof simEffShares==='function'){ try{ var s=simEffShares((t||'').toUpperCase(), year, _calNowY()); if(s!=null) return _calNum(s); }catch(e){} }
  return _calSharesAt(t, year+'-12-31');
}
/* ---- acciones para un EVENTO: fecha pasada → reales a la fecha; fecha futura → previstas del Plan ---- */
function _calShEvento(t, fecha, year){
  var f=(fecha||'').slice(0,10);
  if(f && f <= _calHoy()) return _calSharesAt(t, f);
  return _calSharesYear(t, year);
}

/* ---- año más reciente ≤ límite con pagos con fecha (para proyectar el patrón) ---- */
function _calUltimoAnioConPagos(t, limite){
  if(typeof evoAnioM!=='function') return null;
  for(var y=limite; y>=2005; y--){
    var a=evoAnioM(t, y); if(!a) continue;
    var pag=(a.pagos||[]).filter(function(p){ return p.pago || p.exDiv; });
    if(pag.length) return { year:y, pagos:pag, a:a };
  }
  return null;
}

/* ============================================================
   EVENTOS DE DIVIDENDO (ex-div + pago) para una empresa y AÑO
   Real si evoAnioM tiene pagos con fecha; si el año es futuro y no hay
   fechas, se PROYECTA con el patrón del último año conocido escalado a
   evoDpaProyectado (acciones = simEffShares).
   ============================================================ */
function _calEvDiv(t, year){
  t=(t||'').toUpperCase(); var out=[]; if(typeof evoAnioM!=='function') return out;
  var a=evoAnioM(t, year);
  var pagosReales = (a && a.pagos) ? a.pagos.filter(function(p){ return p.pago || p.exDiv; }) : [];

  if(pagosReales.length){
    pagosReales.forEach(function(p){
      var prev=!!p.previsto; var bruto=_calNum(p.bruto);
      var shEx = _calShEvento(t, p.exDiv, year);
      var shPg = _calShEvento(t, p.pago,  year);
      if(p.exDiv) out.push({ t:t, fecha:(''+p.exDiv).slice(0,10), tipo:'exdiv', periodo:'', imp:bruto, sh:shEx, previsto:prev, proyectado:false });
      if(p.pago ) out.push({ t:t, fecha:(''+p.pago ).slice(0,10), tipo:'pago',  periodo:'', imp:bruto, sh:shPg, previsto:prev, proyectado:false });
    });
    return out;
  }

  /* ---- proyección de año futuro sin fechas propias ---- */
  if(year <= _calNowY()) return out;                 /* pasado/vigente sin datos: nada */
  /* MISMA cascada que simDpa del Simulador: evoDpaProyectado y, si falta, DB.divPorAccion */
  var dpa = (typeof evoDpaProyectado==='function') ? evoDpaProyectado(t, year) : null;
  if(dpa==null){ var _dp=(DB.divPorAccion||{})[(t||'').toUpperCase()]; if(_dp && _dp[year]!=null) dpa=_calNum(_dp[year]); }
  if(!(dpa>0)) return out;
  var base = _calUltimoAnioConPagos(t, year-1);
  if(!base) return out;
  var sumBase = base.pagos.reduce(function(s,p){ return s + _calNum(p.bruto); }, 0);
  var sh = _calSharesYear(t, year);
  base.pagos.forEach(function(p){
    var frac = sumBase>0 ? _calNum(p.bruto)/sumBase : (1/base.pagos.length);
    var brutoProj = Math.round(dpa * frac * 10000) / 10000;   /* limita a 4 decimales el importe/acción proyectado */
    function shift(f){ if(!f) return ''; var mmdd=(''+f).slice(5,10); return year+'-'+mmdd; }
    var fx=shift(p.exDiv), fp=shift(p.pago);
    if(fx) out.push({ t:t, fecha:fx, tipo:'exdiv', periodo:'', imp:brutoProj, sh:sh, previsto:true, proyectado:true });
    if(fp) out.push({ t:t, fecha:fp, tipo:'pago',  periodo:'', imp:brutoProj, sh:sh, previsto:true, proyectado:true });
  });
  return out;
}

/* ---- junta + resultados anuales (presentación) desde evoAnioM ---- */
function _calEvJuntaRes(t, year){
  t=(t||'').toUpperCase(); var out=[]; if(typeof evoAnioM!=='function') return out;
  var a=evoAnioM(t, year); if(!a) return out;
  if(a.junta) out.push({ t:t, fecha:(''+a.junta).slice(0,10), tipo:'junta', periodo:'', imp:0, sh:0, proyectado:false });
  if(a.presentacionResultados) out.push({ t:t, fecha:(''+a.presentacionResultados).slice(0,10), tipo:'res', periodo:'Q4', imp:0, sh:0, fuente:'divData', estimado:false, proyectado:false });
  return out;
}

/* Patrón de publicación por trimestre canónico: MM-DD del informe MÁS RECIENTE de cada Q
   (Q1/Q2/Q3/Q4). Respeta el año fiscal de cada empresa (p.ej. Logista Q4≈11-03, IBE Q4≈02-26).
   Sirve para PROYECTAR la cadencia completa del año, no solo el próximo informe. */
function _calPatronTrim(t){
  var d=(typeof _cadTrim!=='undefined' && _cadTrim) ? _cadTrim[(t||'').toUpperCase()] : null;
  if(!d || !d.revisiones) return null;
  var md={};
  d.revisiones.filter(function(r){ return r.fecha; }).slice().sort(function(a,b){ return (a.fecha||'')<(b.fecha||'')?-1:1; })
    .forEach(function(r){ var q=_calQ(r.periodo); if(q && r.fecha) md[q]=(''+r.fecha).slice(5,10); });
  return Object.keys(md).length ? md : null;
}
/* ---- informes trimestrales desde -trim.json cuya fecha cae en `year` ---- */
function _calEvTrim(t, year){
  t=(t||'').toUpperCase(); var out=[]; var filed={};
  var d=(typeof _cadTrim!=='undefined' && _cadTrim) ? _cadTrim[t] : null;
  if(d && d.revisiones){
    d.revisiones.forEach(function(r){ var f=(r.fecha||'').slice(0,10); if(!f) return; var q=_calQ(r.periodo);
      if(f.slice(0,4)==String(year)){ out.push({ t:t, fecha:f, tipo:'res', periodo:q, imp:0, sh:0, fuente:'trim', estimado:false, proyectado:false }); }
      filed[f.slice(0,4)+'-'+q]=1;   /* trimestre YA presentado ese año → no proyectarlo encima */
    });
  }
  /* Proyección de la CADENCIA COMPLETA del año (todos los trimestres con patrón), no solo el
     próximo. Solo futuros (fecha>=hoy) y que no estén ya presentados. Así aparecen 9M, FY, etc. */
  var pat=_calPatronTrim(t); var hoy=(typeof _calHoy==='function')?_calHoy():null;
  if(pat){ ['Q1','Q2','Q3','Q4'].forEach(function(q){ var md=pat[q]; if(!md) return;
    var dt=year+'-'+md;
    if(filed[year+'-'+q]) return;
    if(hoy && dt<hoy) return;
    out.push({ t:t, fecha:dt, tipo:'res', periodo:q, imp:0, sh:0, fuente:'trim', estimado:true, proyectado:false });
  }); }
  /* Fecha CONFIRMADA (Yahoo · buzón) del próximo informe: si cae en el año, prevalece con su
     fecha exacta (el dedup deja esta por delante de la proyección por patrón). */
  if(typeof _cadenciaDe==='function'){
    var c=_cadenciaDe(t);
    if(c && c.next && typeof _agResultado==='function'){
      var ag=_agResultado(t);
      if(ag && ag.fecha){ var a2=(typeof _cbToStr==='function')?_cbToStr(ag.fecha):null;
        if(a2 && a2.slice(0,4)==String(year)){ out.push({ t:t, fecha:a2, tipo:'res', periodo:_calQ(c.next.q), imp:0, sh:0, fuente:'trim', estimado:!ag.confirmada, proyectado:false }); }
      }
    }
  }
  return out;
}

/* ---- resultados dedup: por (año-periodo) manda -trim.json; FY de divData rellena ---- */
function _calResDedup(resArr){
  var map={};
  resArr.forEach(function(e){
    var k=e.fecha.slice(0,4)+'-'+(e.periodo||'?');
    var cur=map[k];
    if(!cur){ map[k]=e; return; }
    var score=function(x){ return (x.fuente==='trim'?2:0) + (x.estimado?0:1); };
    if(score(e) > score(cur)) map[k]=e;
  });
  return Object.keys(map).map(function(k){ return map[k]; });
}

/* ============================================================
   API pública
   ============================================================ */
/* Todos los eventos de una empresa en un AÑO (dedup de resultados aplicado). */
function calEventosDe(t, year){
  t=(t||'').toUpperCase();
  var div=_calEvDiv(t, year);
  var jr =_calEvJuntaRes(t, year);
  var trim=_calEvTrim(t, year);
  var res=_calResDedup(jr.filter(function(e){return e.tipo==='res';}).concat(trim));
  var noRes=div.concat(jr.filter(function(e){return e.tipo!=='res';}));
  var all=noRes.concat(res);
  var grp=_calGrp(t);
  all.forEach(function(e){ e.grp=grp; e.t=t; });
  return all.filter(function(e){ return e.fecha; }).sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
}

/* Todos los eventos (todas las empresas) de un AÑO. */
function calEventosAnio(year){
  var out=[]; calTickers().forEach(function(t){ out=out.concat(calEventosDe(t, year)); });
  return out.sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
}

/* Agenda: próximos eventos desde una fecha (por defecto hoy), horizonte ~15 meses. */
function calAgenda(desde, opts){
  desde=desde||_calHoy(); opts=opts||{};
  var y0=parseInt(desde.slice(0,4),10);
  var evs=calEventosAnio(y0).concat(calEventosAnio(y0+1));
  evs=evs.filter(function(e){ return e.fecha>=desde; });
  if(opts.soloCartera) evs=evs.filter(function(e){ return e.grp==='cartera'; });
  if(opts.tipo && opts.tipo!=='todos') evs=evs.filter(function(e){ return e.tipo===opts.tipo; });
  evs.sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
  return opts.limite ? evs.slice(0, opts.limite) : evs;
}

/* ---- Dividendos REALES cobrados (DB.dividendos) por mes de un año ----
   Cada apunte (fecha, importe/acción) × acciones a la fecha. Devuelve
   { neto[12], bruto } (neto = bruto × 0,81). Es lo que cuadra con la
   pestaña Dividendos y su "Resumen anual de la cartera". */
function _calDivMesReal(year){
  var neto=new Array(12).fill(0); var bruto=0; var divs=DB.dividendos||{};
  Object.keys(divs).forEach(function(t){ var T=(t||'').toUpperCase();
    (divs[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(f.slice(0,4)!=String(year)) return;
      var sh=_calSharesAt(T, f); var g=sh*_calNum(d.importe); if(!g) return;
      var m=parseInt(f.slice(5,7),10)-1; if(m>=0&&m<12) neto[m]+=g*0.81; bruto+=g;
    });
  });
  return { neto:neto, bruto:bruto };
}
/* Dividendo BRUTO de la cartera en un año.
   Pasado → dividendos realmente cobrados (Resumen Anual).
   Año en curso → cartera real cobrada + previsto de lo PENDIENTE DE EJECUTAR (compras planificadas).
   Futuro → proyección completa (cartera + previstas del radar) × acciones del Plan. */
function calBrutoCarteraAnio(year){
  var nowY=_calNowY(); var tot=0; var seen={};
  if(year <= nowY){                                  /* cartera real cobrada */
    var divs=DB.dividendos||{};
    Object.keys(divs).forEach(function(t){ var T=(t||'').toUpperCase(); var s=0;
      (divs[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(f.slice(0,4)!=String(year)) return; s+=_calSharesAt(T,f)*_calNum(d.importe); });
      if(s){ seen[T]=1; tot+=s; }
    });
  }
  if(year >= nowY){                                  /* previsto: futuro=todas; año en curso=solo pendientes de ejecutar */
    calTickers().forEach(function(t){ if(year===nowY && seen[t]) return;
      _calEvDiv(t, year).forEach(function(e){ if(e.tipo==='pago') tot += _calNum(e.sh)*_calNum(e.imp); });
    });
  }
  return tot;
}

/* €/mes de dividendos de la CARTERA para un año.
   Pasado/vigente → dividendos REALES cobrados. Futuro → PROYECCIÓN.
   IRPF = INGRESO en abril = 19% del bruto del ejercicio ANTERIOR
     (año real: devolución de retenciones; año futuro: previsión de devolución).
   Devuelve { neto[12], irpf, irpfPrevision, netoConIrpf[12], total, proyectado }. */
function calDivMesAnio(year){
  var d=calDivMesEmpresas(year);
  var conIrpf=d.totMes.slice(); conIrpf[3]+=d.irpf;
  return { neto:d.totMes.slice(), irpf:d.irpf, irpfPrevision:d.irpfPrevision, netoConIrpf:conIrpf, total:d.total, proyectado:year>_calNowY() };
}

/* €/mes DESGLOSADO POR EMPRESA para un año.
   Pasado/vigente → cada empresa con dividendos reales cobrados ese año
   (incluye empresas ya vendidas si cobraste de ellas ese año).
   Futuro → proyección de la cartera actual (+ previstas del radar si cobran).
   Devuelve { rows:[{t,neto[12],total}], totMes[12], irpf, irpfPrevision, netoTotal, total }. */
function calDivMesEmpresas(year){
  var nowY=_calNowY();
  var rows=[]; var totMes=new Array(12).fill(0); var seen={};
  function pushRow(t, neto){ var tot=neto.reduce(function(a,b){return a+b;},0); if(tot>=1){ rows.push({t:t, neto:neto, total:tot}); for(var i=0;i<12;i++) totMes[i]+=neto[i]; } }
  /* 1) CARTERA REAL cobrada (pasado y año en curso) */
  if(year <= nowY){
    var divs=DB.dividendos||{};
    Object.keys(divs).forEach(function(t){ var T=(t||'').toUpperCase(); var neto=new Array(12).fill(0); var any=false;
      (divs[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(f.slice(0,4)!=String(year)) return;
        var sh=_calSharesAt(T,f); var g=sh*_calNum(d.importe)*0.81; var m=parseInt(f.slice(5,7),10)-1; if(m>=0&&m<12){ neto[m]+=g; any=true; } });
      if(any) seen[T]=1;
      pushRow(T, neto);
    });
  }
  /* 2) PREVISTO: futuro = cartera + previstas; año en curso = solo lo PENDIENTE DE EJECUTAR (no cobrado aún) */
  if(year >= nowY){
    calTickers().forEach(function(t){ if(year===nowY && seen[t]) return; var neto=new Array(12).fill(0);
      _calEvDiv(t, year).forEach(function(e){ if(e.tipo!=='pago') return; var m=parseInt(e.fecha.slice(5,7),10)-1; if(m>=0&&m<12) neto[m]+=_calNum(e.sh)*_calNum(e.imp)*0.81; });
      pushRow(t, neto);
    });
  }
  rows.sort(function(a,b){ return b.total-a.total; });
  var netoTotal=totMes.reduce(function(a,b){return a+b;},0);
  var irpf = calBrutoCarteraAnio(year-1) * 0.19;
  var irpfPrevision = (year-1) > _calNowY();
  return { rows:rows, totMes:totMes, irpf:irpf, irpfPrevision:irpfPrevision, netoTotal:netoTotal, total:netoTotal+irpf };
}

/* Años con datos disponibles (para el selector temporal).
   Mínimo = primer año de dividendos.json; Máximo = HORIZONTE del Plan/Diversificación
   (planLotePeriodo.hasta + años de planCompras/simShares) para proyectar hasta ahí. */
function calYearsDisponibles(){
  var minY=2011, maxY=_calNowY()+1;
  var ys=(typeof evoYearsDisponibles==='function') ? evoYearsDisponibles() : [];
  if(ys && ys.length){ minY=Math.min.apply(null,ys); maxY=Math.max(maxY, Math.max.apply(null,ys)); }
  var per=DB.planLotePeriodo||{}; if(per.hasta) maxY=Math.max(maxY, parseInt(per.hasta,10)||0);
  var acc=function(obj){ obj=obj||{}; Object.keys(obj).forEach(function(t){ Object.keys(obj[t]||{}).forEach(function(y){ var n=parseInt(y,10); if(n>maxY)maxY=n; }); }); };
  acc(DB.planCompras); acc(DB.simShares);
  var out=[]; for(var y=minY;y<=maxY;y++) out.push(y); return out;
}

/* ============================================================
   CAPA DE RENDER — Pestaña Calendario (Fase 2)
   Vistas: Agenda cronológica · Vista anual (52 semanas) · Dividendos €/mes.
   Selector de año (horizonte del Plan). Solo lectura (derivado).
   ============================================================ */
var _calYearSel=null, _calVista='agenda', _calFil={tipo:'todos',ambito:'todas',empresa:'todas'};
var _calDatosOK=false, _calListo=false, _calCargando=false;
var _CAL_MES=(typeof MESES_ES!=='undefined')?MESES_ES:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
var _CAL_TT={exdiv:'EX-DIV',pago:'PAGO',junta:'JUNTA',res:'RESULT.'};
var _CAL_QL={Q1:'Q1',Q2:'H1',Q3:'9M',Q4:'FY'};
function _calEsc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _calNombre(t){ t=(t||'').toUpperCase(); var v=(DB.valores||{})[t]; if(v&&v.nombre)return v.nombre; if(typeof _evoIndex!=='undefined'&&_evoIndex[t]&&_evoIndex[t].nombre)return _evoIndex[t].nombre; return t; }
function _calEur(n){ return Math.round(n).toLocaleString('es-ES')+' €'; }
function _calDps(n){ return (Math.round(n*1000)/1000).toLocaleString('es-ES',{maximumFractionDigits:3}); }
function _calFmtF(f){ var p=(''+f).split('-'); if(p.length<3)return f; return p[2]+'-'+_CAL_MES[(+p[1])-1].toLowerCase(); }
function _calVistaActiva(){ var v=document.getElementById('view-calendario'); return v && v.classList.contains('active'); }

/* Carga perezosa de dividendos.json (_evoCargar) + trimestrales (_cadCargar) + agenda (_agCargar). */
function _calAsegurarDatos(){
  if(_calDatosOK||_calCargando) return; _calCargando=true;
  var jobs=[];
  if(typeof _evoCargar==='function') jobs.push(Promise.resolve(_evoCargar()).catch(function(){}));
  var tk=calTickers();
  if(typeof _cadCargar==='function' && tk.length) jobs.push(Promise.resolve(_cadCargar(tk)).catch(function(){}));
  if(typeof _agCargar==='function') jobs.push(Promise.resolve(_agCargar()).catch(function(){}));
  Promise.all(jobs).then(function(){ _calDatosOK=true; _calCargando=false; if(_calVistaActiva()) _calPaint(); })
                   .catch(function(){ _calDatosOK=true; _calCargando=false; if(_calVistaActiva()) _calPaint(); });
}

/* Entrada de la vista (VIEW_FNS.calendario). Sustituye a la antigua renderCalendario. */
function renderCalendario(){
  var body=document.getElementById('calBody'); if(!body) return;
  if(_calYearSel==null) _calYearSel=_calNowY();
  _calInitListeners();
  if(!_calDatosOK) _calAsegurarDatos();
  _calPaint();
}
/* La rejilla manual desaparece: renderEventos queda sin efecto (compatibilidad). */
function renderEventos(){}

function _calPaint(){
  var bar=document.getElementById('calBar'), kp=document.getElementById('calKpis'), body=document.getElementById('calBody');
  if(!body) return;
  var years=calYearsDisponibles(); var ymin=years[0], ymax=years[years.length-1];
  if(_calYearSel<ymin)_calYearSel=ymin; if(_calYearSel>ymax)_calYearSel=ymax;
  if(bar) bar.innerHTML=_calBarHTML(ymin,ymax);
  if(kp)  kp.innerHTML=_calKpisHTML();
  if(!_calDatosOK){ body.innerHTML='<div class="card"><div class="muted" style="padding:10px">Cargando calendario…</div></div>'; return; }
  body.innerHTML = _calVista==='agenda'?_calAgendaHTML() : (_calVista==='anual'?_calAnualHTML() : _calDivsHTML());
}

function _calYearTagHTML(y){ var nowY=_calNowY();
  return y<nowY ? '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#dcfce7;color:#166534">histórico</span>'
       : (y===nowY ? '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#fef9c3;color:#92400e">año en curso</span>'
       : '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#ede9fe;color:#5b21b6">proyectado</span>');
}
function _calBarHTML(ymin,ymax){
  var y=_calYearSel, nowY=_calNowY();
  var sub=function(v,lbl){ return '<button class="btn sm calSubtab'+(_calVista===v?' on':'')+'" data-calv="'+v+'" style="'+(_calVista===v?'background:var(--brand);color:#fff;':'')+'">'+lbl+'</button>'; };
  return '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px">'
    +'<div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:5px 9px">'
      +'<button class="btn sm calYbtn" data-caldy="-1"'+(y<=ymin?' disabled':'')+' style="font-weight:700" title="Año anterior">◀</button>'
      +'<span id="calYearNum" style="font-size:20px;font-weight:800;min-width:66px;text-align:center">'+y+'</span>'
      +'<button class="btn sm calYbtn" data-caldy="1"'+(y>=ymax?' disabled':'')+' style="font-weight:700" title="Año siguiente">▶</button>'
      +'<span id="calYearTag">'+_calYearTagHTML(y)+'</span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:5px 11px">'
      +'<span class="muted" style="font-size:11px">'+ymin+'</span>'
      +'<input type="range" id="calYearRange" min="'+ymin+'" max="'+ymax+'" step="1" value="'+y+'" title="Desliza para cambiar de año" style="flex:1;accent-color:var(--brand);cursor:pointer">'
      +'<span class="muted" style="font-size:11px">'+ymax+'</span>'
      +'<button class="btn sm" id="calHoy" data-calhoy="1" title="Ir al año en curso ('+nowY+')" style="font-weight:700">Hoy</button>'
    +'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+sub('agenda','Agenda')+sub('anual','Vista anual')+sub('divs','Dividendos €/mes')+'</div>'
  +'</div>';
}

function _calKpisHTML(){
  var y=_calYearSel; var ev=calEventosAnio(y); var nP=0, bruto=0;
  ev.forEach(function(e){ if(e.tipo==='pago'){ nP++; bruto+=_calNum(e.sh)*_calNum(e.imp); } });
  var dm=calDivMesAnio(y);
  var k=[['Eventos',String(ev.length)],['Pagos de dividendo',String(nP)],['Dividendo bruto',_calEur(bruto)],['Neto en caja + IRPF',_calEur(dm.total)]];
  return k.map(function(c){ return '<div class="card"><div class="lbl">'+c[0]+'</div><div class="val">'+c[1]+'</div></div>'; }).join('');
}

function _calChip(tipo,periodo){
  var col={exdiv:'#d97706',pago:'#16a34a',junta:'#c2410c',res:'#2563eb'}[tipo]||'#64748b';
  var lbl=_CAL_TT[tipo]||tipo; if(tipo==='res'&&periodo) lbl+=' '+(_CAL_QL[periodo]||periodo);
  return '<span style="display:inline-block;font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;color:#fff;background:'+col+'">'+lbl+'</span>';
}
function _calDetalle(e){
  if(e.tipo==='pago') return '<span class="muted" style="font-size:12px">'+(_calNum(e.sh)).toLocaleString('es-ES')+' acc × '+_calDps(e.imp)+' = <b>'+_calEur(e.sh*e.imp)+'</b> bruto · <b style="color:#166534">'+_calEur(e.sh*e.imp*0.81)+'</b> neto</span>';
  if(e.tipo==='exdiv') return '<span class="muted" style="font-size:12px">último día con derecho · '+_calDps(e.imp)+' €/acc</span>';
  if(e.tipo==='res') return '<span class="muted" style="font-size:12px">'+(e.periodo==='Q4'?'resultados anuales':'informe '+(_CAL_QL[e.periodo]||e.periodo))+'</span>';
  if(e.tipo==='junta') return '<span class="muted" style="font-size:12px">junta general</span>';
  return '';
}
function _calBadge(e){
  if(e.proyectado) return ' <span style="font-size:9px;padding:0 6px;border-radius:20px;font-weight:700;background:#ede9fe;color:#5b21b6">proy</span>';
  if(e.estimado)   return ' <span style="font-size:9px;padding:0 6px;border-radius:20px;font-weight:700;background:#fffbeb;color:#b45309;border:1px solid #fde68a">est</span>';
  return '';
}

function _calAgendaHTML(){
  var y=_calYearSel, nowY=_calNowY(), hoy=_calHoy();
  var empSel=(_calFil.empresa==null?'todas':_calFil.empresa);
  var ev=calEventosAnio(y).filter(function(e){ return (_calFil.tipo==='todos'||e.tipo===_calFil.tipo)&&(_calFil.ambito==='todas'||e.grp==='cartera')&&(empSel==='todas'||e.t===empSel); });
  var fb=function(v,lbl,key){ return '<button class="btn sm calFbtn'+((_calFil[key==='a'?'ambito':'tipo'])===v?' on':'')+'" data-cal'+key+'="'+v+'" style="'+((_calFil[key==='a'?'ambito':'tipo'])===v?'background:#0f172a;color:#fff;':'')+'font-size:12px">'+lbl+'</button>'; };
  var amb=fb('todas','Cartera + radar','a')+fb('cartera','Solo cartera','a');
  var tip=['todos','exdiv','pago','junta','res'].map(function(x){ return fb(x, x==='todos'?'Todos':_CAL_TT[x],'f'); }).join('');
  var emps=calTickers().slice().sort();
  var empDD='<select class="calEmpSel" title="Filtrar por empresa" style="font-size:12px;padding:3px 6px;border:1px solid var(--line);border-radius:8px;cursor:pointer"><option value="todas"'+(empSel==='todas'?' selected':'')+'>Todas las empresas</option>'+emps.map(function(t){ return '<option value="'+_calEsc(t)+'"'+(empSel===t?' selected':'')+'>'+_calEsc(t)+(_calHeld().has(t)?'':' · radar')+'</option>'; }).join('')+'</select>';
  var nPas=0;
  var rows=ev.map(function(e){
    var pasado=(y>=nowY)&&(e.fecha<hoy); if(pasado)nPas++;
    var bg=e.grp==='cartera'?'background:#fffbeb':'background:#f6f8fc';
    var tag=e.grp==='cartera'?'<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:20px;background:#fde68a;color:#92400e">cartera</span>':'<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:20px;background:#dbe4f5;color:#1e3a63">radar</span>';
    return '<tr style="'+bg+(pasado?';opacity:.4':'')+'"><td style="white-space:nowrap;font-weight:600;color:#334155;font-variant-numeric:tabular-nums">'+_calFmtF(e.fecha)+(pasado?' <span style="font-size:9px;color:#94a3b8;font-weight:700">✓</span>':'')+'</td>'
      +'<td>'+_calChip(e.tipo,e.periodo)+'</td>'
      +'<td><span data-ficha="'+_calEsc(e.t)+'" style="cursor:pointer;font-weight:700;color:var(--brand)">'+_calEsc(e.t)+'</span> '+tag+_calBadge(e)+' <span class="muted" style="font-size:11px">'+_calEsc((_calNombre(e.t)||'').slice(0,22))+'</span></td>'
      +'<td>'+_calDetalle(e)+'</td></tr>';
  }).join('');
  var notaPas=(nPas&&y===nowY)?(' Los <b>'+nPas+'</b> eventos ya pasados van atenuados (✓) para resaltar lo pendiente.'):'';
  return '<div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'+amb+'<span style="width:1px;height:18px;background:var(--line);margin:0 4px"></span>'+tip+'<span style="width:1px;height:18px;background:var(--line);margin:0 4px"></span>'+empDD+'</div>'
    +'<div style="overflow:auto"><table style="width:100%"><tbody>'+(rows||'<tr><td class="muted" style="padding:8px">Sin eventos con este filtro.</td></tr>')+'</tbody></table></div>'
    +'<div class="muted" style="font-size:11px;margin-top:6px">Eventos de '+y+'. Fondo ámbar = cartera · azul = prevista del radar. Clic en la empresa para abrir su ficha.'+notaPas+'</div></div>';
}

function _calWeekIdx(fecha,year){ var d=new Date(fecha+'T00:00:00'); var s=new Date(year,0,1); return Math.floor((d-s)/86400000/7); }
function _calAnualHTML(){
  var y=_calYearSel; var ev=calEventosAnio(y);
  var evByT={}; ev.forEach(function(e){ (evByT[e.t]=evByT[e.t]||[]).push(e); });
  var held=_calHeld(); var cart=[], prev=[];
  calTickers().forEach(function(t){ (held.has(t)?cart:prev).push(t); });
  var bands=[]; for(var w=0;w<53;w++){ var dt=new Date(y,0,1+w*7); var m=dt.getMonth(); if(bands.length&&bands[bands.length-1].m===m)bands[bands.length-1].n++; else bands.push({m:m,n:1}); }
  var stEmp='border:1px solid var(--line);text-align:left;white-space:nowrap;font-weight:700;font-size:10px;padding:1px 5px;position:sticky;left:0;background:#fff;z-index:2';
  var h1='<tr><th style="'+stEmp+'">Empresa</th>'+bands.map(function(b){ return '<th style="border:1px solid var(--line);background:#f8fafc;font-size:9px;font-weight:700;padding:1px 0" colspan="'+b.n+'">'+_CAL_MES[b.m]+'</th>'; }).join('')+'</tr>';
  var h2='<tr><th style="'+stEmp+'"></th>'; for(var w2=0;w2<53;w2++) h2+='<th style="font-weight:400;color:#cbd5e1;font-size:6px;border:1px solid #eef2f7;padding:0">'+(w2+1)+'</th>'; h2+='</tr>';
  var col={exdiv:'#d97706',pago:'#16a34a',junta:'#c2410c',res:'#2563eb'};
  var PRIO={pago:0,exdiv:1,res:2,junta:3};   /* importancia: dividendo > ex-div > resultados > junta */
  function rowFor(t){
    var grpbg=held.has(t)?'#fffbeb':'#f6f8fc'; var cells='';
    var es=evByT[t]||[];
    for(var w=0;w<53;w++){
      var wk=es.filter(function(e){ return _calWeekIdx(e.fecha,y)===w; });
      var cell='';
      if(wk.length){
        var main=wk.slice().sort(function(a,b){ var pa=(PRIO[a.tipo]==null?9:PRIO[a.tipo]), pb=(PRIO[b.tipo]==null?9:PRIO[b.tipo]); return pa!==pb?pa-pb:(a.fecha<b.fecha?-1:1); })[0];
        var extra=main.proyectado?'opacity:.6;border:1px dashed #7c3aed;':(main.estimado?'opacity:.65;border:1px dashed #b45309;':'');
        var ring=wk.length>1?'box-shadow:0 0 0 1.4px #cbd5e1;':'';
        var tip=wk.slice().sort(function(a,b){return a.fecha<b.fecha?-1:1;}).map(function(e){ return _calFmtF(e.fecha)+'-'+y+' · '+(_CAL_TT[e.tipo])+(e.tipo==='res'&&e.periodo?' '+(_CAL_QL[e.periodo]||e.periodo):'')+(e.tipo==='pago'?' · '+_calEur(e.sh*e.imp)+' bruto':'')+(e.proyectado?' (proy)':'')+(e.estimado?' (est)':''); }).join('\n');
        cell='<span title="'+_calEsc((wk.length>1?(wk.length+' eventos:\n'):'')+tip)+'" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+(col[main.tipo]||'#64748b')+';'+extra+ring+'"></span>';
      }
      cells+='<td style="border:1px solid #eef2f7;width:10px;height:12px;text-align:center;padding:0">'+cell+'</td>';
    }
    return '<tr><td style="'+stEmp+';background:'+grpbg+'">'+_calEsc(t)+'</td>'+cells+'</tr>';
  }
  var body=cart.map(rowFor).join('')+'<tr><td colspan="54" style="border-top:2px solid #cbd5e1;height:0;padding:0"></td></tr>'+prev.map(rowFor).join('');
  var legItem=function(c,lbl,st){ return '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;'+(st||('background:'+c))+';display:inline-block"></span>'+lbl+'</span>'; };
  var leg='<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:10.5px;margin-top:7px;color:#475569">'
    +legItem(col.pago,'pago')+legItem(col.exdiv,'ex-div')+legItem(col.res,'resultados')+legItem(col.junta,'junta')
    +'<span style="width:1px;height:12px;background:var(--line)"></span>'
    +legItem(null,'proyectado','border:1px dashed #7c3aed')+legItem(null,'estimado','border:1px dashed #b45309')+legItem(null,'varios (ver tooltip)','box-shadow:0 0 0 1.4px #cbd5e1')
    +'</div>';
  return '<div class="card"><div style="overflow:auto"><table style="border-collapse:collapse;font-size:9px">'+h1+h2+body+'</table></div>'+leg
    +'<div class="muted" style="font-size:11px;margin-top:6px">Semanas del año '+y+' con los meses arriba. Cartera arriba, previstas del radar debajo de la línea. Si una semana tiene varios eventos se muestra el más importante (dividendo › ex-div › resultados › junta) y el resto aparece al pasar el ratón por el punto.</div></div>';
}

function _calDivsHTML(){
  var y=_calYearSel, nowY=_calNowY(); var d=calDivMesEmpresas(y);
  var head='<tr><th style="text-align:left">Empresa</th>'+_CAL_MES.map(function(m){ return '<th>'+m+'</th>'; }).join('')+'<th>Total</th></tr>';
  var body=d.rows.map(function(r){
    return '<tr><td style="text-align:left;white-space:nowrap"><span data-ficha="'+_calEsc(r.t)+'" style="cursor:pointer;font-weight:700;color:var(--brand)">'+_calEsc(r.t)+'</span> <span class="muted" style="font-size:11px">'+_calEsc((_calNombre(r.t)||'').slice(0,18))+'</span></td>'
      +r.neto.map(function(v){ return v>=1?'<td style="color:#166534;font-weight:600;font-variant-numeric:tabular-nums">'+_calEur(v)+'</td>':'<td class="muted">·</td>'; }).join('')
      +'<td style="font-weight:800;background:#f8fafc;font-variant-numeric:tabular-nums">'+_calEur(r.total)+'</td></tr>';
  }).join('');
  if(!body) body='<tr><td colspan="14" class="muted" style="padding:8px">Sin dividendos este año.</td></tr>';
  var totMes='<tr style="font-weight:800;background:#eef2f7"><td style="text-align:left">Total cobrado / mes</td>'+d.totMes.map(function(v){ return '<td style="font-variant-numeric:tabular-nums">'+(v>=1?_calEur(v):'·')+'</td>'; }).join('')+'<td style="font-variant-numeric:tabular-nums">'+_calEur(d.netoTotal)+'</td></tr>';
  var lbl=d.irpfPrevision?('Previsión devolución IRPF (retenc. '+(y-1)+')'):('Devolución IRPF dividendos (retenc. '+(y-1)+')');
  var irpfRow='<tr style="color:#166534;font-weight:700;background:#ecfdf5"><td style="text-align:left">'+lbl+'</td>'+_CAL_MES.map(function(m,i){ return '<td style="font-variant-numeric:tabular-nums">'+((i===3&&d.irpf)?'+'+_calEur(d.irpf):'·')+'</td>'; }).join('')+'<td style="font-variant-numeric:tabular-nums">+'+_calEur(d.irpf)+'</td></tr>';
  var net=d.totMes.slice(); net[3]+=d.irpf;
  var netRow='<tr style="font-weight:800;background:#f1f5f9"><td style="text-align:left">Neto en caja / mes</td>'+net.map(function(v){ return '<td style="font-variant-numeric:tabular-nums">'+(v>=1?_calEur(v):'·')+'</td>'; }).join('')+'<td style="font-variant-numeric:tabular-nums">'+_calEur(d.total)+'</td></tr>';
  var nota = y>nowY ? 'Año <b>proyectado</b> (dividendos.json + Plan/Simulador, incluye previstas del radar).'
           : (y===nowY ? 'Año en curso: <b>cartera real cobrada</b> + previsto de las <b>compras pendientes de ejecutar</b>.'
           : 'Año real: dividendos <b>cobrados</b> por empresa (cuadra con tu pestaña Dividendos).');
  return '<div class="card" style="overflow:auto"><table class="calDivt" style="border-collapse:collapse;width:100%">'
    +'<style>.calDivt th,.calDivt td{border:1px solid var(--line);padding:3px 6px;text-align:right;font-size:12px}.calDivt th:first-child,.calDivt td:first-child{text-align:left}</style>'
    +head+body+totMes+irpfRow+netRow+'</table></div>'
    +'<div class="muted" style="font-size:11px;margin-top:6px">'+nota+' Cada celda = neto de esa empresa ese mes (× 0,81). En abril el IRPF entra como <b>ingreso</b> (devolución de retenciones del año anterior).</div>';
}

/* Cambia solo el número de año y la etiqueta (feedback en vivo del slider, sin reconstruir la barra). */
function _calYearNumLive(ny){
  var n=document.getElementById('calYearNum'); if(n) n.textContent=ny;
  var g=document.getElementById('calYearTag'); if(g) g.innerHTML=_calYearTagHTML(ny);
}
/* Repinta KPIs + cuerpo para el año actual SIN tocar la barra (mantiene el slider mientras se arrastra). */
function _calBodyRepaint(){
  var kp=document.getElementById('calKpis'); if(kp) kp.innerHTML=_calKpisHTML();
  var body=document.getElementById('calBody'); if(!body) return;
  body.innerHTML = !_calDatosOK ? '<div class="card"><div class="muted" style="padding:10px">Cargando calendario…</div></div>'
    : (_calVista==='agenda'?_calAgendaHTML() : (_calVista==='anual'?_calAnualHTML() : _calDivsHTML()));
}
function _calClampYear(ny){ var ys=calYearsDisponibles(); if(!ys.length)return ny; return Math.max(ys[0],Math.min(ys[ys.length-1],ny)); }
function _calInitListeners(){
  if(_calListo) return; _calListo=true;
  document.addEventListener('click', function(e){
    var t=e.target; if(!t||!t.closest) return;
    var hy=t.closest('[data-calhoy]'); if(hy){ _calYearSel=_calClampYear(_calNowY()); _calPaint(); return; }
    var yb=t.closest('.calYbtn'); if(yb){ var dd=parseInt(yb.getAttribute('data-caldy'),10)||0; _calYearSel=_calClampYear(_calYearSel+dd); _calPaint(); return; }
    var sb=t.closest('.calSubtab'); if(sb){ _calVista=sb.getAttribute('data-calv')||'agenda'; _calPaint(); return; }
    var fb=t.closest('.calFbtn'); if(fb){ var vt=fb.getAttribute('data-calf'), va=fb.getAttribute('data-cala'); if(vt!=null)_calFil.tipo=vt; if(va!=null)_calFil.ambito=va; _calPaint(); return; }
  });
  /* Slider de año: en vivo solo actualiza el número (fluido al arrastrar); al soltar repinta el contenido. */
  document.addEventListener('input', function(e){ var r=e.target; if(!r||r.id!=='calYearRange') return; _calYearSel=_calClampYear(parseInt(r.value,10)||_calNowY()); _calYearNumLive(_calYearSel); });
  document.addEventListener('change', function(e){ var s=e.target; if(!s) return;
    if(s.id==='calYearRange'){ _calYearSel=_calClampYear(parseInt(s.value,10)||_calNowY()); _calBodyRepaint(); return; }
    if(s.classList&&s.classList.contains('calEmpSel')){ _calFil.empresa=s.value||'todas'; _calBodyRepaint(); return; }
  });
}
