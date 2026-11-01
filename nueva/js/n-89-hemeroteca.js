/* APP NUEVA · Sistema › Informes: la Hemeroteca, a la vista (1-nov-2026, Carlos: «¿la hemeroteca? informes semanales,
   revisiones periódicas, dossiers, revisiones extraordinarias»).
   - Arriba de Informes, dos botones: 🖨️ Crear un PDF · 🗞️ Hemeroteca (con cuántos documentos hay).
   - La Hemeroteca tiene cuatro apartados:
       🗞️ Informes semanales      → los PDF archivados (lo de siempre)
       🔁 Revisiones periódicas   → por empresa: último periodo revisado, cuándo, semáforo y el resumen; desplegando, los
                                    periodos de los dos últimos años (dossiers/trimestral/TK-trim.json); enlace a la ficha v3
       📚 Dossiers                → lo de siempre (Análisis)
       🚨 Revisiones extraordinarias → todas las Notas publicadas (dossiers/revisiones/TK/…), más recientes arriba,
                                    con la señal que las abrió y filtro por empresa */
(function(){
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function dmy(f){ f=String(f||''); return f.length>=10?f.slice(8,10)+'/'+f.slice(5,7)+'/'+f.slice(0,4):(f||'—'); }
  window._nInfTab=window._nInfTab||'pdf'; window._nHemTab=window._nHemTab||'sem'; window._nHemQ=window._nHemQ||'';
  var IDX=null, DV3={}, RES=null, TRIM={}, cargando=false;
  function cargar(){ if(cargando) return; cargando=true;
    var a=(typeof khIndice==='function')?khIndice():Promise.resolve(null);
    var b=fetch('fichas/_resumen.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; });
    var c=fetch('recogida/decisiones-v3.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; });
    Promise.all([a,b,c]).then(function(v){ IDX=v[0]||{}; DV3=(v[2]&&v[2].empresas)||{}; var em=(v[1]&&v[1].empresas)||{}; RES={}; if(Array.isArray(em)) em.forEach(function(x){ if(x&&x.ticker) RES[String(x.ticker).toUpperCase()]=x; }); else RES=em; try{ org(); }catch(e){} }); }
  function nombre(t){ var e=(RES||{})[t]; return (e&&e.empresa)||(((DB.valores||{})[t]||{}).nombre)||t; }
  function extra(){ var L=[]; Object.keys((IDX||{}).revisiones||{}).forEach(function(t){ (IDX.revisiones[t]||[]).forEach(function(f){ var m=/^(\d{4}-\d{2}-\d{2})\s+(.*?)(?:\s*\(([^)]+)\))?\.html?$/i.exec(f);
      L.push({t:t.toUpperCase(),f:f,fecha:m?m[1]:'',sen:m&&m[3]?m[3]:'',tit:m?m[2].replace(/^Nota Revisión Extraordinaria\s*/i,''):f}); }); });
    Object.keys(DV3||{}).forEach(function(t){ (DV3[t]||[]).forEach(function(d){ if(!d||!d.fechaIso) return; L.push({t:t.toUpperCase(),v3:1,fecha:d.fechaIso,sen:d.senal||'',dec:d.decision||'',tit:d.motivo||'',rev:d.revision||''}); }); });
    return L.sort(function(a,b){ return a.fecha<b.fecha?1:(a.fecha>b.fecha?-1:0); }); }
  var SEN={S1:['Stop tocado','#991B1B','#FEE2E2'],S2:['Rojo o tesis rota','#991B1B','#FEE2E2'],S3:['Precio en el objetivo','#1E40AF','#DBEAFE'],S6:['Dos ámbar seguidos','#92400E','#FEF3C7'],Disc:['Revisión a criterio','#475569','#F1F5F9'],VETO:['Veto','#6D28D9','#EDE9FE']};
  function pillS(s){ var c=SEN[s]||[s,'#475569','#F1F5F9']; return '<span class="n-hm-pill" style="background:'+c[2]+';color:'+c[1]+'">'+E(s)+' · '+c[0]+'</span>'; }
  function sem(c){ var M={V:['#16A34A','verde'],A:['#D97706','ámbar'],R:['#DC2626','rojo']}[c]||['#94A3B8','—']; return '<span class="n-hm-sem" style="background:'+M[0]+'" title="'+M[1]+'"></span>'; }
  function trim(t,cb){ if(TRIM[t]!==undefined){ cb(); return; } TRIM[t]=null; fetch('dossiers/trimestral/'+t+'-trim.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(j){ TRIM[t]=j||false; cb(); }); }
  /* ---------- revisiones periódicas ---------- */
  function pintaPer(h){ var q=String(window._nHemQ||'').toLowerCase(), ab=window._nHemAb||{};
    var L=Object.keys(RES||{}).map(function(t){ var e=RES[t]; return {t:t,e:e}; }).filter(function(x){ return x.e.revisado_hasta||x.e.ultimo_periodo; })
      .filter(function(x){ return !q||(x.t+' '+nombre(x.t)).toLowerCase().indexOf(q)>=0; })
      .sort(function(a,b){ var fa=a.e.revisado_fecha||'', fb=b.e.revisado_fecha||''; return fa<fb?1:(fa>fb?-1:0); });
    var s='<div class="n-hm-nota">La última revisión de cada empresa analizada, la más reciente arriba. Pulsa una fila para ver sus periodos de los dos últimos años.</div>';
    s+='<div class="n-hm-head p"><span>Empresa</span><span>Periodo revisado</span><span>Revisado el</span><span>Semáforo</span><span>Decisión</span><span></span></div>';
    s+=L.map(function(x){ var e=x.e, abierto=!!ab[x.t];
      var r='<div class="n-hm-row p'+(abierto?' ab':'')+'" data-nhmp="'+E(x.t)+'"><div><b>'+E(x.t)+'</b> <span class="mu">'+E(nombre(x.t))+'</span></div><div>'+E(e.revisado_hasta||e.ultimo_periodo||'—')+'</div><div>'+dmy(e.revisado_fecha)+'</div><div>'+sem(e.semaforo)+'</div><div><span class="n-hm-dec">'+E(e.decision||'—')+'</span></div><div class="lnk"><a href="dossiers/v3/'+E(x.t)+'.html" target="_blank" rel="noopener">📊 Ficha</a> '+(abierto?'▾':'▸')+'</div></div>';
      if(abierto){ var T=TRIM[x.t];
        if(T===undefined||T===null){ r+='<div class="n-hm-det">Cargando…</div>'; trim(x.t,function(){ try{ pinta(); }catch(err){} }); }
        else if(!T||!T.revisiones){ r+='<div class="n-hm-det">Sin histórico publicado.</div>'; }
        else { var y0=String(new Date().getFullYear()-1); var P=T.revisiones.filter(function(v){ return String(v.periodoV3||v.periodo||'').slice(0,4)>=y0; }).reverse();
          r+='<div class="n-hm-det">'+P.map(function(v){ return '<div class="n-hm-per">'+sem(v.semaforoGlobal)+'<b>'+E(v.periodoV3||v.periodo)+'</b><span>'+E(v.resumen||'')+'</span></div>'; }).join('')+'</div>'; } }
      return r; }).join('');
    h.innerHTML=s+(L.length?'':'<div class="n-hm-nota">Ninguna empresa con ese nombre.</div>'); }
  /* ---------- revisiones extraordinarias ---------- */
  function pintaExt(h){ var q=String(window._nHemQ||'').toLowerCase(), L=extra().filter(function(x){ return !q||(x.t+' '+x.tit+' '+nombre(x.t)).toLowerCase().indexOf(q)>=0; });
    var porS={}; extra().forEach(function(x){ porS[x.sen]=(porS[x.sen]||0)+1; });
    var s='<div class="n-hm-nota">Las revisiones extraordinarias: hasta el 25-oct, Notas en documento; desde el salto al método v3, la decisión queda en la ficha de la empresa (§10.5). Las abre una señal (S1 stop, S2 rojo, S3 precio objetivo, S6 dos ámbar) o una revisión a criterio, y cierran con una decisión. '+Object.keys(porS).sort().map(function(k){ return '<b>'+porS[k]+'</b> '+E(k); }).join(' · ')+'.</div>';
    var byY={}; L.forEach(function(x){ var m=x.fecha.slice(0,7); (byY[m]=byY[m]||[]).push(x); });
    var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    s+=Object.keys(byY).sort().reverse().map(function(m){ return '<div class="n-hm-mes">'+MES[+m.slice(5,7)-1]+' '+m.slice(0,4)+' · '+byY[m].length+'</div>'+byY[m].map(function(x){
      if(x.v3) return '<a class="n-hm-row e v3" href="dossiers/v3/'+encodeURIComponent(x.t)+'.html" target="_blank" rel="noopener" title="'+E(x.tit)+'"><div>'+dmy(x.fecha)+'</div><div><b>'+E(x.t)+'</b> <span class="n-hm-dec">'+E(x.dec)+'</span> <span class="mu">'+E(String(x.tit).split('. ')[0].slice(0,120))+'</span> <span class="n-hm-v3">método v3</span></div><div>'+(x.sen?pillS(x.sen):'')+'</div><div class="lnk">Ficha ↗</div></a>';
      return '<a class="n-hm-row e" href="dossiers/revisiones/'+encodeURIComponent(x.t)+'/'+encodeURIComponent(x.f)+'" target="_blank" rel="noopener"><div>'+dmy(x.fecha)+'</div><div><b>'+E(x.t)+'</b> <span class="mu">'+E(x.tit)+'</span></div><div>'+(x.sen?pillS(x.sen):'')+'</div><div class="lnk">Abrir ↗</div></a>'; }).join(''); }).join('');
    h.innerHTML=s+(L.length?'':'<div class="n-hm-nota">Ninguna Nota con ese filtro.</div>'); }
  /* ---------- montaje ---------- */
  function pinta(){ var h=document.getElementById('nHemX'); if(!h) return; if(window._nHemTab==='per') pintaPer(h); else if(window._nHemTab==='ext') pintaExt(h); }
  function org(){ var V=document.getElementById('view-informes'), C=document.getElementById('informesCenter'), HV=document.getElementById('view-hemero'); if(!V||!C) return;
    if(!IDX) cargar();
    var hero=V.querySelector(':scope > .vhero')||V.querySelector('.vhero'); var sub=HV?HV.closest('.ns-sub'):null;
    var bar=document.getElementById('nInfSeg'); if(!bar){ bar=document.createElement('div'); bar.id='nInfSeg'; bar.className='n-inf-seg'; if(hero) hero.after(bar); else V.prepend(bar); }
    var nDoc=IDX?((IDX.informes||[]).length+(IDX.dossiers||[]).length+extra().length+Object.keys(RES||{}).length):null;
    var bh='<button data-ninf="pdf" class="'+(window._nInfTab==='pdf'?'on':'')+'">🖨️ Crear un PDF</button><button data-ninf="hem" class="'+(window._nInfTab==='hem'?'on':'')+'">🗞️ Hemeroteca'+(nDoc?' <em>'+nDoc+'</em>':'')+'</button>';
    if(bar.innerHTML!==bh) bar.innerHTML=bh;
    var verPdf=window._nInfTab==='pdf'; if(C.style.display!==(verPdf?'':'none')) C.style.display=verPdf?'':'none'; if(sub&&sub.style.display!==(verPdf?'none':'')) sub.style.display=verPdf?'none':'';
    if(!HV) return;
    var hb=document.getElementById('nHemSeg'); if(!hb){ hb=document.createElement('div'); hb.id='nHemSeg'; hb.className='n-hem-seg'; var st=document.getElementById('hemeroSubtabs'); if(st) st.before(hb); else HV.prepend(hb); }
    var n={sem:IDX?(IDX.informes||[]).length:'',per:RES?Object.keys(RES).length:'',dos:IDX?(IDX.dossiers||[]).length:'',ext:IDX?extra().length:''};
    var hh=[['sem','🗞️ Informes semanales'],['per','🔁 Revisiones periódicas'],['dos','📚 Dossiers'],['ext','🚨 Revisiones extraordinarias']].map(function(x){ return '<button data-nhem="'+x[0]+'" class="'+(window._nHemTab===x[0]?'on':'')+'">'+x[1]+(n[x[0]]!==''?' <em>'+n[x[0]]+'</em>':'')+'</button>'; }).join('')+
      ((window._nHemTab==='per'||window._nHemTab==='ext')?'<input id="nHemQ" placeholder="Buscar empresa…" value="'+E(window._nHemQ)+'">':'');
    if(hb.getAttribute('data-k')!==JSON.stringify([window._nHemTab,n])){ hb.innerHTML=hh; hb.setAttribute('data-k',JSON.stringify([window._nHemTab,n])); }
    var t=window._nHemTab, i=document.getElementById('htab-informes'), a=document.getElementById('htab-analisis');
    var x=document.getElementById('nHemX'); if(!x){ x=document.createElement('div'); x.id='nHemX'; HV.appendChild(x); }
    function v(el,on){ if(el&&el.style.display!==(on?'':'none')) el.style.display=on?'':'none'; }
    v(i,t==='sem'); v(a,t==='dos'); v(x,t==='per'||t==='ext');
    [i,a].forEach(function(el){ if(!el) return; var b=el.querySelector('.pos-blk'); if(b&&!b._nab){ b._nab=1; b.classList.add('open'); } });
    if((t==='per'||t==='ext')&&IDX&&x.getAttribute('data-t')!==t+'|'+window._nHemQ){ x.setAttribute('data-t',t+'|'+window._nHemQ); pinta(); }
  }
  var tm=null; function luego(){ clearTimeout(tm); tm=setTimeout(function(){ try{ org(); }catch(e){ console.warn('[n-hemeroteca]',e); } },80); }
  function vigilar(){ var V=document.getElementById('view-informes'); if(!V){ setTimeout(vigilar,500); return; } new MutationObserver(function(ms){ if(ms.every(function(m){ var x=document.getElementById('nHemX'); return x&&x.contains(m.target); })) return; luego(); }).observe(V,{childList:true,subtree:true}); luego(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',vigilar); else vigilar();
  /* «Hemeroteca» desde otros sitios (avisos, Salud) → abre este apartado */
  if(typeof irHemero==='function'){ var oi=irHemero; irHemero=function(t){ window._nInfTab='hem'; window._nHemTab=(t==='analisis')?'dos':'sem'; return oi.apply(this,arguments); }; }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-ninf]'); if(b){ window._nInfTab=b.getAttribute('data-ninf'); org(); return; }
    var c=e.target.closest&&e.target.closest('[data-nhem]'); if(c){ var k=c.getAttribute('data-nhem'); window._nHemTab=k; if(k==='sem'||k==='dos'){ try{ _hemeroShow(k==='dos'?'analisis':'informes'); }catch(err){} } var x=document.getElementById('nHemX'); if(x) x.removeAttribute('data-t'); org(); return; }
    var r=e.target.closest&&e.target.closest('[data-nhmp]'); if(r&&!e.target.closest('a')){ var t=r.getAttribute('data-nhmp'); window._nHemAb=window._nHemAb||{}; window._nHemAb[t]=!window._nHemAb[t]; pinta(); } });
  document.addEventListener('input',function(e){ if(e.target&&e.target.id==='nHemQ'){ window._nHemQ=e.target.value; pinta(); var x=document.getElementById('nHemX'); if(x) x.setAttribute('data-t',window._nHemTab+'|'+window._nHemQ); } });
  var s=document.createElement('style'); s.textContent=
    '.n-inf-seg,.n-hem-seg{display:inline-flex;flex-wrap:wrap;align-items:center;gap:2px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:3px;margin:0 0 14px}'+
    '.n-inf-seg button,.n-hem-seg button{border:0;background:transparent;padding:8px 14px;border-radius:9px;font:inherit;font-size:13.5px;font-weight:700;color:#475569;cursor:pointer}.n-inf-seg button.on,.n-hem-seg button.on{background:#1F4A9A;color:#fff}'+
    '.n-inf-seg em,.n-hem-seg em{font-style:normal;background:#E0E7FF;color:#3730A3;border-radius:999px;padding:0 7px;font-size:11px;margin-left:3px}.n-inf-seg .on em,.n-hem-seg .on em{background:rgba(255,255,255,.25);color:#fff}'+
    '.n-hem-seg{display:flex;width:100%}.n-hem-seg input{margin-left:auto;padding:7px 10px;border:1px solid #CBD5E1;border-radius:9px;font:inherit;font-size:13px;min-width:200px}'+
    '#view-informes .ns-sub{margin-top:0!important;padding-top:0!important;border-top:0!important}#view-informes #hemeroSubtabs,#view-informes .ns-sub>.ns-subh,#view-informes #view-hemero>.vhero{display:none!important}'+
    '#nHemX{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px}.n-hm-nota{font-size:13px;color:#475569;margin:0 0 10px;line-height:1.5}'+
    '.n-hm-head,.n-hm-row{display:grid;gap:10px;align-items:center}.n-hm-head.p,.n-hm-row.p{grid-template-columns:minmax(180px,1.4fr) 110px 100px 80px 110px 110px}.n-hm-row.e{grid-template-columns:96px 1fr 210px 70px}'+
    '.n-hm-head{padding:6px;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:700;border-bottom:1px solid #E2E8F0}'+
    '.n-hm-row{padding:9px 6px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;text-decoration:none;cursor:pointer}.n-hm-row:hover,.n-hm-row.ab{background:#F8FAFC}.n-hm-row b{color:#1F4A9A}.n-hm-row .mu{color:#64748B;font-size:12px}'+
    '.n-hm-row .lnk{text-align:right;font-size:12.5px;font-weight:700;color:#1F4A9A}.n-hm-row .lnk a{color:#1F4A9A;text-decoration:none;margin-right:6px}'+
    '.n-hm-sem{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:middle;flex:none}.n-hm-dec{font-size:11.5px;font-weight:800;background:#E0E7FF;color:#3730A3;border-radius:999px;padding:2px 8px}'+
    '.n-hm-v3{font-size:10px;font-weight:800;background:#ECFDF5;color:#047857;border-radius:4px;padding:1px 5px;margin-left:4px}.n-hm-row.e .mu{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n-hm-row.e>div:nth-child(2){min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.n-hm-pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700}'+
    '.n-hm-det{background:#F8FAFC;border-radius:10px;margin:2px 0 10px;padding:8px 12px;font-size:12.5px;color:#475569}.n-hm-per{display:flex;gap:8px;align-items:baseline;padding:4px 0;border-bottom:1px dashed #E2E8F0}.n-hm-per:last-child{border-bottom:0}.n-hm-per b{min-width:64px;color:#0F172A}'+
    '.n-hm-mes{margin:12px 0 4px;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#64748B}'+
    '@media(max-width:800px){.n-hm-head.p{display:none}.n-hm-row.p{grid-template-columns:1fr 1fr}.n-hm-row.e{grid-template-columns:1fr auto}.n-hm-row.e>div:nth-child(3){grid-column:1/-1}.n-hem-seg input{margin-left:0;width:100%}}';
  document.head.appendChild(s);
})();
