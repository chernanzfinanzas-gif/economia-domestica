/* APP NUEVA · EMPRESAS → UNIVERSO (boceto «Universo - boceto 29-oct v16», Carlos: «con eso queda perfecto Universo»).
   Una sola tabla Universo + Radar: Empresa · grupo · Puntos · Etiquetas · ★ · Ventas · Benef. · ROE · Deuda · PER · RPD · Cap. · Avisos.
   Ordenable; quién sube y baja; tarjetas por grupo (filtran); BME Growth con su termómetro del salto; pinchar fila → detalle
   (a qué se dedica, su historia desde 2015, puntos, etiquetas con su regla, cuentas, bolsa, avisos, «Abrir ficha»).
   Datos: universo/informe.json (el informe del método, el de siempre) + universo/historia.json (descripción y series). */
(function(){
  var I=null, H={}, F={q:'',seg:'',mod:'',grp:'',est:''}, S={c:null,d:-1}, abierto=null;
  var GC={'Otras generales':'#475569','Industrial con cartera de pedidos':'#7C3AED','Materias primas o cíclica':'#C2410C','Consumo de marca':'#B45309','Regulada, concesional y redes':'#0284C7','Financieras':'#1F4A9A','Promoción inmobiliaria':'#DB2777','Farma':'#0D9488','Inmobiliaria patrimonialista':'#9333EA','Generación renovable':'#16A34A'};
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function N(v,d){ return v==null||isNaN(v)?'—':(+v).toLocaleString('es-ES',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d}); }
  function P(v,d){ return v==null||isNaN(v)?'—':N(v*100,d==null?1:d)+' %'; }
  function Mi(v){ if(v==null||isNaN(v)) return '—'; return N(v,Math.abs(v)>=100?0:1); }
  function X(v){ return v==null?'—':N(v,1)+'x'; }
  function held(){ try{ return (typeof heldTickerSet==='function')?heldTickerSet():new Set(); }catch(e){ return new Set(); } }
  function enCola(t){ return ((DB&&DB.cola)||[]).some(function(c){ return String(c.t||'').toUpperCase()===t; }); }
  function todas(){ return (I.continuo||[]).map(function(e){ e._seg='Continuo'; return e; }).concat((I.growth||[]).map(function(e){ e._seg='BME Growth'; return e; })); }
  function est(e,Hs){ return Hs.has(String(e.ticker||'').toUpperCase())?'cartera':(e.estado==='analizada'?'analizada':(e._seg==='BME Growth'?'growth':'universo')); }
  function cargar(){ if(I) return Promise.resolve();
    var g=function(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); };
    return Promise.all([g('universo/informe.json'),g('universo/historia.json')]).then(function(a){ I=a[0]; H=a[1]||{}; }); }

  function cls(k,v,e){ if(v==null) return '';
    if(k==='roe') return v>=0.15?'vg':(v>=0.08?'va':'vr');
    if(k==='deuda') return (e.deuda_neta!=null&&e.deuda_neta<0)?'vg':(v<=1.5?'vg':(v<=3?'va':'vr'));
    if(k==='per') return v<=0?'':(v<12?'vg':(v<=20?'':'va'));
    return ''; }
  function fila(e,Hs){
    var t=e.ticker, st=est(e,Hs), p=e.puntos||{}, gc=GC[e.grupo_comp]||'#475569', cp=e.cambio_puesto;
    var deuda=(e.modelo==='INM')?(e.ltv!=null?P(e.ltv,0)+' LTV':'—'):(e.deuda_neta!=null&&e.deuda_neta<0?'caja':(e.dn_ebitda!=null?X(e.dn_ebitda):'—'));
    var pc=p.total!=null?(p.total>=75?'#15803D':(p.total>=55?'#B45309':'#B91C1C')):'#94A3B8';
    var bar=function(v,c){ return '<i><span style="width:'+Math.max(0,Math.min(100,v||0))+'%;background:'+c+'"></span></i>'; };
    var mov=(cp==null||cp===0)?'':(cp>0?' <span class="sv3-up" title="puestos que sube en la semana">▲'+cp+'</span>':' <span class="sv3-dn" title="puestos que baja en la semana">▼'+(-cp)+'</span>');
    var ptsCell=e._seg==='BME Growth'
      ? '<td data-v="'+(p.total!=null?p.total:-1)+'"><div class="ptb"><b style="color:'+pc+'">'+(p.total!=null?N(p.total):'—')+'</b><div class="slt">salto '+(e.salto_n!=null?e.salto_n+'/5':'—')+'</div></div></td>'
      : '<td data-v="'+(p.total!=null?p.total:-1)+'"><div class="ptb" title="dividendo '+N(p.dividendo,0)+' · calidad '+N(p.calidad,0)+' · valoración '+N(p.valoracion,0)+'"><b style="color:'+pc+'">'+(p.total!=null?N(p.total):'—')+'</b><div class="bs">'+bar(p.dividendo,'#16A34A')+bar(p.calidad,'#2563EB')+bar(p.valoracion,'#D97706')+'</div>'+(e.puesto?'<div class="rkc">nº '+e.puesto+mov+'</div>':'')+'</div></td>';
    var chip=st==='cartera'?'<span class="sv3-st c">cartera</span>':(st==='analizada'?'<span class="sv3-st a">analizada</span>':(st==='growth'?' <span class="sv3-mo">Growth</span>':''));
    return '<tr class="r'+(st==='cartera'?' hc':(st==='analizada'?' ha':''))+(abierto===t?' op':'')+'" data-nuni="'+esc(t)+'">'+
      '<td class="l e" data-v="'+esc(e.empresa)+'"><span class="tkb" style="background:'+gc+'">'+esc(t)+'</span><b>'+esc(t)+'</b> '+esc(e.empresa)+chip+'<small>'+esc(e.descripcion||'')+'</small>'+
        '<div class="sub2l"><span class="gp" style="background:'+gc+'1A;color:'+gc+'">'+esc(e.grupo_comp||'—')+'</span> <span class="md">'+esc(e.modelo||'')+'</span>'+(e.modulos||[]).map(function(m){ return '<span class="md">'+esc(m)+'</span>'; }).join('')+(e.puesto_grupo?'<span class="md">puesto '+e.puesto_grupo+'/'+e.n_grupo+' del grupo</span>':'')+'</div></td>'+
      ptsCell+
      '<td class="ctr" data-v="'+esc((e.etiquetas||[]).join(','))+'">'+(e.etiquetas||[]).map(function(x){ return '<span class="et '+esc(x)+'">'+esc(x)+'</span>'; }).join('')+'</td>'+
      '<td class="nm" data-v="'+(enCola(t)?1:0)+'"><span class="star'+(enCola(t)?' on':'')+'" data-nustar="'+esc(t)+'">'+(enCola(t)?'★':'☆')+'</span></td>'+
      '<td class="nm" data-v="'+(e.ingresos==null?'':e.ingresos)+'">'+Mi(e.ingresos)+(e.moneda&&e.moneda!=='EUR'?' <small>'+esc(e.moneda)+'</small>':'')+(e._seg==='BME Growth'&&e.cagr_ing!=null?'<small class="crv">crec. '+P(e.cagr_ing)+'</small>':'')+'</td>'+
      '<td class="nm" data-v="'+(e.beneficio==null?'':e.beneficio)+'">'+Mi(e.beneficio)+'</td>'+
      '<td class="nm" data-v="'+(e.roe==null?'':e.roe)+'"><span class="'+cls('roe',e.roe,e)+'">'+P(e.roe)+'</span>'+(e.roe_med5!=null?'<small title="Mediana del ROE de los últimos 5 años">'+P(e.roe_med5,0)+' en 5 años</small>':'')+'</td>'+
      '<td class="nm '+(e.modelo==='INM'?'':cls('deuda',e.dn_ebitda,e))+'" data-v="'+(e.deuda_neta!=null&&e.deuda_neta<0?-1:(e.dn_ebitda==null?'':e.dn_ebitda))+'">'+deuda+'</td>'+
      '<td class="nm '+cls('per',e.per,e)+'" data-v="'+(e.per!=null&&e.per>0?e.per:'')+'">'+(e.per!=null&&e.per>0?N(e.per):'—')+'</td>'+
      '<td class="nm" data-v="'+(e.rpd==null?'':e.rpd)+'">'+P(e.rpd)+'</td>'+
      '<td class="nm" data-v="'+(e.cap==null?'':e.cap)+'">'+Mi(e.cap)+'</td>'+
      '<td class="nm" data-v="'+(e.avisos||[]).length+'">'+((e.avisos||[]).length?'<span class="sv3-av" title="'+esc((e.avisos||[]).join(' · '))+'">'+(e.avisos||[]).length+'</span>':'')+'</td></tr>'+
      (abierto===t?'<tr class="det"><td colspan="12">'+detalle(t)+'</td></tr>':'');
  }
  function valor(e,c){ /* para ordenar */
    var p=e.puntos||{}; switch(c){ case 0: return (e.empresa||'').toLowerCase(); case 1: return p.total; case 2: return (e.etiquetas||[]).join(','); case 3: return enCola(e.ticker)?1:0;
      case 4: return e.ingresos; case 5: return e.beneficio; case 6: return e.roe; case 7: return (e.deuda_neta!=null&&e.deuda_neta<0)?-1:e.dn_ebitda; case 8: return e.per>0?e.per:null; case 9: return e.rpd; case 10: return e.cap; case 11: return (e.avisos||[]).length; } return null; }
  function lista(){
    var Hs=held(), q=F.q.toLowerCase();
    var L=todas().filter(function(e){ if(F.seg&&e._seg!==F.seg) return false; if(F.mod&&e.modelo!==F.mod) return false; if(F.grp&&e.grupo_comp!==F.grp) return false;
      var s=est(e,Hs); if(F.est&&(F.est==='universo'?(s!=='universo'&&s!=='growth'):s!==F.est)) return false;
      if(q&&((e.ticker||'')+' '+(e.empresa||'')+' '+(e.descripcion||'')).toLowerCase().indexOf(q)<0) return false; return true; });
    if(S.c!=null){ L.sort(function(a,b){ var x=valor(a,S.c), y=valor(b,S.c); if(x===y) return 0; if(x==null) return 1; if(y==null) return -1; return (x>y?1:-1)*S.d; }); }
    else L.sort(function(a,b){ return (a.puesto||999)-(b.puesto||999)||String(a.empresa).localeCompare(String(b.empresa),'es'); });
    return L;
  }
  function filas(){ var B=document.getElementById('nuB'); if(!B) return; var Hs=held(), L=lista();
    B.innerHTML=L.map(function(e){ return fila(e,Hs); }).join('')||'<tr><td colspan="12" class="l">Ninguna empresa con esos filtros.</td></tr>';
    var n=document.getElementById('nuN'); if(n) n.textContent=L.length+' de '+todas().length;
    [].forEach.call(document.querySelectorAll('#nuT th.so'),function(th,i){ var a=th.querySelector('.ar'); if(a) a.textContent=S.c===i?(S.d>0?'▲':'▼'):''; });
    [].forEach.call(document.querySelectorAll('.gs'),function(c){ c.classList.toggle('sel',F.grp===c.getAttribute('data-nugrp')); });
    var gb=document.getElementById('nuGrowth'); if(gb) gb.style.display=F.seg==='BME Growth'?'block':'none';
  }
  function pintar(){
    var v=document.getElementById('view-unin'); if(!v) return;
    if(!I){ v.innerHTML='<div class="nf-mu" style="padding:20px">Cargando el universo…</div>'; cargar().then(function(){ if(I) pintar(); else v.innerHTML='<div class="nf-card">No se pudo leer universo/informe.json.</div>'; }); return; }
    var Hs=held(), T=todas(), nA=T.filter(function(e){ return e.estado==='analizada'; }).length, nC=T.filter(function(e){ return Hs.has(String(e.ticker).toUpperCase()); }).length;
    var C=(I.continuo||[]).filter(function(e){ return e.cambio_puntos!=null; }).slice();
    var sub=C.slice().sort(function(a,b){ return b.cambio_puntos-a.cambio_puntos; }).filter(function(e){ return e.cambio_puntos>0; }).slice(0,5);
    var baj=C.slice().sort(function(a,b){ return a.cambio_puntos-b.cambio_puntos; }).filter(function(e){ return e.cambio_puntos<0; }).slice(0,5);
    var mv=function(e){ return '<div>'+esc(e.ticker)+' '+esc(e.empresa)+' <span class="'+(e.cambio_puntos>0?'sv3-up':'sv3-dn')+'">'+(e.cambio_puntos>0?'+':'')+N(e.cambio_puntos)+'</span> → '+N((e.puntos||{}).total)+'</div>'; };
    var G={}; T.forEach(function(e){ var g=e.grupo_comp; if(!g||e._seg!=='Continuo') return; G[g]=G[g]||{n:0,a:0}; G[g].n++; if(e.estado==='analizada'||Hs.has(String(e.ticker).toUpperCase())) G[g].a++; });
    var GK=Object.keys(G).sort(function(a,b){ return G[b].n-G[a].n; }), mx=Math.max.apply(null,GK.map(function(g){ return G[g].n; }).concat([1]));
    var grupos=Object.keys(I.grupos||{}).sort();
    var opt=function(v,t,c){ return '<option value="'+esc(v)+'"'+(c===v?' selected':'')+'>'+esc(t)+'</option>'; };
    var fe=String(I.generado||''); fe=fe?fe.slice(8,10)+'-'+fe.slice(5,7)+' '+fe.slice(11,16):'—';
    var growth=(I.growth||[]).slice().sort(function(a,b){ return (b.salto_n||0)-(a.salto_n||0)||((b.puntos||{}).total||0)-((a.puntos||{}).total||0); });
    var SAL=I.salto||[];
    var gtab='<div id="nuGrowth" class="nf-card" style="display:none"><h2>Candidatas al salto (BME Growth) <span class="nf-sub">termómetro de 5 condiciones para pasar al Continuo · hipótesis aún sin probar con casos pasados</span></h2><div class="nf-tw"><table class="nf-t"><tr><th>Empresa</th><th>Salto</th><th>Puntos</th><th>Ventas</th><th>Benef.</th><th>ROE</th><th>PER</th><th>Crec. ventas</th><th>⚠</th></tr>'+
      growth.map(function(e){ return '<tr data-nuni="'+esc(e.ticker)+'" style="cursor:pointer"><td><b>'+esc(e.ticker)+'</b> '+esc(e.empresa)+'<br><small>'+esc(e.descripcion||'')+'</small></td><td><span class="sv3-salto">'+SAL.map(function(s){ return '<i class="'+((e.salto||{})[s[0]]?'ok':'')+'" title="'+esc(s[1])+'"></i>'; }).join('')+'</span> <b>'+(e.salto_n!=null?e.salto_n+'/5':'—')+'</b></td><td>'+N((e.puntos||{}).total)+'</td><td>'+Mi(e.ingresos)+'</td><td>'+Mi(e.beneficio)+'</td><td>'+P(e.roe)+'</td><td>'+(e.per>0?N(e.per):'—')+'</td><td>'+P(e.cagr_ing)+'</td><td>'+((e.avisos||[]).length||'')+'</td></tr>'; }).join('')+'</table></div></div>';
    v.innerHTML='<div class="na-hero"><h1>Universo</h1><p>Todas las empresas que vigilamos (Continuo y BME Growth) en una sola tabla: sus cuentas y los puntos del Radar, para elegir qué analizar.</p>'+
      '<div class="na-kp nu-kp"><div>Mercado Continuo<b>'+(I.continuo||[]).length+'</b></div><div>BME Growth<b>'+(I.growth||[]).length+'</b></div><div>Analizadas<b>'+nA+'</b></div><div>En cartera<b>'+nC+'</b></div><div>Datos del<b style="font-size:16px">'+esc(fe)+'</b></div><div><a href="universo/" target="_blank" rel="noopener" style="color:#fff;font-weight:800">📊 Informe del universo ↗</a></div></div></div>'+
      '<div class="nf-card"><div class="nu-f"><input type="search" placeholder="Buscar empresa o ticker…" data-nuf="q" value="'+esc(F.q)+'">'+
        '<select data-nuf="seg">'+opt('','Continuo y Growth',F.seg)+opt('Continuo','Solo Continuo',F.seg)+opt('BME Growth','Solo BME Growth',F.seg)+'</select>'+
        '<select data-nuf="mod">'+opt('','Todos los modelos',F.mod)+opt('GEN','GEN · general',F.mod)+opt('BAN','BAN · banca',F.mod)+opt('SEG','SEG · seguros',F.mod)+opt('INM','INM · inmobiliaria',F.mod)+'</select>'+
        '<select data-nuf="grp">'+opt('','Todos los grupos',F.grp)+grupos.map(function(g){ return opt(g,g,F.grp); }).join('')+'</select>'+
        '<select data-nuf="est">'+opt('','Todas',F.est)+opt('cartera','En cartera',F.est)+opt('analizada','Analizadas',F.est)+opt('universo','Sin analizar',F.est)+'</select><span class="nf-mu" id="nuN"></span></div>'+
      '<div class="nu-mvs"><div><b>⬆ Suben esta semana</b>'+(I.movimientos_desde?' <span class="nf-mu">desde el '+esc(String(I.movimientos_desde).slice(8,10)+'-'+String(I.movimientos_desde).slice(5,7))+'</span>':'')+sub.map(mv).join('')+'</div><div><b>⬇ Bajan esta semana</b>'+baj.map(mv).join('')+'</div></div>'+
      '<h3 class="nu-h3">Empresas por grupo</h3><div class="gsum">'+GK.map(function(g){ return '<div class="gs" data-nugrp="'+esc(g)+'" style="--g:'+(GC[g]||'#475569')+'"><span>'+esc(g)+'</span><b>'+G[g].n+'</b><span>'+G[g].a+' analizadas o en cartera</span><div class="bar"><i style="width:'+Math.round(G[g].n/mx*100)+'%"></i></div></div>'; }).join('')+'</div></div>'+
      gtab+
      '<div class="nf-tw"><table id="nuT" class="nu-t"><thead><tr><th class="l so">Empresa · grupo<span class="ar"></span></th><th class="so">Puntos<span class="ar"></span></th><th class="so ctr">Etiquetas<span class="ar"></span></th><th class="so">★<span class="ar"></span></th><th class="so" title="Ventas del último ejercicio, M€ (en banca, margen de intereses)">Ventas<span class="ar"></span></th><th class="so" title="Beneficio atribuido, M€">Benef.<span class="ar"></span></th><th class="so" title="ROE último año (mediana 5 años)">ROE<span class="ar"></span></th><th class="so" title="Deuda neta / EBITDA (GEN) o deuda / activo (INM)">Deuda<span class="ar"></span></th><th class="so">PER<span class="ar"></span></th><th class="so" title="Rentabilidad por dividendo, 12 meses">RPD<span class="ar"></span></th><th class="so" title="Capitalización, M€">Cap.<span class="ar"></span></th><th class="so" title="Avisos del cálculo">Avisos<span class="ar"></span></th></tr></thead><tbody id="nuB"></tbody></table></div>';
    filas();
  }

  /* ---------- detalle de una empresa (el del boceto) ---------- */
  var EXPL={'acciones sin contraste':'El número de acciones sale de una sola fuente y no se ha podido contrastar con otra: la capitalización, el PER y la RPD pueden tener error.',
    'EBITDA negativo':'La explotación pierde dinero incluso antes de amortizaciones. Deuda/EBITDA no tiene sentido y la empresa entra en «Riesgo».',
    'acciones a revisar: la CNMV no casa con Yahoo':'Dos fuentes dan un número de acciones distinto. Hasta revisarlo, capitalización y ratios de precio pueden estar mal.',
    'sin número de acciones: no hay capitalización ni ratios de precio':'Sin acciones no se puede calcular el valor en bolsa: PER, P/VC y RPD quedan en blanco y la valoración no puntúa.'};
  function kv(a,b){ return '<div class="kv"><span>'+a+'</span><b>'+b+'</b></div>'; }
  function hist(tk,r){ var h=H[tk]; if(!h) return {d:'',c:''};
    var d=h.a?'<div class="dt-desc"><b>A qué se dedica:</b> '+esc(h.a)+(h.mo?'<small>Cómo la clasifica el método: '+esc(h.mo)+'</small>':'')+'</div>':'';
    var s=(h.s||[]).filter(function(x){ return x[1]!=null||x[2]!=null; }), c='';
    if(s.length>=2){ var W=560,Hh=170,L=44,B=22,T=10,n=s.length,bw=(W-L-8)/n, vals=[]; s.forEach(function(x){ vals.push(x[1]||0,x[2]||0); });
      var mx=Math.max.apply(null,vals.concat([0])), mn=Math.min.apply(null,vals.concat([0])), y=function(v){ return T+(mx-v)/((mx-mn)||1)*(Hh-T-B); };
      var g='<svg viewBox="0 0 '+W+' '+Hh+'">'; [mx,(mx+mn)/2,mn].forEach(function(v){ g+='<line x1="'+L+'" x2="'+W+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#EEF2F7"/><text x="'+(L-6)+'" y="'+(y(v)+4)+'" font-size="10" text-anchor="end" fill="#94A3B8">'+Math.round(v).toLocaleString('es-ES')+'</text>'; });
      g+='<line x1="'+L+'" x2="'+W+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="#94A3B8"/>';
      s.forEach(function(x,i){ var x0=L+i*bw+bw*0.12, w=bw*0.36;
        if(x[1]!=null) g+='<rect x="'+x0+'" y="'+Math.min(y(x[1]),y(0))+'" width="'+w+'" height="'+Math.abs(y(x[1])-y(0))+'" fill="#93B4E6" rx="2"><title>'+x[0]+' ventas '+x[1].toLocaleString('es-ES')+' M</title></rect>';
        if(x[2]!=null) g+='<rect x="'+(x0+w+2)+'" y="'+Math.min(y(x[2]),y(0))+'" width="'+w+'" height="'+Math.max(1,Math.abs(y(x[2])-y(0)))+'" fill="'+(x[2]<0?'#DC2626':'#15803D')+'" rx="2"><title>'+x[0]+' beneficio '+x[2].toLocaleString('es-ES')+' M</title></rect>';
        g+='<text x="'+(L+i*bw+bw/2)+'" y="'+(Hh-6)+'" font-size="10" text-anchor="middle" fill="#64748B">'+String(x[0]).slice(2)+'</text>'; });
      g+='</svg>';
      var f=s[0], l=s[s.length-1], ny=l[0]-f[0], cg=function(a,b){ return (a>0&&b>0&&ny>0)?(Math.pow(b/a,1/ny)-1):null; };
      var ben=s.filter(function(x){ return x[2]!=null; }), pos=ben.filter(function(x){ return x[2]>0; }).length, dv=s.filter(function(x){ return x[3]!=null; }), pd=dv.filter(function(x){ return Math.abs(x[3])>=0.05; }).length;
      var me=h.me||{}, mfs=[['ROE típico',me.roe],['Margen EBITDA',me.mg_ebitda],['Margen neto',me.mg_neto],['Inversión / ventas',me.capex_ing]].filter(function(z){ return z[1]!=null; }).map(function(z){ return '<div>'+z[0]+'<b>'+N(z[1])+' %</b></div>'; }).join('')+(me.dn_ebitda!=null?'<div>Deuda / EBITDA típica<b>'+N(me.dn_ebitda)+'x</b></div>':'');
      var emp=s.slice().reverse().filter(function(x){ return x[4]!=null; })[0];
      c='<div class="dt-c w2 dt-hist"><h4>Su historia '+f[0]+'–'+l[0]+' (millones)</h4><div class="dt-lg"><span><i style="background:#93B4E6"></i>'+(r.modelo==='BAN'?'margen de intereses':'ventas')+'</span><span><i style="background:#15803D"></i>beneficio</span><span><i style="background:#DC2626"></i>pérdidas</span></div>'+g+
        '<div class="dt-fs"><div>Ventas al año<b>'+P(cg(f[1],l[1]))+'</b>'+f[0]+'–'+l[0]+'</div><div>Beneficio al año<b>'+P(cg(f[2],l[2]))+'</b>'+f[0]+'–'+l[0]+'</div><div>Años con beneficio<b>'+pos+' de '+ben.length+'</b></div><div>Años pagando dividendo<b>'+(dv.length?pd+' de '+dv.length:'—')+'</b></div>'+(emp?'<div>Empleados<b>'+Math.round(emp[4]).toLocaleString('es-ES')+'</b>'+emp[0]+'</div>':'')+mfs+'</div>'+
        (me.fuente?'<div style="color:#94A3B8;font-size:11px;margin-top:6px">Cifras «típicas»: mediana de varios años ('+esc(me.fuente)+'). Crecimiento anual compuesto del primer al último año.</div>':'')+'</div>'; }
    return {d:d,c:c}; }
  function detalle(tk){
    var r=todas().filter(function(e){ return e.ticker===tk; })[0]; if(!r) return '<i>Sin datos del informe para '+esc(tk)+'.</i>';
    var Cr=I.criterios||{}, gen=r.modelo==='GEN', st=est(r,held());
    var h='<div class="dt-top"><b style="font-size:15px">'+esc(tk)+' · '+esc(r.empresa||'')+'</b><span style="color:#64748B">'+esc(r.descripcion||'')+'</span>'+((st==='analizada'||st==='cartera')?'<span class="bt" data-nfopen="'+esc(tk)+'">Abrir ficha de empresa →</span>':'')+'<span class="x" data-nuclose="1">cerrar ✕</span></div>';
    var HH=hist(tk,r); h+=HH.d+'<div class="dt-g">'+HH.c;
    h+='<div class="dt-c"><h4>Qué es y dónde está</h4>'+kv('Modelo · módulos',esc(r.modelo)+(r.modulos&&r.modulos.length?' · '+esc(r.modulos.join(', ')):''))+(r.grupo_comp?kv('Grupo',esc(r.grupo_comp)):'')+(r.puesto_grupo?kv('Puesto en su grupo',r.puesto_grupo+' de '+r.n_grupo):'')+(r.puesto?kv('Puesto general',r.puesto+'º'+(r.cambio_puesto?(r.cambio_puesto>0?' <span style="color:#15803D">▲'+r.cambio_puesto+'</span>':' <span style="color:#B91C1C">▼'+(-r.cambio_puesto)+'</span>')+' esta semana':'')):'')+kv('Cuentas',(r.primero||'?')+'–'+(r.ultimo||'?')+' ('+(r.n_anios||'?')+' años)'+(r.normas?' · '+esc(r.normas):'')+(r.moneda&&r.moneda!=='EUR'?' · '+esc(r.moneda):''))+kv('Estado',{cartera:'en tu cartera',analizada:'analizada con el método',universo:'solo vigilada',growth:'BME Growth'}[st]||st)+'</div>';
    var p=r.puntos||{}; if(p.total!=null){ var bar=function(n,v,c,w){ return '<div class="bb"><span>'+n+' <small>('+w+')</small></span><i><em style="width:'+v+'%;background:'+c+'"></em></i><b>'+v+'</b></div>'; };
      h+='<div class="dt-c"><h4>Por qué tiene '+N(p.total)+' puntos</h4>'+bar('Dividendo',p.dividendo,'#16A34A','35 %')+bar('Calidad',p.calidad,'#2563EB','35 %')+bar('Valoración',p.valoracion,'#D97706','30 %')+(p.nota?'<div style="margin-top:6px;color:#7C5A2A">Ojo: '+esc(p.nota)+'.</div>':'')+(r.cambio_puntos?'<div style="margin-top:4px;color:#64748B">Esta semana: '+(r.cambio_puntos>0?'+':'')+N(r.cambio_puntos)+' puntos.</div>':'')+'<div style="margin-top:6px;color:#94A3B8;font-size:11.5px">Cada parte va de 0 a 100; entre paréntesis, lo que pesa en el total.</div></div>'; }
    var has=function(e){ return (r.etiquetas||[]).indexOf(e)>=0; };
    var why={Calidad:'ROE mediano 5 años '+P(r.roe_med5)+' · años con pérdidas '+(r.perdidas5!=null?r.perdidas5:'—')+' de '+(r.anios5!=null?r.anios5:5)+(gen?' · deuda/EBITDA '+(r.dn_ebitda==null?'—':(r.deuda_neta<0?'caja neta':X(r.dn_ebitda))):''),
      Barata:'PER '+(r.per==null?'—':N(r.per))+' · P/VC '+(r.pvc==null?'—':N(r.pvc,2)), Crecimiento:'ventas '+P(r.cagr_ing)+' al año'+(r.cagr_tramo?' ('+esc(r.cagr_tramo)+')':''),
      Riesgo:'beneficio '+Mi(r.beneficio)+' M · EBITDA '+Mi(r.ebitda)+' M'+(gen?' · deuda/EBITDA '+(r.dn_ebitda==null?'—':X(r.dn_ebitda)):(r.ltv!=null?' · deuda/activo '+P(r.ltv):''))};
    h+='<div class="dt-c"><h4>Etiquetas: cuáles tiene y por qué</h4>'+['Calidad','Barata','Crecimiento','Riesgo'].map(function(e){ return '<div class="et"><span class="mk" style="color:'+(has(e)?(e==='Riesgo'?'#B91C1C':'#15803D'):'#CBD5E1')+'">'+(has(e)?'✓':'·')+'</span><div><b style="color:'+(has(e)?'#0F172A':'#94A3B8')+'">'+e+'</b> — sus datos: '+why[e]+(Cr[e]?'<small>Regla: '+esc(Cr[e])+'</small>':'')+'</div></div>'; }).join('')+'</div>';
    h+='<div class="dt-c"><h4>Cuentas '+esc(r.ultimo||'')+'</h4>'+kv(r.modelo==='BAN'?'Margen de intereses':'Ventas',Mi(r.ingresos)+' M')+(r.ebitda!=null?kv('EBITDA',Mi(r.ebitda)+' M'):'')+(r.mg_ebit!=null?kv('Margen EBIT',P(r.mg_ebit)):'')+kv('Beneficio',Mi(r.beneficio)+' M')+(r.deuda_neta!=null?kv('Deuda neta',r.deuda_neta<0?'caja neta '+Mi(-r.deuda_neta)+' M':Mi(r.deuda_neta)+' M'+(r.dn_ebitda!=null?' ('+X(r.dn_ebitda)+' EBITDA)':'')):'')+(r.ltv!=null?kv('Deuda / activo',P(r.ltv)):'')+(r.fcf!=null?kv('Caja libre (FCF)',Mi(r.fcf)+' M'):'')+kv('ROE · mediana 5 años',P(r.roe)+' · '+P(r.roe_med5))+(r.cagr_ing!=null?kv('Crecimiento ventas',P(r.cagr_ing)+' al año'):'')+(r.s1?kv(esc(r.s1)+' vs año antes','ventas '+(r.s1_ing==null?'—':(r.s1_ing>0?'+':'')+P(r.s1_ing))+' · benef. '+(r.s1_ben==null?'—':(r.s1_ben>0?'+':'')+P(r.s1_ben))):'')+'</div>';
    h+='<div class="dt-c"><h4>En bolsa</h4>'+(r.precio!=null?kv('Precio',N(r.precio,2)+' € <small style="color:#94A3B8;font-weight:400">('+esc(r.fecha_precio||'')+')</small>'):'')+(r.var_1a!=null?kv('En un año',(r.var_1a>0?'+':'')+P(r.var_1a)):'')+(r.vs_max52!=null?kv('Desde su máximo de 52 sem.',P(r.vs_max52)):'')+kv('Capitalización',Mi(r.cap)+' M€')+kv('PER',(r.per==null?'—':N(r.per))+(r.per_grupo?' <small style="color:#94A3B8;font-weight:400">(su grupo '+N(r.per_grupo)+')</small>':''))+(r.pvc!=null?kv('Precio / valor contable',N(r.pvc,2)):'')+(r.ev_ebitda!=null?kv('EV / EBITDA',X(r.ev_ebitda)):'')+(r.fcf_yield!=null?kv('Rentab. caja libre',P(r.fcf_yield)):'')+kv('RPD 12 meses',P(r.rpd)+(r.dpa_12m?' ('+N(r.dpa_12m,2)+' €/acc.)':''))+(r.payout!=null?kv('Reparte del beneficio',P(r.payout)):'')+(r.paga_scrip?kv('Paga en acciones (scrip)','sí'+(r.dilucion?' · diluye '+P(r.dilucion)+'/año':'')):'')+(r.recompra?kv('Recompra',P(r.recompra)+' al año'):'')+'</div>';
    if(r.salto){ h+='<div class="dt-c"><h4>Termómetro del salto: '+r.salto_n+' de 5</h4>'+(I.salto||[]).map(function(s){ return '<div class="et"><span class="mk" style="color:'+(r.salto[s[0]]?'#15803D':'#B91C1C')+'">'+(r.salto[s[0]]?'✓':'✗')+'</span><div><b>'+esc(s[0])+'</b><small>'+esc(s[1])+'</small></div></div>'; }).join('')+'<div style="color:#94A3B8;font-size:11.5px;margin-top:4px">Hipótesis: aún no se ha probado con casos pasados de empresas que dieron el salto.</div></div>'; }
    h+='</div>';
    var av=r.avisos||[];
    h+=av.length?'<div class="dt-av"><b>⚠ Avisos del cálculo ('+av.length+')</b><ul style="margin:6px 0 0 18px;padding:0">'+av.map(function(a){ return '<li><b>'+esc(a)+'</b>'+(EXPL[a]?'<small>'+EXPL[a]+'</small>':'')+'</li>'; }).join('')+'</ul></div>':'<div class="dt-av ok">✓ Sin avisos del cálculo.</div>';
    return h; }

  /* ---------- eventos ---------- */
  document.addEventListener('input',function(e){ var x=e.target; if(x&&x.getAttribute&&x.getAttribute('data-nuf')==='q'){ F.q=x.value; abierto=null; filas(); } });
  document.addEventListener('change',function(e){ var x=e.target; if(x&&x.getAttribute&&x.hasAttribute('data-nuf')){ F[x.getAttribute('data-nuf')]=x.value; abierto=null; filas(); [].forEach.call(document.querySelectorAll('#view-unin select[data-nuf]'),function(s){ s.classList.toggle('act',s.selectedIndex>0); }); } });
  document.addEventListener('click',function(e){
    if(!e.target.closest||!e.target.closest('#view-unin')) return;
    var st=e.target.closest('[data-nustar]'); if(st){ var tk=String(st.getAttribute('data-nustar')||'').toUpperCase(); if(!tk) return;   /* [31-oct-2026 · Fase 3] ★ = cola de análisis (la misma de la app de siempre) */
      if(enCola(tk)){ if(!confirm('¿Quitar '+tk+' de la cola de análisis?')) return; DB.cola=(DB.cola||[]).filter(function(c){ return String(c.t||'').toUpperCase()!==tk; }); }
      else if(typeof colaAdd==='function') colaAdd(tk); else { DB.cola=DB.cola||[]; DB.cola.push({t:tk,estado:'pendiente',nota:'',alta:new Date().toISOString().slice(0,10)}); }
      if(typeof scheduleSave==='function') scheduleSave(); filas(); if(typeof showToast==='function') showToast(enCola(tk)?(tk+' añadida a la cola de análisis'):(tk+' quitada de la cola')); return; }
    var g=e.target.closest('.gs'); if(g){ var k=g.getAttribute('data-nugrp'); F.grp=F.grp===k?'':k; var s=document.querySelector('#view-unin select[data-nuf="grp"]'); if(s) s.value=F.grp; abierto=null; filas(); if(F.grp){ var t=document.getElementById('nuT'); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); } return; }
    var th=e.target.closest('#nuT th.so'); if(th){ var i=[].indexOf.call(th.parentNode.children,th); S.d=(S.c===i)?-S.d:-1; S.c=i; abierto=null; filas(); return; }
    if(e.target.closest('[data-nuclose]')){ abierto=null; filas(); return; }
    if(e.target.closest('tr.det')||e.target.closest('[data-nfopen]')) return;
    var r=e.target.closest('[data-nuni]'); if(r){ var t2=r.getAttribute('data-nuni');
      if(r.closest('#nuGrowth')){ F.seg=''; var s2=document.querySelector('#view-unin select[data-nuf="seg"]'); if(s2) s2.value=''; F.q=t2; var q=document.querySelector('#view-unin [data-nuf="q"]'); if(q) q.value=t2; }
      abierto=abierto===t2?null:t2; filas(); }
  });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._nu) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='unin') pintar(); return r; }; activarVista._nu=1; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
