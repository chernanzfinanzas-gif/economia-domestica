#!/usr/bin/env python3
"""Informe preliminar del universo — Método KH v3, parte 1, paso 1.

Foto de las empresas del universo con el nivel base de datos: tamaño, crecimiento,
rentabilidad, deuda, caja, valoración y calidad del dato, más etiquetas provisionales
para elegir cuáles analizar a fondo. BME Growth va aparte, con el termómetro del salto.

Uso: informe_preliminar.py consolidado.json universo.json matriz.json precios_dir acciones_extra.json salida.json fundamentales.json [cartera.json|-] [dividendos.json|-] [eventos.json]
Todo se calcula desde los datos base; nada se escribe en los ficheros de datos.
"""
import json, sys, os, statistics, datetime

ACC_FIJAS = {}  # para comparar con hace una semana con las mismas acciones de hoy
CORTE = None   # None = hoy. Con una fecha (AAAA-MM-DD) se calcula como si estuviéramos ese día: solo datos ya publicados.
EVENTOS = {}

def cargar(cons, univ, matriz, pdir_, extra, fund, cart=None, divf=None, eventos=None):
    global C, U, M, X, EURUSD, MAT, FUND, CART, DIVS, HOY, pdir, YH, EVENTOS, _PRECIOS
    pdir = pdir_; _PRECIOS = {}
    DIVS = {e['ticker']: e for e in json.load(open(divf))['empresas']} if divf else {}
    HOY = datetime.date.today().isoformat()
    C = json.load(open(cons)); U = json.load(open(univ)); M = json.load(open(matriz))
    X = json.load(open(extra))          # acciones (millones) y EUR/USD que no están en los datos base
    EURUSD = X['eur_usd']['v']
    MAT = {e['ticker']: e for e in M['empresas']}
    FUND = json.load(open(fund))
    YH = {e['ticker']: e for e in FUND['empresas']}
    CART = json.load(open(cart)) if cart else {'en_cartera': [], 'analizadas_app': [], 'fecha_copia': None}
    EVENTOS = json.load(open(eventos)).get('empresas', {}) if eventos else {}

def hoy(): return CORTE or HOY

def mas_dias(f, n): return (datetime.date.fromisoformat(f) + datetime.timedelta(days=n)).isoformat()

def publicado(c, k):
    """Fecha en que el dato de un periodo ya es público: ejercicio = cierre + 120 días (plazo del informe anual);
    semestre = 30-jun + 90 días."""
    if k.endswith('-S1'): return f'{k[:4]}-09-28'
    ci = (c['anios'].get(k, {}).get('m') or {}).get('cierre_periodo') or f'{k}-12-31'
    return mas_dias(ci, 120)

def visible(c, k): return CORTE is None or publicado(c, k) <= CORTE

def serie_precios(tk):
    if tk not in _PRECIOS:
        f = os.path.join(pdir, tk + '.json')
        _PRECIOS[tk] = json.load(open(f))['data'] if os.path.exists(f) else []
    return _PRECIOS[tk]

def precio_en(tk, f):
    """Último cierre en o antes de la fecha f (base de hoy: ajustada a desdoblamientos)."""
    s = serie_precios(tk); lo, hi = 0, len(s)
    while lo < hi:
        mid = (lo + hi) // 2
        if s[mid][0] <= f: lo = mid + 1
        else: hi = mid
    return s[lo - 1] if lo else None

