
"use strict";
/* ============ Utilidades ============ */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const eur = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
const fmt = n => eur.format(n||0);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const num = v => { const n = parseFloat(v); return isNaN(n)?0:n; };

/* ---- Buscador de empresas por nombre/ticker (filtra filas con data-fs sin recargar la tabla) ---- */
function _wireBuscador(input, rows, state){
  if(!input) return;
  var list = Array.prototype.slice.call(rows||[]);
  if(state && state.q){ input.value = state.q; }
  var apply = function(){
    var q = (input.value||'').trim().toLowerCase();
    if(state) state.q = q;
    list.forEach(function(tr){
      var hay = tr.getAttribute('data-fs')||'';
      tr.style.display = (!q || hay.indexOf(q)>=0) ? '' : 'none';
    });
  };
  input.addEventListener('input', apply);
  apply();
}

/* importe mensual equivalente según frecuencia */
function mensual(p){
  const i = num(p.importe);
  if(p.frecuencia==='anual') return i/12;
  if(p.frecuencia==='bianual') return i/24;
  return i; // mensual
}
function anual(p){ return mensual(p)*12; }

/* ============ Datos semilla (1ª vez) ============ */
function seed(){
  const cuentas = [
    {id:uid(),nombre:'Efectivo Casa',tipo:'efectivo',naturaleza:'efectivo',saldoInicial:0},
    {id:uid(),nombre:'Renta 4',tipo:'broker',naturaleza:'efectivo',saldoInicial:0},
    {id:uid(),nombre:'ING',tipo:'corriente',naturaleza:'efectivo',saldoInicial:0},
    {id:uid(),nombre:'Santander',tipo:'corriente',naturaleza:'efectivo',saldoInicial:0},
  ];
  // [grupo, nombre, tipo, importe, frecuencia, metodo, renov]
  const defs = [
    ['Ingresos','Nómina Carlos','ingreso',2448.64,'mensual','',''],
    ['Ingresos','Nómina Susana','ingreso',2417.94,'mensual','',''],
    ['Ingresos','Pagas Extra','ingreso',9733,'anual','',''],
    ['Ingresos','Dividendos','ingreso',1153,'mensual','',''],
    ['Ingresos','Intereses Banco','ingreso',0,'mensual','',''],
    ['Ingresos','Otros Ingresos','ingreso',0,'mensual','',''],
    ['Casa','Comunidad','gasto',255.5,'mensual','',''],
    ['Casa','Luz','gasto',70,'mensual','Naturgy',''],
    ['Casa','IBI / Tasa Basuras','gasto',350,'anual','',''],
    ['Casa','Seguro Casa','gasto',285,'anual','',''],
    ['Coche','Seguro Coche','gasto',1000,'anual','',''],
    ['Coche','Impuesto Circulación','gasto',60,'anual','',''],
    ['Coche','Revisión / ITV','gasto',275,'anual','',''],
    ['Coche','Gasolina','gasto',70,'mensual','',''],
    ['Internet y Teléfono','Movistar','gasto',137,'mensual','',''],
    ['Internet y Teléfono','Alarma Ring','gasto',100,'anual','',''],
    ['Internet y Teléfono','Pepephone','gasto',7.9,'mensual','',''],
    ['Alimentación','Alimentación','gasto',725,'mensual','',''],
    ['Familia','Iru','gasto',40,'mensual','',''],
    ['Familia','Aldeas Infantiles','gasto',15,'mensual','',''],
    ['Ocio','Ocio','gasto',580,'mensual','',''],
    ['Compras','Compras Varios','gasto',440,'mensual','',''],
    ['Transporte','Transporte','gasto',16,'mensual','',''],
    ['Deporte','Gimnasio','gasto',95,'mensual','',''],
    ['Deporte','Wikiloc','gasto',9.99,'anual','Play Store','2026-09-22'],
    ['Deporte','Komoot','gasto',60,'anual','Play Store','2026-11-07'],
    ['Deporte','Zwift','gasto',200,'anual','Paypal','2026-12-20'],
    ['Deporte','Meteoblue','gasto',4.99,'anual','Play Store','2026-05-01'],
    ['Vacaciones','Vacaciones','gasto',8590,'anual','',''],
    ['Internet y Teléfono','Amazon Prime','gasto',49.9,'anual','ING','2026-04-08'],
    ['Internet y Teléfono','YouTube Premium','gasto',25.99,'mensual','Paypal',''],
    ['Internet y Teléfono','Audible','gasto',9.99,'mensual','ING',''],
    ['Software','Filmora','gasto',18.99,'anual','Paypal','2027-01-02'],
    ['Software','Investing.com','gasto',134.32,'bianual','','2027-05-02'],
    ['Software','Google One','gasto',219.99,'anual','Paypal','2026-07-11'],
    ['Software','Claude Pro','gasto',217.8,'anual','','2027-03-27'],
    ['Software','Microsoft 365 / Norton','gasto',122,'anual','Paypal','2027-06-23'],
  ];
  const categorias=[], presupuesto=[];
  for(const d of defs){
    const cid=uid();
    categorias.push({id:cid,grupo:d[0],nombre:d[1],tipo:d[2]});
    presupuesto.push({id:uid(),categoriaId:cid,importe:d[3],frecuencia:d[4],metodoPago:d[5],renovacion:d[6]});
  }
  return {
    version:1,
    config:{moneda:'€',objetivoReparto:0.5},
    cuentas, categorias, presupuesto,
    movimientos:[]
  };
}

/* ============ Estado + persistencia (Google Drive) ============ */
let DB=null, saveTimer=null, accessToken=null, tokenClient=null, fileId=null;
let _res=null,_rej=null;
const SCOPE='https://www.googleapis.com/auth/drive.file';
const FNAME='datos-economia.json';

function setFileStatus(state,txt){
  const dot=$('#fdot'), st=$('#fstat');
  dot.className='dot'+(state==='ok'?' ok':state==='warn'?' warn':'');
  st.textContent=txt;
}
function showWelcome(mode){
  $('#welcome').style.display='block';
  $('#wLogin').style.display = mode==='login'?'block':'none';
  $('#wImport').style.display = mode==='import'?'block':'none';
}
function waitGoogle(){ return new Promise(res=>{ let n=0; const t=setInterval(()=>{ if(window.google&&google.accounts&&google.accounts.oauth2){clearInterval(t);res(true);} else if(++n>60){clearInterval(t);res(false);} },100); }); }

function initAuth(){
  tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:GD.clientId, scope:SCOPE, login_hint:(typeof perfilEmail==='function'?perfilEmail():'carlos220271@gmail.com'),
    callback:(resp)=>{ if(resp&&resp.access_token){ accessToken=resp.access_token; if(_res){_res(resp.access_token);_res=_rej=null;} } },
    error_callback:(err)=>{ if(_rej){_rej(err);_res=_rej=null;} }
  });
}
function getToken(interactive){
  return new Promise((res,rej)=>{ _res=res; _rej=rej; try{ tokenClient.requestAccessToken({prompt: interactive?'consent':''}); }catch(e){ rej(e); } });
}
function login(){ getToken(true).then(startSession).catch(e=>{ console.error(e); setFileStatus('warn','No se pudo conectar'); }); }
function logout(){ try{ if(accessToken) google.accounts.oauth2.revoke(accessToken,()=>{}); }catch(e){} accessToken=null; location.reload(); }

async function gfetch(url,opts){
  opts=opts||{}; opts.headers=Object.assign({Authorization:'Bearer '+accessToken}, opts.headers||{});
  let r=await fetch(url,opts);
  if(r.status===401){ try{ await getToken(false); opts.headers.Authorization='Bearer '+accessToken; r=await fetch(url,opts); }catch(e){} }
  return r;
}
var _lastMod='';   /* modifiedTime del fichero en Drive la última vez que lo leímos/guardamos (chequeo de concurrencia) */
async function driveFindId(){
  const q=encodeURIComponent("name='"+FNAME+"' and trashed=false");
  const r=await gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,name,modifiedTime)&pageSize=1');
  if(!r.ok) throw new Error('Drive '+r.status);
  const j=await r.json(); const f=(j.files&&j.files[0])||null;
  if(f){ _lastMod=f.modifiedTime||''; return f.id; }
  return null;
}
async function driveLoad(){
  fileId=await driveFindId(); if(!fileId) return null;
  const r=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'?alt=media');
  if(!r.ok) throw new Error('Drive read '+r.status);
  return await r.json();
}
async function driveSave(force){
  if(window._demoOn) return {demo:true};   /* MODO DEMO: nunca escribir en Drive */
  const body=JSON.stringify(DB,null,2);
  if(!fileId){
    const meta={name:FNAME};
    const b='-----econ'+Date.now();
    const mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
    const r=await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp});
    if(!r.ok) throw new Error('Drive create '+r.status);
    const j=await r.json(); fileId=j.id; if(j.modifiedTime)_lastMod=j.modifiedTime;
  } else {
    /* chequeo de concurrencia: ¿alguien (p. ej. el móvil) guardó desde que cargamos? */
    if(!force && _lastMod){
      try{ const rc=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'?fields=modifiedTime');
        if(rc.ok){ const jc=await rc.json(); if(jc.modifiedTime && jc.modifiedTime!==_lastMod) return {conflict:true}; } }catch(e){}
    }
    const r=await gfetch('https://www.googleapis.com/upload/drive/v3/files/'+fileId+'?uploadType=media&fields=id,modifiedTime',{method:'PATCH',headers:{'Content-Type':'application/json'},body});
    if(!r.ok) throw new Error('Drive save '+r.status);
    const j=await r.json(); if(j&&j.modifiedTime)_lastMod=j.modifiedTime;
  }
  return {ok:true};
}
function scheduleSave(){ if(window._demoOn) return; clearTimeout(saveTimer); saveTimer=setTimeout(saveNow,600); }
async function saveNow(){
  if(!DB) return;
  if(window._demoOn){ setFileStatus('warn','MODO DEMO — sin guardar'); return; }
  setFileStatus('warn','Guardando…');
  try{
    let res=await driveSave(false);
    if(res&&res.conflict){
      const ok=confirm('⚠️ Los datos en Drive han cambiado desde que abriste esta sesión (quizá el móvil u otra pestaña abierta).\n\nSi guardas ahora SOBRESCRIBIRÁS esos cambios.\n\n• Aceptar = guardar igualmente\n• Cancelar = no guardar (recomendado: recarga la página para traer la última versión).');
      if(!ok){ setFileStatus('warn','⚠️ Guardado cancelado: datos cambiados en Drive — recarga la página'); return; }
      res=await driveSave(true);
    }
    setFileStatus('ok','Guardado en Drive ✓');
    driveSaveBridge();   /* puente privado para el informe semanal (fire-and-forget) */
  }catch(e){ setFileStatus('warn','Error al guardar'); console.error(e); }
}
/* Respaldo automático: una copia fechada al mes en Drive, con retención de las 12 más recientes */
async function driveMonthlyBackup(){
  try{
    if(!DB) return;
    if(window._demoOn) return;   /* MODO DEMO: no crear copias */
    const ym=new Date().toISOString().slice(0,7);           /* YYYY-MM */
    DB.config=DB.config||{};
    if(DB.config.lastMonthlyBackup===ym) return;            /* ya hecho este mes */
    const meta={name:'datos-economia-backup-'+ym+'.json'};
    const b='-----bkp'+Date.now();
    const mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(DB,null,2)+'\r\n--'+b+'--';
    const r=await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp});
    if(!r.ok) return;                                        /* silencioso: no molestar si falla */
    DB.config.lastMonthlyBackup=ym;
    try{  /* retención: conservar solo las 12 copias más recientes */
      const q=encodeURIComponent("name contains 'datos-economia-backup-' and trashed=false");
      const lr=await gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,name)&pageSize=100');
      if(lr.ok){ const lj=await lr.json();
        const files=(lj.files||[]).filter(f=>/^datos-economia-backup-\d{4}-\d{2}\.json$/.test(f.name)).sort((a,b)=>a.name<b.name?1:-1);
        for(let i=12;i<files.length;i++){ try{ await gfetch('https://www.googleapis.com/drive/v3/files/'+files[i].id,{method:'DELETE'}); }catch(e){} }
      }
    }catch(e){}
    if(typeof scheduleSave==='function') scheduleSave();     /* persiste lastMonthlyBackup */
  }catch(e){}
}

/* ===== Puente para el informe semanal automático =====
   Escribe en Drive un JSON PEQUEÑO y PRIVADO ("cartera-bridge.json") con solo lo
   que necesita el informe de cartera: posiciones, tareas, calendario de eventos,
   roles/monitor y precios de respaldo. Los precios vivos y el análisis (PO, entrada,
   stop, decisión) los toma el informe del repo PÚBLICO de GitHub (precios/ y dossiers/).
   Así el email semanal es 100% automático sin exponer tus cifras y sin leer los 790 KB
   de la base completa. */
let bridgeFileId=null;
const BRIDGE_FNAME='cartera-bridge.json';
function buildBridge(){
  const c=(DB.config&&DB.config.proyeccion)||{};
  return {
    generado:new Date().toISOString(),
    efectivo:(typeof c.efectivo==='number')?c.efectivo:null,
    operaciones:DB.operaciones||[],
    todos:DB.todos||[],
    eventos:DB.eventos||{},
    divPorAccion:DB.divPorAccion||{},
    monitor:DB.monitor||{},
    valores:DB.valores||{}
  };
}
async function driveSaveBridge(){
  try{
    if(!DB) return;
    if(window._demoOn) return;   /* MODO DEMO: no tocar el puente */
    const body=JSON.stringify(buildBridge());
    if(!bridgeFileId){
      const q=encodeURIComponent("name='"+BRIDGE_FNAME+"' and trashed=false");
      const fr=await gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id)&pageSize=1');
      if(fr.ok){ const fj=await fr.json(); if(fj.files&&fj.files[0]) bridgeFileId=fj.files[0].id; }
    }
    if(!bridgeFileId){
      const meta={name:BRIDGE_FNAME};
      const b='-----brg'+Date.now();
      const mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
      const r=await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp});
      if(r.ok){ const j=await r.json(); bridgeFileId=j.id; }
    } else {
      await gfetch('https://www.googleapis.com/upload/drive/v3/files/'+bridgeFileId+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body});
    }
  }catch(e){ /* silencioso: no molestar si falla */ }
}

