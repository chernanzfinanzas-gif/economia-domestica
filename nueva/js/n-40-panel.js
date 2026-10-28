/* APP NUEVA · Panel (boceto 28-oct aprobado: «como panel me parece perfecto»)
   Orden: Avisos · Mi cartera (lo de «Mi cartera hoy», con sus posiciones y «Cerca de entrada») ·
   Agenda de los próximos 30 días (mínimo 5) · Presupuesto · Salud financiera.
   «Mi cartera hoy» deja de ser una subpestaña: vive dentro del Panel. */
(function(){
  if(typeof renderPanelDash!=='function') return;
  var TIPO={exdiv:['EX-DIV','#16A34A'],pago:['PAGO','#0D9488'],junta:['JUNTA','#7C3AED'],res:['RESULTADOS','#2563EB']};
  function agenda(){
    if(typeof calAgenda!=='function') return '';
    var hoy=new Date(); var hS=hoy.toISOString().slice(0,10), lim=new Date(hoy.getTime()+30*864e5).toISOString().slice(0,10);
    var evs=[]; try{ evs=calAgenda(hS); }catch(e){ return ''; }
    var en30=evs.filter(function(e){ return e.fecha<=lim; }); if(en30.length<5) en30=evs.slice(0,5);
    if(!en30.length) return '';
    var held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
    var rows=en30.slice(0,12).map(function(e){ var tp=TIPO[e.tipo]||[String(e.tipo||'').toUpperCase(),'#64748B']; var nm=(typeof _calNombre==='function')?_calNombre(e.t):e.t;
      var det=(e.tipo==='exdiv'||e.tipo==='pago')&&e.imp>0?(' · '+(Math.round(e.imp*1000)/1000).toLocaleString('es-ES',{maximumFractionDigits:3})+' €/acc'+(e.sh>0?' ≈ '+fmt(e.imp*e.sh)+' bruto':'')+(e.previsto?' (previsto)':'')):(e.tipo==='res'&&e.periodo?' · '+e.periodo:'');
      var p=e.fecha.split('-'); var f=(+p[2])+'-'+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][+p[1]-1];
      return '<div class="n-ag"><b class="f">'+f+'</b><span class="tp" style="background:'+tp[1]+'">'+tp[0]+'</span><span class="tx"><b data-ficha="'+e.t+'">'+nm+'</b>'+det+(held.has(e.t)?' · <em>en cartera</em>':'')+'</span></div>'; }).join('');
    return '<div class="n-panel-sec" id="nAgenda"><div class="n-psh"><b>Agenda · próximos 30 días</b><span data-goto="calendario">ver el calendario completo →</span></div>'+rows+'</div>';
  }
  function montar(){
    var pv=document.getElementById('view-panel'), mc=document.getElementById('view-micartera'), av=document.getElementById('panelAvisos');
    if(!pv||!mc||!av) return;
    if(mc.parentNode!==pv){ mc.classList.add('n-inpanel'); var anchor=av.closest('.blk')||av; anchor.insertAdjacentElement('afterend',mc); }
    var old=document.getElementById('nAgenda'); if(old) old.remove();
    var h=agenda(); if(h) mc.insertAdjacentHTML('afterend',h);
  }
  var o=renderPanelDash;
  renderPanelDash=function(){ o.apply(this,arguments); try{ montar(); if(typeof renderMiCartera==='function') renderMiCartera(); }catch(e){ console.error('n-panel',e); } };
  /* si algo pide abrir «Mi cartera hoy», se abre el Panel */
  function vigilar(){ var mc=document.getElementById('view-micartera'); if(!mc||!window.MutationObserver) return;
    new MutationObserver(function(){ if(mc.classList.contains('active')&&mc.classList.contains('n-inpanel')&&typeof activarVista==='function'){ mc.classList.remove('active'); activarVista('panel'); } }).observe(mc,{attributes:true,attributeFilter:['class']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',vigilar); else vigilar();
  document.addEventListener('click',function(e){ var g=e.target.closest&&e.target.closest('#nAgenda [data-goto]'); if(g&&typeof activarVista==='function') activarVista(g.getAttribute('data-goto')); });
})();
