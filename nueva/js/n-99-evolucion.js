/* APP NUEVA · EMPRESAS → EVOLUCIÓN (3-nov-2026). Carlos 17:06: «una tabla de KPI para ver cómo evolucionan 5-7 métricas,
   qué empresas van bien y cuáles van mal, comparando un ejercicio con el anterior… con las de cartera, plan, analizadas y
   universo». 17:10: «verdes 3 puntos, ámbar 1, rojo 0, y ordenarlas por más puntos»; 8.ª métrica: conversión en caja.
   Datos: fichas/_evolucion.json (motor/evolucion.py del Método v3, sube solo cada hora). La cartera y el plan se cruzan
   aquí, en el aparato: el fichero del repositorio no sabe qué tienes. Pinchar una analizada → su Ficha. */
(function(){
  var R=null, tab=null, peorPrimero=false;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function n(v,d){ if(v==null||!isFinite(+v)) return '—'; return (+v).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'}); }
  function cargar(){ if(R) return Promise.resolve(R);
    return fetch('fichas/_evolucion.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(j){ R=j; return R; }); }
  function cartera(){ var s={}; try{ (typeof invPositions==='function'?invPositions():[]).forEach(function(p){ if(p.acciones>0.0001) s[String(p.ticker||p.t||'').toUpperCase()]=1; }); }catch(e){} return s; }
  function plan(C){ var s={}; try{ var sc=(typeof _planReparto==='function')?(_planReparto().sched||{}):{}; Object.keys(sc).forEach(function(t){ var T=t.toUpperCase(); if(!C[T]&&Object.keys(sc[t]||{}).some(function(y){ return +sc[t][y]>0; })) s[T]=1; }); }catch(e){} return s; }
  function analizadas(){ var s={}; (R.empresas||[]).forEach(function(e){ if(e.grupo==='analizada') s[e.ticker]=1; }); try{ Object.keys(window._nAn35||{}).forEach(function(t){ s[t]=1; }); }catch(e){} return s; }
  function css(){ if(document.getElementById('nEvCss')) return; var st=document.createElement('style'); st.id='nEvCss'; st.textContent=
    '#view-evolucion .ev-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}#view-evolucion .ev-tab{border:1px solid #CBD5E1;background:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;color:#334155;cursor:pointer}'+
    '#view-evolucion .ev-tab.on{background:#1F4A9A;border-color:#1F4A9A;color:#fff}#view-evolucion .ev-tab i{font-style:normal;opacity:.7;margin-left:4px}'+
    '#view-evolucion .ev-w{overflow-x:auto;-webkit-overflow-scrolling:touch;background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.08)}'+
    '#view-evolucion table{border-collapse:collapse;width:100%;font-size:12.5px}#view-evolucion th{position:sticky;top:0;background:#F8FAFC;color:#64748B;font-size:10.5px;letter-spacing:.03em;text-transform:uppercase;padding:9px 8px;text-align:center;border-bottom:1px solid #E2E8F0;white-space:nowrap}'+
    '#view-evolucion td{padding:7px 8px;border-bottom:1px solid #EEF2F6;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}'+
    '#view-evolucion td.ev-e,#view-evolucion th.ev-e{text-align:left;position:sticky;left:0;background:#fff;z-index:1;min-width:150px;box-shadow:1px 0 0 #EEF2F6}#view-evolucion th.ev-e{background:#F8FAFC;z-index:2}'+
    '#view-evolucion .ev-tk{font-weight:800;color:#1B3260}#view-evolucion .ev-tk.ln{cursor:pointer;text-decoration:underline dotted}#view-evolucion .ev-nm{display:block;font-size:11px;color:#64748B;max-width:170px;overflow:hidden;text-overflow:ellipsis}'+
    '#view-evolucion .ev-c{display:inline-flex;align-items:center;gap:5px}#view-evolucion .ev-d{width:9px;height:9px;border-radius:50%;flex:none}'+
    '#view-evolucion .V .ev-d{background:#16A34A}#view-evolucion .A .ev-d{background:#F59E0B}#view-evolucion .R .ev-d{background:#DC2626}#view-evolucion .X{color:#CBD5E1}'+
    '#view-evolucion .R .ev-t{color:#B91C1C}#view-evolucion .V .ev-t{color:#166534}'+
    '#view-evolucion .ev-n{font-weight:800;font-size:15px}#view-evolucion .ev-bar{height:5px;border-radius:3px;background:#E2E8F0;margin-top:3px;overflow:hidden;width:64px}#view-evolucion .ev-bar b{display:block;height:100%}'+
    '#view-evolucion .ev-pd{font-size:10px;color:#94A3B8;display:block}#view-evolucion .ev-pie{font-size:12px;color:#64748B;margin:10px 2px}'+
    '#view-evolucion .ev-ord{border:0;background:none;color:#1F4A9A;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;margin-left:auto}#view-evolucion .ev-bar2{display:flex;align-items:center;gap:8px;margin:0 0 8px;flex-wrap:wrap}'+
    '#view-evolucion .ev-ley{font-size:12px;color:#475569;line-height:1.6}';
    document.head.appendChild(st); }
  function color(x){ return x>=16?'#16A34A':(x>=10?'#F59E0B':'#DC2626'); }
  function pintar(){
    var v=document.getElementById('view-evolucion'); if(!v) return; css();
    if(!R){ v.innerHTML='<div class="nf-mu" style="padding:20px">Cargando la evolución…</div>'; cargar().then(function(){ if(R) pintar(); else v.innerHTML='<div class="nf-card" style="padding:20px">Todavía no hay tabla de evolución publicada. La deja el Método v3 en la subida de datos de cada hora.</div>'; }); return; }
    var C=cartera(), P=plan(C), A=analizadas(), E=R.empresas||[];
    var G={cartera:E.filter(function(e){ return C[e.ticker]; }), plan:E.filter(function(e){ return P[e.ticker]; }), analizadas:E.filter(function(e){ return A[e.ticker]; }), universo:E};
    if(!tab) tab=G.cartera.length?'cartera':'universo';
    var L=G[tab].slice().sort(function(a,b){ if(a.pocos_datos!==b.pocos_datos) return a.pocos_datos?1:-1; var d=(b.nota||0)-(a.nota||0); return peorPrimero?-d:d; });
    var ok=L.filter(function(e){ return !e.pocos_datos; }), bien=ok.filter(function(e){ return e.nota>=16; }).length, mal=ok.filter(function(e){ return e.nota<10; }).length;
    var M=R.metricas||[], TT={cartera:'Cartera',plan:'Plan de compras',analizadas:'Analizadas',universo:'Universo'};
    var h='<div class="vhero g-violet"><div class="vhero-main"><span class="vhero-ic">📊</span><div class="vhero-txt"><h2>Evolución de las empresas</h2><p>Último ejercicio frente al anterior, en 8 métricas. Verde 3 puntos, ámbar 1, rojo 0: nota sobre 24.</p></div></div></div>'+
      '<div class="n-ctrl">'+
      nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'🟢',t:'Van bien',v:String(bien),vCls:'n-pos',s:'nota 16 o más de '+ok.length+' en '+TT[tab]})+
      nKpi({c:'#F59E0B',bg:'#FEF3C7',ic:'🟡',t:'Regular',v:String(ok.length-bien-mal),s:'nota entre 10 y 16'})+
      nKpi({c:'#DC2626',bg:'#FEE2E2',ic:'🔴',t:'Van mal',v:String(mal),vCls:mal?'n-neg':'',s:'nota por debajo de 10'})+
      nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'🗓️',t:'Datos',v:(R.generado||'').slice(8,10)+'/'+(R.generado||'').slice(5,7),s:'cuentas oficiales de la CNMV (nivel base del Método v3) · '+E.length+' empresas'})+'</div>'+
      '<div class="ev-bar2"><div class="ev-tabs">'+['cartera','plan','analizadas','universo'].map(function(k){ return '<button class="ev-tab'+(tab===k?' on':'')+'" data-evtab="'+k+'">'+TT[k]+'<i>'+G[k].length+'</i></button>'; }).join('')+'</div>'+
      '<button class="ev-ord" data-evord="1">'+(peorPrimero?'↑ Mejores primero':'↓ Peores primero')+'</button></div>';
    if(!L.length){ h+='<div class="nf-card" style="padding:16px">No hay empresas en '+TT[tab]+(tab==='plan'?' (el plan de compras está en Plan → Asignación).':'.')+'</div>'; v.innerHTML=h; return; }
    h+='<div class="ev-w"><table><thead><tr><th class="ev-e">Empresa</th><th>Nota</th>'+M.map(function(m){ return '<th title="'+esc(m.t+': va bien si '+m.q)+'">'+esc(m.t)+'</th>'; }).join('')+'</tr></thead><tbody>'+
      L.map(function(e){ var K=e.kpi||{};
        var celdas=M.map(function(m){ var k=K[m.k]||{}; if(!k.s) return '<td class="X" title="'+esc(k.txt||'no se puede medir')+'">'+(k.txt?'<span style="font-size:11px">'+esc(k.txt)+'</span>':'—')+'</td>';
          var tip=(k.nota?k.nota+' · ':'')+(k.antes!=null&&k.ahora!=null?'antes '+n(k.antes,2)+' → ahora '+n(k.ahora,2):'');
          return '<td class="'+k.s+'" title="'+esc(tip)+'"><span class="ev-c"><span class="ev-d"></span><span class="ev-t">'+esc(k.txt||'')+'</span></span></td>'; }).join('');
        var nt=e.nota, ln=A[e.ticker]&&window.nfAbrir;
        return '<tr><td class="ev-e"><span class="ev-tk'+(ln?' ln" data-evfi="'+e.ticker:'')+'">'+esc(e.ticker)+'</span>'+(C[e.ticker]?' <span title="en cartera">💼</span>':'')+'<span class="ev-nm">'+esc(e.empresa)+' · '+esc(e.ejercicio)+'</span></td>'+
          '<td><span class="ev-n" style="color:'+color(nt)+'">'+n(nt,0)+'</span><div class="ev-bar"><b style="width:'+Math.round((nt||0)/24*100)+'%;background:'+color(nt)+'"></b></div>'+(e.pocos_datos?'<span class="ev-pd">pocos datos ('+e.n+')</span>':'')+'</td>'+celdas+'</tr>'; }).join('')+
      '</tbody></table></div>'+
      '<div class="ev-pie ev-ley"><b>Cuándo es verde</b> · Ventas ≥ +3 % (ámbar hasta −3 %) · Margen sube ≥ 0,5 puntos · Beneficio por acción ≥ +5 % (ámbar hasta −5 %) · Nº de acciones sube como mucho un 0,2 % (ámbar hasta 1 %; más es dilución; las liberadas no cuentan) · Deuda neta/EBITDA no sube más de 0,1 o hay caja neta (rojo si pasa de 4 o sube más de 0,5) · Caja libre/dividendo ≥ 1,5 (ámbar ≥ 1) · Dividendo por acción ordinario ≥ +3 % (ámbar hasta −2 %) · Conversión en caja ≥ 80 % del beneficio (ámbar ≥ 50 %).<br>'+
      '<b>Bancos</b>: margen de intereses, eficiencia, CET1 y ROE en lugar de ventas, margen, deuda y cobertura. <b>Aseguradoras</b>: primas y ROE. <b>Inmobiliarias</b>: deuda neta/activo. Lo que no se puede medir no cuenta y la nota se escala a 24; con menos de 5 métricas, «pocos datos». Pasa el dedo o el ratón por una cifra para ver el antes y el ahora.</div>';
    v.innerHTML=h;
  }
  document.addEventListener('click',function(e){ if(!e.target.closest) return;
    var t=e.target.closest('[data-evtab]'); if(t){ tab=t.getAttribute('data-evtab'); pintar(); return; }
    if(e.target.closest('[data-evord]')){ peorPrimero=!peorPrimero; pintar(); return; }
    var f=e.target.closest('[data-evfi]'); if(f&&window.nfAbrir){ window.nfAbrir(f.getAttribute('data-evfi')); } });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._nev) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='evolucion') pintar(); return r; }; activarVista._nev=1; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
