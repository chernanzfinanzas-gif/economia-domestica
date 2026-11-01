/* APP NUEVA · Guardar en Drive sin pisar lo del otro aparato (1-nov-2026, Carlos: «¿cómo evitamos que pase esto otra vez?»
   — tras perderse la comida de 55,30 € apuntada en el móvil: a las 23:06 el PC guardó encima una versión que no la tenía).
   Antes: si el fichero de Drive había cambiado desde que se abrió la sesión, la app preguntaba «¿sobrescribir?» y, al
   aceptar, lo que el otro aparato había guardado se perdía.
   Ahora: si ha cambiado, la app TRAE la versión de Drive y JUNTA las dos antes de guardar:
     · listas con id (movimientos, operaciones, tareas, diario, caja, papelera…): se añade lo que solo tenga el otro aparato;
     · listas por empresa (dividendos…): igual, empresa a empresa;
     · lo que existe en los dos: manda lo de esta sesión;
     · lo que esta sesión borró (está en su papelera) no vuelve.
   Avisa en la barra de estado de cuántos registros ha recuperado del otro aparato. Ya no sale la pregunta. */
(function(){
  if(typeof driveSave!=='function'||typeof gfetch!=='function') return;
  function esLista(a){ return Array.isArray(a)&&a.length>0&&a.every(function(x){ return x&&typeof x==='object'&&!Array.isArray(x)&&x.id!=null; }); }
  function borrados(L){ var s={}; (L.papelera||[]).forEach(function(e){ var p=e&&e.payload; if(!p) return; [p.item].concat(p.items||[]).concat(p.antes||[]).forEach(function(x){ if(x&&x.id!=null) s[String(x.id)]=1; }); }); return s; }
  function unir(a,b,del,cuenta,k){ if(!Array.isArray(a)) return a; if(!(esLista(b))) return a; if(a.length&&!esLista(a)) return a;
    var ids={}; a.forEach(function(x){ ids[String(x.id)]=1; }); var n=0;
    b.forEach(function(x){ var id=String(x.id); if(!ids[id]&&!del[id]){ a.push(x); ids[id]=1; n++; } });
    if(n) cuenta[k]=(cuenta[k]||0)+n; return a; }
  function juntar(L,R){ var del=borrados(L), cuenta={};
    Object.keys(R||{}).forEach(function(k){ var a=L[k], b=R[k];
      if(a===undefined){ L[k]=b; return; }
      if(Array.isArray(a)&&Array.isArray(b)){ unir(a,b,del,cuenta,k); return; }
      if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
        Object.keys(b).forEach(function(s){ var x=a[s], y=b[s];
          if(x===undefined){ if(esLista(y)){ var f=y.filter(function(e){ return !del[String(e.id)]; }); if(f.length){ a[s]=f; cuenta[k]=(cuenta[k]||0)+f.length; } } return; }
          if(Array.isArray(x)&&Array.isArray(y)) unir(x,y,del,cuenta,k); }); } });
    return cuenta; }
  window.nJuntarDB=juntar;
  var orig=driveSave;
  driveSave=async function(force){
    if(force||window._demoOn) return orig.apply(this,arguments);
    for(var i=0;i<3;i++){
      var r=await orig.call(this,false); if(!r||!r.conflict) return r;
      /* ha cambiado en Drive: traer, juntar y volver a intentar */
      var m=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'?fields=modifiedTime'); if(!m.ok) throw new Error('Drive meta '+m.status);
      var mod=(await m.json()).modifiedTime;
      var g=await gfetch('https://www.googleapis.com/drive/v3/files/'+fileId+'?alt=media'); if(!g.ok) throw new Error('Drive read '+g.status);
      var R=await g.json(), c=juntar(DB,R), n=0; Object.keys(c).forEach(function(k){ n+=c[k]; });
      _lastMod=mod;
      window._nUltimaJunta={cuando:new Date().toISOString(),cuenta:c};
      try{ if(n&&typeof renderAll==='function') renderAll(); }catch(e){}
      try{ if(typeof setFileStatus==='function') setFileStatus('ok',n?('Juntado con el otro aparato: '+n+' registro'+(n===1?'':'s')+' recuperado'+(n===1?'':'s')+(c.movimientos?' ('+c.movimientos+' movimiento'+(c.movimientos===1?'':'s')+')':'')):'Juntado con la versión de Drive'); }catch(e){}
    }
    return {conflict:true};   /* tras tres intentos seguidos, como antes: pregunta */
  };
  if(typeof saveNow==='function'){ var oS=saveNow; saveNow=async function(){ var r=await oS.apply(this,arguments); try{ var j=window._nUltimaJunta; if(j&&Date.now()-Date.parse(j.cuando)<15000){ var n=0; Object.keys(j.cuenta).forEach(function(k){ n+=j.cuenta[k]; }); if(n&&typeof setFileStatus==='function') setFileStatus('ok','Guardado ✓ · juntado con el otro aparato: '+n+' registro'+(n===1?'':'s')+' recuperado'+(n===1?'':'s')); } }catch(e){} return r; }; }
})();
