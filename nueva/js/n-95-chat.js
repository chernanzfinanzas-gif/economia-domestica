/* APP NUEVA · Preguntar a Claude desde la app (2-nov-2026, Carlos: «preparar el chat para preguntarte cosas desde la app y
   aprovechar los 100 € de saldo del plan»).
   · Usa los créditos de API del plan Max (100 $/mes, caducan cada mes) con una clave de la Consola de Claude.
   · La clave la pega Carlos UNA vez en cada aparato y se queda SOLO en ese aparato (localStorage). Nunca va a Drive ni al repo.
   · Modelo: Claude Opus 5.5. Ve el método (lo publicado en el repo) y, desde el 2-nov, la cartera (herramienta mi_cartera): resumen de las 35, fichas, hallazgos, decisiones,
     estado del método, calendario, novedades y coyuntura. No ve movimientos, cartera ni nada del hogar.
   · Claude pide él mismo lo que necesita (herramientas): ficha de una empresa por apartados, hallazgos, decisiones,
     calendario, novedades. Así cada pregunta solo paga lo que usa.
   · Debajo de cada respuesta: lo que ha costado y lo gastado este mes en este aparato. */
(function(){
  var MODELO='claude-opus-5-5', PRECIO={in:4,out:20,cw:5,cr:0.2};   /* $ por millón de tokens (precios oficiales, 2-nov-2026) */
  var KK='kh-claude-key', KH='kh-claude-hist', KG='kh-claude-gasto', KC='kh-claude-cad', URLK='https://platform.claude.com/settings/keys';
  function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){ return null; } }
  function E(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var cache={};
  function json(ruta){ if(cache[ruta]) return Promise.resolve(cache[ruta]);
    return fetch(ruta,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error(ruta+' '+r.status); return r.json(); }).then(function(d){ cache[ruta]=d; return d; }); }
  function corta(o,n){ var s=JSON.stringify(o); return s.length>n?s.slice(0,n)+' …[recortado]':s; }
  /* ---------------- herramientas: lo que Claude puede pedir ---------------- */
  var APARTADOS=['tesis','juicio_tesis','scoring','valoracion','riesgos','juicio_riesgos','comparativa','juicio_comparativa','vigilancia','juicio_vigilancia','series','seguridad_dividendo','perfil','diario','semanal','matriz','juicios','modelo','modulos'];
  var TOOLS=[
    {name:'ficha',description:'Ficha del Método KH v3 de una de las 35 empresas analizadas. Pide solo los apartados que necesites: tesis (decisión, PO bear/base/bull, banda de entrada, stop, vetos), juicio_tesis, scoring, valoracion, riesgos y juicio_riesgos (mapa de riesgos y pre-mortem), comparativa, vigilancia y juicio_vigilancia (semáforos, señales, notas de cada periodo), series (cifras históricas por año), seguridad_dividendo, perfil (contexto de la empresa), diario (decisiones de Carlos), semanal (último informe semanal), matriz, juicios.',
     input_schema:{type:'object',properties:{ticker:{type:'string',description:'Ticker, p. ej. LOG, SAN, IBE'},apartados:{type:'array',items:{type:'string',enum:APARTADOS}}},required:['ticker','apartados']}},
    {name:'hallazgos',description:'Hechos societarios vigilados (OPA, litigios, sanciones, salto de mercado, coyuntura de la semana…) de hallazgos.json. Con ticker, los de esa empresa (también las del universo no analizadas); sin ticker, los activos de todas.',
     input_schema:{type:'object',properties:{ticker:{type:'string'}}}},
    {name:'decisiones',description:'Decisiones aprobadas por Carlos sobre señales (REAFIRMAR, AJUSTA PO, REBAJA, VENDE) con su motivo y fecha. Con ticker, solo esa empresa.',
     input_schema:{type:'object',properties:{ticker:{type:'string'}}}},
    {name:'agenda',description:'Calendario de publicación de resultados, histórico de fechas de resultados, anuncios de dividendo y novedades recogidas de la CNMV.',
     input_schema:{type:'object',properties:{que:{type:'string',enum:['calendario','historico_resultados','anuncios_dividendo','novedades']},ticker:{type:'string'}},required:['que']}},
    {name:'mi_cartera',description:'La cartera de Carlos según su app (carteras Propia y Compartida): posiciones con acciones, precio medio (con comisión de compra), cotización, valor, plusvalía y peso. Con ticker, añade sus operaciones (compras y ventas) y los dividendos cobrados de ese valor.',
     input_schema:{type:'object',properties:{ticker:{type:'string'}}}}
  ];
  function filtraTk(o,tk){ if(!tk) return o; tk=String(tk).toUpperCase(); var s=JSON.stringify(o);
    if(Array.isArray(o)) return o.filter(function(x){ return JSON.stringify(x).toUpperCase().indexOf('"'+tk+'"')>=0; });
    if(o&&typeof o==='object'){ var r={}; Object.keys(o).forEach(function(k){ var v=o[k];
      if(k.toUpperCase()===tk) r[k]=v; else if(Array.isArray(v)) { var f=v.filter(function(x){ return JSON.stringify(x).toUpperCase().indexOf('"'+tk+'"')>=0; }); if(f.length) r[k]=f; }
      else if(v&&typeof v==='object'&&v[tk]) { r[k]={}; r[k][tk]=v[tk]; } }); return r; }
    return o; }
  function usar(t,inp){
    inp=inp||{};
    if(t==='ficha'){ var tk=String(inp.ticker||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
      return json('fichas/'+tk+'.json').then(function(F){ var o={ticker:tk,empresa:F.empresa,generado:F.generado,datos_hasta:F.datos_hasta,ultimo_ejercicio:F.ultimo_ejercicio};
        (inp.apartados||['tesis']).forEach(function(a){ if(APARTADOS.indexOf(a)>=0&&F[a]!==undefined) o[a]=F[a]; }); return corta(o,40000); })
        .catch(function(){ return 'No hay ficha de '+tk+': no es una de las 35 analizadas del método.'; }); }
    if(t==='hallazgos') return json('hallazgos.json').then(function(H){ var tk=inp.ticker&&String(inp.ticker).toUpperCase(), out={};
      Object.keys(H.empresas||{}).forEach(function(k){ if(tk&&k!==tk) return; var e=H.empresas[k], a=(e.hallazgos||[]).filter(function(h){ return tk||h.estado==='activa'; });
        if(a.length) out[k]={empresa:e.empresa,cobertura:e.cobertura,hallazgos:a.map(function(h){ return {tipo:h.tipo,estado:h.estado,severidad:h.severidad,fecha:h.fecha,resumen:h.resumen,fuente:h.fuente,ultimaNovedad:h.ultimaNovedad}; })}; });
      return corta({generadoEl:H.generadoEl,empresas:out},30000); });
    if(t==='decisiones') return json('recogida/decisiones-v3.json').then(function(D){ return corta(filtraTk(D,inp.ticker),40000); });
    if(t==='agenda'){ var R={calendario:'recogida/calendario.json',historico_resultados:'recogida/historico-resultados.json',anuncios_dividendo:'recogida/anuncios-dividendo.json',novedades:'recogida/novedades.json'}[inp.que];
      if(!R) return Promise.resolve('Apartado desconocido');
      return json(R).then(function(D){ return corta(filtraTk(D,inp.ticker),40000); }); }
    if(t==='mi_cartera') return Promise.resolve(cartera(inp.ticker));
    return Promise.resolve('Herramienta desconocida');
  }
  /* 2-nov (Carlos: «que vea mi cartera»): posiciones, y por valor sus operaciones y dividendos. Nada del hogar. */
  function r2(x){ return Math.round((+x||0)*100)/100; }
  function cartera(tk){ try{
    var P=(typeof _mcPosiciones==='function')?_mcPosiciones():[], tot=P.reduce(function(a,p){ return a+(+p.valor||0); },0);
    var o={fecha:new Date().toISOString().slice(0,10),valor_total:r2(tot),posiciones:P.map(function(p){ return {ticker:p.ticker,nombre:p.nombre,acciones:r2(p.acc),precio_medio:r2(p.pmedio),cotizacion:r2(p.cot),valor:r2(p.valor),coste:r2(p.coste),plusvalia:r2(p.pl),plusvalia_pct:r2(p.plPct),peso_pct:tot?r2(p.valor/tot*100):0,carteras:p.carteras}; })};
    if(tk){ tk=String(tk).toUpperCase();
      o.operaciones=(DB.operaciones||[]).filter(function(x){ return String(x.ticker||'').toUpperCase()===tk; }).map(function(x){ return {fecha:x.fecha,tipo:x.tipo,acciones:x.acciones,precio:x.precio,cartera:x.cartera||'Propia',broker:x.broker||x.cuenta||''}; });
      o.dividendos=((DB.dividendos||{})[tk]||[]).slice(-16).map(function(d){ var c={}; ['fecha','fechaPago','exDate','importe','bruto','neto','acciones','tipo','cartera'].forEach(function(k){ if(d[k]!=null) c[k]=d[k]; }); return c; }); }
    return corta(o,40000); }catch(e){ return 'No he podido leer la cartera: '+e.message; } }
  /* ---------------- contexto fijo (va en caché) ---------------- */
  function contexto(){
    return Promise.all([json('fichas/_resumen.json').catch(function(){return null;}),json('recogida/estado-v3.json').catch(function(){return null;}),json('macro.json').catch(function(){return null;})]).then(function(r){
      var res=r[0], E35=(res&&res.empresas)||[]; if(!Array.isArray(E35)) E35=Object.keys(E35).map(function(k){ return Object.assign({ticker:k},E35[k]); });
      var lin=E35.map(function(e){ return [e.ticker,e.empresa,e.decision,'PO '+[e.po_bear,e.po_base,e.po_bull].map(function(x){ return x==null?'—':(+x).toFixed(2); }).join('/'),'entrada '+(e.entrada_min!=null?(+e.entrada_min).toFixed(2)+'–'+(+e.entrada_max).toFixed(2):'—'),'stop '+(e.stop!=null?(+e.stop).toFixed(2):'—'),'rating '+(e.rating||'—'),'moat '+(e.moat||'—'),'semáforo '+(e.semaforo||'—'),'revisado '+(e.revisado_hasta||'—'),e.frase||''].join(' · '); }).join('\n');
      var est=r[1]?{generado:r[1].generado,revisiones_pendientes:(r[1].revisiones_pendientes||[]).map(function(x){ return {carpeta:x.carpeta,ticker:x.ticker,tipo:x.tipo,senales:x.senales,propuesta:x.propuesta}; })}:null;
      return 'RESUMEN DE LAS 35 EMPRESAS ANALIZADAS (fichas/_resumen.json, '+((res&&res.generado)||'')+'):\n'+lin+
        '\n\nESTADO DEL MÉTODO (revisiones pendientes):\n'+JSON.stringify(est)+
        '\n\nCOYUNTURA (macro.json):\n'+corta(r[2],12000); });
  }
  function sistema(){ var hoy=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return 'Eres Claude, el analista del Método KH v3 de Carlos (inversor particular, bolsa española), dentro de su app Economía Doméstica. Hoy es '+hoy+'.\n'+
      'Reglas: contesta en castellano llano y corto, con cifras y tablas cuando ayuden y sin jerga técnica. Toda cifra sale de los datos del método (el resumen de abajo o lo que pidas con las herramientas): nunca la inventes ni la estimes; si no está, dilo. Di de dónde sale cada dato importante (p. ej. «ficha de LOG, valoración»). Pide a las herramientas solo los apartados que necesites. Su cartera la ves con la herramienta mi_cartera (posiciones, y por valor sus operaciones y dividendos); úsala cuando la pregunta trate de lo que tiene. No ves sus movimientos bancarios ni sus finanzas del hogar: si la pregunta los necesita, dilo. Carlos sabe que no eres asesor; no hace falta repetirlo. Las decisiones del método (COMPRAR, MANTENER, ESPERAR, REDUCIR, VENDER) y los PO son los que dicen los datos; si crees que algo merece revisión, dilo y explica por qué, pero no cambies nada. Si te pide qué haría en un caso (comprar, esperar, vender, reforzar), razónalo con las reglas del método —banda de entrada, stop, PO, señales, riesgos y su señal de alarma— y da una opinión clara, separando lo que dicen los datos de tu juicio. Si te pide un resumen de una empresa, consulta su ficha y escríbelo por apartados: negocio, decisión y precios, valoración, riesgos, vigilancia y qué mirar ahora.'; }
  /* ---------------- llamada a la API ---------------- */
  /* 2-nov (Carlos: «quiero guardar las conversaciones para tener un archivo de lo consultado»): cada conversación se guarda
     en sus datos de Drive (DB.chatClaude), igual que el resto de la app, y se ve en todos los aparatos. Nada se borra de
     verdad: «borrar» la marca como borrada (así no reaparece al juntar con otro aparato). */
  var KA='kh-claude-actual';
  function hayDB(){ return typeof DB!=='undefined'&&DB&&typeof DB==='object'; }
  function archivo(){ if(!hayDB()) return (window._kcSinDB=window._kcSinDB||[]); DB.chatClaude=DB.chatClaude||[];
    try{ var viejo=JSON.parse(ls(KH)||'[]'); if(viejo.length){ DB.chatClaude.push({id:'cc'+Date.now().toString(36),titulo:String((viejo.filter(function(m){ return m.role==='user'; })[0]||{}).content||'Conversación').slice(0,80),creada:new Date(viejo[0].t||Date.now()).toISOString(),actualizada:new Date().toISOString(),mensajes:viejo}); ls(KH,null); salvar(); } }catch(e){}
    return DB.chatClaude; }
  function vivas(){ return archivo().filter(function(c){ return c&&!c.borrada; }); }
  function actual(){ var id=ls(KA); return id?vivas().filter(function(c){ return c.id===id; })[0]||null:null; }
  var hist=[];
  function sincroniza(){ var c=actual(); hist=c?c.mensajes:[]; }
  function nueva(primera){ var c={id:'cc'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),titulo:String(primera||'Conversación').replace(/\s+/g,' ').slice(0,80),creada:new Date().toISOString(),actualizada:new Date().toISOString(),mensajes:[]};
    archivo().push(c); ls(KA,c.id); hist=c.mensajes; return c; }
  function salvar(){ try{ if(hayDB()&&typeof scheduleSave==='function') scheduleSave(); }catch(e){} }
  function guardar(){ var c=actual(); if(c){ c.actualizada=new Date().toISOString(); c.coste=Math.round(c.mensajes.reduce(function(a,m){ return a+(+m.coste||0); },0)*10000)/10000; c.n=c.mensajes.filter(function(m){ return m.role==='user'; }).length; } salvar(); }
  function mes(){ return new Date().toISOString().slice(0,7); }
  function gasto(add){ var g={}; try{ g=JSON.parse(ls(KG)||'{}'); }catch(e){} if(add){ g[mes()]=(g[mes()]||0)+add; ls(KG,JSON.stringify(g)); } return g[mes()]||0; }
  function coste(u){ return ((u.input_tokens||0)*PRECIO.in+(u.output_tokens||0)*PRECIO.out+(u.cache_creation_input_tokens||0)*PRECIO.cw+(u.cache_read_input_tokens||0)*PRECIO.cr)/1e6; }
  function api(body){ var k=ls(KK);
    return fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)})
      .then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error((j&&j.error&&j.error.message)||('Error '+r.status)); return j; }); }); }
  var ocupado=false;
  async function preguntar(texto){
    if(ocupado) return; ocupado=true; sincroniza(); if(!actual()) nueva(texto);
    var conv=hist.filter(function(m){ return m.role; }).slice(-12).map(function(m){ return {role:m.role,content:m.content}; });
    conv.push({role:'user',content:texto}); hist.push({role:'user',content:texto,t:Date.now()}); pintar(); estado('Claude está pensando…');
    var total=0, usados=[];
    try{
      var ctx=await contexto();
      var sys=[{type:'text',text:sistema()},{type:'text',text:ctx,cache_control:{type:'ephemeral'}}];
      for(var i=0;i<8;i++){
        var envio=conv.map(function(m,ix){ if(ix!==conv.length-1) return m; var c=typeof m.content==='string'?[{type:'text',text:m.content}]:m.content.slice();
          var u=c.length-1; c[u]=Object.assign({},c[u],{cache_control:{type:'ephemeral'}}); return {role:m.role,content:c}; });
        var R=await api({model:MODELO,max_tokens:4000,system:sys,tools:TOOLS,messages:envio});
        total+=coste(R.usage||{});
        conv.push({role:'assistant',content:R.content});
        var tu=(R.content||[]).filter(function(c){ return c.type==='tool_use'; });
        if(R.stop_reason!=='tool_use'||!tu.length){
          var txt=(R.content||[]).filter(function(c){ return c.type==='text'; }).map(function(c){ return c.text; }).join('\n\n');
          gasto(total); hist.push({role:'assistant',content:txt||'(sin respuesta)',t:Date.now(),coste:total,usados:usados}); guardar(); break; }
        estado('Consultando '+tu.map(function(c){ return c.name+(c.input&&c.input.ticker?' '+c.input.ticker:''); }).join(', ')+'…');
        var res=await Promise.all(tu.map(function(c){ usados.push(c.name+(c.input&&c.input.ticker?' '+String(c.input.ticker).toUpperCase():'')+(c.input&&c.input.apartados?' ('+c.input.apartados.join(', ')+')':'')); return usar(c.name,c.input).then(function(s){ return {type:'tool_result',tool_use_id:c.id,content:String(s)}; }); }));
        conv.push({role:'user',content:res});
        if(i===7){ gasto(total); hist.push({role:'assistant',content:'He necesitado demasiadas consultas para esta pregunta. Prueba a concretarla un poco más.',t:Date.now(),coste:total}); guardar(); }
      }
    }catch(e){ if(total) gasto(total); hist.push({role:'aviso',content:'No ha podido contestar: '+e.message+(/credit balance/i.test(e.message)?' — se han acabado los créditos de este mes.':/x-api-key|authentication|invalid/i.test(e.message)?' — revisa la clave (⚙).':''),t:Date.now()}); guardar(); }
    ocupado=false; estado(''); pintar(); var ult=hist[hist.length-1]; if(ult&&ult.role==='aviso'&&/clave/.test(ult.content)) cfg(true); }
  /* ---------------- pantalla ---------------- */
  function inl(t){ return t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<i>$2</i>').replace(/`([^`]+)`/g,'<code>$1</code>'); }
  function md(s){ var L=E(s).split('\n'), o=[], i=0, par=[];
    function cierra(){ if(par.length){ o.push('<p>'+inl(par.join('<br>'))+'</p>'); par=[]; } }
    while(i<L.length){ var l=L[i];
      if(/^\s*\|.*\|\s*$/.test(l)&&L[i+1]&&/^\s*\|[-:| ]+\|\s*$/.test(L[i+1])){ cierra(); var cel=function(r){ return r.trim().replace(/^\||\|$/g,'').split('|').map(function(c){ return inl(c.trim()); }); };
        var h='<table><tr>'+cel(l).map(function(c){ return '<th>'+c+'</th>'; }).join('')+'</tr>'; i+=2;
        while(i<L.length&&/^\s*\|.*\|\s*$/.test(L[i])){ h+='<tr>'+cel(L[i]).map(function(c){ return '<td>'+c+'</td>'; }).join('')+'</tr>'; i++; }
        o.push(h+'</table>'); continue; }
      if(/^\s*[-•*] /.test(l)){ cierra(); var u='<ul>'; while(i<L.length&&/^\s*[-•*] /.test(L[i])){ u+='<li>'+inl(L[i].replace(/^\s*[-•*] /,''))+'</li>'; i++; } o.push(u+'</ul>'); continue; }
      if(/^\s*\d+[.)] /.test(l)){ cierra(); var n='<ol>'; while(i<L.length&&/^\s*\d+[.)] /.test(L[i])){ n+='<li>'+inl(L[i].replace(/^\s*\d+[.)] /,''))+'</li>'; i++; } o.push(n+'</ol>'); continue; }
      if(/^#{1,4} /.test(l)){ cierra(); o.push('<div class="kc-h">'+inl(l.replace(/^#{1,4} /,''))+'</div>'); i++; continue; }
      if(!l.trim()){ cierra(); i++; continue; }
      par.push(l); i++; }
    cierra(); return o.join(''); }
  function panel(){ var P=document.getElementById('kcPanel'); if(P) return P;
    P=document.createElement('div'); P.id='kcPanel'; P.innerHTML='<div class="kc-top"><b>💬 Pregúntale a Claude</b><span class="kc-sub">Opus 5.5 · ve el método y tu cartera</span><button data-kc="cfg" title="Clave de API">⚙</button><button data-kc="archivo" title="Conversaciones guardadas">📁</button><button data-kc="nuevo" title="Conversación nueva">＋</button><button data-kc="x">✕</button></div><div class="kc-cfg"></div><div class="kc-tit"></div><div class="kc-msgs"></div><div class="kc-st"></div><form class="kc-in"><textarea rows="2" placeholder="Pregunta sobre tus empresas, el método, las señales…"></textarea><button type="submit">Enviar</button></form>';
    document.body.appendChild(P);
    P.addEventListener('click',function(e){ var b=e.target.closest('[data-kc]'); if(!b) return; var a=b.getAttribute('data-kc');
      if(a==='x') P.classList.remove('open'); else if(a==='cfg') cfg(true); else if(a==='nuevo'){ ls(KA,null); hist=[]; verArchivo=false; pintar(); P.querySelector('textarea').focus(); }
      else if(a==='archivo'){ verArchivo=!verArchivo; pintar(); }
      else if(a==='abrirc'){ ls(KA,b.getAttribute('data-id')); sincroniza(); verArchivo=false; pintar(); }
      else if(a==='borrarc'){ var c=archivo().filter(function(x){ return x.id===b.getAttribute('data-id'); })[0]; if(c&&confirm('¿Borrar la conversación «'+c.titulo+'»?')){ c.borrada=true; c.mensajes=[]; c.actualizada=new Date().toISOString(); if(ls(KA)===c.id){ ls(KA,null); hist=[]; } salvar(); pintar(); } }
      else if(a==='guardar'){ var v=P.querySelector('.kc-cfg input').value.trim(), dd=P.querySelector('.kc-cfg select').value; if(v){ ls(KK,v); var f=null; if(/^\d+$/.test(dd)){ f=new Date(Date.now()+(+dd)*86400000).toISOString().slice(0,10); } else if(dd==='fecha'){ f=P.querySelector('.kc-cfg input[type=date]').value||null; } ls(KC,f||null); } cfg(false); pintar(); }
      else if(a==='borrar'){ ls(KK,null); cfg(true); }
      else if(a==='ej'){ P.querySelector('textarea').value=b.textContent; P.querySelector('textarea').focus(); } });
    P.querySelector('form').addEventListener('submit',function(e){ e.preventDefault(); var t=P.querySelector('textarea'), v=t.value.trim(); if(!v) return; if(!ls(KK)){ cfg(true); return; } t.value=''; preguntar(v); });
    P.querySelector('textarea').addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); P.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true})); } });
    return P; }
  function cfg(abrir){ var C=document.querySelector('#kcPanel .kc-cfg'); if(!abrir){ C.style.display='none'; return; }
    var k=ls(KK); C.style.display='block';
    C.innerHTML='<div class="kc-cfgt">Clave de la API de Claude (Consola, con los créditos de API de tu plan). Se guarda solo en este aparato; no va a Drive ni al repositorio.</div>'+
      (k?'<div>Clave guardada: <code>'+E(k.slice(0,10))+'…'+E(k.slice(-4))+'</code> <button data-kc="borrar">Quitarla</button></div>':'')+
      '<input type="password" placeholder="sk-ant-…" autocomplete="off"><div class="kc-cad">Caduca: <select><option value="365">dentro de 1 año</option><option value="30">dentro de 30 días</option><option value="7">dentro de 7 días</option><option value="fecha">en esta fecha…</option><option value="nunca">nunca</option></select> <input type="date"></div><button data-kc="guardar">Guardar</button>'+
      '<div class="kc-cfgt" style="margin-top:6px">Para crear una clave nueva: <a href="'+URLK+'" target="_blank" rel="noopener">platform.claude.com › Claves de API</a> → «Crear clave», cópiala y pégala aquí.</div>'; }
  function diasCad(){ var f=ls(KC); if(!f) return null; return Math.ceil((Date.parse(f+'T23:59:59')-Date.now())/86400000); }
  function avisoCad(){ var d=diasCad(); if(d==null||!ls(KK)) return ''; if(d<0) return '<div class="kc-renov">🔑 Tu clave caducó el '+E(ls(KC))+'. Crea otra en <a href="'+URLK+'" target="_blank" rel="noopener">platform.claude.com</a> y pégala en <button data-kc="cfg">⚙ Clave</button></div>';
    if(d<=7) return '<div class="kc-renov">🔑 Tu clave caduca '+(d===0?'hoy':'en '+d+' día'+(d===1?'':'s'))+' ('+E(ls(KC))+'). Crea otra en <a href="'+URLK+'" target="_blank" rel="noopener">platform.claude.com</a> y pégala en <button data-kc="cfg">⚙ Clave</button></div>'; return ''; }
  function estado(t){ var s=document.querySelector('#kcPanel .kc-st'); if(s) s.textContent=t; }
  var EJ=['¿Qué empresas de las 35 están ahora en zona de compra?','¿Por qué Logista está en ESPERAR y qué tendría que pasar para comprar?','Resúmeme los riesgos de Santander y cuál vigilar esta semana','¿Qué hallazgos importantes hay esta semana en el universo?','De lo que tengo en cartera, ¿qué está por encima de su PO y qué haría el método?'];
  var verArchivo=false;
  function fechaC(iso){ try{ var d=new Date(iso); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
  function costeC(c){ return (c.mensajes||[]).reduce(function(a,m){ return a+(+m.coste||0); },0)||(+c.coste||0); }
  function pintaArchivo(M){ var L=vivas().slice().sort(function(a,b){ return String(b.actualizada).localeCompare(String(a.actualizada)); }), q=(window._kcBusca||'').toLowerCase();
    var F=q?L.filter(function(c){ return (c.titulo+' '+c.mensajes.map(function(m){ return m.content; }).join(' ')).toLowerCase().indexOf(q)>=0; }):L;
    var tot=L.reduce(function(a,c){ return a+costeC(c); },0);
    M.innerHTML='<div class="kc-arh"><b>📁 Conversaciones guardadas</b> · '+L.length+' · '+tot.toFixed(2).replace('.',',')+' $ en total'+(hayDB()?'':' <span class="kc-aviso">(sin conectar a Drive: no se guardan)</span>')+'</div>'+
      '<input class="kc-busca" placeholder="Buscar en las conversaciones…" value="'+E(window._kcBusca||'')+'">'+
      (F.length?F.map(function(c){ return '<div class="kc-ci'+(ls(KA)===c.id?' on':'')+'"><button class="kc-cia" data-kc="abrirc" data-id="'+E(c.id)+'"><b>'+E(c.titulo)+'</b><span>'+fechaC(c.actualizada)+' · '+(c.n||c.mensajes.filter(function(m){ return m.role==='user'; }).length)+' pregunta(s) · '+(costeC(c)<0.01?'<0,01':costeC(c).toFixed(2).replace('.',','))+' $</span></button><button class="kc-cib" data-kc="borrarc" data-id="'+E(c.id)+'" title="Borrar">🗑</button></div>'; }).join(''):'<div class="kc-vacio">'+(q?'Nada coincide con la búsqueda.':'Aún no hay conversaciones guardadas.')+'</div>');
    var bi=M.querySelector('.kc-busca'); if(bi){ bi.addEventListener('input',function(){ window._kcBusca=bi.value; var pos=bi.selectionStart; pintaArchivo(M); var b2=M.querySelector('.kc-busca'); b2.focus(); try{ b2.setSelectionRange(pos,pos); }catch(e){} }); } }
  function pintar(){ var P=panel(), M=P.querySelector('.kc-msgs'), AV=avisoCad();
    if(verArchivo){ pintaArchivo(M); return; } sincroniza();
    var ca=actual(); var T=P.querySelector('.kc-tit'); if(T) T.textContent=ca?ca.titulo:'Conversación nueva';
    if(!hist.length){ M.innerHTML='<div class="kc-vacio">Pregunta lo que quieras sobre el método y tus 35 empresas. Ejemplos:'+EJ.map(function(x){ return '<button class="kc-ej" data-kc="ej">'+E(x)+'</button>'; }).join('')+(ls(KK)?'':'<div class="kc-aviso">Antes, pon la clave de la API en ⚙.</div>')+'</div>'+AV; return; }
    M.innerHTML=AV+hist.map(function(m){ if(m.role==='user') return '<div class="kc-u">'+E(m.content)+'</div>';
      if(m.role==='aviso') return '<div class="kc-err">'+E(m.content)+'</div>';
      return '<div class="kc-a">'+md(m.content)+'<div class="kc-pie">'+(m.usados&&m.usados.length?'Ha consultado: '+E(m.usados.join(' · '))+' · ':'')+'coste '+(m.coste!=null?(m.coste<0.01?'<0,01':m.coste.toFixed(2).replace('.',','))+' $':'—')+'</div></div>'; }).join('')+
      '<div class="kc-mes">Gastado este mes en este aparato: '+gasto().toFixed(2).replace('.',',')+' $ (el saldo y el tope los ves en platform.claude.com)</div>';
    M.scrollTop=M.scrollHeight; }
  function abrir(){ var P=panel(); P.classList.add('open'); pintar(); if(!ls(KK)) cfg(true); setTimeout(function(){ var t=P.querySelector('textarea'); if(t) t.focus(); },50); }
  window.nChatAbrir=abrir;
  setTimeout(function(){ try{ var d=diasCad(), hoy=new Date().toISOString().slice(0,10); if(d!=null&&d<=7&&ls(KK)&&ls('kh-claude-avisado')!==hoy){ ls('kh-claude-avisado',hoy); var B2=document.getElementById('kcBtn'); if(B2){ B2.textContent='🔑'; B2.title='La clave del chat caduca pronto: pulsa para renovarla'; } } }catch(e){} },3000);
  var B=document.createElement('button'); B.id='kcBtn'; B.title='Pregúntale a Claude'; B.textContent='💬'; B.addEventListener('click',abrir); document.body.appendChild(B);
  var st=document.createElement('style'); st.textContent=
   '#kcBtn{position:fixed;right:18px;bottom:18px;z-index:9990;width:52px;height:52px;border-radius:50%;border:0;background:#1F4A9A;color:#fff;font-size:24px;box-shadow:0 6px 18px rgba(20,34,49,.3);cursor:pointer}'+
   '#kcPanel{position:fixed;right:18px;bottom:80px;z-index:9991;width:min(520px,calc(100vw - 24px));height:min(680px,calc(100vh - 110px));background:#fff;border:1px solid #E5E9EF;border-radius:16px;box-shadow:0 20px 50px rgba(20,34,49,.28);display:none;flex-direction:column;font:14px/1.5 system-ui,sans-serif;color:#142231}'+
   '#kcPanel.open{display:flex}.kc-top{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #EEF1F5}.kc-top b{font-size:15px}.kc-sub{font-size:11.5px;color:#64748B;flex:1}.kc-top button{border:0;background:transparent;font-size:16px;cursor:pointer;color:#475569}'+
   '.kc-cfg{display:none;padding:10px 14px;background:#F8FAFC;border-bottom:1px solid #EEF1F5;font-size:12.5px}.kc-cfgt{color:#475569;margin:0 0 6px}.kc-cfg input{width:calc(100% - 90px);border:1px solid #CBD5E1;border-radius:8px;padding:6px 8px;margin-right:6px}.kc-cfg button{border:1px solid #CBD5E1;background:#fff;border-radius:8px;padding:5px 10px;cursor:pointer}'+
   '.kc-msgs{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}.kc-u{align-self:flex-end;background:#1F4A9A;color:#fff;border-radius:14px 14px 4px 14px;padding:8px 12px;max-width:85%;white-space:pre-wrap}'+
   '.kc-a{align-self:stretch;background:#F8FAFC;border:1px solid #EEF1F5;border-radius:14px 14px 14px 4px;padding:10px 12px}.kc-a p{margin:0 0 8px}.kc-a ul,.kc-a ol{margin:0 0 8px;padding-left:20px}.kc-a table{border-collapse:collapse;margin:4px 0 8px;font-size:12.5px;width:100%}.kc-a th,.kc-a td{border:1px solid #E5E9EF;padding:4px 6px;text-align:left}.kc-a th{background:#EEF2F7}.kc-h{font-weight:800;margin:6px 0 4px}'+
   '.kc-pie{font-size:11px;color:#64748B;margin-top:4px}.kc-mes{font-size:11px;color:#64748B;text-align:center}.kc-err{background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:10px;padding:8px 10px;font-size:13px}'+
   '.kc-cad{margin:6px 0;font-size:12.5px;color:#475569}.kc-cad select,.kc-cad input[type=date]{border:1px solid #CBD5E1;border-radius:8px;padding:4px 6px;font:inherit;width:auto!important}.kc-renov{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:10px;padding:8px 10px;font-size:13px}.kc-renov button{border:1px solid #FCD34D;background:#fff;border-radius:8px;padding:2px 8px;cursor:pointer;font:inherit}'+'.kc-tit{font-size:12px;color:#475569;padding:6px 14px;border-bottom:1px solid #F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kc-arh{font-size:13px;color:#334155}.kc-busca{border:1px solid #CBD5E1;border-radius:10px;padding:7px 10px;font:inherit;font-size:13px}.kc-ci{display:flex;gap:6px;align-items:stretch}.kc-ci.on .kc-cia{border-color:#1F4A9A}.kc-cia{flex:1;text-align:left;border:1px solid #E5E9EF;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer;font:inherit;display:flex;flex-direction:column;gap:2px;color:#142231}.kc-cia span{font-size:11.5px;color:#64748B}.kc-cib{border:1px solid #E5E9EF;background:#fff;border-radius:10px;cursor:pointer;padding:0 10px}'+'.kc-st{font-size:12px;color:#1F4A9A;padding:0 14px;min-height:16px}.kc-in{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #EEF1F5}.kc-in textarea{flex:1;resize:none;border:1px solid #CBD5E1;border-radius:10px;padding:8px;font:inherit}.kc-in button{border:0;background:#1F4A9A;color:#fff;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer}'+
   '.kc-vacio{color:#475569;font-size:13px;display:flex;flex-direction:column;gap:6px}.kc-ej{text-align:left;border:1px solid #E5E9EF;background:#fff;border-radius:10px;padding:7px 10px;cursor:pointer;font:inherit;font-size:13px;color:#1F4A9A}.kc-aviso{color:#92400E;font-weight:600}'+
   '@media(max-width:900px){#kcPanel{right:6px;left:6px;width:auto;bottom:134px;height:calc(100vh - 150px)}#kcBtn{right:12px;bottom:76px;width:48px;height:48px}}';
  document.head.appendChild(st);
})();
