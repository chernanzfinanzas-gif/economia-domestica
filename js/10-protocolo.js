/* ===== 10-protocolo.js — Protocolo de Revisión Extraordinaria (señales S1–S6) =====
   1) Ventanas emergentes con el procedimiento al pinchar un aviso del Panel
      (o el badge "revisar tesis" del Monitor trimestral de la Ficha).
   2) Registro de revisiones: DB.protocolo[TICKER] = [apuntes {fecha, sig, cot,
      decision, limite, motivo, estado}]. Se rellena desde el propio popup
      ("Registrar apunte"), se muestra en la Ficha y avisa en el Panel si un
      apunte queda abierto y vence. Espejo del registro §10.5 del Excel.
   Norma oficial: "Protocolo de Revisión Extraordinaria.md" (método KH&Claude).
   Principio: LA APP SEÑALA; EL MÉTODO DECIDE. */

const PROTOCOLO_SENALES = {
  S1: {
    icono: '🚨', color: '#dc2626', titulo: 'Stop de tesis alcanzado', plazo: '48 horas', dias: 2,
    que: 'La cotización ha tocado o perforado el stop de tesis. Es la señal más grave: obliga a decidir si la tesis está ROTA o si es ruido de mercado. No es una orden de venta automática.',
    pasos: [
      '<b>Verifica el dato.</b> Cotización correcta y fresca (no un error de actualización ni un pico intradía).',
      '<b>Pregunta única:</b> ¿la TESIS está rota o es ruido? Repasa: (a) ¿ha cambiado algún pilar de la tesis (Bloque 9)?; (b) ¿hay red flags §10.4 activas?; (c) ¿qué dijo el último monitor trimestral (semáforo y tesis intacta)?; (d) ¿se ha materializado algún escenario del Pre-Mortem (§8.2)?',
      '<b>Decide una de tres</b> (por escrito): <b>VENDER</b> (tesis rota — ejecutar y anotar la lección) · <b>MANTENER con stop recalculado</b> (tesis intacta: recalcular con la regla oficial sobre datos ACTUALIZADOS; si el suelo bear no ha cambiado, el stop NO baja — regla anti-anclaje) · <b>Pte. Revisión con fecha límite</b> (falta un dato decisivo, p. ej. resultados en &lt;2 semanas).',
      '<b>Registra en los dos lados</b> el mismo día: Excel Vigilancia §10.5 y esta app (botón «Registrar apunte»).'
    ],
    nota: 'Anti-anclaje: prohibido bajar el stop "porque el precio ha caído". Solo baja si la re-valoración con datos nuevos baja el suelo bear.'
  },
  S2: {
    icono: '🔴', color: '#dc2626', titulo: 'Semáforo trimestral ROJO / tesis en duda', plazo: '7 días', dias: 7,
    que: 'El monitor trimestral ha salido en rojo o marca la tesis como no intacta. Hay que determinar si el deterioro es un hecho puntual (one-off) o estructural.',
    pasos: [
      '<b>Monitor extraordinario:</b> relee el informe del periodo (tablas, no titulares) y contrasta las métricas con los umbrales §10.1 del Excel.',
      '<b>Si es puntual:</b> anótalo en §10.5 con la justificación y mantén. El trimestre queda rojo pero la tesis intacta.',
      '<b>Si es estructural:</b> pide a Claude re-ejecutar los Bloques 8–9 (riesgos y tesis) sin esperar a la actualización anual: <i>"iniciar bloque 8 de [Empresa]"</i>. Si la decisión o los PO cambian, se regenera el JSON del dossier y se sube al repo.',
      '<b>Registra en los dos lados</b> (Excel §10.5 + app), sea cual sea el desenlace.'
    ],
    nota: 'La app señala pero nunca reescribe la tesis: el cambio se decide en el método y se vuelca aquí después.'
  },
  S3: {
    icono: '🎯', color: '#d97706', titulo: 'Precio objetivo alcanzado', plazo: '7 días', dias: 7,
    que: 'La cotización ha llegado al PO base (o al PO máximo). Es la mitad de salida del ciclo: hay que revisar la decisión, no necesariamente vender.',
    pasos: [
      '<b>Clasifica la tesis:</b> ¿era de VALORACIÓN (comprada por descuento) o de RENTA (comprada por dividendo)? Está en el resumen de la tesis del dossier.',
      '<b>Tesis de valoración</b> · cot ≥ PO base: ¿queda recorrido real o el PO estaba desactualizado? → vender/recortar o re-valorar con datos nuevos. Si cot ≥ PO máximo: la venta es la opción por defecto; mantener exige justificación escrita.',
      '<b>Tesis de renta:</b> el PO alcanzado no obliga a vender. Comprueba si la RPD a la cotización actual sigue cumpliendo tu criterio de entrada y anota la conclusión.',
      '<b>Registra en los dos lados</b> (Excel §10.5 + app).'
    ],
    nota: 'Nunca subas el PO o la banda de entrada en esta revisión sin re-valoración formal (Bloque 6). El precio no es un argumento.'
  },
  S4: {
    icono: '📅', color: '#d97706', titulo: 'Dossier con más de 12 meses', plazo: 'Programar (sin urgencia)', dias: 30,
    que: 'El análisis profundo de esta empresa ha caducado: sus PO, bandas y stop pueden no reflejar la realidad actual.',
    pasos: [
      '<b>Programa la actualización anual</b> para el mes siguiente a la publicación de los resultados FY de la empresa: <i>"actualización anual de [Empresa]"</i>.',
      '<b>Anota la fecha objetivo</b> en el §10.5 del Excel y como apunte aquí (decisión «Pte. Revisión» con esa fecha límite).',
      '<b>Hasta entonces</b>, trata los PO y bandas de esta empresa con cautela extra en las decisiones de compra.'
    ],
    nota: 'Este aviso no se apaga hasta que el nuevo dossier y su JSON estén publicados en el repo.'
  },
  S5: {
    icono: '📊', color: '#d97706', titulo: 'Trimestre publicado sin revisar', plazo: '14 días desde publicación', dias: 14,
    que: 'La empresa ha publicado resultados y aún no están registrados en el monitor trimestral. Sin ese registro, el sistema de vigilancia está ciego este periodo.',
    pasos: [
      '<b>Descarga el informe</b> del trimestre a <i>Empresas/[Empresa]/Informes/Trimestrales/</i> (formato: "[AÑO] Q[N] Resultados [Empresa].pdf").',
      '<b>Lanza el monitor:</b> <i>"analizar informe trimestral de [Empresa]"</i>. Claude elegirá las ~10 métricas, asignará semáforo razonado y actualizará Excel + JSON del puente.',
      '<b>Sube el JSON</b> a <i>dossiers/trimestral/</i> del repo: el aviso se apagará solo.'
    ],
    nota: 'Si el semáforo resultante es ROJO, se activa la señal S2 (7 días).'
  },
  S6: {
    icono: '🟡', color: '#d97706', titulo: 'Dos trimestres consecutivos en ámbar', plazo: 'Con el segundo trimestre', dias: 14,
    que: 'Un ámbar aislado es vigilancia; dos seguidos son una tendencia candidata a deterioro.',
    pasos: [
      '<b>Mini-revisión de tendencia:</b> compara las métricas ámbar con los umbrales §10.1 y con el mismo periodo del año anterior.',
      '<b>Concluye en una línea</b> en el §10.5 y como apunte aquí: "tendencia adversa confirmada → tratar como S2" o "ruido estacional → seguir en ordinario".'
    ],
    nota: 'Si se confirma la tendencia, aplica el procedimiento S2 (monitor extraordinario y, si procede, Bloques 8–9).'
  }
};

