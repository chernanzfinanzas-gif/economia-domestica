/* =============================================================================
   28-micartera.js · Vista «Mi Cartera» (grupo Control)
   -----------------------------------------------------------------------------
   La pantalla de entrada: qué tengo, cómo va hoy, y qué está a punto de entrar en
   zona de compra. Es la única vista que responde a «¿cómo va lo mío?» sin pedir
   ningún clic.

   Dos bloques:
     1) POSICIONES — las dos carteras (Propia y compartida) JUNTAS, porque para
        mirar cómo va el día da igual de qué bolsillo salió. Cada ficha lleva el
        precio actual, la variación del DÍA (en € sobre tu posición y en %) y,
        debajo, la plusvalía acumulada, que es lo que de verdad importa al método.
     2) CERCA DE ENTRADA — las que NO están en cartera y el Kanban sitúa «En zona»
        o «Cerca de entrada», con su precio de entrada, su cotización y cuánto le
        falta. Es la lista de la compra: lo que hay que mirar cuando entra dinero.

   De dónde salen los datos (todo ya existente, no se inventa nada):
     · invPositions()  -> posiciones consolidadas de DB.operaciones
     · etapaDe()       -> la etapa del Kanban (21-embudo.js), misma que el tablero
     · DB.analisis     -> decisión, banda de entrada y PO del dossier
     · _intradia       -> precio de sesión y cierre anterior (01-core.js)
   La variación del día necesita el cierre anterior. Si no hay intradía —fin de
   semana, o el pase aún no ha corrido— NO se inventa: se dice «sin datos de hoy»
   y se enseña solo la plusvalía, que no depende de la sesión.
   ============================================================================= */

function _mcNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _mcUp(x){ return (x||'').toString().toUpperCase(); }
function _mcEur(x){ return (typeof fmt==='function')?fmt(x):(_mcNum(x).toFixed(2)+' €'); }
function _mcPct(x,d){ d=(d==null)?2:d; return (x>=0?'+':'')+x.toFixed(d).replace('.',',')+'%'; }
/* El precio MEDIO de compra pide más decimales que un importe: 3,5742 € no es 3,57 €,
   y sobre 6.549 acciones esa diferencia son 29 €. Hasta 4 decimales, sin ceros de relleno. */
function _mcPrecio(x){
  x=_mcNum(x);
  const d=(Math.abs(x)<10)?4:(Math.abs(x)<100?3:2);
  return x.toFixed(d).replace(/0+$/,'').replace(/[.,]$/,'').replace('.',',')+' €';
}
function _mcEsc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function _mcAna(t){ t=_mcUp(t); return (DB.analisis||[]).find(function(a){ return _mcUp(a.ticker)===t; })||null; }
function _mcNombre(t){
  const v=(DB.valores||{})[_mcUp(t)]||{}; if(v.nombre)return v.nombre;
  const a=_mcAna(t); if(a&&a.nombre)return a.nombre;
  return _mcUp(t);
}
/* Cotización viva: la misma que usa el resto de la app. */
function _mcCot(t){
  const v=(DB.valores||{})[_mcUp(t)]||{}; const p=_mcNum(v.precioActual);
  if(p>0)return p;
  const a=_mcAna(t); return _mcNum(a&&a.cotizacion);
}
/* Cierre anterior, SOLO si el intradía de hoy lo trae. Sin él no hay variación del día. */
/* Con qué cierre se compara para saber «cómo va el día». Dos fuentes, por orden:
     1) el intradía, que trae el cierre de ayer pegado al precio vivo;
     2) el histórico de cierres (precios/*.json), que permite enseñar la variación de la
        ÚLTIMA SESIÓN CERRADA cuando el pase intradía todavía no ha corrido.
   Sin la segunda, la columna se quedaba en «sin dato de hoy» todo el fin de semana y
   hasta las 09:20 de cada mañana, que es justo cuando uno abre la cartera para ver qué
   tal fue ayer. Devuelve {ant, viva, sesion} o null si no hay con qué comparar: nunca
   una variación inventada. */
function _mcCierreAnt(t){
  t=_mcUp(t);
  const j=(typeof _intradia!=='undefined')?_intradia:(window._intradia||null);
  if(j&&j.datos&&j.datos[t]&&_mcNum(j.datos[t].cierreAnt)>0)
    return {ant:_mcNum(j.datos[t].cierreAnt), viva:true, sesion:j.sesion||''};
  const f=((DB.valores||{})[t]||{}).precioFecha||'';
  if(!f)return null;                                   /* sin saber de cuándo es, no se compara */
  const pj=(typeof _precioCache!=='undefined')?_precioCache[t]:null;
  if(!pj||!pj.data)return null;
  const d=pj.data;
  for(let i=d.length-1;i>=0;i--){                       /* el último cierre ANTERIOR a esa fecha */
    const fe=d[i][0], px=_mcNum(d[i][1]);
    if(!(px>0)||!fe||fe>=f)continue;
    return {ant:px, viva:false, sesion:f};
  }
  return null;
}

/* De cuándo es el precio que se está enseñando. Es la pregunta que más se hace uno
   mirando una cartera («¿esto es de ahora o del viernes?») y la app tenía la respuesta
   repartida entre dos sitios. Devuelve {txt, tipo:'intradia'|'cierre'|'?'}.  */