async function startSession(){
  $('#btnLogout').style.display='inline-block'; var _bb=$('#btnBackup'); if(_bb)_bb.style.display='inline-block'; var _br=$('#btnRestore'); if(_br)_br.style.display='inline-block';
  setFileStatus('warn','Cargando…');
  try{
    const data=await driveLoad();
    if(data){ DB=data; afterLoad(); setFileStatus('ok','Google Drive ✓'); if(typeof driveMonthlyBackup==='function')driveMonthlyBackup(); }
    else { showWelcome('import'); setFileStatus('warn','Sin datos en Drive'); }
  }catch(e){ console.error(e); setFileStatus('warn','Error al cargar'); alert('No se pudieron cargar los datos de Drive: '+e.message); }
}
async function importLocal(file){ if(window._demoOn){ alert('Estás en MODO DEMO: sal del demo antes de importar datos.'); return; } if(typeof pushSnapshot==='function')pushSnapshot('antes de importar datos');
  try{ DB=JSON.parse(await file.text()); }catch(e){ alert('El archivo no es un JSON válido.'); return; }
  await saveNow(); afterLoad();
}

async function init(){
  if(!GD.clientId || GD.clientId.indexOf('PEGA')===0){
    setFileStatus('warn','Falta Client ID');
    $('#cfgWarn').textContent='Configura tu Client ID de Google arriba del archivo (constante GD.clientId) y vuelve a subir la app.';
    showWelcome('login'); $('#btnLogin').disabled=true; return;
  }
  const ok=await waitGoogle();
  if(!ok){ setFileStatus('warn','No se pudo cargar Google'); showWelcome('login'); return; }
  initAuth();
  try{ await getToken(false); await startSession(); }
  catch(e){ showWelcome('login'); setFileStatus('','Sin conectar'); }
}

/* ============ Render ============ */
let curYear, curMonth;

async function sincronizarCotizaciones(){
  try{
    const r=await fetch('precios/_ultimos.json',{cache:'no-store'});
    if(!r.ok) return;
    const u=await r.json(); DB.valores=DB.valores||{}; let n=0; let _maxF='';
    const _now=new Date(); const _trasCierre=(_now.getHours()*60+_now.getMinutes())>=(17*60+30); const _hoy=_now.toISOString().slice(0,10);
    const _anaByT={}; (DB.analisis||[]).forEach(a=>{ if(a.ticker)_anaByT[(a.ticker||'').toUpperCase()]=a; });
    Object.keys(u).forEach(t=>{ const fila=u[t]; if(!fila)return; const fecha=fila[0], close=num(fila[1]); if(fecha&&fecha>_maxF)_maxF=fecha; if(!fecha||!(close>0))return; const v=DB.valores[t]=DB.valores[t]||{}; const pf=v.precioFecha||''; const gana=(!pf)||(fecha>pf)||(fecha===pf&&!v.precioManual&&_trasCierre&&fecha===_hoy); if(gana){ v.precioActual=close; v.precioFecha=fecha; v.precioManual=false; const _a=_anaByT[t]; if(_a)_a.cotizacion=close; n++; } });
    if(_maxF)window._cotizUltFecha=_maxF;
    if(n){ saveNow(); if(typeof renderAll==='function')renderAll(); if(fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker); } else if(typeof renderPanelDash==='function'){ renderPanelDash(); }
  }catch(e){}
}
async function cargarDossiers(){ try{ const r=await fetch('https://api.github.com/repos/chernanzfinanzas-gif/economia-domestica/contents/dossiers',{cache:'no-store'}); if(!r.ok)return; const arr=await r.json(); if(!Array.isArray(arr))return; const set=new Set(); const jset=new Set(); arr.forEach(f=>{ const n=(f&&f.name)||''; if(/\.html$/i.test(n)) set.add(n.replace(/\.html$/i,'').toUpperCase()); else if(/\.json$/i.test(n)) jset.add(n.replace(/\.json$/i,'').toUpperCase()); }); _dossierSet=set; _tesisSet=jset; if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof renderInv==='function')renderInv(); if(fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker); try{ Promise.all(Array.from(jset).map(function(tt){ return (typeof cargarTesis==='function')?cargarTesis(tt):null; })).then(function(){ if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof renderProxMos==='function')renderProxMos(); if(typeof scheduleSave==='function')scheduleSave(); }); }catch(e2){} }catch(e){} }
function guardarTesisSnap(t,fecha,motivo,origen){ t=(t||'').toUpperCase(); const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(!a)return; fecha=fecha||new Date().toISOString().slice(0,10);
  const mn=num(a.poMin),mx=num(a.poMax),md=(mn&&mx)?(mn+mx)/2:(mx||mn||0);
  DB.tesisHist=DB.tesisHist||{}; const arr=DB.tesisHist[t]=DB.tesisHist[t]||[]; const ix=arr.findIndex(x=>x.fecha===fecha); const prev=ix>=0?arr[ix]:null;
  let mot=(motivo||'').trim(); if(prev&&prev.motivo){ mot = mot ? (prev.motivo+' · '+mot) : prev.motivo; }
  const org=origen||(prev&&prev.origen)||'';
  const snap={fecha:fecha,decision:(a.decision||'').toUpperCase(),rating:(a.rating||'').toUpperCase(),score:(typeof cmpScore==='function')?cmpScore(a):null,poBear:mn,poBase:md,poBull:mx,cotizacion:num(a.cotizacion)};
  if(mot)snap.motivo=mot; if(org)snap.origen=org;
  if(ix>=0)arr[ix]=snap; else arr.push(snap); arr.sort((x,y)=>(x.fecha||'').localeCompare(y.fecha||'')); }
