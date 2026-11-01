/* APP NUEVA · Sistema › Mis Decisiones (1-nov-2026, boceto aprobado por Carlos: «me vale así»).
   - 4 cifras: empresas con decisión vigente · supuestos rotos sin revisar · decisiones de los últimos 30 días · aciertos
     (solo cuando hay decisiones cerradas).
   - Los supuestos rotos y las revisadas siguen igual (con sus botones), arriba.
   - El listado pasa a una línea por empresa (la decisión más reciente, precio entonces → hoy, el porqué resumido y cuántas
     hay); al pulsarla se despliega su historial con las tarjetas de siempre (cerrar, reabrir, borrar…).
   - Buscador por empresa o texto, además de los filtros de siempre. */
(function(){
  if(typeof renderDiario!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function fd(f){ return f?String(f).slice(8,10)+'/'+String(f).slice(5,7)+'/'+String(f).slice(2,4):'—'; }
  function eur(x){ return (x==null||!isFinite(x)||!x)?'—':x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
  function precioHoy(t){ var p=(typeof _precioActualDe==='function')?N(_precioActualDe(t)):0; return p||N(((DB.valores||{})[t]||{}).precioActual)||null; }
  function nombre(t){ return String((((DB.valores||{})[t]||{}).nombre)||(((DB.analisis||[]).filter(function(a){ return String(a.ticker||'').toUpperCase()===t; })[0]||{}).nombre)||'').replace(/,? (S\.?A\.?|Sociedad An[oó]nima)\b.*$/i,''); }
  function resumen(t){ t=String(t||'').replace(/\s*\(método v3\)\s*$/,''); var m=/^[^.]*\.[^.]*\./.exec(t); return (m?m[0]:t).slice(0,190); }
  window._nDiAb=window._nDiAb||{}; window._nDiQ=window._nDiQ||'';
  function pinta(){ var sec=document.getElementById('view-diario'); if(!sec) return;
    var arr=(DB.diario||[]).slice().sort(function(a,b){ return String(b.fecha||'').localeCompare(String(a.fecha||'')); });
    var F=window._diFilt||{}, q=String(window._nDiQ||'').toLowerCase();
    /* --- cifras --- */
    var st=sec.querySelector('.di-stats');
    if(st&&typeof nKpi==='function'){ var hoy=new Date(), d30=new Date(hoy.getTime()-30*864e5).toISOString().slice(0,10);
      var vig={}; arr.forEach(function(e){ if((e.estado||'abierta')==='abierta'&&e.ticker) vig[String(e.ticker).toUpperCase()]=1; });
      var INV=(typeof diarioInvalidaciones==='function')?diarioInvalidaciones():{pendientes:[]}, rot=INV.pendientes||[], rotT=[]; rot.forEach(function(x){ var t=String((x.e||x.dec||x).ticker||x.t||'').toUpperCase(); if(t&&rotT.indexOf(t)<0) rotT.push(t); });
      var cer=arr.filter(function(e){ return e.estado==='cerrada'; }), ac=cer.filter(function(e){ return typeof _diVer==='function'&&_diVer(e).acierto===true; }).length;
      var n30=arr.filter(function(e){ return String(e.fecha||'')>=d30; }).length;
      var k=document.createElement('div'); k.className='n-ctrl n-di-k';
      k.innerHTML=nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'🏢',t:'Empresas con decisión',v:String(Object.keys(vig).length),s:'vigente · '+arr.length+' decisiones en total'})+
        nKpi({c:rot.length?'#DC2626':'#16A34A',bg:rot.length?'#FEE2E2':'#DCFCE7',ic:'⚠️',t:'Supuestos rotos',v:String(rot.length),vCls:rot.length?'n-neg':'n-pos',s:rot.length?('sin revisar'+(rotT.length?': '+rotT.join(', '):'')):'ninguno sin revisar'})+
        nKpi({c:'#D97706',bg:'#FEF3C7',ic:'🗓️',t:'Últimos 30 días',v:String(n30),s:'decisiones anotadas'})+
        nKpi({c:'#15803D',bg:'#DCFCE7',ic:'🎯',t:'Aciertos',v:cer.length?Math.round(ac/cer.length*100)+' %':'—',s:cer.length?(ac+' de '+cer.length+' cerradas'):'se verá cuando cierres decisiones'});
      st.replaceWith(k); }
    /* --- buscador junto a los filtros --- */
    var bar=sec.querySelector('.di-bar'); if(bar&&!bar.querySelector('#nDiQ')){ var i=document.createElement('input'); i.id='nDiQ'; i.placeholder='Buscar empresa o texto…'; i.value=window._nDiQ; i.className='n-di-q';
      i.addEventListener('input',function(){ window._nDiQ=i.value; lista(); }); var nb=bar.querySelector('#diNewBtn'); if(nb) nb.after(i); else bar.prepend(i); }
    lista();
    function lista(){ var blk=sec.querySelector('.pos-blk[data-diblk="lista"]'); if(!blk) return; blk.classList.add('open');
      var pad=blk.querySelector('.blk-pad'); if(!pad) return; var nota=pad.querySelector('.muted:last-child'); var notaH=nota?nota.outerHTML:'';
      var q=String(window._nDiQ||'').toLowerCase();
      var vis=arr.filter(function(e){ if(F.tipo&&e.tipo!==F.tipo) return false; if(F.estado&&(e.estado||'abierta')!==F.estado) return false; return true; });
      var G={}; vis.forEach(function(e){ var t=String(e.ticker||'—').toUpperCase(); (G[t]=G[t]||[]).push(e); });
      var L=Object.keys(G).filter(function(t){ if(!q) return true; return (t+' '+nombre(t)+' '+G[t].map(function(e){ return (e.porque||'')+' '+(e.invalidacion||''); }).join(' ')).toLowerCase().indexOf(q)>=0; })
        .sort(function(a,b){ return String(G[b][0].fecha||'').localeCompare(String(G[a][0].fecha||'')); });
      var bs=blk.querySelector('.bsum'); if(bs) bs.textContent=L.length+' empresas · '+vis.length+' decisiones';
      var bt=blk.querySelector('.bt'); if(bt) bt.textContent='📋 Decisiones por empresa';
      var h='<div class="n-di-head"><span>Empresa</span><span>Última</span><span>Fecha</span><span>Precio entonces → hoy</span><span>Por qué (resumen)</span><span>Nº</span></div>';
      h+=L.map(function(t){ var a=G[t], e=a[0], cfg=({Reafirmar:{bg:'#DCFCE7',col:'#166534'},Mantener:{bg:'#E0E7FF',col:'#3730A3'},Recortar:{bg:'#FEF3C7',col:'#92400E'},Comprar:{bg:'#DBEAFE',col:'#1E40AF'},Ampliar:{bg:'#DBEAFE',col:'#1E40AF'},Vender:{bg:'#FEE2E2',col:'#991B1B'},Descartar:{bg:'#F1F5F9',col:'#475569'}})[e.tipo]||{}, p0=N(e.precio), p1=precioHoy(t), ch=(p0&&p1)?(p1/p0-1)*100:null, ab=!!window._nDiAb[t];
        var r='<div class="n-di-row'+(ab?' ab':'')+'" data-ndit="'+E(t)+'"><div class="e"><b>'+E(t)+'</b> '+E(nombre(t))+'</div><div><span class="n-di-pill" style="background:'+(cfg.bg||'#E0E7FF')+';color:'+(cfg.col||'#3730A3')+'">'+E(e.tipo||'—')+'</span>'+(e.estado&&e.estado!=='abierta'?' <small>'+E(e.estado)+'</small>':'')+'</div>'+
          '<div>'+fd(e.fecha)+'</div><div class="pr">'+eur(p0)+' → '+eur(p1)+(ch!=null?'<small class="'+(ch>=0?'up':'dn')+'">'+(ch>=0?'+':'')+ch.toFixed(1).replace('.',',')+' % desde entonces</small>':'')+'</div>'+
          '<div class="q" title="'+E(e.porque||'')+'">'+E(resumen(e.porque))+'</div><div class="n">'+a.length+' '+(ab?'▾':'▸')+'</div></div>';
        if(ab) r+='<div class="n-di-hist">'+a.map(function(x){ try{ return _diCard(x); }catch(err){ return ''; } }).join('')+'</div>';
        return r; }).join('')||'<div class="di-empty">Ninguna decisión con este filtro.</div>';
      pad.innerHTML=h+notaH; }
  }
  var o=renderDiario; renderDiario=function(){ var r=o.apply(this,arguments); try{ pinta(); }catch(e){ console.warn('[n-decisiones]',e); } return r; };
  document.addEventListener('click',function(e){ var r=e.target.closest&&e.target.closest('.n-di-row'); if(!r||e.target.closest('button,a,input,select')) return; var t=r.getAttribute('data-ndit'); window._nDiAb[t]=!window._nDiAb[t]; try{ pinta(); }catch(err){} });
  var s=document.createElement('style'); s.textContent=
    '#view-diario .n-di-k{margin:0 0 14px}.n-di-q{padding:7px 10px;border:1px solid #CBD5E1;border-radius:9px;font:inherit;font-size:13px;min-width:220px;margin:0 6px}'+
    '.n-di-head,.n-di-row{display:grid;grid-template-columns:170px 120px 80px 160px 1fr 50px;gap:10px;align-items:center}'+
    '.n-di-head{padding:6px;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:700;border-bottom:1px solid #E2E8F0}.n-di-head span:last-child,.n-di-row .n{text-align:right}'+
    '.n-di-row{padding:9px 6px;border-bottom:1px solid #F1F5F9;cursor:pointer;font-size:13px}.n-di-row:hover,.n-di-row.ab{background:#F8FAFC}.n-di-row .e b{color:#1F4A9A}.n-di-row .q{font-size:12.5px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.n-di-row .n{color:#64748B;font-size:12px}'+
    '.n-di-row .pr small{display:block;font-size:11.5px}.n-di-row .up{color:#15803D}.n-di-row .dn{color:#DC2626}.n-di-row small{color:#64748B}'+
    '.n-di-pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700}'+
    '.n-di-hist{background:#F8FAFC;border-radius:10px;margin:2px 0 10px;padding:6px 10px}'+
    '@media(max-width:800px){.n-di-head{display:none}.n-di-row{grid-template-columns:1fr 1fr}.n-di-row .q{grid-column:1/-1;white-space:normal}}';
  document.head.appendChild(s);
})();
