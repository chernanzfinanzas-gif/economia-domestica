#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""macro_mercado.py - El puente DIARIO de coyuntura del Metodo KH&Claude.

Por que existe
--------------
`macro.json` lo escribe el pase macro del informe semanal. Entre informe e informe pasan
dias, y hay datos que no aguantan una semana: el IBEX, el VIX, el oro y las divisas se
mueven todos los dias. Peor todavia, un dato viejo NO SE DISTINGUE DE UNO NUEVO al mirarlo
-- la misma averia que se descubrio en `betas.json` el 20-ago-2026, donde una beta calculada
sobre un espejo local congelado 33 dias seguia saliendo con tres decimales, plausible.

Este script escribe `macro-mercado.json`, con EXACTAMENTE la misma forma que `macro.json`.
La app funde los dos al leer y el de mercado pisa al del informe SOLO donde trae dato,
porque es mas fresco. Donde calla, manda el informe.

Que NO hace, y no es un olvido
------------------------------
* **Consumo discrecional y defensivo**: los quiere el INE (indice de comercio al por menor),
  no Yahoo. Se quedan pendientes hasta el pase macro. Un proxy bursatil se leeria como una
  medicion, y no lo es.
* **Gas TTF**: decision de Carlos el 26-ago-2026. El simbolo `TTF=F` de Yahoo falla a
  temporadas y el gas lo trae el pase semanal, que si tiene una fuente estable.
* **Prima de riesgo, BCE, WACC CNMC, IPC, PIB, afiliacion**: no son de mercado continuo.

Un indicador que falla NO se escribe
------------------------------------
Si un simbolo no responde, su clave sencillamente no entra en el fichero. Como la app funde
en dos pasos, lo que queda a la vista es el valor del informe con SU fecha, que es la verdad
de ese momento. Lo que nunca se escribe es un 0 ni un valor a medias.
Y si fallan mas de la mitad, el script sale en ROJO sin tocar el fichero: es preferible que
el workflow se vea fallar a publicar una foto parcial con fecha de hoy.

Uso
---
    python macro_mercado.py                       # escribe macro-mercado.json
    python macro_mercado.py --salida otro.json --precios precios
