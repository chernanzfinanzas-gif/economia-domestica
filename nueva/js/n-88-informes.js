/* APP NUEVA · Sistema › Informes: los PDF pasan de 18 a 8 (1-nov-2026, Carlos aprobó los bocetos: «de momento dejamos esos dos»).
   NUEVOS (aspecto de la app nueva):
     🏠 Resumen del hogar      = Gastos + Ahorro + Presupuesto + Interanual + Comercios + Por titular
     💼 Resumen de la inversión = Patrimonio + Cartera + Dividendos + Rentabilidad
   SE QUEDAN: Recurrentes, Reembolsables, Combustible, Fiscal, Proyección y el Informe por empresa.
   FUERA: Plan de inversión (vacío), Seguimiento (monitor) y Oportunidades.
   Cierre previsto del presupuesto: partidas mensuales = gastado ÷ meses cerrados × meses del periodo; partidas ANUALES =
   lo presupuestado (o lo pagado, si ya se pasó). Solo se calcula si el periodo está en curso. */
(function(){
  if(typeof INF_REPORTS==='undefined'||!INF_REPORTS.splice) return;
  var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var PAL=['#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#65A30D','#EA580C','#0D9488','#9333EA','#CA8A04'];
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function miles(n){ return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function eur(x,s){ if(x==null||!isFinite(x)) return '—'; var v=Math.round(x); return (v<0?'−':(s&&v>0?'+':''))+miles(v)+' €'; }
  function pc(x,s,d){ if(x==null||!isFinite(x)) return '—'; d=d==null?1:d; var v=x*100; return (v<0?'−':(s&&v>0?'+':''))+Math.abs(v).toFixed(d).replace('.',',')+' %'; }
  function fx(x,d){ return (+x).toFixed(d==null?1:d).replace('.',','); }
  function hoyS(){ return new Date().toISOString().slice(0,10); }
  function dmy(f){ return f?f.slice(8,10)+'/'+f.slice(5,7)+'/'+f.slice(0,4):'—'; }
  function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function kpi(c,bg,ic,t,v,s,vc){ return '<div class="k" style="border-left-color:'+c+'"><div class="kh"><span class="ki" style="background:'+bg+'">'+ic+'</span>'+t+'</div><div class="kv"'+(vc?' style="color:'+vc+'"':'')+'>'+v+'</div><div class="ks">'+s+'</div></div>'; }
  function cab(t,sub,p,n){ return '<div class="cab"><div class="logo">KHB</div><div class="ct"><div class="cn">Economía Doméstica</div><h1>'+t+'</h1><div class="cs">'+sub+'</div></div><div class="cp">Emitido el '+dmy(hoyS())+'<br>Página '+p+' de '+n+'</div></div>'; }
  function pie(t){ return '<div class="pie"><span>'+t+'</span><span>Informe generado por la app · cifras de tus registros</span></div>'; }
  function pag(h){ return '<section class="pag">'+h+'</section>'; }
  function doc(h){ return '<div class="kr">'+h+'</div>'; }
  function barra(w,col,cls){ return '<div class="bar'+(cls?' '+cls:'')+'"><i style="width:'+Math.max(0,Math.min(100,w)).toFixed(1)+'%;background:'+col+'"></i></div>'; }

  /* ===================== RESUMEN DEL HOGAR ===================== */
  function buildResHogar(ctx){
    var hoy=hoyS(), fil=function(m){ if(ctx.selTits&&ctx.selTits.length&&ctx.selTits.indexOf(m.titular||'')<0) return false; if(ctx.selCats&&ctx.selCats.length&&ctx.selCats.indexOf(m.categoriaId)<0) return false; return true; };
    var mv=ctx.base.filter(fil);
    var d1e=ctx.d1>new Date()?new Date():ctx.d1, enCurso=ctx.d1>new Date();
    var p0=ymd(new Date(ctx.d0.getFullYear()-1,ctx.d0.getMonth(),ctx.d0.getDate())), p1=ymd(new Date(d1e.getFullYear()-1,d1e.getMonth(),d1e.getDate()));
    var mvP=(DB.movimientos||[]).filter(function(m){ return m.fecha&&m.fecha>=p0&&m.fecha<=p1&&fil(m); });
    var yP=ctx.d0.getFullYear()-1;
    var M=ctx.months.map(function(mm){ var k=mm.y+'-'+String(mm.m+1).padStart(2,'0'), I=0, G=0; mv.forEach(function(m){ if(m.fecha.slice(0,7)===k){ if(m.tipo==='ingreso') I+=N(m.importe); else if(m.tipo==='gasto') G+=N(m.importe); } }); return {k:k,y:mm.y,m:mm.m,I:I,G:G,cerrado:ymd(new Date(mm.y,mm.m+1,0))<hoy}; });
    var con=M.filter(function(x){ return x.I>0.005||x.G>0.005; });
    var I=0,G=0; M.forEach(function(x){ I+=x.I; G+=x.G; }); var A=I-G, tasa=I?A/I:null;
    var Ip=0,Gp=0; mvP.forEach(function(m){ if(m.tipo==='ingreso') Ip+=N(m.importe); else if(m.tipo==='gasto') Gp+=N(m.importe); });
    var nCer=M.filter(function(x){ return x.cerrado; }).length||1, nPer=M.length;
    /* categorías de gasto */
    var C={}; function cat(id){ if(!C[id]){ var c=(typeof catById==='function'?catById(id):null)||{}; C[id]={id:id,nombre:c.nombre||'Sin categoría',grupo:c.grupo||'Otros',real:0,prev:0,pres:0,anual:false}; } return C[id]; }
    mv.forEach(function(m){ if(m.tipo==='gasto') cat(m.categoriaId||'_').real+=N(m.importe); });
    mvP.forEach(function(m){ if(m.tipo==='gasto') cat(m.categoriaId||'_').prev+=N(m.importe); });
    (DB.categorias||[]).forEach(function(c){ if(c.tipo!=='gasto') return; if(ctx.selCats&&ctx.selCats.length&&ctx.selCats.indexOf(c.id)<0) return; var pr=0, an=false; ctx.months.forEach(function(mm){ var p=presFor(c.id,mm.y); if(p){ pr+=mensual(p); if(p.frecuencia==='anual') an=true; } }); if(pr>0){ var x=cat(c.id); x.pres=pr; x.anual=an; } });
    var cats=Object.keys(C).map(function(k){ return C[k]; });
    function cierre(c){ if(!enCurso) return c.real; return c.anual?Math.max(c.real,c.pres):c.real/nCer*nPer; }
    var presT=0, cierreT=0; cats.forEach(function(c){ presT+=c.pres; cierreT+=cierre(c); });
    var GR={}; cats.forEach(function(c){ var g=GR[c.grupo]=GR[c.grupo]||{g:c.grupo,real:0,prev:0,pres:0,cats:[]}; g.real+=c.real; g.prev+=c.prev; g.pres+=c.pres; g.cats.push(c); });
    var grupos=Object.keys(GR).map(function(k){ return GR[k]; }).sort(function(a,b){ return b.real-a.real; });
    var per=E(ctx.label)+(enCurso?' · hasta el '+dmy(hoy):'');
    var cmp=enCurso?(' frente a '+yP+' en las mismas fechas'):(' frente al mismo periodo de '+yP);
    /* --- página 1 --- */
    var best=con.slice().sort(function(a,b){ return (b.I-b.G)-(a.I-a.G); });
    var h=cab('Resumen del hogar',per,1,4)+'<div class="kg">'+
      kpi('#16A34A','#DCFCE7','💶','Ingresos',eur(I),Ip?pc(I/Ip-1,true)+cmp:'sin datos de '+yP)+
      kpi('#DC2626','#FEE2E2','🧾','Gastos',eur(G),Gp?pc(G/Gp-1,true)+cmp:'sin datos de '+yP)+
      kpi('#1F4A9A','#EAF1FD','🐷','Ahorro',eur(A),con.length?miles(A/con.length)+' € de media al mes':'—')+
      kpi('#7C3AED','#EDE9FE','📈','Tasa de ahorro',pc(tasa,false,0),best.length>1?'mejor mes '+MES[best[0].m]+' · peor '+MES[best[best.length-1].m]:'')+'</div>';
    var top=grupos[0];
    h+='<div class="pp"><b>En pocas palabras.</b> En este periodo habéis ingresado '+eur(I)+' y gastado '+eur(G)+': os quedan '+eur(A)+(tasa!=null?', el '+pc(tasa,false,0)+' de lo que entra':'')+'.'+
      (Gp?' El gasto va un '+pc(Math.abs(G/Gp-1),false,0)+' '+(G<Gp?'por debajo':'por encima')+' de '+yP+' en las mismas fechas.':'')+
      (top?' Donde más se va el dinero es <b>'+E(top.g)+'</b> ('+eur(top.real)+').':'')+
      (enCurso&&presT?' Si sigue así, el periodo cerraría con unos '+eur(cierreT)+' de gasto frente a '+eur(presT)+' presupuestados.':'')+'</div>';
    /* gráfica mes a mes */
    var W=900,H=260,L=52,R=12,T=18,B=34, mx=1; M.forEach(function(x){ mx=Math.max(mx,x.I,x.G); }); var st=mx>20000?5000:(mx>8000?2000:1000); mx=(Math.floor(mx/st)+1)*st;
    var sy=function(v){ return T+(mx-v)/mx*(H-T-B); }, bw=(W-L-R)/Math.max(1,M.length), s='<svg viewBox="0 0 '+W+' '+H+'" class="ch">';
    for(var k=0;k<=mx;k+=st){ var yy=sy(k); s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="#E2E8F0"/><text x="'+(L-6)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end" class="ax">'+miles(k)+'</text>'; }
    if(presT&&nPer){ var pm=presT/nPer, yp=sy(pm); s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yp.toFixed(1)+'" y2="'+yp.toFixed(1)+'" stroke="#7C3AED" stroke-dasharray="5 4" stroke-width="1.5"/><text x="'+(W-R)+'" y="'+(yp-5).toFixed(1)+'" text-anchor="end" class="ax" fill="#7C3AED">presupuesto de gasto/mes '+eur(pm)+'</text>'; }
    M.forEach(function(x,i){ var x0=L+i*bw; if(x.I>0.005||x.G>0.005){ [[x.I,'#16A34A'],[x.G,'#DC2626']].forEach(function(v,j){ var xx=x0+bw*0.14+j*bw*0.36; s+='<rect x="'+xx.toFixed(1)+'" y="'+sy(v[0]).toFixed(1)+'" width="'+(bw*0.34).toFixed(1)+'" height="'+(sy(0)-sy(v[0])).toFixed(1)+'" rx="2" fill="'+v[1]+'" opacity=".85"/>'; });
        var a=x.I-x.G; s+='<text x="'+(x0+bw/2).toFixed(1)+'" y="'+(sy(Math.max(x.I,x.G))-6).toFixed(1)+'" text-anchor="middle" class="lb" fill="'+(a>=0?'#15803D':'#B91C1C')+'">'+(a>=0?'+':'−')+miles(a)+'</text>'; }
      s+='<text x="'+(x0+bw/2).toFixed(1)+'" y="'+(H-12)+'" text-anchor="middle" class="ax">'+MES[x.m]+(M.length>12?'’'+String(x.y).slice(2):'')+'</text>'; });
    s+='</svg>';
    h+='<h2>Mes a mes</h2><div class="leg"><span><i style="background:#16A34A"></i>Ingresos</span><span><i style="background:#DC2626"></i>Gastos</span>'+(presT?'<span><i style="background:#7C3AED;height:2px"></i>Presupuesto</span>':'')+'<span class="mu">· la cifra encima de cada mes es lo ahorrado</span></div>'+s;
    var rows=con.map(function(x){ var a=x.I-x.G; return '<tr><td class="l">'+MES[x.m].charAt(0).toUpperCase()+MES[x.m].slice(1)+' '+x.y+'</td><td>'+eur(x.I)+'</td><td>'+eur(x.G)+'</td><td class="'+(a>=0?'pos':'neg')+'">'+eur(a,true)+'</td><td>'+(x.I?pc(a/x.I,false,0):'—')+'</td></tr>'; }).join('');
    h+='<h2>Detalle mensual</h2><table class="t"><thead><tr><th class="l">Mes</th><th>Ingresos</th><th>Gastos</th><th>Ahorro</th><th>Tasa</th></tr></thead><tbody>'+rows+'<tr class="tot"><td class="l">Total</td><td>'+eur(I)+'</td><td>'+eur(G)+'</td><td class="pos">'+eur(A,true)+'</td><td>'+pc(tasa,false,0)+'</td></tr></tbody></table>';
    var out=pag(h+pie('Resumen del hogar'));
    /* --- página 2: en qué se va el dinero --- */
    var mxg=grupos.length?grupos[0].real:1;
    h=cab('Resumen del hogar','En qué se va el dinero · '+per,2,4);
    h+='<h2>Por grupo</h2><table class="t"><thead><tr><th class="l">Grupo</th><th></th><th>Periodo</th><th>% del gasto</th><th>'+yP+' (mismas fechas)</th><th>Cambio</th></tr></thead><tbody>'+grupos.filter(function(g){ return g.real>0.005||g.prev>0.005; }).map(function(g,i){ var d=g.prev?g.real/g.prev-1:null;
      return '<tr><td class="l"><i class="dot" style="background:'+PAL[i%12]+'"></i>'+E(g.g)+'</td><td class="barc">'+barra(g.real/mxg*100,PAL[i%12])+'</td><td class="b">'+eur(g.real)+'</td><td>'+(G?pc(g.real/G,false,0):'—')+'</td><td class="mu">'+eur(g.prev)+'</td><td class="'+((d||0)>0?'neg':'pos')+'">'+(d!=null?pc(d,true,0):'nuevo')+'</td></tr>'; }).join('')+
      '<tr class="tot"><td class="l">Total</td><td></td><td>'+eur(G)+'</td><td>100 %</td><td>'+eur(Gp)+'</td><td class="'+(G>Gp?'neg':'pos')+'">'+(Gp?pc(G/Gp-1,true,0):'—')+'</td></tr></tbody></table>';
    var cs=cats.filter(function(c){ return c.real>0.005; }).sort(function(a,b){ return b.real-a.real; }).slice(0,10), mc=cs.length?cs[0].real:1;
    var CO={}; mv.forEach(function(m){ if(m.tipo!=='gasto') return; var k=String(m.comercio||'').trim()||'(sin comercio)'; CO[k]=CO[k]||{v:0,n:0}; CO[k].v+=N(m.importe); CO[k].n++; });
    var co=Object.keys(CO).map(function(k){ return [k,CO[k]]; }).sort(function(a,b){ return b[1].v-a[1].v; }).slice(0,10), mo=co.length?co[0][1].v:1;
    h+='<div class="dos"><div><h2>Las 10 categorías que más gastan</h2><table class="t sm">'+cs.map(function(c){ return '<tr><td class="l">'+E(c.nombre)+' <span class="mu">'+E(c.grupo)+'</span></td><td class="barc">'+barra(c.real/mc*100,'#2563EB')+'</td><td class="b">'+eur(c.real)+'</td></tr>'; }).join('')+'</table></div>'+
      '<div><h2>Los 10 comercios donde más se gasta</h2><table class="t sm">'+co.map(function(x){ return '<tr><td class="l">'+E(x[0])+' <span class="mu">'+x[1].n+' pagos</span></td><td class="barc">'+barra(x[1].v/mo*100,'#D97706')+'</td><td class="b">'+eur(x[1].v)+'</td></tr>'; }).join('')+'</table></div></div>';
    var IN={}; mv.forEach(function(m){ if(m.tipo!=='ingreso') return; var c=(typeof catById==='function'?catById(m.categoriaId):null)||{}; var k=c.nombre||'Otros'; IN[k]=(IN[k]||0)+N(m.importe); });
    var inH='<h2>De dónde entra</h2><table class="t sm">'+Object.keys(IN).sort(function(a,b){ return IN[b]-IN[a]; }).filter(function(k){ return IN[k]>=1; }).map(function(k){ return '<tr><td class="l">'+E(k)+'</td><td class="b">'+eur(IN[k])+'</td><td>'+(I?pc(IN[k]/I,false,0):'—')+'</td></tr>'; }).join('')+'</table>';
    var TI={}; mv.forEach(function(m){ if(m.tipo!=='gasto') return; var k=m.titular||'Sin titular'; TI[k]=(TI[k]||0)+N(m.importe); });
    var tk=Object.keys(TI), tiH=tk.length>1?'<h2>Quién paga</h2><table class="t sm">'+tk.sort(function(a,b){ return TI[b]-TI[a]; }).map(function(k){ return '<tr><td class="l">'+E(k)+'</td><td class="b">'+eur(TI[k])+'</td><td>'+(G?pc(TI[k]/G,false,0):'—')+'</td></tr>'; }).join('')+'</table>':'';
    h+='<div class="dos"><div>'+inH+'</div><div>'+tiH+'</div></div>';
    out+=pag(h+pie('Resumen del hogar'));
    /* --- páginas 3 y 4: presupuesto --- */
    var nOver=cats.filter(function(c){ return c.pres&&cierre(c)>c.pres*1.1; }).length;
    h=cab('Resumen del hogar','Presupuesto: cómo va'+(enCurso?' y cómo acabará':'')+' · '+per,3,4)+'<div class="kg">'+
      kpi('#7C3AED','#EDE9FE','🎯','Presupuesto del periodo',eur(presT),'gasto previsto en el presupuesto')+
      kpi('#DC2626','#FEE2E2','🧾','Gastado',eur(G),presT?pc(G/presT,false,0)+' del presupuesto'+(enCurso?' en '+nCer+' de '+nPer+' meses':''):'sin presupuesto')+
      kpi('#D97706','#FEF3C7','🔮',enCurso?'Cierre previsto':'Desviación',enCurso?eur(cierreT):eur(presT-G,true),enCurso?(eur(presT-cierreT,true)+' frente al presupuesto'):'presupuesto − gastado',enCurso?(cierreT<=presT?'#15803D':'#B91C1C'):(presT>=G?'#15803D':'#B91C1C'))+
      kpi('#DC2626','#FEE2E2','⚠️',enCurso?'Categorías que se pasarán':'Categorías que se pasaron',String(nOver),'más de un 10 % por encima de lo previsto')+'</div>';
    var gs=Object.keys(GR).map(function(k){ return GR[k]; }).sort(function(a,b){ return b.pres-a.pres; });
    function tabla(lista){ var r='';
      lista.forEach(function(g){ r+='<tr class="sub"><td class="l" colspan="6">'+E(g.g)+'</td></tr>';
        g.cats.slice().sort(function(a,b){ return Math.max(b.pres,b.real)-Math.max(a.pres,a.real); }).forEach(function(c){ if(!c.pres&&!c.real) return; var p=cierre(c), rr=c.pres?p/c.pres:null, sem=rr!=null&&rr<=1?'ok':(rr!=null&&rr<=1.1?'am':'ma'), cons=c.pres?c.real/c.pres:null;
          r+='<tr><td class="l">'+E(c.nombre)+(c.anual?' <span class="tag">anual</span>':'')+'</td><td>'+(c.pres?eur(c.pres):'—')+'</td><td>'+eur(c.real)+'</td><td class="barc">'+barra((cons||0)*100,cons==null?'#CBD5E1':(cons<=0.84?'#16A34A':(cons<=1?'#D97706':'#DC2626')),'thin')+'<span class="mu">'+(cons!=null?pc(cons,false,0):'sin presupuesto')+'</span></td><td><span class="sem '+sem+'">'+eur(p)+'</span></td><td class="mu">'+eur(c.prev)+'</td></tr>'; });
        var gc=0; g.cats.forEach(function(c){ gc+=cierre(c); }); r+='<tr class="tot"><td class="l">Subtotal '+E(g.g)+'</td><td>'+eur(g.pres)+'</td><td>'+eur(g.real)+'</td><td></td><td>'+eur(gc)+'</td><td>'+eur(g.prev)+'</td></tr>'; });
      return '<table class="t xs"><thead><tr><th class="l">Categoría</th><th>Presupuesto</th><th>Gastado</th><th>Consumido</th><th>'+(enCurso?'Cierre previsto':'Total')+'</th><th>'+yP+' mismas fechas</th></tr></thead><tbody>'+r+'</tbody></table>'; }
    var corte=gs.length, n=0; for(var i=0;i<gs.length;i++){ n+=gs[i].cats.length+2; if(n>30){ corte=Math.max(1,i); break; } }
    var nota='<div class="nota">'+(enCurso?'Cierre previsto: en las partidas mensuales, gastado ÷ '+nCer+' meses × '+nPer+'; en las <b>anuales</b>, lo presupuestado (o lo pagado, si ya pasó). ':'')+'Verde: dentro del presupuesto · ámbar: hasta un 10 % por encima · rojo: más.</div>';
    if(corte<gs.length){ out+=pag(h+tabla(gs.slice(0,corte))+pie('Resumen del hogar')); out+=pag(cab('Resumen del hogar','Presupuesto (continuación)',4,4)+tabla(gs.slice(corte))+nota+pie('Resumen del hogar')); }
    else out+=pag(h+tabla(gs)+nota+pie('Resumen del hogar'));
    /* anexo opcional: cada movimiento */
    if(ctx.modo==='completo'&&typeof _infDetalle==='function'){ try{ var dI=_infDetalle(mv,'ingreso','completo'), dG=_infDetalle(mv,'gasto','completo');
      out+='<section class="pag anexo">'+cab('Resumen del hogar','Anexo · cada movimiento del periodo','A','A').replace(/Página A de A/,'Anexo')+'<h2>Ingresos</h2>'+dI.html+'<h2>Gastos</h2>'+dG.html+'</section>'; }catch(e){} }
    if(corte>=gs.length) out=out.replace(/ de 4<\/div>/g,' de 3</div>');
    return doc(out);
  }

  /* ===================== RESUMEN DE LA INVERSIÓN ===================== */
  function limpia(n){ n=String(n||'').replace(/,? *(S\.?A\.?|Sociedad An[oó]nima)\b.*$/i,'').trim(); if(n===n.toUpperCase()) n=n.toLowerCase().replace(/\b\w/g,function(c){ return c.toUpperCase(); }); return n.slice(0,24); }
  function buildResInv(ctx){
    var hoy=hoyS(), Y=+hoy.slice(0,4);
    var R=rentabilidadEmpresas(); if(!R||R.empty) return doc(pag(cab('Resumen de la inversión','Sin posiciones abiertas',1,1)));
    var T=_rentaTotales(R.rows), K=(window.nDivKpis?window.nDivKpis():{cob:0,pend:0,sig:0,sigT:{},prox:null});
    var sn=patSnaps(), last=sn.length?snapTot(sn[sn.length-1]):null, lastF=sn.length?sn[sn.length-1].fecha:null, ini=sn.filter(function(s){ return s.fecha>=(Y-1)+'-12-01'; })[0];
    var d=null, nm=null; try{ d=carteraEvolData(); nm=window.nSerieNomina?window.nSerieNomina(d):null; }catch(e){}
    var EV=[]; if(d&&d.labels&&nm){ var lm=''; d.labels.forEach(function(l,i){ var m=l.slice(0,7); if(m!==lm||i===d.labels.length-1){ EV.push([l,N(d.valor[i]),N(nm[i])]); lm=m; } }); }
    var nomina=EV.length?EV[EV.length-1][2]:null;
    /* --- página 1 --- */
    var h=cab('Resumen de la inversión','Situación a '+dmy(hoy)+' · carteras Propia y Compartida',1,3)+'<div class="kg">'+
      kpi('#1F4A9A','#EAF1FD','🏦','Patrimonio',last?eur(last.total):'—',lastF?('último registro '+lastF.slice(8,10)+'/'+lastF.slice(5,7)+(ini?' · '+pc(last.total/snapTot(ini).total-1,true,0)+' en el año':'')):'sin registros')+
      kpi('#2563EB','#DBEAFE','💼','Valor de la cartera',eur(T.valor),T.n+' empresas')+
      kpi('#7C3AED','#EDE9FE','👛','De mi nómina ha salido',eur(nomina),nomina?('por cada euro puesto, hoy hay '+fx(T.valor/nomina)):'')+
      kpi('#16A34A','#DCFCE7','🏆','Ganado en total',eur(T.balance,true),'plusvalía '+eur(T.pl)+' + dividendos '+eur(T.divCob),'#15803D')+'</div>';
    if(EV.length>2){ var pts=EV.filter(function(e){ return e[0]>=(Y-10)+'-01'; }); var W=900,H=250,L=58,Rr=12,Tt=16,B=30, mx=1; pts.forEach(function(e){ mx=Math.max(mx,e[1],e[2]); }); var st=mx>200000?50000:(mx>50000?25000:10000); mx=(Math.floor(mx/st)+1)*st;
      var n=pts.length, sx=function(i){ return L+i*(W-L-Rr)/Math.max(1,n-1); }, sy=function(v){ return Tt+(mx-v)/mx*(H-Tt-B); }, s='<svg viewBox="0 0 '+W+' '+H+'" class="ch">';
      for(var k=0;k<=mx;k+=st){ var yy=sy(k); s+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="#E2E8F0"/><text x="'+(L-6)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end" class="ax">'+miles(k/1000)+' mil</text>'; }
      pts.forEach(function(e,i){ if(e[0].slice(5,7)==='01'&&(+e[0].slice(0,4))%2===0) s+='<text x="'+sx(i).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle" class="ax">'+e[0].slice(0,4)+'</text>'; });
      var lv=pts.map(function(e,i){ return sx(i).toFixed(1)+','+sy(e[1]).toFixed(1); }).join(' ');
      s+='<path d="M'+lv.split(' ').join(' L')+' L'+sx(n-1).toFixed(1)+','+sy(0).toFixed(1)+' L'+sx(0).toFixed(1)+','+sy(0).toFixed(1)+' Z" fill="#2563EB" opacity=".12"/><polyline fill="none" stroke="#2563EB" stroke-width="2.2" points="'+lv+'"/>';
      s+='<polyline fill="none" stroke="#7C3AED" stroke-width="2" stroke-dasharray="6 4" points="'+pts.map(function(e,i){ return sx(i).toFixed(1)+','+sy(e[2]).toFixed(1); }).join(' ')+'"/>';
      var u=pts[n-1]; s+='<text x="'+(sx(n-1)-4).toFixed(1)+'" y="'+(sy(u[1])-8).toFixed(1)+'" text-anchor="end" class="lb" fill="#1D4ED8">'+eur(u[1])+'</text><text x="'+(sx(n-1)-4).toFixed(1)+'" y="'+(sy(u[2])-8).toFixed(1)+'" text-anchor="end" class="lb" fill="#6D28D9">'+eur(u[2])+'</text></svg>';
      h+='<h2>Cómo ha crecido la cartera</h2><div class="leg"><span><i style="background:#2563EB"></i>Valor de la cartera</span><span><i style="background:#7C3AED;height:2px"></i>De mi nómina ha salido (lo puesto menos lo recuperado)</span></div>'+s; }
    if(last){ var ef=last.ef, inv=last.inv, tt=ef+inv||1; h+='<h2>Reparto del patrimonio</h2><div class="bar big"><i style="width:'+(inv/tt*100).toFixed(1)+'%;background:#16A34A"></i><i style="width:'+(ef/tt*100).toFixed(1)+'%;background:#2563EB"></i></div><div class="leg"><span><i style="background:#16A34A"></i>Invertido '+eur(inv)+' ('+pc(inv/tt,false,0)+')</span><span><i style="background:#2563EB"></i>Efectivo '+eur(ef)+' ('+pc(ef/tt,false,0)+')</span></div>'; }
    h+='<div class="pp"><b>En pocas palabras.</b> La cartera vale '+eur(T.valor)+(nomina?' y de vuestra nómina han salido '+eur(nomina)+': lo demás lo ha puesto la propia cartera':'')+'. Desde el principio se han ganado '+eur(T.balance)+', de los que '+eur(T.divCob)+' son dividendos cobrados. Este año los dividendos suman '+eur(K.cob+K.pend)+' ('+eur(K.cob)+' cobrados y '+eur(K.pend)+' por cobrar).</div>';
    if(EV.length){ var fin={}; EV.forEach(function(e){ fin[e[0].slice(0,4)]=e; }); var ys=Object.keys(fin).sort().slice(-6);
      h+='<h2>Año a año</h2><table class="t sm"><thead><tr><th class="l">Fecha</th><th>Valor cartera</th><th>Cambio en el año</th><th>De mi nómina</th><th>Lo que ha puesto la cartera</th><th>€ por € puesto</th></tr></thead><tbody>'+ys.map(function(y){ var e=fin[y], pv=fin[String(+y-1)];
        return '<tr><td class="l">'+(+y===Y?'Hoy':'31-dic-'+y)+'</td><td class="b">'+eur(e[1])+'</td><td>'+(pv?eur(e[1]-pv[1],true):'—')+'</td><td>'+eur(e[2])+'</td><td class="pos">'+eur(e[1]-e[2],true)+'</td><td>'+(e[2]>0?fx(e[1]/e[2])+' ×':'—')+'</td></tr>'; }).join('')+'</tbody></table>'; }
    var out=pag(h+pie('Resumen de la inversión'));
    /* --- página 2 --- */
    var rows=R.rows.slice().sort(function(a,b){ return N(b.valor)-N(a.valor); }), MX=1; rows.forEach(function(r){ MX=Math.max(MX,Math.abs(N(r.pl))+N(r.divCob)+N(r.derechos)); });
    h=cab('Resumen de la inversión','Empresa a empresa',2,3)+'<div class="leg"><span><i style="background:#3B82F6"></i>Plusvalía</span><span><i style="background:#16A34A"></i>Dividendos</span><span><i style="background:#F59E0B"></i>Derechos</span><span><i style="background:#FCA5A5"></i>Pérdida de precio</span></div>';
    h+='<table class="t"><thead><tr><th class="l">Empresa</th><th>Peso</th><th>Valor</th><th>Plusvalía</th><th>Dividendos</th><th>Ganado</th><th>Rent. total</th><th>TIR</th><th>Este año</th></tr></thead><tbody><tr class="tot"><td class="l">Total · '+T.n+' empresas</td><td>100 %</td><td>'+eur(T.valor)+'</td><td class="pos">'+eur(T.pl,true)+'</td><td>'+eur(T.divCob)+'</td><td class="pos">'+eur(T.balance,true)+'</td><td>'+pc(T.rentTot,true,0)+'</td><td>—</td><td>—</td></tr>'+
      rows.map(function(r){ var pl=N(r.pl), dv=N(r.divCob), de=N(r.derechos), w=function(v){ return (Math.max(0,v)/MX*100).toFixed(1); };
        var b=(pl<0?'<i style="width:'+Math.min(100,-pl/MX*100).toFixed(1)+'%;background:#FCA5A5"></i>':'<i style="width:'+w(pl)+'%;background:#3B82F6"></i>')+'<i style="width:'+w(dv)+'%;background:#16A34A"></i><i style="width:'+w(de)+'%;background:#F59E0B"></i>';
        return '<tr><td class="l"><b>'+E(r.t)+'</b> <span class="mu">'+E(limpia(((DB.valores||{})[r.t]||{}).nombre||r.t))+'</span><div class="bar thin">'+b+'</div></td><td>'+pc(r.peso,false,0)+'</td><td class="b">'+eur(r.valor)+'</td><td class="'+(pl>=0?'pos':'neg')+'">'+eur(pl,true)+'</td><td>'+eur(dv)+'</td><td class="b '+(N(r.balance)>=0?'pos':'neg')+'">'+eur(r.balance,true)+'</td><td>'+pc(r.rentTot,true,0)+'</td><td>'+pc(r.xirr)+'</td><td class="'+(N(r.trYTD)>=0?'pos':'neg')+'">'+pc(r.trYTD,true)+'</td></tr>'; }).join('')+'</tbody></table>';
    var CE=[]; try{ CE=window.nRentaCerradas?window.nRentaCerradas():[]; }catch(e){}
    if(CE.length){ var cb=0, cd=0; CE.forEach(function(c){ cb+=N(c.balance); cd+=N(c.divCob); });
      h+='<h2>Posiciones cerradas</h2><table class="t sm"><thead><tr><th class="l">Empresa</th><th>Compra-venta</th><th>Dividendos</th><th>Ganado</th><th>Rent. total</th></tr></thead><tbody>'+CE.slice().sort(function(a,b){ return N(b.balance)-N(a.balance); }).map(function(c){ return '<tr><td class="l"><b>'+E(c.t)+'</b></td><td class="'+(N(c.pl)>=0?'pos':'neg')+'">'+eur(c.pl,true)+'</td><td>'+eur(c.divCob)+'</td><td class="b '+(N(c.balance)>=0?'pos':'neg')+'">'+eur(c.balance,true)+'</td><td>'+pc(c.rentTot,true,0)+'</td></tr>'; }).join('')+
        '<tr class="tot"><td class="l">Total</td><td></td><td>'+eur(cd)+'</td><td class="'+(cb>=0?'pos':'neg')+'">'+eur(cb,true)+'</td><td></td></tr></tbody></table><div class="nota">Toda la historia (abiertas + cerradas): ganado '+eur(T.balance+cb,true)+' · dividendos cobrados '+eur(T.divCob+cd)+'.</div>'; }
    out+=pag(h+pie('Resumen de la inversión'));
    /* --- página 3: dividendos --- */
    var tot=K.cob+K.pend, pr=K.prox;
    h=cab('Resumen de la inversión','Dividendos '+Y+' y lo que toca en la renta',3,3)+'<div class="kg">'+
      kpi('#16A34A','#DCFCE7','💶','Dividendos '+Y,eur(tot),eur(K.cob)+' cobrados · '+eur(K.pend)+' por cobrar')+
      kpi('#D97706','#FEF3C7','⏭️','Próximo cobro',pr?eur(pr.v):'—',pr?(pr.t+' · '+pr.f.slice(8,10)+'/'+pr.f.slice(5,7)):'nada pendiente este año')+
      kpi('#2563EB','#DBEAFE','🔮','Previsión '+(Y+1),eur(K.sig),(tot?pc(K.sig/tot-1,true,0)+' sobre '+Y+' · ':'')+'con la cartera de hoy')+
      kpi('#7C3AED','#EDE9FE','📐','Rentabilidad por dividendo',T.valor?pc(K.sig/T.valor):'—','previsión del año que viene ÷ valor')+'</div>';
    var dm=[]; for(var q=0;q<12;q++) dm.push({c:0,p:0}); var pos={}; invPositions().forEach(function(x){ if(x.acciones>0.0001) pos[String(x.ticker).toUpperCase()]=1; });
    Object.keys(pos).forEach(function(t){ ((DB.dividendos||{})[t]||[]).forEach(function(dd){ var f=(dd.fecha||'').slice(0,10); if(f.slice(0,4)===String(Y)&&divEsCobrado(dd)) dm[+f.slice(5,7)-1].c+=_calSharesAt(t,f,true)*N(dd.importe); });
      try{ (_calPendNoReg(t,Y)||[]).forEach(function(e){ if(e.fecha>hoy) dm[+e.fecha.slice(5,7)-1].p+=(+e.sh)*(+e.imp); }); }catch(e){} });
    var W2=900,H2=200,L2=50,R2=12,T2=16,B2=28, mx2=1; dm.forEach(function(m){ mx2=Math.max(mx2,m.c+m.p); }); var st2=mx2>5000?2000:1000; mx2=(Math.floor(mx2/st2)+1)*st2;
    var sy2=function(v){ return T2+(mx2-v)/mx2*(H2-T2-B2); }, bw2=(W2-L2-R2)/12, s2='<svg viewBox="0 0 '+W2+' '+H2+'" class="ch">';
    for(var k2=0;k2<=mx2;k2+=st2){ var y2=sy2(k2); s2+='<line x1="'+L2+'" x2="'+(W2-R2)+'" y1="'+y2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="#E2E8F0"/><text x="'+(L2-6)+'" y="'+(y2+4).toFixed(1)+'" text-anchor="end" class="ax">'+miles(k2)+'</text>'; }
    dm.forEach(function(m,i){ var x=L2+i*bw2+bw2*0.2, w=bw2*0.6, y0=sy2(0); if(m.c) s2+='<rect x="'+x.toFixed(1)+'" y="'+sy2(m.c).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(y0-sy2(m.c)).toFixed(1)+'" rx="2" fill="#16A34A"/>';
      if(m.p) s2+='<rect x="'+x.toFixed(1)+'" y="'+sy2(m.c+m.p).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(sy2(m.c)-sy2(m.c+m.p)).toFixed(1)+'" rx="2" fill="#86EFAC" stroke="#16A34A" stroke-dasharray="3 2"/>';
      if(m.c+m.p) s2+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(sy2(m.c+m.p)-5).toFixed(1)+'" text-anchor="middle" class="lb">'+miles(m.c+m.p)+'</text>'; s2+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H2-9)+'" text-anchor="middle" class="ax">'+MES[i]+'</text>'; });
    h+='<h2>Mes a mes</h2><div class="leg"><span><i style="background:#16A34A"></i>Cobrado</span><span><i style="background:#86EFAC"></i>Por cobrar</span></div>'+s2+'</svg>';
    var sg=Object.keys(K.sigT||{}).map(function(t){ return [t,K.sigT[t]]; }).sort(function(a,b){ return b[1]-a[1]; }), ms=sg.length?sg[0][1]:1;
    var F=null; try{ F=_fiscalPorAnio().filter(function(r){ return +r.year===Y; })[0]||null; }catch(e){}
    var fr=F?('<table class="t sm"><tr><td class="l">Dividendos brutos cobrados</td><td class="b">'+eur(F.divB)+'</td></tr><tr><td class="l">Retención (19 %)</td><td>'+eur(F.ret)+'</td></tr><tr><td class="l">Plusvalías y minusvalías de ventas</td><td class="'+(F.pl<0?'neg':'pos')+'">'+eur(F.pl,true)+'</td></tr><tr class="tot"><td class="l">Base del ahorro</td><td>'+eur(F.base)+'</td></tr></table>'):'<div class="nota">Sin datos fiscales del año.</div>';
    h+='<div class="dos"><div><h2>De quién vendrá en '+(Y+1)+'</h2><table class="t sm">'+sg.map(function(x){ return '<tr><td class="l"><b>'+E(x[0])+'</b></td><td class="barc">'+barra(x[1]/ms*100,'#16A34A')+'</td><td class="b">'+eur(x[1])+'</td><td>'+(K.sig?pc(x[1]/K.sig,false,0):'—')+'</td></tr>'; }).join('')+'</table></div><div><h2>Para la renta de '+Y+'</h2>'+fr+'<div class="nota">Orientativo. Las cifras completas, año a año, están en el informe Fiscal.</div></div></div>';
    out+=pag(h+pie('Resumen de la inversión'));
    return doc(out);
  }

  /* ===================== el catálogo: 18 → 8 ===================== */
  var FUERA=['gastos','ahorro','presupuesto','interanual','titular','comercios','patrimonio','cartera','dividendos','rentabilidad','oportunidades','plan','monitor'];
  for(var i=INF_REPORTS.length-1;i>=0;i--){ if(FUERA.indexOf(INF_REPORTS[i].id)>=0) INF_REPORTS.splice(i,1); }
  INF_REPORTS.unshift({id:'reshogar',nombre:'Resumen del hogar',ambito:'Hogar',build:buildResHogar});
  var iInv=0; INF_REPORTS.forEach(function(r,k){ if(r.ambito==='Hogar') iInv=k+1; });
  INF_REPORTS.splice(iInv,0,{id:'resinv',nombre:'Resumen de la inversión',ambito:'Inversión',build:buildResInv});
  try{ INF_ICON.reshogar='🏠'; INF_ICON.resinv='💼'; INF_SUB.reshogar='gastos, ahorro, presupuesto, comercios'; INF_SUB.resinv='cartera, rentabilidad, dividendos'; INF_SUB.amalia='Reembolsables'; }catch(e){}
  try{ INF_REPORTS.forEach(function(r){ if(r.id==='amalia') r.nombre='Reembolsables'; if(r.id==='combustible') r.nombre='Combustible'; }); }catch(e){}
  /* el que viene marcado de entrada es el Resumen del hogar */
  if(typeof renderInformesCenter==='function'){ var o=renderInformesCenter; renderInformesCenter=function(){ var ya=!!document.getElementById('infcBuilt'); var r=o.apply(this,arguments);
      if(!ya&&document.getElementById('infcBuilt')){ try{ var cb=document.querySelector('.infcRep[value="reshogar"]'); if(cb&&!document.querySelector('.infcRep:checked')){ cb.checked=true; cb.closest('.inf-rep').classList.add('on'); }
        var t=document.querySelector('.pos-blk[data-infblk="filtros"] .bt'); if(t) t.textContent='⚙️ Filtros del Resumen del hogar';
        var dsel=document.getElementById('infcDetalle'); if(dsel){ dsel.value='totales'; [].forEach.call(dsel.options,function(op){ op.textContent=op.value==='completo'?'Sí, añadir cada movimiento al final':'No'; }); var lb=dsel.parentNode.querySelector('label'); if(lb) lb.textContent='Anexo de movimientos'; } if(typeof _infUpdCount==='function') _infUpdCount(); }catch(e){} }
      return r; }; }
  /* el resumen de la inversión necesita las cotizaciones cargadas, como antes Rentabilidad */
  if(typeof generarInformesMulti==='function'){ var g0=generarInformesMulti; generarInformesMulti=async function(){ try{ if(document.querySelector('.infcRep[value="resinv"]:checked')&&typeof cargarPreciosCartera==='function') await cargarPreciosCartera(); }catch(e){} return g0.apply(this,arguments); }; }

  /* estilos (solo dentro del PDF) */
  var CSS='.kr{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0F172A}'+
  '.pag{position:relative;page-break-after:always;break-after:page;padding-bottom:26px}'+
  '.cab{display:flex;gap:14px;align-items:center;background:linear-gradient(120deg,#1E3A8A,#2563EB);color:#fff;border-radius:14px;padding:14px 18px;margin-bottom:14px}'+
  '.logo{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:.5px;color:#fff}'+
  '.ct{flex:1}.cn{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;opacity:.75}.ct h1{margin:2px 0;font-size:22px;color:#fff;font-family:inherit}.cs{font-size:12px;opacity:.9}.cp{font-size:10.5px;text-align:right;opacity:.85;line-height:1.5}'+
  '.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.k{border:1px solid #E2E8F0;border-left:4px solid;border-radius:11px;padding:9px 10px}'+
  '.kh{display:flex;gap:6px;align-items:center;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#475569}.ki{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px}'+
  '.kv{font-size:19px;font-weight:800;margin:5px 0 2px}.ks{font-size:9.5px;color:#64748B;line-height:1.35}'+
  '.pp{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:11px;padding:10px 12px;font-size:11.5px;line-height:1.55;margin:6px 0}'+
  '.kr h2{font-size:13.5px;margin:14px 0 6px;color:#1F2A44;border-bottom:2px solid #EEF2F7;padding-bottom:4px;text-transform:none;letter-spacing:0;font-weight:700}'+
  '.leg{display:flex;flex-wrap:wrap;gap:12px;font-size:10px;color:#475569;margin:2px 0 4px}.leg i{display:inline-block;width:12px;height:8px;border-radius:2px;margin-right:4px;vertical-align:middle}'+
  '.ch{width:100%;height:auto;display:block}.ch .ax{font-size:10px;fill:#64748B}.ch .lb{font-size:10px;font-weight:700}'+
  '.t{width:100%;border-collapse:collapse;font-size:10.5px;margin:0}.t th{font-size:9px;text-transform:uppercase;letter-spacing:.3px;color:#64748B;text-align:right;padding:5px 6px;border:0;border-bottom:1px solid #E2E8F0;background:transparent}'+
  '.t td{text-align:right;padding:4px 6px;border:0;border-bottom:1px solid #F1F5F9;white-space:nowrap;background:transparent}.t .l{text-align:left}.t .b{font-weight:700}.mu{color:#64748B;font-size:9.5px}'+
  '.t tr.tot td{font-weight:800;background:#F8FAFC;border-top:1px solid #E2E8F0}.t tr.sub td{font-weight:800;color:#1F4A9A;background:#F1F5FF;font-size:10px;text-transform:uppercase;letter-spacing:.3px}'+
  '.t.sm td{padding:3.5px 6px}.t.xs{font-size:9.5px}.t.xs td{padding:2.6px 6px}.half{width:55%}.pos{color:#15803D}.neg{color:#B91C1C}'+
  '.barc{width:30%}.bar{height:9px;background:#F1F5F9;border-radius:5px;overflow:hidden;display:flex}.bar i{display:block;height:100%}.bar.thin{height:5px;margin-top:3px;width:100%;min-width:120px}.barc .bar.thin{display:inline-flex;width:60%;min-width:0;vertical-align:middle;margin:0 6px 0 0}.bar.big{height:16px;border-radius:8px}'+
  '.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}.dos{display:grid;grid-template-columns:1fr 1fr;gap:14px}'+
  '.sem{display:inline-block;border-radius:6px;padding:1px 6px;font-weight:700}.sem.ok{background:#DCFCE7;color:#166534}.sem.am{background:#FEF3C7;color:#92400E}.sem.ma{background:#FEE2E2;color:#991B1B}'+
  '.tag{font-size:8px;background:#EDE9FE;color:#6D28D9;border-radius:4px;padding:0 4px;font-weight:700;margin-left:4px}.nota{font-size:9.5px;color:#64748B;margin-top:8px;line-height:1.45}'+
  '.pie{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;font-size:8.5px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:5px}';
  CSS=CSS.replace(/(^|\})([^{}]+)\{/g,function(m,a,sel){ return a+sel.split(',').map(function(x){ x=x.trim(); return x.indexOf('.kr')===0?'#informePrint '+x:'#informePrint .kr '+x; }).join(',')+'{'; });
  var st=document.createElement('style'); st.id='nInfResCSS'; st.textContent=CSS+'#informePrint .kr:last-child .pag:last-child{page-break-after:auto;break-after:auto}@media print{#informePrint .kr .pag{min-height:270mm}#informePrint .kr .pag.anexo{min-height:0}}'; document.head.appendChild(st);
  window.nInfRes={hogar:buildResHogar,inv:buildResInv};
})();
