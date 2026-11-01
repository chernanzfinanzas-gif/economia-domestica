/* APP NUEVA · Estado del método › Marcador: EVALUACIÓN AUTOMÁTICA (1-nov-2026, Carlos: «vamos a montar la evaluación así»).
   1. Cada hito (6, 12 y 36 meses desde la foto de partida) se cierra solo con el histórico de precios y los dividendos.
      Sin formulario y sin avisos de «rellenar»: calibAvisos deja de pedir nada.
   2. Stop: si se tocó, se mira la cotización 6 meses después del primer toque. Sigue por debajo → JUSTIFICADO;
      ha vuelto por encima → RUIDO; aún no han pasado 6 meses → pendiente.
   3. Un cuadro que compara los métodos, cada uno con su foto congelada:
        · v1 (jun-jul, las apuestas que luego se rehicieron) — calibracion.json, filas v1
        · antiguo (v2, la t0 congelada de DB.calibracion)
        · v3 (calibracion-t0v3.json, foto del 26-oct-2026; no se regenera nunca)
      La vara de medir es «comprar siempre» = la media de TODAS las empresas de ese método en el mismo plazo.
      El método aporta si COMPRAR queda por encima de esa media y ESPERAR por debajo.
   4. Las revisiones posteriores no tocan las fotos de partida.
   Junto a los hitos cerrados se enseña la foto «a hoy» (provisional), que no cuenta como evaluación. */
