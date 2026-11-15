/* APP NUEVA · Mi cartera → Rentabilidad · ¿CUÁNTO HE GANADO DE VERDAD? (15-nov-2026, Carlos: «hablan de rentabilidad neta,
   descontar la inflación de lo que he conseguido cada año, cómo podemos darle sitio a esto en nuestra app»).
   Año a año: la rentabilidad de la cartera, la inflación de ese mismo tramo y la rentabilidad real; lo mismo para el IBEX
   con dividendos, y el acumulado («100 € se han convertido en…», en euros y en poder de compra).
   · Rentabilidad: la de la gráfica de arriba (ponderada por tiempo: valor + dividendos, quitando el dinero que entra o sale),
     encadenada entre el último día del año anterior y el último del año. No depende de cuándo metiste el dinero.
   · Inflación: IPC general del INE (ipc.json, el mismo de la ficha): índice mensual hasta el último año completo y, después,
     el índice del mismo mes del año anterior × (1 + tasa interanual). Se mide entre los mismos meses que la rentabilidad.
     Si el IPC del último mes aún no está publicado se usa el último que haya y el año se marca «provisional».
   · Real = (1 + rentabilidad) ÷ (1 + inflación) − 1. No es una resta.
   Hacia delante la inflación ya la trata Plan → Independencia («cifras de futuro en euros de hoy»); esto mira hacia atrás. */
