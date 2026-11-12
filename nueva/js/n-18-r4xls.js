/* APP NUEVA · Extracto de patrimonio de Renta 4 (el Excel «extractosPatrimonio…xls» del área de clientes). 29-oct-2026.
   Carlos: «yo descargo el excel de cuando en cuando y se pone todo bien; si en un mes no lo he hecho me lo pone en el panel
   de avisos para recordármelo y desde ahí actualizas fondo y caja bróker».
   Trae: movimientos de efectivo línea a línea (hoja «Saldo en Divisa»), participaciones y valor del Foncuenta («Fondos Inv.»),
   títulos de cada empresa («Bolsa Nac.») y el efectivo anotado y pendiente de anotar («Rdos.»).
   Solo lectura hasta la fase 3: lo leído se guarda en este navegador (espacio «nueva:»), no en los datos de Drive. */
(function(){
  var KEY='r4xls', LIB='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  function cargarLib(){ return new Promise(function(ok,ko){ if(window.XLSX) return ok(); var s=document.createElement('script'); s.src=LIB; s.onload=function(){ ok(); }; s.onerror=function(){ ko(new Error('no se pudo cargar el lector de Excel')); }; document.head.appendChild(s); }); }
  function iso(dmy){ var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(dmy||'').trim()); return m?m[3]+'-'+m[2]+'-'+m[1]:null; }
  function n(x){ if(typeof x==='number') return x; var s=String(x||'').replace(/\./g,'').replace(',','.'); var v=parseFloat(s); return isNaN(v)?null:v; }
  function filas(wb,nombre){ var ws=wb.Sheets[nombre]; return ws?XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''}):[]; }
  function leer(buf){
    var wb=XLSX.read(buf,{type:'array'}), out={leido:new Date().toISOString().slice(0,16),cash:[],acciones:[],fondo:null};
    var R=filas(wb,'Rdos.'), ini=null, fin=null;
    R.forEach(function(r){ var t=String(r[0]||''); var m=/desde (\d{2}\/\d{2}\/\d{4}) hasta (\d{2}\/\d{2}\/\d{4})/.exec(t); if(m){ ini=iso(m[1]); fin=iso(m[2]); }
      if(String(r[1]||'').trim()==='Saldo Anotado') out.anotado=n(r[3]); if(String(r[1]||'').trim()==='Saldo pendiente Anotar') out.pendiente=n(r[3]);
      if(String(r[0]||'').trim()==='Patrimonio Total') out.patrimonio=n(r[3]); });
    out.desde=ini; var _hoy=new Date().toISOString().slice(0,10); out.fecha=(fin&&fin>_hoy)?_hoy:fin;   /* R4 a veces pone el «hasta» en el futuro */
    /* valor del fondo al principio del periodo (fila «Cartera de Fondos» del resumen) y resultado del fondo (hoja Fondos) */
    var hdr=R.filter(function(r){ return String(r[0]||'').trim()==='PATRIMONIO TOTAL'; })[0], cf=R.filter(function(r){ return String(r[0]||'').trim()==='Cartera de Fondos'; })[0];
    if(hdr&&cf) out.fondoIni={fecha:iso(hdr[2]),valor:n(cf[2])||0};
    var C=filas(wb,'Saldo en Divisa');
    C.forEach(function(r){ var f=iso(r[0]); if(f&&String(r[1]||'').trim()) out.cash.push({fecha:f,concepto:String(r[1]).trim(),imp:n(r[2]),saldo:n(r[3])}); if(String(r[1]||'').trim()==='SALDO FINAL') out.saldoFinal=n(r[3]); });
    /* 5-nov-2026: R4 puede tener Foncuenta en dos sitios (Plan Easy y «Fondos de Inversión» aparte): se suman todas las líneas */
    filas(wb,'Fondos Inv.').forEach(function(r){ if(!/FONCUENTA/i.test(String(r[0]||''))) return; var f={nombre:String(r[0]).trim(),part:n(r[1]),valor:n(r[2]),resultado:n(r[3])};
      out.fondos=(out.fondos||[]).concat([f]); if(!out.fondo) out.fondo=f; else out.fondo={nombre:out.fondo.nombre,part:(out.fondo.part||0)+(f.part||0),valor:(out.fondo.valor||0)+(f.valor||0),resultado:(out.fondo.resultado||0)+(f.resultado||0)}; });
    filas(wb,'Bolsa Nac.').forEach(function(r){ var v=String(r[0]||'').trim(); if(!v||v==='VALOR'||v==='TOTAL'||(((DB&&DB.config&&DB.config.privado)||{}).titularR4||[]).indexOf(v)>=0) return;   /* la fila con el nombre del titular: sale de Drive, no del programa */ var t=n(r[1]); if(t!=null&&typeof r[1]==='number') out.acciones.push({nombre:v,titulos:t,valor:n(r[2])}); });
    if(!out.fecha||!out.fondo||!out.cash.length) throw new Error('no parece un extracto de patrimonio de Renta 4 (faltan las hojas de efectivo o de fondos)');
    if(out.anotado==null) out.anotado=out.saldoFinal; if(out.pendiente==null) out.pendiente=0;
    return out;
  }
  /* R4 da un Excel por año: se guardan todos (uno por periodo) y se juntan; el más reciente manda en fondo, acciones y efectivo */
  function todos(){ try{ var s=localStorage.getItem(KEY); var v=s?JSON.parse(s):[]; return Array.isArray(v)?v:(v?[v]:[]); }catch(e){ return []; } }
  window.nR4Xls=function(){
    var L=todos().sort(function(a,b){ return a.desde<b.desde?-1:1; }); if(!L.length) return null;
    var U=L.slice().sort(function(a,b){ return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:(a.desde<b.desde?1:-1)); }).pop(), P0=L[0], cash=[];
    /* 1-nov: extractos que se solapan traen las mismas líneas: cada línea cuenta una vez (si un día tiene dos iguales de verdad, se respetan las dos) */
    var mx={}, ej={}; L.forEach(function(x){ var c={}; (x.cash||[]).forEach(function(l){ var k=l.fecha+'|'+l.concepto+'|'+l.imp; c[k]=(c[k]||0)+1; if(!ej[k]) ej[k]=l; }); Object.keys(c).forEach(function(k){ mx[k]=Math.max(mx[k]||0,c[k]); }); });
    Object.keys(mx).forEach(function(k){ for(var i=0;i<mx[k];i++) cash.push(ej[k]); });
    cash.sort(function(a,b){ return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0); });
    return {fecha:U.fecha,desde:P0.desde,cash:cash,fondo:U.fondo,acciones:U.acciones,anotado:U.anotado,pendiente:U.pendiente,saldoFinal:U.saldoFinal,patrimonio:U.patrimonio,
            fondoIni:P0.fondoIni,fichero:L.map(function(x){ return x.desde.slice(0,4); }).filter(function(y,i,a){ return a.indexOf(y)===i; }).join(' + '),periodos:L.map(function(x){ return [x.desde,x.fecha]; })};
  };
  /* 1-nov-2026: el mismo extracto que entra por «Importar extractos del banco» (botón o Drive) pone al día Fondo R4 y Caja bróker */
  window.nR4XlsDesdeImport=function(buf,nombre){
    var x=leer(buf); x.fichero=nombre;
    var L=todos().filter(function(o){ return o.desde!==x.desde&&!(o.desde>=x.desde&&o.fecha<=x.fecha); }).concat([x]);   /* el que queda dentro del nuevo sobra */
    try{ localStorage.setItem(KEY,JSON.stringify(L)); }catch(e){}
    window._nR4XUlt=window.nR4Xls();
    try{ if(typeof renderCaja==='function') renderCaja(); if(typeof renderFondoR4==='function') renderFondoR4(); }catch(e){}
    return x; };
  window.nR4XlsSubir=function(){
    var i=document.createElement('input'); i.type='file'; i.accept='.xls,.xlsx'; i.multiple=true; i.style.display='none'; document.body.appendChild(i);
    i.onchange=function(){ var fs=[].slice.call(i.files||[]); i.remove(); if(!fs.length) return; var msg=document.getElementById('nR4XMsg'); if(msg) msg.textContent='Leyendo '+fs.length+' fichero(s)…';
      cargarLib().then(function(){ return Promise.all(fs.map(function(f){ return f.arrayBuffer().then(function(b){ var x=leer(b); x.fichero=f.name; return x; }); })); }).then(function(XS){
        var L=todos().filter(function(o){ return !XS.some(function(x){ return x.desde===o.desde; }); }).concat(XS);   /* el mismo periodo subido otra vez sustituye al anterior */
        try{ localStorage.setItem(KEY,JSON.stringify(L)); }catch(e){} var X=window.nR4Xls(); window._nR4XUlt=X;
        if(typeof renderCaja==='function') renderCaja(); if(typeof renderFondoR4==='function') renderFondoR4(); var m2=document.getElementById('nR4XMsg'); if(m2) m2.textContent='✓ '+XS.length+' extracto(s) leído(s). Tienes de '+X.fichero+', hasta el '+X.fecha.split('-').reverse().join('/')+': '+X.cash.length+' movimientos.'; })
      .catch(function(e){ var m3=document.getElementById('nR4XMsg'); if(m3) m3.textContent='✗ '+e.message; }); };
    i.click();
  };
  /* Clasifica las líneas de efectivo en hechos: una entrada fija, un dividendo con su comisión e IVA, una compra con su ITF… */
  window.nR4Hechos=function(X,desde){
    var H=[], last=null;
    (X&&X.cash||[]).forEach(function(l){ if(desde&&!(l.fecha>desde)) return; var c=l.concepto.toUpperCase(), m;
      if(/RENTA 4 FONCUENTA/.test(c)){ if(/^RETENCION/.test(c)){ H.push({fecha:l.fecha,tipo:'retfondo',imp:l.imp,txt:'Retención a cuenta al vender fondo (se recupera en la renta)'}); } last=null; return; }
      if(/^INGRESO RECIBO/.test(c)){ H.push(last={fecha:l.fecha,tipo:'fija',imp:l.imp,txt:'Ingreso recibo'}); return; }
      if(/^TRANSF\. RECIBIDA/.test(c)){ H.push(last={fecha:l.fecha,tipo:'puntual',imp:l.imp,txt:'Transferencia recibida'}); return; }
      if((m=/^DIVIDENDO DE (\d+) (.+)$/.exec(c))){ H.push(last={fecha:l.fecha,tipo:'div',imp:l.imp,txt:'Dividendo '+m[2].trim(),nombre:m[2].trim(),acc:+m[1]}); return; }
      if(/^(COMISION DVDO|IVA DIVIDENDO)/.test(c)&&last&&last.tipo==='div'&&last.fecha===l.fecha){ last.imp+=l.imp; return; }
      if((m=/^COMPRA DE (\d+) (\S+) A /.exec(c))){ H.push(last={fecha:l.fecha,tipo:'compra',imp:l.imp,txt:'Compra '+m[1]+' '+m[2],tk:m[2],acc:+m[1]}); return; }
      if((m=/^VENTA DE (\d+) (\S+) A /.exec(c))){ H.push(last={fecha:l.fecha,tipo:'venta',imp:l.imp,txt:'Venta '+m[1]+' '+m[2],tk:m[2],acc:+m[1]}); return; }
      if(/^RETENCION VENT DCHOS/.test(c)&&last&&last.tipo==='venta'&&last.fecha===l.fecha){ last.imp+=l.imp; last.txt+=' (neto de retención)'; return; }   /* venta de derechos: su retención va con ella */
      if(/^ITF /.test(c)&&last&&(last.tipo==='compra'||last.tipo==='venta')&&last.fecha===l.fecha){ last.imp+=l.imp; return; }
      if(/CUSTODIA/.test(c)){ var u=H.filter(function(h){ return h.tipo==='custodia'&&h.fecha===l.fecha; })[0]; if(u) u.imp+=l.imp; else H.push(last={fecha:l.fecha,tipo:'custodia',imp:l.imp,txt:'Custodia R4'}); return; }
      H.push(last={fecha:l.fecha,tipo:'otro',imp:l.imp,txt:l.concepto});
    });
    /* comisión e IVA de un dividendo pueden venir separados de su línea (27-jul: dos dividendos y luego sus comisiones): se reparten por nombre */
    return H;
  };
  /* Aviso del Panel: más de 31 días sin subir el extracto */
  window.nR4XlsAviso=function(){
    var X=window.nR4Xls(), hoy=new Date(), d=X?Math.round((hoy-new Date(X.fecha+'T12:00:00'))/864e5):null;
    if(X&&d<=31) return null;
    return {key:'r4xls-'+hoy.toISOString().slice(0,7),cls:'a',tipo:'hogar',goto:'caja',
      txt:'🏦 <b>Renta 4</b> — '+(X?'hace '+d+' días que no subes el extracto de patrimonio (el último, del '+X.fecha.split('-').reverse().join('/')+')':'sube el extracto de patrimonio de Renta 4')+'. Pon al día el Fondo R4 y la caja del bróker desde Caja bróker → «Subir extracto de R4».'};
  };
})();
