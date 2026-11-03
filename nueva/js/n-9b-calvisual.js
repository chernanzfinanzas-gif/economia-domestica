/* APP NUEVA · Dividendos → Calendario: aspecto nuevo (3-nov-2026, Carlos: «la sección mensual de calendario podría ser así»
   — captura de un calendario con etiqueta de empresa + etiqueta del evento y ficha emergente — «en dividendos/mes un botón
   Bruto/Neto» y «la tabla de dividendos/mes la podríamos mejorar visualmente también»).
   · Mensual: cada evento es [empresa] [Dividendo | Ex-dividendo | Resultados | Junta]; lo previsto o estimado va con borde
     punteado. Al pasar por encima de la empresa (o tocarla en el móvil) sale su ficha: cotización y variación del día, gráfica
     de un año, rango de 52 semanas, capitalización, PER, rentabilidad por dividendo, puntos del método (dividendo, calidad,
     valoración), precio objetivo y decisión si está analizada, y próximos resultados. Todo de datos que ya tiene la app
     (universo/informe.json, fichas/_resumen.json, precios/TK.json y el propio calendario). «Abrir» lleva a su ficha.
   · Dividendos €/mes: botón Bruto / Neto (neto = bruto × 0,81, como siempre; en bruto no hay fila de IRPF) y tabla con
     mapa de calor, logo de iniciales y el mes en curso marcado. Los cálculos son los de siempre. */
