/* APP NUEVA · EMPRESAS → CNMV (9-nov-2026, Carlos: «un selector de empresas y aparecen todas sus publicaciones con enlace a
   la CNMV… y luego un selector por día que aparezcan las de cada día»).
   Datos: recogida/publicaciones/ (lo deja publicaciones_cnmv.py en cada subida): _indice.json, TK.json y dias/AAAA-MM.json.
   Solo títulos y enlaces a la CNMV: ningún documento sale del PC. */
(function(){
  var B='recogida/publicaciones/', IDX=null, CACHE={}, st={modo:'empresa', tk:null, dia:null, tipo:'', ambito:'analizada'};
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function get(r){ if(CACHE[r]) return Promise.resolve(CACHE[r]); return fetch(B+r,{cache:'no-store'}).then(function(x){ return x.ok?x.json():null; }).catch(function(){ return null; }).then(function(j){ if(j) CACHE[r]=j; return j; }); }
  function hoyIso(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function fdia(f){ return /^\d{4}-\d{2}-\d{2}$/.test(f||'')?f.slice(8,10)+'-'+f.slice(5,7)+'-'+f.slice(0,4):esc(f||''); }
  var DS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  function grupoTipo(t){ return /privilegiada/i.test(t)?'ip':(/Otra informaci/i.test(t)?'oir':({'Resultados':'res','Informe periódico':'ipp','Cuentas anuales':'anu','Gobierno':'gob','Capital':'cap'})[t]||'otr'); }
  var FILTROS=[['','Todas'],['com','Comunicaciones'],['res','Resultados'],['ipp','Informes periódicos'],['anu','Cuentas anuales'],['gob','Gobierno'],['cap','Capital']];
  function pasa(x){ if(!st.tipo) return true; var g=grupoTipo(x.t), g2=x.t2?grupoTipo(x.t2):''; if(st.tipo==='com') return g==='ip'||g==='oir'||g2==='ip'||g2==='oir'; return g===st.tipo; }
  function chip(x){ var g=grupoTipo(x.t), L={ip:'Inf. privilegiada',oir:'Otra inf. relevante',res:'Resultados',ipp:'Informe periódico',anu:'Cuentas anuales',gob:'Gobierno',cap:'Capital',otr:x.t}[g];
    return '<span class="cp-ch cp-'+g+'">'+esc(L)+'</span>'+(x.t2?'<span class="cp-ch cp-'+grupoTipo(x.t2)+'">'+(grupoTipo(x.t2)==='ip'?'Inf. privilegiada':'OIR')+'</span>':''); }
  function fila(x,conTk){ var nom=conTk?((IDX&&(IDX.empresas||[]).find(function(e){ return e.ticker===x.tk; }))||{}).empresa:'';
    return '<div class="cp-it"><div class="cp-fh">'+(conTk?'':fdia(x.f)+'<br>')+'<span>'+esc(x.h||'')+'</span></div><div class="cp-tx">'+
      (conTk?'<a class="cp-tk" data-cptk="'+esc(x.tk)+'">'+esc(x.tk)+'</a> <span class="cp-nm">'+esc(nom||'')+'</span><br>':'')+
      chip(x)+' <a href="'+esc(x.u)+'" target="_blank" rel="noopener">'+esc(x.a||'(sin título)')+'</a>'+(x.c?'<small>'+esc(x.c)+'</small>':'')+'</div></div>'; }
  function css(){ if(document.getElementById('cp-css')) return; var s=document.createElement('style'); s.id='cp-css'; s.textContent=
    '#view-cnmvpub{padding:4px 2px 40px}#view-cnmvpub h1{font-size:22px;margin:4px 0 2px;color:#1B3260}#view-cnmvpub .cp-sub{color:#64748B;font-size:13px;margin:0 0 12px}'+
    '.cp-tabs{display:flex;gap:6px;margin:0 0 10px;flex-wrap:wrap}.cp-tabs button,.cp-fl span{border:1px solid #CBD5E1;background:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;color:#334155;cursor:pointer}'+
    '.cp-tabs button.on,.cp-fl span.on{background:#1F4A9A;border-color:#1F4A9A;color:#fff}.cp-fl{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.cp-fl span{padding:4px 11px;font-size:12px}'+
    '.cp-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#fff;border-radius:14px;padding:10px 12px;box-shadow:0 1px 3px rgba(15,23,42,.08)}'+
    '.cp-bar input,.cp-bar select{font:inherit;font-size:14px;padding:7px 10px;border:1px solid #CBD5E1;border-radius:10px;background:#fff;max-width:100%}.cp-bar input[type=search]{flex:1;min-width:180px}'+
    '.cp-bar button{border:1px solid #CBD5E1;background:#F8FAFC;border-radius:10px;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer}'+
    '.cp-sug{background:#fff;border:1px solid #E2E8F0;border-radius:10px;margin-top:4px;max-height:260px;overflow:auto}.cp-sug div{padding:7px 10px;cursor:pointer;font-size:13px}.cp-sug div:hover{background:#EEF2FF}'+
    '.cp-card{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.08);padding:4px 12px 10px;margin-top:12px}.cp-mes{font-size:12px;font-weight:800;letter-spacing:.04em;color:#64748B;text-transform:uppercase;padding:12px 0 4px;border-bottom:1px solid #EEF2F6}'+
    '.cp-it{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:13px;line-height:1.35}.cp-fh{flex:none;width:78px;color:#334155;font-variant-numeric:tabular-nums;font-size:12px}.cp-fh span{color:#94A3B8}'+
    '.cp-tx{flex:1;min-width:0}.cp-tx a{color:#1B3260;text-decoration:none;font-weight:600}.cp-tx a:hover{text-decoration:underline}.cp-tx small{display:block;color:#94A3B8;font-size:11.5px;margin-top:2px}'+
    '.cp-tk{font-weight:800!important;cursor:pointer}.cp-nm{color:#64748B;font-size:12px}'+
    '.cp-ch{display:inline-block;font-size:10.5px;font-weight:700;border-radius:6px;padding:1px 6px;margin-right:4px;vertical-align:1px;white-space:nowrap}'+
    '.cp-ip{background:#FEE2E2;color:#B91C1C}.cp-oir{background:#E0EAFF;color:#1F4A9A}.cp-res{background:#DCFCE7;color:#15803D}.cp-ipp{background:#F1F5F9;color:#475569}.cp-anu{background:#FEF3C7;color:#B45309}.cp-gob{background:#F3E8FF;color:#7E22CE}.cp-cap{background:#E0F2FE;color:#0369A1}.cp-otr{background:#F1F5F9;color:#475569}'+
    '.cp-emp{font-weight:800;color:#1B3260;padding:12px 0 2px;border-bottom:1px solid #EEF2F6;cursor:pointer}.cp-emp small{font-weight:500;color:#64748B}.cp-mu{color:#64748B;font-size:13px;padding:14px 4px}'+
    '@media(max-width:560px){.cp-fh{width:62px;font-size:11px}}';
    document.head.appendChild(s); }
  function vista(){ var v=document.getElementById('view-cnmvpub'); if(v) return v;
    var ref=document.getElementById('view-fichaemp')||document.querySelector('section.view:last-of-type'); v=document.createElement('section'); v.className='view'; v.id='view-cnmvpub';
    if(ref&&ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v); return v; }
  function cabecera(){ return '<h1>Publicaciones en la CNMV</h1><p class="cp-sub">Todo lo que la recogida tiene apuntado de cada empresa, con su enlace a la CNMV. Las comunicaciones (información privilegiada y otra información relevante) están desde el 10-oct-2026.</p>'+
    '<div class="cp-tabs"><button data-cpm="empresa" class="'+(st.modo==='empresa'?'on':'')+'">Por empresa</button><button data-cpm="dia" class="'+(st.modo==='dia'?'on':'')+'">Por día</button></div>'; }
  function filtros(){ return '<div class="cp-fl">'+FILTROS.map(function(f){ return '<span data-cpf="'+f[0]+'" class="'+(st.tipo===f[0]?'on':'')+'">'+f[1]+'</span>'; }).join('')+'</div>'; }
  function pintar(){ css(); var v=vista();
    if(!IDX){ v.innerHTML='<div class="cp-mu">Cargando…</div>'; get('_indice.json').then(function(j){ IDX=j; if(!IDX){ v.innerHTML=cabecera()+'<div class="cp-mu">Las publicaciones todavía no están en el repositorio: llegan con la próxima subida automática.</div>'; return; } pintar(); }); return; }
    if(st.modo==='empresa') pintarEmpresa(v); else pintarDia(v); }
  function orden(){ var o={analizada:0,universo:1,otra:2}; return (IDX.empresas||[]).slice().sort(function(a,b){ return (o[a.grupo]-o[b.grupo])||a.empresa.localeCompare(b.empresa); }); }
  function pintarEmpresa(v){
    var L=orden(); if(!st.tk) st.tk=(L[0]||{}).ticker;
    var sel='<select id="cpSel">'+[['analizada','Analizadas por el método'],['universo','Resto del universo'],['otra','Otras']].map(function(g){ var xs=L.filter(function(e){ return e.grupo===g[0]; }); return xs.length?'<optgroup label="'+g[1]+'">'+xs.map(function(e){ return '<option value="'+e.ticker+'"'+(e.ticker===st.tk?' selected':'')+'>'+esc(e.empresa)+' ('+e.ticker+') · '+e.n+'</option>'; }).join('')+'</optgroup>':''; }).join('')+'</select>';
    v.innerHTML=cabecera()+'<div class="cp-bar"><input id="cpBus" type="search" autocomplete="off" placeholder="🔎 Escribe ticker o nombre">'+sel+'</div><div id="cpSug"></div>'+filtros()+'<div id="cpLista" class="cp-card"><div class="cp-mu">Cargando…</div></div>';
    get(st.tk+'.json').then(function(j){ var h=document.getElementById('cpLista'); if(!h) return; if(!j){ h.innerHTML='<div class="cp-mu">Sin datos de '+esc(st.tk)+'.</div>'; return; }
      var xs=(j.items||[]).filter(pasa); if(!xs.length){ h.innerHTML='<div class="cp-mu">Nada de este tipo.</div>'; return; }
      var out='', mes=''; xs.slice(0,1500).forEach(function(x){ var m=(x.f||'').slice(0,7); if(m!==mes){ mes=m; out+='<div class="cp-mes">'+(m.length===7?new Date(m+'-15').toLocaleDateString('es-ES',{month:'long',year:'numeric'}):esc(m||'sin fecha'))+'</div>'; } out+=fila(x,false); });
      h.innerHTML='<div class="cp-mu" style="padding:8px 0 0"><b>'+esc(j.empresa)+'</b> · '+xs.length+' publicaciones'+(xs.length>1500?' (se enseñan las 1.500 más recientes)':'')+'</div>'+out; });
  }
  function pintarDia(v){
    if(!st.dia) st.dia=hoyIso();
    var d=new Date(st.dia+'T12:00:00');
    v.innerHTML=cabecera()+'<div class="cp-bar"><button data-cpd="-1">‹</button><input id="cpDia" type="date" value="'+st.dia+'"><button data-cpd="1">›</button><b style="margin-left:4px">'+DS[d.getDay()]+'</b>'+
      '<select id="cpAmb"><option value="analizada"'+(st.ambito==='analizada'?' selected':'')+'>Solo las analizadas</option><option value="universo"'+(st.ambito==='universo'?' selected':'')+'>Analizadas y universo</option><option value="todas"'+(st.ambito==='todas'?' selected':'')+'>Todas</option></select></div>'+filtros()+'<div id="cpLista" class="cp-card"><div class="cp-mu">Cargando…</div></div>';
    get('dias/'+st.dia.slice(0,7)+'.json').then(function(j){ var h=document.getElementById('cpLista'); if(!h) return;
      var G={}; (IDX.empresas||[]).forEach(function(e){ G[e.ticker]=e; });
      var xs=((j&&j.items)||[]).filter(function(x){ var g=(G[x.tk]||{}).grupo; return x.f===st.dia&&pasa(x)&&(st.ambito==='todas'||g==='analizada'||(st.ambito==='universo'&&g==='universo')); });
      if(!xs.length){ h.innerHTML='<div class="cp-mu">No hay publicaciones apuntadas ese día'+(st.ambito!=='todas'?' para estas empresas (prueba con «Todas»)':'')+'.</div>'; return; }
      var por={}; xs.forEach(function(x){ (por[x.tk]=por[x.tk]||[]).push(x); });
      var tks=Object.keys(por).sort(function(a,b){ var o={analizada:0,universo:1,otra:2}; return (o[(G[a]||{}).grupo]-o[(G[b]||{}).grupo])||a.localeCompare(b); });
      h.innerHTML='<div class="cp-mu" style="padding:8px 0 0">'+xs.length+' publicaciones de '+tks.length+' empresas</div>'+tks.map(function(t){ return '<div class="cp-emp" data-cptk="'+t+'">'+t+' <small>'+esc((G[t]||{}).empresa||'')+((G[t]||{}).grupo==='analizada'?' · analizada':'')+'</small></div>'+por[t].map(function(x){ return fila(x,false).replace('<div class="cp-fh">'+fdia(x.f)+'<br>','<div class="cp-fh">'); }).join(''); }).join(''); });
  }
  function sugerir(q){ var s=document.getElementById('cpSug'); if(!s) return; q=(q||'').trim().toLowerCase(); if(!q){ s.innerHTML=''; return; }
    var xs=orden().filter(function(e){ return e.ticker.toLowerCase().indexOf(q)===0||e.empresa.toLowerCase().indexOf(q)>=0; }).slice(0,12);
    s.innerHTML=xs.length?'<div class="cp-sug">'+xs.map(function(e){ return '<div data-cptk="'+e.ticker+'"><b>'+e.ticker+'</b> '+esc(e.empresa)+' · '+e.n+'</div>'; }).join('')+'</div>':''; }
  document.addEventListener('click',function(e){ if(!e.target.closest||!e.target.closest('#view-cnmvpub')) return;
    var m=e.target.closest('[data-cpm]'); if(m){ st.modo=m.getAttribute('data-cpm'); pintar(); return; }
    var f=e.target.closest('[data-cpf]'); if(f){ st.tipo=f.getAttribute('data-cpf'); pintar(); return; }
    var t=e.target.closest('[data-cptk]'); if(t){ st.tk=t.getAttribute('data-cptk'); st.modo='empresa'; pintar(); window.scrollTo(0,0); return; }
    var d=e.target.closest('[data-cpd]'); if(d){ var x=new Date((st.dia||hoyIso())+'T12:00:00'); x.setDate(x.getDate()+(+d.getAttribute('data-cpd'))); st.dia=x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2); pintar(); } });
  document.addEventListener('change',function(e){ if(e.target.id==='cpSel'){ st.tk=e.target.value; pintar(); } else if(e.target.id==='cpDia'&&e.target.value){ st.dia=e.target.value; pintar(); } else if(e.target.id==='cpAmb'){ st.ambito=e.target.value; pintar(); } });
  document.addEventListener('input',function(e){ if(e.target.id==='cpBus') sugerir(e.target.value); });
  /* abrir desde fuera: window.cpAbrir('ENO') */
  window.cpAbrir=function(t){ st.tk=String(t||'').toUpperCase(); st.modo='empresa'; if(typeof activarVista==='function') activarVista('cnmvpub'); };
  function enganchar(){
    try{ if(typeof GROUPS!=='undefined'&&GROUPS.empresas&&!GROUPS.empresas.some(function(v){ return v[0]==='cnmvpub'; })) GROUPS.empresas.push(['cnmvpub','CNMV']); }catch(e){}
    vista();
    if(typeof activarVista!=='function'||activarVista._cp) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='cnmvpub') pintar(); return r; }; activarVista._cp=1; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
