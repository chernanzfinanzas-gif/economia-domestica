/* ===== 29-coyuntura.js — Coyuntura de mercado (fase B) =====
   Panel de contexto: qué está haciendo el mundo con el dinero de esta cartera, y si eso cambia lo
   que se compra. Sale de DOS puentes, nunca de uno:
     · macro.json          — lo escribe el skill del informe semanal, llega por el buzón.
     · macro-mercado.json  — lo escribe un workflow de GitHub Actions, se commitea solo (aún no existe).
   Comparten formato y se funden al leer. Dos escritores sobre un mismo fichero chocarían: el workflow
   hace `git pull --rebase` desde Actions y el skill publica desde el PC.

   Tres reglas que vienen de errores ya pagados en esta app:
     1. Un dato ausente es `estado:"pte"`, NUNCA 0. Un 0 se lee como una medición (ver el −100 % de las
        posiciones sin cotización).
     2. El panel dice la EDAD del dato y avisa cuando envejece. Si pasan semanas sin lanzar el informe,
        enseñar el Euríbor de hace un mes como si fuera de hoy convierte el panel en una trampa.
     3. Las variaciones NO llevan color de juicio: el gas caro es ingreso para NTGY y coste para VIS.
        El signo depende de la empresa, así que lo explica el texto, no un semáforo.

   El render es DATA-DRIVEN: los bloques se construyen desde el campo `grupo` de cada indicador. Si el
   skill añade un indicador nuevo, aparece en el panel sin tocar este fichero. */

var _macroInf=null, _macroMkt=null;
const COY_GRUPOS=[
  {id:'tipos',    ic:'🏦', t:'Tipos de interés', sub:'Mueven a la banca y a los seguros en un sentido y a las utilities reguladas en el contrario.'},
  {id:'energia',  ic:'⚡', t:'Energía',          sub:'Ingreso para las energéticas y coste para las industrias intensivas. El signo depende de la empresa.'},
  {id:'bolsa',    ic:'📊', t:'Bolsa',            sub:'El nivel del índice alimenta el factor BOLSA de Escenarios, el de más peso en esta cartera.'},
  {id:'inflacion',ic:'📈', t:'Inflación y actividad', sub:'El plan de inversión está en euros nominales: la inflación se come parte de lo que rinde.'},
  {id:'divisas',  ic:'💱', t:'Divisas',          sub:''}
];

/* Carga memoizada, patrón de puente de la app: `no-store` porque Pages sirve por CDN, fallo silencioso
   a vacío para que la vista siga funcionando sin el fichero, y repintado cuando llegue. */
