/* APP NUEVA · Movimientos · IMPORTAR EXTRACTOS DEL BANCO (31-oct-2026, Carlos: «vamos a hacer primero movimientos, que me da mucho trabajo anotarlos»)
   Lee los Excel que descargas de ING (cuenta y tarjeta de crédito) y de Santander (cuenta). El de Renta 4 no entra aquí (decisión de Carlos:
   sirve solo para la caja del bróker).
   Con cada línea del banco:
     1. YA APUNTADA → si casa con un movimiento tuyo (mismo importe, ±6 días; o dos cargos del mismo día que suman uno tuyo, o dos tuyos
        que suman un cargo) se marca «cuadra con el extracto» (conc) y se aprende cómo lo clasificaste.
     2. TRASPASO → recibos de Renta 4, cargo mensual de la tarjeta, retiradas de cajero, compras anuladas: no son gasto, no se apuntan.
     3. NUEVA → se propone con categoría, titular y concepto aprendidos de cómo apuntaste antes ese comercio; tú corriges y «Apuntar».
        «No apuntar» la aparta para siempre (p. ej. el tren que luego te devolvieron por Bizum).
   Lo ya decidido se recuerda (DB.bancoVistos) y no se vuelve a proponer al subir otra vez el mismo extracto.
   También guarda el último saldo de cada cuenta (DB.bancoSaldos), para la futura tarjeta «Efectivo en cuentas». */
