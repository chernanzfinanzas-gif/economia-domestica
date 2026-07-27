/* ============================================================================
   24-divfut.js — Actualizador de Dividendos Futuros
   Matriz empresa × año para anotar el DPA bruto de años futuros a medida que se
   anuncian. Escribe en la base única (DB.divData, capa de Evolución del Dividendo),
   marcando el valor como previsto. Los futuros salen EN BLANCO (no se muestra la
   proyección de subida %). Horizonte = el de Diversificación (planLotePeriodo.hasta).
   ========================================================================== */

var _DF_SHORT={
'ANA':'Acciona','ACX':'Acerinox','ACS':'ACS','ADZ':'A.Domínguez','AEDAS':'Aedas','AENA':'Aena','AIR':'Airbus','AI':'Airtificial','ALNT':'Alantra','ALM':'Almirall',
'AMS':'Amadeus','AMP':'Amper','APAM.AS':'Aperam','MTS':'ArcelorMittal','ART':'Arteche','A3M':'Atresmedia','ADX':'Audax','AZK':'Azkoyen','BBVA':'BBVA','SAN':'Santander',
'BKT':'Bankinter','BKY':'Berkeley','RIO':'Riojanas','CABK':'CaixaBank','CLNX':'Cellnex','CIE':'CIE','CIRSA':'Cirsa','CCEP':'Coca-Cola','COL':'Colonial','CEV':'CEVASA',
'CAF':'CAF','ANE':'Acciona EnR','COXG':'Cox','OLE':'Deoleo','DIA':'DIA','EBRO':'Ebro','ECO':'Ecoener','ENO':'Elecnor','ENG':'Enagás','ENC':'Ence',
'ELE':'Endesa','ECR':'Ercros','FAE':'Faes','FER':'Ferrovial','FDR':'Fluidra','FCC':'FCC','GEST':'Gestamp','GIGA':'Gigas','GRE':'Grenergy','GRF':'Grifols',
'GSJ':'San José','EZE':'Ezentis','IBE':'Iberdrola','IBG':'Iberpapel','IDR':'Indra','ITX':'Inditex','IAG':'IAG','RJF':'Reig Jofre','ROVI':'Rovi','LGT':'Lingotes',
'LLN':'Lleida.net','LOG':'Logista','LDA':'Línea Directa','MAKS':'Making Sci.','MAP':'Mapfre','MEL':'Meliá','MRL':'Merlin','MVC':'Metrovacesa','MCM':'Miquel','NTGY':'Naturgy',
'HOME':'Neinor','NEA':'N.Correa','NXT':'N.Textil','NYE':'Nyesa','OHLA':'OHLA','ORY':'Oryzon','PVA':'Pescanova','PHM':'PharmaMar','PRM':'Prim','PRS':'Prisa',
'PSG':'Prosegur','PUIG':'Puig','RLIA':'Realia','RED':'Redeia','R4':'Renta 4','REN':'Renta Corp','REP':'Repsol','SAB':'Sabadell','SCYR':'Sacyr','SEC':'Secuoya',
'SLR':'Solaria','TLGO':'Talgo','TEF':'Telefónica','TUB':'Tubacex','TRG':'T.Reunidos','TRE':'Técnicas R.','UNI':'Unicaja','UBS':'Urbas','VID':'Vidrala','VIS':'Viscofan','VOC':'Vocento','ARM':'Árima'
};
function _dfUp(t){ return (''+(t||'')).toUpperCase(); }
function _dfNum(x){ var t=(''+(x==null?'':x)).trim(); if(t==='')return NaN; if(t.indexOf(',')>=0){ t=t.replace(/\./g,'').replace(',','.'); } return parseFloat(t); }
function _dfHoriz(){ var h=_dfNum((DB.planLotePeriodo||{}).hasta); return h>0?h:( (new Date().getFullYear())+8 ); }
function _dfCur(){ return new Date().getFullYear(); }
function _dfYears(){
  var y1=Math.max(_dfCur(), _dfHoriz());
  var y0=2011;
  try{ if(_evoData && _evoData.years && _evoData.years.length){ y0=Math.min.apply(null,_evoData.years.map(Number)); } }catch(_){}
  if(!(y0>0)) y0=2011;
  var a=[]; for(var y=y0;y<=y1;y++)a.push(y); return a;
}
function _dfShort(t){ t=_dfUp(t); return _DF_SHORT[t] || ((evoEmpresaM&&evoEmpresaM(t)&&evoEmpresaM(t).nombre)?String(evoEmpresaM(t).nombre).split(/[ ,]/)[0]:t); }
/* [A9 · 26-jul-2026] «Paga dividendo» miraba SOLO el año en curso, así que de enero a marzo una
   pagadora cuyo primer pago aún no está cargado caía al bloque «figuran como que no pagan» y
   desaparecía del contador de pendientes: justo las que hay que actualizar. Ahora basta con que
   haya pagado en los tres últimos ejercicios o que tenga previsión anotada a futuro. */