/* [28-jul-2026] LAS CUATRO DEL METODO, NI UNA MAS.
   Este desplegable ofrecia un vocabulario propio —«SIN CAMBIOS (justificado)», «RECORTAR
   POSICION», «RE-VALORAR»— que no coincidia con ninguna de las cuatro etiquetas del §10.5.
   Resultado: cada apunte creado desde la app entraba en el registro con una decision que el
   validador rechaza. Era la CAUSA RAIZ del desorden: se podian normalizar los apuntes viejos
   cuantas veces se quisiera, que la app seguiria produciendo los nuevos mal.
   `PTE. REVISIÓN` se queda porque no es una decision, es «aun no he decidido, recuerdamelo el
   dia X» — y al copiar la fila se traduce a `ABIERTA`, que es como lo llama el §10.5. */
const PROTO_DECISIONES = ['REAFIRMAR','AJUSTA PO','REBAJA','VENDE','PTE. REVISIÓN'];
const PROTO_DEC_AYUDA = {
  'REAFIRMAR':'la tesis aguanta; no cambia nada (un no-cambio justificado también es una decisión)',
  'AJUSTA PO':'la tesis vive, pero se mueven PO, banda de entrada o stop',
  'REBAJA':'baja el veredicto (de COMPRAR a MANTENER, de MANTENER a ESPERAR…)',
  'VENDE':'la tesis está rota',
  'PTE. REVISIÓN':'aún no hay decisión; queda abierta con fecha límite → en el §10.5 va como ABIERTA'
};

/* Señales de precio y días de silencio tras registrar su revisión (compartido con el panel). */
/* ===== Fila para el Excel (§10.5) =====
   El protocolo obliga al DOBLE REGISTRO: el mismo apunte en la app y en el Excel de la empresa.
   Hasta ahora eso era teclearlo dos veces, con el riesgo de que la segunda no llegara. Aqui se
   genera la fila TSV lista para pegar en el registro §10.5, con el mismo patron que el boton
   «Copiar fila para Excel» de la calibracion ex-post.
   Columnas del registro: A=Fecha · B=Senal · C=Cotizacion (EUR) · D=Decision · E:N=Motivo. */
