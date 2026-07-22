/* ===== 25-hechos.js — Diario de Hechos ==========================================
   Feed cronológico de los «hechos relevantes» (campo hechos[] de los -trim.json) de
   TODAS las empresas en seguimiento (misma cobertura que Monitor de Seguimiento:
   Kanban Análisis + Planteamiento + Seguimiento), para leer la temporada de resultados
   de un vistazo. Solo LEE: los hechos los genera la skill monitor-trimestral empresa a
   empresa. Reutiliza el cargador y la cadencia del Radar (_cadCargar/_cadTrim/_cadenciaDe),
   así el desfase de ejercicio (Inditex 31/01, Logista 30/09) se resuelve solo (orden por
   fecha real de publicación y "pendiente" por cadencia propia de cada empresa). ============ */

var _diaWin='season';   // 'season' (ventana móvil) | 'all' (histórico)
var _diaTipo='';        // '' = todos
var _diaImp='';         // '' = todos | '+' | '=' | '-'
var _diaEmp='';         // '' = todas | TICKER
var _DIA_SEASON_DAYS=75;// ~2,5 meses = "temporada actual"

(function _diaCSS(){ if(typeof document==='undefined'||document.getElementById('dia-css'))return;
  var st=document.createElement('style'); st.id='dia-css';
  st.textContent=[
    '#view-hechos .dia-flt{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}',
    '#view-hechos .dia-p{font-size:11.5px;font-weight:700;border-radius:20px;padding:3px 11px;cursor:pointer;border:1.5px solid #e2e8f0;background:#f8fafc;color:#475569;user-select:none}',
    '#view-hechos .dia-p.on{background:#0f172a;color:#fff;border-color:#0f172a}',
    '#view-hechos .dia-p.imp-p.on{background:#16a34a;border-color:#16a34a}',
    '#view-hechos .dia-p.imp-n.on{background:#dc2626;border-color:#dc2626}',
    '#view-hechos .dia-p.imp-e.on{background:#64748b;border-color:#64748b}',
    '#view-hechos .dia-sel{font-size:12px;border:1.5px solid #e2e8f0;border-radius:20px;padding:4px 10px;background:#fff;color:#334155}',
    '#view-hechos .dia-fltl{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:0 2px 0 6px}',
    '#view-hechos .dia-item{display:flex;gap:11px;padding:11px 4px;border-top:1px solid #eef2f6}',
    '#view-hechos .dia-item:first-child{border-top:0}',
    '#view-hechos .dia-dot{flex:0 0 auto;width:13px;height:13px;border-radius:50%;margin-top:4px}',
    '#view-hechos .dia-body{flex:1;min-width:0}',
    '#view-hechos .dia-meta{font-size:12px;color:#64748b;margin-bottom:2px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
    '#view-hechos .dia-tk{font-weight:800;color:#0f172a;cursor:pointer}',
    '#view-hechos .dia-tk:hover{text-decoration:underline}',
    '#view-hechos .dia-chip{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;padding:2px 7px;border-radius:999px}',
    '#view-hechos .dia-fact{font-weight:600;line-height:1.4}',
    '#view-hechos .dia-val{color:#64748b;font-size:12.5px;margin-top:2px}',
    '#view-hechos .dia-val b{color:#334155}',
    '#view-hechos .dia-pend{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:10px 13px;margin:12px 0;font-size:12.5px}',
    '#view-hechos .dia-pend b{color:#9a3412}',
    '#view-hechos .dia-pt{display:inline-block;background:#fff;border:1px solid #fdba74;color:#9a3412;border-radius:8px;padding:1px 7px;margin:2px 4px 0 0;font-size:11.5px;font-weight:700;cursor:pointer}'
  ].join('\n'); document.head.appendChild(st);
})();

function _diaCover(){
  if(typeof _emAllTickers==='function' && typeof columnaDe==='function'){
    var C={ana:1,plan:1,seg:1};
    return _emAllTickers().filter(function(t){return C[columnaDe(t)];});
  }
  return [];
}
function _diaNombre(t){ return ((DB.valores||{})[t]||{}).nombre||t; }
function _diaEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _diaChip(tipo){ return (typeof _hkChip==='function')?_hkChip(tipo):'background:#f1f5f9;color:#475569'; }
function _diaImpDot(imp){ return (typeof _hkImpDot==='function')?_hkImpDot(imp):'#94a3b8'; }

/* setter usado por los filtros (onclick) */
function _diaSet(k,v){
  if(k==='win')  _diaWin  = v;
  if(k==='tipo') _diaTipo = (_diaTipo===v?'':v);
  if(k==='imp')  _diaImp  = (_diaImp===v?'':v);
  if(k==='emp')  _diaEmp  = v||'';
  if(typeof renderHechos==='function') renderHechos();
}

