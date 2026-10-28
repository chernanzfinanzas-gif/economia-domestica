/* ============================================================
   26-ciergoogle.js — Cierre de Google (automático)             27-10-2026
   ============================================================
   Nace al separar 26-excelprecios.js el 26-oct-2026: ese fichero se quitó
   del index.html pensando que solo traía la importación MANUAL desde Excel
   (ya sustituida por cierre-google.yml + intradía), pero dentro vivía
   también todo el mecanismo que aplica el cierre de Google en automático
   (sincronizarGoogle, su temporizador, aplicar() y el testigo de
   conciliación con Yahoo). Al quitar el script se fueron las dos cosas
   juntas, y la app dejó de aplicar `cierre-google.json` el 26 y 27-oct.

   Este fichero se queda SOLO con la parte automática de Google: nada de
   selector de fichero ni botón en Ajustes (eso ya no se usa).

   QUE TOCA  ->  DB.valores[t].precioActual / .precioFecha   (efímero)
   QUE **NO** TOCA -> precios/*.json, el histórico de cierres.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------- utilidades ------------------------------ */
  function _n(v) { return (typeof num === 'function') ? num(v) : (parseFloat(v) || 0); }

  function _fuenteCorta(f) {
    var s = ('' + (f || '')).toLowerCase();
    if (s.indexOf('google') >= 0) return 'Google Finance';
    if (s.indexOf('excel')  >= 0) return 'Excel';
    if (s.indexOf('matriz') >= 0) return 'la Matriz';
    return '';
  }
  function _hoy() { return new Date().toISOString().slice(0, 10); }
  function _aviso(msg, ms) {
    if (typeof showToast === 'function') { try { showToast(msg, null, null, ms || 4200); return; } catch (e) {} }
    try { console.log('[Cierre Google] ' + msg.replace(/<[^>]*>/g, '')); } catch (e) {}
  }

  /* ------------------- nucleo: aplicar el documento --------------------- */
  function aplicar(doc, DBref) {
    var D = DBref || (typeof DB !== 'undefined' ? DB : null);
    var res = { ok: 0, ignorados: 0, descartados: 0, sesion: '', tipo: '', motivo: '' };
    if (!D) { res.motivo = 'sin base de datos'; return res; }
    if (!doc || !doc.precios || typeof doc.precios !== 'object') { res.motivo = 'el fichero no tiene precios'; return res; }

    var sesion = ('' + (doc.sesion || '')).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sesion)) { res.motivo = 'el fichero no indica la sesion'; return res; }
    res.sesion = sesion;
    res.tipo = doc.tipo || '';
    res.descartados = (doc.descartados || []).length;

    var definitivo = (res.tipo === 'cierre');
    res.definitivo = definitivo;
    var fuente = _fuenteCorta(doc.fuente);
    res.fuente = fuente;

    D.valores = D.valores || {};
    var ana = {};
    (D.analisis || []).forEach(function (a) { if (a && a.ticker) ana[('' + a.ticker).toUpperCase()] = a; });

    Object.keys(doc.precios).forEach(function (k) {
      var t = ('' + k).toUpperCase(), p = _n(doc.precios[k]);
      if (!t || !(p > 0)) { res.ignorados++; return; }
      var v = D.valores[t] = D.valores[t] || {};
      if ((v.precioFecha || '') > sesion) { res.ignorados++; return; }
      v.precioActual = p;
      v.precioFecha = sesion;
      v.precioManual = definitivo;
      v.precioFuente = fuente;
      v.precioISO = doc.selloUTC || new Date().toISOString();
      var a = ana[t]; if (a) a.cotizacion = p;
      res.ok++;
    });
    return res;
  }

  /* ============================================================
     CONCILIACION: cierre de Google  vs  cierre de Yahoo (T+1)
     ============================================================ */
  var MAX_SESIONES = 10, MAX_DIAS = 15, TOLERANCIA = 0.0005;   // 0,05%

  function _guardarTestigo(doc, D) {
    if (!D || !doc || doc.tipo !== 'cierre') return;
    var s = ('' + (doc.sesion || '')).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
    D.excelCierres = D.excelCierres || {};
    D.excelCierres[s] = { sesion: s, sello: doc.selloMadrid || doc.selloUTC || '',
                          precios: doc.precios || {}, revisado: false,
                          precision: (typeof doc.precisionEur === 'number') ? doc.precisionEur : 0,
                          fuente: doc.fuente || 'Google' };
    var hoy = _hoy();
    Object.keys(D.excelCierres).forEach(function (k) {
      var dias = Math.round((Date.parse(hoy) - Date.parse(k)) / 86400000);
      if (!(dias >= 0) || dias > MAX_DIAS) delete D.excelCierres[k];
    });
    var ks = Object.keys(D.excelCierres).sort();
    while (ks.length > MAX_SESIONES) { delete D.excelCierres[ks.shift()]; }
  }

  function comparar(testigo, ultimos, hoy) {
    var out = { sesion: testigo.sesion, comparados: 0, difs: [] };
    Object.keys(testigo.precios || {}).forEach(function (t) {
      var fila = ultimos[t];
      if (!fila) return;
      var fecha = fila[0], y = _n(fila[1]), e = _n(testigo.precios[t]);
      if (fecha !== testigo.sesion) return;
      if (!(y > 0) || !(e > 0)) return;
      out.comparados++;
      var tol = TOLERANCIA;
      if (testigo.precision > 0) tol = Math.max(tol, testigo.precision / e);
      if (Math.abs(y - e) / e > tol) out.difs.push({ ticker: t, excel: e, yahoo: y, pct: (y - e) / e * 100, tol: tol });
    });
    out.difs.sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); });
    return out;
  }

  function verificar() {
    var D = (typeof DB !== 'undefined') ? DB : null;
    if (!D || !D.excelCierres) return Promise.resolve(null);
    var hoy = _hoy();
    var pend = Object.keys(D.excelCierres).filter(function (s) {
      return !D.excelCierres[s].revisado && s < hoy;
    }).sort();
    if (!pend.length) return Promise.resolve(null);

    return fetch('precios/_ultimos.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (u) {
        if (!u) return null;
        var informes = [];
        pend.forEach(function (s) {
          var res = comparar(D.excelCierres[s], u, hoy);
          if (!res.comparados) return;
          D.excelCierres[s].revisado = true;
          D.excelCierres[s].difs = res.difs;
          informes.push(res);
        });
        if (!informes.length) return null;
        try { if (typeof saveNow === 'function') saveNow(); } catch (e) {}
        informes.forEach(function (res) {
          var f = res.sesion.split('-').reverse().join('/');
          if (!res.difs.length) {
            _aviso('✅ Cierre del ' + f + ' verificado: Yahoo coincide con el oficial en los ' + res.comparados + ' valores.', 5000);
          } else {
            _aviso('⚠️ Cierre del ' + f + ': Yahoo difiere del oficial en ' + res.difs.length +
                   ' de ' + res.comparados + ' valores (' + res.difs.slice(0, 3).map(function (d) { return d.ticker; }).join(', ') +
                   (res.difs.length > 3 ? '…' : '') + '). Detalle en la consola.', 9000);
            try {
              console.warn('[Cierre Google] Yahoo vs cierre oficial del ' + res.sesion +
                           '  (el historico se queda con el de Yahoo):');
              res.difs.forEach(function (d) {
                console.warn('   ' + d.ticker + ':  oficial ' + d.excel + '   Yahoo ' + d.yahoo +
                             '   (' + (d.pct >= 0 ? '+' : '') + d.pct.toFixed(3) + '%)');
              });
            } catch (e) {}
          }
        });
        return informes;
      })
      .catch(function () { return null; });
  }

  /* ============================================================
     CIERRE DESDE GOOGLE — sin tener que estar delante
     ============================================================ */
  var URL_GOOGLE = 'https://raw.githubusercontent.com/chernanzfinanzas-gif/' +
                   'economia-domestica/datos/cierre-google.json';

  var _G_DESDE_MIN = 18 * 60 + 40;      /* 18:40 en hora local */
  var _G_CADA_MS   = 10 * 60 * 1000;
  var _G_GUARDA_MS = 60 * 1000;
  var _gUltima = 0;

  function _googleEnVentana() {
    var d = new Date(), dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    return (d.getHours() * 60 + d.getMinutes()) >= _G_DESDE_MIN;
  }
  function _googleYaAplicado() {
    try {
      var D = (typeof DB !== 'undefined') ? DB : null;
      return !!(D && D.excelCierres && D.excelCierres[_hoy()]);
    } catch (e) { return false; }
  }
  function _googleEstado() {
    return { enVentana: _googleEnVentana(), yaAplicado: _googleYaAplicado(),
             ultimaPeticion: _gUltima ? new Date(_gUltima).toISOString() : null,
             ultimoFallo: (typeof window !== 'undefined') ? (window._cierreGoogleFallo || null) : null };
  }

  function sincronizarGoogle() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    if (typeof window !== 'undefined' && window._demoOn) return Promise.resolve(null);
    _gUltima = Date.now();
    var hoy = _hoy();
    return fetch(URL_GOOGLE + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r || !r.ok) {
          try { window._cierreGoogleFallo = { cuando: Date.now(), motivo: r ? ('HTTP ' + r.status) : 'sin respuesta' }; } catch (e) {}
          return null;
        }
        return r.json();
      })
      .then(function (doc) {
        if (!doc || !doc.precios) return null;
        if (('' + doc.sesion).slice(0, 10) !== hoy) return null;
        var res = aplicar(doc);
        if (res.motivo || !res.ok) return res;
        _guardarTestigo(doc, (typeof DB !== 'undefined') ? DB : null);
        try { if (typeof saveNow === 'function') saveNow(); } catch (e) {}
        try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
        var msg = '📈 ' + res.ok + ' cierres de Google aplicados · ' +
                  res.sesion.split('-').reverse().join('/');
        if (res.descartados) msg += ' · ' + res.descartados + ' descartados';
        _aviso(msg, 6000);
        if (res.descartados) {
          try {
            console.warn('[Cierre Google] Descartados por el Action, con su motivo:');
            (doc.descartados || []).forEach(function (d) {
              console.warn('   ' + d.ticker + ' — ' + d.motivo);
            });
          } catch (e) {}
        }
        return res;
      })
      .catch(function (e) {
        try { window._cierreGoogleFallo = { cuando: Date.now(), motivo: (e && e.message) || 'error de red' }; } catch (_) {}
        return null;
      });
  }

  if (typeof document !== 'undefined') {
    setTimeout(function () {
      Promise.resolve()
        .then(function () { return sincronizarGoogle(); })
        .catch(function () { return null; })
        .then(function () { try { verificar(); } catch (e) {} });
    }, 6000);

    (function _googleTimer() {
      if (typeof window === 'undefined') return;
      if (window._cierreGoogleTimerOn) return;
      window._cierreGoogleTimerOn = true;
      var tick = function () {
        try {
          if (document.visibilityState !== 'visible') return;
          if (!_googleEnVentana()) return;
          if (_googleYaAplicado()) return;
          if (Date.now() - _gUltima < _G_GUARDA_MS) return;
          sincronizarGoogle();
        } catch (e) {}
      };
      setInterval(tick, _G_CADA_MS);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') tick();
      });
    })();
  }

  /* expuesto para pruebas y para la consola */
  if (typeof window !== 'undefined') {
    window.sincronizarCierreGoogle = sincronizarGoogle;
    window.cierreGoogleEstado = _googleEstado;
    window.cierreGoogleEnEspera = function () { return _googleEnVentana() && !_googleYaAplicado(); };
    window._khCierreGoogleAplicar = aplicar;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { aplicar: aplicar, comparar: comparar, sincronizarGoogle: sincronizarGoogle,
                      fuenteCorta: _fuenteCorta, googleEnVentana: _googleEnVentana,
                      googleYaAplicado: _googleYaAplicado };
  }
})();
