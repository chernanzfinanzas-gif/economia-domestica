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

function _radarUniverso(){
  var out=[], seen={};
  (DB.analisis||[]).forEach(function(a){
    var t=(a.ticker||'').toUpperCase(); if(!t||seen[t])return; seen[t]=1;
    var v=(DB.valores||{})[t]||{};
    var precio=num(v.precioActual)||num(a.cotizacion);
    var div=num(v.divAccion)||num(a.divAccion);
    if(!(precio>0))return;                 /* necesita cotización para calcular posición */
    if(_radarSoloDiv && !(div>0))return;   /* con el filtro activo, solo empresas con dividendo (RPD) */
    out.push({t:t,nombre:v.nombre||a.nombre||t,precio:precio,div:div,manual:!!v.precioManual,fecha:v.precioFecha||''});
  });
  return out;
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

function renderRadarDiv(){
  var sec=document.getElementById('view-radardiv'); if(!sec) return;
  var host=document.getElementById('radarApp'); if(!host){ host=document.createElement('div'); host.id='radarApp'; sec.appendChild(host); }
  var uni=_radarUniverso();
  if(!uni.length){ host.innerHTML='<div class="empty">Sin empresas con cotización y dividendo en el radar. Pega cotizaciones en Análisis (Nombre · Cotización · Dividendo).</div>'; return; }
  /* cargar precios históricos que falten y re-render */
  if(typeof _precioCache!=='undefined'){
    var faltan=uni.map(function(x){return x.t;}).filter(function(t){return _precioCache[t]===undefined;});
    if(faltan.length){ host.innerHTML='<div class="muted" style="padding:10px">Cargando cotizaciones históricas del repo… ('+faltan.length+' empresas)</div>'; cargarPreciosRadar().then(function(){ renderRadarDiv(); }); return; }
  }
  var pf=function(x,d){ return num(x).toFixed(d).replace('.',','); };
  var rows=uni.map(function(x){ var st=_radarStats(x.t,_radarYears,x.precio); var rpd=(x.precio>0&&x.div>0)?(x.div/x.precio*100):null; return {x:x,st:st,rpd:rpd}; });
  rows.sort(function(a,b){
    var k=_radarSort.k, dir=_radarSort.dir;
    if(k==='pos'){ var an=(a.st==null),bn=(b.st==null); if(an&&bn)return 0; if(an)return 1; if(bn)return -1; return (a.st.pos-b.st.pos)*dir; }
    var ar=(a.rpd==null),br=(b.rpd==null); if(ar&&br)return 0; if(ar)return 1; if(br)return -1; return (a.rpd-b.rpd)*dir;
  });

  /* KPIs */
  var conRpd=rows.filter(function(r){return r.rpd!=null;});
  var mejor=conRpd[0];
  var rpdMed=conRpd.length?conRpd.reduce(function(s,r){return s+r.rpd;},0)/conRpd.length:0;
  var baratas=rows.filter(function(r){return r.st&&r.st.pos<=33;}).length;
  var card=function(l,v){ return '<div class="card"><div class="lbl">'+l+'</div><div class="val">'+v+'</div></div>'; };
  var kpis='<div class="cards">'
    +card('Empresas en radar',String(rows.length))
    +card('Mejor RPD',mejor&&mejor.rpd!=null?(pf(mejor.rpd,2)+'% · '+_infEscSafe(mejor.x.t)):'—')
    +card('RPD medio',pf(rpdMed,2)+'%')
    +card('Baratas (zona baja)',String(baratas))
    +'</div>';

  /* selector de ventana */
  var sel='<div style="margin:10px 0"><label style="font-size:13px">Rango histórico: '
    +'<select id="radarYears" style="margin-left:6px">'
    +[2,3,4].map(function(y){return '<option value="'+y+'"'+(y===_radarYears?' selected':'')+'>'+y+' años</option>';}).join('')
    +'</select></label>'
    +'<label style="font-size:13px;margin-left:16px"><input type="checkbox" id="radarSoloDiv"'+(_radarSoloDiv?' checked':'')+'> Solo con dividendo</label>'
    +'<input type="search" id="radarSearch" placeholder="Buscar nombre o ticker…" style="margin-left:16px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px"></div>';

  /* tabla */
  var trs=rows.map(function(r){
    var st=r.st, x=r.x;
    var rpdTxt=r.rpd!=null?(pf(r.rpd,2)+'%'):'—';
    var rpdCol=r.rpd==null?'#94a3b8':(r.rpd>=5?'#16a34a':(r.rpd>=3.5?'#2563eb':'#475569'));
    var rango=st?(fmt(st.min)+' – '+fmt(st.max)):'<span class="muted">sin histórico</span>';
    var bar=st?_radarBar(st.pos):'<span class="muted">—</span>';
    var nivel='—',nivCol='#94a3b8';
    if(st){ if(st.pos<33){nivel='Bajo';nivCol='#16a34a';} else if(st.pos<66){nivel='Medio';nivCol='#d97706';} else {nivel='Alto';nivCol='#dc2626';} nivel+=' ('+st.pos.toFixed(0)+'%)'; }
    var selMark=!!(DB.radarSel&&DB.radarSel[x.t]);
    var rowStyle= selMark
      ? ' style="background:#dbeafe;font-size:15px;font-weight:600"'
      : ((st&&st.pos<=33&&r.rpd!=null&&r.rpd>=rpdMed)?' style="background:#f0fdf4"':'');
    var nameSz= selMark?'12px':'11px';
    return '<tr data-fs="'+_infEscSafe((x.t+' '+(x.nombre||'')).toLowerCase())+'"'+rowStyle+'>'
      +'<td style="text-align:center"><input type="checkbox" class="radarCk" data-radarck="'+_infEscSafe(x.t)+'"'+(selMark?' checked':'')+' title="Marcar como empresa interesante" style="width:16px;height:16px;cursor:pointer"></td>'
      +'<td><b>'+_infEscSafe(x.t)+'</b> <span class="muted" style="font-size:'+nameSz+'">'+_infEscSafe((x.nombre||'').slice(0,22))+'</span></td>'
      +'<td class="num">'+fmt(x.precio)+(x.manual?' <span class="muted" title="precio pegado a mano">✎</span>':'')+'</td>'
      +'<td class="num">'+fmt(x.div)+'</td>'
      +'<td class="num" style="font-weight:700;color:'+rpdCol+'">'+rpdTxt+'</td>'
      +'<td class="num">'+rango+'</td>'
      +'<td>'+bar+'</td>'
      +'<td style="font-weight:600;color:'+nivCol+'">'+nivel+'</td>'
      +'</tr>';
  }).join('');
  var arr=function(k){ return _radarSort.k===k?(_radarSort.dir<0?' \u25bc':' \u25b2'):''; };
  var tabla='<div style="overflow:auto"><table><thead><tr><th title="Marca las empresas que encajan con tu filosofía">★</th><th>Empresa</th><th class="num">Cotización</th><th class="num">Div/acc.</th><th class="num" data-sortk="rpd" style="cursor:pointer" title="Ordenar por rentabilidad (RPD)">RPD'+arr('rpd')+'</th><th class="num">Rango '+_radarYears+' años</th><th data-sortk="pos" style="cursor:pointer" title="Ordenar por posición: barato/caro vs histórico">Posición'+arr('pos')+'</th><th>Nivel</th></tr></thead><tbody>'+trs+'</tbody></table></div>';

  var nota='<div class="muted" style="font-size:11px;margin-top:8px">Pulsa <b>RPD</b> o <b>Posición</b> en la cabecera para ordenar (rentabilidad, o barato/caro vs histórico). '
    +'La <b>posición</b> sitúa el precio actual dentro del rango de los últimos '+_radarYears+' años: barra <span style="color:#16a34a">verde</span> = cerca del mínimo (barato), <span style="color:#dc2626">roja</span> = cerca del máximo (caro). '
    +'Las filas en verde son empresas en zona baja de precio con RPD por encima de la media (posibles oportunidades). No es recomendación de compra.</div>';

  host.innerHTML='<div style="font-size:20px;font-weight:800;color:#1f3d6b;margin-bottom:4px">📡 Radar de dividendo</div>'
    +'<div class="muted" style="font-size:13px;margin-bottom:8px">Qué empresas del radar reparten más dividendo y a qué nivel de precio están frente a su histórico.</div>'
    +kpis+sel+tabla+nota;

  _wireBuscador(host.querySelector('#radarSearch'), host.querySelectorAll('tbody tr[data-fs]'), _radarBusca);
  var ys=document.getElementById('radarYears');
  if(ys)ys.addEventListener('change',function(){ _radarYears=parseInt(this.value,10)||3; renderRadarDiv(); });
  var sd=document.getElementById('radarSoloDiv');
  if(sd)sd.addEventListener('change',function(){ _radarSoloDiv=this.checked; renderRadarDiv(); });
  host.querySelectorAll('th[data-sortk]').forEach(function(th){ th.addEventListener('click',function(){ var k=th.getAttribute('data-sortk'); if(_radarSort.k===k){ _radarSort.dir=-_radarSort.dir; } else { _radarSort.k=k; _radarSort.dir=(k==='pos'?1:-1); } renderRadarDiv(); }); });
  host.querySelectorAll('input.radarCk').forEach(function(ck){ ck.addEventListener('change',function(){
    var t=(this.getAttribute('data-radarck')||'').toUpperCase(); if(!t)return;
    DB.radarSel=DB.radarSel||{};
    if(this.checked){ DB.radarSel[t]=true; } else { delete DB.radarSel[t]; }
    if(typeof scheduleSave==='function')scheduleSave();
    renderRadarDiv();
  }); });
}

/* helper de escape local (por si _infEsc no está disponible) */
function _infEscSafe(x){ if(typeof _infEsc==='function')return _infEsc(x); return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
