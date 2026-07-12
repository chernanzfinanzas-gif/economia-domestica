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
  var rows=ks.map(function(t){ var u=DB.universo[t]||{};
    return '<tr><td><b>'+_radEsc(t)+'</b></td>'
      + UNI_FIELDS.map(function(f){ return celdaEdit(t,u,f[0],f[2]||120); }).join('')
      + '<td class="right"><button class="btn ghost sm" data-udel="'+_radEsc(t)+'" title="Quitar">✕</button></td></tr>';
  }).join('');
  sec.innerHTML='<h2>Universo — clasificación (Matriz)</h2>'
    +'<div class="sub" style="margin-bottom:8px">La base de datos de la Matriz, <b>editable</b>. El Radar la usa para el arquetipo y el rating. Impórtala una vez desde <code>matriz.json</code> (lo genera el <code>.bat</code> «Exportar matriz.json») y edítala aquí cuando cambie algo.</div>'
    +'<div class="toolbar" style="margin-bottom:8px"><button class="btn" id="uImport">Importar matriz.json</button><button class="btn sm" id="uAdd">+ Empresa</button><input type="file" id="uFile" accept="application/json,.json" style="display:none"><span class="muted" id="uStatus"></span></div>'
    +'<div style="overflow:auto"><table><thead><tr><th>Ticker</th>'+UNI_FIELDS.map(function(f){return '<th>'+f[1]+'</th>';}).join('')+'<th></th></tr></thead><tbody>'
    +(rows||'<tr><td colspan="'+(UNI_FIELDS.length+2)+'" class="muted" style="padding:10px">Universo vacío. Pulsa «Importar matriz.json».</td></tr>')
    +'</tbody></table></div>';
  var st=document.getElementById('uStatus'); if(st)st.textContent=ks.length+' empresas';
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
document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-udel]'); if(!b)return; var t=b.getAttribute('data-udel'); if(DB.universo&&DB.universo[t]&&confirm('¿Quitar '+t+' del universo?')){ delete DB.universo[t]; if(typeof scheduleSave==='function')scheduleSave(); renderUniverso(); } });