/* 5.2.e simetria de registros: todo cambio manual de decision/banda/stop deja rastro (foto + motivo) y recuerda anotarlo en Excel §10.5 */
function anotarAjusteTesis(t,campoLabel){ t=(t||'').toUpperCase(); if(!t)return; let m=''; try{ m=window.prompt('Has ajustado '+campoLabel+' de '+t+' en la app.\n\nSimetria de registros (§10.5): escribe el MOTIVO del cambio. Se guarda en el historico de tesis y DEBES anotarlo tambien en el Excel Vigilancia §10.5 con esta fecha.',''); }catch(e){} guardarTesisSnap(t,null,(m||'').trim()||'(motivo no indicado)','app'); if(typeof saveNow==='function')saveNow(); }
function tesisHistHTML(t){ t=(t||'').toUpperCase(); const arr=((DB.tesisHist||{})[t]||[]).slice().sort((x,y)=>(y.fecha||'').localeCompare(x.fecha||''));
  const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t)||{}; const ahora=num(a.cotizacion); const dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  let rows='';
  arr.forEach(sn=>{ const then=num(sn.cotizacion); const rent=(then&&ahora)?(ahora/then-1):null; const d=(sn.decision||'').toUpperCase(); let mk='—',mc='#64748b';
    if(rent!=null){ if(d==='COMPRAR'||d==='MANTENER'){ mk=rent>=0?'✓ acertada':'✗ a la baja'; mc=rent>=0?'#16a34a':'#dc2626'; } else if(d==='VENDER'){ mk=rent<0?'✓ acertada':'✗ subió'; mc=rent<0?'#16a34a':'#dc2626'; } else if(d==='ESPERAR'){ if(rent>0.05){mk='se escapó +'+(rent*100).toFixed(0)+'%';mc='#d97706';} else if(rent<0){mk='✓ bien esperado';mc='#16a34a';} else {mk='neutral';mc='#64748b';} } }
    rows+=`<tr><td>${sn.fecha||'—'}${sn.origen==='app'?' <span title="'+String(sn.motivo||'ajuste en app').replace(/"/g,'&quot;')+'" style="cursor:help">📝</span>':''}</td><td><b style="color:${dc[d]||'#475569'}">${d||'—'}</b></td><td class="num">${sn.rating||'—'}${sn.score!=null?' · '+Math.round(sn.score):''}</td><td class="num">${sn.poBase!=null&&sn.poBase!==0?fmt(sn.poBase):'—'}</td><td class="num">${then?fmt(then):'—'}</td><td class="num ${rent!=null?(rent>=0?'pos':'neg'):''}">${rent==null?'—':(rent>=0?'+':'')+(rent*100).toFixed(1)+'%'}</td><td style="color:${mc};font-size:11px;white-space:nowrap">${mk}</td><td class="right"><button class="btn ghost sm" data-deltesissnap="${t}|${sn.fecha}" title="Borrar foto">✕</button></td></tr>`; });
  const body=rows||'<tr><td colspan="8" class="muted" style="font-size:12px">Aún no hay fotos de la tesis. Se guardan al actualizar desde el dossier o con «+ Guardar foto».</td></tr>';
  return `<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><div style="font-weight:800;font-size:15px">Histórico de tesis y resultado</div><div style="flex:1"></div><button class="btn ghost sm" data-savetesis="${t}">+ Guardar foto</button></div><div class="sub" style="margin-bottom:6px">Cada foto compara la cotización de entonces con la de ahora (${fmt(ahora)}) para ver si la decisión acertó.</div><div style="overflow:auto"><table><thead><tr><th>Fecha</th><th>Decisión</th><th class="num">Rating·Score</th><th class="num">PO base</th><th class="num">Cotiz. entonces</th><th class="num">Rentab. desde</th><th>Resultado</th><th></th></tr></thead><tbody>${body}</tbody></table></div></div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-savetesis]'); if(!b)return; if(typeof guardarTesisSnap==='function')guardarTesisSnap(b.dataset.savetesis); if(typeof saveNow==='function')saveNow(); if(typeof renderFicha==='function'&&fichaTicker)renderFicha(fichaTicker); });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-deltesissnap]'); if(!b)return; const a=(b.dataset.deltesissnap||'').split('|'); const t=a[0],f=a[1]; if(DB.tesisHist&&DB.tesisHist[t]){ DB.tesisHist[t]=DB.tesisHist[t].filter(x=>x.fecha!==f); if(typeof saveNow==='function')saveNow(); if(typeof renderFicha==='function'&&fichaTicker)renderFicha(fichaTicker); } });
function importTesis(t){ t=(t||'').toUpperCase(); const j=_tesisCache[t]; if(!j)return false; DB.analisis=DB.analisis||[]; let a=DB.analisis.find(x=>(x.ticker||'').toUpperCase()===t); if(!a){ a={id:uid(),ticker:t,nombre:j.empresa||t,cotizacion:num(((DB.valores||{})[t]||{}).precioActual)}; DB.analisis.push(a); } if(j.rating)a.rating=(''+j.rating).toUpperCase(); if(j.decision)a.decision=(''+j.decision).toUpperCase(); if(j.poBear!=null&&j.poBear!=='')a.poMin=num(j.poBear); if(j.poBull!=null&&j.poBull!=='')a.poMax=num(j.poBull); if(j.entMin!=null&&j.entMin!=='')a.entMin=num(j.entMin); if(j.entMax!=null&&j.entMax!=='')a.entMax=num(j.entMax); if(j.stop!=null&&j.stop!=='')a.stopTesis=num(j.stop); if(j.fecha)a.dossierFecha=j.fecha; if(j.dividendSafety)a.dividendSafety=j.dividendSafety;if(j.forense)a.forense=j.forense;if(j.reverseDcf)a.reverseDcf=j.reverseDcf; if(j.dpaPrevisto!=null&&j.dpaPrevisto!==''){ a.divAccion=num(j.dpaPrevisto); DB.valores=DB.valores||{}; DB.valores[t]=DB.valores[t]||{}; DB.valores[t].divAccion=num(j.dpaPrevisto); } const pmn=num(a.poMin),pmx=num(a.poMax); a.precioObjetivo=(pmn&&pmx)?(pmn+pmx)/2:(pmx||pmn||0); a.precioEntrada=num(a.entMax); if(typeof guardarTesisSnap==='function')guardarTesisSnap(t,j.fecha); return true; }
function validarTesisJSON(j){ const out={warns:[],info:[]}; if(!j||typeof j!=='object'){ out.warns.push('El archivo no es un objeto JSON valido.'); return out; } const SCHEMA_TESIS=7; const _sv=parseFloat((''+(j.schemaVersion!=null?j.schemaVersion:1)).replace(',','.'))||1; if(_sv>SCHEMA_TESIS) out.info.push('Esquema del fichero v'+_sv+' (mas nuevo que el soportado v'+SCHEMA_TESIS+'): la app lee los campos conocidos e ignora los nuevos.'); const KNOWN={schemaVersion:1,ticker:1,empresa:1,fecha:1,rating:1,score:1,decision:1,metodoValoracion:1,poBear:1,poBase:1,poBull:1,entMin:1,entMax:1,stop:1,dpaPrevisto:1,moat:1,catalizadores:1,riesgos:1,bull:1,bear:1,resumen:1,confianza:1,robustez:1,dividendSafety:1,forense:1,reverseDcf:1}; const NUMK=['score','poBear','poBase','poBull','entMin','entMax','stop']; const ARRK=['catalizadores','riesgos']; const REC=['decision','rating','poBear','poBull','fecha']; const norm=x=>(''+x).toLowerCase().replace(/[^a-z0-9]/g,''); Object.keys(j).forEach(k=>{ if(!KNOWN[k]){ let h=''; const nk=norm(k); Object.keys(KNOWN).forEach(kk=>{ if(norm(kk)===nk) h=' (quiza querias "'+kk+'")'; }); (_sv>SCHEMA_TESIS?out.info:out.warns).push('Campo no reconocido: "'+k+'"'+h+' - se ignora.'); } }); NUMK.forEach(k=>{ if(j[k]!=null&&j[k]!==''&&isNaN(parseFloat((''+j[k]).replace(',','.')))) out.warns.push('"'+k+'" deberia ser numerico (valor: '+JSON.stringify(j[k])+').'); }); ARRK.forEach(k=>{ if(j[k]!=null&&!Array.isArray(j[k])) out.warns.push('"'+k+'" deberia ser una lista [] o no se mostrara.'); }); const dec=(j.decision||'').toUpperCase(); if(dec&&['COMPRAR','MANTENER','ESPERAR','VENDER'].indexOf(dec)<0) out.warns.push('decision="'+j.decision+'" no es COMPRAR/MANTENER/ESPERAR/VENDER.'); const b=num(j.poBear),u=num(j.poBull); if(b&&u&&b>u) out.warns.push('poBear ('+b+') es mayor que poBull ('+u+'): puede que esten invertidos.'); REC.forEach(k=>{ if(j[k]==null||j[k]==='') out.info.push('falta "'+k+'"'); }); return out; }
function tesisCardHTML(j){ if(!j||typeof j!=='object')return '';
  const dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; const d=(j.decision||'').toUpperCase(); const _mm=(j.fecha&&typeof mesesDesde==='function')?mesesDesde(j.fecha):null; const _wk=(j.ticker||fichaTicker||'').toUpperCase(); const _w=(typeof _tesisWarn!=='undefined')?_tesisWarn[_wk]:null; const warnHTML=(_w&&((_w.warns&&_w.warns.length)||(_w.info&&_w.info.length)))?`<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:8px;margin-bottom:8px;font-size:12px">${(_w.warns&&_w.warns.length)?'<div style="color:#9a3412;font-weight:700">\u26a0\ufe0f Avisos del JSON del dossier</div><ul style="margin:4px 0 0 16px;padding:0;color:#7c2d12">'+_w.warns.map(x=>'<li>'+x+'</li>').join('')+'</ul>':''}${(_w.info&&_w.info.length)?'<div style="color:#92400e;font-size:11px;margin-top:6px">Campos recomendados: '+_w.info.join(', ')+'.</div>':''}</div>`:'';
  const po=(l,v,c)=>`<div style="flex:1;min-width:88px;background:${c};border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#475569">${l}</div><div style="font-weight:800;font-size:16px">${(v!=null&&v!=='')?fmt(num(v)):'—'}</div></div>`;
  const lst=a=>Array.isArray(a)&&a.length?('<ul style="margin:4px 0 0 16px;padding:0">'+a.map(x=>`<li style="margin:2px 0">${x}</li>`).join('')+'</ul>'):'<span class="muted">—</span>';
  const _tk=(j.ticker||fichaTicker||'').toUpperCase(); const _du=(typeof dossierURL==='function')?dossierURL(_tk,((DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===_tk)||{}).dossierUrl):'';
  return `<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><div style="font-weight:800;font-size:16px">Resumen del dossier</div>${d?`<span style="font-weight:800;color:${dc[d]||'#475569'}">${d}</span>`:''}${j.rating?` <span style="font-size:12px">Calidad <b>${j.rating}</b></span>`:''}${(j.score!=null&&j.score!=='')?` <span style="font-size:12px">Score <b>${j.score}</b></span>`:''}${(()=>{const cf=j.confianza;if(!cf)return '';const nv=(cf.nivel||'').toUpperCase();const col={A:'#16a34a',B:'#d97706',C:'#dc2626'}[nv]||'#64748b';const tip=((cf.motivos||[]).join(' · ')||'').replace(/"/g,'&quot;');const lock=(cf.reglaDura&&cf.reglaDura.bloqueaCompraEnFirme)?' 🔒':'';return ` <span title="${tip}" style="cursor:help;font-size:12px;background:${col};color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">Confianza ${nv}${cf.score!=null?' · '+cf.score:''}${lock}</span>`;})()}${(()=>{const rb=j.robustez;if(!rb||!rb.nivel)return '';const nv=(''+rb.nivel).toLowerCase();const col={solida:'#16a34a',sensible:'#d97706'}[nv]||'#64748b';const lbl={solida:'sólida',sensible:'sensible'}[nv]||nv;const expl='Robustez de la decisión: mide si el veredicto (comprar/esperar) sobrevive al mover el coste de capital (WACC/CoE) ±1pp y el crecimiento (g/RoTE) ±0,5pp. SÓLIDA = la cotización queda FUERA de la banda de precio objetivo, así que la decisión no cambia dentro de ese rango de supuestos. SENSIBLE = la cotización cae DENTRO de la banda, así que la decisión depende del supuesto de descuento/crecimiento que elijas.';const tip=(expl+((rb.motivos&&rb.motivos.length)?'  —  '+rb.motivos.join(' · '):'')).replace(/"/g,'&quot;');return ` <span title="${tip}" style="cursor:help;font-size:12px;background:${col};color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">Robustez ${lbl}${rb.matizada?' · matizada ⚠':''}</span>`;})()}${(()=>{const ds=j.dividendSafety;if(!ds)return '';const col={'Muy seguro':'#16a34a','Seguro':'#4d7c0f','Vigilar':'#d97706','Frágil':'#ea580c','Recorte probable':'#dc2626'}[ds.banda]||'#64748b';const tip=('Seguridad del dividendo: '+(ds.banda||'Pte.')+(ds.rama?' · rama '+ds.rama:'')+(ds.topeDuro&&ds.topeDuro.activo?' · TOPE DURO: '+ds.topeDuro.motivo:'')+((ds.motivos&&ds.motivos.length)?'  —  '+ds.motivos.slice(0,4).join(' · '):'')).replace(/"/g,'&quot;');const lab=(ds.score!=null?ds.score:'n/a');return ` <span title="${tip}" style="cursor:help;font-size:12px;background:${col};color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">💧 Dividendo ${lab}${ds.banda?' · '+ds.banda:''}</span>`;})()}${j.fecha?` <span style="font-size:11px;color:${(_mm!=null&&_mm>12)?'#dc2626':'#64748b'}">${j.fecha}${_mm!=null?' · hace '+_mm+' m'+(_mm>12?' ⚠️ reanalizar':''):''}</span>`:''}<div style="flex:1"></div>${_du?`<a class="btn sm" href="${_du}" target="_blank" rel="noopener">📄 Abrir dossier</a>`:''}<button class="btn ghost sm" data-imptesis="${(j.ticker||fichaTicker||'').toUpperCase()}">Actualizar Análisis desde dossier</button></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${(()=>{const fo=j.forense;if(!fo)return '';if(fo.aplica===false)return ` <span title="Forense: no aplica (${(fo.motivo||'rama financiera')})" style="cursor:help;font-size:12px;background:#64748b;color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">\ud83d\udee1 Forense \u00b7 No aplica</span>`;if(!fo.aplica)return '';const sc=`Piotroski ${fo.piotroski?fo.piotroski.score:'-'}/9 \u00b7 Altman ${fo.altman?fo.altman.z:'-'} (${fo.altman?fo.altman.zona:'-'}) \u00b7 Beneish ${fo.beneish?fo.beneish.m:'-'}`;const has=fo.flags&&fo.flags.length;if(!has){const tip=('Sin alertas forenses: todos los chequeos autom\u00e1ticos en zona buena.\n\n'+sc).replace(/"/g,'&quot;');return ` <span title="${tip}" style="cursor:help;font-size:12px;background:#16a34a;color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">\ud83d\udee1 Forense \u00b7 Sin alertas</span>`;}const veto=(fo.veto===true)||(fo.beneish&&(''+fo.beneish.senal).indexOf('manipulaci')>=0)||(fo.altman&&fo.altman.zona==='riesgo');const tip=((veto?'VETO: no procede COMPRAR en firme hasta investigarlo.\n\n':'')+fo.flags.join('\n\u2022 ')+'\n\n'+sc).replace(/"/g,'&quot;');return ` <span title="\u2022 ${tip}" style="cursor:help;font-size:12px;background:${veto?'#991b1b':'#dc2626'};color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">${veto?'\ud83d\udd12 ':'\u26a0\ufe0f '}Forense \u00b7 Alerta</span>`;})()}${(()=>{const rd=j.reverseDcf;if(!rd)return '';const v=(rd.veredicto||'');const M={'PLAUSIBLE':'#16a34a','EXIGENTE':'#d97706','HEROICO':'#dc2626'};const ap=!!M[v];const col=M[v]||'#64748b';const nom=ap?('Reverse DCF \u00b7 '+v.charAt(0)+v.slice(1).toLowerCase()):('Reverse DCF \u00b7 '+(v==='No aplica'?'No aplica':'n/d'));const tip=((ap?('El precio descuenta un crecimiento del FCL del '+rd.gImplicito+'% frente al '+(rd.gIntrinseco!=null?rd.gIntrinseco+'%':'n/d')+' autofinanciable (g intr\u00ednseco, A7).\n\n'):'')+(rd.motivo||'')).replace(/"/g,'&quot;');return ` <span title="${tip}" style="cursor:help;font-size:12px;background:${col};color:#fff;border-radius:6px;padding:1px 7px;font-weight:700">\ud83d\udcc8 ${nom}</span>`;})()}</div>${warnHTML}${(()=>{const cf=j.confianza;if(cf&&cf.reglaDura&&cf.reglaDura.accion)return `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px;margin-bottom:8px;font-size:12px;color:#991b1b"><b>🔒 Confianza ${(cf.nivel||'').toUpperCase()}:</b> ${cf.reglaDura.accion}</div>`;return '';})()}${(()=>{const ds=j.dividendSafety;if(!ds||ds.score==null)return '';const risky=(ds.score<60)||(ds.topeDuro&&ds.topeDuro.activo);if(!risky)return '';const grave=ds.score<40||(ds.topeDuro&&ds.topeDuro.activo);const col=grave?'#991b1b':'#9a3412';const bg=grave?'#fef2f2':'#fff7ed';const bd=grave?'#fecaca':'#fed7aa';const acc=grave?'no lo cuentes como renta estable; entra solo si hay tesis de valor.':'peso reducido y seguimiento en el monitor trimestral.';return `<div style="background:${bg};border:1px solid ${bd};border-radius:8px;padding:8px;margin-bottom:8px;font-size:12px;color:${col}"><b>💧 Seguridad del dividendo ${ds.banda} (${ds.score}/100)${(ds.topeDuro&&ds.topeDuro.activo)?' · TOPE DURO':''}:</b> si tu tesis se apoya en la renta, no compres solo por el dividendo — ${acc}</div>`;})()}${j.resumen?`<div style="margin-bottom:8px">${j.resumen}</div>`:''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">${po('PO bear',j.poBear,'#fee2e2')}${po('PO base',j.poBase,'#e0f2fe')}${po('PO bull',j.poBull,'#dcfce7')}</div>${(()=>{const rb=j.robustez,s=rb&&rb.sensibilidad;if(!s||s.poMin==null)return '';const ec=s.ejeCoste||'coste capital';return `<div class="muted" style="font-size:11px;margin-bottom:6px">Banda ${ec}±${s.pertCoste}pp: PO ${s.poMin}–${s.poMax} €${s.mdsMin!=null?` · MdS ${s.mdsMin}%…${s.mdsMax}%`:''}${s.cotizacion!=null?` · cotización ${s.cotizacion} €`:''}</div>`;})()}${j.metodoValoracion?`<div class="muted" style="font-size:11px;margin-bottom:6px">Método de valoración: ${j.metodoValoracion}</div>`:''}${(j.dividendSafety&&j.dividendSafety.shareholderYield!=null)?`<div class="muted" style="font-size:11px;margin-bottom:6px">Shareholder yield: ${j.dividendSafety.shareholderYield}%${j.dividendSafety.rama?' · rama '+j.dividendSafety.rama:''}</div>`:''}${j.moat?`<div style="margin:4px 0"><b>Moat:</b> ${j.moat}</div>`:''}<div style="display:flex;gap:14px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b style="color:#16a34a">Catalizadores</b>${lst(j.catalizadores)}</div><div style="flex:1;min-width:200px"><b style="color:#dc2626">Riesgos</b>${lst(j.riesgos)}</div></div>${(j.bull||j.bear)?`<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px">${j.bull?`<div style="flex:1;min-width:200px;background:#f0fdf4;border-radius:8px;padding:8px"><b style="color:#16a34a">A favor</b><div>${j.bull}</div></div>`:''}${j.bear?`<div style="flex:1;min-width:200px;background:#fef2f2;border-radius:8px;padding:8px"><b style="color:#dc2626">En contra</b><div>${j.bear}</div></div>`:''}</div>`:''}</div>`;
}
async function cargarTesis(t){ t=(t||'').toUpperCase(); if(!t||_tesisCache[t]!==undefined)return; _tesisCache[t]=null;
  try{ const r=await fetch('dossiers/'+t+'.json',{cache:'no-store'}); if(r.ok){ const j=await r.json(); if(j&&typeof j==='object'){ _tesisCache[t]=j; if(typeof validarTesisJSON==='function')_tesisWarn[t]=validarTesisJSON(j);
    const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(a&&j.dividendSafety){ a.dividendSafety=j.dividendSafety; } if(a&&j.forense){ a.forense=j.forense; } if(a&&j.reverseDcf){ a.reverseDcf=j.reverseDcf; } const vacia=!a||(!a.rating&&!num(a.poMin)&&!num(a.poMax)&&!a.decision);
    if(vacia&&importTesis(t)){ if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof scheduleSave==='function')scheduleSave(); } } } }catch(e){}
  if(fichaTicker===t&&typeof renderFicha==='function')renderFicha(t); if(typeof renderComparador==='function'&&typeof cmpSel!=='undefined'&&cmpSel.indexOf(t)>=0)renderComparador(); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-imptesis]'); if(!b)return; const t=(b.dataset.imptesis||'').toUpperCase(); if(!_tesisCache[t]){ alert('Resumen del dossier no disponible.'); return; } if(!confirm('¿Actualizar el Análisis de '+t+' con los datos del dossier? Sobrescribe rating, PO, banda de entrada, stop y decisión de esa empresa.'))return; if(importTesis(t)){ if(typeof saveNow==='function')saveNow(); if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof renderFicha==='function')renderFicha(t); alert('Análisis actualizado desde el dossier.'); } });
