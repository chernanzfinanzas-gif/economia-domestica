/* ============================================================================
   34-divisa.js — «¿Invertir en euros?» (grupo Radar · 20-oct-2026)
   Simulador: qué le pasa a la rentabilidad de una acción que cotiza en DÓLARES
   cuando la mides en EUROS. Separa cuatro efectos: la acción (en $), el dólar,
   las comisiones de cambio y la retención americana no recuperada.
   Supuestos (a la vista en la pantalla): dividendos al final de cada año, sin
   reinvertir, convertidos al cambio de ese año (lineal entre compra y venta);
   la fiscalidad española es la misma que con una acción española y no se resta.
   El EUR/USD de hoy sale de macro-mercado.json (repo).
   ============================================================================ */
(function(){
var DV={ fxHoy:null, fxF:'', v:{eur:1000, p0:100, p1:110, fx0:null, fx1:null, anios:3, div:2, fee:0.25, ret:15, recupera:true} };

function nf(v,nd){ if(v==null||!isFinite(v))return '—'; return Number(v).toLocaleString('es-ES',{minimumFractionDigits:nd||0,maximumFractionDigits:nd||0}); }
function pc(v,nd){ return (v==null||!isFinite(v))?'—':((v>0?'+':'')+nf(v*100,nd==null?1:nd)+' %'); }
function col(v){ return v>0.0005?'#15803d':(v<-0.0005?'#b91c1c':'#334155'); }

/* núcleo: rentabilidad en euros para unos parámetros */
function calc(p){
  var fee=p.fee/100, ret=p.ret/100, Y=Math.max(1,Math.round(p.anios));
  var perdida=p.recupera?Math.max(0,ret-0.15):ret;          /* lo que no se recupera en la declaración */
  var usd=p.eur*p.fx0*(1-fee);                               /* € → $ al comprar */
  var n=usd/p.p0, divE=0, divU=0;
  for(var y=1;y<=Y;y++){
    var fxy=p.fx0+(p.fx1-p.fx0)*y/Y, d=n*p.div*(1-perdida);
    divU+=d; divE+=d/fxy*(1-fee);
  }
  var ventaE=n*p.p1/p.fx1*(1-fee);
  var tot=ventaE+divE;
  return {n:n, usd:usd, ventaE:ventaE, divE:divE, divU:divU, tot:tot, r:tot/p.eur-1, ra:Math.pow(Math.max(tot,0)/p.eur,1/Y)-1};
}
function desglose(p){
  var q=function(o){ var x={}; for(var k in p)x[k]=p[k]; for(var j in o)x[j]=o[j]; return x; };
  var s1=calc(q({fee:0, fx1:p.fx0, ret:0, recupera:true}));     /* solo la acción, en dólares */
  var s2=calc(q({fee:0, ret:0, recupera:true}));                 /* + el dólar */
  var s3=calc(q({ret:0, recupera:true}));                        /* + comisiones de cambio */
  var s4=calc(p);                                                /* + retención no recuperada */
  return {accion:s1.r, divisa:s2.r-s1.r, comis:s3.r-s2.r, reten:s4.r-s3.r, total:s4.r, s4:s4, s1:s1};
}

function css(){
  if(document.getElementById('divisa-css'))return;
  var s=document.createElement('style'); s.id='divisa-css';
  s.textContent='.dvx-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:0 0 12px}'+
  '.dvx-g label{font-size:11.5px;color:#475569;display:flex;flex-direction:column;gap:3px}.dvx-g input[type=number]{border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;font-size:14px;width:100%;box-sizing:border-box}'+
  '.dvx-g .ck{flex-direction:row;align-items:center;gap:6px}.dvx-r{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 12px}'+
  '.dvx-r .c{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px 12px}.dvx-r .l{font-size:11px;color:#6b7280}.dvx-r .v{font-size:20px;font-weight:800}.dvx-r .p{font-size:10.5px;color:#94a3b8}'+
  '.dvx-r .c.tot{border:2px solid #0f766e}.dvx-t{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow-x:auto;margin:0 0 12px}.dvx-t table{border-collapse:collapse;width:100%;font-size:12.5px}'+
  '.dvx-t th,.dvx-t td{padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap}.dvx-t th{background:#f8fafc;font-size:11px;color:#475569}.dvx-t td.l,.dvx-t th.l{text-align:left}.dvx-t tr.hoy td{background:#f0fdf4;font-weight:700}'+
  '.dvx-h{font-size:14px;font-weight:800;margin:16px 0 6px}.dvx-n{font-size:11.5px;color:#64748b;line-height:1.5;margin:0 0 10px}.dvx-box{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.5;margin:0 0 12px}'+
  '.dvx-bar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:#f1f5f9;margin:6px 0 2px}.dvx-bar span{display:block;height:100%}';
  document.head.appendChild(s);
}

function cargarFx(){
  if(DV.fxHoy)return Promise.resolve();
  return fetch('macro-mercado.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
    var e=j&&j.ind&&j.ind.eur_usd; if(e&&e.v){ DV.fxHoy=e.v; DV.fxF=e.f||''; }
  }).catch(function(){});
}

window.renderDivisa=function(){
  var sec=document.getElementById('view-divisa'); if(!sec)return; css();
  cargarFx().then(function(){
    var v=DV.v, h=DV.fxHoy||1.10;
    if(v.fx0==null)v.fx0=Math.round(h*10000)/10000;
    if(v.fx1==null)v.fx1=v.fx0;
    var inp=function(k,l,step,extra){ return '<label>'+l+'<input type="number" step="'+step+'" data-dv="'+k+'" value="'+v[k]+'"'+(extra||'')+'></label>'; };
    sec.innerHTML='<div class="vhero g-ocean"><div class="vhero-main"><span class="vhero-ic">💱</span><div class="vhero-txt"><h2>¿Invertir en euros?</h2><p>Qué le pasa a lo que ganas con una acción que cotiza en <b>dólares</b> cuando lo cuentas en <b>euros</b>: la acción, el dólar, las comisiones de cambio y la retención americana, por separado. Cambia los números y se recalcula solo.</p></div></div></div>'+
      '<div class="dvx-g">'+
        inp('eur','Inviertes (€)','100',' min="0"')+inp('p0','Precio al comprar ($)','1',' min="0"')+inp('p1','Precio al vender ($)','1',' min="0"')+inp('anios','Años que la tienes','1',' min="1" max="40"')+
        inp('fx0','EUR/USD al comprar ($ por 1 €)','0.01',' min="0.5" max="2"')+inp('fx1','EUR/USD al vender','0.01',' min="0.5" max="2"')+
        inp('div','Dividendo por acción y año ($)','0.1',' min="0"')+inp('fee','Comisión de cambio (% cada vez)','0.05',' min="0" max="5"')+
        inp('ret','Retención en EE. UU. (%)','1',' min="0" max="40"')+
        '<label class="ck"><input type="checkbox" data-dv="recupera"'+(v.recupera?' checked':'')+'> Recupero hasta el 15 % en mi declaración (doble imposición)</label>'+
      '</div>'+
      '<div class="dvx-n">EUR/USD de hoy: <b>'+nf(h,4)+'</b> $ por euro'+(DV.fxF?' ('+DV.fxF.slice(8,10)+'-'+DV.fxF.slice(5,7)+')':'')+'. Un número <b>más alto</b> al vender = el euro se ha hecho más fuerte = el dólar vale menos = <b>pierdes</b> al volver a euros.</div>'+
      '<div id="dvRes"></div>';
    pintar();
  });
  if(!sec._dv){ sec._dv=true;
    sec.addEventListener('input',function(e){ var k=e.target.getAttribute('data-dv'); if(!k)return;
      if(k==='recupera')DV.v.recupera=e.target.checked; else { var x=parseFloat((e.target.value||'').replace(',','.')); if(isFinite(x))DV.v[k]=x; } pintar(); });
    sec.addEventListener('change',function(e){ if(e.target.getAttribute('data-dv')==='recupera'){ DV.v.recupera=e.target.checked; pintar(); } });
  }
};

function pintar(){
  var R=document.getElementById('dvRes'); if(!R)return; var p=DV.v;
  if(!(p.eur>0&&p.p0>0&&p.p1>=0&&p.fx0>0&&p.fx1>0)){ R.innerHTML='<div class="dvx-n">Rellena los importes con números mayores que cero.</div>'; return; }
  var d=desglose(p), s=d.s4, Y=Math.max(1,Math.round(p.anios));
  var tarj=function(l,v,sub,cls){ return '<div class="c'+(cls?' '+cls:'')+'"><div class="l">'+l+'</div><div class="v" style="color:'+col(v)+'">'+pc(v,1)+'</div><div class="p">'+sub+'</div></div>'; };
  var h='<div class="dvx-r">'+
    tarj('La acción (en $)',d.accion,'precio + dividendos, sin tocar el euro')+
    tarj('El dólar',d.divisa,'EUR/USD de '+nf(p.fx0,2)+' a '+nf(p.fx1,2))+
    tarj('Comisiones de cambio',d.comis,nf(p.fee,2)+' % × '+(2+(p.div>0?Y:0))+' cambios')+
    tarj('Retención no recuperada',d.reten,p.recupera?('solo lo que pase del 15 %'):'toda la retención')+
    tarj('Total en euros',d.total,nf(s.tot,0)+' € de '+nf(p.eur,0)+' € · '+pc(s.ra,1)+'/año','tot')+
  '</div>';
  /* barra de reparto */
  var parts=[['La acción',d.accion,'#2563eb'],['El dólar',d.divisa,'#d97706'],['Comisiones',d.comis,'#94a3b8'],['Retención',d.reten,'#b91c1c']];
  var sumAbs=parts.reduce(function(a,x){return a+Math.abs(x[1]);},0)||1;
  h+='<div class="dvx-n" style="margin-bottom:2px">De dónde sale el resultado (tamaño = peso de cada efecto, ganancia o pérdida):</div><div class="dvx-bar">'+
    parts.map(function(x){ return '<span title="'+x[0]+' '+pc(x[1],1)+'" style="width:'+(Math.abs(x[1])/sumAbs*100)+'%;background:'+x[2]+';opacity:'+(x[1]<0?0.55:1)+'"></span>'; }).join('')+'</div>'+
    '<div class="dvx-n">'+parts.map(function(x){ return '<span style="color:'+x[2]+'">■</span> '+x[0]+' '+pc(x[1],1); }).join(' · ')+'</div>';
  /* qué pasa con el dólar: tabla de EUR/USD al vender */
  var base=p.fx0, filas=[], pasos=[-0.20,-0.15,-0.10,-0.05,0,0.05,0.10,0.15,0.20];
  pasos.forEach(function(k){ var fx=Math.round(base*(1+k)*100)/100; var o={}; for(var j in p)o[j]=p[j]; o.fx1=fx; var c=calc(o);
    filas.push('<tr'+(Math.abs(fx-p.fx1)<0.005?' class="hoy"':'')+'><td class="l">'+nf(fx,2)+' $</td><td class="l">'+(k<0?'el dólar sube un '+nf(-k*100/(1+k),0)+' %':(k>0?'el dólar baja un '+nf(k*100/(1+k),0)+' %':'igual que al comprar'))+'</td>'+
      '<td>'+nf(c.tot,0)+' €</td><td style="color:'+col(c.r)+'">'+pc(c.r,1)+'</td><td style="color:'+col(c.ra)+'">'+pc(c.ra,1)+'</td></tr>'); });
  h+='<div class="dvx-h">La misma inversión según dónde esté el dólar al vender</div>'+
    '<div class="dvx-t"><table><thead><tr><th class="l">EUR/USD al vender</th><th class="l">frente al día de compra</th><th>Recuperas</th><th>Total</th><th>Al año</th></tr></thead><tbody>'+filas.join('')+'</tbody></table></div>'+
    '<div class="dvx-n">Como referencia de cuánto se mueve: el euro llegó a valer unos 1,60 $ en 2008 y bajó de 1 $ en 2022. Un movimiento así, por sí solo, puede convertir una ganancia en pérdida.</div>';
  /* comparación con una acción en euros */
  h+='<div class="dvx-h">Comparado con una acción que cotiza en euros</div>'+
    '<div class="dvx-t"><table><thead><tr><th class="l"></th><th>Total</th><th>Al año</th><th class="l">Qué la mueve</th></tr></thead><tbody>'+
    '<tr><td class="l">Acción en euros con la misma subida y dividendo</td><td style="color:'+col(d.s1.r)+'">'+pc(d.s1.r,1)+'</td><td>'+pc(d.s1.ra,1)+'</td><td class="l">sólo la empresa (y tu comisión de compraventa)</td></tr>'+
    '<tr><td class="l">Acción americana (en dólares)</td><td style="color:'+col(d.total)+'"><b>'+pc(d.total,1)+'</b></td><td>'+pc(s.ra,1)+'</td><td class="l">la empresa + el dólar − comisiones de cambio − retención</td></tr>'+
    '</tbody></table></div>';
  h+='<div class="dvx-box"><b>¿Y ArcelorMittal?</b> En la Bolsa de Madrid cotiza en <b>euros</b>: la compras y la vendes sin cambiar moneda, así que no pagas comisión de cambio ni hay retención americana. Pero sus <b>cuentas van en dólares</b> (vende acero en dólares), así que el euro/dólar le afecta por dentro: si el dólar baja, sus beneficios valen menos euros y eso acaba en el precio. Es exposición al dólar <b>indirecta</b>; la de esta pestaña es la <b>directa</b>, la de comprar en Nueva York.</div>'+
    '<div class="dvx-n">Supuestos: dividendos al final de cada año, sin reinvertir, cambiados al EUR/USD de ese año (en línea recta entre el de compra y el de venta); una comisión de cambio en la compra, en cada dividendo y en la venta; la retención americana es el 15 % con el formulario W-8BEN (30 % sin él), y España deja descontar hasta ese 15 %. Los impuestos españoles no se restan porque son los mismos que con una acción española. No incluye la comisión de compraventa del bróker. Es una simulación con tus números, no una previsión.</div>';
  R.innerHTML=h;
}
})();