def factor_base(tk, c, k):
    """Multiplica las acciones de la CNMV del periodo k para pasarlas a la base de hoy de las cotizaciones del repo.
    Usa eventos.json (factorCierre) si lo hay; si no, los desdoblamientos detectados en beneficio/BPA
    (saltos de un número entero: x2, x10, /100…). Devuelve (factor, dudoso): dudoso = hay un salto sin explicar después."""
    ev = EVENTOS.get(tk, {}).get('factorCierre')
    if ev: return ev.get(k[:4], 1.0), False
    P = c.get('capital', {}).get('periodos', {}) or {}
    orden = sorted(P, key=lambda x: publicado(c, x))
    vals = [(x, P[x].get('acciones_bpa')) for x in orden if P[x].get('acciones_bpa')]
    f = 1.0; dudoso = False
    for i in range(1, len(vals)):
        (k0, a0), (k1, a1) = vals[i - 1], vals[i]
        if publicado(c, k1) <= publicado(c, k): continue          # cambio anterior al periodo: ya está en sus acciones
        r = a1 / a0
        if .7 <= r <= 1.43: continue                               # recompras, ampliaciones normales
        n = round(r) if r > 1 else round(1 / r)
        if n >= 2 and abs((r if r > 1 else 1 / r) / n - 1) < .06:
            f *= n if r > 1 else 1 / n                             # desdoblamiento (x n) o contrasplit (/ n)
        else:
            sig = vals[i + 1][1] if i + 1 < len(vals) else None
            if sig and abs(sig / a0 - 1) < .1: continue           # dato raro aislado que vuelve a su nivel
            dudoso = True
    return f, dudoso

def v(d, k):
    x = d.get(k)
    return x if isinstance(x, (int, float)) else None

def div(a, b):
    return a / b if a is not None and b not in (None, 0) else None

def precio(tk):
    s = serie_precios(tk)
    if not s: return None
    if CORTE:
        u = precio_en(tk, CORTE)
        if not u or u[0] < mas_dias(CORTE, -10): return None
        s = [x for x in s if x[0] <= CORTE]
    f_ult, p_ult = s[-1]
    d_ult = datetime.date.fromisoformat(f_ult)
    hace1 = (d_ult - datetime.timedelta(days=365)).isoformat()
    p1 = next((p for f, p in reversed(s) if f <= hace1), None)
    max52 = max(p for f, p in s if f > hace1); min52 = min(p for f, p in s if f > hace1)
    return {'pos52': div(p_ult - min52, max52 - min52),'fecha': f_ult, 'precio': p_ult, 'var_1a': div(p_ult - p1, p1) if p1 else None,
            'vs_max52': div(p_ult - max52, max52), 'desde': s[0][0]}

def yahoo_acciones(tk):
    if CORTE: return None
    e = YH.get(tk)
    if e and e.get('marketCap') and e.get('precio'): return e['marketCap'] / e['precio'] / 1e6
    return None

def acciones(tk, c, ult):
    """Millones de acciones, cruzando tres medidas: capital/nominal (CNMV), beneficio/BPA (CNMV) y Yahoo.
    Vale la medida de la CNMV que coincide con otra (±15 %). Si ninguna coincide, se avisa."""
    if tk in ACC_FIJAS: return ACC_FIJAS[tk], 'fijas (las de hoy)', None
    if tk in X['acciones'] and not CORTE:
        a = X['acciones'][tk]; return a['millones'], a['fuente'], None
    if v(ult, 'acciones_circulacion_millones'): return v(ult, 'acciones_circulacion_millones'), 'informe anual', None
    cap = {k: x for k, x in (c.get('capital', {}).get('periodos', {}) or {}).items() if visible(c, k)}
    k = max(cap, key=lambda x: publicado(c, x)) if cap else None
    a = cap[k].get('acciones') if k else None
    ab = cap[k].get('acciones_bpa') if k else None
    yh = yahoo_acciones(tk)
    near = lambda x, y: x and y and abs(x / y - 1) <= .15
    if near(a, yh) or near(a, ab): return a, f'CNMV, capital / nominal ({k})', None
    if near(ab, yh): return ab, f'CNMV, beneficio / BPA ({k})', None
    if yh: return yh, 'Yahoo (capitalización / precio, 1-oct-2026)', ('acciones a revisar: la CNMV no casa con Yahoo' if (a or ab) else None)
    if a or ab:
        return (a or ab), f'CNMV ({k})', ('acciones a revisar: capital/nominal y BPA no casan' if a and ab else 'acciones sin contraste')

    b, bpa = v(ult, 'beneficio_neto_atribuible'), v(ult, 'bpa_basico')
    if b and bpa and abs(bpa) < 1000: return b / bpa, 'beneficio / BPA', 'acciones sin contraste'
    return None, None, None

