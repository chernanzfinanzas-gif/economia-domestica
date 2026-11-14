/* APP NUEVA · EMPRESAS → ANALIZADAS (boceto «Analizadas - boceto 30-oct v2», Carlos: «más completo que antes me parece»).
   Solo las 35 del método, sin edición a mano y con UN criterio de zona: la banda del método (la misma regla de la ficha).
   Arriba, contadores por zona; «Hoy merece mirar», tarjetas de las que están en zona; debajo, todas, por cercanía a la entrada.
   Datos: fichas/_resumen.json (lo deja exportar_ficha.py) + precio de hoy de la app. Pinchar → Ficha de empresa. */
(function(){
  var R=null, filtro='', mapaSolo=false;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function n(v,d){ if(v==null||!isFinite(+v)) return '—'; return (+v).toLocaleString('es-ES',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d,useGrouping:'always'}); }
  function cot(t){ try{ var c=(typeof _mcCot==='function')?+_mcCot(t):0; if(c>0) return c; }catch(e){} var v=(DB.valores||{})[t]; return v&&+v.precioActual>0?+v.precioActual:0; }
  /* niveles del análisis expresados en acciones de hoy (ampliaciones liberadas, contrasplits…) */
  window.nfRebase=function(t,v,fecha){ if(v==null||!isFinite(+v)) return v; try{ if(typeof khEvFactor==='function'&&fecha){ var f=khEvFactor(t,String(fecha).slice(0,10)); if(f>0&&Math.abs(f-1)>1e-9) return +v/f; } }catch(e){} return +v; };
  function cargar(){ if(R) return Promise.resolve(R);
    var ev=(typeof khEvCargar==='function')?khEvCargar().catch(function(){}):Promise.resolve();
    return Promise.all([fetch('fichas/_resumen.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }),ev]).then(function(a){ R=a[0]; return R; }); }
  function zona(x){ var p=x.pr, st=x.stop, em=x.entrada_min, eM=x.entrada_max;
    if(st&&p<=st) return [0,'Por debajo del stop','#B91C1C'];
    if(em&&p<em) return [1,'Más barata que la banda','#15803D'];
    if(eM&&p<=eM) return [2,'Dentro de la banda','#16A34A'];
    var d=(p/eM-1)*100; if(d<10) return [3,'Cerca: a un '+n(d,1)+' % de la entrada','#B45309'];
    if(d<30) return [4,'Lejos: a un '+n(d,0)+' %','#94A3B8']; return [5,'Muy lejos: a un '+n(d,0)+' %','#CBD5E1']; }
  var DC={COMPRAR:['#15803D','#DCFCE7'],ESPERAR:['#B45309','#FEF3C7'],MANTENER:['#1F4A9A','#EAF1FD'],VENDER:['#B91C1C','#FEE2E2'],REDUCIR:['#B91C1C','#FEE2E2']}, SC={V:'#16A34A',A:'#F59E0B',R:'#DC2626'};
  function dec(d){ var c=DC[d]||['#475569','#F1F5F9']; return '<span class="na-dc" style="color:'+c[0]+';background:'+c[1]+'">'+esc(d||'—')+'</span>'; }
  function regla(x,mini){ return window.nRegla?window.nRegla({precio:x.pr,stop:x.stop,entMin:x.entrada_min,entMax:x.entrada_max,poBase:x.po_base},{peq:1,mini:mini}):''; }
  /* ---------------- 14-nov-2026 (Carlos, cierre del diseño): MAPA DE LAS ANALIZADAS ----------------
     Todas en un gráfico: calidad (nota 0-100 del método) a lo ancho, margen hasta el precio objetivo a lo alto. Las dos rayas
     son las de la regla de COMPRAR: calidad A (62 puntos) y margen del 15 %. Arriba a la derecha, buenas y con margen. */
  function mapa(L){
    var P=L.filter(function(x){ return x.score!=null&&isFinite(+x.score)&&x.po_base>0&&x.pr>0; }).map(function(x){ return {x:x,s:+x.score,m:(x.po_base/x.pr-1)*100}; }); if(P.length<5) return '';
    var conPos=P.filter(function(p){ return p.x.tengo; }); if(mapaSolo&&conPos.length) P=conPos; else mapaSolo=false;
    var pesoT=P.reduce(function(a,p){ return a+(p.x.peso||0); },0), pesoM=Math.max.apply(null,P.map(function(p){ return p.x.peso||0; }).concat([0]));
    var rad=function(p){ if(mapaSolo) return pesoM>0?5+15*Math.sqrt((p.x.peso||0)/pesoM):8; return p.x.tengo?7.5:5.5; };
    var QX=62, QY=15, sx=P.map(function(p){ return p.s; }), x0v=Math.min(Math.min.apply(null,sx),QX)-4, x1v=Math.max(Math.max.apply(null,sx),QX)+4, y0v=-60, y1v=80;
    var W=1000,H=460,l=78,r=14,t=18,b=40, X=function(v){ return l+(v-x0v)/(x1v-x0v)*(W-l-r); }, Y=function(v){ return t+(y1v-Math.max(y0v,Math.min(y1v,v)))/(y1v-y0v)*(H-t-b); };
    var q=[[],[],[],[]]; P.forEach(function(p){ var bu=p.s>=QX, ba=p.m>=QY; q[bu&&ba?0:(bu?1:(ba?2:3))].push(p); });
    var h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs" style="width:100%">';
    h+='<rect x="'+X(QX).toFixed(1)+'" y="'+t+'" width="'+(W-r-X(QX)).toFixed(1)+'" height="'+(Y(QY)-t).toFixed(1)+'" fill="#16A34A" fill-opacity=".07"/>';
    for(var v=-60; v<=80; v+=20) h+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="'+(v===0?'#94A3B8':'#EEF1F5')+'"/><text x="'+(l-6)+'" y="'+(Y(v)+4).toFixed(1)+'" font-size="11" text-anchor="end" fill="#5B6B7C">'+(v>0?'+':'')+v+' %</text>';
    for(var w=Math.ceil(x0v/10)*10; w<=x1v; w+=10) h+='<text x="'+X(w).toFixed(1)+'" y="'+(H-b+16)+'" font-size="11" text-anchor="middle" fill="#5B6B7C">'+w+'</text>';
    h+='<line x1="'+X(QX).toFixed(1)+'" x2="'+X(QX).toFixed(1)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="#1F4A9A" stroke-dasharray="6 5" stroke-opacity=".6"/><text x="'+(X(QX)+5).toFixed(1)+'" y="'+(H-b-6)+'" font-size="11" fill="#1F4A9A">calidad A (62)</text>';
    h+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(QY).toFixed(1)+'" y2="'+Y(QY).toFixed(1)+'" stroke="#1F4A9A" stroke-dasharray="6 5" stroke-opacity=".6"/><text x="'+(l+6)+'" y="'+(Y(QY)-5).toFixed(1)+'" font-size="11" fill="#1F4A9A">margen del 15 %</text>';
    h+='<text x="'+(W-r-6)+'" y="'+(t+14)+'" font-size="12" font-weight="700" text-anchor="end" fill="#15803D">Buenas y con margen</text><text x="'+(W-r-6)+'" y="'+(H-b-6)+'" font-size="12" font-weight="700" text-anchor="end" fill="#64748B">Buenas pero caras</text><text x="'+(l+6)+'" y="'+(t+14)+'" font-size="12" font-weight="700" fill="#B45309">Con margen, calidad baja</text>';
    h+='<text x="'+((l+W-r)/2)+'" y="'+(H-6)+'" font-size="11.5" text-anchor="middle" fill="#334155">Calidad: nota del método (0-100) →</text><text transform="translate(15,'+((t+H-b)/2)+') rotate(-90)" font-size="11.5" text-anchor="middle" fill="#334155">Margen hasta el precio objetivo →</text>';
    P.slice().sort(function(a,c){ return mapaSolo?((c.x.peso||0)-(a.x.peso||0)):((a.x.tengo?1:0)-(c.x.tengo?1:0)); }).forEach(function(p){ var c=(DC[p.x.decision]||['#475569'])[0], cx=X(p.s), cy=Y(p.m), fuera=p.m>y1v||p.m<y0v, rr=rad(p);
      h+='<g data-nfopen="'+p.x.ticker+'" style="cursor:pointer"><title>'+esc(p.x.empresa)+' · '+esc(p.x.decision||'')+' · calidad '+esc(p.x.rating||'')+' ('+n(p.s,1)+') · margen '+(p.m>0?'+':'')+n(p.m,0)+' % · dividendo '+(p.x.dss!=null?p.x.dss:'—')+(mapaSolo&&pesoT>0?' · peso '+n((p.x.peso||0)/pesoT*100,1)+' %':'')+'</title>'+
        '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+rr.toFixed(1)+'" fill="'+c+'" fill-opacity="'+(mapaSolo?.8:(p.x.tengo?1:.75))+'" stroke="'+(p.x.tengo&&!mapaSolo?'#0F172A':'#fff')+'" stroke-width="'+(p.x.tengo&&!mapaSolo?2:1)+'"/>'+
        '<text x="'+(cx+rr+3).toFixed(1)+'" y="'+(cy+3.5).toFixed(1)+'" font-size="10.5" font-weight="'+(p.x.tengo?800:600)+'" fill="#334155">'+p.x.ticker+(fuera?(p.m>y1v?' ↑':' ↓'):'')+'</text></g>'; });
    h+='</svg>';
    var nom=function(a){ return a.sort(function(u,w){ return w.m-u.m; }).map(function(p){ return '<span data-nfopen="'+p.x.ticker+'" style="cursor:pointer;font-weight:'+(p.x.tengo?800:500)+'">'+p.x.ticker+'</span>'; }).join(', ')||'ninguna'; };
    var pq=function(a){ if(!mapaSolo||!(pesoT>0)) return a.length; return a.length+' · '+n(a.reduce(function(u,p){ return u+(p.x.peso||0); },0)/pesoT*100,0)+' % de tu dinero'; };
    var conm=conPos.length?'<div class="na-flt" style="margin:2px 0 6px"><span data-namap="0" class="'+(mapaSolo?'':'on')+'">Todas las analizadas</span><span data-namap="1" class="'+(mapaSolo?'on':'')+'">Solo mi cartera ('+conPos.length+')</span></div>':'';
    return '<div class="nf-card" id="naMapa"><h2>'+(mapaSolo?'Mapa de mi cartera':'Mapa de las analizadas')+' <span class="nf-sub">calidad frente a margen · pulsa una empresa para abrir su ficha</span></h2>'+conm+
      '<div style="font-size:13.5px;color:#334155;margin:4px 0 8px;line-height:1.6"><b style="color:#15803D">Buenas y con margen ('+pq(q[0])+'):</b> '+nom(q[0])+'. <b>Buenas pero caras ('+pq(q[1])+'):</b> '+nom(q[1])+'. <b style="color:#B45309">Con margen, calidad baja ('+pq(q[2])+'):</b> '+nom(q[2])+'. <b>Ni lo uno ni lo otro ('+pq(q[3])+')'+(mapaSolo&&q[3].length?':</b> '+nom(q[3])+'.':'</b>.')+'</div><div style="overflow-x:auto"><div style="min-width:720px">'+h+'</div></div>'+
      '<div class="nf-lg">'+['COMPRAR','MANTENER','ESPERAR','VENDER'].filter(function(d){ return P.some(function(p){ return p.x.decision===d; }); }).map(function(d){ return '<span><i style="background:'+(DC[d]||['#475569'])[0]+';border-radius:50%"></i>'+d+'</span>'; }).join('')+(mapaSolo?'<span>El tamaño de cada punto es su peso en lo que tienes invertido en empresas analizadas</span>':'<span><i style="background:#fff;border:2px solid #0F172A;border-radius:50%;box-sizing:border-box"></i>En cartera (más grande y en negrita)</span>')+'</div>'+
      '<span class="nf-ws">Margen = precio objetivo ÷ cotización de hoy − 1. Las dos rayas son las de la regla de COMPRAR (calidad A y 15 % de margen), que además pide moat y pasa los vetos: por eso una empresa del cuadro verde puede no ser COMPRAR. Las que se salen por arriba o por abajo llevan una flecha.</span></div>';
  }
  function pintar(){
    var v=document.getElementById('view-analizadas'); if(!v) return;
    if(!R){ v.innerHTML='<div class="nf-mu" style="padding:20px">Cargando las analizadas…</div>'; cargar().then(function(){ if(R) pintar(); else v.innerHTML='<div class="nf-card">El resumen de las analizadas (fichas/_resumen.json) todavía no está publicado.</div>'; }); return; }
    var fe=String(R.generado||'').slice(0,10);
    var POS={}; try{ (typeof invPositions==='function'?invPositions():[]).forEach(function(p){ var t=String(p.ticker||'').toUpperCase(), a=(typeof num==='function')?num(p.acciones):+p.acciones; if(a>0) POS[t]=(POS[t]||0)+a; }); }catch(e){}
    var L=(R.empresas||[]).map(function(e){ var x=Object.assign({},e), t=x.ticker;
      ['po_bear','po_base','po_bull','entrada_min','entrada_max','stop','precio_analisis'].forEach(function(k){ x[k]=window.nfRebase(t,x[k],x.fecha_niveles||fe); });
      x.pr=cot(t)||x.precio_analisis; x.tengo=window.nTiene?window.nTiene(t):false; x.peso=(POS[t]||0)*(x.pr||0); x.z=zona(x); x.d=x.entrada_max?(x.pr/x.entrada_max-1)*100:999; return x; }).filter(function(x){ return x.pr&&x.entrada_max; });
    L.sort(function(a,b){ return a.d-b.d; });
    var cnt=[0,0,0,0,0,0]; L.forEach(function(x){ cnt[x.z[0]]++; });
    var top=L.filter(function(x){ return x.z[0]<=3; }).sort(function(a,b){ return (a.z[0]-b.z[0])||(a.d-b.d); });
    var cards=top.map(function(x){ return '<div class="na-ac" data-nfopen="'+x.ticker+'" style="border-top-color:'+x.z[2]+'"><div class="na-ach"><span class="na-tk">'+x.ticker+'</span><div><b>'+esc(x.empresa)+'</b><small>'+esc(x.modelo||'')+'</small></div>'+dec(x.decision)+'</div>'+
      '<div class="na-acz" style="color:'+x.z[2]+'">'+x.z[1]+'</div>'+regla(x)+
      '<div class="na-acn"><span>Precio <b>'+n(x.pr)+' €</b></span><span>Entrada <b>'+n(x.entrada_min)+'–'+n(x.entrada_max)+'</b></span><span>PO <b>'+n(x.po_base)+'</b></span></div>'+
      '<div class="na-act">'+esc(x.frase||'')+'</div>'+
      '<div class="na-acf"><span class="na-ch">Calidad <b>'+esc(x.rating||'—')+'</b></span><span class="na-ch">Dividendo <b>'+(x.dss!=null?x.dss:'—')+'</b></span><span class="na-ch"><i style="background:'+(SC[x.semaforo]||'#CBD5E1')+'"></i>'+esc(x.ultimo_periodo||'')+'</span>'+(x.tengo?'<span class="na-ch na-own">en cartera</span>':'')+'</div></div>'; }).join('');
    var rows=L.filter(function(x){ return !filtro||(filtro==='cartera'?x.tengo:x.decision===filtro); }).map(function(x){
      return '<tr data-nfopen="'+x.ticker+'"><td class="l"><b>'+x.ticker+'</b> '+esc(x.empresa)+(x.tengo?' <span class="na-ch na-own">en cartera</span>':'')+'</td><td>'+dec(x.decision)+'</td><td>'+n(x.pr)+'</td><td style="color:'+x.z[2]+';font-weight:700">'+(x.d>0?'+'+n(x.d,1)+' %':x.z[1].split(':')[0])+'</td><td class="na-rg">'+regla(x,1)+'</td><td>'+n(x.po_base)+'</td><td>'+esc(x.rating||'—')+'</td><td>'+(x.dss!=null?x.dss:'—')+'</td><td><i class="na-sd" style="background:'+(SC[x.semaforo]||'#CBD5E1')+'"></i>'+esc(x.ultimo_periodo||'')+'</td></tr>'; }).join('');
    var F=[['','Todas'],['cartera','En cartera'],['COMPRAR','COMPRAR'],['MANTENER','MANTENER'],['ESPERAR','ESPERAR']];
    v.innerHTML='<div class="na-hero"><h1>Analizadas</h1><p>Las '+L.length+' empresas con análisis completo del método. ¿Cuáles piden mirar hoy?</p>'+
      '<div class="na-kp"><div>Bajo el stop<b>'+cnt[0]+'</b></div><div>Más baratas que la banda<b>'+cnt[1]+'</b></div><div>Dentro de la banda<b>'+cnt[2]+'</b></div><div>Cerca (&lt;10 %)<b>'+cnt[3]+'</b></div><div>Lejos (10-30 %)<b>'+cnt[4]+'</b></div><div>Muy lejos (&gt;30 %)<b>'+cnt[5]+'</b></div></div></div>'+
      '<h2 class="na-h2">Hoy merece mirar ('+top.length+')</h2><div class="na-acs">'+(cards||'<div class="nf-mu">Ninguna está hoy en zona.</div>')+'</div>'+
      mapa(L)+
      '<div class="nf-card"><h2>Todas las analizadas ('+L.length+') <span class="nf-sub">ordenadas por lo cerca que está el precio de la entrada</span></h2><div class="na-flt">'+F.map(function(f){ return '<span data-naf="'+f[0]+'" class="'+(filtro===f[0]?'on':'')+'">'+f[1]+'</span>'; }).join('')+'</div>'+
      '<div class="nf-tw"><table class="na-t"><tr><th class="l">Empresa</th><th>Decisión</th><th>Precio</th><th>A la entrada máx.</th><th>Dónde está el precio</th><th>PO base</th><th>Calidad</th><th>Dividendo</th><th>Último resultado</th></tr>'+rows+'</table></div>'+
      '<span class="nf-ws">La regla de cada fila es la misma de la ficha. «Dividendo» = nota de seguridad del dividendo (0-100). Análisis del método del '+esc(fe)+'.</span></div>'+
      '<div class="nf-card" id="naValHost"></div><div class="nf-card" id="naTrHost"></div>';
    VAL.lista=L; pintarVal();
    TR.lista=L.map(function(x){ return {t:x.ticker,nom:x.empresa,dec:x.decision,tengo:x.tengo}; }); pintarTr();
  }
  /* ---------------- 14-nov-2026 (Carlos): LAS ANALIZADAS FRENTE AL IBEX CON DIVIDENDOS ----------------
     «un comparativo entre las analizadas y el ibex 35 en una tabla». 100 € en cada empresa, con los dividendos brutos
     reinvertidos el día ex-dividendo (dividendos.json), frente al IBEX 35 con dividendos (precios/IBEXTR.json) en el MISMO
     periodo de cada una. La misma cuenta que la tarjeta de la ficha. Descarga la cotización de todas: solo al pedirlo. */
  /* ---------------- 14-nov-2026 (Carlos: «lo demás me parece bien»): ¿CARA O BARATA PARA LO QUE SUELE SER? ----------------
     Cada empresa frente a SU PROPIA historia de 10 años, no frente al precio objetivo. Del método, ficha a ficha
     (valoracion.multiplos): cada múltiplo trae su media de 10 años y «vpa», el precio por acción que saldría si el mercado
     pagara hoy esa media con las cifras del último ejercicio. Aquí: cotización de hoy ÷ vpa − 1. Múltiplo principal según el
     tipo de empresa (EV/EBITDA; P/valor tangible en bancos y seguros; precio/NAV en inmobiliarias) y el PER.
     Dividendo: DPA = vpa del múltiplo de rentabilidad × su media; rentabilidad de hoy = DPA ÷ cotización, frente a su media y
     frente al bono español a 10 años (macro.json). Descarga las fichas de todas: solo al pedirlo. */
  var VAL={est:'',hecho:0,lista:[],F:{},bono:null,bonoF:'',solo:false};
  function valCargar(){ if(VAL.est==='cargando') return; VAL.est='cargando'; VAL.hecho=0; pintarVal();
    var get=function(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); };
    var ts=VAL.lista.map(function(x){ return x.ticker; }), i=0;
    var sig=function(){ if(i>=ts.length) return Promise.resolve(); var t=ts[i++]; return get('fichas/'+encodeURIComponent(t)+'.json').then(function(f){ VAL.F[t]=f; VAL.hecho++; if(VAL.hecho%6===0) pintarVal(); return sig(); }); };
    Promise.all([get('macro.json').then(function(m){ var b=m&&m.ind&&m.ind.bono_10a_es; if(b&&b.v!=null&&isFinite(+b.v)){ VAL.bono=+b.v; VAL.bonoF=String(b.f||''); } }),sig(),sig(),sig(),sig()]).then(function(){ VAL.est='hecho'; pintarVal(); }); }
  function valUno(x){ var F=VAL.F[x.ticker]; if(!F) return null; var V=F.valoracion||{}, M=V.multiplos||{}, fe=String(V.fecha_precio||x.fecha_niveles||'').slice(0,10), pr=x.pr;
    var vp=function(o){ return o&&+o.vpa>0?window.nfRebase(x.ticker,+o.vpa,fe):null; };
    var pm=function(o){ var v=vp(o); if(!(v>0)||!(pr>0)) return null; var d=(pr/v-1)*100; return Math.abs(d)>400?null:d; };
    var pk=M.ev_ebitda?['EV/EBITDA',M.ev_ebitda]:(M.m_ptbv?['P/valor tangible',M.m_ptbv]:(M.nav?['Precio/NAV',M.nav]:null));
    var o={x:x,pn:pk?pk[0]:'',p1:null,p2:pm(M.nav&&M.p_ffo?M.p_ffo:(M.per||M.m_per)),rpd:null,rpdM:null,hoy:null,mm:pk&&+pk[1].media>0?+pk[1].media:null};
    if(pk&&M.ev_ebitda){ /* EV/EBITDA de hoy como en la ficha: (cotización × acciones + deuda y demás del último cierre) ÷ EBITDA; con deuda, el precio se mueve más que el múltiplo */
      var SM=V.serie_multiplos||{}, acc=((F.series||{}).flujos||{}).acciones||{}, Ys=Object.keys(SM).filter(function(y){ var q=SM[y]; return q&&q.ev!=null&&q.ebitda>0&&q.cap>0&&+acc[y]>0; }).sort(), y=Ys[Ys.length-1], q=y&&SM[y];
      if(q&&o.mm&&pr>0){ o.hoy=(pr*(+acc[y])+(q.ev-q.cap))/q.ebitda; if(o.hoy>0){ var d1=(o.hoy/o.mm-1)*100; o.p1=Math.abs(d1)>400?null:d1; } else o.hoy=null; } }
    else if(pk){ o.p1=pm(pk[1]); var v1=vp(pk[1]); if(v1>0&&o.mm&&pr>0) o.hoy=o.mm*pr/v1; }
    var r=M.rpd||M.m_rpd, v=vp(r); if(v>0&&+r.media>0&&pr>0){ o.rpd=v*(+r.media)/pr*100; o.rpdM=+r.media*100; }
    var a=[o.p1,o.p2].filter(function(q){ return q!=null; }); o.med=a.length?a.reduce(function(u,w){ return u+w; },0)/a.length:null;
    return o; }
  function pintarVal(){ var h=document.getElementById('naValHost'); if(!h) return;
    var cab='<h2>¿Cara o barata para lo que suele ser? <span class="nf-sub">cada empresa frente a su propia historia de 10 años · y su dividendo frente al bono</span></h2>';
    if(VAL.est!=='hecho'){ h.innerHTML=cab+'<div style="font-size:13.5px;color:#334155;margin:4px 0 10px;line-height:1.6">Una segunda opinión, distinta del precio objetivo: ¿el mercado paga hoy por esta empresa más o menos de lo que ha pagado de media en los últimos diez años? Hay que descargar la ficha de las '+VAL.lista.length+' empresas; tarda unos segundos.</div>'+
      (VAL.est==='cargando'?'<div class="nf-mu">Descargando… '+VAL.hecho+' de '+VAL.lista.length+'</div>':'<span data-naval="1" style="display:inline-block;cursor:pointer;background:#1F4A9A;color:#fff;font-weight:700;border-radius:8px;padding:8px 14px;font-size:13.5px">Calcular la tabla</span>'); return; }
    var pc=function(v){ if(v==null) return '<span style="color:#94A3B8">—</span>'; var c=v<=-15?'#15803D':(v>=15?'#B91C1C':'#334155'); return '<b style="color:'+c+'">'+(v>0?'+':'')+n(v,0)+' %</b>'; };
    var lec=function(v){ if(v==null) return '<span style="color:#94A3B8">sin dato</span>'; return v<=-15?'<span class="na-dc" style="color:#15803D;background:#DCFCE7">Más barata de lo habitual</span>':(v>=15?'<span class="na-dc" style="color:#B91C1C;background:#FEE2E2">Más cara de lo habitual</span>':'<span class="na-dc" style="color:#475569;background:#F1F5F9">En su zona habitual</span>'); };
    var O=VAL.lista.map(valUno).filter(function(o){ return o; }), sin=VAL.lista.length-O.length, hayPos=O.some(function(o){ return o.x.tengo; });
    var cu=[0,0,0]; O.forEach(function(o){ if(o.med!=null) cu[o.med<=-15?0:(o.med>=15?2:1)]++; });
    var S=O.filter(function(o){ return !VAL.solo||o.x.tengo; }).sort(function(a,b){ return (a.med==null?1e9:a.med)-(b.med==null?1e9:b.med); });
    var rows=S.map(function(o){ var x=o.x, db=(o.rpd!=null&&VAL.bono!=null)?o.rpd-VAL.bono:null;
      return '<tr data-nfopen="'+x.ticker+'"><td class="l"><b>'+x.ticker+'</b> '+esc(x.empresa)+(x.tengo?' <span class="na-ch na-own">en cartera</span>':'')+'</td><td>'+dec(x.decision)+'</td><td>'+n(x.pr)+'</td>'+
        '<td>'+pc(o.p1)+(o.pn?'<br><small style="color:#64748B">'+o.pn+(o.hoy!=null&&o.mm!=null?' '+n(o.hoy,o.hoy<3?2:1)+'× · media '+n(o.mm,o.mm<3?2:1)+'×':'')+'</small>':'')+'</td><td>'+pc(o.p2)+'</td><td>'+lec(o.med)+'</td>'+
        '<td>'+(o.rpd!=null?n(o.rpd,1)+' %':'—')+'</td><td>'+(o.rpdM!=null?n(o.rpdM,1)+' %':'—')+'</td>'+
        '<td>'+(db!=null?'<b style="color:'+(db>=0?'#15803D':'#B91C1C')+'">'+(db>0?'+':'')+n(db,1)+' pp</b>':'—')+'</td></tr>'; }).join('');
    h.innerHTML=cab+'<div style="font-size:13.5px;color:#334155;margin:4px 0 8px;line-height:1.6"><b style="color:#15803D">Más baratas de lo habitual:</b> '+cu[0]+'. <b>En su zona habitual:</b> '+cu[1]+'. <b style="color:#B91C1C">Más caras de lo habitual:</b> '+cu[2]+'.'+(VAL.bono!=null?' Bono español a 10 años: <b>'+n(VAL.bono,2)+' %</b>'+(VAL.bonoF?' ('+VAL.bonoF.slice(8,10)+'/'+VAL.bonoF.slice(5,7)+')':'')+'.':'')+'</div>'+
      (hayPos?'<div class="na-flt"><span data-navalf="0" class="'+(VAL.solo?'':'on')+'">Todas</span><span data-navalf="1" class="'+(VAL.solo?'on':'')+'">En cartera</span></div>':'')+
      '<div class="nf-tw"><table class="na-t"><tr><th class="l">Empresa</th><th>Decisión</th><th>Precio</th><th>Múltiplo principal<br>frente a su media</th><th>PER (P/FFO en<br>inmobiliarias) frente a su media</th><th>Lectura</th><th>Dividendo hoy</th><th>Su media<br>de 10 años</th><th>Dividendo<br>menos bono</th></tr>'+rows+'</table></div>'+
      '<span class="nf-ws"><b>Cómo leerla.</b> «−20 %» quiere decir que hoy el mercado paga por la empresa un múltiplo un 20 % más bajo que su media de diez años, con las cifras del último ejercicio cerrado; «+20 %», lo contrario. El múltiplo principal es el EV/EBITDA (el mismo de la ficha), el precio sobre valor tangible en bancos y aseguradoras y el precio sobre NAV en inmobiliarias. La lectura es la media de las dos columnas, con la raya en ±15 %. No es el precio objetivo ni una señal por sí sola: una empresa puede estar barata frente a su historia porque el negocio ha empeorado, y cara porque ha mejorado. «Dividendo hoy» es el dividendo del método entre la cotización de hoy; «menos bono», lo que paga de más (o de menos) que el bono español a 10 años.'+(VAL.bono==null?' Hoy no hay dato del bono.':'')+(sin?' Sin ficha descargada: '+sin+'.':'')+'</span>'; }
  var TR={per:'10',est:'',hecho:0,lista:[],P:{},B:null,DV:null};
  function trAntes(D,f){ var lo=0,hi=D.length; while(lo<hi){ var m=(lo+hi)>>1; if(D[m][0]<f) lo=m+1; else hi=m; } return lo?+D[lo-1][1]:null; }
  function trAt(D,f){ var lo=0,hi=D.length; while(lo<hi){ var m=(lo+hi)>>1; if(D[m][0]<=f) lo=m+1; else hi=m; } return lo?+D[lo-1][1]:null; }
  function trUno(P,B,DV,per){ if(!P||P.length<260||!B||B.length<260) return null;
    var fin=P[P.length-1][0]<B[B.length-1][0]?P[P.length-1][0]:B[B.length-1][0], ini0=P[0][0]>B[0][0]?P[0][0]:B[0][0], aa={'3':3,'5':5,'10':10}[per], ini=ini0, obj=ini0;
    if(aa){ obj=(+fin.slice(0,4)-aa)+fin.slice(4); if(obj>ini0) ini=obj; }
    var p0=trAt(P,ini), b0=trAt(B,ini), an=(Date.parse(fin)-Date.parse(ini))/31557600000; if(!(p0>0)||!(b0>0)||an<1) return null;
    /* un reparto en acciones de otra empresa (BKT → LDA 2021, CIE → Dominion 2018) ya va descontado en la cotización: un pago de
       más del 8 % del precio solo cuenta si ese día la acción cae al menos la mitad del pago (misma regla que la ficha) */
    var u=1, esp=0; (DV||[]).forEach(function(d){ if(d[0]>ini&&d[0]<=fin){ var px=trAt(P,d[0]), pa=trAntes(P,d[0]); if(px>0){ if(d[1]>=0.08*px&&pa>0&&!(px<=pa-0.5*d[1])) esp++; else u*=1+d[1]/px; } } });
    var roto=null, k0=0; while(k0<P.length&&P[k0][0]<ini) k0++;
    for(var k=Math.max(1,k0); k<P.length&&P[k][0]<=fin; k++){ var a_=+P[k-1][1], b_=+P[k][1]; if(!(a_>0)) continue; var r_=b_/a_-1;
      if(Math.abs(r_)>=0.40){ var dv=0; (DV||[]).forEach(function(d){ if(d[0]===P[k][0]) dv+=d[1]; }); if(!(r_<0&&dv>=0.5*(a_-b_))){ roto=P[k][0]; break; } } }
    var val=u*trAt(P,fin)/p0*100, ib=trAt(B,fin)/b0*100, ra=function(v){ return (Math.pow(v/100,1/an)-1)*100; };
    return {ini:ini,fin:fin,an:an,val:val,ra:ra(val),ib:ib,rib:ra(ib),dif:ra(val)-ra(ib),corto:!!aa&&ini>obj,esp:esp,roto:roto}; }
  function trCargar(){ if(TR.est==='cargando') return; TR.est='cargando'; TR.hecho=0; pintarTr();
    var get=function(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); };
    Promise.all([get('dividendos.json'),get('precios/IBEXTR.json')]).then(function(a){
      var DV={}; ((a[0]&&a[0].empresas)||[]).forEach(function(e){ var L=[]; Object.keys(e.anios||{}).forEach(function(y){ ((e.anios[y]||{}).pagos||[]).forEach(function(p){ var f=String(p.exDiv||p.pago||'').slice(0,10), b=+p.bruto; if(/^\d{4}-\d\d-\d\d$/.test(f)&&b>0) L.push([f,b]); }); }); DV[String(e.ticker||'').toUpperCase()]=L.sort(function(x,y){ return x[0]<y[0]?-1:1; }); });
      TR.DV=DV; TR.B=(a[1]&&a[1].data)||null;
      if(!TR.B){ TR.est='error'; pintarTr(); return; }
      var cola=TR.lista.map(function(x){ return x.t; }).filter(function(t){ return TR.P[t]===undefined; });
      var paso=function(){ if(!cola.length){ TR.est='listo'; pintarTr(); return; } var lote=cola.splice(0,6);
        Promise.all(lote.map(function(t){ return get('precios/'+encodeURIComponent(t)+'.json').then(function(J){ TR.P[t]=(J&&J.data)||null; TR.hecho++; }); })).then(function(){ pintarTr(); paso(); }); };
      paso(); }); }
  function pintarTr(){ var h=document.getElementById('naTrHost'); if(!h) return;
    var cab='<h2>¿Cuáles le ganan al IBEX con dividendos? <span class="nf-sub">100 € invertidos, dividendos reinvertidos</span></h2>';
    if(!TR.est){ h.innerHTML=cab+'<p style="font-size:13.5px;color:#334155;margin:6px 0 10px">Compara lo que habrían dado 100 € en cada analizada, reinvirtiendo sus dividendos, con lo que habría dado el IBEX 35 con dividendos en el mismo periodo. Hay que descargar la cotización de las '+TR.lista.length+' empresas (unos segundos).</p><button type="button" data-natr="calc" style="padding:8px 16px;border-radius:10px;border:0;background:#1F4A9A;color:#fff;font-weight:700;font-size:13.5px;cursor:pointer">Calcular la tabla</button>'; return; }
    if(TR.est==='error'){ h.innerHTML=cab+'<div class="nf-mu">No se ha podido leer el IBEX con dividendos (precios/IBEXTR.json).</div>'; return; }
    if(TR.est==='cargando'){ h.innerHTML=cab+'<div class="nf-mu" style="padding:10px 0">Descargando cotizaciones… '+TR.hecho+' de '+TR.lista.length+'</div>'; return; }
    var R2=[], sin=[]; TR.lista.forEach(function(x){ var r=trUno(TR.P[x.t],TR.B,TR.DV[x.t],TR.per); if(r){ r.x=x; R2.push(r); } else sin.push(x.t); });
    var MAL=R2.filter(function(r){ return r.roto; }); R2=R2.filter(function(r){ return !r.roto; });
    R2.sort(function(a,b){ return b.dif-a.dif; });
    var gan=R2.filter(function(r){ return r.dif>0.5; }).length, pie=R2.filter(function(r){ return r.dif<-0.5; }).length, ref=R2.filter(function(r){ return !r.corto; })[0];
    var bt='<div class="na-flt" style="margin:6px 0 10px">'+[['3','3 años'],['5','5 años'],['10','10 años'],['max','Desde 2011']].map(function(b){ return '<span data-natrp="'+b[0]+'" class="'+(TR.per===b[0]?'on':'')+'">'+b[1]+'</span>'; }).join('')+'</div>';
    var fd=function(f){ var M=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], p=f.split('-'); return M[+p[1]-1]+'-'+p[0]; }, pc=function(v){ return (v>0?'+':'')+n(v,1)+' %'; };
    var filaI=ref?'<tr style="background:#F1F5F9;font-weight:700"><td class="l">IBEX 35 con dividendos</td><td>'+fd(ref.ini)+'</td><td>'+n(ref.ib,0)+' €</td><td>'+pc(ref.rib)+'</td><td>—</td><td>—</td><td></td></tr>':'';
    var rows=R2.map(function(r){ var c=r.dif>0.5?'#15803D':(r.dif<-0.5?'#B91C1C':'#B45309');
      return '<tr data-nfopen="'+r.x.t+'"><td class="l"><b>'+r.x.t+'</b> '+esc(r.x.nom)+(r.esp?' <span title="Hizo un reparto en acciones de otra empresa: no se suma como dividendo porque la cotización ya lo lleva descontado" style="color:#64748B">†</span>':'')+(r.x.tengo?' <span class="na-ch na-own">en cartera</span>':'')+'</td><td>'+fd(r.ini)+(r.corto?' <span title="No cotizaba al empezar el periodo: se compara desde que hay datos" style="color:#B45309">*</span>':'')+'</td><td><b>'+n(r.val,0)+' €</b></td><td>'+pc(r.ra)+'</td><td>'+pc(r.rib)+'</td><td style="color:'+c+';font-weight:700">'+(r.dif>0?'+':'')+n(r.dif,1)+' pt</td><td>'+dec(r.x.dec)+'</td></tr>'; }).join('')+
      /* 14-nov (Carlos: «sería mejor borrar ese registro y decir dato no válido»): la empresa sigue en la tabla, sin cifras */
      MAL.map(function(r){ return '<tr data-nfopen="'+r.x.t+'" style="color:#94A3B8"><td class="l"><b>'+r.x.t+'</b> '+esc(r.x.nom)+'</td><td colspan="5" style="text-align:center;font-style:italic">dato no válido en este periodo: el histórico de precios falla el '+fd(r.roto)+'</td><td>'+dec(r.x.dec)+'</td></tr>'; }).join('');
    h.innerHTML=cab+bt+'<div style="font-size:13.5px;color:#334155;margin-bottom:8px"><b>'+gan+'</b> le ganan al índice, <b>'+pie+'</b> pierden y <b>'+(R2.length-gan-pie)+'</b> van a la par (menos de medio punto al año).</div>'+
      '<div class="nf-tw"><table class="na-t"><tr><th class="l">Empresa</th><th>Desde</th><th>100 € son hoy</th><th>Al año</th><th>IBEX, mismo periodo</th><th>Diferencia al año</th><th>Decisión</th></tr>'+filaI+rows+'</table></div>'+
      '<span class="nf-ws">Dividendos brutos, sin impuestos ni comisiones, en la empresa y en el índice. Cada empresa se compara con el IBEX en su mismo periodo; con * las que empezaron a cotizar después. Con † las que repartieron acciones de otra empresa en el periodo: ese reparto no se suma como dividendo porque la cotización ya lo lleva descontado. Datos hasta el '+(ref?fd(ref.fin):'—')+'.'+(MAL.length?' «Dato no válido»: el histórico de precios de esa empresa da ese día un salto de más del 40 % que ningún dividendo explica; con un periodo que empiece después sí sale.':'')+(sin.length?' Sin datos suficientes: '+sin.join(', ')+'.':'')+' La rentabilidad pasada no dice nada de la futura.</span>';
  }
  document.addEventListener('click',function(e){
    var o=e.target.closest&&e.target.closest('[data-nfopen]'); if(o&&window.nfAbrir){ window.nfAbrir(o.getAttribute('data-nfopen')); return; }
    var f=e.target.closest&&e.target.closest('[data-naf]'); if(f){ filtro=f.getAttribute('data-naf'); pintar(); return; }
    var mp=e.target.closest&&e.target.closest('[data-namap]'); if(mp){ mapaSolo=mp.getAttribute('data-namap')==='1'; pintar(); return; }
    if(e.target.closest&&e.target.closest('[data-naval]')){ valCargar(); return; }
    var vf=e.target.closest&&e.target.closest('[data-navalf]'); if(vf){ VAL.solo=vf.getAttribute('data-navalf')==='1'; pintarVal(); return; }
    if(e.target.closest&&e.target.closest('[data-natr]')){ trCargar(); return; }
    var q=e.target.closest&&e.target.closest('[data-natrp]'); if(q){ TR.per=q.getAttribute('data-natrp'); pintarTr(); }
  });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._na) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='analizadas') pintar(); return r; }; activarVista._na=1;
    /* fuera de la ficha nueva, «abrir ficha» de una analizada lleva a la Ficha de empresa nueva */
    if(typeof abrirFicha==='function'&&!abrirFicha._nf){ var ob=abrirFicha; abrirFicha=function(t){ var T=String(t||'').toUpperCase(); if(R&&(R.empresas||[]).some(function(x){ return x.ticker===T; })&&window.nfAbrir){ window.nfAbrir(T); return; } return ob.apply(this,arguments); }; abrirFicha._nf=1; }
    cargar(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