function _mcSelloDe(t){
  t=_mcUp(t);
  const v0=(DB.valores||{})[t]||{};
  /* [06-ago-2026] EL ORDEN IMPORTA, Y ESTABA AL REVES.
     Antes se miraba PRIMERO si el fichero de intradia traia el ticker, y se ponia su
     etiqueta aunque ese precio no se hubiera llegado a aplicar. Resultado: con una captura
     de cierre del Excel blindada (precioManual), la app ensenaba los precios buenos del
     Excel rotulados «hoy 17:41 · hace 81 min», que es la hora del pase de Yahoo. La
     etiqueta no pertenecia al numero que etiquetaba.
     Ahora manda el ORIGEN DEL PRECIO QUE SE ESTA ENSENANDO: si es cierre oficial, se dice;
     y para reclamar la etiqueta de intradia hace falta ademas `precioProvisional`, que es
     la marca que deja sincronizarIntradia() cuando de verdad aplica su precio. */
  if(v0.precioManual&&v0.precioFecha) return {tipo:'oficial', txt:'cierre oficial '+_mcFecha(v0.precioFecha,true), det:'cierre oficial de la subasta, importado del Excel'};
  const j=(typeof _intradia!=='undefined')?_intradia:(window._intradia||null);
  if(v0.precioProvisional&&j&&j.datos&&j.datos[t]&&_mcNum(j.datos[t].p)>0&&(j.datoHora||j.hora)){
    /* Si el dato se ha quedado rezagado —la app solo repregunta con la pestaña visible— hay que
       decirlo. Enseñar «hoy 10:11» a las 10:48 sin más es lo contrario de lo que esta columna
       vino a resolver. */
    const _m=(typeof intradiaEdadMin==='function')?intradiaEdadMin():null;
    const _v=(typeof intradiaViejo==='function')&&intradiaViejo();
    return {tipo:_v?'intradia viejo':'intradia',
            /* la hora de la BARRA si la hay; la del pase solo con ficheros antiguos */
            txt:'hoy '+(j.datoHora||j.hora)+(_v?(' · hace '+_m+' min'):''),
            det:_v?'el último pase que ha podido leer la app; cambia de pestaña o recarga para forzar uno nuevo'
                  :('precio de la sesión en curso'+(j.retrasoMin?(', con '+j.retrasoMin+' min de retraso'):''))};
  }
  if(v0.precioFecha) return {tipo:'cierre', txt:'cierre '+_mcFecha(v0.precioFecha), det:'último cierre consolidado'};
  return {tipo:'?', txt:'sin fecha', det:'no consta de cuándo es este precio'};
}
function _mcFecha(iso,corta){
  if(!iso)return '';
  const p=String(iso).slice(0,10).split('-');
  if(corta&&p.length===3)return p[2]+'/'+p[1]+'/'+p[0].slice(2);   /* en la fila el sitio es oro */
  if(typeof ddmmyyyy==='function'){ try{ return ddmmyyyy(iso); }catch(e){} }
  return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):String(iso);
}
/* Resumen para la cabecera: de cuándo son los precios del conjunto. */
function _mcSelloGlobal(tickers){
  const c={}; let det='';
  tickers.forEach(function(t){ const s=_mcSelloDe(t); c[s.tipo]=(c[s.tipo]||0)+1; if(!det)det=s.det; });
  const j=(typeof _intradia!=='undefined')?_intradia:(window._intradia||null);
  const n=tickers.length;
  /* el conteo por tipo distingue 'intradia' de 'intradia viejo': se suman los dos */
  const _vivas=(c.intradia||0)+(c['intradia viejo']||0);
  const _m=(typeof intradiaEdadMin==='function')?intradiaEdadMin():null;
  const _viejo=(typeof intradiaViejo==='function')&&intradiaViejo();
  const _edad=' · <b>hace '+_m+' min</b>, cambia de pestaña o recarga';
  /* [07-ago-2026] LA HORA QUE SE ENSENA ES LA DE LA BARRA, NO LA DEL PASE.
     Esta banda se quedo leyendo `j.hora` —cuando corrio el robot— cuando todo lo demas ya
     media `datoHora` —de cuando es el precio—. Se vio en una captura del 7-ago: la banda
     decia «hoy 15:58» y las filas de debajo «hoy 15:40», 18 minutos de diferencia. Suelen
     parecerse, y por eso paso desapercibido; el dia que la fuente se congele es cuando la
     banda mentiria, que es justo el dia que importa. Es el mismo fallo del 6-ago, en el
     unico sitio donde no se habia corregido. */
  if(_vivas===n&&j) return {cls:_viejo?'vieja':'viva', txt:'Cotizaciones de <b>hoy '+(j.datoHora||j.hora)+'</b>'
    +(_viejo?_edad:((j.retrasoMin?(' · retraso '+j.retrasoMin+' min'):'')+' · provisionales, no son cierres'))};
  if(_vivas&&j)     return {cls:_viejo?'vieja':'viva', txt:'<b>'+_vivas+' de '+n+'</b> con precio de hoy '+(j.datoHora||j.hora)
    +(_viejo?_edad:((j.retrasoMin?(' (retraso '+j.retrasoMin+' min)'):'')+'; el resto, último cierre'))};
  /* [06-ago-2026] El cierre oficial del Excel es el MEJOR dato del dia, no la ausencia de
     uno. Sin esta rama caia en «el pase intradia no ha corrido hoy», que ademas de sonar a
     carencia era falso: el pase habia corrido, y su precio quedo descartado a proposito por
     ser peor. */
  let fo=''; tickers.forEach(function(t){ const v=(DB.valores||{})[_mcUp(t)]||{}; if(v.precioManual&&v.precioFecha&&v.precioFecha>fo)fo=v.precioFecha; });
  if((c.oficial||0)===n&&fo) return {cls:'cierre', txt:'Cotizaciones del <b>cierre oficial del '+_mcFecha(fo)+'</b> · importadas de la Matriz'};
  if((c.oficial||0)&&fo)     return {cls:'cierre', txt:'<b>'+c.oficial+' de '+n+'</b> con el cierre oficial del '+_mcFecha(fo)+' (Matriz); el resto, último cierre conocido'};
  /* sin intradía ni cierre oficial: la fecha del cierre más reciente que tengamos */
  let f=''; tickers.forEach(function(t){ const v=(DB.valores||{})[_mcUp(t)]||{}; if(v.precioFecha&&v.precioFecha>f)f=v.precioFecha; });
  if(f) return {cls:'cierre', txt:'Cotizaciones del <b>cierre del '+_mcFecha(f)+'</b> · el pase intradía no ha corrido hoy'};
  return {cls:'cierre', txt:'Sin fecha en las cotizaciones'};
}

/* --------------------------------------------------------------------------
   Máximo histórico de la cartera — FASE 1: por cierres diarios (07-ago-2026)
   --------------------------------------------------------------------------
   No se calcula nada nuevo: `carteraEvolData()` (05-graficas.js) YA construye la serie
   DIARIA del valor de la cartera desde la primera operación, y lo hace bien en lo que
   más fácil es equivocarse: valora cada día con las acciones que había ESE día, y
   arrastra el último cierre conocido cuando a un valor le falta la sesión. Calcularlo
   aparte habría sido reescribir esa trampa con otro nombre y con más sitios donde fallar.
   Aquí solo se recorre esa serie y se busca el máximo.

   Su último punto usa el precio VIVO de `DB.valores` cuando es más nuevo que el último
   cierre del repo, así que el intradía de hoy entra en la comparación: si la cartera está
   marcando máximo ahora mismo, se dice.

   Lo que este máximo NO es: no es el máximo intradía. Entre cierre y cierre la cartera
   pudo valer más y aquí no se ve. Eso es la Fase 2 y necesita archivar la serie de
   5 minutos, que hoy se descarga y se tira.
   -------------------------------------------------------------------------- */
var _MC_MAX_MIN_DIAS=5;          /* con menos sesiones, «máximo histórico» no significa nada */
/* Valores en cartera cuyo `precios/<T>.json` no está en el repo. Importa decirlo: sin su
   histórico, `carteraEvolData` los valora al precio de compra, y entonces el máximo sale
   CORTO. Callarlo sería enseñar un número redondo que no se sostiene. */
function _mcSinHistorico(fechaMax){
  if(typeof _allOps!=='function'||typeof _precioCache==='undefined') return [];
  /* [11-ago-2026] SOLO LOS QUE TENÍAS EL DÍA DEL MÁXIMO.
     La primera versión miraba todos los tickers que han pasado alguna vez por la cartera, e
     incluía las posiciones ya cerradas. Resultado: avisaba de BME —excluida de bolsa en 2020,
     cuyo histórico no va a existir nunca— sobre un máximo del 06-ago-2026, cuando BME hacía
     seis años que no estaba. Un aviso que no se puede resolver y que no afecta al número es
     ruido, y el ruido acaba enseñando a ignorar los avisos que sí importan.
     Lo que de verdad puede dejar el máximo corto es un valor SIN cierres que estuviera en la
     cartera EL DÍA del máximo. Eso es lo que se mira. */
  const dms=fechaMax?Date.parse(fechaMax+'T00:00:00'):Date.now();
  const ops=_allOps();
  const acc={};
  ops.forEach(function(o){
    const t=_mcUp(o.ticker); if(!t) return;
    const om=Date.parse((o.fecha||'')+'T00:00:00');
    if(isNaN(om)||om>dms) return;
    acc[t]=(acc[t]||0)+((o.tipo==='venta')?-1:1)*_mcNum(o.acciones);
  });
  return Object.keys(acc).filter(function(t){
    if(!(acc[t]>0.0001)) return false;            /* no estaba en cartera ese día */
    const pj=_precioCache[t];
    return pj!==undefined && (!pj||!pj.data||!pj.data.length);
  });
}
function _mcMaximo(){
  if(typeof carteraEvolData!=='function') return null;
  let ev=null;
  /* el callback es el mismo patrón que ya usa la vista: se pinta con lo que hay y se
     repinta sola cuando llegan los cierres del repo */
  try{ ev=carteraEvolData(function(){ if(typeof renderMiCartera==='function')renderMiCartera(); }); }catch(e){ return null; }
  if(!ev) return null;
  if(ev.loading) return {loading:true};
  if(!ev.ok||!ev.valor||ev.valor.length<_MC_MAX_MIN_DIAS) return null;
  let mx=-Infinity, mi=-1;
  for(let i=0;i<ev.valor.length;i++){ const v=_mcNum(ev.valor[i]); if(v>mx){ mx=v; mi=i; } }
  if(mi<0||!(mx>0)) return null;
  const fechas=ev.dates||ev.labels||[];
  return {valor:mx, fecha:fechas[mi]||'', enMaximo:(mi===ev.valor.length-1),
          dias:ev.valor.length, desde:fechas[0]||'', sinHist:_mcSinHistorico(fechas[mi]||'')};
}
/* --------------------------------------------------------------------------
   Cierres sin confirmar (07-ago-2026)
   --------------------------------------------------------------------------
   `precios/_estado.json` dice, empresa a empresa, hasta qué fecha están CONFIRMADOS sus
   cierres: confirmado = un pase de un día posterior a esa sesión ha vuelto a leerlo. Los
   que faltan son sesiones ya terminadas cuyo precio pudo escribirse con el mercado
   abierto — un intradía disfrazado de cierre.

   Nació de un caso real: la fila del 06-ago-2026 se escribió a las 10:48, los pases de la
   noche no se entregaron, y a la mañana siguiente la app enseñaba un máximo de cartera
   687 € por encima del real sin que nada lo insinuara. Lo cazó Carlos cuadrando a mano
   contra su Matriz. Esto es para que la próxima vez lo diga la pantalla.

   Si el fichero no existe (repos aún sin actualizar) no se dice nada: ausencia de dato no
   es un aviso.
   -------------------------------------------------------------------------- */
