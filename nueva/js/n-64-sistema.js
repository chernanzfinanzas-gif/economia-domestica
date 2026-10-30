/* APP NUEVA · Sistema (decidido con Carlos 30-oct, 19:26 «vale»): de 13 pestañas a 6, sin rediseño.
   Cobertura · Mis Decisiones · Estado del método (con el Backtest dentro) · Informes (con la Hemeroteca dentro)
   · Gráficas · Tareas (el «Monitor de seguimiento» lo da ya Analizadas).
   Fuera del menú: Diario de Hechos (está en la ficha de la empresa) y las antiguas Análisis, Radar,
   Ficha de Tesis y Visión de conjunto (las sustituyen Analizadas, Universo y la Ficha). Quien enlace a ellas
   (avisos del Panel, botones) llega a su sustituta. */
(function(){
  var REDIR={radar:'unin',analisis:'analizadas',tesisinv:'fichaemp',vision:'inversiones',hechos:'fichaemp',backtest:'estado',hemero:'informes'};
  var DENTRO={estado:'backtest',informes:'hemero'};
  function meter(padre,hijo,titulo){
    var P=document.getElementById('view-'+padre), H=document.getElementById('view-'+hijo); if(!P||!H||H._ns) return;
    var w=document.createElement('div'); w.className='ns-sub'; w.innerHTML='<div class="ns-subh">'+titulo+'</div>';
    P.appendChild(w); w.appendChild(H); H.classList.add('ns-in'); H._ns=1;
  }
  function montar(){
    meter('estado','backtest','🧪 Backtest del método · si tus decisiones y tus puntuaciones aciertan');
    meter('informes','hemero','🗄️ Hemeroteca · informes semanales y dossiers publicados');
    var M=document.getElementById('view-monitor');
    if(M&&!M._ns){ M._ns=1; var h=M.querySelector('.vhero h2'), p=M.querySelector('.vhero p'); if(h) h.textContent='Tareas'; if(p) p.textContent='Tu lista de acciones pendientes, con fecha límite y el porqué de cada una.'; M.classList.add('ns-tareas'); }
  }
    /* ---- depuración 30-oct (revisión con Carlos) ---- */
  var TXT=[[/Radar Op\.?/g,'Universo'],[/Radar\/Universo/g,'Universo']];
  function textos(root){ if(!root) return; var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null), n, cambios=[];
    while((n=w.nextNode())){ var t=n.nodeValue; if(!/Radar/.test(t)) continue; var u=t; TXT.forEach(function(r){ u=u.replace(r[0],r[1]); }); if(u!==t) cambios.push([n,u]); }
    cambios.forEach(function(c){ c[0].nodeValue=c[1]; }); }
  /* Novedades de la recogida: solo los documentos recientes (fecha del documento a menos de 30 días de cuando se recogió);
     lo descargado de años anteriores (rellenos de la Biblioteca) queda detrás de «ver también». */
  function novedades(){
    var V=document.getElementById('view-cobertura'); if(!V) return;
    var h=[].slice.call(V.querySelectorAll('.sv3-h3')).filter(function(e){ return /Novedades/.test(e.textContent); })[0]; if(!h) return;
    var cal=h.nextElementSibling; while(cal&&!cal.classList.contains('sv3-cal')) cal=cal.nextElementSibling; if(!cal||cal._nsf) return; cal._nsf=1;
    var y=new Date().getFullYear(), viejos=0;
    [].slice.call(cal.querySelectorAll('.it')).forEach(function(it){ var tx=it.textContent, m=tx.match(/(20\d\d)-(\d\d)-(\d\d)/);
      if(!m) return; var d=new Date(m[0]+'T00:00:00'); if((Date.now()-d.getTime())>30*864e5){ it.classList.add('ns-viejo'); viejos++; } });
    if(viejos){ var b=document.createElement('div'); b.className='ns-vertodo'; b.innerHTML='<span>+ '+viejos+' documentos antiguos recogidos estos días (de años anteriores) · <u>ver también</u></span>';
      b.onclick=function(){ cal.classList.toggle('ns-vertodos'); b.querySelector('u').textContent=cal.classList.contains('ns-vertodos')?'ocultar':'ver también'; };
      cal.parentNode.insertBefore(b,cal.nextSibling); }
  }
  function estado(){
    var V=document.getElementById('view-estado'); if(!V) return;
    var h=V.querySelector('#view-metodo .vhero');
    if(h&&!h._ns){ h._ns=1; var t=h.querySelector('h2'), pp=h.querySelector('p'); if(t) t.textContent='Estado del método';
      if(pp) pp.textContent='Si el método acierta: lo que predijo cada tesis contra lo que hizo la cotización, y la salud de los datos.'; }
    /* los avisos de datos (saludDatos) van debajo de la cabecera y sus cifras, no encima */
    var sd=document.getElementById('saludDatos'), M=document.getElementById('view-metodo');
    if(sd&&M&&h&&sd.nextElementSibling&&sd.parentNode===M.parentNode){ var k=M.querySelector('.pos-kpis'); var ancla=(k&&k.parentNode===M)?k:h; if(ancla.nextSibling!==sd) M.insertBefore(sd,ancla.nextSibling); }
  }
  var obs=null;
  function vigilar(){
    if(obs) return; obs=new MutationObserver(function(){ clearTimeout(obs._t); obs._t=setTimeout(function(){
      try{ textos(document.getElementById('view-cobertura')); textos(document.getElementById('view-informes')); novedades(); estado(); }catch(e){} },120); });
    ['view-cobertura','view-informes','view-estado'].forEach(function(id){ var e=document.getElementById(id); if(e) obs.observe(e,{childList:true,subtree:true}); });
  }
  function enganchar(){
    montar(); vigilar();
    if(typeof activarVista==='function'&&!activarVista._nsis){ var oa=activarVista; activarVista=function(v){
      if(REDIR[v]){ arguments[0]=v=REDIR[v]; }
      var r=oa.apply(this,arguments);
      var hijo=DENTRO[v]; if(hijo){ var H=document.getElementById('view-'+hijo); if(H) H.classList.add('active'); setTimeout(function(){ try{ if(typeof renderView==='function') renderView(hijo); }catch(e){} },80); }
      return r; }; activarVista._nsis=1; }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