(function(){
  if(typeof renderPanelMetodo!=='function'||typeof _calibDesdeHistorico!=='function') return;
  window._nCaH=window._nCaH||'hoy';
  var T0V3=null, cargando=false;
  function cargarV3(){ if(T0V3||cargando) return; cargando=true;
    fetch('calibracion-t0v3.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; })
      .then(function(j){ T0V3=(j&&j.empresas)||{}; try{ renderPanelMetodo(); }catch(e){} }); }
  function N(x){ return _calibN(x); }
  function base(f){ return {cot0:N(f.cot0),entMax:N(f.entMax),stop:N(f.stop),poBase:N(f.poBase),decision:String(f.decision||'').toUpperCase()}; }
  function filas(){
    var M={v1:[],v2:[],v3:[]};
    try{ (_calibV1Filas()||[]).forEach(function(f){ if(f.fecha&&N(f.cot0)) M.v1.push({t:f.ticker,fecha:f.fecha,b:base(f)}); }); }catch(e){}
    Object.keys(DB.calibracion||{}).forEach(function(t){ var z=(DB.calibracion[t]||{}).t0; if(z&&z.fecha&&N(z.cot0)) M.v2.push({t:t.toUpperCase(),fecha:z.fecha,b:base(z)}); });
    Object.keys(T0V3||{}).forEach(function(t){ var z=T0V3[t]; if(z&&(z.cot0Fecha||z.fecha)&&N(z.cot0)) M.v3.push({t:t.toUpperCase(),fecha:z.cot0Fecha||z.fecha,b:base(z)}); });
    return M; }
  /* stop: primer toque y cotización 6 meses después (misma base de acciones que la t0) */
  function stopJ(t,b,f0,hasta){ var pj=(typeof _precioCache!=='undefined'&&_precioCache)?_precioCache[t]:null; if(!pj||!pj.data||!_calibIsN(b.stop)) return null;
    var F0=(typeof khEvFactor==='function')?khEvFactor(t,f0):1, d=pj.data, toque=null;
    for(var i=0;i<d.length;i++){ var p=d[i]; if(!p||p[0]<f0||p[0]>hasta) continue; if(p[1]*F0<=b.stop){ toque=p[0]; break; } }
    if(!toque) return null; var mas6=_calibDiana(toque,6), ult=d[d.length-1]; if(!ult||ult[0]<mas6) return 'PEND';
    var c=null; for(var j=d.length-1;j>=0;j--){ if(d[j][0]<=mas6){ c=d[j][1]*F0; break; } }
    return c==null?'PEND':(c<b.stop?'JUST':'RUIDO'); }
  var HZ=[['6m',6,'6 meses'],['12m',12,'12 meses'],['36m',36,'36 meses'],['hoy',0,'A hoy (provisional)']];
  function medir(M){ var hoy=_calibHoy(), falta={}, R={};
    ['v1','v2','v3'].forEach(function(m){ R[m]={};
      HZ.forEach(function(h){ var L=[];
        M[m].forEach(function(f){ var diana=h[1]?_calibDiana(f.fecha,h[1]):hoy; if(h[1]&&diana>hoy) return;
          if(typeof _precioCache!=='undefined'&&_precioCache&&_precioCache[f.t]===undefined){ falta[f.t]=1; return; }
          var r=_calibDesdeHistorico(f.t,f.b,f.fecha,diana); if(!r||!r.ver||!r.ver.evaluada) return;
          L.push({t:f.t,fecha:f.fecha,dec:f.b.decision,v:r.ver,sj:r.ver.tocoStop==='SÍ'?stopJ(f.t,f.b,f.fecha,diana):null}); });
        R[m][h[0]]=L; }); });
    var fl=Object.keys(falta); if(fl.length){ var n=fl.length; fl.forEach(function(t){ _calibLazyPrecios(t,function(){ if(--n===0){ try{ renderPanelMetodo(); }catch(e){} } }); }); }
    return {R:R,cargando:fl.length>0}; }
  function avg(a){ a=a.filter(function(x){ return x!=null; }); return a.length?a.reduce(function(s,x){ return s+x; },0)/a.length:null; }
  function agg(L){ var n=L.length, st=L.filter(function(x){ return x.v.tocoStop==='SÍ'; }), todas=avg(L.map(function(x){ return x.v.retTotal; }));
    function dec(d){ var s=L.filter(function(x){ return x.dec===d; }); return {r:avg(s.map(function(x){ return x.v.retTotal; })),n:s.length}; }
    var C=dec('COMPRAR'), Ma=dec('MANTENER'), E=dec('ESPERAR');
    return {n:n,banda:n?L.filter(function(x){ return x.v.entroBanda==='SÍ'; }).length/n:null,stops:st.length,
      just:st.filter(function(x){ return x.sj==='JUST'; }).length,ruido:st.filter(function(x){ return x.sj==='RUIDO'; }).length,pend:st.filter(function(x){ return x.sj==='PEND'; }).length,
      po:n?L.filter(function(x){ return x.v.alcanzoPO==='SÍ'; }).length/n:null,todas:todas,C:C,Ma:Ma,E:E,
      venC:(C.r!=null&&todas!=null)?C.r-todas:null,venE:(E.r!=null&&todas!=null)?todas-E.r:null}; }
  function primera(M){ var hoy=_calibHoy(), best=null; ['v1','v2','v3'].forEach(function(m){ M[m].forEach(function(f){ [6,12,36].forEach(function(k){ var d=_calibDiana(f.fecha,k); if(d>hoy&&(!best||d<best.d)) best={d:d,t:f.t,m:m,k:k}; }); }); }); return best; }
  var NOM={v1:'v1 (jun-jul)',v2:'Antiguo (v2)',v3:'v3 (26-oct)'};
  function pinta(){
    var sec=document.getElementById('view-metodo'); if(!sec) return; if(!T0V3){ cargarV3(); }
    var M=filas(), me=medir(M), R=me.R, hz=window._nCaH, A={};
    ['v1','v2','v3'].forEach(function(m){ A[m]=agg(R[m][hz]); });
    var cer=0; ['v1','v2','v3'].forEach(function(m){ ['6m','12m','36m'].forEach(function(k){ cer+=R[m][k].length; }); });
    var pr=primera(M), cel=function(v){ return '<td>'+v+'</td>'; }, ret=function(v,n){ return '<td style="font-weight:700;color:'+_calibRetColor(v)+'">'+_calibMetRet(v)+(n!=null?' <small style="color:#94A3B8;font-weight:400">('+n+')</small>':'')+'</td>'; };
    var dif=function(v){ return '<td style="font-weight:800;color:'+(v==null?'#94A3B8':(v>=0?'#15803D':'#B91C1C'))+'">'+(v==null?'—':((v>=0?'+':'')+(v*100).toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1})+' pp'))+'</td>'; };
    var fila=function(e,fn,cls){ return '<tr'+(cls?' class="'+cls+'"':'')+'><td class="l">'+e+'</td>'+['v1','v2','v3'].map(function(m){ return fn(A[m]); }).join('')+'</tr>'; };
    var seg='<div class="n-ca-seg">'+HZ.map(function(h){ return '<button data-ncah="'+h[0]+'" class="'+(hz===h[0]?'on':'')+'">'+h[2]+'</button>'; }).join('')+'</div>';
    var nota=hz==='hoy'?'<div class="n-ca-nota">Foto <b>provisional</b>: cada empresa medida desde su foto de partida hasta hoy. No cuenta como evaluación; sirve para ver cómo va.</div>'
      :(A.v1.n+A.v2.n+A.v3.n===0?'<div class="n-ca-nota">Aún no se ha cumplido ningún hito de '+hz.replace('m',' meses')+'. Se cerrará solo el día que toque'+(pr?(' — el primero, <b>'+pr.t+'</b> ('+NOM[pr.m]+'), el '+pr.d.slice(8,10)+'/'+pr.d.slice(5,7)+'/'+pr.d.slice(0,4)):'')+'.</div>':'');
    var tabla='<div class="ptable"><table class="n-ca-t"><thead><tr><th class="l">Medida</th>'+['v1','v2','v3'].map(function(m){ return '<th>'+NOM[m]+'</th>'; }).join('')+'</tr></thead><tbody>'+
      fila('Empresas medidas',function(c){ return cel(c.n); })+
      fila('Todas · «comprar siempre»',function(c){ return ret(c.todas); },'n-ca-ref')+
      fila('· COMPRAR',function(c){ return ret(c.C.r,c.C.n); },'sub')+
      fila('· MANTENER',function(c){ return ret(c.Ma.r,c.Ma.n); },'sub')+
      fila('· ESPERAR',function(c){ return ret(c.E.r,c.E.n); },'sub')+
      fila('<b>COMPRAR gana a comprar siempre</b>',function(c){ return dif(c.venC); },'n-ca-key')+
      fila('<b>ESPERAR evitó (queda por debajo)</b>',function(c){ return dif(c.venE); },'n-ca-key')+
      fila('% entró en la banda de entrada',function(c){ return cel(_calibMetPct(c.banda)); })+
      fila('% alcanzó el PO base',function(c){ return cel(_calibMetPct(c.po)); })+
      fila('Stops tocados',function(c){ return cel(c.stops); })+
      fila('· justificados (6 meses después seguía debajo)',function(c){ return cel(c.just); },'sub')+
      fila('· ruido (rebotó por encima)',function(c){ return cel(c.ruido); },'sub')+
      fila('· aún sin 6 meses',function(c){ return cel(c.pend); },'sub')+
      '</tbody></table></div>';
    /* detalle empresa a empresa: antiguo contra v3 en el plazo elegido */
    var ix={}; ['v2','v3'].forEach(function(m){ R[m][hz].forEach(function(x){ (ix[x.t]=ix[x.t]||{})[m]=x; }); });
    var dch=function(x){ if(!x) return '<td>—</td><td>—</td>'; return '<td><span class="n-ca-dec d-'+x.dec.toLowerCase()+'">'+(x.dec||'—')+'</span></td><td style="font-weight:700;color:'+_calibRetColor(x.v.retTotal)+'">'+_calibMetRet(x.v.retTotal)+(x.sj==='JUST'?' <small title="stop justificado">⛔</small>':(x.sj==='RUIDO'?' <small title="stop ruido">〰️</small>':''))+'</td>'; };
    var det=Object.keys(ix).sort().map(function(t){ return '<tr><td class="l"><b>'+t+'</b></td>'+dch(ix[t].v2)+dch(ix[t].v3)+'</tr>'; }).join('');
    var detH=det?'<div class="ptable"><table class="n-ca-t"><thead><tr><th class="l">Empresa</th><th>Antiguo</th><th>Rent.</th><th>v3</th><th>Rent.</th></tr></thead><tbody>'+det+'</tbody></table></div>':'<div class="n-ca-nota">Sin empresas medidas en este plazo.</div>';
    var como='<ul class="mt-guia"><li><b>Se evalúa solo.</b> El día que se cumple cada hito, la app lo cierra con el histórico de precios y los dividendos. No hay que confirmar nada.</li>'+
      '<li><b>La vara es «comprar siempre»</b>: la media de todas las empresas del mismo método y plazo. El método sirve si COMPRAR queda por encima y ESPERAR por debajo. Si no, la decisión no aporta.</li>'+
      '<li><b>Stop justificado o ruido</b>: se mira la cotización 6 meses después del primer toque. Si sigue por debajo, el stop acertó; si volvió por encima, saltó por ruido. Muchos «ruido» = stop demasiado ajustado.</li>'+
      '<li><b>Las fotos de partida no se tocan.</b> Lo que cambie una revisión posterior no rehace la foto. Cada método se compara con su propia vara, porque sus fechas de partida son distintas.</li></ul>';
    /* bloque principal y cifras de arriba */
    var blk=sec.querySelector('.pos-blk[data-metblk="auto"]'); if(blk){ window._nCaOpen=blk.classList.contains('open'); window._nCaDet=!!blk.querySelector('.n-ca-det.open'); }
    var abierto=window._nCaOpen!==false, detAb=!!window._nCaDet;
    var sum=(me.cargando?'cargando precios… · ':'')+cer+' hitos cerrados'+(pr?(' · próximo '+pr.d.slice(8,10)+'/'+pr.d.slice(5,7)+'/'+pr.d.slice(2,4)):'');
    var html='<div class="pos-blk'+(abierto?' open':'')+'" data-metblk="auto"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">⚖️ Los métodos, comparados</span><span class="bsum">'+sum+'</span></div><div class="pos-blk-b"><div class="blk-pad">'+
      seg+nota+tabla+'<div class="n-ca-det'+(detAb?' open':'')+'"><button class="n-ca-detb">'+(detAb?'▾':'▸')+' Empresa a empresa (antiguo contra v3)</button><div class="n-ca-detc">'+detH+'</div></div>'+
      '<details class="n-ca-como"><summary>Cómo se evalúa</summary>'+como+'</details></div></div></div>';
    if(blk) blk.outerHTML=html; else { var k=document.getElementById('metKpis'); if(k) k.insertAdjacentHTML('afterend',html); else sec.insertAdjacentHTML('beforeend',html); }
    /* fuera lo que pedía rellenar a mano o queda repetido */
    ['marcador','cerradas','v1','corregir'].forEach(function(k){ var b=sec.querySelector('.pos-blk[data-metblk="'+k+'"]'); if(b) b.remove(); });
    var K=document.getElementById('metKpis');
    if(K&&typeof nKpi==='function'){ var v3h=agg(R.v3.hoy), v2h=agg(R.v2.hoy);
      K.innerHTML='<div class="n-ctrl">'+
        nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'📸',t:'Fotos de partida',v:String(M.v1.length+M.v2.length+M.v3.length),s:'v1 '+M.v1.length+' · antiguo '+M.v2.length+' · v3 '+M.v3.length})+
        nKpi({c:'#15803D',bg:'#DCFCE7',ic:'✅',t:'Hitos cerrados',v:String(cer),s:'se cierran solos, sin formulario'})+
        nKpi({c:'#D97706',bg:'#FEF3C7',ic:'🎯',t:'Próximo hito',v:pr?(pr.d.slice(8,10)+'/'+pr.d.slice(5,7)+'/'+pr.d.slice(2,4)):'—',s:pr?(pr.t+' · '+NOM[pr.m]+' · '+pr.k+' meses'):'sin hitos pendientes'})+
        nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'⚖️',t:'COMPRAR vs comprar siempre',v:v2h.venC==null?'—':((v2h.venC>=0?'+':'')+(v2h.venC*100).toLocaleString('es-ES',{maximumFractionDigits:1})+' pp'),vCls:v2h.venC==null?'':(v2h.venC>=0?'n-pos':'n-neg'),s:'método antiguo, a hoy (provisional)'})+
        '</div>'; }
  }
  var o=renderPanelMetodo; renderPanelMetodo=function(){ try{ var b0=document.querySelector('#view-metodo .pos-blk[data-metblk="auto"]'); if(b0){ window._nCaOpen=b0.classList.contains('open'); window._nCaDet=!!b0.querySelector('.n-ca-det.open'); } }catch(e){} var r=o.apply(this,arguments); try{ pinta(); }catch(e){ console.warn('[n-calibauto]',e); } return r; };
  window.calibAvisos=function(){ return []; };   /* ya no hay nada que rellenar a mano */
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-ncah]'); if(b){ e.stopPropagation(); window._nCaH=b.getAttribute('data-ncah'); try{ pinta(); }catch(err){} return; }
    var d=e.target.closest&&e.target.closest('.n-ca-detb'); if(d){ e.stopPropagation(); var w=d.parentNode; w.classList.toggle('open'); d.textContent=(w.classList.contains('open')?'▾':'▸')+' Empresa a empresa (antiguo contra v3)'; } },true);
  var s=document.createElement('style'); s.textContent=
    '.n-ca-seg{display:inline-flex;flex-wrap:wrap;gap:2px;background:#F1F5F9;border-radius:10px;padding:3px;margin:0 0 10px}.n-ca-seg button{border:0;background:transparent;padding:6px 12px;border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer}.n-ca-seg button.on{background:#fff;color:#1F4A9A;box-shadow:0 1px 3px rgba(0,0,0,.1)}'+
    '.n-ca-nota{background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:10px;padding:9px 12px;font-size:13px;color:#475569;margin:0 0 10px}'+
    '.n-ca-t td,.n-ca-t th{text-align:center}.n-ca-t td.l,.n-ca-t th.l{text-align:left}.n-ca-t tr.sub td{color:#64748B;font-size:12.5px}.n-ca-t tr.sub td.l{padding-left:18px}.n-ca-t tr.n-ca-ref td{background:#F8FAFC;font-weight:700}.n-ca-t tr.n-ca-key td{background:#F5F3FF}'+
    '.n-ca-det{margin-top:12px}.n-ca-detb{border:1px solid #E2E8F0;background:#fff;border-radius:9px;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;color:#1F4A9A;cursor:pointer}.n-ca-detc{display:none;margin-top:8px}.n-ca-det.open .n-ca-detc{display:block}'+
    '.n-ca-dec{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:800;background:#E0E7FF;color:#3730A3}.n-ca-dec.d-comprar{background:#DBEAFE;color:#1E40AF}.n-ca-dec.d-esperar{background:#FEF3C7;color:#92400E}.n-ca-dec.d-vender,.n-ca-dec.d-reducir{background:#FEE2E2;color:#991B1B}'+
    '.n-ca-como{margin-top:12px;font-size:13px}.n-ca-como summary{cursor:pointer;font-weight:700;color:#475569}';
  document.head.appendChild(s);
})();
