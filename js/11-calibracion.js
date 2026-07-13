/* ===== 11-calibracion.js — Calibración Ex-Post (formulario integrado) =====
   Marcador del Método KH&Claude: a los 6, 12 y 36 meses de la fecha del dossier
   de cada empresa toca evaluar ex-post la tesis (¿entró en banda?, ¿tocó stop?,
   ¿alcanzó PO Base?, retorno). Antes la evaluación se rellenaba SOLO en el Excel;
   ahora se registra DENTRO de la app y el Excel queda como copia (el botón
   «Copiar fila para Excel» genera la fila lista para pegar).

   Estructura en DB.calibracion[TICKER]:
     · t0     -> línea base congelada {cot0, poBase, entMax, stop, decision}
                 (editable; se siembra del Excel Registro t0 y de DB.analisis).
     · 6m/12m/36m -> evaluación del hito:
                 {done, fecha, nota, cotDiana, maxP, minP, div, stopJust, tesis}
   Veredictos (retornos, banda, stop, PO) se CALCULAN, no se guardan — igual
   que las columnas negras del Excel. NO inventar datos: lo que falte queda vacío. */

const CALIB_HITOS = [ {k:'6m', meses:6}, {k:'12m', meses:12}, {k:'36m', meses:36} ];
const CALIB_COLOR = '#0f766e';

/* Semilla de la línea base t0 (Excel «Registro t0») para las empresas ya
   analizadas. Solo aporta cot0 y poBase (lo que DB.analisis no guarda); entMax,
   stop y decision se toman en vivo de DB.analisis si no hay valor almacenado.
   Para empresas nuevas no listadas aquí, la base se prerrellena de DB.analisis
   y el operador la confirma/edita en el formulario. */
const CALIB_T0_SEED = {
  MAP:{cot0:4.18,  poBase:4.43,  entMax:3.5, stop:2.35, decision:'ESPERAR'},
  ELE:{cot0:37.01, poBase:28.65, entMax:30,  stop:21.7, decision:'ESPERAR'},
  IBE:{cot0:20.32, poBase:26.5,  entMax:21,  stop:10.4, decision:'COMPRAR'},
  NTGY:{cot0:28.8, poBase:32.81, entMax:26,  stop:20.1, decision:'MANTENER'},
  REP:{cot0:21.81, poBase:18,    entMax:16,  stop:11.7, decision:'ESPERAR'},
  SAN:{cot0:11.35, poBase:8.3,   entMax:7.2, stop:5.9,  decision:'ESPERAR'},
  LOG:{cot0:33.9,  poBase:34,    entMax:30,  stop:22.7, decision:'MANTENER'},
  A3M:{cot0:4.82,  poBase:5.15,  entMax:4.3, stop:2.5,  decision:'ESPERAR'},
  VIS:{cot0:57.2,  poBase:47.8,  entMax:45,  stop:25,   decision:'ESPERAR'},
  ITX:{cot0:55.72, poBase:44.5,  entMax:46,  stop:30.8, decision:'ESPERAR'},
  BKT:{cot0:15.395,poBase:10.2,  entMax:11,  stop:7,    decision:'ESPERAR'},
  VID:{cot0:88.3,  poBase:107.3, entMax:90,  stop:63.5, decision:'COMPRAR'}
};

