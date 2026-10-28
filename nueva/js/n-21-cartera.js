/* APP NUEVA · Mi cartera → Cartera (boceto 28-oct):
   - 4 cifras: Valor total · Plusvalía · Dividendos/año (bruto) · Retorno total
   - fuera «+ Posición» e «Importar .json» (las compras y ventas se harán desde el Kanban)
   - «Posiciones» entra como el bloque «Lotes» (sustituye al «Detalle por lote»)
   - «Ranking» entra como bloque después de Lotes: sus 4 cifras, el selector y la tabla
     (la tarta va a Gráficas y «Aportado vs valor» ya está en Rentabilidad). */
(function(){
  if(typeof renderInv!=='function') return;
  function sec(id,ic,t,sub){ var d=document.createElement('div'); d.id=id; d.className='n-sec';
    d.innerHTML='<div class="n-sec-h"><span class="n-sec-ic">'+ic+'</span><div><b>'+t+'</b><span>'+sub+'</span></div></div><div class="n-sec-b"></div>'; return d; }
  function montar(){
    var v=document.getElementById('view-inversiones'); if(!v||document.getElementById('nLotes')) return;
    var anchor=document.getElementById('invLotes'); if(!anchor) return;
    var L=sec('nLotes','🧾','Lotes','cada compra por separado, con su rentabilidad anualizada (precio + dividendo) · en cartera y vendidas · por FIFO');
    var R=sec('nRank','🏆','Ranking por dividendo','Div/año es el bruto actual; Balance y Total incluyen lo cobrado');
    anchor.insertAdjacentElement('afterend',L); L.insertAdjacentElement('afterend',R);
    var pf=document.getElementById('posFiltro'), pt=document.getElementById('posTable');
    if(pf) L.querySelector('.n-sec-b').appendChild(pf.closest('.toolbar')); if(pt) L.querySelector('.n-sec-b').appendChild(pt);
    ['rankKpis','rankOrden','rankTabla'].forEach(function(id){ var e=document.getElementById(id); if(!e) return; if(id==='rankOrden') e=e.closest('.toolbar'); R.querySelector('.n-sec-b').appendChild(e); });
    anchor.style.display='none';
    var tb=document.getElementById('invAddBtn'); if(tb&&tb.closest('.toolbar')) tb.closest('.toolbar').style.display='none';
  }
  var o=renderInv;
  renderInv=function(){
    o.apply(this,arguments);
    try{
      montar(); try{ if(typeof ADD_ACTIONS!=='undefined') delete ADD_ACTIONS.inversiones; }catch(e){}
      var lots=posLots(), cart=lots.filter(function(l){return l.estado==='Cartera';});
      var all=invPositions().filter(function(p){return p.acciones>0.0001;});
      var valor=0,coste=0,divA=0; all.forEach(function(p){ valor+=p.acciones*p.precioActual; coste+=p.acciones*p.precioCompra; divA+=p.acciones*p.divAccion; });
      var pl=valor-coste, cobr=cart.reduce(function(s,l){return s+l.div;},0), ret=pl+cobr;
      var nP=new Set(all.map(function(p){return p.ticker;})).size;
      var el=document.getElementById('invCards');
      if(el){ el.className='n-ctrl'; el.style.marginBottom='';
        el.innerHTML=
          nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'💼',t:'Valor total',v:fmt(valor),s:nP+' empresas · '+all.length+' posiciones · ambas carteras',p:'coste '+fmt(coste)})+
          nKpi({c:pl>=0?'#16A34A':'#DC2626',bg:pl>=0?'#DCFCE7':'#FEE2E2',ic:'📈',t:'Plusvalía',pill:nPct(coste?pl/coste:null,1),pillCls:pl>=0?'up':'dn',v:(pl>=0?'+':'')+fmt(pl),vCls:pl>=0?'n-pos':'n-neg',s:'sobre lo que costó lo que tienes (FIFO)'})+
          nKpi({c:'#D97706',bg:'#FEF3C7',ic:'💰',t:'Dividendos/año (bruto)',pill:(valor?(divA/valor*100).toFixed(1).replace('.',','):'0')+' % RPD',v:fmt(divA),s:'con el dividendo por acción actual'})+
          nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'🎯',t:'Retorno total',pill:nPct(coste?ret/coste:null,1),pillCls:ret>=0?'up':'dn',v:(ret>=0?'+':'')+fmt(ret),vCls:ret>=0?'n-pos':'n-neg',s:'plusvalía <b>'+fmt(pl)+'</b> + dividendos cobrados <b>'+fmt(cobr)+'</b>'});
      }
      if(typeof renderPOS==='function') renderPOS();
      if(typeof renderRanking==='function') renderRanking();
    }catch(e){ console.error('n-cartera',e); }
  };
  if(typeof renderRanking==='function'){ var oR=renderRanking; renderRanking=function(){ oR.apply(this,arguments);
    try{ document.querySelectorAll('#rankTabla [data-rankblk="tarta"],#rankTabla [data-rankblk="evo"]').forEach(function(b){ b.style.display='none'; }); }catch(e){} }; }
})();
