/* APP NUEVA · Patrimonio (boceto aprobado 28-oct): 4 cifras fuera del banner.
   Se apoya en el renderPat de siempre (lista, gráfica, cuentas, formulario) y solo cambia la cabecera. */
(function(){
  if(typeof renderPat!=='function') return;
  var orig=renderPat;
  renderPat=function(){
    orig.apply(this,arguments);
    try{
      var snaps=patSnaps(); var el=document.getElementById('patCards'); if(!el||!snaps.length) return;
      var last=snaps[snaps.length-1], first=snaps[0];
      var t=snapTot(last), tf=snapTot(first), prev=snaps.length>1?snaps[snaps.length-2]:null, tp=prev?snapTot(prev):null;
      var crec=tf.total?(t.total-tf.total)/tf.total:null, vsAnt=tp&&tp.total?(t.total-tp.total)/tp.total:null;
      var pInv=t.total?t.inv/t.total:0;
      el.className='n-ctrl';
      el.innerHTML=
        nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'🏛️',t:'Patrimonio total',pill:crec==null?'':(crec>=0?'▲ ':'▼ ')+nPct(crec,0),pillCls:crec>=0?'up':'dn',v:fmt(t.total),
              s:'<b class="'+(crec>=0?'n-pos':'n-neg')+'">'+nPct(crec,0)+'</b> desde el inicio, el <b>'+ddmmyyyy(first.fecha)+'</b> ('+fmt(tf.total)+')',p:'al '+ddmmyyyy(last.fecha)+' · '+snaps.length+' registros'})+
        nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'💶',t:'Efectivo',pill:Math.round((1-pInv)*100)+' %',v:fmt(t.ef),s:'cuentas y Fondo R4'})+
        nKpi({c:'#D97706',bg:'#FEF3C7',ic:'📈',t:'Invertido',pill:Math.round(pInv*100)+' %',v:fmt(t.inv),s:'acciones en el bróker'})+
        nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'↗',t:'Frente al anterior',v:nPct(vsAnt,1),vCls:vsAnt==null?'':(vsAnt>=0?'n-pos':'n-neg'),s:prev?('desde el registro del '+ddmmyyyy(prev.fecha)+' ('+fmt(tp.total)+')'):'primer registro'});
    }catch(e){ console.error('n-patrimonio',e); }
  };
})();
