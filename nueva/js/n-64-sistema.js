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
  function enganchar(){
    montar();
    if(typeof activarVista==='function'&&!activarVista._nsis){ var oa=activarVista; activarVista=function(v){
      if(REDIR[v]){ arguments[0]=v=REDIR[v]; }
      var r=oa.apply(this,arguments);
      var hijo=DENTRO[v]; if(hijo){ var H=document.getElementById('view-'+hijo); if(H) H.classList.add('active'); setTimeout(function(){ try{ if(typeof renderView==='function') renderView(hijo); }catch(e){} },80); }
      return r; }; activarVista._nsis=1; }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