def dividendo_12m(tk):
    """DPA bruto cobrado en los últimos 12 meses según dividendos.json de la app, se pague en dinero o en acciones (scrip),
    y si la empresa ha pagado en acciones en los últimos 3 años."""
    e = DIVS.get(tk)
    if not e: return None, False, None
    H = hoy(); desde = mas_dias(H, -365)
    dpa = 0.0; scrip = False; extra = 0.0
    for y, a in (e.get('anios') or {}).items():
        if not a: continue
        if int(H[:4]) - 3 <= int(y) <= int(H[:4]) and 'scrip' in str(a.get('naturaleza') or ''): scrip = True
        for p in a.get('pagos') or []:
            if int(H[:4]) - 3 <= int(y) <= int(H[:4]) and p.get('tipo') == 'scrip': scrip = True
            f = p.get('pago') or p.get('exDiv') or ''
            if desde < f <= H and p.get('tipo') not in ('previsto', 'anómalo') and isinstance(p.get('bruto'), (int, float)):
                if p.get('tipo') in ('extraordinario', 'especial'): extra += p['bruto']
                else: dpa += p['bruto']
    if e.get('moneda') == 'USD': dpa /= EURUSD; extra /= EURUSD
    return dpa, scrip, extra

def dilucion_3a(c):
    """Crecimiento anual del número de acciones en unos 3 años, con dos medidas de la CNMV que tienen que coincidir:
    el capital social (a nominal constante) y beneficio/BPA. Si no coinciden (devolución por reducción de nominal,
    nominal desconocido, BPA raro) o hay saltos de más del 30 %, devuelve None y no se usa."""
    P = c.get('capital', {}).get('periodos', {}) or {}
    ks = sorted(k for k in P if '-' not in k and P[k].get('capital') and visible(c, k))
    if len(ks) < 4 or not c.get('capital', {}).get('nominal_estimado'): return None
    k0, k1 = ks[-4], ks[-1]; n = int(k1) - int(k0)
    for i in range(len(ks) - 3, len(ks)):
        if abs(P[ks[i]]['capital'] / P[ks[i - 1]]['capital'] - 1) > .3: return None
    g_cap = (P[k1]['capital'] / P[k0]['capital']) ** (1 / n) - 1
    bp = [(k, P[k].get('acciones_bpa')) for k in ks[-4:] if P[k].get('acciones_bpa')]
    if len(bp) < 2: return None
    (b0k, b0), (b1k, b1) = bp[0], bp[-1]
    if int(b1k) == int(b0k): return None
    g_bpa = (b1 / b0) ** (1 / (int(b1k) - int(b0k))) - 1
    if abs(g_cap - g_bpa) > .025: return None
    return g_cap

def pn_de(d):
    """Patrimonio de la dominante. Si el dato atribuible no es creíble (fuera del 50-105 % del patrimonio total),
    se usa patrimonio total menos minoritarios."""
    tot = v(d, 'patrimonio_neto'); at = v(d, 'patrimonio_neto_atribuible')
    if at is not None and tot and tot > 0 and not (.5 * tot <= at <= 1.05 * tot):
        return tot - (v(d, 'minoritarios') or 0)
    return at if at is not None else (v(d, 'fondos_propios') or tot)

def cagr(serie, n=5):
    ys = sorted(y for y, x in serie.items() if x is not None and x > 0)
    if len(ys) < 4: return None, None
    fin = ys[-1]; ini = next((y for y in ys if int(y) >= int(fin) - n), ys[0])
    k = int(fin) - int(ini)
    if k < 3: return None, None
    return (serie[fin] / serie[ini]) ** (1 / k) - 1, f'{ini}-{fin}'

