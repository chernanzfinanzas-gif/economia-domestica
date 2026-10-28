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

/* ---- Evolución: gráfica nítida (pantallas de alta densidad), eje de euros y años legibles (Carlos, 20:16) ---- */
drawPatChart=function(snaps){
  var cv=document.getElementById('patChart'); if(!cv) return;
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth||700, H=260;
  cv.style.height=H+'px'; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  var ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  var n=snaps.length; if(!n) return;
  var tot=snaps.map(function(s){return snapTot(s).total;}), ef=snaps.map(function(s){return snapTot(s).ef;}), inv=snaps.map(function(s){return snapTot(s).inv;});
  var mx=Math.max.apply(null,tot.concat([1])), paso=Math.pow(10,Math.floor(Math.log10(mx/4))); [1,2,2.5,5,10].some(function(m){ if(mx/(paso*m)<=6){ paso*=m; return true; } });
  var top=Math.ceil(mx/paso)*paso, pad={l:54,r:14,t:30,b:28};
  var X=function(i){ return pad.l+(W-pad.l-pad.r)*(n<=1?0.5:i/(n-1)); }, Y=function(v){ return pad.t+(H-pad.t-pad.b)*(1-v/top); };
  ctx.font='12px -apple-system,"Segoe UI",Roboto,sans-serif'; ctx.textBaseline='middle';
  for(var v=0; v<=top+0.5; v+=paso){ ctx.strokeStyle='#EEF1F5'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.l,Math.round(Y(v))+.5); ctx.lineTo(W-pad.r,Math.round(Y(v))+.5); ctx.stroke();
    ctx.fillStyle='#5B6B7C'; ctx.textAlign='right'; ctx.fillText((v>=1000?(v/1000).toLocaleString('es-ES')+' k':v)+' €',pad.l-8,Y(v)); }
  ctx.beginPath(); ctx.moveTo(X(0),Y(tot[0])); for(var i=1;i<n;i++) ctx.lineTo(X(i),Y(tot[i])); ctx.lineTo(X(n-1),Y(0)); ctx.lineTo(X(0),Y(0)); ctx.closePath(); ctx.fillStyle='rgba(31,74,154,.08)'; ctx.fill();
  function line(a,c,w){ ctx.beginPath(); ctx.moveTo(X(0),Y(a[0])); for(var i=1;i<n;i++) ctx.lineTo(X(i),Y(a[i])); ctx.strokeStyle=c; ctx.lineWidth=w; ctx.lineJoin='round'; ctx.stroke(); }
  line(inv,'#D97706',2); line(ef,'#16A34A',2); line(tot,'#1F4A9A',3);
  /* años: una etiqueta por año, sin pisarse */
  ctx.fillStyle='#334155'; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; var seen={}, lastX=-99;
  snaps.forEach(function(s,i){ var yr=(s.fecha||'').slice(0,4); if(yr&&!seen[yr]){ seen[yr]=1; var x=X(i); if(x-lastX>34){ ctx.fillText(yr,Math.min(Math.max(x,pad.l+14),W-pad.r-14),H-8); lastX=x; } } });
  /* leyenda */
  ctx.textAlign='left'; ctx.textBaseline='middle'; var lx=pad.l;
  [['Patrimonio','#1F4A9A'],['Efectivo','#16A34A'],[W<520?'Invertido':'Invertido acciones','#D97706']].forEach(function(g){ ctx.fillStyle=g[1]; ctx.fillRect(lx,9,14,4); ctx.fillStyle='#334155'; ctx.fillText(g[0],lx+19,11); lx+=19+ctx.measureText(g[0]).width+22; });
};

/* ---- Registrar patrimonio: fecha arriba con las cuentas y «+ Nueva cuenta» al lado; los importes de las
        cuentas juntos en una fila. Fuera «Importar histórico» y el bloque «Cuentas» (Carlos, 20:16) ---- */
(function(){
  if(typeof renderPatForm!=='function') return;
  var o=renderPatForm;
  renderPatForm=function(){
    o.apply(this,arguments);
    try{
      var el=document.getElementById('patFormFields'); if(!el) return;
      var top=document.getElementById('nPatTop');
      if(!top){ top=document.createElement('div'); top.id='nPatTop'; el.parentNode.insertBefore(top,el);
        var cu=document.createElement('div'); cu.className='n-patcu'; cu.innerHTML='<label>Cuentas</label><div class="n-patcu-r"></div>'; top.appendChild(cu);
        var pc=document.getElementById('patCuentas'), pa=document.getElementById('patAddCuenta'); var r=cu.querySelector('.n-patcu-r');
        if(pc) r.appendChild(pc); if(pa){ pa.style.marginTop='0'; r.appendChild(pa); }
        var blk=document.getElementById('blkPatCta'); if(blk) blk.style.display='none';
        var ib=document.getElementById('patImportBtn'); if(ib) ib.style.display='none';
      }
      var oldF=top.querySelector('.pat-fld'); if(oldF) oldF.remove();
      var f=el.querySelector('.pat-fld:not(.acc)'); if(f) top.insertBefore(f,top.firstChild);
      el.style.setProperty('--n', Math.max(1, el.querySelectorAll('.pat-fld.acc').length));
      el.classList.add('n-patacc');
    }catch(e){ console.error('n-patform',e); }
  };
})();
