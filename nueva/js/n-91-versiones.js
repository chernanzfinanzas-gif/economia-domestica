/* APP NUEVA · Recuperar de una versión anterior de tus datos (1-nov-2026). Drive guarda las versiones de
   datos-economia.json unos 30 días, pero su pantalla no deja descargarlas. La app ya tiene permiso sobre ese fichero:
   aquí las pide a Drive, las compara con lo que hay ahora y enseña los movimientos (y operaciones, dividendos, tareas)
   que existían en esa versión y ya no están. Marcas los que quieras y «Recuperar» los vuelve a meter y guarda.
   Solo lee versiones; lo que se recupera entra como un apunte más (lo borrado a propósito, que está en la papelera,
   sale marcado y desmarcado). Botón en Finanzas › Movimientos: «🕘 Versiones anteriores». */
(function(){
  if(typeof gfetch!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function hora(t){ var d=new Date(t); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); }
  var SECC=[['movimientos','Movimientos'],['operaciones','Operaciones'],['todos','Tareas'],['diario','Decisiones'],['cajaMov','Caja']];
  function papel(){ var s={}; (DB.papelera||[]).forEach(function(e){ var p=e&&e.payload; if(!p) return; [p.item].concat(p.items||[]).forEach(function(x){ if(x&&x.id!=null) s[String(x.id)]=1; }); }); return s; }
  function faltan(V){ var del=papel(), out=[];
    SECC.forEach(function(s){ var cur={}; (DB[s[0]]||[]).forEach(function(x){ if(x&&x.id!=null) cur[String(x.id)]=1; });
      (V[s[0]]||[]).forEach(function(x){ if(x&&x.id!=null&&!cur[String(x.id)]) out.push({k:s[0],sec:s[1],x:x,borrado:!!del[String(x.id)]}); }); });
    Object.keys(V.dividendos||{}).forEach(function(t){ var cur={}; ((DB.dividendos||{})[t]||[]).forEach(function(x){ if(x&&x.id!=null) cur[String(x.id)]=1; });
      (V.dividendos[t]||[]).forEach(function(x){ if(x&&x.id!=null&&!cur[String(x.id)]) out.push({k:'dividendos',t:t,sec:'Dividendos '+t,x:x,borrado:!!del[String(x.id)]}); }); });
    return out; }
  function desc(f){ var x=f.x;
    if(f.k==='movimientos') return '<b>'+E(x.fecha||'')+'</b> · '+E(x.concepto||'')+(x.detalle&&x.detalle!==x.concepto?' <span class="mu">'+E(x.detalle)+'</span>':'')+' · <b>'+(x.tipo==='ingreso'?'+':'−')+N(x.importe).toFixed(2).replace('.',',')+' €</b>';
    if(f.k==='operaciones') return '<b>'+E((x.fecha||'').slice(0,10))+'</b> · '+E(x.tipo||'')+' '+E(x.ticker||'')+' · '+E(x.acciones||'')+' acc. a '+E(x.precio||'');
    if(f.k==='dividendos') return '<b>'+E(x.fecha||'')+'</b> · '+N(x.importe)+' €/acc.';
    return '<b>'+E(x.fecha||'')+'</b> · '+E(x.desc||x.concepto||x.porque||x.tipo||JSON.stringify(x).slice(0,80)); }
  var REV=null, VER={}, SEL={};
  function modal(html){ var m=document.getElementById('nVerM'); if(!m){ m=document.createElement('div'); m.id='nVerM'; m.className='n-ver-m'; document.body.appendChild(m);
      m.addEventListener('click',clic); }
    m.innerHTML='<div class="n-ver-c"><div class="n-ver-h"><b>🕘 Versiones anteriores de tus datos</b><button data-nver="x">✕</button></div><div class="n-ver-b">'+html+'</div></div>'; m.style.display='flex'; }
  function cerrar(){ var m=document.getElementById('nVerM'); if(m) m.style.display='none'; }
  async function abrir(){
    if(window._demoOn){ alert('En el modo demo no hay versiones de Drive.'); return; }
    if(typeof fileId==='undefined'||!fileId){ alert('Conecta con Google Drive primero.'); return; }
    modal('<div class="n-ver-n">Pidiendo a Drive la lista de versiones…</div>');
    try{ var r=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'/revisions?fields=revisions(id,modifiedTime,size,keepForever)&pageSize=200'); if(!r.ok) throw new Error('Drive '+r.status);
      REV=((await r.json()).revisions||[]).slice().reverse(); }catch(e){ modal('<div class="n-ver-n">No se pudo leer la lista: '+E(e.message)+'</div>'); return; }
    lista(); }
  function lista(){ var h='<div class="n-ver-n">Drive guarda las versiones unos 30 días. Elige una para ver qué tenía que ya no está.</div><div class="n-ver-l">';
    h+=REV.map(function(v,i){ return '<button class="n-ver-v" data-nverv="'+E(v.id)+'"><b>'+hora(v.modifiedTime)+'</b><span>'+(i===0?'la actual':Math.round(N(v.size)/1024)+' KB')+'</span></button>'; }).join('')+'</div>'; modal(h); }
  async function ver(id){ modal('<div class="n-ver-n">Descargando esa versión…</div>');
    try{ if(!VER[id]){ var r=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'/revisions/'+id+'?alt=media'); if(!r.ok) throw new Error('Drive '+r.status); VER[id]=await r.json(); } }
    catch(e){ modal('<div class="n-ver-n">No se pudo descargar: '+E(e.message)+'</div><button class="n-ver-btn" data-nver="lista">← Volver</button>'); return; }
    var F=faltan(VER[id]), v=REV.filter(function(x){ return x.id===id; })[0]; SEL={}; F.forEach(function(f,i){ if(!f.borrado) SEL[i]=1; }); window._nVerF=F; window._nVerId=id;
    var h='<button class="n-ver-btn s" data-nver="lista">← Otras versiones</button><div class="n-ver-n">Versión del <b>'+hora(v.modifiedTime)+'</b>: '+(F.length?('<b>'+F.length+'</b> registro'+(F.length===1?'':'s')+' que tenía y ahora no está'+(F.length===1?'':'n')+'.'):'no tenía nada que falte ahora.')+'</div>';
    if(F.length){ h+='<div class="n-ver-f">'+F.map(function(f,i){ return '<label class="n-ver-i'+(f.borrado?' bo':'')+'"><input type="checkbox" data-nveri="'+i+'"'+(SEL[i]?' checked':'')+'><span class="sec">'+E(f.sec)+'</span><span>'+desc(f)+(f.borrado?' <em>lo borraste tú (está en la papelera)</em>':'')+'</span></label>'; }).join('')+'</div><button class="n-ver-btn" data-nver="rec">Recuperar los marcados</button>'; }
    modal(h); }
  function recuperar(){ var F=window._nVerF||[], n=0;
    F.forEach(function(f,i){ if(!SEL[i]) return; if(f.k==='dividendos'){ DB.dividendos=DB.dividendos||{}; (DB.dividendos[f.t]=DB.dividendos[f.t]||[]).push(f.x); } else { (DB[f.k]=DB[f.k]||[]).push(f.x); } n++; });
    if(!n){ cerrar(); return; }
    if(typeof scheduleSave==='function') scheduleSave(); if(typeof renderAll==='function') try{ renderAll(); }catch(e){}
    modal('<div class="n-ver-n">✅ Recuperado'+(n===1?'':'s')+' <b>'+n+'</b> registro'+(n===1?'':'s')+'. Se guarda ahora en Drive.</div><button class="n-ver-btn" data-nver="x">Cerrar</button>'); }
  function clic(e){ var b=e.target.closest('[data-nver],[data-nverv],[data-nveri]'); if(!b){ if(e.target.id==='nVerM') cerrar(); return; }
    if(b.hasAttribute('data-nveri')){ var i=b.getAttribute('data-nveri'); if(b.checked) SEL[i]=1; else delete SEL[i]; return; }
    if(b.hasAttribute('data-nverv')){ ver(b.getAttribute('data-nverv')); return; }
    var a=b.getAttribute('data-nver'); if(a==='x') cerrar(); else if(a==='lista') lista(); else if(a==='rec') recuperar(); }
  window.nVersiones=abrir;
  /* botón en Movimientos */
  function boton(){ var V=document.getElementById('view-movimientos'); if(!V||document.getElementById('nVerBtn')) return;
    var b=document.createElement('button'); b.id='nVerBtn'; b.className='n-ver-open'; b.textContent='🕘 Versiones anteriores'; b.title='Ver y recuperar lo que tenía una versión anterior de tus datos en Drive'; b.addEventListener('click',abrir);
    var h=V.querySelector('.vhero'); if(h) h.after(b); else V.prepend(b); }
  setInterval(boton,1500); boton();
  var s=document.createElement('style'); s.textContent=
    '.n-ver-open{border:1px solid #CBD5E1;background:#fff;color:#1F4A9A;border-radius:10px;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;margin:0 0 10px}'+
    '.n-ver-m{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10000;display:none;align-items:center;justify-content:center;padding:16px}'+
    '.n-ver-c{background:#fff;border-radius:16px;max-width:720px;width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3)}'+
    '.n-ver-h{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:15px}.n-ver-h button{border:0;background:transparent;font-size:18px;cursor:pointer;color:#64748B}'+
    '.n-ver-b{padding:14px 16px;overflow:auto}.n-ver-n{font-size:13.5px;color:#334155;margin:0 0 10px;line-height:1.5}'+
    '.n-ver-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}.n-ver-v{display:flex;flex-direction:column;align-items:flex-start;border:1px solid #E2E8F0;background:#F8FAFC;border-radius:10px;padding:8px 10px;cursor:pointer;font:inherit;font-size:13px;color:#0F172A}.n-ver-v:hover{border-color:#1F4A9A}.n-ver-v span{font-size:11px;color:#64748B}'+
    '.n-ver-f{display:flex;flex-direction:column;gap:4px;margin:0 0 12px}.n-ver-i{display:flex;gap:8px;align-items:baseline;font-size:13px;padding:6px 8px;border:1px solid #E2E8F0;border-radius:9px}.n-ver-i.bo{background:#F8FAFC;color:#64748B}.n-ver-i .sec{font-size:10.5px;font-weight:800;text-transform:uppercase;color:#1F4A9A;min-width:88px}.n-ver-i em{font-size:11.5px;color:#92400E}.n-ver-i .mu{color:#64748B}'+
    '.n-ver-btn{border:0;background:#1F4A9A;color:#fff;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer}.n-ver-btn.s{background:#F1F5F9;color:#1F4A9A;margin:0 0 10px}';
  document.head.appendChild(s);
})();