def fila(tk):
    c = C[tk]; m = MAT.get(tk, {})
    anios = {y: a['v'] for y, a in c['anios'].items() if visible(c, y)}
    r = {'ticker': tk, 'empresa': m.get('empresa', tk), 'modelo': m.get('modelo'),
         'modulos': m.get('modulos', []), 'grupo': m.get('grupo'), 'descripcion': m.get('descripcion'),
         'n_anios': len(anios), 'avisos': []}
    if not anios:
        r['avisos'].append('sin ejercicio completo todavía (solo semestres)')
        r['etiquetas'] = []; r['puntos'] = None; r['radar_app'] = radar_app(tk) if not CORTE else None
        r['estado'] = 'cartera' if tk in CART['en_cartera'] else ('analizada' if (tk in CART['analizadas_app'] or m.get('grupo') == 'analizada') else 'universo')
        return r
    L = sorted(anios)[-1]; d = anios[L]
    meta = c['anios'][L]['m']
    moneda = meta.get('moneda') or 'EUR'
    r.update({'ultimo': L, 'primero': sorted(anios)[0], 'moneda': moneda, 'normas': meta.get('normas')})
    mod = r['modelo']
    ing = v(d, 'ingresos'); ebit = v(d, 'beneficio_explotacion'); am = v(d, 'amortizaciones')
    ebitda = ebit - am if ebit is not None and am is not None else (v(d, 'ebitda_publicado'))
    if mod == 'BAN': ing = v(d, 'margen_intereses')
    b = v(d, 'beneficio_neto_atribuible'); b = b if b is not None else v(d, 'beneficio_neto_total')
    pn = pn_de(d)
    deuda = sum(x for x in (v(d, 'deuda_financiera_corriente'), v(d, 'deuda_financiera_no_corriente')) if x is not None) \
        if (v(d, 'deuda_financiera_corriente') is not None or v(d, 'deuda_financiera_no_corriente') is not None) else None
    caja = v(d, 'tesoreria')
    dn = deuda - (caja or 0) if deuda is not None else None
    fcf = v(d, 'flujo_explotacion') + v(d, 'capex_material_e_intangible') \
        if v(d, 'flujo_explotacion') is not None and v(d, 'capex_material_e_intangible') is not None else None
    divs = v(d, 'dividendos_totales_pagados')
    if divs is None and (v(d, 'dividendos_pagados') or 0) < 0: divs = v(d, 'dividendos_pagados')
    r.update({'ingresos': ing, 'ebitda': ebitda, 'mg_ebit': div(ebit, v(d, 'ingresos')) if mod == 'GEN' else None,
              'beneficio': b, 'patrimonio': pn, 'deuda_neta': dn if mod in ('GEN', 'INM') else None,
              'dn_ebitda': div(dn, ebitda) if mod == 'GEN' and ebitda and ebitda > 0 else None,
              'ltv': div(dn, v(d, 'activo_total')) if mod == 'INM' else None,
              'fcf': fcf if mod == 'GEN' else None, 'roe': div(b, pn) if pn and pn > 0 else None})
    if mod == 'GEN' and dn is not None and ebitda is not None and ebitda <= 0: r['avisos'].append('EBITDA negativo')
    # series
    s_ing = {y: (v(a, 'margen_intereses') if mod == 'BAN' else v(a, 'ingresos')) for y, a in anios.items()}
    r['cagr_ing'], r['cagr_tramo'] = cagr(s_ing)
    roes = []; perd = 0; ult5 = sorted(anios)[-5:]
    for y in ult5:
        a = anios[y]; bb = v(a, 'beneficio_neto_atribuible'); bb = bb if bb is not None else v(a, 'beneficio_neto_total')
        p = pn_de(a)
        if bb is not None and bb < 0: perd += 1
        if bb is not None and p and p > 0: roes.append(bb / p)
    r['roe_med5'] = statistics.median(roes) if len(roes) >= 3 else None
    r['perdidas5'] = perd; r['anios5'] = len(ult5)
    # semestre
    sem = {y: a['v'] for y, a in c['semestres'].items() if visible(c, y)}
    ks = sorted(sem)
    if len(ks) >= 2:
        s1, s0 = ks[-1], ks[-2]
        if int(s1[:4]) - int(s0[:4]) == 1:
            k = 'margen_intereses' if mod == 'BAN' else 'ingresos'
            bk = lambda a: v(a, 'beneficio_neto_atribuible') if v(a, 'beneficio_neto_atribuible') is not None else v(a, 'beneficio_neto_total')
            r['s1'] = s1
            r['s1_ing'] = div((v(sem[s1], k) or 0) - (v(sem[s0], k) or 0), v(sem[s0], k)) if v(sem[s1], k) is not None else None
            b1, b0 = bk(sem[s1]), bk(sem[s0])
            r['s1_ben'] = div(b1 - b0, abs(b0)) if b1 is not None and b0 not in (None, 0) else None
            r['s1_ben_signo'] = None if b1 is None else ('+' if b1 >= 0 else '-')
    # mercado
    pr = precio(tk)
    if pr:
        r.update({'precio': pr['precio'], 'fecha_precio': pr['fecha'], 'var_1a': pr['var_1a'], 'vs_max52': pr['vs_max52'], 'pos52': pr['pos52']})
        if not CORTE and pr['desde'] > '2025-01-01': r['avisos'].append(f'cotización solo desde {pr["desde"]}')
        acc, fuente, av = acciones(tk, c, d)
        if av: r['avisos'].append(av)
        if acc and CORTE and fuente and fuente.startswith('CNMV'):
            kk = fuente.split('(')[-1].rstrip(')')
            fb, dud = factor_base(tk, c, kk)
            acc *= fb
            if dud: r['base_dudosa'] = True
        if CORTE and av and 'no casan' in av: r['base_dudosa'] = True
        if acc:
            cap = pr['precio'] * acc
            if moneda == 'USD': cap *= EURUSD
            r['cap'] = cap if moneda == 'EUR' else cap / EURUSD   # en M EUR para comparar tamaños
            r['acciones_fuente'] = fuente; r['_acc'] = acc
            capm = cap  # en la moneda de las cuentas
            r['per'] = div(capm, b) if b and b > 0 else None
            r['pvc'] = div(capm, pn) if pn and pn > 0 else None
            dpa, scrip, extra = dividendo_12m(tk)
            if extra: r['avisos'].append(f'dividendo extraordinario de {extra:.2f} por acción en los últimos 12 meses: no se cuenta en los puntos')
            if dpa is not None:
                r['dpa_12m'] = dpa; r['rpd_fuente'] = 'calendario de dividendos de la app (12 meses)'
                r['rpd'] = dpa / pr['precio'] if pr['precio'] else None
                r['paga_scrip'] = scrip
                dil = dilucion_3a(c)
                r['dilucion'] = dil
                if scrip and dil is not None and dil > .005 and r['rpd'] is not None:
                    r['rpd_bruta'] = r['rpd']; r['rpd'] = max(0.0, r['rpd'] - dil)
                    r['avisos'].append(f'paga en acciones y no las amortiza: el número de acciones crece un {dil*100:.1f} % al año, que se resta del dividendo')
                divs_m = dpa * acc * (EURUSD if moneda == 'USD' else 1)
                r['payout'] = div(divs_m, b) if b and b > 0 else None
                r['paga_sin_beneficio'] = dpa > 0 and (b is None or b <= 0)
            else:
                r['rpd_fuente'] = 'flujo de caja (dividendos pagados) / capitalización'
                r['rpd'] = div(abs(divs), capm) if divs else (0.0 if divs == 0 else None)
                r['dilucion'] = dilucion_3a(c)
            # recompras: solo las que retiran acciones (el número de acciones de la CNMV baja en 3 años)
            dl = r.get('dilucion')
            r['recompra'] = max(0.0, -dl) if dl is not None else None
            if r.get('rpd') is not None:
                r['rent_accionista'] = r['rpd'] + PESO_RECOMPRA * (r['recompra'] or 0)
            if mod == 'GEN':
                mino = v(d, 'minoritarios') or 0
                ev = capm + (dn or 0) + mino
                r['ev_ebitda'] = div(ev, ebitda) if ebitda and ebitda > 0 else None
                r['fcf_yield'] = div(fcf, capm)
        else:
            r['avisos'].append('sin número de acciones: no hay capitalización ni ratios de precio')
    else:
        r['avisos'].append('sin cotización en el repositorio')
    for a in X.get('avisos', {}).get(tk, []): r['avisos'].append(a)
    if 'payout' not in r:
        r['payout'] = div(abs(divs), b) if divs and b and b > 0 else None
        r['paga_sin_beneficio'] = bool(divs) and (b is None or b <= 0)
    r['etiquetas'] = etiquetas(r)
    r['estado'] = 'cartera' if tk in CART['en_cartera'] else ('analizada' if (tk in CART['analizadas_app'] or m.get('grupo') == 'analizada') else 'universo')
    r['puntos'] = puntos(r)
    r['radar_app'] = radar_app(tk) if not CORTE else None
    return r

