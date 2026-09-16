/* ===== Vídeo de introducción (una sola vez por navegador) ==========================
   [16-sep-2026] Se ve la primera vez que se abre la app en cada navegador/dispositivo.
   Deliberadamente NO depende de Google Drive ni de DB: si esperase a afterLoad() para
   decidir si ya se vio, o parpadearía el vídeo un instante antes de ocultarse, o se
   retrasaría el arranque. localStorage decide al vuelo, sin esperar a nada — por eso
   es "una vez por navegador", no "una vez para siempre en cualquier dispositivo".
   Horizontal en PC/navegador, vertical en móvil: mismo corte (max-width:820px) que
   vistaArranque() usa en 06-main.js para decidir la vista de arranque.
   Si el vídeo no existe, no carga, o el navegador bloquea el autoplay con sonido,
   NUNCA debe bloquear la app: siempre hay una salida (fin del vídeo, botón Saltar,
   error de carga, o un tope de 15s por si se queda colgado). */
function _khIntroVisto(){
  try{ return localStorage.getItem('khIntroVisto')==='1'; }catch(e){ return true; }
}
function _khIntroMarcarVisto(){
  try{ localStorage.setItem('khIntroVisto','1'); }catch(e){}
}
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
  if(_khIntroVisto()){ cont.style.display='none'; return; }
  const v=document.getElementById('khIntroVid');
  const skip=document.getElementById('khIntroSkip');
  const sonido=document.getElementById('khIntroSonido');
  if(!v||!skip){ cont.style.display='none'; return; }
  let cerrado=false;
  function cerrar(){
    if(cerrado) return; cerrado=true;
    _khIntroMarcarVisto();
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