function _calibHoy(){ return new Date().toISOString().slice(0,10); }
function _calibEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* número tolerante: acepta '1.234,56' o '1234.56' o number; '' -> null */
function _calibN(x){
  if(x==null||x==='') return null;
  if(typeof x==='number') return isNaN(x)?null:x;
  let s=(''+x).trim().replace(/\s/g,'').replace(/€/g,'');
  if(s.indexOf(',')>-1 && s.indexOf('.')>-1) s=s.replace(/\./g,'').replace(',','.');
  else s=s.replace(',','.');
  const n=parseFloat(s); return isNaN(n)?null:n;
}
function _calibIsN(x){ return typeof x==='number' && !isNaN(x); }
function _calibFmt(n,dec){ return _calibIsN(n)?n.toLocaleString('es-ES',{minimumFractionDigits:dec==null?2:dec,maximumFractionDigits:dec==null?2:dec}):'—'; }
function _calibPct(n){ return _calibIsN(n)?(n>=0?'+':'')+(n*100).toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—'; }

/* dossierFecha (YYYY-MM-DD) + N meses -> YYYY-MM-DD, con recorte de día a fin de mes */
function _calibDiana(fechaStr, meses){
  if(!fechaStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaStr);
  if(!m) return null;
  let y = +m[1], mo = (+m[2]-1) + meses, day = +m[3];
  y += Math.floor(mo/12); mo = ((mo%12)+12)%12;
  const ultimoDia = new Date(y, mo+1, 0).getDate();
  if(day > ultimoDia) day = ultimoDia;
  return y + '-' + String(mo+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
}

function _calibDiasHasta(diana){
  const a = new Date(diana+'T00:00:00'), b = new Date(_calibHoy()+'T00:00:00');
  return Math.round((a - b) / 86400000);
}

/* ---------- Línea base t0 (congelada, editable) ---------- */
function calibBaseline(ticker){
  ticker = (ticker||'').toUpperCase();
  const a = (DB.analisis||[]).find(x => (x.ticker||'').toUpperCase() === ticker) || {};
  const stored = ((DB.calibracion||{})[ticker]||{}).t0 || {};
  const seed = CALIB_T0_SEED[ticker] || {};
  const pick = (k, fallback) => {
    if(stored[k]!=null && stored[k]!=='') return stored[k];
    if(seed[k]!=null && seed[k]!=='') return seed[k];
    return fallback;
  };
  return {
    cot0:   _calibN(pick('cot0',   a.cotizacion)),
    poBase: _calibN(pick('poBase', a.precioObjetivo)),
    entMax: _calibN(pick('entMax', a.entMax)),
    stop:   _calibN(pick('stop',   a.stopTesis)),
    decision: (pick('decision', a.decision)||'').toString().toUpperCase()
  };
}

/* ---------- Veredictos calculados (columnas negras del Excel) ---------- */
function calibVerdicto(base, ev){
  ev = ev || {};
  const cot = _calibN(ev.cotDiana), mx = _calibN(ev.maxP), mn = _calibN(ev.minP), dv = _calibN(ev.div);
  const evaluada = _calibIsN(cot);
  return {
    evaluada,
    retPrecio: (evaluada && _calibIsN(base.cot0) && base.cot0!==0) ? (cot/base.cot0 - 1) : null,
    retTotal:  (evaluada && _calibIsN(base.cot0) && base.cot0!==0) ? ((cot + (_calibIsN(dv)?dv:0))/base.cot0 - 1) : null,
    entroBanda: (_calibIsN(mn) && _calibIsN(base.entMax)) ? (mn <= base.entMax ? 'SÍ' : 'NO') : null,
    tocoStop:   (_calibIsN(mn) && _calibIsN(base.stop))   ? (mn <= base.stop   ? 'SÍ' : 'NO') : null,
    alcanzoPO:  (_calibIsN(mx) && _calibIsN(base.poBase)) ? (mx >= base.poBase ? 'SÍ' : 'NO') : null
  };
}

/* Datos de calibración de una empresa: sus 3 hitos con diana, estado y evaluación */
function calibDataFor(ticker){
  ticker = (ticker||'').toUpperCase();
  const a = (DB.analisis||[]).find(x => (x.ticker||'').toUpperCase() === ticker);
  if(!a || !a.dossierFecha) return null;
  const reg = (DB.calibracion||{})[ticker] || {};
  const base = calibBaseline(ticker);
  const hoy = _calibHoy();
  return {
    ticker, nombre: a.nombre||'', dossierFecha: a.dossierFecha, base,
    hitos: CALIB_HITOS.map(h => {
      const diana = _calibDiana(a.dossierFecha, h.meses);
      const info = reg[h.k] || null;
      const done = !!(info && info.done);
      const vencida = !done && diana && diana <= hoy;
      const ver = calibVerdicto(base, info);
      return { k:h.k, meses:h.meses, diana, done, vencida, info, ver, dias:_calibDiasHasta(diana) };
    })
  };
}

/* ---------- Avisos para el Panel (dianas vencidas sin marcar) ---------- */
function calibAvisos(){
  const out = [];
  (DB.analisis||[]).forEach(a => {
    const d = calibDataFor(a.ticker);
    if(!d) return;
    d.hitos.forEach(h => {
      if(!h.vencida) return;
      const atraso = -h.dias; // días desde que venció
      out.push({
        pri: atraso > 30 ? 2 : 3, cls:'a', goto:'monitor',
        txt: `📐 <b><span data-ficha="${d.ticker}" style="cursor:pointer;color:var(--brand)">${d.ticker}</span></b> — calibración ex-post <b>${h.k}</b> pendiente (diana ${h.diana})`
             + ` <span data-calibopen="${d.ticker}|${h.k}" style="cursor:pointer;font-size:10px;font-weight:700;color:#0f766e;background:#ccfbf1;border-radius:8px;padding:1px 6px" title="Rellenar la evaluación ex-post">rellenar →</span>`
      });
    });
  });
  return out;
}

/* ---------- Modal ---------- */
function _calibDlg(){
  let dlg = document.getElementById('calibDlg');
  if(!dlg){
    dlg = document.createElement('dialog');
    dlg.id = 'calibDlg';
    dlg.style.cssText = 'max-width:600px;width:94vw;border:none;border-radius:14px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,.3)';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if(e.target === dlg) dlg.close(); });
  }
  return dlg;
}

