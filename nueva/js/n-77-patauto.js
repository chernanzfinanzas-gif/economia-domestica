/* APP NUEVA · Patrimonio · REGISTRO QUE SE RELLENA SOLO (1-nov-2026, Carlos: «pongo una fecha y rellena lo que pueda automáticamente»)
   Al elegir la fecha del registro:
     · Invertido de cada cuenta de valores = acciones que tenías ESE día en ese bróker × precio de cierre de ese día
         Renta 4 / ING / Santander → lo Propio de cada bróker;  Susu SAN → la cartera Compartida.
     · Efectivo ING y Santander = saldo de esa fecha según los extractos importados en Movimientos.
     · Efectivo Renta 4 = efectivo + Foncuenta del extracto de R4 (si el extracto es de esa fecha, ±10 días).
     · Efectivo Susu SAN = dividendos NETOS de la Compartida cobrados hasta esa fecha.
     · Efectivo Casa = el del registro anterior (no sale de ningún extracto).
   Solo rellena casillas vacías o que había rellenado él; lo que tecleas tú manda. Al editar un registro antiguo no toca nada
   salvo que pulses «↻ Rellenar». */
(function(){
  if(typeof renderPatForm!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function r2(x){ return Math.round(x*100)/100; }
  function fd(f){ return f?f.slice(8,10)+'/'+f.slice(5,7)+'/'+f.slice(2,4):''; }
  function dias(a,b){ return Math.round(Math.abs(new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/864e5); }
  function cuenta(nombre){ var n=String(nombre).toLowerCase(); return (DB.cuentas||[]).filter(function(c){ return String(c.nombre||'').toLowerCase()===n; })[0]; }
  function saldoEn(src,f){ var H=(DB.bancoSaldoDia||{})[src]; if(!H) return null; var b=null; Object.keys(H).forEach(function(d){ if(d<=f&&(!b||d>b)) b=d; }); return b?{v:H[b],f:b}:null; }
  function brokerDe(o,t,car){ return o.broker||(typeof khBrokerRegla==='function'?khBrokerRegla(t,car):'Renta 4'); }
  /* acciones de cada ticker en cada cuenta de valores, a fin de ese día */
  function acciones(f){ var A={};
    function sumar(o,t,car){ if(!t||!(o.fecha<=f)) return; var c=(car||'Propia')==='Compartida'?'Susu SAN':brokerDe(o,t,car||'Propia');
      var k=c+'|'+t; A[k]=(A[k]||0)+(o.tipo==='venta'?-1:1)*num(o.acciones); }
    (DB.operaciones||[]).forEach(function(o){ sumar(o,(o.ticker||'').toUpperCase(),o.cartera); });
    (DB.cerradas||[]).forEach(function(c){ (c.ops||[]).forEach(function(o){ sumar(o,(c.ticker||'').toUpperCase(),c.cartera); }); });
    return A; }
  function divNetosCompartida(f){ var s=0, sh={};
    (DB.operaciones||[]).forEach(function(o){ if((o.cartera||'Propia')==='Compartida') sh[(o.ticker||'').toUpperCase()]=1; });
    Object.keys(sh).forEach(function(t){ ((DB.dividendos||{})[t]||[]).forEach(function(d){ var df=String(d.fecha||'').slice(0,10); if(!df||df>f) return;
      if(typeof divEsCobrado==='function'&&!divEsCobrado(d)) return;
      var acc=0; (DB.operaciones||[]).forEach(function(o){ if((o.ticker||'').toUpperCase()===t&&(o.cartera||'Propia')==='Compartida'&&o.fecha<df) acc+=(o.tipo==='venta'?-1:1)*num(o.acciones); });
      var neto=(typeof _evoNeto==='function')?_evoNeto(num(d.importe)):num(d.importe)*0.81; s+=acc*neto; }); });
    return r2(s); }
  function anterior(f){ var S=(typeof patSnaps==='function'?patSnaps():DB.patrimonio||[]).filter(function(s){ return s.fecha<f; }); return S.length?S[S.length-1]:null; }

  window.nPatCalcular=function(f){
    return Promise.resolve(typeof cargarPreciosCartera==='function'?cargarPreciosCartera():null).then(function(){
      var R={}, ms=Date.parse(f+'T23:59:59'), A=acciones(f), sinPrecio=[];
      function pon(nom,campo,v,fuente){ var c=cuenta(nom); if(!c||v==null||!isFinite(v)) return; R[c.id]=R[c.id]||{}; R[c.id][campo]={v:r2(v),src:fuente}; }
      /* invertido */
      var tot={}; Object.keys(A).forEach(function(k){ var p=k.split('|'), n=A[k]; if(Math.abs(n)<0.0001) return;
        var pr=(typeof priceAtFB==='function')?priceAtFB(p[1],ms):0; if(!(pr>0)){ sinPrecio.push(p[1]); return; } tot[p[0]]=(tot[p[0]]||0)+n*pr; });
      ['Renta 4','ING','Santander','Susu SAN'].forEach(function(c){ pon(c,'inv',tot[c]||0,'valor en bolsa al '+fd(f)); });
      /* efectivo */
      var si=saldoEn('ING',f); if(si) pon('ING','ef',si.v,'extracto ING del '+fd(si.f));
      var ss=saldoEn('SAN',f); if(ss) pon('Santander','ef',ss.v,'extracto Santander del '+fd(ss.f));
      var R4=(DB.bancoSaldos||{}).R4; if(R4&&dias(R4.fecha,f)<=10) pon('Renta 4','ef',R4.saldo,'extracto R4 del '+fd(R4.fecha)+' (Foncuenta + efectivo)');
      else try{ var X=window.nR4Xls&&window.nR4Xls(); if(X&&X.fondo&&dias(X.fecha,f)<=10){ var cash=0; (X.cash||[]).forEach(function(l){ if(l.fecha<=f&&l.saldo!=null) cash=l.saldo; });
        pon('Renta 4','ef',num(X.fondo.valor)+cash,'extracto R4 del '+fd(X.fecha)+' (Foncuenta + efectivo)'); } }catch(e){}
      pon('Susu SAN','ef',divNetosCompartida(f),'dividendos netos cobrados hasta el '+fd(f));
      var an=anterior(f), cc=cuenta('Efectivo Casa');
      if(an&&cc){ var l=(an.lineas||[]).filter(function(x){ return x.cuentaId===cc.id; })[0]; if(l) pon('Efectivo Casa','ef',num(l.ef),'el del registro del '+fd(an.fecha)); }
      return {R:R,sinPrecio:sinPrecio};
    });
  };
  function rellenar(forzar){
    var fe=document.getElementById('patFecha'); if(!fe||!fe.value) return; var f=fe.value, nota=document.getElementById('nPatAuto');
    if(nota) nota.textContent='Calculando…';
    window.nPatCalcular(f).then(function(o){ if(fe.value!==f) return; var n=0;
      [].slice.call(document.querySelectorAll('.patEf,.patInv')).forEach(function(i){ var c=i.getAttribute('data-c'), campo=i.classList.contains('patEf')?'ef':'inv', x=(o.R[c]||{})[campo];
        var lbl=i.parentElement&&i.parentElement.querySelector('.n-pa-src'); if(lbl) lbl.remove();
        if(!x) return; if(!forzar&&i.value!==''&&i.dataset.auto!=='1') return;
        i.value=x.v.toFixed(2); i.dataset.auto='1'; i.title='Rellenado solo: '+x.src; n++;
        i.insertAdjacentHTML('afterend','<span class="n-pa-src">'+E(x.src)+'</span>'); });
      if(nota) nota.innerHTML='✓ Rellenadas '+n+' casillas con lo que había a fecha <b>'+fd(f)+'</b>. Revisa y cambia lo que quieras: lo que tecleas tú manda.'+
        (o.sinPrecio.length?' <span style="color:#B45309">Sin precio ese día: '+E(o.sinPrecio.join(', '))+'.</span>':'');
    }).catch(function(e){ if(nota) nota.textContent='No se pudo calcular: '+e.message; });
  }
  var orig=renderPatForm;
  renderPatForm=function(){ var r=orig.apply(this,arguments);
    try{ var el=document.getElementById('patFormFields'); if(el&&!document.getElementById('nPatAuto')){
        el.insertAdjacentHTML('afterbegin','<div class="n-pa-bar"><button type="button" class="btn sm" id="nPatFill">↻ Rellenar con los datos de esa fecha</button> <span id="nPatAuto" class="muted"></span></div>'); }
      var fe=document.getElementById('patFecha'); if(fe&&!fe._npa){ fe._npa=1; fe.addEventListener('change',function(){ rellenar(false); }); }
      if(!window._nPatEditando) setTimeout(function(){ rellenar(false); },50);
    }catch(e){ console.warn('[patauto]',e); }
    return r; };
  if(typeof editSnapshot==='function'){ var oE=editSnapshot; editSnapshot=function(){ window._nPatEditando=true; try{ return oE.apply(this,arguments); } finally{ window._nPatEditando=false; } }; }
  document.addEventListener('click',function(e){ if(e.target&&e.target.id==='nPatFill') rellenar(true); });
  document.addEventListener('input',function(e){ var t=e.target; if(t&&t.classList&&(t.classList.contains('patEf')||t.classList.contains('patInv'))){ delete t.dataset.auto; var l=t.parentElement&&t.parentElement.querySelector('.n-pa-src'); if(l) l.remove(); } });
  var st=document.createElement('style'); st.textContent='.n-pa-bar{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px;font-size:12.5px}'+
    '.n-pa-src{display:block;font-size:10.5px;color:#15803D;margin-top:2px;line-height:1.3}input.patEf[data-auto="1"],input.patInv[data-auto="1"]{background:#F0FDF4;border-color:#86EFAC}';
  document.head.appendChild(st);
})();
