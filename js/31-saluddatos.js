/* ============================================================
   31 · SALUD DE DATOS  [27-sep-2026 · auditoría, propuesta D2]
   Repaso en lote de lo que antes se revisaba a mano: ficha frente a Evolución del Dividendo,
   cobros pagados sin anotar, líneas de ficha con fecha futura o sin acciones, movimientos
   duplicados y netos que no son el 19 % del bruto. Solo LEE datos; lo único que escribe es
   la marca «No es un error» (DB.saludIgnorar[clave]) para que un aviso revisado no vuelva.
   Se pinta arriba de la pantalla Estado.
   ============================================================ */
function _sdU(x){ return (x||'').toUpperCase(); }
function _sdN(v){ var n=parseFloat(v); return isNaN(n)?0:n; }
function _sdHoy(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _sdF(f){ var p=(''+(f||'')).slice(0,10).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):(''+f); }
function _sdEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _sdOps(){ var o=(DB.operaciones||[]).slice(); (DB.cerradas||[]).forEach(function(c){ (c.ops||[]).forEach(function(x){ o.push(Object.assign({ticker:c.ticker},x)); }); }); return o; }
/* acciones que dan derecho a un dividendo de fecha f: compras ≤ f, ventas < f (una venta del mismo día no resta) */
function _sdAccDiv(ops,t,f){ var sh=0; ops.forEach(function(o){ if(_sdU(o.ticker)!==t) return; var of=(o.fecha||''); if(o.tipo==='venta'){ if(of<f) sh-=_sdN(o.acciones); } else if(of<=f) sh+=_sdN(o.acciones); }); return sh; }
function _sdHeld(){ var m={}; (DB.operaciones||[]).forEach(function(o){ var t=_sdU(o.ticker); m[t]=(m[t]||0)+(o.tipo==='venta'?-1:1)*_sdN(o.acciones); }); return Object.keys(m).filter(function(t){ return m[t]>0.0001; }).sort(); }

