/* ============================================================
   26-excelprecios.js — Precios desde Excel (puente efimero)   25-07-2026
   ============================================================
   Carga  precios-excel.json  (lo genera precios_excel.py desde el libro de
   tipos de dato de Excel) y refresca el PRECIO DE TRABAJO de la app.

   POR QUE: Yahoo consolida el cierre oficial con horas de retraso. Excel lo
   tiene ~20-25 min tras la subasta y ademas da precio vivo durante la sesion.

   QUE TOCA  ->  DB.valores[t].precioActual / .precioFecha   (efimero)
   QUE **NO** TOCA -> precios/*.json, el historico de cierres. Decision expresa
                      del operador: ese array es la serie de CIERRES y lo usan
                      las graficas, el alfa/TWR, la Calibracion, el rango de 52
                      semanas del Radar y la Evolucion del Dividendo.

   PRECEDENCIA (depende del tipo de captura, 25-07-2026):

     tipo="intradia"  ->  precioManual=FALSE. Es un precio de media sesion, no un
                          cierre. Cuando esa noche Yahoo publique el cierre de esa
                          fecha, la condicion 'gana' de sincronizarCotizaciones()
                          lo sustituye sola. Caduca sin dejar huerfanos.

     tipo="cierre"    ->  precioManual=TRUE. Es el cierre OFICIAL de la subasta,
                          ~20 min despues de las 17:35. Es definitivo: no hay nada
                          mejor que pueda llegar ese dia.
                          POR QUE IMPORTA: sincronizarCotizaciones() solo corre al
                          CARGAR la app (01-core.js:569, no hay temporizador). Sin
                          esta marca, bastaba recargar la app despues de las 20:07
                          para que el pase PROVISIONAL de Yahoo pisara un cierre
                          oficial ya correcto (el caso LOG 35,00 -> 35,40 otra vez).
                          Con precioManual=TRUE Yahoo no puede tocarlo ESE dia, y
                          al dia siguiente 'fecha>pf' le devuelve el mando y repone
                          precioManual=false. Se autolimpia igual.

   Nota de coherencia: el historico (precios/*.json) sigue recibiendo el valor de
   Yahoo, no el de Excel. Tras el parche del pipeline ambos coinciden exacto en el
   91% de los valores; en los ultrailiquidos puede quedar una diferencia de decimas
   entre el precio de la ficha y el ultimo punto del grafico ESE dia. Es el precio a
   pagar por no meter datos de Excel en la serie de cierres, que fue la decision.

   Modulo AUTOCONTENIDO y ADITIVO: se inyecta solo en el menu Ajustes. Si no
   encuentra el menu, no hace nada (no rompe la app).
   ============================================================ */
