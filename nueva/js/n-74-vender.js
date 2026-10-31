/* APP NUEVA · FASE 3 · VENDER CON CABEZA (Carlos, 31-oct-2026: «debería avisarme, si quiero vender acciones, de cuál sería
   el lote a vender y desde dónde hacerlo»).
   Dos cosas distintas, y la app las separa:
     · HACIENDA: FIFO sobre TODAS las acciones iguales, estén en el bróker que estén (art. 37.2 LIRPF). El lote vendido y la
       plusvalía NO dependen de desde dónde vendas.
     · DINERO Y CUSTODIA: las acciones salen del bróker desde el que vendes y el dinero entra allí.
   En Cartera → Operaciones, al elegir «Venta» y poner acciones y precio, sale un recuadro con:
     1) los lotes que Hacienda dará por vendidos y la plusvalía estimada;
     2) por bróker: acciones que tienes allí, gastos de la venta y lo que te queda; y la recomendación.
   El formulario lleva su selector de Bróker (antes se ponía por regla y había que cambiarlo luego en la columna).
   Si vendes desde un bróker más acciones de las que tienes en él, avisa antes de guardar. */
(function(){
  if(window._nven) return; window._nven=true;
  var BR=['Renta 4','ING','Santander'];
  function $i(id){ return document.getElementById(id); }
  function E(x){ x=+x||0; try{ return x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }catch(e){ return x.toFixed(2)+' €'; } }
  function fd(s){ return s?s.split('-').reverse().join('/'):'—'; }
  function brk(o){ if(o&&o.broker) return o.broker; return (typeof khBrokerRegla==='function')?khBrokerRegla(o.ticker,o.cartera):'Renta 4'; }
  function T(){ return (typeof invOpsTicker!=='undefined'&&invOpsTicker)?String(invOpsTicker).toUpperCase():''; }
  function C(){ return (typeof invOpsCartera!=='undefined'&&invOpsCartera)||'Propia'; }
  function editando(){ return (typeof opEditId!=='undefined')?opEditId:null; }
  /* acciones de ese valor y cartera que hay en cada bróker (por operaciones, sin la que estés editando) */
  function porBroker(t,car){ var m={}; (DB.operaciones||[]).forEach(function(o){ if((o.ticker||'').toUpperCase()!==t||(o.cartera||'Propia')!==car||o.id===editando()) return;
      var b=brk(o); m[b]=(m[b]||0)+(o.tipo==='venta'?-1:1)*num(o.acciones); }); return m; }
  function gastos(imp,b,t){ return (typeof nGastosOperacion==='function')?nGastosOperacion(imp,b,'venta',t):0; }

  function montar(){
    var com=$i('opComision'); if(!com||$i('opBrk')) return;
    var lab=document.createElement('label'); lab.innerHTML='Bróker<select id="opBrk">'+BR.map(function(b){ return '<option>'+b+'</option>'; }).join('')+'</select>';
    var cl=com.closest('label'); cl.parentNode.insertBefore(lab,cl.nextSibling);
    var add=$i('opAdd'); var box=document.createElement('div'); box.id='nVentaInfo'; box.className='n-vinfo'; box.style.display='none';
    if(add&&add.parentNode) add.parentNode.parentNode.insertBefore(box,add.parentNode);
    $i('opBrk').addEventListener('change',function(){ this.dataset.tocado='1'; if(typeof opComisionSugerir==='function') opComisionSugerir(); pintar(); });
    ['opTipo','opAcc','opPrecio','opFecha'].forEach(function(id){ var el=$i(id); if(el){ el.addEventListener('input',pintar); el.addEventListener('change',pintar); } });
  }
  function porDefecto(){ var s=$i('opBrk'); if(!s||s.dataset.tocado) return; var t=T(); if(!t) return;
    var tipo=($i('opTipo')||{}).value, antes=s.value; setTimeout(function(){ if(s.value!==antes&&typeof opComisionSugerir==='function') opComisionSugerir(); },0);
    if(tipo==='venta'){ var r=calc(); s.value=(r&&r.mejor)||(typeof khBrokerRegla==='function'?khBrokerRegla(t,C()):'Renta 4'); }
    else s.value=(typeof khBrokerRegla==='function')?khBrokerRegla(t,C()):'Renta 4';
  }
  function calc(){
    var t=T(), car=C(), n=num(($i('opAcc')||{}).value), pr=num(($i('opPrecio')||{}).value);
    if(!t||!(n>0)||!(pr>0)) return null;
    var fecha=($i('opFecha')||{}).value||new Date().toISOString().slice(0,10);
    var lista=(DB.operaciones||[]).filter(function(o){ return o.id!==editando(); }).concat([{id:'__prev',ticker:t,cartera:car,fecha:fecha,tipo:'venta',acciones:n,precio:pr}]);
    var F=null; try{ F=nFifo(lista); }catch(e){ return null; }
    var vend=F.sold.filter(function(s){ return s.opId==='__prev'; });
    var M=porBroker(t,car), tot=0; Object.keys(M).forEach(function(b){ tot+=Math.max(0,M[b]); });
    var imp=n*pr, filas=Object.keys(M).filter(function(b){ return M[b]>0.0001; }).map(function(b){ var g=gastos(imp,b,t); return {b:b,acc:M[b],g:g,neto:imp-g,ok:M[b]>=n-0.0001}; });
    var buenos=filas.filter(function(f){ return f.ok; }).sort(function(a,b){ return a.g-b.g; });
    return {t:t,n:n,pr:pr,imp:imp,vend:vend,tot:tot,filas:filas,mejor:buenos.length?buenos[0].b:null};
  }
  function pintar(){
    var box=$i('nVentaInfo'); if(!box) return;
    var tipo=($i('opTipo')||{}).value; porDefecto();
    if(tipo!=='venta'){ box.style.display='none'; return; }
    var r=calc(); if(!r){ box.style.display='block'; box.innerHTML='<b>Venta</b> · pon las acciones y el precio y te digo qué lote cuenta como vendido y desde qué bróker te conviene.'; return; }
    var b=($i('opBrk')||{}).value, g=gastos(r.imp,b,r.t), coste=0;
    var lot=r.vend.map(function(s){ coste+=s.acc*s.pc; return '<tr><td>'+fd(s.fecha)+'</td><td>'+(Math.round(s.acc*10000)/10000)+'</td><td>'+E(s.pc)+'</td><td>'+esc(s.broker||'')+'</td></tr>'; }).join('');
    var falta=r.n-r.vend.reduce(function(s,x){ return s+x.acc; },0);
    var plus=r.imp-g-coste;
    var tb=r.filas.map(function(f){ return '<tr class="'+(f.b===r.mejor?'best':'')+(f.ok?'':' no')+'"><td><b>'+f.b+'</b>'+(f.b===r.mejor?' ⭐':'')+'</td><td>'+(Math.round(f.acc*10000)/10000)+'</td><td>'+E(f.g)+'</td><td>'+(f.ok?E(f.neto):'<span class="muted">no tienes tantas</span>')+'</td></tr>'; }).join('');
    var aviso='';
    var enB=r.filas.filter(function(f){ return f.b===b; })[0];
    if(!enB||enB.acc<r.n-0.0001) aviso='<div class="av">⚠ En <b>'+esc(b)+'</b> tienes '+(enB?Math.round(enB.acc*10000)/10000:0)+' acciones y quieres vender '+r.n+'. Elige otro bróker o vende menos.</div>';
    if(falta>0.0001) aviso+='<div class="av">⚠ En total solo tienes '+(Math.round(r.tot*10000)/10000)+' acciones de '+esc(r.t)+' en esta cartera.</div>';
    var ing=r.filas.some(function(f){ return f.b==='ING'; })?'<div class="sm">Vender desde ING cuenta como operación del trimestre: ese trimestre no pagas la custodia de ING (4,84 € por empresa).</div>':'';
    box.style.display='block';
    box.innerHTML='<div class="h">💡 Antes de vender '+r.n+' '+esc(r.t)+' a '+E(r.pr)+'</div>'+
      '<div class="g"><div><div class="st">1 · Para Hacienda (FIFO, da igual el bróker)</div>'+
        (lot?'<table><thead><tr><th>Lote comprado</th><th>Acc.</th><th>Precio con gastos</th><th>Bróker del lote</th></tr></thead><tbody>'+lot+'</tbody></table>':'<div class="muted">sin lotes</div>')+
        '<div class="res">Plusvalía estimada: <b class="'+(plus>=0?'pos':'neg')+'">'+(plus>=0?'+':'')+E(plus)+'</b> <span class="muted">(venta '+E(r.imp)+' − gastos '+E(g)+' − coste '+E(coste)+')</span></div></div>'+
      '<div><div class="st">2 · Desde dónde venderlas (dinero y custodia)</div>'+
        '<table><thead><tr><th>Bróker</th><th>Tienes</th><th>Gastos venta</th><th>Te queda</th></tr></thead><tbody>'+tb+'</tbody></table>'+
        (r.mejor?'<div class="res">Recomendado: <b>'+r.mejor+'</b> (tiene acciones suficientes y gastos más bajos). El dinero entrará allí.</div>':'<div class="res">Ningún bróker tiene por sí solo '+r.n+' acciones: tendrías que vender en dos operaciones.</div>')+ing+'</div></div>'+aviso;
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  window.nVentaCalc=calc;

  /* al guardar: el bróker del formulario va a la operación; aviso si vendes más de las que hay en ese bróker */
  if(typeof addOp==='function'){ var oA=addOp; addOp=function(){
    var s=$i('opBrk'), b=s?s.value:null, ed=editando(), ids={}; (DB.operaciones||[]).forEach(function(o){ ids[o.id]=1; });
    if(b && ($i('opTipo')||{}).value==='venta'){ var t=T(), n=num(($i('opAcc')||{}).value), M=porBroker(t,C());
      if(n>0 && (M[b]||0)<n-0.0001 && !confirm('En '+b+' tienes '+(Math.round((M[b]||0)*10000)/10000)+' acciones de '+t+' y vas a vender '+n+'.\n\n¿Registrar la venta desde '+b+' igualmente?')) return; }
    var r=oA.apply(this,arguments);
    if(b){ (DB.operaciones||[]).forEach(function(o){ if((ed&&o.id===ed)||(!ed&&!ids[o.id])){ o.broker=b; delete o.brokerAuto; } });
      if(typeof scheduleSave==='function') scheduleSave(); if(typeof renderInvOps==='function') renderInvOps(); }
    if(s) delete s.dataset.tocado; pintar();
    return r; }; }
  if(typeof editOp==='function'){ var oE=editOp; editOp=function(id){ var r=oE.apply(this,arguments); var o=(DB.operaciones||[]).find(function(x){ return x.id===id; }), s=$i('opBrk');
    if(o&&s){ s.value=o.broker||brk(o); s.dataset.tocado='1'; } pintar(); return r; }; }
  if(typeof renderInvOps==='function'){ var oR=renderInvOps; renderInvOps=function(){ var r=oR.apply(this,arguments); try{ montar(); pintar(); }catch(e){ console.warn('[vender]',e); } return r; }; }
  /* la ficha antigua tenía un «Bróker» de la empresa entera: en la nueva manda el de cada operación, se oculta para no confundir */
  var st=document.createElement('style'); st.textContent='#invOpsMeta label:has(input[data-meta="broker"]){display:none}'+
    '.n-vinfo{margin:10px 0;padding:12px 14px;border:1px solid #BFDBFE;background:#EFF6FF;border-radius:12px;font-size:13px}'+
    '.n-vinfo .h{font-weight:800;margin-bottom:8px}.n-vinfo .g{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:900px){.n-vinfo .g{grid-template-columns:1fr}}'+
    '.n-vinfo .st{font-weight:700;color:#1E3A8A;margin-bottom:4px}.n-vinfo table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px}'+
    '.n-vinfo th{font-size:11px;color:#64748B;text-align:left;padding:4px 6px;border-bottom:1px solid #E5E9EF}.n-vinfo td{padding:4px 6px;border-bottom:1px solid #F1F5F9}'+
    '.n-vinfo tr.best td{background:#F0FDF4}.n-vinfo tr.no td{color:#94A3B8}.n-vinfo .res{margin-top:6px}.n-vinfo .pos{color:#16A34A}.n-vinfo .neg{color:#DC2626}'+
    '.n-vinfo .av{margin-top:8px;padding:6px 10px;background:#FEF3C7;border-radius:8px;color:#92400E}.n-vinfo .sm{margin-top:4px;font-size:11.5px;color:#64748B}';
  document.head.appendChild(st);
})();
