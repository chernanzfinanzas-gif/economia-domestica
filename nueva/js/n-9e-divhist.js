/* APP NUEVA · Calendario → Dividendos/mes: GRÁFICA «DIVIDENDOS HISTÓRICOS» (3-nov-2026, Carlos: «en el pago de dividendos me
   gusta esta gráfica»). Barras por mes, un color por año; la leyenda enciende/apaga años; botón Anual/Mensual.
   · Cifras: las mismas de la tabla €/mes (calDivMesEmpresas): años pasados = cobrado; año en curso = cobrado + lo previsto
     que queda. Sin la devolución del IRPF. Respeta el botón Neto/Bruto de la tabla.
   · Años apagados y modo se recuerdan en este aparato (kh-divhist). Por defecto se ven los 7 últimos. */
(function(){
  if(typeof _calDivsHTML!=='function'||window._nDivHist) return; window._nDivHist=true;
  var st={modo:'mes',off:null}; try{ var g=JSON.parse(localStorage.getItem('kh-divhist')||'null'); if(g){ st.modo=g.modo||'mes'; st.off=g.off||null; } }catch(e){}
  var CACHE=null;
  var PAL=['#5EEAD4','#86EFAC','#16A34A','#65A30D','#BEF264','#FDBA74','#92400E','#9F1239','#E8708F','#E879F9','#86198F','#312E81','#8B5CF6','#7DD3F0','#1E6A8D','#0F766E','#B45309'];
  var MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  function eur(v){ return (+v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:0,useGrouping:'always'})+' €'; }
  function guardar(){ try{ localStorage.setItem('kh-divhist',JSON.stringify({modo:st.modo,off:st.off})); }catch(e){} }
  function datos(){
    var nowY=new Date().getFullYear(), firma=nowY+'|'+JSON.stringify((DB.operaciones||[]).length)+'|'+Object.keys(DB.dividendos||{}).length+'|'+(DB.cerradas||[]).length;
    if(CACHE&&CACHE.firma===firma) return CACHE;
    var ys=(typeof calYearsDisponibles==='function')?calYearsDisponibles():[], A=[];
    ys.forEach(function(y){ if(y>nowY) return; var d=null; try{ d=calDivMesEmpresas(y); }catch(e){}
      var m=(d&&d.totMes)?d.totMes.slice(0,12):null; if(!m) return; var t=m.reduce(function(a,b){ return a+b; },0); if(t>=1) A.push({y:y,m:m,t:t,curso:y===nowY}); });
    CACHE={firma:firma,A:A}; return CACHE; }
  function css(){ if(document.getElementById('nDhCss')) return; var s=document.createElement('style'); s.id='nDhCss'; s.textContent=
    '#nDivHist{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,.08);padding:16px 16px 10px;margin:0 0 14px;position:relative}'+
    '#nDivHist .dh-top{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}#nDivHist .dh-top h3{margin:0;font-size:18px;color:#0F172A}#nDivHist .dh-sub{font-size:12.5px;color:#64748B;margin-top:3px}'+
    '#nDivHist .dh-seg{margin-left:auto;display:inline-flex;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden}#nDivHist .dh-seg button{border:0;background:#fff;padding:6px 11px;font:inherit;font-size:12px;color:#475569;cursor:pointer}#nDivHist .dh-seg button.on{background:#F1F5F9;color:#0F172A;font-weight:700}'+
    '#nDivHist .dh-leg{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;margin:12px 0 4px}#nDivHist .dh-leg span{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#334155;cursor:pointer;user-select:none}#nDivHist .dh-leg i{width:10px;height:10px;border-radius:50%;display:inline-block}#nDivHist .dh-leg span.off{color:#94A3B8;text-decoration:line-through}#nDivHist .dh-leg span.off i{opacity:.45}'+
    '#nDivHist .dh-sc{overflow-x:auto}#nDivHist svg{display:block;width:100%;min-width:640px;height:auto}#nDivHist svg text{font-family:inherit}#nDivHist rect.b{cursor:pointer;transition:opacity .12s}#nDivHist rect.b:hover{filter:brightness(1.12)}'+
    '#nDivHist .dh-tip{position:absolute;pointer-events:none;background:#0F172A;color:#fff;font-size:12px;border-radius:8px;padding:6px 9px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.2);display:none;z-index:5}#nDivHist .dh-tip b{font-size:13px}'+
    '#nDivHist .dh-nota{font-size:11px;color:#94A3B8;margin-top:4px}';
    document.head.appendChild(s); }
  function svg(A,vis){
    var mAct=new Date().getMonth(), W=1000,H=300,L=62,R=8,T=10,B=26,pw=W-L-R,ph=H-T-B, mx=0, col={}, bru=!!window._cvBruto, k=bru?1/0.81:1;
    A.forEach(function(a,i){ col[a.y]=PAL[(PAL.length-A.length+i+PAL.length*4)%PAL.length]; });
    var V=A.filter(function(a){ return vis[a.y]; });
    var grupos=st.modo==='anual'?[{lab:'',vals:V.map(function(a){ return {y:a.y,v:a.t*k,c:a.curso}; })}]
      :MES.map(function(m,i){ return {lab:m,vals:V.map(function(a){ return {y:a.y,v:a.m[i]*k,c:a.curso,mi:i}; })}; });
    grupos.forEach(function(g){ g.vals.forEach(function(x){ if(x.v>mx) mx=x.v; }); });
    if(!(mx>0)) return '<div class="dh-nota" style="padding:30px 0;text-align:center">Enciende algún año en la leyenda.</div>';
    var paso=[50,100,250,500,1000,2500,5000,10000,25000,50000].filter(function(p){ return mx/p<=8; })[0]||100000, top=Math.ceil(mx/paso)*paso;
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Dividendos por mes y año">';
    for(var v=0;v<=top+0.1;v+=paso){ var yy=T+ph-(v/top)*ph; s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="#EEF2F6"/><text x="'+(L-8)+'" y="'+(yy+4)+'" font-size="11" fill="#64748B" text-anchor="end">'+eur(v)+'</text>'; }
    var gw=pw/grupos.length;
    grupos.forEach(function(g,gi){ var n=g.vals.length, inner=st.modo==='anual'?Math.min(pw*0.9,n*70):gw*0.84, bw=Math.min(st.modo==='anual'?52:16,inner/Math.max(1,n)), x0=L+gi*gw+(gw-bw*n)/2;
      g.vals.forEach(function(x,j){ if(!(x.v>0)) return; var h=(x.v/top)*ph, xx=x0+j*bw, yy=T+ph-h, w=Math.max(1,bw-2);
        var tip=(st.modo==='anual'?'':MES[x.mi]+' ')+x.y+'|'+eur(x.v)+(x.c&&(st.modo==='anual'||x.mi>=mAct)?(st.modo==='anual'?'|cobrado + previsto que queda':(x.mi>mAct?'|previsto':'|cobrado + previsto del mes')):'');
        s+='<rect class="b" data-dhtip="'+tip+'" x="'+xx.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="3" fill="'+col[x.y]+'"'+(x.c&&(st.modo==='anual'||x.mi>mAct)?' fill-opacity=".4" stroke="'+col[x.y]+'" stroke-width="1.2"':'')+'/>';
        if(st.modo==='anual') s+='<text x="'+(xx+w/2).toFixed(1)+'" y="'+(yy-5).toFixed(1)+'" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">'+eur(x.v)+'</text><text x="'+(xx+w/2).toFixed(1)+'" y="'+(H-8)+'" font-size="12" fill="#64748B" text-anchor="middle">'+x.y+'</text>'; });
      if(g.lab) s+='<text x="'+(L+gi*gw+gw/2).toFixed(1)+'" y="'+(H-8)+'" font-size="12" fill="#64748B" text-anchor="middle">'+g.lab+'</text>'; });
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'" stroke="#CBD5E1"/></svg>';
    return s; }
  function html(){
    var D=datos(), A=D.A; if(!A.length) return '';
    if(!st.off){ st.off=A.slice(0,Math.max(0,A.length-7)).map(function(a){ return a.y; }); }
    var vis={}; A.forEach(function(a){ vis[a.y]=st.off.indexOf(a.y)<0; });
    var col={}; A.forEach(function(a,i){ col[a.y]=PAL[(PAL.length-A.length+i+PAL.length*4)%PAL.length]; });
    var leg=A.map(function(a){ return '<span data-dhy="'+a.y+'" class="'+(vis[a.y]?'':'off')+'"><i style="background:'+col[a.y]+'"></i>'+a.y+'</span>'; }).join('');
    return '<div id="nDivHist"><div class="dh-top"><div><h3>Dividendos históricos</h3><div class="dh-sub">Pasa por encima del gráfico para ver la cifra. '+(window._cvBruto?'En <b>bruto</b>.':'En <b>neto</b> (× 0,81), sin la devolución del IRPF.')+'</div></div>'+
      '<div class="dh-seg"><button data-dhm="anual" class="'+(st.modo==='anual'?'on':'')+'">Anual</button><button data-dhm="mes" class="'+(st.modo==='mes'?'on':'')+'">Mensual</button></div></div>'+
      '<div class="dh-leg">'+leg+'</div><div class="dh-sc">'+svg(A,vis)+'</div>'+
      '<div class="dh-nota">Toca un año de la leyenda para encenderlo o apagarlo. En el año en curso, lo que aún es previsión sale en color claro.</div><div class="dh-tip"></div></div>'; }
  var oh=_calDivsHTML;
  _calDivsHTML=function(){ var h=oh.apply(this,arguments), g=''; try{ css(); g=html(); }catch(e){ console.error('[divhist]',e); } return g+h; };
  function repintar(){ var o=document.getElementById('nDivHist'); if(!o) return; var t=document.createElement('div'); t.innerHTML=html(); if(t.firstChild) o.replaceWith(t.firstChild); }
  document.addEventListener('click',function(e){ if(!e.target.closest) return; var b;
    if((b=e.target.closest('[data-dhm]'))){ st.modo=b.getAttribute('data-dhm'); guardar(); repintar(); return; }
    if((b=e.target.closest('[data-dhy]'))){ var y=+b.getAttribute('data-dhy'), i=st.off.indexOf(y); if(i>=0) st.off.splice(i,1); else st.off.push(y); guardar(); repintar(); } });
  function tipAt(e){ var box=document.getElementById('nDivHist'); if(!box) return; var tip=box.querySelector('.dh-tip'); if(!tip) return;
    var r=e.target.closest&&e.target.closest('rect[data-dhtip]'); if(!r||!box.contains(r)){ tip.style.display='none'; return; }
    var p=r.getAttribute('data-dhtip').split('|'), bb=box.getBoundingClientRect();
    tip.innerHTML=p[0]+'<br><b>'+p[1]+'</b>'+(p[2]?'<br><span style="opacity:.75">'+p[2]+'</span>':''); tip.style.display='block';
    var x=e.clientX-bb.left+12, y=e.clientY-bb.top-10; if(x+tip.offsetWidth>bb.width) x=e.clientX-bb.left-tip.offsetWidth-12; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  document.addEventListener('mousemove',tipAt); document.addEventListener('click',tipAt);
})();
