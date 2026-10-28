/* APP NUEVA · cálculo FIFO único (decidido con Carlos el 28-oct: «ha de cumplir el principio FIFO»).
   Cada venta consume primero las acciones más antiguas de ESA cartera (Propia y Compartida van aparte:
   son de titulares distintos). Lo usan a la vez la Cartera (posiciones) y los Lotes, para que digan lo mismo.
   Antes: la posición usaba precio medio tras una venta parcial y los Lotes enseñaban las compras enteras. */
function nFifo(lista){
  var ops=(lista||DB.operaciones||[]).slice().sort(invByFecha), q={}, open=[], sold=[];
  ops.forEach(function(o){
    var t=(o.ticker||'').toUpperCase(); if(!t) return; var car=o.cartera||'Propia', k=car+'|'+t, n=num(o.acciones); if(!(n>0)) return;
    var L=q[k]=q[k]||[];
    if(o.tipo==='venta'){
      var rest=n;
      while(rest>0.0001 && L.length){
        var l=L[0], take=Math.min(rest,l.acc), fr=take/l.acc;
        sold.push({ticker:t,cartera:car,fecha:l.fecha,acc:take,pc:l.pc,pcBruto:l.pcBruto,com:l.com*fr,comReg:l.comReg,pv:num(o.precio),fVenta:o.fecha||'',comV:khComision(o)*take/n,opId:o.id});
        l.com-=l.com*fr; l.acc-=take; rest-=take; if(l.acc<=0.0001) L.shift();
      }
      if(rest>0.0001) console.warn('[FIFO] venta sin acciones suficientes',t,car,o.fecha,rest);
    } else {
      var com=khComision(o); L.push({ticker:t,cartera:car,fecha:o.fecha||'',acc:n,pc:(n*num(o.precio)+com)/n,pcBruto:num(o.precio),com:com,comReg:khTieneComision(o)});
    }
  });
  Object.keys(q).forEach(function(k){ q[k].forEach(function(l){ if(l.acc>0.0001) open.push(l); }); });
  return {open:open, sold:sold};
}
function _nDivEntre(divArr,desde,hasta,acc){ var s=0; (divArr||[]).forEach(function(d){ var f=(d.fecha||''); if(f>=(desde||'') && (!hasta||f<hasta) && divEsCobrado(d)) s+=acc*num(d.importe); }); return s; }

/* Posiciones: acciones y coste de lo que queda, por FIFO */
_invPositionsCalc=function(){
  var F=nFifo(), map={};
  (DB.operaciones||[]).forEach(function(o){ var t=(o.ticker||'').toUpperCase(); if(!t)return; var car=o.cartera||'Propia'; map[car+'|'+t]=map[car+'|'+t]||{cartera:car,ticker:t,acc:0,cost:0,com:0,comReg:false}; });
  F.open.forEach(function(l){ var m=map[l.cartera+'|'+l.ticker]; m.acc+=l.acc; m.cost+=l.acc*l.pc; m.com+=l.com; if(l.comReg) m.comReg=true; });
  var out=[]; Object.keys(map).forEach(function(k){ var m=map[k]; var v=(DB.valores&&DB.valores[m.ticker])||{};
    var _pc=m.acc?m.cost/m.acc:0, _pi=precioActualInfo(m.ticker), _sin=!(_pi.p>0);
    out.push({cartera:m.cartera,ticker:m.ticker,nombre:v.nombre||m.ticker,acciones:m.acc,precioCompra:_pc,
      precioActual:_sin?_pc:_pi.p,sinPrecio:_sin,precioSrc:_pi.src,precioFecha:(_pi.src==='valores'?(v.precioFecha||''):(_pi.fecha||'')),
      divAccion:num(v.divAccion),broker:v.broker||'',comision:m.com,comisionReg:m.comReg});
  });
  return out;
};

/* Lotes: lo que queda de cada compra (en cartera) y cada trozo vendido (vendidas), por FIFO */
posLots=function(){
  var lots=[], hoy=new Date().toISOString().slice(0,10), F=nFifo(), archT=new Set();
  (DB.cerradas||[]).forEach(function(c){
    var t=(c.ticker||'').toUpperCase(); archT.add(t);
    var ops=(c.ops||[]), buys=ops.filter(function(o){return o.tipo!=='venta';}), sells=ops.filter(function(o){return o.tipo==='venta';});
    var sAcc=sells.reduce(function(s,o){return s+num(o.acciones);},0), sVal=sells.reduce(function(s,o){return s+num(o.acciones)*num(o.precio);},0);
    var pv=sAcc?sVal/sAcc:0, fV=sells.map(function(o){return o.fecha;}).filter(Boolean).sort().slice(-1)[0]||'';
    buys.forEach(function(o){ var acc=num(o.acciones); if(acc<=0)return;
      lots.push({fecha:o.fecha||'',ticker:t,nombre:c.nombre||t,cartera:c.cartera||'Propia',acc:acc,pc:num(o.precio),pa:pv,div:_posDivCobrado(c.divs,o.fecha,acc),years:_posYears(o.fecha,fV),estado:'Vendida',fechaFin:fV}); });
  });
  F.open.forEach(function(l){ var v=(DB.valores&&DB.valores[l.ticker])||{}, pi=precioActualInfo(l.ticker);
    lots.push({fecha:l.fecha,ticker:l.ticker,nombre:v.nombre||l.ticker,cartera:l.cartera,acc:l.acc,pc:l.pc,pcBruto:l.pcBruto,com:l.com,comReg:l.comReg,
      pa:(pi.p>0)?pi.p:l.pcBruto,sinPrecio:!(pi.p>0),div:_posDivCobrado((DB.dividendos||{})[l.ticker],l.fecha,l.acc),years:_posYears(l.fecha,hoy),estado:'Cartera',fechaFin:hoy}); });
  F.sold.forEach(function(l){ if(archT.has(l.ticker)) return; var v=(DB.valores&&DB.valores[l.ticker])||{};
    lots.push({fecha:l.fecha,ticker:l.ticker,nombre:v.nombre||l.ticker,cartera:l.cartera,acc:l.acc,pc:l.pc,pcBruto:l.pcBruto,com:l.com,comReg:l.comReg,
      pa:l.pv,div:_nDivEntre((DB.dividendos||{})[l.ticker],l.fecha,l.fVenta,l.acc),years:_posYears(l.fecha,l.fVenta),estado:'Vendida',fechaFin:l.fVenta}); });
  return lots;
};

/* Ganancia de las ventas PARCIALES (empresas que siguen en cartera), por FIFO.
   Lo usa «Situación de mi inversión». Antes: precio medio y sin separar Propia y Compartida. */
_realizadoParciales=function(){
  var openT=new Set(invPositions().filter(function(p){return p.acciones>0.0001;}).map(function(p){return p.ticker;}));
  var real=0, ops={};
  nFifo().sold.forEach(function(l){ if(!openT.has(l.ticker)) return; real+=l.acc*l.pv-l.comV-l.acc*l.pc; ops[l.opId||(l.ticker+l.fVenta)]=1; });
  return {n:Object.keys(ops).length, real:real};
};
