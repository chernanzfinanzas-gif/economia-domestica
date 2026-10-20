"""Datos reales para la pestaña «¿Invertir en euros?» de la app (20-oct-2026).
Lo ejecuta la Action divisa.yml (GitHub, que sí llega a Yahoo) y deja divisa/ejemplos.json:
  eurusd      -> [["AAAA-MM", cierre del mes]]  (dólares por 1 euro, EURUSD=X)
  empresas    -> {TICKER: {nombre, moneda, precios: [["AAAA-MM", cierre]], dividendos: [["AAAA-MM-DD", $]]}}
Precios SIN ajustar por dividendos (auto_adjust=False) pero sí por splits, igual que los dividendos:
así acciones x precio y acciones x dividendo cuadran a lo largo de los años (Coca-Cola dobló en 2012).
Para añadir otra empresa americana basta con meterla en EMPRESAS.
"""
import json, datetime, sys
import yfinance as yf

DESDE = "2006-01-01"
EMPRESAS = {"KO": "Coca-Cola", "MCD": "McDonald's"}


def mensual(serie):
    out = {}
    for f, v in serie.dropna().items():
        out[f.strftime("%Y-%m")] = round(float(v), 4)     # el último del mes gana
    return [[k, out[k]] for k in sorted(out)]


def main(salida):
    fx = yf.Ticker("EURUSD=X").history(start=DESDE, interval="1d", auto_adjust=False)
    res = {"generado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "fuente": "Yahoo Finance (yfinance)",
           "nota": "precios mensuales sin ajustar por dividendos y ajustados por splits; EUR/USD = dólares por 1 euro",
           "eurusd": mensual(fx["Close"]), "empresas": {}}
    for tk, nom in EMPRESAS.items():
        t = yf.Ticker(tk)
        h = t.history(start=DESDE, interval="1d", auto_adjust=False)
        d = t.dividends
        res["empresas"][tk] = {"nombre": nom, "moneda": "USD", "precios": mensual(h["Close"]),
                               "dividendos": [[f.strftime("%Y-%m-%d"), round(float(v), 4)] for f, v in d.items()
                                              if f.strftime("%Y-%m-%d") >= DESDE]}
        print(tk, len(res["empresas"][tk]["precios"]), "meses ·", len(res["empresas"][tk]["dividendos"]), "dividendos")
    print("EURUSD", len(res["eurusd"]), "meses")
    if len(res["eurusd"]) < 200 or any(len(e["precios"]) < 200 for e in res["empresas"].values()):
        sys.exit("Faltan datos: no escribo nada")
    json.dump(res, open(salida, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "divisa/ejemplos.json")
