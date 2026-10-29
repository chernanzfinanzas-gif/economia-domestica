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
    out.desde=ini; out.fecha=fin;
    /* valor del fondo al principio del periodo (fila «Cartera de Fondos» del resumen) y resultado del fondo (hoja Fondos) */
    var hdr=R.filter(function(r){ return String(r[0]||'').trim()==='PATRIMONIO TOTAL'; })[0], cf=R.filter(function(r){ return String(r[0]||'').trim()==='Cartera de Fondos'; })[0];
    if(hdr&&cf) out.fondoIni={fecha:iso(hdr[2]),valor:n(cf[2])||0};
    var C=filas(wb,'Saldo en Divisa');
    C.forEach(function(r){ var f=iso(r[0]); if(f&&String(r[1]||'').trim()) out.cash.push({fecha:f,concepto:String(r[1]).trim(),imp:n(r[2]),saldo:n(r[3])}); if(String(r[1]||'').trim()==='SALDO FINAL') out.saldoFinal=n(r[3]); });
    filas(wb,'Fondos Inv.').forEach(function(r){ if(/FONCUENTA/i.test(String(r[0]||''))) out.fondo={nombre:String(r[0]).trim(),part:n(r[1]),valor:n(r[2]),resultado:n(r[3])}; });
    filas(wb,'Bolsa Nac.').forEach(function(r){ var v=String(r[0]||'').trim(); if(!v||v==='VALOR'||v==='TOTAL'||v==='CARLOS HERNANZ BLAZQUEZ') return; var t=n(r[1]); if(t!=null&&typeof r[1]==='number') out.acciones.push({nombre:v,titulos:t,valor:n(r[2])}); });
    if(!out.fecha||!out.fondo||!out.cash.length) throw new Error('no parece un extracto de patrimonio de Renta 4 (faltan las hojas de efectivo o de fondos)');
    if(out.anotado==null) out.anotado=out.saldoFinal; if(out.pendiente==null) out.pendiente=0;
    return out;
  }
  /* R4 da un Excel por año: se guardan todos (uno por periodo) y se juntan; el más reciente manda en fondo, acciones y efectivo */
  function todos(){ try{ var s=localStorage.getItem(KEY); var v=s?JSON.parse(s):[]; return Array.isArray(v)?v:(v?[v]:[]); }catch(e){ return []; } }
  window.nR4Xls=function(){
    var L=todos().sort(function(a,b){ return a.desde<b.desde?-1:1; }); if(!L.length) return null;
    var U=L[L.length-1], P0=L[0], cash=[];
    L.forEach(function(x){ (x.cash||[]).forEach(function(l){ cash.push(l); }); });
    cash.sort(function(a,b){ return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0); });
    return {fecha:U.fecha,desde:P0.desde,cash:cash,fondo:U.fondo,acciones:U.acciones,anotado:U.anotado,pendiente:U.pendiente,saldoFinal:U.saldoFinal,patrimonio:U.patrimonio,
            fondoIni:P0.fondoIni,fichero:L.map(function(x){ return x.desde.slice(0,4); }).join(' + '),periodos:L.map(function(x){ return [x.desde,x.fecha]; })};
  };
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
