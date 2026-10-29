/* APP NUEVA · Caja bróker al estilo nuevo (29-oct): cuatro cifras con icono, la tabla dentro de un bloque plegable y
   las columnas alineadas. Los datos y los cálculos son los de siempre (renderCaja / cajaMovs). */
(function(){
  if(typeof renderCaja!=='function') return;
  window._nCajaOpen=(window._nCajaOpen==null)?true:window._nCajaOpen;
  function cifras(){
    var cfg=DB.cajaConfig||{}, s=num(cfg.saldoIni||0), tin=0, tout=0, min=Infinity, minF='', hoy=new Date().toISOString().slice(0,10), n=0, prox=null;
    if(cfg.saldoIni!=null&&cfg.saldoIni!==''){ min=s; minF=cfg.fechaIni||''; }
    (typeof cajaMovs==='function'?cajaMovs():[]).forEach(function(mv){ s+=mv.entra-mv.sale; tin+=mv.entra; tout+=mv.sale; n++; if(s<min){ min=s; minF=mv.fecha; } if(mv.fecha>hoy&&(!prox||mv.fecha<prox.fecha)) prox=mv; });
    return {fin:s,tin:tin,tout:tout,min:min,minF:minF,n:n,prox:prox,hoy:(typeof _saldoCajaHoy==='function')?_saldoCajaHoy():null,hasta:cfg.hastaY};
  }
  var o=renderCaja;
  renderCaja=function(){
    o.apply(this,arguments);
    try{
      var sec=document.getElementById('view-caja'); if(!sec) return;
      var p=sec.querySelector('.vhero p'); if(p) p.innerHTML='Lo que entra y sale de la cuenta del bróker: <b>aportaciones</b>, <b>dividendos</b> y <b>compras</b>, con el saldo de cada día.';
      var C=cifras(), k=document.getElementById('cajaKpis');
      if(k) k.innerHTML='<div class="n-ctrl">'+
        nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'💶',t:'Saldo hoy',v:C.hoy!=null?fmt(C.hoy):'sin configurar',s:'proyectado al final del periodo: <b>'+fmt(C.fin)+'</b>'})+
        nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'⬇️',t:'Entradas',v:'+'+fmt(C.tin),vCls:'n-pos',s:'aportaciones y dividendos del periodo'})+
        nKpi({c:'#DC2626',bg:'#FEE2E2',ic:'⬆️',t:'Salidas',v:(C.tout>0.005?'−':'')+fmt(C.tout),vCls:C.tout>0.005?'n-neg':'',s:'compras y custodia'})+
        nKpi({c:C.min<0?'#DC2626':'#D97706',bg:C.min<0?'#FEE2E2':'#FEF3C7',ic:'📉',t:'Saldo mínimo',v:isFinite(C.min)?fmt(C.min):'—',vCls:C.min<0?'n-neg':'',s:isFinite(C.min)&&C.minF?('el punto más bajo: '+ddmmyyyy(C.minF)):'el punto más bajo del periodo'})+'</div>';
      var t=document.getElementById('cajaTabla');
      if(t&&!document.getElementById('nCajaBlk')){
        var b=document.createElement('div'); b.id='nCajaBlk'; b.className='pos-blk n-blk'+(window._nCajaOpen?' open':'');
        b.innerHTML='<div class="pos-blk-h" data-ncajablk="1"><span class="arw">▶</span><span class="bt">📒 Movimientos de la caja</span><span class="bsum"></span></div><div class="pos-blk-b"><div class="blk-pad"></div></div>';
        t.parentNode.insertBefore(b,t); b.querySelector('.blk-pad').appendChild(t);
      }
      var bs=document.querySelector('#nCajaBlk .bsum'); if(bs) bs.textContent=C.n+' movimientos'+(C.prox?' · el próximo: '+C.prox.concepto+' el '+ddmmyyyy(C.prox.fecha):'');
    }catch(e){ console.error('n-caja',e); }
  };
  document.addEventListener('click',function(e){ var h=e.target.closest&&e.target.closest('[data-ncajablk]'); if(!h) return; var b=h.parentElement; b.classList.toggle('open'); window._nCajaOpen=b.classList.contains('open'); });
})();
