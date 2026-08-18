#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Actualizador de cotizaciones diarias (Yahoo Finance) para el proyecto Economia Domestica.

- Lee la lista de empresas de  tickers.json  (TICKER -> simbolo Yahoo, p.ej. "IBE":"IBE.MC").
- Para cada empresa descarga el CIERRE DIARIO (sin ajustar) desde 2011-01-01.
- Guarda un JSON por empresa en  precios/<TICKER>.json
- VENTANA MOVIL: en ejecuciones posteriores vuelve a pedir los ultimos VENTANA dias
  y SOBRESCRIBE los cierres ya guardados si Yahoo los ha consolidado con otro valor.
- Escribe  precios/_index.json  con el resumen, los fallos, las correcciones y los avisos.

Pensado para ejecutarse en un GitHub Action, pero tambien funciona en local:
    pip install yfinance
    python actualizar_cotizaciones.py

--------------------------------------------------------------------------------
PARCHE 25-07-2026 - "Opcion A": precision del cierre
--------------------------------------------------------------------------------
Problema que resuelve:
  El cierre oficial espanol sale de la SUBASTA DE CIERRE (17:30-17:35 CET). Yahoo
  publica antes el ultimo cruce de la sesion continua y consolida la subasta horas
  despues. La version anterior de este script arrancaba en (ultima_fecha + 1 dia) y
  descartaba al fusionar cualquier fecha ya existente: el PRIMER valor que Yahoo
  diera para un dia quedaba congelado PARA SIEMPRE, y los pases posteriores del cron
  ni siquiera pedian datos ("ya al dia"). Caso real: LOG 24-07-2026 quedo en 35,40
  cuando el cierre oficial fue 35,00, y ninguna reejecucion podia corregirlo.

Que cambia:
  1) VENTANA MOVIL   - cada pase vuelve a pedir los ultimos VENTANA dias naturales y
                       SOBRESCRIBE el valor guardado si Yahoo devuelve otro.
  2) CONFIRMACION T+1- el cierre del dia en curso se marca como provisional (campo
                       "provisional" en el JSON de la empresa y en _estado.json). Un
                       pase matinal del dia siguiente lo confirma con el dato ya
                       consolidado, antes de la apertura de Madrid.
  3) GUARDA DEL 25%  - si el valor nuevo se aparta mas de UMBRAL_REVISION del guardado,
                       NO se sobrescribe: se anota en _index.json -> "revisar". Con
                       auto_adjust=False el cierre bruto no se restablece nunca por un
                       split, asi que un salto asi es sintoma de dato malo, no de
                       correccion legitima. Regla del metodo: lo que no se puede
                       asegurar, no se da por veraz.
  4) REINTENTOS      - 3 intentos con espera creciente (los pases son ahora 4/dia y
                       Yahoo limita peticiones desde GitHub).

Lo que NO cambia (compatibilidad con la app):
  El array "data" sigue siendo [[fecha, cierre], ...] y _ultimos.json sigue siendo
  {TICKER: [fecha, cierre]}. Los campos nuevos son adicionales; la app los ignora.