function saludDatosChequeos(){
  var hoy=_sdHoy(), Y=+hoy.slice(0,4), ops=_sdOps(), held=_sdHeld(), ign=DB.saludIgnorar||{}, out=[];
  function add(tipo,clave,texto){ if(ign[clave]) return; out.push({tipo:tipo,clave:clave,texto:texto}); }
  var an=DB.divAnotado||{};
  /* 1 · ficha frente a Evolución en lo YA PAGADO (año actual y anterior, empresas en cartera) */
  held.forEach(function(t){ [Y-1,Y].forEach(function(y){
    var a=(typeof evoAnioM==='function')?evoAnioM(t,y):null; if(!a||!a.pagos) return;
    var evo=0; a.pagos.forEach(function(p){ var pg=(''+(p.pago||'')).slice(0,10), ex=(''+(p.exDiv||pg)).slice(0,10); if(!pg||pg>hoy) return;
      var k=an[t+'|'+ex]; if(k&&k.tipo==='descartado') return; if(!(_sdAccDiv(ops,t,ex)>0)) return; evo+=_sdN(p.bruto); });
    var fic=0; (((DB.dividendos||{})[t])||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(f.slice(0,4)===String(y)&&f<=hoy) fic+=_sdN(d.importe); });
    if(!(evo>0)&&!(fic>0)) return;
    var dif=Math.round((fic-evo)*10000)/10000;
    if(Math.abs(dif)>0.005) add('fichaEvo',t+'|'+y+'|'+fic.toFixed(4)+'|'+evo.toFixed(4),
      '<b>'+t+' '+y+'</b>: la ficha tiene cobrados <b>'+fic.toFixed(4)+'</b> €/acc y Evolución dice pagados <b>'+evo.toFixed(4)+'</b> ('+(dif>0?'+':'')+dif.toFixed(4)+'). Corrige el que esté mal: el banco manda.');
  }); });
  /* 2 · cobros pagados sin anotar (la misma regla que el Kanban) */
  held.forEach(function(t){ var dp=(typeof _emDivPend==='function')?_emDivPend(t):null;
    if(dp&&dp.vencido) add('sinAnotar',t+'|'+dp.exDiv,'<b>'+t+'</b>: dividendo de '+dp.brutoAcc.toFixed(4)+' €/acc pagado el '+_sdF(dp.pago)+' y sin anotar. Anótalo en el Kanban o marca «No lo cobré».'); });
  /* 3 y 4 · líneas de la ficha con fecha futura o sin acciones ese día */
  Object.keys(DB.dividendos||{}).forEach(function(t0){ var t=_sdU(t0); (DB.dividendos[t0]||[]).forEach(function(d){ var f=(d.fecha||'').slice(0,10); if(!f) return;
    if(f>hoy) add('futura',t+'|'+f+'|'+d.importe,'<b>'+t+'</b>: línea de ficha del '+_sdF(f)+' ('+d.importe+' €/acc) con fecha futura. No cuenta como cobrada; lo previsto va en Evolución. Bórrala.');
    else if(!(_sdAccDiv(ops,t,f)>0)&&!(typeof divEnCicloCerrado==='function'&&divEnCicloCerrado(t,f))) add('huerfana',t+'|'+f+'|'+d.importe,'<b>'+t+'</b>: línea de ficha del '+_sdF(f)+' ('+d.importe+' €/acc) sin acciones registradas ese día. ¿Falta una compra o sobra la línea?'); }); });
  /* 5 · movimientos duplicados (misma fecha, importe y concepto) */
  var mv={}; (DB.movimientos||[]).forEach(function(m){ var k=m.fecha+'|'+_sdN(m.importe).toFixed(2)+'|'+((m.concepto||'').trim().toLowerCase()); (mv[k]=mv[k]||[]).push(m); });
  Object.keys(mv).forEach(function(k){ if(mv[k].length>1){ var m=mv[k][0]; add('duplicado','mov|'+k,'Movimiento repetido '+mv[k].length+' veces: <b>'+_sdF(m.fecha)+'</b> · '+_sdN(m.importe).toFixed(2)+' € · '+_sdEsc(m.concepto||'')+'. Si es un duplicado, borra el sobrante en Movimientos.'); } });
  /* 6 · netos de Evolución que no son el 19 % del bruto (años actual y anterior) */
  var dd=DB.divData||{}; Object.keys(dd).forEach(function(t){ [Y-1,Y].forEach(function(y){ var a=((dd[t]||{}).anios||{})[String(y)]; if(!a||!a.pagos) return;
    a.pagos.forEach(function(p,i){ var b=_sdN(p.bruto), n=_sdN(p.neto); if(!(b>0)||!(n>0)) return; var auto=Math.round(b*0.81*10000)/10000;
      if(Math.abs(n-auto)>0.0006) add('neto',t+'|'+y+'|'+i+'|'+b+'|'+n,'<b>'+_sdU(t)+' '+y+'</b>: pago de '+b+' € brutos con neto '+n+' (el 19 % daría '+auto+'). Si la retención no fue distinta, corrige el neto en Evolución.'); }); }); });
  return out;
}
var _SD_TIT={fichaEvo:'Ficha y Evolución no cuadran en lo ya pagado',sinAnotar:'Cobros pagados sin anotar',futura:'Líneas de ficha con fecha futura',huerfana:'Líneas de ficha sin acciones ese día',duplicado:'Movimientos posiblemente duplicados',neto:'Netos que no son el 19 % del bruto'};
function renderSaludDatos(){
  var est=document.getElementById('view-estado'); if(!est||typeof DB==='undefined'||!DB) return;
  var host=document.getElementById('saludDatos'); if(!host){ host=document.createElement('div'); host.id='saludDatos'; est.insertBefore(host, est.firstChild); }
  var L=saludDatosChequeos(), g={}; L.forEach(function(x){ (g[x.tipo]=g[x.tipo]||[]).push(x); });
  var nIgn=Object.keys(DB.saludIgnorar||{}).length;
  var h='<div class="card" style="margin:10px 0 16px;border-left:4px solid '+(L.length?'#f59e0b':'#16a34a')+'"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">'
    +'<div><b style="font-size:15px">🩺 Salud de datos</b> <span class="muted" style="font-size:12px">— repaso automático de tu ficha, Evolución del Dividendo y Movimientos</span></div>'
    +'<b style="color:'+(L.length?'#b45309':'#16a34a')+'">'+(L.length?(L.length+' aviso'+(L.length>1?'s':'')):'✓ Todo cuadra')+'</b></div>';
  Object.keys(_SD_TIT).forEach(function(k){ var it=g[k]; if(!it) return;
    h+='<details style="margin-top:10px"'+(it.length<=5?' open':'')+'><summary style="cursor:pointer;font-weight:700;font-size:13px">'+_SD_TIT[k]+' ('+it.length+')</summary><div style="margin-top:6px">';
    it.forEach(function(x){ h+='<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line);font-size:12.5px"><div>'+x.texto+'</div><button class="btn ghost sm" style="white-space:nowrap" data-sdign="'+_sdEsc(x.clave)+'" title="Ya lo he revisado: no volver a avisar">No es un error</button></div>'; });
    h+='</div></details>'; });
  if(nIgn) h+='<div class="muted" style="font-size:11px;margin-top:8px">'+nIgn+' aviso'+(nIgn>1?'s':'')+' marcado'+(nIgn>1?'s':'')+' como revisado'+(nIgn>1?'s':'')+'. <a href="#" data-sdreset="1">Volver a enseñarlos</a></div>';
  h+='</div>';
  host.innerHTML=h;
  if(!host._sdBound){ host._sdBound=1; host.addEventListener('click',function(e){
    var b=e.target.closest('[data-sdign]'); if(b){ DB.saludIgnorar=DB.saludIgnorar||{}; DB.saludIgnorar[b.getAttribute('data-sdign')]=_sdHoy(); if(typeof scheduleSave==='function')scheduleSave(); renderSaludDatos(); return; }
    var r=e.target.closest('[data-sdreset]'); if(r){ e.preventDefault(); if(confirm('¿Volver a enseñar los avisos marcados como «No es un error»?')){ DB.saludIgnorar={}; if(typeof scheduleSave==='function')scheduleSave(); renderSaludDatos(); } } }); }
}