function _calibInp(id,val,ph){ return `<input id="${id}" value="${val==null?'':_calibEsc(val)}" placeholder="${ph||''}" inputmode="decimal" style="width:100%;box-sizing:border-box;font-size:13px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px">`; }

/* pinta el panel de veredictos en vivo dentro del modal */
function _calibPintaVer(dlg, base){
  const g = id => (dlg.querySelector('#'+id)||{}).value;
  const ev = { cotDiana:g('cCot'), maxP:g('cMax'), minP:g('cMin'), div:g('cDiv') };
  const v = calibVerdicto(base, ev);
  const chip = (txt,ok) => `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:${ok==null?'#f1f5f9':(ok?'#dcfce7':'#fee2e2')};color:${ok==null?'#64748b':(ok?'#166534':'#991b1b')}">${txt}</span>`;
  const box = dlg.querySelector('#cVer');
  if(!box) return;
  box.innerHTML =
    `<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px">
       <div><span style="color:#64748b">Retorno precio</span><br><b style="font-size:15px;color:${v.retPrecio==null?'#94a3b8':(v.retPrecio>=0?'#166534':'#991b1b')}">${_calibPct(v.retPrecio)}</b></div>
       <div><span style="color:#64748b">Retorno total</span><br><b style="font-size:15px;color:${v.retTotal==null?'#94a3b8':(v.retTotal>=0?'#166534':'#991b1b')}">${_calibPct(v.retTotal)}</b></div>
     </div>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
       ${chip('¿Entró en banda? '+(v.entroBanda||'—'), v.entroBanda==null?null:v.entroBanda==='SÍ')}
       ${chip('¿Tocó stop? '+(v.tocoStop||'—'), v.tocoStop==null?null:v.tocoStop==='NO')}
       ${chip('¿Alcanzó PO Base? '+(v.alcanzoPO||'—'), v.alcanzoPO==null?null:v.alcanzoPO==='SÍ')}
     </div>`;
}

