/* APP NUEVA · Kanban (boceto 28-oct, decidido con Carlos 17:21):
   - 4 cifras arriba: Caja bróker hoy · Ingresos previstos 30 d · Presupuesto libre del año · Necesita tu acción
   - las fichas NO se despliegan en la columna: se abren en una ventana grande (pantalla completa en el móvil)
   El contenido de la ficha y sus botones son los de siempre. */
(function(){
  if(typeof renderEmbudo!=='function') return;
  function kpis(sec){
    var caja=(typeof _saldoCajaHoy==='function')?_saldoCajaHoy():null;
    var hoy=new Date(); hoy.setHours(0,0,0,0); var hS=hoy.toISOString().slice(0,10), lS=new Date(hoy.getTime()+30*864e5).toISOString().slice(0,10);
    var div=0,apor=0,otros=0; if(typeof cajaMovs==='function'){ try{ cajaMovs().forEach(function(mv){ var f=mv.fecha||''; if(f>hS&&f<=lS){ var e=_emNum(mv.entra); if(mv.div)div+=e; else if(mv.apor)apor+=e; else otros+=e; } }); }catch(e){} }
    var ing=div+apor+otros, yr=new Date().getFullYear(), pi=(typeof _planYearInfo==='function')?_planYearInfo(yr):null, libre=pi?pi.remaining:null;
    var nAcc=sec.querySelectorAll('.em-lane .em-card').length;
    return '<div class="n-ctrl n-emk">'+
      nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'💶',t:'Caja bróker hoy',v:caja!=null?fmt(caja):'sin configurar',s:'disponible para comprar',p:'cálculo actual (la caja nueva llega con la fase 3)'})+
      nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'📈',t:'Ingresos previstos 30 d',v:(ing>0.005?'+':'')+fmt(ing),vCls:ing>0.005?'n-pos':'',s:'dividendos <b>'+fmt(div)+'</b> · aportaciones <b>'+fmt(apor)+'</b>'})+
      nKpi({c:'#D97706',bg:'#FEF3C7',ic:'🗓️',t:'Presupuesto libre '+yr,v:libre!=null?fmt(libre):'—',vCls:libre!=null&&libre<0?'n-neg':'',s:'lo que queda del Plan de compras del año'})+
      '<div data-nemacc="1">'+nKpi({c:nAcc?'#DC2626':'#16A34A',bg:nAcc?'#FEE2E2':'#DCFCE7',ic:'⚡',t:'Necesita tu acción',v:String(nAcc),vCls:nAcc?'n-neg':'n-pos',s:nAcc?'señales, compras en zona y dividendos sin anotar':'nada pendiente ahora mismo',p:nAcc?'pulsa para ir a la lista':''})+'</div>'+
      '</div>';
  }
  function cerrar(){ window._nEmModal=null; var m=document.getElementById('nEmModal'); if(m) m.remove(); document.body.classList.remove('n-noscroll'); }
  function abrir(t){
    var sec=document.getElementById('view-embudo'); if(!sec||!t) return;
    var old=document.getElementById('nEmModal'); if(old) old.remove();
    var r=null; try{ r=_emRow(t); }catch(e){} if(!r){ cerrar(); return; }
    window._emExp=window._emExp||{}; var prev=window._emExp[t]; window._emExp[t]=true;
    var card=''; try{ card=_emCard(r,false); }catch(e){ console.error('n-kanban',e); } window._emExp[t]=prev;
    var m=document.createElement('div'); m.id='nEmModal'; m.className='n-mback';
    m.innerHTML='<div class="n-mwin" role="dialog" aria-modal="true"><div class="n-mhead"><div><div class="n-mt"><b>'+_emEsc(r.t)+'</b> '+_emEsc(r.nombre||'')+'</div><div class="n-msub">'+_emEsc(r.et||'')+(r.held?' · en cartera':'')+(r.score!=null?' · score '+Math.round(r.score):'')+'</div></div>'+
      '<button class="n-mx" data-nemclose="1" aria-label="Cerrar">✕</button></div><div class="n-mbody">'+card+'</div>'+
      '<div class="n-mfoot"><button class="btn ghost" data-ficha="'+_emEsc(r.t)+'">📄 Ficha completa</button><span style="flex:1"></span><span class="n-mro">Comprar, vender y anotar dividendos guardarán datos en la fase 3</span></div></div>';
    sec.appendChild(m); document.body.classList.add('n-noscroll'); window._nEmModal=t;
  }
  var o=renderEmbudo;
  renderEmbudo=function(){
    o.apply(this,arguments);
    try{
      var sec=document.getElementById('view-embudo'); if(!sec) return;
      var h2=sec.querySelector('.vhero h2'); if(h2) h2.textContent='Kanban';
      var st=sec.querySelector('.em-strip'), cj=sec.querySelector('.em-caja');
      var k=document.createElement('div'); k.innerHTML=kpis(sec); k=k.firstChild;
      if(st) st.replaceWith(k); else { var w=sec.querySelector('.em-wrap'); if(w) w.insertBefore(k,w.firstChild); }
      if(cj) cj.remove();
      if(window._nEmModal) abrir(window._nEmModal);
    }catch(e){ console.error('n-kanban',e); }
  };
  document.addEventListener('click',function(e){
    var sec=document.getElementById('view-embudo'); if(!sec||!sec.contains(e.target)) return;
    var modal=document.getElementById('nEmModal');
    if(e.target.closest('[data-nemclose]')||e.target===modal){ e.stopPropagation(); e.preventDefault(); cerrar(); return; }
    if(e.target.closest('[data-nemacc]')){ var l=sec.querySelector('.em-lane'); if(l) l.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    var tg=e.target.closest('[data-emtoggle]'); if(!tg) return;
    if(e.target.closest('[data-ficha],a')) return;          /* ticker y dossier: lo de siempre */
    e.stopPropagation(); e.preventDefault();
    if(modal&&modal.contains(tg)) return;                    /* dentro de la ventana la cabecera no hace nada */
    abrir(_emUp(tg.getAttribute('data-emtoggle')));
  },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&window._nEmModal) cerrar(); });
  /* al cambiar de pestaña, la ventana se cierra */
  function vigilar(){ var sec=document.getElementById('view-embudo'); if(!sec||!window.MutationObserver) return;
    new MutationObserver(function(){ if(!sec.classList.contains('active')&&window._nEmModal) cerrar(); }).observe(sec,{attributes:true,attributeFilter:['class']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',vigilar); else vigilar();
})();
