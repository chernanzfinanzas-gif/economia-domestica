/* ============================================================
   13-radar.js — Universo (clasificación Matriz, editable) + Radar de oportunidades
   · Universo: base de datos editable (arquetipo, sub-tipo, naturaleza, rating).
     Se importa una vez de matriz.json y se edita aquí. Guardada en DB.universo.
   · Radar: cruza DB.universo + fundamentales.json (repo) y rankea por Atractivo,
     con la MISMA fórmula que Herramientas/radar_candidatos.py.
   ============================================================ */
function _radEsc(x){ if(typeof _infEsc==='function')return _infEsc(x); return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ---- Fórmula de Atractivo (paridad con radar_candidatos.py) ---- */
var RAD_ARQ=["FINANCIERAS","REGULADAS","CONCESIONAL","INDUSTRIAL","COMMODITY","CONSUMO","ESCALABLES","SALUD","INMOBILIARIAS","Sin clasificar"];
/* campos editables del universo (key,label,ancho px). arquetipo se pinta como select */
var UNI_FIELDS=[["nombre","Nombre",150],["arquetipo","Arquetipo",0],["subtipo","Sub-tipo",110],["naturaleza","Naturaleza",110],["rating","Rating",60],["actividad","Actividad principal",170],["justificacion","Justificación",230],["intensidadCapital","Intensidad capital",110],["apalancamiento","Apalancamiento",110],["marcoRegulatorio","Marco regulatorio",130]];
var UNI_KEYS=UNI_FIELDS.map(function(f){return f[0];});
var _uniBusca={q:''}, _radBusca={q:''};
var RAD_RATING={AAA:100,AA:90,A:78,BBB:65,BB:52,B:40,CCC:28,CC:18,C:10};
var RAD_W={div:0.35,cal:0.35,val:0.30}, RAD_RPDTOP=6, RAD_PAYALTO=85, RAD_ROETOP=20;
function _rclamp(x){ return Math.max(0,Math.min(100,x)); }
function radRatingScore(r){ if(!r)return null; var t=(''+r).trim().toUpperCase(); if(RAD_RATING[t]!=null)return RAD_RATING[t]; var m=(''+r).match(/★/g)||(''+r).match(/\*/g); var n=m?m.length:0; return n?_rclamp(n*20):null; }
function radScore(f,rating,ds){
  var rpd=f.rpd, payout=f.payout, flags=f.flags||[]; var sd, nota='';
  if(!rpd){ sd=0; nota='sin dividendo'; }
  else { sd=_rclamp(rpd/RAD_RPDTOP*100); if(payout&&payout>RAD_PAYALTO){ sd*=0.7; nota='payout alto'; } if(flags.some(function(x){return /irregular/i.test(x);})){ sd*=0.6; nota=(nota?nota+' · ':'')+'div irregular'; } }
  if(ds&&ds.score!=null){ var _sf=_radDsFac(ds); sd=sd*_sf; if(_sf<1)nota=(nota?nota+' · ':'')+'seguridad '+(ds.banda||''); }
  var sroe=(f.roe!=null)?_rclamp(f.roe/RAD_ROETOP*100):50;
  var sdn=(f.dnEbitda==null)?50:_rclamp(100-Math.max(0,f.dnEbitda-2)*25); /* dato ausente = neutro (no regala solvencia; los bancos no reportan DN/EBITDA) */
  var rs=radRatingScore(rating); var srt=(rs!=null)?rs:60;
  var sc=0.5*sroe+0.3*sdn+0.2*srt;
  var sper=(f.per&&f.per>0)?_rclamp(100-Math.max(0,f.per-8)*5):50;
  var spbv=f.pbv?_rclamp(100-Math.max(0,f.pbv-1)*35):50;
  var spos=(f.pos52sem!=null)?_rclamp(100-f.pos52sem):50;
  var sv=(sper+spbv+spos)/3;
  var atr=Math.round((RAD_W.div*sd+RAD_W.cal*sc+RAD_W.val*sv)*10)/10;
  var trampa=(ds&&ds.score!=null)?!!(ds.score<40||(ds.topeDuro&&ds.topeDuro.activo)):!!(rpd&&rpd>7&&((payout&&payout>90)||(f.crecBpa!=null&&f.crecBpa<0)||flags.some(function(x){return /irregular/i.test(x);})));
  /* sc = subíndice de CALIDAD (0,5·ROE + 0,3·solvencia + 0,2·rating); sirve como calidad estimada
     objetiva para empresas aún sin dossier (lo usa Visión de conjunto). sd/sv = dividendo/valoración. */
  return {atr:atr, nota:nota, trampa:trampa, cal:Math.round(sc*10)/10, sdiv:Math.round(sd*10)/10, sval:Math.round(sv*10)/10};
}

/* ================= PESTAÑA UNIVERSO ================= */
/* Colores de arquetipo para las etiquetas */
var UNI_ARQCOL={FINANCIERAS:"#2563eb",REGULADAS:"#0891b2",CONCESIONAL:"#7c3aed",INDUSTRIAL:"#64748b",COMMODITY:"#b45309",CONSUMO:"#db2777",ESCALABLES:"#0d9488",SALUD:"#16a34a",INMOBILIARIAS:"#9333ea","Sin clasificar":"#94a3b8"};
window._uniQ=window._uniQ||''; window._uniArq=window._uniArq||''; window._uniSt=window._uniSt||{held:false,ana:false}; window._uniOpen=window._uniOpen||{};
function _uniStatus(){ var held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  return {isHeld:function(t){return held.has((t||'').toUpperCase());}, isAna:function(t){return (typeof _esAnalizada==='function')&&_esAnalizada(t);}}; }
function _uniStars(r){ if(!r)return '<span style="color:#cbd5e1">—</span>'; var dead=/☠/.test(r); return '<span class="uni-stars'+(dead?' dead':'')+'">'+_radEsc(r)+'</span>'; }
function _uniAtag(a){ a=a||'Sin clasificar'; return '<span class="uni-atag" style="background:'+(UNI_ARQCOL[a]||'#94a3b8')+'">'+_radEsc(a)+'</span>'; }
function _uniChip(r){ if(r.held)return '<span class="uni-chip h">En cartera</span>'; if(r.ana)return '<span class="uni-chip a">Analizada</span>'; return '<span style="color:#cbd5e1">·</span>'; }
function renderUniverso(){
  var sec=document.getElementById('view-universo'); if(!sec)return;
  DB.universo=DB.universo||{};
  var S=_uniStatus();
  var ks=Object.keys(DB.universo);
  var total=ks.length;
  var nHeld=ks.filter(function(t){return S.isHeld(t);}).length;
  var nAna=ks.filter(function(t){return S.isAna(t);}).length;
  var nSin=ks.filter(function(t){return (DB.universo[t].arquetipo||'Sin clasificar')==='Sin clasificar';}).length;
  var arqCount={}; ks.forEach(function(t){var a=DB.universo[t].arquetipo||'Sin clasificar';arqCount[a]=(arqCount[a]||0)+1;});
  var arqOpts=RAD_ARQ.filter(function(a){return arqCount[a];}).map(function(a){return '<option value="'+_radEsc(a)+'"'+(a===window._uniArq?' selected':'')+'>'+_radEsc(a)+' ('+arqCount[a]+')</option>';}).join('');
  sec.innerHTML=
    '<h2>Universo — clasificación</h2>'+
    '<div class="sub" style="margin-bottom:14px">La base de datos de la <b>Matriz Bolsa Española</b>, editable. El <b>Radar</b> la usa para el arquetipo y el rating. Impórtala desde <code>matriz.json</code> y edítala aquí; al añadir una empresa se siembra en Análisis y Dividendos (alta unificada).</div>'+
    '<div class="uni-k">'+
      '<div class="c hero"><div class="l">Empresas en el universo</div><div class="v">'+total+'</div><div class="p">clasificadas por arquetipo</div></div>'+
      '<div class="c"><div class="l">En cartera</div><div class="v g">'+nHeld+'</div><div class="p">con posición abierta</div></div>'+
      '<div class="c"><div class="l">Analizadas</div><div class="v a">'+nAna+'</div><div class="p">con dossier o tesis</div></div>'+
      '<div class="c"><div class="l">Sin clasificar</div><div class="v">'+nSin+'</div><div class="p">pendientes de arquetipo</div></div>'+
    '</div>'+
    '<div class="uni-tb">'+
      '<button class="btn ghost sm" id="uImport">⬆ <span class="lbl-full">Importar matriz.json</span><span class="lbl-short">Imp. Json</span></button>'+
      '<button class="btn sm" id="uAdd">+ Empresa</button>'+
      '<input type="file" id="uFile" accept="application/json,.json" style="display:none">'+
      '<input type="search" id="uSearch" placeholder="Buscar…" value="'+_radEsc(window._uniQ)+'">'+
      '<div class="uni-fgroup"><select id="uArq"><option value="">Todos los arquetipos</option>'+arqOpts+'</select>'+
        '<button class="uni-fchip'+(window._uniSt.held?' on':'')+'" data-ust="held"><span class="dot"></span>En cartera</button>'+
        '<button class="uni-fchip'+(window._uniSt.ana?' on':'')+'" data-ust="ana"><span class="dot"></span>Analizada</button></div>'+
      '<span class="uni-count" id="uCount"></span>'+
    '</div>'+
    '<div class="uni-table"><table><thead><tr><th style="width:14px"></th><th>Ticker</th><th>Empresa</th><th>Arquetipo</th><th>Rating</th><th>Actividad principal</th><th>Estado</th></tr></thead><tbody id="uBody"></tbody></table></div>'+
    '<div class="uni-cards" id="uCards"></div>';
  _uniRenderList();
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  _uniBind(sec);
}
function _uniList(){ var S=_uniStatus(); var q=(window._uniQ||'').toLowerCase().trim(), fa=window._uniArq, wH=window._uniSt.held, wA=window._uniSt.ana;
  return Object.keys(DB.universo).sort().map(function(t){ var u=DB.universo[t]||{}; return {t:t,u:u,held:S.isHeld(t),ana:S.isAna(t)}; })
    .filter(function(r){ if(fa&&(r.u.arquetipo||'Sin clasificar')!==fa)return false; if(wH||wA){ if(!((wH&&r.held)||(wA&&r.ana)))return false; } if(q){ if((r.t+' '+(r.u.nombre||'')).toLowerCase().indexOf(q)<0)return false; } return true; }); }
function _uniDetail(u){ var f=function(k,v,full){ return '<div class="f'+(full?' full':'')+'"><span class="k">'+k+'</span><span class="val">'+(v?_radEsc(v):'—')+'</span></div>'; };
  return '<div class="uni-dgrid">'+f('Sub-tipo',u.subtipo)+f('Naturaleza',u.naturaleza)+f('Intensidad capital',u.intensidadCapital)+f('Apalancamiento',u.apalancamiento)+f('Actividad principal',u.actividad,true)+f('Justificación',u.justificacion,true)+f('Marco regulatorio',u.marcoRegulatorio,true)+'</div>'; }
function _uniActs(t){ return '<div class="uni-dacts"><button class="btn sm" data-uedit="'+_radEsc(t)+'">✎ Editar</button><button class="btn danger sm" data-udel="'+_radEsc(t)+'">Eliminar</button></div>'; }
function _uniRenderList(){
  if(!document.getElementById('uBody'))return;
  var list=_uniList();
  var cnt=document.getElementById('uCount'); if(cnt)cnt.textContent=list.length+' de '+Object.keys(DB.universo).length+' empresas';
  document.getElementById('uBody').innerHTML=list.map(function(r){ var u=r.u, op=!!window._uniOpen[r.t]; var cls='uni-main'+(r.held?' held':(r.ana?' ana':''))+(op?' open':'');
    return '<tr class="'+cls+'" data-ut="'+_radEsc(r.t)+'"><td><span class="uni-arw">▶</span></td>'+
      '<td><b class="uni-tk" data-ficha="'+_radEsc(r.t)+'">'+_radEsc(r.t)+'</b></td>'+
      '<td class="uni-nm">'+_radEsc(u.nombre||'')+'</td>'+
      '<td>'+_uniAtag(u.arquetipo)+'</td>'+
      '<td>'+_uniStars(u.rating)+'</td>'+
      '<td class="uni-act">'+_radEsc(u.actividad||'')+'</td>'+
      '<td>'+_uniChip(r)+'</td></tr>'+
      '<tr class="uni-act-row"><td colspan="7"><div class="uni-detail">'+_uniDetail(u)+_uniActs(r.t)+'</div></td></tr>';
  }).join('')||'<tr><td colspan="7" class="muted" style="padding:16px;text-align:center">Sin resultados.</td></tr>';
  document.getElementById('uCards').innerHTML=list.map(function(r){ var u=r.u, op=!!window._uniOpen[r.t]; var cls='uni-card'+(r.held?' held':(r.ana?' ana':''))+(op?' open':'');
    return '<div class="'+cls+'" data-ut="'+_radEsc(r.t)+'"><div class="uni-card-h"><b class="uni-tk uni-tkc" data-ficha="'+_radEsc(r.t)+'">'+_radEsc(r.t)+'</b>'+
      '<div class="mid"><div class="n">'+_radEsc(u.nombre||'')+'</div><div class="r">'+_uniAtag(u.arquetipo)+'</div></div>'+
      '<div class="rt"><div>'+_uniStars(u.rating)+'</div><div style="margin-top:3px">'+_uniChip(r)+'</div></div>'+
      '<span class="uni-arw" style="margin-left:4px">▶</span></div>'+
      '<div class="uni-card-b">'+_uniDetail(u)+_uniActs(r.t)+'</div></div>';
  }).join('')||'<div class="muted" style="padding:16px;text-align:center">Sin resultados.</div>';
}
function _uniBind(sec){
  if(renderUniverso._bound)return; renderUniverso._bound=true;
  sec.addEventListener('input',function(e){ if(e.target&&e.target.id==='uSearch'){ window._uniQ=e.target.value; _uniRenderList(); } });
  sec.addEventListener('change',function(e){ var t=e.target; if(!t)return;
    if(t.id==='uArq'){ window._uniArq=t.value; _uniRenderList(); return; }
    if(t.id==='uFile'){ var f=t.files&&t.files[0]; if(!f)return; var rd=new FileReader(); rd.onload=function(){ try{ importUniverso(JSON.parse(rd.result)); }catch(err){ alert('matriz.json no válido: '+err); } }; rd.readAsText(f); t.value=''; return; } });
  sec.addEventListener('click',function(e){
    if(e.target.closest('#uImport')){ var f=document.getElementById('uFile'); if(f)f.click(); return; }
    if(e.target.closest('#uAdd')){ _uniOpenForm(null); return; }
    var ch=e.target.closest('.uni-fchip'); if(ch){ var k=ch.getAttribute('data-ust'); window._uniSt[k]=!window._uniSt[k]; _uniRenderList(); ch.classList.toggle('on'); return; }
    var ed=e.target.closest('[data-uedit]'); if(ed){ e.stopPropagation(); _uniOpenForm(ed.getAttribute('data-uedit')); return; }
    var dl=e.target.closest('[data-udel]'); if(dl){ e.stopPropagation(); _uniDelete(dl.getAttribute('data-udel')); return; }
    if(e.target.closest('[data-ficha]'))return;
    var row=e.target.closest('.uni-main'); if(row){ var rt=row.getAttribute('data-ut'); window._uniOpen[rt]=!window._uniOpen[rt]; _uniRenderList(); return; }
    var cardh=e.target.closest('.uni-card-h'); if(cardh){ var ct=cardh.parentElement.getAttribute('data-ut'); window._uniOpen[ct]=!window._uniOpen[ct]; _uniRenderList(); return; } });
}
function _uniOpenForm(t){
  var dlg=document.getElementById('uniDlg'); if(!dlg)return;
  if(!dlg._wired){ dlg._wired=true;
    var arqSel=document.getElementById('uf_arq'); if(arqSel)arqSel.innerHTML=RAD_ARQ.map(function(a){return '<option>'+a+'</option>';}).join('');
    var sv=document.getElementById('uniSave'); if(sv)sv.addEventListener('click',function(){ _uniSaveForm(dlg._editing); dlg.close(); }); }
  var u=t?(DB.universo[t]||{}):{};
  var g=function(id){return document.getElementById(id);};
  g('uniDlgTitle').textContent=t?('Editar '+t):'Nueva empresa';
  g('uf_tk').value=t||''; g('uf_tk').readOnly=!!t;
  g('uf_nm').value=u.nombre||''; g('uf_arq').value=u.arquetipo||'Sin clasificar'; g('uf_rt').value=u.rating||'';
  g('uf_st').value=u.subtipo||''; g('uf_na').value=u.naturaleza||''; g('uf_ac').value=u.actividad||''; g('uf_ju').value=u.justificacion||'';
  g('uf_ic').value=u.intensidadCapital||''; g('uf_ap').value=u.apalancamiento||''; g('uf_mr').value=u.marcoRegulatorio||'';
  dlg._editing=t||''; dlg.showModal();
}
function _uniSaveForm(t){
  var g=function(id){var el=document.getElementById(id);return el?(''+el.value):'';};
  var tk=((t||g('uf_tk'))||'').trim().toUpperCase(); if(!tk)return;
  DB.universo=DB.universo||{};
  var isNew=!DB.universo[tk];
  if(isNew){ var _u={}; UNI_KEYS.forEach(function(k){_u[k]='';}); DB.universo[tk]=_u; }
  var u=DB.universo[tk];
  u.nombre=g('uf_nm').trim(); u.arquetipo=g('uf_arq')||'Sin clasificar'; u.rating=g('uf_rt');
  u.subtipo=g('uf_st'); u.naturaleza=g('uf_na'); u.actividad=g('uf_ac'); u.justificacion=g('uf_ju');
  u.intensidadCapital=g('uf_ic'); u.apalancamiento=g('uf_ap'); u.marcoRegulatorio=g('uf_mr');
  if(isNew) _uniAltaUnificada(tk,u.nombre);
  if(typeof saveNow==='function')saveNow(); else if(typeof scheduleSave==='function')scheduleSave();
  renderUniverso();
  if(isNew){ if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof renderVision==='function')renderVision(); if(typeof renderRadarDiv==='function')renderRadarDiv(); }
}
function _uniAltaUnificada(t,nombre){
  DB.analisis=DB.analisis||[];
  if(!DB.analisis.some(function(a){return (a.ticker||'').toUpperCase()===t;})){
    var _v=(DB.valores||{})[t]||{};
    DB.analisis.push({id:uid(),ticker:t,nombre:nombre||_v.nombre||t,cotizacion:num(_v.precioActual)||0,poMin:0,poMax:0,entMin:0,entMax:0,rating:'',stopTesis:0,decision:'',dossierFecha:'',dossierUrl:'',precioEntrada:0,precioObjetivo:0,divAccion:num(_v.divAccion)||0,notas:''});
  }
  DB.divData=DB.divData||{};
  if(!DB.divData[t]){ DB.divData[t]={nombre:nombre||t, paga:false, anios:{}, origenApp:true}; }
  else if(nombre && !DB.divData[t].nombre){ DB.divData[t].nombre=nombre; }
}
function _uniDelete(t){ if(!DB.universo||!DB.universo[t])return; var item=DB.universo[t];
  if(typeof undoableDelete==='function'){ undoableDelete('universo','Empresa '+t+' del universo',{t:t,item:item},function(){ delete DB.universo[t]; },['renderUniverso']); }
  else { if(!confirm('¿Quitar '+t+' del universo?'))return; delete DB.universo[t]; if(typeof scheduleSave==='function')scheduleSave(); renderUniverso(); } }