/* ================= PESTAÑA RADAR ================= */
var _radFundCache=null, _radSort={k:'atr',dir:-1}, _radArqFilter='';
function _radCargarFund(){ if(_radFundCache!==null)return Promise.resolve(_radFundCache); return fetch('fundamentales.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_radFundCache=j||{empresas:[]};return _radFundCache;}).catch(function(){_radFundCache={empresas:[]};return _radFundCache;}); }
function _rf(v,suf,nd){ if(v==null)return '—'; nd=(nd==null?1:nd); return (typeof v==='number'?v.toFixed(nd):v)+(suf||''); }
function renderRadar(){
  var sec=document.getElementById('view-radar'); if(!sec)return;
  DB.universo=DB.universo||{}; DB.radarSel=DB.radarSel||{};
  if(!Object.keys(DB.universo).length){ sec.innerHTML='<h2>Radar de oportunidades</h2><div class="empty">Primero importa la clasificación en la pestaña <b>Universo</b> (botón «Importar matriz.json»).</div>'; return; }
  sec.innerHTML='<h2>Radar de oportunidades</h2><div class="muted" style="padding:10px">Cargando fundamentales del repo…</div>';
  _radCargarFund().then(function(fund){
    var fmap={}; (fund.empresas||[]).forEach(function(f){ fmap[(''+f.ticker).toUpperCase()]=f; });
    var cands=[];
    Object.keys(DB.universo).forEach(function(t){ var f=fmap[t]; if(!f)return; var u=DB.universo[t]; var sc=radScore(f,u.rating); cands.push({t:t,nombre:u.nombre||f.nombre||t,arq:u.arquetipo||'Sin clasificar',rating:u.rating||'',f:f,atr:sc.atr,nota:sc.nota,trampa:sc.trampa}); });
    if(!cands.length){ sec.innerHTML='<h2>Radar de oportunidades</h2><div class="empty">No hay cruce entre el universo y <code>fundamentales.json</code>. ¿Está subido <code>fundamentales.json</code> al repo y actualizado? (act. '+_radEsc((fund&&fund.actualizado)||'—')+')</div>'; return; }
    var arqSet={}; cands.forEach(function(c){arqSet[c.arq]=1;}); var arqList=Object.keys(arqSet).sort();
    var view=cands.filter(function(c){ return !_radArqFilter||c.arq===_radArqFilter; });
    view.sort(function(a,b){ var k=_radSort.k,d=_radSort.dir,av,bv; if(k==='atr'){av=a.atr;bv=b.atr;} else { av=(a.f[k]==null?-1e9:a.f[k]); bv=(b.f[k]==null?-1e9:b.f[k]); } return (av-bv)*d; });
    var trampas=cands.filter(function(c){return c.trampa;}).length;
    var mejor=cands.slice().sort(function(a,b){return b.atr-a.atr;})[0];
    var card=function(l,v){ return '<div class="card"><div class="lbl">'+l+'</div><div class="val">'+v+'</div></div>'; };
    var kpis='<div class="cards">'+card('Universo con datos',String(cands.length))+card('Mejor atractivo',mejor?(mejor.atr.toFixed(1)+' · '+_radEsc(mejor.t)):'—')+card('Posibles trampas',String(trampas))+card('Actualizado',_radEsc((fund&&fund.actualizado)||'—'))+'</div>';
    var filtro='<div style="margin:10px 0"><label style="font-size:13px">Arquetipo: <select id="radArq"><option value="">todos</option>'+arqList.map(function(a){return '<option value="'+_radEsc(a)+'"'+(a===_radArqFilter?' selected':'')+'>'+_radEsc(a)+'</option>';}).join('')+'</select></label> <span class="muted" style="font-size:12px">· pulsa Atractivo o RPD para ordenar</span></div>';
    var arr=function(k){ return _radSort.k===k?(_radSort.dir<0?' ▼':' ▲'):''; };
    var trs=view.map(function(c){ var f=c.f; var sel=!!DB.radarSel[c.t];
      var acol=c.atr>=70?'#16a34a':(c.atr>=55?'#2563eb':'#64748b');
      var nota=(c.nota+(c.trampa?(c.nota?', ':'')+'posible trampa':'')).trim();
      return '<tr'+(sel?' style="background:#dbeafe"':'')+'>'
        +'<td style="text-align:center"><input type="checkbox" class="radCk" data-radck="'+_radEsc(c.t)+'"'+(sel?' checked':'')+' title="Marcar interesante" style="width:15px;height:15px;cursor:pointer"></td>'
        +'<td class="num" style="font-weight:800;color:'+acol+'">'+c.atr.toFixed(1)+(c.trampa?' ⚠️':'')+'</td>'
        +'<td><b>'+_radEsc(c.t)+'</b> <span class="muted" style="font-size:11px">'+_radEsc((c.nombre||'').slice(0,20))+'</span></td>'
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
    var fa=document.getElementById('radArq'); if(fa)fa.addEventListener('change',function(){ _radArqFilter=this.value; renderRadar(); });
    sec.querySelectorAll('th[data-radsk]').forEach(function(th){ th.addEventListener('click',function(){ var k=th.getAttribute('data-radsk'); if(_radSort.k===k)_radSort.dir=-_radSort.dir; else {_radSort.k=k;_radSort.dir=-1;} renderRadar(); }); });
    sec.querySelectorAll('input.radCk').forEach(function(ck){ ck.addEventListener('change',function(){ var t=(this.getAttribute('data-radck')||'').toUpperCase(); if(!t)return; DB.radarSel=DB.radarSel||{}; if(this.checked)DB.radarSel[t]=true; else delete DB.radarSel[t]; if(typeof scheduleSave==='function')scheduleSave(); }); });
  });
}
