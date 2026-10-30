/* APP NUEVA · PLAN → SIMULADOR DE DIVIDENDOS (boceto «Simulador - boceto 29-oct v3», Carlos: «me gusta mucho el diseño»).
   Qué dividendo te dará cada año tu plan de compras, empresa por empresa. Sale de Asignación (_planReparto): si cambias una
   compra allí, cambia aquí. Acciones de hoy; las compras futuras a precio de hoy; dividendo por acción del método (último
   ejercicio) subiendo tu «Crecimiento dividendo» de Independencia. 2035-2050: previsión con tus aportaciones de Independencia
   repartidas con los pesos del objetivo (barras rayadas). Un año cada vez: flechas, botones, deslizador o pinchar en la barra. */
(function(){
  var R=null, hz='plan', Y0=null;
  function f(v){ return Math.round(+v||0).toLocaleString('es-ES',{useGrouping:'always'}); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function cot(t){ try{ var c=(typeof _mcCot==='function')?+_mcCot(t):0; if(c>0) return c; }catch(e){} var v=(DB.valores||{})[t]; return v?+v.precioActual||0:0; }
  function cargar(){ if(R) return Promise.resolve(); var ev=(typeof khEvCargar==='function')?khEvCargar().catch(function(){}):Promise.resolve();
    return Promise.all([fetch('fichas/_resumen.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }),ev]).then(function(a){ R={}; ((a[0]||{}).empresas||[]).forEach(function(e){ R[e.ticker]=e; }); }); }
  var GN={joya:'Joyas',nucleo:'Núcleo',mantener:'Mantener'}, GCOL={joya:'#B45309',nucleo:'#1F4A9A',mantener:'#64748B'};
  function modelo(){
    var P=_planParams(), Rp=_planReparto(), B=planPresupuesto(), c=(DB.config&&DB.config.proyeccion)||{}, g=+c.crecDividendo||0.025, nowY=B.nowY, yc=P.ycierre||B.ycierre, sched=Rp.sched||{};
    var yrs=[]; for(var y=nowY; y<=2050; y++) yrs.push(y);
    var ap2=function(y){ var a=+((c.aportaciones||{})[y]); return a>0?a:(+c.aportacionDefault||0); };
    var E=P.allTk.map(function(t){
      var e=R[t]||{}, sh=0; try{ invPositions().forEach(function(x){ if(String(x.ticker||'').toUpperCase()===t) sh+=+x.acciones||0; }); }catch(er){}
      var pr=cot(t)||e.precio_analisis||0, d0=e.dpa?+e.dpa[1]:0, ya=e.dpa?+e.dpa[0]:nowY-1;
      if(d0&&window.nfRebase) d0=window.nfRebase(t,d0,e.dpa?(e.dpa[0]+'-12-31'):'');   /* dividendo por acción en acciones de hoy */
      if(!(d0>0)){ var v=(DB.valores||{})[t]; d0=v?+v.divAccion||0:0; ya=nowY; }
      var peso=P.TF>0?P.objEur(t)/P.TF:0, cost=P.invByT[t]||0, Y={};
      yrs.forEach(function(y){ var buy=y<=yc?(y===nowY?0:(+((sched[t]||{})[y])||0)):ap2(y)*peso; var ns=pr>0?buy/pr:0; sh+=ns; cost+=buy;
        var dpa=d0*Math.pow(1+g,Math.max(0,y-ya)); Y[y]={sh:sh,buy:buy,nsh:ns,dpa:dpa,div:sh*dpa,cost:cost}; });
      return {t:t,n:e.empresa||t,g:P.tipoOf(t)||'',Y:Y}; });
    return {E:E,yrs:yrs,fin:yc,nowY:nowY,g:g};
  }
  function pintar(){
    var v=document.getElementById('view-simulador'); if(!v) return;
    var host=document.getElementById('nSim'); if(!host){ [].forEach.call(v.children,function(c,i){ if(i>0) c.style.display='none'; }); host=document.createElement('div'); host.id='nSim'; v.appendChild(host); }
    if(!R){ host.innerHTML='<div class="nf-mu" style="padding:20px">Cargando…</div>'; cargar().then(pintar); return; }
    var M; try{ M=modelo(); }catch(e){ host.innerHTML='<div class="nf-card">No se pudo calcular: '+esc(e.message)+'</div>'; return; }
    var yrs=M.yrs.filter(function(y){ return hz==='prev'||y<=M.fin; }); if(Y0==null) Y0=M.nowY; Y0=Math.max(yrs[0],Math.min(yrs[yrs.length-1],Y0));
    var tot=function(y,g){ return M.E.reduce(function(s,e){ return s+((!g||e.g===g)?e.Y[y].div:0); },0); };
    var mx=Math.max.apply(null,yrs.map(function(y){ return tot(y); }).concat([1])), W=900,H=200,x0=50,x1=890,bw=(x1-x0)/yrs.length;
    var sv='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs"><defs><pattern id="nsR" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="rgba(255,255,255,.45)"/></pattern></defs>';
    yrs.forEach(function(y,i){ var x=x0+i*bw+bw*0.12, w=bw*0.76, acc=0;
      ['mantener','nucleo','joya'].forEach(function(g){ var val=tot(y,g); if(!(val>0)) return; var h=val/mx*(H-40); sv+='<rect x="'+x.toFixed(1)+'" y="'+(H-22-acc-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+GCOL[g]+'"'+(y===Y0?'':' opacity=".8"')+'/>'+(y>M.fin?'<rect x="'+x.toFixed(1)+'" y="'+(H-22-acc-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="url(#nsR)"/>':''); acc+=h; });
      if(y===Y0) sv+='<rect x="'+(x-2).toFixed(1)+'" y="'+(H-24-acc).toFixed(1)+'" width="'+(w+4).toFixed(1)+'" height="'+(acc+4).toFixed(1)+'" fill="none" stroke="#0F172A" stroke-width="2" rx="2"/>';
      if(yrs.length<=12||i%2===0||y===Y0) sv+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="'+(y===Y0?'#0F172A':'#64748B')+'" font-weight="'+(y===Y0?800:400)+'">'+String(y).slice(2)+'</text>';
      sv+='<rect data-nsy="'+y+'" x="'+(x0+i*bw).toFixed(1)+'" y="0" width="'+bw.toFixed(1)+'" height="'+H+'" fill="transparent" style="cursor:pointer"/>'; });
    sv+='</svg>';
    var rows=M.E.slice().sort(function(a,b){ return ['joya','nucleo','mantener',''].indexOf(a.g)-['joya','nucleo','mantener',''].indexOf(b.g)||b.Y[Y0].div-a.Y[Y0].div; }).map(function(e){ var q=e.Y[Y0];
      return '<tr><td class="l"><b class="as-tk">'+e.t+'</b> <span class="nf-mu">'+esc(e.n)+'</span></td><td class="l"><span class="as-sel" style="color:'+(GCOL[e.g]||'#94A3B8')+';background:#F8FAFC">'+(GN[e.g]||'—')+'</span></td><td>'+f(q.sh)+'</td><td>'+(q.buy>0.5?f(q.buy)+' €':'·')+'</td><td>'+(q.nsh>0.05?'+'+f(q.nsh):'·')+'</td><td>'+q.dpa.toFixed(3).replace('.',',')+' €</td><td><b>'+f(q.div)+' €</b></td></tr>'; }).join('');
    var t0=tot(M.nowY), tY=tot(Y0), cg=(Y0>M.nowY&&t0>0)?(Math.pow(tY/t0,1/(Y0-M.nowY))-1)*100:null;
    host.innerHTML='<div class="na-hero"><h1>Simulador de dividendos</h1><p>Qué dividendo te dará cada año tu plan de compras, empresa por empresa. Sale de Asignación: si cambias una compra allí, cambia aquí.</p>'+
      '<div class="na-kp"><div>Dividendo bruto en '+Y0+'<b>'+f(tY)+' €</b></div><div>👑 Joyas<b>'+f(tot(Y0,'joya'))+' €</b></div><div>Núcleo<b>'+f(tot(Y0,'nucleo'))+' €</b></div><div>Mantener<b>'+f(tot(Y0,'mantener'))+' €</b></div><div>Este año ('+M.nowY+')<b>'+f(t0)+' €</b></div><div>Crece al año<b>'+(cg!=null?cg.toFixed(1).replace('.',',')+' %':'—')+'</b></div></div></div>'+
      '<div class="nf-card"><div class="na-flt"><span data-nshz="plan" class="'+(hz==='plan'?'on':'')+'">Plan · hasta '+M.fin+'</span><span data-nshz="prev" class="'+(hz==='prev'?'on':'')+'">Previsión · hasta 2050</span></div>'+(hz==='prev'?'<div class="nf-mu">'+(M.fin+1)+'-2050: tus aportaciones de Independencia repartidas manteniendo los pesos del objetivo (sin plan de compras cerrado).</div>':'')+
      '<div class="ns-nav"><button data-nsm="-1">◀</button><input type="range" min="'+yrs[0]+'" max="'+yrs[yrs.length-1]+'" value="'+Y0+'" data-nsr><button data-nsm="1">▶</button><b>'+Y0+'</b></div>'+
      '<div class="ns-yrs">'+yrs.map(function(y){ return '<span data-nsy="'+y+'" class="'+(y===Y0?'on':'')+(y>M.fin?' pv':'')+'">'+y+'</span>'; }).join('')+'</div>'+sv+
      '<div class="nf-lg"><span><i style="background:#B45309"></i>Joyas</span><span><i style="background:#1F4A9A"></i>Núcleo</span><span><i style="background:#64748B"></i>Mantener</span>'+(hz==='prev'?'<span>Rayadas: previsión fuera del plan</span>':'')+'</div></div>'+
      '<div class="nf-card"><h2>Empresa por empresa · '+Y0+' <span class="nf-sub">acciones al cierre del año · lo que compras ese año (paso 1 de Asignación) · dividendo por acción previsto · dividendo que cobrarías</span></h2><div class="nf-tw"><table class="as-t"><tr><th class="l">Empresa</th><th class="l">Grupo</th><th>Acciones</th><th>Compras del año</th><th>Acciones nuevas</th><th>Dividendo por acción</th><th>Dividendo</th></tr>'+rows+'<tr class="as-tot"><td colspan="6">Total '+Y0+'</td><td><b>'+f(tY)+' €</b></td></tr></table></div>'+
      '<span class="nf-ws">Las compras futuras, a precio de hoy. El dividendo por acción parte del último ejercicio del método y sube un '+(M.g*100).toFixed(1).replace('.',',')+' % al año (tu hipótesis de Independencia).</span></div>';
  }
  document.addEventListener('click',function(e){ if(!e.target.closest||!e.target.closest('#nSim')) return;
    var h=e.target.closest('[data-nshz]'); if(h){ hz=h.getAttribute('data-nshz'); pintar(); return; }
    var m=e.target.closest('[data-nsm]'); if(m){ Y0+=+m.getAttribute('data-nsm'); pintar(); return; }
    var y=e.target.closest('[data-nsy]'); if(y){ Y0=+y.getAttribute('data-nsy'); pintar(); } });
  document.addEventListener('input',function(e){ if(e.target&&e.target.hasAttribute&&e.target.hasAttribute('data-nsr')){ Y0=+e.target.value; pintar(); } });
  document.addEventListener('keydown',function(e){ var v=document.getElementById('view-simulador'); if(!v||!v.classList.contains('active')||/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')) return;
    if(e.key==='ArrowLeft'){ Y0--; pintar(); } else if(e.key==='ArrowRight'){ Y0++; pintar(); } });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._ns) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='simulador') setTimeout(pintar,50); return r; }; activarVista._ns=1; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
