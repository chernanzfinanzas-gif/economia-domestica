#!/usr/bin/env python3
"""Genera la página HTML del informe preliminar del universo a partir de prelim.json.
Uso: pagina_preliminar.py prelim.json salida.html"""
import json, sys, html
COMPLETO = '--completo' in sys.argv          # página suelta (repositorio): con <!doctype>, <head> y estilos base
args = [a for a in sys.argv[1:] if a != '--completo']
src, dst = args[0], args[1]
D = json.load(open(src))
if len(args) > 2: D['prueba'] = json.load(open(args[2]))

def es(x, dec=1):
    return f'{x:,.{dec}f}'.replace(',', '·').replace('.', ',').replace('·', '.')

fecha = D['generado'][:10]
f = D['continuo']; g = D['growth']
cnt = {k: sum(1 for r in f if k in r['etiquetas']) for k in ('Calidad', 'Barata', 'Crecimiento', 'Riesgo')}
sin = sum(1 for r in f if not r['etiquetas'])

CSS = r"""
/* Layout: cabecera con resumen en fichas, tabla filtrable a lo ancho, BME Growth aparte, criterios al pie */
:root{
 --bg:#f5f7fa; --panel:#ffffff; --ink:#15202b; --muted:#5b6878; --line:#dde3ea; --accent:#1f4e8c;
 --q:#1d7a4f; --qbg:#e3f3ea; --b:#1f5fa8; --bbg:#e3edf9; --c:#6b3fa0; --cbg:#efe7f8; --r:#b3261e; --rbg:#fbe6e4;
 --row:#f0f3f7; --held:#e6f4ec; --ana:#fbf5dc; --amber:#c99a06; --f-display:"Archivo",system-ui,sans-serif; --f-body:"Public Sans",system-ui,sans-serif; --f-num:"IBM Plex Mono",ui-monospace,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
 --bg:#10161d; --panel:#17202a; --ink:#e4e9ef; --muted:#93a0af; --line:#2a3542; --accent:#7fa8e6;
 --q:#5fd09a; --qbg:#173327; --b:#7fb0ef; --bbg:#172a40; --c:#b99be6; --cbg:#2a2140; --r:#f08a80; --rbg:#3a1e1c; --row:#1b2530; --held:#15281f; --ana:#2a2614; --amber:#e0b52e; color-scheme:dark}}
:root[data-theme="dark"]{
 --bg:#10161d; --panel:#17202a; --ink:#e4e9ef; --muted:#93a0af; --line:#2a3542; --accent:#7fa8e6;
 --q:#5fd09a; --qbg:#173327; --b:#7fb0ef; --bbg:#172a40; --c:#b99be6; --cbg:#2a2140; --r:#f08a80; --rbg:#3a1e1c; --row:#1b2530; --held:#15281f; --ana:#2a2614; --amber:#e0b52e; color-scheme:dark}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:14px;line-height:1.5}
.wrap{max-width:1400px;margin:0 auto;padding-block:28px 60px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:28px}
h1,h2{font-family:var(--f-display);text-wrap:balance;margin:0}
h1{font-size:28px;font-weight:700;letter-spacing:-.01em}
h2{font-size:19px;font-weight:650}
.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
.lede{color:var(--muted);max-width:75ch;margin:6px 0 0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.tile b{font-family:var(--f-num);font-size:24px;font-weight:600}
.tile>span{color:var(--muted);font-size:12.5px}
.tag{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 7px;border-radius:999px;white-space:nowrap}
.t-Calidad{color:var(--q);background:var(--qbg)} .t-Barata{color:var(--b);background:var(--bbg)}
.t-Crecimiento{color:var(--c);background:var(--cbg)} .t-Riesgo{color:var(--r);background:var(--rbg)}
section{display:flex;flex-direction:column;gap:12px}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls select,.controls input{font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:5px;background:var(--panel);color:var(--ink)}
.controls input{min-width:0;flex:1 1 180px;max-width:280px}
.controls label{display:flex;gap:6px;align-items:center;color:var(--muted);font-size:13px}
.chip{font:inherit;font-size:12.5px;border:1px solid var(--line);background:var(--panel);color:var(--ink);padding:4px 10px;border-radius:999px;cursor:pointer}
.chip[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);font-weight:600}
.chip:focus-visible,select:focus-visible,input:focus-visible,th button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.scroll{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:6px 9px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
th{position:sticky;top:0;background:var(--panel);font-weight:600;font-size:12px;color:var(--muted);vertical-align:bottom}
th button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
th.sorted button{color:var(--accent)}
td.l,th.l{text-align:left}
td.n{font-family:var(--f-num);font-variant-numeric:tabular-nums;font-size:12.5px}
tbody tr:hover{background:var(--row)}
tr.st-cartera td{background:var(--held)} tr.st-analizada td{background:var(--ana)}
tr.st-cartera td:first-child{box-shadow:inset 4px 0 0 var(--q)} tr.st-analizada td:first-child{box-shadow:inset 4px 0 0 var(--amber)}
.est{font-size:10.5px;font-weight:700;border-radius:4px;padding:0 5px;white-space:nowrap}
.est-cartera{background:var(--q);color:var(--panel)} .est-analizada{background:var(--amber);color:#1c1400}
.pts{font-family:var(--f-num);font-weight:600;font-size:14px;display:inline-block;min-width:34px;text-align:right}
.bar{display:inline-block;width:46px;height:6px;border-radius:3px;background:var(--line);vertical-align:middle;margin-left:6px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--accent)}
.emp{font-weight:600} .sub{color:var(--muted);font-size:11.5px}
.neg{color:var(--r)} .pos{color:var(--q)}
.na{color:var(--muted)}
.av{cursor:help;color:var(--r);font-weight:700;padding-left:4px}
details.av-d summary{cursor:pointer;color:var(--muted);font-size:12px}
.grupo{font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 5px}
.dots{display:inline-flex;gap:3px}
.dot{width:10px;height:10px;border-radius:50%;background:var(--line)}
.dot.on{background:var(--q)}
.cols2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.box{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:14px 16px;min-width:0}
.box ul{margin:6px 0 0;padding-left:18px} .box li{margin:3px 0}
.list{display:flex;flex-direction:column}
.list .it{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.list .it:last-child{border-bottom:0}
.small{font-size:12.5px;color:var(--muted)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""

page = f"""<title>Universo KH · foto preliminar</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=Public+Sans:wght@400;600&display=swap">
<style>{CSS}</style>
<div class="wrap">
<header>
 <div class="eyebrow">Método KH v3 · parte 1 · paso 1 · {html.escape(fecha)}</div>
 <h1>Universo KH · foto preliminar</h1>
 <p class="lede">Las {len(f)} empresas del universo y las {len(g)} de BME Growth con sus datos base (CNMV, ESEF, SEC y PDF de BME Growth) y la cotización del repositorio. Sirve para elegir cuáles analizar a fondo. Las etiquetas son un cribado mecánico con criterios provisionales, no una recomendación.</p>