const _PROTO_MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function _protoFechaExcel(iso){
  const m = (''+(iso||'')).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? ((+m[3])+'-'+_PROTO_MES[(+m[2])-1]+'-'+m[1]) : (''+(iso||''));
}
/* [28-jul-2026 · POR QUE LA COPIA VA EN DOS PASOS]
   La columna Motivo del §10.5 no es una celda: es **E:N combinada**. Al pegar de golpe las cinco
   columnas, la quinta cae DENTRO de la combinacion sin cubrirla entera y Excel lo rechaza con
   «no se puede cambiar parte de una celda combinada». No es un fallo del portapapeles ni del
   Excel: es que un rango de 5 columnas y una combinacion de 10 no encajan.

   Se resuelve partiendo la copia: primero las CUATRO columnas simples —Fecha, Senal, Cotizacion,
   Decision— que se pegan en A de una vez; despues el motivo SOLO, que se pega en E, y un valor
   suelto sobre el ancla de una celda combinada si lo admite.

   No se toca la plantilla del Excel: la combinacion E:N esta ahi para que el motivo se lea de
   corrido, y desmontarla por comodidad de pegado estropearia lo que se ve. */
function _protoFilaExcel(ap){
  const g = v => (v==null?'':(''+v).replace(/[\t\r\n]+/g,' ').trim());
  /* Coma decimal: si va con punto, un Excel en espanol lo pega como texto y no como numero. */
  const cot = (ap.cot==null||ap.cot==='') ? '' : (''+ap.cot).replace('.',',');
  /* El §10.5 no conoce «PTE. REVISIÓN»: su estado transitorio se llama ABIERTA, y es el que la
     Nota sobrescribe al cerrar la señal. Se traduce aquí para que lo que se pega ya sea correcto. */
  let dec = g(ap.decision);
  if(dec.toUpperCase().indexOf('PTE')===0) dec='ABIERTA';
  return [_protoFechaExcel(ap.fecha), g(ap.sig), cot, dec].join('\t');
}
/* El Motivo vive en `E:N` COMBINADA — diez columnas. Copiarlo a secas deja en el portapapeles un
   rango de 1 columna, y Excel se queja de que «no tiene el mismo tamaño que su selección» porque
   la selección son las diez de la combinación.
   La solución es que el portapapeles tenga EXACTAMENTE ese tamaño: el motivo seguido de nueve
   tabuladores. Entonces el rango pegado es E:N, coincide con la combinación, y entra sin diálogo.
   Si algún libro tuviera otra anchura de combinación, el modo edición (doble clic en la celda y
   pegar dentro) sigue funcionando siempre — por eso el aviso lo sigue diciendo. */
var PROTO_MOTIVO_COLS = 10;          /* E..N */
function _protoMotivoExcel(ap){
  var m=(ap.motivo==null?'':(''+ap.motivo).replace(/[\t\r\n]+/g,' ').trim());
  return m + new Array(PROTO_MOTIVO_COLS).join('\t');   /* 9 tabuladores -> 10 columnas */
}
function _protoAlPortapapeles(txt, cb){
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(cb).catch(cb); return; }
  const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy');}catch(e){} ta.remove(); cb&&cb();
}
/* Alterna entre los dos pasos. El propio boton dice en cual esta, para no tener que recordarlo. */
function _protoCopiarFila(ap, btn){
  const paso = (btn && btn.dataset.pcpaso==='2') ? 2 : 1;
  const txt  = (paso===1) ? _protoFilaExcel(ap) : _protoMotivoExcel(ap);
  _protoAlPortapapeles(txt, function(){
    if(!btn)return;
    if(paso===1){
      btn.dataset.pcpaso='2';
      btn.textContent=(btn.id==='paCopy')?'📋 2/2 · ahora el Motivo':'📋 2/2';
      btn.title='Copiadas las cuatro primeras columnas: pégalas en la celda de la Fecha (columna A). '
              + 'Ahora pulsa otra vez para copiar el Motivo, que se pega en su celda de la columna E.';
    }else{
      btn.dataset.pcpaso='1';
      btn.textContent='✓ 2/2';
      btn.title='Motivo copiado con el ancho exacto de la celda combinada (E:N). Clic en su celda y pega. '
              + 'Si aun así se queja, doble clic (o F2) y pega dentro.';
      var _orig=(btn.id==='paCopy')?'📋 1/2 Fecha·Señal·Cotiz.·Decisión':'📋';
      setTimeout(function(){ btn.textContent=_orig; btn.title=_PROTO_TIT_COPIA; },2200);
    }
  });
  return txt;
}
var _PROTO_TIT_COPIA='Copiar la fila para el §10.5 en dos pasos. '
  +'1) Fecha·Señal·Cotización·Decisión → clic en la celda de la Fecha (columna A) y pegar. '
  +'2) el Motivo → clic en su celda y pegar; se copia con el ancho exacto de la combinación E:N, así que entra sin avisos. '
  +'Si algún libro se quejara, doble clic (o F2) y pegar dentro: en modo edición entra siempre.';
/* Lee el formulario del dialogo tal y como esta ahora, para poder copiar antes de guardar. */
function _protoLeerForm(dlg, sigPorDefecto, hoy){
  return { fecha: dlg.querySelector('#paFecha').value || hoy,
           sig: (dlg.querySelector('#paSig').value || sigPorDefecto || '').toUpperCase(),
           cot: dlg.querySelector('#paCot').value || '',
           decision: dlg.querySelector('#paDec').value || '',
           motivo: (dlg.querySelector('#paMotivo').value || '').trim() };
}

