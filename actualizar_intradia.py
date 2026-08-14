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

# ── LA ESCALERA (06-ago-2026) ────────────────────────────────────────────────
# Yahoo cachea POR PETICION: cada (simbolo, intervalo, periodo) es una clave distinta,
# y algunas se quedan clavadas horas mientras sus vecinas responden al dia. Medido con
# sonda_intervalos.py a las 15:07 CEST del 06-ago-2026, en UNA SOLA ejecucion:
#     IBE.MC   15m/2d -> 20,83  barra 14:45  (fresca)
#     IBE.MC   5m/1d  -> 20,71  barra 09:25  (rancia, 5h 40m)
#     ^IBEX    15m/2d -> ...    barra 09:15  (rancia)   <- justo al reves
#     ^IBEX    5m/1d  -> ...    barra 14:50  (fresca)
# No hay intervalo bueno. Lo que si se puede es PREGUNTAR VARIAS VECES por claves
# distintas y quedarse con la primera que venga fresca; que las tres salgan rancias a la
# vez es mucho menos probable que una.
#
# Y sobre todo: se pide intervalo INTRADIA porque la barra trae hora. La barra diaria
# viene marcada 00:00 y un dato congelado es indistinguible de uno vivo — asi estuvimos
# ciegos toda la manana del 06-ago-2026, sirviendo el precio de las 09:25 hasta las 15:00.
ESCALERA      = [("5m", "5d"), ("15m", "5d"), ("1m", "2d")]
# 35 y no 20. Yahoo sirve el continuo espanol con 15 minutos de retraso, y la barra va
# etiquetada con el INICIO de su intervalo: una barra de 5m marcada 14:50 aparece a las
# 15:07 con 17 minutos de "edad" siendo perfectamente buena. Con el tope en 20 se
# rechazaban datos legitimos por cinco minutos de margen. Y no hace falta apretar: lo que
# esto tiene que cazar son las respuestas rancias de verdad, que el 06-ago-2026 traian
# barras de hace 420 minutos. Contra un fallo doce veces mayor que el umbral, un umbral
# holgado corta igual y no genera falsos positivos.
EDAD_MAX_MIN  = 35      # una barra mas nueva que esto es, sin discusion, un precio vivo
# ── EL COHORTE (06-ago-2026, por la tarde) ───────────────────────────────────
# Con el umbral solo, EBRO, MCM y PRM fallaban en TODAS las pasadas. No estaban rancias:
# son iliquidas y no habian cruzado una operacion en una hora. Se vio comparando dos
# pasadas separadas 6 minutos: sus edades crecian exactamente 6 (39->45, 59->65, 57->63)
# mientras las otras 22 se quedaban en 15-20. Una fuente muerta envejece a TODOS por igual
# —a las 16:24 las 25 marcaban 420 minutos—; una accion que no negocia envejece sola.
# El valor suelto no puede distinguir las dos cosas. El conjunto si.
#
# Asi que la frescura se juzga por la MEDIANA del grupo: si la mediana esta dentro del
# umbral, la fuente esta viva y a la iliquida se le acepta su ultima operacion, porque ESE
# es su precio. Si la mediana esta fuera, se rechaza todo.
EDAD_ILIQUIDA_MAX = 240  # con la fuente viva, hasta 4h sin negociar sigue siendo su precio
INTENTOS      = 2
APERTURA      = (9, 0)
CIERRE        = (17, 45)   # 17:35 + margen para la subasta de cierre
SALIDA        = "intradia.json"

# ── EL ARCHIVO DE LA SERIE DE 5 MINUTOS (14-ago-2026) ────────────────────────
# Cada pase se baja ~390 barras de 5 minutos por empresa y usaba SOLO la ultima. El
# resto se tiraba, y Yahoo no las guarda: solo sirve los ultimos 5 dias. Cada dia sin
# archivar es un dia de intradia que no se puede recuperar jamas.
#
# Se guarda un fichero por empresa (`series/TICKER.json`) con las ultimas ~10 sesiones,
# agrupadas por dia y con la hora en "HH:MM" en vez del ISO completo: la fecha ya la
# lleva el grupo, repetirla 100 veces por dia solo engorda la rama.
#
# NO se escribe en cada pase. Reescribir 25 ficheros cada 5 minutos multiplica por doce
# el peso de la rama `datos` sin que la forma de la curva cambie por esperar. La punta
# viva sigue viniendo de intradia.json, que si se refresca cada 5 minutos. El pase
# imprime los bytes que escribe para poder ajustar esto con una medida y no a ojo.
SERIES_DIR        = "series"
SERIES_SESIONES   = 10     # sesiones que se conservan (Yahoo solo sirve 5 por descarga)
SERIES_CADA_MIN   = 55     # minimo entre escrituras: una vez por hora, no cada pase

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


