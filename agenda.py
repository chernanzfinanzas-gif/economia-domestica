#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
agenda.py — Fechas CONFIRMADAS de resultados y ex-dividend (Yahoo Finance)
==========================================================================
Compañero del Vigía en el "buzón del lunes". Mientras `vigia.py` ESTIMA de forma
determinista la fecha del próximo informe (réplica de `_cadenciaDe` de la app),
este script hace lo que el navegador NO puede: llama a Yahoo Finance y trae la
fecha **confirmada** de los próximos resultados y del próximo **ex-dividend** de
cada empresa analizada.

Reparto de papeles (por eso el buzón deja de "sobrar"):
  · agenda.json  → fecha CONFIRMADA (cuando Yahoo la publica). Es el dato bueno.
  · vigia.json   → fecha ESTIMADA por estacionalidad. Es el respaldo: cubre lo que
                   Yahoo no confirma todavía. La app enseña la confirmada y, si no
                   la hay, cae a la estimación del Vigía.

Ámbito = las MISMAS empresas que el Vigía: las que tienen
`dossiers/trimestral/[TICKER]-trim.json`. Así ambos remitentes hablan del mismo
universo y las llamadas a Yahoo son pocas.

NO inventa datos: lo que Yahoo no da queda en `sinConfirmar` (con su motivo) y el
Vigía sigue poniendo la estimación. Pensado para GitHub Actions
(.github/workflows/agenda.yml), igual que cotizaciones/fundamentales.

