/* =============================================================================
   28-micartera.js · Vista «Mi Cartera» (grupo Control)
   -----------------------------------------------------------------------------
   La pantalla de entrada: qué tengo, cómo va hoy, y qué está a punto de entrar en
   zona de compra. Es la única vista que responde a «¿cómo va lo mío?» sin pedir
   ningún clic.

   Dos bloques:
     1) POSICIONES — las dos carteras (Propia y compartida) JUNTAS, porque para
        mirar cómo va el día da igual de qué bolsillo salió. Cada ficha lleva el
        precio actual, la variación del DÍA (en € sobre tu posición y en %) y,
        debajo, la plusvalía acumulada, que es lo que de verdad importa al método.
     2) CERCA DE ENTRADA — las que NO están en cartera y el Kanban sitúa «En zona»
        o «Cerca de entrada», con su precio de entrada, su cotización y cuánto le
        falta. Es la lista de la compra: lo que hay que mirar cuando entra dinero.

   De dónde salen los datos (todo ya existente, no se inventa nada):
     · invPositions()  -> posiciones consolidadas de DB.operaciones
     · etapaDe()       -> la etapa del Kanban (21-embudo.js), misma que el tablero
     · DB.analisis     -> decisión, banda de entrada y PO del dossier
     · _intradia       -> precio de sesión y cierre anterior (01-core.js)
   La variación del día necesita el cierre anterior. Si no hay intradía —fin de
   semana, o el pase aún no ha corrido— NO se inventa: se dice «sin datos de hoy»
   y se enseña solo la plusvalía, que no depende de la sesión.
   ============================================================================= */

function _mcNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _mcUp(x){ return (x||'').toString().toUpperCase(); }
function _mcEur(x){ return (typeof fmt==='function')?fmt(x):(_mcNum(x).toFixed(2)+' €'); }
function _mcPct(x,d){ d=(d==null)?2:d; return (x>=0?'+':'')+x.toFixed(d)+'%'; }
/* El precio MEDIO de compra pide más decimales que un importe: 3,5742 € no es 3,57 €,
   y sobre 6.549 acciones esa diferencia son 29 €. Hasta 4 decimales, sin ceros de relleno. */
function _mcPrecio(x){
  x=_mcNum(x);
  const d=(Math.abs(x)<10)?4:(Math.abs(x)<100?3:2);
  return x.toFixed(d).replace(/0+$/,'').replace(/[.,]$/,'').replace('.',',')+' €';
}
function _mcEsc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function _mcAna(t){ t=_mcUp(t); return (DB.analisis||[]).find(function(a){ return _mcUp(a.ticker)===t; })||null; }
function _mcNombre(t){
  const v=(DB.valores||{})[_mcUp(t)]||{}; if(v.nombre)return v.nombre;
  const a=_mcAna(t); if(a&&a.nombre)return a.nombre;
  return _mcUp(t);
}
/* Cotización viva: la misma que usa el resto de la app. */
function _mcCot(t){
  const v=(DB.valores||{})[_mcUp(t)]||{}; const p=_mcNum(v.precioActual);
  if(p>0)return p;
  const a=_mcAna(t); return _mcNum(a&&a.cotizacion);
}
/* Cierre anterior, SOLO si el intradía de hoy lo trae. Sin él no hay variación del día. */
function _mcCierreAnt(t){
  const j=(typeof _intradia!=='undefined')?_intradia:(window._intradia||null);
  if(!j||!j.datos)return 0;
  const f=j.datos[_mcUp(t)]; return _mcNum(f&&f.cierreAnt);
}

/* De cuándo es el precio que se está enseñando. Es la pregunta que más se hace uno
   mirando una cartera («¿esto es de ahora o del viernes?») y la app tenía la respuesta
   repartida entre dos sitios. Devuelve {txt, tipo:'intradia'|'cierre'|'?'}.  */
