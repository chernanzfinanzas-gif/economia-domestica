#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""calcular_betas.py - La beta del Metodo KH&Claude, calculada en casa.

Por que existe
--------------
Las fichas del parque traian la beta de la Matriz Bolsa Espanola, y el 29-jul-2026
se descubrio que la de Bankinter era **0,04**: imposible para un banco, y ademas
sin segunda referencia registrada. Al recalcularla desde las series de precios del
propio metodo salio **1,06**, estable en todas las ventanas. Una beta de terceros
no se puede auditar; esta si, porque el dato de entrada es el mismo fichero de
cotizaciones que ya usa la app.

Que calcula
-----------
Para cada ticker de `precios/*.json`, contra el indice de referencia:

  beta = Cov(r_accion, r_indice) / Var(r_indice)

con **retornos semanales** (un dato por semana ISO, el ultimo dia cotizado) y
**ventana movil de 5 anos** -> ~260 observaciones. Ademas 2 anos, para ver si la
beta se esta moviendo.

Por que semanal y no diario ni mensual
--------------------------------------
* Diario: mas datos, pero en valores poco liquidos la beta sale sesgada A LA BAJA
  porque muchos dias cierran planos (no negocian) y esos ceros no correlacionan
  con nada. Es el efecto Scholes-Williams, y es exactamente lo que hace que un
  chicharro parezca defensivo cuando solo es ilíquido.
* Mensual: inmune a eso, pero con 60 observaciones en 5 anos el error estandar es
  enorme -- en Bankinter, la ventana mensual daba 0,61 frente al 1,06 semanal,
  con un R2 de 0,14. Ese solo numero habria justificado cualquier cosa.
* Semanal es el punto medio y es lo que usan Damodaran y Bloomberg por defecto.

Lo que este script NO hace
--------------------------
No desapalanca ni reapalanca la beta (eso es decision del Bloque VI, no del dato),
no la ajusta a la Blume (2/3 beta + 1/3), y no inventa nada: si a un ticker no le
llegan observaciones suficientes, escribe null y dice por que.

Uso
---
    python calcular_betas.py                     # usa ./precios y escribe betas.json
    python calcular_betas.py --precios RUTA --salida betas.json --indice IBEX
    python calcular_betas.py --tabla             # ademas imprime la tabla ordenada