function showCalib(ticker, hito){
  ticker = (ticker||'').toUpperCase(); hito = (hito||'').toLowerCase();
  const d = calibDataFor(ticker); if(!d) return;
  const h = d.hitos.find(x => x.k === hito) || d.hitos[0];
  const base = d.base;
  const info = h.info || {};
  const dlg = _calibDlg();
  const estadoTxt = h.done ? `Calibrada el ${info.fecha||'—'}` : (h.vencida ? `Vencida (diana ${h.diana}, hace ${-h.dias} días)` : `Próxima: ${h.diana} (faltan ${h.dias} días)`);
  const selJust = v => ['—','JUSTIFICADO','RUIDO'].map(o=>`<option${o===(v||'—')?' selected':''}>${o}</option>`).join('');
  const selTesis = v => ['—','SÍ','NO'].map(o=>`<option${o===(v||'—')?' selected':''}>${o}</option>`).join('');

  dlg.innerHTML =
    `<div style="background:${CALIB_COLOR};color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px">
       <span style="font-size:22px">📐</span>
       <div style="flex:1"><div style="font-weight:800;font-size:16px">Calibración ex-post ${h.k} · ${ticker}</div>
       <div style="font-size:12px;opacity:.9">${estadoTxt}</div></div>
       <button id="calibX" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1">✕</button>
     </div>
     <div style="padding:14px 18px;max-height:74vh;overflow:auto">

       <details style="margin-bottom:12px"${(!_calibIsN(base.cot0)||!_calibIsN(base.poBase))?' open':''}>
         <summary style="cursor:pointer;font-weight:800;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Línea base t0 (congelada · ${d.dossierFecha})</summary>
         <div style="font-size:11.5px;color:#64748b;margin:6px 0 8px">La foto de la tesis el día del análisis. Contra esto se miden los veredictos. Decisión t0: <b>${base.decision||'—'}</b>.</div>
         <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px">
           <label style="font-size:11px;color:#475569">Cotización t0 (€)${_calibInp('bCot',base.cot0,'ej. 20,32')}</label>
           <label style="font-size:11px;color:#475569">PO Base (€)${_calibInp('bPo',base.poBase,'ej. 26,50')}</label>
           <label style="font-size:11px;color:#475569">Entrada máx (€)${_calibInp('bEnt',base.entMax,'techo banda')}</label>
           <label style="font-size:11px;color:#475569">Stop (€)${_calibInp('bStop',base.stop,'nivel stop')}</label>
         </div>
       </details>

       <div style="display:flex;align-items:center;gap:8px;margin:4px 0 4px;flex-wrap:wrap">
         <div style="font-weight:800;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Evaluación en la diana (${h.diana})</div>
         <div style="flex:1"></div>
         <button class="btn ghost sm" id="calibAuto" style="font-weight:700;color:${CALIB_COLOR};border-color:${CALIB_COLOR}" title="Trae cotización en la diana, máximo y mínimo del periodo (cierres de precios/${ticker}.json) y dividendos cobrados del histórico">⚡ Auto-rellenar desde histórico</button>
       </div>
       <div id="calibAutoMsg" style="font-size:11px;color:#64748b;margin:0 0 6px"></div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px">
         <label style="font-size:11px;color:#475569">Cotización en la diana (€)${_calibInp('cCot',info.cotDiana,'cierre en la fecha')}</label>
         <label style="font-size:11px;color:#475569">Dividendos cobrados (€)${_calibInp('cDiv',info.div,'acumulado t0→diana')}</label>
         <label style="font-size:11px;color:#475569">Máximo del periodo (€)${_calibInp('cMax',info.maxP,'máx t0→diana')}</label>
         <label style="font-size:11px;color:#475569">Mínimo del periodo (€)${_calibInp('cMin',info.minP,'mín t0→diana')}</label>
         <label style="font-size:11px;color:#475569">¿Stop justificado?<select id="cJust" style="width:100%;box-sizing:border-box;font-size:13px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px">${selJust(info.stopJust)}</select></label>
         <label style="font-size:11px;color:#475569">Tesis intacta<select id="cTesis" style="width:100%;box-sizing:border-box;font-size:13px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px">${selTesis(info.tesis)}</select></label>
       </div>

       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-top:12px">
         <div style="font-weight:800;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Veredicto (se calcula solo)</div>
         <div id="cVer"></div>
       </div>

       <label style="display:block;margin-top:10px;font-size:11px;color:#475569">Notas (veredicto en una línea)
         <textarea id="calibNota" rows="2" style="width:100%;box-sizing:border-box;margin-top:4px;font-size:13px;padding:6px;border:1px solid #cbd5e1;border-radius:6px">${info.nota?_calibEsc(info.nota):''}</textarea></label>

       <div style="font-size:11px;color:#64748b;margin-top:8px">Reglas: <b>entró en banda</b> si el mínimo tocó el techo de la banda (Mín ≤ Entrada máx) · <b>tocó stop</b> si Mín ≤ Stop · <b>alcanzó PO</b> si Máx ≥ PO Base · <b>retorno total</b> = (cot. diana + dividendos) / cot. t0 − 1.</div>
     </div>
     <div style="padding:10px 18px 14px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e2e8f0;flex-wrap:wrap">
       <button class="btn ghost sm" id="calibCopy" title="Copiar la fila lista para pegar en el Excel (Cot diana · Máx · Mín · Div · Stop just. · Tesis · Notas)">📋 Copiar fila para Excel</button>
       ${h.done ? `<button class="btn ghost sm" id="calibReopen">↺ Reabrir</button>` : ''}
       <button class="btn sm" id="calibSave" style="background:${CALIB_COLOR};border-color:${CALIB_COLOR}">💾 Guardar${h.done?'':' y marcar calibrada'}</button>
       <button class="btn ghost sm" id="calibClose">Cerrar</button>
     </div>`;

  const readBase = () => ({
    cot0:_calibN(dlg.querySelector('#bCot').value), poBase:_calibN(dlg.querySelector('#bPo').value),
    entMax:_calibN(dlg.querySelector('#bEnt').value), stop:_calibN(dlg.querySelector('#bStop').value),
    decision:base.decision
  });
  const readEv = () => ({
    cotDiana:dlg.querySelector('#cCot').value.trim(), maxP:dlg.querySelector('#cMax').value.trim(),
    minP:dlg.querySelector('#cMin').value.trim(), div:dlg.querySelector('#cDiv').value.trim(),
    stopJust:dlg.querySelector('#cJust').value, tesis:dlg.querySelector('#cTesis').value,
    nota:dlg.querySelector('#calibNota').value.trim()
  });

  _calibPintaVer(dlg, readBase());
  ['bCot','bPo','bEnt','bStop','cCot','cMax','cMin','cDiv'].forEach(id => {
    const el = dlg.querySelector('#'+id); if(el) el.addEventListener('input', () => _calibPintaVer(dlg, readBase()));
  });

  dlg.querySelector('#calibX').onclick = () => dlg.close();
  dlg.querySelector('#calibClose').onclick = () => dlg.close();
  dlg.querySelector('#calibSave').onclick = () => { _calibGuardar(ticker, h.k, readBase(), readEv(), true); dlg.close(); };
  const bRe = dlg.querySelector('#calibReopen');
  if(bRe) bRe.onclick = () => { _calibGuardar(ticker, h.k, readBase(), readEv(), false); dlg.close(); };
  dlg.querySelector('#calibCopy').onclick = () => _calibCopiarFila(ticker, h.k, readEv());

  // Auto-rellenar cotización diana + máx/mín del periodo (precios/TICKER.json) y dividendos (DB.dividendos)
  const doAuto = async () => {
    const btn = dlg.querySelector('#calibAuto'), msg = dlg.querySelector('#calibAutoMsg');
    if(btn){ btn.disabled = true; if(!btn.dataset.o) btn.dataset.o = btn.textContent; btn.textContent = '⏳ Cargando…'; }
    const fin = t => { if(btn){ btn.disabled = false; btn.textContent = btn.dataset.o || '⚡ Auto-rellenar desde histórico'; } if(msg) msg.textContent = t||''; };
    let pj = (typeof _precioCache !== 'undefined' && _precioCache) ? _precioCache[ticker] : undefined;
    if(pj === undefined || pj === null){
      try{ const r = await fetch('precios/' + ticker + '.json', {cache:'no-store'}); pj = r.ok ? await r.json() : null; }catch(e){ pj = null; }
      if(typeof _precioCache !== 'undefined' && _precioCache) _precioCache[ticker] = pj;
    }
    if(!pj || !pj.data || !pj.data.length){ fin('⚠️ No hay histórico en precios/' + ticker + '.json — rellena a mano.'); return; }
    const data = pj.data.filter(p => Array.isArray(p) && p[0] && typeof p[1] === 'number');
    const t0 = d.dossierFecha, dia = h.diana;
    const hasta = data.filter(p => p[0] <= dia);           // data viene ordenada ascendente
    const per   = data.filter(p => p[0] >= t0 && p[0] <= dia);
    if(!hasta.length || !per.length){ fin('⚠️ Sin cierres en el tramo ' + t0 + '→' + dia + '.'); return; }
    const cot = hasta[hasta.length - 1];                    // último cierre en/antes de la diana
    const precios = per.map(p => p[1]);
    const mx = Math.max.apply(null, precios), mn = Math.min.apply(null, precios);
    const divs = ((DB.dividendos||{})[ticker]||[]).filter(x => x && x.fecha && x.fecha > t0 && x.fecha <= dia);
    const sumDiv = divs.reduce((s,x) => s + (_calibN(x.importe)||0), 0);
    const set = (id,val) => { const el = dlg.querySelector('#'+id); if(el && val!=null) el.value = ''+val; };
    set('cCot', cot[1]); set('cMax', mx); set('cMin', mn);
    if(divs.length) set('cDiv', Math.round(sumDiv*10000)/10000);
    _calibPintaVer(dlg, readBase());
    const aviso = (cot[0] < dia) ? ' · ⚠️ aún sin cierre en la diana; usado el último disponible (' + cot[0] + ')' : '';
    fin('✓ ' + per.length + ' cierres · ' + divs.length + ' dividendo(s). Revisa y guarda.' + aviso);
  };
  dlg.querySelector('#calibAuto').onclick = doAuto;

  dlg.showModal();
}