const PROTO_SIG_PRECIO = {S1:1,S3:1};
const PROTO_SILENCIO_DIAS = 60;

function _protoDlg(){
  let dlg = document.getElementById('protoDlg');
  if(!dlg){
    dlg = document.createElement('dialog');
    dlg.id = 'protoDlg';
    dlg.style.cssText = 'max-width:560px;width:92vw;border:none;border-radius:14px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,.3)';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if(e.target === dlg) dlg.close(); });
  }
  return dlg;
}
function _protoHoy(){ return new Date().toISOString().slice(0,10); }
function _protoEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showProtocolo(sig, goto, ticker){
  sig=(sig||'').toUpperCase(); ticker=(ticker||'').toUpperCase();
  const p = PROTOCOLO_SENALES[sig];
  if(!p) return;
  const dlg=_protoDlg();
  const pasos = p.pasos.map((t,i) =>
    `<div style="display:flex;gap:10px;margin:8px 0"><div style="flex:none;width:22px;height:22px;border-radius:50%;background:${p.color};color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center">${i+1}</div><div style="font-size:13px;line-height:1.5">${t}</div></div>`
  ).join('');
  dlg.innerHTML =
    `<div style="background:${p.color};color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px">
       <span style="font-size:22px">${p.icono}</span>
       <div style="flex:1"><div style="font-weight:800;font-size:16px">${sig} — ${p.titulo}${ticker?' · '+ticker:''}</div>
       <div style="font-size:12px;opacity:.9">Protocolo de Revisión Extraordinaria · plazo: <b>${p.plazo}</b></div></div>
       <button id="protoX" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1">✕</button>
     </div>
     <div style="padding:14px 18px;max-height:65vh;overflow:auto">
       <div style="font-size:13px;line-height:1.5;color:#334155;margin-bottom:10px">${p.que}</div>
       <div style="font-weight:800;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px">Procedimiento</div>
       ${pasos}
       <div style="margin-top:12px;padding:9px 11px;background:#f8fafc;border-left:3px solid ${p.color};border-radius:6px;font-size:12px;color:#475569"><b>Regla:</b> ${p.nota}</div>
       <div style="margin-top:8px;padding:9px 11px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#78350f">📝 <b>Doble registro obligatorio</b> (aunque decidas no actuar): apunte en Excel Vigilancia §10.5 — <span style="font-family:monospace">[fecha] · ${sig} · [cotización] · [decisión] · [motivo]</span> — y el mismo apunte aquí con «Registrar apunte».</div>
     </div>
     <div style="padding:10px 18px 14px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e2e8f0;flex-wrap:wrap">
       <button class="btn sm" id="protoReg" style="background:${p.color};border-color:${p.color}">📝 Registrar apunte</button>
       ${goto?`<button class="btn ghost sm" id="protoGoto">Ir a la sección →</button>`:''}
       <button class="btn ghost sm" id="protoClose">Cerrar</button>
     </div>`;
  dlg.querySelector('#protoX').onclick = () => dlg.close();
  dlg.querySelector('#protoClose').onclick = () => dlg.close();
  dlg.querySelector('#protoReg').onclick = () => protoApunteForm(sig, ticker);
  const g = dlg.querySelector('#protoGoto');
  if(g) g.onclick = () => { dlg.close(); if(typeof activarVista==='function') activarVista(goto); };
  dlg.showModal();
}

