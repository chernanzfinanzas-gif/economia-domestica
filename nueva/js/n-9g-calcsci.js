/* =====================================================================
   n-9g-calcsci.js · CALCULADORA (11-nov-2026). Carlos: «copiar una Casio CFX-9800G y su forma de anotar,
   sus memorias, sin la programación; y añadir conversiones euro/divisa, rentabilidad y simulador de hipotecas»;
   luego «replicar las pantallas del menú de la calculadora original» (con el manual de la CFX-9800G).
   Sustituye por dentro el panel flotante de siempre (botón 🧮 de la cabecera); la cabecera se conserva.

   CIENTÍFICA (a lo Casio CFX-9800G)
     · MENU abre el MAIN MENU con sus 12 iconos (se eligen con las flechas + EXE, o con 1–9, A, B, C):
       COMP · BASE · SD · REG · MAT · GRAPH · DYNA · TABLE · EQUA · FIN · MEM · OPTION.
       PRGM y LINK de la original no tienen sentido aquí: en su sitio van FIN (la financiera) y MEM (memorias A–Z).
     · Al entrar en un modo sale su pantalla de set up (como la Casio); EXE o empezar a escribir pasa al modo;
       F6 (SET) cambia ángulo (Deg/Rad/Gra), formato (Fix/Sci/Nrm), base o tipo de regresión.
     · Cada modo tiene su menú de teclas F1–F6 en la parte de abajo de la pantalla, el del manual:
       BASE Dec/Hex/Bin/Oct/d~o/LOG · SD DT/EDIT/;/DEV/Σ/PQR · REG DT/CL/;/DEV/Σ/REG · MAT Mat/Det/Trn/EDIT/SEE ·
       GRAPH y TABLE EDIT/DEL/COLR/SEL/RNG/DRAW-TBL · DYNA NEW/EDIT/DEL/GPH/VAR · EQUA SIM/PLY.
     · Línea de cálculo: se escribe la operación entera; EXE pone el resultado debajo, a la derecha; las cuentas
       anteriores quedan arriba (pulsar una la recupera; pulsar su resultado lo mete). ↑ y ◀ recuperan.
     · Memorias A–Z: 25→A guarda; ALPHA + tecla escribe la letra roja. Se guardan en este navegador.
     · Prioridades de la Casio: la multiplicación sin signo va antes (1÷2π = 1÷(2π)); −2² = −4. El % como el móvil.
   FINANCIERA: los 10 cálculos del prototipo del 28-oct + Divisas, Rentabilidad de una inversión e Hipoteca.
   Sin eval: analizadores propios que solo entienden números, memorias y estas operaciones.
   ===================================================================== */