def _lee_intradia(barras, hoy_iso, ahora=None):
    """De las barras INTRADIA saca (precio, cierre_ant, hora_barra, edad_min).

    `barras` = [(datetime_con_tz, cierre), ...] en orden ascendente, tal como las da
    yfinance. Devuelve (None, None, None, edad) si la ultima barra de HOY es demasiado
    vieja, y (None, None, None, None) si directamente no hay barra de hoy.

    El cierre anterior es el de la ULTIMA barra de la sesion previa. No es exactamente el
    cierre oficial (le falta la subasta), pero aqui solo sirve para pintar la variacion
    del dia; el cierre oficial lo lleva la Matriz, que es quien manda.
    """
    ahora = ahora or ahora_madrid()
    hoy, ayer = [], []
    for ts, c in barras:
        try:
            c = float(c)
        except (TypeError, ValueError):
            continue
        if not (c > 0):
            continue
        try:
            dia = ts.strftime("%Y-%m-%d")
        except Exception:
            continue
        (hoy if dia == hoy_iso else ayer).append((ts, c))
    if not hoy:
        return None, None, None, None
    ts, precio = hoy[-1]
    try:
        edad = (ahora - ts.astimezone(ahora.tzinfo)).total_seconds() / 60.0
    except Exception:
        edad = None
    # Ya no se descarta aqui: quien decide es construir(), que ve el grupo entero.
    anterior = ayer[-1][1] if ayer else None
    # ISO con desfase, no "HH:MM": la app lo pasa por Date.parse() sin tener que
    # reconstruir la hora de Madrid desde un navegador que puede estar en otro huso.
    try:
        hora = ts.astimezone(ahora.tzinfo).isoformat(timespec="seconds")
    except Exception:
        hora = None
    return precio, anterior, hora, edad


def precio_de(symbol, intentos=INTENTOS, hoy_iso=None):
    """(precio, cierre_ant, hora_barra). Lanza RuntimeError si nada viene fresco.

    [06-ago-2026] ESTO USABA `fast_info` Y NO ESCRIBIO NUNCA UN SOLO PASE: tira del
    endpoint de *quotes*, que exige crumb y bloquea las IP de centro de datos (401/429
    para los 25 simbolos). Se paso al de *chart*, que si funciona desde el runner.
    Pero se pedia `interval="1d"`, y ahi vino el segundo enganno: la barra diaria no
    lleva hora, asi que cuando Yahoo servia una respuesta de su cache rancia NO HABIA
    FORMA DE SABERLO. El 06-ago-2026 la app enseno el precio de las 09:25 hasta las 15:00
    creyendolo vivo. Ahora se piden barras intradia, que traen hora, y se comprueba.
    """
    import yfinance as yf
    hoy_iso = hoy_iso or ahora_madrid().strftime("%Y-%m-%d")
    ult = None
    porque = []
    mejor = None          # (edad, precio, anterior, iso) de la barra mas fresca hallada
    b5m = None            # [14-ago-2026] las barras de 5m enteras, para archivarlas
    for interval, period in ESCALERA:
        for i in range(intentos):
            try:
                hh = yf.Ticker(symbol).history(period=period, interval=interval,
                                               auto_adjust=False)
                barras = [(ix, row["Close"]) for ix, row in hh.iterrows()]
                if interval == "5m" and barras:
                    b5m = barras          # se guardan aunque el peldano salga rancio:
                                          # para el archivo valen igual, llevan su hora
                p, c, hora, edad = _lee_intradia(barras, hoy_iso)
                if p and p > 0 and edad is not None:
                    if mejor is None or edad < mejor[0]:
                        mejor = (edad, p, c, hora)
                    if edad <= EDAD_MAX_MIN:
                        return p, c, hora, edad, b5m   # fresca sin discusion: no se sigue
                    porque.append("%s/%s %d min" % (interval, period, int(edad)))
                else:
                    porque.append("%s/%s sin barra de hoy" % (interval, period))
                break        # misma clave de cache: reintentar da lo mismo. Siguiente peldano.
            except Exception as e:
                ult = "%s/%s %s" % (interval, period, str(e)[:50])
                time.sleep(1.5 * (i + 1))
        else:
            porque.append(ult or "?")
    if mejor is not None:
        # Nada fresco, pero SI hay barra de hoy. Se devuelve la mas reciente con su edad
        # y que decida el cohorte: puede ser una iliquida perfectamente sana.
        return mejor[1], mejor[2], mejor[3], mejor[0], b5m
    raise RuntimeError(" | ".join(porque or [ult or "desconocido"]))