/* ---------- Formulario de apunte ---------- */
function protoApunteForm(sig, ticker){
  sig=(sig||'').toUpperCase(); ticker=(ticker||'').toUpperCase();
  const dlg=_protoDlg();
  const p=PROTOCOLO_SENALES[sig]||{color:'#334155',icono:'📋',titulo:'Apunte',dias:7};
  const hoy=_protoHoy();
  const lim=(function(){ const d=new Date(); d.setDate(d.getDate()+(p.dias||7)); return d.toISOString().slice(0,10); })();
  const empresas=(DB.analisis||[]).slice().sort((a,b)=>(a.ticker||'').localeCompare(b.ticker||''));
  const optT=empresas.map(a=>{ const t=(a.ticker||'').toUpperCase(); return `<option value="${t}"${t===ticker?' selected':''}>${t}${a.nombre?' — '+_protoEsc(a.nombre):''}</option>`; }).join('');
  const optS=Object.keys(PROTOCOLO_SENALES).map(s=>`<option value="${s}"${s===sig?' selected':''}>${s} — ${PROTOCOLO_SENALES[s].titulo}</option>`).join('');
  const optD=PROTO_DECISIONES.map(d=>`<option value="${d}">${d}</option>`).join('');
  const cotPre=(function(){ const a=empresas.find(x=>(x.ticker||'').toUpperCase()===ticker); return a?num(a.cotizacion)||'':''; })();
  dlg.innerHTML =
    `<div style="background:${p.color};color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px">
       <span style="font-size:22px">📝</span>
       <div style="flex:1"><div style="font-weight:800;font-size:16px">Registrar apunte — señal ${sig}</div>
       <div style="font-size:12px;opacity:.9">Espejo del registro §10.5 del Excel · el cambio se decide en el método</div></div>
       <button id="protoX" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1">✕</button>
     </div>
     <div style="padding:14px 18px;max-height:65vh;overflow:auto">
       <div class="patgrid">
         <label>Empresa<select id="paTicker" class="anaInp">${optT||'<option value="">—</option>'}</select></label>
         <label>Señal<select id="paSig" class="anaInp">${optS}</select></label>
         <label>Fecha<input type="date" id="paFecha" value="${hoy}"></label>
         <label>Cotización (€)<input type="number" step="0.001" id="paCot" value="${cotPre}"></label>
         <label>Decisión<select id="paDec" class="anaInp">${optD}</select>
           <span id="paDecAyuda" style="display:block;margin-top:3px;font-size:11px;color:#64748b;line-height:1.4"></span></label>
         <label id="paLimWrap">Fecha límite (si Pte.)<input type="date" id="paLim" value="${lim}"></label>
       </div>
       <label style="display:block;margin-top:8px;font-size:12px;color:#475569">Motivo (1–3 líneas: por qué se decide esto)
         <textarea id="paMotivo" rows="3" style="width:100%;box-sizing:border-box;margin-top:4px;font-size:13px;padding:6px;border:1px solid #cbd5e1;border-radius:6px"></textarea></label>
       <div style="margin-top:8px;font-size:11.5px;color:#78350f;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 10px">Al guardar, la fila queda <b>copiada en el portapapeles</b>: pégala directamente en el registro §10.5 del Excel (Vigilancia) con Ctrl+V. El <b>doble registro</b> sigue siendo obligatorio — el §10.5 es el que manda.</div>
     </div>
     <div style="padding:10px 18px 14px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e2e8f0">
       <button class="btn ghost sm" id="paBack">← Volver</button>
       <button class="btn ghost sm" id="paCopy" data-pcpaso="1" title="Copia para el §10.5 en dos pasos, porque la columna Motivo es una celda combinada y no admite pegado en bloque. 1) las cuatro primeras columnas → se pegan en la Fecha (columna A). 2) el Motivo → se pega en la columna E.">📋 1/2 Fecha·Señal·Cotiz.·Decisión</button>
       <button class="btn sm" id="paSave" style="background:${p.color};border-color:${p.color}">Guardar apunte</button>
     </div>`;
  dlg.querySelector('#protoX').onclick=()=>dlg.close();
  /* Las cuatro etiquetas son terse a proposito —van a una celda del Excel—, asi que debajo se
     explica en una linea que significa la elegida. Sin esto habria que saberselas de memoria. */
  const _pdSel=dlg.querySelector('#paDec'), _pdAyu=dlg.querySelector('#paDecAyuda');
  const _pdPinta=()=>{ if(_pdAyu)_pdAyu.textContent=PROTO_DEC_AYUDA[_pdSel.value]||''; };
  if(_pdSel){ _pdSel.addEventListener('change',_pdPinta); _pdPinta(); }
  dlg.querySelector('#paCopy').onclick=()=>_protoCopiarFila(_protoLeerForm(dlg,sig,hoy), dlg.querySelector('#paCopy'));
  dlg.querySelector('#paBack').onclick=()=>showProtocolo(dlg.querySelector('#paSig').value, '', dlg.querySelector('#paTicker').value);
  dlg.querySelector('#paTicker').onchange=e=>{ const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===e.target.value); if(a) dlg.querySelector('#paCot').value=num(a.cotizacion)||''; };
  dlg.querySelector('#paSave').onclick=()=>{
    const t=(dlg.querySelector('#paTicker').value||'').toUpperCase();
    if(!t){ alert('Elige una empresa'); return; }
    const dec=dlg.querySelector('#paDec').value;
    const motivo=dlg.querySelector('#paMotivo').value.trim();
    if(!motivo){ alert('El motivo es obligatorio (es la defensa anti-anclaje).'); return; }
    const ap={ id:(typeof uid==='function')?uid():(''+Date.now()),
      fecha:dlg.querySelector('#paFecha').value||hoy,
      sig:(dlg.querySelector('#paSig').value||sig).toUpperCase(),
      cot:num(dlg.querySelector('#paCot').value)||null,
      decision:dec,
      limite:dec==='PTE. REVISIÓN'?(dlg.querySelector('#paLim').value||lim):'',
      motivo:motivo,
      estado:dec==='PTE. REVISIÓN'?'abierta':'resuelta' };
    /* Se copia la fila ANTES de nada: asi, al cerrar, el portapapeles ya lleva lo que hay
       que pegar en el §10.5 y el doble registro no depende de acordarse. */
    /* La copia automatica al guardar solo puede dejar UNA cosa en el portapapeles: deja las
       cuatro columnas simples, que es lo que se pega primero. El motivo se copia con el boton
       de la fila cuando toque — y el aviso lo dice, para no dejarlo a medias sin avisar. */
    try{ _protoCopiarFila(ap); }catch(e){}
    DB.protocolo=DB.protocolo||{}; (DB.protocolo[t]=DB.protocolo[t]||[]).push(ap);
    DB.protocolo[t].sort((x,y)=>(y.fecha||'').localeCompare(x.fecha||''));
    if(typeof saveNow==='function')saveNow();
    dlg.close();
    if(typeof renderPanelDash==='function')renderPanelDash();
    if(typeof fichaTicker!=='undefined'&&fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker);
    if(typeof diarioDesdeProtocolo==='function') diarioDesdeProtocolo(t,dec,ap.cot,ap.fecha,motivo);
  };
  if(!dlg.open) dlg.showModal();
}

