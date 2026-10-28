/* APP NUEVA · Finanzas → Presupuesto (boceto 28-oct v3, cerrado por Carlos 15:39):
   la organización de hoy, con 4 ventanas de control arriba:
   Partidas que se pasan (mes en curso) · Último mes cerrado · Mes en curso (con la raya del ritmo) · Ahorro del año frente al objetivo. */
(function(){
  if(typeof renderPres!=='function') return;
  var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function ym(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function cats(){ var m={}; (DB.categorias||[]).forEach(function(c){ m[c.id]=c; }); return m; }
  /* presupuesto mensual por categoría de un año */
  function presMes(y){ var C=cats(), g={}, ing=0, gas=0; (DB.presupuesto||[]).forEach(function(p){ if(pAnio(p)!==y) return; var c=C[p.categoriaId]; if(!c) return; var v=mensual(p);
      if(c.tipo==='gasto'){ g[c.id]=(g[c.id]||0)+v; gas+=v; } else if(c.tipo==='ingreso') ing+=v; }); return {porCat:g, ing:ing, gas:gas}; }
  /* real de un mes (yyyy-mm) por categoría */
  function realMes(k){ var g={}, ing=0, gas=0; (DB.movimientos||[]).forEach(function(m){ if((m.fecha||'').slice(0,7)!==k) return; var e=_movBudget(m); ing+=e.ing; gas+=e.gas; if(e.gas) g[m.categoriaId]=(g[m.categoriaId]||0)+e.gas; }); return {porCat:g, ing:ing, gas:gas}; }
  function pc(x){ return Math.round(x*100)+' %'; }
  function kpis(){
    var hoy=new Date(), y=hoy.getFullYear(), kAct=ym(hoy), ant=new Date(y,hoy.getMonth()-1,1), kAnt=ym(ant);
    var P=presMes(y), Pant=presMes(ant.getFullYear()), C=cats();
    var Ra=realMes(kAct), Rp=realMes(kAnt);
    /* 1 · partidas que se pasan */
    var over=[]; Object.keys(P.porCat).forEach(function(id){ var b=P.porCat[id], r=Ra.porCat[id]||0; if(b>0&&r>b+0.005) over.push({n:(C[id]||{}).nombre||'—',e:r-b}); });
    over.sort(function(a,b){return b.e-a.e;}); var nPart=Object.keys(P.porCat).filter(function(id){return P.porCat[id]>0;}).length, exc=over.reduce(function(s,o){return s+o.e;},0);
    var k1=nKpi({c:over.length?'#DC2626':'#16A34A',bg:over.length?'#FEE2E2':'#DCFCE7',ic:'🚨',t:'Partidas que se pasan',pill:MES[hoy.getMonth()],
      v:over.length+' <span style="font-size:15px;color:#5B6B7C;font-weight:600">de '+nPart+' partidas</span>',s:over.length?('exceso total <b class="n-neg">+'+fmt(exc)+'</b> sobre lo presupuestado'):'ninguna por encima de lo presupuestado',
      p:over.slice(0,3).map(function(o){return o.n+' +'+fmt(o.e);}).join(' · ')+(over.length?' · pulsa para el desglose':'')});
    /* 2 · último mes cerrado */
    var dif=Pant.gas-Rp.gas, aho=Rp.ing-Rp.gas, ahoP=Pant.ing-Pant.gas;
    var k2=nKpi({c:'#1F4A9A',bg:'#EAF1FD',ic:'📅',t:MES[ant.getMonth()].charAt(0).toUpperCase()+MES[ant.getMonth()].slice(1)+' · cerrado',pill:(dif>=0?'✓ '+fmt(dif)+' bajo':fmt(-dif)+' sobre'),pillCls:dif>=0?'up':'dn',
      v:fmt(Rp.gas),s:'gastado de <b>'+fmt(Pant.gas)+'</b> presupuestados ('+(Pant.gas?pc(Rp.gas/Pant.gas):'—')+')',p:'ingresos '+fmt(Rp.ing)+' de '+fmt(Pant.ing)+' · ahorro '+fmt(aho)+' (previsto '+fmt(ahoP)+')'});
    /* 3 · mes en curso, con el ritmo */
    var dia=hoy.getDate(), dm=new Date(y,hoy.getMonth()+1,0).getDate(), ritmo=dia/dm, uso=P.gas?Ra.gas/P.gas:0;
    var barra='<span style="display:block;position:relative;height:8px;border-radius:99px;background:#EEF1F5;margin-top:6px"><i style="position:absolute;left:0;top:0;bottom:0;width:'+Math.min(100,uso*100).toFixed(1)+'%;border-radius:99px;background:'+(uso>ritmo?'#DC2626':'#16A34A')+'"></i><i style="position:absolute;top:-3px;bottom:-3px;width:2px;background:#142231;left:'+(ritmo*100).toFixed(1)+'%"></i></span>';
    var k3=nKpi({c:'#0D9488',bg:'#CCFBF1',ic:'⏱️',t:MES[hoy.getMonth()].charAt(0).toUpperCase()+MES[hoy.getMonth()].slice(1)+' · en curso',pill:'día '+dia+' de '+dm,
      v:fmt(Ra.gas),s:'gastado de <b>'+fmt(P.gas)+'</b> ('+pc(uso)+') · quedan '+fmt(P.gas-Ra.gas)+barra,p:'raya = lo que tocaría a día de hoy ('+pc(ritmo)+'): '+(uso>ritmo?'vas por encima del ritmo':'vas por debajo del ritmo')});
    /* 4 · ahorro del año */
    var ingY=0,gasY=0; for(var m=0;m<=hoy.getMonth();m++){ var r=realMes(y+'-'+String(m+1).padStart(2,'0')); ingY+=r.ing; gasY+=r.gas; }
    var ahoY=ingY-gasY, prevY=(P.ing-P.gas)*12, tasa=ingY?ahoY/ingY:null, tasaObj=P.ing?(P.ing-P.gas)/P.ing:null, sobre=tasa!=null&&tasaObj!=null&&tasa>=tasaObj;
    var k4=nKpi({c:'#16A34A',bg:'#DCFCE7',ic:'🐖',t:'Ahorro del año',pill:sobre?'▲ sobre objetivo':'▼ bajo objetivo',pillCls:sobre?'up':'dn',
      v:fmt(ahoY),s:'de <b>'+fmt(prevY)+'</b> previstos en el año ('+(prevY>0?pc(ahoY/prevY):'—')+')',p:'tasa de ahorro '+(tasa!=null?(tasa*100).toFixed(1).replace('.',',')+' %':'—')+' · objetivo '+(tasaObj!=null?(tasaObj*100).toFixed(1).replace('.',',')+' %':'—')});
    return '<div class="n-ctrl" id="nPresK"><div data-npk="over">'+k1+'</div><div>'+k2+'</div><div>'+k3+'</div><div>'+k4+'</div></div>';
  }
  function poner(){ try{
    var v=document.getElementById('view-presupuesto'), st=document.getElementById('presSubtabs'); if(!v||!st) return;
    var old=document.getElementById('nPresK'); if(old) old.remove();
    st.insertAdjacentHTML('beforebegin',kpis());
  }catch(e){ console.error('n-presupuesto',e); } }
  var o=renderPres; renderPres=function(){ o.apply(this,arguments); poner(); };
  if(typeof renderPresDesglose==='function'){ var od=renderPresDesglose; renderPresDesglose=function(){ od.apply(this,arguments); if(!document.getElementById('nPresK')) poner(); }; }
  document.addEventListener('click',function(e){ var k=e.target.closest&&e.target.closest('#nPresK [data-npk="over"]'); if(!k) return; var b=document.querySelector('#presSubtabs [data-ptab="desglose"]'); if(b) b.click(); });
})();
