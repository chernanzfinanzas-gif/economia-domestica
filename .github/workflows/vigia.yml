#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vigía de informes trimestrales — Método de Análisis Financiero KH&Claude
========================================================================
Tarea DETERMINISTA (sin IA): lee dossiers/trimestral/*-trim.json, calcula
para cada empresa el SIGUIENTE trimestre esperado y su fecha estimada de
publicación, y clasifica en: vencidos / esta semana / próximos 14 días.

Escribe el resultado en el "buzón del lunes":
  - buzon/vigia.json  (datos que lee la app)
  - buzon/index.json  (manifiesto: qué ficheros hay en el buzón y de qué fecha)

Pensado para ejecutarse como GitHub Action (.github/workflows/vigia.yml), que
hace el commit+push con el token propio del repo. NO inventa datos: lo que no
pueda determinar lo deja marcado como "Pte. Revisión" en la lista sinDeterminar.

Regla de oro: sobrescribe su propio fichero cada semana; respeta los ficheros
de otras tareas dentro de buzon/ (solo toca su entrada en index.json).
"""

import json, glob, os, datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")
ROOT = os.path.dirname(os.path.abspath(__file__))
TRIM_DIR = os.path.join(ROOT, "dossiers", "trimestral")
BUZON_DIR = os.path.join(ROOT, "buzon")

CLAVE = "vigia"
TITULO = "Vigía de informes trimestrales"

# --- Normalización de tokens de periodo a (año, trimestre) --------------------
# Fiel al Manual (R32) y al prompt original del vigía. Tokens no reconocidos ->
# no se adivinan (se marcan Pte. Revisión).
Q_MAP = {
    "Q1": 1, "1T": 1, "3M": 1,
    "Q2": 2, "2T": 2, "S1": 2, "H1": 2, "6M": 2,
    "Q3": 3, "3T": 3, "9M": 3,
    "Q4": 4, "4T": 4, "FY": 4, "12M": 4,
}


def parse_periodo(tok):
    """'AAAA-Qn' o legacy ('S1-2025', '1T-2026', '9M2024'...) -> (año, trim) o None."""
    if tok is None:
        return None
    s = str(tok).strip().upper().replace("_", "-").replace(" ", "")
    # Insertar guion entre token y año pegados: '9M2024' -> '9M-2024'
    parts = [p for p in s.split("-") if p]
    if len(parts) == 1 and len(parts[0]) > 4:
        p = parts[0]
        for i in range(1, len(p)):
            if p[i:].isdigit() and len(p[i:]) == 4:
                parts = [p[:i], p[i:]]
                break
    year = q = None
    for p in parts:
        if p.isdigit() and len(p) == 4:
            year = int(p)
        elif p in Q_MAP:
            q = Q_MAP[p]
        elif p.startswith("Q") and p[1:].isdigit():
            q = int(p[1:])
    if year is None or q is None:
        return None
    return (year, q)


def token(y, q):
    return f"{y}-Q{q}"


def next_period(y, q):
    return (y + 1, 1) if q >= 4 else (y, q + 1)


def parse_fecha(s):
    try:
        return datetime.date.fromisoformat(str(s)[:10])
    except Exception:
        return None


def mas_un_ano(d):
    try:
        return d.replace(year=d.year + 1)
    except ValueError:  # 29-feb
        return d.replace(year=d.year + 1, day=28)


def hoy():
    """Fecha de hoy en Madrid. Permite override por TEST con VIGIA_HOY=AAAA-MM-DD."""
    ov = os.environ.get("VIGIA_HOY")
    if ov:
        return datetime.date.fromisoformat(ov)
    return datetime.datetime.now(TZ).date()


def fechas_confirmadas(data):
    """Recoge fechas de publicación confirmadas si el JSON las trae (ficha 11).
    Soporta: top-level {'fechasConfirmadas': {'2026-Q1':'2026-04-25'}},
    {'proximaPublicacion': {'periodo':'2026-Q1','fecha':'...'}} y, por revisión,
    un campo 'fechaConfirmada'. Devuelve dict (año,trim) -> date."""
    out = {}
    fc = data.get("fechasConfirmadas")
    if isinstance(fc, dict):
        for k, v in fc.items():
            p = parse_periodo(k); d = parse_fecha(v)
            if p and d:
                out[p] = d
    pp = data.get("proximaPublicacion")
    if isinstance(pp, dict):
        p = parse_periodo(pp.get("periodo")); d = parse_fecha(pp.get("fecha"))
        if p and d:
            out[p] = d
    for r in data.get("revisiones", []):
        if isinstance(r, dict) and r.get("fechaConfirmada"):
            p = parse_periodo(r.get("periodo")); d = parse_fecha(r.get("fechaConfirmada"))
            if p and d:
                out[p] = d
    return out


def procesar_empresa(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    ticker = data.get("ticker") or os.path.basename(path).split("-")[0]
    empresa = data.get("empresa") or ticker
    revs = data.get("revisiones", []) or []

    parsed = []  # (año, trim, date, periodo_original)
    for r in revs:
        if not isinstance(r, dict):
            continue
        p = parse_periodo(r.get("periodo"))
        d = parse_fecha(r.get("fecha"))
        if p and d:
            parsed.append((p[0], p[1], d, r.get("periodo")))

    if not parsed:
        return {"error": True, "ticker": ticker, "empresa": empresa,
                "archivo": os.path.basename(path),
                "motivo": "Sin revisiones con periodo+fecha válidos (Pte. Revisión)"}

    # Última por fecha
    ult = max(parsed, key=lambda t: t[2])
    ny, nq = next_period(ult[0], ult[1])
    registrados = {(a, q) for (a, q, _, _) in parsed}

    confirmadas = fechas_confirmadas(data)
    gruesa = False
    fuente = ""
    if (ny, nq) in confirmadas:
        est = confirmadas[(ny, nq)]
        fuente = "confirmada"
    else:
        # Mismo trimestre del año anterior + 1 año
        base = next((d for (a, q, d, _) in parsed if a == ny - 1 and q == nq), None)
        if base:
            est = mas_un_ano(base)
            fuente = "año anterior +1a"
        else:
            est = ult[2] + datetime.timedelta(days=91)
            gruesa = True
            fuente = "última +91d (estimación gruesa)"

    return {
        "error": False, "ticker": ticker, "empresa": empresa,
        "ultimoPeriodo": token(ult[0], ult[1]),
        "ultimaFecha": ult[2].isoformat(),
        "periodoEsperado": token(ny, nq),
        "yaRegistrado": (ny, nq) in registrados,
        "fechaEstimada": est.isoformat(),
        "gruesa": gruesa, "fuenteEstimacion": fuente,
        "_est": est,
    }


def ddmm(d):
    return f"{d.day:02d}-{d.month:02d}"


def main():
    HOY = hoy()
    paths = sorted(glob.glob(os.path.join(TRIM_DIR, "*-trim.json")))

    vencidos, esta_semana, proximos, sin_det = [], [], [], []
    futuros = []  # para "siguiente evento"

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
        item = {k: r[k] for k in ("ticker", "empresa", "periodoEsperado",
                                  "fechaEstimada", "gruesa", "ultimoPeriodo", "ultimaFecha")}
        dias = (HOY - est).days
        if (not r["yaRegistrado"]) and est < HOY - datetime.timedelta(days=3):
            item["diasVencido"] = dias
            vencidos.append(item)
        elif HOY - datetime.timedelta(days=3) <= est <= HOY + datetime.timedelta(days=7):
            esta_semana.append(item)
        elif HOY + datetime.timedelta(days=7) < est <= HOY + datetime.timedelta(days=14):
            proximos.append(item)
        if est >= HOY:
            futuros.append(item)

    vencidos.sort(key=lambda x: x["fechaEstimada"])
    esta_semana.sort(key=lambda x: x["fechaEstimada"])
    proximos.sort(key=lambda x: x["fechaEstimada"])
    futuros.sort(key=lambda x: x["fechaEstimada"])
    siguiente = futuros[0] if futuros else None

    # --- Resumen breve en español (para mostrar tal cual en la app) -----------
    L = []
    if vencidos:
        det = ", ".join(f"{v['empresa']} ({v['periodoEsperado']}, +{v['diasVencido']}d)" for v in vencidos)
        L.append(f"⚠️ VENCIDOS ({len(vencidos)}): {det}.")
    if esta_semana:
        det = ", ".join(f"{v['empresa']} {ddmm(datetime.date.fromisoformat(v['fechaEstimada']))}" for v in esta_semana)
        L.append(f"📅 ESTA SEMANA ({len(esta_semana)}): {det}.")
    if proximos:
        det = ", ".join(f"{v['empresa']} {ddmm(datetime.date.fromisoformat(v['fechaEstimada']))}" for v in proximos)
        L.append(f"🔜 PRÓXIMOS 14 DÍAS: {det}.")
    if not esta_semana and not proximos and siguiente:
        d = datetime.date.fromisoformat(siguiente["fechaEstimada"])
        L.append(f"Nada en 14 días. Siguiente evento: {siguiente['empresa']} ~{ddmm(d)} ({siguiente['periodoEsperado']}).")
    if sin_det:
        L.append(f"Pte. Revisión: {len(sin_det)} fichero(s) sin fecha determinable.")
    if not L:
        L.append("Sin avisos esta semana.")
    L.append('Para registrar un informe: "analizar informe trimestral de [empresa]".')
    resumen = " ".join(L)

    ahora = datetime.datetime.now(TZ).replace(microsecond=0).isoformat()
    salida = {
        "generadoEl": ahora,
        "generadoPor": "vigia.py (GitHub Actions)",
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

    # --- index.json (manifiesto del buzón): fusiona, no pisa a otras tareas ---
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