"""

import argparse, json, os, sys, time
import datetime as dt

SALIDA_POR_DEFECTO = "macro-mercado.json"
DIR_PRECIOS = "precios"
INTENTOS = 3
PAUSA = 0.8          # entre simbolos, para no tocar los limites de Yahoo
DIAS_HISTORICO = 430  # algo mas de un año: hace falta para la variacion anual

try:
    import yfinance as yf
except ImportError:
    print("Falta yfinance. Instala con:  pip install 'yfinance<2'")
    sys.exit(1)


# --------------------------------------------------------------------------- #
#  Descarga
# --------------------------------------------------------------------------- #
def serie(symbol, dias=DIAS_HISTORICO, intentos=INTENTOS):
    """Devuelve [(fecha 'YYYY-MM-DD', cierre float), ...] ordenada, o [] si no hay."""
    fin = dt.date.today() + dt.timedelta(days=1)      # 'end' de Yahoo es exclusivo
    ini = dt.date.today() - dt.timedelta(days=dias)
    df = None
    for n in range(intentos):
        try:
            df = yf.download(symbol, start=ini.isoformat(), end=fin.isoformat(),
                             interval="1d", auto_adjust=False, progress=False, threads=False)
            break
        except Exception as e:
            if n == intentos - 1:
                print("  ! %s: %s" % (symbol, e))
                return []
            time.sleep(2.0 * (n + 1))
    if df is None or len(df) == 0:
        return []
    s = df["Close"]
    try:
        s = s.iloc[:, 0]            # por si viene como DataFrame de una columna (MultiIndex)
    except Exception:
        pass
    out = []
    for fecha, valor in s.items():
        try:
            if valor is None or valor != valor:      # NaN
                continue
            out.append((fecha.strftime("%Y-%m-%d"), float(valor)))
        except Exception:
            continue
    return out


def desde_repo(ticker, dir_precios=DIR_PRECIOS):
    """Lee la serie que la app YA tiene en `precios/`.

    El IBEX sale de aqui y no de Yahoo a proposito: `actualizar_cotizaciones.py` lo refresca
    cuatro veces al dia y con pase de confirmacion T+1. Bajarlo otra vez seria crear un
    segundo espejo del mismo dato, que es justo lo que puede quedarse viejo sin avisar."""
    p = os.path.join(dir_precios, ticker + ".json")
    if not os.path.exists(p):
        return []
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        return [(x[0], float(x[1])) for x in d.get("data", []) if x and x[1] is not None]
    except Exception:
        return []


# --------------------------------------------------------------------------- #
#  Calculo
# --------------------------------------------------------------------------- #
def var_pct(s, dias):
    """Variacion % del ultimo cierre contra el cierre mas proximo a 'dias' naturales antes.

    Se busca por FECHA, no por numero de filas: los festivos y los simbolos que no cotizan
    todos los dias (divisas, futuros) tienen calendarios distintos, y contar filas mezclaria
    una semana de un mercado con nueve dias de otro."""
    if len(s) < 2:
        return None
    f_ult = dt.date.fromisoformat(s[-1][0])
    objetivo = f_ult - dt.timedelta(days=dias)
    cand = [x for x in s[:-1] if dt.date.fromisoformat(x[0]) <= objetivo]
    if not cand:
        return None
    base = cand[-1][1]
    if not base:
        return None
    return (s[-1][1] / base - 1.0) * 100.0


def var_ytd(s):
    """Variacion % en lo que va de año: ultimo cierre contra el ultimo cierre del año anterior."""
    if len(s) < 2:
        return None
    anio = dt.date.fromisoformat(s[-1][0]).year
    previos = [x for x in s if dt.date.fromisoformat(x[0]).year < anio]
    if not previos or not previos[-1][1]:
        return None
    return (s[-1][1] / previos[-1][1] - 1.0) * 100.0


def red(x, n=2):
    return None if x is None else round(x, n)


# --------------------------------------------------------------------------- #
#  Los indicadores
# --------------------------------------------------------------------------- #
def ind_simple(clave, nombre, grupo, symbol, unidad, slider=None, nota=None,
               url=None, dec=2, sliderAnual=False):
    s = serie(symbol)
    time.sleep(PAUSA)
    if not s:
        return None, "%s (%s): sin serie" % (clave, symbol)
    v = s[-1][1]
    o = {"n": nombre, "grupo": grupo, "v": red(v, dec), "f": s[-1][0],
         "d": red(var_pct(s, 1)), "dU": "%", "dPer": "sesión",
         "src": "yahoo · " + symbol}
    if unidad:
        o["u"] = unidad
    if nota:
        o["nota"] = nota
    if url:
        o["url"] = url
    if slider:
        o["slider"] = slider
        if sliderAnual:
            a = var_pct(s, 365)
            if a is None:
                # Sin un año de historico no se inventa la variacion anual: el slider se
                # queda sin valor y el informe semanal sigue mandando en ese factor.
                del o["slider"]
            else:
                o["sliderV"] = red(a, 1)
                o["nota"] = ((o.get("nota", "") + " · ") if o.get("nota") else "") + \
                            ("%+.1f %% en 12 meses" % a).replace(".", ",")
    return o, None


def ind_ibex(dir_precios):
    s = desde_repo("IBEX", dir_precios)
    if len(s) < 2:
        return None, "ibex: falta precios/IBEX.json o esta vacio"
    a = var_pct(s, 365)          # 12 meses moviles
    y = var_ytd(s)               # lo que va de año natural
    o = {"n": "IBEX 35", "grupo": "bolsa", "v": red(s[-1][1], 1), "u": "puntos",
         "f": s[-1][0], "d": red(var_pct(s, 1)), "dU": "%", "dPer": "sesión",
         "src": "precios/IBEX.json (serie propia)"}
    # [26-ago-2026] LOS DOS «ANUALES» NO SON EL MISMO NUMERO, y por eso van los dos escritos.
    # El informe semanal daba «+16,5 % en el año» (acumulado desde el 1-ene). La serie propia,
    # a 12 meses moviles, daba +31,4 % el mismo dia. Ambos correctos, distinta pregunta. El
    # slider BOLSA modela un shock de un año, asi que se alimenta del movil; si el fichero
    # diario hubiera pisado el del informe sin decirlo, la definicion habria cambiado a
    # escondidas y el escenario habria dado el doble de recorrido sin que nadie lo notara.
    notas = []
    if a is not None:
        o["slider"] = "BOLSA"
        o["sliderV"] = red(a, 1)
        notas.append(("%+.1f %% en 12 meses (alimenta el escenario)" % a).replace(".", ","))
    if y is not None:
        notas.append(("%+.1f %% en lo que va de año" % y).replace(".", ","))
    if notas:
        o["nota"] = " · ".join(notas)
    return o, None


PARES_LATAM = [("EURBRL=X", "BRL"), ("EURMXN=X", "MXN"),
               ("EURCLP=X", "CLP"), ("EURCOP=X", "COP")]


def ind_latam():
    """Fuerza de las divisas LatAm a 12 meses, a partes iguales y CON EL SIGNO INVERTIDO.

    Ojo con el signo, que es la trampa de este indicador: los pares se cotizan EUR/XXX, asi
    que `EUR/BRL` SUBIENDO significa real DEBIL. El slider LATAM mide FUERZA. Copiar la
    variacion tal cual pondria el escenario exactamente del reves, y saldria un numero
    plausible que nadie miraria dos veces.

    ARS queda fuera: con control de cambios y varios tipos oficiales, su variacion no mide
    mercado, mide politica cambiaria, y arrastraria la cesta ella sola."""
    partes, detalle = [], []
    for sym, nom in PARES_LATAM:
        s = serie(sym)
        time.sleep(PAUSA)
        if not s:
            print("  ! latam: sin serie de %s" % sym)
            continue
        a = var_pct(s, 365)
        if a is None:
            continue
        partes.append(-a)                       # <-- la inversion del signo
        detalle.append(("%s %+.1f %%" % (nom, -a)).replace(".", ","))
    if len(partes) < 3:
        return None, "latam: solo %d de 4 pares con dato anual" % len(partes)
    fuerza = sum(partes) / len(partes)
    return {"n": "Cesta LatAm (fuerza)", "grupo": "divisas", "v": red(fuerza, 1), "u": "%",
            "f": dt.date.today().isoformat(), "slider": "LATAM", "sliderV": red(fuerza, 1),
            "nota": "12 meses móviles, a partes iguales, signo invertido (par EUR/XXX al alza = divisa débil). "
                    + " · ".join(detalle) + ". ARS excluido: su tipo mide política cambiaria, no mercado",
            "src": "yahoo · " + ", ".join(p[0] for p in PARES_LATAM)}, None


def ind_treasury():
    """^TNX es el rendimiento del bono a 10 años de EE.UU.

    Yahoo lo ha publicado historicamente multiplicado por 10 (46,8 = 4,68 %) y hoy lo da ya
    en porcentaje. Como puede cambiar bajo los pies sin avisar, se normaliza y se comprueba
    que cae en un rango posible; si no, no se escribe. Un tipo del 46 % pasaria por dato."""
    s = serie("^TNX")
    time.sleep(PAUSA)
    if not s:
        return None, "treasury_10a: sin serie"
    v = s[-1][1]
    if v > 20:
        v = v / 10.0
    if not (0 < v < 20):
        return None, "treasury_10a: %.3f fuera de rango razonable, no se escribe" % s[-1][1]
    return {"n": "Treasury 10A EE.UU.", "grupo": "otros", "v": round(v, 2), "u": "%",
            "f": s[-1][0], "src": "yahoo · ^TNX"}, None


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Puente diario de coyuntura -> macro-mercado.json")
    ap.add_argument("--salida", default=SALIDA_POR_DEFECTO)
    ap.add_argument("--precios", default=DIR_PRECIOS)
    args = ap.parse_args()

    ind, fallos = {}, []

    def poner(clave, par):
        o, err = par
        if err:
            fallos.append(err)
            print("  ! " + err)
        else:
            ind[clave] = o
            print("  · %-14s %s" % (clave, o.get("v")))

    print("Descargando coyuntura de mercado...")
    poner("ibex", ind_ibex(args.precios))
    poner("vix", ind_simple("vix", "VIX · volatilidad implícita", "otros", "^VIX", "puntos",
                            nota="Por debajo de 20 el mercado está tranquilo; por encima de 30, hay pánico",
                            url="https://www.cboe.com/tradable_products/vix/", dec=2))
    poner("oro", ind_simple("oro", "Oro", "otros", "GC=F", "$/oz",
                            nota="Refugio: sube cuando el mercado desconfía de los tipos reales o de la moneda",
                            dec=1))
    poner("brent", ind_simple("brent", "Brent", "energia", "BZ=F", "$/bbl", slider="BRENT", dec=2))
    poner("eur_usd", ind_simple("eur_usd", "EUR/USD", "divisas", "EURUSD=X", None,
                                slider="EUR", dec=4))
    poner("latam_cesta", ind_latam())
    poner("treasury_10a", ind_treasury())

    # Guarda: mas de la mitad caidos = algo esta roto de verdad. Fallar en rojo es mejor que
    # publicar media foto con fecha de hoy encima de una entera de ayer.
    esperados = 7
    if len(ind) < esperados / 2.0:
        print("\nSolo %d de %d indicadores. NO se escribe %s." % (len(ind), esperados, args.salida))
        sys.exit(1)

    doc = {
        "schemaVersion": 1,
        "generadoEl": dt.date.today().isoformat(),
        "fuente": "mercado-diario",
        "nota": ("Escrito por macro_mercado.py (GitHub Actions, un pase diario). Misma forma que "
                 "macro.json: la app funde los dos y este pisa al del informe solo donde trae dato. "
                 "Un indicador que falla no aparece; nunca se escribe 0 ni un valor a medias."),
        "ind": ind,
    }
    with open(args.salida, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("\n%s escrito con %d indicadores%s." %
          (args.salida, len(ind), (" (%d fallo(s))" % len(fallos)) if fallos else ""))


if __name__ == "__main__":
    main()
