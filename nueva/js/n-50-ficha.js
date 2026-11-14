/* APP NUEVA · EMPRESAS → FICHA DE EMPRESA (boceto v30, 30-oct-2026, Carlos: «es una maravilla, me encanta»).
   Regla del diseño (30-oct): todo sale de la ficha de la empresa (fichas/TK.json, que deja el método con exportar_ficha.py);
   la app NO razona: pinta las cifras y aplica reglas fijas. Las notas de juicio llevan su fecha y la app avisa si se quedan viejas.
   Pestañas: Resumen · La empresa · Cómo va la empresa · Ratios (4-nov) · Cotización · Dividendo · Mi posición · Revisiones e historial ·
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
  /* 6-nov-2026 (Carlos: «formato más fácil de leer» para las notas del analista): cada apartado («### Título» o «**Qué ha pasado** —»)
     empieza en su propio párrafo, y se pinta con md() (títulos, negritas, listas, tablas) */
  function notaMd(t){
    t=String(t||'').replace(/\s*(#{2,6} )/g,'\n\n$1').replace(/(#{2,6} [^\n]*?\))\s+/g,'$1\n\n').replace(/([.)»!?])\s+(\*\*[^*\n]{2,70}\*\*\s*[—.:])/g,'$1\n\n$2');
    return md(t);
  }
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
      h+='<polyline fill="none" stroke="'+s[2]+'" stroke-width="2.5"'+(/^(Coste del capital|Mínimo|Mediana)/.test(s[0])?' stroke-dasharray="5 4"':'')+' points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>'+pts.map(function(p){ return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="#fff" stroke="'+s[2]+'" stroke-width="2"/>'; }).join('');
      var l=pts[pts.length-1]; h+='<text x="'+(l[0]-4).toFixed(1)+'" y="'+(l[1]-8).toFixed(1)+'" font-size="10.5" font-weight="800" text-anchor="end" fill="'+s[2]+'">'+fmt(l[2])+'</text>'; });
    Y.forEach(function(y,k){ var parts=series.filter(function(s){return s[1][k]!=null;}).map(function(s){ return s[0]+': '+fmt(s[1][k]); }); h+='<rect class="nf-hv" x="'+(x0+k*bw).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+esc(y+'|'+parts.join('|'))+'"/>'; });
    return h+'</svg>';
  }
  function leg(it){ return '<div class="nf-lg">'+it.map(function(x){ return '<span><i style="background:'+x[1]+'"></i>'+x[0]+'</span>'; }).join('')+'</div>'; }
  function gcard(q,col,ver,svg,lg,nt){ return '<div class="nf-card"><h2>'+q+'</h2>'+vd(col,ver)+svg+lg+(nt||'')+'</div>'; }
  function comoVa(F){
    var S=F.series||{}, s=S.serie||{}, de=S.desempeno||{}, fl=S.flujos||{}, so=S.solvencia||{};
    var yy={}; [fl.fcl_recurrente,fl.cfo,fl.dpa,de.margen_ebit,de.roe,s.ingresos,s.bpa_basico].forEach(function(o){ Object.keys(o||{}).forEach(function(y){ if(/^\d{4}$/.test(y)) yy[y]=1; }); });
    /* 6-nov-2026 (Carlos): se ven todos los años desde 2016; los colores y las frases se calculan con los diez últimos (k0) */
    var Y=Object.keys(yy).sort().filter(function(y){ return y>='2016'; }), k0=Math.max(0,Y.length-10);
    if(Y.length<3) return card('Cómo va la empresa','',vd('a','Esta empresa aún no tiene las series de diez años del método.'));
    var g=function(o,k){ var x=o[k]||{}; return Y.map(function(y){ var v=x[y]; return v==null?null:+v; }); }, z=function(L){ return L.map(function(v){ return v==null?0:v; }); };
    var banca=/BAN|SEG/.test(String(F.modelo||'')), paso=(F.modulos||[]).indexOf('PASO')>=0, J=F.juicios||{}, dh=F.datos_hasta, ny=+Y[Y.length-1]-(+Y[k0]);
    var cg=function(a,b){ return (a>0&&b>0&&ny>0)?(Math.pow(b/a,1/ny)-1)*100:null; }, out='';
    if(banca) out+=vd('a','Bancos y aseguradoras: su base propia de gráficas está pendiente (se hará con Santander). Abajo, lo que se puede leer igual que en las demás.');
    var BASE=paso?g(s,'ventas_economicas'):g(s,'ingresos'), bn=paso?'Ventas económicas':'Ventas', AP=paso?Y.map(function(){return null;}):g(s,'aprovisionamientos'), PE=g(s,'gastos_personal'), AM=g(s,'amortizaciones'), EB=g(s,'beneficio_explotacion'), BN=g(s,'beneficio_neto_atribuible');
    var c1='',c2='',c3='',c4='',c5='',c6='',c7='';
    if(!banca&&BASE.some(function(v){return v!=null;})){
      var RE=Y.map(function(_,k){ return -(z(BASE)[k]-z(EB)[k]+z(AP)[k]+z(PE)[k]+z(AM)[k]); }).map(function(v){ return Math.min(0,v); });
      var neg=function(L){ return L.map(function(v){ return v==null?null:-Math.abs(v); }); };
      var cv=cg(BASE[k0],BASE[BASE.length-1]), col=cv!=null&&cv>=5?'v':(cv!=null&&cv>=0?'a':'r');
      c1=gcard('¿Crecen las ventas y cuánto se comen los gastos?',col,bn+' de '+n(BASE[k0],0)+' en '+Y[k0]+' a '+n(BASE[BASE.length-1],0)+' M€ ('+(cv!=null?pc(cv):'—')+' al año); beneficio neto de '+n(BN[k0],0)+' a '+n(BN[BN.length-1],0)+' M€.',
        chartg(Y,[[bn,BASE,'#3B82F6']].concat(paso?[]:[['Compras y aprovisionamientos',neg(AP),'#FDBA74']]).concat([['Personal',neg(PE),'#F59E0B'],['Amortizaciones',neg(AM),'#94A3B8'],['Resto de gastos',RE,'#FCA5A5']]),['Beneficio neto',BN,'#15803D'],function(v){ return n(v,0); }),
        leg([[bn,'#3B82F6']].concat(paso?[]:[['Compras','#FDBA74']]).concat([['Personal','#F59E0B'],['Amortizaciones','#94A3B8'],['Resto de gastos','#FCA5A5'],['Beneficio neto (línea)','#15803D']])),nota(J.solvencia&&null,dh));
    }
    var ME=g(de,'margen_ebitda'), MB=g(de,'margen_ebit'), MN=g(de,'margen_neto');
    if(MB.some(function(v){return v!=null;})){ var mb=MB.slice(k0).filter(function(v){return v!=null;}).slice().sort(function(a,b){return a-b;}), med=mb[Math.floor(mb.length/2)], lst=MB[MB.length-1], col2=lst>=med-0.5?'v':(lst>=med-3?'a':'r');
      c2=gcard('¿Los márgenes crecen o se reducen?',col2,'Margen EBIT de '+n(lst,1)+' % en '+Y[Y.length-1]+', frente a una mediana de '+n(med,1)+' % en sus diez últimos años: '+(col2==='v'?'en su nivel o mejor':'por debajo de lo habitual')+'.',
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
    if(BP.some(function(v){return v!=null;})){ var cbp=cg(BP[k0],BP[BP.length-1]), col7=cbp!=null&&cbp>=5?'v':(cbp!=null&&cbp>=0?'a':'r');
      c7=gcard('¿Y por acción, que es lo que cobras tú?',col7,'Beneficio por acción de '+n(BP[k0],2)+' en '+Y[k0]+' a '+n(BP[BP.length-1],2)+' € ('+(cbp!=null?pc(cbp):'—')+' al año); dividendo de '+n(DP[k0],2)+' a '+n(DP[DP.length-1],2)+' €.',
        chartg(Y,[['Beneficio por acción',BP,'#1F4A9A']],['Dividendo por acción',DP,'#8B5CF6'],function(v){ return n(v,2)+' €'; }),leg([['Beneficio por acción (barras)','#1F4A9A'],['Dividendo por acción (línea)','#8B5CF6']])); }
    /* 5-nov-2026 (Carlos: «tenemos un hueco al lado de cuánta deuda tiene… podríamos meter otro gráfico» → eligió «beneficio → caja»).
       ¿El beneficio se convierte en caja? Caja libre RECURRENTE (barras: la misma del método, sin los vaivenes del circulante; con la caja libre a secas Logista sale negativa en 2021 por el calendario del impuesto del tabaco), beneficio neto (línea) y, arriba, caja libre / beneficio. El color, con los tres últimos años juntos (un año suelto lo mueve el circulante): ≥ 80 % verde, ≥ 50 % ámbar. */
    var c8='', FCL=g(fl,'fcl_recurrente'), FB=g(fl,'fcl_bn');
    if(!banca&&FCL.some(function(v){return v!=null;})&&BN.some(function(v){return v!=null;})){
      var k3=Y.map(function(_,k){ return k; }).filter(function(k){ return FCL[k]!=null&&BN[k]!=null; }).slice(-3), sf=k3.reduce(function(a,k){ return a+FCL[k]; },0), sb=k3.reduce(function(a,k){ return a+BN[k]; },0),
          r3=sb>0?sf/sb*100:null, col8=r3!=null&&r3>=80?'v':(r3!=null&&r3>=50?'a':'r');
      c8=gcard('¿El beneficio se convierte en caja?',r3==null?'n':col8,(r3==null?'Sin beneficio positivo en los últimos años para comparar.':'En los tres últimos años ('+Y[k3[0]]+'-'+Y[k3[k3.length-1]]+') la caja libre recurrente sumó '+n(sf,0)+' M€ frente a '+n(sb,0)+' M€ de beneficio: el '+n(r3,0)+' %. '+(col8==='v'?'El beneficio es caja de verdad.':(col8==='a'?'Parte del beneficio no llega a caja.':'Buena parte del beneficio no llega a caja.'))),
        chartg(Y,[['Caja libre recurrente',FCL,'#0EA5E9']],['Beneficio neto',BN,'#15803D'],function(v){ return n(v,0)+' M€'; },[FB,function(v){ return n(v,0)+'%'; },'#475569','Caja libre / beneficio: ']),
        leg([['Caja libre recurrente (barras)','#0EA5E9'],['Beneficio neto (línea)','#15803D'],['Arriba: caja libre / beneficio','#475569']])); }
    var C=[c1,c2,c3,c7,c4,c5,c6,c8].filter(Boolean), h='';
    for(var i=0;i<C.length;i+=2) h+='<div class="nf-g2">'+C[i]+(C[i+1]||'<div></div>')+'</div>';
    h+=propias(F);
    h+=evHost(F);
    out=GUIA('')+out;
    return out+h+'<span class="nf-ws">Las mismas gráficas para todas las empresas, de sus fichas del método (desde 2016 hasta '+esc(dh||'')+'; el color y las frases, con los diez últimos años). El color de cada una lo pone una regla fija; las notas, el analista con su fecha.</span>';
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
    if(ks.length) h+=card('Notas del analista de cada periodo','las 8 últimas',ks.map(function(k){ var x=H[k], c={V:'#16A34A',A:'#F59E0B',R:'#DC2626'}[x.semaforo]||'#94A3B8'; return '<div class="nf-np" style="border-left-color:'+c+'"><b>'+esc(k)+'</b> '+bo(x.texto)+(NP[k]?'<div class="nf-mu nf-nota">'+notaMd(NP[k])+'</div>':'')+(x.correccion?'<div class="nf-mu">✎ '+bo(x.correccion)+'</div>':'')+'</div>'; }).join(''));
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

  /* ---------------- 3-nov-2026 (Carlos): COTIZACIÓN Y EV/EBITDA, con su lectura ----------------
     Del método: valoracion.serie_multiplos (por ejercicio: capitalización, valor de empresa con deuda neta, híbridos y minoritarios,
     EBITDA después de alquileres) y la media/mín/máx de 10 años (valoracion.multiplos.ev_ebitda). Cada mes: precio de cierre de
     mes × acciones del último ejercicio cerrado + (valor de empresa − capitalización) de ese ejercicio, entre su EBITDA. La app no
     razona: la lectura sale de reglas fijas sobre esas cifras. */
  /* 4-nov-2026 · GRÁFICAS PROPIAS de cada empresa (ficha.graficas_propias: las define el pase anual, las cifras las pone el
     motor desde serie.json). Se dibujan con las mismas piezas que las generales; la lectura es juicio con fecha. */
  function fmtU(u){ return function(v){ if(v==null) return '—'; if(Math.abs(v)<1e-9) v=0; return u==='x'?n(v,2)+'x':u==='%'?n(v,1)+' %':(u==='€'?n(v,2)+' €':(n(v,Math.abs(v)<10&&v%1?1:0)+(u?' '+u:''))); }; }
  function propias(F){
    var GP=F.graficas_propias; if(!GP) return '';
    var nom=esc(F.empresa||F.ticker||'');
    if(!(GP.graficas||[]).length) return GP.sin_graficas?'<h3 class="nf-gph">Lo propio de '+nom+'</h3>'+vd('n','Todavía sin gráficas propias: '+esc(GP.sin_graficas)):'';
    var vieja=GP.lectura_hasta&&GP.datos_hasta&&String(GP.datos_hasta)>String(GP.lectura_hasta);
    var C=GP.graficas.map(function(g){ var Y=g.anios, f=fmtU(g.unidad), ser=g.series.map(function(s){ return [s.nombre,s.v,s.color||'#1F4A9A']; });
      var svg=g.tipo==='lineas'?lines(Y,ser,f):chartg(Y,ser,g.linea?[g.linea.nombre,g.linea.v,g.linea.color||'#0F172A']:null,f,g.arriba?[g.arriba.v,fmtU(g.arriba.unidad),'#475569',g.arriba.nombre+': ']:null);
      var it=ser.map(function(s){ return [s[0],s[2]]; }); if(g.linea) it.push([g.linea.nombre+' (línea)',g.linea.color||'#0F172A']); if(g.arriba) it.push(['Arriba: '+g.arriba.nombre,'#475569']);
      return '<div class="nf-card"><h2>'+esc(g.pregunta)+'</h2>'+vd('n',esc(g.lectura||''))+svg+leg(it)+(g.nota?'<div class="nf-mu" style="font-size:11.5px;margin-top:4px">'+esc(g.nota)+'</div>':'')+'</div>'; });
    var h='<h3 class="nf-gph">Lo propio de '+nom+'</h3><div class="nf-mu" style="font-size:12.5px;margin:-4px 0 8px">Gráficas que solo tienen sentido para esta empresa, con los datos propios del método. Lecturas escritas el '+esc(fe(GP.escrito))+(GP.lectura_hasta?' con cuentas hasta '+esc(GP.lectura_hasta):'')+'.'+(vieja?' <b style="color:#B45309">Hay cuentas de '+esc(GP.datos_hasta)+': lecturas pendientes de revisar.</b>':'')+'</div>';
    for(var i=0;i<C.length;i+=2) h+='<div class="nf-g2">'+C[i]+(C[i+1]||'<div></div>')+'</div>';
    h+=GUIA('propias');
    if((GP.avisos||[]).length) h+='<div class="nf-mu" style="font-size:11.5px;color:#B45309">Pendiente para el pase anual: '+GP.avisos.map(esc).join(' · ')+'</div>';
    return h; }
  var GUIA_URL='guias/como-leer-como-va-la-empresa.pdf';
  function GUIA(k){ return '<div style="margin-top:8px;font-size:12.5px"><a href="'+GUIA_URL+(k==='ev'?'#page=9':(k==='propias'?'#page=13':(k==='ratios'?'#page=16':'')))+'" target="_blank" rel="noopener" style="color:#1F4A9A;font-weight:700;text-decoration:none">📘 Guía: qué se ve y cómo interpretar estas gráficas (PDF)</a></div>'; }
  function evHost(F){
    var V=F.valoracion||{}, SM=V.serie_multiplos, M=(V.multiplos||{}).ev_ebitda;
    if(!SM||!M||!M.media) return /BAN|SEG/.test(String(F.modelo||''))?card('¿Está cara o barata frente a lo que gana su negocio?','',vd('n','En bancos y aseguradoras el EV/EBITDA no tiene sentido: la deuda es su materia prima. Para ellos se miran el PER y el precio / valor contable (pestaña Resumen).')):'';
    return '<div class="nf-card" id="nfEvHost"><h2>¿Sube la cotización porque gana más o porque se paga más cara?</h2><div class="nf-mu" style="padding:16px">Cargando la cotización…</div></div><div class="nf-card" id="nfCmpHost" style="display:none"></div>'; }
  function montarEv(F,t){
    var host=document.getElementById('nfEvHost'); if(!host) return;
    var V=F.valoracion||{}, SM=V.serie_multiplos||{}, M=V.multiplos.ev_ebitda, acc=((F.series||{}).flujos||{}).acciones||{}, cf=String(F.cierre_fiscal||'12-31');
    fetch('precios/'+encodeURIComponent(t)+'.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(P){
      if(!document.getElementById('nfEvHost')) return;
      var D=(P&&P.data)||[], Ys=Object.keys(SM).filter(function(y){ var s=SM[y]; return s&&s.ev!=null&&s.ebitda>0&&s.cap>0&&+acc[y]>0; }).sort();
      if(!D.length||Ys.length<2){ host.innerHTML='<h2>¿Sube la cotización porque gana más o porque se paga más cara?</h2>'+vd('a','Faltan datos de cotización o de las cuentas para dibujarla.'); return; }
      var cierre=function(y){ return y+'-'+cf; };
      var pxEn=function(f){ var lo=0,hi=D.length; while(lo<hi){ var m=(lo+hi)>>1; if(D[m][0]<=f) lo=m+1; else hi=m; } return lo?D[lo-1]:null; };
      var anioDe=function(f){ var y=null; Ys.forEach(function(z){ if(cierre(z)<=f) y=z; }); return y; };
      var multEn=function(f,px){ var y=anioDe(f); if(!y) return null; var s=SM[y]; return (px*(+acc[y])+(s.ev-s.cap))/s.ebitda; };
      /* serie mensual desde el cierre del primer ejercicio */
      var ini=cierre(Ys[0]), L=[], ult={};
      D.forEach(function(d){ if(d[0]<ini) return; ult[d[0].slice(0,7)]=d; });
      Object.keys(ult).sort().forEach(function(k){ var d=ult[k]; L.push({f:d[0],p:+d[1],x:multEn(d[0],+d[1])}); });
      var hoyP=+(D[D.length-1][1]), hoyF=D[D.length-1][0], xHoy=multEn(hoyF,hoyP); if(L.length&&L[L.length-1].f!==hoyF) L.push({f:hoyF,p:hoyP,x:xHoy}); else if(L.length) L[L.length-1].x=xHoy;
      var med=M.media, mn=M.min, mx=M.max;
      /* lectura 1: dónde está hoy frente a su historia */
      var dif=(xHoy/med-1)*100, cic=(F.modulos||[]).indexOf('CICLICA')>=0, col=xHoy<=med?(cic?'a':'v'):(xHoy<=med*1.15?'a':'r');
      var t1='Hoy cotiza a <b>'+n(xHoy,1)+'x</b> EV/EBITDA; su media de '+M.n+' años es <b>'+n(med,1)+'x</b> (entre '+n(mn,1)+'x y '+n(mx,1)+'x). '+
        (xHoy<=med?'Se paga <b>menos que de costumbre</b> ('+pc(dif,0)+').':(xHoy<=med*1.15?'Se paga <b>algo más que de costumbre</b> ('+pc(dif,0)+').':'Se paga <b>bastante más que de costumbre</b> ('+pc(dif,0)+').'))+
        (xHoy>mx?' Está por encima del máximo de estos años.':(xHoy<mn?' Está por debajo del mínimo de estos años.':''))+
        (M.vpa?' Con su múltiplo medio, el método valora la acción en <b>'+n(M.vpa,2)+' €</b> (hoy '+n(hoyP,2)+' €).':'');
      /* lectura 2: de dónde viene lo que ha hecho la cotización (5 ejercicios atrás o los que haya) */
      var Yok=Ys.slice(Math.max(0,Ys.length-6)).filter(function(y){ return !SM[y].fuera; }), y0=Yok.length>1?Yok[0]:Ys[Math.max(0,Ys.length-6)], y1=Ys[Ys.length-1], s0=SM[y0], s1=SM[y1], p0=pxEn(cierre(y0)), t2='';
      if(p0&&s0.x>0){ var rp=hoyP/p0[1], re=s1.ebitda/s0.ebitda, rx=xHoy/s0.x, lp=Math.log(rp), le=Math.log(re), lx=Math.log(rx), dom;
        if(Math.abs(lp)<0.05) dom='La cotización está casi igual.';
        else if(lp>0) dom=(le>0&&le>=lx)?'La subida viene sobre todo de que <b>gana más</b>: es la buena.':(lx>0?'La subida viene sobre todo de que el mercado <b>paga más por lo mismo</b>: si el múltiplo volviera a su media, la cotización lo notaría.':'Sube por el negocio pese a que el múltiplo baja.');
        else dom=(lx<0&&lx<=le)?'La bajada viene sobre todo de que el mercado <b>paga menos por ella</b>, no de que gane menos: es el caso que puede abrir oportunidad si el negocio aguanta.':'La bajada viene sobre todo de que <b>gana menos</b>: hay que mirar por qué.';
        t2='Desde el cierre de '+y0+' ('+fe(p0[0])+'): cotización '+pc((rp-1)*100,0)+' ('+n(p0[1],2)+' → '+n(hoyP,2)+' €), EBITDA después de alquileres '+pc((re-1)*100,0)+' ('+n(s0.ebitda,0)+' → '+n(s1.ebitda,0)+' M€) y múltiplo de '+n(s0.x,1)+'x a '+n(xHoy,1)+'x. '+dom; }
      /* 3-nov (Carlos, guía EV/EBITDA): dos avisos de regla fija.
         CÍCLICA (módulo del método): el múltiplo se lee al revés; se compara el EBITDA del último ejercicio con su media de estos
         años y se da el múltiplo sobre el EBITDA medio. DEUDA: si la deuda neta / EBITDA del método ha subido ≥ 1 vez desde el
         ejercicio de partida y acaba ≥ 2 veces, el múltiplo no baja aunque caiga la acción: alarma, no oportunidad. */
      var avisos='', so=((F.series||{}).solvencia)||{}, dne=so.dn_ebitda||{}, dnn=so.deuda_neta||{};
      if((F.modulos||[]).indexOf('CICLICA')>=0){ var ebs=Ys.map(function(y){ return SM[y].ebitda; }), ebm=ebs.reduce(function(a,b){return a+b;},0)/ebs.length, eb1=SM[y1].ebitda, s1y=SM[y1], evHoy=hoyP*(+acc[y1])+(s1y.ev-s1y.cap), xNorm=evHoy/ebm, dEb=(eb1/ebm-1)*100;
        avisos+=vd('a','<b>Cuidado, es cíclica: el múltiplo se lee al revés.</b> En lo alto del ciclo el EBITDA está inflado y el múltiplo sale bajo (parece barata y no lo es); en el fondo, el EBITDA casi desaparece y el múltiplo se dispara (parece cara y suele ser el momento de comprar). '+
          'Su EBITDA de '+y1+' ('+n(eb1,0)+' M€) está '+(Math.abs(dEb)<10?'cerca de':(dEb>0?'<b>'+n(dEb,0)+' % por encima</b> de':'<b>'+n(-dEb,0)+' % por debajo</b> de'))+' su media de estos años ('+n(ebm,0)+' M€)'+(dEb>=20?': probablemente cerca de lo alto del ciclo.':(dEb<=-20?': probablemente cerca del fondo.':'.'))+
          ' Con el EBITDA medio del ciclo, hoy cotizaría a <b>'+n(xNorm,1)+'x</b> (frente a '+n(xHoy,1)+'x con el último año).');
        if(dEb>=20&&t2&&xHoy<=med) t2+=' <b>Pero ojo:</b> es cíclica y su EBITDA está alto, así que lo «barato» puede ser engañoso (aviso de abajo).'; }
      var d0=dne[y0], d1=dne[y1];
      if(d0!=null&&d1!=null&&d1-d0>=1&&d1>=2) avisos+=vd('r','<b>Trampa de la deuda.</b> La deuda neta ha pasado de '+n(dnn[y0],0)+' a '+n(dnn[y1],0)+' M€ ('+n(d0,1)+'x → '+n(d1,1)+'x el EBITDA). Parte del valor de empresa es deuda, no acciones: si la cotización cae y el EV/EBITDA no baja, es por esto. Es una alarma, no una oportunidad.');
      else if(d0!=null&&d1!=null) avisos+='<div class="nf-mu" style="font-size:12px;margin:2px 0 6px">Deuda neta / EBITDA: '+n(d0,1)+'x en '+y0+' → '+n(d1,1)+'x en '+y1+(d1-d0>=1?' (sube, pero aún por debajo de 2x).':' (sin trampa de deuda).')+'</div>';
      /* gráfica */
      var nar=(host.clientWidth||1000)<640, W=nar?520:1000,H=nar?340:330,x0=nar?44:62,x1=nar?484:930,yt=16,yb=H-30, N=L.length, X=function(i){ return x0+(N>1?i/(N-1):0)*(x1-x0); };
      var pv=L.map(function(o){return o.p;}), pmx=Math.max.apply(null,pv)*1.06, pmn=Math.min.apply(null,pv)*0.9; if(pmn<0) pmn=0;
      var xv=L.map(function(o){return o.x;}).filter(function(v){return v!=null&&isFinite(v);}).concat([mn,mx]), xmx=Math.min(Math.max.apply(null,xv),Math.max(mx,xHoy)*1.5)*1.06, xmn=Math.min.apply(null,xv)*0.9;
      var YP=function(v){ return yt+(pmx-v)/(pmx-pmn)*(yb-yt); }, YX=function(v){ return yt+(xmx-Math.min(v,xmx))/(xmx-xmn)*(yb-yt); };
      var h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs" style="width:100%">';
      h+='<rect x="'+x0+'" y="'+YX(mx).toFixed(1)+'" width="'+(x1-x0)+'" height="'+(YX(mn)-YX(mx)).toFixed(1)+'" fill="#7C3AED" fill-opacity=".06"/>';
      var sp=niceStep((pmx-pmn)/5); for(var v=Math.ceil(pmn/sp)*sp; v<=pmx; v+=sp) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+YP(v).toFixed(1)+'" y2="'+YP(v).toFixed(1)+'" stroke="#EEF1F5"/><text x="'+(x0-6)+'" y="'+(YP(v)+4).toFixed(1)+'" font-size="11" text-anchor="end" fill="#1F4A9A">'+n(v,v<10?1:0)+(nar?'':' €')+'</text>';
      var sx=niceStep((xmx-xmn)/5); for(var w=Math.ceil(xmn/sx)*sx; w<=xmx; w+=sx) h+='<text x="'+(x1+6)+'" y="'+(YX(w)+4).toFixed(1)+'" font-size="11" fill="#7C3AED">'+n(w,w%1?1:0)+'x</text>';
      h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+YX(med).toFixed(1)+'" y2="'+YX(med).toFixed(1)+'" stroke="#7C3AED" stroke-dasharray="6 5" stroke-opacity=".7"/><text x="'+(x0+6)+'" y="'+(YX(med)-5).toFixed(1)+'" font-size="11" fill="#7C3AED">media '+n(med,1)+'x</text>';
      var ya=''; L.forEach(function(o,i){ var y=o.f.slice(0,4); if(y!==ya&&o.f.slice(5,7)==='01'){ ya=y; h+='<line x1="'+X(i).toFixed(1)+'" x2="'+X(i).toFixed(1)+'" y1="'+yb+'" y2="'+(yb+4)+'" stroke="#94A3B8"/><text x="'+X(i).toFixed(1)+'" y="'+(H-10)+'" font-size="11" text-anchor="middle" fill="#5B6B7C">'+y+'</text>'; } });
      h+='<polyline fill="none" stroke="#1F4A9A" stroke-width="2.2" points="'+L.map(function(o,i){ return X(i).toFixed(1)+','+YP(o.p).toFixed(1); }).join(' ')+'"/>';
      var seg='', pts=[]; L.forEach(function(o,i){ if(o.x!=null&&isFinite(o.x)) pts.push(X(i).toFixed(1)+','+YX(o.x).toFixed(1)); });
      h+='<polyline fill="none" stroke="#7C3AED" stroke-width="2.2" points="'+pts.join(' ')+'"/>';
      Ys.forEach(function(y){ var s=SM[y]; if(!(s.x>0)) return; var i=-1; L.forEach(function(o,k){ if(i<0&&o.f>=cierre(y)) i=k; }); if(i<0) return; h+='<circle cx="'+X(i).toFixed(1)+'" cy="'+YX(s.x).toFixed(1)+'" r="4" fill="#fff" stroke="#7C3AED" stroke-width="2"><title>Cierre '+y+': '+n(s.x,1)+'x (dato del método)</title></circle>'; });
      var lx_=X(N-1); h+='<circle cx="'+lx_.toFixed(1)+'" cy="'+YP(hoyP).toFixed(1)+'" r="4.5" fill="#1F4A9A"/><circle cx="'+lx_.toFixed(1)+'" cy="'+YX(xHoy).toFixed(1)+'" r="4.5" fill="#7C3AED"/>';
      var bw=(x1-x0)/Math.max(1,N); L.forEach(function(o,i){ h+='<rect class="nf-hv" x="'+(X(i)-bw/2).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+esc(fe(o.f)+'|Cotización: '+n(o.p,2)+' €'+(o.x!=null?'|EV/EBITDA: '+n(o.x,1)+'x':'')+'|Cuentas de '+(anioDe(o.f)||'—'))+'"/>'; });
      h+='</svg>';
      var lg='<div class="nf-lg"><span><i style="background:#1F4A9A"></i>Cotización (€, eje izquierdo)</span><span><i style="background:#7C3AED"></i>EV/EBITDA (veces, eje derecho)</span><span><i style="background:#EDE9FE"></i>Banda: mínimo y máximo de '+M.n+' años</span><span><i style="background:#fff;border:2px solid #7C3AED;box-sizing:border-box"></i>Cierre de cada ejercicio (dato del método)</span></div>';
      var que='<details class="nf-det" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:#1F4A9A">Qué significa y cómo leerla</summary><div style="font-size:13px;color:#334155;line-height:1.55;margin-top:6px">'+
        '<p><b>EV/EBITDA</b> = lo que costaría comprar la empresa entera (sus acciones más la deuda neta) dividido entre lo que gana su negocio cada año antes de amortizaciones, impuestos e intereses. Es «cuántos años de ganancias del negocio pagas». Al incluir la deuda, compara bien empresas muy endeudadas con otras sin deuda.</p>'+
        '<p><b>Cómo leer las dos líneas juntas:</b> si la cotización sube y el EV/EBITDA se mantiene, la subida la paga el negocio (gana más). Si la cotización sube y el EV/EBITDA también, estás pagando más por lo mismo: más riesgo si vuelve a su media. Si la cotización baja con el EV/EBITDA bajando y el negocio aguantando, puede ser oportunidad.</p>'+
        '<p><b>La banda</b> es lo caro o barato que ha estado en estos años. Fuera de ella, algo ha cambiado (en la empresa o en el mercado) y conviene saber qué.</p>'+
        '<p style="color:#64748B">EBITDA después de alquileres, el mismo del método. Cada mes usa las cuentas del último ejercicio cerrado, así que el salto de cada cierre es el negocio nuevo, no la bolsa.'+(t==='LOG'?' En Logista deja fuera el ingreso por la caja que presta a Imperial, que es una parte importante de su beneficio.':'')+'</p></div></details>';
      host.innerHTML='<h2>¿Sube la cotización porque gana más o porque se paga más cara?</h2>'+vd(col,t1)+(t2?vd('n',t2):'')+avisos+h+lg+que+GUIA('ev');
      try{ montarCmp(F,t,L); }catch(e){ console.error('n-ficha cmp',e); }
    });
  }
  /* ---------------- 14-nov-2026 (Carlos): COMPARADOR de EV/EBITDA ----------------
     «cuando veo el gráfico de ev/ebitda, puedo compararlo con otras empresas.. naturgy con endesa, con iberdrola».
     Tarjeta bajo la de EV/EBITDA: hasta dos empresas analizadas más, cada una con sus cuentas y su cotización (misma cuenta
     que montarEv). La elección se recuerda por empresa en este navegador (localStorage 'nfCmp'); si falla, en memoria. */
  var _PX={}, _cmpMem={}, CMPC=['#7C3AED','#0F766E','#D97706'];
  function preciosDe(t){ if(_PX[t]) return Promise.resolve(_PX[t]); return fetch('precios/'+encodeURIComponent(t)+'.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(P){ if(P) _PX[t]=P; return P; }); }
  function evSerie(F,P){
    if(!F) return null; var V=F.valoracion||{}, SM=V.serie_multiplos||{}, M=(V.multiplos||{}).ev_ebitda, acc=((F.series||{}).flujos||{}).acciones||{}, cf=String(F.cierre_fiscal||'12-31'), D=(P&&P.data)||[];
    var Ys=Object.keys(SM).filter(function(y){ var s=SM[y]; return s&&s.ev!=null&&s.ebitda>0&&s.cap>0&&+acc[y]>0; }).sort();
    if(!M||!M.media||!D.length||Ys.length<2) return null;
    var mult=function(f,px){ var y=null; Ys.forEach(function(z){ if(z+'-'+cf<=f) y=z; }); if(!y) return null; var s=SM[y]; return (px*(+acc[y])+(s.ev-s.cap))/s.ebitda; };
    var ult={}, m={}; D.forEach(function(d){ ult[d[0].slice(0,7)]=d; }); Object.keys(ult).forEach(function(k){ var x=mult(ult[k][0],+ult[k][1]); if(x!=null&&isFinite(x)) m[k]=x; });
    var u=D[D.length-1]; return {m:m, hoy:mult(u[0],+u[1]), M:M};
  }
  function cmpSel(t){ if(_cmpMem[t]) return _cmpMem[t]; try{ var o=JSON.parse(localStorage.getItem('nfCmp')||'{}'); return (o[t]||[]).slice(0,2); }catch(e){ return []; } }
  function cmpGuarda(t,a){ _cmpMem[t]=a; try{ var o=JSON.parse(localStorage.getItem('nfCmp')||'{}'); o[t]=a; localStorage.setItem('nfCmp',JSON.stringify(o)); }catch(e){} }
  function montarCmp(F,t,L){
    var host=document.getElementById('nfCmpHost'); if(!host||!L||L.length<2) return; host.style.display='';
    var nom={}; lista().forEach(function(a){ nom[a[0]]=a[1]; }); if(!nom[t]) nom[t]=F.empresa||t;
    /* 14-nov (Carlos): «que en los desplegables solo pueda elegirse empresas comparables» → el grupo de su tipo, el mismo de Ratios */
    var G=(F.ratios||{}).sector||{}, LS=(G.empresas||[]).filter(function(x){ return x&&x!==t; }).map(function(x){ return [x,nom[x]||x]; }).sort(function(a,b){ return a[1].localeCompare(b[1]); });
    var grupo=G.grupo?' de su tipo («'+esc(G.grupo)+'»)':' de su tipo';
    if(!LS.length){ host.innerHTML='<h2>¿Y frente a otras empresas?</h2>'+vd('n','Todavía no hay otras empresas analizadas'+grupo+' con las que comparar a <b>'+esc(nom[t])+'</b>. El EV/EBITDA solo se compara bien entre negocios parecidos.'); return; }
    var sel=cmpSel(t).filter(function(x){ return x&&x!==t&&LS.some(function(a){ return a[0]===x; }); });
    var sl=function(i){ return '<select class="nf-cmps" data-i="'+i+'" style="padding:6px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;max-width:240px;background:#fff"><option value="">— ninguna —</option>'+LS.map(function(a){ return '<option value="'+esc(a[0])+'"'+(sel[i]===a[0]?' selected':'')+'>'+esc(a[1])+'</option>'; }).join('')+'</select>'; };
    var cab='<h2>¿Y frente a otras empresas?</h2><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:6px 0 10px;font-size:13px;color:#334155"><span>Comparar el EV/EBITDA de <b>'+esc(nom[t])+'</b> con</span>'+sl(0)+(LS.length>1?'<span>y</span>'+sl(1):'')+'<span style="color:#64748B">Solo salen las'+grupo+'.</span></div>';
    var COMO='<details class="nf-det" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:#1F4A9A">Cómo leerla: las dos lecturas</summary><div style="font-size:13px;color:#334155;line-height:1.55;margin-top:6px">'+
      '<p><b>1 · Frente a las otras</b> (columna «Hoy»): a cuántas veces se paga comparada con sus competidoras. <b>2 · Frente a sí misma</b> (columna «Hoy frente a su media»): si está por encima o por debajo de lo que ha sido normal en ella.</p>'+
      '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12.5px;margin:4px 0 8px"><tr><th style="padding:6px 8px"></th><th style="padding:6px 8px;text-align:left;border-bottom:1px solid #E2E8F0">Por debajo de su media</th><th style="padding:6px 8px;text-align:left;border-bottom:1px solid #E2E8F0">Por encima de su media</th></tr>'+
      '<tr><th style="padding:6px 8px;text-align:left;border-bottom:1px solid #F1F5F9">Más barata que las otras</th><td style="padding:6px 8px;border-bottom:1px solid #F1F5F9;background:#F0FDF4">Señal más fuerte de barata: lo dicen las dos</td><td style="padding:6px 8px;border-bottom:1px solid #F1F5F9">Siempre ha sido la barata del grupo, y ahora lo es menos</td></tr>'+
      '<tr><th style="padding:6px 8px;text-align:left">Más cara que las otras</th><td style="padding:6px 8px">Suele pagarse cara y hoy algo menos: puede ser oportunidad en una buena empresa</td><td style="padding:6px 8px;background:#FEF2F2">Señal más fuerte de cara: lo dicen las dos</td></tr></table></div>'+
      '<p><b>Tres cautelas.</b> Barata no es lo mismo que buena: puede pagarse poco porque el negocio va a menos; crúzalo con el rating, las ventas y la deuda. Los picos de la línea suelen venir de un año malo de ganancias, no de que la bolsa la pagara cara. Y las medias llevan dentro los años de tipos a cero (2016-2021), así que «por debajo de su media» sale algo más fácil de lo que debería.</p></div></details>';
    var engancha=function(){ Array.prototype.forEach.call(host.querySelectorAll('.nf-cmps'),function(s){ s.onchange=function(){ var a=[0,1].map(function(i){ var e=host.querySelector('.nf-cmps[data-i="'+i+'"]'); return e?e.value:''; }).filter(function(x,i,arr){ return x&&arr.indexOf(x)===i; }); cmpGuarda(t,a); montarCmp(F,t,L); }; }); };
    if(!sel.length){ host.innerHTML=cab+'<div class="nf-mu" style="padding:4px 0 2px">Elige una o dos empresas para ver sus líneas junto a la de '+esc(nom[t])+'.</div>'+COMO; engancha(); return; }
    Promise.all(sel.map(function(s){ return Promise.all([cargar(s),preciosDe(s)]).then(function(a){ return evSerie(a[0],a[1]); }).catch(function(){ return null; }); })).then(function(R){
      if(!document.getElementById('nfCmpHost')||cur!==t) return;
      var N=L.length, S=[{t:t,M:((F.valoracion||{}).multiplos||{}).ev_ebitda,hoy:L[N-1].x,v:L.map(function(o){ return o.x; })}], sin=[];
      sel.forEach(function(s,i){ var r=R[i]; if(!r){ sin.push(nom[s]||s); return; } S.push({t:s,M:r.M,hoy:r.hoy,v:L.map(function(o,k){ var x=k===N-1?r.hoy:r.m[o.f.slice(0,7)]; return x==null?null:x; })}); });
      var aviso=sin.length?vd('a','Sin EV/EBITDA para comparar: <b>'+sin.map(esc).join(', ')+'</b>. En bancos y aseguradoras no tiene sentido; en otras pueden faltar datos.'):'';
      if(S.length<2){ host.innerHTML=cab+aviso+COMO; engancha(); return; }
      var all=[]; S.forEach(function(s){ s.v.forEach(function(x){ if(x!=null&&isFinite(x)) all.push(x); }); });
      var tope=Math.max.apply(null,S.map(function(s){ return Math.max(s.M.max||s.M.media,s.hoy||0); }))*1.5, vmx=Math.min(Math.max.apply(null,all),tope)*1.06, vmn=Math.max(0,Math.min.apply(null,all)*0.9);
      var nar=(host.clientWidth||1000)<640, W=nar?520:1000,H=nar?320:300,x0=nar?40:54,x1=nar?500:980,yt=14,yb=H-30, X=function(i){ return x0+(N>1?i/(N-1):0)*(x1-x0); }, Y=function(v){ return yt+(vmx-Math.min(Math.max(v,vmn),vmx))/(vmx-vmn)*(yb-yt); };
      var h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs" style="width:100%">', sp=niceStep((vmx-vmn)/5);
      for(var v=Math.ceil(vmn/sp)*sp; v<=vmx; v+=sp) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="#EEF1F5"/><text x="'+(x0-6)+'" y="'+(Y(v)+4).toFixed(1)+'" font-size="11" text-anchor="end" fill="#5B6B7C">'+n(v,v%1?1:0)+'x</text>';
      var ya=''; L.forEach(function(o,i){ var y=o.f.slice(0,4); if(y!==ya&&o.f.slice(5,7)==='01'){ ya=y; h+='<line x1="'+X(i).toFixed(1)+'" x2="'+X(i).toFixed(1)+'" y1="'+yb+'" y2="'+(yb+4)+'" stroke="#94A3B8"/><text x="'+X(i).toFixed(1)+'" y="'+(H-10)+'" font-size="11" text-anchor="middle" fill="#5B6B7C">'+y+'</text>'; } });
      S.forEach(function(s,j){ var c=CMPC[j], seg=[]; var suelta=function(){ if(seg.length>1) h+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(j?2:2.6)+'" points="'+seg.join(' ')+'"/>'; seg=[]; };
        s.v.forEach(function(x,i){ if(x==null||!isFinite(x)){ suelta(); return; } seg.push(X(i).toFixed(1)+','+Y(x).toFixed(1)); }); suelta();
        if(s.M&&s.M.media) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(s.M.media).toFixed(1)+'" y2="'+Y(s.M.media).toFixed(1)+'" stroke="'+c+'" stroke-dasharray="5 6" stroke-opacity=".45"/>';
        if(s.hoy!=null&&isFinite(s.hoy)) h+='<circle cx="'+X(N-1).toFixed(1)+'" cy="'+Y(s.hoy).toFixed(1)+'" r="4.5" fill="'+c+'"/>'; });
      var bw=(x1-x0)/Math.max(1,N); L.forEach(function(o,i){ h+='<rect class="nf-hv" x="'+(X(i)-bw/2).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+esc(fe(o.f)+S.map(function(s){ return '|'+(nom[s.t]||s.t)+': '+(s.v[i]!=null&&isFinite(s.v[i])?n(s.v[i],1)+'x':'—'); }).join(''))+'"/>'; });
      h+='</svg>';
      var lg='<div class="nf-lg">'+S.map(function(s,j){ return '<span><i style="background:'+CMPC[j]+'"></i>'+esc(nom[s.t]||s.t)+'</span>'; }).join('')+'<span style="color:#64748B">Línea de puntos: la media de cada una</span></div>';
      var tb='<div style="overflow-x:auto;margin-top:10px"><table class="nf-tb" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:right;color:#5B6B7C;border-bottom:1px solid #E2E8F0"><th style="text-align:left;padding:5px 6px">Empresa</th><th style="padding:5px 6px">Hoy</th><th style="padding:5px 6px">Su media</th><th style="padding:5px 6px">Mín – máx</th><th style="padding:5px 6px">Hoy frente a su media</th></tr></thead><tbody>'+
        S.map(function(s,j){ var d=(s.hoy!=null&&s.M.media)?(s.hoy/s.M.media-1)*100:null; return '<tr style="text-align:right;border-bottom:1px solid #F1F5F9"><td style="text-align:left;padding:5px 6px"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:'+CMPC[j]+'"></i>'+esc(nom[s.t]||s.t)+'</td><td style="padding:5px 6px"><b>'+(s.hoy!=null?n(s.hoy,1)+'x':'—')+'</b></td><td style="padding:5px 6px">'+n(s.M.media,1)+'x <span style="color:#94A3B8">('+s.M.n+' años)</span></td><td style="padding:5px 6px">'+n(s.M.min,1)+' – '+n(s.M.max,1)+'x</td><td style="padding:5px 6px;color:'+(d==null?'#334155':(d>15?'#B91C1C':(d<0?'#15803D':'#B45309')))+'">'+(d==null?'—':pc(d,0))+'</td></tr>'; }).join('')+'</tbody></table></div>';
      var nt='<span class="nf-ws">Cada línea usa las cuentas de su último ejercicio cerrado y su propia cotización. El nivel entre empresas solo se compara bien si los negocios se parecen; lo más fiable es mirar cada una contra su propia media.</span>';
      var yo=S[0], ot=S.slice(1).filter(function(s){ return s.hoy!=null&&isFinite(s.hoy); }), lec='';
      if(yo.hoy!=null&&isFinite(yo.hoy)&&yo.M.media&&ot.length){
        var d=(yo.hoy/yo.M.media-1)*100, bar=ot.every(function(s){ return yo.hoy<s.hoy; }), car=ot.every(function(s){ return yo.hoy>s.hoy; }), enMed=Math.abs(d)<5, B='<b>'+esc(nom[t])+'</b>';
        var grp=ot.length>1?'las tres':'las dos', fr=enMed?'está en su propia media ('+pc(d,0)+')':('está un '+n(Math.abs(d),0)+' % por '+(d<0?'debajo':'encima')+' de su propia media');
        var resto=' Falta saber por qué: míralo con el rating, las ventas y la deuda.';
        if(bar&&d<=-5) lec=vd('v',B+' es la más barata de '+grp+' ('+n(yo.hoy,1)+'x) y además '+fr+'. <b>Las dos lecturas coinciden:</b> es la señal más fuerte de barata.'+resto);
        else if(car&&d>=5) lec=vd('r',B+' es la más cara de '+grp+' ('+n(yo.hoy,1)+'x) y además '+fr+'. <b>Las dos lecturas coinciden:</b> es la señal más fuerte de cara.');
        else if(bar) lec=vd('a',B+' es la más barata de '+grp+' ('+n(yo.hoy,1)+'x), pero '+fr+': ha sido la barata del grupo y hoy lo es menos. Las dos lecturas no coinciden; sin señal clara.');
        else if(car) lec=vd('a',B+' es la más cara de '+grp+' ('+n(yo.hoy,1)+'x), pero '+fr+': suele pagarse más que las otras y hoy algo menos. Puede ser oportunidad si la empresa es buena.');
        else lec=vd('n',B+' ('+n(yo.hoy,1)+'x) queda entre las otras; manda la lectura contra sí misma: '+fr+'.');
      }
      host.innerHTML=cab+aviso+lec+h+lg+tb+nt+COMO; engancha();
    });
  }

  /* ---------------- RATIOS (4-nov-2026) ----------------
     Carlos: «una hoja de ratios (liquidez, endeudamiento y solvencia, gestión o actividad, rentabilidad)… comparativas
     sectoriales o algo que ayude a vigilar»; aprobado: cada ratio frente a sus diez años y frente a la mediana de las de su
     tipo, y el DuPont ampliado. Las cifras vienen de la ficha (ratios.py); aquí solo reglas fijas:
     · Frente a su historia: el último año contra los anteriores. Fuera de su rango con holgura (más del 10 % del ancho del rango
       o del 3 % del valor) por lo malo → rojo; por lo bueno → verde; sin holgura, «en el borde», neutro. EBIT/intereses ≥ 10x y
       deuda neta/EBITDA ≤ 1x no se marcan nunca como riesgo;
       dentro, en su tercio peor → ámbar; si no, neutro. Ratios sin «mejor» (días de acreedores): fuera de rango → ámbar.
     · Frente a su tipo: más de un 10 % mejor o peor que la mediana; con color solo rentabilidad, deuda neta/EBITDA y EBIT/intereses.
       Liquidez, estructura del balance y circulante dependen del negocio (Logista vive del impuesto que cobra antes de pagarlo):
       se dice si está por encima o por debajo, sin color.
     · DuPont: de su primer año legible al último, qué pieza ha movido más el ROE (en términos multiplicativos). */
  function ratiosTab(F,t){
    var R=F.ratios||{};
    if(!R.valores) return card('Ratios','',vd('n',esc(R.no_aplica||'Esta empresa aún no tiene la hoja de ratios: llegará en la próxima ficha que genere el método.')));
    var SIN_RIESGO={ebit_int:function(v){ return v>=10; }, dn_ebitda:function(v){ return v<=1; }};   // zonas donde moverse no es un riesgo
    var Y=(R.anios||[]).slice(-10), y=Y[Y.length-1], S=R.sector||{}, M=S.mediana||{}, CON_COLOR={roe:1,roa:1,roic:1,margen_ebitda:1,margen_neto:1,dn_ebitda:1,ebit_int:1};   // frente a su tipo: color solo donde comparar negocios distintos tiene sentido
    var h=vd('n','Cada ratio de <b>'+esc(y)+'</b> se compara con <b>sus diez años</b> ('+esc(Y[0])+'-'+esc(y)+') y con la <b>mediana de las de su tipo</b>'+
      (S.pocas?' — pero en «'+esc(S.grupo||'su tipo')+'» hay menos de tres analizadas, así que aquí solo vale su propia historia.':' («'+esc(S.grupo)+'»: '+esc((S.empresas||[]).join(', '))+').')+
      ' Pulsa un ratio para ver sus diez años.');
    function hist(r){ var o=(R.valores||{})[r.id]||{}, v=o[y]; if(v==null) return null;
      var prev=Y.slice(0,-1).map(function(k){ return o[k]; }).filter(function(x){ return x!=null; }); if(prev.length<3) return {v:v,txt:'pocos años',c:''};
      var mn=Math.min.apply(null,prev), mx=Math.max.apply(null,prev), m=r.mejor, f=fmtU(r.unidad), rg=f(mn)+' a '+f(mx);
      var hol=Math.max(0.10*(mx-mn),0.03*Math.abs(v)), tranq=SIN_RIESGO[r.id]&&SIN_RIESGO[r.id](v);
      if(v>mx+hol||v<mn-hol){ var arriba=v>mx, bueno=m===0?null:(arriba?m>0:m<0);
        return {v:v,mn:mn,mx:mx,rg:rg,txt:(arriba?'Por encima':'Por debajo')+' de todo su histórico',c:tranq?'':(bueno==null?'a':(bueno?'v':'r'))}; }
      if(v>mx||v<mn) return {v:v,mn:mn,mx:mx,rg:rg,txt:'En el borde de su rango ('+(v>mx?'máximo':'mínimo')+')',c:''};
      var p=(mx>mn)?(v-mn)/(mx-mn):0.5, zona=p>2/3?'zona alta':(p<1/3?'zona baja':'zona media'), peor=m===0?false:(m>0?p<1/3:p>2/3);
      return {v:v,mn:mn,mx:mx,rg:rg,txt:'Dentro de su rango, '+zona,c:peor&&!tranq?'a':''}; }
    function tipo(r,v){ var md=(M[r.id]||{})[y]; if(S.pocas||md==null||v==null) return {md:null,txt:'—',c:''};
      var d=md!==0?(v-md)/Math.abs(md):0, f=fmtU(r.unidad);
      if(Math.abs(d)<=0.10) return {md:md,txt:'En la media',c:''};
      var arriba=v>md, txt=(arriba?'Por encima':'Por debajo');
      if(!CON_COLOR[r.id]) return {md:md,txt:txt+' (cada negocio tiene la suya)',c:''};
      return {md:md,txt:txt,c:(arriba?r.mejor>0:r.mejor<0)?'v':'r'}; }
    function barra(o){ if(!o||o.mn==null) return ''; var lo=Math.min(o.mn,o.v), hi=Math.max(o.mx,o.v), sp=hi-lo||1, X=function(x){ return 4+(x-lo)/sp*92; };
      return '<svg viewBox="0 0 100 14" width="100" height="14" style="vertical-align:middle"><line x1="'+X(o.mn).toFixed(1)+'" x2="'+X(o.mx).toFixed(1)+'" y1="7" y2="7" stroke="#CBD5E1" stroke-width="5" stroke-linecap="round"/><circle cx="'+X(o.v).toFixed(1)+'" cy="7" r="4.5" fill="'+(o.c==='r'?'#B91C1C':o.c==='v'?'#15803D':o.c==='a'?'#B45309':'#1F4A9A')+'"/></svg>'; }
    var K={v:'#15803D',r:'#B91C1C',a:'#B45309','':'#334155'}, alertas=[];
    (R.familias||[]).forEach(function(fa){
      var filas='';
      var movil='';
      fa.ratios.forEach(function(r){ var o=hist(r); if(!o) return; var tp=tipo(r,o.v), f=fmtU(r.unidad), id='nfrt-'+r.id;
        if(o.c==='r'||o.c==='a'&&/Por (encima|debajo)/.test(o.txt)) alertas.push([o.c,r.nombre+': '+o.txt.toLowerCase()+' ('+f(o.v)+'; antes, '+o.rg+')']);
        var ser=Y.map(function(k){ var x=((R.valores||{})[r.id]||{})[k]; return x==null?null:+x; }), med=Y.map(function(k){ var x=(M[r.id]||{})[k]; return S.pocas||x==null?null:+x; });
        filas+='<tr data-nfrt="'+id+'" style="cursor:pointer"><td><b>'+esc(r.nombre)+'</b> <span style="color:#94A3B8">▸</span></td><td><b>'+f(o.v)+'</b></td><td>'+barra(o)+' <span style="color:#64748B;font-size:11.5px">'+(o.rg||'')+'</span></td>'+
          '<td style="color:'+K[o.c]+';font-weight:'+(o.c?'700':'400')+'">'+esc(o.txt)+'</td><td>'+(tp.md!=null?f(tp.md):'—')+'</td><td style="color:'+K[tp.c]+';font-weight:'+(tp.c?'700':'400')+'">'+esc(tp.txt)+'</td></tr>'+
          '<tr id="'+id+'" style="display:none"><td colspan="6" style="background:#FBFCFE"><div style="font-size:12px;color:#475569;margin:2px 0 4px">'+esc(r.formula)+'</div>'+
          '<div style="max-width:620px">'+lines(Y,[[r.nombre,ser,'#1F4A9A']].concat(med.some(function(x){return x!=null;})?[['Mediana de su tipo',med,'#94A3B8']]:[]),f)+'</div>'+
          leg([[r.nombre,'#1F4A9A']].concat(med.some(function(x){return x!=null;})?[['Mediana de su tipo (discontinua)','#94A3B8']]:[]))+'</td></tr>';
        movil+='<div class="nf-rtm" data-nfrt="'+id+'m"><div class="nf-rtm1"><b>'+esc(r.nombre)+' <span style="color:#94A3B8">▸</span></b><b>'+f(o.v)+'</b></div>'+
          '<div class="nf-rtm2">'+barra(o)+' <span>'+(o.rg||'')+'</span></div>'+
          '<div class="nf-rtm2">Su historia: <b style="color:'+K[o.c]+';font-weight:'+(o.c?'700':'500')+'">'+esc(o.txt)+'</b></div>'+
          (tp.md!=null?'<div class="nf-rtm2">Su tipo ('+f(tp.md)+'): <b style="color:'+K[tp.c]+';font-weight:'+(tp.c?'700':'500')+'">'+esc(tp.txt)+'</b></div>':'')+'</div>'+
          '<div id="'+id+'m" style="display:none;margin:0 0 8px"><div style="font-size:12px;color:#475569;margin:2px 0 4px">'+esc(r.formula)+'</div>'+
          lines(Y,[[r.nombre,ser,'#1F4A9A']].concat(med.some(function(x){return x!=null;})?[['Mediana de su tipo',med,'#94A3B8']]:[]),f)+'</div>'; });
      if(!filas) return;
      var nt=fa.id==='gestion'?'<div class="nf-mu" style="margin-top:6px;font-size:12px">⚠️ '+esc(R.nota_circulante||'')+(R.nota_ventas?' '+esc(R.nota_ventas):'')+'</div>':'';
      h+=card(esc(fa.nombre),esc(fa.pregunta),'<div class="nf-rt-m">'+movil+'</div><div class="nf-tw nf-rt-d"><table class="nf-t"><tr><th>Ratio</th><th>'+esc(y)+'</th><th>Sus diez años</th><th>Frente a su historia</th><th>Mediana de su tipo</th><th>Frente a su tipo</th></tr>'+filas+'</table></div>'+nt);
    });
    if(alertas.length) h=h.replace('</div>','</div>'+vd(alertas.some(function(a){return a[0]==='r';})?'r':'a','<b>Lo que se sale de lo normal en ella:</b><br>'+alertas.map(function(a){ return '· '+esc(a[1]); }).join('<br>')));
    else h=h.replace('</div>','</div>'+vd('v','Ningún ratio se sale de lo que ha sido normal en ella estos diez años.'));
    h+=dupont(R,Y);
    return h+GUIA('ratios');
  }
  function dupont(R,Y){
    var D=R.dupont||{}, V=D.valores||{}, P=D.piezas||[], ok=Y.filter(function(y){ return (V.roe||{})[y]!=null; });
    if(ok.length<2) return card('¿De dónde sale su rentabilidad?','DuPont ampliado',vd('n','No hay años suficientes con beneficio para leer el DuPont.'));
    var a=ok[0], b=ok[ok.length-1], cols=ok.slice().reverse(), f=function(p){ return fmtU(p.unidad); };
    var rows=P.map(function(p){ return '<tr><td><b>'+esc(p.nombre)+'</b><div style="font-size:11px;color:#94A3B8">'+esc(p.formula)+'</div></td>'+cols.map(function(y){ return '<td>'+f(p)((V[p.id]||{})[y])+'</td>'; }).join('')+'</tr>'; }).join('');
    rows+='<tr style="background:#F1F5F9"><td><b>= ROE</b></td>'+cols.map(function(y){ return '<td><b>'+fmtU('%')((V.roe||{})[y])+'</b></td>'; }).join('')+'</tr>';
    var lr=Math.log(V.roe[b]/V.roe[a]), mv=P.map(function(p){ var x=(V[p.id]||{})[a], z=(V[p.id]||{})[b]; return [p, x>0&&z>0?Math.log(z/x):0, x, z]; }).sort(function(u,w){ return Math.abs(w[1])-Math.abs(u[1]); });
    var top=mv.filter(function(m){ return Math.abs(m[1])>=0.05; }).slice(0,3);
    var txt='Su ROE pasa de <b>'+fmtU('%')(V.roe[a])+'</b> ('+esc(a)+') a <b>'+fmtU('%')(V.roe[b])+'</b> ('+esc(b)+').';
    txt+=top.length?' Lo que más lo ha movido: '+top.map(function(m){ return '<b>'+esc(m[0].nombre.toLowerCase())+'</b> ('+f(m[0])(m[2])+' → '+f(m[0])(m[3])+', '+(m[1]>0?'empuja hacia arriba':'tira hacia abajo')+')'; }).join('; ')+'.':' Las piezas apenas se han movido.';
    var ap=(V.apalancamiento||{})[b], mg=(V.margen||{})[b];
    var lee=ap!=null&&ap>=5?'Gran parte de su ROE sale de trabajar con dinero ajeno (cada euro propio sostiene '+n(ap,1)+' de activo): un ROE así no se compara con el de una empresa sin deuda ni circulante a favor.':
      (mg!=null&&mg>=15?'Su ROE sale sobre todo del margen: gana mucho con cada venta, sin necesidad de apalancarse.':'');
    var Ys=ok, gr=lines(Ys,[['ROE',Ys.map(function(y){ return V.roe[y]; }),'#1F4A9A']],fmtU('%'));
    var av=Object.keys(D.avisos||{}).length?'<div class="nf-mu" style="font-size:12px;margin-top:4px">Años sin leer: '+Object.keys(D.avisos).sort().map(function(y){ return esc(y)+' ('+esc(D.avisos[y])+')'; }).join(', ')+'.</div>':'';
    return card('¿De dónde sale su rentabilidad?','DuPont ampliado: el ROE en seis piezas que se multiplican',vd('n',txt)+(lee?vd('n',lee):'')+(dupontPiezas(V,P,ok)||'<div style="max-width:620px">'+gr+'</div>')+
      '<div class="nf-tw"><table class="nf-t"><tr><th>Pieza</th>'+cols.map(function(y){ return '<th>'+esc(y)+'</th>'; }).join('')+'</tr>'+rows+'</table></div>'+
      '<div class="nf-mu" style="font-size:12px;margin-top:6px">'+esc(D.nota||'')+(R.nota_ventas?' '+esc(R.nota_ventas):'')+'</div>'+av);
  }
  /* DuPont: cada pieza junto al ROE (Carlos, 4-nov: «la gráfica de cada componente del roe para que se vea cuál es el que más
     se parece al ROE»). Cada mini-gráfica dibuja la FORMA: pieza y ROE escalados cada uno entre su mínimo y su máximo.
     «Cuánto explica»: de las subidas y bajadas del ROE (en escala logarítmica, donde las piezas se suman), la parte que va con
     cada pieza = cov(ln pieza, ln ROE) / var(ln ROE). Las seis suman 100 %; negativa = se mueve al revés que el ROE. */
  function dupontPiezas(V,P,ok){
    function pesos(ys){ var lr=ys.map(function(y){ return Math.log(V.roe[y]); }), m=lr.reduce(function(s,x){return s+x;},0)/lr.length, vr=lr.reduce(function(s,x){return s+(x-m)*(x-m);},0);
      if(ys.length<4||vr<1e-6) return null;
      return P.map(function(p){ var s=ys.map(function(y){ var x=(V[p.id]||{})[y]; return x!=null&&x>0?Math.log(x):null; });
        var ii=s.map(function(x,i){return x==null?-1:i;}).filter(function(i){return i>=0;}); if(ii.length<4) return [p,null];
        var ms=ii.reduce(function(a,i){return a+s[i];},0)/ii.length, mr=ii.reduce(function(a,i){return a+lr[i];},0)/ii.length, vv=ii.reduce(function(a,i){return a+(lr[i]-mr)*(lr[i]-mr);},0);
        return [p, vv>1e-9?ii.reduce(function(a,i){return a+(s[i]-ms)*(lr[i]-mr);},0)/vv:null]; }); }
    var esRaro=function(L){ return L.some(function(l){ return l[1]!=null&&Math.abs(l[1])>1.05; }); };
    var L=pesos(ok); if(!L) return '';
    var raro=esRaro(L), sin=null;
    /* si un año raro lo desbarata (ACS 2021: venta extraordinaria), se prueba sin él */
    if(raro&&ok.length>=6){ var best=null; ok.forEach(function(y){ var L2=pesos(ok.filter(function(z){return z!==y;})); if(!L2||esRaro(L2)) return;
        var mx=Math.max.apply(null,L2.map(function(l){ return Math.abs(l[1]||0); })); if(!best||mx<best[2]) best=[y,L2,mx]; });
      if(best){ sin=best[0]; L=best[1]; raro=false; } }
    L.sort(function(a,b){ return (b[1]==null?-9:b[1])-(a[1]==null?-9:a[1]); });
    var pc=function(x){ return x==null?'—':Math.round(x*100)+' %'; };
    var top=L[0], seg=L[1];
    var txt=raro?'Aquí no hay una pieza que mande sola: unas piezas se disparan algunos años y otras las compensan, así que «explica» sale por encima del 100 % o negativo.':
      (sin?'Sin contar <b>'+esc(sin)+'</b>, un año raro en el que unas piezas se disparan y otras las compensan: ':'')+
      (sin?'la':'La')+' que más se parece a su ROE es <b>'+esc(top[0].nombre.toLowerCase())+'</b>, que va con el '+pc(top[1])+' de sus subidas y bajadas'+(seg&&seg[1]!=null&&seg[1]>=0.15?'; le sigue <b>'+esc(seg[0].nombre.toLowerCase())+'</b> ('+pc(seg[1])+')':'')+'. '+
      'Las que rondan el 0 % apenas cambian o no tienen que ver con cómo se mueve su ROE.';
    var roe=ok.map(function(y){ return V.roe[y]; }), CP=['#B45309','#15803D','#7C3AED','#0891B2','#DB2777','#65A30D'];
    var W=600,H=260,x0=56,x1=590,yt=14,yb=H-24,nn=ok.length,bw=(x1-x0)/nn;
    var rv=roe.filter(function(x){return x!=null;}), rlo=Math.min.apply(null,rv), rhi=Math.max.apply(null,rv), pad=(rhi-rlo)*0.08||1, mx=rhi+pad, mn=rlo-pad;
    var Yp=function(v){ return yt+(mx-v)/(mx-mn)*(yb-yt); }, st=niceStep((mx-mn)/4), fr=fmtU('%');
    var h='<svg viewBox="0 0 '+W+' '+H+'" class="nf-chs">';
    for(var v=Math.ceil(mn/st)*st; v<=mx+1e-9; v+=st) h+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Yp(v).toFixed(1)+'" y2="'+Yp(v).toFixed(1)+'" stroke="#EEF1F5"/><text x="'+(x0-6)+'" y="'+(Yp(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="#5B6B7C">'+fr(v)+'</text>';
    ok.forEach(function(y,k){ h+='<text x="'+(x0+k*bw+bw/2).toFixed(1)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="#5B6B7C">'+esc(y)+'</text>'; });
    var vis={}; L.forEach(function(l,i){ vis[l[0].id]=i<2&&l[1]!=null&&l[1]>0.1&&!raro; });
    L.forEach(function(l,i){ var p=l[0], s=ok.map(function(y){ var x=(V[p.id]||{})[y]; return x==null?null:+x; }), sv=s.filter(function(x){return x!=null;});
      if(sv.length<2) return; var lo=Math.min.apply(null,sv), hi=Math.max.apply(null,sv), sp=hi-lo;
      /* la pieza se lleva al rango del ROE: su mínimo a la altura del mínimo del ROE y su máximo a la del máximo */
      var pts=[]; s.forEach(function(x,k){ if(x!=null) pts.push((x0+k*bw+bw/2).toFixed(1)+','+Yp(sp>1e-12?rlo+(x-lo)/sp*(rhi-rlo):(rlo+rhi)/2).toFixed(1)); });
      h+='<g data-dp="'+p.id+'" style="display:'+(vis[p.id]?'':'none')+'"><polyline fill="none" stroke="'+CP[i%6]+'" stroke-width="2" points="'+pts.join(' ')+'"/></g>'; });
    var rp=[]; roe.forEach(function(x,k){ if(x!=null) rp.push([x0+k*bw+bw/2,Yp(x)]); });
    h+='<polyline fill="none" stroke="#1F4A9A" stroke-width="3.5" points="'+rp.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ')+'"/>'+rp.map(function(q){ return '<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="3.5" fill="#fff" stroke="#1F4A9A" stroke-width="2"/>'; }).join('');
    ok.forEach(function(y,k){ var parts=['ROE: '+fr(roe[k])].concat(L.map(function(l){ var x=(V[l[0].id]||{})[y]; return l[0].nombre+': '+fmtU(l[0].unidad)(x); }));
      h+='<rect class="nf-hv" x="'+(x0+k*bw).toFixed(1)+'" y="'+yt+'" width="'+bw.toFixed(1)+'" height="'+(yb-yt)+'" fill="transparent" data-tip="'+esc(y+'|'+parts.join('|'))+'"/>'; });
    h+='</svg>';
    var chips=L.map(function(l,i){ var on=vis[l[0].id];
      return '<button type="button" class="nf-dpc'+(on?' on':'')+'" data-nfdp="'+l[0].id+'" style="--c:'+CP[i%6]+'"><i></i>'+esc(l[0].nombre)+' <span>'+(l[1]==null?'—':'explica '+pc(l[1]))+'</span></button>'; }).join('');
    return '<h3 style="font-size:14px;margin:14px 0 4px">¿Qué pieza se parece más a su ROE?</h3>'+vd('n',txt)+
      '<div class="nf-dpb">'+chips+'</div><div style="max-width:620px">'+h+'</div>'+
      '<div class="nf-mu" style="font-size:12px;margin-top:4px">La línea gruesa azul es su ROE. Pulsa cada pieza para ponerla encima o quitarla. Como cada pieza tiene su unidad (veces, %), se dibuja estirada al alto del ROE: su peor año a la altura del ROE más bajo y su mejor año a la del más alto; así se ve si suben y bajan a la vez. Los valores reales salen al pasar el ratón. «Explica» es la parte de las subidas y bajadas del ROE que va con esa pieza; las seis suman 100 %.</div>';
  }
  /* ---------------- montaje ---------------- */
  var TABS=[['res','Resumen'],['emp','La empresa'],['neg','Cómo va la empresa'],['rat','Ratios'],['cot','Cotización'],['div','Dividendo'],['pos','Mi posición'],['his','Revisiones e historial'],['not','Noticias y coyuntura']];
  function pintar(){
    var v=document.getElementById('view-fichaemp'); if(!v) return;
    var L=lista(); if(!cur) cur=(L[0]||[])[0]; if(!cur){ v.innerHTML='<div class="nf-mu">Sin empresas analizadas.</div>'; return; }
    var i=L.map(function(x){return x[0];}).indexOf(cur), prev=L[(i-1+L.length)%L.length], next=L[(i+1)%L.length];
    var pick='<div class="nf-pick"><div class="nf-bus"><input id="nfBus" type="search" autocomplete="off" placeholder="🔎 Escribe ticker o nombre (LO → Logista)"><div id="nfSug" class="nf-sug"></div></div><select id="nfSel">'+L.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+esc(x[1])+' ('+x[0]+')</option>'; }).join('')+'</select><button data-nfgo="'+(prev||[])[0]+'">◀ '+esc((prev||[])[0]||'')+'</button><button data-nfgo="'+(next||[])[0]+'">'+esc((next||[])[0]||'')+' ▶</button></div>';
    soltarCot(); v.innerHTML=pick+'<div class="nf-mu" style="padding:20px">Cargando la ficha de '+esc(cur)+'…</div>';
    var t=cur;
    cargar(t).then(function(F){ if(t!==cur) return;
      if(!F){ v.innerHTML=pick+'<div class="nf-card">'+vd('a','La ficha de '+esc(t)+' todavía no está publicada (fichas/'+esc(t)+'.json).')+'</div>'; return; }
      var b={res:resumen,emp:empresa,neg:comoVa,rat:ratiosTab,cot:cotizacion,div:dividendo,pos:posicion,his:revisiones,not:noticias}[tab];
      var body=''; try{ body=b(F,t); }catch(e){ console.error('n-ficha',e); body=vd('r','No se pudo pintar esta pestaña: '+esc(e.message)); }
      v.innerHTML=pick+hero(F,t)+'<div class="nf-tabs">'+TABS.map(function(x){ return '<span data-nftab="'+x[0]+'" class="'+(x[0]===tab?'on':'')+'">'+x[1]+'</span>'; }).join('')+'</div><div class="nf-body">'+body+'</div>'+
        (F._evNota?'<div class="nf-pie" style="color:#1F4A9A">↔️ '+esc(F._evNota)+'</div>':'')+'<div class="nf-pie">Ficha generada por el método el '+esc(String(F.generado||'').replace('T',' '))+(F.datos_hasta?' · cuentas hasta '+esc(F.datos_hasta):'')+'</div>';
      if(tab==='cot') montarCot(t);
      if(tab==='neg') try{ montarEv(F,t); }catch(e){ console.error('n-ficha ev',e); }
    });
  }
  window.nfAbrir=function(t){ if(t) cur=String(t).toUpperCase(); tab='res'; if(typeof activarVista==='function') activarVista('fichaemp'); pintar(); window.scrollTo(0,0); };
  document.addEventListener('click',function(e){
    var dp=e.target.closest&&e.target.closest('[data-nfdp]'); if(dp){ var id=dp.getAttribute('data-nfdp'), cd=dp.closest('.nf-card'), g=cd&&cd.querySelector('g[data-dp="'+id+'"]'); if(g){ var on=g.style.display==='none'; g.style.display=on?'':'none'; dp.classList.toggle('on',on); } return; }
    var rt=e.target.closest&&e.target.closest('[data-nfrt]'); if(rt){ var row=document.getElementById(rt.getAttribute('data-nfrt')); if(row) row.style.display=row.style.display==='none'?'':'none'; return; }
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
