/* APP NUEVA · Sistema › Estado del método (1-nov-2026, propuesta aceptada: «tres apartados en botones»).
   Las piezas de siempre no cambian; se reparten en tres botones y solo se ve uno cada vez:
     🩺 Salud de datos  → avisos de datos (ficha, Evolución, Movimientos) + Salud del sistema
     📊 Marcador del método → cifras de la calibración, marcador por horizonte, decisiones evaluadas, evaluaciones
                              cerradas, qué corregir, de qué está hecho el PO, método viejo contra el nuevo, el espejo
     🧪 Backtest        → el backtest de siempre
   Los bloques que aún no tienen datos («sin datos todavía») se quedan en gris y plegados. */
(function(){
  window._nEstTab=window._nEstTab||null;
  var TABS=[['salud','🩺 Salud de datos'],['marc','📊 Marcador del método'],['bt','🧪 Backtest']];
  function avisos(){ var sd=document.getElementById('saludDatos'); if(!sd) return 0; var m=/(\d+)\s+avisos?/.exec(sd.textContent||''); return m?+m[1]:0; }
  function org(){ var V=document.getElementById('view-estado'), M=document.getElementById('view-metodo'); if(!V||!M) return;
    var h=M.querySelector('.vhero'); if(!h) return;
    var bar=document.getElementById('nEstSeg'); if(!bar){ bar=document.createElement('div'); bar.id='nEstSeg'; bar.className='n-seg n-est-seg'; h.after(bar); }
    if(!window._nEstTab) window._nEstTab=avisos()?'salud':'marc';
    var nA=avisos();
    var html=TABS.map(function(t){ return '<button data-nest="'+t[0]+'" class="'+(window._nEstTab===t[0]?'on':'')+'">'+t[1]+(t[0]==='salud'&&nA?' <em>'+nA+'</em>':'')+'</button>'; }).join('');
    if(bar.innerHTML!==html) bar.innerHTML=html;
    function ver(el,k){ if(!el) return; var on=window._nEstTab===k; if(el.style.display!==(on?'':'none')) el.style.display=on?'':'none'; }
    var sdx=document.getElementById('saludDatos'); if(sdx&&bar.nextElementSibling!==sdx) bar.after(sdx);
    ver(document.getElementById('saludDatos'),'salud'); ver(document.getElementById('view-salud'),'salud');
    ver(document.getElementById('metKpis'),'marc'); [].forEach.call(M.querySelectorAll('.pos-blk[data-metblk]'),function(b){ ver(b,'marc');
      var s=b.querySelector('.bsum'); if(s&&/sin datos/i.test(s.textContent)&&!b.classList.contains('n-est-vacio')){ b.classList.add('n-est-vacio'); b.classList.remove('open'); } });
    ver(V.querySelector('.ns-sub'),'bt');
    var hs=document.querySelector('#view-salud .pos-blk'); if(hs&&window._nEstTab==='salud'&&!hs._nab){ hs._nab=1; hs.classList.add('open'); }
  }
  var t=null; function luego(){ clearTimeout(t); t=setTimeout(function(){ try{ org(); }catch(e){ console.warn('[n-estado]',e); } },80); }
  function vigilar(){ var V=document.getElementById('view-estado'); if(!V){ setTimeout(vigilar,500); return; } new MutationObserver(luego).observe(V,{childList:true,subtree:true}); luego(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',vigilar); else vigilar();
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-nest]'); if(!b) return; window._nEstTab=b.getAttribute('data-nest'); org(); });
  var st=document.createElement('style'); st.textContent=
    '.n-est-seg{display:inline-flex;flex-wrap:wrap;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:3px;gap:2px;margin:0 0 14px}.n-est-seg button{border:0;background:transparent;padding:8px 14px;border-radius:9px;font:inherit;font-size:13.5px;font-weight:700;color:#475569;cursor:pointer}.n-est-seg button.on{background:#1F4A9A;color:#fff}.n-est-seg em{font-style:normal;background:#FEF3C7;color:#92400E;border-radius:999px;padding:0 6px;font-size:11px;margin-left:3px}'+
    '#view-estado .n-est-vacio{opacity:.6}#view-estado .n-est-vacio .pos-blk-h .bsum{font-style:italic}'+
    '#view-estado .ns-sub>.ns-subh{display:none}#view-estado #view-backtest>.vhero{display:none}';
  document.head.appendChild(st);
})();