var _mcEstadoPedido=false, _mcEstadoCierres=null;
function _mcRezagados(tickers){
  if(!_mcEstadoPedido){
    _mcEstadoPedido=true;
    try{
      fetch('precios/_estado.json',{cache:'no-store'})
        .then(function(r){ return r.ok?r.json():null; })
        .then(function(j){ _mcEstadoCierres=j||null; if(typeof renderMiCartera==='function')renderMiCartera(); })
        .catch(function(){});
    }catch(e){}
    return [];
  }
  const j=_mcEstadoCierres;
  if(!j||!j.rezagados||!j.rezagados.length) return [];
  const enCartera={}; (tickers||[]).forEach(function(t){ enCartera[_mcUp(t)]=1; });
  return j.rezagados.filter(function(t){ return enCartera[_mcUp(t)]; }).map(_mcUp);
}
function _mcCierresHTML(tickers){
  const r=_mcRezagados(tickers);
  if(!r.length) return '';
  const emp=(_mcEstadoCierres&&_mcEstadoCierres.empresas)||{};
  /* la fecha más antigua sin confirmar, que es la que hay que mirar */
  let f='';
  r.forEach(function(t){ const sc=(emp[t]||{}).sinConfirmar||[]; sc.forEach(function(d){ if(!f||d<f)f=d; }); });
  return '<div class="mc-max ojo">⚠ <b>El histórico de cierres tiene '+r.length+' '
    +(r.length===1?'valor':'valores')+' sin confirmar</b>'+(f?(' desde el '+_mcFecha(f)):'')
    +' ('+r.join(', ')+')'
    /* [11-ago-2026] EL AVISO TIENE QUE DECIR SOBRE QUE NUMERO AVISA.
       La primera versión decía «el cierre sin confirmar» a secas, y Carlos preguntó lo
       correcto: el precio que él sube del Excel ES el cierre oficial tras la subasta, así
       que ¿de qué se le está avisando? De otra cosa: del histórico del repo, que no es el
       precio de la tarjeta. Avisar sin decir a qué afecta es la misma falta que el sello
       que enseñaba la hora del robot: una etiqueta que no pertenece a su número. */
    +'<span class="mc-max-pie"><b>No afecta al precio que ves</b> si lo importaste del Excel: '
    +'ese es el cierre oficial tras la subasta. Afecta al <b>máximo de la cartera</b> de aquí '
    +'arriba y a los gráficos de cada Ficha, que salen del histórico del repositorio. '
    +'Lanza el pase de <b>Actualizar cotizaciones</b> en GitHub y pulsa ↻ Actualizar.</span></div>';
}
function _mcMaxHTML(valorHoy){
  const m=_mcMaximo();
  if(!m) return '';
  if(m.loading) return '<div class="mc-max cargando">Calculando el máximo de la cartera…</div>';
  /* «en máximos» se decide con un margen de medio céntimo: el último punto de la serie y
     el valor del cuadro verde se calculan por caminos distintos y pueden diferir en el
     redondeo. Sin el margen, el día que estás en máximo saldría «un 0,0% por debajo». */
  const enMax=m.enMaximo||(valorHoy>=m.valor-0.005);
  const dist=(m.valor>0)?((m.valor-valorHoy)/m.valor*100):0;
  let txt='<b>Máximo de la cartera: '+_mcEur(m.valor)+'</b>';
  txt+= enMax
      ? ' · <b>estás en máximos</b>'
      : (' · '+_mcFecha(m.fecha)+' · estás un <b>'+dist.toFixed(1).replace('.',',')+'%</b> por debajo');
  txt+='<span class="mc-max-pie">por cierres diarios desde '+_mcFecha(m.desde)+'</span>';
  if(m.sinHist.length) txt+='<span class="mc-max-ojo">'+m.sinHist.length+' '
      +(m.sinHist.length===1?'valor':'valores')+' sin histórico de cierres en el repo ('
      +m.sinHist.join(', ')+'): el máximo puede quedarse corto</span>';
  /* [18-ago-2026] Segunda línea: el máximo DENTRO de la sesión. Va debajo y en menor,
     porque el de cierres sigue siendo la cifra de referencia -arranca en tu primera
     operación- y este solo puede mirar lo registrado. Mezclarlos en un renglón sería
     poner dos números de distinta profundidad histórica a la misma altura. */
  const mi=_mcMaxIntradia();
  if(mi){
    let it='<b>Máximo intradía: '+_mcEur(mi.valor)+'</b> · '+_mcFecha(mi.fecha)+' a las '+mi.hora;
    it+='<span class="mc-max-pie">dentro de la sesión, con las acciones de cada día · '
      +'registrado desde el '+_mcFecha(mi.desde)+' ('+mi.sesiones+' '
      +(mi.sesiones===1?'sesión':'sesiones')+'), que es cuando empezó a archivarse el detalle '
      +'de 5 minutos</span>';
    if(mi.sinSerie.length) it+='<span class="mc-max-ojo">sin detalle de 5 minutos: '
      +mi.sinSerie.join(', ')+' (se valoran a su cierre del día, así que el máximo intradía '
      +'puede quedarse corto)</span>';
    txt+='<span class="mc-max-intra">'+it+'</span>';
  }
  return '<div class="mc-max">'+txt+'</div>';
}

/* --------------------------------------------------------------------------
   Máximo de la cartera — FASE 2: DENTRO de la sesión (18-ago-2026)
   --------------------------------------------------------------------------
   La Fase 1 dice, ahí arriba, lo que le falta: «no incluye lo que la cartera pudo valer
   dentro de cada sesión». Ya se puede. `actualizar_intradia.py` archiva desde el 14-ago
   la serie de 5 minutos de cada empresa (`datos/series/TICKER.json`) y las nueve que hay
   en cartera la tienen.

   TRES COSAS QUE ES FÁCIL HACER MAL Y AQUÍ NO SE HACEN:

   1) El máximo intradía de la CARTERA no es la suma de los máximos de cada valor. Cada
      uno hace su máximo a una hora distinta, y sumarlos daría una cartera que no existió
      en ningún instante. Se construye la rejilla de horas de la sesión, se valora la
      cartera ENTERA en cada instante y se busca el máximo de esa serie.

   2) Se valora con las acciones que había ESE día, igual que la Fase 1. Valorar el pasado
      con la cartera de hoy infla los días anteriores a cualquier compra.

   3) El archivo es una VENTANA MÓVIL de 10 sesiones: lo que sale por detrás se borra y no
      vuelve. Por eso cada máximo diario que se calcula se GUARDA en `DB.maxIntra`, una
      línea por sesión. Como la ventana cubre dos semanas de bolsa, abriendo la app una vez
      cada quince días el registro queda completo; y lo guardado ya no depende del archivo.
      De ahí que hoy el dato arranque en el 11-ago y no en tu primera operación: antes de
      esa fecha el detalle no existe y no se puede inventar.
   -------------------------------------------------------------------------- */
var _mcSeriesPedidas=false, _mcSeries=null;

/* Acciones de cada valor a una fecha dada. Mismo criterio que `_mcSinHistorico`. */
function _mcAccionesEn(fecha){
  const acc={};
  if(typeof _allOps!=='function') return acc;
  const lim=Date.parse(fecha+'T23:59:59');
  _allOps().forEach(function(o){
    const t=_mcUp(o.ticker); if(!t) return;
    const om=Date.parse((o.fecha||'')+'T00:00:00');
    if(isNaN(om)||om>lim) return;
    acc[t]=(acc[t]||0)+((o.tipo==='venta')?-1:1)*_mcNum(o.acciones);
  });
  Object.keys(acc).forEach(function(t){ if(!(acc[t]>0.0001)) delete acc[t]; });
  return acc;
}

/* El cierre de un valor en una fecha (o el último anterior). Para los que no tengan
   serie de 5 minutos: se les da un precio plano durante toda la sesión, que es lo único
   honesto que se puede hacer, y la sesión queda marcada como PARCIAL. */
