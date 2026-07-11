/* ===== 11-calibracion.js — Recordatorio de Calibración Ex-Post =====
   Marcador del Método KH&Claude: a los 6, 12 y 36 meses de la fecha del dossier
   de cada empresa toca evaluar ex-post la tesis (¿entró en banda?, ¿tocó stop?,
   ¿alcanzó PO?, retorno). La app SEÑALA la diana; la evaluación se rellena en el
   Excel "Calibración Ex-Post - Método KH&Claude.xlsx" (mejora nº 2 del backlog).

   · Dianas = dossierFecha + 6/12/36 meses (mismo campo que el aviso ">12 meses").
   · Estado "hecha" por empresa e hito en DB.calibracion[TICKER][hito] = {done,fecha,nota}.
   · Aviso en el Panel cuando una diana vence y no está marcada como hecha.
   · Tarjeta en la Ficha con las 3 dianas, su estado y el botón "marcar calibrada".
   Principio: LA APP SEÑALA; LA CALIBRACIÓN SE REGISTRA EN EL EXCEL. */

const CALIB_HITOS = [ {k:'6m', meses:6}, {k:'12m', meses:12}, {k:'36m', meses:36} ];
const CALIB_COLOR = '#0f766e';

function _calibHoy(){ return new Date().toISOString().slice(0,10); }
function _calibEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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

/* Datos de calibración de una empresa: sus 3 hitos con diana y estado */
function calibDataFor(ticker){
  ticker = (ticker||'').toUpperCase();
  const a = (DB.analisis||[]).find(x => (x.ticker||'').toUpperCase() === ticker);
  if(!a || !a.dossierFecha) return null;
  const reg = (DB.calibracion||{})[ticker] || {};
  const hoy = _calibHoy();
  return {
    ticker, nombre: a.nombre||'', dossierFecha: a.dossierFecha,
    hitos: CALIB_HITOS.map(h => {
      const diana = _calibDiana(a.dossierFecha, h.meses);
      const info = reg[h.k] || null;
      const done = !!(info && info.done);
      const vencida = !done && diana && diana <= hoy;
      return { k:h.k, meses:h.meses, diana, done, vencida, info, dias:_calibDiasHasta(diana) };
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
             + ` <span data-calibopen="${d.ticker}|${h.k}" style="cursor:pointer;font-size:10px;font-weight:700;color:#0f766e;background:#ccfbf1;border-radius:8px;padding:1px 6px" title="Ver qué hacer y marcar como calibrada">revisar →</span>`
      });
    });
  });
  return out;
}

/* ---------- Modal: qué hacer + marcar calibrada ---------- */
function _calibDlg(){
  let dlg = document.getElementById('calibDlg');
  if(!dlg){
    dlg = document.createElement('dialog');
    dlg.id = 'calibDlg';
    dlg.style.cssText = 'max-width:540px;width:92vw;border:none;border-radius:14px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,.3)';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if(e.target === dlg) dlg.close(); });
  }
  return dlg;
}

function showCalib(ticker, hito){
  ticker = (ticker||'').toUpperCase(); hito = (hito||'').toLowerCase();
  const d = calibDataFor(ticker); if(!d) return;
  const h = d.hitos.find(x => x.k === hito) || d.hitos[0];
  const dlg = _calibDlg();
  const estadoTxt = h.done ? `Calibrada el ${h.info.fecha||'—'}` : (h.vencida ? `Vencida (diana ${h.diana}, hace ${-h.dias} días)` : `Próxima: ${h.diana} (faltan ${h.dias} días)`);
  dlg.innerHTML =
    `<div style="background:${CALIB_COLOR};color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px">
       <span style="font-size:22px">📐</span>
       <div style="flex:1"><div style="font-weight:800;font-size:16px">Calibración ex-post ${h.k} · ${ticker}</div>
       <div style="font-size:12px;opacity:.9">${estadoTxt}</div></div>
       <button id="calibX" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1">✕</button>
     </div>
     <div style="padding:14px 18px;max-height:65vh;overflow:auto">
       <div style="font-size:13px;line-height:1.5;color:#334155;margin-bottom:10px">Ha llegado la diana de <b>${h.meses} meses</b> desde el análisis (${d.dossierFecha}). Toca confrontar lo que la tesis predijo con lo que la cotización hizo después.</div>
       <div style="font-weight:800;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px">Qué hacer</div>
       <div style="display:flex;gap:10px;margin:8px 0"><div style="flex:none;width:22px;height:22px;border-radius:50%;background:${CALIB_COLOR};color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center">1</div><div style="font-size:13px;line-height:1.5">Abre <b>«Calibración Ex-Post - Método KH&Claude.xlsx»</b> (carpeta Herramientas), hoja <b>Evaluaciones</b>, y busca la fila <b>${ticker} · ${h.k}</b>.</div></div>
       <div style="display:flex;gap:10px;margin:8px 0"><div style="flex:none;width:22px;height:22px;border-radius:50%;background:${CALIB_COLOR};color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center">2</div><div style="font-size:13px;line-height:1.5">Rellena las celdas amarillas: cotización en la diana, máximo y mínimo del periodo, dividendos cobrados, ¿stop justificado? y tesis intacta. Las columnas de veredicto se calculan solas.</div></div>
       <div style="display:flex;gap:10px;margin:8px 0"><div style="flex:none;width:22px;height:22px;border-radius:50%;background:${CALIB_COLOR};color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center">3</div><div style="font-size:13px;line-height:1.5">Vuelve aquí y pulsa <b>«Marcar como calibrada»</b> para apagar el aviso.</div></div>
       <label style="display:block;margin-top:10px;font-size:12px;color:#475569">Nota (opcional: veredicto en una línea)
         <textarea id="calibNota" rows="2" style="width:100%;box-sizing:border-box;margin-top:4px;font-size:13px;padding:6px;border:1px solid #cbd5e1;border-radius:6px">${h.info&&h.info.nota?_calibEsc(h.info.nota):''}</textarea></label>
     </div>
     <div style="padding:10px 18px 14px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e2e8f0;flex-wrap:wrap">
       ${h.done
         ? `<button class="btn ghost sm" id="calibReopen">↺ Reabrir (marcar pendiente)</button>`
         : `<button class="btn sm" id="calibDone" style="background:${CALIB_COLOR};border-color:${CALIB_COLOR}">✓ Marcar como calibrada</button>`}
       <button class="btn ghost sm" id="calibClose">Cerrar</button>
     </div>`;
  dlg.querySelector('#calibX').onclick = () => dlg.close();
  dlg.querySelector('#calibClose').onclick = () => dlg.close();
  const bDone = dlg.querySelector('#calibDone');
  if(bDone) bDone.onclick = () => { _calibSet(ticker, h.k, true, dlg.querySelector('#calibNota').value.trim()); dlg.close(); };
  const bRe = dlg.querySelector('#calibReopen');
  if(bRe) bRe.onclick = () => { _calibSet(ticker, h.k, false, dlg.querySelector('#calibNota').value.trim()); dlg.close(); };
  dlg.showModal();
}