(function(){
  if(window._nreal||typeof renderRentabEmpresas!=='function') return; window._nreal=true;
  var IPC=null, pidiendo=false;
  function N(x){ return (typeof num==='function')?num(x):(+x||0); }
  function pct(x,d){ if(x==null||!isFinite(x)) return '—'; var v=x*100; return (v>0?'+':(v<0?'−':''))+Math.abs(v).toLocaleString('es-ES',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d})+' %'; }
  function col(x){ return x==null?'#64748B':(x>=0?'#15803D':'#B91C1C'); }
  function eur(x){ return Math.round(x).toLocaleString('es-ES')+' €'; }
  /* índice del IPC de un mes (ym = 'AAAA-MM'), o null */
  function indice(ym){ if(!IPC) return null; var y=ym.slice(0,4), m=+ym.slice(5,7), M=IPC.mensual||{}, T=IPC.tasas||{};
    if(M[y]&&M[y][m-1]!=null) return +M[y][m-1];
    var t=T[ym]; if(t==null) return null; var ant=indice((+y-1)+'-'+ym.slice(5,7)); return ant==null?null:ant*(1+(+t)/100); }
  /* último mes con IPC, no posterior a ym */
  function indiceHasta(ym){ var y=+ym.slice(0,4), m=+ym.slice(5,7); for(var k=0;k<18;k++){ var s=y+'-'+(m<10?'0':'')+m, v=indice(s); if(v!=null) return {v:v,ym:s,exacto:k===0}; m--; if(m<1){ m=12; y--; } } return null; }
  function twr(d,S,i0,i1){ var r=1,ok=false; for(var m=i0+1;m<=i1;m++){ var st=N(S[m-1]), fl=N(d.aport[m])-N(d.aport[m-1]), en=N(S[m]); if(st>0.01){ r*=(en-fl)/st; ok=true; } } return ok?r-1:null; }
  function calcular(d){
    var L=d.labels||[], n=L.length; if(n<2||!IPC) return null;
    var ys=[]; L.forEach(function(l){ var y=l.slice(0,4); if(ys.indexOf(y)<0) ys.push(y); });
    var filas=[], ib=d.hayIbex&&(d.ibexVal||[]).length===n, ult=function(y){ for(var i=n-1;i>=0;i--) if(L[i].slice(0,4)===y) return i; return -1; };
    var prev=0, ac={r:1,i:1,b:1,hayB:ib}, primerInd=null, ultInd=null, prov=false;
    ys.forEach(function(y,k){ var i1=ult(y), i0=k?prev:0; prev=i1; if(i1<=i0) return;
      var r=twr(d,d.valdiv,i0,i1); if(r==null) return; var rb=ib?twr(d,d.ibexVal,i0,i1):null;
      /* inflación entre el mes de partida (diciembre anterior, o el mes de la primera compra) y el mes final */
      var a=indiceHasta(L[i0].slice(0,7)), b=indiceHasta(L[i1].slice(0,7)); var inf=(a&&b&&a.v>0)?b.v/a.v-1:null;
      var pv=!!(b&&!b.exacto)||(i1===n-1&&L[i1].slice(5,7)!=='12'); if(b&&!b.exacto) prov=true;
      if(a&&primerInd==null) primerInd=a.v; if(b) ultInd=b.v;
      filas.push({y:y,r:r,inf:inf,real:inf==null?null:(1+r)/(1+inf)-1,rb:rb,rbReal:(rb==null||inf==null)?null:(1+rb)/(1+inf)-1,parcial:(k===0&&L[0].slice(5,7)!=='01')||(i1===n-1&&L[i1].slice(5,10)<'12-20'),prov:pv,hasta:b?b.ym:''});
      ac.r*=1+r; if(inf!=null) ac.i*=1+inf; if(rb!=null) ac.b*=1+rb; else ac.hayB=false; });
    if(!filas.length) return null;
    var anios=(Date.parse(L[n-1]+'T00:00:00')-Date.parse(L[0]+'T00:00:00'))/(365.25*864e5), an=function(x){ return anios>0.2?Math.pow(x,1/anios)-1:null; };
    return {filas:filas,ac:ac,anios:anios,desde:L[0],hasta:L[n-1],prov:prov,
      anual:{r:an(ac.r),i:an(ac.i),real:an(ac.r/ac.i),b:ac.hayB?an(ac.b):null,bReal:ac.hayB?an(ac.b/ac.i):null}};
  }
  function html(R){
    var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], f=function(s){ return +s.slice(8,10)+' '+MES[+s.slice(5,7)-1]+' '+s.slice(0,4); };
    var k=function(t,v,c,s){ return '<div style="flex:1 1 150px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:10px 14px"><div style="font-size:12px;color:#64748B;font-weight:700">'+t+'</div><div style="font-size:22px;font-weight:800;color:'+c+'">'+v+'</div><div style="font-size:11.5px;color:#64748B">'+s+'</div></div>'; };
    var hayB=R.filas.some(function(x){ return x.rb!=null; });
    var td=function(v,b){ return '<td class="r" style="color:'+col(v)+(b?';font-weight:800':'')+'">'+pct(v)+'</td>'; };
    var rows=R.filas.slice().reverse().map(function(x){ return '<tr><td><b>'+x.y+'</b>'+(x.parcial||x.prov?' <span style="font-size:11px;color:#B45309">'+(x.prov?'provisional':'año incompleto')+'</span>':'')+'</td>'+td(x.r)+'<td class="r">'+pct(x.inf)+'</td>'+td(x.real,1)+(hayB?td(x.rb)+td(x.rbReal)+'<td class="r" style="color:'+col(x.rb==null?null:x.r-x.rb)+'">'+(x.rb==null?'—':pct((1+x.r)/(1+x.rb)-1))+'</td>':'')+'</tr>'; }).join('');
    var A=R.ac, c100=100*A.r, p100=100*A.r/A.i;
    var acum='<div style="font-size:13.5px;color:#334155;line-height:1.65;margin:10px 0 2px"><b>100 € que tuvieras invertidos desde el '+f(R.desde)+' son hoy '+eur(c100)+'</b>. Pero lo que costaba 100 € entonces cuesta ahora '+eur(100*A.i)+', así que en poder de compra son <b style="color:'+col(p100-100)+'">'+eur(p100)+'</b>.'+
      (A.hayB?' En el IBEX con dividendos, con el mismo dinero y las mismas fechas, serían '+eur(100*A.b)+' ('+eur(100*A.b/A.i)+' en poder de compra).':'')+'</div>';
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+
        k('Rentabilidad anual',pct(R.anual.r),col(R.anual.r),'media de '+R.anios.toLocaleString('es-ES',{maximumFractionDigits:1})+' años')+
        k('Inflación anual',pct(R.anual.i),'#334155','IPC del INE en ese tiempo')+
        k('Rentabilidad real anual',pct(R.anual.real),col(R.anual.real),'lo que crece tu poder de compra')+
        (R.anual.bReal!=null?k('IBEX con dividendos, real',pct(R.anual.bReal),col(R.anual.bReal),'mismas aportaciones'):'')+'</div>'+acum+
      '<div style="overflow-x:auto;margin-top:8px"><table class="n-tab"><thead><tr><th>Año</th><th class="r">Tu rentabilidad</th><th class="r">Inflación</th><th class="r">Rentabilidad real</th>'+(hayB?'<th class="r">IBEX con dividendos</th><th class="r">IBEX real</th><th class="r">Tú frente al IBEX</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="n-cas-n"><b>Cómo leerla.</b> «Tu rentabilidad» es la de la gráfica de arriba: valor más dividendos, sin contar como ganancia el dinero que metes. La inflación es el IPC del INE entre las mismas fechas. La rentabilidad real no es restar una de otra: con +12 % y 4,9 % de inflación queda +6,8 %. «Tú frente al IBEX» es igual antes y después de la inflación, porque los dos la sufren por igual.'+(R.prov?' El IPC del último mes aún no está publicado: el año en curso es provisional.':'')+' Para llevar el futuro a euros de hoy, Plan → Independencia.</div>';
  }
  function pintar(){
    try{ var v=document.getElementById('view-rentabilidad'); if(!v) return;
      var d=(typeof carteraEvolData==='function')?carteraEvolData(pintar):null; if(!d||!d.ok) return;
      if(!IPC){ if(!pidiendo){ pidiendo=true; fetch('ipc.json',{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ IPC=j||{}; pidiendo=false; pintar(); }).catch(function(){ pidiendo=false; }); } return; }
      var R=calcular(d); var old=document.getElementById('nRealBlk'); if(!R){ if(old) old.remove(); return; }
      window._nRentaOpen=window._nRentaOpen||{}; if(window._nRentaOpen.real===undefined) window._nRentaOpen.real=true;
      var b=old||document.createElement('div'); b.id='nRealBlk'; b.className='pos-blk'+(window._nRentaOpen.real?' open':''); b.setAttribute('data-nrblk','real');
      b.innerHTML='<div class="pos-blk-h"><span class="arw">▶</span><span class="bt">🧮 ¿Cuánto he ganado de verdad?</span><span class="bsum">tu rentabilidad de cada año, descontada la inflación · real anual '+pct(R.anual.real)+'</span></div><div class="pos-blk-b"><div class="renta-pad">'+html(R)+'</div></div>';
      if(!old){ var bl=v.querySelectorAll('.pos-blk'), ultimo=bl.length?bl[bl.length-1]:null; if(ultimo&&ultimo.parentNode) ultimo.parentNode.insertBefore(b,ultimo.nextSibling); else v.appendChild(b); }
      window._nRentaReal=R;
    }catch(e){ console.warn('[rentabilidad real]',e); } }
  var o=renderRentabEmpresas; renderRentabEmpresas=function(){ var r=o.apply(this,arguments); setTimeout(pintar,60); setTimeout(pintar,900); return r; };
  /* plegar y desplegar, si el manejador general no lo hace ya */
  document.addEventListener('click',function(e){ var h=e.target.closest&&e.target.closest('#nRealBlk > .pos-blk-h'); if(!h) return; setTimeout(function(){ var b=document.getElementById('nRealBlk'); if(!b) return; var esperado=!window._nRentaOpen.real;
      if(b.classList.contains('open')!==esperado){ b.classList.toggle('open',esperado); } window._nRentaOpen.real=b.classList.contains('open'); },0); });
})();