function _mcCierreEn(t, fecha){
  t=_mcUp(t);
  /* [18-ago-2026] PARA LA SESIÓN DE HOY, EL PRECIO VIVO ES MEJOR QUE UN CIERRE DE AYER.
     Carlos: «si no tiene dato intradía, que se quede con el valor anterior; degradaría
     menos que no contar nada». El fondo es correcto, el mecanismo no: arrastrar la sesión
     ANTERIOR ancla el valor al precio de ayer, y eso está más lejos de la verdad que su
     cierre de hoy — se pierde la forma dentro del día, pero no el nivel.
     Donde sí lo hacíamos peor es HOY: buscando «el cierre» de una sesión que aún no ha
     cerrado, se caía al de ayer... teniendo su precio vivo en `intradia.json`, refrescado
     cada cinco minutos. Ese sí es el dato bueno, y es el que se usa ahora. */
  const v0=((typeof DB!=='undefined'&&DB.valores)?DB.valores[t]:null)||{};
  const vivo=_mcNum(v0.precioActual);
  if(vivo>0 && (v0.precioFecha||'')===fecha) return vivo;
  const pj=(typeof _precioCache!=='undefined')?_precioCache[t]:null;
  const d=(pj&&pj.data)?pj.data:null;
  if(!d||!d.length) return 0;
  let v=0;
  for(let i=0;i<d.length;i++){ if(d[i][0]<=fecha) v=_mcNum(d[i][1]); else break; }
  return v;
}

/* EL CIERRE OFICIAL DE ESA FECHA, o 0 si no lo hay. Estricto a propósito: aquí NO vale
   «el último cierre anterior» ni el precio vivo. Es la diferencia entre un dato y un
   apaño, y de ella depende que no se dibuje un punto que no existe.
   [18-ago-2026] Lo que Carlos vio en la gráfica: un acantilado vertical al final del
   último día, cayendo justo al mínimo. Ese punto era el «cierre» de HOY calculado con
   `_mcCierreEn`, que para hoy usa el precio vivo y, si no lo tiene, se cae al cierre de
   AYER. Con la app abierta antes del pase intradía, los nueve valores se caían a la vez
   y el punto valía exactamente la cartera al cierre de ayer -377.907,43 €- clavado al
   final de hoy. Un número real, en el sitio equivocado: la sesión de hoy no ha cerrado.
   Regla: el punto de cierre solo se pinta cuando el cierre de ESE día ya está en el
   histórico. Hoy aparecerá esta noche, cuando el pase lo escriba, y no antes. */
function _mcCierreOficial(t, fecha){
  t=_mcUp(t);
  const pj=(typeof _precioCache!=='undefined')?_precioCache[t]:null;
  const d=(pj&&pj.data)?pj.data:null;
  if(!d||!d.length) return 0;
  for(let i=d.length-1;i>=0;i--){
    if(d[i][0]===fecha) return _mcNum(d[i][1]);
    if(d[i][0]<fecha) return 0;                 /* ordenado: ya no puede aparecer */
  }
  return 0;
}

/* La cartera valorada INSTANTE A INSTANTE dentro de una sesión. Función pura: se le dan
   las series ya descargadas. Devuelve {horas:[], valores:[], parcial, sinSerie:[...]} o null.
   De aquí salen las dos cosas: el máximo del día y la línea que se dibuja. */
function _mcIntraSesion(fecha, series, acc){
  const tks=Object.keys(acc||{});
  if(!tks.length) return null;
  const barras={}, sinSerie=[];
  let horas={};
  tks.forEach(function(t){
    const ser=series?series[t]:null;
    const b=(ser&&ser.dias)?ser.dias[fecha]:null;
    if(b&&b.length){
      const m={}; b.forEach(function(x){ if(x&&x.length>1&&_mcNum(x[1])>0){ m[x[0]]=_mcNum(x[1]); horas[x[0]]=1; } });
      if(Object.keys(m).length){ barras[t]=m; return; }
    }
    sinSerie.push(t);
  });
  if(!Object.keys(barras).length) return null;     /* ni una serie: no hay sesión que mirar */
  const rejilla=Object.keys(horas).sort();
  /* Precio plano de los que no tienen barras */
  let base=0;
  sinSerie.forEach(function(t){ base+=acc[t]*_mcCierreEn(t,fecha); });
  /* Arrastre: antes de su primera barra, cada valor vale su primera barra (la apertura).
     Un hueco a media sesión mantiene el último precio conocido, que es justo lo que hace
     el mercado: sin cruce, el precio no se mueve. */
  const ultimo={};
  tks.forEach(function(t){ if(barras[t]) ultimo[t]=barras[t][Object.keys(barras[t]).sort()[0]]; });
  const valores=[];
  for(let i=0;i<rejilla.length;i++){
    const h=rejilla[i];
    let v=base;
    for(let k=0;k<tks.length;k++){
      const t=tks[k]; if(!barras[t]) continue;
      if(barras[t][h]!=null) ultimo[t]=barras[t][h];
      v+=acc[t]*ultimo[t];
    }
    valores.push(v);
  }
  if(!valores.length) return null;
  /* [18-ago-2026] EL CIERRE TAMBIÉN ES UN INSTANTE DE LA SESIÓN.
     Carlos: «que el máximo intradía sea menor que el máximo de la cartera no tiene sentido».
     Y no lo tiene. El archivo de 5 minutos acaba a las 17:25 y el cierre oficial sale de la
     SUBASTA, que es posterior: si el valor de la cartera hace su máximo en la subasta, el
     recorrido de barras no lo ve y el máximo intradía queda POR DEBAJO del de cierres, que
     es una contradicción en sus propios términos —el cierre ocurrió dentro de la sesión—.
     Se añade un punto final con el cierre oficial de cada valor EN ESA FECHA. Si a alguno
     le falta, no se añade nada: no se inventa media cartera para cuadrar un número. Y por
     eso la sesión en curso no lleva punto de cierre: todavía no ha cerrado. */
  let cierre=0, completo=true;
  tks.forEach(function(t){
    const c=_mcCierreOficial(t,fecha);          /* el cierre de ESE día, o nada */
    if(!(c>0)) completo=false; else cierre+=acc[t]*c;
  });
  if(completo && cierre>0){ rejilla.push('cierre'); valores.push(cierre); }
  return {horas:rejilla, valores:valores, parcial:sinSerie.length>0, sinSerie:sinSerie};
}

/* Máximo de esa sesión. Envoltorio delgado sobre la serie: un solo cálculo, dos usos. */
function _mcMaxIntraSesion(fecha, series, acc){
  const r=_mcIntraSesion(fecha, series, acc);
  if(!r) return null;
  let mx=-Infinity, hmx='';
  for(let i=0;i<r.valores.length;i++){ if(r.valores[i]>mx){ mx=r.valores[i]; hmx=r.horas[i]; } }
  if(!(mx>0)) return null;
  return {valor:mx, hora:hmx, parcial:r.parcial, sinSerie:r.sinSerie};
}

/* LA SERIE ENTERA, para pintarla: todas las sesiones archivadas, una detrás de otra y sin
   los huecos de la noche, en el mismo formato que come `khGrafLinea` -mismo criterio que
   el gráfico por empresa, para que las dos se lean igual-. Devuelve null mientras las
   series no estén descargadas; quien llama repinta cuando lleguen. */
function mcSerieIntraCartera(){
  const hoy=new Date().toISOString().slice(0,10);
  const tks=Object.keys(_mcAccionesEn(hoy));
  if(!tks.length) return null;
  if(!_mcSeriesPedidas){ _mcMaxIntradia(); return null; }   /* dispara la descarga */
  const ser=_mcSeries; if(!ser) return null;
  const fechas={};
  Object.keys(ser).forEach(function(t){
    const d=(ser[t]&&ser[t].dias)?ser[t].dias:{};
    Object.keys(d).forEach(function(f){ fechas[f]=1; });
  });
  const orden=Object.keys(fechas).sort();
  if(!orden.length) return null;
  const xs=[], ys=[], ses=[]; let parcial=false; const sin={};
  orden.forEach(function(f){
    const r=_mcIntraSesion(f, ser, _mcAccionesEn(f));
    if(!r) return;
    ses.push({i:xs.length, txt:_mcFecha(f,true)});
    for(let i=0;i<r.horas.length;i++){ xs.push(f+' '+r.horas[i]); ys.push(r.valores[i]); }
    if(r.parcial){ parcial=true; (r.sinSerie||[]).forEach(function(t){ sin[t]=1; }); }
  });
  return xs.length>1 ? {xs:xs, ys:ys, sesiones:ses, nSesiones:ses.length,
                        parcial:parcial, sinSerie:Object.keys(sin)} : null;
}