/* ---------- Tarjeta del registro en la Ficha ---------- */
function protoRegHTML(t){
  t=(t||'').toUpperCase();
  const arr=((DB.protocolo||{})[t]||[]);
  const hoy=_protoHoy();
  // Apunte más reciente por señal (el que gobierna el silencio del panel) y señales con apunte abierto.
  const _ultPorSig={}, _abiertaPorSig={};
  arr.forEach(a=>{ if(!a.sig)return; if(!_ultPorSig[a.sig]||(a.fecha||'')>(_ultPorSig[a.sig].fecha||''))_ultPorSig[a.sig]=a; if(a.estado==='abierta')_abiertaPorSig[a.sig]=true; });
  /* [28-jul-2026] Un borrador cuya fila ya está pegada en el Excel no se enseña dos veces:
     sube al bloque de arriba y desaparece de aquí. Ese salto ES la confirmación de que la
     pegaste bien, que era justo lo que no había forma de saber. */
  const yaEnExcel = (typeof revisionesCorpDe==='function' && typeof claveRev==='function')
    ? new Set(revisionesCorpDe(t).filas.map(x=>claveRev(x.fecha,x.senal))) : new Set();
  const arrTodos = arr;
  const arrPend  = arr.filter(a=>!yaEnExcel.has(claveRev(a.fecha,a.sig)));
  const nSubidos = arrTodos.length - arrPend.length;
  const rows=arrPend.map(a=>{
    const p=PROTOCOLO_SENALES[a.sig]||{color:'#64748b',icono:'📋'};
    const vencido=a.estado==='abierta'&&a.limite&&a.limite<hoy;
    // Cuenta atrás del silencio (solo señales de precio resueltas que gobiernan y sin apunte abierto de esa señal).
    let silChip='';
    if(a.estado==='resuelta'&&PROTO_SIG_PRECIO[a.sig]&&a.fecha&&_ultPorSig[a.sig]===a&&!_abiertaPorSig[a.sig]){
      const rem=PROTO_SILENCIO_DIAS-Math.floor((Date.now()-new Date(a.fecha+'T00:00:00').getTime())/86400000);
      silChip=rem>0
        ?`<span title="Si el precio sigue en zona de disparo, la alerta del panel volverá a sonar en ${rem} día(s)." style="display:inline-block;margin-top:3px;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:8px;background:#fef3c7;color:#92400e">⏳ alerta en ${rem} d</span>`
        :`<span title="El silencio de ${PROTO_SILENCIO_DIAS} días ha vencido: si el precio sigue en zona de disparo, la alerta ya está activa en el panel." style="display:inline-block;margin-top:3px;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:8px;background:#e2e8f0;color:#475569">🔔 silencio vencido</span>`;
    }
    const chip=a.estado==='abierta'
      ?`<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:${vencido?'#fee2e2':'#fef3c7'};color:${vencido?'#991b1b':'#92400e'}">${vencido?'⏰ VENCIDO':'ABIERTA'}${a.limite?' · lím. '+a.limite:''}</span>`
      :'<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#dcfce7;color:#166534">RESUELTA</span>';
    return `<tr${vencido?' style="background:#fef2f2"':''}>
      <td style="white-space:nowrap">${a.fecha||'—'}</td>
      <td style="white-space:nowrap"><span title="${_protoEsc((PROTOCOLO_SENALES[a.sig]||{}).titulo||'')}" data-protosig="${a.sig}|${t}" style="cursor:pointer;font-weight:700;color:${p.color}">${p.icono} ${a.sig}</span></td>
      <td class="num">${a.cot!=null&&a.cot!==0?fmt(a.cot):'—'}</td>
      <td style="font-weight:600;white-space:nowrap">${_protoEsc(a.decision||'—')}</td>
      <td>${chip}${silChip}</td>
      <td style="font-size:11.5px;line-height:1.4">${_protoEsc(a.motivo||'')}</td>
      <td class="right" style="white-space:nowrap"><button class="btn ghost sm" data-protocopiar="${t}|${a.id}" data-pcpaso="1" title="${_PROTO_TIT_COPIA}">📋</button>${a.estado==='abierta'?`<button class="btn ghost sm" data-protoresolve="${t}|${a.id}" title="Marcar resuelta">✓</button>`:''}<button class="btn ghost sm" data-protodel="${t}|${a.id}" title="Borrar apunte">✕</button></td>
    </tr>`;
  }).join('');
  const body=rows||'<tr><td colspan="7" class="muted" style="font-size:12px">Ninguno pendiente de pasar al Excel. Los borradores se crean desde los avisos del Panel («Registrar apunte») o con «+ Apunte».</td></tr>';
  return `<div class="card" style="margin-top:10px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="font-weight:800;font-size:15px">📋 Registro de revisiones (señales S1–S6)</div>
      <div style="flex:1"></div>
      <button class="btn ghost sm" data-protoadd="${t}">+ Apunte</button>
    </div>
    ${_protoZonaExcel(t)}
    ${nSubidos?`<div class="sub" style="margin:8px 0 0;color:#166534">✓ ${nSubidos} borrador${nSubidos===1?'':'es'} ya ${nSubidos===1?'está':'están'} en el §10.5 y ${nSubidos===1?'aparece':'aparecen'} arriba. <button class="btn ghost sm" data-protolimpiar="${t}" style="margin-left:6px">Limpiar de aquí</button></div>`:''}
    <div class="sub" style="margin:10px 0 6px"><b>✏️ Borradores sin pasar al Excel.</b> Se escriben aquí, se copia la fila con <b>📋</b> y se pega en el §10.5. Cuando el puente los recoja, subirán al bloque de arriba solos.</div>
    <div class="sub" style="margin:-2px 0 8px;font-size:11.5px;color:#64748b;background:#f8fafc;border-left:3px solid #cbd5e1;border-radius:0 6px 6px 0;padding:6px 9px">
      <b>Cómo se pega:</b> el <b>📋</b> copia en dos pasos. <b>1)</b> las cuatro columnas simples → clic en la celda de la <b>Fecha</b> y pegar. <b>2)</b> el <b>Motivo</b> → clic en su celda y pegar.
      <span style="opacity:.8">El motivo se copia con el ancho exacto de la celda combinada <code>E:N</code>, así que entra sin avisos. Si algún libro se quejara, <b>doble clic</b> en la celda (o <code>F2</code>) y pegar <b>dentro</b>: en modo edición entra siempre.</span>
    </div>
    <div style="overflow:auto"><table><thead><tr><th>Fecha</th><th>Señal</th><th class="num">Cotiz.</th><th>Decisión</th><th>Estado</th><th>Motivo</th><th></th></tr></thead><tbody>${body}</tbody></table></div>
  </div>`;
}

