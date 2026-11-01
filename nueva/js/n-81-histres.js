/* APP NUEVA · Cobertura · HISTÓRICO DE RESULTADOS DE UNA EMPRESA (1-nov-2026, Carlos: «para ver el avance está bien,
   pero debería poder ofrecer el histórico de una empresa. Pongo Prim y me da los resultados relativos a Prim»).
   Debajo del «Calendario de resultados del universo», un buscador. Al elegir una empresa sale una tabla por ejercicio
   (1T · 1S · 3T · Anual) con el día en que publicó cada temporada, sacado de la Biblioteca CNMV
   (recogida/historico-resultados.json, lo sube la recogida diaria), y la temporada en curso según el calendario. */
(function(){
  if(typeof window.renderCobertura!=='function') return;
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var H=null, C=null, T0=0, sel=window._nHrSel||'';
  function uno(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
  function cargar(){ if(H&&Date.now()-T0<10*60*1000) return Promise.resolve();
    return Promise.all([uno('recogida/historico-resultados.json'),uno('recogida/calendario.json')]).then(function(a){ H=a[0]; C=a[1]; T0=Date.now(); }); }
  function nombre(t){ return (((DB.valores||{})[t]||{}).nombre||'').replace(/,? (S\.?A\.?|Sociedad An[oó]nima)\b.*$/i,''); }
  function lista(){ var s={}; Object.keys((H&&H.empresas)||{}).forEach(function(t){ s[t]=1; }); Object.keys((C&&C.empresas)||{}).forEach(function(t){ s[t]=1; });
    return Object.keys(s).sort().map(function(t){ return {t:t,n:nombre(t)}; }); }
  function buscar(q){ q=String(q||'').trim(); if(!q) return ''; var Q=q.toUpperCase(), L=lista();
    var ex=L.filter(function(x){ return x.t===Q; })[0]; if(ex) return ex.t;
    var m=L.filter(function(x){ return (x.t+' '+x.n).toUpperCase().indexOf(Q)>=0; }); return m.length?m[0].t:''; }
  var D=['dom','lun','mar','mié','jue','vie','sáb'], P=['1T','1S','3T','Anual'];
  function celda(f,k,extra){ if(!f) return '<td class="mu">—</td>'; var d=new Date(f+'T12:00:00');
    return '<td><b>'+f.slice(8,10)+'/'+f.slice(5,7)+'</b>'+(f.slice(0,4)!==extra?'<span class="y">/'+f.slice(2,4)+'</span>':'')+' <span class="w">'+D[d.getDay()]+'</span>'+(k==='Nota'?' <span class="k" title="nota o presentación de la empresa (sin IPP a la CNMV en esa fecha)">nota</span>':'')+'</td>'; }
  function tabla(t){
    var F=((H&&H.empresas)||{})[t]||[], by={}; F.forEach(function(r){ var p=r[0].split(' '); (by[p[0]]=by[p[0]]||{})[p[1]]={f:r[1],k:r[2]}; });
    var cal=((C&&C.empresas)||{})[t]||{}, enCurso={}; Object.keys(cal).forEach(function(tt){ var e=cal[tt]; if(!e) return; var p=tt.split(' '); enCurso[tt]=e;
      if(e.estado==='publicado'&&e.publicado){ (by[p[0]]=by[p[0]]||{}); if(!by[p[0]][p[1]]) by[p[0]][p[1]]={f:e.publicado,k:'',cur:1}; } });
    var anios=Object.keys(by).sort().reverse();
    var h='<div class="n-hr-tit"><b>'+E(t)+'</b> '+E(nombre(t))+' <span class="mu">· '+F.length+' temporadas en la Biblioteca CNMV'+(F.length?' desde '+F[0][0]:'')+'</span></div>';
    /* temporada en curso */
    var cur=Object.keys(enCurso).filter(function(tt){ return enCurso[tt].estado!=='publicado'&&enCurso[tt].fecha; });
    cur.forEach(function(tt){ var e=enCurso[tt], conf=(e.fuente==='aviso'||e.fuente==='yahoo'), d=new Date(e.fecha+'T12:00:00');
      h+='<div class="n-hr-cur">⏳ <b>'+E(tt)+'</b>: previsto el <b>'+D[d.getDay()]+' '+e.fecha.slice(8,10)+'/'+e.fecha.slice(5,7)+'</b> <span class="sv3-src '+(conf?'conf':'est')+'">'+(conf?'confirmada':'estimada')+'</span>'+(e.momento?' · '+E(e.momento):'')+(e.fuente==='anio_ant'&&e.base?' <span class="mu">(el año pasado publicó el '+e.base.slice(8,10)+'/'+e.base.slice(5,7)+')</span>':'')+(e.fecha<new Date().toISOString().slice(0,10)?' · <b style="color:#B45309">ya pasó y aún no está en la Biblioteca</b>':'')+'</div>'; });
    if(!anios.length) return h+'<div class="mu" style="padding:8px 0">No hay resultados de esta empresa en la Biblioteca CNMV.</div>';
    h+='<div class="n-hr-wrap"><table class="n-hr"><thead><tr><th class="l">Ejercicio</th><th>1T</th><th>1S</th><th>3T</th><th>Anual <span class="mu">(se publica al año siguiente)</span></th></tr></thead><tbody>';
    anios.forEach(function(y){ var r=by[y]; h+='<tr><td class="l"><b>'+y+'</b></td>'+P.map(function(p){ var x=r[p];
      if(!x){ var e=enCurso[y+' '+p]; if(e&&e.estado!=='publicado'&&e.fecha) return '<td class="pend">previsto '+e.fecha.slice(8,10)+'/'+e.fecha.slice(5,7)+'</td>'; return '<td class="mu">—</td>'; }
      return celda(x.f,x.k,p==='Anual'?String(+y+1):y); }).join('')+'</tr>'; });
    return h+'</tbody></table></div><div class="n-hr-nota">Fecha = primer informe de resultados o IPP de esa temporada guardado en tu Biblioteca CNMV. «—» = no publicó (o no está en la Biblioteca). Desde 2021 el 1T y el 3T ya no son obligatorios: muchas solo sacan nota. Las temporadas son de calendario, como el calendario del universo: en empresas con ejercicio partido (Logista cierra en septiembre) no coinciden con su trimestre.</div>'; }
  function pinta(box){ var L=lista();
    box.innerHTML='<div class="sv3-h3">🔎 Histórico de resultados de una empresa</div>'+
      '<div class="n-hr-bar"><input id="nHrQ" list="nHrL" placeholder="Escribe la empresa o el ticker (p. ej. Prim)" value="'+E(sel)+'"><datalist id="nHrL">'+L.map(function(x){ return '<option value="'+E(x.t)+'">'+E(x.n)+'</option>'; }).join('')+'</datalist>'+
      (H?'':' <span class="mu">El histórico llega con la próxima recogida (laborables 09:30 y 20:00).</span>')+'</div><div id="nHrOut"></div>';
    var q=box.querySelector('#nHrQ'), out=box.querySelector('#nHrOut');
    function ir(){ var t=buscar(q.value); sel=window._nHrSel=t||q.value; out.innerHTML=t?tabla(t):(q.value.trim()?'<div class="mu" style="padding:6px 0">No encuentro «'+E(q.value)+'».</div>':''); }
    q.addEventListener('change',ir); q.addEventListener('keydown',function(e){ if(e.key==='Enter') ir(); });
    if(sel) ir(); }
  var o=window.renderCobertura;
  window.renderCobertura=function(){ var r=o.apply(this,arguments);
    cargar().then(function(){ var n=0, iv=setInterval(function(){ n++; var host=document.getElementById('sv3cob'); if(!host){ if(n>40) clearInterval(iv); return; }
      var nov=[].filter.call(host.querySelectorAll('.sv3-h3'),function(x){ return /Novedades/.test(x.textContent); })[0];
      if(!nov&&n<40) return; clearInterval(iv); if(document.getElementById('nHrBox')) return;
      var box=document.createElement('div'); box.id='nHrBox'; if(nov) host.insertBefore(box,nov); else host.appendChild(box); pinta(box); },150); });
    return r; };
  var st=document.createElement('style'); st.textContent=
    '.n-hr-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 8px}#nHrQ{flex:0 1 360px;padding:7px 10px;border:1px solid #CBD5E1;border-radius:10px;font:inherit;font-size:13.5px}'+
    '.n-hr-tit{margin:6px 0 4px;font-size:14px}.n-hr-tit .mu,.n-hr .mu,.n-hr-bar .mu{color:#94A3B8;font-weight:400;font-size:12px}'+
    '.n-hr-cur{background:#FEF9C3;border-radius:8px;padding:6px 10px;margin:4px 0 8px;font-size:12.5px}'+
    '.n-hr-wrap{background:#fff;border:1px solid #E2E8F0;border-radius:12px;overflow:auto;max-height:520px}table.n-hr{width:100%;border-collapse:collapse;font-size:13px}'+
    'table.n-hr th{position:sticky;top:0;background:#F8FAFC;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#64748B;text-align:left;padding:8px 10px;border-bottom:1px solid #E2E8F0}'+
    'table.n-hr td{padding:6px 10px;border-bottom:1px solid #F1F5F9;white-space:nowrap;font-variant-numeric:tabular-nums}table.n-hr td.mu{color:#CBD5E1}table.n-hr td.pend{color:#B45309;font-weight:600}'+
    'table.n-hr .w{color:#64748B;font-size:11.5px}table.n-hr .y{color:#94A3B8;font-size:11px}table.n-hr .k{background:#EDE9FE;color:#5B21B6;border-radius:6px;padding:0 5px;font-size:10.5px;font-weight:700}'+
    '.n-hr-nota{font-size:11px;color:#64748B;margin:6px 0 4px;line-height:1.45}';
  document.head.appendChild(st);
})();
