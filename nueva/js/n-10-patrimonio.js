/* APP NUEVA · Patrimonio (boceto aprobado 28-oct): 4 cifras fuera del banner.
   Se apoya en el renderPat de siempre (lista, gráfica, cuentas, formulario) y solo cambia la cabecera. */
(function(){
  /* 1-nov-2026 (Carlos): la tarjeta Efectivo, desglosada por cuenta; en ING y Santander, además, el saldo de hoy según el último extracto importado */
  window.efCuentas=function(snap){
    try{
      var S=(DB.bancoSaldos)||{}, C={}; (DB.cuentas||[]).forEach(function(c){ C[c.id]=c; });
      function hoyDe(nom){ var n=String(nom||'').toLowerCase(); if(n==='ing'){ var I=['ING','INGN','INGV'].filter(function(k){ return S[k]; }); if(!I.length) return null; return {saldo:I.reduce(function(a,k){ return a+S[k].saldo; },0),fecha:I.map(function(k){ return S[k].fecha; }).sort()[0]}; }
        if(n==='santander') return S.SAN; if(n==='renta 4') return S.R4; return null; }
      function e0(x){ return fmt(Math.round(x)).replace(/,\d\d\s*€$/,' €'); }
      var L=(snap.lineas||[]).filter(function(l){ return num(l.ef)||hoyDe((C[l.cuentaId]||{}).nombre); }), tR=0, tH=0, hayH=false;
      var filas=L.map(function(l){ var c=C[l.cuentaId]||{nombre:'?'}, h=hoyDe(c.nombre), r=num(l.ef); tR+=r; tH+=h?h.saldo:r; if(h) hayH=true;
        var d=h?h.saldo-r:0;
        return '<tr><td>'+_infEsc(c.nombre)+'</td><td>'+e0(r)+'</td><td>'+(h?'<b>'+e0(h.saldo)+'</b><small>'+ddmmyyyy(h.fecha).slice(0,5)+(Math.abs(d)>=1?' · <span class="'+(d>0?'n-pos':'n-neg')+'">'+(d>0?'+':'−')+e0(Math.abs(d))+'</span>':'')+'</small>':'<span class="n-efc-ig">igual</span>')+'</td></tr>'; });
      if(!hayH) return '';
      return '<table class="n-efc"><colgroup><col class="c1"><col><col></colgroup><thead><tr><th></th><th>Registro<br>'+ddmmyyyy(snap.fecha).slice(0,5)+'</th><th>Hoy<br><small>extractos</small></th></tr></thead><tbody>'+filas.join('')+
        '</tbody><tfoot><tr><td>Total</td><td>'+e0(tR)+'</td><td><b>'+e0(tH)+'</b></td></tr></tfoot></table>';
    }catch(e){ return ''; }
  };
  function e0(x){ return fmt(Math.round(x)).replace(/,\d\d\s*€$/,' €'); }
  function pc(a,b){ return b?((a/b-1)*100):null; }
  function pcT(v){ return v==null?'—':(v>=0?'+':'')+v.toFixed(1).replace('.',',')+' %'; }
  /* Patrimonio total: frente a hace 1 mes, 3 meses, 1 año y el inicio; y una estimación de hoy */
  window.totExtra=function(snaps,last){
    try{ var t=snapTot(last).total;
      function hace(m){ var d=new Date(last.fecha+'T12:00:00'); d.setMonth(d.getMonth()-m); var f=d.toISOString().slice(0,10), b=null; snaps.forEach(function(s){ if(s.fecha<=f) b=s; }); return b; }
      var R=[['hace 1 mes',hace(1)],['hace 3 meses',hace(3)],['hace 1 año',hace(12)],['al inicio',snaps[0]]].filter(function(x){ return x[1]&&x[1]!==last; });
      var filas=R.map(function(x){ var v=snapTot(x[1]).total, d=t-v; return '<tr><td>'+x[0]+'<small>'+ddmmyyyy(x[1].fecha)+'</small></td><td>'+e0(v)+'</td><td><b class="'+(d>=0?'n-pos':'n-neg')+'">'+pcT(pc(t,v))+'</b><small>'+(d>=0?'+':'−')+e0(Math.abs(d))+'</small></td></tr>'; }).join('');
      /* hoy: efectivo de los extractos + valor de hoy de cada bróker; lo que no tiene dato de hoy, como en el registro */
      var S=DB.bancoSaldos||{}, IH=(typeof window.nPatInvHoy==='function')?window.nPatInvHoy():{}, C={}; (DB.cuentas||[]).forEach(function(c){ C[c.id]=c.nombre; });
      var hoy=0; (last.lineas||[]).forEach(function(l){ var n=String(C[l.cuentaId]||'').toLowerCase(), ef=num(l.ef), iv=num(l.inv);
        if(n==='ing'&&(S.ING||S.INGN||S.INGV)) ef=['ING','INGN','INGV'].reduce(function(a,k){ return a+(S[k]?S[k].saldo:0); },0); if(n==='santander'&&S.SAN) ef=S.SAN.saldo; if(n==='renta 4'&&S.R4) ef=S.R4.saldo; var h=IH[C[l.cuentaId]]; if(h!=null) iv=h; hoy+=ef+iv; });
      var dh=hoy-t;
      return '<table class="n-efc"><colgroup><col class="c1"><col><col></colgroup><thead><tr><th>Frente a</th><th>Entonces</th><th>Cambio</th></tr></thead><tbody>'+filas+'</tbody>'+
        '<tfoot><tr><td>Hoy<small>estimado: extractos + cotización</small></td><td><b>'+e0(hoy)+'</b></td><td><b class="'+(dh>=0?'n-pos':'n-neg')+'">'+pcT(pc(hoy,t))+'</b><small>'+(dh>=0?'+':'−')+e0(Math.abs(dh))+' desde el registro</small></td></tr></tfoot></table>';
    }catch(e){ return ''; } };
  /* Frente al anterior: de dónde sale la diferencia */
  window.antExtra=function(prev,last){
    try{ if(!prev) return ''; var a=snapTot(prev), b=snapTot(last), dE=b.ef-a.ef, dI=b.inv-a.inv;
      var compras=0; (DB.operaciones||[]).forEach(function(o){ if(!(o.fecha>prev.fecha&&o.fecha<=last.fecha)) return; var v=num(o.acciones)*num(o.precio)+(o.tipo==='venta'?-1:1)*num(o.comision); compras+=(o.tipo==='venta'?-1:1)*v; });
      var mercado=dI-compras, div=0;
      Object.keys(DB.dividendos||{}).forEach(function(t){ (DB.dividendos[t]||[]).forEach(function(d){ var f=String(d.fecha||'').slice(0,10); if(!(f>prev.fecha&&f<=last.fecha)) return;
        var sh=(typeof _calSharesAt==='function')?_calSharesAt(t,f,true):0; div+=sh*num(d.importe)*0.81; }); });
      function fila(lbl,v,sub){ return '<tr><td>'+lbl+(sub?'<small>'+sub+'</small>':'')+'</td><td colspan="2"><b class="'+(v>=0?'n-pos':'n-neg')+'">'+(v>=0?'+':'−')+e0(Math.abs(v))+'</b></td></tr>'; }
      return '<table class="n-efc n-efc2"><colgroup><col style="width:60%"><col><col></colgroup><tbody>'+
        fila('Efectivo',dE,'cuentas, Foncuenta y casa')+fila('Invertido',dI,'')+fila('· compras netas',compras,'dinero que pasó a acciones')+fila('· mercado',mercado,'subida o bajada de las cotizaciones')+
        (div?fila('Dividendos cobrados',div,'netos, entre los dos registros'):'')+'</tbody><tfoot><tr><td>Total</td><td colspan="2"><b class="'+((dE+dI)>=0?'n-pos':'n-neg')+'">'+((dE+dI)>=0?'+':'−')+e0(Math.abs(dE+dI))+'</b></td></tr></tfoot></table>';
    }catch(e){ return ''; } };
  window.invCuentas=function(snap){
    try{ if(typeof window.nPatInvHoy!=='function') return ''; var H=window.nPatInvHoy(), C={}; (DB.cuentas||[]).forEach(function(c){ C[c.id]=c; });
      function e0(x){ return fmt(Math.round(x)).replace(/,\d\d\s*€$/,' €'); }
      var L=(snap.lineas||[]).filter(function(l){ return num(l.inv)||H[(C[l.cuentaId]||{}).nombre]; }), tR=0, tH=0;
      var filas=L.map(function(l){ var c=C[l.cuentaId]||{nombre:'?'}, r=num(l.inv), h=H[c.nombre]; tR+=r; tH+=(h!=null?h:r); var d=h!=null?h-r:0;
        return '<tr><td>'+_infEsc(c.nombre)+'</td><td>'+e0(r)+'</td><td>'+(h!=null?'<b>'+e0(h)+'</b>'+(Math.abs(d)>=1?'<small><span class="'+(d>0?'n-pos':'n-neg')+'">'+(d>0?'+':'−')+e0(Math.abs(d))+' ('+(r?((d/r*100).toFixed(1).replace('.',',')+' %'):'')+')</span></small>':''):'<span class="n-efc-ig">—</span>')+'</td></tr>'; });
      if(!L.length) return '';
      return '<table class="n-efc"><colgroup><col class="c1"><col><col></colgroup><thead><tr><th></th><th>Registro<br>'+ddmmyyyy(snap.fecha).slice(0,5)+'</th><th>Hoy<br><small>cotización</small></th></tr></thead><tbody>'+filas.join('')+
        '</tbody><tfoot><tr><td>Total</td><td>'+e0(tR)+'</td><td><b>'+e0(tH)+'</b></td></tr></tfoot></table>';
    }catch(e){ return ''; }
  };
  var st=document.createElement('style'); st.textContent='#patCards .n-ws,#patCards .n-wp{display:block;min-width:0}#patCards .n-w{min-width:0;overflow:hidden}table.n-efc{width:100%;table-layout:fixed;border-collapse:collapse;margin-top:8px;font-size:11.5px;letter-spacing:-.1px}table.n-efc col.c1{width:31%}table.n-efc td,table.n-efc th{padding-left:3px!important;padding-right:3px!important;box-shadow:none}table.n-efc{box-shadow:none!important;border-radius:0!important}'+
    'table.n-efc td,table.n-efc th{overflow:hidden;text-overflow:ellipsis}table.n-efc th{font-size:9.5px;color:#64748B;font-weight:700;text-align:right;padding:0 0 4px;line-height:1.2}'+
    'table.n-efc td{padding:5px 0;border-top:1px solid #EEF1F5;text-align:right;vertical-align:top;white-space:nowrap}table.n-efc td:first-child,table.n-efc th:first-child{text-align:left;color:#334155;white-space:normal;padding-right:6px}'+
    'table.n-efc td small{display:block;font-size:10.5px;color:#64748B;white-space:normal;font-weight:400}table.n-efc2 td:last-child{text-align:right}table.n-efc td b{color:#142231}table.n-efc .n-efc-ig{color:#94A3B8;font-size:11.5px}'+
    'table.n-efc tfoot td{border-top:1.5px solid #CBD5E1;font-weight:800;color:#142231;padding-top:6px}table.n-efc th:nth-child(3),table.n-efc td:nth-child(3){padding-left:4px}table.n-efc th:nth-child(2),table.n-efc td:nth-child(2){padding-right:2px}';
  document.head.appendChild(st);
})();
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
              s:'<b class="'+(crec>=0?'n-pos':'n-neg')+'">'+nPct(crec,0)+'</b> desde el inicio, el <b>'+ddmmyyyy(first.fecha)+'</b> ('+fmt(tf.total)+')',p:'al '+ddmmyyyy(last.fecha)+' · '+snaps.length+' registros'+totExtra(snaps,last)})+
        nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'💶',t:'Efectivo',pill:Math.round((1-pInv)*100)+' %',v:fmt(t.ef),s:'cuentas y Fondo R4, según tu registro del '+ddmmyyyy(last.fecha)+efCuentas(last)})+
        nKpi({c:'#D97706',bg:'#FEF3C7',ic:'📈',t:'Invertido',pill:Math.round(pInv*100)+' %',v:fmt(t.inv),s:'acciones en los brókers, según tu registro del '+ddmmyyyy(last.fecha)+invCuentas(last)})+
        nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'↗',t:'Frente al anterior',v:nPct(vsAnt,1),vCls:vsAnt==null?'':(vsAnt>=0?'n-pos':'n-neg'),s:prev?('desde el registro del '+ddmmyyyy(prev.fecha)+' ('+fmt(tp.total)+')'+antExtra(prev,last)):'primer registro'});
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
