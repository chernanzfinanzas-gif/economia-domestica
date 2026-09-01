#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""sembrar_cierre.py — el cierre de Google entra en el historico, como PROVISIONAL.
Metodo KH&Claude · repo economia-domestica · [01-sep-2026]

EL AGUJERO QUE TAPA, Y NO ES TEORICO
------------------------------------
El lunes 31-ago-2026 la sesion existio, `cierre_google.py` la capturo a las 20:31 de
Madrid y publico `cierre-google.json` con 84 valores. Y el martes por la manana el
historico `precios/*.json` seguia terminando el VIERNES 28. La barra del lunes no
existia en ningun sitio permanente.

Por que: `cierre_google.py` lleva escrito «NO TOCA precios/*.json» y su unico destino
es `DB.valores[t].precioActual` del navegador, via `sincronizarGoogle()` de
`js/26-excelprecios.js`. Eso vive en el localStorage de UN dispositivo y solo se aplica
si la app esta abierta entre las 18:40 y medianoche. El dato estaba publicado en el
servidor y se perdia por el camino.

Y encima el pase de Yahoo -- `actualizar_cotizaciones.py`, tres ejecuciones esa noche y
la siguiente, las tres en verde -- no trajo la sesion. El commit de las 22:48 toco 107
ficheros con +1 -1 cada uno: solo la linea `actualizado`. Ni una barra. Un no-op firmado
como exito.

Consecuencia visible: la casilla «Hoy» de Mi Cartera comparaba el precio del VIERNES
contra el `cierreAnt` del LUNES que traia `intradia.json`, y daba negativo un dia en que
la cartera subia. No era un error de formula: eran dos dias distintos restados.

LO QUE HACE
-----------
  1. SIEMBRA. Lee `cierre-google.json` y, para cada ticker, si `precios/<T>.json` NO
     tiene barra para esa sesion, se la anade. Deja `confirmadoHasta` INTACTO, asi que
     la fila nace dentro de `sinConfirmar` y el fichero sale `provisional`. No hay
     vocabulario nuevo: se usa el que `actualizar_cotizaciones.py` ya tenia montado.

  2. NUNCA PISA. Si la fecha ya esta en el fichero -- porque Yahoo llego primero, o
     porque una siembra anterior la puso -- NO se toca el valor. Google siembra donde no
     hay nada; no corrige a nadie. La correccion es competencia de Yahoo, que reconsulta
     los ultimos VENTANA=10 dias y sobrescribe via `fusionar()`.

  3. CONTRASTA. Cada valor sembrado queda anotado en `precios/_siembra.json`. En pases
     posteriores, cuando Yahoo ya ha confirmado esa fecha (`confirmadoHasta >= fecha`),
     se apunta que valor puso Yahoo y cuanto se separaba el de Google. Eso convierte una
     discusion en una medida.

     HACE FALTA, y esta medido. El 31-ago, comparando el cierre de Google con el
     `cierreAnt` de Yahoo en las 25 empresas presentes en los dos ficheros: mediana de
     diferencia 0,205%, maximo 2,33% (CIE 25,10 contra 25,70), y ONCE de 25 por encima
     del 0,25%. La cabecera de `cierre_google.py` afirma, medido el 20-ago, que Google y
     Yahoo coinciden «en 101 de 102, el MISMO numero redondeado a 2 decimales». Esa
     afirmacion NO se reproduce el 31-ago. Puede fallar cualquiera de los dos -- el
     `cierreAnt` del intradia sale del quote, no de una barra historica, y Yahoo tampoco
     escribio la sesion -- y por eso aqui no se decide quien gana: se registra, se marca
     provisional, y que lo diga el T+1.

  4. GUARDA DE COHERENCIA. `intradia.json` trae `cierreAnt` por ticker: el cierre de la
     sesion ANTERIOR segun Yahoo. Si ese cierre no cuadra con la ultima barra del
     historico, o falta una sesion o las dos fuentes no hablan del mismo dia. El lunes
     por la noche los dos ficheros del mismo repo se contradecian y nada lo dijo:
     `_estado.json` publicaba `rezagados: []` con una sesion entera ausente. Un fichero
     de salud que se calla cuando falta un dia entero es peor que no tenerlo.
     El resultado va a `precios/_coherencia.json`, con `ok` y el detalle.

LO QUE NO HACE
--------------
  · No descarga nada de Google: eso es de `cierre_google.py`, que ademas ya tira lo
    rancio, lo que cotiza por debajo de 2 EUR -- donde el redondeo a 2 decimales se come
    el valor -- y lo que no es del universo.
  · No avanza `confirmadoHasta` jamas. Confirmar es leer la sesion un dia POSTERIOR, y
    eso solo lo puede hacer el pase de Yahoo.
  · No toca la prehistoria ni reordena nada que no sea la insercion de su fila.

USO
---
    python sembrar_cierre.py --google _datos/cierre-google.json         # EN SECO
    python sembrar_cierre.py --google _datos/cierre-google.json --escribir
    python sembrar_cierre.py --google ... --intradia _datos/intradia.json --escribir
"""

import argparse
import datetime as dt
import json
import os
import sys

OUTDIR = "precios"
SIEMBRA = "_siembra.json"
COHERENCIA = "_coherencia.json"

# Por encima de esta separacion entre el cierre de Google y el que Yahoo confirma
# despues, el contraste se marca como GRAVE. No cambia ningun dato: cambia lo que se
# dice de el. 1% sobre un cierre no es redondeo, es otra cosa.
GRAVE_PCT = 1.0

# Tolerancia de la guarda de coherencia al comparar `cierreAnt` del intradia con la
# ultima barra del historico. Google publica 2 decimales y Yahoo 3 o 4, asi que una
# diferencia por debajo de esto es ruido de formato, no un problema.
COHERENCIA_PCT = 0.30


# --------------------------------------------------------------------------- utilidades
try:
    from zoneinfo import ZoneInfo
    _MADRID = ZoneInfo("Europe/Madrid")
except Exception:
    _MADRID = None


def _ahora_madrid():
    """La hora del MERCADO, no la del runner. Misma funcion que en
    `actualizar_cotizaciones.py` y `actualizar_intradia.py`: el runner va en UTC y un
    `datetime.now()` a secas convierte el pase de las 00:22 de Madrid en la vispera."""
    if _MADRID:
        return dt.datetime.now(_MADRID)
    u = dt.datetime.now(dt.timezone.utc)

    def _ultimo_domingo(a, m):
        d = dt.date(a, m, 31)
        return d - dt.timedelta(days=(d.weekday() + 1) % 7)

    ini = dt.datetime.combine(_ultimo_domingo(u.year, 3), dt.time(1, 0))
    fin = dt.datetime.combine(_ultimo_domingo(u.year, 10), dt.time(1, 0))
    off = 2 if ini <= u.replace(tzinfo=None) < fin else 1
    return u.astimezone(dt.timezone(dt.timedelta(hours=off)))


def _leer(path, defecto=None):
    if not os.path.exists(path):
        return defecto
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("   AVISO: no he podido leer %s (%s)" % (path, str(e)[:60]))
        return defecto


def _escribir(path, doc, indent=None):
    """`newline="\n"` NO es cosmetica: Python en Windows traduce cada \n a \r\n y el
    MISMO script sobre los MISMOS datos produce bytes distintos segun donde corra. Para
    Git eso son ficheros cambiados que no han cambiado, y un recolector que avisa de
    cambios inexistentes se acaba ignorando -- justo el dia que el aviso es de verdad."""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, ensure_ascii=False, indent=indent)
    os.replace(tmp, path)


def _dia_habil_anterior(iso):
    """El dia habil anterior a `iso`, contando solo de lunes a viernes.

    NO conoce los festivos de BME, y es a proposito: un festivo hace que la guarda avise
    de una sesion que no existio, y eso es un falso positivo que se lee en diez segundos.
    Lo contrario -- callarse una sesion que si existio -- es lo que paso el 31-ago y costo
    dos dias de numeros raros. Ante la duda, esta guarda prefiere hablar de mas."""
    d = dt.date.fromisoformat(iso) - dt.timedelta(days=1)
    while d.weekday() >= 5:                 # 5 = sabado, 6 = domingo
        d -= dt.timedelta(days=1)
    return d.isoformat()


def _escribir_si_cambia(path, doc, indent=None, ignorar=("actualizado",)):
    """Escribe SOLO si algo distinto de la fecha ha cambiado.

    Este workflow corre tres veces cada tarde. Sin esta guarda, `_siembra.json` y
    `_coherencia.json` cambiarian su linea `actualizado` en cada pase y firmarian tres
    commits diarios que no dicen nada -- ademas de tres despliegues de Pages. Es
    exactamente el fallo que el commit «Cotizaciones» del 31-ago dejo a la vista: 107
    ficheros modificados con +1 -1 cada uno, solo la fecha, y ni una barra nueva. Un
    fichero que se declara cambiado todos los dias deja de significar nada el dia que
    cambia de verdad."""
    viejo = _leer(path)
    if viejo is not None:
        a = {k: v for k, v in viejo.items() if k not in ignorar}
        b = {k: v for k, v in doc.items() if k not in ignorar}
        if json.dumps(a, sort_keys=True, ensure_ascii=False) == json.dumps(b, sort_keys=True, ensure_ascii=False):
            return False
    _escribir(path, doc, indent=indent)
    return True


MAX_SIN_CONFIRMAR = 30   # el mismo tope que actualizar_cotizaciones.py


def _sin_confirmar(data, conf):
    if conf is None:
        pend = [f for f, _ in data]
    else:
        pend = [f for f, _ in data if f > conf]
    return pend[-MAX_SIN_CONFIRMAR:]


# ------------------------------------------------------------------------------ siembra
def sembrar(base, google, seco=True):
    """Anade la barra de `google['sesion']` a los ficheros que no la tengan."""
    outdir = os.path.join(base, OUTDIR)
    sesion = (google or {}).get("sesion") or ""
    precios = (google or {}).get("precios") or {}
    hoy = _ahora_madrid().strftime("%Y-%m-%d")

    # Tres guardas antes de escribir una sola linea en el historico de cierres.
    if not sesion or not precios:
        return {"ok": False, "motivo": "cierre-google.json sin sesion o sin precios",
                "sesion": sesion, "sembrados": {}, "yaEstaban": [], "sinFichero": []}
    if (google.get("tipo") or "") not in ("cierre", "manual"):
        # `control` es la segunda captura de la hoja y existe para CONTRASTAR la primera,
        # no para publicarse. Sembrar con ella seria usar el termometro de repuesto.
        return {"ok": False, "motivo": "el bloque no es de cierre (tipo=%s)" % google.get("tipo"),
                "sesion": sesion, "sembrados": {}, "yaEstaban": [], "sinFichero": []}
    if sesion > hoy:
        return {"ok": False, "motivo": "la sesion (%s) es posterior a hoy (%s)" % (sesion, hoy),
                "sesion": sesion, "sembrados": {}, "yaEstaban": [], "sinFichero": []}

    sembrados, ya, sin_fichero = {}, [], []
    for tk in sorted(precios):
        valor = precios[tk]
        try:
            valor = float(valor)
        except (TypeError, ValueError):
            continue
        if not (valor > 0):
            continue                       # nunca sembrar un cero: seria una afirmacion
        path = os.path.join(outdir, tk + ".json")
        doc = _leer(path)
        if not doc or not doc.get("data"):
            sin_fichero.append(tk)
            continue
        data = doc["data"]
        fechas = {d[0] for d in data}
        if sesion in fechas:
            ya.append(tk)                  # Yahoo llego antes, o ya se sembro: NO se pisa
            continue
        if data and sesion < data[-1][0]:
            # Una sesion mas antigua que la ultima del fichero no se cuela por detras: si
            # eso pasa, el fichero de Google no es el que creemos y hay que mirarlo.
            sin_fichero.append(tk)
            continue

        if not seco:
            data.append([sesion, valor])
            data.sort(key=lambda x: x[0])
            conf = doc.get("confirmadoHasta")          # INTACTO, a proposito
            pend = _sin_confirmar(data, conf)
            doc["data"] = data
            doc["actualizado"] = hoy
            doc["provisional"] = pend[0] if pend else None
            # Marca propia, para que se sepa de donde salio esa fila sin cruzar ficheros.
            doc["sembrado"] = {"fecha": sesion, "fuente": "google", "el": hoy}
            _escribir(path, doc)
        sembrados[tk] = valor

    return {"ok": True, "sesion": sesion, "sembrados": sembrados,
            "yaEstaban": sorted(ya), "sinFichero": sorted(sin_fichero),
            "fuente": google.get("fuente", ""), "selloUTC": google.get("selloUTC", "")}


# -------------------------------------------------------------------- registro y contraste
def registrar_y_contrastar(base, res, google, seco=True):
    """Apunta lo sembrado y, cuando Yahoo ya confirmo esa fecha, cuanto se separaba."""
    outdir = os.path.join(base, OUTDIR)
    path = os.path.join(outdir, SIEMBRA)
    reg = _leer(path, {"schemaVersion": 1, "sesiones": {}}) or {"schemaVersion": 1, "sesiones": {}}
    reg.setdefault("sesiones", {})
    hoy = _ahora_madrid().strftime("%Y-%m-%d")

    if res.get("ok") and res.get("sembrados"):
        s = reg["sesiones"].setdefault(res["sesion"], {})
        s["sembradoEl"] = s.get("sembradoEl") or hoy
        s["fuente"] = res.get("fuente", "")
        s["selloUTC"] = res.get("selloUTC", "")
        s.setdefault("google", {}).update(res["sembrados"])

    # El contraste: para cada sesion registrada, mirar si el fichero ya trae esa fecha
    # CONFIRMADA y, si es asi, apuntar el numero de Yahoo al lado del de Google.
    nuevos_contrastes = 0
    for fecha, s in reg["sesiones"].items():
        gg = s.get("google") or {}
        con = s.setdefault("contraste", {})
        for tk, vg in gg.items():
            if tk in con:
                continue
            doc = _leer(os.path.join(outdir, tk + ".json"))
            if not doc or not doc.get("data"):
                continue
            conf = doc.get("confirmadoHasta")
            if not conf or conf < fecha:
                continue                    # aun no confirmado: no hay nada que contrastar
            vy = None
            for f, v in doc["data"]:
                if f == fecha:
                    vy = v
                    break
            if vy is None or not (vy > 0):
                continue
            dif = round(vy - vg, 6)
            pct = round(dif / vy * 100.0, 4)
            con[tk] = {"google": vg, "yahoo": vy, "dif": dif, "difPct": pct,
                       "grave": abs(pct) >= GRAVE_PCT, "el": hoy}
            nuevos_contrastes += 1

    # Resumen legible sin abrir el fichero entero.
    todos = []
    for s in reg["sesiones"].values():
        for c in (s.get("contraste") or {}).values():
            todos.append(abs(c["difPct"]))
    todos.sort()
    reg["actualizado"] = hoy
    reg["resumen"] = {
        "sesiones": len(reg["sesiones"]),
        "contrastes": len(todos),
        "medianaAbsPct": (todos[len(todos) // 2] if todos else None),
        "maxAbsPct": (todos[-1] if todos else None),
        "gravesPct": GRAVE_PCT,
        "graves": sum(1 for x in todos if x >= GRAVE_PCT),
        "nota": ("Cada linea compara el cierre que Google publico la misma tarde con el que "
                 "Yahoo confirmo despues para la MISMA fecha. No decide quien gana: mide "
                 "cuanto se separan, que es lo que hacia falta para poder decidirlo."),
    }
    if not seco:
        _escribir_si_cambia(path, reg, indent=1)
    return reg, nuevos_contrastes


# ------------------------------------------------------------------ guarda de coherencia
def coherencia(base, intradia, seco=True):
    """`cierreAnt` del intradia contra la ultima barra del historico.

    Es la guarda que faltaba el 31-ago: `intradia.json` SABIA el cierre del lunes y
    `precios/` no, los dos ficheros del mismo repo se contradecian, y `_estado.json`
    publicaba `rezagados: []`. Aqui se dice."""
    outdir = os.path.join(base, OUTDIR)
    hoy = _ahora_madrid().strftime("%Y-%m-%d")
    doc = {"schemaVersion": 1, "actualizado": hoy, "ok": True,
           "sesionIntradia": (intradia or {}).get("sesion"),
           "faltaSesion": [], "discrepan": [], "sinDato": [],
           "nota": ("`cierreAnt` de intradia.json es el cierre de la sesion ANTERIOR segun "
                    "Yahoo. Si no cuadra con la ultima barra de precios/, o falta una sesion "
                    "o las dos fuentes no hablan del mismo dia. Las dos cosas hay que saberlas.")}
    if not intradia or not intradia.get("datos"):
        doc["ok"] = None
        doc["nota"] += "  [sin intradia.json: la guarda no ha podido correr]"
        if not seco:
            _escribir_si_cambia(os.path.join(outdir, COHERENCIA), doc, indent=1)
        return doc

    # LA COMPARACION DE FECHAS VA PRIMERO, Y NO ES UN DETALLE.
    # La primera version de esta guarda solo miraba los VALORES, y por eso se le
    # escapaban las empresas que hubieran cerrado planas: en la prueba del 31-ago cazo 20
    # de 25 y las cinco que fallo eran justo las que no se habian movido. Una guarda que
    # depende de que el mercado se mueva no es una guarda. Si el intradia dice que la
    # sesion en curso es el dia X y el historico no llega al dia habil anterior a X,
    # FALTA UNA SESION, valgan lo que valgan los numeros.
    sesion_i = (intradia.get("sesion") or hoy)
    anterior_habil = _dia_habil_anterior(sesion_i)
    for tk, d in sorted((intradia.get("datos") or {}).items()):
        ca = d.get("cierreAnt")
        fdoc = _leer(os.path.join(outdir, tk + ".json"))
        if not fdoc or not fdoc.get("data"):
            doc["sinDato"].append(tk)
            continue
        ufecha, uvalor = fdoc["data"][-1]
        fila = {"ticker": tk, "ultimaBarra": ufecha, "valorHistorico": uvalor,
                "cierreAntIntradia": ca,
                "difPct": (round((uvalor - ca) / ca * 100.0, 3) if (ca and ca > 0 and uvalor > 0) else None)}
        if ufecha < anterior_habil:
            doc["faltaSesion"].append(fila)
            continue
        if not ca or not (ca > 0) or not (uvalor > 0):
            continue
        if abs(uvalor - ca) / ca * 100.0 > COHERENCIA_PCT:
            # Fechas que cuadran y valores que no: no falta una sesion, discrepan las
            # fuentes. Se separan porque se arreglan de forma distinta.
            doc["discrepan"].append(fila)

    doc["ok"] = not doc["faltaSesion"]
    doc["resumen"] = ("%d con sesion ausente, %d con valores discrepantes, %d sin fichero"
                      % (len(doc["faltaSesion"]), len(doc["discrepan"]), len(doc["sinDato"])))
    if not seco:
        _escribir_si_cambia(os.path.join(outdir, COHERENCIA), doc, indent=1)
    return doc


# ------------------------------------------------------------- _ultimos.json y _estado.json
def refrescar_indices(base, tickers, seco=True):
    """`_ultimos.json` es de donde la app saca `precioActual`: sembrar una barra y no
    tocarlo dejaria el dato escrito y a la vez invisible."""
    outdir = os.path.join(base, OUTDIR)
    up = os.path.join(outdir, "_ultimos.json")
    ep = os.path.join(outdir, "_estado.json")
    ult = _leer(up, {}) or {}
    est = _leer(ep, {}) or {}
    est.setdefault("empresas", {})
    hoy = _ahora_madrid().strftime("%Y-%m-%d")
    tocados = 0
    for tk in tickers:
        doc = _leer(os.path.join(outdir, tk + ".json"))
        if not doc or not doc.get("data"):
            continue
        ult[tk] = doc["data"][-1]
        conf = doc.get("confirmadoHasta")
        pend = _sin_confirmar(doc["data"], conf)
        est["empresas"][tk] = {"ultima": doc["data"][-1][0], "provisional": bool(pend),
                               "confirmadoHasta": conf, "sinConfirmar": pend}
        tocados += 1
    if tocados:
        est["actualizado"] = hoy
        # `provisionales` es la lista que el resto del sistema ya mira; que una siembra
        # aparezca ahi es exactamente lo que queremos que se vea.
        est["provisionales"] = sorted([t for t, v in est["empresas"].items() if v.get("provisional")])
        if not seco:
            # Guarda heredada de actualizar_cotizaciones.py: no dejar _ultimos.json vacio.
            if ult:
                _escribir(up, ult)
            _escribir(ep, est, indent=0)
    return tocados


# ----------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--google", default="cierre-google.json",
                    help="ruta del cierre-google.json ya publicado")
    ap.add_argument("--intradia", default=None,
                    help="ruta de intradia.json para la guarda de coherencia (opcional)")
    ap.add_argument("--base", default=".", help="raiz del repo (donde cuelga precios/)")
    ap.add_argument("--escribir", action="store_true",
                    help="sin esto va EN SECO: ensena lo que haria y no toca nada")
    a = ap.parse_args()
    seco = not a.escribir

    base = os.path.abspath(a.base)
    if not os.path.isdir(os.path.join(base, OUTDIR)):
        print("::error::No encuentro %s bajo %s" % (OUTDIR, base))
        return 2

    print("=" * 74)
    print("SIEMBRA DEL CIERRE DE GOOGLE" + ("   (EN SECO)" if seco else ""))
    print("=" * 74)

    google = _leer(a.google)
    if not google:
        print("::warning::No hay %s: no se siembra nada." % a.google)
        res = {"ok": False, "motivo": "sin cierre-google.json", "sesion": None,
               "sembrados": {}, "yaEstaban": [], "sinFichero": []}
    else:
        res = sembrar(base, google, seco=seco)

    if not res.get("ok"):
        print("  No se siembra: %s" % res.get("motivo"))
    else:
        print("  Sesion %s  ·  fuente: %s" % (res["sesion"], res.get("fuente", "")[:60]))
        print("  Sembrados : %d" % len(res["sembrados"]))
        print("  Ya estaban: %d  (Yahoo llego antes o ya se sembro; NO se pisa)" % len(res["yaEstaban"]))
        if res["sinFichero"]:
            print("  Sin fichero o fuera de orden: %s" % ", ".join(res["sinFichero"][:12]))
        for tk in sorted(res["sembrados"])[:12]:
            print("     %-6s %s" % (tk, res["sembrados"][tk]))
        if len(res["sembrados"]) > 12:
            print("     ... y %d mas" % (len(res["sembrados"]) - 12))

    if res.get("sembrados"):
        n = refrescar_indices(base, sorted(res["sembrados"]), seco=seco)
        print("  Indices refrescados: %d tickers en _ultimos.json y _estado.json" % n)

    reg, nuevos = registrar_y_contrastar(base, res, google, seco=seco)
    r = reg.get("resumen", {})
    print()
    print("  CONTRASTE Google vs Yahoo  ·  %d comparaciones (%d nuevas en este pase)"
          % (r.get("contrastes", 0), nuevos))
    if r.get("contrastes"):
        print("     mediana |dif| %.3f%%  ·  maximo %.3f%%  ·  graves (>=%.1f%%): %d"
              % (r.get("medianaAbsPct") or 0, r.get("maxAbsPct") or 0,
                 GRAVE_PCT, r.get("graves", 0)))

    coh = None
    if a.intradia:
        intra = _leer(a.intradia)
        coh = coherencia(base, intra, seco=seco)
        print()
        print("  GUARDA DE COHERENCIA  ·  %s" % coh.get("resumen", "sin ejecutar"))
        for fila in coh.get("faltaSesion", [])[:8]:
            print("     FALTA SESION  %-6s historico hasta %s (%s) vs cierreAnt %s"
                  % (fila["ticker"], fila["ultimaBarra"], fila["valorHistorico"],
                     fila["cierreAntIntradia"]))
        if coh.get("faltaSesion"):
            print("::warning::Faltan sesiones en el historico: %d tickers." % len(coh["faltaSesion"]))

    print()
    if seco:
        print("EN SECO: no se ha tocado nada. Con --escribir se aplica.")
    else:
        print("Aplicado.")
    print("=" * 74)
    return 0


if __name__ == "__main__":
    sys.exit(main())
