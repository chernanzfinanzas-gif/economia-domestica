#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""cierre_google.py — el cierre de la subasta, desde la hoja de Google.   [20-ago-2026]

QUE HACE
    Lee el CSV publicado de la hoja «Cierres KH», se queda con la captura de CIERRE de la
    sesion, tira todo lo que no se pueda dar por bueno, y escribe `cierre-google.json` con
    la MISMA forma que `precios-excel.json`. Asi el dato entra en la app por donde ya
    entraba el de Excel: `aplicar()` de `js/26-excelprecios.js`, sin modulo nuevo.

    NO TOCA `precios/*.json`. Ese es el historico de CIERRES de Yahoo y su duenio es
    `actualizar_cotizaciones.py`. Aqui solo se produce un fichero que la app aplica a
    `DB.valores[t].precioActual` y que el testigo contrasta al dia siguiente.

POR QUE EXISTE  (medido el 20-ago-2026, no supuesto)
    Yahoo publica el cierre consolidado horas tarde: el pase de las 20:07 es PROVISIONAL y
    el definitivo lo fija el T+1 de las 07:40 del dia siguiente. Google tiene la subasta a
    las 17:36. Medido sobre las 102 del universo: el `closeyest` de Google coincide con el
    cierre confirmado de Yahoo en 101 de 102 -- es el MISMO numero, redondeado a 2 decimales.

LAS TRES COSAS QUE ESTE SCRIPT TIRA, Y POR QUE
    1. LO QUE NO ES DE HOY. Un valor que no ha cruzado ninguna operacion no da error en
       Google: devuelve el ultimo precio que tuvo, con la misma pinta que uno de hoy. En la
       primera captura (20-ago) habia tres: TRG del 04-may, CEV del 14-ago, ARM del 18-ago.
       Se distinguen solo por `tradetime`, y por eso se captura esa columna.
    2. LO QUE EL REDONDEO ESTROPEA. Google sirve 2 decimales; Yahoo, 3 o 4. El error maximo
       es 0,005 EUR, que a 100 EUR no se nota y a 0,05 EUR se come el valor entero: Nyesa
       (0,0037) y Urbas (0,0021) salen como CERO. Por debajo de UMBRAL_EUR no se publica:
       vale mas esperar catorce horas a Yahoo que escribir un numero con un 1% de error.
    3. LO QUE NO ES DEL UNIVERSO. Si alguien edita la hoja a mano y cuela un ticker que el
       sistema no conoce, se descarta DICIENDOLO. Paso el 20-ago con una fila `BME:ENER`
       escrita en la pestaña equivocada.

    Nada se tira en silencio: todo descarte va a `descartados`, con su motivo.

USO
    python cierre_google.py --url "<csv publicado>" --tickers tickers.json --salida cierre-google.json
    python cierre_google.py --csv fichero.csv ...        # sin red, para pruebas