/* ---------- Zona 1: lo que YA está registrado en el §10.5 del Excel ----------
   [28-jul-2026] Hasta hoy esta tarjeta decía ser «espejo del §10.5» y enseñaba únicamente lo
   que el usuario hubiera tecleado en la app (`DB.protocolo`, que vive en el navegador). El
   Excel tenía 14 apuntes y once de ellos no habían pasado nunca por `estado.json` —fueron
   señales abiertas y cerradas en el mismo acto por el monitor—, así que ningún camino los
   traía. Ahora el puente proyecta el §10.5 entero y esta zona es el espejo que decía ser.
   SOLO LECTURA: el §10.5 manda; para cambiar algo se cambia allí. */
function _protoZonaExcel(t){
  if(typeof revisionesCorpDe!=='function') return '';
  const r = revisionesCorpDe(t);
  if(!r.filas.length && r.frescas) return '';
  const stale = !r.frescas
    ? `<div class="sub" style="color:#b45309;margin:2px 0 6px">⚠ El libro de Excel estaba abierto en el último pase: esto es la foto anterior${r.el?' ('+_protoEsc(r.el)+')':''}. Ciérralo y vuelve a generar el puente.</div>` : '';
  const filas = r.filas.map(a=>{
    const p = PROTOCOLO_SENALES[(a.senal||'').toUpperCase()]||{color:'#64748b',icono:'📋'};
    const abierta = (''+(a.decision||'')).trim().toUpperCase()==='ABIERTA';
    const chip = `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:${abierta?'#fef3c7':'#dcfce7'};color:${abierta?'#92400e':'#166534'}">${abierta?'ABIERTA':'CERRADA'}</span>`;
    return `<tr>
      <td style="white-space:nowrap">${_protoEsc(a.fecha||'—')}</td>
      <td style="white-space:nowrap;font-weight:700;color:${p.color}">${p.icono} ${_protoEsc(a.senal||'—')}</td>
      <td class="num">${_protoEsc(a.cot||'—')}</td>
      <td style="font-weight:600;white-space:nowrap">${_protoEsc(a.decision||'—')}</td>
      <td>${chip}</td>
      <td style="font-size:11.5px;line-height:1.4">${_protoEsc(a.motivo||'')}</td>
    </tr>`;
  }).join('');
  const cuerpo = filas || '<tr><td colspan="6" class="muted" style="font-size:12px">Sin apuntes en el §10.5 de este libro.</td></tr>';
  return `<div class="sub" style="margin:2px 0 6px"><b>📗 Registrado en el §10.5 del Excel.</b> Solo lectura — el Excel manda${r.el?' · leído el '+_protoEsc(r.el):''}.</div>
    ${stale}
    <div style="overflow:auto;border:1px solid var(--line);border-radius:9px">
      <table><thead><tr><th>Fecha</th><th>Señal</th><th class="num">Cotiz.</th><th>Decisión</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>${cuerpo}</tbody></table>
    </div>`;
}