</header>
<div class="tiles">
 <div class="tile"><b>{len(f)}</b><span>empresas del universo</span></div>
 <div class="tile"><b>{cnt['Calidad']}</b><span><span class="tag t-Calidad">Calidad</span></span></div>
 <div class="tile"><b>{cnt['Barata']}</b><span><span class="tag t-Barata">Barata</span></span></div>
 <div class="tile"><b>{cnt['Crecimiento']}</b><span><span class="tag t-Crecimiento">Crecimiento</span></span></div>
 <div class="tile"><b>{cnt['Riesgo']}</b><span><span class="tag t-Riesgo">Riesgo</span></span></div>
 <div class="tile"><b>{sin}</b><span>sin ninguna etiqueta</span></div>
</div>
<div class="cols2">
 <div class="box"><h2>Candidatas a análisis completo</h2><p class="small">Sin analizar todavía, con «Calidad» y sin «Riesgo». Ordenadas por puntos.</p><div class="list" id="cand"></div></div>
 <div class="box" id="cartbox"><h2>Tu cartera en el ranking</h2><p class="small" id="cartnota"></p><div class="list" id="cart"></div></div>
 <div class="box"><h2>Movimientos de la semana</h2><p class="small" id="movnota"></p><div class="list" id="mov"></div></div>
 <div class="box"><h2>Analizadas o en cartera con «Riesgo»</h2><p class="small">Ya tienen análisis completo y el cribado les marca riesgo: conviene mirar si la tesis lo recoge.</p><div class="list" id="riesgo"></div></div>
