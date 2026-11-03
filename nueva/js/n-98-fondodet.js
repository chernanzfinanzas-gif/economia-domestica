/* APP NUEVA · Fondo R4 completo desde el EXTRACTO DE FONDOS de R4 (3-nov-2026, Carlos: «sin información de lo que hay, del valor,
   número de participaciones, etc... se podría hacer más completo»).
   Si hay extracto de fondos guardado (DB.easyExtracto: cada suscripción y reembolso con participaciones, valor liquidativo y
   retención), la pestaña sale de él en vez del extracto de patrimonio (que solo trae el dinero que entra y sale):
     · tarjetas: valor (participaciones × valor liquidativo), lo que hay dentro (coste y ganancia latente), ganancia total desde
       el principio y rentabilidad (TIR con las fechas de cada entrada y salida, y lo que ha subido el valor liquidativo);
     · Lo que tienes dentro: las compras que siguen vivas, sacando primero las más antiguas (FIFO, como Hacienda);
     · Por año: aportado, retirado, ganancia realizada y retención (lo que va a la declaración);
     · Movimientos del fondo: cada operación con sus participaciones, precio, importe, retención y ganancia.
   Todo sale de r4ExtCalc y de la misma cuenta FIFO; la comprobación es que las participaciones calculadas sean las de R4. */