/* Recorre las sesiones que haya en el archivo y las vuelca en DB.maxIntra. Idempotente:
   recalcular una sesión da lo mismo, así que se puede repasar la ventana entera cada vez
   sin miedo -y conviene, porque si editas una operación vieja el número se corrige solo-. */
function _mcVolcarIntra(series){
  if(!DB) return false;
  const reg=DB.maxIntra||(DB.maxIntra={});
  const fechas={};
  Object.keys(series||{}).forEach(function(t){
    const d=(series[t]&&series[t].dias)?series[t].dias:{};
    Object.keys(d).forEach(function(f){ fechas[f]=1; });
  });
  let cambios=0;
  Object.keys(fechas).sort().forEach(function(f){
    const r=_mcMaxIntraSesion(f, series, _mcAccionesEn(f));
    if(!r) return;
    const v=Math.round(r.valor*100)/100;
    const antes=reg[f];
    /* [18-ago-2026] UNA MEDIDA PARCIAL NO PISA A UNA COMPLETA.
       Esto es lo que de verdad dolio el 18-ago: al no cargar la serie de Santander, el
       recalculo salio PARCIAL -SAN valorado a su cierre plano- y sobrescribio los maximos
       buenos ya guardados. El registro existe justamente para no depender del archivo ni
       de que hoy la red vaya bien; si un tropiezo puede rebajarlo, no sirve para nada.
       Reglas: una parcial nunca sustituye a una completa; entre dos parciales gana la
       mayor, porque una parcial es siempre una COTA INFERIOR del maximo real; y entre dos
       completas manda la nueva, que puede estar corrigiendo una operacion editada. */
    if(antes){
      if(r.parcial && !antes.p) return;                    /* no degradar */
      if(r.parcial && antes.p && v<=antes.v) return;        /* parcial peor: no baja */
    }
    if(!antes || antes.v!==v || antes.h!==r.hora || !!antes.p!==!!r.parcial){
      reg[f]={v:v, h:r.hora}; if(r.parcial) reg[f].p=1; else delete reg[f].p;
      cambios++;
    }
  });
  return cambios>0;
}

/* Lo que se pinta: el máximo de TODO lo registrado, no solo de la ventana. */
function _mcMaxIntradia(){
  const tks=Object.keys(_mcAccionesEn(new Date().toISOString().slice(0,10)));
  if(!_mcSeriesPedidas){
    _mcSeriesPedidas=true;
    if(typeof khCargarSerie5!=='function' || !tks.length) return null;
    Promise.all(tks.map(function(t){ return khCargarSerie5(t).then(function(j){ return [t,j]; }); }))
      .then(function(pares){
        const ser={}; pares.forEach(function(p){ if(p[1]) ser[p[0]]=p[1]; });
        _mcSeries=ser;
        const hubo=_mcVolcarIntra(ser);
        if(hubo && typeof saveNow==='function'){ try{ saveNow(); }catch(e){} }
        if(typeof renderMiCartera==='function') renderMiCartera();
      })
      .catch(function(){});
    return null;
  }
  const reg=(DB&&DB.maxIntra)||{};
  const fechas=Object.keys(reg).sort();
  if(!fechas.length) return null;
  let mf='';
  fechas.forEach(function(f){ if(!mf || reg[f].v>reg[mf].v) mf=f; });
  const faltan=tks.filter(function(t){ return !_mcSeries || !_mcSeries[t]; });
  return {valor:reg[mf].v, fecha:mf, hora:reg[mf].h, parcial:!!reg[mf].p,
          desde:fechas[0], sesiones:fechas.length, sinSerie:faltan};
}

/* --------------------------------------------------------------------------
   Bloque 1 · posiciones (las dos carteras juntas)
   -------------------------------------------------------------------------- */
function _mcPosiciones(){
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){ return p.acciones>0.0001; });
  /* Un mismo ticker puede estar en las dos carteras: se funden en una sola línea,
     con el precio medio ponderado. Para «cómo va hoy» dos fichas del mismo valor
     son ruido; el desglose por cartera ya está en la vista Cartera. */
  const map={};
  pos.forEach(function(p){
    const t=_mcUp(p.ticker); const m=map[t]||(map[t]={ticker:t,acc:0,cost:0,carteras:{}});
    m.acc+=p.acciones; m.cost+=p.acciones*p.precioCompra;
    m.carteras[p.cartera||'Propia']=true;
  });
  return Object.keys(map).map(function(t){
    const m=map[t], pm=m.acc?m.cost/m.acc:0, cot=_mcCot(t), ca=_mcCierreAnt(t);
    const valor=m.acc*cot, coste=m.acc*pm;
    const o={ticker:t, nombre:_mcNombre(t), acc:m.acc, pmedio:pm, cot:cot,
             valor:valor, coste:coste, pl:valor-coste, plPct:coste>0?(valor-coste)/coste*100:0,
             carteras:Object.keys(m.carteras).sort()};
    if(ca&&ca.ant>0&&cot>0){ o.diaPct=(cot-ca.ant)/ca.ant*100; o.diaEur=m.acc*(cot-ca.ant);
                             o.diaViva=!!ca.viva; o.diaSesion=ca.sesion; }
    return o;
  }).sort(function(a,b){ return b.valor-a.valor; });
}

/* --------------------------------------------------------------------------
   Bloque 2 · cerca de entrada (NO en cartera)
   -------------------------------------------------------------------------- */
/* [06-ago-2026] Antes esto era un filtro: solo salían las que el Kanban situaba «En zona» o
   «Cerca de entrada». Con el mercado alto eso deja la lista VACÍA justo cuando más falta hace
   mirarla, y no es la pregunta que uno se hace: la pregunta es «de lo que no tengo, ¿qué es lo
   más cercano a comprable ahora mismo?», aunque la respuesta esté un 12% por encima de la banda.
   Así que ya no se filtra por etapa: se ordenan TODAS las analizadas que no están en cartera por
   distancia a su precio de entrada y se enseñan las 8 primeras. La etapa del Kanban se sigue
   trayendo si está disponible, pero como información, no como criterio.
   Única exclusión: las VENDER. Una empresa cuyo propio análisis dice vender no pinta nada en una
   lista de la compra, por barata que esté; para eso está el protocolo de salida. */