# ---- Puntos (misma estructura y pesos que el «Atractivo» del Radar de la app: 35 % dividendo, 35 % calidad, 30 % valoración)
#      pero con los datos base del v3 y tres cambios: ROE mediano de 5 años, deuda según módulo y constancia en vez de rating.
cl = lambda x: max(0.0, min(100.0, x))
PESO_RECOMPRA = 0.5   # un euro de recompra vale medio euro de dividendo: Carlos cobra el dividendo para reinvertir (decisión de Carlos, 20-oct 09:58)
def puntos(r):
    if r.get('ultimo') is None: return None
    # dividendo
    rpd = r.get('rent_accionista') if r.get('rent_accionista') is not None else r.get('rpd')
    if not rpd: sd = 0.0; nd = 'sin dividendo ni recompras'
    else:
        sd = cl(rpd / .06 * 100); nd = ''
        if r.get('payout') and r['payout'] > .85: sd *= .7; nd = 'reparte más del 85 % del beneficio'
        if r['paga_sin_beneficio']: sd *= .5; nd = 'paga dividendo sin beneficio'
    # calidad
    roe = r.get('roe_med5') if r.get('roe_med5') is not None else r.get('roe')
    sroe = cl(roe / .20 * 100) if roe is not None else 50.0
    if r['modelo'] == 'GEN':
        lim = 4 if set(r['modulos']) & DEUDA_ALTA else 2
        if r.get('deuda_neta') is not None and r['deuda_neta'] <= 0: sdn = 100.0
        elif r.get('dn_ebitda') is not None: sdn = cl(100 - max(0, r['dn_ebitda'] - lim) * 25)
        elif 'EBITDA negativo' in r['avisos']: sdn = 0.0
        else: sdn = 50.0
    elif r['modelo'] == 'INM':
        sdn = cl(100 - max(0, (r.get('ltv') or 0) - .30) * 250)
    else: sdn = 100.0   # banca y seguros: la deuda es su negocio; como en el Radar
    scons = cl(100 - 25 * (r.get('perdidas5') or 0)) if r.get('anios5') else 50.0
    sc = .5 * sroe + .3 * sdn + .2 * scons
    # valoración
    b = r.get('beneficio')
    sper = cl(100 - max(0, r['per'] - 8) * 5) if r.get('per') else (0.0 if b is not None and b <= 0 else 50.0)
    spbv = cl(100 - max(0, r['pvc'] - 1) * 35) if r.get('pvc') else 50.0
    # La posición en el rango de 52 semanas se quitó el 20-oct-2026 (decisión de Carlos): en la prueba 2017-2025
    # predecía al revés (cerca del mínimo 0,6 % al año frente a 15,2 % cerca del máximo; acertó 1 de 9 años).
    sv = (sper + spbv) / 2
    tot = round(.35 * sd + .35 * sc + .30 * sv, 1)
    return {'total': tot, 'dividendo': round(sd), 'calidad': round(sc), 'valoracion': round(sv), 'nota': nd}