(function(){
  if(typeof renderFondoR4!=='function'||window._nFondoDet) return; window._nFondoDet=true;
  function E(x,d){ x=+x||0; return x.toLocaleString('es-ES',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d,useGrouping:'always'})+' €'; }
  function N(x,d){ return (+x||0).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'}); }
  function S(x){ return (x>=0?'+':'−')+E(Math.abs(x)); }
  function fd(s){ return s?s.split('-').reverse().join('/'):''; }
  function D(s){ return new Date(s+'T12:00:00'); }
  function tir(F){ if(F.length<2) return null; var t0=D(F[0][0]); var f=function(r){ return F.reduce(function(s,x){ return s+x[1]/Math.pow(1+r,(D(x[0])-t0)/31557600000); },0); };
    var lo=-0.9, hi=1, flo=f(lo), fhi=f(hi); if(flo*fhi>0) return null;
    for(var i=0;i<100;i++){ var m=(lo+hi)/2, fm=f(m); if(flo*fm<=0){ hi=m; } else { lo=m; flo=fm; } } return (lo+hi)/2; }
  function css(){ if(document.getElementById('nFdCss')) return; var s=document.createElement('style'); s.id='nFdCss'; s.textContent=
    '.n-fd-w{overflow-x:auto;-webkit-overflow-scrolling:touch}.n-fd-t{width:100%;border-collapse:collapse;font-size:13px}'+
    '.n-fd-t th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#64748B;text-align:right;padding:8px 10px;border-bottom:1px solid #E2E8F0;white-space:nowrap;background:#F8FAFC}'+
    '.n-fd-t td{padding:7px 10px;border-bottom:1px solid #EEF2F6;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}'+
    '.n-fd-t th:first-child,.n-fd-t td:first-child,.n-fd-t th.l,.n-fd-t td.l{text-align:left}.n-fd-t tfoot td{font-weight:700;border-top:2px solid #CBD5E1}'+
    '.n-fd-t .p{color:#15803D}.n-fd-t .n{color:#B91C1C}.n-fd-t .m{color:#64748B}.n-fd-t tr.y td{background:#F1F5F9;font-weight:700;color:#334155}'+
    '.n-fd-nota{font-size:12px;color:#64748B;margin:8px 2px 0}.n-fd-ok{color:#15803D;font-weight:700}.n-fd-ko{color:#B91C1C;font-weight:700}';
    document.head.appendChild(s); }
  function cuenta(movs){
    movs=movs.slice().sort(function(a,b){ return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0; });
    var lotes=[], part=0, filas=[], anos={}, F=[], val=null;
    movs.forEach(function(m,i){ if(m.tipo==='valoracion'){ val=m; return; } var y=m.fecha.slice(0,4), A=anos[y]=anos[y]||{ap:0,re:0,g:0,ret:0,nS:0,nR:0};
      var f={fecha:m.fecha,tipo:m.tipo,part:m.part,vl:m.vl,imp:m.bruto,ret:0,g:null};
      if(m.tipo==='suscripcion'){ lotes.push({fecha:m.fecha,p:m.part,p0:m.part,vl:m.vl}); part+=m.part; A.ap+=m.bruto; A.nS++; F.push([m.fecha,-m.bruto]); }
      else { var q=m.part, coste=0; while(q>1e-9&&lotes.length){ var t=Math.min(q,lotes[0].p); coste+=t*lotes[0].vl; lotes[0].p-=t; q-=t; if(lotes[0].p<=1e-9) lotes.shift(); }
        part-=m.part; f.g=m.part*m.vl-coste; f.ret=m.reten; A.re+=m.bruto; A.g+=f.g; A.ret+=m.reten; A.nR++; F.push([m.fecha,m.bruto]); }
      f.tras=part; f.valTras=part*m.vl; filas.push(f); });
    return {filas:filas,lotes:lotes,anos:anos,F:F,val:val,part:part};
  }
  var o=renderFondoR4;
  renderFondoR4=function(){
    o.apply(this,arguments);
    try{
      var g=(typeof r4ExtGuardado==='function')?r4ExtGuardado():null; if(!g||!g.movs||!g.movs.length) return;
      var K=cuenta(g.movs), V=K.val, c=document.getElementById('r4Cards'); if(!V||!c) return; css();
      var R=(typeof r4ExtCalc==='function')?r4ExtCalc(g.movs):null;
      var coste=K.lotes.reduce(function(s,l){ return s+l.p*l.vl; },0), valor=V.efectivo||V.part*V.vl, lat=valor-coste;
      var real=K.filas.reduce(function(s,f){ return s+(f.g||0); },0), retT=K.filas.reduce(function(s,f){ return s+(f.ret||0); },0);
      var ok=Math.abs(K.part-V.part)<0.00001, t=tir(K.F.concat([[V.fecha,valor]]));
      var desde=K.filas.length?K.filas[0].fecha:V.fecha, meses=Math.round((D(V.fecha)-D(desde))/2629800000);
      var vl0=K.filas.length?K.filas[0].vl:V.vl, sube=(V.vl/vl0-1)*100;
      var y=V.fecha.slice(0,4), Ay=K.anos[y]||{g:0,ret:0,nR:0};
      var lg=document.querySelector('#nR4Logo .n-r4t'); if(lg) lg.innerHTML='<b>Renta 4 Foncuenta</b><span>Tu liquidez remunerada · extracto de fondos de R4 al '+fd(V.fecha)+'</span>'+(t!=null?'<em>⏱️ '+N(t*100,2)+' % anual</em>':'');
      c.classList.add('n-r4x');
      c.innerHTML='<div class="n-ctrl">'+
        nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'💶',t:'Valor del fondo',v:E(valor),s:'al '+fd(V.fecha)+' · '+N(V.part,6)+' participaciones × '+N(V.vl,6)+' €'})+
        nKpi({c:'#0369A1',bg:'#E0F2FE',ic:'📦',t:'Lo que tienes dentro',v:S(lat),vCls:lat>=0?'n-pos':'n-neg',s:'ganancia sin vender · costó '+E(coste)+' ('+K.lotes.length+' compra'+(K.lotes.length===1?'':'s')+' vivas) · '+(coste>0?(lat>=0?'+':'')+N(lat/coste*100,2)+' %':'')})+
        nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'📈',t:'Ganancia total',v:S(real+lat),vCls:(real+lat)>=0?'n-pos':'n-neg',s:'desde el '+fd(desde)+' · '+E(real)+' ya retirada + '+E(lat)+' dentro · retenido '+E(retT)})+
        nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'⏱️',t:'Rentabilidad',v:t!=null?N(t*100,2)+' %':'—',vCls:'n-pos',s:'anual, con las fechas de cada entrada y salida · el valor liquidativo ha subido un '+N(sube,2)+' % en '+meses+' meses ('+N(vl0,4)+' → '+N(V.vl,4)+' €)'})+'</div>'+
        '<div class="n-ctrl">'+
        nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'📅',t:'Realizado en '+y,v:S(Ay.g),vCls:Ay.g>=0?'n-pos':'n-neg',s:Ay.nR+' reembolsos · retenido '+E(Ay.ret)+' (el 19 %)'})+
        nKpi({c:'#475569',bg:'#F1F5F9',ic:'🔁',t:'Movido en el fondo',v:E(K.filas.reduce(function(s,f){ return s+(f.tipo==='suscripcion'?f.imp:0); },0)),s:'entrado en '+K.filas.filter(function(f){ return f.tipo==='suscripcion'; }).length+' suscripciones · salido '+E(K.filas.reduce(function(s,f){ return s+(f.tipo!=='suscripcion'?f.imp:0); },0))+' en '+K.filas.filter(function(f){ return f.tipo!=='suscripcion'; }).length+' reembolsos'})+
        nKpi({c:ok?'#16A34A':'#B91C1C',bg:ok?'#DCFCE7':'#FEE2E2',ic:ok?'✅':'⚠️',t:'Comprobación',v:ok?'Cuadra':'No cuadra',vCls:ok?'n-pos':'n-neg',s:'participaciones sumando cada operación: '+N(K.part,6)+(ok?' = las de R4':' · R4 dice '+N(V.part,6))})+
        (R&&R.saldoMedio?nKpi({c:'#B45309',bg:'#FEF3C7',ic:'⚖️',t:'Saldo medio',v:E(R.saldoMedio),s:'lo que has tenido de media dentro en '+meses+' meses; sobre él, la ganancia es un '+(R.pctAnual!=null?N(R.pctAnual,2):'—')+' % anual'}):'')+'</div>';
      /* barra de subir */
      var up=document.getElementById('nR4FUp');
      if(up) up.innerHTML='<button class="btn sm" data-nfdup="1">📥 Subir extracto de fondos</button><span id="nR4XMsg">Extracto de fondos de R4 del <b>'+fd(desde)+'</b> al <b>'+fd(V.fecha)+'</b> · '+K.filas.length+' operaciones. Bájalo de R4 cuando quieras (o déjalo en Descargas y la app lo recoge sola).</span>';
      /* bloques */
      var ant=document.getElementById('nR4FMov'); if(ant) ant.style.display='none';
      var hay=document.getElementById('nFdDet'); if(!hay){ hay=document.createElement('div'); hay.id='nFdDet'; (up||c).insertAdjacentElement('afterend',hay); }
      var abiertos={}; [].forEach.call(hay.querySelectorAll('.n-blk.open'),function(b){ abiertos[b.dataset.k]=1; });
      function blk(k,ic,tit,sum,html,abrir){ return '<div class="pos-blk n-blk'+((abiertos[k]||(abrir&&!Object.keys(abiertos).length&&!hay.dataset.ya))?' open':'')+'" data-k="'+k+'"><div class="pos-blk-h" data-nfdblk="1"><span class="arw">▶</span><span class="bt">'+ic+' '+tit+'</span><span class="bsum">'+sum+'</span></div><div class="pos-blk-b"><div class="n-fd-w">'+html+'</div></div></div>'; }
      var vivos=K.lotes.map(function(l){ var vh=l.p*V.vl, cs=l.p*l.vl; return '<tr><td>'+fd(l.fecha)+'</td><td>'+N(l.p,6)+(l.p<l.p0-1e-9?' <span class="m">de '+N(l.p0,6)+'</span>':'')+'</td><td>'+N(l.vl,6)+' €</td><td>'+E(cs)+'</td><td>'+E(vh)+'</td><td class="'+(vh-cs>=0?'p':'n')+'">'+S(vh-cs)+'</td><td class="m">'+Math.round((D(V.fecha)-D(l.fecha))/864e5)+' d</td></tr>'; }).join('');
      var tVivos='<table class="n-fd-t"><thead><tr><th>Compra</th><th>Participaciones</th><th>Precio compra</th><th>Coste</th><th>Valor hoy</th><th>Ganancia</th><th>Antigüedad</th></tr></thead><tbody>'+vivos+'</tbody><tfoot><tr><td>Total</td><td>'+N(K.part,6)+'</td><td></td><td>'+E(coste)+'</td><td>'+E(valor)+'</td><td class="'+(lat>=0?'p':'n')+'">'+S(lat)+'</td><td></td></tr></tfoot></table>'+
        '<div class="n-fd-nota">Al reembolsar, R4 saca primero las participaciones más antiguas (como cuenta Hacienda): la próxima retirada sale de la compra de arriba. Valor de hoy con el valor liquidativo del '+fd(V.fecha)+': '+N(V.vl,6)+' €.</div>';
      var Y=Object.keys(K.anos).sort().reverse(), tAnos='<table class="n-fd-t"><thead><tr><th>Año</th><th>Aportado</th><th>Retirado</th><th>Ganancia realizada</th><th>Retención (19 %)</th><th>Operaciones</th></tr></thead><tbody>'+
        Y.map(function(a){ var A=K.anos[a]; return '<tr><td>'+a+'</td><td>'+E(A.ap)+'</td><td>'+E(A.re)+'</td><td class="'+(A.g>=0?'p':'n')+'">'+S(A.g)+'</td><td>'+E(A.ret)+'</td><td class="m">'+A.nS+' entradas · '+A.nR+' salidas</td></tr>'; }).join('')+'</tbody></table>'+
        '<div class="n-fd-nota">La ganancia realizada es la que va a la declaración (rendimiento de fondos, base del ahorro); la retención ya la ha pagado R4 a cuenta.</div>';
      var filas=K.filas.slice().reverse(), ya='', tMov='<table class="n-fd-t"><thead><tr><th>Fecha</th><th class="l">Operación</th><th>Participaciones</th><th>Valor liq.</th><th>Importe</th><th>Ganancia</th><th>Retención</th><th>Quedan</th><th>Valor tras</th></tr></thead><tbody>'+
        filas.map(function(f){ var a=f.fecha.slice(0,4), cab=''; if(a!==ya){ ya=a; cab='<tr class="y"><td colspan="9">'+a+'</td></tr>'; } var s=f.tipo==='suscripcion';
          return cab+'<tr><td>'+fd(f.fecha)+'</td><td class="l">'+(s?'Entra':'Sale')+'</td><td class="'+(s?'p':'n')+'">'+(s?'+':'−')+N(f.part,6)+'</td><td>'+N(f.vl,6)+'</td><td class="'+(s?'p':'n')+'">'+(s?'+':'−')+E(f.imp)+'</td><td>'+(f.g==null?'':'<span class="'+(f.g>=0?'p':'n')+'">'+S(f.g)+'</span>')+'</td><td>'+(f.ret?E(f.ret):'')+'</td><td class="m">'+N(f.tras,6)+'</td><td class="m">'+E(f.valTras)+'</td></tr>'; }).join('')+'</tbody></table>';
      hay.innerHTML=blk('vivo','📦','Lo que tienes dentro',K.lotes.length+' compras vivas · '+N(K.part,6)+' participaciones · '+E(valor),tVivos,true)+
        blk('anos','🧾','Por año (para la declaración)',Y.length+' años · realizado '+S(real)+' · retenido '+E(retT),tAnos,true)+
        blk('mov','📒','Movimientos del fondo',K.filas.length+' operaciones desde el '+fd(desde),tMov,false);
      hay.dataset.ya='1';
    }catch(e){ console.error('n-fondodet',e); }
  };
  document.addEventListener('click',function(e){
    var h=e.target.closest&&e.target.closest('[data-nfdblk]'); if(h){ h.parentElement.classList.toggle('open'); return; }
    var u=e.target.closest&&e.target.closest('[data-nfdup]'); if(!u) return; e.preventDefault();
    var inp=document.createElement('input'); inp.type='file'; inp.accept='.xls,.xlsx'; inp.style.display='none'; document.body.appendChild(inp);
    inp.onchange=function(){ var f=(inp.files||[])[0]; inp.remove(); if(!f) return; var m=document.getElementById('nR4XMsg'); if(m) m.textContent='Leyendo '+f.name+'…';
      var lib=window.XLSX?Promise.resolve():new Promise(function(ok,ko){ var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=ko; document.head.appendChild(s); });
      lib.then(function(){ return f.arrayBuffer(); }).then(function(b){ var x=window.nImpLeer(b,f.name); if(x.tipo!=='R4F') throw new Error('no es el extracto de fondos de R4 (extractosFndIntegrados…)');
        window.nImpProcesar([x]); var mm=document.getElementById('nR4XMsg'); alert(window._nImpFmsg||'Hecho.'); if(mm&&window._nImpFmsg) mm.textContent=window._nImpFmsg; })
        .catch(function(err){ var mm=document.getElementById('nR4XMsg'); if(mm) mm.textContent='✗ '+err.message; }); };
    inp.click(); });
})();
