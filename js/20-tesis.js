/* ============================================================================
 * 20-tesis.js — Ficha de Tesis (Método KH&Claude)
 * Vista dedicada a la DECISIÓN: ¿está la empresa en zona de invertir?
 * Semáforo de 3 capas  Calidad (¿vale?) × Precio (¿ahora?) × Renta (¿paga bien?)
 * + gráfico de tendencia del dividendo (pagos / cortes / reanudación / racha)
 * + termómetro de precio (stop · entrada · cotización · PO)
 * Reutiliza datos ya existentes (DB.analisis, _tesisCache, evo*, forense, DS).
 * NO inventa datos: lo que falta se marca como "Pte. Revisión" / "sin dato".
 * ========================================================================== */

/* --------- Umbrales (AJUSTABLES) --------- */
var TESIS_CFG = {
  potMin:    0.15,   // potencial mínimo a PO base para considerar "oportunidad" en zona
  cercaPct:  0.08,   // margen por encima de la entrada que aún cuenta como "cerca"
  dsMin:     60,     // Dividend Safety mínimo para renta "sólida"
  rpdGate:   3,      // RPD (%) que activa el filtro de renta en cualquier arquetipo
  corteAnios:2,      // un corte de dividendo en los últimos N años penaliza
  ratingApta:    ['AAA','AA','A','BBB'],
  ratingDuda:    ['BB','B'],
  ratingDescarta:['CCC','CC','C','D']
};
/* Arquetipos donde el dividendo es núcleo de la tesis (filtro de renta = gate). */
var TESIS_ARQ_RENTA = ['REGULADAS','CONCESIONAL','FINANCIERAS','INMOBILIARIAS'];

/* --------- Colores --------- */
var TZ_COL = { ok:'#16a34a', mid:'#d97706', bad:'#dc2626', na:'#94a3b8', blue:'#2563eb' };
var TZ_VCOL = { INVERTIR:'#16a34a', ESPERAR:'#d97706', FUERA:'#dc2626' };
var TZ_VLBL = { INVERTIR:'ZONA DE INVERTIR', ESPERAR:'ESPERAR / VIGILAR', FUERA:'FUERA' };