var _MC_CERCA_N=8;
function _mcCercaEntrada(){
  const held=(typeof heldTickerSet==='function')?heldTickerSet():new Set();
  const out=[];
  (DB.analisis||[]).forEach(function(a){
    const t=_mcUp(a.ticker); if(!t||held.has(t))return;
    const dec=_mcUp(a.decision); if(dec==='VENDER')return;
    const eM=_mcNum(a.entMax), eMin=_mcNum(a.entMin), cot=_mcCot(t);
    if(!(eM>0)||!(cot>0))return;                       /* sin banda o sin precio no hay distancia */
    let et=''; if(typeof etapaDe==='function'){ try{ et=etapaDe(t); }catch(e){} }
    out.push({ticker:t, nombre:_mcNombre(t), etapa:et, cot:cot, entMax:eM, entMin:eMin,
              po:_mcNum((typeof poBaseDe==='function')?poBaseDe(a):a.poMax),
              decision:dec,
              /* [06-ago-2026] La RPD entra en la lista de la compra porque cambia lo que duele
                 pagar un poco caro: un +8% sobre la banda con un 5,5% de renta se digiere; con
                 un 1,8%, no. Es la RPD ÚNICA de la app (dpaDeclarado ÷ cotización), no el
                 previsto del dossier. Si la empresa no está en dividendos.json, va null y la
                 fila lo dice: no se rellena con nada. */
              rpd:(typeof rpdDeclarada==='function')?rpdDeclarada(t,cot):null,
              /* negativo = ya está por debajo de la entrada (dentro de zona) */
              gap:(cot-eM)/eM*100});
  });
  out.sort(function(x,y){ return x.gap-y.gap; });
  const top=out.slice(0,_MC_CERCA_N);
  top.total=out.length;                                 /* para poder decir «8 de 21» sin recontar */
  return top;
}

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */
var _mcPreciosPedidos=false;
var _MC_URL_ACTIONS='https://github.com/chernanzfinanzas-gif/economia-domestica/actions/workflows/intradia.yml';
var _mcAviso='';          /* resultado del último «Actualizar», para poder contarlo */
var _mcRefrescando=false;
function renderMiCartera(){
  const el=document.getElementById('mcBody'); if(!el)return;
  _mcCSS();
  const P=_mcPosiciones();
  /* El histórico de cierres se pide UNA vez y en diferido: la vista se pinta ya con lo
     que hay y se repinta sola cuando llega. Así la variación de la última sesión no
     cuesta un segundo de pantalla en blanco al abrir la app. */
  if(!_mcPreciosPedidos && typeof cargarPreciosCartera==='function' && P.some(function(p){ return p.diaEur==null; })){
    _mcPreciosPedidos=true;
    try{ cargarPreciosCartera().then(function(){ renderMiCartera(); }); }catch(e){}
  }
  const valor=P.reduce(function(s,p){ return s+p.valor; },0);
  const coste=P.reduce(function(s,p){ return s+p.coste; },0);
  const pl=valor-coste, plPct=coste>0?pl/coste*100:0;
  const conDia=P.filter(function(p){ return p.diaEur!=null; });
  const vivas=conDia.filter(function(p){ return p.diaViva; }).length;
  const diaEur=conDia.reduce(function(s,p){ return s+p.diaEur; },0);
  const diaPct=(valor-diaEur)>0?diaEur/(valor-diaEur)*100:0;
  /* Si el pase intradía no ha corrido, la casilla no se queda muda: enseña la última
     sesión cerrada, que es la tendencia con la que uno llega por la mañana. */
  const diaTit=vivas?'Hoy':'Última sesión';
  const diaSes=(!vivas&&conDia.length)?_mcFecha(conDia[0].diaSesion,true):'';
  const selloG=_mcSelloGlobal(P.map(function(p){ return p.ticker; }));

  /* ---- KPIs ---- */
  let kpis='<div class="pos-kpis mc-kpis">'
    /* [14-ago-2026] El cuadro verde abre la ventana de evolucion de la cartera. Se
       marca como boton de verdad -role, tabindex y cursor- para que tambien se pueda
       abrir con el teclado: un div que solo responde al raton deja fuera a quien navega
       tabulando, y no cuesta nada hacerlo bien. */
    +'<div class="k hero" data-mcgraf="1" role="button" tabindex="0" title="Ver la evolución de la cartera" style="cursor:pointer">'
    +'<div class="l">Valor de la cartera</div><div class="v">'+_mcEur(valor)+'</div>'
    +'<div class="p">'+P.length+' '+(P.length===1?'empresa':'empresas')+' · ambas carteras · <b>ver evolución ↗</b></div></div>';
  if(conDia.length){
    kpis+='<div class="k"><div class="l">'+diaTit+(diaSes?(' <span class="mc-ses">'+diaSes+'</span>'):'')
      +'</div><div class="v '+(diaEur>=0?'pos':'neg')+'">'
      +(diaEur>=0?'+':'')+_mcEur(diaEur)+'</div><div class="p">'+_mcPct(diaPct)
      +(conDia.length<P.length?(' · '+conDia.length+' de '+P.length+' con dato'):'')
      +(vivas?'':' · aún sin precio de hoy')+'</div></div>';
  } else {
    kpis+='<div class="k"><div class="l">Última sesión</div><div class="v muted" style="font-size:16px">sin variación</div>'
      +'<div class="p">no tengo el cierre anterior con el que comparar</div></div>';
  }
  kpis+='<div class="k"><div class="l">Plusvalía</div><div class="v '+(pl>=0?'pos':'neg')+'">'
      +(pl>=0?'+':'')+_mcEur(pl)+'</div><div class="p">'+_mcPct(plPct,1)+' sobre un coste de '+_mcEur(coste)+'</div></div>';
  kpis+='</div>';
  /* Botón de refresco. NO lanza el pase en GitHub —eso exigiría un token con permiso de
     Actions dentro de un repo PÚBLICO, es decir, regalárselo a cualquiera—: vuelve a pedir
     `intradia.json`. Que es justo lo que hace falta el 90% de las veces, porque el pase suele
     haber corrido ya y lo que está viejo es lo que la app tiene cargado: solo repregunta cada
     5 minutos y únicamente con la pestaña visible. En el móvil, además, no hay .bat que valga. */
  if(P.length) kpis+='<div class="mc-fuente '+selloG.cls+'"><span class="d"></span>'
    +'<span class="mc-fuente-t">'+selloG.txt+'</span>'
    +'<button class="mc-refr" data-mcrefr="1"'+(_mcRefrescando?' disabled':'')+'>'
    +(_mcRefrescando?'…':'↻ Actualizar')+'</button>'
    /* Y el enlace para FORZAR un pase nuevo. No se puede disparar desde aquí —haría falta un
       token con permiso de Actions dentro de un repo público—, pero la página de GitHub sí
       funciona en el móvil y ahí ya estás identificado: es el mismo camino que usa Carlos para
       las cotizaciones. Un clic aquí y otro en «Run workflow» allí. */
    +'<a class="mc-refr mc-gh" href="'+_MC_URL_ACTIONS+'" target="_blank" rel="noopener"'
    +' title="Abre GitHub para lanzar un pase nuevo: allí, botón «Run workflow»">⟳ Forzar pase</a>'
    +'</div>'
    +_mcMaxHTML(valor)
    +_mcCierresHTML(P.map(function(p){ return p.ticker; }))
    +(_mcAviso?('<div class="mc-aviso">'+_mcAviso+'</div>'):'');

  /* ---- posiciones ---- */
  let lista='';
  if(!P.length){
    lista='<div class="empty">Sin posiciones abiertas. Las compras se registran en <b>Cartera</b>.</div>';
  } else {
    lista=P.map(function(p){
      const dia=(p.diaEur!=null)
        ? '<div class="mc-dia '+(p.diaEur>=0?'pos':'neg')+'">'+(p.diaEur>=0?'+':'')+_mcEur(p.diaEur)
          +' <span>('+_mcPct(p.diaPct)+')'+(p.diaViva?'':(' · '+_mcFecha(p.diaSesion,true)))+'</span></div>'
        : '<div class="mc-dia muted">— <span>sin cierre con el que comparar</span></div>';
      const compartida=(p.carteras.length>1)||(p.carteras[0]&&p.carteras[0]!=='Propia');
      const sp=_mcSelloDe(p.ticker);
      /* [14-ago-2026] LA TARJETA ABRE EL GRAFICO; EL TICKER, LA FICHA.
         Hasta hoy la tarjeta entera llevaba a la Ficha. Al meter el grafico habia que
         elegir: dos destinos no caben en la misma zona de clic. Se decidio asi porque
         mirando la cartera lo que se quiere ver de un vistazo es COMO VA, no el dossier
         entero; y el ticker, que ya estaba escrito ahi, se convierte en la puerta a la
         Ficha con su subrayado y su color de enlace para que se vea que lo es. */
      return '<div class="mc-row" data-mcgrafv="'+p.ticker+'" title="Ver el gráfico de '+_mcEsc(p.nombre)+'">'
        +'<div class="mc-l">'
        +  '<div class="mc-nom">'+_mcEsc(p.nombre)
        +    (compartida?'<span class="mc-cart">'+_mcEsc(p.carteras.join(' + '))+'</span>':'')+'</div>'
        +  '<div class="mc-sub">BME · <b class="mc-tk" data-ficha="'+p.ticker+'" title="Abrir la ficha de '+_mcEsc(p.nombre)+'">'+p.ticker+'</b></div>'
        +  '<div class="mc-sub">Compra '+(Math.round(p.acc*10000)/10000)+' @ '+_mcPrecio(p.pmedio)+'</div>'
        +'</div>'
        +'<div class="mc-r">'
        +  '<div class="mc-cot">'+_mcEur(p.cot)+'</div>'
        +  '<div class="mc-cuando '+sp.tipo+'" title="'+_mcEsc(sp.det)+'">'+_mcEsc(sp.txt)+'</div>'
        +  dia
        +  '<div class="mc-pl '+(p.pl>=0?'pos':'neg')+'">'+(p.pl>=0?'+':'')+_mcEur(p.pl)+' <span>('+_mcPct(p.plPct,1)+')</span></div>'
        +'</div>'
        +'</div>';
    }).join('');
    lista='<div class="mc-list">'+lista+'</div>'
      +'<div class="mc-leyenda">La cifra grande es la <b>cotización</b>. Debajo, la variación del <b>día</b> '
      +'sobre tu posición y, en gris, la <b>plusvalía acumulada</b> desde tu precio medio.</div>';
  }

  /* ---- cerca de entrada ---- */
  const C=_mcCercaEntrada();
  let cerca='';
  if(!C||!C.length){
    cerca='<div class="mc-vacio">No hay ninguna empresa analizada fuera de cartera con banda de '
      +'entrada y precio. Aquí saldrán ordenadas por lo cerca que estén de poder comprarse.</div>';
  } else {
    cerca='<div class="mc-list">'+C.map(function(c){
      const dentro=c.gap<=0; const sc=_mcSelloDe(c.ticker);
      const m=(typeof _emMargen==='function')?_emMargen():0.05;
      /* Tres niveles, no dos: ahora la lista llega hasta las que están MUY por encima y meter
         un +18% en el mismo amarillo que un +1,5% engañaba a simple vista. */
      const chip=dentro
        ? '<span class="mc-chip in">🟢 en zona</span>'
        : (c.gap<=m*100
            ? '<span class="mc-chip near">🟡 a '+_mcPct(c.gap,1).replace('+','')+'</span>'
            : '<span class="mc-chip far">🟠 a '+_mcPct(c.gap,1).replace('+','')+'</span>');
      const barra=(function(){
        /* Escala: borde izquierdo −margen, borde derecho +3×margen. La entrada queda al 25% y
           marcada con una raya, para que se vea de un vistazo quién la ha cruzado y quién no. */
        const p=Math.max(0,Math.min(1,(c.gap/100+m)/(4*m)));
        return '<div class="mc-bar"><u></u><i style="left:'+(p*100).toFixed(1)+'%"></i></div>';
      })();
      /* [18-ago-2026] AQUI TAMBIEN SE ABRE EL GRAFICO. Las tarjetas de «Posiciones» llevan
         al grafico desde el 14-ago y el ticker a la Ficha; estas se habian quedado con el
         reparto viejo -toda la tarjeta a la Ficha- y no habia forma de ver la evolucion de
         una empresa que aun no tienes, que es justo de la que quieres saber si esta cara.
         Mismo criterio en los dos bloques: tarjeta -> grafico, ticker -> Ficha. */
      return '<div class="mc-row cerca" data-mcgrafv="'+c.ticker+'" title="Ver el gráfico de '+_mcEsc(c.nombre)+'">'
        +'<div class="mc-l">'
        +  '<div class="mc-nom">'+_mcEsc(c.nombre)+' '+chip+'</div>'
        +  '<div class="mc-sub">BME · <b class="mc-tk" data-ficha="'+c.ticker+'" title="Abrir la ficha de '+_mcEsc(c.nombre)+'">'+c.ticker+'</b> · '+_mcEsc(c.decision||'—')
        +    (c.po>0?(' · PO '+_mcEur(c.po)):'')
        +    ' · <span class="mc-rpd'+(c.rpd==null?' nd':'')+'" title="'
        +      (c.rpd==null?'Esta empresa no está en la base de dividendos'
                          :'Dividendo bruto declarado del año en curso ÷ cotización')+'">RPD '
        +      (c.rpd==null?'—':(c.rpd.toFixed(1).replace('.',',')+'%'))+'</span></div>'
        +  barra
        +'</div>'
        +'<div class="mc-r">'
        +  '<div class="mc-cot">'+_mcEur(c.cot)+'</div>'
        +  '<div class="mc-cuando '+sc.tipo+'" title="'+_mcEsc(sc.det)+'">'+_mcEsc(sc.txt)+'</div>'
        +  '<div class="mc-dia muted">entrada ≤ <b>'+_mcEur(c.entMax)+'</b></div>'
        +  '<div class="mc-pl '+(dentro?'pos':'neg')+'">'+(dentro?'ya comprable':'sobra '+_mcEur(c.cot-c.entMax))+'</div>'
        +'</div>'
        +'</div>';
    }).join('')+'</div>';
  }

  el.innerHTML=kpis
    +'<div class="mc-h">Posiciones</div>'+lista
    +'<div class="mc-h">Cerca de entrada <span class="mc-h-s">'
    +  ((C&&C.total>C.length)?('las '+C.length+' más próximas de '+C.total+' analizadas que aún no tienes')
                             :'ordenadas por lo cerca que están de su precio de entrada')
    +'</span></div>'+cerca;

  if(!el._mcBound){
    el._mcBound=true;
    el.addEventListener('click',function(e){
      if(e.target.closest('[data-mcrefr]')){ _mcRefrescar(); return; }
      if(e.target.closest('[data-mcgraf]')){
        if(typeof mcAbrirGrafCartera==='function') mcAbrirGrafCartera();
        return;
      }
      /* El ticker se mira ANTES que la tarjeta: esta dentro de ella, y si ganara la
         tarjeta el enlace a la Ficha no llegaria a dispararse nunca. */
      const f=e.target.closest('[data-ficha]');
      if(f){
        const t=f.getAttribute('data-ficha');
        if(typeof abrirFicha==='function'){ abrirFicha(t); return; }
        if(typeof activarVista==='function') activarVista('inversiones');
        return;
      }
      const g=e.target.closest('[data-mcgrafv]');
      if(g){
        if(typeof mcAbrirGrafValor==='function') mcAbrirGrafValor(g.getAttribute('data-mcgrafv'));
        return;
      }
    });
    el.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ')return;
      const g=e.target.closest('[data-mcgraf]'); if(!g)return;
      e.preventDefault();
      if(typeof mcAbrirGrafCartera==='function') mcAbrirGrafCartera();
    });
  }
}

