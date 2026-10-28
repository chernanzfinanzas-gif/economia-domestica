/* ===== 30-lectura.js — §1-bis · Lectura de negocio en la Ficha ====================
   [24-sep-2026 · piloto Atresmedia] La lectura de negocio abre el dossier desde hoy: la
   casilla (1-4), las seis cifras que la deciden, la tabla de la tensión del dividendo y
   las cuatro frases. La escribe `Empresas/<X>/b11/lectura_negocio.py` DENTRO del puente
   [TICKER].json, en el campo `lecturaNegocio`, con las mismas variables que el dossier:
   la Ficha y el dossier no pueden decir cosas distintas.

   Decisión del operador (24-sep): va dentro del puente y no en un fichero aparte, para no
   enseñar al publicador ni al índice del repo un tipo de fichero nuevo.

   NUNCA INVENTA. Sin `lecturaNegocio` en el puente, no pinta nada: la Ficha queda como
   estaba. Todos los nombres globales llevan el prefijo `_lnx` (ámbito global único). */

function _lnxEsc(s){
  return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
/* Las frases llevan <b> del dossier: se escapa todo y se devuelven SOLO las negritas. */
function _lnxTxt(s){
  return _lnxEsc(s).replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>');
}
function _lnxNum(x,d,suf){
  if(typeof x!=='number'||!isFinite(x))return '—';
  var s=x.toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
  return s+(suf||'');
}
var _LNX_COL={1:'#2563eb',2:'#16a34a',3:'#dc2626',4:'#d97706'};

function lecturaCardHTML(j){
  var L=j&&j.lecturaNegocio;
  if(!L||typeof L!=='object'||!L.casilla)return '';
  var c=L.casilla||{}, f=L.cifras||{}, t=L.tension||{}, col=_LNX_COL[c.n]||'#475569';
  var corte=(c.cortes||{});
  var fin=(L.rama==='financiera');
  var seis=(fin?[
    ['Retención (100 − payout total) · media', _lnxNum(f.retencionMedia,1,' %'), '≥ '+_lnxNum(corte.retencion,0,' %')],
    ['Valor tangible por acción + dividendos · 5 años', _lnxNum(f.valorTangible5a,1,' %'), '≥ CoE '+_lnxNum(corte.valorTangible,2,' %')],
    ['Ídem, década', _lnxNum(f.valorTangible10a,1,' %'), ''],
    ['RoTE medio', _lnxNum(f.roteMedio,1,' %'), ''],
    ['Spread RoTE − CoE', (f.spread>0?'+':'')+_lnxNum(f.spread,2,' pp'), ''],
    [(f.tensionNombre||'Capital')+(f.tensionAnio?' ('+f.tensionAnio+')':''), _lnxNum(f.tension,1,f.tensionUnidad==='%'?' %':' pp'), '']
  ]:[
    ['Reinversión neta · media', _lnxNum(f.reinversionMedia,1,' %'), '< '+_lnxNum(corte.reinversion,0,' %')],
    ['ROIIC a '+(f.roiicVentana==='3A'?'tres':'cinco')+' años'+(c.roiicFragil?' · dato frágil':''), (f.roiic!=null||f.roiic5a!=null)?_lnxNum(f.roiic!=null?f.roiic:f.roiic5a,1,' %'):'n.s. · casilla por el spread', '≥ '+_lnxNum(corte.roiic,1,' %')],
    ['ROIC medio de la década', _lnxNum(f.roicMedio,1,' %'), ''],
    ['Spread ROIC − WACC', (f.spread>0?'+':'')+_lnxNum(f.spread,2,' pp'), ''],
    ['Conversión EBITDA → FCL', _lnxNum(f.conversionMedia,1,' %'), ''],
    ['Cobertura del dividendo (FCL)', _lnxNum(f.coberturaDividendo,2,'x'), '']
  ]).map(function(r){
    return '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;background:#f8fafc">'
      +'<div class="muted" style="font-size:11px">'+_lnxEsc(r[0])+'</div>'
      +'<div style="font-weight:800;font-size:16px">'+r[1]+'</div>'
      +(r[2]?'<div class="muted" style="font-size:10.5px">corte '+_lnxEsc(r[2])+'</div>':'')
      +'</div>';
  }).join('');
  var tabla='';
  if(t.anios&&t.anios.length){
    var fila=function(et,arr,d,suf){ return '<tr><td style="padding:4px 8px;color:#475569">'+_lnxEsc(et)+'</td>'
      +(arr||[]).map(function(v){return '<td style="padding:4px 8px;text-align:right">'+_lnxNum(v,d,suf)+'</td>';}).join('')+'</tr>'; };
    tabla='<div style="overflow-x:auto;margin:8px 0"><table style="border-collapse:collapse;font-size:12.5px;width:100%">'
      +'<tr><th></th>'+t.anios.map(function(a){return '<th style="padding:4px 8px;text-align:right;color:#64748b">'+_lnxEsc(a)+'</th>';}).join('')+'</tr>'
      +(fin?(fila('RoTE',t.rote,1,' %')
        +fila('Payout total (dividendos + recompras)',t.payoutTotal,1,' %')
        +fila('Valor tangible por acción (€)',t.valorTangible,2,'')
        +fila(f.tensionNombre||'Capital',t.capital,1,f.tensionUnidad==='%'?' %':' pp'))
      :(fila('Cobertura del dividendo (FCL)',t.coberturaFcl,2,'x')
      +fila('Cobertura (owner earnings)',t.coberturaOe,2,'x')
      +fila('Payout sobre beneficio',t.payoutBn,1,' %')
      +fila('Payout sobre caja libre',t.payoutFcl,1,' %')))
      +'</table></div>';
  }
  var bloques=(L.lectura||[]).map(function(b,i){
    return '<div style="margin-top:10px"><div style="font-weight:700;font-size:13.5px;color:#0f172a">'+_lnxEsc(b.titulo)+'</div>'
      +(b.parrafos||[]).map(function(p){return '<p style="margin:5px 0;font-size:13px;line-height:1.5;color:#334155">'+_lnxTxt(p)+'</p>';}).join('')
      +(i===2?tabla:'')+'</div>';
  }).join('');
  // [25-sep-2026] piso 1 de la lectura: las trece respuestas (la 12 es el «qué vigilar»: ya no se repite abajo)
  var preg=(L.preguntas&&L.preguntas.length)?('<div style="margin:4px 0 12px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">'
    +'<div style="font-weight:700;font-size:13px;padding:7px 10px;background:#f1f5f9">La empresa en trece respuestas</div>'
    +L.preguntas.map(function(q0,i){
      // 6, 7 y 11 se recalculan con el puente VIGENTE: si una Nota cambia PO o veredicto, la ficha no se queda vieja
      var q={n:q0.n,pregunta:q0.pregunta,respuesta:q0.respuesta};
      var cr=L.cotizacionReferencia||null, cot=cr&&cr.valor?+cr.valor:(((j.robustez||{}).sensibilidad||{}).cotizacion);
      if(q.n===6&&j.rating&&j.score!=null) q.respuesta=_lnxEsc(j.rating)+' · '+_lnxNum(j.score,1,'')+' sobre 100.';
      if(q.n===7&&j.poBase&&cot){ var m=(j.poBase/cot-1)*100;
        q.respuesta='Precio objetivo '+_lnxNum(j.poBase,2,' €')+' contra '+_lnxNum(cot,2,' €')+(cr&&cr.fuente?' ('+_lnxEsc(cr.fuente)+')':'')
          +': margen de seguridad '+(m>=0?'+':'−')+_lnxNum(Math.abs(m),1,' %')+'.'; }
      if(q.n===11&&j.decision) q.respuesta='<b>'+_lnxEsc(j.decision)+'</b> · banda de entrada '+_lnxNum(j.entMin,2,'')+' – '+_lnxNum(j.entMax,2,' €')+' · stop de tesis '+_lnxNum(j.stop,2,' €')+'.';
      return '<div style="display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:8px;padding:6px 10px;font-size:12.8px;line-height:1.45;'+(i%2?'background:#f8fafc':'')+'">'
        +'<div style="font-weight:700;color:#0f172a">'+_lnxEsc(q.n+' · '+q.pregunta)+'</div>'
        +'<div style="color:#334155">'+_lnxTxt(q.respuesta)+'</div></div>';
    }).join('')+'</div>'):'';
  return '<div class="card" style="margin-top:10px">'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">'
      +'<div style="font-weight:800;font-size:15px">🧭 Lectura de negocio</div>'
      +'<span style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:.03em;padding:3px 9px;border-radius:999px;color:#fff;background:'+col+'">'+(c.n!=null?'CASILLA '+_lnxEsc(c.n)+' · '+_lnxEsc(c.nombre):'CASILLA · PTE. REVISIÓN')+'</span>'
      +'<span class="muted" style="font-size:12px">'+_lnxEsc(c.lema||'')+(L.fecha?' · '+_lnxEsc(L.fecha):'')+'</span>'
    +'</div>'
    +preg
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'+seis+'</div>'
    +(preg?'<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;font-size:13px;color:#B15400">Leer la lectura completa</summary>'+bloques+'</details>':bloques)
    +(L.vigilar&&!preg?'<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;font-size:12.5px"><b>Qué vigilar cada trimestre:</b> '+_lnxTxt(L.vigilar)+'</div>':'')
    +'<div class="muted" style="font-size:11px;margin-top:6px">'+_lnxEsc((c.cortes||{}).regla||'')+'</div>'
  +'</div>';
}
