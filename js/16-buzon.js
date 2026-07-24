/* ==========================================================================
   16-buzon.js — "Buzón del lunes"
   --------------------------------------------------------------------------
   Lee la carpeta buzon/ del repo, que rellenan tareas automáticas. Hoy hay dos:
     · Vigía (vigia.json)  → ESTIMA la fecha del próximo informe trimestral
                             (mismo motor que la vista Cobertura, sin internet).
     · Agenda (agenda.json)→ CONFIRMA con Yahoo la fecha de resultados y ex-dividend
                             (lo que el navegador no puede: llamar a internet).
   La app enseña primero lo CONFIRMADO (Agenda) y deja la ESTIMACIÓN (Vigía) como
   respaldo para lo que Yahoo aún no publica. SOLO LECTURA: la app nunca escribe.
   Para añadir una acción nueva basta con que deje su fichero en buzon/ y su entrada
   en buzon/index.json; este módulo lo listará automáticamente.
   ========================================================================== */
(function(){
  'use strict';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function dd(n){ return ('0'+n).slice(-2); }
  function fdt(iso){ try{ var d=new Date(iso); if(isNaN(d))return esc(iso||''); return dd(d.getDate())+'/'+dd(d.getMonth()+1)+'/'+d.getFullYear()+' '+dd(d.getHours())+':'+dd(d.getMinutes()); }catch(e){ return esc(iso||''); } }
  function fday(iso){ try{ var d=new Date(iso+'T00:00:00'); if(isNaN(d))return esc(iso||''); var dias=['dom','lun','mar','mié','jue','vie','sáb']; return dias[d.getDay()]+' '+dd(d.getDate())+'/'+dd(d.getMonth()+1); }catch(e){ return esc(iso||''); } }
  function eur(n){ if(n==null||n==='')return ''; try{ return (typeof fmt==='function')?fmt(n):(Number(n).toFixed(3)+' €'); }catch(e){ return esc(''+n); } }
  function jget(path){ return fetch(path,{cache:'no-store'}).then(function(r){ return r.ok? r.json() : null; }).catch(function(){ return null; }); }

  function tabla(titulo, arr, cols){
    if(!arr||!arr.length) return '';
    var body=arr.map(function(x){ return '<tr>'+cols.map(function(c){ return '<td'+(c.num?' class="num"':'')+'>'+c.f(x)+'</td>'; }).join('')+'</tr>'; }).join('');
    return '<h3 style="margin:14px 0 6px;font-size:14px">'+titulo+'</h3>'
      +'<table><thead><tr>'+cols.map(function(c){return '<th'+(c.num?' class="num"':'')+'>'+c.t+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
  }

  // ---- Agenda confirmada (Yahoo): resultados + ex-dividend --------------------
  function agendaHtml(a){
    if(!a) return '';
    var emp=function(x){ return esc(x.empresa)+' <span class="muted">('+esc(x.ticker)+')</span>'; };
    var badge=function(conf){ return conf
      ? '<span style="background:#dcfce7;color:#166534;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">confirmada</span>'
      : '<span style="background:#fef9c3;color:#854d0e;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">estimada Yahoo</span>'; };
    var h='';
    h+='<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 0 10px">'
      +'<h2 style="margin:0">📌 Agenda confirmada</h2>'
      +'<span class="muted" style="font-size:12px">Yahoo Finance · generado '+fdt(a.generadoEl)+'</span></div>';
    h+='<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:13.5px;line-height:1.5">'+esc(a.resumenTexto||'')+'</div>';
    h+=tabla('📊 Próximos resultados', a.resultados, [
      {t:'Empresa',f:emp},
      {t:'Fecha',f:function(x){return fday(x.fecha);}},
      {t:'En',num:true,f:function(x){return (x.dias<0?'hace '+(-x.dias):'en '+x.dias)+' d';}},
      {t:'',f:function(x){return badge(x.confirmada);}}
    ]);
    if(!(a.resultados&&a.resultados.length)){
      h+='<p class="muted" style="margin:10px 0">Sin fecha de resultados confirmada por Yahoo en la ventana. Rige la estimación del Vigía (más abajo).</p>';
    }
    if(a.sinConfirmar&&a.sinConfirmar.length){
      h+='<p class="muted" style="margin:8px 0;font-size:12px">Sin fecha de resultados confirmada ('+a.sinConfirmar.length+'): '
        +a.sinConfirmar.map(function(x){return esc(x.ticker);}).join(', ')+'. Para estas rige la <b>estimación del Vigía</b>.</p>';
    }
    // Ex-dividend: secundario y discreto. Lo bueno son las fechas de resultados; para
    // dividendos manda TU sección de Dividendos (Yahoo es flojo con la bolsa española).
    if(a.exDividendos&&a.exDividendos.length){
      h+='<details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:12px">💶 Ex-dividend (orientativo, '+a.exDividendos.length+') — tus fechas exactas están en Dividendos</summary>'
        +'<div style="margin-top:6px">'+tabla('', a.exDividendos, [
          {t:'Empresa',f:emp},
          {t:'Ex-date',f:function(x){return fday(x.exFecha);}},
          {t:'Pago',f:function(x){return x.pagoFecha?fday(x.pagoFecha):'—';}},
          {t:'€/acción',num:true,f:function(x){return x.importe!=null?eur(x.importe):'—';}}
        ])+'</div></details>';
    }
    return h;
  }

  function vigiaHtml(v){
    if(!v) return '';
    var emp=function(x){ return esc(x.empresa)+' <span class="muted">('+esc(x.ticker)+')</span>'; };
    var per=function(x){ return esc(x.periodoLabel||x.periodoEsperado); };
    var fst=function(x){ return fday(x.fechaEstimada); };
    var h='';
    h+='<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 0 10px">'
      +'<h2 style="margin:0">🗓️ Vigía de informes trimestrales</h2>'
      +'<span class="muted" style="font-size:12px">Estimación · generado '+fdt(v.generadoEl)+' · '+esc(v.totalEmpresas||0)+' empresas</span></div>';
    h+='<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:13.5px;line-height:1.5">'+esc(v.resumenTexto||'')+'</div>';
    h+=tabla('⚠️ Vencidos (aún sin registrar)', v.vencidos, [
      {t:'Empresa',f:emp},{t:'Periodo',f:per},{t:'Fecha est.',f:fst},{t:'Retraso',num:true,f:function(x){return '+'+x.diasVencido+' d';}}
    ]);
    h+=tabla('📅 Esta semana', v.estaSemana, [ {t:'Empresa',f:emp},{t:'Periodo',f:per},{t:'Fecha est.',f:fst} ]);
    h+=tabla('🔜 Próximos 14 días', v.proximos14d, [ {t:'Empresa',f:emp},{t:'Periodo',f:per},{t:'Fecha est.',f:fst} ]);
    var vac=!(v.vencidos&&v.vencidos.length)&&!(v.estaSemana&&v.estaSemana.length)&&!(v.proximos14d&&v.proximos14d.length);
    if(vac){
      var s=v.siguienteEvento;
      h+='<p class="muted" style="margin:10px 0">Sin resultados esperados en 14 días.'+(s?(' Siguiente: <b>'+esc(s.empresa)+'</b> ~'+fday(s.fechaEstimada)+' ('+esc(s.periodoEsperado)+').'):'')+'</p>';
    }
    if(v.sinDeterminar&&v.sinDeterminar.length){
      h+='<p class="muted" style="margin:8px 0;font-size:12px">Pte. Revisión ('+v.sinDeterminar.length+'): '+v.sinDeterminar.map(function(x){return esc(x.ticker||x.archivo);}).join(', ')+'.</p>';
    }
    h+='<p class="muted" style="font-size:12px;margin-top:10px">Para registrar un informe, dile al analista: <i>"analizar informe trimestral de [empresa]"</i>.</p>';
    return h;
  }

  // ---- Radar: histórico de meses anteriores (fundamentales-historico.json) --
  function radarHistHtml(hist){
    if(!hist||!hist.meses||!hist.meses.length) return '';
    var meses=hist.meses.slice().sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); }); // más reciente primero
    // el más reciente ya se muestra arriba en detalle; en el histórico van todos, resumidos
    var filas=meses.map(function(m){
      var t=(m.totales||{});
      var lista=(m.senaladas||[]).map(function(s){
        return '<div style="margin:2px 0 0 8px;font-size:12px"><b>'+esc(s.ticker)+'</b> <span class="muted">'+esc((s.nombre||'').slice(0,22))+'</span> — '+(s.senales||[]).map(esc).join(' · ')+'</div>';
      }).join('');
      return '<details style="border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin-bottom:6px">'
        +'<summary style="cursor:pointer;font-size:12.5px"><b>'+esc((m.fecha||'').slice(0,7))+'</b> · '+(t.conCambios||0)+' cambios · '+(t.conSenal||0)+' con señal'
        +' <span class="muted">'+esc(m.periodoTexto||'')+'</span></summary>'
        +(lista?('<div style="margin-top:4px">'+lista+'</div>'):'<div class="muted" style="font-size:12px;margin-top:4px">Sin señales accionables ese mes.</div>')
        +'</details>';
    }).join('');
    return '<div style="margin-top:14px"><h3 style="margin:0 0 6px;font-size:14px">🕘 Meses anteriores</h3>'
      +'<div class="muted" style="font-size:11px;margin-bottom:6px">Cada mes queda archivado aquí (se guardan los últimos '+meses.length+'). Despliega uno para ver sus señales.</div>'
      +filas+'</div>';
  }

  // ---- Radar: qué cambió (fundamentales, mensual) --------------------------
  function radarHtml(a, hist){
    if(!a) return (hist?radarHistHtml(hist):'');
    var chip=function(c){
      var col=c.dir==='up'?'#166534':'#b91c1c', bg=c.dir==='up'?'#dcfce7':'#fee2e2', arr=c.dir==='up'?'▲':'▼';
      var dp=(c.deltaPct!=null)?(' <span style="opacity:.8">'+(c.deltaPct>=0?'+':'')+c.deltaPct+'%</span>'):'';
      return '<span style="display:inline-block;background:'+bg+';color:'+col+';border-radius:5px;padding:1px 6px;margin:2px 4px 0 0;font-size:11px;white-space:nowrap">'
        +esc(c.label)+' '+esc(''+c.antes)+esc(c.unidad||'')+'→'+esc(''+c.ahora)+esc(c.unidad||'')+' '+arr+dp+'</span>';
    };
    var sen=function(s){ return '<span style="display:inline-block;background:#eef2ff;color:#3730a3;border-radius:5px;padding:1px 7px;margin:2px 4px 0 0;font-size:11.5px;font-weight:600">'+esc(s.txt)+'</span>'; };
    var h='';
    h+='<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 0 10px">'
      +'<h2 style="margin:0">🔎 Radar: qué cambió</h2>'
      +'<span class="muted" style="font-size:12px">Fundamentales · '+esc(a.periodoTexto||'')+' · generado '+fdt(a.generadoEl)+'</span></div>';
    h+='<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:13.5px;line-height:1.5">'+esc(a.resumenTexto||'')+'</div>';
    var cambios=(a.cambios||[]);
    if(cambios.length){
      cambios.slice(0,15).forEach(function(c){
        h+='<div style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px">'
          +'<div style="font-weight:700">'+esc(c.nombre)+' <span class="muted" style="font-weight:400;font-size:12px">('+esc(c.ticker)+')</span></div>'
          +(c.senales&&c.senales.length?('<div style="margin-top:2px">'+c.senales.map(sen).join('')+'</div>'):'')
          +(c.campos&&c.campos.length?('<div style="margin-top:3px">'+c.campos.map(chip).join('')+'</div>'):'')
          +'</div>';
      });
      if(cambios.length>15) h+='<p class="muted" style="font-size:12px">…y '+(cambios.length-15)+' más.</p>';
    } else {
      h+='<p class="muted" style="margin:10px 0">Sin cambios materiales respecto a la foto anterior.</p>';
    }
    if(a.nuevas&&a.nuevas.length) h+='<p class="muted" style="font-size:12px;margin-top:6px">🆕 Nuevas en el universo: '+a.nuevas.map(function(x){return esc(x.ticker);}).join(', ')+'.</p>';
    if(hist) h+=radarHistHtml(hist);
    return h;
  }

  // Secciones "Radar: qué cambió" + "Meses anteriores" para incrustar AL FINAL de Radar Op.
  // Reutiliza radarHtml (usa estilos inline + .muted, así que se ve bien fuera del Buzón).
  window.buzonRadarSecciones=function(hostEl){ if(!hostEl)return;
    Promise.all([jget('buzon/fundamentales-cambios.json'), jget('buzon/fundamentales-historico.json')]).then(function(r){
      var rad=r[0], hist=r[1];
      hostEl.innerHTML=(rad||hist)?radarHtml(rad,hist):'';
    }).catch(function(){ hostEl.innerHTML=''; });
  };

  // Aviso compacto en el Panel (visible a diario) con acceso rápido al buzón.
  // Los lunes se resalta como recordatorio para "volcar el buzón".
  window.renderBuzonPanel=function(){
    var host=document.getElementById('panelBuzon'); if(!host) return;
    var esLunes=(new Date().getDay()===1);
    Promise.all([jget('buzon/index.json'), jget('buzon/vigia.json'), jget('buzon/agenda.json'), jget('buzon/fundamentales-cambios.json')]).then(function(r){
      var idx=r[0], v=r[1], a=r[2], rad=r[3];
      var partes=[];
      if(a){
        var nR=(a.resultados||[]).length;
        if(nR) partes.push('📊 <b>'+nR+'</b> resultado'+(nR>1?'s':'')+' <span class="muted">confirmados</span>');
      }
      if(rad&&rad.totales){
        var nC=rad.totales.conCambios||0, nSn=rad.totales.conSenal||0;
        if(nC) partes.push('🔎 <b>'+nC+'</b> cambio'+(nC>1?'s':'')+' de radar'+(nSn?(' · <b>'+nSn+'</b> con señal'):'')+' <span class="muted">(mes)</span>');
      }
      if(v){
        var nV=(v.vencidos||[]).length, nS=(v.estaSemana||[]).length, nP=(v.proximos14d||[]).length;
        var lv='';
        if(nV) lv+='<b style="color:#b91c1c">'+nV+' vencido'+(nV>1?'s':'')+'</b> · ';
        lv+=(nS? ('<b>'+nS+'</b> esta semana') : 'nada esta semana');
        if(nP) lv+=' · '+nP+' próx. 14 días';
        partes.push('🗓️ '+lv+' <span class="muted">(est.)</span>');
      }
      var linea = partes.length ? partes.join('<br>') : 'Se actualiza solo cada lunes por la mañana.';
      var bg=esLunes?'linear-gradient(90deg,#fff7ed,#ffedd5)':'#fff';
      var borde=esLunes?'#f59e0b':'var(--line)';
      var record=esLunes?'<div style="font-weight:700;color:#9a3412;font-size:12.5px;margin-top:4px">📌 Hoy es lunes: revisa y vuelca el buzón</div>':'';
      host.innerHTML='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;'
        +'background:'+bg+';border:1px solid '+borde+';border-radius:12px;padding:12px 14px;margin:10px 0 6px">'
        +'<div style="min-width:200px;flex:1"><div style="font-weight:700;font-size:14px">📥 Buzón del lunes</div>'
        +'<div class="muted" style="font-size:13px;margin-top:2px">'+linea+'</div>'+record+'</div>'
        +'<button id="panelBuzonBtn" style="background:var(--brand);color:#fff;border:none;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer;white-space:nowrap">Abrir buzón →</button></div>';
      var b=document.getElementById('panelBuzonBtn');
      if(b) b.addEventListener('click',function(){ if(typeof activarVista==='function') activarVista('buzon'); });
    });
  };

  /* ===== Diseño v2: secciones con KPIs héroe, bloques plegables y listas/tarjetas móviles ===== */
  function _agendaInner(a){
    if(!a) return '';
    var res=a.resultados||[];
    var badge=function(c){ return c?'<span class="agb conf">confirmada</span>':'<span class="agb est">estimada Yahoo</span>'; };
    var h='<div class="ibox sky">'+esc(a.resumenTexto||'Agenda de resultados y ex-dividend (Yahoo).')+'</div>';
    if(res.length){ h+='<div class="bsec"><div class="bsec-t">📊 Próximos resultados ('+res.length+')</div>'
      +res.map(function(x){ return '<div class="brow"><div class="bl"><b class="tk">'+esc(x.ticker)+'</b> <span class="nm">'+esc(x.empresa)+'</span></div><div class="bc"><span class="bd2">'+fday(x.fecha)+'</span> <span class="muted" style="font-size:11px">'+(x.dias<0?'hace '+(-x.dias):'en '+x.dias)+' d</span></div><div class="bd">'+badge(x.confirmada)+'</div></div>'; }).join('')+'</div>'; }
    else h+='<p class="foot">Sin fecha de resultados confirmada por Yahoo en la ventana. Rige la estimación del Vigía.</p>';
    if(a.sinConfirmar&&a.sinConfirmar.length) h+='<p class="foot">Sin fecha confirmada ('+a.sinConfirmar.length+'): '+a.sinConfirmar.map(function(x){return esc(x.ticker);}).join(', ')+'. Rige la estimación del Vigía.</p>';
    if(a.exDividendos&&a.exDividendos.length){
      var ex=a.exDividendos.map(function(x){ return '<div class="brow"><div class="bl"><b class="tk">'+esc(x.ticker)+'</b> <span class="nm">'+esc(x.empresa)+'</span></div><div class="bc"><span class="muted" style="font-size:11px">ex '+fday(x.exFecha)+(x.pagoFecha?' · pago '+fday(x.pagoFecha):'')+'</span></div><div class="bd">'+(x.importe!=null?eur(x.importe):'—')+'</div></div>'; }).join('');
      h+='<details class="exdet"><summary>💶 Ex-dividend (orientativo, '+a.exDividendos.length+') — tus fechas exactas están en Dividendos</summary><div style="margin-top:8px">'+ex+'</div></details>';
    }
    return h;
  }
  function _vigiaInner(v){
    if(!v) return '';
    var row=function(x,venc){ return '<div class="brow'+(venc?' venc':'')+'"><div class="bl"><b class="tk">'+esc(x.ticker)+'</b> <span class="nm">'+esc(x.empresa)+'</span></div><div class="bc"><span class="per">'+esc(x.periodoLabel||x.periodoEsperado)+'</span></div><div class="bd'+(venc?' neg':'')+'">'+(venc?('+'+x.diasVencido+' d'):fday(x.fechaEstimada))+'</div></div>'; };
    var h='<div class="ibox amber">'+esc(v.resumenTexto||'')+'</div>';
    if(v.vencidos&&v.vencidos.length) h+='<div class="bsec"><div class="bsec-t neg">⚠️ Vencidos sin registrar ('+v.vencidos.length+')</div>'+v.vencidos.map(function(x){return row(x,true);}).join('')+'</div>';
    if(v.estaSemana&&v.estaSemana.length) h+='<div class="bsec"><div class="bsec-t">📅 Esta semana ('+v.estaSemana.length+')</div>'+v.estaSemana.map(function(x){return row(x);}).join('')+'</div>';
    if(v.proximos14d&&v.proximos14d.length) h+='<div class="bsec"><div class="bsec-t">🔜 Próximos 14 días ('+v.proximos14d.length+')</div>'+v.proximos14d.map(function(x){return row(x);}).join('')+'</div>';
    var vac=!(v.vencidos&&v.vencidos.length)&&!(v.estaSemana&&v.estaSemana.length)&&!(v.proximos14d&&v.proximos14d.length);
    if(vac){ var s=v.siguienteEvento; h+='<p class="foot">Sin resultados esperados en 14 días.'+(s?(' Siguiente: <b>'+esc(s.empresa)+'</b> ~'+fday(s.fechaEstimada)+'.'):'')+'</p>'; }
    if(v.sinDeterminar&&v.sinDeterminar.length) h+='<p class="foot">Pte. Revisión ('+v.sinDeterminar.length+'): '+v.sinDeterminar.map(function(x){return esc(x.ticker||x.archivo);}).join(', ')+'.</p>';
    h+='<p class="foot">Para registrar un informe, dile al analista: <i>"analizar informe trimestral de [empresa]"</i>.</p>';
    return h;
  }
  function _radarInner(a){
    if(!a) return '';
    var chip=function(c){ var up=c.dir==='up'; var dp=(c.deltaPct!=null)?(' '+(c.deltaPct>=0?'+':'')+c.deltaPct+'%'):''; return '<span class="cchip '+(up?'up':'down')+'">'+esc(c.label)+' '+esc(''+c.antes)+esc(c.unidad||'')+'→'+esc(''+c.ahora)+esc(c.unidad||'')+' '+(up?'▲':'▼')+dp+'</span>'; };
    var sen=function(s){ return '<span class="schip">'+esc(s.txt)+'</span>'; };
    var h='<div class="ibox blue">'+esc(a.resumenTexto||'')+'</div>';
    var cambios=a.cambios||[];
    if(cambios.length){ cambios.slice(0,20).forEach(function(c){ h+='<div class="ccard"><div class="cc-h"><b>'+esc(c.nombre)+'</b> <span class="nm">('+esc(c.ticker)+')</span></div>'+((c.senales&&c.senales.length)?('<div class="cc-sen">'+c.senales.map(sen).join('')+'</div>'):'')+((c.campos&&c.campos.length)?('<div class="cc-cam">'+c.campos.map(chip).join('')+'</div>'):'')+'</div>'; }); if(cambios.length>20)h+='<p class="foot">…y '+(cambios.length-20)+' más.</p>'; }
    else h+='<p class="foot">Sin cambios materiales respecto a la foto anterior.</p>';
    if(a.nuevas&&a.nuevas.length) h+='<p class="foot">🆕 Nuevas en el universo: '+a.nuevas.map(function(x){return esc(x.ticker);}).join(', ')+'.</p>';
    return h;
  }
  function _histInner(hist){
    if(!hist||!hist.meses||!hist.meses.length) return '';
    var meses=hist.meses.slice().sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });
    return '<div class="foot" style="margin:0 0 8px">Cada mes queda archivado aquí. Despliega uno para ver sus señales.</div>'
      +meses.map(function(m){ var t=m.totales||{}; var lista=(m.senaladas||[]).map(function(s){ return '<div style="margin:2px 0 0 8px;font-size:12px"><b>'+esc(s.ticker)+'</b> <span class="nm">'+esc((s.nombre||'').slice(0,22))+'</span> — '+(s.senales||[]).map(esc).join(' · ')+'</div>'; }).join('');
        return '<details class="hrow"><summary style="cursor:pointer;font-size:12.5px"><b>'+esc((m.fecha||'').slice(0,7))+'</b> · '+(t.conCambios||0)+' cambios · '+(t.conSenal||0)+' con señal <span class="nm">'+esc(m.periodoTexto||'')+'</span></summary>'+(lista?('<div style="margin-top:4px">'+lista+'</div>'):'<div class="foot">Sin señales accionables ese mes.</div>')+'</details>'; }).join('');
  }
  function _buzBlk(icon,title,sum,inner,open){ if(!inner) return ''; return '<div class="pos-blk'+(open?' open':'')+'"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">'+icon+' '+title+'</span><span class="bsum">'+sum+'</span></div><div class="pos-blk-b"><div class="blk-pad">'+inner+'</div></div></div>'; }

  window.renderBuzon=function(){
    var wrap=document.getElementById('buzonWrap'); if(!wrap) return;
    wrap.innerHTML='<div class="muted" style="padding:10px">Cargando buzón…</div>';
    Promise.all([jget('buzon/index.json'),jget('buzon/agenda.json'),jget('buzon/vigia.json'),jget('buzon/fundamentales-cambios.json'),jget('buzon/fundamentales-historico.json')]).then(function(r){
      var idx=r[0], ag=r[1], vg=r[2], rad=r[3], hist=r[4];
      var prox=(vg&&vg.proximos14d)||[], venc=(vg&&vg.vencidos)||[], camb=(rad&&rad.cambios)||[], totEmp=(vg&&vg.totalEmpresas)||0;
      var conSenal=(rad&&rad.totales&&rad.totales.conSenal!=null)?rad.totales.conSenal:camb.length;
      var gen=(idx&&idx.actualizado)?fdt(idx.actualizado):'';
      var top='<div class="buz-top"><div><h2 style="margin:0">📥 Buzón del lunes</h2><div class="sub" style="margin:2px 0 0">Lo rellenan las tareas automáticas del método (Agenda, Vigía, Radar). '+(gen?('Actualizado '+gen+'. '):'')+'Se actualiza cada lunes.</div></div><button id="buzonReload" class="buz-refresh">↻ Refrescar</button></div>';
      var kpis='<div class="pos-kpis">'
        +'<div class="k hero"><div class="l">Informes próximos (14 d)</div><div class="v">'+prox.length+'</div><div class="p">resultados trimestrales estimados</div></div>'
        +'<div class="k"><div class="l">Vencidos sin registrar</div><div class="v'+(venc.length?' neg':'')+'">'+venc.length+'</div><div class="p">informes ya publicados pendientes</div></div>'
        +'<div class="k"><div class="l">Cambios en el radar</div><div class="v">'+camb.length+'</div><div class="p">'+conSenal+' con señal accionable</div></div>'
        +'<div class="k"><div class="l">Empresas vigiladas</div><div class="v">'+totEmp+'</div><div class="p">seguimiento del método</div></div>'
        +'</div>';
      var body=top+kpis
        +_buzBlk('📌','Agenda confirmada', ag?(((ag.resultados||[]).length)+' resultados · '+((ag.exDividendos||[]).length)+' ex-dividend'):'', _agendaInner(ag), true)
        +_buzBlk('🗓️','Vigía de informes trimestrales', vg?('estimación · '+totEmp+' empresas'):'', _vigiaInner(vg), !ag)
        +_buzBlk('🔎','Radar: qué cambió', rad?(camb.length+' cambios'):'', _radarInner(rad), false)
        +_buzBlk('🕘','Meses anteriores (radar)', (hist&&hist.meses)?(hist.meses.length+' meses'):'', _histInner(hist), false);
      if(!_agendaInner(ag)&&!_vigiaInner(vg)&&!_radarInner(rad)&&!_histInner(hist)){
        body+='<div class="buz-empty">El buzón está vacío por ahora.<br><span style="font-size:12px">Las tareas del lunes (Agenda, Vigía, Radar) dejarán aquí las fechas de resultados, dividendos y cambios de fundamentales. Se actualiza solo cada lunes.</span></div>';
      }
      wrap.innerHTML=body;
      var rb=document.getElementById('buzonReload'); if(rb) rb.addEventListener('click',window.renderBuzon);
      if(!wrap._buzBound){ wrap._buzBound=true; wrap.addEventListener('click',function(e){ if(e.target.closest('#buzonReload,summary,a,button'))return; var h=e.target.closest('.pos-blk-h'); if(h)h.parentElement.classList.toggle('open'); }); }
    });
  };
})();