</div>
<section>
 <h2>Todas las empresas del universo</h2>
 <div class="controls">
  <input id="q" type="search" placeholder="Buscar empresa o ticker" aria-label="Buscar empresa o ticker">
  <label for="fm">Modelo <select id="fm"><option value="">todos</option><option>GEN</option><option>BAN</option><option>SEG</option><option>INM</option></select></label>
  <label for="fg">Estado <select id="fg"><option value="">todos</option><option value="cartera">en cartera</option><option value="analizada">analizadas (sin cartera)</option><option value="universo">sin analizar</option></select></label>
  <label for="fgr">Grupo <select id="fgr"><option value="">todos</option></select></label>
  <span id="chips"></span>
  <span class="small" id="cuenta"></span>
 </div>
 <div class="scroll"><table id="tab"><thead></thead><tbody></tbody></table></div>
 <p class="small">Cifras en millones de euros (ArcelorMittal en dólares). Último ejercicio cerrado de cada empresa. «Crec.» = crecimiento anual de los ingresos en el tramo de cinco años (en banca, margen de intereses). «S1» = primer semestre más reciente frente al del año anterior. «Rent. div.» = dividendo por acción de los últimos 12 meses (en dinero o en acciones) sobre la cotización, según el calendario de dividendos de la app; si la empresa paga en acciones y no las amortiza, se le resta el crecimiento anual del número de acciones. «Recompra» = lo que baja al año el número de acciones en unos 3 años (solo recompras que amortizan). «Caja libre» = flujo de explotación menos inversión, sobre la capitalización. El ! rojo muestra los avisos de la empresa al pasar el ratón o tocarlo.</p>
</section>
<section id="prueba">
 <h2>¿Sirven los puntos? Prueba con datos del pasado</h2>
 <p class="lede">Cada 15 de mayo de 2017 a 2025 se calcularon los puntos con lo que se sabía ese día (cuentas ya publicadas, cotización y dividendos hasta esa fecha) y se midió la rentabilidad total de los 12 meses siguientes (cotización + dividendos). Las empresas se reparten en cinco grupos iguales por puntos: Q1 son las de más puntos y Q5 las de menos.</p>
 <div class="tiles" id="prtiles"></div>
 <div class="scroll"><table id="prtab"><thead></thead><tbody></tbody></table></div>
 <div class="cols2">
  <div class="box"><h2>Qué parte predice</h2><p class="small">Correlación de orden media (−1 a 1) entre cada parte de los puntos y la rentabilidad del año siguiente. Por encima de 0 = ordena bien. Debajo, variantes de la fórmula: rentabilidad de Q1 y Q5, correlación y años en que ordenó bien.</p><div class="list" id="prcomp"></div></div>
  <div class="box"><h2>Las etiquetas</h2><p class="small">Rentabilidad media al año siguiente de las empresas con y sin cada etiqueta.</p><div class="list" id="pretq"></div></div>
  <div class="box"><h2>Cuidado al leerla</h2><ul>
   <li>Solo entran las empresas que siguen cotizando hoy: las que quebraron o salieron de bolsa no están, así que las medias salen optimistas. La comparación entre grupos se ve menos afectada.</li>
   <li>Son 9 años y unas 70-100 empresas por año: sirve para ver la dirección, no para afinar pesos al decimal.</li>
   <li>Quedan fuera las fechas en que la cotización tiene un salto de un día sin ajustar o el número de acciones no se puede reconstruir (<span id="prexcl"></span> casos).</li>
  </ul></div>
 </div>
</section>
<section>
 <h2>BME Growth · candidatas al salto</h2>
 <p class="lede">Termómetro provisional: cinco señales de que una empresa se prepara para pasar al Mercado Continuo. La hipótesis está sin medir; se contrastará con casos pasados (Grenergy, Atrys) antes de fiarse de ella.</p>
 <div class="scroll"><table id="gro"><thead></thead><tbody></tbody></table></div>