Uso:  pip install yfinance pandas ; python agenda.py
Test: AGENDA_HOY=2026-07-15 python agenda.py   (fija "hoy")
"""

import json, glob, os, re, sys, time, datetime
from zoneinfo import ZoneInfo

SCHEMA   = 1
TZ       = ZoneInfo("Europe/Madrid")
ROOT     = os.path.dirname(os.path.abspath(__file__))
TRIM_DIR = os.path.join(ROOT, "dossiers", "trimestral")
BUZON_DIR = os.path.join(ROOT, "buzon")
TICKERS_F = os.path.join(ROOT, "tickers.json")

CLAVE  = "agenda"
TITULO = "Agenda confirmada (resultados y ex-dividend)"

PAUSA          = 1.5   # s entre empresas (límites de Yahoo)
VENTANA_RES    = 75    # días hacia delante para listar resultados confirmados
VENTANA_DIV    = 95    # días hacia delante para listar ex-dividend
MARGEN_PASADO  = 3     # días hacia atrás (para no perder algo recién publicado)


# ---------------------------------------------------------------- utilidades
def hoy():
    ov = os.environ.get("AGENDA_HOY")
    if ov:
        return datetime.date.fromisoformat(ov)
    return datetime.datetime.now(TZ).date()


def _to_date(v):
    """Normaliza a datetime.date desde: date, datetime, Timestamp, epoch (s),
    'YYYY-MM-DD...', o lista/tupla (toma el primer elemento). None si no puede."""
    if v is None:
        return None
    if isinstance(v, (list, tuple)):
        return _to_date(v[0]) if v else None
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    # pandas.Timestamp tiene .date()
    if hasattr(v, "date") and callable(getattr(v, "date")):
        try:
            return v.date()
        except Exception:
            pass
    if isinstance(v, (int, float)):
        # epoch en segundos (los timestamps de Yahoo)
        try:
            if v <= 0:
                return None
            return datetime.datetime.fromtimestamp(int(v), tz=TZ).date()
        except Exception:
            return None
    s = str(v).strip()
    if not s:
        return None
    try:
        return datetime.date.fromisoformat(s[:10])
    except Exception:
        return None


def _num(v):
    try:
        f = float(v)
        return None if f != f else f
    except Exception:
        return None


# ------------------------------------------------------------ fetch de Yahoo
def fetch_ticker(symbol):
    """Devuelve el dict CRUDO de Yahoo para 'symbol' (o {} si falla del todo).
    Separado de la clasificación para poder testear build_item con fixtures."""
    import yfinance as yf
    tk = yf.Ticker(symbol)
    raw = {}
    # 1) calendar: dict con 'Earnings Date', 'Ex-Dividend Date', 'Dividend Date'
    try:
        raw["calendar"] = tk.calendar or {}
    except Exception:
        raw["calendar"] = {}
    # 2) info: exDividendDate, dividendDate, earningsTimestamp*
    try:
        info = tk.info or {}
    except Exception:
        info = {}
    raw["info"] = {
        "exDividendDate":        info.get("exDividendDate"),
        "dividendDate":          info.get("dividendDate"),
        "lastDividendValue":     info.get("lastDividendValue"),
        "earningsTimestamp":     info.get("earningsTimestamp"),
        "earningsTimestampStart":info.get("earningsTimestampStart"),
        "currency":              info.get("currency"),
        "shortName":             info.get("shortName") or info.get("longName"),
    }
    # 3) get_earnings_dates: DataFrame con fechas futuras (estimadas por analistas)
    try:
        ed = tk.get_earnings_dates(limit=16)
        raw["earnings_index"] = [d for d in list(ed.index)] if ed is not None else []
    except Exception:
        raw["earnings_index"] = []
    return raw


# ------------------------------------------------------- clasificación (pura)
def _next_earnings(raw, hoy_):
    """(fecha, fuente) del próximo resultado confirmado, o (None, None)."""
    cal = raw.get("calendar") or {}
    # calendar['Earnings Date'] suele ser una lista de 1-2 fechas programadas
    d = _to_date(cal.get("Earnings Date"))
    if d and d >= hoy_ - datetime.timedelta(days=MARGEN_PASADO):
        return d, "calendar"
    # earnings_dates: primera fecha >= hoy
    fut = sorted([x for x in (_to_date(i) for i in raw.get("earnings_index") or []) if x])
    for x in fut:
        if x >= hoy_ - datetime.timedelta(days=MARGEN_PASADO):
            return x, "earnings_dates"
    # info.earningsTimestamp(Start): último recurso (puede ser estimación)
    info = raw.get("info") or {}
    d = _to_date(info.get("earningsTimestampStart")) or _to_date(info.get("earningsTimestamp"))
    if d and d >= hoy_ - datetime.timedelta(days=MARGEN_PASADO):
        return d, "info"
    return None, None


def _next_exdiv(raw, hoy_):
    """(exFecha, pagoFecha, importe, fuente) del próximo ex-dividend, o Nones."""
    cal = raw.get("calendar") or {}
    info = raw.get("info") or {}
    ex = _to_date(cal.get("Ex-Dividend Date"))
    fuente = "calendar"
    if not ex:
        ex = _to_date(info.get("exDividendDate"))
        fuente = "info"
    if not ex or ex < hoy_ - datetime.timedelta(days=MARGEN_PASADO):
        return None, None, None, None
    pago = _to_date(cal.get("Dividend Date")) or _to_date(info.get("dividendDate"))
    imp = _num(info.get("lastDividendValue"))
    return ex, pago, imp, fuente


def build_item(ticker, empresa, raw, hoy_):
    """Construye las entradas (resultado / exdiv / sinConfirmar) de una empresa.
    Función PURA sobre 'raw' → testeable sin red."""
    res = None
    exd = None
    faltan = []

    fres, fue_r = _next_earnings(raw, hoy_)
    if fres:
        dias = (fres - hoy_).days
        res = {"ticker": ticker, "empresa": empresa,
               "fecha": fres.isoformat(), "dias": dias,
               "confirmada": fue_r in ("calendar", "earnings_dates"),
               "fuente": fue_r}
    else:
        faltan.append("resultados")

    # Ex-dividend: SECUNDARIO. Yahoo es flojo con la bolsa española y las fechas/importes
    # EXACTOS ya los mantienes en la app (sección Dividendos). Aquí es solo un extra
    # orientativo; su ausencia NO se considera un hueco (no entra en 'sinConfirmar').
    ex, pago, imp, fue_d = _next_exdiv(raw, hoy_)
    if ex:
        exd = {"ticker": ticker, "empresa": empresa,
               "exFecha": ex.isoformat(), "dias": (ex - hoy_).days,
               "pagoFecha": pago.isoformat() if pago else None,
               "importe": imp, "fuente": fue_d}

    # 'sinConfirmar' = solo las que Yahoo NO da fecha de RESULTADOS (para esas rige el Vigía).
    sin = None
    if faltan:
        sin = {"ticker": ticker, "empresa": empresa,
               "motivo": "Yahoo no confirma la fecha de resultados (rige la estimación del Vigía)"}
    return res, exd, sin


# ----------------------------------------------------------- lista de empresas
def universo():
    """Empresas del Vigía: las que tienen dossiers/trimestral/[TICKER]-trim.json.
    Devuelve [(ticker, empresa, symbolYahoo)]."""
    tmap = {}
    try:
        tmap = json.load(open(TICKERS_F, encoding="utf-8"))
    except Exception:
        tmap = {}
    out = []
    for p in sorted(glob.glob(os.path.join(TRIM_DIR, "*-trim.json"))):
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        tk = (d.get("ticker") or os.path.basename(p).split("-")[0]).upper()
        emp = d.get("empresa") or tk
        sym = tmap.get(tk) or (tk + ".MC")
        out.append((tk, emp, sym))
    return out


def ddmm(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day:02d}-{d.month:02d}"


def main():
    HOY = hoy()
    emps = universo()
    resultados, exdivs, sinconf, fallos = [], [], [], []

    for i, (tk, emp, sym) in enumerate(emps, 1):
        try:
            raw = fetch_ticker(sym)
        except Exception as e:
            fallos.append({"ticker": tk, "symbol": sym, "error": str(e)[:100]})
            print(f"[{i}/{len(emps)}] {tk:6s} ERROR {e}")
            time.sleep(PAUSA)
            continue
        res, exd, sin = build_item(tk, emp, raw, HOY)
        if res and -MARGEN_PASADO <= res["dias"] <= VENTANA_RES:
            resultados.append(res)
        if exd and 0 <= exd["dias"] <= VENTANA_DIV:   # solo ex-div FUTUROS (extra orientativo)
            exdivs.append(exd)
        if sin:
            sinconf.append(sin)
        print(f"[{i}/{len(emps)}] {tk:6s} res={res['fecha'] if res else '—'} "
              f"exdiv={exd['exFecha'] if exd else '—'}")
        time.sleep(PAUSA)

    resultados.sort(key=lambda x: x["fecha"])
    exdivs.sort(key=lambda x: x["exFecha"])

    # --- resumen breve en español ------------------------------------------
    L = []
    if resultados:
        det = ", ".join(f"{r['empresa']} {ddmm(r['fecha'])}" for r in resultados[:8])
        L.append(f"📌 RESULTADOS confirmados ({len(resultados)}): {det}.")
    if exdivs:
        det = ", ".join(f"{e['empresa']} {ddmm(e['exFecha'])}" for e in exdivs[:8])
        L.append(f"💶 Ex-dividend (orientativo, {len(exdivs)}): {det}.")
    if not resultados:
        L.append("Sin fecha de resultados confirmada por Yahoo; rige la estimación del Vigía.")
    if sinconf:
        L.append(f"Sin fecha de resultados confirmada: {len(sinconf)} (rige la estimación del Vigía).")
    resumen = " ".join(L)

    ahora = datetime.datetime.now(TZ).replace(microsecond=0).isoformat()
    salida = {
        "schemaVersion": SCHEMA,
        "generadoEl": ahora,
        "generadoPor": "agenda.py (GitHub Actions) — fechas confirmadas de Yahoo Finance",
        "zona": "Europe/Madrid",
        "fechaReferencia": HOY.isoformat(),
        "resumenTexto": resumen,
        "resultados": resultados,
        "exDividendos": exdivs,
        "sinConfirmar": sinconf,
        "totalConsultadas": len(emps),
        "fallos": fallos,
    }

    os.makedirs(BUZON_DIR, exist_ok=True)
    # No sobrescribir con vacío si TODO falló (conserva el bueno anterior)
    if emps and len(fallos) == len(emps):
        print("AVISO: todas las consultas fallaron; NO se sobrescribe agenda.json.")
    else:
        with open(os.path.join(BUZON_DIR, "agenda.json"), "w", encoding="utf-8") as f:
            json.dump(salida, f, ensure_ascii=False, indent=2)

    # --- index.json (manifiesto): fusiona, no pisa a otras tareas -----------
    idx_path = os.path.join(BUZON_DIR, "index.json")
    idx = {"actualizado": ahora, "ficheros": []}
    if os.path.exists(idx_path):
        try:
            prev = json.load(open(idx_path, encoding="utf-8"))
            if isinstance(prev.get("ficheros"), list):
                idx["ficheros"] = [x for x in prev["ficheros"] if x.get("clave") != CLAVE]
        except Exception:
            pass
    resumen_corto = f"{len(resultados)} resultados · {len(exdivs)} ex-dividend confirmados"
    idx["ficheros"].append({
        "clave": CLAVE, "titulo": TITULO, "archivo": "agenda.json",
        "generadoEl": ahora, "destinoApp": ["calendario", "avisos"],
        "resumen": resumen_corto,
    })
    idx["actualizado"] = ahora
    idx["ficheros"].sort(key=lambda x: x.get("clave", ""))
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)

    print("Agenda OK —", resumen_corto)
    print(resumen)


if __name__ == "__main__":
    main()