(function () {
  'use strict';

  var DB_IDB = 'kh-excel-precios', STORE = 'handles', KEY = 'libro';

  /* ---------- memoria del fichero elegido (para que sea 1 clic) ---------- */
  function _idb() {
    return new Promise(function (ok, ko) {
      try {
        var r = indexedDB.open(DB_IDB, 1);
        r.onupgradeneeded = function () {
          if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
        };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { ko(r.error); };
      } catch (e) { ko(e); }
    });
  }
  function _idbGet() {
    return _idb().then(function (db) {
      return new Promise(function (ok) {
        try {
          var q = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
          q.onsuccess = function () { ok(q.result || null); };
          q.onerror = function () { ok(null); };
        } catch (e) { ok(null); }
      });
    }).catch(function () { return null; });
  }
  function _idbSet(h) {
    return _idb().then(function (db) {
      return new Promise(function (ok) {
        try {
          var q = db.transaction(STORE, 'readwrite').objectStore(STORE).put(h, KEY);
          q.onsuccess = function () { ok(true); };
          q.onerror = function () { ok(false); };
        } catch (e) { ok(false); }
      });
    }).catch(function () { return false; });
  }

  /* ---------------------------- utilidades ------------------------------ */
  function _n(v) { return (typeof num === 'function') ? num(v) : (parseFloat(v) || 0); }

  /* [20-ago-2026] DE DONDE VIENE EL PRECIO, EN CORTO.
     Mi Cartera decia «importadas de la Matriz» para CUALQUIER precio blindado, porque la
     unica condicion que miraba era `precioManual`. Y `precioManual=true` solo lo pone esta
     funcion: primero para el Excel (06-ago) y ahora tambien para Google. O sea que la
     etiqueta lleva mintiendo desde que existe el puente de Excel, y nadie lo noto porque
     un texto que suena razonable no se comprueba.
     La cura es que el dato traiga su procedencia y la banda la lea, en vez de suponerla. */
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
    try { console.log('[Precios Excel] ' + msg.replace(/<[^>]*>/g, '')); } catch (e) {}
  }

  /* ------------------- nucleo: aplicar el documento --------------------- */
  /* Separado y expuesto para poder probarlo fuera del navegador. */
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

    /* Un cierre post-subasta es DEFINITIVO: se blinda para que el pase provisional
       de Yahoo de esa misma noche no lo pise. Un intradia no: debe dejarse relevar. */
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
      /* No retroceder: si ya hay un precio de una fecha POSTERIOR (p.ej. Yahoo ya
         publico el cierre de hoy y el fichero de Excel es de ayer), no lo pisamos. */
      if ((v.precioFecha || '') > sesion) { res.ignorados++; return; }
      v.precioActual = p;
      v.precioFecha = sesion;
      v.precioManual = definitivo;     // cierre -> blindado; intradia -> Yahoo lo releva
      v.precioFuente = fuente;         // para que la banda no tenga que adivinarlo
      /* [06-ago-2026] Sello de CUANDO se capturo. Sin el, el pase intradia de Yahoo
         relevaba una captura de Excel de hace treinta segundos con una barra de hace
         siete horas: paso ese dia, con la serie del mercado espanol congelada desde las
         09:25. Con el sello, Yahoo solo puede pisarla si demuestra ser mas reciente. */
      /* [17-ago-2026] ...pero se sellaba con `new Date()`, que es CUANDO SE PULSA EL
         BOTON, no de cuando es el DATO. Una captura cuyos precios son de las 11:22,
         cargada en la app a las 16:00, se presentaba como fresca de las 16:00 y
         bloqueaba TODAS las barras del intradia hasta el dia siguiente, porque
         01-core.js solo deja pisar si `j.datoISO > v.precioISO`. Sintoma: "la cartera
         tiene cotizacion de cierre y el intradia no ha corrido hoy" CON el workflow
         publicando bien (25 precios, dato de las 17:00, "Publicado en datos").
         `selloUTC` es la hora de la ultima operacion, leida del richData del .xlsx:
         asi se compara hora-del-dato contra hora-del-dato y la proteccion del 06-ago
         sigue intacta -- una captura de hace 30 segundos le sigue ganando a una barra
         de hace siete horas. El `||` es para ficheros viejos sin sello. */
      v.precioISO = doc.selloUTC || new Date().toISOString();
      var a = ana[t]; if (a) a.cotizacion = p;
      res.ok++;
    });
    return res;
  }

  /* ============================================================
     CONCILIACION: cierre oficial de Excel  vs  cierre de Yahoo (T+1)
     ------------------------------------------------------------
     El historico (precios/*.json) recibe SIEMPRE el valor de Yahoo, nunca el de
     Excel. Si Yahoo consolida mal un cierre, la serie queda mal y no te enterarias.
     Por eso, cuando capturas un CIERRE con Excel se guarda una copia en
     DB.excelCierres[fecha] y, a la manana siguiente -cuando el pase T+1 de Yahoo
     ya ha consolidado-, se comparan y se avisa de las diferencias.

     Esto SI persiste el dato de Excel, pero en una clave aparte que no entra en
     ningun calculo: es solo un testigo para verificar. Se poda a las 10 ultimas
     sesiones y se descarta lo que pase de 15 dias.

     La ventana de comparacion existe porque _ultimos.json sigue mostrando la
     fecha del ultimo cierre hasta que llega el siguiente: el sabado y el lunes
     por la manana aun se puede contrastar el cierre del viernes.
     ============================================================ */
  var MAX_SESIONES = 10, MAX_DIAS = 15, TOLERANCIA = 0.0005;   // 0,05%

  function _guardarTestigo(doc, D) {
    if (!D || !doc || doc.tipo !== 'cierre') return;
    var s = ('' + (doc.sesion || '')).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
    D.excelCierres = D.excelCierres || {};
    /* [20-ago-2026] `precision` viaja con el testigo. Ver `comparar()`: sin ella, una
       fuente de 2 decimales marcaria diferencia todos los dias por el redondeo. */
    D.excelCierres[s] = { sesion: s, sello: doc.selloMadrid || doc.selloUTC || '',
                          precios: doc.precios || {}, revisado: false,
                          precision: (typeof doc.precisionEur === 'number') ? doc.precisionEur : 0,
                          fuente: doc.fuente || 'Excel' };
    // poda
    var hoy = _hoy();
    Object.keys(D.excelCierres).forEach(function (k) {
      var dias = Math.round((Date.parse(hoy) - Date.parse(k)) / 86400000);
      if (!(dias >= 0) || dias > MAX_DIAS) delete D.excelCierres[k];
    });
    var ks = Object.keys(D.excelCierres).sort();
    while (ks.length > MAX_SESIONES) { delete D.excelCierres[ks.shift()]; }
  }

  /* Nucleo comparable (expuesto para pruebas). Devuelve {comparados, difs:[...]}. */
  function comparar(testigo, ultimos, hoy) {
    var out = { sesion: testigo.sesion, comparados: 0, difs: [] };
    Object.keys(testigo.precios || {}).forEach(function (t) {
      var fila = ultimos[t];
      if (!fila) return;
      var fecha = fila[0], y = _n(fila[1]), e = _n(testigo.precios[t]);
      if (fecha !== testigo.sesion) return;      // Yahoo ya va por otra sesion: fuera de ventana
      if (!(y > 0) || !(e > 0)) return;
      out.comparados++;
      /* [20-ago-2026] LA TOLERANCIA TIENE QUE CONOCER LA PRECISION DE LA FUENTE.
         Excel sirve 3-4 decimales y con el 0,05% fijo bastaba. Google sirve DOS, o sea
         +-0,005 EUR: por debajo de 10 EUR ese redondeo se salta el 0,05% el solo, y el
         testigo marcaria diferencia todos los dias en los mismos valores -por una
         imprecision conocida, no por un error-. Un aviso que salta siempre se acaba
         ignorando, y entonces deja de avisar del que importa.
         Con `max(0,05%, precision/precio)` el aviso vuelve a significar algo: solo salta
         cuando Yahoo y la fuente discrepan MAS de lo que el redondeo puede explicar. */
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
      return !D.excelCierres[s].revisado && s < hoy;      // s < hoy => el pase T+1 ya ha corrido
    }).sort();
    if (!pend.length) return Promise.resolve(null);

    return fetch('precios/_ultimos.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (u) {
        if (!u) return null;
        var informes = [];
        pend.forEach(function (s) {
          var res = comparar(D.excelCierres[s], u, hoy);
          if (!res.comparados) return;                     // ventana perdida: se reintenta o se poda
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
              console.warn('[Precios Excel] Yahoo vs cierre oficial BME del ' + res.sesion +
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
     CIERRE DESDE GOOGLE — el mismo camino, pero sin tener que estar delante
     ------------------------------------------------------------
     [20-ago-2026] La hoja «Cierres KH» captura la subasta por su cuenta y un Action
     publica `cierre-google.json` en la rama `datos` a las 18:50, una hora antes del
     primer pase de Yahoo -que ademas es PROVISIONAL hasta el T+1 de las 07:40-.

     Este fichero trae la MISMA forma que `precios-excel.json`, asi que no hay modulo
     nuevo: entra por `aplicar()` y deja su testigo como el de Excel. Lo unico que cambia
     es quien lo trae: antes lo abrias tu, ahora se baja solo.

     Medido el 20-ago sobre las 102 del universo: el cierre de Google es el mismo numero
     que el de Yahoo, redondeado a 2 decimales, en 101 de 102. Lo que Google no puede dar
     -lo rancio, lo que no cubre y lo que el redondeo estropea- lo descarta el Action
     DICIENDOLO, y esas empresas esperan al T+1 de Yahoo.

     SOLO SE APLICA SI EL FICHERO ES DE HOY. Su unico trabajo es adelantar el cierre unas
     horas; cualquier otro dia Yahoo ya lo ha confirmado y manda el historico. Aplicar un
     fichero de ayer no adelanta nada y ensucia `precioManual`. */
  var URL_GOOGLE = 'https://raw.githubusercontent.com/chernanzfinanzas-gif/' +
                   'economia-domestica/datos/cierre-google.json';

  /* ============================================================
     EL REINTENTO — por que una sola pregunta no basta        [27-ago-2026]
     ------------------------------------------------------------
     `sincronizarGoogle()` se llamaba UNA vez, seis segundos despues de cargar la
     pagina, y no volvia a preguntar jamas. Con la app instalada como PWA eso no es
     «una vez al dia»: es una vez por arranque, y el ordenador de casa lleva la
     ventana abierta desde por la manana. Preguntaba a las 09:00 -cuando el fichero
     de hoy logicamente no existe-, se encontraba un 404 y ahi se quedaba.

     El 27-ago-2026 se vio en vivo: GitHub tiro los DOS pases programados, Carlos lanzo
     el workflow a mano a las 23:02, el fichero se publico perfectamente... y la app
     siguio sin el cierre hasta que recargo. El dato estaba publicado y la app no lo
     pedia. Es el mismo fallo que el intradia resolvio el 06-ago con su temporizador, y
     se copia el patron entero: cada 10 minutos, SOLO con la pestaña visible, y ademas
     al volver a la pestaña.

     Tres guardas para no pedir por pedir:
       · Solo de LUNES A VIERNES y a partir de las 18:40 locales. Antes de esa hora el
         fichero de hoy no existe todavia y preguntar es ruido garantizado. La hora sale
         de la medicion real: los pases programados a 18:50/19:50 CEST aterrizan entre
         25 y 52 minutos tarde, asi que la ventana util es de 18:40 a medianoche.
       · Se para en cuanto el cierre de hoy ESTA. El testigo `DB.excelCierres[hoy]` es
         la señal, y sirve tambien si el cierre entro por el fichero de Excel: si ya
         tienes cierre de hoy, venga de donde venga, no hay nada que ir a buscar.
       · Un minuto de guarda entre peticiones, porque `visibilitychange` se dispara cada
         vez que cambias de pestaña y sin esto alt-tabear seria un sondeo por gesto.
     Fuera de esa ventana esto no cuesta NADA: ni un fetch, porque se corta antes.
     ============================================================ */
  var _G_DESDE_MIN = 18 * 60 + 40;      /* 18:40 en hora local */
  var _G_CADA_MS   = 10 * 60 * 1000;
  var _G_GUARDA_MS = 60 * 1000;
  var _gUltima = 0;

  /* Hora LOCAL a proposito, no UTC: «son mas de las 18:40 y es dia de bolsa» es una
     afirmacion sobre el reloj de Madrid, no sobre el meridiano de Greenwich. */
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
  /* Estado legible desde la consola cuando algo no cuadre: dice si la app esta
     esperando el cierre, y por que no lo esta pidiendo si no lo pide. */
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
          /* «No ha corrido» y «no me lo he podido bajar» son cosas distintas: se guarda
             el porque, igual que hace el intradia desde el 17-ago. */
          try { window._cierreGoogleFallo = { cuando: Date.now(), motivo: r ? ('HTTP ' + r.status) : 'sin respuesta' }; } catch (e) {}
          return null;
        }
        return r.json();
      })
      .then(function (doc) {
        if (!doc || !doc.precios) return null;
        if (('' + doc.sesion).slice(0, 10) !== hoy) return null;   // no es de hoy: manda Yahoo
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

  /* --------------------------- lectura del fichero ---------------------- */
  function _procesar(texto) {
    var doc;
    try { doc = JSON.parse(texto); }
    catch (e) { _aviso('❌ El fichero no es un JSON valido.'); return; }

    if (typeof window !== 'undefined' && window._demoOn) {
      alert('Estas en MODO DEMO: sal del demo antes de tocar precios.');
      return;
    }
    var r = aplicar(doc);
    if (r.motivo) { _aviso('❌ ' + r.motivo); return; }
    if (!r.ok) { _aviso('Ningun precio aplicado (' + r.ignorados + ' ignorados).'); return; }

    _guardarTestigo(doc, (typeof DB !== 'undefined') ? DB : null);
    try { if (typeof saveNow === 'function') saveNow(); } catch (e) {}
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    try {
      if (typeof fichaTicker !== 'undefined' && fichaTicker && typeof renderFicha === 'function') renderFicha(fichaTicker);
    } catch (e) {}

    var etiqueta = r.definitivo ? 'CIERRE oficial (definitivo)'
                 : (r.tipo === 'intradia' ? 'precio intradía (lo relevará Yahoo)' : 'precios');
    var msg = '📈 ' + r.ok + ' precios actualizados · ' + etiqueta + ' del ' + r.sesion.split('-').reverse().join('/');
    if (doc.selloMadrid) msg += ' (' + doc.selloMadrid.slice(11) + 'h)';
    if (r.descartados) msg += ' · ' + r.descartados + ' descartados por rancios';
    if (r.ignorados) msg += ' · ' + r.ignorados + ' ignorados';
    _aviso(msg, 6000);

    if (r.descartados) {
      try {
        console.warn('[Precios Excel] Descartados por el filtro de frescura:');
        (doc.descartados || []).forEach(function (d) { console.warn('   ' + d.ticker + ' — ' + d.motivo); });
      } catch (e) {}
    }
  }

  /* ------------------------- eleccion del fichero ----------------------- */
  function _porInput() {   // respaldo si el navegador no admite la API de ficheros
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { _procesar('' + fr.result); };
      fr.readAsText(f, 'utf-8');
    });
    inp.click();
  }

  function _permiso(h, pedir) {
    if (!h || !h.queryPermission) return Promise.resolve('granted');
    return h.queryPermission({ mode: 'read' }).then(function (p) {
      if (p === 'granted' || !pedir || !h.requestPermission) return p;
      return h.requestPermission({ mode: 'read' });
    }).catch(function () { return 'denied'; });
  }

  function _elegir() {
    if (!window.showOpenFilePicker) { _porInput(); return; }
    window.showOpenFilePicker({
      types: [{ description: 'Precios de Excel', accept: { 'application/json': ['.json'] } }],
      multiple: false
    }).then(function (hs) {
      var h = hs && hs[0]; if (!h) return;
      _idbSet(h);
      return h.getFile().then(function (f) { return f.text(); }).then(_procesar);
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;      // el usuario cancelo
      _porInput();
    });
  }

  function abrir(forzarEleccion) {
    if (forzarEleccion) { _elegir(); return; }
    _idbGet().then(function (h) {
      if (!h) { _elegir(); return; }
      return _permiso(h, true).then(function (p) {
        if (p !== 'granted') { _elegir(); return; }
        return h.getFile().then(function (f) { return f.text(); }).then(_procesar)
          .catch(function () {
            _aviso('No pude leer el fichero recordado; elige de nuevo.');
            _elegir();
          });
      });
    }).catch(function () { _elegir(); });
  }

  /* ------------------------ inyeccion en Ajustes ------------------------ */
  function _montar() {
    var menu = document.getElementById('cogMenu');
    if (!menu || document.getElementById('btnExcelPrecios')) return;

    var sep = document.createElement('div'); sep.className = 'sep';
    var b = document.createElement('button');
    b.className = 'btn ghost sm hbtn cogitem';
    b.id = 'btnExcelPrecios';
    b.title = 'Cargar precios-excel.json (precio de trabajo; no toca el historico de cierres)';
    b.innerHTML = '📈 Precios desde Excel';
    b.addEventListener('click', function (ev) { ev.preventDefault(); abrir(false); });

    var b2 = document.createElement('button');
    b2.className = 'btn ghost sm hbtn cogitem';
    b2.id = 'btnExcelPreciosOtro';
    b2.title = 'Elegir otro fichero de precios';
    b2.style.opacity = '.75';
    b2.innerHTML = '　↳ elegir otro fichero…';
    b2.addEventListener('click', function (ev) { ev.preventDefault(); abrir(true); });

    menu.appendChild(sep); menu.appendChild(b); menu.appendChild(b2);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _montar);
    else _montar();
    /* Diferido: se deja arrancar a la app y sincronizar con Yahoo primero. Google va
       ANTES que la conciliacion para que el testigo de hoy quede guardado antes de que
       `verificar()` mire los dias anteriores. */
    setTimeout(function () {
      Promise.resolve()
        .then(function () { return sincronizarGoogle(); })
        .catch(function () { return null; })
        .then(function () { try { verificar(); } catch (e) {} });
    }, 6000);

    /* El temporizador de arriba. Mismo patron que `_intradiaTimer` de 01-core.js. */
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

  /* expuesto para pruebas y para la paleta de comandos */
  if (typeof window !== 'undefined') {
    window.abrirPreciosExcel = abrir;
    window.verificarCierresExcel = verificar;
    window._khExcelAplicar = aplicar;
    window.sincronizarCierreGoogle = sincronizarGoogle;
    window.cierreGoogleEstado = _googleEstado;
    window.cierreGoogleEnEspera = function () { return _googleEnVentana() && !_googleYaAplicado(); };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { aplicar: aplicar, comparar: comparar, sincronizarGoogle: sincronizarGoogle,
                      fuenteCorta: _fuenteCorta, googleEnVentana: _googleEnVentana,
                      googleYaAplicado: _googleYaAplicado };
  }
})();