function _dfPaga(t){ try{
  var cur=_dfCur(), y, v;
  for(y=cur;y>=cur-2;y--){ v=(typeof evoDpaBruto==='function')?evoDpaBruto(t,y):null; if(_dfNum(v)>0) return true; }
  for(y=cur+1;y<=cur+2;y++){ v=(typeof _evoOverride==='function')?_evoOverride(t,y):null; if(_dfNum(v)>0) return true; }
  return false;
}catch(_){ return false; } }
/* Empresas EN CARTERA a las que les falta el dividendo del año en curso o la previsión del siguiente.
   Alimenta el aviso del Panel: hasta ahora nada recordaba actualizar los dividendos. */
function divPendientesActualizar(){
  var cur=_dfCur(), out={anio:cur, faltaCur:[], faltaSig:[]};
  var held; try{ held=(typeof heldTickerSet==='function')?heldTickerSet():new Set(); }catch(_){ return out; }
  held.forEach(function(t){
    t=_dfUp(t); if(!_dfPaga(t)) return;                       /* las que no reparten no cuentan */
    var real=null; try{ real=(typeof evoDpaBruto==='function')?evoDpaBruto(t,cur):null; }catch(_){}
    if(!(_dfNum(real)>0)) out.faltaCur.push(t);
    var sig=_dfReal(t,cur+1);
    if(!(_dfNum(sig)>0)) out.faltaSig.push(t);
  });
  out.faltaCur.sort(); out.faltaSig.sort();
  return out;
}
function _dfUniverso(){
  var s={};
  try{ (_evoData&&_evoData.empresas||[]).forEach(function(e){ var t=_dfUp(e.ticker); if(t)s[t]=1; }); }catch(_){}
  try{ Object.keys(DB.universo||{}).forEach(function(t){ s[_dfUp(t)]=1; }); }catch(_){}
  try{ Object.keys(DB.divData||{}).forEach(function(t){ s[_dfUp(t)]=1; }); }catch(_){}
  return Object.keys(s);
}
/* valor a mostrar (sin proyección %): pasado/actual = real; futuro = override anotado o real>0. */
function _dfReal(t,y){
  var real=null; try{ real=(typeof evoDpaBruto==='function')?evoDpaBruto(t,y):null; }catch(_){}
  if(y>_dfCur()){
    var ov=null; try{ ov=(typeof _evoOverride==='function')?_evoOverride(t,y):null; }catch(_){}
    if(ov!=null) return ov;
    return (real!=null && real>0)?real:null;   /* ignora 0/placeholder en futuro */
  }
  return real;
}
function _dfFmt(x){ if(x==null)return ''; var s=(Math.round(x*10000)/10000).toString(); return s.replace('.',','); }
/* [B6 · 26-jul-2026] Borrador de lo tecleado (por año → ticker → valor string).
   ANTES vivía solo en memoria (`var _dfDraft={}`): si recargabas, cerrabas la pestaña o el móvil
   descartaba la página antes de pulsar «Volcar», todo lo anotado se perdía SIN AVISO. Ahora el
   borrador se guarda en DB.divDraft (y por tanto en Drive), sobrevive a la recarga y se muestra
   un contador «N sin volcar» con botón para descartarlo. */
