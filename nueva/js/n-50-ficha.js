/* APP NUEVA · EMPRESAS → FICHA DE EMPRESA (boceto v30, 30-oct-2026, Carlos: «es una maravilla, me encanta»).
   Regla del diseño (30-oct): todo sale de la ficha de la empresa (fichas/TK.json, que deja el método con exportar_ficha.py);
   la app NO razona: pinta las cifras y aplica reglas fijas. Las notas de juicio llevan su fecha y la app avisa si se quedan viejas.
   Pestañas: Resumen · La empresa · Cómo va la empresa · Cotización · Dividendo · Mi posición · Revisiones e historial ·
   Noticias y coyuntura. De la app salen el precio de hoy, tu posición, tus dividendos cobrados y la gráfica de cotización. */
(function(){
  var C={}, cur=null, tab='res';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function n(v,d){ if(v==null||v===''||!isFinite(+v)) return '—'; d=d==null?2:d; return (+v).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'}); }
  function eu(v,d){ return v==null||!isFinite(+v)?'—':n(v,d)+' €'; }
  function pc(v,d){ return v==null||!isFinite(+v)?'—':(v>0?'+':'')+n(v,d==null?1:d)+' %'; }
  function fe(f){ if(!f) return ''; var p=String(f).slice(0,10).split('-'); var M=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return p.length===3?(+p[2])+'-'+M[+p[1]-1]+'-'+p[0]:f; }
  function last(o){ if(!o) return null; var k=Object.keys(o).filter(function(x){return /^\d{4}$/.test(x);}).sort(); return k.length?o[k[k.length-1]]:null; }
  function cot(t){ try{ var c=(typeof _mcCot==='function')?+_mcCot(t):0; if(c>0) return c; }catch(e){} var v=(DB.valores||{})[t]; return v?+v.precioActual||0:0; }
  function tiene(t){ return window.nTiene?window.nTiene(t):false; }
  var COL={v:['#15803D','#DCFCE7'],a:['#B45309','#FEF3C7'],r:['#B91C1C','#FEE2E2'],n:['#1F4A9A','#EAF1FD']};
  function vd(c,html){ var k=COL[c]||COL.n; return '<div class="nf-vd" style="background:'+k[1]+';color:'+k[0]+';border-left-color:'+k[0]+'">'+html+'</div>'; }
  function dc(x){ return String(x==null?'':x).replace(/(\d)\.(\d)/g,'$1,$2'); }
  function card(t,sub,body,cls){ return '<div class="nf-card'+(cls?' '+cls:'')+'"><h2>'+t+(sub?' <span class="nf-sub">'+sub+'</span>':'')+'</h2>'+body+'</div>'; }
  function tabla(T,opt){ if(!T||!T.filas) return ''; opt=opt||{}; var c=T.columnas||[];
    return '<div class="nf-tw"><table class="nf-t">'+(c.length?'<tr>'+c.map(function(x){return '<th>'+esc(x)+'</th>';}).join('')+'</tr>':'')+T.filas.map(function(r){ return '<tr>'+r.map(function(v,i){ return '<td>'+(i===0?'<b>'+esc(v)+'</b>':esc(v))+'</td>'; }).join('')+'</tr>'; }).join('')+'</table></div>'; }
  function nota(j,datos){ if(!j||!j.veredicto_texto) return '';
    var viejo=datos&&j.escrito&&String(datos)>String(j.escrito).slice(0,4);
    return '<div class="nf-nota"><span>Nota del analista · '+fe(j.escrito)+'</span>'+esc(j.veredicto_texto)+(viejo?'<em>Nota escrita antes de los datos de '+esc(datos)+': pendiente de revisar.</em>':'')+'</div>'; }
  /* markdown sencillo para el perfil corporativo */
  function md(t){
    var L=String(t||'').split('\n'), h='', inT=false, inL=false, par=false;
    function inl(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/`(.+?)`/g,'<code>$1</code>'); }
    function cerrar(){ par=false; if(inT){ h+='</table></div>'; inT=false; } if(inL){ h+='</ul>'; inL=false; } }
    L.forEach(function(l){
      if(/^\s*\|/.test(l)){ if(/^\s*\|[\s:\-|]+\|\s*$/.test(l)) return; var cs=l.trim().replace(/^\||\|$/g,'').split('|'); if(!inT){ cerrar(); h+='<div class="nf-tw"><table class="nf-t">'; inT=true; h+='<tr>'+cs.map(function(c){return '<th>'+inl(c.trim())+'</th>';}).join('')+'</tr>'; } else h+='<tr>'+cs.map(function(c){return '<td>'+inl(c.trim())+'</td>';}).join('')+'</tr>'; return; }
      if(/^\s*[-*] /.test(l)){ if(inT){ h+='</table></div>'; inT=false; } if(!inL){ h+='<ul>'; inL=true; } h+='<li>'+inl(l.replace(/^\s*[-*] /,''))+'</li>'; return; }
      cerrar();
      var m=/^(#{3,6})\s+(.*)/.exec(l); if(m){ h+='<h4>'+inl(m[2])+'</h4>'; return; }
      if(/^>\s?/.test(l)){ h+='<blockquote>'+inl(l.replace(/^>\s?/,''))+'</blockquote>'; return; }
      if(l.trim()==='---'||!l.trim()){ par=false; return; }
      if(par&&/<\/p>$/.test(h)) h=h.slice(0,-4)+' '+inl(l)+'</p>'; else h+='<p>'+inl(l)+'</p>'; par=true;
    });
    cerrar(); return h;
  }

  /* ---------------- carga ---------------- */
  window._nfHall=null; function cargarHall(){ if(window._nfHall) return Promise.resolve(); return fetch('hallazgos.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ window._nfHall=(j&&j.empresas)||{}; }).catch(function(){ window._nfHall={}; }); }
  function cargar(t){
    if(C[t]) return Promise.resolve(C[t]);
    return Promise.all([fetch('fichas/'+t+'.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }),cargarHall()]).then(function(a){ var F=a[0]; if(F) rebase(F,t); C[t]=F; return F; });
  }
  /* niveles por acción del análisis → acciones de hoy (ampliaciones liberadas y otros eventos de capital posteriores) */
  function rebase(F,t){ if(F._rb) return; F._rb=1; var fe=(F.valoracion&&F.valoracion.fecha_precio)||String((F.tesis||{}).generado||F.generado||'').slice(0,10); var R=function(v){ return window.nfRebase?window.nfRebase(t,v,fe):v; };
    var T=F.tesis||{}; ['precio','po_bear','po_base','po_bull','entrada_min','entrada_max','stop'].forEach(function(k){ if(T[k]!=null) T[k]=R(T[k]); });
    var V=F.valoracion||{}; ['precio','precio_objetivo'].forEach(function(k){ if(V[k]!=null) V[k]=R(V[k]); });
    Object.keys(V.escenarios||{}).forEach(function(k){ var e=V.escenarios[k]; if(e&&e.vpa!=null) e.vpa=R(e.vpa); });
    Object.keys(V.multiplos||{}).forEach(function(k){ var m=V.multiplos[k]; if(m&&m.vpa!=null) m.vpa=R(m.vpa); });
    Object.keys(V.matriz||{}).forEach(function(w){ Object.keys(V.matriz[w]).forEach(function(g){ V.matriz[w][g]=R(V.matriz[w][g]); }); });
    if(window.khEvFactor){ try{ var f=khEvFactor(t,fe); if(Math.abs(f-1)>1e-9) F._evNota='Niveles pasados a las acciones de hoy por un evento de capital posterior al análisis (÷ '+n(f,4)+').'; }catch(e){} } }
  function lista(){
    var L=[]; (DB.analisis||[]).forEach(function(a){ var t=String(a.ticker||'').toUpperCase(); if(t&&a.dossierFecha) L.push([t,a.nombre||t]); });
    L.sort(function(a,b){ return a[1].localeCompare(b[1]); }); return L;
  }

  /* ---------------- regla y cabecera ---------------- */
  function niveles(F,t){ var T=F.tesis||{}; return {precio:cot(t)||T.precio, stop:T.stop, entMin:T.entrada_min||T.po_bear, entMax:T.entrada_max, poBase:T.po_base, poBull:T.po_bull}; }
  function hero(F,t){
    var T=F.tesis||{}, V=niveles(F,t), p=V.precio, sc=F.scoring||{}, cm=F.comparativa||{}, ds=F.seguridad_dividendo||{};
    var dec=String(T.veredicto||'').toUpperCase(), dcol={COMPRAR:'#15803D',MANTENER:'#1E40AF',ESPERAR:'#B45309',VENDER:'#B91C1C',REDUCIR:'#B91C1C'}[dec]||'#475569';
    var sy=last((F.series.flujos||{}).shareholder_yield), rpd=last((F.series.flujos||{}).rpd);
    var tx=window.nReglaTxt?window.nReglaTxt(V):null;
    var frase=dec?('<b style="color:'+dcol+'">'+dec.charAt(0)+dec.slice(1).toLowerCase()+'.</b> '):'';
    if(p&&V.entMax){ if(p>V.entMax) frase+='Cotiza un <b>'+n((p/V.entMax-1)*100,0)+' % por encima</b> de su entrada máxima ('+eu(V.entMax)+'). Comprar por debajo de '+eu(V.entMax)+'.';
      else if(p>=V.entMin) frase+='Está <b>dentro de la banda de entrada</b> ('+eu(V.entMin)+' - '+eu(V.entMax)+').';
      else if(V.stop&&p<V.stop) frase+='Cotiza <b>por debajo del stop</b> ('+eu(V.stop)+').';
      else frase+='Está <b>más barata que la banda</b> de entrada ('+eu(V.entMin)+' - '+eu(V.entMax)+').'; }
    return '<div class="nf-hero"><div class="nf-fl"><div class="nf-tk">'+esc(t)+'</div><div><h1>'+esc(F.empresa||t)+'</h1><p>'+esc((F.modelo||'')+(F.modulos&&F.modulos.length?' · '+F.modulos.join(', '):''))+'</p>'+
      '<div class="nf-chips">'+(dec?'<span class="nf-ch nf-dec" style="background:'+dcol+'">'+dec+'</span>':'')+
      (sc.rating?'<span class="nf-ch">Calidad <b>'+esc(sc.rating)+'</b> · '+n(sc.score,1)+'</span>':'')+
      (cm.moat_final!=null?'<span class="nf-ch">Foso <b>'+esc(String(cm.rating_moat||'').toLowerCase())+'</b> · '+n(cm.moat_final,0)+'</span>':'')+
      (ds.score!=null?'<span class="nf-ch">Dividendo <b>'+esc(String(ds.banda||'').toLowerCase())+'</b> · '+ds.score+'</span>':'')+
      (tiene(t)?'<span class="nf-ch nf-own">En cartera</span>':'')+'</div></div></div>'+
      '<div class="nf-hk"><small>Cotización</small><b>'+eu(p)+'</b>'+(rpd!=null?'<small>rentabilidad por dividendo '+n(rpd,1)+' %</small>':'')+
      '<div class="nf-hk2"><span>Potencial hasta el PO <b>'+(p&&V.poBase?pc((V.poBase/p-1)*100):'—')+'</b></span>'+(sy!=null?'<span>Rentabilidad al accionista <b>'+n(sy,1)+' %</b></span>':'')+'</div>'+
      '<div class="nf-hb"><a href="dossiers/'+t+'.html" target="_blank" rel="noopener">📄 Dossier</a><a href="dossiers/v3/'+t+'.html" target="_blank" rel="noopener">📊 Datos v3</a><span class="n-prvg" data-nprv="'+t+'">🔍 Pedir revisión</span></div></div>'+
      '<div class="nf-pz"><div class="nf-pzh"><b>Dónde está el precio</b><span>'+frase+'</span></div>'+(window.nRegla?window.nRegla(V,{peq:1}):'')+'</div></div>';
  }

  /* ---------------- RESUMEN ---------------- */
  function resumen(F,t){
    var T=F.tesis||{}, JT=F.juicio_tesis||{}, JR=F.juicio_riesgos||{}, h='';
    var cond=(T.tablas||[]).filter(function(x){ return /condiciones/i.test(x.titulo||''); })[0];
    var dec=String(T.veredicto||'').toUpperCase();
    if(cond) h+=card('Por qué '+(dec?dec.toLowerCase():'')+' · condiciones de entrada','','<table class="nf-cl">'+cond.filas.map(function(r){ var ok=/^S[IÍ]/i.test(r[2]); return '<tr class="'+(ok?'ok':'ko')+'"><td>'+(ok?'✓':'✗')+'</td><td>'+esc(r[0])+'</td><td>'+esc(String(r[1]).replace('.',','))+'</td></tr>'; }).join('')+'</table>'+(JT.veredicto_texto?nota({escrito:JT.escrito,veredicto_texto:JT.veredicto_texto}):''));
    /* catalizadores y riesgos con su estado de la última semana */
    var sem=(F.semanal||[])[0]||{}, tc=(T.tablas||[]).filter(function(x){ return /catalizador/i.test(x.titulo||''); })[0], tr=((F.riesgos||{}).tablas||[]).filter(function(x){ return /matriz/i.test(x.titulo||''); })[0];
    function estado(o){ if(!o) return ['sin dato de esta semana','#94A3B8','#F1F5F9']; var e=String(o.estado||o.color||o).toLowerCase();
      if(/rojo|activ|salta/.test(e)) return ['● en rojo','#B91C1C','#FEE2E2']; if(/[áa]mbar|amar|vigil/.test(e)) return ['● en ámbar','#B45309','#FEF3C7']; if(/verde|ok|no/.test(e)) return ['● en verde','#15803D','#DCFCE7']; return ['● '+e,'#475569','#F1F5F9']; }
    function item(i,tit,imp,qp,hoy,salta,st,cat){ return '<div class="nf-it" style="border-left-color:'+st[1]+'"><div class="nf-ith"><span class="nf-itn">'+i+'</span><b>'+esc(tit)+'</b><span class="nf-st" style="background:'+st[2]+';color:'+st[1]+'">'+st[0]+'</span><span class="nf-imp '+(cat?'pos':'neg')+'">'+esc(dc(imp))+'</span></div>'+
      '<div class="nf-itq"><span>Qué pasa</span><div>'+esc(qp||'')+'</div></div>'+(hoy?'<div class="nf-itq"><span>Hoy</span><div>'+esc(hoy)+'</div></div>':'')+'<div class="nf-ital">'+(cat?'Se cumple si: ':'Salta si: ')+esc(salta||'')+'</div></div>'; }
    var cats=(JT.catalizadores||[]).map(function(c,i){ var r=tc&&tc.filas[i]||[], s=(sem.catalizadores||{})[i+1]||(sem.catalizadores||{})[String(i+1)];
      return item(i+1,c.titulo,r[4],c.mecanismo,s&&(s.hoy||s.texto),c.disparador+(c.horizonte?' · '+c.horizonte:''),estado(s),true); }).join('');
    var ries=(JR.riesgos||[]).map(function(c,i){ var r=tr&&tr.filas[i]||[], s=(sem.riesgos||{})[i+1]||(sem.riesgos||{})[String(i+1)];
      return item(i+1,c.titulo,r[4],c.mecanismo,s&&(s.hoy||s.texto),c.senal+(c.probabilidad?' · prob. '+c.probabilidad:''),estado(s),false); }).join('');
    h+='<div class="nf-g2">'+card('Qué tiene que pasar · catalizadores','impacto sobre el PO'+(sem.fecha?' · informe semanal del '+fe(sem.fecha):''),cats||'<div class="nf-mu">Sin catalizadores.</div>')+
      card('Qué puede salir mal · riesgos','impacto sobre el PO',ries||'<div class="nf-mu">Sin riesgos.</div>')+'</div>';
    h+=poCard(F)+escCard(F,t)+premortem(F);
    return h;
  }
  function poCard(F){
    var V=F.valoracion||{}, E=V.escenarios||{}, M=V.multiplos||{}, W=V.pesos||{}, PO=V.precio_objetivo; if(!PO) return '';
    var it=[]; [['pesimista','DCF pesimista','#DC2626'],['base','DCF base','#1F4A9A'],['optimista','DCF optimista','#16A34A']].forEach(function(k){ var e=E[k[0]]; if(e&&e.vpa!=null) it.push([k[1],e.vpa,W['dcf_'+k[0]],k[2],e.origen||'']); });
    Object.keys(M).forEach(function(k){ var m=M[k]; if(!m||m.vpa==null) return; var esR=/dividendo/i.test(m.etiqueta||''), f=function(v){ return esR?n(v*100,1)+' %':n(v,1); };
      it.push([String(m.etiqueta||k).replace(/\s*\(.*\)$/,''),m.vpa,W[k],'#64748B',(esR?'rentabilidad media de sus diez años: ':'múltiplo medio de sus diez años: ')+f(m.media)+' (entre '+f(m.min)+' y '+f(m.max)+')']); });
    var mx=Math.max.apply(null,it.map(function(x){return +x[1];}).concat([PO]))*1.05;
    var rows=it.map(function(x){ return '<div class="nf-po"><span>'+esc(x[0])+'</span><div class="nf-pob"><i style="width:'+(x[1]/mx*100).toFixed(1)+'%;background:'+x[3]+'"></i><em style="left:'+(PO/mx*100).toFixed(1)+'%"></em></div><b>'+eu(x[1])+'</b><small>'+(x[2]!=null?n(x[2],0)+' %':'')+'</small></div><div class="nf-pot">'+esc(x[4])+'</div>'; }).join('');
    var di=V.dcf_inverso||{}, sens='';
    try{ var be=E.base||{}, wk=Object.keys(V.matriz||{}).map(Number).sort(function(a,b){return a-b;}); var w0=+be.wacc, g0=+be.gtv; var ws=wk.filter(function(w){ return Math.abs(w-w0)<=0.51; });
      var vals=[]; ws.forEach(function(w){ var row=V.matriz[w.toFixed(2)]||{}; Object.keys(row).forEach(function(g){ if(Math.abs(+g-g0)<=0.51) vals.push(row[g]); }); });
      if(vals.length>1) sens='<span><b>Si cambian los supuestos del DCF base</b> (coste del capital ±0,5 puntos, crecimiento final ±0,5): da entre '+eu(Math.min.apply(null,vals))+' y '+eu(Math.max.apply(null,vals))+'.</span>'; }catch(e){}
    return card('¿De dónde sale el PO?','maneras de valorarla, cada una con su peso',vd('n','PO base <b>'+eu(PO)+'</b> = media ponderada de todas.')+'<div class="nf-pog">'+rows+'</div><div class="nf-pof"><span>Línea vertical = PO base '+eu(PO)+'</span>'+(di.g_implicito!=null?'<span><b>DCF inverso:</b> al precio del análisis el mercado descuenta un crecimiento de '+n(di.g_implicito,1)+' % al año · '+esc(String(di.veredicto||'').split(' (')[0].toLowerCase())+'.</span>':'')+sens+'</div>');
  }
  function escCard(F,t){
    var T=F.tesis||{}, E=(F.valoracion||{}).escenarios||{}, p=cot(t)||T.precio; if(!T.po_base) return '';
    function c(tit,col,v,e,dcf){ return '<div class="nf-esc" style="border-top-color:'+col+'"><span>'+tit+'</span><b>'+eu(v)+'</b><p>'+esc((e||{}).origen||'')+'</p><small>'+(p?pc((v/p-1)*100)+' desde hoy':'')+((e||{}).vpa!=null?' · su DCF solo '+(dcf?'da ':'daría ')+eu(e.vpa):'')+'</small></div>'; }
    return card('A favor y en contra','los tres PO de la tesis y la historia que hay detrás de cada uno','<div class="nf-g3">'+c('A favor · PO bueno','#16A34A',T.po_bull,E.optimista)+c('Lo esperado · PO base','#1F4A9A',T.po_base,E.base,1)+c('En contra · PO malo','#DC2626',T.po_bear,E.pesimista)+'</div>');
  }
  function premortem(F){
    var P=(F.juicio_riesgos||{}).premortem||[], tb=((F.riesgos||{}).tablas||[]).filter(function(x){ return /pre-?mortem/i.test(x.titulo||''); })[0]; if(!P.length) return '';
    var tot=0; var cs=P.map(function(p,i){ var r=tb&&tb.filas[i]||[]; var pr=parseFloat(String(p.probabilidad||'').replace(',','.')); if(isFinite(pr)) tot+=pr;
      return '<div class="nf-pm"><div class="nf-pmh"><span class="nf-pmi">'+esc(p.id||i+1)+'</span><b>'+esc(p.titulo)+'</b><span class="nf-mu">probabilidad '+esc(p.probabilidad)+'</span><span class="nf-pmd">'+esc(dc(r[3]||''))+(r[4]?' → '+esc(dc(r[4])):'')+'</span></div>'+
        '<div class="nf-pmr"><span>Empieza si</span>'+esc(p.detonante)+'</div><div class="nf-pmr"><span>Y entonces</span>'+esc(p.cadena)+'</div><div class="nf-pmr nf-sal"><span>Señal para salir</span>'+esc(p.senal_salida)+'</div></div>'; }).join('');
    return card('Tres formas de que salga mal','pre-mortem · la caída sobre el PO base y el precio al que llevaría','<div class="nf-g3">'+cs+'</div>'+(tot?'<span class="nf-ws">Juntas suman un '+n(tot,0)+' % de probabilidad.</span>':''));
  }

  /* ---------------- LA EMPRESA ---------------- */
  function empresa(F){
    var h='', P=F.perfil;
    if(P&&P.texto){ var secs=P.texto.split(/\n(?=## )/), b='';
      secs.forEach(function(s){ var m=/^## (.+)/.exec(s); if(!m) return; var tt=m[1].trim(); if(/^H\.|^Resumen de datos/i.test(tt)) return;
        b+='<details class="nf-pf"'+(/^A\./.test(tt)?' open':'')+'><summary>'+esc(tt)+'</summary><div class="nf-pfb">'+md(s.slice(m[0].length))+'</div></details>'; });
      h+=card('Quién es '+esc(F.empresa||''),'perfil corporativo'+(P.fecha?' · '+esc(P.fecha):''),b);
    } else h+=card('Quién es '+esc(F.empresa||''),'','<div class="nf-mu">Aún no tiene perfil corporativo.</div>');
    var C=F.comparativa||{}, J=F.juicio_comparativa||{}, TB=J.tablas||[];
    if(C.moat_final!=null){ var col=C.moat_final>=60?'v':(C.moat_final>=45?'a':'r');
      h+=card('Su foso (ventaja competitiva)','Bloque 7',vd(col,'<b>Foso '+esc(String(C.rating_moat||'').toLowerCase())+' · '+n(C.moat_final,1)+' de 100.</b> '+esc(J.veredicto_texto||''))+(TB[0]?tabla(TB[0]):'')+
        '<div class="nf-g2"><div><h3>Lo bueno</h3><ul class="nf-ul">'+(J.fortalezas||[]).map(function(x){return '<li>'+esc(x.texto||x)+'</li>';}).join('')+'</ul></div><div><h3>A vigilar</h3><ul class="nf-ul">'+(J.a_vigilar||[]).map(function(x){return '<li>'+esc(x.texto||x)+'</li>';}).join('')+'</ul></div></div>'); }
    var mg=TB.filter(function(x){ return /management|direct/i.test(x.titulo||''); })[0], pm=TB.filter(function(x){ return /posici[oó]n de mercado/i.test(x.titulo||''); })[0], cp=TB.filter(function(x){ return /comparab/i.test(x.titulo||''); })[0];
    if(mg||pm||cp) h+='<div class="nf-g2">'+(mg?card('Quién la dirige','cómo lo hace la directiva · se lee, no puntúa',tabla(mg)):'')+((pm||cp)?card('Su mercado y sus rivales','',(pm?tabla(pm):'')+(cp?'<h3>Con quién se puede comparar</h3>'+tabla(cp):'')):'')+'</div>';
    return h;
  }

  /* ---------------- CÓMO VA LA EMPRESA (las gráficas comunes) ---------------- */
  function niceStep(r){ var m=Math.pow(10,Math.floor(Math.log10(r||1))); return [1,2,2.5,5,10].map(function(x){return x*m;}).filter(function(s){return s>=r;})[0]||m*10; }
  function chartg(Y,series,line,fmt,top){
    fmt=fmt||function(v){return n(v,0);}; var W=600,H=250,x0=72,x1=590,yt=top?30:14,yb=H-24,nn=Y.length,bw=(x1-x0)/nn;
    var P=Y.map(function(_,k){ return series.reduce(function(s,se){ return s+Math.max(0,se[1][k]||0); },0); }), N=Y.map(function(_,k){ return series.reduce(function(s,se){ return s+Math.min(0,se[1][k]||0); },0); });
    var vals=P.concat(N).concat(line?line[1].filter(function(v){return v!=null;}):[]).concat([0]); var mx=Math.max.apply(null,vals), mn=Math.min.apply(null,vals), pad=(mx-mn)*0.06||1; mx+=pad; if(mn<0) mn-=pad;
    var Yp=function(v){ return yt+(mx-v)/(mx-mn)*(yb-yt); }, h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs">', st=niceStep((mx-mn)/4);
    for(var v=Math.ceil(mn/st)*st; v<=mx+1e-9; v+=st) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Yp(v).toFixed(1)+'" y2="'+Yp(v).toFixed(1)+'" stroke="'+(Math.abs(v)<1e-9?'#94A3B8':'#EEF1F5')+'"/><text x="'+(x0-6)+'" y="'+(Yp(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="#5B6B7C">'+fmt(v)+'</text>';
    Y.forEach(function(y,k){ var xc=x0+k*bw+bw*0.18, w=bw*0.64, ap=0, an=0;
      series.forEach(function(se){ var val=se[1][k]; if(val==null) return; var y1,y2; if(val>=0){ y1=Yp(ap+val); y2=Yp(ap); ap+=val; } else { y1=Yp(an); y2=Yp(an+val); an+=val; } h+='<rect x="'+xc.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0.5,y2-y1).toFixed(1)+'" fill="'+se[2]+'"/>'; });
      h+='<text x="'+(x0+k*bw+bw/2).toFixed(1)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="#5B6B7C">'+y+'</text>';
      if(top&&top[0][k]!=null) h+='<text x="'+(x0+k*bw+bw/2).toFixed(1)+'" y="14" font-size="10.5" font-weight="700" text-anchor="middle" fill="'+top[2]+'">'+top[1](top[0][k])+'</text>'; });
    if(line){ var pts=[]; Y.forEach(function(_,k){ if(line[1][k]!=null) pts.push([x0+k*bw+bw/2,Yp(line[1][k])]); });
      h+='<polyline fill="none" stroke="'+line[2]+'" stroke-width="2.5" points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>'+pts.map(function(p){ return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.5" fill="#fff" stroke="'+line[2]+'" stroke-width="2"/>'; }).join(''); }
    Y.forEach(function(y,k){ var parts=series.filter(function(se){return se[1][k]!=null;}).map(function(se){ return se[0]+': '+fmt(se[1][k]); }); if(line&&line[1][k]!=null) parts.push(line[0]+': '+fmt(line[1][k])); if(top&&top[0][k]!=null) parts.push(top[3]+top[1](top[0][k]));
      h+='<rect class="nf-hv" x="'+(x0+k*bw).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+esc(y+'|'+parts.join('|'))+'"/>'; });
    return h+'</svg>';
  }
  function lines(Y,series,fmt){
    fmt=fmt||function(v){ return n(v,1)+' %'; }; var W=600,H=250,x0=72,x1=590,yt=14,yb=H-24,nn=Y.length,bw=(x1-x0)/nn;
    var vals=[0]; series.forEach(function(s){ s[1].forEach(function(v){ if(v!=null) vals.push(v); }); }); var mx=Math.max.apply(null,vals), mn=Math.min.apply(null,vals), pad=(mx-mn)*0.08||1; mx+=pad; if(mn<0) mn-=pad;
    var Yp=function(v){ return yt+(mx-v)/(mx-mn)*(yb-yt); }, h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs">', st=niceStep((mx-mn)/4);
    for(var v=Math.ceil(mn/st)*st; v<=mx+1e-9; v+=st) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Yp(v).toFixed(1)+'" y2="'+Yp(v).toFixed(1)+'" stroke="'+(Math.abs(v)<1e-9?'#94A3B8':'#EEF1F5')+'"/><text x="'+(x0-6)+'" y="'+(Yp(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="#5B6B7C">'+fmt(v)+'</text>';
    Y.forEach(function(y,k){ h+='<text x="'+(x0+k*bw+bw/2).toFixed(1)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="#5B6B7C">'+y+'</text>'; });
    series.forEach(function(s){ var pts=[]; Y.forEach(function(_,k){ if(s[1][k]!=null) pts.push([x0+k*bw+bw/2,Yp(s[1][k]),s[1][k]]); }); if(!pts.length) return;
      h+='<polyline fill="none" stroke="'+s[2]+'" stroke-width="2.5"'+(/^Coste/.test(s[0])?' stroke-dasharray="5 4"':'')+' points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>'+pts.map(function(p){ return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="#fff" stroke="'+s[2]+'" stroke-width="2"/>'; }).join('');
      var l=pts[pts.length-1]; h+='<text x="'+(l[0]-4).toFixed(1)+'" y="'+(l[1]-8).toFixed(1)+'" font-size="10.5" font-weight="800" text-anchor="end" fill="'+s[2]+'">'+fmt(l[2])+'</text>'; });
    Y.forEach(function(y,k){ var parts=series.filter(function(s){return s[1][k]!=null;}).map(function(s){ return s[0]+': '+fmt(s[1][k]); }); h+='<rect class="nf-hv" x="'+(x0+k*bw).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+esc(y+'|'+parts.join('|'))+'"/>'; });
    return h+'</svg>';
  }
  function leg(it){ return '<div class="nf-lg">'+it.map(function(x){ return '<span><i style="background:'+x[1]+'"></i>'+x[0]+'</span>'; }).join('')+'</div>'; }
  function gcard(q,col,ver,svg,lg,nt){ return '<div class="nf-card"><h2>'+q+'</h2>'+vd(col,ver)+svg+lg+(nt||'')+'</div>'; }
  function comoVa(F){
    var S=F.series||{}, s=S.serie||{}, de=S.desempeno||{}, fl=S.flujos||{}, so=S.solvencia||{};
    var yy={}; [fl.fcl_recurrente,fl.cfo,fl.dpa,de.margen_ebit,de.roe,s.ingresos,s.bpa_basico].forEach(function(o){ Object.keys(o||{}).forEach(function(y){ if(/^\d{4}$/.test(y)) yy[y]=1; }); });
    var Y=Object.keys(yy).sort().slice(-10);
    if(Y.length<3) return card('Cómo va la empresa','',vd('a','Esta empresa aún no tiene las series de diez años del método.'));
    var g=function(o,k){ var x=o[k]||{}; return Y.map(function(y){ var v=x[y]; return v==null?null:+v; }); }, z=function(L){ return L.map(function(v){ return v==null?0:v; }); };
    var banca=/BAN|SEG/.test(String(F.modelo||'')), paso=(F.modulos||[]).indexOf('PASO')>=0, J=F.juicios||{}, dh=F.datos_hasta, ny=+Y[Y.length-1]-(+Y[0]);
    var cg=function(a,b){ return (a>0&&b>0&&ny>0)?(Math.pow(b/a,1/ny)-1)*100:null; }, out='';
    if(banca) out+=vd('a','Bancos y aseguradoras: su base propia de gráficas está pendiente (se hará con Santander). Abajo, lo que se puede leer igual que en las demás.');
    var BASE=paso?g(s,'ventas_economicas'):g(s,'ingresos'), bn=paso?'Ventas económicas':'Ventas', AP=paso?Y.map(function(){return null;}):g(s,'aprovisionamientos'), PE=g(s,'gastos_personal'), AM=g(s,'amortizaciones'), EB=g(s,'beneficio_explotacion'), BN=g(s,'beneficio_neto_atribuible');
    var c1='',c2='',c3='',c4='',c5='',c6='',c7='';
    if(!banca&&BASE.some(function(v){return v!=null;})){
      var RE=Y.map(function(_,k){ return -(z(BASE)[k]-z(EB)[k]+z(AP)[k]+z(PE)[k]+z(AM)[k]); }).map(function(v){ return Math.min(0,v); });
      var neg=function(L){ return L.map(function(v){ return v==null?null:-Math.abs(v); }); };
      var cv=cg(BASE[0],BASE[BASE.length-1]), col=cv!=null&&cv>=5?'v':(cv!=null&&cv>=0?'a':'r');
      c1=gcard('¿Crecen las ventas y cuánto se comen los gastos?',col,bn+' de '+n(BASE[0],0)+' a '+n(BASE[BASE.length-1],0)+' M€ ('+(cv!=null?pc(cv):'—')+' al año); beneficio neto de '+n(BN[0],0)+' a '+n(BN[BN.length-1],0)+' M€.',
        chartg(Y,[[bn,BASE,'#3B82F6']].concat(paso?[]:[['Compras y aprovisionamientos',neg(AP),'#FDBA74']]).concat([['Personal',neg(PE),'#F59E0B'],['Amortizaciones',neg(AM),'#94A3B8'],['Resto de gastos',RE,'#FCA5A5']]),['Beneficio neto',BN,'#15803D'],function(v){ return n(v,0); }),
        leg([[bn,'#3B82F6']].concat(paso?[]:[['Compras','#FDBA74']]).concat([['Personal','#F59E0B'],['Amortizaciones','#94A3B8'],['Resto de gastos','#FCA5A5'],['Beneficio neto (línea)','#15803D']])),nota(J.solvencia&&null,dh));
    }
    var ME=g(de,'margen_ebitda'), MB=g(de,'margen_ebit'), MN=g(de,'margen_neto');
    if(MB.some(function(v){return v!=null;})){ var mb=MB.filter(function(v){return v!=null;}).slice().sort(function(a,b){return a-b;}), med=mb[Math.floor(mb.length/2)], lst=MB[MB.length-1], col2=lst>=med-0.5?'v':(lst>=med-3?'a':'r');
      c2=gcard('¿Los márgenes crecen o se reducen?',col2,'Margen EBIT de '+n(lst,1)+' % en '+Y[Y.length-1]+', frente a una mediana de '+n(med,1)+' % en estos años: '+(col2==='v'?'en su nivel o mejor':'por debajo de lo habitual')+'.',
        lines(Y,[['Margen EBITDA',ME,'#7C3AED'],['Margen EBIT',MB,'#2563EB'],['Margen neto',MN,'#15803D']]),leg([['EBITDA','#7C3AED'],['EBIT','#2563EB'],['Neto','#15803D']]),nota(J.desempeno,dh)); }
    var RO=g(de,'roic'), RE2=g(de,'roe'), WA=g(de,'wacc');
    if(RO.some(function(v){return v!=null;})||RE2.some(function(v){return v!=null;})){ var r0=RO[RO.length-1]!=null?RO[RO.length-1]:RE2[RE2.length-1], w0=WA[WA.length-1], sp=(r0!=null&&w0!=null)?r0-w0:null, col3=sp!=null&&sp>=5?'v':(sp!=null&&sp>=0?'a':'r');
      c3=gcard('¿Gana más de lo que le cuesta el dinero?',w0==null?'n':col3,(RO[RO.length-1]!=null?'ROIC ':'ROE ')+n(r0,1)+' %'+(w0==null?' en '+Y[Y.length-1]+' (sin coste del capital calculado en esta ficha).':' frente a un coste del capital del '+n(w0,1)+' %: '+(sp>0?'crea valor':'no cubre su coste')+' ('+(sp>=0?'+':'')+n(sp,1)+' puntos).'),
        lines(Y,[['ROIC',RO,'#2563EB'],['ROE',RE2,'#0EA5E9'],['Coste del capital (WACC)',WA,'#DC2626']]),leg([['ROIC','#2563EB'],['ROE','#0EA5E9'],['Coste del capital (discontinua)','#DC2626']])); }
    var FL=g(fl,'fcl_recurrente'), DV=g(fl,'dividendo').map(function(v){ return v==null?null:-Math.abs(v); }), CB=g(fl,'cobertura');
    if(FL.some(function(v){return v!=null;})){ var SB=Y.map(function(_,k){ return z(FL)[k]+z(DV)[k]; }), cbl=CB[CB.length-1], col4=cbl!=null&&cbl>=1.2?'v':(cbl!=null&&cbl>=1?'a':'r');
      c4=gcard('¿El flujo de caja libre paga el dividendo?',col4,'En '+Y[Y.length-1]+' le quedan '+n(FL[FL.length-1],0)+' M€ libres y paga '+n(-z(DV)[DV.length-1],0)+' M€ de dividendo: '+(SB[SB.length-1]>=0?'sobran ':'faltan ')+n(Math.abs(SB[SB.length-1]),0)+' M€'+(cbl!=null?' (lo cubre '+n(cbl,1)+' veces)':'')+'.',
        chartg(Y,[['Flujo de caja libre',FL,'#0EA5E9'],['Dividendo del ejercicio',DV,'#8B5CF6']],['Lo que sobra',SB,'#15803D'],function(v){ return n(v,0)+' M€'; },[CB,function(v){ return n(v,1)+'x'; },'#475569','Cubre el dividendo: ']),
        leg([['Flujo de caja libre','#0EA5E9'],['Dividendo del ejercicio','#8B5CF6'],['Lo que sobra (línea)','#15803D'],['Arriba: veces que lo cubre','#475569']]),nota(J.flujos,dh)); }
    var CR=g(fl,'caja_recurrente'), CT=g(fl,'capex').map(function(v){ return v==null?null:Math.abs(v); }), CM=g(fl,'capex_mant').map(function(v){ return v==null?null:Math.abs(v); });
    if(CR.some(function(v){return v!=null;})&&CT.some(function(v){return v!=null;})){ var MNt=Y.map(function(_,k){ return Math.min(z(CM)[k],z(CT)[k]); }), CC=Y.map(function(_,k){ return z(CT)[k]-MNt[k]; }), RS=Y.map(function(_,k){ return Math.max(0,z(CR)[k]-z(CT)[k]); }), PC=Y.map(function(_,k){ return CR[k]?CT[k]/CR[k]*100:null; }), pl=PC[PC.length-1], col5=pl!=null&&pl<=30?'v':(pl!=null&&pl<=60?'a':'r');
      c5=gcard('¿Cuánto de la caja que genera se va en invertir?',col5,'En '+Y[Y.length-1]+' invirtió '+n(CT[CT.length-1],0)+' M€, el '+n(pl,0)+' % de su caja de explotación ('+n(CR[CR.length-1],0)+' M€).',
        chartg(Y,[['Capex de mantenimiento',MNt,'#64748B'],['Capex de crecimiento',CC,'#3B82F6'],['Caja que queda libre',RS,'#BAE6FD']],null,function(v){ return n(v,0)+' M€'; },[PC,function(v){ return n(v,0)+'%'; },'#475569','Capex / caja: ']),
        leg([['Mantenimiento','#64748B'],['Crecimiento','#3B82F6'],['Resto de la caja','#BAE6FD'],['Arriba: % de la caja a capex','#475569']])); }
    var DBt=g(so,'deuda_bruta'), CJ=g(so,'caja').map(function(v){ return v==null?null:-Math.abs(v); }), DN=g(so,'deuda_neta'), DE=g(so,'dn_ebitda');
    if(!banca&&DBt.some(function(v){return v!=null;})){ var dl=DE[DE.length-1], col6=dl!=null&&dl<=2?'v':(dl!=null&&dl<=3?'a':'r'), fx=function(v){ return (Math.abs(v)<0.05?'0,0':n(v,1))+'x'; }, dn=DN[DN.length-1];
      c6=gcard('¿Cuánta deuda tiene y puede pagarla?',col6,'Debe '+n(DBt[DBt.length-1],0)+' M€ y tiene '+n(-z(CJ)[CJ.length-1],0)+' M€ en caja: '+(dn>0?'deuda neta de '+n(dn,0)+' M€, '+fx(dl)+' el EBITDA.':'le sobra caja ('+n(-dn,0)+' M€).'),
        chartg(Y,[['Deuda financiera',DBt,'#DC2626'],['Caja',CJ,'#16A34A']],['Deuda neta',DN,'#0F172A'],function(v){ return n(v,0)+' M€'; },[DE,fx,'#475569','Deuda neta / EBITDA: ']),
        leg([['Deuda (arriba)','#DC2626'],['Caja (abajo)','#16A34A'],['Deuda neta (línea)','#0F172A'],['Arriba: veces el EBITDA','#475569']]),nota(J.solvencia,dh)); }
    var BP=g(s,'bpa_basico'), DP=g(fl,'dpa');
    if(BP.some(function(v){return v!=null;})){ var cbp=cg(BP[0],BP[BP.length-1]), col7=cbp!=null&&cbp>=5?'v':(cbp!=null&&cbp>=0?'a':'r');
      c7=gcard('¿Y por acción, que es lo que cobras tú?',col7,'Beneficio por acción de '+n(BP[0],2)+' a '+n(BP[BP.length-1],2)+' € ('+(cbp!=null?pc(cbp):'—')+' al año); dividendo de '+n(DP[0],2)+' a '+n(DP[DP.length-1],2)+' €.',
        chartg(Y,[['Beneficio por acción',BP,'#1F4A9A']],['Dividendo por acción',DP,'#8B5CF6'],function(v){ return n(v,2)+' €'; }),leg([['Beneficio por acción (barras)','#1F4A9A'],['Dividendo por acción (línea)','#8B5CF6']])); }
    var C=[c1,c2,c3,c7,c4,c5,c6].filter(Boolean), h='';
    for(var i=0;i<C.length;i+=2) h+='<div class="nf-g2">'+C[i]+(C[i+1]||'<div></div>')+'</div>';
    return out+h+'<span class="nf-ws">Las mismas gráficas para todas las empresas, de sus fichas del método (diez años hasta '+esc(dh||'')+'). El color de cada una lo pone una regla fija; las notas, el analista con su fecha.</span>';
  }

  /* ---------------- COTIZACIÓN (la gráfica de la app, con banda/PO/stop por revisión) ---------------- */
  var _fvHome=null;
  function cotizacion(t){ return '<div id="nfCotHost"></div><span class="nf-ws">La gráfica de siempre de la app. La banda de entrada, el PO y el stop de cada revisión se congelan desde su fecha: sirve de control del método.</span>'; }
  function montarCot(t){
    var host=document.getElementById('nfCotHost'), fv=document.getElementById('fichaView'); if(!host||!fv||typeof drawFichaChart!=='function') return;
    if(!_fvHome){ _fvHome={p:fv.parentNode,n:fv.nextSibling}; }
    try{ fichaTicker=t; }catch(e){}
    var ranges=[['1s','1S'],['1m','1M'],['3m','3M'],['1a','1A'],['5a','5A'],['all','Máx']];
    var rb=''; try{ rb=ranges.map(function(r){ return _fichaRangeBtn(r[0],r[1],'·','#94a3b8',fichaRange===r[0]); }).join(''); }catch(e){}
    var vb=''; try{ vb=_FICHA_VISTAS.map(function(v){ return '<button type="button" data-fvista="'+v[0]+'"'+(fichaVista===v[0]?' class="on"':'')+' style="font-size:11px;padding:2px 7px" title="'+v[2]+'">'+v[1]+'</button>'; }).join(''); }catch(e){}
    var mb=''; try{ mb=_fichaModBtnsHTML(); }catch(e){}
    var tit='Cotización'; try{ tit=_FICHA_VISTA_TIT[fichaVista]||tit; }catch(e){}
    fv.innerHTML='<div class="card" style="margin-top:0"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px"><div style="font-weight:700" id="fchTit">'+tit+'</div><span id="fchNota" style="font-size:11px;color:#64748b"></span><div style="width:14px"></div><div class="seg" id="fchVista">'+vb+'</div><div class="seg" id="fchMod">'+mb+'</div><span id="fchZoom"></span><span id="fchVar"></span><div style="flex:1"></div><div id="fchRange" style="display:flex;gap:5px;align-items:center">'+rb+'</div></div><div id="fichaChart" style="min-height:180px">Cargando cotización…</div></div>';
    fv.style.display='block'; fv.style.paddingTop='0'; fv.classList.add('nf-embed'); host.appendChild(fv);
    drawFichaChart(t);
  }
  function soltarCot(){ var fv=document.getElementById('fichaView'); if(!fv||!_fvHome||!fv.classList.contains('nf-embed')) return; fv.classList.remove('nf-embed'); fv.innerHTML=''; fv.style.display='none'; fv.style.paddingTop=''; _fvHome.p.insertBefore(fv,_fvHome.n); }
  window.nfSoltarCot=soltarCot;

  /* ---------------- DIVIDENDO ---------------- */
  function dividendo(F){
    var fl=(F.series||{}).flujos||{}, ds=F.seguridad_dividendo||{}, h='';
    var Y=Object.keys(fl.dpa||{}).sort(), ord=fl.dpa_ordinario||{}, ex1=fl.dpa_extra_puntual||{}, ex2=fl.dpa_extra_recurrente||{};
    if(ds.score!=null){ var col=ds.score>=60?'v':(ds.score>=40?'a':'r');
      var comp=ds.componentes||{}, CN={C1:['Cobertura con caja (owner earnings)',35],C2:['Payout sobre beneficio',15],C3:['Balance',20],C4:['Trayectoria del dividendo (recortes)',15],C5:['Señales de peligro',15]};
      h+=card('Salud del dividendo','nota de seguridad 0-100 · Bloque 4',vd(col,'<b>'+esc(ds.banda||'')+' · '+ds.score+' de 100.</b> '+esc(String(ds.texto||'').replace(/^[^:]*:\s*/,'')))+
        '<div class="nf-escala"><i style="left:'+Math.min(100,Math.max(0,ds.score))+'%"></i><span>0 · recorte probable</span><span>40 · frágil</span><span>60 · seguro</span><span>100</span></div>'+
        (Object.keys(comp).length?'<div class="nf-kv">'+Object.keys(comp).map(function(k){ var c=CN[k]||[k,null]; return '<span>'+c[0]+'</span><b>'+comp[k]+(c[1]?' de '+c[1]:'')+'</b>'; }).join('')+'</div>':'')+(ds.tope?vd('r','Tope duro activo: no contar como renta estable.'):'')+nota(F.juicios&&F.juicios.flujos,F.datos_hasta)); }
    if(Y.length){ var vals=Y.map(function(y){ return +fl.dpa[y]||0; }), mx=Math.max.apply(null,vals.concat([0.01])), W=600,H=230,x0=40,x1=590,bw=(x1-x0)/Y.length, sv='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs" style="max-width:720px">';
      Y.forEach(function(y,k){ var o=+(ord[y]!=null?ord[y]:fl.dpa[y])||0, e=(+ex1[y]||0)+(+ex2[y]||0), t=+fl.dpa[y]||0; if(o+e>t+1e-6) e=Math.max(0,t-o);
        var hO=o/mx*170, hE=e/mx*170, x=x0+k*bw+bw*0.15, w=bw*0.7;
        sv+='<rect x="'+x.toFixed(1)+'" y="'+(200-hO).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+hO.toFixed(1)+'" fill="#8B5CF6" rx="2"/>';
        if(hE>0) sv+='<rect x="'+x.toFixed(1)+'" y="'+(200-hO-hE).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+hE.toFixed(1)+'" fill="#C4B5FD" rx="2"/>';
        sv+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(194-hO-hE).toFixed(1)+'" font-size="11" font-weight="700" text-anchor="middle" fill="#334155">'+n(t,2)+'</text><text x="'+(x+w/2).toFixed(1)+'" y="218" font-size="11" text-anchor="middle" fill="#5B6B7C">'+y+'</text>'; });
      sv+='</svg>';
      var pag=0; for(var i=Y.length-1;i>=0;i--){ if((+fl.dpa[Y[i]]||0)>0) pag++; else break; }
      var sube=0; for(var j=1;j<Y.length;j++) if((+fl.dpa[Y[j]]||0)>(+fl.dpa[Y[j-1]]||0)+1e-9) sube++;
      h+=card('Historia del dividendo','por ejercicio · serie del método','<div class="nf-chips2"><span>'+pag+' años pagando</span><span>Sube '+sube+' de '+(Y.length-1)+' años</span></div>'+sv+leg([['Ordinario','#8B5CF6'],['Extraordinario','#C4B5FD']])); }
    var k=[['Payout sobre beneficio',last(fl.payout_bn),'%'],['Payout sobre caja libre',last(fl.payout_fcl),'%'],['Veces que lo cubre la caja',last(fl.cobertura),'x'],['Rentabilidad por dividendo',last(fl.rpd),'%'],['Rentabilidad total al accionista',last(fl.shareholder_yield),'%']].filter(function(x){ return x[1]!=null; });
    if(k.length) h+=card('Lo que vuelve al accionista','último ejercicio','<div class="nf-kv">'+k.map(function(x){ return '<span>'+x[0]+'</span><b>'+n(x[1],x[2]==='x'?2:1)+(x[2]==='x'?'x':' %')+'</b>'; }).join('')+'</div>');
    return h||card('Dividendo','',vd('a','Sin datos de dividendo.'));
  }

  /* ---------------- MI POSICIÓN (de la app) ---------------- */
  function posicion(F,t){
    var P=[]; try{ P=invPositions().filter(function(p){ return String(p.ticker||'').toUpperCase()===t&&(+p.acciones||0)>0.0001; }); }catch(e){}
    var ops=(DB.operaciones||[]).filter(function(o){ return String(o.ticker||'').toUpperCase()===t; }).sort(function(a,b){ return (a.fecha||'')<(b.fecha||'')?-1:1; });
    if(!P.length&&!ops.length) return card('Mi posición','',vd('n','No la tienes ni la has tenido.'));
    var acc=P.reduce(function(s,p){ return s+(+p.acciones||0); },0), coste=P.reduce(function(s,p){ return s+(+p.acciones||0)*(+p.precioCompra||0); },0), c=cot(t), val=acc*c, pm=acc?coste/acc:0;
    var cob=0, porA={}; ((DB.dividendos||{})[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(typeof divEsCobrado==='function'&&!divEsCobrado(d)) return; var sh=(typeof _calSharesAt==='function')?_calSharesAt(t,f,true):0; var gq=sh*(+d.importe||0); if(gq>0){ cob+=gq; porA[f.slice(0,4)]=(porA[f.slice(0,4)]||0)+gq; } });
    var V={precio:c,stop:(F.tesis||{}).stop,entMin:(F.tesis||{}).entrada_min,entMax:(F.tesis||{}).entrada_max,poBase:(F.tesis||{}).po_base,poBull:(F.tesis||{}).po_bull,pmedio:pm};
    var h=card('Mi posición','de la app',(acc?'<div class="nf-kv"><span>Acciones</span><b>'+n(acc,0)+'</b><span>Precio medio</span><b>'+eu(pm,4)+'</b><span>Valor hoy</span><b>'+eu(val)+'</b><span>Plusvalía</span><b class="'+(val>=coste?'pos':'neg')+'">'+eu(val-coste)+' ('+pc(coste?(val/coste-1)*100:0)+')</b><span>Dividendos cobrados (bruto)</span><b>'+eu(cob)+'</b></div>':vd('n','Ya no la tienes.'))+
      (acc&&window.nRegla?window.nRegla(V,{peq:1})+'<span class="nf-ws">La raya discontinua es tu precio medio.</span>':''));
    h+=card('Operaciones','compras y ventas','<div class="nf-tw"><table class="nf-t"><tr><th>Fecha</th><th>Tipo</th><th>Acciones</th><th>Precio</th><th>Cartera</th></tr>'+ops.map(function(o){ return '<tr><td>'+fe(o.fecha)+'</td><td>'+esc(o.tipo)+'</td><td>'+n(o.acciones,0)+'</td><td>'+(+o.precio>0?eu(o.precio,3):'0 € (liberadas)')+'</td><td>'+esc(o.cartera||'')+'</td></tr>'; }).join('')+'</table></div>');
    var ys=Object.keys(porA).sort(); if(ys.length) h+=card('Dividendos cobrados por año','bruto, año natural · de la app','<div class="nf-kv">'+ys.map(function(y){ return '<span>'+y+'</span><b>'+eu(porA[y])+'</b>'; }).join('')+'</div>');
    return h;
  }

  /* ---------------- REVISIONES E HISTORIAL ---------------- */
  function revisiones(F,t){
    var V=F.vigilancia||{}, S=V.semaforo_empresa||{}, I=S.intermedios||{}, E=S.ejercicios||{}, H=V.historico_revisiones||{}, JV=F.juicio_vigilancia||{}, NP=JV.notas_periodo||{}, h='';
    var ys={}; Object.keys(I).concat(Object.keys(E)).forEach(function(k){ ys[k.slice(0,4)]=1; }); var YS=Object.keys(ys).sort().reverse();
    var cell=function(k){ var x=I[k]||E[k]; if(!x) return '<td class="nf-sx">—</td>'; var f=x.final||x.automatico, c={V:'#16A34A',A:'#F59E0B',R:'#DC2626'}[f]||'#CBD5E1', cor=x.final&&x.automatico&&x.final!==x.automatico;
      var tx=(H[k]&&H[k].texto)||''; return '<td class="nf-sx" title="'+esc(tx)+'"><i style="background:'+c+'"></i>'+(cor?'✎':'')+'</td>'; };
    if(YS.length) h+=card('Semáforo de cada resultado','verde · ámbar · rojo · ✎ = corregido por el analista · pasa el ratón para leerlo','<div class="nf-tw"><table class="nf-sem"><tr><th>Año</th><th>1T</th><th>Semestre</th><th>9 meses</th><th>Año</th></tr>'+YS.map(function(y){ return '<tr><td><b>'+y+'</b></td>'+cell(y+'-3M')+cell(y+'-S1')+cell(y+'-9M')+cell(y)+'</tr>'; }).join('')+'</table></div>');
    var ord=function(k){ var y=+k.slice(0,4), p=k.slice(5); return y*10+({'3M':1,'S1':2,'9M':3}[p]||4); };
    var ks=Object.keys(H).sort(function(a,b){ return ord(b)-ord(a); }).slice(0,8);
    var bo=function(x){ return esc(x||'').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>'); };
    if(ks.length) h+=card('Notas del analista de cada periodo','las 8 últimas',ks.map(function(k){ var x=H[k], c={V:'#16A34A',A:'#F59E0B',R:'#DC2626'}[x.semaforo]||'#94A3B8'; return '<div class="nf-np" style="border-left-color:'+c+'"><b>'+esc(k)+'</b> '+bo(x.texto)+(NP[k]?'<div class="nf-mu">'+bo(NP[k])+'</div>':'')+(x.correccion?'<div class="nf-mu">✎ '+bo(x.correccion)+'</div>':'')+'</div>'; }).join(''));
    var sen=(V.senales||[]).concat(V.senales_cerradas||[]), dec=(window._nDecV3||{})[t]||[];
    if(sen.length||dec.length) h+=card('Señales y decisiones','',(sen.length?'<div class="nf-tw"><table class="nf-t"><tr><th>Señal</th><th>Estado</th><th>Motivo</th></tr>'+sen.map(function(s){ return '<tr><td><b>'+esc(s.senal)+'</b></td><td>'+esc(s.estado||(s.hasta?'cerrada el '+fe(s.hasta):''))+'</td><td>'+esc(s.motivo||'')+'</td></tr>'; }).join('')+'</table></div>':'')+
      (dec.length?'<h3>Tus decisiones</h3>'+dec.slice().reverse().map(function(d){ return '<div class="nf-np" style="border-left-color:#7C3AED"><b>'+esc(d.fecha)+' · '+esc(d.senal)+' · '+esc(d.decision)+'</b> '+esc(d.motivo||'')+'</div>'; }).join(''):''));
    return h||card('Revisiones e historial','',vd('a','Sin historial de vigilancia.'));
  }

  /* ---------------- NOTICIAS Y COYUNTURA ---------------- */
  function noticias(F,t){
    var sem=F.semanal||[], s0=sem[0], h='';
    if(s0){ var cc={verde:'v',ambar:'a','ámbar':'a',rojo:'r'}[String(s0.coyuntura||'').toLowerCase()]||'n';
      h+=card('Esta semana','informe semanal del '+fe(s0.fecha),vd(cc,esc(s0.veredicto||''))+((s0.vigilar||[]).length?'<h3>Qué vigilar</h3><ul class="nf-ul">'+s0.vigilar.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>':'')); }
    var L=[];
    /* hechos: los del registro de hallazgos (informe semanal y alertas del universo), con su fuente */
    var HZ=((window._nfHall||{})[t]||{}).hallazgos||[];
    var dom=function(u){ var m=/^https?:\/\/(?:www\.)?([^\/]+)/.exec(u||''); return m?m[1]:(u||''); };
    HZ.forEach(function(x){ var r=String(x.resumen||'').split(/(?<=\.)\s/)[0]; L.push({f:x.abiertoEl||x.fecha,k:'HECHO',c:'#1F4A9A',tx:r,src:dom(x.fuente),hecho:1});
      if(x.ultimaNovedad&&x.ultimaNovedad.texto&&x.ultimaNovedad.fecha!==x.abiertoEl) L.push({f:x.ultimaNovedad.fecha,k:'HECHO',c:'#1F4A9A',tx:x.ultimaNovedad.texto,src:'',hecho:1}); });
    sem.forEach(function(s){ L.push({f:s.fecha,k:'INFORME SEMANAL',c:'#16A34A',tx:s.veredicto||''}); });
    ((window._nDecV3||{})[t]||[]).forEach(function(d){ L.push({f:d.fechaIso||'',k:'TU DECISIÓN',c:'#7C3AED',tx:d.senal+' · '+d.decision+': '+(d.motivo||'')}); });
    var vist={}; L=L.filter(function(x){ var k=x.f+x.k+x.tx; if(vist[k]) return false; vist[k]=1; return true; }).sort(function(a,b){ return a.f<b.f?1:-1; });
    h+=card('Cronología','de lo más reciente a lo más antiguo',L.length?L.map(function(x){ return '<div class="nf-cr"><span class="nf-crd"><i style="background:'+x.c+'"></i>'+fe(x.f)+'</span><span class="nf-crt" style="color:'+x.c+'">'+x.k+'</span><span class="nf-crb">'+esc(x.tx)+(x.src?' <span class="nf-mu">· '+esc(x.src)+'</span>':'')+(x.hecho?' <span class="n-prvg nf-prvh" data-nprv="'+t+'" data-nprvh="'+esc(fe(x.f)+' · '+x.tx.slice(0,120))+'">🔍 Pedir revisión por esto</span>':'')+'</span></div>'; }).join(''):'<div class="nf-mu">Nada registrado todavía.</div>');
    return h;
  }

  /* ---------------- montaje ---------------- */
  var TABS=[['res','Resumen'],['emp','La empresa'],['neg','Cómo va la empresa'],['cot','Cotización'],['div','Dividendo'],['pos','Mi posición'],['his','Revisiones e historial'],['not','Noticias y coyuntura']];
  function pintar(){
    var v=document.getElementById('view-fichaemp'); if(!v) return;
    var L=lista(); if(!cur) cur=(L[0]||[])[0]; if(!cur){ v.innerHTML='<div class="nf-mu">Sin empresas analizadas.</div>'; return; }
    var i=L.map(function(x){return x[0];}).indexOf(cur), prev=L[(i-1+L.length)%L.length], next=L[(i+1)%L.length];
    var pick='<div class="nf-pick"><div class="nf-bus"><input id="nfBus" type="search" autocomplete="off" placeholder="🔎 Escribe ticker o nombre (LO → Logista)"><div id="nfSug" class="nf-sug"></div></div><select id="nfSel">'+L.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+esc(x[1])+' ('+x[0]+')</option>'; }).join('')+'</select><button data-nfgo="'+(prev||[])[0]+'">◀ '+esc((prev||[])[0]||'')+'</button><button data-nfgo="'+(next||[])[0]+'">'+esc((next||[])[0]||'')+' ▶</button></div>';
    soltarCot(); v.innerHTML=pick+'<div class="nf-mu" style="padding:20px">Cargando la ficha de '+esc(cur)+'…</div>';
    var t=cur;
    cargar(t).then(function(F){ if(t!==cur) return;
      if(!F){ v.innerHTML=pick+'<div class="nf-card">'+vd('a','La ficha de '+esc(t)+' todavía no está publicada (fichas/'+esc(t)+'.json).')+'</div>'; return; }
      var b={res:resumen,emp:empresa,neg:comoVa,cot:cotizacion,div:dividendo,pos:posicion,his:revisiones,not:noticias}[tab];
      var body=''; try{ body=b(F,t); }catch(e){ console.error('n-ficha',e); body=vd('r','No se pudo pintar esta pestaña: '+esc(e.message)); }
      v.innerHTML=pick+hero(F,t)+'<div class="nf-tabs">'+TABS.map(function(x){ return '<span data-nftab="'+x[0]+'" class="'+(x[0]===tab?'on':'')+'">'+x[1]+'</span>'; }).join('')+'</div><div class="nf-body">'+body+'</div>'+
        (F._evNota?'<div class="nf-pie" style="color:#1F4A9A">↔️ '+esc(F._evNota)+'</div>':'')+'<div class="nf-pie">Ficha generada por el método el '+esc(String(F.generado||'').replace('T',' '))+(F.datos_hasta?' · cuentas hasta '+esc(F.datos_hasta):'')+'</div>';
      if(tab==='cot') montarCot(t);
    });
  }
  window.nfAbrir=function(t){ if(t) cur=String(t).toUpperCase(); tab='res'; if(typeof activarVista==='function') activarVista('fichaemp'); pintar(); window.scrollTo(0,0); };
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-nftab]'); if(a){ tab=a.getAttribute('data-nftab'); pintar(); return; }
    var g=e.target.closest&&e.target.closest('[data-nfgo]'); if(g){ cur=g.getAttribute('data-nfgo'); tab=tab==='cot'?'cot':tab; pintar(); return; }
  });
  document.addEventListener('change',function(e){ if(e.target&&e.target.id==='nfSel'){ cur=e.target.value; pintar(); } });
  /* 30-oct (Carlos): buscador que predice al escribir — por ticker (empieza por) y por nombre (contiene), sin acentos */
  var _sugI=0;
  function norm(x){ return String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function sugerir(){ var i=document.getElementById('nfBus'), b=document.getElementById('nfSug'); if(!i||!b) return; var q=norm(i.value.trim());
    if(!q){ b.innerHTML=''; b.style.display='none'; return; }
    var L=lista().map(function(x){ var t=norm(x[0]), n=norm(x[1]), s=t===q?0:(t.indexOf(q)===0?1:(n.indexOf(q)===0?2:(n.indexOf(' '+q)>=0?3:(n.indexOf(q)>=0||t.indexOf(q)>=0?4:9)))); return [x,s]; }).filter(function(z){ return z[1]<9; }).sort(function(a,c){ return a[1]-c[1]||a[0][1].localeCompare(c[0][1]); }).slice(0,8);
    _sugI=0; b.innerHTML=L.length?L.map(function(z,k){ return '<div class="nf-sgi'+(k===0?' on':'')+'" data-nfsug="'+z[0][0]+'"><b>'+esc(z[0][0])+'</b> '+esc(z[0][1])+'</div>'; }).join(''):'<div class="nf-sgi nf-mu">Ninguna analizada con «'+esc(i.value)+'»</div>'; b.style.display='block'; }
  function elegir(t){ if(!t) return; cur=t; pintar(); }
  document.addEventListener('input',function(e){ if(e.target&&e.target.id==='nfBus') sugerir(); });
  document.addEventListener('keydown',function(e){ if(!e.target||e.target.id!=='nfBus') return; var it=[].slice.call(document.querySelectorAll('#nfSug [data-nfsug]')); if(!it.length) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); _sugI=(_sugI+(e.key==='ArrowDown'?1:-1)+it.length)%it.length; it.forEach(function(x,k){ x.classList.toggle('on',k===_sugI); }); }
    else if(e.key==='Enter'){ e.preventDefault(); elegir(it[_sugI].getAttribute('data-nfsug')); }
    else if(e.key==='Escape'){ e.target.value=''; sugerir(); } });
  document.addEventListener('mousedown',function(e){ var s=e.target.closest&&e.target.closest('[data-nfsug]'); if(s){ e.preventDefault(); elegir(s.getAttribute('data-nfsug')); } });
  /* tooltips de las gráficas */
  var tip=null; document.addEventListener('mousemove',function(e){ var r=e.target.closest&&e.target.closest('rect.nf-hv'); if(!tip){ tip=document.createElement('div'); tip.className='nf-tip'; document.body.appendChild(tip); }
    if(!r){ tip.style.display='none'; return; } var p=r.getAttribute('data-tip').split('|'); tip.innerHTML='<b>'+p[0]+'</b>'+p.slice(1).join('<br>'); tip.style.display='block'; tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._nf) return; var oa=activarVista; activarVista=function(v){ if(v!=='fichaemp') soltarCot(); var r=oa.apply(this,arguments); if(v==='fichaemp') pintar(); return r; }; activarVista._nf=1; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