function _mcSelloDe(t){
  t=_mcUp(t);
  const j=(typeof _intradia!=='undefined')?_intradia:(window._intradia||null);
  if(j&&j.datos&&j.datos[t]&&_mcNum(j.datos[t].p)>0&&j.hora)
    return {tipo:'intradia', txt:'hoy '+j.hora, det:'precio de la sesión en curso'+(j.retrasoMin?(', con '+j.retrasoMin+' min de retraso'):'')};
  const v=(DB.valores||{})[t]||{};
  if(v.precioManual&&v.precioFecha) return {tipo:'manual', txt:'manual '+_mcFecha(v.precioFecha), det:'precio puesto a mano'};
  if(v.precioFecha) return {tipo:'cierre', txt:'cierre '+_mcFecha(v.precioFecha), det:'último cierre consolidado'};
  return {tipo:'?', txt:'sin fecha', det:'no consta de cuándo es este precio'};
}
function _mcFecha(iso){
  if(!iso)return '';
  if(typeof ddmmyyyy==='function'){ try{ return ddmmyyyy(iso); }catch(e){} }
  const p=String(iso).slice(0,10).split('-');
  return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):String(iso);
}
/* Resumen para la cabecera: de cuándo son los precios del conjunto. */
function _mcSelloGlobal(tickers){
  const c={}; let det='';
  tickers.forEach(function(t){ const s=_mcSelloDe(t); c[s.tipo]=(c[s.tipo]||0)+1; if(!det)det=s.det; });
  const j=(typeof _intradia!=='undefined')?_intradia:(window._intradia||null);
  const n=tickers.length;
  if(c.intradia===n&&j) return {cls:'viva', txt:'Cotizaciones de <b>hoy '+j.hora+'</b>'+(j.retrasoMin?(' · retraso '+j.retrasoMin+' min'):'')+' · provisionales, no son cierres'};
  if(c.intradia&&j)     return {cls:'viva', txt:'<b>'+c.intradia+' de '+n+'</b> con precio de hoy '+j.hora+(j.retrasoMin?(' (retraso '+j.retrasoMin+' min)'):'')+'; el resto, último cierre'};
  /* sin intradía: la fecha del cierre más reciente que tengamos */
  let f=''; tickers.forEach(function(t){ const v=(DB.valores||{})[_mcUp(t)]||{}; if(v.precioFecha&&v.precioFecha>f)f=v.precioFecha; });
  if(f) return {cls:'cierre', txt:'Cotizaciones del <b>cierre del '+_mcFecha(f)+'</b> · el pase intradía no ha corrido hoy'};
  return {cls:'cierre', txt:'Sin fecha en las cotizaciones'};
}

/* --------------------------------------------------------------------------
   Bloque 1 · posiciones (las dos carteras juntas)
   -------------------------------------------------------------------------- */
function _mcPosiciones(){
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){ return p.acciones>0.0001; });
  /* Un mismo ticker puede estar en las dos carteras: se funden en una sola línea,
     con el precio medio ponderado. Para «cómo va hoy» dos fichas del mismo valor
     son ruido; el desglose por cartera ya está en la vista Cartera. */
  const map={};
  pos.forEach(function(p){
    const t=_mcUp(p.ticker); const m=map[t]||(map[t]={ticker:t,acc:0,cost:0,carteras:{}});
    m.acc+=p.acciones; m.cost+=p.acciones*p.precioCompra;
    m.carteras[p.cartera||'Propia']=true;
  });
  return Object.keys(map).map(function(t){
    const m=map[t], pm=m.acc?m.cost/m.acc:0, cot=_mcCot(t), ant=_mcCierreAnt(t);
    const valor=m.acc*cot, coste=m.acc*pm;
    const o={ticker:t, nombre:_mcNombre(t), acc:m.acc, pmedio:pm, cot:cot,
             valor:valor, coste:coste, pl:valor-coste, plPct:coste>0?(valor-coste)/coste*100:0,
             carteras:Object.keys(m.carteras).sort()};
    if(ant>0&&cot>0){ o.diaPct=(cot-ant)/ant*100; o.diaEur=m.acc*(cot-ant); }
    return o;
  }).sort(function(a,b){ return b.valor-a.valor; });
}

/* --------------------------------------------------------------------------
   Bloque 2 · cerca de entrada (NO en cartera)
   -------------------------------------------------------------------------- */
