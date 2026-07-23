/* ============================================================
   RADAR DIVIDENDO — Plan Inversor
   Por cada empresa del radar (DB.analisis con precio y dividendo):
     · RPD (%) = dividendo/acción ÷ cotización × 100
     · Posición del precio actual dentro del rango de los últimos
       N años (2/3/4) según precios/[TICKER].json del repo:
       0% = mínimo histórico (barato) · 100% = máximo (caro)
   ============================================================ */

var _radarYears = 3;   /* ventana histórica: 2, 3 o 4 años */
var _radarSort = {k:'rpd', dir:-1};   /* k: 'rpd' | 'pos' ; dir: -1 desc, 1 asc */
var _radarSoloDiv = true;   /* true = solo empresas con dividendo (RPD) */
var _radarBusca = {q:''};   /* búsqueda por nombre/ticker */

/* Precio actual del ticker: DB.valores → _precioActualDe → último de precios/[t].json */
function _radarPrecio(t){
  var v=(DB.valores||{})[t]||{}; var p=num(v.precioActual); if(p>0)return p;
  if(typeof _precioActualDe==='function'){ p=num(_precioActualDe(t)); if(p>0)return p; }
  if(typeof _precioCache!=='undefined'){ var pj=_precioCache[t]; if(pj&&pj.data&&pj.data.length)return num(pj.data[pj.data.length-1][1]); }
  return 0;
}
/* DPA bruto del AÑO EN VIGOR desde dividendos.json.
   El dividendo del radar es el del año en curso: si ese año tiene dato DECLARADO
   (aunque sea 0 = dividendo suspendido, como Bodegas Riojanas desde 2024), ese manda
   y la empresa figura sin dividendo. Solo si el año en vigor NO tiene fila cargada
   todavía se recurre al último real conocido, para no descartar a un pagador cuyo
   dato del año aún no está en la base. (La ventana de años del RANGO de precio, que sí
   usa 3+ años, es aparte: _radarStats.) */
function _radarDiv(t){
  if(typeof evoDpaBruto!=='function')return 0;
  var y=new Date().getFullYear();
  var a=(typeof evoAnioM==='function')?evoAnioM(t,y):null;
  if(a && a.dpaBruto!=null) return num(a.dpaBruto);   /* año en vigor declarado (incl. 0) */
  for(var k=1;k<4;k++){ var d=num(evoDpaBruto(t,y-k)); if(d>0)return d; }  /* sin fila del año: último real */
  return 0;
}
function _radarUnionUniverso(out,seen){ var uni=DB.universo||{}; Object.keys(uni).forEach(function(t){ t=(t||'').toUpperCase(); if(!t||seen[t])return; var v=(DB.valores||{})[t]||{}; var precio=_radarPrecio(t); var div=_radarDiv(t); if(!(precio>0))return; if(_radarSoloDiv && !(div>0))return; seen[t]=1; out.push({t:t,nombre:(uni[t]||{}).nombre||v.nombre||t,precio:precio,div:div,manual:!!v.precioManual,fecha:v.precioFecha||''}); }); }
function _radarUniverso(){
  var out=[], seen={};
  /* Fuente principal: la base de dividendos (dividendos.json → _evoData). */
  var src=(typeof _evoData!=='undefined' && _evoData && _evoData.empresas && _evoData.empresas.length) ? _evoData.empresas : null;
  if(src){
    src.forEach(function(e){
      var t=(e.ticker||'').toUpperCase(); if(!t||seen[t])return; seen[t]=1;
      var v=(DB.valores||{})[t]||{};
      var precio=_radarPrecio(t);
      var div=_radarDiv(t);
      if(!(precio>0))return;                 /* necesita cotización para calcular posición */
      if(_radarSoloDiv && !(div>0))return;   /* con el filtro activo, solo empresas con dividendo (RPD) */
      out.push({t:t,nombre:e.nombre||v.nombre||t,precio:precio,div:div,manual:!!v.precioManual,fecha:v.precioFecha||''});
    });
    _radarUnionUniverso(out,seen); return out;
  }
  /* Respaldo (si aún no cargó dividendos.json): DB.analisis, comportamiento anterior. */
  (DB.analisis||[]).forEach(function(a){
    var t=(a.ticker||'').toUpperCase(); if(!t||seen[t])return; seen[t]=1;
    var v=(DB.valores||{})[t]||{};
    var precio=num(v.precioActual)||num(a.cotizacion);
    var div=num(v.divAccion)||num(a.divAccion);
    if(!(precio>0))return;
    if(_radarSoloDiv && !(div>0))return;
    out.push({t:t,nombre:v.nombre||a.nombre||t,precio:precio,div:div,manual:!!v.precioManual,fecha:v.precioFecha||''});
  });
  _radarUnionUniverso(out,seen); return out;
}