# ── EL ARCHIVO: funciones puras, para poder probarlas sin red y sin disco ────
def barras_por_dia(barras, tz=None):
    """[(timestamp, cierre), ...] -> {"AAAA-MM-DD": [["HH:MM", precio], ...]}.

    Se descarta lo que no sea un numero positivo y se ordena por hora. Si dos barras
    caen en el mismo minuto -puede pasar al cambiar de peldano- manda la ultima, que
    es la mas reciente."""
    out = {}
    for ts, c in (barras or []):
        try:
            c = float(c)
        except (TypeError, ValueError):
            continue
        if not (c > 0):
            continue
        try:
            t = ts.astimezone(tz) if tz is not None else ts
            dia = t.strftime("%Y-%m-%d")
            hhmm = t.strftime("%H:%M")
        except Exception:
            continue
        out.setdefault(dia, {})[hhmm] = round(c, 4)
    return {d: [[h, v[h]] for h in sorted(v)] for d, v in out.items()}


def fusionar_serie(previo, nuevas, max_sesiones=SERIES_SESIONES):
    """Mezcla lo guardado con lo recien descargado y recorta a las ultimas sesiones.

    Misma disciplina que los cierres diarios: la descarga trae 5 dias enteros y se
    escribe ENCIMA de lo que hubiera, asi que un hueco de varios dias se rellena solo
    en la primera pasada que vuelva a correr. Lo anterior al tope se descarta: el
    historico largo vive en precios/, no aqui.

    `previo` y `nuevas` son {"AAAA-MM-DD": [["HH:MM", precio], ...]}."""
    dias = {}
    for fuente in (previo or {}, nuevas or {}):
        for d, filas in (fuente or {}).items():
            if not isinstance(filas, list):
                continue
            m = dias.setdefault(d, {})
            for f in filas:
                try:
                    h, v = f[0], float(f[1])
                except (TypeError, ValueError, IndexError):
                    continue
                if v > 0:
                    m[h] = round(v, 4)
    ordenados = sorted(dias)[-max_sesiones:] if max_sesiones else sorted(dias)
    return {d: [[h, dias[d][h]] for h in sorted(dias[d])] for d in ordenados}


def toca_archivar(escrito_iso, ahora, cada_min=SERIES_CADA_MIN):
    """True si desde la ultima escritura ha pasado el intervalo. Sin marca previa,
    siempre toca: la primera pasada tras montarlo tiene que escribir."""
    if not escrito_iso:
        return True
    try:
        prev = dt.datetime.fromisoformat(str(escrito_iso))
    except Exception:
        return True
    try:
        delta = (ahora - prev).total_seconds() / 60.0
    except TypeError:            # uno con tz y otro sin ella: no se compara, se escribe
        return True
    return delta >= cada_min or delta < 0    # reloj hacia atras -> se escribe igual


# Marcador del unico motivo GRAVE de no escribir. Los demas ("mercado cerrado", "sin
# dossiers") son "no tocaba" y salen en verde; este significa que el pase SI tocaba y
# volvio con las manos vacias -> tiene que salir en ROJO en Actions. El 06-ago-2026
# estuvimos horas creyendo que el cron no disparaba cuando en realidad disparaba y no
# escribia: un pase mudo y verde es indistinguible de un pase que no existe.
MOTIVO_SIN_PRECIOS = "ningun precio obtenido"