function _mcCercaEntrada(){
  if(typeof etapaDe!=='function') return null;          /* sin el Kanban no se inventa la etapa */
  const held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  const out=[];
  (DB.analisis||[]).forEach(function(a){
    const t=_mcUp(a.ticker); if(!t||held.has(t))return;
    let et=''; try{ et=etapaDe(t); }catch(e){ return; }
    if(et!=='En zona'&&et!=='Cerca de entrada')return;
    const eM=_mcNum(a.entMax), eMin=_mcNum(a.entMin), cot=_mcCot(t);
    if(!(eM>0)||!(cot>0))return;
    out.push({ticker:t, nombre:_mcNombre(t), etapa:et, cot:cot, entMax:eM, entMin:eMin,
              po:_mcNum((typeof poBaseDe==='function')?poBaseDe(a):a.poMax),
              decision:_mcUp(a.decision),
              /* negativo = ya está por debajo de la entrada (dentro de zona) */
              gap:(cot-eM)/eM*100});
  });
  return out.sort(function(x,y){ return x.gap-y.gap; });
}

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */
function renderMiCartera(){
  const el=document.getElementById('mcBody'); if(!el)return;
  _mcCSS();
  const P=_mcPosiciones();
  const valor=P.reduce(function(s,p){ return s+p.valor; },0);
  const coste=P.reduce(function(s,p){ return s+p.coste; },0);
  const pl=valor-coste, plPct=coste>0?pl/coste*100:0;
  const conDia=P.filter(function(p){ return p.diaEur!=null; });
  const diaEur=conDia.reduce(function(s,p){ return s+p.diaEur; },0);
  const diaPct=(valor-diaEur)>0?diaEur/(valor-diaEur)*100:0;
  const selloG=_mcSelloGlobal(P.map(function(p){ return p.ticker; }));

  /* ---- KPIs ---- */
  let kpis='<div class="pos-kpis mc-kpis">'
    +'<div class="k hero"><div class="l">Valor de la cartera</div><div class="v">'+_mcEur(valor)+'</div>'
    +'<div class="p">'+P.length+' '+(P.length===1?'empresa':'empresas')+' · ambas carteras</div></div>';
  if(conDia.length){
    kpis+='<div class="k"><div class="l">Hoy</div><div class="v '+(diaEur>=0?'pos':'neg')+'">'
      +(diaEur>=0?'+':'')+_mcEur(diaEur)+'</div><div class="p">'+_mcPct(diaPct)
      +(conDia.length<P.length?(' · '+conDia.length+' de '+P.length+' con dato'):'')+'</div></div>';
  } else {
    kpis+='<div class="k"><div class="l">Hoy</div><div class="v muted" style="font-size:16px">sin datos de hoy</div>'
      +'<div class="p">fuera de sesión o el pase intradía aún no ha corrido</div></div>';
  }
  kpis+='<div class="k"><div class="l">Plusvalía</div><div class="v '+(pl>=0?'pos':'neg')+'">'
      +(pl>=0?'+':'')+_mcEur(pl)+'</div><div class="p">'+_mcPct(plPct,1)+' sobre un coste de '+_mcEur(coste)+'</div></div>';
  kpis+='</div>';
  if(P.length) kpis+='<div class="mc-fuente '+selloG.cls+'"><span class="d"></span>'+selloG.txt+'</div>';

  /* ---- posiciones ---- */
  let lista='';
  if(!P.length){
    lista='<div class="empty">Sin posiciones abiertas. Las compras se registran en <b>Cartera</b>.</div>';
  } else {
    lista=P.map(function(p){
      const dia=(p.diaEur!=null)
        ? '<div class="mc-dia '+(p.diaEur>=0?'pos':'neg')+'">'+(p.diaEur>=0?'+':'')+_mcEur(p.diaEur)
          +' <span>('+_mcPct(p.diaPct)+')</span></div>'
        : '<div class="mc-dia muted">— <span>sin dato de hoy</span></div>';
      const compartida=(p.carteras.length>1)||(p.carteras[0]&&p.carteras[0]!=='Propia');
      const sp=_mcSelloDe(p.ticker);
      return '<div class="mc-row" data-ficha="'+p.ticker+'" title="Abrir la ficha de '+_mcEsc(p.nombre)+'">'
        +'<div class="mc-l">'
        +  '<div class="mc-nom">'+_mcEsc(p.nombre)
        +    (compartida?'<span class="mc-cart">'+_mcEsc(p.carteras.join(' + '))+'</span>':'')+'</div>'
        +  '<div class="mc-sub">BME · <b>'+p.ticker+'</b></div>'
        +  '<div class="mc-sub">Compra '+(Math.round(p.acc*10000)/10000)+' @ '+_mcPrecio(p.pmedio)+'</div>'
        +'</div>'
        +'<div class="mc-r">'
        +  '<div class="mc-cot">'+_mcEur(p.cot)+'</div>'
        +  '<div class="mc-cuando '+sp.tipo+'" title="'+_mcEsc(sp.det)+'">'+_mcEsc(sp.txt)+'</div>'
        +  dia
        +  '<div class="mc-pl '+(p.pl>=0?'pos':'neg')+'">'+(p.pl>=0?'+':'')+_mcEur(p.pl)+' <span>('+_mcPct(p.plPct,1)+')</span></div>'
        +'</div>'
        +'</div>';
    }).join('');
    lista='<div class="mc-list">'+lista+'</div>'
      +'<div class="mc-leyenda">La cifra grande es la <b>cotización</b>. Debajo, la variación del <b>día</b> '
      +'sobre tu posición y, en gris, la <b>plusvalía acumulada</b> desde tu precio medio.</div>';
  }

  /* ---- cerca de entrada ---- */
  const C=_mcCercaEntrada();
  let cerca='';
  if(C===null){
    cerca='<div class="empty">No puedo calcular las etapas del Kanban en este momento.</div>';
  } else if(!C.length){
    cerca='<div class="mc-vacio">Ninguna empresa analizada está en zona de entrada ahora mismo. '
      +'Aquí aparecerán en cuanto el precio se acerque a su banda de compra.</div>';
  } else {
    cerca='<div class="mc-list">'+C.map(function(c){
      const dentro=c.gap<=0; const sc=_mcSelloDe(c.ticker);
      const chip=dentro
        ? '<span class="mc-chip in">🟢 en zona</span>'
        : '<span class="mc-chip near">🟡 a '+_mcPct(c.gap,1).replace('+','')+'</span>';
      const barra=(function(){
        /* Escala visual: 0% = precio de entrada, +margen = borde derecho. */
        const m=(typeof _emMargen==='function')?_emMargen():0.05;
        const p=Math.max(0,Math.min(1,(c.gap/100+m)/(2*m)));
        return '<div class="mc-bar"><i style="left:'+(p*100).toFixed(1)+'%"></i></div>';
      })();
      return '<div class="mc-row cerca" data-ficha="'+c.ticker+'" title="Abrir la ficha de '+_mcEsc(c.nombre)+'">'
        +'<div class="mc-l">'
        +  '<div class="mc-nom">'+_mcEsc(c.nombre)+' '+chip+'</div>'
        +  '<div class="mc-sub">BME · <b>'+c.ticker+'</b> · '+_mcEsc(c.decision||'—')
        +    (c.po>0?(' · PO '+_mcEur(c.po)):'')+'</div>'
        +  barra
        +'</div>'
        +'<div class="mc-r">'
        +  '<div class="mc-cot">'+_mcEur(c.cot)+'</div>'
        +  '<div class="mc-cuando '+sc.tipo+'" title="'+_mcEsc(sc.det)+'">'+_mcEsc(sc.txt)+'</div>'
        +  '<div class="mc-dia muted">entrada ≤ <b>'+_mcEur(c.entMax)+'</b></div>'
        +  '<div class="mc-pl '+(dentro?'pos':'neg')+'">'+(dentro?'ya comprable':'faltan '+_mcEur(c.cot-c.entMax))+'</div>'
        +'</div>'
        +'</div>';
    }).join('')+'</div>';
  }

  el.innerHTML=kpis
    +'<div class="mc-h">Posiciones</div>'+lista
    +'<div class="mc-h">Cerca de entrada <span class="mc-h-s">las que aún no tienes</span></div>'+cerca;

  if(!el._mcBound){
    el._mcBound=true;
    el.addEventListener('click',function(e){
      const f=e.target.closest('[data-ficha]'); if(!f)return;
      const t=f.getAttribute('data-ficha');
      if(typeof abrirFicha==='function'){ abrirFicha(t); return; }
      if(typeof activarVista==='function') activarVista('inversiones');
    });
  }
}

