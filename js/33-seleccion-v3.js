/* ============================================================================
   33-seleccion-v3.js — Fase previa al análisis con el MÉTODO V3 (20-oct-2026)
   Sustituye el PINTADO de tres pestañas; el CÁLCULO es del chat «Método v3»:
     · Universo  ← universo/informe.json  (112 Continuo + 13 BME Growth, Matriz v3)
     · Radar     ← universo/informe.json  (puntos 0-100: dividendo 35 · calidad 35 · valoración 30)
     · Cobertura ← lo de siempre + recogida/calendario.json y recogida/novedades.json
                   (los sube solo la recogida diaria del PC de Carlos)
   Las vistas ANTIGUAS siguen dentro (botón «ver la antigua»): Visión, Dividendos y la
   ficha de Inversiones aún leen DB.universo (arquetipos v2), que aquí NO se toca.
   El repo es público: la cartera NO viene en el JSON; se cruza aquí con heldTickerSet().
   ============================================================================ */
(function(){
var SV3={ inf:null, infT:0, cal:null, nov:null, recT:0, old:{universo:false, radar:false},
          fu:{q:'', seg:'', mod:'', grp:'', est:''}, fr:{q:'', grp:'', eti:'', est:'', ord:'puntos'}, open:{} };
window._SV3=SV3;

/* ---------- utilidades ---------- */
function esc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function nf(v,nd){ if(v==null||isNaN(v))return '—'; return Number(v).toLocaleString('es-ES',{minimumFractionDigits:nd||0,maximumFractionDigits:nd||0}); }
function pc(v,nd){ return (v==null||isNaN(v))?'—':nf(v*100,nd==null?1:nd)+' %'; }
function mill(v){ if(v==null||isNaN(v))return '—'; var a=Math.abs(v); return nf(v,a>=100?0:1); }
function held(){ try{ return (typeof heldTickerSet==='function')?heldTickerSet():new Set(); }catch(e){ return new Set(); } }
function estado(e,H){ if(H.has((e.ticker||'').toUpperCase()))return 'cartera'; return e.estado==='analizada'?'analizada':'universo'; }
function estChip(st){ return st==='cartera'?'<span class="sv3-st c">cartera</span>':(st==='analizada'?'<span class="sv3-st a">analizada</span>':''); }
function db(){ return (typeof DB!=='undefined'&&DB)?DB:{}; }
function enCola(t){ t=(t||'').toUpperCase(); return (db().cola||[]).some(function(c){ return (c.t||'').toUpperCase()===t && c.estado!=='hecha'; }); }
function guardar(){ if(typeof scheduleSave==='function')scheduleSave(); }
function cartera(){ try{ localStorage.setItem('kh_universo_cartera', JSON.stringify({fecha:new Date().toISOString().slice(0,10), tickers:Array.from(held())})); }catch(e){} }

function cargarInf(){
  if(SV3.inf && Date.now()-SV3.infT<10*60*1000) return Promise.resolve(SV3.inf);
  return fetch('universo/informe.json',{cache:'no-store'}).then(function(r){ if(!r.ok)throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(j){ SV3.inf=j; SV3.infT=Date.now(); return j; });
}
function cargarRec(){
  if(SV3.recT && Date.now()-SV3.recT<10*60*1000) return Promise.resolve();
  function uno(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
  return Promise.all([uno('recogida/calendario.json'), uno('recogida/novedades.json')]).then(function(a){ SV3.cal=a[0]; SV3.nov=a[1]; SV3.recT=Date.now(); });
}
function todas(j){ return (j.continuo||[]).map(function(e){ e._seg='Continuo'; return e; }).concat((j.growth||[]).map(function(e){ e._seg='BME Growth'; return e; })); }
function fechaDatos(j){ var g=(j&&j.generado)||''; return g?(g.slice(8,10)+'-'+g.slice(5,7)+' '+g.slice(11,16)):'—'; }

function css(){
  if(document.getElementById('sv3-css'))return;
  var s=document.createElement('style'); s.id='sv3-css';
  s.textContent=
  '.sv3-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:0 0 12px}'+
  '.sv3-k .c{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px 12px}.sv3-k .l{font-size:11px;color:#6b7280}.sv3-k .v{font-size:20px;font-weight:800}.sv3-k .p{font-size:10.5px;color:#94a3b8}'+
  '.sv3-f{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;align-items:center}.sv3-f input,.sv3-f select{border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:12.5px;background:#fff}'+
  '.sv3-f input{min-width:160px;flex:1 1 160px}.sv3-n{font-size:11.5px;color:#64748b;margin-left:auto}'+
  '.sv3-t{overflow-x:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px}.sv3-t table{border-collapse:collapse;width:100%;font-size:12px}'+
  '.sv3-t th{position:sticky;top:0;background:#f8fafc;font-size:10.5px;color:#475569;text-align:right;padding:6px 6px;border-bottom:1px solid #e5e7eb;white-space:nowrap}'+
  '.sv3-t td{padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;vertical-align:middle}.sv3-t th.l,.sv3-t td.l{text-align:left}'+
  '.sv3-t tr.r{cursor:pointer}.sv3-t tr.r:hover td{background:#f8fafc}.sv3-t tr.hc td{background:#f0fdf4}.sv3-t tr.ha td{background:#eff6ff}'+
  '.sv3-t td.e{max-width:260px;overflow:hidden;text-overflow:ellipsis}.sv3-t td.e b{font-weight:800}.sv3-t td.e small{display:block;color:#94a3b8;font-size:10.5px;max-width:230px;overflow:hidden;text-overflow:ellipsis}'+
  '.sv3-st{font-size:9.5px;font-weight:800;border-radius:6px;padding:1px 5px;margin-left:4px;vertical-align:1px}.sv3-st.c{background:#dcfce7;color:#166534}.sv3-st.a{background:#dbeafe;color:#1e40af}'+
  '.sv3-mo{font-size:10px;font-weight:700;color:#334155;background:#f1f5f9;border-radius:5px;padding:1px 5px;margin-right:3px}'+
  '.sv3-et{font-size:10px;font-weight:700;border-radius:20px;padding:1px 7px;margin:0 2px 0 0;display:inline-block}'+
  '.sv3-et.Calidad{background:#dcfce7;color:#166534}.sv3-et.Barata{background:#e0f2fe;color:#075985}.sv3-et.Crecimiento{background:#f3e8ff;color:#6b21a8}.sv3-et.Riesgo{background:#fee2e2;color:#991b1b}'+
  '.sv3-pt{display:inline-flex;align-items:center;gap:6px}.sv3-pt b{font-size:14px;min-width:30px;text-align:right}.sv3-bars{display:inline-flex;flex-direction:column;gap:2px;width:60px}'+
  '.sv3-bars i{display:block;height:4px;border-radius:2px;background:#e2e8f0;position:relative;overflow:hidden}.sv3-bars i span{position:absolute;left:0;top:0;bottom:0;border-radius:2px}'+
  '.sv3-up{color:#15803d;font-weight:700}.sv3-dn{color:#b91c1c;font-weight:700}.sv3-av{color:#b45309;font-weight:700}'+
  '.sv3-det td{background:#fcfcfd;white-space:normal;text-align:left}.sv3-dg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 14px;font-size:11.5px;padding:6px 2px}'+
  '.sv3-dg div span{color:#64748b}.sv3-dav{margin:6px 0 2px;font-size:11.5px;color:#92400e}'+
  '.sv3-btn{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;color:#334155}.sv3-btn.pr{background:#0f766e;border-color:#0f766e;color:#fff}'+
  '.sv3-sm{font-size:10.5px;padding:2px 7px;border-radius:6px}'+
  '.sv3-h3{font-size:14px;font-weight:800;margin:18px 0 6px;color:#1f2937}.sv3-nota{font-size:11px;color:#64748b;margin:4px 0 10px;line-height:1.45}'+
  '.sv3-mov{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin:0 0 12px}.sv3-mov>div{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px 12px;font-size:12px}'+
  '.sv3-mov b{font-size:11.5px}.sv3-salto{display:inline-flex;gap:3px;align-items:center}.sv3-salto i{width:10px;height:10px;border-radius:50%;background:#e2e8f0;display:inline-block}.sv3-salto i.ok{background:#16a34a}'+
  '.sv3-cal{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px 12px;margin:0 0 10px;font-size:12px}.sv3-cal .d{font-weight:800;margin:6px 0 2px;color:#334155}'+
  '.sv3-cal .it{display:flex;gap:6px;align-items:center;padding:2px 0;flex-wrap:wrap}.sv3-src{font-size:9.5px;font-weight:800;border-radius:5px;padding:0 5px}.sv3-src.conf{background:#dcfce7;color:#166534}.sv3-src.est{background:#f1f5f9;color:#64748b}'+
  '.sv3-cal .ok{color:#15803d;font-weight:700}';
  document.head.appendChild(s);
}

/* botón al informe del universo + vuelta a la vista nueva cuando se mira la antigua */
window._uniBotonInforme=function(){
  var vol='';
  if(SV3.old.universo&&document.getElementById('view-universo')&&document.getElementById('view-universo').classList.contains('active')) vol='universo';
  var b='<div style="margin:8px 0 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    '<a href="universo/" target="_blank" rel="noopener" data-sv3inf="1" style="display:inline-block;padding:7px 12px;border-radius:8px;background:#0f766e;color:#fff;font-weight:700;font-size:13px;text-decoration:none">📊 Ver informe del universo (método v3)</a>';
  if(SV3.old.universo||SV3.old.radar) b+='<button type="button" class="sv3-btn" data-sv3volver="1">← Volver a la vista del método v3</button>';
  return b+'</div>';
};
window._uniAbrirInforme=function(){ cartera(); window.open('universo/','_blank'); };

/* ======================================================================== UNIVERSO */
var _uniV2=window.renderUniverso;
window._renderUniversoV2=_uniV2;
window.renderUniverso=function(){
  var sec=document.getElementById('view-universo'); if(!sec)return; css(); bind(sec);
  if(SV3.old.universo && typeof _uniV2==='function'){ try{ return _uniV2(); }catch(e){ SV3.old.universo=false; try{ console.error('[universo antiguo]',e); }catch(_){} } }
  sec.innerHTML=heroUni()+'<div class="muted" style="padding:10px">Cargando el universo del método v3…</div>';
  cargarInf().then(function(j){ pintarUni(sec,j); }).catch(function(e){
    sec.innerHTML=heroUni()+'<div class="empty">No he podido leer <code>universo/informe.json</code> ('+esc(e.message)+'). <button type="button" class="sv3-btn" data-sv3old="universo">Ver la clasificación antigua</button></div>';
  });
};
function heroUni(){
  return '<div class="vhero g-teal"><div class="vhero-main"><span class="vhero-ic">🌐</span><div class="vhero-txt"><h2>Universo</h2><p>Las empresas que vigilamos, clasificadas con la <b>Matriz v3</b> (modelo + módulos) y con sus cuentas del último ejercicio. Se recalcula solo cada día; no se edita a mano. Lo que es tuyo (cartera, cola) se cruza en tu navegador.</p></div></div></div>'+
    window._uniBotonInforme();
}
function pintarUni(sec,j){
  var H=held(), L=todas(j), F=SV3.fu;
  var nCar=L.filter(function(e){return estado(e,H)==='cartera';}).length, nAna=L.filter(function(e){return e.estado==='analizada';}).length;
  var grupos=Object.keys(j.grupos||{}).sort();
  var opt=function(v,txt,cur){ return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(txt)+'</option>'; };
  sec.innerHTML=heroUni()+
    '<div class="sv3-k">'+
      '<div class="c"><div class="l">Mercado Continuo</div><div class="v">'+(j.continuo||[]).length+'</div><div class="p">empresas</div></div>'+
      '<div class="c"><div class="l">BME Growth</div><div class="v">'+(j.growth||[]).length+'</div><div class="p">candidatas al salto</div></div>'+
      '<div class="c"><div class="l">Analizadas</div><div class="v">'+nAna+'</div><div class="p">con el método</div></div>'+
      '<div class="c"><div class="l">En cartera</div><div class="v">'+nCar+'</div><div class="p">de tu navegador</div></div>'+
      '<div class="c"><div class="l">Datos del</div><div class="v" style="font-size:15px">'+fechaDatos(j)+'</div><div class="p">'+esc(j.matriz||'')+'</div></div>'+
    '</div>'+
    '<div class="sv3-f">'+
      '<input type="search" placeholder="Buscar empresa o ticker…" data-sv3fu="q" value="'+esc(F.q)+'">'+
      '<select data-sv3fu="seg">'+opt('','Continuo y Growth',F.seg)+opt('Continuo','Solo Continuo',F.seg)+opt('BME Growth','Solo BME Growth',F.seg)+'</select>'+
      '<select data-sv3fu="mod">'+opt('','Todos los modelos',F.mod)+opt('GEN','GEN · general',F.mod)+opt('BAN','BAN · banca',F.mod)+opt('SEG','SEG · seguros',F.mod)+opt('INM','INM · inmobiliaria',F.mod)+'</select>'+
      '<select data-sv3fu="grp">'+opt('','Todos los grupos',F.grp)+grupos.map(function(g){return opt(g,g,F.grp);}).join('')+'</select>'+
      '<select data-sv3fu="est">'+opt('','Todas',F.est)+opt('cartera','En cartera',F.est)+opt('analizada','Analizadas',F.est)+opt('universo','Sin analizar',F.est)+'</select>'+
      '<span class="sv3-n" id="sv3uN"></span>'+
    '</div>'+
    '<div class="sv3-t"><table><thead><tr><th class="l">Empresa</th><th class="l">Modelo</th><th class="l">Grupo</th><th title="Ventas del último ejercicio, M€ (en banca, margen de intereses)">Ventas</th><th title="Beneficio atribuido, M€">Benef.</th><th title="ROE último año (mediana 5 años)">ROE</th><th title="Deuda neta / EBITDA (GEN) o deuda neta / activo (INM)">Deuda</th><th>PER</th><th title="Rentabilidad por dividendo, 12 meses">RPD</th><th title="Capitalización, M€">Cap.</th><th title="Avisos del cálculo">⚠</th></tr></thead><tbody id="sv3uB"></tbody></table></div>'+
    '<div class="sv3-nota">Pulsa una fila para ver el detalle. Importes en millones de euros; ArcelorMittal y algunas de BME Growth informan en otra moneda (se indica). «—» = sin dato, nunca cero. <button type="button" class="sv3-btn sv3-sm" data-sv3old="universo">Ver la clasificación antigua (v2)</button></div>';
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  filasUni();
}
function filasUni(){
  var j=SV3.inf; if(!j)return; var H=held(), F=SV3.fu, q=(F.q||'').toLowerCase();
  var L=todas(j).filter(function(e){
    if(F.seg&&e._seg!==F.seg)return false; if(F.mod&&e.modelo!==F.mod)return false; if(F.grp&&e.grupo_comp!==F.grp)return false;
    if(F.est&&estado(e,H)!==F.est)return false;
    if(q&&((e.ticker||'')+' '+(e.empresa||'')+' '+(e.descripcion||'')).toLowerCase().indexOf(q)<0)return false; return true; })
    .sort(function(a,b){ return (a.empresa||'').localeCompare(b.empresa||'','es'); });
  var n=document.getElementById('sv3uN'); if(n)n.textContent=L.length+' de '+todas(j).length;
  var B=document.getElementById('sv3uB'); if(!B)return;
  B.innerHTML=L.map(function(e){
    var st=estado(e,H), t=e.ticker, deuda=(e.modelo==='INM')?(e.ltv!=null?pc(e.ltv,0)+' LTV':'—'):(e.dn_ebitda!=null?nf(e.dn_ebitda,1)+'x':'—');
    var mon=(e.moneda&&e.moneda!=='EUR')?' <small style="display:inline;color:#b45309">'+esc(e.moneda)+'</small>':'';
    var tr='<tr class="r'+(st==='cartera'?' hc':(st==='analizada'?' ha':''))+'" data-sv3row="'+esc(t)+'">'+
      '<td class="l e"><b>'+esc(t)+'</b> '+esc(e.empresa)+estChip(st)+(e._seg==='BME Growth'?' <span class="sv3-mo">Growth</span>':'')+'<small>'+esc(e.descripcion||'')+'</small></td>'+
      '<td class="l"><span class="sv3-mo">'+esc(e.modelo||'—')+'</span>'+(e.modulos||[]).map(function(m){return '<span class="sv3-mo" style="background:#fff;border:1px solid #e2e8f0">'+esc(m)+'</span>';}).join('')+'</td>'+
      '<td class="l" style="font-size:11px">'+esc(e.grupo_comp||'—')+'</td>'+
      '<td>'+mill(e.ingresos)+mon+'</td><td>'+mill(e.beneficio)+'</td>'+
      '<td>'+pc(e.roe,1)+(e.roe_med5!=null?' <small style="display:inline;color:#94a3b8">('+pc(e.roe_med5,0)+')</small>':'')+'</td>'+
      '<td>'+deuda+'</td><td>'+(e.per!=null&&e.per>0?nf(e.per,1):'—')+'</td><td>'+pc(e.rpd,1)+'</td><td>'+mill(e.cap)+'</td>'+
      '<td>'+((e.avisos||[]).length?'<span class="sv3-av" title="'+esc((e.avisos||[]).join(' · '))+'">'+(e.avisos||[]).length+'</span>':'')+'</td></tr>';
    if(SV3.open['u'+t]) tr+='<tr class="sv3-det"><td colspan="11">'+detalle(e)+'</td></tr>';
    return tr; }).join('')||'<tr><td colspan="11" class="l muted">Ninguna empresa con esos filtros.</td></tr>';
}
function detalle(e){
  var j=SV3.inf||{}, it=function(l,v){ return '<div><span>'+l+':</span> '+v+'</div>'; };
  var h='<div class="sv3-dg">'+
    it('Datos',(e.primero||'?')+'–'+(e.ultimo||'?')+' ('+(e.n_anios||0)+' ejercicios)'+(e.normas?' · '+esc(e.normas):'')+(e.moneda&&e.moneda!=='EUR'?' · '+esc(e.moneda):''))+
    it('Crec. ventas',pc(e.cagr_ing,1)+(e.cagr_tramo?' anual ('+esc(e.cagr_tramo)+')':''))+
    it('EBITDA',mill(e.ebitda))+it('Margen EBIT',pc(e.mg_ebit,1))+it('Patrimonio',mill(e.patrimonio))+it('Deuda neta',mill(e.deuda_neta))+
    it('Caja libre',mill(e.fcf))+it('Años con pérdidas',(e.perdidas5!=null?e.perdidas5+' de '+(e.anios5||5):'—'))+
    it((e.s1||'Último semestre')+' ventas',pc(e.s1_ing,1))+it((e.s1||'Último semestre')+' beneficio',pc(e.s1_ben,1))+
    it('Precio',(e.precio!=null?nf(e.precio,2):'—')+(e.fecha_precio?' ('+esc(e.fecha_precio.slice(8,10)+'-'+e.fecha_precio.slice(5,7))+')':''))+
    it('12 meses',pc(e.var_1a,1))+it('Del máx. 52s',pc(e.vs_max52,1))+it('P/VC',e.pvc!=null?nf(e.pvc,2):'—')+it('VE/EBITDA',e.ev_ebitda!=null?nf(e.ev_ebitda,1):'—')+
    it('Rent. caja libre',pc(e.fcf_yield,1))+it('PER de su grupo',(e.per_grupo!=null?nf(e.per_grupo,1):'—')+(e.per_vs_grupo!=null?' (esta: '+nf(e.per_vs_grupo,2)+'×)':''))+
    it('Dividendo 12m',e.dpa_12m!=null?nf(e.dpa_12m,3)+' €/acc.':'—')+it('Payout',pc(e.payout,0))+it('Scrip',e.paga_scrip?'sí':'no')+
    it('Acciones (3 años)',e.dilucion!=null?(e.dilucion<0?'recompra '+pc(-e.dilucion,1)+'/año':(e.dilucion>0?'dilución '+pc(e.dilucion,1)+'/año':'estable')):'—')+
    it('Rent. accionista',pc(e.rent_accionista,1)+' <small style="display:inline;color:#94a3b8">(RPD + ½ recompra)</small>')+
    it('Nº acciones',esc(e.acciones_fuente||'—'))+'</div>';
  if(e.salto){ var S=(j.salto||[]); h+='<div class="sv3-dg"><div><span>Termómetro del salto al Continuo:</span> '+salto(e)+' '+(e.salto_n||0)+' de 5</div>'+
    S.map(function(s){ var k=s[0]; return '<div>'+(e.salto[k]?'✅':'▫️')+' '+esc(s[1]||k)+'</div>'; }).join('')+'</div>'; }
  if((e.avisos||[]).length) h+='<div class="sv3-dav">⚠ '+(e.avisos||[]).map(esc).join(' · ')+'</div>';
  if(e.puntos) h+='<div class="sv3-nota" style="margin:4px 0 0">Puntos del Radar: <b>'+nf(e.puntos.total,1)+'</b> (dividendo '+nf(e.puntos.dividendo)+' · calidad '+nf(e.puntos.calidad)+' · valoración '+nf(e.puntos.valoracion)+')'+(e.puntos.nota?' — '+esc(e.puntos.nota):'')+'</div>';
  return h;
}
function salto(e){ var S=(SV3.inf&&SV3.inf.salto)||[]; return '<span class="sv3-salto">'+S.map(function(s){ return '<i class="'+(e.salto&&e.salto[s[0]]?'ok':'')+'" title="'+esc(s[1]||s[0])+'"></i>'; }).join('')+'</span>'; }

/* ======================================================================== RADAR */
var _radV2=window.renderRadar;
window._renderRadarV2=_radV2;
window.renderRadar=function(){
  var sec=document.getElementById('view-radar'); if(!sec)return; css(); bind(sec);
  if(SV3.old.radar && typeof _radV2==='function'){ try{ return _radV2(); }catch(e){ SV3.old.radar=false; try{ console.error('[radar antiguo]',e); }catch(_){} } }
  sec.innerHTML=heroRad()+'<div class="muted" style="padding:10px">Cargando los puntos del método v3…</div>';
  cargarInf().then(function(j){ pintarRad(sec,j); }).catch(function(e){
    sec.innerHTML=heroRad()+'<div class="empty">No he podido leer <code>universo/informe.json</code> ('+esc(e.message)+'). <button type="button" class="sv3-btn" data-sv3old="radar">Ver el Radar antiguo</button></div>';
  });
};
function heroRad(){
  return '<div class="vhero g-amber"><div class="vhero-main"><span class="vhero-ic">🎯</span><div class="vhero-txt"><h2>Radar de Oportunidades</h2><p>Puntos de 0 a 100 del <b>método v3</b>: dividendo y recompras (35), calidad (35) y valoración por PER y precio/valor contable (30). Es un filtro grueso para elegir qué analizar, no una recomendación. Marca ★ y llévalas a la cola de Cobertura.</p></div></div></div>'+
    window._uniBotonInforme();
}
function barra(v,col){ v=Math.max(0,Math.min(100,v||0)); return '<i><span style="width:'+v+'%;background:'+col+'"></span></i>'; }
function pintarRad(sec,j){
  var F=SV3.fr, grupos=Object.keys(j.grupos||{}).sort(), C=j.continuo||[];
  var opt=function(v,txt,cur){ return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(txt)+'</option>'; };
  var mv=C.filter(function(e){ return e.cambio_puntos!=null && Math.abs(e.cambio_puntos)>=1; });
  var sube=mv.slice().sort(function(a,b){return b.cambio_puntos-a.cambio_puntos;}).filter(function(e){return e.cambio_puntos>0;}).slice(0,5);
  var baja=mv.slice().sort(function(a,b){return a.cambio_puntos-b.cambio_puntos;}).filter(function(e){return e.cambio_puntos<0;}).slice(0,5);
  var lm=function(L,cls){ return L.length?L.map(function(e){ return '<div>'+esc(e.ticker)+' '+esc(e.empresa)+' <span class="'+cls+'">'+(e.cambio_puntos>0?'+':'')+nf(e.cambio_puntos,1)+'</span> → '+nf(e.puntos&&e.puntos.total,1)+'</div>'; }).join(''):'<div class="muted">ninguna se mueve 1 punto o más</div>'; };
  var nSel=Object.keys(db().radarSel||{}).length;
  sec.innerHTML=heroRad()+
    '<div class="sv3-mov"><div><b>⬆ Suben esta semana</b> <span class="muted" style="font-size:10.5px">desde el '+esc((j.movimientos_desde||'').slice(8,10)+'-'+(j.movimientos_desde||'').slice(5,7))+'</span>'+lm(sube,'sv3-up')+'</div><div><b>⬇ Bajan esta semana</b>'+lm(baja,'sv3-dn')+'</div></div>'+
    '<div class="sv3-f">'+
      '<input type="search" placeholder="Buscar…" data-sv3fr="q" value="'+esc(F.q)+'">'+
      '<select data-sv3fr="grp">'+opt('','Todos los grupos',F.grp)+grupos.map(function(g){return opt(g,g,F.grp);}).join('')+'</select>'+
      '<select data-sv3fr="eti">'+opt('','Cualquier etiqueta',F.eti)+['Calidad','Barata','Crecimiento','Riesgo'].map(function(x){return opt(x,x,F.eti);}).join('')+'</select>'+
      '<select data-sv3fr="est">'+opt('','Todas',F.est)+opt('universo','Sin analizar',F.est)+opt('analizada','Analizadas',F.est)+opt('cartera','En cartera',F.est)+opt('sel','Marcadas ★',F.est)+'</select>'+
      '<select data-sv3fr="ord">'+opt('puntos','Orden: puntos',F.ord)+opt('dividendo','Orden: dividendo',F.ord)+opt('calidad','Orden: calidad',F.ord)+opt('valoracion','Orden: valoración',F.ord)+opt('cambio','Orden: cambio semana',F.ord)+opt('pergrupo','Orden: PER frente a su grupo',F.ord)+'</select>'+
      '<button type="button" class="sv3-btn pr" id="sv3AddCola">Añadir ★ a la cola ('+nSel+')</button>'+
      '<span class="sv3-n" id="sv3rN"></span>'+
    '</div>'+
    '<div class="sv3-t"><table><thead><tr><th class="l">★</th><th>#</th><th class="l">Empresa</th><th class="l" title="Total · barras: dividendo (verde), calidad (azul), valoración (ámbar)">Puntos</th><th class="l">Etiquetas</th><th class="l" title="Puesto dentro de su grupo de comparación">Grupo</th><th title="PER / PER mediano del grupo (menos de 1 = más barata que su grupo)">PER/grupo</th><th title="RPD + ½ recompra que amortiza">Rent. acc.</th><th title="Avisos del cálculo">⚠</th><th class="l">Cola</th></tr></thead><tbody id="sv3rB"></tbody></table></div>'+
    '<div class="sv3-nota">Etiquetas: '+Object.keys(j.criterios||{}).map(function(k){ return '<span class="sv3-et '+esc(k)+'">'+esc(k)+'</span> '+esc(j.criterios[k]); }).join(' · ')+'</div>'+
    '<div class="sv3-h3">BME Growth — candidatas al salto ('+(j.growth||[]).length+')</div>'+
    '<div class="sv3-nota">Fuera del ranking general: cuentas más cortas y normas a veces distintas. El termómetro cuenta cuántas de las 5 señales del salto al Continuo cumplen ('+((j.salto||[]).map(function(s){return esc(s[0]);}).join(', '))+').</div>'+
    '<div class="sv3-t"><table><thead><tr><th class="l">Empresa</th><th class="l">Salto</th><th>Puntos</th><th>Ventas</th><th>Benef.</th><th>ROE</th><th>PER</th><th>Crec. ventas</th><th>⚠</th></tr></thead><tbody id="sv3gB"></tbody></table></div>'+
    '<div class="sv3-nota"><button type="button" class="sv3-btn sv3-sm" data-sv3old="radar">Ver el Radar antiguo (Yahoo)</button></div>';
  if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  filasRad(); filasGrowth();
}
function filasRad(){
  var j=SV3.inf; if(!j)return; var H=held(), F=SV3.fr, q=(F.q||'').toLowerCase(), SEL=db().radarSel||{};
  var key={puntos:function(e){return -(e.puntos?e.puntos.total:-1);}, dividendo:function(e){return -(e.puntos?e.puntos.dividendo:-1);},
           calidad:function(e){return -(e.puntos?e.puntos.calidad:-1);}, valoracion:function(e){return -(e.puntos?e.puntos.valoracion:-1);},
           cambio:function(e){return -(e.cambio_puntos||0);}, pergrupo:function(e){return e.per_vs_grupo!=null&&e.per_vs_grupo>0?e.per_vs_grupo:99;}}[F.ord]||function(e){return e.puesto||999;};
  var L=(j.continuo||[]).filter(function(e){
    var st=estado(e,H);
    if(F.grp&&e.grupo_comp!==F.grp)return false; if(F.eti&&(e.etiquetas||[]).indexOf(F.eti)<0)return false;
    if(F.est==='sel'){ if(!SEL[e.ticker])return false; } else if(F.est&&st!==F.est)return false;
    if(q&&((e.ticker||'')+' '+(e.empresa||'')).toLowerCase().indexOf(q)<0)return false; return true; })
    .sort(function(a,b){ return key(a)-key(b) || (a.puesto||999)-(b.puesto||999); });
  var n=document.getElementById('sv3rN'); if(n)n.textContent=L.length+' de '+(j.continuo||[]).length;
  var B=document.getElementById('sv3rB'); if(!B)return;
  B.innerHTML=L.map(function(e){
    var st=estado(e,H), t=e.ticker, p=e.puntos||{}, cp=e.cambio_puesto;
    var mov=(cp==null||cp===0)?'':(cp>0?' <span class="sv3-up" title="puestos que sube en la semana">▲'+cp+'</span>':' <span class="sv3-dn" title="puestos que baja en la semana">▼'+(-cp)+'</span>');
    var cola=(st!=='universo')?'<span class="muted" style="font-size:10.5px">'+(st==='cartera'?'en cartera':'analizada')+'</span>':
      (enCola(t)?'<span class="muted" style="font-size:10.5px">en cola</span>':'<button type="button" class="sv3-btn sv3-sm" data-sv3cola="'+esc(t)+'">→ cola</button>');
    var tr='<tr class="r'+(st==='cartera'?' hc':(st==='analizada'?' ha':''))+'" data-sv3rrow="'+esc(t)+'">'+
      '<td class="l"><input type="checkbox" data-sv3sel="'+esc(t)+'"'+(SEL[t]?' checked':'')+'></td>'+
      '<td>'+(e.puesto||'—')+mov+'</td>'+
      '<td class="l e"><b>'+esc(t)+'</b> '+esc(e.empresa)+estChip(st)+'</td>'+
      '<td class="l"><span class="sv3-pt"><b>'+(p.total!=null?nf(p.total,1):'—')+'</b><span class="sv3-bars" title="dividendo '+nf(p.dividendo)+' · calidad '+nf(p.calidad)+' · valoración '+nf(p.valoracion)+'">'+barra(p.dividendo,'#16a34a')+barra(p.calidad,'#2563eb')+barra(p.valoracion,'#d97706')+'</span></span></td>'+
      '<td class="l">'+(e.etiquetas||[]).map(function(x){return '<span class="sv3-et '+esc(x)+'">'+esc(x)+'</span>';}).join('')+'</td>'+
      '<td class="l" style="font-size:11px">'+esc(e.grupo_comp||'—')+(e.puesto_grupo?' <b>'+e.puesto_grupo+'/'+e.n_grupo+'</b>':'')+'</td>'+
      '<td>'+(e.per_vs_grupo!=null&&e.per_vs_grupo>0?'<span class="'+(e.per_vs_grupo<1?'sv3-up':'')+'">'+nf(e.per_vs_grupo,2)+'×</span>':'—')+'</td>'+
      '<td>'+pc(e.rent_accionista,1)+'</td>'+
      '<td>'+((e.avisos||[]).length?'<span class="sv3-av" title="'+esc((e.avisos||[]).join(' · '))+'">'+(e.avisos||[]).length+'</span>':'')+'</td>'+
      '<td class="l">'+cola+'</td></tr>';
    if(SV3.open['r'+t]) tr+='<tr class="sv3-det"><td colspan="10">'+detalle(e)+'</td></tr>';
    return tr; }).join('')||'<tr><td colspan="10" class="l muted">Ninguna empresa con esos filtros.</td></tr>';
}
function filasGrowth(){
  var j=SV3.inf; if(!j)return; var B=document.getElementById('sv3gB'); if(!B)return;
  var L=(j.growth||[]).slice().sort(function(a,b){ return (b.salto_n||0)-(a.salto_n||0) || ((b.puntos&&b.puntos.total)||0)-((a.puntos&&a.puntos.total)||0); });
  B.innerHTML=L.map(function(e){ var t=e.ticker;
    var tr='<tr class="r" data-sv3grow="'+esc(t)+'"><td class="l e"><b>'+esc(t)+'</b> '+esc(e.empresa)+'<small>'+esc(e.descripcion||'')+'</small></td>'+
      '<td class="l">'+salto(e)+' <b>'+(e.salto_n||0)+'/5</b></td><td>'+(e.puntos&&e.puntos.total!=null?nf(e.puntos.total,1):'—')+'</td>'+
      '<td>'+mill(e.ingresos)+((e.moneda&&e.moneda!=='EUR')?' '+esc(e.moneda):'')+'</td><td>'+mill(e.beneficio)+'</td><td>'+pc(e.roe,1)+'</td><td>'+(e.per!=null&&e.per>0?nf(e.per,1):'—')+'</td><td>'+pc(e.cagr_ing,1)+'</td>'+
      '<td>'+((e.avisos||[]).length?'<span class="sv3-av" title="'+esc((e.avisos||[]).join(' · '))+'">'+(e.avisos||[]).length+'</span>':'')+'</td></tr>';
    if(SV3.open['g'+t]) tr+='<tr class="sv3-det"><td colspan="9">'+detalle(e)+'</td></tr>';
    return tr; }).join('');
}

/* ======================================================================== COBERTURA */
var _cobV2=window.renderCobertura;
window.renderCobertura=function(){
  try{ if(typeof _cobV2==='function') _cobV2(); }catch(e){ try{ console.error('[cobertura antigua]',e); }catch(_){} }
  var sec=document.getElementById('view-cobertura'); if(!sec)return; css(); bind(sec);
  var host=document.createElement('div'); host.id='sv3cob';
  host.innerHTML='<div class="sv3-h3">📅 Calendario de resultados del universo</div><div class="muted" style="font-size:12px">Cargando…</div>';
  sec.appendChild(host);
  Promise.all([cargarRec(), cargarInf().catch(function(){return null;})]).then(function(){ pintarCob(host); });
};
function pintarCob(host){
  var nom={}; if(SV3.inf) todas(SV3.inf).forEach(function(e){ nom[e.ticker]=e.empresa; });
  var H=held(), est={}; if(SV3.inf) todas(SV3.inf).forEach(function(e){ est[e.ticker]=estado(e,H); });
  var h='<div class="sv3-h3">📅 Calendario de resultados del universo</div>';
  var C=SV3.cal;
  if(!C||!C.empresas){
    h+='<div class="sv3-cal muted">Todavía no hay calendario en el repositorio. Lo sube sola la recogida diaria de tu PC (laborables 09:30 y 20:00).</div>';
  } else {
    var t=(C.temporadas||[])[0], hoy=new Date(); hoy.setHours(0,0,0,0);
    var lim=new Date(hoy.getTime()+14*864e5), atras=new Date(hoy.getTime()-3*864e5), dias={}, pend=0, pub=0;
    Object.keys(C.empresas).forEach(function(tk){ var e=(C.empresas[tk]||{})[t]; if(!e||!e.fecha)return;
      if(e.estado==='publicado')pub++; else pend++;
      var f=new Date(e.fecha+'T00:00:00'); var fp=e.publicado?new Date(e.publicado+'T00:00:00'):null;
      var ref=(e.estado==='publicado'&&fp)?fp:f; if(ref<atras||ref>lim)return;
      var k=(e.estado==='publicado'&&e.publicado)?e.publicado:e.fecha; (dias[k]=dias[k]||[]).push({tk:tk,e:e}); });
    var D=['dom','lun','mar','mié','jue','vie','sáb'];
    h+='<div class="sv3-nota">Temporada <b>'+esc(t||'')+'</b> · '+pub+' publicadas · '+pend+' pendientes · calendario del '+esc((C.generado||'').slice(8,10)+'-'+(C.generado||'').slice(5,7)+' '+(C.generado||'').slice(11,16))+'. <span class="sv3-src conf">confirmada</span> = la empresa lo anunció a la CNMV o Yahoo lo confirma; <span class="sv3-src est">estimada</span> = misma fecha que el año pasado o cadencia.</div><div class="sv3-cal">';
    var ks=Object.keys(dias).sort();
    if(!ks.length) h+='<div class="muted">Nada entre hace 3 días y dentro de 14.</div>';
    ks.forEach(function(k){ var d=new Date(k+'T00:00:00');
      h+='<div class="d">'+D[d.getDay()]+' '+k.slice(8,10)+'-'+k.slice(5,7)+(d.getTime()===hoy.getTime()?' · HOY':'')+'</div>';
      dias[k].sort(function(a,b){ return (a.e.estado==='publicado')-(b.e.estado==='publicado') || a.tk.localeCompare(b.tk); }).forEach(function(x){ var e=x.e, conf=(e.fuente==='aviso'||e.fuente==='yahoo');
        h+='<div class="it"><b>'+esc(x.tk)+'</b> '+esc(nom[x.tk]||'')+estChip(est[x.tk])+
          (e.estado==='publicado'?' <span class="ok">✓ publicado</span>':' <span class="sv3-src '+(conf?'conf':'est')+'">'+(conf?'confirmada':'estimada')+'</span>'+(e.momento?' <span class="muted" style="font-size:11px">'+esc(e.momento)+'</span>':''))+'</div>'; });
    });
    h+='</div>';
  }
  h+='<div class="sv3-h3">📥 Novedades de la recogida</div>';
  var N=SV3.nov;
  if(!N){ h+='<div class="sv3-cal muted">Todavía no hay novedades en el repositorio.</div>'; }
  else {
    var u=N.ultima||{}, corte=new Date(Date.now()-7*864e5).toISOString().slice(0,16);
    var L=(N.historico||[]).filter(function(x){ return (x.cuando||'')>=corte && !/^otro/.test(x.tipo||''); }).slice().reverse();
    h+='<div class="sv3-nota">Última pasada: '+esc((u.cuando||'').replace('T',' '))+' ('+esc(u.modo||'')+', '+(u.duracion_min||0)+' min).';
    if((u.tocaban||[]).length) h+=' Tocaban: '+u.tocaban.map(function(r){ return esc(r.ticker)+(r.salio?' ✓':' …'); }).join(', ')+'.';
    h+='</div><div class="sv3-cal">'+(L.length?L.map(function(x){ return '<div class="it"><span class="muted" style="font-size:11px">'+esc((x.cuando||'').slice(8,10)+'-'+(x.cuando||'').slice(5,7))+'</span> <b>'+esc(x.ticker)+'</b> '+esc(x.empresa||'')+estChip(est[x.ticker])+' · '+esc(x.tipo||'')+' <span class="muted" style="font-size:11px">'+esc(((x.fichero||'').split('/').pop()||'').slice(0,80))+'</span></div>'; }).join(''):'<div class="muted">Nada nuevo en los últimos 7 días.</div>')+'</div>';
  }
  host.innerHTML=h;
}

/* ======================================================================== eventos (uno por sección) */
function bind(sec){
  if(sec._sv3)return; sec._sv3=true;
  sec.addEventListener('click',function(ev){
    var a=ev.target.closest('[data-sv3inf]'); if(a){ ev.preventDefault(); window._uniAbrirInforme(); return; }
    var v=ev.target.closest('[data-sv3volver]'); if(v){ SV3.old.universo=false; SV3.old.radar=false; if(sec.id==='view-universo')window.renderUniverso(); else window.renderRadar(); return; }
    var o=ev.target.closest('[data-sv3old]'); if(o){ var w=o.getAttribute('data-sv3old'); SV3.old[w]=true; if(w==='universo')window.renderUniverso(); else window.renderRadar(); return; }
    var c=ev.target.closest('[data-sv3cola]'); if(c){ ev.stopPropagation(); var t=c.getAttribute('data-sv3cola'); if(typeof colaAdd==='function'&&colaAdd(t)){ guardar(); } filasRad(); return; }
    if(ev.target.closest('#sv3AddCola')){ var S=db().radarSel||{}, n=0, H=held();
      Object.keys(S).forEach(function(t){ var e=(SV3.inf&&(SV3.inf.continuo||[]).concat(SV3.inf.growth||[]).find(function(x){return x.ticker===t;}))||{};
        if(e.ticker&&estado(e,H)!=='universo')return; if(typeof colaAdd==='function'&&colaAdd(t))n++; });
      guardar(); var b=ev.target.closest('#sv3AddCola'); if(b)b.textContent=n?('Añadidas '+n+' a la cola ✓'):'Ya estaban en la cola'; filasRad(); return; }
    if(ev.target.matches&&ev.target.matches('input[type=checkbox][data-sv3sel]'))return;
    var r=ev.target.closest('[data-sv3row]'); if(r){ var k='u'+r.getAttribute('data-sv3row'); SV3.open[k]=!SV3.open[k]; filasUni(); return; }
    r=ev.target.closest('[data-sv3rrow]'); if(r){ var k2='r'+r.getAttribute('data-sv3rrow'); SV3.open[k2]=!SV3.open[k2]; filasRad(); return; }
    r=ev.target.closest('[data-sv3grow]'); if(r){ var k3='g'+r.getAttribute('data-sv3grow'); SV3.open[k3]=!SV3.open[k3]; filasGrowth(); return; }
  });
  sec.addEventListener('change',function(ev){
    var x=ev.target;
    if(x.matches('input[data-sv3sel]')){ var t=x.getAttribute('data-sv3sel'); DB.radarSel=DB.radarSel||{}; if(x.checked)DB.radarSel[t]=true; else delete DB.radarSel[t]; guardar();
      var b=document.getElementById('sv3AddCola'); if(b)b.textContent='Añadir ★ a la cola ('+Object.keys(DB.radarSel).length+')'; return; }
    if(x.hasAttribute('data-sv3fu')){ SV3.fu[x.getAttribute('data-sv3fu')]=x.value; filasUni(); return; }
    if(x.hasAttribute('data-sv3fr')){ SV3.fr[x.getAttribute('data-sv3fr')]=x.value; filasRad(); return; }
  });
  sec.addEventListener('input',function(ev){
    var x=ev.target;
    if(x.getAttribute('data-sv3fu')==='q'){ SV3.fu.q=x.value; filasUni(); }
    if(x.getAttribute('data-sv3fr')==='q'){ SV3.fr.q=x.value; filasRad(); }
  });
}
})();