/* ---------- Persistencia ---------- */
function _calibGuardar(ticker, hito, base, ev, done){
  ticker = (ticker||'').toUpperCase();
  DB.calibracion = DB.calibracion || {};
  DB.calibracion[ticker] = DB.calibracion[ticker] || {};
  // línea base t0 (solo si hay algo que guardar)
  DB.calibracion[ticker].t0 = {
    cot0:base.cot0, poBase:base.poBase, entMax:base.entMax, stop:base.stop, decision:base.decision
  };
  // evaluación del hito — done automático si hay cotización en la diana
  const hayCot = _calibIsN(_calibN(ev.cotDiana));
  const prev = DB.calibracion[ticker][hito] || {};
  DB.calibracion[ticker][hito] = {
    done: done ? (hayCot || !!prev.done || true) : false,
    fecha: done ? (prev.fecha || _calibHoy()) : '',
    nota: ev.nota||'',
    cotDiana:ev.cotDiana||'', maxP:ev.maxP||'', minP:ev.minP||'', div:ev.div||'',
    stopJust:ev.stopJust||'—', tesis:ev.tesis||'—'
  };
  if(!done) DB.calibracion[ticker][hito].done = false;
  _calibRefrescar();
}

/* toggle rápido done (usado por el check del calendario del radar) — preserva la evaluación */
function _calibToggleDone(ticker, hito, on){
  ticker=(ticker||'').toUpperCase();
  DB.calibracion = DB.calibracion || {}; DB.calibracion[ticker] = DB.calibracion[ticker] || {};
  const prev = DB.calibracion[ticker][hito] || {};
  DB.calibracion[ticker][hito] = Object.assign({}, prev, { done:!!on, fecha: on ? (prev.fecha||_calibHoy()) : '' });
  _calibRefrescar();
}

