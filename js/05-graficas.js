let grafYear=new Date().getFullYear(); let _objCache={};
const GRAF_COLS=['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#0d9488','#9333ea','#475569'];
const SECTOR={"IBE": "REGULADAS", "SAN": "FINANCIERAS", "REP": "COMMODITY", "MAP": "FINANCIERAS", "ELE": "REGULADAS", "A3M": "CONSUMO", "VIS": "CONSUMO", "ITX": "INDUSTRIAL", "EBRO": "CONSUMO", "FAE": "SALUD", "ACS": "INDUSTRIAL", "VID": "INDUSTRIAL", "AENA": "CONCESIONAL", "CABK": "FINANCIERAS", "PRM": "SALUD", "BKT": "FINANCIERAS", "R4": "FINANCIERAS", "MCM": "CONSUMO", "SCYR": "CONCESIONAL", "FCC": "CONCESIONAL", "ENG": "REGULADAS", "BBVA": "FINANCIERAS", "ANA": "CONCESIONAL", "TEF": "ESCALABLES", "ACX": "COMMODITY", "AIR": "INDUSTRIAL", "FER": "CONCESIONAL", "MTS": "COMMODITY", "IAG": "CONSUMO", "IDR": "ESCALABLES", "ANE": "CONCESIONAL", "GRF": "SALUD", "CIE": "INDUSTRIAL", "ROVI": "SALUD", "COL": "INMOBILIARIAS", "ALM": "SALUD", "PUIG": "CONSUMO", "APAM.AS": "COMMODITY", "GRE": "CONCESIONAL", "TRE": "INDUSTRIAL", "SLR": "CONCESIONAL", "ENO": "CONCESIONAL", "CAF": "INDUSTRIAL", "MAKS": "ESCALABLES", "HOME": "INMOBILIARIAS", "GEST": "INDUSTRIAL", "MEL": "CONSUMO", "LLN": "ESCALABLES", "RLIA": "INMOBILIARIAS", "CEV": "INMOBILIARIAS", "MVC": "INMOBILIARIAS", "PHM": "SALUD", "PSG": "ESCALABLES", "ART": "INDUSTRIAL", "ECO": "CONCESIONAL", "LDA": "FINANCIERAS", "AEDAS": "INMOBILIARIAS", "COXG": "CONCESIONAL", "ADX": "CONCESIONAL", "ENC": "COMMODITY", "GSJ": "INDUSTRIAL", "OHLA": "INDUSTRIAL", "PRS": "CONSUMO", "GIGA": "ESCALABLES", "TUB": "INDUSTRIAL", "AMP": "ESCALABLES", "NXT": "INDUSTRIAL", "TLGO": "INDUSTRIAL", "ALNT": "FINANCIERAS", "ECR": "COMMODITY", "BKY": "COMMODITY", "AZK": "INDUSTRIAL", "RJF": "SALUD", "ARM": "INMOBILIARIAS", "AI": "INDUSTRIAL", "NEA": "INDUSTRIAL", "OLE": "CONSUMO", "VOC": "CONSUMO", "TRG": "INDUSTRIAL", "LGT": "INDUSTRIAL", "ADZ": "CONSUMO", "EZE": "ESCALABLES", "REN": "INMOBILIARIAS", "RIO": "CONSUMO", "PVA": "CONSUMO", "CCEP": "CONSUMO", "NYE": "INMOBILIARIAS", "SEC": "CONSUMO", "UBS": "INDUSTRIAL", "NTGY": "REGULADAS", "LOG": "CONSUMO", "AMS": "ESCALABLES", "RED": "REGULADAS", "UNI": "FINANCIERAS", "FDR": "INDUSTRIAL", "CLNX": "CONCESIONAL", "MRL": "INMOBILIARIAS", "IBG": "COMMODITY", "ORY": "SALUD", "CIRSA": "CONSUMO"};
const SUBTIPO={"IBE": "Eléctrica + Renovables", "SAN": "Banca Universal", "REP": "Oil & Gas Integrado", "MAP": "Seguros Multirramo", "ELE": "Eléctrica Integrada", "A3M": "Medios / Publicidad TV", "VIS": "Envoltura Cárnica (Defens.)", "ITX": "Retail Moda (Fast Fashion)", "EBRO": "Alimentación (Defensivo)", "FAE": "Genéricos + Specialty", "ACS": "Construcción / Ingeniería", "VID": "Envases de Vidrio", "AENA": "Infraestructura Aeroportuaria", "CABK": "Banca Retail + Seguros", "PRM": "Productos Sanitarios", "BKT": "Banca Privada/Pymes", "R4": "Banca de Inversión", "MCM": "Papel de Fumar (Defensivo)", "SCYR": "Autopistas + Construcción", "FCC": "Servicios Amb. + Agua", "ENG": "Red Gas Natural", "BBVA": "Banca Universal", "ANA": "Agua + Infraestructuras", "TEF": "Telecomunicaciones", "ACX": "Acero Inoxidable", "AIR": "Aeronáutica / Defensa", "FER": "Autopistas + Aeropuertos", "MTS": "Acero / Minería", "IAG": "Aviación Comercial", "IDR": "IT Defensa / Transporte", "ANE": "Renovables (PPA+Mercado)", "GRF": "Hemoderivados / Diagnóstico", "CIE": "Automoción / Componentes", "ROVI": "CDMO + Specialty Pharma", "COL": "SOCIMI Oficinas Prime", "ALM": "Dermatología / Especialidades", "PUIG": "Lujo / Fragancias", "APAM.AS": "Acero Inoxidable", "GRE": "Renovables Emergentes", "TRE": "Ingeniería EPC", "SLR": "Fotovoltaica (PPA+Mercado)", "ENO": "Ingeniería + Renovables", "CAF": "Fabricación Ferroviaria", "MAKS": "Marketing Digital / Tech", "HOME": "Promotora Residencial", "GEST": "Automoción / Estampación", "MEL": "Hotelero / Turismo", "LLN": "SaaS Comunicaciones Cert.", "RLIA": "Patrimonio + Promotora", "CEV": "SOCIMI Residencial", "MVC": "Promotora Residencial", "PHM": "Oncología Marina / Biotech", "PSG": "Seguridad Privada", "ART": "Componentes Red Eléctrica", "ECO": "Renovables (PPA)", "LDA": "Seguros No Vida", "AEDAS": "Promotora Residencial", "COXG": "Renovables Emergentes", "ADX": "Comercializadora + Gen.", "ENC": "Celulosa + Energía Biomasa", "GSJ": "Construcción / Promotora", "OHLA": "Construcción / Ingeniería", "PRS": "Medios / Educación", "GIGA": "Cloud / Hosting", "TUB": "Tubería Industrial", "AMP": "Electrónica / Defensa", "NXT": "Textil Técnico", "TLGO": "Fabricación Ferroviaria", "ALNT": "Banca de Inversión/M&A", "ECR": "Química / Cloro", "BKY": "Minería / Uranio", "AZK": "Vending / Automatización", "RJF": "CDMO + Specialty Pharma", "ARM": "SOCIMI Oficinas", "AI": "Aeronáutica / Defensa", "NEA": "Máquinas Herramienta", "OLE": "Aceite de Oliva / Marcas", "VOC": "Medios / Prensa Regional", "TRG": "Tubería Industrial", "LGT": "Fundición / Automoción", "ADZ": "Retail Moda", "EZE": "Servicios Técnicos Redes", "REN": "Trading Inmobiliario", "RIO": "Vinos y Bebidas", "PVA": "Alimentación / Acuicultura", "CCEP": "Embotelladora Bebidas", "NYE": "Promotora / Suelo", "SEC": "Producción Audiovisual", "UBS": "Construcción / Promotora", "NTGY": "Gas + Eléctrica", "LOG": "Distribución Logística", "AMS": "Software B2B Travel", "RED": "Red Eléctrica Transporte", "UNI": "Banca Retail Regional", "FDR": "Equipamiento Piscinas", "CLNX": "Torres Telecom", "MRL": "SOCIMI Diversificada", "IBG": "Papel / Energía", "ORY": "Biotech / Oncología", "CIRSA": "Juego / Casino"};
function grafYears(){ const s=new Set(); (DB.movimientos||[]).forEach(m=>{ if(m.fecha)s.add(+m.fecha.slice(0,4)); }); (DB.presupuesto||[]).forEach(p=>{ if(typeof pAnio==='function')s.add(pAnio(p)); }); s.add(new Date().getFullYear()); return [...s].filter(Boolean).sort((a,b)=>b-a); }
function gAbrev(v){ const a=Math.abs(v); if(a>=1e6)return (v/1e6).toFixed(1).replace('.',',')+'M€'; if(a>=1000)return Math.round(v/1000)+'k€'; return Math.round(v)+'€'; }
function gYAxis(mn,mx,padL,padT,plotH,W,pct){ const N=4; let g=''; for(let i=0;i<=N;i++){ const v=mn+(mx-mn)*i/N; const y=padT+plotH-((mx-mn)?((v-mn)/(mx-mn)):0)*plotH; const lbl=pct?(v.toFixed(0)+'%'):gAbrev(v); g+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-12}" y2="${y.toFixed(1)}" stroke="#eef2f7"/><text x="${(padL-4).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="11" fill="#64748b">${lbl}</text>`; } return g; }
function gEsc(x){ return (''+x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function gBars(title,labels,series,opt){ opt=opt||{}; const W=Math.max(340,labels.length*(series.length>1?40:30)+50),H=280,padL=46,padB=26,padT=10;
  const max=Math.max(1,...series.reduce((a,sg)=>a.concat(sg.vals.map(v=>Math.abs(num(v)))),[]));
  const plotH=H-padB-padT,plotW=W-padL-12,gw=plotW/labels.length,bw=Math.min(26,(gw-6)/series.length);
  let bars='',xlab='';
  labels.forEach((lb,i)=>{ const gx=padL+i*gw+(gw-bw*series.length)/2;
    series.forEach((sg,si)=>{ const v=num(sg.vals[i]); const h=Math.round(Math.abs(v)/max*plotH); const x=gx+si*bw; const y=padT+plotH-h;
      bars+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw-2).toFixed(1)}" height="${h}" fill="${sg.color}"><title>${gEsc(lb)} · ${sg.name}: ${opt.pct?v.toFixed(1)+'%':fmt(v)}</title></rect>`; });
    xlab+=`<text x="${(padL+i*gw+gw/2).toFixed(1)}" y="${H-7}" font-size="11" text-anchor="middle" fill="#64748b">${gEsc(lb)}</text>`; });
  const yax=gYAxis(0,max,padL,padT,plotH,W,opt.pct);
  const leg=series.length>1?`<div style="display:flex;gap:12px;font-size:11px;margin-top:2px">${series.map(sg=>`<span><span style="display:inline-block;width:10px;height:10px;background:${sg.color};border-radius:2px;margin-right:4px"></span>${sg.name}</span>`).join('')}</div>`:'';
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet">${yax}${bars}${xlab}</svg></div>${leg}</div>`; }
function gDonut(title,items){ items=items.filter(x=>num(x.val)>0).sort((a,b)=>b.val-a.val); const tot=items.reduce((s,x)=>s+num(x.val),0);
  if(!tot)return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div class="muted" style="font-size:12px">Sin datos.</div></div>`;
  const cx=70,cy=70,r=58,rin=34; let segs='';
  if(items.length===1){ const col=items[0].color||GRAF_COLS[0]; segs=`<circle cx="${cx}" cy="${cy}" r="${((r+rin)/2).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${r-rin}"><title>${gEsc(items[0].label)}: ${fmt(items[0].val)} (100%)</title></circle>`; }
  else { let a0=-Math.PI/2; items.forEach((x,i)=>{ const frac=num(x.val)/tot; const a1=a0+frac*2*Math.PI; const lg=frac>0.5?1:0; const col=x.color||GRAF_COLS[i%GRAF_COLS.length];
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),xi1=cx+rin*Math.cos(a1),yi1=cy+rin*Math.sin(a1),xi0=cx+rin*Math.cos(a0),yi0=cy+rin*Math.sin(a0);
    segs+=`<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${lg} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${xi1.toFixed(1)} ${yi1.toFixed(1)} A${rin} ${rin} 0 ${lg} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z" fill="${col}"><title>${gEsc(x.label)}: ${fmt(x.val)} (${(frac*100).toFixed(1)}%)</title></path>`; a0=a1; }); }
  const leg=items.map((x,i)=>`<div style="font-size:11px;margin:1px 0;white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;background:${x.color||GRAF_COLS[i%GRAF_COLS.length]};border-radius:2px;margin-right:5px"></span>${gEsc(x.label)} <b>${fmt(x.val)}</b> <span class="muted">${(x.val/tot*100).toFixed(0)}%</span></div>`).join('');
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><svg width="140" height="140" viewBox="0 0 140 140">${segs}<text x="70" y="74" font-size="10" text-anchor="middle" fill="#475569">${fmt(tot)}</text></svg><div style="flex:1;min-width:150px">${leg}</div></div></div>`; }
function gLine(title,labels,vals,opt){ opt=opt||{}; const W=Math.max(340,labels.length*30+50),H=240,padL=44,padB=24,padT=12;
  const mn=Math.min(0,...vals.map(num)),mx=Math.max(1,...vals.map(num)),rng=(mx-mn)||1,plotH=H-padB-padT,plotW=W-padL-12;
  const X=i=>padL+(labels.length>1?i*plotW/(labels.length-1):plotW/2), Yf=v=>padT+plotH-((num(v)-mn)/rng)*plotH;
  const pts=vals.map((v,i)=>`${X(i).toFixed(1)},${Yf(v).toFixed(1)}`).join(' ');
  const dots=vals.map((v,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Yf(v).toFixed(1)}" r="2.5" fill="${opt.color||'#2563eb'}"><title>${gEsc(labels[i])}: ${opt.pct?num(v).toFixed(1)+'%':fmt(v)}</title></circle>`).join('');
  const xlab=labels.map((lb,i)=>`<text x="${X(i).toFixed(1)}" y="${H-7}" font-size="11" text-anchor="middle" fill="#64748b">${gEsc(lb)}</text>`).join('');
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet">${gYAxis(mn,mx,padL,padT,plotH,W,opt.pct)}<line x1="${padL}" y1="${Yf(0).toFixed(1)}" x2="${W-12}" y2="${Yf(0).toFixed(1)}" stroke="#cbd5e1" stroke-dasharray="2 2"/><polyline points="${pts}" fill="none" stroke="${opt.color||'#2563eb'}" stroke-width="2"/>${dots}${xlab}</svg></div></div>`; }
function gStack(title,labels,sA,sB,names){ const n=labels.length,W=Math.max(340,n*20+50),H=280,padL=46,padB=30,padT=10;
  const tot=labels.map((_,i)=>num(sA[i])+num(sB[i])),mx=Math.max(1,...tot),plotH=H-padB-padT,plotW=W-padL-12,gw=plotW/n,bw=Math.min(28,gw-6);
  let bars='',xlab=''; const step=Math.ceil(n/10)||1;
  labels.forEach((lb,i)=>{ const x=padL+i*gw+(gw-bw)/2; const ha=Math.round(num(sA[i])/mx*plotH),hb=Math.round(num(sB[i])/mx*plotH),ya=padT+plotH-ha,yb=ya-hb;
    bars+=`<rect x="${x.toFixed(1)}" y="${ya.toFixed(1)}" width="${bw.toFixed(1)}" height="${ha}" fill="#16a34a"><title>${gEsc(lb)} ${names[0]}: ${fmt(sA[i])}</title></rect><rect x="${x.toFixed(1)}" y="${yb.toFixed(1)}" width="${bw.toFixed(1)}" height="${hb}" fill="#2563eb"><title>${gEsc(lb)} ${names[1]}: ${fmt(sB[i])}</title></rect>`;
    if(i%step===0)xlab+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-7}" font-size="10" text-anchor="middle" fill="#64748b">${gEsc(lb)}</text>`; });
  const leg=`<div style="display:flex;gap:12px;font-size:11px;margin-top:2px"><span><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:2px;margin-right:4px"></span>${names[0]}</span><span><span style="display:inline-block;width:10px;height:10px;background:#2563eb;border-radius:2px;margin-right:4px"></span>${names[1]}</span></div>`;
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet">${gYAxis(0,mx,padL,padT,plotH,W,false)}${bars}${xlab}</svg></div>${leg}</div>`; }
function gHBars(title,items,opt){ opt=opt||{}; items=(items||[]).slice(0,opt.top||10);
  if(!items.length)return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div class="muted" style="font-size:12px">Sin datos.</div></div>`;
  const rowH=22,padT=8,W=360,labelW=opt.labelW||118,barX=labelW+8,barW=W-barX-50,H=padT*2+items.length*rowH;
  const mx=Math.max(1,...items.map(x=>Math.abs(num(x.val))));
  let g='';
  items.forEach((x,i)=>{ const v=num(x.val); const w=Math.round(Math.abs(v)/mx*barW); const y=padT+i*rowH; const col=x.color||(opt.signColor?(v>=0?'#16a34a':'#dc2626'):GRAF_COLS[i%GRAF_COLS.length]);
    g+=`<text x="2" y="${y+14}" font-size="11" fill="#475569">${gEsc(x.label).slice(0,20)}</text><rect x="${barX}" y="${y+4}" width="${w}" height="${rowH-9}" rx="2" fill="${col}"></rect><text x="${barX+w+4}" y="${y+14}" font-size="11" fill="#334155">${opt.pct?(v>=0?'+':'')+v.toFixed(1)+'%':fmt(v)}</text>`; });
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet">${g}</svg></div>`; }
function _allOps(){ const out=(DB.operaciones||[]).slice(); (DB.cerradas||[]).forEach(c=>{ const t=(c.ticker||'').toUpperCase(); (c.ops||[]).forEach(o=>out.push({ticker:t,fecha:o.fecha,tipo:o.tipo,acciones:o.acciones,precio:o.precio})); }); return out; }
function cargarPreciosCartera(){ const need=[...new Set([..._allOps().map(o=>(o.ticker||'').toUpperCase()).filter(Boolean),'IBEX'])]; const pend=need.filter(t=>_precioCache[t]===undefined); if(!pend.length)return Promise.resolve(); return Promise.all(pend.map(t=>fetch('precios/'+t+'.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{_precioCache[t]=j;}).catch(()=>{_precioCache[t]=null;}))); }
function priceRepoAt(t,ms){ const pj=_precioCache[(t||'').toUpperCase()]; if(!pj||!pj.data||!pj.data.length)return 0; const arr=pj.data; let lo=0,hi=arr.length-1,res=0; while(lo<=hi){ const md=(lo+hi)>>1; const mt=Date.parse(arr[md][0]+'T00:00:00'); if(mt<=ms){res=arr[md][1];lo=md+1;}else hi=md-1; } return num(res); }
function opPriceAt(t,ms){ t=(t||'').toUpperCase(); let best=0,bt=-1,first=0,ft=Infinity; (typeof _allOps==='function'?_allOps():[]).forEach(o=>{ if((o.ticker||'').toUpperCase()!==t)return; const p=num(o.precio); if(p<=0)return; const om=Date.parse((o.fecha||'')+'T00:00:00'); if(isNaN(om))return; if(om<=ms&&om>bt){bt=om;best=p;} if(om<ft){ft=om;first=p;} }); return best||first; }
function priceAtFB(t,ms){ return priceRepoAt(t,ms)||opPriceAt(t,ms); }

function gLines(title,labels,series){ const W=Math.max(360,labels.length*7+60),H=420,padL=54,padB=26,padT=10;
  const allv=series.reduce((a,sg)=>a.concat(sg.vals.map(num)),[]); const mn=Math.min(0,...allv),mx=Math.max(1,...allv),rng=(mx-mn)||1,plotH=H-padB-padT,plotW=W-padL-12;
  const X=i=>padL+(labels.length>1?i*plotW/(labels.length-1):plotW/2), Yf=v=>padT+plotH-((num(v)-mn)/rng)*plotH;
  const lines=series.map(sg=>`<polyline points="${sg.vals.map((v,i)=>X(i).toFixed(1)+','+Yf(v).toFixed(1)).join(' ')}" fill="none" stroke="${sg.color}" stroke-width="2"${sg.dash?' stroke-dasharray="'+sg.dash+'"':''}/>`).join('');
  const yax=gYAxis(mn,mx,padL,padT,plotH,W,false);
  const step=Math.ceil(labels.length/8)||1; let xl=''; labels.forEach((lb,i)=>{ if(i%step===0)xl+=`<text x="${X(i).toFixed(1)}" y="${H-7}" font-size="10" text-anchor="middle" fill="#64748b">${gEsc(lb)}</text>`; });
  const leg=`<div style="display:flex;gap:12px;font-size:11px;margin-top:2px">${series.map(sg=>`<span><span style="display:inline-block;width:10px;height:10px;background:${sg.color};border-radius:2px;margin-right:4px"></span>${sg.name}</span>`).join('')}</div>`;
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet">${yax}${lines}${xl}</svg></div>${leg}</div>`; }
// === Serie mes a mes de la cartera: coste (aportado neto), valor por cotización y valor+dividendos ===
function carteraEvolData(reRender){ const _ops2=_allOps().filter(o=>o.fecha).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  if(!_ops2.length) return {empty:true};
  const _needP=[...new Set([..._ops2.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean),'IBEX'])]; const _faltaP=_needP.filter(t=>_precioCache[t]===undefined);
  if(_faltaP.length){ if(typeof cargarPreciosCartera==='function')cargarPreciosCartera().then(()=>{ if(typeof reRender==='function')reRender(); }); return {loading:true}; }
  const priceAt=(t,ms)=>priceAtFB(t,ms);
  const sharesAt=(t,ms)=>{ let sh=0; _ops2.forEach(o=>{ if((o.ticker||'').toUpperCase()===t){ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; };
  const divEv=[]; const _dvO=DB.dividendos||{}; Object.keys(_dvO).forEach(t=>{ const T=(t||'').toUpperCase(); (_dvO[t]||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  (DB.cerradas||[]).forEach(c=>{ const T=(c.ticker||'').toUpperCase(); (c.divs||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  const _opSet=new Set(_ops2.map(o=>(o.ticker||"").toUpperCase())); const _dIng=DB.divIngresos||{}; Object.keys(_dIng).forEach(t=>{ if(_opSet.has((t||"").toUpperCase()))return; Object.keys(_dIng[t]||{}).forEach(y=>{ divEv.push({ms:Date.UTC(+y,11,31),eur:num(_dIng[t][y])}); }); });
  divEv.sort((a,b)=>a.ms-b.ms);
  const t0=new Date(Date.parse(_ops2[0].fecha+'T00:00:00')); let yy=t0.getFullYear(),mn2=t0.getMonth(); const now=new Date(); const labels=[],aport=[],valor=[],valdiv=[]; let divAc=0,di=0; const _ibexJ=_precioCache['IBEX']; const hayIbex=!!(_ibexJ&&_ibexJ.data&&_ibexJ.data.length); const ibexVal=[]; let ibexUnits=0,_prevAp=0;
  while(yy<now.getFullYear()||(yy===now.getFullYear()&&mn2<=now.getMonth())){ const cut=Date.UTC(yy,mn2+1,0); const sh={}; let ap=0;
    _ops2.forEach(o=>{ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=cut){ const t=(o.ticker||'').toUpperCase(); const sg=o.tipo==='venta'?-1:1; sh[t]=(sh[t]||0)+sg*num(o.acciones); ap+=sg*num(o.acciones)*num(o.precio); } });
    while(di<divEv.length&&divEv[di].ms<=cut){ divAc+=divEv[di].eur; di++; }
    const isLast=(yy===now.getFullYear()&&mn2===now.getMonth()); const _pxAt=(t)=>{ const T=(t||'').toUpperCase(); if(isLast){ const v=(DB.valores||{})[T]||{}; const lp=num(v.precioActual), lf=(v.precioFecha||''); const pj=_precioCache[T]; let rp=0,rf=''; if(pj&&pj.data&&pj.data.length){ rp=num(pj.data[pj.data.length-1][1]); rf=pj.data[pj.data.length-1][0]; } if(lp>0&&rp>0) return (lf>=rf)?lp:rp; if(rp>0) return rp; if(lp>0) return lp; } return priceAt(t,cut); }; let val=0; Object.keys(sh).forEach(t=>{ if(sh[t]>0.0001)val+=sh[t]*_pxAt(t); });
    labels.push(String(yy).slice(2)+'/'+String(mn2+1).padStart(2,'0')); aport.push(ap); valor.push(val); valdiv.push(val+divAc); if(hayIbex){ const ipx=priceRepoAt('IBEX',cut); const dAp=ap-_prevAp; if(ipx>0&&dAp!==0)ibexUnits+=dAp/ipx; ibexVal.push(ipx>0?ibexUnits*ipx:(ibexVal.length?ibexVal[ibexVal.length-1]:0)); } _prevAp=ap; mn2++; if(mn2>11){mn2=0;yy++;} }
  return {ok:true,labels,aport,valor,valdiv,ibexVal,hayIbex}; }

// === Rentabilidad real: TIR/XIRR (ponderada por dinero) y TWR (ponderada por tiempo) + benchmark IBEX ===
function _xirr(cf){ if(!cf||cf.length<2)return null; const pos=cf.some(c=>c.a>0),neg=cf.some(c=>c.a<0); if(!pos||!neg)return null;
  const t0=Math.min(...cf.map(c=>c.t)); const yr=c=>(c.t-t0)/(365.25*86400000);
  const npv=r=>cf.reduce((s,c)=>s+c.a/Math.pow(1+r,yr(c)),0);
  let lo=-0.9999,hi=100,flo=npv(lo),fhi=npv(hi); if(!isFinite(flo)||!isFinite(fhi))return null;
  if((flo<0)===(fhi<0)){ let r=0.1; for(let i=0;i<100;i++){ const f=npv(r); const d=(npv(r+1e-5)-f)/1e-5; if(!isFinite(f)||!isFinite(d)||d===0)break; let nr=r-f/d; if(!isFinite(nr))break; if(nr<=-0.999)nr=-0.999; if(Math.abs(nr-r)<1e-8)return nr; r=nr; } return (isFinite(npv(r))&&Math.abs(npv(r))<1)?r:null; }
  for(let i=0;i<200;i++){ const mid=(lo+hi)/2,fm=npv(mid); if(Math.abs(fm)<1e-7||(hi-lo)<1e-10)return mid; if((flo<0)!==(fm<0)){hi=mid;}else{lo=mid;flo=fm;} } return (lo+hi)/2; }
function carteraRentabilidad(reRender){ const d=carteraEvolData(reRender); if(!d.ok)return null;
  const aport=d.aport, valor=d.valor, valdiv=d.valdiv, ibex=d.ibexVal||[], n=aport.length; if(n<2)return null;
  // TWR: retornos mensuales encadenados. Cuenta total = valor de mercado + dividendos acumulados; flujo externo del mes = variación de aportación neta.
  const twrOf=serie=>{ let r=1,ok=false; for(let m=1;m<n;m++){ const start=num(serie[m-1]); const flow=num(aport[m])-num(aport[m-1]); const end=num(serie[m]); if(start>0.01){ r*=(end-flow)/start; ok=true; } } return ok?r-1:null; };
  const twr=twrOf(valdiv), ibexTwr=d.hayIbex?twrOf(ibex):null;
  const anios=Math.max((n-1)/12,1/12); const anual=x=>x==null?null:(Math.pow(1+x,1/anios)-1);
  const twrAnual=anual(twr), ibexTwrAnual=anual(ibexTwr); const alfa=(twrAnual!=null&&ibexTwrAnual!=null)?twrAnual-ibexTwrAnual:null;
  const valFinal=num(valdiv[n-1]), ibexFinal=d.hayIbex?num(ibex[n-1]):null, valDif=(ibexFinal!=null)?valFinal-ibexFinal:null;
  // XIRR (money-weighted): flujos datados = compras(−)/ventas(+)/dividendos(+) + valor de mercado actual como flujo terminal(+)
  const ops=(typeof _allOps==='function'?_allOps():[]); const cf=[];
  ops.forEach(o=>{ if(!o.fecha)return; const ms=Date.parse(o.fecha+'T00:00:00'); if(isNaN(ms))return; const eur=num(o.acciones)*num(o.precio); if(!eur)return; cf.push({t:ms,a:(o.tipo==='venta'?eur:-eur)}); });
  const shAt=(t,ms)=>{ let sh=0; ops.forEach(o=>{ if((o.ticker||'').toUpperCase()===t&&o.fecha){ const om=Date.parse(o.fecha+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; };
  const _dvO=DB.dividendos||{}; Object.keys(_dvO).forEach(t=>{ const T=(t||'').toUpperCase(); (_dvO[t]||[]).forEach(dd=>{ if(dd.fecha){ const dm=Date.parse(dd.fecha+'T00:00:00'); if(!isNaN(dm)){ const e=shAt(T,dm)*num(dd.importe); if(e)cf.push({t:dm,a:e}); } } }); });
  (DB.cerradas||[]).forEach(c=>{ const T=(c.ticker||'').toUpperCase(); (c.divs||[]).forEach(dd=>{ if(dd.fecha){ const dm=Date.parse(dd.fecha+'T00:00:00'); if(!isNaN(dm)){ const e=shAt(T,dm)*num(dd.importe); if(e)cf.push({t:dm,a:e}); } } }); });
  const _opSet=new Set(ops.map(o=>(o.ticker||'').toUpperCase())); const _dIng=DB.divIngresos||{}; Object.keys(_dIng).forEach(t=>{ if(_opSet.has((t||'').toUpperCase()))return; Object.keys(_dIng[t]||{}).forEach(y=>{ const e=num(_dIng[t][y]); if(e)cf.push({t:Date.UTC(+y,11,31),a:e}); }); });
  const term=num(valor[n-1]); if(term>0)cf.push({t:Date.now(),a:term});
  const xirr=_xirr(cf);
  return {xirr,twr,twrAnual,ibexTwrAnual,alfa,valFinal,ibexFinal,valDif,anios,hayIbex:d.hayIbex}; }
// === Atribución del crecimiento de la cartera: de dónde viene el cambio de valor+dividendos ===
// total (valor+div) = aportación neta + revalorización de mercado + dividendos cobrados, en un periodo.
function crecimientoAtribucion(mesesAtras){ const d=(typeof carteraEvolData==='function')?carteraEvolData():null; if(!d||!d.ok)return null; const n=d.labels.length; if(n<2)return null;
  const end=n-1; const start=Math.max(0,end-(mesesAtras||12)); const A=_atribFrom(_evoState(d,start),_evoState(d,end)); A.desde=d.labels[start]; A.hasta=d.labels[end]; A.meses=end-start; return A; }
// Atribución generalizada por rango de meses / por año (reusa carteraEvolData)
function _labelYM(lb){ const p=(lb||'').split('/'); return (2000+ +p[0])*100 + (+p[1]); }
function _evoState(d,idx){ if(idx==null||idx<0)return {aport:0,valor:0,valdiv:0}; return {aport:num(d.aport[idx]),valor:num(d.valor[idx]),valdiv:num(d.valdiv[idx])}; }
function _idxLE(d,ym){ let idx=null; for(let i=0;i<d.labels.length;i++){ if(_labelYM(d.labels[i])<=ym)idx=i; else break; } return idx; }
// Atribución sobre el VALOR de mercado de la cartera (reconcilia con lo que ves en Cartera).
// crecimiento del valor = aportación + mercado. Los dividendos del periodo van aparte (a caja, no son valor de acciones).
function _atribFrom(s0,s1){ const aportacion=s1.aport-s0.aport; const dividendos=(s1.valdiv-s1.valor)-(s0.valdiv-s0.valor); const crecValor=s1.valor-s0.valor; const revaloriz=crecValor-aportacion; const retorno=revaloriz+dividendos; return {aportacion,revaloriz,dividendos,crecValor,retorno,total:crecValor,valIni:s0.valor,valFin:s1.valor}; }
function atribucionRango(desdeYM,hastaYM){ const d=(typeof carteraEvolData==='function')?carteraEvolData():null; if(!d||!d.ok)return null; const endIdx=_idxLE(d,hastaYM); if(endIdx==null)return null; const dm=desdeYM%100,dy=Math.floor(desdeYM/100); const prevYM=dm>1?(dy*100+(dm-1)):((dy-1)*100+12); const startIdx=_idxLE(d,prevYM); return _atribFrom(_evoState(d,startIdx),_evoState(d,endIdx)); }
function atribucionPorAnio(){ const d=(typeof carteraEvolData==='function')?carteraEvolData():null; if(!d||!d.ok)return []; const years=[...new Set(d.labels.map(lb=>2000+ +lb.split('/')[0]))].sort((a,b)=>a-b); return years.map(Y=>{ const s0=_evoState(d,_idxLE(d,(Y-1)*100+12)); const s1=_evoState(d,_idxLE(d,Y*100+12)); return Object.assign({anio:Y},_atribFrom(s0,s1)); }); }
function gWaterfall(steps){ const W=600,H=300,padL=56,padB=42,padT=16; const plotH=H-padB-padT,plotW=W-padL-14;
  let cum=0; const bars=[]; let mx=0,mn=0; const cumAfter=[];
  steps.forEach(s=>{ if(s.base!=null){ bars.push({label:s.label,lo:Math.min(0,s.base),hi:Math.max(0,s.base),val:s.base,kind:'base'}); cum=s.base; }
    else if(s.over!=null){ const start=cum,end=cum+s.over; bars.push({label:s.label,lo:Math.min(start,end),hi:Math.max(start,end),val:s.over,kind:'over',up:s.over>=0}); }
    else { const start=cum,end=cum+s.delta; bars.push({label:s.label,lo:Math.min(start,end),hi:Math.max(start,end),val:s.delta,kind:'delta',up:s.delta>=0}); cum=end; }
    cumAfter.push(cum); });
  bars.forEach(b=>{ mx=Math.max(mx,b.hi,0); mn=Math.min(mn,b.lo,0); });
  const rng=(mx-mn)||1; const Y=v=>padT+plotH-((v-mn)/rng)*plotH; const gw=plotW/bars.length, bw=Math.min(60,gw-16);
  let g=gYAxis(mn,mx,padL,padT,plotH,W,false);
  bars.forEach((b,i)=>{ const x=padL+i*gw+(gw-bw)/2; const yTop=Y(b.hi),yBot=Y(b.lo); const h=Math.max(1,yBot-yTop); const col=b.kind==='base'?'#64748b':(b.up?'#16a34a':'#dc2626'); const over=b.kind==='over'; const pre=(b.kind!=='base'&&b.val>=0)?'+':'';
    g+=`<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${col}"${over?' fill-opacity="0.3" stroke="#16a34a" stroke-dasharray="3 2"':''}><title>${b.label}: ${pre+fmt(b.val)}${over?' (a caja, aparte)':''}</title></rect>`;
    g+=`<text x="${(x+bw/2).toFixed(1)}" y="${(yTop-4).toFixed(1)}" font-size="10" text-anchor="middle" fill="${over?'#16a34a':'#334155'}">${pre+gAbrev(b.val)}</text>`;
    g+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-24}" font-size="10" text-anchor="middle" fill="#64748b">${b.label}</text>${over?`<text x="${(x+bw/2).toFixed(1)}" y="${H-12}" font-size="8" text-anchor="middle" fill="#94a3b8">a caja</text>`:''}`;
    if(i<bars.length-1&&bars[i+1].kind!=='over'){ const yc=Y(cumAfter[i]); const x2=padL+(i+1)*gw+(gw-bw)/2; g+=`<line x1="${(x+bw).toFixed(1)}" y1="${yc.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${yc.toFixed(1)}" stroke="#cbd5e1" stroke-dasharray="3 2"/>`; }
  });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;max-width:660px" preserveAspectRatio="xMidYMid meet">${g}</svg>`; }
let atribSel={modo:'12m',anio:null,desde:'',hasta:''};
function renderAtribucion(){ const el=$('#atribBody'); if(!el)return; const kp=$('#atribKpis'); const d=(typeof carteraEvolData==='function')?carteraEvolData(renderAtribucion):null;
  if(!d||d.empty){ el.innerHTML='<div class="empty">Sin operaciones registradas.</div>'; if(kp)kp.innerHTML=''; return; }
  if(!d.ok){ el.innerHTML='<div class="muted" style="font-size:12px">Cargando cotizaciones del repo…</div>'; if(kp)kp.innerHTML=''; return; }
  const years=[...new Set(d.labels.map(lb=>2000+ +lb.split('/')[0]))].sort((a,b)=>b-a); const selEl=$('#atribAnio'); if(selEl){ selEl.innerHTML='<option value="">— año —</option>'+years.map(y=>`<option value="${y}"${(atribSel.modo==='anio'&&+atribSel.anio===y)?' selected':''}>${y}</option>`).join(''); }
  const nowY=new Date().getFullYear(); let A=null, titulo='';
  if(atribSel.modo==='ytd'){ A=atribucionRango(nowY*100+1,nowY*100+12); titulo='Año en curso ('+nowY+')'; }
  else if(atribSel.modo==='anio'&&atribSel.anio){ A=atribucionRango(atribSel.anio*100+1,atribSel.anio*100+12); titulo='Año '+atribSel.anio; }
  else if(atribSel.modo==='todo'){ A=Object.assign(_atribFrom(_evoState(d,null),_evoState(d,d.labels.length-1)),{}); titulo='Desde el inicio'; }
  else if(atribSel.modo==='rango'&&atribSel.desde&&atribSel.hasta){ const dY=+atribSel.desde.slice(0,4),dM=+atribSel.desde.slice(5,7),hY=+atribSel.hasta.slice(0,4),hM=+atribSel.hasta.slice(5,7); A=atribucionRango(dY*100+dM,hY*100+hM); titulo='Del '+atribSel.desde+' al '+atribSel.hasta; }
  else { A=crecimientoAtribucion(12); titulo='Últimos 12 meses'; }
  if(!A){ el.innerHTML='<div class="empty">No hay datos para ese periodo.</div>'; if(kp)kp.innerHTML=''; return; }
  const sg=x=>(x>=0?'+':'')+fmt(x); const efectivo=A.aportacion-A.dividendos;
  if(kp)kp.innerHTML=[['Efectivo (nuevo)',sg(efectivo),''],['Dividendo (reinv.)',sg(A.dividendos),'pos'],['Mercado',sg(A.revaloriz),A.revaloriz>=0?'pos':'neg'],['Retorno (mkt+div)',sg(A.retorno),A.retorno>=0?'pos':'neg']].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]||''}">${k[1]}</div></div>`).join('');
  const vi=num(A.valIni), vf=num(A.valFin);
  const wfSteps=[{label:'Inicio',base:vi}]; if(Math.abs(A.dividendos)>0.5)wfSteps.push({label:'Dividendo',delta:A.dividendos}); if(Math.abs(efectivo)>0.5)wfSteps.push({label:'Efectivo',delta:efectivo}); wfSteps.push({label:'Mercado',delta:A.revaloriz},{label:'Valor final',base:vf});
  const wf=gWaterfall(wfSteps);
  const nota=`<div class="sub" style="margin-top:6px"><b>Dividendo</b> (reinvertido) + <b>Efectivo</b> (dinero nuevo de tu bolsillo) = tu aportación del periodo (${fmt(A.aportacion)}). El valor de la cartera creció por esa aportación más lo que hizo el <b>mercado</b>. Retorno de tu dinero (mercado + dividendos): <b>${sg(A.retorno)}</b>.</div>`;
  const porY=atribucionPorAnio(); let tE=0,tD=0,tM=0,tC=0; porY.forEach(r=>{tD+=r.dividendos;tM+=r.revaloriz;tC+=r.crecValor;tE+=(r.aportacion-r.dividendos);});
  const yrows=porY.slice().reverse().map(r=>{ const ef=r.aportacion-r.dividendos; return `<tr><td><b>${r.anio}</b></td><td class="num">${sg(ef)}</td><td class="num pos">${sg(r.dividendos)}</td><td class="num ${r.revaloriz>=0?'pos':'neg'}">${sg(r.revaloriz)}</td><td class="num ${r.crecValor>=0?'pos':'neg'}" style="font-weight:700">${sg(r.crecValor)}</td></tr>`; }).join('');
  const totRow=`<tr style="font-weight:700;background:#eef2f7"><td>Total (= valor cartera)</td><td class="num">${sg(tE)}</td><td class="num pos">${sg(tD)}</td><td class="num ${tM>=0?'pos':'neg'}">${sg(tM)}</td><td class="num">${fmt(tC)}</td></tr>`;
  el.innerHTML=`<div class="card" style="margin:0 0 12px"><div style="font-weight:700;font-size:14px;margin-bottom:4px">${titulo}</div><div class="sub" style="margin-bottom:6px">Tu cartera pasó de ${fmt(vi)} a <b>${fmt(vf)}</b> (valor de mercado): dividendos reinvertidos + efectivo nuevo + mercado.</div>${wf}${nota}</div><h3 style="font-size:14px;margin:6px 0">Atribución por año</h3><div class="sub" style="margin-bottom:6px">Efectivo (dinero nuevo) + Dividendo (reinvertido) + Mercado = crecimiento del valor. El total de "Crec. valor" suma tu valor de cartera actual.</div><div style="overflow:auto"><table><thead><tr><th>Año</th><th class="num">Efectivo</th><th class="num">Dividendo</th><th class="num">Mercado</th><th class="num">Crec. valor</th></tr></thead><tbody>${yrows}${totRow}</tbody></table></div>`;
}
// === Rentabilidad por empresa: TIR de tu posición + rentab. total + TR del valor por periodos (YTD/1A/3A) ===
function rentabilidadEmpresas(reRender){
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  if(!pos.length)return {empty:true};
  const tickers=[...new Set(pos.map(p=>(p.ticker||'').toUpperCase()))];
  const falta=tickers.filter(t=>_precioCache[t]===undefined);
  if(falta.length){ if(typeof cargarPreciosCartera==='function')cargarPreciosCartera().then(()=>{ if(typeof reRender==='function')reRender(); }); return {loading:true}; }
  const ops=(typeof _allOps==='function'?_allOps():[]).filter(o=>o.fecha&&num(o.acciones)>0);
  const opsByT={}; ops.forEach(o=>{ const t=(o.ticker||'').toUpperCase(); (opsByT[t]=opsByT[t]||[]).push(o); });
  const sharesAt=(t,ms)=>{ let sh=0; (opsByT[t]||[]).forEach(o=>{ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); }); return sh; };
  const dvO=DB.dividendos||{}; const nowMs=Date.now(); const nowY=new Date().getFullYear();
  const msY1=nowMs-365.25*86400000, msY3=nowMs-3*365.25*86400000, msYTD=Date.UTC(nowY,0,1);
  const totVal=pos.reduce((s,p)=>s+p.acciones*num(p.precioActual),0);
  const rows=pos.map(p=>{ const t=(p.ticker||'').toUpperCase(); const acc=p.acciones, pa=num(p.precioActual);
    const coste=acc*num(p.precioCompra), valor=acc*pa, pl=valor-coste;
    let divCob=0; (dvO[t]||[]).forEach(dd=>{ if(dd.fecha){ const dm=Date.parse(dd.fecha+'T00:00:00'); if(!isNaN(dm))divCob+=sharesAt(t,dm)*num(dd.importe); } });
    const rentTot=coste>0?(pl+divCob)/coste:null;
    const cf=[]; (opsByT[t]||[]).forEach(o=>{ const ms=Date.parse(o.fecha+'T00:00:00'); if(isNaN(ms))return; const eur=num(o.acciones)*num(o.precio); if(!eur)return; cf.push({t:ms,a:(o.tipo==='venta'?eur:-eur)}); });
    (dvO[t]||[]).forEach(dd=>{ if(dd.fecha){ const dm=Date.parse(dd.fecha+'T00:00:00'); if(!isNaN(dm)){ const e=sharesAt(t,dm)*num(dd.importe); if(e)cf.push({t:dm,a:e}); } } });
    if(valor>0)cf.push({t:nowMs,a:valor});
    const xirr=(typeof _xirr==='function')?_xirr(cf):null;
    const prNow=pa>0?pa:((typeof priceAtFB==='function')?priceAtFB(t,nowMs):0);
    const trOf=(msStart)=>{ const p0=(typeof priceAtFB==='function')?priceAtFB(t,msStart):0; if(!(p0>0)||!(prNow>0))return null; let divS=0; (dvO[t]||[]).forEach(dd=>{ if(dd.fecha){ const dm=Date.parse(dd.fecha+'T00:00:00'); if(dm>=msStart&&dm<=nowMs)divS+=num(dd.importe); } }); return (prNow-p0+divS)/p0; };
    return {t,acc,pa,coste,valor,pl,plPct:coste>0?pl/coste:null,divCob,rentTot,xirr,peso:totVal>0?valor/totVal:0,trYTD:trOf(msYTD),tr1A:trOf(msY1),tr3A:trOf(msY3)};
  }).sort((a,b)=>b.peso-a.peso);
  return {ok:true,rows,totVal}; }
function renderRentabEmpresas(){ const el=$('#rentaBody'); if(!el)return; const kp=$('#rentaKpis'); const R=rentabilidadEmpresas(renderRentabEmpresas);
  if(!R||R.empty){ el.innerHTML='<div class="empty">Sin posiciones abiertas.</div>'; if(kp)kp.innerHTML=''; return; }
  if(R.loading){ el.innerHTML='<div class="muted" style="font-size:12px">Cargando cotizaciones del repo… (necesita conexión)</div>'; if(kp)kp.innerHTML=''; return; }
  const pc=x=>x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1)+'%');
  const CR=(typeof carteraRentabilidad==='function')?carteraRentabilidad(renderRentabEmpresas):null;
  if(kp)kp.innerHTML=[['TIR cartera (anual)',CR?pc(CR.xirr):'—',(CR&&CR.xirr>=0)?'pos':'neg'],['Rentab. temporal (anual)',CR?pc(CR.twrAnual):'—',(CR&&CR.twrAnual>=0)?'pos':'neg'],['Alfa vs IBEX',(CR&&CR.alfa!=null)?pc(CR.alfa):'—',(CR&&CR.alfa!=null&&CR.alfa>=0)?'pos':'neg'],['Valor cartera',fmt(R.totVal),'']].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]||''}">${k[1]}</div></div>`).join('');
  const rows=R.rows.map(r=>`<tr><td><b data-ficha="${r.t}" style="cursor:pointer;color:var(--brand)">${r.t}</b></td><td class="num">${(r.peso*100).toFixed(1)}%</td><td class="num">${fmt(r.valor)}</td><td class="num ${r.pl>=0?'pos':'neg'}">${(r.pl>=0?'+':'')+fmt(r.pl)}</td><td class="num ${r.pl>=0?'pos':'neg'}">${pc(r.plPct)}</td><td class="num pos">${fmt(r.divCob)}</td><td class="num ${(r.rentTot!=null&&r.rentTot>=0)?'pos':'neg'}" style="font-weight:700">${pc(r.rentTot)}</td><td class="num ${(r.xirr!=null&&r.xirr>=0)?'pos':'neg'}">${pc(r.xirr)}</td><td class="num ${(r.trYTD!=null&&r.trYTD>=0)?'pos':'neg'}">${pc(r.trYTD)}</td><td class="num ${(r.tr1A!=null&&r.tr1A>=0)?'pos':'neg'}">${pc(r.tr1A)}</td><td class="num ${(r.tr3A!=null&&r.tr3A>=0)?'pos':'neg'}">${pc(r.tr3A)}</td></tr>`).join('');
  el.innerHTML=`<div class="sub" style="margin-bottom:8px"><b>Rent. total</b> y <b>TIR</b> miden TU posición (con tus fechas de compra y tus dividendos; TIR = anual ponderada por dinero). <b>TR YTD/1A/3A</b> miden el <b>valor</b> del activo (cotización + dividendos/acción del periodo), para comparar cómo va cada empresa independientemente de cuándo entraste. TR 3A es acumulado. Usa las cotizaciones del repo.</div><div style="overflow:auto"><table style="font-size:12px"><thead><tr><th>Empresa</th><th class="num">Peso</th><th class="num">Valor</th><th class="num">Plusvalía</th><th class="num">%</th><th class="num">Div. cobrado</th><th class="num">Rent. total</th><th class="num">TIR</th><th class="num">TR YTD</th><th class="num">TR 1A</th><th class="num">TR 3A</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// === Cobertura de gastos por dividendos (independencia financiera / FIRE) ===
// Dividendo BRUTO (simYearTotal) vs GASTO REAL (movimientos últimos 12m). Proyecta dividendo con su
// crecimiento estimado (CAGR de la trayectoria del plan; fallback histórico; fallback 5%) y gasto con
// inflación (DB.config.fireInfla o 2,5%) hasta el cruce → año de independencia.
function coberturaDivGastos(){ if(typeof simYearTotal!=='function')return null; const nowY=new Date().getFullYear();
  const hoy=Date.now(), y1=hoy-365.25*86400000; let gastoReal=0; (DB.movimientos||[]).forEach(m=>{ if((m.tipo||'')==='gasto'&&m.fecha){ const ms=Date.parse(m.fecha+'T00:00:00'); if(!isNaN(ms)&&ms>=y1&&ms<=hoy)gastoReal+=num(m.importe); } });
  if(gastoReal<=0){ const porY={}; (DB.movimientos||[]).forEach(m=>{ if((m.tipo||'')==='gasto'&&m.fecha){ const y=+m.fecha.slice(0,4); if(y)porY[y]=(porY[y]||0)+num(m.importe); } }); const ys=Object.keys(porY).map(Number).sort((a,b)=>b-a); if(ys.length)gastoReal=porY[ys[0]]; }
  const divNow=num(simYearTotal(nowY)); if(gastoReal<=0)return {gastoReal:0,divNow,cobertura:null};
  const cobertura=divNow>0?divNow/gastoReal:0;
  const horizon=Math.max(nowY,(typeof maxDataYear==='function'?maxDataYear():nowY)); let lastY=nowY,divLast=divNow;
  for(let Y=nowY;Y<=horizon;Y++){ const v=num(simYearTotal(Y)); if(v>0){lastY=Y;divLast=v;} }
  const cagr=(a,b,yrs)=>(a>0&&b>0&&yrs>0)?Math.pow(b/a,1/yrs)-1:null;
  let gDiv=cagr(divNow,divLast,lastY-nowY);
  if(gDiv==null){ let a=null,ay=null; for(let Y=nowY-6;Y<nowY;Y++){ const v=num(simYearTotal(Y)); if(v>0){a=v;ay=Y;break;} } gDiv=(a!=null&&divNow>0&&(nowY-ay)>0)?cagr(a,divNow,nowY-ay):0.05; }
  if(gDiv==null||!isFinite(gDiv))gDiv=0.05; gDiv=Math.max(-0.3,Math.min(gDiv,0.4));
  const infla=(DB.config&&DB.config.fireInfla!=null)?num(DB.config.fireInfla):0.025;
  let anioIndep=null; const fullY=[],fullDiv=[],fullGasto=[];
  for(let Y=nowY;Y<=nowY+60;Y++){ let dv; if(Y<=lastY){ dv=num(simYearTotal(Y)); if(!(dv>0))dv=divLast*Math.pow(1+gDiv,Y-lastY); } else dv=divLast*Math.pow(1+gDiv,Y-lastY); const gs=gastoReal*Math.pow(1+infla,Y-nowY); fullY.push(Y);fullDiv.push(dv);fullGasto.push(gs); if(anioIndep==null&&dv>=gs)anioIndep=Y; }
  const chartEnd=anioIndep?Math.min(anioIndep+2,nowY+60):(nowY+15);
  const years=[],divSerie=[],gastoSerie=[]; for(let i=0;i<fullY.length;i++){ if(fullY[i]<=chartEnd){ years.push(fullY[i]);divSerie.push(fullDiv[i]);gastoSerie.push(fullGasto[i]); } }
  return {gastoReal,divNow,cobertura,gDiv,infla,anioIndep,horizon,lastY,years,divSerie,gastoSerie}; }

// === Riesgo y diversificación: volatilidad, drawdown, correlaciones (pesos actuales + precios diarios del repo) ===
function riesgoData(reRender){
  const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
  if(!pos.length)return {empty:true};
  const tickers=[...new Set(pos.map(p=>(p.ticker||'').toUpperCase()))];
  const need=[...new Set([...tickers,'IBEX'])]; const falta=need.filter(t=>_precioCache[t]===undefined);
  if(falta.length){ if(typeof cargarPreciosCartera==='function')cargarPreciosCartera().then(()=>{ if(typeof reRender==='function')reRender(); }); return {loading:true}; }
  const usable=tickers.filter(t=>{ const pj=_precioCache[t]; return pj&&pj.data&&pj.data.length>30; });
  if(usable.length<1)return {noData:true};
  const maps={}; usable.forEach(t=>{ const m={}; _precioCache[t].data.forEach(r=>{ m[r[0]]=num(r[1]); }); maps[t]=m; });
  const ibexData=_precioCache['IBEX']&&_precioCache['IBEX'].data; const ibexMap={}; if(ibexData)ibexData.forEach(r=>ibexMap[r[0]]=num(r[1]));
  let dates=Object.keys(maps[usable[0]]); usable.slice(1).forEach(t=>{ const mm=maps[t]; dates=dates.filter(d=>mm[d]!=null); }); dates.sort();
  const N=520; if(dates.length>N)dates=dates.slice(dates.length-N);
  if(dates.length<20)return {noData:true};
  let totV=0; const valById={}; pos.forEach(p=>{ const t=(p.ticker||'').toUpperCase(); if(usable.includes(t)){ const v=p.acciones*num(p.precioActual); valById[t]=(valById[t]||0)+v; totV+=v; } });
  const W={}; usable.forEach(t=>W[t]=totV>0?(valById[t]||0)/totV:0);
  const ret={}; usable.forEach(t=>{ const arr=[]; for(let i=1;i<dates.length;i++){ const p0=maps[t][dates[i-1]],p1=maps[t][dates[i]]; arr.push(p0>0?(p1/p0-1):0); } ret[t]=arr; });
  const n=dates.length-1;
  const portRet=[]; for(let i=0;i<n;i++){ let r=0; usable.forEach(t=>{ r+=W[t]*ret[t][i]; }); portRet.push(r); }
  let ibexRet=null; if(ibexData&&dates.every(d=>ibexMap[d]!=null)){ ibexRet=[]; for(let i=1;i<dates.length;i++){ const p0=ibexMap[dates[i-1]],p1=ibexMap[dates[i]]; ibexRet.push(p0>0?(p1/p0-1):0); } }
  const mean=a=>a.reduce((s,x)=>s+x,0)/(a.length||1);
  const std=a=>{ if(a.length<2)return 0; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1)); };
  const corr=(a,b)=>{ if(a.length<2)return 0; const ma=mean(a),mb=mean(b); let nu=0,da=0,db=0; for(let i=0;i<a.length;i++){ nu+=(a[i]-ma)*(b[i]-mb); da+=(a[i]-ma)*(a[i]-ma); db+=(b[i]-mb)*(b[i]-mb); } return (da&&db)?nu/Math.sqrt(da*db):0; };
  const ANN=Math.sqrt(252);
  const volPort=std(portRet)*ANN; const volById={}; usable.forEach(t=>volById[t]=std(ret[t])*ANN);
  let idx=100,peak=100,ddMax=0; for(let i=0;i<n;i++){ idx*=(1+portRet[i]); if(idx>peak)peak=idx; const dd=idx/peak-1; if(dd<ddMax)ddMax=dd; }
  let beta=null,corrIbex=null; if(ibexRet){ corrIbex=corr(portRet,ibexRet); const mI=mean(ibexRet),mP=mean(portRet); let cov=0; for(let i=0;i<n;i++)cov+=(portRet[i]-mP)*(ibexRet[i]-mI); cov/=(n-1); const vI=std(ibexRet); beta=(vI>0)?cov/(vI*vI):null; }
  const corrM={}; usable.forEach(a=>{ corrM[a]={}; usable.forEach(b=>{ corrM[a][b]=(a===b)?1:corr(ret[a],ret[b]); }); });
  let cs=0,cc=0; for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++){ cs+=corrM[usable[i]][usable[j]]; cc++; } const avgCorr=cc?cs/cc:null;
  let hhi=0; usable.forEach(t=>hhi+=W[t]*W[t]); const effN=hhi>0?1/hhi:0; const topT=usable.slice().sort((a,b)=>W[b]-W[a])[0]; const topW=topT?W[topT]:0;
  const secW={}; usable.forEach(t=>{ const s=(typeof SECTOR!=='undefined'&&SECTOR[t])||'Sin sector'; secW[s]=(secW[s]||0)+W[t]; });
  return {ok:true,tickers:usable,W,volPort,volById,ddMax,beta,corrIbex,corrM,avgCorr,effN,topT,topW,secW,nDays:dates.length,desde:dates[0],hasta:dates[dates.length-1]};
}
function renderRiesgo(){ const el=$('#riesgoBody'); if(!el)return; const kp=$('#riesgoKpis'); const R=riesgoData(renderRiesgo);
  if(!R||R.empty){ el.innerHTML='<div class="empty">Sin posiciones abiertas.</div>'; if(kp)kp.innerHTML=''; return; }
  if(R.loading){ el.innerHTML='<div class="muted" style="font-size:12px">Cargando cotizaciones del repo… (necesita conexión)</div>'; if(kp)kp.innerHTML=''; return; }
  if(R.noData){ el.innerHTML='<div class="empty">No hay suficiente histórico de precios en el repo para calcular el riesgo. Ejecuta la actualización de cotizaciones.</div>'; if(kp)kp.innerHTML=''; return; }
  const pv=x=>x==null?'—':(x*100).toFixed(1)+'%';
  if(kp)kp.innerHTML=[
    ['Volatilidad anual',pv(R.volPort),R.volPort>0.25?'neg':(R.volPort<0.15?'pos':'')],
    ['Drawdown máximo',pv(R.ddMax),'neg'],
    ['Beta vs IBEX',R.beta==null?'—':R.beta.toFixed(2),''],
    ['Correlación media',R.avgCorr==null?'—':R.avgCorr.toFixed(2),(R.avgCorr!=null&&R.avgCorr<0.5)?'pos':(R.avgCorr>=0.7?'neg':'')],
    ['Nº efectivo posiciones',R.effN.toFixed(1)+' / '+R.tickers.length,''],
    ['Concentración top',R.topT+' '+pv(R.topW),R.topW>=0.35?'neg':'']
  ].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]||''}">${k[1]}</div></div>`).join('');
  const perT=R.tickers.slice().sort((a,b)=>R.W[b]-R.W[a]);
  const avgCorrOf=t=>{ let s=0,c=0; R.tickers.forEach(o=>{ if(o!==t){s+=R.corrM[t][o];c++;} }); return c?s/c:null; };
  const trows=perT.map(t=>{ const a=avgCorrOf(t); return `<tr><td><b data-ficha="${t}" style="cursor:pointer;color:var(--brand)">${t}</b></td><td class="num">${pv(R.W[t])}</td><td class="num">${pv(R.volById[t])}</td><td class="num">${a==null?'—':a.toFixed(2)}</td></tr>`; }).join('');
  const colFor=v=>{ if(v==null)return '#fff'; const x=Math.max(-1,Math.min(1,v)); if(x>=0){ const c=Math.round(255-x*105); return `rgb(255,${c},${c})`; } const c=Math.round(255+x*105); return `rgb(${c},255,${c})`; };
  const head='<tr><th></th>'+perT.map(t=>`<th class="num" style="font-size:10px">${t}</th>`).join('')+'</tr>';
  const mrows=perT.map(a=>`<tr><th style="text-align:left;font-size:10px">${a}</th>`+perT.map(b=>{ const v=R.corrM[a][b]; return `<td class="num" style="background:${colFor(v)};font-size:10px">${v.toFixed(2)}</td>`; }).join('')+'</tr>').join('');
  const secArr=Object.keys(R.secW).map(s=>({s,w:R.secW[s]})).sort((a,b)=>b.w-a.w);
  const secRows=secArr.map(x=>`<tr><td>${x.s}</td><td class="num ${x.w>=0.35?'neg':''}">${pv(x.w)}</td></tr>`).join('');
  el.innerHTML=`<div class="sub" style="margin-bottom:8px">Riesgo de tu cartera <b>actual</b> (pesos de hoy) con las cotizaciones diarias del repo · ${R.nDays} días · ${R.desde} → ${R.hasta}. Volatilidad y beta anualizadas.</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
    <div><h3 style="font-size:14px;margin:0 0 6px">Por posición</h3><div style="overflow:auto"><table><thead><tr><th>Empresa</th><th class="num">Peso</th><th class="num">Volat.</th><th class="num">Corr. media</th></tr></thead><tbody>${trows}</tbody></table></div></div>
    <div><h3 style="font-size:14px;margin:0 0 6px">Peso por sector</h3><div style="overflow:auto"><table><thead><tr><th>Sector</th><th class="num">Peso</th></tr></thead><tbody>${secRows}</tbody></table></div></div>
  </div>
  <h3 style="font-size:14px;margin:14px 0 6px">Matriz de correlaciones</h3><div class="sub" style="margin-bottom:6px">Verde = baja correlación (diversifica) · rojo = alta (se mueven juntas). Correlación media de la cartera: <b>${R.avgCorr==null?'—':R.avgCorr.toFixed(2)}</b>.</div><div style="overflow:auto"><table style="font-size:11px"><thead>${head}</thead><tbody>${mrows}</tbody></table></div>`;
}
// === Gráfico interactivo de evolución de la cartera para el Panel (coste / valor / valor+div) con tooltip al pasar el ratón ===
const _evoReg={}; let _evoBound=false;
function _evoHideAll(){ document.querySelectorAll('.evoTip').forEach(t=>t.style.display='none'); document.querySelectorAll('.evoGuide,.evoDot').forEach(el=>el.style.display='none'); }
function _evoBindHover(){ if(_evoBound)return; _evoBound=true;
  document.addEventListener('mousemove',e=>{
    const svg=(e.target&&e.target.closest)?e.target.closest('.evoSvg'):null;
    if(!svg){ _evoHideAll(); return; }
    const id=svg.getAttribute('data-evo'); const D=_evoReg[id]; if(!D)return;
    const r=svg.getBoundingClientRect(); if(!r.width)return;
    const vx=(e.clientX-r.left)*D.W/r.width; let bi=0,bd=Infinity; for(let i=0;i<D.xs.length;i++){ const dd=Math.abs(D.xs[i]-vx); if(dd<bd){bd=dd;bi=i;} }
    const gx=D.xs[bi]; const Yv=v=>D.padT+D.plotH-((num(v)-D.mn)/D.rng)*D.plotH;
    document.querySelectorAll('.evoTip').forEach(t=>{ if(t.getAttribute('data-evo')!==id)t.style.display='none'; });
    const g=svg.querySelector('.evoGuide'); if(g){ g.setAttribute('x1',gx); g.setAttribute('x2',gx); g.style.display=''; }
    const setDot=(cls,val)=>{ const c=svg.querySelector('.'+cls); if(c){ c.setAttribute('cx',gx); c.setAttribute('cy',Yv(val)); c.style.display=''; } };
    setDot('evoDotC',D.coste[bi]); setDot('evoDotV',D.valor[bi]); setDot('evoDotD',D.valdiv[bi]); if(D.hayIbex)setDot('evoDotX',D.ibex[bi]);
    const c=num(D.coste[bi]),v=num(D.valor[bi]),dv=num(D.valdiv[bi]); const rev=c>0?((dv-c)/c*100):0; const revc=c>0?((v-c)/c*100):0;
    const p=(D.labels[bi]||'').split('/'); const fecha=p.length===2?(p[1]+'/20'+p[0]):D.labels[bi];
    const wrap=svg.parentNode; const tip=wrap?wrap.querySelector('.evoTip'):null;
    if(tip){ let h=`<div style="font-weight:700;margin-bottom:3px">${fecha}</div><div><span style="color:#94a3b8">Precio de coste:</span> ${fmt(c)}</div><div><span style="color:#60a5fa">Valor (cotización):</span> ${fmt(v)}</div><div><span style="color:#4ade80">Valor + dividendo:</span> ${fmt(dv)}</div>`;
      if(D.hayIbex)h+=`<div><span style="color:#fbbf24">Si fuera IBEX-35:</span> ${fmt(num(D.ibex[bi]))}</div>`;
      h+=`<div style="margin-top:3px;border-top:1px solid #334155;padding-top:3px">Revalorización con dividendo: <b style="color:${rev>=0?'#4ade80':'#f87171'}">${rev>=0?'+':''}${rev.toFixed(1)}%</b></div><div style="color:#94a3b8">Solo cotización: ${revc>=0?'+':''}${revc.toFixed(1)}%</div>`;
      tip.innerHTML=h; const left=gx*r.width/D.W; tip.style.left=Math.max(70,Math.min(r.width-70,left))+'px'; tip.style.top='4px'; tip.style.display=''; }
  });
}
// Renderizador único e interactivo. opts: {id, reRender, ibex, goto, title, head, foot, mt}
function evoChartHTML(opts){ opts=opts||{}; const id=opts.id||'evo'; const d=carteraEvolData(opts.reRender);
  if(d.empty) return '';
  if(!d.ok) return `<div style="margin-top:${opts.mt!==undefined?opts.mt:16}px"><div class="muted" style="font-size:12px">Cargando cotizaciones…</div></div>`;
  _evoBindHover();
  const labels=d.labels, coste=d.aport, valor=d.valor, valdiv=d.valdiv, ibex=d.ibexVal||[], n=labels.length; const wantIbex=!!(opts.ibex&&d.hayIbex);
  const W=820,H=300,padL=60,padR=14,padT=12,padB=38; const plotW=W-padL-padR, plotH=H-padT-padB;
  let all=coste.concat(valor,valdiv); if(wantIbex)all=all.concat(ibex); all=all.map(num); const mn=Math.min(0,...all), mx=Math.max(1,...all), rng=(mx-mn)||1;
  const X=i=> n>1 ? padL+i*plotW/(n-1) : padL+plotW/2; const Y=v=> padT+plotH-((num(v)-mn)/rng)*plotH;
  const poly=(arr,col,w,dash)=>`<polyline points="${arr.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
  const yax=(typeof gYAxis==='function')?gYAxis(mn,mx,padL,padT,plotH,W,false):'';
  const step=Math.ceil(n/9)||1; let xl=''; labels.forEach((lb,i)=>{ if(i%step===0){ const p=lb.split('/'); xl+=`<text x="${X(i).toFixed(1)}" y="${H-18}" font-size="10" text-anchor="middle" fill="#64748b">${p[1]}/${p[0]}</text>`; } });
  const xs=labels.map((_,i)=>X(i)); _evoReg[id]={labels,coste,valor,valdiv,ibex,hayIbex:wantIbex,xs,W,padT,plotH,mn,rng};
  const guide=`<line class="evoGuide" x1="0" x2="0" y1="${padT}" y2="${padT+plotH}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" style="display:none"/>`;
  const dots=`<circle class="evoDot evoDotC" r="3.5" fill="#64748b" style="display:none"/>${wantIbex?'<circle class="evoDot evoDotX" r="3.5" fill="#f59e0b" style="display:none"/>':''}<circle class="evoDot evoDotV" r="3.5" fill="#2563eb" style="display:none"/><circle class="evoDot evoDotD" r="3.5" fill="#16a34a" style="display:none"/>`;
  const ibexLine=wantIbex?poly(ibex,'#f59e0b',1.6,'6 4'):'';
  const svg=`<svg class="evoSvg" data-evo="${id}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;cursor:crosshair" preserveAspectRatio="xMidYMid meet">${yax}${guide}${poly(coste,'#94a3b8',1.6)}${ibexLine}${poly(valor,'#2563eb',2)}${poly(valdiv,'#16a34a',2)}${dots}${xl}</svg>`;
  const lc=num(coste[n-1]),lv=num(valor[n-1]),ld=num(valdiv[n-1]); const rev=lc>0?((ld-lc)/lc*100):0;
  const leg=`<div style="display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;margin-top:2px"><span><span style="display:inline-block;width:10px;height:10px;background:#94a3b8;border-radius:2px;margin-right:4px"></span>Precio de coste</span>${wantIbex?'<span><span style="display:inline-block;width:10px;height:10px;background:#f59e0b;border-radius:2px;margin-right:4px"></span>Si fuera IBEX-35</span>':''}<span><span style="display:inline-block;width:10px;height:10px;background:#2563eb;border-radius:2px;margin-right:4px"></span>Valor (cotización)</span><span><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:2px;margin-right:4px"></span>Valor + dividendos</span></div>`;
  const tip=`<div class="evoTip" data-evo="${id}" style="display:none;position:absolute;pointer-events:none;background:#0f172a;color:#fff;font-size:11.5px;line-height:1.35;padding:7px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);z-index:20;white-space:nowrap;transform:translateX(-50%)"></div>`;
  const head=(opts.head===false)?'':`<h3 style="cursor:pointer;margin-bottom:6px" data-goto="${opts.goto||'graficas'}">${opts.title||'Evolución de la cartera'} <span class="muted" style="font-size:12px">›</span></h3>`;
  const foot=(opts.foot===false)?'':`<div class="muted" style="font-size:11.5px;margin-top:4px">Hoy · coste ${fmt(lc)} · valor ${fmt(lv)} · con dividendos ${fmt(ld)} · revalorización con dividendo <b style="color:${rev>=0?'#16a34a':'#dc2626'}">${rev>=0?'+':''}${rev.toFixed(1)}%</b></div>`;
  const mt=opts.mt!==undefined?opts.mt:16;
  return `<div style="margin-top:${mt}px">${head}<div class="evoWrap" style="position:relative">${svg}${tip}</div>${leg}${foot}</div>`; }
// alias de compatibilidad
function evoPanelHTML(reRender){ return evoChartHTML({id:'evoPanel',reRender:reRender,goto:'graficas'}); }

function aportValorHTML(reRender){ const _ops2=_allOps().filter(o=>o.fecha).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  const _needP=[...new Set([..._ops2.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean),'IBEX'])]; const _faltaP=_needP.filter(t=>_precioCache[t]===undefined);
  if(!_ops2.length)return '<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px">Aportado vs valor</div><div class="muted" style="font-size:12px">Sin operaciones.</div></div>';
  if(_faltaP.length){ if(typeof cargarPreciosCartera==='function')cargarPreciosCartera().then(()=>{ if(typeof reRender==='function')reRender(); }); return '<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px">Aportado acumulado vs valor de cartera</div><div class="muted" style="font-size:12px">Cargando cotizaciones…</div></div>'; }
  const priceAt=(t,ms)=>priceAtFB(t,ms);
  const sharesAt=(t,ms)=>{ let sh=0; _ops2.forEach(o=>{ if((o.ticker||'').toUpperCase()===t){ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; };
  const divEv=[]; const _dvO=DB.dividendos||{}; Object.keys(_dvO).forEach(t=>{ const T=(t||'').toUpperCase(); (_dvO[t]||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  (DB.cerradas||[]).forEach(c=>{ const T=(c.ticker||'').toUpperCase(); (c.divs||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  const _opSet=new Set(_ops2.map(o=>(o.ticker||"").toUpperCase())); const _dIng=DB.divIngresos||{}; Object.keys(_dIng).forEach(t=>{ if(_opSet.has((t||"").toUpperCase()))return; Object.keys(_dIng[t]||{}).forEach(y=>{ divEv.push({ms:Date.UTC(+y,11,31),eur:num(_dIng[t][y])}); }); });
  divEv.sort((a,b)=>a.ms-b.ms);
  const t0=new Date(Date.parse(_ops2[0].fecha+'T00:00:00')); let yy=t0.getFullYear(),mn2=t0.getMonth(); const now=new Date(); const labels=[],aport=[],valor=[],valdiv=[]; let divAc=0,di=0; const _ibexJ=_precioCache['IBEX']; const hayIbex=!!(_ibexJ&&_ibexJ.data&&_ibexJ.data.length); const ibexVal=[]; let ibexUnits=0,_prevAp=0;
  while(yy<now.getFullYear()||(yy===now.getFullYear()&&mn2<=now.getMonth())){ const cut=Date.UTC(yy,mn2+1,0); const sh={}; let ap=0;
    _ops2.forEach(o=>{ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=cut){ const t=(o.ticker||'').toUpperCase(); const sg=o.tipo==='venta'?-1:1; sh[t]=(sh[t]||0)+sg*num(o.acciones); ap+=sg*num(o.acciones)*num(o.precio); } });
    while(di<divEv.length&&divEv[di].ms<=cut){ divAc+=divEv[di].eur; di++; }
    const isLast=(yy===now.getFullYear()&&mn2===now.getMonth()); const _pxAt=(t)=>{ const T=(t||'').toUpperCase(); if(isLast){ const v=(DB.valores||{})[T]||{}; const lp=num(v.precioActual), lf=(v.precioFecha||''); const pj=_precioCache[T]; let rp=0,rf=''; if(pj&&pj.data&&pj.data.length){ rp=num(pj.data[pj.data.length-1][1]); rf=pj.data[pj.data.length-1][0]; } if(lp>0&&rp>0) return (lf>=rf)?lp:rp; if(rp>0) return rp; if(lp>0) return lp; } return priceAt(t,cut); }; let val=0; Object.keys(sh).forEach(t=>{ if(sh[t]>0.0001)val+=sh[t]*_pxAt(t); });
    labels.push(String(yy).slice(2)+'/'+String(mn2+1).padStart(2,'0')); aport.push(ap); valor.push(val); valdiv.push(val+divAc); if(hayIbex){ const ipx=priceRepoAt('IBEX',cut); const dAp=ap-_prevAp; if(ipx>0&&dAp!==0)ibexUnits+=dAp/ipx; ibexVal.push(ipx>0?ibexUnits*ipx:(ibexVal.length?ibexVal[ibexVal.length-1]:0)); } _prevAp=ap; mn2++; if(mn2>11){mn2=0;yy++;} }
  const _ser=[{name:'Aportado',color:'#94a3b8',vals:aport}]; if(hayIbex)_ser.push({name:'Si fuera IBEX-35',color:'#f59e0b',vals:ibexVal,dash:'6 4'}); _ser.push({name:'Valor cartera',color:'#2563eb',vals:valor}); _ser.push({name:'Valor + dividendos',color:'#16a34a',vals:valdiv}); return gLines('Aportado vs valor vs valor+dividendos (cotización real)'+(hayIbex?' vs IBEX-35':''),labels,_ser); }
function renderGraficas(){ const elH=$('#grafHogar'),elI=$('#grafInv'); if(!elH&&!elI)return;
  const ys=grafYears(); if(!ys.includes(grafYear))grafYear=ys[0]||new Date().getFullYear();
  const selEl=$('#grafYear'); if(selEl)selEl.innerHTML=ys.map(y=>`<option value="${y}"${y===grafYear?' selected':''}>${y}</option>`).join('');
  const Y=grafYear, MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  if(elH){ const movs=(DB.movimientos||[]).filter(m=>m.fecha&&+m.fecha.slice(0,4)===Y); const gasMes=new Array(12).fill(0),ingMes=new Array(12).fill(0);
    movs.forEach(m=>{ const mo=+m.fecha.slice(5,7)-1; if(mo<0||mo>11)return; if(m.tipo==='gasto')gasMes[mo]+=num(m.importe); else if(m.tipo==='ingreso')ingMes[mo]+=num(m.importe); });
    let presMes=0; (DB.presupuesto||[]).filter(p=>pAnio(p)===Y).forEach(p=>{ const c=catById(p.categoriaId); if(c&&c.tipo==='gasto')presMes+=mensual(p); });
    const c1=gBars('Gasto real vs presupuesto por mes · '+Y,MES,[{name:'Gasto real',color:'#dc2626',vals:gasMes},{name:'Presupuesto',color:'#94a3b8',vals:new Array(12).fill(presMes)}]);
    const porG={}; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const c=catById(m.categoriaId); const g=(c&&c.grupo)||'Otros'; porG[g]=(porG[g]||0)+num(m.importe); });
    const c2=gDonut('Reparto del gasto por grupo · '+Y,Object.keys(porG).map(g=>({label:g,val:porG[g]})));
    const ah=MES.map((_,i)=>ingMes[i]?((ingMes[i]-gasMes[i])/ingMes[i]*100):0);
    const c3=gLine('Tasa de ahorro mensual % · '+Y,MES,ah,{pct:true,color:'#16a34a'});
    const _gcat={}; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const c=catById(m.categoriaId); const _n=(c&&c.nombre)||'Otros'; _gcat[_n]=(_gcat[_n]||0)+num(m.importe); }); const cTop=gHBars('Top categorías de gasto · '+Y,Object.keys(_gcat).map(k=>({label:k,val:_gcat[k]})).sort((a,b)=>b.val-a.val),{top:10}); const _gt={Carlos:0,Susana:0}; let _sin=0; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const _tt=m.titular||''; const _v=num(m.importe); if(_tt==='Carlos')_gt.Carlos+=_v; else if(_tt==='Susana')_gt.Susana+=_v; else if(_tt==='Dos'){ _gt.Carlos+=_v/2; _gt.Susana+=_v/2; } else _sin+=_v; }); const _itit=[{label:'Carlos',val:_gt.Carlos},{label:'Susana',val:_gt.Susana}]; if(_sin>0)_itit.push({label:'Sin asignar',val:_sin}); const cTit=gDonut('Reparto del gasto por titular · '+Y+' (Dos al 50%)',_itit); const _gcom={}; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const _co=(m.comercio||'').trim()||'(sin comercio)'; _gcom[_co]=(_gcom[_co]||0)+num(m.importe); }); const cCom=gHBars('Top comercios de gasto · '+Y,Object.keys(_gcom).map(k=>({label:k,val:_gcom[k]})).sort((a,b)=>b.val-a.val),{top:10});
    elH.innerHTML=`<div style="margin-bottom:12px">${c1}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px">${c2}${c3}${cTop}${cTit}${cCom}</div>`; }
  if(elI){ const snaps=(typeof patSnaps==='function'?patSnaps():[]); const labels=snaps.map(s=>(s.fecha||'').slice(0,7));
    const ef=snaps.map(s=>(s.lineas||[]).reduce((a,l)=>a+num(l.ef),0)), inv=snaps.map(s=>(s.lineas||[]).reduce((a,l)=>a+num(l.inv),0));
    const c4=labels.length?gStack('Patrimonio: efectivo vs invertido',labels,ef,inv,['Efectivo','Invertido']):'<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px">Patrimonio</div><div class="muted" style="font-size:12px">Sin snapshots de Patrimonio.</div></div>';
    const pos=(typeof invPositions==='function'?invPositions():[]).filter(p=>p.acciones>0.0001);
    const _empAgg={}; pos.forEach(p=>{ const _t=(p.ticker||'').toUpperCase(); _empAgg[_t]=(_empAgg[_t]||0)+p.acciones*num(p.precioActual); }); const c5=gDonut('Composición de la cartera por empresa',Object.keys(_empAgg).map(_t=>({label:_t,val:_empAgg[_t]}))); const _secAgg={}; pos.forEach(p=>{ const _sec=(typeof SECTOR!=='undefined'&&SECTOR[(p.ticker||'').toUpperCase()])||'Sin sector'; _secAgg[_sec]=(_secAgg[_sec]||0)+p.acciones*num(p.precioActual); }); const c5b=gDonut('Composición por sector',Object.keys(_secAgg).map(x=>({label:x,val:_secAgg[x]})));
    const nowY=new Date().getFullYear(); const yA=[]; for(let y=nowY-6;y<=nowY+2;y++)yA.push(y); const dv=yA.map(y=>(typeof simYearTotal==='function'?simYearTotal(y):0));
    const dvP=yA.map((y,i)=>y<=nowY?dv[i]:0), dvF=yA.map((y,i)=>y>nowY?dv[i]:0);
    const c6=gBars('Dividendo bruto por año ('+(nowY+1)+'-'+(nowY+2)+' = previsión)',yA.map(String),[{name:'Cobrado/actual',color:'#16a34a',vals:dvP},{name:'Previsión',color:'#93c5fd',vals:dvF}]);
    const mes=(typeof cajaDivMes==='function'?cajaDivMes():new Array(12).fill(0));
    const c7=gBars('Dividendo estimado por mes (ciclo actual)',MES,[{name:'Dividendo',color:'#2563eb',vals:mes}]);
    const _capY={}; (DB.operaciones||[]).forEach(o=>{ if((o.tipo||'')!=='venta'){ const _y=(o.fecha||'').slice(0,4); if(_y)_capY[_y]=(_capY[_y]||0)+num(o.acciones)*num(o.precio); } }); const _capYrs=Object.keys(_capY).sort(); const cCap=gBars('Capital invertido por año',_capYrs,[{name:'Invertido',color:'#0d9488',vals:_capYrs.map(y=>_capY[y])}]);
    const _ag={}; pos.forEach(p=>{ const _t=(p.ticker||'').toUpperCase(); const a=_ag[_t]=_ag[_t]||{cost:0,val:0}; a.cost+=p.acciones*num(p.precioCompra); a.val+=p.acciones*num(p.precioActual); }); const cRent=gHBars('Rentabilidad por empresa (plusvalía %)',Object.keys(_ag).map(_t=>({label:_t,val:_ag[_t].cost?((_ag[_t].val/_ag[_t].cost)-1)*100:0})).sort((a,b)=>b.val-a.val),{pct:true,signColor:true,top:12});
    const _nyB=new Date().getFullYear(); let _acB=0; const _bnV=[],_bnY=[]; for(let y=2011;y<=_nyB;y++){ _acB+=(typeof simYearTotal==='function'?simYearTotal(y):0); _bnV.push(_acB); _bnY.push(String(y)); } const cBola=gBars('Bola de nieve: dividendos brutos acumulados',_bnY,[{name:'Acumulado',color:'#16a34a',vals:_bnV}]);
    const _ot=Object.keys(_objCache); const _oit=_ot.map(t=>({t:t,real:_objCache[t].real,obj:_objCache[t].obj})).filter(x=>x.obj>0||x.real>0).sort((a,b)=>b.obj-a.obj).slice(0,12); const cObj=_oit.length?gBars('Cartera: real vs objetivo (€)',_oit.map(x=>x.t),[{name:'Real',color:'#2563eb',vals:_oit.map(x=>x.real)},{name:'Objetivo',color:'#94a3b8',vals:_oit.map(x=>x.obj)}]):'<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">Cartera: real vs objetivo</div><div class="muted" style="font-size:12px">Abre la Diversificación una vez para calcular el objetivo.</div></div>';
    const _nyY=new Date().getFullYear(); const _yy=[],_yv=[]; const _dpa=DB.divPorAccion||{}; const _allT=[...new Set((DB.operaciones||[]).map(o=>(o.ticker||'').toUpperCase()).filter(Boolean))]; for(let y=2011;y<=_nyY;y++){ let coste=0; (DB.operaciones||[]).forEach(o=>{ const oy=+((o.fecha||'').slice(0,4)); if(oy&&oy<=y)coste+=(o.tipo==='venta'?-1:1)*num(o.acciones)*num(o.precio); }); let divA=0; _allT.forEach(t=>{ const sh=(typeof realSharesAt==='function')?realSharesAt(t,y):0; divA+=sh*num((_dpa[t]||{})[y]||0); }); if(coste>0){ _yy.push(String(y)); _yv.push(divA/coste*100); } } const cYoC=_yy.length?gLine('Yield on cost por año (%)',_yy,_yv,{pct:true,color:'#16a34a'}):'<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">YoC por año</div><div class="muted" style="font-size:12px">Sin datos.</div></div>'; const _rpY=[],_rpV=[]; for(let y=2011;y<=_nyY;y++){ let val=0,divA=0; _allT.forEach(t=>{ const sh=(typeof realSharesAt==='function')?realSharesAt(t,y):0; if(sh>0.0001){ divA+=sh*num((_dpa[t]||{})[y]||0); val+=sh*priceAtFB(t,Date.UTC(y,11,31)); } }); if(val>0){ _rpY.push(String(y)); _rpV.push(divA/val*100); } } const cRPD=_rpY.length?gLine('RPD por año (%) · dividendo \u00f7 cotización',_rpY,_rpV,{pct:true,color:'#0ea5e9'}):'<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">RPD por año</div><div class="muted" style="font-size:12px">Sin datos de cotización aún.</div></div>';
    const cAport=(typeof evoChartHTML==='function')?evoChartHTML({id:'evoGraf',reRender:renderGraficas,ibex:true}):aportValorHTML(renderGraficas);
    let cCob='';
    if(typeof coberturaDivGastos==='function'){ const F=coberturaDivGastos(); if(F&&F.cobertura!=null&&F.years&&F.years.length){ cCob=gLines('Dividendo bruto previsto vs gasto anual'+(F.anioIndep?' · independencia en '+F.anioIndep:' · no alcanzado'),F.years.map(String),[{name:'Dividendo bruto',color:'#16a34a',vals:F.divSerie},{name:'Gasto anual',color:'#dc2626',vals:F.gastoSerie}]); } else cCob='<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">Independencia (dividendos vs gastos)</div><div class="muted" style="font-size:12px">Sin gasto registrado o sin dividendos previstos.</div></div>'; }
    elI.innerHTML=`<div style="margin-bottom:12px">${c4}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:12px">${c5}${c5b}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:12px">${c6}${c7}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">${cCap}${cRent}${cBola}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:12px">${cObj}${cYoC}${cRPD}</div><div style="margin-top:12px">${cAport}</div><div style="margin-top:12px">${cCob}</div>`; }
}
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='grafYear'){ grafYear=+e.target.value; renderGraficas(); } });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('button[data-view="graficas"]'); if(b&&typeof renderGraficas==='function')setTimeout(renderGraficas,0); });
function proxRenov(p){ if(!p||!p.renovacion)return null; const base=new Date(p.renovacion+'T00:00:00'); if(isNaN(base.getTime()))return null; const today=new Date(); today.setHours(0,0,0,0); const f=(p.frecuencia||'').toLowerCase(); const stepM=f==='mensual'?1:(f==='bianual'?24:(f==='anual'?12:0)); let d=new Date(base); if(stepM>0){ let g=0; while(d<today&&g<2000){ d.setMonth(d.getMonth()+stepM); g++; } } return d; }
function renovList(maxDias){ const out=[]; const seen={}; const today=new Date(); today.setHours(0,0,0,0); (DB.presupuesto||[]).forEach(p=>{ if(!p.renovacion)return; const k=p.categoriaId+'|'+p.renovacion; if(seen[k])return; seen[k]=1; const d=proxRenov(p); if(!d)return; const dias=Math.round((d-today)/86400000); if(maxDias!=null&&dias>maxDias)return; const c=(typeof catById==='function')?catById(p.categoriaId):null; out.push({nombre:(c&&c.nombre)||'—',grupo:(c&&c.grupo)||'',importe:num(p.importe),frec:p.frecuencia||'',metodo:p.metodoPago||'',fecha:d,dias}); }); out.sort((a,b)=>a.fecha-b.fecha); return out; }
function renderRenov(){ const el=$('#presRenov'); if(!el)return; const list=renovList(null); if(!list.length){ el.innerHTML=''; return; }
  const rows=list.map(r=>{ const cls=(r.dias<=7)?'r':(r.dias<=30?'a':''); const dtxt=r.dias<0?('vencida '+(-r.dias)+'d'):(r.dias===0?'hoy':('en '+r.dias+' d')); const f=r.fecha; const fs=String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0')+'/'+f.getFullYear();
    return `<tr><td>${r.nombre}</td><td class="muted">${r.grupo}</td><td class="num">${fmt(r.importe)}</td><td>${r.frec}</td><td>${r.metodo||'<span class="muted">—</span>'}</td><td>${fs}</td><td><span class="pill ${cls}">${dtxt}</span></td></tr>`; }).join('');
  el.innerHTML=`<h3 style="margin:0 0 6px;font-size:14px">Próximas renovaciones y pagos</h3><div class="sub" style="margin-bottom:6px">De las partidas del Presupuesto con fecha de renovación. Rojo = vencida o ≤7 días · ámbar = ≤30 días.</div><div style="overflow:auto"><table><thead><tr><th>Concepto</th><th>Grupo</th><th class="num">Importe</th><th>Frecuencia</th><th>Método</th><th>Próxima</th><th>Aviso</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
