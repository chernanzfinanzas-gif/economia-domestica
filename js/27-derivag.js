/* ===== 27-derivag.js — El g implícito, vivo =====================================
   La insignia «📈 Reverse DCF» del Resumen del dossier enseña el crecimiento que el
   precio exigía EL DÍA DEL ANÁLISIS. Es una foto, y el número que más se mueve de
   todo el dossier: depende del precio, que cambia cada día.

   Aquí se vuelve a despejar con el precio VIVO. Entre el número del dossier y este
   solo cambia una cosa: la cotización. El FCL, el WACC, la g terminal, las acciones
   y la deuda son los de la tesis, congelados por `congelar_entradas.py` (herramienta
   05 - 05) en `reverseDcf.entradas` de cada [TICKER].json.

   POR QUÉ HAY UN SOLVER AQUÍ, HABIENDO UNO EN PYTHON
   ---------------------------------------------------
   Dos implementaciones de la misma cosa es justo lo que este sistema lleva meses
   pagando caro: `kh_filas` en trece skills, `empresas.json`, las dos matrices de
   sensibilidad. Así que la razón tiene que ser buena, y es esta:

     · Lo frágil del reverse DCF NO es el solver -son doce líneas de aritmética
       sobre una fórmula fija que no ha cambiado nunca-, sino la tabla de alias que
       lee las pestañas de Excel. Esa se queda en Python, en un solo sitio.
     · Y el solver de aquí NO se cree a sí mismo: antes de enseñar un número
       comprueba que reproduce el `gBase` que Python guardó con el `precioBase`. Si
       no lo reproduce, no enseña nada. Es la misma disciplina del `validado`,
       aplicada en el navegador.

   La alternativa era un puente JSON que la app leyera, y tenía un defecto peor: la
   app enseñaría lo que hubiera el día que ejecutaste la herramienta por última vez.
   El objetivo era medir un riesgo que crece sin que pase nada; un número que solo
   se actualiza cuando te acuerdas no lo mide.

   NUNCA INVENTA. Sin `entradas`, sin validación o sin precio vivo, devuelve null y
   la insignia se queda exactamente como está hoy. ============================== */

/* El mismo modelo de dos fases + Gordon que `reverse_dcf.py`: 5 años a g1, 5 a
   g2 = 0,7·g1, y valor terminal a gTV. Si se toca allí, hay que tocarlo aquí — y
   la autocomprobación de abajo lo cazará si no. */
function _dgEv(fcl, wacc, g1, g2, gtv){
  const fase=(f0,g)=>{ const r=(1+g)/(1+wacc);
    return (Math.abs(wacc-g)<1e-9) ? f0*(1+g)*5/(1+wacc) : f0*(1+g)*(1-Math.pow(r,5))/(wacc-g); };
  const f1=fase(fcl,g1);
  const fcl5=fcl*Math.pow(1+g1,5);
  const f2=fcl5/Math.pow(1+wacc,5)*(1+g2)*(1-Math.pow((1+g2)/(1+wacc),5))/(wacc-g2);
  const fcl10=fcl*Math.pow(1+g1,5)*Math.pow(1+g2,5);
  const tv=fcl10*(1+gtv)/(wacc-gtv);
  return f1+f2+tv/Math.pow(1+wacc,10);
}

/* Bisección entre −10% y +30%, igual que en Python. Devuelve el g1 en %. */
function _dgSolve(ev, fcl, wacc, gtv, ratio){
  let lo=-0.10, hi=0.30;
  for(let i=0;i<100;i++){
    const mid=(lo+hi)/2; let g2=(ratio||0.7)*mid; if(g2>=wacc) g2=wacc-0.005;
    if(_dgEv(fcl,wacc,mid,g2,gtv) < ev) lo=mid; else hi=mid;
  }
  return (lo+hi)/2*100;
}

/* El g que ese precio exige con las entradas congeladas de la tesis. */
function dgImplicito(e, precio){
  if(!e || !(precio>0)) return null;
  const fcl=+e.fcl, acc=+e.acciones;
  let wacc=+e.wacc; if(!(wacc>0)) return null; if(wacc>1) wacc=wacc/100;
  let gtv=(+e.gTV||2)/100; if(gtv>=wacc) gtv=Math.max(0,wacc-0.005);
  if(!(fcl>0) || !(acc>0)) return null;
  const ev=precio*acc+(+e.deudaNeta||0);
  return _dgSolve(ev, fcl, wacc, gtv, +e.ratioG2||0.7);
}

/* La autocomprobación. Sin esto, este fichero sería una segunda opinión sobre el
   mismo cálculo, y no hay forma de saber cuál de las dos miente. */
function dgFiable(e){
  if(!e || e.validado!==true || !(e.precioBase>0) || e.gBase==null) return false;
  const g=dgImplicito(e, +e.precioBase);
  return g!=null && Math.abs(g-(+e.gBase))<=0.05;
}

/* {g, precio, base, delta, tope} para un ticker, o null. `tope` avisa de que el
   solver ha topado en un extremo: ahí no ha resuelto, ha chocado. */
