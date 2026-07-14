/* ============================================================
   15-cmdk.js — Paleta de comandos (Ctrl-K / Cmd-K)
   Busca y salta a: vistas (pestañas), empresas (abre ficha) y acciones rápidas.
   ↑/↓ mover · Enter ejecutar · Esc cerrar. Módulo autocontenido y aditivo.
   ============================================================ */
(function(){
  var GROUP_LABEL={control:'Control',mov:'Movimientos',trabajo:'Trabajo',eleccion:'Elección',cartera:'Cartera',tesis:'Tesis',planinv:'Plan Inversor',informes:'Informes',graficas:'Gráficas'};
  function _esc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _norm(s){ return (''+(s==null?'':s)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function buildIndex(){
    var items=[];
    try{ if(typeof GROUPS!=='undefined'&&GROUPS){ Object.keys(GROUPS).forEach(function(g){ GROUPS[g].forEach(function(v){ items.push({tipo:'vista', label:v[1], sub:(GROUP_LABEL[g]||g), run:function(){ if(typeof activarVista==='function')activarVista(v[0]); } }); }); }); } }catch(e){}
    try{ var seen={}; var add=function(t,nombre){ t=(''+(t||'')).toUpperCase(); if(!t||seen[t])return; seen[t]=1; items.push({tipo:'empresa', label:t+(nombre?(' · '+nombre):''), sub:'Abrir ficha', key:t+' '+(nombre||''), run:function(){ if(typeof abrirFicha==='function')abrirFicha(t); } }); };
      var DBs=(typeof DB!=='undefined')?DB:{};
      Object.keys(DBs.valores||{}).forEach(function(t){ add(t,(DBs.valores[t]||{}).nombre); });
      (DBs.analisis||[]).forEach(function(a){ add(a.ticker,a.nombre); });
      Object.keys(DBs.universo||{}).forEach(function(t){ add(t,(DBs.universo[t]||{}).nombre); });
    }catch(e){}
    var act=function(label,fn){ items.push({tipo:'accion', label:label, sub:'Acción', run:fn}); };
    if(typeof openPapelera==='function') act('Abrir Papelera', function(){ openPapelera(); });
    if(typeof pushSnapshot==='function') act('Crear punto de restauración', function(){ pushSnapshot('punto manual'); if(typeof showToast==='function')showToast('💾 Punto de restauración creado',null,null,2500); });
    if(typeof descargarBackup==='function') act('Descargar copia de seguridad', function(){ descargarBackup(); });
    return items;
  }
  var _idx=null, _sel=0, _res=[];
  function open(){
    var ov=document.getElementById('cmdkOverlay');
    if(!ov){ ov=document.createElement('div'); ov.id='cmdkOverlay'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh'; ov.addEventListener('mousedown',function(e){ if(e.target===ov)close(); }); document.body.appendChild(ov); }
    ov.innerHTML='<div style="background:#fff;border-radius:12px;width:min(560px,92vw);box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden"><input id="cmdkInput" placeholder="Buscar vista, empresa o acción…  (Esc para cerrar)" autocomplete="off" style="width:100%;box-sizing:border-box;border:0;border-bottom:1px solid #e2e8f0;padding:14px 16px;font-size:15px;outline:none"><div id="cmdkList" style="max-height:52vh;overflow:auto"></div></div>';
    _idx=buildIndex(); _sel=0;
    var inp=document.getElementById('cmdkInput');
    inp.addEventListener('input',function(){ _sel=0; refresh(); });
    inp.addEventListener('keydown',onKey);
    refresh();
    setTimeout(function(){ try{ inp.focus(); }catch(e){} },10);
  }
  function close(){ var ov=document.getElementById('cmdkOverlay'); if(ov)ov.remove(); }
  function score(q,it){
    var hay=_norm(it.label+' '+(it.key||'')+' '+(it.sub||''));
    if(hay.startsWith(q))return 0;
    if((' '+hay).indexOf(' '+q)>=0)return 1;         /* prefijo de palabra */
    var i=hay.indexOf(q); if(i>=0)return 5+i;         /* subcadena */
    var qi=0; for(var k=0;k<hay.length&&qi<q.length;k++){ if(hay[k]===q[qi])qi++; } /* fuzzy en orden */
    return qi<q.length? -1 : 40;
  }
  function refresh(){
    var inp=document.getElementById('cmdkInput'); var list=document.getElementById('cmdkList'); if(!list)return;
    var q=_norm((inp&&inp.value)||'');
    var arr;
    if(!q){ arr=_idx.slice(0,50).map(function(it){return {it:it,s:0};}); }
    else { arr=[]; _idx.forEach(function(it){ var s=score(q,it); if(s>=0)arr.push({it:it,s:s}); }); arr.sort(function(a,b){ return a.s-b.s; }); arr=arr.slice(0,50); }
    _res=arr.map(function(x){return x.it;});
    if(_sel>=_res.length)_sel=Math.max(0,_res.length-1);
    var TIcon={vista:'📁',empresa:'🏢',accion:'⚡'};
    list.innerHTML=_res.length? _res.map(function(it,i){ return '<div data-cmdk="'+i+'" style="display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;font-size:14px;'+(i===_sel?'background:#eef2ff':'')+'"><span>'+(TIcon[it.tipo]||'•')+'</span><span style="flex:1">'+_esc(it.label)+'</span><span style="font-size:11px;color:#94a3b8">'+_esc(it.sub||'')+'</span></div>'; }).join('') : '<div style="padding:14px 16px;color:#94a3b8;font-size:13px">Sin resultados</div>';
    var selEl=list.querySelector('[data-cmdk="'+_sel+'"]'); if(selEl&&selEl.scrollIntoView)selEl.scrollIntoView({block:'nearest'});
  }
  function exec(i){ var it=_res[i]; if(!it)return; close(); try{ it.run(); }catch(e){} }
  function onKey(e){
    if(e.key==='ArrowDown'){ e.preventDefault(); _sel=Math.min(_res.length-1,_sel+1); refresh(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); _sel=Math.max(0,_sel-1); refresh(); }
    else if(e.key==='Enter'){ e.preventDefault(); exec(_sel); }
    else if(e.key==='Escape'){ e.preventDefault(); close(); }
  }
  document.addEventListener('click',function(e){ var c=e.target.closest&&e.target.closest('[data-cmdk]'); if(c){ exec(+c.getAttribute('data-cmdk')); } });
  document.addEventListener('mousemove',function(e){ var c=e.target.closest&&e.target.closest('[data-cmdk]'); if(!c)return; var i=+c.getAttribute('data-cmdk'); if(i===_sel)return; _sel=i; var list=document.getElementById('cmdkList'); if(list){ [].forEach.call(list.children,function(ch,idx){ ch.style.background = idx===_sel?'#eef2ff':''; }); } });
  document.addEventListener('keydown',function(e){ if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); if(document.getElementById('cmdkOverlay'))close(); else open(); } });
})();
