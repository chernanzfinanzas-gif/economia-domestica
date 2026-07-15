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
function radScore(f,rating){
  var rpd=f.rpd, payout=f.payout, flags=f.flags||[]; var sd, nota='';
  if(!rpd){ sd=0; nota='sin dividendo'; }
  else { sd=_rclamp(rpd/RAD_RPDTOP*100); if(payout&&payout>RAD_PAYALTO){ sd*=0.7; nota='payout alto'; } if(flags.some(function(x){return /irregular/i.test(x);})){ sd*=0.6; nota=(nota?nota+' · ':'')+'div irregular'; } }
  var sroe=(f.roe!=null)?_rclamp(f.roe/RAD_ROETOP*100):50;
  var sdn=(f.dnEbitda==null)?100:_rclamp(100-Math.max(0,f.dnEbitda-2)*25);
  var rs=radRatingScore(rating); var srt=(rs!=null)?rs:60;
  var sc=0.5*sroe+0.3*sdn+0.2*srt;
  var sper=(f.per&&f.per>0)?_rclamp(100-Math.max(0,f.per-8)*5):50;
  var spbv=f.pbv?_rclamp(100-Math.max(0,f.pbv-1)*35):50;
  var spos=(f.pos52sem!=null)?_rclamp(100-f.pos52sem):50;
  var sv=(sper+spbv+spos)/3;
  var atr=Math.round((RAD_W.div*sd+RAD_W.cal*sc+RAD_W.val*sv)*10)/10;
  var trampa=!!(rpd&&rpd>7&&((payout&&payout>90)||(f.crecBpa!=null&&f.crecBpa<0)||flags.some(function(x){return /irregular/i.test(x);})));
  return {atr:atr, nota:nota, trampa:trampa};
}

/* ================= PESTAÑA UNIVERSO ================= */
function renderUniverso(){
  var sec=document.getElementById('view-universo'); if(!sec)return;
  DB.universo=DB.universo||{};
  var ks=Object.keys(DB.universo).sort();
  var arqOpts=function(sel){ return RAD_ARQ.map(function(a){ return '<option'+(a===sel?' selected':'')+'>'+a+'</option>'; }).join(''); };
  var celdaEdit=function(t,u,key,w){
    if(key==='arquetipo') return '<td><select class="uInp" data-ut="'+_radEsc(t)+'" data-uf="arquetipo">'+arqOpts(u.arquetipo||'Sin clasificar')+'</select></td>';
    return '<td><input class="uInp" data-ut="'+_radEsc(t)+'" data-uf="'+key+'" value="'+_radEsc(u[key]||'')+'" style="width:'+w+'px"></td>';
  };
  var _uHeld=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  var rows=ks.map(function(t){ var u=DB.universo[t]||{};
    var _bg=(typeof statusRowBg==='function')?statusRowBg(t,_uHeld):'';
    return '<tr data-fs="'+_radEsc((t+' '+(u.nombre||'')).toLowerCase())+'"'+(_bg?' style="background:'+_bg+'"':'')+'><td><b data-ficha="'+_radEsc(t)+'" style="cursor:pointer;color:var(--brand)">'+_radEsc(t)+'</b></td>'
      + UNI_FIELDS.map(function(f){ return celdaEdit(t,u,f[0],f[2]||120); }).join('')
      + '<td class="right"><button class="btn ghost sm" data-udel="'+_radEsc(t)+'" title="Quitar">✕</button></td></tr>';
  }).join('');
  sec.innerHTML='<h2>Universo — clasificación (Matriz)</h2>'
    +'<div class="sub" style="margin-bottom:8px">La base de datos de la Matriz, <b>editable</b>. El Radar la usa para el arquetipo y el rating. Impórtala una vez desde <code>matriz.json</code> (lo genera el <code>.bat</code> «Exportar matriz.json») y edítala aquí cuando cambie algo.</div>'
    +'<div class="toolbar" style="margin-bottom:8px"><button class="btn" id="uImport">Importar matriz.json</button><button class="btn sm" id="uAdd">+ Empresa</button><input type="file" id="uFile" accept="application/json,.json" style="display:none"><input type="search" id="uSearch" placeholder="Buscar nombre o ticker…" style="padding:5px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px;min-width:200px"><span class="muted" id="uStatus"></span></div>'
    +'<div style="overflow:auto"><table><thead><tr><th>Ticker</th>'+UNI_FIELDS.map(function(f){return '<th>'+f[1]+'</th>';}).join('')+'<th></th></tr></thead><tbody>'
    +(rows||'<tr><td colspan="'+(UNI_FIELDS.length+2)+'" class="muted" style="padding:10px">Universo vacío. Pulsa «Importar matriz.json».</td></tr>')
    +'</tbody></table></div>';
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  var st=document.getElementById('uStatus'); if(st)st.textContent=ks.length+' empresas';
  _wireBuscador(document.getElementById('uSearch'), sec.querySelectorAll('tbody tr[data-fs]'), _uniBusca);
  var imp=document.getElementById('uImport'), file=document.getElementById('uFile');
  if(imp&&file){ imp.addEventListener('click',function(){ file.click(); }); file.addEventListener('change',function(e){ var f=e.target.files&&e.target.files[0]; if(!f)return; var rd=new FileReader(); rd.onload=function(){ try{ importUniverso(JSON.parse(rd.result)); }catch(err){ alert('matriz.json no válido: '+err); } }; rd.readAsText(f); }); }
  var add=document.getElementById('uAdd');
  if(add)add.addEventListener('click',function(){ var t=(prompt('Ticker (p.ej. IBE):','')||'').trim().toUpperCase(); if(!t)return; if(!DB.universo[t]){ var _u={}; UNI_KEYS.forEach(function(k){_u[k]='';}); _u.arquetipo='Sin clasificar'; DB.universo[t]=_u; } if(typeof scheduleSave==='function')scheduleSave(); renderUniverso(); });
}
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
document.addEventListener('change',function(e){ var t=e.target; if(!t.classList||!t.classList.contains('uInp'))return; var tk=(t.getAttribute('data-ut')||''), f=t.getAttribute('data-uf'); if(!tk||!f)return; DB.universo=DB.universo||{}; DB.universo[tk]=DB.universo[tk]||{}; DB.universo[tk][f]=t.value; if(typeof scheduleSave==='function')scheduleSave(); });
document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-udel]'); if(!b)return; var t=b.getAttribute('data-udel'); if(DB.universo&&DB.universo[t]){ var item=DB.universo[t];
  if(typeof undoableDelete==='function'){ undoableDelete('universo','Empresa '+t+' del universo',{t:t,item:item},function(){ delete DB.universo[t]; },['renderUniverso']); }
  else { if(!confirm('¿Quitar '+t+' del universo?'))return; delete DB.universo[t]; if(typeof scheduleSave==='function')scheduleSave(); renderUniverso(); } } });

