/* =====================================================================
   n-9g-calcsci.js · CALCULADORA (11-nov-2026). Carlos: «copiar una Casio CFX-9800G y su forma de anotar,
   sus memorias, sin la programación; y añadir conversiones euro/divisa, rentabilidad y simulador de hipotecas».
   Sustituye por dentro el panel flotante de siempre (botón 🧮 de la cabecera); la cabecera se conserva
   (arrastrar y cerrar siguen igual). Dos modos:

   CIENTÍFICA (a lo Casio)
     · Se escribe la operación entera, como en el papel: 2(3+4)², sin(30), 5ˣ√32, 1,5ᴇ3…
     · EXE da el resultado en la línea de abajo, a la derecha; las cuentas anteriores quedan arriba
       (el «rollo»). Pulsar una operación vieja la vuelve a cargar para corregirla; pulsar su resultado
       lo mete en la operación. ↑ recupera las anteriores una a una (el «replay» de la Casio).
     · Tras EXE, si lo siguiente es un operador, sigue con «Ans» (2+3 EXE ×4 EXE = 20).
     · Memorias A–Z: 25→A guarda; ALPHA + tecla escribe la letra (letra roja de cada tecla) y la
       operación usa su valor (A×2). Se guardan en este navegador. Sin programas.
     · SHIFT activa la segunda función (en naranja). SHIFT ALPHA fija las letras.
     · DEG/RAD (SHIFT Ans o pulsando el indicador). Prioridades de la Casio: la multiplicación
       sin signo va antes (1÷2π = 1÷(2π)); el signo va por fuera de la potencia (−2² = −4).
     · El % funciona como en el móvil: 200+10% = 220 · 200−10% = 180 · 200×10% = 20.
     · Coma decimal (el punto también vale). Teclado: números, + − * / ^ ( ) % !, Intro = EXE,
       Retroceso = DEL, Esc = AC, flechas, letras = memorias, > = →.
   FINANCIERA (el prototipo del 28-oct, mismas fórmulas) más tres cálculos nuevos:
     · Divisas: euro ↔ divisa con el cambio del día que ya trae la app (EUR/USD de macro-mercado.json,
       EUR/BRL de macro.json); el resto, a mano.
     · Rentabilidad de una inversión: precio + dividendos, total y anualizada; se puede rellenar con
       una posición de la cartera.
     · Simulador de hipoteca: precio, ahorro, gastos de compra, fijo o variable (Euríbor de macro.json),
       cuota, intereses, esfuerzo sobre ingresos y qué pasa si el tipo sube.
     Cada casilla admite operaciones y memorias (1500*12, A, Ans). Pulsar un resultado lo guarda en Ans.
   Sin eval: un analizador propio que solo entiende números, memorias y estas operaciones.
   ===================================================================== */
