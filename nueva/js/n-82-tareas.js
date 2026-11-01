/* APP NUEVA · Sistema › Tareas con el aspecto de la app nueva (1-nov-2026, Carlos: «vamos paso a paso para ir comparando»).
   Solo aspecto: mismas tareas (DB.todos), mismo formulario y mismos botones (marcar hecha, borrar, abrir ficha).
   - Arriba, 4 cifras: pendientes · vencidas · esta semana · hechas en los últimos 30 días.
   - El bloque va siempre abierto y la lista son tarjetas: fecha con el día de la semana y cuánto falta (o cuánto lleva
     vencida, en rojo), descripción, el porqué debajo, la empresa como botón a su ficha. Las hechas van al final, en gris.
   - Carlos (1-nov): las vencidas NO salen en el Panel; se quedan aquí. */
(function(){
  if(typeof renderMonitor!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var D=['dom','lun','mar','mié','jue','vie','sáb'];
  function dias(f,hoy){ return Math.round((Date.parse(f+'T12:00:00')-Date.parse(hoy+'T12:00:00'))/864e5); }
  function tkOk(t){ t=String(t||'').toUpperCase(); if(!t) return false; if((DB.analisis||[]).some(function(a){ return String(a.ticker||'').toUpperCase()===t; })) return true; var v=(DB.valores||{})[t]; return !!(v&&v.nombre); }
  function pinta(){
    var V=document.getElementById('view-monitor'); if(!V) return;
    var hoy=new Date().toISOString().slice(0,10), T=(DB.todos||[]).slice(), d30=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    var pend=T.filter(function(x){ return !x.hecho; }), venc=pend.filter(function(x){ return x.fecha&&x.fecha<hoy; }),
        sem=pend.filter(function(x){ return x.fecha&&x.fecha>=hoy&&dias(x.fecha,hoy)<=7; }),
        hech=T.filter(function(x){ return x.hecho&&(!x.fechaHecho||String(x.fechaHecho).slice(0,10)>=d30); });
    var k=document.getElementById('nTarK'); if(!k){ k=document.createElement('div'); k.id='nTarK'; k.className='n-ctrl'; var blk=V.querySelector('.pos-blk[data-monblk="tareas"]')||V.querySelector('.pos-blk'); if(blk) blk.parentNode.insertBefore(k,blk); else V.appendChild(k); }
    var prox=pend.filter(function(x){ return x.fecha&&x.fecha>=hoy; }).sort(function(a,b){ return a.fecha<b.fecha?-1:1; })[0];
    k.innerHTML=typeof nKpi!=='function'?'':
      nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'📝',t:'Pendientes',v:String(pend.length),s:prox?'la próxima vence el '+prox.fecha.slice(8,10)+'/'+prox.fecha.slice(5,7):(pend.length?'sin fecha límite':'nada pendiente')})+
      nKpi({c:venc.length?'#DC2626':'#16A34A',bg:venc.length?'#FEE2E2':'#DCFCE7',ic:'⏰',t:'Vencidas',v:String(venc.length),vCls:venc.length?'n-neg':'n-pos',s:venc.length?'pasada su fecha y sin hacer':'ninguna fuera de plazo'})+
      nKpi({c:'#D97706',bg:'#FEF3C7',ic:'🗓️',t:'Esta semana',v:String(sem.length),s:'vencen en los próximos 7 días'})+
      nKpi({c:'#15803D',bg:'#DCFCE7',ic:'✅',t:'Hechas',v:String(hech.length),s:'en los últimos 30 días'});
    /* bloque siempre abierto */
    var b=V.querySelector('.pos-blk[data-monblk="tareas"]'); if(b&&!b.classList.contains('open')) b.classList.add('open');
    /* lista en tarjetas */
    var te=document.getElementById('todoTabla'); if(!te) return;
    var L=T.sort(function(a,b){ return (a.hecho?1:0)-(b.hecho?1:0)||String(a.fecha||'9999').localeCompare(String(b.fecha||'9999')); });
    if(!L.length){ te.innerHTML='<div class="n-tar-vacio">Sin tareas. Añade una arriba.</div>'; return; }
    te.innerHTML='<div class="n-tar-list">'+L.map(function(x){
      var f=x.fecha, dd=f?dias(f,hoy):null, cls=x.hecho?'hecha':(dd!=null&&dd<0?'venc':(dd!=null&&dd<=7?'pronto':''));
      var cuando=x.hecho?('hecha'+(x.fechaHecho?' el '+String(x.fechaHecho).slice(8,10)+'/'+String(x.fechaHecho).slice(5,7):'')):(dd==null?'sin fecha':(dd<0?'vencida hace '+(-dd)+(dd===-1?' día':' días'):(dd===0?'vence hoy':(dd===1?'vence mañana':'faltan '+dd+' días'))));
      var fecha=f?'<b>'+D[new Date(f+'T12:00:00').getDay()]+' '+f.slice(8,10)+'/'+f.slice(5,7)+'</b>'+(f.slice(0,4)!==hoy.slice(0,4)?'/'+f.slice(2,4):''):'—';
      var tk=x.ticker?(tkOk(x.ticker)?'<button class="n-tar-tk" data-ficha="'+E(String(x.ticker).toUpperCase())+'">'+E(String(x.ticker).toUpperCase())+'</button>':'<span class="n-tar-tkmal" title="«'+E(x.ticker)+'» no está en tu universo">'+E(x.ticker)+' ⚠</span>'):'';
      return '<div class="n-tar '+cls+'"><label class="n-tar-ck"><input type="checkbox" data-todone="'+E(x.id)+'"'+(x.hecho?' checked':'')+'></label>'+
        '<div class="n-tar-f">'+fecha+'<span>'+cuando+'</span></div>'+
        '<div class="n-tar-m"><div class="n-tar-d">'+E(x.desc||'')+' '+tk+'</div>'+(x.razon?'<div class="n-tar-r">'+E(x.razon)+'</div>':'')+'</div>'+
        '<button class="n-tar-del" data-tododel="'+E(x.id)+'" title="Borrar">✕</button></div>'; }).join('')+'</div>';
  }
  var o=renderMonitor; renderMonitor=function(){ var r=o.apply(this,arguments); try{ pinta(); }catch(e){ console.warn('[n-tareas]',e); } return r; };
  var st=document.createElement('style'); st.textContent=
    '#view-monitor #nTarK{margin:0 0 14px}'+
    '#view-monitor #todoForm{background:#F8FAFC!important;border:1px solid #E2E8F0;border-radius:12px}'+
    '.n-tar-list{display:flex;flex-direction:column;gap:8px}'+
    '.n-tar{display:grid;grid-template-columns:28px 120px 1fr 32px;gap:10px;align-items:center;background:#fff;border:1px solid #E2E8F0;border-left:4px solid #1F4A9A;border-radius:12px;padding:10px 12px}'+
    '.n-tar.pronto{border-left-color:#D97706}.n-tar.venc{border-left-color:#DC2626;background:#FEF2F2}.n-tar.hecha{border-left-color:#CBD5E1;opacity:.6}.n-tar.hecha .n-tar-d{text-decoration:line-through}'+
    '.n-tar-ck input{width:18px;height:18px;cursor:pointer}.n-tar-f{font-size:13px;line-height:1.3}.n-tar-f span{display:block;font-size:11.5px;color:#64748B}.n-tar.venc .n-tar-f span{color:#DC2626;font-weight:700}.n-tar.pronto .n-tar-f span{color:#B45309;font-weight:600}'+
    '.n-tar-d{font-weight:700;font-size:14px;color:#1E293B}.n-tar-r{font-size:12.5px;color:#64748B;margin-top:2px}'+
    '.n-tar-tk{border:1px solid #C7D2FE;background:#EEF2FF;color:#1F4A9A;border-radius:999px;font-size:11px;font-weight:800;padding:1px 8px;cursor:pointer;margin-left:4px}'+
    '.n-tar-tkmal{font-size:11px;color:#B45309;background:#FEF3C7;border-radius:999px;padding:1px 6px;font-weight:700}'+
    '.n-tar-del{border:0;background:transparent;color:#94A3B8;font-size:15px;cursor:pointer;border-radius:8px;padding:4px}.n-tar-del:hover{background:#FEE2E2;color:#DC2626}'+
    '.n-tar-vacio{padding:22px;text-align:center;color:#64748B;border:1px dashed #CBD5E1;border-radius:12px}'+
    '@media(max-width:700px){.n-tar{grid-template-columns:26px 1fr 28px}.n-tar-f{grid-column:2}.n-tar-m{grid-column:2}.n-tar-del{grid-row:1;grid-column:3}}';
  document.head.appendChild(st);
})();
