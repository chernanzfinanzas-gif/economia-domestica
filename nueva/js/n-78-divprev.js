/* APP NUEVA · Kanban 💶 · EL DIVIDENDO PREVISTO SIEMPRE SE RELLENA (1-nov-2026, Carlos: «no debería rellenar lo que está previsto
   y si lo quiero duplicar que me avise» / «me aparecía vacío»)
   Antes el formulario solo se rellenaba si el dividendo constaba como «pendiente de anotar»; si ya estaba anotado (o
   descartado) salía vacío y sin decir por qué. Ahora:
     · busca en Evolución del Dividendo el pago previsto más cercano a la «Fecha de cobro» (±30 días) y rellena
       bruto = €/acc × acciones que tenías en la ex-div, y el neto;
     · al cambiar la fecha vuelve a buscar (si no has tecleado tú el importe);
     · si ese dividendo YA está anotado (o marcado como no cobrado) lo dice en amarillo y, al pulsar «Anotar»,
       pide confirmación antes de anotarlo otra vez (sustituye lo anterior, no suma dos veces la caja). */
(function(){
  if(typeof _emDivForm!=='function'||typeof _emDivDo!=='function') return;
  function U(t){ return String(t||'').toUpperCase(); }
  function n(x){ return (typeof _emNum==='function')?_emNum(x):(+x||0); }
  function fc(f){ return f?String(f).slice(8,10)+'/'+String(f).slice(5,7)+'/'+String(f).slice(0,4):''; }
  function eur(x){ return (typeof _emEur==='function')?_emEur(x):(Math.round(x*100)/100)+' €'; }
  function dias(a,b){ return Math.abs(Date.parse(a+'T12:00:00')-Date.parse(b+'T12:00:00'))/864e5; }

  /* pago previsto (agrupado por ex-div) más cercano a la fecha f */
  function previsto(t,f){ if(typeof evoAnioM!=='function'||!f) return null; var y=+f.slice(0,4), G={};
    [y-1,y,y+1].forEach(function(yy){ var a; try{ a=evoAnioM(t,yy); }catch(e){ a=null; } ((a&&a.pagos)||[]).forEach(function(p){
      var ex=String(p.exDiv||'').slice(0,10), pg=String(p.pago||'').slice(0,10); if(!pg) return; var k=ex||pg;
      var g=G[k]=G[k]||{exDiv:ex||pg,pago:pg,brutoAcc:0,tipo:'',pagos:[],vencido:false,key:t+'|'+(ex||pg)};
      g.brutoAcc+=n(p.bruto); g.pagos.push({pago:pg,bruto:n(p.bruto),tipo:p.tipo||''}); if(p.tipo&&g.tipo.indexOf(p.tipo)<0) g.tipo+=(g.tipo?' + ':'')+p.tipo; }); });
    var best=null; Object.keys(G).forEach(function(k){ var g=G[k], d=dias(g.pago,f); if(d<=30&&(!best||d<dias(best.pago,f))) best=g; });
    if(best) best.brutoAcc=Math.round(best.brutoAcc*10000)/10000;
    return best; }
  function yaAnotado(t,g){ var A=DB.divAnotado||{}, a=A[g.key]||A[t+'|'+g.pago]; if(a) return a;
    var c=(DB.cajaDivReal||{})[t+'|'+g.pago]; if(c!=null) return {tipo:'efectivo',fecha:(DB.cajaDivFecha||{})[t+'|'+g.pago]||g.pago,neto:c}; return null; }
  function accEn(t,g){ var a=(typeof _emAccEn==='function')?_emAccEn(t,g.exDiv):0; return a>0?a:((typeof _emSharesHeld==='function')?_emSharesHeld(t):0); }

  function pintar(t,forzar){
    var fe=document.getElementById('emdFecha'), br=document.getElementById('emdBruto'), ne=document.getElementById('emdNeto'); if(!fe||!br) return;
    var av=document.getElementById('nDivPrevAv'); if(!av){ av=document.createElement('div'); av.id='nDivPrevAv'; av.style.cssText='font-size:11.5px;border-radius:8px;padding:7px 9px;display:none;line-height:1.4';
      var ef=document.getElementById('emdEfec'); ef.parentNode.insertBefore(av,fe.closest('label')); }
    var g=previsto(t,fe.value); window._nDivPrev=g?{t:t,g:g}:null;
    if(!g){ av.style.display='block'; av.style.background='#F1F5F9'; av.style.color='#475569';
      av.innerHTML='No hay ningún pago previsto en Evolución a ±30 días del '+fc(fe.value)+'. Teclea el bruto a mano.';
      if(br.dataset.nprev==='1'){ br.value=''; if(ne) ne.value=''; delete br.dataset.nprev; } return; }
    var sh=accEn(t,g), bruto=Math.round(g.brutoAcc*sh*100)/100, a=yaAnotado(t,g);
    if(forzar||br.value===''||br.dataset.nprev==='1'){ br.value=bruto>0?bruto.toFixed(2):''; br.dataset.nprev='1'; if(typeof _emDivCalc==='function') _emDivCalc(); }
    var txt='Previsto: pago del <b>'+fc(g.pago)+'</b>'+(g.exDiv&&g.exDiv!==g.pago?' (ex-div '+fc(g.exDiv)+')':'')+' · '+g.brutoAcc.toFixed(4)+' €/acc × '+sh+' acc. = <b>'+eur(bruto)+'</b> bruto';
    if(a){ av.style.background='#FEF3C7'; av.style.color='#92400E';
      txt+='<br>⚠️ '+(a.tipo==='descartado'?'Lo marcaste como <b>no cobrado</b>':'<b>Ya lo anotaste</b>'+(a.fecha?' el '+fc(a.fecha):'')+(a.neto!=null?' ('+eur(a.neto)+' neto)':''))+'. Si lo anotas otra vez, sustituye a lo anterior.'; }
    else { av.style.background='#ECFDF5'; av.style.color='#166534'; }
    av.innerHTML=txt; av.style.display='block'; }

  var oF=_emDivForm; _emDivForm=function(t){ var r=oF.apply(this,arguments); t=U(t); window._nDivPrev=null;
    try{ if(!(typeof _emDivPend==='function'&&_emDivPend(t))){ pintar(t,true);
        var fe=document.getElementById('emdFecha'); if(fe) fe.addEventListener('change',function(){ pintar(t,false); });
        var br=document.getElementById('emdBruto'); if(br) br.addEventListener('input',function(){ delete br.dataset.nprev; }); } }
    catch(e){ console.warn('[divprev]',e); }
    return r; };

  var oDo=_emDivDo; _emDivDo=function(t){ t=U(t); var s=(document.querySelector('input[name=emdivt]:checked')||{}).value;
    var P=window._nDivPrev; if(s==='derechos'||!P||P.t!==t||(typeof _emDivPend==='function'&&_emDivPend(t))) return oDo.apply(this,arguments);
    var a=yaAnotado(t,P.g);
    if(a&&!confirm('El dividendo de '+t+' del '+fc(P.g.pago)+' '+(a.tipo==='descartado'?'lo marcaste como NO cobrado':'YA está anotado'+(a.fecha?' (el '+fc(a.fecha)+')':''))+'.\n\n¿Anotarlo otra vez? Sustituye a lo anterior: no se suma dos veces.')) return;
    var oP=_emDivPend; _emDivPend=function(x){ return U(x)===t?P.g:oP.apply(this,arguments); };
    try{ return oDo.apply(this,arguments); } finally{ _emDivPend=oP; window._nDivPrev=null; } };
})();
