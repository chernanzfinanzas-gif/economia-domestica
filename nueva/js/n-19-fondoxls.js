/* APP NUEVA · Fondo R4 desde el extracto de patrimonio de R4 (29-oct-2026). Carlos: con el Excel «todo el sistema de pegar
   el extracto y aceptar borrador ya no tiene sentido». Cifras: valor exacto a la fecha del Excel; aportado y retirado de las
   líneas «compra/venta de Foncuenta»; ganancia = valor + retirado − aportado − valor al empezar el periodo; rentabilidad
   anual por fechas (TIR); ganancia realizada al vender = retención ÷ 0,19 (R4 retiene exactamente el 19 % de esa ganancia). */
(function(){
  if(typeof renderFondoR4!=='function') return;
  function E(x){ x=+x||0; try{ return x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'})+' €'; }catch(e){ return fmt(x); } }
  function fd(s){ return s?s.split('-').reverse().join('/'):''; }
  function D(s){ return new Date(s+'T12:00:00'); }
  function tir(F){ /* F: [[fecha, importe]] (salidas de tu bolsillo negativas) */
    if(F.length<2) return null; var t0=D(F[0][0]); var f=function(r){ return F.reduce(function(s,x){ return s+x[1]/Math.pow(1+r,(D(x[0])-t0)/31557600000); },0); };
    var lo=-0.9, hi=1, flo=f(lo), fhi=f(hi); if(flo*fhi>0) return null;
    for(var i=0;i<100;i++){ var m=(lo+hi)/2, fm=f(m); if(flo*fm<=0){ hi=m; } else { lo=m; flo=fm; } } return (lo+hi)/2; }
  function calc(X){
    var A=0,R=0,ret={},movs=[],F=[];
    var ini=X.fondoIni||{fecha:X.desde,valor:0}; if(ini.valor>0) F.push([ini.fecha,-ini.valor]);
    (X.cash||[]).forEach(function(l){ var c=l.concepto.toUpperCase(); if(!/RENTA 4 FONCUENTA/.test(c)) return; var y=l.fecha.slice(0,4);
      if(/^COMPRA DE/.test(c)){ A+=-l.imp; F.push([l.fecha,l.imp]); movs.push([l.fecha,'Entra en el fondo',-l.imp]); }
      else if(/^VENTA DE/.test(c)){ R+=l.imp; F.push([l.fecha,l.imp]); movs.push([l.fecha,'Sale del fondo',-l.imp]); }
      else if(/^RETENCION/.test(c)){ ret[y]=(ret[y]||0)+(-l.imp); movs.push([l.fecha,'Retención a cuenta (19 % de la ganancia)',l.imp]); } });
    F.push([X.fecha,X.fondo.valor]); F.sort(function(a,b){ return a[0]<b[0]?-1:1; });
    var y=X.fecha.slice(0,4);
    return {A:A,R:R,ret:ret,movs:movs,ganancia:X.fondo.valor+R-A-ini.valor,ini:ini,tir:tir(F),realizado:(ret[y]||0)/0.19,retAnio:ret[y]||0,anio:y};
  }
  var o=renderFondoR4;
  renderFondoR4=function(){
    o.apply(this,arguments);
    try{
      var sec=document.getElementById('view-fondor4'); if(!sec) return;
      ['blkR4Add','blkR4Ext'].forEach(function(id){ var e=document.getElementById(id); if(e) e.style.display='none'; });   /* ya no se pega el extracto ni se apunta a mano */
      var X=(typeof nR4Xls==='function')?nR4Xls():null, c=document.getElementById('r4Cards'); if(!c) return;
      var up=document.getElementById('nR4FUp'); if(!up){ up=document.createElement('div'); up.id='nR4FUp'; up.className='n-r4up'; c.insertAdjacentElement('afterend',up); }
      up.innerHTML='<button class="btn sm" data-nr4up="1">📥 Subir extracto de R4</button><span>'+(X?'Datos del extracto de patrimonio de R4 al <b>'+fd(X.fecha)+'</b> (desde el '+fd(X.desde)+')':'Sube el «extracto de patrimonio» de Renta 4 en Excel: el fondo y la caja del bróker se ponen al día solos.')+'</span>';
      if(!X||!X.fondo) return;
      var K=calc(X);
      c.innerHTML='<div class="n-ctrl">'+
        nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'💶',t:'Valor del fondo',v:E(X.fondo.valor),s:'al '+fd(X.fecha)+' · '+String(X.fondo.part).replace('.',',')+' participaciones'})+
        nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'📈',t:'Ganancia del periodo',v:(K.ganancia>=0?'+':'')+E(K.ganancia),vCls:K.ganancia>=0?'n-pos':'n-neg',s:'desde el '+fd(K.ini.fecha)+(K.ini.valor?' (valía '+E(K.ini.valor)+')':'')+' · entra '+E(K.A)+' · sale '+E(K.R)})+
        nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'⏱️',t:'Rentabilidad',v:K.tir!=null?(K.tir*100).toFixed(2).replace('.',',')+' %':'—',vCls:'n-pos',s:'anual, con las fechas de cada entrada y salida'})+
        nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'📅',t:'Realizado en '+K.anio,v:'+'+E(K.realizado),vCls:'n-pos',s:'ganancia de lo vendido (retención ÷ 0,19) · retenido '+E(K.retAnio)})+'</div>';
      var L=document.getElementById('blkR4List'); if(L) L.style.display='none';
      var b=document.getElementById('nR4FMov'); if(!b){ b=document.createElement('div'); b.id='nR4FMov'; b.className='pos-blk n-blk'; up.insertAdjacentElement('afterend',b); }
      var mv=K.movs.slice().reverse();
      b.innerHTML='<div class="pos-blk-h" data-nr4fmov="1"><span class="arw">▶</span><span class="bt">📒 Movimientos del fondo</span><span class="bsum">'+mv.length+' apuntes del extracto de R4</span></div><div class="pos-blk-b"><div class="blk-pad"><table class="n-r4t"><thead><tr><th>Fecha</th><th>Apunte</th><th class="num">Importe</th></tr></thead><tbody>'+
        mv.map(function(m){ return '<tr><td>'+fd(m[0]).slice(0,5)+'/'+m[0].slice(2,4)+'</td><td>'+m[1]+'</td><td class="num '+(m[2]>=0?'n-pos':'n-neg')+'">'+(m[2]>=0?'+':'')+E(m[2])+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
    }catch(e){ console.error('n-fondoxls',e); }
  };
  document.addEventListener('click',function(e){ var h=e.target.closest&&e.target.closest('[data-nr4fmov]'); if(h) h.parentElement.classList.toggle('open'); });
})();
