/* APP NUEVA · Sistema › Gráficas con el aspecto de la app nueva (1-nov-2026, paso 2 de Sistema; Carlos: «pasa a las gráficas»).
   Solo aspecto: las 18 gráficas y sus cálculos no cambian (renderGraficas de siempre).
   - Las 4 cifras de arriba con las tarjetas nuevas (icono, color y frase).
   - En vez de tres bloques que hay que abrir, tres botones: 🏠 Hogar · 💼 Cartera y patrimonio · 💰 Dividendos.
     Se ve una sección cada vez, ya abierta; el selector de año va al lado (solo afecta a Hogar, se dice).
   - Las gráficas en tarjetas blancas de dos en dos (una en el móvil). */
(function(){
  if(typeof renderGraficas!=='function') return;
  window._nGrafSec=window._nGrafSec||'hogar';
  var SEC=[['hogar','🏠','Hogar','gasto, ahorro y presupuesto'],['cartera','💼','Cartera y patrimonio','valor, reparto y rentabilidad'],['div','💰','Dividendos','renta y bola de nieve']];
  function txt(el,s){ var x=el&&el.querySelector(s); return x?x.innerHTML:''; }
  function kpis(){ var kp=document.getElementById('grafKpis'); if(!kp||typeof nKpi!=='function') return; var K=kp.querySelectorAll('.k'); if(K.length<4) return;
    var C=[['#15803D','#DCFCE7','🐖'],['#DC2626','#FEE2E2','💸'],['#1F4A9A','#EAF1FD','📈'],['#D97706','#FEF3C7','💰']];
    var h=''; [].forEach.call(K,function(k,i){ var c=C[i]||C[0]; h+=nKpi({c:c[0],bg:c[1],ic:c[2],t:txt(k,'.l'),v:txt(k,'.v'),vCls:i===0?'n-pos':'',s:(i===3?'<b>(Cartera completa)</b> lo que cobraría tu cartera de hoy en todo el año · ':'')+txt(k,'.p')}); });   /* Carlos 1-nov 20:38 */
    kp.className='n-ctrl n-graf-k'; kp.innerHTML=h; }
  function secciones(){ var V=document.getElementById('view-graficas'), body=document.getElementById('grafBody'); if(!V||!body) return;
    var bar=document.getElementById('nGrafBar'), tb=V.querySelector('.toolbar #grafYear'); tb=tb&&tb.closest('.toolbar');
    if(!bar){ bar=document.createElement('div'); bar.id='nGrafBar'; bar.className='n-graf-bar'; body.parentNode.insertBefore(bar,body); }
    bar.innerHTML='<div class="n-seg n-graf-seg">'+SEC.map(function(s){ return '<button data-ngsec="'+s[0]+'" class="'+(window._nGrafSec===s[0]?'on':'')+'">'+s[1]+' '+s[2]+'</button>'; }).join('')+'</div><span class="n-graf-sum"></span>';
    if(tb){ tb.classList.add('n-graf-year'); bar.appendChild(tb); var lb=tb.querySelector('.muted'); if(lb) lb.textContent=window._nGrafSec==='hogar'?'Año:':'Año (solo Hogar):'; }
    var s0=SEC.filter(function(s){ return s[0]===window._nGrafSec; })[0]; bar.querySelector('.n-graf-sum').textContent=s0?s0[3]:'';
    [].forEach.call(body.querySelectorAll('.pos-blk[data-grafblk]'),function(b){ var k=b.getAttribute('data-grafblk'); b.classList.add('n-graf-blk'); b.classList.toggle('open',k===window._nGrafSec); b.style.display=(k===window._nGrafSec)?'':'none'; }); }

  /* ---------- HOGAR en dos tarjetas (Carlos, 1-nov 20:12): «reparto por titular se puede quitar… grupos, top categorías y top
     comercios se podían combinar y la tasa de ahorro podría estar en la primera, indicando lo que se ha ahorrado cada mes» ---------- */
  var MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function eur(x){ var v=Math.round(x); return (v<0?'−':'')+String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' €'; }
  function kE(x){ var a=Math.abs(x); return (x<0?'−':'')+(a>=1000?(Math.round(a/100)/10).toString().replace('.',',')+'k':Math.round(a))+'€'; }
  window._nGrafRep=window._nGrafRep||'grupo';
  function datosHogar(){ var Y=(typeof grafYear!=='undefined')?grafYear:new Date().getFullYear(), all=Y==='all';
    var movs=(DB.movimientos||[]).filter(function(m){ return m.fecha&&(all||+m.fecha.slice(0,4)===Y); });
    var et, G=[], I=[], P=[];
    if(all){ et=[]; movs.forEach(function(m){ var y=m.fecha.slice(0,4); if(et.indexOf(y)<0) et.push(y); }); et.sort();
      et.forEach(function(y){ var g=0,i=0; movs.forEach(function(m){ if(m.fecha.slice(0,4)!==y) return; if(m.tipo==='gasto') g+=N(m.importe); else if(m.tipo==='ingreso') i+=N(m.importe); }); G.push(g); I.push(i);
        var pm=0; (DB.presupuesto||[]).filter(function(q){ return typeof pAnio==='function'&&pAnio(q)===+y; }).forEach(function(q){ var c=catById(q.categoriaId); if(c&&c.tipo==='gasto') pm+=mensual(q); }); P.push(pm*12); }); }
    else { et=MES.slice(); G=new Array(12).fill(0); I=new Array(12).fill(0);
      movs.forEach(function(m){ var mo=+m.fecha.slice(5,7)-1; if(mo<0||mo>11) return; if(m.tipo==='gasto') G[mo]+=N(m.importe); else if(m.tipo==='ingreso') I[mo]+=N(m.importe); });
      var pm=0; (DB.presupuesto||[]).filter(function(q){ return typeof pAnio==='function'&&pAnio(q)===Y; }).forEach(function(q){ var c=catById(q.categoriaId); if(c&&c.tipo==='gasto') pm+=mensual(q); }); P=new Array(12).fill(pm); }
    /* meses sin movimientos (futuros) no cuentan ahorro */
    var A=G.map(function(g,i){ return (g||I[i])?I[i]-g:null; });
    return {Y:Y,all:all,et:et,G:G,I:I,P:P,A:A,movs:movs}; }
  function cardMes(d){ var W=1040,H=300,L=46,R=10,T=34,B=46, n=d.et.length;
    var vals=[0]; d.G.forEach(function(v){ vals.push(v); }); d.P.forEach(function(v){ vals.push(v); }); d.A.forEach(function(v){ if(v!=null) vals.push(v); });
    var mx=Math.max.apply(null,vals), mn=Math.min.apply(null,vals); if(mx<=0) mx=1; var rng=mx-mn;
    function y(v){ return T+(mx-v)/rng*(H-T-B); }
    var gw=(W-L-R)/n, bw=Math.min(22,gw/4.2), svg='';
    /* rejilla */
    var st=Math.pow(10,Math.floor(Math.log10(rng/4))), step=[1,2,2.5,5,10].map(function(k){ return k*st; }).filter(function(s){ return rng/s<=6; })[0]||st;
    for(var v=Math.ceil(mn/step)*step; v<=mx+1e-9; v+=step){ svg+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="'+(Math.abs(v)<1e-9?'#94A3B8':'#EEF2F7')+'"/><text x="'+(L-6)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="11" fill="#94A3B8">'+kE(v)+'</text>'; }
    d.et.forEach(function(lab,i){ var x0=L+i*gw+(gw-3*bw-6)/2;
      function bar(x,v,col,tit){ if(!v) return ''; var a=y(Math.max(v,0)), b=y(Math.min(v,0)); return '<rect x="'+x+'" y="'+a+'" width="'+bw+'" height="'+Math.max(1,b-a)+'" rx="2" fill="'+col+'"><title>'+tit+'</title></rect>'; }
      svg+=bar(x0,d.G[i],'#DC2626',lab+' · gasto '+eur(d.G[i]))+bar(x0+bw+3,d.P[i],'#CBD5E1',lab+' · presupuesto '+eur(d.P[i]));
      var a=d.A[i]; if(a!=null){ var tasa=d.I[i]?Math.round(a/d.I[i]*100):null;
        svg+=bar(x0+2*bw+6,a,a>=0?'#16A34A':'#F87171',lab+' · ahorro '+eur(a)+(tasa!=null?' ('+tasa+' %)':''));
        var ty=a>=0?y(a)-16:y(a)+12, cx=x0+2.5*bw+6; svg+='<text x="'+cx+'" y="'+ty+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+(a>=0?'#15803D':'#DC2626')+'">'+kE(a)+'</text>'+(tasa!=null?'<text x="'+cx+'" y="'+(ty+11)+'" text-anchor="middle" font-size="9.5" fill="#64748B">'+tasa+'%</text>':''); }
      svg+='<text x="'+(L+i*gw+gw/2)+'" y="'+(H-B+18)+'" text-anchor="middle" font-size="12" fill="#475569">'+lab+'</text>'; });
    /* KPI de los periodos CERRADOS (Carlos, 1-nov 20:22): meses ya terminados del año elegido (o años terminados en «Todos») */
    var now=new Date(), cy=now.getFullYear(), cm=now.getMonth(), cer=[];
    d.et.forEach(function(lab,i){ var ok=d.all?(+lab<cy):(d.Y<cy||(d.Y===cy&&i<cm)); if(ok&&(d.G[i]||d.I[i])) cer.push(i); });
    var ci=0,cg=0,tasas=[]; cer.forEach(function(i){ ci+=d.I[i]; cg+=d.G[i]; if(d.I[i]) tasas.push((d.I[i]-d.G[i])/d.I[i]); });
    var ca=ci-cg, tm=ci?ca/ci:null, ts=tasas.length?tasas.reduce(function(a,b){ return a+b; },0)/tasas.length:null, nper=cer.length, uni=d.all?(nper===1?'año':'años'):(nper===1?'mes':'meses');
    var desde=nper?d.et[cer[0]]:'', hasta=nper?d.et[cer[cer.length-1]]:'';
    function k(t,v,sub,cls){ return '<div class="k"><span class="l">'+t+'</span><span class="v '+(cls||'')+'">'+v+'</span><span class="s">'+sub+'</span></div>'; }
    var kp=nper?('<div class="n-gh-kp">'+
      k('Ingresos',eur(ci),eur(ci/nper)+' de media al '+(d.all?'año':'mes'))+
      k('Gastos',eur(cg),eur(cg/nper)+' de media al '+(d.all?'año':'mes'))+
      k('Ahorrado',eur(ca),eur(ca/nper)+' de media al '+(d.all?'año':'mes'),ca>=0?'n-pos':'n-neg')+
      k('Tasa de ahorro media',tm==null?'—':Math.round(tm*100)+' %','ahorrado ÷ ingresado'+(ts!=null?' · media de los '+uni+': '+Math.round(ts*100)+' %':''),tm!=null&&tm>=0?'n-pos':'n-neg')+
      '</div><div class="n-gh-s">'+(d.all?'Años cerrados':'Meses cerrados')+': <b>'+nper+' '+uni+'</b> ('+desde+(nper>1?' a '+hasta:'')+')'+(d.all?'':' · el mes en curso no cuenta hasta que termine')+'.</div>'):'<div class="n-gh-s">Aún no hay ningún '+(d.all?'año':'mes')+' cerrado.</div>';
    return '<div class="card n-gh-card n-gh-w"><div class="n-gh-t">Mes a mes · '+(d.all?'por año':d.Y)+'</div>'+kp+
      '<div class="n-gh-sc"><svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block">'+svg+'</svg></div>'+
      '<div class="n-gh-leg"><span><b style="background:#DC2626"></b>Gasto real</span><span><b style="background:#CBD5E1"></b>Presupuesto</span><span><b style="background:#16A34A"></b>Ahorrado (ingresos − gastos) y su %</span></div></div>'; }
  function cardReparto(d){ var k=window._nGrafRep, M={}, tot=0, PAL=['#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#65A30D','#EA580C','#0D9488','#9333EA','#CA8A04'];
    d.movs.filter(function(m){ return m.tipo==='gasto'; }).forEach(function(m){ var c=catById(m.categoriaId), lab;
      if(k==='grupo') lab=(c&&c.grupo)||'Otros'; else if(k==='cat') lab=(c&&c.nombre)||'Otros'; else lab=String(m.comercio||'').trim()||'(sin comercio)';
      M[lab]=(M[lab]||0)+N(m.importe); tot+=N(m.importe); });
    var L=Object.keys(M).map(function(x){ return {l:x,v:M[x]}; }).sort(function(a,b){ return b.v-a.v; }), top=L.slice(0,12), resto=L.slice(12).reduce(function(s,x){ return s+x.v; },0), mx=top.length?top[0].v:1;
    var h='<div class="card n-gh-card n-gh-w"><div class="n-gh-hd"><div class="n-gh-t">En qué se va el dinero · '+(d.all?'todos los años':d.Y)+'</div><div class="n-seg n-gh-seg">'+
      [['grupo','Por grupo'],['cat','Por categoría'],['com','Por comercio']].map(function(o){ return '<button data-ngrep="'+o[0]+'" class="'+(k===o[0]?'on':'')+'">'+o[1]+'</button>'; }).join('')+'</div></div>'+
      '<div class="n-gh-s">'+eur(tot)+' de gasto · '+L.length+(k==='grupo'?' grupos':k==='cat'?' categorías':' comercios')+(L.length>12?' · las 12 primeras':'')+'</div><div class="n-gh-rep">';
    top.forEach(function(x,i){ var pc=tot?x.v/tot*100:0; h+='<div class="r"><span class="l" title="'+E(x.l)+'">'+E(x.l)+'</span><span class="b"><i style="width:'+(x.v/mx*100).toFixed(1)+'%;background:'+PAL[i%PAL.length]+'"></i></span><span class="v">'+eur(x.v)+'</span><span class="p">'+pc.toFixed(pc<10?1:0).replace('.',',')+' %</span></div>'; });
    if(resto>0) h+='<div class="r mu"><span class="l">resto ('+(L.length-12)+')</span><span class="b"></span><span class="v">'+eur(resto)+'</span><span class="p">'+(resto/tot*100).toFixed(1).replace('.',',')+' %</span></div>';
    return h+'</div></div>'; }
  function hogar(){ var b=document.querySelector('#grafBody .pos-blk[data-grafblk="hogar"] .graf-grid'); if(!b||typeof catById!=='function') return;
    var d=datosHogar(); b.classList.add('n-gh'); b.innerHTML=cardMes(d)+cardReparto(d); }
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-ngrep]'); if(!b) return; window._nGrafRep=b.getAttribute('data-ngrep'); try{ hogar(); }catch(err){} },true);

  /* ---------- DIVIDENDOS (Carlos, 1-nov 20:29): cifras del año en la primera gráfica y aclarar la bola de nieve ---------- */
  function divid(){ var B=document.querySelector('#grafBody .pos-blk[data-grafblk="div"]'); if(!B) return;
    var cards=[].slice.call(B.querySelectorAll('.graf-grid > *'));
    var c1=cards.filter(function(c){ return /Dividendo estimado por mes/.test(c.textContent); })[0];
    if(c1&&!c1.querySelector('.n-gd-kp')&&typeof window.nDivKpis==='function'){ var K=window.nDivKpis()||{}, tot=(K.cob||0)+(K.pend||0), ch=(K.sig&&tot)?(K.sig/tot-1):null;
      function k(t,v,sub,cls){ return '<div class="k"><span class="l">'+t+'</span><span class="v '+(cls||'')+'">'+v+'</span><span class="s">'+sub+'</span></div>'; }
      var px=K.prox?('próximo: '+K.prox.t+' el '+K.prox.f.slice(8,10)+'/'+K.prox.f.slice(5,7)+' ('+eur(K.prox.v)+')'):'nada más previsto este año';
      var h='<div class="n-gh-kp n-gd-kp">'+
        k('Total '+K.y,eur(tot),'cobrado + por cobrar · '+eur(tot/12)+' de media al mes','n-pos')+
        k('Cobrado','<span>'+eur(K.cob||0)+'</span>',(tot?Math.round((K.cob||0)/tot*100):0)+' % del año, hasta hoy')+
        k('Por cobrar',eur(K.pend||0),px)+
        k('Previsto '+(K.y+1),K.sig?eur(K.sig):'—',ch==null?'con tu cartera actual':((ch>=0?'+':'')+Math.round(ch*100)+' % frente a '+K.y+', con tu cartera actual'),ch!=null&&ch<0?'n-neg':'')+
        '</div><div class="n-gh-s">Bruto, de las empresas que tienes hoy. Son las mismas cifras de la pestaña Dividendos.</div>';
      var t=c1.firstElementChild; if(t) t.insertAdjacentHTML('afterend',h); else c1.insertAdjacentHTML('afterbegin',h); }
    var bn=cards.filter(function(c){ return /Bola de nieve/.test(c.textContent); })[0];
    if(bn&&!bn.querySelector('.n-gd-bn')){ var w=document.createTreeWalker(bn,NodeFilter.SHOW_TEXT,null),n;
      while((n=w.nextNode())){ if(/Bola de nieve del dividendo/.test(n.nodeValue)){ n.nodeValue='Bola de nieve del dividendo · total acumulado desde el inicio'; var el=n.parentElement;
        el.insertAdjacentHTML('afterend','<div class="n-gh-s n-gd-bn">Cada barra es la <b>suma de todos los dividendos cobrados desde que empezaste a invertir (2011) hasta ese año</b>, no lo de ese año solo. En naranja, la proyección del Simulador.</div>'); break; } } }
  }
  var o=renderGraficas; renderGraficas=function(){ var r=o.apply(this,arguments); try{ kpis(); hogar(); divid(); secciones(); }catch(e){ console.warn('[n-graficas]',e); } return r; };
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-ngsec]'); if(!b) return; window._nGrafSec=b.getAttribute('data-ngsec'); try{ secciones(); }catch(err){} },true);
  var st=document.createElement('style'); st.textContent=
    '#view-graficas .n-graf-k{margin:0 0 14px}'+
    '.n-graf-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px}.n-graf-sum{color:#64748B;font-size:12.5px}'+
    '.n-graf-seg{display:inline-flex;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:3px;gap:2px}.n-graf-seg button{border:0;background:transparent;padding:8px 14px;border-radius:9px;font:inherit;font-size:13.5px;font-weight:700;color:#475569;cursor:pointer}'+
    '.n-graf-seg button.on{background:#1F4A9A;color:#fff}.n-graf-year{margin:0 0 0 auto!important}'+
    '#view-graficas .n-graf-blk{background:transparent!important;border:0!important;box-shadow:none!important}#view-graficas .n-graf-blk>.pos-blk-h{display:none!important}#view-graficas .n-graf-blk>.pos-blk-b{padding:0!important}'+
    '#view-graficas .graf-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important}'+
    '#view-graficas .graf-grid>.card,#view-graficas .graf-grid>div{background:#fff!important;border:1px solid #E5E9EF!important;border-radius:14px!important;box-shadow:0 1px 3px rgba(20,34,49,.06)!important;padding:14px 16px!important;margin:0!important}'+
    '@media(max-width:800px){#view-graficas .graf-grid{grid-template-columns:1fr!important}.n-graf-seg{width:100%}.n-graf-seg button{flex:1;padding:8px 6px;font-size:12.5px}.n-graf-year{margin:0!important}}';
  st.textContent+='#view-graficas .graf-grid.n-gh{grid-template-columns:1fr!important}.n-gh-t{font-weight:800;font-size:14.5px;color:#1E293B}.n-gh-s{font-size:12.5px;color:#64748B;margin:3px 0 8px}'+
    '.n-gh-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.n-gh-seg{display:inline-flex;background:#F1F5F9;border-radius:10px;padding:3px;gap:2px}.n-gh-seg button{border:0;background:transparent;padding:6px 12px;border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer}.n-gh-seg button.on{background:#fff;color:#1F4A9A;box-shadow:0 1px 2px rgba(0,0,0,.08)}'+
    '.n-gh-leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#475569;margin-top:4px}.n-gh-leg b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}'+
    '.n-gh-rep .r{display:grid;grid-template-columns:200px 1fr 100px 56px;gap:10px;align-items:center;padding:4px 0;font-size:13px}.n-gh-rep .l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334155}.n-gh-rep .b{height:14px;background:#F1F5F9;border-radius:4px;overflow:hidden}.n-gh-rep .b i{display:block;height:100%;border-radius:4px}.n-gh-rep .v{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}.n-gh-rep .p{text-align:right;color:#64748B;font-size:12px}.n-gh-rep .mu{color:#94A3B8}'+
    '.n-gh-kp{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0 4px}.n-gh-kp .k{background:#F8FAFC;border:1px solid #EEF2F7;border-radius:12px;padding:10px 12px}.n-gh-kp .l{display:block;font-size:11.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.02em}.n-gh-kp .v{display:block;font-size:21px;font-weight:800;margin:3px 0 1px;color:#1E293B}.n-gh-kp .v.n-pos{color:#15803D}.n-gh-kp .v.n-neg{color:#DC2626}.n-gh-kp .s{font-size:11.5px;color:#64748B}@media(max-width:700px){.n-gh-kp{grid-template-columns:1fr 1fr}}'+
    '.n-gd-kp{grid-template-columns:1fr 1fr!important}.n-gd-kp .v{font-size:19px!important}'+
    '.n-gh-sc{overflow-x:auto}@media(max-width:700px){.n-gh-sc svg{min-width:760px}.n-gh-rep .r{grid-template-columns:110px 1fr 78px;font-size:12px}.n-gh-rep .p{display:none}}';
  document.head.appendChild(st);
})();
