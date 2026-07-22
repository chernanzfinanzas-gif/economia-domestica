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
function _dfPaga(t){ try{ var v=(typeof evoDpaBruto==='function')?evoDpaBruto(t,_dfCur()):null; return _dfNum(v)>0; }catch(_){ return false; } }
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
/* Borrador en memoria de lo tecleado (por año → ticker → valor string). */
var _dfDraft={};
function _dfGetCell(t,y){ y=String(y); if(_dfDraft[y]&&_dfDraft[y][t]!==undefined) return _dfDraft[y][t]; var v=_dfReal(t,y); return v==null?'':_dfFmt(v); }
function _dfSetDraft(t,y,val){ y=String(y); _dfDraft[y]=_dfDraft[y]||{}; _dfDraft[y][t]=val; }

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

  var H='<div class="df-wrap">';
  H+='<div class="df-bar"><span class="df-yl">Año</span><select id="dfYear">'+yopts+'</select>'
    +'<span class="df-cb ok">✅ '+ok+' con dato</span><span class="df-cb no">⏳ '+no+' sin dato</span>'
    +'<span class="df-sp"></span>'
    +'<button class="df-vol" id="dfVol"'+(editable?'':' disabled')+'>⤵ Volcar a Evolución</button></div>';
  if(!editable) H+='<div class="df-info">Año '+(_dfYear===cur?'actual':'pasado')+' — informativo (dato real de dividendos.json). Solo se editan los años futuros.</div>';
  H+='<div class="df-tools"><input type="text" id="dfQ" placeholder="Buscar…" value="'+_dfQ.replace(/"/g,'&quot;')+'"></div>';
  H+='<div class="df-sech">💶 Pagan dividendo <span class="df-pill">'+pag.length+'</span> '
    +'<span class="df-pill" style="background:#dcfce7;color:#166534">✅ '+ok+'</span> <span class="df-pill" style="background:#fef3c7;color:#92400e">⏳ '+no+'</span></div>';
  H+=_dfGrid(pag, editable, cur);
  H+='<div class="df-sech no">🚫 Figuran como que no pagan <span class="df-pill">'+nop.length+'</span></div>';
  H+=_dfGrid(nop, editable, cur);
  H+='<div class="df-note">Los futuros salen en blanco (no se muestra la proyección de subida %). Al <b>Volcar</b>, lo anotado se escribe en <b>dividendos.json</b> (previsto), sustituyendo la proyección. Horizonte: '+_dfCur()+'–'+_dfHoriz()+' (Diversificación).</div>';
  H+='</div>';
  sec.innerHTML=H;
  _dfBind(sec);
}
function _dfGrid(list, editable, cur){
  var h='<div class="df-grid">';
  list.forEach(function(r){
    var raw=_dfReal(r.t,_dfYear);
    var val=_dfGetCell(r.t,_dfYear);
    var vac=(val==='');
    var cls='df-gi'+(!r.paga?' no':(editable&&vac?' pend':((!vac)?' real':'')));
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
  var y=String(_dfYear); var d=_dfDraft[y]||{}; var nue=0, act=0;
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
  _dfDraft[y]={};
  if(typeof scheduleSave==='function')scheduleSave();
  if(typeof toast==='function')toast('Volcado a Evolución '+_dfYear+': '+nue+' nuevos · '+act+' actualizados.');
  renderDivFut();
}
function _dfBind(sec){
  if(sec._dfBound) return; sec._dfBound=true;
  sec.addEventListener('change',function(e){ var s=e.target.closest&&e.target.closest('#dfYear'); if(s){ _dfYear=_dfNum(s.value); renderDivFut(); } });
  sec.addEventListener('input',function(e){
    var q=e.target.closest&&e.target.closest('#dfQ'); if(q){ _dfQ=(q.value||'').toLowerCase().trim(); renderDivFut(); var el=document.getElementById('dfQ'); if(el){el.focus(); try{el.setSelectionRange(el.value.length,el.value.length);}catch(_){}} return; }
    var inp=e.target.closest&&e.target.closest('[data-dfin]'); if(inp){ _dfSetDraft(_dfUp(inp.getAttribute('data-dfin')), _dfYear, inp.value.trim()); var gi=inp.closest('.df-gi'); if(gi&&!gi.classList.contains('no')){ var vac=(inp.value.trim()===''); gi.classList.toggle('pend',vac); gi.classList.toggle('real',!vac); } }
  });
  sec.addEventListener('click',function(e){
    var v=e.target.closest&&e.target.closest('#dfVol'); if(v){ _dfVolcar(); return; }
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
    '.df-sp{flex:1}',
    '.df-vol{background:#1f3d6b;color:#fff;border:none;border-radius:22px;padding:9px 15px;font-size:12.5px;font-weight:800;cursor:pointer}',
    '.df-vol[disabled]{background:#cbd5e1;cursor:not-allowed}',
    '.df-info{background:#e2e8f0;color:#334155;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:600;margin-bottom:10px}',
    '.df-tools{margin-bottom:10px}.df-tools input{border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;max-width:280px}',
    '.df-sech{font-size:13px;font-weight:800;color:#1f3d6b;margin:12px 2px 8px;display:flex;align-items:center;gap:7px}.df-sech.no{color:#64748b}',
    '.df-pill{background:#e2e8f0;color:#334155;border-radius:20px;padding:2px 9px;font-size:12px;font-weight:700}',
    '.df-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:6px}',
    '.df-gi{background:#fff;border:1px solid var(--line);border-radius:9px;padding:6px 7px}',
    '.df-gi.pend{background:#fffbeb;border-color:#fde68a}.df-gi.real{box-shadow:inset 3px 0 0 #16a34a}.df-gi.no{background:#f8fafc}',
    '.df-tk{font-weight:800;font-size:12.5px;line-height:1;color:#1d4ed8;cursor:pointer;text-decoration:underline;text-decoration-color:#bfdbfe}',
    '.df-nm{font-size:9.5px;color:#64748b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:1px 0 4px}',
    '.df-in input{width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:5px 6px;text-align:right;font-size:13px}',
    '.df-gi.pend .df-in input{border-color:#f59e0b;background:#fff}',
    '.df-val{text-align:right;font-size:13px;font-weight:700;color:#475569;padding:5px 2px}.df-val.empty{color:#cbd5e1;font-weight:400}',
    '.df-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;font-size:12px;color:#1e3a8a;line-height:1.5;margin-top:12px}',
    '@media(max-width:560px){.df-bar select{font-size:17px}.df-grid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr))}}'
  ].join('');
  document.head.appendChild(s);
}
