/* APP NUEVA · Arranque completo en segundo plano y fichero de Drive más ligero (25-nov-2026, Carlos: «el punto 2 es cierto,
   ¿se puede arreglar?», «deja de guardar en Drive los dividendos del repo», «arregla todo»).

   1) ARRANQUE. Varias pantallas (Universo, Analizadas, Ficha, Método, Tesis, Análisis, Radar, Evolución) tardaban la primera
      vez de cada sesión: al entrar se repintaba la app entera (~40 funciones), que de paso carga datos que usan otras pantallas.
      Y el Panel contaba sus avisos ANTES de que esos datos estuvieran: daba una cifra entrando directo y otra si antes habías
      pasado por Universo (medido con la demo: «38 por decidir · 53 informativos» frente a «39 · 52»; con datos reales la
      diferencia era mayor). Ahora, nada más abrir y pintar la primera pantalla, ese repintado completo se hace una vez en un
      rato muerto. Mientras tanto el Panel dice «calculando…» en lugar de una cifra que va a cambiar.
      Medido con la demo: primera entrada en esas pantallas 0,6-1,3 s → 0,002-0,06 s.

   2) DIVIDENDOS DEL REPO FUERA DE DRIVE. DB.divData guarda, por empresa y año, los dividendos copiados de dividendos.json
      (marcados origenExcel) y lo que tú has anotado o corregido (sin esa marca). Lo copiado del repo no hace falta subirlo:
      la app lo vuelve a copiar de dividendos.json al abrir (y sin cobertura, de la copia que el aparato guarda de ese fichero).
      Lo tuyo sí se sube siempre. Un año copiado del repo con una nota tuya o un total marcado como previsto también se sube.
      khDBParaDrive() prepara lo que va a Drive. La usan el guardado, la «base» de la junta en tres vías y la copia pendiente
      del aparato, para que las tres comparen lo mismo (si la base llevara los años del repo y Drive no, la junta los tomaría
      por borrados). Tras cargar o juntar, khDivRepoRestaurar() vuelve a poner los años del repo, sin marcar nada para guardar. */
(function(){
  if(window._nArranque) return; window._nArranque=true;

  /* ---------- 2) qué va a Drive ---------- */
  function anioDelRepo(a){ return a&&a.origenExcel===true&&a.notaTotal==null&&a.totalPrevisto!==true; }
  function divDataLigero(dd){
    if(!dd||typeof dd!=='object') return dd; var o={};
    Object.keys(dd).forEach(function(T){ var e=dd[T]; if(!e||typeof e!=='object'){ o[T]=e; return; }
      var c={}; Object.keys(e).forEach(function(k){ if(k!=='anios') c[k]=e[k]; });
      if(e.anios&&typeof e.anios==='object'){ var an={}, n=0;
        Object.keys(e.anios).forEach(function(y){ var a=e.anios[y]; if(anioDelRepo(a)) return; an[y]=a; n++; });
        c.anios=an; }
      o[T]=c; });
    return o; }
  window.khDBParaDrive=function(){
    if(typeof DB==='undefined'||!DB||!DB.divData) return DB;
    var o={}; Object.keys(DB).forEach(function(k){ o[k]=DB[k]; }); o.divData=divDataLigero(DB.divData); return o; };
  window.khDivDataLigero=divDataLigero;

  window.khDivRepoRestaurar=function(){
    try{ if(typeof _evoMigrar!=='function'||typeof _evoData==='undefined'||!_evoData||typeof DB==='undefined'||!DB) return false;
      var s=scheduleSave; scheduleSave=function(){};       /* lo que se repone no viaja a Drive: no hay nada que guardar */
      try{ return _evoMigrar(); } finally{ scheduleSave=s; } }catch(e){ console.warn('[arranque] dividendos del repo',e); return false; } };

  function reponerTrasCarga(){
    if(typeof _evoCargar!=='function') return;
    _evoCargar().then(function(){ if(window.khDivRepoRestaurar()){ try{ if(typeof khRepintarActiva==='function') khRepintarActiva(); }catch(e){} } }).catch(function(){});
  }

  /* ---------- 1) repintado completo una vez, en un rato muerto ---------- */
  function completo(){
    if(window._khRepintadoCompleto||window._khPrecalc) return; window._khPrecalc=true;
    var go=function(){
      try{ if(typeof DB==='undefined'||!DB){ window._khPrecalc=false; return; }
        var v=(typeof _activeViewId==='function')?_activeViewId():null;
        if(typeof renderAllFull==='function') renderAllFull();
        window._khRepintadoCompleto=true;
        if(v&&typeof renderView==='function'){ try{ renderView(v); }catch(e){} }
        /* el aviso de liberadas (n-43) se calcula aparte y tarda un poco: se espera (máximo 8 s) y entonces se da la cifra */
        var fin=function(){ if(window._nArranqueListo) return; window._nArranqueListo=true; try{ if(typeof renderPanelDash==='function') renderPanelDash(); }catch(e){} };
        Promise.race([ Promise.resolve(typeof window.nCargarLib==='function'?window.nCargarLib():null).catch(function(){}), new Promise(function(ok){ setTimeout(ok,8000); }) ]).then(fin);
      }catch(e){ console.warn('[arranque] repintado completo',e); window._khRepintadoCompleto=true; window._nArranqueListo=true; } };
    if(window.requestIdleCallback) requestIdleCallback(go,{timeout:1500}); else setTimeout(go,300);
  }

  if(typeof afterLoad==='function'){ var oA=afterLoad;
    afterLoad=function(){ var r=oA.apply(this,arguments); try{ reponerTrasCarga(); }catch(e){} try{ completo(); }catch(e){} return r; }; }
})();
