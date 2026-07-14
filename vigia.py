#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vigía de informes trimestrales — Método de Análisis Financiero KH&Claude
========================================================================
Tarea DETERMINISTA (sin IA): lee dossiers/trimestral/*-trim.json, calcula
para cada empresa el SIGUIENTE informe esperado y su fecha estimada, y
clasifica en: vencidos / esta semana / próximos 14 días.

⚠️ MISMO MOTOR QUE LA APP: el cálculo del próximo informe replica EXACTAMENTE
la función `_cadenciaDe` de la vista Cobertura (js/13-radar.js) — proyección
por estacionalidad de cada trimestre. Así el buzón y la pestaña Cobertura NO
pueden discrepar. Si algún día se cambia el algoritmo, cambiarlo en LOS DOS
sitios (aquí y en _cadenciaDe / _qtoken).

Escribe el resultado en el "buzón del lunes":
  - buzon/vigia.json  (datos que lee la app)
  - buzon/index.json  (manifiesto: qué ficheros hay en el buzón; se fusiona,
                       cada tarea sobrescribe SOLO su propia entrada)

Pensado para ejecutarse como GitHub Action (.github/workflows/vigia.yml), que
hace el commit+push con el token propio del repo. NO inventa datos: lo que no
pueda determinar lo deja en la lista sinDeterminar ("Pte. Revisión").
"""

import json, glob, os, re, datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")
ROOT = os.path.dirname(os.path.abspath(__file__))
TRIM_DIR = os.path.join(ROOT, "dossiers", "trimestral")
BUZON_DIR = os.path.join(ROOT, "buzon")

CLAVE = "vigia"
TITULO = "Vigía de informes trimestrales"

# Etiqueta de trimestre como en la app (_QLABEL de js/13-radar.js)
QLABEL = {"Q1": "Q1", "Q2": "H1", "Q3": "9M", "Q4": "FY"}


def qtoken(periodo):
    """Réplica EXACTA de _qtoken (js/13-radar.js): normaliza cualquier
    convención al token canónico Q1/Q2/Q3/Q4. Orden y patrones idénticos."""
    p = str(periodo).upper()
    if re.search(r"Q4|FY|12M|ANUAL", p): return "Q4"
    if re.search(r"Q3|9M", p): return "Q3"
    if re.search(r"Q2|S1|H1|1S|1H|6M|SEM", p): return "Q2"
    if re.search(r"Q1|3M|1T", p): return "Q1"
    return None


def parse_fecha(s):
    try:
        return datetime.date.fromisoformat(str(s)[:10])
    except Exception:
        return None


def cadencia_de(data):
    """Réplica EXACTA de _cadenciaDe (js/13-radar.js).
    Devuelve dict {ultimo, udate, next:(date,q), uq} o None."""
    revs = [r for r in data.get("revisiones", []) if isinstance(r, dict) and r.get("fecha")]
    if not revs:
        return None
    revs.sort(key=lambda r: r.get("fecha") or "")
    ultimo = revs[-1]
    # month-day (MM-DD) de la ÚLTIMA aparición de cada trimestre
    md_by_q = {}
    for r in revs:
        q = qtoken(r.get("periodo"))
        f = r.get("fecha")
        if q and f:
            md_by_q[q] = str(f)[5:10]
    udate = parse_fecha(ultimo.get("fecha"))
    if udate is None:
        return None
    best = None  # (date, q)
    for q, md in md_by_q.items():
        for y in (udate.year, udate.year + 1):
            try:
                cand = datetime.date.fromisoformat(f"{y}-{md}")
            except ValueError:
                continue
            if cand > udate:
                if best is None or cand < best[0]:
                    best = (cand, q)
                break
    return {"ultimo": ultimo, "udate": udate, "next": best, "uq": qtoken(ultimo.get("periodo"))}


def hoy():
    """Hoy en Madrid. Override para tests: VIGIA_HOY=AAAA-MM-DD."""
    ov = os.environ.get("VIGIA_HOY")
    if ov:
        return datetime.date.fromisoformat(ov)
    return datetime.datetime.now(TZ).date()


def procesar_empresa(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    ticker = data.get("ticker") or os.path.basename(path).split("-")[0]
    empresa = data.get("empresa") or ticker

    c = cadencia_de(data)
    if c is None:
        return {"error": True, "ticker": ticker, "empresa": empresa,
                "archivo": os.path.basename(path),
                "motivo": "Sin revisiones con fecha válida (Pte. Revisión)"}
    if not c["next"]:
        return {"error": True, "ticker": ticker, "empresa": empresa,
                "archivo": os.path.basename(path),
                "motivo": "No se pudo proyectar el próximo informe (Pte. Revisión)"}

    est, q = c["next"]
    return {
        "error": False, "ticker": ticker, "empresa": empresa,
        "ultimoPeriodo": c["ultimo"].get("periodo"),
        "ultimaFecha": c["udate"].isoformat(),
        "periodoEsperado": f"{est.year}-{q}",   # token máquina
        "periodoLabel": QLABEL.get(q, q),        # etiqueta como en Cobertura
        "fechaEstimada": est.isoformat(),
        "_est": est,
    }


def ddmm(d):
    return f"{d.day:02d}-{d.month:02d}"


def main():
    HOY = hoy()
    paths = sorted(glob.glob(os.path.join(TRIM_DIR, "*-trim.json")))

    vencidos, esta_semana, proximos, sin_det, futuros = [], [], [], [], []

    for p in paths:
        try:
            r = procesar_empresa(p)
        except Exception as e:
            sin_det.append({"archivo": os.path.basename(p), "motivo": f"Error de lectura: {e}"})
            continue
        if r["error"]:
            sin_det.append({"ticker": r["ticker"], "archivo": r["archivo"], "motivo": r["motivo"]})
            continue

        est = r.pop("_est")
        item = {k: r[k] for k in ("ticker", "empresa", "periodoEsperado", "periodoLabel",
                                  "fechaEstimada", "ultimoPeriodo", "ultimaFecha")}
        dias = (HOY - est).days
        if est < HOY - datetime.timedelta(days=3):
            item["diasVencido"] = dias
            vencidos.append(item)
        elif HOY - datetime.timedelta(days=3) <= est <= HOY + datetime.timedelta(days=7):
            esta_semana.append(item)
        elif HOY + datetime.timedelta(days=7) < est <= HOY + datetime.timedelta(days=14):
            proximos.append(item)
        if est >= HOY:
            futuros.append(item)

    for lst in (vencidos, esta_semana, proximos, futuros):
        lst.sort(key=lambda x: x["fechaEstimada"])
    siguiente = futuros[0] if futuros else None

    # --- Resumen breve en español -------------------------------------------
    L = []
    if vencidos:
        det = ", ".join(f"{v['empresa']} ({v['periodoLabel']}, +{v['diasVencido']}d)" for v in vencidos)
        L.append(f"⚠️ VENCIDOS ({len(vencidos)}): {det}.")
    if esta_semana:
        det = ", ".join(f"{v['empresa']} {ddmm(datetime.date.fromisoformat(v['fechaEstimada']))}" for v in esta_semana)
        L.append(f"📅 ESTA SEMANA ({len(esta_semana)}): {det}.")
    if proximos:
        det = ", ".join(f"{v['empresa']} {ddmm(datetime.date.fromisoformat(v['fechaEstimada']))}" for v in proximos)
        L.append(f"🔜 PRÓXIMOS 14 DÍAS: {det}.")
    if not esta_semana and not proximos and siguiente:
        d = datetime.date.fromisoformat(siguiente["fechaEstimada"])
        L.append(f"Nada en 14 días. Siguiente: {siguiente['empresa']} ~{ddmm(d)} ({siguiente['periodoLabel']}).")
    if sin_det:
        L.append(f"Pte. Revisión: {len(sin_det)} fichero(s) sin fecha determinable.")
    if not L:
        L.append("Sin avisos esta semana.")
    L.append('Para registrar un informe: "analizar informe trimestral de [empresa]".')
    resumen = " ".join(L)

    ahora = datetime.datetime.now(TZ).replace(microsecond=0).isoformat()
    salida = {
        "generadoEl": ahora,
        "generadoPor": "vigia.py (GitHub Actions) — mismo motor que Cobertura (_cadenciaDe)",
        "zona": "Europe/Madrid",
        "fechaReferencia": HOY.isoformat(),
        "resumenTexto": resumen,
        "vencidos": vencidos,
        "estaSemana": esta_semana,
        "proximos14d": proximos,
        "siguienteEvento": siguiente,
        "sinDeterminar": sin_det,
        "totalEmpresas": len(paths),
    }

    os.makedirs(BUZON_DIR, exist_ok=True)
    with open(os.path.join(BUZON_DIR, "vigia.json"), "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=2)

    # --- index.json (manifiesto): fusiona, no pisa a otras tareas -----------
    idx_path = os.path.join(BUZON_DIR, "index.json")
    idx = {"actualizado": ahora, "ficheros": []}
    if os.path.exists(idx_path):
        try:
            with open(idx_path, "r", encoding="utf-8") as f:
                prev = json.load(f)
            if isinstance(prev.get("ficheros"), list):
                idx["ficheros"] = [x for x in prev["ficheros"] if x.get("clave") != CLAVE]
        except Exception:
            pass
    resumen_corto = f"{len(vencidos)} vencidos · {len(esta_semana)} esta semana · {len(proximos)} próx. 14d"
    idx["ficheros"].append({
        "clave": CLAVE, "titulo": TITULO, "archivo": "vigia.json",
        "generadoEl": ahora, "destinoApp": ["avisos", "calendario"],
        "resumen": resumen_corto,
    })
    idx["actualizado"] = ahora
    idx["ficheros"].sort(key=lambda x: x.get("clave", ""))
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)

    print("Vigía OK —", resumen_corto)
    print(resumen)


if __name__ == "__main__":
    main()
