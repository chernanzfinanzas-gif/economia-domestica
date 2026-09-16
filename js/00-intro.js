/* ===== Vídeo de introducción (se ve cada vez que se abre la app) ===================
   [16-sep-2026] Al principio se guardaba en localStorage para verse una sola vez por
   navegador; a petición de Carlos (le gusta el vídeo) se quitó esa marca: se ve
   siempre, en cada apertura. Sigue sin depender de Google Drive ni de DB, y sigue sin
   poder bloquear la app: siempre hay una salida (fin del vídeo, botón Saltar, error de
   carga, o un tope de 15s por si se queda colgado).
   Horizontal en PC/navegador, vertical en móvil: mismo corte (max-width:820px) que
   vistaArranque() usa en 06-main.js para decidir la vista de arranque. */
function _khIntroEsMovil(){
  try{ return window.matchMedia('(max-width:820px)').matches; }
  catch(e){ return (window.innerWidth||9999)<=820; }
}
function _khIntroSrc(){
  return _khIntroEsMovil() ? 'media/intro-vertical.mp4' : 'media/intro-horizontal.mp4';
}
function iniciarIntro(){
  const cont=document.getElementById('khIntro');
  if(!cont) return;
  const v=document.getElementById('khIntroVid');
  const skip=document.getElementById('khIntroSkip');
  const sonido=document.getElementById('khIntroSonido');
  if(!v||!skip){ cont.style.display='none'; return; }
  let cerrado=false;
  function cerrar(){
    if(cerrado) return; cerrado=true;
    cont.style.display='none';
    try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
  }
  skip.addEventListener('click', cerrar);
  v.addEventListener('ended', cerrar);
  v.addEventListener('error', cerrar);
  setTimeout(cerrar, 15000);
  v.src=_khIntroSrc();
  let p;
  try{ p=v.play(); }catch(e){ p=null; }
  if(p && typeof p.catch==='function'){
    p.catch(function(){
      v.muted=true;
      if(sonido){
        sonido.style.display='flex';
        sonido.addEventListener('click', function(){
          v.muted=false; sonido.style.display='none';
          try{ const p2=v.play(); if(p2&&p2.catch)p2.catch(function(){}); }catch(e){}
        });
      }
      try{ const p2=v.play(); if(p2&&p2.catch)p2.catch(function(){}); }catch(e){}
    });
  }
}
iniciarIntro();
