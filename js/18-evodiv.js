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

/* API pública para otros módulos (Simulador, Radar): DPA bruto oficial del Excel. */
function evoDpaBruto(t, year){
  var e=_evoIndex[(t||'').toUpperCase()]; if(!e||!e.anios) return null;
  var a=e.anios[String(year)]; if(!a) return null;
  return (a.dpaBruto!=null)?num(a.dpaBruto):null;
}
function evoDpaNeto(t, year){
  var e=_evoIndex[(t||'').toUpperCase()]; if(!e||!e.anios) return null;
  var a=e.anios[String(year)]; if(!a) return null;
  return (a.dpaNeto!=null)?num(a.dpaNeto):null;
}
function evoEmpresa(t){ return _evoIndex[(t||'').toUpperCase()]||null; }
function evoYearsDisponibles(){ return (_evoData&&_evoData.years)?_evoData.years.slice():[]; }

/* --- % de crecimiento y proyección de años futuros --- */
function _evoCrec(){ return (DB.divCrecim!=null && DB.divCrecim!=='')?num(DB.divCrecim):4; }
function _evoRound(x,d){ var p=Math.pow(10,d==null?4:d); return Math.round(num(x)*p)/p; }
function _evoOverride(t,year){
  var o=DB.divOverride&&DB.divOverride[(t||'').toUpperCase()];
  if(o){ var v=o[String(year)]; if(v!=null&&v!==''){ var n=num(v); if(!isNaN(n)) return n; } }
  return null;
}
/* DPA bruto PROYECTADO: real del Excel > override manual > año anterior × (1+%). Cascada. */
function evoDpaProyectado(t, year){
  t=(t||'').toUpperCase(); var e=_evoIndex[t]; if(!e) return null;
  var a=e.anios&&e.anios[String(year)];
  if(a && a.dpaBruto!=null) return num(a.dpaBruto);
  var ov=_evoOverride(t,year); if(ov!=null) return ov;
  if(year<1990||year>2100) return null;
  var prev=evoDpaProyectado(t, year-1);
  if(prev==null||!(prev>0)) return null;
  return _evoRound(prev*(1+_evoCrec()/100),4);
}
/* Proyección automática de un año, IGNORANDO su propio override (para el placeholder de la casilla). */
function _evoAutoProj(t, year){
  var prev=evoDpaProyectado(t, year-1);
  if(prev==null||!(prev>0)) return null;
  return _evoRound(prev*(1+_evoCrec()/100),4);
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
  var empresas=_evoData.empresas||[];
  if(!empresas.length){ host.innerHTML='<div class="empty">No encuentro <code>dividendos.json</code> en el repo (o está vacío). Genera el Excel → «Exportar dividendos.json (1 clic)» y súbelo a la raíz del repo.</div>'; return; }

  var years=(_evoData.years||[]).slice();
  var nowY=new Date().getFullYear();
  var maxData=years.length?Math.max.apply(null,years):nowY;
  var minData=years.length?Math.min.apply(null,years):2011;
  var horizon=Math.max(maxData, (DB.divHorizonte!=null?num(DB.divHorizonte):(maxData+6)));
  var allYears=[]; for(var _y=minData;_y<=horizon;_y++) allYears.push(_y);
  if(_evoYear==null){ _evoYear=(allYears.indexOf(nowY)>=0)?nowY:maxData; }
  var esFuturo = _evoYear > maxData;

  var held=_evoHeldSet(), infoS=_evoInformeSet(), planS=_evoPlanSet();

  /* construir filas del año */
  var rows=empresas.map(function(e){
    var t=(e.ticker||'').toUpperCase();
    var a=(!esFuturo && e.anios&&e.anios[String(_evoYear)])?e.anios[String(_evoYear)]:null;
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
    var paga=!!e.paga;
    /* prioridad de orden: cartera(0) informe(1) plan sin informe(2) resto con div por RPD(3) sin div(4) */
    var rank;
    if(isCartera) rank=0; else if(isInforme) rank=1; else if(isPlan) rank=2; else if(paga) rank=3; else rank=4;
    return {e:e,t:t,a:a,dpaB:dpaB,ovr:ovr,auto:auto,precio:precio,rpd:rpd,paga:paga,
      isCartera:isCartera,isInforme:isInforme,isPlan:isPlan,rank:rank,
      junta:a?a.junta:null,nombre:e.nombre||t};
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
  var card=function(l,v){ return '<div class="card"><div class="lbl">'+l+'</div><div class="val">'+v+'</div></div>'; };
  var kpis='<div class="cards">'
    +card('Empresas', String(rows.length))
    +card('Con dividendo '+_evoYear, String(pag.length))
    +card('RPD media', _evoPf(rpdMed,2)+'%')
    +card(esFuturo?'Crecimiento':'Actualizado', esFuturo?(_evoPf(_evoCrec(),1)+'%/año'):_evoEsc((_evoData.actualizado||'—')))
    +'</div>';

  /* selector de año (con futuros) + "+ año" + chips de grupo + buscador */
  var yearSel='<select id="evoYearSel" style="margin-left:6px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px">'
    +allYears.slice().reverse().map(function(y){ return '<option value="'+y+'"'+(y===_evoYear?' selected':'')+'>'+y+(y>maxData?' · proyec.':(y>nowY?' · prev':''))+'</option>'; }).join('')
    +'</select>';
  var chips=EVO_GRUPOS.map(function(g){ var on=!!_evoGroups[g.k];
    return '<button class="btn sm" data-evogrp="'+g.k+'" style="border:1px solid '+(on?'var(--brand)':'var(--line)')+';background:'+(on?'#eff6ff':'#fff')+';color:'+(on?'var(--brand)':'inherit')+';font-weight:'+(on?'700':'400')+'">'+g.lbl+'</button>';
  }).join(' ');
  var toolbar='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0">'
    +'<label style="font-size:13px">Año:'+yearSel+'</label>'
    +'<button class="btn sm" id="evoAddYear" title="Añadir un año futuro para proyectar">+ año</button>'
    +'<span style="display:flex;gap:5px;flex-wrap:wrap">'+chips+'</span>'
    +'<input type="search" id="evoSearch" placeholder="Buscar nombre o ticker…" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px;min-width:180px">'
    +'</div>';

  /* control de crecimiento (solo en años futuros) */
  var futuroCtrl = esFuturo
    ? '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 10px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">'
      +'<span style="font-size:13px;font-weight:700;color:#92400e">📈 Año futuro '+_evoYear+' · proyección</span>'
      +'<label style="font-size:13px">Crecimiento anual <input type="number" id="evoCrecim" step="0.5" value="'+_evoCrec()+'" style="width:64px;text-align:right;padding:3px 6px;border:1px solid var(--line);border-radius:6px">%</label>'
      +'<span class="muted" style="font-size:12px">DPA = año anterior × (1+%). Escribe en una casilla para <b>pisar</b> la sugerencia; vacíala para volver a la proyección.</span>'
      +'</div>'
    : '';

  /* tabla */
  var _grpBadge=function(r){
    if(r.isCartera)return '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:6px">cartera</span>';
    if(r.isInforme)return '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 5px;border-radius:6px">informe</span>';
    if(r.isPlan)return '<span style="font-size:9px;background:#fef9c3;color:#854d0e;padding:1px 5px;border-radius:6px">plan</span>';
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
  var tabla='<div style="overflow:auto"><table><thead><tr>'
    +'<th style="width:24px"></th><th>Empresa</th>'
    +'<th class="num">'+thDiv+'</th>'
    +'<th class="num">RPD vs cotización</th>'
    +'<th>Junta</th></tr></thead><tbody>'+trs+'</tbody></table></div>';

  var nota = esFuturo
    ? '<div class="muted" style="font-size:11px;margin-top:8px">Año <b>futuro</b>: el dividendo se <b>proyecta</b> desde el último real con el % de crecimiento anual (DPA = año anterior × (1+%)). '
      +'Edita una casilla para <b>pisar</b> la sugerencia de una empresa; vacíala para volver a la proyección. Con «+ año» amplías el horizonte sin límite. '
      +'Estos valores alimentan el <b>Simulador</b>. RPD = dividendo proyectado ÷ cotización actual.</div>'
    : '<div class="muted" style="font-size:11px;margin-top:8px">Dividendo total y RPD en <b>bruto</b> (RPD = dividendo bruto ÷ cotización actual). '
      +'Orden: en cartera → con informe → en plan → resto por RPD → sin dividendo. Pulsa una fila para ver los pagos y la presentación de resultados. '
      +'Fuente: <code>dividendos.json</code> (Excel de dividendos). No es recomendación de compra.</div>';

  host.innerHTML='<div style="font-size:20px;font-weight:800;color:#1f3d6b;margin-bottom:2px">📅 Evolución del Dividendo</div>'
    +'<div class="muted" style="font-size:13px;margin-bottom:6px">Base de datos de dividendos por empresa y año. Elige el año (incluidos futuros) y los grupos a mostrar.</div>'
    +kpis+toolbar+futuroCtrl+tabla+nota;

  /* wiring */
  var ys=document.getElementById('evoYearSel');
  if(ys) ys.addEventListener('change',function(){ _evoYear=parseInt(this.value,10)||_evoYear; renderEvoDiv(); });
  var ay=document.getElementById('evoAddYear');
  if(ay) ay.addEventListener('click',function(){ var h=Math.max(maxData,(DB.divHorizonte!=null?num(DB.divHorizonte):(maxData+6))); DB.divHorizonte=h+1; if(typeof scheduleSave==='function')scheduleSave(); _evoYear=DB.divHorizonte; renderEvoDiv(); });
  var cr=document.getElementById('evoCrecim');
  if(cr) cr.addEventListener('change',function(){ DB.divCrecim=num((this.value||'').replace(',','.')); if(typeof scheduleSave==='function')scheduleSave(); renderEvoDiv(); });
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
  host.querySelectorAll('tr.evo-main').forEach(function(tr){ tr.addEventListener('click',function(e){
    if(e.target.closest('[data-ficha]')) return;   /* el clic en el ticker abre la ficha */
    if(e.target.closest('input')) return;          /* el clic en la casilla de override no despliega */
    var t=(tr.getAttribute('data-evorow')||'').toUpperCase(); if(!t)return;
    _evoOpen[t]=!_evoOpen[t]; renderEvoDiv();
  }); });
  if(typeof _wireBuscador==='function'){ _wireBuscador(document.getElementById('evoSearch'), host.querySelectorAll('tbody tr.evo-main[data-fs]'), _evoBusca); }
}

function _evoDetalleHTML(r){
  var a=r.a;
  var notaHTML=(r.e&&r.e.nota)?'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:12px;color:#9a3412">📝 '+_evoEsc(r.e.nota)+'</div>':'';
  if(!a){ return notaHTML+'<span class="muted" style="font-size:12px">'+((r.dpaB!=null)?('Año proyectado: DPA estimado <b>'+_evoPf(r.dpaB,4)+' €</b>'+(r.ovr!=null?' (pisado a mano)':' (proyección '+_evoPf(_evoCrec(),1)+'%/año)')+'. Sin calendario de pagos aún.'):('Sin datos de dividendo para '+_evoYear+'.'))+'</span>'; }
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
        +'<td class="num">'+_evoPf(p.bruto,4)+'</td><td class="num">'+_evoPf(p.neto,4)+'</td><td>'+_evoEsc(p.tipo||'—')+'</td></tr>'; }).join('')
      +'</tbody></table>';
  }
  return notaHTML+metaHTML+pagosHTML;
}
