/* APP NUEVA · Sistema › Tareas › «Pendiente revisión» (5-nov-2026).
   Carlos: «los pendientes de sistema como el de Acerinox no deberían quedar en tareas sueltas: una ficha nueva "Pendiente
   Revisión" donde se anoten, yo las recuerde y te pregunte si está hecho» y «un json de fallos y otros avisos que vaya a la app
   y en Sistema se ponga en Tareas como un listado a verificar con marca de "hecho"».
   - La lista la escribe el método (pendientes.py: recogidas que fallan, documentos que el lector no lee, cruces con la nube que
     no casan, lo que Claude apunta) y la publica subir_datos.py en recogida/estado-v3.json → pendientes_sistema.
   - Dos estados del método: «Abierto» (hay que arreglarlo: pregúntaselo a Claude en el chat) y «Resuelto por Claude» (dice cómo;
     falta que Carlos lo compruebe). La marca «Hecho» es de Carlos y se guarda en su Drive (DB.sistemaHechos), no en el método.
   - Orden: abiertos, después resueltos sin marcar, y al final los hechos (plegados). */
(function(){
  if(typeof renderMonitor!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var L=null, cargando=false, verHechos=false;
  function cargar(){
    if(cargando) return; cargando=true;
    fetch('recogida/estado-v3.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ L=(j&&j.pendientes_sistema)||[]; window._nPendSis=L; pinta(); })
      .catch(function(){ L=L||[]; pinta(); }).then(function(){ cargando=false; });
  }
  /* 5-nov-2026: DB es «let» en 01-core, no window.DB: antes la marca «hecho» no se guardaba nunca (fallo mío). Ahora se lee DB
     directamente, y además vale la marca «comprobado» que escribe el método (pendientes.py --comprobado) cuando Carlos lo dice. */
  function db(){ try{ return (typeof DB!=='undefined'&&DB)||null; }catch(e){ return null; } }
  function hechos(){ var h={}, d=db(), m=(d&&d.sistemaHechos)||{}; Object.keys(m).forEach(function(k){ if(m[k]) h[k]=m[k]; }); (L||[]).forEach(function(x){ if(x.comprobado&&!h[x.id]&&m[x.id]!=='') h[x.id]=x.comprobado; }); return h; }
  function fecha(s){ s=String(s||''); return s.length>=10?s.slice(8,10)+'/'+s.slice(5,7):''; }
  function pinta(){
    var V=document.getElementById('view-monitor'); if(!V) return;
    var box=document.getElementById('nPendSis');
    if(!box){ box=document.createElement('div'); box.id='nPendSis'; var k=document.getElementById('nTarK'); if(k) k.parentNode.insertBefore(box,k); else V.appendChild(box); }
    if(L===null){ box.innerHTML='<div class="nps-h">🛠 Pendiente revisión</div><div class="nps-vacio">Cargando los avisos del método…</div>'; return; }
    var H=hechos(), ab=[], res=[], hec=[];
    L.forEach(function(x){ if(H[x.id]) hec.push(x); else if(x.estado==='abierto') ab.push(x); else res.push(x); });
    function tarj(x,cls){
      var ok=!!H[x.id];
      var tag=ok?'<span class="nps-tag hecho">Hecho'+(H[x.id]?' · '+fecha(H[x.id]):'')+'</span>':
        (x.estado==='abierto'?'<span class="nps-tag ab">Abierto · pregúntaselo a Claude</span>':'<span class="nps-tag res">Resuelto por Claude'+(x.resuelto?' el '+fecha(x.resuelto):'')+' · compruébalo</span>');
      var tk=x.ticker?'<button class="n-tar-tk" data-ficha="'+E(x.ticker)+'">'+E(x.ticker)+'</button>':'';
      return '<div class="nps-it '+cls+'"><label class="n-tar-ck" title="Marcar como hecho (comprobado por ti)"><input type="checkbox" data-pshecho="'+E(x.id)+'"'+(ok?' checked':'')+'></label>'+
        '<div class="nps-m"><div class="nps-q">'+E(x.que)+' '+tk+'</div>'+
        (x.detalle?'<div class="nps-d">'+E(x.detalle)+'</div>':'')+
        (x.como?'<div class="nps-c"><b>Qué se hizo:</b> '+E(x.como)+'</div>':'')+
        '<div class="nps-f">'+tag+'<span>desde el '+fecha(x.creado)+(x.origen?' · '+E(x.origen):'')+'</span></div></div></div>'; }
    /* 5-nov-2026 (Carlos: «he marcado todos, debería salir de la lista y pasar a un archivo»): lo marcado «hecho» sale de la
       lista y queda en un archivo plegado al pie, discreto, por si un fallo se repite y hay que ver cómo se arregló. */
    var h='<div class="nps-h">🛠 Pendiente revisión <span>avisos y fallos del sistema · márcalos «hecho» cuando lo hayas comprobado y pasan al archivo</span></div>';
    if(ab.length||res.length) h+='<div class="nps-k"><div class="'+(ab.length?'ab':'ok')+'"><b>'+ab.length+'</b> abiertos</div><div class="'+(res.length?'res':'ok')+'"><b>'+res.length+'</b> por comprobar</div></div>';
    else h+='<div class="nps-vacio">✓ Todo comprobado: no hay nada pendiente.</div>';
    h+=ab.map(function(x){ return tarj(x,'ab'); }).join('')+res.map(function(x){ return tarj(x,'res'); }).join('');
    hec.sort(function(a,b){ return String(H[b.id]).localeCompare(String(H[a.id])); });
    if(hec.length) h+='<div class="nps-ver" data-psver="1">📁 Archivo · '+(hec.length===1?'1 aviso comprobado':hec.length+' avisos comprobados')+' '+(verHechos?'▾ ocultar':'▸ ver')+'</div>'+(verHechos?hec.map(function(x){ return tarj(x,'hec'); }).join(''):'');
    box.innerHTML=h;
  }
  document.addEventListener('change',function(e){
    var c=e.target.closest&&e.target.closest('[data-pshecho]'); if(!c) return;
    var d=db(); if(!d) return; d.sistemaHechos=d.sistemaHechos||{};
    var id=c.getAttribute('data-pshecho'); if(c.checked) d.sistemaHechos[id]=new Date().toISOString(); else { delete d.sistemaHechos[id]; var it=(L||[]).filter(function(x){ return x.id===id; })[0]; if(it&&it.comprobado) d.sistemaHechos[id]=''; }
    if(typeof scheduleSave==='function') scheduleSave(); pinta();
  });
  document.addEventListener('click',function(e){ var v=e.target.closest&&e.target.closest('[data-psver]'); if(!v) return; verHechos=!verHechos; pinta(); });
  var o=renderMonitor; renderMonitor=function(){ var r=o.apply(this,arguments); try{ if(L===null) cargar(); pinta(); }catch(e){ console.warn('[n-pendsis]',e); } return r; };
  var st=document.createElement('style'); st.textContent=
    '#nPendSis{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px 14px 10px;margin:0 0 16px}'+
    '.nps-h{font-weight:800;font-size:16px;color:#1E293B;margin-bottom:8px}.nps-h span{display:block;font-weight:500;font-size:12.5px;color:#64748B;margin-top:2px}'+
    '.nps-k{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}.nps-k div{border-radius:10px;padding:6px 12px;font-size:13px;background:#F1F5F9;color:#334155}.nps-k b{font-size:16px;margin-right:4px}'+
    '.nps-k .ab{background:#FEE2E2;color:#B91C1C}.nps-k .res{background:#EAF1FD;color:#1F4A9A}.nps-k .ok{background:#F1F5F9;color:#475569}'+
    '.nps-it{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;border:1px solid #E2E8F0;border-left:4px solid #DC2626;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#fff}'+
    '.nps-it.res{border-left-color:#1F4A9A}.nps-it.hec{border-left-color:#CBD5E1;opacity:.65}.nps-it.hec .nps-q{text-decoration:line-through}'+
    '.nps-q{font-weight:700;font-size:14px;color:#1E293B}.nps-d{font-size:12.5px;color:#475569;margin-top:3px}.nps-c{font-size:12.5px;color:#1E3A8A;background:#F5F8FF;border-radius:8px;padding:5px 8px;margin-top:5px}'+
    '.nps-f{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px;font-size:11.5px;color:#64748B}'+
    '.nps-tag{border-radius:999px;padding:2px 8px;font-weight:700}.nps-tag.ab{background:#FEE2E2;color:#B91C1C}.nps-tag.res{background:#EAF1FD;color:#1F4A9A}.nps-tag.hecho{background:#DCFCE7;color:#15803D}'+
    '.nps-ver{font-size:12px;color:#64748B;cursor:pointer;padding:4px 2px 6px;font-weight:600}.nps-vacio{padding:14px;text-align:center;color:#64748B;border:1px dashed #CBD5E1;border-radius:12px}'+
    '.nps-it .n-tar-ck input{width:18px;height:18px;cursor:pointer;margin-top:2px}';
  document.head.appendChild(st);
})();
