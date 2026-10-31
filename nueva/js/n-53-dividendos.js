/* APP NUEVA · Mi cartera → Dividendos (boceto «Dividendos - boceto 30-oct y», decidido con Carlos 30-oct)
   Las cuatro pestañas de antes (Dividendos, Calendario, Evolución del dividendo, Actualizar dividendos)
   en una sola, con 4 cifras arriba, el riesgo de recorte y cuatro sub-pestañas:
   · Cobrado   — tabla empresa×año traspuesta (años en columnas, reciente a la izquierda, fila total,
                 empresas por fecha de 1.ª compra, vendidas en rojo), gráfica año a año con lo pendiente
                 del año y la previsión del siguiente, resumen anual traspuesto y agrupado.
                 El resumen fiscal pasa a Plan → Fiscalidad.
   · Calendario — abre en «Cartera» y «desde hoy»; un solo selector Cartera / Dentro de Plan / Analizadas / Universo.
   · Por acción — antes «Evolución del dividendo».
   · Anotar    — rejilla por pagos, sin «Volcar»: proyectado → anotación → corregida → confirmada.
                 En la app nueva SOLO SE MIRA (no guarda); se sigue anotando en la de siempre.
   Los cálculos son los de siempre; aquí se ordena y se pinta. */
(function(){
  if(typeof renderDividendos!=='function') return;
  var SUBS=[['cob','Cobrado'],['cal','Calendario'],['evo','Por acción'],['ano','Anotar']];
  window._ndSub=window._ndSub||'cob';
  window._ndAmb=window._ndAmb||'car';
  function es(v,d){ d=(d==null)?2:d; var n=+v||0, neg=n<0, s=Math.abs(n).toFixed(d).split('.'); s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (neg?'-':'')+s[0]+(d?','+s[1]:''); }
  function esc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fd(s){ s=(s||'').slice(0,10); var p=s.split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:''; }
  function U(t){ return (''+(t||'')).toUpperCase(); }
  function nowY(){ return new Date().getFullYear(); }
  function hoyISO(){ return (typeof _divHoyISO==='function')?_divHoyISO():new Date().toISOString().slice(0,10); }
  function held(){ try{ return heldTickerSet(); }catch(e){ return new Set(); } }

  /* ================= datos de Cobrado (misma cuenta que renderDividendos) ================= */
  function cobrado(){
    var ops=(DB.operaciones||[]).slice(), divs=DB.dividendos||{}, divIng=DB.divIngresos||{};
    var opT=new Set(ops.map(function(o){return U(o.ticker);}).filter(Boolean));
    var tks=[].concat(Object.keys(divs),Array.from(opT),Object.keys(divIng)).filter(function(v,i,s){return v&&s.indexOf(v)===i;});
    var by={};
    tks.forEach(function(t){ by[t]={};
      if(opT.has(t)){
        var tops=ops.filter(function(o){return U(o.ticker)===t;});
        (divs[t]||[]).filter(divEsCobrado).forEach(function(d){ var y=(d.fecha||'').slice(0,4); if(!y)return;
          var acc=tops.filter(function(o){return o.tipo!=='venta'&&o.fecha<=d.fecha;}).reduce(function(s,o){return s+num(o.acciones);},0)
                 -tops.filter(function(o){return o.tipo==='venta'&&o.fecha<d.fecha;}).reduce(function(s,o){return s+num(o.acciones);},0);
          by[t][y]=(by[t][y]||0)+acc*num(d.importe); });
      } else if(divIng[t]){ Object.keys(divIng[t]).forEach(function(y){ by[t][y]=num(divIng[t][y]); }); }
    });
    (DB.cerradas||[]).forEach(function(c){ var cc=cerradaCalc(c), t=U(cc.ticker); if(!t)return; by[t]=by[t]||{};
      Object.keys(cc.byYear).forEach(function(y){ by[t][y]=(by[t][y]||0)+cc.byYear[y]; }); });
    /* fechas de 1.ª compra y de venta */
    var pc={}, pv={};
    ops.slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');}).forEach(function(o){ var t=U(o.ticker); if(o.tipo!=='venta'&&o.fecha&&!pc[t]) pc[t]=o.fecha; });
    (DB.cerradas||[]).forEach(function(c){ var t=U(c.ticker); var co=(c.ops||[]).slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
      co.forEach(function(o){ if(o.tipo==='compra'&&o.fecha&&(!pc[t]||o.fecha<pc[t])) pc[t]=o.fecha; if(o.tipo==='venta'&&o.fecha&&(!pv[t]||o.fecha>pv[t])) pv[t]=o.fecha; });
      if(!co.length){ if(c.fechaCompra&&(!pc[t]||c.fechaCompra<pc[t])) pc[t]=c.fechaCompra; if(c.fechaVenta) pv[t]=c.fechaVenta; } });
    var H=held(), tot={}, years={};
    Object.keys(by).forEach(function(t){ var s=0; Object.keys(by[t]).forEach(function(y){ s+=by[t][y]; years[y]=1; }); tot[t]=s; });
    var filas=Object.keys(by).filter(function(t){ return tot[t]>0||H.has(t); });
    H.forEach(function(t){ if(filas.indexOf(t)<0){ filas.push(t); by[t]=by[t]||{}; tot[t]=tot[t]||0; } });
    function ini(t){ if(pc[t]) return pc[t]; var ys=Object.keys(by[t]).filter(function(y){return by[t][y]>0;}).sort(); return ys.length?ys[0]+'-01-01':'9999'; }
    filas.sort(function(a,b){ return ini(a).localeCompare(ini(b)); });
    var ys=Object.keys(years).filter(function(y){ return filas.some(function(t){return (by[t][y]||0)>0;}); }).sort().reverse();
    var totY={}; ys.forEach(function(y){ totY[y]=filas.reduce(function(s,t){return s+(by[t][y]||0);},0); });
    var grand=filas.reduce(function(s,t){return s+tot[t];},0);
    return {by:by,tot:tot,filas:filas,ys:ys,totY:totY,grand:grand,pc:pc,pv:pv,H:H};
  }
  /* cobrado del año, pendiente y próximo cobro (las mismas fuentes que el calendario) */
  function kpis(){
    var y=nowY(), hoy=hoyISO(), cob=0, pend=0, prox=null, pos={};
    try{ invPositions().forEach(function(x){ if(x.acciones>0.0001){ var t=U(x.ticker); pos[t]=(pos[t]||0)+x.acciones; } }); }catch(e){}
    Object.keys(pos).forEach(function(t){
      ((DB.dividendos||{})[t]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(f.slice(0,4)===String(y)&&divEsCobrado(d)){ cob+=_calSharesAt(t,f,true)*(+d.importe||0); } });
      try{ (_calPendNoReg(t,y)||[]).forEach(function(e){ if(!(e.fecha>hoy)) return; var v=(+e.sh)*(+e.imp); pend+=v; if(!prox||e.fecha<prox.f) prox={f:e.fecha,t:t,v:v}; }); }catch(e){}
    });
    /* previsión del año siguiente: tu cartera actual con los DPA del calendario */
    var sig=0, sigT={};
    try{ calEventosAnio(y+1).forEach(function(e){ if(e.tipo==='pago'&&pos[e.t]){ var v=(+e.sh||0)*(+e.imp||0); sig+=v; sigT[e.t]=(sigT[e.t]||0)+v; } }); }catch(e){}
    return {y:y,cob:cob,pend:pend,prox:prox,sig:sig,sigT:sigT};
  }

  /* ================= montaje (una vez) ================= */
  function montar(){
    var V=document.getElementById('view-dividendos'); if(!V||V._nd) return; V._nd=1;
    var hero=V.querySelector('.vhero'); if(hero){ var p=hero.querySelector('p'); if(p) p.innerHTML='Lo que cobras, cuándo lo cobras y cuánto crecerá. Antes eran cuatro pestañas.'; }
    var k=document.createElement('div'); k.id='ndKpis'; k.className='nd-k';
    var rw=document.getElementById('divRiesgoWrap');
    if(hero&&hero.nextSibling) V.insertBefore(k,hero.nextSibling); else V.appendChild(k);
    if(rw) V.insertBefore(rw,k.nextSibling);
    var tb=document.createElement('div'); tb.id='ndTabs'; tb.className='nd-tabs subtabs';
    tb.innerHTML=SUBS.map(function(s){return '<button data-ndsub="'+s[0]+'">'+s[1]+'</button>';}).join('');
    V.insertBefore(tb,(rw||k).nextSibling);
    SUBS.forEach(function(s){ var p=document.createElement('div'); p.id='ndPane-'+s[0]; p.className='nd-pane'; V.appendChild(p); });
    var pc=document.getElementById('ndPane-cob');
    ['divKpis','divBody'].forEach(function(id){ var e=document.getElementById(id); if(e) pc.appendChild(e); });
    var pcal=document.getElementById('ndPane-cal'), vc=document.getElementById('view-calendario'); if(vc){ pcal.appendChild(vc); vc.classList.add('nd-in'); }
    var pev=document.getElementById('ndPane-evo'), vp=document.getElementById('view-prevision');
    pev.innerHTML='<div class="nd-nota">Antes «Evolución del dividendo». Aquí se ve <b>cuánto paga cada empresa por acción</b> y cómo crece; lo que cobras tú está en <b>Cobrado</b>.</div>';
    if(vp){ pev.appendChild(vp); vp.classList.add('nd-in'); }
    document.getElementById('ndPane-ano').innerHTML='<div id="ndAno"></div>';
    tb.addEventListener('click',function(e){ var b=e.target.closest('[data-ndsub]'); if(!b) return; window._ndSub=b.dataset.ndsub; pintarSub(); });
    V.addEventListener('click',function(e){
      if(e.target.closest('.pos-blk-h')) setTimeout(sync,60);
      var a=e.target.closest('[data-ndamb]'); if(a){ window._ndAmb=a.dataset.ndamb; if(typeof _calPaint==='function') _calPaint(); return; }
      var vp=e.target.closest('[data-ndpas]'); if(vp){ window._ndVerPas=vp.dataset.ndpas==='1'; if(typeof _calPaint==='function') _calPaint(); return; }
      var y=e.target.closest('[data-ndano]'); if(y){ window._ndAnoY=(window._ndAnoY||nowY()+1)+(+y.dataset.ndano); window._ndAnoSel=null; pintarAno(); return; }
      var ab=e.target.closest('[data-ndpok],[data-ndpdes],[data-ndpdel],[data-ndpadd],[data-ndprst]'); if(ab&&window._ndAnoSel){ anotarAccion(ab); return; }
      var c=e.target.closest('[data-ndcel]'); if(c){ window._ndAnoSel=(window._ndAnoSel===c.dataset.ndcel)?null:c.dataset.ndcel; pintarAno(); return; }
      var q=e.target.closest('[data-ndq]'); if(q) return;
    });
    V.addEventListener('input',function(e){ if(e.target&&e.target.id==='ndAnoQ'){ window._ndAnoQ=e.target.value; pintarAno(true); } });
    V.addEventListener('change',function(e){ var el=e.target; if(!el||!window._ndAnoSel) return;
      var t=window._ndAnoSel, Y=window._ndAnoY, P=window.nAnotar.pagosDe(t,Y);
      if(el.dataset.ndpb!=null){ var i=+el.dataset.ndpb; if(!P[i]) return; P[i].bruto=num((el.value||'').replace(',','.')); P[i].estado='c'; window.nAnotar.guardar(t,Y,P); pintarAno(); return; }
      if(el.dataset.ndpf){ var q=el.dataset.ndpf.split('|'); if(!P[+q[0]]) return; P[+q[0]][q[1]]=el.value||''; if(P[+q[0]].estado==='p') P[+q[0]].estado='c'; window.nAnotar.guardar(t,Y,P); pintarAno(); return; }
      if(el.dataset.ndtot){ var v=num((el.value||'').replace(',','.')); if(!(v>=0)) return; window.nAnotar.guardar(t,Y,window.nAnotar.repartir(P,v)); pintarAno(); return; }
    });
    /* barras de desplazamiento sincronizadas (arriba y abajo) */
    window.addEventListener('resize',sync);
  }
  function sync(){ document.querySelectorAll('#view-dividendos .nd-sc').forEach(function(b){ var t=b.previousElementSibling; if(!t||!t.classList.contains('nd-sct')) return;
    t.firstElementChild.style.width=b.scrollWidth+'px';
    if(!b._s){ b._s=1; var l=0; t.onscroll=function(){ if(l)return; l=1; b.scrollLeft=t.scrollLeft; l=0; }; b.onscroll=function(){ if(l)return; l=1; t.scrollLeft=b.scrollLeft; l=0; }; } }); }

  function pintarSub(){
    var s=window._ndSub;
    document.querySelectorAll('#ndTabs [data-ndsub]').forEach(function(b){ b.classList.toggle('on',b.dataset.ndsub===s); b.classList.toggle('active',b.dataset.ndsub===s); });
    SUBS.forEach(function(x){ var p=document.getElementById('ndPane-'+x[0]); if(p) p.style.display=(x[0]===s)?'block':'none'; });
    var vc=document.getElementById('view-calendario'), vp=document.getElementById('view-prevision');
    if(s==='cal'&&vc){ vc.classList.add('active'); if(window._ndCalPrimera==null){ window._ndCalPrimera=1; } try{ renderCalendario(); }catch(e){} }
    if(s==='evo'&&vp){ vp.classList.add('active'); try{ renderEvoDiv(); }catch(e){} }
    if(s==='ano') pintarAno();
    if(s==='cob') setTimeout(sync,30);
  }

  /* ================= cabecera: 4 cifras ================= */
  function pintarKpis(C,K){
    var el=document.getElementById('ndKpis'); if(!el) return; el.className='n-ctrl';
    var pr=K.prox;
    el.innerHTML=nKpi({c:'#15803D',bg:'#DCFCE7',ic:'💶',t:'Cobrado en '+K.y+' (bruto)',v:es(K.cob)+' €',vCls:'n-pos',s:'por cobrar hasta diciembre <b>'+es(K.pend)+' €</b>'})+
      nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'📅',t:'Próximo cobro',v:pr?es(pr.v)+' €':'—',s:pr?'<b>'+esc(pr.t)+'</b> · '+fd(pr.f):'nada pendiente este año'})+
      nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'🎯',t:'Total '+K.y+' previsto',v:es(K.cob+K.pend)+' €',s:'cobrado + por cobrar'})+
      nKpi({c:'#7C3AED',bg:'#EDE9FE',ic:'🏦',t:'Cobrado desde el principio',v:es(C.grand)+' €',s:'bruto · neto <b>'+es(C.grand*0.81)+' €</b>'});
  }

  /* ================= Cobrado ================= */
  function tablaEmpresas(C){
    var ys=C.ys, h='<div class="nd-sct"><div></div></div><div class="nd-sc"><table class="nd-t nd-tr"><thead><tr><th class="l">Empresa</th><th class="c">1.ª compra</th><th class="n tc">Total</th>'+
      ys.map(function(y){return '<th class="n">'+y+'</th>';}).join('')+'</tr></thead><tbody>';
    h+='<tr class="sum"><td class="l">Total año</td><td class="c"></td><td class="n tc">'+es(C.grand)+'</td>'+ys.map(function(y){return '<td class="n">'+es(C.totY[y])+'</td>';}).join('')+'</tr>';
    C.filas.forEach(function(t){ var vend=!C.H.has(t)&&!!C.pv[t];
      h+='<tr class="'+(vend?'vend':'')+'"><td class="l"><b data-ficha="'+esc(t)+'">'+esc(t)+'</b>'+(vend?' <span class="nd-vt">vendida</span>':'')+'</td>'+
        '<td class="c">'+(C.pc[t]?fd(C.pc[t]):'—')+(vend?'<br><span class="nd-vr">vendida '+fd(C.pv[t])+'</span>':'')+'</td>'+
        '<td class="n tc"><b>'+(C.tot[t]?es(C.tot[t]):'<span class="dot">·</span>')+'</b></td>'+
        ys.map(function(y){ var v=C.by[t][y]||0; return '<td class="n">'+(v?es(v):'<span class="dot">·</span>')+'</td>'; }).join('')+'</tr>'; });
    return h+'</tbody></table></div><div class="nd-pie">Años en columnas (el más reciente a la izquierda), primera fila = total del año, empresas por fecha de primera compra. Importes brutos en €.</div>';
  }
  function grafica(C,K){
    var ser=C.ys.slice().reverse().map(function(y){return [+y,C.totY[y]];}), pend=K.pend, ya=K.y;
    if(!ser.length) return '<div class="muted">Sin dividendos cobrados todavía.</div>';
    if(!ser.some(function(s){return s[0]===ya;})) ser.push([ya,0]);
    if(K.sig>0) ser.push([ya+1,-K.sig]);
    var W=1180,H=360,L=62,R=14,T=34,Bt=48, mx=0;
    ser.forEach(function(s){ mx=Math.max(mx,Math.abs(s[1])+(s[0]===ya?pend:0)); });
    var step=mx>40000?10000:(mx>16000?5000:2500), top=(Math.floor(mx/step)+1)*step, pw=W-L-R, ph=H-T-Bt, n=ser.length, bw=pw/n*0.66;
    var Y=function(v){return T+ph-(v/top)*ph;};
    var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" class="nd-g"><defs><pattern id="ndh1" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#DCFCE7"/><line x1="0" y1="0" x2="0" y2="7" stroke="#16A34A" stroke-width="2.2"/></pattern><pattern id="ndh2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#EAF1FD"/><line x1="0" y1="0" x2="0" y2="7" stroke="#93B4F0" stroke-width="2.2"/></pattern></defs>';
    for(var v=0;v<=top;v+=step) g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="#EEF2F7"/><text x="'+(L-8)+'" y="'+(Y(v)+4).toFixed(1)+'" font-size="12" fill="#94A3B8" text-anchor="end">'+es(v,0)+'</text>';
    var prev=null;
    ser.forEach(function(s,i){ var y=s[0], b=s[1], x=L+pw/n*i+(pw/n-bw)/2, cx=(x+bw/2).toFixed(1);
      if(b<0){ b=-b; var base=(prev!=null?prev:0)+pend;
        var det=Object.keys(K.sigT).sort(function(a,c){return K.sigT[c]-K.sigT[a];}).map(function(t){return t+' '+es(K.sigT[t],0);}).join(' · ');
        g+='<g><title>'+y+' previsión: bruto '+es(b,0)+' € · neto '+es(b*0.81,0)+' €'+(base>0?' · '+((b/base-1)*100>=0?'+':'')+((b/base-1)*100).toFixed(1).replace('.',',')+' % vs '+(y-1)+' previsto':'')+'&#10;'+det+'</title>'+
          '<rect x="'+x.toFixed(1)+'" y="'+Y(b).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(Y(0)-Y(b)).toFixed(1)+'" fill="url(#ndh2)" stroke="#2563EB" stroke-dasharray="4 3" rx="2"/>'+
          '<text x="'+cx+'" y="'+(Y(b)-20).toFixed(1)+'" font-size="11" fill="#1D4ED8" text-anchor="middle" font-weight="700">previsión</text>'+
          '<text x="'+cx+'" y="'+(Y(b)-6).toFixed(1)+'" font-size="12.5" fill="#1D4ED8" text-anchor="middle" font-weight="800">'+es(b,0)+'</text>'+
          '<text x="'+cx+'" y="'+(H-Bt+20)+'" font-size="13" fill="#1D4ED8" text-anchor="middle" font-weight="700">'+y+'</text></g>';
        return; }
      var net=b*0.81, tl=b+(y===ya?pend:0);
      g+='<g><title>'+y+': bruto '+es(b)+' € · neto '+es(net)+' € · retención '+es(b-net)+' €'+(prev?' · '+(b>=prev?'+':'')+((b/prev-1)*100).toFixed(0)+' % vs '+(y-1):'')+'</title>'+
        '<rect x="'+x.toFixed(1)+'" y="'+Y(net).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(Y(0)-Y(net)).toFixed(1)+'" fill="#16A34A" rx="2"/>'+
        '<rect x="'+x.toFixed(1)+'" y="'+Y(b).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(Y(net)-Y(b)).toFixed(1)+'" fill="#FBBF24"/>';
      if(y===ya&&pend>0) g+='<rect x="'+x.toFixed(1)+'" y="'+Y(tl).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(Y(b)-Y(tl)).toFixed(1)+'" fill="url(#ndh1)" stroke="#16A34A" stroke-dasharray="3 2"/><text x="'+cx+'" y="'+(Y(tl)-20).toFixed(1)+'" font-size="11" fill="#15803D" text-anchor="middle" font-weight="700">previsto</text>';
      g+='<text x="'+cx+'" y="'+(Y(tl)-6).toFixed(1)+'" font-size="12.5" fill="#1F2937" text-anchor="middle" font-weight="800">'+es(tl,0)+'</text>'+
        '<text x="'+cx+'" y="'+(H-Bt+20)+'" font-size="13" fill="#334155" text-anchor="middle" font-weight="700">'+y+'</text></g>';
      prev=b; });
    g+='</svg>';
    return g+'<div class="nd-ley"><span><i style="background:#16A34A"></i>Neto (lo que te queda)</span><span><i style="background:#FBBF24"></i>Retención 19 %</span>'+
      (pend>0?'<span><i class="h1"></i>Por cobrar en '+ya+': '+es(pend,0)+' €</span>':'')+
      (K.sig>0?'<span><i class="h2"></i>Previsión '+(ya+1)+': '+es(K.sig,0)+' € (tu cartera actual con los DPA del calendario)</span>':'')+
      '<span class="lt">Cifra encima = bruto del año. Pasa el ratón por una barra para ver neto, retención y % frente al año anterior.</span></div>';
  }
  /* Resumen anual: se leen las filas que pinta renderDividendos (mismas cuentas) y se traspone */
  function resumenTraspuesto(blk){
    var t=blk.querySelector('.pos-desk table'); if(!t) return;
    var hd=[].map.call(t.querySelectorAll('thead th'),function(th){return th.textContent.replace(/\s+/g,' ').trim();});
    var ix={}; hd.forEach(function(h,i){ ix[h.replace('✏️','').trim()]=i; });
    var R=[].map.call(t.querySelectorAll('tbody tr'),function(tr){ return [].map.call(tr.children,function(td){ var inp=td.querySelector('input'); if(inp) return inp.value?es(+inp.value):''; return td.textContent.replace(/ €/g,'').replace(/ €/g,'').trim(); }); });
    var G=[['Inversión',[['Compras','Compras',0,''],['Ventas','Ventas',0,''],['Invertido neto','Invertido neto',0,'compras − ventas − dividendos brutos cobrados: tu dinero que sigue dentro',1],['Valor compra','Valor de compra',0,'coste de las acciones que tienes']]],
           ['Dividendo',[['Div bruto','Dividendo bruto',0,'',1],['Div neto','Dividendo neto',0,'bruto − 19 %'],['%Inv','% sobre invertido neto',1,'dividendo bruto ÷ invertido neto'],['%Compra','% sobre valor de compra',1,'dividendo bruto ÷ valor de compra']]],
           ['Hacienda',[['Impuesto','Retención (19 %)',0,''],['Dev. Hacienda','✏️ Devolución de Hacienda',0,'el único dato que escribes tú cada año: lo que te devuelve Hacienda en la renta'],['Total ingresado','Total ingresado',0,'neto + devolución',1],['Descuento real','Impuesto real pagado',0,'bruto − total ingresado'],['Tasa imp.','Tasa real de impuesto',1,'impuesto real ÷ bruto']]],
           ['Resultado',[['Rent. neta','Rentabilidad neta',1,'total ingresado ÷ valor de compra',1]]]];
    var anos=R.map(function(r){return r[0];});
    var h='<div class="nd-sct"><div></div></div><div class="nd-sc"><table class="nd-t nd-tr nd-rs"><thead><tr><th class="l">Concepto</th>'+anos.map(function(y){return '<th class="n">'+esc(y)+'</th>';}).join('')+'</tr></thead><tbody>';
    G.forEach(function(g){ h+='<tr class="grp"><td class="l">'+g[0]+'</td>'+anos.map(function(){return '<td></td>';}).join('')+'</tr>';
      g[1].forEach(function(it){ var i=ix[it[0]]; if(i==null) return; var dev=it[0]==='Dev. Hacienda';
        h+='<tr class="'+(dev?'dev':'')+(it[4]?' key':'')+'"><td class="l">'+it[1]+(it[3]?'<div class="tip">'+it[3]+'</div>':'')+'</td>'+
          R.map(function(r){ var v=r[i]||''; if(dev){ var yy=String(r[0]||'').trim(), dv=(DB.devolucionHacienda||{})[yy]; return '<td class="n"><input class="nd-dev" type="number" step="0.01" min="0" data-devhac="'+esc(yy)+'" value="'+(dv?num(dv):'')+'" placeholder="sin anotar" title="Lo que te devolvió Hacienda por la retención de dividendos de '+esc(yy)+'"></td>'; }
            if(v===''||v==='·') return '<td class="n"><span class="dot">·</span></td>';
            if(it[2]) v=v.replace('+','').replace('.',',').replace('%',' %');
            return '<td class="n'+(/^-/.test(v)?' neg':'')+'">'+esc(v)+'</td>'; }).join('')+'</tr>'; }); });
    h+='</tbody></table></div><div class="nd-pie">Mismo formato que la tabla de empresas. La fila <b>✏️ Devolución de Hacienda</b> es la única que escribes tú: pon la cifra en el año y se recalculan el total ingresado y el impuesto real.</div>';
    var b=blk.querySelector('.div-pad'); if(b) b.innerHTML=h;
  }
  function postCobrado(){
    var body=document.getElementById('divBody'); if(!body||!DB) return;
    var C=cobrado(), K=kpis(); pintarKpis(C,K);
    var dk=document.getElementById('divKpis'); if(dk) dk.style.display='none';
    body.querySelectorAll('.pos-blk').forEach(function(b){ var k=b.getAttribute('data-divblk');
      if(k==='fiscal'){ b.outerHTML='<div class="nd-nota">🧾 El <b>Resumen fiscal por año (renta)</b> que estaba aquí pasa a <b>Plan → Fiscalidad</b>, con lo demás fiscal.</div>'; return; }
      var pad=b.querySelector('.div-pad'), bs=b.querySelector('.bsum');
      if(k==='matriz'&&pad){ pad.innerHTML=tablaEmpresas(C); if(bs) bs.textContent=C.filas.length+' empresas · '+es(C.grand)+' € total'; }
      if(k==='evol'&&pad){ pad.innerHTML=grafica(C,K); }
      if(k==='resumen') resumenTraspuesto(b);
    });
    setTimeout(sync,30);
    /* la previsión del año siguiente sale del calendario: si aún no ha cargado, se repinta al cargar */
    if(typeof _calDatosOK!=='undefined'&&!_calDatosOK&&!window._ndEsperaCal){ window._ndEsperaCal=1; try{ _calAsegurarDatos(); }catch(e){}
      var n=0, iv=setInterval(function(){ n++; if(_calDatosOK||n>60){ clearInterval(iv); window._ndEsperaCal=0; if(_calDatosOK&&document.getElementById('view-dividendos').classList.contains('active')) renderDividendos(); } },500); }
  }

  /* ================= Calendario ================= */
  var AMB=[['car','Cartera'],['plan','En Plan'],['ana','Analizadas'],['uni','Universo']];
  function aplicarAmb(){ var a=window._ndAmb; try{ _calFil.ambito=(a==='car')?'cartera':'todas'; }catch(e){} window._calShowAna=(a==='ana'||a==='uni'); window._calShowUni=(a==='uni'); }
  function postCal(){
    var V=document.getElementById('view-calendario'); if(!V||!V.closest('#ndPane-cal')) return;
    V.querySelectorAll('#calBar label.cal-anatgl').forEach(function(l){ l.remove(); });
    var cb=document.getElementById('calBody');
    /* la fila propia de la Agenda: fuera «Cartera + radar / Solo cartera» (los sustituye el selector) y los separadores */
    var row=V.querySelector('#calBody .card > div');
    if(row&&row.querySelector('.calFbtn')){ row.querySelectorAll('[data-cala]').forEach(function(b){ b.remove(); });
      [].slice.call(row.children).forEach(function(c){ if(c.tagName==='SPAN'&&!c.textContent.trim()) c.remove(); });
      row.classList.add('nd-tiporow'); if(!row.querySelector('.nd-lbl')){ var sg=document.createElement('span'); sg.className='n-seg'; row.querySelectorAll('.calFbtn[data-calf]').forEach(function(b){ b.removeAttribute('style'); sg.appendChild(b); }); row.insertBefore(sg,row.firstChild); row.insertAdjacentHTML('afterbegin','<span class="nd-lbl">Tipo</span>'); } }
    V.querySelectorAll('#calBody span').forEach(function(sp){ if(!sp.children.length&&sp.textContent.trim()==='est'){ sp.textContent='⏳ fecha estimada'; sp.title='La empresa aún no ha confirmado la fecha'; } });
    var pas=0; V.querySelectorAll('#calBody tr').forEach(function(tr){ if(/opacity:\s*\.4/.test(tr.getAttribute('style')||'')){ tr.classList.add('nd-pas'); pas++; } });
    V.querySelectorAll('#calBody .e-past').forEach(function(c){ c.classList.add('nd-pas'); });
    V.classList.toggle('nd-verpas',!!window._ndVerPas);
    /* barra de filtros propia, encima del calendario y la misma en las tres vistas */
    var f=document.getElementById('ndCalFil');
    if(!f&&cb){ f=document.createElement('div'); f.id='ndCalFil'; f.className='nd-fil'; cb.parentNode.insertBefore(f,cb); }
    if(f){ var ag=(typeof _calVista==='undefined'||_calVista==='agenda');
      f.innerHTML='<div class="r"><span class="nd-lbl">Empresas</span><span class="n-seg">'+AMB.map(function(x){return '<button data-ndamb="'+x[0]+'" class="'+(x[0]===window._ndAmb?'on':'')+'">'+x[1]+'</button>';}).join('')+'</span></div>'+
        (ag?'<div class="r"><span class="nd-lbl">Ver</span><span class="n-seg"><button data-ndpas="0" class="'+(window._ndVerPas?'':'on')+'">Solo los futuros</button><button data-ndpas="1" class="'+(window._ndVerPas?'on':'')+'">Todos los del año'+(pas?' <small>(+'+pas+' pasados)</small>':'')+'</button></span></div>':''); }
  }
  /* El selector manda en las tres vistas (Agenda, Mensual, €/mes):
     Cartera = solo lo que tienes · En Plan = + las del plan (las que aún no tienes, con ✕ en sus meses de pago)
     · Analizadas / Universo = además, las sin asignar. */
  function enPane(){ return window._ndSub==='cal'&&!!document.querySelector('#ndPane-cal #view-calendario'); }
  function soloCartera(){ return enPane()&&window._ndAmb==='car'; }
  function planSinTener(){ var H=held(); try{ return (_calPrev()||[]).map(U).filter(function(t,i,a){ return t&&!H.has(t)&&a.indexOf(t)===i; }); }catch(e){ return []; } }
  function filaPlanX(y){
    if(window._ndAmb==='car'||_calVista!=='divs') return;
    var tb=document.querySelector('#view-calendario table.calDivt'); if(!tb||tb.querySelector('.nd-planx')) return;
    var ya={}; tb.querySelectorAll('[data-ficha]').forEach(function(e){ ya[U(e.getAttribute('data-ficha'))]=1; });
    var MES=_CAL_MES, rows=[];
    planSinTener().forEach(function(t){ if(ya[t]) return; var mm=[0,0,0,0,0,0,0,0,0,0,0,0], n=0;
      try{ calEventosDe(t,y).forEach(function(e){ if(e.tipo==='pago'&&(''+e.fecha).slice(0,4)==String(y)){ var m=(+(''+e.fecha).slice(5,7))-1; if(m>=0&&m<12&&!mm[m]){ mm[m]=1; n++; } } }); }catch(e){}
      rows.push({t:t,mm:mm,n:n}); });
    if(!rows.length) return;
    rows.sort(function(a,b){ return a.t.localeCompare(b.t); });
    var col='#1D4ED8', h='<tr class="nd-planx" style="background:#EFF6FF"><td colspan="14" style="text-align:left;font-weight:800;color:'+col+'">En Plan, todavía sin comprar ✕ = mes con pago (sin importe: aún no tienes acciones)</td></tr>'+
      rows.map(function(r){ return '<tr class="nd-planx"><td style="text-align:left;white-space:nowrap"><span data-ficha="'+esc(r.t)+'" style="cursor:pointer;font-weight:700;color:'+col+'">'+esc(r.t)+'</span> <span class="muted" style="font-size:11px">'+esc((_calNombre(r.t)||'').slice(0,18))+'</span></td>'+
        r.mm.map(function(v){ return v?'<td style="color:'+col+';font-weight:800;text-align:center">✕</td>':'<td class="muted" style="text-align:center">·</td>'; }).join('')+
        '<td style="text-align:center;font-weight:800;color:'+col+'">'+(r.n||'—')+'</td></tr>'; }).join('');
    /* justo debajo de «Neto en caja / mes», antes de analizadas/universo */
    var trs=[].slice.call(tb.querySelectorAll('tr')), ancla=null;
    trs.forEach(function(tr){ if(/Neto en caja/.test(tr.textContent)) ancla=tr; });
    if(ancla) ancla.insertAdjacentHTML('afterend',h); else tb.insertAdjacentHTML('beforeend',h);
  }
  function engancharCal(){
    if(typeof calEventosAnio==='function'&&!calEventosAnio._nd){ var oe=calEventosAnio; calEventosAnio=function(){ var r=oe.apply(this,arguments); if(soloCartera()) r=r.filter(function(e){ return e.grp==='cartera'; }); return r; }; calEventosAnio._nd=1; }
    if(typeof calDivMesEmpresas==='function'&&!calDivMesEmpresas._nd){ var od=calDivMesEmpresas; calDivMesEmpresas=function(){ var d=od.apply(this,arguments); if(!soloCartera()||!d) return d;
      var H=held(), rows=d.rows.filter(function(r){ return H.has(U(r.t)); }), tm=new Array(12).fill(0);
      rows.forEach(function(r){ for(var i=0;i<12;i++) tm[i]+=r.neto[i]; }); var nt=tm.reduce(function(a,b){return a+b;},0);
      return {rows:rows,totMes:tm,irpf:d.irpf,irpfPrevision:d.irpfPrevision,netoTotal:nt,total:nt+d.irpf}; }; calDivMesEmpresas._nd=1; }
    if(typeof _calBodyRepaint==='function'&&!_calBodyRepaint._nd){ var ob=_calBodyRepaint; _calBodyRepaint=function(){ if(enPane()) aplicarAmb(); var r=ob.apply(this,arguments); if(enPane()) try{ postCal(); filaPlanX(_calYearSel); }catch(e){} return r; }; _calBodyRepaint._nd=1; }
    if(typeof _calPaint!=='function'||_calPaint._nd) return;
    var o=_calPaint; _calPaint=function(){ var dentro=!!document.querySelector('#ndPane-cal #view-calendario'); if(dentro) aplicarAmb(); var r=o.apply(this,arguments); if(dentro) try{ postCal(); filaPlanX(_calYearSel); }catch(e){ console.error('[nd cal]',e); } return r; }; _calPaint._nd=1;
  }

  /* ================= Anotar (solo lectura en la app nueva) ================= */
  function uniSet(){ if(window._ndUni!==undefined) return window._ndUni; window._ndUni=null;
    fetch('universo/informe.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(I){
      if(I){ var s=new Set(); (I.continuo||[]).concat(I.growth||[]).forEach(function(e){ if(e&&e.ticker) s.add(U(e.ticker)); }); window._ndUni=s.size?s:null; if(window._ndSub==='ano') pintarAno(); } }).catch(function(){});
    return null; }
  function basePagos(t,Y){ for(var y=Y-1;y>=Y-4;y--){ var a=null; try{ a=evoAnioM(t,y); }catch(e){} if(a&&a.pagos&&a.pagos.length) return {y:y,pagos:a.pagos}; } return null; }
  /* ===== Anotar por pago (Fase 3, 31-oct-2026 · decidido con Carlos) =====
     Cada pago del año se estima y se confirma por separado. Guardado en DB.divAnotPagos[T][Y].pagos
     [{exDiv,pago,bruto,tipo,estado:'p'|'a'|'c'|'k'}]. Tras cada cambio:
       · DB.divOverride[T][Y] = suma de los pagos → es lo que usa toda la app para ese año (sin «Volcar»).
       · Evolución (DB.divData) año Y = los pagos (confirmados como reales, el resto previstos) y su total.
     Total del año tecleado → se reparte entre los pagos sin confirmar en la proporción que ya tenían. */
  function r4(x){ return Math.round(num(x)*10000)/10000; }
  function movAnio(f,d){ if(!f||!d) return f||''; var y=+f.slice(0,4); return isNaN(y)?f:(String(y+d)+f.slice(4)); }
  function autoTotal(t,Y){ try{ var pv=_evoBaseProy(t,Y-1); if(pv!=null&&pv>0) return r4(pv*(1+_evoCrecAno(Y)/100)); }catch(e){} return null; }
  function anotSt(t,Y,crear){ var T=U(t); DB.divAnotPagos=DB.divAnotPagos||{}; var m=DB.divAnotPagos[T]; if(!m){ if(!crear) return null; m=DB.divAnotPagos[T]={}; }
    var o=m[String(Y)]; if(!o&&crear) o=m[String(Y)]={}; return o||null; }
  function pagosDe(t,Y){
    var st=anotSt(t,Y,false); if(st&&st.pagos&&st.pagos.length) return st.pagos.map(function(p){ return Object.assign({},p); });
    var ev=null; try{ ev=evoAnioM(t,Y); }catch(e){}
    if(ev&&ev.pagos&&ev.pagos.length&&num(ev.dpaBruto)>0) return ev.pagos.map(function(p){ return {exDiv:p.exDiv||'',pago:p.pago||'',bruto:r4(p.bruto),tipo:p.tipo||'',estado:p.previsto?'a':'k'}; });
    var bp=basePagos(t,Y); if(!bp) return [];
    /* lo extraordinario del año anterior no se repite: solo se proyectan los pagos recurrentes */
    var NR=(typeof _EVO_NO_RECURRENTE!=='undefined')?_EVO_NO_RECURRENTE:{extraordinario:1,especial:1};
    var rec=bp.pagos.filter(function(p){ return !NR[(''+(p.tipo||'')).toLowerCase()]; }); if(!rec.length) rec=bp.pagos;
    bp={y:bp.y,pagos:rec};
    var sb=bp.pagos.reduce(function(s,p){return s+num(p.bruto);},0), ov=null; try{ ov=_evoOverride(t,Y); }catch(e){}
    var tot=(ov!=null)?ov:autoTotal(t,Y), f=(tot!=null&&sb>0)?tot/sb:1, d=Y-bp.y;
    return bp.pagos.map(function(p){ return {exDiv:movAnio(p.exDiv,d),pago:movAnio(p.pago,d),bruto:r4(num(p.bruto)*f),tipo:p.tipo||'',estado:(ov!=null?'c':'p')}; });
  }
  function guardarPagos(t,Y,P){ var T=U(t), st=anotSt(T,Y,true);
    st.pagos=P.map(function(p){ return {exDiv:p.exDiv||'',pago:p.pago||'',bruto:r4(p.bruto),tipo:p.tipo||'',estado:p.estado||'c'}; });
    var tot=r4(P.reduce(function(s,p){return s+num(p.bruto);},0)), todos=P.length&&P.every(function(p){return p.estado==='k';});
    DB.divOverride=DB.divOverride||{}; DB.divOverride[T]=DB.divOverride[T]||{}; DB.divOverride[T][String(Y)]=tot;
    try{ var ay=_evoEnsure(T,Y); ay.pagos=st.pagos.map(function(p){ return {exDiv:p.exDiv,pago:p.pago,bruto:p.bruto,neto:_evoNeto(p.bruto),tipo:p.tipo,previsto:p.estado!=='k'}; });
      ay.dpaBruto=tot; ay.dpaNeto=_evoNeto(tot); ay.totalPrevisto=!todos; ay.deAnotar=true; }catch(e){ console.warn('[anotar] evolución',e); }
    if(typeof scheduleSave==='function') scheduleSave(); else if(typeof saveNow==='function') saveNow(); }
  function volverProyectado(t,Y){ var T=U(t), P=pagosDe(T,Y), conf=P.filter(function(p){return p.estado==='k';});
    var st=anotSt(T,Y,false); if(st){ delete DB.divAnotPagos[T][String(Y)]; }
    if(DB.divOverride&&DB.divOverride[T]){ delete DB.divOverride[T][String(Y)]; if(!Object.keys(DB.divOverride[T]).length) delete DB.divOverride[T]; }
    try{ var dd=DB.divData&&DB.divData[T]; if(dd&&dd.anios&&dd.anios[String(Y)]&&dd.anios[String(Y)].deAnotar) delete dd.anios[String(Y)]; }catch(e){}
    if(conf.length){ var Q=pagosDe(T,Y); conf.forEach(function(c){ var i=-1; Q.forEach(function(q,k){ if(i<0&&q.estado!=='k'&&(q.pago||'').slice(0,7)===(c.pago||'').slice(0,7)) i=k; }); if(i>=0) Q[i]=c; else Q.push(c); }); guardarPagos(T,Y,Q); }
    else if(typeof scheduleSave==='function') scheduleSave(); }
  function repartirTotal(P,total){ var conf=0, base=0; P.forEach(function(p){ if(p.estado==='k') conf+=num(p.bruto); else base+=num(p.bruto); });
    var resto=Math.max(0,num(total)-conf), libres=P.filter(function(p){return p.estado!=='k';}).length;
    P.forEach(function(p){ if(p.estado==='k') return; p.bruto=r4(base>0?num(p.bruto)*resto/base:(libres?resto/libres:0)); p.estado='c'; }); return P; }
  window.nAnotar={pagosDe:pagosDe,guardar:guardarPagos,volver:volverProyectado,repartir:repartirTotal};
  function estado(t,Y,pagan){
    var P=pagosDe(t,Y);
    if(P.length){ var tot=r4(P.reduce(function(s,p){return s+num(p.bruto);},0)), st='p';
      if(P.every(function(p){return p.estado==='k';})) st='k'; else if(P.some(function(p){return p.estado==='c';})) st='c'; else if(P.some(function(p){return p.estado==='a'||p.estado==='k';})) st='a';
      return {st:st,v:tot,sub:{p:'proyectado (tu %)',a:'anotación',c:'tu estimación',k:'confirmado'}[st],P:P}; }
    var pr=null; try{ pr=evoDpaProyectado(t,Y); }catch(e){}
    if(pr!=null&&pagan) return {st:'p',v:+pr,sub:'proyectado (tu %)',P:[]};
    return {st:'v',v:null,sub:'',P:[]};
  }
  function f4(v){ return v==null?'—':(Math.round(v*10000)/10000).toString().replace('.',','); }
  function pintarAno(soloRejilla){
    var el=document.getElementById('ndAno'); if(!el) return;
    if(typeof _evoData!=='undefined'&&!_evoData&&typeof _evoCargar==='function'){ el.innerHTML='<div class="muted" style="padding:12px">Cargando dividendos…</div>'; Promise.resolve(_evoCargar()).then(function(){ pintarAno(); }); return; }
    var cur=nowY(), hz=(typeof _dfHoriz==='function')?_dfHoriz():cur+8, Y=window._ndAnoY||cur+1; if(Y<=cur) Y=cur+1; if(Y>hz) Y=hz; window._ndAnoY=Y;
    var Hs=held(), US=uniSet(), RZ={}; try{ _divRiesgoScan().forEach(function(r){ RZ[r.t]=r; }); }catch(e){}
    var plan={}; try{ (DB.planCompras||[]).forEach(function(p){ var t=U(p.ticker||p.t); if(t) plan[t]=1; }); }catch(e){}
    var all=(typeof _dfUniverso==='function')?_dfUniverso():[]; Hs.forEach(function(t){ if(all.indexOf(t)<0) all.push(t); });
    var fuera=[]; if(US){ all=all.filter(function(t){ if(US.has(t)||Hs.has(t)) return true; fuera.push(t); return false; }); }
    var q=U(window._ndAnoQ||'').trim();
    var cnt={p:0,a:0,c:0,k:0,v:0}, pag=[], nop=[];
    all.forEach(function(t){ var pg=false; try{ pg=_dfPaga(t); }catch(e){} (pg?pag:nop).push(t); });
    function nombre(t){ try{ return _dfShort(t); }catch(e){ return t; } }
    function ord(L){ return L.sort(function(a,b){ var ca=Hs.has(a)?0:(plan[a]?1:2), cb=Hs.has(b)?0:(plan[b]?1:2); return ca-cb||a.localeCompare(b); }); }
    function card(t,pagan){
      var E=estado(t,Y,pagan); cnt[E.st]++;
      if(q&&t.indexOf(q)<0&&U(nombre(t)).indexOf(q)<0) return '';
      var rz=RZ[t], rzn=rz?(rz.nivel>=2?'alto':'medio'):'';
      var dots=(pagan&&E.P&&E.P.length)?'<div class="d" title="'+E.P.length+' pagos al año · en verde los confirmados">'+E.P.map(function(p){return '<i'+(p.estado==='k'?' class="ok"':'')+'></i>';}).join('')+'</div>':'';
      var ic={p:'⚪',a:'🟡',c:'✏️',k:'✅',v:''}[E.st];
      return '<div class="nd-c st-'+E.st+(rzn?' rz-'+rzn:'')+(window._ndAnoSel===t?' sel':'')+'" data-ndcel="'+esc(t)+'" title="'+esc(nombre(t))+(E.sub?' · '+E.sub:'')+(rz?' · riesgo de recorte '+rzn+': '+esc(rz.razones.join(' · ')):'')+'">'+
        '<div class="h"><b>'+esc(t)+'</b>'+(Hs.has(t)?'<span class="car">cartera</span>':(plan[t]?'<span class="pl">plan</span>':''))+(rzn?'<span class="rz '+rzn+'">⚠ '+rzn+'</span>':'')+'</div>'+
        '<div class="nm">'+esc(nombre(t))+'</div><div class="v"><span>'+ic+'</span><b>'+f4(E.v)+'</b></div>'+dots+
        ((E.st==='a'||E.st==='c')?'<div class="sc">sin confirmar</div>':'')+'</div>';
    }
    var gp=ord(pag).map(function(t){return card(t,true);}).join(''), gn=ord(nop).map(function(t){return card(t,false);}).join('');
    var det='';
    if(window._ndAnoSel){ var t=window._ndAnoSel, E=estado(t,Y,true), P=E.P||[], bp=basePagos(t,Y), MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      var NR2=(typeof _EVO_NO_RECURRENTE!=='undefined')?_EVO_NO_RECURRENTE:{extraordinario:1,especial:1}, bpr=bp?bp.pagos.filter(function(q){ return !NR2[(''+(q.tipo||'')).toLowerCase()]; }):[];
      function anteDe(i,p){ if(!bp) return null; if(bpr.length===P.length) return num(bpr[i].bruto); var m=(p.pago||p.exDiv||'').slice(5,7), q=bpr.filter(function(x){ return (x.pago||x.exDiv||'').slice(5,7)===m; }); return q.length===1?num(q[0].bruto):null; }
      var nk=P.filter(function(p){return p.estado==='k';}).length;
      var chip={p:'⚪ proyectado',a:'🟡 anotación',c:'✏️ tu estimación',k:'✅ confirmado'};
      var fil=P.map(function(p,i){ var f=(p.pago||p.exDiv||''), m=f?MES[(+f.slice(5,7))-1]:(i+1)+'.º', ant=anteDe(i,p);
        var k=p.estado==='k';
        return '<tr class="'+(k?'okr':'')+'"><td>'+m+(/^(extraordinario|especial)$/i.test(p.tipo||'')?' <small class="muted">'+esc(p.tipo)+'</small>':'')+'</td><td>'+(ant!=null?f4(ant):'—')+'</td>'+
          '<td>'+(k?'<b>'+f4(p.bruto)+'</b>':'<input class="nd-in" type="number" step="0.0001" min="0" data-ndpb="'+i+'" value="'+r4(p.bruto)+'">')+'</td>'+
          '<td>'+(k?esc((p.exDiv||'').split('-').reverse().join('/')):'<input class="nd-in d" type="date" data-ndpf="'+i+'|exDiv" value="'+esc(p.exDiv||'')+'">')+'</td>'+
          '<td>'+(k?esc((p.pago||'').split('-').reverse().join('/')):'<input class="nd-in d" type="date" data-ndpf="'+i+'|pago" value="'+esc(p.pago||'')+'">')+'</td>'+
          '<td><span class="nd-chip '+p.estado+'">'+chip[p.estado]+'</span></td>'+
          '<td style="white-space:nowrap">'+(k?'<span class="nd-btn g" data-ndpdes="'+i+'" title="Volver a dejarlo sin confirmar">deshacer</span>':'<span class="nd-btn" data-ndpok="'+i+'" title="Fijar este pago como confirmado (cifra y fechas)">✅ confirmar</span>')+
          ' <span class="nd-btn x" data-ndpdel="'+i+'" title="Quitar este pago">✕</span></td></tr>'; }).join('');
      det='<div class="nd-det"><div class="dh"><b>'+esc(t)+' · '+esc(nombre(t))+' · '+Y+'</b><span style="flex:1"></span><span class="muted">'+(bp?'parte de los pagos de '+bp.y+' × tu crecimiento':'sin pagos anteriores: añade los pagos')+'</span></div>'+
        '<table class="nd-dt"><thead><tr><th>Pago</th><th>'+(bp?bp.y:'Antes')+'</th><th>'+Y+' (bruto €)</th><th>Ex-dividendo</th><th>Pago</th><th>Estado</th><th></th></tr></thead><tbody>'+fil+
        '<tr class="tot"><td>Total año</td><td>'+(bp?f4(bp.pagos.reduce(function(s,q){return s+num(q.bruto);},0)):'—')+(bpr.length&&bpr.length<(bp?bp.pagos.length:0)?' <small class="muted">(recurrente '+f4(bpr.reduce(function(s,q){return s+num(q.bruto);},0))+')</small>':'')+'</td>'+
          '<td><input class="nd-in tot" type="number" step="0.0001" min="0" data-ndtot="1" value="'+(E.v!=null?r4(E.v):'')+'" title="Si escribes el total, se reparte entre los pagos sin confirmar en la misma proporción"></td>'+
          '<td colspan="4">'+nk+' de '+P.length+' pagos confirmados'+(P.length&&nk===P.length?' · <b>año cerrado ✅</b>':'')+'</td></tr></tbody></table>'+
        '<div class="nd-acc"><span class="nd-btn" data-ndpadd="1">+ Añadir pago</span><span class="nd-btn g" data-ndprst="1" title="Deshace tus cambios en los pagos sin confirmar; los confirmados se quedan">↺ Volver a lo proyectado</span></div>'+
        '<div class="ej">Cada pago se estima y se confirma por separado. Escribe un pago o el total: el total se reparte entre los pagos sin confirmar en la misma proporción. Al confirmar, el pago queda fijo y pasa a Evolución como real; el total del año es lo que usa toda la app.</div></div>';
    }
    var html='<div class="nd-nota">Antes «Actualizar dividendos». <b>Desaparece «Volcar a Evolución»</b>: lo que hay en la casilla es lo que usa la app. Pulsa una empresa para anotar pago a pago.</div>'+
      '<div class="nd-abar"><span class="nd-lbl">Año</span><span class="ns-nav nd-yr"><button data-ndano="-1"'+(Y<=cur+1?' disabled':'')+'>◀</button><b>'+Y+'</b><button data-ndano="1"'+(Y>=hz?' disabled':'')+'>▶</button></span>'+
        '<span class="nd-chip p">⚪ '+cnt.p+' proyectadas</span><span class="nd-chip a">🟡 '+cnt.a+' anotadas</span><span class="nd-chip c">✏️ '+cnt.c+' corregidas</span><span class="nd-chip k">✅ '+cnt.k+' confirmadas</span><span style="flex:1"></span>'+
        '<input id="ndAnoQ" placeholder="Buscar…" value="'+esc(window._ndAnoQ||'')+'"></div>'+
      '<div class="nd-cic"><b>Ciclo de cada pago</b> (el valor de la casilla es el que usa toda la app para ese año):'+
        '<div class="st"><span class="s p">⚪ Proyectado<small>año anterior × tu %</small></span>→<span class="s a">🟡 Anotación<small>la pone el pase con lo que diga la empresa</small></span>→<span class="s c">✏️ Corregida<small>la cambias tú</small></span>→<span class="s k">✅ Confirmada<small>anuncio oficial · queda cerrada</small></span></div>'+
        '<div class="sm">Se confirma sola cuando la empresa publica el anuncio oficial (lo detecta el pase semanal); si lo ves antes, pulsas la casilla y confirmas el pago. Los puntos de cada casilla son sus pagos y se ponen en verde al confirmarse. ⚠ marca las de riesgo de recorte.</div></div>'+
      det+'<div class="nd-sech">💶 Pagan dividendo <span class="pill">'+pag.length+'</span></div><div class="nd-grid">'+gp+'</div>'+
      '<div class="nd-sech no">🚫 No pagan <span class="pill">'+nop.length+'</span></div><div class="nd-grid">'+gn+'</div>'+
      (fuera.length?'<div class="nd-pie">Fuera del universo (no salen): '+fuera.sort().join(', ')+'.</div>':'');
    if(soloRejilla){ var qi=document.getElementById('ndAnoQ'), pos=qi?qi.selectionStart:null; el.innerHTML=html; var q2=document.getElementById('ndAnoQ'); if(q2){ q2.focus(); if(pos!=null) q2.setSelectionRange(pos,pos); } }
    else el.innerHTML=html;
  }

  function anotarAccion(b){ var t=window._ndAnoSel, Y=window._ndAnoY, A=window.nAnotar, P=A.pagosDe(t,Y);
    if(b.dataset.ndpok!=null){ var p=P[+b.dataset.ndpok]; if(!p) return;
      if(!(num(p.bruto)>0)){ alert('Pon el importe del pago antes de confirmarlo.'); return; }
      if(!confirm('¿Confirmar el pago de '+t+' '+Y+'?\n\n  bruto '+f4(p.bruto)+' €'+(p.exDiv?'\n  ex-dividendo '+p.exDiv:'')+(p.pago?'\n  pago '+p.pago:'')+'\n\nQueda fijo y pasa a Evolución como real.')) return;
      p.estado='k'; A.guardar(t,Y,P); }
    else if(b.dataset.ndpdes!=null){ var q=P[+b.dataset.ndpdes]; if(!q) return; q.estado='c'; A.guardar(t,Y,P); }
    else if(b.dataset.ndpdel!=null){ var i=+b.dataset.ndpdel; if(!P[i]) return; if(P[i].estado==='k'&&!confirm('Ese pago está confirmado. ¿Quitarlo igualmente?')) return; P.splice(i,1);
      if(P.length) A.guardar(t,Y,P); else A.volver(t,Y); }
    else if(b.dataset.ndpadd!=null){ P.push({exDiv:'',pago:'',bruto:0,tipo:'extraordinario',estado:'c'}); A.guardar(t,Y,P); }
    else if(b.dataset.ndprst!=null){ if(!confirm('¿Volver a lo proyectado en '+t+' '+Y+'? Los pagos confirmados se quedan.')) return; A.volver(t,Y); }
    pintarAno(); }

  /* ================= enganches ================= */
  function enganchar(){
    montar(); engancharCal();
    if(!renderDividendos._nd){ var o=renderDividendos; renderDividendos=function(){ var r=o.apply(this,arguments); try{ postCobrado(); pintarSub(); }catch(e){ console.error('[nd dividendos]',e); } return r; }; renderDividendos._nd=1; }
    if(typeof VIEW_FNS!=='undefined') VIEW_FNS.dividendos=['renderDividendos'];
    if(typeof activarVista==='function'&&!activarVista._nd){ var oa=activarVista; activarVista=function(v){
      var m={calendario:'cal',prevision:'evo',divfut:'ano'}; if(m[v]){ window._ndSub=m[v]; v='dividendos'; arguments[0]='dividendos'; }
      return oa.apply(this,arguments); }; activarVista._nd=1; }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
