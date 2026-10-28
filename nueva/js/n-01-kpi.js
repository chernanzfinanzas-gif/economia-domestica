/* APP NUEVA · ayudas comunes para las cifras de arriba de cada pestaña */
function nKpi(o){
  var pill = o.pill ? '<span class="n-pill '+(o.pillCls||'')+'">'+o.pill+'</span>' : '';
  return '<div class="n-w" style="--c:'+o.c+';--bg:'+o.bg+'"><div class="n-wh"><span class="n-wi">'+o.ic+'</span><span class="n-wt">'+o.t+'</span>'+pill+'</div>'+
    '<span class="n-wv'+(o.vCls?' '+o.vCls:'')+'">'+o.v+'</span>'+(o.s?'<span class="n-ws">'+o.s+'</span>':'')+(o.p?'<span class="n-wp">'+o.p+'</span>':'')+'</div>';
}
function nPct(x,dec){ if(x==null||!isFinite(x)) return '—'; var v=(x*100).toFixed(dec==null?1:dec).replace('.',','); return (x>=0?'+':'')+v+' %'; }
