/* APP NUEVA · Un dividendo ya anotado no sale además como previsto (1-nov-2026, Carlos: «Un error, dos pagos de Santander…»).
   Agenda y calendario mostraban SAN el 1-nov (el cobro anotado en la ficha) y otra vez el 2-nov (el pago previsto de
   Evolución). La lista de «por cobrar» (_calPendNoReg) ya lo quitaba desde el arreglo del 1-nov, pero los eventos del año
   (calEventosAnio, que usan Agenda, Panel y Calendario) se montan aparte. Ahora un pago previsto FUTURO de tu cartera solo se
   enseña si sigue en la lista de por cobrar; si ya lo anotaste, queda el cobro anotado y nada más. */
(function(){
  if(typeof calEventosAnio!=='function'||typeof _calPendNoReg!=='function') return;
  var o=calEventosAnio;
  calEventosAnio=function(year){ var r=o.apply(this,arguments);
    try{ var hoy=(typeof _calHoy==='function')?_calHoy():new Date().toISOString().slice(0,10), C={};
      return (r||[]).filter(function(e){ if(!e||e.tipo!=='pago'||e.cobrado||!(e.fecha>hoy)||e.grp!=='cartera') return true;
        var k=e.t+'|'+e.fecha.slice(0,4); if(!C[k]){ C[k]={}; (_calPendNoReg(e.t,+e.fecha.slice(0,4))||[]).forEach(function(p){ C[k][p.fecha]=1; }); }
        return !!C[k][e.fecha]; });
    }catch(err){ return r; } };
})();