def radar_app(tk):
    """El Atractivo del Radar de la app con sus datos (Yahoo, fundamentales.json) y rating neutro 60, para comparar."""
    f = YH.get(tk)
    if not f: return None
    rpd, payout, flags = f.get('rpd'), f.get('payout'), f.get('flags') or []
    if not rpd: sd = 0
    else:
        sd = cl(rpd / 6 * 100)
        if payout and payout > 85: sd *= .7
        if any('irregular' in x.lower() for x in flags): sd *= .6
    sroe = cl(f['roe'] / 20 * 100) if f.get('roe') is not None else 50
    sdn = 100 if f.get('dnEbitda') is None else cl(100 - max(0, f['dnEbitda'] - 2) * 25)
    sc = .5 * sroe + .3 * sdn + .2 * 60
    sper = cl(100 - max(0, f['per'] - 8) * 5) if f.get('per') and f['per'] > 0 else 50
    spbv = cl(100 - max(0, f['pbv'] - 1) * 35) if f.get('pbv') else 50
    spos = cl(100 - f['pos52sem']) if f.get('pos52sem') is not None else 50
    return round(.35 * sd + .35 * sc + .30 * (sper + spbv + spos) / 3, 1)

# Etiquetas provisionales (criterio de cribado, lo decide Carlos)
CRIT = {
    'Calidad': 'ROE mediano de 5 años ≥ 12 %, ningún año con pérdidas en 5 años y, si es GEN, deuda neta/EBITDA ≤ 2,5 (≤ 5 en los módulos Regulada y Concesional) o caja neta',
    'Barata': 'PER ≤ 12 y precio/valor contable ≤ 1,5, con beneficio positivo',
    'Crecimiento': 'ingresos (margen de intereses en banca) crecen ≥ 10 % al año en el tramo de 5 años',
    'Riesgo': 'pérdidas en el último año, EBITDA negativo, deuda neta/EBITDA > 4 (GEN; > 6 en Regulada y Concesional) o deuda neta/activo > 50 % (INM)',
}
DEUDA_ALTA = {'REGULADA', 'CONCESIONAL'}   # módulos con deuda estructuralmente alta y flujos previsibles
def etiquetas(r):
    e = []
    lim_ok, lim_mal = (5, 6) if set(r['modulos']) & DEUDA_ALTA else (2.5, 4)
    gen_ok = r['modelo'] != 'GEN' or (r.get('deuda_neta') is not None and (r['deuda_neta'] <= 0 or (r.get('dn_ebitda') is not None and r['dn_ebitda'] <= lim_ok)))
    if r.get('roe_med5') is not None and r['roe_med5'] >= .12 and r['perdidas5'] == 0 and r['anios5'] >= 4 and gen_ok: e.append('Calidad')
    if r.get('per') is not None and r['per'] <= 12 and r.get('pvc') is not None and r['pvc'] <= 1.5: e.append('Barata')
    if r.get('cagr_ing') is not None and r['cagr_ing'] >= .10 and r['ticker'] not in X.get('sin_crecimiento', []): e.append('Crecimiento')
    if (r.get('beneficio') is not None and r['beneficio'] < 0) or 'EBITDA negativo' in r['avisos'] \
       or (r.get('dn_ebitda') or 0) > lim_mal or (r.get('ltv') or 0) > .5: e.append('Riesgo')
    return e