function importUniverso(j){
  DB.universo=DB.universo||{};
  var arr=(j&&j.empresas)||[]; if(!Array.isArray(arr)||!arr.length){ alert('El fichero no tiene lista "empresas".'); return; }
  var add=0, fill=0;
  arr.forEach(function(e){ var t=(''+(e.ticker||'')).toUpperCase(); if(!t)return; var u=DB.universo[t];
    if(!u){ u={}; UNI_KEYS.forEach(function(k){ u[k]=e[k]||''; }); if(!u.arquetipo)u.arquetipo='Sin clasificar'; DB.universo[t]=u; add++; }
    else { UNI_KEYS.forEach(function(k){ var vacio=(!u[k])||(k==='arquetipo'&&u[k]==='Sin clasificar'); if(vacio&&e[k]){ u[k]=e[k]; fill++; } }); }
  });
  if(typeof scheduleSave==='function')scheduleSave();
  renderUniverso();
  alert('Importado: '+add+' nuevas, '+fill+' campos rellenados. Tus ediciones previas se conservan.');
}
/* Universo: edición y borrado se gestionan por delegación en _uniBind (ver arriba). */

/* ================= PESTAÑA RADAR ================= */
var _radFundCache=null, _radSort={k:'atr',dir:-1}, _radArqFilter='';
function _radCargarFund(){ if(_radFundCache!==null)return Promise.resolve(_radFundCache); return fetch('fundamentales.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_radFundCache=j||{empresas:[]};return _radFundCache;}).catch(function(){_radFundCache={empresas:[]};return _radFundCache;}); }
function _rf(v,suf,nd){ if(v==null)return '—'; nd=(nd==null?1:nd); return (typeof v==='number'?v.toFixed(nd):v)+(suf||''); }
/* ---- Radar: "qué cambió" (buzon/fundamentales-cambios.json, mensual) ---- */
var _radCambios=null, _radCambiosLoad=null;
function _radCambiosCargar(){ if(_radCambios!==null)return Promise.resolve(_radCambios); if(_radCambiosLoad)return _radCambiosLoad;
  _radCambiosLoad=fetch('buzon/fundamentales-cambios.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_radCambios=j||false;return _radCambios;}).catch(function(){_radCambios=false;return _radCambios;});
  return _radCambiosLoad; }
function _radCambiosStrip(){ var c=_radCambios; if(!c||!c.totales)return '';
  var top=(c.cambios||[]).filter(function(x){return x.senales&&x.senales.length;}).slice(0,6);
  var chips=top.map(function(x){ return '<span class="cchip"><b>'+_radEsc(x.ticker)+'</b> '+_radEsc(x.senales[0].txt)+(x.senales.length>1?(' +'+(x.senales.length-1)):'')+'</span>'; }).join('');
  return '<div class="cambios"><div class="ch"><div class="t">🔎 Cambios '+_radEsc(c.periodoTexto||'')+'</div>'
    +'<a href="#" id="radVerBuzon" style="font-size:12px">ver en el Buzón →</a></div>'
    +'<div class="muted" style="font-size:12px;margin:2px 0 6px">'+(c.totales.conCambios||0)+' empresas con cambios · '+(c.totales.conSenal||0)+' con señal accionable</div>'
    +(chips?('<div class="chips">'+chips+'</div>'):'')+'</div>'; }
var _radCands=null, _radMeta=null;
window._radQ=window._radQ||''; window._radOpen=window._radOpen||{};
function _radAcol(a){ return a>=70?'#16a34a':(a>=55?'#2563eb':'#64748b'); }
function _radStars(r){ if(!r)return '<span style="color:#cbd5e1">—</span>'; var dead=/☠/.test(r); return '<span class="rad-stars'+(dead?' dead':'')+'">'+_radEsc(r)+'</span>'; }
function _radAtag(a){ a=a||'Sin clasificar'; var col=(typeof UNI_ARQCOL!=='undefined'&&UNI_ARQCOL[a])||'#94a3b8'; return '<span class="rad-atag" style="background:'+col+'">'+_radEsc(a)+'</span>'; }
function _radNota(c){ return (c.nota+(c.trampa?(c.nota?', ':'')+'posible trampa':'')).trim(); }
function _radDs(t){ t=(t||'').toUpperCase(); var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); if(a&&a.dividendSafety)return a.dividendSafety; if(typeof _tesisCache!=='undefined'&&_tesisCache&&_tesisCache[t]&&_tesisCache[t].dividendSafety)return _tesisCache[t].dividendSafety; return null; }
function _radDsCol(b){ return {'Muy seguro':'#16a34a','Seguro':'#4d7c0f','Vigilar':'#d97706','Frágil':'#ea580c','Recorte probable':'#dc2626'}[b]||'#64748b'; }
function _radDsCell(ds){ if(!ds)return '<span class="muted" style="font-size:11px">—</span>'; var c=_radDsCol(ds.banda); var tip=((ds.banda||'Pte.')+(ds.rama?' ('+ds.rama+')':'')).replace(/"/g,'&quot;'); var lab=(ds.score!=null?ds.score:'n/a'); return '<span title="'+tip+'" style="cursor:help;background:'+c+';color:#fff;border-radius:6px;padding:1px 7px;font-size:10.5px;font-weight:700">'+lab+'</span>'; }
function _radDsFac(ds){ if(!ds||ds.score==null)return 1; var m={'Muy seguro':1,'Seguro':0.9,'Vigilar':0.6,'Frágil':0.3,'Recorte probable':0.1}; var f=(m[ds.banda]!=null)?m[ds.banda]:(ds.score>=80?1:ds.score>=60?0.9:ds.score>=40?0.6:ds.score>=20?0.3:0.1); if(ds.topeDuro&&ds.topeDuro.activo)f=Math.min(f,0.3); return f; }
function _radFo(t){ t=(t||'').toUpperCase(); var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); if(a&&a.forense)return a.forense; if(typeof _tesisCache!=='undefined'&&_tesisCache&&_tesisCache[t]&&_tesisCache[t].forense)return _tesisCache[t].forense; return null; }
function _radFoVeto(fo){ return !!fo&&fo.aplica&&((fo.veto===true)||(fo.beneish&&(''+fo.beneish.senal).indexOf('manipulaci')>=0)||(fo.altman&&fo.altman.zona==='riesgo')); }
function _radFoCell(fo){ if(!fo)return '<span class="muted" style="font-size:11px">—</span>'; if(fo.aplica===false)return '<span class="muted" title="Forense: no aplica ('+_radEsc(fo.motivo||'rama financiera')+')" style="cursor:help;font-size:11px">n/a</span>'; if(!fo.aplica)return '<span class="muted" style="font-size:11px">—</span>'; var scores='Piotroski '+(fo.piotroski?fo.piotroski.score:'-')+'/9 · Altman '+(fo.altman?fo.altman.z:'-')+' ('+(fo.altman?fo.altman.zona:'-')+') · Beneish '+(fo.beneish?fo.beneish.m:'-')+((fo.sloan&&fo.sloan.accruals!=null)?' · Sloan '+fo.sloan.accruals+'%':''); var has=fo.flags&&fo.flags.length; if(!has){ return '<span title="'+('Sin alertas forenses · '+scores).replace(/"/g,'&quot;')+'" style="cursor:help;background:#16a34a;color:#fff;border-radius:6px;padding:1px 7px;font-size:10.5px;font-weight:700">✓</span>'; } var v=_radFoVeto(fo); var tip=((v?'VETO forense — ':'Alerta forense — ')+fo.flags.join(' · ')+' · '+scores).replace(/"/g,'&quot;'); return '<span title="'+tip+'" style="cursor:help;background:'+(v?'#991b1b':'#dc2626')+';color:#fff;border-radius:6px;padding:1px 7px;font-size:10.5px;font-weight:700">'+(v?'⚠️ VETO':'⚠️')+'</span>'; }
/* === Confianza y Robustez como marcas de color (mismos colores que la Hemeroteca) === */
var _RAD_CFCOL={A:'#16a34a',B:'#d97706',C:'#dc2626'};
var _RAD_RBCOL={solida:'#16a34a','sólida':'#16a34a',robusta:'#16a34a',sensible:'#d97706'};
function _radConf(t){ t=(t||'').toUpperCase(); var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); var c=(a&&a.confianza)||(typeof _tesisCache!=='undefined'&&_tesisCache&&_tesisCache[t]&&_tesisCache[t].confianza); if(!c)return ''; return (''+((c&&(c.nivel||c.letra))||c)).toUpperCase(); }
function _radRob(t){ t=(t||'').toUpperCase(); var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); var r=(a&&a.robustez)||(typeof _tesisCache!=='undefined'&&_tesisCache&&_tesisCache[t]&&_tesisCache[t].robustez); if(!r||!r.nivel)return ''; return (''+r.nivel).toLowerCase(); }
function _radConfCell(cf){ if(!cf)return '<span class="muted" style="font-size:11px">—</span>'; var c=_RAD_CFCOL[cf]||'#64748b'; return '<span title="Confianza del dato: '+cf+'" style="cursor:help;background:'+c+';color:#fff;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700">'+cf+'</span>'; }
function _radRobCell(rb){ if(!rb)return '<span class="muted" style="font-size:11px">—</span>'; var c=_RAD_RBCOL[rb]||'#64748b'; var lab=(rb==='solida')?'sól.':(rb==='sensible'?'sens.':(rb==='robusta'?'rob.':rb)); return '<span title="Robustez de la decisión: '+(rb==='solida'?'sólida':rb)+'" style="cursor:help;background:'+c+';color:#fff;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700">'+lab+'</span>'; }
/* CSS compacto para que quepan las columnas sin scroll horizontal (una sola vez) */
function _radCss(){ if(typeof document==='undefined'||document.getElementById('rad-compact-css'))return; var s=document.createElement('style'); s.id='rad-compact-css'; s.textContent='#view-radar .rad-table{overflow-x:auto}#view-radar .rad-table table{font-size:11px;width:100%;table-layout:auto}#view-radar .rad-table thead th{padding:4px 4px;font-size:9px;letter-spacing:0}#view-radar .rad-table tbody td{padding:4px 4px}.rad-promo-cfg{font-size:10.5px;color:#475569;display:inline-flex;align-items:center;gap:2px;white-space:nowrap}.rad-pin{width:32px;border:1px solid #e2e8f0;border-radius:6px;padding:2px 2px;font-size:10.5px;text-align:center}#radPromoPanel{display:flex;flex-direction:column;gap:6px;margin:2px 0 10px}.rad-promo{font-size:11.5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 10px;border-radius:10px}.rad-promo.pr-ana{background:#f5f3ff;border:1px solid #ddd6fe}.rad-promo.pr-vig{background:#eff6ff;border:1px solid #bfdbfe}.rad-pchip{font-size:11px;font-weight:700;border:1px solid #cbd5e1;background:#fff;border-radius:20px;padding:2px 9px;cursor:pointer;color:#334155}.rad-alert{border:0;background:none;cursor:pointer;font-size:13px;padding:0;line-height:1}.rad-almodal{position:fixed;inset:0;background:rgba(15,23,42,.35);display:none;align-items:center;justify-content:center;z-index:60}.rad-almodal.on{display:flex}.rad-alcard{background:#fff;border-radius:14px;max-width:430px;width:calc(100% - 40px);box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;font-size:13px}.rad-alh{padding:12px 16px;font-weight:800}.rad-alb{padding:0 16px 6px}.rad-ali{display:flex;gap:10px;padding:9px 0;border-top:1px solid #f1f5f9}.rad-aldot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;margin-top:5px}.rad-alf{padding:10px 16px 16px;text-align:right}.rad-alf button{border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:6px 14px;font-weight:700;cursor:pointer}'; (document.head||document.documentElement).appendChild(s); }
/* Posición del precio actual en el rango de los últimos N años (mismo motor que Radar Dividendo:
   _radarStats de 09-radardiv). Se guarda en cada candidato para pintar y ordenar. */
function _radCalcPos(cands){ var y=(typeof _radarYears!=='undefined')?_radarYears:3;
  (cands||[]).forEach(function(c){ var pr=(typeof _precioActualDe==='function')?_precioActualDe(c.t):0; var st=(typeof _radarStats==='function')?_radarStats(c.t,y,pr):null; c.posSt=st; c.posN=st?st.pos:null; });
}
/* Celda compacta que lleva Posición + Nivel: mini-barra con el % y color por nivel
   (verde=zona baja/barato · ámbar=media · rojo=zona alta/caro). */
function _radPosCell(st){ if(!st)return '<span class="muted">—</span>'; var pos=st.pos; var col=pos<33?'#16a34a':(pos<66?'#d97706':'#dc2626');
  return '<span style="display:inline-flex;align-items:center;gap:3px;white-space:nowrap">'
    +'<span style="position:relative;display:inline-block;width:32px;height:7px;background:linear-gradient(90deg,#dcfce7,#fef9c3,#fee2e2);border-radius:4px;border:1px solid #e5e7eb"><i style="position:absolute;left:'+pos.toFixed(0)+'%;top:-2px;width:2px;height:11px;background:'+col+';transform:translateX(-1px);border-radius:1px"></i></span>'
    +'<b style="color:'+col+';font-size:10px">'+pos.toFixed(0)+'</b></span>';
}
function _radNivTxt(pos){ return pos<33?'bajo':(pos<66?'medio':'alto'); }
/* Crecimiento del dividendo: CAGR del DPA bruto (dividendos.json/evoDiv) del último año con dato
   real a ~5 años antes. -99 = suspendido (último dividendo 0). */
function _radCrec(t){ if(typeof evoDpaBruto!=='function')return null; var nowY=new Date().getFullYear(); var last=null;
  for(var y=nowY;y>=nowY-6;y--){ var v=evoDpaBruto(t,y); if(v!=null){ last={y:y,v:num(v)}; break; } }
  if(!last)return null; var first=null;
  for(var y2=last.y-5;y2<last.y;y2++){ var v2=evoDpaBruto(t,y2); if(v2!=null&&num(v2)>0){ first={y:y2,v:num(v2)}; break; } }
  if(!first)return null; var n=last.y-first.y; if(n<=0)return null;
  if(last.v<=0)return -99; return (Math.pow(last.v/first.v,1/n)-1)*100;
}
function _radCrecCell(cr){ if(cr==null)return '<span class="muted">—</span>'; if(cr<=-98)return '<b style="color:#dc2626" title="Dividendo suspendido">✂ 0</b>';
  var col=cr>=3?'#16a34a':(cr>-1?'#64748b':'#dc2626'); return '<b style="color:'+col+'">'+(cr>=0?'+':'')+cr.toFixed(1).replace('.',',')+'%</b>';
}
/* Alertas de una empresa (para la señal ⚠ + su banner emergente). sev: 'r'>'a'>'v'. */
var _radAlertMap={}; var _RAD_ALSEV={r:0,a:1,v:2}; var _RAD_ALICON={r:'🔴',a:'🟠',v:'🟢'};
function _radAlertas(c){ var out=[];
  if(c.trampa)out.push({s:'r',t:'Posible trampa de dividendo',d:'RPD alta con payout/seguridad del dividendo insostenibles: el reparto puede no estar cubierto por el beneficio o la caja.'});
  if(c.crecDiv!=null){ if(c.crecDiv<=-98)out.push({s:'r',t:'Dividendo suspendido/recortado a 0',d:'El último dividendo bruto es 0: reparto suspendido.'});
    else if(c.crecDiv<=-1)out.push({s:'r',t:'Dividendo decreciente',d:'Crecimiento del dividendo negativo (CAGR '+c.crecDiv.toFixed(1).replace('.',',')+'% a ~5 años).'});
    else if(c.crecDiv<1)out.push({s:'a',t:'Dividendo estancado',d:'El dividendo apenas crece (CAGR '+c.crecDiv.toFixed(1).replace('.',',')+'% a ~5 años).'});
    else if(c.crecDiv>=6)out.push({s:'v',t:'Dividendo creciente',d:'Buen crecimiento del dividendo (CAGR +'+c.crecDiv.toFixed(1).replace('.',',')+'% a ~5 años).'}); }
  if(c.posN!=null){ if(c.posN>=66)out.push({s:'a',t:'Precio en zona alta (caro)',d:'Posición '+c.posN.toFixed(0)+'% del rango de los últimos años; poco margen de entrada.'});
    else if(c.posN<=33)out.push({s:'v',t:'Precio en zona baja',d:'Posición '+c.posN.toFixed(0)+'% del rango; cerca de mínimos de los últimos años.'}); }
  var nota=(c.nota||'').trim(); if(nota)out.push({s:'a',t:'Nota',d:nota});
  return out;
}
function _radAlertBadge(c){ var al=_radAlertas(c); _radAlertMap[c.t]=al; if(!al.length)return '<span style="color:#cbd5e1">·</span>';
  var best=al.reduce(function(m,x){return _RAD_ALSEV[x.s]<_RAD_ALSEV[m]?x.s:m;},'v');
  return '<button type="button" class="rad-alert" data-radalert="'+_radEsc(c.t)+'" title="'+al.length+' aviso(s) — pulsa para ver">'+_RAD_ALICON[best]+'</button>';
}
function _radAlertPop(t){ t=(t||'').toUpperCase(); var al=_radAlertMap[t]||[]; var c=(_radCands||[]).find(function(x){return x.t===t;}); var nm=c?c.nombre:'';
  var mo=document.getElementById('radAlertModal'); if(!mo){ mo=document.createElement('div'); mo.id='radAlertModal'; mo.className='rad-almodal'; document.body.appendChild(mo);
    mo.addEventListener('click',function(e){ if(e.target===mo||(e.target.closest&&e.target.closest('[data-radalclose]')))mo.classList.remove('on'); }); }
  var col={r:'#dc2626',a:'#d97706',v:'#16a34a'};
  mo.innerHTML='<div class="rad-alcard"><div class="rad-alh">⚠ '+_radEsc(t)+(nm?' · '+_radEsc((''+nm).slice(0,28)):'')+' <span style="color:#94a3b8;font-weight:600;font-size:12px">· '+al.length+' aviso(s)</span></div><div class="rad-alb">'
    +(al.length?al.map(function(x){return '<div class="rad-ali"><span class="rad-aldot" style="background:'+col[x.s]+'"></span><div><div style="font-weight:700">'+_radEsc(x.t)+'</div><div style="color:#64748b;font-size:12px;margin-top:2px">'+_radEsc(x.d)+'</div></div></div>';}).join(''):'<div class="muted" style="padding:8px 0">Sin avisos.</div>')
    +'</div><div class="rad-alf"><button type="button" data-radalclose="1">Cerrar</button></div></div>';
  mo.classList.add('on');
}
function renderRadar(){
  var sec=document.getElementById('view-radar'); if(!sec)return; _radCss();
  DB.universo=DB.universo||{}; DB.radarSel=DB.radarSel||{};
  if(!Object.keys(DB.universo).length){ sec.innerHTML='<h2>Radar de oportunidades</h2><div class="empty">Primero importa la clasificación en la pestaña <b>Universo</b> (botón «Importar matriz.json»).</div>'; if(typeof renderInfoBoxes==='function')renderInfoBoxes(); return; }
  sec.innerHTML='<h2>Radar de oportunidades</h2><div class="muted" style="padding:10px">Cargando fundamentales del repo…</div>';
  Promise.all([_radCargarFund(), _radCambiosCargar(), (typeof _evoCargar==='function'?_evoCargar():Promise.resolve())]).then(function(_res){ var fund=_res[0];
    var fmap={}; (fund.empresas||[]).forEach(function(f){ fmap[(''+f.ticker).toUpperCase()]=f; });
    /* RPD unificada con Radar Dividendo: DPA bruto declarado del AÑO EN VIGOR (dividendos.json)
       ÷ precio vivo, en lugar del trailing-12m de Yahoo (fundamentales.json). El trailing deja
       huecos que dan RPD=0,0% cuando el pago del año anterior ya salió de la ventana de 365 días
       y el del año en curso aún no se ha abonado (p. ej. Azkoyen entre pagos). Solo se sustituye
       para empresas presentes en la base de dividendos; el resto conserva el dato de Yahoo. */
    var _divTk={}; if(typeof _evoData!=='undefined' && _evoData && _evoData.empresas){ _evoData.empresas.forEach(function(e){ _divTk[(e.ticker||'').toUpperCase()]=1; }); }
    var cands=[];
    Object.keys(DB.universo).forEach(function(t){ var f=fmap[t]; if(!f)return; var u=DB.universo[t];
      if(_divTk[t] && typeof _radarDiv==='function' && typeof _radarPrecio==='function'){
        var _pp=num(_radarPrecio(t)); if(!(_pp>0))_pp=num(f.precio);
        if(_pp>0){ var _dd=num(_radarDiv(t)); f.rpd=(_dd>0)?Math.round(_dd/_pp*10000)/100:0; }
      }
      var _dst=_radDs(t); var sc=radScore(f,u.rating,_dst); cands.push({t:t,nombre:u.nombre||f.nombre||t,arq:u.arquetipo||'Sin clasificar',rating:u.rating||'',f:f,atr:sc.atr,nota:sc.nota,trampa:sc.trampa,ds:_dst,crecDiv:(typeof _radCrec==='function'?_radCrec(t):null)}); });
    _radCands=cands; _radMeta=fund;
    if(!cands.length){ sec.innerHTML='<h2>Radar de oportunidades</h2><div class="empty">No hay cruce entre el universo y <code>fundamentales.json</code>. ¿Está subido <code>fundamentales.json</code> al repo y actualizado? (act. '+_radEsc((fund&&fund.actualizado)||'—')+')</div>'; if(typeof renderInfoBoxes==='function')renderInfoBoxes(); return; }
    /* Carga cotizaciones históricas (para la Posición a N años) y luego construye. */
    var _faltaP=(typeof _precioCache!=='undefined')?cands.map(function(c){return c.t;}).filter(function(t){return _precioCache[t]===undefined;}):[];
    if(_faltaP.length){ Promise.all(_faltaP.map(function(t){ return fetch('precios/'+t+'.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_precioCache[t]=j;}).catch(function(){_precioCache[t]=null;}); })).then(function(){ _radCalcPos(cands); _radBuild(sec); }); }
    else { _radCalcPos(cands); _radBuild(sec); }
  });
}
function _radBuild(sec){
  var cands=_radCands, fund=_radMeta;
  window._radFlt=window._radFlt||{held:false,ana:false,sel:false,pend:false};
  var mejor=cands.slice().sort(function(a,b){return b.atr-a.atr;})[0];
  var trampas=cands.filter(function(c){return c.trampa;}).length;
  var arqSet={}; cands.forEach(function(c){arqSet[c.arq]=1;}); var arqList=Object.keys(arqSet).sort();
  var arqOpts='<option value="">Todos los arquetipos</option>'+arqList.map(function(a){return '<option value="'+_radEsc(a)+'"'+(a===_radArqFilter?' selected':'')+'>'+_radEsc(a)+'</option>';}).join('');
  var _ry=(typeof _radarYears!=='undefined')?_radarYears:3;
  var sortOpts=[['atr','Atractivo'],['rpd','RPD'],['roe','ROE'],['per','PER'],['pos52sem','Pos.52s'],['posN','Pos.'+_ry+'a']].map(function(o){return '<option value="'+o[0]+'"'+(_radSort.k===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('');
  var yearOptsN=[1,2,3,4,5].map(function(y){return '<option value="'+y+'"'+(y===_ry?' selected':'')+'>'+y+(y===1?' año':' años')+'</option>';}).join('');
  sec.innerHTML='<h2>Radar de oportunidades</h2>'+
    '<div class="rad-k">'+
      '<div class="c hero"><div class="l">Universo con datos</div><div class="v">'+cands.length+'</div><div class="p">cruzan con fundamentales</div></div>'+
      '<div class="c"><div class="l">Mejor atractivo</div><div class="v" style="color:#16a34a">'+(mejor?mejor.atr.toFixed(1):'—')+'</div><div class="p">'+(mejor?_radEsc(mejor.t):'')+'</div></div>'+
      '<div class="c"><div class="l">Posibles trampas</div><div class="v" style="color:#b45309">'+trampas+'</div><div class="p">RPD alta con riesgo</div></div>'+
      '<div class="c"><div class="l">Actualizado</div><div class="v" style="font-size:18px">'+_radEsc((fund&&fund.actualizado)||'—')+'</div><div class="p">último fundamentales.json</div></div>'+
    '</div>'+
    '<div class="rad-tb">'+
      '<select id="radArq">'+arqOpts+'</select>'+
      '<input type="search" id="radSearch" placeholder="Buscar…" value="'+_radEsc(window._radQ)+'">'+
      '<label class="rad-sortm">Ordenar <select id="radSortSel">'+sortOpts+'</select></label>'+
      '<label title="Ventana histórica para la Posición del precio" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#64748b">Rango <select id="radYearsN">'+yearOptsN+'</select></label>'+
      '<button class="btn sm" id="radAddCola">➕ Añadir ★ a la cola</button>'+'<span class="rad-fltset" id="radFltSet"><span class="rad-fltl">Filtrar:</span>'+'<button class="rad-flt f-held" data-radflt="held" title="En cartera">Cartera</button>'+'<button class="rad-flt f-ana" data-radflt="ana" title="Analizadas">Análisis</button>'+'<button class="rad-flt f-sel" data-radflt="sel" title="Seleccionadas ★">Atractiva</button>'+'<button class="rad-flt f-pend" data-radflt="pend" title="Pendientes">Pendiente</button></span>'+'<span class="rad-promo-cfg" title="Umbrales de sugerencia de promoción">Sugerir vigilar ≥<input type="number" id="radPromoVig" class="rad-pin" value="'+_radPromoCfg().vig+'"> · analizar ≥<input type="number" id="radPromoAna" class="rad-pin" value="'+_radPromoCfg().ana+'"> ★★★</span>'+
      '<span class="rad-count" id="radCount"></span>'+
    '</div>'+
    '<div id="radPromoPanel"></div>'+'<div class="rad-table"><table><thead><tr>'+
      '<th class="l">★</th><th class="l s" data-radsk="atr">Atractivo</th><th class="l">Empresa</th><th class="l">Arquetipo</th>'+
      '<th class="s" data-radsk="rpd">RPD</th><th class="s" data-radsk="crec" title="Crecimiento anualizado del dividendo (CAGR ~5 años)">Crec.Div</th><th title="Payout (dividendo / beneficio)">Pay.</th><th class="s" data-radsk="roe">ROE</th><th title="Deuda neta / EBITDA">DN/EB</th><th class="s" data-radsk="per">PER</th><th>P/BV</th><th class="s" data-radsk="pos52sem">52s</th><th class="s" data-radsk="posN" title="Posición del precio en el rango de los últimos '+_ry+' años (verde=zona baja/barato · rojo=zona alta/caro)">Pos.'+_ry+'a</th><th class="l">Rating</th><th class="l" title="Dividend Safety Score de las empresas ya analizadas">Seg.</th><th class="l" title="Capa forense (Piotroski / Altman / Beneish / Sloan): ✓ sin alertas · ⚠️ alerta · VETO fraude/insolvencia">For.</th><th class="l" title="Índice de confianza del dato del dossier (A verde · B ámbar · C rojo)">Conf.</th><th class="l" title="Robustez de la decisión ante ±sensibilidad (sólida verde · sensible ámbar)">Rob.</th><th class="l" title="Alertas — pulsa la señal para ver el detalle">⚠</th>'+
    '</tr></thead><tbody id="radBody"></tbody></table></div>'+
    '<div class="rad-cards" id="radCards"></div>'+
    '<div class="muted" style="font-size:11px;margin-top:10px;line-height:1.5">El Atractivo es un filtro grueso, no una recomendación de compra. Marca ★ las que te encajen y pulsa «Añadir ★ a la cola» para llevarlas a Cobertura.</div>'+
    '<div class="sub" style="margin-top:8px"><b>Atractivo (0–100)</b> = 35% Dividendo + 35% Calidad + 30% Valoración. Cribado grueso para decidir <b>a quién analizar</b>; ⚠️ marca posible trampa de dividendo. En las <b>ya analizadas</b>, el componente Dividendo y la ⚠️ usan el <b>Dividend Safety</b> real (columna «Seg. div.»); la columna «Forense» resume el contraste de cuentas (✓ sin alertas · ⚠️ alerta · VETO fraude/insolvencia). Datos de <code>fundamentales.json</code>.</div>'+
    '<div id="radBuzonSecs" style="margin-top:18px"></div>';
  _radRenderList();
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  var _rbs=document.getElementById('radBuzonSecs'); if(_rbs&&typeof buzonRadarSecciones==='function')buzonRadarSecciones(_rbs);
  _radBind(sec);
}
function _radView(){
  var q=(window._radQ||'').toLowerCase().trim();
  var list=(_radCands||[]).filter(function(c){ if(_radArqFilter&&c.arq!==_radArqFilter)return false; if(q){ if((c.t+' '+(c.nombre||'')).toLowerCase().indexOf(q)<0)return false; } return true; });
  var F=window._radFlt||{}; if(F.held||F.ana||F.sel||F.pend){ var _hF=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
    list=list.filter(function(c){ var st=(DB.radarSel&&DB.radarSel[c.t])?'sel':(_hF.has(c.t)?'held':((typeof _esAnalizada==='function'&&_esAnalizada(c.t))?'ana':'pend')); return F[st]; }); }
  var k=_radSort.k,d=_radSort.dir;
  var _gv=function(o){ return (k==='atr')?o.atr:(k==='posN'?(o.posN==null?-1e9:o.posN):(k==='crec'?(o.crecDiv==null?-1e9:o.crecDiv):(o.f[k]==null?-1e9:o.f[k]))); };
  list.sort(function(a,b){ return (_gv(a)-_gv(b))*d; });
  return list;
}
function _radArrow(k){ return _radSort.k===k?(_radSort.dir<0?' ▼':' ▲'):''; }
function _radRenderList(){
  if(!document.getElementById('radBody'))return;
  var list=_radView();
  var _held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  var cnt=document.getElementById('radCount'); if(cnt)cnt.textContent=list.length+' de '+(_radCands||[]).length;
  var LBL={atr:'Atr.',rpd:'RPD',crec:'Crec.Div',roe:'ROE',per:'PER',pos52sem:'52s',posN:'Pos.'+((typeof _radarYears!=='undefined')?_radarYears:3)+'a'};
  document.querySelectorAll('#view-radar th[data-radsk]').forEach(function(th){ var k=th.getAttribute('data-radsk'); th.textContent=LBL[k]+_radArrow(k); });
  (function(){ var ph=document.getElementById('radPromoPanel'); if(!ph)return; var sA=[],sV=[];
    (_radCands||[]).forEach(function(c){ var x=(typeof _radSugerencia==='function')?_radSugerencia(c):null; if(x==='ana')sA.push(c); else if(x==='vig')sV.push(c); });
    sA.sort(function(a,b){return b.atr-a.atr;}); sV.sort(function(a,b){return b.atr-a.atr;});
    var chip=function(c,m){ return '<button class="rad-pchip" data-radpromo="'+m+'|'+_radEsc(c.t)+'" title="'+(m==='ana'?'Añadir a la cola de análisis':'Marcar ★ (vigilada)')+'">'+_radEsc(c.t)+' · '+c.atr.toFixed(0)+(m==='ana'?' +':' ★')+'</button>'; };
    ph.innerHTML=(sA.length?'<div class="rad-promo pr-ana"><b>🟣 Analizar ('+sA.length+')</b> '+sA.map(function(c){return chip(c,'ana');}).join('')+'</div>':'')+
      (sV.length?'<div class="rad-promo pr-vig"><b>🔵 Vigilar ('+sV.length+')</b> '+sV.slice(0,24).map(function(c){return chip(c,'vig');}).join('')+(sV.length>24?' <span class="muted" style="font-size:10px">+'+(sV.length-24)+'</span>':'')+'</div>':''); })();
  document.getElementById('radBody').innerHTML=list.map(function(c){ var f=c.f; var sel=!!DB.radarSel[c.t];
    var st=sel?'sel':(_held.has(c.t)?'held':((typeof _esAnalizada==='function'&&_esAnalizada(c.t))?'ana':''));
    return '<tr class="'+st+'"><td class="l"><input type="checkbox" class="rad-ck" data-radck="'+_radEsc(c.t)+'"'+(sel?' checked':'')+'></td>'+
      '<td class="l rad-atr" style="color:'+_radAcol(c.atr)+'">'+c.atr.toFixed(1)+(c.trampa?' ⚠️':'')+_radSugBadge(c)+'</td>'+
      '<td class="l"><b class="rad-tk" data-ficha="'+_radEsc(c.t)+'">'+_radEsc(c.t)+'</b> <span style="font-size:11px;color:#94a3b8">'+_radEsc((c.nombre||'').slice(0,18))+'</span></td>'+
      '<td class="l">'+_radAtag(c.arq)+'</td>'+
      '<td style="font-weight:700;color:'+(f.rpd>=5?'#16a34a':(f.rpd>=3.5?'#2563eb':'#475569'))+'">'+_rf(f.rpd,'%',2)+'</td>'+
      '<td style="text-align:right">'+_radCrecCell(c.crecDiv)+'</td>'+
      '<td>'+_rf(f.payout,'%',0)+'</td><td>'+_rf(f.roe,'%',1)+'</td><td>'+_rf(f.dnEbitda,'x',2)+'</td><td>'+_rf(f.per,'',1)+'</td><td>'+_rf(f.pbv,'',2)+'</td><td>'+_rf(f.pos52sem,'%',0)+'</td>'+
      '<td class="l" style="text-align:center">'+_radPosCell(c.posSt)+'</td>'+
      '<td class="l" style="text-align:center">'+_radStars(c.rating)+'</td>'+
      '<td class="l" style="text-align:center">'+_radDsCell(c.ds)+'</td>'+
      '<td class="l" style="text-align:center">'+_radFoCell(_radFo(c.t))+'</td>'+
      '<td class="l" style="text-align:center">'+_radConfCell(_radConf(c.t))+'</td>'+
      '<td class="l" style="text-align:center">'+_radRobCell(_radRob(c.t))+'</td>'+
      '<td class="l" style="text-align:center">'+_radAlertBadge(c)+'</td></tr>';
  }).join('')||'<tr><td colspan="19" style="text-align:center;padding:16px;color:#94a3b8">Sin resultados.</td></tr>';
  document.getElementById('radCards').innerHTML=list.map(function(c){ var f=c.f; var sel=!!DB.radarSel[c.t]; var op=!!window._radOpen[c.t];
    var st=sel?' sel':(_held.has(c.t)?' held':((typeof _esAnalizada==='function'&&_esAnalizada(c.t))?' ana':''));
    return '<div class="rad-card'+st+(op?' open':'')+'" data-t="'+_radEsc(c.t)+'"><div class="rad-card-h"><div class="cka"><input type="checkbox" class="rad-ck" data-radck="'+_radEsc(c.t)+'"'+(sel?' checked':'')+'></div>'+
      '<div class="score"><div class="n" style="color:'+_radAcol(c.atr)+'">'+c.atr.toFixed(0)+'</div><div class="l">Atr'+(c.trampa?' ⚠️':'')+'</div></div>'+
      '<div class="mid"><div class="nm"><span class="rad-tk" data-ficha="'+_radEsc(c.t)+'">'+_radEsc(c.t)+'</span> · '+_radEsc((c.nombre||'').slice(0,20))+'</div><div class="sub2">'+_radAtag(c.arq)+' '+_radStars(c.rating)+'</div></div>'+
      '<div class="rpd"><div class="v" style="color:'+(f.rpd>=5?'#16a34a':'#475569')+'">'+_rf(f.rpd,'%',1)+'</div><div class="l">RPD</div></div>'+
      '<span class="rad-arw">▶</span></div>'+
      '<div class="rad-card-b"><div class="mgrid">'+
        '<div class="m"><div class="l">Crec.Div</div><div class="v">'+_radCrecCell(c.crecDiv)+'</div></div>'+
        '<div class="m"><div class="l">Payout</div><div class="v">'+_rf(f.payout,'%',0)+'</div></div>'+
        '<div class="m"><div class="l">ROE</div><div class="v">'+_rf(f.roe,'%',1)+'</div></div>'+
        '<div class="m"><div class="l">DN/EBITDA</div><div class="v">'+_rf(f.dnEbitda,'x',2)+'</div></div>'+
        '<div class="m"><div class="l">PER</div><div class="v">'+_rf(f.per,'',1)+'</div></div>'+
        '<div class="m"><div class="l">P/BV</div><div class="v">'+_rf(f.pbv,'',2)+'</div></div>'+
        '<div class="m"><div class="l">Pos.52s</div><div class="v">'+_rf(f.pos52sem,'%',0)+'</div></div>'+
        '<div class="m"><div class="l">Pos.'+((typeof _radarYears!=='undefined')?_radarYears:3)+'a</div><div class="v">'+(c.posN!=null?('<span style="color:'+(c.posN<33?'#16a34a':(c.posN<66?'#d97706':'#dc2626'))+'">'+c.posN.toFixed(0)+'% '+_radNivTxt(c.posN)+'</span>'):'—')+'</div></div>'+
        (c.ds?'<div class="m"><div class="l">Seg. div.</div><div class="v" style="color:'+_radDsCol(c.ds.banda)+'">'+(c.ds.score!=null?c.ds.score:'n/a')+'</div></div>':'')+
        (function(){var fo=_radFo(c.t); if(!fo||!fo.aplica)return ''; var has=fo.flags&&fo.flags.length; var v=has&&_radFoVeto(fo); var lab=!has?'✓':(v?'⚠️ VETO':'⚠️'); var col=!has?'#16a34a':(v?'#991b1b':'#dc2626'); return '<div class="m"><div class="l">Forense</div><div class="v" style="color:'+col+'">'+lab+'</div></div>';})()+
        (function(){var cf=_radConf(c.t); if(!cf)return ''; return '<div class="m"><div class="l">Confianza</div><div class="v" style="color:'+(_RAD_CFCOL[cf]||'#64748b')+'">'+cf+'</div></div>';})()+
        (function(){var rb=_radRob(c.t); if(!rb)return ''; return '<div class="m"><div class="l">Robustez</div><div class="v" style="color:'+(_RAD_RBCOL[rb]||'#64748b')+'">'+(rb==='solida'?'sólida':rb)+'</div></div>';})()+
      '</div>'+(function(){ var al=_radAlertas(c); if(!al.length)return ''; var col={r:'#dc2626',a:'#d97706',v:'#16a34a'}; return '<div style="margin-top:9px;display:flex;flex-direction:column;gap:5px">'+al.map(function(x){return '<div style="display:flex;gap:7px;font-size:12px"><span style="flex:0 0 auto;width:8px;height:8px;border-radius:50%;margin-top:4px;background:'+col[x.s]+'"></span><span><b>'+_radEsc(x.t)+'.</b> <span style="color:#64748b">'+_radEsc(x.d)+'</span></span></div>';}).join('')+'</div>'; })()+'</div></div>';
  }).join('')||'<div style="text-align:center;padding:16px;color:#94a3b8">Sin resultados.</div>';
}
function _radBind(sec){
  if(renderRadar._bound)return; renderRadar._bound=true;
  sec.addEventListener('input',function(e){ if(e.target&&e.target.id==='radSearch'){ window._radQ=e.target.value; _radRenderList(); } });
  sec.addEventListener('change',function(e){ var t=e.target; if(!t)return;
    if(t.id==='radPromoVig'||t.id==='radPromoAna'){ DB.config=DB.config||{}; DB.config.radarPromo=DB.config.radarPromo||{}; DB.config.radarPromo[t.id==='radPromoVig'?'vigilar':'analizar']=num(t.value); if(typeof scheduleSave==='function')scheduleSave(); _radRenderList(); return; }
    if(t.id==='radArq'){ _radArqFilter=t.value; _radRenderList(); return; }
    if(t.id==='radSortSel'){ _radSort.k=t.value; _radSort.dir=-1; _radRenderList(); return; }
    if(t.id==='radYearsN'){ _radarYears=parseInt(t.value,10)||3; if(typeof _radCalcPos==='function'&&_radCands)_radCalcPos(_radCands); _radRenderList(); return; }
    if(t.classList&&t.classList.contains('rad-ck')){ var tk=(t.getAttribute('data-radck')||'').toUpperCase(); if(!tk)return; DB.radarSel=DB.radarSel||{}; if(t.checked)DB.radarSel[tk]=true; else delete DB.radarSel[tk]; if(typeof scheduleSave==='function')scheduleSave(); _radRenderList(); return; } });
  sec.addEventListener('click',function(e){
    if(e.target.closest('.rad-ck'))return;
    if(e.target.closest('[data-ficha]'))return;
    var _ab=e.target.closest&&e.target.closest('[data-radalert]'); if(_ab){ _radAlertPop(_ab.getAttribute('data-radalert')); return; }
    var th=e.target.closest('th[data-radsk]'); if(th){ var k=th.getAttribute('data-radsk'); if(_radSort.k===k)_radSort.dir=-_radSort.dir; else {_radSort.k=k;_radSort.dir=-1;} var ss=document.getElementById('radSortSel'); if(ss)ss.value=_radSort.k; _radRenderList(); return; }
    var _fb=e.target.closest('[data-radflt]'); if(_fb){ var _fk=_fb.getAttribute('data-radflt'); window._radFlt=window._radFlt||{held:false,ana:false,sel:false,pend:false}; window._radFlt[_fk]=!window._radFlt[_fk]; _fb.classList.toggle('on',window._radFlt[_fk]); _radRenderList(); return; }
    var _pp=e.target.closest('[data-radpromo]'); if(_pp){ var _pa=(_pp.getAttribute('data-radpromo')||'').split('|'); var _pm=_pa[0], _pt=(_pa[1]||'').toUpperCase(); if(_pm==='ana'){ if(typeof colaAdd==='function')colaAdd(_pt); } else { DB.radarSel=DB.radarSel||{}; DB.radarSel[_pt]=true; if(typeof scheduleSave==='function')scheduleSave(); } _radRenderList(); return; }
    if(e.target.closest('#radAddCola')){ var selk=Object.keys(DB.radarSel||{}); var n=0,ya=0; selk.forEach(function(t){ if(typeof _esAnalizada==='function'&&_esAnalizada(t)){ya++;return;} if(typeof colaAdd==='function'&&colaAdd(t))n++; else ya++; }); alert(n+' añadidas a la cola de análisis'+(ya?' ('+ya+' ya estaban o analizadas)':'')); return; }
    var h=e.target.closest('.rad-card-h'); if(h){ var t2=h.parentElement.getAttribute('data-t'); window._radOpen[t2]=!window._radOpen[t2]; _radRenderList(); return; } });
}


/* ================= PESTAÑA COBERTURA (plan de análisis) ================= */
function _radPromoCfg(){ DB.config=DB.config||{}; var p=DB.config.radarPromo||{}; return {vig:(num(p.vigilar)||55), ana:(num(p.analizar)||65), minRat:(num(p.minRating)||60)}; }
function _radSugerencia(c){ if(!c)return null; var t=(c.t||'').toUpperCase();
  if(typeof heldTickerSet==='function'&&heldTickerSet().has(t))return null;
  if(typeof _esAnalizada==='function'&&_esAnalizada(t))return null;
  if(c.trampa) return null;
  var cfg=_radPromoCfg(); var enCola=(typeof _colaHas==='function')&&_colaHas(t);
  var rs=(typeof radRatingScore==='function')?(radRatingScore(c.rating)||0):0;
  if(!c.trampa && c.atr>=cfg.ana && rs>=cfg.minRat && !enCola) return 'ana';
  if(c.atr>=cfg.vig && !enCola && !((DB.radarSel||{})[t])) return 'vig';
  return null; }
function _radSugBadge(c){ var x=(typeof _radSugerencia==='function')?_radSugerencia(c):null; return x==='ana'?' <span class="rad-sug" title="Sugerida: analizar (Atractivo alto + rating ★★★)">🟣</span>':(x==='vig'?' <span class="rad-sug" title="Sugerida: vigilar">🔵</span>':''); }
function _colaHas(t){ t=(t||'').toUpperCase(); return (DB.cola||[]).some(function(x){return (x.t||'').toUpperCase()===t;}); }
function _esAnalizada(t){ t=(t||'').toUpperCase(); var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); if(a&&a.dossierFecha)return true; if(typeof _tesisSet!=='undefined'&&_tesisSet&&_tesisSet.has&&_tesisSet.has(t))return true; return false; }
function colaAdd(t){ t=(t||'').toUpperCase(); if(!t)return false; DB.cola=DB.cola||[]; if(_colaHas(t))return false; DB.cola.push({t:t,estado:'pendiente',nota:''}); if(typeof scheduleSave==='function')scheduleSave(); return true; }
function _uniInfo(t){ t=(t||'').toUpperCase(); var u=(DB.universo||{})[t]||{}; var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;})||{}; return {nombre:u.nombre||a.nombre||t, arq:u.arquetipo||''}; }
function renderCobertura(){
  var sec=document.getElementById('view-cobertura'); if(!sec)return;
  DB.cola=DB.cola||[]; DB.analisis=DB.analisis||[];
  window._cobOpen=window._cobOpen||{cal:false,cola:false,cad:false};
  var analizadas=DB.analisis.filter(function(a){return a.dossierFecha;});
  var nAnaliz=analizadas.length;
  var nColaPend=DB.cola.filter(function(c){return !_esAnalizada(c.t)&&(c.estado!=='hecha');}).length;
  var nUni=Object.keys(DB.universo||{}).length;
  var kpis='<div class="cob-k">'+
    '<div class="c hero"><div class="l">Analizadas</div><div class="v">'+nAnaliz+'</div><div class="p">con dossier</div></div>'+
    '<div class="c"><div class="l">En cola</div><div class="v">'+nColaPend+'</div><div class="p">pendientes de analizar</div></div>'+
    '<div class="c"><div class="l">Universo</div><div class="v">'+nUni+'</div><div class="p">empresas clasificadas</div></div>'+
    '<div class="c"><div class="l">Requieren acción</div><div class="v warn" id="cobAccion">·</div><div class="p">señales y vencidas</div></div>'+
  '</div>';
  var blk=function(key,ic,title,cnt,note,inner){ var op=window._cobOpen[key]; return '<div class="cob-blk'+(op?' open':'')+'" data-cblk="'+key+'"><div class="cob-blk-h"><span class="ic">'+ic+'</span><span class="t">'+title+'</span><span class="cnt">'+cnt+'</span><span class="arw">▶</span></div><div class="cob-blk-b">'+(note?'<div class="cob-note">'+note+'</div>':'')+inner+'</div></div>'; };
  sec.innerHTML='<h2>Cobertura y cola de análisis</h2>'+
    '<div class="sub" style="margin-bottom:14px">Qué empresas has analizado y cuáles tienes en cola. El <b>Calendario</b> reúne lo que toca hacer (análisis en cola, informes que vencen, señales de precio); la <b>Cola</b> la ordenas tú (▲▼) y la nutres desde <b>Radar Op.</b> (★).</div>'+
    kpis+
    blk('cal','📅','Calendario de cobertura','','Arriba lo que requiere acción ahora (señales de precio y vencidas), luego las pendientes de analizar (tu cola) y las programadas con los días que faltan. Marca ✓ al hacerlo. <span class="muted">El próximo informe se estima desde el monitor trimestral.</span>','<div id="calHost"><div class="muted" style="font-size:12px;padding:8px 0">Preparando calendario…</div></div>')+
    blk('cola','🗂️','Cola de análisis',nColaPend+' pendientes','Por tu orden de prioridad (▲▼). Se nutre desde Radar Op. con ★.',_cobColaHtml())+
    blk('cad','🔁','Cadencia de las analizadas',nAnaliz+' analizadas','Último y próximo informe estimado, si toca monitor o revisión anual, calibración y señal de precio activa.','<div id="cadHost"><div class="muted" style="font-size:12px;padding:8px 0">Cargando informes trimestrales…</div></div>');
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  _cobBind(sec);
  var tks=analizadas.map(function(a){return (a.ticker||'').toUpperCase();});
  if(tks.length) Promise.all([_cadCargar(tks),_agCargar()]).then(function(){ _pintarCadencia(analizadas); _pintarCalendario(analizadas); });
  else { var h=document.getElementById('cadHost'); if(h)h.innerHTML='<div class="muted" style="font-size:12px;padding:8px 0">Aún no hay empresas analizadas.</div>'; _pintarCalendario([]); }
}
function _cobAtag(a){ a=a||'Sin clasificar'; var col=(typeof UNI_ARQCOL!=='undefined'&&UNI_ARQCOL[a])||'#94a3b8'; return a?'<span class="cob-atag" style="background:'+col+'">'+_radEsc(a)+'</span>':''; }
function _cobColaHtml(){
  var estOpts=function(sel){ return ['pendiente','en curso','hecha'].map(function(e){return '<option'+(e===sel?' selected':'')+'>'+e+'</option>';}).join(''); };
  if(!(DB.cola||[]).length) return '<div class="muted" style="font-size:12px;padding:8px 0">Cola vacía. Marca empresas con ★ en Radar Op. y pulsa «Añadir ★ a la cola».</div>';
  var filas=DB.cola.map(function(c,i){ var t=(c.t||'').toUpperCase(); var inf=_uniInfo(t); var anz=_esAnalizada(t);
    return '<tr'+(anz?' class="done"':'')+'><td class="num" style="color:#94a3b8">'+(i+1)+'</td>'+
      '<td><b class="cob-tk">'+_radEsc(t)+'</b> <span style="font-size:11px;color:#94a3b8">'+_radEsc((inf.nombre||'').slice(0,20))+'</span>'+(anz?' <span class="cob-anz">✓ analizada</span>':'')+'</td>'+
      '<td>'+_cobAtag(inf.arq)+'</td>'+
      '<td><select class="colaInp" data-ct="'+_radEsc(t)+'" data-cf="estado">'+estOpts(c.estado||'pendiente')+'</select></td>'+
      '<td><input class="colaInp" data-ct="'+_radEsc(t)+'" data-cf="nota" value="'+_radEsc(c.nota||'')+'" placeholder="nota" style="width:150px"></td>'+
      '<td style="white-space:nowrap;text-align:right"><button class="cob-mv" data-colamove="'+i+'|-1" title="Subir">▲</button> <button class="cob-mv" data-colamove="'+i+'|1" title="Bajar">▼</button> <button class="cob-mv del" data-coladel="'+_radEsc(t)+'" title="Quitar">✕</button></td></tr>';
  }).join('');
  var desk='<div class="cob-desk"><table><thead><tr><th class="num">#</th><th>Empresa</th><th>Arquetipo</th><th>Estado</th><th>Nota</th><th></th></tr></thead><tbody>'+filas+'</tbody></table></div>';
  var cards=DB.cola.map(function(c,i){ var t=(c.t||'').toUpperCase(); var inf=_uniInfo(t); var anz=_esAnalizada(t);
    return '<div class="cob-card cola'+(anz?' done':'')+'"><div class="top"><span class="num">'+(i+1)+'</span><b class="cob-tk">'+_radEsc(t)+'</b> <span style="font-size:12px;color:#94a3b8">'+_radEsc((inf.nombre||'').slice(0,16))+'</span> '+_cobAtag(inf.arq)+(anz?' <span class="cob-anz">✓</span>':'')+'</div>'+
      '<div class="row2"><select class="colaInp" data-ct="'+_radEsc(t)+'" data-cf="estado">'+estOpts(c.estado||'pendiente')+'</select><input class="colaInp" data-ct="'+_radEsc(t)+'" data-cf="nota" value="'+_radEsc(c.nota||'')+'" placeholder="nota" style="flex:1"><span class="acts"><button class="cob-mv" data-colamove="'+i+'|-1">▲</button><button class="cob-mv" data-colamove="'+i+'|1">▼</button><button class="cob-mv del" data-coladel="'+_radEsc(t)+'">✕</button></span></div></div>';
  }).join('');
  return desk+'<div class="cob-mob">'+cards+'</div>';
}
function _cobBind(sec){
  if(renderCobertura._bound)return; renderCobertura._bound=true;
  sec.addEventListener('click',function(e){
    if(e.target.closest('.colaInp')||e.target.closest('.cob-mv')||e.target.closest('.calChk')||e.target.closest('select')||e.target.closest('input'))return;
    var h=e.target.closest('.cob-blk-h'); if(h){ var blk=h.parentElement; var k=blk.getAttribute('data-cblk'); window._cobOpen=window._cobOpen||{}; window._cobOpen[k]=!window._cobOpen[k]; blk.classList.toggle('open'); return; }
  });
}
/* ================= CALENDARIO UNIFICADO DE COBERTURA ================= */
function _cbHoy(){ return new Date().toISOString().slice(0,10); }
/* normaliza a "YYYY-MM-DD" acepte un Date (como devuelve _cadenciaDe) o una cadena */
function _cbToStr(d){ if(!d)return null; if(d instanceof Date){ return isNaN(d)?null:(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')); } var m=/^(\d{4}-\d{2}-\d{2})/.exec(''+d); return m?m[1]:null; }
function _cbDias(dateStr,hoy){ dateStr=_cbToStr(dateStr); if(!dateStr)return null; var d=new Date(dateStr+'T00:00:00'); if(isNaN(d))return null; return Math.round((d-hoy)/86400000); }
function _cbFechaTxt(dateStr){ dateStr=_cbToStr(dateStr); if(!dateStr)return '<span class="muted">—</span>'; var d=new Date(dateStr+'T00:00:00'); if(isNaN(d))return '<span class="muted">—</span>'; return _cadFmtD(d); }
function _cbDiasTxt(dias){ if(dias==null)return '<span class="muted">sin fecha</span>'; if(dias===0)return '<b style="color:#dc2626">hoy</b>'; if(dias<0)return '<span style="color:#dc2626;font-weight:600">vencida hace '+(-dias)+' d</span>'; if(dias<=14)return '<span style="color:#b45309;font-weight:600">en '+dias+' d</span>'; return 'en '+dias+' d'; }
/* diana de calibración "activa": la de mayor fecha ya alcanzada; si ninguna, la más próxima */
function _calibActivo(hitos,hoy){ if(!hitos||!hitos.length)return null; var withD=hitos.filter(function(h){return h.diana;}); if(!withD.length)return null; var reached=withD.filter(function(h){return new Date(h.diana+'T00:00:00')<=hoy;}); if(reached.length){ reached.sort(function(a,b){return a.diana<b.diana?1:-1;}); return reached[0]; } var up=withD.slice().sort(function(a,b){return a.diana<b.diana?-1:1;}); return up[0]; }
/* señal de precio activa de una empresa (stop/compra/PO), sin fecha */
function _senalActiva(t){ var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===(t||'').toUpperCase();}); if(!a)return null; var c=num(a.cotizacion),st=num(a.stopTesis),eH=num(a.entMax),pmax=num(a.poMax)||num(a.precioObjetivo); if(c&&st&&c<=st)return {tipo:'stop',lbl:'🚨 stop',col:'#dc2626',sev:0}; if(c>0&&eH>0&&c<=eH)return {tipo:'compra',lbl:'🟢 compra',col:'#16a34a',sev:1}; if(pmax>0&&c>=pmax)return {tipo:'po',lbl:'🎯 PO',col:'#b45309',sev:2}; return null; }
/* ¿La señal de precio ya está RESPONDIDA en la ficha? Mismo criterio que el Panel
   (04-plan `_silenciada`): mira los apuntes del protocolo (DB.protocolo[t]) de la señal
   equivalente (stop→S1, PO→S3). Silencia si hay apunte ABIERTO, o si la última revisión
   RESUELTA es de hace ≤ PROTO_SILENCIO_DIAS (60 d); pasado ese plazo, si el precio sigue
   en zona, la señal vuelve. La señal de compra no tiene apunte de protocolo → nunca se
   silencia por aquí (igual que en el Panel). Evita que Cobertura muestre una señal que el
   Panel ya oculta por estar contestada. */
function _cbSenalRespondida(t,tipo){
  var sig = tipo==='stop'?'S1':(tipo==='po'?'S3':null);
  if(!sig) return false;
  var arr=((DB.protocolo||{})[(t||'').toUpperCase()]||[]).filter(function(a){return a.sig===sig;});
  if(!arr.length) return false;
  if(arr.some(function(a){return a.estado==='abierta';})) return true;
  var PRECIO=(typeof PROTO_SIG_PRECIO!=='undefined')?PROTO_SIG_PRECIO:{S1:1,S3:1};
  if(!PRECIO[sig]) return true;
  var DIAS=(typeof PROTO_SILENCIO_DIAS!=='undefined')?PROTO_SILENCIO_DIAS:60;
  var ult=arr.map(function(a){return a.fecha;}).filter(Boolean).sort().slice(-1)[0];
  if(!ult) return true;
  return (Date.now()-new Date(ult+'T00:00:00').getTime())/86400000 <= DIAS;
}
function _pintarCalendario(analizadas){
  var host=document.getElementById('calHost'); if(!host)return;
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var cob=(DB.cobertura||{}); var infDone=cob.informe||{}, senDone=cob.senal||{};
  var items=[];
  (DB.cola||[]).forEach(function(c,i){ var t=(c.t||'').toUpperCase(); if(!t||_esAnalizada(t))return; var inf=_uniInfo(t);
    items.push({t:t,nombre:inf.nombre,tipo:'analisis',tipoLbl:'Analizar',date:null,dias:null,bucket:1,ordCola:i,estado:c.estado||'pendiente',done:(c.estado==='hecha')});
  });
  (analizadas||[]).forEach(function(a){ var t=(a.ticker||'').toUpperCase(); var inf=_uniInfo(t);
    var c=_cadenciaDe(t);
    if(c&&c.next){ var e=_cadEstado(c,hoy,a.dossierFecha); var dt=_cbToStr(c.next.date); var conf=!!c.next.manual;
      var dias=_cbDias(dt,hoy); var esAnual=!!e.tocaAnual; var bkt=(esAnual||(dias!=null&&dias<=0))?0:2; var doneRep=!!((infDone[t]||{})[dt]);
      items.push({t:t,nombre:inf.nombre,tipo:'informe',tipoLbl:(esAnual?'Revisión anual':'Informe '+(_QLABEL[c.next.q]||c.next.q)),date:dt,dias:dias,bucket:bkt,done:doneRep,chkType:'informe',chkKey:dt,conf:conf}); }
    /* Informe recién publicado: se mantiene visible 10 días como confirmación de que está hecho,
       luego desaparece solo. */
    if(c&&c.ultimoFecha){ var _ud=_cbDias(c.ultimoFecha,hoy); if(_ud!=null&&_ud<=0&&_ud>=-10){
      items.push({t:t,nombre:inf.nombre,tipo:'informe',tipoLbl:'Informe '+(_QLABEL[c.uq]||c.uq),date:c.ultimoFecha,dias:_ud,bucket:2,done:true,chkType:'informe',chkKey:_cbToStr(c.ultimoFecha),conf:!!c.ultimoManual,recien:true}); } }
    var d=(typeof calibDataFor==='function')?calibDataFor(t):null;
    if(d){ var act=_calibActivo(d.hitos,hoy); if(act){ var dc=(act.dias==null?9999:act.dias); items.push({t:t,nombre:inf.nombre,tipo:'calib',tipoLbl:'Calibración '+act.k,date:act.diana,dias:act.dias,bucket:(dc<=0?0:2),done:!!act.done,chkType:'calib',chkKey:act.k}); } }
    var sen=_senalActiva(t); if(sen && !_cbSenalRespondida(t,sen.tipo)){ items.push({t:t,nombre:inf.nombre,tipo:'senal',tipoLbl:'Señal '+sen.lbl,date:null,dias:null,bucket:0,done:!!((senDone[t]||{})[sen.tipo]),chkType:'senal',chkKey:sen.tipo,sev:sen.sev,col:sen.col}); }
  });
  items.sort(function(a,b){ if(a.bucket!==b.bucket)return a.bucket-b.bucket; if(a.bucket===1)return a.ordCola-b.ordCola; var ad=(a.dias==null),bd=(b.dias==null); if(ad&&bd)return (a.sev==null?9:a.sev)-(b.sev==null?9:b.sev); if(ad)return 1; if(bd)return -1; return a.dias-b.dias; });
  var acc=document.getElementById('cobAccion'); if(acc)acc.textContent=items.filter(function(x){return x.bucket===0;}).length;
  if(!items.length){ host.innerHTML='<div class="muted" style="font-size:12px;padding:8px 0">No hay empresas en cola ni intervenciones programadas. Marca candidatas con ★ en Radar Op. y añádelas a la cola.</div>'; return; }
  var estOpts=function(sel){ return ['pendiente','en curso','hecha'].map(function(x){return '<option'+(x===sel?' selected':'')+'>'+x+'</option>';}).join(''); };
  var tipoCol=function(it){ return it.tipo==='analisis'?'#1f3d6b':(it.tipo==='informe'?'#2563eb':(it.tipo==='calib'?'#0f766e':(it.col||'#b45309'))); };
  var diasTxt=function(it){ if(it.recien)return '<span style="color:#16a34a;font-weight:600">✓ hecho'+(it.dias<0?(' hace '+(-it.dias)+' d'):(it.dias===0?' hoy':''))+'</span>'; if(it.tipo==='senal')return '<span style="font-weight:600;color:'+(it.col||'#b45309')+'">acción ahora</span>'; if(it.dias==null)return '<span class="muted">sin fecha</span>'; if(it.dias===0)return '<b style="color:#dc2626">hoy</b>'; if(it.dias<0)return '<span style="color:#dc2626;font-weight:600">vencida hace '+(-it.dias)+' d</span>'; if(it.dias<=14)return '<span style="color:#b45309;font-weight:600">en '+it.dias+' d</span>'; return 'en '+it.dias+' d'; };
  var estadoCell=function(it){
    if(it.tipo==='analisis') return '<select class="colaInp" data-ct="'+_radEsc(it.t)+'" data-cf="estado">'+estOpts(it.estado)+'</select>';
    if(it.tipo==='senal') return '<span style="font-weight:600;color:'+(it.col||'#b45309')+'">acción ahora</span>';
    if(it.done) return '<span style="color:#16a34a;font-weight:600">hecha</span>';
    if(it.dias!=null&&it.dias<0) return '<span style="color:#dc2626;font-weight:600">vencida</span>';
    if(it.dias!=null&&it.dias<=14) return '<span style="color:#b45309;font-weight:600">vence pronto</span>';
    return '<span class="muted">programada</span>';
  };
  var chkFor=function(it){ if(it.tipo==='senal')return ''; return (it.tipo==='analisis')
    ? '<input type="checkbox" class="calChk" data-caltype="analisis" data-ct="'+_radEsc(it.t)+'"'+(it.done?' checked':'')+' title="Marcar analizada">'
    : '<input type="checkbox" class="calChk" data-caltype="'+it.chkType+'" data-ct="'+_radEsc(it.t)+'" data-ck="'+_radEsc(it.chkKey)+'"'+(it.done?' checked':'')+' title="Marcar realizada">'; };
  var rowCls=function(it){ return it.done?'done':(it.tipo==='senal'?'sen':(it.bucket===0?'urgent':'')); };
  var BANDS=[[0,'Ahora · requieren acción','b0'],[1,'Pendientes de analizar','b1'],[2,'Programadas','b2']];
  var idx=0, rows='';
  BANDS.forEach(function(bd){ var its=items.filter(function(x){return x.bucket===bd[0];}); if(!its.length)return;
    rows+='<tr class="cob-band '+bd[2]+'"><td colspan="7">'+bd[1]+' · '+its.length+'</td></tr>';
    its.forEach(function(it){ idx++;
      rows+='<tr class="'+rowCls(it)+'"><td class="num" style="color:#94a3b8">'+idx+'</td>'+
        '<td><b class="cob-tk">'+_radEsc(it.t)+'</b> <span style="font-size:11px;color:#94a3b8">'+_radEsc((it.nombre||'').slice(0,20))+'</span></td>'+
        '<td><span style="font-size:11px;font-weight:700;color:'+tipoCol(it)+'">'+_radEsc(it.tipoLbl)+'</span></td>'+
        '<td style="font-size:12px">'+_cbFechaTxt(it.date)+(it.conf?' <span title="Fecha confirmada" style="background:#dcfce7;color:#166534;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700">conf.</span>':'')+'</td>'+
        '<td style="font-size:12px">'+diasTxt(it)+'</td>'+
        '<td>'+estadoCell(it)+'</td>'+
        '<td style="text-align:center">'+chkFor(it)+'</td></tr>';
    });
  });
  var desk='<div class="cob-desk"><table><thead><tr><th class="num">#</th><th>Empresa</th><th>Tipo</th><th>Fecha</th><th>Días</th><th>Estado</th><th style="text-align:center">✓</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  var mob='';
  BANDS.forEach(function(bd){ var its=items.filter(function(x){return x.bucket===bd[0];}); if(!its.length)return;
    mob+='<div class="cob-mband '+bd[2]+'">'+bd[1]+' · '+its.length+'</div>';
    its.forEach(function(it){
      var right=it.tipo==='analisis'?('<select class="colaInp" data-ct="'+_radEsc(it.t)+'" data-cf="estado">'+estOpts(it.estado)+'</select>'):('<div style="font-weight:600">'+diasTxt(it)+'</div>'+(it.date?'<div class="muted" style="font-size:11px">'+_cbFechaTxt(it.date)+'</div>':''));
      mob+='<div class="cob-card cal '+rowCls(it)+'">'+chkFor(it)+
        '<div class="cmid"><div class="ct"><b class="cob-tk">'+_radEsc(it.t)+'</b> <span style="font-weight:400;font-size:12px;color:#94a3b8">'+_radEsc((it.nombre||'').slice(0,16))+'</span></div>'+
        '<div class="cs"><span style="font-size:11px;font-weight:700;color:'+tipoCol(it)+'">'+_radEsc(it.tipoLbl)+'</span></div></div>'+
        '<div class="cr">'+right+'</div></div>';
    });
  });
  host.innerHTML=desk+'<div class="cob-mob">'+mob+'</div>';
}
/* listener del check ✓ del calendario */
document.addEventListener('change',function(e){ var c=e.target; if(!c.classList||!c.classList.contains('calChk'))return;
  var tp=c.getAttribute('data-caltype'), t=(c.getAttribute('data-ct')||'').toUpperCase(), k=c.getAttribute('data-ck')||''; var on=c.checked;
  DB.cobertura=DB.cobertura||{};
  if(tp==='calib'){ if(typeof _calibToggleDone==='function'){ _calibToggleDone(t,k,on); } else { DB.calibracion=DB.calibracion||{}; DB.calibracion[t]=DB.calibracion[t]||{}; var prev=DB.calibracion[t][k]||{}; DB.calibracion[t][k]=Object.assign({},prev,{done:on,fecha:on?(typeof _calibHoy==='function'?_calibHoy():_cbHoy()):(prev.fecha||'')}); } }
  else if(tp==='informe'){ DB.cobertura.informe=DB.cobertura.informe||{}; DB.cobertura.informe[t]=DB.cobertura.informe[t]||{}; if(on)DB.cobertura.informe[t][k]={done:true,fecha:_cbHoy()}; else delete DB.cobertura.informe[t][k]; }
  else if(tp==='senal'){ DB.cobertura.senal=DB.cobertura.senal||{}; DB.cobertura.senal[t]=DB.cobertura.senal[t]||{}; if(on)DB.cobertura.senal[t][k]={done:true,fecha:_cbHoy()}; else delete DB.cobertura.senal[t][k]; }
  else if(tp==='analisis'){ var it=(DB.cola||[]).find(function(x){return (x.t||'').toUpperCase()===t;}); if(it)it.estado=on?'hecha':'pendiente'; }
  if(typeof scheduleSave==='function')scheduleSave(); if(typeof renderCobertura==='function')renderCobertura();
});

/* ---- Cadencia (último/próximo informe desde el monitor -trim.json) ---- */
var _MESES_R=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var _cadTrim={};
function _cadFmtD(d){ return d.getDate()+'-'+_MESES_R[d.getMonth()]; }
function _qtoken(periodo){ var p=(''+periodo).toUpperCase();
  /* normaliza cualquier convención (Q1-Q4 ó semestral S1/9M/FY que usa Inditex) al token canónico Q1/Q2/Q3/Q4 */
  if(/Q4|FY|12M|ANUAL/.test(p))return 'Q4';
  if(/Q3|9M/.test(p))return 'Q3';
  if(/Q2|S1|H1|1S|1H|6M|SEM/.test(p))return 'Q2';
  if(/Q1|3M|1T/.test(p))return 'Q1';
  return null; }
function _cadCargar(tickers){ var need=tickers.filter(function(t){return _cadTrim[t]===undefined;}); if(!need.length)return Promise.resolve(); return Promise.all(need.map(function(t){ return fetch('dossiers/trimestral/'+t+'-trim.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_cadTrim[t]=j;}).catch(function(){_cadTrim[t]=null;}); })); }
/* ---- Agenda confirmada (buzon/agenda.json): fecha REAL del próximo informe ----
   La deja agenda.py cada lunes (Yahoo). Si hay fecha confirmada para un ticker,
   manda sobre la ESTIMACIÓN de _cadenciaDe en el calendario, la cadencia y el Panel. */
var _agConf=null, _agLoading=null, _agRefrescado=false;
function _agCargar(){ if(_agConf)return Promise.resolve(_agConf); if(_agLoading)return _agLoading;
  _agLoading=fetch('buzon/agenda.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;})
    .then(function(j){ _agConf={byT:{}}; if(j&&j.resultados)j.resultados.forEach(function(x){ if(x&&x.ticker)_agConf.byT[(x.ticker||'').toUpperCase()]={fecha:x.fecha,confirmada:!!x.confirmada}; }); return _agConf; })
    .catch(function(){ _agConf={byT:{}}; return _agConf; });
  return _agLoading; }
function _agResultado(t){ if(!_agConf)return null; return _agConf.byT[(t||'').toUpperCase()]||null; }
function _cadenciaDe(t){
  var d=_cadTrim[(t||'').toUpperCase()]; if(!d||!d.revisiones||!d.revisiones.length)return null;
  var revs=d.revisiones.filter(function(r){return r.fecha;}).slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
  if(!revs.length)return null;
  var ultimo=revs[revs.length-1];
  var mdByQ={}; revs.forEach(function(r){ var q=_qtoken(r.periodo); if(q&&r.fecha)mdByQ[q]=r.fecha.slice(5); });
  /* Confirmación MANUAL (Cobertura → DB.cadManual[T][Q]="MM-DD"): sustituye el día-mes que la
     empresa trae por histórico para ESE trimestre, en el año en curso y en los siguientes, hasta
     que el usuario confirme otra fecha. Es la fuente única de fechas confirmadas (fuera Yahoo). */
  var cm=(typeof DB!=='undefined'&&DB.cadManual)?(DB.cadManual[(t||'').toUpperCase()]||{}):{};
  ['Q1','Q2','Q3','Q4'].forEach(function(q){ if(cm[q])mdByQ[q]=cm[q]; });
  /* La confirmación manual también corrige la fecha del ÚLTIMO informe mostrado (mismo trimestre)
     y con ella la fecha de partida de la proyección. */
  var uq=_qtoken(ultimo.periodo);
  var ultFecha=(cm[uq]&&ultimo.fecha)?(ultimo.fecha.slice(0,4)+'-'+cm[uq]):(ultimo.fecha||'');
  var uDate=new Date(ultFecha+'T00:00:00'); var next=null;
  Object.keys(mdByQ).forEach(function(q){ var md=mdByQ[q]; for(var y=uDate.getFullYear(); y<=uDate.getFullYear()+1; y++){ var cand=new Date(y+'-'+md+'T00:00:00'); if(cand>uDate){ if(!next||cand<next.date){ next={date:cand,q:q}; } break; } } });
  if(next)next.manual=!!cm[next.q];
  return {ultimo:ultimo, ultimoFecha:ultFecha, ultimoManual:!!cm[uq], next:next, uq:uq};
}
var _QLABEL={Q1:'Q1',Q2:'H1',Q3:'9M',Q4:'FY'};
function _cadEstado(c,hoy,dossierFecha){
  var tocaMonitor=!!(c.next && c.next.date<=hoy); var tocaAnual=false;
  if(c.uq==='Q4'){ var fy=new Date((c.ultimo.fecha||'')+'T00:00:00'); var dias=(hoy-fy)/86400000; var dy=(''+(dossierFecha||'')).slice(0,4); var fyY=(''+(c.ultimo.fecha||'')).slice(0,4); if(dias>=0&&dias<160&&dy&&fyY&&fyY>dy)tocaAnual=true; }
  var proxLabel=c.next?((_QLABEL[c.next.q]||c.next.q)+' ~'+_cadFmtD(c.next.date)):'';
  /* Clave canónica (fiscal AAAA-Qn) del PRÓXIMO informe = el siguiente al último revisado.
     La usan el Monitor, el Panel y la vista Informes para marcar "publicado sin revisar"
     desde la cadencia de los -trim.json (en vez del calendario manual/qPassed). */
  var nextKey=''; try{ if(c.ultimo && typeof _trimCanon==='function'){ var uc=_trimCanon(c.ultimo.periodo); var mm=/^(\d{4})-Q([1-4])$/.exec(uc); if(mm){ var yy=+mm[1], qq=+mm[2]+1; if(qq>4){qq=1;yy++;} nextKey=yy+'-Q'+qq; } } }catch(e){}
  var nextDate=(c.next&&typeof _cbToStr==='function')?_cbToStr(c.next.date):null;
  return {tocaMonitor:tocaMonitor,tocaAnual:tocaAnual,proxLabel:proxLabel,nextKey:nextKey,nextDate:nextDate};
}
function _calibCell(t){ if(typeof calibDataFor!=='function')return '—'; var d=calibDataFor(t); if(!d)return '—'; var pend=d.hitos.filter(function(h){return !h.done;}); if(!pend.length)return '<span style="color:#16a34a">✓ completa</span>'; var nx=pend[0]; if(nx.vencida)return '<span style="color:#b45309;font-weight:600">⏳ '+nx.k+' vencida</span>'; return nx.k+(nx.dias!=null?' (en '+nx.dias+'d)':''); }
function _senalCell(t){ var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); if(!a)return '—'; var c=num(a.cotizacion),st=num(a.stopTesis),eH=num(a.entMax),pmax=num(a.poMax)||num(a.precioObjetivo); if(c&&st&&c<=st)return '<span style="color:#dc2626;font-weight:700">🚨 stop</span>'; if(c>0&&eH>0&&c<=eH&&!(st&&c<=st))return '<span style="color:#16a34a;font-weight:600">🟢 compra</span>'; if(pmax>0&&c>=pmax)return '<span style="color:#b45309;font-weight:600">🎯 PO</span>'; return '<span class="muted">—</span>'; }
function _pintarCadencia(analizadas){
  var host=document.getElementById('cadHost'); if(!host)return;
  var hoy=new Date(); hoy.setHours(0,0,0,0); DB.cadencia=DB.cadencia||{}; var chg=false;
  var data=analizadas.map(function(a){ var t=(a.ticker||'').toUpperCase(); var c=_cadenciaDe(t); var cal=_calibCell(t), sen=_senalCell(t); var inf=_uniInfo(t);
    if(!c){ return {t:t,nombre:inf.nombre,ult:'<span class="muted" style="font-size:11px">sin monitor trimestral</span>',prox:'—',aviso:'',avisoCol:'#94a3b8',cal:cal,sen:sen}; }
    var e=_cadEstado(c,hoy,a.dossierFecha); DB.cadencia[t]={proxLabel:e.proxLabel,tocaMonitor:e.tocaMonitor,tocaAnual:e.tocaAnual,nextKey:e.nextKey,nextDate:e.nextDate,manual:!!(c.next&&c.next.manual)}; chg=true;
    var _uq=c.uq||_qtoken(c.ultimo.periodo); var _uf=c.ultimoFecha||c.ultimo.fecha||''; var _uM=!!c.ultimoManual;
    var ultTxt='<span style="white-space:nowrap"><b>'+_radEsc(c.ultimo.periodo||'')+'</b> '
      +'<input type="date" class="cadProx" data-ct="'+_radEsc(t)+'" data-q="'+_radEsc(_uq)+'" value="'+_uf+'" title="Fecha real de publicación de este informe; corrige el histórico y ajusta la proyección futura de ese trimestre" style="font-size:11px;border:1px solid #cbd5e1;border-radius:6px;padding:1px 4px;'+(_uM?'background:#f0fdf4;border-color:#86efac;':'')+'">'
      +(_uM?' <button type="button" data-cadclr="'+_radEsc(t)+'|'+_radEsc(_uq)+'" title="Quitar tu corrección y volver a la fecha del informe" style="border:0;background:none;color:#94a3b8;cursor:pointer;font-size:13px;line-height:1;padding:0 2px">×</button>':'')
      +'</span>';
    var proxTxt='—';
    if(c.next){ var _nd=e.nextDate||''; var _isM=!!c.next.manual; var _q=c.next.q;
      proxTxt='<span style="white-space:nowrap"><b>'+_radEsc(_QLABEL[_q]||_q)+'</b> '
        +'<input type="date" class="cadProx" data-ct="'+_radEsc(t)+'" data-q="'+_radEsc(_q)+'" value="'+_nd+'" title="Confirma la fecha de este informe; sustituye la previsión y fija el mismo día-mes los años siguientes" style="font-size:11px;border:1px solid #cbd5e1;border-radius:6px;padding:1px 4px;'+(_isM?'background:#f0fdf4;border-color:#86efac;':'')+'">'
        +(_isM?' <span title="Confirmada por ti en Cobertura" style="background:#dcfce7;color:#166534;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700">conf.</span> <button type="button" data-cadclr="'+_radEsc(t)+'|'+_radEsc(_q)+'" title="Quitar tu confirmación y volver a la estimación" style="border:0;background:none;color:#94a3b8;cursor:pointer;font-size:13px;line-height:1;padding:0 2px">×</button>':'')
        +'</span>';
    }
    var aviso,avisoCol; if(e.tocaAnual){ aviso='📅 revisión anual'; avisoCol='#dc2626'; } else if(e.tocaMonitor){ aviso='⏳ toca monitor'; avisoCol='#b45309'; } else { aviso='al día'; avisoCol='#94a3b8'; }
    return {t:t,nombre:inf.nombre,ult:ultTxt,prox:proxTxt,aviso:aviso,avisoCol:avisoCol,cal:cal,sen:sen};
  });
  if(chg&&typeof scheduleSave==='function')scheduleSave();
  var rows=data.map(function(r){ return '<tr><td><b class="cob-tk">'+_radEsc(r.t)+'</b></td><td style="font-size:12px">'+r.ult+'</td><td style="font-size:12px">'+r.prox+'</td><td style="font-size:12px;color:'+r.avisoCol+';font-weight:600">'+_radEsc(r.aviso)+'</td><td style="font-size:12px">'+r.cal+'</td><td style="font-size:12px">'+r.sen+'</td></tr>'; }).join('');
  var desk='<div class="cob-desk"><table><thead><tr><th>Empresa</th><th>Último informe</th><th>Próximo</th><th>Estado</th><th>Calibración</th><th>Señal precio</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  var cards=data.map(function(r){ return '<div class="cob-card cad"><div class="top"><b class="cob-tk">'+_radEsc(r.t)+' <span style="font-weight:400;font-size:12px;color:#94a3b8">'+_radEsc((r.nombre||'').slice(0,16))+'</span></b><span style="color:'+r.avisoCol+';font-weight:600;font-size:12px">'+_radEsc(r.aviso)+'</span></div>'+
    '<div class="cgrid"><div><span class="k">Último</span>'+r.ult+'</div><div><span class="k">Próximo</span>'+r.prox+'</div><div><span class="k">Calibración</span>'+r.cal+'</div><div><span class="k">Señal precio</span>'+r.sen+'</div></div></div>'; }).join('');
  host.innerHTML=desk+'<div class="cob-mob">'+cards+'</div>'
    +'<div class="muted" style="font-size:11px;margin-top:8px">Agenda por empresa: trimestral (próximo informe estimado), calibración (próxima diana 6/12/36 m) y señal de precio activa (stop / compra / PO). Las urgentes también salen en el Panel.</div>';
}
var _cadRefrescado=false;
function _cadRefreshAll(){
  var an=(DB.analisis||[]).filter(function(a){return a.dossierFecha;}); var tk=an.map(function(a){return (a.ticker||'').toUpperCase();}); if(!tk.length)return;
  _cadCargar(tk).then(function(){ var hoy=new Date(); hoy.setHours(0,0,0,0); DB.cadencia=DB.cadencia||{};
    an.forEach(function(a){ var t=(a.ticker||'').toUpperCase(); var c=_cadenciaDe(t); if(!c){ delete DB.cadencia[t]; return; } var e=_cadEstado(c,hoy,a.dossierFecha); DB.cadencia[t]={proxLabel:e.proxLabel,tocaMonitor:e.tocaMonitor,tocaAnual:e.tocaAnual,nextKey:e.nextKey,nextDate:e.nextDate,manual:!!(c.next&&c.next.manual)}; });
    if(typeof scheduleSave==='function')scheduleSave(); if(typeof renderPanelDash==='function')renderPanelDash();
  });
}
function cadAvisos(){
  var out=[]; var cad=DB.cadencia||{}; var held=(typeof _heldSet!=='undefined'&&_heldSet&&_heldSet.has)?_heldSet:null;
  Object.keys(cad).forEach(function(t){ if(held&&held.has(t))return; var c=cad[t]; if(c&&c.tocaMonitor) out.push({pri:2,cls:'a',goto:'cobertura',sig:'S5',tick:t,txt:'📊 <b>'+t+'</b> — toca monitor'+(c.proxLabel?' ('+c.proxLabel+')':'')}); });
  // Próximos resultados CONFIRMADOS POR TI (Cobertura), en ≤10 días (sustituye a Yahoo)
  var hoyA=new Date(); hoyA.setHours(0,0,0,0);
  Object.keys(cad).forEach(function(t){ if(held&&held.has(t))return; var c=cad[t]; if(!c||!c.manual||!c.nextDate||c.tocaMonitor)return;
    var ds=(typeof _cbToStr==='function')?_cbToStr(c.nextDate):c.nextDate; if(!ds)return;
    var d=new Date(ds+'T00:00:00'); if(isNaN(d))return; var dias=Math.round((d-hoyA)/86400000);
    if(dias>=0&&dias<=10) out.push({pri:dias<=3?2:3,cls:'a',goto:'cobertura',tick:t,txt:'📊 <b>'+t+'</b> — resultados '+_cadFmtD(d)+' <span class="muted">(confirmado)</span>'+(dias===0?' · hoy':' · en '+dias+' d')});
  });
  if(!_cadRefrescado){ _cadRefrescado=true; try{ _cadRefreshAll(); }catch(e){} }
  return out;
}

/* ---- Confirmación MANUAL de fecha de resultados (Cobertura → DB.cadManual) ----
   Editar la fecha del "Próximo" la confirma: guarda el día-mes de ese trimestre, que sustituye
   la estimación por histórico y rige también los años siguientes. El "×" revierte. Refresca
   cadencia + Calendario de Retorno + Panel. */
function _cadRefreshCalc(){ var hoy=new Date(); hoy.setHours(0,0,0,0); DB.cadencia=DB.cadencia||{};
  (DB.analisis||[]).filter(function(a){return a.dossierFecha;}).forEach(function(a){ var t=(a.ticker||'').toUpperCase(); var c=_cadenciaDe(t); if(!c){ delete DB.cadencia[t]; return; } var e=_cadEstado(c,hoy,a.dossierFecha); DB.cadencia[t]={proxLabel:e.proxLabel,tocaMonitor:e.tocaMonitor,tocaAnual:e.tocaAnual,nextKey:e.nextKey,nextDate:e.nextDate,manual:!!(c.next&&c.next.manual)}; });
}
function _cadManualApply(){ if(typeof scheduleSave==='function')scheduleSave(); try{ _cadRefreshCalc(); }catch(e){}
  if(typeof renderCobertura==='function')renderCobertura();
  if(typeof renderCalendario==='function')renderCalendario();
  if(typeof renderPanelDash==='function')renderPanelDash();
  if(typeof renderMonitor==='function')renderMonitor();
}
document.addEventListener('change',function(e){ var el=e.target; if(!el.classList||!el.classList.contains('cadProx'))return;
  var t=(el.getAttribute('data-ct')||'').toUpperCase(), q=el.getAttribute('data-q'), v=el.value||'';
  if(!t||!q)return; DB.cadManual=DB.cadManual||{}; DB.cadManual[t]=DB.cadManual[t]||{};
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)){ DB.cadManual[t][q]=v.slice(5); } else { delete DB.cadManual[t][q]; if(!Object.keys(DB.cadManual[t]).length)delete DB.cadManual[t]; }
  _cadManualApply();
});
document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-cadclr]'); if(!b)return;
  var a=(b.getAttribute('data-cadclr')||'').split('|'); var t=(a[0]||'').toUpperCase(), q=a[1];
  if(DB.cadManual&&DB.cadManual[t]){ delete DB.cadManual[t][q]; if(!Object.keys(DB.cadManual[t]).length)delete DB.cadManual[t]; }
  _cadManualApply();
});

/* listeners de la cola (reañadidos: se perdieron al reescribir la cadencia) */
document.addEventListener('change',function(e){ var t=e.target; if(!t.classList||!t.classList.contains('colaInp'))return; var tk=(t.getAttribute('data-ct')||'').toUpperCase(), f=t.getAttribute('data-cf'); var c=(DB.cola||[]).find(function(x){return (x.t||'').toUpperCase()===tk;}); if(c){ c[f]=t.value; if(typeof scheduleSave==='function')scheduleSave(); } });
document.addEventListener('click',function(e){ var mv=e.target.closest&&e.target.closest('[data-colamove]'); if(mv){ var a=(mv.getAttribute('data-colamove')||'').split('|'); var i=+a[0], d=+a[1]; var arr=DB.cola||[]; var j=i+d; if(j>=0&&j<arr.length){ var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp; if(typeof scheduleSave==='function')scheduleSave(); renderCobertura(); } return; } var dl=e.target.closest&&e.target.closest('[data-coladel]'); if(dl){ var t=(dl.getAttribute('data-coladel')||'').toUpperCase(); DB.cola=(DB.cola||[]).filter(function(x){return (x.t||'').toUpperCase()!==t;}); if(typeof scheduleSave==='function')scheduleSave(); renderCobertura(); } });

/* ---- estilos de los filtros multi-color del Radar Op (inyectados una vez) ---- */
(function _radFltCSS(){ if(typeof document==='undefined'||document.getElementById('rad-flt-css'))return;
  var st=document.createElement('style'); st.id='rad-flt-css';
  st.textContent=[
    '.rad-fltset{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.rad-fltl{font-size:10px;color:#64748b;font-weight:600;margin-right:2px}',
    '.rad-flt{font-size:10.5px;font-weight:700;border-radius:20px;padding:3px 8px;cursor:pointer;border:1.5px solid transparent}',
    '.rad-flt.f-held{background:#f0fdf4;color:#166534;border-color:#bbf7d0}.rad-flt.f-held.on{background:#dcfce7;border-color:#16a34a}',
    '.rad-flt.f-ana{background:#fefce8;color:#854d0e;border-color:#fde68a}.rad-flt.f-ana.on{background:#fef9c3;border-color:#eab308}',
    '.rad-flt.f-sel{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}.rad-flt.f-sel.on{background:#dbeafe;border-color:#2563eb}',
    '.rad-flt.f-pend{background:#f8fafc;color:#475569;border-color:#e2e8f0}.rad-flt.f-pend.on{background:#e2e8f0;border-color:#64748b}'
  ].join('\n'); document.head.appendChild(st);
})();
