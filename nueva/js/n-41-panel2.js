/* APP NUEVA · Panel como el boceto aprobado (28-oct, Carlos 22:48: «bloques colapsables, sin números,
   5 KPIs en Mi cartera, avisos como el boceto»). Bloques: Avisos · Mi cartera · Más cerca de entrada ·
   Agenda · Presupuesto · Salud financiera. Los datos son los de siempre; aquí se ordenan y se pintan. */
(function(){
  if(typeof renderPanelDash!=='function') return;
  var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  window._nPOpen=window._nPOpen||{av:true,car:true,cer:true,age:true,pre:true,sal:true};
  function E(x){ x=+x||0; try{ return x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'})+' €'; }catch(e){ return fmt(x); } }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function f2(f){ if(!f) return ''; var p=f.split('-'); return (+p[2])+'-'+MES[+p[1]-1]; }

  /* ---------------- estructura ---------------- */
  function blk(id,ic,t,col){ var d=document.createElement('div'); d.id='nP_'+id; d.className='pos-blk n-blk n-pblk'+(window._nPOpen[id]?' open':''); d.style.setProperty('--pc',col);
    d.innerHTML='<div class="pos-blk-h" data-npblk="'+id+'"><span class="arw">▶</span><span class="bt">'+ic+' '+t+'</span><span class="bsum"></span><span class="n-pextra"></span></div><div class="pos-blk-b"></div>'; return d; }
  function body(id){ return document.querySelector('#nP_'+id+'>.pos-blk-b'); }
  function sum(id,html){ var e=document.querySelector('#nP_'+id+' .bsum'); if(e) e.innerHTML=html; }
  function montar(){
    var pv=document.getElementById('view-panel'); if(!pv) return false;
    if(!document.getElementById('nPanel')){
      var av=document.getElementById('panelAvisos'); if(!av) return false;
      var top=av; while(top.parentNode&&top.parentNode!==pv) top=top.parentNode;
      var c=document.createElement('div'); c.id='nPanel'; top.parentNode.insertBefore(c,top);
      c.appendChild(blk('av','','Avisos','#DC2626')); c.appendChild(blk('car','','Mi cartera','#1F4A9A'));
      var duo=document.createElement('div'); duo.className='n-pduo'; duo.appendChild(blk('cer','','Más cerca de entrada','#16A34A')); duo.appendChild(blk('age','','Agenda','#0D9488')); c.appendChild(duo);
      c.appendChild(blk('pre','','Presupuesto','#D97706')); c.appendChild(blk('sal','','Salud financiera','#7C3AED'));
      top.style.display='none';                                  /* el bloque de avisos de siempre: se pinta en el nuevo */
      /* presupuesto: selector de periodo y tarjetas del mes; la banda de ahorro no está en el boceto */
      ['panelPeriodo','panelCards'].forEach(function(id){ var e=document.getElementById(id); if(!e) return; var t=e; while(t.parentNode&&t.parentNode!==pv) t=t.parentNode; if(t.id!=='nPanel') body('pre').appendChild(t); });
      var ph=document.getElementById('panelHero'); if(ph){ var t2=ph; while(t2.parentNode&&t2.parentNode!==pv&&t2.parentNode.id!=='nP_pre') t2=t2.parentNode; t2.style.display='none'; }
      var ps=document.getElementById('panelSalud'); if(ps) body('sal').appendChild(ps);
    }
    var es=document.getElementById('panelEstadoStrip'), np=document.getElementById('nPanel'); if(es&&np&&es.nextSibling!==np) np.parentNode.insertBefore(es,np);
    var mc=document.getElementById('view-micartera'); if(mc&&mc.parentNode!==body('car')){ mc.classList.add('n-inpanel'); body('car').appendChild(mc); }
    var ag=document.getElementById('nAgenda'); if(ag&&ag.parentNode!==body('age')){ body('age').innerHTML=''; body('age').appendChild(ag); sum('age','próximos 30 días (mínimo 5)'); }
    return true;
  }
  document.addEventListener('click',function(e){ var h=e.target.closest&&e.target.closest('[data-npblk]'); if(!h||e.target.closest('[data-avseenall],[data-avshow],a,button')) return; e.stopPropagation(); var b=h.parentElement; b.classList.toggle('open'); window._nPOpen[h.getAttribute('data-npblk')]=b.classList.contains('open'); },true);

  /* ---------------- 1 · Avisos agrupados ---------------- */
  window._nAvF=window._nAvF||'';
  function cotDe(t){ try{ return (typeof _mcCot==='function')?(+_mcCot(t)||0):0; }catch(e){ return 0; } }
  function grupo(x){
    if(x.tipo==='cartera') return 'car';
    /* 30-oct (Carlos): precio por encima del PO → pide decisión solo si la tienes; en las demás, informativo */
    if(x.sig==='S3'){
      var t=String(x.tick||'').toUpperCase();
      if(!(window.nTiene&&window.nTiene(t))) return 's3i';
      var d=window.nDecS3&&window.nDecS3(t), c=cotDe(t);
      if(d&&(!c||!(+d.cot>0)||c<=+d.cot*1.10)) return 's3d';   /* decidida: vuelve si sube más de un 10 % desde la decisión */
      return 'dec';
    }
    if(x.tipo==='hallazgo') return 'ext';
    if(x.tipo==='dividendo') return 'div';
    if(x.tipo==='hogar') return 'hog';
    if(x.sig==='S5'||x.sig==='S4') return 'tri';
    if((x.sig&&/^S[1-6]$/.test(x.sig)&&!x.noApunte)||x.cls==='r') return 'dec';
    return 'inf';
  }
  var GN={car:'Tu cartera (operaciones)',dec:'Señales que piden decidir',ext:'Revisiones extraordinarias (por un hecho)',tri:'Revisión trimestral',div:'Dividendo en riesgo',hog:'Hogar',inf:'Informativos'};
  var CHIPN={car:'Cartera',dec:'Decidir',ext:'Revisión extraordinaria',tri:'Trimestral',div:'Dividendo',hog:'Hogar',inf:'Informativos'};
  function estado(x,g){ if(g==='ext') return ['Propuesta · decides tú','#EDE9FE','#5B21B6']; if(x.cls==='r') return ['Para actuar','#FEE2E2','#B91C1C']; if(g==='tri') return ['Esperando','#F3F5F8','#5B6B7C']; return ['Para revisar','#FEF3C7','#92400E']; }
  function avisos(){
    var A=window._nAv||{lista:[],vis:{}}, vis=A.vis||{}, F=window._avFiltro||{showSeen:false};
    try{ var ops=(typeof nCarteraOps==='function')?nCarteraOps():[]; ops.forEach(function(o){ if(!A.lista.some(function(x){ return x.key===o.key; })) A.lista=A.lista.concat([o]); }); }catch(e){}
    try{ var r4a=(typeof nR4XlsAviso==='function')?nR4XlsAviso():null; if(r4a&&!A.lista.some(function(x){ return x.key===r4a.key; })) A.lista=A.lista.concat([r4a]); }catch(e){}
    var L=A.lista.filter(function(x){ return (F.showSeen||!vis[x.key]) && !(window.nSenCubre&&window.nSenCubre(x)); });   /* 29-oct: las señales con paquete salen en «Señales por decidir» */
    var nSen=window.nSenCuenta?window.nSenCuenta():0, senH=window.nSenHtml?window.nSenHtml():'';
    var nVis=A.lista.filter(function(x){ return vis[x.key]; }).length;
    var G={dec:[],ext:[],tri:[],car:[],div:[],hog:[],inf:[],s3d:[],s3i:[]}; L.forEach(function(x){ G[grupo(x)].push(x); });
    var nInf=G.inf.length+(G.s3i.length?1:0), nDec=L.length-G.inf.length-G.s3d.length-G.s3i.length+nSen;
    sum('av',(nDec?nDec+' por decidir':'nada por decidir')+(nInf?' · '+nInf+' informativos':''));
    var ex=document.querySelector('#nP_av .n-pextra'); if(ex) ex.innerHTML='<button class="n-prvg" data-nprv="">🔍 Pedir revisión de una empresa</button>'+(L.length?'<span data-avseenall="'+L.map(function(x){return x.key;}).join('~')+'">marcar todos como vistos ✓</span>':'')+(nVis?' · <span data-avshow="1">'+(F.showSeen?'ocultar vistos':'ver vistos ('+nVis+')')+'</span>':'');
    var f=window._nAvF;
    var chips='<div class="n-avchips"><button data-navf="" class="'+(f?'':'on')+'">Todos</button>'+['dec','ext','tri','car','div','hog','inf'].filter(function(g){return G[g].length||(g==='inf'&&G.s3i.length);}).map(function(g){ return '<button data-navf="'+g+'" class="'+(f===g?'on':'')+'">'+CHIPN[g]+' '+(g==='inf'?nInf:G[g].length)+'</button>'; }).join('')+'</div>';
    function fila(x,g){ var st=estado(x,g), v=!!vis[x.key];
      var act=(x.sig&&!x.noApunte)?' data-sig="'+x.sig+'" data-ticker="'+esc(x.tick||'')+'" data-nivel="'+esc(x.nivel||'')+'"':'';
      var bt=g==='ext'?'Pedir revisión':'Ver';
      if(g==='car') return '<div class="n-av'+(v?' visto':'')+'" style="--ac:#0EA5E9"><span class="n-avst" style="background:#E0F2FE;color:#075985">Esperando</span><div class="n-avtx">'+x.txt+'</div><button class="n-avbt n-avbtp" data-nevok="'+x.key+'">'+esc(x.btn||'Confirmar')+'</button><button class="n-avok" data-avseen="'+x.key+'" title="Marcar como visto">✓</button></div>';
      return '<div class="n-av'+(v?' visto':'')+'" style="--ac:'+(x.cls==='r'?'#DC2626':(g==='ext'?'#7C3AED':'#D97706'))+'"><span class="n-avst" style="background:'+st[1]+';color:'+st[2]+'">'+st[0]+'</span><div class="n-avtx">'+x.txt+'</div>'+
        (x.goto?'<button class="n-avbt" data-goto="'+x.goto+'"'+act+'>'+bt+'</button>':'')+'<button class="n-avok" data-avseen="'+x.key+'" title="'+(v?'Volver a mostrar':'Marcar como visto')+'">✓</button></div>'; }
    var h=chips+senH;
    window._nAvMas=window._nAvMas||{};
    ['dec','ext','tri','car','div','hog'].forEach(function(g){ if((!G[g].length&&!(g==='dec'&&G.s3d.length))||(f&&f!==g)) return; var todo=f===g||window._nAvMas[g], L2=todo?G[g]:G[g].slice(0,5);
      h+='<div class="n-avg">'+GN[g]+'</div>'+L2.map(function(x){return fila(x,g);}).join('')+(G[g].length>5?'<div class="n-avmas" data-navmas="'+g+'">'+(todo?'ver menos ▴':'ver las '+(G[g].length-5)+' restantes ▾')+'</div>':'')+(g==='dec'?s3dLinea(G.s3d):''); });
    if((G.inf.length||G.s3i.length)&&(!f||f==='inf')){ window._nInfOpen=window._nInfOpen||false;
      h+='<div class="n-avinf'+(window._nInfOpen||f==='inf'?' open':'')+'"><div class="n-avg n-avinfh" data-navinf="1">▸ Informativos ('+nInf+') · no piden decisión</div><div class="n-avinfb">'+s3iLinea(G.s3i)+G.inf.map(function(x){ return '<div class="n-avi">'+x.txt+(x.goto?' <span class="n-avver" data-goto="'+x.goto+'">ver ▸</span>':'')+'<button class="n-avok" data-avseen="'+x.key+'">✓</button></div>'; }).join('')+'</div></div>'; }
    if(!L.length&&!senH) h='<div class="muted" style="padding:6px 0">Nada pendiente ahora mismo. 👌</div>';
    var b=body('av'); if(b) b.innerHTML=h;
  }
  function tks(L){ var o=[]; L.forEach(function(x){ var t=String(x.tick||'').toUpperCase(); if(t&&o.indexOf(t)<0) o.push(t); }); return o; }
  function pct(t){ var c=cotDe(t), a=(typeof _mcAna==='function')?_mcAna(t):null, pb=a?((typeof poBaseDe==='function')?+poBaseDe(a):+a.precioObjetivo):0; return (c>0&&pb>0)?' +'+Math.round((c/pb-1)*100)+' %':''; }
  function s3dLinea(L){ var T=tks(L); if(!T.length) return '';
    var fe={}; T.forEach(function(t){ var d=window.nDecS3(t); if(d) fe[d.fecha]=1; });
    return '<div class="n-avi n-s3d">🎯 <b>'+T.length+' de tu cartera cotizan por encima de su PO</b>, ya decididas ('+Object.keys(fe).join(', ')+'): '+T.map(function(t){ return '<b data-ficha="'+t+'">'+t+'</b>'+pct(t); }).join(' · ')+'. Si una sube más de un 10 % desde tu decisión, vuelve a pedirla.</div>'; }
  function s3iLinea(L){ var T=tks(L); if(!T.length) return '';
    return '<div class="n-avi">🎯 '+T.length+' analizadas que no tienes cotizan por encima de su PO: '+T.map(function(t){ return '<b data-ficha="'+t+'">'+t+'</b>'+pct(t); }).join(' · ')+'. Solo informa; cada una desaparece cuando vuelve por debajo.</div>'; }
  window.nPanelAvisos=avisos;
  document.addEventListener('click',function(e){
    var c=e.target.closest&&e.target.closest('[data-navf]'); if(c){ window._nAvF=c.getAttribute('data-navf'); avisos(); return; }
    var mm=e.target.closest&&e.target.closest('[data-navmas]'); if(mm){ var g=mm.getAttribute('data-navmas'); window._nAvMas[g]=!window._nAvMas[g]; avisos(); return; }
    var i=e.target.closest&&e.target.closest('[data-navinf]'); if(i){ window._nInfOpen=!window._nInfOpen; i.parentElement.classList.toggle('open'); }
  });

  /* ---------------- 2 · Mi cartera: 5 cifras y franja del dividendo ---------------- */
  function divDatos(){
    var y=new Date().getFullYear(), hoy=new Date().toISOString().slice(0,10), out={};
    var pos={}; invPositions().forEach(function(p){ if(p.acciones>0.0001){ var t=p.ticker; var o=pos[t]=pos[t]||{acc:0,coste:0,div:p.divAccion,pa:p.precioActual}; o.acc+=p.acciones; o.coste+=p.acciones*p.precioCompra; } });
    Object.keys(pos).forEach(function(t){ var o=pos[t], cob=0, mc=[], pend=0, prox=null;
      ((DB.dividendos||{})[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(f.slice(0,4)===String(y)&&f<=hoy&&divEsCobrado(d)){ var sh=(typeof _calSharesAt==='function')?_calSharesAt(t,f,true):o.acc; var g=sh*num(d.importe); if(g>0){ cob+=g; mc.push(MES[+f.slice(5,7)-1]); } } });
      try{ (_calPendNoReg(t,y)||[]).forEach(function(e){ if(!(e.fecha>hoy)) return; pend+=num(e.sh)*num(e.imp); if(!prox||e.fecha<prox) prox=e.fecha; }); }catch(err){}
      var pm=o.acc?o.coste/o.acc:0;
      out[t]={cob:cob,meses:mc,pend:pend,prox:prox,rpdHoy:o.pa>0?o.div/o.pa:null,rpdCompra:pm>0?o.div/pm:null}; });
    return out;
  }
  function carteraKpis(){
    var mcb=document.getElementById('mcBody'); if(!mcb) return; var k=mcb.querySelector('.mc-kpis'); if(!k) return;
    var D=divDatos(), y=new Date().getFullYear();
    var tc=Object.keys(D).map(function(t){return [t,D[t].cob];}).filter(function(a){return a[1]>0;}).sort(function(a,b){return b[1]-a[1];});
    var tp=Object.keys(D).map(function(t){return [t,D[t].pend,D[t].prox];}).filter(function(a){return a[1]>0;}).sort(function(a,b){return (a[2]||'').localeCompare(b[2]||'');});
    var cob=tc.reduce(function(s,a){return s+a[1];},0), pend=tp.reduce(function(s,a){return s+a[1];},0);
    if(!k.querySelector('.n-k4')){
      k.insertAdjacentHTML('beforeend','<div class="k n-k4"><div class="l">Dividendos cobrados '+y+'</div><div class="v">'+E(cob)+'</div><div class="p">'+(tc.slice(0,2).map(function(a){return a[0]+' '+E(a[1]);}).join(' + ')+(tc.length>2?' + …':'')||'nada cobrado aún')+'</div></div>'+
        '<div class="k n-k5"><div class="l">Por cobrar hasta dic.</div><div class="v">'+E(pend)+'</div><div class="p">'+(tp.slice(0,2).map(function(a){return a[0]+' '+E(a[1])+(a[2]?' ('+f2(a[2])+')':'');}).join(' + ')+(tp.length>2?' + …':'')||'nada previsto este año')+'</div></div>');
    }
    k.classList.add('n-k5grid');
    /* 28-oct (Carlos): los dos máximos en dos columnas de una línea, sin el texto explicativo (queda al pasar el ratón) */
    var mx=mcb.querySelector('.mc-max'); if(mx&&!mx.querySelector('.n-max1')){
      var notas=[].map.call(mx.querySelectorAll('.mc-max-pie,.mc-max-ojo'),function(x){ return x.textContent.trim(); }).join(' · ');
      [].forEach.call(mx.querySelectorAll('.mc-max-pie,.mc-max-ojo'),function(x){ x.remove(); });
      var it=mx.querySelector('.mc-max-intra'); var c1=document.createElement('span'); c1.className='n-max1';
      [].slice.call(mx.childNodes).forEach(function(nd){ if(nd!==it) c1.appendChild(nd); });
      mx.insertBefore(c1,mx.firstChild); mx.classList.add('n-max2'); mx.title=notas; }
    /* franja del dividendo en cada posición (primera lista: tus posiciones) */
    var lista=mcb.querySelector('.mc-list'); if(!lista) return;
    [].forEach.call(lista.querySelectorAll('.mc-row'),function(r){ if(r.querySelector('.n-divf')) return; var tk=r.querySelector('.mc-tk'); if(!tk) return; var d=D[(tk.getAttribute('data-ficha')||'').toUpperCase()]; if(!d) return;
      var pc=function(x){ return x==null?'—':(x*100).toFixed(1).replace('.',',')+' %'; };
      var html='<div class="n-divf"><span>RPD sobre precio de hoy <b>'+pc(d.rpdHoy)+'</b></span><span>RPD sobre tu compra <b>'+pc(d.rpdCompra)+'</b></span>'+
        '<span>Cobrado en '+y+' <b>'+E(d.cob)+(d.meses.length?' · '+d.meses.filter(function(m,i,a){return a.indexOf(m)===i;}).join(' + '):'')+'</b></span>'+
        '<span>Por cobrar hasta dic. <b>'+E(d.pend)+(d.prox?' · '+f2(d.prox):'')+'</b></span></div>';
      var subs=r.querySelectorAll('.mc-sub'); if(subs.length>1&&/^Compra /.test(subs[1].textContent)){ var mm2=subs[1].textContent.match(/^Compra ([\d.,]+) @ (.+)$/); if(mm2){ subs[0].insertAdjacentHTML('beforeend',' · <b>'+mm2[1]+' acciones</b> · precio medio <b>'+esc(mm2[2])+'</b>'); subs[1].remove(); } }
      var top=r.querySelector('.mc-top'); if(top) top.insertAdjacentHTML('afterend',html); else r.insertAdjacentHTML('beforeend',html); });
  }

  /* ---------------- 3 · Más cerca de entrada, en tarjetas cortas ---------------- */
  function cerca(){
    /* 30-oct: calculado aquí con la banda del método (la misma regla de la ficha y de Analizadas):
       solo analizadas que no tienes, sin las que están bajo el stop (van a Avisos); COMPRAR primero y luego por cercanía. */
    var mcb=document.getElementById('mcBody'), b=body('cer'); if(!b) return;
    if(mcb){ var hs=mcb.querySelectorAll('.mc-h'), H=hs[hs.length-1], rows=mcb.querySelectorAll('.mc-row.cerca'); if(rows.length) rows[0].parentNode.style.display='none'; if(H&&rows.length) H.style.display='none'; }
    var L=[], tot=0;
    (DB.analisis||[]).forEach(function(a){ var t=String(a.ticker||'').toUpperCase(); if(!t||(window.nTiene&&window.nTiene(t))) return;
      var V=(typeof _mcNiveles==='function')?_mcNiveles(t):null; if(!V||!(V.entMax>0)||!(V.precio>0)) return; tot++;
      if(V.stop>0&&V.precio<V.stop) return;
      var dec=String(a.decision||'').toUpperCase(); L.push({t:t,a:a,V:V,dec:dec,d:V.precio/V.entMax}); });
    L.sort(function(x,y){ return ((x.dec==='COMPRAR'?0:1)-(y.dec==='COMPRAR'?0:1))||(x.d-y.d); });
    if(!L.length){ b.innerHTML='<div class="muted">Sin empresas analizadas fuera de tu cartera con banda de entrada.</div>'; return; }
    var pc=function(x){ return (x*100).toFixed(1).replace('.',',')+' %'; };
    var cards=L.slice(0,6).map(function(x){ var V=x.V, tx=window.nReglaTxt?window.nReglaTxt(V):['',''];
      var col=x.dec==='COMPRAR'?['#15803D','#FFF']:x.dec==='VENDER'?['#DC2626','#FFF']:x.dec==='MANTENER'?['#DBEAFE','#1E40AF']:['#EEF1F5','#475569'];
      var div=+x.a.divAccion||0;
      return '<div class="n-cer" data-ficha="'+esc(x.t)+'" style="cursor:pointer"><span class="n-cerd" style="background:'+col[0]+';color:'+col[1]+'">'+esc(x.dec||'—')+'</span>'+
        '<div class="n-cern"><b data-ficha="'+esc(x.t)+'">'+esc(x.a.nombre||x.t)+'</b><div class="n-cers">PO '+E(V.poBase)+(div>0?' · RPD '+pc(div/V.precio):'')+'</div></div>'+
        '<div class="n-cerp">'+E(V.precio)+'</div><div class="n-cere">entrada '+(V.entMin>0?E(V.entMin).replace(' €','')+'-':'≤ ')+E(V.entMax)+'</div><div class="n-cerx" style="color:'+tx[1]+';font-weight:700">'+esc(tx[0])+'</div></div>'; });
    b.innerHTML='<div class="n-cerg">'+cards.join('')+'</div>'; sum('cer','analizadas que no tienes · COMPRAR primero, luego por cercanía a la entrada');
  }

  /* ---------------- 5 · Presupuesto: fila del año ---------------- */
  function presAnio(){
    var b=body('pre'); if(!b) return; var old=document.getElementById('nPAnio'); if(old) old.remove();
    var hoy=new Date(), y=hoy.getFullYear(), m0=hoy.getMonth();
    var C={}; (DB.categorias||[]).forEach(function(c){ C[c.id]=c; });
    var pi=0,pg=0; (DB.presupuesto||[]).forEach(function(p){ if(pAnio(p)!==y) return; var c=C[p.categoriaId]; if(!c) return; var v=mensual(p)*12; if(c.tipo==='gasto') pg+=v; else if(c.tipo==='ingreso') pi+=v; });
    var ing=new Array(12).fill(0), gas=new Array(12).fill(0);
    (DB.movimientos||[]).forEach(function(m){ var f=m.fecha||''; if(f.slice(0,4)!==String(y)) return; var e=_movBudget(m), k=+f.slice(5,7)-1; ing[k]+=e.ing; gas[k]+=e.gas; });
    var I=ing.reduce(function(a,b){return a+b;},0), G=gas.reduce(function(a,b){return a+b;},0), A=I-G;
    function barras(arr,col){ var mx=Math.max.apply(null,arr.slice(0,m0+1).map(Math.abs).concat([1])), w=100/(m0+1); return '<svg viewBox="0 0 100 30" preserveAspectRatio="none" class="n-mini">'+arr.slice(0,m0+1).map(function(v,i){ var h=Math.abs(v)/mx*26; return '<rect x="'+(i*w+1).toFixed(1)+'" y="'+(30-h).toFixed(1)+'" width="'+(w-2).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1" fill="'+(v<0?'#DC2626':col)+'"/>'; }).join('')+'</svg>'; }
    var aho=ing.map(function(v,i){return v-gas[i];});
    var pct=function(a,b){ return b>0?Math.round(a/b*100)+' %':'—'; };
    var card=function(ic,t,pill,v,s,svg,c){ return '<div class="n-pc" style="--c:'+c+'"><div class="n-pch"><span>'+ic+'</span><b>'+t+'</b>'+(pill?'<em>'+pill+'</em>':'')+'</div><div class="n-pcv">'+v+'</div><div class="n-pcs">'+s+'</div>'+svg+'<div class="n-pcf">un total por mes · ene → '+MES[m0]+'</div></div>'; };
    b.insertAdjacentHTML('beforeend','<div id="nPAnio"><div class="n-prt">AÑO '+y+'</div><div class="n-pcg">'+
      card('↗','Ingresos del año',pct(I,pi),E(I),'ppto '+E(pi),barras(ing,'#16A34A'),'#16A34A')+
      card('↘','Gastos del año',pct(G,pg),E(G),'ppto '+E(pg),barras(gas,'#DC2626'),'#DC2626')+
      card('=','Ahorro del año',I>0?'tasa '+Math.round(A/I*100)+' %':'',E(A),'previsto '+E(pi-pg),barras(aho,'#2563EB'),'#2563EB')+
      (function(){ var r=pg>0?G/pg:0, c=r>1?'#DC2626':(r>0.9?'#D97706':'#16A34A'), L=2*Math.PI*24, d=Math.min(1,r)*L;
        return '<div class="n-pc" style="--c:#D97706"><div class="n-pch"><span>◐</span><b>Salud del ppto.</b></div><div class="n-ring"><svg viewBox="0 0 60 60" width="64" height="64"><circle cx="30" cy="30" r="24" fill="none" stroke="#E5E9EF" stroke-width="7"/><circle cx="30" cy="30" r="24" fill="none" stroke="'+c+'" stroke-width="7" stroke-dasharray="'+d.toFixed(1)+' '+L.toFixed(1)+'" transform="rotate(-90 30 30)" stroke-linecap="round"/><text x="30" y="34" text-anchor="middle" font-size="12" font-weight="800" fill="#142231">'+pct(G,pg)+'</text></svg><div><div class="n-pcs">Consumido</div><b>'+E(G)+'</b> <span class="n-pcs">de '+E(pg)+'</span><div style="font-size:12px;color:'+c+'">'+(G>pg?'excede '+E(G-pg):'quedan '+E(pg-G))+'</div></div></div><div class="n-pcf">gasto del año / presupuesto del año</div></div>'; })()+
      '</div></div>');
    var pp=document.getElementById('panelPeriodo'); if(pp&&!document.getElementById('nPMes')) pp.insertAdjacentHTML('afterbegin','<span class="n-prt" id="nPMes">MES</span>');
  }

  /* ---------------- montaje ---------------- */
  function todo(){ try{ if(!montar()) return; avisos(); carteraKpis(); cerca(); presAnio(); }catch(e){ console.error('n-panel2',e); } }
  var o=renderPanelDash;
  renderPanelDash=function(){ window._nAv={lista:[],vis:(DB&&DB.avisosVistos)||{}}; o.apply(this,arguments); todo(); };
  if(typeof renderMiCartera==='function'){ var om=renderMiCartera; renderMiCartera=function(){ om.apply(this,arguments); try{ if(document.getElementById('nPanel')){ carteraKpis(); cerca(); } }catch(e){ console.error('n-panel2',e); } }; }
})();