# Termómetro del salto (BME Growth) — hipótesis, sin medir todavía con casos pasados
SALTO = [
    ('NIIF', 'ya presenta sus cuentas en NIIF (requisito del Mercado Continuo)'),
    ('Tamaño', 'capitalización ≥ 100 M€'),
    ('Crecimiento', 'ingresos crecen ≥ 15 % al año'),
    ('Beneficios', 'beneficio positivo los dos últimos años'),
    ('Deuda', 'deuda neta/EBITDA ≤ 3 o caja neta'),
]
def termometro(tk, r):
    c = C[tk]; a = c['anios']; ys = sorted(a)
    s = {}
    s['NIIF'] = any('NIIF' in str(a[y]['m'].get('normas') or '') for y in ys[-2:])
    s['Tamaño'] = r.get('cap') is not None and r['cap'] >= 100
    s['Crecimiento'] = r.get('cagr_ing') is not None and r['cagr_ing'] >= .15
    bs = [(a[y]['v'].get('beneficio_neto_atribuible') if a[y]['v'].get('beneficio_neto_atribuible') is not None else a[y]['v'].get('beneficio_neto_total')) for y in ys[-2:]]
    s['Beneficios'] = len(bs) == 2 and all(isinstance(b, (int, float)) and b > 0 for b in bs)
    s['Deuda'] = r.get('deuda_neta') is not None and (r['deuda_neta'] <= 0 or (r.get('dn_ebitda') is not None and r['dn_ebitda'] <= 3))
    return s

# ---- Grupo de comparación (Matriz v3): el módulo principal, juntando los que tienen pocas empresas
GRUPO_DE = {'BAN': 'Financieras', 'SEG': 'Financieras', 'INM': 'Inmobiliaria patrimonialista',
            'REGULADA': 'Regulada, concesional y redes', 'CONCESIONAL': 'Regulada, concesional y redes',
            'INFRAESTRUCTURA': 'Regulada, concesional y redes', 'RENOVABLES': 'Generación renovable',
            'CARTERA': 'Industrial con cartera de pedidos', 'CICLICA': 'Materias primas o cíclica',
            'MARCA': 'Consumo de marca', 'PROMOCION': 'Promoción inmobiliaria', 'FARMA': 'Farma'}
