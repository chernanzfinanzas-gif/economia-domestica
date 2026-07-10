
"use strict";
/* ============ Utilidades ============ */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const eur = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
const fmt = n => eur.format(n||0);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const num = v => { const n = parseFloat(v); return isNaN(n)?0:n; };

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
    client_id:GD.clientId, scope:SCOPE, login_hint:'carlos220271@gmail.com',
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
async function driveFindId(){
  const q=encodeURIComponent("name='"+FNAME+"' and trashed=false");
  const r=await gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,name)&pageSize=1');
  if(!r.ok) throw new Error('Drive '+r.status);
  const j=await r.json(); return (j.files&&j.files[0])?j.files[0].id:null;
}
async function driveLoad(){
  fileId=await driveFindId(); if(!fileId) return null;
  const r=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'?alt=media');
  if(!r.ok) throw new Error('Drive read '+r.status);
  return await r.json();
}
async function driveSave(){
  const body=JSON.stringify(DB,null,2);
  if(!fileId){
    const meta={name:FNAME};
    const b='-----econ'+Date.now();
    const mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
    const r=await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp});
    if(!r.ok) throw new Error('Drive create '+r.status);
    const j=await r.json(); fileId=j.id;
  } else {
    const r=await gfetch('https://www.googleapis.com/upload/drive/v3/files/'+fileId+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body});
    if(!r.ok) throw new Error('Drive save '+r.status);
  }
}
function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveNow,600); }
async function saveNow(){
  if(!DB) return;
  setFileStatus('warn','Guardando…');
  try{ await driveSave(); setFileStatus('ok','Guardado en Drive ✓'); }
  catch(e){ setFileStatus('warn','Error al guardar'); console.error(e); }
}

async function startSession(){
  $('#btnLogout').style.display='inline-block'; var _bb=$('#btnBackup'); if(_bb)_bb.style.display='inline-block'; var _br=$('#btnRestore'); if(_br)_br.style.display='inline-block';
  setFileStatus('warn','Cargando…');
  try{
    const data=await driveLoad();
    if(data){ DB=data; afterLoad(); setFileStatus('ok','Google Drive ✓'); }
    else { showWelcome('import'); setFileStatus('warn','Sin datos en Drive'); }
  }catch(e){ console.error(e); setFileStatus('warn','Error al cargar'); alert('No se pudieron cargar los datos de Drive: '+e.message); }
}
async function importLocal(file){
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
async function cargarDossiers(){ try{ const r=await fetch('https://api.github.com/repos/chernanzfinanzas-gif/economia-domestica/contents/dossiers',{cache:'no-store'}); if(!r.ok)return; const arr=await r.json(); if(!Array.isArray(arr))return; const set=new Set(); const jset=new Set(); arr.forEach(f=>{ const n=(f&&f.name)||''; if(/\.html$/i.test(n)) set.add(n.replace(/\.html$/i,'').toUpperCase()); else if(/\.json$/i.test(n)) jset.add(n.replace(/\.json$/i,'').toUpperCase()); }); _dossierSet=set; _tesisSet=jset; if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof renderInv==='function')renderInv(); if(fichaTicker&&typeof renderFicha==='function')renderFicha(fichaTicker); }catch(e){} }
function guardarTesisSnap(t,fecha){ t=(t||'').toUpperCase(); const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(!a)return; fecha=fecha||new Date().toISOString().slice(0,10);
  const mn=num(a.poMin),mx=num(a.poMax),md=(mn&&mx)?(mn+mx)/2:(mx||mn||0);
  const snap={fecha:fecha,decision:(a.decision||'').toUpperCase(),rating:(a.rating||'').toUpperCase(),score:(typeof cmpScore==='function')?cmpScore(a):null,poBear:mn,poBase:md,poBull:mx,cotizacion:num(a.cotizacion)};
  DB.tesisHist=DB.tesisHist||{}; const arr=DB.tesisHist[t]=DB.tesisHist[t]||[]; const ix=arr.findIndex(x=>x.fecha===fecha); if(ix>=0)arr[ix]=snap; else arr.push(snap); arr.sort((x,y)=>(x.fecha||'').localeCompare(y.fecha||'')); }