def construir(base, forzar=False, getter=None, reloj=None, series=None):
    """Devuelve (dict a escribir, motivo) o (None, motivo) si no toca escribir.
    `getter` y `reloj` se inyectan en las pruebas.

    [14-ago-2026] `series` es un diccionario OPCIONAL que se rellena con las barras de
    5 minutos de cada empresa. Va como parametro de salida y no como tercer valor de
    retorno a proposito: cambiar la aridad obligaria a tocar todas las pruebas que ya
    desempaquetan dos, y una firma que se rompe al anadir una funcion nueva invita a
    no anadirla."""
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
    crudo = {}               # lo que trajo cada empresa, ANTES de que el cohorte decida
    barras_iso = {}          # ticker -> ISO de su barra, para el sello del documento
    for i, tk in enumerate(lista, 1):
        sym = mapa[tk]
        try:
            # El getter devuelve (precio, cierre_ant, hora_barra). Se acepta tambien la
            # forma antigua de dos valores para no atar las pruebas a la longitud de la
            # tupla: lo que se prueba es el comportamiento, no la firma.
            _r = getter(sym)
            p, ant = _r[0], _r[1]
            barra = _r[2] if len(_r) > 2 else None
            edad = _r[3] if len(_r) > 3 else None
            b5m = _r[4] if len(_r) > 4 else None
        except Exception as e:
            print("[%d/%d] %s (%s) ERROR: %s" % (i, len(lista), tk, sym, e))
            fallos.append(tk)
            time.sleep(PAUSA)
            continue
        fila = {"p": round(float(p), 4)}
        if ant and float(ant) > 0:
            fila["cierreAnt"] = round(float(ant), 4)
            fila["var"] = round((float(p) - float(ant)) / float(ant) * 100, 2)
        if barra:
            fila["barra"] = barra[11:16]   # "HH:MM" para pintar; el ISO va en el documento
            barras_iso[tk] = barra
        if edad is not None:
            fila["edadMin"] = int(edad)
        crudo[tk] = fila
        if series is not None and b5m:
            series[tk] = b5m
        print("[%d/%d] %s (%s) %s%s%s" % (i, len(lista), tk, sym, fila["p"],
                                          ("  %+.2f%%" % fila["var"]) if "var" in fila else "",
                                          ("  barra %s (%d min)" % (barra[11:16], int(edad)))
                                          if (barra and edad is not None) else
                                          (("  barra %s" % barra[11:16]) if barra else "  barra ?")))
        time.sleep(PAUSA)

    # ── EL COHORTE DECIDE ────────────────────────────────────────────────────
    # Una fuente muerta envejece a TODOS por igual; una accion que no negocia envejece
    # sola. Por eso la frescura se juzga por la mediana del grupo y no valor a valor.
    edades = sorted(f["edadMin"] for f in crudo.values() if "edadMin" in f)
    mediana = edades[len(edades) // 2] if edades else None
    viva = (mediana is not None and mediana <= EDAD_MAX_MIN)
    if edades:
        print("Cohorte: mediana %d min sobre %d valores -> fuente %s"
              % (mediana, len(edades), "VIVA" if viva else "RANCIA"))
    for tk in lista:
        fila = crudo.get(tk)
        if fila is None:
            continue
        e = fila.get("edadMin")
        if e is None or e <= EDAD_MAX_MIN:
            fila.pop("edadMin", None)
            datos[tk] = fila
        elif viva and e <= EDAD_ILIQUIDA_MAX:
            fila["iliquida"] = True
            datos[tk] = fila
            print("   %s: %d min sin negociar, pero la fuente esta viva -> se acepta" % (tk, e))
        else:
            fallos.append(tk)
            print("   %s: %d min y la fuente %s -> fuera"
                  % (tk, e, "viva pero es demasiado" if viva else "rancia"))

    if not datos:
        return None, "%s (%d fallos): no se escribe nada" % (MOTIVO_SIN_PRECIOS, len(fallos))

    # `hora` es cuando paso el robot; `datoHora`, de cuando es el precio. Son cosas
    # distintas y confundirlas nos costo el 06-ago-2026: el sello avanzaba cada 5 minutos
    # mientras el precio llevaba congelado desde las 09:25. La app debe ensenar la segunda.
    _isos = sorted(v for k, v in barras_iso.items() if k in datos)
    return {
        "schemaVersion": 2,
        "sesion": t.strftime("%Y-%m-%d"),
        "actualizado": t.isoformat(timespec="seconds"),
        "hora": t.strftime("%H:%M"),
        "datoISO": _isos[-1] if _isos else None,      # de cuando es el precio
        "datoHora": _isos[-1][11:16] if _isos else None,
        "retrasoMin": RETRASO_MIN,
        "provisional": True,
        "datos": datos,
        "fallos": fallos,
    }, "%d precios, %d fallos%s" % (len(datos), len(fallos),
                                    (", dato de las %s" % _isos[-1][11:16]) if _isos else "")


def archivar_series(dirserie, series, ahora, tz=None, max_sesiones=SERIES_SESIONES,
                    cada_min=SERIES_CADA_MIN, forzar=False):
    """Escribe/actualiza `series/TICKER.json`. Devuelve (n_ficheros, bytes, motivo).

    El estado -cuando se escribio por ultima vez- vive en `series/_estado.json`, junto a
    los datos: si algun dia se borra la carpeta entera se pierden los dos a la vez y la
    siguiente pasada la reconstruye. Un estado que sobrevive a sus datos miente."""
    if not series:
        return 0, 0, "sin barras que archivar"
    est_ruta = os.path.join(dirserie, "_estado.json")
    estado = {}
    if os.path.exists(est_ruta):
        try:
            estado = json.load(open(est_ruta, encoding="utf-8")) or {}
        except Exception:
            estado = {}
    if not forzar and not toca_archivar(estado.get("escrito"), ahora, cada_min):
        return 0, 0, "aun no toca (se escribe cada %d min)" % cada_min

    os.makedirs(dirserie, exist_ok=True)
    n, total = 0, 0
    for tk in sorted(series):
        nuevas = barras_por_dia(series[tk], tz)
        if not nuevas:
            continue
        ruta = os.path.join(dirserie, "%s.json" % tk)
        previo = {}
        if os.path.exists(ruta):
            try:
                previo = (json.load(open(ruta, encoding="utf-8")) or {}).get("dias") or {}
            except Exception:
                previo = {}
        dias = fusionar_serie(previo, nuevas, max_sesiones)
        doc = {"schemaVersion": 1, "ticker": tk, "zona": "Europe/Madrid",
               "actualizado": ahora.isoformat(timespec="seconds"), "dias": dias}
        tmp = ruta + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, ruta)      # atomica, como intradia.json
        n += 1
        total += os.path.getsize(ruta)

    estado["escrito"] = ahora.isoformat(timespec="seconds")
    estado["sesiones"] = max_sesiones
    tmp = est_ruta + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, est_ruta)
    return n, total, "escritas %d series (%.1f KB en total)" % (n, total / 1024.0)