def grupo(r):
    if r['modelo'] in ('BAN', 'SEG', 'INM'): return GRUPO_DE[r['modelo']]
    for mo in r['modulos']:
        if mo in GRUPO_DE: return GRUPO_DE[mo]
    return 'Otras generales'

def comparar_grupos(filas):
    """Puesto de cada empresa dentro de su grupo y su PER frente a la mediana del grupo."""
    gs = {}
    for r in filas: r['grupo_comp'] = grupo(r); gs.setdefault(r['grupo_comp'], []).append(r)
    for g, rs in gs.items():
        con = sorted([r for r in rs if r.get('puntos')], key=lambda r: -r['puntos']['total'])
        pers = [r['per'] for r in rs if r.get('per')]
        med = statistics.median(pers) if len(pers) >= 3 else None
        for i, r in enumerate(con): r['puesto_grupo'] = i + 1; r['n_grupo'] = len(con)
        for r in rs:
            r['per_grupo'] = med
            r['per_vs_grupo'] = div(r.get('per'), med) if med else None
    return {g: {'n': len(rs), 'per_mediana': (statistics.median([r['per'] for r in rs if r.get('per')]) if len([r for r in rs if r.get('per')]) >= 3 else None),
                'puntos_media': statistics.mean([r['puntos']['total'] for r in rs if r.get('puntos')]) if any(r.get('puntos') for r in rs) else None}
            for g, rs in gs.items()}

def puestos(filas):
    con = sorted([r for r in filas if r.get('puntos')], key=lambda r: -r['puntos']['total'])
    return {r['ticker']: (i + 1, r['puntos']['total']) for i, r in enumerate(con)}

def main(argv):
    cons, univ, matriz, pdir_, extra, salida, fund = argv[1:8]
    cart = argv[8] if len(argv) > 8 and argv[8] != '-' else None
    divf = argv[9] if len(argv) > 9 and argv[9] != '-' else None
    evf = argv[10] if len(argv) > 10 else None
    cargar(cons, univ, matriz, pdir_, extra, fund, cart, divf, evf)
    global CORTE
    filas = [fila(t) for t in U['en_universo']]
    grupos = comparar_grupos(filas)
    # movimientos de la semana: la misma cuenta como si fuera hace 7 días (cotizaciones y datos de entonces)
    ahora = puestos(filas)
    ref = mas_dias(HOY, -7); CORTE = ref
    ACC_FIJAS.update({r['ticker']: r['_acc'] for r in filas if r.get('_acc')})
    antes = puestos([fila(t) for t in U['en_universo']]); CORTE = None; ACC_FIJAS.clear()
    for r in filas:
        t = r['ticker']
        if t in ahora:
            r['puesto'], _ = ahora[t]
            if t in antes:
                r['puesto_ant'], r['puntos_ant'] = antes[t]
                r['cambio_puesto'] = r['puesto_ant'] - r['puesto']
                r['cambio_puntos'] = round(r['puntos']['total'] - r['puntos_ant'], 1)
    growth = []
    for t in U['bme_growth_sin_xbrl']:
        r = fila(t); r['salto'] = termometro(t, r); r['salto_n'] = sum(r['salto'].values()); growth.append(r)
    out = {'generado': datetime.datetime.now().isoformat(timespec='minutes'), 'eur_usd': X['eur_usd'],
           'criterios': CRIT, 'salto': SALTO, 'continuo': filas, 'growth': growth,
           'grupos': grupos, 'movimientos_desde': ref,
           'matriz': M.get('version'), 'cartera_fecha': CART.get('fecha_copia'), 'n': {'continuo': len(filas), 'growth': len(growth)}}
    json.dump(out, open(salida, 'w'), ensure_ascii=False, indent=1)
    print(len(filas), len(growth))

if __name__ == '__main__':
    main(sys.argv)
