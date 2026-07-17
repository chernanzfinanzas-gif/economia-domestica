#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Actualizador de cotizaciones diarias (Yahoo Finance) para el proyecto Economia Domestica.

- Lee la lista de empresas de  tickers.json  (TICKER -> simbolo Yahoo, p.ej. "IBE":"IBE.MC").
- Para cada empresa descarga el CIERRE DIARIO (sin ajustar) desde 2011-01-01.
- Guarda un JSON por empresa en  precios/<TICKER>.json
- En ejecuciones posteriores SOLO descarga los dias que falten (incremental).
- Escribe  precios/_index.json  con el resumen y los fallos.

Pensado para ejecutarse en un GitHub Action, pero tambien funciona en local:
    pip install yfinance
    python actualizar_cotizaciones.py
"""

import json, os, sys, time, datetime as dt

START = "2011-01-01"          # fecha de inicio del historico
OUTDIR = "precios"            # carpeta de salida (en la raiz del repo)
DECIMALS = 4                  # decimales del cierre
PAUSA = 1.0                   # segundos entre empresas (evita limites de Yahoo)

try:
    import yfinance as yf
except ImportError:
    print("Falta yfinance. Instala con:  pip install yfinance")
    sys.exit(1)


def cargar_existente(path):
    """Devuelve (lista_data, ultima_fecha) del JSON ya guardado, o ([], None)."""
    if not os.path.exists(path):
        return [], None
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        data = d.get("data", [])
        ult = data[-1][0] if data else None
        return data, ult
    except Exception:
        return [], None


def descargar(symbol, start):
    """Descarga cierres diarios sin ajustar desde 'start' hasta hoy. Devuelve lista [[fecha, cierre], ...]."""
    df = yf.download(symbol, start=start, interval="1d",
                     auto_adjust=False, progress=False, threads=False)
    if df is None or df.empty:
        return []
    # En versiones recientes las columnas pueden venir como MultiIndex
    col = "Close"
    serie = df[col]
    try:
        serie = serie.iloc[:, 0]  # por si es DataFrame de una columna
    except Exception:
        pass
    out = []
    for fecha, valor in serie.items():
        try:
            if valor is None or valor != valor:  # NaN
                continue
            out.append([fecha.strftime("%Y-%m-%d"), round(float(valor), DECIMALS)])
        except Exception:
            continue
    return out


IBEXTR_YIELD = 0.04   # yield bruto anual asumido SOLO para el tramo reciente que extiende el IBEXTR real

def _indj_ultimo(dias=15):
    # Yahoo no da historico de INDJ.MC (IBEX 35 con Dividendos) pero SI su valor del dia.
    # Devuelve [fecha, valor] mas reciente, o None.
    try:
        filas = descargar("INDJ.MC", (dt.date.today() - dt.timedelta(days=dias)).isoformat())
    except Exception as e:
        print(f"INDJ.MC no disponible ({str(e)[:50]})")
        return None
    return filas[-1] if filas else None


def extender_ibextr(outdir, indj_row=None, yield_anual=IBEXTR_YIELD):
    # Mantiene precios/IBEXTR.json al dia. El historico real (investing.com) se congela hasta
    # 'real_hasta'. A partir de ahi: cada dia se captura el valor REAL de INDJ.MC (escalado al
    # nivel de la serie real) y se guarda en 'indj_puntos'; los huecos que Yahoo no cubra se
    # rellenan con los retornos del ^IBEX + un pequeno devengo. Idempotente: reconstruye el
    # tramo posterior a 'real_hasta' en cada ejecucion.
    tr_path = os.path.join(outdir, "IBEXTR.json")
    ib_path = os.path.join(outdir, "IBEX.json")
    if not os.path.exists(tr_path):
        return
    try:
        tr = json.load(open(tr_path, encoding="utf-8"))
    except Exception:
        return
    data0 = tr.get("data", [])
    if not data0:
        return
    real_hasta = tr.get("real_hasta") or data0[-1][0]
    tr["real_hasta"] = real_hasta
    base = [d for d in data0 if d[0] <= real_hasta]
    if not base:
        return
    basemap = {d[0]: d[1] for d in base}
    factor = tr.get("indj_factor")
    puntos = dict(tr.get("indj_puntos", {}))
    if indj_row and indj_row[1] and float(indj_row[1]) > 0:
        dfecha = indj_row[0]; dval = float(indj_row[1])
        if factor is None and dfecha in basemap:
            f = basemap[dfecha] / dval
            if 0.3 <= f <= 3.0:
                factor = round(f, 6); tr["indj_factor"] = factor
                print(f"IBEXTR: factor de escala INDJ.MC = {factor} (anclado en {dfecha})")
            else:
                print(f"IBEXTR: factor INDJ.MC fuera de rango ({f:.3f}); se ignora INDJ, solo sintetico.")
        if factor and dfecha > real_hasta:
            puntos[dfecha] = round(dval * factor, DECIMALS)
    tr["indj_puntos"] = puntos
    data = list(base)
    lvl = base[-1][1]
    ib = None
    if os.path.exists(ib_path):
        try:
            ib = json.load(open(ib_path, encoding="utf-8"))
        except Exception:
            ib = None
    dia = (1.0 + yield_anual) ** (1.0/252) - 1.0
    nreal = 0; nsint = 0
    if ib and ib.get("data"):
        ibd = sorted(ib["data"], key=lambda x: x[0])
        ibmap = {d[0]: d[1] for d in ibd}
        prev_ib = ibmap.get(real_hasta)
        for fecha, close in ibd:
            if fecha <= real_hasta:
                if close and close > 0:
                    prev_ib = close
                continue
            if fecha in puntos:
                lvl = puntos[fecha]; data.append([fecha, lvl]); nreal += 1
            elif prev_ib and prev_ib > 0 and close and close > 0:
                lvl = lvl * (close / prev_ib) * (1.0 + dia)
                data.append([fecha, round(lvl, DECIMALS)]); nsint += 1
            if close and close > 0:
                prev_ib = close
    else:
        for fecha in sorted(puntos):
            if fecha > real_hasta:
                data.append([fecha, puntos[fecha]]); nreal += 1
    tr["data"] = data
    tr["actualizado"] = data[-1][0]
    with open(tr_path, "w", encoding="utf-8") as f:
        json.dump(tr, f, ensure_ascii=False)
    if nreal or nsint:
        print(f"IBEXTR: tramo tras {real_hasta} -> {nreal} reales (INDJ.MC) + {nsint} sinteticos; hasta {data[-1][0]}")
    else:
        print(f"IBEXTR: al dia ({real_hasta}); sin tramo posterior.")


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    tickers_path = os.path.join(base, "tickers.json")
    with open(tickers_path, encoding="utf-8") as f:
        tickers = json.load(f)

    outdir = os.path.join(base, OUTDIR)
    os.makedirs(outdir, exist_ok=True)

    hoy = dt.date.today().isoformat()
    indice = {"actualizado": hoy, "tickers": [], "fallos": []}

    for i, (ticker, symbol) in enumerate(sorted(tickers.items()), 1):
        path = os.path.join(outdir, ticker + ".json")
        data, ult = cargar_existente(path)

        if ult:
            # empezar el dia siguiente al ultimo guardado
            start = (dt.date.fromisoformat(ult) + dt.timedelta(days=1)).isoformat()
            if start > hoy:
                print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) ya al dia ({ult})")
                indice["tickers"].append({"ticker": ticker, "symbol": symbol,
                                          "desde": data[0][0], "hasta": ult, "n": len(data)})
                continue
        else:
            start = START

        try:
            nuevos = descargar(symbol, start)
        except Exception as e:
            print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) ERROR: {e}")
            indice["fallos"].append({"ticker": ticker, "symbol": symbol, "error": str(e)})
            time.sleep(PAUSA)
            continue

        if not nuevos:
            # si no habia nada previo y no descarga nada -> simbolo probablemente erroneo
            if not data:
                print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) SIN DATOS (revisa el simbolo en tickers.json)")
                indice["fallos"].append({"ticker": ticker, "symbol": symbol, "error": "sin datos"})
            else:
                print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) sin novedades")
                indice["tickers"].append({"ticker": ticker, "symbol": symbol,
                                          "desde": data[0][0], "hasta": data[-1][0], "n": len(data)})
            time.sleep(PAUSA)
            continue

        # fusionar evitando duplicados de fecha
        existentes = {d[0] for d in data}
        for fila in nuevos:
            if fila[0] not in existentes:
                data.append(fila)
        data.sort(key=lambda x: x[0])

        with open(path, "w", encoding="utf-8") as f:
            json.dump({"ticker": ticker, "symbol": symbol,
                       "actualizado": hoy, "data": data}, f, ensure_ascii=False)

        print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) +{len(nuevos)} -> {len(data)} ({data[0][0]} .. {data[-1][0]})")
        indice["tickers"].append({"ticker": ticker, "symbol": symbol,
                                  "desde": data[0][0], "hasta": data[-1][0], "n": len(data)})
        time.sleep(PAUSA)

    with open(os.path.join(outdir, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=0)

    # _ultimos.json: ultimo cierre de cada empresa (para que la app fije el "precio actual")
    ultimos = {}
    for ticker in tickers:
        pth = os.path.join(outdir, ticker + ".json")
        if os.path.exists(pth):
            try:
                dd = json.load(open(pth, encoding="utf-8"))
                if dd.get("data"):
                    ultimos[ticker] = dd["data"][-1]  # [fecha, cierre]
            except Exception:
                pass
    # Guarda: NO sobrescribir _ultimos.json con un diccionario vacio.
    # Si algo fallo al leer los precios/*.json, conservamos el ultimo bueno.
    ult_path = os.path.join(outdir, "_ultimos.json")
    if ultimos:
        with open(ult_path, "w", encoding="utf-8") as f:
            json.dump(ultimos, f, ensure_ascii=False)
        print(f"_ultimos.json escrito ({len(ultimos)} empresas).")
    else:
        print("AVISO: _ultimos.json NO se sobrescribe (0 empresas leidas); se conserva el anterior.")

    _indj = _indj_ultimo()
    if _indj:
        print(f"INDJ.MC valor real de hoy: {_indj}")
    extender_ibextr(outdir, indj_row=_indj)

    print(f"\nHecho. {len(indice['tickers'])} con datos, {len(indice['fallos'])} fallos.")
    if indice["fallos"]:
        print("Revisa estos simbolos en tickers.json:",
              ", ".join(x["ticker"] for x in indice["fallos"]))


if __name__ == "__main__":
    main()