function cargarPreciosRadar(){
  if(typeof _precioCache==='undefined')return Promise.resolve();
  var need=_radarUniverso().map(function(x){return x.t;}).filter(function(t){return _precioCache[t]===undefined;});
  if(!need.length)return Promise.resolve();
  return Promise.all(need.map(function(t){ return fetch('precios/'+t+'.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){_precioCache[t]=j;}).catch(function(){_precioCache[t]=null;}); }));
}

function _radarStats(t,years,precio){
  if(typeof _precioCache==='undefined')return null;
  var pj=_precioCache[(t||'').toUpperCase()]; if(!pj||!pj.data||!pj.data.length)return null;
  var cut=new Date(); cut.setFullYear(cut.getFullYear()-years);
  var p2=function(n){return String(n).padStart(2,'0');};
  var cs=cut.getFullYear()+'-'+p2(cut.getMonth()+1)+'-'+p2(cut.getDate());
  var mn=Infinity,mx=-Infinity,n=0,below=0;
  for(var i=pj.data.length-1;i>=0;i--){ var f=pj.data[i][0]; if(f<cs)break; var c=num(pj.data[i][1]); if(!(c>0))continue; if(c<mn)mn=c; if(c>mx)mx=c; if(precio&&c<precio)below++; n++; }
  if(!n||!isFinite(mn))return null;
  var pos=(mx>mn)?((precio-mn)/(mx-mn)*100):50;
  pos=Math.max(0,Math.min(100,pos));
  return {min:mn,max:mx,n:n,pos:pos,pct:(n?below/n*100:null)};
}

function _radarBar(pos){
  var col=pos<33?'#16a34a':(pos<66?'#d97706':'#dc2626');
  return '<div style="position:relative;height:11px;width:110px;background:linear-gradient(90deg,#dcfce7,#fef9c3,#fee2e2);border-radius:6px;border:1px solid #e2e8f0">'
    +'<div style="position:absolute;left:'+pos.toFixed(0)+'%;top:-2px;width:3px;height:15px;background:'+col+';transform:translateX(-1.5px);border-radius:2px"></div></div>';
}

var _raddivRows=null, _raddivRpdMed=0, _radarArq='';
window._raddivQ=window._raddivQ||''; window._raddivOpen=window._raddivOpen||{};
var _RDV_ARQCOL={FINANCIERAS:"#2563eb",REGULADAS:"#0891b2",CONCESIONAL:"#7c3aed",INDUSTRIAL:"#64748b",COMMODITY:"#b45309",CONSUMO:"#db2777",ESCALABLES:"#0d9488",SALUD:"#16a34a",INMOBILIARIAS:"#9333ea","Sin clasificar":"#94a3b8"};
function _rdvAtag(a){ a=a||'Sin clasificar'; return '<span class="rdv-atag" style="background:'+(_RDV_ARQCOL[a]||'#94a3b8')+'">'+_infEscSafe(a)+'</span>'; }
function _rdvBar(pos){ var col=pos<33?'#16a34a':(pos<66?'#d97706':'#dc2626'); return '<span class="rdv-bar"><i style="left:'+pos.toFixed(0)+'%;background:'+col+'"></i></span>'; }
function _rdvNivel(pos){ if(pos<33)return ['Bajo','#16a34a']; if(pos<66)return ['Medio','#d97706']; return ['Alto','#dc2626']; }
function _rdvRpdCol(r){ return r==null?'#94a3b8':(r>=5?'#16a34a':(r>=3.5?'#2563eb':'#475569')); }
function _rdvPf(x,d){ return num(x).toFixed(d).replace('.',','); }
function renderRadarDiv(){
  var sec=document.getElementById('view-radardiv'); if(!sec) return;
  var host=document.getElementById('radarApp'); if(!host){ host=document.createElement('div'); host.id='radarApp'; sec.appendChild(host); }
  if(typeof _evoCargar==='function' && !(typeof _evoData!=='undefined' && _evoData && _evoData.empresas)){
    host.innerHTML='<div class="muted" style="padding:10px">Cargando base de dividendos…</div>';
    _evoCargar().then(function(){ renderRadarDiv(); }); return;
  }
  var uni=_radarUniverso();
  if(!uni.length){ host.innerHTML='<div class="empty">Sin empresas con cotización en la base de dividendos. Comprueba que <code>dividendos.json</code> está subido al repo y que hay cotizaciones en <code>precios/</code>.</div>'; return; }
  if(typeof _precioCache!=='undefined'){
    var faltan=uni.map(function(x){return x.t;}).filter(function(t){return _precioCache[t]===undefined;});
    if(faltan.length){ host.innerHTML='<div class="muted" style="padding:10px">Cargando cotizaciones históricas del repo… ('+faltan.length+' empresas)</div>'; cargarPreciosRadar().then(function(){ renderRadarDiv(); }); return; }
  }
  _raddivRows=uni.map(function(x){ var st=_radarStats(x.t,_radarYears,x.precio); var rpd=(x.precio>0&&x.div>0)?(x.div/x.precio*100):null; var arq=((DB.universo||{})[x.t]||{}).arquetipo||'Sin clasificar'; return {x:x,st:st,rpd:rpd,arq:arq}; });
  _raddivBuild(host);
}
function _raddivBuild(host){
  var rows=_raddivRows;
  var conRpd=rows.filter(function(r){return r.rpd!=null;}).slice().sort(function(a,b){return b.rpd-a.rpd;});
  var mejor=conRpd[0];
  _raddivRpdMed=conRpd.length?conRpd.reduce(function(s,r){return s+r.rpd;},0)/conRpd.length:0;
  var baratas=rows.filter(function(r){return r.st&&r.st.pos<=33;}).length;
  var arqCount={}; rows.forEach(function(r){arqCount[r.arq]=(arqCount[r.arq]||0)+1;});
  var arqOpts='<option value="">Todos los arquetipos</option>'+Object.keys(arqCount).sort().map(function(a){return '<option value="'+_infEscSafe(a)+'"'+(a===_radarArq?' selected':'')+'>'+_infEscSafe(a)+' ('+arqCount[a]+')</option>';}).join('');
  var yearOpts=[1,2,3,4,5].map(function(y){return '<option value="'+y+'"'+(y===_radarYears?' selected':'')+'>'+y+(y===1?' año':' años')+'</option>';}).join('');
  var sortOpts=[['rpd','RPD'],['pos','Posición']].map(function(o){return '<option value="'+o[0]+'"'+(_radarSort.k===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('');
  host.innerHTML=
    '<div class="sub" style="margin-bottom:12px">Qué empresas reparten más dividendo (<b>RPD</b>) y a qué <b>nivel de precio</b> están frente a su histórico. La <b>Posición</b> sitúa el precio actual en el rango de los últimos años: <span style="color:#16a34a">verde</span> = cerca del mínimo (barato), <span style="color:#dc2626">roja</span> = cerca del máximo (caro).</div>'+
    '<div class="rdv-k">'+
      '<div class="c hero"><div class="l">Empresas en radar</div><div class="v">'+rows.length+'</div><div class="p">con cotización y dividendo</div></div>'+
      '<div class="c"><div class="l">Mejor RPD</div><div class="v" style="color:#16a34a">'+(mejor&&mejor.rpd!=null?_rdvPf(mejor.rpd,2)+'%':'—')+'</div><div class="p">'+(mejor?_infEscSafe(mejor.x.t):'')+'</div></div>'+
      '<div class="c"><div class="l">RPD medio</div><div class="v">'+_rdvPf(_raddivRpdMed,2)+'%</div><div class="p">del radar</div></div>'+
      '<div class="c"><div class="l">Baratas (zona baja)</div><div class="v" style="color:#16a34a">'+baratas+'</div><div class="p">posición ≤ 33%</div></div>'+
    '</div>'+
    '<div class="rdv-tb">'+
      '<label>Rango histórico <select id="radarYears">'+yearOpts+'</select></label>'+
      '<label><input type="checkbox" id="radarSoloDiv"'+(_radarSoloDiv?' checked':'')+'> Solo con dividendo</label>'+
      '<select id="radarArq">'+arqOpts+'</select>'+
      '<input type="search" id="radarSearch" placeholder="Buscar…" value="'+_infEscSafe(window._raddivQ)+'">'+
      '<label class="rdv-sortm">Ordenar <select id="radarSortSel">'+sortOpts+'</select></label>'+
      '<span class="rdv-count" id="radarCount"></span>'+
    '</div>'+
    '<div class="rdv-table"><table><thead><tr>'+
      '<th class="l">★</th><th class="l">Empresa</th><th>Cotización</th><th>Div/acc.</th>'+
      '<th class="s" data-radsk="rpd">RPD</th><th>Rango '+_radarYears+' años</th><th class="l s" data-radsk="pos">Posición</th><th class="l">Nivel</th>'+
    '</tr></thead><tbody id="rdvBody"></tbody></table></div>'+
    '<div class="rdv-cards" id="rdvCards"></div>'+
    '<div class="muted" style="font-size:11px;margin-top:10px;line-height:1.5">Filas en verde = zona baja de precio con RPD por encima de la media (posibles oportunidades). La posición usa el rango de los últimos '+_radarYears+' años. Marca ★ las que encajen con tu filosofía. No es recomendación de compra.</div>';
  _raddivRenderList();
  _raddivBind(sec_radardiv());
}
function sec_radardiv(){ return document.getElementById('view-radardiv'); }
function _raddivView(){
  var q=(window._raddivQ||'').toLowerCase().trim();
  var list=(_raddivRows||[]).filter(function(r){ if(_radarArq&&r.arq!==_radarArq)return false; if(q){ if((r.x.t+' '+(r.x.nombre||'')).toLowerCase().indexOf(q)<0)return false; } return true; });
  var k=_radarSort.k, dir=_radarSort.dir;
  list.sort(function(a,b){ if(k==='pos'){ var an=(a.st==null),bn=(b.st==null); if(an&&bn)return 0; if(an)return 1; if(bn)return -1; return (a.st.pos-b.st.pos)*dir; } var ar=(a.rpd==null),br=(b.rpd==null); if(ar&&br)return 0; if(ar)return 1; if(br)return -1; return (a.rpd-b.rpd)*dir; });
  return list;
}
function _raddivArrow(k){ return _radarSort.k===k?(_radarSort.dir<0?' ▼':' ▲'):''; }
function _raddivRenderList(){
  if(!document.getElementById('rdvBody'))return;
  var list=_raddivView();
  var _held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  var cnt=document.getElementById('radarCount'); if(cnt)cnt.textContent=list.length+' de '+(_raddivRows||[]).length;
  document.querySelectorAll('#view-radardiv th[data-radsk]').forEach(function(th){ var k=th.getAttribute('data-radsk'); th.textContent=(k==='rpd'?'RPD':'Posición')+_raddivArrow(k); });
  document.getElementById('rdvBody').innerHTML=list.map(function(r){ var x=r.x, st=r.st;
    var sel=!!(DB.radarSel&&DB.radarSel[x.t]);
    var opp=(st&&st.pos<=33&&r.rpd!=null&&r.rpd>=_raddivRpdMed);
    var cls=sel?'sel':(_held.has(x.t)?'held':((typeof _esAnalizada==='function'&&_esAnalizada(x.t))?'ana':(opp?'opp':'')));
    var rango=st?(fmt(st.min)+' – '+fmt(st.max)):'<span class="muted">sin histórico</span>';
    var bar=st?_rdvBar(st.pos):'<span class="muted">—</span>';
    var nivTxt='—',nivCol='#94a3b8'; if(st){ var nv=_rdvNivel(st.pos); nivTxt=nv[0]+' ('+st.pos.toFixed(0)+'%)'; nivCol=nv[1]; }
    return '<tr class="'+cls+'"><td class="l"><input type="checkbox" class="rdv-ck" data-radarck="'+_infEscSafe(x.t)+'"'+(sel?' checked':'')+'></td>'+
      '<td class="l"><b class="rdv-tk" data-ficha="'+_infEscSafe(x.t)+'">'+_infEscSafe(x.t)+'</b> <span style="font-size:11px;color:#94a3b8">'+_infEscSafe((x.nombre||'').slice(0,16))+'</span> '+_rdvAtag(r.arq)+'</td>'+
      '<td>'+fmt(x.precio)+(x.manual?' <span class="muted" title="precio pegado a mano">✎</span>':'')+'</td>'+
      '<td>'+fmt(x.div)+'</td>'+
      '<td style="font-weight:700;color:'+_rdvRpdCol(r.rpd)+'">'+(r.rpd!=null?_rdvPf(r.rpd,2)+'%':'—')+'</td>'+
      '<td>'+rango+'</td>'+
      '<td class="l">'+bar+'</td>'+
      '<td class="l" style="font-weight:700;color:'+nivCol+'">'+nivTxt+'</td></tr>';
  }).join('')||'<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8">Sin resultados.</td></tr>';
  document.getElementById('rdvCards').innerHTML=list.map(function(r){ var x=r.x, st=r.st; var op=!!window._raddivOpen[x.t];
    var sel=!!(DB.radarSel&&DB.radarSel[x.t]);
    var st2=sel?' sel':(_held.has(x.t)?' held':((typeof _esAnalizada==='function'&&_esAnalizada(x.t))?' ana':''));
    var nv=st?_rdvNivel(st.pos):['—','#94a3b8'];
    var bar=st?_rdvBar(st.pos):'';
    var rango=st?(fmt(st.min)+'–'+fmt(st.max)):'—';
    return '<div class="rdv-card'+st2+(op?' open':'')+'" data-t="'+_infEscSafe(x.t)+'"><div class="rdv-card-h"><input type="checkbox" class="rdv-ck" data-radarck="'+_infEscSafe(x.t)+'"'+(sel?' checked':'')+'>'+
      '<div class="score"><div class="n" style="color:'+_rdvRpdCol(r.rpd)+'">'+(r.rpd!=null?_rdvPf(r.rpd,2)+'%':'—')+'</div><div class="l">RPD</div></div>'+
      '<div class="mid"><div class="nm"><span class="rdv-tk" data-ficha="'+_infEscSafe(x.t)+'">'+_infEscSafe(x.t)+'</span> · '+_infEscSafe((x.nombre||'').slice(0,16))+'</div><div class="pl">'+_rdvAtag(r.arq)+bar+'<span class="rdv-niv" style="color:'+nv[1]+'">'+(st?nv[0]+' '+st.pos.toFixed(0)+'%':'—')+'</span></div></div>'+
      '<div class="cot"><div class="v">'+fmt(x.precio)+'</div><div class="l">Cotiz.</div></div>'+
      '<span class="rdv-arw">▶</span></div>'+
      '<div class="rdv-card-b"><div class="mgrid">'+
        '<div class="m"><div class="l">Div/acc.</div><div class="v">'+fmt(x.div)+'</div></div>'+
        '<div class="m"><div class="l">Rango '+_radarYears+'a</div><div class="v" style="font-size:11px">'+rango+'</div></div>'+
        '<div class="m"><div class="l">Nivel</div><div class="v" style="color:'+nv[1]+'">'+nv[0]+'</div></div>'+
      '</div></div></div>';
  }).join('')||'<div style="text-align:center;padding:16px;color:#94a3b8">Sin resultados.</div>';
}
function _raddivBind(sec){
  if(renderRadarDiv._bound)return; renderRadarDiv._bound=true;
  sec.addEventListener('input',function(e){ if(e.target&&e.target.id==='radarSearch'){ window._raddivQ=e.target.value; _raddivRenderList(); } });
  sec.addEventListener('change',function(e){ var t=e.target; if(!t)return;
    if(t.id==='radarYears'){ _radarYears=parseInt(t.value,10)||3; renderRadarDiv(); return; }
    if(t.id==='radarSoloDiv'){ _radarSoloDiv=t.checked; renderRadarDiv(); return; }
    if(t.id==='radarArq'){ _radarArq=t.value; _raddivRenderList(); return; }
    if(t.id==='radarSortSel'){ _radarSort.k=t.value; _radarSort.dir=(t.value==='pos'?1:-1); _raddivRenderList(); return; }
    if(t.classList&&t.classList.contains('rdv-ck')){ var tk=(t.getAttribute('data-radarck')||'').toUpperCase(); if(!tk)return; DB.radarSel=DB.radarSel||{}; if(t.checked)DB.radarSel[tk]=true; else delete DB.radarSel[tk]; if(typeof scheduleSave==='function')scheduleSave(); _raddivRenderList(); return; } });
  sec.addEventListener('click',function(e){
    if(e.target.closest('.rdv-ck'))return;
    if(e.target.closest('[data-ficha]'))return;
    var th=e.target.closest('th[data-radsk]'); if(th){ var k=th.getAttribute('data-radsk'); if(_radarSort.k===k)_radarSort.dir=-_radarSort.dir; else {_radarSort.k=k;_radarSort.dir=(k==='pos'?1:-1);} var ss=document.getElementById('radarSortSel'); if(ss)ss.value=_radarSort.k; _raddivRenderList(); return; }
    var h=e.target.closest('.rdv-card-h'); if(h){ var t2=h.parentElement.getAttribute('data-t'); window._raddivOpen[t2]=!window._raddivOpen[t2]; _raddivRenderList(); return; } });
}

/* helper de escape local (por si _infEsc no está disponible) */
function _infEscSafe(x){ if(typeof _infEsc==='function')return _infEsc(x); return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
