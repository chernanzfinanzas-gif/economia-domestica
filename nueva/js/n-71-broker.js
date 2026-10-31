/* APP NUEVA · BRÓKER DE CADA LOTE (Carlos, 31-oct-2026: «en cada lote debemos añadir el broker en el que está,
   que ya queda por lo que pueda pasar en el futuro»).
   · Cada operación (compra o venta) guarda `broker`. Las que no lo tienen se rellenan solas con la regla de hoy
     y quedan marcadas `brokerAuto` («por regla») hasta que lo cambies tú.
   · Regla: Compartida → Santander. Propia → Renta 4, salvo REP (ING) y SAN (Santander).
   · Se cambia en: Operaciones (columna Bróker), el Kanban al comprar, y el detalle de cada lote.
   · Al archivar una posición vendida, el bróker viaja con la operación (parche de 03-inversiones). */
(function(){
  if(window._nbrk) return; window._nbrk=true;
  var BR=['Renta 4','ING','Santander'];
  window.khBrokerRegla=function(t,car){ t=(t||'').toUpperCase();
    if((car||'Propia')!=='Propia') return 'Santander';
    if(t==='REP') return 'ING'; if(t==='SAN') return 'Santander'; return 'Renta 4'; };
  function completar(){ if(typeof DB==='undefined'||!DB) return 0; var n=0;
    (DB.operaciones||[]).forEach(function(o){ if(!o.broker){ o.broker=khBrokerRegla(o.ticker,o.cartera); o.brokerAuto=true; n++; } });
    (DB.cerradas||[]).forEach(function(c){ (c.ops||[]).forEach(function(o){ if(!o.broker){ o.broker=khBrokerRegla(c.ticker,c.cartera); o.brokerAuto=true; n++; } }); });
    return n; }
  window.nBrokerCompletar=completar;
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sel(attr,val,auto){
    var o=BR.slice(); if(val&&o.indexOf(val)<0) o.push(val);
    return '<select '+attr+' class="n-brk'+(auto?' n-brk-auto':'')+'" title="'+(auto?'Puesto por regla: cámbialo si no es así':'Bróker de esta operación')+'">'+
      o.map(function(b){ return '<option'+(b===val?' selected':'')+'>'+esc(b)+'</option>'; }).join('')+'</select>'+(auto?' <span class="n-brk-r">por regla</span>':''); }
  function opDe(id){ return (DB.operaciones||[]).find(function(x){ return x.id===id; }); }

  /* lote → texto o selector (los lotes de posiciones archivadas no tienen operación viva: solo texto) */
  window._brkLote=function(l){
    var o=l&&l.opId?opDe(l.opId):null;
    if(o) return sel('data-brk-op="'+esc(o.id)+'"',o.broker||khBrokerRegla(o.ticker,o.cartera),!o.broker||o.brokerAuto);
    return esc((l&&l.broker)||khBrokerRegla(l&&l.ticker,l&&l.cartera));
  };

  /* cambio desde cualquier selector */
  document.addEventListener('change',function(e){ var s=e.target; if(!s||!s.matches||!s.matches('select[data-brk-op]')) return;
    var o=opDe(s.getAttribute('data-brk-op')); if(!o) return;
    o.broker=s.value; delete o.brokerAuto; s.classList.remove('n-brk-auto');
    var r=s.parentNode&&s.parentNode.querySelector('.n-brk-r'); if(r) r.remove();
    if(typeof scheduleSave==='function') scheduleSave(); else if(typeof saveNow==='function') saveNow();
  },true);
  /* que tocar el selector del lote no pliegue/despliegue la fila */
  document.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('select.n-brk')) e.stopPropagation(); },true);

  /* guardar: antes de cada guardado, completa lo que falte */
  if(typeof saveNow==='function'){ var oS=saveNow; saveNow=function(){ try{ completar(); }catch(e){} return oS.apply(this,arguments); }; }
  /* cargar: completa en memoria (no guarda nada por sí solo) */
  if(typeof afterLoad==='function'){ var oA=afterLoad; afterLoad=function(){ var r=oA.apply(this,arguments);
    Promise.resolve(r).then(function(){ try{ if(completar()&&typeof renderInvLotes==='function') renderInvLotes(); }catch(e){} }); return r; }; }

  /* Operaciones: columna Bróker */
  if(typeof renderInvOps==='function'){ var oR=renderInvOps; renderInvOps=function(){ var r=oR.apply(this,arguments);
    try{ var tb=document.querySelector('#invOpsList table'); if(tb&&!tb.dataset.brk){ tb.dataset.brk='1';
      var th=tb.querySelector('thead tr'); if(th){ var c=document.createElement('th'); c.textContent='Bróker'; th.insertBefore(c,th.lastElementChild); }
      tb.querySelectorAll('tbody tr').forEach(function(tr){ var b=tr.querySelector('[data-editop]'); var o=b&&opDe(b.getAttribute('data-editop')); var td=document.createElement('td');
        if(o) td.innerHTML=sel('data-brk-op="'+esc(o.id)+'"',o.broker||khBrokerRegla(o.ticker,o.cartera),!o.broker||o.brokerAuto);
        tr.insertBefore(td,tr.lastElementChild); }); } }catch(e){ console.warn('[bróker] ops',e); }
    return r; }; }

  /* Kanban: selector en el formulario de compra */
  if(typeof _emCompraForm==='function'){ var oF=_emCompraForm; _emCompraForm=function(t){ var r=oF.apply(this,arguments);
    try{ var cs=document.getElementById('emcCart'); if(cs&&!document.getElementById('emcBrk')){
      var lab=document.createElement('label'); lab.style.cssText='font-size:12px;color:#475569';
      lab.innerHTML='Bróker<select id="emcBrk" style="width:100%;padding:6px;border:1px solid var(--line);border-radius:8px;margin-top:3px">'+BR.map(function(b){return '<option>'+b+'</option>';}).join('')+'</select>';
      var cl=cs.closest('label'); cl.parentNode.insertBefore(lab,cl.nextSibling);
      var bs=document.getElementById('emcBrk'), tk=(t||'').toUpperCase(), toc=false;
      function pon(){ if(!toc) bs.value=khBrokerRegla(tk,cs.value); }
      pon(); cs.addEventListener('change',pon); bs.addEventListener('change',function(){ toc=true; }); } }catch(e){ console.warn('[bróker] kanban',e); }
    return r; }; }
  if(typeof _emCompraDo==='function'){ var oD=_emCompraDo; _emCompraDo=function(){
    var bs=document.getElementById('emcBrk'), v=bs&&bs.value, ids={}; (DB.operaciones||[]).forEach(function(o){ ids[o.id]=1; });
    /* el original guarda dentro: el bróker se pone antes de ese guardado envolviendo saveNow un instante */
    var oS2=saveNow; saveNow=function(){ if(v)(DB.operaciones||[]).forEach(function(o){ if(!ids[o.id]){ o.broker=v; delete o.brokerAuto; } }); return oS2.apply(this,arguments); };
    try{ return oD.apply(this,arguments); } finally { saveNow=oS2; if(v)(DB.operaciones||[]).forEach(function(o){ if(!ids[o.id]){ o.broker=v; delete o.brokerAuto; } }); } }; }
})();