</section>
<div class="cols2">
 <div class="box"><h2>Cómo se calculan los puntos</h2><ul>
  <li>Misma estructura y pesos que el «Atractivo» del Radar de la app: <b>dividendo y recompras 35 %</b>, <b>calidad 35 %</b>, <b>valoración 30 %</b>, de 0 a 100.</li>
  <li><b>Dividendo:</b> dividendo por acción de los últimos 12 meses / cotización, con 100 puntos al 6 %. Cuenta igual en dinero que en acciones (scrip): quien lo cobra en dinero recibe lo mismo. Si la empresa paga en acciones y no las amortiza (el número de acciones crece en 3 años), esa dilución anual se resta. Las ampliaciones de capital a precio de mercado no se restan. Las 17 empresas sin calendario en la app usan el dividendo pagado del estado de flujos. Los dividendos extraordinarios no cuentan (salen en avisos). Se multiplica por 0,7 si reparte más del 85 % del beneficio y por 0,5 si paga sin beneficio.</li>
  <li><b>Recompras:</b> se suman al dividendo a mitad de valor (un euro de recompra cuenta como medio euro de dividendo, porque el dividendo se cobra y se reinvierte) cuando amortizan acciones: lo que baja al año el número de acciones en unos 3 años. Solo se cuenta si el capital social y el beneficio por acción de la CNMV dan la misma bajada, para no confundir una devolución por reducción de nominal con una recompra. Hoy cuenta en 17 empresas.</li>
  <li><b>Calidad:</b> ROE mediano de 5 años (100 puntos al 20 %), 50 %; deuda, 30 %; constancia (−25 por cada año con pérdidas en 5), 20 %. La deuda puntúa 100 hasta 2 veces el EBITDA (4 en Regulada y Concesional) y pierde 25 por cada vez más. En inmobiliarias, deuda/activo a partir del 30 %. En banca y seguros, 100, como en el Radar.</li>
  <li><b>Valoración:</b> media de PER (100 hasta 8 y −5 por punto) y precio/valor contable (100 hasta 1 y −35 por punto). La posición en el rango de 52 semanas que usa el Radar se quitó el 20-oct-2026: en la prueba con datos del pasado funcionaba al revés.</li>
  <li><b>Diferencias con el Radar:</b> cuentas propias (CNMV, ESEF) en lugar de Yahoo, ROE de 5 años en lugar de uno solo, deuda según el módulo y constancia en lugar del rating, que solo tienen las analizadas. La columna «Radar app» es la fórmula de la app con los datos de Yahoo (1-oct) y un rating neutro de 60, para comparar.</li>
 </ul></div>
 <div class="box"><h2>Criterios de las etiquetas</h2><ul id="crit"></ul><p class="small">Provisionales: los ajusta Carlos.</p></div>
 <div class="box"><h2>Señales del salto</h2><ul id="salto"></ul></div>
 <div class="box"><h2>De dónde sale cada cifra</h2><ul>
  <li>Cuentas: nivel base del método v3 (IPP de la CNMV y ESEF; SEC y registro neerlandés para las extranjeras; PDF leídos para BME Growth).</li>
  <li>Cotización: repositorio de la app, cierre del {html.escape(max(r.get('fecha_precio','') for r in f))}.</li>
  <li>Acciones: registro de capital de la CNMV contrastado con el BPA y con Yahoo; en BME Growth, la nota de capital de las cuentas 2025.</li>
  <li>EUR/USD {es(D['eur_usd']['v'],4)} ({html.escape(D['eur_usd']['f'])}).</li>
  <li>Clasificación: Matriz v3 {html.escape(str(D.get('matriz') or ''))}.</li>
 </ul></div>
</div>
</div>
<script>
const D={json.dumps(D, ensure_ascii=False)};
/* Cartera: en el repositorio público no se guarda. Si la app ha dejado en este navegador la lista de tickers
   (clave «kh_universo_cartera»: {{"fecha":"AAAA-MM-DD","tickers":[...]}}), se usa aquí y no sale de él. */
(function(){{ let c=null; try{{ c=JSON.parse(localStorage.getItem('kh_universo_cartera')||'null'); }}catch(e){{}}
  if(c&&Array.isArray(c.tickers)&&c.tickers.length){{ const s=new Set(c.tickers.map(t=>String(t).toUpperCase()));
    D.continuo.forEach(r=>{{ if(s.has(r.ticker)) r.estado='cartera'; }}); D.cartera_fecha=(c.fecha||'')+' (de la app, en este navegador)'; }} }})();
