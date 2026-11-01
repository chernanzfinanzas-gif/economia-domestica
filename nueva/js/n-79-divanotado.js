/* APP NUEVA · LO ANOTADO CORRIGE LO PREVISTO (1-nov-2026, Carlos: «anotado debe corregir el previsto para evitar eso»)
   Caso: SAN anotado en el 💶 el 01/11 con pago previsto el 02/11 salía a la vez en «Cobrado» y en «Por cobrar».
   _calPendNoReg (la lista de pagos aún por cobrar, que usan Por cobrar, la previsión de caja, el Plan y el calendario
   del año) solo quitaba los pagos ya pasados. Ahora también quita un pago FUTURO cuando ya está anotado:
     · el 💶 lo registró (DB.divAnotado con su ex-div), o
     · en la ficha hay un cobro con fecha entre su ex-div y hoy (lo anotaste antes del día de pago). */
(function(){
  if(typeof _calPendNoReg!=='function') return;
  var orig=_calPendNoReg;
  _calPendNoReg=function(T,year){ var r=orig.apply(this,arguments)||[];
    try{ T=String(T||'').toUpperCase(); var hoy=(typeof _calHoy==='function')?_calHoy():new Date().toISOString().slice(0,10);
      var a=(typeof evoAnioM==='function')?evoAnioM(T,year):null, an=DB.divAnotado||{}, exDe={};
      ((a&&a.pagos)||[]).forEach(function(p){ var pg=String(p.pago||'').slice(0,10), ex=String(p.exDiv||'').slice(0,10); if(pg) exDe[pg]=ex; });
      var reg=((DB.dividendos||{})[T]||[]).map(function(d){ return String(d.fecha||'').slice(0,10); }).filter(function(f){ return f&&f<=hoy; });
      return r.filter(function(e){ if(!(e.fecha>hoy)) return true; var ex=exDe[e.fecha];
        if(ex&&an[T+'|'+ex]&&an[T+'|'+ex].tipo!=='descartado') return false;
        var desde=ex||e.fecha, d0=new Date(Date.parse(desde+'T12:00:00')-3*864e5).toISOString().slice(0,10);
        return !reg.some(function(f){ return f>=d0; }); });
    }catch(err){ return r; } };
})();

/* SEGUNDA COMPROBACIÓN CON LOS EXTRACTOS (1-nov-2026, Carlos: «se debería comprobar de algún modo para evitar que se me
   olvide meter algún dividendo»). El aviso principal ya existe y vale para todas las carteras: pasado el pago previsto en
   Evolución sin cobro en la ficha, el Kanban pide «💶 Dividendo pagado el … sin anotar». Esto añade el caso que se le
   escapa: un dividendo que HA ENTRADO en el banco/bróker (movimiento importado de categoría Dividendos, últimos 120 días)
   y que no tiene cobro en la ficha a ±30 días ni 💶 anotado. Sale con el mismo aviso y el formulario ya relleno. */
(function(){
  if(typeof _emDivPend!=='function') return;
  function U(s){ return String(s||'').toUpperCase(); }
  function norm(s){ return U(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
  var GEN={BANCO:1,GRUPO:1,COMPANIA:1,CIA:1,SOCIEDAD:1,DIVIDENDO:1,DIVIDENDOS:1,ABONO:1,EVENTO:1,POR:1,DE:1,LA:1,EL:1};
  function clave(s){ var w=norm(s).split(' ').filter(function(x){ return x.length>=3&&!GEN[x]; }); return w[0]||''; }
  var cache={k:'',v:{}};
  function delBanco(){ var M=DB.movimientos||[], k=M.length+'|'+Object.keys(DB.dividendos||{}).length+'|'+Object.keys(DB.divAnotado||{}).length; if(cache.k===k) return cache.v;
    var hoy=new Date().toISOString().slice(0,10), d120=new Date(Date.now()-120*864e5).toISOString().slice(0,10), held=(typeof _emHeldSet==='function')?_emHeldSet():new Set(), C={};
    held.forEach(function(t){ var v=(DB.valores||{})[t]||{}; var c=clave(v.nombre||''); if(c) C[c]=t; C[U(t)]=t; });
    var out={};
    M.forEach(function(m){ if(!m.bk||!m.fecha||m.fecha<d120||m.fecha>hoy) return; var cat=((DB.categorias||[]).filter(function(x){ return x.id===m.categoriaId; })[0]||{}).nombre||'';
      if(!/dividendo/i.test(cat+' '+(m.concepto||''))) return; var c=clave(m.detalle||String(m.concepto||'').replace(/^Dividendos?\s*(de\s+)?/i,'')), t=C[c]; if(!t) return;
      var ms=Date.parse(m.fecha+'T00:00:00'); if(((DB.dividendos||{})[t]||[]).some(function(d){ var x=Date.parse((d.fecha||'')+'T00:00:00'); return !isNaN(x)&&Math.abs(x-ms)/864e5<=30; })) return;
      if(!out[t]||m.fecha>out[t].fecha) out[t]={fecha:m.fecha,imp:+m.importe||0,cta:m.cta||''}; });
    cache={k:k,v:out}; return out; }
  var orig=_emDivPend;
  _emDivPend=function(t){ var r=orig.apply(this,arguments); if(r) return r;
    try{ t=U(t); var b=delBanco()[t]; if(!b) return null;
      /* pago previsto de Evolución más cercano a la fecha del abono (±30 días), para el €/acc y la ex-div */
      var y=+b.fecha.slice(0,4), best=null; [y-1,y].forEach(function(yy){ var a=(typeof evoAnioM==='function')?evoAnioM(t,yy):null; ((a&&a.pagos)||[]).forEach(function(p){
        var pg=String(p.pago||'').slice(0,10), ex=String(p.exDiv||'').slice(0,10); if(!pg) return; var d=Math.abs(Date.parse(pg)-Date.parse(b.fecha))/864e5; if(d>30) return;
        if(!best||d<best.d) best={d:d,ex:ex||pg,pago:pg,bruto:+p.bruto||0,tipo:p.tipo||''}; }); });
      var ex=best?best.ex:b.fecha, an=(DB.divAnotado||{})[t+'|'+ex]; if(an) return null;
      var acc=(typeof _emAccEn==='function')?_emAccEn(t,b.fecha):0, bA=best?best.bruto:(acc>0?Math.round(Math.abs(b.imp)/0.81/acc*10000)/10000:0);
      return {exDiv:ex,pago:b.fecha,vencido:true,brutoAcc:bA,tipo:best?best.tipo:'',key:t+'|'+ex,
        pagos:[{pago:b.fecha,bruto:bA,tipo:best?best.tipo:''}],banco:b}; }
    catch(e){ return null; } };
})();