/* ================= PESTAÑA RADAR ================= */
var _radFundCache=null, _radSort={k:'atr',dir:-1}, _radArqFilter='';
function _radCargarFund(){ if(_radFundCache!==null)return Promise.resolve(_radFundCache); return fetch('fundamentales.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_radFundCache=j||{empresas:[]};return _radFundCache;}).catch(function(){_radFundCache={empresas:[]};return _radFundCache;}); }
function _rf(v,suf,nd){ if(v==null)return '—'; nd=(nd==null?1:nd); return (typeof v==='number'?v.toFixed(nd):v)+(suf||''); }
function renderRadar(){
  var sec=document.getElementById('view-radar'); if(!sec)return;
  DB.universo=DB.universo||{}; DB.radarSel=DB.radarSel||{};
  if(!Object.keys(DB.universo).length){ sec.innerHTML='<h2>Radar de oportunidades</h2><div class="empty">Primero importa la clasificación en la pestaña <b>Universo</b> (botón «Importar matriz.json»).</div>'; if(typeof renderInfoBoxes==='function')renderInfoBoxes(); return; }
  sec.innerHTML='<h2>Radar de oportunidades</h2><div class="muted" style="padding:10px">Cargando fundamentales del repo…</div>';
  _radCargarFund().then(function(fund){
    var fmap={}; (fund.empresas||[]).forEach(function(f){ fmap[(''+f.ticker).toUpperCase()]=f; });
    var cands=[];
    Object.keys(DB.universo).forEach(function(t){ var f=fmap[t]; if(!f)return; var u=DB.universo[t]; var sc=radScore(f,u.rating); cands.push({t:t,nombre:u.nombre||f.nombre||t,arq:u.arquetipo||'Sin clasificar',rating:u.rating||'',f:f,atr:sc.atr,nota:sc.nota,trampa:sc.trampa}); });
    if(!cands.length){ sec.innerHTML='<h2>Radar de oportunidades</h2><div class="empty">No hay cruce entre el universo y <code>fundamentales.json</code>. ¿Está subido <code>fundamentales.json</code> al repo y actualizado? (act. '+_radEsc((fund&&fund.actualizado)||'—')+')</div>'; if(typeof renderInfoBoxes==='function')renderInfoBoxes(); return; }
    var arqSet={}; cands.forEach(function(c){arqSet[c.arq]=1;}); var arqList=Object.keys(arqSet).sort();
    var view=cands.filter(function(c){ return !_radArqFilter||c.arq===_radArqFilter; });
    view.sort(function(a,b){ var k=_radSort.k,d=_radSort.dir,av,bv; if(k==='atr'){av=a.atr;bv=b.atr;} else { av=(a.f[k]==null?-1e9:a.f[k]); bv=(b.f[k]==null?-1e9:b.f[k]); } return (av-bv)*d; });
    var trampas=cands.filter(function(c){return c.trampa;}).length;
    var mejor=cands.slice().sort(function(a,b){return b.atr-a.atr;})[0];
    var card=function(l,v){ return '<div class="card"><div class="lbl">'+l+'</div><div class="val">'+v+'</div></div>'; };
    var kpis='<div class="cards">'+card('Universo con datos',String(cands.length))+card('Mejor atractivo',mejor?(mejor.atr.toFixed(1)+' · '+_radEsc(mejor.t)):'—')+card('Posibles trampas',String(trampas))+card('Actualizado',_radEsc((fund&&fund.actualizado)||'—'))+'</div>';
    var filtro='<div style="margin:10px 0"><label style="font-size:13px">Arquetipo: <select id="radArq"><option value="">todos</option>'+arqList.map(function(a){return '<option value="'+_radEsc(a)+'"'+(a===_radArqFilter?' selected':'')+'>'+_radEsc(a)+'</option>';}).join('')+'</select></label> <input type="search" id="radSearch" placeholder="Buscar nombre o ticker…" style="margin-left:12px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px"> <span class="muted" style="font-size:12px">· pulsa Atractivo o RPD para ordenar</span>'+'<button class="btn sm" id="radAddCola" style="margin-left:12px">➕ Añadir ★ a la cola</button></div>';
    var arr=function(k){ return _radSort.k===k?(_radSort.dir<0?' ▼':' ▲'):''; };
    var _rHeld=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
    var trs=view.map(function(c){ var f=c.f; var sel=!!DB.radarSel[c.t];
      var acol=c.atr>=70?'#16a34a':(c.atr>=55?'#2563eb':'#64748b');
      var nota=(c.nota+(c.trampa?(c.nota?', ':'')+'posible trampa':'')).trim();
      var _bg=(typeof statusRowBg==='function')?statusRowBg(c.t,_rHeld):'';
      var _st=_bg?' style="background:'+_bg+'"':(sel?' style="background:#dbeafe"':'');
      return '<tr data-fs="'+_radEsc((c.t+' '+(c.nombre||'')).toLowerCase())+'"'+_st+'>'
        +'<td style="text-align:center"><input type="checkbox" class="radCk" data-radck="'+_radEsc(c.t)+'"'+(sel?' checked':'')+' title="Marcar interesante" style="width:15px;height:15px;cursor:pointer"></td>'
        +'<td class="num" style="font-weight:800;color:'+acol+'">'+c.atr.toFixed(1)+(c.trampa?' ⚠️':'')+'</td>'
        +'<td><b data-ficha="'+_radEsc(c.t)+'" style="cursor:pointer;color:var(--brand)">'+_radEsc(c.t)+'</b> <span class="muted" style="font-size:11px">'+_radEsc((c.nombre||'').slice(0,20))+'</span></td>'
        +'<td style="font-size:11px">'+_radEsc(c.arq)+'</td>'
        +'<td class="num" style="font-weight:700;color:'+(f.rpd>=5?'#16a34a':(f.rpd>=3.5?'#2563eb':'#475569'))+'">'+_rf(f.rpd,'%',2)+'</td>'
        +'<td class="num">'+_rf(f.payout,'%',0)+'</td>'
        +'<td class="num">'+_rf(f.roe,'%',1)+'</td>'
        +'<td class="num">'+_rf(f.dnEbitda,'x',2)+'</td>'
        +'<td class="num">'+_rf(f.per,'',1)+'</td>'
        +'<td class="num">'+_rf(f.pbv,'',2)+'</td>'
        +'<td class="num">'+_rf(f.pos52sem,'%',0)+'</td>'
        +'<td style="text-align:center">'+_radEsc(c.rating||'—')+'</td>'
        +'<td style="font-size:11px;color:'+(c.trampa?'#b45309':'#64748b')+'">'+_radEsc(nota)+'</td>'
        +'</tr>';
    }).join('');
    var thead='<tr><th>★</th><th class="num" data-radsk="atr" style="cursor:pointer">Atractivo'+arr('atr')+'</th><th>Empresa</th><th>Arquetipo</th><th class="num" data-radsk="rpd" style="cursor:pointer">RPD'+arr('rpd')+'</th><th class="num">Payout</th><th class="num">ROE</th><th class="num">DN/EBITDA</th><th class="num">PER</th><th class="num">P/BV</th><th class="num">Pos.52s</th><th>Rating</th><th>Nota</th></tr>';
    var nota='<div class="muted" style="font-size:11px;margin-top:8px">Atractivo (0–100) = 35% Dividendo + 35% Calidad + 30% Valoración. ⚠️ posible trampa de dividendo (RPD alta con payout muy alto, BPA cayendo o dividendo irregular). Filtro grueso para decidir a quién analizar; no es recomendación de compra. Datos de <code>fundamentales.json</code>.</div>';
    sec.innerHTML='<h2>Radar de oportunidades</h2>'+kpis+filtro+'<div style="overflow:auto"><table><thead>'+thead+'</thead><tbody>'+trs+'</tbody></table></div>'+nota;
    if(typeof renderInfoBoxes==='function')renderInfoBoxes();
    _wireBuscador(document.getElementById('radSearch'), sec.querySelectorAll('tbody tr[data-fs]'), _radBusca);
    var fa=document.getElementById('radArq'); if(fa)fa.addEventListener('change',function(){ _radArqFilter=this.value; renderRadar(); });
    sec.querySelectorAll('th[data-radsk]').forEach(function(th){ th.addEventListener('click',function(){ var k=th.getAttribute('data-radsk'); if(_radSort.k===k)_radSort.dir=-_radSort.dir; else {_radSort.k=k;_radSort.dir=-1;} renderRadar(); }); });
    var ac=document.getElementById('radAddCola'); if(ac)ac.addEventListener('click',function(){ var selk=Object.keys(DB.radarSel||{}); var n=0,ya=0; selk.forEach(function(t){ if(_esAnalizada(t)){ya++;return;} if(colaAdd(t))n++; else ya++; }); alert(n+' añadidas a la cola de análisis'+(ya?' ('+ya+' ya estaban o analizadas)':'')); });
    sec.querySelectorAll('input.radCk').forEach(function(ck){ ck.addEventListener('change',function(){ var t=(this.getAttribute('data-radck')||'').toUpperCase(); if(!t)return; DB.radarSel=DB.radarSel||{}; if(this.checked)DB.radarSel[t]=true; else delete DB.radarSel[t]; if(typeof scheduleSave==='function')scheduleSave(); }); });
  });
}


/* ================= PESTAÑA COBERTURA (plan de análisis) ================= */
function _colaHas(t){ t=(t||'').toUpperCase(); return (DB.cola||[]).some(function(x){return (x.t||'').toUpperCase()===t;}); }
function _esAnalizada(t){ t=(t||'').toUpperCase(); var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); if(a&&a.dossierFecha)return true; if(typeof _tesisSet!=='undefined'&&_tesisSet&&_tesisSet.has&&_tesisSet.has(t))return true; return false; }
function colaAdd(t){ t=(t||'').toUpperCase(); if(!t)return false; DB.cola=DB.cola||[]; if(_colaHas(t))return false; DB.cola.push({t:t,estado:'pendiente',nota:''}); if(typeof scheduleSave==='function')scheduleSave(); return true; }
function _uniInfo(t){ t=(t||'').toUpperCase(); var u=(DB.universo||{})[t]||{}; var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;})||{}; return {nombre:u.nombre||a.nombre||t, arq:u.arquetipo||''}; }
function renderCobertura(){
  var sec=document.getElementById('view-cobertura'); if(!sec)return;
  DB.cola=DB.cola||[]; DB.analisis=DB.analisis||[];
  var analizadas=DB.analisis.filter(function(a){return a.dossierFecha;});
  var nAnaliz=analizadas.length, nCola=DB.cola.length, nUni=Object.keys(DB.universo||{}).length;
  var card=function(l,v){return '<div class="card"><div class="lbl">'+l+'</div><div class="val">'+v+'</div></div>';};
  var kpis='<div class="cards">'+card('Analizadas',String(nAnaliz))+card('En cola',String(nCola))+card('Universo',String(nUni))+'</div>';
  var estOpts=function(sel){ return ['pendiente','en curso','hecha'].map(function(e){return '<option'+(e===sel?' selected':'')+'>'+e+'</option>';}).join(''); };
  var filas=DB.cola.map(function(c,i){ var t=(c.t||'').toUpperCase(); var inf=_uniInfo(t); var anz=_esAnalizada(t);
    return '<tr'+(anz?' style="background:#f0fdf4"':'')+'>'
      +'<td class="num">'+(i+1)+'</td>'
      +'<td><b>'+_radEsc(t)+'</b> <span class="muted" style="font-size:11px">'+_radEsc((inf.nombre||'').slice(0,22))+'</span>'+(anz?' <span style="color:#16a34a;font-size:11px">✓ analizada</span>':'')+'</td>'
      +'<td style="font-size:11px">'+_radEsc(inf.arq)+'</td>'
      +'<td><select class="colaInp" data-ct="'+_radEsc(t)+'" data-cf="estado">'+estOpts(c.estado||'pendiente')+'</select></td>'
      +'<td><input class="colaInp" data-ct="'+_radEsc(t)+'" data-cf="nota" value="'+_radEsc(c.nota||'')+'" placeholder="nota" style="width:160px"></td>'
      +'<td class="right" style="white-space:nowrap"><button class="btn ghost sm" data-colamove="'+i+'|-1" title="Subir">▲</button><button class="btn ghost sm" data-colamove="'+i+'|1" title="Bajar">▼</button><button class="btn ghost sm" data-coladel="'+_radEsc(t)+'" title="Quitar">✕</button></td>'
      +'</tr>';
  }).join('');
  var colaTabla='<div style="overflow:auto"><table><thead><tr><th>#</th><th>Empresa</th><th>Arquetipo</th><th>Estado</th><th>Nota</th><th></th></tr></thead><tbody>'
    +(filas||'<tr><td colspan="6" class="muted" style="padding:10px">Cola vacía. Marca empresas con ★ en Radar Op. y pulsa «Añadir ★ a la cola».</td></tr>')+'</tbody></table></div>';
  var lista=analizadas.map(function(a){return _radEsc((a.ticker||'').toUpperCase());}).sort().join(' · ');
  sec.innerHTML='<h2>Cobertura y cola de análisis</h2>'
    +'<div class="sub" style="margin-bottom:8px">Qué empresas has analizado y cuáles tienes en cola. La cola la <b>ordenas tú</b> (▲▼) y la nutres desde <b>Radar Op.</b> (★).</div>'
    +kpis
    +'<h3 style="margin:14px 0 4px">📅 Calendario de cobertura</h3>'
    +'<div class="sub" style="margin-bottom:6px">Todo lo que tienes que hacer, en un solo sitio: arriba las <b>intervenciones vencidas</b> (su fecha ya llegó) y las <b>señales de precio</b> activas; luego las empresas <b>pendientes de analizar</b> (sin fecha, por tu orden de prioridad); debajo, las <b>intervenciones programadas</b> con su fecha y los días que faltan. Marca ✓ cuando la hayas realizado: la fila queda en verde. <span class="muted">El próximo <b>Informe</b> se estima desde el <b>monitor trimestral</b> (los informes que registras) — mismo cálculo que el <b>Buzón del lunes</b>.</span></div>'
    +'<div id="calHost"><div class="muted" style="font-size:12px">Preparando calendario…</div></div>'
    +'<h3 style="margin:16px 0 4px">Cola de análisis (por orden de prioridad)</h3>'+colaTabla
    +'<h3 style="margin:16px 0 4px">Analizadas ('+nAnaliz+')</h3><div class="muted" style="font-size:12px">'+(lista||'—')+'</div>'
    +'<h3 style="margin:16px 0 4px">Cadencia de las analizadas</h3><div id="cadHost"><div class="muted" style="font-size:12px">Cargando informes trimestrales…</div></div>';
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  var tks=analizadas.map(function(a){return (a.ticker||'').toUpperCase();});
  if(tks.length) Promise.all([_cadCargar(tks),_agCargar()]).then(function(){ _pintarCadencia(analizadas); _pintarCalendario(analizadas); });
  else { var h=document.getElementById('cadHost'); if(h)h.innerHTML='<div class="muted" style="font-size:12px">Aún no hay empresas analizadas.</div>'; _pintarCalendario([]); }
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
function _pintarCalendario(analizadas){
  var host=document.getElementById('calHost'); if(!host)return;
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var cob=(DB.cobertura||{}); var infDone=cob.informe||{}, senDone=cob.senal||{};
  var items=[];
  /* 1) empresas pendientes de analizar (cola, sin fecha) */
  (DB.cola||[]).forEach(function(c,i){ var t=(c.t||'').toUpperCase(); if(!t||_esAnalizada(t))return; var inf=_uniInfo(t);
    items.push({t:t,nombre:inf.nombre,tipo:'analisis',tipoLbl:'Analizar',date:null,dias:null,bucket:1,ordCola:i,estado:c.estado||'pendiente',done:(c.estado==='hecha')});
  });
  /* 2) intervenciones programadas por empresa analizada */
  (analizadas||[]).forEach(function(a){ var t=(a.ticker||'').toUpperCase(); var inf=_uniInfo(t);
    var c=_cadenciaDe(t);
    if(c&&c.next){ var e=_cadEstado(c,hoy,a.dossierFecha); var dt=_cbToStr(c.next.date); var conf=false;
      var ag=_agResultado(t); if(ag&&ag.fecha){ var ags=_cbToStr(ag.fecha); if(ags){ dt=ags; conf=!!ag.confirmada; } }
      var dias=_cbDias(dt,hoy); var esAnual=!!e.tocaAnual; var bkt=(esAnual||(dias!=null&&dias<=0))?0:2; var doneRep=!!((infDone[t]||{})[dt]);
      items.push({t:t,nombre:inf.nombre,tipo:'informe',tipoLbl:(esAnual?'Revisión anual':'Informe '+(_QLABEL[c.next.q]||c.next.q)),date:dt,dias:dias,bucket:bkt,done:doneRep,chkType:'informe',chkKey:dt,conf:conf}); }
    var d=(typeof calibDataFor==='function')?calibDataFor(t):null;
    if(d){ var act=_calibActivo(d.hitos,hoy); if(act){ var dc=(act.dias==null?9999:act.dias); items.push({t:t,nombre:inf.nombre,tipo:'calib',tipoLbl:'Calibración '+act.k,date:act.diana,dias:act.dias,bucket:(dc<=0?0:2),done:!!act.done,chkType:'calib',chkKey:act.k}); } }
    var sen=_senalActiva(t); if(sen){ items.push({t:t,nombre:inf.nombre,tipo:'senal',tipoLbl:'Señal '+sen.lbl,date:null,dias:null,bucket:0,done:!!((senDone[t]||{})[sen.tipo]),chkType:'senal',chkKey:sen.tipo,sev:sen.sev,col:sen.col}); }
  });
  items.sort(function(a,b){ if(a.bucket!==b.bucket)return a.bucket-b.bucket; if(a.bucket===1)return a.ordCola-b.ordCola; var ad=(a.dias==null),bd=(b.dias==null); if(ad&&bd)return (a.sev==null?9:a.sev)-(b.sev==null?9:b.sev); if(ad)return 1; if(bd)return -1; return a.dias-b.dias; });
  if(!items.length){ host.innerHTML='<div class="muted" style="font-size:12px;padding:8px">No hay empresas en cola ni intervenciones programadas. Marca candidatas con ★ en Radar Op. y añádelas a la cola.</div>'; return; }
  var estOpts=function(sel){ return ['pendiente','en curso','hecha'].map(function(x){return '<option'+(x===sel?' selected':'')+'>'+x+'</option>';}).join(''); };
  var tipoChip=function(it){ var col=it.tipo==='analisis'?'#1f3d6b':(it.tipo==='informe'?'#2563eb':(it.tipo==='calib'?'#0f766e':(it.col||'#b45309'))); return '<span style="font-size:11px;font-weight:700;color:'+col+'">'+_radEsc(it.tipoLbl)+'</span>'; };
  var estadoCell=function(it){
    if(it.tipo==='analisis') return '<select class="colaInp" data-ct="'+_radEsc(it.t)+'" data-cf="estado">'+estOpts(it.estado)+'</select>';
    if(it.tipo==='senal') return '<span style="font-weight:600;color:'+(it.col||'#b45309')+'">acción ahora</span>';
    if(it.done) return '<span style="color:#16a34a;font-weight:600">hecha</span>';
    if(it.dias!=null&&it.dias<0) return '<span style="color:#dc2626;font-weight:600">vencida</span>';
    if(it.dias!=null&&it.dias<=14) return '<span style="color:#b45309;font-weight:600">vence pronto</span>';
    return '<span class="muted">programada</span>';
  };
  var rows=items.map(function(it,idx){
    var bg=it.done?'background:#f0fdf4':(it.tipo==='senal'?'background:#fef2f2':((it.bucket===0)?'background:#fff7ed':''));
    var chk=(it.tipo==='analisis')
      ? '<input type="checkbox" class="calChk" data-caltype="analisis" data-ct="'+_radEsc(it.t)+'"'+(it.done?' checked':'')+' title="Marcar analizada" style="width:16px;height:16px;cursor:pointer">'
      : '<input type="checkbox" class="calChk" data-caltype="'+it.chkType+'" data-ct="'+_radEsc(it.t)+'" data-ck="'+_radEsc(it.chkKey)+'"'+(it.done?' checked':'')+' title="Marcar realizada" style="width:16px;height:16px;cursor:pointer">';
    return '<tr style="'+bg+'">'
      +'<td class="num" style="color:#94a3b8">'+(idx+1)+'</td>'
      +'<td><b>'+_radEsc(it.t)+'</b> <span class="muted" style="font-size:11px">'+_radEsc((it.nombre||'').slice(0,22))+'</span></td>'
      +'<td>'+tipoChip(it)+'</td>'
      +'<td style="font-size:12px">'+_cbFechaTxt(it.date)+(it.conf?' <span title="Fecha confirmada (Yahoo · buzón)" style="background:#dcfce7;color:#166534;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700">conf.</span>':'')+'</td>'
      +'<td style="font-size:12px">'+_cbDiasTxt(it.dias)+'</td>'
      +'<td>'+estadoCell(it)+'</td>'
      +'<td style="text-align:center">'+chk+'</td>'
      +'</tr>';
  }).join('');
  host.innerHTML='<div style="overflow:auto"><table><thead><tr><th>#</th><th>Empresa</th><th>Tipo</th><th>Fecha</th><th>Días</th><th>Estado</th><th style="text-align:center">✓</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
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
  var uDate=new Date(ultimo.fecha+'T00:00:00'); var next=null;
  Object.keys(mdByQ).forEach(function(q){ var md=mdByQ[q]; for(var y=uDate.getFullYear(); y<=uDate.getFullYear()+1; y++){ var cand=new Date(y+'-'+md+'T00:00:00'); if(cand>uDate){ if(!next||cand<next.date){ next={date:cand,q:q}; } break; } } });
  return {ultimo:ultimo, next:next, uq:_qtoken(ultimo.periodo)};
}
var _QLABEL={Q1:'Q1',Q2:'H1',Q3:'9M',Q4:'FY'};
function _cadEstado(c,hoy,dossierFecha){
  var tocaMonitor=!!(c.next && c.next.date<=hoy); var tocaAnual=false;
  if(c.uq==='Q4'){ var fy=new Date((c.ultimo.fecha||'')+'T00:00:00'); var dias=(hoy-fy)/86400000; var dy=(''+(dossierFecha||'')).slice(0,4); var fyY=(''+(c.ultimo.fecha||'')).slice(0,4); if(dias>=0&&dias<160&&dy&&fyY&&fyY>dy)tocaAnual=true; }
  var proxLabel=c.next?((_QLABEL[c.next.q]||c.next.q)+' ~'+_cadFmtD(c.next.date)):'';
  return {tocaMonitor:tocaMonitor,tocaAnual:tocaAnual,proxLabel:proxLabel};
}
function _calibCell(t){ if(typeof calibDataFor!=='function')return '—'; var d=calibDataFor(t); if(!d)return '—'; var pend=d.hitos.filter(function(h){return !h.done;}); if(!pend.length)return '<span style="color:#16a34a">✓ completa</span>'; var nx=pend[0]; if(nx.vencida)return '<span style="color:#b45309;font-weight:600">⏳ '+nx.k+' vencida</span>'; return nx.k+(nx.dias!=null?' (en '+nx.dias+'d)':''); }
function _senalCell(t){ var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;}); if(!a)return '—'; var c=num(a.cotizacion),st=num(a.stopTesis),eH=num(a.entMax),pmax=num(a.poMax)||num(a.precioObjetivo); if(c&&st&&c<=st)return '<span style="color:#dc2626;font-weight:700">🚨 stop</span>'; if(c>0&&eH>0&&c<=eH&&!(st&&c<=st))return '<span style="color:#16a34a;font-weight:600">🟢 compra</span>'; if(pmax>0&&c>=pmax)return '<span style="color:#b45309;font-weight:600">🎯 PO</span>'; return '<span class="muted">—</span>'; }
function _pintarCadencia(analizadas){
  var host=document.getElementById('cadHost'); if(!host)return;
  var hoy=new Date(); hoy.setHours(0,0,0,0); DB.cadencia=DB.cadencia||{}; var chg=false;
  var rows=analizadas.map(function(a){ var t=(a.ticker||'').toUpperCase(); var c=_cadenciaDe(t); var cal=_calibCell(t), sen=_senalCell(t);
    if(!c){ return '<tr><td><b>'+_radEsc(t)+'</b></td><td colspan="3" class="muted" style="font-size:11px">sin monitor trimestral</td><td style="font-size:12px">'+cal+'</td><td style="font-size:12px">'+sen+'</td></tr>'; }
    var e=_cadEstado(c,hoy,a.dossierFecha); DB.cadencia[t]={proxLabel:e.proxLabel,tocaMonitor:e.tocaMonitor,tocaAnual:e.tocaAnual}; chg=true;
    var ultTxt=_radEsc((c.ultimo.periodo||''))+' ('+_radEsc(c.ultimo.fecha||'')+')';
    var proxTxt=c.next?_radEsc(e.proxLabel):'—';
    var ag=_agResultado(t); if(ag&&ag.fecha){ var agd=new Date(_cbToStr(ag.fecha)+'T00:00:00'); if(!isNaN(agd))proxTxt='<b>'+_cadFmtD(agd)+'</b> <span title="confirmada (Yahoo · buzón)" style="background:#dcfce7;color:#166534;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700">conf.</span>'; }
    var aviso=e.tocaAnual?'<span style="color:#dc2626;font-weight:600">📅 revisión anual</span>':(e.tocaMonitor?'<span style="color:#b45309;font-weight:600">⏳ toca monitor</span>':'<span class="muted">al día</span>');
    return '<tr><td><b>'+_radEsc(t)+'</b></td><td style="font-size:12px">'+ultTxt+'</td><td style="font-size:12px">'+proxTxt+'</td><td style="font-size:12px">'+aviso+'</td><td style="font-size:12px">'+cal+'</td><td style="font-size:12px">'+sen+'</td></tr>';
  }).join('');
  if(chg&&typeof scheduleSave==='function')scheduleSave();
  host.innerHTML='<div style="overflow:auto"><table><thead><tr><th>Empresa</th><th>Último informe</th><th>Próximo</th><th>Trimestral/Anual</th><th>Calibración</th><th>Señal precio</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div class="muted" style="font-size:11px;margin-top:6px">Agenda por empresa: trimestral (próximo informe estimado), calibración (próxima diana 6/12/36 m) y señal de precio activa (stop / compra / PO). Las urgentes también salen en el Panel.</div>';
}
var _cadRefrescado=false;
function _cadRefreshAll(){
  var an=(DB.analisis||[]).filter(function(a){return a.dossierFecha;}); var tk=an.map(function(a){return (a.ticker||'').toUpperCase();}); if(!tk.length)return;
  _cadCargar(tk).then(function(){ var hoy=new Date(); hoy.setHours(0,0,0,0); DB.cadencia=DB.cadencia||{};
    an.forEach(function(a){ var t=(a.ticker||'').toUpperCase(); var c=_cadenciaDe(t); if(!c){ delete DB.cadencia[t]; return; } var e=_cadEstado(c,hoy,a.dossierFecha); DB.cadencia[t]={proxLabel:e.proxLabel,tocaMonitor:e.tocaMonitor,tocaAnual:e.tocaAnual}; });
    if(typeof scheduleSave==='function')scheduleSave(); if(typeof renderPanelDash==='function')renderPanelDash();
  });
}
function cadAvisos(){
  var out=[]; var cad=DB.cadencia||{}; var held=(typeof _heldSet!=='undefined'&&_heldSet&&_heldSet.has)?_heldSet:null;
  Object.keys(cad).forEach(function(t){ if(held&&held.has(t))return; var c=cad[t]; if(c&&c.tocaMonitor) out.push({pri:2,cls:'a',goto:'cobertura',sig:'S5',tick:t,txt:'📊 <b>'+t+'</b> — toca monitor'+(c.proxLabel?' ('+c.proxLabel+')':'')}); });
  // Próximos resultados con fecha CONFIRMADA (Yahoo · buzón) para analizadas, en ≤10 días
  if(_agConf){ var hoyA=new Date(); hoyA.setHours(0,0,0,0);
    (DB.analisis||[]).forEach(function(a){ if(!a.dossierFecha)return; var t=(a.ticker||'').toUpperCase(); var ag=_agResultado(t); if(!ag||!ag.fecha||!ag.confirmada)return;
      var d=new Date(_cbToStr(ag.fecha)+'T00:00:00'); if(isNaN(d))return; var dias=Math.round((d-hoyA)/86400000);
      if(dias>=0&&dias<=10) out.push({pri:dias<=3?2:3,cls:'a',goto:'cobertura',tick:t,txt:'📊 <b>'+t+'</b> — resultados '+_cadFmtD(d)+' <span class="muted">(confirmado)</span>'+(dias===0?' · hoy':' · en '+dias+' d')});
    });
  } else if(!_agRefrescado){ _agRefrescado=true; try{ _agCargar().then(function(){ if(typeof renderPanelDash==='function')renderPanelDash(); }); }catch(e){} }
  if(!_cadRefrescado){ _cadRefrescado=true; try{ _cadRefreshAll(); }catch(e){} }
  return out;
}

