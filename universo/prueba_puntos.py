#!/usr/bin/env python3
"""Prueba histórica de los puntos del informe preliminar — Método KH v3, 20-oct-2026.

Cada 15 de mayo de 2017 a 2025 calcula los puntos de cada empresa del universo con lo que se sabía ese día
(cuentas publicadas, cotización y dividendos hasta esa fecha) y mide la rentabilidad total de los 12 meses
siguientes (cotización + dividendos cobrados). Compara por quintiles de puntos y por cada componente.

Sesgo conocido: el universo es el de hoy (empresas que siguen cotizando), así que la media sale optimista;
la comparación ENTRE quintiles no tiene ese problema en la misma medida.

Uso: prueba_puntos.py <mismos argumentos que informe_preliminar.py> salida_prueba.json
"""
import json, sys, statistics, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import informe_preliminar as IP

def rangos(x):
    o = sorted(range(len(x)), key=lambda i: x[i]); r = [0] * len(x); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and x[o[j + 1]] == x[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2
        i = j + 1
    return r

def spearman(a, b):
    if len(a) < 5: return None
    return statistics.correlation(rangos(a), rangos(b))

EXCLUIDAS = []
def rent_total(tk, f0, f1):
    p0 = IP.precio_en(tk, f0); p1 = IP.precio_en(tk, f1)
    if not p0 or not p1 or p0[0] < IP.mas_dias(f0, -10) or p1[0] < IP.mas_dias(f1, -10): return None
    tramo = [x[1] for x in IP.serie_precios(tk) if p0[0] <= x[0] <= p1[0] and x[1]]
    if any(b / a > 1.6 or b / a < .6 for a, b in zip(tramo, tramo[1:])):
        EXCLUIDAS.append((f0, tk)); return None      # salto de un día sin ajustar (contrasplit, dato roto)
    dv = 0.0; e = IP.DIVS.get(tk)
    if e:
        for y, a in (e.get('anios') or {}).items():
            for p in (a or {}).get('pagos') or []:
                fx = p.get('exDiv') or p.get('pago') or ''
                if f0 < fx <= f1 and p.get('tipo') not in ('previsto', 'anómalo') and isinstance(p.get('bruto'), (int, float)):
                    dv += p['bruto'] / (IP.EURUSD if e.get('moneda') == 'USD' else 1)
    return (p1[1] + dv) / p0[1] - 1

def main(argv):
    *args, salida = argv
    cons, univ, matriz, pdir_, extra, _, fund = args[1:8]
    IP.cargar(cons, univ, matriz, pdir_, extra, fund, None, args[9] if len(args) > 9 else None, args[10] if len(args) > 10 else None)
    cohortes = []; todas = []
    for anio in range(2017, 2026):
        f0 = f'{anio}-05-15'; f1 = f'{anio + 1}-05-15'
        IP.CORTE = f0
        filas = []
        for tk in IP.U['en_universo']:
            try: r = IP.fila(tk)
            except Exception as ex: continue
            if not r.get('puntos') or r.get('base_dudosa') or r.get('cap') is None: continue
            rt = rent_total(tk, f0, f1)
            if rt is None: continue
            p = r['puntos']; cl = IP.cl; b = r.get('beneficio')
            sper = cl(100 - max(0, r['per'] - 8) * 5) if r.get('per') else (0.0 if b is not None and b <= 0 else 50.0)
            spbv = cl(100 - max(0, r['pvc'] - 1) * 35) if r.get('pvc') else 50.0
            spos = cl(100 - r['pos52'] * 100) if r.get('pos52') is not None else 50.0
            filas.append({'tk': tk, 'pts': p['total'], 'div': p['dividendo'], 'cal': p['calidad'], 'val': p['valoracion'],
                          'per': sper, 'pbv': spbv, 'pos': spos,
                          'rt': rt, 'modelo': r['modelo'], 'etq': r['etiquetas']})
        IP.CORTE = None
        if len(filas) < 20: continue
        filas.sort(key=lambda x: -x['pts']); n = len(filas)
        q = [filas[i * n // 5:(i + 1) * n // 5] for i in range(5)]
        media = statistics.mean(x['rt'] for x in filas)
        top10 = statistics.mean(x['rt'] for x in filas[:10])
        c = {'formacion': f0, 'n': n, 'media': media, 'top10': top10,
             'quintiles': [statistics.mean(x['rt'] for x in g) for g in q],
             'quintiles_mediana': [statistics.median(x['rt'] for x in g) for g in q],
             'spearman': {k: spearman([x[k] for x in filas], [x['rt'] for x in filas]) for k in ('pts', 'div', 'cal', 'val')},
             'top10_empresas': [x['tk'] for x in filas[:10]]}
        cohortes.append(c); todas += [dict(x, cohorte=f0) for x in filas]
        print(f0, n, 'media', round(media * 100, 1), 'top10', round(top10 * 100, 1), 'Q', [round(v * 100, 1) for v in c['quintiles']],
              'rho', {k: (round(v, 2) if v is not None else None) for k, v in c['spearman'].items()}, flush=True)
    res = {'cohortes': cohortes,
           'resumen': {
               'quintiles_media': [statistics.mean(c['quintiles'][i] for c in cohortes) for i in range(5)],
               'media_universo': statistics.mean(c['media'] for c in cohortes),
               'top10_media': statistics.mean(c['top10'] for c in cohortes),
               'q1_gana_q5': sum(1 for c in cohortes if c['quintiles'][0] > c['quintiles'][4]),
               'top10_gana_media': sum(1 for c in cohortes if c['top10'] > c['media']),
               'spearman_medio': {k: statistics.mean(c['spearman'][k] for c in cohortes if c['spearman'][k] is not None) for k in ('pts', 'div', 'cal', 'val')},
               'mediana_quintiles': None, 'n_cohortes': len(cohortes), 'excluidas_por_salto': EXCLUIDAS}}
    res['resumen']['mediana_quintiles'] = [statistics.mean(c['quintiles_mediana'][i] for c in cohortes) for i in range(5)]
    # variantes de la fórmula (solo para informar; no se elige la mejor a posteriori sin decisión de Carlos)
    def evalua(nombre, f):
        qs = []; rh = []
        for c in sorted({x['cohorte'] for x in todas}):
            g = [x for x in todas if x['cohorte'] == c]; sc = [f(x) for x in g]
            o = sorted(range(len(g)), key=lambda i: -sc[i]); n = len(g)
            qs.append([statistics.mean(g[i]['rt'] for i in o[j * n // 5:(j + 1) * n // 5]) for j in range(5)])
            rh.append(spearman(sc, [x['rt'] for x in g]))
        return {'nombre': nombre, 'q1': statistics.mean(q[0] for q in qs), 'q5': statistics.mean(q[4] for q in qs),
                'rho': statistics.mean(rh), 'anios_bien': sum(1 for r_ in rh if r_ > 0)}
    res['resumen']['variantes'] = [
        evalua('Fórmula actual (sin rango de 52 semanas)', lambda x: .35 * x['div'] + .35 * x['cal'] + .3 * x['val']),
        evalua('Fórmula anterior (con «cerca del mínimo de 52 semanas»)', lambda x: .35 * x['div'] + .35 * x['cal'] + .3 * (x['per'] + x['pbv'] + x['pos']) / 3),
        evalua('Solo «cerca del mínimo de 52 semanas»', lambda x: x['pos']),
        evalua('Solo PER', lambda x: x['per']),
        evalua('Solo precio / valor contable', lambda x: x['pbv'])]
    # por etiquetas
    et = {}
    for k in ('Calidad', 'Barata', 'Crecimiento', 'Riesgo'):
        con = [x['rt'] for x in todas if k in x['etq']]; sin = [x['rt'] for x in todas if k not in x['etq']]
        et[k] = {'n': len(con), 'con': statistics.mean(con) if con else None, 'sin': statistics.mean(sin) if sin else None}
    res['resumen']['etiquetas'] = et
    json.dump(res, open(salida, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(res['resumen'], ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main(sys.argv)
