#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fundamentales_cambios.py — "Qué cambió en el radar" (memoria mensual del buzón)
==============================================================================
Segundo paso del pipeline de fundamentales. `actualizar_fundamentales.py` baja de
Yahoo la foto NUEVA (fundamentales.json). Este script:
  1. Lee la foto NUEVA (fundamentales.json) y la foto ANTERIOR guardada el mes
     pasado (buzon/_fundamentales-prev.json).
  2. Calcula, por empresa, qué métricas cambiaron de forma MATERIAL (con umbral por
     métrica, para no marcar ruido) y unas SEÑALES accionables (más barata, en
     mínimos de 52 semanas, RPD al alza, payout disparado, BPA revisado…).
  3. Escribe buzon/fundamentales-cambios.json (lo leen la app y el informe) y fusiona
     su entrada en buzon/index.json.
  4. Guarda la foto NUEVA como _fundamentales-prev.json (memoria para el mes que viene).

Esto es lo que el navegador NO puede hacer: recordar la foto anterior. La app solo
tiene la foto de hoy; aquí vive la comparación en el tiempo.

Cadencia: MENSUAL (los fundamentales cambian despacio). Va en el mismo GitHub Action
que actualizar_fundamentales.py, DESPUÉS de él. NO inventa datos.

Uso:  python fundamentales_cambios.py
Test: FUND_HOY=2026-07-15 python fundamentales_cambios.py
"""

import json, os, datetime
from zoneinfo import ZoneInfo

SCHEMA    = 1
TZ        = ZoneInfo("Europe/Madrid")
ROOT      = os.path.dirname(os.path.abspath(__file__))
FUND_F    = os.path.join(ROOT, "fundamentales.json")
BUZON_DIR = os.path.join(ROOT, "buzon")
PREV_F    = os.path.join(BUZON_DIR, "_fundamentales-prev.json")
OUT_F     = os.path.join(BUZON_DIR, "fundamentales-cambios.json")
HIST_F    = os.path.join(BUZON_DIR, "fundamentales-historico.json")
HIST_MAX  = 36   # meses que se conservan en el histórico acumulado

CLAVE  = "radar"
TITULO = "Radar: qué cambió (fundamentales)"

# Métricas seguidas: (clave, etiqueta, tipo, umbral, unidad)
#   tipo 'rel' → cambio relativo (|Δ|/|antes| ≥ umbral);  'abs' → cambio absoluto (|Δ| ≥ umbral)
METRICAS = [
    ("per",          "PER",            "rel", 0.08, ""),
    ("perFwd",       "PER fwd",        "rel", 0.08, ""),
    ("pbv",          "P/BV",           "rel", 0.08, ""),
    ("rpd",          "RPD",            "abs", 0.3,  "%"),
    ("pos52sem",     "Pos. 52s",       "abs", 8,    "%"),
    ("roe",          "ROE",            "abs", 2,    "%"),
    ("margenNeto",   "Margen neto",    "abs", 2,    "%"),
    ("payout",       "Payout",         "abs", 5,    "%"),
    ("dnEbitda",     "DN/EBITDA",      "abs", 0.3,  "x"),
    ("crecBpa",      "Crec. BPA",      "abs", 3,    "%"),
    ("crecIngresos", "Crec. ingresos", "abs", 3,    "%"),
    ("bpa",          "BPA",            "rel", 0.08, ""),
    ("div12m",       "Div. 12m",       "rel", 0.05, ""),
]


def hoy():
    ov = os.environ.get("FUND_HOY")
    if ov:
        return datetime.date.fromisoformat(ov)
    return datetime.datetime.now(TZ).date()


def _n(v):
    try:
        f = float(v)
        return None if f != f else f
    except Exception:
        return None


def _load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _by_ticker(fund):
    out = {}
    if fund and isinstance(fund.get("empresas"), list):
        for e in fund["empresas"]:
            t = (e.get("ticker") or "").upper()
            if t:
                out[t] = e
    return out


def campos_cambiados(prev, cur):
    """Lista de métricas con cambio material entre prev y cur."""
    out = []
    for k, label, tipo, um, uni in METRICAS:
        a, b = _n(prev.get(k)), _n(cur.get(k))
        if a is None or b is None:
            continue
        d = b - a
        if tipo == "rel":
            if abs(a) < 1e-9 or abs(d) / abs(a) < um:
                continue
        else:  # abs
            if abs(d) < um:
                continue
        out.append({
            "k": k, "label": label, "antes": round(a, 3), "ahora": round(b, 3),
            "delta": round(d, 3),
            "deltaPct": round(d / abs(a) * 100, 1) if abs(a) > 1e-9 else None,
            "dir": "up" if d > 0 else "down", "unidad": uni,
        })
    return out


def senales(prev, cur):
    """Señales accionables de alto nivel (cruces de umbral)."""
    S = []
    per_a, per_b = _n(prev.get("per")), _n(cur.get("per"))
    pos_a, pos_b = _n(prev.get("pos52sem")), _n(cur.get("pos52sem"))
    rpd_a, rpd_b = _n(prev.get("rpd")), _n(cur.get("rpd"))
    pay_a, pay_b = _n(prev.get("payout")), _n(cur.get("payout"))
    bpa_a, bpa_b = _n(prev.get("bpa")), _n(cur.get("bpa"))
    d12_a, d12_b = _n(prev.get("div12m")), _n(cur.get("div12m"))
    fl_a = set(prev.get("flags") or [])
    fl_b = set(cur.get("flags") or [])

    if (per_a and per_b and per_b <= per_a * 0.92) or (pos_a is not None and pos_b is not None and pos_b <= pos_a - 10):
        S.append({"tipo": "barata", "txt": "🟢 Más barata que hace un mes"})
    if pos_b is not None and pos_b < 20 and (pos_a is None or pos_a >= 20):
        S.append({"tipo": "min52", "txt": "📉 Entró en mínimos de 52 semanas"})
    if rpd_a is not None and rpd_b is not None and rpd_b - rpd_a >= 0.3:
        if rpd_b >= 5 and rpd_a < 5:
            S.append({"tipo": "rpd", "txt": "💰 RPD cruzó el 5%"})
        elif rpd_b >= 4 and rpd_a < 4:
            S.append({"tipo": "rpd", "txt": "💰 RPD cruzó el 4%"})
    if pay_b is not None and pay_b > 80 and (pay_a is None or pay_a <= 80):
        S.append({"tipo": "payout", "txt": "⚠️ Payout por encima del 80%"})
    if bpa_a and bpa_b and abs(bpa_b - bpa_a) / abs(bpa_a) >= 0.08:
        d = "▲" if bpa_b > bpa_a else "▼"
        S.append({"tipo": "bpa", "txt": f"📊 BPA revisado {d} (¿resultados nuevos?)"})
    if d12_a and d12_b and d12_b <= d12_a * 0.90:
        S.append({"tipo": "divcut", "txt": "✂️ Dividendo 12m a la baja"})
    nuevas_flags = fl_b - fl_a
    for fl in sorted(nuevas_flags):
        S.append({"tipo": "flag", "txt": "🚩 Nueva alerta: " + fl})
    return S


def main():
    HOY = hoy()
    cur_doc = _load(FUND_F)
    if not cur_doc or not isinstance(cur_doc.get("empresas"), list):
        print("No hay fundamentales.json válido; nada que hacer.")
        return
    cur = _by_ticker(cur_doc)
    prev_doc = _load(PREV_F)
    prev = _by_ticker(prev_doc)
    fecha_ant = (prev_doc or {}).get("actualizado") if prev_doc else None

    cambios, nuevas, salieron = [], [], []
    for t, ce in cur.items():
        pe = prev.get(t)
        if pe is None:
            nuevas.append({"ticker": t, "nombre": ce.get("nombre") or t})
            continue
        campos = campos_cambiados(pe, ce)
        sen = senales(pe, ce)
        if campos or sen:
            cambios.append({"ticker": t, "nombre": ce.get("nombre") or t,
                            "campos": campos, "senales": sen})
    for t, pe in prev.items():
        if t not in cur:
            salieron.append({"ticker": t, "nombre": pe.get("nombre") or t})

    # ordenar: primero las que tienen señales, luego por nº de campos cambiados
    cambios.sort(key=lambda x: (-len(x["senales"]), -len(x["campos"]), x["ticker"]))

    n_sen = sum(1 for c in cambios if c["senales"])
    if fecha_ant:
        try:
            dias = (HOY - datetime.date.fromisoformat(str(fecha_ant)[:10])).days
            periodo = f"desde {fecha_ant} (~{dias} días)"
        except Exception:
            periodo = f"desde {fecha_ant}"
    else:
        periodo = "primera foto"

    # --- resumen breve --------------------------------------------------------
    if prev_doc is None:
        resumen = "Primera foto de fundamentales guardada. Los cambios saldrán en la próxima actualización mensual."
    else:
        L = [f"Radar ({periodo}): {len(cambios)} empresas con cambios"
             + (f", {n_sen} con señal accionable" if n_sen else "") + "."]
        top = [c for c in cambios if c["senales"]][:8]
        if top:
            det = "; ".join(c["nombre"] + " — " + ", ".join(s["txt"] for s in c["senales"]) for c in top)
            L.append("Señales: " + det + ".")
        if nuevas:
            L.append(f"Nuevas en el universo: {len(nuevas)} ({', '.join(x['ticker'] for x in nuevas[:10])}).")
        resumen = " ".join(L)

    ahora = datetime.datetime.now(TZ).replace(microsecond=0).isoformat()
    salida = {
        "schemaVersion": SCHEMA,
        "generadoEl": ahora,
        "generadoPor": "fundamentales_cambios.py (GitHub Actions) — comparación mensual de fundamentales.json",
        "zona": "Europe/Madrid",
        "fechaReferencia": HOY.isoformat(),
        "fechaAnterior": fecha_ant,
        "periodoTexto": periodo,
        "resumenTexto": resumen,
        "cambios": cambios,
        "nuevas": nuevas,
        "salieron": salieron,
        "totales": {"conCambios": len(cambios), "conSenal": n_sen, "universo": len(cur)},
    }

    os.makedirs(BUZON_DIR, exist_ok=True)
    with open(OUT_F, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=2)

    # --- index.json (manifiesto): fusiona, no pisa a otras tareas -------------
    idx_path = os.path.join(BUZON_DIR, "index.json")
    idx = {"actualizado": ahora, "ficheros": []}
    if os.path.exists(idx_path):
        try:
            pv = json.load(open(idx_path, encoding="utf-8"))
            if isinstance(pv.get("ficheros"), list):
                idx["ficheros"] = [x for x in pv["ficheros"] if x.get("clave") != CLAVE]
        except Exception:
            pass
    idx["ficheros"].append({
        "clave": CLAVE, "titulo": TITULO, "archivo": "fundamentales-cambios.json",
        "generadoEl": ahora, "destinoApp": ["radar", "informe"],
        "resumen": f"{len(cambios)} con cambios · {n_sen} con señal",
    })
    idx["actualizado"] = ahora
    idx["ficheros"].sort(key=lambda x: x.get("clave", ""))
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)

    # --- histórico acumulado (memoria de meses anteriores en la app) --------
    # Solo se anota cuando hubo comparación real (no en la primera foto base).
    if prev_doc is not None:
        hist = _load(HIST_F) or {"schemaVersion": SCHEMA, "meses": []}
        if not isinstance(hist.get("meses"), list):
            hist["meses"] = []
        mes_key = HOY.strftime("%Y-%m")
        entry = {
            "mesKey": mes_key,
            "fecha": HOY.isoformat(),
            "periodoTexto": periodo,
            "resumenTexto": resumen,
            "totales": salida["totales"],
            "senaladas": [{"ticker": c["ticker"], "nombre": c["nombre"],
                           "senales": [s["txt"] for s in c["senales"]]}
                          for c in cambios if c["senales"]],
        }
        # si ya hay entrada de este mes (re-run manual), la reemplaza
        hist["meses"] = [m for m in hist["meses"] if m.get("mesKey") != mes_key]
        hist["meses"].append(entry)
        hist["meses"].sort(key=lambda m: m.get("fecha", ""))
        if len(hist["meses"]) > HIST_MAX:
            hist["meses"] = hist["meses"][-HIST_MAX:]
        hist["actualizado"] = ahora
        with open(HIST_F, "w", encoding="utf-8") as f:
            json.dump(hist, f, ensure_ascii=False, indent=2)

    # --- guardar la foto NUEVA como memoria para el mes que viene ------------
    with open(PREV_F, "w", encoding="utf-8") as f:
        json.dump(cur_doc, f, ensure_ascii=False)

    print(f"Cambios OK — {len(cambios)} con cambios, {n_sen} con señal, {len(nuevas)} nuevas.")
    print(resumen)


if __name__ == "__main__":
    main()