/* listeners de la cola (reañadidos: se perdieron al reescribir la cadencia) */
document.addEventListener('change',function(e){ var t=e.target; if(!t.classList||!t.classList.contains('colaInp'))return; var tk=(t.getAttribute('data-ct')||'').toUpperCase(), f=t.getAttribute('data-cf'); var c=(DB.cola||[]).find(function(x){return (x.t||'').toUpperCase()===tk;}); if(c){ c[f]=t.value; if(typeof scheduleSave==='function')scheduleSave(); } });
document.addEventListener('click',function(e){ var mv=e.target.closest&&e.target.closest('[data-colamove]'); if(mv){ var a=(mv.getAttribute('data-colamove')||'').split('|'); var i=+a[0], d=+a[1]; var arr=DB.cola||[]; var j=i+d; if(j>=0&&j<arr.length){ var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp; if(typeof scheduleSave==='function')scheduleSave(); renderCobertura(); } return; } var dl=e.target.closest&&e.target.closest('[data-coladel]'); if(dl){ var t=(dl.getAttribute('data-coladel')||'').toUpperCase(); DB.cola=(DB.cola||[]).filter(function(x){return (x.t||'').toUpperCase()!==t;}); if(typeof scheduleSave==='function')scheduleSave(); renderCobertura(); } });