"""
import argparse, csv, datetime, io, json, os, re, sys, urllib.request

# Precio por debajo del cual NO se publica el dato de Google. A 2 EUR el error maximo del
# redondeo a 2 decimales es del 0,25%; por debajo crece deprisa y por debajo de 0,05 EUR
# el valor se redondea a cero. Las 17 empresas que caen aqui esperan al T+1 de Yahoo.
UMBRAL_EUR = 2.0

# La hoja usa el simbolo de Google; el metodo usa el suyo. Solo hace falta cuando no
# coinciden. [20-ago-2026] Ecoener: `empresas.json` la llama ECO y `tickers.json` usa
# ENER.MC. La deriva entre esos dos ficheros es un pendiente aparte.
ALIAS = {"ENER": "ECO"}

TIPOS_UTILES = ("cierre", "manual")     # `control` solo se usa para contrastar


def _num(v):
    """'12,34' y '12.34' -> 12.34. Vacio o basura -> None."""
    s = str(v or "").strip().replace(" ", "").replace(" ", "")
    if not s:
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def leer_csv(texto):
    """[{sesion, tipo, ticker, price, tradetime, closeyest, sello}] normalizado."""
    filas = []
    for f in csv.DictReader(io.StringIO(texto)):
        g = {(k or "").strip().lower(): (v if v is not None else "") for k, v in f.items()}
        ses = str(g.get("sesion", ""))[:10]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", ses):
            continue
        filas.append({
            "sesion": ses,
            "tipo": str(g.get("tipo", "")).strip().lower(),
            "ticker": str(g.get("ticker", "")).strip().upper(),
            "price": _num(g.get("price")),
            "tradetime": str(g.get("tradetime", "")).strip(),
            "closeyest": _num(g.get("closeyest")),
            "sello": str(g.get("sello", "")).strip(),
        })
    return filas


def elegir_bloque(filas):
    """(sesion, tipo, [filas], [filas de control]).

    Manda el bloque `cierre`; si no hay, el `manual` MAS RECIENTE de esa sesion. Nunca el
    primero que aparezca: la hoja apila capturas y la primera puede ser de antes de un
    arreglo. El 20-ago hubo tres `manual` el mismo dia y solo la ultima estaba completa.
    """
    if not filas:
        return None, None, [], []
    sesion = max(f["sesion"] for f in filas)
    dia = [f for f in filas if f["sesion"] == sesion]
    control = [f for f in dia if f["tipo"] == "control"]

    for tipo in TIPOS_UTILES:
        cand = [f for f in dia if f["tipo"] == tipo]
        if not cand:
            continue
        sellos = sorted({f["sello"] for f in cand if f["sello"]})
        if sellos:
            cand = [f for f in cand if f["sello"] == sellos[-1]]
        return sesion, tipo, cand, control
    return sesion, None, [], control


def depurar(bloque, sesion, universo, umbral=UMBRAL_EUR):
    """(precios, descartados). Nada se tira en silencio."""
    precios, fuera, vistos = {}, [], set()
    for f in bloque:
        t = ALIAS.get(f["ticker"], f["ticker"])
        if not t:
            continue
        if universo and t not in universo:
            fuera.append({"ticker": f["ticker"], "motivo": "no esta en el universo"})
            continue
        if t in vistos:
            fuera.append({"ticker": t, "motivo": "duplicado en el mismo bloque"})
            continue
        vistos.add(t)
        p = f["price"]
        if p is None or p <= 0:
            fuera.append({"ticker": t, "motivo": "sin precio (Google no lo cubre o lo redondea a cero)"})
            continue
        tt = f["tradetime"][:10]
        if not tt:
            fuera.append({"ticker": t, "precio": p, "motivo": "sin hora de ultima operacion"})
            continue
        if tt != sesion:
            fuera.append({"ticker": t, "precio": p, "motivo": "ultima operacion del %s, no de hoy" % tt})
            continue
        if p < umbral:
            fuera.append({"ticker": t, "precio": p,
                          "motivo": "por debajo de %.2f EUR: el redondeo a 2 decimales "
                                    "mete hasta un %.2f%% de error" % (umbral, 0.005 / p * 100)})
            continue
        precios[t] = p
    return precios, fuera


def contrastar(precios, control, sesion):
    """Diferencias entre el bloque que manda y la captura de control de mas tarde.

    Es lo que demuestra -o desmiente- que la hora temprana sirve. Si nunca difieren, las
    17:55 quedan probadas; si difieren, se sabe el dia que pasa y no meses despues.
    """
    if not control:
        return None
    porT = {}
    for f in control:
        t = ALIAS.get(f["ticker"], f["ticker"])
        if f["price"] and f["tradetime"][:10] == sesion:
            porT[t] = f["price"]
    difs = []
    for t, p in precios.items():
        q = porT.get(t)
        if q is None or not q:
            continue
        if abs(p - q) / q > 0.0005:                      # 0,05%, la del testigo de la app
            difs.append({"ticker": t, "cierre": p, "control": q,
                         "pct": round((p - q) / q * 100, 3)})
    difs.sort(key=lambda d: -abs(d["pct"]))
    return {"comparados": len(porT), "difs": difs}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--url", default=os.environ.get("HOJA_GOOGLE_CSV"))
    ap.add_argument("--csv", default=None, help="fichero local, para pruebas sin red")
    ap.add_argument("--tickers", default="tickers.json")
    ap.add_argument("--salida", default="cierre-google.json")
    ap.add_argument("--umbral", type=float, default=UMBRAL_EUR)
    ap.add_argument("--hoy", default=None, help="AAAA-MM-DD, para pruebas")
    a = ap.parse_args(argv)

    if a.csv:
        texto = open(a.csv, encoding="utf-8-sig").read()
    elif a.url:
        print("Bajando la hoja...")
        with urllib.request.urlopen(a.url, timeout=60) as r:
            texto = r.read().decode("utf-8-sig", "replace")
    else:
        sys.exit("Falta --url (o la variable HOJA_GOOGLE_CSV) o --csv.")

    universo = set()
    if os.path.exists(a.tickers):
        universo = {k.upper() for k in json.load(open(a.tickers, encoding="utf-8"))}
        print("Universo: %d tickers" % len(universo))

    filas = leer_csv(texto)
    print("Filas leidas: %d" % len(filas))
    sesion, tipo, bloque, control = elegir_bloque(filas)
    if not bloque:
        sys.exit("No hay ningun bloque utilizable en la hoja.")
    print("Bloque elegido: sesion %s · tipo %s · %d filas" % (sesion, tipo, len(bloque)))

    hoy = a.hoy or datetime.date.today().isoformat()
    if sesion > hoy:
        sys.exit("La hoja trae la sesion %s y hoy es %s. No escribo nada." % (sesion, hoy))

    precios, fuera = depurar(bloque, sesion, universo, a.umbral)
    if not precios:
        sys.exit("Ningun precio ha pasado los filtros. No escribo nada.")

    doc = {
        "schemaVersion": 1,
        "generado": datetime.datetime.now().isoformat(timespec="seconds"),
        "sesion": sesion,
        # `cierre` hace que la app marque precioManual=TRUE: es el cierre de la subasta y
        # el pase provisional de Yahoo de esa noche no debe pisarlo.
        "tipo": "cierre",
        "bloqueOrigen": tipo,
        "selloUTC": (bloque[0]["sello"] or "")[:19],
        "fuente": "Google Finance · hoja «Cierres KH» · captura post-subasta",
        "umbralEur": a.umbral,
        # [20-ago-2026] LA PRECISION VIAJA CON EL DATO.
        # Google sirve 2 decimales, o sea +-0,005 EUR. El testigo de la app compara con
        # una tolerancia FIJA del 0,05%, que a 3 EUR el redondeo se salta solo: marcaria
        # diferencia todos los dias en los mismos valores, por una imprecision conocida y
        # no por un error. Un aviso que salta siempre se acaba ignorando, y entonces no
        # avisa del que importa. Diciendo aqui cuanta precision trae el dato, el testigo
        # puede exigir `max(0,05%, 0,005/precio)` y volver a significar algo.
        "precisionEur": 0.005,
        "n": len(precios),
        "precios": precios,
        "descartados": fuera,
        "control": contrastar(precios, control, sesion),
    }
    with open(a.salida, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)

    print("\n  %d precios publicados · %d descartados" % (len(precios), len(fuera)))
    for d in fuera:
        print("     - %-6s %s" % (d["ticker"], d["motivo"]))
    c = doc["control"]
    if c:
        print("\n  Control: %d comparados · %d diferencias" % (c["comparados"], len(c["difs"])))
        for d in c["difs"]:
            print("     ! %-6s cierre %s vs control %s  (%+.3f%%)" % (d["ticker"], d["cierre"], d["control"], d["pct"]))
    elif control:
        print("\n  Control: presente pero sin datos comparables.")
    else:
        print("\n  Control: no hay captura de control de esta sesion.")
    print("\n  Escrito: %s\n" % a.salida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