(function(){
  if(typeof _calMensualHTML!=='function'||window._nCalVis) return; window._nCalVis=true;
  /* 3-nov-2026 (Carlos: «la tabla de Evolución del dividendo se queda sin poder mostrar todo»): la app de siempre ajustaba
     la tabla a la altura de la ventana (_evoFit) y dentro de la app nueva se recortaba. Ahora crece con todas las filas que
     cumplen la selección y se baja con la página. */
  if(typeof _evoFit==='function') _evoFit=function(){ var h=document.getElementById('evoApp'); if(h){ h.style.display=''; h.style.height=''; } };
  var INF=null, RES=null, PR={}, cargando=null;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function n(v,d){ if(v==null||!isFinite(+v)) return '—'; return (+v).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'}); }
  function hue(t){ var h=0; for(var i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))%360; return h; }
  function av(t,sz){ t=String(t||''); return '<span class="cv-av" style="width:'+(sz||18)+'px;height:'+(sz||18)+'px;background:hsl('+hue(t)+',55%,42%);font-size:'+Math.round((sz||18)*0.42)+'px">'+esc(t.slice(0,2))+'</span>'; }
  function cargar(){ if(cargando) return cargando;
    var g=function(u){ return fetch(u,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); };
    cargando=Promise.all([g('universo/informe.json'),g('fichas/_resumen.json')]).then(function(a){
      INF={}; ((a[0]&&a[0].continuo)||[]).concat((a[0]&&a[0].growth)||[]).forEach(function(e){ if(e&&e.ticker) INF[e.ticker]=e; });
      RES={}; var E=a[1]&&a[1].empresas; (Array.isArray(E)?E:Object.keys(E||{}).map(function(k){ return Object.assign({ticker:k},E[k]); })).forEach(function(e){ if(e&&e.ticker) RES[e.ticker]=e; }); });
    return cargando; }
  function precios(t){ if(PR[t]) return Promise.resolve(PR[t]);
    return fetch('precios/'+encodeURIComponent(t)+'.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(j){ PR[t]=(j&&j.data)||[]; return PR[t]; }); }
  function css(){ if(document.getElementById('nCvCss')) return; var s=document.createElement('style'); s.id='nCvCss'; s.textContent=
    '.cv-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:800;flex:none;letter-spacing:-.02em}'+
    '.cv-wrap{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:14px;box-shadow:0 1px 3px rgba(15,23,42,.06)}'+
    '.cv-nav{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}.cv-nav .cv-ar{width:34px;height:34px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;cursor:pointer;font-size:15px;color:#334155}.cv-nav .cv-ar:hover{background:#F1F5F9}'+
    '.cv-tit{font-size:17px;color:#475569;min-width:150px}.cv-tit b{color:#0F172A;text-transform:capitalize}.cv-mch{display:flex;gap:4px;flex-wrap:wrap;margin-left:auto}'+
    '.cv-mch button{border:1px solid #E2E8F0;background:#fff;border-radius:999px;padding:3px 9px;font:inherit;font-size:11.5px;color:#475569;cursor:pointer}.cv-mch button.on{background:#1F4A9A;border-color:#1F4A9A;color:#fff}.cv-mch button.empty{opacity:.45}.cv-mch i{font-style:normal;font-size:10px;opacity:.75;margin-left:3px}'+
    '.cv-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid #E2E8F0;border-radius:12px;overflow:hidden}'+
    '.cv-dow{background:#F8FAFC;color:#64748B;font-size:12px;text-align:center;padding:8px 0;border-bottom:1px solid #E2E8F0}.cv-dow.we{background:#F1F5F9}'+
    '.cv-c{min-height:92px;padding:6px 6px 8px;border-right:1px solid #EEF2F6;border-bottom:1px solid #EEF2F6;background:#fff;cursor:pointer;display:flex;flex-direction:column;gap:4px;min-width:0}'+
    '.cv-c:nth-child(7n){border-right:0}.cv-c.we{background:#FAFBFC}.cv-c.out{background:#F8FAFC;cursor:default}.cv-c.out .cv-dn{color:#CBD5E1}.cv-c:hover:not(.out){background:#F8FBFF}.cv-c.sel{box-shadow:inset 0 0 0 2px #1F4A9A}'+
    '.cv-dn{font-size:13px;font-weight:700;color:#0F172A;line-height:24px}.cv-c.today .cv-dn{background:#1F4A9A;color:#fff;border-radius:50%;width:24px;height:24px;text-align:center;display:inline-block}'+
    '.cv-ev{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}'+
    '.cv-tk{display:inline-flex;align-items:center;gap:4px;border:1px solid #E2E8F0;border-radius:999px;padding:1px 7px 1px 2px;font-size:11.5px;font-weight:700;color:#0F172A;background:#fff;cursor:pointer;white-space:nowrap}.cv-tk:hover{border-color:#94A3B8}'+
    '.cv-b{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap}'+
    '.cv-b.pago{background:#15803D;color:#fff}.cv-b.exdiv{background:#1D6FA5;color:#fff}.cv-b.res{background:#EEF2F7;color:#334155}.cv-b.junta{background:#EDE9FE;color:#5B21B6}.cv-b.otro{background:#F1F5F9;color:#475569}'+
    '.cv-b.proy{background:#fff!important;border:1.5px dashed currentColor}.cv-b.pago.proy{color:#15803D}.cv-b.exdiv.proy{color:#1D6FA5}.cv-b.res.proy{color:#475569}'+
    '.cv-more{font-size:11px;color:#64748B;font-weight:700}'+
    '.cv-leg{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:11.5px;color:#64748B;margin:10px 2px 0}'+
    '#cvPop{position:absolute;z-index:9999;width:320px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);font-size:12.5px;color:#0F172A;overflow:hidden}'+
    '#cvPop .ph{display:flex;gap:10px;align-items:center;padding:12px 12px 8px}#cvPop .ph b{font-size:14.5px;display:block}#cvPop .ph span{color:#64748B;font-size:11.5px}'+
    '#cvPop .pp{padding:2px 12px 8px;border-top:1px solid #F1F5F9}#cvPop .pr{display:flex;align-items:baseline;gap:8px;margin:8px 0 2px}#cvPop .pr b{font-size:19px;font-family:ui-monospace,Consolas,monospace}#cvPop .up{color:#15803D;font-weight:700}#cvPop .dn{color:#B91C1C;font-weight:700}'+
    '#cvPop .r52{display:flex;align-items:center;gap:6px;font-size:10.5px;color:#64748B}#cvPop .r52 i{flex:1;height:3px;background:#E2E8F0;border-radius:2px;position:relative}#cvPop .r52 i b{position:absolute;top:-3px;width:9px;height:9px;border-radius:50%;background:#1F4A9A;margin-left:-4px}'+
    '#cvPop .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 12px;border-top:1px solid #F1F5F9}#cvPop .g3 span{display:block;font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:.03em}#cvPop .g3 b{font-family:ui-monospace,Consolas,monospace;font-size:12.5px}'+
    '#cvPop .pt{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 12px;border-top:1px solid #F1F5F9}#cvPop .pt span{display:block;font-size:10.5px;color:#64748B}#cvPop .pt b{font-size:12px}#cvPop .pt i{display:block;height:4px;border-radius:2px;background:#E2E8F0;margin-top:3px}#cvPop .pt i u{display:block;height:100%;border-radius:2px}'+
    '#cvPop .pf{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid #F1F5F9;font-size:12px;color:#475569}#cvPop .pf a{color:#1F4A9A;font-weight:700;cursor:pointer;text-decoration:none}'+
    '#cvPop .dc{font-size:10.5px;font-weight:800;border-radius:6px;padding:2px 6px;margin-left:auto}'+
    /* €/mes */
    '.cv-dt{border-collapse:separate!important;border-spacing:0;width:100%;font-size:12.5px}.cv-dt th,.cv-dt td{border:0!important;border-bottom:1px solid #EEF2F6!important;padding:7px 6px!important;font-size:12.5px!important;white-space:nowrap}'+
    '.cv-dt thead th,.cv-dt tr:first-child th{background:#F8FAFC;color:#64748B;font-size:10.5px!important;text-transform:uppercase;letter-spacing:.04em;position:sticky;top:0;z-index:1}'+
    '.cv-dt th.cv-mesact{color:#1F4A9A;box-shadow:inset 0 -2px 0 #1F4A9A}.cv-dt td.cv-mesact{box-shadow:inset 1px 0 0 #DBEAFE,inset -1px 0 0 #DBEAFE}'+
    '.cv-dt td.cv-h{color:#14532D!important;font-weight:700}.cv-dt tr.cv-tot td{background:#F1F5F9!important;font-weight:800;border-top:2px solid #CBD5E1!important}.cv-dt tr.cv-irpf td{background:#ECFDF5!important}.cv-dt tr.cv-net td{background:#E0E7FF!important;font-weight:800;color:#1E3A8A!important}'+
    '.cv-dt td:last-child{font-weight:800;background:#F8FAFC}.cv-dt tbody tr:hover td{filter:brightness(.97)}'+
    '.cv-seg{display:inline-flex;border:1px solid #CBD5E1;border-radius:999px;overflow:hidden;margin:0 0 10px}.cv-seg button{border:0;background:#fff;padding:5px 14px;font:inherit;font-size:12.5px;font-weight:700;color:#475569;cursor:pointer}.cv-seg button.on{background:#1F4A9A;color:#fff}'+
    '.cv-dhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cv-dhead .muted{font-size:12px}'+
    '@media (max-width:700px){.cv-c{min-height:64px;padding:4px 2px}.cv-b,.cv-tk .cv-av{display:none}.cv-tk{font-size:9.5px;padding:1px 4px;border-width:0;color:#fff;max-width:100%;overflow:hidden}.cv-tk.t-pago{background:#15803D}.cv-tk.t-exdiv{background:#1D6FA5}.cv-tk.t-res{background:#E2E8F0;color:#334155}.cv-tk.t-junta{background:#EDE9FE;color:#5B21B6}.cv-tk.proy{background:#fff!important;border:1.5px dashed #94A3B8;color:#334155}.cv-mch{margin-left:0}.cv-leg .cv-b{display:inline-flex}}';
    document.head.appendChild(s); }

  /* ---------------- MENSUAL ---------------- */
  var ETQ={pago:'Dividendo',exdiv:'Ex-dividendo',res:'Resultados',junta:'Junta'}, ORD={pago:0,exdiv:1,res:2,junta:3};
  var _orig=_calMensualHTML;
  _calMensualHTML=function(){
    try{
      css(); cargar();
      var y=_calYearSel, nowY=_calNowY();
      if(_calMes==null) _calMes=(y===nowY)?new Date().getMonth():0;
      if(_calMes<0)_calMes=0; if(_calMes>11)_calMes=11;
      var ev=calEventosAnio(y, window._calShowAna, window._calShowUni).filter(function(e){ return e.fecha&&(''+e.fecha).slice(0,4)==String(y); });
      var cnt=[0,0,0,0,0,0,0,0,0,0,0,0]; ev.forEach(function(e){ var m=(+(''+e.fecha).slice(5,7))-1; if(m>=0&&m<12) cnt[m]++; });
      var ch=''; for(var i=0;i<12;i++) ch+='<button class="'+(i===_calMes?'on':'')+(cnt[i]?'':' empty')+'" data-calmes="'+i+'">'+_CAL_MES[i]+(cnt[i]?'<i>'+cnt[i]+'</i>':'')+'</button>';
      var nav='<div class="cv-nav"><button class="cv-ar calMarw" data-calmd="-1" title="Mes anterior">‹</button><button class="cv-ar calMarw" data-calmd="1" title="Mes siguiente">›</button><span class="cv-tit"><b>'+_CAL_MESL[_calMes].toLowerCase()+'</b> de '+y+'</span><div class="cv-mch">'+ch+'</div></div>';
      var EVD={}; ev.forEach(function(e){ if((+(''+e.fecha).slice(5,7))-1===_calMes){ var k=(''+e.fecha).slice(0,10); (EVD[k]=EVD[k]||[]).push(e); } });
      var first=new Date(y,_calMes,1), fw=(first.getDay()+6)%7, dim=new Date(y,_calMes+1,0).getDate(), hoy=_calHoy();
      var prevDim=new Date(y,_calMes,0).getDate();
      var g='<div class="cv-grid">'+['lun','mar','mié','jue','vie','sáb','dom'].map(function(d,i){ return '<div class="cv-dow'+(i>=5?' we':'')+'">'+d+'</div>'; }).join('');
      var cells=[]; for(var a=fw-1;a>=0;a--) cells.push(-(prevDim-a)); for(var d=1;d<=dim;d++) cells.push(d); var nx=1; while(cells.length%7) cells.push(-(nx++));
      cells.forEach(function(d,ix){ var we=(ix%7)>=5;
        if(d<0){ g+='<div class="cv-c out'+(we?' we':'')+'"><span class="cv-dn">'+(-d)+'</span></div>'; return; }
        var iso=y+'-'+_calPad2(_calMes+1)+'-'+_calPad2(d);
        var es=(EVD[iso]||[]).slice().sort(function(a,b){ return (ORD[a.tipo]==null?9:ORD[a.tipo])-(ORD[b.tipo]==null?9:ORD[b.tipo]); });
        var h='<div class="cv-c'+(we?' we':'')+(iso===hoy?' today':'')+(_calSelDay===iso?' sel':'')+'" data-calday="'+iso+'"><span class="cv-dn">'+d+'</span>';
        es.slice(0,4).forEach(function(e){ var pr=(e.proyectado||e.estimado)?' proy':'', am=(e.tipo==='pago'&&e.sh&&e.imp)?' · '+_calEur(e.sh*e.imp*(window._cvBruto?1:0.81)):'';
          h+='<div class="cv-ev"><span class="cv-tk t-'+(ETQ[e.tipo]?e.tipo:'otro')+pr+'" data-cvtk="'+esc(e.t)+'">'+av(e.t,16)+esc(e.t)+'</span><span class="cv-b '+(ETQ[e.tipo]?e.tipo:'otro')+pr+'" title="'+esc((e.proyectado?'previsto · ':e.estimado?'estimado · ':'')+(ETQ[e.tipo]||e.tipo)+(am?am:''))+'">'+(e.tipo==='res'?'🗓 ':'')+esc(ETQ[e.tipo]||e.tipo)+'</span></div>'; });
        if(es.length>4) h+='<span class="cv-more">+'+(es.length-4)+' más</span>';
        g+=h+'</div>'; });
      g+='</div>';
      var leg='<div class="cv-leg"><span class="cv-b pago">Dividendo</span>pago · <span class="cv-b exdiv">Ex-dividendo</span>último día con derecho · <span class="cv-b res">🗓 Resultados</span> · <span class="cv-b junta">Junta</span> · <span class="cv-b pago proy">previsto</span>borde punteado = previsto o estimado · pasa por encima de una empresa para ver su ficha</div>';
      /* detalle (lo de siempre) */
      var det;
      if(_calSelDay&&(''+_calSelDay).slice(0,7)===y+'-'+_calPad2(_calMes+1)){ var dd=_calSelDay.split('-'), des=(EVD[_calSelDay]||[]).slice().sort(function(a,b){ return (ORD[a.tipo]==null?9:ORD[a.tipo])-(ORD[b.tipo]==null?9:ORD[b.tipo]); });
        det='<div class="cal-detail"><h4>'+(+dd[2])+' de '+_CAL_MESL[_calMes]+' '+y+' · '+(des.length||'sin')+' evento'+(des.length===1?'':'s')+' <button class="btn sm calDayClr" data-caldayclr="1">ver todo el mes</button></h4>'+(des.length?des.map(_calDetRow).join(''):'<div class="muted" style="font-size:12.5px">Sin eventos este día.</div>')+'</div>'; }
      else { var me=ev.filter(function(e){ return (+(''+e.fecha).slice(5,7))-1===_calMes; }).sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
        det='<div class="cal-detail"><h4>Eventos de '+_CAL_MESL[_calMes]+' '+y+' ('+me.length+')</h4>'+(me.length?me.map(_calDetRow).join(''):'<div class="muted" style="font-size:12.5px">Sin eventos este mes.</div>')+'</div>'; }
      return '<div class="cv-wrap cal-monthcard">'+nav+g+leg+det+'</div>';
    }catch(err){ console.error('[cal mensual nuevo]',err); return _orig.apply(this,arguments); }
  };

  /* ---------------- FICHA EMERGENTE ---------------- */
  var popT=null, popFor=null;
  function cerrar(){ var p=document.getElementById('cvPop'); if(p) p.remove(); popFor=null; }
  function proxRes(t){ try{ var hoy=_calHoy(), y=+hoy.slice(0,4), L=[]; [y,y+1].forEach(function(yy){ (calEventosDe(t,yy)||[]).forEach(function(e){ if(e.tipo==='res'&&e.fecha>=hoy) L.push(e.fecha); }); }); L.sort(); return L[0]||null; }catch(e){ return null; } }
  function spark(D){ if(!D||D.length<2) return ''; var mn=Math.min.apply(null,D), mx=Math.max.apply(null,D), w=296, h=46, up=D[D.length-1]>=D[0];
    var pts=D.map(function(v,i){ return (i/(D.length-1)*w).toFixed(1)+','+(h-2-(mx>mn?(v-mn)/(mx-mn):.5)*(h-4)).toFixed(1); }).join(' '), c=up?'#16A34A':'#DC2626';
    return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="display:block;height:46px"><defs><linearGradient id="cvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c+'" stop-opacity=".22"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></linearGradient></defs><polygon points="0,'+h+' '+pts+' '+w+','+h+'" fill="url(#cvg)"/><polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="1.6"/></svg>'; }
  function barra(lbl,v){ if(v==null) return '<div><span>'+lbl+'</span><b>—</b><i></i></div>'; var c=v>=70?'#16A34A':v>=45?'#D97706':'#DC2626'; return '<div><span>'+lbl+'</span><b>'+Math.round(v)+'</b><i><u style="width:'+Math.max(2,Math.min(100,v))+'%;background:'+c+'"></u></i></div>'; }
  var DCC={COMPRAR:['#15803D','#DCFCE7'],ESPERAR:['#B45309','#FEF3C7'],MANTENER:['#1F4A9A','#EAF1FD'],VENDER:['#B91C1C','#FEE2E2'],REDUCIR:['#B91C1C','#FEE2E2']};
  function abrirPop(el,t){
    cargar().then(function(){ return precios(t); }).then(function(S){ if(popFor!==el) return;
      var I=(INF&&INF[t])||{}, Rr=(RES&&RES[t])||null, nom=I.empresa||(typeof _calNombre==='function'?_calNombre(t):'')||t;
      var cot=(typeof _mcCot==='function'?+_mcCot(t):0)||(S.length?S[S.length-1][1]:I.precio), ant=S.length>1?S[S.length-2][1]:null, vd=(cot&&ant)?(cot/ant-1)*100:null;
      var hace=new Date(); hace.setFullYear(hace.getFullYear()-1); var h1=hace.toISOString().slice(0,10), U=S.filter(function(x){ return x[0]>=h1; }).map(function(x){ return x[1]; });
      var mn=U.length?Math.min.apply(null,U):null, mx=U.length?Math.max.apply(null,U):null, pos=(mn!=null&&mx>mn&&cot)?Math.max(0,Math.min(1,(cot-mn)/(mx-mn))):null;
      var v1=U.length&&cot?(cot/U[0]-1)*100:I.var_1a!=null?I.var_1a*100:null;
      var po=Rr&&Rr.po_base, dc=Rr&&Rr.decision, dcc=DCC[dc]||['#475569','#F1F5F9'], pr=proxRes(t), P=I.puntos||{};
      var h='<div class="ph">'+av(t,38)+'<div style="min-width:0"><b>'+esc(nom)+'</b><span>'+esc(t)+(I.descripcion?' · '+esc(I.descripcion):'')+'</span></div>'+(dc?'<span class="dc" style="color:'+dcc[0]+';background:'+dcc[1]+'">'+esc(dc)+'</span>':'')+'</div>'+
        '<div class="pp"><div class="pr"><b>'+(cot?n(cot,2)+' €':'—')+'</b>'+(vd!=null?'<span class="'+(vd>=0?'up':'dn')+'">'+(vd>=0?'↑ +':'↓ ')+n(vd,2)+' %</span>':'')+'<span style="margin-left:auto;font-size:10.5px;color:#64748B">1 año '+(v1!=null?(v1>=0?'+':'')+n(v1,1)+' %':'—')+'</span></div>'+spark(U)+
        (pos!=null?'<div class="r52"><span>'+n(mn,2)+'</span><i><b style="left:'+(pos*100).toFixed(1)+'%"></b></i><span>'+n(mx,2)+'</span></div>':'')+'</div>'+
        '<div class="g3"><div><span>Capitalización</span><b>'+(I.cap!=null?(I.cap>=1000?n(I.cap/1000,1)+' mil M':n(I.cap,0)+' M'):'—')+'</b></div><div><span>PER</span><b>'+(I.per!=null&&I.per>0?n(I.per,1):'—')+'</b></div><div><span>Rentab. div.</span><b>'+(I.rpd!=null?n(I.rpd*100,1)+' %':'—')+'</b></div></div>'+
        (I.puntos?'<div class="pt">'+barra('Dividendo',P.dividendo)+barra('Calidad',P.calidad)+barra('Valoración',P.valoracion)+'</div>':'')+
        '<div class="pf"><span>'+(po?'Precio objetivo <b>'+n(po,2)+' €</b>'+(cot?' <span class="'+(po>=cot?'up':'dn')+'">'+(po>=cot?'+':'')+n((po/cot-1)*100,1)+' %</span>':''):'Sin análisis del método')+'</span><a data-cvopen="'+esc(t)+'">Abrir</a></div>'+
        '<div class="pf" style="border-top:1px solid #F1F5F9">🗓 '+(pr?'Resultados '+(function(f){ var d=f.split('-'); return (+d[2])+' '+_CAL_MES[(+d[1])-1].toLowerCase(); })(pr):'Próximos resultados sin fecha')+'<span style="margin-left:auto;font-size:10.5px;color:#94A3B8">puntos del método · 0-100</span></div>';
      var p=document.getElementById('cvPop'); if(!p){ p=document.createElement('div'); p.id='cvPop'; document.body.appendChild(p);
        p.addEventListener('mouseenter',function(){ clearTimeout(popT); }); p.addEventListener('mouseleave',function(){ popT=setTimeout(cerrar,250); }); }
      p.innerHTML=h; var r=el.getBoundingClientRect(), W=p.offsetWidth, H=p.offsetHeight;
      var x=r.left+window.scrollX, yy=r.bottom+window.scrollY+6; if(x+W>window.scrollX+document.documentElement.clientWidth-8) x=window.scrollX+document.documentElement.clientWidth-W-8;
      if(r.bottom+H+12>window.innerHeight&&r.top>H+12) yy=r.top+window.scrollY-H-6; p.style.left=Math.max(8,x)+'px'; p.style.top=yy+'px';
    }); }
  document.addEventListener('mouseover',function(e){ var el=e.target.closest&&e.target.closest('[data-cvtk]'); if(!el||popFor===el) return; if(window.matchMedia&&window.matchMedia('(hover:none)').matches) return; clearTimeout(popT); popFor=el; popT=setTimeout(function(){ abrirPop(el,el.getAttribute('data-cvtk')); },180); });
  document.addEventListener('mouseout',function(e){ var el=e.target.closest&&e.target.closest('[data-cvtk]'); if(!el) return; clearTimeout(popT); popT=setTimeout(function(){ var p=document.getElementById('cvPop'); if(!(p&&p.matches(':hover'))) cerrar(); },250); });
  document.addEventListener('click',function(e){ if(!e.target.closest) return;
    var o=e.target.closest('[data-cvopen]'); if(o){ e.preventDefault(); var t=o.getAttribute('data-cvopen'); cerrar(); if(RES&&RES[t]&&window.nfAbrir) window.nfAbrir(t); else if(typeof abrirFicha==='function') abrirFicha(t); return; }
    var k=e.target.closest('[data-cvtk]'); if(k){ e.stopPropagation(); e.preventDefault(); if(popFor===k&&document.getElementById('cvPop')){ cerrar(); return; } popFor=k; abrirPop(k,k.getAttribute('data-cvtk')); return; }
    if(!e.target.closest('#cvPop')) cerrar(); },true);
  window.addEventListener('scroll',function(){ if(window.matchMedia&&window.matchMedia('(hover:none)').matches) cerrar(); },{passive:true});

  /* ---------------- DIVIDENDOS €/MES: Bruto / Neto + aspecto ---------------- */
  try{ window._cvBruto=localStorage.getItem('kh-cal-bruto')==='1'; }catch(e){ window._cvBruto=false; }
  if(typeof calDivMesEmpresas==='function'){ var od=calDivMesEmpresas;
    calDivMesEmpresas=function(){ var d=od.apply(this,arguments); if(!window._cvBruto||!window._cvEnTabla||!d) return d;   /* solo la tabla: las cifras de arriba siguen en neto */
      var k=1/0.81, c=JSON.parse(JSON.stringify(d));
      (c.rows||[]).forEach(function(r){ r.neto=r.neto.map(function(v){ return v*k; }); r.total=r.total*k; });
      c.totMes=(c.totMes||[]).map(function(v){ return v*k; }); c.netoTotal=(c.netoTotal||0)*k; c.irpf=0; c.total=c.netoTotal; return c; }; }
  if(typeof _calDivsHTML==='function'){ var oh=_calDivsHTML;
    _calDivsHTML=function(){ css(); var h; window._cvEnTabla=true; try{ h=oh.apply(this,arguments); } finally{ window._cvEnTabla=false; }
      var seg='<div class="cv-dhead"><div class="cv-seg"><button data-cvbn="0" class="'+(window._cvBruto?'':'on')+'">Neto</button><button data-cvbn="1" class="'+(window._cvBruto?'on':'')+'">Bruto</button></div><span class="muted">'+(window._cvBruto?'Bruto: lo que paga la empresa, antes de la retención del 19 %.':'Neto: lo que te llega a la cuenta (bruto × 0,81), más la devolución del IRPF en abril.')+'</span></div>';
      h=h.replace('<div class="card cal-divcard">','<div class="card cal-divcard cv-wrap">'+seg);
      if(window._cvBruto) h=h.replace('Cada celda = neto de esa empresa ese mes (× 0,81). En abril el IRPF entra como <b>ingreso</b> (devolución de retenciones del año anterior).','Cada celda = bruto de esa empresa ese mes (antes de la retención).');
      return h; }; }
  function decorar(){
    var tb=document.querySelector('#view-calendario table.calDivt'); if(!tb||tb._cv) return; tb._cv=1; tb.classList.add('cv-dt');
    var rows=[].slice.call(tb.querySelectorAll('tr')), mx=0, hoy=new Date(), mAct=(_calYearSel===hoy.getFullYear())?hoy.getMonth():-1;
    var val=function(td){ var s=(td.textContent||'').replace(/[^\d,\-]/g,'').replace(',','.'); var v=parseFloat(s); return isNaN(v)?0:v; };
    rows.forEach(function(tr){ var f=(tr.cells[0]&&tr.cells[0].textContent)||'';
      if(/^Total cobrado/.test(f)){ tr.classList.add('cv-tot'); if(window._cvBruto) tr.cells[0].textContent='Total bruto / mes'; return; }
      if(/IRPF/.test(f)){ if(window._cvBruto) tr.remove(); else tr.classList.add('cv-irpf'); return; }
      if(/^Neto en caja/.test(f)){ if(window._cvBruto) tr.remove(); else tr.classList.add('cv-net'); return; }
      if(tr.querySelector('th')){ [].forEach.call(tr.cells,function(c,i){ if(i-1===mAct) c.classList.add('cv-mesact'); }); return; }
      for(var i=1;i<tr.cells.length-1;i++){ var v=val(tr.cells[i]); if(v>mx&&tr.cells.length===14) mx=v; } });
    if(window._cvBruto) [].forEach.call(document.querySelectorAll('#view-calendario .cal-divcard .muted'),function(m){ if(/Cada celda = neto/.test(m.innerHTML)) m.innerHTML=m.innerHTML.replace(/Cada celda = neto[\s\S]*?año anterior\)\./,'Cada celda = bruto de esa empresa ese mes, antes de la retención del 19 %.'); });
    rows.forEach(function(tr){ if(!tr.parentNode||tr.querySelector('th')||tr.cells.length!==14||tr.className) return;
      var c0=tr.cells[0], tk=c0.querySelector('[data-ficha]'); if(tk&&!c0.querySelector('.cv-av')){ var t=tk.textContent.trim(); tk.insertAdjacentHTML('beforebegin',av(t,20)+' '); tk.setAttribute('data-cvtk',t); }
      for(var i=1;i<13;i++){ var td=tr.cells[i], v=val(td); if(i-1===mAct) td.classList.add('cv-mesact'); if(v>=1&&mx>0){ td.classList.add('cv-h'); td.style.background='rgba(22,163,74,'+(0.08+0.42*Math.min(1,v/mx)).toFixed(3)+')'; } } });
  }
  if(typeof _calPaint==='function'&&!_calPaint._cv){ var op=_calPaint; _calPaint=function(){ var r=op.apply(this,arguments); try{ decorar(); }catch(e){ console.error('[cal €/mes]',e); } return r; }; _calPaint._cv=1; for(var k in op) if(op.hasOwnProperty(k)) _calPaint[k]=op[k]; }
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-cvbn]'); if(!b) return; window._cvBruto=b.getAttribute('data-cvbn')==='1'; try{ localStorage.setItem('kh-cal-bruto',window._cvBruto?'1':'0'); }catch(err){} try{ _calPaint(); }catch(err){} });
})();
