/* APP NUEVA · Cerrojo de la app con huella y PIN (2-nov-2026, Carlos: «que desde el móvil se abra con la huella y un pin si
   falla la huella»).
   · Se activa en cada aparato desde ⚙ → «🔐 Bloqueo con huella». Primero se elige un PIN propio de la app (4 a 8 cifras) y
     después se registra la huella (o la cara, o Windows Hello en el PC) con el sistema del propio aparato (WebAuthn).
   · Al abrir la app, y al volver a ella tras más de 5 minutos fuera, sale la pantalla de bloqueo: pide la huella sola; si
     falla o no se quiere, el PIN. Cinco PIN mal seguidos → 30 segundos de espera.
   · Es un cerrojo de la pantalla: impide que quien coja el aparato desbloqueado vea la app. Los datos siguen protegidos
     por la cuenta de Google como siempre. Nada sale del aparato: el PIN se guarda resumido (SHA-256 con sal), nunca tal cual.
   · Si se olvida el PIN y la huella no va: «No puedo entrar» explica cómo borrar los datos de la web de ese aparato
     (se vuelve a entrar con Google como el primer día; los datos están en Drive, no se pierden). */
(function(){
  var K='kh-cerrojo', MIN=5;
  function lee(){ try{ return JSON.parse(localStorage.getItem(K)||'null'); }catch(e){ return null; } }
  function esc(c){ try{ if(c) localStorage.setItem(K,JSON.stringify(c)); else localStorage.removeItem(K); }catch(e){} }
  function b64(buf){ return btoa(String.fromCharCode.apply(null,new Uint8Array(buf))); }
  function deb64(s){ return Uint8Array.from(atob(s),function(c){ return c.charCodeAt(0); }); }
  function azar(n){ var a=new Uint8Array(n); crypto.getRandomValues(a); return a; }
  async function hash(pin,sal){ var d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sal+'|'+pin)); return b64(d); }
  var hayHuella=!!(window.PublicKeyCredential&&navigator.credentials);
  async function huellaDisponible(){ try{ return hayHuella&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }catch(e){ return false; } }
  async function registrarHuella(){
    var cred=await navigator.credentials.create({publicKey:{challenge:azar(32),rp:{name:'Economía Doméstica',id:location.hostname},
      user:{id:azar(16),name:'carlos',displayName:'Carlos'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}});
    return b64(cred.rawId); }
  async function pedirHuella(c){
    await navigator.credentials.get({publicKey:{challenge:azar(32),rpId:location.hostname,allowCredentials:[{type:'public-key',id:deb64(c.cred)}],userVerification:'required',timeout:60000}});
    return true; }
  /* ---------------- pantalla de bloqueo ---------------- */
  var abierto=false, fuera=0, fallos=0, esperaHasta=0;
  function css(){ if(document.getElementById('kbCss')) return; var s=document.createElement('style'); s.id='kbCss'; s.textContent=
    '#kbLock{position:fixed;inset:0;z-index:2147483000;background:linear-gradient(160deg,#142231,#1F4A9A);display:flex;align-items:center;justify-content:center;font:15px/1.5 system-ui,sans-serif;color:#fff}'+
    '#kbLock .kb-c{width:min(340px,calc(100vw - 32px));text-align:center}#kbLock .kb-i{font-size:46px}#kbLock h2{margin:6px 0 2px;font-size:20px}#kbLock .kb-s{opacity:.8;font-size:13px;margin-bottom:18px}'+
    '#kbLock button{display:block;width:100%;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:700;cursor:pointer;margin:8px 0}#kbLock .kb-h{background:#fff;color:#1F4A9A}'+
    '#kbLock input{width:100%;box-sizing:border-box;border:0;border-radius:12px;padding:12px;font-size:22px;text-align:center;letter-spacing:8px;margin:8px 0}#kbLock .kb-p{background:rgba(255,255,255,.15);color:#fff}'+
    '#kbLock .kb-e{min-height:20px;color:#FECACA;font-size:13px}#kbLock .kb-n{background:transparent;color:#fff;opacity:.75;font-weight:500;font-size:13px}'+
    '.kb-dlg{position:fixed;inset:0;z-index:2147483001;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;font:14px/1.5 system-ui,sans-serif}.kb-dlg .kb-b{background:#fff;color:#142231;border-radius:16px;padding:18px;width:min(380px,calc(100vw - 32px))}'+
    '.kb-dlg h3{margin:0 0 8px}.kb-dlg input{width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:9px;font-size:18px;letter-spacing:6px;text-align:center;margin:4px 0 8px}.kb-dlg button{border:0;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer;margin:4px 6px 0 0}.kb-dlg .kb-ok{background:#1F4A9A;color:#fff}.kb-dlg .kb-no{background:#F1F5F9;color:#334155}.kb-dlg .kb-m{font-size:12.5px;color:#475569}.kb-dlg .kb-e{color:#B91C1C;font-size:13px;min-height:18px}';
    (document.head||document.documentElement).appendChild(s); }
  function bloquear(){ var c=lee(); if(!c||!c.activo||abierto) return; abierto=true; css();
    var L=document.createElement('div'); L.id='kbLock';
    L.innerHTML='<div class="kb-c"><div class="kb-i">🔒</div><h2>Economía Doméstica</h2><div class="kb-s">App bloqueada en este aparato</div>'+
      (c.cred?'<button class="kb-h" data-kb="huella">👆 Desbloquear con huella</button>':'')+
      '<input type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="PIN"><button class="kb-p" data-kb="pin">Entrar con PIN</button><div class="kb-e"></div>'+
      '<button class="kb-n" data-kb="olvido">No puedo entrar</button></div>';
    (document.body||document.documentElement).appendChild(L);
    var inp=L.querySelector('input'), err=L.querySelector('.kb-e');
    function dentro(){ abierto=false; fallos=0; L.remove(); document.documentElement.classList.remove('kb-pend'); }
    async function porPin(){ var now=Date.now(); if(now<esperaHasta){ err.textContent='Espera '+Math.ceil((esperaHasta-now)/1000)+' s.'; return; }
      var c2=lee(); if(c2&&await hash(inp.value,c2.sal)===c2.pin){ dentro(); return; }
      fallos++; inp.value=''; if(fallos>=5){ esperaHasta=Date.now()+30000; fallos=0; err.textContent='Cinco PIN mal: espera 30 s.'; } else err.textContent='PIN incorrecto ('+fallos+' de 5).'; }
    async function porHuella(){ err.textContent=''; try{ await pedirHuella(lee()); dentro(); }catch(e){ err.textContent='No se ha reconocido. Prueba otra vez o usa el PIN.'; } }
    L.addEventListener('click',function(e){ var b=e.target.closest('[data-kb]'); if(!b) return; var a=b.getAttribute('data-kb');
      if(a==='huella') porHuella(); else if(a==='pin') porPin();
      else if(a==='olvido') err.innerHTML='Si no recuerdas el PIN y la huella no va: borra los datos de esta web en el navegador (Ajustes del navegador → Sitios → esta web → Borrar datos). Vuelves a entrar con tu cuenta de Google como el primer día; tus datos están en Drive y no se pierden. En este aparato tendrás que volver a activar el bloqueo y a pegar la clave del chat.'; });
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter') porPin(); });
    if(c.cred) setTimeout(porHuella,350); else setTimeout(function(){ inp.focus(); },100);
  }
  /* al volver a la app tras más de 5 minutos fuera */
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') fuera=Date.now(); else if(fuera&&Date.now()-fuera>MIN*60000) bloquear(); });
  /* ---------------- activar / desactivar ---------------- */
  function dlg(html,onClick){ css(); var D=document.createElement('div'); D.className='kb-dlg'; D.innerHTML='<div class="kb-b">'+html+'</div>'; document.body.appendChild(D);
    D.addEventListener('click',function(e){ if(e.target===D){ D.remove(); return; } var b=e.target.closest('[data-kb]'); if(b) onClick(b.getAttribute('data-kb'),D); }); return D; }
  async function configurar(){
    var c=lee();
    if(c&&c.activo){
      dlg('<h3>🔐 Bloqueo con huella</h3><div class="kb-m">Activo en este aparato'+(c.cred?' con huella y PIN':' con PIN')+'. Se pide al abrir y al volver tras '+MIN+' minutos fuera.</div><div class="kb-e"></div>'+
        '<input type="password" inputmode="numeric" maxlength="8" placeholder="PIN para quitarlo"><button class="kb-no" data-kb="no">Cerrar</button><button class="kb-ok" data-kb="quitar">Quitar el bloqueo</button>',
        async function(a,D){ if(a==='no'){ D.remove(); return; } if(a==='quitar'){ var p=D.querySelector('input').value; if(await hash(p,c.sal)===c.pin){ esc(null); D.remove(); alert('Bloqueo quitado en este aparato.'); } else D.querySelector('.kb-e').textContent='PIN incorrecto.'; } });
      return; }
    var hay=await huellaDisponible();
    dlg('<h3>🔐 Bloquear la app en este aparato</h3><div class="kb-m">Elige un PIN de 4 a 8 cifras para cuando la huella falle. '+(hay?'Después el aparato te pedirá registrar la huella.':'Este aparato no ofrece huella al navegador: el bloqueo será solo con PIN.')+'</div>'+
      '<input type="password" inputmode="numeric" maxlength="8" placeholder="PIN"><input type="password" inputmode="numeric" maxlength="8" placeholder="Repite el PIN"><div class="kb-e"></div>'+
      '<button class="kb-no" data-kb="no">Cancelar</button><button class="kb-ok" data-kb="si">Activar</button>',
      async function(a,D){ if(a==='no'){ D.remove(); return; } if(a!=='si') return; var I=D.querySelectorAll('input'), e=D.querySelector('.kb-e');
        if(!/^\d{4,8}$/.test(I[0].value)){ e.textContent='El PIN debe tener de 4 a 8 cifras.'; return; } if(I[0].value!==I[1].value){ e.textContent='Los dos PIN no coinciden.'; return; }
        var sal=b64(azar(16)), n={activo:true,sal:sal,pin:await hash(I[0].value,sal),desde:new Date().toISOString()};
        if(hay){ try{ n.cred=await registrarHuella(); }catch(err){ e.textContent='No se ha podido registrar la huella ('+(err.name||err.message)+'). Queda solo con PIN; puedes reintentarlo quitando y activando el bloqueo.'; } }
        esc(n); setTimeout(function(){ D.remove(); alert('Bloqueo activado en este aparato'+(n.cred?' con huella y PIN.':' con PIN.')); }, e.textContent?2500:0); });
  }
  window.nCerrojo=configurar;
  /* botón en ⚙ (menú de ajustes), junto a «App de siempre» */
  function boton(){ if(document.getElementById('btnCerrojo')) return; var v=document.getElementById('btnVieja'); if(!v) return;
    var b=document.createElement('button'); b.id='btnCerrojo'; b.className=v.className.replace(/\s*hbtn\b/,' hbtn'); b.textContent='🔐 Bloqueo con huella'; b.type='button'; b.addEventListener('click',configurar); v.parentNode.insertBefore(b,v); }
  setInterval(boton,1500); boton();
  var c0=lee(); if(!(c0&&c0.activo)) document.documentElement.classList.remove('kb-pend');
  bloquear();
})();