/* Vuelve a pedir el intradía y cuenta qué ha pasado, en lugar de dejar al usuario
   adivinando si el botón ha hecho algo. Tres desenlaces y los tres se dicen. */
function _mcRefrescar(){
  if(_mcRefrescando)return;
  if(typeof sincronizarIntradia!=='function'){ _mcAviso='Esta versión de la app no trae el intradía.'; renderMiCartera(); return; }
  /* [11-ago-2026] El estado de los cierres se pedía UNA vez por carga de página, así que
     lanzar el pase en GitHub y volver a la pestaña dejaba el aviso encendido aunque ya
     estuviera resuelto. Se pide de nuevo en cada refresco manual, que es justo cuando el
     usuario acaba de hacer algo para arreglarlo. */
  _mcEstadoPedido=false; _mcEstadoCierres=null;
  _mcRefrescando=true; _mcAviso=''; renderMiCartera();
  const _antes=(typeof _intradia!=='undefined'&&_intradia&&_intradia.hora)||'';
  Promise.resolve(sincronizarIntradia()).then(function(n){
    const j=(typeof _intradia!=='undefined')?_intradia:null;
    if(!j||!j.hora)        _mcAviso='No hay pase de hoy todavía. El siguiente entra a los minutos :00, :20 o :40.';
    else if(j.hora!==_antes) _mcAviso='Actualizado con el pase de las '+j.hora+'.';
    else                   _mcAviso='Ya tenías el último pase, el de las '+j.hora+'. El siguiente entra a los minutos :00, :20 o :40.';
  }).catch(function(){
    _mcAviso='No he podido conectar. ¿Sin cobertura?';
  }).then(function(){
    _mcRefrescando=false; renderMiCartera();
  });
}

/* --------------------------------------------------------------------------
   Estilos · se inyectan una vez, con el mismo lenguaje visual del resto de la app
   (tarjetas .card/.pos-kpis, variables --panel/--line/--muted, verdes y rojos ya
   usados en Movimientos y Análisis).
   -------------------------------------------------------------------------- */
