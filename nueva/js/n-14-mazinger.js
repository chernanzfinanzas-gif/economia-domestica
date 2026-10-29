/* APP NUEVA · Mazinger Z (boceto 28-oct): las seis cifras con su icono y su borde de color, como el resto de pestañas */
(function(){
  if(typeof renderMazinger!=='function') return;
  var M={'Consumo medio':['⛽','#2563EB','#EAF1FD'],'Km recorridos':['🛣️','#0D9488','#CCFBF1'],'Litros totales':['🧪','#7C3AED','#EDE9FE'],
         'Gasto total':['💶','#DC2626','#FEE2E2'],'Coste medio':['📏','#D97706','#FEF3C7'],'Precio medio':['🏷️','#16A34A','#DCFCE7']};
  function miles(v){ return v.replace(/^(\d{4,})(?=[\s,])/,function(m){ return (+m).toLocaleString('es-ES',{useGrouping:'always'}); }); }
  var o=renderMazinger;
  renderMazinger=function(){
    o.apply(this,arguments);
    try{
      var k=document.querySelector('#view-mazinger .mz-kpis'); if(!k||k.classList.contains('n-ctrl')) return;
      var h=[].map.call(k.querySelectorAll('.mz-kpi'),function(x){ var l=(x.querySelector('.l')||{}).textContent||'', v=(x.querySelector('.v')||{}).textContent||''; var m=M[l.trim()]||['•','#64748B','#F1F5F9'];
        return nKpi({c:m[1],bg:m[2],ic:m[0],t:l,v:miles(v.trim())}); }).join('');
      k.innerHTML=h; k.className='mz-kpis n-ctrl n-mzk';
    }catch(e){ console.error('n-mazinger',e); }
  };
})();