function renderHechos(){
  var host=document.getElementById('view-hechos'); if(!host)return;
  var tks=_diaCover();
  if(!tks.length){ host.innerHTML='<div class="empty">Sin empresas en Análisis, Planteamiento o Seguimiento (revisa el Kanban).</div>'; return; }

  /* asegurar que todos los -trim.json estén cargados (reutiliza el cargador del Radar) */
  if(typeof _cadCargar==='function' && typeof _cadTrim!=='undefined'){
    var falta=tks.filter(function(t){return _cadTrim[t]===undefined;});
    if(falta.length){ host.innerHTML='<div class="muted" style="padding:14px">Cargando hechos de '+tks.length+' empresas…</div>'; _cadCargar(tks).then(function(){ renderHechos(); }); return; }
  }

  /* recoger todos los hechos */
  var items=[], tiposSet={}, conHechos={}, nH=0, nPos=0, nNeg=0, nNeu=0;
  tks.forEach(function(t){
    var d=(typeof _cadTrim!=='undefined')?_cadTrim[t]:null;
    if(!d||!d.revisiones)return;
    d.revisiones.forEach(function(rv){
      if(!rv||!rv.hechos||!rv.hechos.length)return;
      rv.hechos.forEach(function(h){
        conHechos[t]=1; nH++;
        var imp=(h.impacto||'=');
        if(imp==='+')nPos++; else if(imp==='-'||imp==='−')nNeg++; else nNeu++;
        if(h.tipo)tiposSet[h.tipo]=1;
        items.push({t:t, nombre:_diaNombre(t), periodo:rv.periodo||'', periodoDisplay:rv.periodoDisplay||'',
          fecha:rv.fecha||'', tipo:h.tipo||'Otros', hecho:h.hecho||'', impacto:imp, valoracion:h.valoracion||''});
      });
    });
  });
  items.sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });

  /* pendientes de esta ronda (cadencia propia de cada empresa → Inditex/Logista OK) + sin datos */
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var pendientes=[], sinDatos=[];
  tks.forEach(function(t){
    var d=(typeof _cadTrim!=='undefined')?_cadTrim[t]:null;
    if(!d||!d.revisiones||!d.revisiones.length){ sinDatos.push(t); return; }
    if(typeof _cadenciaDe==='function' && typeof _cadEstado==='function'){
      var c=_cadenciaDe(t); if(!c)return;
      var an=(DB.analisis||[]).find(function(a){return (a.ticker||'').toUpperCase()===t;})||{};
      var e=_cadEstado(c,hoy,an.dossierFecha);
      if(e.tocaMonitor){
        var has=(typeof _revHecha==='function')?_revHecha((DB.monitor[t]||{}).rev, e.nextKey):false;
        if(!has) pendientes.push({t:t, prox:e.proxLabel||''});
      }
    }
  });

  /* aplicar filtros */
  var winFrom=null;
  if(_diaWin==='season'){ var f=new Date(hoy.getTime()-_DIA_SEASON_DAYS*86400000); winFrom=f.toISOString().slice(0,10); }
  var vis=items.filter(function(x){
    if(winFrom && x.fecha && x.fecha<winFrom) return false;
    if(_diaTipo && x.tipo!==_diaTipo) return false;
    if(_diaImp){ var im=(x.impacto==='−')?'-':x.impacto; if(im!==_diaImp) return false; }
    if(_diaEmp && x.t!==_diaEmp) return false;
    return true;
  });

  /* ---- cabecera / KPIs ---- */
  var kpi='<div class="pos-kpis">'
    +'<div class="k hero"><div class="l">Hechos registrados</div><div class="v">'+nH+'</div><div class="p">en '+Object.keys(conHechos).length+' de '+tks.length+' empresas</div></div>'
    +'<div class="k"><div class="l">A favor</div><div class="v" style="color:#16a34a">'+nPos+'</div><div class="p">impacto positivo en tesis</div></div>'
    +'<div class="k"><div class="l">En contra</div><div class="v"'+(nNeg>0?' style="color:#dc2626"':'')+'>'+nNeg+'</div><div class="p">impacto negativo</div></div>'
    +'<div class="k"><div class="l">Pendientes de registrar</div><div class="v"'+(pendientes.length>0?' style="color:#b45309"':'')+'>'+pendientes.length+'</div><div class="p">informe publicado sin procesar</div></div>'
    +'</div>';

  /* ---- panel de pendientes (red de seguridad: nada se omite en silencio) ---- */
  var pend='';
  if(pendientes.length || sinDatos.length){
    pend='<div class="dia-pend">';
    if(pendientes.length){ pend+='<div><b>⏳ Falta procesar esta ronda ('+pendientes.length+'):</b> '
      +pendientes.map(function(p){return '<span class="dia-pt" data-ficha="'+p.t+'" title="Abrir ficha">'+_diaEsc(p.t)+(p.prox?(' · '+_diaEsc(p.prox)):'')+'</span>';}).join('')+'</div>'; }
    if(sinDatos.length){ pend+='<div style="margin-top:'+(pendientes.length?'6px':'0')+'"><b>Sin monitor trimestral aún ('+sinDatos.length+'):</b> '
      +sinDatos.map(function(t){return '<span class="dia-pt" data-ficha="'+t+'" title="Abrir ficha">'+_diaEsc(t)+'</span>';}).join('')+'</div>'; }
    pend+='</div>';
  }

  /* ---- barra de filtros ---- */
  var tiposArr=Object.keys(tiposSet).sort();
  var flt='<div class="dia-flt">'
    +'<span class="dia-fltl">Ventana</span>'
    +'<span class="dia-p'+(_diaWin==='season'?' on':'')+'" onclick="_diaSet(\'win\',\'season\')" title="Últimos ~'+_DIA_SEASON_DAYS+' días">Temporada</span>'
    +'<span class="dia-p'+(_diaWin==='all'?' on':'')+'" onclick="_diaSet(\'win\',\'all\')">Todo el histórico</span>'
    +'<span class="dia-fltl">Impacto</span>'
    +'<span class="dia-p imp-p'+(_diaImp==='+'?' on':'')+'" onclick="_diaSet(\'imp\',\'+\')">A favor</span>'
    +'<span class="dia-p imp-e'+(_diaImp==='='?' on':'')+'" onclick="_diaSet(\'imp\',\'=\')">Neutro</span>'
    +'<span class="dia-p imp-n'+(_diaImp==='-'?' on':'')+'" onclick="_diaSet(\'imp\',\'-\')">En contra</span>'
    +'</div>';
  var flt2='';
  if(tiposArr.length){
    flt2='<div class="dia-flt"><span class="dia-fltl">Tipo</span>'
      +tiposArr.map(function(tp){return '<span class="dia-p'+(_diaTipo===tp?' on':'')+'" onclick="_diaSet(\'tipo\',\''+tp.replace(/'/g,"\\'")+'\')">'+_diaEsc(tp)+'</span>';}).join('')
      +'<span class="dia-fltl">Empresa</span><select class="dia-sel" onchange="_diaSet(\'emp\',this.value)"><option value="">Todas</option>'
      +tks.slice().sort().map(function(t){return '<option value="'+t+'"'+(_diaEmp===t?' selected':'')+'>'+_diaEsc(t)+' · '+_diaEsc((_diaNombre(t)||'').slice(0,22))+'</option>';}).join('')
      +'</select></div>';
  }

  /* ---- feed ---- */
  var feed;
  if(!nH){
    feed='<div class="empty">Aún no hay hechos registrados. Se irán llenando a medida que proceses los informes trimestrales con la skill <b>monitor-trimestral</b> (cada empresa aparece aquí en cuanto la analizas).</div>';
  } else if(!vis.length){
    feed='<div class="empty">Ningún hecho con estos filtros'+(_diaWin==='season'?' en la ventana de temporada. Prueba «Todo el histórico».':'.')+'</div>';
  } else {
    feed=vis.map(function(x){
      var per=_diaEsc(x.periodoDisplay||x.periodo);
      return '<div class="dia-item">'
        +'<div class="dia-dot" style="background:'+_diaImpDot(x.impacto)+'"></div>'
        +'<div class="dia-body">'
          +'<div class="dia-meta">'
            +(x.fecha?'<span>'+_diaEsc(ddmmyyyy(x.fecha))+'</span>':'')
            +'<span class="dia-tk" data-ficha="'+x.t+'">'+_diaEsc(x.t)+'</span>'
            +'<span style="color:#94a3b8">'+_diaEsc((x.nombre||'').slice(0,26))+'</span>'
            +(per?'<span style="color:#cbd5e1">·</span><span>'+per+'</span>':'')
            +'<span class="dia-chip" style="'+_diaChip(x.tipo)+'">'+_diaEsc(x.tipo)+'</span>'
          +'</div>'
          +'<div class="dia-fact">'+_diaEsc(x.hecho)+'</div>'
          +(x.valoracion?'<div class="dia-val"><b>Valoración:</b> '+_diaEsc(x.valoracion)+'</div>':'')
        +'</div></div>';
    }).join('');
    var nota='<div class="muted" style="font-size:11px;margin-top:10px">Mostrando '+vis.length+' de '+nH+' hechos'+(_diaWin==='season'?(' · ventana de temporada (~'+_DIA_SEASON_DAYS+' días)'):' · histórico completo')+'. Orden por fecha de publicación real (el desfase de Inditex/Logista se coloca solo).</div>';
    feed='<div style="margin-top:4px">'+feed+'</div>'+nota;
  }

  host.innerHTML=kpi+flt+flt2+pend+feed;
}
