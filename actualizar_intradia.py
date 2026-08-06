#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
actualizar_intradia.py - Metodo KH&Claude / app Economia Domestica
=================================================================
Escribe  intradia.json  en la RAIZ del repo con el precio de la sesion en curso
de las empresas que tienen dossier, para que la app pueda ensenar la cartera
moviendose durante el dia.

QUE NO TOCA  ->  precios/*.json ni precios/_ultimos.json.
  Ese es el historico de CIERRES y su fuente es actualizar_cotizaciones.py, que
  corre despues del cierre y consolida con la ventana movil. Un precio intradia
  metido ahi contaminaria las series de 10 anios, el Reverse DCF y la calibracion.
  Misma disciplina que ya sigue el modulo de "Precios desde Excel" de la app.

QUE ESCRIBE  ->  intradia.json (raiz), estructura estable:
  {
    "schemaVersion": 1,
    "sesion": "2026-08-05",              # dia de mercado al que pertenece el dato
    "actualizado": "2026-08-05T11:20:33+02:00",
    "hora": "11:20",                     # hora de Madrid del pase
    "retrasoMin": 15,                    # el que anuncia la fuente (Yahoo, diferido)
    "provisional": true,                 # SIEMPRE: no es un cierre
    "datos": {"IBE": {"p": 21.3, "var": 0.42, "cierreAnt": 21.21}, ...},
    "fallos": ["XXX"]
  }

DE DONDE SALE LA LISTA
  De los dossiers publicados en el repo (dossiers/[TICKER].json), cruzados con
  tickers.json (TICKER -> simbolo Yahoo). Cero mantenimiento: cuando publicas un
  dossier nuevo, entra solo; y como solo se compra lo que se analiza, la cartera
  siempre esta dentro. Si no hay dossiers legibles NO se inventa una lista: se
  avisa y se sale sin escribir.

GUARDIA HORARIA
  El cron de GitHub va en UTC y no entiende de horario de verano, asi que se
  programa una ventana amplia y es ESTE script el que decide si el mercado
  continuo esta abierto (09:00-17:45 de Madrid, de lunes a viernes). Fuera de
  esa franja sale sin pedir nada. Asi el mismo .yml vale en invierno y en verano.

Uso:   python actualizar_intradia.py [--forzar] [--salida RUTA]
Requisitos:  pip install yfinance
"""

import json, os, sys, time, datetime as dt

RETRASO_MIN   = 15      # lo que anuncia Yahoo para el continuo espanol
PAUSA         = 0.7     # segundos entre empresas (Yahoo limita desde GitHub)
INTENTOS      = 2
APERTURA      = (9, 0)
CIERRE        = (17, 45)   # 17:35 + margen para la subasta de cierre
SALIDA        = "intradia.json"

try:
    from zoneinfo import ZoneInfo
    MADRID = ZoneInfo("Europe/Madrid")
except Exception:                                   # py<3.9 o sin tzdata
    MADRID = None


def _ultimo_domingo(anio, mes):
    d = dt.date(anio, mes, 31)
    return d - dt.timedelta(days=(d.weekday() + 1) % 7)


def _es_verano_ue(u):
    """Regla del horario de verano de la UE, aplicada sobre una hora UTC: entra el ultimo
    domingo de marzo a las 01:00 UTC y sale el ultimo domingo de octubre a las 01:00 UTC."""
    ini = dt.datetime.combine(_ultimo_domingo(u.year, 3), dt.time(1, 0))
    fin = dt.datetime.combine(_ultimo_domingo(u.year, 10), dt.time(1, 0))
    return ini <= u.replace(tzinfo=None) < fin


def ahora_madrid():
    """Hora de Madrid, SIEMPRE.

    [06-ago-2026] El fallback de aqui abajo era `dt.datetime.now()` a secas, y eso no es
    "por si acaso": es un error silencioso. Si ZoneInfo no esta disponible, el reloj del
    runner de GitHub es UTC, asi que las 10:25 de Madrid se leian como 08:25, la guardia
    horaria decidia "mercado cerrado" y el pase salia EN VERDE sin escribir nada. Un dia
    entero de silencio perfecto. Ahora, si falta la base de zonas horarias, se calcula el
    desfase de Madrid a mano (CET/CEST por la regla de la UE) en vez de fingir que la hora
    local ya es la buena. El .yml ademas instala `tzdata`, con lo que esta rama no deberia
    entrar nunca; sigue aqui por si el runner cambia de imagen."""
    if MADRID:
        return dt.datetime.now(MADRID)
    u = dt.datetime.now(dt.timezone.utc)
    offset = 2 if _es_verano_ue(u) else 1
    tz = dt.timezone(dt.timedelta(hours=offset), "CEST" if offset == 2 else "CET")
    return u.astimezone(tz)


def mercado_abierto(t=None):
    """True si el continuo espanol esta en sesion. No conoce los festivos de BME:
    un festivo entre semana da un pase que no encuentra precio nuevo y no pasa nada
    (se escribe el mismo dato). Meter un calendario de festivos seria mas codigo
    del que ahorra."""
    t = t or ahora_madrid()
    if t.weekday() >= 5:
        return False
    hm = (t.hour, t.minute)
    return APERTURA <= hm <= CIERRE


def cargar_tickers(base):
    p = os.path.join(base, "tickers.json")
    if not os.path.exists(p):
        return {}
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        return {k.upper(): v for k, v in d.items() if isinstance(v, str)}
    except Exception as e:
        print("tickers.json no se puede leer: %s" % e)
        return {}


def tickers_con_dossier(base):
    """Los TICKER que tienen dossier publicado. Se excluyen los -trim.json, que son
    el monitor trimestral y no un dossier."""
    carpeta = os.path.join(base, "dossiers")
    if not os.path.isdir(carpeta):
        return []
    out = []
    for n in sorted(os.listdir(carpeta)):
        if not n.endswith(".json") or n.endswith("-trim.json"):
            continue
        t = n[:-5].upper()
        if t and not t.startswith("_"):
            out.append(t)
    return out


def _lee_historico(filas, hoy_iso):
    """De las barras diarias del chart de Yahoo saca (precio_de_hoy, cierre_anterior).

    `filas` = [(fecha_iso, cierre), ...] en orden ascendente. Durante la sesion, la ULTIMA
    barra es la del dia en curso y su "cierre" es el precio vivo; la anterior es el cierre
    oficial de ayer, que es justo lo que hace falta para la variacion del dia.

    Si la ultima barra NO es de hoy, devuelve (None, None): aun no ha empezado a cotizar o
    es festivo. Antes que dar el cierre de ayer haciendolo pasar por precio de hoy, nada.
    """
    limpio = []
    for f, c in filas:
        try:
            c = float(c)
        except (TypeError, ValueError):
            continue
        if c > 0 and f:
            limpio.append((f, c))
    if not limpio:
        return None, None
    if limpio[-1][0] != hoy_iso:
        return None, None
    precio = limpio[-1][1]
    anterior = limpio[-2][1] if len(limpio) > 1 else None
    return precio, anterior


def precio_de(symbol, intentos=INTENTOS, hoy_iso=None):
    """Ultimo precio conocido y cierre anterior. Devuelve (precio, cierre_ant).

    [06-ago-2026] ESTO USABA `Ticker(...).fast_info` Y NO ESCRIBIO NUNCA UN SOLO PASE.
    fast_info tira del endpoint de *quotes* de Yahoo, que exige "crumb" y bloquea las IP de
    centro de datos: desde un runner de GitHub devuelve 401/429 para TODOS los simbolos, con
    lo que fallaban los 25 y el script salia en verde sin escribir ("ningun precio").
    Se pasa al endpoint de *chart* —`Ticker.history()`—, que es exactamente el que lleva
    meses funcionando en actualizar_cotizaciones.py (`yf.download`) desde este mismo repo.
    Una peticion por empresa, sin autenticacion y sin crumb.
    """
    import yfinance as yf
    hoy_iso = hoy_iso or ahora_madrid().strftime("%Y-%m-%d")
    ult = None
    for i in range(intentos):
        try:
            h = yf.Ticker(symbol).history(period="5d", interval="1d", auto_adjust=False)
            filas = [(ix.strftime("%Y-%m-%d"), row["Close"]) for ix, row in h.iterrows()]
            p, c = _lee_historico(filas, hoy_iso)
            if p and p > 0:
                return p, c
            ult = "sin barra de hoy (ultima: %s)" % (filas[-1][0] if filas else "sin datos")
        except Exception as e:
            ult = str(e)[:80]
        time.sleep(1.5 * (i + 1))
    raise RuntimeError(ult or "desconocido")


# Marcador del unico motivo GRAVE de no escribir. Los demas ("mercado cerrado", "sin
# dossiers") son "no tocaba" y salen en verde; este significa que el pase SI tocaba y
# volvio con las manos vacias -> tiene que salir en ROJO en Actions. El 06-ago-2026
# estuvimos horas creyendo que el cron no disparaba cuando en realidad disparaba y no
# escribia: un pase mudo y verde es indistinguible de un pase que no existe.
MOTIVO_SIN_PRECIOS = "ningun precio obtenido"


def construir(base, forzar=False, getter=None, reloj=None):
    """Devuelve (dict a escribir, motivo) o (None, motivo) si no toca escribir.
    `getter` y `reloj` se inyectan en las pruebas."""
    t = reloj() if reloj else ahora_madrid()
    if not forzar and not mercado_abierto(t):
        return None, "mercado cerrado (%s)" % t.strftime("%a %H:%M")

    mapa = cargar_tickers(base)
    if not mapa:
        return None, "sin tickers.json: no se puede saber el simbolo de Yahoo de nadie"
    conD = tickers_con_dossier(base)
    if not conD:
        return None, "sin dossiers en el repo: no hay a quien seguir (no invento una lista)"

    lista = [t2 for t2 in conD if t2 in mapa]
    fuera = [t2 for t2 in conD if t2 not in mapa]
    if fuera:
        print("Con dossier pero sin simbolo en tickers.json (se quedan fuera): %s" % ", ".join(fuera))

    getter = getter or precio_de
    datos, fallos = {}, []
    for i, tk in enumerate(lista, 1):
        sym = mapa[tk]
        try:
            p, ant = getter(sym)
        except Exception as e:
            print("[%d/%d] %s (%s) ERROR: %s" % (i, len(lista), tk, sym, e))
            fallos.append(tk)
            time.sleep(PAUSA)
            continue
        fila = {"p": round(float(p), 4)}
        if ant and float(ant) > 0:
            fila["cierreAnt"] = round(float(ant), 4)
            fila["var"] = round((float(p) - float(ant)) / float(ant) * 100, 2)
        datos[tk] = fila
        print("[%d/%d] %s (%s) %s%s" % (i, len(lista), tk, sym, fila["p"],
                                        ("  %+.2f%%" % fila["var"]) if "var" in fila else ""))
        time.sleep(PAUSA)

    if not datos:
        return None, "%s (%d fallos): no se escribe nada" % (MOTIVO_SIN_PRECIOS, len(fallos))

    return {
        "schemaVersion": 1,
        "sesion": t.strftime("%Y-%m-%d"),
        "actualizado": t.isoformat(timespec="seconds"),
        "hora": t.strftime("%H:%M"),
        "retrasoMin": RETRASO_MIN,
        "provisional": True,
        "datos": datos,
        "fallos": fallos,
    }, "%d precios, %d fallos" % (len(datos), len(fallos))


def main():
    args = sys.argv[1:]
    forzar = "--forzar" in args
    salida = SALIDA
    if "--salida" in args:
        salida = args[args.index("--salida") + 1]
    base = os.path.dirname(os.path.abspath(salida)) or "."

    _t = ahora_madrid()
    print("=== Intradia (%s) ===" % _t.strftime("%Y-%m-%d %H:%M %Z"))
    print("    zona horaria: %s" % ("ZoneInfo Europe/Madrid" if MADRID
          else "SIN tzdata -> desfase calculado a mano (%s)" % _t.tzname()))
    doc, motivo = construir(base, forzar=forzar)
    if not doc:
        print("No se escribe: %s" % motivo)
        if motivo.startswith(MOTIVO_SIN_PRECIOS):
            print("ERROR: el mercado estaba abierto y no he traido un solo precio.")
            return 1              # que se vea ROJO en Actions: esto no es normal
        return 0                      # no es un fallo: es que no tocaba
    tmp = salida + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, salida)           # escritura atomica: la app nunca lee un json a medias
    print("Escrito %s -> %s" % (salida, motivo))
    return 0


if __name__ == "__main__":
    sys.exit(main())