function tesisHistHTML(t){ t=(t||'').toUpperCase(); const arr=((DB.tesisHist||{})[t]||[]).slice().sort((x,y)=>(y.fecha||'').localeCompare(x.fecha||''));
  const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t)||{}; const ahora=num(a.cotizacion); const dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'};
  let rows='';
  arr.forEach(sn=>{ const then=num(sn.cotizacion); const rent=(then&&ahora)?(ahora/then-1):null; const d=(sn.decision||'').toUpperCase(); let mk='—',mc='#64748b';
    if(rent!=null){ if(d==='COMPRAR'||d==='MANTENER'){ mk=rent>=0?'✓ acertada':'✗ a la baja'; mc=rent>=0?'#16a34a':'#dc2626'; } else if(d==='VENDER'){ mk=rent<0?'✓ acertada':'✗ subió'; mc=rent<0?'#16a34a':'#dc2626'; } else if(d==='ESPERAR'){ if(rent>0.05){mk='se escapó +'+(rent*100).toFixed(0)+'%';mc='#d97706';} else if(rent<0){mk='✓ bien esperado';mc='#16a34a';} else {mk='neutral';mc='#64748b';} } }
    rows+=`<tr><td>${sn.fecha||'—'}</td><td><b style="color:${dc[d]||'#475569'}">${d||'—'}</b></td><td class="num">${sn.rating||'—'}${sn.score!=null?' · '+Math.round(sn.score):''}</td><td class="num">${sn.poBase!=null&&sn.poBase!==0?fmt(sn.poBase):'—'}</td><td class="num">${then?fmt(then):'—'}</td><td class="num ${rent!=null?(rent>=0?'pos':'neg'):''}">${rent==null?'—':(rent>=0?'+':'')+(rent*100).toFixed(1)+'%'}</td><td style="color:${mc};font-size:11px;white-space:nowrap">${mk}</td><td class="right"><button class="btn ghost sm" data-deltesissnap="${t}|${sn.fecha}" title="Borrar foto">✕</button></td></tr>`; });
  const body=rows||'<tr><td colspan="8" class="muted" style="font-size:12px">Aún no hay fotos de la tesis. Se guardan al actualizar desde el dossier o con «+ Guardar foto».</td></tr>';
  return `<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><div style="font-weight:800;font-size:15px">Histórico de tesis y resultado</div><div style="flex:1"></div><button class="btn ghost sm" data-savetesis="${t}">+ Guardar foto</button></div><div class="sub" style="margin-bottom:6px">Cada foto compara la cotización de entonces con la de ahora (${fmt(ahora)}) para ver si la decisión acertó.</div><div style="overflow:auto"><table><thead><tr><th>Fecha</th><th>Decisión</th><th class="num">Rating·Score</th><th class="num">PO base</th><th class="num">Cotiz. entonces</th><th class="num">Rentab. desde</th><th>Resultado</th><th></th></tr></thead><tbody>${body}</tbody></table></div></div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-savetesis]'); if(!b)return; if(typeof guardarTesisSnap==='function')guardarTesisSnap(b.dataset.savetesis); if(typeof saveNow==='function')saveNow(); if(typeof renderFicha==='function'&&fichaTicker)renderFicha(fichaTicker); });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-deltesissnap]'); if(!b)return; const a=(b.dataset.deltesissnap||'').split('|'); const t=a[0],f=a[1]; if(DB.tesisHist&&DB.tesisHist[t]){ DB.tesisHist[t]=DB.tesisHist[t].filter(x=>x.fecha!==f); if(typeof saveNow==='function')saveNow(); if(typeof renderFicha==='function'&&fichaTicker)renderFicha(fichaTicker); } });
function importTesis(t){ t=(t||'').toUpperCase(); const j=_tesisCache[t]; if(!j)return false; DB.analisis=DB.analisis||[]; let a=DB.analisis.find(x=>(x.ticker||'').toUpperCase()===t); if(!a){ a={id:uid(),ticker:t,nombre:j.empresa||t,cotizacion:num(((DB.valores||{})[t]||{}).precioActual)}; DB.analisis.push(a); } if(j.rating)a.rating=(''+j.rating).toUpperCase(); if(j.decision)a.decision=(''+j.decision).toUpperCase(); if(j.poBear!=null&&j.poBear!=='')a.poMin=num(j.poBear); if(j.poBull!=null&&j.poBull!=='')a.poMax=num(j.poBull); if(j.entMin!=null&&j.entMin!=='')a.entMin=num(j.entMin); if(j.entMax!=null&&j.entMax!=='')a.entMax=num(j.entMax); if(j.stop!=null&&j.stop!=='')a.stopTesis=num(j.stop); if(j.fecha)a.dossierFecha=j.fecha; const pmn=num(a.poMin),pmx=num(a.poMax); a.precioObjetivo=(pmn&&pmx)?(pmn+pmx)/2:(pmx||pmn||0); a.precioEntrada=num(a.entMax); if(typeof guardarTesisSnap==='function')guardarTesisSnap(t,j.fecha); return true; }
function validarTesisJSON(j){ const out={warns:[],info:[]}; if(!j||typeof j!=='object'){ out.warns.push('El archivo no es un objeto JSON valido.'); return out; } const KNOWN={ticker:1,empresa:1,fecha:1,rating:1,score:1,decision:1,metodoValoracion:1,poBear:1,poBase:1,poBull:1,entMin:1,entMax:1,stop:1,moat:1,catalizadores:1,riesgos:1,bull:1,bear:1,resumen:1}; const NUMK=['score','poBear','poBase','poBull','entMin','entMax','stop']; const ARRK=['catalizadores','riesgos']; const REC=['decision','rating','poBear','poBull','fecha']; const norm=x=>(''+x).toLowerCase().replace(/[^a-z0-9]/g,''); Object.keys(j).forEach(k=>{ if(!KNOWN[k]){ let h=''; const nk=norm(k); Object.keys(KNOWN).forEach(kk=>{ if(norm(kk)===nk) h=' (quiza querias "'+kk+'")'; }); out.warns.push('Campo no reconocido: "'+k+'"'+h+' - se ignora.'); } }); NUMK.forEach(k=>{ if(j[k]!=null&&j[k]!==''&&isNaN(parseFloat((''+j[k]).replace(',','.')))) out.warns.push('"'+k+'" deberia ser numerico (valor: '+JSON.stringify(j[k])+').'); }); ARRK.forEach(k=>{ if(j[k]!=null&&!Array.isArray(j[k])) out.warns.push('"'+k+'" deberia ser una lista [] o no se mostrara.'); }); const dec=(j.decision||'').toUpperCase(); if(dec&&['COMPRAR','MANTENER','ESPERAR','VENDER'].indexOf(dec)<0) out.warns.push('decision="'+j.decision+'" no es COMPRAR/MANTENER/ESPERAR/VENDER.'); const b=num(j.poBear),u=num(j.poBull); if(b&&u&&b>u) out.warns.push('poBear ('+b+') es mayor que poBull ('+u+'): puede que esten invertidos.'); REC.forEach(k=>{ if(j[k]==null||j[k]==='') out.info.push('falta "'+k+'"'); }); return out; }
function tesisCardHTML(j){ if(!j||typeof j!=='object')return '';
  const dc={COMPRAR:'#16a34a',MANTENER:'#2563eb',ESPERAR:'#d97706',VENDER:'#dc2626'}; const d=(j.decision||'').toUpperCase(); const _mm=(j.fecha&&typeof mesesDesde==='function')?mesesDesde(j.fecha):null; const _wk=(j.ticker||fichaTicker||'').toUpperCase(); const _w=(typeof _tesisWarn!=='undefined')?_tesisWarn[_wk]:null; const warnHTML=(_w&&((_w.warns&&_w.warns.length)||(_w.info&&_w.info.length)))?`<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:8px;margin-bottom:8px;font-size:12px">${(_w.warns&&_w.warns.length)?'<div style="color:#9a3412;font-weight:700">\u26a0\ufe0f Avisos del JSON del dossier</div><ul style="margin:4px 0 0 16px;padding:0;color:#7c2d12">'+_w.warns.map(x=>'<li>'+x+'</li>').join('')+'</ul>':''}${(_w.info&&_w.info.length)?'<div style="color:#92400e;font-size:11px;margin-top:6px">Campos recomendados: '+_w.info.join(', ')+'.</div>':''}</div>`:'';
  const po=(l,v,c)=>`<div style="flex:1;min-width:88px;background:${c};border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#475569">${l}</div><div style="font-weight:800;font-size:16px">${(v!=null&&v!=='')?fmt(num(v)):'—'}</div></div>`;
  const lst=a=>Array.isArray(a)&&a.length?('<ul style="margin:4px 0 0 16px;padding:0">'+a.map(x=>`<li style="margin:2px 0">${x}</li>`).join('')+'</ul>'):'<span class="muted">—</span>';
  const _tk=(j.ticker||fichaTicker||'').toUpperCase(); const _du=(typeof dossierURL==='function')?dossierURL(_tk,((DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===_tk)||{}).dossierUrl):'';
  return `<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><div style="font-weight:800;font-size:16px">Resumen del dossier</div>${d?`<span style="font-weight:800;color:${dc[d]||'#475569'}">${d}</span>`:''}${j.rating?` <span style="font-size:12px">Calidad <b>${j.rating}</b></span>`:''}${(j.score!=null&&j.score!=='')?` <span style="font-size:12px">Score <b>${j.score}</b></span>`:''}${j.fecha?` <span style="font-size:11px;color:${(_mm!=null&&_mm>12)?'#dc2626':'#64748b'}">${j.fecha}${_mm!=null?' · hace '+_mm+' m'+(_mm>12?' ⚠️ reanalizar':''):''}</span>`:''}<div style="flex:1"></div>${_du?`<a class="btn sm" href="${_du}" target="_blank" rel="noopener">📄 Abrir dossier</a>`:''}<button class="btn ghost sm" data-imptesis="${(j.ticker||fichaTicker||'').toUpperCase()}">Actualizar Análisis desde dossier</button></div>${warnHTML}${j.resumen?`<div style="margin-bottom:8px">${j.resumen}</div>`:''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">${po('PO bear',j.poBear,'#fee2e2')}${po('PO base',j.poBase,'#e0f2fe')}${po('PO bull',j.poBull,'#dcfce7')}</div>${j.metodoValoracion?`<div class="muted" style="font-size:11px;margin-bottom:6px">Método de valoración: ${j.metodoValoracion}</div>`:''}${j.moat?`<div style="margin:4px 0"><b>Moat:</b> ${j.moat}</div>`:''}<div style="display:flex;gap:14px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b style="color:#16a34a">Catalizadores</b>${lst(j.catalizadores)}</div><div style="flex:1;min-width:200px"><b style="color:#dc2626">Riesgos</b>${lst(j.riesgos)}</div></div>${(j.bull||j.bear)?`<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px">${j.bull?`<div style="flex:1;min-width:200px;background:#f0fdf4;border-radius:8px;padding:8px"><b style="color:#16a34a">A favor</b><div>${j.bull}</div></div>`:''}${j.bear?`<div style="flex:1;min-width:200px;background:#fef2f2;border-radius:8px;padding:8px"><b style="color:#dc2626">En contra</b><div>${j.bear}</div></div>`:''}</div>`:''}</div>`;
}
async function cargarTesis(t){ t=(t||'').toUpperCase(); if(!t||_tesisCache[t]!==undefined)return; _tesisCache[t]=null;
  try{ const r=await fetch('dossiers/'+t+'.json',{cache:'no-store'}); if(r.ok){ const j=await r.json(); if(j&&typeof j==='object'){ _tesisCache[t]=j; if(typeof validarTesisJSON==='function')_tesisWarn[t]=validarTesisJSON(j);
    const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); const vacia=!a||(!a.rating&&!num(a.poMin)&&!num(a.poMax)&&!a.decision);
    if(vacia&&importTesis(t)){ if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof scheduleSave==='function')scheduleSave(); } } } }catch(e){}
  if(fichaTicker===t&&typeof renderFicha==='function')renderFicha(t); if(typeof renderComparador==='function'&&typeof cmpSel!=='undefined'&&cmpSel.indexOf(t)>=0)renderComparador(); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-imptesis]'); if(!b)return; const t=(b.dataset.imptesis||'').toUpperCase(); if(!_tesisCache[t]){ alert('Resumen del dossier no disponible.'); return; } if(!confirm('¿Actualizar el Análisis de '+t+' con los datos del dossier? Sobrescribe rating, PO, banda de entrada, stop y decisión de esa empresa.'))return; if(importTesis(t)){ if(typeof saveNow==='function')saveNow(); if(typeof renderAnalisis==='function')renderAnalisis(); if(typeof renderFicha==='function')renderFicha(t); alert('Análisis actualizado desde el dossier.'); } });
