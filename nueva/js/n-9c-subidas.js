/* APP NUEVA · Mi cartera → Cartera: MAYORES SUBIDAS Y BAJADAS (3-nov-2026, Carlos: «un panel de mayores subidas y mayores
   bajadas en 1 día, 1 semana, 1 mes, 3 meses, 6 meses, 1 año… y ordenar en porcentaje o en euros», debajo de las 4 cifras).
   · Cotización de hoy (la de la app, _mcCot) frente al último cierre en o antes de la fecha del plazo (precios/TK.json).
     El día usa el cierre anterior que ya calcula Mi cartera.
   · Euros = acciones que tienes HOY × lo que ha cambiado el precio (no cuenta compras ni ventas hechas dentro del plazo, ni
     dividendos: es «cómo se han movido tus empresas», no tu rentabilidad, que está en Rentabilidad).
   · Las 3 que más suben y las 3 que más bajan; «ver todas» despliega el resto. Plazo y orden se recuerdan en este aparato. */
(function(){
  if(typeof renderInv!=='function'||window._nSubBaj) return; window._nSubBaj=true;
  var PZ=[['1d','1 día',1],['1s','1 semana',7],['1m','1 mes',30],['3m','3 meses',91],['6m','6 meses',182],['1a','1 año',365]];
  var st={pz:'1s',ord:'pct',todo:false}; try{ var g=JSON.parse(localStorage.getItem('kh-subbaj')||'null'); if(g) st.pz=g.pz||st.pz, st.ord=g.ord||st.ord; }catch(e){}
  var SER={}, pend={};
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function n(v,d){ return (+v).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'}); }
  function hue(t){ var h=0; for(var i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))%360; return h; }
  function av(t){ return '<span class="sb-av" style="background:hsl('+hue(t)+',55%,42%)">'+esc(String(t).slice(0,2))+'</span>'; }
  function serie(t){ if(SER[t]) return Promise.resolve(SER[t]); if(pend[t]) return pend[t];
    pend[t]=fetch('precios/'+encodeURIComponent(t)+'.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(j){ SER[t]=(j&&j.data)||[]; return SER[t]; }); return pend[t]; }
  function cierreEn(S,f){ var lo=0, hi=S.length; while(lo<hi){ var m=(lo+hi)>>1; if(S[m][0]<=f) lo=m+1; else hi=m; } return lo?S[lo-1]:null; }
  function css(){ if(document.getElementById('nSbCss')) return; var s=document.createElement('style'); s.id='nSbCss'; s.textContent=
    '#nSubBaj{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,.08);padding:14px;margin:0 0 14px}'+
    '#nSubBaj .sb-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}#nSubBaj .sb-top b{font-size:14.5px;color:#0F172A;margin-right:auto}'+
    '#nSubBaj .sb-seg{display:inline-flex;border:1px solid #E2E8F0;border-radius:999px;overflow:hidden}#nSubBaj .sb-seg button{border:0;background:#fff;padding:5px 11px;font:inherit;font-size:12px;font-weight:700;color:#475569;cursor:pointer}#nSubBaj .sb-seg button.on{background:#1F4A9A;color:#fff}'+
    '#nSubBaj .sb-g{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:760px){#nSubBaj .sb-g{grid-template-columns:1fr}}'+
    '#nSubBaj .sb-c{border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC;padding:10px 12px}'+
    '#nSubBaj .sb-h{display:flex;align-items:center;gap:8px;color:#475569;font-size:13px;margin-bottom:6px}#nSubBaj .sb-h i{font-style:normal;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:15px}'+
    '#nSubBaj .sb-r{display:flex;align-items:center;gap:9px;padding:7px 0;border-top:1px solid #EEF2F6}#nSubBaj .sb-r:first-of-type{border-top:0}'+
    '#nSubBaj .sb-av{width:30px;height:30px;border-radius:50%;color:#fff;font-weight:800;font-size:12px;display:inline-flex;align-items:center;justify-content:center;flex:none;box-shadow:0 0 0 3px #fff}'+
    '#nSubBaj .sb-n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;color:#64748B}#nSubBaj .sb-n b{color:#0F172A;margin-right:6px;cursor:pointer}'+
    '#nSubBaj .sb-v{text-align:right;font-variant-numeric:tabular-nums;line-height:1.25}#nSubBaj .sb-v b{display:block;font-size:13.5px}#nSubBaj .sb-v span{font-size:12px;color:#64748B}'+
    '#nSubBaj .up b{color:#15803D}#nSubBaj .dn b{color:#B91C1C}#nSubBaj .sb-m{font-size:12px;color:#1F4A9A;font-weight:700;cursor:pointer;margin-top:6px;display:inline-block}#nSubBaj .sb-nota{font-size:11px;color:#94A3B8;margin-top:8px}#nSubBaj .sb-vac{font-size:12.5px;color:#94A3B8;padding:8px 0}';
    document.head.appendChild(s); }
  function pintar(){
    var host=document.getElementById('nSubBaj'); if(!host) return;
    var P=(typeof _mcPosiciones==='function')?_mcPosiciones():[]; if(!P.length){ host.style.display='none'; return; } host.style.display='';
    var pz=PZ.filter(function(x){ return x[0]===st.pz; })[0]||PZ[1];
    var top='<div class="sb-top"><b>Cómo se han movido tus empresas</b><span class="sb-seg">'+PZ.map(function(x){ return '<button data-sbpz="'+x[0]+'" class="'+(st.pz===x[0]?'on':'')+'">'+x[1].replace(' semana',' sem.').replace(' meses',' m').replace(' mes',' m').replace(' año',' año')+'</button>'; }).join('')+'</span><span class="sb-seg"><button data-sbord="pct" class="'+(st.ord==='pct'?'on':'')+'">%</button><button data-sbord="eur" class="'+(st.ord==='eur'?'on':'')+'">€</button></span></div>';
    function filas(L,up){ if(!L.length) return '<div class="sb-vac">'+(up?'Ninguna sube':'Ninguna baja')+' en '+pz[1]+'.</div>';
      var M=st.todo?L:L.slice(0,3);
      return M.map(function(r){ var e=(r.eur>=0?'+':'−')+n(Math.abs(r.eur),2)+' €', p=(r.pct>=0?'+':'−')+n(Math.abs(r.pct),2)+' %', pri=st.ord==='eur'?e:p, sec=st.ord==='eur'?p:e;
        return '<div class="sb-r">'+av(r.t)+'<div class="sb-n"><b data-ficha="'+esc(r.t)+'">'+esc(r.t)+'</b>'+esc(r.nombre||'')+'</div><div class="sb-v '+(up?'up':'dn')+'"><b>'+pri+'</b><span>'+sec+'</span></div></div>'; }).join('')+
        (L.length>3?'<span class="sb-m" data-sbtodo="1">'+(st.todo?'ver menos ▴':'ver las '+L.length+' ▾')+'</span>':''); }
    function dibujar(R){
      var k=st.ord==='eur'?'eur':'pct', S=R.filter(function(r){ return r[k]>0; }).sort(function(a,b){ return b[k]-a[k]; }), B=R.filter(function(r){ return r[k]<0; }).sort(function(a,b){ return a[k]-b[k]; });
      var tot=R.reduce(function(s,r){ return s+r.eur; },0), fal=P.length-R.length;
      host.innerHTML=top+'<div class="sb-g"><div class="sb-c"><div class="sb-h"><i style="background:#DCFCE7;color:#15803D">↗</i>Mayores subidas en '+pz[1]+'</div>'+filas(S,true)+'</div>'+
        '<div class="sb-c"><div class="sb-h"><i style="background:#FEE2E2;color:#B91C1C">↘</i>Mayores bajadas en '+pz[1]+'</div>'+filas(B,false)+'</div></div>'+
        '<div class="sb-nota">En conjunto: <b style="color:'+(tot>=0?'#15803D':'#B91C1C')+'">'+(tot>=0?'+':'−')+n(Math.abs(tot),2)+' €</b> en '+pz[1]+' con las acciones que tienes hoy (sin dividendos ni compras o ventas del periodo).'+(fal?' Sin histórico de precio: '+fal+'.':'')+'</div>'; }
    if(pz[0]==='1d'){ dibujar(P.filter(function(p){ return p.diaPct!=null; }).map(function(p){ return {t:p.ticker,nombre:p.nombre,pct:p.diaPct,eur:p.diaEur}; })); return; }
    host.innerHTML=top+'<div class="sb-vac">Calculando…</div>';
    var hoy=new Date(); hoy.setDate(hoy.getDate()-pz[2]); var f=hoy.toISOString().slice(0,10), pid=st.pz+st.ord+st.todo;
    Promise.all(P.map(function(p){ return serie(p.ticker).then(function(S){ var c=cierreEn(S,f); if(!c||!(c[1]>0)||!(p.cot>0)) return null;
        return {t:p.ticker,nombre:p.nombre,pct:(p.cot/c[1]-1)*100,eur:p.acc*(p.cot-c[1])}; }); }))
      .then(function(R){ if(pid!==st.pz+st.ord+st.todo) return; dibujar(R.filter(Boolean)); }); }
  function montar(){ var c=document.getElementById('invCards'); if(!c) return; css();
    var h=document.getElementById('nSubBaj'); if(!h){ h=document.createElement('div'); h.id='nSubBaj'; c.insertAdjacentElement('afterend',h); } pintar(); }
  var o=renderInv; renderInv=function(){ var r=o.apply(this,arguments); try{ montar(); }catch(e){ console.error('[subidas]',e); } return r; };
  document.addEventListener('click',function(e){ if(!e.target.closest) return; var b;
    if((b=e.target.closest('[data-sbpz]'))) st.pz=b.getAttribute('data-sbpz'); else if((b=e.target.closest('[data-sbord]'))) st.ord=b.getAttribute('data-sbord'); else if(e.target.closest('[data-sbtodo]')) st.todo=!st.todo; else return;
    try{ localStorage.setItem('kh-subbaj',JSON.stringify({pz:st.pz,ord:st.ord})); }catch(err){} pintar(); });
})();