def main():
    args = sys.argv[1:]
    forzar = "--forzar" in args
    salida = SALIDA
    if "--salida" in args:
        salida = args[args.index("--salida") + 1]
    base = os.path.dirname(os.path.abspath(salida)) or "."
    # La rama `datos` se clona aparte en el runner, asi que la carpeta de series puede
    # no estar junto a intradia.json: hay que poder apuntarla a mano. Y ahi es donde
    # esta lo YA guardado, que es con lo que hay que fusionar.
    dirserie = os.path.join(base, SERIES_DIR)
    if "--series" in args:
        dirserie = os.path.abspath(args[args.index("--series") + 1])
    sin_series = "--sin-series" in args
    forzar_series = "--forzar-series" in args

    _t = ahora_madrid()
    print("=== Intradia (%s) ===" % _t.strftime("%Y-%m-%d %H:%M %Z"))
    print("    zona horaria: %s" % ("ZoneInfo Europe/Madrid" if MADRID
          else "SIN tzdata -> desfase calculado a mano (%s)" % _t.tzname()))
    _series = {} if not sin_series else None
    doc, motivo = construir(base, forzar=forzar, series=_series)
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

    # El archivo de la serie va DESPUES y no puede tumbar el pase: intradia.json ya esta
    # escrito y es lo que la app necesita para funcionar. Si esto falla, se dice y se
    # sigue -- un extra que rompe lo principal deja de ser un extra.
    if _series is not None:
        try:
            n, bytes_, mot = archivar_series(dirserie, _series, _t, tz=_t.tzinfo,
                                             forzar=forzar_series)
            print("Series de 5 min: %s" % mot)
        except Exception as e:
            print("Series de 5 min: NO se han podido archivar (%s)" % str(e)[:120])
    return 0


if __name__ == "__main__":
    sys.exit(main())
