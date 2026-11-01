/* APP NUEVA · Sistema › Cobertura rediseñada (1-nov-2026, boceto v2 aprobado por Carlos: «el diseño me parece bien»).
   Las piezas de siempre siguen haciendo su trabajo (calendario de cobertura con sus casillas ✓, cola con ▲▼, cadencia,
   calendario de resultados y novedades de la recogida); aquí se reordenan y se pintan con el aspecto nuevo:
     · 4 cifras: requieren acción · próximos 14 días · temporada (publicadas de N) · analizadas de universo y cola.
     · 5 botones: ⚡ Qué toca · 📅 Resultados del universo · 🔁 Cadencia · 🗂️ Cola · 📥 Novedades.
     · Qué toca: Ahora / Cola / Próximos 14 días / Más adelante (por mes, plegado) / Hechas (plegado). Un informe que el
       método nuevo ya revisó (fichas/_resumen.json → revisado_hasta) cuenta como hecho aunque la casilla no esté marcada.
     · Resultados: el calendario de la temporada por semanas, con filtro «Cartera y analizadas / Todo el universo», y debajo
       el buscador de histórico (n-81).
     · Cadencia: último analizado (periodo y día de aprobación) y próximo informe (periodo, fecha y cuánto falta). */
(function(){
  if(typeof window.renderCobertura!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var DS=['dom','lun','mar','mié','jue','vie','sáb'], MN=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
      MES={ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11};
  window._nCobTab=window._nCobTab||'toca'; window._nCobFil=window._nCobFil||'mias';
  var RES=null, CAL=null, HIS=null, T0=0;
  function uno(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
  function cargar(){ if(RES&&Date.now()-T0<10*60*1000) return Promise.resolve();
    return Promise.all([uno('fichas/_resumen.json'),uno('recogida/calendario.json'),uno('recogida/historico-resultados.json')]).then(function(a){ RES=a[0]; CAL=a[1]; HIS=a[2]; T0=Date.now(); }); }
  function hoyD(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
  function iso(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function fd(f){ if(!f) return '—'; var d=new Date(f+'T12:00:00'), y=new Date().getFullYear(); return DS[d.getDay()]+' '+d.getDate()+'/'+(d.getMonth()+1)+(d.getFullYear()!==y?'/'+String(d.getFullYear()).slice(2):''); }
  function diasA(f){ return Math.round((Date.parse(f+'T12:00:00')-hoyD().getTime()-12*36e5)/864e5); }
  function revDe(t){ var e=((RES&&RES.empresas)||[]).filter(function(x){ return x.ticker===t; })[0]; return e||null; }
  var RANK={'3M':1,'Q1':1,'1T':1,'S1':2,'H1':2,'1S':2,'9M':3,'Q3':3,'3T':3,'FY':4,'Q4':4,'ANUAL':4};
  function perRank(p){ /* «2026-9M» → [2026,3]; «2025» o «2025-FY» → [2025,4] */ var m=/^(20\d\d)(?:-(\w+))?$/.exec(String(p||'')); if(!m) return null; return [+m[1], m[2]?(RANK[m[2].toUpperCase()]||0):4]; }
  function cubre(rev,lbl,fecha){ /* ¿la revisión aprobada cubre el informe «Informe 9M» con fecha …? */ var a=perRank(rev); if(!a||!fecha) return false;
    var q=/Informe\s+(\w+)/.exec(lbl||''); if(!q) return false; var r=RANK[q[1].toUpperCase()]; if(!r) return false; var y=+fecha.slice(0,4); if(r===4&&+fecha.slice(5,7)<=6) y-=1;   /* FY publicado en ene-jun = ejercicio anterior; en otoño (Logista) = el del año */
    return a[0]>y||(a[0]===y&&a[1]>=r); }

  /* ---------- 1. datos de las piezas de siempre ---------- */
  function filasCalendario(){ var host=document.getElementById('calHost'); if(!host) return null; var tb=host.querySelector('.cob-desk tbody'); if(!tb) return null;
    var band=0, L=[], hoy=hoyD();
    [].forEach.call(tb.children,function(tr){ if(tr.classList.contains('cob-band')){ band=/Ahora/.test(tr.textContent)?0:(/Pendientes/.test(tr.textContent)?1:2); return; }
      var td=tr.children; if(td.length<7) return; var tk=(td[1].querySelector('.cob-tk')||{}).textContent||''; var nm=(td[1].querySelector('span')||{}).textContent||'';
      var lbl=td[2].textContent.trim(), ftx=td[3].textContent.replace(/conf\./,'').trim(), conf=/conf\./.test(td[3].textContent), dtx=td[4].textContent.trim(), est=td[5].textContent.trim();
      var m=/(\d{1,2})-([a-zé]{3})/.exec(ftx), f=null; if(m&&MES[m[2]]!=null){ var mo=MES[m[2]], y=hoy.getFullYear(); var d=new Date(y,mo,+m[1]);
        var dd=/en (\d+) d/.exec(dtx), hh=/hace (\d+) d/.exec(dtx); if(dd){ while((d-hoy)/864e5< +dd[1]-2) d.setFullYear(d.getFullYear()+1); } else if(!hh && d<hoy && (hoy-d)/864e5>200) d.setFullYear(y+1); f=iso(d); }
      var dias=f?diasA(f):null, done=/hech/.test(est)||!!tr.classList.contains('done'), ck=td[6].querySelector('input'), sel=td[5].querySelector('select');
      var R=revDe(tk), v3=(!done&&R&&cubre(R.revisado_hasta,lbl,f));
      L.push({band:band,tk:tk,nm:nm,lbl:lbl,f:f,dias:dias,dtx:dtx,est:est,conf:conf,done:done||v3,v3:v3?R:null,ck:ck,sel:sel,senal:/^Señal/.test(lbl),cola:band===1}); });
    return L; }
  function filasCadencia(){ var h=document.getElementById('cadHost'); if(!h) return {}; var M={};
    [].forEach.call(h.querySelectorAll('.cob-desk tbody tr'),function(tr){ var td=tr.children; if(td.length<6) return; var tk=td[0].textContent.trim().split(/\s+/)[0]; M[tk]={ult:td[1].textContent.trim(),prox:td[2].textContent.trim(),est:td[3].innerHTML,cal:td[4].innerHTML,sen:td[5].innerHTML}; });
    return M; }

  /* ---------- 2. vistas ---------- */
  function item(r){ var cls=r.done?'hecha':(r.senal?'acc':(r.cola?'cola':((r.dias!=null&&r.dias<0)?'venc':((r.dias!=null&&r.dias<=14)?'pronto':'prog'))));
    var st=r.v3?'✓ aprobada '+(r.v3.revisado_fecha?fd(r.v3.revisado_fecha):'')+' (método nuevo)':(r.done?'hecha':(r.senal?'acción ahora':(cls==='venc'?'vencida':(cls==='pronto'?'vence pronto':(r.cola?'en cola':'programada')))));
    var ck=r.ck&&!r.v3?r.ck.outerHTML:'', sel=r.sel?r.sel.outerHTML:'';
    return '<div class="n-cb-it '+cls+'"><div class="ck">'+ck+'</div><div class="f">'+(r.f?fd(r.f):'—')+'<small>'+E(r.v3?'':r.dtx)+'</small></div>'+
      '<div class="e"><b data-ficha="'+E(r.tk)+'">'+E(r.tk)+'</b>'+E(r.nm)+'</div><div class="tp">'+E(r.lbl)+(r.conf?' <span class="cf">conf.</span>':'')+'</div><div class="st">'+(sel||'<span>'+E(st)+'</span>')+'</div></div>'; }
  function vToca(L){ if(!L) return '<div class="n-cb-vacio">Cargando el calendario de cobertura…</div>';
    var ahora=L.filter(function(r){ return !r.done&&r.band===0; }), cola=L.filter(function(r){ return !r.done&&r.band===1; }),
        pronto=L.filter(function(r){ return !r.done&&r.band===2&&r.dias!=null&&r.dias<=14; }), luego=L.filter(function(r){ return !r.done&&r.band===2&&!(r.dias!=null&&r.dias<=14); }),
        hechas=L.filter(function(r){ return r.done; });
    var h='<div class="n-cb-card"><div class="ct">Ahora <span>lo que pide que hagas algo ya</span></div>'+(ahora.length?ahora.map(item).join(''):'<div class="n-cb-vacio">Nada pendiente ahora mismo. 👌</div>')+'</div>';
    if(cola.length) h+='<div class="n-cb-card"><div class="ct">De tu cola <span>pendientes de analizar</span></div>'+cola.map(item).join('')+'</div>';
    h+='<div class="n-cb-card"><div class="ct">Próximos 14 días <span>informes que salen pronto</span></div>'+(pronto.length?pronto.map(item).join(''):'<div class="n-cb-vacio">Nada en las dos próximas semanas.</div>')+'</div>';
    var pm={}; luego.forEach(function(r){ var k=r.f?r.f.slice(0,7):'9999-99'; (pm[k]=pm[k]||[]).push(r); });
    if(luego.length) h+='<div class="n-cb-card"><div class="ct">Más adelante <span>'+luego.length+' programadas, por mes</span></div>'+Object.keys(pm).sort().map(function(k){ var T={}; pm[k].forEach(function(r){ var t=r.lbl.replace(/\s+\S+$/,'')==='Informe'?r.lbl:r.lbl; T[t]=(T[t]||0)+1; });
      return '<details data-ncbm="'+k+'"'+((window._nCobAb||{})[k]?' open':'')+'><summary>'+(k==='9999-99'?'sin fecha':MN[+k.slice(5,7)-1]+' '+k.slice(0,4))+' <span>· '+pm[k].length+' ('+Object.keys(T).map(function(t){ return T[t]+' '+t.toLowerCase(); }).join(', ')+')</span></summary>'+pm[k].map(item).join('')+'</details>'; }).join('')+'</div>';
    if(hechas.length) h+='<div class="n-cb-card"><details data-ncbm="hechas"'+((window._nCobAb||{}).hechas?' open':'')+'><summary>✓ Hechas <span>· '+hechas.length+' (recién publicadas y revisadas)</span></summary>'+hechas.map(item).join('')+'</details></div>';
    return h; }
  function lunes(d){ var x=new Date(d); x.setDate(x.getDate()-((x.getDay()+6)%7)); x.setHours(0,0,0,0); return x; }
  function vRes(){ if(!CAL||!CAL.empresas) return '<div class="n-cb-card"><div class="n-cb-vacio">Todavía no hay calendario en el repositorio (lo sube la recogida de los laborables).</div></div>';
    var t=(CAL.temporadas||[])[0], held=(typeof heldTickerSet==='function')?heldTickerSet():new Set(), ana={}; ((RES&&RES.empresas)||[]).forEach(function(e){ ana[e.ticker]=1; });
    var nom=function(tk){ return (((DB.valores||{})[tk]||{}).nombre||'').replace(/,? (S\.?A\.?|Sociedad An[oó]nima)\b.*$/i,'')||((DB.universo||{})[tk]||{}).nombre||''; };
    var U=[]; Object.keys(CAL.empresas).forEach(function(tk){ var e=(CAL.empresas[tk]||{})[t]; if(!e||(!e.fecha&&e.estado!=='publicado')) return; var g=held.has(tk)?'cartera':(ana[tk]?'analizada':'universo'); U.push({t:tk,e:e,g:g}); });
    var all=U.length, pubAll=U.filter(function(u){ return u.e.estado==='publicado'; }).length;
    var L=U.filter(function(u){ return window._nCobFil==='todo'||u.g!=='universo'; }), hoy=hoyD(), l0=lunes(hoy); if(hoy.getDay()===0) l0.setDate(l0.getDate()+7);
    var G={tarde:[],esta:[],sig:[],mas:[],pub:[]};
    L.forEach(function(u){ var e=u.e; if(e.estado==='publicado'){ if(e.publicado&&(hoy-new Date(e.publicado+'T00:00:00'))/864e5<=7) G.pub.push(u); return; }
      var f=new Date(e.fecha+'T00:00:00'); if(f<hoy) G.tarde.push(u); else if(f<new Date(l0.getTime()+7*864e5)) G.esta.push(u); else if(f<new Date(l0.getTime()+14*864e5)) G.sig.push(u); else G.mas.push(u); });
    function fl(u,q){ var e=u.e, f=e.estado==='publicado'?e.publicado:e.fecha, conf=(e.fuente==='aviso'||e.fuente==='yahoo');
      return '<div class="n-cb-u"><span>'+fd(f)+'</span><b data-ficha="'+E(u.t)+'">'+E(u.t)+'</b><span>'+E(nom(u.t))+' '+(u.g==='cartera'?'<span class="tg c">cartera</span>':u.g==='analizada'?'<span class="tg a">analizada</span>':'')+'</span><span class="x">'+
        (e.estado==='publicado'?'<span class="ok">✓ publicado</span>':(q==='tarde'?'<span class="tarde">se esperaba, aún no</span>':(conf?'<span class="conf">confirmada</span>':'<span class="est">estimada</span>')+(e.momento?' <span class="est">'+E(e.momento)+'</span>':'')))+'</span></div>'; }
    function grp(tit,sub,A,q){ if(!A.length) return ''; A.sort(function(a,b){ var fa=a.e.estado==='publicado'?a.e.publicado:a.e.fecha, fb=b.e.estado==='publicado'?b.e.publicado:b.e.fecha; return fa<fb?-1:fa>fb?1:a.t.localeCompare(b.t); });
      return '<div class="n-cb-grp"><h4>'+tit+' <span>· '+A.length+(sub?' · '+sub:'')+'</span></h4>'+A.map(function(u){ return fl(u,q); }).join('')+'</div>'; }
    var p=L.filter(function(u){ return u.e.estado==='publicado'; }).length, gen=CAL.generado||'';
    return '<div class="n-cb-card"><div class="ct">Temporada '+E(t)+' <span>calendario del '+E(gen.slice(8,10)+'/'+gen.slice(5,7)+' '+gen.slice(11,16))+' · '+p+' de '+L.length+' publicadas</span></div>'+
      '<div class="n-cb-bar"><i style="width:'+(L.length?Math.round(p/L.length*100):0)+'%"></i></div>'+
      '<div class="n-cb-fil"><button data-ncbfil="mias" class="'+(window._nCobFil==='mias'?'on':'')+'">Cartera y analizadas</button><button data-ncbfil="todo" class="'+(window._nCobFil==='todo'?'on':'')+'">Todo el universo ('+all+')</button></div>'+
      grp('⚠️ Ya tocaba y no ha salido','',G.tarde,'tarde')+grp('Esta semana','desde el '+l0.getDate()+'/'+(l0.getMonth()+1),G.esta)+grp('Semana que viene','',G.sig)+grp('Más adelante','',G.mas)+grp('✓ Publicadas en los últimos 7 días','',G.pub)+
      '<div class="n-cb-nota"><span class="conf">confirmada</span> = la empresa lo anunció a la CNMV o Yahoo lo confirma · <span class="est">estimada</span> = misma fecha que el año pasado o por cadencia. Temporada completa: '+pubAll+' de '+all+' empresas del universo.</div></div>'; }
  function proxEst(tk,lbl){ /* fecha estimada del próximo informe por el histórico (+364 días sobre la misma temporada del año pasado) */
    var H=((HIS&&HIS.empresas)||{})[tk]; if(!H) return null; var map={FY:'Anual','9M':'3T',H1:'1S',Q1:'1T'}, k=map[lbl]||lbl; var L=H.filter(function(r){ return r[0].split(' ')[1]===k; }); if(!L.length) return null;
    var d=new Date(L[L.length-1][1]+'T12:00:00'); d.setDate(d.getDate()+364); while(d<hoyD()) d.setDate(d.getDate()+364); return iso(d); }
  function vCad(){ var C=filasCadencia(), E2=((RES&&RES.empresas)||[]); if(!E2.length) return '<div class="n-cb-card"><div class="n-cb-vacio">Cargando la cadencia…</div></div>';
    var rows=E2.map(function(e){ var t=e.ticker, c=C[t]||{}, cd=(typeof _cadenciaDe==='function')?_cadenciaDe(t):null, nx=cd&&cd.next, lbl=nx?((typeof _QLABEL!=='undefined'&&_QLABEL[nx.q])||nx.q):(c.prox||''), f=nx&&nx.date?iso(nx.date instanceof Date?nx.date:new Date(nx.date)):null, est=false;
      /* si el método nuevo ya revisó ese periodo, el próximo es el siguiente */
      if(f&&cubre(e.revisado_hasta,'Informe '+lbl,f)){ var sig={Q1:'H1',H1:'9M','9M':'FY',FY:'Q1'}[lbl]||'FY'; lbl=sig; f=proxEst(t,sig); est=true; c=Object.assign({},c,{est:'al día'}); }
      return {t:t,rev:e.revisado_hasta,rf:e.revisado_fecha,lbl:lbl,f:f,d:f?diasA(f):null,est:est,c:c}; }).sort(function(a,b){ return (a.f||'9999')<(b.f||'9999')?-1:1; });
    function per(p){ var m=/^(20\d\d)-(\w+)$/.exec(p||''); return m?m[2].replace('S1','1S')+' '+m[1]:(p||'—'); }
    return '<div class="n-cb-card"><div class="ct">Cadencia de las analizadas <span>'+rows.length+' empresas · ordenadas por el próximo informe</span></div><div class="n-cb-tw"><table class="n-cb-t"><thead><tr><th>Empresa</th><th>Último analizado</th><th>Próximo informe</th><th>Estado</th><th>Calibración</th><th>Señal</th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr><td><b data-ficha="'+E(r.t)+'">'+E(r.t)+'</b></td><td>'+E(per(r.rev))+(r.rf?'<small>aprobado el '+fd(r.rf)+'</small>':'')+'</td>'+
        '<td>'+E(r.lbl||'—')+(r.f?' · <b>'+fd(r.f)+'</b><small class="'+(r.d!=null&&r.d<=14?'pr':'')+'">'+(r.d<0?'hace '+(-r.d)+' días':'en '+r.d+' días')+(r.est?' · estimada':'')+'</small>':'')+'</td>'+
        '<td>'+(r.c.est||'')+'</td><td>'+(r.c.cal||'')+'</td><td>'+(r.c.sen||'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<div class="n-cb-nota">«Último analizado»: la revisión aprobada más reciente del método nuevo. «Próximo informe»: la fecha prevista de publicación (estimada = misma temporada del año pasado).</div></div>'; }

  /* ---------- 3. montaje ---------- */
  var TABS=[['toca','⚡ Qué toca'],['res','📅 Resultados del universo'],['cad','🔁 Cadencia'],['cola','🗂️ Cola'],['nov','📥 Novedades']];
  function kpis(L){ var k=document.getElementById('nCobK'); if(!k||typeof nKpi!=='function') return;
    var ahora=(L||[]).filter(function(r){ return !r.done&&r.band===0; }), venc=ahora.filter(function(r){ return !r.senal; }).length, sen=ahora.filter(function(r){ return r.senal; }).length;
    var pr=(L||[]).filter(function(r){ return !r.done&&r.band===2&&r.dias!=null&&r.dias<=14; });
    var t=CAL&&(CAL.temporadas||[])[0], U=[]; if(CAL&&CAL.empresas) Object.keys(CAL.empresas).forEach(function(tk){ var e=(CAL.empresas[tk]||{})[t]; if(e&&(e.fecha||e.estado==='publicado')) U.push(e); });
    var pub=U.filter(function(e){ return e.estado==='publicado'; }).length, nAna=((RES&&RES.empresas)||[]).length, nUni=Object.keys(DB.universo||{}).length, nCola=(DB.cola||[]).filter(function(c){ return typeof _colaViva!=='function'||_colaViva(c); }).length;
    k.innerHTML=nKpi({c:ahora.length?'#DC2626':'#16A34A',bg:ahora.length?'#FEE2E2':'#DCFCE7',ic:'⚡',t:'Requieren acción',v:L?String(ahora.length):'…',vCls:ahora.length?'n-neg':'n-pos',s:L?(venc+(venc===1?' informe vencido':' informes vencidos')+' · '+sen+(sen===1?' señal':' señales')):'cargando'})+
      nKpi({c:'#D97706',bg:'#FEF3C7',ic:'🗓️',t:'Próximos 14 días',v:L?String(pr.length):'…',s:pr.slice(0,3).map(function(r){ return r.tk; }).join(', ')+(pr.length>3?'…':'')||'nada en dos semanas'})+
      nKpi({c:'#15803D',bg:'#DCFCE7',ic:'📊',t:'Temporada '+(t||''),v:U.length?(pub+' de '+U.length):'—',vCls:'n-pos',s:'empresas del universo ya han publicado'+(U.length?'<span class="n-cb-bar sm"><i style="width:'+Math.round(pub/U.length*100)+'%"></i></span>':'')})+
      nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'🏢',t:'Analizadas',v:nAna+' de '+nUni,s:'del universo · '+nCola+' en cola'}); }
  function montar(){ var V=document.getElementById('view-cobertura'); if(!V) return null;
    var P=document.getElementById('nCobPanes');
    if(!P){ var kp=V.querySelector('.cob-k'); if(kp) kp.style.display='none';
      var hero=V.querySelector('.vhero'); if(hero){ var p=hero.querySelector('p'); if(p) p.textContent='Qué toca analizar o revisar, cuándo publican resultados tus empresas y cómo va la temporada.'; }
      var w=document.createElement('div'); w.innerHTML='<div id="nCobK" class="n-ctrl"></div><div class="n-seg n-cb-seg" id="nCobSeg"></div><div id="nCobPanes">'+TABS.map(function(t){ return '<div class="n-cb-pane" data-ncbp="'+t[0]+'"></div>'; }).join('')+'</div>';
      var ref=kp||(hero&&hero.nextSibling); if(kp) kp.after(w); else V.insertBefore(w,V.children[1]||null);
      while(w.firstChild) w.parentNode.insertBefore(w.firstChild,w); w.remove(); P=document.getElementById('nCobPanes');
      var pv=function(k){ return P.querySelector('[data-ncbp="'+k+'"]'); };
      pv('toca').innerHTML='<div class="n-cb-own"></div>'; pv('res').innerHTML='<div class="n-cb-own"></div>'; pv('cad').innerHTML='<div class="n-cb-own"></div>';
      /* las piezas de siempre pasan a su pestaña (ocultas las que repinto yo) */
      var bc=V.querySelector('[data-cblk="cal"]'), bq=V.querySelector('[data-cblk="cola"]'), bd=V.querySelector('[data-cblk="cad"]');
      if(bc){ pv('toca').appendChild(bc); bc.classList.add('n-cb-src'); }
      if(bd){ pv('cad').appendChild(bd); bd.classList.add('n-cb-src'); }
      if(bq){ pv('cola').appendChild(bq); bq.classList.add('open','n-cb-abierto'); } }
    /* calendario del universo + histórico + novedades (llegan después) */
    var sv=document.getElementById('sv3cob');
    if(sv&&!sv._ncb){ var hs=[].slice.call(sv.querySelectorAll('.sv3-h3')), hc=hs.filter(function(x){ return /Calendario de resultados/.test(x.textContent); })[0], hn=hs.filter(function(x){ return /Novedades/.test(x.textContent); })[0];
      if(hn){ sv._ncb=1; var res=P.querySelector('[data-ncbp="res"]'), nov=P.querySelector('[data-ncbp="nov"]');
        if(hc){ var n=hc; while(n&&n!==hn){ var nx=n.nextElementSibling; if(n.id==='nHrBox') res.appendChild(n); else n.classList.add('n-cb-src'); n=nx; } }
        var m=hn; while(m){ var mx=m.nextElementSibling; nov.appendChild(m); m=mx; } } }
    var hb=document.getElementById('nHrBox'); if(hb&&hb.parentNode&&!hb.closest('[data-ncbp="res"]')) P.querySelector('[data-ncbp="res"]').appendChild(hb);
    return P; }
  function pintar(){ var P=montar(); if(!P) return;
    var L=filasCalendario();
    P.querySelector('[data-ncbp="toca"] .n-cb-own').innerHTML=vToca(L);
    P.querySelector('[data-ncbp="res"] .n-cb-own').innerHTML=vRes();
    P.querySelector('[data-ncbp="cad"] .n-cb-own').innerHTML=vCad();
    kpis(L);
    var nCola=(DB.cola||[]).filter(function(c){ return typeof _colaViva!=='function'||_colaViva(c); }).length;
    document.getElementById('nCobSeg').innerHTML=TABS.map(function(t){ return '<button data-ncbt="'+t[0]+'" class="'+(window._nCobTab===t[0]?'on':'')+'">'+t[1]+(t[0]==='cola'&&nCola?' <em>'+nCola+'</em>':'')+'</button>'; }).join('');
    [].forEach.call(P.querySelectorAll('.n-cb-pane'),function(p){ p.style.display=p.getAttribute('data-ncbp')===window._nCobTab?'':'none'; }); }
  var tm=null; function luego(){ clearTimeout(tm); tm=setTimeout(function(){ try{ pintar(); }catch(e){ console.warn('[n-cobertura]',e); } },60); }
  var o=window.renderCobertura; window.renderCobertura=function(){ var r=o.apply(this,arguments); cargar().then(luego); luego(); var n=0, iv=setInterval(function(){ n++; luego(); if(n>12||(document.getElementById('sv3cob')||{})._ncb) clearInterval(iv); },500); return r; };
  ['_pintarCalendario','_pintarCadencia'].forEach(function(fn){ if(typeof window[fn]==='function'){ var f0=window[fn]; window[fn]=function(){ var r=f0.apply(this,arguments); luego(); return r; }; } });
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-ncbt]'); if(b){ window._nCobTab=b.getAttribute('data-ncbt'); luego(); return; }
    var f=e.target.closest&&e.target.closest('[data-ncbfil]'); if(f){ window._nCobFil=f.getAttribute('data-ncbfil'); luego(); return; } });
  document.addEventListener('toggle',function(e){ var d=e.target; if(d&&d.getAttribute&&d.getAttribute('data-ncbm')){ window._nCobAb=window._nCobAb||{}; window._nCobAb[d.getAttribute('data-ncbm')]=d.open; } },true);
  var st=document.createElement('style'); st.textContent=
    '#view-cobertura #nCobK{margin:0 0 14px}#view-cobertura .n-cb-src{display:none!important}'+
    '.n-cb-seg{display:inline-flex;flex-wrap:wrap;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:3px;gap:2px;margin:0 0 12px}.n-cb-seg button{border:0;background:transparent;padding:8px 14px;border-radius:9px;font:inherit;font-size:13.5px;font-weight:700;color:#475569;cursor:pointer}.n-cb-seg button.on{background:#1F4A9A;color:#fff}.n-cb-seg em{font-style:normal;background:#FEF3C7;color:#92400E;border-radius:999px;padding:0 6px;font-size:11px;margin-left:3px}'+
    '.n-cb-card{background:#fff;border:1px solid #E5E9EF;border-radius:14px;padding:14px 16px;box-shadow:0 1px 3px rgba(20,34,49,.06);margin-bottom:12px}'+
    '.n-cb-card .ct{font-weight:800;font-size:15px;display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.n-cb-card .ct span{font-weight:500;color:#64748B;font-size:12.5px}'+
    '.n-cb-it{display:grid;grid-template-columns:24px 100px 1fr 170px 190px;gap:10px;align-items:center;padding:8px 10px;border:1px solid #EEF2F7;border-left:4px solid var(--c,#1F4A9A);border-radius:10px;margin-top:6px;background:#fff}'+
    '.n-cb-it .f{font-weight:700;font-size:13px}.n-cb-it .f small{display:block;font-weight:500;color:#64748B;font-size:11.5px}.n-cb-it .e b{color:#1F4A9A;font-weight:800;margin-right:6px;cursor:pointer}.n-cb-it .tp{font-size:12.5px;color:#334155}.n-cb-it .cf{background:#DCFCE7;color:#166534;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700}'+
    '.n-cb-it .st{justify-self:end;text-align:right}.n-cb-it .st span{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;background:var(--bg,#EAF1FD);color:var(--c,#1F4A9A);display:inline-block}.n-cb-it .ck input{width:17px;height:17px;cursor:pointer}'+
    '.n-cb-it.venc{--c:#DC2626;--bg:#FEE2E2}.n-cb-it.acc{--c:#7C3AED;--bg:#EDE9FE}.n-cb-it.pronto{--c:#D97706;--bg:#FEF3C7}.n-cb-it.hecha{--c:#16A34A;--bg:#DCFCE7;opacity:.75}.n-cb-it.prog{--c:#1F4A9A;--bg:#EAF1FD}.n-cb-it.cola{--c:#0F766E;--bg:#CCFBF1}'+
    '.n-cb-card details{margin-top:8px}.n-cb-card summary{cursor:pointer;font-weight:700;color:#334155;padding:6px 2px}.n-cb-card summary span{font-weight:500;color:#64748B}'+
    '.n-cb-vacio{color:#64748B;padding:14px;border:1px dashed #CBD5E1;border-radius:10px;text-align:center;margin-top:8px}'+
    '.n-cb-bar{display:block;height:9px;background:#E2E8F0;border-radius:5px;overflow:hidden;margin:8px 0 4px}.n-cb-bar.sm{height:7px;margin:6px 0 0}.n-cb-bar i{display:block;height:100%;background:#16A34A}'+
    '.n-cb-fil{display:flex;gap:6px;margin:8px 0 4px;flex-wrap:wrap}.n-cb-fil button{border:1px solid #CBD5E1;background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer}.n-cb-fil button.on{background:#1E293B;color:#fff;border-color:#1E293B}'+
    '.n-cb-grp{margin-top:10px}.n-cb-grp h4{margin:0 0 4px;font-size:13px;color:#334155}.n-cb-grp h4 span{font-weight:500;color:#64748B}'+
    '.n-cb-u{display:grid;grid-template-columns:90px 64px 1fr 190px;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:13px}.n-cb-u b{color:#1F4A9A;cursor:pointer}.n-cb-u .x{text-align:right}'+
    '.n-cb-u .tg{font-size:10.5px;font-weight:700;border-radius:999px;padding:1px 7px}.n-cb-u .tg.c{background:#DCFCE7;color:#166534}.n-cb-u .tg.a{background:#E0E7FF;color:#3730A3}'+
    '#view-cobertura .ok{color:#15803D;font-weight:700}#view-cobertura .est{color:#94A3B8}#view-cobertura .conf{color:#1F4A9A;font-weight:700}#view-cobertura .tarde{color:#B45309;font-weight:700}'+
    '.n-cb-nota{font-size:11.5px;color:#64748B;margin-top:10px;line-height:1.45}.n-cb-tw{overflow-x:auto}'+
    'table.n-cb-t{width:100%;border-collapse:collapse;font-size:13px}table.n-cb-t th{font-size:11px;text-transform:uppercase;color:#64748B;text-align:left;padding:7px 8px;border-bottom:1px solid #E2E8F0;white-space:nowrap}table.n-cb-t td{padding:7px 8px;border-bottom:1px solid #F1F5F9;vertical-align:top}table.n-cb-t b{color:#1F4A9A;cursor:pointer}table.n-cb-t small{display:block;color:#64748B;font-size:11px}table.n-cb-t small.pr{color:#B45309}'+
    '#view-cobertura .n-cb-abierto{border:0!important;box-shadow:none!important;background:transparent!important}#view-cobertura .n-cb-abierto>.cob-blk-h{display:none!important}#view-cobertura .n-cb-abierto>.cob-blk-b{display:block!important}'+
    '@media(max-width:800px){.n-cb-it{grid-template-columns:22px 1fr}.n-cb-it .f,.n-cb-it .e,.n-cb-it .tp,.n-cb-it .st{grid-column:2;justify-self:start;text-align:left}.n-cb-u{grid-template-columns:70px 1fr}.n-cb-u .x{grid-column:2;text-align:left}}';
  document.head.appendChild(st);
})();
