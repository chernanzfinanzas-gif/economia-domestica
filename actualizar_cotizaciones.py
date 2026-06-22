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
    with open(os.path.join(outdir, "_ultimos.json"), "w", encoding="utf-8") as f:
        json.dump(ultimos, f, ensure_ascii=False)

    print(f"\nHecho. {len(indice['tickers'])} con datos, {len(indice['fallos'])} fallos.")
    if indice["fallos"]:
        print("Revisa estos simbolos en tickers.json:",
              ", ".join(x["ticker"] for x in indice["fallos"]))


if __name__ == "__main__":
    main()