(function(){
  var panel = document.getElementById('calcPanel'); if(!panel) return;
  var head = document.getElementById('calcHead');
  var LS = { hist:'kh_calc_hist_v1', mem:'kh_calc_mem_v1', ans:'kh_calc_ans_v1', ang:'kh_calc_ang_v1', modo:'kh_calc_modo_v1', fin:'kh_calc_fin_v1', finId:'kh_calc_finid_v1', casio:'kh_calc_casio_v1' };
  function lee(k, d){ try{ var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } }
  function guarda(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- estilos ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '#calcPanel.kc{width:344px;max-width:calc(100vw - 16px);max-height:calc(100vh - 80px);display:flex;flex-direction:column}',
    '#calcPanel.kc.fin{width:500px}',
    '#calcPanel.kc.hidden{display:none}',
    '#calcPanel.kc .kc-body{overflow:auto;flex:1 1 auto;min-height:0}',
    '#calcPanel.kc .kc-tabs{display:flex;gap:4px;padding:6px 8px;background:#1e293b}',
    '#calcPanel.kc .kc-tabs button{flex:1;border:0;border-radius:7px;padding:5px 0;font:inherit;font-size:12px;font-weight:700;background:transparent;color:#cbd5e1;cursor:pointer}',
    '#calcPanel.kc .kc-tabs button.on{background:#fff;color:#0f172a}',
    /* pantalla LCD */
    '#calcPanel.kc .kc-lcd{margin:8px 8px 6px;background:#d9e2cf;border:2px solid #4b5563;border-radius:8px;box-shadow:inset 0 2px 6px rgba(0,0,0,.18);font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color:#111827;user-select:text}',
    '#calcPanel.kc .kc-st{display:flex;gap:8px;align-items:center;font-size:10px;font-weight:700;padding:3px 8px;border-bottom:1px solid #b8c4ab;color:#374151}',
    '#calcPanel.kc .kc-st .sp{flex:1}',
    '#calcPanel.kc .kc-st .on{background:#111827;color:#d9e2cf;border-radius:3px;padding:0 4px}',
    '#calcPanel.kc .kc-st .s.on{background:#c2410c}',
    '#calcPanel.kc .kc-st .a.on{background:#b91c1c}',
    '#calcPanel.kc .kc-st .ang{cursor:pointer;text-decoration:underline dotted}',
    '#calcPanel.kc .kc-roll{height:168px;overflow-y:auto;padding:4px 8px 2px;font-size:14px;line-height:1.35}',
    '#calcPanel.kc .kc-roll .e{color:#1e3a8a;word-break:break-all;cursor:pointer;border-radius:3px}',
    '#calcPanel.kc .kc-roll .r{text-align:right;font-weight:700;cursor:pointer;border-radius:3px;margin-bottom:2px}',
    '#calcPanel.kc .kc-roll .e:hover,#calcPanel.kc .kc-roll .r:hover{background:#c7d2bb}',
    '#calcPanel.kc .kc-roll .sto{color:#c2410c}',
    '#calcPanel.kc .kc-roll .err{text-align:right;color:#b91c1c;font-weight:700;font-size:12px}',
    '#calcPanel.kc .kc-roll .in{color:#1e3a8a;word-break:break-all;min-height:19px}',
    '#calcPanel.kc .kc-roll .pv{text-align:right;color:#6b7280;font-size:12px;min-height:16px}',
    '#calcPanel.kc .kc-cur{display:inline-block;width:0;border-left:2px solid #111827;height:1.05em;vertical-align:-2px;margin:0 -1px;animation:kcBl 1s steps(1) infinite}',
    '@keyframes kcBl{50%{border-color:transparent}}',
    '#calcPanel.kc .kc-mem{display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 6px;font-size:11px}',
    '#calcPanel.kc .kc-mem:empty{display:none}',
    '#calcPanel.kc .kc-mem span{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:1px 6px;cursor:pointer;font-variant-numeric:tabular-nums;color:#334155}',
    '#calcPanel.kc .kc-mem span b{color:#b91c1c}',
    '#calcPanel.kc .kc-mem span.borra{color:#94a3b8}',
    '#calcPanel.kc .kc-mem span.borra.seguro{color:#fff;background:#b91c1c;border-color:#b91c1c}',
    /* teclado */
    '#calcPanel.kc .kc-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:4px 8px 8px;background:#fff}',
    '#calcPanel.kc .kc-keys button{position:relative;border:0;border-radius:7px;padding:15px 0 6px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;background:#334155;color:#fff;line-height:1.1}',
    '#calcPanel.kc .kc-keys button:active{transform:scale(.96)}',
    '#calcPanel.kc .kc-keys button .s2{position:absolute;top:2px;left:5px;font-size:9px;font-weight:700;color:#fb923c}',
    '#calcPanel.kc .kc-keys button .al{position:absolute;top:2px;right:5px;font-size:9px;font-weight:700;color:#f87171}',
    '#calcPanel.kc .kc-keys button.num{background:#e2e8f0;color:#0f172a;font-size:16px}',
    '#calcPanel.kc .kc-keys button.num .al{color:#b91c1c}',
    '#calcPanel.kc .kc-keys button.op{background:#cbd5e1;color:#0f172a;font-size:16px}',
    '#calcPanel.kc .kc-keys button.op .al{color:#b91c1c}',
    '#calcPanel.kc .kc-keys button.sh{background:#c2410c}',
    '#calcPanel.kc .kc-keys button.alp{background:#b91c1c}',
    '#calcPanel.kc .kc-keys button.del{background:#1d4ed8}',
    '#calcPanel.kc .kc-keys button.exe{background:#0f172a}',
    '#calcPanel.kc .kc-keys button.ar{background:#475569}',
    '#calcPanel.kc.s .kc-keys button .s2{color:#fff;background:#c2410c;border-radius:3px;padding:0 2px}',
    '#calcPanel.kc.a .kc-keys button .al{color:#fff;background:#b91c1c;border-radius:3px;padding:0 2px}',
    '#calcPanel.kc .kc-nota{font-size:10.5px;color:#64748b;padding:0 10px 8px;line-height:1.35}',
    /* financiera */
    '#calcPanel.kc .kc-fin{padding:10px 12px 12px;display:flex;flex-direction:column;gap:9px;font-size:13px;color:#0f172a;user-select:text}',
    '#calcPanel.kc .kc-fin select,#calcPanel.kc .kc-fin input,#calcPanel.kc .kc-fin textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:7px;padding:6px 8px;font:inherit;font-size:13px;background:#fff;color:#0f172a}',
    '#calcPanel.kc .kc-fin textarea{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;min-height:84px;resize:vertical}',
    '#calcPanel.kc .kc-fin input:focus,#calcPanel.kc .kc-fin select:focus,#calcPanel.kc .kc-fin textarea:focus{outline:2px solid #1d4ed8;border-color:transparent}',
    '#calcPanel.kc .kc-ayuda{font-size:12px;color:#475569;line-height:1.45}',
    '#calcPanel.kc .kc-campos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 10px}',
    '#calcPanel.kc .kc-campos label{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:#475569}',
    '#calcPanel.kc .kc-campos label.ancho{grid-column:1/-1}',
    '#calcPanel.kc .kc-sal{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:1px}',
    '#calcPanel.kc .kc-sal .fila{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:4px 4px;border-radius:6px;cursor:pointer;color:#475569}',
    '#calcPanel.kc .kc-sal .fila:hover{background:#eff6ff}',
    '#calcPanel.kc .kc-sal .fila b{font-variant-numeric:tabular-nums;color:#0f172a;text-align:right;white-space:nowrap}',
    '#calcPanel.kc .kc-sal .fila.prin b{font-size:18px;color:#1d4ed8}',
    '#calcPanel.kc .kc-sal .tit{font-size:10.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;padding:7px 4px 2px;border-top:1px solid #e2e8f0;margin-top:3px}',
    '#calcPanel.kc .kc-sal .tit:first-child{border-top:0;margin-top:0;padding-top:1px}',
    '#calcPanel.kc .kc-sal .aviso{font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 8px;margin-top:4px;line-height:1.4}',
    '#calcPanel.kc .kc-sal .error{color:#b91c1c;padding:4px}',
    '#calcPanel.kc .kc-sal .vacio{color:#64748b;padding:4px}',
    '#calcPanel.kc .kc-sal details{font-size:12px;color:#475569;margin-top:4px}',
    '#calcPanel.kc .kc-sal summary{cursor:pointer;padding:3px 0}',
    '#calcPanel.kc .kc-tabla{max-height:230px;overflow:auto;margin-top:4px}',
    '#calcPanel.kc .kc-tabla table{width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums}',
    '#calcPanel.kc .kc-tabla th,#calcPanel.kc .kc-tabla td{padding:3px 6px;text-align:right;border-bottom:1px solid #e2e8f0;white-space:nowrap}',
    '#calcPanel.kc .kc-tabla th{color:#64748b;position:sticky;top:0;background:#f8fafc}',
    '#calcPanel.kc .kc-ansmsg{font-size:11px;color:#15803d;min-height:13px;text-align:right}',
    '#calcPanel.kc .kc-st .md{color:#1e3a8a;font-weight:800}',
    '#calcPanel.kc .kc-scr{height:214px;display:flex;flex-direction:column;padding:2px 6px 0;font-size:13.5px;line-height:1.35}',
    '#calcPanel.kc .kc-lst{flex:1 1 auto;min-height:0;overflow:auto;position:relative}',
    '#calcPanel.kc .kc-scr .e{color:#1e3a8a;word-break:break-all;cursor:pointer;border-radius:3px}',
    '#calcPanel.kc .kc-scr .r{text-align:right;font-weight:700;cursor:pointer;border-radius:3px;margin-bottom:2px;word-break:break-all}',
    '#calcPanel.kc .kc-scr .e:hover,#calcPanel.kc .kc-scr .r:hover{background:rgba(30,58,138,.12)}',
    '#calcPanel.kc .kc-scr .sto{color:#c2410c}',
    '#calcPanel.kc .kc-scr .err{text-align:right;color:#b91c1c;font-weight:700;font-size:12px}',
    '#calcPanel.kc .kc-scr .in{color:#1e3a8a;word-break:break-all;min-height:19px}',
    '#calcPanel.kc .kc-scr .pv{text-align:right;color:#4b5563;font-size:12px;min-height:16px}',
    '#calcPanel.kc .kc-scr .pf{color:#c2410c}',
    '#calcPanel.kc .kc-scr .bs{font-size:10px;font-weight:400;color:#4b5563}',
    '#calcPanel.kc .kc-scr .mres{display:flex;justify-content:flex-end}',
    '#calcPanel.kc .kc-scr .tt{font-weight:800;color:#1e3a8a;padding:0 2px 1px;border-bottom:1px solid #9aa58f;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#calcPanel.kc .kc-scr .big{font-weight:700;color:#1e3a8a;padding:14px 4px}',
    '#calcPanel.kc .kc-scr .fr{display:flex;justify-content:space-between;gap:8px;padding:0 4px;cursor:pointer;white-space:nowrap;color:#111827}',
    '#calcPanel.kc .kc-scr .fr span{overflow:hidden;text-overflow:ellipsis}',
    '#calcPanel.kc .kc-scr .fr.sel{background:#1e3a8a;color:#e9efd9}',
    '#calcPanel.kc .kc-scr .fr u{text-decoration:none;background:#1e3a8a;color:#e9efd9;padding:0 1px}',
    '#calcPanel.kc .kc-scr .fr.sel u{background:#e9efd9;color:#1e3a8a}',
    '#calcPanel.kc .kc-scr .dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px}',
    '#calcPanel.kc .kc-gr{border-collapse:collapse;font-size:12px;margin:2px 0 2px auto}',
    '#calcPanel.kc .kc-gr td{border:1px solid #9aa58f;padding:0 5px;min-width:40px;text-align:right;cursor:pointer;white-space:nowrap}',
    '#calcPanel.kc .kc-gr,#calcPanel.kc .kc-gr tr,#calcPanel.kc .kc-gr th,#calcPanel.kc .kc-gr td{background:transparent;box-shadow:none;width:auto}',
    '#calcPanel.kc .kc-gr td.sel{background:#1e3a8a;color:#e9efd9}',
    '#calcPanel.kc .kc-gr th{font-size:10px;color:#c2410c;font-weight:700;padding:0 4px}',
    '#calcPanel.kc .kc-cv{width:100%;display:block;border:1px solid #9aa58f;background:rgba(255,255,255,.3)}',
    '#calcPanel.kc .grafw{overflow:hidden}',
    '#calcPanel.kc .trz{font-size:12px;font-weight:700;color:#111827}',
    '#calcPanel.kc .kc-fl{display:grid;grid-template-columns:repeat(6,1fr);gap:3px;padding:3px 6px 5px}',
    '#calcPanel.kc .kc-fl span{height:16px;font-size:10px;font-weight:800;text-align:center;line-height:16px;background:#1e3a8a;color:#e9efd9;border-radius:2px;cursor:pointer;overflow:hidden;white-space:nowrap}',
    '#calcPanel.kc .kc-fl span:empty{background:transparent;cursor:default}',
    '#calcPanel.kc .kc-fl span.sub{border-radius:2px 9px 2px 2px}',
    '#calcPanel.kc .kc-fl span.on{background:#ea580c}',
    '#calcPanel.kc .kc-menu .mt{display:flex;align-items:center;gap:6px;font-weight:800;color:#1e3a8a;font-size:13px;margin:1px 0 4px}',
    '#calcPanel.kc .kc-menu .mt span{flex:1;height:9px;background:repeating-linear-gradient(135deg,#ea580c 0 2px,transparent 2px 5px)}',
    '#calcPanel.kc .kc-menu .mg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '#calcPanel.kc .kc-menu .tile{position:relative;height:54px;border:2px solid #1e3a8a;border-radius:3px;cursor:pointer;background:rgba(255,255,255,.35)}',
    '#calcPanel.kc .kc-menu .tile .tn{position:absolute;top:0;left:3px;font-size:11px;font-weight:800;color:#1e3a8a}',
    '#calcPanel.kc .kc-menu .tile svg{position:absolute;left:3px;bottom:3px;width:40px;height:28px}',
    '#calcPanel.kc .kc-menu .tile .tk{position:absolute;right:2px;bottom:0;font-size:10px;font-weight:800;color:#15803d}',
    '#calcPanel.kc .kc-menu .tile.sel{background:#1e3a8a}',
    '#calcPanel.kc .kc-menu .tile.sel .tn,#calcPanel.kc .kc-menu .tile.sel .tk{color:#e9efd9}',
    '#calcPanel.kc .kc-menu .tile.sel svg{background:#e9efd9;border-radius:2px}',
    '#calcPanel.kc .kc-menu .tile.opt .on{position:absolute;left:4px;top:20px;font-size:12px;font-weight:800;color:#1e3a8a}',
    '#calcPanel.kc .kc-menu .tile.opt .tn{display:none}',
    '#calcPanel.kc .kc-menu .tile.opt.sel .on{color:#e9efd9}',
    '#calcPanel.kc .kc-fk,#calcPanel.kc .kc-ctl{display:grid;gap:4px;padding:2px 8px 3px;background:#fff}',
    '#calcPanel.kc .kc-fk{grid-template-columns:repeat(6,1fr)}',
    '#calcPanel.kc .kc-ctl{grid-template-columns:repeat(8,1fr)}',
    '#calcPanel.kc .kc-fk button,#calcPanel.kc .kc-ctl button{position:relative;border:0;border-radius:6px;padding:12px 0 4px;font:inherit;font-size:11px;font-weight:700;cursor:pointer;color:#fff;line-height:1.1}',
    '#calcPanel.kc .kc-fk button{background:#111827;padding:7px 0}',
    '#calcPanel.kc .kc-ctl button{background:#334155}',
    '#calcPanel.kc .kc-ctl button.sh{background:#c2410c}',
    '#calcPanel.kc .kc-ctl button.alp{background:#b91c1c}',
    '#calcPanel.kc .kc-ctl button.ar{background:#475569}',
    '#calcPanel.kc .kc-ctl button .s2{position:absolute;top:1px;left:3px;font-size:8px;font-weight:700;color:#fb923c;white-space:nowrap}',
    '#calcPanel.kc.s .kc-ctl button .s2{color:#fff;background:#c2410c;border-radius:3px;padding:0 2px}',
    '#calcPanel.kc .kc-fk button:active,#calcPanel.kc .kc-ctl button:active{transform:scale(.96)}',
    '#calcPanel.kc .calc-close{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:36px;margin:-9px -12px -9px 0;font-size:19px;line-height:1;cursor:pointer;touch-action:manipulation}',
    '@media (max-width:520px){#calcPanel.kc .kc-campos{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- cerrar: en el móvil el ✕ era una diana de 12 px y el dedo caía en la cabecera (que arrastra) ---------- */
  var cerrar = document.getElementById('calcClose');
  if(cerrar){
    cerrar.setAttribute('role', 'button'); cerrar.setAttribute('aria-label', 'Cerrar la calculadora'); cerrar.title = 'Cerrar';
    cerrar.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    cerrar.addEventListener('pointerup', function(e){ e.stopPropagation(); e.preventDefault(); panel.classList.add('hidden'); });
  }

  /* ---------- montaje ---------- */
  [].slice.call(panel.children).forEach(function(n){ if(n !== head) n.remove(); });
  panel.classList.add('kc');
  var tabs = document.createElement('div'); tabs.className = 'kc-tabs';
  tabs.innerHTML = '<button type="button" data-m="sci">Científica</button><button type="button" data-m="fin">Financiera</button>';
  var body = document.createElement('div'); body.className = 'kc-body';
  var sci = document.createElement('div');
  sci.innerHTML = '<div class="kc-lcd"><div class="kc-st"><span class="s">S</span><span class="a">A</span><span class="md"></span><span class="ang" title="Set up: ángulo y formato"></span><span class="sp"></span><span class="ansv"></span></div><div class="kc-scr"></div><div class="kc-fl"></div></div>' +
    '<div class="kc-mem"></div><div class="kc-fk"></div><div class="kc-ctl"></div><div class="kc-keys"></div>' +
    '<div class="kc-nota"><b>MENU</b> abre los 12 modos de la Casio (flechas + EXE, o 1–9, A, B, C). Escribe la operación y pulsa <b>EXE</b>; <b>AC</b> borra la línea y, otra vez, toda la pantalla. <b>→</b> guarda en una memoria (25→A); <b>ALPHA</b> + tecla escribe la letra roja; <b>SHIFT</b> da la función naranja. <b>F1–F6</b> son las teclas del menú de abajo de la pantalla. <b>EXIT</b> vuelve atrás.</div>';
  var fin = document.createElement('div'); fin.className = 'kc-fin';
  fin.innerHTML = '<select class="kc-sel" aria-label="Cálculo"></select><div class="kc-ayuda"></div><div class="kc-campos"></div><div class="kc-sal"></div><div class="kc-ansmsg"></div>' +
    '<div class="kc-ayuda" style="font-size:11px;color:#64748b">Cada casilla admite operaciones (1500*12), las memorias (A…Z) y Ans. Pulsa un resultado para guardarlo en Ans. Los impuestos vienen con los porcentajes habituales: compruébalos con tu bróker o tu declaración.</div>';
  body.appendChild(sci); body.appendChild(fin);
  panel.appendChild(tabs); panel.appendChild(body);
  function q(el, s){ return el.querySelector(s); }
  var memBox = q(sci, '.kc-mem'), keysBox = q(sci, '.kc-keys');

  /* ---------- estado ---------- */
  var H = lee(LS.hist, []); if(!Array.isArray(H)) H = [];
  H = H.filter(function(h){ return h && typeof h.e === 'string' && typeof h.r === 'number'; });
  var MEM = lee(LS.mem, {}) || {};
  var ans = +lee(LS.ans, 0) || 0;
  var ang = lee(LS.ang, 'deg'); if(['deg','rad','gra'].indexOf(ang) < 0) ang = 'deg';
  var modo = lee(LS.modo, 'sci') === 'fin' ? 'fin' : 'sci';
  var CS = lee(LS.casio, {}) || {};
  var DYNA_DEF = ['AX+B', 'A(X+B)²+C', 'AX²+BX+C', 'AX^3+BX²+CX+D', 'Asin(BX+C)', 'Acos(BX+C)', 'Atan(BX+C)'];
  (function(){
    if(!CS.disp || ['n','f','s'].indexOf(CS.disp.t) < 0) CS.disp = {t:'n', d:0};
    if(['d','h','b','o'].indexOf(CS.base) < 0) CS.base = 'd';
    if(!Array.isArray(CS.sd)) CS.sd = [];
    if(!Array.isArray(CS.reg)) CS.reg = [];
    if(['LIN','LOG','EXP','PWR'].indexOf(CS.regT) < 0) CS.regT = 'LIN';
    if(!CS.mat || typeof CS.mat !== 'object') CS.mat = {};
    if(!Array.isArray(CS.y) || CS.y.length !== 6) CS.y = [0,1,2,3,4,5].map(function(i){ return {e:'', on:true, c:i % 3}; });
    if(!CS.rng) CS.rng = {x0:-4.7, x1:4.7, xs:1, y0:-3.1, y1:3.1, ys:1};
    if(!CS.tbl) CS.tbl = {s:-3, e:3, p:1};
    if(!Array.isArray(CS.dyf) || !CS.dyf.length) CS.dyf = DYNA_DEF.slice();
    if(typeof CS.dyi !== 'number') CS.dyi = 0;
    if(!/^[A-Z]$/.test(CS.dyv || '')) CS.dyv = 'A';
    if(!CS.dyr) CS.dyr = {s:1, e:5, p:1};
    if(!CS.eq) CS.eq = {};
    if(!CS.eq.s) CS.eq.s = {}; if(!CS.eq.p) CS.eq.p = {};
    if(typeof CS.lcd !== 'number') CS.lcd = 0;
  })();
  function gCS(){ guarda(LS.casio, CS); }
  var P = [], cur = 0;              /* la operación en curso: trozos (una tecla = un trozo) y posición del cursor */
  var hecho = false, errMsg = '', shift = false, alpha = false, alphaLock = false, replay = -1, flash = '';
  var ROLL = {sd:[], reg:[], mat:[], base:[]};     /* lo calculado en cada modo (como la Casio, no se guarda al cerrar) */
  /* S: pantalla actual. pant = 'menu' o el id del modo; vista = 'setup', 'setedit' o la vista propia del modo; fm = menú de teclas F */
  var S = {pant: CS.pant && CS.pant !== 'menu' ? CS.pant : 'comp', vista:'run', fm:'root', menuSel:0, conf:null, confT:0};
  var SOH = '\u0001';             /* los trozos que empiezan así son símbolos de un modo (x̄, Mat A, Det…) */

  /* ---------- formato es-ES ---------- */
  function miles(ent){ return ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmt(x){                                   /* resultado en pantalla: 10 cifras, como la Casio; Fix/Sci según el set up */
    if(typeof x !== 'number' || !isFinite(x)) return 'Error';
    var D = (CS && CS.disp) || {t:'n'};
    if(D.t === 'f' && Math.abs(x) < 1e15){
      var sf = Math.abs(x).toFixed(D.d).split('.'), cero = +Math.abs(x).toFixed(D.d) === 0;
      return (x < 0 && !cero ? '−' : '') + miles(sf[0]) + (sf[1] ? ',' + sf[1] : '');
    }
    if(D.t === 's'){
      var k = D.d || 10, te = Math.abs(x).toExponential(k - 1).split('e');
      return (x < 0 ? '−' : '') + te[0].replace('.', ',') + 'ᴇ' + (+te[1]);
    }
    var r = +x.toPrecision(10); if(Object.is(r, -0)) r = 0;
    var a = Math.abs(r);
    if(a >= 1e12 || (a !== 0 && a < 1e-6)){
      var t = r.toExponential(9).split('e'); var m = t[0].replace(/\.?0+$/, '');
      return (r < 0 ? '−' : '') + m.replace('-', '').replace('.', ',') + 'ᴇ' + (+t[1]);
    }
    var p = String(a).split('.');
    return (r < 0 ? '−' : '') + miles(p[0]) + (p[1] ? ',' + p[1] : '');
  }
  function num(x){                                   /* para meter un valor en la operación */
    var r = +x.toPrecision(12); if(Object.is(r, -0)) r = 0;
    var s = String(Math.abs(r)).replace('.', ',').replace(/e\+?/, 'ᴇ').replace('ᴇ-', 'ᴇ−');
    return r < 0 ? '(−' + s + ')' : s;
  }

  /* ---------- símbolos especiales de los modos ---------- */
  var SP = {
    xbar:{d:'x̄'}, xsn:{d:'xσn'}, xsn1:{d:'xσn−1'}, sx2:{d:'Σx²'}, sx:{d:'Σx'}, nn:{d:'n'},
    ybar:{d:'ȳ'}, ysn:{d:'yσn'}, ysn1:{d:'yσn−1'}, sy2:{d:'Σy²'}, sy:{d:'Σy'}, sxy:{d:'Σxy'},
    rA:{d:'A'}, rB:{d:'B'}, rr:{d:'r'}, xhat:{d:'x̂'}, yhat:{d:'ŷ'},
    mod:{d:'Mod'}, med:{d:'Med'}, max:{d:'Max'}, min:{d:'Min'},
    pP:{d:'P('}, pQ:{d:'Q('}, pR:{d:'R('}, pt:{d:'t('},
    det:{d:'Det '}, trn:{d:'Trn '}, matAns:{d:'Mat Ans'},
    bd:{d:'d'}, bh:{d:'h'}, bb:{d:'b'}, bo:{d:'o'},
    neg:{d:'Neg '}, not:{d:'Not '}, and:{d:' and '}, or:{d:' or '}, xor:{d:' xor '}, xnor:{d:' xnor '}
  };
  'ABCDEF'.split('').forEach(function(L){ SP['mat' + L] = {d:'Mat ' + L}; });
  function esSP(p){ return typeof p === 'string' && p.charAt(0) === SOH; }
  function dispP(p){ return esSP(p) ? (SP[p.slice(1)] ? SP[p.slice(1)].d : '?') : p; }
  function txtP(a){ return a.map(dispP).join(''); }
  function sp(id){ return SOH + id; }

  /* ---------- estadística (SD y REG) ---------- */
  function sdStats(){
    var L = CS.sd.filter(function(d){ return isFinite(d[0]) && d[1] > 0; });
    var n = 0, sx = 0, sx2 = 0;
    L.forEach(function(d){ n += d[1]; sx += d[1] * d[0]; sx2 += d[1] * d[0] * d[0]; });
    if(!n) throw 'mat';
    var m = sx / n, v = 0; L.forEach(function(d){ v += d[1] * (d[0] - m) * (d[0] - m); });
    var ord = []; L.forEach(function(d){ for(var k = 0; k < Math.max(1, Math.round(d[1])); k++) ord.push(d[0]); }); ord.sort(function(a, b){ return a - b; });
    var N = ord.length, med = N % 2 ? ord[(N - 1) / 2] : (ord[N / 2 - 1] + ord[N / 2]) / 2;
    var cnt = {}, best = null; ord.forEach(function(x){ cnt[x] = (cnt[x] || 0) + 1; if(best === null || cnt[x] > cnt[best]) best = x; });
    return {n:n, sx:sx, sx2:sx2, xbar:m, xsn:Math.sqrt(v / n), xsn1:n > 1 ? Math.sqrt(v / (n - 1)) : NaN, med:med, mod:best, max:ord[N - 1], min:ord[0]};
  }
  function regStats(){
    var L = CS.reg.filter(function(d){ return isFinite(d[0]) && isFinite(d[1]); });
    var n = L.length; if(!n) throw 'mat';
    var o = {n:n, sx:0, sx2:0, sy:0, sy2:0, sxy:0};
    L.forEach(function(d){ o.sx += d[0]; o.sx2 += d[0] * d[0]; o.sy += d[1]; o.sy2 += d[1] * d[1]; o.sxy += d[0] * d[1]; });
    o.xbar = o.sx / n; o.ybar = o.sy / n;
    o.xsn = Math.sqrt(Math.max(0, o.sx2 / n - o.xbar * o.xbar)); o.ysn = Math.sqrt(Math.max(0, o.sy2 / n - o.ybar * o.ybar));
    o.xsn1 = n > 1 ? o.xsn * Math.sqrt(n / (n - 1)) : NaN; o.ysn1 = n > 1 ? o.ysn * Math.sqrt(n / (n - 1)) : NaN;
    /* regresión en el espacio transformado según el tipo (LIN, LOG, EXP, PWR) */
    var T = CS.regT, X = function(x){ return (T === 'LOG' || T === 'PWR') ? Math.log(x) : x; }, Y = function(y){ return (T === 'EXP' || T === 'PWR') ? Math.log(y) : y; };
    var a = 0, b = 0, c = 0, d2 = 0, e = 0, ok = true;
    L.forEach(function(d){ var u = X(d[0]), w = Y(d[1]); if(!isFinite(u) || !isFinite(w)) ok = false; a += u; b += w; c += u * u; d2 += w * w; e += u * w; });
    if(!ok) o.err = true;
    else {
      var den = n * c - a * a;
      if(Math.abs(den) < 1e-300) o.err = true;
      else {
        o.B = (n * e - a * b) / den; var A0 = (b - o.B * a) / n;
        o.A = (T === 'EXP' || T === 'PWR') ? Math.exp(A0) : A0;
        var dr = Math.sqrt(den * (n * d2 - b * b)); o.r = dr ? (n * e - a * b) / dr : NaN;
      }
    }
    return o;
  }
  function regY(x){ var o = regStats(); if(o.err) throw 'mat'; var T = CS.regT;
    return T === 'LIN' ? o.A + o.B * x : T === 'LOG' ? o.A + o.B * Math.log(x) : T === 'EXP' ? o.A * Math.exp(o.B * x) : o.A * Math.pow(x, o.B); }
  function regX(y){ var o = regStats(); if(o.err || !o.B) throw 'mat'; var T = CS.regT;
    return T === 'LIN' ? (y - o.A) / o.B : T === 'LOG' ? Math.exp((y - o.A) / o.B) : T === 'EXP' ? Math.log(y / o.A) / o.B : Math.pow(y / o.A, 1 / o.B); }
  function Phi(t){                                   /* normal estándar acumulada (Abramowitz-Stegun 26.2.17) */
    var z = Math.abs(t), k = 1 / (1 + 0.2316419 * z);
    var pz = 1 - Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) * k * (0.319381530 + k * (-0.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429))));
    return t >= 0 ? pz : 1 - pz;
  }
  function valorSP(id){
    if(/^(xbar|xsn|xsn1|sx2|sx|nn|mod|med|max|min)$/.test(id) && S.pant !== 'reg'){
      var s = sdStats(); var m = {nn:'n'}; var v = s[m[id] || id]; if(typeof v !== 'number' || !isFinite(v)) throw 'mat'; return v;
    }
    var o = regStats(); var k = {nn:'n', rA:'A', rB:'B', rr:'r'}[id] || id;
    if(/^(rA|rB|rr)$/.test(id) && o.err) throw 'mat';
    var w = o[k]; if(typeof w !== 'number' || !isFinite(w)) throw 'mat'; return w;
  }

  /* ---------- analizador (sin eval) ---------- */
  var FUN = ['asin','acos','atan','sin','cos','tan','sqrt','abs','log','ln'];
  function tokTxt(t, out){
    var i = 0;
    while(i < t.length){
      var c = t[i];
      if(c === ' ' || c === ' '){ i++; continue; }
      if(/[0-9.,]/.test(c) || (c === 'ᴇ')){
        var j = i, m = '';
        while(j < t.length && /[0-9.,]/.test(t[j])) m += t[j++];
        if((m.match(/[.,]/g) || []).length > 1) throw 'sin';
        var v = m ? parseFloat(m.replace(',', '.')) : 1;
        if(m === '.' || m === ',') throw 'sin';
        if(t[j] === 'ᴇ'){
          j++; var sg = 1; if(t[j] === '−' || t[j] === '-'){ sg = -1; j++; } else if(t[j] === '+') j++;
          var ex = ''; while(j < t.length && /[0-9]/.test(t[j])) ex += t[j++];
          if(!ex) throw 'sin'; v = v * Math.pow(10, sg * +ex);
        }
        out.push({t:'n', v:v}); i = j; continue;
      }
      if(/[A-Za-z]/.test(c)){
        var run = ''; var j2 = i; while(j2 < t.length && /[A-Za-z]/.test(t[j2])) run += t[j2++];
        var k = 0;
        while(k < run.length){
          var rest = run.slice(k), hit = null;
          if(/^Ans/.test(rest)){ out.push({t:'n', v:ans}); k += 3; continue; }
          for(var f = 0; f < FUN.length; f++){ if(rest.indexOf(FUN[f]) === 0){ hit = FUN[f]; break; } }
          if(hit){
            k += hit.length;
            if(k === run.length && t.slice(i + k, i + k + 2) === '⁻¹' && /^(sin|cos|tan)$/.test(hit)){ hit = 'a' + hit; i += 2; }
            out.push({t:'f', f:hit}); continue;
          }
          var L = rest[0].toUpperCase();
          out.push({t:'n', v:(typeof MEM[L] === 'number' ? MEM[L] : 0), mem:L}); k++;
        }
        i += run.length; continue;
      }
      if(t.slice(i, i + 2) === 'ˣ√'){ out.push({t:'ˣ√'}); i += 2; continue; }
      if(t.slice(i, i + 2) === '⁻¹'){ out.push({t:'⁻¹'}); i += 2; continue; }
      if(c === 'π'){ out.push({t:'n', v:Math.PI}); i++; continue; }
      if(t.codePointAt(i) === 0x1D452){ out.push({t:'n', v:Math.E}); i += 2; continue; }
      var MAP = {'-':'−', '*':'×', '/':'÷', '·':'×'};
      if(MAP[c]){ out.push({t:MAP[c]}); i++; continue; }
      if('+−×÷^()√∛%²!→;'.indexOf(c) >= 0){ out.push({t:c}); i++; continue; }
      throw 'sin';
    }
    return out;
  }
  function tokens(src){
    var arr = typeof src === 'string' ? [src] : src, out = [], buf = '';
    arr.forEach(function(p){
      if(!esSP(p)){ buf += p; return; }
      if(buf){ tokTxt(buf, out); buf = ''; }
      var id = p.slice(1);
      if(id === 'xhat' || id === 'yhat') out.push({t:id});
      else if(/^p[PQRt]$/.test(id)){ out.push({t:'f', f:id}); out.push({t:'('}); }
      else if(SP[id] && /^(xbar|xsn|xsn1|sx2|sx|nn|ybar|ysn|ysn1|sy2|sy|sxy|rA|rB|rr|mod|med|max|min)$/.test(id)) out.push({t:'n', v:valorSP(id)});
      else throw 'sin';
    });
    if(buf) tokTxt(buf, out);
    return out;
  }
  function angF(){ return ang === 'deg' ? Math.PI / 180 : ang === 'gra' ? Math.PI / 200 : 1; }
  function trig(f, x){
    var r, g = angF();
    if(f === 'sin') r = Math.sin(x * g); else if(f === 'cos') r = Math.cos(x * g);
    else if(f === 'tan'){ if(ang === 'deg' && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) return NaN; r = Math.tan(x * g); }
    else if(f === 'asin') r = Math.asin(x) / g; else if(f === 'acos') r = Math.acos(x) / g; else r = Math.atan(x) / g;
    return Math.abs(r) < 1e-13 ? 0 : r;
  }
  function fact(n){ if(n < 0 || n % 1 || n > 170) return NaN; var r = 1; for(var k = 2; k <= n; k++) r *= k; return r; }
  function raizN(n, y){ if(n === 0) return NaN; if(y < 0 && Math.abs(n % 2) === 1) return -Math.pow(-y, 1 / n); return Math.pow(y, 1 / n); }
  /* Devuelve {v, sto}. Lanza 'sin' (sintaxis) o 'mat' (matemático). */
  function analiza(src){
    var T = tokens(src), p = 0;
    function mira(){ return T[p]; }
    function empieza(tk){ return tk && (tk.t === 'n' || tk.t === '(' || tk.t === 'f' || tk.t === '√' || tk.t === '∛'); }
    function expr(){
      var a = term();
      while(mira() && (mira().t === '+' || mira().t === '−')){
        var o = T[p++].t, b = term();
        var bv = b.pct ? a.v * b.v : b.v;          /* 200 + 10 % → 200 + 200 × 0,10 */
        a = {v: o === '+' ? a.v + bv : a.v - bv};
      }
      return a;
    }
    function term(){
      var a = imp();
      while(mira() && (mira().t === '×' || mira().t === '÷')){
        var o = T[p++].t, b = imp();
        a = {v: o === '×' ? a.v * b.v : (b.v === 0 ? NaN : a.v / b.v)};
      }
      return a;
    }
    function imp(){ var a = una(); while(empieza(mira())){ var b = una(); a = {v: a.v * b.v}; } return a; }
    function una(){
      var tk = mira();
      if(tk && tk.t === '−'){ p++; var a = una(); return {v: -a.v, pct: a.pct}; }
      if(tk && tk.t === '+'){ p++; return una(); }
      return pot();
    }
    function pot(){
      var b = post();
      if(mira() && mira().t === '^'){ p++; var e = una(); return {v: Math.pow(b.v, e.v)}; }
      if(mira() && mira().t === 'ˣ√'){ p++; var y = una(); return {v: raizN(b.v, y.v)}; }
      return b;
    }
    function post(){
      var a = prim();
      while(mira() && /^(%|²|⁻¹|!|xhat|yhat)$/.test(mira().t)){
        var o = T[p++].t;
        if(o === '%') a = {v: a.v / 100, pct: true};
        else if(o === '²') a = {v: a.v * a.v};
        else if(o === '⁻¹') a = {v: a.v === 0 ? NaN : 1 / a.v};
        else if(o === 'xhat') a = {v: regX(a.v)};
        else if(o === 'yhat') a = {v: regY(a.v)};
        else a = {v: fact(a.v)};
      }
      return a;
    }
    function arg(){
      if(mira() && mira().t === '('){ p++; var a = expr(); if(mira() && mira().t === ')') p++; return a.v; }
      return pot().v;
    }
    function prim(){
      var tk = mira(); if(!tk) throw 'sin';
      if(tk.t === 'n'){ p++; return {v: tk.v}; }
      if(tk.t === '('){ p++; var a = expr(); if(mira() && mira().t === ')') p++; return {v: a.v}; }
      if(tk.t === '√'){ p++; return {v: Math.sqrt(arg())}; }
      if(tk.t === '∛'){ p++; return {v: Math.cbrt(arg())}; }
      if(tk.t === 'f'){ p++; var x = arg(), f = tk.f;
        if(f === 'sqrt') return {v: Math.sqrt(x)};
        if(f === 'abs') return {v: Math.abs(x)};
        if(f === 'log') return {v: Math.log10(x)};
        if(f === 'ln') return {v: Math.log(x)};
        if(f === 'pP') return {v: Phi(x)};
        if(f === 'pQ') return {v: Phi(Math.abs(x)) - 0.5};
        if(f === 'pR') return {v: 1 - Phi(x)};
        if(f === 'pt'){ var s = sdStats(); if(!s.xsn) throw 'mat'; return {v: (x - s.xbar) / s.xsn}; }
        return {v: trig(f, x)}; }
      throw 'sin';
    }
    if(!T.length) throw 'sin';
    var r = expr(), sto = null;
    if(mira() && mira().t === '→'){
      p++; var m = mira(); if(!m || m.mem === undefined) throw 'sin'; sto = m.mem; p++;
    }
    if(p < T.length) throw 'sin';
    if(typeof r.v !== 'number' || !isFinite(r.v)) throw 'mat';
    return {v: r.v, sto: sto};
  }
  /* número de una casilla (modo financiero): NaN si no se entiende */
  function evalNum(s){ try{ var r = analiza(s); if(r.sto) return NaN; return r.v; }catch(e){ return NaN; } }
  function conX(e, x, extra){                       /* f(x) para gráficas y tablas: X (y la variable dinámica) temporales */
    var guardaV = {}; var vars = Object.assign({X:x}, extra || {});
    Object.keys(vars).forEach(function(k){ guardaV[k] = MEM.hasOwnProperty(k) ? MEM[k] : undefined; MEM[k] = vars[k]; });
    try{ return analiza(trozos(e)).v; }catch(_){ return NaN; }
    finally{ Object.keys(guardaV).forEach(function(k){ if(guardaV[k] === undefined) delete MEM[k]; else MEM[k] = guardaV[k]; }); }
  }

  /* ---------- BASE-N: enteros de 32 bits ---------- */
  var BASES = {d:10, h:16, b:2, o:8}, BNOM = {d:'Dec', h:'Hex', b:'Bin', o:'Oct'};
  function i32(v){ v = Math.trunc(v); if(!isFinite(v) || Math.abs(v) > 4294967295) throw 'mat'; return v | 0; }
  function enBase(v, b){
    if(b === 'd') return String(v);
    var u = (v >>> 0).toString(BASES[b]).toUpperCase();
    var w = b === 'h' ? 8 : b === 'o' ? 11 : 32;
    if(b === 'b' && v >= 0 && v < 65536) w = 16;
    while(u.length < w) u = '0' + u;
    return b === 'b' ? u.replace(/(.{4})(?=.)/g, '$1 ') : u;
  }
  function baseCalc(arr){
    var T = [], buf = '', pref = null;
    function lit(raw){
      var b = pref || CS.base, R = BASES[b]; pref = null;
      var ok = {10:/^[0-9]+$/, 16:/^[0-9A-F]+$/, 2:/^[01]+$/, 8:/^[0-7]+$/}[R];
      if(!ok.test(raw)) throw 'sin';
      var v = parseInt(raw, R); if(v > 4294967295) throw 'mat';
      if(b !== 'd' && v > 2147483647) v = v - 4294967296;
      T.push({t:'n', v:v});
    }
    function txt(s){
      var i = 0;
      while(i < s.length){
        var c = s[i];
        if(c === ' '){ i++; continue; }
        if(s.slice(i, i + 3) === 'Ans'){ T.push({t:'n', v:i32(ans)}); i += 3; continue; }
        if(/[0-9A-Fa-f]/.test(c)){ var j = i, m = ''; while(j < s.length && /[0-9A-Fa-f]/.test(s[j])) m += s[j++]; lit(m.toUpperCase()); i = j; continue; }
        var MAP = {'-':'−', '*':'×', '/':'÷'}; c = MAP[c] || c;
        if('+−×÷()'.indexOf(c) >= 0){ T.push({t:c}); i++; continue; }
        throw 'sin';
      }
    }
    arr.forEach(function(p){
      if(!esSP(p)){ buf += p; return; }
      if(buf){ txt(buf); buf = ''; }
      var id = p.slice(1);
      if(/^b[dhbo]$/.test(id)) pref = id[1];
      else if(/^(neg|not|and|or|xor|xnor)$/.test(id)) T.push({t:id});
      else throw 'sin';
    });
    if(buf) txt(buf);
    var p = 0;
    function mira(){ return T[p]; }
    function lor(){ var a = land(); while(mira() && /^(or|xor|xnor)$/.test(mira().t)){ var o = T[p++].t, b = land(); a = o === 'or' ? (a | b) : o === 'xor' ? (a ^ b) : ~(a ^ b); } return a; }
    function land(){ var a = suma(); while(mira() && mira().t === 'and'){ p++; a = a & suma(); } return a; }
    function suma(){ var a = mul(); while(mira() && (mira().t === '+' || mira().t === '−')){ var o = T[p++].t, b = mul(); a = i32(o === '+' ? a + b : a - b); } return a; }
    function mul(){ var a = una(); while(mira() && (mira().t === '×' || mira().t === '÷' || mira().t === '(' || mira().t === 'n')){ var tk = mira(); if(tk.t === '×' || tk.t === '÷') p++; var b = una(); if(tk.t === '÷'){ if(b === 0) throw 'mat'; a = i32(a / b); } else a = i32(a * b); } return a; }
    function una(){ var tk = mira(); if(!tk) throw 'sin';
      if(tk.t === '−' || tk.t === 'neg'){ p++; return i32(-una()); }
      if(tk.t === 'not'){ p++; return ~una(); }
      if(tk.t === '+'){ p++; return una(); }
      if(tk.t === 'n'){ p++; return tk.v; }
      if(tk.t === '('){ p++; var a = lor(); if(mira() && mira().t === ')') p++; return a; }
      throw 'sin'; }
    if(!T.length) throw 'sin';
    var r = lor(); if(p < T.length) throw 'sin';
    return {v: r | 0};
  }

  /* ---------- MAT: matrices A–F y Mat Ans ---------- */
  function mNueva(r, c){ var d = []; for(var k = 0; k < r * c; k++) d.push(0); return {r:r, c:c, d:d}; }
  function mGet(m, i, j){ return m.d[i * m.c + j]; }
  function mDet(m){ if(m.r !== m.c) throw 'dim'; var n = m.r, a = []; for(var i = 0; i < n; i++) a.push(m.d.slice(i * n, i * n + n));
    var det = 1; for(var c = 0; c < n; c++){ var pv = c; for(var r = c + 1; r < n; r++) if(Math.abs(a[r][c]) > Math.abs(a[pv][c])) pv = r;
      if(Math.abs(a[pv][c]) < 1e-14) return 0; if(pv !== c){ var t = a[pv]; a[pv] = a[c]; a[c] = t; det = -det; }
      det *= a[c][c]; for(var r2 = c + 1; r2 < n; r2++){ var f = a[r2][c] / a[c][c]; for(var k = c; k < n; k++) a[r2][k] -= f * a[c][k]; } }
    return det; }
  function mInv(m){ if(m.r !== m.c) throw 'dim'; var n = m.r, a = []; for(var i = 0; i < n; i++){ var row = m.d.slice(i * n, i * n + n); for(var k = 0; k < n; k++) row.push(i === k ? 1 : 0); a.push(row); }
    for(var c = 0; c < n; c++){ var pv = c; for(var r = c + 1; r < n; r++) if(Math.abs(a[r][c]) > Math.abs(a[pv][c])) pv = r;
      if(Math.abs(a[pv][c]) < 1e-14) throw 'mat'; var t = a[pv]; a[pv] = a[c]; a[c] = t;
      var d = a[c][c]; for(var k2 = 0; k2 < 2 * n; k2++) a[c][k2] /= d;
      for(var r3 = 0; r3 < n; r3++) if(r3 !== c){ var f = a[r3][c]; for(var k3 = 0; k3 < 2 * n; k3++) a[r3][k3] -= f * a[c][k3]; } }
    var o = mNueva(n, n); for(var i2 = 0; i2 < n; i2++) for(var j2 = 0; j2 < n; j2++) o.d[i2 * n + j2] = a[i2][n + j2]; return o; }
  function mMul(a, b){ if(a.c !== b.r) throw 'dim'; var o = mNueva(a.r, b.c);
    for(var i = 0; i < a.r; i++) for(var j = 0; j < b.c; j++){ var s = 0; for(var k = 0; k < a.c; k++) s += mGet(a, i, k) * mGet(b, k, j); o.d[i * b.c + j] = s; } return o; }
  function mTrn(m){ var o = mNueva(m.c, m.r); for(var i = 0; i < m.r; i++) for(var j = 0; j < m.c; j++) o.d[j * m.r + i] = mGet(m, i, j); return o; }
  function esM(v){ return v && typeof v === 'object' && v.d; }
  function matCalc(arr){
    if(!arr.some(function(p){ return esSP(p) && /^(mat[A-F]|matAns|det|trn)$/.test(p.slice(1)); })){ var r0 = analiza(arr); return {v:r0.v, sto:r0.sto}; }
    var T = [], buf = '';
    arr.forEach(function(p){
      if(!esSP(p)){ buf += p; return; }
      if(buf){ tokTxt(buf, T); buf = ''; }
      var id = p.slice(1);
      if(/^mat[A-F]$/.test(id)){ var M = CS.mat[id[3]]; if(!M) throw 'Mat ' + id[3] + ' no tiene dimensión'; T.push({t:'m', v:M}); }
      else if(id === 'matAns'){ if(!CS.matAns) throw 'Mat Ans está vacía'; T.push({t:'m', v:CS.matAns}); }
      else if(id === 'det' || id === 'trn') T.push({t:id});
      else throw 'sin';
    });
    if(buf) tokTxt(buf, T);
    var p = 0;
    function mira(){ return T[p]; }
    function op(a, b, o){
      if(!esM(a) && !esM(b)){ if(o === '+') return a + b; if(o === '−') return a - b; if(o === '×') return a * b; if(b === 0) throw 'mat'; return a / b; }
      if(o === '×'){ if(esM(a) && esM(b)) return mMul(a, b); var m = esM(a) ? a : b, k = esM(a) ? b : a; return {r:m.r, c:m.c, d:m.d.map(function(x){ return x * k; })}; }
      if(o === '÷'){ if(esM(a) && !esM(b)){ if(b === 0) throw 'mat'; return {r:a.r, c:a.c, d:a.d.map(function(x){ return x / b; })}; } throw 'dim'; }
      if(!esM(a) || !esM(b) || a.r !== b.r || a.c !== b.c) throw 'dim';
      return {r:a.r, c:a.c, d:a.d.map(function(x, i){ return o === '+' ? x + b.d[i] : x - b.d[i]; })};
    }
    function expr(){ var a = term(); while(mira() && (mira().t === '+' || mira().t === '−')){ var o = T[p++].t; a = op(a, term(), o); } return a; }
    function term(){ var a = una(); while(mira() && (/^[×÷]$/.test(mira().t) || /^(n|m|\(|det|trn)$/.test(mira().t))){ var o = '×'; if(/^[×÷]$/.test(mira().t)) o = T[p++].t; a = op(a, una(), o); } return a; }
    function una(){ var tk = mira(); if(tk && tk.t === '−'){ p++; return op(-1, una(), '×'); } if(tk && tk.t === '+'){ p++; return una(); }
      if(tk && tk.t === 'det'){ p++; var a = una(); if(!esM(a)) throw 'sin'; return mDet(a); }
      if(tk && tk.t === 'trn'){ p++; var b = una(); if(!esM(b)) throw 'sin'; return mTrn(b); }
      return post(); }
    function post(){ var a = prim();
      for(;;){ var tk = mira(); if(!tk) break;
        if(tk.t === '⁻¹'){ p++; a = esM(a) ? mInv(a) : (a === 0 ? (function(){ throw 'mat'; })() : 1 / a); continue; }
        if(tk.t === '²'){ p++; a = esM(a) ? mMul(a, a) : a * a; continue; }
        if(tk.t === '^'){ p++; var e = una(); if(esM(e)) throw 'sin'; if(esM(a)){ if(e !== Math.round(e) || e < 1) throw 'mat'; var r = a; for(var k = 1; k < e; k++) r = mMul(r, a); a = r; } else a = Math.pow(a, e); continue; }
        break; }
      return a; }
    function prim(){ var tk = mira(); if(!tk) throw 'sin';
      if(tk.t === 'n'){ p++; return tk.v; }
      if(tk.t === 'm'){ p++; return tk.v; }
      if(tk.t === '('){ p++; var a = expr(); if(mira() && mira().t === ')') p++; return a; }
      throw 'sin'; }
    var r = expr(); if(p < T.length) throw 'sin';
    if(esM(r)){ if(r.d.some(function(x){ return !isFinite(x); })) throw 'mat'; return {v:r, k:'mat'}; }
    if(!isFinite(r)) throw 'mat'; return {v:r};
  }

  /* ---------- ecuaciones ---------- */
  function resuelveSistema(n, d){                    /* d: n filas × (n+1) columnas */
    var a = []; for(var i = 0; i < n; i++) a.push(d.slice(i * (n + 1), i * (n + 1) + n + 1));
    for(var c = 0; c < n; c++){ var pv = c; for(var r = c + 1; r < n; r++) if(Math.abs(a[r][c]) > Math.abs(a[pv][c])) pv = r;
      if(Math.abs(a[pv][c]) < 1e-12) throw 'mat'; var t = a[pv]; a[pv] = a[c]; a[c] = t;
      for(var r2 = 0; r2 < n; r2++) if(r2 !== c){ var f = a[r2][c] / a[c][c]; for(var k = c; k <= n; k++) a[r2][k] -= f * a[c][k]; } }
    return a.map(function(row, i){ return row[n] / row[i]; });
  }
  function raicesPol(co){                            /* co = [a, b, c(, d)], grado 2 o 3; devuelve [{re, im}] */
    if(!co[0]) throw 'mat';
    if(co.length === 3){ var a = co[0], b = co[1], c = co[2], D = b * b - 4 * a * c;
      if(D >= 0){ var s = Math.sqrt(D); return [{re:(-b + s) / (2 * a), im:0}, {re:(-b - s) / (2 * a), im:0}]; }
      var s2 = Math.sqrt(-D) / (2 * a); return [{re:-b / (2 * a), im:s2}, {re:-b / (2 * a), im:-s2}]; }
    var A = co[1] / co[0], B = co[2] / co[0], C = co[3] / co[0];
    function f(z){ var re = z.re, im = z.im; var r2 = re * re - im * im, i2 = 2 * re * im; var r3 = r2 * re - i2 * im, i3 = r2 * im + i2 * re;
      return {re:r3 + A * r2 + B * re + C, im:i3 + A * i2 + B * im}; }
    var R = [{re:0.4, im:0.9}, {re:-0.65, im:0.72}, {re:0.81, im:-0.32}];
    for(var it = 0; it < 500; it++){
      for(var k = 0; k < 3; k++){ var num = f(R[k]), den = {re:1, im:0};
        for(var j = 0; j < 3; j++) if(j !== k){ var dr = R[k].re - R[j].re, di = R[k].im - R[j].im; var nr = den.re * dr - den.im * di, ni = den.re * di + den.im * dr; den = {re:nr, im:ni}; }
        var dd = den.re * den.re + den.im * den.im; if(!dd) continue;
        R[k] = {re:R[k].re - (num.re * den.re + num.im * den.im) / dd, im:R[k].im - (num.im * den.re - num.re * den.im) / dd}; } }
    return R.map(function(z){ var m = Math.max(1, Math.abs(z.re)); return {re:Math.abs(z.re) < 1e-11 ? 0 : z.re, im:Math.abs(z.im) < 1e-9 * m ? 0 : z.im}; })
      .sort(function(x, y){ return (x.im !== 0) - (y.im !== 0) || y.re - x.re; });
  }
  function fmtC(z){ if(!z.im) return fmt(z.re); if(!z.re) return (z.im < 0 ? '−' : '') + fmt(Math.abs(z.im)) + 'i'; return fmt(z.re) + (z.im < 0 ? ' − ' : ' + ') + fmt(Math.abs(z.im)) + 'i'; }

  /* ---------- trozos y recuperación ---------- */
  function trozos(s){
    var out = [], i = 0;
    while(i < s.length){
      var m = s.slice(i).match(/^(sin⁻¹\(|cos⁻¹\(|tan⁻¹\(|sin\(|cos\(|tan\(|log\(|ln\(|abs\(|10\^\(|Ans|ˣ√|⁻¹|𝑒\^\(|𝑒)/);
      if(m){ out.push(m[1]); i += m[1].length; continue; }
      out.push(s[i]); i++;
    }
    return out;
  }
  function piezasDe(h){ return Array.isArray(h.p) ? h.p.slice() : trozos(h.e); }

  /* ---------- confirmaciones (pulsar dos veces) ---------- */
  function confirma(k, msg, fn){
    if(S.conf === k && Date.now() - S.confT < 6000){ S.conf = null; fn(); return true; }
    S.conf = k; S.confT = Date.now(); errMsg = msg; return false;
  }

  /* ---------- pantallas ---------- */
  var COLS = ['#1d4ed8', '#ea580c', '#15803d'], COLN = ['Azul', 'Naranja', 'Verde'];
  var TILES = [
    {id:'comp', n:'COMP', k:'1'}, {id:'base', n:'BASE', k:'2'}, {id:'sd', n:'SD', k:'3'}, {id:'reg', n:'REG', k:'4'},
    {id:'mat', n:'MAT', k:'5'}, {id:'graph', n:'GRAPH', k:'6'}, {id:'dyna', n:'DYNA', k:'7'}, {id:'table', n:'TABLE', k:'8'},
    {id:'equa', n:'EQUA', k:'9'}, {id:'fin', n:'FIN', k:'A'}, {id:'mem', n:'MEM', k:'B'}, {id:'option', n:'OPTION', k:'C'}
  ];
  var ICO = {
    comp:'<text x="3" y="11" fill="#1e3a8a">×÷</text><text x="3" y="23" fill="#ea580c">+−</text>',
    base:'<text x="2" y="20" fill="#ea580c" font-size="15">2</text><text x="12" y="20" fill="#1e3a8a" font-size="12">8</text><text x="20" y="14" fill="#15803d" font-size="11">16</text>',
    sd:'<path d="M2 22 C10 22 11 4 18 4 C25 4 26 22 34 22" fill="none" stroke="#1e3a8a" stroke-width="1.6"/><path d="M18 4 V22" stroke="#ea580c" stroke-width="1"/>',
    reg:'<path d="M2 22 L34 3" stroke="#ea580c" stroke-width="1.6"/><circle cx="8" cy="16" r="1.6" fill="#1e3a8a"/><circle cx="15" cy="14" r="1.6" fill="#1e3a8a"/><circle cx="22" cy="8" r="1.6" fill="#1e3a8a"/><circle cx="29" cy="7" r="1.6" fill="#1e3a8a"/>',
    mat:'<text x="1" y="12" fill="#1e3a8a" font-size="10">[a b]</text><text x="1" y="23" fill="#1e3a8a" font-size="10">[c d]</text>',
    graph:'<path d="M1 14 H35 M6 2 V24" stroke="#15803d" stroke-width="1"/><path d="M1 20 C7 2 13 2 18 14 C23 26 29 26 35 6" fill="none" stroke="#1e3a8a" stroke-width="1.6"/>',
    dyna:'<path d="M3 3 Q18 40 33 3" fill="none" stroke="#ea580c" stroke-width="1.4"/><path d="M9 3 Q18 30 27 3" fill="none" stroke="#1e3a8a" stroke-width="1.4"/><path d="M13 3 Q18 22 23 3" fill="none" stroke="#15803d" stroke-width="1.4"/>',
    table:'<path d="M2 3 H34 V23 H2 Z M2 9 H34 M2 16 H34 M14 3 V23" fill="none" stroke="#1e3a8a" stroke-width="1.2"/>',
    equa:'<text x="1" y="11" fill="#1e3a8a" font-size="10">aXⁿ+</text><text x="1" y="23" fill="#ea580c" font-size="10">…=0</text>',
    fin:'<text x="2" y="19" fill="#15803d" font-size="16">€</text><text x="16" y="19" fill="#ea580c" font-size="14">%</text>',
    mem:'<text x="1" y="11" fill="#1e3a8a" font-size="10">A=3</text><text x="1" y="23" fill="#ea580c" font-size="10">B=7</text>',
    option:''
  };
  function nombreModo(id){ var t = TILES.filter(function(x){ return x.id === id; })[0]; return t ? t.n : id; }
  function fila(et, val, sel, attr){ return '<div class="fr' + (sel ? ' sel' : '') + '"' + (attr || '') + '><span>' + et + '</span><b>' + val + '</b></div>'; }
  function linea(pref){
    return '<div class="in">' + (pref ? '<span class="pf">' + esc(pref) + '</span>' : '') + esc(txtP(P.slice(0, cur))) + '<span class="kc-cur"></span>' + esc(txtP(P.slice(cur))) + '</div>' +
      (errMsg ? '<div class="err">' + esc(errMsg) + '</div>' : (flash ? '<div class="pv">' + esc(flash) + '</div>' : ''));
  }
  function msgErr(e){ return e === 'mat' ? 'Ma ERROR · no se puede calcular' : e === 'sin' ? 'Syn ERROR · revisa la operación' : e === 'dim' ? 'Dim ERROR · las dimensiones no casan' : String(e); }
  function gridHTML(o){
    var h = '<table class="kc-gr"><tr><th></th>' + o.head.map(function(x){ return '<th>' + x + '</th>'; }).join('') + '</tr>';
    for(var i = 0; i < o.rows; i++){
      h += '<tr><th>' + (o.rowHead ? o.rowHead(i) : i + 1) + '</th>';
      for(var j = 0; j < o.cols; j++){ var v = o.cell(i, j); h += '<td' + (i === o.i && j === o.j ? ' class="sel"' : '') + ' data-cell="' + i + ',' + j + '"' + (typeof v === 'number' ? ' data-v="' + v + '"' : '') + '>' + (typeof v === 'number' ? fmtCorto(v) : esc(v)) + '</td>'; }
      h += '</tr>';
    }
    return h + '</table>';
  }
  function fmtCorto(v){ var r = +(+v).toPrecision(6); return fmt(r); }
  function matHTML(m){ return gridHTML({rows:m.r, cols:m.c, head:Array.apply(null, Array(m.c)).map(function(_, j){ return j + 1; }), cell:function(i, j){ return mGet(m, i, j); }, i:-1, j:-1}); }

  /* ----- pantalla de set up (la que sale al entrar en cada modo) ----- */
  var ANGN = {deg:'Deg', rad:'Rad', gra:'Gra'};
  function dispTxt(){ var D = CS.disp; return D.t === 'n' ? 'Nrml' : (D.t === 'f' ? 'Fix' : 'Sci') + D.d; }
  function setupFilas(id){
    var f = [];
    if(id === 'base') f.push(['BASE', BNOM[CS.base].toUpperCase(), 'base']);
    if(id === 'sd' || id === 'reg') f.push(['S-data', 'STO', null]);
    if(id === 'reg') f.push(['Tipo', CS.regT, 'regT']);
    if(id === 'dyna') f.push(['D-type', 'STOP', null]);
    if(id === 'table') f.push(['Func-T', 'Range', null]);
    if(id !== 'base'){ f.push(['G-type', 'REC/CON', null]); f.push(['Angle', ANGN[ang], 'ang']); f.push(['Display', dispTxt(), 'disp']); }
    f.push(['M-D/Cpy', 'M-Disp', null]);
    return f;
  }
  var SETF = {
    ang:[{t:'Deg', f:function(){ ang = 'deg'; guarda(LS.ang, ang); }}, {t:'Rad', f:function(){ ang = 'rad'; guarda(LS.ang, ang); }}, {t:'Gra', f:function(){ ang = 'gra'; guarda(LS.ang, ang); }}],
    disp:[{t:'Fix', f:function(){ S.pideDig = 'f'; flash = 'Fix: pulsa una cifra (0–9)'; }}, {t:'Sci', f:function(){ S.pideDig = 's'; flash = 'Sci: pulsa una cifra (0–9)'; }}, {t:'Nrm', f:function(){ CS.disp = {t:'n', d:0}; gCS(); }}],
    base:[{t:'Dec', f:function(){ CS.base = 'd'; gCS(); }}, {t:'Hex', f:function(){ CS.base = 'h'; gCS(); }}, {t:'Bin', f:function(){ CS.base = 'b'; gCS(); }}, {t:'Oct', f:function(){ CS.base = 'o'; gCS(); }}],
    regT:[{t:'LIN', f:function(){ CS.regT = 'LIN'; gCS(); }}, {t:'LOG', f:function(){ CS.regT = 'LOG'; gCS(); }}, {t:'EXP', f:function(){ CS.regT = 'EXP'; gCS(); }}, {t:'PWR', f:function(){ CS.regT = 'PWR'; gCS(); }}]
  };

  /* ----- los modos ----- */
  var MODOS = {};
  function insF(id){ return function(){ ins(sp(id)); }; }
  function vaA(fm){ return function(){ S.fm = fm; }; }
  function rollHTML(lista, rFmt, pref){
    var h = '';
    lista.slice(0, 30).reverse().forEach(function(x, i, arr){
      var idx = arr.length - 1 - i;
      h += '<div class="e" data-h="' + idx + '" title="Volver a cargar esta operación">' + esc(x.e) + (x.s ? '<span class="sto">→' + x.s + '</span>' : '') + '</div>' +
           '<div class="r" data-r="' + idx + '" title="Meter este resultado en la operación">' + rFmt(x) + '</div>';
    });
    var pv = '';
    if(P.length && !errMsg && !flash){ try{ var M = MODOS[S.pant]; var r = M.calc(P.slice()); pv = (r.sto ? '→' + r.sto + ' = ' : '= ') + (r.k === 'mat' ? 'matriz ' + r.v.r + '×' + r.v.c : (M.rFmt ? M.rFmt({r:r.v, k:r.k}) : fmt(r.v))); }catch(e){ pv = ''; } }
    h += '<div class="in">' + (pref ? '<span class="pf">' + esc(pref) + '</span>' : '') + esc(txtP(P.slice(0, cur))) + '<span class="kc-cur"></span>' + esc(txtP(P.slice(cur))) + '</div>';
    if(errMsg) h += '<div class="err">' + esc(errMsg) + '</div>';
    else if(flash) h += '<div class="pv">' + esc(flash) + '</div>';
    else h += '<div class="pv">' + esc(pv) + '</div>';
    return '<div class="kc-lst abajo">' + h + '</div>';
  }
  function listaRoll(){ return S.pant === 'comp' ? H : ROLL[S.pant]; }
  function exeRun(){
    if(!P.length) return;
    var M = MODOS[S.pant];
    try{
      var r = M.calc(P.slice());
      var ent = {e:txtP(P), p:P.slice(), r:r.v, s:r.sto || undefined, k:r.k || 'num'};
      if(S.pant === 'comp'){ H.unshift({e:ent.e, p:ent.p, r:r.v, s:ent.s}); H = H.slice(0, 40); guarda(LS.hist, H); }
      else { ROLL[S.pant].unshift(ent); ROLL[S.pant] = ROLL[S.pant].slice(0, 30); }
      if(r.k === 'mat'){ CS.matAns = r.v; gCS(); S.ansMat = true; } else { ans = r.v; guarda(LS.ans, ans); S.ansMat = false; }
      if(r.sto){ MEM[r.sto] = r.v; guarda(LS.mem, MEM); }
      hecho = true; replay = -1; P = []; cur = 0;
    }catch(e){ errMsg = msgErr(e); }
  }
  function navRun(a){
    var L = listaRoll(); if(!L.length) return;
    if(a === 'up' || a === 'down'){ replay = a === 'up' ? Math.min(L.length - 1, replay + 1) : Math.max(-1, replay - 1);
      if(replay < 0){ P = []; cur = 0; } else { P = piezasDe(L[replay]); if(L[replay].s) P.push('→', L[replay].s); cur = P.length; } hecho = false; return; }
    if(!P.length){ P = piezasDe(L[0]); if(L[0].s) P.push('→', L[0].s); cur = a === 'left' ? P.length : 0; hecho = false; }   /* ◀ ▶ tras EXE: recupera la última, como la Casio */
  }

  MODOS.comp = { titulo:'RUN / COMP', calc:function(a){ var r = analiza(a); return {v:r.v, sto:r.sto}; },
    body:function(){ return rollHTML(H, function(x){ return fmt(x.r); }); }, exe:exeRun, nav:navRun, fms:{root:[]} };

  MODOS.base = { titulo:'RUN / BASE-N', calc:baseCalc,
    rFmt:function(x){ return enBase(x.r, CS.base); },
    body:function(){ return rollHTML(ROLL.base, function(x){ return enBase(x.r, CS.base) + '<div class="bs">' + ['d','h','b','o'].filter(function(b){ return b !== CS.base; }).map(function(b){ return b + ' ' + enBase(x.r, b); }).join(' · ') + '</div>'; }, BNOM[CS.base] + ' '); },
    exe:exeRun, nav:navRun,
    fms:{
      root:[{t:'Dec', f:function(){ CS.base = 'd'; gCS(); }, on:function(){ return CS.base === 'd'; }}, {t:'Hex', f:function(){ CS.base = 'h'; gCS(); }, on:function(){ return CS.base === 'h'; }},
            {t:'Bin', f:function(){ CS.base = 'b'; gCS(); }, on:function(){ return CS.base === 'b'; }}, {t:'Oct', f:function(){ CS.base = 'o'; gCS(); }, on:function(){ return CS.base === 'o'; }},
            {t:'d~o', m:'pre'}, {t:'LOG', m:'log'}],
      pre:[{t:'d', f:insF('bd')}, {t:'h', f:insF('bh')}, {t:'b', f:insF('bb')}, {t:'o', f:insF('bo')}],
      log:[{t:'Neg', f:insF('neg')}, {t:'Not', f:insF('not')}, {t:'and', f:insF('and')}, {t:'or', f:insF('or')}, {t:'xor', f:insF('xor')}, {t:'xnor', f:insF('xnor')}]
    } };

  /* SD y REG: la misma línea de cálculo, con los datos guardados (DT) y sus símbolos */
  function guardaDato(reg){
    if(!P.length){ errMsg = reg ? 'Escribe x ; y y pulsa DT' : 'Escribe el dato y pulsa DT'; return; }
    try{
      var partes = [[]]; P.forEach(function(p){ if(p === ';') partes.push([]); else partes[partes.length - 1].push(p); });
      var v = partes.map(function(q){ var r = analiza(q); if(r.sto) throw 'sin'; return r.v; });
      if(reg){ if(v.length !== 2) throw 'Escribe x ; y (la tecla ; está en F3)'; CS.reg.push([v[0], v[1]]); flash = 'Dato ' + CS.reg.length + ': x = ' + fmt(v[0]) + ' · y = ' + fmt(v[1]); }
      else { if(v.length > 2) throw 'sin'; var fr = v.length === 2 ? v[1] : 1; if(!(fr > 0)) throw 'La frecuencia tiene que ser positiva'; CS.sd.push([v[0], fr]); flash = 'Dato ' + CS.sd.length + ': ' + fmt(v[0]) + (fr !== 1 ? ' (frecuencia ' + fmt(fr) + ')' : ''); }
      gCS(); P = []; cur = 0;
    }catch(e){ errMsg = msgErr(e); }
  }
  MODOS.sd = { titulo:'RUN / SD', calc:function(a){ var r = analiza(a); return {v:r.v, sto:r.sto}; },
    body:function(){
      if(S.vista === 'edit') return edBody();
      if(S.vista === 'ers') return '<div class="kc-lst"><div class="big">¿BORRAR TODOS LOS DATOS?</div><div class="fr"><span>' + CS.sd.length + ' datos guardados</span></div></div>';
      return rollHTML(ROLL.sd, function(x){ return fmt(x.r); }); },
    exe:function(){ if(S.vista === 'edit') return edExe(); exeRun(); }, nav:function(a){ if(S.vista === 'edit') return edNav(a); navRun(a); },
    exit:function(){ if(S.vista === 'edit' || S.vista === 'ers'){ S.vista = 'run'; S.fm = 'root'; return true; } },
    fms:{
      root:[{t:'DT', f:function(){ guardaDato(false); }}, {t:'EDIT', f:function(){ edAbre('sd'); }}, {t:';', f:function(){ ins(';'); }}, {t:'DEV', m:'dev'}, {t:'Σ', m:'sum'}, {t:'PQR', m:'pqr'}],
      dev:[{t:'x̄', f:insF('xbar')}, {t:'xσn', f:insF('xsn')}, {t:'xσn−1', f:insF('xsn1')}, {t:'▽', m:'rep'}],
      rep:[{t:'Mod', f:insF('mod')}, {t:'Med', f:insF('med')}, {t:'Max', f:insF('max')}, {t:'Min', f:insF('min')}],
      sum:[{t:'Σx²', f:insF('sx2')}, {t:'Σx', f:insF('sx')}, {t:'n', f:insF('nn')}],
      pqr:[{t:'P(', f:insF('pP')}, {t:'Q(', f:insF('pQ')}, {t:'R(', f:insF('pR')}, {t:'t(', f:insF('pt')}],
      edit:[{t:'DEL', f:function(){ edDel(); }}, {t:'INS', f:function(){ edIns(); }}, {t:'ERS', f:function(){ S.vista = 'ers'; S.fm = 'ers'; }}],
      ers:[{t:'YES', f:function(){ edDatos().length = 0; gCS(); S.vista = 'run'; S.fm = 'root'; flash = 'Datos borrados'; }}, {}, {}, {}, {}, {t:'NO', f:function(){ S.vista = 'edit'; S.fm = 'edit'; }}]
    } };
  MODOS.reg = { titulo:function(){ return 'RUN / ' + CS.regT + '-REG'; }, calc:function(a){ var r = analiza(a); return {v:r.v, sto:r.sto}; },
    body:function(){
      if(S.vista === 'edit') return edBody();
      if(S.vista === 'ers') return '<div class="kc-lst"><div class="big">¿BORRAR TODOS LOS DATOS?</div><div class="fr"><span>' + CS.reg.length + ' pares guardados</span></div></div>';
      return rollHTML(ROLL.reg, function(x){ return fmt(x.r); }); },
    exe:function(){ if(S.vista === 'edit') return edExe(); exeRun(); }, nav:function(a){ if(S.vista === 'edit') return edNav(a); navRun(a); },
    exit:function(){ if(S.vista === 'edit' || S.vista === 'ers'){ S.vista = 'run'; S.fm = 'root'; return true; } },
    fms:{
      root:[{t:'DT', f:function(){ guardaDato(true); }}, {t:'CL', f:function(){ if(CS.reg.length){ var d = CS.reg.pop(); gCS(); flash = 'Borrado el último: ' + fmt(d[0]) + ' ; ' + fmt(d[1]); } }}, {t:';', f:function(){ ins(';'); }},
            {t:'DEV', m:'dev'}, {t:'Σ', m:'sum'}, {t:'REG', m:'reg'}],
      dev:[{t:'x̄', f:insF('xbar')}, {t:'xσn', f:insF('xsn')}, {t:'xσn−1', f:insF('xsn1')}, {t:'ȳ', f:insF('ybar')}, {t:'yσn', f:insF('ysn')}, {t:'yσn−1', f:insF('ysn1')}],
      sum:[{t:'Σx²', f:insF('sx2')}, {t:'Σx', f:insF('sx')}, {t:'n', f:insF('nn')}, {t:'Σy²', f:insF('sy2')}, {t:'Σy', f:insF('sy')}, {t:'Σxy', f:insF('sxy')}],
      reg:[{t:'A', f:insF('rA')}, {t:'B', f:insF('rB')}, {t:'r', f:insF('rr')}, {t:'x̂', f:insF('xhat')}, {t:'ŷ', f:insF('yhat')}, {t:'EDIT', f:function(){ edAbre('reg'); }}],
      edit:[{t:'DEL', f:function(){ edDel(); }}, {t:'INS', f:function(){ edIns(); }}, {t:'ERS', f:function(){ S.vista = 'ers'; S.fm = 'ers'; }}],
      ers:[{t:'YES', f:function(){ edDatos().length = 0; gCS(); S.vista = 'run'; S.fm = 'root'; flash = 'Datos borrados'; }}, {}, {}, {}, {}, {t:'NO', f:function(){ S.vista = 'edit'; S.fm = 'edit'; }}]
    } };
  /* editor de la tabla de datos (SD: x y frecuencia; REG: x e y) */
  function edDatos(){ return S.pant === 'reg' ? CS.reg : CS.sd; }
  function edAbre(){ S.vista = 'edit'; S.fm = 'edit'; S.ei = Math.max(0, edDatos().length - 1); S.ej = 0; P = []; cur = 0; }
  function edBody(){
    var D = edDatos(), reg = S.pant === 'reg';
    if(!D.length) return '<div class="kc-lst"><div class="fr"><span>Sin datos. Sal con EXIT y mételos con DT.</span></div></div>' + linea('');
    return '<div class="kc-lst">' + gridHTML({rows:D.length, cols:2, head:reg ? ['x', 'y'] : ['x', 'f'], cell:function(i, j){ return D[i][j]; }, i:S.ei, j:S.ej}) + '</div>' + linea((reg ? ['x', 'y'] : ['x', 'f'])[S.ej] + (S.ei + 1) + '=');
  }
  function edExe(){ var D = edDatos(); if(!D.length || !P.length) return; try{ var r = analiza(P); if(r.sto) throw 'sin'; if(S.pant === 'sd' && S.ej === 1 && !(r.v > 0)) throw 'La frecuencia tiene que ser positiva'; D[S.ei][S.ej] = r.v; gCS(); P = []; cur = 0; if(S.ei < D.length - 1) S.ei++; }catch(e){ errMsg = msgErr(e); } }
  function edNav(a){ var D = edDatos(); if(!D.length) return; if(a === 'up') S.ei = Math.max(0, S.ei - 1); else if(a === 'down') S.ei = Math.min(D.length - 1, S.ei + 1); else if(a === 'left') S.ej = 0; else S.ej = 1; }
  function edDel(){ var D = edDatos(); if(!D.length) return; D.splice(S.ei, 1); S.ei = Math.max(0, Math.min(S.ei, D.length - 1)); gCS(); }
  function edIns(){ var D = edDatos(); D.splice(S.ei, 0, S.pant === 'reg' ? [0, 0] : [0, 1]); gCS(); }

  /* MAT */
  MODOS.mat = { titulo:'RUN / MATRIX', calc:matCalc,
    rFmt:function(x){ return fmt(x.r); },
    body:function(){
      if(S.vista === 'lista'){ return '<div class="kc-lst"><div class="tt">MATRIX</div>' + 'ABCDEF'.split('').map(function(L, i){ var M = CS.mat[L]; return fila('Mat ' + L, M ? M.r + '×' + M.c : 'None', i === S.mi, ' data-row="' + i + '"'); }).join('') + '</div>' + linea(S.dimPaso ? (S.dimPaso === 1 ? 'Filas m=' : 'Columnas n=') : ''); }
      if(S.vista === 'medit'){ var L2 = 'ABCDEF'[S.mi], M2 = CS.mat[L2]; return '<div class="kc-lst"><div class="tt">Mat ' + L2 + ' (' + M2.r + '×' + M2.c + ')</div>' + gridHTML({rows:M2.r, cols:M2.c, head:Array.apply(null, Array(M2.c)).map(function(_, j){ return j + 1; }), cell:function(i, j){ return mGet(M2, i, j); }, i:S.ei, j:S.ej}) + '</div>' + linea(L2 + '[' + (S.ei + 1) + ',' + (S.ej + 1) + ']='); }
      if(S.vista === 'see'){ return '<div class="kc-lst"><div class="tt">Mat Ans</div>' + (CS.matAns ? matHTML(CS.matAns) : '<div class="fr"><span>Vacía</span></div>') + '</div>'; }
      return rollHTML(ROLL.mat, function(x){ return x.k === 'mat' ? '<div class="mres">' + matHTML(x.r) + '</div>' : fmt(x.r); });
    },
    exe:function(){
      if(S.vista === 'lista'){
        if(S.dimPaso){ try{ var r = analiza(P); var v = Math.round(r.v); if(v < 1 || v > 6) throw 'Entre 1 y 6'; if(S.dimPaso === 1){ S.dimM = v; S.dimPaso = 2; P = []; cur = 0; } else { var L = 'ABCDEF'[S.mi], old = CS.mat[L], nm = mNueva(S.dimM, v); if(old) for(var i = 0; i < Math.min(old.r, nm.r); i++) for(var j = 0; j < Math.min(old.c, nm.c); j++) nm.d[i * nm.c + j] = mGet(old, i, j); CS.mat[L] = nm; gCS(); S.dimPaso = 0; P = []; cur = 0; } }catch(e){ errMsg = msgErr(e); } return; }
        var L3 = 'ABCDEF'[S.mi]; if(!CS.mat[L3]){ S.dimPaso = 1; flash = 'Mat ' + L3 + ': escribe las filas y EXE'; return; } S.vista = 'medit'; S.fm = 'medit'; S.ei = 0; S.ej = 0; return;
      }
      if(S.vista === 'medit'){ if(!P.length) return; try{ var r2 = analiza(P); if(r2.sto) throw 'sin'; var M = CS.mat['ABCDEF'[S.mi]]; M.d[S.ei * M.c + S.ej] = r2.v; gCS(); P = []; cur = 0; if(S.ej < M.c - 1) S.ej++; else if(S.ei < M.r - 1){ S.ei++; S.ej = 0; } }catch(e){ errMsg = msgErr(e); } return; }
      if(S.vista === 'see') return;
      exeRun();
    },
    nav:function(a){
      if(S.vista === 'lista'){ if(a === 'up') S.mi = Math.max(0, S.mi - 1); if(a === 'down') S.mi = Math.min(5, S.mi + 1); return; }
      if(S.vista === 'medit'){ var M = CS.mat['ABCDEF'[S.mi]]; if(a === 'up') S.ei = Math.max(0, S.ei - 1); if(a === 'down') S.ei = Math.min(M.r - 1, S.ei + 1); if(a === 'left') S.ej = Math.max(0, S.ej - 1); if(a === 'right') S.ej = Math.min(M.c - 1, S.ej + 1); return; }
      navRun(a);
    },
    pick:function(i){ S.mi = i; },
    exit:function(){ if(S.vista === 'medit'){ S.vista = 'lista'; S.fm = 'lista'; return true; } if(S.vista === 'lista' || S.vista === 'see'){ S.vista = 'run'; S.fm = 'root'; S.dimPaso = 0; return true; } },
    fms:{
      root:[{t:'Mat', m:'mat'}, {t:'Det', f:insF('det')}, {t:'Trn', f:insF('trn')}, {}, {t:'EDIT', f:function(){ S.vista = 'lista'; S.fm = 'lista'; S.mi = S.mi || 0; P = []; cur = 0; }}, {t:'SEE', f:function(){ S.vista = 'see'; S.fm = 'see'; }}],
      mat:[{t:'A', f:insF('matA')}, {t:'B', f:insF('matB')}, {t:'C', f:insF('matC')}, {t:'D', f:insF('matD')}, {t:'E', f:insF('matE')}, {t:'Ans', f:insF('matAns')}],
      lista:[{t:'EDIT', f:function(){ var L = 'ABCDEF'[S.mi]; if(!CS.mat[L]){ S.dimPaso = 1; flash = 'Mat ' + L + ': primero la dimensión'; return; } S.vista = 'medit'; S.fm = 'medit'; S.ei = 0; S.ej = 0; }},
             {t:'DIM', f:function(){ S.dimPaso = 1; P = []; cur = 0; }}, {t:'ERS', f:function(){ var L = 'ABCDEF'[S.mi]; confirma('ers' + L, 'Pulsa ERS otra vez para borrar Mat ' + L, function(){ delete CS.mat[L]; gCS(); }); }},
             {t:'ER·A', f:function(){ confirma('erA', 'Pulsa ER·A otra vez para borrar todas las matrices', function(){ CS.mat = {}; gCS(); }); }}],
      medit:[{t:'R·OP', f:function(){ flash = 'Operaciones de filas: no incluidas'; }}],
      see:[{t:'→A', f:function(){ if(CS.matAns){ CS.mat.A = JSON.parse(JSON.stringify(CS.matAns)); gCS(); flash = 'Copiada a Mat A'; } }}, {t:'→B', f:function(){ if(CS.matAns){ CS.mat.B = JSON.parse(JSON.stringify(CS.matAns)); gCS(); flash = 'Copiada a Mat B'; } }}]
    } };

  /* GRAPH (memoria de funciones Y1–Y6), TABLE y DYNA comparten la gráfica */
  function rngFilas(){ var R = CS.rng; return [['Xmin', R.x0, 'x0'], ['max', R.x1, 'x1'], ['scl', R.xs, 'xs'], ['Ymin', R.y0, 'y0'], ['max', R.y1, 'y1'], ['scl', R.ys, 'ys']]; }
  function rngBody(){ return '<div class="kc-lst"><div class="tt">Graph Range</div>' + rngFilas().map(function(f, i){ return fila(f[0] + ':', fmt(f[1]), i === S.ri, ' data-row="' + i + '"'); }).join('') + '</div>' + linea(rngFilas()[S.ri][0] + '='); }
  function rngExe(){ if(!P.length){ S.ri = (S.ri + 1) % 6; return; } try{ var r = analiza(P); if(r.sto) throw 'sin'; var k = rngFilas()[S.ri][2]; CS.rng[k] = r.v; if(CS.rng.x1 <= CS.rng.x0 || CS.rng.y1 <= CS.rng.y0) { flash = 'Ojo: el máximo tiene que ser mayor que el mínimo'; } gCS(); P = []; cur = 0; S.ri = (S.ri + 1) % 6; }catch(e){ errMsg = msgErr(e); } }
  var RNGF = [{t:'INIT', f:function(){ CS.rng = {x0:-4.7, x1:4.7, xs:1, y0:-3.1, y1:3.1, ys:1}; gCS(); }},
              {t:'TRG', f:function(){ var g = ang === 'deg' ? 360 : ang === 'gra' ? 400 : 2 * Math.PI; CS.rng = {x0:-g, x1:g, xs:g / 4, y0:-1.6, y1:1.6, ys:0.5}; gCS(); }}];
  function lienzo(){ return '<canvas class="kc-cv" width="640" height="380"></canvas>'; }
  function dibuja(cv, fns, marca){                  /* fns: [{e, c, extra, puntos?}] */
    if(!cv) return; var g = cv.getContext('2d'), W = cv.width, Hh = cv.height, R = CS.rng;
    if(!(R.x1 > R.x0) || !(R.y1 > R.y0)){ g.clearRect(0, 0, W, Hh); g.fillStyle = '#b91c1c'; g.font = '26px monospace'; g.fillText('Range mal puesto', 20, 50); return; }
    var X = function(x){ return (x - R.x0) / (R.x1 - R.x0) * W; }, Y = function(y){ return Hh - (y - R.y0) / (R.y1 - R.y0) * Hh; };
    g.clearRect(0, 0, W, Hh); g.lineWidth = 1.5; g.strokeStyle = '#374151';
    g.beginPath(); if(R.y0 <= 0 && R.y1 >= 0){ g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); } if(R.x0 <= 0 && R.x1 >= 0){ g.moveTo(X(0), 0); g.lineTo(X(0), Hh); } g.stroke();
    g.lineWidth = 1.2;
    if(R.xs > 0 && (R.x1 - R.x0) / R.xs <= 60 && R.y0 <= 0 && R.y1 >= 0){ g.beginPath(); for(var t = Math.ceil(R.x0 / R.xs) * R.xs; t <= R.x1; t += R.xs){ g.moveTo(X(t), Y(0) - 5); g.lineTo(X(t), Y(0) + 5); } g.stroke(); }
    if(R.ys > 0 && (R.y1 - R.y0) / R.ys <= 60 && R.x0 <= 0 && R.x1 >= 0){ g.beginPath(); for(var u = Math.ceil(R.y0 / R.ys) * R.ys; u <= R.y1; u += R.ys){ g.moveTo(X(0) - 5, Y(u)); g.lineTo(X(0) + 5, Y(u)); } g.stroke(); }
    fns.forEach(function(F){
      g.strokeStyle = g.fillStyle = COLS[F.c % 3]; g.lineWidth = 3;
      if(F.puntos){ F.puntos.forEach(function(q){ if(isFinite(q[1])){ g.fillRect(X(q[0]) - 4, Y(q[1]) - 4, 8, 8); } }); if(!F.unir) return;
        g.beginPath(); var pr = false; F.puntos.forEach(function(q){ if(!isFinite(q[1])){ pr = false; return; } if(pr) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); pr = true; }); g.stroke(); return; }
      g.beginPath(); var ant = null;
      for(var px = 0; px <= W; px += 2){
        var x = R.x0 + px / W * (R.x1 - R.x0), y = conX(F.e, x, F.extra), py = Y(y);
        if(!isFinite(y) || Math.abs(py) > Hh * 20){ ant = null; continue; }
        if(ant !== null && Math.abs(py - ant) < Hh * 1.5) g.lineTo(px, py); else g.moveTo(px, py);
        ant = py;
      }
      g.stroke();
    });
    if(marca && isFinite(marca.y)){ g.strokeStyle = '#111827'; g.lineWidth = 2; var mx = X(marca.x), my = Y(marca.y); g.beginPath(); g.moveTo(mx - 10, my); g.lineTo(mx + 10, my); g.moveTo(mx, my - 10); g.lineTo(mx, my + 10); g.stroke(); }
  }
  function fnsActivas(){ return CS.y.map(function(y, i){ return {e:y.e, c:y.c, on:y.on, i:i}; }).filter(function(y){ return y.e && y.on; }); }
  function yLista(pref){
    return '<div class="kc-lst"><div class="tt">' + pref + '</div>' + CS.y.map(function(y, i){
      return '<div class="fr' + (i === S.yi ? ' sel' : '') + '" data-row="' + i + '"><span><i class="dot" style="background:' + COLS[y.c] + '"></i>Y' + (i + 1) + (y.on && y.e ? '<u>=</u>' : '=') + ' ' + esc(y.e) + '</span></div>';
    }).join('') + '</div>' + linea(P.length ? 'Y' + (S.yi + 1) + '=' : '');
  }
  function yExe(){ if(!P.length) return false; var e = txtP(P); try{ tokens(trozos(e)); }catch(_){ errMsg = 'Syn ERROR · revisa la función'; return true; } CS.y[S.yi].e = e; CS.y[S.yi].on = true; gCS(); P = []; cur = 0; S.yi = Math.min(5, S.yi + 1); return true; }
  var YF = {
    del:{t:'DEL', f:function(){ CS.y[S.yi].e = ''; gCS(); }},
    col:{t:'COLR', f:function(){ var y = CS.y[S.yi]; y.c = (y.c + 1) % 3; gCS(); flash = 'Y' + (S.yi + 1) + ': ' + COLN[y.c]; }},
    sel:{t:'SEL', f:function(){ var y = CS.y[S.yi]; y.on = !y.on; gCS(); }}
  };
  function trazaInfo(){
    var F = fnsActivas(); if(!S.tr || !F.length) return '';
    var f = F[S.tr.k % F.length], y = conX(f.e, S.tr.x);
    return '<div class="trz"><span style="color:' + COLS[f.c] + '">Y' + (f.i + 1) + '</span> X=' + fmt(S.tr.x) + '  Y=' + (isFinite(y) ? fmt(y) : '—') + '</div>';
  }
  function grafNav(a){
    var R = CS.rng, F = fnsActivas();
    if(S.tr && F.length){ var paso = (R.x1 - R.x0) / 94; if(a === 'left') S.tr.x -= paso; if(a === 'right') S.tr.x += paso; if(a === 'up') S.tr.k = (S.tr.k + 1) % F.length; if(a === 'down') S.tr.k = (S.tr.k + F.length - 1) % F.length;
      if(S.tr.x < R.x0 || S.tr.x > R.x1){ var w = R.x1 - R.x0, d = S.tr.x < R.x0 ? -w / 2 : w / 2; R.x0 += d; R.x1 += d; gCS(); } return; }
    var dx = (R.x1 - R.x0) / 4, dy = (R.y1 - R.y0) / 4;     /* sin Trace, las flechas mueven la gráfica (Graph Scroll) */
    if(a === 'left'){ R.x0 -= dx; R.x1 -= dx; } if(a === 'right'){ R.x0 += dx; R.x1 += dx; } if(a === 'up'){ R.y0 += dy; R.y1 += dy; } if(a === 'down'){ R.y0 -= dy; R.y1 -= dy; } gCS();
  }
  function zoom(fct){ var R = CS.rng, cx = S.tr ? S.tr.x : (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2, w = (R.x1 - R.x0) / 2 * fct, h = (R.y1 - R.y0) / 2 * fct; R.x0 = cx - w; R.x1 = cx + w; R.y0 = cy - h; R.y1 = cy + h; gCS(); }
  function autoY(fns){ var R = CS.rng, ys = []; fns.forEach(function(F){ for(var k = 0; k <= 120; k++){ var y = conX(F.e, R.x0 + k / 120 * (R.x1 - R.x0), F.extra); if(isFinite(y)) ys.push(y); } });
    if(!ys.length) return; ys.sort(function(a, b){ return a - b; }); var lo = ys[Math.floor(ys.length * 0.02)], hi = ys[Math.ceil(ys.length * 0.98) - 1]; if(hi - lo < 1e-9){ lo -= 1; hi += 1; } var m = (hi - lo) * 0.08; R.y0 = lo - m; R.y1 = hi + m; R.ys = +((hi - lo) / 8).toPrecision(1) || 1; gCS(); }
  var GF = [{t:'Trace', f:function(){ var F = fnsActivas(); if(!F.length) return; S.tr = S.tr ? null : {x:(CS.rng.x0 + CS.rng.x1) / 2, k:0}; }, on:function(){ return !!S.tr; }}, {t:'Zoom', m:'zoom'}, {}, {}, {}, {t:'G↔T', f:function(){ S.vista = S.volver || 'lista'; S.fm = S.vista === 'tab' ? 'tab' : 'root'; S.tr = null; }}];
  var ZF = [{t:'AUTO', f:function(){ autoY(S.fnsG || fnsActivas()); }}, {t:'×2', f:function(){ zoom(0.5); }}, {t:'÷2', f:function(){ zoom(2); }}, {t:'ORIG', f:function(){ RNGF[0].f(); }}, {}, {}];
  function abreGraf(volver, fns){ S.volver = volver; S.fnsG = fns || null; S.vista = 'graf'; S.fm = 'graf'; S.tr = null; P = []; cur = 0; }
  function grafBody(){ return '<div class="kc-lst grafw">' + lienzo() + trazaInfo() + (S.dynaTxt ? '<div class="trz">' + esc(S.dynaTxt) + '</div>' : '') + '</div>' + (errMsg ? '<div class="err">' + esc(errMsg) + '</div>' : ''); }
  function grafPost(){ var cv = q(scr, 'canvas.kc-cv'); if(!cv) return; var F = S.fnsG || fnsActivas(), m = null;
    if(S.tr){ var A = fnsActivas(); if(A.length){ var f = A[S.tr.k % A.length]; m = {x:S.tr.x, y:conX(f.e, S.tr.x)}; } }
    dibuja(cv, F, m); }

  MODOS.graph = { titulo:'GRAPH FUNC', inicio:'lista',
    body:function(){ if(S.vista === 'rng') return rngBody(); if(S.vista === 'graf') return grafBody(); return yLista('GRAPH FUNC'); },
    post:function(){ if(S.vista === 'graf') grafPost(); },
    exe:function(){ if(S.vista === 'rng') return rngExe(); if(S.vista === 'graf'){ if(S.tr){ var A = fnsActivas(), f = A[S.tr.k % A.length], y = conX(f.e, S.tr.x); if(isFinite(y)){ ans = y; guarda(LS.ans, ans); flash = 'Ans = ' + fmt(y); } } return; } if(!yExe()) abreGraf('lista'); },
    nav:function(a){ if(S.vista === 'graf') return grafNav(a); if(S.vista === 'rng'){ if(a === 'up') S.ri = (S.ri + 5) % 6; if(a === 'down') S.ri = (S.ri + 1) % 6; return; } if(a === 'up') S.yi = Math.max(0, S.yi - 1); if(a === 'down') S.yi = Math.min(5, S.yi + 1); },
    pick:function(i){ if(S.vista === 'rng') S.ri = i; else S.yi = i; },
    exit:function(){ if(S.vista === 'rng' || S.vista === 'graf'){ S.vista = 'lista'; S.fm = 'root'; S.tr = null; return true; } },
    fms:{ root:[{t:'EDIT', f:function(){ P = trozos(CS.y[S.yi].e); cur = P.length; }}, YF.del, YF.col, YF.sel, {t:'RNG', f:function(){ S.vista = 'rng'; S.fm = 'rng'; S.ri = 0; }}, {t:'DRAW', f:function(){ abreGraf('lista'); }}],
          rng:[RNGF[0], RNGF[1], {}, {}, {}, {t:'DRAW', f:function(){ abreGraf('lista'); }}], graf:GF, zoom:ZF } };

  MODOS.table = { titulo:'TABLE&GRAPH', inicio:'lista',
    body:function(){
      if(S.vista === 'trng'){ var T = CS.tbl, F = [['Start', T.s], ['End', T.e], ['Pitch', T.p]]; return '<div class="kc-lst"><div class="tt">Table Range</div>' + F.map(function(f, i){ return fila(f[0] + ':', fmt(f[1]), i === S.ri, ' data-row="' + i + '"'); }).join('') + '</div>' + linea(F[S.ri][0] + '='); }
      if(S.vista === 'tab'){ var A = fnsActivas().slice(0, 3); if(!A.length) return '<div class="kc-lst"><div class="fr"><span>No hay funciones seleccionadas (SEL).</span></div></div>';
        var xs = tablaX(); if(!xs) return '<div class="kc-lst"><div class="err">Más de 200 filas o rango mal puesto: revisa Start, End y Pitch.</div></div>';
        return '<div class="kc-lst">' + gridHTML({rows:xs.length, cols:A.length + 1, head:['X'].concat(A.map(function(f){ return 'Y' + (f.i + 1); })), rowHead:function(i){ return i + 1; }, cell:function(i, j){ var v = j === 0 ? xs[i] : conX(A[j - 1].e, xs[i]); return isFinite(v) ? v : '—'; }, i:S.ti, j:-1}) + '</div>' + (flash ? '<div class="pv">' + esc(flash) + '</div>' : ''); }
      if(S.vista === 'graf') return grafBody();
      return yLista('RANGE FUNCTION');
    },
    post:function(){ if(S.vista === 'graf') grafPost(); },
    exe:function(){
      if(S.vista === 'trng'){ if(!P.length){ S.ri = (S.ri + 1) % 3; return; } try{ var r = analiza(P); if(r.sto) throw 'sin'; CS.tbl[['s','e','p'][S.ri]] = r.v; gCS(); P = []; cur = 0; S.ri = (S.ri + 1) % 3; }catch(e){ errMsg = msgErr(e); } return; }
      if(S.vista === 'tab' || S.vista === 'graf') return MODOS.graph.exe();
      if(!yExe()){ S.vista = 'tab'; S.fm = 'tab'; S.ti = 0; } },
    nav:function(a){ if(S.vista === 'graf') return grafNav(a); if(S.vista === 'trng'){ if(a === 'up') S.ri = (S.ri + 2) % 3; if(a === 'down') S.ri = (S.ri + 1) % 3; return; }
      if(S.vista === 'tab'){ var xs = tablaX() || []; if(a === 'up') S.ti = Math.max(0, S.ti - 1); if(a === 'down') S.ti = Math.min(xs.length - 1, S.ti + 1); return; }
      if(a === 'up') S.yi = Math.max(0, S.yi - 1); if(a === 'down') S.yi = Math.min(5, S.yi + 1); },
    pick:function(i){ if(S.vista === 'trng') S.ri = i; else S.yi = i; },
    exit:function(){ if(S.vista === 'graf'){ S.vista = 'tab'; S.fm = 'tab'; S.tr = null; return true; } if(S.vista !== 'lista'){ S.vista = 'lista'; S.fm = 'root'; return true; } },
    fms:{ root:[{t:'EDIT', f:function(){ P = trozos(CS.y[S.yi].e); cur = P.length; }}, YF.del, YF.col, YF.sel, {t:'RNG', f:function(){ S.vista = 'trng'; S.fm = 'trng'; S.ri = 0; }}, {t:'TBL', f:function(){ S.vista = 'tab'; S.fm = 'tab'; S.ti = 0; }}],
          trng:[{}, {}, {}, {}, {}, {t:'TBL', f:function(){ S.vista = 'tab'; S.fm = 'tab'; S.ti = 0; }}],
          tab:[{}, {}, {}, {}, {t:'G·CON', f:function(){ tablaGraf(true); }}, {t:'G·PLT', f:function(){ tablaGraf(false); }}],
          graf:GF, zoom:ZF } };
  function tablaX(){ var T = CS.tbl; if(!(T.p > 0) || T.e < T.s) return null; var n = Math.floor((T.e - T.s) / T.p + 1e-9) + 1; if(n > 200) return null; var xs = []; for(var k = 0; k < n; k++) xs.push(+(T.s + k * T.p).toPrecision(12)); return xs; }
  function tablaGraf(unir){ var xs = tablaX(); if(!xs) return; var A = fnsActivas().slice(0, 3); abreGraf('tab', A.map(function(f){ return {c:f.c, puntos:xs.map(function(x){ return [x, conX(f.e, x)]; }), unir:unir}; })); S.volver = 'tab'; }

  /* DYNA: gráfica que se mueve al cambiar un coeficiente (memorias A–Z, como la Casio) */
  var dynaT = null;
  function dynaPara(){ if(dynaT){ clearInterval(dynaT); dynaT = null; } S.dynaTxt = ''; if(S.dynaOrig !== undefined){ if(S.dynaOrig === null) delete MEM[CS.dyv]; else MEM[CS.dyv] = S.dynaOrig; S.dynaOrig = undefined; guarda(LS.mem, MEM); } }
  function dynaVa(){
    var R = CS.dyr; if(!(R.p > 0) || R.e <= R.s){ errMsg = 'Revisa Start, End y Pitch de ' + CS.dyv; return; }
    var e = CS.dyf[CS.dyi]; if(!e){ errMsg = 'No hay función'; return; }
    S.dynaOrig = MEM.hasOwnProperty(CS.dyv) ? MEM[CS.dyv] : null;
    var v = R.s, dir = 1, k = 0, L = CS.dyv;
    abreGraf('dlista', null); S.fm = 'dyn';
    function paso(){ S.fnsG = [{e:e, c:k % 3, extra:(function(){ var o = {}; o[L] = v; return o; })()}]; S.dynaTxt = 'Y=' + e + '    ' + L + ' = ' + fmt(v); pinta();
      k++; v += dir * R.p; if(v > R.e + 1e-12){ dir = -1; v = R.e - R.p; } else if(v < R.s - 1e-12){ dir = 1; v = R.s + R.p; } }
    paso(); dynaT = setInterval(paso, 450);
  }
  MODOS.dyna = { titulo:'DYNAMIC GRAPH', inicio:'dlista',
    body:function(){
      if(S.vista === 'graf') return grafBody();
      if(S.vista === 'rng') return rngBody();
      if(S.vista === 'var'){
        var e = CS.dyf[CS.dyi] || '', letras = (e.match(/[A-WYZ]/g) || []).filter(function(x, i, a){ return a.indexOf(x) === i; });
        var R = CS.dyr, filas = letras.map(function(L){ return [L, L === CS.dyv ? '◆ dinámica' : fmt(MEM[L] || 0), 'v' + L]; }).concat([['Start', fmt(R.s), 's'], ['End', fmt(R.e), 'e'], ['Pitch', fmt(R.p), 'p']]);
        S.varFilas = filas; if(S.vi >= filas.length) S.vi = 0;
        return '<div class="kc-lst"><div class="tt">Y=' + esc(e) + '</div>' + filas.map(function(f, i){ return fila(f[0] + ':', f[1], i === S.vi, ' data-row="' + i + '"'); }).join('') + '</div>' + linea(filas[S.vi] ? filas[S.vi][0] + '=' : '');
      }
      return '<div class="kc-lst"><div class="tt">DYNAMIC GRAPH</div>' + CS.dyf.map(function(e, i){ return fila('Y=' + esc(e), '', i === CS.dyi, ' data-row="' + i + '"'); }).join('') + '</div>' + linea(P.length ? (S.dnew ? 'Y=' : 'Y=') : '');
    },
    post:function(){ if(S.vista === 'graf') grafPost(); },
    exe:function(){
      if(S.vista === 'rng') return rngExe();
      if(S.vista === 'graf') return;
      if(S.vista === 'var'){ var f = S.varFilas[S.vi]; if(!f) return;
        if(!P.length){ if(f[2][0] === 'v'){ CS.dyv = f[0]; gCS(); } S.vi = (S.vi + 1) % S.varFilas.length; return; }
        try{ var r = analiza(P); if(r.sto) throw 'sin'; if(f[2][0] === 'v'){ MEM[f[0]] = r.v; guarda(LS.mem, MEM); } else { CS.dyr[f[2]] = r.v; gCS(); } P = []; cur = 0; S.vi = (S.vi + 1) % S.varFilas.length; }catch(e){ errMsg = msgErr(e); } return; }
      if(P.length){ var e2 = txtP(P); try{ tokens(trozos(e2)); }catch(_){ errMsg = 'Syn ERROR · revisa la función'; return; }
        if(S.dnew){ CS.dyf.unshift(e2); CS.dyi = 0; S.dnew = false; } else CS.dyf[CS.dyi] = e2; gCS(); P = []; cur = 0; S.vista = 'var'; S.fm = 'var'; S.vi = 0; return; }
      S.vista = 'var'; S.fm = 'var'; S.vi = 0;
    },
    nav:function(a){ if(S.vista === 'graf') return; if(S.vista === 'rng'){ if(a === 'up') S.ri = (S.ri + 5) % 6; if(a === 'down') S.ri = (S.ri + 1) % 6; return; }
      if(S.vista === 'var'){ var n = (S.varFilas || []).length || 1; if(a === 'up') S.vi = (S.vi + n - 1) % n; if(a === 'down') S.vi = (S.vi + 1) % n; return; }
      if(a === 'up') CS.dyi = Math.max(0, CS.dyi - 1); if(a === 'down') CS.dyi = Math.min(CS.dyf.length - 1, CS.dyi + 1); },
    pick:function(i){ if(S.vista === 'var') S.vi = i; else if(S.vista === 'rng') S.ri = i; else CS.dyi = i; },
    exit:function(){ if(S.vista === 'graf'){ dynaPara(); S.vista = 'var'; S.fm = 'var'; return true; } if(S.vista === 'rng'){ S.vista = 'var'; S.fm = 'var'; return true; } if(S.vista === 'var'){ S.vista = 'dlista'; S.fm = 'root'; return true; } },
    fms:{
      root:[{t:'NEW', f:function(){ S.dnew = true; P = []; cur = 0; flash = 'Escribe la función nueva y pulsa EXE'; }}, {t:'EDIT', f:function(){ S.dnew = false; P = trozos(CS.dyf[CS.dyi] || ''); cur = P.length; }},
            {t:'DEL', f:function(){ confirma('dydel', 'Pulsa DEL otra vez para borrar esta función', function(){ CS.dyf.splice(CS.dyi, 1); if(!CS.dyf.length) CS.dyf = DYNA_DEF.slice(); CS.dyi = Math.min(CS.dyi, CS.dyf.length - 1); gCS(); }); }},
            {}, {t:'GPH', f:function(){ S.vista = 'var'; S.fm = 'var'; S.vi = 0; }}, {t:'VAR', f:function(){ S.vista = 'var'; S.fm = 'var'; S.vi = 0; }}],
      var:[{t:'SEL', f:function(){ var f = S.varFilas && S.varFilas[S.vi]; if(f && f[2][0] === 'v'){ CS.dyv = f[0]; gCS(); } }}, {}, {}, {t:'RNG', f:function(){ S.vista = 'rng'; S.fm = 'drng'; S.ri = 0; }}, {}, {t:'DYNA', f:function(){ dynaVa(); }}],
      drng:[RNGF[0], RNGF[1], {}, {}, {}, {t:'DYNA', f:function(){ dynaVa(); }}],
      dyn:[{}, {}, {}, {}, {}, {t:'STOP', f:function(){ dynaPara(); S.vista = 'var'; S.fm = 'var'; }}],
      graf:GF, zoom:ZF
    } };

  /* EQUA: sistemas de 2 a 6 incógnitas y polinomios de grado 2 o 3 */
  var INC = ['x', 'y', 'z', 't', 'u', 'v'];
  function eqDatos(){ if(S.eqT === 'sim'){ var n = S.eqN; if(!Array.isArray(CS.eq.s[n]) || CS.eq.s[n].length !== n * (n + 1)) CS.eq.s[n] = mNueva(n, n + 1).d; return {d:CS.eq.s[n], r:n, c:n + 1, head:'abcdefg'.slice(0, n + 1).split('')}; }
    var g = S.eqN; if(!Array.isArray(CS.eq.p[g]) || CS.eq.p[g].length !== g + 1) CS.eq.p[g] = mNueva(1, g + 1).d; return {d:CS.eq.p[g], r:1, c:g + 1, head:['a','b','c','d'].slice(0, g + 1)}; }
  MODOS.equa = { titulo:'EQUATION', inicio:'etop',
    body:function(){
      if(S.vista === 'etop') return '<div class="kc-lst"><div class="tt">EQUATION</div><div class="fr"><span>SELECT TYPE</span></div><div class="fr"><span>F1: SIMULTANEOUS</span></div><div class="fr"><span>F2: POLYNOMIAL</span></div></div>';
      if(S.vista === 'echoose') return '<div class="kc-lst"><div class="tt">' + (S.eqT === 'sim' ? 'SIMULTANEOUS' : 'POLYNOMIAL') + '</div><div class="big">' + (S.eqT === 'sim' ? 'Number of unknowns?' : 'Degree?') + '</div></div>';
      if(S.vista === 'egrid'){ var D = eqDatos(); var tit = S.eqT === 'sim' ? 'a₁x+b₁y…=c₁' : (S.eqN === 2 ? 'aX²+bX+c=0' : 'aX³+bX²+cX+d=0');
        return '<div class="kc-lst"><div class="tt">' + tit + '</div>' + gridHTML({rows:D.r, cols:D.c, head:D.head, cell:function(i, j){ return D.d[i * D.c + j]; }, i:S.ei, j:S.ej}) + '</div>' + linea(D.head[S.ej] + (D.r > 1 ? S.ei + 1 : '') + '='); }
      if(S.vista === 'eres') return '<div class="kc-lst"><div class="tt">' + (S.eqT === 'sim' ? 'Solución' : 'Raíces') + '</div>' + S.eqRes.map(function(r){ return '<div class="fr" ' + (typeof r[2] === 'number' ? 'data-v="' + r[2] + '"' : '') + '><span>' + r[0] + '=</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>' + (flash ? '<div class="pv">' + esc(flash) + '</div>' : '');
      return '';
    },
    exe:function(){
      if(S.vista === 'egrid'){ var D = eqDatos(); if(!P.length){ if(S.ej < D.c - 1) S.ej++; else if(S.ei < D.r - 1){ S.ei++; S.ej = 0; } return; }
        try{ var r = analiza(P); if(r.sto) throw 'sin'; D.d[S.ei * D.c + S.ej] = r.v; gCS(); P = []; cur = 0; if(S.ej < D.c - 1) S.ej++; else if(S.ei < D.r - 1){ S.ei++; S.ej = 0; } }catch(e){ errMsg = msgErr(e); } }
    },
    nav:function(a){ if(S.vista !== 'egrid') return; var D = eqDatos(); if(a === 'up') S.ei = Math.max(0, S.ei - 1); if(a === 'down') S.ei = Math.min(D.r - 1, S.ei + 1); if(a === 'left') S.ej = Math.max(0, S.ej - 1); if(a === 'right') S.ej = Math.min(D.c - 1, S.ej + 1); },
    exit:function(){ if(S.vista === 'eres'){ S.vista = 'egrid'; S.fm = 'egrid'; return true; } if(S.vista === 'egrid' || S.vista === 'echoose'){ S.vista = 'etop'; S.fm = 'root'; return true; } },
    fms:{
      root:[{t:'SIM', f:function(){ S.eqT = 'sim'; S.vista = 'echoose'; S.fm = 'nsim'; }}, {t:'PLY', f:function(){ S.eqT = 'ply'; S.vista = 'echoose'; S.fm = 'nply'; }}],
      nsim:[2, 3, 4, 5, 6].map(function(n){ return {t:String(n), f:function(){ S.eqN = n; S.vista = 'egrid'; S.fm = 'egrid'; S.ei = 0; S.ej = 0; }}; }),
      nply:[2, 3].map(function(n){ return {t:String(n), f:function(){ S.eqN = n; S.vista = 'egrid'; S.fm = 'egrid'; S.ei = 0; S.ej = 0; }}; }),
      egrid:[{t:'SOL', f:function(){ var D = eqDatos();
          try{
            if(S.eqT === 'sim'){ var x = resuelveSistema(D.r, D.d); S.eqRes = x.map(function(v, i){ return [INC[i], fmt(v), v]; }); }
            else { var R = raicesPol(D.d); S.eqRes = R.map(function(z, i){ return ['X' + (i + 1), fmtC(z), z.im ? undefined : z.re]; }); }
            S.vista = 'eres'; S.fm = 'eres';
          }catch(e){ errMsg = e === 'mat' ? (S.eqT === 'sim' ? 'Ma ERROR · el sistema no tiene una solución única' : 'Ma ERROR · el coeficiente a no puede ser 0') : msgErr(e); } }},
        {}, {t:'CLR', f:function(){ var D = eqDatos(); for(var k = 0; k < D.d.length; k++) D.d[k] = 0; gCS(); S.ei = 0; S.ej = 0; }}, {}, {}, {}],
      eres:[{}, {}, {}, {}, {}, {t:'REPT', f:function(){ S.vista = 'egrid'; S.fm = 'egrid'; }}]
    } };

  MODOS.mem = { titulo:'MEMORIAS A–Z', inicio:'mlista',
    body:function(){ var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); return '<div class="kc-lst"><div class="tt">MEMORIAS</div>' + L.map(function(x, i){ return fila(x, typeof MEM[x] === 'number' ? fmt(MEM[x]) : '—', i === S.mm, ' data-row="' + i + '"' + (typeof MEM[x] === 'number' ? ' data-v="' + MEM[x] + '"' : '')); }).join('') + '</div>' + linea(String.fromCharCode(65 + S.mm) + '='); },
    exe:function(){ if(!P.length){ S.mm = (S.mm + 1) % 26; return; } try{ var r = analiza(P); if(r.sto) throw 'sin'; MEM[String.fromCharCode(65 + S.mm)] = r.v; guarda(LS.mem, MEM); P = []; cur = 0; S.mm = (S.mm + 1) % 26; }catch(e){ errMsg = msgErr(e); } },
    nav:function(a){ if(a === 'up') S.mm = (S.mm + 25) % 26; if(a === 'down') S.mm = (S.mm + 1) % 26; },
    pick:function(i){ S.mm = i; },
    fms:{ root:[{t:'DEL', f:function(){ delete MEM[String.fromCharCode(65 + S.mm)]; guarda(LS.mem, MEM); }}, {t:'ER·A', f:function(){ confirma('memA', 'Pulsa ER·A otra vez para borrar las 26 memorias', function(){ MEM = {}; guarda(LS.mem, MEM); }); }}] } };

  var LCDTONO = ['#e9efd9', '#e3ebd0', '#dde6c7', '#d6e0bd', '#cfd9b3', '#c7d2a9', '#bfcb9f'];
  MODOS.option = { titulo:'OPTION', inicio:'opt',
    body:function(){
      var F = [['CONTRAST', '◀ ' + '■'.repeat(CS.lcd + 4) + '□'.repeat(6 - (CS.lcd + 3)) + ' ▶'], ['Borrar historial de COMP', ''], ['Borrar memorias A–Z', ''], ['Borrar datos de SD, REG, MAT, GRAPH, DYNA y EQUA', ''], ['RESET (todo lo anterior y el set up)', '']];
      return '<div class="kc-lst"><div class="tt">OPTION</div>' + F.map(function(f, i){ return fila(f[0], f[1], i === S.oi, ' data-row="' + i + '"'); }).join('') + '</div>' + (errMsg ? '<div class="err">' + esc(errMsg) + '</div>' : flash ? '<div class="pv">' + esc(flash) + '</div>' : '');
    },
    exe:function(){
      var acc = [null,
        function(){ H = []; guarda(LS.hist, H); flash = 'Historial borrado'; },
        function(){ MEM = {}; guarda(LS.mem, MEM); flash = 'Memorias borradas'; },
        function(){ var keep = {disp:CS.disp, base:CS.base, regT:CS.regT, lcd:CS.lcd, pant:CS.pant}; CS = keep; iniCS(); gCS(); flash = 'Datos de los modos borrados'; },
        function(){ H = []; MEM = {}; ans = 0; ang = 'deg'; CS = {}; iniCS(); guarda(LS.hist, H); guarda(LS.mem, MEM); guarda(LS.ans, 0); guarda(LS.ang, ang); gCS(); flash = 'RESET hecho'; }][S.oi];
      if(acc) confirma('opt' + S.oi, 'Pulsa EXE otra vez para confirmar', acc);
    },
    nav:function(a){ if(a === 'up') S.oi = (S.oi + 4) % 5; if(a === 'down') S.oi = (S.oi + 1) % 5;
      if(S.oi === 0 && (a === 'left' || a === 'right')){ CS.lcd = Math.max(-3, Math.min(3, CS.lcd + (a === 'right' ? 1 : -1))); gCS(); } },
    pick:function(i){ S.oi = i; },
    fms:{ root:[{t:'INIT', f:function(){ CS.lcd = 0; gCS(); }}] } };
  function iniCS(){                                    /* rellena lo que falte (tras un borrado) */
    if(!CS.disp) CS.disp = {t:'n', d:0}; if(!CS.base) CS.base = 'd'; CS.sd = CS.sd || []; CS.reg = CS.reg || []; if(!CS.regT) CS.regT = 'LIN'; CS.mat = CS.mat || {};
    if(!Array.isArray(CS.y) || CS.y.length !== 6) CS.y = [0,1,2,3,4,5].map(function(i){ return {e:'', on:true, c:i % 3}; });
    CS.rng = CS.rng || {x0:-4.7, x1:4.7, xs:1, y0:-3.1, y1:3.1, ys:1}; CS.tbl = CS.tbl || {s:-3, e:3, p:1};
    if(!Array.isArray(CS.dyf) || !CS.dyf.length) CS.dyf = DYNA_DEF.slice(); if(typeof CS.dyi !== 'number') CS.dyi = 0; CS.dyv = CS.dyv || 'A'; CS.dyr = CS.dyr || {s:1, e:5, p:1};
    CS.eq = CS.eq || {}; CS.eq.s = CS.eq.s || {}; CS.eq.p = CS.eq.p || {}; if(typeof CS.lcd !== 'number') CS.lcd = 0; if(!CS.pant) CS.pant = 'comp';
  }

  /* ---------- cambiar de pantalla ---------- */
  function abreModo(id, sinSetup){
    dynaPara();
    if(id === 'fin'){ ponModo('fin'); return; }
    var M = MODOS[id]; if(!M) return;
    S.pant = id; CS.pant = id; gCS(); P = []; cur = 0; hecho = false; errMsg = ''; flash = ''; replay = -1; S.tr = null; S.conf = null; S.pideDig = null;
    S.yi = S.yi || 0; S.ri = 0; S.ei = 0; S.ej = 0; S.mi = S.mi || 0; S.mm = S.mm || 0; S.oi = 0; S.vi = 0; S.dimPaso = 0; S.dnew = false;
    S.vista = M.inicio || 'run'; S.fm = 'root';
    if(!sinSetup && id !== 'option' && id !== 'mem') S.vista = 'setup';
  }
  function menu(){ dynaPara(); S.pant = 'menu'; P = []; cur = 0; errMsg = ''; flash = ''; S.menuSel = Math.max(0, TILES.map(function(t){ return t.id; }).indexOf(CS.pant)); }
  function salSetup(){ var M = MODOS[S.pant]; S.vista = M.inicio || 'run'; S.fm = 'root'; S.pideDig = null; }

  /* ---------- teclado de la calculadora ----------
     [etiqueta, acción, etiqueta SHIFT, acción SHIFT, letra ALPHA, clase] */
  var KF = [1, 2, 3, 4, 5, 6].map(function(n){ return ['F' + n, 'f' + n, '', '', '', 'fk']; });
  var KC = [['SHIFT','shift','','','','sh'], ['ALPHA','alpha','A-LOCK','alock','','alp'], ['EXIT','exit','QUIT','quit','','ctl'], ['MENU','menu','SET UP','setup','','ctl'],
            ['◀','left','|◀','home','','ar'], ['▲','up','','','','ar'], ['▼','down','','','','ar'], ['▶','right','▶|','end','','ar']];
  var K = [
    ['x²','²','√','√(','A',''], ['^','^','ˣ√','ˣ√','B',''], ['log','log(','10ˣ','10^(','C',''], ['ln','ln(','eˣ','𝑒^(','D',''], ['sin','sin(','sin⁻¹','sin⁻¹(','E',''],
    ['cos','cos(','cos⁻¹','cos⁻¹(','F',''], ['tan','tan(','tan⁻¹','tan⁻¹(','G',''], ['x⁻¹','⁻¹','x!','!','H',''], ['(','(','','','I',''], [')',')','','','J',''],
    ['X,θ,T','X','Abs','abs(','K',''], ['(−)','neg','∛','∛(','L',''], ['π','π','𝑒','𝑒','M',''], ['%','%','','','N',''], ['→','→','','','O',''],
    ['7','7','','','P','num'], ['8','8','','','Q','num'], ['9','9','','','R','num'], ['DEL','del','INS','del','S','del'], ['AC','ac','','','','del'],
    ['4','4','','','T','num'], ['5','5','','','U','num'], ['6','6','','','V','num'], ['×','×','','','W','op'], ['÷','÷','','','X','op'],
    ['1','1','','','Y','num'], ['2','2','','','Z','num'], ['3','3','','','','num'], ['+','+','','','','op'], ['−','−','','','','op'],
    ['0','0','','','','num'], [',',',','','','','num'], ['EXP','ᴇ','','','','num'], ['Ans','Ans','⧉','copy','','num'], ['EXE','exe','','','','exe']
  ];
  var TIT = {copy:'Copiar el último resultado', '→':'Guardar en una memoria: 25→A (luego ALPHA + tecla de la letra)', '%':'200+10% = 220 · 200×10% = 20', 'ᴇ':'×10 elevado a: 1,5ᴇ3 = 1500', 'del':'Borrar a la izquierda del cursor (Retroceso)', ac:'Borrar la línea; con la línea vacía, borra toda la pantalla', exe:'Calcular (Intro)', menu:'Menú principal (los 12 modos)', exit:'Volver atrás (Esc con la línea vacía)', X:'La X de las funciones (en COMP es la memoria X)'};
  function teclasHTML(arr, g){ return arr.map(function(k, i){
    return '<button type="button" data-g="' + g + '" data-i="' + i + '" class="' + k[5] + '"' + (TIT[k[1]] ? ' title="' + esc(TIT[k[1]]) + '"' : '') + '>' +
      (k[2] ? '<span class="s2">' + esc(k[2]) + '</span>' : '') + (k[4] ? '<span class="al">' + k[4] + '</span>' : '') + esc(k[0]) + '</button>'; }).join(''); }
  q(sci, '.kc-fk').innerHTML = teclasHTML(KF, 'f');
  q(sci, '.kc-ctl').innerHTML = teclasHTML(KC, 'c');
  keysBox.innerHTML = teclasHTML(K, 'k');
  var GRUPOS = {f:KF, c:KC, k:K};

  var OPS_TRAS = /^(\+|−|×|÷|\^|²|⁻¹|!|%|ˣ√|→)$/;
  function ins(txt){
    errMsg = ''; replay = -1;
    if(S.pant !== 'menu' && S.vista === 'setup') salSetup();
    if(hecho){ hecho = false; P = []; cur = 0; if(OPS_TRAS.test(txt) || (esSP(txt) && /^(xhat|yhat|and|or|xor|xnor)$/.test(txt.slice(1)))){ P = [S.pant === 'mat' && S.ansMat ? sp('matAns') : 'Ans']; cur = 1; } }
    P.splice(cur, 0, txt); cur++;
  }
  function menuAccion(a){
    var n = TILES.length;
    if(a === 'left') S.menuSel = (S.menuSel + n - 1) % n;
    else if(a === 'right') S.menuSel = (S.menuSel + 1) % n;
    else if(a === 'up') S.menuSel = (S.menuSel + n - 4) % n;
    else if(a === 'down') S.menuSel = (S.menuSel + 4) % n;
    else if(a === 'exe') abreModo(TILES[S.menuSel].id);
    else if(a === 'exit') abreModo(CS.pant && CS.pant !== 'menu' ? CS.pant : 'comp', true);
    else { var k = String(a).toUpperCase(), t = TILES.filter(function(x){ return x.k === k; })[0]; if(t) abreModo(t.id); }
  }
  function accion(a){
    if(a === 'shift'){ shift = !shift; return; }
    if(a === 'alpha'){ alpha = !alpha; if(!alpha) alphaLock = false; return; }
    if(a === 'alock'){ alphaLock = !alphaLock; alpha = alphaLock; return; }
    if(a === 'copy'){ var t = fmt(ans).replace(/\./g, '').replace('−', '-'); try{ navigator.clipboard.writeText(t); }catch(e){} flash = 'copiado: ' + t; return; }
    if(a === 'menu'){ menu(); return; }
    if(S.pant === 'menu'){ menuAccion(a); return; }
    var M = MODOS[S.pant];
    if(a === 'setup'){ dynaPara(); S.vista = 'setedit'; S.si = 0; S.fm = 'root'; return; }
    if(a === 'quit'){ abreModo(S.pant); return; }
    if(S.vista === 'setup' || S.vista === 'setedit') return setupAccion(a);
    if(/^f[1-6]$/.test(a)){
      errMsg = ''; flash = '';
      var fm = (M.fms || {})[S.fm] || (M.fms || {}).root || [], e = fm[+a[1] - 1];
      if(!e || (!e.f && !e.m)) return;
      if(e.m){ S.fm = e.m; return; }
      e.f(); return;
    }
    if(a === 'exit'){ errMsg = ''; flash = '';
      if(P.length){ P = []; cur = 0; return; }
      if(S.fm !== 'root' && M.fms && M.fms[S.fm] && !/^(edit|ers|lista|medit|see|rng|graf|zoom|trng|tab|var|drng|dyn|nsim|nply|egrid|eres)$/.test(S.fm)){ S.fm = 'root'; return; }
      if(S.fm === 'zoom'){ S.fm = 'graf'; return; }
      if(M.exit && M.exit()) return;
      menu(); return; }
    if(a === 'ac'){
      if(!P.length && !errMsg && S.vista === 'run' && (S.pant === 'comp' || ROLL[S.pant])){   /* AC con la línea vacía borra toda la pantalla, como la Casio */
        if(S.pant === 'comp'){ H = []; guarda(LS.hist, H); } else ROLL[S.pant] = [];
      }
      P = []; cur = 0; hecho = false; errMsg = ''; flash = ''; replay = -1; if(S.fm === 'dyn'){ dynaPara(); S.vista = 'var'; S.fm = 'var'; } return; }
    if(a === 'del'){ if(hecho) hecho = false; errMsg = ''; if(cur > 0){ P.splice(cur - 1, 1); cur--; } return; }
    var cursorOK = P.length > 0 && (a === 'left' || a === 'right' || a === 'home' || a === 'end');
    if(cursorOK){ hecho = false; if(a === 'left') cur = Math.max(0, cur - 1); if(a === 'right') cur = Math.min(P.length, cur + 1); if(a === 'home') cur = 0; if(a === 'end') cur = P.length; return; }
    if(/^(left|right|up|down|home|end)$/.test(a)){ errMsg = ''; flash = ''; if(M.nav) M.nav(a === 'home' ? 'left' : a === 'end' ? 'right' : a); return; }
    if(a === 'exe'){ errMsg = ''; flash = ''; if(M.exe) M.exe(); return; }
    if(a === 'neg'){ if(hecho){ hecho = false; P = []; cur = 0; } ins('−'); return; }
    if(S.vista === 'graf' || S.vista === 'etop' || S.vista === 'echoose' || S.vista === 'eres' || S.vista === 'see' || S.vista === 'tab') return;
    ins(a);
  }
  function setupAccion(a){
    var M = MODOS[S.pant], F = setupFilas(S.pant);
    if(S.pideDig){ if(/^[0-9]$/.test(a)){ CS.disp = {t:S.pideDig, d:+a}; gCS(); S.pideDig = null; flash = ''; } return; }
    if(S.vista === 'setup'){
      if(a === 'f6'){ S.vista = 'setedit'; S.si = 0; return; }
      if(/^f[1-5]$/.test(a)){ var fm = (M.fms || {}).root || []; var e = fm[+a[1] - 1]; salSetup(); if(e && e.m) S.fm = e.m; else if(e && e.f) e.f(); return; }
      if(a === 'exe' || a === 'ac' || a === 'down' || a === 'up' || a === 'left' || a === 'right'){ salSetup(); return; }
      if(a === 'exit'){ menu(); return; }
      salSetup(); accion(a); return;
    }
    /* setedit */
    var editable = F.map(function(f, i){ return f[2] ? i : -1; }).filter(function(i){ return i >= 0; });
    if(a === 'up' || a === 'down'){ var k = editable.indexOf(S.si); k = k < 0 ? 0 : (a === 'up' ? (k + editable.length - 1) % editable.length : (k + 1) % editable.length); S.si = editable[k]; return; }
    if(editable.indexOf(S.si) < 0) S.si = editable[0];
    if(/^f[1-6]$/.test(a)){ var opts = SETF[F[S.si][2]] || [], o = opts[+a[1] - 1]; if(o){ o.f(); } return; }
    if(a === 'exit' || a === 'exe' || a === 'ac'){ S.vista = 'setup'; S.pideDig = null; flash = ''; return; }
  }

  /* ---------- pintar la pantalla ---------- */
  function fmPintar(){
    if(S.pant === 'menu') return [];
    var M = MODOS[S.pant];
    if(S.vista === 'setup'){ var r = ((M.fms || {}).root || []).slice(0, 5).map(function(e){ return e && e.t ? {t:e.t, m:e.m} : {}; }); while(r.length < 5) r.push({}); r.push({t:'SET'}); return r; }
    if(S.vista === 'setedit'){ var F = setupFilas(S.pant), sel = F[S.si] || F[0]; return (SETF[sel && sel[2]] || []).map(function(o){ return {t:o.t}; }); }
    var fm = (M.fms || {})[S.fm] || (M.fms || {}).root || [];
    return fm.map(function(e){ return e && e.t ? {t:e.t, m:e.m, on:e.on && e.on()} : {}; });
  }
  function setupHTML(){
    var M = MODOS[S.pant], F = setupFilas(S.pant), tit = typeof M.titulo === 'function' ? M.titulo() : M.titulo, ed = S.vista === 'setedit';
    if(ed && (S.si === undefined || !F[S.si] || !F[S.si][2])) S.si = F.map(function(f){ return !!f[2]; }).indexOf(true);
    return '<div class="kc-lst"><div class="tt">' + esc(tit) + '</div>' + F.map(function(f, i){ return fila(esc(f[0]), ':' + esc(f[1]), ed && i === S.si); }).join('') + '</div>' +
      '<div class="pv">' + esc(flash || (ed ? '▲▼ elige · F1–F3 cambian · EXIT vuelve' : 'EXE o empieza a escribir · F6 cambia el set up')) + '</div>';
  }
  function menuHTML(){
    return '<div class="kc-menu"><div class="mt"><span></span>MAIN MENU<span></span></div><div class="mg">' + TILES.map(function(t, i){
      return '<div class="tile' + (i === S.menuSel ? ' sel' : '') + (t.id === 'option' ? ' opt' : '') + '" data-tile="' + i + '"><span class="tn">' + t.n + '</span><svg viewBox="0 0 36 26" font-family="monospace" font-weight="700" font-size="12">' + ICO[t.id] + '</svg>' + (t.id === 'option' ? '<span class="on">OPTION</span>' : '') + '<span class="tk">' + t.k + '</span></div>';
    }).join('') + '</div></div>';
  }
  var lcd = q(sci, '.kc-lcd'), scr = q(sci, '.kc-scr'), flBox = q(sci, '.kc-fl');
  function pinta(){
    panel.classList.toggle('s', shift); panel.classList.toggle('a', alpha);
    q(sci, '.kc-st .s').classList.toggle('on', shift);
    var aEl = q(sci, '.kc-st .a'); aEl.classList.toggle('on', alpha); aEl.textContent = alphaLock ? 'A-LOCK' : 'A';
    q(sci, '.kc-st .md').textContent = S.pant === 'menu' ? 'MENU' : nombreModo(S.pant) + (S.pant === 'base' ? ' ' + BNOM[CS.base] : '');
    q(sci, '.kc-st .ang').textContent = ANGN[ang] + (CS.disp.t !== 'n' ? ' ' + dispTxt() : '');
    q(sci, '.kc-st .ansv').textContent = S.pant === 'base' ? 'Ans = ' + enBase(i32safe(ans), CS.base) : 'Ans = ' + fmt(ans);
    lcd.style.background = LCDTONO[CS.lcd + 3] || LCDTONO[3];
    var h;
    if(S.pant === 'menu') h = menuHTML();
    else if(S.vista === 'setup' || S.vista === 'setedit') h = setupHTML();
    else h = MODOS[S.pant].body();
    scr.innerHTML = h;
    var fl = fmPintar(); while(fl.length < 6) fl.push({});
    flBox.innerHTML = fl.slice(0, 6).map(function(e, i){ return '<span data-f="' + (i + 1) + '" class="' + (e.m ? 'sub' : '') + (e.on ? ' on' : '') + '">' + esc(e.t || '') + '</span>'; }).join('');
    if(S.pant !== 'menu' && S.vista !== 'setup' && S.vista !== 'setedit' && MODOS[S.pant].post) MODOS[S.pant].post();
    var L = q(scr, '.kc-lst');
    if(L){ var s = q(L, '.sel'); if(s){ var top = s.offsetTop, bot = top + s.offsetHeight; if(top < L.scrollTop + 18) L.scrollTop = Math.max(0, top - 18); else if(bot > L.scrollTop + L.clientHeight) L.scrollTop = bot - L.clientHeight; } else if(L.classList.contains('abajo')) L.scrollTop = L.scrollHeight; }
    var ks = Object.keys(MEM).filter(function(k){ return /^[A-Z]$/.test(k) && typeof MEM[k] === 'number'; }).sort();
    memBox.innerHTML = ks.length && S.pant !== 'mem' ? ks.map(function(k){ return '<span data-m="' + k + '" title="Meter ' + k + ' en la operación"><b>' + k + '</b> = ' + fmt(MEM[k]) + '</span>'; }).join('') : '';
    if(flash && !/^(Dato|Borrado|copiado|Ans =|Datos|Copiada|Historial|Memorias|RESET|Fix|Sci|Mat|Escribe|Y\d|Operaciones|Ojo)/.test(flash)) flash = '';
  }
  function i32safe(v){ try{ return i32(v); }catch(e){ return 0; } }

  sci.addEventListener('click', function(e){
    var b = e.target.closest('button[data-g]');
    if(b){
      var k = GRUPOS[b.getAttribute('data-g')][+b.getAttribute('data-i')];
      flash = '';
      if(alpha && k[4]){ accion(k[4]); if(!alphaLock) alpha = false; shift = false; pinta(); return; }
      var a = (shift && k[3]) ? k[3] : k[1];
      if(k[1] === 'alpha' && shift){ a = 'alock'; }
      if(k[1] !== 'shift') shift = false;
      accion(a); pinta(); return;
    }
    var f = e.target.closest('[data-f]'); if(f){ shift = false; accion('f' + f.getAttribute('data-f')); pinta(); return; }
    var t = e.target.closest('[data-tile]'); if(t){ S.menuSel = +t.getAttribute('data-tile'); abreModo(TILES[S.menuSel].id); pinta(); return; }
    var m = e.target.closest('.kc-mem span[data-m]'); if(m){ if(S.pant === 'menu') abreModo('comp', true); ins(m.getAttribute('data-m')); pinta(); return; }
    var d = e.target.closest('[data-h],[data-r]');
    if(d && S.pant !== 'menu'){ var L = listaRoll(); if(!L) return;
      if(d.hasAttribute('data-h')){ var x = L[+d.getAttribute('data-h')]; if(!x) return; P = piezasDe(x); if(x.s) P.push('→', x.s); cur = P.length; hecho = false; errMsg = ''; }
      else { var y = L[+d.getAttribute('data-r')]; if(!y || y.k === 'mat') return; if(hecho){ hecho = false; P = []; cur = 0; } P.splice(cur, 0, S.pant === 'base' ? enBase(y.r, CS.base).replace(/ /g, '') : num(y.r)); cur++; errMsg = ''; }
      pinta(); return; }
    var c = e.target.closest('[data-cell]');
    if(c && S.pant !== 'menu'){ var ij = c.getAttribute('data-cell').split(','); if(/^(edit|medit|egrid)$/.test(S.vista)){ S.ei = +ij[0]; S.ej = +ij[1]; pinta(); return; }
      if(S.vista === 'tab') S.ti = +ij[0]; }
    var v = e.target.closest('[data-v]'); if(v){ var n = +v.getAttribute('data-v'); if(isFinite(n)){ ans = n; guarda(LS.ans, ans); flash = 'Ans = ' + fmt(n); } }
    var r = e.target.closest('[data-row]'); if(r && S.pant !== 'menu'){ var M = MODOS[S.pant]; if(M.pick) M.pick(+r.getAttribute('data-row')); }
    if(v || r || c) pinta();
  });
  q(sci, '.kc-st .ang').addEventListener('click', function(){ if(S.pant === 'menu') return; S.vista = 'setedit'; S.si = undefined; pinta(); });

  /* teclado físico: va antes que el de la calculadora vieja (que sigue cargada pero ya no pinta nada) */
  var VIEJAS = /^([0-9.+\-*/=%]|Enter|Backspace|Escape)$/;
  document.addEventListener('keydown', function(e){
    if(panel.classList.contains('hidden')) return;
    var ae = document.activeElement; if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if(modo !== 'sci'){ if(VIEJAS.test(k)) e.stopImmediatePropagation(); return; }
    var m = {'*':'×', '/':'÷', '-':'−', '.':',', 'Enter':'exe', '=':'exe', 'Backspace':'del', 'Delete':'ac', 'ArrowLeft':'left', 'ArrowRight':'right', 'ArrowUp':'up', 'ArrowDown':'down', 'Home':'home', 'End':'end', '>':'→'};
    var t = m[k] || (/^[0-9+()^%,!;]$/.test(k) ? k : (/^[A-Za-z]$/.test(k) ? k : null));
    if(k === 'Escape') t = P.length ? 'ac' : 'exit';
    if(!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    shift = false; if(!alphaLock) alpha = false; flash = '';
    accion(t); pinta();
  }, true);

  /* =================== MODO FINANCIERO =================== */
  var nf2 = new Intl.NumberFormat('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2, useGrouping:'always'});
  var nf0 = new Intl.NumberFormat('es-ES', {maximumFractionDigits:0, useGrouping:'always'});
  var nf4 = new Intl.NumberFormat('es-ES', {minimumFractionDigits:2, maximumFractionDigits:4, useGrouping:'always'});
  var E = function(v){ return nf2.format(v) + ' €'; };
  var Pc = function(v){ return nf2.format(v * 100) + ' %'; };
  var N0 = function(v){ return nf0.format(v); };
  var N4 = function(v){ return nf4.format(v); };
  var plazo = function(m0){ var m = Math.ceil(m0 - 1e-6); var a = Math.floor(m / 12), r = Math.round(m - a * 12); return ((a ? a + (a === 1 ? ' año' : ' años') : '') + (a && r ? ' y ' : '') + (r ? r + (r === 1 ? ' mes' : ' meses') : '')) || '0 meses'; };
  function leeNum(txt){
    var s = String(txt == null ? '' : txt).trim().replace(/[€%\s]/g, '');
    if(s === '') return null;
    if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    return evalNum(s);
  }
  function leeFecha(s){ s = String(s || '').trim(); var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if(m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return null; }
  var fF = function(d){ return d.toISOString().slice(0, 10).split('-').reverse().join('/'); };
  function hoyUTC(){ var d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  function bis(f, lo, hi, it){ var flo = f(lo), fhi = f(hi); if(!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for(var k = 0; k < (it || 300); k++){ var mid = (lo + hi) / 2, fm = f(mid); if(!isFinite(fm)) return null; if(fm === 0) return mid; if(flo * fm < 0){ hi = mid; fhi = fm; } else { lo = mid; flo = fm; } } return (lo + hi) / 2; }
  function raiz(f, lo, hi, pasos){ var a = lo, fa = f(a), h = (hi - lo) / pasos; for(var k = 1; k <= pasos; k++){ var b = lo + h * k, fb = f(b); if(isFinite(fa) && isFinite(fb) && fa * fb <= 0) return bis(f, a, b); a = b; fa = fb; } return null; }
  function Fallo(m){ this.message = m; }
  var falla = function(m){ throw new Fallo(m); };
  var tabla = function(cab, filas){ return '<div class="kc-tabla"><table><thead><tr>' + cab.map(function(c){ return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + filas.map(function(f){ return '<tr>' + f.map(function(c){ return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; };
  var cuotaF = function(C, r, M){ var i = r / 1200; return Math.abs(i) < 1e-12 ? C / M : C * i / (1 - Math.pow(1 + i, -M)); };
  function anualPrestamo(C, r, q){             /* cuadro por años de un préstamo francés */
    var i = r / 1200, B = C, k = 0, ints = 0, filas = [], ay = {c:0, i:0, a:0};
    while(B > 1e-7 && k < 1200){ k++; var it = B * i, pago = Math.min(q, B + it), am = pago - it; B -= am; ints += it; ay.c += pago; ay.i += it; ay.a += am;
      if(k % 12 === 0 || B <= 1e-7){ filas.push([Math.ceil(k / 12), E(ay.c), E(ay.i), E(ay.a), E(Math.max(B, 0))]); ay = {c:0, i:0, a:0}; } }
    return {filas:filas, meses:k, ints:ints};
  }

  /* datos de mercado que ya tiene la app: se leen una vez al abrir la financiera */
  var MERC = null, MERC_P = null;
  function cargaMercado(){
    if(MERC_P) return MERC_P;
    var uno = function(f){ return fetch(f, {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }); };
    MERC_P = Promise.all([uno('macro.json'), uno('macro-mercado.json'), uno('divisa/ejemplos.json')]).then(function(a){
      var ind = Object.assign({}, (a[0] && a[0].ind) || {}, (a[1] && a[1].ind) || {});
      var fx = {};
      if(ind.eur_usd && +ind.eur_usd.v > 0) fx.USD = {v:+ind.eur_usd.v, f:ind.eur_usd.f, src:'EUR/USD de la app (' + (ind.eur_usd.src || 'mercado diario') + ')'};
      if(ind.eur_brl && +ind.eur_brl.v > 0) fx.BRL = {v:+ind.eur_brl.v, f:ind.eur_brl.f, src:'EUR/BRL de la app (' + (ind.eur_brl.src || 'macro.json') + ')'};
      var eurib = ind.euribor_12m && +ind.euribor_12m.v ? {v:+ind.euribor_12m.v, f:ind.euribor_12m.f} : null;
      var serie = (a[2] && Array.isArray(a[2].eurusd)) ? a[2].eurusd : null;
      MERC = {fx:fx, eurib:eurib, eurusd:serie};
      return MERC;
    });
    return MERC_P;
  }
  var fFiso = function(s){ return s ? String(s).slice(0, 10).split('-').reverse().join('/') : ''; };
  var coma = function(x, d){ return String(+(+x).toFixed(d)).replace('.', ','); };

  var DIVISAS = [['USD','Dólar estadounidense (USD)','$'], ['GBP','Libra esterlina (GBP)','£'], ['CHF','Franco suizo (CHF)','CHF'], ['BRL','Real brasileño (BRL)','R$'], ['MXN','Peso mexicano (MXN)','MXN'], ['JPY','Yen japonés (JPY)','¥'], ['OTRA','Otra divisa','']];
  function posicionesCartera(){
    try{ return (typeof _mcPosiciones === 'function' ? _mcPosiciones() : []).filter(function(p){ return p && p.acc > 0; }).sort(function(a, b){ return String(a.ticker).localeCompare(String(b.ticker)); }); }catch(e){ return []; }
  }
  function primeraCompra(tk){
    try{ var f = (DB.operaciones || []).filter(function(o){ return String(o.ticker || '').toUpperCase() === tk && o.tipo === 'compra' && o.fecha; }).map(function(o){ return o.fecha; }).sort()[0]; return f || null; }catch(e){ return null; }
  }
  function divDesde(tk, f0){
    try{ var L = (DB.dividendos || {})[tk] || [], hoy = new Date().toISOString().slice(0, 10), s = 0, n = 0;
      L.forEach(function(d){ if(d && d.fecha && d.fecha >= f0 && d.fecha <= hoy && +d.importe > 0){ s += +d.importe; n++; } }); return n ? {s:s, n:n} : null; }catch(e){ return null; }
  }

  var CALCS = [
  // ---------- Ahorro y préstamos ----------
  { id:'ic', g:'Ahorro y préstamos', n:'Interés compuesto',
    a:'Rellena cuatro datos y deja vacío el que quieras calcular. Si los rellenas todos, calcula el capital final. La aportación se hace al final de cada periodo.',
    c:[{k:'va',e:'Capital inicial (€)',ph:'10.000'},{k:'pmt',e:'Aportación periódica (€)',ph:'200'},{k:'r',e:'Interés anual (%)',ph:'7'},{k:'n',e:'Años',ph:'15'},{k:'vf',e:'Capital final (€)',ph:'vacío = lo calcula'},
       {k:'m',e:'Aportaciones y capitalización',t:'sel',o:[['12','Mensual'],['4','Trimestral'],['1','Anual']],d:'12'}],
    f:function(v){ var m = +v.m; var vac = ['va','pmt','r','n','vf'].filter(function(k){ return v[k] === null; });
      if(vac.length > 1) falla('Deja vacío solo el dato que quieres calcular.');
      var inc = vac[0] || 'vf';
      var F = function(va, pmt, r, n){ var i = r / 100 / m, k = n * m; if(Math.abs(i) < 1e-12) return va + pmt * k; var g = Math.pow(1 + i, k); return va * g + pmt * (g - 1) / i; };
      var va = v.va, pmt = v.pmt, r = v.r, n = v.n, vf = v.vf, i, k, g, A;
      if(inc === 'vf') vf = F(va, pmt, r, n);
      else if(inc === 'va'){ i = r / 100 / m; k = n * m; g = Math.pow(1 + i, k); A = Math.abs(i) < 1e-12 ? k : (g - 1) / i; va = (vf - pmt * A) / g; if(va < 0) falla('Con esa aportación ya llegas sin capital inicial.'); }
      else if(inc === 'pmt'){ i = r / 100 / m; k = n * m; g = Math.pow(1 + i, k); A = Math.abs(i) < 1e-12 ? k : (g - 1) / i; pmt = (vf - va * g) / A; if(pmt < 0) falla('Con ese capital inicial ya llegas sin aportar nada.'); }
      else if(inc === 'n'){ n = bis(function(x){ return F(va, pmt, r, x) - vf; }, 0, 300); if(n === null) falla('Con esos datos no se llega a ese capital ni en 300 años.'); }
      else if(inc === 'r'){ r = bis(function(x){ return F(va, pmt, x, n) - vf; }, -50, 100); if(r === null) falla('No hay un interés entre −50 % y 100 % que dé ese capital.'); }
      var tot = va + pmt * n * m, ints = vf - tot;
      var prin = {va:['Capital inicial necesario',E(va),va], pmt:['Aportación necesaria por periodo',E(pmt),pmt], r:['Interés anual necesario',Pc(r / 100),r], n:['Años necesarios',N4(n) + ' años',n], vf:['Capital final',E(vf),vf]}[inc];
      var filas = [], Y = Math.min(Math.ceil(n), 100);
      for(var y = 1; y <= Y; y++){ var yy = Math.min(y, n), c = F(va, pmt, r, yy), ap = va + pmt * yy * m; filas.push([y, E(ap), E(c - ap), E(c)]); }
      return { filas:[{t:'Resultado'}, prin.concat([1]), ['Total aportado',E(tot),tot], ['Intereses ganados',E(ints),ints], ['Parte del capital final que son intereses',Pc(vf > 0 ? ints / vf : 0),vf > 0 ? ints / vf * 100 : 0]],
        det:['Evolución año a año', tabla(['Año','Aportado','Intereses','Capital'], filas)] }; } },

  { id:'pr', g:'Ahorro y préstamos', n:'Préstamo: cuota, plazo o interés',
    a:'Cuotas mensuales. Rellena tres de los cuatro primeros datos y deja vacío el que quieras calcular (si rellenas todos, calcula la cuota). Si quieres, añade una amortización anticipada para comparar reducir cuota o reducir plazo. Para una compra de vivienda con gastos y Euríbor, usa «Simulador de hipoteca».',
    c:[{k:'C',e:'Capital prestado (€)',ph:'150.000'},{k:'r',e:'Interés nominal anual, TIN (%)',ph:'3'},{k:'n',e:'Plazo (años)',ph:'25'},{k:'q',e:'Cuota mensual (€)',ph:'vacío = la calcula'},
       {k:'ant',e:'Amortización anticipada (€, opcional)',ph:'10.000'},{k:'mes',e:'En el mes número',ph:'60'}],
    f:function(v){ var vac = ['C','r','n','q'].filter(function(k){ return v[k] === null; }); if(vac.length > 1) falla('Deja vacío solo el dato que quieres calcular.');
      var inc = vac[0] || 'q', C = v.C, r = v.r, n = v.n, q = v.q, i, M;
      if(inc === 'q') q = cuotaF(C, r, n * 12);
      else if(inc === 'C'){ i = r / 1200; M = n * 12; C = Math.abs(i) < 1e-12 ? q * M : q * (1 - Math.pow(1 + i, -M)) / i; }
      else if(inc === 'n'){ i = r / 1200; if(q <= C * i) falla('Con esa cuota no se cubren ni los intereses: el préstamo no se acaba nunca.'); n = (Math.abs(i) < 1e-12 ? C / q : -Math.log(1 - C * i / q) / Math.log(1 + i)) / 12; }
      else if(inc === 'r'){ if(q * n * 12 < C) falla('Con esa cuota y ese plazo no se devuelve ni el capital.'); r = bis(function(x){ return cuotaF(C, x, n * 12) - q; }, 0, 100); if(r === null) falla('No hay un interés razonable que dé esa cuota.'); }
      i = r / 1200;
      function sim(extra, modoA){ var B = C, Q = q, k = 0, ints = 0, pag = 0, anual = [], ay = {c:0, i:0, a:0};
        var Mtot = Math.ceil(n * 12 - 1e-9);
        while(B > 1e-7 && k < 1200){ k++; var it = B * i, pago = Math.min(Q, B + it), am = pago - it; B -= am; ints += it; pag += pago; ay.c += pago; ay.i += it; ay.a += am;
          if(extra && k === extra.mes){ var x = Math.min(extra.imp, B); B -= x; ay.a += x; pag += x; if(modoA === 'cuota' && B > 1e-7){ var rest = Mtot - k; if(rest > 0) Q = cuotaF(B, r, rest); } }
          if(k % 12 === 0 || B <= 1e-7){ anual.push([Math.ceil(k / 12), E(ay.c), E(ay.i), E(ay.a), E(Math.max(B, 0))]); ay = {c:0, i:0, a:0}; } }
        return {meses:k, ints:ints, pag:pag, anual:anual, Q:Q}; }
      var base = sim();
      var prin = {q:['Cuota mensual',E(q),q], C:['Capital que puedes pedir',E(C),C], n:['Plazo necesario',plazo(n * 12),n], r:['Interés nominal (TIN)',Pc(r / 100),r]}[inc];
      var filas = [{t:'Resultado'}, prin.concat([1]), ['Número de cuotas',N0(base.meses),base.meses], ['Total de intereses',E(base.ints),base.ints], ['Total pagado',E(base.pag),base.pag], ['Intereses sobre lo prestado',Pc(base.ints / C),base.ints / C * 100]];
      var aviso = '';
      if(v.ant !== null && v.ant > 0){ if(v.mes === null || v.mes < 1 || v.mes >= base.meses) falla('Indica en qué mes haces la amortización anticipada (entre 1 y ' + (base.meses - 1) + ').');
        var ex = {imp:v.ant, mes:Math.round(v.mes)}, rc = sim(ex, 'cuota'), rp = sim(ex, 'plazo');
        filas.push({t:'Amortizando ' + E(v.ant) + ' en el mes ' + ex.mes},
          ['Reduciendo cuota: nueva cuota',E(rc.Q),rc.Q], ['   intereses que te ahorras',E(base.ints - rc.ints),base.ints - rc.ints],
          ['Reduciendo plazo: cuota igual, acabas en',plazo(rp.meses),rp.meses], ['   meses que te quitas',N0(base.meses - rp.meses),base.meses - rp.meses], ['   intereses que te ahorras',E(base.ints - rp.ints),base.ints - rp.ints]);
        aviso = 'Reducir plazo casi siempre ahorra más intereses; reducir cuota deja más dinero libre cada mes. Muchos bancos cobran comisión por amortizar: no está incluida.'; }
      return {filas:filas, aviso:aviso, det:['Cuadro de amortización por años', tabla(['Año','Pagado','Intereses','Capital','Pendiente'], base.anual)]}; } },

  { id:'tae', g:'Ahorro y préstamos', n:'TAE ↔ TIN',
    a:'Rellena uno de los dos y calcula el otro. La TAE incluye el efecto de cobrar o pagar intereses varias veces al año (sin comisiones).',
    c:[{k:'tin',e:'TIN, nominal anual (%)',ph:'3'},{k:'tae',e:'TAE (%)',ph:'vacío = la calcula'},{k:'m',e:'Liquidaciones al año',t:'sel',o:[['12','Mensual (12)'],['4','Trimestral (4)'],['2','Semestral (2)'],['1','Anual (1)']],d:'12'}],
    f:function(v){ var m = +v.m; if(v.tin === null && v.tae === null) falla('Rellena el TIN o la TAE.');
      var t; if(v.tin !== null){ t = Math.pow(1 + v.tin / 100 / m, m) - 1; return {filas:[{t:'Resultado'}, ['TAE',Pc(t),t * 100,1], ['TIN',Pc(v.tin / 100),v.tin]]}; }
      t = m * (Math.pow(1 + v.tae / 100, 1 / m) - 1); return {filas:[{t:'Resultado'}, ['TIN',Pc(t),t * 100,1], ['TAE',Pc(v.tae / 100),v.tae]]}; } },

  { id:'van', g:'Ahorro y préstamos', n:'VAN y TIR de una inversión',
    a:'Escribe un flujo por línea: lo que pones en negativo (−1000) y lo que recibes en positivo. Sin fechas, cada línea es un año (la primera es hoy). Con fechas («15/03/2024; −1000»), calcula la rentabilidad anual real con las fechas exactas: sirve para aportaciones en momentos distintos. El valor de hoy de la inversión va como último flujo positivo.',
    c:[{k:'fl',e:'Flujos',t:'area',ph:'15/01/2022; -5000\n10/06/2023; -2000\n20/06/2024; 300\n28/10/2026; 8200',w:1},{k:'tasa',e:'Tasa para el VAN (%, opcional)',ph:'6'}],
    f:function(v, raw){ var ls = String(raw.fl || '').split(/\n/).map(function(s){ return s.trim(); }).filter(Boolean); if(ls.length < 2) falla('Hacen falta al menos dos flujos.');
      var fl = ls.map(function(l){ var p = l.split(';'), x; if(p.length >= 2){ var d = leeFecha(p[0]); x = leeNum(p.slice(1).join(';')); if(!d || !isFinite(x)) falla('No entiendo la línea: ' + l); return {d:d, x:x}; } x = leeNum(l); if(x === null || !isFinite(x)) falla('No entiendo la línea: ' + l); return {x:x}; });
      var conF = fl.filter(function(o){ return o.d; }).length; if(conF && conF !== fl.length) falla('Pon fecha en todas las líneas o en ninguna.');
      if(!fl.some(function(o){ return o.x < 0; }) || !fl.some(function(o){ return o.x > 0; })) falla('Tiene que haber al menos un flujo negativo y uno positivo.');
      if(conF){ fl.sort(function(a, b){ return a.d - b.d; }); var d0 = fl[0].d; fl.forEach(function(o){ o.t = (o.d - d0) / 864e5 / 365; }); } else fl.forEach(function(o, k){ o.t = k; });
      var van = function(r){ return fl.reduce(function(s, o){ return s + o.x / Math.pow(1 + r, o.t); }, 0); };
      var tir = raiz(van, -0.99, 10, 2000);
      var neto = fl.reduce(function(s, o){ return s + o.x; }, 0), puesto = -fl.filter(function(o){ return o.x < 0; }).reduce(function(s, o){ return s + o.x; }, 0);
      var filas = [{t:'Resultado'}];
      if(tir !== null) filas.push(['Rentabilidad anual (TIR)',Pc(tir),tir * 100,1]); else filas.push(['Rentabilidad anual (TIR)','no se puede calcular',0]);
      if(v.tasa !== null){ var x = van(v.tasa / 100); filas.push(['VAN al ' + N4(v.tasa) + ' %',E(x),x]); }
      filas.push(['Total puesto',E(puesto),puesto], ['Ganancia neta (suma de flujos)',E(neto),neto]);
      if(conF) filas.push(['Periodo',fF(fl[0].d) + ' – ' + fF(fl[fl.length - 1].d),fl[fl.length - 1].t]);
      return {filas:filas, aviso:v.tasa !== null ? 'VAN positivo: la inversión rinde más que la tasa que has puesto; negativo: menos.' : ''}; } },

  { id:'cagr', g:'Ahorro y préstamos', n:'Rentabilidad anual compuesta',
    a:'Crecimiento medio por año entre dos valores. Si hubo aportaciones por el camino, usa «VAN y TIR» con fechas; para una acción con dividendos, «Rentabilidad de una inversión».',
    c:[{k:'vi',e:'Valor inicial (€)',ph:'10.000'},{k:'vf',e:'Valor final (€)',ph:'16.500'},{k:'n',e:'Años',ph:'6'}],
    f:function(v){ if(v.vi === null || v.vf === null || v.n === null) falla('Rellena los tres datos.'); if(v.vi <= 0 || v.vf < 0 || v.n <= 0) falla('Los valores y los años tienen que ser positivos.');
      var g = Math.pow(v.vf / v.vi, 1 / v.n) - 1; return {filas:[{t:'Resultado'}, ['Rentabilidad anual compuesta',Pc(g),g * 100,1], ['Rentabilidad total',Pc(v.vf / v.vi - 1),(v.vf / v.vi - 1) * 100], ['Multiplicador','× ' + N4(v.vf / v.vi),v.vf / v.vi]]}; } },

  { id:'inf', g:'Ahorro y préstamos', n:'Inflación y rentabilidad real',
    a:'Lo que pierde el dinero con la inflación. Si pones lo que te rinde una inversión, calcula la rentabilidad real (descontada la inflación).',
    c:[{k:'x',e:'Importe (€)',ph:'1.000'},{k:'pi',e:'Inflación media anual (%)',ph:'2,5'},{k:'n',e:'Años',ph:'10'},{k:'rn',e:'Rentabilidad nominal anual (%, opcional)',ph:'6'}],
    f:function(v){ if(v.pi === null) falla('Pon la inflación media anual.'); var filas = [{t:'Resultado'}];
      if(v.x !== null && v.n !== null){ var g = Math.pow(1 + v.pi / 100, v.n);
        filas.push(['Para comprar lo mismo dentro de ' + N4(v.n) + ' años necesitarás',E(v.x * g),v.x * g,1], ['Dentro de ' + N4(v.n) + ' años, ' + E(v.x) + ' compran lo que hoy',E(v.x / g),v.x / g], ['Poder de compra perdido',Pc(1 - 1 / g),(1 - 1 / g) * 100],
          ['Lo que ' + E(v.x) + ' de hace ' + N4(v.n) + ' años valen hoy',E(v.x * g),v.x * g]); }
      if(v.rn !== null){ var rr = (1 + v.rn / 100) / (1 + v.pi / 100) - 1; filas.push(['Rentabilidad real anual',Pc(rr),rr * 100,filas.length === 1 ? 1 : 0]); }
      if(filas.length === 1) falla('Rellena importe y años, o la rentabilidad nominal.'); return {filas:filas}; } },

  // ---------- Vivienda ----------
  { id:'hip', g:'Vivienda', n:'Simulador de hipoteca',
    a:'Desde el precio de la casa: lo que tienes que pedir, la cuota, lo que pagas en intereses y cuánto se come de tu sueldo. En variable, el tipo es Euríbor + diferencial y se supone que el Euríbor se queda donde está; abajo ves qué pasa si sube.',
    c:[{k:'pv',e:'Precio de la vivienda (€)',ph:'250.000'},{k:'ah',e:'Ahorro que pones (€)',ph:'75.000'},
       {k:'g',e:'Impuestos y gastos de compra (% del precio)',ph:'10',d:'10'},{k:'n',e:'Plazo (años)',ph:'30'},
       {k:'tipo',e:'Tipo de interés',t:'sel',o:[['f','Fijo'],['v','Variable (Euríbor + diferencial)']],d:'f'},
       {k:'tin',e:'TIN fijo (%)',ph:'2,9',vis:function(r){ return r.tipo !== 'v'; }},
       {k:'eur',e:'Euríbor 12 meses (%)',ph:'3,2',vis:function(r){ return r.tipo === 'v'; },d:function(){ return MERC && MERC.eurib ? coma(MERC.eurib.v, 3) : ''; }},
       {k:'dif',e:'Diferencial (%)',ph:'0,6',vis:function(r){ return r.tipo === 'v'; }},
       {k:'ing',e:'Ingresos netos del hogar al mes (€, opcional)',ph:'3.200'}],
    pie:function(){ return MERC && MERC.eurib ? 'Euríbor 12 meses en la app: ' + coma(MERC.eurib.v, 3) + ' % (' + fFiso(MERC.eurib.f) + ').' : ''; },
    f:function(v, raw){ if(v.pv === null || v.ah === null || v.n === null) falla('Rellena precio, ahorro y plazo.');
      if(v.pv <= 0 || v.n <= 0) falla('El precio y el plazo tienen que ser positivos.');
      var gp = (v.g === null ? 10 : v.g) / 100, gastos = v.pv * gp, necesitas = v.pv + gastos, C = necesitas - v.ah;
      if(C <= 0) falla('Con ese ahorro pagas la casa y los gastos sin hipoteca.');
      var r; if(raw.tipo === 'v'){ if(v.eur === null || v.dif === null) falla('Pon el Euríbor y el diferencial.'); r = v.eur + v.dif; } else { if(v.tin === null) falla('Pon el TIN fijo.'); r = v.tin; }
      var M = Math.round(v.n * 12), q = cuotaF(C, r, M), am = anualPrestamo(C, r, q), ints = q * M - C;
      var ltv = C / v.pv;
      var filas = [{t:'Lo que tienes que pedir'}, ['Impuestos y gastos de compra',E(gastos),gastos], ['Dinero total de la compra',E(necesitas),necesitas], ['Hipoteca',E(C),C], ['Financiación sobre el precio',Pc(ltv),ltv * 100],
        {t:'La hipoteca (' + (raw.tipo === 'v' ? 'variable, ' + N4(r) + ' % hoy' : 'fija, ' + N4(r) + ' %') + ')'}, ['Cuota mensual',E(q),q,1], ['Intereses en total',E(ints),ints], ['Total que devuelves al banco',E(q * M),q * M],
        ['Coste total de la casa (precio + gastos + intereses)',E(necesitas + ints),necesitas + ints]];
      if(v.ing !== null && v.ing > 0){ var esf = q / v.ing; filas.push(['Cuota sobre tus ingresos',Pc(esf),esf * 100]); }
      filas.push({t:'Si el tipo cambia'});
      [-1, 1, 2].forEach(function(d){ var r2 = r + d; if(r2 < 0) return; var q2 = cuotaF(C, r2, M); filas.push([(d > 0 ? '+' : '') + d + ' punto' + (Math.abs(d) > 1 ? 's' : '') + ' (' + N4(r2) + ' %): cuota',E(q2) + ' (' + (q2 >= q ? '+' : '−') + nf2.format(Math.abs(q2 - q)) + ')',q2]); });
      var avisos = [];
      if(ltv > 0.8 + 1e-9) avisos.push('Pides más del 80 % del precio: los bancos suelen financiar hasta el 80 % del valor de tasación. Para quedarte en el 80 % necesitas ahorrar ' + E(v.pv * 0.2 + gastos) + ' (20 % del precio + gastos).');
      if(v.ing !== null && v.ing > 0 && q / v.ing > 0.35) avisos.push('La cuota pasa del 35 % de tus ingresos: es el límite que suelen mirar los bancos y deja poco margen si algo se tuerce.');
      if(raw.tipo === 'v') avisos.push('En variable la cuota se revisa con el Euríbor (normalmente cada 6 o 12 meses); esta cuenta supone que no se mueve.');
      avisos.push('Los gastos de compra dependen de la comunidad y de si es nueva (IVA) o usada (ITP): ajusta el porcentaje. No incluye tasación, seguros vinculados ni comisiones.');
      return {filas:filas, aviso:avisos.join(' '), det:['Cuadro de amortización por años', tabla(['Año','Pagado','Intereses','Capital','Pendiente'], am.filas)]}; } },

  // ---------- Divisas ----------
  { id:'fx', g:'Divisas', n:'Conversión euro ↔ divisa',
    a:'El cambio va en unidades de la divisa por 1 euro (como el EUR/USD: 1 € = 1,12 $). Para dólares y reales se rellena solo con el último dato de la app; para el resto, ponlo tú. Si tu banco o bróker cobra por cambiar, pon la comisión.',
    c:[{k:'x',e:'Importe',ph:'1.000'},{k:'sen',e:'Sentido',t:'sel',o:[['ed','De euros a la divisa'],['de','De la divisa a euros']],d:'ed'},
       {k:'div',e:'Divisa',t:'sel',o:DIVISAS.map(function(d){ return [d[0], d[1]]; }),d:'USD'},
       {k:'tc',e:'Cambio: divisa por 1 €',ph:'1,12',d:function(raw){ var a = MERC && MERC.fx[raw.div || 'USD']; return a ? coma(a.v, 4) : ''; }},
       {k:'com',e:'Comisión del cambio (%, opcional)',ph:'0,5'}],
    auto:{k:'tc', de:'div', valor:function(div){ var a = MERC && MERC.fx[div]; return a ? coma(a.v, 4) : null; }},
    pie:function(raw){ var a = MERC && MERC.fx[raw.div]; return a ? 'Cambio de la app: 1 € = ' + coma(a.v, 4) + ' ' + raw.div + ' (' + fFiso(a.f) + ' · ' + a.src + '). Es el cambio de mercado; el de tu banco será algo peor.' : (raw.div === 'OTRA' ? '' : 'La app no trae el cambio de esta divisa: escríbelo tú.'); },
    f:function(v, raw){ if(v.x === null) falla('Pon el importe.'); if(v.tc === null || !(v.tc > 0)) falla('Pon el cambio (unidades de la divisa por 1 €).');
      var d = DIVISAS.filter(function(x){ return x[0] === raw.div; })[0] || DIVISAS[0], sim = d[2] || (raw.div === 'OTRA' ? 'uds.' : raw.div);
      var c = (v.com || 0) / 100, filas = [{t:'Resultado'}], bruto, neto;
      var D = function(x){ return nf2.format(x) + ' ' + sim; };
      if(raw.sen === 'de'){ bruto = v.x / v.tc; neto = bruto * (1 - c);
        filas.push([D(v.x) + ' son',E(neto),neto,1]); if(c) filas.push(['Sin comisión serían',E(bruto),bruto], ['Comisión',E(bruto - neto),bruto - neto]); }
      else { bruto = v.x * v.tc; neto = bruto * (1 - c);
        filas.push([E(v.x) + ' son',D(neto),neto,1]); if(c) filas.push(['Sin comisión serían',D(bruto),bruto], ['Comisión',D(bruto - neto) + ' (' + E(v.x * c) + ')',v.x * c]); }
      filas.push({t:'Cambio'}, ['1 € =',N4(v.tc) + ' ' + sim,v.tc], ['1 ' + sim + ' =',nf4.format(1 / v.tc) + ' €',1 / v.tc]);
      var aviso = '';
      if(raw.div === 'USD' && MERC && MERC.eurusd && MERC.eurusd.length > 13){
        var S = MERC.eurusd, u = S[S.length - 1], h = S[S.length - 13];
        if(u && h && +h[1] > 0){ var dv = v.tc / h[1] - 1;
          filas.push(['Hace un año (' + h[0].split('-').reverse().join('/') + ')',N4(h[1]) + ' $',+h[1]]);
          aviso = 'Desde entonces el euro ' + (dv >= 0 ? 'ha subido' : 'ha bajado') + ' un ' + nf2.format(Math.abs(dv) * 100) + ' % frente al dólar: ' + (dv >= 0 ? 'lo que tienes en dólares vale menos en euros.' : 'lo que tienes en dólares vale más en euros.'); } }
      return {filas:filas, aviso:aviso}; } },

  // ---------- Inversor ----------
  { id:'rent', g:'Inversor', n:'Rentabilidad de una inversión',
    a:'Lo que te ha dado una acción contando la cotización y los dividendos, en total y por año. Puedes rellenarla con una posición de tu cartera. Si compraste en varias veces o aportaste por el camino, la cifra exacta es la de «VAN y TIR» con fechas.',
    c:[{k:'pos',e:'Rellenar con una posición de la cartera (opcional)',t:'sel',w:1,o:function(){ return [['','—']].concat(posicionesCartera().map(function(p){ return [p.ticker, p.ticker + (p.nombre ? ' · ' + p.nombre : '')]; })); },d:''},
       {k:'pc',e:'Precio de compra (€/acción)',ph:'10,50'},{k:'pa',e:'Precio actual o de venta (€/acción)',ph:'13,20'},
       {k:'dv',e:'Dividendos brutos cobrados por acción (€)',ph:'1,85'},{k:'ret',e:'Retención de los dividendos (%)',ph:'19',d:'19'},
       {k:'fc',e:'Fecha de compra',t:'txt',ph:'15/03/2021'},{k:'fv',e:'Fecha de venta (vacío = hoy)',t:'txt',ph:'hoy'},
       {k:'acc',e:'Acciones (opcional, para verlo en euros)',ph:'500'},{k:'com',e:'Comisiones de compra y venta (€, opcional)',ph:'16'}],
    rellena:function(tk, set){
      var p = posicionesCartera().filter(function(x){ return x.ticker === tk; })[0]; if(!p) return '';
      set('pc', coma(p.pmedio, 4)); if(+p.cot > 0) set('pa', coma(p.cot, 3)); set('acc', coma(p.acc, 4)); set('com', ''); set('fv', '');
      var f0 = primeraCompra(tk); if(f0) set('fc', fFiso(f0));
      var dd = f0 ? divDesde(tk, f0) : null; set('dv', dd ? coma(dd.s, 4) : '');
      return 'Rellenado con tu posición en ' + tk + ': precio medio (con comisiones de compra), cotización de la app y fecha de tu primera compra' +
        (dd ? '. Dividendos: suma de los ' + dd.n + ' pagos por acción del calendario de la app desde esa fecha; si compraste en varias veces, lo que cobraste por acción es menos.' : '. No hay dividendos en el calendario de la app desde esa fecha: ponlos tú si los hubo.');
    },
    f:function(v, raw){ if(v.pc === null || v.pa === null) falla('Rellena precio de compra y precio actual.'); if(v.pc <= 0 || v.pa < 0) falla('Los precios tienen que ser positivos.');
      var dv = v.dv || 0, ret = (v.ret === null ? 19 : v.ret) / 100, dn = dv * (1 - ret);
      var comAcc = (v.com && v.acc) ? v.com / v.acc : 0;
      var rp = v.pa / v.pc - 1, rdb = dv / v.pc, rdn = dn / v.pc, tb = rp + rdb - comAcc / v.pc, tn = rp + rdn - comAcc / v.pc;
      var filas = [{t:'Rentabilidad'}, ['Total, con dividendos netos',Pc(tn),tn * 100,1], ['Total, con dividendos brutos',Pc(tb),tb * 100], ['Por la cotización',Pc(rp),rp * 100], ['Por los dividendos (netos)',Pc(rdn),rdn * 100]];
      if(comAcc) filas.push(['Lo que restan las comisiones',Pc(-comAcc / v.pc),-comAcc / v.pc * 100]);
      var fc = raw.fc ? leeFecha(raw.fc) : null, fv = raw.fv && String(raw.fv).trim() && String(raw.fv).trim().toLowerCase() !== 'hoy' ? leeFecha(raw.fv) : hoyUTC();
      if(raw.fc && !fc) falla('No entiendo la fecha de compra (dd/mm/aaaa).'); if(!fv) falla('No entiendo la fecha de venta (dd/mm/aaaa).');
      var aviso = '';
      if(fc){ var an = (fv - fc) / 864e5 / 365.25; if(an <= 0) falla('La fecha de venta tiene que ser posterior a la de compra.');
        if(1 + tn > 0){ var ga = Math.pow(1 + tn, 1 / an) - 1; filas.push({t:'Por año (' + N4(an) + ' años)'}, ['Rentabilidad anual compuesta',Pc(ga),ga * 100]); }
        if(an < 1) aviso = 'Menos de un año: la rentabilidad anualizada exagera lo que pasaría en un año entero. ';
        var rdAnual = rdn / an; filas.push(['Dividendo neto medio por año sobre lo invertido',Pc(rdAnual),rdAnual * 100]); }
      if(v.acc){ var inv = v.acc * v.pc, gp = v.acc * (v.pa - v.pc), gd = v.acc * dn, tot = gp + gd - (v.com || 0);
        filas.push({t:'En euros (' + N4(v.acc) + ' acciones)'}, ['Invertido',E(inv),inv], ['Valor hoy',E(v.acc * v.pa),v.acc * v.pa], ['Ganancia por cotización',E(gp),gp], ['Dividendos netos',E(gd),gd]);
        if(v.com) filas.push(['Comisiones',E(-v.com),-v.com]); filas.push(['Ganancia total',E(tot),tot]); }
      aviso += 'Con dividendos netos: lo que llega a tu cuenta tras la retención española. La plusvalía no descuenta el impuesto de la venta (ver «Plusvalía al vender»).';
      return {filas:filas, aviso:aviso}; } },

  { id:'scrip', g:'Inversor', n:'Scrip: ¿acciones o vender derechos?',
    a:'Recibes un derecho por cada acción. Compara quedarte con acciones nuevas o vender los derechos (a la empresa a precio fijo o en el mercado: los dos llevan hoy retención).',
    c:[{k:'acc',e:'Acciones que tienes',ph:'1.200'},{k:'k',e:'Derechos por acción nueva',ph:'45'},{k:'pd',e:'Precio del derecho (€)',ph:'0,182'},{k:'pa',e:'Precio de la acción (€, opcional)',ph:'8,30'},
       {k:'pm',e:'Tu precio medio (€, opcional)',ph:'7,10'},{k:'ret',e:'Retención si vendes (%)',ph:'19',d:'19'}],
    f:function(v){ ['acc','k','pd'].forEach(function(k){ if(v[k] === null) falla('Rellena acciones, derechos por acción nueva y precio del derecho.'); });
      var acc = Math.floor(v.acc), k = Math.round(v.k), ret = (v.ret === null ? 19 : v.ret) / 100, nuevas = Math.floor(acc / k), sob = acc % k;
      var bruto = acc * v.pd, filas = [{t:'Opción A · quedarte con acciones'}, ['Acciones nuevas',N0(nuevas),nuevas,1], ['Derechos sobrantes',N0(sob),sob]];
      if(sob > 0){ filas.push(['   venderlos: neto',E(sob * v.pd * (1 - ret)),sob * v.pd * (1 - ret)], ['   o comprar ' + N0(k - sob) + ' derechos para una acción más',E((k - sob) * v.pd),(k - sob) * v.pd]); }
      if(v.pa !== null) filas.push(['Valor de las acciones nuevas',E(nuevas * v.pa),nuevas * v.pa]);
      if(v.pm !== null){ var npm = v.pm * acc / (acc + nuevas); filas.push(['Tu nuevo precio medio',E(npm).replace(' €', ' €/acc.'),npm]); }
      filas.push({t:'Opción B · vender todos los derechos'}, ['Bruto',E(bruto),bruto], ['Retención',E(bruto * ret),bruto * ret], ['Neto',E(bruto * (1 - ret)),bruto * (1 - ret),1]);
      return {filas:filas, aviso:'Con acciones no pagas impuesto ahora: tu coste se reparte entre más acciones y tributarás cuando vendas. Vendiendo, cobras ya con retención.'}; } },

  { id:'pm', g:'Inversor', n:'Precio medio al comprar más',
    a:'Calcula tu precio medio tras una compra. Si pones un precio medio objetivo, te dice cuántas acciones tendrías que comprar para llegar a él.',
    c:[{k:'x',e:'Acciones que tienes',ph:'500'},{k:'y',e:'Tu precio medio (€)',ph:'12,40'},{k:'z',e:'Acciones que compras',ph:'200'},{k:'w',e:'Precio de compra (€)',ph:'9,80'},
       {k:'com',e:'Comisión de la compra (€, opcional)',ph:'5'},{k:'obj',e:'Precio medio objetivo (€, opcional)',ph:'11'}],
    f:function(v){ if(v.x === null || v.y === null || v.w === null) falla('Rellena acciones, precio medio y precio de compra.'); var com = v.com || 0, filas = [];
      if(v.z !== null){ var npm = (v.x * v.y + v.z * v.w + com) / (v.x + v.z); filas.push({t:'Tras la compra'}, ['Nuevo precio medio',E(npm),npm,1], ['Acciones totales',N0(v.x + v.z),v.x + v.z], ['Dinero de la compra',E(v.z * v.w + com),v.z * v.w + com], ['Bajada del precio medio',Pc(npm / v.y - 1),(npm / v.y - 1) * 100]); }
      if(v.obj !== null){ filas.push({t:'Para llegar a ' + E(v.obj)});
        if(!(v.w < v.obj && v.obj < v.y) && !(v.w > v.obj && v.obj > v.y)) filas.push(['No se puede','el objetivo tiene que estar entre tu precio medio y el de compra',0]);
        else { var z = Math.ceil((v.x * (v.y - v.obj) + com) / (v.obj - v.w)); filas.push(['Acciones a comprar',N0(z),z,filas.length ? 0 : 1], ['Dinero necesario',E(z * v.w + com),z * v.w + com]); } }
      if(!filas.length) falla('Pon las acciones que compras o un precio medio objetivo.'); return {filas:filas}; } },

  { id:'div', g:'Inversor', n:'Dividendo neto',
    a:'Lo que te llega de un dividendo. Para una empresa extranjera pon la retención de su país: parte se recupera en la renta (hasta el límite del convenio y nunca más que la retención española).',
    c:[{k:'dpa',e:'Dividendo bruto por acción (€)',ph:'0,45'},{k:'acc',e:'Acciones',ph:'800'},{k:'ret',e:'Retención española (%)',ph:'19',d:'19'},{k:'ro',e:'Retención en origen (%, 0 si es española)',ph:'0',d:'0'},
       {k:'lim',e:'Límite del convenio (%)',ph:'15',d:'15'},{k:'base',e:'La retención española se calcula sobre',t:'sel',o:[['b','el bruto'],['n','el bruto menos la de origen']],d:'b'},
       {k:'pm',e:'Tu precio medio (€, opcional)',ph:'9,20'},{k:'pa',e:'Precio actual (€, opcional)',ph:'11,05'}],
    f:function(v){ if(v.dpa === null || v.acc === null) falla('Rellena dividendo por acción y acciones.'); var ret = (v.ret === null ? 19 : v.ret) / 100, ro = (v.ro || 0) / 100, lim = (v.lim === null ? 15 : v.lim) / 100;
      var br = v.dpa * v.acc, or = br * ro, es = (v.base === 'n' ? br - or : br) * ret, neto = br - or - es, rec = Math.min(or, br * lim, br * ret);
      var filas = [{t:'Cobro'}, ['Bruto',E(br),br], ['Retención en origen',E(or),or], ['Retención española',E(es),es], ['Neto que te llega',E(neto),neto,1]];
      if(or > 0) filas.push({t:'En la declaración'}, ['Recuperable por doble imposición',E(rec),rec], ['Neto final tras la renta',E(neto + rec),neto + rec], ['Lo que no recuperas en la renta',E(or - rec),or - rec]);
      if(v.pm !== null || v.pa !== null) filas.push({t:'Rentabilidad bruta'});
      if(v.pm !== null) filas.push(['Sobre tu precio medio',Pc(v.dpa / v.pm),v.dpa / v.pm * 100]);
      if(v.pa !== null) filas.push(['Sobre el precio actual',Pc(v.dpa / v.pa),v.dpa / v.pa * 100]);
      return {filas:filas, aviso:or > lim * br + 1e-9 ? 'La retención en origen supera el límite del convenio: el exceso solo se puede reclamar al país de origen.' : ''}; } },

  { id:'plus', g:'Inversor', n:'Plusvalía al vender',
    a:'Hacienda considera que vendes primero las acciones que compraste primero. Escribe tus compras de esa empresa, una por línea: «fecha; acciones; precio; comisión». Las acciones recibidas en un scrip van con precio 0 y la fecha de las acciones de las que salen.',
    c:[{k:'co',e:'Compras',t:'area',ph:'12/03/2019; 300; 10,50; 8\n05/11/2021; 200; 8,20; 8\n20/09/2026; 100; 9,90; 5',w:1},
       {k:'fv',e:'Fecha de venta',t:'txt',ph:'28/10/2026'},{k:'nv',e:'Acciones que vendes',ph:'400'},{k:'pv',e:'Precio de venta (€)',ph:'11,20'},{k:'cv',e:'Comisión de la venta (€)',ph:'8'},
       {k:'otras',e:'Otras ganancias del ahorro este año (€, opcional)',ph:'1.200'},{k:'tr',e:'Tramos del ahorro («hasta:%», el último sin límite)',t:'txt',ph:'6000:19; 50000:21; 200000:23; 300000:27; :30',d:'6000:19; 50000:21; 200000:23; 300000:27; :30',w:1}],
    f:function(v, raw){ var ls = String(raw.co || '').split(/\n/).map(function(s){ return s.trim(); }).filter(Boolean); if(!ls.length) falla('Escribe al menos una compra.');
      var co = ls.map(function(l){ var p = l.split(';'), d = leeFecha(p[0] || ''), qn = leeNum(p[1]), pr = leeNum(p[2]), cm = p[3] !== undefined ? leeNum(p[3]) : 0;
        if(!d || qn === null || !isFinite(qn) || pr === null || !isFinite(pr) || (cm !== null && !isFinite(cm))) falla('No entiendo la compra: ' + l); return {d:d, q:qn, pr:pr, cm:cm || 0}; }).sort(function(a, b){ return a.d - b.d; });
      var fv = leeFecha(raw.fv || ''); if(!fv) falla('Pon la fecha de venta (dd/mm/aaaa).'); if(v.nv === null || v.pv === null) falla('Rellena acciones que vendes y precio de venta.');
      var total = co.filter(function(c){ return c.d <= fv; }).reduce(function(s, c){ return s + c.q; }, 0); if(v.nv > total + 1e-9) falla('Vendes ' + N0(v.nv) + ' acciones pero hasta esa fecha solo tenías ' + N0(total) + '.');
      var rest = v.nv, coste = 0, usadas = [], quedan = [];
      co.forEach(function(c){ if(c.d > fv){ quedan.push(Object.assign({}, c)); return; } var t = Math.min(rest, c.q); if(t > 0){ var x = t * c.pr + c.cm * t / c.q; coste += x; usadas.push([fF(c.d), N4(t), E(c.pr), E(x)]); rest -= t; } if(c.q - t > 0) quedan.push(Object.assign({}, c, {q:c.q - t, cm:c.cm * (c.q - t) / c.q})); });
      var venta = v.nv * v.pv - (v.cv || 0), g = venta - coste;
      var tr = String(raw.tr || '').split(/;/).map(function(s){ return s.trim(); }).filter(Boolean).map(function(s){ var hp = s.split(':'); return {h:hp[0] === '' ? Infinity : leeNum(hp[0]), p:leeNum(hp[1]) / 100}; });
      if(tr.some(function(t){ return !isFinite(t.p) || t.h === null || Number.isNaN(t.h); })) falla('No entiendo los tramos.');
      var imp = 0, ini = Math.max(v.otras || 0, 0);
      if(g > 0){ var lo = 0; tr.forEach(function(t){ var a = Math.max(lo, ini), b = Math.min(t.h, ini + g); if(b > a) imp += (b - a) * t.p; lo = t.h; }); }
      var qn2 = quedan.reduce(function(s, c){ return s + c.q; }, 0), qc = quedan.reduce(function(s, c){ return s + c.q * c.pr + c.cm; }, 0);
      var filas = [{t:'Resultado'}, [g >= 0 ? 'Ganancia' : 'Pérdida',E(g),g,1], ['Valor de venta (menos comisión)',E(venta),venta], ['Coste fiscal de lo vendido',E(coste),coste]];
      if(g > 0) filas.push(['Impuesto estimado',E(imp),imp], ['Tipo medio sobre la ganancia',Pc(imp / g),imp / g * 100], ['Te queda neto de la ganancia',E(g - imp),g - imp]);
      if(qn2 > 0) filas.push({t:'Lo que te queda'}, ['Acciones',N4(qn2),qn2], ['Precio medio fiscal',E(qc / qn2),qc / qn2]);
      var aviso = '';
      if(g < 0){ var dos = new Date(fv); dos.setUTCMonth(dos.getUTCMonth() - 2); var lim = new Date(fv); lim.setUTCMonth(lim.getUTCMonth() + 2);
        var rec = co.filter(function(c){ return c.d >= dos && c.d <= fv && quedan.some(function(qq){ return qq.d.getTime() === c.d.getTime(); }); });
        aviso = (rec.length ? 'Ojo: compraste acciones de esta empresa en los dos meses anteriores (' + rec.map(function(c){ return fF(c.d); }).join(', ') + ') y siguen en cartera: esta pérdida no se podrá compensar hasta que las vendas. ' : '') + 'Si recompras antes del ' + fF(lim) + ', tampoco podrás compensar la pérdida todavía.'; }
      return {filas:filas, aviso:aviso, det:['Compras que se consideran vendidas', tabla(['Fecha','Acciones','Precio','Coste'], usadas)]}; } }
  ];

  var finId = lee(LS.finId, 'ic'); if(!CALCS.some(function(c){ return c.id === finId; })) finId = 'ic';
  var GUARD = lee(LS.fin, {}) || {};
  var sel = q(fin, '.kc-sel'), ayuda = q(fin, '.kc-ayuda'), campos = q(fin, '.kc-campos'), salida = q(fin, '.kc-sal'), ansMsg = q(fin, '.kc-ansmsg');
  var grupos = []; CALCS.forEach(function(c){ if(grupos.indexOf(c.g) < 0) grupos.push(c.g); });
  sel.innerHTML = grupos.map(function(g){ return '<optgroup label="' + esc(g) + '">' + CALCS.filter(function(c){ return c.g === g; }).map(function(c){ return '<option value="' + c.id + '">' + esc(c.n) + '</option>'; }).join('') + '</optgroup>'; }).join('');
  sel.addEventListener('change', function(){ finId = sel.value; guarda(LS.finId, finId); finPinta(); });
  function calcAct(){ return CALCS.filter(function(c){ return c.id === finId; })[0] || CALCS[0]; }
  var notaRelleno = '';
  function valDef(f, raw){ return typeof f.d === 'function' ? f.d(raw || {}) : (f.d !== undefined ? f.d : ''); }
  function finPinta(){
    var C = calcAct(); sel.value = C.id; ayuda.textContent = C.a; campos.innerHTML = ''; notaRelleno = '';
    var g = GUARD[C.id] || {};
    /* el cambio automático de divisa se renueva si el que había guardado era el automático */
    if(C.auto && g[C.auto.k + '_auto']){ var nv = C.auto.valor(g[C.auto.de] || 'USD'); if(nv !== null) g[C.auto.k] = nv; }
    C.c.forEach(function(f){
      var L = document.createElement('label'); if(f.t === 'area' || f.w) L.className = 'ancho'; L.setAttribute('data-k', f.k);
      L.appendChild(document.createTextNode(f.e)); var el;
      if(f.t === 'sel'){ el = document.createElement('select'); (typeof f.o === 'function' ? f.o() : f.o).forEach(function(o){ var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; el.appendChild(op); }); }
      else if(f.t === 'area') el = document.createElement('textarea');
      else { el = document.createElement('input'); el.type = 'text'; el.inputMode = f.t === 'txt' ? 'text' : 'decimal'; el.autocomplete = 'off'; }
      if(f.ph && f.t !== 'sel') el.placeholder = f.ph;
      el.setAttribute('data-k', f.k);
      el.value = g[f.k] !== undefined ? g[f.k] : valDef(f, g);
      if(f.t === 'sel' && el.selectedIndex < 0) el.selectedIndex = 0;
      el.addEventListener('input', function(){ cambio(f); }); if(f.t === 'sel') el.addEventListener('change', function(){ cambio(f); });
      L.appendChild(el); campos.appendChild(L);
    });
    finCalcula();
  }
  function campo(k){ return campos.querySelector('[data-k="' + k + '"]:not(label)'); }
  function cambio(f){
    var C = calcAct();
    if(C.auto && f.k === C.auto.de){ var nv = C.auto.valor(campo(f.k).value); campo(C.auto.k).value = nv !== null ? nv : ''; }
    if(C.rellena && f.k === 'pos'){ var tk = campo('pos').value; notaRelleno = tk ? C.rellena(tk, function(k, x){ var el = campo(k); if(el) el.value = x; }) : ''; }
    finCalcula();
  }
  function finCalcula(){
    var C = calcAct(), raw = {}, v = {}, malo = null;
    if(C.c.some(function(f){ return !campo(f.k); })) return;
    C.c.forEach(function(f){ var val = campo(f.k).value; raw[f.k] = val; if(f.t === 'sel' || f.t === 'area' || f.t === 'txt') v[f.k] = val; else { var x = leeNum(val); if(Number.isNaN(x)) malo = f.e; v[f.k] = x; } });
    C.c.forEach(function(f){ if(f.vis){ var L = campos.querySelector('label[data-k="' + f.k + '"]'); var ve = f.vis(raw); L.style.display = ve ? '' : 'none'; if(!ve){ v[f.k] = null; } } });
    var save = Object.assign({}, raw);
    if(C.auto){ var av = C.auto.valor(raw[C.auto.de]); save[C.auto.k + '_auto'] = av !== null && raw[C.auto.k] === av; }
    if(C.rellena) delete save.pos;
    GUARD[C.id] = save; guarda(LS.fin, GUARD);
    salida.innerHTML = '';
    var pie = C.pie ? C.pie(raw) : '';
    var nota = function(){ var t = [notaRelleno, pie].filter(Boolean).join(' '); if(t){ var d = document.createElement('div'); d.className = 'aviso'; d.style.background = '#f1f5f9'; d.style.color = '#475569'; d.textContent = t; salida.appendChild(d); } };
    if(malo){ salida.innerHTML = '<div class="error">No entiendo lo escrito en «' + esc(malo) + '».</div>'; return; }
    var hayAlgo = C.c.some(function(f){ return f.t !== 'sel' && String(raw[f.k] || '').trim() !== '' && String(raw[f.k]) !== String(valDef(f, raw)); });
    if(!hayAlgo){ salida.innerHTML = '<div class="vacio">Rellena los datos y el resultado sale aquí.</div>'; nota(); return; }
    var r; try{ r = C.f(v, raw); }catch(e){ salida.innerHTML = '<div class="error">' + esc(e instanceof Fallo ? e.message : 'Faltan datos o hay alguno que no cuadra.') + '</div>'; nota(); return; }
    r.filas.forEach(function(fl){
      if(!Array.isArray(fl)){ var t = document.createElement('div'); t.className = 'tit'; t.textContent = fl.t; salida.appendChild(t); return; }
      var d = document.createElement('div'); d.className = 'fila' + (fl[3] ? ' prin' : ''); d.title = 'Pulsa para guardar en Ans';
      var s = document.createElement('span'); s.textContent = fl[0]; var b = document.createElement('b'); b.textContent = fl[1]; d.appendChild(s); d.appendChild(b);
      d.addEventListener('click', function(){ if(typeof fl[2] === 'number' && isFinite(fl[2])){ ans = fl[2]; guarda(LS.ans, ans); ansMsg.textContent = 'Guardado en Ans: ' + fmt(ans); pinta(); } });
      salida.appendChild(d);
    });
    if(r.aviso){ var a = document.createElement('div'); a.className = 'aviso'; a.textContent = r.aviso; salida.appendChild(a); }
    nota();
    if(r.det){ var dt = document.createElement('details'); dt.innerHTML = '<summary>' + r.det[0] + '</summary>' + r.det[1]; salida.appendChild(dt); }
  }

  /* ---------- modo ---------- */
  function ponModo(m){
    if(m === 'fin') dynaPara();
    modo = m; guarda(LS.modo, m);
    panel.classList.toggle('fin', m === 'fin');
    sci.style.display = m === 'sci' ? '' : 'none'; fin.style.display = m === 'fin' ? '' : 'none';
    [].forEach.call(tabs.children, function(b){ b.classList.toggle('on', b.getAttribute('data-m') === m); });
    if(m === 'fin'){ finPinta(); cargaMercado().then(function(){ if(modo === 'fin') finPinta(); }); }
    else pinta();
  }
  tabs.addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) ponModo(b.getAttribute('data-m')); });
  /* el panel cabe en pantalla aunque se haya arrastrado y luego se ensanche */
  new MutationObserver(function(){
    if(panel.classList.contains('hidden') || !panel.style.left) return;
    var r = panel.getBoundingClientRect(); if(r.right > window.innerWidth) panel.style.left = Math.max(0, window.innerWidth - r.width - 8) + 'px';
  }).observe(panel, {attributes:true, attributeFilter:['class']});

  ponModo(modo);
  window.khCalc = {analiza:analiza, fmt:fmt, mem:function(){ return MEM; }, calcs:CALCS, leeNum:leeNum, baseCalc:baseCalc, matCalc:matCalc, raices:raicesPol, sistema:resuelveSistema, S:S, CS:function(){ return CS; }, accion:function(a){ accion(a); pinta(); }};   /* para las pruebas */
})();