const fmt=(x,d=1)=>x==null||isNaN(x)?'<span class="na">–</span>':x.toLocaleString('es-ES',{{minimumFractionDigits:d,maximumFractionDigits:d}});
const pc=(x,d=0,col=false)=>{{if(x==null||isNaN(x))return '<span class="na">–</span>';let v=Number((x*100).toFixed(d));if(Object.is(v,-0))v=0;return `<span class="${{col?(v<0?'neg':(v>0?'pos':'')):''}}">${{v.toLocaleString('es-ES',{{maximumFractionDigits:d,minimumFractionDigits:d}})}} %</span>`;}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c]));
const tags=r=>r.etiquetas.map(t=>`<span class="tag t-${{t}}">${{t}}</span>`).join(' ');
const avis=r=>r.avisos.length?`<span class="av" title="${{esc(r.avisos.join(' · '))}}" tabindex="0" role="img" aria-label="Avisos: ${{esc(r.avisos.join(' · '))}}">!</span>`:'';
const deuda=r=>r.modelo==='INM'?pc(r.ltv):(r.modelo==='GEN'?(r.deuda_neta!=null&&r.deuda_neta<=0?'<span class="pos">caja neta</span>':fmt(r.dn_ebitda)):'<span class="na">·</span>');
const COLS=[
 ['empresa','Empresa','l',r=>`<span class="emp">${{esc(r.empresa)}}</span>${{avis(r)}}<br><span class="sub">${{esc(r.ticker)}} · ${{esc(r.modelo)}}${{r.modulos.length?' · '+esc(r.modulos.join(', ')):''}} ${{r.estado==='cartera'?'<span class="est est-cartera">en cartera</span>':(r.estado==='analizada'?'<span class="est est-analizada">analizada</span>':'')}}</span>`],
 ['puesto','Puesto','n',r=>r.puesto?`${{r.puesto}}${{r.cambio_puesto?`<span class="${{r.cambio_puesto>0?'pos':'neg'}}" style="font-size:11px"> ${{r.cambio_puesto>0?'▲':'▼'}}${{Math.abs(r.cambio_puesto)}}</span>`:''}}`:'–'],
 ['puntos','Puntos','n',r=>r.puntos?`<span title="${{esc('Dividendo '+r.puntos.dividendo+' · Calidad '+r.puntos.calidad+' · Valoración '+r.puntos.valoracion+(r.puntos.nota?' · '+r.puntos.nota:''))}}" style="cursor:help"><span class="pts">${{fmt(r.puntos.total,0)}}</span><span class="bar"><i style="width:${{r.puntos.total}}%"></i></span></span>`:'<span class="na">–</span>'],
 ['p_div','Div.','n',r=>r.puntos?fmt(r.puntos.dividendo,0):'–'],
 ['p_cal','Cal.','n',r=>r.puntos?fmt(r.puntos.calidad,0):'–'],
 ['p_val','Val.','n',r=>r.puntos?fmt(r.puntos.valoracion,0):'–'],
 ['radar_app','Radar app','n',r=>fmt(r.radar_app,0)],
 ['grupo_comp','Su grupo','l',r=>`<span class="sub">${{esc(r.grupo_comp||'')}}</span><br>${{r.puesto_grupo?`<b>${{r.puesto_grupo}}.º</b> de ${{r.n_grupo}}`:'–'}}`],
 ['per_vs_grupo','PER / grupo','n',r=>r.per_vs_grupo==null?'<span class="na">–</span>':`<span class="${{r.per_vs_grupo<0.85?'pos':(r.per_vs_grupo>1.15?'neg':'')}}" title="PER ${{fmt(r.per)}} frente a la mediana del grupo ${{fmt(r.per_grupo)}}">${{fmt(r.per_vs_grupo,2)}}</span>`],
 ['etiquetas','Cribado','l',tags],
 ['cap','Capitaliz.','n',r=>fmt(r.cap,0)],
 ['ingresos','Ingresos','n',r=>fmt(r.ingresos,0)],
 ['cagr_ing','Crec.','n',r=>pc(r.cagr_ing,0,true)],
 ['mg_ebit','Mg. EBIT','n',r=>pc(r.mg_ebit,1,true)],
 ['roe','ROE','n',r=>pc(r.roe,1,true)],
 ['roe_med5','ROE 5a','n',r=>pc(r.roe_med5,1,true)],
 ['perdidas5','Pérd. 5a','n',r=>r.perdidas5==null?'–':(r.perdidas5?`<span class="neg">${{r.perdidas5}}</span>`:'0')],
 ['dn_ebitda','DN/EBITDA','n',deuda],
 ['per','PER','n',r=>fmt(r.per)],
 ['pvc','P/VC','n',r=>fmt(r.pvc,2)],
 ['rpd','Rent. div.','n',r=>pc(r.rpd,1)],
 ['recompra','Recompra','n',r=>r.recompra?pc(r.recompra,1,true):'<span class="na">–</span>'],
 ['fcf_yield','Caja libre','n',r=>pc(r.fcf_yield,1,true)],
 ['ev_ebitda','VE/EBITDA','n',r=>fmt(r.ev_ebitda)],
 ['var_1a','Cotiz. 1a','n',r=>pc(r.var_1a,0,true)],
 ['s1_ing','S1 ingr.','n',r=>pc(r.s1_ing,0,true)],
 ['s1_ben','S1 benef.','n',r=>r.s1_ben==null?'<span class="na">–</span>':pc(r.s1_ben,0,true)],
 ['ultimo','Año','n',r=>esc(r.ultimo??'–')],
];
let sortK='puntos',sortD=-1,tagF=new Set();
const TAGS=['Calidad','Barata','Crecimiento','Riesgo'];
document.getElementById('chips').innerHTML=TAGS.map(t=>`<button class="chip" type="button" id="chip-${{t}}" aria-pressed="false" data-t="${{t}}">${{t}}</button>`).join(' ');
function head(){{document.querySelector('#tab thead').innerHTML='<tr>'+COLS.map(([k,n,c])=>`<th class="${{c==='l'?'l':''}} ${{k===sortK?'sorted':''}}"><button type="button" data-k="${{k}}">${{n}}${{k===sortK?(sortD<0?' ↓':' ↑'):''}}</button></th>`).join('')+'</tr>';}}
function val(r,k){{if(k==='puesto')return r.puesto?-r.puesto:null;if(k==='grupo_comp')return (r.grupo_comp||'')+String(1000+(r.puesto_grupo||999));if(k==='puntos')return r.puntos?r.puntos.total:null;if(k==='p_div')return r.puntos?r.puntos.dividendo:null;if(k==='p_cal')return r.puntos?r.puntos.calidad:null;if(k==='p_val')return r.puntos?r.puntos.valoracion:null;if(k==='empresa')return r.empresa.toLowerCase();if(k==='etiquetas')return r.etiquetas.join();if(k==='dn_ebitda')return r.modelo==='INM'?r.ltv:(r.deuda_neta!=null&&r.deuda_neta<=0?-1:r.dn_ebitda);return r[k];}}
function draw(){{
 const q=document.getElementById('q').value.trim().toLowerCase(),m=document.getElementById('fm').value,g=document.getElementById('fg').value;
 let rows=D.continuo.filter(r=>(!q||(r.empresa+' '+r.ticker).toLowerCase().includes(q))&&(!m||r.modelo===m)&&(!g||r.estado===g)&&(!document.getElementById('fgr').value||r.grupo_comp===document.getElementById('fgr').value)&&[...tagF].every(t=>r.etiquetas.includes(t)));
 rows.sort((a,b)=>{{const x=val(a,sortK),y=val(b,sortK);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x>y?1:x<y?-1:0)*sortD;}});
 head();
 document.querySelector('#tab tbody').innerHTML=rows.map(r=>'<tr class="st-'+r.estado+'">'+COLS.map(([k,n,c,f])=>`<td class="${{c}}">${{f(r)}}</td>`).join('')+'</tr>').join('');
 document.getElementById('cuenta').textContent=rows.length+' de '+D.continuo.length;
}}
document.querySelector('#tab thead').addEventListener('click',e=>{{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;if(k===sortK)sortD=-sortD;else{{sortK=k;sortD=(k==='empresa'||k==='grupo_comp'||k==='per_vs_grupo'||k==='per'||k==='pvc'||k==='dn_ebitda'||k==='ev_ebitda')?1:-1;}}draw();}});
document.getElementById('chips').addEventListener('click',e=>{{const b=e.target.closest('.chip');if(!b)return;const t=b.dataset.t;tagF.has(t)?tagF.delete(t):tagF.add(t);b.setAttribute('aria-pressed',tagF.has(t));draw();}});
document.getElementById('fgr').innerHTML+=Object.keys(D.grupos||{{}}).sort().map(g=>`<option>${{esc(g)}}</option>`).join('');
['q','fm','fg','fgr'].forEach(id=>document.getElementById(id).addEventListener('input',draw));
draw();
// listas
const it=r=>`<div class="it"><div><span class="emp">${{esc(r.empresa)}}</span> <span class="sub">${{esc(r.ticker)}} · ${{esc(r.modelo)}}</span><br>${{tags(r)}}</div><div class="small" style="text-align:right"><span class="pts">${{r.puntos?fmt(r.puntos.total,0):'–'}}</span> puntos<br>PER ${{fmt(r.per)}} · ROE 5a ${{pc(r.roe_med5,0)}}</div></div>`;
const cand=D.continuo.filter(r=>r.estado==='universo'&&r.etiquetas.includes('Calidad')&&!r.etiquetas.includes('Riesgo')).sort((a,b)=>(b.puntos?.total??0)-(a.puntos?.total??0));
document.getElementById('cand').innerHTML=cand.map(it).join('')||'<p class="small">Ninguna.</p>';
const ries=D.continuo.filter(r=>r.estado!=='universo'&&r.etiquetas.includes('Riesgo'));
document.getElementById('riesgo').innerHTML=ries.map(it).join('')||'<p class="small">Ninguna.</p>';
const rk=D.continuo.filter(r=>r.puntos).sort((a,b)=>b.puntos.total-a.puntos.total);rk.forEach((r,i)=>r.pos=i+1);
if(!D.continuo.some(r=>r.estado==='cartera')) document.getElementById('cartbox').hidden=true;
document.getElementById('cartnota').textContent='Puesto de cada una entre las '+rk.length+' con puntos. Cartera según la copia de la app del '+(D.cartera_fecha||'–')+'.';
document.getElementById('cart').innerHTML=rk.filter(r=>r.estado==='cartera').map(r=>`<div class="it"><div><span class="emp">${{esc(r.empresa)}}</span> <span class="sub">${{esc(r.ticker)}}</span><br>${{tags(r)}}</div><div class="small" style="text-align:right"><span class="pts">${{fmt(r.puntos.total,0)}}</span> puntos<br>puesto ${{r.pos}}</div></div>`).join('');
const mv=D.continuo.filter(r=>r.cambio_puntos!=null).sort((a,b)=>b.cambio_puntos-a.cambio_puntos);
const mvit=r=>`<div class="it"><div><span class="emp">${{esc(r.empresa)}}</span> <span class="sub">${{esc(r.ticker)}}</span>${{r.estado!=='universo'?' <span class="est est-'+r.estado+'">'+(r.estado==='cartera'?'en cartera':'analizada')+'</span>':''}}</div><div class="small" style="text-align:right"><span class="${{r.cambio_puntos>0?'pos':'neg'}}">${{r.cambio_puntos>0?'+':''}}${{fmt(r.cambio_puntos,1)}}</span> puntos<br>puesto ${{r.puesto_ant}} → ${{r.puesto}}</div></div>`;
document.getElementById('movnota').textContent='Frente al '+(D.movimientos_desde||'')+' (misma cuenta con las cotizaciones y los datos de entonces). Las cinco que más suben y las cinco que más bajan.';
document.getElementById('mov').innerHTML=mv.slice(0,5).map(mvit).join('')+'<div class="it" style="border-bottom:1px dashed var(--line)"></div>'+mv.slice(-5).reverse().map(mvit).join('');
if(D.prueba){{const P=D.prueba,S=P.resumen;
 const t=(v,l)=>`<div class="tile"><b>${{v}}</b><span>${{l}}</span></div>`;
 document.getElementById('prtiles').innerHTML=t(pc(S.quintiles_media[0],1),'al año, el 20 % con más puntos (Q1)')+t(pc(S.quintiles_media[4],1),'al año, el 20 % con menos puntos (Q5)')+t(pc(S.media_universo,1),'al año, media de todas')+t(S.q1_gana_q5+' de '+S.n_cohortes,'años en que Q1 ganó a Q5')+t(pc(S.top10_media,1),'al año, las 10 con más puntos');
 document.querySelector('#prtab thead').innerHTML='<tr><th class="l">Formación</th><th>Empresas</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Q5</th><th>Media</th><th>Top 10</th><th>Correlación</th><th class="l">Top 10 ese día</th></tr>';
 document.querySelector('#prtab tbody').innerHTML=P.cohortes.map(c=>`<tr><td class="l">${{c.formacion}}</td><td class="n">${{c.n}}</td>${{c.quintiles.map(q=>`<td class="n">${{pc(q,1,true)}}</td>`).join('')}}<td class="n">${{pc(c.media,1,true)}}</td><td class="n">${{pc(c.top10,1,true)}}</td><td class="n">${{fmt(c.spearman.pts,2)}}</td><td class="l"><span class="sub">${{c.top10_empresas.join(' · ')}}</span></td></tr>`).join('')+`<tr><td class="l"><b>Media</b></td><td></td>${{S.quintiles_media.map(q=>`<td class="n"><b>${{pc(q,1,true)}}</b></td>`).join('')}}<td class="n"><b>${{pc(S.media_universo,1,true)}}</b></td><td class="n"><b>${{pc(S.top10_media,1,true)}}</b></td><td class="n"><b>${{fmt(S.spearman_medio.pts,2)}}</b></td><td></td></tr>`;
 const nomc={{pts:'Puntos totales',div:'Dividendo y recompras',cal:'Calidad',val:'Valoración'}};
 document.getElementById('prcomp').innerHTML=Object.entries(S.spearman_medio).map(([k,v])=>`<div class="it"><div>${{nomc[k]}}</div><div class="n" style="text-align:right"><b>${{fmt(v,2)}}</b></div></div>`).join('')+(S.variantes?S.variantes.map(x=>`<div class="it"><div class="small">${{esc(x.nombre)}}</div><div class="small" style="text-align:right">Q1 ${{pc(x.q1,1)}} · Q5 ${{pc(x.q5,1)}} · ${{fmt(x.rho,2)}} · bien ${{x.anios_bien}} de ${{S.n_cohortes}} años</div></div>`).join(''):'');
 document.getElementById('pretq').innerHTML=Object.entries(S.etiquetas).map(([k,v])=>`<div class="it"><div><span class="tag t-${{k}}">${{k}}</span> <span class="sub">${{v.n}} casos</span></div><div class="small" style="text-align:right">con ${{pc(v.con,1)}} · sin ${{pc(v.sin,1)}}</div></div>`).join('');
 document.getElementById('prexcl').textContent=(S.excluidas_por_salto||[]).length;
}} else {{ document.getElementById('prueba').hidden=true; }}
document.getElementById('crit').innerHTML=Object.entries(D.criterios).map(([k,v])=>`<li><span class="tag t-${{k}}">${{k}}</span> ${{esc(v)}}</li>`).join('');
document.getElementById('salto').innerHTML=D.salto.map(([k,v])=>`<li><b>${{esc(k)}}</b>: ${{esc(v)}}</li>`).join('');
// growth
const GC=[
 ['Empresa','l',r=>`<span class="emp">${{esc(r.empresa)}}</span>${{avis(r)}}<br><span class="sub">${{esc(r.ticker)}} · datos ${{esc(r.primero)}}-${{esc(r.ultimo)}}</span>`],
 ['Termómetro','l',r=>`<span class="dots" role="img" aria-label="${{r.salto_n}} de 5 señales">${{D.salto.map(([k])=>`<span class="dot ${{r.salto[k]?'on':''}}" title="${{esc(k)}}: ${{r.salto[k]?'sí':'no'}}"></span>`).join('')}}</span> <b>${{r.salto_n}}</b>/5<br><span class="sub">${{D.salto.filter(([k])=>r.salto[k]).map(([k])=>k).join(' · ')||'ninguna'}}</span>`],
 ['Normas','l',r=>`<span class="sub">${{esc(r.normas||'–')}}</span>`],
 ['Capitaliz.','n',r=>fmt(r.cap,0)],['Ingresos','n',r=>fmt(r.ingresos,1)],['Crec.','n',r=>pc(r.cagr_ing,0,true)],
 ['Beneficio','n',r=>fmt(r.beneficio,1)],['DN/EBITDA','n',deuda],['PER','n',r=>fmt(r.per)],['Cotiz. 1a','n',r=>pc(r.var_1a,0,true)],
];
document.querySelector('#gro thead').innerHTML='<tr>'+GC.map(([n,c])=>`<th class="${{c==='l'?'l':''}}">${{n}}</th>`).join('')+'</tr>';
document.querySelector('#gro tbody').innerHTML=[...D.growth].sort((a,b)=>b.salto_n-a.salto_n||(b.cap??0)-(a.cap??0)).map(r=>'<tr>'+GC.map(([n,c,f])=>`<td class="${{c}}" style="${{c==='l'?'white-space:normal;min-width:150px':''}}">${{f(r)}}</td>`).join('')+'</tr>').join('');
</script>
"""
if COMPLETO:
    page = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
            '</head>\n<body>\n' + page + '\n</body>\n</html>\n')
open(dst, 'w').write(page)
print(len(page))
