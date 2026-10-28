/* APP NUEVA · Fondo R4 (boceto 28-oct): tarjeta con el logo de Renta 4 y las 4 cifras con el estilo nuevo.
   Las cifras las sigue calculando el renderFondoR4 de siempre; aquí solo se viste. */
(function(){
  if(typeof renderFondoR4!=='function') return;
  var o=renderFondoR4, IC=['💶','📈','⏱️','📅'];
  renderFondoR4=function(){
    o.apply(this,arguments);
    try{
      var c=document.getElementById('r4Cards'); if(!c) return;
      c.classList.add('n-r4');
      [].forEach.call(c.querySelectorAll('.r4-kpi'),function(k,i){ var l=k.querySelector('.l'); if(l&&!l.querySelector('.n-wi')) l.insertAdjacentHTML('afterbegin','<span class="n-wi">'+(IC[i]||'•')+'</span>'); });
      var e=(typeof r4ExtCalcGuardado==='function')?r4ExtCalcGuardado():null;
      var g=(typeof r4ExtGuardado==='function')?r4ExtGuardado():null;
      var card=document.getElementById('nR4Logo');
      if(!card){ card=document.createElement('div'); card.id='nR4Logo'; card.className='n-r4logo'; c.parentNode.insertBefore(card,c); }
      card.innerHTML='<img src="nueva/img/r4logo.png" alt="Renta 4 Banco"><div class="n-r4t"><b>Renta 4 Foncuenta</b><span>Tu liquidez remunerada'+
        (e?' · extracto al '+ddmmyyyy(e.hasta)+(g&&g.movs?' · '+g.movs.length+' apuntes':''):' · sin extracto guardado')+'</span>'+
        (e&&e.pctAnual!=null?'<em>⏱️ '+e.pctAnual.toFixed(2).replace('.',',')+' % anual</em>':'')+'</div>';
    }catch(err){ console.error('n-r4',err); }
  };
})();