function dossierURL(t,manual){ if(manual)return manual; t=(t||'').toUpperCase(); if(t&&_dossierSet&&_dossierSet.has(t))return 'dossiers/'+t+'.html'; return ''; }
const INFO_TXT={
'view-asignacion':`Reparte tu patrimonio por <b>clases de activo</b> (Efectivo, Renta variable, Renta fija, Inmuebles, Fondos, Oro…) y fija un <b>% objetivo</b> para cada una. La app calcula tu <b>% actual</b>, la <b>desviación</b> respecto al objetivo y lo que tendrías que <b>mover</b> (aportar o reducir) para reequilibrar. Pulsa «Autorrellenar» para partir de tu Efectivo (del Patrimonio) y tu Renta variable (la cartera), y añade el resto con «+ Clase». Si una clase se desvía más de 5 puntos, salta un aviso de rebalanceo en el Panel. Los % objetivo deberían sumar 100.`,
'view-metas':`Tus objetivos de ahorro con importe y fecha (entrada de casa, coche, jubilación, viaje…). Rellena <b>Objetivo</b>, <b>Fecha</b> y lo que llevas <b>Ahorrado</b> (esto lo actualizas tú). La app calcula el <b>progreso</b>, el <b>aporte mensual necesario</b> para llegar a tiempo (lo que falta ÷ meses hasta la fecha) y, si pones tu <b>Aporte/mes</b> previsto, te dice <b>cuándo llegarías</b> y si vas en camino (verde) o te quedas corto (rojo). Pulsa «+ Meta» para añadir.`,
'view-rentabilidad':`Cómo va cada empresa de tu cartera. Arriba, la <b>TIR y rentabilidad temporal de toda la cartera</b> y la alfa vs IBEX. En la tabla, por empresa: <b>Rent. total</b> (plusvalía + dividendos sobre tu coste) y <b>TIR</b> (anual, ponderada por tus fechas de compra) miden TU posición; <b>TR YTD / 1A / 3A</b> miden el <b>valor del activo</b> (cotización + dividendos por acción del periodo) para comparar el rendimiento de cada empresa independientemente de cuándo entraste (TR 3A acumulado). Necesita conexión para las cotizaciones del repo.`,
'view-atribucion':`Descompone de dónde viene el crecimiento de tu cartera: <b>Aportación</b> (lo que metiste de tu bolsillo), <b>Mercado</b> (revalorización por cotización) y <b>Dividendos</b> (cobrados). La suma es el cambio de tu valor+dividendos. Elige el periodo: <b>Últimos 12m</b>, <b>Año en curso</b>, <b>Todo</b>, un <b>año</b> concreto del desplegable, o un <b>rango</b> de fechas. El gráfico de cascada muestra cómo pasó tu valor de inicio a fin, y la tabla lo desglosa <b>año a año</b>.`,
'view-fiscalidad':`Fiscalidad <b>orientativa</b> (no es asesoramiento) de tus acciones con criterio <b>FIFO</b> (el que aplica Hacienda). <b>Latente</b>: plusvalía/minusvalía si vendieras hoy (no tributa hasta vender). <b>Realizado</b>: ganancias/pérdidas de tus ventas del año y su <b>impuesto estimado</b> (tramos del ahorro 19–28%). <b>Afloramiento</b>: si tienes ganancias realizadas, vender lotes en pérdida las compensa y te ahorra impuestos. <b>Regla de los 2 meses</b>: si vendes con pérdida una acción cotizada y la recompras dentro de los 2 meses (antes o después), esa pérdida NO es deducible este año — la app te avisa. No incluye dividendos ni activos extranjeros.`,
'view-riesgo':`Mide el riesgo de tu cartera <b>actual</b> con las cotizaciones diarias del repo. <b>Volatilidad anual</b>: cuánto oscila (más alta = más nerviosa). <b>Drawdown máximo</b>: la mayor caída pico-valle que habría sufrido. <b>Beta vs IBEX</b>: cuánto amplifica los movimientos del índice (1 = igual). <b>Correlación media</b> y la <b>matriz</b>: verde = posiciones que NO se mueven juntas (buena diversificación), rojo = que sí. <b>Nº efectivo</b> de posiciones y <b>concentración</b> del mayor peso. Necesita conexión para bajar los precios del repo.`,
'view-backtest':`Mide si tu método funciona. Agrega todas las <b>fotos de tesis</b> que has guardado (en cada Ficha, «+ Guardar foto», o al importar un dossier) y compara la cotización de entonces con la de ahora. Acierto: COMPRAR/MANTENER ✓ si subió, VENDER ✓ si bajó, ESPERAR ✓ si no se disparó (>5% = «se escapó»). Verás el % de acierto por decisión, la rentabilidad media de tus COMPRAR y si tu Score discrimina (Score≥70 debería rendir más que <70). Cuantas más fotos guardes con el tiempo, más fiable será.`,
'view-proxcompra':`Motor de decisión: te dice <b>qué comprar ahora y cuánto</b>. Prioridad = 0,5·Score + 0,3·infraponderación vs tu objetivo de diversificación + 0,2·margen de entrada. Solo entran las que están en <b>zona de compra</b> (cotización ≤ tu entrada máxima), no tienen el stop tocado ni están marcadas VENDER. La columna <b>Recom. €</b> reparte tu <b>caja disponible</b> tapando primero el hueco de la mejor candidata. Con «→ Plan» pasas la compra sugerida al Plan del año elegido; con «→ Caja» la registras como salida en la Caja bróker (no ejecuta ninguna orden real, solo planifica). Necesita cotización + banda de entrada en Análisis y, para el hueco, el objetivo de la Diversificación.`,
'view-comparador':`Compara hasta 3 empresas finalistas lado a lado con lo que no cabe en Análisis: Score, decisión, PO, potencial, entrada, stop, RPD, sector y lo cualitativo del dossier (moat, catalizadores, riesgos, tesis a favor/en contra). Elige las empresas en los desplegables; por defecto salen las 3 de mayor Score.`,
'view-graficas':`Análisis visual de tus finanzas: bloque <b>Hogar</b> (gasto, ahorro, por grupo/titular/comercio) y bloque <b>Inversión</b> (composición por empresa y sector, dividendos, YoC, RPD, aportado vs valor…). Usa el selector de <b>Año</b> para los gráficos de Hogar. Los datos salen solos del resto de secciones; algunos gráficos de Inversión usan las <b>cotizaciones del repo</b>, así que necesitan conexión y pueden tardar un instante en cargar.`,
'view-panel':`Resumen de tu situación; se rellena solo desde el resto de secciones. Haz clic en cualquier bloque para ir a su sección. Arriba tienes una <b>bandeja de avisos</b> que reúne, por prioridad: stops de tesis alcanzados, dossiers de más de 12 meses, renovaciones y pagos próximos, trimestres publicados sin revisar y sobreconcentración por sector. Cada aviso te lleva a su sección.`,
'view-movimientos':`Registra ingresos y gastos (fecha, concepto, importe, categoría). El campo <b>Comercio</b> es el negocio base agrupable (p. ej. Repsol) y <b>Detalle</b> guarda lo fino (Repsol Ribadeo). Usa el filtro «Comercio» para acotar, y el panel «🧹 Regularizar comercios» para agrupar de golpe varios detalles bajo un mismo negocio (marca la casilla de regla para aplicarlo también a futuros y similares).`,
'view-amalia':`Apunta importes que has adelantado y te reembolsarán; márcalos como cobrados cuando los recuperes.`,
'view-patrimonio':`Añade una foto de tu patrimonio (efectivo e invertido). Recomendado una vez al mes. Alimenta el objetivo 50/50 y el Panel.`,
'view-presupuesto':`Define el presupuesto por categoría y año, a principio de año. Se compara con lo registrado en Movimientos. Si fijas la <b>renovación</b> y la <b>frecuencia</b> (mensual/anual…) de una partida, la app te avisa de los pagos próximos aquí y en el Panel.`,
'view-inversiones':`Registra cada compra/venta real (fecha, nº de acciones, precio y cartera Propia/Compartida). Es la base de Dividendos, Ranking, Simulador y Plan. Al ejecutar una compra que estaba en el Plan, revísalo después para quitarla.`,
'view-analisis':`Pasos por empresa:<br><b>1.</b> Actualiza la cotización (pega Nombre⇥Cotización⇥Dividendo, o espera al cierre automático tras las 17:30).<br><b>2.</b> Rellena PO mín/máx, banda de entrada, rating, stop y decisión: a mano, o <b>automático</b> subiendo el <b>TICKER.json</b> del dossier a la carpeta <b>dossiers/</b> (la app lo valida, te avisa si algún campo no encaja y rellena estos datos solo).<br><b>3.</b> Para ver el informe, sube también el <b>TICKER.html</b> a <b>dossiers/</b> y deja vacío el campo 'Enlace dossier/Excel' para que aparezca el 📄 (usa ese campo solo si quieres enlazar un Word/PDF/Excel de Google Drive).`,
'view-dividendos':`Se calcula solo desde tus operaciones (Cartera) y el dividendo por acción (Evolución Dividendo). Aquí solo editas a mano la devolución de Hacienda. Ten esas dos secciones al día.`,
'view-ranking':`Automático: ordena tu cartera por aportación al dividendo. No requiere pasos; depende de Cartera y dividendos.`,
'view-calendario':`Marca los eventos del año por semana (D=dividendo, Q=resultados, JA=junta, ID=Investor Day) y el reparto % de cada dividendo por empresa (debe sumar 100%). Alimenta la agenda del Panel y la Caja del bróker.`,
'view-proyeccion':`Modelo de proyección de patrimonio (EVO). Ajusta los supuestos; usa los datos de Patrimonio.`,
'view-diversif':`ÚNICA hoja donde editas tus compras futuras (€ objetivo por empresa). El Plan y el Simulador la leen en solo lectura. Ajústala según veas la empresa cara o barata (mira el Score en Análisis).`,
'view-plan':`Vista de solo lectura de tus compras planificadas (se editan en Diversificación). Aquí ves la ejecución: compras parciales/completas y el botón 'Quitar del Plan' cuando una está completa. Para que detecte la ejecución, registra antes la compra real en Cartera.`,
'view-prevision':`ÚNICO sitio donde editas el dividendo por acción de cada empresa y año. Marca como confirmado el dividendo cuando ya sea real. Es la fuente del Simulador y de Dividendos.`,
'view-simulador':`Proyección de acciones y dividendos por año. Años pasados y el actual usan lo real (manda sobre la anotación manual en cuanto registras la compra). Años futuros = real + lo pendiente del Plan. Edita a mano solo donde no haya operación.`,
'view-caja':`Libro de la cuenta del bróker. Configura el saldo inicial y las aportaciones mensuales; los dividendos previstos vienen del Calendario. Edita una celda para poner el importe real (queda con ✓) y marca la casilla de la izquierda cuando el movimiento ya se ha ejecutado (la fila se pone verde).`,
'view-monitor':`Seguimiento por empresa: rol (mantener/aumentar/abrir), si has leído el último informe, la revisión trimestral y la <b>antigüedad del dossier</b> (en rojo si pasa de 12 meses → toca reanalizar). El trimestre se marca en rojo si se publicaron resultados (Calendario) y no los has revisado. Arriba tienes tu lista de tareas (ToDo).`,
'view-origen':`La <b>foto de partida</b>: tu situación cuando decidiste tomarte en serio las finanzas y la estrategia que te marcaste (más ahorro, más rentabilidad, menos gasto). Es una página de <b>solo lectura</b>, un recordatorio del punto de salida y del rumbo. No hay nada que rellenar.`,
'view-fondor4':`Libro del <b>Fondo R4</b> (Renta 4 Foncuenta), tu liquidez remunerada. Apunta cada <b>aportación</b> (+) o <b>retirada</b> (−) con su fecha e importe; si quieres, añade el <b>valor del fondo</b> tras el movimiento para seguir los intereses acumulados, y en las retiradas la <b>retención</b> aplicada. Alimenta tu efectivo disponible y la Asignación de activos.`,
'view-posiciones':`Cada compra ejecutada vista como un <b>lote</b> independiente, con su <b>rentabilidad anualizada</b> (precio + dividendo). Se genera solo a partir de tus operaciones de la <b>Cartera</b>; aquí solo <b>filtras</b> (todas / en cartera / vendidas) y <b>ordenas</b> por fecha. Para que aparezca un lote, registra antes la compra en Cartera.`,
'view-vision':`Ranking de todas las empresas de <b>Análisis</b> por <b>Atractivo</b> (0,45·Calidad + 0,35·Margen de seguridad + 0,20·RPD) para priorizar cuál analizar o actualizar antes. Debajo, tu <b>exposición por tema de riesgo</b> según las etiquetas de las tesis de las empresas que tienes en cartera. Se calcula solo; ⚠ marca dossiers de más de 12 meses. Necesita conexión para leer los dossiers del repo.`,
'view-informes':`Centro de <b>informes en PDF</b>, en tres pasos: <b>1)</b> elige uno o varios informes (gastos, inversión…) para combinarlos en un solo PDF; <b>2)</b> fija el <b>periodo</b> (mes, año o rango de fechas); <b>3)</b> ajusta los <b>filtros</b> del informe de gastos (tipo, nivel de detalle, titular y categorías). Se generan a partir de los datos que ya tienes en el resto de secciones.`,
'view-mazinger':`Control del <b>consumo de tu coche</b>. Apunta cada <b>repostaje</b> (fecha, km, autonomía, litros y precio) y la app calcula el <b>consumo</b> (L/100 km), el <b>gasto mensual</b> en combustible y su evolución en gráficos. Solo tienes que ir registrando cada repostaje.`,
'view-radardiv':`Qué empresas de tu radar reparten más <b>dividendo</b> y a qué nivel de precio están frente a su histórico. <b>RPD</b> = dividendo/acción ÷ cotización. La <b>posición</b> sitúa el precio actual en el rango de los últimos 2/3/4 años (verde = barato, rojo = caro). Marca con ★ las que encajen con tu filosofía y usa el <b>buscador</b> por nombre o ticker. Necesita conexión para las cotizaciones históricas del repo. No es recomendación de compra.`,
'view-universo':`La <b>base del sistema</b>: el registro maestro de todas las empresas (arquetipo, sub-tipo, naturaleza, rating), <b>editable</b>. <b>Aqu\u00ed se dan de alta las empresas nuevas</b> con \u00ab+ Empresa\u00bb: al a\u00f1adirlas se reflejan autom\u00e1ticamente en el resto de la app \u2014 An\u00e1lisis, Visi\u00f3n de Conjunto, Radar Op., Radar Dividendo, Evoluci\u00f3n del Dividendo y su ficha. Imp\u00f3rtala una vez desde <code>matriz.json</code> (lo genera el .bat \u00abExportar matriz.json\u00bb) y ed\u00edtala aqu\u00ed cuando algo cambie. Usa el <b>buscador</b> para encontrar una empresa por nombre o ticker.`,
'view-radar':`Cruza tu <b>Universo</b> con <code>fundamentales.json</code> del repo y rankea las empresas por <b>Atractivo</b> (35% Dividendo + 35% Calidad + 30% Valoración) para decidir a quién analizar. ⚠️ señala posibles trampas de dividendo. Filtra por arquetipo, ordena por Atractivo/RPD, <b>busca</b> por nombre o ticker y marca ★ las interesantes para pasarlas a la cola con «Añadir ★ a la cola». Requiere el Universo importado y <code>fundamentales.json</code> subido al repo. No es recomendación de compra.`,
'view-cobertura':`Qué empresas has <b>analizado</b> y cuáles tienes <b>en cola</b>. La cola la ordenas tú (▲▼) y la nutres desde <b>Radar Op.</b> (★). Abajo, la <b>cadencia</b> de las analizadas: último y próximo informe estimado, próxima diana de calibración y señal de precio activa (stop / compra / PO). Las urgentes también salen en el Panel.`,
'view-hemeroteca':`Archivo de los <b>Informes Semanales de Cartera</b> (coyuntura y riesgo) que vas generando. Cada informe cruza lo que cada empresa tiene documentado (riesgos, pre-mortem, catalizadores) con la <b>coyuntura macro de la semana</b>, en un PDF con portada-resumen y una hoja por empresa. <b>Para generar uno:</b> pulsa «🧾 Informe semanal (Claude)» en el <b>Panel</b> (abre Claude en este ordenador) y, cuando esté hecho, sube el PDF a la carpeta <code>informes-semanales/</code> del repo. Aquí se listan del <b>más reciente al más antiguo</b>; pulsa «Abrir PDF» para verlo. Es un filtro grueso / alerta temprana, no una recomendación de compra/venta.`
};
function renderInfoBoxes(){ try{ const op=(DB.config&&DB.config.infoOpen)||{}; Object.keys(INFO_TXT).forEach(id=>{ const sec=document.getElementById(id); if(!sec)return; if(sec.querySelector(':scope > .infobox'))return; const div=document.createElement('div'); div.className='infobox'+(op[id]?' open':''); div.dataset.info=id; div.innerHTML=`<div class="infobox-head">ℹ️ Info — pasos previos <span class="infobox-arrow">▸</span></div><div class="infobox-body">${INFO_TXT[id]}</div>`; const h2=sec.querySelector(':scope > h2'); if(h2)h2.insertAdjacentElement('afterend',div); else sec.insertBefore(div,sec.firstChild); }); }catch(e){} }
document.addEventListener('click',e=>{ const h=e.target.closest('.infobox-head'); if(!h)return; const box=h.parentElement; box.classList.toggle('open'); const id=box.dataset.info; DB.config=DB.config||{}; DB.config.infoOpen=DB.config.infoOpen||{}; if(box.classList.contains('open'))DB.config.infoOpen[id]=true; else delete DB.config.infoOpen[id]; if(typeof scheduleSave==='function')scheduleSave(); });
/* ===== Logos y cabecera de informes (P1.5: una sola fuente; logos en fichero, no en JS) ===== */
var INF_LOGO_SRC='logo-informe.jpg', INF_LOGO_KHB_SRC='logo-khb.jpg';
var _infLogosLoaded=false;
function _infFileToDataURL(url){ return fetch(url,{cache:'force-cache'}).then(function(r){return r.ok?r.blob():null;}).then(function(b){ return b?new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){res(fr.result);}; fr.onerror=function(){res('');}; fr.readAsDataURL(b); }):''; }).catch(function(){return '';}); }
async function ensureInfLogos(){
  if(_infLogosLoaded) return;
  try{ var a=await _infFileToDataURL(INF_LOGO_SRC); if(a && typeof INF_LOGO!=='undefined') INF_LOGO=a;
       var b=await _infFileToDataURL(INF_LOGO_KHB_SRC); if(b && typeof INF_LOGO_KHB!=='undefined') INF_LOGO_KHB=b; }catch(e){}
  _infLogosLoaded=true;
}
/* Cabecera unica de informe (sustituye las 3 copias casi identicas) */
function infHeaderHTML(titulo, subtitulo, logoSrc, imgAttrs){
  logoSrc = logoSrc || (typeof INF_LOGO!=='undefined'?INF_LOGO:'');
  subtitulo = (subtitulo==null) ? 'Gestión de Economía Doméstica' : subtitulo;
  imgAttrs = imgAttrs || 'alt="KHB"';
  var t=(typeof _infEsc==='function')?_infEsc(titulo||''):(titulo||'');
  return '<div class="infHdr"><img src="'+logoSrc+'" '+imgAttrs+'><div class="tt"><h1>'+t+'</h1><div class="sub">'+subtitulo+'</div></div></div><div class="accent"></div>';
}

