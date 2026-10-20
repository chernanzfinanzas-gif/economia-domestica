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
var DV={ fxHoy:null, fxF:'', ej:null, ejT:0, real:{tk:'KO', anio:2016}, v:{eur:1000, p0:100, p1:110, fx0:null, fx1:null, anios:3, div:2, fee:0.25, ret:15, recupera:true} };

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
      '<div id="dvRes"></div>'+
      '<div class="dvx-h" style="font-size:16px;margin-top:26px">📈 Caso real</div>'+
      '<div class="dvx-n">Lo que habría pasado de verdad, con los precios, los dividendos y el EUR/USD de cada mes (Yahoo, se actualiza solo una vez al mes). Usa tu importe, tu comisión de cambio y tu retención de arriba.</div>'+
      '<div id="dvReal"><div class="dvx-n">Cargando…</div></div>';
    pintar(); cargarEj().then(pintarReal);
  });
  if(!sec._dv){ sec._dv=true;
    sec.addEventListener('input',function(e){ var k=e.target.getAttribute('data-dv'); if(!k)return;
      if(k==='recupera')DV.v.recupera=e.target.checked; else { var x=parseFloat((e.target.value||'').replace(',','.')); if(isFinite(x))DV.v[k]=x; } pintar(); if(k==='eur'||k==='fee'||k==='ret'||k==='recupera')pintarReal(); });
    sec.addEventListener('change',function(e){
      if(e.target.getAttribute('data-dv')==='recupera'){ DV.v.recupera=e.target.checked; pintar(); pintarReal(); return; }
      var r=e.target.getAttribute('data-dvr'); if(r){ DV.real[r]=(r==='anio')?parseInt(e.target.value,10):e.target.value; pintarReal(); } });
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

/* ---------------------------------------------------------------- caso real */
function cargarEj(){
  if(DV.ej && Date.now()-DV.ejT<30*60*1000) return Promise.resolve();
  return fetch('divisa/ejemplos.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; })
    .then(function(j){ DV.ej=j; DV.ejT=Date.now(); }).catch(function(){ DV.ej=null; });
}
function mapa(L){ var m={}; (L||[]).forEach(function(x){ m[x[0]]=x[1]; }); return m; }
function fxDe(FX,mes){ if(FX[mes]!=null)return FX[mes]; var ks=Object.keys(FX).sort(), r=null; for(var i=0;i<ks.length;i++){ if(ks[i]<=mes)r=FX[ks[i]]; else break; } return r; }
/* o: {fee, perdida, fxFijo} -> resultado del caso real */
function calcReal(E,FX,m0,o,eur){
  var P=mapa(E.precios), meses=Object.keys(P).sort().filter(function(m){ return m>=m0; });
  var fx0=fxDe(FX,m0), p0=P[m0]; if(!fx0||!p0)return null;
  var fee=o.fee, n=eur*fx0*(1-fee)/p0, divE=0, divU=0, porAnio={};
  var mL=meses[meses.length-1];
  (E.dividendos||[]).forEach(function(d){ var mes=d[0].slice(0,7); if(mes<=m0||mes>mL)return;
    var u=n*d[1]*(1-o.perdida), fx=o.fxFijo?fx0:fxDe(FX,mes); divU+=u; divE+=u/fx*(1-fee);
    var y=mes.slice(0,4); porAnio[y]=porAnio[y]||{u:0,e:0}; porAnio[y].u+=u; porAnio[y].e+=u/fx*(1-fee); });
  var fxL=o.fxFijo?fx0:fxDe(FX,mL), pL=P[mL], venta=n*pL/fxL*(1-fee), tot=venta+divE;
  var anios=(parseInt(mL.slice(0,4),10)+(parseInt(mL.slice(5,7),10)-1)/12)-(parseInt(m0.slice(0,4),10)+(parseInt(m0.slice(5,7),10)-1)/12);
  return {n:n,p0:p0,fx0:fx0,pL:pL,fxL:fxL,mL:mL,divE:divE,divU:divU,venta:venta,tot:tot,r:tot/eur-1,
          ra:anios>0?Math.pow(Math.max(tot,0)/eur,1/anios)-1:null,anios:anios,P:P,porAnio:porAnio,meses:meses};
}
function pintarReal(){
  var R=document.getElementById('dvReal'); if(!R)return; var J=DV.ej;
  if(!J||!J.empresas){ R.innerHTML='<div class="dvx-box">Los datos reales llegan al repositorio con una tarea automática de GitHub (Yahoo). Si acabas de publicar, tarda unos minutos la primera vez; luego se refrescan solos cada mes.</div>'; return; }
  var FX=mapa(J.eurusd), tks=Object.keys(J.empresas), r=DV.real; if(tks.indexOf(r.tk)<0)r.tk=tks[0];
  var E=J.empresas[r.tk], P=mapa(E.precios), ms=Object.keys(P).sort();
  var a0=parseInt(ms[0].slice(0,4),10), aL=parseInt(ms[ms.length-1].slice(0,4),10)-1; if(r.anio<a0)r.anio=a0; if(r.anio>aL)r.anio=aL;
  var m0=ms.filter(function(m){ return m>=String(r.anio)+'-01' && fxDe(FX,m); })[0];
  var v=DV.v, fee=v.fee/100, ret=v.ret/100, perd=v.recupera?Math.max(0,ret-0.15):ret, eur=v.eur;
  var s1=calcReal(E,FX,m0,{fee:0,perdida:0,fxFijo:true},eur), s2=calcReal(E,FX,m0,{fee:0,perdida:0,fxFijo:false},eur),
      s3=calcReal(E,FX,m0,{fee:fee,perdida:0,fxFijo:false},eur), s4=calcReal(E,FX,m0,{fee:fee,perdida:perd,fxFijo:false},eur);
  if(!s4){ R.innerHTML='<div class="dvx-n">No hay datos para ese mes.</div>'; return; }
  var mes=function(m){ var M=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return M[parseInt(m.slice(5,7),10)-1]+' '+m.slice(0,4); };
  var selE='<select data-dvr="tk">'+tks.map(function(t){ return '<option value="'+t+'"'+(t===r.tk?' selected':'')+'>'+J.empresas[t].nombre+' ('+t+')</option>'; }).join('')+'</select>';
  var anos=[]; for(var y=a0;y<=aL;y++)anos.push(y);
  var selA='<select data-dvr="anio">'+anos.map(function(y){ return '<option value="'+y+'"'+(y===r.anio?' selected':'')+'>'+y+'</option>'; }).join('')+'</select>';
  var tarj=function(l,x,sub,cls){ return '<div class="c'+(cls?' '+cls:'')+'"><div class="l">'+l+'</div><div class="v" style="color:'+col(x)+'">'+pc(x,1)+'</div><div class="p">'+sub+'</div></div>'; };
  var h='<div class="dvx-g" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><label>Empresa'+selE+'</label><label>Comprada en enero de'+selA+'</label></div>'+
    '<div class="dvx-n">Compra: '+mes(m0)+' a <b>'+nf(s4.p0,2)+' $</b> con el euro a <b>'+nf(s4.fx0,4)+' $</b> → '+nf(s4.n,2)+' acciones por '+nf(eur,0)+' €. '+
    'Hoy ('+mes(s4.mL)+'): <b>'+nf(s4.pL,2)+' $</b> con el euro a <b>'+nf(s4.fxL,4)+' $</b>. '+nf(s4.anios,1)+' años.</div>'+
    '<div class="dvx-r">'+
      tarj('La acción (en $)',s1.r,'precio + dividendos cobrados')+
      tarj('El dólar',s2.r-s1.r,'EUR/USD de '+nf(s4.fx0,2)+' a '+nf(s4.fxL,2))+
      tarj('Comisiones de cambio',s3.r-s2.r,nf(v.fee,2)+' % en cada cambio')+
      tarj('Retención no recuperada',s4.r-s3.r,v.recupera?'solo lo que pase del 15 %':'toda la retención')+
      tarj('Total en euros',s4.r,nf(s4.tot,0)+' € de '+nf(eur,0)+' €'+(s4.ra!=null?' · '+pc(s4.ra,1)+'/año':''),'tot')+
    '</div>';
  /* año a año: valor en € real frente a «si el euro no se hubiera movido» */
  var filas=[], cumU=0, cumE=0, y0=parseInt(m0.slice(0,4),10), yL=parseInt(s4.mL.slice(0,4),10);
  for(var y2=y0;y2<=yL;y2++){
    var mf=(y2===yL)?s4.mL:(String(y2)+'-12'); if(!s4.P[mf])continue;
    var pa=s4.porAnio[String(y2)]; if(pa){ cumU+=pa.u; cumE+=pa.e; }
    var fx=fxDe(FX,mf), valU=s4.n*s4.P[mf]+cumU, valE=s4.n*s4.P[mf]/fx*(1-fee)+cumE, fijo=valU/s4.fx0;
    filas.push('<tr><td class="l">'+(y2===yL?mes(mf):'dic '+y2)+'</td><td>'+nf(s4.P[mf],2)+' $</td><td>'+nf(fx,3)+'</td><td>'+nf(valU,0)+' $</td><td><b>'+nf(valE,0)+' €</b></td><td>'+nf(fijo,0)+' €</td><td style="color:'+col(valE-fijo)+'">'+(valE-fijo>0?'+':'')+nf(valE-fijo,0)+' €</td></tr>');
  }
  h+='<div class="dvx-h">Año a año</div><div class="dvx-t"><table><thead><tr><th class="l">Fin de</th><th>Precio</th><th>EUR/USD</th><th>Vale en $</th><th>Vale en €</th><th title="el valor en dólares pasado a euros al cambio del día de compra">Si el euro no se moviera</th><th>Lo que pone o quita el dólar</th></tr></thead><tbody>'+filas.join('')+'</tbody></table></div>'+
    '<div class="dvx-n">«Vale» = las acciones a precio de ese momento + los dividendos cobrados hasta entonces (sin reinvertir). La última columna es solo el efecto del cambio de moneda. Fuente: '+esc(J.fuente||'Yahoo')+', datos del '+esc((J.generado||'').slice(0,10))+'. Rentabilidad pasada, no futura.</div>';
  R.innerHTML=h;
}
function esc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
})();