function dgDe(t){
  t=(t||'').toUpperCase(); if(!t) return null;
  const J=(typeof _tesisCache!=='undefined'&&_tesisCache)?_tesisCache[t]:null;
  const e=J&&J.reverseDcf&&J.reverseDcf.entradas;
  if(!e || !dgFiable(e)) return null;
  const v=(typeof DB!=='undefined'&&DB.valores&&DB.valores[t])||{};
  const p=(typeof num==='function')?num(v.precioActual):parseFloat(v.precioActual);
  if(!(p>0)) return null;
  const g=dgImplicito(e,p);
  if(g==null) return null;
  const tope=(g<=-9.99||g>=29.99);
  return {g:g, precio:p, base:+e.gBase, precioBase:+e.precioBase,
          fechaBase:e.fechaBase||J.fecha||null, delta:g-(+e.gBase), tope:tope,
          gInt:(J.reverseDcf.gIntrinseco!=null?+J.reverseDcf.gIntrinseco:null)};
}

/* Empresas con un hallazgo abierto que CLAVA el precio: una OPA, una exclusión, una
   fusión. Ahí el precio no descuenta flujos, descuenta la probabilidad de que la
   operación salga — y un reverse DCF sobre eso da un número impecable que no
   significa lo que parece. Le pasó a Azkoyen el 31-jul-2026. */
const _DG_ANCLAJES=['opa','exclusion','exclusión','fusion','fusión'];
let _dgAnclado={};
function dgAncladoDe(t){ return _dgAnclado[(t||'').toUpperCase()]||null; }
(function(){
  const leer=d=>{ const emp=(d&&d.empresas&&typeof d.empresas==='object')?d.empresas:d; if(!emp)return;
    Object.keys(emp).forEach(tk=>{ const v=emp[tk]; if(!v||!v.hallazgos)return;
      const h=v.hallazgos.find(x=>x&&x.estado==='activa'&&_DG_ANCLAJES.indexOf((''+(x.tipo||'')).toLowerCase())>=0);
      if(h) _dgAnclado[(tk||'').toUpperCase()]=(''+h.tipo).toUpperCase()+(h.abiertoEl?' del '+h.abiertoEl:''); }); };
  const carga=()=>fetch('hallazgos.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
    .then(d=>{ if(d) leer(d); }).catch(()=>{});
  document.addEventListener('DOMContentLoaded',carga); if(document.readyState!=='loading') carga();
})();

/* EL UMBRAL. Es el MISMO que `UMBRAL_S7_PP` en `deriva_g.py` y esta escrito dos
   veces: aqui y alli. Lo digo en voz alta porque es exactamente el problema del que
   este sistema lleva dias saliendo, y esta vez la copia es deliberada -la app no
   lee ningun puente de la herramienta, por diseno- pero sigue siendo una copia.
   CUANDO SE CALIBRE, HAY QUE CAMBIARLO EN LOS DOS SITIOS. Mientras tanto, que el
   chip pinte con un listón y la herramienta avise con otro seria peor: dos
   verdades sobre la misma cosa. */
const DG_UMBRAL_PP=1.5;

/* El texto que se cuelga de la insignia del dossier. Devuelve '' si no hay nada
   fiable que decir, que es lo que debe pasar mientras las entradas no estén
   publicadas. */
function dgInsignia(t){
  const d=dgDe(t); if(!d) return '';
  const anc=dgAncladoDe(t);
  const n=x=>(x>0?'+':'')+x.toFixed(2).replace('.',',')+'%';
  if(anc) return ' <span title="Hay una '+anc+' abierta: la cotización está clavada al precio de la operación y ya no descuenta flujos futuros. El g implícito de hoy no mide crecimiento." style="cursor:help;font-size:12px;background:#64748b;color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">📈 hoy '+n(d.g)+' · precio anclado</span>';
  if(d.tope) return ' <span title="El precio de hoy queda fuera del rango que este modelo puede resolver (−10%…+30%): no es que el crecimiento exigido sea ese, es que el modelo ha topado." style="cursor:help;font-size:12px;background:#64748b;color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">📈 hoy fuera de rango</span>';
  const sube=d.delta>=DG_UMBRAL_PP, baja=d.delta<=-DG_UMBRAL_PP;
  const col=sube?'#dc2626':(baja?'#16a34a':'#64748b');
  const lect=sube?'La banda se ha ESTRECHADO: el mercado exige más que el día del análisis y tu margen de seguridad es menor, sin que ningún número de la tesis haya cambiado.'
            :(baja?'La banda se ha ABIERTO: el mercado exige menos que el día del análisis. O hay oportunidad, o el mercado sabe algo que tú no.'
            :'Sin cambios relevantes desde el análisis.');
  const tip=(lect+'\n\nHoy '+n(d.g)+' a '+d.precio+' € · el '+(d.fechaBase||'análisis')+' era '+n(d.base)+' a '+d.precioBase+' €.'
    +(d.gInt!=null?('\ng intrínseco (autofinanciable) '+n(d.gInt)+'.'):'')
    +'\n\nSolo cambia el precio: las entradas del modelo son las de la tesis.').replace(/"/g,'&quot;');
  return ' <span title="'+tip+'" style="cursor:help;font-size:12px;background:'+col+';color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">📈 hoy '+n(d.g)+' <span style="opacity:.85">('+(d.delta>0?'+':'')+d.delta.toFixed(1).replace('.',',')+' pp)</span></span>';
}