function _dfDraftAll(){ if(!DB.divDraft || typeof DB.divDraft!=='object') DB.divDraft={}; return DB.divDraft; }
function _dfDraftYear(y){ var D=_dfDraftAll(); y=String(y); return D[y]||{}; }
function _dfGetCell(t,y){ var d=_dfDraftYear(y); if(d[t]!==undefined) return d[t]; var v=_dfReal(t,y); return v==null?'':_dfFmt(v); }
function _dfSetDraft(t,y,val){
  var D=_dfDraftAll(); y=String(y); D[y]=D[y]||{};
  var ref=_dfReal(t,_dfNum(y)); ref=(ref==null?'':_dfFmt(ref));
  if(val===ref){ delete D[y][t]; if(!Object.keys(D[y]).length) delete D[y]; }   /* volver al valor de origen = no es borrador */
  else D[y][t]=val;
  _dfSaveDraft();
}
var _dfSaveT=null;
function _dfSaveDraft(){ clearTimeout(_dfSaveT); _dfSaveT=setTimeout(function(){ if(typeof scheduleSave==='function')scheduleSave(); },900); }
function _dfDraftCount(y){ var d=_dfDraftYear(y), n=0; Object.keys(d).forEach(function(t){ if((''+d[t]).trim()!=='')n++; }); return n; }
/* [B6] Borradores anotados y sin volcar (todos los años). Alimenta el aviso del Panel: guardar el
   borrador sin avisar sería peor que perderlo, porque creerías que el dato ya está en el sistema. */
function divBorradorPendiente(){
  var out={total:0, anios:[]};
  try{ var D=_dfDraftAll();
    Object.keys(D).sort().forEach(function(y){
      var n=0; Object.keys(D[y]||{}).forEach(function(t){ if((''+D[y][t]).trim()!=='')n++; });
      if(n){ out.anios.push({anio:y, n:n}); out.total+=n; }
    });
  }catch(_){}
  return out;
}
function _dfDescartar(){
  var y=String(_dfYear), D=_dfDraftAll();
  if(!D[y] || !Object.keys(D[y]).length) return;
  if(!confirm('Descartar el borrador de '+y+'? Se perderán '+_dfDraftCount(_dfYear)+' valores anotados y no volcados.')) return;
  delete D[y]; if(typeof scheduleSave==='function')scheduleSave(); renderDivFut();
}

