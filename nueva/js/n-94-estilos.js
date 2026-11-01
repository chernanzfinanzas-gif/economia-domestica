/* APP NUEVA · Últimos bloques con el aspecto antiguo, al estilo nuevo (2-nov-2026, Carlos: «ponte con los bloques con estilo
   antiguo… no hagas boceto, cambia todos y lo publicamos»). Solo aspecto: mismo contenido, mismos botones.
   · Plan › Riesgo: «Escenarios de shock» y «Riesgo estructural» (franjas con degradado) → tarjeta blanca plegable como el resto.
   · Plan › Asignación: las tres secciones (objetivos, desfase, compras del año) → tarjetas con borde y título.
   · Plan › Opciones de futuro › ¿Invertir en euros?: sin la cabecera grande repetida; datos, resultados y tablas en tarjetas.
   · Sistema › Informes › Crear un PDF: la barra de «Generar» deja de tapar la lista de informes. */
(function(){
  var css=
  /* ---- franjas plegables antiguas (plan-fold) → tarjeta plegable como pos-blk ---- */
  '#view-riesgo .plan-fold{background:#FFF;border:1px solid #E5E9EF;border-left:4px solid #2563EB;border-radius:14px;box-shadow:0 1px 3px rgba(20,34,49,.05);margin:0 0 12px;overflow:hidden}'+
  '#view-riesgo #pdEscenarios{border-left-color:#EA580C}'+
  '#view-riesgo .plan-fold>.plan-div{background:#FFF!important;border:0!important;border-radius:0!important;margin:0!important;padding:13px 16px!important;gap:10px!important}'+
  '#view-riesgo .plan-fold .pd-t{font-weight:800!important;font-size:15.5px!important;color:#142231!important}'+
  '#view-riesgo .plan-fold .pd-s{font-size:12px!important;color:#5B6B7C!important}'+
  '#view-riesgo .plan-fold .pd-ic{font-size:18px!important}#view-riesgo .plan-fold .pd-arw{color:#94A3B8}'+
  '#view-riesgo .plan-fold .pd-b{margin:0!important;border-top:1px solid #EEF1F5;padding:14px 16px}'+
  /* ---- pasos 1·2·3 ---- */
  '.np-paso{margin:18px 0 10px!important}'+
  /* ---- Asignación: tarjetas ---- */
  '#nAsig .nf-card{border:1px solid #E5E9EF;border-left:4px solid #0D9488;border-radius:14px;box-shadow:0 1px 3px rgba(20,34,49,.05);background:#FFF;padding:16px 18px;margin:0 0 14px}'+
  '#nAsig .nf-card:nth-of-type(3){border-left-color:#D97706}#nAsig .nf-card:nth-of-type(4){border-left-color:#2563EB}#nAsig .nf-card:nth-of-type(5){border-left-color:#7C3AED}'+
  '#nAsig .nf-card>h2{font-size:16px;color:#142231;font-weight:800;padding-bottom:8px;border-bottom:1px solid #EEF1F5;margin:0 0 4px}'+
  '#nAsig .nf-card>h2 .nf-sub{font-weight:500;font-size:12.5px;color:#5B6B7C}'+
  '#nAsig .nf-tw{border:1px solid #EEF1F5;border-radius:10px;overflow:auto}'+
  '#nAsig table th{background:#F8FAFC;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;color:#64748B}'+
  '#nAsig .as-q{background:#F8FAFC;border:1px solid #E5E9EF;border-radius:12px}'+
  /* ---- ¿Invertir en euros? ---- */
  '#view-opciones #view-divisa>.vhero{display:none!important}'+
  '#view-divisa .dvx-g{background:#FFF;border:1px solid #E5E9EF;border-left:4px solid #0891B2;border-radius:14px;box-shadow:0 1px 3px rgba(20,34,49,.05);padding:14px 16px;margin:0 0 12px}'+
  '#view-divisa .dvx-g label{font-size:12px;color:#475569;font-weight:600}'+
  '#view-divisa .dvx-g input:not([type=checkbox]){border:1px solid #CBD5E1;border-radius:9px;padding:7px 10px;font:inherit;font-size:13.5px;background:#FFF}'+
  '#view-divisa>.dvx-n,#view-divisa #dvRes>.dvx-n{font-size:12.5px;color:#5B6B7C;margin:6px 2px 10px}'+
  '#view-divisa .dvx-res{background:#FFF!important;border:1px solid #E5E9EF!important;border-left:4px solid #1F4A9A!important;border-radius:14px!important;box-shadow:0 1px 3px rgba(20,34,49,.05)}'+
  '#view-divisa .dvx-r>.c{border-radius:12px!important;border:1px solid #E5E9EF!important;background:#FFF!important;box-shadow:0 1px 2px rgba(20,34,49,.04)}'+
  '#view-divisa table{width:100%;background:#FFF;border:1px solid #E5E9EF;border-radius:14px;border-collapse:separate;border-spacing:0;overflow:hidden;box-shadow:0 1px 3px rgba(20,34,49,.05);margin:0 0 12px}'+
  '#view-divisa table th{background:#F8FAFC;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;color:#64748B;padding:8px 10px;border-bottom:1px solid #E5E9EF}'+
  '#view-divisa table td{padding:7px 10px;border-bottom:1px solid #F1F5F9}#view-divisa table tr:last-child td{border-bottom:0}'+
  '#view-divisa h3,#view-divisa h4,#view-divisa .dvx-h{font-size:15px;font-weight:800;color:#142231;margin:18px 0 8px}'+
  /* ---- Informes: la barra de generar no tapa nada ---- */
  '#view-informes .inf-genbar{position:static!important;margin:4px 0 14px;border:1px solid #E5E9EF;border-radius:14px;background:#FFF;box-shadow:0 1px 3px rgba(20,34,49,.05)}';
  var s=document.createElement('style'); s.id='nEstilos94'; s.textContent=css; document.head.appendChild(s);
  /* los títulos sueltos de «¿Invertir en euros?» que no son h3 (divs en negrita) pasan a título de sección */
  function titulos(){ var D=document.getElementById('view-divisa'); if(!D) return;
    [].forEach.call(D.querySelectorAll(':scope > div, #dvRes > div'),function(d){ if(d._n94||d.children.length||d.classList.contains('dvx-n')) return; var t=(d.textContent||'').trim(); if(t&&t.length<90&&getComputedStyle(d).fontWeight>=600){ d._n94=1; d.classList.add('dvx-h'); } }); }
  setInterval(function(){ try{ titulos(); }catch(e){} },2000);
})();