function _calibRefrescar(){
  if(typeof saveNow==='function') saveNow();
  if(typeof renderPanelDash==='function') renderPanelDash();
  if(typeof renderCobertura==='function') renderCobertura();
  if(typeof fichaTicker!=='undefined' && fichaTicker && typeof renderFicha==='function') renderFicha(fichaTicker);
}

/* copiar fila TSV para pegar en la hoja Evaluaciones del Excel (columnas H..N) */
function _calibCopiarFila(ticker, hito, ev){
  const g = v => (v==null?'':(''+v).replace(/\t/g,' '));
  const fila = [g(ev.cotDiana), g(ev.maxP), g(ev.minP), g(ev.div), g(ev.stopJust==='—'?'':ev.stopJust), g(ev.tesis==='—'?'':ev.tesis), g(ev.nota)].join('\t');
  const done = () => { const b=document.getElementById('calibCopy'); if(b){ const t=b.textContent; b.textContent='✓ Copiada'; setTimeout(()=>b.textContent=t,1400); } };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(fila).then(done).catch(()=>done()); }
  else { const ta=document.createElement('textarea'); ta.value=fila; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); done(); }
}

/* ---------- Tarjeta en la Ficha ---------- */
function calibFichaHTML(ticker){
  const d = calibDataFor(ticker);
  if(!d) return '';
  const vchip = (txt,ok) => txt==null?'<span class="muted">—</span>':`<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:7px;background:${ok?'#dcfce7':'#fee2e2'};color:${ok?'#166534':'#991b1b'}">${txt}</span>`;
  const rows = d.hitos.map(h => {
    const v = h.ver;
    let chip, acc;
    if(h.done){
      chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#ccfbf1;color:#0f766e">✓ CALIBRADA${h.info&&h.info.fecha?' · '+h.info.fecha:''}</span>`;
      acc = `<button class="btn ghost sm" data-calibopen="${d.ticker}|${h.k}" title="Ver / editar">✎</button>`;
    } else if(h.vencida){
      chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#fef3c7;color:#92400e">⏰ VENCIDA · hace ${-h.dias} d</span>`;
      acc = `<button class="btn sm" data-calibopen="${d.ticker}|${h.k}" style="background:${CALIB_COLOR};border-color:${CALIB_COLOR}">Calibrar</button>`;
    } else {
      chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#f1f5f9;color:#64748b">Próxima · faltan ${h.dias} d</span>`;
      acc = `<button class="btn ghost sm" data-calibopen="${d.ticker}|${h.k}" title="Adelantar / ver">👁</button>`;
    }
    const verCell = v.evaluada
      ? `<span title="Retorno total" style="font-weight:700;color:${v.retTotal!=null&&v.retTotal>=0?'#166534':'#991b1b'}">${_calibPct(v.retTotal)}</span>
         ${vchip(v.entroBanda?('banda '+v.entroBanda):null, v.entroBanda==='SÍ')}
         ${vchip(v.tocoStop?('stop '+v.tocoStop):null, v.tocoStop==='NO')}
         ${vchip(v.alcanzoPO?('PO '+v.alcanzoPO):null, v.alcanzoPO==='SÍ')}`
      : '<span class="muted" style="font-size:11px">sin datos</span>';
    return `<tr>
      <td style="font-weight:700;white-space:nowrap">${h.k}</td>
      <td style="white-space:nowrap">${h.diana||'—'}</td>
      <td>${chip}</td>
      <td style="font-size:11px;line-height:1.5">${verCell}</td>
      <td class="right">${acc}</td>
    </tr>`;
  }).join('');
  const baseTxt = _calibIsN(d.base.cot0)
    ? `t0 ${_calibFmt(d.base.cot0)}€ · PO Base ${_calibFmt(d.base.poBase)}€ · banda≤${_calibFmt(d.base.entMax)}€ · stop ${_calibFmt(d.base.stop)}€`
    : 'línea base t0 sin completar — se pide al calibrar';
  return `<div class="card" style="margin-top:10px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="font-weight:800;font-size:15px">📐 Calibración ex-post (6 / 12 / 36 meses)</div>
    </div>
    <div class="sub" style="margin-bottom:2px">Dianas contadas desde el análisis (${d.dossierFecha}). La evaluación se rellena aquí; el botón «Copiar fila para Excel» genera la fila para duplicarla en el Excel.</div>
    <div class="sub" style="margin-bottom:6px;font-size:11px;color:#64748b">${baseTxt}</div>
    <div style="overflow:auto"><table><thead><tr><th>Hito</th><th>Fecha diana</th><th>Estado</th><th>Veredicto</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}

/* ---------- Eventos delegados ---------- */
document.addEventListener('click', e => {
  const op = e.target.closest && e.target.closest('[data-calibopen]');
  if(op){ e.stopPropagation(); const a=(op.dataset.calibopen||'').split('|'); showCalib(a[0], a[1]); return; }
});
