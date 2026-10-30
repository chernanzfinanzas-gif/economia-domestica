/* APP NUEVA · EMPRESAS → ANALIZADAS (boceto «Analizadas - boceto 30-oct v2», Carlos: «más completo que antes me parece»).
   Solo las 35 del método, sin edición a mano y con UN criterio de zona: la banda del método (la misma regla de la ficha).
   Arriba, contadores por zona; «Hoy merece mirar», tarjetas de las que están en zona; debajo, todas, por cercanía a la entrada.
   Datos: fichas/_resumen.json (lo deja exportar_ficha.py) + precio de hoy de la app. Pinchar → Ficha de empresa. */
(function(){
  var R=null, filtro='';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function n(v,d){ if(v==null||!isFinite(+v)) return '—'; return (+v).toLocaleString('es-ES',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d,useGrouping:'always'}); }
  function cot(t){ try{ var c=(typeof _mcCot==='function')?+_mcCot(t):0; if(c>0) return c; }catch(e){} var v=(DB.valores||{})[t]; return v&&+v.precioActual>0?+v.precioActual:0; }
  /* niveles del análisis expresados en acciones de hoy (ampliaciones liberadas, contrasplits…) */
  window.nfRebase=function(t,v,fecha){ if(v==null||!isFinite(+v)) return v; try{ if(typeof khEvFactor==='function'&&fecha){ var f=khEvFactor(t,String(fecha).slice(0,10)); if(f>0&&Math.abs(f-1)>1e-9) return +v/f; } }catch(e){} return +v; };
  function cargar(){ if(R) return Promise.resolve(R);
    var ev=(typeof khEvCargar==='function')?khEvCargar().catch(function(){}):Promise.resolve();
    return Promise.all([fetch('fichas/_resumen.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }),ev]).then(function(a){ R=a[0]; return R; }); }
  function zona(x){ var p=x.pr, st=x.stop, em=x.entrada_min, eM=x.entrada_max;
    if(st&&p<=st) return [0,'Por debajo del stop','#B91C1C'];
    if(em&&p<em) return [1,'Más barata que la banda','#15803D'];
    if(eM&&p<=eM) return [2,'Dentro de la banda','#16A34A'];
    var d=(p/eM-1)*100; if(d<10) return [3,'Cerca: a un '+n(d,1)+' % de la entrada','#B45309'];
    if(d<30) return [4,'Lejos: a un '+n(d,0)+' %','#94A3B8']; return [5,'Muy lejos: a un '+n(d,0)+' %','#CBD5E1']; }
  var DC={COMPRAR:['#15803D','#DCFCE7'],ESPERAR:['#B45309','#FEF3C7'],MANTENER:['#1F4A9A','#EAF1FD'],VENDER:['#B91C1C','#FEE2E2'],REDUCIR:['#B91C1C','#FEE2E2']}, SC={V:'#16A34A',A:'#F59E0B',R:'#DC2626'};
  function dec(d){ var c=DC[d]||['#475569','#F1F5F9']; return '<span class="na-dc" style="color:'+c[0]+';background:'+c[1]+'">'+esc(d||'—')+'</span>'; }
  function regla(x,mini){ return window.nRegla?window.nRegla({precio:x.pr,stop:x.stop,entMin:x.entrada_min,entMax:x.entrada_max,poBase:x.po_base},{peq:1,mini:mini}):''; }
  function pintar(){
    var v=document.getElementById('view-analizadas'); if(!v) return;
    if(!R){ v.innerHTML='<div class="nf-mu" style="padding:20px">Cargando las analizadas…</div>'; cargar().then(function(){ if(R) pintar(); else v.innerHTML='<div class="nf-card">El resumen de las analizadas (fichas/_resumen.json) todavía no está publicado.</div>'; }); return; }
    var fe=String(R.generado||'').slice(0,10);
    var L=(R.empresas||[]).map(function(e){ var x=Object.assign({},e), t=x.ticker;
      ['po_bear','po_base','po_bull','entrada_min','entrada_max','stop','precio_analisis'].forEach(function(k){ x[k]=window.nfRebase(t,x[k],x.fecha_niveles||fe); });
      x.pr=cot(t)||x.precio_analisis; x.tengo=window.nTiene?window.nTiene(t):false; x.z=zona(x); x.d=x.entrada_max?(x.pr/x.entrada_max-1)*100:999; return x; }).filter(function(x){ return x.pr&&x.entrada_max; });
    L.sort(function(a,b){ return a.d-b.d; });
    var cnt=[0,0,0,0,0,0]; L.forEach(function(x){ cnt[x.z[0]]++; });
    var top=L.filter(function(x){ return x.z[0]<=3; }).sort(function(a,b){ return (a.z[0]-b.z[0])||(a.d-b.d); });
    var cards=top.map(function(x){ return '<div class="na-ac" data-nfopen="'+x.ticker+'" style="border-top-color:'+x.z[2]+'"><div class="na-ach"><span class="na-tk">'+x.ticker+'</span><div><b>'+esc(x.empresa)+'</b><small>'+esc(x.modelo||'')+'</small></div>'+dec(x.decision)+'</div>'+
      '<div class="na-acz" style="color:'+x.z[2]+'">'+x.z[1]+'</div>'+regla(x)+
      '<div class="na-acn"><span>Precio <b>'+n(x.pr)+' €</b></span><span>Entrada <b>'+n(x.entrada_min)+'–'+n(x.entrada_max)+'</b></span><span>PO <b>'+n(x.po_base)+'</b></span></div>'+
      '<div class="na-act">'+esc(x.frase||'')+'</div>'+
      '<div class="na-acf"><span class="na-ch">Calidad <b>'+esc(x.rating||'—')+'</b></span><span class="na-ch">Dividendo <b>'+(x.dss!=null?x.dss:'—')+'</b></span><span class="na-ch"><i style="background:'+(SC[x.semaforo]||'#CBD5E1')+'"></i>'+esc(x.ultimo_periodo||'')+'</span>'+(x.tengo?'<span class="na-ch na-own">en cartera</span>':'')+'</div></div>'; }).join('');
    var rows=L.filter(function(x){ return !filtro||(filtro==='cartera'?x.tengo:x.decision===filtro); }).map(function(x){
      return '<tr data-nfopen="'+x.ticker+'"><td class="l"><b>'+x.ticker+'</b> '+esc(x.empresa)+(x.tengo?' <span class="na-ch na-own">en cartera</span>':'')+'</td><td>'+dec(x.decision)+'</td><td>'+n(x.pr)+'</td><td style="color:'+x.z[2]+';font-weight:700">'+(x.d>0?'+'+n(x.d,1)+' %':x.z[1].split(':')[0])+'</td><td class="na-rg">'+regla(x,1)+'</td><td>'+n(x.po_base)+'</td><td>'+esc(x.rating||'—')+'</td><td>'+(x.dss!=null?x.dss:'—')+'</td><td><i class="na-sd" style="background:'+(SC[x.semaforo]||'#CBD5E1')+'"></i>'+esc(x.ultimo_periodo||'')+'</td></tr>'; }).join('');
    var F=[['','Todas'],['cartera','En cartera'],['COMPRAR','COMPRAR'],['MANTENER','MANTENER'],['ESPERAR','ESPERAR']];
    v.innerHTML='<div class="na-hero"><h1>Analizadas</h1><p>Las '+L.length+' empresas con análisis completo del método. ¿Cuáles piden mirar hoy?</p>'+
      '<div class="na-kp"><div>Bajo el stop<b>'+cnt[0]+'</b></div><div>Más baratas que la banda<b>'+cnt[1]+'</b></div><div>Dentro de la banda<b>'+cnt[2]+'</b></div><div>Cerca (&lt;10 %)<b>'+cnt[3]+'</b></div><div>Lejos (10-30 %)<b>'+cnt[4]+'</b></div><div>Muy lejos (&gt;30 %)<b>'+cnt[5]+'</b></div></div></div>'+
      '<h2 class="na-h2">Hoy merece mirar ('+top.length+')</h2><div class="na-acs">'+(cards||'<div class="nf-mu">Ninguna está hoy en zona.</div>')+'</div>'+
      '<div class="nf-card"><h2>Todas las analizadas ('+L.length+') <span class="nf-sub">ordenadas por lo cerca que está el precio de la entrada</span></h2><div class="na-flt">'+F.map(function(f){ return '<span data-naf="'+f[0]+'" class="'+(filtro===f[0]?'on':'')+'">'+f[1]+'</span>'; }).join('')+'</div>'+
      '<div class="nf-tw"><table class="na-t"><tr><th class="l">Empresa</th><th>Decisión</th><th>Precio</th><th>A la entrada máx.</th><th>Dónde está el precio</th><th>PO base</th><th>Calidad</th><th>Dividendo</th><th>Último resultado</th></tr>'+rows+'</table></div>'+
      '<span class="nf-ws">La regla de cada fila es la misma de la ficha. «Dividendo» = nota de seguridad del dividendo (0-100). Análisis del método del '+esc(fe)+'.</span></div>';
  }
  document.addEventListener('click',function(e){
    var o=e.target.closest&&e.target.closest('[data-nfopen]'); if(o&&window.nfAbrir){ window.nfAbrir(o.getAttribute('data-nfopen')); return; }
    var f=e.target.closest&&e.target.closest('[data-naf]'); if(f){ filtro=f.getAttribute('data-naf'); pintar(); }
  });
  function enganchar(){ if(typeof activarVista!=='function'||activarVista._na) return; var oa=activarVista; activarVista=function(v){ var r=oa.apply(this,arguments); if(v==='analizadas') pintar(); return r; }; activarVista._na=1;
    /* fuera de la ficha nueva, «abrir ficha» de una analizada lleva a la Ficha de empresa nueva */
    if(typeof abrirFicha==='function'&&!abrirFicha._nf){ var ob=abrirFicha; abrirFicha=function(t){ var T=String(t||'').toUpperCase(); if(R&&(R.empresas||[]).some(function(x){ return x.ticker===T; })&&window.nfAbrir){ window.nfAbrir(T); return; } return ob.apply(this,arguments); }; abrirFicha._nf=1; }
    cargar(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enganchar); else setTimeout(enganchar,0);
})();
