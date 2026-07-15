/* ===== 17-escenarios.js — Escenarios de cartera (ficha 14) =====
   Laboratorio de shocks macro: 11 factores en valores reales, presets históricos
   + aleatorio, respuesta de la cartera (6 KPIs), mapa de calor empresa×factor y
   coberturas. Lee pesos y dividendos EN VIVO del DB; la matriz de sensibilidades
   está calibrada (informes 2024/25) y las empresas no listadas heredan de su
   arquetipo (DB.universo). ================================================== */
(function(){
 const VARS=[
  {id:'BOLSA',lab:'Bolsa / IBEX (var. anual)',min:-55,neu:0,max:35,u:'%',d:0},
  {id:'TIPOS',lab:'Tipos oficiales (BCE)',min:-0.75,neu:2,max:5.5,u:'%',d:2},
  {id:'CRED', lab:'Prima de riesgo / crédito',min:0.3,neu:1.0,max:6.0,u:'%',d:1},
  {id:'PIB',  lab:'PIB España',min:-6,neu:1.5,max:5,u:'%',d:1},
  {id:'CONSD',lab:'Consumo discrecional',min:-20,neu:1,max:12,u:'%',d:0},
  {id:'CONSB',lab:'Consumo defensivo',min:-6,neu:1,max:5,u:'%',d:0},
  {id:'EUR',  lab:'EUR/USD',min:1.00,neu:1.15,max:1.70,u:'',d:2},
  {id:'LATAM',lab:'Divisas LatAm (fuerza)',min:-50,neu:0,max:30,u:'%',d:0},
  {id:'BRENT',lab:'Petróleo Brent',min:15,neu:75,max:150,u:' $',d:0},
  {id:'GAS',  lab:'Gas TTF',min:3,neu:25,max:345,u:' €',d:0},
  {id:'REG',  lab:'Regulación energética ES (redes/gravamen)',min:4.5,neu:6.25,max:8,u:'%',d:2},
 ];
 const V=Object.fromEntries(VARS.map(v=>[v.id,v]));
 const PRESETS={
  lehman:{BOLSA:-45,TIPOS:1.5,CRED:3.5,PIB:-3.5,CONSD:-12,CONSB:-1,EUR:1.25,LATAM:-25,BRENT:40,GAS:18,REG:6.25,
    desc:'Lehman (2008-09): IBEX ~−45%, prima de riesgo/crédito ~3,5%, tipos recortados a 1,5%, recesión (−3,5% PIB, discrecional −12%), euro 1,25, emergentes −25%, Brent 147→40 $, gas a la baja.'},
  covid:{BOLSA:-32,TIPOS:0,CRED:3.0,PIB:-11,CONSD:-25,CONSB:2,EUR:1.10,LATAM:-30,BRENT:20,GAS:6,REG:6.25,
    desc:'COVID (mar-2020): desplome relámpago (−32%), PIB −11%, discrecional hundido y defensivo resistente, tipos en cero, crédito tensionado, euro 1,10, emergentes −30%, Brent 20 $, gas barato.'},
  guerra:{BOLSA:-12,TIPOS:3.5,CRED:2.2,PIB:0,CONSD:-8,CONSB:-1,EUR:1.02,LATAM:10,BRENT:115,GAS:250,REG:5.5,
    desc:'Guerra en Ucrania (2022): shock energético — gas 250 €, Brent 115 $, inflación que sube tipos (3,5%), euro a la par, emergentes exportadores al alza, gravamen energético y consumo apretado.'},
  recesion:{BOLSA:-25,TIPOS:1.0,CRED:2.0,PIB:-2.5,CONSD:-12,CONSB:-1,EUR:1.10,LATAM:-15,BRENT:50,GAS:18,REG:6.25,
    desc:'Recesión clásica: bolsa −25%, PIB −2,5%, discrecional −12% y defensivo resistente, tipos a 1%, crédito algo tensionado, petróleo a la baja (50 $).'},
  materias:{BOLSA:-5,TIPOS:3.5,CRED:1.7,PIB:0,CONSD:-6,CONSB:-2,EUR:1.08,LATAM:12,BRENT:130,GAS:120,REG:5.75,
    desc:'Escasez de materias primas: petróleo y gas caros (130 $ / 120 €), inflación y tipos altos, euro débil, emergentes exportadores ganan, industria y consumo apretados. Favorece a las petroleras.'},
  favorable:{BOLSA:12,TIPOS:2,CRED:0.8,PIB:2.5,CONSD:4,CONSB:2,EUR:1.15,LATAM:8,BRENT:75,GAS:25,REG:6.75,
    desc:'Expansión moderada y sana: bolsa +12%, PIB +2,5%, consumo al alza, crédito holgado, tipos y energía en niveles normales, regulación algo favorable. Viento de cola suave para toda la cartera.'},
  bonanza:{BOLSA:25,TIPOS:2.5,CRED:0.6,PIB:4,CONSD:8,CONSB:3,EUR:1.15,LATAM:20,BRENT:70,GAS:20,REG:7,
    desc:'El mejor escenario posible — crecimiento, paz y bonanza: bolsa en máximos (+25%), crecimiento fuerte (PIB +4%, consumo disparado), crédito barato y abundante, tipos sanos, euro estable, emergentes fuertes, energía barata (Brent 70 $, gas 20 €) y regulación favorable. Casi todo suma.'},
  normal:{BOLSA:0,TIPOS:2,CRED:1.0,PIB:1.5,CONSD:1,CONSB:1,EUR:1.15,LATAM:0,BRENT:75,GAS:25,REG:6.25,desc:'Todo en su nivel normal: ningún factor aprieta.'}
 };
 /* Matriz calibrada (informes 2024/25). Score = efecto si el factor SUBE, −2..+2. */
 const SENS={
  IBE:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:0,CONSD:0,CONSB:0,EUR:-1,LATAM:1,BRENT:0,GAS:1,REG:1},
  SAN:{BOLSA:2,TIPOS:2,CRED:-2,PIB:2,CONSD:0,CONSB:0,EUR:-1,LATAM:2,BRENT:0,GAS:0,REG:0},
  REP:{BOLSA:2,TIPOS:-1,CRED:-1,PIB:2,CONSD:0,CONSB:0,EUR:-1,LATAM:1,BRENT:2,GAS:1,REG:1},
  MAP:{BOLSA:1,TIPOS:1,CRED:-1,PIB:1,CONSD:0,CONSB:0,EUR:-1,LATAM:2,BRENT:0,GAS:0,REG:0},
  ELE:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:0,CONSD:0,CONSB:0,EUR:0,LATAM:0,BRENT:0,GAS:1,REG:2},
  LOG:{BOLSA:1,TIPOS:1,CRED:0,PIB:1,CONSD:1,CONSB:2,EUR:0,LATAM:0,BRENT:-1,GAS:0,REG:0},
  NTGY:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:0,CONSD:0,CONSB:0,EUR:0,LATAM:1,BRENT:0,GAS:0,REG:2},
  A3M:{BOLSA:2,TIPOS:1,CRED:0,PIB:2,CONSD:2,CONSB:0,EUR:0,LATAM:0,BRENT:0,GAS:0,REG:0},
  VIS:{BOLSA:1,TIPOS:0,CRED:0,PIB:0,CONSD:0,CONSB:2,EUR:-1,LATAM:1,BRENT:0,GAS:-1,REG:0},
  ITX:{BOLSA:1,TIPOS:1,CRED:0,PIB:1,CONSD:2,CONSB:0,EUR:-1,LATAM:1,BRENT:-1,GAS:0,REG:0},
  EBRO:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:0,CONSD:0,CONSB:2,EUR:-1,LATAM:0,BRENT:0,GAS:-1,REG:0},
  VID:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:1,CONSD:0,CONSB:1,EUR:0,LATAM:1,BRENT:0,GAS:-2,REG:0},
  BKT:{BOLSA:2,TIPOS:2,CRED:-2,PIB:2,CONSD:0,CONSB:0,EUR:0,LATAM:0,BRENT:0,GAS:0,REG:0}
 };
 /* Plantillas por arquetipo (fallback para empresas no calibradas aún). */
 const ARQ=[
  {re:/financ|banc|segur/, s:{BOLSA:2,TIPOS:2,CRED:-2,PIB:2,CONSD:0,CONSB:0,EUR:-1,LATAM:1,BRENT:0,GAS:0,REG:0}},
  {re:/regulad|concesion|utility/, s:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:0,CONSD:0,CONSB:0,EUR:0,LATAM:1,BRENT:0,GAS:1,REG:1}},
  {re:/commodity|petrol|energ/, s:{BOLSA:2,TIPOS:-1,CRED:-1,PIB:2,CONSD:0,CONSB:0,EUR:-1,LATAM:1,BRENT:2,GAS:1,REG:1}},
  {re:/industr/, s:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:1,CONSD:0,CONSB:1,EUR:-1,LATAM:1,BRENT:0,GAS:-2,REG:0}},
  {re:/aliment|defensiv|salud/, s:{BOLSA:1,TIPOS:-1,CRED:-1,PIB:0,CONSD:0,CONSB:2,EUR:-1,LATAM:0,BRENT:0,GAS:-1,REG:0}},
  {re:/medio|public/, s:{BOLSA:2,TIPOS:1,CRED:0,PIB:2,CONSD:2,CONSB:0,EUR:0,LATAM:0,BRENT:0,GAS:0,REG:0}},
  {re:/distribuc|logist/, s:{BOLSA:1,TIPOS:1,CRED:0,PIB:1,CONSD:1,CONSB:2,EUR:0,LATAM:0,BRENT:-1,GAS:0,REG:0}},
  {re:/consumo|retail|escalable/, s:{BOLSA:1,TIPOS:1,CRED:0,PIB:1,CONSD:2,CONSB:0,EUR:-1,LATAM:1,BRENT:0,GAS:0,REG:0}},
  {re:/inmobil/, s:{BOLSA:1,TIPOS:-2,CRED:-2,PIB:1,CONSD:0,CONSB:0,EUR:0,LATAM:0,BRENT:0,GAS:0,REG:0}}
 ];
 const SCALE=7.5, K_CAIDA=0.75;
 let escVal=null; // valores reales actuales por factor

 function _num(x){ return (typeof num==='function')?num(x):(parseFloat(x)||0); }
 function sensFor(t){ t=(t||'').toUpperCase(); if(SENS[t])return SENS[t];
   const arq=(((typeof DB!=='undefined'&&DB.universo&&DB.universo[t]&&DB.universo[t].arquetipo)||'')+'').toLowerCase();
   for(const a of ARQ){ if(a.re.test(arq))return a.s; } return null; }
 function heldRows(){
   const agg={};
   const pos=(typeof invPositions==='function')?invPositions():[];
   pos.forEach(p=>{ if(_num(p.acciones)>0.0001){ const t=(p.ticker||'').toUpperCase();
     const a=agg[t]=agg[t]||{t,n:p.nombre||t,mv:0,dv:0}; a.mv+=_num(p.acciones)*_num(p.precioActual); a.dv+=_num(p.acciones)*_num(p.divAccion); }});
   const tot=Object.values(agg).reduce((s,a)=>s+a.mv,0)||1;
   return Object.values(agg).map(a=>({t:a.t,n:a.n,w:a.mv/tot,dv:a.dv,
     tier:((typeof DB!=='undefined'&&DB.planTipo&&DB.planTipo[a.t])||''),s:sensFor(a.t)})).filter(x=>x.s);
 }
 function candRows(heldSet){
   const out=[];
   ((typeof DB!=='undefined'&&DB.analisis)||[]).forEach(a=>{ const t=(a.ticker||'').toUpperCase();
     if(!t||heldSet.has(t))return; const s=sensFor(t); if(!s)return;
     out.push({t,n:a.nombre||t,s}); });
   const seen=new Set(); return out.filter(x=>seen.has(x.t)?false:(seen.add(x.t),true));
 }
 function inten(id){ const v=V[id],x=escVal[id]; if(x==null)return 0;
   const i=x>=v.neu?(x-v.neu)/(v.max-v.neu):(x-v.neu)/(v.neu-v.min); return Math.max(-1,Math.min(1,i)); }
 function fmtV(id,x){ const v=V[id]; const sgn=(x>0&&/^(PIB|CONSD|CONSB|BOLSA|LATAM)$/.test(id))?'+':'';
   return sgn+x.toFixed(v.d).replace('.',',')+v.u; }
 function idx(s){ let sc=0; VARS.forEach(v=>sc+=(s[v.id]||0)*inten(v.id)); return Math.max(-100,Math.min(100,Math.round(sc/SCALE*100))); }
 function colFor(i){ if(i<=-1){const a=Math.min(1,-i/100);return `rgb(220,${Math.round(80+(1-a)*150)},${Math.round(80+(1-a)*150)})`;}
   if(i>=1){const a=Math.min(1,i/100);return `rgb(${Math.round(90+(1-a)*140)},180,${Math.round(90+(1-a)*100)})`;} return '#cbd5e1'; }
 function bar(i){ const w=Math.abs(i)/2,side=i<0?`right:50%;width:${w}%`:`left:50%;width:${w}%`;
   return `<div class="esc-bar"><div class="esc-mid"></div><div class="esc-fill" style="${side};background:${colFor(i)}"></div></div>`; }
 function heatCell(x){ if(Math.abs(x)<0.05)return '<td style="text-align:center;color:#cbd5e1">·</td>';
   const a=Math.min(1,Math.abs(x)/1.6); const bg=x<0?`rgba(220,38,38,${(0.12+a*0.6).toFixed(2)})`:`rgba(22,163,74,${(0.12+a*0.6).toFixed(2)})`;
   return `<td style="text-align:center;background:${bg};font-weight:600;color:${a>0.62?'#fff':'#0f172a'}">${x>0?'+':''}${x.toFixed(1)}</td>`; }

 function escRenderSliders(){
   const box=document.getElementById('escSliders'); if(!box)return; box.innerHTML='';
   VARS.forEach(v=>{ const zfn=(v.neu-v.min)/(v.max-v.min)*100, zf=zfn.toFixed(1), ztx=zfn<12?'0':zfn>88?'-100%':'-50%';
     const d=document.createElement('div'); d.className='esc-sl';
     d.innerHTML=`<div class="esc-lab"><span>${v.lab}</span><span class="esc-val" id="escv_${v.id}">${fmtV(v.id,escVal[v.id])}</span></div>
       <div class="esc-track"><div class="esc-zero" style="left:${zf}%"></div><div class="esc-zlbl" style="left:${zf}%;transform:translateX(${ztx})">${fmtV(v.id,v.neu)}</div>
       <input type="range" min="0" max="1000" step="1" value="${Math.round((escVal[v.id]-v.min)/(v.max-v.min)*1000)}" data-v="${v.id}"></div>
       <div class="esc-ends"><span>${fmtV(v.id,v.min)}</span><span>${fmtV(v.id,v.max)}</span></div>`;
     box.appendChild(d); });
   box.querySelectorAll('input[type=range]').forEach(r=>r.addEventListener('input',e=>{
     const v=V[e.target.dataset.v], x=v.min+(+e.target.value)/1000*(v.max-v.min); escVal[v.id]=x;
     document.getElementById('escv_'+v.id).textContent=fmtV(v.id,x);
     document.querySelectorAll('#escChips [data-preset]').forEach(c=>c.classList.remove('on')); escRender(); }));
 }
 function escApplyPreset(p){
   if(p==='aleatorio'){ VARS.forEach(v=>{ const r=(V[v.id].max-V[v.id].min); escVal[v.id]=V[v.id].min+Math.random()*r; });
     document.getElementById('escPresetDesc').textContent='🎲 Escenario aleatorio — púlsalo otra vez para generar otro y descubrir combinaciones inesperadas.';
     escRenderSliders(); escRender(); return; }
   const P=PRESETS[p]; if(!P)return; VARS.forEach(v=>escVal[v.id]=P[v.id]);
   document.getElementById('escPresetDesc').textContent=P.desc||''; escRenderSliders(); escRender();
 }
 function escRender(){
   const H=heldRows(); const rows=H.map(c=>({c,i:idx(c.s)})).sort((a,b)=>a.i-b.i);
   const tb=document.querySelector('#escTbl tbody'); if(tb)tb.innerHTML='';
   let net=0,contra=0,alarma=0,caida=0,totDiv=0,divRisk=0,negSum=0,topD=null;
   H.forEach(c=>totDiv+=c.dv);
   const tierCls={joya:'esc-t-joya',nucleo:'esc-t-nucleo',mantener:'esc-t-mantener'};
   rows.forEach(({c,i})=>{ net+=c.w*i; if(i<0)contra+=c.w; if(i<=-60)alarma++;
     caida+=c.w*Math.max(-80,Math.min(40,i*K_CAIDA)); divRisk+=c.dv*Math.max(0,Math.min(1,(-i-30)/40));
     const ct=c.w*i; if(ct<0)negSum+=ct; if(topD===null||ct<topD.c)topD={t:c.t,c:ct};
     if(tb)tb.innerHTML+=`<tr><td><b>${c.t}</b> <span class="esc-mut">${c.n}</span></td>
       <td>${c.tier?`<span class="esc-tier ${tierCls[c.tier]||''}">${c.tier}</span>`:''}</td><td class="esc-num">${(c.w*100).toFixed(1)}%</td>
       <td>${bar(i)}</td><td class="esc-num" style="color:${i<0?'#dc2626':i>0?'#16a34a':'#64748b'};font-weight:700">${i>0?'+':''}${i}</td>
       <td>${i<=-60?'<span class="esc-pill">⚠ pre-mortem</span>':''}</td></tr>`; });
   net=Math.round(net); caida=Math.round(caida);
   const divPct=totDiv>0?Math.round(divRisk/totDiv*100):0;
   const dmg=(negSum<0&&topD&&topD.c<0)?Math.round(topD.c/negSum*100):0;
   const g=document.getElementById('escGauge');
   if(g)g.innerHTML=
     kpi('Caída estimada de la cartera',(caida>0?'+':'')+caida+'%',caida<0?'#dc2626':caida>0?'#16a34a':'#64748b','orientativa')+
     kpi('Inclinación neta',(net>0?'+':'')+net,net<0?'#dc2626':net>0?'#16a34a':'#64748b','índice −100…+100')+
     kpi('% cartera en contra',Math.round(contra*100)+'%',contra>0.5?'#dc2626':'#d97706','del valor')+
     kpi('Dividendo en riesgo',divPct+'%',divPct>=30?'#dc2626':divPct>=10?'#d97706':'#16a34a','de tus '+Math.round(totDiv).toLocaleString('es')+' €/año')+
     kpi('Pre-mortems en alarma',alarma+' / '+H.length,alarma>0?'#dc2626':'#16a34a','tesis que peligran')+
     kpi('Quién te hace el daño',(topD&&topD.c<0)?topD.t:'—','#dc2626',(topD&&topD.c<0)?dmg+'% del golpe':'nadie sufre');
   const nf=document.getElementById('escNetFoot');
   if(nf){ const worst=rows[0],best=rows[rows.length-1];
     nf.innerHTML=(!rows.length)?'Sin posiciones abiertas en cartera.':(net===0)?'Todo en su nivel normal: ningún factor aprieta.':
     `Más golpeada <b>${worst.c.t}</b> (${worst.i}); más resiliente <b>${best.c.t}</b> (${best.i}). <span class="esc-mut">La caída estimada es orientativa (índice × 0,75), no una predicción de precio.</span>`; }
   // coberturas
   const heldSet=new Set(H.map(c=>c.t)); const cr=candRows(heldSet).map(c=>({c,i:idx(c.s)})).sort((a,b)=>b.i-a.i);
   const tc=document.querySelector('#escTblC tbody'); if(tc){ tc.innerHTML='';
     if(!cr.length)tc.innerHTML='<tr><td colspan="3" class="esc-mut">No hay empresas analizadas fuera de la cartera con sensibilidad conocida.</td></tr>';
     cr.forEach(({c,i})=>{ const lect=i>=0?'aguantaría / cobertura':(i>-40?'resiste mejor que la media':'también sufriría');
       tc.innerHTML+=`<tr><td><b>${c.t}</b> <span class="esc-mut">${c.n}</span></td><td class="esc-num" style="color:${i<0?'#dc2626':i>0?'#16a34a':'#64748b'};font-weight:700">${i>0?'+':''}${i}</td><td>${lect}</td></tr>`; }); }
   // mapa de calor
   const heat=document.getElementById('escHeat');
   if(heat){ let h='<table class="esc-heat"><thead><tr><th>Empresa</th>'+VARS.map(v=>`<th class="esc-num" title="${v.lab}">${v.id}</th>`).join('')+'<th class="esc-num">Índice</th></tr></thead><tbody>';
     H.forEach(c=>{ h+=`<tr><td><b>${c.t}</b></td>`+VARS.map(v=>heatCell((c.s[v.id]||0)*inten(v.id))).join('')+`<td class="esc-num" style="font-weight:700;color:${idx(c.s)<0?'#dc2626':'#16a34a'}">${idx(c.s)>0?'+':''}${idx(c.s)}</td></tr>`; });
     h+='</tbody></table>'; heat.innerHTML=h; }
 }
 function kpi(l,v,c,sub){ return `<div class="esc-kpi"><div class="esc-kl">${l}</div><div class="esc-kv" style="color:${c}">${v}</div><div class="esc-kl" style="margin-top:2px">${sub||''}</div></div>`; }

 window.renderEscenarios=function(){
   const el=document.getElementById('escBody'); if(!el)return;
   if(escVal===null){ escVal={}; VARS.forEach(v=>escVal[v.id]=PRESETS.lehman[v.id]); }
   const chips=[['lehman','Lehman 2008'],['covid','COVID 2020'],['guerra','Guerra energética 2022'],['recesion','Recesión clásica'],['materias','Escasez de materias primas'],['favorable','Expansión favorable'],['bonanza','☀️ Bonanza (mejor caso)'],['aleatorio','🎲 Aleatorio'],['normal','Todo normal']];
   el.innerHTML=`
   <style>
     #view-escenarios .esc-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-top:14px}
     #view-escenarios .esc-mut{color:#64748b;font-size:12px}
     #view-escenarios .esc-chips{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0}
     #view-escenarios .esc-chip{border:1px solid #e2e8f0;border-radius:20px;padding:5px 12px;font-size:12.5px;cursor:pointer;background:#fff}
     #view-escenarios .esc-chip.on{background:#1f3864;color:#fff;border-color:#1f3864}
     #view-escenarios .esc-slgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-top:12px}
     @media(max-width:640px){#view-escenarios .esc-slgrid{grid-template-columns:1fr}}
     #view-escenarios .esc-sl .esc-lab{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;margin-bottom:1px}
     #view-escenarios .esc-val{font-weight:800;font-variant-numeric:tabular-nums}
     #view-escenarios .esc-track{position:relative}
     #view-escenarios .esc-zero{position:absolute;top:17px;bottom:6px;width:2px;background:#0ea5e9;transform:translateX(-1px);pointer-events:none;z-index:2}
     #view-escenarios .esc-zlbl{position:absolute;top:0;font-size:10px;font-weight:700;color:#0369a1;background:#e0f2fe;border:1px solid #7dd3fc;border-radius:4px;padding:0 4px;line-height:1.5;pointer-events:none;z-index:3;white-space:nowrap}
     #view-escenarios .esc-track input[type=range]{width:100%;position:relative;z-index:1;background:transparent;margin:15px 0 0 0}
     #view-escenarios .esc-ends{display:flex;justify-content:space-between;font-size:10.5px;color:#64748b;margin-top:-2px}
     #view-escenarios .esc-gauge{display:flex;gap:12px;flex-wrap:wrap}
     #view-escenarios .esc-kpi{flex:1;min-width:150px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px}
     #view-escenarios .esc-kl{font-size:11.5px;color:#64748b}
     #view-escenarios .esc-kv{font-size:22px;font-weight:800;line-height:1.1;margin-top:2px}
     #view-escenarios table{width:100%;border-collapse:collapse}
     #view-escenarios th,#view-escenarios td{padding:6px 8px;text-align:left;font-size:12.5px;border-bottom:1px solid #e2e8f0}
     #view-escenarios th{color:#64748b;font-weight:600}
     #view-escenarios .esc-num{text-align:right;font-variant-numeric:tabular-nums}
     #view-escenarios .esc-tier{font-size:10.5px;padding:2px 7px;border-radius:6px;font-weight:700}
     #view-escenarios .esc-t-joya{background:#fef9c3;color:#854d0e}
     #view-escenarios .esc-t-nucleo{background:#dbeafe;color:#1e40af}
     #view-escenarios .esc-t-mantener{background:#f1f5f9;color:#475569}
     #view-escenarios .esc-bar{height:16px;border-radius:5px;background:#eef2f7;position:relative;overflow:hidden;min-width:110px}
     #view-escenarios .esc-fill{position:absolute;top:0;bottom:0}
     #view-escenarios .esc-mid{position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:#94a3b8}
     #view-escenarios .esc-pill{font-size:10.5px;padding:1px 6px;border-radius:5px;font-weight:700;background:#fef2f2;color:#dc2626}
     #view-escenarios .esc-heat{font-size:11px}
     #view-escenarios details{margin-top:10px}#view-escenarios summary{cursor:pointer;font-weight:600;font-size:13px}
   </style>
   <div class="esc-mut">Cartera real en vivo · 11 factores macro en valores reales · un evento = un preset · mueve las barras en cualquier sentido (línea azul = nivel normal, 0 impacto).</div>
   <div class="esc-card"><h3 style="margin:0 0 6px">Escenario</h3>
     <div class="esc-chips" id="escChips">${chips.map((c,i)=>`<div class="esc-chip${i===0?' on':''}" data-preset="${c[0]}"${(c[0]==='aleatorio'||c[0]==='normal')?' style="border-style:dashed"':''}>${c[1]}</div>`).join('')}</div>
     <div class="esc-mut" id="escPresetDesc" style="margin-top:6px"></div>
     <div class="esc-slgrid" id="escSliders"></div>
   </div>
   <div class="esc-card"><h3 style="margin:0 0 8px">Respuesta de tu cartera</h3>
     <div class="esc-gauge" id="escGauge"></div>
     <div class="esc-mut" id="escNetFoot" style="margin-top:8px"></div>
   </div>
   <div class="esc-card"><h3 style="margin:0 0 8px">Impacto por empresa <span class="esc-mut" style="font-weight:400">· de más golpeada a más resiliente</span></h3>
     <table id="escTbl"><thead><tr><th>Empresa</th><th>Nivel</th><th class="esc-num">Peso</th><th style="width:32%">Impacto</th><th class="esc-num">Índice</th><th>Alarma</th></tr></thead><tbody></tbody></table>
   </div>
   <div class="esc-card"><h3 style="margin:0 0 8px">De dónde viene el golpe <span class="esc-mut" style="font-weight:400">· aporte de cada factor a cada empresa (rojo resta · verde suma)</span></h3>
     <div id="escHeat" style="overflow:auto"></div>
   </div>
   <div class="esc-card"><h3 style="margin:0 0 4px">Coberturas — analizadas que NO tienes</h3>
     <div class="esc-mut">Cómo responderían al mismo shock (mejor arriba).</div>
     <table id="escTblC"><thead><tr><th>Empresa</th><th class="esc-num">Índice</th><th>Lectura</th></tr></thead><tbody></tbody></table>
   </div>
   <div class="esc-card"><details><summary>Cómo funciona</summary>
     <div class="esc-mut" style="margin-top:8px">Cada empresa tiene una sensibilidad (−2..+2) a cada factor, calibrada con sus informes 2024/25; las empresas nuevas heredan de su arquetipo del Universo. El impacto = Σ (sensibilidad × intensidad del factor), ponderado por tu peso. Índice = dirección + severidad relativa (no € de pérdida). Rangos reales de ~20 años.</div>
   </details></div>`;
   document.querySelectorAll('#escChips [data-preset]').forEach(c=>c.addEventListener('click',()=>{
     document.querySelectorAll('#escChips [data-preset]').forEach(x=>x.classList.remove('on')); c.classList.add('on'); escApplyPreset(c.dataset.preset); }));
   escApplyPreset('lehman');
 };
})();