(function(){
  var panel = document.getElementById('calcPanel'); if(!panel) return;
  var head = document.getElementById('calcHead');
  var LS = { hist:'kh_calc_hist_v1', mem:'kh_calc_mem_v1', ans:'kh_calc_ans_v1', ang:'kh_calc_ang_v1', modo:'kh_calc_modo_v1', fin:'kh_calc_fin_v1', finId:'kh_calc_finid_v1' };
  function lee(k, d){ try{ var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } }
  function guarda(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- estilos ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '#calcPanel.kc{width:344px;max-width:calc(100vw - 16px);max-height:calc(100vh - 80px);display:flex;flex-direction:column}',
    '#calcPanel.kc.fin{width:500px}',
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
    '@media (max-width:520px){#calcPanel.kc .kc-campos{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- montaje ---------- */
  [].slice.call(panel.children).forEach(function(n){ if(n !== head) n.remove(); });
  panel.classList.add('kc');
  var tabs = document.createElement('div'); tabs.className = 'kc-tabs';
  tabs.innerHTML = '<button type="button" data-m="sci">Científica</button><button type="button" data-m="fin">Financiera</button>';
  var body = document.createElement('div'); body.className = 'kc-body';
  var sci = document.createElement('div');
  sci.innerHTML = '<div class="kc-lcd"><div class="kc-st"><span class="s">S</span><span class="a">A</span><span class="ang" title="Cambiar grados / radianes (también SHIFT Ans)"></span><span class="sp"></span><span class="ansv"></span></div><div class="kc-roll"></div></div><div class="kc-mem"></div><div class="kc-keys"></div>' +
    '<div class="kc-nota">Escribe la operación entera y pulsa EXE. <b>→</b> guarda en una memoria (25→A); <b>ALPHA</b> + tecla escribe la letra roja. <b>SHIFT</b> da la función naranja. Pulsa una línea de arriba para reutilizarla; ↑ recupera la anterior.</div>';
  var fin = document.createElement('div'); fin.className = 'kc-fin';
  fin.innerHTML = '<select class="kc-sel" aria-label="Cálculo"></select><div class="kc-ayuda"></div><div class="kc-campos"></div><div class="kc-sal"></div><div class="kc-ansmsg"></div>' +
    '<div class="kc-ayuda" style="font-size:11px;color:#64748b">Cada casilla admite operaciones (1500*12), las memorias (A…Z) y Ans. Pulsa un resultado para guardarlo en Ans. Los impuestos vienen con los porcentajes habituales: compruébalos con tu bróker o tu declaración.</div>';
  body.appendChild(sci); body.appendChild(fin);
  panel.appendChild(tabs); panel.appendChild(body);
  function q(el, s){ return el.querySelector(s); }
  var roll = q(sci, '.kc-roll'), memBox = q(sci, '.kc-mem'), keysBox = q(sci, '.kc-keys');

  /* ---------- estado ---------- */
  var H = lee(LS.hist, []); if(!Array.isArray(H)) H = [];
  H = H.filter(function(h){ return h && typeof h.e === 'string' && typeof h.r === 'number'; });
  var MEM = lee(LS.mem, {}) || {};
  var ans = +lee(LS.ans, 0) || 0;
  var ang = lee(LS.ang, 'deg') === 'rad' ? 'rad' : 'deg';
  var modo = lee(LS.modo, 'sci') === 'fin' ? 'fin' : 'sci';
  var P = [], cur = 0;              /* la operación en curso: trozos (una tecla = un trozo) y posición del cursor */
  var hecho = false, errMsg = '', shift = false, alpha = false, alphaLock = false, replay = -1;

  /* ---------- formato es-ES ---------- */
  function miles(ent){ return ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmt(x){                                   /* resultado en pantalla: 10 cifras, como la Casio */
    if(typeof x !== 'number' || !isFinite(x)) return 'Error';
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

  /* ---------- analizador (sin eval) ---------- */
  var FUN = ['asin','acos','atan','sin','cos','tan','sqrt','abs','log','ln'];
  function tokens(t){
    var out = [], i = 0;
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
      if(c === '𝑒' || t.codePointAt(i) === 0x1D452){ out.push({t:'n', v:Math.E}); i += (t.codePointAt(i) > 0xffff ? 2 : 1); continue; }
      var MAP = {'-':'−', '*':'×', '/':'÷', '·':'×'};
      if(MAP[c]){ out.push({t:MAP[c]}); i++; continue; }
      if('+−×÷^()√∛%²!→'.indexOf(c) >= 0){ out.push({t:c}); i++; continue; }
      throw 'sin';
    }
    return out;
  }
  function trig(f, x){
    var r; var g = ang === 'deg' ? Math.PI / 180 : 1;
    if(f === 'sin') r = Math.sin(x * g); else if(f === 'cos') r = Math.cos(x * g); else if(f === 'tan'){ if(ang === 'deg' && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) return NaN; r = Math.tan(x * g); }
    else if(f === 'asin') r = Math.asin(x) / g; else if(f === 'acos') r = Math.acos(x) / g; else r = Math.atan(x) / g;
    return Math.abs(r) < 1e-13 ? 0 : r;
  }
  function fact(n){ if(n < 0 || n % 1 || n > 170) return NaN; var r = 1; for(var k = 2; k <= n; k++) r *= k; return r; }
  /* Devuelve {v, sto}. Lanza 'sin' (sintaxis) o 'mat' (matemático). */
  function analiza(t){
    var T = tokens(t), p = 0;
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
    function imp(){                                 /* multiplicación sin signo: va antes que × y ÷ */
      var a = una();
      while(empieza(mira())){ var b = una(); a = {v: a.v * b.v}; }
      return a;
    }
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
      while(mira() && /^(%|²|⁻¹|!)$/.test(mira().t)){
        var o = T[p++].t;
        if(o === '%') a = {v: a.v / 100, pct: true};
        else if(o === '²') a = {v: a.v * a.v};
        else if(o === '⁻¹') a = {v: a.v === 0 ? NaN : 1 / a.v};
        else a = {v: fact(a.v)};
      }
      return a;
    }
    function arg(){                                 /* argumento de una función: (…) o lo que sigue (sin 30) */
      if(mira() && mira().t === '('){ p++; var a = expr(); if(mira() && mira().t === ')') p++; return a.v; }
      return pot().v;
    }
    function prim(){
      var tk = mira(); if(!tk) throw 'sin';
      if(tk.t === 'n'){ p++; return {v: tk.v}; }
      if(tk.t === '('){ p++; var a = expr(); if(mira() && mira().t === ')') p++; return {v: a.v}; }   /* paréntesis sin cerrar: se cierran solos */
      if(tk.t === '√'){ p++; return {v: Math.sqrt(arg())}; }
      if(tk.t === '∛'){ p++; return {v: Math.cbrt(arg())}; }
      if(tk.t === 'f'){ p++; var x = arg(), f = tk.f;
        if(f === 'sqrt') return {v: Math.sqrt(x)};
        if(f === 'abs') return {v: Math.abs(x)};
        if(f === 'log') return {v: Math.log10(x)};
        if(f === 'ln') return {v: Math.log(x)};
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
  function raizN(n, y){ if(n === 0) return NaN; if(y < 0 && Math.abs(n % 2) === 1) return -Math.pow(-y, 1 / n); return Math.pow(y, 1 / n); }
  /* número de una casilla (modo financiero): null si está vacía; NaN si no se entiende */
  function evalNum(s){ try{ var r = analiza(s); if(r.sto) return NaN; return r.v; }catch(e){ return NaN; } }

  /* ---------- teclado de la calculadora ----------
     [etiqueta, acción, etiqueta SHIFT, acción SHIFT, letra ALPHA, clase] */
  var K = [
    ['SHIFT','shift','','','','sh'], ['ALPHA','alpha','A-LOCK','alock','','alp'], ['↑','up','↓','down','','ar'], ['◀','left','|◀','home','','ar'], ['▶','right','▶|','end','','ar'],
    ['x²','²','√','√(','A',''], ['^','^','ˣ√','ˣ√','B',''], ['log','log(','10ˣ','10^(','C',''], ['ln','ln(','eˣ','𝑒^(','D',''], ['sin','sin(','sin⁻¹','sin⁻¹(','E',''],
    ['cos','cos(','cos⁻¹','cos⁻¹(','F',''], ['tan','tan(','tan⁻¹','tan⁻¹(','G',''], ['x⁻¹','⁻¹','x!','!','H',''], ['(','(','','','I',''], [')',')','','','J',''],
    ['(−)','neg','∛','∛(','K',''], ['%','%','Abs','abs(','L',''], ['π','π','𝑒','𝑒','M',''], ['→','→','','','N',''], ['Ans','Ans','DRG','ang','O',''],
    ['7','7','','','P','num'], ['8','8','','','Q','num'], ['9','9','','','R','num'], ['DEL','del','INS','del','S','del'], ['AC','ac','','','','del'],
    ['4','4','','','T','num'], ['5','5','','','U','num'], ['6','6','','','V','num'], ['×','×','','','W','op'], ['÷','÷','','','X','op'],
    ['1','1','','','Y','num'], ['2','2','','','Z','num'], ['3','3','','','','num'], ['+','+','','','','op'], ['−','−','','','','op'],
    ['0','0','','','','num'], [',',',','','','','num'], ['EXP','ᴇ','','','','num'], ['⧉','copy','','','','ar'], ['EXE','exe','','','','exe']
  ];
  var TIT = {copy:'Copiar el último resultado', '→':'Guardar en una memoria: 25→A (luego ALPHA + tecla de la letra)', '%':'200+10% = 220 · 200×10% = 20', 'ᴇ':'×10 elevado a: 1,5ᴇ3 = 1500', 'del':'Borrar a la izquierda del cursor (Retroceso)', ac:'Borrar la línea (Esc)', up:'Recuperar operaciones anteriores', exe:'Calcular (Intro)'};
  keysBox.innerHTML = K.map(function(k, i){
    return '<button type="button" data-i="' + i + '" class="' + k[5] + '"' + (TIT[k[1]] ? ' title="' + esc(TIT[k[1]]) + '"' : '') + '>' +
      (k[2] ? '<span class="s2">' + esc(k[2]) + '</span>' : '') + (k[4] ? '<span class="al">' + k[4] + '</span>' : '') + esc(k[0]) + '</button>';
  }).join('');

  var OPS_TRAS = /^(\+|−|×|÷|\^|²|⁻¹|!|%|ˣ√|→)$/;
  function ins(txt){
    errMsg = ''; replay = -1;
    if(hecho){ hecho = false; P = []; cur = 0; if(OPS_TRAS.test(txt)){ P = ['Ans']; cur = 1; } }
    P.splice(cur, 0, txt); cur++;
  }
  function accion(a){
    if(a === 'shift'){ shift = !shift; return; }
    if(a === 'alpha'){ alpha = !alpha; if(!alpha) alphaLock = false; return; }
    if(a === 'alock'){ alphaLock = !alphaLock; alpha = alphaLock; return; }
    if(a === 'ang'){ ang = ang === 'deg' ? 'rad' : 'deg'; guarda(LS.ang, ang); return; }
    if(a === 'ac'){ P = []; cur = 0; hecho = false; errMsg = ''; replay = -1; return; }
    if(a === 'del'){ if(hecho){ hecho = false; } errMsg = ''; if(cur > 0){ P.splice(cur - 1, 1); cur--; } return; }
    if(a === 'left'){ if(hecho){ hecho = false; } cur = Math.max(0, cur - 1); return; }
    if(a === 'right'){ if(hecho){ hecho = false; } cur = Math.min(P.length, cur + 1); return; }
    if(a === 'home'){ hecho = false; cur = 0; return; }
    if(a === 'end'){ hecho = false; cur = P.length; return; }
    if(a === 'up' || a === 'down'){
      if(!H.length) return;
      replay = a === 'up' ? Math.min(H.length - 1, replay + 1) : Math.max(-1, replay - 1);
      if(replay < 0){ P = []; cur = 0; } else { P = trozos(H[replay].e + (H[replay].s ? '→' + H[replay].s : '')); cur = P.length; }
      hecho = false; errMsg = ''; return;
    }
    if(a === 'copy'){ var t = fmt(ans).replace(/\./g, '').replace('−', '-'); try{ navigator.clipboard.writeText(t); }catch(e){} errMsg = ''; flash = 'copiado: ' + t; return; }
    if(a === 'exe'){ exe(); return; }
    if(a === 'neg'){ if(hecho){ hecho = false; P = []; cur = 0; } ins('−'); return; }
    ins(a);
  }
  var flash = '';
  function trozos(s){                                /* texto → trozos, respetando nombres de función y Ans */
    var out = [], i = 0;
    while(i < s.length){
      var m = s.slice(i).match(/^(sin⁻¹\(|cos⁻¹\(|tan⁻¹\(|sin\(|cos\(|tan\(|log\(|ln\(|abs\(|10\^\(|Ans|ˣ√|⁻¹|𝑒\^\(|𝑒)/);
      if(m){ out.push(m[1]); i += m[1].length; continue; }
      out.push(s[i]); i++;
    }
    return out;
  }
  function exe(){
    var s = P.join(''); if(!s){ return; }
    try{
      var r = analiza(s);
      var eTxt = s, sto = r.sto;
      if(sto) eTxt = s.replace(/→\s*[A-Za-z]\s*$/, '');
      H.unshift({e: eTxt, r: r.v, s: sto || undefined}); H = H.slice(0, 40); guarda(LS.hist, H);
      ans = r.v; guarda(LS.ans, ans);
      if(sto){ MEM[sto] = r.v; guarda(LS.mem, MEM); }
      hecho = true; errMsg = ''; replay = -1; P = []; cur = 0;
    }catch(e){
      errMsg = e === 'mat' ? 'Error matemático: no se puede calcular (división por 0, raíz de negativo…)' : 'Error de sintaxis: revisa la operación';
    }
  }

  /* ---------- pintar la pantalla ---------- */
  function pinta(){
    panel.classList.toggle('s', shift); panel.classList.toggle('a', alpha);
    q(sci, '.kc-st .s').classList.toggle('on', shift);
    var aEl = q(sci, '.kc-st .a'); aEl.classList.toggle('on', alpha); aEl.textContent = alphaLock ? 'A-LOCK' : 'A';
    q(sci, '.kc-st .ang').textContent = ang === 'deg' ? 'DEG' : 'RAD';
    q(sci, '.kc-st .ansv').textContent = 'Ans = ' + fmt(ans);
    var h = '';
    H.slice(0, 30).reverse().forEach(function(x, i, arr){
      var idx = arr.length - 1 - i;
      h += '<div class="e" data-h="' + idx + '" title="Volver a cargar esta operación">' + esc(x.e) + (x.s ? '<span class="sto">→' + x.s + '</span>' : '') + '</div>' +
           '<div class="r" data-r="' + idx + '" title="Meter este resultado en la operación">' + fmt(x.r) + '</div>';
    });
    var a1 = esc(P.slice(0, cur).join('')), a2 = esc(P.slice(cur).join(''));
    h += '<div class="in">' + a1 + '<span class="kc-cur"></span>' + a2 + '</div>';
    if(errMsg) h += '<div class="err">' + esc(errMsg) + '</div>';
    else if(flash){ h += '<div class="pv">' + esc(flash) + '</div>'; flash = ''; }
    else {
      var pv = '';
      if(P.length){ try{ var r = analiza(P.join('')); pv = (r.sto ? '→' + r.sto + ' = ' : '= ') + fmt(r.v); }catch(e){ pv = ''; } }
      h += '<div class="pv">' + esc(pv) + '</div>';
    }
    roll.innerHTML = h; roll.scrollTop = roll.scrollHeight;
    var ks = Object.keys(MEM).filter(function(k){ return /^[A-Z]$/.test(k) && typeof MEM[k] === 'number'; }).sort();
    memBox.innerHTML = ks.length ? ks.map(function(k){ return '<span data-m="' + k + '" title="Meter ' + k + ' en la operación"><b>' + k + '</b> = ' + fmt(MEM[k]) + '</span>'; }).join('') + '<span class="borra" data-borra="1" title="Borrar todas las memorias">borrar</span>' : '';
  }
  keysBox.addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    var k = K[+b.getAttribute('data-i')];
    if(alpha && k[4]){ ins(k[4]); if(!alphaLock) alpha = false; shift = false; pinta(); return; }
    var a = (shift && k[3]) ? k[3] : k[1];
    if(k[1] !== 'shift' && !(k[1] === 'alpha' && shift)) shift = false;
    if(k[1] === 'alpha' && shift){ shift = false; a = 'alock'; }
    accion(a); pinta();
  });
  roll.addEventListener('click', function(e){
    var d = e.target.closest('[data-h],[data-r]'); if(!d) return;
    if(d.hasAttribute('data-h')){ var x = H[+d.getAttribute('data-h')]; if(!x) return; P = trozos(x.e + (x.s ? '→' + x.s : '')); cur = P.length; hecho = false; errMsg = ''; }
    else { var y = H[+d.getAttribute('data-r')]; if(!y) return; if(hecho){ hecho = false; P = []; cur = 0; } P.splice(cur, 0, num(y.r)); cur++; errMsg = ''; }
    pinta();
  });
  var borraT = null;
  memBox.addEventListener('click', function(e){
    var d = e.target.closest('span'); if(!d) return;
    if(d.hasAttribute('data-borra')){
      if(d.classList.contains('seguro')){ MEM = {}; guarda(LS.mem, MEM); pinta(); return; }
      d.classList.add('seguro'); d.textContent = '¿borrar todas? pulsa otra vez';
      clearTimeout(borraT); borraT = setTimeout(pinta, 2500); return;
    }
    ins(d.getAttribute('data-m')); pinta();
  });
  q(sci, '.kc-st .ang').addEventListener('click', function(){ accion('ang'); pinta(); });

  /* teclado físico: va antes que el de la calculadora vieja (que sigue cargada pero ya no pinta nada) */
  var VIEJAS = /^([0-9.+\-*/=%]|Enter|Backspace|Escape)$/;
  document.addEventListener('keydown', function(e){
    if(panel.classList.contains('hidden')) return;
    var ae = document.activeElement; if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if(modo !== 'sci'){ if(VIEJAS.test(k)) e.stopImmediatePropagation(); return; }
    var m = {'*':'×', '/':'÷', '-':'−', '.':',', 'Enter':'exe', '=':'exe', 'Backspace':'del', 'Escape':'ac', 'Delete':'ac', 'ArrowLeft':'left', 'ArrowRight':'right', 'ArrowUp':'up', 'ArrowDown':'down', 'Home':'home', 'End':'end', '>':'→'};
    var t = m[k] || (/^[0-9+()^%,!]$/.test(k) ? k : (/^[A-Za-z]$/.test(k) ? k : null));
    if(!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    shift = false; if(!alphaLock) alpha = false;
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
  window.khCalc = {analiza:analiza, fmt:fmt, mem:function(){ return MEM; }, calcs:CALCS, leeNum:leeNum};   /* para las pruebas */
})();