"""
import argparse
import datetime
import json
import os
import sys

VENTANAS = {"5a": 5, "2a": 2}

# [21-ago-2026] Umbral por debajo del cual la beta cruda NO se usa como coste de capital.
# 0,20 no es un numero sagrado: es donde el indice deja de explicar lo bastante como para
# que el punto estimado aguante una conclusion de creacion de valor. En el universo de la
# Matriz solo 3 de las 16 empresas de CONSUMO lo pasan.
R2_MINIMO = 0.20
BLUME_W = 0.67
MIN_OBS = 40                 # por debajo de esto no se publica beta
RANGO_PLAUSIBLE = (0.2, 2.5)  # fuera de aqui se marca para revision humana


# ---------------------------------------------------------------- utilidades
# ── LA GUARDA DE FRESCURA ────────────────────────────────────────────────────
# Este script NO baja precios: lee los que encuentre. Eso ya estaba escrito en el .bat
# desde el primer dia ("con la serie vieja da una beta vieja") y no sirvio de nada, que
# es el patron de todo lo demas: la regla estaba escrita y nada la comprobaba.
#
# Medido el 20-ago-2026: la carpeta local de precios llevaba CONGELADA desde el 17-jul
# -105 ficheros, ninguno posterior- porque los precios vivos pasaron a producirse en el
# GitHub Action y el espejo local dejo de refrescarse sin que nadie lo notara. Y
# `betas.json` decia `generadoEl: 2026-07-29` con `hasta: 2026-07-17`: doce dias de
# desfase que solo se ven abriendo el fichero y leyendo la clave correcta.
#
# El peligro no es la beta vieja. Es que **una beta vieja no se distingue de una nueva
# al mirarla**: sale un numero con tres decimales, plausible, y entra en el CAPM de los
# 25 libros sin que nada chirrie.
MAX_HABILES_DESFASE = 5        # una semana de mercado


def habiles_entre(d0, d1):
    """Dias habiles (lun-vie) entre dos fechas. Sin festivos: sobra para esto."""
    paso = datetime.timedelta(days=1)
    n, d = 0, d0
    while d < d1:
        d += paso
        if d.weekday() < 5:
            n += 1
    return n


def cargar(ruta):
    with open(ruta, encoding="utf-8") as fh:
        d = json.load(fh)
    return {f: p for f, p in d.get("data", []) if isinstance(p, (int, float)) and p > 0}, d.get("actualizado")


def semanal(fechas):
    """Un dia por semana ISO: el ULTIMO cotizado. Evita mezclar viernes con lunes
    cuando hay festivos, que es de donde salen retornos falsos de 3 dias."""
    wk = {}
    for f in fechas:
        y, w, _ = datetime.date.fromisoformat(f).isocalendar()
        wk[(y, w)] = f          # las fechas llegan ordenadas: se queda la ultima
    return [wk[k] for k in sorted(wk)]


def regresion(ra, rb):
    """(beta, r2). rb es el indice."""
    n = len(ra)
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((rb[i] - mb) * (ra[i] - ma) for i in range(n)) / (n - 1)
    var = sum((x - mb) ** 2 for x in rb) / (n - 1)
    if var == 0:
        return None, None
    b = cov / var
    va = sum((x - ma) ** 2 for x in ra) / (n - 1)
    r2 = (cov * cov) / (var * va) if va > 0 else None
    return b, r2


def splits(precios, desde=None, hasta=None):
    """Saltos de precio imposibles entre dos cierres seguidos = split/contrasplit
    SIN AJUSTAR en la serie.

    Esto no es una floritura: `precios/DIA.json` salta de 0,0167 a 17,20 el
    3-feb-2025 (un contrasplit 1:1000 sin ajustar) y con esa serie la beta de DIA
    salia **190,75**. Un numero asi se ve; uno de 1,4 en una serie con un split
    del 20% no se ve, y se cuela. Cualquier serie con un salto dentro de la
    ventana queda INUTILIZABLE para beta, y hay que decirlo en vez de publicar el
    disparate."""
    fechas = sorted(f for f in precios if (desde is None or f >= desde) and (hasta is None or f <= hasta))
    out, prev = [], None
    for f in fechas:
        p = precios[f]
        if prev and (p / prev > 3 or p / prev < 0.34):
            out.append((f, prev, p))
        prev = p
    return out


def beta(pa, pb, desde, hasta):
    rotos = splits(pa, desde, hasta)
    if rotos:
        f, p0, p1 = rotos[0]
        return {"beta": None, "n": None, "r2": None, "planos": None,
                "motivo": ("salto de %.4f a %.4f el %s: split o contrasplit sin ajustar en la serie. "
                           "La serie no sirve para calcular beta hasta que se reconstruya." % (p0, p1, f))}
    comun = sorted(f for f in (pa.keys() & pb.keys()) if desde <= f <= hasta)
    dias = semanal(comun)
    ra, rb, planos = [], [], 0
    for i in range(1, len(dias)):
        a0, a1 = pa[dias[i - 1]], pa[dias[i]]
        b0, b1 = pb[dias[i - 1]], pb[dias[i]]
        r = a1 / a0 - 1
        ra.append(r)
        rb.append(b1 / b0 - 1)
        if abs(r) < 1e-9:
            planos += 1
    n = len(ra)
    if n < MIN_OBS:
        return {"beta": None, "n": n, "r2": None, "planos": None,
                "motivo": "solo %d semanas con cotizacion en la ventana (minimo %d)" % (n, MIN_OBS)}
    b, r2 = regresion(ra, rb)
    # [21-ago-2026 · piloto Ebro] Junto a la beta CRUDA se publica la de Blume y un
    # veredicto `usable`. Motivo: Ebro mide 0,089 con R2 0,014, y no es un fallo de
    # medicion -mensual, 10a, 15a y la correccion de Dimson por contratacion delgada dan
    # entre 0,08 y 0,25 sobre 26 anos de precios-. El indice no explica a esa empresa. El
    # fichero traia el aviso desde el primer dia y NADIE DECIDIA QUE HACER CON EL: el
    # metodo acababa metiendo la mediana del arquetipo, que en CONSUMO es la mediana de 16
    # betas de las que 13 llevan ese mismo aviso. Un numero calculado sobre ruido.
    #
    # Blume: 0,67 x beta + 0,33. Encoge hacia 1 en proporcion al error de estimacion. Es
    # una CONVENCION, no una medicion, y por eso viaja etiquetada y aparte de la cruda.
    usable = r2 is not None and r2 >= R2_MINIMO
    return {"beta": round(b, 3) if b is not None else None,
            "n": n,
            "r2": round(r2, 3) if r2 is not None else None,
            "planos": round(100.0 * planos / n, 1),
            "blume": round(BLUME_W * b + (1 - BLUME_W), 3) if b is not None else None,
            "usable": bool(usable),
            "recomendada": (round(b, 3) if usable else
                            (round(BLUME_W * b + (1 - BLUME_W), 3) if b is not None else None)),
            "origen": ("cruda: R2 %.3f >= %.2f" % (r2, R2_MINIMO)) if usable else
                      ("Blume 0,67xB+0,33: R2 %s < %.2f, la cruda no es informativa"
                       % (("%.3f" % r2) if r2 is not None else "n/d", R2_MINIMO))}


def avisos(res5, res2):
    """Lo que un humano tiene que mirar antes de usar el numero."""
    out = []
    b = res5.get("beta")
    if b is None:
        out.append(res5.get("motivo", "sin beta"))
        return out
    if not (RANGO_PLAUSIBLE[0] <= b <= RANGO_PLAUSIBLE[1]):
        out.append("beta %.2f fuera del rango plausible %.1f-%.1f" % (b, *RANGO_PLAUSIBLE))
    if res5.get("r2") is not None and R2_MINIMO > res5["r2"] >= 0.10:
        out.append("R2 %.2f < %.2f: la beta cruda NO se usa como coste de capital; usa "
                   "`recomendada` (Blume) y DECLARA el origen en el libro"
                   % (res5["r2"], R2_MINIMO))
    if res5.get("r2") is not None and res5["r2"] < 0.10:
        out.append("R2 %.2f: el indice explica muy poco de su movimiento; la beta es poco informativa"
                   % res5["r2"])
    if res5.get("planos") is not None and res5["planos"] >= 20:
        out.append("%.0f%% de semanas sin movimiento: valor ilíquido, la beta sale sesgada A LA BAJA"
                   % res5["planos"])
    b2 = res2.get("beta")
    if b2 is not None and b is not None and abs(b2 - b) >= 0.35:
        out.append("la beta a 2 anos (%.2f) se aparta de la de 5 (%.2f): riesgo cambiando" % (b2, b))
    return out


# --------------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--precios", default="precios", help="carpeta con los [TICKER].json")
    ap.add_argument("--indice", default="IBEX", help="ticker del indice de referencia")
    ap.add_argument("--salida", default="betas.json")
    ap.add_argument("--tabla", action="store_true", help="imprime la tabla ordenada por beta")
    ap.add_argument("--hoy", default=None, metavar="AAAA-MM-DD",
                    help="fecha de referencia para la guarda de frescura (por defecto, hoy)")
    ap.add_argument("--aunque-este-vieja", action="store_true",
                    help="calcula aunque la serie tenga mas de %d dias habiles de desfase. "
                         "Deja constancia en el fichero: `desfaseHabiles` y `forzado`." % MAX_HABILES_DESFASE)
    a = ap.parse_args(argv)

    idx_path = os.path.join(a.precios, a.indice + ".json")
    if not os.path.exists(idx_path):
        print("no encuentro el indice %r" % idx_path)
        return 2
    pidx, act_idx = cargar(idx_path)
    hasta = max(pidx)
    hoy = datetime.date.fromisoformat(hasta)

    # ── GUARDA DE FRESCURA ──────────────────────────────────────────────────
    ref = datetime.date.fromisoformat(a.hoy) if a.hoy else datetime.date.today()
    desfase = habiles_entre(hoy, ref)
    if desfase > MAX_HABILES_DESFASE and not a.aunque_este_vieja:
        print("")
        print("  *** LA SERIE ESTA VIEJA. No escribo nada.")
        print("      ultimo cierre en %s : %s" % (a.precios, hasta))
        print("      hoy                 : %s" % ref.isoformat())
        print("      desfase             : %d dias habiles (el maximo son %d)"
              % (desfase, MAX_HABILES_DESFASE))
        print("")
        print("      Los precios vivos los produce el GitHub Action del repo, no esta")
        print("      carpeta. Refresca la fuente antes de calcular, o pasa")
        print("      --aunque-este-vieja si de verdad quieres una beta con esta serie")
        print("      (quedara marcada como forzada dentro del fichero).")
        print("")
        return 3
    if desfase > MAX_HABILES_DESFASE:
        print("  !!! FORZADO: serie con %d dias habiles de desfase (ultimo cierre %s)."
              % (desfase, hasta))

    ficheros = sorted(f for f in os.listdir(a.precios)
                      if f.endswith(".json") and not f.startswith("_"))
    res = {}
    for f in ficheros:
        t = f[:-5]
        if t in (a.indice, "IBEXTR"):
            continue
        pa, act = cargar(os.path.join(a.precios, f))
        if not pa:
            res[t] = {"beta": None, "avisos": ["fichero sin cotizaciones"]}
            continue
        r = {}
        for k, anios in VENTANAS.items():
            d0 = hoy.replace(year=hoy.year - anios).isoformat()
            r[k] = beta(pa, pidx, d0, hasta)
        r["avisos"] = avisos(r["5a"], r["2a"])
        r["ultimoCierre"] = max(pa)
        res[t] = r

    usables = [t for t, v in res.items() if v.get("5a", {}).get("beta") is not None and not v["avisos"]]
    doc = {
        "schemaVersion": 1,
        "generadoEl": datetime.date.today().isoformat(),
        "metodo": {
            "formula": "Cov(r_accion, r_indice) / Var(r_indice)",
            "frecuencia": "semanal (ultimo dia cotizado de cada semana ISO)",
            "ventanas": {"5a": "5 anos moviles", "2a": "2 anos moviles"},
            "indice": a.indice,
            "hasta": hasta,
            # `hasta` es el dato que importa y `generadoEl` el que enganya: el fichero del
            # 29-jul-2026 decia hasta=2026-07-17. Se explicita el desfase para que no haya
            # que restar dos fechas mentalmente para saber si esta beta sirve.
            "desfaseHabiles": desfase,
            "forzado": bool(desfase > MAX_HABILES_DESFASE),
            "minObservaciones": MIN_OBS,
            "rangoPlausible": list(RANGO_PLAUSIBLE),
            "nota": ("Sin ajuste de Blume y sin desapalancar: la beta cruda es el dato; "
                     "apalancarla o suavizarla es decision del Bloque VI, no de la fuente."),
        },
        "resumen": {"tickers": len(res),
                    "conBeta": sum(1 for v in res.values() if v.get("5a", {}).get("beta") is not None),
                    "sinAvisos": len(usables)},
        "betas": res,
    }
    with open(a.salida, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
    print("escrito %s  ·  %d tickers  ·  %d con beta  ·  %d sin avisos"
          % (a.salida, len(res), doc["resumen"]["conBeta"], len(usables)))

    if a.tabla:
        print()
        print("%-7s %7s %7s %6s %6s %7s  %s" % ("TICKER", "beta5a", "beta2a", "n", "R2", "planos", "avisos"))
        orden = sorted(res.items(), key=lambda kv: (kv[1].get("5a", {}).get("beta") is None,
                                                    kv[1].get("5a", {}).get("beta") or 0))
        for t, v in orden:
            c5, c2 = v.get("5a", {}), v.get("2a", {})
            print("%-7s %7s %7s %6s %6s %6s%%  %s" % (
                t,
                "%.2f" % c5["beta"] if c5.get("beta") is not None else "—",
                "%.2f" % c2["beta"] if c2.get("beta") is not None else "—",
                c5.get("n") or "—",
                "%.2f" % c5["r2"] if c5.get("r2") is not None else "—",
                c5.get("planos") if c5.get("planos") is not None else "—",
                " · ".join(v.get("avisos") or [])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
