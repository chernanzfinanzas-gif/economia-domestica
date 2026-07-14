/* ============================================================
   14-papelera.js — Deshacer (toast) + Papelera
   · Toda acción destructiva de un registro llama a undoableDelete(...).
   · Se muestra un toast «Deshacer» (5 s) y el elemento queda en DB.papelera
     (últimos TRASH_MAX, TRASH_DAYS días) para restaurarlo desde la Papelera.
   · La restauración es "data-driven" por tipo (TRASH_RESTORE): así persiste
     entre recargas sin depender de closures.
   ============================================================ */
var TRASH_MAX = 80;     /* máximo de elementos retenidos */
var TRASH_DAYS = 30;    /* antigüedad máxima en días */

function _papEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _papSave(){ if(typeof scheduleSave==='function')scheduleSave(); else if(typeof saveNow==='function')saveNow(); }

/* --- Toast --- */
function _toastHost(){ var h=document.getElementById('toastHost'); if(!h){ h=document.createElement('div'); h.id='toastHost'; h.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none'; document.body.appendChild(h); } return h; }
function showToast(msg, actionLabel, actionFn, ms){
  var h=_toastHost();
  var t=document.createElement('div');
  t.style.cssText='pointer-events:auto;background:#1f2937;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.28);font-size:13px;display:flex;align-items:center;gap:14px;max-width:92vw';
  var span=document.createElement('span'); span.innerHTML=msg; t.appendChild(span);
  if(actionLabel&&actionFn){ var b=document.createElement('button'); b.textContent=actionLabel; b.style.cssText='background:transparent;border:0;color:#93c5fd;font-weight:700;cursor:pointer;font-size:13px;padding:2px 4px'; b.addEventListener('click',function(){ try{actionFn();}catch(e){} if(t.parentNode)t.remove(); }); t.appendChild(b); }
  var x=document.createElement('button'); x.textContent='✕'; x.title='Cerrar'; x.style.cssText='background:transparent;border:0;color:#9ca3af;cursor:pointer;font-size:12px'; x.addEventListener('click',function(){ if(t.parentNode)t.remove(); }); t.appendChild(x);
  h.appendChild(t);
  var life=ms||5000;
  setTimeout(function(){ if(t.parentNode){ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(function(){ if(t.parentNode)t.remove(); },300); } }, life);
  return t;
}

/* --- Restauradores por tipo: reciben el payload, mutan DB y devuelven render fns a llamar --- */
var TRASH_RESTORE={
  operacion:          function(p){ DB.operaciones=DB.operaciones||[]; DB.operaciones.push(p.item); return ['renderAll','renderInvOps']; },
  operaciones_ticker: function(p){ DB.operaciones=(DB.operaciones||[]).concat(p.items||[]); return ['renderAll','renderInvOps']; },
  movimiento:         function(p){ DB.movimientos=DB.movimientos||[]; DB.movimientos.push(p.item); return ['renderAll']; },
  analisis:           function(p){ DB.analisis=DB.analisis||[]; DB.analisis.push(p.item); return ['renderAll']; },
  cerrada:            function(p){ DB.cerradas=DB.cerradas||[]; DB.cerradas.push(p.item); return ['renderInv','renderDividendos']; },
  amalia:             function(p){ DB.amalia=DB.amalia||[]; DB.amalia.push(p.item); return ['renderAmalia']; },
  patrimonio:         function(p){ DB.patrimonio=DB.patrimonio||[]; DB.patrimonio.push(p.item); return ['renderPat']; },
  easy:               function(p){ DB.easy=DB.easy||[]; DB.easy.push(p.item); return ['renderFondoR4']; },
  universo:           function(p){ DB.universo=DB.universo||{}; DB.universo[p.t]=p.item; return ['renderUniverso']; },
  combustible:        function(p){ DB.combustible=DB.combustible||[]; DB.combustible.push(p.item); return ['renderMazinger']; },
  protocolo:          function(p){ DB.protocolo=DB.protocolo||{}; DB.protocolo[p.t]=DB.protocolo[p.t]||[]; DB.protocolo[p.t].push(p.item); return ['renderPanelDash']; },
  dividendo:          function(p){ DB.dividendos=DB.dividendos||{}; DB.dividendos[p.t]=DB.dividendos[p.t]||[]; DB.dividendos[p.t].push(p.item); return ['renderDividendos']; }
};

function _runRenders(names){
  (names||[]).forEach(function(n){ try{ if(typeof window[n]==='function')window[n](); }catch(e){} });
  /* refresca la ficha abierta, si la hay (protocolo/dividendos se ven ahí) */
  try{ if(typeof fichaTicker!=='undefined'&&fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker); }catch(e){}
}
function _trashPurge(){ DB.papelera=DB.papelera||[]; var cut=Date.now()-TRASH_DAYS*86400000; DB.papelera=DB.papelera.filter(function(e){ return e&&e.when>=cut; }); if(DB.papelera.length>TRASH_MAX)DB.papelera=DB.papelera.slice(0,TRASH_MAX); }

/* --- API principal: borra con posibilidad de deshacer --- */
function undoableDelete(kind, label, payload, removeFn, renderNames){
  if(typeof removeFn==='function')removeFn();
  DB.papelera=DB.papelera||[];
  var id='tr'+Math.random().toString(36).slice(2,9);
  DB.papelera.unshift({ id:id, kind:kind, label:label, when:Date.now(), payload:payload });
  _trashPurge();
  _runRenders(renderNames);
  _papSave();
  if(typeof renderPapelera==='function')renderPapelera();
  showToast('🗑️ '+_papEsc(label)+' — eliminado', 'Deshacer', function(){ restoreTrash(id); });
  return id;
}

function restoreTrash(id){
  DB.papelera=DB.papelera||[];
  var i=-1; for(var k=0;k<DB.papelera.length;k++){ if(DB.papelera[k].id===id){ i=k; break; } }
  if(i<0)return false;
  var e=DB.papelera[i];
  var fn=TRASH_RESTORE[e.kind];
  if(!fn){ showToast('No se puede restaurar «'+_papEsc(e.label)+'»', null, null, 3000); return false; }
  var renders=[]; try{ renders=fn(e.payload)||[]; }catch(err){ showToast('Error al restaurar', null, null, 3000); return false; }
  DB.papelera.splice(i,1);
  _runRenders(renders);
  _papSave();
  if(typeof renderPapelera==='function')renderPapelera();
  showToast('✓ Restaurado: '+_papEsc(e.label), null, null, 2500);
  return true;
}

/* --- Papelera (modal) --- */
function openPapelera(){
  _trashPurge();
  var ov=document.getElementById('papeleraOverlay');
  if(!ov){ ov=document.createElement('div'); ov.id='papeleraOverlay'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px'; ov.addEventListener('click',function(ev){ if(ev.target===ov)ov.remove(); }); document.body.appendChild(ov); }
  ov.innerHTML='<div style="background:#fff;border-radius:14px;max-width:580px;width:100%;max-height:82vh;overflow:auto;padding:18px 20px;box-shadow:0 14px 44px rgba(0,0,0,.32)"><div id="papeleraBody"></div></div>';
  renderPapelera();
}
function renderPapelera(){
  var el=document.getElementById('papeleraBody'); if(!el)return;
  _trashPurge();
  var items=DB.papelera||[];
  var head='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h2 style="margin:0;font-size:18px">🗑️ Papelera</h2><button class="btn ghost sm" data-papclose="1">Cerrar</button></div>';
  if(!items.length){ el.innerHTML=head+'<div class="muted" style="padding:10px">Vacía. Aquí quedan los últimos elementos borrados ('+TRASH_DAYS+' días) por si quieres recuperarlos.</div>'; return; }
  var fmtWhen=function(ms){ try{ var d=new Date(ms); return d.toLocaleDateString('es-ES')+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } };
  var rows=items.map(function(e){ return '<tr><td>'+_papEsc(e.label)+'</td><td class="muted" style="font-size:11px;white-space:nowrap">'+fmtWhen(e.when)+'</td><td class="right" style="white-space:nowrap"><button class="btn sm" data-restore="'+e.id+'">Restaurar</button> <button class="btn ghost sm" data-purge="'+e.id+'" title="Borrar definitivamente">✕</button></td></tr>'; }).join('');
  el.innerHTML=head+'<div class="sub" style="margin-bottom:8px">'+items.length+' elemento(s). Se guardan '+TRASH_DAYS+' días o hasta '+TRASH_MAX+' como máximo.</div><div style="overflow:auto"><table style="width:100%"><tbody>'+rows+'</tbody></table></div><div style="margin-top:12px;text-align:right"><button class="btn danger sm" data-papvaciar="1">Vaciar papelera</button></div>';
}

/* --- Clicks dentro de la papelera (delegado) --- */
document.addEventListener('click',function(e){
  if(!e.target||!e.target.closest)return;
  var r=e.target.closest('[data-restore]'); if(r){ restoreTrash(r.getAttribute('data-restore')); return; }
  var p=e.target.closest('[data-purge]'); if(p){ var id=p.getAttribute('data-purge'); DB.papelera=(DB.papelera||[]).filter(function(x){return x.id!==id;}); _papSave(); renderPapelera(); return; }
  if(e.target.closest('[data-papclose]')){ var ov=document.getElementById('papeleraOverlay'); if(ov)ov.remove(); return; }
  if(e.target.closest('[data-papvaciar]')){ if(confirm('¿Vaciar la papelera definitivamente? Esto sí es irreversible.')){ DB.papelera=[]; _papSave(); renderPapelera(); } return; }
});