function dossierURL(t,manual){ if(manual)return manual; t=(t||'').toUpperCase(); if(t&&_dossierSet&&_dossierSet.has(t))return 'dossiers/'+t+'.html'; return ''; }
const INFO_TXT={
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
'view-monitor':`Seguimiento por empresa: rol (mantener/aumentar/abrir), si has leído el último informe, la revisión trimestral y la <b>antigüedad del dossier</b> (en rojo si pasa de 12 meses → toca reanalizar). El trimestre se marca en rojo si se publicaron resultados (Calendario) y no los has revisado. Arriba tienes tu lista de tareas (ToDo).`
};
function renderInfoBoxes(){ try{ const op=(DB.config&&DB.config.infoOpen)||{}; Object.keys(INFO_TXT).forEach(id=>{ const sec=document.getElementById(id); if(!sec)return; if(sec.querySelector(':scope > .infobox'))return; const div=document.createElement('div'); div.className='infobox'+(op[id]?' open':''); div.dataset.info=id; div.innerHTML=`<div class="infobox-head">ℹ️ Info — pasos previos <span class="infobox-arrow">▸</span></div><div class="infobox-body">${INFO_TXT[id]}</div>`; const h2=sec.querySelector(':scope > h2'); if(h2)h2.insertAdjacentElement('afterend',div); else sec.insertBefore(div,sec.firstChild); }); }catch(e){} }
document.addEventListener('click',e=>{ const h=e.target.closest('.infobox-head'); if(!h)return; const box=h.parentElement; box.classList.toggle('open'); const id=box.dataset.info; DB.config=DB.config||{}; DB.config.infoOpen=DB.config.infoOpen||{}; if(box.classList.contains('open'))DB.config.infoOpen[id]=true; else delete DB.config.infoOpen[id]; if(typeof scheduleSave==='function')scheduleSave(); });
function afterLoad(){ if(typeof renderInfoBoxes==='function')renderInfoBoxes();
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