function _calibSet(ticker, hito, done, nota){
  ticker = (ticker||'').toUpperCase();
  DB.calibracion = DB.calibracion || {};
  DB.calibracion[ticker] = DB.calibracion[ticker] || {};
  if(done){
    DB.calibracion[ticker][hito] = { done:true, fecha:_calibHoy(), nota:nota||'' };
  } else {
    if(DB.calibracion[ticker][hito]) DB.calibracion[ticker][hito] = { done:false, fecha:'', nota:nota||'' };
  }
  if(typeof saveNow==='function') saveNow();
  if(typeof renderPanelDash==='function') renderPanelDash();
  if(typeof fichaTicker!=='undefined' && fichaTicker && typeof renderFicha==='function') renderFicha(fichaTicker);
}

/* ---------- Tarjeta en la Ficha ---------- */
function calibFichaHTML(ticker){
  const d = calibDataFor(ticker);
  if(!d) return '';
  const rows = d.hitos.map(h => {
    let chip, acc;
    if(h.done){
      chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#ccfbf1;color:#0f766e">✓ CALIBRADA${h.info&&h.info.fecha?' · '+h.info.fecha:''}</span>`;
      acc = `<button class="btn ghost sm" data-calibopen="${d.ticker}|${h.k}" title="Ver / reabrir">↺</button>`;
    } else if(h.vencida){
      chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#fef3c7;color:#92400e">⏰ VENCIDA · hace ${-h.dias} d</span>`;
      acc = `<button class="btn sm" data-calibopen="${d.ticker}|${h.k}" style="background:${CALIB_COLOR};border-color:${CALIB_COLOR}">Calibrar</button>`;
    } else {
      chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#f1f5f9;color:#64748b">Próxima · faltan ${h.dias} d</span>`;
      acc = '';
    }
    return `<tr>
      <td style="font-weight:700;white-space:nowrap">${h.k}</td>
      <td style="white-space:nowrap">${h.diana||'—'}</td>
      <td>${chip}</td>
      <td style="font-size:11.5px;line-height:1.4">${h.info&&h.info.nota?_calibEsc(h.info.nota):''}</td>
      <td class="right">${acc}</td>
    </tr>`;
  }).join('');
  return `<div class="card" style="margin-top:10px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="font-weight:800;font-size:15px">📐 Calibración ex-post (6 / 12 / 36 meses)</div>
    </div>
    <div class="sub" style="margin-bottom:6px">Dianas contadas desde el análisis (${d.dossierFecha}). Cuando venza una, rellena su fila en el Excel «Calibración Ex-Post» y márcala aquí para apagar el aviso.</div>
    <div style="overflow:auto"><table><thead><tr><th>Hito</th><th>Fecha diana</th><th>Estado</th><th>Nota</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}

/* ---------- Eventos delegados ---------- */
document.addEventListener('click', e => {
  const op = e.target.closest && e.target.closest('[data-calibopen]');
  if(op){ e.stopPropagation(); const a=(op.dataset.calibopen||'').split('|'); showCalib(a[0], a[1]); return; }
});