function afterLoad(){ if(typeof ensureInfLogos==='function')ensureInfLogos(); if(typeof renderInfoBoxes==='function')renderInfoBoxes();
  $('#welcome').style.display='none';
  $('#btnLogout').style.display='inline-block'; var _bb=$('#btnBackup'); if(_bb)_bb.style.display='inline-block'; var _br=$('#btnRestore'); if(_br)_br.style.display='inline-block';
  $$('.view').forEach(v=>v.classList.toggle('active', v.id==='view-panel'));
  $$('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.view==='panel'));
  // migración: asegurar año en cada entrada de presupuesto
  DB.presupuesto.forEach(p=>{ if(p.anio==null) p.anio=baseYear(); });
  DB.patrimonio = DB.patrimonio||[];
  DB.amalia = DB.amalia||[];
  DB.inversiones = DB.inversiones||[];
  DB.operaciones = DB.operaciones||[];
  DB.valores = DB.valores||{};
  DB.analisis = DB.analisis||[];
  (DB.analisis||[]).forEach(a=>{
    if(a.poMin==null&&a.poMax==null){ const o=num(a.precioObjetivo); a.poMin=o||0; a.poMax=o||0; }
    if(a.entMin==null&&a.entMax==null){ const e=num(a.precioEntrada); a.entMin=e||0; a.entMax=e||0; }
    if(a.rating==null)a.rating='';
    if(a.stopTesis==null)a.stopTesis=0;
    if(a.decision==null)a.decision='';
    if(a.dossierUrl==null)a.dossierUrl='';
    if(a.dossierFecha==null)a.dossierFecha='';
  });
  DB.dividendos = DB.dividendos||{};
  DB.divIngresos = DB.divIngresos||{};
  DB.cerradas = DB.cerradas||[];
  DB.devolucionHacienda = DB.devolucionHacienda||{};
  DB.calendario = DB.calendario||[];
  DB.previsionDiv = DB.previsionDiv||{};
  DB.divPorAccion = DB.divPorAccion||{};
  DB.simShares = DB.simShares||{};
  DB.previsionMaxYear = DB.previsionMaxYear||2030;
  DB.aniosConfirmados = DB.aniosConfirmados||{};
  DB.divConfirmado = DB.divConfirmado||{};
  DB.planLote = DB.planLote||[];
  DB.planLotePeriodo = DB.planLotePeriodo||{desde:2026,hasta:2034};
  DB.planTipo = DB.planTipo||{};
  DB.planDispFijo = DB.planDispFijo||{};
  DB.eventos = DB.eventos||{};
  DB.planCompras = DB.planCompras||{};
  DB.planPresupuesto = DB.planPresupuesto||{};
  DB.todos = DB.todos||[];
  DB.monitor = DB.monitor||{};
  DB.tesisHist = DB.tesisHist||{};
  DB.protocolo = DB.protocolo||{};
  DB.calibracion = DB.calibracion||{};
  DB.riesgoTags = DB.riesgoTags||{};
  DB.universo = DB.universo||{};
  DB.cola = DB.cola||[];
  DB.cadencia = DB.cadencia||{};
  if(DB.config.anaVerde==null)DB.config.anaVerde=0.20;
  if(DB.config.anaAmbar==null)DB.config.anaAmbar=0.05;
  if(DB.config && !DB.config.invModeloOps){
    if(DB.operaciones.length===0 && (DB.inversiones||[]).length){
      DB.inversiones.forEach(p=>{ const t=((p.ticker||p.nombre||'')+'').toUpperCase(); if(!t)return;
        DB.valores[t]={nombre:p.nombre||t,precioActual:num(p.precioActual),divAccion:num(p.divAccion),broker:p.broker||'',exchange:p.exchange||'BME'};
        if(num(p.acciones)>0) DB.operaciones.push({id:uid(),fecha:'',ticker:t,tipo:'compra',acciones:num(p.acciones),precio:num(p.precioCompra)});
      });
    }
    DB.config.invModeloOps=true; scheduleSave();
  }
  if(DB.config && !DB.config.estructuraReparto){
    const REMAP={'Comunidad':'Casa','Luz':'Casa','IBI / Tasa Basuras':'Casa','Seguro Casa':'Casa','Movistar':'Casa','Alarma Ring':'Casa','Pepephone':'Casa','Compras Varios':'Compras','Seguro Coche':'Coche','Impuesto Circulación':'Coche','Revisión / ITV':'Coche','Gasolina':'Coche','Gimnasio':'Deporte','Wikiloc':'Deporte','Komoot':'Deporte','Zwift':'Deporte','Meteoblue':'Deporte','Iru':'Gastos Varios','Aldeas Infantiles':'Gastos Varios','Comisiones / Custodia':'Gastos Varios','Transporte':'Gastos Varios','Google One':'Software Productividad','Claude Pro':'Software Productividad','Microsoft 365 / Norton':'Software Productividad','Investing.com':'Software Productividad','Filmora':'Software Productividad','YouTube Premium':'Software Entretenimiento','Amazon Prime':'Software Entretenimiento','Audible':'Software Entretenimiento','Alimentación':'Alimentación','Ocio':'Ocio','Vacaciones':'Vacaciones'};
    DB.categorias.forEach(c=>{ if(REMAP[c.nombre]) c.grupo=REMAP[c.nombre]; });
    DB.config.estructuraReparto=true; scheduleSave();
  }
  if(!DB.config) DB.config={};
  if(DB.config.objetivoReparto==null) DB.config.objetivoReparto=0.5;
  if(!DB.config.perfil){ DB.config.perfil={titulares:[{nombre:'Carlos',nomina:2448.64},{nombre:'Susana',nomina:2417.94}],email:'carlos220271@gmail.com'}; }
  if(!DB.config.comercioBaseV1){
    DB.config.comercioAlias=DB.config.comercioAlias||{};
    DB.config.negocioRules=DB.config.negocioRules||[];
    if(!DB.config.negocioRules.length && typeof NEGOCIO_SEED!=='undefined'){ NEGOCIO_SEED.forEach(function(r){ DB.config.negocioRules.push(r); }); }
    (DB.movimientos||[]).forEach(function(m){
      if(m.detalle==null) m.detalle = m.comercio||'';
      var b = (typeof baseComercio==='function') ? baseComercio(m.detalle) : '';
      m.comercio = b || m.detalle;
    });
    DB.config.comercioBaseV1=true; scheduleSave();
  }
  if(presYear==null){ const ys=presYears(); const cy=new Date().getFullYear(); presYear = ys.includes(cy)? cy : ys[0]; }
  initPeriod();
  fillCatSelects();
  fillGrupoList();
  fillPresYear();
  renderAll();
  if(typeof sincronizarCotizaciones==='function') sincronizarCotizaciones();
  if(typeof cargarDossiers==='function') cargarDossiers();
  const _fm=(location.hash||'').match(/ficha=([^&]+)/);
  if(_fm){ const h=document.querySelector('header'); if(h)h.style.display='none'; const m=$('#main'); if(m)m.style.display='none'; const fv=$('#fichaView'); if(fv)fv.style.display='block'; renderFicha(decodeURIComponent(_fm[1])); }
}

/* ---- Estado de una empresa para colorear filas (cartera / analizada) ---- */
/* Devuelve el Set de tickers con posición abierta en cartera. */
function heldTickerSet(){ var s=new Set(); try{ (typeof invPositions==='function'?invPositions():[]).forEach(function(p){ if(num(p.acciones)>0.0001) s.add((p.ticker||'').toUpperCase()); }); }catch(e){} return s; }
/* Fondo de fila: verde claro = en cartera; amarillo claro = analizada pero no comprada; '' = ninguno.
   Se le puede pasar un Set ya calculado (held) para no recomputarlo en cada fila. */
function statusRowBg(t,held){ t=(t||'').toUpperCase(); if(!t)return ''; held=held||heldTickerSet(); if(held.has(t))return '#dcfce7'; if(typeof _esAnalizada==='function'&&_esAnalizada(t))return '#fef9c3'; return ''; }

/* ---- Selectores de estado canónicos (única fuente de verdad) ----
   Evitan recomputar a mano estos conjuntos por todo el código (origen de desincronizaciones). */
/* Conjunto de tickers de posiciones cerradas (archivadas + calculadas). */
function closedTickerSet(){ var s=new Set(); (DB.cerradas||[]).forEach(function(c){ var t=(c.ticker||'').toUpperCase(); if(t)s.add(t); }); try{ (typeof invClosedComputed==='function'?invClosedComputed():[]).forEach(function(c){ var t=(c.ticker||'').toUpperCase(); if(t)s.add(t); }); }catch(e){} return s; }
/* Conjunto de tickers con importe planificado (>0) en el Plan. */
function enPlanTickerSet(){ var s=new Set(); var pc=DB.planCompras||{}; Object.keys(pc).forEach(function(t){ if(Object.values(pc[t]||{}).some(function(v){return num(v)>0;})) s.add((t||'').toUpperCase()); }); return s; }
/* Nº de acciones netas de un ticker en una cartera (compras − ventas), opcionalmente excluyendo una operación (para editar). */
function sharesHeldOf(ticker,cartera,excludeOpId){ ticker=(ticker||'').toUpperCase(); cartera=cartera||'Propia'; var sh=0; (DB.operaciones||[]).forEach(function(o){ if(excludeOpId&&o.id===excludeOpId)return; if((o.ticker||'').toUpperCase()===ticker && (o.cartera||'Propia')===cartera){ sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; }

/* ==================================================================
   MODO DEMO — enseñar la app sin exponer cifras reales
   ------------------------------------------------------------------
   • Inventa: cartera (con TUS empresas analizadas), operaciones,
     ingresos, gastos, dividendos, patrimonio, efectivo, proyección,
     plan de inversión y plan de ahorro.
   • Respeta: análisis, tesis, ratings, PO, valores/precios (públicos),
     universo, cola, método, informes (vienen de GitHub).
   • Mientras está activo NO se guarda NADA en Drive (saveNow/scheduleSave/
     bridge/backup están bloqueados). Al salir se RECARGA la página, de modo
     que los datos reales vuelven intactos desde Drive.
   ================================================================== */
window._demoOn = false;
let _demoRealDB = null;

/* hash estable (FNV-1a) para generar cantidades ficticias reproducibles */
function _demoHash(s){ s=''+s; let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

/* Categorías + presupuesto GENÉRICOS inventados (sustituyen los reales en la demo, para no
   mostrar nombres personales tipo "Nómina Carlos"/"Iru"). */
function _demoCatsPresupuesto(yNow){
  const defs=[
    ['Ingresos','Nómina titular 1','ingreso',1900,'mensual'],
    ['Ingresos','Nómina titular 2','ingreso',1650,'mensual'],
    ['Ingresos','Dividendos','ingreso',120,'mensual'],
    ['Ingresos','Otros ingresos','ingreso',0,'mensual'],
    ['Vivienda','Alquiler','gasto',850,'mensual'],
    ['Suministros','Luz y agua','gasto',90,'mensual'],
    ['Alimentación','Supermercado','gasto',400,'mensual'],
    ['Transporte','Gasolina','gasto',110,'mensual'],
    ['Internet y Teléfono','Internet y móvil','gasto',45,'mensual'],
    ['Ocio','Ocio y restaurantes','gasto',150,'mensual'],
    ['Deporte','Gimnasio','gasto',40,'mensual'],
    ['Compras','Compras varias','gasto',120,'mensual'],
    ['Seguros','Seguros hogar y coche','gasto',600,'anual']
  ];
  const categorias=[], presupuesto=[];
  defs.forEach(d=>{ const cid=uid(); categorias.push({id:cid,grupo:d[0],nombre:d[1],tipo:d[2]}); presupuesto.push({id:uid(),categoriaId:cid,importe:d[3],frecuencia:d[4],metodoPago:'',renovacion:'',anio:yNow}); });
  return {categorias:categorias, presupuesto:presupuesto};
}

/* Movimientos ficticios genéricos (nómina, supermercado, luz, gasolina, ocio…) para las
   pantallas de Ingresos/Gastos. Se reparten en los últimos 6 meses y se enlazan a las
   categorías por tipo/nombre cuando existen. */
function _demoMovimientos(D, yNow){
  const cats=(D.categorias||[]);
  const catByKw=(tipo, kws)=>{
    const c=cats.find(x=>x.tipo===tipo && kws.some(k=>((x.nombre||'')+' '+(x.grupo||'')).toLowerCase().includes(k)));
    return c ? c.id : (cats.find(x=>x.tipo===tipo)||{}).id || '';
  };
  const cIngNom=catByKw('ingreso',['nómina','nomina','salario','sueldo']);
  const cIngDiv=catByKw('ingreso',['dividendo','inversión','inversion']);
  const cGasHog=catByKw('gasto',['alquiler','hipoteca','casa','vivienda']);
  const cGasAli=catByKw('gasto',['aliment','superm','comida','compra']);
  const cGasSum=catByKw('gasto',['luz','agua','gas','sumin','electric']);
  const cGasTel=catByKw('gasto',['internet','teléfono','telefono','móvil','movil']);
  const cGasCoc=catByKw('gasto',['coche','gasolina','combustible','transporte']);
  const cGasOci=catByKw('gasto',['ocio','restaur','cena']);
  const cGasDep=catByKw('gasto',['deporte','gimnasio']);
  const mesNombre=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const out=[];
  const push=(fecha,concepto,comercio,tipo,imp,catId,titular)=>{ out.push({id:uid(),fecha:fecha,concepto:concepto,comercio:comercio,detalle:'',categoriaId:catId,titular:titular||'',tipo:tipo,importe:+(+imp).toFixed(2)}); };
  const now=new Date(); const y=yNow, m0=now.getMonth();   /* 0-based mes actual */
  const dstr=(yy,mm,dd)=>yy+'-'+String(mm+1).padStart(2,'0')+'-'+String(Math.min(dd,28)).padStart(2,'0');
  for(let back=5; back>=0; back--){
    let mm=m0-back, yy=y; while(mm<0){ mm+=12; yy--; }
    const h=_demoHash('mov'+yy+'-'+mm);
    /* --- Ingresos --- */
    push(dstr(yy,mm,25),'Nómina '+mesNombre[mm],'Empresa Demo S.L.','ingreso',1850+(h%180),cIngNom,'Titular 1');
    if((h>>>2)%2===0) push(dstr(yy,mm,26),'Nómina '+mesNombre[mm],'Servicios Demo S.A.','ingreso',1550+((h>>>4)%160),cIngNom,'Titular 2');
    if((h>>>6)%3===0) push(dstr(yy,mm,12),'Dividendos cobrados','Broker Demo','ingreso',60+((h>>>8)%140),cIngDiv,'Titular 1');
    /* --- Gastos recurrentes --- */
    push(dstr(yy,mm,1),'Alquiler vivienda','Inmobiliaria Demo','gasto',820+((h>>>3)%60),cGasHog,'Titular 1');
    push(dstr(yy,mm,8),'Factura de luz','Eléctrica Demo','gasto',48+((h>>>5)%55),cGasSum,'');
    push(dstr(yy,mm,10),'Internet y móvil','Telecom Demo','gasto',42+((h>>>7)%20),cGasTel,'');
    push(dstr(yy,mm,5),'Cuota gimnasio','Gimnasio Demo','gasto',35+((h>>>9)%15),cGasDep,'Titular 2');
    /* --- Supermercado: 3-4 compras/mes --- */
    const nSuper=3+((h>>>10)%2);
    for(let i=0;i<nSuper;i++){ const hi=_demoHash('sup'+yy+mm+i); push(dstr(yy,mm,4+i*7),'Compra supermercado',['Mercadona','Carrefour','Lidl','Alcampo'][hi%4],'gasto',38+(hi%75),cGasAli,''); }
    /* --- Gasolina --- */
    push(dstr(yy,mm,14),'Repostaje combustible','Gasolinera Demo','gasto',45+((h>>>11)%35),cGasCoc,'Titular 1');
    /* --- Ocio / restaurante --- */
    const nOcio=1+((h>>>12)%3);
    for(let i=0;i<nOcio;i++){ const hi=_demoHash('oci'+yy+mm+i); push(dstr(yy,mm,9+i*6),['Restaurante','Cine','Cañas','Café'][hi%4],['Bar Demo','Cines Demo','Cafetería Demo','Restaurante Demo'][hi%4],'gasto',12+(hi%48),cGasOci,''); }
  }
  out.sort((a,b)=>a.fecha<b.fecha?1:a.fecha>b.fecha?-1:0);
  return out;
}

/* Mazinger Z: repostajes ficticios (odómetro creciente, ~30 L, precio total del depósito). */
function _demoCombustible(yNow){
  const out=[]; let km=42000; const now=new Date(); const m0=now.getMonth();
  for(let back=9; back>=0; back--){
    let mm=m0-back, yy=yNow; while(mm<0){ mm+=12; yy--; }
    const h=_demoHash('fuel'+yy+mm);
    km += 480 + (h%320);                       /* +480–800 km entre repostajes */
    const litros = +(28 + (h%9) + (h%100)/100).toFixed(2);   /* ~28–37 L */
    const precio = +(litros*(1.55 + (h%18)/100)).toFixed(2);  /* €/L ~1.55–1.72 → importe total */
    const auton = 40 + (h%140);
    const fecha = yy+'-'+String(mm+1).padStart(2,'0')+'-'+String(6+(h%20)).padStart(2,'0');
    out.push({id:uid(), fecha:fecha, km:km, autonomia:auton, litros:litros, precio:precio});
  }
  return out;
}

function _demoBuild(real){
  const D = JSON.parse(JSON.stringify(real));   /* copia profunda: análisis, tesis, valores, universo… se conservan */
  const yNow = new Date().getFullYear();

  /* -------- Cartera ficticia con TUS empresas analizadas -------- */
  const anas = (D.analisis||[]).filter(a=>a && a.ticker);
  const priceOf = t=>{
    const v=(D.valores||{})[t]||{};
    const a=(anas.find(x=>(x.ticker||'').toUpperCase()===t)||{});
    return num(v.precioActual) || num(a.cotizacion) || 10;
  };
  const rank = x=>({COMPRAR:0,MANTENER:1,ESPERAR:2,VENDER:3}[(x.decision||'').toUpperCase()]);
  const pick = anas.slice().sort((a,b)=>{
    const ra=(rank(a)==null?2:rank(a)), rb=(rank(b)==null?2:rank(b));
    if(ra!==rb) return ra-rb;
    return _demoHash(a.ticker)-_demoHash(b.ticker);
  }).slice(0,12);   /* hasta 12 posiciones, priorizando COMPRAR/MANTENER */

  const ops=[], inv=[], dividendos={}, divIngresos={};
  pick.forEach(a=>{
    const t=(a.ticker||'').toUpperCase();
    const pa=priceOf(t); if(!(pa>0)) return;
    const h=_demoHash(t);
    const objetivo = 1500 + (h % 2600);                      /* 1.500–4.100 € por posición (inventado) */
    const acc = Math.max(1, Math.round(objetivo/pa));
    const pc = +(pa*(0.68 + ((h>>>3)%28)/100)).toFixed(4);    /* compra 68–95% del precio actual → plusvalía ficticia */
    const anioC = 2019 + (h % 6);                            /* 2019–2024 */
    const mesC = 1 + ((h>>>5)%12), diaC = 1 + ((h>>>7)%27);
    const fecha = anioC+'-'+String(mesC).padStart(2,'0')+'-'+String(diaC).padStart(2,'0');
    ops.push({id:uid(), fecha:fecha, ticker:t, cartera:'Propia', tipo:'compra', acciones:acc, precio:pc});
    const dpa = num(((D.valores||{})[t]||{}).divAccion) || num(a.divAccion) || 0;
    inv.push({id:uid(), ticker:t, nombre:a.nombre||t, acciones:acc, precioCompra:pc, precioActual:pa, divAccion:dpa, exchange:'', broker:'Broker Demo'});
    if(dpa>0){
      const arr=[]; const imp=+(dpa*0.5).toFixed(4);
      for(let y=anioC; y<=yNow; y++){
        arr.push({fecha:y+'-06-15', importe:imp, id:uid()});
        arr.push({fecha:y+'-12-15', importe:imp, id:uid()});
        divIngresos[t]=divIngresos[t]||{}; divIngresos[t][y]=+(dpa*acc).toFixed(2);
      }
      dividendos[t]=arr;
    }
  });
  D.operaciones=ops; D.inversiones=inv; D.dividendos=dividendos; D.divIngresos=divIngresos;
  D.cerradas=[]; D.devolucionHacienda={}; D.amalia=[];
  D.previsionDiv={}; D.divConfirmado={}; D.aniosConfirmados={};

  /* -------- Cuentas, movimientos y patrimonio ficticios (ahorrador modesto) -------- */
  const cuBanco=uid(), cuInv=uid();
  D.cuentas=[
    {id:cuBanco, nombre:'Cuenta corriente (demo)', tipo:'efectivo', naturaleza:'activo', saldoInicial:0},
    {id:cuInv,   nombre:'Broker Demo',             tipo:'inversion', naturaleza:'activo', saldoInicial:0}
  ];
  /* categorías y presupuesto genéricos inventados (sustituyen por completo los reales) */
  const _cp=_demoCatsPresupuesto(yNow); D.categorias=_cp.categorias; D.presupuesto=_cp.presupuesto;
  D.movimientos=_demoMovimientos(D, yNow);   /* nómina, supermercado, luz, gasolina… ficticios */
  D.combustible=_demoCombustible(yNow);       /* Mazinger Z: repostajes ficticios */
  const efectivoDemo=8500;
  const invCoste = Math.round(inv.reduce((s,x)=>s+x.acciones*x.precioCompra,0));
  const carteraVal = Math.round(inv.reduce((s,x)=>s+x.acciones*x.precioActual,0));
  const divBruto = Math.round(inv.reduce((s,x)=>s+x.acciones*x.divAccion,0));
  D.patrimonio=[{ id:uid(), fecha:(yNow-1)+'-12-31',
    lineas:[{cuentaId:cuBanco, ef:efectivoDemo, inv:0}, {cuentaId:cuInv, ef:0, inv:carteraVal}] }];
  D.cajaConfig={saldoIni:6000, hastaY:yNow, desdeM:1};

  /* (categorías y presupuesto ya reemplazados arriba por un set genérico inventado) */

  /* -------- Proyección ficticia (ahorrador modesto) -------- */
  D.config = D.config || {};
  D.config.proyeccion = {
    modeloEvo2:true, anioBase:yNow, edadActual:38, edadFin:90, edadFinAportar:67, anioTrasJub:yNow+29,
    efectivo:efectivoDemo, invertidoCoste:invCoste, carteraInicial:carteraVal, dividendoBruto:divBruto,
    nominaMes:2100, gastoMes:1600,
    crecCartera:0.04, crecDividendo:0.025, rpdNuevas:0.05, inflacionNomina:0.02, crecAhorro:0.01,
    aportacionDefault:6000, aportaciones:{}, eventos:[]
  };
  D.config.ahorro = {mensual:500, anual:6000};

  /* -------- Planes ficticios: se vacían los manuales para que hereden de la proyección demo -------- */
  D.planDispFijo={}; D.planPresupuesto={}; D.planCompras={}; D.simShares={};
  D.planLote=[]; D.planTipo={}; D.asignacion=[]; D.metas={};

  return D;
}

function _demoUI(on){
  const btn=document.getElementById('btnDemo');
  if(btn){ btn.textContent = on?'Salir demo':'Demo'; btn.title = on?'Salir del modo demo (recarga y vuelven tus datos reales)':'Entrar en modo demo (datos ficticios, no se guarda nada)'; btn.style.background = on?'#a21caf':''; btn.style.color = on?'#fff':'#a21caf'; }
  const ban=document.getElementById('demoBanner'); if(ban) ban.style.display = on?'flex':'none';
  try{ document.body.classList.toggle('demo-on', on); }catch(e){}
}

/* Carga SIN Drive: base vacía + empresas analizadas y precios desde el repo PÚBLICO de GitHub.
   Así el modo demo funciona aunque no inicies sesión (ideal para enseñar la app a otros). */
async function _demoLoadFromGitHub(){
  DB = (typeof seed==='function') ? seed() : {config:{},cuentas:[],categorias:[],presupuesto:[],movimientos:[]};
  DB.analisis=[]; DB.valores={}; DB.operaciones=[]; DB.inversiones=[];
  try{ if(typeof cargarDossiers==='function') await cargarDossiers(); }catch(e){}
  const tickers = Array.from((typeof _tesisSet!=='undefined' && _tesisSet) ? _tesisSet : []);
  for(const t of tickers){
    try{ if(typeof cargarTesis==='function'){ await cargarTesis(t); if(_tesisCache && _tesisCache[t] && typeof importTesis==='function') importTesis(t); } }catch(e){}
  }
  try{ if(typeof sincronizarCotizaciones==='function') await sincronizarCotizaciones(); }catch(e){}
}

async function toggleDemo(){
  if(!window._demoOn){
    window._demoOn = true;                 /* bloquea cualquier guardado desde ya */
    _demoUI(true);
    setFileStatus('warn','MODO DEMO — cargando…');
    try{
      if(!DB){ await _demoLoadFromGitHub(); }   /* sin Drive: trae análisis y precios de GitHub */
      DB = _demoBuild(DB);                        /* encima, cartera y finanzas ficticias */
    }catch(e){ console.error('demo',e); window._demoOn=false; _demoUI(false); alert('No se pudo construir el modo demo: '+e.message); return; }
    try{ if(typeof afterLoad==='function') afterLoad(); }catch(e){ console.error(e); }
    try{ if(typeof renderAllFull==='function') renderAllFull(); else if(typeof renderAll==='function') renderAll(); }catch(e){ console.error(e); }
    setFileStatus('warn','MODO DEMO — sin guardar');
  } else {
    /* salir: recargar (nada se ha escrito). Si estabas conectado, vuelven tus datos reales de Drive;
       si entraste sin conexión, vuelve la pantalla de inicio. */
    window._demoOn=false;
    location.reload();
  }
}

document.addEventListener('click', e=>{
  const b = e.target.closest && e.target.closest('#btnDemo, #btnDemoExit');
  if(!b) return;
  toggleDemo();
});

/* ===== P4.4 · ⚙ Configuración / Perfil (datos personales parametrizados) ===== */
function perfilTitulares(){ try{ var p=(DB.config&&DB.config.perfil)||{}; return (p.titulares||[]).map(function(t){return t.nombre;}).filter(Boolean); }catch(e){ return []; } }
function perfilEmail(){ try{ return (DB&&DB.config&&DB.config.perfil&&DB.config.perfil.email)||'carlos220271@gmail.com'; }catch(e){ return 'carlos220271@gmail.com'; } }
function _cfgEsc(x){ return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function _cfgCollect(){ var tit=[]; document.querySelectorAll('#cfgBody .cfgTn').forEach(function(inp){ var i=inp.getAttribute('data-i'); var nombre=(inp.value||'').trim(); var mInp=document.querySelector('#cfgBody .cfgTm[data-i="'+i+'"]'); var nom=mInp?parseFloat((''+mInp.value).replace(',','.')):NaN; tit.push({nombre:nombre,nomina:isFinite(nom)?nom:0}); }); var em=(document.getElementById('cfgEmail')||{}).value||''; return {titulares:tit,email:(''+em).trim()}; }
function renderCfg(draft){ var body=document.getElementById('cfgBody'); if(!body)return; var p=draft||((DB.config&&DB.config.perfil))||{titulares:[],email:''}; var rows=(p.titulares||[]).map(function(t,i){ return '<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center"><input class="cfgTn" data-i="'+i+'" value="'+_cfgEsc(t.nombre)+'" placeholder="Titular" style="flex:1"><input class="cfgTm" data-i="'+i+'" type="number" step="0.01" value="'+(t.nomina!=null?t.nomina:'')+'" placeholder="Nomina EUR/mes" style="width:130px"><button type="button" class="btn ghost sm" data-cfgdel="'+i+'" title="Quitar">X</button></div>'; }).join(''); body.innerHTML='<div class="muted" style="font-size:12px;margin-bottom:8px">Titulares del hogar y su nomina mensual (se usan en informes por titular y en el plan de ahorro).</div>'+rows+'<button type="button" class="btn ghost sm" id="cfgAddTit">+ Titular</button><div style="margin-top:12px"><label class="muted" style="font-size:12px">Email de Google Drive (login)</label><br><input id="cfgEmail" value="'+_cfgEsc(p.email||'')+'" style="width:100%;max-width:340px"></div>'; }
function abrirConfig(){ var dlg=document.getElementById('cfgDlg'); if(!dlg)return; renderCfg(); if(typeof dlg.showModal==='function'){ if(!dlg.open)dlg.showModal(); } else { dlg.setAttribute('open',''); } }
function guardarPerfilCfg(){ var d=_cfgCollect(); d.titulares=d.titulares.filter(function(t){return t.nombre;}); DB.config=DB.config||{}; DB.config.perfil=d; if(typeof saveNow==='function')saveNow(); if(typeof renderAll==='function')renderAll(); }
document.addEventListener('click',function(e){ if(!e.target||!e.target.closest)return;
  if(e.target.closest('#btnConfig')){ abrirConfig(); return; }
  if(e.target.closest('#cfgAddTit')){ var d=_cfgCollect(); d.titulares.push({nombre:'',nomina:0}); renderCfg(d); return; }
  var del=e.target.closest('[data-cfgdel]'); if(del){ var i=+del.getAttribute('data-cfgdel'); var d2=_cfgCollect(); d2.titulares.splice(i,1); renderCfg(d2); return; }
  if(e.target.closest('#cfgSave')){ guardarPerfilCfg(); return; }
});

/* ===== P4.3 · Hemeroteca de Análisis (dossiers por empresa) ===== */
function renderHemeroAnalisis(){
  var sec=document.getElementById('view-hemeroanalisis'); if(!sec)return;
  try{ if((!_dossierSet || !_dossierSet.size) && typeof cargarDossiers==='function'){ cargarDossiers().then(function(){ if(typeof renderHemeroAnalisis==='function')renderHemeroAnalisis(); }); } }catch(e){}
  var setT={};
  (DB.analisis||[]).forEach(function(a){ var t=(a.ticker||'').toUpperCase(); if(t)setT[t]=1; });
  try{ if(_dossierSet)_dossierSet.forEach(function(t){setT[t]=1;}); }catch(e){}
  try{ if(_tesisSet)_tesisSet.forEach(function(t){setT[t]=1;}); }catch(e){}
  var hoy=new Date();
  function meses(f){ if(!f)return null; var d=new Date(f+'T00:00:00'); if(isNaN(d))return null; return Math.round((hoy-d)/(1000*3600*24*30.4)); }
  var dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  var cfCol={A:'#16a34a',B:'#d97706',C:'#dc2626'}, rbCol={solida:'#16a34a',sensible:'#d97706'};
  var rows=Object.keys(setT).map(function(t){
    var a=(DB.analisis||[]).find(function(x){return (x.ticker||'').toUpperCase()===t;})||{};
    var j=(typeof _tesisCache!=='undefined'&&_tesisCache)?_tesisCache[t]:null;
    var dec=(a.decision||(j&&j.decision)||'').toUpperCase();
    var rating=a.rating||(j&&j.rating)||'';
    var score=(j&&j.score!=null&&j.score!=='')?j.score:null;
    var fecha=a.dossierFecha||(j&&j.fecha)||'';
    var cf=(j&&j.confianza)?(''+(j.confianza.nivel||'')).toUpperCase():'';
    var rb=(j&&j.robustez&&j.robustez.nivel)?(''+j.robustez.nivel).toLowerCase():'';
    var du=(typeof dossierURL==='function')?dossierURL(t,a.dossierUrl):'';
    return {t:t,nombre:a.nombre||(j&&j.empresa)||t,dec:dec,rating:rating,score:score,fecha:fecha,mm:meses(fecha),cf:cf,rb:rb,du:du,ds:(j&&j.dividendSafety)?j.dividendSafety:(a&&a.dividendSafety)||null};
  });
  var caduc=rows.filter(function(r){return r.mm!=null&&r.mm>12;}).length;
  var cfCn=rows.filter(function(r){return r.cf==='C';}).length;
  var dsRiskN=rows.filter(function(r){return r.ds&&r.ds.score!=null&&r.ds.score<60;}).length;
  var _dsCol=function(b){return {'Muy seguro':'#16a34a','Seguro':'#4d7c0f','Vigilar':'#d97706','Frágil':'#ea580c','Recorte probable':'#dc2626'}[b]||'#64748b';};
  var _dsCell=function(ds){ if(!ds)return '—'; var c=_dsCol(ds.banda); var tip=((ds.banda||'Pte.')+(ds.rama?' ('+ds.rama+')':'')+(ds.topeDuro&&ds.topeDuro.activo?' · TOPE: '+ds.topeDuro.motivo:'')).replace(/"/g,'&quot;'); var lab=(ds.score!=null?ds.score:'n/a'); return '<span title="'+tip+'" style="cursor:help;background:'+c+';color:#fff;border-radius:6px;padding:2px 8px;font-size:10.5px;font-weight:700;display:inline-block">'+lab+'</span>'; };
  var comprarN=rows.filter(function(r){return r.dec==='COMPRAR';}).length;
  var DECORD={COMPRAR:0,MANTENER:1,ESPERAR:2,VENDER:3};
  var ord=window._hemaOrd||'fecha'; var soloCaduc=!!window._hemaCaduc;
  var view=rows.slice();
  if(soloCaduc)view=view.filter(function(r){return r.mm!=null&&r.mm>12;});
  view.sort(function(a,b){
    if(ord==='ticker')return a.t.localeCompare(b.t);
    if(ord==='dec')return (DECORD[a.dec]==null?9:DECORD[a.dec])-(DECORD[b.dec]==null?9:DECORD[b.dec]);
    if(ord==='cal')return (b.score||0)-(a.score||0);
    return (b.fecha||'').localeCompare(a.fecha||'');
  });
  var bdg=function(txt,col){ return '<span style="background:'+col+';color:#fff;border-radius:6px;padding:2px 8px;font-size:10.5px;font-weight:700;display:inline-block">'+txt+'</span>'; };
  var trs=view.map(function(r){
    var decC=r.dec?('<b style="color:'+(dc[r.dec]||'#475569')+'">'+r.dec+'</b>'):'<span class="muted">—</span>';
    var fC=r.fecha?('<span style="color:'+(r.mm!=null&&r.mm>12?'#dc2626':'#64748b')+'">'+r.fecha+(r.mm!=null?' · '+r.mm+'m'+(r.mm>12?' ⚠️':''):'')+'</span>'):'<span class="muted">—</span>';
    var cfC=r.cf?bdg(r.cf,cfCol[r.cf]||'#64748b'):'—';
    var rbC=r.rb?bdg(r.rb==='solida'?'sólida':r.rb,rbCol[r.rb]||'#64748b'):'—';
    var docC=r.du?('<a class="opb" href="'+r.du+'" target="_blank" rel="noopener">📄 Abrir</a>'):'<span class="muted" style="font-size:11px">sin HTML</span>';
    var cal=(r.rating||'—')+(r.score!=null?' · '+Math.round(r.score):'');
    var dsC=_dsCell(r.ds);
    return '<tr><td class="l tkc"><b class="tk" data-ficha="'+r.t+'">'+r.t+'</b></td><td class="l">'+_cfgEsc(r.nombre)+'</td><td class="l">'+decC+'</td><td>'+cal+'</td><td class="l">'+fC+'</td><td style="text-align:center">'+cfC+'</td><td style="text-align:center">'+rbC+'</td><td style="text-align:center">'+dsC+'</td><td style="text-align:right">'+docC+'</td></tr>';
  }).join('');
  var mcards=view.map(function(r){
    var cal=(r.rating||'—')+(r.score!=null?' · '+Math.round(r.score):'');
    var docC=r.du?('<a class="opb sm" href="'+r.du+'" target="_blank" rel="noopener">📄 Dossier</a>'):'<span class="muted" style="font-size:11px">sin HTML</span>';
    return '<div class="acard'+(r.mm!=null&&r.mm>12?' warn':'')+'"><div class="ac-h"><div class="ac-tk" data-ficha="'+r.t+'">'+r.t+' <span class="ac-nm">'+_cfgEsc(r.nombre)+'</span></div><b class="ac-dec" style="color:'+(dc[r.dec]||'#475569')+'">'+(r.dec||'—')+'</b></div>'
      +'<div class="ac-badges">'+bdg('Cal '+cal,'#475569')+(r.cf?bdg('Conf. '+r.cf,cfCol[r.cf]||'#64748b'):'')+(r.rb?bdg(r.rb==='solida'?'sólida':r.rb,rbCol[r.rb]||'#64748b'):'')+(r.ds?bdg('💧 '+(r.ds.score!=null?r.ds.score:'n/a'),_dsCol(r.ds.banda)):'')+'</div>'
      +'<div class="ac-foot"><span class="ac-f" style="color:'+(r.mm!=null&&r.mm>12?'#dc2626':'#64748b')+'">'+(r.fecha?(r.fecha+(r.mm!=null?' · '+r.mm+'m'+(r.mm>12?' ⚠️ reanalizar':''):'')):'—')+'</span>'+docC+'</div></div>';
  }).join('');
  var sel=function(v,t){ return '<option value="'+v+'"'+(ord===v?' selected':'')+'>'+t+'</option>'; };
  var toolbar='<div class="hema-toolbar"><label>Ordenar por</label><select id="hemaOrd">'+sel('fecha','Fecha (reciente)')+sel('ticker','Ticker')+sel('dec','Decisión')+sel('cal','Calidad')+'</select>'
    +'<span class="hema-chip'+(soloCaduc?' on':'')+'" id="hemaCaduc">⚠️ Solo a reanalizar'+(caduc?(' ('+caduc+')'):'')+'</span></div>';
  sec.innerHTML='<h2>🗄️ Hemeroteca de Análisis</h2>'+
    '<div class="sub" style="margin-bottom:12px">Todas las empresas con dossier o análisis. Pulsa el ticker para abrir su ficha o «Abrir» para el dossier. Necesita conexión para leer los dossiers del repo.</div>'+
    '<div id="hemaKpis" class="hem-kpis">'
      +'<div class="k hero"><div class="l">Empresas con análisis</div><div class="v">'+rows.length+'</div><div class="p">dossier o análisis guardado</div></div>'
      +'<div class="k"><div class="l">A reanalizar (&gt;12 m)</div><div class="v '+(caduc?'neg':'')+'">'+caduc+'</div><div class="p">dossier caducado</div></div>'
      +'<div class="k"><div class="l">Confianza C</div><div class="v '+(cfCn?'neg':'')+'">'+cfCn+'</div><div class="p">no comprar en firme</div></div>'
      +'<div class="k"><div class="l">Dividendo a vigilar</div><div class="v '+(dsRiskN?'neg':'')+'">'+dsRiskN+'</div><div class="p">safety &lt; 60</div></div>'
      +'<div class="k"><div class="l">Decisión COMPRAR</div><div class="v '+(comprarN?'pos':'')+'">'+comprarN+'</div><div class="p">oportunidad activa</div></div>'
    +'</div>'+
    toolbar+
    '<div class="hem-panel"><div class="hem-desk"><table><thead><tr><th class="tkc">Ticker</th><th>Empresa</th><th>Decisión</th><th>Calidad</th><th>Análisis</th><th style="text-align:center">Confianza</th><th style="text-align:center">Robustez</th><th style="text-align:center" title="Dividend Safety Score 0-100: seguridad del dividendo">Seguridad div.</th><th style="text-align:right">Dossier</th></tr></thead><tbody>'+(trs||'<tr><td colspan="9" class="muted">Sin dossiers cargados todavía (requiere conexión).</td></tr>')+'</tbody></table></div><div class="hem-mob">'+(mcards||'<div class="muted">Sin dossiers cargados todavía (requiere conexión).</div>')+'</div></div>';
  var _os=document.getElementById('hemaOrd'); if(_os)_os.addEventListener('change',function(){ window._hemaOrd=this.value; renderHemeroAnalisis(); });
  var _cc=document.getElementById('hemaCaduc'); if(_cc)_cc.addEventListener('click',function(){ window._hemaCaduc=!window._hemaCaduc; renderHemeroAnalisis(); });
}

/* ===== P4.1 · Cockpit de Salud del sistema ===== */
function _saludHeld(){ var sh={}; (DB.operaciones||[]).forEach(function(o){ var t=(o.ticker||'').toUpperCase(); if(!t)return; sh[t]=(sh[t]||0)+(o.tipo==='venta'?-1:1)*num(o.acciones); }); return Object.keys(sh).filter(function(t){return sh[t]>0.0001;}); }
function renderSalud(){
  var sec=document.getElementById('view-salud'); if(!sec)return;
  var held=_saludHeld();
  var anaSet={}; (DB.analisis||[]).forEach(function(a){var t=(a.ticker||'').toUpperCase(); if(t)anaSet[t]=a;});
  var dSet=(typeof _dossierSet!=='undefined'&&_dossierSet)?_dossierSet:new Set();
  var jSet=(typeof _tesisSet!=='undefined'&&_tesisSet)?_tesisSet:new Set();
  var cache=(typeof _tesisCache!=='undefined'&&_tesisCache)?_tesisCache:{};
  var warns=(typeof _tesisWarn!=='undefined'&&_tesisWarn)?_tesisWarn:{};
  var hoy=new Date();
  function meses(f){ if(!f)return null; var d=new Date(f+'T00:00:00'); if(isNaN(d))return null; return Math.round((hoy-d)/(1000*3600*24*30.4)); }
  var refF=''; Object.keys(DB.valores||{}).forEach(function(t){ var f=(DB.valores[t]||{}).precioFecha||''; if(f>refF)refF=f; });
  var refMs=refF?Date.parse(refF+'T00:00:00'):0;
  var staleN=0; held.forEach(function(t){ var f=((DB.valores||{})[t]||{}).precioFecha||''; if(!f){staleN++;return;} var dd=(refMs-Date.parse(f+'T00:00:00'))/(864e5); if(dd>7)staleN++; });
  var viejosN=0; Object.keys(anaSet).forEach(function(t){ var a=anaSet[t]; var j=cache[t]; var f=a.dossierFecha||(j&&j.fecha)||''; var m=meses(f); if(m!=null&&m>12)viejosN++; });
  var warnN=0; Object.keys(warns).forEach(function(t){ var w=warns[t]; if(w&&w.warns)warnN+=w.warns.length; });
  var carteraSin=held.filter(function(t){ return !dSet.has(t) && !anaSet[t]; });
  var htmlSinJson=[]; dSet.forEach(function(t){ if(!jSet.has(t))htmlSinJson.push(t); });
  var jsonSinAna=[]; jSet.forEach(function(t){ if(!anaSet[t])jsonSinAna.push(t); });
  var anaSinDoss=Object.keys(anaSet).filter(function(t){ return !dSet.has(t); });
  var huerfN=carteraSin.length+htmlSinJson.length+jsonSinAna.length+anaSinDoss.length;
  var cfC=0,rbS=0; Object.keys(cache).forEach(function(t){ var j=cache[t]; if(!j)return; if(j.confianza&&(''+(j.confianza.nivel||'')).toUpperCase()==='C')cfC++; if(j.robustez&&(''+(j.robustez.nivel||'')).toLowerCase()==='sensible')rbS++; });
  var specs=[
    {tit:'Frescura de cotizaciones', val:staleN===0?'Al día':staleN+' desactualizadas', est:staleN===0?'ok':(staleN<=2?'warn':'bad'), det:'Última fecha del repo: '+(refF||'—')+'. Empresas en cartera con cotización de más de 7 días respecto a esa fecha.', goto:'posiciones'},
    {tit:'Antigüedad de dossiers', val:viejosN===0?'Todos recientes':viejosN+' caducados', est:viejosN===0?'ok':(viejosN<=2?'warn':'bad'), det:'Análisis con dossier de más de 12 meses (conviene reanalizar).', goto:'hemeroanalisis'},
    {tit:'Avisos de esquema (JSON)', val:warnN===0?'Sin avisos':warnN+' avisos', est:warnN===0?'ok':'warn', det:'Campos incorrectos detectados por el validador en los dossiers cargados.', goto:'hemeroanalisis'},
    {tit:'Huérfanos y desincronías', val:huerfN===0?'Nada suelto':huerfN+' incidencias', est:huerfN===0?'ok':(huerfN<=3?'warn':'bad'), det:'Cartera sin dossier ('+carteraSin.length+') · HTML sin JSON ('+htmlSinJson.length+') · JSON sin importar ('+jsonSinAna.length+') · análisis sin dossier ('+anaSinDoss.length+').', goto:'hemeroanalisis'},
    {tit:'Señales del método', val:(cfC+rbS)===0?'Sin banderas':(cfC+' conf. C · '+rbS+' sensible'), est:(cfC+rbS)===0?'ok':'warn', det:'Empresas con Confianza C (regla dura de no comprar en firme) o Robustez sensible.', goto:'analisis'}
  ];
  var ICO={ok:'✓',warn:'⚠',bad:'✕'}, ord={ok:0,warn:1,bad:2}, worst='ok';
  specs.forEach(function(s){ if(ord[s.est]>ord[worst])worst=s.est; });
  var nbad=specs.filter(function(s){return s.est==='bad';}).length, nwarn=specs.filter(function(s){return s.est==='warn';}).length, nok=specs.filter(function(s){return s.est==='ok';}).length;
  var scard=function(s){ return '<div class="scard '+s.est+'"><div class="sc-h"><span class="sc-ico">'+ICO[s.est]+'</span><b>'+s.tit+'</b>'+(s.goto?'<button class="sc-go" onclick="activarVista(\''+s.goto+'\')">ir →</button>':'')+'</div><div class="sc-v">'+s.val+'</div><div class="sc-d">'+s.det+'</div></div>'; };
  var cardHTML=specs.map(scard).join('');
  var allok=nbad===0&&nwarn===0;
  var heroTxt=allok?'Todo en orden':((nbad?(nbad+' incidencia'+(nbad>1?'s':'')):'')+((nbad&&nwarn)?' · ':'')+(nwarn?(nwarn+' aviso'+(nwarn>1?'s':'')):''));
  var heroSub=allok?'los 5 indicadores en verde':(nok+' de 5 indicadores en verde · revisa lo marcado');
  var hico=allok?'🟢':(nbad?'🔴':'🟠');
  var hero='<div class="salud-hero '+worst+'"><div class="hico">'+hico+'</div><div><div class="hl">Estado general</div><div class="hv">'+heroTxt+'</div><div class="hp">'+heroSub+'</div></div></div>';
  sec.innerHTML='<h2>🩺 Salud del sistema</h2><div class="sub" style="margin-bottom:12px">Estado de calidad del sistema. Los cinco indicadores se calculan en el navegador con lo que la app ya tiene cargado; los controles de escritorio se leen de <code>salud_estado.json</code> (lo genera <code>generar_salud.py</code> en tu ordenador).</div>'+hero+'<div class="salud-grid">'+cardHTML+'</div><div id="saludDesktop" style="margin-top:12px"></div>';
  var box=document.getElementById('saludDesktop'); if(!box)return;
  fetch('salud_estado.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
    if(!j){ box.innerHTML='<div class="dsec"><div class="dsec-t">🖥️ Controles de escritorio</div><div class="muted" style="font-size:12px">Linter de dossiers y sincronía repo ↔ carpetas.</div><div class="dnote">No hay <code>salud_estado.json</code> en el repo todavía. Ejecuta <code>generar_salud.py</code> en tu ordenador y súbelo para ver aquí el linter completo y la sincronía repo↔carpetas.</div></div>'; return; }
    function dcard(tit,o){ var ok=o&&o.ok; return '<div class="scard '+(ok?'ok':'bad')+'"><div class="sc-h"><span class="sc-ico">'+(ok?'✓':'✕')+'</span><b>'+tit+'</b></div><div class="sc-d" style="margin-top:4px">'+((o&&o.detalle)||'')+'</div></div>'; }
    box.innerHTML='<div class="dsec"><div class="dsec-t">🖥️ Controles de escritorio</div><div class="muted" style="font-size:12px;margin-bottom:8px">generado '+(j.generado||'—')+'</div><div class="salud-grid">'+dcard('Linter de dossiers (completo)',j.linter)+dcard('Sincronía repo ↔ carpetas',j.sincronia)+'</div></div>';
  }).catch(function(){ if(box)box.innerHTML=''; });
}