var _dfYear=null, _dfQ='';
function renderDivFut(){
  var sec=document.getElementById('view-divfut'); if(!sec) return;
  _dfCss();
  if(typeof _evoCargar==='function' && !_evoData){ sec.innerHTML='<div class="muted" style="padding:10px">Cargando dividendos.json…</div>'; _evoCargar().then(renderDivFut); return; }
  var years=_dfYears(), cur=_dfCur();
  if(_dfYear==null || years.indexOf(_dfYear)<0) _dfYear = (years.indexOf(cur+1)>=0? cur+1 : years[years.length-1]);
  var editable=_dfYear>cur;
  var uni=_dfUniverso();
  /* filas ordenadas por nombre corto */
  var rows=uni.map(function(t){ return {t:t, s:_dfShort(t), paga:_dfPaga(t)}; })
    .filter(function(r){ if(!_dfQ)return true; return (r.s+' '+r.t).toLowerCase().indexOf(_dfQ)>=0; });
  rows.sort(function(a,b){ return a.s.toLowerCase()<b.s.toLowerCase()?-1:(a.s.toLowerCase()>b.s.toLowerCase()?1:0); });
  var pag=rows.filter(function(r){return r.paga;}), nop=rows.filter(function(r){return !r.paga;});

  var yopts=years.map(function(y){ var suf=(y<cur?' · pasado':(y===cur?' · actual':'')); return '<option value="'+y+'"'+(y===_dfYear?' selected':'')+'>'+y+suf+'</option>'; }).join('');
  /* contadores (solo las que pagan) para el año foco */
  var ok=0,no=0; pag.forEach(function(r){ (_dfGetCell(r.t,_dfYear)==='')?no++:ok++; });
  var nBorr=_dfDraftCount(_dfYear);

  var H='<div class="vhero g-emerald"><div class="vhero-main"><span class="vhero-ic">✏️</span><div class="vhero-txt"><h2>Actualizar Dividendos</h2><p>Anota el <b>dividendo bruto por acción</b> de los años futuros a medida que se anuncian; al <b>volcar</b>, se escribe en Evolución del Dividendo.</p></div></div></div>';
  H+='<div class="df-wrap">';
  H+='<div class="df-bar"><span class="df-yl">Año</span><select id="dfYear">'+yopts+'</select>'
    +'<span class="df-cb ok">✅ '+ok+' con dato</span><span class="df-cb no">⏳ '+no+' sin dato</span>'
    +'<input type="text" id="dfQ" placeholder="Buscar…" value="'+_dfQ.replace(/"/g,'&quot;')+'">'
    +'<span class="df-sp"></span>'
    +(nBorr?'<span class="df-cb bor" id="dfBor" title="Anotado pero todavía no volcado. Se guarda solo, pero hasta que no pulses «Volcar» no llega a Evolución del Dividendo.">📝 '+nBorr+' sin volcar</span><button class="df-desc" id="dfDesc">Descartar</button>':'')
    +'<button class="df-vol" id="dfVol"'+(editable&&nBorr?'':' disabled')+'>⤵ Volcar a Evolución</button></div>';
  if(!editable) H+='<div class="df-info">Año '+(_dfYear===cur?'actual':'pasado')+' — informativo (dato real de dividendos.json). Solo se editan los años futuros.</div>';
  H+=_dfGrid(pag, editable, cur);
  H+='<div class="df-sech no">🚫 Figuran como que no pagan <span class="df-pill">'+nop.length+'</span></div>';
  H+=_dfGrid(nop, editable, cur);
  H+='<div class="df-note">Los futuros salen en blanco (no se muestra la proyección de subida %). Lo que teclees queda guardado como <b>borrador</b> (morado) aunque recargues, pero <b>no cuenta para nada</b> hasta que pulses <b>Volcar</b>: ahí se escribe en <b>dividendos.json</b> (previsto) y manda sobre la proyección y sobre el dato publicado. Horizonte: '+_dfCur()+'–'+_dfHoriz()+' (Diversificación).</div>';
  H+='</div>';
  sec.innerHTML=H;
  _dfBind(sec);
}
function _dfGrid(list, editable, cur){
  var h='<div class="df-grid">', dra=_dfDraftYear(_dfYear);
  list.forEach(function(r){
    var raw=_dfReal(r.t,_dfYear);
    var val=_dfGetCell(r.t,_dfYear);
    var vac=(val==='');
    var esBor=(dra[r.t]!==undefined && (''+dra[r.t]).trim()!=='');   /* [B6] anotado y aún sin volcar */
    var cls='df-gi'+(!r.paga?' no':(esBor?' bor':(editable&&vac?' pend':((!vac)?' real':''))));
    var ref='';
    var inner='<div class="df-tk" data-dftk="'+r.t+'">'+r.t+'</div><div class="df-nm" title="'+r.s+'">'+r.s+'</div>';
    if(editable){ inner+='<div class="df-in"><input value="'+val+'" placeholder="—" inputmode="decimal" data-dfin="'+r.t+'"></div>'; }
    else { inner+='<div class="df-val'+(vac?' empty':'')+'">'+(val||'—')+'</div>'; }
    h+='<div class="'+cls+'">'+inner+'</div>';
  });
  return h+'</div>';
}
function _dfVolcar(){
  var cur=_dfCur(); if(!(_dfYear>cur)) return;
  var y=String(_dfYear); var d=_dfDraftYear(y); var nue=0, act=0;
  Object.keys(d).forEach(function(t){
    var raw=(''+d[t]).trim(); if(raw==='') return;
    var v=_dfNum(raw); if(!(v>=0)) return;
    var prev=null; try{ prev=(typeof _evoOverride==='function')?_evoOverride(t,_dfYear):null; }catch(_){}
    if(prev==null){ var pr2=_dfReal(t,_dfYear); if(pr2!=null)prev=_dfNum(pr2); }
    /* escribir en AMBAS capas: divOverride (lo lee la vista Evolución) y divData/dpaBruto (lo leen
       los consumidores vía evoDpaProyectado). Así el valor gana en todos los caminos. */
    DB.divOverride=DB.divOverride||{}; DB.divOverride[t]=DB.divOverride[t]||{}; DB.divOverride[t][String(_dfYear)]=v;
    /* limpiar cualquier resto en divData para ese año futuro (así el override manda y no se ensombrece). */
    try{ var dd=(DB.divData||{})[t]; if(dd&&dd.anios&&dd.anios[String(_dfYear)]){ delete dd.anios[String(_dfYear)].dpaBruto; delete dd.anios[String(_dfYear)].dpaNeto; delete dd.anios[String(_dfYear)].totalPrevisto; } }catch(_){}
    if(prev==null) nue++; else if(Math.abs(prev-v)>1e-9) act++;
  });
  delete _dfDraftAll()[y];                                  /* [B6] el borrador ya está volcado */
  if(typeof scheduleSave==='function')scheduleSave();
  if(typeof showToast==='function')showToast('Volcado a Evolución '+_dfYear+': '+nue+' nuevos · '+act+' actualizados.');
  renderDivFut();
}
/* [B6] refresca el contador «sin volcar» y el botón sin repintar la rejilla (no perder el foco). */
function _dfRefreshBar(){
  var n=_dfDraftCount(_dfYear), bar=document.querySelector('#view-divfut .df-bar'); if(!bar) return;
  var vol=document.getElementById('dfVol'), bor=document.getElementById('dfBor'), des=document.getElementById('dfDesc');
  if(vol) vol.disabled = !(n && _dfYear>_dfCur());
  if(n){
    if(!bor){ bor=document.createElement('span'); bor.id='dfBor'; bor.className='df-cb bor';
      bor.title='Anotado pero todavía no volcado. Se guarda solo, pero hasta que no pulses «Volcar» no llega a Evolución del Dividendo.';
      bar.insertBefore(bor, vol||null); }
    bor.textContent='📝 '+n+' sin volcar';
    if(!des){ des=document.createElement('button'); des.id='dfDesc'; des.className='df-desc'; des.textContent='Descartar'; bar.insertBefore(des, vol||null); }
  } else { if(bor)bor.remove(); if(des)des.remove(); }
}
function _dfBind(sec){
  if(sec._dfBound) return; sec._dfBound=true;
  sec.addEventListener('change',function(e){ var s=e.target.closest&&e.target.closest('#dfYear'); if(s){ _dfYear=_dfNum(s.value); renderDivFut(); } });
  sec.addEventListener('input',function(e){
    var q=e.target.closest&&e.target.closest('#dfQ'); if(q){ _dfQ=(q.value||'').toLowerCase().trim(); renderDivFut(); var el=document.getElementById('dfQ'); if(el){el.focus(); try{el.setSelectionRange(el.value.length,el.value.length);}catch(_){}} return; }
    var inp=e.target.closest&&e.target.closest('[data-dfin]'); if(inp){
      var tk=_dfUp(inp.getAttribute('data-dfin')); _dfSetDraft(tk, _dfYear, inp.value.trim());
      var gi=inp.closest('.df-gi');
      if(gi&&!gi.classList.contains('no')){ var vac=(inp.value.trim()===''), bor=(_dfDraftYear(_dfYear)[tk]!==undefined && !vac);
        gi.classList.toggle('pend',vac); gi.classList.toggle('bor',bor); gi.classList.toggle('real',!vac&&!bor); }
      _dfRefreshBar();                                     /* [B6] mantiene vivo el contador «sin volcar» */
    }
  });
  sec.addEventListener('click',function(e){
    var v=e.target.closest&&e.target.closest('#dfVol'); if(v){ _dfVolcar(); return; }
    var d=e.target.closest&&e.target.closest('#dfDesc'); if(d){ _dfDescartar(); return; }
    var tk=e.target.closest&&e.target.closest('[data-dftk]'); if(tk){ if(typeof activarVista==='function')activarVista('prevision'); return; }
  });
}
(function _dfCssInit(){})();
function _dfCss(){
  if(document.getElementById('df-css')) return;
  var s=document.createElement('style'); s.id='df-css';
  s.textContent=[
    '.df-bar{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;position:sticky;top:0;z-index:5}',
    '.df-yl{font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.03em}',
    '.df-bar select{border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:19px;font-weight:800;color:#1f3d6b}',
    '.df-cb{border-radius:20px;padding:5px 11px;font-size:12.5px;font-weight:700}.df-cb.ok{background:#dcfce7;color:#166534}.df-cb.no{background:#fef3c7;color:#92400e}',
    '.df-cb.bor{background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd}',
    '.df-desc{background:#fff;color:#7c3aed;border:1px solid #c4b5fd;border-radius:20px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer}',
    '.df-gi.bor{background:#f5f3ff;border-color:#c4b5fd;box-shadow:inset 3px 0 0 #7c3aed}',
    '.df-gi.bor .df-in input{border-color:#a78bfa;background:#fff}',
    '.df-sp{flex:1}',
    '.df-bar #dfQ{border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:13px;width:180px;max-width:100%}',
    '.df-vol{background:#1f3d6b;color:#fff;border:none;border-radius:22px;padding:9px 15px;font-size:12.5px;font-weight:800;cursor:pointer}',
    '.df-vol[disabled]{background:#cbd5e1;cursor:not-allowed}',
    '.df-info{background:#e2e8f0;color:#334155;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:600;margin-bottom:10px}',
    '.df-tools{margin-bottom:10px}.df-tools input{border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;max-width:280px}',
    '.df-sech{font-size:13px;font-weight:800;color:#1f3d6b;margin:12px 2px 8px;display:flex;align-items:center;gap:7px}.df-sech.no{color:#64748b}',
    '.df-pill{background:#e2e8f0;color:#334155;border-radius:20px;padding:2px 9px;font-size:12px;font-weight:700}',
    '.df-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:4px}',
    '.df-gi{background:#fff;border:1px solid var(--line);border-radius:7px;padding:4px 5px}',
    '.df-gi.pend{background:#fffbeb;border-color:#fde68a}.df-gi.real{box-shadow:inset 3px 0 0 #16a34a}.df-gi.no{background:#f8fafc}',
    '.df-tk{font-weight:800;font-size:11px;line-height:1;color:#1d4ed8;cursor:pointer;text-decoration:underline;text-decoration-color:#bfdbfe}',
    '.df-nm{font-size:8.5px;color:#64748b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:1px 0 3px}',
    '.df-in input{width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:3px 4px;text-align:right;font-size:11.5px}',
    '.df-gi.pend .df-in input{border-color:#f59e0b;background:#fff}',
    '.df-val{text-align:right;font-size:11.5px;font-weight:700;color:#475569;padding:3px 2px}.df-val.empty{color:#cbd5e1;font-weight:400}',
    '.df-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;font-size:12px;color:#1e3a8a;line-height:1.5;margin-top:12px}',
    '@media(max-width:560px){.df-bar select{font-size:17px}.df-bar #dfQ{width:100%;order:9}.df-grid{grid-template-columns:repeat(auto-fill,minmax(72px,1fr))}}'
  ].join('');
  document.head.appendChild(s);
}