function _coyCargar(){
  if(_macroInf!==null&&_macroMkt!==null) return Promise.resolve(true);
  const uno=(f)=>fetch(f,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  return Promise.all([uno('macro.json'),uno('macro-mercado.json')]).then(function(a){
    _macroInf=a[0]||{ind:{}}; _macroMkt=a[1]||{ind:{}};
    return true;
  });
}
/* Fusión: el fichero de mercado pisa al del informe SOLO donde trae dato, porque es más fresco
   (diario contra semanal). Donde calla, manda el informe. */
function _coyInd(){
  const out={};
  const meter=(src,origen)=>{ const I=(src&&src.ind)||{}; Object.keys(I).forEach(k=>{ const o=I[k]; if(!o)return;
    if(out[k]&&(o.v==null||o.estado==='pte'))return; out[k]=Object.assign({},o,{_org:origen,_k:k}); }); };
  meter(_macroInf,'informe'); meter(_macroMkt,'mercado');
  return out;
}
function _coyFmt(o){
  if(o.v==null) return '—';
  const v=num(o.v);
  let t;
  if(Math.abs(v)>=10000) t=Math.round(v).toLocaleString('es-ES');
  else if(Math.abs(v)>=100) t=v.toLocaleString('es-ES',{maximumFractionDigits:1});
  /* [25-ago-2026] `minimumFractionDigits:2` pintaba «45,00 pb» para una prima de riesgo que es un
     entero. Se deja que el número diga cuántos decimales tiene: 2,939 sigue siendo 2,939. */
  else t=v.toLocaleString('es-ES',{maximumFractionDigits:4});
  return t+(o.u?(o.u.charAt(0)==='%'||o.u.charAt(0)==='$'?' '+o.u:' '+o.u):'');
}
function _coyDelta(o){
  if(o.d==null||o.v==null) return o.nota?('<span class="coy-nota">'+_coyEsc(o.nota)+'</span>'):'';
  const d=num(o.d);
  const arw=d>0?'▲':(d<0?'▼':'·');
  const txt=(d>0?'+':'')+d.toLocaleString('es-ES',{maximumFractionDigits:2})+' '+(o.dU||'')+(o.dPer?(' '+o.dPer):'');
  return '<span class="coy-arw">'+arw+'</span>'+txt+(o.nota?('<span class="coy-nota"> · '+_coyEsc(o.nota)+'</span>'):'');
}
function _coyEsc(s){ return (s==null?'':''+s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* Edad del dato. Regla 2: a partir de 14 días el panel lo dice en alto.
   [26-ago-2026] Hay DOS relojes, y enseñar solo uno miente en las dos direcciones: con el
   fichero diario en marcha, decir «datos del 14-ago» envejece el IBEX y el VIX que son de hoy;
   y al revés, poner solo la fecha del diario haría pasar por fresco el IPC del informe. Cada
   tarjeta ya dice su fuente («auto» = mercado); la cabecera dice las dos fechas, y el aviso de
   antigüedad se refiere a lo que SOLO trae el informe, que es lo que de verdad envejece. */
function _coyEdad(){
  const f=(_macroInf&&_macroInf.generadoEl)||'';
  /* [26-ago-2026] La fecha del bloque de mercado NO es su `generadoEl`: ese es cuándo se lanzó
     el pase, y el pase de las 06:00 publica los cierres de la VÍSPERA. Poner la fecha de
     generación rejuvenecía el dato un día entero — la misma clase de mentira, más pequeña, que
     el intradía firmado como cierre. Se usa el cierre más reciente que trae el fichero. */
  let m='';
  const MI=(_macroMkt&&_macroMkt.ind)||{};
  Object.keys(MI).forEach(function(k){ const x=MI[k]; if(x&&x.f&&x.f>m)m=x.f; });
  if(!m) m=(_macroMkt&&_macroMkt.generadoEl)||'';
  /* [26-ago-2026 · fase F] El aviso de antigüedad ya NO mira `generadoEl` del informe, y esta es
     la razón: desde que el pase macro FUSIONA sobre el fichero anterior, `macro.json` deja de ser
     una foto de un instante y pasa a ser una colcha de retales. Un pase de hoy que no consiguió
     refrescar el IPC deja dentro un IPC de hace tres semanas, y `generadoEl` diría «hoy». Sería el
     mismo fallo que el de esta mañana con el fichero de mercado, girado del revés: allí una fecha
     vieja envejecía datos frescos, aquí una fecha nueva rejuvenecería datos viejos.
     Manda el dato MÁS VIEJO que haya dentro, y además se dice CUÁL es: un aviso que nombra al
     culpable se puede arreglar; uno genérico solo se puede ignorar. */
  /* Y no todos los datos caducan al mismo ritmo. El WACC de la CNMC es del periodo regulatorio
     2026-2031 y el IPC se publica una vez al mes: avisar de que «llevan 32 días» es ruido, y un
     aviso que salta siempre deja de leerse. Es la misma regla que el informe semanal aplica a los
     expedientes regulatorios: «un expediente sin novedades no es un dato que caduque en siete
     días». Cada indicador puede traer su propio plazo en `caduca` (días); sin él, 14.
     Se avisa del que MÁS se ha pasado de SU plazo, no del más antiguo en bruto. */
  let vf='', vn='', vd=null, peor=null;
  const II=(_macroInf&&_macroInf.ind)||{};
  const hoy=Date.now();
  Object.keys(II).forEach(function(k){ const x=II[k];
    if(!x||x.v==null||x.estado==='pte'||!x.f)return;      /* un hueco declarado no envejece: no hay dato */
    const d=Math.round((hoy-Date.parse(x.f+'T00:00:00'))/86400000);
    if(!isFinite(d))return;
    if(!vf||x.f<vf){ vf=x.f; vn=x.n||k; vd=d; }
    const lim=(typeof x.caduca==='number'&&x.caduca>0)?x.caduca:14;
    const exceso=d-lim;
    if(exceso>0&&(peor===null||exceso>peor.exceso)) peor={n:x.n||k, f:x.f, dias:d, exceso:exceso};
  });
  return {f:f, m:m, viejoF:vf, viejoN:vn, dias:vd, caducado:peor};
}

/* ===== Bloque «Tu dividendo contra el bono» =====
   Las DOS cifras, siempre con etiqueta y nunca una sola:
     · RPD sobre COSTE  → lo que paga el dinero que ya se puso. Es un hecho sobre decisiones pasadas.
     · RPD sobre VALOR  → lo que rentaría un euro nuevo a precios de hoy. Es la pregunta del plan,
       porque lo que queda por invertir se compra a precios de hoy, no a los de 2019.
   Comparar la primera con el bono de hoy es comparar dos épocas; la segunda, dos alternativas reales.
   El crecimiento del DPA NO se supone: sale de dividendos.json, que trae la serie real por empresa. */
function _coyDivData(){
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  if(!pos.length) return null;
  const D=(typeof _evoData!=='undefined'&&_evoData&&_evoData.empresas)?_evoData:null;
  const byT={}; if(D)D.empresas.forEach(e=>{ byT[(e.ticker||'').toUpperCase()]=e; });
  const nowY=new Date().getFullYear();
  const cagr=t=>{
    const e=byT[t]; if(!e||!e.anios) return null;
    const ys=Object.keys(e.anios).map(Number).filter(y=>y<nowY&&num((e.anios[y]||{}).dpaBruto)>0).sort((a,b)=>a-b);
    if(ys.length<4) return null;
    const fin=ys[ys.length-1]; let ini=ys.find(y=>y>=fin-10); if(ini==null) return null;
    const a=num(e.anios[ini].dpaBruto), b=num(e.anios[fin].dpaBruto), k=fin-ini;
    if(!(a>0)||k<=0) return null;
    return {g:(Math.pow(b/a,1/k)-1)*100, ini:ini, fin:fin};
  };
  /* [25-ago-2026] invPositions() devuelve una fila por CARTERA+ticker: quien tiene ELE en dos brókeres
     salía dos veces, y la línea sin coste asignado (traspaso, scrip) pintaba «—» al lado de la buena.
     La tabla es por EMPRESA, así que se agrega por ticker antes de calcular: las RPD se sacan de los
     totales acumulados, no promediando porcentajes de lotes distintos. */
  let coste=0, valor=0, div=0; const agg={};
  pos.forEach(p=>{
    const t=(p.ticker||'').toUpperCase();
    const c=p.acciones*p.precioCompra, v=p.acciones*p.precioActual, dv=p.acciones*num(p.divAccion);
    coste+=c; valor+=v; div+=dv;
    const a=agg[t]=agg[t]||{t:t,nombre:p.nombre||t,c:0,v:0,dv:0,sinPrecio:true};
    a.c+=c; a.v+=v; a.dv+=dv; if(!p.sinPrecio)a.sinPrecio=false;
    if(p.nombre&&a.nombre===t)a.nombre=p.nombre;
  });
  const filas=Object.keys(agg).map(t=>{ const a=agg[t];
    return {t:t,nombre:a.nombre,sinPrecio:a.sinPrecio,cagr:cagr(t),
            rpdHoy:(!a.sinPrecio&&a.v>0)?a.dv/a.v*100:null,
            rpdCos:a.c>0?a.dv/a.c*100:null};
  });
  return {coste:coste,valor:valor,div:div,filas:filas,
          rpdCoste:coste>0?div/coste*100:null, rpdValor:valor>0?div/valor*100:null};
}
function _coyDivHTML(bono){
  const V=_coyDivData();
  if(!V) return '<div class="coy-note">Sin posiciones abiertas.</div>';
  if(typeof _evoData==='undefined'||!_evoData) return '<div class="coy-note">Cargando <code>dividendos.json</code>…</div>';
  const pp=x=>x==null?'—':x.toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
  const d1=x=>x.toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1});
  const dif=(a)=>{ if(a==null||bono==null)return ''; const d=a-bono;
    return '<div class="p '+(d>=0?'pos':'neg')+'">'+(d>=0?'+':'')+d1(d)+' pp sobre el bono</div>'; };
  const kpis='<div class="coy-kpis">'
    +'<div class="k hero"><div class="l">Lo que te paga lo que pusiste</div><div class="v">'+pp(V.rpdCoste)+'</div><div class="p">sobre '+fmt(V.coste)+' de coste</div>'+dif(V.rpdCoste)+'</div>'
    +'<div class="k"><div class="l">Lo que pagaría un euro nuevo</div><div class="v">'+pp(V.rpdValor)+'</div><div class="p">a precios de hoy</div>'+dif(V.rpdValor)+'</div>'
    +'<div class="k"><div class="l">Dividendo bruto anual</div><div class="v">'+fmt(V.div)+'</div><div class="p">'+fmt(V.div/12)+'/mes · plusvalía '+fmt(V.valor-V.coste)+'</div></div>'
    +'</div>';
  /* «Años para batir al bono»: cuántos años de crecimiento real del DPA hacen falta para que una compra
     de HOY iguale al bono. Sin bono en el puente, la columna no se pinta: no se inventa un 3,65 %. */
  const anios=f=>{
    if(bono==null||f.rpdHoy==null||!f.cagr) return null;
    if(f.rpdHoy>=bono) return 0;
    if(f.cagr.g<=0) return -1;
    let y=f.rpdHoy, n=0;
    while(y<bono&&n<40){ n++; y=f.rpdHoy*Math.pow(1+f.cagr.g/100,n); }
    return y>=bono?n:-1;
  };
  const pillA=n=>{ if(n===null)return '<span class="coy-mut">—</span>';
    if(n===0)return '<span class="coy-pill good">ya lo bate</span>';
    if(n<0)return '<span class="coy-pill bad">nunca</span>';
    return '<span class="coy-pill '+(n<=3?'good':'warn')+'">'+n+' año'+(n===1?'':'s')+'</span>'; };
  const orden=V.filas.slice().sort((a,b)=>((b.cagr?b.cagr.g:-99)-(a.cagr?a.cagr.g:-99)));
  const rows=orden.map(f=>{
    const g=f.cagr?f.cagr.g:null;
    const a10=(f.rpdHoy!=null&&g!=null)?f.rpdHoy*Math.pow(1+Math.max(g,0)/100,10):null;
    return '<tr><td class="l"><b class="coy-tk" data-ficha="'+f.t+'">'+f.t+'</b> <span class="coy-nm">'+_coyEsc((f.nombre||'').slice(0,18))+'</span></td>'
      +'<td>'+(f.sinPrecio?'<span class="coy-mut">sin cotización</span>':pp(f.rpdHoy))+'</td>'
      +'<td>'+pp(f.rpdCos)+'</td>'
      +'<td class="'+(g==null?'':(g<0?'neg':''))+'">'+(g==null?'<span class="coy-mut">—</span>':((g>=0?'+':'')+d1(g)+' %'))+'</td>'
      +(bono!=null?('<td>'+pillA(anios(f))+'</td><td class="'+(g!=null&&g<0?'neg':'')+'">'+pp(a10)+'</td>'):'')
      +'</tr>';
  }).join('');
  const cab='<tr><th class="l">Empresa</th><th>RPD hoy</th><th>RPD s/ coste</th><th>Crecim. DPA</th>'
    +(bono!=null?'<th>Bate al bono en</th><th>RPD en 10 años si compras hoy</th>':'')+'</tr>';
  const tot='<tr class="tot"><td class="l">Cartera</td><td>'+pp(V.rpdValor)+'</td><td>'+pp(V.rpdCoste)+'</td><td>—</td>'
    +(bono!=null?'<td>—</td><td>—</td>':'')+'</tr>';
  const nb=bono==null?'<div class="coy-note">Sin el bono a 10 años en el puente no se pinta la comparación: se prefiere una columna menos a un número inventado.</div>':'';
  return kpis+nb+'<div class="coy-tw"><table class="coy-tbl"><thead>'+cab+'</thead><tbody>'+rows+tot+'</tbody></table></div>'
    +'<div class="coy-note">El crecimiento sale de <code>dividendos.json</code>, con la serie real de DPA por empresa. No es una hipótesis: es lo que han hecho.</div>';
}

function renderCoyuntura(){
  const el=$('#coyBody'); if(!el)return;
  if(_macroInf===null||_macroMkt===null){
    el.innerHTML='<div class="coy-note">Cargando el puente macro…</div>';
    if(!renderCoyuntura._pedido){ renderCoyuntura._pedido=true; _coyCargar().then(renderCoyuntura); }
    return;
  }
  if(typeof _evoData!=='undefined'&&!_evoData&&typeof _evoCargar==='function'&&!renderCoyuntura._divPedido){
    renderCoyuntura._divPedido=true; try{ _evoCargar().then(renderCoyuntura); }catch(e){}
  }
  const I=_coyInd();
  const ks=Object.keys(I);
  if(!ks.length){
    el.innerHTML='<div class="coy-empty">Todavía no hay <code>macro.json</code> en el repo.<br>'
      +'Lo escribe el <b>pase macro</b> del método y llega por el buzón de publicación, como <code>hallazgos.json</code>.</div>';
    return;
  }
  const E=_coyEdad();
  const viejo=!!E.caducado;
  const cab='<div class="coy-head">'
    +'<div class="coy-sub">Contexto de mercado de los factores que mueven <b>tu</b> cartera. '
    +'Las flechas no llevan color a propósito: el mismo dato es ingreso para unas empresas y coste para otras.</div>'
    +((E.f||E.m)?('<div class="coy-edad'+(viejo?' viejo':'')+'">'
      +(viejo?'⚠️ ':'')
      +(E.m?('Mercado del <b>'+ddmmyyyy(E.m)+'</b>'+(E.f?' · ':'')):'')
      +(E.f?('pase macro del <b>'+ddmmyyyy(E.f)+'</b>'):'')
      +(E.viejoF?(' · el dato más antiguo'+(E.viejoN?(' ('+_coyEsc(E.viejoN)+')'):'')
                  +' es del <b>'+ddmmyyyy(E.viejoF)+'</b>'
                  +(E.dias!=null?(', hace '+E.dias+' día'+(E.dias===1?'':'s')):'')):'')
      +(viejo?(' — <b>'+_coyEsc(E.caducado.n)+'</b> debería haberse refrescado hace '
               +E.caducado.exceso+' día'+(E.caducado.exceso===1?'':'s')+': lanza el pase macro.'):'')
      +'</div>'):'')
    +'</div>';

  const bonoO=I['bono_10a_es'];
  const bono=(bonoO&&bonoO.v!=null)?num(bonoO.v):null;

  const blk=(key,ic,t,cnt,sub,inner)=>{
    const op=window._coyOpen[key];
    return '<div class="coy-blk'+(op?' open':'')+'" data-coyblk="'+key+'"><div class="coy-blk-h"><span class="ic">'+ic+'</span>'
      +'<span class="t">'+t+'</span><span class="cnt">'+cnt+'</span><span class="arw">▶</span></div>'
      +'<div class="coy-blk-b">'+(sub?'<div class="coy-note">'+sub+'</div>':'')+inner+'</div></div>';
  };
  window._coyOpen=window._coyOpen||{div:true,tipos:true,energia:true,bolsa:true,inflacion:false,divisas:false,otros:false};

  const tarjetas=g=>{
    const lista=ks.filter(k=>I[k].grupo===g);
    if(!lista.length)return '';
    return '<div class="coy-ind">'+lista.map(k=>{ const o=I[k];
      const pte=o.v==null;
      return '<div class="coy-i'+(pte?' pte':'')+'"><div class="n">'+_coyEsc(o.n||k)+'</div>'
        +'<div class="v">'+_coyFmt(o)+'</div>'
        +'<div class="d">'+(pte?('<span class="coy-mut">pendiente</span>'+(o.nota?(' · <span class="coy-nota">'+_coyEsc(o.nota)+'</span>'):'')):_coyDelta(o))+'</div>'
        +'<div class="f">'+(o.url?('<a href="'+_coyEsc(o.url)+'" target="_blank" rel="noopener">'+_coyEsc(o.src||'fuente')+'</a>'):_coyEsc(o.src||''))
        +(o._org==='mercado'?' <span class="coy-org">auto</span>':'')+'</div></div>';
    }).join('')+'</div>';
  };
  const cnt=g=>{ const n=ks.filter(k=>I[k].grupo===g).length; const p=ks.filter(k=>I[k].grupo===g&&I[k].v==null).length;
    return n+' indicador'+(n===1?'':'es')+(p?(' · '+p+' pendiente'+(p===1?'':'s')):''); };

  let html=cab
    +blk('div','💶','Tu dividendo contra el bono',(bono!=null?('bono 10A '+bono.toLocaleString('es-ES',{minimumFractionDigits:2})+' %'):'sin bono en el puente'),'',_coyDivHTML(bono));
  COY_GRUPOS.forEach(g=>{ const inner=tarjetas(g.id); if(inner) html+=blk(g.id,g.ic,g.t,cnt(g.id),g.sub,inner); });
  const otros=tarjetas('otros');
  if(otros) html+=blk('otros','🔭','Otros · contexto',cnt('otros'),
    'Aquí no hay interpretación a propósito: si un dato de este bloque llega a cambiar una decisión tuya, deja de ser «otros» y sube arriba.',otros);
  el.innerHTML=html;

  const sec=document.getElementById('view-coyuntura');
  if(sec&&!renderCoyuntura._bound){ renderCoyuntura._bound=true;
    sec.addEventListener('click',function(e){
      if(e.target.closest('[data-ficha]')||e.target.closest('a'))return;
      const h=e.target.closest('.coy-blk-h'); if(!h)return;
      const k=h.parentElement.getAttribute('data-coyblk');
      window._coyOpen[k]=!window._coyOpen[k];
      h.parentElement.classList.toggle('open');
    });
  }
}
