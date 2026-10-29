/* APP NUEVA · Kanban como el boceto 28-oct (29-oct): ventana de la ficha con sus bloques (posición, valor, PO, banda,
   plan de compras, historial del dividendo, catalizadores y riesgos, ¿por qué la tengo?), banda «Necesita tu acción»
   compacta y columnas con su color y sus botones. Los botones que guardan (Comprar, Vender, Dividendo) llegan con la fase 3. */
(function(){
  if(typeof renderEmbudo!=='function') return;
  var COL={sel:['①','Selección','#0EA5E9'],ana:['②','Análisis','#6366F1'],plan:['③','Planteamiento','#16A34A'],seg:['④','Seguimiento','#EA580C']};
  function E(x){ x=+x||0; try{ return x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'})+' €'; }catch(e){ return fmt(x); } }
  function N(x,d){ x=+x||0; try{ return x.toLocaleString('es-ES',{minimumFractionDigits:d||0,maximumFractionDigits:d||0,useGrouping:'always'}); }catch(e){ return String(x); } }
  function P(x,d){ return (x>=0?'+':'')+(+x).toFixed(d==null?1:d).replace('.',',')+' %'; }
  function esc(s){ return _emEsc(s); }
  function fd(f){ if(!f) return ''; var p=String(f).slice(0,10).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):f; }
  function chip(t,bg,fg,b){ return '<span class="n-fch" style="background:'+bg+';color:'+fg+(b?';border:1px solid '+b:'')+'">'+t+'</span>'; }

  function posicion(t){
    var acc=0,coste=0,cart={},pa=0;
    try{ invPositions().forEach(function(p){ if(_emUp(p.ticker)!==t||!(p.acciones>0.0001)) return; acc+=p.acciones; coste+=p.acciones*p.precioCompra; cart[p.cartera||'Propia']=1; pa=p.precioActual; }); }catch(e){}
    var lotes=0; try{ lotes=posLots().filter(function(l){ return _emUp(l.ticker)===t; }).length; }catch(e){}
    return {acc:acc,coste:coste,pm:acc?coste/acc:0,cart:Object.keys(cart),lotes:lotes,pa:pa};
  }
  function divHist(t){
    var y0=new Date().getFullYear(), out=[];
    for(var y=y0-7;y<=y0;y++){ var a=null; try{ a=(typeof evoAnioM==='function')?evoAnioM(t,y):null; }catch(e){} var v=a?(+a.dpaBruto||0):0; out.push([y,v]); }
    return out;
  }
  function proxPago(t){
    var hoy=new Date().toISOString().slice(0,10), y=new Date().getFullYear(), best=null;
    [y,y+1].forEach(function(yy){ var a=null; try{ a=evoAnioM(t,yy); }catch(e){} ((a&&a.pagos)||[]).forEach(function(p){ var f=(p.pago||p.exDiv||'').slice(0,10); if(f>hoy&&(!best||f<best)) best=f; }); });
    return best;
  }
  function lista(arr){ if(!arr||!arr.length) return '<div class="muted">—</div>';
    return '<ul>'+arr.slice(0,4).map(function(x){ var s=(typeof x==='string')?x:(x&&(x.titulo||x.texto||x.nombre)||''); return '<li>'+esc(s)+'</li>'; }).join('')+'</ul>'; }

  window.nEmFicha=function(r){
    var t=r.t, a=r.a||{}, C=COL[r.col]||COL.sel, V=null; try{ V=_emVer(t); }catch(e){}
    var cot=_emNum(a.cotizacion)||0, po=(typeof poBaseDe==='function')?num(poBaseDe(a)):_emNum(a.precioObjetivo);
    var eM=_emNum(a.entMax), eMin=_emNum(a.entMin), stop=_emNum(a.stopTesis), dec=_emUp(a.decision||'');
    var S=posicion(t); if(!cot&&S.pa) cot=S.pa;
    var VC={INVERTIR:['#DCFCE7','#15803D','Invertir'],ESPERAR:['#FEF3C7','#92400E','Vigilar'],FUERA:['#FEE2E2','#B91C1C','Fuera']}[V&&V.v]||['#EEF1F5','#475569',''];
    var chips=chip(C[0]+' '+C[1],'#FFF7ED','#C2410C','#FED7AA')+chip(esc(r.et||'')+(S.acc?' · '+S.cart.join(' + '):''),'#F1F5F9','#334155')+
      (dec||VC[2]?chip('🚦 '+[VC[2]?'tesis: '+VC[2]:'',dec].filter(Boolean).join(' · '),VC[0],VC[1]):'')+(r.score!=null?chip('Score '+Math.round(r.score),'#EAF1FD','#1F4A9A'):'');
    var k1=S.acc?['Posición',N(S.acc,S.acc%1?2:0)+' acc.',(S.lotes?S.lotes+' lote'+(S.lotes>1?'s':'')+' · ':'')+'precio medio '+E(S.pm)]:['Posición','Sin posición','todavía no la tienes'];
    var val=S.acc*cot, pl=val-S.coste;
    var k2=S.acc?['Valor',E(val),'plusvalía <b>'+(pl>=0?'+':'')+E(pl)+'</b> ('+P(S.coste?pl/S.coste*100:0)+')']:['Cotización',cot?E(cot):'—','precio de hoy'];
    var k3=['Precio objetivo (base)',po?E(po):'—',po&&cot?('potencial <b>'+P((po/cot-1)*100)+'</b> · cotiza '+E(cot)):''];
    var k4=['Banda de entrada',eM?('≤ '+E(eM)):'—',(eMin?'desde '+E(eMin)+' · ':'')+(stop?'stop de tesis '+E(stop):'')];
    var kb=function(k){ return '<div class="n-fk"><div class="l">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="s">'+k[2]+'</div></div>'; };
    var B={}; try{ B=_emBuyPlan(r); }catch(e){}
    var plan='<div class="n-fbx"><div class="n-fbt">🧭 Plan de compras</div><div class="n-fpl">'+
      [['Capital recom.',B.recom>0?E(B.recom):'—'],['Queda por invertir',B.ptePlan>0?E(B.ptePlan):'—'],['Acc. con la caja',B.acc>0?N(B.acc):'—'],['Prioridad',B.rank?('#'+B.rank):(B.prio!=null?B.prio:'—')]]
      .map(function(x){ return '<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'; }).join('')+'</div></div>';
    var H=divHist(t), mx=Math.max.apply(null,H.map(function(x){return x[1];}).concat([0.0001]));
    var rpd=null; try{ rpd=_emRpd(t); }catch(e){}
    var dpa=_emNum(a.divAccion)||((DB.valores||{})[t]||{}).divAccion||0, yoc=(S.pm&&dpa)?dpa/S.pm*100:null, pp=proxPago(t);
    var div='<div class="n-fbx"><div class="n-fbt">💧 Historial del dividendo (€/acción)</div><div class="n-fbars">'+
      H.map(function(x){ var h=Math.round(x[1]/mx*62); return '<div class="b"><i style="height:'+Math.max(h,x[1]>0?3:0)+'px"></i><span>'+String(x[0]).slice(2)+'</span><b>'+(x[1]?x[1].toFixed(2).replace('.',','):'—')+'</b></div>'; }).join('')+
      '</div><div class="n-fds">'+[rpd!=null?'RPD '+(+rpd).toFixed(1).replace('.',',')+' %':'',yoc!=null?'sobre tu compra '+yoc.toFixed(1).replace('.',',')+' %':'',pp?'próximo pago '+fd(pp):''].filter(Boolean).join(' · ')+'</div></div>';
    var cat='<div class="n-fbx"><div class="n-fbt">▲ Catalizadores</div>'+lista(V&&V.catalizadores)+'</div>';
    var rie='<div class="n-fbx"><div class="n-fbt">▼ Riesgos a vigilar</div>'+lista(V&&V.riesgos)+'</div>';
    var pq=''; try{ pq=_emPorQue(t); }catch(e){}
    var why='<div class="n-fbx n-fwhy"><div class="n-fbt">¿Por qué la tengo?</div>'+pq+'</div>';
    var foot='<div class="n-mfoot"><button class="btn ghost" data-ficha="'+esc(t)+'">📄 Ficha completa</button>'+(S.acc?'<button class="btn ghost" data-nf3="dividendo">💶 Dividendo</button>':'')+
      '<span style="flex:1"></span><span class="n-mro" id="nF3msg"></span><button class="btn ghost" data-nf3="comprar">🛒 Comprar</button>'+(S.acc?'<button class="btn" data-nf3="vender">Vender</button>':'')+'</div>';
    return '<div class="n-mwin n-fwin" role="dialog" aria-modal="true"><div class="n-mhead"><div><div class="n-mt"><b>'+esc(t)+'</b> '+esc(r.nombre||'')+'</div><div class="n-fchs">'+chips+'</div></div>'+
      '<button class="n-mx" data-nemclose="1" aria-label="Cerrar">✕</button></div><div class="n-mbody"><div class="n-fk4">'+[k1,k2,k3,k4].map(kb).join('')+'</div>'+
      '<div class="n-f2">'+plan+div+'</div><div class="n-f2">'+cat+rie+'</div>'+why+'</div>'+foot+'</div>';
  };
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-nf3]'); if(!b) return; e.preventDefault();
    var m=document.getElementById('nF3msg'); if(m) m.textContent='«'+b.textContent.trim()+'» abre su formulario aquí mismo cuando la app pueda guardar (fase 3).'; });

  /* tablero: cabecera, banda y columnas como el boceto */
  function detalle(r){
    var a=r.a||{};
    if(r.col==='seg'){ var S=posicion(r.t); return (S.lotes?S.lotes+' lote'+(S.lotes>1?'s':'')+' · ':'')+S.cart.join(' + '); }
    if(r.col==='plan'){ var eM=_emNum(a.entMax); return eM?('entrada ≤ '+E(eM)):''; }
    if(r.col==='ana'){ return a.dossierFecha?('analizada '+fd(a.dossierFecha)):''; }
    return '';
  }
  var o=renderEmbudo;
  renderEmbudo=function(){
    o.apply(this,arguments);
    try{
      var sec=document.getElementById('view-embudo'); if(!sec) return;
      var p=sec.querySelector('.vhero p'); if(p) p.textContent='Dónde está cada empresa y qué necesita de ti: aquí se compra, se vende y se anota.';
      var lane=sec.querySelector('.em-lane'); if(lane&&!lane.querySelector('.n-lh')){ var h4=lane.querySelector('h4'); var n=lane.querySelectorAll('.em-card').length;
        var hd=document.createElement('div'); hd.className='n-lh'; hd.innerHTML='<span class="ic">⚡</span><div><b>Necesita tu acción</b><small>Solo lo que pide una decisión tuya · cada tarjeta con su botón</small></div><span class="n-cc">'+n+'</span>';
        if(h4){ var cb=h4.querySelector('button'); if(cb) cb.remove(); h4.replaceWith(hd); } else lane.insertBefore(hd,lane.firstChild); }
      var cols=sec.querySelectorAll('.em-kanban .em-col'), keys=['sel','ana','plan','seg'];
      [].forEach.call(cols,function(c,i){ var k=keys[i]; c.setAttribute('data-ncol',k); c.style.setProperty('--nc',COL[k][2]);
        [].forEach.call(c.querySelectorAll('.em-card'),function(card){ if(card.querySelector('.n-cdet')) return; var tg=card.querySelector('[data-emtoggle]'); if(!tg) return; var t=_emUp(tg.getAttribute('data-emtoggle'));
          var r=null; try{ r=_emRow(t); }catch(e){} if(!r) return; var et=card.querySelector('.em-etr .em-et'); var d=detalle(r);
          if(et&&d) et.insertAdjacentHTML('afterend','<span class="n-cdet">'+esc(d)+'</span>');
          if(k==='plan'||k==='seg') card.insertAdjacentHTML('beforeend','<div class="n-cbt"><button class="btn ghost sm" data-emtoggle="'+t+'">Comprar</button>'+(k==='seg'?'<button class="btn sm" data-emtoggle="'+t+'">Vender</button>':'')+'</div>'); }); });
    }catch(e){ console.error('n-kanban2',e); }
  };
})();
