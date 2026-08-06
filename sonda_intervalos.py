# -*- coding: utf-8 -*-
"""Sonda: que devuelve el chart de Yahoo segun el intervalo, desde un runner de GitHub.

POR QUE EXISTE (06-ago-2026)
El pase de intradia lee `Ticker.history(period="5d", interval="1d")` y se queda con el
cierre de la ultima barra. Hoy hemos visto que ese numero NO SE MUEVE en toda la sesion:
IBE valia 20,71 a las 11:18 y seguia valiendo 20,71 a las 14:44. La barra es la de hoy
—el porcentaje contra el cierre de ayer no es cero— pero su valor esta congelado.

Antes de reescribir la lectura de 25 empresas conviene comprobar si los intervalos
intradia (5m, 15m) devuelven algo que si se mueva. Esta sonda pide lo mismo de tres
maneras para tres empresas y lo imprime. No escribe nada, no toca ningun fichero.

Se lanza a mano desde Actions (sonda-intervalos.yml). Ejecutarla DOS veces separadas
10-15 minutos: lo que importa no es el numero, es si cambia entre una y otra.
"""
import sys
from datetime import datetime, timezone, timedelta

# [06-ago-2026, 2a version] Se anaden TESTIGOS de fuera del mercado espanol.
# La 1a sonda mostro que la serie intradia de las .MC se corta a las 09:25 CEST,
# 25 minutos despues de abrir. Eso admite dos explicaciones muy distintas:
#   (a) Yahoo tiene rota HOY la serie de BME  -> se arregla solo, o cambiamos de fuente
#   (b) Yahoo sirve datos degradados a las IP de centro de datos -> desde GitHub no
#       hay intradia posible por esta via, y da igual el intervalo que pidamos.
# Un valor de OTRA bolsa lo distingue: si el DAX o Apple SI traen barras recientes
# desde este mismo runner, es (a). Si tambien se cortan, es (b).
TICKERS = ["IBE.MC", "SAN.MC", "ITX.MC",   # las nuestras
           "^IBEX",                        # el indice del mismo mercado
           "^GDAXI",                       # otra bolsa europea, misma hora de sesion
           "AAPL"]                         # EE.UU.: aun no ha abierto, pero su preapertura
                                           # y su ultima sesion dicen si el canal funciona
PRUEBAS = [("1d", "5d"), ("15m", "2d"), ("5m", "1d"), ("1m", "1d")]


def main():
    import yfinance as yf
    ahora = datetime.now(timezone(timedelta(hours=2)))
    print("=== Sonda de intervalos · %s (UTC+2) ===" % ahora.strftime("%Y-%m-%d %H:%M:%S"))
    print("Lo que importa no es el valor, sino si CAMBIA entre dos ejecuciones.\n")
    for sym in TICKERS:
        print("--- %s" % sym)
        for interval, period in PRUEBAS:
            try:
                h = yf.Ticker(sym).history(period=period, interval=interval, auto_adjust=False)
                if h is None or h.empty:
                    print("    %-4s period=%-3s  (vacio)" % (interval, period))
                    continue
                ix = h.index[-1]
                cierre = float(h["Close"].iloc[-1])
                # La marca temporal de la ULTIMA barra es la mitad de la respuesta: dice
                # cuan reciente es de verdad el dato, no solo cuanto vale.
                try:
                    sello = ix.strftime("%Y-%m-%d %H:%M %Z")
                except Exception:
                    sello = str(ix)
                print("    %-4s period=%-3s  %10.4f   ultima barra: %s   (%d barras)"
                      % (interval, period, cierre, sello, len(h)))
            except Exception as e:
                print("    %-4s period=%-3s  ERROR: %s" % (interval, period, str(e)[:70]))
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
