/* [28-sep-2026] SELECTOR DE AÑO COMÚN — el formato de Retorno › Calendario en todas las pestañas.
   Petición de Carlos: «todas las pestañas que tengan un selector de año podrían tomar un formato como
   el de Calendario». ◀ AÑO ▶ · etiqueta histórico / año en curso / proyectado · barra deslizante · Hoy.

   CÓMO: NO se toca el código de cada pestaña. El <select> (o <input type=number>) original se queda en
   su sitio, OCULTO, y sigue siendo el que manda: esta pieza le cambia el valor y le lanza «change»
   (e «input»), que es lo que cada pestaña ya escuchaba. Si una pestaña reconstruye su selector, un
   observador lo vuelve a vestir; si cambia el valor por su cuenta, el reloj de sincronía lo recoge.
   Las opciones que no son un año («Todos») salen como un botón aparte; la vacía («— año —») no.
   Fuera a propósito: los selectores de RANGO (Radar, Radar dividendos, «desde–hasta» de gráficas). */
(function(){
  var NOW=function(){ return new Date().getFullYear(); };
  /* id → opciones. compacto: sin barra (sitios estrechos). min/max: sólo para <input type=number> */
  var T={
    mYear:{}, presYear:{}, presDesgloseYear:{}, grafYear:{}, atribAnio:{}, dfYear:{}, evoYearSel:{},
    evoYearRange:{},   /* Evolución del Dividendo: su propia barra (min/max del propio control) */
    cumpYear:{compacto:true}, dgYearM:{compacto:true},
    proxYear:{min:function(){return NOW();}, max:function(){return 2039;}},
    infcAnio:{min:function(){return 2011;}, max:function(){return NOW();}}
  };
  var css=document.createElement('style');
  css.textContent='.kh-yn-hid{display:none!important}'
   +'.kh-yn{display:inline-flex;gap:10px;align-items:center;flex-wrap:wrap;vertical-align:middle}'
   +'.kh-yn-a{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line,#e2e8f0);border-radius:12px;padding:5px 9px}'
   +'.kh-yn-n{font-size:20px;font-weight:800;min-width:66px;text-align:center;color:inherit}'
   +'.kh-yn.c .kh-yn-n{font-size:16px;min-width:50px}'
   +'.kh-yn-b{display:flex;align-items:center;gap:8px;flex:1;min-width:220px;background:#fff;border:1px solid var(--line,#e2e8f0);border-radius:12px;padding:5px 11px}'
   +'.kh-yn-b input{flex:1;accent-color:var(--brand,#2563eb);cursor:pointer}'
   +'.kh-yn-t{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}'
   +'.kh-yn-x.on{background:var(--brand,#2563eb);color:#fff}'
   /* Evolución del Dividendo traía su propia barra: la sustituye ésta */
   +'div:has(> span > #evoYearLbl) > span:first-child, div:has(> span > #evoYearLbl) > span.muted{display:none!important}';
  document.head.appendChild(css);

  function tag(y){ var n=NOW();
    return y<n ? '<span class="kh-yn-t" style="background:#dcfce7;color:#166534">histórico</span>'
         : y===n ? '<span class="kh-yn-t" style="background:#fef9c3;color:#92400e">año en curso</span>'
         : '<span class="kh-yn-t" style="background:#ede9fe;color:#5b21b6">proyectado</span>'; }
  function anios(el){
    if(el.tagName==='SELECT'){ var a=[]; for(var i=0;i<el.options.length;i++){ var v=el.options[i].value; if(/^\d{4}$/.test(v)) a.push(+v); }
      return a.filter(function(v,i){return a.indexOf(v)===i;}).sort(function(x,y){return x-y;}); }
    var c=T[el.id]||{}, lo=c.min?c.min():(el.min!==''?+el.min:NOW()-10), hi=c.max?c.max():(el.max!==''?+el.max:NOW()+10), r=[]; for(var y=lo;y<=hi;y++) r.push(y); return r; }
  function extras(el){ var r=[]; if(el.tagName!=='SELECT') return r;
    for(var i=0;i<el.options.length;i++){ var o=el.options[i]; if(o.value!=='' && !/^\d{4}$/.test(o.value)) r.push({v:o.value,t:o.text.replace(/[—-]/g,'').trim()||'Todos'}); } return r; }
  function actual(el){ var v=String(el.value||''); return /^\d{4}$/.test(v)?+v:null; }
  function poner(el,y){ el.value=String(y);
    if(el.tagName==='SELECT' && el.value!==String(y)) return;
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }

  function pintar(el){
    var nav=el._khYn; if(!nav) return;
    var ys=anios(el), y=actual(el), ex=extras(el), c=T[el.id]||{}, n=NOW();
    var firma=ys.join(',')+'|'+y+'|'+(el.value||'')+'|'+ex.map(function(e){return e.v;}).join(',');
    if(nav._firma===firma) return; nav._firma=firma;
    if(!ys.length){ nav.innerHTML=''; return; }
    var lo=ys[0], hi=ys[ys.length-1], yv=(y==null?Math.min(Math.max(n,lo),hi):y), i=ys.indexOf(yv);
    var h='<div class="kh-yn-a">'
      +'<button type="button" class="btn sm" data-khyn="-1"'+(y!=null&&i<=0?' disabled':'')+' style="font-weight:700" title="Año anterior">◀</button>'
      +'<span class="kh-yn-n">'+(y==null?'—':y)+'</span>'
      +'<button type="button" class="btn sm" data-khyn="1"'+(y!=null&&i>=ys.length-1?' disabled':'')+' style="font-weight:700" title="Año siguiente">▶</button>'
      +(y==null?'':tag(y))+'</div>';
    if(!c.compacto && ys.length>1)
      h+='<div class="kh-yn-b"><span class="muted" style="font-size:11px">'+lo+'</span>'
        +'<input type="range" min="'+lo+'" max="'+hi+'" step="1" value="'+yv+'" data-khynr="1" title="Desliza para cambiar de año">'
        +'<span class="muted" style="font-size:11px">'+hi+'</span>'
        +(ys.indexOf(n)>=0?'<button type="button" class="btn sm" data-khynhoy="1" title="Ir al año en curso ('+n+')" style="font-weight:700">Hoy</button>':'')
        +'</div>';
    else if(ys.indexOf(n)>=0) h+='<button type="button" class="btn sm" data-khynhoy="1" title="Ir al año en curso ('+n+')" style="font-weight:700">Hoy</button>';
    ex.forEach(function(e){ h+='<button type="button" class="btn sm kh-yn-x'+(String(el.value)===e.v?' on':'')+'" data-khynx="'+e.v.replace(/"/g,'&quot;')+'">'+e.t+'</button>'; });
    nav.innerHTML=h;
  }
  function vestir(el){
    if(el._khYn && el._khYn.isConnected) return;
    var c=T[el.id]||{}, nav=document.createElement('span'); nav.className='kh-yn'+(c.compacto?' c':''); nav.setAttribute('data-khyn-de',el.id);
    el._khYn=nav; el.classList.add('kh-yn-hid'); el.insertAdjacentElement('afterend',nav);
    nav.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b||b.disabled) return; e.stopPropagation();
      var ys=anios(el), y=actual(el);
      if(b.hasAttribute('data-khyn')){ var d=+b.getAttribute('data-khyn'), i=ys.indexOf(y);
        var ny = y==null ? Math.min(Math.max(NOW(),ys[0]),ys[ys.length-1]) : ys[Math.min(Math.max(i+d,0),ys.length-1)]; if(ny!==y) poner(el,ny); }
      else if(b.hasAttribute('data-khynhoy')) poner(el,NOW());
      else if(b.hasAttribute('data-khynx')){ el.value=b.getAttribute('data-khynx'); el.dispatchEvent(new Event('change',{bubbles:true})); }
      pintar(el); });
    nav.addEventListener('input',function(e){ if(!e.target.hasAttribute('data-khynr')) return; e.stopPropagation();
      var n=nav.querySelector('.kh-yn-n'); if(n) n.textContent=e.target.value; });
    nav.addEventListener('change',function(e){ if(!e.target.hasAttribute('data-khynr')) return; e.stopPropagation();
      var v=+e.target.value, ys=anios(el), best=ys[0]; ys.forEach(function(y){ if(Math.abs(y-v)<Math.abs(best-v)) best=y; });
      poner(el,best); pintar(el); });
    el.addEventListener('change',function(){ pintar(el); });
    pintar(el);
  }
  function barrer(){ for(var id in T){ var el=document.getElementById(id); if(el){ vestir(el); pintar(el); } } }
  var pend=false;
  new MutationObserver(function(){ if(pend) return; pend=true; requestAnimationFrame(function(){ pend=false; barrer(); }); })
    .observe(document.documentElement,{childList:true,subtree:true});
  setInterval(barrer,800);   /* valores cambiados por código sin evento (p. ej. presDesgloseYear) */
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',barrer); else barrer();
  window.khSelectorAnio={barrer:barrer, objetivos:T};
})();
