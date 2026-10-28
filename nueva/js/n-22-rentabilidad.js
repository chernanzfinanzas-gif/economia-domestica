/* APP NUEVA · Mi cartera → Rentabilidad (boceto 28-oct, decidido con Carlos):
   1. 4 cifras: TIR · Alfa vs IBEX · Ventaja vs IBEX · Retorno 12 meses
   2. Situación de mi inversión, diseño nuevo
   3. Por empresa: Tabla | Barras en un solo bloque (Plusvalía € y % en columnas separadas)
   4. Invertido, valor e IBEX: gráfica combinada con botones de rango y la línea morada
      «de mi nómina ha salido» = compras − dividendos − resultado de lo vendido (regla de Carlos, 11-sep)
   5. De dónde viene el crecimiento: Cascada | Por posición | Por año
   6. Cómo se calcula la rentabilidad, plegado, al final
   Los cálculos son los de siempre; aquí se ordena y se pinta. */
(function(){
  if(typeof renderRentabEmpresas!=='function') return;
  var pc=function(x){ return x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1).replace('.',',')+' %'); };
  var sg=function(x){ return (x>=0?'+':'−')+fmt(Math.abs(x)); };

  /* ---------- 2. Situación de mi inversión ---------- */
  _situacionBanner=function(S){
    if(!S) return '';
    var cN=S.cerr.neto, hayV=S.cerr.n||(S.cerr.parciales&&S.cerr.parciales.n);
    var w=S.valor>0?Math.max(8,Math.min(92,S.aportado/S.valor*100)):50;
    var av=(S.cerr.dobles&&S.cerr.dobles.length)?'<div class="n-sit-av">⚠ '+S.cerr.dobles.join(', ')+' figura archivado como cerrado y a la vez en cartera: revisa, sus dividendos pueden estar contándose dos veces.</div>':'';
    return '<div class="n-sit"><div class="n-sit-h"><span>SITUACIÓN DE MI INVERSIÓN</span><em>a '+new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})+'</em></div>'+
      '<div class="n-sit-g"><div><b class="'+(S.resultado>=0?'n-pos':'n-neg')+'">'+sg(S.resultado)+'</b><small>resultado total</small></div>'+
        '<div><b class="'+(S.pct==null?'':(S.pct>=0?'n-pos':'n-neg'))+'">'+pc(S.pct)+'</b><small>sobre mi dinero</small></div>'+
        '<div><b class="'+(S.tir==null?'':(S.tir>=0?'n-pos':'n-neg'))+'">'+pc(S.tir)+'</b><small>anual'+(S.anio0?' · desde '+S.anio0:'')+'</small></div></div>'+
      (S.resultado>=0?'<div class="n-sit-bar"><div class="b1" style="width:'+w.toFixed(1)+'%"><span>De mi nómina<b>'+fmt(S.aportado)+'</b></span></div><div class="b2"><span>Resultado<b>'+sg(S.resultado)+'</b></span></div></div>':'')+
      '<div class="n-sit-c"><div><span>De mi nómina ha salido</span><b>'+fmt(S.aportado)+'</b><em>compras '+fmt(S.coste)+' − dividendos cobrados '+fmt(S.divCob)+(hayV?((cN>=0?' − ganancia de lo vendido ':' + pérdida de lo vendido ')+fmt(Math.abs(cN))):'')+'</em></div>'+
        '<div><span>Hoy tengo</span><b>'+fmt(S.valor)+'</b><em>valor de mercado de la cartera · '+S.n+' posiciones</em></div>'+
        '<div class="tot"><span>Resultado</span><b class="'+(S.resultado>=0?'n-pos':'n-neg')+'">'+sg(S.resultado)+'</b><em>lo que tengo menos lo que ha salido de mi nómina</em></div></div>'+
      '<div class="n-sit-d"><span class="t">De dónde sale</span><span>dividendos cobrados y reinvertidos <b>'+fmt(S.divCob)+'</b></span>'+
        (hayV?'<span>'+(cN>=0?'ganancia':'pérdida')+' de lo ya vendido <b class="'+(cN>=0?'n-pos':'n-neg')+'">'+sg(cN)+'</b></span>':'')+
        '<span>plusvalía latente de lo que tengo <b class="'+(S.pl>=0?'n-pos':'n-neg')+'">'+sg(S.pl)+'</b></span></div>'+av+
      '<div class="n-sit-p">El porcentaje se mide sobre <b>tu dinero</b> (compras menos lo que se reinvirtió solo), así que <b>no es comparable con un índice</b>: para eso está la cifra anual. Las ventas parciales se cuentan por FIFO.</div></div>';
  };

  /* ---------- 4. Gráfica combinada ---------- */
  var RANGOS=[['1S',7],['1M',30],['3M',91],['6M',182],['1A',365],['5A',1826],['Máx',0]];
  function serieExtra(d){
    var ops=(typeof _allOps==='function'?_allOps():(DB.operaciones||[])).filter(function(o){return o.fecha;}).slice().sort(invByFecha);
    var sold=nFifo(ops).sold.slice().sort(function(a,b){return (a.fVenta||'').localeCompare(b.fVenta||'');});
    var L=d.labels, n=L.length, buys=[], sells=[], cs=[], bi=0, si=0, B=0, V=0, C=0, k;
    var bOps=ops.filter(function(o){return o.tipo!=='venta';}), sOps=ops.filter(function(o){return o.tipo==='venta';});
    for(k=0;k<n;k++){ var dd=L[k];
      while(bi<bOps.length&&(bOps[bi].fecha||'').slice(0,10)<=dd){ B+=num(bOps[bi].acciones)*num(bOps[bi].precio)+khComision(bOps[bi]); bi++; }
      while(si<sOps.length&&(sOps[si].fecha||'').slice(0,10)<=dd){ V+=num(sOps[si].acciones)*num(sOps[si].precio)-khComision(sOps[si]); si++; }
      buys.push(B); sells.push(V); }
    var ci=0; C=0; for(k=0;k<n;k++){ while(ci<sold.length&&(sold[ci].fVenta||'').slice(0,10)<=L[k]){ C+=sold[ci].acc*sold[ci].pc; ci++; } cs.push(C); }
    var coste=[], nomina=[]; for(k=0;k<n;k++){ var div=num(d.valdiv[k])-num(d.valor[k]); coste.push(buys[k]-cs[k]); nomina.push(buys[k]-sells[k]-div);   /* = coste de lo que tengo − resultado de lo vendido − dividendos */ }
    return {coste:coste, nomina:nomina, buys:buys};
  }
  function twrRango(d,i0,i1){ var r=1,ok=false; for(var m=i0+1;m<=i1;m++){ var st=num(d.valdiv[m-1]), fl=num(d.aport[m])-num(d.aport[m-1]), en=num(d.valdiv[m]); if(st>0.01){ r*=(en-fl)/st; ok=true; } } return ok?r-1:null; }
  function idxDesde(L,dias){ if(!dias) return 0; var cut=Date.parse(L[L.length-1]+'T00:00:00')-dias*864e5, i0=0; for(var i=0;i<L.length;i++){ if(Date.parse(L[i]+'T00:00:00')<=cut) i0=i; else break; } return i0; }
  window._nRentaRango=window._nRentaRango||'Máx';
  function chartHTML(d,X){
    var L=d.labels, n=L.length; if(n<2) return '<div class="muted">Pocos datos todavía.</div>';
    var dias=(RANGOS.filter(function(r){return r[0]===window._nRentaRango;})[0]||['Máx',0])[1], i0=idxDesde(L,dias);
    var btns=RANGOS.map(function(r){ var a=idxDesde(L,r[1]), t=twrRango(d,a,n-1); return '<button data-nrango="'+r[0]+'" class="'+(r[0]===window._nRentaRango?'on':'')+'">'+r[0]+' <em class="'+(t==null?'':(t>=0?'n-pos':'n-neg'))+'">'+pc(t)+'</em></button>'; }).join('');
    /* muestreo: como mucho ~700 puntos */
    var idx=[], step=Math.max(1,Math.ceil((n-i0)/700)); for(var i=i0;i<n;i+=step) idx.push(i); if(idx[idx.length-1]!==n-1) idx.push(n-1);
    var S=[{k:'coste',a:X.coste,c:'#94A3B8',w:2,st:true,lb:'Precio de coste (invertido acumulado)'},
           {k:'nomina',a:X.nomina,c:'#7C3AED',w:2,st:true,dash:'6 4',lb:'De mi nómina ha salido (compras − dividendos − resultado de lo vendido)'},
           {k:'valor',a:d.valor,c:'#1F4A9A',w:2.4,lb:'Valor (cotización)'},
           {k:'valdiv',a:d.valdiv,c:'#16A34A',w:2.4,lb:'Valor + dividendos'}];
    if(d.hayIbex) S.push({k:'ibex',a:d.ibexVal,c:'#D97706',w:2,lb:'IBEX-35 TR, mismas aportaciones'});
    var mx=0,mn=1e18; S.forEach(function(s){ idx.forEach(function(i){ var v=num(s.a[i]); if(v>mx)mx=v; if(v<mn)mn=v; }); }); mn=Math.min(mn,0);
    var paso=Math.pow(10,Math.floor(Math.log10(Math.max(mx,1)/4))); [1,2,2.5,5,10].some(function(m){ if(mx/(paso*m)<=6){ paso*=m; return true; } }); var top=Math.ceil(mx/paso)*paso||1;
    var W=1000,H=320,pl=64,pr=12,pt=12,pb=28;
    var xf=function(j){ return pl+(W-pl-pr)*(idx.length<2?0.5:j/(idx.length-1)); }, yf=function(v){ return pt+(H-pt-pb)*(1-(v-mn)/(top-mn)); };
    var g=''; for(var v=0; v<=top+0.5; v+=paso){ g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yf(v).toFixed(1)+'" y2="'+yf(v).toFixed(1)+'" stroke="#EEF1F5"/><text x="'+(pl-8)+'" y="'+(yf(v)+4).toFixed(1)+'" text-anchor="end" font-size="12" fill="#5B6B7C">'+(v>=1000?(v/1000).toLocaleString('es-ES')+' k':v)+' €</text>'; }
    var yrs='', seen={}, lastX=-99; idx.forEach(function(i,j){ var y=L[i].slice(0,4), ym=L[i].slice(0,7); var lab=(dias&&dias<=400)?ym:y; if(!seen[lab]){ seen[lab]=1; var x=xf(j); if(x-lastX>48){ yrs+='<text x="'+x.toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="12" fill="#334155">'+(lab.length>4?(['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][+lab.slice(5)-1]+'-'+lab.slice(2,4)):lab)+'</text>'; lastX=x; } } });
    var lines=S.map(function(s){ var p=''; idx.forEach(function(i,j){ var x=xf(j).toFixed(1), y=yf(num(s.a[i])).toFixed(1); if(!j) p+='M'+x+' '+y; else if(s.st){ p+=' H'+x+' V'+y; } else p+=' L'+x+' '+y; });
      return '<path d="'+p+'" fill="none" stroke="'+s.c+'" stroke-width="'+s.w+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+' stroke-linejoin="round"/>'; }).join('');
    var leg=S.map(function(s){ return '<span><i style="background:'+s.c+(s.dash?';background:repeating-linear-gradient(90deg,'+s.c+' 0 6px,transparent 6px 10px)':'')+'"></i>'+s.lb+'</span>'; }).join('');
    window._nRentaChart={d:d,X:X,idx:idx,S:S,W:W,pl:pl,pr:pr};
    var last=n-1;
    var hoy='Hoy · coste '+fmt(X.coste[last])+' · valor '+fmt(d.valor[last])+' · dividendos cobrados '+fmt(num(d.valdiv[last])-num(d.valor[last]))+' · de mi nómina '+fmt(X.nomina[last])+' · con dividendos '+fmt(d.valdiv[last]);
    return '<div class="n-rng">'+btns+'</div><div class="n-leg">'+leg+'</div>'+
      '<div class="n-chart" id="nRentaChart"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'">'+g+lines+yrs+'<line id="nRcur" x1="0" x2="0" y1="'+pt+'" y2="'+(H-pb)+'" stroke="#94A3B8" stroke-dasharray="3 3" visibility="hidden"/></svg><div class="n-tip" id="nRtip"></div></div>'+
      '<div class="n-hoy">'+hoy+'</div>';
  }
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-nrango]'); if(!b) return; window._nRentaRango=b.getAttribute('data-nrango'); var w=document.getElementById('nRentaWrap'); var C=window._nRentaChart; if(w&&C) w.innerHTML=chartHTML(C.d,C.X); });
  document.addEventListener('mousemove',function(e){ var box=e.target.closest&&e.target.closest('#nRentaChart'); var C=window._nRentaChart; if(!box||!C) return;
    var r=box.getBoundingClientRect(), fx=(e.clientX-r.left)/r.width*C.W; var j=Math.round((fx-C.pl)/(C.W-C.pl-C.pr)*(C.idx.length-1)); j=Math.max(0,Math.min(C.idx.length-1,j)); var i=C.idx[j];
    var cur=document.getElementById('nRcur'), tip=document.getElementById('nRtip'); if(!cur||!tip) return; var x=C.pl+(C.W-C.pl-C.pr)*(C.idx.length<2?0.5:j/(C.idx.length-1));
    cur.setAttribute('x1',x); cur.setAttribute('x2',x); cur.setAttribute('visibility','visible');
    tip.innerHTML='<b>'+ddmmyyyy(C.d.labels[i])+'</b>'+C.S.map(function(s){ return '<span><i style="background:'+s.c+'"></i>'+s.lb.split(' (')[0]+' <b>'+fmt(num(s.a[i]))+'</b></span>'; }).join('');
    tip.style.display='block'; var px=(e.clientX-r.left); tip.style.left=(px>r.width/2?px-tip.offsetWidth-12:px+12)+'px'; });
  document.addEventListener('mouseleave',function(){},true);
  document.addEventListener('mouseout',function(e){ if(e.target.closest&&e.target.closest('#nRentaChart')&&!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest('#nRentaChart'))){ var t=document.getElementById('nRtip'), c=document.getElementById('nRcur'); if(t)t.style.display='none'; if(c)c.setAttribute('visibility','hidden'); } });
  _rentaVsIbexSVG=function(){ return ''; };   /* la sustituye la gráfica combinada */

  /* ---------- montaje de la pestaña ---------- */
  function blk(key,ic,t,sum,inner,open){ return '<div class="pos-blk'+(open?' open':'')+'" data-nrblk="'+key+'"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">'+ic+' '+t+'</span><span class="bsum">'+sum+'</span></div><div class="pos-blk-b"><div class="renta-pad">'+inner+'</div></div></div>'; }
  window._nRentaOpen=window._nRentaOpen||{empresa:true,graf:true,crec:true,meto:false};
  window._nRentaVista=window._nRentaVista||'tabla';
  var o=renderRentabEmpresas;
  renderRentabEmpresas=function(){
    /* el bloque de atribución vive dentro de rentaBody: se pone a salvo antes de que se repinte */
    var _at=document.getElementById('blkAtrib'), _rb=document.getElementById('rentaBody'), _v=document.getElementById('view-rentabilidad');
    if(_at&&_rb&&_rb.contains(_at)&&_v) _v.appendChild(_at);
    var _ot=document.getElementById('rentaOrden'); _ot=_ot&&_ot.closest('.toolbar'); if(_ot&&_rb&&_rb.contains(_ot)&&_rb.parentNode) _rb.parentNode.insertBefore(_ot,_rb);
    o.apply(this,arguments);
    try{
      var el=document.getElementById('rentaBody'); if(!el||!el.querySelector('[data-rentablk]')) return;
      var R=rentabilidadEmpresas(renderRentabEmpresas), CR=carteraRentabilidad(renderRentabEmpresas), d=carteraEvolData(renderRentabEmpresas);
      /* 1. cifras */
      var A=(typeof crecimientoAtribucion==='function')?crecimientoAtribucion(12):null, r12=(A&&A.valIni>0.01)?A.retorno/A.valIni:null;
      var kp=document.getElementById('rentaKpis');
      if(kp){ kp.className='n-ctrl'; kp.style.marginBottom='';
        kp.innerHTML=nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'📊',t:'TIR cartera (anual)',v:CR?pc(CR.xirr):'—',vCls:CR&&CR.xirr!=null?(CR.xirr>=0?'n-pos':'n-neg'):'',s:'rentabilidad anual ponderada por dinero'})+
          nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'α',t:'Alfa vs IBEX (anual)',v:CR&&CR.alfa!=null?pc(CR.alfa):'—',vCls:CR&&CR.alfa!=null?(CR.alfa>=0?'n-pos':'n-neg'):'',s:'exceso anual sobre el IBEX con dividendos'})+
          nKpi({c:'#D97706',bg:'#FEF3C7',ic:'⚖️',t:'Ventaja vs IBEX',v:CR&&CR.valDif!=null?sg(CR.valDif):'—',vCls:CR&&CR.valDif!=null?(CR.valDif>=0?'n-pos':'n-neg'):'',s:'frente a meter el mismo dinero, en las mismas fechas, en el IBEX-TR'})+
          nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'🔁',t:'Retorno 12 meses',v:pc(r12),vCls:r12==null?'':(r12>=0?'n-pos':'n-neg'),s:'mercado + dividendos, sin contar el dinero nuevo'+(A?' · '+sg(A.retorno):'')}); }
      /* piezas del render de siempre */
      var sit=el.querySelector('.n-sit,.si-ban'), get=function(k){ var b=el.querySelector('[data-rentablk="'+k+'"] .renta-pad'); return b?b.innerHTML:''; };
      var tabla=get('tabla'), barras=get('barras'), ibex=get('ibex'), meto=get('meto');
      /* 3. por empresa */
      var seg='<div class="n-seg n-vseg"><button data-nvista="tabla" class="'+(window._nRentaVista==='tabla'?'on':'')+'">Tabla</button><button data-nvista="barras" class="'+(window._nRentaVista==='barras'?'on':'')+'">Barras</button></div>';
      var emp=seg+'<div data-nv="tabla"'+(window._nRentaVista==='tabla'?'':' style="display:none"')+'>'+tabla+'</div><div data-nv="barras"'+(window._nRentaVista==='barras'?'':' style="display:none"')+'>'+barras+'</div>';
      /* 4. gráfica + tarjetas + frase de dividendos */
      var T=_rentaTotales(R.rows), gan=T.pl+T.divCob;
      var frase=gan>0?'<div class="n-frase">De los <b>'+fmt(gan)+'</b> que llevas ganados sobre lo aportado, <b>'+fmt(T.divCob)+'</b> son dividendos cobrados, el <b>'+Math.round(T.divCob/gan*100)+' %</b>. El resto lo ha puesto la cotización.</div>':'';
      var graf='<div id="nRentaWrap">'+((d&&d.ok)?chartHTML(d,serieExtra(d)):'<div class="muted">Cargando cotizaciones…</div>')+'</div>'+ibex+frase;
      var nm=R.rows.length;
      el.innerHTML=(sit?sit.outerHTML:'')+
        blk('empresa','🏢','Por empresa','tu rentabilidad real, con tus fechas y tus dividendos · '+nm+' posiciones · TIR '+(CR?pc(CR.xirr):'—'),emp,window._nRentaOpen.empresa)+
        blk('graf','📈','Invertido, valor e IBEX','lo que has invertido, lo que vale (con y sin dividendos) y lo que valdría el mismo dinero en el IBEX-35',graf,window._nRentaOpen.graf)+
        '<div id="nCrecSlot"></div>'+
        blk('meto','ℹ️','Cómo se calcula la rentabilidad','rentabilidad total · TIR · TR',meto,window._nRentaOpen.meto);
      montarCrec(); partirPlusvalia(el);
      var ord=document.getElementById('rentaOrden'), tb=ord&&ord.closest('.toolbar'), sl=el.querySelector('[data-nrblk="empresa"] .n-vseg');
      if(tb&&sl){ tb.classList.add('n-ord'); sl.after(tb); }
    }catch(e){ console.error('n-renta',e); }
  };
  document.addEventListener('click',function(e){
    var v=e.target.closest&&e.target.closest('[data-nvista]'); if(v){ window._nRentaVista=v.getAttribute('data-nvista'); var p=v.closest('.renta-pad'); p.querySelectorAll('[data-nvista]').forEach(function(b){b.classList.toggle('on',b===v);}); p.querySelectorAll('[data-nv]').forEach(function(x){ x.style.display=(x.getAttribute('data-nv')===window._nRentaVista)?'':'none'; }); return; }
    var h=e.target.closest&&e.target.closest('#rentaBody [data-nrblk]>.pos-blk-h'); if(h){ e.stopPropagation(); var b=h.parentElement; b.classList.toggle('open'); window._nRentaOpen[b.getAttribute('data-nrblk')]=b.classList.contains('open'); }
  },true);

  /* Plusvalía en € y en % en columnas separadas (Carlos, 28-oct) */
  function partirPlusvalia(root){
    root.querySelectorAll('[data-nv="tabla"] table.mt-tbl').forEach(function(t){
      var ths=[].slice.call(t.querySelectorAll('thead th')), ix=-1; ths.forEach(function(th,i){ if(/^\s*Plusval[ií]a\s*$/.test(th.textContent)) ix=i; }); if(ix<0) return;
      var nt=document.createElement('th'); nt.textContent='%'; nt.className='n-pcth'; ths[ix].after(nt);
      t.querySelectorAll('tbody tr').forEach(function(tr){ var c=tr.children; if(c.length===1&&c[0].hasAttribute('colspan')){ c[0].colSpan=(+c[0].colSpan||1)+1; return; }
        var td=c[ix]; if(!td) return; var nd=document.createElement('td'); nd.className='n-pctd'; var pill=td.querySelector('.mt-pill'); if(pill) nd.appendChild(pill);
        else { var m=td.innerHTML.match(/\s*\(?([+\-−]?\d[\d.,]*\s*%)\)?\s*$/); if(m){ td.innerHTML=td.innerHTML.slice(0,m.index); nd.textContent=m[1]; } }
        td.after(nd); });
    });
  }

  /* ---------- 5. De dónde viene el crecimiento ---------- */
  function montarCrec(){
    var slot=document.getElementById('nCrecSlot'), at=document.getElementById('blkAtrib'); if(!slot||!at) return;
    var b=document.createElement('div'); b.className='pos-blk'+(window._nRentaOpen.crec?' open':''); b.setAttribute('data-nrblk','crec');
    b.innerHTML='<div class="pos-blk-h"><span class="arw">▶</span><span class="bt">🔍 De dónde viene el crecimiento</span><span class="bsum">dinero nuevo que aportaste, dividendos cobrados y lo que hizo el mercado</span></div><div class="pos-blk-b"><div class="renta-pad"></div></div>';
    slot.replaceWith(b); b.querySelector('.renta-pad').appendChild(at); at.style.marginTop='0';
    var vh=at.querySelector('.vhero'); if(vh) vh.style.display='none';
  }
  window._nCrecVista=window._nCrecVista||'cascada';
  function atribActual(d){
    var nowY=new Date().getFullYear(), A=null, tit='';
    if(atribSel.modo==='ytd'){ A=atribucionRango(nowY*100+1,nowY*100+12); tit='Valor al empezar '+nowY; }
    else if(atribSel.modo==='anio'&&atribSel.anio){ A=atribucionRango(atribSel.anio*100+1,atribSel.anio*100+12); tit='Valor al empezar '+atribSel.anio; }
    else if(atribSel.modo==='todo'){ A=_atribFrom(_evoState(d,null),_evoState(d,d.labels.length-1)); tit='Valor al empezar'; }
    else if(atribSel.modo==='rango'&&atribSel.desde&&atribSel.hasta){ A=atribucionRango(+atribSel.desde.slice(0,4)*100+(+atribSel.desde.slice(5,7)),+atribSel.hasta.slice(0,4)*100+(+atribSel.hasta.slice(5,7))); tit='Valor el '+ddmmyyyy(atribSel.desde); }
    else { A=crecimientoAtribucion(12); tit='Valor hace 12 meses'; }
    return {A:A,tit:tit};
  }
  function barra(lb,ini,ancho,max,col,txt,cls){ var l=max?ini/max*100:0, w=max?Math.max(0.6,ancho/max*100):0;
    return '<div class="n-cas"><span class="lb">'+lb+'</span><div class="tr"><i style="left:'+l.toFixed(2)+'%;width:'+w.toFixed(2)+'%;background:'+col+'"></i></div><b class="'+(cls||'')+'" style="color:'+col+'">'+txt+'</b></div>'; }
  function cascada(A,tit){
    var ef=A.aportacion-A.dividendos, vi=num(A.valIni), vf=num(A.valFin), pasos=[['Aportaciones (dinero nuevo)',ef,'#2563EB'],['Dividendos reinvertidos',A.dividendos,'#16A34A'],['Mercado (revalorización)',A.revaloriz,null]];
    var run=vi, mx=Math.max(vi,vf), mn=0; pasos.forEach(function(p){ run+=p[1]; mx=Math.max(mx,run); });
    var h=barra(tit,0,vi,mx,'#64748B',fmt(vi)); run=vi;
    pasos.forEach(function(p){ var a=run, b=run+p[1], col=p[2]||(p[1]>=0?'#16A34A':'#DC2626'); h+=barra(p[0],Math.min(a,b),Math.abs(p[1]),mx,col,sg(p[1])); run=b; });
    h+=barra('Valor hoy',0,vf,mx,'#1F4A9A',fmt(vf));
    return h+'<div class="n-cas-n">Tu cartera pasó de <b>'+fmt(vi)+'</b> a <b>'+fmt(vf)+'</b>: <b style="color:#2563EB">'+sg(ef)+'</b> de dinero nuevo de tu bolsillo; el resto lo generó la cartera sola: dividendos <b style="color:#16A34A">'+sg(A.dividendos)+'</b> + mercado <b>'+sg(A.revaloriz)+'</b> = retorno <b>'+sg(A.retorno)+'</b>.</div>';
  }
  function porPosicion(){
    var RE=rentabilidadEmpresas(renderAtribucion); if(!RE||RE.empty||RE.loading) return '<div class="muted">Sin posiciones o cargando cotizaciones…</div>';
    var tc=RE.rows.reduce(function(s,r){return s+r.coste;},0)||1, V=RE.rows.map(function(r){ var e=r.pl+r.divCob; return {t:r.t,e:e,pp:e/tc*100}; }).sort(function(a,b){return b.pp-a.pp;});
    var tot=V.reduce(function(s,x){return s+x.pp;},0), mx=Math.max.apply(null,V.map(function(x){return Math.abs(x.pp);}))||1;
    return '<div class="n-cas-t">Contribución de cada posición al retorno total (<b>'+(tot>=0?'+':'')+tot.toFixed(1).replace('.',',')+' %</b> con dividendos), en puntos y en € de balance</div>'+
      V.map(function(x){ var c=x.pp>=0?'#16A34A':'#DC2626'; return '<div class="n-pp"><b data-ficha="'+x.t+'">'+x.t+'</b><div class="tr"><i style="width:'+(Math.abs(x.pp)/mx*100).toFixed(1)+'%;background:'+c+'"></i></div><span style="color:'+c+'">'+(x.pp>=0?'+':'')+x.pp.toFixed(1).replace('.',',')+' pp</span><em>'+sg(x.e)+'</em></div>'; }).join('')+
      '<div class="n-cas-n">Revela si tu resultado depende de uno o dos nombres y ayuda a decidir si tomar beneficios o reequilibrar.</div>';
  }
  function porAnio(d){
    var ys=[]; d.labels.forEach(function(l){ var y=+l.slice(0,4); if(ys.indexOf(y)<0) ys.push(y); });
    var rows='', T={e:0,dv:0,m:0}; ys.forEach(function(y){ var A=atribucionRango(y*100+1,y*100+12); if(!A) return; var ef=A.aportacion-A.dividendos; T.e+=ef; T.dv+=A.dividendos; T.m+=A.revaloriz;
      var c=function(v){ return '<td class="r" style="color:'+(v>=0?'#15803D':'#B91C1C')+'">'+sg(v)+'</td>'; };
      rows+='<tr><td><b>'+y+'</b></td><td class="r">'+sg(ef)+'</td>'+c(A.dividendos)+c(A.revaloriz)+c(A.retorno)+'<td class="r"><b>'+sg(A.crecValor)+'</b></td></tr>'; });
    return '<div class="n-cas-t">Efectivo nuevo + Dividendo reinvertido + Mercado = crecimiento del valor de cada año. La suma reconstruye el valor actual.</div>'+
      '<div style="overflow-x:auto"><table class="n-tab"><thead><tr><th>Año</th><th class="r">Efectivo nuevo</th><th class="r">Dividendo</th><th class="r">Mercado</th><th class="r">Retorno</th><th class="r">Crec. valor</th></tr></thead><tbody>'+rows+'</tbody>'+
      '<tfoot><tr><td>Total</td><td class="r">'+sg(T.e)+'</td><td class="r">'+sg(T.dv)+'</td><td class="r">'+sg(T.m)+'</td><td class="r">'+sg(T.dv+T.m)+'</td><td class="r">'+sg(T.e+T.dv+T.m)+'</td></tr></tfoot></table></div>';
  }
  if(typeof renderAtribucion==='function'){ var oA=renderAtribucion; renderAtribucion=function(){ oA.apply(this,arguments);
    try{ var el=document.getElementById('atribBody'); if(!el) return; var kp=document.getElementById('atribKpis'); if(kp) kp.style.display='none';
      var at=document.getElementById('blkAtrib'); if(at){ at.classList.add('n-atrib'); }
      var d=carteraEvolData(renderAtribucion); if(!d||!d.ok) return;
      var X=atribActual(d); if(!X.A) return;
      var L={cascada:'Cascada',contrib:'Por posición',anual:'Por año'};
      var seg='<div class="n-seg n-vseg">'+Object.keys(L).map(function(k){ return '<button data-ncrec="'+k+'" class="'+(window._nCrecVista===k?'on':'')+'">'+L[k]+'</button>'; }).join('')+'</div>';
      var V={cascada:cascada(X.A,X.tit),contrib:porPosicion(),anual:porAnio(d)};
      el.innerHTML=seg+Object.keys(L).map(function(k){ return '<div data-ncv="'+k+'"'+(k===window._nCrecVista?'':' style="display:none"')+'>'+V[k]+'</div>'; }).join('');
    }catch(e){ console.error('n-crec',e); } };
    document.addEventListener('click',function(e){ var v=e.target.closest&&e.target.closest('[data-ncrec]'); if(!v) return; window._nCrecVista=v.getAttribute('data-ncrec'); var el=document.getElementById('atribBody'); el.querySelectorAll('[data-ncrec]').forEach(function(b){b.classList.toggle('on',b===v);}); el.querySelectorAll('[data-ncv]').forEach(function(x){ x.style.display=x.getAttribute('data-ncv')===window._nCrecVista?'':'none'; }); });
  }
})();