/* ---------- Avisos de apuntes abiertos (para el Panel) ---------- */
function protoAvisos(){
  const out=[]; const hoy=_protoHoy();
  Object.keys(DB.protocolo||{}).forEach(t=>{
    (DB.protocolo[t]||[]).forEach(a=>{
      if(a.estado!=='abierta')return;
      const p=PROTOCOLO_SENALES[a.sig]||{};
      if(a.limite&&a.limite<hoy) out.push({pri:0,cls:'r',goto:'analisis',sig:a.sig,tick:t,esApunte:true,txt:`⏰ <b>${t}</b> — apunte ${a.sig} (${_protoEsc((a.decision||''))}) VENCIDO desde ${a.limite}: resuélvelo`});
      else out.push({pri:3,cls:'a',goto:'analisis',sig:a.sig,tick:t,esApunte:true,txt:`📋 <b>${t}</b> — apunte ${a.sig} abierto${a.limite?' (límite '+a.limite+')':''}`});
    });
  });
  return out;
}

/* ---------- Eventos delegados del registro ---------- */
document.addEventListener('click',e=>{
  const add=e.target.closest&&e.target.closest('[data-protoadd]');
  if(add){ protoApunteForm('', add.dataset.protoadd); return; }
  const sg=e.target.closest&&e.target.closest('[data-protosig]');
  if(sg){ const a=(sg.dataset.protosig||'').split('|'); showProtocolo(a[0],'',a[1]); return; }
  /* [28-jul-2026] Borra los borradores que YA están pegados en el §10.5. No borra nada que no
     esté confirmado en el Excel: la clave es fecha + señal, y sale de lo que publica el puente.
     Si el puente no ha corrido todavía, aquí no hay nada que limpiar y el botón ni aparece. */
  const lp=e.target.closest&&e.target.closest('[data-protolimpiar]');
  if(lp){
    const t=(lp.dataset.protolimpiar||'').toUpperCase();
    const enExcel=new Set(revisionesCorpDe(t).filas.map(x=>claveRev(x.fecha,x.senal)));
    const antes=((DB.protocolo||{})[t]||[]);
    const quedan=antes.filter(a=>!enExcel.has(claveRev(a.fecha,a.sig)));
    const n=antes.length-quedan.length;
    if(!n) return;
    if(!confirm('Se van a quitar '+n+' borrador'+(n===1?'':'es')+' de la app.\n\n'
        +(n===1?'Ya está':'Ya están')+' en el §10.5 del Excel, que es el registro que manda; '
        +'aquí solo era'+(n===1?'':'n')+' el paso intermedio. No se toca el Excel.'))return;
    DB.protocolo[t]=quedan;
    if(typeof saveNow==='function')saveNow();
    if(typeof renderPanelDash==='function')renderPanelDash();
    if(typeof fichaTicker!=='undefined'&&fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker);
    return;
  }
  /* [28-jul-2026] Copiar la fila de un borrador YA guardado. Antes solo se podia copiar en el
     momento de crearlo, desde el dialogo: si cerrabas sin pegar, o querias volver a pegarla, no
     habia forma de recuperarla sin reescribirla a mano. */
  const cp=e.target.closest&&e.target.closest('[data-protocopiar]');
  if(cp){
    const a=(cp.dataset.protocopiar||'').split('|');
    const ap=((DB.protocolo||{})[a[0]]||[]).find(x=>x.id===a[1]);
    if(!ap)return;
    _protoCopiarFila(ap, cp);
    return;
  }
  const rs=e.target.closest&&e.target.closest('[data-protoresolve]');
  if(rs){ const a=(rs.dataset.protoresolve||'').split('|'); const arr=(DB.protocolo||{})[a[0]]||[]; const ap=arr.find(x=>x.id===a[1]);
    if(ap){ const m=prompt('Desenlace (se añade al motivo):',''); if(m===null)return; ap.estado='resuelta'; if(m.trim())ap.motivo=(ap.motivo?ap.motivo+' → ':'')+m.trim(); ap.resuelto=_protoHoy();
      if(typeof saveNow==='function')saveNow(); if(typeof renderPanelDash==='function')renderPanelDash(); if(typeof fichaTicker!=='undefined'&&fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker); } return; }
  const del=e.target.closest&&e.target.closest('[data-protodel]');
  if(del){ const a=(del.dataset.protodel||'').split('|'); if(DB.protocolo&&DB.protocolo[a[0]]){ const _it=(DB.protocolo[a[0]]||[]).find(x=>x.id===a[1]); if(!_it)return;
    if(typeof undoableDelete==='function'){ undoableDelete('protocolo','Apunte de protocolo '+a[0],{t:a[0],item:_it},()=>{ DB.protocolo[a[0]]=DB.protocolo[a[0]].filter(x=>x.id!==a[1]); },['renderPanelDash']); }
    else { if(!confirm('¿Borrar este apunte del registro?'))return; DB.protocolo[a[0]]=DB.protocolo[a[0]].filter(x=>x.id!==a[1]); if(typeof saveNow==='function')saveNow(); if(typeof renderPanelDash==='function')renderPanelDash(); if(typeof fichaTicker!=='undefined'&&fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker); } } return; }
});
