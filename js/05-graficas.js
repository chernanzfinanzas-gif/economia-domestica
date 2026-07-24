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
function gDonut(title,items,opt){ opt=opt||{}; const _dsz=num(opt.size)||140; items=items.filter(x=>num(x.val)>0).sort((a,b)=>b.val-a.val); const tot=items.reduce((s,x)=>s+num(x.val),0);
  if(!tot)return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div class="muted" style="font-size:12px">Sin datos.</div></div>`;
  const cx=70,cy=70,r=58,rin=34; let segs='';
  if(items.length===1){ const col=items[0].color||GRAF_COLS[0]; segs=`<circle cx="${cx}" cy="${cy}" r="${((r+rin)/2).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${r-rin}"><title>${gEsc(items[0].label)}: ${fmt(items[0].val)} (100%)</title></circle>`; }
  else { let a0=-Math.PI/2; items.forEach((x,i)=>{ const frac=num(x.val)/tot; const a1=a0+frac*2*Math.PI; const lg=frac>0.5?1:0; const col=x.color||GRAF_COLS[i%GRAF_COLS.length];
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),xi1=cx+rin*Math.cos(a1),yi1=cy+rin*Math.sin(a1),xi0=cx+rin*Math.cos(a0),yi0=cy+rin*Math.sin(a0);
    segs+=`<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${lg} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${xi1.toFixed(1)} ${yi1.toFixed(1)} A${rin} ${rin} 0 ${lg} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z" fill="${col}"><title>${gEsc(x.label)}: ${fmt(x.val)} (${(frac*100).toFixed(1)}%)</title></path>`; a0=a1; }); }
  const leg=items.map((x,i)=>`<div style="font-size:11px;margin:1px 0;white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;background:${x.color||GRAF_COLS[i%GRAF_COLS.length]};border-radius:2px;margin-right:5px"></span>${gEsc(x.label)} <b>${fmt(x.val)}</b> <span class="muted">${(x.val/tot*100).toFixed(0)}%</span></div>`).join('');
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><svg width="${_dsz}" height="${_dsz}" viewBox="0 0 140 140">${segs}<text x="70" y="74" font-size="10" text-anchor="middle" fill="#475569">${fmt(tot)}</text></svg><div style="flex:1;min-width:150px">${leg}</div></div></div>`; }
// === Tooltip interactivo genérico para gLine/gLines (guía vertical + puntos + etiqueta con fecha/valor al pasar el ratón) ===
const _gtReg={}; let _gtSeq=0, _gtBound=false;
function _gtHideAll(){ document.querySelectorAll('.gtTip').forEach(t=>t.style.display='none'); document.querySelectorAll('.gtGuide,.gtDotH').forEach(el=>el.style.display='none'); }
function _gtBind(){ if(_gtBound)return; _gtBound=true;
  document.addEventListener('mousemove',e=>{
    const svg=(e.target&&e.target.closest)?e.target.closest('.gtSvg'):null;
    if(!svg){ _gtHideAll(); return; }
    const id=svg.getAttribute('data-gt'); const D=_gtReg[id]; if(!D){ _gtHideAll(); return; }
    const r=svg.getBoundingClientRect(); if(!r.width)return;
    const vx=(e.clientX-r.left)*D.W/r.width;
    let bi=0,bd=Infinity; for(let i=0;i<D.xs.length;i++){ const dd=Math.abs(D.xs[i]-vx); if(dd<bd){bd=dd;bi=i;} }
    const gx=D.xs[bi];
    document.querySelectorAll('.gtTip').forEach(t=>{ if(t.getAttribute('data-gt')!==id)t.style.display='none'; });
    const g=svg.querySelector('.gtGuide'); if(g){ g.setAttribute('x1',gx); g.setAttribute('x2',gx); g.style.display=''; }
    D.series.forEach((s,si)=>{ const c=svg.querySelector('.gtDotH'+si); if(c){ c.setAttribute('cx',gx); c.setAttribute('cy',D.Y(s.vals[bi]).toFixed(1)); c.style.display=''; } });
    const wrap=svg.parentNode; const tip=wrap?wrap.querySelector('.gtTip'):null;
    if(tip){ let h=`<div style="font-weight:700;margin-bottom:2px">${gEsc(D.labels[bi])}</div>`;
      D.series.forEach(s=>{ const v=num(s.vals[bi]); const nm=s.name?`${gEsc(s.name)}: `:''; h+=`<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:5px"></span>${nm}<b>${D.pct?v.toFixed(1)+'%':fmt(v)}</b></div>`; });
      tip.innerHTML=h; const left=gx*r.width/D.W; tip.style.left=Math.max(58,Math.min(r.width-58,left))+'px'; tip.style.top='4px'; tip.style.display=''; }
  },{passive:true});
}
// Registra un gráfico y devuelve {id, guide, dots, tip} para inyectar en el SVG. geom:{W,padL,padT,plotH,plotW,mn,rng,pct}
function _gtRegister(labels,series,geom){
  if(Object.keys(_gtReg).length>300){ for(const k in _gtReg)delete _gtReg[k]; }
  const id='gt'+(++_gtSeq);
  const X=i=> labels.length>1 ? geom.padL+i*geom.plotW/(labels.length-1) : geom.padL+geom.plotW/2;
  const Y=v=> geom.padT+geom.plotH-((num(v)-geom.mn)/geom.rng)*geom.plotH;
  const xs=labels.map((_,i)=>X(i));
  _gtReg[id]={labels,series,xs,W:geom.W,Y,pct:!!geom.pct};
  _gtBind();
  const guide=`<line class="gtGuide" x1="0" x2="0" y1="${geom.padT}" y2="${(geom.padT+geom.plotH).toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" style="display:none"/>`;
  const dots=series.map((s,si)=>`<circle class="gtDotH gtDotH${si}" r="3.5" fill="${s.color}" stroke="#fff" stroke-width="1" style="display:none"/>`).join('');
  const tip=`<div class="gtTip" data-gt="${id}" style="display:none;position:absolute;pointer-events:none;background:#0f172a;color:#fff;font-size:11.5px;line-height:1.4;padding:6px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);z-index:20;white-space:nowrap;transform:translateX(-50%)"></div>`;
  return {id,guide,dots,tip};
}
function gLine(title,labels,vals,opt){ opt=opt||{}; const W=Math.max(340,labels.length*30+50),H=240,padL=44,padB=24,padT=12;
  const mn=Math.min(0,...vals.map(num)),mx=Math.max(1,...vals.map(num)),rng=(mx-mn)||1,plotH=H-padB-padT,plotW=W-padL-12;
  const X=i=>padL+(labels.length>1?i*plotW/(labels.length-1):plotW/2), Yf=v=>padT+plotH-((num(v)-mn)/rng)*plotH;
  const pts=vals.map((v,i)=>`${X(i).toFixed(1)},${Yf(v).toFixed(1)}`).join(' ');
  const dots=vals.map((v,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Yf(v).toFixed(1)}" r="2.5" fill="${opt.color||'#2563eb'}"><title>${gEsc(labels[i])}: ${opt.pct?num(v).toFixed(1)+'%':fmt(v)}</title></circle>`).join('');
  const xlab=labels.map((lb,i)=>`<text x="${X(i).toFixed(1)}" y="${H-7}" font-size="11" text-anchor="middle" fill="#64748b">${gEsc(lb)}</text>`).join('');
  const _gt=_gtRegister(labels,[{name:'',color:opt.color||'#2563eb',vals}],{W,padL,padT,plotH,plotW,mn,rng,pct:!!opt.pct});
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="overflow-x:auto"><div style="position:relative"><svg class="gtSvg" data-gt="${_gt.id}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;cursor:crosshair" preserveAspectRatio="xMidYMid meet">${gYAxis(mn,mx,padL,padT,plotH,W,opt.pct)}<line x1="${padL}" y1="${Yf(0).toFixed(1)}" x2="${W-12}" y2="${Yf(0).toFixed(1)}" stroke="#cbd5e1" stroke-dasharray="2 2"/>${_gt.guide}<polyline points="${pts}" fill="none" stroke="${opt.color||'#2563eb'}" stroke-width="2"/>${dots}${_gt.dots}${xlab}</svg>${_gt.tip}</div></div></div>`; }
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
function cargarPreciosCartera(){ const need=[...new Set([..._allOps().map(o=>(o.ticker||'').toUpperCase()).filter(Boolean),'IBEX','IBEXTR'])]; const pend=need.filter(t=>_precioCache[t]===undefined); if(!pend.length)return Promise.resolve(); return Promise.all(pend.map(t=>fetch('precios/'+t+'.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{_precioCache[t]=j;}).catch(()=>{_precioCache[t]=null;}))); }
function priceRepoAt(t,ms){ const pj=_precioCache[(t||'').toUpperCase()]; if(!pj||!pj.data||!pj.data.length)return 0; const arr=pj.data; let lo=0,hi=arr.length-1,res=0; while(lo<=hi){ const md=(lo+hi)>>1; const mt=Date.parse(arr[md][0]+'T00:00:00'); if(mt<=ms){res=arr[md][1];lo=md+1;}else hi=md-1; } return num(res); }
function opPriceAt(t,ms){ t=(t||'').toUpperCase(); let best=0,bt=-1,first=0,ft=Infinity; (typeof _allOps==='function'?_allOps():[]).forEach(o=>{ if((o.ticker||'').toUpperCase()!==t)return; const p=num(o.precio); if(p<=0)return; const om=Date.parse((o.fecha||'')+'T00:00:00'); if(isNaN(om))return; if(om<=ms&&om>bt){bt=om;best=p;} if(om<ft){ft=om;first=p;} }); return best||first; }
function priceAtFB(t,ms){ return priceRepoAt(t,ms)||opPriceAt(t,ms); }
// Rentabilidad por dividendos anual estimada del IBEX-35 (para convertir el índice de PRECIO en TOTAL-RETURN). Editable en DB.config.ibexYield.
function _ibexYield(){ return (typeof DB!=='undefined'&&DB.config&&DB.config.ibexYield!=null)?num(DB.config.ibexYield):0.03; }
// P2.3: si existe el índice oficial IBEX-35 CON dividendos (IBEXTR = INDJ.MC, total-return de BME) lo usamos como benchmark y NO añadimos yield sintético (ya lo lleva dentro). Si no hay datos aún, fallback al IBEX de precio + yield estimado.
function _ibexBenchSym(){ const tr=_precioCache['IBEXTR']; return (tr&&tr.data&&tr.data.length>250)?'IBEXTR':'IBEX'; }
function _ibexAccYield(){ return _ibexBenchSym()==='IBEXTR'?0:_ibexYield(); }
// Editable desde la nota de Rentabilidad: fija el yield de dividendo del IBEX (%) usado en el total-return del benchmark.
function setIbexYield(v){ const y=parseFloat((''+v).replace(',','.')); if(!isFinite(y)||y<0||y>20)return; DB.config=DB.config||{}; DB.config.ibexYield=y/100; if(typeof saveNow==='function')saveNow(); if(typeof renderRentabEmpresas==='function')renderRentabEmpresas(); if(typeof renderPanelDash==='function')renderPanelDash(); }

function gLines(title,labels,series,opt){ opt=opt||{}; const W=Math.max(360,labels.length*7+60),H=opt.h||420,padL=54,padB=26,padT=10;
  const allv=series.reduce((a,sg)=>a.concat(sg.vals.map(num)),[]); const mn=Math.min(0,...allv),mx=Math.max(1,...allv),rng=(mx-mn)||1,plotH=H-padB-padT,plotW=W-padL-12;
  const X=i=>padL+(labels.length>1?i*plotW/(labels.length-1):plotW/2), Yf=v=>padT+plotH-((num(v)-mn)/rng)*plotH;
  const lines=series.map(sg=>`<polyline points="${sg.vals.map((v,i)=>X(i).toFixed(1)+','+Yf(v).toFixed(1)).join(' ')}" fill="none" stroke="${sg.color}" stroke-width="2"${sg.dash?' stroke-dasharray="'+sg.dash+'"':''}/>`).join('');
  const yax=gYAxis(mn,mx,padL,padT,plotH,W,false);
  const step=Math.ceil(labels.length/8)||1; let xl=''; labels.forEach((lb,i)=>{ if(i%step===0)xl+=`<text x="${X(i).toFixed(1)}" y="${H-7}" font-size="10" text-anchor="middle" fill="#64748b">${gEsc(lb)}</text>`; });
  const leg=`<div style="display:flex;gap:12px;font-size:11px;margin-top:2px">${series.map(sg=>`<span><span style="display:inline-block;width:10px;height:10px;background:${sg.color};border-radius:2px;margin-right:4px"></span>${sg.name}</span>`).join('')}</div>`;
  const _gt=_gtRegister(labels,series.map(sg=>({name:sg.name,color:sg.color,vals:sg.vals})),{W,padL,padT,plotH,plotW,mn,rng,pct:false});
  return `<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${title}</div><div style="position:relative"><svg class="gtSvg" data-gt="${_gt.id}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;cursor:crosshair" preserveAspectRatio="xMidYMid meet">${yax}${_gt.guide}${lines}${_gt.dots}${xl}</svg>${_gt.tip}</div></div>${leg}`; }
// === Serie mes a mes de la cartera: coste (aportado neto), valor por cotización y valor+dividendos ===
function carteraEvolData(reRender){ const _ops2=_allOps().filter(o=>o.fecha).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  if(!_ops2.length) return {empty:true};
  const _needP=[...new Set([..._ops2.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean),'IBEX','IBEXTR'])]; const _faltaP=_needP.filter(t=>_precioCache[t]===undefined);
  if(_faltaP.length){ if(typeof cargarPreciosCartera==='function')cargarPreciosCartera().then(()=>{ if(typeof reRender==='function')reRender(); }); return {loading:true}; }
  // === SERIE DIARIA (por sesión): valor de cartera cada día = Σ participaciones(día) × cierre(día) del repo. ===
  const sharesAt=(t,ms)=>{ let sh=0; _ops2.forEach(o=>{ if((o.ticker||'').toUpperCase()===t){ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; };
  const divEv=[]; const _dvO=DB.dividendos||{}; Object.keys(_dvO).forEach(t=>{ const T=(t||'').toUpperCase(); (_dvO[t]||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  (DB.cerradas||[]).forEach(c=>{ const T=(c.ticker||'').toUpperCase(); (c.divs||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  const _opSet=new Set(_ops2.map(o=>(o.ticker||"").toUpperCase())); const _dIng=DB.divIngresos||{}; Object.keys(_dIng).forEach(t=>{ if(_opSet.has((t||"").toUpperCase()))return; Object.keys(_dIng[t]||{}).forEach(y=>{ divEv.push({ms:Date.UTC(+y,11,31),eur:num(_dIng[t][y])}); }); });
  divEv.sort((a,b)=>a.ms-b.ms);
  const heldT=[...new Set(_ops2.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean))];
  const firstD=(_ops2[0].fecha||'').slice(0,10); const now=new Date(); const todayD=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const _bsym=_ibexBenchSym(); const _ibexJ=_precioCache[_bsym]; const hayIbex=!!(_ibexJ&&_ibexJ.data&&_ibexJ.data.length);
  // Eje temporal = unión de SESIONES (fechas de cierre) de las empresas en cartera + IBEX, de la 1ª operación a hoy.
  const _dset={}; heldT.forEach(t=>{ const pj=_precioCache[t]; if(pj&&pj.data){ for(let i=0;i<pj.data.length;i++){ const ds=pj.data[i][0]; if(ds>=firstD&&ds<=todayD)_dset[ds]=1; } } });
  if(hayIbex){ for(let i=0;i<_ibexJ.data.length;i++){ const ds=_ibexJ.data[i][0]; if(ds>=firstD&&ds<=todayD)_dset[ds]=1; } }
  _dset[firstD]=1; let dates=Object.keys(_dset).sort(); if(!dates.length||dates[dates.length-1]<todayD)dates.push(todayD);
  // Punteros por empresa: acciones acumuladas y último cierre conocido (carry-forward, = priceRepoAt).
  const opsByT={}; heldT.forEach(t=>opsByT[t]=[]); _ops2.forEach(o=>{ const t=(o.ticker||'').toUpperCase(); if(opsByT[t])opsByT[t].push(o); });
  const _pj={},_pi={},_oi={},_sh={},_px={}; heldT.forEach(t=>{ const pj=_precioCache[t]; _pj[t]=(pj&&pj.data)?pj.data:[]; _pi[t]=-1; _oi[t]=0; _sh[t]=0; _px[t]=0; });
  // IBEX: unidades compradas al precio del índice del DÍA de cada operación (fallback al 1er precio conocido).
  const _ibx0=(hayIbex&&_ibexJ.data.length)?num(_ibexJ.data[0][1]):0; const _ibexOps=[]; if(hayIbex){ _ops2.forEach(o=>{ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(isNaN(om))return; const cash=(o.tipo==='venta'?-1:1)*num(o.acciones)*num(o.precio); const ipo=priceRepoAt(_bsym,om)||_ibx0; if(ipo>0&&cash!==0)_ibexOps.push({ms:om,units:cash/ipo}); }); _ibexOps.sort((a,b)=>a.ms-b.ms); }
  const _ibxData=hayIbex?_ibexJ.data:[]; let _ibxi=-1,ibexUnits=0,ibexDivCash=0,_ibi=0;
  const labels=[],aport=[],valor=[],valdiv=[],ibexVal=[]; let divAc=0,di=0,apRun=0,opGi=0; const lastD=dates[dates.length-1];
  for(let k=0;k<dates.length;k++){ const d=dates[k]; const dms=Date.parse(d+'T00:00:00'); const isLast=(d===lastD);
    while(opGi<_ops2.length&&(_ops2[opGi].fecha||'').slice(0,10)<=d){ const o=_ops2[opGi]; apRun+=(o.tipo==='venta'?-1:1)*num(o.acciones)*num(o.precio); opGi++; }
    while(di<divEv.length&&divEv[di].ms<=dms){ divAc+=divEv[di].eur; di++; }
    let val=0;
    for(let h=0;h<heldT.length;h++){ const t=heldT[h]; const ol=opsByT[t]; while(_oi[t]<ol.length&&(ol[_oi[t]].fecha||'').slice(0,10)<=d){ const o=ol[_oi[t]]; _sh[t]+=(o.tipo==='venta'?-1:1)*num(o.acciones); _oi[t]++; }
      if(_sh[t]>0.0001){ const pa=_pj[t]; while(_pi[t]+1<pa.length&&pa[_pi[t]+1][0]<=d){ _pi[t]++; _px[t]=num(pa[_pi[t]][1]); }
        let px=_px[t];
        if(isLast){ const v=(DB.valores||{})[t]||{}; const lp=num(v.precioActual), lf=(v.precioFecha||''); const rf=(_pi[t]>=0)?pa[_pi[t]][0]:''; if(lp>0&&(lf>=rf||!(px>0)))px=lp; }
        if(!(px>0)&&typeof opPriceAt==='function')px=num(opPriceAt(t,dms));
        if(px>0)val+=_sh[t]*px; } }
    let ibxV=0; if(hayIbex){ while(_ibi<_ibexOps.length&&_ibexOps[_ibi].ms<=dms){ ibexUnits+=_ibexOps[_ibi].units; _ibi++; } while(_ibxi+1<_ibxData.length&&_ibxData[_ibxi+1][0]<=d){ _ibxi++; } const ipx=(_ibxi>=0)?num(_ibxData[_ibxi][1]):0; if(ipx>0){ if(ibexUnits>0)ibexDivCash+=ibexUnits*ipx*(_ibexAccYield()/252); ibxV=ibexUnits*ipx+ibexDivCash; } }
    labels.push(d); aport.push(apRun); valor.push(val); valdiv.push(val+divAc); if(hayIbex)ibexVal.push(ibxV);
  }
  return {ok:true,labels,dates:labels,aport,valor,valdiv,ibexVal,hayIbex,daily:true}; }

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
  // FIX (alfa): primer tramo desde el COSTE aportado (serie[0]/aport[0]) para capturar el retorno del primer mes en AMBAS series (cartera e IBEX) y evitar el sesgo de base desalineada que podía anular o invertir la alfa.
  const twrOf=serie=>{ let r=1,ok=false; const base0=num(aport[0]); if(base0>0.01){ r*=num(serie[0])/base0; ok=true; } for(let m=1;m<n;m++){ const start=num(serie[m-1]); const flow=num(aport[m])-num(aport[m-1]); const end=num(serie[m]); if(start>0.01){ r*=(end-flow)/start; ok=true; } } return ok?r-1:null; };
  const twr=twrOf(valdiv), ibexTwr=d.hayIbex?twrOf(ibex):null;
  const _lab=d.labels||[]; const _spanMs=(_lab.length>1)?(Date.parse(_lab[_lab.length-1]+'T00:00:00')-Date.parse(_lab[0]+'T00:00:00')):0; const anios=Math.max(_spanMs/(365.25*86400000),1/12); const anual=x=>x==null?null:(Math.pow(1+x,1/Math.max(anios,1))-1); // P2.3: no anualizar (extrapolar) historiales <1 año; evita que la alfa se dispare en carteras jóvenes
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
  const end=n-1; const _mm=(mesesAtras||12); const _lastMs=Date.parse(d.labels[end]+'T00:00:00'); const _cutMs=_lastMs-_mm*30.4375*86400000; let start=0; for(let i=0;i<n;i++){ if(Date.parse(d.labels[i]+'T00:00:00')<=_cutMs)start=i; else break; } const A=_atribFrom(_evoState(d,start),_evoState(d,end)); A.desde=d.labels[start]; A.hasta=d.labels[end]; A.meses=_mm; return A; }
// Atribución generalizada por rango de meses / por año (reusa carteraEvolData)
function _labelYM(lb){ const p=(lb||'').split('-'); return (+p[0])*100 + (+p[1]); }
function _evoState(d,idx){ if(idx==null||idx<0)return {aport:0,valor:0,valdiv:0}; return {aport:num(d.aport[idx]),valor:num(d.valor[idx]),valdiv:num(d.valdiv[idx])}; }
function _idxLE(d,ym){ let idx=null; for(let i=0;i<d.labels.length;i++){ if(_labelYM(d.labels[i])<=ym)idx=i; else break; } return idx; }
// Atribución sobre el VALOR de mercado de la cartera (reconcilia con lo que ves en Cartera).
// crecimiento del valor = aportación + mercado. Los dividendos del periodo van aparte (a caja, no son valor de acciones).
function _atribFrom(s0,s1){ const aportacion=s1.aport-s0.aport; const dividendos=(s1.valdiv-s1.valor)-(s0.valdiv-s0.valor); const crecValor=s1.valor-s0.valor; const revaloriz=crecValor-aportacion; const retorno=revaloriz+dividendos; return {aportacion,revaloriz,dividendos,crecValor,retorno,total:crecValor,valIni:s0.valor,valFin:s1.valor}; }
function atribucionRango(desdeYM,hastaYM){ const d=(typeof carteraEvolData==='function')?carteraEvolData():null; if(!d||!d.ok)return null; const endIdx=_idxLE(d,hastaYM); if(endIdx==null)return null; const dm=desdeYM%100,dy=Math.floor(desdeYM/100); const prevYM=dm>1?(dy*100+(dm-1)):((dy-1)*100+12); const startIdx=_idxLE(d,prevYM); return _atribFrom(_evoState(d,startIdx),_evoState(d,endIdx)); }
function atribucionPorAnio(){ const d=(typeof carteraEvolData==='function')?carteraEvolData():null; if(!d||!d.ok)return []; const years=[...new Set(d.labels.map(lb=>+lb.split('-')[0]))].sort((a,b)=>a-b); return years.map(Y=>{ const s0=_evoState(d,_idxLE(d,(Y-1)*100+12)); const s1=_evoState(d,_idxLE(d,Y*100+12)); return Object.assign({anio:Y},_atribFrom(s0,s1)); }); }
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
  const years=[...new Set(d.labels.map(lb=>+lb.split('-')[0]))].sort((a,b)=>b-a); const selEl=$('#atribAnio'); if(selEl){ selEl.innerHTML='<option value="">— año —</option>'+years.map(y=>`<option value="${y}"${(atribSel.modo==='anio'&&+atribSel.anio===y)?' selected':''}>${y}</option>`).join(''); }
  const nowY=new Date().getFullYear(); let A=null, titulo='';
  if(atribSel.modo==='ytd'){ A=atribucionRango(nowY*100+1,nowY*100+12); titulo='Año en curso ('+nowY+')'; }
  else if(atribSel.modo==='anio'&&atribSel.anio){ A=atribucionRango(atribSel.anio*100+1,atribSel.anio*100+12); titulo='Año '+atribSel.anio; }
  else if(atribSel.modo==='todo'){ A=Object.assign(_atribFrom(_evoState(d,null),_evoState(d,d.labels.length-1)),{}); titulo='Desde el inicio'; }
  else if(atribSel.modo==='rango'&&atribSel.desde&&atribSel.hasta){ const dY=+atribSel.desde.slice(0,4),dM=+atribSel.desde.slice(5,7),hY=+atribSel.hasta.slice(0,4),hM=+atribSel.hasta.slice(5,7); A=atribucionRango(dY*100+dM,hY*100+hM); titulo='Del '+atribSel.desde+' al '+atribSel.hasta; }
  else { A=crecimientoAtribucion(12); titulo='Últimos 12 meses'; }
  if(!A){ el.innerHTML='<div class="empty">No hay datos para ese periodo.</div>'; if(kp)kp.innerHTML=''; return; }
  const sg=x=>(x>=0?'+':'')+fmt(x); const efectivo=A.aportacion-A.dividendos;
  // botón de periodo activo
  try{ document.querySelectorAll('#blkAtrib [data-atrib]').forEach(b=>b.classList.toggle('atrib-on',b.dataset.atrib===atribSel.modo)); }catch(e){}
  // KPIs héroe
  if(kp)kp.innerHTML='<div class="pos-kpis">'
    +`<div class="k hero"><div class="l">Retorno (mercado + dividendos)</div><div class="v">${sg(A.retorno)}</div><div class="p">lo que generó tu cartera en el periodo</div></div>`
    +`<div class="k"><div class="l">Mercado (revalorización)</div><div class="v ${A.revaloriz>=0?'pos':'neg'}">${sg(A.revaloriz)}</div><div class="p">subida/bajada de las cotizaciones</div></div>`
    +`<div class="k"><div class="l">Dividendo (reinvertido)</div><div class="v pos">${sg(A.dividendos)}</div><div class="p">dividendos cobrados en el periodo</div></div>`
    +`<div class="k"><div class="l">Efectivo (dinero nuevo)</div><div class="v">${sg(efectivo)}</div><div class="p">aportaciones de tu bolsillo</div></div>`
    +'</div>';
  const vi=num(A.valIni), vf=num(A.valFin);
  const wf=_atribWaterfall([{label:'Inicio',base:vi},{label:'Dividendo reinvertido',delta:A.dividendos,col:'#16a34a'},{label:'Efectivo nuevo',delta:efectivo,col:'#2563eb'},{label:'Mercado',delta:A.revaloriz,col:'#0d9488'},{label:'Valor final',base:vf}]);
  const wfNote=`<div class="atrib-note">Tu cartera pasó de <b>${fmt(vi)}</b> a <b>${fmt(vf)}</b>. De ese crecimiento, el <b style="color:#2563eb">efectivo nuevo</b> (dinero de tu bolsillo) aportó ${sg(efectivo)}; el resto lo generó la cartera sola: <b style="color:#16a34a">dividendos</b> ${sg(A.dividendos)} + <b style="color:#0d9488">mercado</b> ${sg(A.revaloriz)} = retorno ${sg(A.retorno)}.</div>`;
  const cascada=`<div class="atrib-wtitle">${titulo} · ${fmt(vi)} → ${fmt(vf)}</div>${wf}${wfNote}`;
  // por año
  const porY=atribucionPorAnio().slice().reverse(); let tE=0,tD=0,tM=0,tR=0,tC=0; porY.forEach(r=>{tD+=r.dividendos;tM+=r.revaloriz;tR+=r.retorno;tC+=r.crecValor;tE+=(r.aportacion-r.dividendos);});
  const yhead='<tr><th class="l">Año</th><th>Efectivo</th><th>Dividendo</th><th>Mercado</th><th>Retorno</th><th>Crec. valor</th></tr>';
  const yrows=porY.map(r=>{ const ef=r.aportacion-r.dividendos; return `<tr><td class="l"><b>${r.anio}</b></td><td class="num ${ef>=0?'':'neg'}">${sg(ef)}</td><td class="num pos">${sg(r.dividendos)}</td><td class="num ${r.revaloriz>=0?'pos':'neg'}">${sg(r.revaloriz)}</td><td class="num ${r.retorno>=0?'pos':'neg'}">${sg(r.retorno)}</td><td class="num ${r.crecValor>=0?'pos':'neg'}" style="font-weight:700">${sg(r.crecValor)}</td></tr>`; }).join('');
  const totRow=`<tr class="mt-sub"><td class="l">TOTAL</td><td>${sg(tE)}</td><td class="mt-pos">${sg(tD)}</td><td class="${tM>=0?'mt-pos':'mt-neg'}">${sg(tM)}</td><td class="${tR>=0?'mt-pos':'mt-neg'}">${sg(tR)}</td><td><b>${fmt(tC)}</b></td></tr>`;
  const ydesk=`<div class="mt-wrap"><table class="mt-tbl"><thead>${yhead}</thead><tbody>${yrows}${totRow}</tbody></table></div>`;
  const ymob=porY.map(r=>{ const ef=r.aportacion-r.dividendos; return `<div class="lcard"><div class="lc-h"><div class="tk">${r.anio}</div><div class="ty ${r.crecValor>=0?'g':'r'}">${sg(r.crecValor)}<span>crec. valor</span></div></div><div class="lg"><div class="m"><span>Efectivo nuevo</span><b>${sg(ef)}</b></div><div class="m"><span>Dividendo</span><b class="pos">${sg(r.dividendos)}</b></div><div class="m"><span>Mercado</span><b class="${r.revaloriz>=0?'pos':'neg'}">${sg(r.revaloriz)}</b></div><div class="m"><span>Retorno</span><b class="${r.retorno>=0?'pos':'neg'}">${sg(r.retorno)}</b></div></div></div>`; }).join('');
  const yearBlk=`<div class="atrib-note" style="margin-top:0;margin-bottom:12px">Efectivo (dinero nuevo) + Dividendo (reinvertido) + Mercado = crecimiento del valor de cada año. La suma de «Crec. valor» reconstruye el valor actual de tu cartera.</div><div class="pos-desk">${ydesk}</div><div class="pos-mob">${ymob}</div>`;
  // === C5 · Contribución al retorno por posición ===
  window._c5Per=window._c5Per||'todo';
  const _c5L={todo:'Desde inicio',ytd:'Año (YTD)','1a':'1 año','3a':'3 años'};
  const pv0=x=>(x*100).toFixed(0)+'%';
  const RE=(typeof rentabilidadEmpresas==='function')?rentabilidadEmpresas(renderAtribucion):null;
  let contribInner, contribSum='—';
  const _c5seg='<div class="c5-seg">'+Object.keys(_c5L).map(k=>`<button data-c5per="${k}" class="${k===window._c5Per?'on':''}">${_c5L[k]}</button>`).join('')+'</div>';
  if(!RE||RE.empty){ contribInner=_c5seg+'<div class="atrib-note">Sin posiciones en cartera.</div>'; }
  else if(RE.loading){ contribInner=_c5seg+'<div class="atrib-note">Cargando cotizaciones del repo… (necesita conexión)</div>'; }
  else {
    const per=window._c5Per; const totCoste=RE.rows.reduce((s,r)=>s+r.coste,0)||1;
    const items=RE.rows.map(r=>{ let ret,eur=null; if(per==='todo'){ ret=r.rentTot; eur=r.pl+r.divCob; } else { ret=(per==='ytd'?r.trYTD:(per==='1a'?r.tr1A:r.tr3A)); }
      const pp=(per==='todo')?((r.pl+r.divCob)/totCoste*100):(ret==null?null:r.peso*ret*100);
      return {t:r.t,peso:r.peso,ret,pp,eur}; });
    const V=items.filter(x=>x.pp!=null).sort((a,b)=>b.pp-a.pp);
    if(!V.length){ contribInner=_c5seg+'<div class="atrib-note">Ese periodo necesita las cotizaciones del repo (sin conexión ahora). Prueba con «Desde inicio».</div>'; }
    else {
      contribSum=V[0].t+' lidera · '+RE.rows.length+' posiciones';
      const totPP=V.reduce((s,x)=>s+x.pp,0);
      const maxAbs=Math.max.apply(null,V.map(x=>Math.abs(x.pp)))||1;
      const top=V.slice(0,3), bot=V.slice(-3).reverse();
      const spp=x=>(x>=0?'+':'')+x.toFixed(1)+' pp';
      const detail=x=>(per==='todo')?sg(x.eur):(((x.ret>=0?'+':'')+(x.ret*100).toFixed(1)+'% × '+pv0(x.peso)));
      const chip=(x,cls)=>`<div class="c5-chip ${cls}"><b class="tk" data-ficha="${x.t}">${x.t}</b><span class="v ${x.pp>=0?'pos':'neg'}">${spp(x.pp)}</span><span class="e">${detail(x)}</span></div>`;
      const row=x=>{ const w=(Math.abs(x.pp)/maxAbs*50).toFixed(1); const p=x.pp>=0; return `<div class="c5-row"><div class="c5-tk" data-ficha="${x.t}">${x.t}</div><div class="c5-track"><div class="c5-zero"></div>${p?`<div class="c5-fill pos" style="left:50%;width:${w}%"></div>`:`<div class="c5-fill neg" style="right:50%;width:${w}%"></div>`}</div><div class="c5-v ${p?'pos':'neg'}">${spp(x.pp)}</div><div class="c5-e">${detail(x)}</div></div>`; };
      const totLine=(per==='todo')
        ? `Retorno total de la cartera (con dividendos): <b class="pos">${(totPP>=0?'+':'')+totPP.toFixed(1)}%</b>. Cada empresa aporta su parte; las contribuciones suman ese total.`
        : `Rentabilidad de la cartera en el periodo (aprox., suma de contribuciones peso×TR): <b class="${totPP>=0?'pos':'neg'}">${(totPP>=0?'+':'')+totPP.toFixed(1)}%</b>.`;
      contribInner=_c5seg
        +`<div class="c5-tot">${totLine}</div>`
        +`<div class="c5-cols"><div><div class="c5-cap up">▲ Los 3 que más suman</div>${top.map(x=>chip(x,'up')).join('')}</div><div><div class="c5-cap dn">▼ Los 3 que menos aportan</div>${bot.map(x=>chip(x,'dn')).join('')}</div></div>`
        +`<div class="c5-tlbl">Contribución de cada posición <span class="muted" style="font-weight:400">(en puntos del retorno · ${per==='todo'?'€ de balance':'TR del activo × peso'})</span></div>`
        +`<div class="c5-head"><span>Empresa</span><span></span><span>Contrib.</span><span>${per==='todo'?'Balance €':'TR × peso'}</span></div>`
        +V.map(row).join('')
        +`<div class="atrib-note" style="margin-top:12px">Contribución = ${per==='todo'?'balance de cada posición (valor − coste + dividendos cobrados) sobre el coste total; suman el retorno total':'peso × rentabilidad total-return del activo en el periodo'}. Revela si tu resultado depende de uno o dos nombres (fragilidad) y ayuda a tomar beneficios/rebalancear.</div>`;
    }
  }
  window._atribBlk=window._atribBlk||{cascada:true,contrib:false,anual:false};
  const B=(key,icon,title,sum,inner)=>{ const op=window._atribBlk[key]?' open':''; return `<div class="pos-blk${op}" data-atribblk="${key}"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">${icon} ${title}</span><span class="bsum">${sum}</span></div><div class="pos-blk-b"><div class="atrib-pad">${inner}</div></div></div>`; };
  el.innerHTML=B('cascada','📊','Cascada del periodo',titulo,cascada)+B('contrib','🏅','Contribución al retorno por posición',contribSum,contribInner)+B('anual','📅','Atribución por año',porY.length+' años · '+fmt(tC)+' acumulado',yearBlk);
  if(!el._atribBlkBound){ el._atribBlkBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-c5per]')){ window._c5Per=e.target.closest('[data-c5per]').getAttribute('data-c5per'); renderAtribucion(); return; } if(e.target.closest('input,select,button,a,[data-ficha]'))return; var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-atribblk'); if(k){window._atribBlk=window._atribBlk||{};window._atribBlk[k]=b.classList.contains('open');} } }); }
}
function _atribWaterfall(steps){
  const W=680,H=300,pl=56,pr=16,pt=18,pb=46; const plotH=H-pt-pb,plotW=W-pl-pr;
  const _ab=v=>{const a=Math.abs(v);const s=v<0?'-':'+';if(a>=1000)return s+(a/1000).toFixed(a>=10000?0:1)+'k';return s+Math.round(a);};
  let cum=0; const bars=[]; let mx=0,mn=0;
  steps.forEach(s=>{ if(s.base!=null){bars.push({label:s.label,lo:Math.min(0,s.base),hi:Math.max(0,s.base),val:s.base,kind:'base'});cum=s.base;}
   else{const st=cum,en=cum+num(s.delta);bars.push({label:s.label,lo:Math.min(st,en),hi:Math.max(st,en),val:num(s.delta),kind:'delta',col:s.col});cum=en;} });
  bars.forEach(b=>{mx=Math.max(mx,b.hi);mn=Math.min(mn,b.lo,0);});
  const rng=(mx-mn)||1; const Y=v=>pt+plotH-((v-mn)/rng)*plotH; const gw=plotW/bars.length, bw=Math.min(66,gw-18);
  let g=''; for(let k=0;k<=4;k++){const gv=mn+(mx-mn)*k/4;g+=`<line x1="${pl}" y1="${Y(gv).toFixed(1)}" x2="${W-pr}" y2="${Y(gv).toFixed(1)}" stroke="#eef2f7"/><text x="${pl-6}" y="${(Y(gv)+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${Math.round(gv/1000)}k</text>`;}
  const cumA=[]; let c2=0; bars.forEach(b=>{ if(b.kind==='base')c2=b.val; else c2=c2+b.val; cumA.push(c2); });
  bars.forEach((b,i)=>{ const x=pl+i*gw+(gw-bw)/2; const yTop=Y(b.hi),yBot=Y(b.lo); const h=Math.max(2,yBot-yTop);
   const col=b.kind==='base'?'#64748b':(b.col||(b.val>=0?'#16a34a':'#dc2626')); const pre=b.kind==='delta'&&b.val>=0?'+':'';
   g+=`<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${col}"/>`;
   g+=`<text x="${(x+bw/2).toFixed(1)}" y="${(yTop-5).toFixed(1)}" font-size="10.5" font-weight="700" text-anchor="middle" fill="${b.kind==='base'?'#334155':col}">${b.kind==='base'?fmt(b.val):(pre+_ab(b.val))}</text>`;
   const lines=(b.label||'').split(' ');
   g+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-22}" font-size="10" text-anchor="middle" fill="#475569" font-weight="600">${lines[0]}</text>`+(lines[1]?`<text x="${(x+bw/2).toFixed(1)}" y="${H-10}" font-size="9" text-anchor="middle" fill="#94a3b8">${lines.slice(1).join(' ')}</text>`:'');
   if(i<bars.length-1){ const yc=Y(cumA[i]); const x2=pl+(i+1)*gw+(gw-bw)/2; g+=`<line x1="${(x+bw).toFixed(1)}" y1="${yc.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${yc.toFixed(1)}" stroke="#cbd5e1" stroke-dasharray="3 3"/>`; }
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:700px;display:block">${g}</svg>`;
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
const _RENTA_ORD=[['rentTot','Rentabilidad total'],['xirr','TIR (anual)'],['peso','Peso en cartera'],['valor','Valor'],['pl','Plusvalía'],['tr1A','TR 1 año']];
function rentaSetOrden(k){ if(!k)return; window._rentaOrd=k; renderRentabEmpresas(); }
function _rentaVsIbexSVG(d){ if(!d||!d.ok||!d.hayIbex)return ''; const L=d.labels||[],V=d.valdiv||[],I=d.ibexVal||[]; const n=L.length; if(n<2)return '';
  const step=Math.max(1,Math.ceil(n/160)); const idx=[]; for(let i=0;i<n;i+=step)idx.push(i); if(idx[idx.length-1]!==n-1)idx.push(n-1);
  const W=680,H=250,pl=54,pr=14,pt=14,pb=26; let mx=0; idx.forEach(i=>{ mx=Math.max(mx,num(V[i]),num(I[i])); }); mx=mx*1.05||1;
  const X=k=>pl+(W-pl-pr)*k/(idx.length-1), Y=v=>pt+(H-pt-pb)*(1-num(v)/mx);
  const path=arr=>idx.map((i,k)=>(k?'L':'M')+X(k).toFixed(1)+','+Y(arr[i]).toFixed(1)).join(' ');
  let grid=''; for(let g=0;g<=4;g++){ const gv=mx*g/4; grid+=`<line x1="${pl}" y1="${Y(gv).toFixed(1)}" x2="${W-pr}" y2="${Y(gv).toFixed(1)}" stroke="#eef2f7"/><text x="${pl-6}" y="${(Y(gv)+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${Math.round(gv/1000)}k</text>`; }
  let xl=''; const yrs={}; idx.forEach((i,k)=>{ const y=(L[i]||'').slice(0,4); if(!yrs[y]){yrs[y]=1; if(+y%2===0)xl+=`<text x="${X(k).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="#94a3b8">${y}</text>`;} });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:700px;display:block">${grid}<path d="${path(I)}" fill="none" stroke="#f59e0b" stroke-width="2.4" stroke-dasharray="6 4"/><path d="${path(V)}" fill="none" stroke="#16a34a" stroke-width="2.4"/>${xl}</svg><div class="cmp-leg"><span><i style="background:#16a34a"></i>Tu cartera (valor + dividendos)</span><span><i style="background:#f59e0b"></i>Si el mismo dinero fuera al IBEX-35 TR</span></div>`;
}
function renderRentabEmpresas(){ const el=$('#rentaBody'); if(!el)return; const kp=$('#rentaKpis'); const R=rentabilidadEmpresas(renderRentabEmpresas);
  if(!R||R.empty){ el.innerHTML='<div class="empty">Sin posiciones abiertas.</div>'; if(kp)kp.innerHTML=''; return; }
  if(R.loading){ el.innerHTML='<div class="muted" style="font-size:12px">Cargando cotizaciones del repo… (necesita conexión)</div>'; if(kp)kp.innerHTML=''; return; }
  const pc=x=>x==null?'—':((x>=0?'+':'')+(x*100).toFixed(1)+'%');
  const CR=(typeof carteraRentabilidad==='function')?carteraRentabilidad(renderRentabEmpresas):null; const sgv=x=>(x>=0?'+':'')+fmt(x);
  const nm=t=>((DB.valores||{})[t]||{}).nombre||t;
  // KPIs hero
  if(kp)kp.innerHTML='<div class="pos-kpis">'
    +`<div class="k hero"><div class="l">TIR cartera (anual)</div><div class="v">${CR?pc(CR.xirr):'—'}</div><div class="p">rentabilidad anual ponderada por dinero</div></div>`
    +`<div class="k"><div class="l">Alfa vs IBEX (anual)</div><div class="v ${(CR&&CR.alfa!=null&&CR.alfa>=0)?'pos':'neg'}">${(CR&&CR.alfa!=null)?pc(CR.alfa):'—'}</div><div class="p">exceso sobre el índice</div></div>`
    +`<div class="k"><div class="l">Ventaja vs IBEX</div><div class="v ${(CR&&CR.valDif>=0)?'pos':'neg'}">${(CR&&CR.valDif!=null)?sgv(CR.valDif):'—'}</div><div class="p">€ frente a invertir en IBEX-TR</div></div>`
    +`<div class="k"><div class="l">Valor cartera</div><div class="v">${fmt(R.totVal)}</div><div class="p">${R.rows.length} posiciones</div></div>`
    +'</div>';
  // orden
  const ordK=window._rentaOrd||'rentTot';
  const rows=R.rows.slice().sort((a,b)=>{ const va=a[ordK],vb=b[ordK]; return (vb==null?-1e18:vb)-(va==null?-1e18:va); });
  const selOpts=_RENTA_ORD.map(o=>`<option value="${o[0]}"${o[0]===ordK?' selected':''}>${o[1]}</option>`).join('');
  const rk=$('#rentaOrden'); if(rk)rk.innerHTML=selOpts;
  // tabla
  const head='<tr><th class="l">Empresa</th><th>Peso</th><th>Valor</th><th>Plusvalía</th><th>Rent. total</th><th>TIR</th></tr>';
  const body=rows.map(r=>`<tr class="mt-row"><td class="emp"><span class="mt-arw">▶</span><b class="renta-tk" data-ficha="${r.t}" style="cursor:pointer;color:var(--brand)">${r.t}</b> <span style="font-weight:600;color:#334155;font-size:11px">${nm(r.t)}</span></td><td>${(r.peso*100).toFixed(1)}%</td><td><b>${fmt(r.valor)}</b></td><td><span class="${r.pl>=0?'mt-pos':'mt-neg'}" style="font-weight:700">${(r.pl>=0?'+':'')+fmt(r.pl)}</span> <span class="mt-pill ${r.pl>=0?'g':'r'}">${pc(r.plPct)}</span></td><td><span class="mt-pill ${(r.rentTot!=null&&r.rentTot>=0)?'g':'r'}">${pc(r.rentTot)}</span></td><td><span class="mt-pill ${(r.xirr!=null&&r.xirr>=0)?'g':'r'}">${pc(r.xirr)}</span></td></tr><tr class="mt-det"><td colspan="6"><div class="mt-nums">${_mtNum('Div. cobrado',fmt(r.divCob),'mt-pos')}${_mtNum('TR YTD',pc(r.trYTD),(r.trYTD||0)>=0?'mt-pos':'mt-neg')}${_mtNum('TR 1A',pc(r.tr1A),(r.tr1A||0)>=0?'mt-pos':'mt-neg')}${_mtNum('TR 3A',pc(r.tr3A),(r.tr3A||0)>=0?'mt-pos':'mt-neg')}</div></td></tr>`).join('');
  const tblDesk=`<div class="pos-desk"><div class="mt-wrap"><table class="mt-tbl"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
  const mcards=rows.map(r=>`<div class="lcard"><div class="lc-h"><div class="tk" data-ficha="${r.t}" style="cursor:pointer">${r.t} <span class="nm">${nm(r.t)}</span></div><div class="ty ${(r.rentTot||0)>=0?'g':'r'}">${pc(r.rentTot)}<span>rent. total</span></div></div><div class="lc-row"><span class="pl ${r.pl>=0?'pos':'neg'}">${r.pl>=0?'+':''}${fmt(r.pl)}</span> <span class="muted">plusvalía</span> · TIR <b class="${(r.xirr||0)>=0?'pos':'neg'}">${pc(r.xirr)}</b> · peso <b>${(r.peso*100).toFixed(1)}%</b></div><div class="lg"><div class="m"><span>Valor</span><b>${fmt(r.valor)}</b></div><div class="m"><span>Div. cobrado</span><b class="pos">${fmt(r.divCob)}</b></div><div class="m"><span>TR YTD</span><b class="${(r.trYTD||0)>=0?'pos':'neg'}">${pc(r.trYTD)}</b></div><div class="m"><span>TR 1A</span><b class="${(r.tr1A||0)>=0?'pos':'neg'}">${pc(r.tr1A)}</b></div><div class="m"><span>TR 3A</span><b class="${(r.tr3A||0)>=0?'pos':'neg'}">${pc(r.tr3A)}</b></div><div class="m"><span>Plusv. %</span><b class="${r.pl>=0?'pos':'neg'}">${pc(r.plPct)}</b></div></div></div>`).join('');
  const tblBlk=tblDesk+`<div class="pos-mob">${mcards}</div>`;
  // comparativa barras
  const bsort=R.rows.slice().sort((a,b)=>(b.rentTot==null?-1e18:b.rentTot)-(a.rentTot==null?-1e18:a.rentTot));
  const maxAbs=Math.max(...bsort.map(r=>Math.abs(r.rentTot||0)))||1;
  const bars=bsort.map(r=>{const w=Math.abs(r.rentTot||0)/maxAbs*100;const g=(r.rentTot||0)>=0;return `<div class="bar-row"><div class="bar-lb">${r.t}</div><div class="bar-tr"><div class="bar-fill ${g?'g':'r'}" style="width:${w.toFixed(1)}%"></div></div><div class="bar-val ${g?'pos':'neg'}">${pc(r.rentTot)}</div><div class="bar-tir">TIR ${pc(r.xirr)}</div></div>`;}).join('');
  const barBlk=`<div class="bar-note">Rentabilidad <b>total</b> de cada posición (plusvalía + dividendos sobre el coste), ordenada de mayor a menor. A la derecha, la <b>TIR</b> anualizada para poder comparar posiciones con distinta antigüedad.</div><div class="bars">${bars}</div>`;
  // vs IBEX
  const d=(typeof carteraEvolData==='function')?carteraEvolData(renderRentabEmpresas):null;
  let ibexBlk='';
  if(CR&&CR.hayIbex){
    const dif=CR.valDif, alfa=CR.alfa;
    const cmpNote=`<div class="cmp-note">Compara tu cartera con haber invertido <b>exactamente el mismo dinero, en las mismas fechas</b>, en el IBEX-35 en versión <b>total-return</b> (cotización del índice + sus dividendos). Usa los precios de <b>IBEX-TR del repositorio</b>.<br><br>⚠️ La <b>alfa</b> puede ser positiva (${pc(alfa)}) y la <b>diferencia en €</b> del otro signo a la vez: la alfa mide la rentabilidad <b>anual media</b> (ponderada por tiempo, ignora cuándo aportaste); la diferencia en € mide el <b>resultado final</b> teniendo en cuenta que gran parte del dinero pudo entrar en años recientes, con menos tiempo para componer. Ambas son ciertas y miden cosas distintas.<br><br>Dividendo del IBEX asumido para su total-return: <input type="number" step="0.1" min="0" value="${(_ibexYield()*100).toFixed(1)}" onchange="setIbexYield(this.value)" style="width:52px;padding:1px 4px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px" title="Yield de dividendo del IBEX asumido"> %/año (editable).</div>`;
    const cmpGrid=`<div class="cmp-grid"><div class="cmp-c cart"><div class="cmp-t">TU CARTERA</div><div class="cmp-v">${fmt(CR.valFinal)}</div><div class="cmp-s">valor + dividendos acumulados</div><div class="cmp-r">${pc(CR.twrAnual)} <span>anual (TWR)</span></div></div><div class="cmp-c ibex"><div class="cmp-t">IBEX-35 (TOTAL RETURN)</div><div class="cmp-v">${fmt(CR.ibexFinal)}</div><div class="cmp-s">mismo dinero, mismas fechas</div><div class="cmp-r">${pc(CR.ibexTwrAnual)} <span>anual (TWR)</span></div></div><div class="cmp-c dif"><div class="cmp-t">DIFERENCIA</div><div class="cmp-v ${dif>=0?'pos':'neg'}">${sgv(dif)}</div><div class="cmp-s">ventaja de tu cartera vs índice</div><div class="cmp-r ${alfa>=0?'pos':'neg'}">${pc(alfa)} <span>alfa anual</span></div></div></div>`;
    ibexBlk=cmpNote+cmpGrid+_rentaVsIbexSVG(d);
  } else { ibexBlk='<div class="muted" style="font-size:12px">Cargando cotizaciones del IBEX…</div>'; }
  // metodología
  const methBlk=`<div class="meth">
<div class="meth-item"><div class="meth-h">📈 Rentabilidad total</div><p>Es <b>cuánto ha crecido en total</b> el dinero de esa posición, sumando la subida de la cotización (plusvalía) y <b>todos los dividendos cobrados</b>, sobre lo que te costó:</p><p><span class="meth-f">Rent. total = (Plusvalía + Dividendos cobrados) ÷ Coste</span></p><p><i>Ejemplo:</i> invertiste 10.000 €, hoy la posición vale 13.000 € (plusvalía +3.000 €) y has cobrado 2.000 € de dividendos → (3.000 + 2.000) / 10.000 = <b>+50 %</b>. Es una cifra <b>acumulada</b>, no anual: un +50 % en 2 años es mucho mejor que en 10. Para comparar por tiempo, mira la TIR.</p></div>
<div class="meth-item"><div class="meth-h">🎯 TIR (tasa interna de retorno · anual)</div><p>Es la <b>rentabilidad anual equivalente</b> de tu dinero <b>teniendo en cuenta cuándo</b> metiste y sacaste cada euro. Trata cada <b>compra</b> como dinero que sale (−), cada <b>dividendo o venta</b> como dinero que entra (+) y el <b>valor actual</b> como si vendieras hoy; busca el porcentaje anual que hace que todo cuadre (es el XIRR de una hoja de cálculo).</p><p>A diferencia de la rentabilidad total, <b>sí pondera el tiempo y el tamaño</b> de cada aportación: es la cifra más honesta para saber <i>«¿a qué % anual ha trabajado mi dinero?»</i>. Una TIR de <b>${CR?pc(CR.xirr):'—'}</b> significa que, en conjunto, tu dinero ha rentado como un depósito imaginario a ese interés anual compuesto.</p></div>
<div class="meth-item"><div class="meth-h">🏢 TR YTD / 1A / 3A (rendimiento del activo)</div><p>Total-Return de la <b>empresa</b> en el año en curso, último año y últimos 3 años: (precio hoy − precio al inicio + dividendos/acción del periodo) ÷ precio al inicio. Mide cómo se ha comportado <b>la acción</b>, <b>sin importar cuándo entraste tú</b> — sirve para comparar empresas entre sí. TR 3A es <b>acumulado</b> (no anual). Usa las cotizaciones del repositorio.</p></div></div>`;
  window._rentaBlk=window._rentaBlk||{tabla:true,barras:false,ibex:false,meto:false};
  const B=(key,icon,title,sum,inner)=>{ const op=window._rentaBlk[key]?' open':''; return `<div class="pos-blk${op}" data-rentablk="${key}"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">${icon} ${title}</span><span class="bsum">${sum}</span></div><div class="pos-blk-b"><div class="renta-pad">${inner}</div></div></div>`; };
  el.innerHTML=B('tabla','📈','Rentabilidad por empresa',R.rows.length+' posiciones · TIR '+(CR?pc(CR.xirr):'—'),tblBlk)
    +B('barras','📊','Comparativa de rentabilidad','rent. total y TIR por empresa',barBlk)
    +B('ibex','⚖️','Tu cartera vs el IBEX-35',(CR&&CR.valDif!=null)?('ventaja '+sgv(CR.valDif)+' · alfa '+pc(CR.alfa)):'',ibexBlk)
    +B('meto','ℹ️','Cómo se calcula la rentabilidad','rentabilidad total · TIR · TR',methBlk);
  if(!el._rentaBlkBound){ el._rentaBlkBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-ficha],input,select,a,button'))return; var rr=e.target.closest('tr.mt-row'); if(rr){ rr.classList.toggle('open'); return; } var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-rentablk'); if(k){window._rentaBlk=window._rentaBlk||{};window._rentaBlk[k]=b.classList.contains('open');} } }); }
}