/* --------- Helpers seguros --------- */
function _tzEsc(s){ return (typeof _radEsc==='function')?_radEsc(s):(''+ (s==null?'':s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function _tzNum(x){ return (typeof num==='function')?num(x):(isNaN(parseFloat(x))?0:parseFloat(x)); }
function _tzFmt(x){ return (typeof fmt==='function')?fmt(x):(_tzNum(x).toFixed(2)+' €'); }
function _tzPct(fr){ if(fr==null||!isFinite(fr))return '—'; return (typeof fmtpct==='function')?fmtpct(fr):((fr>=0?'+':'')+(fr*100).toFixed(1)+'%'); }
function _tzAna(t){ return (DB.analisis||[]).find(function(a){return (a.ticker||'').toUpperCase()===t;})||null; }
function _tzTesis(t){ return (typeof _tesisCache!=='undefined'&&_tesisCache&&_tesisCache[t])?_tesisCache[t]:null; }
function _tzArq(t){ var u=(DB.universo||{})[t]||{}; return (u.arquetipo||'').toUpperCase(); }
function _tzNombre(t){ var a=_tzAna(t); if(a&&a.nombre)return a.nombre; var u=(DB.universo||{})[t]||{}; return u.nombre||t; }
function _tzPrecio(t){ var v=(DB.valores||{})[t]||{}; var p=_tzNum(v.precioActual); if(p>0)return p; var a=_tzAna(t); return a?_tzNum(a.cotizacion):0; }
function _tzRPD(t){ var p=_tzPrecio(t); var a=_tzAna(t); var d=a?_tzNum(a.divAccion):0; if(!(d>0)){ var v=(DB.valores||{})[t]||{}; d=_tzNum(v.divAccion); } return (p>0&&d>0)?(d/p*100):null; }
function _tzConf(J){ if(!J)return null; var c=J.confianza; if(c==null)return null; if(typeof c==='string')return c.toUpperCase(); return (c.letra||c.nivel||c.grado||c.rating||null); }
function _tzMeses(f){ if(!f)return null; if(typeof mesesDesde==='function')return mesesDesde(f); var d=new Date(f+'T00:00:00'); if(isNaN(d))return null; return Math.round((Date.now()-d.getTime())/2629800000); }

/* --------- Serie de dividendo (real + proyectado + cortes) --------- */
function _tzDivSerie(t){
  t=(t||'').toUpperCase();
  var years=(typeof evoYearsDisponibles==='function')?evoYearsDisponibles():[];
  if(!years.length){
    /* respaldo: DB.divPorAccion */
    var dp=(DB.divPorAccion||{})[t]||{}; years=Object.keys(dp).sort();
  }
  var serie=[], prev=null, cy=(new Date()).getFullYear();
  years.forEach(function(y){
    var yr=parseInt(y,10);
    var real=(typeof evoDpaBruto==='function')?evoDpaBruto(t,y):null;
    if(real==null){ var dp2=(DB.divPorAccion||{})[t]||{}; if(dp2[y]!=null)real=_tzNum(dp2[y]); }
    var esFut=(yr>cy);
    var val, isProj=false, isCut=false;
    if(esFut){
      /* Año FUTURO: solo se pinta si hay previsión real (>0). Un 0/placeholder previsto
         NO es un corte (el corte es un hecho histórico, no una estimación). */
      var pr=(typeof evoDpaProyectado==='function')?evoDpaProyectado(t,y):null;
      if(pr==null || !(pr>0)) return;
      val=_tzNum(pr); isProj=true;
    } else if(yr===cy){
      /* Año EN CURSO: si el dividendo aún no está declarado (null o 0) no se pinta ni
         cuenta como corte (está pendiente). Solo se pinta si ya hay un valor real >0. */
      if(real==null || _tzNum(real)===0) return;
      val=_tzNum(real);
    } else {
      /* Años pasados CERRADOS: aquí un 0 real sí es un corte de dividendo. */
      if(real==null) return;
      val=_tzNum(real);
      isCut=(val===0);
    }
    var delta=null; if(prev!=null && prev>0 && val>0) delta=(val-prev)/prev;
    serie.push({ year:yr, val:val, real:!esFut, proj:isProj, cut:isCut, delta:delta, reanuda:false });
    if(val>0) prev=val;
  });
  /* marcar reanudación (primer año >0 tras un corte) */
  for(var i=1;i<serie.length;i++){ if(serie[i].val>0 && serie[i-1].cut) serie[i].reanuda=true; }
  /* racha: años consecutivos crecientes al final (o campo racha del modelo) */
  var racha=null;
  var lastReal=serie.filter(function(s){return s.real;}).slice(-1)[0];
  if(lastReal && typeof evoAnioM==='function'){ var am=evoAnioM(t,lastReal.year); if(am&&am.racha!=null)racha=_tzNum(am.racha); }
  if(racha==null){ racha=0; for(var j=serie.length-1;j>0;j--){ if(serie[j].val>serie[j-1].val && serie[j-1].val>0) racha++; else break; } }
  /* CAGR entre primer y último año con valor >0 */
  var pos=serie.filter(function(s){return s.val>0;}); var cagr=null;
  if(pos.length>=2){ var a0=pos[0], a1=pos[pos.length-1], n=a1.year-a0.year; if(n>0 && a0.val>0) cagr=Math.pow(a1.val/a0.val,1/n)-1; }
  var cortes=serie.filter(function(s){return s.cut;}).map(function(s){return s.year;});
  return { serie:serie, racha:racha, cagr:cagr, cortes:cortes };
}

/* --------- Gráfico SVG de dividendo --------- */
function _tzDivChart(t){
  var D=_tzDivSerie(t); var s=D.serie;
  if(!s.length) return '<div class="muted" style="font-size:12px;padding:10px 0">Sin histórico de dividendo. Rellénalo en <b>Evolución del Dividendo</b>.</div>';
  var maxV=Math.max.apply(null,s.map(function(x){return x.val;})); if(!(maxV>0))maxV=1;
  var n=s.length, padL=8, padR=8, padT=14, padB=26, bw=Math.min(46,Math.max(20,Math.floor(560/n)));
  var W=padL+padR+n*bw, H=150, plotH=H-padT-padB, base=padT+plotH;
  var bars='', lbls='';
  s.forEach(function(x,i){
    var cx=padL+i*bw+bw/2, bh=x.val>0?Math.max(2,(x.val/maxV)*plotH):0, y=base-bh, halfw=Math.max(8,bw*0.62);
    var col=x.cut?TZ_COL.bad:(x.delta==null?TZ_COL.na:(x.delta>0.001?TZ_COL.ok:(x.delta<-0.001?TZ_COL.bad:TZ_COL.na)));
    if(x.cut){
      bars+='<rect x="'+(cx-halfw/2)+'" y="'+(base-6)+'" width="'+halfw+'" height="6" fill="'+TZ_COL.bad+'" opacity="0.35"/>'+
            '<text x="'+cx+'" y="'+(base-9)+'" text-anchor="middle" font-size="11">✂️</text>';
    } else {
      bars+='<rect x="'+(cx-halfw/2)+'" y="'+y+'" width="'+halfw+'" height="'+bh+'" rx="2" fill="'+col+'"'+(x.proj?' opacity="0.45" stroke="'+col+'" stroke-dasharray="2 2"':'')+'/>';
      if(x.reanuda) bars+='<circle cx="'+cx+'" cy="'+(y-5)+'" r="3" fill="'+TZ_COL.ok+'"/>';
    }
    lbls+='<text x="'+cx+'" y="'+(H-14)+'" text-anchor="middle" font-size="9" fill="#64748b">'+("'"+(''+x.year).slice(2))+'</text>';
    if(i===0||i===n-1||x.cut||x.reanuda) lbls+='<text x="'+cx+'" y="'+(H-4)+'" text-anchor="middle" font-size="8" fill="#94a3b8">'+(x.val>0?(''+x.val).replace('.',','):'0')+'</text>';
  });
  var svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;max-height:170px" xmlns="http://www.w3.org/2000/svg">'+
          '<line x1="'+padL+'" y1="'+base+'" x2="'+(W-padR)+'" y2="'+base+'" stroke="#e2e8f0"/>'+bars+lbls+'</svg>';
  var chips=[];
  chips.push('<span style="background:'+(D.cagr==null?TZ_COL.na:(D.cagr>=0?TZ_COL.ok:TZ_COL.bad))+';color:#fff;border-radius:6px;padding:1px 8px;font-size:11px;font-weight:700">CAGR '+(D.cagr==null?'n.d.':_tzPct(D.cagr))+'</span>');
  chips.push('<span style="background:#0f172a;color:#fff;border-radius:6px;padding:1px 8px;font-size:11px;font-weight:700">Racha '+D.racha+' año'+(D.racha===1?'':'s')+'</span>');
  if(D.cortes.length) chips.push('<span style="background:'+TZ_COL.bad+';color:#fff;border-radius:6px;padding:1px 8px;font-size:11px;font-weight:700">✂️ Corte '+D.cortes.join(', ')+'</span>');
  else chips.push('<span style="background:'+TZ_COL.ok+';color:#fff;border-radius:6px;padding:1px 8px;font-size:11px;font-weight:700">Sin cortes</span>');
  return svg+'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">'+chips.join('')+'</div>'+
         '<div class="muted" style="font-size:10.5px;margin-top:5px">Barras = dividendo bruto/acción por año (verde sube · rojo baja · gris plano · translúcida = previsión). ✂️ = año sin dividendo (corte); ● verde = reanudación.</div>';
}

/* --------- Termómetro de precio --------- */
function _tzPriceBar(V){
  var precio=V.precio, stop=V.stop, ent=V.entMax, pob=V.poBase, pobull=V.poBull;
  var pts=[stop,ent,precio,pob,pobull].filter(function(x){return x!=null&&x>0;});
  if(!(precio>0)||pts.length<2) return '<div class="muted" style="font-size:12px;padding:6px 0">Faltan precio o niveles (banda de entrada / PO / stop) en Análisis.</div>';
  var lo=Math.min.apply(null,pts)*0.97, hi=Math.max.apply(null,pts)*1.03, rng=hi-lo||1;
  var X=function(v){ return ((v-lo)/rng)*100; };
  var W=100, segs='';
  /* zonas: ≤ent verde, ent..PO ámbar, >PO rojo (sobre el eje) */
  if(ent>0) segs+='<rect x="0" y="9" width="'+X(ent)+'" height="6" fill="'+TZ_COL.ok+'" opacity="0.28"/>';
  if(ent>0&&pob>0) segs+='<rect x="'+X(ent)+'" y="9" width="'+Math.max(0,X(pob)-X(ent))+'" height="6" fill="'+TZ_COL.mid+'" opacity="0.28"/>';
  if(pob>0) segs+='<rect x="'+X(pob)+'" y="9" width="'+Math.max(0,100-X(pob))+'" height="6" fill="'+TZ_COL.bad+'" opacity="0.24"/>';
  var mk=function(v,col,lab,up){ if(!(v>0))return ''; var x=X(v); return '<line x1="'+x+'" y1="7" x2="'+x+'" y2="17" stroke="'+col+'" stroke-width="0.8"/>'+
     '<text x="'+Math.max(2,Math.min(98,x))+'" y="'+(up?5:24)+'" text-anchor="middle" font-size="3.2" fill="'+col+'">'+lab+'</text>'; };
  var marks=mk(stop,TZ_COL.bad,'stop',true)+mk(ent,TZ_COL.ok,'entrada',false)+mk(pob,TZ_COL.blue,'PO',true)+mk(pobull,'#7c3aed','PO+',false);
  var px=X(precio); var pcol=(ent>0&&precio<=ent)?TZ_COL.ok:(pob>0&&precio<=pob?TZ_COL.mid:TZ_COL.bad);
  var dot='<circle cx="'+px+'" cy="12" r="2.4" fill="'+pcol+'" stroke="#fff" stroke-width="0.6"/>'+
          '<text x="'+Math.max(3,Math.min(97,px))+'" y="30" text-anchor="middle" font-size="3.4" font-weight="700" fill="'+pcol+'">'+_tzFmt(precio)+'</text>';
  return '<svg viewBox="0 0 100 32" style="width:100%;height:auto;max-height:64px" xmlns="http://www.w3.org/2000/svg">'+segs+
         '<line x1="0" y1="12" x2="100" y2="12" stroke="#cbd5e1" stroke-width="0.4"/>'+marks+dot+'</svg>';
}

/* --------- Motor de veredicto (3 capas) --------- */
function tesisVeredicto(t){
  t=(t||'').toUpperCase(); var a=_tzAna(t); var J=_tzTesis(t)||{};
  if(!a && !J.ticker) return null;
  a=a||{};
  var precio=_tzPrecio(t);
  var rating=((a.rating||J.rating||'')+'').toUpperCase();
  var dec=((a.decision||J.decision||'')+'').toUpperCase();
  var poBear=_tzNum(a.poMin||J.poBear)||null;
  var poBull=_tzNum(a.poMax||J.poBull)||null;
  var poBase=_tzNum(a.precioObjetivo)|| (J.poBase!=null?_tzNum(J.poBase):null) || ((poBear&&poBull)?(poBear+poBull)/2:(poBull||poBear||null));
  var entMax=_tzNum(a.entMax||J.entMax)||null;
  var stop=_tzNum(a.stopTesis||J.stop)||null;
  var fo=a.forense||J.forense||null;
  var ds=a.dividendSafety||J.dividendSafety||null;
  var rdcf=a.reverseDcf||J.reverseDcf||null;
  var conf=_tzConf(J);
  var arq=_tzArq(t);
  var rpd=_tzRPD(t);
  var potBase=(poBase&&precio>0)?(poBase-precio)/precio:null;

  /* Capa 1 — Calidad */
  var c1, c1txt, c1r=[];
  var veto=(typeof _radFoVeto==='function')&&_radFoVeto(fo);
  if(dec==='VENDER'){ c1='DESCARTA'; c1r.push('decisión VENDER'); }
  else if(veto){ c1='DESCARTA'; c1r.push('veto forense (fraude/insolvencia)'); }
  else if(rating && TESIS_CFG.ratingDescarta.indexOf(rating)>=0){ c1='DESCARTA'; c1r.push('calidad muy baja ('+rating+')'); }
  else if((conf&&(''+conf).toUpperCase()==='C') || (rdcf&&/HEROIC/i.test(rdcf.veredicto||'')) || (rating&&TESIS_CFG.ratingDuda.indexOf(rating)>=0)){
    c1='DUDA';
    if(conf&&(''+conf).toUpperCase()==='C')c1r.push('confianza del dato baja (C)');
    if(rdcf&&/HEROIC/i.test(rdcf.veredicto||''))c1r.push('el precio ya descuenta un crecimiento heroico');
    if(rating&&TESIS_CFG.ratingDuda.indexOf(rating)>=0)c1r.push('calidad media ('+rating+')');
  } else { c1='APTA'; }
  c1txt=(c1==='APTA')?('calidad '+(rating||'s/rating')):(c1==='DUDA'?'con salvedades':'descartada');

  /* Capa 2 — Precio */
  var c2, c2txt;
  if(!(precio>0)){ c2='SINDATO'; c2txt='falta cotización'; }
  else if(stop && precio<=stop){ c2='STOP'; c2txt='stop tocado ('+_tzFmt(stop)+')'; }
  else if(entMax && precio<=entMax){ c2=(potBase!=null&&potBase>=TESIS_CFG.potMin)?'ENZONA':'ZONAFLOJA'; c2txt=(c2==='ENZONA')?('en zona (≤ '+_tzFmt(entMax)+', '+_tzPct(potBase)+' a PO)'):('en zona pero poco recorrido ('+_tzPct(potBase)+')'); }
  else if(entMax && precio<=entMax*(1+TESIS_CFG.cercaPct)){ c2='CERCA'; c2txt='cerca de la entrada ('+_tzFmt(entMax)+')'; }
  else if(poBase && precio<=poBase){ c2='CERCA'; c2txt='entre entrada y PO'; }
  else if(poBase && precio>poBase){ c2='CARA'; c2txt='por encima del PO ('+_tzFmt(poBase)+')'; }
  else { c2='SINDATO'; c2txt='falta banda de entrada / PO'; }

  /* Capa 3 — Renta (contextual) */
  var esRenta=(TESIS_ARQ_RENTA.indexOf(arq)>=0) || (rpd!=null && rpd>=TESIS_CFG.rpdGate);
  var Dv=_tzDivSerie(t);
  var corteReciente=false, corteYear=null; var cy=new Date().getFullYear();
  Dv.cortes.forEach(function(y){ if(y<=cy && (cy-y)<=TESIS_CFG.corteAnios){ corteReciente=true; corteYear=y; } });
  var dsScore=(ds&&ds.score!=null)?_tzNum(ds.score):null;
  var tope=!!(ds&&ds.topeDuro&&ds.topeDuro.activo);
  var c3, c3txt;
  if(!esRenta){ c3='NA'; c3txt='el dividendo no es núcleo de la tesis'; }
  else if(tope || (dsScore!=null&&dsScore<TESIS_CFG.dsMin) || corteReciente){
    c3='DEBIL';
    c3txt=tope?'dividendo no cubierto por caja':(corteReciente?('cortó el dividendo en '+corteYear):('safety bajo ('+(dsScore!=null?dsScore:'n/a')+')'));
  } else { c3='SOLIDA'; c3txt='dividendo fiable'+(dsScore!=null?(' (safety '+dsScore+')'):''); }

  /* Veredicto combinado */
  var v;
  if(c1==='DESCARTA' || c2==='STOP') v='FUERA';
  else if(c2==='ENZONA' && c1==='APTA' && (c3==='SOLIDA'||c3==='NA')) v='INVERTIR';
  else v='ESPERAR';

  /* Frase */
  var frase;
  if(v==='INVERTIR') frase='Empresa de '+c1txt+', '+c2txt+' y '+c3txt+'. Candidata de compra según tu método.';
  else if(v==='FUERA') frase='Fuera: '+(c1==='DESCARTA'?c1r.join('; '):c2txt)+'. No es momento de invertir.';
  else {
    var motivo=[];
    if(c2==='CARA') motivo.push('está cara ('+c2txt+')');
    else if(c2==='CERCA'||c2==='ZONAFLOJA') motivo.push(c2txt);
    else if(c2==='SINDATO') motivo.push(c2txt);
    if(c1==='DUDA') motivo.push('con salvedades ('+c1r.join('; ')+')');
    if(c3==='DEBIL') motivo.push('renta débil: '+c3txt);
    frase='Buena base, pero '+(motivo.join(' y ')||'aún no cumple todas las condiciones')+'. '+((c2==='CERCA'||c2==='ZONAFLOJA'||c2==='CARA')&&entMax?('Esperar a ≤ '+_tzFmt(entMax)+'.'):'Vigilar.');
  }

  return { t:t, nombre:_tzNombre(t), arq:arq, precio:precio, rating:rating, dec:dec,
    poBear:poBear, poBase:poBase, poBull:poBull, entMax:entMax, stop:stop, potBase:potBase,
    fo:fo, ds:ds, dsScore:dsScore, rdcf:rdcf, conf:conf, rpd:rpd, esRenta:esRenta,
    robustez:J.robustez||null, moat:J.moat||a.moat||null, dossierFecha:a.dossierFecha||J.fecha||null,
    catalizadores:J.catalizadores||[], riesgos:J.riesgos||[], bull:J.bull||'', bear:J.bear||'', resumen:J.resumen||'',
    c1:c1, c2:c2, c3:c3, c1r:c1r, c1txt:c1txt, c2txt:c2txt, c3txt:c3txt, v:v, frase:frase, div:Dv };
}

/* --------- Sub-luz (chip de capa) --------- */
function _tzLuz(estado){
  var m={ APTA:['ok','Apta'], DUDA:['mid','Con salvedades'], DESCARTA:['bad','Descartada'],
          ENZONA:['ok','En zona'], ZONAFLOJA:['mid','Zona (flojo)'], CERCA:['mid','Cerca'], CARA:['bad','Cara'], STOP:['bad','Stop'], SINDATO:['na','Sin dato'],
          SOLIDA:['ok','Sólida'], DEBIL:['bad','Débil'], NA:['na','No aplica'] };
  var e=m[estado]||['na',estado]; return { col:TZ_COL[e[0]], lbl:e[1] };
}
function _tzSubluces(V){
  var rows=[['Calidad',V.c1,V.c1r.length?V.c1r.join('; '):V.c1txt],['Precio',V.c2,V.c2txt],['Renta',V.c3,V.c3txt]];
  return rows.map(function(r){ var L=_tzLuz(r[1]); return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0">'+
    '<span style="width:11px;height:11px;border-radius:50%;background:'+L.col+';flex:none"></span>'+
    '<b style="width:64px;font-size:12px">'+r[0]+'</b>'+
    '<span style="font-size:12px;color:'+L.col+';font-weight:700;width:104px">'+L.lbl+'</span>'+
    '<span class="muted" style="font-size:11.5px">'+_tzEsc(r[2])+'</span></div>'; }).join('');
}

/* --------- Tarjeta resumen (grid) --------- */
function _tzCard(V,sel){
  var L=_tzLuz(V.c1),L2=_tzLuz(V.c2),L3=_tzLuz(V.c3);
  var vcol=TZ_VCOL[V.v];
  var dots='<span style="width:9px;height:9px;border-radius:50%;background:'+L.col+';display:inline-block"></span>'+
           '<span style="width:9px;height:9px;border-radius:50%;background:'+L2.col+';display:inline-block;margin:0 3px"></span>'+
           '<span style="width:9px;height:9px;border-radius:50%;background:'+L3.col+';display:inline-block"></span>';
  return '<div class="tz-card'+(sel?' sel':'')+'" data-tzpick="'+_tzEsc(V.t)+'" style="border:1px solid '+(sel?vcol:'#e2e8f0')+';border-left:4px solid '+vcol+';border-radius:12px;padding:10px 12px;cursor:pointer;background:'+(sel?'#f8fafc':'#fff')+'">'+
    '<div style="display:flex;align-items:center;gap:8px"><b style="font-size:15px;color:var(--brand,#0f172a)">'+_tzEsc(V.t)+'</b>'+
    '<span class="muted" style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_tzEsc((V.nombre||'').slice(0,20))+'</span>'+dots+'</div>'+
    '<div style="font-size:12.5px;font-weight:800;color:'+vcol+';margin:5px 0 3px">'+TZ_VLBL[V.v]+'</div>'+
    '<div style="display:flex;gap:10px;font-size:11px;color:#475569;flex-wrap:wrap">'+
      '<span>Cotiza <b>'+_tzFmt(V.precio)+'</b></span>'+
      (V.potBase!=null?'<span>Pot. <b style="color:'+(V.potBase>=0?TZ_COL.ok:TZ_COL.bad)+'">'+_tzPct(V.potBase)+'</b></span>':'')+
      (V.rpd!=null?'<span>RPD <b>'+V.rpd.toFixed(1).replace('.',',')+'%</b></span>':'')+
      (V.rating?'<span>'+_tzEsc(V.rating)+'</span>':'')+
    '</div>'+
    (V.precio>0?('<div style="margin-top:8px">'+_tzPriceBar(V)+'</div>'):'')+
    '</div>';
}

/* --------- Badges (confianza / DS / forense / reverseDcf / robustez) --------- */
function _tzBadges(V){
  var b=[];
  if(V.conf) b.push('<span title="Confianza del dato" style="background:#334155;color:#fff;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">Confianza '+_tzEsc(V.conf)+'</span>');
  if(V.ds && typeof _radDsCell==='function') b.push('💧 '+_radDsCell(V.ds));
  if(V.fo && typeof _radFoCell==='function') b.push('🔬 '+_radFoCell(V.fo));
  if(V.rdcf && V.rdcf.veredicto) b.push('<span title="Reverse DCF: crecimiento implícito en el precio" style="background:#1e3a8a;color:#fff;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">📈 '+_tzEsc(V.rdcf.veredicto)+'</span>');
  if(V.robustez && (V.robustez.veredicto||V.robustez.robusta!=null)) b.push('<span title="Robustez de la decisión ante ±sensibilidad" style="background:#0f766e;color:#fff;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">🛡️ '+_tzEsc(V.robustez.veredicto||(V.robustez.robusta?'robusta':'sensible'))+'</span>');
  return b.length?('<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">'+b.join('')+'</div>'):'';
}

/* --------- Lista de catalizadores / riesgos / tesis --------- */
function _tzLista(arr,col){
  if(!arr||!arr.length)return '<div class="muted" style="font-size:11px">—</div>';
  return '<ul style="margin:4px 0 0;padding-left:16px">'+arr.slice(0,5).map(function(x){ var s=(typeof x==='string')?x:(x&&(x.titulo||x.texto||x.nombre)||''); return '<li style="font-size:12px;margin-bottom:3px;color:#334155">'+_tzEsc(s)+'</li>'; }).join('')+'</ul>';
}

/* --------- Panel de detalle --------- */
function _tzDetalle(t){
  var V=tesisVeredicto(t); if(!V) return '<div class="empty">Sin datos de tesis para '+_tzEsc(t)+'.</div>';
  var vcol=TZ_VCOL[V.v];
  var mm=_tzMeses(V.dossierFecha);
  var head='<div class="card" style="border-left:5px solid '+vcol+'"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
    '<div><div style="font-size:19px;font-weight:800;color:var(--brand,#0f172a)">'+_tzEsc(V.t)+' · '+_tzEsc(V.nombre)+'</div>'+
    '<div class="muted" style="font-size:11px">'+_tzEsc(V.arq||'Sin arquetipo')+(V.dossierFecha?(' · análisis '+_tzEsc(V.dossierFecha)+(mm!=null?(' ('+mm+'m'+(mm>12?' ⚠️':'')+')'):'')):'')+'</div></div>'+
    '<div style="flex:1"></div>'+
    '<div style="text-align:right"><div style="font-size:20px;font-weight:900;color:'+vcol+'">'+TZ_VLBL[V.v]+'</div>'+
    '<button class="btn ghost sm" data-tzficha="'+_tzEsc(V.t)+'" style="margin-top:4px">Abrir ficha completa →</button></div></div>'+
    '<div style="font-size:13px;margin-top:8px;color:#1e293b">'+_tzEsc(V.frase)+'</div>'+_tzBadges(V)+'</div>';

  var semaforo='<div class="card" style="margin-top:10px"><div style="font-weight:700;font-size:13px;margin-bottom:2px">Semáforo de decisión</div>'+_tzSubluces(V)+
    '<div class="muted" style="font-size:10.5px;margin-top:6px">Verde solo si Calidad = Apta, Precio = En zona y Renta = Sólida o No aplica. Umbrales: potencial ≥ '+(TESIS_CFG.potMin*100)+'%, Dividend Safety ≥ '+TESIS_CFG.dsMin+', filtro de renta en '+TESIS_ARQ_RENTA.join('/').toLowerCase()+' o RPD ≥ '+TESIS_CFG.rpdGate+'%.</div></div>';

  var niveles='<div class="card" style="margin-top:10px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">Precio y niveles</div>'+_tzPriceBar(V)+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin-top:8px">'+
    [['Cotización',_tzFmt(V.precio)],['Entrada máx',V.entMax?_tzFmt(V.entMax):'—'],['PO bear',V.poBear?_tzFmt(V.poBear):'—'],['PO base',V.poBase?_tzFmt(V.poBase):'—'],['PO bull',V.poBull?_tzFmt(V.poBull):'—'],['Stop',V.stop?_tzFmt(V.stop):'—'],['Potencial a PO',V.potBase!=null?_tzPct(V.potBase):'—'],['RPD',V.rpd!=null?(V.rpd.toFixed(1).replace('.',',')+'%'):'—']]
    .map(function(k){ return '<div style="background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;padding:6px 8px"><div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.02em">'+k[0]+'</div><div style="font-size:14px;font-weight:700">'+k[1]+'</div></div>'; }).join('')+
    '</div></div>';

  var dividendo='<div class="card" style="margin-top:10px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">Historia y salud del dividendo</div>'+_tzDivChart(V.t)+'</div>';

  var cual='<div class="card" style="margin-top:10px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
    '<div><div style="font-weight:700;font-size:12px;color:'+TZ_COL.ok+'">▲ A favor / catalizadores</div>'+_tzLista(V.catalizadores)+(V.bull?'<div style="font-size:12px;margin-top:6px;color:#334155">'+_tzEsc(V.bull)+'</div>':'')+'</div>'+
    '<div><div style="font-weight:700;font-size:12px;color:'+TZ_COL.bad+'">▼ En contra / riesgos</div>'+_tzLista(V.riesgos)+(V.bear?'<div style="font-size:12px;margin-top:6px;color:#334155">'+_tzEsc(V.bear)+'</div>':'')+'</div>'+
    '</div>'+(V.moat?'<div class="muted" style="font-size:11.5px;margin-top:8px"><b>Moat:</b> '+_tzEsc(V.moat)+'</div>':'')+'</div>';

  return head+'<div class="tz-3col">'+semaforo+niveles+dividendo+'</div>'+cual;
}

/* Inyecta (una vez) el CSS del layout de 3 columnas → 1 en móvil */
function _tzCss(){
  if(typeof document==='undefined' || document.getElementById('tz-css'))return;
  var s=document.createElement('style'); s.id='tz-css';
  s.textContent='.tz-3col{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px;align-items:stretch}.tz-3col>.card{margin-top:0!important}@media(max-width:860px){.tz-3col{grid-template-columns:1fr}}';
  (document.head||document.body||document.documentElement).appendChild(s);
}

/* --------- Universo de empresas con tesis --------- */
function _tzUniverso(){
  var out=[], seen={};
  (DB.analisis||[]).forEach(function(a){ var t=(a.ticker||'').toUpperCase(); if(!t||seen[t])return; if(a.decision||a.rating||a.dossierFecha){ seen[t]=1; out.push(t); } });
  if(typeof _tesisCache==='object' && _tesisCache) Object.keys(_tesisCache).forEach(function(t){ t=(t||'').toUpperCase(); if(t&&!seen[t]&&_tesisCache[t]){ seen[t]=1; out.push(t); } });
  return out;
}
var _TZ_RANK={ INVERTIR:0, ESPERAR:1, FUERA:2 };

/* --------- Vista principal --------- */
function renderTesisInv(){
  var host=document.getElementById('tesisHost'); if(!host)return;
  _tzCss(); _tzTopBtn();
  var tickers=_tzUniverso();
  if(!tickers.length){ host.innerHTML='<div class="empty">Aún no hay empresas analizadas. Sube un <b>TICKER.json</b> a <code>dossiers/</code> o rellena Análisis.</div>'; return; }
  /* dispara carga perezosa de tesis para los que falten */
  if(typeof cargarTesis==='function') tickers.forEach(function(t){ if(_tesisCache && _tesisCache[t]===undefined) cargarTesis(t); });

  var Vs=tickers.map(function(t){ return tesisVeredicto(t); }).filter(Boolean);
  Vs.sort(function(a,b){ if(_TZ_RANK[a.v]!==_TZ_RANK[b.v])return _TZ_RANK[a.v]-_TZ_RANK[b.v]; var pa=(a.potBase==null?-9:a.potBase), pb=(b.potBase==null?-9:b.potBase); return pb-pa; });

  var nInv=Vs.filter(function(v){return v.v==='INVERTIR';}).length;
  var nEsp=Vs.filter(function(v){return v.v==='ESPERAR';}).length;
  var nFue=Vs.filter(function(v){return v.v==='FUERA';}).length;

  var sel=(window._tesisSel||'').toUpperCase();
  if(!sel || !Vs.some(function(v){return v.t===sel;})) sel=Vs[0].t;
  window._tesisSel=sel;

  var _kw='background:var(--panel,#fff);border:1px solid var(--line,#e2e8f0);border-radius:14px;padding:12px 14px';
  var _kl='font-size:10.5px;color:var(--muted,#64748b);font-weight:700;text-transform:uppercase;letter-spacing:.02em';
  var _kv='font-size:22px;font-weight:800;margin-top:2px'; var _kp='font-size:11px;color:var(--muted,#64748b);margin-top:2px';
  var kpis='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-top:6px">'+
    '<div style="'+_kw+';background:linear-gradient(135deg,#166534,#16a34a);border:none;color:#fff"><div style="'+_kl+';color:#bbf7d0">En zona de invertir</div><div style="'+_kv+'">'+nInv+'</div><div style="'+_kp+';color:#bbf7d0">calidad + precio + renta</div></div>'+
    '<div style="'+_kw+'"><div style="'+_kl+'">Esperar / vigilar</div><div style="'+_kv+';color:'+TZ_COL.mid+'">'+nEsp+'</div><div style="'+_kp+'">buenas, fuera de precio</div></div>'+
    '<div style="'+_kw+'"><div style="'+_kl+'">Fuera</div><div style="'+_kv+';color:'+TZ_COL.bad+'">'+nFue+'</div><div style="'+_kp+'">descartadas o stop</div></div>'+
    '<div style="'+_kw+'"><div style="'+_kl+'">Con tesis</div><div style="'+_kv+'">'+Vs.length+'</div><div style="'+_kp+'">empresas analizadas</div></div>'+
  '</div>';

  var opts=Vs.map(function(v){ return '<option value="'+_tzEsc(v.t)+'"'+(v.t===sel?' selected':'')+'>'+_tzEsc(v.t)+' · '+_tzEsc((v.nombre||'').slice(0,22))+' — '+TZ_VLBL[v.v]+'</option>'; }).join('');
  var toolbar='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0"><span class="muted" style="font-size:12px">Empresa:</span><select id="tzSelEmp" class="anaInp" style="min-width:280px">'+opts+'</select></div>';

  var grid='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:10px">'+Vs.map(function(v){ return _tzCard(v, v.t===sel); }).join('')+'</div>';

  var detalle=_tzDetalle(sel);

  host.innerHTML='<div class="sub" style="margin-bottom:6px">Ficha de decisión: ¿está la empresa en <b>zona de invertir</b>? Semáforo de 3 capas — <b>Calidad</b> (¿vale?) × <b>Precio</b> (¿ahora?) × <b>Renta</b> (¿paga bien?, contextual por arquetipo). La <b>Próxima compra</b> dice cuánto una vez está en verde.</div>'+
    kpis+toolbar+grid+'<div id="tzDetalle" style="margin-top:12px;scroll-margin-top:12px">'+detalle+'</div>';

  _tzBind();
}

/* En móvil, al seleccionar una empresa baja directo a la ficha grande. */
function _tzScrollDetalle(){
  if(typeof window==='undefined')return;
  if(window.innerWidth>860)return;                 // solo pantallas estrechas (móvil)
  var d=document.getElementById('tzDetalle'); if(!d)return;
  setTimeout(function(){ try{ d.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){ d.scrollIntoView(); } },60);
}

/* ¿Está activa la vista Tesis? (en la app: sección .active; en el mock: existe el host) */
function _tzViewActive(){ var v=(typeof document!=='undefined')&&document.getElementById('view-tesisinv'); if(v)return v.classList.contains('active'); return !!(typeof document!=='undefined'&&document.getElementById('tesisHost')); }

/* Botón flotante ↑ para volver al principio (visible al hacer scroll dentro de la vista). */
function _tzTopBtn(){
  if(typeof document==='undefined')return;
  var btn=document.getElementById('tzTop');
  if(!btn){
    btn=document.createElement('button'); btn.id='tzTop'; btn.type='button';
    btn.setAttribute('aria-label','Subir al principio'); btn.title='Subir al principio'; btn.innerHTML='↑';
    btn.style.cssText='position:fixed;right:16px;bottom:16px;z-index:70;width:46px;height:46px;border-radius:50%;background:var(--brand,#1d4ed8);color:#fff;border:none;box-shadow:0 3px 12px rgba(0,0,0,.28);font-size:22px;font-weight:700;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;line-height:1';
    btn.addEventListener('click',function(){ try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); } });
    (document.body||document.documentElement).appendChild(btn);
    var upd=function(){ var y=(window.scrollY||window.pageYOffset||0); btn.style.display=(_tzViewActive()&&y>400)?'flex':'none'; };
    window.addEventListener('scroll',upd,{passive:true});
    window.addEventListener('resize',upd);
    document.addEventListener('click',function(){ setTimeout(upd,0); });   // recalcula al cambiar de pestaña
    _tzTopBtn._upd=upd;
  }
  if(_tzTopBtn._upd)_tzTopBtn._upd();
}

/* --------- Eventos (delegados, una sola vez) --------- */
function _tzBind(){
  if(_tzBind._done)return; _tzBind._done=true;
  document.addEventListener('click',function(e){
    var pick=e.target.closest && e.target.closest('[data-tzpick]');
    if(pick){ window._tesisSel=(pick.getAttribute('data-tzpick')||'').toUpperCase(); renderTesisInv(); _tzScrollDetalle(); return; }
    var fic=e.target.closest && e.target.closest('[data-tzficha]');
    if(fic){ var t=(fic.getAttribute('data-tzficha')||'').toUpperCase(); if(typeof abrirFicha==='function')abrirFicha(t); return; }
  });
  document.addEventListener('change',function(e){
    if(e.target && e.target.id==='tzSelEmp'){ window._tesisSel=(e.target.value||'').toUpperCase(); renderTesisInv(); }
  });
}
