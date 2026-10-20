"""Datos reales para la pestaña «¿Invertir en euros?» de la app (20-oct-2026).
Lo ejecuta la Action divisa.yml (GitHub, que sí llega a Yahoo) y deja divisa/ejemplos.json:
  eurusd      -> [["AAAA-MM", cierre del mes]]  (dólares por 1 euro)
                 Banco Central Europeo (fin de mes, desde enero de 1999); Yahoo (EURUSD=X) solo para
                 los meses que el BCE aún no ha publicado (el mes en curso).
  empresas    -> {TICKER: {nombre, moneda, precios: [["AAAA-MM", cierre]], dividendos: [["AAAA-MM-DD", $]]}}
Precios SIN ajustar por dividendos (auto_adjust=False) pero sí por splits, igual que los dividendos:
así acciones x precio y acciones x dividendo cuadran a lo largo de los años (Coca-Cola dobló en 2012).
Para añadir otra empresa americana basta con meterla en EMPRESAS.
"""
import json, datetime, sys, csv, io, urllib.request
import yfinance as yf

DESDE = "1999-01-01"
BCE = ("https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.E"
       "?format=csvdata&startPeriod=1999-01")
EMPRESAS = {"KO": "Coca-Cola", "MCD": "McDonald's"}


def mensual(serie):
    out = {}
    for f, v in serie.dropna().items():
        out[f.strftime("%Y-%m")] = round(float(v), 4)     # el último del mes gana
    return [[k, out[k]] for k in sorted(out)]


def eurusd_bce():
    try:
        req = urllib.request.Request(BCE, headers={"User-Agent": "MetodoKHClaude/1.0"})
        txt = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")
        out = {}
        for r in csv.DictReader(io.StringIO(txt)):
            if r.get("TIME_PERIOD") and r.get("OBS_VALUE"):
                out[r["TIME_PERIOD"][:7]] = round(float(r["OBS_VALUE"]), 4)
        return out
    except Exception as e:
        print("AVISO: no pude leer el BCE (%s); uso solo Yahoo" % e)
        return {}


def main(salida):
    fx_y = dict(mensual(yf.Ticker("EURUSD=X").history(start="2003-12-01", interval="1d", auto_adjust=False)["Close"]))
    fx_b = eurusd_bce()
    fx = dict(fx_y); fx.update(fx_b)          # el BCE manda; Yahoo rellena lo que el BCE no tiene
    res = {"generado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
           "fuente": "Precios y dividendos: Yahoo Finance. EUR/USD: Banco Central Europeo (fin de mes)" + (" + Yahoo (mes en curso)" if fx_b else ""),
           "nota": "precios mensuales sin ajustar por dividendos y ajustados por splits; EUR/USD = dólares por 1 euro",
           "eurusd": [[k, fx[k]] for k in sorted(fx)], "empresas": {}}
    print("EURUSD: BCE %d meses, Yahoo %d meses" % (len(fx_b), len(fx_y)))
    for tk, nom in EMPRESAS.items():
        t = yf.Ticker(tk)
        h = t.history(start=DESDE, interval="1d", auto_adjust=False)
        d = t.dividends
        res["empresas"][tk] = {"nombre": nom, "moneda": "USD", "precios": mensual(h["Close"]),
                               "dividendos": [[f.strftime("%Y-%m-%d"), round(float(v), 4)] for f, v in d.items()
                                              if f.strftime("%Y-%m-%d") >= DESDE]}
        print(tk, len(res["empresas"][tk]["precios"]), "meses ·", len(res["empresas"][tk]["dividendos"]), "dividendos")
    print("EURUSD", len(res["eurusd"]), "meses")
    if len(res["eurusd"]) < 250 or any(len(e["precios"]) < 250 for e in res["empresas"].values()):
        sys.exit("Faltan datos: no escribo nada")
    json.dump(res, open(salida, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "divisa/ejemplos.json")