// === D6 · Independencia financiera: Coast FIRE (inversión y dividendo), colchón, tasa de ahorro ===
function renderIndependencia(){
  var el=document.getElementById('indepBody'); if(!el)return;
  if(typeof proyDefaults==='function')proyDefaults();
  var c=(DB.config&&DB.config.proyeccion)||{}; var nowY=new Date().getFullYear();
  var snaps=(typeof patSnaps==='function')?patSnaps():[]; var last=snaps.length?snapTot(snaps[snaps.length-1]):null;
  var patrimonio=last?last.total:(num(c.carteraInicial)+num(c.efectivo));
  var valorCartera=last?last.inv:num(c.carteraInicial);
  var ingA=0,gasA=0; (DB.presupuesto||[]).forEach(function(p){ if((typeof pAnio==='function'?pAnio(p):p.anio)!==nowY)return; var cat=(DB.categorias||[]).find(function(x){return x.id===p.categoriaId;}); if(!cat)return; var v=(typeof anual==='function'?anual(p):num(p.importe)*12); if(cat.tipo==='gasto')gasA+=v; else if(cat.tipo==='ingreso')ingA+=v; });
  var gastoAnual=gasA>0?gasA:num(c.gastoMes)*12;
  var divAnual=0; try{ (invPositions()||[]).forEach(function(p){ if(p.acciones>0.0001){ var v=(DB.valores||{})[(p.ticker||'').toUpperCase()]||{}; divAnual+=p.acciones*num(v.divAccion); } }); }catch(e){}
  if(!(divAnual>0))divAnual=num(c.dividendoBruto);
  if(gastoAnual<=0){ el.innerHTML='<div class="empty">Necesito tu gasto anual (Presupuesto) y la Proyección para calcular la independencia.</div>'; return; }
  var rpd=valorCartera>0?divAnual/valorCartera:0.04;
  var infla=num(c.fireInfla)||num(c.inflacionNomina)||0.025;
  var rReal=(1+num(c.crecCartera))/(1+infla)-1;
  var edadObj=num(c.edadActual)+(num(c.anioTrasJub)-num(c.anioBase));
  var n=Math.max(0,num(c.anioTrasJub)-nowY); var growth=Math.pow(1+rReal,n);
  var eur=function(v){ return fmt(v); };
  function fireOf(numF){ var coast=growth>0?numF/growth:numF; var prog=coast>0?Math.min(100,patrimonio/coast*100):0; var ya=patrimonio>=coast; return {num:numF,coast:coast,prog:prog,ya:ya,falta:Math.max(0,coast-patrimonio)}; }
  var FI=fireOf(gastoAnual*25), FD=fireOf(rpd>0?gastoAnual/rpd:gastoAnual*25);
  var covDiv=divAnual/gastoAnual*100, anosColchon=patrimonio/gastoAnual, tasaAhorro=ingA>0?((ingA-gasA)/ingA*100):null;
  /* cabecera: titular vivo = cobertura de gastos por dividendo (la esencia de "independencia hoy") */
  try{ var _hk=document.getElementById('indHeroKpi'); if(_hk){ var _cv=Math.round(covDiv);
    _hk.innerHTML='<div class="big">'+(_cv>=100?'✅':_cv+'%')+'</div><div class="cap">'+(_cv>=100?'¡vives del dividendo!':'de tus gastos ya cubiertos por dividendo')+'</div>'; } }catch(e){}
  var panel=function(cls,ic,nm,sub,F,extra){ return '<div class="ind-fp '+cls+'"><div class="ind-fph"><span class="ic">'+ic+'</span><div class="ind-nm"><b>'+nm+'</b><span>'+sub+'</span></div><div class="ind-pct'+(F.ya?' ya':'')+'">'+(F.ya?'✅':F.prog.toFixed(0)+'%')+'</div></div>'
    +'<div class="ind-bar"><i style="width:'+F.prog+'%"></i></div>'
    +'<div class="ind-row"><span>Objetivo (número FIRE)</span><b>'+eur(F.num)+'</b></div>'
    +'<div class="ind-row"><span>Coast FIRE (necesario hoy)</span><b>'+eur(F.coast)+'</b></div>'
    +'<div class="ind-row"><span>'+(F.ya?'Ya lo alcanzas':'Te falta')+'</span><b class="'+(F.ya?'pos':'neg')+'">'+(F.ya?'✔':eur(F.falta))+'</b></div>'+(extra||'')+'</div>'; };
  var covExtra='<div class="ind-cov"><b>Cobertura hoy:</b> tu dividendo ('+eur(divAnual)+'/año) ya cubre el <b>'+covDiv.toFixed(0)+'%</b> de tu gasto.<div class="cbar"><i style="width:'+Math.min(100,covDiv)+'%"></i></div></div>';
  window._indepBlk=window._indepBlk||{coast:true,retirada:false};
  // --- Bloque 1: Coast FIRE (acumulación) ---
  var coastInner='<div class="ind-intro"><b class="h">🏖️ ¿Qué es el Coast FIRE?</b>El punto en el que ya tienes <b>suficiente patrimonio invertido</b> para que, <b>sin aportar más</b> y dejándolo crecer solo, llegue a tu <b>número FIRE</b> a la edad objetivo. A partir de ahí solo cubres gastos corrientes: el interés compuesto hace el resto.</div>'
    +'<div class="ind-fires">'
    +panel('inv','💰','FIRE por Inversión','vendes un 4% al año (regla del 4%)',FI,'')
    +panel('div','🪙','FIRE por Dividendo','vives del dividendo, sin vender (RPD '+(rpd*100).toFixed(1)+'%)',FD,covExtra)
    +'</div>'
    +'<div class="ind-kpis"><div class="k"><div class="l">Años de colchón</div><div class="v">'+anosColchon.toFixed(1)+' años</div><div class="p">patrimonio ÷ gasto anual ('+eur(gastoAnual)+')</div></div>'
    +'<div class="k"><div class="l">Tasa de ahorro</div><div class="v">'+(tasaAhorro!=null?tasaAhorro.toFixed(0)+'%':'—')+'</div><div class="p">de tus ingresos netos</div></div>'
    +'<div class="k"><div class="l">Patrimonio actual</div><div class="v">'+eur(patrimonio)+'</div><div class="p">efectivo + invertido</div></div></div>'
    +'<div class="ind-hyp">⚠️ <b>Muy sensible a las hipótesis</b>: gasto anual <b>'+eur(gastoAnual)+'</b>; retorno <b>real '+(rReal*100).toFixed(1)+'%</b> (cartera '+(num(c.crecCartera)*100).toFixed(0)+'% − inflación '+(infla*100).toFixed(1)+'%); edad objetivo <b>'+edadObj+'</b> ('+n+' años); RPD cartera <b>'+(rpd*100).toFixed(1)+'%</b>. Todo sale de tu Proyección y tu cartera; ajústalo en Proyección. Pequeños cambios mueven mucho el Coast FIRE. Orientativo, no es asesoramiento.</div>';
  // --- Bloque 2: D2 · Retirada dinámica (decumulación / sequence risk + guardrails) ---
  var retiInner='', retiSum='';
  try{
    var edadJub=Math.round(num(c.edadFinAportar))||70;
    var edadFin=Math.round(num(c.edadFin))||90;
    var ser=(typeof computeProy==='function')?computeProy(c):[];
    var jubRow=null; for(var _j=0;_j<ser.length;_j++){ if(ser[_j].edad>=edadJub){ jubRow=ser[_j]; break; } }
    if(!jubRow&&ser.length)jubRow=ser[ser.length-1];
    var capJub=jubRow?num(jubRow.patrimonio):patrimonio;
    var jubY=jubRow?jubRow.anio:nowY; var edadJubReal=jubRow?jubRow.edad:edadJub;
    var yrsRet=Math.max(1,edadFin-edadJubReal);
    var gastoJub=gastoAnual*Math.pow(1+infla,Math.max(0,jubY-nowY));
    var mu=num(c.crecCartera)||0.04, sigma=num(c.mcVol)||0.18, sigSrc='estimada '+(sigma*100).toFixed(0)+'%';
    try{ if(typeof riesgoData==='function'){ var R=riesgoData(renderIndependencia); if(R&&R.ok&&R.volPort>0){ sigma=R.volPort; sigSrc='real de tu cartera ('+(sigma*100).toFixed(0)+'%)'; } else if(R&&R.loading){ sigSrc='estimada '+(sigma*100).toFixed(0)+'% (afinando con tu histórico al cargar cotizaciones…)'; } } }catch(e){}
    if(!(capJub>0)||!(gastoJub>0)){
      retiInner='<div class="empty">Necesito tu proyección de patrimonio a la jubilación y tu gasto anual para simular la retirada.</div>';
    } else {
      var _run=function(cap,g0,guard,collect){ var M=collect?2500:2000; var ok=0; var paths=collect?[]:null;
        for(var p=0;p<M;p++){ var bal=cap,g=g0; var row=collect?[bal]:null;
          for(var y=0;y<yrsRet;y++){ var r=mu+sigma*_mcNormal(); bal=bal*(1+r);
            if(guard&&bal>0){ var wr=g/bal, wr0=g0/cap; if(wr>wr0*1.2)g=g*0.9; else if(wr<wr0*0.8)g=g*1.1; }
            bal-=g; g=g*(1+infla); if(bal<0)bal=0; if(collect)row.push(bal); }
          if(bal>0)ok++; if(collect)paths.push(row); }
        return {ok:ok/M,paths:paths}; };
      var fija=_run(capJub,gastoJub,false,true);
      var guardR=_run(capJub,gastoJub,true,false);
      var tasaIni=gastoJub/capJub*100;
      var _okRate=function(rate){ var M=1200,ok=0; for(var p=0;p<M;p++){ var bal=capJub,g=capJub*rate; for(var y=0;y<yrsRet;y++){ var r=mu+sigma*_mcNormal(); bal=bal*(1+r); bal-=g; g=g*(1+infla); if(bal<0)bal=0; } if(bal>0)ok++; } return ok/M; };
      var lo=0.02,hi=0.10; for(var it=0;it<14;it++){ var mid=(lo+hi)/2; if(_okRate(mid)>=0.90)lo=mid; else hi=mid; } var safe=lo;
      var npt=yrsRet+1, p10=[],p50=[],p90=[];
      for(var y=0;y<npt;y++){ var col=fija.paths.map(function(pp){return pp[y];}).sort(function(a,b){return a-b;}); var q=function(f){return col[Math.floor(f*(col.length-1))];}; p10.push(q(0.10)); p50.push(q(0.50)); p90.push(q(0.90)); }
      var _eurK=function(v){ return Math.abs(v)>=1e6?(v/1e6).toFixed(1).replace('.',',')+'M':(Math.round(v/1000)+'k'); };
      var _svg=(function(){ var W=680,H=240,pl=46,pr=12,pt=12,pb=26; var pw=W-pl-pr,ph=H-pt-pb;
        var vmax=Math.max.apply(null,p90.concat([capJub])); if(!(vmax>0))vmax=capJub||1;
        var X=function(i){return pl+pw*(i/(npt-1));}, Y=function(v){return pt+ph*(1-v/vmax);};
        var line=function(a){return a.map(function(v,i){return (i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1);}).join(' ');};
        var band=p90.map(function(v,i){return X(i).toFixed(1)+','+Y(v).toFixed(1);}).join(' ')+' '+p10.map(function(v,i){return X(i).toFixed(1)+','+Y(v).toFixed(1);}).reverse().join(' ');
        var grid=''; for(var k=0;k<=4;k++){ var vv=vmax*k/4, yy=Y(vv); grid+='<line x1="'+pl+'" y1="'+yy.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+yy.toFixed(1)+'" stroke="#eef2f7"/><text x="'+(pl-5)+'" y="'+(yy+3).toFixed(1)+'" text-anchor="end" font-size="9" fill="#94a3b8">'+_eurK(vv)+'</text>'; }
        var xl='', step=(yrsRet>16?5:3); for(var e=edadJubReal;e<=edadFin;e+=step){ var i=e-edadJubReal; xl+='<text x="'+X(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="9" fill="#94a3b8">'+e+'</text>'; }
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">'+grid+xl+'<polygon points="'+band+'" fill="#93c5fd" fill-opacity=".35"/><path d="'+line(p90)+'" fill="none" stroke="#93c5fd" stroke-width="1"/><path d="'+line(p10)+'" fill="none" stroke="#93c5fd" stroke-width="1"/><path d="'+line(p50)+'" fill="none" stroke="#1d4ed8" stroke-width="2"/><line x1="'+pl+'" y1="'+Y(0).toFixed(1)+'" x2="'+(W-pr)+'" y2="'+Y(0).toFixed(1)+'" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="4 3"/><text x="'+(W-pr)+'" y="'+(Y(0)-4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#dc2626">ruina (0 €)</text></svg>';
      })();
      retiSum='éxito '+(fija.ok*100).toFixed(0)+'% fijo · '+(guardR.ok*100).toFixed(0)+'% guardrails';
      retiInner='<div class="d2-intro"><b class="h">📉 El riesgo de secuencia (lo que un «retorno medio» esconde)</b>Al vivir de la cartera, <b>el orden de los años importa muchísimo</b>: si te tocan <b>caídas al principio</b>, vendes con el mercado bajo y el capital se agota, <b>aunque la rentabilidad media a largo plazo sea buena</b>. Simulamos <b>miles de futuros posibles</b> (Monte Carlo) desde tu jubilación ('+edadJubReal+') hasta los '+edadFin+', y contamos en cuántos <b>no te quedas sin dinero</b>.</div>'
        +'<div class="d2-cmp">'
        +'<div class="d2-cc bad"><div class="l">Gasto fijo (rígido)</div><div class="v">'+(fija.ok*100).toFixed(0)+'%</div><div class="p">de éxito: sacas '+eur(gastoJub)+'/año pase lo que pase. Con una cartera muy en bolsa (volátil), una mala secuencia te puede hundir.</div></div>'
        +'<div class="d2-cc good"><div class="l">Con guardrails</div><div class="v">'+(guardR.ok*100).toFixed(0)+'%</div><div class="p">de éxito: si un año va mal, recortas el gasto ~10%; si va bien, lo subes. La flexibilidad lo cambia todo.</div></div>'
        +'</div>'
        +'<div class="d2-kpis">'
        +'<div class="k"><div class="l">Capital al jubilarte ('+jubY+')</div><div class="v">'+eur(capJub)+'</div><div class="p">lo que proyectas tener</div></div>'
        +'<div class="k"><div class="l">Gasto en jubilación</div><div class="v">'+eur(gastoJub)+'</div><div class="p">tu gasto de hoy con inflación</div></div>'
        +'<div class="k"><div class="l">Tasa de retirada inicial</div><div class="v">'+tasaIni.toFixed(1)+'%</div><div class="p">gasto ÷ capital</div></div>'
        +'<div class="k"><div class="l">Tasa segura (90% éxito)</div><div class="v">'+(safe*100).toFixed(1)+'%</div><div class="p">≈ '+eur(capJub*safe)+'/año fijo</div></div>'
        +'</div>'
        +'<div class="d2-ct">Cómo evoluciona tu patrimonio en la jubilación (gasto fijo)</div>'
        +'<div class="d2-cs">Línea azul = escenario mediano · banda = del 10% peor al 10% mejor · línea roja = ruina. Cuantos más caminos toquen el cero antes de los '+edadFin+', más frágil es el plan rígido.</div>'
        +_svg
        +'<div class="d2-gr"><b>🛡️ ¿Qué son los «guardrails» (barandillas de Guyton-Klinger)?</b> Una regla de gasto <b>flexible</b>: fijas una tasa de retirada y, cada año, si por una mala racha tu tasa efectiva se dispara (&gt;20% sobre la inicial) <b>recortas el gasto ~10%</b>; si por una buena racha baja mucho (&lt;20%), te <b>das un capricho</b> y lo subes. Con pequeños ajustes evitas quedarte sin dinero en los escenarios malos — por eso el éxito sube tanto. Requiere que puedas <b>apretarte el cinturón</b> algún año.</div>'
        +'<div class="d2-hyp">⚠️ <b>Hipótesis y cautelas</b>: retorno medio '+(mu*100).toFixed(0)+'%, volatilidad '+(sigma*100).toFixed(0)+'% ('+sigSrc+'), inflación '+(infla*100).toFixed(1)+'%, '+yrsRet+' años de retirada. Se aplica el rendimiento de mercado a todo el patrimonio (simplificación). Las tasas «seguras» clásicas (4–4,7%) vienen de estudios de EE. UU. con carteras 60/40; una cartera muy en bolsa es más volátil, por eso pide más flexibilidad o menos tasa. Orientativo, no es asesoramiento.</div>';
    }
  }catch(e){ retiInner='<div class="empty">No se pudo simular la retirada dinámica ('+(e&&e.message||e)+').</div>'; }
  var IB=function(key,ic,title,sum,inner){ var op=window._indepBlk[key]?' open':''; return '<div class="pos-blk'+op+'" data-indepblk="'+key+'"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">'+ic+' '+title+'</span><span class="bsum">'+sum+'</span></div><div class="pos-blk-b"><div class="ind-pad">'+inner+'</div></div></div>'; };
  el.innerHTML=IB('coast','🏖️','Coast FIRE — ¿cuándo puedo dejar de aportar?',anosColchon.toFixed(0)+' años de colchón',coastInner)
    +IB('retirada','📉','Retirada dinámica — ¿cuánto puedo gastar sin quedarme sin dinero?',retiSum,retiInner);
  if(!el._indepBound){ el._indepBound=true; el.addEventListener('click',function(e){ if(e.target.closest('input,select,button,a,[data-ficha]'))return; var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-indepblk'); if(k){ window._indepBlk=window._indepBlk||{}; window._indepBlk[k]=b.classList.contains('open'); } } }); }
}
// === Cobertura de gastos por dividendos (independencia financiera / FIRE) ===
// Dividendo BRUTO (simYearTotal) vs GASTO REAL (movimientos últimos 12m). Proyecta dividendo con su
// crecimiento estimado (CAGR de la trayectoria del plan; fallback histórico; fallback 5%) y gasto con
// inflación (DB.config.fireInfla o 2,5%) hasta el cruce → año de independencia.
function coberturaDivGastos(){ if(typeof simYearTotal!=='function')return null; const nowY=new Date().getFullYear();
  const gp=(typeof gastoMensualPresu==='function')?gastoMensualPresu():null; let gastoReal;
  if(gp!=null&&gp>0){ gastoReal=gp*12; }
  else { const hoy=Date.now(), y1=hoy-365.25*86400000; gastoReal=0; (DB.movimientos||[]).forEach(m=>{ if((m.tipo||'')==='gasto'&&m.fecha){ const ms=Date.parse(m.fecha+'T00:00:00'); if(!isNaN(ms)&&ms>=y1&&ms<=hoy)gastoReal+=num(m.importe); } }); if(gastoReal<=0){ const porY={}; (DB.movimientos||[]).forEach(m=>{ if((m.tipo||'')==='gasto'&&m.fecha){ const y=+m.fecha.slice(0,4); if(y)porY[y]=(porY[y]||0)+num(m.importe); } }); const ys=Object.keys(porY).map(Number).sort((a,b)=>b-a); if(ys.length)gastoReal=porY[ys[0]]; } }
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
// === C4 · Exposición a factores de estilo vs IBEX (desde fundamentales.json) ===
function _factorExpo(reRender){
  var fund=(typeof _radFundCache!=='undefined')?_radFundCache:undefined;
  if(fund===null||fund===undefined){ if(typeof _radCargarFund==='function')_radCargarFund().then(function(){ if(typeof reRender==='function')reRender(); }); return {loading:true}; }
  var emp=(fund&&fund.empresas)||[]; if(!emp.length)return {noData:true};
  var n0=function(v){ v=num(v); return isFinite(v)?v:null; };
  var byT={}; emp.forEach(function(e){ var t=(e.ticker||e.symbol||'').toUpperCase().replace('.MC',''); if(t&&!byT[t])byT[t]=e; });
  var uni=Object.keys(byT).map(function(t){ var e=byT[t]; var per=n0(e.per),pbv=n0(e.pbv),eveb=n0(e.evEbitda),mc=n0(e.marketCap),beta=n0(e.beta);
    return {t:t, ey:(per>0?1/per:null), by:(pbv>0?1/pbv:null), evy:(eveb>0?1/eveb:null), roe:n0(e.roe), mn:n0(e.margenNeto), dne:n0(e.dnEbitda), cbpa:n0(e.crecBpa), lmc:(mc>0?Math.log(mc):null), nbeta:(beta!=null?-beta:null), rpd:n0(e.rpd), mc:mc }; });
  function zmap(f){ var vals=uni.map(function(x){return x[f];}).filter(function(v){return v!=null&&isFinite(v);}); var n=vals.length; if(n<3)return null; var m=vals.reduce(function(a,b){return a+b;},0)/n; var sd=Math.sqrt(vals.reduce(function(a,b){return a+(b-m)*(b-m);},0)/n)||1; var z={}; uni.forEach(function(x){ z[x.t]=(x[f]!=null&&isFinite(x[f]))?(x[f]-m)/sd:null; }); return z; }
  var Z={}; ['ey','by','evy','roe','mn','dne','cbpa','lmc','nbeta','rpd'].forEach(function(f){ Z[f]=zmap(f); });
  var avg=function(t,keys,signs){ var s=0,c=0; keys.forEach(function(k,i){ var zz=Z[k]&&Z[k][t]; if(zz!=null&&isFinite(zz)){ s+=(signs&&signs[i]===-1?-zz:zz); c++; } }); return c?s/c:null; };
  var fZ={}; uni.forEach(function(x){ var t=x.t; fZ[t]={ value:avg(t,['ey','by','evy']), quality:avg(t,['roe','mn','dne','cbpa'],[1,1,-1,1]), size:(Z.lmc&&Z.lmc[t]!=null?Z.lmc[t]:null), lowvol:(Z.nbeta&&Z.nbeta[t]!=null?Z.nbeta[t]:null), yield:(Z.rpd&&Z.rpd[t]!=null?Z.rpd[t]:null) }; });
  var pos=(typeof invPositions==='function'?invPositions():[]).filter(function(p){return p.acciones>0.0001;});
  var pw={},tv=0; pos.forEach(function(p){ var t=(p.ticker||'').toUpperCase(); var v=p.acciones*num(p.precioActual); pw[t]=(pw[t]||0)+v; tv+=v; });
  var ibx=uni.filter(function(x){return x.mc>0;}).sort(function(a,b){return b.mc-a.mc;}).slice(0,35); var ibxTot=ibx.reduce(function(s,x){return s+x.mc;},0)||1;
  var iw={}; ibx.forEach(function(x){ iw[x.t]=x.mc/ibxTot; });
  var wscore=function(W,f){ var s=0,w=0; Object.keys(W).forEach(function(t){ var z=fZ[t]&&fZ[t][f]; if(z!=null&&isFinite(z)){ s+=W[t]*z; w+=W[t]; } }); return w>0?s/w:null; };
  var FACS=['value','quality','size','lowvol','yield'];
  var tilts=FACS.map(function(f){ var p=wscore(pw,f),i=wscore(iw,f); return {f:f,p:p,i:i,tilt:(p!=null&&i!=null)?(p-i):null}; });
  var wraw=function(W,field){ var s=0,w=0; Object.keys(W).forEach(function(t){ var e=byT[t]; var v=e?n0(e[field]):null; if(v!=null){ s+=W[t]*v; w+=W[t]; } }); return w>0?s/w:null; };
  var medMc=function(W){ var arr=Object.keys(W).map(function(t){return byT[t]?n0(byT[t].marketCap):null;}).filter(function(v){return v!=null;}).sort(function(a,b){return a-b;}); return arr.length?arr[Math.floor(arr.length/2)]:null; };
  var covered=Object.keys(pw).filter(function(t){return byT[t];});
  return {ok:true, tilts:tilts, wraw:wraw, medMc:medMc, pw:pw, iw:iw, covered:covered.length, nPos:Object.keys(pw).length, actualizado:(fund&&fund.actualizado)||''};
}
function _factorBlockHTML(FX){
  if(!FX||FX.loading)return '<div class="rz-note">Cargando <code>fundamentales.json</code>… (necesita conexión)</div>';
  if(FX.noData)return '<div class="rz-note">No hay <code>fundamentales.json</code> en el repo, o está vacío. Ejecuta «Actualizar fundamentales» y súbelo.</div>';
  if(!FX.covered)return '<div class="rz-note">Ninguna de tus posiciones está en <code>fundamentales.json</code> todavía.</div>';
  var sig=function(x){ return (x>=0?'+':'')+x.toFixed(1).replace('.',',')+'σ'; };
  var fuerza=function(a){ a=Math.abs(a); return a>=1?'sesgo fuerte':(a>=0.5?'sesgo moderado':'casi como el IBEX'); };
  var eur=function(v){ if(v==null)return '—'; if(v>=1e9)return (v/1e9).toFixed(1).replace('.',',')+' B€'; return Math.round(v/1e6).toLocaleString('es-ES')+' M€'; };
  var pct=function(v,d){ return v==null?'—':v.toFixed(d==null?1:d).replace('.',',')+'%'; };
  var num1=function(v){ return v==null?'—':v.toFixed(1).replace('.',','); };
  var META={
    value:{ic:'💰',nm:'Valor (barato/caro)',mide:'Cómo de barata está tu cartera: cuánto pagas por cada euro de beneficio o de patrimonio (PER, P/B, EV/EBITDA).',
      up:'Tus empresas están <b>más baratas</b> que la media: mejor margen de seguridad, aunque suelen ser negocios más maduros.', dn:'Tus empresas están <b>más caras</b> que la media: pagas por crecimiento/calidad esperada.',
      raw:function(FX){ return 'PER '+num1(FX.wraw(FX.pw,'per'))+' · P/B '+num1(FX.wraw(FX.pw,'pbv')); }, rawI:function(FX){ return 'PER '+num1(FX.wraw(FX.iw,'per'))+' · P/B '+num1(FX.wraw(FX.iw,'pbv')); }},
    quality:{ic:'⭐',nm:'Calidad',mide:'Cómo de buenos son los negocios: rentabilidad (ROE), margen y poca deuda.',
      up:'Negocios <b>mejores</b> que la media (más rentables y menos endeudados): aporta solidez.', dn:'Calidad <b>por debajo</b> de la media: vigila deuda y rentabilidad.',
      raw:function(FX){ return 'ROE '+pct(FX.wraw(FX.pw,'roe'))+' · margen '+pct(FX.wraw(FX.pw,'margenNeto')); }, rawI:function(FX){ return 'ROE '+pct(FX.wraw(FX.iw,'roe')); }},
    size:{ic:'🏛️',nm:'Tamaño',mide:'El tamaño de tus empresas (capitalización). Grandes = consolidadas; pequeñas = más crecimiento y riesgo.',
      up:'Sesgo a <b>empresas grandes</b> y consolidadas: más estables y líquidas, pero crecen menos.', dn:'Sesgo a <b>empresas pequeñas/medianas</b>: más margen de crecimiento y más riesgo.',
      raw:function(FX){ return 'mediana '+eur(FX.medMc(FX.pw)); }, rawI:function(FX){ return 'mediana '+eur(FX.medMc(FX.iw)); }},
    lowvol:{ic:'🛡️',nm:'Baja volatilidad',mide:'Cuánto se mueve tu cartera (vía beta). Baja = sube y baja con más suavidad que el mercado.',
      up:'Tu cartera se mueve <b>menos</b> que el mercado: tranquila en las caídas, pero se queda atrás en las subidas fuertes.', dn:'Tu cartera se mueve <b>más</b> que el mercado: más nervios en ambas direcciones.',
      raw:function(FX){ return 'beta '+num1(FX.wraw(FX.pw,'beta')); }, rawI:function(FX){ return 'beta '+num1(FX.wraw(FX.iw,'beta')); }},
    yield:{ic:'💶',nm:'Dividendo (yield)',mide:'Cuánto dividendo reparte tu cartera respecto a su precio (RPD).',
      up:'Cobras <b>más dividendo</b> que el mercado — tu estrategia. A cambio, suelen crecer menos y sufren más cuando suben los tipos.', dn:'Cobras <b>menos dividendo</b> que el mercado.',
      raw:function(FX){ return 'RPD '+pct(FX.wraw(FX.pw,'rpd')); }, rawI:function(FX){ return 'RPD '+pct(FX.wraw(FX.iw,'rpd')); }}
  };
  var MAX=2;
  var cards=FX.tilts.map(function(o){ var m=META[o.f]; if(!m)return ''; if(o.tilt==null)return '<div class="fx-c"><div class="fx-h"><span class="ic">'+m.ic+'</span><b class="nm">'+m.nm+'</b><span class="tilt">—</span></div><div class="fx-mide"><b>Qué mide:</b> '+m.mide+'</div><div class="fx-raw muted">Sin datos suficientes en fundamentales.</div></div>';
    var pos=o.tilt>=0; var w=(Math.min(Math.abs(o.tilt),MAX)/MAX*50).toFixed(1);
    return '<div class="fx-c"><div class="fx-h"><span class="ic">'+m.ic+'</span><b class="nm">'+m.nm+'</b><span class="tilt '+(pos?'pos':'neg')+'">'+sig(o.tilt)+'</span></div>'
      +'<div class="fx-sub">'+(pos?'▲ más que el IBEX':'▼ menos que el IBEX')+' · <span class="muted">'+fuerza(o.tilt)+'</span></div>'
      +'<div class="fx-track"><div class="fx-zero"></div>'+(pos?'<div class="fx-fill pos" style="left:50%;width:'+w+'%"></div>':'<div class="fx-fill neg" style="right:50%;width:'+w+'%"></div>')+'</div>'
      +'<div class="fx-mide"><b>Qué mide:</b> '+m.mide+'</div>'
      +'<div class="fx-int"><b>Lo tuyo:</b> '+(pos?m.up:m.dn)+'</div>'
      +'<div class="fx-raw">Tu cartera: <b>'+m.raw(FX)+'</b> · IBEX: '+m.rawI(FX)+'</div></div>';
  }).join('');
  var tget=function(f){ var o=FX.tilts.find(function(x){return x.f===f;}); return o?o.tilt:null; };
  var doble=(tget('value')>0&&tget('lowvol')>0&&tget('yield')>0);
  var whatfor='<div class="fx-whatfor"><b class="h">🧭 ¿Qué es esto y para qué sirve?</b>'
    +'Tu cartera tiene "estilos" o <b>sesgos</b> aunque no los hayas elegido a propósito (p. ej. muchas eléctricas = mucho dividendo y poca volatilidad, sin quererlo). Esta vista pone <b>número</b> a esos sesgos y los compara con el mercado (el IBEX), para responder a dos preguntas:'
    +'<br>• <b>¿Mi cartera hace lo que yo creo?</b> (confirma tu estrategia con datos).'
    +'<br>• <b>¿Estoy doblando la misma apuesta sin darme cuenta?</b> Varios sesgos que apuntan a lo mismo amplifican el riesgo en las malas rachas.'
    +'<br><span class="muted">No hay un perfil "correcto": es una radiografía para conocerte, no una recomendación de compra o venta.</span></div>';
  var howread='<div class="fx-howread"><div class="box"><b>Cómo leer el número (σ).</b> Cada sesgo se mide en "desviaciones típicas" respecto al IBEX. En cristiano: <b>0σ</b> = igual que el mercado · <b>±0,5σ</b> = un poco por encima/debajo · <b>±1σ</b> = sesgo claro · <b>±2σ</b> = extremo. El <b>signo</b> dice el lado; el <b>tamaño</b>, la fuerza.'
    +'<div class="fx-scale"><div class="seg l2"></div><div class="seg l1"></div><div class="seg z"></div><div class="seg r1"></div><div class="seg r2"></div></div><div class="fx-scale-lbl"><span>−2σ menos</span><span>IBEX</span><span>+2σ más</span></div></div>'
    +'<div class="box"><b>Las barras.</b> La línea gris central es el IBEX. Barra a la <b style="color:#0d9488">derecha (verde)</b> = tienes <b>más</b> de ese factor que el índice; a la <b style="color:#d97706">izquierda (ámbar)</b> = <b>menos</b>. Debajo de cada una te explico qué significa <b>tu</b> resultado.</div></div>';
  var warn=doble
    ? '<div class="fx-warn"><b>⚠️ La trampa a vigilar: la doble apuesta.</b> Tienes altos a la vez <b>Valor</b>, <b>Baja volatilidad</b> y <b>Dividendo</b>, que tienden a ser <b>la misma familia</b> de empresas (utilities, defensivas). No es diversificar tres cosas: es <b>triplicar la misma apuesta</b>. Funciona en mercados tranquilos, pero si a esa familia le toca sufrir (p. ej. subidas fuertes de tipos), caen varias a la vez. Mira el <b>conjunto</b> y crúzalo con las correlaciones y los Escenarios.</div>'
    : '<div class="fx-warn" style="background:#f0f6ff;border-color:#cfe0fb;color:#334155"><b>💡 Interpreta el conjunto.</b> Algunos factores solapan (yield, baja volatilidad y value suelen ir juntos). Mira el perfil completo y crúzalo con las correlaciones y los Escenarios, no cada factor por separado.</div>';
  var cov=(FX.covered<FX.nPos)?('<div class="muted" style="font-size:11px;margin-top:8px">Calculado con '+FX.covered+' de tus '+FX.nPos+' posiciones (el resto no está en fundamentales.json). IBEX aprox. = 35 mayores por capitalización.</div>'):('<div class="muted" style="font-size:11px;margin-top:8px">IBEX aprox. = 35 mayores por capitalización'+(FX.actualizado?(' · fundamentales '+FX.actualizado):'')+'.</div>');
  return whatfor+howread+'<div class="fx-grid">'+cards+'</div>'+warn+cov;
}
function renderRiesgo(){ const el=$('#riesgoBody'); if(!el)return; const kp=$('#riesgoKpis'); const R=riesgoData(renderRiesgo);
  if(!R||R.empty){ el.innerHTML='<div class="empty">Sin posiciones abiertas.</div>'; if(kp)kp.innerHTML=''; return; }
  if(R.loading){ el.innerHTML='<div class="muted" style="font-size:12px">Cargando cotizaciones del repo… (necesita conexión)</div>'; if(kp)kp.innerHTML=''; return; }
  if(R.noData){ el.innerHTML='<div class="empty">No hay suficiente histórico de precios en el repo para calcular el riesgo. Ejecuta la actualización de cotizaciones.</div>'; if(kp)kp.innerHTML=''; return; }
  window._riesgoOpen=window._riesgoOpen||{pos:false,sec:false,ingreso:false,corr:false,factores:false};
  const FX=_factorExpo(renderRiesgo);
  const pv=x=>x==null?'—':(x*100).toFixed(1)+'%';
  const corrCol=v=>v>=0.6?'#dc2626':v>=0.4?'#d97706':'#16a34a';
  const corrBg=v=>{ if(v==null)return '#fff'; const x=Math.max(-1,Math.min(1,v)); if(x>=0){const c=Math.round(255-x*105);return 'rgb(255,'+c+','+c+')';} const c2=Math.round(255+x*105); return 'rgb('+c2+',255,'+c2+')'; };
  const avgCorrOf=t=>{ let s=0,c=0; R.tickers.forEach(o=>{ if(o!==t){s+=R.corrM[t][o];c++;} }); return c?s/c:null; };
  if(kp)kp.innerHTML=
    '<div class="rz-c hero"><div class="l">Volatilidad anual</div><div class="v">'+pv(R.volPort)+'</div><div class="p">'+(R.volPort>0.25?'alta':R.volPort<0.15?'contenida':'media')+'</div></div>'+
    '<div class="rz-c"><div class="l">Drawdown máximo</div><div class="v neg">'+pv(R.ddMax)+'</div><div class="p">peor caída del periodo</div></div>'+
    '<div class="rz-c"><div class="l">Beta vs IBEX</div><div class="v">'+(R.beta==null?'—':R.beta.toFixed(2))+'</div><div class="p">'+(R.beta==null?'':(R.beta>1?'más que el mercado':'menos que el mercado'))+'</div></div>'+
    '<div class="rz-c"><div class="l">Correlación media</div><div class="v '+(R.avgCorr!=null&&R.avgCorr<0.5?'pos':(R.avgCorr>=0.7?'neg':''))+'">'+(R.avgCorr==null?'—':R.avgCorr.toFixed(2))+'</div><div class="p">'+(R.avgCorr!=null&&R.avgCorr<0.5?'diversifica bien':'poco diversificada')+'</div></div>'+
    '<div class="rz-c"><div class="l">Nº efectivo posiciones</div><div class="v">'+R.effN.toFixed(1)+' / '+R.tickers.length+'</div><div class="p">diversificación real</div></div>'+
    '<div class="rz-c"><div class="l">Concentración top</div><div class="v '+(R.topW>=0.35?'neg':'')+'">'+R.topT+' '+pv(R.topW)+'</div><div class="p">mayor posición</div></div>';
  const perT=R.tickers.slice().sort((a,b)=>R.W[b]-R.W[a]);
  const trows=perT.map(t=>{ const a=avgCorrOf(t); return '<tr><td class="l"><b data-ficha="'+t+'" class="rz-tk">'+t+'</b></td><td>'+pv(R.W[t])+'</td><td>'+pv(R.volById[t])+'</td><td style="color:'+(a==null?'#64748b':corrCol(a))+';font-weight:600">'+(a==null?'—':a.toFixed(2))+'</td></tr>'; }).join('');
  const posDesk='<div class="rz-desk"><table><thead><tr><th class="l">Empresa</th><th>Peso</th><th>Volat.</th><th>Corr. media</th></tr></thead><tbody>'+trows+'</tbody></table></div>';
  const posCards=perT.map(t=>{ const a=avgCorrOf(t); return '<div class="rz-icard"><div class="top"><b data-ficha="'+t+'" class="rz-tk">'+t+'</b><span style="font-weight:700">'+pv(R.W[t])+'</span></div><div class="g"><div class="m"><div class="l">Peso</div><div class="v">'+pv(R.W[t])+'</div></div><div class="m"><div class="l">Volat.</div><div class="v">'+pv(R.volById[t])+'</div></div><div class="m"><div class="l">Corr. media</div><div class="v" style="color:'+(a==null?'#64748b':corrCol(a))+'">'+(a==null?'—':a.toFixed(2))+'</div></div></div></div>'; }).join('');
  const secArr=Object.keys(R.secW).map(s=>({s,w:R.secW[s]})).sort((a,b)=>b.w-a.w);
  const secInner=secArr.map(x=>{ const p=x.w*100; const col=p>=35?'#dc2626':p>=25?'#d97706':'#2563eb'; return '<div class="rz-secbar"><div class="top"><span><b>'+x.s+'</b></span><span style="font-weight:800;color:'+col+'">'+p.toFixed(0)+'%</span></div><div class="bar"><i style="width:'+Math.min(100,p)+'%;background:'+col+'"></i></div></div>'; }).join('');
  const chead='<tr><th class="l"></th>'+perT.map(t=>'<th>'+t+'</th>').join('')+'</tr>';
  const crows=perT.map(a=>'<tr><th class="l">'+a+'</th>'+perT.map(b=>{ const v=R.corrM[a][b]; return '<td style="background:'+corrBg(v)+'">'+v.toFixed(2)+'</td>'; }).join('')+'</tr>').join('');
  const corrDesk='<div class="rz-desk"><table class="rz-heat"><thead>'+chead+'</thead><tbody>'+crows+'</tbody></table></div>';
  const corrCards=perT.map(t=>{ const peers=perT.filter(o=>o!==t).map(o=>({o,v:R.corrM[t][o]})).sort((x,y)=>y.v-x.v).slice(0,3); const a=avgCorrOf(t);
    return '<div class="rz-pcard"><div class="top"><b data-ficha="'+t+'" class="rz-tk">'+t+'</b><span style="font-size:11px;color:#64748b">corr. media '+(a==null?'—':a.toFixed(2))+'</span></div><div class="facs">'+peers.map(p=>'<span class="rz-pfac" style="background:'+(p.v>=0.6?'#fef2f2':p.v>=0.4?'#fff7ed':'#f0fdf4')+';color:'+corrCol(p.v)+'">'+p.o+' '+p.v.toFixed(2)+'</span>').join('')+'</div></div>'; }).join('');
  // === Concentración del INGRESO por dividendos + income-at-risk ===
  const _dsOf=t=>{ t=(t||'').toUpperCase(); const a=(DB.analisis||[]).find(x=>(x.ticker||'').toUpperCase()===t); if(a&&a.dividendSafety)return a.dividendSafety; const c=(typeof _tesisCache!=='undefined'&&_tesisCache)?_tesisCache[t]:null; return (c&&c.dividendSafety)||null; };
  const _dsCol2=b=>({'Muy seguro':'#16a34a','Seguro':'#4d7c0f','Vigilar':'#d97706','Frágil':'#ea580c','Recorte probable':'#dc2626'}[b]||'#94a3b8');
  const _incAgg={}; (typeof invPositions==='function'?invPositions():[]).forEach(p=>{ if(p.acciones<=0.0001)return; const t=(p.ticker||'').toUpperCase(); const v=(DB.valores||{})[t]||{}; const d=p.acciones*num(v.divAccion); if(d>0)_incAgg[t]=(_incAgg[t]||0)+d; });
  const _incR=Object.keys(_incAgg).map(t=>({t,div:_incAgg[t],ds:_dsOf(t)})).sort((a,b)=>b.div-a.div);
  const _incTot=_incR.reduce((s,x)=>s+x.div,0);
  let ingInner, ingCnt='—';
  if(_incTot<=0){ ingInner='<div class="rz-note">Sin dividendo estimado en las posiciones (falta div/acción en cotizaciones).</div>'; }
  else {
    let _c=0; _incR.forEach(x=>{ x.share=x.div/_incTot; _c+=x.share; x.cum=_c; });
    const _hhi=_incR.reduce((s,x)=>s+x.share*x.share,0), _neff=1/_hhi;
    const _t3=_incR.slice(0,3).reduce((s,x)=>s+x.share,0);
    const _riskyInc=_incR.reduce((s,x)=>s+((x.ds&&x.ds.score!=null&&x.ds.score<60)?x.div:0),0); const _riskyShare=_incTot>0?_riskyInc/_incTot:0;
    const _lvl=_hhi>=0.18?{t:'alta',c:'#dc2626'}:(_hhi>=0.10?{t:'media',c:'#d97706'}:{t:'baja',c:'#16a34a'});
    const _scn=[1,2,3].filter(k=>k<=_incR.length).map(k=>{ const lost=_incR.slice(0,k).reduce((s,x)=>s+x.div,0)*0.5; return {k,lost,lp:lost/_incTot,rest:_incTot-lost,names:_incR.slice(0,k).map(x=>x.t).join(' + ')}; });
    const pc1=x=>(x*100).toFixed(1)+'%', pc0=x=>(x*100).toFixed(0)+'%'; const iar=_scn[1]||_scn[0];
    ingCnt=_incR.length+' pagadores · '+fmt(_incTot)+'/año';
    const metrics='<div class="rz-imet">'
      +'<div class="im"><div class="l">Nº efectivo de pagadores</div><div class="v">'+_neff.toFixed(1)+' / '+_incR.length+'</div><div class="p">1/HHI del ingreso</div></div>'
      +'<div class="im"><div class="l">Top-3 del ingreso</div><div class="v '+(_t3>=0.5?'neg':'')+'">'+pc0(_t3)+'</div><div class="p">'+_incR.slice(0,3).map(x=>x.t).join(' · ')+'</div></div>'
      +'<div class="im"><div class="l">Concentración (HHI)</div><div class="v" style="color:'+_lvl.c+'">'+Math.round(_hhi*10000)+'</div><div class="p">'+_lvl.t+'</div></div>'
      +'<div class="im"><div class="l">Income-at-risk</div><div class="v neg">−'+pc0(iar.lp)+'</div><div class="p">si los '+iar.k+' mayores −50%</div></div>'
      +'<div class="im"><div class="l">Renta poco fiable</div><div class="v '+(_riskyShare>=0.25?'neg':'')+'" style="color:'+(_riskyShare>=0.25?'#dc2626':(_riskyShare>0?'#d97706':'#16a34a'))+'">'+pc0(_riskyShare)+'</div><div class="p">Dividend Safety &lt; 60</div></div>'
      +'</div>';
    const _mx=_incR[0].share||1;
    const bars=_incR.map((x,i)=>'<div class="rz-cbar"><div class="tk" data-ficha="'+x.t+'">'+x.t+(x.ds&&x.ds.score!=null?' <span title="Dividend Safety '+((x.ds.banda||'')).replace(/"/g,'&quot;')+'" style="font-size:9px;font-weight:800;color:'+_dsCol2(x.ds.banda)+'">💧'+x.ds.score+'</span>':'')+'</div><div class="trk"><i class="'+(i<3?'top':'')+'" style="width:'+(x.share/_mx*100).toFixed(1)+'%"></i></div><div class="val"><b>'+pc1(x.share)+'</b><span>'+fmt(x.div)+'</span></div><div class="cum">'+pc0(x.cum)+'</div></div>').join('');
    const scnRows=_scn.map(s=>'<tr><td class="l">Los '+s.k+' mayor'+(s.k>1?'es':'')+' recortan 50% <span class="muted">('+s.names+')</span></td><td class="neg">−'+fmt(s.lost)+'</td><td class="neg">−'+pc1(s.lp)+'</td><td><b>'+fmt(s.rest)+'</b></td></tr>').join('');
    const scnCards=_scn.map(s=>'<div class="rz-icard"><div class="top"><b>Los '+s.k+' mayor'+(s.k>1?'es':'')+' −50%</b><span class="neg" style="font-weight:800">−'+pc1(s.lp)+'</span></div><div style="font-size:11.5px;color:#64748b;margin-top:4px">'+s.names+' · pierdes <b class="neg">−'+fmt(s.lost)+'</b>, quedan <b>'+fmt(s.rest)+'</b></div></div>').join('');
    ingInner=metrics
      +'<div class="rz-cbar-h"><span>Empresa</span><span></span><span>Peso · €/año</span><span>Acum.</span></div>'+bars
      +'<div class="rz-iar-t">Income-at-risk — renta anual que se evapora si recortan el dividendo</div>'
      +'<div class="rz-desk"><table><thead><tr><th class="l">Escenario</th><th>Renta perdida</th><th>% del total</th><th>Renta restante</th></tr></thead><tbody>'+scnRows+'</tbody></table></div>'
      +'<div class="rz-mob">'+scnCards+'</div>';
  }
  const blk=(key,ic,title,cnt,note,inner)=>{ const op=window._riesgoOpen[key]; return '<div class="rz-blk'+(op?' open':'')+'" data-rzblk="'+key+'"><div class="rz-blk-h"><span class="ic">'+ic+'</span><span class="t">'+title+'</span><span class="cnt">'+cnt+'</span><span class="arw">▶</span></div><div class="rz-blk-b">'+(note?'<div class="rz-note">'+note+'</div>':'')+inner+'</div></div>'; };
  el.innerHTML='<div class="sub" style="margin-bottom:12px">Riesgo de tu cartera <b>actual</b> (pesos de hoy) con las cotizaciones diarias del repo · '+R.nDays+' días · '+R.desde+' → '+R.hasta+'. Volatilidad y beta anualizadas.</div>'+
    blk('pos','📊','Por posición',R.tickers.length+' empresas','Peso, volatilidad individual y correlación media de cada empresa con el resto (rojo = se mueve con la cartera).',posDesk+'<div class="rz-mob">'+posCards+'</div>')+
    blk('sec','🏭','Peso por sector',Object.keys(R.secW).length+' sectores','Rojo ≥35% (sobreconcentración) · ámbar ≥25%.',secInner)+
    blk('ingreso','🎯','Concentración del ingreso',ingCnt,'Aplica la concentración al <b>flujo de dividendos</b>, no al capital: una cartera bien repartida en valor puede tener la <b>renta</b> en pocos nombres. Mide la fragilidad de la "nómina" que financiará tu independencia. Marca además la <b>renta poco fiable</b> (Dividend Safety &lt; 60) y el 💧score de seguridad de cada pagador. No capta que una recesión recorte a varios pagadores del mismo sector a la vez (crúzalo con Escenarios).',ingInner)+
    blk('corr','🔗','Matriz de correlaciones','media '+(R.avgCorr==null?'—':R.avgCorr.toFixed(2)),'Verde = baja correlación (diversifica) · rojo = alta (se mueven juntas). En móvil, por empresa sus pares más correlacionados.',corrDesk+'<div class="rz-mob">'+corrCards+'</div>')+
    blk('factores','🧭','Exposición a factores vs IBEX',(FX&&FX.ok?'perfil de estilo de tu cartera':'—'),'',_factorBlockHTML(FX));
  var _rsec=document.getElementById('view-riesgo');
  if(_rsec && !renderRiesgo._bound){ renderRiesgo._bound=true; _rsec.addEventListener('click',function(e){ if(e.target.closest('[data-ficha]'))return; var h=e.target.closest('.rz-blk-h'); if(h){ var k=h.parentElement.getAttribute('data-rzblk'); window._riesgoOpen[k]=!window._riesgoOpen[k]; h.parentElement.classList.toggle('open'); } }); }
}
// === Gráfico interactivo de evolución de la cartera para el Panel (coste / valor / valor+div) con tooltip al pasar el ratón ===
const _evoReg={}; let _evoBound=false;
var _evoStState={}; function _evoSt(id){ _evoStState[id]=_evoStState[id]||{range:'max',zoom:null}; return _evoStState[id]; }
var _evoDrag=null;
const _EVO_DAYS={'1s':7,'1m':31,'3m':92,'6m':183,'1y':366,'5y':1827,'max':null};
function _evoHideAll(){ document.querySelectorAll('.evoTip').forEach(t=>t.style.display='none'); document.querySelectorAll('.evoGuide,.evoDot').forEach(el=>el.style.display='none'); }
function _evoBindHover(){ if(_evoBound)return; _evoBound=true;
  document.addEventListener('mousemove',e=>{
    if(_evoDrag){ _evoHideAll(); return; }
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
    const p=(D.labels[bi]||'').split('-'); const fecha=p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):D.labels[bi];
    const wrap=svg.parentNode; const tip=wrap?wrap.querySelector('.evoTip'):null;
    if(tip){ let h=`<div style="font-weight:700;margin-bottom:3px">${fecha}</div><div><span style="color:#94a3b8">Precio de coste:</span> ${fmt(c)}</div><div><span style="color:#60a5fa">Valor (cotización):</span> ${fmt(v)}</div><div><span style="color:#4ade80">Valor + dividendo:</span> ${fmt(dv)}</div>`;
      if(D.hayIbex)h+=`<div><span style="color:#fbbf24">Si fuera IBEX-35 (c/div):</span> ${fmt(num(D.ibex[bi]))}</div>`;
      h+=`<div style="margin-top:3px;border-top:1px solid #334155;padding-top:3px">Revalorización con dividendo: <b style="color:${rev>=0?'#4ade80':'#f87171'}">${rev>=0?'+':''}${rev.toFixed(1)}%</b></div><div style="color:#94a3b8">Solo cotización: ${revc>=0?'+':''}${revc.toFixed(1)}%</div>`;
      tip.innerHTML=h; const left=gx*r.width/D.W; tip.style.left=Math.max(70,Math.min(r.width-70,left))+'px'; tip.style.top='4px'; tip.style.display=''; }
  });
  // --- zoom por arrastre (brush) ---
  document.addEventListener('mousedown',e=>{ const svg=(e.target&&e.target.closest)?e.target.closest('.evoSvg'):null; if(!svg)return; const id=svg.getAttribute('data-evo'); const D=_evoReg[id]; if(!D||!D.ranges)return; const r=svg.getBoundingClientRect(); if(!r.width)return; let vx=(e.clientX-r.left)*D.W/r.width; vx=Math.max(D.L,Math.min(D.L+D.pw,vx)); _evoDrag={id,svg,r,x0:vx}; const br=svg.querySelector('.evoBrush'); if(br){ br.setAttribute('x',vx); br.setAttribute('width',0); br.style.display=''; } e.preventDefault(); });
  document.addEventListener('mousemove',e=>{ if(!_evoDrag)return; const D=_evoReg[_evoDrag.id]; if(!D)return; let vx=(e.clientX-_evoDrag.r.left)*D.W/_evoDrag.r.width; vx=Math.max(D.L,Math.min(D.L+D.pw,vx)); const br=_evoDrag.svg.querySelector('.evoBrush'); if(br){ br.setAttribute('x',Math.min(_evoDrag.x0,vx)); br.setAttribute('width',Math.abs(vx-_evoDrag.x0)); } });
  document.addEventListener('mouseup',e=>{ if(!_evoDrag)return; const D=_evoReg[_evoDrag.id], drag=_evoDrag; _evoDrag=null; if(!D)return; const br=drag.svg.querySelector('.evoBrush'); if(br)br.style.display='none'; let vx=(e.clientX-drag.r.left)*D.W/drag.r.width; vx=Math.max(D.L,Math.min(D.L+D.pw,vx)); const xa=Math.min(drag.x0,vx), xb=Math.max(drag.x0,vx); if(xb-xa<8)return; const px2t=px=>D.t0ms+(px-D.L)/D.pw*(D.t1ms-D.t0ms); const st=_evoSt(drag.id); st.zoom={t0:px2t(xa),t1:px2t(xb)}; if(typeof D.reRender==='function')D.reRender(); });
  document.addEventListener('dblclick',e=>{ const svg=(e.target&&e.target.closest)?e.target.closest('.evoSvg'):null; if(!svg)return; const id=svg.getAttribute('data-evo'); const st=_evoSt(id); if(st.zoom){ st.zoom=null; const D=_evoReg[id]; if(D&&typeof D.reRender==='function')D.reRender(); } });
  document.addEventListener('click',e=>{ const b=(e.target&&e.target.closest)?e.target.closest('[data-evorange],[data-evozreset]'):null; if(!b)return;
    if(b.hasAttribute('data-evozreset')){ const id=b.getAttribute('data-evozreset'); const st=_evoSt(id); st.zoom=null; const D=_evoReg[id]; if(D&&typeof D.reRender==='function')D.reRender(); return; }
    const p=(b.getAttribute('data-evorange')||'').split('|'); const key=p[0], id=p[1]; const st=_evoSt(id); st.range=key; st.zoom=null; const D=_evoReg[id]; if(D&&typeof D.reRender==='function')D.reRender(); });
  /* Edición manual del periodo de zoom con los dos campos de fecha (afinar la selección). */
  document.addEventListener('change',e=>{ const el=e.target; if(!el||!el.getAttribute)return; const idf=el.getAttribute('data-evozfrom'), idt=el.getAttribute('data-evozto'); const id=idf||idt; if(!id)return; const ms=Date.parse((el.value||'')+'T00:00:00'); if(isNaN(ms))return; const D=_evoReg[id]; const st=_evoSt(id); if(!st.zoom) st.zoom={t0:(D?D.t0ms:ms),t1:(D?D.t1ms:ms)}; if(idf) st.zoom.t0=ms; else st.zoom.t1=ms; if(st.zoom.t0>st.zoom.t1){ var _t=st.zoom.t0; st.zoom.t0=st.zoom.t1; st.zoom.t1=_t; } if(D&&typeof D.reRender==='function')D.reRender(); });
}
// Renderizador único e interactivo. opts: {id, reRender, ibex, goto, title, head, foot, mt}
function evoChartHTML(opts){ opts=opts||{}; const id=opts.id||'evo'; const d=carteraEvolData(opts.reRender);
  if(d.empty) return '';
  if(!d.ok) return `<div style="margin-top:${opts.mt!==undefined?opts.mt:16}px"><div class="muted" style="font-size:12px">Cargando cotizaciones…</div></div>`;
  _evoBindHover();
  const wantIbex=!!(opts.ibex&&d.hayIbex); const wantRanges=!!opts.ranges;
  const labF=d.labels, costeF=d.aport, valorF=d.valor, valdivF=d.valdiv, ibexF=d.ibexVal||[]; const fN=labF.length;
  const tms=labF.map(l=>Date.parse(l+'T00:00:00')); const lastMs=tms[fN-1]||0; const st=wantRanges?_evoSt(id):{range:'max',zoom:null};
  let i0=0,i1=fN-1;
  if(wantRanges){ if(st.zoom){ i0=0; while(i0<fN&&tms[i0]<st.zoom.t0)i0++; i1=fN-1; while(i1>0&&tms[i1]>st.zoom.t1)i1--; if(i1<i0+1)i0=Math.max(0,i1-1); }
    else { const _dd=_EVO_DAYS[st.range]; if(_dd){ const cut=lastMs-_dd*86400000; i0=0; while(i0<fN&&tms[i0]<cut)i0++; if(i0>fN-2)i0=Math.max(0,fN-2); } } }
  const labels=labF.slice(i0,i1+1), coste=costeF.slice(i0,i1+1), valor=valorF.slice(i0,i1+1), valdiv=valdivF.slice(i0,i1+1), ibex=ibexF.slice(i0,i1+1), n=labels.length;
  const W=820,H=300,padL=60,padR=14,padT=12,padB=38; const plotW=W-padL-padR, plotH=H-padT-padB;
  let all=coste.concat(valor,valdiv); if(wantIbex)all=all.concat(ibex); all=all.map(num); const mn=Math.min(0,...all), mx=Math.max(1,...all), rng=(mx-mn)||1;
  const X=i=> n>1 ? padL+i*plotW/(n-1) : padL+plotW/2; const Y=v=> padT+plotH-((num(v)-mn)/rng)*plotH;
  const poly=(arr,col,w,dash)=>`<polyline points="${arr.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
  const yax=(typeof gYAxis==='function')?gYAxis(mn,mx,padL,padT,plotH,W,false):'';
  const step=Math.ceil(n/9)||1; let xl=''; labels.forEach((lb,i)=>{ if(i%step===0){ const p=lb.split('-'); xl+=`<text x="${X(i).toFixed(1)}" y="${H-18}" font-size="10" text-anchor="middle" fill="#64748b">${p[1]}/${(p[0]||'').slice(2)}</text>`; } });
  const xs=labels.map((_,i)=>X(i)); _evoReg[id]={labels,coste,valor,valdiv,ibex,hayIbex:wantIbex,xs,W,padT,plotH,mn,rng,ranges:wantRanges,reRender:opts.reRender,L:padL,pw:plotW,t0ms:tms[i0],t1ms:tms[i1]};
  const guide=`<line class="evoGuide" x1="0" x2="0" y1="${padT}" y2="${padT+plotH}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" style="display:none"/>`;
  const dots=`<circle class="evoDot evoDotC" r="3.5" fill="#64748b" style="display:none"/>${wantIbex?'<circle class="evoDot evoDotX" r="3.5" fill="#f59e0b" style="display:none"/>':''}<circle class="evoDot evoDotV" r="3.5" fill="#2563eb" style="display:none"/><circle class="evoDot evoDotD" r="3.5" fill="#16a34a" style="display:none"/>`;
  const ibexLine=wantIbex?poly(ibex,'#f59e0b',1.6,'6 4'):'';
  const brush=wantRanges?`<rect class="evoBrush" x="0" y="${padT}" width="0" height="${plotH}" fill="rgba(37,99,235,.14)" stroke="#2563eb" stroke-dasharray="3 2" style="display:none"/>`:'';
  const svg=`<svg class="evoSvg" data-evo="${id}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;cursor:crosshair" preserveAspectRatio="xMidYMid meet">${yax}${guide}${poly(coste,'#94a3b8',1.6)}${ibexLine}${poly(valor,'#2563eb',2)}${poly(valdiv,'#16a34a',2)}${brush}${dots}${xl}</svg>`;
  const lc=num(coste[n-1]),lv=num(valor[n-1]),ld=num(valdiv[n-1]); const rev=lc>0?((ld-lc)/lc*100):0;
  const leg=`<div style="display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;margin-top:2px"><span><span style="display:inline-block;width:10px;height:10px;background:#94a3b8;border-radius:2px;margin-right:4px"></span>Precio de coste</span>${wantIbex?'<span><span style="display:inline-block;width:10px;height:10px;background:#f59e0b;border-radius:2px;margin-right:4px"></span>Si fuera IBEX-35</span>':''}<span><span style="display:inline-block;width:10px;height:10px;background:#2563eb;border-radius:2px;margin-right:4px"></span>Valor (cotización)</span><span><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:2px;margin-right:4px"></span>Valor + dividendos</span></div>`;
  const tip=`<div class="evoTip" data-evo="${id}" style="display:none;position:absolute;pointer-events:none;background:#0f172a;color:#fff;font-size:11.5px;line-height:1.35;padding:7px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);z-index:20;white-space:nowrap;transform:translateX(-50%)"></div>`;
  const head=(opts.head===false)?'':`<h3 style="cursor:pointer;margin-bottom:6px" data-goto="${opts.goto||'graficas'}">${opts.title||'Evolución de la cartera'} <span class="muted" style="font-size:12px">›</span></h3>`;
  const foot=(opts.foot===false)?'':`<div class="muted" style="font-size:11.5px;margin-top:4px">Hoy · coste ${fmt(lc)} · valor ${fmt(lv)} · con dividendos ${fmt(ld)} · revalorización con dividendo <b style="color:${rev>=0?'#16a34a':'#dc2626'}">${rev>=0?'+':''}${rev.toFixed(1)}%</b></div>`;
  let rangeBar='';
  if(wantRanges){
    /* La variación del periodo se mide con la Valoración de cartera SIN dividendos (valorF). */
    const _rv=key=>{ const _d=_EVO_DAYS[key]; let s=0; if(_d){ const cut=lastMs-_d*86400000; while(s<fN&&tms[s]<cut)s++; if(s>fN-1)s=fN-1; } const a=num(valorF[s]),b=num(valorF[fN-1]); return a>0?((b/a)-1)*100:null; };
    const _btns=[['1s','1S'],['1m','1M'],['3m','3M'],['6m','6M'],['1y','1A'],['5y','5A'],['max','Máx']].map(rr=>{ const sel=!st.zoom&&st.range===rr[0]; const vp=_rv(rr[0]); const vc=vp==null?'#94a3b8':(vp>=0?'#16a34a':'#dc2626'); const vt=vp==null?'—':((vp>=0?'+':'')+vp.toFixed(1)+'%');
      return `<button type="button" data-evorange="${rr[0]}|${id}" style="display:flex;flex-direction:column;align-items:center;line-height:1.05;padding:2px 8px;min-width:42px;border:1px solid ${sel?'var(--brand)':'var(--line)'};border-radius:7px;background:${sel?'#eff6ff':'#fff'};cursor:pointer;transform:${sel?'scale(1.08)':'none'}"><span style="font-weight:700;font-size:11px;color:${sel?'var(--brand)':'inherit'}">${rr[1]}</span><span style="font-size:9.5px;font-weight:700;color:${vc}">${vt}</span></button>`;
    }).join('');
    let _zvp=null; if(st.zoom){ const _z0=num(valorF[i0]),_z1=num(valorF[i1]); _zvp=_z0>0?((_z1/_z0)-1)*100:null; }
    const _zvt=_zvp==null?'—':((_zvp>=0?'+':'')+_zvp.toFixed(1)+'%'); const _zvc=_zvp==null?'#94a3b8':(_zvp>=0?'#16a34a':'#dc2626');
    const _zc=st.zoom?`<span style="display:inline-flex;align-items:center;gap:4px;background:#eef2ff;color:#3730a3;border-radius:6px;padding:2px 8px;font-size:11px;margin-left:6px">🔍 <input type="date" data-evozfrom="${id}" value="${labF[i0]}" min="${labF[0]}" max="${labF[fN-1]}" title="Inicio del periodo (editable)" style="font-size:10px;padding:1px 3px;border:1px solid #c7d2fe;border-radius:4px;color:#3730a3;background:#fff"> <span>→</span> <input type="date" data-evozto="${id}" value="${labF[i1]}" min="${labF[0]}" max="${labF[fN-1]}" title="Fin del periodo (editable)" style="font-size:10px;padding:1px 3px;border:1px solid #c7d2fe;border-radius:4px;color:#3730a3;background:#fff"> · <b style="color:${_zvc}">${_zvt}</b> <span style="font-size:9.5px">(sin div.)</span> <b data-evozreset="${id}" style="cursor:pointer;margin-left:2px;font-size:12px" title="Reiniciar zoom">✕</b></span>`:'';
    rangeBar=`<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:2px 0 6px">${_btns}${_zc}<span class="muted" style="font-size:10.5px;margin-left:4px">· arrastra en la gráfica para hacer zoom, doble clic reinicia</span></div>`;
  }
  const mt=opts.mt!==undefined?opts.mt:16;
  return `<div style="margin-top:${mt}px">${head}${rangeBar}<div class="evoWrap" style="position:relative">${svg}${tip}</div>${leg}${foot}</div>`; }
// alias de compatibilidad
function evoPanelHTML(reRender){ return evoChartHTML({id:'evoPanel',reRender:reRender,goto:'graficas',ranges:true}); }

function aportValorHTML(reRender){ const _ops2=_allOps().filter(o=>o.fecha).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  const _needP=[...new Set([..._ops2.map(o=>(o.ticker||'').toUpperCase()).filter(Boolean),'IBEX','IBEXTR'])]; const _faltaP=_needP.filter(t=>_precioCache[t]===undefined);
  if(!_ops2.length)return '<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px">Aportado vs valor</div><div class="muted" style="font-size:12px">Sin operaciones.</div></div>';
  if(_faltaP.length){ if(typeof cargarPreciosCartera==='function')cargarPreciosCartera().then(()=>{ if(typeof reRender==='function')reRender(); }); return '<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px">Aportado acumulado vs valor de cartera</div><div class="muted" style="font-size:12px">Cargando cotizaciones…</div></div>'; }
  const priceAt=(t,ms)=>priceAtFB(t,ms);
  const sharesAt=(t,ms)=>{ let sh=0; _ops2.forEach(o=>{ if((o.ticker||'').toUpperCase()===t){ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=ms)sh+=(o.tipo==='venta'?-1:1)*num(o.acciones); } }); return sh; };
  const divEv=[]; const _dvO=DB.dividendos||{}; Object.keys(_dvO).forEach(t=>{ const T=(t||'').toUpperCase(); (_dvO[t]||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  (DB.cerradas||[]).forEach(c=>{ const T=(c.ticker||'').toUpperCase(); (c.divs||[]).forEach(d=>{ if(d.fecha){ const dm=Date.parse(d.fecha+'T00:00:00'); if(!isNaN(dm))divEv.push({ms:dm,eur:sharesAt(T,dm)*num(d.importe)}); } }); });
  const _opSet=new Set(_ops2.map(o=>(o.ticker||"").toUpperCase())); const _dIng=DB.divIngresos||{}; Object.keys(_dIng).forEach(t=>{ if(_opSet.has((t||"").toUpperCase()))return; Object.keys(_dIng[t]||{}).forEach(y=>{ divEv.push({ms:Date.UTC(+y,11,31),eur:num(_dIng[t][y])}); }); });
  divEv.sort((a,b)=>a.ms-b.ms);
  const t0=new Date(Date.parse(_ops2[0].fecha+'T00:00:00')); let yy=t0.getFullYear(),mn2=t0.getMonth(); const now=new Date(); const labels=[],aport=[],valor=[],valdiv=[]; let divAc=0,di=0; const _bsym=_ibexBenchSym(); const _ibexJ=_precioCache[_bsym]; const hayIbex=!!(_ibexJ&&_ibexJ.data&&_ibexJ.data.length); const ibexVal=[];
  // FIX #1 (timing): unidades IBEX compradas al precio del índice del DÍA de cada operación (no a fin de mes). Fallback al primer precio conocido si la op es anterior al histórico.
  const _ibx0=(hayIbex&&_ibexJ.data.length)?num(_ibexJ.data[0][1]):0; const _ibexOps=[]; if(hayIbex){ _ops2.forEach(o=>{ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(isNaN(om))return; const cash=(o.tipo==='venta'?-1:1)*num(o.acciones)*num(o.precio); const ipo=priceRepoAt(_bsym,om)||_ibx0; if(ipo>0&&cash!==0)_ibexOps.push({ms:om,units:cash/ipo}); }); _ibexOps.sort((a,b)=>a.ms-b.ms); }
  let ibexUnits=0,ibexDivCash=0,_ibi=0,_ibexPx=0;
  while(yy<now.getFullYear()||(yy===now.getFullYear()&&mn2<=now.getMonth())){ const cut=Date.UTC(yy,mn2+1,0); const sh={}; let ap=0;
    _ops2.forEach(o=>{ const om=Date.parse((o.fecha||'')+'T00:00:00'); if(om<=cut){ const t=(o.ticker||'').toUpperCase(); const sg=o.tipo==='venta'?-1:1; sh[t]=(sh[t]||0)+sg*num(o.acciones); ap+=sg*num(o.acciones)*num(o.precio); } });
    while(di<divEv.length&&divEv[di].ms<=cut){ divAc+=divEv[di].eur; di++; }
    const isLast=(yy===now.getFullYear()&&mn2===now.getMonth()); const _pxAt=(t)=>{ const T=(t||'').toUpperCase(); if(isLast){ const v=(DB.valores||{})[T]||{}; const lp=num(v.precioActual), lf=(v.precioFecha||''); const pj=_precioCache[T]; let rp=0,rf=''; if(pj&&pj.data&&pj.data.length){ rp=num(pj.data[pj.data.length-1][1]); rf=pj.data[pj.data.length-1][0]; } if(lp>0&&rp>0) return (lf>=rf)?lp:rp; if(rp>0) return rp; if(lp>0) return lp; } return priceAt(t,cut); }; let val=0; Object.keys(sh).forEach(t=>{ if(sh[t]>0.0001)val+=sh[t]*_pxAt(t); });
    labels.push(String(yy).slice(2)+'/'+String(mn2+1).padStart(2,'0')); aport.push(ap); valor.push(val); valdiv.push(val+divAc); if(hayIbex){ const ipx=priceRepoAt(_bsym,cut); while(_ibi<_ibexOps.length&&_ibexOps[_ibi].ms<=cut){ ibexUnits+=_ibexOps[_ibi].units; _ibi++; } if(ipx>0){ _ibexPx=ibexUnits*ipx; if(ibexUnits>0)ibexDivCash+=ibexUnits*ipx*(_ibexAccYield()/12); } ibexVal.push(_ibexPx+ibexDivCash); } mn2++; if(mn2>11){mn2=0;yy++;} }
  const _ser=[{name:'Aportado',color:'#94a3b8',vals:aport}]; if(hayIbex)_ser.push({name:'Si fuera IBEX-35 (c/div)',color:'#f59e0b',vals:ibexVal,dash:'6 4'}); _ser.push({name:'Valor cartera',color:'#2563eb',vals:valor}); _ser.push({name:'Valor + dividendos',color:'#16a34a',vals:valdiv}); return gLines('Aportado vs valor vs valor+dividendos (cotización real)'+(hayIbex?' vs IBEX-35 c/div':''),labels,_ser); }
function renderGraficas(){ const el=$('#grafBody'); if(!el)return; const kp=$('#grafKpis');
  const ys=grafYears(); if(grafYear!=='all' && !ys.includes(grafYear))grafYear=ys[0]||new Date().getFullYear();
  const selEl=$('#grafYear'); if(selEl)selEl.innerHTML='<option value="all"'+(grafYear==='all'?' selected':'')+'>Todos</option>'+ys.map(y=>`<option value="${y}"${y===grafYear?' selected':''}>${y}</option>`).join('');
  const Y=grafYear, MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  window._grafBlk=window._grafBlk||{hogar:true,cartera:false,div:false};
  var _hogarInner='', _carteraInner='', _divInner='', _kAhorro=0,_kTasa=0,_kGasto=0,_kValor=0,_kPl=0,_kDiv=0,_kRpd=0;
  { const isAll=Y==='all'; const yTag=isAll?'Todos':Y; const movs=isAll?(DB.movimientos||[]).filter(m=>m.fecha):(DB.movimientos||[]).filter(m=>m.fecha&&+m.fecha.slice(0,4)===Y); const gasMes=new Array(12).fill(0),ingMes=new Array(12).fill(0);
    movs.forEach(m=>{ const mo=+m.fecha.slice(5,7)-1; if(mo<0||mo>11)return; if(m.tipo==='gasto')gasMes[mo]+=num(m.importe); else if(m.tipo==='ingreso')ingMes[mo]+=num(m.importe); });
    let presMes=0; (DB.presupuesto||[]).filter(p=>pAnio(p)===Y).forEach(p=>{ const c=catById(p.categoriaId); if(c&&c.tipo==='gasto')presMes+=mensual(p); });
    let c1;
    if(isAll){ const _yrs=[...new Set((DB.movimientos||[]).filter(m=>m.fecha).map(m=>+m.fecha.slice(0,4)))].filter(Boolean).sort(); const _gy=_yrs.map(y=>movs.filter(m=>m.tipo==='gasto'&&+m.fecha.slice(0,4)===y).reduce((s,m)=>s+num(m.importe),0)); const _py=_yrs.map(y=>{ let pm=0; (DB.presupuesto||[]).filter(p=>pAnio(p)===y).forEach(p=>{ const c=catById(p.categoriaId); if(c&&c.tipo==='gasto')pm+=mensual(p); }); return pm*12; }); c1=gBars('Gasto real vs presupuesto por año · Todos',_yrs.map(String),[{name:'Gasto real',color:'#dc2626',vals:_gy},{name:'Presupuesto',color:'#94a3b8',vals:_py}]); }
    else c1=gBars('Gasto real vs presupuesto por mes · '+Y,MES,[{name:'Gasto real',color:'#dc2626',vals:gasMes},{name:'Presupuesto',color:'#94a3b8',vals:new Array(12).fill(presMes)}]);
    const porG={}; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const c=catById(m.categoriaId); const g=(c&&c.grupo)||'Otros'; porG[g]=(porG[g]||0)+num(m.importe); });
    const c2=gDonut('Reparto del gasto por grupo · '+yTag,Object.keys(porG).map(g=>({label:g,val:porG[g]})));
    const ah=MES.map((_,i)=>ingMes[i]?((ingMes[i]-gasMes[i])/ingMes[i]*100):0);
    let c3;
    if(isAll){ const _yrs=[...new Set((DB.movimientos||[]).filter(m=>m.fecha).map(m=>+m.fecha.slice(0,4)))].filter(Boolean).sort(); const _ay=_yrs.map(y=>{ let g=0,ing=0; movs.filter(m=>+m.fecha.slice(0,4)===y).forEach(m=>{ if(m.tipo==='gasto')g+=num(m.importe); else if(m.tipo==='ingreso')ing+=num(m.importe); }); return ing?((ing-g)/ing*100):0; }); c3=gLine('Tasa de ahorro por año % · Todos',_yrs.map(String),_ay,{pct:true,color:'#16a34a'}); }
    else c3=gLine('Tasa de ahorro mensual % · '+Y,MES,ah,{pct:true,color:'#16a34a'});
    const _gcat={}; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const c=catById(m.categoriaId); const _n=(c&&c.nombre)||'Otros'; _gcat[_n]=(_gcat[_n]||0)+num(m.importe); }); const cTop=gHBars('Top categorías de gasto · '+yTag,Object.keys(_gcat).map(k=>({label:k,val:_gcat[k]})).sort((a,b)=>b.val-a.val),{top:10}); const _gt={Carlos:0,Susana:0}; let _sin=0; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const _tt=m.titular||''; const _v=num(m.importe); if(_tt==='Carlos')_gt.Carlos+=_v; else if(_tt==='Susana')_gt.Susana+=_v; else if(_tt==='Dos'){ _gt.Carlos+=_v/2; _gt.Susana+=_v/2; } else _sin+=_v; }); const _itit=[{label:'Carlos',val:_gt.Carlos},{label:'Susana',val:_gt.Susana}]; if(_sin>0)_itit.push({label:'Sin asignar',val:_sin}); const cTit=gDonut('Reparto del gasto por titular · '+yTag+' (Dos al 50%)',_itit); const _gcom={}; movs.filter(m=>m.tipo==='gasto').forEach(m=>{ const _co=(m.comercio||'').trim()||'(sin comercio)'; _gcom[_co]=(_gcom[_co]||0)+num(m.importe); }); const cCom=gHBars('Top comercios de gasto · '+yTag,Object.keys(_gcom).map(k=>({label:k,val:_gcom[k]})).sort((a,b)=>b.val-a.val),{top:10});
    _kGasto=gasMes.reduce((a,b)=>a+b,0); const _ingTot=ingMes.reduce((a,b)=>a+b,0); _kAhorro=_ingTot-_kGasto; _kTasa=_ingTot?_kAhorro/_ingTot*100:0;
    _hogarInner=`<div class="graf-grid">${c1}${c2}${c3}${cTop}${cTit}${cCom}</div>`; }
  { const snaps=(typeof patSnaps==='function'?patSnaps():[]); const labels=snaps.map(s=>(s.fecha||'').slice(0,7));
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
    const cAport=(typeof evoChartHTML==='function')?evoChartHTML({id:'evoGraf',reRender:renderGraficas,ibex:true,ranges:true}):aportValorHTML(renderGraficas);
    /* Reparto del dividendo bruto por empresa (año en curso): acciones actuales × DPA proyectado/registrado. */
    const _dpsNow=(t)=>{ let d=(typeof evoDpaProyectado==='function')?evoDpaProyectado(t,nowY):null; if(d==null) d=num(((DB.divPorAccion||{})[t]||{})[nowY]); return num(d); };
    const _divEmp={}; pos.forEach(p=>{ const _t=(p.ticker||'').toUpperCase(); const _v=num(p.acciones)*_dpsNow(_t); if(_v>0) _divEmp[_t]=(_divEmp[_t]||0)+_v; });
    const cDivEmp=Object.keys(_divEmp).length?gDonut('Reparto del dividendo bruto por empresa · '+nowY,Object.keys(_divEmp).map(_t=>({label:_t,val:_divEmp[_t]})),{size:200}):'<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">Reparto del dividendo por empresa</div><div class="muted" style="font-size:12px">Sin dividendo estimado para '+nowY+' en las empresas en cartera.</div></div>';
    let cCob='';
    if(typeof coberturaDivGastos==='function'){ const F=coberturaDivGastos(); if(F&&F.cobertura!=null&&F.years&&F.years.length){ cCob=gLines('Dividendo bruto previsto vs gasto anual'+(F.anioIndep?' · independencia en '+F.anioIndep:' · no alcanzado'),F.years.map(String),[{name:'Dividendo bruto',color:'#16a34a',vals:F.divSerie},{name:'Gasto anual',color:'#dc2626',vals:F.gastoSerie}],{h:300}); } else cCob='<div class="card" style="margin:0"><div style="font-weight:700;font-size:13px;margin-bottom:4px">Independencia (dividendos vs gastos)</div><div class="muted" style="font-size:12px">Sin gasto registrado o sin dividendos previstos.</div></div>'; }
    let _vv=0,_cc=0; pos.forEach(p=>{ _vv+=p.acciones*num(p.precioActual); _cc+=p.acciones*num(p.precioCompra); }); _kValor=_vv; _kPl=_cc?((_vv-_cc)/_cc*100):0; _kDiv=(typeof simYearTotal==='function'?simYearTotal(nowY):0); _kRpd=_vv?_kDiv/_vv*100:0;
    _carteraInner=`<div class="graf-big">${cAport}</div><div class="graf-big">${c4}</div><div class="graf-grid">${c5}${c5b}${cCap}${cRent}${cObj}</div>`;
    _divInner=`<div class="graf-grid">${c6}${c7}${cBola}${cYoC}${cRPD}${cDivEmp}${cCob}</div>`; }
  if(kp){ const _yl=(Y==='all'?'histórico':Y); kp.innerHTML=''
    +`<div class="k hero"><div class="l">Ahorro del año</div><div class="v">${fmt(_kAhorro)}</div><div class="p">tasa ${_kTasa.toFixed(0)}% · ${_yl}</div></div>`
    +`<div class="k"><div class="l">Gasto del año</div><div class="v">${fmt(_kGasto)}</div><div class="p">${_yl}</div></div>`
    +`<div class="k"><div class="l">Valor cartera</div><div class="v">${fmt(_kValor)}</div><div class="p">${(_kPl>=0?'+':'')+_kPl.toFixed(1)}% s/coste</div></div>`
    +`<div class="k"><div class="l">Dividendo bruto/año</div><div class="v">${fmt(_kDiv)}</div><div class="p">RPD ${_kRpd.toFixed(1)}%</div></div>`; }
  const BB=(key,icon,title,sum,inner)=>{ const op=window._grafBlk[key]?' open':''; return `<div class="pos-blk${op}" data-grafblk="${key}"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">${icon} ${title}</span><span class="bsum">${sum}</span></div><div class="pos-blk-b"><div class="blk-pad">${inner}</div></div></div>`; };
  el.innerHTML=BB('hogar','🏠','Hogar','gasto · ahorro · categorías · titular · comercios',_hogarInner)
    +BB('cartera','💼','Cartera y patrimonio','composición · rentabilidad · aportado vs IBEX',_carteraInner)
    +BB('div','💰','Dividendos e ingresos pasivos','por año/mes · bola de nieve · YoC · RPD · independencia',_divInner);
  if(!el._grafBlkBound){ el._grafBlkBound=true; el.addEventListener('click',function(e){ if(e.target.closest('[data-evorange],[data-evozreset],[data-ficha],[data-goto],button,select,input,a'))return; var h=e.target.closest('.pos-blk-h'); if(h){ var b=h.parentElement; b.classList.toggle('open'); var k=b.getAttribute('data-grafblk'); if(k){window._grafBlk[k]=b.classList.contains('open');} } }); }
}
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='grafYear'){ grafYear=(e.target.value==='all')?'all':+e.target.value; renderGraficas(); } });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('button[data-view="graficas"]'); if(b&&typeof renderGraficas==='function')setTimeout(renderGraficas,0); });
function proxRenov(p){ if(!p||!p.renovacion)return null; const base=new Date(p.renovacion+'T00:00:00'); if(isNaN(base.getTime()))return null; const today=new Date(); today.setHours(0,0,0,0); const f=(p.frecuencia||'').toLowerCase(); const stepM=f==='mensual'?1:(f==='bianual'?24:(f==='anual'?12:0)); let d=new Date(base); if(stepM>0){ let g=0; while(d<today&&g<2000){ d.setMonth(d.getMonth()+stepM); g++; } } return d; }
function renovList(maxDias){ const out=[]; const seen={}; const today=new Date(); today.setHours(0,0,0,0); (DB.presupuesto||[]).forEach(p=>{ if(!p.renovacion)return; const k=p.categoriaId+'|'+p.renovacion; if(seen[k])return; seen[k]=1; const d=proxRenov(p); if(!d)return; const dias=Math.round((d-today)/86400000); if(maxDias!=null&&dias>maxDias)return; const c=(typeof catById==='function')?catById(p.categoriaId):null; out.push({nombre:(c&&c.nombre)||'—',grupo:(c&&c.grupo)||'',importe:num(p.importe),frec:p.frecuencia||'',metodo:p.metodoPago||'',fecha:d,dias}); }); out.sort((a,b)=>a.fecha-b.fecha); return out; }
function renderRenov(){ const el=$('#presRenov'); if(!el)return; const list=renovList(null); if(!list.length){ el.innerHTML=''; return; }
  const rows=list.map(r=>{ const cls=(r.dias<=7)?'r':(r.dias<=30?'a':''); const dtxt=r.dias<0?('vencida '+(-r.dias)+'d'):(r.dias===0?'hoy':('en '+r.dias+' d')); const f=r.fecha; const fs=String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0')+'/'+f.getFullYear();
    return `<tr><td>${r.nombre}</td><td class="muted">${r.grupo}</td><td class="num">${fmt(r.importe)}</td><td>${r.frec}</td><td>${r.metodo||'<span class="muted">—</span>'}</td><td>${fs}</td><td><span class="pill ${cls}">${dtxt}</span></td></tr>`; }).join('');
  el.innerHTML=`<h3 style="margin:0 0 6px;font-size:14px">Próximas renovaciones y pagos</h3><div class="sub" style="margin-bottom:6px">De las partidas del Presupuesto con fecha de renovación. Rojo = vencida o ≤7 días · ámbar = ≤30 días.</div><div style="overflow:auto"><table><thead><tr><th>Concepto</th><th>Grupo</th><th class="num">Importe</th><th>Frecuencia</th><th>Método</th><th>Próxima</th><th>Aviso</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ===== Proyección con incertidumbre (Monte Carlo) =====
   Simula el valor de la cartera con rendimiento medio = crecCartera y volatilidad histórica
   (del panel de Riesgo). Bandas p10/p50/p90 sobre patrimonio y probabilidad de alcanzar una meta. */
function _mcNormal(){ let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function _mcBandSVG(years,p10,p50,p90,det,target){
  const W=700,H=260,padL=54,padR=14,padT=12,padB=26; const n=years.length; if(n<2)return '';
  const allV=p90.concat(det,[target]); let vmax=Math.max.apply(null,allV); let vmin=Math.min.apply(null,p10.concat([0])); if(vmin>0)vmin=0; if(vmax<=vmin)vmax=vmin+1;
  const x=i=> padL+(W-padL-padR)*(i/(n-1));
  const y=v=> padT+(H-padT-padB)*(1-(v-vmin)/(vmax-vmin));
  const line=arr=> arr.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  const bandPts=p90.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ')+' '+p10.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).reverse().join(' ');
  const fmtK=v=> Math.abs(v)>=1000?(Math.round(v/1000)+'k'):String(Math.round(v));
  let yl=''; const ticks=4; for(let k=0;k<=ticks;k++){ const v=vmin+(vmax-vmin)*k/ticks; const yy=y(v); yl+=`<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W-padR}" y2="${yy.toFixed(1)}" stroke="#eef2f7"/><text x="${padL-6}" y="${(yy+3).toFixed(1)}" text-anchor="end" font-size="10" fill="#94a3b8">${fmtK(v)}</text>`; }
  let xl=''; [0,Math.floor((n-1)/2),n-1].forEach(i=>{ xl+=`<text x="${x(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="#94a3b8">${years[i]}</text>`; });
  const tY=y(target); const tgt=(target>=vmin&&target<=vmax)?`<line x1="${padL}" y1="${tY.toFixed(1)}" x2="${W-padR}" y2="${tY.toFixed(1)}" stroke="#16a34a" stroke-width="1.2" stroke-dasharray="4 3"/><text x="${(W-padR).toFixed(1)}" y="${(tY-4).toFixed(1)}" text-anchor="end" font-size="10" fill="#16a34a">objetivo ${fmtK(target)}</text>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${yl}<polygon points="${bandPts}" fill="#93c5fd" fill-opacity="0.35" stroke="none"/><path d="${line(p90)}" fill="none" stroke="#93c5fd" stroke-width="1"/><path d="${line(p10)}" fill="none" stroke="#93c5fd" stroke-width="1"/><path d="${line(p50)}" fill="none" stroke="#1d4ed8" stroke-width="1.9"/><path d="${line(det)}" fill="none" stroke="#64748b" stroke-width="1.1" stroke-dasharray="5 3"/>${tgt}${xl}</svg>`;
}
function renderProyMonteCarlo(){
  const el=document.getElementById('proyMC'); if(!el)return;
  const _pv=document.getElementById('view-proyeccion'); if(_pv && !_pv.classList.contains('active'))return; /* solo si la pestaña está visible (riesgoData es pesado) */
  if(typeof computeProy!=='function'||!DB.config||!DB.config.proyeccion){ el.innerHTML='<div class="muted" style="font-size:12px">Configura la Proyección primero.</div>'; return; }
  const c=DB.config.proyeccion; const base=computeProy(c); if(!base||!base.length){ el.innerHTML=''; return; }
  const card=(l,v,cls)=>`<div class="card"><div class="lbl">${l}</div><div class="val ${cls||''}">${v}</div></div>`;
  const mu=num(c.crecCartera)||0.04; let sigma=null,sigmaSrc='';
  try{ if(typeof riesgoData==='function'){ const R=riesgoData(renderProyMonteCarlo); if(R&&R.ok&&R.volPort>0){ sigma=R.volPort; sigmaSrc='histórica de tu cartera'; } else if(R&&R.loading){ sigma=num(c.mcVol)||0.18; sigmaSrc='estimada '+(sigma*100).toFixed(0)+'% (afinando con tu histórico al cargar cotizaciones…)'; } } }catch(e){}
  if(sigma==null){ sigma=num(c.mcVol)||0.18; sigmaSrc='estimada '+(sigma*100).toFixed(0)+'%'; }
  const years=base.map(r=>r.anio); const S=base.map(r=>num(r.aInversion)); const Ef=base.map(r=>num(r.efectivo));
  const C0=num(c.carteraInicial); const N=years.length; const M=1000;
  const paths=[]; for(let m=0;m<M;m++){ let C=C0; const arr=[C]; for(let i=1;i<N;i++){ const r=mu+sigma*_mcNormal(); C=C*(1+r)+num(S[i-1]); if(C<0)C=0; arr.push(C); } paths.push(arr); }
  const pctl=(sorted,p)=>{ const idx=Math.min(sorted.length-1,Math.max(0,Math.round(p*(sorted.length-1)))); return sorted[idx]; };
  const p10=[],p50=[],p90=[],det=[]; for(let i=0;i<N;i++){ const col=paths.map(pp=>pp[i]+Ef[i]).sort((a,b)=>a-b); p10.push(pctl(col,0.10)); p50.push(pctl(col,0.50)); p90.push(pctl(col,0.90)); det.push(num(base[i].patrimonio)); }
  const defObj=Math.round((det[N-1]||p50[N-1])/10000)*10000; let target=num(c.mcObjetivo); if(!(target>0))target=defObj;
  const finalCol=paths.map(pp=>pp[N-1]+Ef[N-1]); const probFinal=finalCol.filter(v=>v>=target).length/M;
  let anioMed=null; for(let i=0;i<N;i++){ if(p50[i]>=target){ anioMed=years[i]; break; } }
  const _intro=`<div class="mc-intro">En vez de suponer que tu cartera crece <b>exactamente</b> el mismo % cada año (algo que nunca pasa en la realidad), esta simulación genera <b>${M} futuros posibles</b>. En cada uno, la rentabilidad de cada año se <b>sortea al azar</b> alrededor de tu rendimiento medio (${(mu*100).toFixed(1)}%/año), con la <b>volatilidad</b> ${sigmaSrc}. Así no ves un solo número, sino <b>el abanico de resultados probables</b> y <b>cómo de seguro</b> es tu plan.</div>`;
  const mck=(l,v,exp,cls)=>`<div class="mck"><div class="l">${l}</div><div class="v ${cls||''}">${v}</div><div class="exp">${exp}</div></div>`;
  const kb=`<div class="mckpis">`
    +mck('Mediana (p50) '+years[N-1],fmt(p50[N-1]),'El escenario «del medio»: la mitad de los '+M+' futuros acaba por encima y la mitad por debajo. Es tu resultado más representativo (mejor que la media, que la disparan los extremos).')
    +mck('Rango p10–p90 '+years[N-1],fmt(p10[N-1])+' – '+fmt(p90[N-1]),'El 80% central de los escenarios cae aquí. Solo 1 de cada 10 futuros termina peor que el p10, y solo 1 de cada 10 mejor que el p90. Cuanto más ancho, más incertidumbre.')
    +mck('Prob. ≥ objetivo',(probFinal*100).toFixed(0)+'%','Porcentaje de los '+M+' escenarios que llegan a tu patrimonio objetivo al final del horizonte. Por encima del 70% el plan es robusto; por debajo del 40%, arriesgado.',probFinal>=0.7?'pos':(probFinal<0.4?'neg':''))
    +mck('Volatilidad usada',(sigma*100).toFixed(0)+'%','Cuánto oscila tu cartera de un año a otro (desviación típica anual). Se toma de la volatilidad '+sigmaSrc+'. A más volatilidad, más ancho el abanico de resultados.')
    +`</div>`;
  const ctrl=`<div class="mc-ctrl"><label>🎯 Patrimonio objetivo € <input type="number" step="10000" id="mcObjetivo" value="${Math.round(target)}"></label><span class="muted" style="font-size:12px">${anioMed?('La mediana alcanza el objetivo en <b>'+anioMed+'</b>'):'La mediana no alcanza el objetivo en el horizonte'}</span></div>`;
  const legend=`<div class="mc-legend"><span><i style="border-color:#2563eb"></i>Mediana (p50)</span><span><i style="border-color:#93c5fd;border-top-width:9px"></i>Banda p10–p90 (80% central)</span><span><i style="border-color:#94a3b8;border-top-style:dashed"></i>Escenario base</span><span><i style="border-color:#16a34a;border-top-style:dashed"></i>Objetivo</span></div>`;
  el.innerHTML=_intro+kb+ctrl+_mcBandSVG(years,p10,p50,p90,det,target)+legend+`<div class="mc-note">${M} simulaciones. Rendimiento medio anual ${(mu*100).toFixed(1)}% (tu «revalorización de cartera» de la Hipótesis Inicial) y volatilidad ${sigmaSrc}. La banda azul es el 80% central de escenarios (p10–p90), la línea azul la mediana (p50) y la gris discontinua tu escenario base. Incluye tus aportaciones anuales y el efectivo previsto. Es una simulación estadística, <b>no una garantía</b>.</div>`;
  { const _o=document.getElementById('mcObjetivo'); if(_o)_o.addEventListener('change',()=>{ DB.config.proyeccion.mcObjetivo=Math.max(0,num(_o.value)); if(typeof scheduleSave==='function')scheduleSave(); renderProyMonteCarlo(); }); }
}