--------------------------------------------------------------------------------
"""

import json, os, sys, time, datetime as dt

START = "2011-01-01"          # fecha de inicio del historico
OUTDIR = "precios"            # carpeta de salida (en la raiz del repo)
DECIMALS = 4                  # decimales del cierre
PAUSA = 1.0                   # segundos entre empresas (evita limites de Yahoo)
VENTANA = 10                  # dias naturales que se vuelven a pedir y sobrescribir
UMBRAL_REVISION = 0.25        # variacion maxima admitida al sobrescribir un cierre
INTENTOS = 3                  # reintentos por empresa ante error de Yahoo

try:
    import yfinance as yf
except ImportError:
    print("Falta yfinance. Instala con:  pip install yfinance")
    sys.exit(1)


def cargar_existente(path):
    """Devuelve (lista_data, ultima_fecha) del JSON ya guardado, o ([], None)."""
    if not os.path.exists(path):
        return [], None
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        data = d.get("data", [])
        ult = data[-1][0] if data else None
        return data, ult
    except Exception:
        return [], None


# [07-ago-2026] SIMBOLOS REUTILIZADOS.
# Yahoo sirve bajo `ENER.MC` una serie que arranca el 10-ene-2014 a 1,20 EUR, pero Ecoener
# DEBUTO EN BOLSA el 5-may-2021 a 5,90 EUR (OPV; el primer dia cayo un 15%). El tramo
# anterior pertenece a otra sociedad que ocupo ese ticker: no es un error de precio, es otra
# empresa. Y no se puede detectar por el valor —1,20 EUR es un precio perfectamente
# plausible—, asi que la unica frontera fiable es la FECHA del debut.
#
# Se descubrio el 07-ago-2026 al corregir el simbolo de ECO (estaba en `ECO.MC`, que Yahoo ya
# no sirve). La fusion no dio ni una correccion sobre las 3.194 fechas previas, o sea que el
# fichero llevaba ese mismo lastre desde siempre: siete anos de otra empresa dentro del
# grafico de la Ficha, del rango de 52 semanas y de cualquier calculo que mire lejos.
#
# Anadir aqui cualquier ticker cuyo simbolo haya tenido un ocupante anterior, con la fecha de
# su primera sesion REAL.
PRIMERA_SESION = {
    "ECO": "2021-05-05",   # Ecoener (ENER.MC): debut en bolsa. Lo anterior no es suyo.
}


def recortar_prehistoria(ticker, filas):
    """Quita del historico las sesiones anteriores a la primera sesion real del valor."""
    desde = PRIMERA_SESION.get(ticker)
    if not desde:
        return filas
    return [r for r in filas if r[0] >= desde]


def leer_confirmado(path):
    """Devuelve el `confirmadoHasta` guardado en el JSON, o None si no lo trae."""
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f).get("confirmadoHasta")
    except Exception:
        return None


def semilla_confirmado(data):
    """Semilla de `confirmadoHasta` para ficheros del esquema viejo, que no la traen.

    [07-ago-2026] Sin semilla, un fichero sin la marca da TODA su historia por no
    confirmada: 3.989 fechas en el caso de SAN. Seria cierto en lo formal —nadie ha
    registrado esas confirmaciones— e inutil en la practica: engorda `_estado.json`, que
    baja la app, y ahoga el unico aviso que importa entre miles de fechas viejas que
    llevan meses reconsultadas por la ventana movil.

    Se da por confirmado todo MENOS la ultima fila, que es la unica que puede haberse
    escrito con la sesion abierta. Es deliberadamente conservador: prefiere un aviso de
    mas el dia de la migracion a bendecir un cierre que nadie ha releido.
    """
    return data[-2][0] if len(data) >= 2 else None


MAX_SIN_CONFIRMAR = 30   # lo que se lista; mas que esto no es un aviso, es un vertido


def sin_confirmar(data, conf):
    """Fechas del fichero posteriores a `conf`, acotadas para no inundar _estado.json."""
    if conf is None:
        pend = [f for f, _ in data]
    else:
        pend = [f for f, _ in data if f > conf]
    return pend[-MAX_SIN_CONFIRMAR:]


def confirmado_hasta(nuevos, previo, hoy):
    """Fecha hasta la que los cierres se dan por CONFIRMADOS. Nunca retrocede.

    [07-ago-2026] POR QUE NO BASTA CON «no es hoy».
    Hasta hoy, `provisional` se recalculaba en cada pase como «la ultima fila es la de
    hoy». Eso da por definitivo, en cuanto cambia el dia, cualquier cierre escrito la
    vispera -- lo haya vuelto a leer alguien o no. Y el 06-ago-2026 no lo leyo nadie: la
    fila entera se escribio a las 10:48 con el mercado abierto, los pases de la noche no
    se entregaron (GitHub no asignaba runners ese dia) y a la manana siguiente el fichero
    presentaba nueve precios intradia como cierres, sin una sola marca. El descuadre lo
    encontro Carlos a mano, comparando con su Matriz.

    La regla honesta es otra: un cierre esta confirmado cuando un pase que corre en un DIA
    POSTERIOR a esa sesion vuelve a leerlo. Con la sesion terminada y el dia cambiado,
    Yahoo ya sirve la subasta de cierre; se comprobo el 07-ago contra fuente independiente
    que 9 de los 10 ultimos cierres de SAN coincidian al milesimo y solo fallaba el 06/08,
    que es justo el que nadie habia releido.

    No se confirma por repeticion dentro del mismo dia: cuando la fuente sirve una
    respuesta congelada, repetir la pregunta devuelve el mismo error dos veces.
    """
    candidatas = [f for f, _ in nuevos if f < hoy]
    ultima = max(candidatas) if candidatas else None
    if previo and (ultima is None or previo > ultima):
        return previo
    return ultima


try:
    from zoneinfo import ZoneInfo
    _MADRID = ZoneInfo("Europe/Madrid")
except Exception:
    _MADRID = None

CONSOLIDADO = (19, 0)   # hora de Madrid a partir de la cual la sesion del dia se da por cerrada


def _ahora_madrid():
    """Hora de Madrid. El runner va en UTC, asi que NO vale datetime.now() a secas: si falta
    tzdata se calcula el desfase CET/CEST por la regla de la UE (ultimo domingo de marzo y de
    octubre a las 01:00 UTC). Mismo criterio que actualizar_intradia.py."""
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


def hoy_bolsa(ahora=None):
    """El dia de HOY segun el reloj de Madrid, que es el del mercado del que hablamos.

    [18-ago-2026] Aqui habia un `dt.date.today()` a secas y eso es la fecha del RUNNER,
    que va en UTC. Consecuencia concreta: el pase de las 00:22 de Madrid corre a las
    22:22 UTC del dia ANTERIOR, asi que para el script todavia era la vispera y
    `confirmado_hasta()` no podia dar por confirmada la sesion que acababa de cerrar
    -- exige un pase de un DIA POSTERIOR y, en UTC, ese pase no lo era. El segundo
    intento de consolidacion era estructuralmente incapaz de consolidar nada.
    El resto del fichero ya usaba `_ahora_madrid()`; era este el que iba por libre."""
    return (ahora or _ahora_madrid()).strftime("%Y-%m-%d")


def solo_sesiones_cerradas(filas, ahora=None):
    """Quita la barra del DIA EN CURSO mientras la sesion no haya cerrado.

    [06-ago-2026] Este fichero es el HISTORICO DE CIERRES y de el beben las graficas, el TWR,
    el alfa, la calibracion y el rango de 52 semanas. Yahoo, con el mercado abierto, devuelve
    tambien la barra del dia sin terminar, y hasta hoy se escribia como si fuera un cierre:
    `"SAN": ["2026-08-06", 12.964]` era en realidad el precio de las 10:48. Se corregia sola por
    la noche, pero durante toda la sesion la serie de cierres llevaba dentro un provisional sin
    que nada lo dijera. El precio vivo tiene su propio canal —intradia.json— que ademas lo marca
    como provisional; aqui solo entran sesiones cerradas.

    A partir de las 19:00 de Madrid (CONSOLIDADO) la barra del dia SI entra: la subasta de cierre
    acaba a las 17:35 y Yahoo la consolida mucho antes de esa hora. Los pases nocturnos que ya
    existian (21:49, 23:47) siguen trayendo el valor definitivo y `fusionar()` lo sobrescribe.
    """
    t = ahora or _ahora_madrid()
    if (t.hour, t.minute) >= CONSOLIDADO:
        return filas
    hoy = t.strftime("%Y-%m-%d")
    return [f for f in filas if f[0] != hoy]


def descargar(symbol, start, intentos=INTENTOS):
    """Descarga cierres diarios sin ajustar desde 'start' hasta hoy. Devuelve lista [[fecha, cierre], ...]."""
    df = None
    for n in range(intentos):
        try:
            df = yf.download(symbol, start=start, interval="1d",
                             auto_adjust=False, progress=False, threads=False)
            break
        except Exception:
            if n == intentos - 1:
                raise
            time.sleep(2.0 * (n + 1))   # espera creciente: 2s, 4s
    if df is None or df.empty:
        return []
    # En versiones recientes las columnas pueden venir como MultiIndex
    col = "Close"
    serie = df[col]
    try:
        serie = serie.iloc[:, 0]  # por si es DataFrame de una columna
    except Exception:
        pass
    out = []
    for fecha, valor in serie.items():
        try:
            if valor is None or valor != valor:  # NaN
                continue
            out.append([fecha.strftime("%Y-%m-%d"), round(float(valor), DECIMALS)])
        except Exception:
            continue
    return solo_sesiones_cerradas(out)   # el dia en curso NO entra en el historico de cierres


def fusionar(data, nuevos, umbral=UMBRAL_REVISION):
    """Funde 'nuevos' sobre 'data' SOBRESCRIBIENDO las fechas ya presentes.

    Devuelve (data_ordenada, n_altas, correcciones, sospechosas):
      - correcciones: [[fecha, viejo, nuevo], ...]  cierres consolidados por Yahoo.
      - sospechosas : [[fecha, viejo, nuevo], ...]  variacion > umbral -> NO se toca el
                      valor guardado; se reporta para revision humana.
    """
    mapa = {d[0]: d[1] for d in data}
    altas, correcciones, sospechosas = 0, [], []
    for fecha, valor in nuevos:
        if valor is None or valor <= 0:
            continue                       # nunca machacar con un cero o un nulo
        viejo = mapa.get(fecha)
        if viejo is None:
            mapa[fecha] = valor
            altas += 1
        elif viejo != valor:
            if viejo > 0 and abs(valor - viejo) / viejo > umbral:
                sospechosas.append([fecha, viejo, valor])
            else:
                mapa[fecha] = valor
                correcciones.append([fecha, viejo, valor])
    data = sorted(([f, v] for f, v in mapa.items()), key=lambda x: x[0])
    return data, altas, correcciones, sospechosas


IBEXTR_YIELD = 0.04   # yield bruto anual asumido SOLO para el tramo reciente que extiende el IBEXTR real

def _indj_ultimo(dias=15):
    # Yahoo no da historico de INDJ.MC (IBEX 35 con Dividendos) pero SI su valor del dia.
    # Devuelve [fecha, valor] mas reciente, o None.
    try:
        filas = descargar("INDJ.MC", (dt.date.today() - dt.timedelta(days=dias)).isoformat())
    except Exception as e:
        print(f"INDJ.MC no disponible ({str(e)[:50]})")
        return None
    return filas[-1] if filas else None


def extender_ibextr(outdir, indj_row=None, yield_anual=IBEXTR_YIELD):
    # Mantiene precios/IBEXTR.json al dia. El historico real (investing.com) se congela hasta
    # 'real_hasta'. A partir de ahi: cada dia se captura el valor REAL de INDJ.MC (escalado al
    # nivel de la serie real) y se guarda en 'indj_puntos'; los huecos que Yahoo no cubra se
    # rellenan con los retornos del ^IBEX + un pequeno devengo. Idempotente: reconstruye el
    # tramo posterior a 'real_hasta' en cada ejecucion.
    tr_path = os.path.join(outdir, "IBEXTR.json")
    ib_path = os.path.join(outdir, "IBEX.json")
    if not os.path.exists(tr_path):
        return
    try:
        tr = json.load(open(tr_path, encoding="utf-8"))
    except Exception:
        return
    data0 = tr.get("data", [])
    if not data0:
        return
    real_hasta = tr.get("real_hasta") or data0[-1][0]
    tr["real_hasta"] = real_hasta
    base = [d for d in data0 if d[0] <= real_hasta]
    if not base:
        return
    basemap = {d[0]: d[1] for d in base}
    factor = tr.get("indj_factor")
    puntos = dict(tr.get("indj_puntos", {}))
    if indj_row and indj_row[1] and float(indj_row[1]) > 0:
        dfecha = indj_row[0]; dval = float(indj_row[1])
        if factor is None and dfecha in basemap:
            f = basemap[dfecha] / dval
            if 0.3 <= f <= 3.0:
                factor = round(f, 6); tr["indj_factor"] = factor
                print(f"IBEXTR: factor de escala INDJ.MC = {factor} (anclado en {dfecha})")
            else:
                print(f"IBEXTR: factor INDJ.MC fuera de rango ({f:.3f}); se ignora INDJ, solo sintetico.")
        if factor and dfecha > real_hasta:
            puntos[dfecha] = round(dval * factor, DECIMALS)
    tr["indj_puntos"] = puntos
    data = list(base)
    lvl = base[-1][1]
    ib = None
    if os.path.exists(ib_path):
        try:
            ib = json.load(open(ib_path, encoding="utf-8"))
        except Exception:
            ib = None
    dia = (1.0 + yield_anual) ** (1.0/252) - 1.0
    nreal = 0; nsint = 0
    if ib and ib.get("data"):
        ibd = sorted(ib["data"], key=lambda x: x[0])
        ibmap = {d[0]: d[1] for d in ibd}
        prev_ib = ibmap.get(real_hasta)
        for fecha, close in ibd:
            if fecha <= real_hasta:
                if close and close > 0:
                    prev_ib = close
                continue
            if fecha in puntos:
                lvl = puntos[fecha]; data.append([fecha, lvl]); nreal += 1
            elif prev_ib and prev_ib > 0 and close and close > 0:
                lvl = lvl * (close / prev_ib) * (1.0 + dia)
                data.append([fecha, round(lvl, DECIMALS)]); nsint += 1
            if close and close > 0:
                prev_ib = close
    else:
        for fecha in sorted(puntos):
            if fecha > real_hasta:
                data.append([fecha, puntos[fecha]]); nreal += 1
    tr["data"] = data
    tr["actualizado"] = data[-1][0]
    with open(tr_path, "w", encoding="utf-8") as f:
        json.dump(tr, f, ensure_ascii=False)
    if nreal or nsint:
        print(f"IBEXTR: tramo tras {real_hasta} -> {nreal} reales (INDJ.MC) + {nsint} sinteticos; hasta {data[-1][0]}")
    else:
        print(f"IBEXTR: al dia ({real_hasta}); sin tramo posterior.")


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    tickers_path = os.path.join(base, "tickers.json")
    with open(tickers_path, encoding="utf-8") as f:
        tickers = json.load(f)

    outdir = os.path.join(base, OUTDIR)
    os.makedirs(outdir, exist_ok=True)

    hoy = hoy_bolsa()
    # inicio de la ventana movil: todo lo posterior a esta fecha se vuelve a pedir y a sobrescribir
    desde_ventana = (dt.date.fromisoformat(hoy) - dt.timedelta(days=VENTANA)).isoformat()
    indice = {"actualizado": hoy, "ventana_dias": VENTANA, "ventana_desde": desde_ventana,
              "tickers": [], "fallos": [], "corregidos": [], "revisar": []}
    estado = {}   # ticker -> {"ultima": fecha, "provisional": bool}

    for i, (ticker, symbol) in enumerate(sorted(tickers.items()), 1):
        path = os.path.join(outdir, ticker + ".json")
        data, ult = cargar_existente(path)
        _n0 = len(data)
        data = recortar_prehistoria(ticker, data)
        if len(data) != _n0:
            print(f"        {ticker}: recortadas {_n0 - len(data)} sesiones anteriores a "
                  f"{PRIMERA_SESION[ticker]} (simbolo reutilizado)")
        ult = data[-1][0] if data else None

        if ult:
            # PARCHE: NO se arranca en (ult + 1 dia). Se retrocede hasta el inicio de la
            # ventana movil para poder RECONSULTAR y CORREGIR los cierres ya guardados.
            siguiente = (dt.date.fromisoformat(ult) + dt.timedelta(days=1)).isoformat()
            start = min(siguiente, desde_ventana)
        else:
            start = START

        try:
            nuevos = descargar(symbol, start)
        except Exception as e:
            print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) ERROR: {e}")
            indice["fallos"].append({"ticker": ticker, "symbol": symbol, "error": str(e)})
            time.sleep(PAUSA)
            continue

        if not nuevos:
            # si no habia nada previo y no descarga nada -> simbolo probablemente erroneo
            if not data:
                print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) SIN DATOS (revisa el simbolo en tickers.json)")
                indice["fallos"].append({"ticker": ticker, "symbol": symbol, "error": "sin datos"})
            else:
                print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) sin novedades")
                indice["tickers"].append({"ticker": ticker, "symbol": symbol,
                                          "desde": data[0][0], "hasta": data[-1][0], "n": len(data)})
                _conf = leer_confirmado(path) or semilla_confirmado(data)
                _sc = sin_confirmar(data, _conf)
                estado[ticker] = {"ultima": data[-1][0], "provisional": bool(_sc),
                                  "confirmadoHasta": _conf, "sinConfirmar": _sc}
            time.sleep(PAUSA)
            continue

        # fusionar SOBRESCRIBIENDO las fechas ya presentes (ver docstring del parche)
        data, altas, correcciones, sospechosas = fusionar(data, nuevos)
        data = recortar_prehistoria(ticker, data)   # la descarga vuelve a traer el tramo ajeno

        for fecha, viejo, nuevo in correcciones:
            print(f"        corregido {ticker} {fecha}: {viejo} -> {nuevo}")
            indice["corregidos"].append({"ticker": ticker, "fecha": fecha,
                                         "anterior": viejo, "nuevo": nuevo})
        for fecha, viejo, nuevo in sospechosas:
            print(f"        AVISO {ticker} {fecha}: {viejo} -> {nuevo} "
                  f"(>{UMBRAL_REVISION:.0%}); NO se sobrescribe, queda para revision")
            indice["revisar"].append({"ticker": ticker, "fecha": fecha,
                                      "guardado": viejo, "descartado": nuevo,
                                      "motivo": f"variacion > {UMBRAL_REVISION:.0%}"})

        # El cierre del dia en curso es PROVISIONAL: Yahoo aun puede no haber
        # consolidado la subasta de cierre. Lo confirma un pase de un dia POSTERIOR, y
        # hasta que ese pase ocurra de verdad la fila sigue marcada (ver confirmado_hasta).
        conf = confirmado_hasta(nuevos, leer_confirmado(path) or semilla_confirmado(data), hoy)
        pendientes = sin_confirmar(data, conf)
        provisional = bool(pendientes)

        with open(path, "w", encoding="utf-8") as f:
            json.dump({"ticker": ticker, "symbol": symbol,
                       "actualizado": hoy,
                       "confirmadoHasta": conf,
                       "provisional": pendientes[0] if pendientes else None,
                       "data": data}, f, ensure_ascii=False)

        # [11-ago-2026] Cuando algo se queda sin confirmar, se dice TAMBIEN que trajo la
        # descarga. Sin eso no se puede distinguir "la fuente no sirve esa sesion" de "la
        # logica de confirmacion falla", y las dos veces que lo he razonado sin este dato me
        # he equivocado.
        _rango = (nuevos[0][0] + ".." + nuevos[-1][0]) if nuevos else "nada"
        marca = (" [sin confirmar: " + ", ".join(pendientes)
                 + "; la descarga trajo " + _rango + "]") if provisional else ""
        print(f"[{i}/{len(tickers)}] {ticker} ({symbol}) +{altas} nuevos, "
              f"{len(correcciones)} corregidos -> {len(data)} "
              f"({data[0][0]} .. {data[-1][0]}){marca}")
        indice["tickers"].append({"ticker": ticker, "symbol": symbol,
                                  "desde": data[0][0], "hasta": data[-1][0], "n": len(data)})
        estado[ticker] = {"ultima": data[-1][0], "provisional": provisional,
                          "confirmadoHasta": conf, "sinConfirmar": pendientes}
        time.sleep(PAUSA)

    with open(os.path.join(outdir, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=0)

    # _ultimos.json: ultimo cierre de cada empresa (para que la app fije el "precio actual")
    ultimos = {}
    for ticker in tickers:
        pth = os.path.join(outdir, ticker + ".json")
        if os.path.exists(pth):
            try:
                dd = json.load(open(pth, encoding="utf-8"))
                if dd.get("data"):
                    ultimos[ticker] = dd["data"][-1]  # [fecha, cierre]
            except Exception:
                pass
    # Guarda: NO sobrescribir _ultimos.json con un diccionario vacio.
    # Si algo fallo al leer los precios/*.json, conservamos el ultimo bueno.
    ult_path = os.path.join(outdir, "_ultimos.json")
    if ultimos:
        with open(ult_path, "w", encoding="utf-8") as f:
            json.dump(ultimos, f, ensure_ascii=False)
        print(f"_ultimos.json escrito ({len(ultimos)} empresas).")
    else:
        print("AVISO: _ultimos.json NO se sobrescribe (0 empresas leidas); se conserva el anterior.")

    # _estado.json: fichero NUEVO y separado (no toca el esquema de _ultimos.json que lee
    # la app). Dice, por empresa, si su ultimo cierre es definitivo o aun provisional.
    rezagados = []
    if estado:
        # REZAGADOS: cierres de sesiones YA TERMINADAS que siguen sin confirmar. Es el caso
        # peligroso -- un precio intradia disfrazado de cierre -- y hasta el 07-ago-2026 no
        # se distinguia de un cierre bueno. Los del dia en curso no cuentan: esos son
        # provisionales por definicion y se confirman manana.
        rezagados = sorted(t for t, e in estado.items()
                           if any(f < hoy for f in (e.get("sinConfirmar") or [])))
        with open(os.path.join(outdir, "_estado.json"), "w", encoding="utf-8") as f:
            json.dump({"actualizado": hoy,
                       "provisionales": sorted(t for t, e in estado.items() if e["provisional"]),
                       "rezagados": rezagados,
                       "empresas": estado}, f, ensure_ascii=False)
        if rezagados:
            print(f"::warning::{len(rezagados)} empresas con cierres de sesiones ya cerradas "
                  f"SIN CONFIRMAR: {', '.join(rezagados[:12])}"
                  f"{' ...' if len(rezagados) > 12 else ''}. "
                  f"Un pase no se entrego a su hora y esos precios pueden ser intradia.")
        else:
            print("Cierres: todos confirmados por un pase posterior a su sesion.")

    _indj = _indj_ultimo()
    if _indj:
        print(f"INDJ.MC valor real de hoy: {_indj}")
    extender_ibextr(outdir, indj_row=_indj)

    print(f"\nHecho. {len(indice['tickers'])} con datos, {len(indice['fallos'])} fallos, "
          f"{len(indice['corregidos'])} cierres corregidos, {len(indice['revisar'])} para revision.")
    if indice["corregidos"]:
        print("Cierres consolidados por Yahoo en esta pasada:")
        for c in indice["corregidos"]:
            print(f"   {c['ticker']} {c['fecha']}: {c['anterior']} -> {c['nuevo']}")
    if indice["revisar"]:
        print("PENDIENTE DE REVISION (no se ha sobrescrito nada):")
        for c in indice["revisar"]:
            print(f"   {c['ticker']} {c['fecha']}: guardado {c['guardado']}, "
                  f"descartado {c['descartado']} ({c['motivo']})")
    # [07-ago-2026] Este resumen decia "PROVISIONALES de hoy" contando TODO lo no confirmado.
    # Desde que `provisional` incluye sesiones ya cerradas sin releer, mezclarlas seria decir
    # "de hoy" sobre un cierre de la semana pasada. Se separan, y los rezagados van con nombre:
    # con 103 empresas, "1 provisional" no dice cual y no se puede mirar.
    prov_hoy = sorted(t for t, e in estado.items()
                      if (e.get("sinConfirmar") or []) == [hoy])
    if prov_hoy:
        print(f"Cierres PROVISIONALES de hoy ({len(prov_hoy)}): {', '.join(prov_hoy)}. "
              f"Se confirman en el pase matinal de manana.")
    otros = sorted(t for t, e in estado.items()
                   if e["provisional"] and t not in prov_hoy and t not in rezagados)
    if otros:
        print(f"Sin confirmar por otro motivo ({len(otros)}): {', '.join(otros)}.")
    if rezagados:
        print(f"SIN CONFIRMAR de sesiones YA CERRADAS ({len(rezagados)}): "
              f"{', '.join(rezagados)}. Lanza otro pase.")
    if indice["fallos"]:
        print("Revisa estos simbolos en tickers.json:",
              ", ".join(x["ticker"] for x in indice["fallos"]))


if __name__ == "__main__":
    main()