(function(){
  if(window._nimp) return; window._nimp=true;
  var LIB='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var CTA={ING:'ING cuenta',TARJ:'ING tarjeta',SAN:'Santander'};
  function cargarLib(){ return new Promise(function(ok,ko){ if(window.XLSX) return ok(); var s=document.createElement('script'); s.src=LIB; s.onload=function(){ ok(); }; s.onerror=function(){ ko(new Error('no se pudo cargar el lector de Excel')); }; document.head.appendChild(s); }); }
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function hoy(){ var d=new Date(); d=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return d.toISOString().slice(0,10); }
  function addD(f,n){ var d=new Date(f+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  function dias(a,b){ return Math.round(Math.abs(new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/864e5); }
  function nn(x){ if(typeof x==='number') return x; var s=String(x||'').replace(/[^\d,.\-]/g,''); if(/,\d{1,2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.'); var v=parseFloat(s); return isNaN(v)?null:v; }
  function serial(v){ if(typeof v==='number'){ var d=new Date(Date.UTC(1899,11,30)+Math.round(v)*864e5); return d.toISOString().slice(0,10); }
    var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(v||'').trim()); return m?m[3]+'-'+m[2]+'-'+m[1]:null; }
  function r2(x){ return Math.round(x*100)/100; }
  function sinAc(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function hash(s){ var h=5381; for(var i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }

  /* ---------- lectura ---------- */
  function filas(wb,n){ var ws=wb.Sheets[n]; return ws?XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''}):[]; }
  function leer(buf,nombre){
    var wb=XLSX.read(buf,{type:'array'}), N=wb.SheetNames, out={fichero:nombre,lineas:[],tipo:null};
    if(N.indexOf('Rdos.')>=0||N.indexOf('Saldo en Divisa')>=0){ out.tipo='R4'; out.r4=[];   /* solo para cotejar los recibos que pagan los bancos a R4 */
      filas(wb,'Saldo en Divisa').forEach(function(r){ var f=serial(r[0]), c=String(r[1]||'').toUpperCase(), im=nn(r[2]); if(f&&im!=null&&/^(INGRESO RECIBO|TRANSF\. RECIBIDA)/.test(c)) out.r4.push({fecha:f,imp:im}); });
      return out; }
    for(var si=0;si<N.length;si++){ var R=filas(wb,N[si]);
      for(var i=0;i<Math.min(R.length,15);i++){ var h=R[i].map(function(c){ return String(c).trim().toUpperCase(); });
        if(h[0]==='F. VALOR'&&h.indexOf('SALDO (€)')>=0){ out.tipo='ING';
          for(var j=i+1;j<R.length;j++){ var r=R[j], f=serial(r[0]), im=nn(r[5]); if(!f||im==null) continue; out.lineas.push({src:'ING',f:f,txt:String(r[3]).trim(),imp:im,saldo:nn(r[6]),bcat:String(r[2]||r[1]||'').trim()}); }
          return out; }
        if(h[0]==='FECHA VALOR'&&h.indexOf('IMPORTE (€)')>=0){ out.tipo='TARJ'; var ci=h.indexOf('IMPORTE (€)'), ce=h.indexOf('ESTADO');
          for(var j2=i+1;j2<R.length;j2++){ var q=R[j2], f2=serial(q[0]), im2=nn(q[ci]); if(!f2||im2==null) continue; out.lineas.push({src:'TARJ',f:f2,txt:String(q[3]).trim(),imp:im2,saldo:null,bcat:String(q[2]||q[1]||'').trim(),est:ce>=0?String(q[ce]):''}); }
          return out; }
        if(h[0]==='FECHA OPERACIÓN'&&h[2]==='CONCEPTO'){ out.tipo='SAN';
          for(var k=0;k<i;k++){ if(String(R[k][2]).trim()==='Titular'&&R[k+1]) out.saldoCab=nn(R[k+1][3]); }
          for(var j3=i+1;j3<R.length;j3++){ var w=R[j3], f3=serial(w[0]), im3=nn(w[3]); if(!f3||im3==null) continue; out.lineas.push({src:'SAN',f:f3,txt:String(w[2]).trim(),imp:im3,saldo:nn(w[4]),bcat:''}); }
          return out; }
      } }
    throw new Error(nombre+': no reconozco este Excel (sirven los de movimientos de ING —cuenta o tarjeta— y el de Santander)');
  }
  /* clave de línea: única aunque haya dos cargos idénticos el mismo día (ordinal) */
  function claves(L){ var c={}; L.forEach(function(l){ var b=l.src+'|'+l.f+'|'+l.imp.toFixed(2)+'|'+sinAc(l.txt).replace(/\s+/g,' ')+'|'+(l.saldo==null?'':l.saldo.toFixed(2)); c[b]=(c[b]||0)+1; l.key=hash(b+'#'+c[b]); }); }

  /* ---------- comercio: la parte del texto que identifica al comercio ---------- */
  var PRE=/^(pago en|transaccion contactless en|compra internet en|compra en|compra|recibo|bizum a favor de|bizum de|transferencia de|transferencia a favor de|transferencia inmediata a favor de|transferencia inmediata de|paypal \*|devolucion tarjeta|anul compra internet en|anulacion compra en|traspaso)\s+/;
  var VACIAS={www:1,madrid:1,es:1,sl:1,sa:1,s:1,l:1,sau:1,com:1,en:1,de:1,la:1,el:1,lu:1,us:1,ie:1};
  function clave(t){ var s=sinAc(t); s=s.replace(PRE,''); s=s.split(/,| concepto | n[ºo] recibo| tarj| tarjeta /)[0];
    s=s.replace(/[^a-z ]/g,' '); var w=s.split(/\s+/).filter(function(x){ return x.length>1&&!VACIAS[x]; }); return w.slice(0,2).join(' '); }
  function bonito(t){ var s=String(t||'').replace(PRE.source?new RegExp(PRE.source,'i'):PRE,''); s=s.split(/,| Concepto:? | Nº Recibo| Tarj| Tarjeta /i)[0].replace(/\s+\d{5,}.*$/,'').replace(/\*\S*/g,' ').replace(/\s+/g,' ').trim();
    s=s.replace(/(\s+(madrid|es|lu|us|ie|nl|de|fr|gb|luxembourg|dublin|san francisc\S*))+$/i,'').trim();
    return s.toLowerCase().split(' ').map(function(w){ return w?w.charAt(0).toUpperCase()+w.slice(1):w; }).join(' '); }

  /* ---------- traspasos ---------- */
  function traspaso(l){ var t=sinAc(l.txt);
    if(/renta 4/.test(t)) return 'Aportación a Renta 4';
    if(/cargo mensual tarjeta/.test(t)) return 'Cargo mensual de la tarjeta (sus compras vienen una a una en el extracto de la tarjeta)';
    if(/retirada de efectivo|cajero/.test(t)) return 'Retirada de efectivo (pasa a Efectivo casa)';
    if(/^(transferencia|traspaso)/.test(t)&&/hernanz blazquez carlos/.test(t)) return 'Traspaso entre tus cuentas';
    return null; }

  /* ---------- lo aprendido ---------- */
  function aprend(){ DB.bancoAprend=DB.bancoAprend||{}; return DB.bancoAprend; }
  /* por comercio se cuentan las veces de cada clasificación y de cada concepto: se propone lo que más repites, no lo último */
  function aprender(l,m){ var k=clave(l.txt); if(!k) return; var A=aprend(), a=A[k]; if(!a||!a.n) a=A[k]={n:{},k:{}};
    var cl=[m.categoriaId||'',m.titular||'Dos',m.reemb?1:0,m.tipo].join('|'); a.n[cl]=(a.n[cl]||0)+1; if(m.concepto) a.k[m.concepto]=(a.k[m.concepto]||0)+1;
    if(m.comercio) a.co=m.comercio; if(m.detalle) a.d=m.detalle; podarA(a.k,12); podarA(a.n,8); }
  function podarA(o,max){ var K=Object.keys(o); if(K.length<=max) return; K.sort(function(x,y){ return o[x]-o[y]; }).slice(0,K.length-max).forEach(function(x){ delete o[x]; }); }
  function mayor(o){ var b=null,v=-1; Object.keys(o||{}).forEach(function(x){ if(o[x]>v){ v=o[x]; b=x; } }); return b; }
  function leerAprend(k,tipo){ var a=aprend()[k]; if(!a||!a.n) return null; var cl=mayor(a.n); if(!cl) return null; var q=cl.split('|');
    if(q[3]!==tipo&&q[2]!=='1') return null; return {c:q[0],t:q[1],r:q[2]==='1',ti:q[3],k:mayor(a.k)||'',co:a.co||'',d:a.d||''}; }
  function catNombre(id){ var c=(DB.categorias||[]).filter(function(x){ return x.id===id; })[0]; return c?c.nombre:''; }
  function catPorNombre(n){ var c=(DB.categorias||[]).filter(function(x){ return sinAc(x.nombre)===sinAc(n); })[0]; return c?c.id:''; }
  var MAPA_ING={'supermercados y alimentacion':'Alimentación','cafeterias y restaurantes':'Ocio','compras (otros)':'Compras Varios','ropa y complementos':'Compras Varios','decoracion y mobiliario':'Hogar','deporte y gimnasio':'Gimnasio','gasolina':'Gasolina','transporte publico':'Transporte','billetes de viaje':'Vacaciones','nomina o pension':'Otros Ingresos'};
  var _dets=null, GENER={bizum:1,paypal:1,transferencia:1,recibo:1,compra:1,tienda:1,varios:1,regalo:1,pago:1};
  function detalles(){ if(_dets) return _dets; var vis={}; _dets=[];
    (DB.movimientos||[]).slice().sort(function(a,b){ return a.fecha<b.fecha?1:-1; }).forEach(function(m){ var d=sinAc(m.detalle||'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); if(d.length<4||vis[d]||m.reemb||GENER[d]) return; vis[d]=1;
      _dets.push([d,m,new RegExp('(^|[^a-z0-9])'+d.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)')]); });
    return _dets; }
  function proponer(l){
    var ing=l.imp>0, t=sinAc(l.txt), k=clave(l.txt), p={tipo:ing?'ingreso':'gasto',c:'',t:'Dos',k:'',co:'',d:bonito(l.txt),r:false,marcar:true,nota:'',origen:''};
    var A=leerAprend(k,p.tipo);
    if(A){ p.c=A.c; p.t=A.t; p.k=A.k; p.co=A.co; p.d=A.d||p.d; p.r=A.r; p.origen='como sueles apuntarlo'; }
    else { var tl=t.replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' '); var hit=detalles().filter(function(x){ return x[1].tipo===p.tipo&&x[2].test(tl); })[0];
      if(hit){ var m=hit[1]; p.c=m.categoriaId; p.t=m.titular||'Dos'; p.k=m.concepto; p.co=m.comercio; p.d=m.detalle; p.origen='por «'+m.detalle+'»'; }
      else if(l.bcat&&MAPA_ING[sinAc(l.bcat)]){ p.c=catPorNombre(MAPA_ING[sinAc(l.bcat)]); p.origen='por la categoría de ING'; } }
    if(/^bizum de /.test(t)){ p.marcar=false; p.nota='Bizum que te mandan: si es lo que te devuelven de un gasto compartido, normalmente no se apunta'; }
    if(/^transferencia de perez pardillo susana/.test(t)){ p.r=true; p.t='Susana'; p.k=p.k||'Devolución Susana'; p.nota='Transferencia de Susana → reembolsable'; }
    if(/^traspaso:/.test(t)){ p.r=true; p.t='Dos'; p.k='Transferencia Reembolso'; p.c=''; p.nota='Transferencia de reembolsables'; }
    if(/^devolucion tarjeta/.test(t)){ p.nota='Devolución de un cargo con tarjeta'; }
    var cm=/concepto:?\s*(.+)$/i.exec(l.txt);
    if(!p.k&&/^bizum/.test(t)) p.k='Bizum '+(ing?'de ':'a ')+p.d+(cm?' · '+cm[1].trim():'');
    if(!p.k) p.k=(ing?'':'Compra ')+p.d;
    if(!p.c&&!p.r) p.nota=(p.nota?p.nota+' · ':'')+'elige la categoría';
    return p;
  }

  /* ---------- casar con lo ya apuntado ---------- */
  function palabras(t){ return sinAc(t).replace(PRE,'').split(/[^a-z0-9]+/).filter(function(w){ return w.length>=4&&!VACIAS[w]&&!/^\d+$/.test(w); }); }
  function casar(L,desde,hasta){
    var M=(DB.movimientos||[]).filter(function(m){ return m.fecha>=addD(desde,-7)&&m.fecha<=addD(hasta,7); }), usado={}, res={};
    M.forEach(function(m){ if(m.bk) usado[m.id]=1; });   /* ya atado a una línea del banco: no se vuelve a usar */
    function signo(m){ return (m.tipo==='ingreso')?1:-1; }
    /* ¿el apunte habla del mismo comercio que la línea del banco? */
    function parecido(l,m){ var W=palabras(l.txt), T=sinAc((m.detalle||'')+' '+(m.concepto||'')+' '+(m.comercio||'')).replace(/[^a-z0-9]+/g,' ');
      for(var i=0;i<W.length;i++){ if((' '+T+' ').indexOf(' '+W[i])>=0||T.indexOf(W[i].slice(0,6))>=0) return true; }
      var A=aprend()[clave(l.txt)]; return !!(A&&A.d&&m.detalle&&sinAc(A.d)===sinAc(m.detalle)); }
    function libre(l){ return !res[l.key]&&!l._tr; }
    /* un apunte tuyo de ese importe: mismo comercio hasta 6 días; si no se parece, como mucho 3 */
    function busca(l,imp,soloParecido){ var best=null,bd=99; M.forEach(function(m){ if(usado[m.id]) return; if(Math.abs(num(m.importe)-imp)>0.005) return; if(signo(m)*l.imp<0) return;
        var d=dias(m.fecha,l.f), par=parecido(l,m); if(soloParecido&&!par) return; var lim=par?6:3, sc=d+(par?0:0.5); if(d<=lim&&sc<bd){ best=m; bd=sc; } }); return best; }
    function casa(Ls,mov,suma){ mov.forEach(function(m){ usado[m.id]=1; }); var r={tipo:'casado',mov:mov,suma:!!suma}; Ls.forEach(function(l){ res[l.key]=r; }); }
    /* 1 · uno a uno, del mismo comercio */
    L.forEach(function(l){ if(!libre(l)) return; var m=busca(l,Math.abs(l.imp),true); if(m) casa([l],[m]); });
    /* 2 · varias líneas del mismo día, cuenta y comercio que suman un apunte tuyo (Telefónica fijo + móvil = «Movistar»; 4 devoluciones = un apunte) */
    var G={}; L.forEach(function(l){ if(!libre(l)) return; var k=l.src+'|'+l.f+'|'+(clave(l.txt).split(' ')[0]||'')+'|'+(l.imp<0); (G[k]=G[k]||[]).push(l); });
    Object.keys(G).forEach(function(k){ var g=G[k]; if(g.length<2||g.length>6) return; var t=r2(g.reduce(function(a,l){ return a+Math.abs(l.imp); },0)); var m=busca(g[0],t); if(m) casa(g,[m],true); });
    /* 3 · uno a uno, aunque el texto no se parezca (fechas muy cercanas) */
    L.forEach(function(l){ if(!libre(l)) return; var m=busca(l,Math.abs(l.imp),false); if(m) casa([l],[m]); });
    /* 4 · dos líneas cualesquiera (también de cuentas distintas, como el IKEA pagado con ING y Santander) que suman un apunte tuyo */
    var S=L.filter(libre);
    for(var i=0;i<S.length;i++) for(var j=i+1;j<S.length;j++){ var a=S[i], b=S[j]; if(!libre(a)||!libre(b)||dias(a.f,b.f)>1||(a.imp<0)!==(b.imp<0)) continue;
      var m2=busca(a,r2(Math.abs(a.imp)+Math.abs(b.imp))); if(m2) casa([a,b],[m2],true); }
    /* 5 · una línea que repartiste en dos apuntes tuyos (parte normal + reembolsable; o la farmacia: 28,27 + 9,97) */
    L.filter(libre).forEach(function(l){ var C=M.filter(function(m){ return !usado[m.id]&&signo(m)*l.imp>0&&dias(m.fecha,l.f)<=3; }), ok=null;
      for(var i2=0;i2<C.length&&!ok;i2++) for(var j2=i2+1;j2<C.length&&!ok;j2++){ if(dias(C[i2].fecha,C[j2].fecha)>1) continue; if(Math.abs(num(C[i2].importe)+num(C[j2].importe)-Math.abs(l.imp))<0.006) ok=[C[i2],C[j2]]; }
      if(ok) casa([l],ok,true); });
    var sinExt=M.filter(function(m){ return !usado[m.id]&&m.fecha>=desde&&m.fecha<=hasta; });
    return {res:res,sinExt:sinExt};
  }
  /* ---------- estado de la importación en curso ---------- */
  var ST=null;   /* {lineas, desde, hasta, ficheros, r4} */
  function vistos(){ DB.bancoVistos=DB.bancoVistos||{}; return DB.bancoVistos; }
  /* ingresos en R4 (de los extractos de R4 subidos ahora o antes en Caja bróker) para cotejar los recibos de los bancos */
  function ingresosR4(){ var L=(ST.r4ing||[]).slice(); try{ var X=window.nR4Xls&&window.nR4Xls(); (X&&X.cash||[]).forEach(function(l){ if(/^(INGRESO RECIBO|TRANSF\. RECIBIDA)/i.test(l.concepto)) L.push({fecha:l.fecha,imp:l.imp}); }); }catch(e){}
    var vis={}; return L.filter(function(x){ var k=x.fecha+'|'+x.imp; if(vis[k]) return false; vis[k]=1; return true; }); }
  function analizar(){
    var V=vistos(), d0=ST.desde, L=ST.lineas.filter(function(l){ return l.f>=d0; });
    var hasta=L.reduce(function(a,l){ return l.f>a?l.f:a; },d0);
    L.forEach(function(l){ l._tr=traspaso(l); var v=V[l.key]||''; l._visto=(v&&v.charAt(0)!=='p')?v:null; });
    /* compra y su anulación (mismo importe con signo contrario, ≤3 días, mismo comercio) */
    L.forEach(function(a){ if(a._tr||a._visto||a.imp>=0) return; var b=L.filter(function(x){ return !x._tr&&!x._visto&&x.imp>0&&Math.abs(x.imp+a.imp)<0.005&&dias(x.f,a.f)<=3&&clave(x.txt)===clave(a.txt); })[0];
      if(b){ a._tr=b._tr='Compra anulada (se compensa con su anulación)'; } });
    /* recibos a Renta 4: se cotejan con su ingreso en el extracto de R4 */
    var R4=ingresosR4(), usR4={}; ST.r4sin=0;
    L.forEach(function(l){ if(l._tr!=='Aportación a Renta 4') return; var j=-1;
      R4.forEach(function(x,i){ if(j<0&&!usR4[i]&&Math.abs(Math.abs(l.imp)-x.imp)<0.005&&dias(x.fecha,l.f)<=7) j=i; });
      if(j>=0){ usR4[j]=1; l._tr='Aportación a Renta 4 · ✓ cotejada: entró en R4 el '+fd(R4[j].fecha); l._r4=true; }
      else { l._tr='Aportación a Renta 4 · sin cotejar todavía (no está en el extracto de R4 que tengo)'; l._r4=false; ST.r4sin++; } });
    var P=pend(), enPend={}; P.forEach(function(x){ enPend[x.key]=x; });
    var nuevas=L.filter(function(l){ return !l._tr&&!l._visto; }), enL={}; nuevas.forEach(function(l){ enL[l.key]=1; });
    P.forEach(function(x){ if(!enL[x.key]) nuevas.push(x.l); });   /* los pendientes de otras veces vuelven a cotejarse (por si los apuntaste a mano) */
    var C=casar(nuevas,addD(d0,-60),hasta);
    ST.casadas=nuevas.filter(function(l){ return C.res[l.key]; }).map(function(l){ return {l:l,c:C.res[l.key]}; });
    ST.casadas.slice().sort(function(a,b){ return a.l.f<b.l.f?-1:1; }).forEach(function(x){ if(x.c.mov.length===1&&!x.c.suma) aprender(x.l,x.c.mov[0]); });   /* lo más reciente manda */
    /* lo que casó y estaba pendiente sale de pendientes; lo nuevo sin casar entra en tu lista como pendiente de revisar */
    DB.movPend=P.filter(function(x){ return !C.res[x.key]; });
    ST.nuevas=0;
    nuevas.forEach(function(l){ if(C.res[l.key]||enPend[l.key]) return; var pr=proponer(l);
      DB.movPend.push({id:'np'+l.key,key:l.key,l:{src:l.src,f:l.f,txt:l.txt,imp:l.imp,saldo:l.saldo,bcat:l.bcat||'',key:l.key},tipo:pr.tipo,nota:pr.nota,origen:pr.origen,dudoso:!pr.marcar,
        parts:[{f:l.f,k:pr.k,co:pr.co||'',d:pr.d||'',c:pr.c,t:pr.t,r:pr.r,imp:r2(Math.abs(l.imp))}]});
      V[l.key]='p'+l.f.replace(/-/g,'').slice(2); ST.nuevas++; });
    ST.traspasos=L.filter(function(l){ return l._tr&&!l._visto; });
    ST.yaVistas=L.filter(function(l){ return l._visto; }).length;
    ST.sinExt=C.sinExt.filter(function(m){ return m.fecha>=d0; }); ST.hasta=hasta;
    /* lo casado se aplica ya: cuadra con el extracto y se aprende la clasificación */
    var hy=hoy(), nC=0;
    ST.casadas.forEach(function(x){ x.c.mov.forEach(function(m){ if(!m.conc){ m.conc=true; m.concF=hy; delete m.concW; nC++; } if(!m.cta) m.cta=x.l.src; m.bk=x.l.key; });
      V[x.l.key]='c'+x.l.f.replace(/-/g,'').slice(2); });
    ST.traspasos.forEach(function(l){ if(l._r4!==false) V[l.key]='t'+l.f.replace(/-/g,'').slice(2); });
    ST.nuevasMarcadas=nC;
    /* saldos de cada cuenta (el más reciente) */
    DB.bancoSaldos=DB.bancoSaldos||{};
    ['ING','SAN'].forEach(function(s){ var U=ST.lineas.filter(function(l){ return l.src===s&&l.saldo!=null; }); if(!U.length) return;
      var last=U[0]; U.forEach(function(l){ if(l.f>last.f) last=l; });   /* los bancos listan del más nuevo al más viejo: con la misma fecha manda el primero */
      var prev=DB.bancoSaldos[s]; if(!prev||prev.fecha<=last.f) DB.bancoSaldos[s]={fecha:last.f,saldo:last.saldo,leido:hy}; });
    podar(); _dets=null;
    if(typeof scheduleSave==='function') scheduleSave();
    if(typeof renderMovs==='function'){ try{ renderMovs(); }catch(e){} }
  }
  function podar(){ var V=vistos(), lim=addD(hoy(),-400).replace(/-/g,'').slice(2); Object.keys(V).forEach(function(k){ if(String(V[k]).slice(1)<lim) delete V[k]; }); }

  function pend(){ DB.movPend=DB.movPend||[]; return DB.movPend; }
  function pPorId(id){ return pend().filter(function(x){ return x.id===id; })[0]; }

  /* ---------- pintar ---------- */
  function fd(f){ return f?f.slice(8,10)+'/'+f.slice(5,7)+'/'+f.slice(2,4):''; }
  function eu(x){ return (typeof fmt==='function')?fmt(x):x.toFixed(2)+' €'; }
  function optsCat(tipo,sel){ var G={}; (DB.categorias||[]).filter(function(c){ return c.tipo===tipo; }).forEach(function(c){ (G[c.grupo]=G[c.grupo]||[]).push(c); });
    return '<option value="">— elige categoría —</option>'+Object.keys(G).map(function(g){ return '<optgroup label="'+E(g)+'">'+G[g].map(function(c){ return '<option value="'+c.id+'"'+(c.id===sel?' selected':'')+'>'+E(c.nombre)+'</option>'; }).join('')+'</optgroup>'; }).join(''); }
  function optsTit(sel){ return ['Carlos','Susana','Dos'].map(function(t){ return '<option'+(t===sel?' selected':'')+'>'+t+'</option>'; }).join(''); }
  function listas(){ var V=document.getElementById('view-movimientos'); if(!V||document.getElementById('nImpDlCo')) return; var co={}, de={};
    (DB.movimientos||[]).forEach(function(m){ if(m.comercio) co[m.comercio]=1; if(m.detalle) de[m.detalle]=1; });
    V.insertAdjacentHTML('beforeend','<datalist id="nImpDlCo">'+Object.keys(co).sort().map(function(x){ return '<option value="'+E(x)+'">'; }).join('')+'</datalist>'+
      '<datalist id="nImpDlDe">'+Object.keys(de).sort().map(function(x){ return '<option value="'+E(x)+'">'; }).join('')+'</datalist>'); }
  function suma(x){ return r2(x.parts.reduce(function(a,q){ return a+num(q.imp); },0)); }
  function completo(x){ return Math.abs(suma(x)-Math.abs(x.l.imp))<0.006 && x.parts.every(function(q){ return num(q.imp)>0&&(q.r||q.c); }); }
  function difTxt(x){ var d=r2(Math.abs(x.l.imp)-suma(x)); return Math.abs(d)<0.006?'<span class="ok">✓ las partes suman el cargo</span>':'<span class="ko">'+(d>0?'Faltan ':'Sobran ')+eu(Math.abs(d))+'</span>'; }
  function A(x,j){ return ' data-np="'+x.id+'" data-nj="'+j+'"'; }
  /* fila de escritorio: dos filas por parte, con las mismas columnas que tu lista (✓ · importe · fecha · concepto · categoría · comercio · titular) */
  function trsPend(x){ var l=x.l, ing=x.tipo==='ingreso', h='', n=x.parts.length;
    x.parts.forEach(function(q,j){ var dis=q.r?' disabled':'', eff=(ing?1:-1)*num(q.imp);
      h+='<tr class="mv-row npend'+(q.r?' reemb':'')+(j?' npart':'')+'" data-npid="'+x.id+'">'+
        '<td class="ctr mv-ckcell">'+(j?'':'<span class="mv-ckw"><input type="checkbox" class="npCk" data-npck="'+x.id+'" title="Marca cuando lo hayas revisado: pasa a tu lista como comprobado"><span class="cd">revisar</span></span>')+'</td>'+
        '<td class="ctr">'+(n>1?'<input class="np-in np-imp" type="number" step="0.01" min="0"'+A(x,j)+' data-nf="imp" value="'+num(q.imp).toFixed(2)+'">':
          '<span class="mv-imp2 '+(ing?'ing':'gas')+'"><span class="n">'+(eff>=0?'+':'−')+eu(Math.abs(eff))+'</span><span class="l">del banco</span></span>')+'</td>'+
        '<td class="lft"><input class="np-in np-f" type="date"'+A(x,j)+' data-nf="f" value="'+q.f+'"></td>'+
        '<td class="lft"><input class="np-in"'+A(x,j)+' data-nf="k" value="'+E(q.k)+'" placeholder="Concepto"></td>'+
        '<td class="ctr"><select class="np-in"'+A(x,j)+' data-nf="c"'+dis+'>'+optsCat(x.tipo,q.r?'':q.c)+'</select></td>'+
        '<td class="lft"><input class="np-in"'+A(x,j)+' data-nf="co" value="'+E(q.r?'':q.co)+'" placeholder="Comercio" list="nImpDlCo"'+dis+'></td>'+
        '<td class="ctr"><select class="np-in"'+A(x,j)+' data-nf="t">'+optsTit(q.t)+'</select></td>'+
        '<td class="ctr">'+(j?'<button class="np-x"'+A(x,j)+' data-npx="1" title="Quitar esta parte">✕</button>':'<button class="np-no" data-npno="'+x.id+'" title="No apuntar nunca este movimiento del banco">no apuntar</button>')+'</td></tr>'+
        '<tr class="npend2'+(q.r?' reemb':'')+'" data-npid="'+x.id+'"><td></td><td colspan="7"><div class="np-l2">'+
          (j?'<span class="np-pt">parte '+(j+1)+'</span>':'<span class="np-bk">🏦 '+E(CTA[l.src])+(n>1?' · <b>cargo '+eu(l.imp)+'</b>':'')+' · '+E(l.txt)+'</span>')+
          '<input class="np-in np-d"'+A(x,j)+' data-nf="d" value="'+E(q.r?'':q.d)+'" placeholder="Detalle" list="nImpDlDe"'+dis+'>'+
          '<button class="np-rb'+(q.r?' on':'')+'"'+A(x,j)+' data-nprb="1" title="Lo adelantas y te lo devuelven: no cuenta como gasto">↩ Reembolsable</button>'+
          (j===n-1?'<button class="np-sp" data-npsp="'+x.id+'" title="Repartir el cargo en dos apuntes (p. ej. casa + Amalia)">✂ Partir</button>':'')+
          (j===n-1&&n>1?'<span class="np-dif">'+difTxt(x)+'</span>':'')+
          (!j&&(x.nota||x.origen)?'<span class="np-nota">'+E([x.nota,x.origen?'propuesto '+x.origen:''].filter(Boolean).join(' · '))+'</span>':'')+
        '</div></td></tr>'; });
    return h; }
  /* tarjeta de móvil */
  function cardPend(x){ var l=x.l, ing=x.tipo==='ingreso', n=x.parts.length;
    return '<div class="mvc npend" data-npid="'+x.id+'"><div class="np-ch"><span class="mv-ckw"><input type="checkbox" class="npCk" data-npck="'+x.id+'"><span class="cd">revisar</span></span>'+
      '<div class="np-chm"><b>'+fd(l.f)+'</b> · '+E(CTA[l.src])+'<div class="np-bk">'+E(l.txt)+'</div>'+(x.nota?'<div class="np-nota">'+E(x.nota)+'</div>':'')+'</div>'+
      '<span class="imp '+(ing?'pos':'neg')+'">'+(ing?'+':'−')+eu(Math.abs(l.imp))+'</span></div>'+
      x.parts.map(function(q,j){ var dis=q.r?' disabled':'';
        return '<div class="np-cp'+(q.r?' reemb':'')+'">'+(n>1?'<div class="np-pt">parte '+(j+1)+' <button class="np-x"'+A(x,j)+' data-npx="1">✕</button></div>':'')+
          '<input class="np-in np-k"'+A(x,j)+' data-nf="k" value="'+E(q.k)+'" placeholder="Concepto">'+
          '<select class="np-in"'+A(x,j)+' data-nf="c"'+dis+'>'+optsCat(x.tipo,q.r?'':q.c)+'</select><select class="np-in"'+A(x,j)+' data-nf="t">'+optsTit(q.t)+'</select>'+
          '<input class="np-in"'+A(x,j)+' data-nf="co" value="'+E(q.r?'':q.co)+'" placeholder="Comercio" list="nImpDlCo"'+dis+'><input class="np-in"'+A(x,j)+' data-nf="d" value="'+E(q.r?'':q.d)+'" placeholder="Detalle" list="nImpDlDe"'+dis+'>'+
          '<input class="np-in" type="date"'+A(x,j)+' data-nf="f" value="'+q.f+'">'+(n>1?'<input class="np-in" type="number" step="0.01"'+A(x,j)+' data-nf="imp" value="'+num(q.imp).toFixed(2)+'">':'<span></span>')+
          '<button class="np-rb'+(q.r?' on':'')+'"'+A(x,j)+' data-nprb="1">↩ Reembolsable</button></div>'; }).join('')+
      '<div class="np-cf"><button class="np-sp" data-npsp="'+x.id+'">✂ Partir</button>'+(n>1?'<span class="np-dif">'+difTxt(x)+'</span>':'')+'<button class="np-no" data-npno="'+x.id+'">no apuntar</button></div></div>'; }

  /* mete los pendientes en tu lista, cada uno en su fecha */
  function filtrados(){ var d=(document.getElementById('fltDesde')||{}).value||'', h=(document.getElementById('fltHasta')||{}).value||'', tx=((document.getElementById('fltText')||{}).value||'').toLowerCase().trim();
    return pend().filter(function(x){ var f=x.parts[0].f||x.l.f; if(d&&f<d) return false; if(h&&f>h) return false; if(tx&&(x.parts[0].k+' '+x.l.txt).toLowerCase().indexOf(tx)<0) return false; return true; }); }
  function inyectar(){
    var T=document.getElementById('movTable'); if(!T) return; listas();
    [].slice.call(T.querySelectorAll('[data-npid]')).forEach(function(e){ e.remove(); });   /* nunca dos veces */
    var L=filtrados(), ord=((document.getElementById('fltOrden')||{}).value)||'fecha_desc', asc=ord==='fecha_asc', porF=(ord==='fecha_desc'||asc);
    L.sort(function(a,b){ var fa=a.parts[0].f||a.l.f, fb=b.parts[0].f||b.l.f; return asc?(fa<fb?-1:fa>fb?1:0):(fa<fb?1:fa>fb?-1:0); });
    var barra=document.getElementById('nPendBar');
    var nTot=pend().length, nOk=pend().filter(completo).length;
    var hb=nTot?'<div id="nPendBar" class="np-bar">🏦 <b>'+nTot+' movimiento'+(nTot===1?'':'s')+' del banco por revisar</b>'+(L.length<nTot?' ('+L.length+' con estos filtros)':'')+
      ' · salen en la lista en su fecha, en amarillo. Marca la casilla cuando estén bien y pasan a comprobados.'+
      (nOk?' <button class="btn sm" data-npall="1">✓ Dar por buenos los '+nOk+' que ya están completos</button>':'')+'</div>':'';
    if(barra) barra.outerHTML=hb||'<i id="nPendBar"></i>'; else T.insertAdjacentHTML('beforebegin',hb||'<i id="nPendBar"></i>');
    if(!L.length) return;
    var tb=T.querySelector('table.mv-tbl2 tbody'), cards=T.querySelector('.mvcards');
    if(!tb){ T.innerHTML='<div class="mvtable"><table class="mv-tbl2"><thead><tr><th class="ctr">✓ Banco</th><th class="ctr">Importe</th><th class="lft">Fecha</th><th class="lft">Concepto</th><th class="ctr">Categoría</th><th class="lft">Comercio</th><th class="ctr">Titular</th><th></th></tr></thead><tbody></tbody></table></div><div class="mvcards"></div>';
      tb=T.querySelector('tbody'); cards=T.querySelector('.mvcards'); }
    var F={}; (DB.movimientos||[]).forEach(function(m){ F[m.id]=m.fecha; });
    function antes(cont,sel,mesSel,f){   /* primer elemento que debe ir DESPUÉS del pendiente */
      var R=[].slice.call(cont.querySelectorAll(sel));
      for(var i=0;i<R.length;i++){ var g=F[R[i].getAttribute('data-mvid')]; if(!g) continue; if(asc?(g>f):(g<f)){ var p=R[i].previousElementSibling;
        if(p&&p.matches(mesSel)&&g.slice(0,7)!==f.slice(0,7)) return p; return R[i]; } }
      return null; }
    L.forEach(function(x){ var f=x.parts[0].f||x.l.f;
      var tmp=document.createElement('tbody'); tmp.innerHTML=trsPend(x); var rows=[].slice.call(tmp.children);
      var ref=porF?antes(tb,'tr.mv-row[data-mvid]','tr.mv-mes',f):tb.firstElementChild;
      rows.forEach(function(r){ tb.insertBefore(r,ref); });
      if(cards){ var d=document.createElement('div'); d.innerHTML=cardPend(x); var c=d.firstElementChild; cards.insertBefore(c,porF?antes(cards,'.mvc[data-mvid]','.mvc-mes',f):cards.firstElementChild); }
    });
    var cnt=document.getElementById('movCount'); if(cnt&&cnt.textContent.indexOf('del banco')<0) cnt.textContent+=' · '+nTot+' del banco por revisar';
  }

  /* ---------- confirmar (la casilla de siempre) ---------- */
  function confirmar(x,silencio){
    if(!completo(x)){ if(!silencio){ var falta=[]; if(Math.abs(suma(x)-Math.abs(x.l.imp))>=0.006) falta.push('las partes suman '+eu(suma(x))+' y el cargo es '+eu(Math.abs(x.l.imp)));
        x.parts.forEach(function(q){ if(!q.r&&!q.c) falta.push('«'+q.k+'»: elige la categoría (o márcalo reembolsable)'); if(!(num(q.imp)>0)) falta.push('«'+q.k+'»: importe a cero'); });
        alert('Antes de darlo por bueno:\n· '+falta.join('\n· ')); } return false; }
    var hy=hoy(), l=x.l;
    x.parts.forEach(function(q){ var det=q.d||bonito(l.txt), base=q.co||((typeof baseComercio==='function')?baseComercio(det):'')||det;
      var m={id:uid(),fecha:q.f||l.f,concepto:q.k||det,comercio:q.r?'':base,detalle:q.r?'':det,categoriaId:q.r?'':q.c,titular:q.t,tipo:x.tipo,importe:r2(num(q.imp)),reemb:!!q.r,conc:true,concF:hy,cta:l.src,bk:l.key};
      DB.movimientos.push(m); if(x.parts.length===1) aprender(l,m); });
    vistos()[x.key]='a'+l.f.replace(/-/g,'').slice(2);
    DB.movPend=pend().filter(function(y){ return y!==x; }); _dets=null; return true; }
  function rehacer(){ if(typeof renderAll==='function') renderAll(); else if(typeof renderMovs==='function') renderMovs(); if(typeof scheduleSave==='function') scheduleSave(); }

  /* ---------- importación: resumen en su bloque ---------- */
  function pintar(){
    var el=document.getElementById('nImpRes'); if(!el) return; if(!ST){ el.innerHTML=''; return; }
    var h='<div class="nimp-sum"><b>'+ST.lineas.filter(function(l){ return l.f>=ST.desde; }).length+'</b> líneas del banco desde el <b>'+fd(ST.desde)+'</b> ('+ST.ficheros.join(' · ')+')'+
      '<div class="nimp-chips"><span class="ok">✓ '+ST.casadas.length+' ya estaban apuntadas'+(ST.nuevasMarcadas?' · '+ST.nuevasMarcadas+(ST.nuevasMarcadas===1?' marcada':' marcadas')+' ahora «comprobado»':'')+'</span>'+
      '<span class="nw">✚ '+ST.nuevas+' nuevas → a tu lista, en amarillo, para revisar</span><span class="tr">⇄ '+ST.traspasos.length+' traspasos</span>'+(ST.yaVistas?'<span class="vs">'+ST.yaVistas+' ya revisadas otras veces</span>':'')+'</div>'+
      '<div class="nimp-desde">Mirar desde el <input type="date" id="nImpDesde" value="'+ST.desde+'"> <button class="btn sm ghost" data-nimp="redo">volver a mirar</button></div></div>';
    if(ST.r4sin) h+='<div class="nimp-av">'+ST.r4sin+' recibo(s) a Renta 4 sin cotejar: elige también el extracto de patrimonio de R4 junto a los del banco y quedarán comprobados. Mientras, no cuentan como gasto.</div>';
    function plegable(id,tit,cuerpo){ return '<details class="nimp-det"'+(window['_nimpO'+id]?' open':'')+' data-nimpdet="'+id+'"><summary>'+tit+'</summary><div class="nimp-dl">'+cuerpo+'</div></details>'; }
    if(ST.casadas.length) h+=plegable('c','✓ Ya apuntadas por ti ('+ST.casadas.length+') · quedan marcadas «comprobado»',ST.casadas.map(function(x){ var l=x.l;
      return '<div><b>'+fd(l.f)+'</b> '+E(CTA[l.src])+' · '+E(l.txt.slice(0,48))+' <b>'+eu(l.imp)+'</b> → '+x.c.mov.map(function(m){ return E(m.concepto)+' ('+fd(m.fecha)+', '+eu(num(m.importe))+')'+(m.reemb?' <span class="nimp-rchip">↩ reembolsable</span>':''); }).join(' + ')+(x.c.suma?' <span class="muted">· suma</span>':'')+'</div>'; }).join(''));
    if(ST.traspasos.length) h+=plegable('t','⇄ Traspasos y anulaciones ('+ST.traspasos.length+') · no son gasto, no se apuntan',ST.traspasos.map(function(l){ return '<div><b>'+fd(l.f)+'</b> '+E(CTA[l.src])+' · '+E(l.txt.slice(0,48))+' <b>'+eu(l.imp)+'</b> → '+E(l._tr)+'</div>'; }).join(''));
    if(ST.sinExt.length) h+=plegable('s','ⓘ Apuntes tuyos sin reflejo en estos extractos ('+ST.sinExt.length+') · efectivo, cuentas de Susana o importes distintos',ST.sinExt.sort(function(a,b){ return a.fecha<b.fecha?-1:1; }).map(function(m){ return '<div><b>'+fd(m.fecha)+'</b> '+E(m.concepto)+' · '+E(m.titular)+' <b>'+eu((m.tipo==='ingreso'?1:-1)*num(m.importe))+'</b>'+(m.reemb?' <span class="nimp-rchip">↩ reembolsable</span>':'')+(m.conc?' <span class="muted">(ya marcado comprobado)</span>':'')+'</div>'; }).join(''));
    el.innerHTML=h;
  }

  /* ---------- subir ---------- */
  window.nImportarExtractos=function(){
    var inp=document.createElement('input'); inp.type='file'; inp.accept='.xls,.xlsx'; inp.multiple=true; inp.style.display='none'; document.body.appendChild(inp);
    inp.onchange=function(){ var fs=[].slice.call(inp.files||[]); inp.remove(); if(!fs.length) return; var s=document.getElementById('nImpMsg'); if(s) s.textContent='Leyendo '+fs.length+' fichero(s)…';
      cargarLib().then(function(){ return Promise.all(fs.map(function(f){ return f.arrayBuffer().then(function(b){ return leer(b,f.name); }); })); }).then(function(XS){ window.nImpProcesar(XS); }).catch(function(e){ if(s) s.textContent='✗ '+e.message; console.warn('[importar]',e); }); };
    inp.click();
  };
  window.nImpLeer=function(buf,nombre){ return leer(buf,nombre); };
  window.nImpProcesar=function(XS){ var s=document.getElementById('nImpMsg');
    var L=[], fic=[], r4=false, r4ing=[], porSrc={};
    XS.forEach(function(x){ if(x.tipo==='R4'){ r4=true; r4ing=r4ing.concat(x.r4||[]); fic.push('Renta 4 (para cotejar)'); return; } if(porSrc[x.tipo]) return; porSrc[x.tipo]=1; claves(x.lineas); L=L.concat(x.lineas); fic.push(CTA[x.tipo]+' ('+x.lineas.length+')'); });
    if(!L.length){ if(s) s.textContent=r4?'Con el extracto de R4 solo se cotejan los recibos: elígelo junto a los del banco.':'No había movimientos en esos ficheros.'; return; }
    var u0=(DB.bancoUltImport||''), desde=u0?addD(u0,-10):addD(hoy(),-92);
    ST={lineas:L,ficheros:fic,r4:r4,r4ing:r4ing,desde:desde};
    analizar(); if(!DB.bancoUltImport||ST.hasta>DB.bancoUltImport) DB.bancoUltImport=ST.hasta; pintar(); ult();
    if(s) s.textContent='';
  };
  window._nImpST=function(){ return ST; };

  /* ---------- montaje en Movimientos ---------- */
  function montar(){
    var V=document.getElementById('view-movimientos'); if(!V||document.getElementById('blkMovImp')) return;
    var add=document.getElementById('blkMovAdd'); if(!add) return;
    var b=document.createElement('div'); b.className='blk mv-blk open'; b.id='blkMovImp';
    b.innerHTML='<div class="blk-h" data-movblk="blkMovImp"><span class="blk-arw">▶</span><span class="blk-ic">🏦</span><div><div class="blk-t">Importar extractos del banco</div>'+
      '<div class="blk-sub">ING (cuenta y tarjeta), Santander y, para cotejar sus recibos, Renta 4: lo ya apuntado queda comprobado, lo nuevo entra en tu lista para revisar</div></div></div>'+
      '<div class="blk-b"><div class="nimp-top"><button class="btn" data-nimp="subir">⤓ Elegir los Excel del banco</button> <span id="nImpMsg" class="muted"></span>'+
      '<span class="nimp-ult muted" id="nImpUlt"></span></div><div id="nImpRes"></div></div>';
    add.parentNode.insertBefore(b,add);
    ult();
  }
  function ult(){ var u=document.getElementById('nImpUlt'); if(!u||typeof DB==='undefined'||!DB) return; var S=DB.bancoSaldos||{};
    u.innerHTML=(DB.bancoUltImport?'Última importación: hasta el '+fd(DB.bancoUltImport):'Aún no has importado ninguno')+
      (S.ING?' · saldo ING '+eu(S.ING.saldo)+' ('+fd(S.ING.fecha)+')':'')+(S.SAN?' · saldo Santander '+eu(S.SAN.saldo)+' ('+fd(S.SAN.fecha)+')':''); }

  /* ---------- eventos ---------- */
  var tSave=null; function guardarLuego(){ clearTimeout(tSave); tSave=setTimeout(function(){ if(typeof scheduleSave==='function') scheduleSave(); },1500); }
  document.addEventListener('click',function(e){
    var t=e.target, c=function(sel){ return t.closest&&t.closest(sel); };
    var a=c('[data-nimp]'); if(a){ var w=a.getAttribute('data-nimp');
      if(w==='subir') window.nImportarExtractos();
      else if(w==='redo'){ var d=document.getElementById('nImpDesde'); if(d&&d.value&&ST){ ST.desde=d.value; analizar(); pintar(); } }
      ult(); return; }
    var all=c('[data-npall]'); if(all){ var n=0; pend().slice().forEach(function(x){ if(completo(x)&&confirmar(x,true)) n++; }); rehacer(); return; }
    var no=c('[data-npno]'); if(no){ var x=pPorId(no.getAttribute('data-npno')); if(!x) return; vistos()[x.key]='i'+x.l.f.replace(/-/g,'').slice(2); DB.movPend=pend().filter(function(y){ return y!==x; }); rehacer(); return; }
    var sp=c('[data-npsp]'); if(sp){ var x2=pPorId(sp.getAttribute('data-npsp')); if(!x2) return; var q0=x2.parts[0]; x2.parts.push({f:q0.f,k:q0.k,co:'',d:'',c:'',t:q0.t,r:true,imp:0}); guardarLuego(); renderMovs(); return; }
    var rb=c('[data-nprb]'); if(rb){ var x3=pPorId(rb.getAttribute('data-np')), q=x3&&x3.parts[+rb.getAttribute('data-nj')]; if(!q) return; q.r=!q.r; guardarLuego(); renderMovs(); return; }
    var bx=c('[data-npx]'); if(bx){ var x4=pPorId(bx.getAttribute('data-np')); if(!x4) return; var qq=x4.parts.splice(+bx.getAttribute('data-nj'),1)[0]; x4.parts[0].imp=r2(num(x4.parts[0].imp)+num(qq.imp)); guardarLuego(); renderMovs(); return; }
    var dt=c('[data-nimpdet] > summary'); if(dt){ var id=dt.parentElement.getAttribute('data-nimpdet'); setTimeout(function(){ window['_nimpO'+id]=dt.parentElement.open; },0); }
  },true);
  function campo(e){ var t=e.target; if(!t.getAttribute) return;
    if(t.classList&&t.classList.contains('npCk')){ if(e.type!=='change') return; var x0=pPorId(t.getAttribute('data-npck')); if(!x0) return;
      if(t.checked){ if(confirmar(x0)) rehacer(); else t.checked=false; } return; }
    var f=t.getAttribute('data-nf'), id=t.getAttribute('data-np'); if(!f||!id) return; var x=pPorId(id), j=+t.getAttribute('data-nj'), q=x&&x.parts[j]; if(!q) return;
    if(f==='imp'){ q.imp=r2(num(t.value)); var P=x.parts; if(P.length>1){ var L=(j===P.length-1)?0:P.length-1, otras=P.reduce(function(a,z,k){ return k===L?a:a+num(z.imp); },0);
        P[L].imp=r2(Math.max(0,Math.abs(x.l.imp)-otras)); document.querySelectorAll('[data-np="'+id+'"][data-nj="'+L+'"][data-nf="imp"]').forEach(function(i){ i.value=P[L].imp.toFixed(2); });
        document.querySelectorAll('[data-npid="'+id+'"] .np-dif').forEach(function(d){ d.innerHTML=difTxt(x); }); } }
    else q[f]=t.value;
    /* lo mismo en la tabla y en la tarjeta del móvil */
    document.querySelectorAll('[data-np="'+id+'"][data-nj="'+j+'"][data-nf="'+f+'"]').forEach(function(i){ if(i!==t&&f!=='imp') i.value=t.value; });
    guardarLuego();
  }
  document.addEventListener('input',campo); document.addEventListener('change',campo);
  if(typeof renderMovs==='function'){ var o=renderMovs; renderMovs=function(){ var r=o.apply(this,arguments); try{ montar(); ult(); inyectar(); }catch(e){ console.warn('[pendientes]',e); } return r; }; }
  setTimeout(function(){ try{ montar(); if(document.getElementById('movTable')) inyectar(); }catch(e){} },1500);

  var st=document.createElement('style'); st.textContent=
    '#blkMovImp .nimp-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:8px}.nimp-ult{font-size:12px;flex-basis:100%}'+
    '.nimp-sum{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;font-size:13px;margin:6px 0 10px}'+
    '.nimp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.nimp-chips span{border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}'+
    '.nimp-chips .ok{background:#DCFCE7;color:#166534}.nimp-chips .nw{background:#FEF3C7;color:#92400E}.nimp-chips .tr{background:#F1F5F9;color:#475569}.nimp-chips .vs{background:#F8FAFC;color:#64748B}'+
    '.nimp-desde{margin-top:8px;font-size:12px;color:#475569}.nimp-desde input{font-size:12px;padding:2px 4px}'+
    '.nimp-av{background:#FEF3C7;color:#92400E;border-radius:8px;padding:6px 10px;font-size:12.5px;margin-bottom:8px}'+
    '.nimp-det{margin-top:8px;border:1px solid #E5E9EF;border-radius:10px;padding:6px 10px;background:#fff}.nimp-det summary{cursor:pointer;font-weight:700;font-size:13px}'+
    '.nimp-dl{font-size:12.5px;line-height:1.7;margin-top:6px;max-height:320px;overflow:auto}.nimp-rchip{background:#EDE9FE;color:#6D28D9;border-radius:999px;padding:0 7px;font-size:11px;font-weight:700}'+
    '.np-bar{background:#FFFBEB;border:1px solid #FCD34D;color:#78350F;border-radius:10px;padding:8px 12px;font-size:13px;margin:6px 0 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}'+
    'tr.npend td,tr.npend2 td{background:#FFFBEB}tr.npend td:first-child{box-shadow:inset 3px 0 #F59E0B}tr.npend2 td:first-child{box-shadow:inset 3px 0 #F59E0B}'+
    'tr.npend.reemb td,tr.npend2.reemb td{background:#F5F3FF}tr.npend.reemb td:first-child,tr.npend2.reemb td:first-child{box-shadow:inset 3px 0 #7C3AED}'+
    'tr.npend td{border-bottom:none!important;padding-top:6px!important;padding-bottom:2px!important}tr.npend2 td{padding-top:0!important;padding-bottom:8px!important;border-bottom:1px solid #FDE68A}'+
    '.np-in{font-size:12.5px;padding:4px 6px;border:1px solid #E2E8F0;border-radius:7px;background:#fff;width:100%;box-sizing:border-box;min-width:0}.np-in[disabled]{background:#EEF0F4;color:#94A3B8}'+
    '.np-f{max-width:132px}.np-imp{max-width:96px;text-align:right}.npCk{width:18px;height:18px;accent-color:#16A34A}'+
    '.np-l2{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px}.np-bk{color:#475569;flex:1 1 280px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.np-d{max-width:220px}'+
    '.np-nota{color:#B45309;font-size:11.5px;flex-basis:100%}.np-pt{color:#6D28D9;font-weight:700;font-size:12px}'+
    '.np-rb{border:1.5px solid #C4B5FD;background:#fff;color:#6D28D9;border-radius:999px;font-size:12px;font-weight:700;padding:3px 10px;cursor:pointer;white-space:nowrap}.np-rb.on{background:#7C3AED;border-color:#7C3AED;color:#fff}'+
    '.np-sp,.np-no{border:1px solid #E2E8F0;background:#fff;border-radius:8px;font-size:11.5px;color:#475569;padding:3px 8px;cursor:pointer;white-space:nowrap}.np-no:hover{background:#FEF2F2;color:#B91C1C}.np-sp:hover{background:#EFF6FF}'+
    '.np-x{border:none;background:none;color:#94A3B8;cursor:pointer;font-size:14px}.np-dif .ok{color:#15803D;font-weight:700}.np-dif .ko{color:#B91C1C;font-weight:700}'+
    '.mvc.npend{background:#FFFBEB;border:1px solid #FCD34D;border-left:4px solid #F59E0B;border-radius:12px;padding:10px;margin:6px 0}'+
    '.np-ch{display:flex;gap:8px;align-items:flex-start}.np-chm{flex:1;min-width:0;font-size:12.5px}.np-ch .imp{font-weight:800;white-space:nowrap}.np-ch .imp.neg{color:#B91C1C}.np-ch .imp.pos{color:#15803D}'+
    '.np-cp{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.np-cp .np-k{grid-column:1/-1}.np-cp .np-pt{grid-column:1/-1;display:flex;justify-content:space-between}.np-cp.reemb{background:#F5F3FF;border-radius:8px;padding:6px}'+
    '.np-cf{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap}';
  document.head.appendChild(st);
})();
