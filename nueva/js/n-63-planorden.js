/* APP NUEVA · PLAN: Riesgo con Coyuntura dentro y «Opciones de futuro» (bocetos «Riesgo - boceto 29-oct v5» y
   «Opciones de futuro - boceto 29-oct»). Es el contenido real de las pestañas de siempre, sin quitar nada: solo cambia el
   orden y el marco. Riesgo = 1 · Cómo está hoy el mundo (antes Coyuntura) → 2 · Qué pasaría si se tuerce (escenarios) →
   3 · La estadística de tu cartera. Opciones de futuro = Capital pignorado + ¿Invertir en euros? (información, no plan). */
(function(){
  function paso(n,t,s){ var d=document.createElement('div'); d.className='np-paso'; d.innerHTML='<span class="np-n">'+n+'</span><div><b>'+t+'</b>'+(s?'<small>'+s+'</small>':'')+'</div>'; return d; }
  function montar(){
    try{
      var R=document.getElementById('view-riesgo'), C=document.getElementById('view-coyuntura'), PE=document.getElementById('pdEscenarios'), PR=document.getElementById('pdRiesgo');
      if(R&&C&&PE&&PR&&!R.querySelector('.np-paso')){
        var h=R.querySelector('.vhero'); var t=h&&h.querySelector('.vhero-txt p'); if(t) t.innerHTML='Tres pasos encadenados: <b>cómo está hoy el mundo</b> (antes Coyuntura) → <b>qué pasaría si se tuerce</b> (escenarios, que arrancan en esos valores de hoy) → <b>la estadística de tu cartera</b>.';
        var ref=h?h.nextSibling:R.firstChild;
        var p1=paso(1,'Cómo está hoy el mundo','antes «Coyuntura» · completa'); R.insertBefore(p1,ref); R.insertBefore(C,ref); C.classList.add('np-dentro'); var ch=C.querySelector('.vhero'); if(ch) ch.style.display='none';
        var p2=paso(2,'Qué pasaría si se tuerce','escenarios de shock, que arrancan en los valores de hoy'); R.insertBefore(p2,ref); R.insertBefore(PE,ref);
        var p3=paso(3,'La estadística de tu cartera','volatilidad, caídas, beta, correlaciones, concentración'); R.insertBefore(p3,ref); R.insertBefore(PR,ref);
      }
      var O=document.getElementById('view-opciones'), PG=document.getElementById('view-pignorado'), DV=document.getElementById('view-divisa');
      if(O&&PG&&DV&&!O.querySelector('.np-paso')){
        O.innerHTML='<div class="vhero g-violet"><div class="vhero-main"><span class="vhero-ic">🧭</span><div class="vhero-txt"><h2>Opciones de futuro</h2><p>Dos alternativas que quieres tener calculadas por si un día las usas: pedir prestado con la cartera de garantía en vez de vender, e invertir en dólares frente a hacerlo en euros. <b>No son parte del plan de hoy.</b></p></div></div></div>';
        O.appendChild(paso(1,'Capital pignorado','antes una pestaña')); O.appendChild(PG); PG.classList.add('np-dentro'); var gh=PG.querySelector('.vhero'); if(gh) gh.style.display='none';
        O.appendChild(paso(2,'¿Invertir en euros?','antes una pestaña')); O.appendChild(DV); DV.classList.add('np-dentro');
      }
      if(typeof VIEW_FNS!=='undefined'){ VIEW_FNS.riesgo=['renderCoyuntura','renderRiesgo','renderEscenarios']; VIEW_FNS.opciones=['renderPignorado','renderDivisa']; }
    }catch(e){ console.error('n-planorden',e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',montar); else setTimeout(montar,0);
})();
