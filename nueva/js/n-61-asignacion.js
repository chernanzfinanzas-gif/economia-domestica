/* APP NUEVA · PLAN → ASIGNACIÓN (boceto «Asignación - boceto 29-oct v4»).
   Decidido (29-oct): la mecánica de siempre (_planParams/_planReparto: joyas 8 %, núcleo a partes iguales, mantener a coste,
   objetivo = % × capital final, reparto del hueco año a año con la aportación de Independencia). Lo nuevo es la forma:
   1 · Objetivos agrupados por joya / núcleo / mantener con su suma, el reparto ya puesto en cada año y la previsión 2035-2050;
   2 · Desfase: sus cuatro cuadros (hoy/objetivo × valor/coste) y la tabla por TIPO de empresa, que sale de la Matriz v3;
   la diversificación se mide por dinero invertido hasta 2034 (coste); tope 30 % por tipo;
   3 · Compras de este año: lo más barato frente a su entrada primero, con tope = el hueco de cada empresa. */
(function(){
  var R=null, hz='plan';
  function f(v){ return Math.round(+v||0).toLocaleString('es-ES',{useGrouping:'always'}); }
  function p(v){ return v==null||!isFinite(v)?'—':(v*100).toFixed(1).replace('.',',')+' %'; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  var TIPON={CONSUMO:'Consumo',REGULADAS:'Reguladas',FINANCIERAS:'Financieras',INDUSTRIAL:'Industrial',SALUD:'Salud',CONCESIONAL:'Concesional',COMMODITY:'Commodity',ESCALABLES:'Escalables',INMOBILIARIAS:'Inmobiliarias'};
  var GC={joya:['#B45309','#FEF3C7','👑 Joya'],nucleo:['#1F4A9A','#EAF1FD','Núcleo'],mantener:['#64748B','#F1F5F9','Mantener'],'':['#94A3B8','#F8FAFC','Sin etiqueta']};
  function cargar(){ if(R) return Promise.resolve(); var ev=(typeof khEvCargar==='function')?khEvCargar().catch(function(){}):Promise.resolve();
    return Promise.all([fetch('fichas/_resumen.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }),ev]).then(function(a){ R={}; ((a[0]||{}).empresas||[]).forEach(function(e){ R[e.ticker]=e; }); }); }
  function cot(t){ try{ var c=(typeof _mcCot==='function')?+_mcCot(t):0; if(c>0) return c; }catch(e){} var v=(DB.valores||{})[t]; return v?+v.precioActual||0:0; }
  function stats(W){ var tot=0, k=Object.keys(W); k.forEach(function(t){ tot+=W[t]; }); if(!(tot>0)) return null;
    var w=k.map(function(t){ return [t,W[t]/tot]; }).filter(function(x){ return x[1]>0.0001; }).sort(function(a,b){ return b[1]-a[1]; });
    var hh=w.reduce(function(s,x){ return s+x[1]*x[1]; },0); return {w:w,max:w[0],top3:w.slice(0,3).reduce(function(s,x){ return s+x[1]; },0),n:w.length,ef:hh>0?1/hh:0}; }
  function porTipo(W,tipo){ var o={}, tot=0; Object.keys(W).forEach(function(t){ var k=tipo(t); o[k]=(o[k]||0)+W[t]; tot+=W[t]; }); var m=null; Object.keys(o).forEach(function(k){ if(!m||o[k]>o[m]) m=k; }); return {o:o,tot:tot,max:m,maxp:tot>0&&m?o[m]/tot:0}; }
  function cuadro(tit,S,T,nota){ if(!S) return '';
    var conc=S.max[1]>0.10||T.maxp>0.30||S.top3>0.45||S.n<15;
    return '<div class="as-q"><div class="as-qh"><b>'+tit+'</b><span class="as-tag '+(conc?'r':'v')+'">'+(conc?'CONCENTRADA':'EQUILIBRADA')+'</span></div>'+
      '<div class="nf-kv"><span>Máx. posición</span><b class="'+(S.max[1]>0.10?'neg':'')+'">'+p(S.max[1])+' · '+esc(S.max[0])+'</b><span>Máx. tipo</span><b class="'+(T.maxp>0.30?'neg':'')+'">'+p(T.maxp)+' · '+esc(T.max)+'</b><span>Top-3</span><b class="'+(S.top3>0.45?'neg':'')+'">'+p(S.top3)+'</b><span>Posiciones</span><b>'+S.n+' <small>≈'+S.ef.toFixed(1).replace('.',',')+' efectivas</small></b></div>'+(nota?'<div class="nf-mu">'+nota+'</div>':'')+'</div>'; }
  function pintar(){
    var v=document.getElementById('view-asignacion'); if(!v) return;
    var host=document.getElementById('nAsig'); if(!host){ [].forEach.call(v.children,function(c,i){ if(i>0) c.style.display='none'; }); host=document.createElement('div'); host.id='nAsig'; v.appendChild(host); }
    if(!R){ host.innerHTML='<div class="nf-mu" style="padding:20px">Cargando…</div>'; cargar().then(pintar); return; }
    var P, Rp; try{ P=_planParams(); Rp=_planReparto(); }catch(e){ host.innerHTML='<div class="nf-card">No se pudo calcular el plan: '+esc(e.message)+'</div>'; return; }
    var B=planPresupuesto(), nowY=B.nowY, yc=P.ycierre||B.ycierre, years=[]; for(var y=Math.max(nowY+1,B.ydesde); y<=yc; y++) years.push(y);
    var c=(DB.config&&DB.config.proyeccion)||{}, ap2={}, AP2=0; for(var y2=yc+1; y2<=2050; y2++){ var a=+((c.aportaciones||{})[y2]); if(!(a>0)) a=+c.aportacionDefault||0; ap2[y2]=a; AP2+=a; }
    var TF=P.TF, TF50=TF+AP2, tipoE=function(t){ return P.tipoOf(t)||''; };
    var tipoM=function(t){ var a=(R[t]||{}).arquetipo; return TIPON[a]||a||'Sin tipo'; };
    var val={}; P.allTk.forEach(function(t){ var acc=0; try{ invPositions().forEach(function(x){ if(String(x.ticker||'').toUpperCase()===t) acc+=+x.acciones||0; }); }catch(e){} val[t]=acc*cot(t); });
    var inv=P.totalInv, totVal=Object.keys(val).reduce(function(s,t){ return s+val[t]; },0);
    var sched=Rp.sched||{}, yrOf=function(t,y){ return +((sched[t]||{})[y])||0; };
    var grupos=['joya','nucleo','mantener',''].map(function(g){ return [g,P.allTk.filter(function(t){ return tipoE(t)===g; })]; }).filter(function(x){ return x[1].length; });
    var nom=function(t){ return (R[t]||{}).empresa||((DB.analisis||[]).filter(function(a){ return String(a.ticker).toUpperCase()===t; })[0]||{}).nombre||t; };
    var head='<tr><th class="l">Empresa</th><th class="l">Grupo · método</th><th>Invertido</th><th>% act.</th><th>Objetivo</th><th>% obj.</th><th>A asignar</th>'+years.map(function(y){ return '<th>'+y+'</th>'; }).join('')+'<th>Total plan</th>'+(hz==='prev'?'<th class="pvc">'+(yc+1)+'-2050</th><th class="pvc">Objetivo 2050</th>':'')+'</tr>';
    var body='';
    grupos.forEach(function(G){ var g=G[0], L=G[1], col=GC[g]||GC[''];
      var sc=0,so=0,sg=0,sy=years.map(function(){ return 0; }),s50=0;
      var rows=L.map(function(t){ var ci=P.invByT[t]||0, ob=P.objEur(t), gap=Math.max(0,ob-ci), o50=ob*TF50/TF; sc+=ci; so+=ob; sg+=gap; s50+=o50; var tot=0;
        var cells=years.map(function(y,i){ var v=yrOf(t,y); sy[i]+=v; tot+=v; return '<td class="yc">'+(v>0.5?f(v):'·')+'</td>'; }).join('');
        var e=R[t]||{};
        return '<tr><td class="l"><b class="as-tk">'+t+'</b> <span class="nf-mu">'+esc(nom(t))+'</span>'+(gap<0.5&&g!=='mantener'?' <span class="as-chip a">ya en objetivo</span>':'')+(P.congel&&P.congel.has&&P.congel.has(t)?' <span class="as-chip a">congelada</span>':'')+'</td>'+
          '<td class="l"><select class="as-sel" data-astipo="'+t+'" title="Grupo de la empresa en el plan" style="color:'+col[0]+';background:'+col[1]+'">'+['joya','nucleo','mantener',''].map(function(k){ return '<option value="'+k+'"'+(k===g?' selected':'')+'>'+GC[k][2]+'</option>'; }).join('')+'</select> <span class="as-rt">'+esc(e.rating||'')+'</span>'+(e.dss!=null?'<span class="as-sd'+(e.dss<50?' lo':'')+'">div '+e.dss+'</span>':'')+'</td>'+
          '<td>'+(ci?f(ci):'—')+'</td><td>'+(ci?p(ci/inv):'—')+'</td><td>'+f(ob)+'</td><td>'+p(ob/TF)+'</td><td>'+(gap>0.5?f(gap):'✓')+'</td>'+cells+'<td><b>'+(tot>0.5?f(tot):'·')+'</b></td>'+
          (hz==='prev'?'<td class="pvc">'+(o50-ob>0.5?f(o50-ob):'·')+'</td><td class="pvc"><b>'+f(o50)+'</b></td>':'')+'</tr>'; }).join('');
      body+='<tr class="as-gr" style="--gc:'+col[0]+';--gb:'+col[1]+'"><td colspan="2"><b>'+col[2]+'</b> · '+L.length+(L.length>1?' empresas':' empresa')+'</td><td>'+f(sc)+'</td><td>'+p(sc/inv)+'</td><td><b>'+f(so)+'</b></td><td>'+p(so/TF)+'</td><td>'+f(sg)+'</td>'+sy.map(function(v){ return '<td>'+f(v)+'</td>'; }).join('')+'<td><b>'+f(sy.reduce(function(a,b){ return a+b; },0))+'</b></td>'+(hz==='prev'?'<td class="pvc"><b>'+f(s50-so)+'</b></td><td class="pvc"><b>'+f(s50)+'</b></td>':'')+'</tr>'+rows; });
    var apY=years.map(function(y){ return B.disp(y); });
    body+='<tr class="as-tot"><td colspan="7"><b>Aportación del año</b> (de Independencia)</td>'+apY.map(function(v){ return '<td><b>'+f(v)+'</b></td>'; }).join('')+'<td><b>'+f(apY.reduce(function(a,b){ return a+b; },0))+'</b></td>'+(hz==='prev'?'<td class="pvc"><b>'+f(AP2)+'</b></td><td></td>':'')+'</tr>';
    /* paso 2: desfase */
    var objC={}, objV={}; P.allTk.forEach(function(t){ objC[t]=P.objEur(t); objV[t]=(val[t]||0)+Math.max(0,P.objEur(t)-(P.invByT[t]||0)); });
    var hoyC={}; Object.keys(P.invByT).forEach(function(t){ hoyC[t]=P.invByT[t]; });
    var hoyV={}; Object.keys(val).forEach(function(t){ if(val[t]>0) hoyV[t]=val[t]; });
    var Thc=porTipo(hoyC,tipoM), Thv=porTipo(hoyV,tipoM), Toc=porTipo(objC,tipoM), Tov=porTipo(objV,tipoM);
    var tipos=Object.keys(Toc.o).sort(function(a,b){ return Toc.o[b]-Toc.o[a]; });
    var ttab='<table class="nf-t"><tr><th>Tipo de empresa</th><th>Hoy coste</th><th>Hoy valor</th><th>Objetivo coste</th><th>Objetivo valor</th><th>Tope 30 %</th><th>Falta comprar</th></tr>'+tipos.map(function(k){ var oc=Toc.o[k]/Toc.tot, falta=P.allTk.filter(function(t){ return tipoM(t)===k; }).reduce(function(s,t){ return s+Math.max(0,P.objEur(t)-(P.invByT[t]||0)); },0);
      return '<tr><td><b>'+esc(k)+'</b> <span class="nf-mu">'+P.allTk.filter(function(t){ return tipoM(t)===k; }).join(', ')+'</span></td><td>'+p((Thc.o[k]||0)/Thc.tot)+'</td><td>'+p((Thv.o[k]||0)/(Thv.tot||1))+'</td><td><b>'+p(oc)+'</b></td><td>'+p((Tov.o[k]||0)/Tov.tot)+'</td><td class="'+(oc>0.30?'neg':'pos')+'">'+(oc>0.30?'⚠ supera 30 %':'✓')+'</td><td>'+f(falta)+'</td></tr>'; }).join('')+'</table>';
    var aviso=Toc.maxp>0.30?'<div class="nf-vd" style="background:#FEF3C7;color:#B45309;border-left-color:#B45309">Con el tipo de empresa del método, el objetivo por coste pone <b>'+esc(Toc.max)+' en '+p(Toc.maxp)+'</b> ('+P.allTk.filter(function(t){ return tipoM(t)===Toc.max; }).join(', ')+'), por encima del 30 %: toca mover alguna o meter otra empresa de otro tipo.</div>':'';
    /* paso 3: compras de este año */
    var yC=nowY, apC=B.bruto(yC), comp=0; try{ comp=(typeof planExecEur==='function')?planExecEur(yC):0; }catch(e){}
    var ops=P.allTk.map(function(t){ var e=R[t]||{}, fe=e.fecha_niveles||'', rb=function(x){ return window.nfRebase?window.nfRebase(t,x,fe):x; }, pr=cot(t)||e.precio_analisis, em=rb(e.entrada_min), eM=rb(e.entrada_max), gap=Math.max(0,P.objEur(t)-(P.invByT[t]||0));
      return {t:t,e:e,pr:pr,em:em,eM:eM,d:eM>0&&pr>0?pr/eM-1:9,gap:gap,tipo:tipoM(t),falta:P.objEur(t)>0?gap/P.objEur(t):0}; }).filter(function(x){ return x.gap>0.5&&tipoE(x.t)!=='mantener'; });
    var tipoFalta={}; tipos.forEach(function(k){ tipoFalta[k]=Toc.o[k]>0?P.allTk.filter(function(t){ return tipoM(t)===k; }).reduce(function(s,t){ return s+Math.max(0,P.objEur(t)-(P.invByT[t]||0)); },0)/Toc.o[k]:0; });
    ops.sort(function(a,b){ return (a.d-b.d)||((tipoFalta[b.tipo]||0)-(tipoFalta[a.tipo]||0)); });
    var dc={COMPRAR:'v',MANTENER:'n',ESPERAR:'a'};
    var otab='<table class="nf-t"><tr><th>#</th><th>Oportunidad</th><th>Tesis</th><th>Precio</th><th>Entrada hasta</th><th>Estado</th><th>Tipo · le falta</th><th>Tope (hueco)</th></tr>'+ops.map(function(x,i){ var st=x.d<=0?(x.pr<x.em?'más barata que la banda':'en zona de compra'):(p(x.d)+' por encima de entrada');
      return '<tr data-nfopen="'+x.t+'" style="cursor:pointer"><td>'+(i+1)+'</td><td><b class="as-tk">'+x.t+'</b> <span class="nf-mu">'+esc(nom(x.t))+'</span></td><td><span class="as-chip '+(dc[x.e.decision]||'n')+'">'+esc(x.e.decision||'—')+'</span></td><td>'+(x.pr?x.pr.toFixed(2).replace('.',',')+' €':'—')+'</td><td>'+(x.eM?x.eM.toFixed(2).replace('.',',')+' €':'—')+'</td><td class="'+(x.d<=0?'pos':'')+'">'+st+'</td><td>'+esc(x.tipo)+' <span class="nf-mu">falta '+Math.round(x.falta*100)+' %</span></td><td>'+f(x.gap)+'</td></tr>'; }).join('')+'</table>';
    var nJ=P.nJoya, nN=P.nNuc, nM=P.nMant;
    host.innerHTML='<div class="na-hero"><h1>Asignación</h1><p>Dónde quieres estar al cierre del plan y qué comprar cada año para llegar — sin vender, para no tributar. Tres pasos: objetivos, desfase y compras del año.</p>'+
      '<div class="na-kp"><div>Invertido hasta hoy<b>'+f(inv)+' €</b></div><div>Disponible '+(years[0]||'')+'-'+yc+'<b>'+f(P.disponible)+' €</b></div><div>Capital del plan ('+yc+')<b>'+f(TF)+' €</b></div><div>Previsión 2050<b>'+f(TF50)+' €</b></div><div>👑 Joyas<b>'+nJ+' × 8 %</b></div><div>Núcleo · mantener<b>'+nN+' · '+nM+'</b></div></div></div>'+
      '<div class="nf-card"><h2>1 · Objetivos de compra <span class="nf-sub">objetivo de cada empresa = su % × capital final; lo que falta se reparte año a año con la aportación de ese año como tope</span></h2>'+
      '<div class="na-flt"><span data-ashz="plan" class="'+(hz==='plan'?'on':'')+'">Plan · hasta '+yc+'</span><span data-ashz="prev" class="'+(hz==='prev'?'on':'')+'">Previsión · hasta 2050</span></div>'+(hz==='prev'?'<div class="nf-mu">La previsión sigue con tus aportaciones de Independencia hasta 2050 y los mismos pesos. Solo para ver; no es plan.</div>':'')+
      '<div class="nf-tw"><table class="as-t">'+head+body+'</table></div><span class="nf-ws">La etiqueta la pones tú: cámbiala en el desplegable y el plan se recalcula; al lado, la calidad y la seguridad del dividendo del método.</span></div>'+
      '<div class="nf-card"><h2>2 · Desfase <span class="nf-sub">¿tu elección de empresas mantiene la inversión equilibrada? Umbrales: máx. 10 % por empresa · máx. 30 % por tipo · top-3 ≤ 45 % · al menos 15 posiciones</span></h2>'+
      '<div class="as-qs">'+cuadro('Hoy · por valor',stats(hoyV),Thv)+cuadro('Objetivo · por valor (proyectado)',stats(objV),Tov)+cuadro('Hoy · por coste',stats(hoyC),Thc)+cuadro('Objetivo · por coste (plan '+yc+')',stats(objC),Toc,'el ancla del método: así quedará repartido tu dinero')+'</div>'+aviso+ttab+'<span class="nf-ws">El tipo de empresa sale de la Matriz v3 del método.</span></div>'+
      '<div class="nf-card"><h2>3 · Compras de este año <span class="nf-sub">el paso 1 es la simulación; la compra real va por la mejor oportunidad según la tesis, con tope = lo que le falta a cada empresa</span></h2>'+
      '<div class="nf-kv"><span>Aportación '+yC+'</span><b>'+f(apC)+' € <small>de Independencia</small></b><span>Comprado este año (del plan)</span><b>'+f(comp)+' €</b><span>Queda por invertir</span><b>'+f(Math.max(0,apC-comp))+' €</b></div>'+
      '<div class="nf-tw">'+otab+'</div><span class="nf-ws">Orden: lo más barato frente a su entrada primero; a igualdad, el tipo de empresa más alejado de su objetivo. Pincha una para abrir su ficha.</span></div>';
  }
  /* [31-oct-2026 · Fase 3] la etiqueta Joya/Núcleo/Mantener se cambia aquí (DB.planTipo, la misma de la app de siempre) */
  document.addEventListener('change',function(e){ var x=e.target; if(!x||!x.getAttribute||!x.hasAttribute('data-astipo')) return; var t=x.getAttribute('data-astipo'), v=x.value;
    DB.planTipo=DB.planTipo||{}; if(v) DB.planTipo[t]=v; else delete DB.planTipo[t];
    if(typeof _planRepartoInval==='function') _planRepartoInval(); if(typeof scheduleSave==='function') scheduleSave(); pintar(); });
  document.addEventListener('click',function(e){ var h=e.target.closest&&e.target.closest('[data-ashz]'); if(h){ hz=h.getAttribute('data-ashz'); pintar(); } });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._as) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='asignacion') setTimeout(pintar,50); return r; }; activarVista._as=1; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