/* --------------------------------------------------------------------------
   Estilos · se inyectan una vez, con el mismo lenguaje visual del resto de la app
   (tarjetas .card/.pos-kpis, variables --panel/--line/--muted, verdes y rojos ya
   usados en Movimientos y Análisis).
   -------------------------------------------------------------------------- */
function _mcCSS(){
  if(document.getElementById('mc-css'))return;
  const s=document.createElement('style'); s.id='mc-css';
  s.textContent=[
    '#view-micartera .mc-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '@media(max-width:760px){#view-micartera .mc-kpis{grid-template-columns:minmax(0,1fr);gap:8px}}',
    '#view-micartera .mc-fuente{display:flex;align-items:center;gap:8px;font-size:12px;color:#334155;',
    '  border-radius:10px;padding:8px 12px;margin:-4px 0 16px}',
    '#view-micartera .mc-fuente .d{width:8px;height:8px;border-radius:50%;flex:none}',
    '#view-micartera .mc-fuente.viva{background:#eef2ff;border:1px solid #c7d2fe}',
    '#view-micartera .mc-fuente.viva .d{background:#4f46e5}',
    '#view-micartera .mc-fuente.cierre{background:#f8fafc;border:1px solid var(--line)}',
    '#view-micartera .mc-fuente.cierre .d{background:#94a3b8}',
    '#view-micartera .mc-cuando{font-size:10px;font-weight:700;color:#94a3b8;margin-top:1px;letter-spacing:.01em}',
    '#view-micartera .mc-cuando.intradia{color:#4f46e5}',
    '#view-micartera .mc-cuando.manual{color:#b45309}',
    '#view-micartera .mc-h{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;',
    '  color:var(--muted);margin:22px 0 8px;display:flex;align-items:baseline;gap:8px}',
    '#view-micartera .mc-h-s{font-size:11px;font-weight:600;text-transform:none;letter-spacing:0;opacity:.8}',
    '#view-micartera .mc-list{background:var(--panel);border:1px solid var(--line);border-radius:14px;',
    '  box-shadow:var(--shadow);overflow:hidden}',
    '#view-micartera .mc-row{display:flex;align-items:flex-start;gap:12px;padding:13px 16px;cursor:pointer;',
    '  border-bottom:1px solid var(--line);transition:background .12s}',
    '#view-micartera .mc-row:last-child{border-bottom:none}',
    '#view-micartera .mc-row:hover{background:#f8fafc}',
    '#view-micartera .mc-l{flex:1 1 auto;min-width:0}',
    '#view-micartera .mc-r{flex:none;text-align:right;min-width:132px}',
    '#view-micartera .mc-nom{font-size:16px;font-weight:700;color:#0f172a;line-height:1.25;',
    '  display:flex;align-items:center;gap:7px;flex-wrap:wrap}',
    '#view-micartera .mc-sub{font-size:11.5px;color:var(--muted);margin-top:2px}',
    '#view-micartera .mc-sub b{color:#475569}',
    '#view-micartera .mc-cart{font-size:9.5px;font-weight:700;background:#eef2ff;color:#3730a3;',
    '  border:1px solid #c7d2fe;border-radius:20px;padding:1px 7px}',
    '#view-micartera .mc-cot{font-size:19px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums;line-height:1.2}',
    '#view-micartera .mc-dia{font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:1px}',
    '#view-micartera .mc-dia span{font-weight:600}',
    '#view-micartera .mc-pl{font-size:11px;color:var(--muted);font-weight:600;margin-top:3px;font-variant-numeric:tabular-nums}',
    '#view-micartera .pos{color:#16a34a}#view-micartera .neg{color:#dc2626}',
    '#view-micartera .mc-pl.pos{color:#15803d}#view-micartera .mc-pl.neg{color:#b91c1c}',
    '#view-micartera .muted{color:var(--muted)}',
    '#view-micartera .mc-chip{font-size:10px;font-weight:800;border-radius:20px;padding:1px 8px}',
    '#view-micartera .mc-chip.in{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}',
    '#view-micartera .mc-chip.near{background:#fef3c7;color:#92400e;border:1px solid #fde68a}',
    '#view-micartera .mc-bar{position:relative;height:5px;background:linear-gradient(90deg,#bbf7d0,#fde68a);',
    '  border-radius:4px;margin-top:7px;max-width:230px}',
    '#view-micartera .mc-bar i{position:absolute;top:-3px;width:3px;height:11px;background:#0f172a;border-radius:2px;transform:translateX(-1px)}',
    '#view-micartera .mc-leyenda{font-size:11.5px;color:var(--muted);margin-top:7px;line-height:1.5}',
    '#view-micartera .mc-vacio{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:12px;',
    '  padding:13px 15px;font-size:13px}',
    '@media(max-width:560px){',
    '  #view-micartera .mc-row{padding:11px 13px;gap:8px}',
    '  #view-micartera .mc-nom{font-size:15px}',
    '  #view-micartera .mc-cot{font-size:17px}',
    '  #view-micartera .mc-r{min-width:118px}',
    '}',
  ].join('');
  document.head.appendChild(s);
}
