#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
actualizar_fundamentales.py — Puller de fundamentales (Yahoo Finance) para el RADAR.
====================================================================================
Corre en el mismo GitHub Action que las cotizaciones. Lee tickers.json y, por empresa,
escribe en  fundamentales.json  un set de métricas para el cribado de oportunidades.

CLAVE (evita el payout falso de los campos-resumen de Yahoo): las métricas derivadas
se CALCULAN del dato primario —
  · RPD    = dividendos REALES pagados en los últimos 12 meses (tk.dividends) / precio
  · payout = div 12m / BPA (trailingEps), no el 'payoutRatio' de Yahoo
Se guardan también los datos crudos (div12m, BPA, valor contable) para que la app o el
cribador RECALCULEN RPD/PER con el precio vivo de precios/_ultimos.json.

Ninguna cifra se inventa: lo que Yahoo no da queda 'null' y se avisa con 'flags'.
El radar es un FILTRO GRUESO; la cifra definitiva sale del análisis (dpaPrevisto).

Uso (local o en Action):  pip install yfinance ; python actualizar_fundamentales.py
"""
import json, os, sys, time, datetime as dt

SCHEMA   = 1
OUT      = "fundamentales.json"
PAUSA    = 1.5                     # s entre empresas (límites de Yahoo)

try:
    import yfinance as yf
except ImportError:
    print("Falta yfinance. pip install yfinance"); sys.exit(1)


def _n(v, nd=None):
    """A float seguro; None si no es número o es NaN."""
    try:
        if v is None: return None
        f = float(v)
        if f != f: return None            # NaN
        return round(f, nd) if nd is not None else f
    except Exception:
        return None


def _pct(v, nd=1):
    f = _n(v)
    return round(f * 100, nd) if f is not None else None


def div_12m(tk):
    """(total, n_pagos, pago_max) de dividendos REALES pagados en los últimos 365 días."""
    try:
        s = tk.dividends
        if s is None or len(s) == 0:
            return 0.0, 0, None
        import pandas as pd
        c = pd.Timestamp(dt.datetime.now())
        if getattr(s.index, "tz", None) is not None:
            c = c.tz_localize(s.index.tz) if c.tzinfo is None else c.tz_convert(s.index.tz)
        c = c - pd.Timedelta(days=365)
        s12 = s[s.index >= c]
        if len(s12) == 0:
            return 0.0, 0, None
        return round(float(s12.sum()), 4), int(len(s12)), round(float(s12.max()), 4)
    except Exception:
        return None, 0, None


def pull(ticker, symbol):
    tk = yf.Ticker(symbol)
    try:
        info = tk.info or {}
    except Exception:
        info = {}
    # precio: fast_info primero, luego info
    precio = None
    try: precio = _n(tk.fast_info.last_price)
    except Exception: pass
    precio = precio or _n(info.get("currentPrice")) or _n(info.get("regularMarketPrice"))

    d12, ndiv, dmax = div_12m(tk)
    eps   = _n(info.get("trailingEps"))
    epsF  = _n(info.get("forwardEps"))
    book  = _n(info.get("bookValue"))              # valor contable por acción
    low   = _n(info.get("fiftyTwoWeekLow"))
    high  = _n(info.get("fiftyTwoWeekHigh"))
    debt  = _n(info.get("totalDebt"))
    cash  = _n(info.get("totalCash"))
    ebitda= _n(info.get("ebitda"))

    rpd    = round(d12 / precio * 100, 2) if (d12 and precio) else (0.0 if d12 == 0 else None)
    payout = round(d12 / eps * 100, 1)    if (d12 and eps and eps > 0) else None
    per    = round(precio / eps, 1)       if (precio and eps and eps > 0) else None
    perF   = round(precio / epsF, 1)      if (precio and epsF and epsF > 0) else None
    pbv    = _n(info.get("priceToBook"), 2) or (round(precio / book, 2) if (precio and book and book > 0) else None)
    pos52  = round((precio - low) / (high - low) * 100) if (precio and low and high and high > low) else None
    dnEbit = round((debt - cash) / ebitda, 2) if (debt is not None and cash is not None and ebitda and ebitda > 0) else None

    flags = []
    if d12 and dmax and ndiv <= 2 and dmax > 0.60 * d12:
        flags.append("dividendo irregular (posible extraordinario / pago único)")
    if eps is not None and eps <= 0:
        flags.append("BPA<=0 (payout/PER no fiables)")
    cur = info.get("currency")
    if cur and cur != "EUR":
        flags.append(f"cotiza en {cur}")
    if d12 is None:
        flags.append("sin histórico de dividendos")

    return {
        "ticker": ticker, "symbol": symbol,
        "nombre": info.get("shortName") or info.get("longName") or ticker,
        "moneda": cur,
        "precio": precio, "marketCap": _n(info.get("marketCap")),
        # dividendo (crudo + derivado)
        "div12m": d12, "nDiv12m": ndiv, "divMax12m": dmax,
        "rpd": rpd, "payout": payout,
        # beneficio / valoración
        "bpa": eps, "bpaFwd": epsF, "per": per, "perFwd": perF,
        "pbv": pbv, "evEbitda": _n(info.get("enterpriseToEbitda"), 1),
        "valorContable": book,
        # calidad
        "roe": _pct(info.get("returnOnEquity")),
        "margenNeto": _pct(info.get("profitMargins")),
        "dnEbitda": dnEbit,
        # crecimiento
        "crecIngresos": _pct(info.get("revenueGrowth")),
        "crecBpa": _pct(info.get("earningsGrowth")),
        # riesgo / posición
        "beta": _n(info.get("beta"), 2), "pos52sem": pos52,
        "flags": flags,
    }


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    tickers = json.load(open(os.path.join(base, "tickers.json"), encoding="utf-8"))
    hoy = dt.date.today().isoformat()
    out = {"schemaVersion": SCHEMA, "actualizado": hoy, "empresas": [], "fallos": []}
    items = [(t, s) for t, s in tickers.items() if not str(s).startswith("^")]  # saltar índices (^IBEX)
    for i, (t, s) in enumerate(sorted(items), 1):
        try:
            row = pull(t, s)
            out["empresas"].append(row)
            print(f"[{i}/{len(items)}] {t:6s} rpd={row['rpd']} payout={row['payout']} per={row['per']} roe={row['roe']}")
        except Exception as e:
            out["fallos"].append({"ticker": t, "symbol": s, "error": str(e)[:80]})
            print(f"[{i}/{len(items)}] {t:6s} ERROR {e}")
        time.sleep(PAUSA)
    # No sobrescribir con vacío si todo falló (conserva el bueno anterior)
    if out["empresas"]:
        with open(os.path.join(base, OUT), "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=0)
        print(f"\n{OUT} escrito: {len(out['empresas'])} empresas, {len(out['fallos'])} fallos.")
    else:
        print("AVISO: 0 empresas; NO se sobrescribe fundamentales.json.")


if __name__ == "__main__":
    main()