function _mcCSS(){
  if(document.getElementById('mc-css'))return;
  const s=document.createElement('style'); s.id='mc-css';
  s.textContent=[
    /* OJO: en la app NO existe una regla suelta para `.pos-kpis`. Cada vista la declara
       con su propio prefijo (`#view-posiciones #posKpis .pos-kpis{...}`), asi que la clase
       sola no pinta NADA: los KPIs salian como texto corrido. Se replica aqui el bloque
       canonico de #view-posiciones, que es el que da el cuadro blanco con sombra y la
       tarjeta verde del total. */
    '#view-micartera .pos-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
    '#view-micartera .pos-kpis .k{background:var(--panel);border:1px solid var(--line);border-radius:14px;',
    '  padding:14px 16px;box-shadow:var(--shadow);min-width:0}',
    '#view-micartera .pos-kpis .k .l{font-size:10.5px;color:var(--muted);font-weight:700;',
    '  text-transform:uppercase;letter-spacing:.02em}',
    '#view-micartera .pos-kpis .k .v{font-size:22px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}',
    '#view-micartera .pos-kpis .k .v.pos{color:var(--green)}',
    '#view-micartera .pos-kpis .k .v.neg{color:var(--red)}',
    '#view-micartera .pos-kpis .k .p{font-size:11px;color:var(--muted);margin-top:2px}',
    '#view-micartera .pos-kpis .k.hero{background:linear-gradient(135deg,#166534,#16a34a);color:#fff;border:none}',
    '#view-micartera .pos-kpis .k.hero .l,#view-micartera .pos-kpis .k.hero .p{color:#bbf7d0}',
    '#view-micartera .pos-kpis .k.hero .v{color:#fff}',
    '#view-micartera .mc-ses{font-weight:800;color:#94a3b8;letter-spacing:0}',
    '@media(max-width:760px){#view-micartera .pos-kpis{grid-template-columns:minmax(0,1fr);gap:8px}',
    '  #view-micartera .pos-kpis .k .v{font-size:20px}}',
    '#view-micartera .mc-fuente{display:flex;align-items:center;gap:8px;font-size:12px;color:#334155;',
    '  border-radius:10px;padding:8px 12px;margin:-4px 0 16px}',
    '#view-micartera .mc-fuente .d{width:8px;height:8px;border-radius:50%;flex:none}',
    '#view-micartera .mc-fuente-t{flex:1 1 auto;line-height:1.45}',
    '#view-micartera .mc-refr{flex:none;font-size:11px;font-weight:700;border-radius:20px;cursor:pointer;',
    '  padding:3px 10px;background:#fff;border:1px solid var(--line);color:#334155}',
    '#view-micartera .mc-refr:hover{background:#f1f5f9}',
    '#view-micartera .mc-refr[disabled]{opacity:.55;cursor:default}',
    '#view-micartera .mc-gh{text-decoration:none;display:inline-block}',
    '#view-micartera .mc-max{font-size:12px;color:#334155;background:#f8fafc;border:1px solid var(--line);',
    '  border-radius:10px;padding:8px 12px;margin:-8px 0 16px;line-height:1.5}',
    '#view-micartera .mc-max.cargando{color:var(--muted)}',
    '#view-micartera .mc-max.ojo{background:#fffbeb;border-color:#fde68a;color:#92400e}',
    '#view-micartera .mc-max-pie{display:block;font-size:10.5px;color:var(--muted);margin-top:2px}',
    '#view-micartera .mc-max-ojo{display:block;font-size:10.5px;color:#b45309;margin-top:2px}',
    /* [18-ago-2026] El máximo intradía va separado del de cierres por una línea fina: son
       dos medidas con distinta profundidad histórica y no deben leerse como una sola. */
    '#view-micartera .mc-max-intra{display:block;margin-top:7px;padding-top:6px;',
    'border-top:1px dashed var(--line)}',
    '#view-micartera .mc-aviso{font-size:11.5px;color:var(--muted);margin:-10px 0 16px;padding:0 4px}',
    '#view-micartera .mc-fuente.viva{background:#eef2ff;border:1px solid #c7d2fe}',
    '#view-micartera .mc-fuente.viva .d{background:#4f46e5}',
    '#view-micartera .mc-fuente.vieja{background:#fef3c7;border:1px solid #fde68a;color:#92400e}',
    '#view-micartera .mc-fuente.vieja .d{background:#d97706}',
    '#view-micartera .mc-fuente.cierre{background:#f8fafc;border:1px solid var(--line)}',
    '#view-micartera .mc-fuente.cierre .d{background:#94a3b8}',
    '#view-micartera .mc-tk{color:var(--brand);cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
    '#view-micartera .mc-row{cursor:pointer}',
    '#view-micartera .mc-cuando{font-size:10px;font-weight:700;color:#94a3b8;margin-top:1px;letter-spacing:.01em}',
    '#view-micartera .mc-cuando.intradia{color:#4f46e5}',
    '#view-micartera .mc-cuando.viejo{color:#b45309}',
    '#view-micartera .mc-cuando.oficial{color:#0f766e}',
    '#view-micartera .mc-h{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;',
    '  color:var(--muted);margin:22px 0 8px;display:flex;align-items:baseline;gap:8px}',
    '#view-micartera .mc-h-s{font-size:11px;font-weight:600;text-transform:none;letter-spacing:0;opacity:.8}',
    '#view-micartera .mc-list{background:var(--panel);border:1px solid var(--line);border-radius:14px;',
    '  box-shadow:var(--shadow);overflow:hidden}',
    '#view-micartera .mc-row{display:flex;align-items:flex-start;gap:12px;padding:13px 16px;cursor:pointer;',
    '  border-bottom:1px solid var(--line);transition:background .12s}',
    '#view-micartera .mc-row:last-child{border-bottom:none}',
    '#view-micartera .mc-row:hover{background:#f8fafc}',
    '#view-micartera .mc-l{flex:1 1 auto;min-width:0}',
    '#view-micartera .mc-r{flex:none;text-align:right;min-width:132px}',
    '#view-micartera .mc-nom{font-size:16px;font-weight:700;color:#0f172a;line-height:1.25;',
    '  display:flex;align-items:center;gap:7px;flex-wrap:wrap}',
    '#view-micartera .mc-sub{font-size:11.5px;color:var(--muted);margin-top:2px}',
    '#view-micartera .mc-sub b{color:#475569}',
    '#view-micartera .mc-rpd{font-weight:800;color:#0f766e}',
    '#view-micartera .mc-rpd.nd{font-weight:600;color:#cbd5e1}',
    '#view-micartera .mc-cart{font-size:9.5px;font-weight:700;background:#eef2ff;color:#3730a3;',
    '  border:1px solid #c7d2fe;border-radius:20px;padding:1px 7px}',
    '#view-micartera .mc-cot{font-size:19px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums;line-height:1.2}',
    '#view-micartera .mc-dia{font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:1px}',
    '#view-micartera .mc-dia span{font-weight:600}',
    '#view-micartera .mc-pl{font-size:11px;color:var(--muted);font-weight:600;margin-top:3px;font-variant-numeric:tabular-nums}',
    '#view-micartera .pos{color:#16a34a}#view-micartera .neg{color:#dc2626}',
    '#view-micartera .mc-pl.pos{color:#15803d}#view-micartera .mc-pl.neg{color:#b91c1c}',
    '#view-micartera .muted{color:var(--muted)}',
    '#view-micartera .mc-chip{font-size:10px;font-weight:800;border-radius:20px;padding:1px 8px}',
    '#view-micartera .mc-chip.in{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}',
    '#view-micartera .mc-chip.near{background:#fef3c7;color:#92400e;border:1px solid #fde68a}',
    '#view-micartera .mc-chip.far{background:#ffedd5;color:#9a3412;border:1px solid #fed7aa}',
    '#view-micartera .mc-bar{position:relative;height:5px;background:linear-gradient(90deg,#bbf7d0 0%,#fde68a 25%,#fed7aa 100%);',
    '  border-radius:4px;margin-top:7px;max-width:230px}',
    '#view-micartera .mc-bar u{position:absolute;left:25%;top:-2px;width:1px;height:9px;background:#64748b;opacity:.7}',
    '#view-micartera .mc-bar i{position:absolute;top:-3px;width:3px;height:11px;background:#0f172a;border-radius:2px;transform:translateX(-1px)}',
    '#view-micartera .mc-leyenda{font-size:11.5px;color:var(--muted);margin-top:7px;line-height:1.5}',
    '#view-micartera .mc-vacio{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:12px;',
    '  padding:13px 15px;font-size:13px}',
    '@media(max-width:560px){',
    '  #view-micartera .mc-row{padding:11px 13px;gap:8px}',
    '  #view-micartera .mc-nom{font-size:15px}',
    '  #view-micartera .mc-cot{font-size:17px}',
    '  #view-micartera .mc-r{min-width:118px}',
    '}',
  ].join('');
  document.head.appendChild(s);
}
